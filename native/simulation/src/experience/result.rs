//! The actual endActivity personal-result branches. Execution history supplies
//! facts; only an acquired recent receipt or admitted source supplies evidence.

use super::*;
use crate::activity::{ActivityError, PendingActivityResult, ResultAccountSource, ResultEvidence};
use crate::attention::{
    AccountRecordingInput, AccountRecordingLaw, ActivityRecordingContext, RecordingInput,
    RecordingReason, RecordingSource,
};
use crate::execution::CoreMutation;
use crate::narration::{
    GrammaticalPerson, Narration, NarrationPart, PersonRole, render_narration_parts,
};
use crate::received::values::{
    PersonalAccountFragment, PersonalAccountKind, PersonalAccountSource,
};
use crate::received::{
    ActionResultKind, ActionResultOutcome, ActionResultStatus, ActionResultValue, ReceivedError,
    ReceivedFieldClock, ReceivedRole, ReceivedTransition, ReceivedValueFragment,
    TemporalAcquisition, TemporalAppendError, TemporalCaptureFacet, TemporalCaptureInput,
    TemporalChange,
};
use crate::records::{InstalledRow, RecordSchema};
use crate::state::Named;
use serde::Serialize;

#[derive(Debug)]
pub(crate) enum ResultAcquisitionError {
    Activity(ActivityError),
    Experience(ExperienceError),
    Received(ReceivedError),
    Append(TemporalAppendError),
    Encoding,
}
impl From<ActivityError> for ResultAcquisitionError {
    fn from(e: ActivityError) -> Self {
        Self::Activity(e)
    }
}
impl From<ExperienceError> for ResultAcquisitionError {
    fn from(e: ExperienceError) -> Self {
        Self::Experience(e)
    }
}
impl From<ReceivedError> for ResultAcquisitionError {
    fn from(e: ReceivedError) -> Self {
        Self::Received(e)
    }
}
impl From<TemporalAppendError> for ResultAcquisitionError {
    fn from(e: TemporalAppendError) -> Self {
        Self::Append(e)
    }
}

