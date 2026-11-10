use super::*;
use crate::participation::{
    CompletedParticipation, ParticipationAnswer, ParticipationCursor, ParticipationError,
    ParticipationStep,
};
#[derive(Clone, Copy)]
pub(super) enum ParticipationReply {
    Geometry,
    Event(EventReply),
    Perception(PerceptionReply),
}
impl From<ParticipationError> for DriveError {
    fn from(error: ParticipationError) -> Self {
        match error {
            ParticipationError::StaleResponse => DriveError::StaleResponse,
            ParticipationError::Execution(error) => error.into(),
            ParticipationError::Event(error) => error.into(),
            ParticipationError::Emission(error) => CommandOperationError::from(error).into(),
            ParticipationError::Memory(error) => AdvanceError::from(error).into(),
            ParticipationError::Result(error) => AdvanceError::from(error).into(),
            ParticipationError::Reception(error) => error.into(),
        }
    }
}
pub(super) fn poll_participation(
    cursor: &mut ParticipationCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<ParticipationReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedParticipation, ParticipationReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(ParticipationReply::Geometry)) {
        route = None;
        let Answer::Geometry(value) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ParticipationAnswer::Geometry(value));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            ParticipationStep::Continue => return Ok(Poll::Continue),
            ParticipationStep::Complete(value) => return Ok(Poll::Complete(value)),
            ParticipationStep::Geometry(queries) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    queries.binding,
                    queries,
                    budget,
                    ParticipationReply::Geometry,
                );
            }
            ParticipationStep::Event(child) => {
                let route = match route.take() {
                    None => None,
                    Some(ParticipationReply::Event(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, route, budget)? {
                    Poll::Complete(value) => supplied = Some(ParticipationAnswer::Event(value)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(question, route) => {
                        return Ok(Poll::Question(question, ParticipationReply::Event(route)));
                    }
                }
            }
            ParticipationStep::Perception(child) => {
                let route = match route.take() {
                    None => None,
                    Some(ParticipationReply::Perception(route)) => Some(route),
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_perception(child, core, answer, route, budget)? {
                    Poll::Complete(value) => {
                        supplied = Some(ParticipationAnswer::Perception(value))
                    }
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(question, route) => {
                        return Ok(Poll::Question(
                            question,
                            ParticipationReply::Perception(route),
                        ));
                    }
                }
            }
        }
    }
}
