//! Revision-bound preparation of one actual commitment replacement. Applying it
//! must join the cognition owner's reconsideration/record-resolution journal;
//! preparation alone changes neither the source nor any cognitive record.

use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;
use crate::values::{deserialize_present_option, deserialize_safe_integer, is_safe_record_id};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PromiseAmendment {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    revision: u64,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    cancel: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    due_at: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    completion: Option<AmendedCompletion>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AmendedCompletion {
    event_type: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    definition_id: Option<String>,
}

impl PromiseAmendment {
    pub fn valid_request(&self) -> bool {
        is_safe_record_id(&self.id)
            && self.due_at.is_none_or(f64::is_finite)
            && self.completion.as_ref().is_none_or(|completion| {
                completion.event_type.len() <= 64
                    && completion
                        .target_id
                        .as_deref()
                        .is_none_or(is_safe_record_id)
                    && completion
                        .definition_id
                        .as_deref()
                        .is_none_or(is_safe_record_id)
            })
    }

    pub(crate) fn input_bytes(&self) -> usize {
        self.id.capacity()
            + self.completion.as_ref().map_or(0, |completion| {
                completion.event_type.capacity()
                    + completion.target_id.as_ref().map_or(0, String::capacity)
                    + completion
                        .definition_id
                        .as_ref()
                        .map_or(0, String::capacity)
            })
    }
}

/// The player's editable terms never replace the original words or evidence.
/// This uses the same immutable replacement as event-driven completion.
pub(crate) fn amend_owned_promise(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    edit: &PromiseAmendment,
    budget: &ByteBudget,
) -> Result<bool, crate::execution::ExecutionError> {
    let state = &*core.state;
    if !edit.valid_request()
        || state.physical.header.paused
        || edit
            .due_at
            .is_some_and(|at| at < state.physical.header.sim_time)
        || !state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .is_some_and(|body| body.alive)
    {
        return Ok(false);
    }
    let Some(owner) = state.experience.actor(actor) else {
        return Ok(false);
    };
    let Some(record) = owner
        .collection(PersonalSourceKind::Memory)?
        .get(&edit.id)?
    else {
        return Ok(false);
    };
    let header = record.header();
    if header.record_kind.as_deref() != Some("commitment")
        || !header.unresolved_obligation
        || owner.privacy.revoked(&edit.id)
        || header
            .event_id
            .as_ref()
            .is_some_and(|id| owner.privacy.revoked(id))
    {
        return Ok(false);
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Before {
        obligation: Map<String, Value>,
        entity_ids: Vec<String>,
    }
    let body_workspace = memory::encoded_body_bound(record.payload())?;
    let workspace = edit
        .input_bytes()
        .checked_mul(6)
        .and_then(|bytes| bytes.checked_add(1024))
        .and_then(|bytes| bytes.checked_add(body_workspace))
        .ok_or(ExperienceError::Capacity)?;
    let _decoded = budget.reserve(workspace)?;
    let Before {
        mut obligation,
        entity_ids,
    } = serde_json::from_str(record.payload())
        .map_err(|_| ExperienceError::InvalidBody("commitment obligation"))?;
    let revision = number(&obligation, "revision")?;
    if revision != edit.revision as f64 {
        return Ok(false);
    }
    if let Some(completion) = &edit.completion {
        let event = &completion.event_type;
        if event.is_empty()
            || !event
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte == b'-')
            || !state
                .installed
                .promises
                .value()
                .completion_event_allowed(event)
            || completion
                .target_id
                .as_ref()
                .is_some_and(|id| !entity_ids.contains(id))
            || completion
                .definition_id
                .as_ref()
                .is_some_and(|id| !state.installed.retained.items.contains_key(id))
        {
            return Ok(false);
        }
        obligation.insert(
            "completion".into(),
            serde_json::to_value(completion)
                .map_err(|_| ExperienceError::InvalidBody("commitment completion"))?,
        );
    }
    if let Some(at) = edit.due_at {
        obligation.insert("dueAt".into(), Value::from(at));
    }
    if edit.cancel == Some(true) {
        obligation.insert("status".into(), Value::from("cancelled"));
    }
    obligation.insert("revision".into(), Value::from(revision + 1.0));
    let proposed = crate::encoding::json_record(&obligation)
        .map_err(|_| ExperienceError::InvalidBody("commitment replacement"))?;
    let Some(replacement) =
        prepare_obligation_replacement(state, actor, &edit.id, revision, proposed, budget)?
    else {
        return Ok(false);
    };
    if !apply_obligation_replacement(core, replacement)? {
        return Ok(false);
    }
    if edit.cancel != Some(true) && edit.due_at == Some(core.state.physical.header.sim_time) {
        advance_commitments(core, [], budget)?;
    }
    Ok(true)
}

pub(crate) struct PreparedObligationReplacement {
    before: Arc<PersonalSourceRecord>,
    after: PersonalSourceRecord,
    expected_revision: f64,
    resolved: bool,
    _reservation: ByteReservation,
}
impl PreparedObligationReplacement {
    pub(crate) fn actor_id(&self) -> &str {
        &self.before.header.actor_id
    }
    pub(crate) fn memory_id(&self) -> &str {
        &self.before.header.reference.id
    }
    pub(crate) fn event_id(&self) -> Option<&str> {
        self.before.header.event_id.as_deref()
    }
    pub(crate) fn expected_revision(&self) -> f64 {
        self.expected_revision
    }
    pub(crate) fn resolved(&self) -> bool {
        self.resolved
    }
    pub(crate) fn before(&self) -> &PersonalSourceRecord {
        &self.before
    }
    pub(crate) fn after(&self) -> &PersonalSourceRecord {
        &self.after
    }
}

/// The proposed obligation is one complete native-produced body. Preserve its
/// original fields/ordering; current source identity, location, evidence and all
/// rich memory content come from the actual retained immutable memory.
pub(crate) fn prepare_obligation_replacement(
    state: &SimulationState,
    actor_id: &str,
    memory_id: &str,
    expected_revision: f64,
    proposed: String,
    budget: &ByteBudget,
) -> Result<Option<PreparedObligationReplacement>, MemoryAcquisitionError> {
    if !state
        .physical
        .entities
        .get(actor_id)
        .is_some_and(|entity| entity.has_memory())
    {
        return Ok(None);
    }
    let Some(actor) = state.experience.actor(actor_id) else {
        return Ok(None);
    };
    let Some(before) = actor
        .collection(PersonalSourceKind::Memory)?
        .get(memory_id)?
    else {
        return Ok(None);
    };
    if !before.header.unresolved_commitment {
        return Ok(None);
    }
    let bound = memory::encoded_body_bound(before.payload())?
        .checked_add(memory::encoded_body_bound(&proposed)?)
        .and_then(|bytes| bytes.checked_add(proposed.capacity()))
        .ok_or(ExperienceError::Capacity)?;
    let reservation = budget
        .reserve(bound)
        .map_err(|_| ExperienceError::Capacity)?;
    let mut body = memory::MemoryBody::decode(before.payload())?;
    let projected = body.projection()?;
    let Some(obligation) = projected.get("obligation").map(object).transpose()? else {
        return Ok(None);
    };
    if number(obligation, "revision")? != expected_revision {
        return Ok(None);
    }
    let replacement: Value = serde_json::from_str(&proposed)
        .map_err(|_| ExperienceError::InvalidBody("obligation replacement"))?;
    let proposed_obligation = object(&replacement)?;
    if number(proposed_obligation, "revision")? != expected_revision + 1.0
        || text(proposed_obligation, "evidenceId")? != text(obligation, "evidenceId")?
    {
        return Ok(None);
    }
    let resolved = matches!(
        text(proposed_obligation, "status")?,
        "fulfilled" | "cancelled"
    );
    body.set_raw("obligation", proposed)?;
    body.set("resolved", &resolved)?;
    let payload = body.encoded()?;
    let projected = body.projection()?;
    let law = state.installed.account_law();
    let header = memory::source_header(&projected, actor_id, &payload, &law)?;
    let extra: Vec<crate::records::SqlCell> = memory::memory_columns(
        &projected,
        &header,
        &payload,
        &law,
        &state.installed.attention.value().retention,
        &state.installed.schema,
    )?
    .into_iter()
    .map(Into::into)
    .collect();
    let after = PersonalSourceRecord::install(
        PersonalSourceKind::Memory,
        actor_id,
        InstalledRow {
            id: before.row_id.clone(),
            parent: before.parent.clone(),
            slot: before.slot.clone(),
            position: before.position,
            payload,
            extra,
        },
        &law,
        budget,
    )?;
    Ok(Some(PreparedObligationReplacement {
        before: Arc::clone(before),
        after,
        expected_revision,
        resolved,
        _reservation: reservation,
    }))
}

/// The sole obligation mutation performs accounting, immutable source exchange
/// and actual cognition consequences before reporting success. An error leaves
/// the enclosing candidate to roll back every joined owner.
pub(crate) fn apply_obligation_replacement(
    core: &mut crate::execution::CoreMutation<'_>,
    plan: PreparedObligationReplacement,
) -> Result<bool, crate::execution::ExecutionError> {
    use crate::execution::ExecutionError;
    let actor = plan.actor_id().to_owned();
    let memory = plan.memory_id().to_owned();
    let event = plan.event_id().map(str::to_owned);
    let current = core
        .state
        .experience
        .actor(&actor)
        .ok_or(ExecutionError::Invariant)?
        .collection(PersonalSourceKind::Memory)
        .map_err(|_| ExecutionError::Invariant)?
        .get(&memory)
        .map_err(|_| ExecutionError::Invariant)?;
    if current.is_none_or(|record| record.header.reference != plan.before.header.reference) {
        return Ok(false);
    }
    let now = core.state.physical.header.sim_time;
    let policy = &core.state.installed.attention.value().retention;
    core.state.temporal.adjust_account(
        &actor,
        plan.before.header.class,
        -(plan.before.payload.len() as i128),
        -1,
        None,
        now,
        policy,
    )?;
    core.state.temporal.adjust_account(
        &actor,
        plan.after.header.class,
        plan.after.payload.len() as i128,
        1,
        experience_retention_due(&plan.after.header, policy),
        now,
        policy,
    )?;
    core.journal
        .experience
        .replace(
            &mut core.state.experience,
            &plan.before.header.reference,
            plan.after,
        )
        .map_err(|error| {
            if error == ExperienceError::Capacity {
                ExecutionError::Capacity
            } else {
                ExecutionError::Invariant
            }
        })?;
    core.journal.cognition.apply_obligation_change(
        &mut core.state.minds,
        &actor,
        &memory,
        event.as_deref(),
        plan.resolved,
    )?;
    Ok(true)
}
