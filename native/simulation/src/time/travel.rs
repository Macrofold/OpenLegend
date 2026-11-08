//! Reachable small senses bound the actual mover, rather than every unrelated
//! body. Only eligible small-sense observers enter this disposable foot index;
//! a dense animal cohort must not be scanned per mover to find three observers.
use super::NativeParticipants;
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{SenseDefinition, selected_senses};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::spatial::distance;
use crate::state::{Entity, EntityHandle, Point};
use indexmap::IndexMap;
use std::{collections::BTreeMap, mem::size_of};

// A query bin, not a movement/sensing law. Exact envelopes follow selection.
const CELL_SIZE: f64 = 28.0;
type Columns = BTreeMap<i64, Vec<Observer>>;
type Rows = BTreeMap<i64, Columns>;
type Cells = BTreeMap<i64, Rows>;
fn cell(value: f64) -> i64 {
    (value / CELL_SIZE).floor() as i64
}

fn reach(installed: &InstalledWorld, entity: &Entity, seconds: f64) -> Result<f64, ExecutionError> {
    if installed
        .capabilities
        .capability_blocked(Some(entity), "locomotion")?
    {
        return Ok(0.0);
    }
    if entity.spatial.fall_velocity.is_some() || entity.spatial.flight.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let Some(actor) = entity
        .actor
        .as_ref()
        .filter(|actor| actor.alive && !actor.incapacitated)
    else {
        return Ok(0.0);
    };
    let moving = match actor.action.as_ref() {
        None => false,
        Some(action) if action.kind == "move" => true,
        Some(action) if action.kind == "status-effect" => false,
        Some(_) => return Err(ExecutionError::UnsupportedFamily),
    };
    Ok(if moving {
        installed.movement_speed(entity)? * seconds
    } else {
        0.0
    })
}
struct Observer {
    position: Point,
    radius: f64,
    reach: f64,
    travel: f64,
}
pub(super) struct MotionTravelBounds {
    bounds: IndexMap<EntityHandle, f64>,
    fallback: f64,
    _reservation: ByteReservation,
}
impl MotionTravelBounds {
    pub(super) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        participants: &NativeParticipants,
        seconds: f64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let normal = installed.time_rules.perception_travel_metres();
        let mut held = budget.reserve(size_of::<Cells>())?;
        let mut observers = Cells::new();
        // Reserve only when a small eligible channel actually exists. The
        // ordinary vision-only opening needs no per-mover lookup allocation.
        let mut maximum: f64 = 0.0;
        let mut fallback = normal;
        for handle in participants.actors() {
            let entity = physical
                .entities
                .resolve(*handle)
                .ok_or(ExecutionError::Invariant)?;
            if !entity
                .actor
                .as_ref()
                .is_some_and(|actor| actor.alive && !actor.incapacitated)
                || !entity.has_memory()
            {
                continue;
            }
            let mut radius: f64 = 0.0;
            let mut travel = normal;
            for sense in selected_senses(installed, entity) {
                let selected = match sense {
                    SenseDefinition::VisionGeometry { radius, .. }
                    | SenseDefinition::BodyContact { radius, .. } => *radius,
                    _ => continue,
                };
                if selected > 0.0 && selected / 4.0 < normal {
                    radius = radius.max(selected);
                    travel = travel.min(selected / 4.0);
                }
            }
            if radius == 0.0 {
                continue;
            }
            let reach = reach(installed, entity, seconds)? + entity.body_profile().height;
            maximum = maximum.max(radius + reach);
            fallback = fallback.min(travel);
            let position = entity
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            let (x, y, z) = (cell(position.x), cell(position.y), cell(position.z));
            let rows = observers.get(&x);
            let columns = rows.and_then(|rows| rows.get(&y));
            let bucket = columns.and_then(|columns| columns.get(&z));
            let (len, capacity) = bucket.map_or((0, 0), |bucket| (bucket.len(), bucket.capacity()));
            let target = if len == capacity {
                capacity
                    .checked_mul(2)
                    .map(|n| n.max(4))
                    .ok_or(ExecutionError::Capacity)?
            } else {
                capacity
            };
            let bytes = heap_sum([
                if rows.is_none() {
                    crate::host::retained_size::tree_node_bound::<i64, Rows>()
                        .ok_or(ExecutionError::Capacity)?
                } else {
                    0
                },
                if columns.is_none() {
                    crate::host::retained_size::tree_node_bound::<i64, Columns>()
                        .ok_or(ExecutionError::Capacity)?
                } else {
                    0
                },
                if bucket.is_none() {
                    crate::host::retained_size::tree_node_bound::<i64, Vec<Observer>>()
                        .ok_or(ExecutionError::Capacity)?
                } else {
                    0
                },
                (target - capacity)
                    .checked_mul(size_of::<Observer>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?;
            held.resize(
                held.bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let bucket = observers
                .entry(x)
                .or_default()
                .entry(y)
                .or_default()
                .entry(z)
                .or_default();
            if target > capacity {
                bucket
                    .try_reserve_exact(target - len)
                    .map_err(|_| ExecutionError::Capacity)?;
            }
            bucket.push(Observer {
                position,
                radius,
                reach,
                travel,
            });
        }
        let capacity = if observers.is_empty() {
            0
        } else {
            participants.ambient().len()
        };
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                map_storage::<EntityHandle, f64>(capacity).ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut bounds = IndexMap::with_capacity(capacity);
        if !observers.is_empty() {
            for handle in participants.ambient() {
                let entity = physical
                    .entities
                    .resolve(*handle)
                    .ok_or(ExecutionError::Invariant)?;
                let position = entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                let reach = reach(installed, entity, seconds)? + entity.body_profile().height;
                let mut travel = normal;
                let radius = reach + maximum;
                for (_, rows) in
                    observers.range(cell(position.x - radius)..=cell(position.x + radius))
                {
                    for (_, columns) in
                        rows.range(cell(position.y - radius)..=cell(position.y + radius))
                    {
                        for (_, bucket) in
                            columns.range(cell(position.z - radius)..=cell(position.z + radius))
                        {
                            for observer in bucket {
                                if distance(position, observer.position)
                                    <= reach + observer.reach + observer.radius
                                {
                                    travel = travel.min(observer.travel);
                                }
                            }
                        }
                    }
                }
                bounds.insert(*handle, travel);
            }
        }
        Ok(Self {
            bounds,
            fallback,
            _reservation: reservation,
        })
    }
    pub(super) fn get(&self, handle: EntityHandle) -> f64 {
        self.bounds.get(&handle).copied().unwrap_or(self.fallback)
    }
}
