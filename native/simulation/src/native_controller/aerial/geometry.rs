//! Admitted corridor supports, body geometry and the observer's planning scope.
//! The physics query grants no private knowledge about the route's far side.
use super::separation_is_clear;
use crate::execution::{CoreMutation, ExecutionError};
use crate::flight::{FlightConnection, FlightConnectionKind, FlightContinuation};
use crate::geometry::{
    FlightSegment, GeometryAnswers, GeometryBinding, GeometryQueries, SightRay, SightSweepQuery,
    StandingQuery,
};
use crate::host::{ByteBudget, ByteReservation};
use crate::native_danger::DangerAssessment;
use crate::reception::{VisionParameters, horizontal_cone, vision_parameters};
use crate::spatial::{cone_roots, distance, interpolate};
use crate::state::{Point, SurfacePoint};
use crate::work::WorkUnit;
use std::mem::size_of;

pub(super) struct AirGeometry {
    pub origin: Point,
    pub points: Vec<Point>,
    pub length: f64,
    request: Option<(GeometryQueries, ByteReservation)>,
    sight: Option<(VisionParameters, f64, Point)>,
    _storage: ByteReservation,
}

impl AirGeometry {
    pub(super) fn prepare(
        core: &mut CoreMutation<'_>,
        id: &str,
        frame: &DangerAssessment,
        connection: &FlightConnection,
        retained: bool,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let installed = &core.state.installed;
        let entity = core
            .state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let animal = entity.animal.as_ref().ok_or(ExecutionError::Invariant)?;
        let profile = crate::native_controller::selected_profile(installed, animal)?;
        let origin = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let at = core.state.physical.header.sim_time;
        let route = installed
            .retained
            .flight_corridors
            .get(&connection.route_id)
            .ok_or(ExecutionError::Invariant)?;
        let landing = connection.kind == FlightConnectionKind::Landing;
        let end = if landing {
            route.points.len() - 1
        } else {
            connection.next
        };
        let points = route
            .points
            .get(connection.next..=end)
            .ok_or(ExecutionError::Invariant)?;
        let terminal = points.last().ok_or(ExecutionError::Invariant)?;
        let body = entity.body_profile();
        if &route.body != body.as_ref()
            || landing != terminal.landing_surface_id.is_some()
            || landing && !matches!(route.continuation, FlightContinuation::Land { .. })
        {
            return Ok(None);
        }
        let mut prior = origin;
        let mut support = crate::flight::support(entity);
        let mut length = 0.0;
        let mut strings = 0_usize;
        for (index, point) in points.iter().enumerate() {
            core.journal.meters.charge(&[(WorkUnit::Tests, 1)])?;
            if (support.is_some() || point.landing_surface_id.is_some())
                && (prior.x - point.position.x).hypot(prior.z - point.position.z)
                    > installed.spatial.epsilon
            {
                return Ok(None);
            }
            if index + 1 < points.len()
                && point.landing_surface_id.is_some()
                && distance(origin, point.position) > installed.spatial.epsilon
                && !separation_is_clear(entity, point.position, frame, profile, at)?
            {
                return Ok(None);
            }
            length += distance(prior, point.position);
            strings = strings
                .checked_add(
                    body.id.len()
                        + support.map_or(0, str::len)
                        + point.landing_surface_id.as_ref().map_or(0, String::len),
                )
                .ok_or(ExecutionError::Capacity)?;
            prior = point.position;
            support = point.landing_surface_id.as_deref();
        }
        if length <= installed.spatial.epsilon
            || length > profile.candidates.maximum_route_length + installed.spatial.epsilon
        {
            return Ok(None);
        }
        let sight = if retained {
            None
        } else {
            if installed
                .capabilities
                .capability_blocked(Some(entity), "perception")?
            {
                return Ok(None);
            }
            let vision = vision_parameters(installed, entity);
            let eye = Point {
                y: origin.y + body.eye_height,
                ..origin
            };
            if vision.radius <= 0.0
                || points
                    .iter()
                    .any(|point| distance(origin, point.position) > vision.radius)
            {
                return Ok(None);
            }
            Some((vision, entity.spatial.heading, eye))
        };
        // Both query vectors are allocated once; transfer ownership to the
        // geometry owner before any continuation can change this candidate.
        let bytes = points
            .len()
            .checked_mul(
                size_of::<FlightSegment>() + size_of::<SightSweepQuery>() + 2 * size_of::<String>(),
            )
            .and_then(|bytes| bytes.checked_add(strings))
            .and_then(|bytes| {
                bytes.checked_add(
                    size_of::<GeometryQueries>()
                        + size_of::<StandingQuery>()
                        + body.id.len()
                        + terminal.landing_surface_id.as_ref().map_or(0, String::len),
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let point_storage =
            budget.reserve(size_of::<Self>() + points.len() * size_of::<Point>())?;
        let mut request = GeometryQueries::new(binding);
        request.flight.reserve_exact(points.len());
        if sight.is_some() {
            request.sight_sweeps.reserve_exact(points.len());
        }
        let mut previous = origin;
        let mut supported = crate::flight::support(entity);
        for point in points {
            let landing = point.landing_surface_id.as_deref();
            request.flight.push(FlightSegment {
                from: previous,
                to: point.position,
                body: body.as_ref().clone(),
                supports: supported
                    .into_iter()
                    .chain(landing)
                    .map(str::to_owned)
                    .collect(),
            });
            if let Some((_, _, eye)) = sight {
                request.sight_sweeps.push(SightSweepQuery {
                    eye_from: eye,
                    eye_to: eye,
                    point_from: previous,
                    point_to: point.position,
                });
            }
            previous = point.position;
            supported = landing;
        }
        if let Some(surface_id) = &terminal.landing_surface_id {
            request.standing.push(StandingQuery {
                point: SurfacePoint {
                    x: terminal.position.x,
                    y: terminal.position.y,
                    z: terminal.position.z,
                    surface_id: surface_id.clone(),
                },
                body: body.as_ref().clone(),
            });
        }
        Ok(Some(Self {
            origin,
            length,
            sight,
            points: points.iter().map(|point| point.position).collect(),
            request: Some((request, storage)),
            _storage: point_storage,
        }))
    }

    pub(super) fn request(&self) -> Option<&GeometryQueries> {
        self.request.as_ref().map(|(queries, _)| queries)
    }
    pub(super) fn finished(&self) -> bool {
        self.request.is_none()
    }
    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        candidate: crate::host::CandidateKey,
        answer: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<Option<bool>, ExecutionError> {
        let Some(answer) = answer else {
            return Ok(None);
        };
        let (request, _storage) = self.request.take().ok_or(ExecutionError::Invariant)?;
        request
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        if !answer
            .flight
            .iter()
            .chain(&answer.standing)
            .all(|clear| *clear)
            || !answer.sight.iter().all(|clear| *clear)
        {
            return Ok(Some(false));
        }
        let Some((vision, heading, eye)) = self.sight.take() else {
            return Ok(Some(true));
        };
        let count = answer
            .sight_sweeps
            .iter()
            .try_fold(0_usize, |count, sweep| {
                count.checked_add(sweep.fractions.len() + 4)
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(
            count
                .checked_mul(size_of::<SightRay>())
                .and_then(|bytes| bytes.checked_add(size_of::<GeometryQueries>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let binding = GeometryBinding::new(
            candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let mut request = GeometryQueries::new(binding);
        request.sight.reserve_exact(count);
        for (segment, mut sweep) in self
            .points
            .iter()
            .copied()
            .scan(self.origin, |previous, point| {
                let from = *previous;
                *previous = point;
                Some((from, point))
            })
            .zip(answer.sight_sweeps)
        {
            let (from, to) = segment;
            let _roots = budget.reserve((sweep.fractions.len() + 4) * size_of::<f64>())?;
            sweep.fractions.reserve_exact(4);
            cone_roots(
                self.origin,
                from,
                to,
                heading,
                vision.field_of_view,
                &mut sweep.fractions,
            );
            sweep.fractions.push(0.0);
            sweep.fractions.push(1.0);
            sweep.fractions.sort_by(f64::total_cmp);
            for pair in sweep.fractions.windows(2) {
                if pair[1] - pair[0] <= f64::EPSILON {
                    continue;
                }
                let point = interpolate(from, to, (pair[0] + pair[1]) / 2.0);
                if !horizontal_cone(self.origin, heading, vision.field_of_view, point) {
                    return Ok(Some(false));
                }
                request.sight.push(SightRay {
                    from: eye,
                    to: point,
                });
            }
            if !horizontal_cone(self.origin, heading, vision.field_of_view, to) {
                return Ok(Some(false));
            }
            request.sight.push(SightRay { from: eye, to });
        }
        core.journal
            .meters
            .charge(&[(WorkUnit::Tests, request.sight.len() as u64)])?;
        self.request = Some((request, storage));
        Ok(None)
    }
}
