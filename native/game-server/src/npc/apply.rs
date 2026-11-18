//! The response, its original occurrences and completion record share the
//! ordinary native acceptance and PostgreSQL save boundary.

use crate::{
    authority::{Authority, AuthorizedScope, Capability},
    boot::CurrentServer,
    decision_dispatch::{CallFailure, ReplyPreview, ReplyReceipt},
    live_save::{AcceptedSaveInput, LiveSaves},
    player_events::SpeechReplyStatus,
    store::{AdmittedJob, TerminalOutcome},
    world::{ApplicationStart, WorldError},
};
use axum::body::Bytes;
use openlegend_simulation::runtime::{RuntimeDirectOutput, RuntimeError, RuntimeNpcResponseTicket};
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

enum Applied {
    Stale(&'static str),
    Accepted {
        save: Arc<AcceptedSaveInput>,
        preview: Option<(Arc<ReplyPreview>, Option<Arc<ReplyReceipt>>)>,
    },
    Refused(Arc<AcceptedSaveInput>),
}

pub(super) async fn apply(
    saves: &Arc<LiveSaves>,
    game: &Arc<CurrentServer>,
    job: &Arc<AdmittedJob>,
    ticket: Arc<RuntimeNpcResponseTicket>,
    draft: Bytes,
    permit: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    cancellation: watch::Receiver<bool>,
    preview: Option<Arc<ReplyPreview>>,
) -> Result<(), CallFailure> {
    if *cancellation.borrow() {
        return Err(CallFailure::Cancelled);
    }
    let _ordinary = saves.enter_ordinary().await;
    saves
        .check_admission(Instant::now())
        .map_err(CallFailure::World)?;
    let original = job.clone();
    let provider = game.clone();
    let begin_stop = cancellation.clone();
    let begin_permit = permit.clone();
    let staged = saves.clone();
    let accepted = saves.clone();
    let settle_world = game.world.clone();
    let settle_job = job.clone();
    let mut ticket = Some(Arc::try_unwrap(ticket).map_err(|_| CallFailure::Invalid)?);
    game.world.request_advance_publication();
    let applied = game
        .world
        .execute_and_publish(
            move |session| {
                if *begin_stop.borrow() {
                    return Ok(ApplicationStart::Existing(Applied::Stale("cancelled")));
                }
                if let Some((authority, scope)) = &begin_permit {
                    authority.current(scope, Capability::Play, true, |_, _| ())?;
                }
                let witness = ticket.as_ref().expect("response ticket is present");
                match session.npc_response_publication(witness)? {
                    Ok(lease) => drop(lease),
                    Err(reason) => return Ok(ApplicationStart::Existing(Applied::Stale(reason))),
                }
                let text =
                    std::str::from_utf8(&draft).map_err(RuntimeError::application_refused)?;
                Ok(ApplicationStart::Candidate(session.begin_npc_response(
                    &mut ticket,
                    text,
                    false,
                )?))
            },
            move |question| {
                let provider = provider.clone();
                async move { provider.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("responses do not preview")
                };
                let result = product.outcome();
                let (status, message) = if result.ok {
                    (SpeechReplyStatus::Completed, "Reply completed.".into())
                } else {
                    (SpeechReplyStatus::Stale, result.message.clone())
                };
                let change = original
                    .advance(
                        status,
                        message,
                        Some(TerminalOutcome {
                            stage: "apply".into(),
                            condition: result.code.clone(),
                            dispatched: true,
                            received: true,
                            applied: result.ok,
                        }),
                        budget,
                    )
                    .map_err(RuntimeError::application_refused)?;
                let save = staged.stage_with_job(&product, None, Some(change))?;
                Ok(if result.ok {
                    let preview = preview.as_ref().map(|preview| {
                        let receipt = preview.prepare_receipt(&product, budget);
                        (preview.clone(), receipt)
                    });
                    Applied::Accepted { save, preview }
                } else {
                    Applied::Refused(save)
                })
            },
            move |fence, key, _| {
                if *cancellation.borrow() {
                    return Ok(fence.settle(key, false)?);
                }
                let settle =
                    || settle_world.settle_npc_response(&settle_job.job.request.npc_id, fence, key);
                if let Some((authority, scope)) = permit {
                    return authority.current(&scope, Capability::Play, true, |_, _| settle())?;
                }
                settle()
            },
            move |applied| match applied {
                Applied::Accepted { save, preview } => {
                    accepted.accept(save);
                    if let Some((selected, receipt)) = preview {
                        selected.settle(receipt.clone());
                    }
                }
                Applied::Refused(save) => accepted.accept(save),
                Applied::Stale(_) => {}
            },
        )
        .await
        .map_err(|error| match error {
            WorldError::SourceEditPending => CallFailure::Stale("source-edit-pending"),
            other => CallFailure::World(other),
        })?;
    match applied {
        Some(Applied::Accepted { .. } | Applied::Refused(_)) => Ok(()),
        Some(Applied::Stale("cancelled")) | None => Err(CallFailure::Cancelled),
        Some(Applied::Stale(reason)) => Err(CallFailure::Stale(reason)),
    }
}
