//! The one native appendMemory owner. A producer supplies one personally rendered
//! immutable draft, never record identities, SQL cells or a writable world view.
//! Acquisition places the body, derived indexes and account charges together.

use super::*;
use crate::attention::{
    AccountRecordingInput, AccountRecordingLaw, ActivityRecordingContext, RecordingInput,
    RecordingReason, RecordingSource,
};
use crate::execution::CoreMutation;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::values::{
    PersonalAccountFragment, PersonalAccountKind, PersonalAccountSource,
};
use crate::received::{
    ReceivedError, ReceivedFieldClock, ReceivedRole, ReceivedValueFragment, TemporalAppendError,
    TemporalCaptureFacet, TemporalCaptureInput, TemporalChange,
};
use crate::records::RecordSchema;
use std::mem::size_of;

mod body;
mod columns;
pub(super) use body::MemoryBody;
pub(super) use columns::memory_columns;

#[derive(Debug)]
pub(crate) enum MemoryAcquisitionError {
    Experience(ExperienceError),
    Received(ReceivedError),
    Append(TemporalAppendError),
    Encoding,
    Execution(crate::execution::ExecutionError),
}
impl From<crate::execution::ExecutionError> for MemoryAcquisitionError {
    fn from(error: crate::execution::ExecutionError) -> Self {
        Self::Execution(error)
    }
}
impl From<ExperienceError> for MemoryAcquisitionError {
    fn from(error: ExperienceError) -> Self {
        Self::Experience(error)
    }
}
impl From<ReceivedError> for MemoryAcquisitionError {
    fn from(error: ReceivedError) -> Self {
        Self::Received(error)
    }
}
impl From<TemporalAppendError> for MemoryAcquisitionError {
    fn from(error: TemporalAppendError) -> Self {
        Self::Append(error)
    }
}

pub(crate) enum MemoryAdmission {
    Complete(Option<String>),
    Pending(PreparedMemory),
}
pub(crate) struct PreparedMemory {
    actor_id: String,
    physical_life: u64,
    body: MemoryBody,
    budget: ByteBudget,
    _reservation: ByteReservation,
}

fn serialize<T: Serialize>(value: &T) -> Result<Value, MemoryAcquisitionError> {
    serde_json::from_str(&json_record(value).map_err(|_| MemoryAcquisitionError::Encoding)?)
        .map_err(|_| MemoryAcquisitionError::Encoding)
}
/// A scan only sizes decoding; serde remains the JSON grammar/semantic owner.
/// Every structural byte funds a complete Value/key/index cell, while quoted
/// bytes fund decoded strings, escaped encoding and bounded source projections.
/// Charging long prose as one cell per byte would reject ordinary quota-sized
/// optional accounts before their real quota decision could omit them.
pub(crate) fn encoded_body_bound(encoded: &str) -> Result<usize, ExperienceError> {
    let mut quoted = false;
    let mut escaped = false;
    let mut bytes = 0usize;
    for byte in encoded.bytes() {
        let structural = !quoted || (!escaped && byte == b'"');
        bytes = bytes
            .checked_add(if structural { 64 } else { 8 })
            .ok_or(ExperienceError::Capacity)?;
        if quoted {
            if escaped {
                escaped = false
            } else if byte == b'\\' {
                escaped = true
            } else if byte == b'"' {
                quoted = false
            }
        } else if byte == b'"' {
            quoted = true
        }
    }
    bytes
        .checked_add(size_of::<PreparedMemory>())
        .ok_or(ExperienceError::Capacity)
}
pub(super) fn source_header(
    body: &Map<String, Value>,
    actor: &str,
    payload: &str,
    law: &impl AccountRecordingLaw,
) -> Result<PersonalSourceHeader, ExperienceError> {
    header(body, PersonalSourceKind::Memory, actor, payload, law)
}
fn available(
    state: &ExperienceState,
    header: &PersonalSourceHeader,
) -> Result<(), ExperienceError> {
    let actor = state
        .actor(&header.actor_id)
        .ok_or(ExperienceError::ForeignOwner)?;
    if actor.privacy.forgotten_index.contains(&header.reference.id)
        || header
            .event_id
            .as_ref()
            .is_some_and(|id| actor.privacy.forgotten_index.contains(id))
    {
        return Err(ExperienceError::Revoked);
    }
    if actor
        .collection(PersonalSourceKind::Memory)?
        .lookup
        .contains_key(&header.reference.id)
    {
        return Err(ExperienceError::DuplicateIdentity);
    }
    Ok(())
}

