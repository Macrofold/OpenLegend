//! The physical preparation of a moving strike uses installed standoff, reach
//! and speed. It retains one observed position and the original release time.
use crate::execution::ExecutionError;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, GuardedRoutePlan, RelativeSupport,
    RouteQuery, SightRay, SupportQuery, route_plan,
};
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::VerifiedDefinition;
use crate::native_response::{LocomotionMode, NativeLocomotion, NativeResponseProfile};
use crate::simulation::InstalledWorld;
use crate::spatial::{Extent, body_surface_distance};
use crate::state::{Action, BodyProfile, Entity, Placement, Point, SurfacePoint};
use crate::worlds::base_decision_offers::{NativeStrikeRead, StrikePreparationRead};
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StrikeMotion {
    pub locomotion: NativeLocomotion,
    pub release_at: f64,
    pub observed: StrikeObservation,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StrikeObservation {
    pub point: SurfacePoint,
    pub at: f64,
}

heap_record!(StrikeMotion {
    locomotion,
    observed
});
heap_record!(StrikeObservation { point });

pub(super) fn valid_route(installed: &InstalledWorld, action: &Action) -> bool {
    let valid_point = |point: &SurfacePoint| {
        [point.x, point.y, point.z].into_iter().all(f64::is_finite)
            && crate::values::is_safe_record_id(&point.surface_id)
    };
    (action.path.len() as u64) <= installed.spatial.max_path_points
        && action.path.iter().all(valid_point)
        && action.navigation.as_ref().is_none_or(|pending| {
            let request = &pending.request;
            action.path.is_empty()
                && request.wait.as_deref() == Some("entity")
                && valid_point(&request.from)
                && request.destinations.len() == 1
                && request.destinations.iter().all(valid_point)
        })
}

/// Choose the ordered profile used by Source. Installation has already
/// validated that every profile defining this locomotion agrees on its speed.
fn selected_locomotion<'a>(
    installed: &'a InstalledWorld,
    motion: &StrikePreparationRead,
) -> Option<&'a VerifiedDefinition<NativeResponseProfile>> {
    installed.response_profiles.values().find(|profile| {
        profile
            .value()
            .locomotion
            .contains_key(&motion.locomotion_profile_id)
    })
}

