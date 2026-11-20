//! One admitted decision keeps its original evidence, deadline and job ID
//! from preparation through settlement. Transport and database waits do not
//! occupy a simulation turn.

use crate::{
    authority::{Authority, AuthorizedScope},
    boot::CurrentServer,
    decision_dispatch::{
        CallAuthority, CallFailure, DecisionDispatch, PreparedCall, ProviderObservation,
    },
    decision_render::{BoundSchema, OfferedAction, provider},
    live_save::LiveSaves,
    provider_transport::{
        FundedReply, HttpEvidence, ProviderDestination,
        macrofold::{self, BillingBinding, BillingMode},
    },
    store::{AdmittedJob, AttemptRequest, InferenceClass, ModelUsage},
};
use openlegend_simulation::{
    encoding::{json_tree_allocation_bound, sha256_hex},
    experience::PersonalSourceRef,
    host::{ByteBudget, ByteReservation},
};
use serde::Serialize;
use serde_json::Value;
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

mod prepare;

pub(super) struct Models {
    pub(super) judgment: Model,
    pub(super) fast: Option<Model>,
    pub(super) complex: Option<Model>,
    pub(super) ceiling_micro_usd: u64,
}

pub(super) struct Model {
    pub(super) destination: ProviderDestination,
    pub(super) requested: String,
    pub(super) macrofold: Option<MacrofoldCatalog>,
    pub(super) amount_micro_usd: u64,
    pub(super) output_tokens: usize,
    pub(super) effort: Option<&'static str>,
}

pub(super) struct MacrofoldCatalog {
    pub(super) billing: BillingMode,
    pub(super) connection: Option<String>,
}

impl Model {
    fn route<'a>(
        &'a self,
        allowance: &'a str,
        deadline: Instant,
    ) -> Option<provider::MacrofoldRoute<'a>> {
        let catalog = self.macrofold.as_ref()?;
        let remaining = deadline.saturating_duration_since(Instant::now());
        let seconds = remaining
            .as_secs()
            .saturating_add(u64::from(remaining.subsec_nanos() > 0));
        Some(provider::MacrofoldRoute {
            workspace_id: None,
            binding: provider::MacrofoldBinding::Catalog {
                provider: "openrouter",
                model: &self.requested,
                billing_mode: billing_name(catalog.billing),
                provider_connection_id: catalog.connection.as_deref(),
            },
            max_cost_micro_usd: allowance,
            timeout_seconds: seconds,
        })
    }
}

fn billing_name(billing: BillingMode) -> &'static str {
    match billing {
        BillingMode::Managed => "managed",
        BillingMode::Byok => "byok",
    }
}

pub(super) struct Work {
    pub(super) job: Arc<AdmittedJob>,
    pub(super) actor: String,
    pub(super) source: Vec<PersonalSourceRef>,
    pub(super) accepted_cut: u64,
    pub(super) permit: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    pub(super) cancellation: watch::Receiver<bool>,
    pub(super) deadline: Instant,
    pub(super) automatic: Option<AutomaticTrigger>,
}

pub(super) struct AutomaticTrigger {
    pub(super) read: Arc<openlegend_simulation::runtime::RuntimeNpcTrigger>,
    pub(super) evidence: Option<String>,
    pub(super) causes: Vec<usize>,
}

