//! Physical detector preparation for one unchanged native phase. Geometry is
//! requested once as finite data; answers never grant identity or private facts.

use super::{AcousticDirection, Elevation, ObserverLife, SenseDefinition};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Entity, Point};
use std::mem::size_of;

#[derive(Debug)]
pub(crate) enum SensorError {
    Capacity,
    MissingObserver,
    PhysicalPosition,
    UnsupportedFamily,
    Capability,
    Geometry,
}

#[derive(Clone, Copy)]
pub(crate) struct VisionParameters {
    pub radius: f64,
    pub field_of_view: f64,
}

/// Manifest order decides the first detector of each family. Actor bindings
/// filter that order; the order of IDs in an actor's list is not a priority.
pub(crate) fn selected_senses<'a>(
    installed: &'a InstalledWorld,
    observer: &'a Entity,
) -> impl Iterator<Item = &'a SenseDefinition> + 'a {
    let bindings = observer
        .actor
        .as_ref()
        .and_then(|actor| actor.senses.as_deref())
        .unwrap_or(&installed.default_senses);
    installed
        .senses
        .values()
        .filter(move |definition| bindings.iter().any(|id| id == definition.value().id()))
        .map(|definition| definition.value())
}

pub(crate) fn vision_parameters(installed: &InstalledWorld, observer: &Entity) -> VisionParameters {
    selected_senses(installed, observer)
        .find_map(|sense| match sense {
            SenseDefinition::VisionGeometry {
                radius,
                field_of_view_radians,
                ..
            } => Some(VisionParameters {
                radius: *radius,
                field_of_view: field_of_view_radians.unwrap_or(2.0 * std::f64::consts::PI),
            }),
            _ => None,
        })
        .unwrap_or(VisionParameters {
            radius: 0.0,
            field_of_view: 2.0 * std::f64::consts::PI,
        })
}

pub(crate) fn hearing_floor(installed: &InstalledWorld, observer: &Entity) -> Option<f64> {
    selected_senses(installed, observer).find_map(|sense| match sense {
        SenseDefinition::HearingDb {
            hearing_floor_db_spl,
            ..
        } => Some(*hearing_floor_db_spl),
        _ => None,
    })
}

#[derive(Debug)]
pub(crate) struct RoutineSightPolicy {
    pub key: String,
    pub mode: super::SightTiming,
    pub seconds: Option<f64>,
    pub detail_seconds: Option<f64>,
}

pub(crate) fn routine_sight_policy(
    installed: &InstalledWorld,
    observer: &Entity,
) -> Option<RoutineSightPolicy> {
    let bindings = observer
        .actor
        .as_ref()
        .and_then(|actor| actor.senses.as_deref())
        .unwrap_or(&installed.default_senses);
    let mut selected = installed
        .senses
        .values()
        .filter(|definition| bindings.iter().any(|id| id == definition.value().id()))
        .filter(|definition| matches!(definition.value(), SenseDefinition::VisionGeometry { .. }));
    let first = selected.next()?;
    let SenseDefinition::VisionGeometry {
        routine_timing,
        sample_seconds,
        detail_sample_seconds,
        ..
    } = first.value()
    else {
        unreachable!("Selected vision family")
    };
    // Each immutable definition already retains its exact source canonicalJson
    // body. Array composition preserves manifest order without another object
    // collation implementation or a body/signature approximation.
    let canonical = format!(
        "[{}]",
        std::iter::once(first.canonical())
            .chain(selected.map(|definition| definition.canonical()))
            .collect::<Vec<_>>()
            .join(",")
    );
    Some(RoutineSightPolicy {
        key: crate::encoding::content_label(&canonical),
        mode: *routine_timing,
        seconds: *sample_seconds,
        detail_seconds: *detail_sample_seconds,
    })
}

pub fn horizontal_cone(origin: Point, heading: f64, radians: f64, point: Point) -> bool {
    if radians >= 2.0 * std::f64::consts::PI {
        return true;
    }
    let x = heading.sin();
    let z = heading.cos();
    let edge = (radians / 2.0).cos();
    let dx = point.x - origin.x;
    let dz = point.z - origin.z;
    let length = dx.hypot(dz);
    let rounding = 8.0 * f64::EPSILON * (dx.abs() + dz.abs() + length);
    dx * x + dz * z + rounding >= edge * length
}