impl StrikeMotion {
    pub(super) fn reobserve(
        &self,
        target: &Entity,
        now: f64,
        budget: &ByteBudget,
    ) -> Result<Option<(Box<Self>, ByteReservation)>, ExecutionError> {
        let (point, surface) = support_parts(target).ok_or(ExecutionError::InvalidPosition)?;
        if self.observed.at == now
            && self.observed.point.point() == point
            && self.observed.point.surface_id == surface
        {
            return Ok(None);
        }
        let bytes = heap_sum([
            size_of::<Self>(),
            self.locomotion
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            surface.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        Ok(Some((
            Box::new(Self {
                locomotion: self.locomotion.clone(),
                release_at: self.release_at,
                observed: StrikeObservation {
                    point: SurfacePoint {
                        x: point.x,
                        y: point.y,
                        z: point.z,
                        surface_id: surface.into(),
                    },
                    at: now,
                },
            }),
            storage,
        )))
    }

    pub(crate) fn prepare(
        installed: &InstalledWorld,
        definition: &NativeStrikeRead,
        target: &Entity,
        now: f64,
        budget: &ByteBudget,
    ) -> Result<(Box<Self>, ByteReservation), ExecutionError> {
        let profile = definition
            .preparation_motion
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let installed = selected_locomotion(installed, profile).ok_or(ExecutionError::Invariant)?;
        let Some(Placement::World {
            position,
            support_surface_id: Some(surface_id),
            ..
        }) = &target.placement
        else {
            return Err(ExecutionError::InvalidPosition);
        };
        let bytes = heap_sum([
            std::mem::size_of::<Self>(),
            installed
                .pin()
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            profile.locomotion_profile_id.len(),
            surface_id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let budget = budget.reserve(bytes)?;
        let motion = Box::new(Self {
            locomotion: NativeLocomotion {
                profile: installed.pin().clone(),
                locomotion: profile.locomotion_profile_id.clone(),
                mode: LocomotionMode::Travel,
                episode_id: None,
                generation: None,
            },
            release_at: now + definition.work_seconds,
            observed: StrikeObservation {
                point: SurfacePoint {
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    surface_id: surface_id.clone(),
                },
                at: now,
            },
        });
        Ok((motion, budget))
    }

    pub(super) fn valid(
        &self,
        installed: &InstalledWorld,
        definition: &NativeStrikeRead,
        now: f64,
        remaining: f64,
    ) -> bool {
        let Some(profile) = definition.preparation_motion.as_ref() else {
            return false;
        };
        let binding = &self.locomotion;
        self.release_at.is_finite()
            && self.release_at >= 0.0
            && self.release_at >= now - installed.time_epsilon
            && (remaining - (self.release_at - now).max(0.0)).abs() <= installed.time_epsilon
            && self.observed.at.is_finite()
            && self.observed.at >= 0.0
            && self.observed.at <= now
            && [
                self.observed.point.x,
                self.observed.point.y,
                self.observed.point.z,
            ]
            .into_iter()
            .all(f64::is_finite)
            && crate::values::is_safe_record_id(&self.observed.point.surface_id)
            && binding.locomotion == profile.locomotion_profile_id
            && binding.mode == LocomotionMode::Travel
            && binding.episode_id.is_none()
            && binding.generation.is_none()
            && selected_locomotion(installed, profile)
                .is_some_and(|definition| definition.pin() == &binding.profile)
    }
}

/// The caller checks this interaction-anchor ray after selecting range by
/// body surface for moving contact, or by the usual anchors for a fixed strike.
pub(crate) fn reach(
    installed: &InstalledWorld,
    definition: &NativeStrikeRead,
    actor: &Entity,
    target: &Entity,
    range: f64,
    budget: &ByteBudget,
) -> Result<Option<SightRay>, ExecutionError> {
    if definition.preparation_motion.is_none() {
        return crate::geometry::interaction_reach(actor, target, range, budget);
    }
    let from = actor
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    body_reach_from(installed, actor, target, from, range, budget)
}

pub(super) fn body_reach_from(
    installed: &InstalledWorld,
    actor: &Entity,
    target: &Entity,
    mut from: Point,
    range: f64,
    budget: &ByteBudget,
) -> Result<Option<SightRay>, ExecutionError> {
    let mut to = target
        .world_position()
        .ok_or(ExecutionError::InvalidPosition)?;
    let a = crate::status::effective_body_profile(actor, budget)?;
    let b = crate::status::effective_body_profile(target, budget)?;
    if body_surface_distance(
        from,
        Extent {
            radius: a.radius,
            height: a.height,
        },
        to,
        Extent {
            radius: b.radius,
            height: b.height,
        },
    ) > range + installed.spatial.epsilon
    {
        return Ok(None);
    }
    from.y += a.interaction_height;
    to.y += b.interaction_height;
    Ok(Some(SightRay { from, to }))
}

pub(crate) enum StrikeRouteStep {
    Geometry,
    AtStance,
    KeepRoute,
    Route(GuardedRoutePlan),
    Unavailable,
}

#[derive(Clone, Copy)]
enum RouteStage {
    Reach { current: bool, last: bool },
    Support,
    Route,
}

pub(super) fn support_parts(entity: &Entity) -> Option<(Point, &str)> {
    match &entity.placement {
        Some(Placement::World {
            position,
            support_surface_id: Some(surface),
            ..
        }) => Some((*position, surface)),
        _ => None,
    }
}

/// Prepare a supported stance for an already witnessed target. Both admission
/// and active windup use the same geometry. No route answer moves either body.
pub(crate) struct StrikeRoute {
    from: Option<SurfacePoint>,
    body: Option<BodyProfile>,
    stance: Option<SupportQuery>,
    queries: GeometryQueries,
    stage: RouteStage,
    _custody: ByteReservation,
}

impl StrikeRoute {
    pub(crate) fn prepare(
        installed: &InstalledWorld,
        definition: &StrikePreparationRead,
        actor: &Entity,
        target: &Entity,
        existing: &[SurfacePoint],
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let a = crate::status::effective_body_profile(actor, budget)?;
        let b = crate::status::effective_body_profile(target, budget)?;
        let body_id_bytes = actor.ordinary_body_profile().id.len();
        let (from, from_surface) = support_parts(actor).ok_or(ExecutionError::InvalidPosition)?;
        let (to, to_surface) = support_parts(target).ok_or(ExecutionError::InvalidPosition)?;
        let custody = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                size_of::<SupportQuery>(),
                size_of::<RouteQuery>(),
                2 * size_of::<SightRay>(),
                from_surface.len(),
                to_surface.len(),
                body_id_bytes,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut queries = GeometryQueries::new(binding);
        let check = |mut point: Point| {
            let within = body_surface_distance(
                point,
                Extent {
                    radius: a.radius,
                    height: a.height,
                },
                to,
                Extent {
                    radius: b.radius,
                    height: b.height,
                },
            ) <= definition.stand_off_range + installed.spatial.epsilon;
            within.then(|| {
                let mut target_anchor = to;
                point.y += a.interaction_height;
                target_anchor.y += b.interaction_height;
                SightRay {
                    from: point,
                    to: target_anchor,
                }
            })
        };
        let current = check(from);
        let last = existing.last().and_then(|point| check(point.point()));
        let (here, there) = (current.is_some(), last.is_some());
        let (dx, dz) = (from.x - to.x, from.z - to.z);
        let heading = if dx != 0.0 || dz != 0.0 {
            dx.atan2(dz)
        } else {
            actor.spatial.heading
        };
        let radius = a.radius + b.radius + definition.stand_off_range;
        // The target's support supplies the height at the offset, including
        // on ramps. The request may not snap to a different floor.
        let mut stance = Some(SupportQuery {
            point: to,
            surface_id: Some(to_surface.into()),
            relative: Some(RelativeSupport {
                x: 0.0,
                z: radius,
                heading,
            }),
        });
        let stage = if here || there {
            queries.sight = Vec::with_capacity(usize::from(here) + usize::from(there));
            queries.sight.extend(current.into_iter().chain(last));
            RouteStage::Reach {
                current: here,
                last: there,
            }
        } else {
            queries.support = vec![stance.take().ok_or(ExecutionError::Invariant)?];
            RouteStage::Support
        };
        Ok(Self {
            from: Some(SurfacePoint {
                x: from.x,
                y: from.y,
                z: from.z,
                surface_id: from_surface.into(),
            }),
            body: Some(actor.body_profile().into_owned()),
            stance,
            queries,
            stage,
            _custody: custody,
        })
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        &self.queries
    }

    pub(crate) fn step(
        &mut self,
        mut answers: GeometryAnswers,
        next_serial: impl FnOnce() -> Result<u64, ExecutionError>,
        budget: &ByteBudget,
    ) -> Result<StrikeRouteStep, ExecutionError> {
        self.queries
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let next = match self.stage {
            RouteStage::Reach { current, last } => {
                let mut clear = answers.sight.into_iter();
                if current && clear.next() == Some(true) {
                    return Ok(StrikeRouteStep::AtStance);
                }
                if last && clear.next() == Some(true) {
                    return Ok(StrikeRouteStep::KeepRoute);
                }
                let mut query = GeometryQueries::new(self.queries.binding);
                query.support = vec![self.stance.take().ok_or(ExecutionError::Invariant)?];
                self.stage = RouteStage::Support;
                query
            }
            RouteStage::Support => {
                let Some(to) = answers.support.pop().ok_or(ExecutionError::Invariant)? else {
                    return Ok(StrikeRouteStep::Unavailable);
                };
                self._custody.resize(
                    self._custody
                        .bytes()
                        .checked_add(to.surface_id.capacity())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let mut query = GeometryQueries::new(self.queries.binding);
                query.routes = vec![RouteQuery::Surface {
                    from: self.from.take().ok_or(ExecutionError::Invariant)?,
                    to,
                    body: self.body.take().ok_or(ExecutionError::Invariant)?,
                }];
                self.stage = RouteStage::Route;
                query
            }
            RouteStage::Route => {
                return Ok(StrikeRouteStep::Route(route_plan(
                    answers.routes.pop().ok_or(ExecutionError::Invariant)?,
                    budget,
                )?));
            }
        };
        self.queries = next;
        self.queries.binding.serial = next_serial()?;
        Ok(StrikeRouteStep::Geometry)
    }
}