/// The supplied draft is trusted native output, already personally rendered.
/// It may retain complete immutable evidence/manifest fields. Derived metadata
/// below is always rebuilt from that same body, never accepted from a caller.
pub(crate) fn prepare_memory_admission(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    draft: String,
    activity: Option<ActivityRecordingContext<'_>>,
    budget: &ByteBudget,
) -> Result<MemoryAdmission, MemoryAcquisitionError> {
    let Some(actor) = core.state.physical.entities.get(actor_id) else {
        return Ok(MemoryAdmission::Complete(None));
    };
    if !actor.has_memory() {
        return Ok(MemoryAdmission::Complete(None));
    }
    let physical_life = actor
        .actor
        .as_ref()
        .ok_or(ExperienceError::ForeignOwner)?
        .physical_life
        .unwrap_or(0);
    let bound = encoded_body_bound(&draft)?
        .checked_add(draft.capacity())
        .ok_or(ExperienceError::Capacity)?;
    let reservation = budget
        .reserve(bound)
        .map_err(|_| ExperienceError::Capacity)?;
    let mut body = MemoryBody::decode(&draft)?;
    for field in ["id", "actorId", "at", "sequence"] {
        if body.contains(field) {
            return Err(ExperienceError::InvalidBody("memory identity is owner-assigned").into());
        }
    }
    let summary = body
        .get::<crate::text::JsText>("summary")?
        .ok_or(ExperienceError::InvalidBody("summary"))?;
    if summary.trim_is_empty() {
        return Ok(MemoryAdmission::Complete(None));
    }
    let projected = body.projection()?;
    let kind = text(&projected, "kind")?.to_owned();
    let source = text(&projected, "source")?.to_owned();
    let importance = number(&projected, "importance")?.clamp(0.0, 10.0);
    if !projected
        .get("entityIds")
        .and_then(Value::as_array)
        .is_some_and(|ids| ids.iter().all(Value::is_string))
    {
        return Err(ExperienceError::InvalidBody("entityIds").into());
    }
    core.journal.experience.ensure_collection(
        &mut core.state.experience,
        PersonalSourceKind::Memory,
        actor_id,
    )?;
    let collection = core
        .state
        .experience
        .actor(actor_id)
        .ok_or(ExperienceError::ForeignOwner)?
        .collection(PersonalSourceKind::Memory)?;
    if let Some(event) = optional_text(&projected, "eventId")?.filter(|event| !event.is_empty()) {
        // A cold resident tail cannot prove that an earlier matching memory is
        // absent, nor that a later resident duplicate is the first source.
        if !collection.coverage.complete {
            return Err(ExperienceError::UnknownCoverage.into());
        }
        if let Some(prior) = collection.by_ordinal.values().find(|record| {
            record.header.event_id.as_deref() == Some(event.as_str())
                && record.header.record_kind.as_deref() == Some(kind.as_str())
        }) {
            return Ok(MemoryAdmission::Complete(Some(
                prior.header.reference.id.clone(),
            )));
        }
    }
    let id = core
        .state
        .physical
        .identity
        .allocate("memory")
        .map_err(|_| ReceivedError("Personal memory identity is exhausted."))?
        .id;
    body.set("id", &id)?;
    body.set("actorId", &actor_id)?;
    body.set("at", &core.state.physical.header.sim_time)?;
    body.set("sequence", &core.state.physical.identity.next_id())?;
    body.set("importance", &importance)?;
    let law = core.state.installed.account_law();
    let reason = law.recording_reason(RecordingInput {
        source: RecordingSource::Memory,
        event_type: projected.get("eventType").and_then(Value::as_str),
        modality: Some(&source),
        trigger_kind: None,
        own: true,
        has_exposure: false,
        exposure_kind: None,
        consequence: projected
            .get("activityId")
            .and_then(Value::as_str)
            .is_some_and(|id| !id.is_empty())
            || body.contains("obligation")
            || matches!(source.as_str(), "felt" | "internal"),
    });
    // The source issues its ID even when the selected world's recording law
    // declines autobiography; it does not synthesize a recent receipt then.
    if reason == RecordingReason::None {
        return Ok(MemoryAdmission::Complete(None));
    }
    let retention = ExperienceRetention {
        reason: if kind == "reflection" || matches!(source.as_str(), "inferred" | "self_thought") {
            RetentionReason::Interpretation
        } else {
            RetentionReason::Consequence
        },
        after_release: law.account_after_release(AccountRecordingInput {
            source: RecordingSource::Memory,
            own: true,
            event_type: projected.get("eventType").and_then(Value::as_str),
            activity,
        }),
        required: (reason == RecordingReason::Required).then_some(true),
        receipt: None,
    };
    body.set("retention", &retention)?;
    let payload = body.encoded()?;
    let projected = body.projection()?;
    let header = source_header(&projected, actor_id, &payload, &law)?;
    let policy = &core.state.installed.attention.value().retention;
    let mut quota = core.state.temporal.account_addition_budget(actor_id)?;
    if !quota.reserve(header.class, payload.len() as u64, policy)? {
        if header.class != AccountClass::Optional {
            return Err(
                ReceivedError("Required personal experience could not be recorded.").into(),
            );
        }
        core.state
            .temporal
            .account_recording_gap(actor_id, core.state.physical.header.sim_time)?;
        return Ok(MemoryAdmission::Complete(None));
    }
    available(&core.state.experience, &header)?;
    Ok(MemoryAdmission::Pending(PreparedMemory {
        actor_id: actor_id.to_owned(),
        physical_life,
        body,
        budget: budget.clone(),
        _reservation: reservation,
    }))
}