#[derive(Debug)]
enum SightDecision {
    Known(bool),
    Rays { first: usize, count: usize },
}

#[derive(Debug)]
struct SightCheck {
    target_id: String,
    decision: SightDecision,
}

/// The reservation follows the physical request and its selected ID results.
/// It is not released while a returned product still owns the Vec allocation.
pub(crate) struct SightBatch {
    observer: ObserverLife,
    queries: GeometryQueries,
    checks: Vec<SightCheck>,
    reservation: ByteReservation,
}

pub(crate) struct SightResults {
    observer: ObserverLife,
    binding: GeometryBinding,
    checks: Vec<SightCheck>,
    _reservation: ByteReservation,
}

impl SightBatch {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        observer_id: &str,
        targets: &[&str],
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, SensorError> {
        let observer = physical
            .entities
            .get(observer_id)
            .ok_or(SensorError::MissingObserver)?;
        let enabled = observer.actively_participates()
            && !installed
                .capabilities
                .capability_blocked(Some(observer), "perception")
                .map_err(|_| SensorError::Capability)?;
        let vision = vision_parameters(installed, observer);
        let from = observer.world_position();
        // Three exact body-height tests are the current vision-geometry-v1
        // detector. Batching all possible rays adds no exposure; complete native
        // CPU/provider costs include even rays an earlier clear ray could skip.
        let ray_capacity = targets.len().checked_mul(3).ok_or(SensorError::Capacity)?;
        let id_bytes = targets
            .iter()
            .try_fold(0_usize, |total, id| total.checked_add(id.len()))
            .ok_or(SensorError::Capacity)?;
        let bytes = size_of::<SightBatch>()
            .checked_add(observer_id.len())
            .ok_or(SensorError::Capacity)?
            .checked_add(
                targets
                    .len()
                    .checked_mul(size_of::<SightCheck>())
                    .ok_or(SensorError::Capacity)?,
            )
            .and_then(|bytes| bytes.checked_add(ray_capacity.checked_mul(size_of::<SightRay>())?))
            .and_then(|bytes| bytes.checked_add(id_bytes))
            .ok_or(SensorError::Capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| SensorError::Capacity)?;
        let mut queries = GeometryQueries::new(binding);
        queries
            .sight
            .try_reserve_exact(ray_capacity)
            .map_err(|_| SensorError::Capacity)?;
        let mut checks = Vec::new();
        checks
            .try_reserve_exact(targets.len())
            .map_err(|_| SensorError::Capacity)?;
        for target_id in targets {
            let decision = match physical.entities.get(target_id) {
                None => SightDecision::Known(false),
                Some(target)
                    if !enabled || !target.actively_participates() || vision.radius <= 0.0 =>
                {
                    SightDecision::Known(false)
                }
                Some(target) => {
                    let from = from.ok_or(SensorError::PhysicalPosition)?;
                    let eye = Point {
                        y: from.y + observer.body_profile().eye_height,
                        ..from
                    };
                    if target.assembly.is_some() {
                        return Err(SensorError::UnsupportedFamily);
                    }
                    let position = target
                        .world_position()
                        .ok_or(SensorError::PhysicalPosition)?;
                    let squared = (from.x - position.x).powi(2)
                        + (from.y - position.y).powi(2)
                        + (from.z - position.z).powi(2);
                    if squared > vision.radius.powi(2) {
                        SightDecision::Known(false)
                    } else if target.id == observer.id {
                        SightDecision::Known(true)
                    } else if !horizontal_cone(
                        from,
                        observer.spatial.heading,
                        vision.field_of_view,
                        position,
                    ) {
                        SightDecision::Known(false)
                    } else {
                        let first = queries.sight.len();
                        let height = target.body_profile().height;
                        for fraction in [0.85, 0.5, 0.15] {
                            queries.sight.push(SightRay {
                                from: eye,
                                to: Point {
                                    y: position.y + height * fraction,
                                    ..position
                                },
                            });
                        }
                        SightDecision::Rays { first, count: 3 }
                    }
                }
            };
            checks.push(SightCheck {
                target_id: (*target_id).to_owned(),
                decision,
            });
        }
        let observer = ObserverLife {
            actor_id: observer.id.clone(),
            physical_life: observer.physical_life().unwrap_or(0),
        };
        let actual = size_of::<SightBatch>()
            + observer.actor_id.capacity()
            + checks.capacity() * size_of::<SightCheck>()
            + checks
                .iter()
                .map(|check| check.target_id.capacity())
                .sum::<usize>()
            + queries.sight.capacity() * size_of::<SightRay>();
        reservation
            .resize(actual)
            .map_err(|_| SensorError::Capacity)?;
        Ok(Self {
            observer,
            queries,
            checks,
            reservation,
        })
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }

