//! An invocation binds only a destination. Fresh physical sight and the shared
//! approach provider supply target stances; ordinary command admission still
//! checks the resulting intention before any work can be interrupted.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery, SightRay,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::reception::SightBatch;
use crate::records::SqlCell;
use crate::state::{Point, SurfacePoint};
use std::mem::size_of;

/// The movement binding owner emits the same command for a provider-selected
/// stance and for an actor's exact held historical point. No projection or
/// fresh hidden target lookup is performed by this serialization step.
pub(crate) fn movement_destination(
    actor: &str,
    id: &str,
    point: &SurfacePoint,
    budget: &ByteBudget,
) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Move<'a> {
        id: &'a str,
        actor_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
        destination: &'a SurfacePoint,
    }
    let input = Move {
        id,
        actor_id: actor,
        kind: "move",
        destination: point,
    };
    let bytes = crate::encoding::json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
    let guard = budget.reserve(bytes.checked_mul(12).ok_or(ExecutionError::Capacity)?)?;
    let json = crate::encoding::json_record(&input).map_err(|_| ExecutionError::Invariant)?;
    let command = serde_json::from_str(&json).map_err(|_| ExecutionError::Invariant)?;
    Ok((command, guard))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    family: String,
    #[serde(default)]
    parameters: Option<SqlCell>,
    x: Option<f64>,
    z: Option<f64>,
    surface_id: Option<String>,
    frame: Option<String>,
    place: Option<String>,
    target_entity_id: Option<String>,
    distance: Option<f64>,
    relation: Option<String>,
    on_lost: Option<String>,
    until: Option<SqlCell>,
    item_id: Option<String>,
    quantity: Option<SqlCell>,
}
// Option alone permits missing keys in Serde. Source's closed invocation grammar
// requires every nullable argument to be explicitly present.
const KEYS: [&str; 14] = [
    "family",
    "x",
    "z",
    "surfaceId",
    "frame",
    "place",
    "targetEntityId",
    "distance",
    "relation",
    "onLost",
    "until",
    "itemId",
    "quantity",
    "parameters",
];
fn valid_shape(raw: &SqlCell) -> bool {
    raw.as_object().is_some_and(|map| {
        KEYS[..13].iter().all(|key| map.contains_key(*key))
            && map.keys().all(|key| KEYS.contains(&key.as_str()))
    })
}
fn valid_move(v: &Input, offset: f64) -> bool {
    if v.parameters.is_some()
        || v.item_id.is_some()
        || v.quantity.is_some()
        || v.distance.is_some()
        || v.on_lost.is_some()
        || v.until.is_some()
        || v.relation
            .as_deref()
            .is_some_and(|r| v.place.as_deref() != Some("target") || r != "near")
    {
        return false;
    }
    if let Some(place) = v.place.as_deref() {
        return ["target", "last-seen"].contains(&place)
            && v.target_entity_id.as_deref().is_some_and(is_safe_record_id)
            && v.x.is_none()
            && v.z.is_none()
            && v.surface_id.is_none()
            && v.frame.is_none();
    }
    let Some((x, z)) = v.x.zip(v.z).filter(|(x, z)| x.is_finite() && z.is_finite()) else {
        return false;
    };
    v.target_entity_id.is_none()
        && if v.frame.as_deref() == Some("actor") {
            let distance = crate::spatial::distance(
                Point { x, y: 0.0, z },
                Point {
                    x: 0.0,
                    y: 0.0,
                    z: 0.0,
                },
            );
            v.surface_id.is_none() && distance > 0.0 && distance <= offset
        } else {
            v.frame.as_deref().is_none_or(|frame| frame == "world")
                && v.surface_id.as_deref().is_none_or(is_safe_record_id)
        }
}
pub(crate) struct BoundInvocation {
    value: Result<NativeCommand, Outcome>,
    storage: ByteReservation,
}
impl BoundInvocation {
    pub(crate) fn into_parts(self) -> (Result<NativeCommand, Outcome>, ByteReservation) {
        (self.value, self.storage)
    }
}
pub(crate) enum InvocationStep<'a> {
    Geometry(&'a GeometryQueries),
    Complete(BoundInvocation),
}
#[derive(Clone, Copy)]
enum Phase {
    Start,
    Sight,
    Route,
    Relative,
    Done,
}
pub(crate) struct InvocationCursor {
    actor: String,
    id: String,
    input: Option<Input>,
    phase: Phase,
    candidate: CandidateKey,
    sight: Option<SightBatch>,
    queries: Option<GeometryQueries>,
    result: Option<Result<NativeCommand, Outcome>>,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
}
impl InvocationCursor {
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.queries.as_ref()
    }
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        actor: &str,
        id: &str,
        raw: &SqlCell,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bound = raw
            .heap_bytes()
            .and_then(|n| n.checked_mul(8))
            .and_then(|n| n.checked_add(actor.len() + id.len() + size_of::<Self>() + 4096))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bound)?;
        let input = if valid_shape(raw) {
            crate::encoding::json_record(raw)
                .ok()
                .and_then(|json| serde_json::from_str::<Input>(&json).ok())
        } else {
            None
        };
        let mut result = Self {
            actor: actor.into(),
            id: id.into(),
            input,
            phase: Phase::Start,
            candidate,
            sight: None,
            queries: None,
            result: None,
            budget: budget.clone(),
            storage: Some(storage),
        };
        match result.input.as_ref() {
            Some(v) if v.family != "move" => result.refuse(
                "unsupported-action",
                "That action family is not available in this native execution scope.",
            )?,
            Some(v)
                if valid_move(
                    v,
                    core.state.installed.actor_response_limits.invocation.offset,
                ) => {}
            _ => result.refuse(
                "invalid-invocation",
                "Action arguments do not match an available capability.",
            )?,
        }
        Ok(result)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let storage = self
            .storage
            .as_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn refuse(&mut self, code: &str, message: &str) -> Result<(), ExecutionError> {
        self.reserve(code.len() + message.len())?;
        self.result = Some(Err(Outcome {
            ok: false,
            code: code.into(),
            message: message.into(),
            spent: None,
            outputs: None,
            recipe_id: None,
            item_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        }));
        self.phase = Phase::Done;
        Ok(())
    }
    fn bind(&mut self, point: SurfacePoint) -> Result<(), ExecutionError> {
        let (command, guard) = movement_destination(&self.actor, &self.id, &point, &self.budget)?;
        self.storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .merge(guard)?;
        self.result = Some(Ok(command));
        self.phase = Phase::Done;
        Ok(())
    }
    fn question(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<&mut GeometryQueries, ExecutionError> {
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        self.queries = Some(GeometryQueries::new(binding));
        Ok(self.queries.as_mut().ok_or(ExecutionError::Invariant)?)
    }
    fn unseen(&mut self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let input = self.input.as_ref().ok_or(ExecutionError::Invariant)?;
        let remembered = if input.place.as_deref() == Some("last-seen") {
            core.state
                .physical
                .entities
                .get(&self.actor)
                .and_then(|e| e.actor.as_ref())
                .and_then(|a| a.agency.places.as_ref())
                .and_then(|places| {
                    places
                        .iter()
                        .find(|p| Some(&p.subject_id) == input.target_entity_id.as_ref())
                })
                .map(|p| &p.point)
        } else {
            None
        };
        if let Some(point) = remembered {
            self.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            self.bind(point.clone())
        } else {
            self.refuse(
                "target-unavailable",
                if input.place.as_deref() == Some("last-seen") {
                    "There is no remembered sighting of that to return to."
                } else {
                    "Choose something currently in view that can be reached."
                },
            )
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<InvocationStep<'a>, ExecutionError> {
        if let Some(mut answer) = answer {
            let query = self
                .queries
                .take()
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            query
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::Invariant)?;
            match self.phase {
                Phase::Sight => {
                    let sight = self.sight.take().ok_or(ExecutionError::Invariant)?;
                    let target = self
                        .input
                        .as_ref()
                        .and_then(|i| i.target_entity_id.as_deref())
                        .ok_or(ExecutionError::Invariant)?;
                    let count = sight.queries().sight.len();
                    let seen = sight
                        .finish_sight(answer.binding, &answer.sight[..count])
                        .map_err(|_| ExecutionError::Invariant)?
                        .seen(target)
                        == Some(true);
                    if !seen {
                        self.unseen(core)?;
                    } else {
                        let actor = core
                            .state
                            .physical
                            .entities
                            .get(&self.actor)
                            .ok_or(ExecutionError::MissingActor)?;
                        let target = core
                            .state
                            .physical
                            .entities
                            .get(target)
                            .ok_or(ExecutionError::MissingEntity)?;
                        let mut from = actor
                            .world_position()
                            .ok_or(ExecutionError::InvalidPosition)?;
                        from.y += actor.body_profile().interaction_height;
                        let mut goal = target
                            .world_position()
                            .ok_or(ExecutionError::InvalidPosition)?;
                        goal.y += target.body_profile().interaction_height;
                        let reach = core.state.installed.movement.interaction_radius();
                        if crate::spatial::distance(from, goal) <= reach
                            && answer.sight.last() == Some(&true)
                        {
                            self.reserve(
                                actor
                                    .supported_position()
                                    .as_ref()
                                    .and_then(HeapBytes::heap_bytes)
                                    .unwrap_or(0),
                            )?;
                            if let Some(point) = actor.supported_position() {
                                self.bind(point)?;
                            } else {
                                self.unseen(core)?;
                            }
                        } else if let Some(start) = actor.supported_position() {
                            self.reserve(
                                heap_sum([
                                    start.heap_bytes().ok_or(ExecutionError::Capacity)?,
                                    actor.body_profile().id.len(),
                                    target
                                        .supported_position()
                                        .as_ref()
                                        .map_or(Some(0), HeapBytes::heap_bytes)
                                        .ok_or(ExecutionError::Capacity)?,
                                    size_of::<RouteQuery>(),
                                ])
                                .ok_or(ExecutionError::Capacity)?,
                            )?;
                            let route = RouteQuery::Approach {
                                from: start,
                                body: actor.body_profile().into_owned(),
                                target_position: target
                                    .world_position()
                                    .ok_or(ExecutionError::InvalidPosition)?,
                                target_support: target.supported_position(),
                                reach,
                                goal,
                            };
                            self.question(core)?.routes.push(route);
                            self.phase = Phase::Route;
                        } else {
                            self.refuse(
                                "target-unavailable",
                                "Choose something currently in view that can be reached.",
                            )?;
                        }
                    }
                }
                Phase::Relative => {
                    if let Some(point) = answer.support.pop().ok_or(ExecutionError::Invariant)? {
                        self.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                        self.bind(point)?;
                    } else {
                        self.refuse("invalid-destination","That spot is not on the ground you are standing on; choose a nearer point.")?;
                    }
                }
                Phase::Route => {
                    let point = match answer.routes.pop().ok_or(ExecutionError::Invariant)? {
                        RoutePlan::Reached { mut path, .. } => path.pop(),
                        RoutePlan::Pending { mut request, .. } => {
                            if request.destinations.is_empty() {
                                None
                            } else {
                                Some(request.destinations.remove(0))
                            }
                        }
                        _ => None,
                    };
                    if let Some(point) = point {
                        self.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                        self.bind(point)?;
                    } else {
                        self.refuse(
                            "target-unavailable",
                            "Choose something currently in view that can be reached.",
                        )?;
                    }
                }
                _ => return Err(ExecutionError::InvalidCheckpoint),
            }
        }
        if matches!(self.phase, Phase::Start) {
            let input = self.input.as_ref().ok_or(ExecutionError::Invariant)?;
            let actor = core
                .state
                .physical
                .entities
                .get(&self.actor)
                .filter(|e| e.actor.is_some());
            if actor.is_none() {
                self.refuse("actor-unavailable", "The actor is unavailable.")?;
            } else if input.place.is_some() {
                let target = input
                    .target_entity_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?;
                if target == self.actor || core.state.physical.entities.get(target).is_none() {
                    self.unseen(core)?;
                } else {
                    let binding = GeometryBinding::new(
                        self.candidate,
                        core.state.installed.geometry.spatial.revision,
                        core.journal.next_provider_serial()?,
                    );
                    let sight = SightBatch::prepare(
                        &core.state.physical,
                        &core.state.installed,
                        &self.actor,
                        &[target],
                        binding,
                        &self.budget,
                    )
                    .map_err(|_| ExecutionError::Invariant)?;
                    let actor = actor.ok_or(ExecutionError::MissingActor)?;
                    let target = core
                        .state
                        .physical
                        .entities
                        .get(target)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let mut from = actor
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    from.y += actor.body_profile().interaction_height;
                    let mut to = target
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    to.y += target.body_profile().interaction_height;
                    self.reserve((sight.queries().sight.len() + 1) * size_of::<SightRay>())?;
                    let mut queries = GeometryQueries::new(binding);
                    queries.sight.extend(sight.queries().sight.iter().cloned());
                    queries.sight.push(SightRay { from, to });
                    self.sight = Some(sight);
                    self.queries = Some(queries);
                    self.phase = Phase::Sight;
                }
            } else {
                let x = input.x.ok_or(ExecutionError::Invariant)?;
                let z = input.z.ok_or(ExecutionError::Invariant)?;
                let actor = actor.ok_or(ExecutionError::MissingActor)?;
                if input.frame.as_deref() == Some("actor") {
                    let point = actor
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    let heading = actor.spatial.heading;
                    let support = match &actor.placement {
                        Some(crate::state::Placement::World {
                            support_surface_id, ..
                        }) => support_surface_id.as_deref(),
                        _ => None,
                    };
                    self.reserve(
                        support.map_or(0, str::len) + size_of::<crate::geometry::SupportQuery>(),
                    )?;
                    let support = support.map(str::to_owned);
                    self.question(core)?
                        .support
                        .push(crate::geometry::SupportQuery {
                            point,
                            surface_id: support,
                            relative: Some(crate::geometry::RelativeSupport { x, z, heading }),
                        });
                    self.phase = Phase::Relative;
                    return Ok(InvocationStep::Geometry(
                        self.queries.as_ref().ok_or(ExecutionError::Invariant)?,
                    ));
                }
                let support = input.surface_id.as_deref();
                let eps = core.state.installed.spatial.epsilon;
                let surfaces = &core.state.installed.geometry.spatial.surfaces;
                let mut selected = surfaces.iter().filter(|s| {
                    support.is_none_or(|id| id == s.id)
                        && x >= s.min_x - eps
                        && x <= s.max_x + eps
                        && z >= s.min_z - eps
                        && z <= s.max_z + eps
                });
                let first = selected.next();
                let multiple = selected.next().is_some();
                if let Some(surface) = first.filter(|_| !multiple) {
                    self.reserve(surface.id.len())?;
                    self.bind(SurfacePoint {
                        x,
                        y: surface.y
                            + (x - surface.min_x) * surface.slope_x
                            + (z - surface.min_z) * surface.slope_z,
                        z,
                        surface_id: surface.id.clone(),
                    })?;
                } else {
                    self.refuse(
                        if multiple {
                            "ambiguous-destination"
                        } else {
                            "invalid-destination"
                        },
                        if multiple {
                            "Choose the intended support or floor for these coordinates."
                        } else {
                            "No supported surface covers that destination."
                        },
                    )?;
                }
            }
        }
        if matches!(self.phase, Phase::Done) {
            return Ok(InvocationStep::Complete(BoundInvocation {
                value: self
                    .result
                    .take()
                    .ok_or(ExecutionError::InvalidCheckpoint)?,
                storage: self
                    .storage
                    .take()
                    .ok_or(ExecutionError::InvalidCheckpoint)?,
            }));
        }
        Ok(InvocationStep::Geometry(
            self.queries.as_ref().ok_or(ExecutionError::Invariant)?,
        ))
    }
}
