use super::*;
use crate::cognition::consolidation::{
    CompletedConsolidation, ConsolidationAnswer, ConsolidationCursor, ConsolidationStep,
};
#[derive(Clone, Copy)]
pub(super) enum ConsolidationReply {
    Sources,
    Dream,
    Format,
    Collation,
}
pub(super) fn poll_consolidation(
    cursor: &mut ConsolidationCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    route: Option<ConsolidationReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedConsolidation, ConsolidationReply>, DriveError> {
    let supplied = match route {
        Some(ConsolidationReply::Dream) => {
            let Answer::MaintenanceFormat(a) = direct(answer, ProviderKind::MaintenanceFormat)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(ConsolidationAnswer::Dream(a))
        }
        Some(ConsolidationReply::Sources) => {
            let Answer::Sources(a) = direct(answer, ProviderKind::Sources)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ConsolidationAnswer::Sources(a))
        }
        Some(ConsolidationReply::Format) => {
            let Answer::ConsolidationFormat(a) = direct(answer, ProviderKind::ConsolidationFormat)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(ConsolidationAnswer::Format(a))
        }
        Some(ConsolidationReply::Collation) => {
            let Answer::Collation(a) = direct(answer, ProviderKind::Collation)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ConsolidationAnswer::Collation(a))
        }
        None => None,
    };
    match cursor.step(core, supplied)? {
        ConsolidationStep::Complete(done) => Ok(Poll::Complete(done)),
        ConsolidationStep::Dream(q) => question(
            answer,
            ProviderKind::MaintenanceFormat,
            q.binding(),
            q,
            budget,
            ConsolidationReply::Dream,
        ),
        ConsolidationStep::Sources(q) => question(
            answer,
            ProviderKind::Sources,
            q.binding,
            q,
            budget,
            ConsolidationReply::Sources,
        ),
        ConsolidationStep::Format(q) => question(
            answer,
            ProviderKind::ConsolidationFormat,
            q.binding,
            q,
            budget,
            ConsolidationReply::Format,
        ),
        ConsolidationStep::Collation(q) => question(
            answer,
            ProviderKind::Collation,
            q.binding(),
            q,
            budget,
            ConsolidationReply::Collation,
        ),
    }
}
