//! Prepare at most the installed number of route alternatives from one
//! observed quarry position. Support, sight, and routes share their normal
//! providers. Their answers carry no permission to track a hidden body.
use super::HuntRead;
use crate::execution::ExecutionError;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, GuardedRoutePlan, RoutePlan, RouteQuery,
    SightRay, StandingQuery, SupportQuery, route_plan,
};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{horizontal_cone, vision_parameters};
use crate::state::{Entity, Point, SurfacePoint};
use std::mem::size_of;

pub(super) enum RouteStage {
    Support,
    Exposure,
    Routes,
}

pub(in crate::native_controller::foraging) struct HuntRoutes {
    options: Vec<RouteOption>,
    pub(super) questions: GeometryQueries,
    pub(super) stage: RouteStage,
    funding: ByteReservation,
}

struct RouteOption {
    point: SurfacePoint,
    separation: f64,
    index: usize,
}

pub(super) struct HuntRoute {
    pub(super) destination: SurfacePoint,
    pub(super) path: GuardedRoutePlan,
    pub(super) _funding: ByteReservation,
}

impl HuntRoutes {
    pub(super) fn ring(
        read: &HuntRead<'_>,
        quarry: &Entity,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let start = read
            .animal
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let crate::state::Placement::World {
            position,
            support_surface_id: Some(surface),
            ..
        } = quarry
            .placement
            .as_ref()
            .ok_or(ExecutionError::InvalidPosition)?
        else {
            return Err(ExecutionError::InvalidPosition);
        };
        let _anchor = budget.reserve(surface.len())?;
        let observed = SurfacePoint {
            x: position.x,
            y: position.y,
            z: position.z,
            surface_id: surface.clone(),
        };
        let count =
            usize::try_from(read.rules.approach.bearings).map_err(|_| ExecutionError::Capacity)?;
        let radius = read.rules.approach.radius_metres
            + read.animal.body_profile().radius
            + quarry.body_profile().radius;
        let facing = (start.z - observed.z).atan2(start.x - observed.x);
        Self::around(&observed, radius, facing, 0..count, count, binding, budget)
    }

