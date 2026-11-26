//! An invocation binds an issued selection to an ordinary NPC command. Fresh sight and the shared
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
impl Input {
    fn valid_ordinary(&self, world: &crate::simulation::InstalledWorld) -> bool {
        if self.parameters.is_some()
            || self.x.is_some()
            || self.z.is_some()
            || self.surface_id.is_some()
            || self.frame.is_some()
            || self.place.is_some()
        {
            return false;
        }
        let target = self
            .target_entity_id
            .as_deref()
            .is_some_and(is_safe_record_id);
        let item = self.item_id.as_deref().is_some_and(is_safe_record_id);
        if self.family == "follow" {
            let rule = &world.occurrence_rules.value().response.offers.follow;
            return target
                && self.item_id.is_none()
                && self.quantity.is_none()
                && self.distance.is_none_or(|n| {
                    n.is_finite() && (rule.minimum_distance..=rule.maximum_distance).contains(&n)
                })
                && self
                    .relation
                    .as_deref()
                    .is_none_or(|v| matches!(v, "near" | "behind" | "beside" | "left" | "right"))
                && self
                    .on_lost
                    .as_deref()
                    .is_none_or(|v| matches!(v, "stop" | "last-seen"))
                && self.until.as_ref().is_none_or(|v| {
                    v.as_str()
                        .is_some_and(|name| world.status_policy.named_times.contains_key(name))
                });
        }
        if self.distance.is_some()
            || self.relation.is_some()
            || self.on_lost.is_some()
            || self.until.is_some()
            || self
                .quantity
                .as_ref()
                .is_some_and(|q| q.as_u64().is_none_or(|n| !(1..=999).contains(&n)))
        {
            return false;
        }
        match self.family.as_str() {
            "pickup" => target && (item || self.item_id.is_none() && self.quantity.is_none()),
            "drop" => self.target_entity_id.is_none() && item,
            _ => false,
        }
    }
}

/// All response commands pass the native command decoder with an NPC actor.
/// No player control or human-initiated authority is implied by this encoding.
fn decode_command(value: &serde_json::Value) -> Result<NativeCommand, ExecutionError> {
    crate::encoding::json_value(value)
        .and_then(|json| serde_json::from_str(&json))
        .map_err(|_| ExecutionError::InvalidCheckpoint)
}

