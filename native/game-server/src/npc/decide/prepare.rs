use super::{Work, ensure_running};
use crate::{
    boot::CurrentServer,
    decision_dispatch::CallFailure,
    decision_render::{BoundSchema, OfferedAction, PreparedPrompt, ResponseReferences},
    world::WorldError,
};
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound, sha256_hex},
    experience::{AwarenessSourceBody, PersonalSourceKind, PersonalSourceRef},
    host::{ByteBudget, ByteReservation, CapacityError},
    narration::{NameArticle, NativeText, name_phrase, native_text},
    reception::{KnowledgeDocument, SpeechAddressing, SpeechParticipant},
    records::SqlCell,
    runtime::{RuntimeError, RuntimeJson, RuntimeNpcRead, RuntimeNpcResponseTicket},
    state::{CharacterTrait, Goal, Named, Point},
    text::JsText,
    values::deserialize_present_safe_integer,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json, value::RawValue};
use std::{borrow::Cow, collections::HashMap, fmt::Write as _, sync::Arc};

mod recall;
pub(super) use openlegend_simulation::runtime::RuntimeNpcDecisionFrame as ReceivedFrame;
pub(super) use recall::{Collected, RecallReview, collect};

#[derive(Clone, Copy)]
enum ProjectionPurpose {
    Recall,
    Decision,
}

struct FundedPreparation<T> {
    value: T,
    _custody: ByteReservation,
}

type PersonalSources = FundedPreparation<PersonalPacket>;
type CurrentRead = FundedPreparation<CurrentFacts>;

/// Current formatter fields only. The fresh native capture also carries
/// private history and response-validity products that this caller never uses.
#[derive(Deserialize)]
struct CurrentFacts {
    #[serde(rename = "self")]
    own: CurrentActor,
    perception: CurrentPerception,
    appraisals: Option<CurrentAppraisals>,
    candidates: Option<Value>,
    recall: Option<Value>,
}

/// Decode only what enters the prompt. Private thoughts, for example, can
/// remain on the original capture even when their text is valid only in UTF-16.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurrentActor {
    actor_id: String,
    accepted_cut: u64,
    at: f64,
    identity: CurrentIdentity,
    observer_name: Named,
    position: Point,
    heading: f64,
    support_surface_id: Option<String>,
    attributes: Vec<Value>,
    action_status_labels: Vec<String>,
    action: Option<CurrentAction>,
    speech: bool,
    npc: Option<CurrentNpc>,
    agency: Option<CurrentAgency>,
    mind: Option<CurrentMind>,
    knowledge: Option<CurrentKnowledge>,
}

#[derive(Deserialize)]
struct CurrentIdentity {
    species: Option<String>,
    traits: Option<Vec<CharacterTrait>>,
}

#[derive(Deserialize)]
struct CurrentAction {
    #[serde(rename = "type")]
    kind: String,
}

#[derive(Deserialize)]
struct CurrentNpc {
    expressions: bool,
}

#[derive(Deserialize)]
struct CurrentAgency {
    goals: Vec<Goal>,
    plan: Option<CurrentPlan>,
    attempts: Box<RawValue>,
}

#[derive(Deserialize)]
struct CurrentPlan {
    revision: u64,
}

#[derive(Deserialize)]
struct CurrentMind {
    documents: Vec<CurrentDocument>,
}

#[derive(Deserialize)]
struct CurrentDocument {
    id: String,
    text: JsText,
}

#[derive(Deserialize)]
struct CurrentKnowledge {
    general: Option<KnowledgeDocument>,
}