pub(super) async fn run(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    dispatch: &Arc<DecisionDispatch>,
    models: &Models,
    work: Work,
) -> Result<(), CallFailure> {
    openlegend_simulation::profile_body!(
        NPC,
        {
            let mut stop = work.cancellation.clone();
            let mut collected = tokio::select! {
                biased;
                _ = stopped(&mut stop) => return Err(CallFailure::Cancelled),
                prepared = tokio::time::timeout_at(work.deadline,prepare::collect(game, &work)) => {
                    prepared.map_err(|_| CallFailure::Stale("decision-deadline"))?.map_err(|error| error.at("preparation"))?
                }
            };
            ensure_running(&work)?;
            let review = tokio::select! {
                biased;
                _ = stopped(&mut stop) => return Err(CallFailure::Cancelled),
                review = tokio::time::timeout_at(work.deadline, collected.review(game, &work)) => {
                    review.map_err(|_| CallFailure::Stale("decision-deadline"))?.map_err(|error| error.at("recall-preparation"))?
                }
            };
            if let Some(review) = review {
                let answered = match recall_attention(game, dispatch, &work, models, &review).await
                {
                    Ok(answered) => Some(answered),
                    Err(error) => match error.cause().1 {
                        CallFailure::Cancelled
                        | CallFailure::Authority(_)
                        | CallFailure::Commit(_)
                        | CallFailure::World(_) => return Err(error),
                        CallFailure::Stale(reason)
                            if !matches!(
                                *reason,
                                "native-response-prepared-witness" | "world-publication-busy"
                            ) =>
                        {
                            return Err(error);
                        }
                        _ => None,
                    },
                };
                // Optional relevance failure cannot erase required context. Keep the
                // original read and freshly bind only the evidence the decision uses.
                // The next eligibility/authority checks still refuse stale or cancelled work.
                ensure_running(&work)?;
                collected.accept_review(review.ticket, |index| {
                    game.cognition.recall_includes(
                        answered
                            .as_ref()
                            .and_then(|value| value.predicate(&format!("c{index}"))),
                    )
                })?;
            }
            let prepared = tokio::select! {
                biased;
                _ = stopped(&mut stop) => return Err(CallFailure::Cancelled),
                prepared = tokio::time::timeout_at(work.deadline,prepare::finish(game, &work, collected)) => {
                    prepared.map_err(|_| CallFailure::Stale("decision-deadline"))?.map_err(|error| error.at("preparation"))?
                }
            };
            ensure_running(&work)?;
            let available = models.fast.is_some();
            let questions = game
                .cognition
                .route_questions(prepared.addressed, prepared.speech_trigger, available)
                .map_err(|_| CallFailure::Invalid)?;
            let budget = game.host.budget();
            let source = prepared.ticket.clone();
            let decision = &models.judgment;
            let allowance = decision.amount_micro_usd.to_string();
            let operation = ":attempt:0:route";
            let id = format!("{}{operation}", work.job.job.id);
            let input = provider::Judgment {
                state: provider::JudgmentState::Prompt(prepared.route.as_str()),
                questions,
            };
            let request = provider::judgment_request(
                &decision.destination,
                &decision.requested,
                decision.route(&allowance, work.deadline),
                input,
                decision.output_tokens,
                &id,
                budget,
            )?;
            let policy = game.cognition.clone();
            let parse_budget = budget.clone();
            let addressed = prepared.addressed;
            let speech_trigger = prepared.speech_trigger;
            let observed = dispatch
                .submit(
                    side(
                        &work,
                        decision,
                        models.ceiling_micro_usd,
                        id,
                        request,
                        InferenceClass::Jev,
                        "route",
                        1,
                        prepared.route.as_str(),
                        prepared.through,
                    )?,
                    CallAuthority {
                        source,
                        speaker: work.permit.clone(),
                    },
                    work.cancellation.clone(),
                    decoder(
                        decision.macrofold.as_ref().map(|value| value.billing),
                        parse_budget.clone(),
                        move |parsed| {
                            let questions = policy
                                .route_questions(addressed, speech_trigger, available)
                                .map_err(|_| CallFailure::Invalid)?;
                            provider::decode_judgment(parsed, questions, &parse_budget)
                                .map_err(|_| CallFailure::Invalid)
                        },
                    ),
                )
                .await
                .map_err(|error| error.at("route"))?;
            ensure_running(&work)?;
            let selected_route = observed.choice("route").filter(|choice| {
                observed
                    .probability("route", choice)
                    .is_some_and(|rating| rating >= 0.5)
            });
            let route = match selected_route {
                None | Some("native") if available && prepared.addressed => "level2",
                None | Some("native") => {
                    return finish_native(game, saves, work, prepared.ticket, None).await;
                }
                Some(route) => route,
            };
            let choose = route == "level1";
            let include_actions = choose
                || !prepared.speech_trigger
                || observed.choice("possibleAction") != Some("no")
                || observed.probability("possibleAction", "no").unwrap_or(0.0) < 0.8;
            let mut selected = Vec::new();
            let mut escalation = 2;
            if include_actions {
                let accepted = action_attention(
                    game,
                    dispatch,
                    &work,
                    &prepared,
                    decision,
                    models.ceiling_micro_usd,
                    choose,
                )
                .await;
                match accepted {
                    Ok(Some(rated)) => {
                        let mut best = None;
                        let threshold = if choose {
                            game.cognition.choice_threshold
                        } else {
                            0.5
                        };
                        for offer in &prepared.context.offers {
                            if let Some(value) = rated
                                .predicate(&offer.id)
                                .filter(|value| *value >= threshold)
                            {
                                selected.push(offer);
                                if best.is_none_or(|(_, rating)| value > rating) {
                                    best = Some((offer, value));
                                }
                            }
                        }
                        if choose && let Some((offer, _)) = best {
                            let picked = (!offer.no_intervention).then_some(offer);
                            return finish_native(game, saves, work, prepared.ticket, picked).await;
                        }
                    }
                    Ok(None) => {}
                    // A settled optional judgment can have unusable ratings. Keep
                    // the permitted offers and let the generation dispatch recheck
                    // the same decision. A level-one rating is the decision itself.
                    Err(error) if !choose && matches!(error.cause().1, CallFailure::Invalid) => {
                        ensure_running(&work)?;
                        selected.extend(&prepared.context.offers);
                    }
                    Err(error) => return Err(error.at("action-attention")),
                }
                if choose {
                    if !available {
                        return finish_native(game, saves, work, prepared.ticket, None).await;
                    }
                    let mut best = None;
                    for level in [2, 3, 4] {
                        if let Some(value) = observed.probability("route", &format!("level{level}"))
                            && best.is_none_or(|(_, rating)| value > rating)
                        {
                            best = Some((level, value));
                        }
                    }
                    escalation = best.map_or(2, |(level, _)| level);
                }
            }
            let level = match route {
                "level1" => escalation,
                "level2" => 2,
                "level3" => 3,
                "level4" => 4,
                _ => return Err(CallFailure::Invalid.at("route")),
            };
            let model = if level == 2 {
                models.fast.as_ref()
            } else {
                models.complex.as_ref()
            }
            .ok_or(CallFailure::Invalid.at("route"))?;
            let (response, schema) = prepared
                .context
                .render_response(game, &selected, include_actions)
                .map_err(|error| error.at("generation-preparation"))?;
            let schema = Arc::new(schema);
            let allowance = model.amount_micro_usd.to_string();
            let id = format!("{}:attempt:0:generate", work.job.job.id);
            let instructions_bytes = game
                .cognition
                .response_instructions
                .len()
                .saturating_add(game.cognition.query_instructions.len())
                .saturating_add(1);
            let _instructions_custody = budget
                .reserve(instructions_bytes)
                .map_err(|_| CallFailure::Invalid)?;
            let instructions = format!(
                "{} {}",
                game.cognition.response_instructions, game.cognition.query_instructions
            );
            let preview = if model.macrofold.is_some() && prepared.addressed {
                work.permit
                    .as_ref()
                    .zip(prepared.context.preview_player.as_ref())
                    .and_then(|((authority, scope), player)| {
                        super::preview::PreviewAttempt::new(
                            authority.clone(),
                            scope.clone(),
                            work.job.clone(),
                            work.cancellation.clone(),
                            schema.clone(),
                            player,
                            budget,
                        )
                    })
            } else {
                None
            };
            let generation = provider::Generation {
                schema_name: "npc_response",
                schema: &schema,
                instructions: &instructions,
                prompt: response.as_str(),
                effort: model.effort,
                max_output_tokens: model.output_tokens,
                stream: preview.is_some(),
            };
            let request = provider::generation_request(
                &model.destination,
                &model.requested,
                model.route(&allowance, work.deadline),
                generation,
                &id,
                budget,
            )?;
            let macrofold = model.macrofold.as_ref().map(|value| value.billing);
            let parse_budget = budget.clone();
            let mut call = side(
                &work,
                model,
                models.ceiling_micro_usd,
                id,
                request,
                InferenceClass::OpenAi,
                "generate",
                level,
                response.as_str(),
                prepared.through,
            )?;
            call.preview = preview;
            let parsed = dispatch
                .submit(
                    call,
                    CallAuthority {
                        source: prepared.ticket.clone(),
                        speaker: work.permit.clone(),
                    },
                    work.cancellation.clone(),
                    decoder(macrofold, parse_budget.clone(), move |value| {
                        if macrofold.is_some() {
                            match provider::macrofold_text(value)
                                .map_err(|_| CallFailure::Invalid)?
                            {
                                provider::TextResult::Refused => Err(CallFailure::Invalid),
                                provider::TextResult::Complete(text) => {
                                    provider::generation_output(text, &schema, &parse_budget)
                                        .map_err(|_| CallFailure::Invalid)
                                }
                            }
                        } else {
                            direct_output(value, &schema, &parse_budget)
                        }
                    }),
                )
                .await
                .map_err(|error| error.at("generate"))?;
            ensure_running(&work)?;
            let payload = effects(parsed, &prepared.frame, budget)
                .map_err(|error| error.at("response-validation"))?;
            super::apply::apply(
                saves,
                game,
                &work.job,
                prepared.ticket,
                payload,
                work.permit,
                work.cancellation,
                work.deadline,
                dispatch.previews().get(&work.job.job.id),
            )
            .await
            .map_err(|error| error.at("response-application"))
        },
        CallFailure::profile_outcome
    )
}