    pub(super) fn around(
        anchor: &SurfacePoint,
        radius: f64,
        facing: f64,
        bearings: std::ops::Range<usize>,
        total: usize,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let count = bearings.len();
        let size = count
            .checked_mul(size_of::<SupportQuery>() + anchor.surface_id.len())
            .and_then(|bytes| bytes.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let funding = budget.reserve(size)?;
        let mut questions = GeometryQueries::new(binding);
        questions
            .support
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for index in bearings {
            let angle = facing + index as f64 * std::f64::consts::TAU / total as f64;
            questions.support.push(SupportQuery {
                point: Point {
                    x: anchor.x + angle.cos() * radius,
                    y: anchor.y,
                    z: anchor.z + angle.sin() * radius,
                },
                surface_id: Some(anchor.surface_id.clone()),
                relative: None,
            });
        }
        Ok(Self {
            options: Vec::new(),
            questions,
            stage: RouteStage::Support,
            funding,
        })
    }

    pub(super) fn first_visible(
        self,
        answers: GeometryAnswers,
        budget: &ByteBudget,
    ) -> Result<Option<(usize, SurfacePoint, ByteReservation)>, ExecutionError> {
        self.questions
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        self.options.into_iter().enumerate().find_map(|(index, option)| {
            (answers.sight[index] && answers.standing[index]).then(|| {
                let bytes = option.point.heap_bytes().ok_or(ExecutionError::Capacity)?;
                Ok((option.index, option.point, budget.reserve(bytes)?))
            })
        }).transpose()
    }

    pub(super) fn exposure(
        &mut self,
        state: &crate::simulation::SimulationState,
        animal: &Entity,
        visible: &crate::reception::SightResults,
        pack: Option<&str>,
        answers: GeometryAnswers,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.questions
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let origin = animal
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let body = crate::status::effective_body_profile(animal, budget)?;
        let vision = vision_parameters(&state.installed, animal);
        let eye = Point {
            y: origin.y + body.eye_height,
            ..origin
        };
        let count = answers
            .support
            .iter()
            .filter(|point| point.is_some())
            .count();
        let ordinary_body = animal.body_profile();
        let bytes = answers
            .support
            .iter()
            .flatten()
            .try_fold(0usize, |bytes, point| {
                bytes.checked_add(
                    2 * point.surface_id.len()
                        + ordinary_body.id.len()
                        + size_of::<RouteOption>()
                        + size_of::<StandingQuery>()
                        + size_of::<SightRay>(),
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        self.funding.resize(
            self.funding
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.options = Vec::with_capacity(count);
        let mut questions = GeometryQueries::new(binding);
        questions.sight = Vec::with_capacity(count);
        questions.standing = Vec::with_capacity(count);
        for (index, point) in answers.support.into_iter().enumerate() {
            let Some(point) = point else {
                continue;
            };
            if vision.radius <= 0.0
                || crate::spatial::distance(origin, point.point()) > vision.radius
                || !horizontal_cone(
                    origin,
                    animal.spatial.heading,
                    vision.field_of_view,
                    point.point(),
                )
            {
                continue;
            }
            let separation = super::companions(state, visible, pack)
                .filter_map(|mate| mate.world_position())
                .map(|position| crate::spatial::distance(position, point.point()))
                .reduce(f64::min)
                .unwrap_or(0.0);
            questions.sight.push(SightRay {
                from: eye,
                to: point.point(),
            });
            questions.standing.push(StandingQuery {
                point: point.clone(),
                body: ordinary_body.as_ref().clone(),
            });
            self.options.push(RouteOption {
                point,
                separation,
                index,
            });
        }
        self.questions = questions;
        self.stage = RouteStage::Exposure;
        Ok(())
    }

    pub(super) fn paths(
        &mut self,
        animal: &Entity,
        answers: GeometryAnswers,
        binding: GeometryBinding,
    ) -> Result<(), ExecutionError> {
        self.questions
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let Some(crate::state::Placement::World {
            position: from,
            support_surface_id: Some(surface),
            ..
        }) = &animal.placement
        else {
            return Err(ExecutionError::InvalidPosition);
        };
        let body = animal.body_profile();
        let mut index = 0;
        self.options.retain(|_| {
            let visible = answers.sight[index] && answers.standing[index];
            index += 1;
            visible
        });
        let bytes = self
            .options
            .iter()
            .try_fold(0usize, |bytes, option| {
                bytes.checked_add(
                    size_of::<RouteQuery>()
                        + surface.len()
                        + body.id.len()
                        + option.point.surface_id.len(),
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        self.funding.resize(
            self.funding
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut questions = GeometryQueries::new(binding);
        questions.routes = self
            .options
            .iter()
            .map(|option| RouteQuery::Surface {
                from: SurfacePoint {
                    x: from.x,
                    y: from.y,
                    z: from.z,
                    surface_id: surface.clone(),
                },
                to: option.point.clone(),
                body: body.as_ref().clone(),
            })
            .collect();
        self.questions = questions;
        self.stage = RouteStage::Routes;
        Ok(())
    }

    pub(super) fn select(
        self,
        mut answers: GeometryAnswers,
        retained: Option<&SurfacePoint>,
        improvement: f64,
        budget: &ByteBudget,
    ) -> Result<Option<HuntRoute>, ExecutionError> {
        self.questions
            .validate_answers(&answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let score = |index: usize| {
            let option = &self.options[index];
            match &answers.routes[index] {
                RoutePlan::Reached { length, .. } => {
                    Some((false, option.separation, *length, option.index))
                }
                RoutePlan::Pending { .. } => {
                    Some((true, option.separation, f64::INFINITY, option.index))
                }
                _ => None,
            }
        };
        let chosen = self
            .options
            .iter()
            .enumerate()
            .filter_map(|(index, _)| score(index).map(|score| (index, score)))
            .min_by(|(_, a), (_, b)| {
                a.0.cmp(&b.0)
                    .then_with(|| b.1.total_cmp(&a.1))
                    .then_with(|| a.2.total_cmp(&b.2))
                    .then_with(|| a.3.cmp(&b.3))
            });
        let Some((index, rank)) = chosen else {
            return Ok(None);
        };
        let index = retained
            .and_then(|retained| {
                let candidate = self.options.iter().position(|option| {
                    option.point.surface_id == retained.surface_id
                        && crate::spatial::distance(option.point.point(), retained.point()) < 1e-6
                })?;
                let previous = score(candidate)?;
                (!previous.0 && (rank.0 || rank.1 < previous.1 + improvement)).then_some(candidate)
            })
            .unwrap_or(index);
        let option = self
            .options
            .into_iter()
            .nth(index)
            .ok_or(ExecutionError::Invariant)?;
        let funding = budget.reserve(option.point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let path = route_plan(answers.routes.swap_remove(index), budget)?;
        Ok(Some(HuntRoute {
            destination: option.point,
            path,
            _funding: funding,
        }))
    }
}
