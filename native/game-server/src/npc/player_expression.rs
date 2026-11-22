//! Player expression is a funded wording request, not a model-selected action.
//! The native writer alone can bind targets and publish the occurrence.
use super::*;
use crate::{
    authority::now_ms,
    decision_dispatch::{PreparedCall, ProviderDisclosure, decode_provider},
    decision_render::provider::{self, Generation, TextResult},
    store::{AttemptRequest, ConversationJob, InferenceClass, JobRequest},
    world::{ApplicationStart, NpcDisclosure, NpcDisclosureTurn},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::ByteBudget,
    runtime::{PlayerExpressionBinding, RuntimeDirectOutput, RuntimeError},
    text::JsText,
    values::deserialize_present_option,
};
use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ExpressionPolicy {
    instructions: String,
    schema: serde_json::Value,
    pub(super) max_output_tokens: usize,
}

pub(super) fn policy() -> &'static ExpressionPolicy {
    static POLICY: OnceLock<ExpressionPolicy> = OnceLock::new();
    POLICY.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../apps/server/src/player-expression.json"
        ))
        .expect("the build contains the player expression format")
    })
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ExpressionRequest {
    pub(crate) request_id: String,
    pub(crate) text: JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) target_id: Option<String>,
}

struct ExactExpression {
    request: ExpressionRequest,
    id: String,
    fingerprint: String,
    scope: Arc<AuthorizedScope>,
    _storage: ByteReservation,
}

impl ExactExpression {
    fn new(
        mut request: ExpressionRequest,
        scope: Arc<AuthorizedScope>,
        mut custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, WorldError> {
        if !valid_request_id(&request.request_id)
            || request
                .target_id
                .as_deref()
                .is_some_and(|target| !valid_request_id(target))
        {
            return Err(AccessError::Forbidden.into());
        }
        custody
            .merge(
                budget
                    .reserve(4096 + 6 * request.text.storage_bytes())
                    .map_err(RuntimeError::from)?,
            )
            .map_err(RuntimeError::from)?;
        request.text = request.text.trimmed();
        if !(1..=500).contains(&request.text.units_len()) {
            return Err(AccessError::Forbidden.into());
        }
        let id = format!(
            "expression:{}",
            human_request(&scope.scope, &request.request_id)?
        );
        let key = json_record(&(
            "expression",
            &scope.scope.timeline_id,
            &scope.scope.actor_id,
            &request,
        ))
        .map_err(|_| StoreError::InvalidRecord)?;
        Ok(Self {
            request,
            id,
            fingerprint: sha256_hex(key.as_bytes()),
            scope,
            _storage: custody,
        })
    }

    fn original(&self, job: &AdmittedJob) -> bool {
        job.job.kind == "action"
            && job.job.fingerprint == self.fingerprint
            && belongs_to(&job.job.authority, &self.scope.scope)
    }
}

struct ExpressionDisclosure {
    authority: Arc<Authority>,
    scope: Arc<AuthorizedScope>,
    binding: Arc<PlayerExpressionBinding>,
}

impl ProviderDisclosure for ExpressionDisclosure {
    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stopped: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        self.authority
            .current(&self.scope, Capability::Play, true, |scope, _| {
                if *stopped.borrow() {
                    return Err(CallFailure::Cancelled);
                }
                match turn
                    .disclose_player_expression(
                        &scope.account_id,
                        &scope.actor_id,
                        &self.binding,
                        start,
                    )
                    .map_err(CallFailure::World)?
                {
                    Ok(()) => Ok(()),
                    Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("world-publication-busy")),
                    Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
                }
            })
            .map_err(CallFailure::Authority)?
    }
}

impl Director {
    pub(crate) async fn expression_receipt(
        &self,
        scope: Arc<AuthorizedScope>,
        request: ExpressionRequest,
        custody: ByteReservation,
    ) -> Result<Option<SubmitResult>, WorldError> {
        let input = ExactExpression::new(request, scope, custody, self.game.host.budget())?;
        let record = self.receipt(&input.scope, &input.id).await?;
        Ok(record.map(|job| {
            if input.original(&job) {
                SubmitResult::Job(job)
            } else {
                SubmitResult::refused(
                    "idempotency-conflict",
                    "That request ID was already used for different input.",
                )
            }
        }))
    }