async fn stopped(watch: &mut watch::Receiver<bool>) {
    while !*watch.borrow() && watch.changed().await.is_ok() {}
}

async fn finish_native(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    work: Work,
    ticket: Arc<openlegend_simulation::runtime::RuntimeNpcResponseTicket>,
    choice: Option<&prepare::NativeOffer>,
) -> Result<(), CallFailure> {
    let Some(choice) = choice else {
        // A native/no-intervention judgment has no gameplay draft. Like
        // Source, keep the completed job and its attempt receipt without
        // starting a world mutation or inventing a response occurrence.
        ensure_running(&work)?;
        let (dispatched, received) = game
            .store
            .conversation_transfers(&work.job.job.id)
            .await
            .map_err(|error| CallFailure::World(error.into()))?;
        let terminal = work
            .job
            .advance(
                crate::player_events::SpeechReplyStatus::Completed,
                "Native behavior continues; no model response.".into(),
                Some(crate::store::TerminalOutcome {
                    stage: "route".into(),
                    condition: "native".into(),
                    dispatched,
                    received,
                    applied: false,
                }),
                game.host.budget(),
            )
            .map_err(|error| CallFailure::World(error.into()))?;
        drop(ticket);
        game.store
            .put_conversation_job(terminal)
            .await
            .map_err(CallFailure::Commit)?;
        saves.signal_view();
        return Ok(());
    };
    let transient = game
        .host
        .budget()
        .reserve(4096)
        .map_err(|_| CallFailure::Invalid)?;
    let operations = [serde_json::json!({
        "localId":"action","requiresAccepted":[],"talk":null,"think":null,"goal":null,"plan":null,
        "act":{"kind":"known","mode":if choice.transition=="continue" {"enqueue"} else {&choice.transition},
            "actionId":choice.id,"verb":null,"targetEntityId":null,"description":null},
    })];
    let payload = crate::wire::encode(
        &Operations {
            operations: &operations,
        },
        b"",
        b"",
        game.host.budget(),
    )
    .map_err(|_| CallFailure::Invalid)?;
    drop(operations);
    drop(transient);
    super::apply::apply(
        saves,
        game,
        &work.job,
        ticket,
        payload,
        work.permit,
        work.cancellation,
        work.deadline,
        None,
    )
    .await
    .map_err(|error| error.at("response-application"))
}