pub(crate) fn acquire_memory(
    core: &mut CoreMutation<'_>,
    admission: MemoryAdmission,
    schema: &RecordSchema,
) -> Result<Option<String>, MemoryAcquisitionError> {
    let MemoryAdmission::Pending(mut pending) = admission else {
        let MemoryAdmission::Complete(id) = admission else {
            unreachable!()
        };
        return Ok(id);
    };
    let now = core.state.physical.header.sim_time;
    let installed = Arc::clone(&core.state.installed);
    let law = installed.account_law();
    let policy = &installed.attention.value().retention;
    let projected = pending.body.projection()?;
    let id = text(&projected, "id")?.to_owned();
    let at = number(&projected, "at")?;
    let context_subjects = columns::context_subjects(&projected)?;
    let source_ids = std::iter::once(id.clone())
        .chain(optional_text(&projected, "eventId")?)
        .collect();
    let required = projected
        .get("retention")
        .and_then(Value::as_object)
        .and_then(|value| value.get("required"))
        .and_then(Value::as_bool)
        == Some(true);
    let locator = super::receipt::append_personal_receipt(
        core,
        &pending.actor_id,
        pending.physical_life,
        TemporalCaptureInput {
            spatial_context: false,
            availability_at: None,
            coverage_gap: None,
            ended_fields: None,
            terminal_reservation_bytes: None,
            terminal_reservation_delta: None,
            received_at: None,
            received_order: None,
            availability: None,
            receiver_frame: None,
            subject: id.clone(),
            context_subjects: (!context_subjects.is_empty()).then_some(context_subjects),
            subject_identity: None,
            change: TemporalChange::Occurrence,
            required,
            source_ids,
            origin: None,
            facets: vec![TemporalCaptureFacet {
                value: ReceivedValueFragment::PersonalAccount(PersonalAccountFragment {
                    kind: PersonalAccountKind::PersonalAccount,
                    source: PersonalAccountSource::Memory,
                    id: id.clone(),
                    text: pending
                        .body
                        .get("summary")?
                        .ok_or(ExperienceError::InvalidBody("summary"))?,
                    event_type: optional_text(&projected, "eventType")?
                        .filter(|kind| !kind.is_empty()),
                    content: None,
                    data: None,
                }),
                preferred: None,
                reception: None,
                clock: ReceivedFieldClock {
                    role: ReceivedRole::Direct,
                    as_of: at,
                    measured_from: at,
                    measured_through: at,
                    acquired_at: now,
                    confirmed_through: None,
                },
                member_index: None,
                track: None,
                support: None,
                detail_support: None,
                pose_frame: None,
                original: None,
                received_from: None,
            }],
        },
    )?;
    if let Some(locator) = locator {
        pending.body.set("sourceReceipt", &locator)?;
        let mut retention: ExperienceRetention = pending
            .body
            .get("retention")?
            .ok_or(ExperienceError::InvalidBody("retention"))?;
        retention.receipt = Some(locator);
        pending.body.set("retention", &retention)?;
    }
    let payload = pending.body.encoded()?;
    let projected = pending.body.projection()?;
    let header = source_header(&projected, &pending.actor_id, &payload, &law)?;
    let mut quota = core
        .state
        .temporal
        .account_addition_budget(&pending.actor_id)?;
    if !quota.reserve(header.class, payload.len() as u64, policy)? {
        if header.class != AccountClass::Optional {
            return Err(
                ReceivedError("Required personal experience could not be recorded.").into(),
            );
        }
        core.state
            .temporal
            .account_recording_gap(&pending.actor_id, now)?;
        return Ok(None);
    }
    available(&core.state.experience, &header)?;
    let position = core
        .state
        .experience
        .actor(&pending.actor_id)
        .ok_or(ExperienceError::ForeignOwner)?
        .collection(PersonalSourceKind::Memory)?
        .coverage
        .next_ordinal;
    let parent = collection_owner(PersonalSourceKind::Memory, &pending.actor_id)?;
    let extra: Vec<crate::records::SqlCell> =
        memory_columns(&projected, &header, &payload, &law, policy, schema)?
            .into_iter()
            .map(Into::into)
            .collect();
    let record = PersonalSourceRecord::install(
        PersonalSourceKind::Memory,
        &pending.actor_id,
        InstalledRow {
            id: json_record(&["world", "memories", &pending.actor_id, &id])
                .map_err(|_| MemoryAcquisitionError::Encoding)?,
            parent,
            slot: position.to_string(),
            position,
            payload,
            extra,
        },
        &law,
    )?;
    let capsules = columns::known_place_capsules(
        &projected,
        pending.body.originals()?,
        &pending.actor_id,
        now,
    )?;
    core.state.temporal.adjust_account(
        &pending.actor_id,
        header.class,
        record.payload.len() as i128,
        1,
        experience_retention_due(&header, policy),
        now,
        policy,
    )?;
    core.journal
        .experience
        .append(&mut core.state.experience, record)?;
    core.journal.experience.acquire_known_place_capsules(
        &mut core.state.experience,
        &pending.actor_id,
        &capsules,
        &core.state.installed.personal_evidence_preparation,
        &pending.budget,
    )?;
    Ok(Some(id))
}
