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
struct RestoreReadRequest<'a, T: ?Sized> {
    #[serde(flatten)]
    request: &'a T,
    restore_projection: &'a crate::records::ChangedRows,
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
        RestoreStep::Retention(request) => projected_question(
            core,
            answer,
            ProviderKind::RestoreRetention,
            request.provider_binding(core.state.installed.geometry.spatial.revision),
            &request.value(),
            settings,
            budget,
            RestoreReply::Retention,
        ),
        RestoreStep::Support(request) => projected_question(
            core,
            answer,
            ProviderKind::SupportMembership,
            request.binding,
            request,
            settings,
            budget,
            RestoreReply::Support,
        ),
        RestoreStep::RetentionCollation(request) => question(
            answer,
            ProviderKind::Collation,
            request.binding(),
            request,
            budget,
            RestoreReply::RetentionCollation,
        ),
        RestoreStep::Complete(done) => Ok(Poll::Complete(done)),
        RestoreStep::Collation(request) => question(
            answer,
            ProviderKind::Collation,
            request.binding(),
            request,
            budget,
            RestoreReply::Collation,
        ),
        RestoreStep::History(request) => projected_question(
            core,
            answer,
            ProviderKind::History,
            request
                .request()
                .provider_binding(core.state.installed.geometry.spatial.revision),
            request.request(),
            settings,
            budget,
            RestoreReply::History,
        ),
        RestoreStep::Archives(request) => projected_question(
            core,
            answer,
            ProviderKind::RestoreArchives,
            request.provider_binding(core.state.installed.geometry.spatial.revision),
            request.value(),
            settings,
            budget,
            RestoreReply::Archives,
        ),
    }
}
fn projected_question<T: Serialize + ?Sized>(
    core: &CoreMutation<'_>,
    answer: &Option<Answer>,
    kind: ProviderKind,
    binding: GeometryBinding,
    request: &T,
    (limits, floor): (crate::received::TemporalSaveLimits, u64),
    budget: &ByteBudget,
    route: RestoreReply,
) -> Result<Poll<CompletedRestore, RestoreReply>, DriveError> {
    let projection = crate::simulation::restore::RestoreReadProjection::capture(
        core,
        crate::host::CandidateKey {
            id: binding.candidate_id,
            base_cut: binding.base_cut,
            generation: binding.generation,
        },
        limits,
        floor,
        budget,
    )?;
    question(
        answer,
        kind,
        binding,
        &RestoreReadRequest {
            request,
            restore_projection: &projection.changes,
        },
        budget,
        route,
    )
}
