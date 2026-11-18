//! The application orders decisions for each resident. Rust simulation still
//! owns all speech, evidence, action and response effects.

mod apply;
mod decide;
pub(crate) mod preview;
mod retry;
pub(crate) use retry::ChatRetryRequest;
pub(crate) mod schedule;
mod settings;
mod slots;
mod speech;
pub(crate) use speech::{ChatRequest, human_request, valid_request_id};

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope},
    boot::CurrentServer,
    decision_dispatch::{CallFailure, DecisionDispatch},
    live_save::{AcceptedSaveInput, LiveSaves},
    player_events::SpeechReplyStatus,
    player_references::ReferenceIssuer,
    store::{AdmittedJob, StoreError, TerminalOutcome},
    world::WorldError,
};
use openlegend_simulation::{commands::Outcome, host::ByteReservation};
use serde::Serialize;
use slots::{Admission, SlotPriority, Slots};
use speech::{Speech, SpeechRefusal, Spoken};
use std::{
    future::Future,
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{
    sync::{oneshot, watch},
    time::Instant,
};

const ADMISSION_WAIT: Duration = Duration::from_secs(5);
const USEFUL_LIFETIME: Duration = Duration::from_secs(30);

pub(crate) struct Director {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    authority: Arc<Authority>,
    models: Option<settings::ConfiguredModels>,
    dispatch: Arc<DecisionDispatch>,
    slots: Arc<Slots>,
    tasks: Mutex<Option<tokio::task::JoinSet<()>>>,
}

pub(crate) enum SubmitResult {
    Job(Arc<AdmittedJob>),
    Command(Outcome, Arc<AcceptedSaveInput>),
    Refusal {
        code: &'static str,
        message: &'static str,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InteractionAvailability {
    available: bool,
    code: &'static str,
    reason: Option<&'static str>,
    reply: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient_name: Option<openlegend_simulation::text::JsText>,
    #[serde(skip)]
    _custody: Option<ByteReservation>,
}

impl InteractionAvailability {
    fn refused(code: &'static str, why: &'static str) -> Self {
        Self {
            available: false,
            code,
            reason: Some(why),
            reply: false,
            recipient_name: None,
            _custody: None,
        }
    }
}

struct EligibleInteraction {
    payer: String,
    reply: bool,
    name: Option<openlegend_simulation::text::JsText>,
    _custody: ByteReservation,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JobReport<'a> {
    ok: bool,
    code: &'static str,
    message: &'a openlegend_simulation::text::JsText,
    job_id: &'a str,
    job_status: SpeechReplyStatus,
}

pub(crate) fn job_report(job: &AdmittedJob, initial: bool) -> JobReport<'_> {
    let job = &job.job;
    let code = match job.status {
        SpeechReplyStatus::Queued => "queued",
        SpeechReplyStatus::Judging => "judging",
        SpeechReplyStatus::Generating => "generating",
        SpeechReplyStatus::Completed if initial && job.outcome.is_none() => "spoken",
        SpeechReplyStatus::Completed => "completed",
        SpeechReplyStatus::Failed => "failed",
        SpeechReplyStatus::Cancelled => "cancelled",
        SpeechReplyStatus::Stale => "stale",
    };
    JobReport {
        ok: !matches!(
            job.status,
            SpeechReplyStatus::Failed | SpeechReplyStatus::Cancelled | SpeechReplyStatus::Stale
        ),
        code,
        message: &job.message,
        job_id: &job.id,
        job_status: job.status,
    }
}

impl SubmitResult {
    fn refused(code: &'static str, message: &'static str) -> Self {
        Self::Refusal { code, message }
    }

    fn speech_refusal(refusal: SpeechRefusal) -> Self {
        let (code, message) = refusal.report();
        Self::refused(code, message)
    }
}

impl Director {
    pub(crate) fn new(
        game: Arc<CurrentServer>,
        saves: Arc<LiveSaves>,
        authority: Arc<Authority>,
        limit_usd: f64,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let (maximum, models) = settings::from_env(limit_usd)?;
        let budget = game.host.budget().clone();
        let dispatch = Arc::new(DecisionDispatch::new(game.clone(), maximum)?);
        Ok(Self {
            game,
            saves,
            authority,
            models,
            dispatch,
            slots: Arc::new(Slots::new(budget, maximum)),
            tasks: Mutex::new(Some(tokio::task::JoinSet::new())),
        })
    }

    /// The listener joins the actual task, including the short tail after
    /// its resident's slot is released. An accepted provider request keeps
    /// its durable settlement owner even when the HTTP caller disconnects.
    fn start_job(&self, task: impl Future<Output = ()> + Send + 'static) -> Result<(), StoreError> {
        let mut all = self
            .tasks
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        let all = all.as_mut().ok_or(StoreError::WriterUnavailable)?;
        while let Some(result) = all.try_join_next() {
            if result.is_err() {
                return Err(StoreError::WriterUnavailable);
            }
        }
        all.spawn(task);
        Ok(())
    }

    pub(crate) async fn receipt(
        &self,
        scope: &AuthorizedScope,
        id: &str,
    ) -> Result<Option<Arc<AdmittedJob>>, WorldError> {
        let job = self.lookup(id).await?;
        self.authority
            .current(scope, Capability::Play, false, |fields, _| {
                if job
                    .as_ref()
                    .is_some_and(|owner| !belongs_to(&owner.job.authority, fields))
                {
                    return Err(AccessError::Forbidden.into());
                }
                Ok(job)
            })?
    }

    pub(crate) fn previews(&self) -> &Arc<crate::decision_dispatch::ReplyPreviews> {
        self.dispatch.previews()
    }

    /// The selected context catalogue opens a draft only. It uses the actual
    /// body/contact and display role, with no model or mutation admission.
    pub(crate) async fn contact_menu(
        &self,
        scope: Arc<AuthorizedScope>,
        refs: Arc<ReferenceIssuer>,
        selected: String,
        _request: ByteReservation,
    ) -> Result<Option<axum::body::Bytes>, WorldError> {
        let authority = self.authority.clone();
        let game = self.game.clone();
        Ok(self
            .game
            .world
            .capture(move |session| {
                let budget = game.host.budget();
                Ok(
                    authority.current(&scope, Capability::Play, false, |fields, _| {
                        let target = speech::target_in_world(
                            session,
                            fields,
                            &refs,
                            Some(&selected),
                            budget,
                        )?;
                        let Ok(target) = target else {
                            return Ok(None);
                        };
                        let revision = session.accepted_progress()?.sequence;
                        crate::player_http::actions::conversation(
                            revision,
                            &selected,
                            &target.name,
                            budget,
                        )
                        .map(Some)
                    }),
                )
            })
            .await???)
    }

    /// Spending availability is a separate await. Re-read the installed
    /// actor/recipient and live control before reporting what Send can do.
    pub(crate) async fn availability(
        &self,
        scope: Arc<AuthorizedScope>,
        references: Arc<ReferenceIssuer>,
        mode: openlegend_simulation::runtime::InteractionMode,
        target: Option<String>,
    ) -> Result<InteractionAvailability, WorldError> {
        let target = target.map(Arc::new);
        let before = match self
            .interaction(scope.clone(), references.clone(), mode, target.clone())
            .await?
        {
            Ok(before) => before,
            Err(refused) => return Ok(refused),
        };
        let Some((allowance, ceiling)) = self
            .models
            .as_ref()
            .and_then(settings::ConfiguredModels::interactive_allowance)
        else {
            return Ok(InteractionAvailability::refused(
                "ai-unavailable",
                "Speak and Act need configured character AI and an allowance.",
            ));
        };
        let funded = self
            .game
            .store
            .model_allowance(&before.payer, allowance, ceiling)
            .await?;
        let after = match self.interaction(scope, references, mode, target).await? {
            Ok(after) => after,
            Err(refused) => return Ok(refused),
        };
        if before.payer != after.payer {
            return Ok(InteractionAvailability::refused(
                "stale",
                "The selected interaction changed. Refresh it.",
            ));
        }
        if !funded {
            return Ok(InteractionAvailability::refused(
                "ai-unavailable",
                "Speak and Act need an available character AI allowance.",
            ));
        }
        let can_send = if after.reply {
            self.slots.accepting_sends()?
        } else {
            self.slots.available(&after.payer)?
        };
        if !can_send {
            return Ok(InteractionAvailability::refused(
                "busy",
                "Character AI is busy. Your draft is saved; check again shortly.",
            ));
        }
        Ok(InteractionAvailability {
            available: true,
            code: "available",
            reason: None,
            reply: after.reply,
            recipient_name: after.name,
            _custody: Some(after._custody),
        })
    }

    async fn interaction(
        &self,
        scope: Arc<AuthorizedScope>,
        references: Arc<ReferenceIssuer>,
        mode: openlegend_simulation::runtime::InteractionMode,
        target: Option<Arc<String>>,
    ) -> Result<Result<EligibleInteraction, InteractionAvailability>, WorldError> {
        use openlegend_simulation::runtime::{InteractionMode, RuntimeError};
        let authority = self.authority.clone();
        let budget = self.game.host.budget().clone();
        let result = self
            .game
            .world
            .capture(move |session| {
                Ok(
                    authority.current(&scope, Capability::Play, false, |fields, controlling| {
                        let refuse = |code, why| -> Result<_, RuntimeError> {
                            Ok(Err(InteractionAvailability::refused(code, why)))
                        };
                        if !controlling {
                            return refuse("control", "Resume control of your character to send.");
                        }
                        if session.clock()?.paused {
                            return refuse("paused", "Resume the world to send.");
                        }
                        if let Some(target) = target
                            .as_deref()
                            .filter(|_| matches!(mode, InteractionMode::Speak))
                        {
                            return match speech::target_in_world(
                                session,
                                fields,
                                &references,
                                Some(target),
                                &budget,
                            )? {
                                Ok(target) => {
                                    let _custody = budget.reserve(
                                        256 + target.actor.len() + target.name.storage_bytes(),
                                    )?;
                                    Ok(Ok(EligibleInteraction {
                                        payer: target.actor,
                                        reply: true,
                                        name: Some(target.name),
                                        _custody,
                                    }))
                                }
                                Err(refusal) => {
                                    let (code, why) = refusal.report();
                                    refuse(code, why)
                                }
                            };
                        }
                        session.with_player_interaction(
                            &fields.account_id,
                            &fields.actor_id,
                            mode,
                            None,
                            None,
                            |facts| {
                                if !facts.actor_available {
                                    return refuse(
                                        "actor-unavailable",
                                        if matches!(mode, InteractionMode::Speak) {
                                            "Your character cannot speak now."
                                        } else {
                                            "Your character cannot act now."
                                        },
                                    );
                                }
                                let _custody = budget
                                    .reserve(256 + facts.funding_actor_id.len())
                                    .map_err(RuntimeError::from)?;
                                Ok(Ok(EligibleInteraction {
                                    payer: facts.funding_actor_id.to_owned(),
                                    reply: facts.reply,
                                    name: None,
                                    _custody,
                                }))
                            },
                        )?
                    }),
                )
            })
            .await???;
        Ok(result)
    }

    async fn lookup(&self, id: &str) -> Result<Option<Arc<AdmittedJob>>, WorldError> {
        let pending = self.saves.pending_job(id)?;
        let durable = self.game.store.conversation_job(id).await?;
        // A terminal operational result can follow the saved initial job
        // while its accepted queue pointer is still separately held.
        if durable
            .as_ref()
            .is_some_and(|owner| owner.job.status.terminal())
        {
            return Ok(durable);
        }
        Ok(self.saves.pending_job(id)?.or(pending).or(durable))
    }

    pub(crate) async fn submit(
        self: &Arc<Self>,
        request: ChatRequest,
        scope: Arc<AuthorizedScope>,
        custody: ByteReservation,
        refs: Arc<ReferenceIssuer>,
    ) -> Result<SubmitResult, WorldError> {
        let speech = Arc::new(Speech::new(request, scope, custody, &self.game)?);
        if speech.request.candidate.is_some() {
            return Ok(SubmitResult::refused(
                "invalid-declaration",
                "Send a proposal separately from a conversation.",
            ));
        }
        let send = self.clone();
        let (cancel, cancelled) = watch::channel(false);
        struct Intake(watch::Sender<bool>);
        impl Drop for Intake {
            fn drop(&mut self) {
                self.0.send_replace(true);
            }
        }
        let _request = Intake(cancel);
        let (accepted, outcome) = oneshot::channel();
        self.start_job(async move {
            send.receive_speech(speech, refs, cancelled, accepted).await;
        })?;
        outcome
            .await
            .map_err(|_| WorldError::from(openlegend_world_host::pool::HostError::WorkerFailed))?
    }

    async fn receive_speech(
        self: Arc<Self>,
        speech: Arc<Speech>,
        refs: Arc<ReferenceIssuer>,
        cancelled: watch::Receiver<bool>,
        response: oneshot::Sender<Result<SubmitResult, WorldError>>,
    ) {
        match self.admit_speech(speech.clone(), refs, cancelled).await {
            Ok(JobStart::Existing(result)) => {
                let _ = response.send(Ok(result));
            }
            Err(error) => {
                let _ = response.send(Err(error));
            }
            Ok(JobStart::Reply {
                slot,
                job,
                cut,
                source,
            }) => {
                let _ = response.send(Ok(SubmitResult::Job(job.clone())));
                let speech::SpeechSource {
                    reference,
                    _custody,
                } = source;
                let permit = Some((self.authority.clone(), speech.scope.clone()));
                drop(speech);
                self.run(slot, job, vec![reference], cut, permit, None)
                    .await;
            }
        }
    }

    async fn admit_speech(
        &self,
        speech: Arc<Speech>,
        refs: Arc<ReferenceIssuer>,
        mut cancelled: watch::Receiver<bool>,
    ) -> Result<JobStart, WorldError> {
        let until = Instant::now() + ADMISSION_WAIT;
        let mut waiting = self.slots.waiting_send();
        let refused = |code, message| Ok(JobStart::Existing(SubmitResult::refused(code, message)));
        loop {
            self.authority
                .current(&speech.scope, Capability::Play, true, |_, _| ())?;
            if *cancelled.borrow() {
                return Ok(JobStart::Existing(SubmitResult::speech_refusal(
                    SpeechRefusal::Cancelled,
                )));
            }
            if let Some(prior) = self.lookup(&speech.job_id).await? {
                self.authority
                    .current(&speech.scope, Capability::Play, true, |_, _| ())?;
                return if prior.job.fingerprint == speech.fingerprint
                    && belongs_to(&prior.job.authority, &speech.scope.scope)
                {
                    Ok(JobStart::Existing(SubmitResult::Job(prior)))
                } else {
                    refused(
                        "idempotency-conflict",
                        "That request ID was already used for different input.",
                    )
                };
            }
            let target = match speech::target(
                &self.game,
                speech.clone(),
                self.authority.clone(),
                refs.clone(),
            )
            .await?
            {
                Ok(target) => Arc::new(target),
                Err(refusal) => {
                    return Ok(JobStart::Existing(SubmitResult::speech_refusal(refusal)));
                }
            };
            let Some((allowance, ceiling)) = self
                .models
                .as_ref()
                .and_then(settings::ConfiguredModels::interactive_allowance)
            else {
                return refused(
                    "ai-unavailable",
                    "Speak and Act need configured character AI and an allowance.",
                );
            };
            if !self
                .game
                .store
                .model_allowance(&target.actor, allowance, ceiling)
                .await?
            {
                return refused(
                    "ai-unavailable",
                    "Speak and Act need an available character AI allowance.",
                );
            }
            if *cancelled.borrow() {
                return Ok(JobStart::Existing(SubmitResult::speech_refusal(
                    SpeechRefusal::Cancelled,
                )));
            }
            if waiting.is_waiting() && Instant::now() >= until {
                break;
            }
            let scope = &speech.scope.scope;
            let slot = match self.slots.select(
                &target.actor,
                &speech.job_id,
                Some(&scope.account_id),
                &scope.timeline_id,
                SlotPriority::Send(&mut waiting),
            )? {
                Admission::Accepted(slot) => slot,
                Admission::Closed => {
                    return Ok(JobStart::Existing(SubmitResult::speech_refusal(
                        SpeechRefusal::Cancelled,
                    )));
                }
                Admission::Held(mut ended) => {
                    let wait = async {
                        let _ = ended.changed().await;
                    };
                    if !wait_admission(until, &mut cancelled, wait).await {
                        break;
                    }
                    continue;
                }
                Admission::Capacity(mut freed) => {
                    let wait = async {
                        let _ = freed.changed().await;
                    };
                    if !wait_admission(until, &mut cancelled, wait).await {
                        break;
                    }
                    continue;
                }
            };
            // The previous owner can have finished between the first read
            // and this admission. Keep the slot while checking the receipt.
            if let Some(prior) = self.lookup(&speech.job_id).await? {
                self.authority
                    .current(&speech.scope, Capability::Play, true, |_, _| ())?;
                return if prior.job.fingerprint == speech.fingerprint
                    && belongs_to(&prior.job.authority, &speech.scope.scope)
                {
                    Ok(JobStart::Existing(SubmitResult::Job(prior)))
                } else {
                    refused(
                        "idempotency-conflict",
                        "That request ID was already used for different input.",
                    )
                };
            }
            match speech::speak(
                &self.game,
                &self.saves,
                self.authority.clone(),
                refs,
                speech,
                target,
                cancelled,
            )
            .await?
            {
                Spoken::Refused(refusal) => {
                    return Ok(JobStart::Existing(SubmitResult::speech_refusal(refusal)));
                }
                Spoken::Outcome(outcome, funding) => {
                    return Ok(JobStart::Existing(SubmitResult::Command(outcome, funding)));
                }
                Spoken::Accepted {
                    job, source: None, ..
                } => return Ok(JobStart::Existing(SubmitResult::Job(job))),
                Spoken::Accepted {
                    job,
                    source: Some(source),
                    cut,
                    ..
                } => {
                    return Ok(JobStart::Reply {
                        slot,
                        job,
                        cut,
                        source,
                    });
                }
            }
        }
        self.authority
            .current(&speech.scope, Capability::Play, true, |_, _| ())?;
        if *cancelled.borrow() {
            return Ok(JobStart::Existing(SubmitResult::speech_refusal(
                SpeechRefusal::Cancelled,
            )));
        }
        refused(
            "busy",
            "Character AI is busy. Your draft is saved; check again shortly.",
        )
    }

    async fn run(
        &self,
        slot: slots::DecisionSlot,
        job: Arc<AdmittedJob>,
        source: Vec<openlegend_simulation::experience::PersonalSourceRef>,
        cut: u64,
        permit: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
        automatic: Option<decide::AutomaticTrigger>,
    ) {
        let Some(models) = self.models.as_ref() else {
            return;
        };
        let cancellation = slot.resident.stop.subscribe();
        let deadline = Instant::now() + USEFUL_LIFETIME;
        let actor = job.job.request.npc_id.clone();
        let result = decide::run(
            &self.game,
            &self.saves,
            &self.dispatch,
            &models.routes,
            decide::Work {
                job: job.clone(),
                actor,
                source,
                accepted_cut: cut,
                permit,
                cancellation,
                deadline,
                automatic,
            },
        )
        .await;
        self.dispatch.previews().end_job(&job.job.id);
        if let Err(error) = result {
            if let Err(error) = self.finish_failed(&job, cut, error).await {
                eprintln!(
                    "Conversation outcome storage stopped ({}) {error}",
                    job.job.id
                );
            }
        }
    }

    async fn finish_failed(
        &self,
        job: &Arc<AdmittedJob>,
        cut: u64,
        error: CallFailure,
    ) -> Result<(), WorldError> {
        let (stage, cause) = error.cause();
        let (status, message, condition) = match cause {
            CallFailure::Cancelled => (
                SpeechReplyStatus::Cancelled,
                "The reply was cancelled.",
                "cancelled",
            ),
            CallFailure::Stale(reason) => (
                SpeechReplyStatus::Stale,
                "The conversation changed before the reply could be used.",
                *reason,
            ),
            CallFailure::Authority(_) => (
                SpeechReplyStatus::Stale,
                "The conversation is no longer available.",
                "authority",
            ),
            CallFailure::Admission => (
                SpeechReplyStatus::Failed,
                "The conversation has no remaining AI allowance.",
                "allowance",
            ),
            CallFailure::Existing => (
                SpeechReplyStatus::Failed,
                "The original provider request already has a record.",
                "existing",
            ),
            CallFailure::Refused(_) => (
                SpeechReplyStatus::Failed,
                "The reply service declined the request.",
                "provider-refused",
            ),
            CallFailure::Transport(_) => (
                SpeechReplyStatus::Failed,
                "The reply service did not finish the request.",
                "transport",
            ),
            CallFailure::Invalid => (
                SpeechReplyStatus::Failed,
                "The reply could not be used.",
                "invalid-output",
            ),
            CallFailure::World(_) | CallFailure::Commit(_) => (
                SpeechReplyStatus::Failed,
                "The reply could not be saved.",
                "application",
            ),
            CallFailure::At { .. } => unreachable!("decision failure has one stage"),
        };
        self.game
            .world
            .when_durable(cut, Instant::now() + ADMISSION_WAIT)
            .await?;
        let (dispatched, received) = self.game.store.conversation_transfers(&job.job.id).await?;
        let terminal = job.advance(
            status,
            message.into(),
            Some(TerminalOutcome {
                stage: stage.into(),
                condition: condition.into(),
                dispatched,
                received,
                applied: false,
            }),
            self.game.host.budget(),
        )?;
        self.game
            .store
            .put_conversation_job(terminal)
            .await
            .map_err(WorldError::Commit)?;
        self.saves.signal_view();
        Ok(())
    }

    pub(crate) async fn cancel(
        &self,
        scope: &AuthorizedScope,
        id: &str,
    ) -> Result<bool, WorldError> {
        let active = self.slots.selected(id)?;
        self.authority
            .current(scope, Capability::Play, false, |fields, _| {
                if let Some(resident) = active {
                    if resident.account.as_deref() != Some(&fields.account_id)
                        || resident.timeline != fields.timeline_id
                    {
                        return Err(AccessError::Forbidden.into());
                    }
                    resident.stop.send_replace(true);
                    return Ok(true);
                }
                Ok(false)
            })?
    }

    pub(crate) async fn stop(&self) -> Result<(), StoreError> {
        let mut tasks = self
            .tasks
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?
            .take()
            .ok_or(StoreError::WriterUnavailable)?;
        self.slots.stop().await?;
        let mut failed = false;
        while let Some(result) = tasks.join_next().await {
            failed |= result.is_err();
        }
        if failed {
            Err(StoreError::WriterUnavailable)
        } else {
            Ok(())
        }
    }
}

enum JobStart {
    Existing(SubmitResult),
    Reply {
        slot: slots::DecisionSlot,
        job: Arc<AdmittedJob>,
        cut: u64,
        source: speech::SpeechSource,
    },
}

fn belongs_to(owner: &Option<RequestScope>, actual: &RequestScope) -> bool {
    owner.as_ref().is_some_and(|owner| {
        owner.account_id == actual.account_id
            && owner.actor_id == actual.actor_id
            && owner.world_id == actual.world_id
            && owner.timeline_id == actual.timeline_id
    })
}

async fn wait_admission(
    until: Instant,
    cancelled: &mut watch::Receiver<bool>,
    wait: impl std::future::Future<Output = ()>,
) -> bool {
    if *cancelled.borrow() {
        return false;
    }
    tokio::select! {
        biased;
        _ = cancelled.changed() => false,
        outcome = tokio::time::timeout_at(until, wait) => outcome.is_ok(),
    }
}
