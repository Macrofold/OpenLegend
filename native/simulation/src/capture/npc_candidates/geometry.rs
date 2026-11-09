//! Interaction reach and selected observed-position approach preparation.
use super::*;

impl NpcCandidateCursor {
    fn binding(&mut self, core: &mut CoreMutation<'_>) -> Result<GeometryBinding, ExecutionError> {
        Ok(GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        ))
    }
    pub(super) fn begin_approach(
        &mut self,
        core: &mut CoreMutation<'_>,
        target: usize,
    ) -> Result<(), ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let profile = crate::status::effective_body_profile(entity, &self.budget)?;
        let mut from = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        from.y += profile.interaction_height;
        let mut to = self.targets[target].observed;
        to.y += self.targets[target].interaction_height;
        self.waiting = Some(Waiting::Reach(target));
        if crate::spatial::distance(from, to)
            > core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .offers
                .interaction_radius
        {
            self.route(core, target)?;
            if self.queries.is_none() {
                self.waiting = None;
            }
            return Ok(());
        }
        let guard = self
            .budget
            .reserve(size_of::<GeometryQueries>() + size_of::<SightRay>())?;
        let mut query = GeometryQueries::new(self.binding(core)?);
        query.sight.push(SightRay { from, to });
        self.queries = Some(query);
        self._query_storage = Some(guard);
        self.waiting = Some(Waiting::Reach(target));
        Ok(())
    }
    fn route(&mut self, core: &mut CoreMutation<'_>, target: usize) -> Result<(), ExecutionError> {
        let entity = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(crate::state::Placement::World {
            support_surface_id: Some(surface),
            ..
        }) = &entity.placement
        else {
            return Ok(());
        };
        let profile = crate::status::effective_body_profile(entity, &self.budget)?;
        let target = &self.targets[target];
        let bytes = heap_sum([
            size_of::<GeometryQueries>() + size_of::<RouteQuery>(),
            surface.len(),
            profile.id.len(),
            target.support.as_ref().map_or(0, String::len),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let guard = self.budget.reserve(bytes)?;
        let from = entity
            .supported_position()
            .ok_or(ExecutionError::Invariant)?;
        let position = target.observed;
        let mut goal = position;
        goal.y += target.interaction_height;
        let support = target.support.as_ref().map(|id| SurfacePoint {
            x: position.x,
            y: position.y,
            z: position.z,
            surface_id: id.clone(),
        });
        let route = RouteQuery::Approach {
            from,
            body: (*profile).clone(),
            target_position: position,
            target_support: support,
            reach: core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .offers
                .interaction_radius,
            goal,
        };
        let target_index = match self.waiting {
            Some(Waiting::Reach(index)) => index,
            _ => return Err(ExecutionError::Invariant),
        };
        let mut query = GeometryQueries::new(self.binding(core)?);
        query.routes.push(route);
        self.queries = Some(query);
        self._query_storage = Some(guard);
        self.waiting = Some(Waiting::Route(target_index));
        Ok(())
    }
    fn approach_offer(
        &mut self,
        core: &mut CoreMutation<'_>,
        target: usize,
        point: &SurfacePoint,
    ) -> Result<(), ExecutionError> {
        let rules = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers;
        let mut input = CommandInput::new(
            &self.actor,
            &core
                .state
                .installed
                .actor_response_limits
                .choice_preparation_id,
            "move",
        );
        input.destination = Some(point);
        let (command, guard) = self.command(&input)?;
        let origin = core
            .state
            .physical
            .entities
            .get(&self.actor)
            .and_then(|entity| entity.world_position())
            .ok_or(ExecutionError::InvalidPosition)?;
        let body = self.targets[target].body;
        let distance = crate::spatial::distance(origin, self.targets[target].observed);
        let reach = rules.interaction_radius;
        let id = self.id(&["approach:", &self.targets[target].id])?;
        self.start(
            core,
            id,
            NpcOfferMeaning::Approach {
                body,
                distance,
                reach,
            },
            command,
            guard,
            WorkTransitionMode::Replace,
        )
    }
    pub(super) fn answer_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<(), ExecutionError> {
        let query = self
            .queries
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        query
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let waiting = self.waiting.ok_or(ExecutionError::InvalidCheckpoint)?;
        let _query_storage = self._query_storage.take();
        match waiting {
            Waiting::Reach(index) => {
                let ray = query.sight.first().ok_or(ExecutionError::Invariant)?;
                let reach = core
                    .state
                    .installed
                    .occurrence_rules
                    .value()
                    .response
                    .offers
                    .interaction_radius;
                if crate::spatial::distance(ray.from, ray.to) <= reach
                    && answer.sight.first() == Some(&true)
                {
                    self.waiting = None;
                } else {
                    self.route(core, index)?;
                    if self.queries.is_none() {
                        self.waiting = None;
                    }
                }
            }
            Waiting::Route(index) => {
                let guarded = crate::geometry::route_plan(
                    answer.routes.pop().ok_or(ExecutionError::Invariant)?,
                    &self.budget,
                )?;
                let point = match &guarded.0 {
                    RoutePlan::Reached { path, .. } => path.last(),
                    RoutePlan::Pending { request, .. } => request.destinations.first(),
                    _ => None,
                };
                if let Some(point) = point {
                    self.approach_offer(core, index, point)?;
                }
                self.waiting = None;
            }
        }
        Ok(())
    }
}