async fn recall_attention(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    work: &Work,
    models: &Models,
    review: &prepare::RecallReview,
) -> Result<provider::JudgmentAnswer, CallFailure> {
    let budget = game.host.budget();
    let decision = &models.judgment;
    let allowance = decision.amount_micro_usd.to_string();
    let id = format!("{}:attempt:0:attention:0", work.job.job.id);
    let attended = review.request.clone();
    let request = provider::judgment_request(
        &decision.destination,
        &decision.requested,
        decision.route(&allowance, work.deadline),
        provider::Judgment {
            state: provider::JudgmentState::Structured(&attended.state),
            questions: &attended.questions,
        },
        decision.output_tokens,
        &id,
        budget,
    )?;
    let evidence_digest = openlegend_simulation::encoding::hex_bytes(&request.digest);
    let parser = budget.clone();
    dispatch
        .submit(
            side(
                work,
                decision,
                models.ceiling_micro_usd,
                id,
                request,
                InferenceClass::Jev,
                "attention",
                1,
                &evidence_digest,
                review.through,
            )?,
            CallAuthority {
                source: review.ticket.clone(),
                speaker: work.permit.clone(),
            },
            work.cancellation.clone(),
            decoder(
                decision.macrofold.as_ref().map(|value| value.billing),
                budget.clone(),
                move |output| {
                    provider::decode_optional_attention(output, &attended.questions, &parser)
                        .map_err(|_| CallFailure::Invalid)
                },
            ),
        )
        .await
}

