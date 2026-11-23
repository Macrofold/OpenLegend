//! A wakeup read is one character's actual native inputs, not a world adapter or
//! permission to execute a response. Its witness acknowledges only those inputs.
use super::*;
use crate::encoding::{json_record, json_record_len, sha256_hex};
use crate::experience::{
    PersonalSourceKind,
    intake::{IntakeSelection, unseen_intake},
};
use crate::status::{AttributeAudience, EffectBindings, project_attributes};
use serde::{Deserialize, ser::SerializeSeq};
use serde_json::value::RawValue;
mod result;
mod schedule;
pub use schedule::{NpcScheduleFacts, ScheduleBodyInput, ScheduleEvidence};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcIntakeReadRequest {
    pub actor_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub after_sequence: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer"
    )]
    pub weighed_through: Option<u64>,
    pub selection: IntakeSelection,
}
pub(crate) struct NpcIntakeCapture {
    request: NpcIntakeReadRequest,
    world: String,
    generation: String,
    life: Option<u64>,
    eligible: bool,
    semantic_causes: crate::reception::CapturedSemanticCauses,
    packets: Option<NpcIntakePackets>,
    witness: NpcIntakeWitness,
    _storage: ByteReservation,
}
struct NpcIntakeWitness {
    tokens: Vec<String>,
    dependencies: String,
    inspection: String,
    _storage: ByteReservation,
}
struct NpcIntakePackets {
    json: String,
    inputs_json: String,
    _storage: ByteReservation,
}
enum IntakeOutput {
    Witness,
    Packets,
    Schedule,
    Queue,
    QueuePacket,
}
enum PreparedIntake {
    Witness(NpcIntakeWitness),
    Trigger(NpcIntakeCapture, Option<NpcScheduleFacts>),
    Queue(NpcQueueInputs),
    QueuePacket(String, ByteReservation),
}