    pub(crate) async fn expression(
        self: &Arc<Self>,
        request: ExpressionRequest,
        scope: Arc<AuthorizedScope>,
        custody: ByteReservation,
        refs: Arc<ReferenceIssuer>,
    ) -> Result<SubmitResult, WorldError> {
        let input = Arc::new(ExactExpression::new(
            request,
            scope,
            custody,
            self.game.host.budget(),
        )?);
        let (cancel, cancelled) = watch::channel(false);
        struct Intake(watch::Sender<bool>);
        impl Drop for Intake {
            fn drop(&mut self) {
                self.0.send_replace(true);
            }
        }
        let _owner = Intake(cancel);
        let (accepted, outcome) = oneshot::channel();
        let director = self.clone();
        self.start_job(async move {
            let admitted = director
                .admit_expression(input.clone(), refs, cancelled)
                .await;
            let (job, slot, binding, cut) = match admitted {
                Ok(Ok(admitted)) => admitted,
                Ok(Err(outcome)) => {
                    let _ = accepted.send(Ok(outcome));
                    return;
                }
                Err(error) => {
                    let _ = accepted.send(Err(error));
                    return;
                }
            };
            let _ = accepted.send(Ok(SubmitResult::Job(job.clone())));
            let stopped = slot.resident.stop.subscribe();
            if let Err(error) = director
                .run_expression(input, &job, binding, cut, stopped)
                .await
            {
                if let Err(error) = director.finish_failed(&job, cut, error).await {
                    eprintln!(
                        "Expression outcome storage stopped ({}) {error}",
                        job.job.id
                    );
                }
            }
            drop(slot);
        })?;
        outcome
            .await
            .map_err(|_| WorldError::from(openlegend_world_host::pool::HostError::WorkerFailed))?
    }