pub(crate) enum SelectedInvocation {
    Command(NativeCommand),
    Work(crate::plans::RequestedActivityInput, ByteReservation),
}
pub(crate) struct BoundInvocation {
    value: Result<SelectedInvocation, Outcome>,
    storage: ByteReservation,
}
impl BoundInvocation {
    pub(crate) fn into_parts(self) -> (Result<SelectedInvocation, Outcome>, ByteReservation) {
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
    result: Option<Result<SelectedInvocation, Outcome>>,
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
        let valid = result
            .input
            .as_ref()
            .is_some_and(|v| match v.family.as_str() {
                "move" => valid_move(
                    v,
                    core.state.installed.actor_response_limits.invocation.offset,
                ),
                "follow" | "pickup" | "drop" => v.valid_ordinary(&core.state.installed),
                _ => false,
            });
        if let Some(input) = result
            .input
            .as_ref()
            .filter(|input| input.parameters.is_some())
        {
            let form = core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .offers
                .installed_requests
                .iter()
                .find(|f| f.id == input.family);
            let navigation = input.x.is_some()
                || input.z.is_some()
                || input.surface_id.is_some()
                || input.frame.is_some()
                || input.place.is_some()
                || input.target_entity_id.is_some()
                || input.distance.is_some()
                || input.relation.is_some()
                || input.on_lost.is_some()
                || input.until.is_some()
                || input.item_id.is_some()
                || input.quantity.is_some();
            let command = if let Some((form, args)) =
                form.filter(|_| !navigation).zip(input.parameters.as_ref())
            {
                use crate::worlds::base_request_forms as forms;
                if forms::work::supports(&form.id) {
                    forms::compile_work(core.state, actor, id, form, args, budget)?
                        .map(|(work, storage)| SelectedInvocation::Work(work, storage))
                } else {
                    forms::compile(core.state, actor, id, form, args, budget)
                        .map(SelectedInvocation::Command)
                }
            } else {
                None
            };
            if let Some(command) = command {
                result.result = Some(Ok(command));
                result.phase = Phase::Done;
            } else {
                result.refuse(
                    "unavailable",
                    "This installed activity or its selected arguments are unavailable here.",
                )?;
            }
        } else if !valid {
            result.refuse(
                "invalid-invocation",
                "Action arguments do not match an available capability.",
            )?;
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
    fn ordinary(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let input = self.input.as_ref().ok_or(ExecutionError::Invariant)?;
        let state = &core.state;
        let actor = state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let mut command =
            serde_json::json!({"id":self.id,"actorId":self.actor,"type":input.family});
        match input.family.as_str() {
            "drop" => {
                let item = input.item_id.as_deref().ok_or(ExecutionError::Invariant)?;
                let Some(owned) = crate::install::owned_by(
                    &state.physical,
                    &state.installed.retained,
                    &self.actor,
                    item,
                )?
                else {
                    return self.refuse("target-unavailable", "Choose something you are carrying.");
                };
                let quantity = input
                    .quantity
                    .as_ref()
                    .and_then(SqlCell::as_u64)
                    .unwrap_or(owned.quantity);
                if let Some(reason) = core.check_drop_item(&self.actor, item, quantity)? {
                    let reason = reason.to_owned();
                    return self.refuse("unavailable", &reason);
                }
                command["itemId"] = item.into();
                command["quantity"] = quantity.into();
            }
            "pickup" => {
                let target = input
                    .target_entity_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?;
                let quantity = input.quantity.as_ref().and_then(SqlCell::as_u64);
                let available =
                    crate::ground_items::pickup_pile(state, actor, target).is_some_and(|pile| {
                        crate::ground_items::can_pick_up(
                            state,
                            pile,
                            input.item_id.as_deref(),
                            quantity,
                        )
                    });
                if !available {
                    return self.refuse(
                        "target-unavailable",
                        "Choose a visible pile and portable items in it.",
                    );
                }
                command["targetId"] = target.into();
                if let Some(item) = &input.item_id {
                    command["itemId"] = item.as_str().into();
                }
                if let Some(quantity) = quantity {
                    command["quantity"] = quantity.into();
                }
            }
            "follow" => {
                let target = input
                    .target_entity_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?;
                let body = state
                    .physical
                    .entities
                    .get(target)
                    .filter(|e| e.actor.as_ref().is_some_and(|a| a.alive));
                let Some(life) = body.and_then(|e| e.physical_life()) else {
                    return self.refuse(
                        "target-unavailable",
                        "Choose a living person currently in view.",
                    );
                };
                command["targetId"] = target.into();
                command["targetLife"] = life.into();
                if let Some(distance) = input.distance {
                    command["distance"] = distance.into();
                }
                if let Some(relation) = input.relation.as_deref().filter(|r| *r != "near") {
                    command["relation"] = relation.into();
                }
                if input.on_lost.as_deref() == Some("last-seen") {
                    command["onLost"] = "last-seen".into();
                }
                if let Some(hour) = input
                    .until
                    .as_ref()
                    .and_then(SqlCell::as_str)
                    .and_then(|n| state.installed.status_policy.named_times.get(n))
                {
                    let now = state.physical.header.sim_time;
                    let local = crate::time::local_clock::local_hour(
                        now,
                        state.installed.status_policy.clock_offset_hours,
                    );
                    command["until"] = (now
                        + crate::time::local_clock::daily_boundary(local, *hour, *hour, 0.))
                    .into();
                }
            }
            _ => return Err(ExecutionError::Invariant),
        }
        self.result = Some(Ok(SelectedInvocation::Command(decode_command(&command)?)));
        self.phase = Phase::Done;
        Ok(())
    }
    fn bind(&mut self, point: SurfacePoint) -> Result<(), ExecutionError> {
        let (command, guard) = movement_destination(&self.actor, &self.id, &point, &self.budget)?;
        self.storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .merge(guard)?;
        self.result = Some(Ok(SelectedInvocation::Command(command)));
        self.phase = Phase::Done;
        Ok(())
    }
    fn question(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<&mut GeometryQueries, ExecutionError> {
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.geometry_revision(),
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
                    } else if self
                        .input
                        .as_ref()
                        .is_some_and(|input| input.family != "move")
                    {
                        self.ordinary(core)?;
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
            } else if input.family == "drop" {
                self.ordinary(core)?;
            } else if input.place.is_some() || matches!(input.family.as_str(), "pickup" | "follow")
            {
                let target = input
                    .target_entity_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?;
                if target == self.actor || core.state.physical.entities.get(target).is_none() {
                    self.unseen(core)?;
                } else {
                    let binding = GeometryBinding::new(
                        self.candidate,
                        core.state.geometry_revision(),
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
                    let approach = if input.family == "move" {
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
                        let mut to = target
                            .world_position()
                            .ok_or(ExecutionError::InvalidPosition)?;
                        from.y += actor.body_profile().interaction_height;
                        to.y += target.body_profile().interaction_height;
                        Some(SightRay { from, to })
                    } else {
                        None
                    };
                    self.reserve(
                        (sight.queries().sight.len() + usize::from(approach.is_some()))
                            * size_of::<SightRay>(),
                    )?;
                    let mut queries = GeometryQueries::new(binding);
                    queries.sight.extend(sight.queries().sight.iter().cloned());
                    queries.sight.extend(approach);
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
                match installed_coordinate(&core.state.installed, x, z, input.surface_id.as_deref())
                {
                    Ok((surface, y)) => {
                        self.reserve(surface.len())?;
                        self.bind(SurfacePoint {
                            x,
                            y,
                            z,
                            surface_id: surface.into(),
                        })?;
                    }
                    Err(reason) => self.refuse(reason.code, reason.message)?,
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

/// Exact refusals from the shared installed support selector.
pub struct CoordinateRefusal {
    pub code: &'static str,
    pub message: &'static str,
}

/// Read the exact installed floor for a typed x/z point. The borrowed surface
/// keeps allocation and ordinary route admission with its actual caller.
pub(crate) fn installed_coordinate<'a>(
    installed: &'a crate::simulation::InstalledWorld,
    x: f64,
    z: f64,
    support: Option<&str>,
) -> Result<(&'a str, f64), CoordinateRefusal> {
    let eps = installed.spatial.epsilon;
    let mut selected = installed
        .geometry
        .spatial
        .surfaces
        .iter()
        .filter(|surface| {
            support.is_none_or(|id| id == surface.id)
                && x >= surface.min_x - eps
                && x <= surface.max_x + eps
                && z >= surface.min_z - eps
                && z <= surface.max_z + eps
        });
    let first = selected.next();
    if selected.next().is_some() {
        return Err(CoordinateRefusal {
            code: "ambiguous-destination",
            message: "Choose the intended support or floor for these coordinates.",
        });
    }
    let surface = first.ok_or(CoordinateRefusal {
        code: "invalid-destination",
        message: "No supported surface covers that destination.",
    })?;
    Ok((
        &surface.id,
        surface.y + (x - surface.min_x) * surface.slope_x + (z - surface.min_z) * surface.slope_z,
    ))
}