/// Independently held inputs for the server's resident queue. The evidence
/// tokens are moved out of their original native preparation.
pub struct NpcQueueInputs {
    pub actor_id: String,
    pub world_id: String,
    pub generation: String,
    pub accepted_cut: u64,
    pub at: f64,
    pub enrolled: bool,
    pub eligible: bool,
    pub values: Vec<String>,
    pub dependency_token: String,
    pub awareness_through: u64,
    pub urgency: f64,
    pub discovery_reservation: Option<String>,
    _storage: ByteReservation,
}
impl NpcIntakeCapture {
    pub(crate) fn matches_actor(&self, actor: &str) -> bool {
        self.request.actor_id == actor
    }
    pub(crate) fn matches_life(&self, life: Option<u64>) -> bool {
        self.life == life
    }
    pub(crate) fn semantic_causes(&self) -> &[crate::response::ResponseSemanticCause] {
        self.semantic_causes.values()
    }
    pub(crate) fn json(&self) -> Option<&str> {
        self.packets.as_ref().map(|packet| packet.json.as_str())
    }
    pub(crate) fn inputs_json(&self) -> Option<&str> {
        self.packets.as_ref().map(|packet| packet.inputs_json.as_str())
    }
    pub(crate) fn matches_queue(&self, queued: &NpcQueueInputs) -> bool {
        self.eligible
            && self.request.actor_id == queued.actor_id
            && self.world == queued.world_id
            && self.generation == queued.generation
            && self.witness.tokens == queued.values
            && self.witness.dependencies == queued.dependency_token
    }
    pub(crate) fn copy_semantic_causes_for(
        &self,
        world: &str,
        generation: &str,
        actor: &str,
        life: u64,
        budget: &ByteBudget,
    ) -> Result<(Vec<crate::response::ResponseSemanticCause>, ByteReservation), ExecutionError>
    {
        if self.world != world
            || self.generation != generation
            || self.request.actor_id != actor
            || self.life.unwrap_or(0) != life
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.semantic_causes.copy_all(budget)
    }
    /// Acknowledging a queued reason requires current evidence for this NPC.
    /// After identity, life and controller checks, rebuild the three exact
    /// witnesses from the original request's selection. This path has no
    /// outgoing packet. An earlier verdict can go stale before acknowledgement.
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if state.physical.header.id != self.world
            || state.generation != self.generation
            || !state
                .physical
                .entities
                .get(&self.request.actor_id)
                .is_some_and(|entity| {
                    entity.has_memory()
                        && entity.actor.as_ref().is_some_and(|actor| {
                            actor.alive
                                && actor.controller == "npc"
                                && actor.physical_life == self.life
                        })
                })
        {
            return Ok(false);
        }
        let PreparedIntake::Witness(current) =
            prepare(state, &self.request, IntakeOutput::Witness, budget)?
        else {
            return Err(ExecutionError::Invariant);
        };
        Ok(self.witness.tokens == current.tokens
            && self.witness.dependencies == current.dependencies
            && self.witness.inspection == current.inspection)
    }
}
struct Headers<'a>(Option<&'a crate::experience::PersonalSourceCollection>);
impl Serialize for Headers<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut out = serializer.serialize_seq(None)?;
        for record in self
            .0
            .into_iter()
            .flat_map(|collection| collection.records())
        {
            out.serialize_element(&(record.position(), &record.header().reference))?;
        }
        out.end()
    }
}
#[derive(Serialize)]
struct Reconsideration<'a> {
    key: &'a str,
    value: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Stimulus<'a> {
    source_id: &'a str,
    states: [&'a str; 4],
    since: f64,
    label: Option<crate::worlds::base_knowledge::PersonalName<'a>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EventMetadata<'a> {
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'a str,
    actor_id: Option<&'a str>,
    data: EventData<'a>,
    response_recorded: bool,
}
struct EventData<'a>(Option<&'a indexmap::IndexMap<String, crate::reception::EventScalar>>);
impl EventData<'_> {
    fn get(&self, key: &str) -> Option<&crate::reception::EventScalar> {
        self.0.and_then(|data| data.get(key))
    }

    fn text(&self, key: &str) -> Option<&str> {
        match self.get(key)? {
            crate::reception::EventScalar::Text(value) => value.as_unicode(),
            _ => None,
        }
    }

    fn number(&self, key: &str) -> Option<f64> {
        match self.get(key)? {
            crate::reception::EventScalar::Number(value) => Some(*value),
            _ => None,
        }
    }
}
impl Serialize for EventData<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut out = serializer.serialize_map(None)?;
        for key in [
            "attributeId",
            "severity",
            "definitionVersion",
            "appraisalPipeline",
            "responseId",
            "appraisalInputSequence",
            "appraisalCauseIds",
        ] {
            if let Some(value) = self.get(key) {
                out.serialize_entry(key, value)?;
            }
        }
        out.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Opportunity<'a> {
    body_inputs: &'a [Reconsideration<'a>],
    concerns: &'a [(&'a str, &'a crate::text::JsText)],
    knowledge: &'a [String],
    knowledge_revision: u64,
    mind_revision: Option<u64>,
    semantic_purpose: Option<&'a str>,
}
#[derive(Serialize)]
struct OwnRead<'a> {
    agency: AgencyRead<'a>,
    attributes: &'a [crate::reception::AttributeView],
}
struct AgencyRead<'a>(&'a crate::state::ActorAgency);
impl Serialize for AgencyRead<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        #[derive(Serialize)]
        struct Outcome<'a> {
            code: &'a str,
        }
        #[derive(Serialize)]
        struct Step<'a> {
            id: &'a str,
            status: crate::plans::StepStatus,
            outcome: Option<Outcome<'a>>,
        }
        struct Steps<'a>(&'a [crate::plans::PlanStep]);
        impl Serialize for Steps<'_> {
            fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                let mut out = s.serialize_seq(Some(self.0.len()))?;
                for step in self.0 {
                    out.serialize_element(&Step {
                        id: &step.id,
                        status: step.status,
                        outcome: step.outcome.as_ref().map(|outcome| Outcome {
                            code: &outcome.code,
                        }),
                    })?;
                }
                out.end()
            }
        }
        #[derive(Serialize)]
        struct Plan<'a> {
            id: &'a str,
            status: crate::plans::PlanStatus,
            steps: Steps<'a>,
        }
        let mut out = s.serialize_map(None)?;
        out.serialize_entry("goals", &self.0.goals)?;
        out.serialize_entry(
            "plan",
            &self.0.plan.as_ref().map(|plan| Plan {
                id: &plan.id,
                status: plan.status,
                steps: Steps(&plan.steps),
            }),
        )?;
        if let Some(reference) = &self.0.last_result_evidence {
            out.serialize_entry("lastResultEvidence", reference)?;
        }
        out.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    world_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    at: f64,
    actor_id: &'a str,
    name: &'a crate::text::JsText,
    eligible: bool,
    enrolled: bool,
    physical_life: Option<u64>,
    identity_through: u64,
    controller: &'a str,
    alive: bool,
    incapacitated: bool,
    participating: bool,
    has_memory: bool,
    cognition: bool,
    conditions: &'a Option<indexmap::IndexMap<String, crate::state::ConditionEpisode>>,
    values: &'a [String],
    dependency_token: &'a str,
    awareness_through: u64,
    urgency: f64,
    unseen: Unseen<'a>,
    own: OwnRead<'a>,
    attention: &'a RawValue,
    protection_labels: &'a [&'a str],
    actions_blocked: bool,
    speech_blocked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    semantic: Option<&'a crate::state::SemanticContinuation>,
    opportunity: Opportunity<'a>,
    stimuli: &'a [Stimulus<'a>],
    events: &'a [EventMetadata<'a>],
    prepared_result: result::PreparedResult<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Unseen<'a> {
    records: &'a [crate::experience::intake::IntakeSource<'a>],
    max_sequence: u64,
    interruptions: &'a [crate::experience::intake::IntakeSource<'a>],
    trigger_awareness: &'a [crate::experience::intake::TriggerAwareness<'a>],
}
// The persistent queue owns these facts independently of any full inspection.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InputProduct<'a> {
    world_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    at: f64,
    actor_id: &'a str,
    name: &'a crate::text::JsText,
    physical_life: Option<u64>,
    eligible: bool,
    enrolled: bool,
    controller: &'a str,
    alive: bool,
    incapacitated: bool,
    cognition: bool,
    actions_blocked: bool,
    speech_blocked: bool,
    values: &'a [String],
    dependency_token: &'a str,
    awareness_through: u64,
    urgency: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    discovery: Option<Discovery<'a>>,
}
#[derive(Serialize)]
struct Discovery<'a> {
    state: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    reservation: Option<&'a str>,
}
fn encode_inputs(
    input: &InputProduct<'_>,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let length = json_record_len(input).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let text = json_record(input).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(text.capacity())?;
    Ok((text, storage))
}
fn raw(text: &str) -> Result<&RawValue, ExecutionError> {
    serde_json::from_str(text).map_err(|_| ExecutionError::Invariant)
}
fn token(
    value: &impl Serialize,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let length = json_record_len(value).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(
        length
            .checked_mul(2)
            .and_then(|n| n.checked_add(64))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let text = json_record(value).map_err(|_| ExecutionError::Invariant)?;
    let digest = sha256_hex(text.as_bytes());
    drop(text);
    storage.resize(digest.capacity())?;
    Ok((digest, storage))
}
pub(crate) fn capture(
    state: &SimulationState,
    request: NpcIntakeReadRequest,
    budget: &ByteBudget,
) -> Result<NpcIntakeCapture, ExecutionError> {
    let PreparedIntake::Trigger(trigger, None) =
        prepare(state, &request, IntakeOutput::Packets, budget)?
    else {
        return Err(ExecutionError::Invariant);
    };
    Ok(trigger)
}

pub(crate) fn capture_schedule(
    state: &SimulationState,
    request: NpcIntakeReadRequest,
    budget: &ByteBudget,
) -> Result<(NpcIntakeCapture, NpcScheduleFacts), ExecutionError> {
    let PreparedIntake::Trigger(trigger, Some(facts)) =
        prepare(state, &request, IntakeOutput::Schedule, budget)?
    else {
        return Err(ExecutionError::Invariant);
    };
    Ok((trigger, facts))
}

/// Read only the automatic queue's compact product at this accepted cut.
pub(crate) fn capture_queue_inputs(
    state: &SimulationState,
    request: &NpcIntakeReadRequest,
    budget: &ByteBudget,
) -> Result<NpcQueueInputs, ExecutionError> {
    match prepare(state, request, IntakeOutput::Queue, budget)? {
        PreparedIntake::Queue(value) => Ok(value),
        _ => Err(ExecutionError::Invariant),
    }
}

pub(crate) fn capture_queue_packet(
    state: &SimulationState,
    request: &NpcIntakeReadRequest,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    match prepare(state, request, IntakeOutput::QueuePacket, budget)? {
        PreparedIntake::QueuePacket(text, storage) => Ok((text, storage)),
        _ => Err(ExecutionError::Invariant),
    }
}

fn prepare(
    state: &SimulationState,
    request: &NpcIntakeReadRequest,
    output: IntakeOutput,
    budget: &ByteBudget,
) -> Result<PreparedIntake, ExecutionError> {
    let id = request.actor_id.as_str();
    let entity = state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    if !entity.has_memory() || actor.controller != "npc" {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let packets = matches!(output, IntakeOutput::Packets);
    let schedule = matches!(output, IntakeOutput::Schedule);
    let full = packets || schedule;
    let unseen = unseen_intake(
        &state.experience,
        id,
        request.after_sequence,
        request.weighed_through,
        request.selection,
        &state.installed.cognition.significant_event_types,
        budget,
    )?;
    use crate::reception::AttentionReadProduct;
    let attention_output = match output {
        IntakeOutput::Packets => AttentionReadProduct::Bridge,
        IntakeOutput::Schedule => AttentionReadProduct::Schedule,
        _ => AttentionReadProduct::Cues,
    };
    let attention = crate::reception::capture_attention_read(state, id, budget, attention_output)?;
    let policy = state
        .installed
        .body_policy
        .as_ref()
        .map(|policy| &policy.value().background_thinking);
    let count = policy.map_or(0, |policy| policy.reconsideration_inputs.len());
    let current = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(id));
    let current_count = current.map_or(0, |owner| owner.current.len());
    let queue_only = matches!(output, IntakeOutput::Queue | IntakeOutput::QueuePacket);
    let reconsideration_bytes = size_of::<Reconsideration<'_>>() * if full { 2 } else { 1 };
    let bytes = count
        .checked_mul(reconsideration_bytes)
        .and_then(|n| {
            n.checked_add(current_count.checked_mul(size_of::<(&str, &str, Option<&str>)>())?)
        })
        .and_then(|n| {
            n.checked_add(
                state
                    .installed
                    .status_policy
                    .definitions
                    .len()
                    .checked_mul(size_of::<&str>())?,
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let read = state.installed.status_read(&state.physical);
    let mut reconsideration = Vec::with_capacity(count);
    let mut director_inputs = Vec::with_capacity(if full { count } else { 0 });
    if let Some(policy) = policy {
        for input in &policy.reconsideration_inputs {
            let value = read
                .evaluate(EffectBindings::for_status(id, None), &input.when)?
                .matches;
            reconsideration.push(Reconsideration {
                key: &input.key,
                value,
            });
            if input.director && full {
                director_inputs.push(Reconsideration {
                    key: &input.key,
                    value,
                });
            }
        }
    }
    let actions_blocked = state
        .installed
        .capabilities
        .capability_blocked(Some(entity), "actions")?;
    let mut protection_labels = Vec::with_capacity(state.installed.status_policy.definitions.len());
    for definition in &state.installed.status_policy.definitions {
        if entity
            .status_effects
            .as_ref()
            .and_then(|states| states.get(&definition.id))
            .is_some_and(|state| state.active)
        {
            protection_labels.push(definition.label.as_str());
        }
    }
    let _concern_ids_storage = budget.reserve(
        state
            .installed
            .attributes
            .len()
            .checked_mul(size_of::<&str>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    // read.value may briefly clone a category sample; only one sample lives
    // at a time, and its actual canonical capacity bounds that temporary.
    let _concern_value_storage = budget.reserve(
        entity
            .stored_attributes()
            .into_iter()
            .flat_map(|values| values.values())
            .try_fold(0usize, |maximum, state| {
                state
                    .value
                    .heap_bytes()
                    .map(|bytes| maximum.max(bytes))
                    .ok_or(ExecutionError::Capacity)
            })?,
    )?;
    let mut concern_ids = Vec::with_capacity(state.installed.attributes.len());
    for definition in state.installed.attributes.values() {
        let definition = definition.value();
        if !definition
            .concern
            .as_ref()
            .is_some_and(|concern| concern.reconsider)
        {
            continue;
        }
        if let Some(value) = read.value(id, &definition.id)? {
            if crate::status::attribute_concern_active(entity, definition, &value)? {
                concern_ids.push(definition.id.as_str());
            }
        }
    }
    let scope = CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        id,
    )?;
    let mut classifications = Vec::with_capacity(current_count);
    if let Some(scope) = &scope {
        for source in scope.state().current.keys() {
            if source == id {
                continue;
            }
            if let Some(body) = scope.native_body(source)? {
                if let Some(crate::received::ReceivedValueFragment::Body(value)) =
                    match &body.field.value.reference {
                        crate::received::ReceivedValueReference::Inline(value) => {
                            Some(value.as_ref())
                        }
                        crate::received::ReceivedValueReference::Shared(id) => state
                            .reception
                            .received_values
                            .as_ref()
                            .and_then(|values| values.shared_value(id)),
                    }
                {
                    classifications.push((
                        source.as_str(),
                        value.body.kind.as_str(),
                        value.body.subtype.as_deref(),
                    ));
                }
            }
        }
    }
    classifications.sort_unstable_by(|a, b| crate::encoding::js_property_cmp(a.0, b.0));
    let goal_bytes = actor
        .agency
        .goals
        .iter()
        .try_fold(0usize, |n, goal| {
            n.checked_add(goal.objective.storage_bytes())
                .and_then(|n| n.checked_add(4))
        })
        .ok_or(ExecutionError::Capacity)?;
    let goal_storage = budget.reserve(goal_bytes)?;
    let goal = crate::text::JsText::join(
        actor
            .agency
            .goals
            .iter()
            .filter(|goal| goal.status == "active")
            .map(|goal| &goal.objective),
        "; ",
    );
    let mut token_storage = budget.reserve(21 * size_of::<String>() + 64)?;
    let mut tokens = Vec::with_capacity(21);
    macro_rules! add {
        ($value:expr) => {{
            let (text, storage) = token(&$value, budget)?;
            token_storage.merge(storage)?;
            tokens.push(text);
        }};
    }
    add!(actor.controller);
    add!(actor.incapacitated);
    add!(goal);
    add!(actor.agency.plan.as_ref().map(|plan| plan.revision));
    add!((actions_blocked, &protection_labels));
    add!(actor.conditions);
    add!(entity.inventory_revision);
    add!(reconsideration);
    struct AttributePins<'a>(
        &'a indexmap::IndexMap<
            String,
            crate::install::VerifiedDefinition<crate::status::AttributeDefinition>,
        >,
    );
    impl Serialize for AttributePins<'_> {
        fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            let mut out = s.serialize_seq(Some(self.0.len()))?;
            for definition in self.0.values() {
                out.serialize_element(definition.pin())?;
            }
            out.end()
        }
    }
    add!((
        state.installed.manifest.revision,
        state
            .installed
            .body_policy
            .as_ref()
            .map(|policy| policy.pin()),
        AttributePins(&state.installed.attributes)
    ));
    add!(actions_blocked);
    add!(concern_ids);
    add!(Classifications(&classifications, false));
    add!(Classifications(&classifications, true));
    struct Recipes<'a>(&'a crate::install::RetainedMap);
    impl Serialize for Recipes<'_> {
        fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            let mut out = s.serialize_seq(Some(self.0.len()))?;
            for row in self.0.entries() {
                out.serialize_element(&row)?;
            }
            out.end()
        }
    }
    add!(Recipes(&state.installed.retained.recipes));
    for kind in [
        PersonalSourceKind::Memory,
        PersonalSourceKind::Awareness,
        PersonalSourceKind::Summary,
    ] {
        add!(Headers(state.experience.optional_collection(id, kind)?));
    }
    let inner = state
        .minds
        .inner_worlds
        .as_ref()
        .and_then(|owners| owners.get(id));
    add!(inner);
    add!(&*state.installed.cognition);
    let cue_token_storage = budget.reserve(attention.cue_inputs_token.len())?;
    tokens.push(attention.cue_inputs_token.clone());
    token_storage.merge(cue_token_storage)?;
    add!(actor.agency.semantic.as_ref().map(|semantic| (
        semantic.interval,
        &semantic.discovery,
        &semantic.occupied_purpose
    )));
    let (dependencies, dependency_storage) = token(
        &(
            state.installed.geometry.spatial.revision,
            state
                .reception
                .knowledge_revisions
                .as_ref()
                .and_then(|owners| owners.get(id)),
            state.appraisals.content_witness(id),
            state.minds.minds.as_ref().and_then(|owners| owners.get(id)),
            &state.installed.status_policy.revision,
            state.experience.actor(id).map(|history| {
                (
                    history.privacy.forgotten_ids(),
                    history.privacy.corrections(),
                    history.privacy.revision(),
                )
            }),
        ),
        budget,
    )?;
    token_storage.merge(dependency_storage)?;
    let enrolled = actor.alive
        && state
            .minds
            .minds
            .as_ref()
            .is_some_and(|minds| minds.contains_key(id));
    if matches!(output, IntakeOutput::Queue) {
        let world_id = &state.physical.header.id;
        let generation = &state.generation;
        let reservation = actor.agency.semantic.as_ref().and_then(|semantic| {
            (semantic.discovery == "reserved")
                .then_some(semantic.reservation.as_deref())
                .flatten()
        });
        let storage = [
            world_id.len(),
            generation.len(),
            id.len(),
            reservation.map_or(0, str::len),
        ]
        .into_iter()
        .try_fold(size_of::<NpcQueueInputs>(), usize::checked_add)
        .ok_or(ExecutionError::Capacity)?;
        token_storage.merge(budget.reserve(storage)?)?;
        return Ok(PreparedIntake::Queue(NpcQueueInputs {
            actor_id: id.to_owned(),
            world_id: world_id.clone(),
            generation: generation.clone(),
            accepted_cut: state.accepted_cut,
            at: state.physical.header.sim_time,
            enrolled,
            eligible: enrolled && !actor.incapacitated,
            values: tokens,
            dependency_token: dependencies,
            awareness_through: unseen.awareness_through,
            urgency: unseen.urgency,
            discovery_reservation: reservation.map(str::to_owned),
            _storage: token_storage,
        }));
    }
    let input = InputProduct {
        world_id: &state.physical.header.id,
        generation: &state.generation,
        accepted_cut: state.accepted_cut,
        at: state.physical.header.sim_time,
        actor_id: id,
        name: &entity.name,
        physical_life: actor.physical_life,
        eligible: enrolled && !actor.incapacitated,
        enrolled,
        controller: &actor.controller,
        alive: actor.alive,
        incapacitated: actor.incapacitated,
        cognition: actor
            .capabilities
            .as_ref()
            .map_or(actor.controller != "native", |c| c.cognition),
        actions_blocked,
        speech_blocked: state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "speech")?,
        values: &tokens,
        dependency_token: &dependencies,
        awareness_through: unseen.awareness_through,
        urgency: unseen.urgency,
        discovery: actor.agency.semantic.as_ref().map(|semantic| Discovery {
            state: &semantic.discovery,
            reservation: semantic.reservation.as_deref(),
        }),
    };
    if queue_only {
        let (text, storage) = encode_inputs(&input, budget)?;
        return Ok(PreparedIntake::QueuePacket(text, storage));
    }

    // The ordinary reader still needs this installed plan shape for the
    // prepared-result semantics. A witness cannot bless a new shape.
    if actor
        .agency
        .plan
        .as_ref()
        .is_some_and(|plan| plan.activity.is_some())
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let _event_storage = budget.reserve(
        unseen
            .records
            .len()
            .checked_mul(size_of::<EventMetadata<'_>>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut events = Vec::with_capacity(unseen.records.len());
    for source in &unseen.records {
        if let Some(original) = source.event_id.and_then(|event| {
            state
                .occurrences
                .hot()
                .find(|hot| hot.event().event().id == event)
        }) {
            let event = original.event().event();
            let response_recorded = event.data.as_ref().and_then(|data| data.get("responseId")).is_some_and(|value| matches!(value, crate::reception::EventScalar::Text(id) if id.as_unicode().is_some_and(|id| state.responses.get(id).is_some())));
            events.push(EventMetadata {
                id: &event.id,
                kind: &event.event_type,
                actor_id: event.actor_id.as_deref(),
                data: EventData(event.data.as_ref()),
                response_recorded,
            });
        }
    }
    // Acknowledgement protects the current resolved causes and exact receipt
    // metadata. It never needs private wording or an outgoing attention view.
    let (inspection, inspection_storage) = token(
        &(
            actor.agency.semantic.as_ref().map(|state| &state.resolved),
            &events,
        ),
        budget,
    )?;
    token_storage.merge(inspection_storage)?;
    if matches!(output, IntakeOutput::Witness) {
        return Ok(PreparedIntake::Witness(NpcIntakeWitness {
            tokens,
            dependencies,
            inspection,
            _storage: token_storage,
        }));
    }

    let attributes = project_attributes(
        entity,
        &state.installed.attributes,
        state.physical.pending_values.as_ref(),
        AttributeAudience::Owner,
        budget,
    )?;
    let visible_count = [
        &state.reception.visible_people,
        &state.reception.visible_objects,
    ]
    .into_iter()
    .filter_map(|root| root.as_ref().and_then(|root| root.get(id)))
    .map(Vec::len)
    .sum::<usize>();
    let presentation_bytes = visible_count
        .checked_mul(size_of::<Stimulus<'_>>())
        .and_then(|n| {
            n.checked_add(
                attributes
                    .rows()
                    .len()
                    .checked_mul(size_of::<(&str, &crate::text::JsText)>())?,
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let _presentation_storage = budget.reserve(presentation_bytes)?;
    let mut concerns = Vec::with_capacity(attributes.rows().len());
    for attribute in attributes.rows() {
        if state
            .installed
            .attributes
            .get(&attribute.id)
            .is_some_and(|definition| {
                definition
                    .value()
                    .concern
                    .as_ref()
                    .is_some_and(|concern| concern.reconsider)
            })
        {
            if let Some(text) = &attribute.concern {
                concerns.push((attribute.id.as_str(), text));
            }
        }
    }
    // Only the old bridge publishes this structured label. The Rust
    // scheduler's literal review wording never consumed that object.
    let names = packets
        .then(|| InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            id,
        ))
        .transpose()?;
    let _stimulus_index_storage = budget.reserve(
        crate::host::retained_size::tree_node_bound::<&str, f64>()
            .and_then(|n| {
                crate::host::retained_size::tree_node_bound::<&str, ()>()
                    .and_then(|wanted| n.checked_add(wanted))
            })
            .and_then(|n| n.checked_mul(visible_count))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let wanted = [
        &state.reception.visible_people,
        &state.reception.visible_objects,
    ]
    .into_iter()
    .filter_map(|root| root.as_ref().and_then(|root| root.get(id)))
    .flatten()
    .map(String::as_str)
    .collect::<std::collections::BTreeSet<_>>();
    let mut changed_at = std::collections::BTreeMap::new();
    for record in state
        .experience
        .optional_collection(id, PersonalSourceKind::Awareness)?
        .into_iter()
        .flat_map(|collection| collection.records())
        .rev()
    {
        let header = record.header();
        if header.event_type.as_deref() != Some("encounter")
            || header.outward_change.as_deref() != Some("detail")
        {
            continue;
        }
        if let Some(target) = header
            .evidence_target_id
            .as_deref()
            .filter(|id| wanted.contains(id))
        {
            changed_at.entry(target).or_insert(header.at);
        }
        if changed_at.len() == wanted.len() {
            break;
        }
    }
    let mut stimuli = Vec::with_capacity(visible_count);
    for source in [
        &state.reception.visible_people,
        &state.reception.visible_objects,
    ]
    .into_iter()
    .filter_map(|root| root.as_ref().and_then(|root| root.get(id)))
    .flatten()
    {
        let Some(subject) = state.physical.entities.get(source) else {
            continue;
        };
        let seen = state
            .reception
            .perception_episodes
            .as_ref()
            .and_then(|owners| owners.get(id))
            .and_then(|episodes| episodes.get(source))
            .and_then(|episode| episode.split(':').nth(1))
            .and_then(|at| at.parse::<f64>().ok())
            .filter(|at| at.is_finite())
            .unwrap_or(state.physical.header.sim_time);
        // Source uses the latest resident detail notice, never hidden clocks.
        let changed = changed_at.get(source.as_str()).copied().unwrap_or(seen);
        stimuli.push(Stimulus {
            source_id: source,
            states: state
                .installed
                .observation_rules
                .value()
                .outward_states(subject),
            since: seen.max(changed),
            label: names.as_ref().map(|names| names.observer_name(source)).transpose()?,
        });
    }
    let (prepared_result, _result_storage) = result::capture(state, actor, id, budget)?;
    let mut opportunity = Opportunity {
        body_inputs: &director_inputs,
        concerns: &concerns,
        knowledge: state.learned_capabilities.known_recipes(id),
        knowledge_revision: state
            .reception
            .knowledge_revisions
            .as_ref()
            .and_then(|owners| owners.get(id))
            .copied()
            .unwrap_or(0),
        mind_revision: inner.map(|inner| inner.revision),
        semantic_purpose: None,
    };
    let storage = [
        state.physical.header.id.len(),
        state.generation.len(),
        request.actor_id.len(),
    ]
    .into_iter()
    .try_fold(size_of::<NpcIntakeCapture>(), usize::checked_add)
    .ok_or(ExecutionError::Capacity)?;
    let trigger_storage = budget.reserve(storage)?;
    let new_trigger = |packets, tokens, dependencies, semantic_causes| NpcIntakeCapture {
        request: request.clone(),
        world: state.physical.header.id.clone(),
        generation: state.generation.clone(),
        life: actor.physical_life,
        eligible: enrolled && !actor.incapacitated,
        semantic_causes,
        packets,
        witness: NpcIntakeWitness {
            tokens,
            dependencies,
            inspection,
            _storage: token_storage,
        },
        _storage: trigger_storage,
    };
    if schedule {
        let facts = schedule::capture(
            schedule::Inputs {
                actor_id: id,
                accepted_cut: state.accepted_cut,
                at: state.physical.header.sim_time,
                actor,
                unseen: &unseen,
                events: &events,
                reflection_events: state
                    .installed
                    .cognition
                    .reflection
                    .then_some(state.installed.cognition.significant_event_types.as_slice()),
                stimuli: &stimuli,
                actions_blocked,
                protection_labels: &protection_labels,
                opportunity,
                result: prepared_result,
                has_unpresented_description: attention.has_unpresented_description,
            },
            goal,
            goal_storage,
            budget,
        )?;
        let trigger = new_trigger(None, tokens, dependencies, attention.semantic_causes);
        return Ok(PreparedIntake::Trigger(trigger, Some(facts)));
    }
    drop(goal);
    drop(goal_storage);
    let purpose_bytes = actor
        .agency
        .plan
        .as_ref()
        .map_or(0, |plan| plan.id.len())
        .max(actor.action.as_ref().map_or(0, |action| action.id.len()))
        .checked_mul(6)
        .and_then(|n| n.checked_add(64))
        .ok_or(ExecutionError::Capacity)?;
    let _purpose_storage = budget.reserve(purpose_bytes)?;
    let purpose = crate::execution::occupied_purpose(actor)?;
    opportunity.semantic_purpose = purpose.as_deref();
    let product = Product {
        world_id: input.world_id,
        generation: input.generation,
        accepted_cut: input.accepted_cut,
        at: input.at,
        actor_id: input.actor_id,
        name: input.name,
        eligible: input.eligible,
        enrolled: input.enrolled,
        physical_life: input.physical_life,
        identity_through: state.physical.identity.next_id(),
        controller: input.controller,
        alive: input.alive,
        incapacitated: input.incapacitated,
        participating: entity.actively_participates(),
        has_memory: entity.has_memory(),
        cognition: input.cognition,
        conditions: &actor.conditions,
        values: input.values,
        dependency_token: input.dependency_token,
        awareness_through: input.awareness_through,
        urgency: input.urgency,
        unseen: Unseen {
            records: &unseen.records,
            max_sequence: unseen.max_sequence,
            interruptions: &unseen.interruptions,
            trigger_awareness: &unseen.trigger_awareness,
        },
        own: OwnRead {
            agency: AgencyRead(&actor.agency),
            attributes: attributes.rows(),
        },
        attention: raw(
            &attention
                .bridge
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .json,
        )?,
        protection_labels: &protection_labels,
        actions_blocked: input.actions_blocked,
        speech_blocked: input.speech_blocked,
        semantic: actor.agency.semantic.as_ref(),
        opportunity,
        stimuli: &stimuli,
        events: &events,
        prepared_result,
    };
    let (inputs_json, inputs_storage) = encode_inputs(&input, budget)?;
    let length = json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(length.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let json = json_record(&product).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(json.capacity())?;
    storage.merge(inputs_storage)?;
    Ok(PreparedIntake::Trigger(
        new_trigger(Some(NpcIntakePackets {
            json,
            inputs_json,
            _storage: storage,
        }), tokens, dependencies, attention.semantic_causes),
        None,
    ))
}
struct Classifications<'a>(&'a [(&'a str, &'a str, Option<&'a str>)], bool);
impl Serialize for Classifications<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut out = s.serialize_seq(Some(self.0.len()))?;
        for (id, kind, subtype) in self.0 {
            if self.1 {
                out.serialize_element(&(kind, subtype))?;
            } else {
                out.serialize_element(id)?;
            }
        }
        out.end()
    }
}
