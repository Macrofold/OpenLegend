//! Character control is an operational receipt with a native participation
//! transition. They use one protected prefix and one PostgreSQL transaction.

use crate::{
    authority::{
        AccessError, Authority, AuthorizedScope, Capability, ControlChange, ControlOperation,
        ControlRequest, now_ms,
    },
    boot::CurrentServer,
    live_save::LiveSaves,
    store::{OrdinaryProjection, PrefixProjection, StoreError, StoreResult},
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    commands::Outcome,
    host::ByteReservation,
    records::SaveRows,
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimeHistory, RuntimeParticipation},
    text::JsText,
};
use std::{sync::Arc, time::Duration};
use tokio_postgres::Transaction;
use uuid::Uuid;

struct PreparedControl {
    outcome: Outcome,
    history: RuntimeHistory,
    _custody: ByteReservation,
}

struct ControlProjection<'a> {
    gameplay: OrdinaryProjection<'a>,
    control: &'a ControlChange,
    exit: Option<(&'a str, i64)>,
}

impl PrefixProjection for ControlProjection<'_> {
    async fn before_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.gameplay
            .before_records(transaction, rows, revision)
            .await
    }

    async fn after_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.gameplay
            .after_records(transaction, rows, revision)
            .await?;
        self.control.write(transaction).await?;
        self.control.write_exit(transaction, self.exit).await
    }
}

pub(crate) enum EmbodimentChange {
    Replayed,
    Returned,
    Released,
    Refused {
        message: JsText,
        _custody: ByteReservation,
    },
}

pub(crate) async fn change(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    authority: &Arc<Authority>,
    authorized: &AuthorizedScope,
    request: ControlRequest,
    unattended: bool,
    grace: Duration,
) -> Result<EmbodimentChange, WorldError> {
    let _barrier = saves.enter_protected().await?;
    let scope = authority.current(authorized, Capability::Play, false, |scope, _| {
        scope.clone()
    })?;
    if authority.control_replayed(&scope, &request).await? {
        authority.current(authorized, Capability::Play, false, |_, _| ())?;
        return Ok(EmbodimentChange::Replayed);
    }
    let exit = (request.operation == ControlOperation::Release).then(|| {
        (
            Uuid::new_v4().to_string(),
            now_ms().saturating_add(grace.as_millis().try_into().unwrap_or(i64::MAX)),
        )
    });
    let operation = match &exit {
        Some((id, _)) => RuntimeParticipation::BeginExit(id.clone()),
        None => RuntimeParticipation::Return,
    };
    let release = exit.is_some();
    let control = Arc::new(authority.fence_control(authorized, request, unattended)?);
    let write = control.clone();
    let provider = game.clone();
    let store = game.store.clone();
    let candidate_store = store.clone();
    let candidate = game
        .world
        .execute_protected(
            move |world| {
                world.begin_participation_direct(&scope.account_id, scope.actor_id, operation)
            },
            move |question| {
                let provider = provider.clone();
                async move { provider.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("participation does not preview")
                };
                let history = product.retain_history();
                if product.outcome().ok {
                    OrdinaryProjection::validate_candidate(
                        &candidate_store,
                        product.changes(),
                        &history,
                    )
                    .map_err(RuntimeError::application_refused)?;
                }
                let outcome = product.outcome();
                let bytes = openlegend_simulation::encoding::json_record_len(outcome)
                    .map_err(RuntimeError::application_refused)?
                    .checked_mul(3)
                    .and_then(|size| size.checked_add(std::mem::size_of::<PreparedControl>()))
                    .ok_or_else(|| RuntimeError::application_refused(StoreError::Capacity))?;
                Ok(PreparedControl {
                    outcome: outcome.clone(),
                    history,
                    _custody: budget.reserve(bytes)?,
                })
            },
            || Ok(()),
            move |candidate, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let projection = ControlProjection {
                        gameplay: OrdinaryProjection::new(
                            &store,
                            std::slice::from_ref(&candidate.history),
                        ),
                        control: &write,
                        exit: exit.as_ref().map(|(id, deadline)| (id.as_str(), *deadline)),
                    };
                    store.commit_prefix(prefix.rows(), &[], &projection).await
                })
            },
        )
        .await?
        .ok_or(AccessError::Changed)?;
    if !candidate.outcome.ok {
        return Ok(EmbodimentChange::Refused {
            message: candidate.outcome.message,
            _custody: candidate._custody,
        });
    }
    saves.signal_view();
    Ok(if release {
        EmbodimentChange::Released
    } else {
        EmbodimentChange::Returned
    })
}
