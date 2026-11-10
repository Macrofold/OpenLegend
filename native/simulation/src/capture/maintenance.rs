//! A maintenance admission belongs to one native actor. Body eligibility and
//! workspace revision are separate from the selected historical evidence cut.
use super::*;
use crate::encoding::{json_record, json_record_eq, json_record_len};
use crate::experience::{PersonalSourceCollection, PersonalSourceKind};
use crate::simulation::InstalledWorld;
use crate::status::EffectBindings;
use serde::{Deserialize, ser::SerializeSeq};
use serde_json::value::RawValue;
mod interpretation;
pub(crate) use interpretation::MaintenanceInterpretation;
mod presentation;
pub(crate) use presentation::MaintenancePresentation;

pub(crate) fn population(state: &SimulationState) -> impl Serialize + '_ {
    struct Thought<'a>(&'a SimulationState);
    impl Serialize for Thought<'_> {
        fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            let mut out = s.serialize_seq(None)?;
            for id in self
                .0
                .minds
                .minds
                .as_ref()
                .into_iter()
                .flat_map(|m| m.keys())
            {
                out.serialize_element(id)?;
            }
            out.end()
        }
    }
    struct Maintenance<'a>(&'a SimulationState);
    impl Serialize for Maintenance<'_> {
        fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            let minds = self.0.minds.minds.as_ref();
            let mut out = s.serialize_seq(None)?;
            for id in minds.into_iter().flat_map(|m| m.keys()) {
                out.serialize_element(id)?;
            }
            for id in self
                .0
                .activity
                .learning
                .keys()
                .filter(|id| minds.is_none_or(|m| !m.contains_key(*id)))
            {
                out.serialize_element(id)?;
            }
            out.end()
        }
    }
    #[derive(Serialize)]
    struct Population<'a> {
        thought: Thought<'a>,
        maintenance: Maintenance<'a>,
    }
    Population {
        thought: Thought(state),
        maintenance: Maintenance(state),
    }
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum MaintenancePurpose {
    Maintenance,
    Reflection,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MaintenanceRequest {
    pub actor_id: String,
    #[serde(default)]
    pub resident_pressure: Option<ResidentPressure>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResidentPressure {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub awareness: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub memories: u64,
}
/// Read-selection thresholds come from the common Source operational limits;
/// this reader does not introduce a second authored retention policy.
pub(crate) fn resident_pressure(
    state: &SimulationState,
    thresholds: &ResidentPressure,
) -> Result<bool, ExecutionError> {
    Ok(state
        .experience
        .resident_maintenance_pressure(thresholds.awareness, thresholds.memories))
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MaintenanceAdmission {
    pub purpose: MaintenancePurpose,
    pub requires_body: bool,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    pub dream_episode: Option<String>,
}
pub(crate) struct MaintenanceCapture {
    pub(crate) request: MaintenanceRequest,
    world: String,
    generation: String,
    body_fence: String,
    obligations: String,
    pub(crate) mind_revision: u64,
    pub(crate) inner_revision: Option<u64>,
    packet: String,
    values: Vec<String>,
    dependencies: String,
    _storage: ByteReservation,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestFence<'a> {
    #[serde(borrow)]
    pins: &'a RawValue,
    #[serde(borrow, default)]
    body_policy_pin: Option<&'a RawValue>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BodyFence<'a> {
    manifest: u64,
    body_policy: Option<&'a RawValue>,
    attributes: &'a RawValue,
    status: u64,
    cognition: &'a crate::experience::CognitionPolicy,
    #[serde(skip_serializing_if = "Option::is_none")]
    body: Option<&'a crate::state::LivingBody>,
}
fn body_fence<'a>(
    installed: &'a InstalledWorld,
    actor: &'a crate::state::ActorState,
) -> Result<BodyFence<'a>, ExecutionError> {
    let manifest: ManifestFence<'a> = serde_json::from_str(&installed.manifest.row.payload)
        .map_err(|_| ExecutionError::Invariant)?;
    Ok(BodyFence {
        manifest: installed.manifest.revision,
        body_policy: manifest.body_policy_pin,
        attributes: manifest.pins,
        status: installed.status_policy.revision,
        cognition: &installed.cognition,
        body: actor.body.as_ref(),
    })
}
pub(crate) fn available(
    state: &SimulationState,
    actor_id: &str,
    purpose: MaintenancePurpose,
) -> Result<bool, ExecutionError> {
    let Some(entity) = state.physical.entities.get(actor_id) else {
        return Ok(false);
    };
    let Some(actor) = entity.actor.as_ref() else {
        return Ok(false);
    };
    if !entity.has_memory()
        || actor.controller != "npc"
        || !actor.alive
        || actor.incapacitated
        || actor.capabilities.as_ref().is_some_and(|c| !c.inner_world)
        || actor
            .action
            .as_ref()
            .is_some_and(|action| action.kind != "status-effect")
    {
        return Ok(false);
    }
    let Some(policy) = state.installed.body_policy.as_ref() else {
        return Ok(true);
    };
    let read = state.installed.status_read(&state.physical);
    let bindings = EffectBindings::for_status(actor_id, None);
    for condition in [
        policy
            .value()
            .background_thinking
            .maintenance_blocked_when
            .as_ref(),
        matches!(purpose, MaintenancePurpose::Reflection)
            .then_some(
                policy
                    .value()
                    .background_thinking
                    .reflection_blocked_when
                    .as_ref(),
            )
            .flatten(),
    ]
    .into_iter()
    .flatten()
    {
        if read.evaluate(bindings, condition)?.matches {
            return Ok(false);
        }
    }
    Ok(true)
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Dream<'a> {
    episode: &'a str,
    elapsed_seconds: f64,
    after_seconds: f64,
}
fn dream<'a>(state: &'a SimulationState, actor_id: &str) -> Option<Dream<'a>> {
    let policy = state.installed.cognition.dream.as_ref()?;
    let status = state
        .physical
        .entities
        .get(actor_id)?
        .status_effects
        .as_ref()?
        .get(&policy.status_effect_id)
        .filter(|status| status.active)?;
    Some(Dream {
        episode: &status.episode,
        elapsed_seconds: state
            .physical
            .pending_values
            .as_ref()
            .map_or(status.elapsed_seconds, |window| {
                window.current_status_elapsed(status)
            }),
        after_seconds: policy.after_seconds,
    })
}
pub(crate) fn dream_status<'a>(
    state: &'a SimulationState,
    actor: &str,
) -> Option<(&'a str, f64, f64)> {
    dream(state, actor).map(|d| (d.episode, d.elapsed_seconds, d.after_seconds))
}
struct Obligations<'a>(Option<&'a PersonalSourceCollection>);
impl Serialize for Obligations<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut out = serializer.serialize_seq(None)?;
        for record in self
            .0
            .into_iter()
            .flat_map(|c| c.records())
            .filter(|record| record.header().unresolved_commitment)
        {
            let body: &RawValue =
                serde_json::from_str(record.payload()).map_err(serde::ser::Error::custom)?;
            out.serialize_element(body)?;
        }
        out.end()
    }
}
fn memories<'a>(
    state: &'a SimulationState,
    actor: &str,
) -> Result<Option<&'a PersonalSourceCollection>, ExecutionError> {
    Ok(state
        .experience
        .optional_collection(actor, PersonalSourceKind::Memory)?)
}
fn encode(
    value: &impl Serialize,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let bytes = json_record_len(value).map_err(|_| ExecutionError::Invariant)?;
    let mut guard = budget.reserve(
        bytes
            .checked_mul(2)
            .map(|n| n.max(8))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let text = json_record(value).map_err(|_| ExecutionError::Invariant)?;
    guard.resize(text.capacity())?;
    Ok((text, guard))
}
struct SourceInputs<'a>(Option<&'a PersonalSourceCollection>);
impl Serialize for SourceInputs<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut out = s.serialize_seq(None)?;
        for record in self.0.into_iter().flat_map(|c| c.records()) {
            out.serialize_element(&record.header().reference)?;
        }
        out.end()
    }
}
fn token(
    value: &impl Serialize,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let output = budget.reserve(64)?;
    let (json, _temporary) = encode(value, budget)?;
    Ok((crate::encoding::sha256_hex(json.as_bytes()), output))
}
fn queue_values(
    state: &SimulationState,
    id: &str,
    budget: &ByteBudget,
) -> Result<(Vec<String>, ByteReservation), ExecutionError> {
    let entity = state
        .physical
        .entities
        .get(id)
        .ok_or(ExecutionError::MissingActor)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    let manifest: ManifestFence<'_> = serde_json::from_str(&state.installed.manifest.row.payload)
        .map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(14 * size_of::<String>())?;
    let mut values = Vec::with_capacity(14);
    macro_rules! add {
        ($value:expr) => {{
            let (value, guard) = token(&$value, budget)?;
            values.push(value);
            storage.merge(guard)?;
        }};
    }
    add!(actor.controller);
    add!(actor.incapacitated);
    add!(available(state, id, MaintenancePurpose::Maintenance)?);
    add!((
        state.installed.manifest.revision,
        manifest.body_policy_pin,
        manifest.pins
    ));
    add!(actor.action.as_ref().map(|action| &action.kind));
    add!(actor.agency.plan.as_ref().map(|plan| plan.status));
    add!(dream(state, id).map(|d| d.episode));
    for kind in [
        PersonalSourceKind::Memory,
        PersonalSourceKind::Awareness,
        PersonalSourceKind::Summary,
    ] {
        add!(SourceInputs(
            state.experience.optional_collection(id, kind)?
        ));
    }
    // Canonical mind/inner owners increment their revisions for body changes;
    // include the independent reconsideration flag and lifetime scalars too.
    add!(state.minds.minds.as_ref().and_then(|m| m.get(id)).map(|m| (
        m.revision,
        m.last_reflection_at,
        &m.last_dream_episode
    )));
    add!(state.minds.inner_worlds.as_ref().and_then(|m| m.get(id)));
    add!(state.installed.cognition);
    add!(state.activity.learning.get(id));
    Ok((values, storage))
}
struct ItemInputs<'a>(&'a crate::install::RetainedMap);
impl Serialize for ItemInputs<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut out = s.serialize_map(Some(self.0.len()))?;
        for (id, body) in self.0.entries() {
            let body: &RawValue = serde_json::from_str(body).map_err(serde::ser::Error::custom)?;
            out.serialize_entry(id, body)?;
        }
        out.end()
    }
}
fn dependencies(
    state: &SimulationState,
    id: &str,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let manifest: &RawValue = serde_json::from_str(&state.installed.manifest.row.payload)
        .map_err(|_| ExecutionError::Invariant)?;
    let claims = state.inventory.resource_reservations();
    token(
        &(
            state.installed.geometry.spatial.revision,
            state
                .reception
                .knowledge_revisions
                .as_ref()
                .and_then(|owners| owners.get(id)),
            manifest,
            ItemInputs(&state.installed.retained.item_definitions),
            &state.installed.status_policy,
            (claims.parent_present, claims.complete, claims.next_ordinal),
            state
                .minds
                .minds
                .as_ref()
                .and_then(|m| m.get(id))
                .map(|m| m.revision),
            SourceInputs(
                state
                    .experience
                    .optional_collection(id, PersonalSourceKind::Memory)?,
            ),
            SourceInputs(
                state
                    .experience
                    .optional_collection(id, PersonalSourceKind::Awareness)?,
            ),
            SourceInputs(
                state
                    .experience
                    .optional_collection(id, PersonalSourceKind::Summary)?,
            ),
            state.minds.inner_worlds.as_ref().and_then(|m| m.get(id)),
            &state.installed.cognition,
            state.appraisals.content_witness(id),
        ),
        budget,
    )
}
impl MaintenanceCapture {
    pub(crate) fn capture(
        state: &SimulationState,
        request: MaintenanceRequest,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let id = request.actor_id.as_str();
        let entity = state
            .physical
            .entities
            .get(id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let mind = state
            .minds
            .minds
            .as_ref()
            .and_then(|m| m.get(id))
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let inner_revision = state
            .minds
            .inner_worlds
            .as_ref()
            .and_then(|m| m.get(id))
            .map(|inner| inner.revision);
        let memory = memories(state, id)?;
        if memory.is_some_and(|memory| !memory.complete_current_obligations()) {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let (body_fence, body_storage) = encode(&body_fence(&state.installed, actor)?, budget)?;
        let (obligations, obligation_storage) = encode(&Obligations(memory), budget)?;
        let (values, values_storage) = queue_values(state, id, budget)?;
        let (dependencies, dependency_storage) = dependencies(state, id, budget)?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Packet<'a> {
            world_id: &'a str,
            generation: &'a str,
            actor_id: &'a str,
            name: &'a crate::text::JsText,
            alive: bool,
            available: bool,
            reflection_safe: bool,
            body_fence: &'a str,
            has_action: bool,
            active_plan: bool,
            sim_time: f64,
            last_reflection_at: f64,
            #[serde(skip_serializing_if = "Option::is_none")]
            dream: Option<Dream<'a>>,
            learning_pending: bool,
            mind_revision: u64,
            inner_world_revision: Option<u64>,
            last_dream_episode: Option<&'a str>,
            active_obligations_digest: String,
            values: &'a [String],
            dependency_token: &'a str,
            enrolled: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            resident_pressure: Option<bool>,
        }
        let digest_storage = budget.reserve(64)?;
        let packet = Packet {
            world_id: &state.physical.header.id,
            generation: &state.generation,
            actor_id: id,
            name: &entity.name,
            alive: actor.alive,
            available: available(state, id, MaintenancePurpose::Maintenance)?,
            reflection_safe: available(state, id, MaintenancePurpose::Reflection)?,
            body_fence: &body_fence,
            has_action: actor.action.is_some(),
            active_plan: actor
                .agency
                .plan
                .as_ref()
                .is_some_and(|p| p.status == crate::plans::PlanStatus::Active),
            sim_time: state.physical.header.sim_time,
            last_reflection_at: mind.last_reflection_at,
            dream: dream(state, id),
            learning_pending: state
                .activity
                .learning
                .get(id)
                .is_some_and(|cursor| !cursor.pending.is_empty()),
            mind_revision: mind.revision,
            inner_world_revision: inner_revision,
            last_dream_episode: mind.last_dream_episode.as_deref(),
            active_obligations_digest: crate::encoding::sha256_hex(obligations.as_bytes()),
            values: &values,
            dependency_token: &dependencies,
            enrolled: actor.alive
                && entity.has_memory()
                && (state
                    .minds
                    .minds
                    .as_ref()
                    .is_some_and(|m| m.contains_key(id))
                    || state.activity.learning.contains_key(id)),
            resident_pressure: request
                .resident_pressure
                .as_ref()
                .map(|p| resident_pressure(state, p))
                .transpose()?,
        };
        let (packet, packet_storage) = encode(&packet, budget)?;
        drop(digest_storage);
        let mut storage = budget.reserve(
            size_of::<Self>()
                + 2 * size_of::<usize>()
                + state.physical.header.id.len()
                + state.generation.len()
                + request.actor_id.capacity(),
        )?;
        storage.merge(body_storage)?;
        storage.merge(obligation_storage)?;
        storage.merge(packet_storage)?;
        storage.merge(values_storage)?;
        storage.merge(dependency_storage)?;
        Ok(Self {
            request,
            world: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            body_fence,
            obligations,
            mind_revision: mind.revision,
            inner_revision,
            packet,
            values,
            dependencies,
            _storage: storage,
        })
    }
    pub(crate) fn packet(&self) -> &str {
        &self.packet
    }
    pub(crate) fn scope_current(&self, state: &SimulationState) -> bool {
        self.world == state.physical.header.id && self.generation == state.generation
    }
    pub(crate) fn inputs_current(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        if !self.scope_current(state)
            || state
                .physical
                .entities
                .get(&self.request.actor_id)
                .is_none_or(|e| !e.has_memory() || e.actor.as_ref().is_none_or(|a| !a.alive))
        {
            return Ok(false);
        }
        let (values, _storage) = queue_values(state, &self.request.actor_id, budget)?;
        let (dependencies, _dependency_storage) =
            dependencies(state, &self.request.actor_id, budget)?;
        Ok(values == self.values && dependencies == self.dependencies)
    }
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        admission: &MaintenanceAdmission,
    ) -> Result<bool, ExecutionError> {
        if self.world != state.physical.header.id || self.generation != state.generation {
            return Ok(false);
        }
        // Source permits consolidation after body loss when its own source cut
        // remains current. Reflection and learning request the body fence.
        if !admission.requires_body {
            return Ok(true);
        }
        let Some(entity) = state.physical.entities.get(&self.request.actor_id) else {
            return Ok(false);
        };
        let Some(actor) = entity.actor.as_ref() else {
            return Ok(false);
        };
        Ok(available(state, &self.request.actor_id, admission.purpose)?
            && (!matches!(admission.purpose, MaintenancePurpose::Reflection)
                || actor.action.is_none())
            && admission.dream_episode.as_deref().is_none_or(|episode| {
                dream(state, &self.request.actor_id).is_some_and(|dream| dream.episode == episode)
            })
            && json_record_eq(&body_fence(&state.installed, actor)?, &self.body_fence)
                .map_err(|_| ExecutionError::Invariant)?)
    }
    pub(crate) fn obligations_current(
        &self,
        state: &SimulationState,
    ) -> Result<bool, ExecutionError> {
        // Source's host separately checks its captured obligations. The old
        // inner revision belongs to publishInnerWorld's actual revision check;
        // a newer workspace does not mean selected source access was withdrawn.
        Ok(self.world == state.physical.header.id
            && self.generation == state.generation
            && json_record_eq(
                &Obligations(memories(state, &self.request.actor_id)?),
                &self.obligations,
            )
            .map_err(|_| ExecutionError::Invariant)?)
    }
    pub(crate) fn files(
        &self,
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), ExecutionError> {
        if !self.scope_current(state) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let documents = state
            .minds
            .minds
            .as_ref()
            .and_then(|m| m.get(&self.request.actor_id))
            .map_or(&[][..], |mind| mind.documents.as_slice());
        struct Files<'a>(&'a [crate::cognition::MindDocument]);
        impl Serialize for Files<'_> {
            fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                #[derive(Serialize)]
                struct File<'a> {
                    path: String,
                    text: &'a crate::text::JsText,
                }
                let mut out = s.serialize_seq(Some(self.0.len()))?;
                for document in self.0 {
                    out.serialize_element(&File {
                        path: format!("{}.md", document.id),
                        text: &document.text,
                    })?;
                }
                out.end()
            }
        }
        // The only serializer scratch is one actual document path at a time.
        let _path = budget.reserve(
            documents
                .iter()
                .map(|d| 2 * (d.id.len() + 3) + 8)
                .max()
                .unwrap_or(0),
        )?;
        encode(&Files(documents), budget)
    }
}

pub(crate) fn raw_times(
    state: &SimulationState,
    actor: &str,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let awareness = state
        .experience
        .optional_collection(actor, PersonalSourceKind::Awareness)?;
    let memories = memories(state, actor)?;
    struct Times<'a>([Option<&'a PersonalSourceCollection>; 2]);
    impl Serialize for Times<'_> {
        fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
            let mut out = s.serialize_seq(None)?;
            for collection in self.0.into_iter().flatten() {
                for record in collection.records() {
                    out.serialize_element(&record.header().at)?;
                }
            }
            out.end()
        }
    }
    encode(&Times([awareness, memories]), budget)
}
