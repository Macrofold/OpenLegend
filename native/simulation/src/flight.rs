//! Authored air corridors and current-format flight state. The engine neither
//! grants flight from appearance nor invents an edge when a route is blocked.

use crate::host::retained_size::{HeapBytes, heap_record};
use crate::install::InstallError;
use crate::state::{BodyProfile, EntityStore, Placement, Point};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FlightProgress {
    pub route_id: String,
    pub next: usize,
    pub wait_seconds: f64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub at_rest: Option<bool>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub native_locomotion: Option<FlightLocomotion>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub awaiting_choice: Option<bool>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub stop_at_landing: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FlightLocomotion {
    pub profile: crate::values::DefinitionPin,
    pub locomotion: String,
    pub mode: crate::native_response::LocomotionMode,
    pub episode_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub generation: u64,
    pub id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub physical_life: u64,
    pub route_digest: String,
    pub selected_at: f64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub geometry_revision: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub draw: Option<f64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub stop_at: Option<usize>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Corridor {
    id: String,
    pub body: BodyProfile,
    pub speed: f64,
    pub climb_speed: f64,
    pub continuation: FlightContinuation,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub response_connections: Option<Vec<FlightConnection>>,
    pub points: Vec<FlightWaypoint>,
}

#[derive(Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum FlightContinuation {
    Loop,
    Land {
        #[serde(
            default,
            deserialize_with = "crate::values::deserialize_present_option"
        )]
        resume_route_id: Option<String>,
    },
    Join {
        route_id: String,
        next: usize,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FlightConnection {
    pub kind: FlightConnectionKind,
    pub route_id: String,
    pub next: usize,
}

#[derive(Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum FlightConnectionKind {
    Landing,
    Transit,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FlightWaypoint {
    pub position: Point,
    pub wait_seconds: f64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub landing_surface_id: Option<String>,
}

pub(crate) type Corridors = IndexMap<String, Corridor>;

/// Validate the exact retained route roster before any flyer uses it. Swept
/// clearance is checked by the geometry owner for installation and live legs.
pub(crate) fn validate_corridors(
    routes: &Corridors,
    maximum_candidates: usize,
    epsilon: f64,
) -> Result<(), InstallError> {
    use crate::spatial::distance;
    let valid =
        |route: &Corridor, joined: &Corridor, at: &FlightWaypoint, next: &FlightWaypoint| {
            route.body == joined.body
                && at.landing_surface_id == next.landing_surface_id
                && distance(at.position, next.position) <= epsilon
        };
    for (key, route) in routes {
        if key != &route.id
            || !crate::values::is_safe_record_id(key)
            || !(0.0 < route.speed && route.speed <= 1.0)
            || !(0.0 < route.climb_speed && route.climb_speed <= route.speed)
            || route.points.len() < 2
            || route.points.iter().any(|point| {
                ![point.position.x, point.position.y, point.position.z]
                    .into_iter()
                    .all(f64::is_finite)
                    || !(0.0..=86_400.0).contains(&point.wait_seconds)
            })
        {
            return Err(InstallError::CurrentFormat);
        }
        let first = &route.points[0];
        let last = &route.points[route.points.len() - 1];
        let vertical = |a: &FlightWaypoint, b: &FlightWaypoint| {
            (a.landing_surface_id.is_none() && b.landing_surface_id.is_none())
                || (b.position.x - a.position.x).hypot(b.position.z - a.position.z) <= epsilon
        };
        if route
            .points
            .windows(2)
            .any(|pair| !vertical(&pair[0], &pair[1]))
        {
            return Err(InstallError::CurrentFormat);
        }
        let continues = match &route.continuation {
            FlightContinuation::Loop => vertical(last, first),
            FlightContinuation::Land { resume_route_id } => {
                last.landing_surface_id.is_some()
                    && last.wait_seconds == 0.0
                    && resume_route_id.as_ref().is_none_or(|id| {
                        routes.get(id).is_some_and(|resume| {
                            resume
                                .points
                                .first()
                                .is_some_and(|departure| valid(route, resume, last, departure))
                        })
                    })
            }
            FlightContinuation::Join { route_id, next } => {
                last.landing_surface_id.is_none()
                    && routes.get(route_id).is_some_and(|join| {
                        if *next >= join.points.len() {
                            return false;
                        }
                        let previous = if *next == 0 {
                            matches!(join.continuation, FlightContinuation::Loop)
                                .then(|| join.points.last())
                                .flatten()
                        } else {
                            join.points.get(*next - 1)
                        };
                        previous.is_some_and(|arrival| valid(route, join, last, arrival))
                    })
            }
        };
        if !continues {
            return Err(InstallError::CurrentFormat);
        }
        if let Some(connections) = &route.response_connections {
            if connections.len() >= maximum_candidates {
                return Err(InstallError::CurrentFormat);
            }
            for (index, connection) in connections.iter().enumerate() {
                if connections[..index].iter().any(|previous| {
                    previous.kind == connection.kind
                        && previous.route_id == connection.route_id
                        && previous.next == connection.next
                }) || !routes.get(&connection.route_id).is_some_and(|next| {
                    route.body == next.body
                        && next
                            .points
                            .get(connection.next)
                            .is_some_and(|waypoint| match connection.kind {
                                FlightConnectionKind::Landing => {
                                    matches!(next.continuation, FlightContinuation::Land { .. })
                                }
                                FlightConnectionKind::Transit => {
                                    waypoint.landing_surface_id.is_none()
                                }
                            })
                }) {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
    }
    Ok(())
}

/// Check an active route against the actual installed body and its exact
/// saved support. Current geometry can legitimately obstruct this cut.
pub(crate) fn validate_flyers(
    entities: &EntityStore,
    routes: &Corridors,
    surfaces: &[crate::geometry::WalkableSurface],
    rules: Option<&crate::worlds::base_cognition::FlightRules>,
    epsilon: f64,
) -> Result<(), InstallError> {
    if routes
        .values()
        .flat_map(|route| &route.points)
        .any(|point| {
            point
                .landing_surface_id
                .as_ref()
                .is_some_and(|id| !surfaces.iter().any(|surface| &surface.id == id))
        })
    {
        return Err(InstallError::CurrentFormat);
    }
    for entity in entities.ordered_ids().filter_map(|id| entities.get(id)) {
        let flight = &entity.spatial.flight;
        let fall = entity.spatial.fall_velocity;
        if entity
            .animal
            .as_ref()
            .and_then(|animal| animal.aerial_route_id.as_ref())
            .is_some_and(|id| {
                routes
                    .get(id)
                    .is_none_or(|route| entity.ordinary_body_profile() != &route.body)
            })
        {
            return Err(InstallError::CurrentFormat);
        }
        let Some(Placement::World {
            position,
            support_surface_id,
            ..
        }) = &entity.placement
        else {
            if flight.is_some() || fall.is_some() {
                return Err(InstallError::CurrentFormat);
            }
            continue;
        };
        if flight.is_none() && fall.is_none() {
            if support_surface_id.is_none() {
                return Err(InstallError::CurrentFormat);
            }
            continue;
        }
        let policy = rules.ok_or(InstallError::UnsupportedFamily("flight policy"))?;
        if !policy.fall_acceleration.is_finite()
            || policy.fall_acceleration <= 0.0
            || !policy.terminal_fall_speed.is_finite()
            || policy.terminal_fall_speed <= 0.0
            || !policy.minimum_fall_height.is_finite()
            || !crate::values::is_safe_record_id(&policy.takeoff_event)
            || !crate::values::is_safe_record_id(&policy.landing_event)
        {
            return Err(InstallError::CurrentFormat);
        }
        if let Some(velocity) = fall
            && (flight.is_some()
                || support_surface_id.is_some()
                || !(-100.0..=0.0).contains(&velocity))
        {
            return Err(InstallError::CurrentFormat);
        }
        let Some(flight) = flight else {
            continue;
        };
        if flight.native_locomotion.is_some() || flight.awaiting_choice.is_some() {
            return Err(InstallError::UnsupportedFamily("directed flight escape"));
        }
        let route = routes
            .get(&flight.route_id)
            .ok_or(InstallError::CurrentFormat)?;
        let waypoint = route
            .points
            .get(flight.next)
            .ok_or(InstallError::CurrentFormat)?;
        if entity.actor.is_none()
            || entity.body_profile().as_ref() != &route.body
            || !(0.0..=86_400.0).contains(&flight.wait_seconds)
            || flight.stop_at_landing == Some(false)
            || flight.at_rest == Some(false)
            || flight.at_rest == Some(true)
                && (flight.wait_seconds != 0.0
                    || support_surface_id.is_none()
                    || support_surface_id != &waypoint.landing_surface_id
                    || crate::spatial::distance(*position, waypoint.position) > epsilon
                    || matches!(route.continuation, FlightContinuation::Land { .. })
                        && flight.stop_at_landing.is_none()
                        && flight.next + 1 != route.points.len())
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    Ok(())
}

heap_record!(FlightProgress {
    route_id,
    native_locomotion
});
heap_record!(FlightLocomotion {
    profile,
    locomotion,
    episode_id,
    id,
    route_digest
});
heap_record!(FlightWaypoint { landing_surface_id });
heap_record!(FlightConnection { route_id });
heap_record!(Corridor {
    id,
    body,
    continuation,
    response_connections,
    points
});
impl HeapBytes for FlightContinuation {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Loop => Some(0),
            Self::Land { resume_route_id } => resume_route_id.heap_bytes(),
            Self::Join { route_id, .. } => route_id.heap_bytes(),
        }
    }
}
