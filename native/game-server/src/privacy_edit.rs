//! The existing creator operation drives native recall editing against its
//! exact durable predecessor. SQL and accepted disclosure settle together.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope},
    boot::CurrentServer,
    live_save::LiveSaves,
    player_references::{RecentEditReference, ReferenceIssuer},
    store::{PreparedPrivacyEdit, StoreError},
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    commands::Outcome,
    encoding::json_record_len,
    host::{ByteBudget, ByteReservation},
    received::TemporalReceiptLocator,
    runtime::{NativeWorldSession, RuntimeDirectOutput, RuntimeError},
    values::is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RecallEditRequest {
    pub actor_id: String,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_option"
    )]
    source_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_option"
    )]
    receipt_reference: Option<String>,
    #[serde(
        default,
        deserialize_with = "openlegend_simulation::values::deserialize_present_option"
    )]
    pub correction_event_id: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct RecallEditOutcome {
    #[serde(flatten)]
    outcome: Outcome,
    #[serde(skip_serializing_if = "Option::is_none")]
    revision: Option<u64>,
    #[serde(skip)]
    _custody: ByteReservation,
}

struct PreparedEdit {
    result: RecallEditOutcome,
    projection: Option<PreparedPrivacyEdit>,
}

struct BoundSource {
    id: String,
    receipt: Option<RecentEditReference<String, TemporalReceiptLocator>>,
    _custody: Option<ByteReservation>,
}

impl BoundSource {
    fn bind(
        source_id: Option<String>,
        token: Option<String>,
        actor: &str,
        issuer: &ReferenceIssuer,
        scope: &AuthorizedScope,
        budget: &ByteBudget,
    ) -> Result<Self, WorldError> {
        match (source_id, token) {
            (Some(id), None) if is_safe_record_id(&id) => Ok(Self {
                id,
                receipt: None,
                _custody: None,
            }),
            (None, Some(token)) if token.len() <= 2048 => {
                let custody = budget
                    .reserve(2048 + token.len() * 3)
                    .map_err(|_| StoreError::Capacity)?;
                let receipt = issuer
                    .open_recent_edit(&token)
                    .ok_or(AccessError::Changed)?;
                if receipt.scope != scope.scope.key().map_err(|_| StoreError::InvalidRecord)?
                    || receipt.world != scope.scope.world_id
                    || receipt.receipt.actor_id != actor
                {
                    return Err(AccessError::Changed.into());
                }
                Ok(Self {
                    id: receipt.receipt.id(),
                    receipt: Some(receipt),
                    _custody: Some(custody),
                })
            }
            _ => Err(StoreError::InvalidRecord.into()),
        }
    }

    fn current(&self, world: &NativeWorldSession) -> Result<bool, RuntimeError> {
        let Some(proof) = &self.receipt else {
            return Ok(true);
        };
        world.recent_receipt_edit_current(
            &proof.world,
            &proof.generation,
            &proof.receipt.actor_id,
            proof.life,
            proof.privacy_revision,
        )
    }
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
pub(crate) async fn edit(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    authority: Arc<Authority>,
    scope: Arc<AuthorizedScope>,
    issuer: &ReferenceIssuer,
    request: RecallEditRequest,
) -> Result<RecallEditOutcome, WorldError> {
    if !is_safe_record_id(&request.actor_id)
        || request
            .correction_event_id
            .as_deref()
            .is_some_and(|id| !is_safe_record_id(id))
    {
        return Err(StoreError::InvalidRecord.into());
    }
    let owner = operator(&authority, &scope, &request.actor_id)?;
    let source = Arc::new(BoundSource::bind(
        request.source_id,
        request.receipt_reference,
        &request.actor_id,
        issuer,
        &scope,
        game.host.budget(),
    )?);
    let target = request.actor_id.clone();
    let copied = target.clone();
    let checked_owner = owner.clone();
    let checked_source = source.clone();
    let (editable, current) = game
        .world
        .capture(move |world| {
            Ok((
                world.may_edit_recall(&checked_owner, &copied)?,
                checked_source.current(world)?,
            ))
        })
        .await?;
    if !editable {
        return Err(AccessError::Forbidden.into());
    }
    if !current {
        return Err(AccessError::Changed.into());
    }
    let _withdrawal = game.world.begin_source_edit(&target)?;
    // Keep imported snapshots fenced during the SQL write, including rollback.
    let _lab_withdrawal = crate::lab::SourceWithdrawal::new(authority.clone())?;
    let _barrier = saves.enter_protected().await?;
    operator(&authority, &scope, &target)?;
    let durable = game
        .store
        .protected_edit_head()
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
                if !world.may_edit_recall(&owner, &request.actor_id)? {
                    return Err(RuntimeError::application_refused(AccessError::Forbidden));
                }
                if !source.current(world)? {
                    return Err(RuntimeError::application_refused(AccessError::Changed));
                }
                world.begin_recall_edit_direct(
                    &request.actor_id,
                    &source.id,
                    request.correction_event_id,
                )
            },
            move |question| {
                let game = provider.clone();
                let durable = durable.clone();
                async move {
                    if let Some(history) = question.personal_history()? {
                        let answer = game
                            .store
                            .read_live_personal_history(history, durable, accepted_cut)
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
                    .and_then(|bytes| bytes.checked_add(size_of::<RecallEditOutcome>()))
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
                            None,
                        )
                        .map_err(RuntimeError::application_refused)?,
                    )
                } else {
                    None
                };
                Ok(PreparedEdit {
                    result: RecallEditOutcome {
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
        saves.signal_recall_change();
        candidate.result.revision = Some(saves.publication_revision());
    }
    Ok(candidate.result)
}