    async fn admit_expression(
        &self,
        input: Arc<ExactExpression>,
        refs: Arc<ReferenceIssuer>,
        mut stopped: watch::Receiver<bool>,
    ) -> Result<
        Result<
            (
                Arc<AdmittedJob>,
                slots::DecisionSlot,
                Arc<PlayerExpressionBinding>,
                u64,
            ),
            SubmitResult,
        >,
        WorldError,
    > {
        let scope = &input.scope.scope;
        let live = || {
            self.authority
                .current(&input.scope, Capability::Play, true, |_, _| ())
        };
        live()?;
        if let Some(prior) = self.lookup(&input.id).await? {
            live()?;
            return Ok(Err(original_submission(&input, prior)));
        }
        let Some(model) = &self.expression_model else {
            return Ok(Err(unavailable()));
        };
        let selecting = input.clone();
        let authority = self.authority.clone();
        let selected = self
            .game
            .world
            .capture(move |session| {
                Ok(
                    authority.current(&selecting.scope, Capability::Play, true, |scope, _| {
                        let references = refs
                            .scoped(scope)
                            .map_err(RuntimeError::application_refused)?;
                        let target = selecting.request.target_id.as_deref();
                        let item = target.filter(|target| !target.starts_with("contact-"));
                        let binding = session.prepare_player_expression(
                            &scope.account_id,
                            &scope.actor_id,
                            item,
                            |body| {
                                references
                                    .contact(
                                        body.source_id,
                                        body.physical_life.unwrap_or(0),
                                        body.lease_id,
                                    )
                                    .is_ok_and(|reference| Some(reference.as_str()) == target)
                            },
                            target.is_some(),
                        )?;
                        Ok::<_, RuntimeError>(binding)
                    }),
                )
            })
            .await???;
        let binding = match selected {
            Ok(selection) => Arc::new(selection),
            Err(reason) => return Ok(Err(player_refusal(reason))),
        };
        if !self
            .game
            .store
            .model_allowance(&scope.actor_id, model.model.amount_micro_usd, model.ceiling)
            .await?
        {
            return Ok(Err(unavailable()));
        }
        let start = Instant::now();
        let mut waiting = self.slots.waiting_send();
        let slot = loop {
            live()?;
            if *stopped.borrow() {
                return Ok(Err(player_refusal("cancelled")));
            }
            match self.slots.select(
                &scope.actor_id,
                &input.id,
                Some(&scope.account_id),
                &scope.timeline_id,
                SlotPriority::Send(&mut waiting),
            )? {
                Admission::Accepted(slot) => break slot,
                Admission::Closed => return Ok(Err(player_refusal("cancelled"))),
                Admission::Held(mut ended) => {
                    if !wait_admission(start + USEFUL_LIFETIME, &mut stopped, async {
                        let _ = ended.changed().await;
                    })
                    .await
                    {
                        return Ok(Err(player_refusal(if *stopped.borrow() {
                            "cancelled"
                        } else {
                            "busy"
                        })));
                    }
                }
                Admission::Capacity(mut freed) => {
                    if !wait_admission(start + ADMISSION_WAIT, &mut stopped, async {
                        let _ = freed.changed().await;
                    })
                    .await
                    {
                        return Ok(Err(player_refusal(if *stopped.borrow() {
                            "cancelled"
                        } else {
                            "busy"
                        })));
                    }
                }
            }
        };
        if let Some(prior) = self.lookup(&input.id).await? {
            live()?;
            return Ok(Err(original_submission(&input, prior)));
        }
        let active = input.clone();
        let authority = self.authority.clone();
        let probe = binding.clone();
        let cut = self
            .game
            .world
            .capture(move |session| {
                Ok(
                    authority.current(&active.scope, Capability::Play, true, |scope, _| {
                        let current: Result<_, RuntimeError> = match session
                            .player_expression_current(&scope.account_id, &scope.actor_id, &probe)?
                        {
                            Ok(()) => Ok(Ok(session.accepted_progress()?.through_cut)),
                            Err(reason) => Ok(Err(reason)),
                        };
                        current
                    }),
                )
            })
            .await???;
        let cut = match cut {
            Ok(cut) => cut,
            Err(reason) => return Ok(Err(player_refusal(reason))),
        };
        if *stopped.borrow() || *slot.resident.stop.borrow() {
            return Ok(Err(player_refusal("cancelled")));
        }
        let job = AdmittedJob::new(
            ConversationJob {
                id: input.id.clone(),
                fingerprint: input.fingerprint.clone(),
                kind: "action".into(),
                status: SpeechReplyStatus::Queued,
                message: "Preparing your action description.".into(),
                authority: Some(scope.clone()),
                player_speech_event_id: None,
                retry_of: None,
                request: JobRequest {
                    text: input.request.text.clone(),
                    npc_id: scope.actor_id.clone(),
                    volume: None,
                },
                created_at: now_ms(),
                completed_at: None,
                outcome: None,
            },
            self.game.host.budget(),
        )?;
        self.game
            .store
            .put_conversation_job(job.clone())
            .await
            .map_err(WorldError::Commit)?;
        self.saves.signal_view();
        Ok(Ok((job, slot, binding, cut)))
    }

