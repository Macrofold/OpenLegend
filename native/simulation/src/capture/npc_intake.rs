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
    tokens: Vec<String>,
    dependencies: String,
    json: String,
    _storage: ByteReservation,
}
impl NpcIntakeCapture {
    pub(crate) fn json(&self) -> &str {
        &self.json
    }
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
        let _copy = budget.reserve(self.request.actor_id.len())?;
        let current = capture(state, self.request.clone(), budget)?;
        Ok(self.tokens == current.tokens && self.dependencies == current.dependencies)
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
            if let Some(value) = self.0.and_then(|data| data.get(key)) {
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
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    world_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    at: f64,
    actor_id: &'a str,
    name: &'a crate::text::JsText,
    eligible: bool,
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
    own: &'a RawValue,
    attention: &'a RawValue,
    protection_labels: &'a [&'a str],
    actions_blocked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    semantic: Option<&'a crate::state::SemanticContinuation>,
    opportunity: Opportunity<'a>,
    stimuli: &'a [Stimulus<'a>],
    events: &'a [EventMetadata<'a>],
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Unseen<'a> {
    records: &'a [crate::experience::intake::IntakeSource<'a>],
    max_sequence: u64,
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
    storage.resize(digest.capacity())?;
    Ok((digest, storage))
}
pub(crate) fn capture(
    state: &SimulationState,
    request: NpcIntakeReadRequest,
    budget: &ByteBudget,
) -> Result<NpcIntakeCapture, ExecutionError> {
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
    let unseen = unseen_intake(
        &state.experience,
        id,
        request.after_sequence,
        request.weighed_through,
        request.selection,
        &state.installed.cognition.significant_event_types,
        budget,
    )?;
    let attributes = project_attributes(
        entity,
        &state.installed.attributes,
        state.physical.pending_values.as_ref(),
        AttributeAudience::Owner,
        budget,
    )?;
    let own = write_actor_self(state, id, ActorReadPurpose::NpcDecision, budget)?;
    let attention = crate::reception::capture_attention_read(state, id, budget)?;
    let policy = state
        .installed
        .body_policy
        .as_ref()
        .map(|policy| &policy.value().background_thinking);
    let count = policy.map_or(0, |policy| policy.reconsideration_inputs.len());
    let visible_count = [
        &state.reception.visible_people,
        &state.reception.visible_objects,
    ]
    .into_iter()
    .filter_map(|root| root.as_ref().and_then(|root| root.get(id)))
    .map(Vec::len)
    .sum::<usize>();
    let current = state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(id));
    let current_count = current.map_or(0, |owner| owner.current.len());
    let bytes = count
        .checked_mul(2 * size_of::<Reconsideration<'_>>())
        .and_then(|n| n.checked_add(visible_count.checked_mul(size_of::<Stimulus<'_>>())?))
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
        .and_then(|n| {
            n.checked_add(
                attributes
                    .rows()
                    .len()
                    .checked_mul(size_of::<(&str, &crate::text::JsText)>())?,
            )
        })
        .and_then(|n| {
            n.checked_add(
                unseen
                    .records
                    .len()
                    .checked_mul(size_of::<EventMetadata<'_>>())?,
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let read = state.installed.status_read(&state.physical);
    let mut reconsideration = Vec::with_capacity(count);
    let mut director_inputs = Vec::with_capacity(count);
    if let Some(policy) = policy {
        for input in &policy.reconsideration_inputs {
            let value = read
                .evaluate(EffectBindings::for_status(id, None), &input.when)?
                .matches;
            reconsideration.push(Reconsideration {
                key: &input.key,
                value,
            });
            if input.director {
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
    let protection_labels = state
        .installed
        .status_policy
        .definitions
        .iter()
        .filter(|definition| {
            entity
                .status_effects
                .as_ref()
                .and_then(|states| states.get(&definition.id))
                .is_some_and(|status| status.active)
        })
        .map(|definition| definition.label.as_str())
        .collect::<Vec<_>>();
    let concerns = attributes
        .rows()
        .iter()
        .filter(|attribute| {
            state
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
        })
        .filter_map(|attribute| {
            attribute
                .concern
                .as_ref()
                .map(|text| (attribute.id.as_str(), text))
        })
        .collect::<Vec<_>>();
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
            if source == id { continue; }
            if let Some(body) = scope.native_body(source)? {
                if let Some(crate::received::ReceivedValueFragment::Body(value)) =
                    match &body.field.value.reference { crate::received::ReceivedValueReference::Inline(value) => Some(value.as_ref()), crate::received::ReceivedValueReference::Shared(id) => state.reception.received_values.as_ref().and_then(|values|values.shared_value(id)) }
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
    classifications.sort_by(|a, b| crate::encoding::js_property_cmp(a.0, b.0));
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
        // Source uses the latest resident detail notice, never hidden target clocks.
        let changed = state
            .experience
            .optional_collection(id, PersonalSourceKind::Awareness)?
            .into_iter()
            .flat_map(|c| c.records())
            .rev()
            .take_while(|record| record.header().at >= seen)
            .find(|record| {
                record.header().event_type.as_deref() == Some("encounter")
                    && record.header().evidence_target_id.as_deref() == Some(source)
                    && serde_json::from_str::<Detail>(record.payload())
                        .is_ok_and(|detail| detail.change == Some("detail"))
            })
            .map_or(seen, |record| record.header().at);
        stimuli.push(Stimulus {
            source_id: source,
            states: state
                .installed
                .observation_rules
                .value()
                .outward_states(subject),
            since: seen.max(changed),
        });
    }
    #[derive(Deserialize)]
    struct Detail<'a> {
        #[serde(borrow)]
        change: Option<&'a str>,
    }
    let mut events = Vec::with_capacity(unseen.records.len());
    for source in &unseen.records {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct EventId<'a> {
            #[serde(borrow)]
            event_id: Option<&'a str>,
        }
        let event: EventId =
            serde_json::from_str(source.value.get()).map_err(|_| ExecutionError::Invariant)?;
        if let Some(original) = event.event_id.and_then(|event| {
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
    let goal_bytes = actor
        .agency
        .goals
        .iter()
        .try_fold(0usize, |n, goal| {
            n.checked_add(goal.objective.storage_bytes())
                .and_then(|n| n.checked_add(4))
        })
        .ok_or(ExecutionError::Capacity)?;
    let _goal_storage = budget.reserve(goal_bytes)?;
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
    add!((
        state.installed.manifest.revision,
        state
            .installed
            .body_policy
            .as_ref()
            .map(|policy| policy.pin()),
        &state.installed.manifest.revision
    ));
    add!(actions_blocked);
    add!(concerns.iter().map(|(id, _)| id).collect::<Vec<_>>());
    add!(Classifications(&classifications, false));
    add!(Classifications(&classifications, true));
    add!(
        state
            .installed
            .retained
            .recipes
            .entries()
            .collect::<Vec<_>>()
    );
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
    #[derive(Deserialize)]
    struct Cue<'a> {
        #[serde(borrow)]
        id: &'a RawValue,
        #[serde(rename = "descriptionRevision", borrow)]
        description_revision: &'a RawValue,
    }
    #[derive(Deserialize)]
    struct Cues<'a> {
        #[serde(borrow)]
        cues: Vec<Cue<'a>>,
    }
    let _cue_parse = crate::install::reserve_typed_parse::<Cues<'_>>(
        &attention.json,
        size_of::<Cue<'_>>(),
        None,
        budget,
    )
    .map_err(|error| match error {
        crate::install::InstallError::Capacity => ExecutionError::Capacity,
        _ => ExecutionError::Invariant,
    })?;
    let cues: Cues =
        serde_json::from_str(&attention.json).map_err(|_| ExecutionError::Invariant)?;
    struct CueInputs<'a>(&'a [Cue<'a>]);
    impl Serialize for CueInputs<'_> {
        fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            let mut out = s.serialize_seq(Some(self.0.len()))?;
            for cue in self.0 {
                out.serialize_element(&(cue.id, cue.description_revision))?;
            }
            out.end()
        }
    }
    add!(CueInputs(&cues.cues));
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
        ),
        budget,
    )?;
    token_storage.merge(dependency_storage)?;
    let product = Product {
        world_id: &state.physical.header.id,
        generation: &state.generation,
        accepted_cut: state.accepted_cut,
        at: state.physical.header.sim_time,
        actor_id: id,
        name: &entity.name,
        eligible: actor.alive && !actor.incapacitated,
        physical_life: actor.physical_life,
        identity_through: state.physical.identity.next_id(),
        controller: &actor.controller,
        alive: actor.alive,
        incapacitated: actor.incapacitated,
        participating: entity.actively_participates(),
        has_memory: entity.has_memory(),
        cognition: actor.capabilities.as_ref().map_or(actor.controller != "native", |capabilities| capabilities.cognition),
        conditions: &actor.conditions,
        values: &tokens,
        dependency_token: &dependencies,
        awareness_through: unseen.awareness_through,
        urgency: unseen.urgency,
        unseen: Unseen {
            records: &unseen.records,
            max_sequence: unseen.max_sequence,
        },
        own: raw(&own.0)?,
        attention: raw(&attention.json)?,
        protection_labels: &protection_labels,
        actions_blocked,
        semantic: actor.agency.semantic.as_ref(),
        opportunity: Opportunity {
            body_inputs: &director_inputs,
            concerns: &concerns,
            knowledge: state.learned_capabilities.known_recipes(),
            knowledge_revision: state
                .reception
                .knowledge_revisions
                .as_ref()
                .and_then(|owners| owners.get(id))
                .copied()
                .unwrap_or(0),
            mind_revision: inner.map(|inner| inner.revision),
            semantic_purpose: purpose.as_deref(),
        },
        stimuli: &stimuli,
        events: &events,
    };
    let length = json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(
        length
            .checked_mul(2)
            .and_then(|n| {
                n.checked_add(
                    state.physical.header.id.len()
                        + state.generation.len()
                        + request.actor_id.capacity()
                        + size_of::<NpcIntakeCapture>(),
                )
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let json = json_record(&product).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(
        json.capacity()
            + state.physical.header.id.capacity()
            + state.generation.capacity()
            + request.actor_id.capacity()
            + size_of::<NpcIntakeCapture>(),
    )?;
    storage.merge(token_storage)?;
    Ok(NpcIntakeCapture {
        world: state.physical.header.id.clone(),
        generation: state.generation.clone(),
        life: actor.physical_life,
        request,
        tokens,
        dependencies,
        json,
        _storage: storage,
    })
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
