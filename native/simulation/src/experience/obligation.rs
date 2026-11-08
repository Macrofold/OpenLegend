//! Revision-bound preparation of one actual commitment replacement. Applying it
//! must join the cognition owner's reconsideration/record-resolution journal;
//! preparation alone changes neither the source nor any cognitive record.

use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;

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
