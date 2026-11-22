//! Both learning phases use the same finite history/caption/canonical protocol.
use super::*;
use crate::activity::*;
#[derive(Clone, Copy)]
pub(super) enum LearningReply {
    History,
    Format,
    Canonical,
}
fn response(
    answer: &mut Option<Answer>,
    route: Option<LearningReply>,
) -> Result<Option<LearningPreparationAnswer>, DriveError> {
    Ok(match route {
        None => None,
        Some(LearningReply::History) => {
            let Answer::ActivityHistory(a) = direct(answer, ProviderKind::ActivityHistory)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(LearningPreparationAnswer::History(a))
        }
        Some(LearningReply::Format) => {
            let Answer::ActivityLearningFormat(a) =
                direct(answer, ProviderKind::ActivityLearningFormat)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(LearningPreparationAnswer::Format(a))
        }
        Some(LearningReply::Canonical) => {
            let Answer::Digest(a) = direct(answer, ProviderKind::Digest)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(LearningPreparationAnswer::Canonical(a))
        }
    })
}

fn history<T>(
    answer: &Option<Answer>,
    request: &LearningHistoryRequest,
    budget: &ByteBudget,
) -> Result<Poll<T, LearningReply>, DriveError> {
    if answer.is_some() {
        return Err(DriveError::StaleResponse);
    }
    Ok(Poll::Question(
        ProviderQuestion::prepare_learning_history(request, budget)?,
        LearningReply::History,
    ))
}

fn format<T>(
    answer: &Option<Answer>,
    request: &Arc<LearningFormatRequest>,
    budget: &ByteBudget,
) -> Result<Poll<T, LearningReply>, DriveError> {
    if answer.is_some() {
        return Err(DriveError::StaleResponse);
    }
    let backing = ProviderQuestion::reserve_backing(budget)?;
    Ok(Poll::Question(
        Arc::new(ProviderQuestion {
            kind: ProviderKind::ActivityLearningFormat,
            binding: request.binding,
            body: QuestionBody::ActivityLearningFormat(request.clone()),
            _reservation: budget.reserve(0).map_err(|_| DriveError::Capacity)?,
            backing,
        }),
        LearningReply::Format,
    ))
}
pub(super) fn prepare(
    cursor: &mut LearningPreparationCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    route: Option<LearningReply>,
    budget: &ByteBudget,
) -> Result<Poll<Arc<PreparedActivityLearning>, LearningReply>, DriveError> {
    let supplied = response(answer, route)?;
    match cursor.step(core, supplied)? {
        LearningPreparationStep::History(q) => history(answer, q, budget),
        LearningPreparationStep::Format(q) => format(answer, q, budget),
        LearningPreparationStep::Canonical(q) => {
            digest_question(answer, q, budget, LearningReply::Canonical)
        }
        LearningPreparationStep::Complete(batch) => Ok(Poll::Complete(batch)),
        LearningPreparationStep::Context(_) => Err(ExecutionError::Invariant.into()),
    }
}
pub(super) fn publish(
    cursor: &mut LearningPublicationCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    route: Option<LearningReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedActivityLearning, LearningReply>, DriveError> {
    let supplied = response(answer, route)?.map(|a| match a {
        LearningPreparationAnswer::History(a) => LearningPublicationAnswer::History(a),
        LearningPreparationAnswer::Format(a) => LearningPublicationAnswer::Format(a),
        LearningPreparationAnswer::Canonical(a) => LearningPublicationAnswer::Canonical(a),
    });
    match cursor.step(core, supplied)? {
        LearningPublicationStep::History(q) => history(answer, q, budget),
        LearningPublicationStep::Format(q) => format(answer, q, budget),
        LearningPublicationStep::Canonical(q) => {
            digest_question(answer, q, budget, LearningReply::Canonical)
        }
        LearningPublicationStep::Complete(done) => Ok(Poll::Complete(done)),
    }
}