async fn action_attention(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    work: &Work,
    prepared: &prepare::Prepared,
    decision: &Model,
    ceiling: u64,
    choose: bool,
) -> Result<Option<provider::JudgmentAnswer>, CallFailure> {
    let budget = game.host.budget();
    let allowance = decision.amount_micro_usd.to_string();
    let id = format!("{}:attempt:0:action-attention", work.job.job.id);
    let offers = prepared
        .context
        .offers
        .iter()
        .map(|offer| OfferedAction {
            id: &offer.id,
            description: &offer.caption,
        })
        .collect::<Vec<_>>();
    let attention = Arc::new(
        game.cognition
            .action_attention(&prepared.context.fields, &offers, choose, budget)
            .map_err(|_| CallFailure::Invalid)?,
    );
    if attention
        .questions
        .as_object()
        .is_some_and(serde_json::Map::is_empty)
    {
        return Ok(None);
    }
    let judgment = provider::Judgment {
        state: provider::JudgmentState::Structured(&attention.state),
        questions: &attention.questions,
    };
    let request = provider::judgment_request(
        &decision.destination,
        &decision.requested,
        decision.route(&allowance, work.deadline),
        judgment,
        decision.output_tokens,
        &id,
        budget,
    )?;
    let parser = budget.clone();
    dispatch
        .submit(
            side(
                work,
                decision,
                ceiling,
                id,
                request,
                InferenceClass::Jev,
                "action-attention",
                1,
                prepared.route.as_str(),
                prepared.through,
            )?,
            CallAuthority {
                source: prepared.ticket.clone(),
                speaker: work.permit.clone(),
            },
            work.cancellation.clone(),
            decoder(
                decision.macrofold.as_ref().map(|value| value.billing),
                budget.clone(),
                move |output| {
                    provider::decode_judgment(output, &attention.questions, &parser)
                        .map(Some)
                        .map_err(|_| CallFailure::Invalid)
                },
            ),
        )
        .await
}