#[derive(Deserialize)]
struct CurrentAppraisals {
    values: Vec<Value>,
    names: Vec<AppraisalName>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppraisalName {
    entity_id: String,
    name: Named,
}

#[derive(Deserialize)]
struct CurrentPerception {
    bodies: Vec<CurrentBody>,
    cut: Option<CurrentCut>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurrentBody {
    source_id: String,
    lease_id: String,
    physical_life: Option<u64>,
    name: Option<Named>,
    first: Option<usize>,
    count: Option<usize>,
}

#[derive(Deserialize)]
struct CurrentCut {
    current: Vec<CurrentFacet>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurrentFacet {
    value: CurrentSensation,
    value_measured_from: f64,
    value_measured_through: f64,
    value_acquired_at: f64,
    confirmed_through: f64,
}

#[derive(Deserialize)]
struct CurrentSensation {
    body: Option<SeenBody>,
}

#[derive(Deserialize)]
struct SeenBody {
    position: Point,
    description: Option<JsText>,
    outward: [String; 4],
}

// The exact leased source and grant ordinals stay with the native ticket.
// Decode only the permitted metadata and prose consumed by the formatter.
#[derive(Deserialize)]
struct PersonalPacket {
    ordinal: usize,
    inventory: PersonalInventory,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersonalInventory {
    personal: Vec<PersonalSource>,
    unavailable_personal: Vec<usize>,
}

#[derive(Deserialize)]
struct PersonalSource {
    selection: usize,
    reference: PersonalSourceRef,
    value: PersonalFacts,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersonalFacts {
    event_id: Option<String>,
    event_type: Option<String>,
    modality: Option<String>,
    trigger_kind: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_safe_integer")]
    sequence: Option<u64>,
    at: Option<f64>,
    to: Option<f64>,
    source_body: Option<AwarenessSourceBody>,
    speech: Option<PersonalSpeech>,
    text: Option<NativeText>,
    content: Option<NativeText>,
    summary: Option<JsText>,
}

#[derive(Deserialize)]
struct PersonalSpeech {
    speaker: Option<SpeechParticipant>,
    addressee: Option<SpeechParticipant>,
    addressing: Option<SpeechAddressing>,
}

impl<T: DeserializeOwned> FundedPreparation<T> {
    /// Fund the independent decoded presentation graph before parsing the
    /// packet. The caller's output and the native evidence have separate guards.
    fn read(packet: &RuntimeJson, budget: &ByteBudget) -> Result<Self, CallFailure> {
        let text = std::str::from_utf8(packet.bytes()).map_err(invalid)?;
        let bound = json_tree_allocation_bound(text).ok_or_else(|| capacity(CapacityError))?;
        let custody = budget.reserve(bound).map_err(capacity)?;
        Ok(Self {
            value: serde_json::from_str(text).map_err(invalid)?,
            _custody: custody,
        })
    }
}

pub(super) struct Prepared {
    pub(super) through: u64,
    pub(super) addressed: bool,
    pub(super) speech_trigger: bool,
    pub(super) route: PreparedPrompt,
    pub(super) context: Projection,
    pub(super) ticket: Arc<RuntimeNpcResponseTicket>,
    pub(super) frame: ReceivedFrame,
    _projection: ByteReservation,
}

pub(super) struct Projection {
    pub(super) fields: Value,
    pub(super) offers: Vec<NativeOffer>,
    refs: Vec<String>,
    physical: Vec<String>,
    attention: Vec<String>,
    speaks: bool,
    expressions: bool,
    pub(super) preview_player: Option<String>,
}

pub(super) struct NativeOffer {
    pub(super) id: String,
    pub(super) caption: String,
    pub(super) no_intervention: bool,
    pub(super) transition: String,
}

impl Projection {
    pub(super) fn render_response(
        &self,
        game: &CurrentServer,
        selected: &[&NativeOffer],
        include_actions: bool,
    ) -> Result<(PreparedPrompt, BoundSchema), CallFailure> {
        let budget = game.host.budget();
        let offered = selected
            .iter()
            .map(|offer| OfferedAction {
                id: &offer.id,
                description: &offer.caption,
            })
            .collect::<Vec<_>>();
        let aliases = selected
            .iter()
            .map(|offer| offer.id.clone())
            .collect::<Vec<_>>();
        let fields = self.fields.as_object().ok_or(CallFailure::Invalid)?;
        let prompt = game
            .cognition
            .prompt(fields, &offered, include_actions, budget)
            .map_err(invalid)?;
        let schema = game
            .cognition
            .response_schema(
                self.speaks,
                self.expressions,
                true,
                &ResponseReferences {
                    entity: &self.refs,
                    action: &aliases,
                    knowledge: &[],
                    identity: &[],
                    physical: &self.physical,
                    attention: &self.attention,
                    retention: &[],
                    appraisal: None,
                },
                budget,
            )
            .map_err(invalid)?;
        Ok((prompt, schema))
    }
}

pub(super) async fn finish(
    game: &Arc<CurrentServer>,
    work: &Work,
    mut collected: Collected,
) -> Result<Prepared, CallFailure> {
    ensure_running(work)?;
    let budget = game.host.budget();
    let current = capture_offers(game, work, consumer(work), "current-offers").await?;
    let captured = CurrentRead::read(
        &current.decision_packet(budget).map_err(packet_failure)?,
        budget,
    )?;
    let through = collected.through.max(captured.value.own.accepted_cut);
    // The independent projection remains funded after its decoded inputs drop.
    let projection = collected.projection_custody(&captured, budget)?;
    let (binding, context, addressed, speech_trigger) = project(
        game,
        work,
        &captured.value,
        &collected.attention.ordinals,
        collected.sources.as_ref().map(|data| &data.value),
        &collected.required,
        ProjectionPurpose::Decision,
    )?;
    drop(captured);
    drop(collected.sources.take());
    drop(collected.attention);
    let route = game
        .cognition
        .prompt(
            context.fields.as_object().ok_or(CallFailure::Invalid)?,
            &[],
            false,
            budget,
        )
        .map_err(invalid)?;
    ensure_running(work)?;
    let request = crate::wire::encode(&binding, b"", b"", budget).map_err(wire_failure)?;
    drop(binding);
    let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
    let ticket = game
        .world
        .bind_npc(
            collected.original.take().ok_or(CallFailure::Invalid)?,
            current,
            request,
            origin,
        )
        .await
        .map_err(binding_failure)?;
    Ok(Prepared {
        through,
        addressed,
        speech_trigger,
        route,
        context,
        ticket: Arc::new(ticket),
        frame: collected.frame,
        _projection: projection,
    })
}

fn binding_failure(error: WorldError) -> CallFailure {
    if let WorldError::Simulation(inner) = &error
        && let Some(reason) = inner.stale_reason()
    {
        return CallFailure::Stale(reason).at("response-binding");
    }
    CallFailure::World(error).at("response-binding")
}

fn consumer(work: &Work) -> &'static str {
    if work.permit.is_some() {
        "chat"
    } else {
        "thought"
    }
}

async fn capture_offers(
    game: &Arc<CurrentServer>,
    work: &Work,
    consumer: &str,
    stage: &'static str,
) -> Result<RuntimeNpcRead, CallFailure> {
    let budget = game.host.budget();
    let request = read_request(work, consumer, budget)?;
    let selector = crate::wire::encode(
        &json!({"expandedBodyOrdinals":[],"coverage":"suggestions"}),
        b"",
        b"",
        budget,
    )
    .map_err(invalid)?;
    game.world
        .capture_npc_offers(game.clone(), request, selector)
        .await
        .map_err(|error| CallFailure::World(error).at(stage))
}

/// Keep the original accepted perception and personal source lineage. This
/// path binds its executable choices and response prototypes from a later cut.
async fn capture_origin(
    game: &Arc<CurrentServer>,
    work: &Work,
    consumer: &str,
) -> Result<RuntimeNpcRead, CallFailure> {
    let request = read_request(work, consumer, game.host.budget())?;
    game.world
        .capture_npc_read(request)
        .await
        .map_err(|error| CallFailure::World(error).at("original-read"))
}

fn read_request(
    work: &Work,
    consumer: &str,
    budget: &ByteBudget,
) -> Result<axum::body::Bytes, CallFailure> {
    crate::wire::encode(
        &json!({"actorId":work.actor,"requiredAppraisals":[],"consumer":consumer}),
        b"",
        b"",
        budget,
    )
    .map_err(invalid)
}

fn project(
    game: &CurrentServer,
    work: &Work,
    facts: &CurrentFacts,
    original_attention: &[usize],
    selected: Option<&PersonalPacket>,
    rows: &[usize],
    purpose: ProjectionPurpose,
) -> Result<(Value, Projection, bool, bool), CallFailure> {
    let consumer = consumer(work);
    let decision = matches!(purpose, ProjectionPurpose::Decision);
    let own = &facts.own;
    let perception = &facts.perception;
    let prepared = if decision {
        facts.candidates.as_ref()
    } else {
        facts.recall.as_ref()
    }
    .ok_or(CallFailure::Invalid)?;
    let own_name = name_phrase(&own.observer_name, NameArticle::None, false);
    let own_name = prompt_text(&own_name);
    let reference_key = uuid::Uuid::new_v4().simple().to_string();
    let self_reference = alias(&reference_key, "myself", 0);
    let mut refs = vec![self_reference.clone()];
    let mut canonical = HashMap::from([(work.actor.as_str(), self_reference.clone())]);
    let mut physical = Vec::new();
    let mut entities = vec![json!({"alias":self_reference,"source":{"kind":"myself"}})];
    let mut descriptions = Vec::new();
    if decision {
        descriptions.push(format!("Myself: {own_name} (ID:{self_reference})"));
    }
    let mut surroundings = Vec::new();
    let mut scene = Vec::new();
    let mut attention = Vec::new();
    let mut attention_aliases = Vec::new();
    let mut presented = Vec::new();
    for &ordinal in original_attention {
        let id = alias(&reference_key, "attention", ordinal);
        attention_aliases.push(id.clone());
        attention.push(json!({"alias":id,"ordinal":ordinal}));
        presented.push(ordinal);
    }
    for index in records(&prepared["bodyOrdinals"])? {
        let ordinal = get_u64(index)? as usize;
        let body = perception.bodies.get(ordinal).ok_or(CallFailure::Invalid)?;
        let key = alias(&reference_key, "body", ordinal);
        canonical.insert(body.source_id.as_str(), key.clone());
        refs.push(key.clone());
        entities.push(json!({"alias":key,"source":{"kind":"body","ordinal":ordinal}}));
        if decision {
            let name = name_phrase(
                body.name.as_ref().ok_or(CallFailure::Invalid)?,
                NameArticle::Definite,
                false,
            );
            let name = prompt_text(&name);
            physical.push(key.clone());
            descriptions.push(format!("{name} (ID:{key})"));
            let current = &perception.cut.as_ref().ok_or(CallFailure::Invalid)?.current;
            let (line, body) = received_body(own, current, body, &name, &key)?;
            surroundings.push(line);
            scene.push(body);
        }
    }
    let mut source_entries = Vec::with_capacity(rows.len());
    if let Some(selected) = selected {
        for &row in rows {
            source_entries.push(
                selected
                    .inventory
                    .personal
                    .get(row)
                    .ok_or(CallFailure::Invalid)?,
            );
        }
    }
    source_entries.sort_by(|a, b| {
        personal_time(a)
            .total_cmp(&personal_time(b))
            .then_with(|| a.value.sequence.cmp(&b.value.sequence))
    });
    let target_event = work.job.job.player_speech_event_id.as_deref().or_else(|| {
        work.automatic
            .as_ref()
            .and_then(|trigger| trigger.evidence.as_deref())
    });
    let trigger_index = target_event.and_then(|event| {
        source_entries.iter().position(|row| {
            row.reference.id == event || row.value.event_id.as_deref() == Some(event)
        })
    });
    let trigger = trigger_index.map(|index| source_entries[index]);
    if target_event.is_some() && trigger.is_none() {
        return Err(CallFailure::Stale("decision-heard-source"));
    }
    let addressed =
        trigger.is_some_and(|row| row.value.trigger_kind.as_deref() == Some("addressed_speech"));
    let speech = trigger.is_some_and(|row| row.value.event_type.as_deref() == Some("speech"));
    let speech_trigger = decision
        && work
            .automatic
            .as_ref()
            .is_none_or(|trigger| trigger.causes.is_empty())
        && speech_only(&work.source, &source_entries);
    if consumer == "chat" && !addressed {
        return Err(CallFailure::Stale("decision-heard-addressing"));
    }
    let world = &game.view_policy().world;
    let now = own.at;
    let display_time = |seconds| game_time(seconds, world.offset_hours, world.day_label.as_deref());
    let mut experience = Vec::new();
    let mut conversation = Vec::new();
    let mut recall = Vec::new();
    let mut rendered_trigger = None;
    for (index, entry) in source_entries.into_iter().enumerate() {
        let value = &entry.value;
        let (display, at) = personal_description(entry)?;
        let event_time = display_time(at);
        let fact = json!({"text":display,"at":at,"eventType":value.event_type,"acquisition":value.modality,"observerRelationship":value.trigger_kind,"eventTime":event_time});
        let line = format!("{display} ({event_time})");
        if value.event_type.as_deref() == Some("speech") {
            conversation.push(line);
        } else {
            recall.push(line);
        }
        experience.push(fact);
        if Some(index) == trigger_index {
            rendered_trigger = Some((entry, display, at, event_time));
        }
    }
    let (stimulus, trigger_facts) = if let Some((trigger, display, at, event_time)) =
        rendered_trigger
    {
        let value = &trigger.value;
        let speaker_visible = value.source_body.as_ref().is_some_and(|source| {
            perception.bodies.iter().any(|body| {
                body.source_id == source.entity_id
                    && Some(body.lease_id.as_str()) == source.lease_id.as_deref()
                    && body.physical_life == Some(source.physical_life)
            })
        });
        let speaker = value
            .speech
            .as_ref()
            .and_then(|speech| speech.speaker.as_ref());
        let addressee = value
            .speech
            .as_ref()
            .and_then(|speech| speech.addressee.as_ref());
        (
            format!(
                "{}: {} ({event_time})",
                if addressed {
                    "Addressed speech (to me)"
                } else if speech {
                    "Nearby speech"
                } else {
                    "World change"
                },
                display
            ),
            json!({"experience":{"text":display,"at":at,"acquisition":value.modality},"eventTime":event_time,"ageGameSeconds":(now-at).max(0.0),"observerRelationship":value.trigger_kind,"speaker":speaker.map(|name| prompt_text(&name.name_at_time)).unwrap_or(Cow::Borrowed("Unknown speaker")),"addressing":value.speech.as_ref().and_then(|speech| speech.addressing),"intendedRecipient":addressee.map(|name| prompt_text(&name.name_at_time)).unwrap_or(Cow::Borrowed("Unknown; no recipient identity perceived")),"sourceCurrentlyVisible":speaker_visible}),
        )
    } else {
        (
            if work.automatic.is_some() {
                prompt_text(&work.job.job.request.text).into_owned()
            } else {
                "Situation change: Current perceived activity.".to_owned()
            },
            json!({}),
        )
    };
    let mut actions = Vec::new();
    let mut offers = Vec::new();
    let identity = identity(&own.identity, &own_name, &self_reference);
    let body = body_text(own)?;
    let work_facts = agency(
        own.agency.as_ref(),
        &prepared["workContext"],
        game.host.budget(),
    )?;
    let notepad = own
        .knowledge
        .as_ref()
        .and_then(|knowledge| knowledge.general.as_ref())
        .map(|document| {
            prompt_record(document, &document.text, |text| KnowledgeDocument {
                text,
                ..document.clone()
            })
        })
        .transpose()?;
    let (mut fields, speaks, expressions, preview_player) = if decision {
        for (ordinal, offer) in records(&prepared["offers"])?.iter().enumerate() {
            let id = format!("a{ordinal}");
            let caption = text(&offer["description"])?;
            actions.push(json!({"alias":id,"ordinal":ordinal,"source":"current"}));
            offers.push(NativeOffer {
                id,
                caption: caption.to_owned(),
                no_intervention: offer["hasCommand"] == false,
                transition: text(&offer["transition"])?.to_owned(),
            });
        }
        let speaks = own.speech;
        let expressions = own.npc.as_ref().ok_or(CallFailure::Invalid)?.expressions;
        let preview_player = work
            .permit
            .as_ref()
            .and_then(|(_, scope)| canonical.get(scope.scope.actor_id.as_str()).cloned());
        let fields = json!({
            "identity":identity,"aboutMe":about_me(game, own.mind.as_ref().ok_or(CallFailure::Invalid)?)?,"body":body,"feelings":feelings(&own.actor_id,facts.appraisals.as_ref().ok_or(CallFailure::Invalid)?)?,
            "capabilities":{"speech":speaks,"expressions":expressions},"commitments":[],
            "stimulus":stimulus,"triggerFacts":trigger_facts,"conversation":conversation,
            "agency":work_facts,"currentSupport":own.support_surface_id,"publicSurfaces":[],
            "now":display_time(now),"simTime":now,"recall":recall,"experience":experience,
            "surroundings":surroundings,"receivedSituation":{"measuredAt":now,"bodies":scene},
            "activityRequests":activity_requests(game,&prepared["activity"],&canonical)?,
            "possessions":[],"notepad":null,
            "knowledge":[],"references":descriptions,"situationQueries":true,
        });
        (fields, speaks, expressions, preview_player)
    } else {
        let goal = work_facts["goals"]
            .as_array()
            .and_then(|goals| goals.first())
            .and_then(|goal| goal["objective"].as_str())
            .unwrap_or_default();
        let fields = json!({
            "stimulus":stimulus,"goal":goal,
            "includedContext":{
                "identity":identity,"notepad":null,
                "triggerFacts":trigger_facts,"now":display_time(now),"body":body,
                "agency":work_facts,"conversation":conversation,"recall":recall,
                "experience":experience,
            },
        });
        (fields, false, false, None)
    };
    if let Some(notepad) = notepad {
        if decision {
            fields["notepad"] = notepad;
        } else {
            fields["includedContext"]["notepad"] = notepad;
        }
    }
    project_markers(&mut fields, &canonical, &refs);
    let (purpose, validity, evidence) = if decision {
        (
            "decision",
            "decision",
            personal_evidence(selected, rows.iter().copied()),
        )
    } else {
        ("recall", "prepared-response", json!([]))
    };
    let binding = json!({"decisionId":work.job.job.id,"selection":{
        "consumer":consumer,"purpose":purpose,"validity":validity,"actions":actions,
        "prototypeSource":"current","perspectives":[],"semanticCauses":work.automatic.as_ref().map_or(&[][..],|trigger|trigger.causes.as_slice()),"intents":[],
        "evidence":evidence,"entities":entities,"identities":[],"knowledge":[],
        "observations":[],"current":[],"receipts":[],"attention":attention,"presented":presented,"appraisals":null,
    }});
    Ok((
        binding,
        Projection {
            fields,
            offers,
            refs,
            physical,
            attention: attention_aliases,
            speaks,
            expressions,
            preview_player,
        },
        addressed,
        speech_trigger,
    ))
}

/// Only the exact causes of this decision determine the conversational
/// shortcut. Recalled context can contain unrelated physical events.
/// See docs/memory-architecture.md#every-semantic-decision-uses-an-event-or-intent-sentence.
fn speech_only(causes: &[PersonalSourceRef], entries: &[&PersonalSource]) -> bool {
    let mut heard = false;
    for cause in causes {
        if cause.kind != PersonalSourceKind::Awareness {
            return false;
        }
        let Some(row) = entries.iter().find(|row| &row.reference == cause) else {
            return false;
        };
        let value = &row.value;
        if value.speech.is_none() {
            return false;
        }
        heard |= value.event_type.as_deref() == Some("speech")
            && value.modality.as_deref() != Some("observed");
    }
    heard
}

fn personal_evidence(sources: Option<&PersonalPacket>, rows: impl Iterator<Item = usize>) -> Value {
    let ordinal = sources.map(|data| data.ordinal);
    Value::Array(
        rows.map(|row| json!({"inventory":ordinal,"ordinal":row}))
            .collect(),
    )
}

fn describe_experience(
    game: &CurrentServer,
    entry: &PersonalSource,
    description: &str,
) -> Result<Value, CallFailure> {
    let value = &entry.value;
    let at = personal_time(entry);
    if !at.is_finite() {
        return Err(CallFailure::Invalid);
    }
    let world = &game.view_policy().world;
    Ok(
        json!({"text":description,"at":at,"eventType":value.event_type,
        "acquisition":value.modality,"observerRelationship":value.trigger_kind,
        "eventTime": game_time(at, world.offset_hours, world.day_label.as_deref())}),
    )
}

fn personal_time(entry: &PersonalSource) -> f64 {
    let at = if entry.reference.kind == PersonalSourceKind::Summary {
        entry.value.to
    } else {
        entry.value.at
    };
    at.unwrap_or(f64::NAN)
}

fn alias(key: &str, kind: &str, index: usize) -> String {
    // The per-request key stays private even if a caller repeats its own
    // command ID. An unseen native body cannot be guessed from an ordinal.
    let digest = sha256_hex(format!("{key}:{kind}:{index}").as_bytes());
    digest[..24].to_owned()
}

fn text(value: &Value) -> Result<&str, CallFailure> {
    value.as_str().ok_or(CallFailure::Invalid)
}
fn get_u64(value: &Value) -> Result<u64, CallFailure> {
    value.as_u64().ok_or(CallFailure::Invalid)
}
fn records(value: &Value) -> Result<&[Value], CallFailure> {
    value
        .as_array()
        .map(Vec::as_slice)
        .ok_or(CallFailure::Invalid)
}
fn invalid(_: impl std::fmt::Display) -> CallFailure {
    CallFailure::Invalid
}

fn capacity(error: CapacityError) -> CallFailure {
    packet_failure(error.into())
}

fn packet_failure(error: RuntimeError) -> CallFailure {
    CallFailure::World(WorldError::Simulation(error)).at("context-preparation")
}

fn wire_failure(error: crate::wire::WireError) -> CallFailure {
    match error {
        crate::wire::WireError::Capacity => capacity(CapacityError),
        crate::wire::WireError::Encoding(error) => invalid(error),
    }
}

/// Prompts use UTF-8. Escape isolated UTF-16 units visibly, and distinguish
/// literal backslashes within that passage from these display escapes. The
/// original observation, evidence reference and authority stay in native.
fn prompt_text(value: &JsText) -> Cow<'_, str> {
    if let Some(text) = value.as_unicode() {
        return Cow::Borrowed(text);
    }
    let mut rendered = String::new();
    for unit in char::decode_utf16(value.units()) {
        match unit {
            Ok('\\') => rendered.push_str("\\\\"),
            Ok(character) => rendered.push(character),
            Err(unit) => write!(rendered, "\\u{:04x}", unit.unpaired_surrogate())
                .expect("writing to String is infallible"),
        }
    }
    Cow::Owned(rendered)
}

/// Embed an existing record's prompt-safe prose without changing the schema
/// or the exact text retained by the native capture.
fn prompt_record<T: Serialize>(
    record: &T,
    text: &JsText,
    render: impl FnOnce(JsText) -> T,
) -> Result<Value, CallFailure> {
    match prompt_text(text) {
        Cow::Borrowed(_) => serde_json::to_value(record),
        Cow::Owned(display) => serde_json::to_value(render(display.into())),
    }
    .map_err(invalid)
}

fn personal_description(entry: &PersonalSource) -> Result<(String, f64), CallFailure> {
    let value = &entry.value;
    let date = personal_time(entry);
    if !date.is_finite() {
        return Err(CallFailure::Invalid);
    }
    let description = match entry.reference.kind {
        PersonalSourceKind::Awareness => {
            let source = value
                .content
                .as_ref()
                .or(value.text.as_ref())
                .ok_or(CallFailure::Invalid)?;
            prompt_text(&native_text(source)).into_owned()
        }
        PersonalSourceKind::Memory => {
            prompt_text(value.summary.as_ref().ok_or(CallFailure::Invalid)?).into_owned()
        }
        PersonalSourceKind::Summary => format!(
            "Summary of remembered experience: {}",
            prompt_text(&native_text(
                value.text.as_ref().ok_or(CallFailure::Invalid)?
            ))
        ),
    };
    Ok((description, date))
}

fn identity(identity: &CurrentIdentity, label: &str, token: &str) -> String {
    let species = identity.species.as_deref().unwrap_or("unknown");
    let mut formatted = format!("I am {label} (ID:{token}). Species: {species}.");
    if let Some(traits) = identity.traits.as_ref().filter(|items| !items.is_empty()) {
        formatted.push_str(" My traits: ");
        for (index, entry) in traits.iter().enumerate() {
            if index > 0 {
                formatted.push_str("; ");
            }
            formatted.push_str(&prompt_text(&entry.name));
            formatted.push_str(": ");
            formatted.push_str(&prompt_text(&entry.description));
        }
        formatted.push('.');
    }
    formatted
}

fn about_me(game: &CurrentServer, mind: &CurrentMind) -> Result<String, CallFailure> {
    let documents = &mind.documents;
    let titles = documents
        .iter()
        .map(|doc| JsText::from(format!("{}.md", doc.id)))
        .collect::<Vec<_>>();
    let order = if titles.len() > 1 {
        game.language()
            .ok_or(CallFailure::Invalid)?
            .collate(&titles)
            .map_err(invalid)?
            .0
    } else {
        (0..titles.len() as u32).collect()
    };
    let mut result = String::new();
    for (index, ordinal) in order.into_iter().enumerate() {
        let doc = documents
            .get(ordinal as usize)
            .ok_or(CallFailure::Invalid)?;
        if index > 0 {
            result.push_str("\n\n");
        }
        result.push_str("# ");
        result.push_str(&doc.id);
        result.push_str(".md\n");
        result.push_str(&prompt_text(&doc.text));
    }
    Ok(result)
}

fn body_text(own: &CurrentActor) -> Result<String, CallFailure> {
    let mut parts = Vec::new();
    for attribute in &own.attributes {
        let name = text(&attribute["name"])?;
        let show = |field: &str| -> Result<String, CallFailure> {
            if let Some(text) = attribute[field].as_str() {
                Ok(text.into())
            } else {
                json_record(&attribute[field]).map_err(invalid)
            }
        };
        let measurement = if attribute["status"] == "unknown" {
            format!("{name}: unknown.")
        } else if attribute["display"] == "meter" {
            let unit = attribute["unit"]
                .as_str()
                .map(|unit| format!(" {unit}"))
                .unwrap_or_default();
            format!(
                "{name}: {}{unit} (range {}–{}{unit}).",
                show("value")?,
                show("min")?,
                show("max")?
            )
        } else {
            format!("{name}: {}.", show("value")?)
        };
        parts.push(measurement);
        if let Some(condition) = attribute["condition"]
            .as_str()
            .or_else(|| attribute["concern"].as_str())
        {
            parts.push(condition.into());
        }
        if let Some(meaning) = attribute["meaning"].as_str() {
            parts.push(meaning.into());
        }
    }
    for status in &own.action_status_labels {
        parts.push(format!("I am {}.", status.to_lowercase()));
    }
    parts.push(format!(
        "Current activity: {}.",
        own.action.as_ref().map_or("idle", |action| &action.kind)
    ));
    Ok(parts.join(" "))
}

fn agency(
    agency: Option<&CurrentAgency>,
    work: &Value,
    budget: &ByteBudget,
) -> Result<Value, CallFailure> {
    let remaining = |value: &Value| {
        Some(
            value["views"]
                .as_array()?
                .iter()
                .filter_map(|view| view["title"].as_str().or_else(|| view["label"].as_str()))
                .collect::<Vec<_>>()
                .join("; "),
        )
    };
    let goals = agency
        .map(|agency| {
            agency
                .goals
                .iter()
                .map(|goal| {
                    prompt_record(goal, &goal.objective, |objective| Goal {
                        objective,
                        ..goal.clone()
                    })
                })
                .collect::<Result<Vec<_>, _>>()
        })
        .transpose()?;
    let revision = agency
        .and_then(|agency| agency.plan.as_ref())
        .map_or(0, |plan| plan.revision);
    let mut fields = json!({"goals":null,"plan":remaining(&work["plan"]),"paused":remaining(&work["suspended"]),
        "planRevision":revision,"attempts":null});
    fields["goals"] = goals.map_or(Value::Null, Value::Array);
    if let Some(agency) = agency {
        fields["attempts"] = pending_intentions(&agency.attempts, budget)?;
    }
    Ok(fields)
}

/// Decode the bounded retained intentions with the native exact-text reader.
/// This workspace is temporary. The caller funds the independent prompt value.
fn pending_intentions(raw: &RawValue, budget: &ByteBudget) -> Result<Value, CallFailure> {
    let text = raw.get();
    if text == "[]" {
        return Ok(Value::Array(Vec::new()));
    }
    let bound = SqlCell::json_decode_bound(text).ok_or_else(|| capacity(CapacityError))?;
    let _workspace = budget.reserve(bound).map_err(capacity)?;
    let attempts = serde_json::from_str::<Vec<SqlCell>>(text).map_err(invalid)?;
    Ok(Value::Array(
        attempts
            .into_iter()
            .map(intention_prompt_value)
            .collect::<Result<_, _>>()?,
    ))
}

fn intention_prompt_value(value: SqlCell) -> Result<Value, CallFailure> {
    Ok(match value {
        SqlCell::Null => Value::Null,
        SqlCell::Bool(value) => Value::Bool(value),
        SqlCell::Number(value) => Value::Number(value),
        SqlCell::Text(JsText::Unicode(value)) => Value::String(value),
        SqlCell::Text(value) => Value::String(prompt_text(&value).into_owned()),
        SqlCell::Array(items) => Value::Array(
            items
                .into_iter()
                .map(intention_prompt_value)
                .collect::<Result<_, _>>()?,
        ),
        SqlCell::Object(fields) => Value::Object(
            fields
                .into_iter()
                .map(|(key, value)| intention_prompt_value(value).map(|value| (key, value)))
                .collect::<Result<_, _>>()?,
        ),
        // Admitted pending intentions and their slots/resolution use closed
        // field names. A prose conversion must never change a member identity.
        SqlCell::ExactObject(_) => return Err(CallFailure::Invalid),
    })
}

fn received_body(
    own: &CurrentActor,
    current: &[CurrentFacet],
    selected: &CurrentBody,
    name: &str,
    alias: &str,
) -> Result<(String, Value), CallFailure> {
    let start = selected.first.ok_or(CallFailure::Invalid)?;
    let count = selected.count.ok_or(CallFailure::Invalid)?;
    let end = start.checked_add(count).ok_or(CallFailure::Invalid)?;
    let selected = current.get(start..end).ok_or(CallFailure::Invalid)?;
    let (facet, body) = selected
        .iter()
        .find_map(|facet| facet.value.body.as_ref().map(|body| (facet, body)))
        .ok_or(CallFailure::Invalid)?;
    let x = body.position.x - own.position.x;
    let y = body.position.y - own.position.y;
    let z = body.position.z - own.position.z;
    let (sin, cos) = own.heading.sin_cos();
    let relative = json!({
        "right": -cos * x + sin * z,
        "above": y,
        "forward": sin * x + cos * z,
    });
    let mut line = format!(
        "I can see {name} (ID:{alias}). Physical form: measured at simulation second {}; received at {}.",
        facet.value_measured_from, facet.value_acquired_at,
    );
    if let Some(detail) = &body.description {
        line.push_str(" Observed description: ");
        line.push_str(&prompt_text(detail));
    }
    for detail in &body.outward {
        line.push(' ');
        line.push_str(detail);
    }
    Ok((
        line,
        json!({"reference": alias, "label": name, "relative": relative,
            "valueMeasuredFrom":facet.value_measured_from,"valueMeasuredThrough":facet.value_measured_through,
            "valueAcquiredAt":facet.value_acquired_at,"confirmedThrough":facet.confirmed_through,
        }),
    ))
}

fn activity_requests(
    game: &CurrentServer,
    read: &Value,
    canonical: &HashMap<&str, String>,
) -> Result<Value, CallFailure> {
    let available = &read["available"];
    let choices = records(&available["choices"])?;
    let mut permitted = Vec::new();
    for choice in choices {
        let id = text(&choice["id"])?;
        let key = match choice["kind"].as_str() {
            Some("entity") => "entityId",
            Some("definition") => "definitionId",
            _ => return Err(CallFailure::Invalid),
        };
        let alias = if key == "entityId" {
            let Some(alias) = canonical.get(id) else {
                continue;
            };
            alias.as_str()
        } else {
            id
        };
        let mut formatted = choice.as_object().ok_or(CallFailure::Invalid)?.clone();
        formatted.shift_remove("id");
        formatted.insert(key.to_owned(), alias.into());
        permitted.push(Value::Object(formatted));
    }
    Ok(
        json!({"requests":game.cognition.requests,"choices":permitted,"warnings":available["warnings"]}),
    )
}

fn feelings(actor_id: &str, read: &CurrentAppraisals) -> Result<String, CallFailure> {
    let mut lines = Vec::new();
    for value in &read.values {
        let mut line = format!("I feel {}", text(&value["feeling"])?);
        if let Some(target) = value["targetId"].as_str()
            && let Some(name) = read.names.iter().find(|entry| entry.entity_id == target)
        {
            line.push_str(" concerning ");
            if actor_id == target {
                line.push_str("myself");
            } else {
                let phrase = name_phrase(&name.name, NameArticle::Definite, false);
                line.push_str(&prompt_text(&phrase));
            }
        }
        if value["value"]["kind"] == "scaled" && value["scale"].is_object() {
            line.push_str(&format!(
                "; current intensity {} on the installed {}–{} scale",
                value["value"]["value"], value["scale"]["min"], value["scale"]["max"]
            ));
        }
        let duration = if let Some(decay) = value["decayPerHour"].as_f64() {
            format!("decays by {decay} per game hour without a new interpretation")
        } else {
            text(&value["lifetime"])?.to_owned()
        };
        line.push_str(&format!(
            ". Source: {}; lifetime: {duration}.",
            text(&value["coverage"])?
        ));
        lines.push(line);
    }
    Ok(lines.join(" "))
}

fn project_markers(value: &mut Value, canonical: &HashMap<&str, String>, issued: &[String]) {
    match value {
        Value::String(value) if value.contains("(ID:") => {
            let mut result = String::new();
            let mut rest = value.as_str();
            while let Some((prefix, tail)) = rest.split_once("(ID:") {
                let Some((id, next)) = tail.split_once(')') else {
                    break;
                };
                result.push_str(prefix);
                if id.is_empty() || id.contains('(') || id.chars().any(char::is_whitespace) {
                    result.push_str("(ID:");
                    result.push_str(id);
                    result.push(')');
                } else if let Some(reference) = canonical
                    .get(id)
                    .map(String::as_str)
                    .or_else(|| issued.iter().any(|reference| reference == id).then_some(id))
                {
                    result.push_str("(ID:");
                    result.push_str(reference);
                    result.push(')');
                } else {
                    result.push_str("(unrecognized identity)");
                }
                rest = next;
            }
            result.push_str(rest);
            *value = result;
        }
        Value::Object(fields) => fields
            .values_mut()
            .for_each(|value| project_markers(value, canonical, issued)),
        Value::Array(items) => items
            .iter_mut()
            .for_each(|value| project_markers(value, canonical, issued)),
        _ => {}
    }
}

fn game_time(at: f64, offset: f64, day: Option<&str>) -> String {
    let minutes = (at / 60.0 + offset * 60.0).floor() as i64;
    let clock = minutes.rem_euclid(24 * 60);
    let wall = format!("{:02}:{:02}", clock / 60, clock % 60);
    let day_number = minutes.div_euclid(24 * 60) + 1;
    day.map_or_else(
        || format!("{day_number}, {wall}"),
        |label| format!("{label} {day_number}, {wall}"),
    )
}
