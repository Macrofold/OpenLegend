use super::*;
use crate::{
    assembly::gate::{GateRead, GateWork, Side},
    construction_gather::MaterialGrantFence,
    geometry::SightRay,
    state::Entity,
    worlds::base_gate_use::copy,
};

impl CommandCursor {
    pub(super) fn prepare_gate_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::OperateGate { envelope, intent } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let Some(gate) = intent.read(core.state) else {
            self.refuse(&copy().unavailable);
            return Ok(false);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        if !core
            .state
            .installed
            .retained
            .item_handling_read
            .can_handle(&actor.spatial.body.id)
        {
            self.refuse(&copy().unavailable);
            return Ok(false);
        }
        if gate
            .edit
            .is_some_and(|edit| edit.actor_id != envelope.actor_id)
        {
            self.refuse(&copy().competing);
            return Ok(false);
        }
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            crate::reception::SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                &envelope.actor_id,
                &[&intent.assembly_id],
                self.binding,
                &self.budget,
            )
            .map_err(|problem| match problem {
                crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })?,
        );
        self.phase = Phase::GateSight;
        Ok(true)
    }

    pub(super) fn gate_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::OperateGate { envelope, intent } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        self.queries = None;
        if sight.seen(&intent.assembly_id) != Some(true) {
            self.refuse(&copy().not_visible);
            return self.drive(core, None);
        }
        let gate = intent.read(core.state).ok_or(ExecutionError::Invariant)?;
        if core
            .journal
            .material_gather
            .gate_grant(core.state, &gate, intent, None)?
            .is_none()
        {
            self.refuse(&copy().permission);
            return self.drive(core, None);
        }
        if !intent.operation.moves_leaf()
            && gate.gate.position == crate::assembly::GatePosition::Open
        {
            self.refuse(&copy().open);
            return self.drive(core, None);
        }
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let from = actor
            .supported_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let body = actor.body_profile();
        let mut storage = self.budget.reserve(
            4 * (size_of::<RouteQuery>()
                + size_of::<StandingQuery>()
                + size_of::<SightRay>()
                + from.surface_id.len()
                + gate.support.len()
                + body.id.len()),
        )?;
        let mut selected = GeometryQueries::new(self.binding);
        let reach = core.state.installed.movement.interaction_radius();
        for side in intent.sides() {
            let (target, stance) = gate.stance(side, body.radius);
            let ray = handle_ray(actor, stance.point(), target, reach);
            selected.movement_rays.push(ray.unwrap_or_else(|| SightRay {
                from: target,
                to: target,
            }));
            selected.standing.push(StandingQuery {
                point: stance.clone(),
                body: body.as_ref().clone(),
            });
            selected.routes.push(RouteQuery::Surface {
                from: from.clone(),
                to: stance,
                body: body.as_ref().clone(),
            });
        }
        storage.resize(selected.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        selected.binding.serial = core.journal.next_provider_serial()?;
        self.binding = selected.binding;
        self.queries = Some(selected);
        self.gate_storage = Some(storage);
        self.phase = Phase::GateRoute;
        Ok(Progress::Geometry)
    }

    pub(super) fn gate_route(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        self.gate_storage = None;
        let NativeCommand::OperateGate { envelope, intent } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let gate = intent.read(core.state).ok_or(ExecutionError::Invariant)?;
        let grant = core
            .journal
            .material_gather
            .gate_grant(core.state, &gate, intent, None)?
            .ok_or(ExecutionError::Invariant)?;
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let from = actor
            .supported_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let mut result = None;
        let mut pending = None;
        for ((side, route), (standing, visible)) in intent.sides().zip(answer.routes).zip(
            answer
                .standing
                .into_iter()
                .zip(answer.movement_rays.into_iter().map(|hit| hit.is_none())),
        ) {
            let (handle, stance) = gate.stance(side, actor.body_profile().radius);
            if !standing
                || !visible
                || handle_ray(
                    actor,
                    stance.point(),
                    handle,
                    core.state.installed.movement.interaction_radius(),
                )
                .is_none()
            {
                continue;
            }
            match route {
                RoutePlan::Reached { path, length, .. } => {
                    if result.as_ref().is_none_or(|(_, best, _, _)| length < *best) {
                        result = Some((side, length, stance, path));
                    }
                }
                RoutePlan::Pending { request, .. } if pending.is_none() => {
                    pending = Some((side, stance, request));
                }
                _ => {}
            }
        }
        let (side, stance, path, navigation) = match (result, pending) {
            (Some((side, _, stance, path)), _) => (side, stance, path, None),
            (None, Some((side, stance, request))) => (
                side,
                stance,
                Vec::new(),
                Some(NavigationPending {
                    request,
                    failure: None,
                }),
            ),
            _ => {
                self.refuse(&copy().access);
                return self.drive(core, None);
            }
        };
        let seconds = gate
            .family
            .seconds
            .get(intent.operation.key())
            .copied()
            .filter(|seconds| seconds.is_finite() && *seconds >= 0.0)
            .ok_or(ExecutionError::Invariant)?;
        let bytes = crate::host::retained_size::heap_sum([
            size_of::<GateWork>(),
            envelope.id.len(),
            64,
            stance.surface_id.len(),
            grant.id.len(),
            intent.heap_bytes().ok_or(ExecutionError::Capacity)?,
            path.heap_bytes().ok_or(ExecutionError::Capacity)?,
            navigation.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.action_storage = Some(self.budget.reserve(bytes)?);
        let at_handle = from.surface_id == stance.surface_id
            && crate::spatial::distance(from.point(), stance.point())
                <= core.state.installed.movement_settings.arrival_tolerance;
        let work = GateWork {
            intent: intent.clone(),
            position: gate.gate.position,
            barred: gate.gate.barred,
            side,
            grant: MaterialGrantFence {
                id: grant.id.clone(),
                revision: grant.revision,
            },
        };
        let mut action = Action::operate_gate(envelope.id.clone(), stance, work, seconds);
        if !at_handle || navigation.is_some() {
            action.stage = "approaching".into();
            action.path = path;
            action.navigation = navigation;
        }
        self.action = Some(action);
        self.phase = Phase::Prepared;
        self.drive(core, None)
    }

    pub(super) fn gate_display(&mut self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let NativeCommand::OperateGate { intent, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let gate = intent.read(core.state).ok_or(ExecutionError::Invariant)?;
        let label = gate
            .family
            .labels
            .get(intent.operation.key())
            .ok_or(ExecutionError::Invariant)?;
        let reservation = self.budget.reserve(label.len())?;
        self.view = Some(ActivityView {
            name: label.clone().into(),
            actor: None,
            tool: None,
            target: None,
            facts: Vec::new(),
            children: None,
            result: None,
        });
        self.view_reservation = Some(reservation);
        Ok(())
    }
}

/// Reach is measured at the actual interaction height, through the same solids
/// that stopped the approach. Callers must also check support and occupancy.
pub(crate) fn handle_ray(
    actor: &Entity,
    from: crate::state::Point,
    handle: crate::state::Point,
    reach: f64,
) -> Option<SightRay> {
    let grip = crate::state::Point {
        y: from.y + actor.body_profile().interaction_height,
        ..from
    };
    (crate::spatial::distance(grip, handle) <= reach).then_some(SightRay {
        from: grip,
        to: handle,
    })
}
