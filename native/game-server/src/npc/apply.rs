//! The response, its original occurrences and completion record share the
//! ordinary native acceptance and PostgreSQL save boundary.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability},
    boot::CurrentServer,
    decision_dispatch::{CallFailure, ReplyPreview, ReplyReceipt},
    live_save::{AcceptedSaveInput, LiveSaves},
    player_events::SpeechReplyStatus,
    store::{AdmittedJob, TerminalOutcome},
    world::{ApplicationStart, DelayedDecisionClock, WorldError},
};
use openlegend_simulation::{
    host::ByteReservation,
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimeNpcOperations, RuntimeNpcResponseTicket},
};
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

enum Applied {
    Stale(&'static str),
    Accepted {
        save: Arc<AcceptedSaveInput>,
        preview: Option<(Arc<ReplyPreview>, Option<Arc<ReplyReceipt>>)>,
    },
    Refused(Arc<AcceptedSaveInput>),
    Reconsider {
        save: Arc<AcceptedSaveInput>,
        refusal: RefusedChoice,
    },
}

pub(super) struct RefusedChoice {
    pub(super) code: Box<str>,
    _custody: ByteReservation,
}

pub(super) async fn apply(
    saves: &Arc<LiveSaves>,
    game: &Arc<CurrentServer>,
    job: &Arc<AdmittedJob>,
    ticket: Arc<RuntimeNpcResponseTicket>,
    draft: RuntimeNpcOperations,
    permit: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    cancellation: watch::Receiver<bool>,
    deadline: Instant,
    preview: Option<Arc<ReplyPreview>>,
    delayed_clock: Option<DelayedDecisionClock>,
    diagnostic: Option<(
        &crate::decision_dispatch::StageCaptures,
        Arc<crate::decision_dispatch::DirectStageCapture>,
    )>,
) -> Result<Option<RefusedChoice>, CallFailure> {
    if *cancellation.borrow() {
        return Err(CallFailure::Cancelled);
    }
    let _ordinary = tokio::time::timeout_at(deadline, saves.enter_ordinary())
        .await
        .map_err(|_| CallFailure::Stale("decision-deadline"))?;
    saves
        .check_admission(Instant::now())
        .map_err(CallFailure::World)?;
    let original = job.clone();
    let provider = game.clone();
    let begin_stop = cancellation.clone();
    let begin_clock = delayed_clock.clone();
    let settle_clock = delayed_clock.clone();
    let begin_permit = permit.clone();
    let staged = saves.clone();
    let accepted = saves.clone();
    let settle_world = game.world.clone();
    let settle_job = job.clone();
    game.world.request_advance_publication();
    let applied = game
        .world
        .execute_and_publish(
            #[cfg(feature = "profile-campaign")]
            openlegend_simulation::profile::sites::TURN_NPC,
            move |session| {
                if *begin_stop.borrow() {
                    return Ok(ApplicationStart::Existing(Applied::Stale("cancelled")));
                }
                if Instant::now() >= deadline {
                    return Ok(ApplicationStart::Existing(Applied::Stale(
                        "decision-deadline",
                    )));
                }
                if begin_clock
                    .as_ref()
                    .is_some_and(DelayedDecisionClock::interrupted)
                {
                    return Ok(ApplicationStart::Existing(Applied::Stale("game-paused")));
                }
                if let Some((authority, scope)) = &begin_permit {
                    authority.current(scope, Capability::Play, true, |_, _| ())?;
                }
                match session.npc_response_application(&ticket)? {
                    Ok(lease) => drop(lease),
                    Err(reason) => return Ok(ApplicationStart::Existing(Applied::Stale(reason))),
                }
                Ok(ApplicationStart::Candidate(
                    session.begin_npc_response_owned(&ticket, draft, false)?,
                ))
            },
            move |question| {
                let provider = provider.clone();
                async move { provider.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("responses do not preview")
                };
                if let Some(rejected) = product.native_choice_refusal() {
                    // This result preserves the negative native receipt and
                    // leaves the automatic root open for its one paid child.
                    let custody = budget.reserve(rejected.code.len())?;
                    return Ok(Applied::Reconsider {
                        save: staged.stage(&product, None)?,
                        refusal: RefusedChoice {
                            code: rejected.code.as_str().into(),
                            _custody: custody,
                        },
                    });
                }
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
                let settle = || {
                    if *cancellation.borrow() {
                        return Ok(fence.settle(key, false)?);
                    }
                    if settle_clock
                        .as_ref()
                        .is_some_and(DelayedDecisionClock::interrupted)
                    {
                        return Ok(fence.settle(key, false)?);
                    }
                    // A useful reply may expire while its physical effects
                    // are being prepared. Roll back before accepting them.
                    if Instant::now() >= deadline {
                        return Err(WorldError::NpcDecisionExpired);
                    }
                    settle_world.settle_npc_response(&settle_job.job.request.npc_id, fence, key)
                };
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
                Applied::Refused(save) | Applied::Reconsider { save, .. } => accepted.accept(save),
                Applied::Stale(_) => {}
            },
        )
        .await
        .map_err(|error| match error {
            WorldError::SourceEditPending => CallFailure::Stale("source-edit-pending"),
            WorldError::NpcDecisionExpired => CallFailure::Stale("decision-deadline"),
            WorldError::Access(error @ (AccessError::Changed | AccessError::Forbidden)) => {
                CallFailure::Authority(error)
            }
            other => CallFailure::World(other),
        })?;
    match applied {
        Some(Applied::Accepted { save, .. }) => {
            if let Some((sink, capture)) = diagnostic {
                sink.accepted(capture, save.through_cut());
            }
            Ok(None)
        }
        Some(Applied::Refused(_)) => Ok(None),
        Some(Applied::Reconsider { refusal, .. }) => Ok(Some(refusal)),
        None if delayed_clock
            .as_ref()
            .is_some_and(DelayedDecisionClock::interrupted) =>
        {
            Err(CallFailure::Stale("game-paused"))
        }
        Some(Applied::Stale("cancelled")) | None => Err(CallFailure::Cancelled),
        Some(Applied::Stale(reason)) => Err(CallFailure::Stale(reason)),
    }
}