pub(crate) enum ActivityResultAcquisition {
    Complete(AcquiredActivityResult),
    Recent(PendingRecentResult),
    Memory(PendingResultMemory),
}
impl ActivityResultAcquisition {
    pub(crate) fn scope_owner(&self) -> Option<(&str, u64)> {
        match self {
            Self::Complete(_) => None,
            Self::Recent(pending) => Some((&pending.actor_id, pending.physical_life)),
            Self::Memory(pending) => Some((&pending.body.actor_id, pending.physical_life)),
        }
    }
}
pub(crate) struct PendingRecentResult {
    actor_id: String,
    occurrence_id: String,
    physical_life: u64,
    value: ActionResultValue,
}
pub(crate) struct PendingResultMemory {
    occurrence_id: String,
    physical_life: u64,
    body: ResultMemory,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultMemory {
    kind: &'static str,
    source: &'static str,
    importance: f64,
    activity_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    event_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker_id: Option<String>,
    summary: String,
    entity_ids: Vec<String>,
    id: String,
    actor_id: String,
    at: f64,
    sequence: u64,
    retention: ExperienceRetention,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_receipt: Option<TemporalReceiptLocator>,
}

fn completed(
    actor_id: &str,
    occurrence_id: &str,
    evidence: Option<ResultEvidence>,
) -> AcquiredActivityResult {
    AcquiredActivityResult {
        actor_id: actor_id.to_owned(),
        occurrence_id: occurrence_id.to_owned(),
        evidence,
    }
}

/// Preparation runs after the existing action owner applies its actual result.
/// Bypasses preserve the original pointer. An admitted receipt branch explicitly
/// asks the caller for its real active actor scope rather than forcing a flush.
pub(crate) fn prepare_activity_result(
    core: &mut CoreMutation<'_>,
    pending: &PendingActivityResult,
) -> Result<ActivityResultAcquisition, ResultAcquisitionError> {
    let entry = pending.occurrence(&core.state.activity)?;
    let actor_id = pending.actor_id();
    let occurrence_id = pending.occurrence_id();
    let actor = core
        .state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExperienceError::ForeignOwner)?;
    let body = actor.actor.as_ref().ok_or(ExperienceError::ForeignOwner)?;
    let prior = entry.result_evidence.clone();
    if entry.revoked.unwrap_or(false)
        || core
            .state
            .experience
            .actor(actor_id)
            .is_some_and(|history| history.privacy.forgotten_index.contains(occurrence_id))
    {
        return Ok(ActivityResultAcquisition::Complete(completed(
            actor_id,
            occurrence_id,
            prior,
        )));
    }
    let has_memory = actor.has_memory();
    let law = core.state.installed.account_law();
    let context = ActivityRecordingContext::from_occurrence(entry);
    let routine = has_memory
        && law.routine_result(
            &core.state.physical,
            &core.state.experience,
            actor_id,
            context,
        )?;
    if !routine && (prior.is_some() || !has_memory) {
        return Ok(ActivityResultAcquisition::Complete(completed(
            actor_id,
            occurrence_id,
            prior,
        )));
    }
    let outcome = entry
        .outcome
        .as_ref()
        .ok_or(ActivityError::InvalidStructure)?;
    let status = match entry.status {
        crate::activity::ActivityStatus::Completed => "completed",
        crate::activity::ActivityStatus::Cancelled => "cancelled",
        _ => return Err(ActivityError::InvalidStructure.into()),
    };
    let now = core.state.physical.header.sim_time;
    let exact = crate::activity::activity_record_text(&entry.view)
        .map_err(|_| ResultAcquisitionError::Encoding)?;
    let time = json_record(&now).map_err(|_| ResultAcquisitionError::Encoding)?;
    let mut names = IndexMap::new();
    names.insert(
        actor_id.to_owned(),
        Named {
            name: actor.name.clone(),
            name_form: actor.name_form.clone(),
            indefinite_article: actor.indefinite_article.clone(),
        },
    );
    let text = render_narration_parts(
        &Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: actor_id.to_owned(),
                    role: PersonRole::Possessive,
                    article: None,
                },
                NarrationPart::Literal(format!(
                    " action {status} at simulation time {time}: {exact}"
                )),
            ],
        },
        &names,
        Some(actor_id),
        GrammaticalPerson::First,
    );
    let physical_life = body.physical_life.unwrap_or(0);
    if routine {
        return Ok(ActivityResultAcquisition::Recent(PendingRecentResult {
            actor_id: actor_id.to_owned(),
            occurrence_id: occurrence_id.to_owned(),
            physical_life,
            value: ActionResultValue {
                kind: ActionResultKind::ActionResult,
                id: occurrence_id.to_owned(),
                text,
                status: if outcome.ok {
                    ActionResultStatus::Completed
                } else {
                    ActionResultStatus::Cancelled
                },
                outcome: ActionResultOutcome {
                    ok: outcome.ok,
                    code: outcome.code.clone(),
                },
                facts: entry.view.facts.clone(),
            },
        }));
    }
    let event_type = law
        .result_event_type(context.command_type)
        .map(str::to_owned);
    let reason = law.recording_reason(RecordingInput {
        source: RecordingSource::Memory,
        event_type: event_type.as_deref(),
        modality: Some("internal"),
        trigger_kind: None,
        own: true,
        has_exposure: false,
        exposure_kind: None,
        consequence: true,
    });
    // appendMemory issues its actual identity even when the world's later
    // optional recording decision declines the resulting autobiography.
    let id = core
        .state
        .physical
        .identity
        .allocate("memory")
        .map_err(|_| ReceivedError("Personal memory identity is exhausted."))?
        .id;
    if reason == RecordingReason::None {
        return Ok(ActivityResultAcquisition::Complete(completed(
            actor_id,
            occurrence_id,
            None,
        )));
    }
    let retention = ExperienceRetention {
        reason: RetentionReason::Consequence,
        after_release: law.account_after_release(AccountRecordingInput {
            source: RecordingSource::Memory,
            own: true,
            event_type: event_type.as_deref(),
            activity: Some(context),
        }),
        required: (reason == RecordingReason::Required).then_some(true),
        receipt: None,
    };
    let memory = ResultMemory {
        kind: "episode",
        source: "internal",
        importance: core
            .state
            .installed
            .cognition
            .recording
            .action_result_importance,
        activity_id: occurrence_id.to_owned(),
        speaker_id: event_type.as_ref().map(|_| actor_id.to_owned()),
        event_type,
        summary: text,
        entity_ids: vec![actor_id.to_owned()],
        id,
        actor_id: actor_id.to_owned(),
        at: now,
        sequence: core.state.physical.identity.next_id(),
        retention,
        source_receipt: None,
    };
    let payload = json_record(&memory).map_err(|_| ResultAcquisitionError::Encoding)?;
    let header = source_header(&memory, &payload, &law)?;
    ensure_new_source(&core.state.experience, &header)?;
    let policy = &core.state.installed.attention.value().retention;
    let mut budget = core.state.temporal.account_addition_budget(actor_id)?;
    if !budget.reserve(header.class, payload.len() as u64, policy)? {
        if header.class != AccountClass::Optional {
            return Err(
                ReceivedError("Required personal experience could not be recorded.").into(),
            );
        }
        core.state.temporal.account_recording_gap(actor_id, now)?;
        return Ok(ActivityResultAcquisition::Complete(completed(
            actor_id,
            occurrence_id,
            None,
        )));
    }
    Ok(ActivityResultAcquisition::Memory(PendingResultMemory {
        occurrence_id: occurrence_id.to_owned(),
        physical_life,
        body: memory,
    }))
}

