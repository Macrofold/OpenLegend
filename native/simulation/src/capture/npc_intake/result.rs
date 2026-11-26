//! Facts consumed by the selected world's existing prepared-result predicate.
//! A completed occurrence is distinct from personal access to its result.
use super::*;
use crate::activity::{ActivityStatus, ResultEvidence};
use crate::values::DefinitionPin;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PreparedResult<'a> {
    reference: Option<&'a ResultEvidence>,
    forgotten: bool,
    plan_reference: Option<&'a ResultEvidence>,
    plan_purpose: Option<&'a DefinitionPin>,
    internal_memory: bool,
    occurrence: Option<Occurrence<'a>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Occurrence<'a> {
    id: &'a str,
    command_type: &'static str,
    status: ActivityStatus,
    revoked: bool,
    forgotten: bool,
    purpose: Option<&'a DefinitionPin>,
}

pub struct ScheduleResult {
    pub reference: Option<ResultEvidence>,
    pub forgotten: bool,
    pub plan_reference: Option<ResultEvidence>,
    pub plan_purpose: Option<DefinitionPin>,
    pub internal_memory: bool,
    pub occurrence: Option<ScheduleOccurrence>,
}

pub struct ScheduleOccurrence {
    pub command_type: &'static str,
    pub running: bool,
    pub revoked: bool,
    pub forgotten: bool,
    pub purpose: Option<DefinitionPin>,
}

impl PreparedResult<'_> {
    pub(super) fn schedule_bytes(&self) -> Option<usize> {
        let pin_bytes = |pin: Option<&DefinitionPin>| {
            pin.map_or(Some(0), |pin| pin.id.len().checked_add(pin.digest.len()))
        };
        crate::host::retained_size::heap_sum([
            self.reference.map_or(Some(0), HeapBytes::heap_bytes)?,
            self.plan_reference.map_or(Some(0), HeapBytes::heap_bytes)?,
            pin_bytes(self.plan_purpose)?,
            pin_bytes(self.occurrence.as_ref().and_then(|item| item.purpose))?,
        ])
    }

    pub(super) fn into_schedule(self) -> ScheduleResult {
        ScheduleResult {
            reference: self.reference.cloned(),
            forgotten: self.forgotten,
            plan_reference: self.plan_reference.cloned(),
            plan_purpose: self.plan_purpose.cloned(),
            internal_memory: self.internal_memory,
            occurrence: self.occurrence.map(|item| ScheduleOccurrence {
                command_type: item.command_type,
                running: item.status == ActivityStatus::Running,
                revoked: item.revoked,
                forgotten: item.forgotten,
                purpose: item.purpose.cloned(),
            }),
        }
    }
}

pub(super) fn capture<'a>(
    state: &'a SimulationState,
    actor: &'a crate::state::ActorState,
    id: &str,
    budget: &ByteBudget,
) -> Result<(PreparedResult<'a>, ByteReservation), ExecutionError> {
    let reference = actor.agency.last_result_evidence.as_ref();
    let guard = budget.reserve(
        reference
            .map_or(Some(0), ResultEvidence::id_len)
            .and_then(|n| n.checked_mul(2))
            .and_then(|n| n.checked_add(8))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let result_id = reference.map(ResultEvidence::id);
    let privacy = state.experience.actor(id).map(|history| &history.privacy);
    let forgotten = result_id
        .as_ref()
        .is_some_and(|id| privacy.is_some_and(|privacy| privacy.is_forgotten(id)));
    let collection = state.activity.collections.get(id);
    let occurrence = reference
        .and_then(|reference| {
            collection.and_then(|collection| {
                collection
                    .order
                    .values()
                    .filter_map(|id| collection.records.get(id))
                    .find(|record| record.occurrence.result_evidence.as_ref() == Some(reference))
            })
        })
        .map(|record| {
            let occurrence = &record.occurrence;
            Occurrence {
                id: &occurrence.id,
                command_type: occurrence.command.kind(),
                status: occurrence.status,
                revoked: occurrence.revoked.unwrap_or(false),
                forgotten: privacy.is_some_and(|privacy| privacy.is_forgotten(&occurrence.id)),
                purpose: occurrence
                    .command
                    .envelope()
                    .chosen_purpose
                    .as_ref()
                    .map(|purpose| &purpose.definition),
            }
        });
    let memories = state
        .experience
        .optional_collection(id, PersonalSourceKind::Memory)?;
    let internal_memory = result_id.as_ref().is_some_and(|result| {
        memories.is_some_and(|collection| {
            collection.records().any(|record| {
                record.header().reference.id == *result
                    && record.header().actor_id == id
                    && record.header().source.as_deref() == Some("internal")
            })
        })
    });
    Ok((
        PreparedResult {
            reference,
            forgotten,
            plan_reference: actor
                .agency
                .plan
                .as_ref()
                .and_then(|plan| plan.result_evidence.as_ref()),
            plan_purpose: None,
            internal_memory,
            occurrence,
        },
        guard,
    ))
}
