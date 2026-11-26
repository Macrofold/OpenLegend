//! A work result address requests its own personally acquired account. It is not
//! evidence that execution succeeded and never renews an old receipt or body.
use crate::activity::ResultEvidence;
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::SimulationState;
use crate::state::ActorAgency;
use serde::Serialize;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RequiredResult<'a> {
    evidence: &'a ResultEvidence,
    recent_eligible: bool,
}
impl<'a> RequiredResult<'a> {
    pub(super) fn evidence(&self) -> &'a ResultEvidence {
        self.evidence
    }
}
pub(super) struct RequiredResults<'a> {
    values: Vec<RequiredResult<'a>>,
    _reservation: ByteReservation,
}
impl<'a> RequiredResults<'a> {
    pub(super) fn values(&self) -> &[RequiredResult<'a>] {
        &self.values
    }
}
fn references(agency: &ActorAgency) -> impl Iterator<Item = &ResultEvidence> {
    agency
        .last_result_evidence
        .iter()
        .chain(
            [agency.plan.as_ref(), agency.suspended_plan()]
                .into_iter()
                .flatten()
                .flat_map(|plan| {
                    plan.result_evidence.iter().chain(
                        plan.steps
                            .iter()
                            .filter_map(|step| step.result_evidence.as_ref()),
                    )
                }),
        )
        .chain(
            agency
                .history
                .iter()
                .filter_map(|step| step.result_evidence.as_ref()),
        )
}
pub(super) fn capture<'a>(
    state: &'a SimulationState,
    actor_id: &str,
    agency: &'a ActorAgency,
    budget: &ByteBudget,
) -> Result<RequiredResults<'a>, ExecutionError> {
    let maximum = references(agency).count();
    let bytes = maximum
        .checked_mul(size_of::<RequiredResult<'_>>())
        .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(bytes)?;
    let mut values = Vec::<RequiredResult<'_>>::new();
    values
        .try_reserve_exact(maximum)
        .map_err(|_| ExecutionError::Capacity)?;
    for evidence in references(agency) {
        // The installed plan/step/history quotas bound this tiny address list;
        // comparisons keep borrowed references without another key catalogue.
        if values.iter().any(|value| value.evidence == evidence) {
            continue;
        }
        let recent_eligible = evidence.recent_eligible(state, actor_id, budget)?;
        values.push(RequiredResult {
            evidence,
            recent_eligible,
        });
    }
    Ok(RequiredResults {
        values,
        _reservation: reservation,
    })
}