/// This phase uses the caller's actual existing/lazily opened acquisition. Its
/// receipt remains owned there until the source's real flush boundary; IDs and
/// work charges are therefore not moved ahead of later action finalization.
pub(crate) fn acquire_activity_result(
    core: &mut CoreMutation<'_>,
    plan: ActivityResultAcquisition,
    scope: &mut TemporalAcquisition,
    transition: &mut ReceivedTransition,
    schema: &RecordSchema,
) -> Result<AcquiredActivityResult, ResultAcquisitionError> {
    let now = core.state.physical.header.sim_time;
    let sequence = core.state.physical.header.sequence;
    let law = core.state.installed.account_law();
    match plan {
        ActivityResultAcquisition::Complete(acquired) => Ok(acquired),
        ActivityResultAcquisition::Recent(pending) => {
            let values = core
                .state
                .reception
                .received_values
                .as_mut()
                .ok_or(ReceivedError(
                    "Actual received value ownership is unavailable.",
                ))?;
            require_scope(scope, &pending.actor_id, pending.physical_life)?;
            let locator = scope
                .append(
                    &mut core.state.temporal,
                    values,
                    &mut core.state.physical.identity,
                    transition,
                    &law,
                    &mut core.journal.meters,
                    now,
                    sequence,
                    input(
                        &pending.occurrence_id,
                        true,
                        now,
                        ReceivedValueFragment::ActionResult(pending.value),
                    ),
                )?
                .ok_or(ReceivedError(
                    "Required personal result could not be received.",
                ))?;
            Ok(completed(
                &pending.actor_id,
                &pending.occurrence_id,
                Some(ResultEvidence::Recent {
                    subject: pending.occurrence_id.clone(),
                    receipt: locator,
                }),
            ))
        }
        ActivityResultAcquisition::Memory(mut pending) => {
            let values = core
                .state
                .reception
                .received_values
                .as_mut()
                .ok_or(ReceivedError(
                    "Actual received value ownership is unavailable.",
                ))?;
            let actor_id = &pending.body.actor_id;
            require_scope(scope, actor_id, pending.physical_life)?;
            let locator = scope.append(
                &mut core.state.temporal,
                values,
                &mut core.state.physical.identity,
                transition,
                &law,
                &mut core.journal.meters,
                now,
                sequence,
                input(
                    &pending.body.id,
                    pending.body.retention.required == Some(true),
                    pending.body.at,
                    ReceivedValueFragment::PersonalAccount(PersonalAccountFragment {
                        kind: PersonalAccountKind::PersonalAccount,
                        source: PersonalAccountSource::Memory,
                        id: pending.body.id.clone(),
                        text: pending.body.summary.clone(),
                        event_type: pending.body.event_type.clone(),
                        content: None,
                        data: None,
                    }),
                ),
            )?;
            if let Some(locator) = locator {
                pending.body.source_receipt = Some(locator.clone());
                pending.body.retention.receipt = Some(locator);
            }
            let payload =
                json_record(&pending.body).map_err(|_| ResultAcquisitionError::Encoding)?;
            let header = source_header(&pending.body, &payload, &law)?;
            ensure_new_source(&core.state.experience, &header)?;
            let policy = &core.state.installed.attention.value().retention;
            let mut budget = core.state.temporal.account_addition_budget(actor_id)?;
            if !budget.reserve(header.class, payload.len() as u64, policy)? {
                if header.class != AccountClass::Optional {
                    return Err(ReceivedError(
                        "Required personal experience could not be recorded.",
                    )
                    .into());
                }
                core.state.temporal.account_recording_gap(actor_id, now)?;
                return Ok(completed(actor_id, &pending.occurrence_id, None));
            }
            let collection = core
                .state
                .experience
                .actor(actor_id)
                .ok_or(ExperienceError::ForeignOwner)?
                .collection(PersonalSourceKind::Memory)?;
            let parent = collection_owner(PersonalSourceKind::Memory, actor_id)?;
            let row_id = json_record(&["world", "memories", actor_id, &pending.body.id])
                .map_err(|_| ResultAcquisitionError::Encoding)?;
            let mut extra = columns(
                &pending.body,
                &header,
                &payload,
                law.account_priority(&header),
                policy,
                schema,
            )?;
            for cell in &mut extra {
                crate::records::save::normalize_cell(cell);
            }
            let record = PersonalSourceRecord::install(
                PersonalSourceKind::Memory,
                actor_id,
                InstalledRow {
                    id: row_id,
                    parent,
                    slot: collection.coverage.next_ordinal.to_string(),
                    position: collection.coverage.next_ordinal,
                    payload,
                    extra,
                },
                &law,
            )?;
            core.state.temporal.adjust_account(
                actor_id,
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
            Ok(completed(
                actor_id,
                &pending.occurrence_id,
                Some(ResultEvidence::Account {
                    source: ResultAccountSource::Memory,
                    id: pending.body.id,
                }),
            ))
        }
    }
}

fn source_header(
    memory: &ResultMemory,
    payload: &str,
    law: &impl AccountRecordingLaw,
) -> Result<PersonalSourceHeader, ExperienceError> {
    let body: Value = serde_json::from_str(payload)
        .map_err(|_| ExperienceError::InvalidBody("new result memory"))?;
    header(
        object(&body)?,
        PersonalSourceKind::Memory,
        &memory.actor_id,
        payload,
        law,
    )
}
fn ensure_new_source(
    state: &ExperienceState,
    header: &PersonalSourceHeader,
) -> Result<(), ExperienceError> {
    let actor = state
        .actor(&header.actor_id)
        .ok_or(ExperienceError::ForeignOwner)?;
    if actor.privacy.forgotten_index.contains(&header.reference.id) {
        return Err(ExperienceError::Revoked);
    }
    let source = actor.collection(PersonalSourceKind::Memory)?;
    if source.lookup.contains_key(&header.reference.id) {
        return Err(ExperienceError::DuplicateIdentity);
    }
    Ok(())
}
fn require_scope(scope: &TemporalAcquisition, actor: &str, life: u64) -> Result<(), ReceivedError> {
    if scope.actor_id() != actor || scope.physical_life() != life {
        return Err(ReceivedError(
            "Personal result has foreign acquisition ownership.",
        ));
    }
    Ok(())
}
fn input(
    subject: &str,
    required: bool,
    at: f64,
    value: ReceivedValueFragment,
) -> TemporalCaptureInput {
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
        subject: subject.to_owned(),
        context_subjects: None,
        subject_identity: None,
        change: TemporalChange::Occurrence,
        required,
        source_ids: vec![subject.to_owned()],
        origin: None,
        facets: vec![TemporalCaptureFacet {
            value,
            preferred: None,
            reception: None,
            clock: ReceivedFieldClock {
                role: ReceivedRole::Direct,
                as_of: at,
                measured_from: at,
                measured_through: at,
                acquired_at: at,
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
    }
}
fn columns(
    memory: &ResultMemory,
    header: &PersonalSourceHeader,
    payload: &str,
    priority: u64,
    policy: &crate::attention::AttentionRetentionPolicy,
    schema: &RecordSchema,
) -> Result<Vec<Value>, ResultAcquisitionError> {
    schema
        .layout("mind_memories")
        .map_err(|_| ResultAcquisitionError::Encoding)?
        .columns
        .iter()
        .map(|column| {
            Ok(match column.as_str() {
                "actor_id" => Value::from(memory.actor_id.clone()),
                "source_id" => Value::from(memory.id.clone()),
                "at" => Value::from(memory.at),
                "importance" => Value::from(memory.importance),
                "event_id" => Value::Null,
                "kind" => Value::from(memory.kind),
                "sequence" => Value::from(memory.sequence),
                "individual_ids" => Value::Array(vec![]),
                "retention_metadata" => {
                    serde_json::json!({"aliases":[],"versions":[],"learning":[]})
                }
                "account_revision" => Value::from(header.reference.revision.clone()),
                "logical_bytes" => Value::from(payload.len() as u64),
                "retention_class" => serde_json::to_value(header.class)
                    .map_err(|_| ResultAcquisitionError::Encoding)?,
                "policy_priority" => Value::from(priority),
                "active_or_protected" => Value::from(u64::from(header.protected)),
                "next_due_at" => {
                    experience_retention_due(header, policy).map_or(Value::Null, Value::from)
                }
                "retention_reason" => serde_json::to_value(memory.retention.reason)
                    .map_err(|_| ResultAcquisitionError::Encoding)?,
                "retention_required" => {
                    Value::from(u64::from(memory.retention.required == Some(true)))
                }
                "unresolved" => Value::from(0),
                "expires_at" | "weaken_at" => Value::Null,
                _ => return Err(ResultAcquisitionError::Encoding),
            })
        })
        .collect()
}
