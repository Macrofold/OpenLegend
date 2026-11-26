//! Prepare the visible subject of a point shot for release review. The first
//! solid clips the check, while an unseen body belongs only to later physical
//! contact. See docs/worlds/base/ranged-counterplay.md#selected-contact-consequences.

use std::mem::size_of;

use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::SightBatch;
use crate::spatial::{distance, interpolate, moving_point_contact};
use crate::state::{EntityHandle, Point};
use crate::work::WorkUnit;

use super::AimedLife;

pub(crate) struct PointShotReview {
    rays: GeometryQueries,
    source: EntityHandle,
    source_life: u64,
    _reservation: ByteReservation,
}

struct Intersection {
    fraction: f64,
    life: u64,
}

pub(crate) struct PointShotSight {
    sight: SightBatch,
    intersections: Vec<Intersection>,
    _reservation: ByteReservation,
}

impl PointShotReview {
    /// Stage one movement ray from the source's current interaction anchor
    /// through the selected point to the installed weapon's full range.
    /// The caller owns the separate point and release admission and uses the
    /// same native candidate throughout review. The owned ray is discarded
    /// by `finish_movement` before any review result can be used.
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        actor_id: &str,
        point: Point,
        weapon_range: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let entities = &core.state.physical.entities;
        let source = entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = entities
            .resolve(source)
            .ok_or(ExecutionError::MissingActor)?;
        let source_life = actor.physical_life().ok_or(ExecutionError::MissingActor)?;
        if !actor.actively_participates() || !actor.actor.as_ref().is_some_and(|body| body.alive) {
            return Err(ExecutionError::MissingActor);
        }
        let mut from = actor
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        // Review and release must start at the exact same launch anchor.
        from.y += actor.ordinary_body_profile().interaction_height;
        let length = distance(from, point);
        if !length.is_finite()
            || !weapon_range.is_finite()
            || length > weapon_range
            || weapon_range <= 0.0
            || !finite(point)
        {
            return Err(ExecutionError::InvalidPosition);
        }
        if length <= core.state.installed.spatial.epsilon {
            return Ok(None);
        }
        let to = Point {
            x: from.x + ((point.x - from.x) * weapon_range) / length,
            y: from.y + ((point.y - from.y) * weapon_range) / length,
            z: from.z + ((point.z - from.z) * weapon_range) / length,
        };
        if !finite(to) {
            return Err(ExecutionError::InvalidPosition);
        }
        let mut reservation = budget.reserve(size_of::<Self>() + size_of::<SightRay>())?;
        let mut rays = GeometryQueries::new(binding);
        rays.movement_rays
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        reservation.resize(buffer_bytes::<Self, SightRay>(
            rays.movement_rays.capacity(),
        )?)?;
        rays.movement_rays.push(SightRay { from, to });
        Ok(Some(Self {
            rays,
            source,
            source_life,
            _reservation: reservation,
        }))
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.rays
    }

    /// Use the first trusted solid hit to bound an indexed body search.
    /// Prepare sight only for current living bodies actually intersecting the
    /// eligible prefix. Invisible bodies never suppress a visible candidate.
    pub(crate) fn finish_movement(
        self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<Option<PointShotSight>, ExecutionError> {
        self.rays
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::InvalidCheckpoint)?;
        let ray = self
            .rays
            .movement_rays
            .first()
            .ok_or(ExecutionError::Invariant)?;
        let physical = &core.state.physical;
        let actor = physical
            .entities
            .resolve(self.source)
            .filter(|body| {
                body.physical_life() == Some(self.source_life) && body.actively_participates()
            })
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let solid = answer
            .movement_rays
            .first()
            .ok_or(ExecutionError::Invariant)?
            .as_ref();
        let solid = if let Some(hit) = solid {
            core.journal
                .meters
                .charge(&[(WorkUnit::Tests, hit.collider_ids.len() as u64)])?;
            Some((
                hit.fraction,
                hit.collider_ids
                    .iter()
                    .min()
                    .ok_or(ExecutionError::Invariant)?
                    .as_str(),
            ))
        } else {
            None
        };
        let through = solid.map_or(ray.to, |(fraction, _)| {
            interpolate(ray.from, ray.to, fraction)
        });
        let midpoint = interpolate(ray.from, through, 0.5);
        let radius = distance(ray.from, through) / 2.0 + physical.bodies.maximum_extent();
        if !finite(midpoint) || !radius.is_finite() {
            return Err(ExecutionError::InvalidPosition);
        }

        // The existing index constructs and orders borrowed candidate entries.
        // Fund its transient selection and sort buffers before collecting any.
        let (count, _) = physical.bodies.candidate_capacity(midpoint, radius);
        let _index_storage = budget.reserve(
            count
                .max(4)
                .checked_mul(2 * (size_of::<(&str, &())>() + size_of::<(&str, EntityHandle)>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let indexed =
            physical
                .bodies
                .candidates_metered(midpoint, radius, &mut core.journal.meters)?;
        let mut reservation =
            budget.reserve(size_of::<PointShotSight>() - size_of::<SightBatch>())?;
        let mut ids = Vec::new();
        let mut intersections = Vec::new();
        for (id, handle) in indexed {
            if handle == self.source {
                continue;
            }
            let body = physical
                .entities
                .resolve(handle)
                .ok_or(ExecutionError::Invariant)?;
            if !body.actively_participates()
                || !body.actor.as_ref().is_some_and(|actor| actor.alive)
            {
                continue;
            }
            let position = body
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            let body_profile = crate::status::effective_body_profile(body, budget)?;
            core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
            let Some(contact) = moving_point_contact(
                ray.from,
                ray.to,
                position,
                position,
                (&*body_profile).into(),
            ) else {
                continue;
            };
            let fraction = contact.enter;
            if solid.is_some_and(|(at, other)| fraction > at || fraction == at && id >= other) {
                continue;
            }
            let life = body.physical_life().ok_or(ExecutionError::Invariant)?;
            if intersections.len() == intersections.capacity() || ids.len() == ids.capacity() {
                let count = intersections
                    .len()
                    .checked_add(1)
                    .ok_or(ExecutionError::Capacity)?;
                let capacity = intersections
                    .capacity()
                    .max(ids.capacity())
                    .max(2)
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?
                    .max(count);
                reservation.resize(sight_workspace(capacity, capacity)?)?;
                intersections
                    .try_reserve_exact(capacity - intersections.len())
                    .map_err(|_| ExecutionError::Capacity)?;
                ids.try_reserve_exact(capacity - ids.len())
                    .map_err(|_| ExecutionError::Capacity)?;
                reservation.resize(sight_workspace(intersections.capacity(), ids.capacity())?)?;
            }
            ids.push(id);
            intersections.push(Intersection { fraction, life });
        }
        if ids.is_empty() {
            return Ok(None);
        }
        let mut binding = self.rays.binding;
        binding.serial = core.journal.next_provider_serial()?;
        let sight = SightBatch::prepare(
            physical,
            &core.state.installed,
            &actor.id,
            &ids,
            binding,
            budget,
        )
        .map_err(ExecutionError::Sensor)?;
        core.journal
            .meters
            .charge(&[(WorkUnit::Tests, sight.queries().sight.len() as u64)])?;
        drop(ids);
        reservation.resize(sight_workspace(intersections.capacity(), 0)?)?;
        Ok(Some(PointShotSight {
            sight,
            intersections,
            _reservation: reservation,
        }))
    }
}

impl PointShotSight {
    pub(crate) fn queries(&self) -> &GeometryQueries {
        self.sight.queries()
    }

    /// Return only the nearest *visible* living intersection, tied by the
    /// native flight's canonical collider ID order. The exact subject/life
    /// and its own allocation charge move to the release review owner.
    pub(crate) fn finish(
        self,
        answer: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<Option<(AimedLife, ByteReservation)>, ExecutionError> {
        let sight = self.sight.finish(answer).map_err(ExecutionError::Sensor)?;
        let selected = sight
            .iter()
            .zip(self.intersections.iter())
            .filter(|((_, visible), _)| *visible)
            .min_by(|((left_id, _), left), ((right_id, _), right)| {
                if left.fraction == right.fraction {
                    left_id.cmp(right_id)
                } else {
                    left.fraction.total_cmp(&right.fraction)
                }
            });
        let Some(((id, _), intersection)) = selected else {
            return Ok(None);
        };
        let reservation = budget.reserve(size_of::<AimedLife>() + id.len())?;
        Ok(Some((
            AimedLife {
                id: id.to_owned(),
                life: intersection.life,
            },
            reservation,
        )))
    }
}

fn finite(point: Point) -> bool {
    [point.x, point.y, point.z].into_iter().all(f64::is_finite)
}

fn buffer_bytes<S, T>(capacity: usize) -> Result<usize, ExecutionError> {
    capacity
        .checked_mul(size_of::<T>())
        .and_then(|bytes| bytes.checked_add(size_of::<S>()))
        .ok_or(ExecutionError::Capacity)
}

fn sight_workspace(intersections: usize, references: usize) -> Result<usize, ExecutionError> {
    let overhead = size_of::<PointShotSight>() - size_of::<SightBatch>();
    intersections
        .checked_mul(size_of::<Intersection>())
        .and_then(|bytes| bytes.checked_add(references.checked_mul(size_of::<&str>())?))
        .and_then(|bytes| bytes.checked_add(overhead))
        .ok_or(ExecutionError::Capacity)
}

/// Both command preparation and timed release use the same two geometry
/// questions. The result only names the visible body used by their review.
pub(crate) enum PointReview {
    Line(PointShotReview),
    Sight(PointShotSight),
}

pub(crate) enum PointReviewStep {
    Geometry(PointReview),
    Complete(Option<(AimedLife, ByteReservation)>),
}

impl PointReview {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        actor: &str,
        point: Point,
        range: f64,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        Ok(PointShotReview::prepare(core, actor, point, range, binding, budget)?.map(Self::Line))
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        match self {
            Self::Line(line) => line.queries(),
            Self::Sight(sight) => sight.queries(),
        }
    }

    pub(crate) fn finish(
        self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<PointReviewStep, ExecutionError> {
        Ok(match self {
            Self::Line(line) => match line.finish_movement(core, answer, budget)? {
                Some(sight) => PointReviewStep::Geometry(Self::Sight(sight)),
                None => PointReviewStep::Complete(None),
            },
            Self::Sight(sight) => PointReviewStep::Complete(sight.finish(answer, budget)?),
        })
    }
}
