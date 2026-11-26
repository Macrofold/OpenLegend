//! Each restore read uses one real private SQL projection; its rows and
//! callbacks are discarded before the following or final projection is applied.
use super::super::restore::{CompletedRestore, RestoreAnswer, RestoreReconcileCursor, RestoreStep};
use super::*;

#[derive(Clone, Copy)]
pub(super) enum RestoreReply {
    History,
    Collation,
    Archives,
    Retention,
    Support,
    RetentionCollation,
    SourceVersions,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RestoreReadRequest<'a, T: ?Sized> {
    #[serde(flatten)]
    pub(super) request: &'a T,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) restore_projection: Option<&'a crate::records::ChangedRows>,
}
pub(super) fn poll_restore(
    cursor: &mut RestoreReconcileCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    route: Option<RestoreReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedRestore, RestoreReply>, DriveError> {
    let supplied = match route {
        None => None,
        Some(RestoreReply::History) => {
            privacy_reply(answer, Some(ForgetReply::History))?.map(RestoreAnswer::Privacy)
        }
        Some(RestoreReply::Collation) => {
            privacy_reply(answer, Some(ForgetReply::Collation))?.map(RestoreAnswer::Privacy)
        }
        Some(RestoreReply::Retention) => {
            let Answer::RestoreRetention(value) = direct(answer, ProviderKind::RestoreRetention)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(RestoreAnswer::Retention(value))
        }
        Some(RestoreReply::Support) => {
            let Answer::SupportMembership(value) = direct(answer, ProviderKind::SupportMembership)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(RestoreAnswer::Support(value))
        }
        Some(RestoreReply::RetentionCollation) => {
            let Answer::Collation(value) = direct(answer, ProviderKind::Collation)? else {
                return Err(DriveError::StaleResponse);
            };
            Some(RestoreAnswer::RetentionCollation(value))
        }
        Some(RestoreReply::SourceVersions) => {
            let Answer::SourceVersions(value) = direct(answer, ProviderKind::SourceVersions)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(RestoreAnswer::SourceVersions(value))
        }
        Some(RestoreReply::Archives) => {
            let Answer::RestoreArchives(value) = direct(answer, ProviderKind::RestoreArchives)?
            else {
                return Err(DriveError::StaleResponse);
            };
            Some(RestoreAnswer::Archives(value))
        }
    };
    let settings = cursor.read_projection_settings();
    match cursor.step(core, supplied, budget)? {
        RestoreStep::Continue => Ok(Poll::Continue),
        RestoreStep::SourceVersions(request) => {
            Ok(Poll::Question(request, RestoreReply::SourceVersions))
        }
        RestoreStep::Retention(request) => {
            let binding = request.provider_binding(core.state.geometry_revision());
            if request.requires_membership_packet() {
                // The mixed host needs the full directory in its actual packet.
                return projected_question(core, answer, ProviderKind::RestoreRetention,
                    binding, &request.value(), settings, budget, RestoreReply::Retention);
            }
            if answer.is_some() {
                return Err(DriveError::StaleResponse);
            }
            let projection = capture_projection(core, binding, settings, budget)?;
            let question = ProviderQuestion::prepare_bound(
                ProviderKind::RestoreRetention,
                binding,
                QuestionBody::RestoreRetention(request, Box::new(projection)),
                budget,
            )?;
            Ok(Poll::Question(question, RestoreReply::Retention))
        }
        RestoreStep::Support(request) => {
            if answer.is_some() {
                return Err(DriveError::StaleResponse);
            }
            let binding = request.request.binding;
            let projection = capture_projection(core, binding, settings, budget)?;
            let pending = ProviderQuestion::prepare_bound(
                ProviderKind::SupportMembership,
                binding,
                QuestionBody::SupportMembership(request, Some(Box::new(projection))),
                budget,
            )?;
            Ok(Poll::Question(pending, RestoreReply::Support))
        },
        RestoreStep::RetentionCollation(request) => collation_question(answer, request, budget, RestoreReply::RetentionCollation),
        RestoreStep::Complete(done) => Ok(Poll::Complete(done)),
        RestoreStep::Collation(request) => collation_question(answer, request, budget, RestoreReply::Collation),
        RestoreStep::History(request) => {
            if answer.is_some() {
                return Err(DriveError::StaleResponse);
            }
            let binding = request
                .request()
                .provider_binding(core.state.geometry_revision());
            let projection = capture_projection(core, binding, settings, budget)?;
            personal_history_question(
                answer, binding, request, Some(Box::new(projection)), budget, RestoreReply::History,
            )
        }
        RestoreStep::Archives(request) => {
            if answer.is_some() {
                return Err(DriveError::StaleResponse);
            }
            let binding = request.provider_binding(core.state.geometry_revision());
            let projection = capture_projection(core, binding, settings, budget)?;
            let question = ProviderQuestion::prepare_bound(
                ProviderKind::RestoreArchives,
                binding,
                QuestionBody::RestoreArchives(request, Box::new(projection)),
                budget,
            )?;
            Ok(Poll::Question(question, RestoreReply::Archives))
        },
    }
}
fn projected_question<T: Serialize + ?Sized>(
    core: &CoreMutation<'_>,
    answer: &Option<Answer>,
    kind: ProviderKind,
    binding: GeometryBinding,
    request: &T,
    settings: (crate::received::TemporalSaveLimits, u64),
    budget: &ByteBudget,
    route: RestoreReply,
) -> Result<Poll<CompletedRestore, RestoreReply>, DriveError> {
    let projection = capture_projection(core, binding, settings, budget)?;
    question(
        answer,
        kind,
        binding,
        &RestoreReadRequest {
            request,
            restore_projection: Some(&projection.changes),
        },
        budget,
        route,
    )
}

fn capture_projection(
    core: &CoreMutation<'_>,
    binding: GeometryBinding,
    (limits, floor): (crate::received::TemporalSaveLimits, u64),
    budget: &ByteBudget,
) -> Result<crate::simulation::restore::RestoreReadProjection, DriveError> {
    crate::simulation::restore::RestoreReadProjection::capture(
        core,
        crate::host::CandidateKey {
            id: binding.candidate_id,
            base_cut: binding.base_cut,
            generation: binding.generation,
        },
        limits,
        floor,
        budget,
    )
}
