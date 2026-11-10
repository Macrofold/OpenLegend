use super::*;
use crate::cognition::publication::{
    CompletedReflection, ReflectionAnswer, ReflectionCursor, ReflectionStep,
};
#[derive(Clone, Copy)]
pub(super) enum ReflectionReply {
    Format,
    Sources,
    Creates,
    Event(EventReply),
}
pub(super) fn poll_reflection(
    cursor: &mut ReflectionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<ReflectionReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedReflection, ReflectionReply>, DriveError> {
    let mut supplied = match route {
        Some(ReflectionReply::Format) => {
            route = None;
            let Answer::MaintenanceFormat(value) = direct(answer, ProviderKind::MaintenanceFormat)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(ReflectionAnswer::Format(value))
        }
        Some(ReflectionReply::Sources) => {
            route = None;
            let Answer::Sources(value) = direct(answer, ProviderKind::Sources)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(ReflectionAnswer::Sources(value))
        }
        Some(ReflectionReply::Creates) => {
            route = None;
            let Answer::AppraisalOutcomes(value) = direct(answer, ProviderKind::AppraisalOutcomes)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(ReflectionAnswer::Creates(value))
        }
        Some(ReflectionReply::Event(_)) | None => None,
    };
    loop {
        match cursor.step(core, supplied.take())? {
            ReflectionStep::Complete(value) => return Ok(Poll::Complete(value)),
            ReflectionStep::Format(q) => {
                return question(
                    answer,
                    ProviderKind::MaintenanceFormat,
                    q.binding(),
                    q,
                    budget,
                    ReflectionReply::Format,
                );
            }
            ReflectionStep::Sources(q) => {
                return question(
                    answer,
                    ProviderKind::Sources,
                    q.binding,
                    q,
                    budget,
                    ReflectionReply::Sources,
                );
            }
            ReflectionStep::Creates(q) => {
                return question(
                    answer,
                    ProviderKind::AppraisalOutcomes,
                    q.binding,
                    q,
                    budget,
                    ReflectionReply::Creates,
                );
            }
            ReflectionStep::Event(child) => {
                let child_route = match route.take() {
                    Some(ReflectionReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(value) => supplied = Some(ReflectionAnswer::Event(value)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, ReflectionReply::Event(r)));
                    }
                }
            }
        }
    }
}
