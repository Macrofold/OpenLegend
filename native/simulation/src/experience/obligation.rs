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
    let value: Value = serde_json::from_str(before.payload())
        .map_err(|_| ExperienceError::InvalidBody("commitment memory"))?;
    let Value::Object(mut body) = value else {
        return Err(ExperienceError::InvalidBody("commitment memory").into());
    };
    let Some(obligation) = body.get("obligation").map(object).transpose()? else {
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
    body.insert("obligation".to_owned(), replacement);
    body.insert("resolved".to_owned(), Value::Bool(resolved));
    let payload = memory::encoded(&body)?;
    let law = state.installed.account_law();
    let header = memory::source_header(&body, actor_id, &payload, &law)?;
    let mut extra = memory::memory_columns(
        &body,
        &header,
        &payload,
        &law,
        &state.installed.attention.value().retention,
        &state.installed.schema,
    )?;
    for cell in &mut extra {
        crate::records::save::normalize_cell(cell);
    }
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
