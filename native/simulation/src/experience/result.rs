//! The actual endActivity personal-result branches. Execution history supplies
//! facts; only an acquired recent receipt or admitted source supplies evidence.

use super::*;
use crate::activity::{ActivityError, PendingActivityResult, ResultAccountSource, ResultEvidence};
use crate::attention::ActivityRecordingContext;
use crate::execution::CoreMutation;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{
    GrammaticalPerson, Narration, NarrationPart, PersonRole, render_narration_parts,
};
use crate::received::{
    ActionResultKind, ActionResultOutcome, ActionResultStatus, ActionResultValue, ReceivedError,
    ReceivedFieldClock, ReceivedRole, ReceivedValueFragment, TemporalAppendError,
    TemporalCaptureFacet, TemporalCaptureInput, TemporalChange,
};
use crate::records::RecordSchema;
use crate::state::Named;
use serde::Serialize;

#[derive(Debug)]
pub(crate) enum ResultAcquisitionError {
    Activity(ActivityError),
    Experience(ExperienceError),
    Received(ReceivedError),
    Append(TemporalAppendError),
    Encoding,
    Memory(MemoryAcquisitionError),
    Execution(crate::execution::ExecutionError),
}
impl From<crate::execution::ExecutionError> for ResultAcquisitionError {
    fn from(error: crate::execution::ExecutionError) -> Self {
        Self::Execution(error)
    }
}
impl From<MemoryAcquisitionError> for ResultAcquisitionError {
    fn from(error: MemoryAcquisitionError) -> Self {
        Self::Memory(error)
    }
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

pub(crate) struct PendingRecentResult {
    actor_id: String,
    occurrence_id: String,
    physical_life: u64,
    value: ActionResultValue,
    _reservation: ByteReservation,
}
pub(crate) struct PendingResultMemory {
    actor_id: String,
    occurrence_id: String,
    admission: MemoryAdmission,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultMemoryDraft {
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
    budget: &ByteBudget,
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
        crate::activity::ActivityStatus::Blocked => "blocked",
        _ => return Err(ActivityError::InvalidStructure.into()),
    };
    let now = core.state.physical.header.sim_time;
    let text_bound = crate::activity::activity_record_text_bound(&entry.view)
        .map_err(|_| ResultAcquisitionError::Encoding)?;
    let fact_heap = entry
        .view
        .facts
        .heap_bytes()
        .ok_or(ExperienceError::Capacity)?;
    let producer_bound = text_bound
        .checked_add(fact_heap)
        .and_then(|n| n.checked_add(actor_id.len().checked_mul(8)?))
        .and_then(|n| n.checked_add(actor.name.len().checked_mul(4)?))
        .and_then(|n| n.checked_add(outcome.code.len()))
        .and_then(|n| n.checked_add(1024))
        .and_then(|n| n.checked_mul(8))
        .ok_or(ExperienceError::Capacity)?;
    let reservation = budget
        .reserve(producer_bound)
        .map_err(|_| ExperienceError::Capacity)?;
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
            _reservation: reservation,
        }));
    }
    let event_type = law
        .result_event_type(context.command_type)
        .map(str::to_owned);
    let draft = ResultMemoryDraft {
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
    };
    let draft = json_record(&draft).map_err(|_| ResultAcquisitionError::Encoding)?;
    // Retain only the finite immutable recording facts while the common memory
    // owner mutates this candidate; never clone the action/history collection.
    let command_type = context.command_type.to_owned();
    let code = context.outcome.map(|(_, code)| code.to_owned());
    let recording = ActivityRecordingContext {
        command_type: &command_type,
        status: context.status,
        bound: context.bound,
        effects: context.effects,
        outputs: context.outputs,
        spending: context.spending,
        outcome: context
            .outcome
            .map(|(ok, _)| (ok, code.as_deref().expect("captured outcome code"))),
    };
    let admission = prepare_memory_admission(core, actor_id, draft, Some(recording), budget)?;
    drop(reservation);
    match admission {
        MemoryAdmission::Complete(id) => Ok(ActivityResultAcquisition::Complete(completed(
            actor_id,
            occurrence_id,
            id.map(|id| ResultEvidence::Account {
                source: ResultAccountSource::Memory,
                id,
            }),
        ))),
        admission => Ok(ActivityResultAcquisition::Memory(PendingResultMemory {
            actor_id: actor_id.to_owned(),
            occurrence_id: occurrence_id.to_owned(),
            admission,
        })),
    }
}

/// Own the actual inner receiving boundary. Existing physical receiving stays
/// borrowed; standalone receipt flush completes before later result/account
/// duties and the action owner's completion.
pub(crate) fn acquire_activity_result(
    core: &mut CoreMutation<'_>,
    plan: ActivityResultAcquisition,
    schema: &RecordSchema,
) -> Result<AcquiredActivityResult, ResultAcquisitionError> {
    let now = core.state.physical.header.sim_time;
    match plan {
        ActivityResultAcquisition::Complete(acquired) => Ok(acquired),
        ActivityResultAcquisition::Recent(pending) => {
            let locator = super::receipt::append_personal_receipt(
                core,
                &pending.actor_id,
                pending.physical_life,
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
        ActivityResultAcquisition::Memory(pending) => {
            let evidence = acquire_memory(core, pending.admission, schema)?.map(|id| {
                ResultEvidence::Account {
                    source: ResultAccountSource::Memory,
                    id,
                }
            });
            Ok(completed(
                &pending.actor_id,
                &pending.occurrence_id,
                evidence,
            ))
        }
    }
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
