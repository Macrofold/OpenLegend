//! The maintenance scheduler can prepare and use exact native personal
//! evidence while leaving the world open during inference. Only final
//! publication closes ordinary admission long enough for the protected save.

use crate::{
    boot::CurrentServer,
    live_save::LiveSaves,
    store::{
        CommitError, DurableHead, PreparedConsolidation, StoreError, durable_head,
        recall::{
            consolidation::ConsolidationCursorWrite,
            maintenance_scan::{ConsolidationWindow, PendingReview, ReviewPosition},
        },
    },
    world::{ProtectedCommit, WorldError},
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len, sha256_hex},
    host::ByteReservation,
    runtime::{
        NativeWorldSession, RuntimeConsolidationBinding, RuntimeConsolidationGroup,
        RuntimeConsolidationTicket, RuntimeDirectOutput, RuntimeDreamReview, RuntimeError,
    },
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

pub(crate) enum ReviewFollowUp {
    Tomorrow(f64),
    NextPartition,
    RoutinePending,
}

/// Commit one completed-day partition whose selected sources can all be
/// preserved verbatim. Routine work retains its opportunity for the separately
/// admitted inference path.
pub(crate) async fn review_protected_day(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    actor: String,
    scope: RuntimeDreamReview,
    stop: watch::Receiver<bool>,
    deadline: Instant,
) -> Result<ReviewFollowUp, WorldError> {
    let settings = &game.store.schema.recall.maintenance;
    let today = (scope.at / settings.day_seconds).floor() as u64;
    let tomorrow = (today as f64 + 1.) * settings.day_seconds;
    let Some(previous_day) = today.checked_sub(1) else {
        return Ok(ReviewFollowUp::Tomorrow(tomorrow));
    };
    game.world
        .when_durable(scope.accepted_cut, deadline)
        .await?;
    if *stop.borrow() {
        return Err(HostError::Cancelled.into());
    }
    let head = game
        .store
        .protected_edit_head()
        .await?
        .ok_or(StoreError::StaleCut)?;
    if head.world_id != scope.world_id || head.generation != scope.generation {
        return Err(StoreError::StaleCut.into());
    }
    let mut review = game.store.pending_review(head.clone(), &actor).await?;
    let day = review
        .current
        .as_ref()
        .filter(|cursor| !cursor.completed && !cursor.failed)
        .map_or(previous_day, |cursor| cursor.day);
    if day > previous_day
        || review
            .current
            .as_ref()
            .is_some_and(|cursor| cursor.day >= day && (cursor.completed || cursor.failed))
    {
        return Ok(ReviewFollowUp::Tomorrow(tomorrow));
    }
    let prior = review.current.take().filter(|cursor| cursor.day == day);
    let (through_revision, after) = prior.map_or((None, None), |cursor| {
        (cursor.through_revision, cursor.after)
    });
    let selection = game
        .store
        .select_consolidation(
            head.clone(),
            actor,
            ConsolidationWindow::Daily {
                day,
                through_revision,
                after,
            },
        )
        .await?;
    let Some(selection) = selection else {
        if *stop.borrow() {
            return Err(HostError::Cancelled.into());
        }
        let next = ReviewPosition {
            day,
            timeline: review.timeline.clone(),
            completed: true,
            failed: false,
            through_revision,
            after: None,
        };
        let cursor = cursor_write(review, next)?;
        game.store
            .operational(move |transaction| {
                Box::pin(async move {
                    if durable_head(transaction).await?.as_ref() != Some(&head) {
                        return Err(StoreError::StaleCut);
                    }
                    cursor.commit(transaction).await
                })
            })
            .await
            .map_err(WorldError::Commit)?;
        return Ok(ReviewFollowUp::Tomorrow(tomorrow));
    };
    if !selection.protected_only {
        return Ok(ReviewFollowUp::RoutinePending);
    }
    let next = ReviewPosition {
        day,
        timeline: review.timeline.clone(),
        completed: selection.complete,
        failed: false,
        through_revision: Some(selection.through_revision),
        after: Some(selection.after),
    };
    let binding = (
        &selection.head.generation,
        &review.timeline,
        &selection.actor,
        day,
        selection.through_revision,
        &selection.selection,
    );
    let identity_len = json_record_len(&binding).map_err(RuntimeError::application_refused)?;
    let mut custody = selection.custody;
    custody
        .resize(
            custody
                .bytes()
                .checked_add(identity_len.checked_mul(3).ok_or(StoreError::Capacity)?)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(RuntimeError::from)?;
    let digest = json_record(&binding).map_err(RuntimeError::application_refused)?;
    let job_id = format!("memory-review:{}", sha256_hex(digest.as_bytes()));
    drop(digest);
    let cursor = cursor_write(review, next)?;
    let ticket = prepare(
        game,
        selection.head,
        selection.actor,
        RuntimeConsolidationBinding {
            job_id,
            selection: selection.selection,
            protected_importance: settings.protected_importance,
            summary_bytes: settings.summary_bytes,
            requires_body: true,
            dream_episode: Some(scope.episode),
        },
        custody,
    )
    .await?;
    let Some((groups, allocation)) = ticket.protected_groups(game.host.budget())? else {
        return Ok(ReviewFollowUp::RoutinePending);
    };
    match apply(game, saves, ticket, groups, allocation, stop, Some(cursor)).await? {
        ConsolidationOutcome::Published if selection.complete => {
            Ok(ReviewFollowUp::Tomorrow(tomorrow))
        }
        ConsolidationOutcome::Published => Ok(ReviewFollowUp::NextPartition),
        ConsolidationOutcome::Duplicate | ConsolidationOutcome::Refused { .. } => {
            Err(StoreError::StaleCut.into())
        }
    }
}

fn cursor_write(
    mut owned: PendingReview,
    next: ReviewPosition,
) -> Result<ConsolidationCursorWrite, WorldError> {
    let len = json_record_len(&next).map_err(RuntimeError::application_refused)?;
    owned
        .custody
        .resize(
            owned
                .custody
                .bytes()
                .checked_add(len.checked_mul(3).ok_or(StoreError::Capacity)?)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(RuntimeError::from)?;
    let next = json_record(&next).map_err(RuntimeError::application_refused)?;
    Ok(ConsolidationCursorWrite {
        key: owned.key,
        previous: owned.previous,
        next,
        _custody: owned.custody,
    })
}

pub(crate) async fn prepare(
    game: &Arc<CurrentServer>,
    head: DurableHead,
    actor: String,
    binding: RuntimeConsolidationBinding,
    allocation: ByteReservation,
) -> Result<RuntimeConsolidationTicket, WorldError> {
    game.world
        .prepare_actor_read(
            game.clone(),
            move |world| {
                let _allocation = allocation;
                let progress = world.accepted_progress()?;
                if progress.world_id != head.world_id || progress.generation != head.generation {
                    return Err(RuntimeError::application_refused(StoreError::StaleCut));
                }
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
    cursor: Option<ConsolidationCursorWrite>,
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
                    let mut projection = prepared.projection(&writer);
                    if let Some(cursor) = &cursor {
                        projection = projection.with_cursor(cursor);
                    }
                    writer.commit_save(prefix, &[], &projection).await
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