    async fn run_expression(
        &self,
        input: Arc<ExactExpression>,
        job: &Arc<AdmittedJob>,
        binding: Arc<PlayerExpressionBinding>,
        cut: u64,
        mut stopped: watch::Receiver<bool>,
    ) -> Result<(), CallFailure> {
        let model = self.expression_model.as_ref().ok_or(CallFailure::Invalid)?;
        let config = policy();
        let budget = self.game.host.budget();
        let deadline = Instant::now() + model.timeout;
        let id = format!("{}:expression", input.id);
        let amount = model.model.amount_micro_usd.to_string();
        let has_target = binding.has_target();
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct ExpressionContext<'a> {
            intent: &'a JsText,
            has_target: bool,
        }
        let _prompt_custody = budget.reserve(8192).map_err(|_| CallFailure::Admission)?;
        let prompt = json_record(&ExpressionContext {
            intent: &input.request.text,
            has_target,
        })
        .map_err(|_| CallFailure::Invalid)?;
        let request = provider::generation_request(
            &model.model.destination,
            &model.model.requested,
            model.model.route(&amount, deadline),
            Generation {
                schema_name: "player_expression",
                schema: &config.schema,
                instructions: &config.instructions,
                prompt: &prompt,
                effort: model.model.effort,
                max_output_tokens: config.max_output_tokens,
                stream: false,
            },
            &id,
            budget,
        )?;
        let billing = model.model.macrofold.as_ref().map(|route| route.billing);
        let digest = sha256_hex(prompt.as_bytes());
        drop(prompt);
        drop(_prompt_custody);
        let budget = budget.clone();
        let decode_budget = budget.clone();
        let (predicate, custody) = self
            .dispatch
            .submit(
                PreparedCall {
                    request,
                    allowance: AttemptRequest {
                        id,
                        actor: input.scope.scope.actor_id.clone(),
                        job: input.id.clone(),
                        provider: InferenceClass::OpenAi,
                        category: "preparation",
                        stage: "expression",
                        level: None,
                        background: false,
                        amount: model.model.amount_micro_usd,
                        ceiling: model.ceiling,
                    },
                    requested_model: model.model.requested.clone(),
                    context_digest: digest,
                    macrofold_billing_mode: billing.map(|mode| match mode {
                        crate::provider_transport::macrofold::BillingMode::Byok => "byok",
                        crate::provider_transport::macrofold::BillingMode::Managed => "managed",
                    }),
                    deadline,
                    evidence_cut: cut,
                    preview: None,
                },
                ExpressionDisclosure {
                    authority: self.authority.clone(),
                    scope: input.scope.clone(),
                    binding: binding.clone(),
                },
                stopped.clone(),
                decode_provider(billing, decode_budget.clone(), move |value| {
                    let direct;
                    let text = if billing.is_some() {
                        match provider::macrofold_text(value).map_err(|_| CallFailure::Invalid)? {
                            TextResult::Complete(text) => text,
                            TextResult::Refused => return Err(CallFailure::Invalid),
                        }
                    } else {
                        direct = provider::direct_text(value, &decode_budget)
                            .map_err(|_| CallFailure::Invalid)?;
                        direct.text.as_str()
                    };
                    decode_predicate(text, has_target, &decode_budget)
                }),
            )
            .await?;
        let predicate = Arc::new((predicate, custody));
        let mut publications = self.saves.subscribe();
        let apply_deadline = Instant::now() + USEFUL_LIFETIME;
        loop {
            let verdict = self
                .apply_expression(
                    input.clone(),
                    job,
                    binding.clone(),
                    predicate.clone(),
                    stopped.clone(),
                )
                .await?;
            if verdict != Some("paused") {
                return verdict
                    .map_or(Ok(()), |reason| Err(CallFailure::Stale(reason).at("apply")));
            }
            // Hold the one funded answer until ordinary world publication
            // reports resume, cancellation, or a changed controlling scope.
            let waiting = async {
                let _ = publications.changed().await;
            };
            if !wait_admission(apply_deadline, &mut stopped, waiting).await {
                return Err(if *stopped.borrow() {
                    CallFailure::Cancelled
                } else {
                    CallFailure::Stale("paused")
                }
                .at("apply"));
            }
        }
    }

    async fn apply_expression(
        &self,
        input: Arc<ExactExpression>,
        job: &Arc<AdmittedJob>,
        binding: Arc<PlayerExpressionBinding>,
        predicate: Arc<(JsText, ByteReservation)>,
        mut stopped: watch::Receiver<bool>,
    ) -> Result<Option<&'static str>, CallFailure> {
        enum Publication {
            Pending(&'static str),
            Saved(Arc<AcceptedSaveInput>),
        }
        let _ordinary = tokio::select! {
            biased;
            _ = stopped.wait_for(|cancelled| *cancelled) => return Err(CallFailure::Cancelled.at("apply")),
            result = tokio::time::timeout(ADMISSION_WAIT, self.saves.enter_ordinary()) => {
                result.map_err(|_| CallFailure::Stale("world-admission").at("apply"))?
            }
        };
        self.saves
            .check_admission(Instant::now())
            .map_err(CallFailure::World)?;
        let authority = self.authority.clone();
        let final_authority = authority.clone();
        let begin = input.clone();
        let begin_stop = stopped.clone();
        let answerer = self.game.clone();
        let stage = self.saves.clone();
        let accept = stage.clone();
        let world = self.game.world.clone();
        let job = job.clone();
        world.request_advance_publication();
        let settle = world.clone();
        let output = world
            .execute_and_publish(
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_OTHER,
                move |session| {
                    if *begin_stop.borrow() {
                        return Ok(ApplicationStart::Existing(Publication::Pending(
                            "cancelled",
                        )));
                    }
                    authority.current(&begin.scope, Capability::Play, true, |scope, _| {
                        match session.begin_player_expression(
                            &scope.account_id,
                            &scope.actor_id,
                            &begin.id,
                            &predicate.0,
                            &binding,
                        )? {
                            Ok(candidate) => Ok(ApplicationStart::Candidate(candidate)),
                            Err(reason) => {
                                Ok(ApplicationStart::Existing(Publication::Pending(reason)))
                            }
                        }
                    })?
                },
                move |question| {
                    let provider = answerer.clone();
                    async move { provider.answer_operation(question).await }
                },
                move |output, budget| {
                    let RuntimeDirectOutput::Prepared(product) = output else {
                        return Err(RuntimeError::application_refused(
                            "Expressive output cannot preview.",
                        ));
                    };
                    let result = product.outcome();
                    let status = if result.ok {
                        SpeechReplyStatus::Completed
                    } else {
                        SpeechReplyStatus::Stale
                    };
                    let terminal = job
                        .advance(
                            status,
                            result.message.clone(),
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
                    Ok(Publication::Saved(stage.stage_with_job(
                        &product,
                        None,
                        Some(terminal),
                    )?))
                },
                move |fence, key, _| {
                    final_authority.current(&input.scope, Capability::Play, true, |scope, _| {
                        if *stopped.borrow() {
                            return Ok(fence.settle(key, false)?);
                        }
                        settle.settle_npc_response(&scope.actor_id, fence, key)
                    })?
                },
                move |output| {
                    if let Publication::Saved(save) = output {
                        accept.accept(save);
                    }
                },
            )
            .await
            .map_err(|error| {
                match error {
                    WorldError::Access(error) => CallFailure::Authority(error),
                    WorldError::SourceEditPending => CallFailure::Stale("source-edit-pending"),
                    error => CallFailure::World(error),
                }
                .at("apply")
            })?;
        match output {
            Some(Publication::Saved(_)) => Ok(None),
            Some(Publication::Pending("cancelled")) | None => {
                Err(CallFailure::Cancelled.at("apply"))
            }
            Some(Publication::Pending(reason)) => Ok(Some(reason)),
        }
    }
}