    pub(crate) fn finish(mut self, answers: GeometryAnswers) -> Result<SightResults, SensorError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| SensorError::Geometry)?;
        for check in &mut self.checks {
            if let SightDecision::Rays { first, count } = check.decision {
                check.decision = SightDecision::Known(
                    answers.sight[first..first + count]
                        .iter()
                        .any(|clear| *clear),
                );
            }
        }
        let binding = self.queries.binding;
        drop(self.queries);
        self.reservation
            .resize(
                size_of::<SightResults>()
                    + self.observer.actor_id.capacity()
                    + self.checks.capacity() * size_of::<SightCheck>()
                    + self
                        .checks
                        .iter()
                        .map(|check| check.target_id.capacity())
                        .sum::<usize>(),
            )
            .map_err(|_| SensorError::Capacity)?;
        Ok(SightResults {
            observer: self.observer,
            binding,
            checks: self.checks,
            _reservation: self.reservation,
        })
    }
}

impl SightResults {
    pub(crate) fn observer(&self) -> &ObserverLife {
        &self.observer
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn seen(&self, target_id: &str) -> Option<bool> {
        self.checks
            .iter()
            .find(|check| check.target_id == target_id)
            .map(|check| match check.decision {
                SightDecision::Known(seen) => seen,
                SightDecision::Rays { .. } => unreachable!("Sight results resolve every bound ray"),
            })
    }
    pub(crate) fn iter(&self) -> impl Iterator<Item = (&str, bool)> {
        self.checks.iter().map(|check| {
            (
                check.target_id.as_str(),
                match check.decision {
                    SightDecision::Known(seen) => seen,
                    SightDecision::Rays { .. } => {
                        unreachable!("Sight results resolve every bound ray")
                    }
                },
            )
        })
    }
}

pub fn bodies_touch(first: &Entity, second: &Entity) -> bool {
    if first.id == second.id || !first.actively_participates() || !second.actively_participates() {
        return false;
    }
    let a = first.body_profile();
    let b = second.body_profile();
    let from = first
        .world_position()
        .expect("Active physical entity has world placement");
    let to = second
        .world_position()
        .expect("Active physical entity has world placement");
    let tolerance = 1e-5;
    let reach = a.radius + b.radius + tolerance;
    (from.x - to.x).powi(2) + (from.z - to.z).powi(2) <= reach.powi(2)
        && from.y <= to.y + b.height + tolerance
        && to.y <= from.y + a.height + tolerance
}

pub fn acoustic_direction(source: Point, listener: Point) -> Option<AcousticDirection> {
    let dx = source.x - listener.x;
    let dz = source.z - listener.z;
    let dy = source.y - listener.y;
    if dx.hypot(dz) < 0.25_f64.max(dy.abs()) {
        return None;
    }
    // Math.round ties toward +infinity; Rust round ties away from zero.
    let sector = ((dz.atan2(dx) / (std::f64::consts::PI / 4.0) + 0.5).floor() + 8.0) % 8.0;
    Some(AcousticDirection {
        sector: sector as u64,
        elevation: if dy > 2.0 {
            Elevation::Above
        } else if dy < -2.0 {
            Elevation::Below
        } else {
            Elevation::Level
        },
    })
}
