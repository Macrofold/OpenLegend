//! The existing creator operation drives native recall editing against its
//! exact durable predecessor. SQL and accepted disclosure settle together.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope},
    boot::CurrentServer,
    live_save::LiveSaves,
    store::{PreparedPrivacyEdit, StoreError},
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    commands::Outcome,
    encoding::json_record_len,
    host::ByteReservation,
    runtime::{RuntimeDirectOutput, RuntimeError},
    values::is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ForgetRequest {
    pub actor_id: String,
    pub source_id: String,
}

#[derive(Serialize)]
pub(crate) struct ForgetOutcome {
    #[serde(flatten)]
    outcome: Outcome,
    #[serde(skip_serializing_if = "Option::is_none")]
    revision: Option<u64>,
    #[serde(skip)]
    _custody: ByteReservation,
}

struct PreparedEdit {
    result: ForgetOutcome,
    projection: Option<PreparedPrivacyEdit>,
}

fn operator(
    authority: &Authority,
    authorized: &AuthorizedScope,
    target: &str,
) -> Result<String, AccessError> {
    authority.current_recall_operator(authorized, authorized.scope.actor_id != target, |scope| {
        scope.actor_id.clone()
    })
}

/// The HTTP caller supplies authenticated creator scope and enables this
/// operator action only when god mode is configured.
pub(crate) async fn forget(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    authority: Arc<Authority>,
    scope: Arc<AuthorizedScope>,
    request: ForgetRequest,
) -> Result<ForgetOutcome, WorldError> {
    if !is_safe_record_id(&request.actor_id) || !is_safe_record_id(&request.source_id) {
        return Err(StoreError::InvalidRecord.into());
    }
    let owner = operator(&authority, &scope, &request.actor_id)?;
    let target = request.actor_id.clone();
    let copied = target.clone();
    let checked_owner = owner.clone();
    if !game
        .world
        .capture(move |world| world.may_forget_recall(&checked_owner, &copied))
        .await?
    {
        return Err(AccessError::Forbidden.into());
    }
    let _withdrawal = game.world.begin_source_edit(&target)?;
    let _barrier = saves.enter_protected().await?;
    operator(&authority, &scope, &target)?;
    let durable = game
        .store
        .current_head()
        .await?
        .ok_or(StoreError::StaleCut)?;
    let expected = durable.clone();
    let accepted_cut = game
        .world
        .capture(move |world| {
            let progress = world.accepted_progress()?;
            if progress.world_id != expected.world_id || progress.generation != expected.generation
            {
                return Err(RuntimeError::application_refused(StoreError::StaleCut));
            }
            Ok(progress.through_cut)
        })
        .await?;
    let provider = game.clone();
    let expected = durable.clone();
    let writer = game.store.clone();
    let store = writer.clone();
    let mut candidate = game
        .world
        .execute_protected(
            move |world| {
                let progress = world.accepted_progress()?;
                if progress.through_cut != accepted_cut
                    || progress.world_id != expected.world_id
                    || progress.generation != expected.generation
                {
                    return Err(RuntimeError::application_refused(StoreError::StaleCut));
                }
                if !world.may_forget_recall(&owner, &request.actor_id)? {
                    return Err(RuntimeError::application_refused(AccessError::Forbidden));
                }
                world.begin_forget_direct(&request.actor_id, &request.source_id)
            },
            move |question| {
                let game = provider.clone();
                let durable = durable.clone();
                async move {
                    if question.asks_personal_history()? {
                        let answer = game
                            .store
                            .read_live_personal_history(&question, durable, accepted_cut)
                            .await?;
                        Ok((question, answer))
                    } else {
                        game.answer_operation(question).await
                    }
                }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("the creator recall edit has no preview")
                };
                let outcome = product.outcome();
                let bytes = json_record_len(outcome)
                    .map_err(RuntimeError::application_refused)?
                    .checked_mul(3)
                    .and_then(|bytes| bytes.checked_add(size_of::<ForgetOutcome>()))
                    .ok_or_else(|| RuntimeError::application_refused(StoreError::Capacity))?;
                let custody = budget.reserve(bytes)?;
                let projection = if outcome.ok {
                    let edit = product.privacy_edit().ok_or_else(|| {
                        RuntimeError::application_refused(StoreError::DerivedProjectionRequired)
                    })?;
                    Some(
                        PreparedPrivacyEdit::new(
                            &store,
                            edit,
                            product.changes(),
                            &product.retain_history(),
                        )
                        .map_err(RuntimeError::application_refused)?,
                    )
                } else {
                    None
                };
                Ok(PreparedEdit {
                    result: ForgetOutcome {
                        outcome: outcome.clone(),
                        revision: None,
                        _custody: custody,
                    },
                    projection,
                })
            },
            move || {
                operator(&authority, &scope, &target)?;
                Ok(())
            },
            move |candidate, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let prepared = candidate.projection.as_ref().ok_or(
                        crate::store::CommitError::RolledBack(
                            StoreError::DerivedProjectionRequired,
                        ),
                    )?;
                    writer
                        .commit_save(prefix, &[], &prepared.projection(&writer))
                        .await
                })
            },
        )
        .await?
        .ok_or(AccessError::Changed)?;
    if candidate.result.outcome.ok {
        saves.signal_view();
        saves.lexical_waker().notify_one();
        candidate.result.revision = Some(saves.publication_revision());
    }
    Ok(candidate.result)
}