fn ensure_running(work: &Work) -> Result<(), CallFailure> {
    if *work.cancellation.borrow() {
        return Err(CallFailure::Cancelled);
    }
    if Instant::now() >= work.deadline {
        return Err(CallFailure::Stale("decision-deadline"));
    }
    Ok(())
}

fn side(
    work: &Work,
    model: &Model,
    ceiling: u64,
    id: String,
    request: crate::provider_transport::PreparedProviderRequest,
    provider: InferenceClass,
    stage: &'static str,
    level: i32,
    context: &str,
    evidence_cut: u64,
) -> Result<PreparedCall, CallFailure> {
    ensure_running(work)?;
    Ok(PreparedCall {
        request,
        allowance: AttemptRequest {
            id,
            actor: work.actor.clone(),
            job: work.job.job.id.clone(),
            provider,
            category: "level",
            stage,
            level: Some(level),
            background: work.permit.is_none(),
            amount: model.amount_micro_usd,
            ceiling,
        },
        requested_model: model.requested.clone(),
        context_digest: sha256_hex(context.as_bytes()),
        macrofold_billing_mode: model
            .macrofold
            .as_ref()
            .map(|route| billing_name(route.billing)),
        deadline: work.deadline,
        evidence_cut,
        preview: None,
    })
}

fn decoder<T, F>(
    billing: Option<BillingMode>,
    budget: ByteBudget,
    use_output: F,
) -> impl FnOnce(FundedReply, &HttpEvidence) -> ProviderObservation<T>
where
    F: FnOnce(&Value) -> Result<T, CallFailure>,
{
    move |body, http| {
        let mut observation = ProviderObservation {
            value: Err(CallFailure::Invalid),
            provider_request_id: http.trace_id.clone(),
            model: None,
            usage: None,
            charged_microusd: None,
            completion_uncertain: true,
        };
        if let Some(billing) = billing {
            let binding = BillingBinding {
                mode: billing,
                deployment: None,
            };
            let result = if let Some(observed) = &body.observed {
                observation.provider_request_id = Some(observed.run.id.clone());
                macrofold::observed_terminal(
                    &observed.run.id,
                    &observed.status,
                    &body.bytes,
                    binding,
                )
                .ok()
                .flatten()
            } else {
                macrofold::MacrofoldAdmission::read(&body.bytes)
                    .ok()
                    .and_then(|admission| {
                        observation.provider_request_id = Some(admission.run_id.to_owned());
                        admission.terminal(binding).ok().flatten()
                    })
            };
            if let Some(result) = result {
                observation.model = result.model_revision.map(str::to_owned);
                observation.usage = result.usage.map(|usage| ModelUsage {
                    input_tokens: usage.input_tokens,
                    output_tokens: usage.output_tokens,
                });
                observation.charged_microusd = result.estimated_micro_usd;
                observation.completion_uncertain = result.completion_uncertain;
                if let Some(parsed) = result
                    .output
                    .and_then(|output| FundedJson::read(output.get(), &budget).ok())
                {
                    observation.value = use_output(&parsed.value);
                }
            }
        } else if let Ok(text) = std::str::from_utf8(&body.bytes)
            && let Ok(parsed) = FundedJson::read(text, &budget)
        {
            observation.model = parsed.value["model"].as_str().map(str::to_owned);
            observation.provider_request_id = parsed.value["id"]
                .as_str()
                .map(str::to_owned)
                .or(observation.provider_request_id);
            observation.usage = parsed.value["usage"]["input_tokens"]
                .as_u64()
                .zip(parsed.value["usage"]["output_tokens"].as_u64())
                .map(|(input_tokens, output_tokens)| ModelUsage {
                    input_tokens,
                    output_tokens,
                });
            observation.completion_uncertain = false;
            observation.value = use_output(&parsed.value);
        }
        observation
    }
}

