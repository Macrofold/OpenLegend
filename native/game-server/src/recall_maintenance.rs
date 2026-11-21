//! The maintenance scheduler can prepare and use exact native personal
//! evidence while leaving the world open during inference. Only final
//! publication closes ordinary admission long enough for the protected save.

use crate::{
    boot::CurrentServer,
    live_save::LiveSaves,
    store::{CommitError, PreparedConsolidation, StoreError},
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{
        NativeWorldSession, RuntimeConsolidationBinding, RuntimeConsolidationGroup,
        RuntimeConsolidationTicket, RuntimeDirectOutput, RuntimeError,
    },
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use std::sync::Arc;
use tokio::sync::watch;

pub(crate) async fn prepare(
    game: &Arc<CurrentServer>,
    actor: String,
    binding: RuntimeConsolidationBinding,
    allocation: ByteReservation,
) -> Result<RuntimeConsolidationTicket, WorldError> {
    game.world
        .prepare_actor_read(
            game.clone(),
            move |world| {
                let _allocation = allocation;
                let read = world.read_maintenance_direct(actor)?;
                world.bind_consolidation_direct(&read, binding)
            },
            NativeWorldSession::consolidation_sources,
            NativeWorldSession::step_consolidation_sources,
        )
        .await
}

#[derive(Debug)]
pub(crate) enum ConsolidationOutcome {
    Published,
    Duplicate,
    Refused {
        reason: JsText,
        _custody: ByteReservation,
    },
}

struct Finish {
    outcome: ConsolidationOutcome,
    projection: Option<PreparedConsolidation>,
}

pub(crate) async fn apply(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    ticket: RuntimeConsolidationTicket,
    groups: Vec<RuntimeConsolidationGroup>,
    allocation: ByteReservation,
    stop: watch::Receiver<bool>,
) -> Result<ConsolidationOutcome, WorldError> {
    if *stop.borrow() {
        return Err(HostError::Cancelled.into());
    }
    let _source_edit = game.world.begin_source_edit(ticket.actor_id())?;
    let _barrier = saves.enter_protected().await?;
    let source = game.clone();
    let writer = game.store.clone();
    let stage = writer.clone();
    let before_begin = stop.clone();
    let finish = game
        .world
        .execute_protected(
            move |world| {
                if *before_begin.borrow() {
                    return Err(RuntimeError::application_refused(HostError::Cancelled));
                }
                let _allocation = allocation;
                world.begin_consolidation_direct(&mut Some(ticket), groups)
            },
            move |question| {
                let source = source.clone();
                async move { source.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("consolidation never previews effects")
                };
                let outcome = if !product.outcome().ok {
                    let message = &product.outcome().message;
                    let custody = budget.reserve(message.storage_bytes())?;
                    ConsolidationOutcome::Refused {
                        reason: message.clone(),
                        _custody: custody,
                    }
                } else if product.outcome().code == "duplicate" {
                    ConsolidationOutcome::Duplicate
                } else {
                    ConsolidationOutcome::Published
                };
                let projection = stage
                    .prepare_consolidation(&product)
                    .map_err(RuntimeError::application_refused)?;
                if matches!(outcome, ConsolidationOutcome::Published) && projection.is_none() {
                    return Err(RuntimeError::application_refused(
                        StoreError::DerivedProjectionRequired,
                    ));
                }
                Ok(Finish {
                    outcome,
                    projection,
                })
            },
            move || {
                if *stop.borrow() {
                    return Err(HostError::Cancelled.into());
                }
                Ok(())
            },
            move |finish, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let prepared = finish.projection.as_ref().ok_or(CommitError::RolledBack(
                        StoreError::DerivedProjectionRequired,
                    ))?;
                    writer
                        .commit_save(prefix, &[], &prepared.projection(&writer))
                        .await
                })
            },
        )
        .await?
        .ok_or(StoreError::StaleCut)?;
    if matches!(finish.outcome, ConsolidationOutcome::Published) {
        saves.signal_view();
        saves.lexical_waker().notify_one();
    }
    Ok(finish.outcome)
}
