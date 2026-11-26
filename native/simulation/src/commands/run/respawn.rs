//! The rare Continue command tests sites at the same private candidate cut.
//! Only the selected standing point enters accepted world state.
use super::*;
use crate::body::ReincarnationPolicy;
use crate::execution::{Continuity, MovementWrite};
use crate::geometry::{StandingQuery, SupportQuery};
use crate::reception::EventScalar;
use crate::state::{Entity, Point};
use crate::status::AttributeSchema;

struct Rest {
    distance: f64,
    entity: crate::state::EntityHandle,
}

pub(super) struct Search {
    rests: Vec<Rest>,
    next_rest: usize,
    current_is_near: bool,
    exclusion: f64,
    points: Vec<SurfacePoint>,
    choices: Vec<Vec<SurfacePoint>>,
}

fn installed<'a>(core: &'a CoreMutation<'_>) -> Option<&'a ReincarnationPolicy> {
    core.state
        .installed
        .body_policy
        .as_ref()?
        .value()
        .reincarnation
        .as_ref()
}

fn clearance(other: &Entity, policy: &ReincarnationPolicy) -> f64 {
    other
        .threat
        .as_ref()
        .map_or(policy.placement.occupant_clearance, |threat| {
            threat.policy.attack_range() + policy.placement.threat_reach_margin
        })
}

