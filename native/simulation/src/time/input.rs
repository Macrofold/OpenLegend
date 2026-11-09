//! Unsaved simulation-time permissions, already admitted by the host. Real-time
//! expiry, account/control ownership and accept-time revocation remain host work.
use super::MechanicalForecast;
use crate::execution::{CoreMutation, ExecutionError, PhysicalChangeCursor};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SurfaceLineQuery};
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::state::{Entity, EntityHandle, Placement, SurfacePoint};
use indexmap::IndexMap;
use serde::Deserialize;
use std::mem::size_of;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AdmittedWorldInput {
    pub actor_id: String,
    pub steering: Option<SteeringInput>,
    pub release: Option<ReleaseInput>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SteeringInput {
    pub direction: Direction,
    pub starts_at: f64,
    pub ends_at: f64,
}
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Direction {
    pub x: f64,
    pub z: f64,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReleaseInput {
    pub action_id: String,
    pub starts_at: f64,
    pub ends_at: f64,
}
heap_record!(AdmittedWorldInput { actor_id, release });
heap_record!(ReleaseInput { action_id });
impl AdmittedWorldInput {
    pub(super) fn valid(&self) -> bool {
        let window = |start: f64, end: f64| start.is_finite() && end.is_finite() && end >= start;
        !self.actor_id.is_empty()
            && self.steering.as_ref().is_none_or(|steering| {
                steering.direction.x.is_finite()
                    && steering.direction.z.is_finite()
                    && window(steering.starts_at, steering.ends_at)
            })
            && self.release.as_ref().is_none_or(|release| {
                !release.action_id.is_empty() && window(release.starts_at, release.ends_at)
            })
    }
}
pub(super) fn can_steer(core: &CoreMutation<'_>, entity: &Entity) -> Result<bool, ExecutionError> {
    let installed = &core.state.installed;
    Ok(entity
        .actor
        .as_ref()
        .is_some_and(|actor| actor.alive && !actor.incapacitated)
        && entity.actively_participates()
        && !installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
        && entity.spatial.flight.is_none()
        && entity.spatial.fall_velocity.is_none()
        && installed.movement.steering_action_allowed(entity)?)
}
pub(super) fn input_boundary(
    core: &CoreMutation<'_>,
    inputs: &[AdmittedWorldInput],
    mechanics: &MechanicalForecast,
    seconds: f64,
) -> Result<f64, ExecutionError> {
    let now = core.state.physical.header.sim_time;
    let mut bound = seconds;
    for input in inputs {
        for (start, end) in input
            .steering
            .iter()
            .map(|s| (s.starts_at, s.ends_at))
            .chain(input.release.iter().map(|r| (r.starts_at, r.ends_at)))
        {
            if start > now {
                bound = bound.min(start - now);
            } else if end > now {
                bound = bound.min(end - now);
            }
        }
        if input
            .steering
            .as_ref()
            .is_some_and(|s| s.starts_at <= now && s.ends_at > now)
        {
            if let Some(entity) = core.state.physical.entities.get(&input.actor_id) {
                if can_steer(core, entity)? {
                    let handle = core
                        .state
                        .physical
                        .entities
                        .handle(&input.actor_id)
                        .ok_or(ExecutionError::Invariant)?;
                    bound = bound.min(
                        mechanics.travel_for(handle)
                            / core.state.installed.movement_speed(entity)?,
                    );
                }
            }
        }
    }
    Ok(bound)
}

pub(super) struct SteeringRoute {
    pub path: Vec<SurfacePoint>,
    pub distance: f64,
}
pub(super) struct PreparedSteering {
    pub routes: IndexMap<EntityHandle, SteeringRoute>,
    _reservation: ByteReservation,
}
struct Target {
    actor: EntityHandle,
    distance: f64,
}
pub(super) struct SteeringPreparation {
    at: f64,
    physical: PhysicalChangeCursor,
    targets: Vec<Target>,
    question: GeometryQueries,
    _reservation: ByteReservation,
}
impl SteeringPreparation {
    pub(super) fn prepare(
        core: &CoreMutation<'_>,
        inputs: &[AdmittedWorldInput],
        seconds: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        // Fund the finite host input envelope before copying support references.
        let mut reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                inputs
                    .len()
                    .checked_mul(size_of::<Target>() + size_of::<SurfaceLineQuery>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut result = Self {
            at: core.state.physical.header.sim_time,
            physical: core.journal.physical.change_cursor(),
            targets: Vec::with_capacity(inputs.len()),
            question: GeometryQueries::new(binding),
            _reservation: budget.reserve(0)?,
        };
        result.question.surface_lines.reserve_exact(inputs.len());
        for input in inputs {
            let Some(steering) = input
                .steering
                .as_ref()
                .filter(|s| s.starts_at <= result.at && s.ends_at > result.at)
            else {
                continue;
            };
            let Some(entity) = core.state.physical.entities.get(&input.actor_id) else {
                continue;
            };
            if !can_steer(core, entity)? {
                continue;
            }
            let Some(Placement::World {
                support_surface_id: Some(support),
                ..
            }) = &entity.placement
            else {
                continue;
            };
            reservation.resize(
                reservation
                    .bytes()
                    .checked_add(support.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let from = entity
                .supported_position()
                .ok_or(ExecutionError::Invariant)?;
            let distance = core.state.installed.movement_speed(entity)?
                * seconds.min(steering.ends_at - result.at);
            result.targets.push(Target {
                actor: core
                    .state
                    .physical
                    .entities
                    .handle(&input.actor_id)
                    .ok_or(ExecutionError::Invariant)?,
                distance,
            });
            result.question.surface_lines.push(SurfaceLineQuery {
                x: from.x + steering.direction.x * distance,
                z: from.z + steering.direction.z * distance,
                from,
                body: None,
            });
        }
        result._reservation = reservation;
        Ok(result)
    }
    pub(super) fn question(&self) -> Option<&GeometryQueries> {
        (!self.targets.is_empty()).then_some(&self.question)
    }
    pub(super) fn finish(
        self,
        core: &CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<PreparedSteering, ExecutionError> {
        if core.state.physical.header.sim_time != self.at
            || !core
                .journal
                .physical
                .changes_since(self.physical)?
                .is_empty()
        {
            return Err(ExecutionError::Invariant);
        }
        let answers = match answer {
            Some(answer) => {
                self.question
                    .validate_answers(&answer)
                    .map_err(|_| ExecutionError::Invariant)?;
                answer.surface_lines
            }
            None if self.targets.is_empty() => Vec::new(),
            None => return Err(ExecutionError::UnfinishedOccurrence),
        };
        let storage = size_of::<PreparedSteering>()
            .checked_add(
                map_storage::<EntityHandle, SteeringRoute>(self.targets.len())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        let bytes = answers
            .iter()
            .flatten()
            .try_fold(storage, |bytes, line| {
                bytes.checked_add(line.path.heap_bytes()?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let mut routes = IndexMap::with_capacity(self.targets.len());
        for (target, line) in self.targets.into_iter().zip(answers) {
            if let Some(line) = line.filter(|line| !line.path.is_empty()) {
                // Like the source Map, a repeated actor replaces its route while
                // retaining its first successful insertion's movement order.
                routes.insert(
                    target.actor,
                    SteeringRoute {
                        path: line.path,
                        distance: target.distance,
                    },
                );
            }
        }
        Ok(PreparedSteering {
            routes,
            _reservation: reservation,
        })
    }
}
