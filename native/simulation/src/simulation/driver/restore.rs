//! Each restore read uses one real private SQL projection; its rows and
//! callbacks are discarded before the following or final projection is applied.
use super::super::restore::{CompletedRestore, RestoreAnswer, RestoreReconcileCursor, RestoreStep};
use super::*;

#[derive(Clone, Copy)]
pub(super) enum RestoreReply {
    History,
    Collation,
    Archives,
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
    let rows = crate::simulation::encode_candidate_changes(core.state, core.journal, None, budget)
        .map_err(|_| DriveError::Encoding)?;
    let packed = crate::received::pack_temporal_save(
        &crate::records::save::TemporalSaveCut {
            world_id: &core.state.physical.header.id,
            generation: &core.state.generation,
            through_cut: binding
                .base_cut
                .checked_add(1)
                .ok_or(DriveError::Capacity)?,
            identity_through: core.state.physical.identity.next_id(),
            temporal: &core.state.temporal,
        },
        rows.changes(),
        Some(floor),
        limits,
        &core.state.installed.schema,
        budget,
    )
    .map_err(|_| DriveError::Encoding)?;
    let _workspace = budget
        .reserve(
            crate::records::merge_workspace_bound(rows.changes(), packed.changes())
                .ok_or(DriveError::Capacity)?,
        )
        .map_err(|_| DriveError::Capacity)?;
    let (changes, _owners, _rows_guard) = rows.into_parts();
    let (pages, _page_owners, _pages_guard, _residency) = packed.into_parts();
    let projection = crate::records::merge_changes(changes, pages, &core.state.installed.schema)
        .map_err(|_| DriveError::Encoding)?;
    question(
        answer,
        kind,
        binding,
        &RestoreReadRequest {
            request,
            restore_projection: &projection,
        },
        budget,
        route,
    )
}