fn direct_output(
    value: &Value,
    schema: &BoundSchema,
    budget: &ByteBudget,
) -> Result<provider::GenerationOutput, CallFailure> {
    let parts = value["output"].as_array().ok_or(CallFailure::Invalid)?;
    let pieces = || {
        parts
            .iter()
            .filter(|item| item["type"] == "message")
            .filter_map(|item| item["content"].as_array())
            .flatten()
    };
    if pieces().any(|part| part["type"] == "refusal") {
        return Err(CallFailure::Invalid);
    }
    let texts = || {
        pieces()
            .filter(|part| part["type"] == "output_text")
            .filter_map(|part| part["text"].as_str())
    };
    let bytes = texts()
        .try_fold(0usize, |length, text| length.checked_add(text.len()))
        .filter(|bytes| *bytes <= 40_000)
        .ok_or(CallFailure::Invalid)?;
    let _custody = budget.reserve(bytes).map_err(|_| CallFailure::Invalid)?;
    let mut joined = String::with_capacity(bytes);
    for text in texts() {
        joined.push_str(text);
    }
    provider::generation_output(&joined, schema, budget).map_err(|_| CallFailure::Invalid)
}

#[derive(Serialize)]
struct Operations<'a> {
    operations: &'a [Value],
}

fn effects(
    mut parsed: provider::GenerationOutput,
    frame: &prepare::ReceivedFrame,
    budget: &ByteBudget,
) -> Result<axum::body::Bytes, CallFailure> {
    if parsed.value["queries"]
        .as_array()
        .is_some_and(|queries| !queries.is_empty())
    {
        return Err(CallFailure::Stale(
            "situation-query-continuation-unavailable",
        ));
    }
    let operations = parsed.value["operations"]
        .as_array_mut()
        .ok_or(CallFailure::Invalid)?;
    for operation in &mut *operations {
        if let Some(fields) = operation.as_object_mut()
            && fields.get("appraise").is_some_and(Value::is_null)
        {
            fields.shift_remove("appraise");
        }
        if let Some(arguments) = operation
            .get_mut("act")
            .and_then(|act| act.get_mut("invocation"))
            .and_then(Value::as_object_mut)
            && arguments.get("frame").and_then(Value::as_str) == Some("received")
        {
            if arguments.get("family").and_then(Value::as_str) != Some("move") {
                return Err(CallFailure::Invalid);
            }
            let right = arguments
                .get("x")
                .and_then(Value::as_f64)
                .ok_or(CallFailure::Invalid)?;
            let forward = arguments
                .get("z")
                .and_then(Value::as_f64)
                .ok_or(CallFailure::Invalid)?;
            let x = frame.x - frame.heading.cos() * right + frame.heading.sin() * forward;
            let z = frame.z + frame.heading.sin() * right + frame.heading.cos() * forward;
            arguments.insert(
                "x".into(),
                serde_json::Number::from_f64(x)
                    .ok_or(CallFailure::Invalid)?
                    .into(),
            );
            arguments.insert(
                "z".into(),
                serde_json::Number::from_f64(z)
                    .ok_or(CallFailure::Invalid)?
                    .into(),
            );
            arguments.insert("frame".into(), "world".into());
            if arguments.get("surfaceId").is_some_and(Value::is_null)
                && let Some(surface) = frame.support.as_ref()
            {
                arguments.insert("surfaceId".into(), surface.clone().into());
            }
        }
    }
    crate::wire::encode(&Operations { operations }, b"", b"", budget)
        .map_err(|_| CallFailure::Invalid)
}

struct FundedJson {
    value: Value,
    _custody: ByteReservation,
}

impl FundedJson {
    fn read(text: &str, budget: &ByteBudget) -> Result<Self, CallFailure> {
        let bound = json_tree_allocation_bound(text).ok_or(CallFailure::Invalid)?;
        let custody = budget.reserve(bound).map_err(|_| CallFailure::Invalid)?;
        Ok(Self {
            value: serde_json::from_str(text).map_err(|_| CallFailure::Invalid)?,
            _custody: custody,
        })
    }
}