impl CommandCursor {
    pub(super) fn start_respawn(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let Some(policy) = installed(core) else {
            self.refuse(
                &core
                    .state
                    .installed
                    .ordinary_actions
                    .value()
                    .unsupported_capability,
            );
            return self.drive(core, None);
        };
        let id = self.actor_id();
        let actor = core
            .state
            .physical
            .entities
            .get(id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let Some(death) = actor
            .pending_death
            .as_ref()
            .filter(|_| !actor.alive && actor.controller == policy.qualifying_controller)
        else {
            self.reserve(3 * policy.continue_unavailable_text.len())?;
            self.outcome = Some(outcome(
                false,
                "respawn-unavailable",
                &policy.continue_unavailable_text,
            ));
            self.phase = Phase::Done;
            return self.drive(core, None);
        };
        let physical = &core.state.physical;
        let mut rests = Vec::new();
        let mut exclusion = policy.placement.occupant_clearance;
        for entity in physical
            .entities
            .ordered_ids()
            .filter_map(|id| physical.entities.get(id))
        {
            if !entity.physical_root() {
                continue;
            }
            if entity.kind == policy.rest_kind
                && let Some((point, _)) = entity.world_support()
            {
                self.reserve(2 * size_of::<Rest>())?;
                rests.push(Rest {
                    distance: crate::spatial::distance(death.position, point),
                    entity: physical
                        .entities
                        .handle(&entity.id)
                        .ok_or(ExecutionError::MissingEntity)?,
                });
            }
            if entity.id != self.actor_id()
                && entity.actively_participates()
                && entity.actor.as_ref().is_some_and(|body| body.alive)
            {
                exclusion = exclusion.max(clearance(entity, policy));
            }
        }
        rests.sort_by(|a, b| {
            a.distance.total_cmp(&b.distance).then_with(|| {
                let id = |rest: &Rest| {
                    physical
                        .entities
                        .resolve(rest.entity)
                        .map(|entity| entity.id.as_str())
                };
                id(a).cmp(&id(b))
            })
        });
        self.reserve(size_of::<Search>())?;
        self.respawn = Some(Box::new(Search {
            rests,
            next_rest: 0,
            current_is_near: false,
            exclusion,
            points: Vec::new(),
            choices: Vec::new(),
        }));
        self.next_respawn_rest(core)
    }

    fn next_respawn_rest(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let policy = installed(core).ok_or(ExecutionError::Invariant)?;
        let search = self.respawn.as_mut().ok_or(ExecutionError::Invariant)?;
        let next = search.rests.get(search.next_rest);
        if next.is_none()
            || next.is_some_and(|rest| rest.distance > policy.radius) && !search.choices.is_empty()
        {
            return self.choose_respawn(core);
        }
        let rest = next.ok_or(ExecutionError::Invariant)?;
        search.next_rest += 1;
        search.current_is_near = rest.distance <= policy.radius;
        let (site, surface_id) = core
            .state
            .physical
            .entities
            .resolve(rest.entity)
            .and_then(Entity::world_support)
            .ok_or(ExecutionError::InvalidPosition)?;
        let samples =
            usize::try_from(policy.placement.samples).map_err(|_| ExecutionError::Capacity)?;
        self.reserve(
            samples
                .checked_mul(
                    size_of::<SupportQuery>() + surface_id.len() + 2 * size_of::<SurfacePoint>(),
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let offset = policy.spawn_offset;
        let mut queries = Vec::with_capacity(samples);
        for sample in 0..samples {
            let angle = (sample as f64 * std::f64::consts::TAU) / samples as f64;
            queries.push(SupportQuery {
                point: Point {
                    x: site.x + angle.cos() * offset,
                    y: site.y,
                    z: site.z + angle.sin() * offset,
                },
                surface_id: Some(surface_id.to_owned()),
                relative: None,
            });
        }
        self.question(core, Phase::RespawnSupport)?.support = queries;
        Ok(Progress::Geometry)
    }

    pub(super) fn respawn_supported(
        &mut self,
        core: &mut CoreMutation<'_>,
        support: Vec<Option<SurfacePoint>>,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let policy = installed(core).ok_or(ExecutionError::Invariant)?;
        let physical = &core.state.physical;
        let actor = physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        self.reserve(
            support
                .len()
                .checked_mul(size_of::<StandingQuery>() + 2 * size_of::<SurfacePoint>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let search = self.respawn.as_mut().ok_or(ExecutionError::Invariant)?;
        let exclusion = search.exclusion;
        // Only ask about geometry once no current living body can rule out the
        // position. Use the stored standing body, not the dead representation.
        search.points = support
            .into_iter()
            .flatten()
            .filter(|point| {
                !physical
                    .bodies
                    .any_body(point.point(), exclusion, |handle| {
                        physical.entities.resolve(handle).is_some_and(|other| {
                            other.id != actor.id
                                && other.actively_participates()
                                && other.actor.as_ref().is_some_and(|body| body.alive)
                                && other.world_position().is_some_and(|position| {
                                    crate::spatial::distance(point.point(), position)
                                        < clearance(other, policy)
                                })
                        })
                    })
            })
            .collect();
        if search.points.is_empty() {
            return self.next_respawn_rest(core);
        }
        let body = actor.spatial.body.clone();
        let count_and_strings = search
            .points
            .iter()
            .try_fold(0usize, |sum, point| {
                sum.checked_add(size_of::<StandingQuery>())?
                    .checked_add(point.surface_id.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(count_and_strings)?;
        let mut queries = GeometryQueries::new(self.binding);
        let points = &self
            .respawn
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .points;
        queries
            .standing
            .extend(points.iter().map(|point| StandingQuery {
                point: point.clone(),
                body: body.clone(),
            }));
        self.binding.serial = core.journal.next_provider_serial()?;
        queries.binding = self.binding;
        self.queries = Some(queries);
        self.phase = Phase::RespawnStanding;
        Ok(Progress::Geometry)
    }

    pub(super) fn respawn_standing(
        &mut self,
        core: &mut CoreMutation<'_>,
        standing: Vec<bool>,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let search = self.respawn.as_mut().ok_or(ExecutionError::Invariant)?;
        if search.points.len() != standing.len() {
            return Err(ExecutionError::Invariant);
        }
        let mut allowed = standing.into_iter();
        search.points.retain(|_| allowed.next() == Some(true));
        if !search.points.is_empty() {
            self.reserve(2 * size_of::<Vec<SurfacePoint>>())?;
            let search = self.respawn.as_mut().ok_or(ExecutionError::Invariant)?;
            search.choices.push(std::mem::take(&mut search.points));
            if !search.current_is_near {
                return self.choose_respawn(core);
            }
        }
        self.next_respawn_rest(core)
    }

    fn choose_respawn(&mut self, core: &mut CoreMutation<'_>) -> Result<Progress, ExecutionError> {
        let search = self.respawn.take().ok_or(ExecutionError::Invariant)?;
        let definitions = core.state.installed.clone();
        let rule = definitions
            .body_policy
            .as_ref()
            .and_then(|body| body.value().reincarnation.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        if search.choices.is_empty() {
            self.reserve(3 * rule.no_usable_rest_text.len())?;
            self.outcome = Some(outcome(
                false,
                "respawn-unavailable",
                &rule.no_usable_rest_text,
            ));
            self.phase = Phase::Done;
            return self.drive(core, None);
        }
        // Preserve the saved random draw schedule, including no draw for one site.
        let site = if search.choices.len() == 1 {
            0
        } else {
            (core.physical().draw() * search.choices.len() as f64).floor() as usize
        };
        let mut points = search
            .choices
            .into_iter()
            .nth(site)
            .ok_or(ExecutionError::Invariant)?;
        let point = (core.physical().draw() * points.len() as f64).floor() as usize;
        let point = points.swap_remove(point);
        let id = self.actor_id();
        let old_life = core
            .state
            .physical
            .entities
            .get(id)
            .and_then(Entity::physical_life)
            .ok_or(ExecutionError::MissingActor)?;
        core.physical().replace_dead_life(id)?;
        core.physical().set_position(
            id,
            point.point(),
            Some(point.surface_id),
            Some(MovementWrite {
                steps: 1,
                heading: None,
                continuity: Continuity::Relocation,
            }),
        )?;
        crate::reception::replace_current_perception_life(
            core,
            id,
            old_life,
            old_life + 1,
            &self.budget,
        )?;
        // Switch the receipt epoch before the first event in the new life.
        crate::received::ensure_temporal_actor(core, id, &self.budget)?;
        for attribute in &rule.fill_attributes {
            let definition = definitions
                .attributes
                .get(attribute)
                .ok_or(ExecutionError::Invariant)?
                .value();
            let AttributeSchema::Number { max, .. } = definition.schema else {
                return Err(ExecutionError::Invariant);
            };
            let entity = core
                .state
                .physical
                .entities
                .get(id)
                .ok_or(ExecutionError::MissingActor)?;
            let exposed = definitions
                .account_law()
                .affects_observation(entity, attribute);
            core.physical()
                .apply_ordinary_rate(id, definition, max, exposed)?;
        }
        self.conditions = Some(crate::conditions::ConditionReconcileCursor::new(
            id,
            &self.budget,
        )?);
        self.phase = Phase::RespawnConditions;
        self.drive(core, None)
    }

    pub(super) fn respawn_arrival(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let policy = installed(core).ok_or(ExecutionError::Invariant)?;
        let actor = core
            .state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let work = crate::body::narration_bound(&policy.arrival_narration, actor)
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(
            work.checked_add(3 * policy.arrival_text.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let text = crate::body::narration(&policy.arrival_narration, actor);
        self.outcome = Some(outcome(true, "respawned", &policy.arrival_text));
        let event = core.stage_event(EventEmissionIntent {
            event_type: "respawn".into(),
            text: EmissionText::Narration(text),
            audience: AudienceSelection::Physical,
            source_id: Some(actor.id.clone()),
            target_id: None,
            data: Some(IndexMap::from([(
                "significant".into(),
                EventScalar::Boolean(true),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Done;
        Ok(Progress::Occurrence(event))
    }
}
