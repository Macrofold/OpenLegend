//! An explicit second decision about one already accepted private utterance.
//! The normal speech mutation is never part of this request.

use super::*;
use crate::{
    authority::now_ms,
    store::{ConversationJob, JobRequest},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::ByteBudget,
    narration::{NameArticle, name_phrase},
    runtime::{InteractionMode, NativeWorldSession},
    text::JsText,
};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ChatRetryRequest {
    request_id: String,
    original_request_id: String,
}

struct Retry {
    id: String,
    fingerprint: String,
    original: String,
    scope: Arc<AuthorizedScope>,
    _custody: ByteReservation,
}

struct ReplySource {
    proof: speech::SpeechSource,
    message: JsText,
    _message_custody: ByteReservation,
    cut: u64,
}

struct Intake(watch::Sender<bool>);

impl Drop for Intake {
    fn drop(&mut self) {
        self.0.send_replace(true);
    }
}

impl Director {
    pub(crate) async fn retry(
        self: &Arc<Self>,
        input: ChatRetryRequest,
        scope: Arc<AuthorizedScope>,
        mut custody: ByteReservation,
    ) -> Result<SubmitResult, WorldError> {
        if !valid_request_id(&input.request_id) || !valid_request_id(&input.original_request_id) {
            return Err(AccessError::Forbidden.into());
        }
        custody
            .merge(
                self.game
                    .host
                    .budget()
                    .reserve(4096)
                    .map_err(|_| StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let id = human_request(&scope.scope, &input.request_id)?;
        let fingerprint = sha256_hex(
            json_record(&("chat-retry", &input.original_request_id))
                .map_err(|_| StoreError::InvalidRecord)?
                .as_bytes(),
        );
        let retry = Arc::new(Retry {
            id,
            fingerprint,
            original: input.original_request_id,
            scope,
            _custody: custody,
        });
        let (cancel, stopped) = watch::channel(false);
        let _intake = Intake(cancel);
        let (reply, response) = oneshot::channel();
        let director = self.clone();
        self.start_job(async move {
            match director.admit_retry(retry.clone(), stopped).await {
                Ok(JobStart::Reply {
                    slot,
                    job,
                    cut,
                    source,
                }) => {
                    let _ = reply.send(Ok(SubmitResult::Job(job.clone())));
                    let speech::SpeechSource {
                        reference,
                        _custody,
                    } = source;
                    let permit = Some((director.authority.clone(), retry.scope.clone()));
                    drop(retry);
                    director
                        .run(slot, job, vec![reference], cut, permit, None)
                        .await;
                }
                Ok(JobStart::Existing(result)) => {
                    let _ = reply.send(Ok(result));
                }
                Err(error) => {
                    let _ = reply.send(Err(error));
                }
            }
        })?;
        response
            .await
            .map_err(|_| openlegend_world_host::pool::HostError::WorkerFailed)?
    }

    async fn admit_retry(
        &self,
        retry: Arc<Retry>,
        mut stopped: watch::Receiver<bool>,
    ) -> Result<JobStart, WorldError> {
        let until = Instant::now() + ADMISSION_WAIT;
        let refuse = |result| Ok(JobStart::Existing(result));
        let cancelled = || SubmitResult::refused("cancelled", "Your retry was not started.");
        loop {
            self.authority
                .current(&retry.scope, Capability::Play, true, |_, _| ())?;
            if *stopped.borrow() {
                return refuse(cancelled());
            }
            if let Some(prior) = self.lookup(&retry.id).await? {
                return refuse(self.replayed_retry(&retry, prior)?);
            }
            let Some(original) = self.lookup(&retry.original).await? else {
                return refuse(unavailable());
            };
            let prior = &original.job;
            if prior.kind != "chat"
                || prior.status != SpeechReplyStatus::Failed
                || !belongs_to(&prior.authority, &retry.scope.scope)
                || prior.player_speech_event_id.is_none()
                || prior.outcome.as_ref().is_some_and(|value| value.applied)
            {
                return refuse(unavailable());
            }
            // Check the captured recipient before consulting their spending
            // owner; recheck the same original after spending and slot waits.
            if let Err(result) = self.retry_source(retry.clone(), original.clone()).await? {
                return refuse(result);
            }
            let Some((allowance, ceiling)) = self
                .models
                .as_ref()
                .and_then(settings::ConfiguredModels::interactive_allowance)
            else {
                return refuse(no_allowance());
            };
            let target = &prior.request.npc_id;
            if !self
                .game
                .store
                .model_allowance(target, allowance, ceiling)
                .await?
            {
                return refuse(no_allowance());
            }
            let slot = match self.slots.select(
                target,
                &retry.id,
                Some(&retry.scope.scope.account_id),
                &retry.scope.scope.timeline_id,
            )? {
                Admission::Accepted(slot) => slot,
                Admission::Closed => return refuse(cancelled()),
                Admission::Held(mut wait) => {
                    if !wait_admission(until, &mut stopped, async {
                        let _ = wait.changed().await;
                    })
                    .await
                    {
                        break;
                    }
                    continue;
                }
                Admission::Capacity(mut wait) => {
                    if !wait_admission(until, &mut stopped, async {
                        let _ = wait.changed().await;
                    })
                    .await
                    {
                        break;
                    }
                    continue;
                }
            };
            if let Some(prior) = self.lookup(&retry.id).await? {
                return refuse(self.replayed_retry(&retry, prior)?);
            }
            let _ordinary = self.saves.enter_ordinary().await;
            self.saves.check_admission(Instant::now())?;
            let source = match self.retry_source(retry.clone(), original.clone()).await? {
                Ok(source) => source,
                Err(result) => return refuse(result),
            };
            self.authority
                .current(&retry.scope, Capability::Play, true, |_, _| ())?;
            if *stopped.borrow() {
                return refuse(cancelled());
            }
            let budget = self.game.host.budget();
            let _copying = budget
                .reserve(4096 + prior.request.text.storage_bytes())
                .map_err(|_| StoreError::Capacity)?;
            let job = AdmittedJob::new(
                ConversationJob {
                    id: retry.id.clone(),
                    fingerprint: retry.fingerprint.clone(),
                    kind: "chat".into(),
                    status: SpeechReplyStatus::Queued,
                    message: source.message,
                    authority: Some(retry.scope.scope.clone()),
                    player_speech_event_id: prior.player_speech_event_id.clone(),
                    retry_of: Some(retry.original.clone()),
                    request: JobRequest {
                        text: prior.request.text.clone(),
                        npc_id: target.clone(),
                        volume: prior.request.volume,
                    },
                    created_at: now_ms().max(
                        prior
                            .created_at
                            .checked_add(1)
                            .ok_or(StoreError::InvalidRecord)?,
                    ),
                    completed_at: None,
                    outcome: None,
                },
                budget,
            )?;
            if !self
                .game
                .store
                .admit_conversation_retry(job.clone(), stopped.clone())
                .await
                .map_err(WorldError::Commit)?
            {
                return refuse(if *stopped.borrow() {
                    cancelled()
                } else {
                    unavailable()
                });
            }
            self.saves.signal_view();
            return Ok(JobStart::Reply {
                slot,
                job,
                cut: source.cut,
                source: source.proof,
            });
        }
        self.authority
            .current(&retry.scope, Capability::Play, true, |_, _| ())?;
        refuse(if *stopped.borrow() {
            cancelled()
        } else {
            SubmitResult::refused("busy", "The resident is still considering another request.")
        })
    }

    fn replayed_retry(
        &self,
        retry: &Retry,
        prior: Arc<AdmittedJob>,
    ) -> Result<SubmitResult, WorldError> {
        self.authority
            .current(&retry.scope, Capability::Play, true, |_, _| ())?;
        Ok(
            if prior.job.fingerprint == retry.fingerprint
                && prior.job.retry_of.as_deref() == Some(&retry.original)
                && belongs_to(&prior.job.authority, &retry.scope.scope)
            {
                SubmitResult::Job(prior)
            } else {
                SubmitResult::refused(
                    "idempotency-conflict",
                    "That request ID was already used for different input.",
                )
            },
        )
    }

    async fn retry_source(
        &self,
        retry: Arc<Retry>,
        original: Arc<AdmittedJob>,
    ) -> Result<Result<ReplySource, SubmitResult>, WorldError> {
        let authority = self.authority.clone();
        let host = self.game.world.clone();
        let budget = self.game.host.budget().clone();
        host.request_advance_publication();
        let result = self
            .game
            .world
            .capture(move |session| {
                Ok(
                    authority.current(&retry.scope, Capability::Play, true, |scope, _| {
                        let target = &original.job.request.npc_id;
                        let event = original
                            .job
                            .player_speech_event_id
                            .as_deref()
                            .ok_or(StoreError::InvalidRecord)?;
                        let current = host
                            .with_unedited_sources(&[&scope.actor_id, target], || {
                                accepted_source(session, scope, target, event, &budget)
                            })?;
                        Ok::<_, WorldError>(current.unwrap_or_else(|| Err(unavailable())))
                    }),
                )
            })
            .await?;
        result?
    }
}

fn accepted_source(
    session: &NativeWorldSession,
    scope: &RequestScope,
    target: &str,
    event: &str,
    budget: &ByteBudget,
) -> Result<Result<ReplySource, SubmitResult>, WorldError> {
    if session.clock()?.paused {
        return Ok(Err(SubmitResult::speech_refusal(SpeechRefusal::Paused)));
    }
    session.with_player_interaction(
        &scope.account_id,
        &scope.actor_id,
        InteractionMode::Speak,
        Some(target),
        Some(event),
        |facts| {
            if !facts.actor_available
                || !facts.reply
                || facts.funding_actor_id != target
                || facts.recipient_can_respond != Some(true)
            {
                return Ok(Err(SubmitResult::speech_refusal(
                    SpeechRefusal::Unavailable,
                )));
            }
            let Some(reference) = facts.addressed_source else {
                return Ok(Err(unavailable()));
            };
            let name = facts
                .recipient_description()
                .ok_or(StoreError::InvalidRecord)?;
            let _custody = budget
                .reserve(128 + reference.id.len() + reference.revision.len())
                .map_err(|_| StoreError::Capacity)?;
            let _message_custody = budget
                .reserve(256 + 8 * name.name.storage_bytes())
                .map_err(|_| StoreError::Capacity)?;
            let mut message = name_phrase(name, NameArticle::Definite, true);
            message.push_str(" is considering your words.");
            Ok(Ok(ReplySource {
                cut: session.accepted_progress()?.through_cut,
                proof: speech::SpeechSource {
                    reference: reference.clone(),
                    _custody,
                },
                message,
                _message_custody,
            }))
        },
    )?
}

fn unavailable() -> SubmitResult {
    SubmitResult::refused(
        "retry-unavailable",
        "That conversation request can no longer be retried.",
    )
}

fn no_allowance() -> SubmitResult {
    SubmitResult::refused(
        "ai-unavailable",
        "The conversation needs an available character AI allowance.",
    )
}