fn original_submission(input: &ExactExpression, job: Arc<AdmittedJob>) -> SubmitResult {
    if input.original(&job) {
        SubmitResult::Job(job)
    } else {
        SubmitResult::refused(
            "idempotency-conflict",
            "That request ID was already used for different input.",
        )
    }
}

fn unavailable() -> SubmitResult {
    SubmitResult::refused(
        "ai-unavailable",
        "Act needs configured character AI and an available allowance.",
    )
}

fn player_refusal(reason: &'static str) -> SubmitResult {
    let message = match reason {
        "target" => "The selected object is no longer available.",
        "paused" => "Resume the world to send.",
        "busy" => "Character AI is busy. Your draft is saved; check again shortly.",
        "cancelled" => "The action was cancelled.",
        _ => "Your character cannot act now.",
    };
    SubmitResult::refused(reason, message)
}

fn decode_predicate(
    text: &str,
    has_target: bool,
    budget: &ByteBudget,
) -> Result<(JsText, ByteReservation), CallFailure> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Words {
        predicate: JsText,
    }
    if text.len() > 8192 {
        return Err(CallFailure::Invalid);
    }
    let custody = budget
        .reserve(256 + 6 * text.len())
        .map_err(|_| CallFailure::Admission)?;
    let output: Words = serde_json::from_str(text).map_err(|_| CallFailure::Invalid)?;
    let value = output.predicate.trimmed();
    if !(1..=240).contains(&value.units_len())
        || value.contains(&JsText::from("{target}")) != has_target
    {
        return Err(CallFailure::Invalid);
    }
    Ok((value, custody))
}
