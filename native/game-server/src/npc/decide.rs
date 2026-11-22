//! One admitted decision keeps its original evidence, deadline and job ID
//! from preparation through settlement. Transport and database waits do not
//! occupy a simulation turn.

use crate::{
    authority::{Authority, AuthorizedScope},
    boot::CurrentServer,
    decision_dispatch::{
        CallAuthority, CallFailure, DecisionDispatch, PreparedCall, decode_provider,
    },
    decision_render::{BoundSchema, OfferedAction, RenderError, provider},
    live_save::LiveSaves,
    provider_transport::{ProviderDestination, macrofold::BillingMode},
    store::{AdmittedJob, AttemptRequest, InferenceClass},
};
use openlegend_simulation::{
    encoding::sha256_hex,
    experience::PersonalSourceRef,
    host::{ByteBudget, CapacityError},
    records::SqlCell,
    runtime::{RuntimeError, RuntimeNpcOperations},
};
use serde_json::Value;
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

pub(super) mod prepare;
mod query;

pub(super) struct Models {
    pub(super) judgment: Model,
    pub(super) fast: Option<Model>,
    pub(super) complex: Option<Model>,
    pub(super) ceiling_micro_usd: u64,
    pub(super) embedding: Option<Arc<super::semantic_index::EmbeddingModel>>,
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
    pub(super) fn route<'a>(
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
                prepared = tokio::time::timeout_at(work.deadline,prepare::collect(game, dispatch, models.embedding.as_deref(), &work)) => {
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
            let mut prepared = tokio::select! {
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
                    decode_provider(
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
                .render_response(game, &selected, include_actions, true)
                .map_err(|error| error.at("generation-preparation"))?;
            let reply_player = if prepared.addressed {
                prepared.context.preview_player.as_ref()
            } else {
                None
            };
            let parsed = generate(
                game,
                dispatch,
                &work,
                model,
                models.ceiling_micro_usd,
                "generate",
                level,
                GenerationView {
                    ticket: &prepared.ticket,
                    prompt: &response,
                    reply_player,
                    through: prepared.through,
                    queries: true,
                },
                schema,
            )
            .await?;
            drop(response);
            ensure_running(&work)?;
            let (value, custody, ticket) = match query::Draft::read(parsed)? {
                query::Draft::Decision(value, custody) => (value, custody, prepared.ticket),
                query::Draft::Questions(questions, held) => {
                    let prior = Arc::try_unwrap(prepared.ticket)
                        .map_err(|_| CallFailure::Stale("native-response-ticket-retained"))?;
                    let (original, current, mut binding, policy) = game
                        .world
                        .reopen_npc_for_queries(prior, work.permit.clone())
                        .await
                        .map_err(prepare::binding_failure)?;
                    prepared.context.fields["situationQueries"] = false.into();
                    let (mut response, schema) = prepared
                        .context
                        .render_response(game, &selected, include_actions, false)
                        .map_err(|error| error.at("situation-query-preparation"))?;
                    {
                        let answers = query::answer(
                            &questions,
                            &binding,
                            &original,
                            &current,
                            &policy,
                            budget,
                            prepared.context.reference_scope()?,
                        )?;
                        response
                            .append_received_evidence(&answers)
                            .map_err(generation_failure)?;
                        answers.bind(&mut binding)?;
                    }
                    drop(questions);
                    drop(held);
                    ensure_running(&work)?;
                    let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
                    let ticket = Arc::new(
                        game.world
                            .bind_npc(original, current, binding, origin)
                            .await
                            .map_err(prepare::binding_failure)?,
                    );
                    let parsed = generate(
                        game,
                        dispatch,
                        &work,
                        model,
                        models.ceiling_micro_usd,
                        "generate-query-answer",
                        level,
                        GenerationView {
                            ticket: &ticket,
                            prompt: &response,
                            reply_player,
                            through: prepared.through,
                            queries: false,
                        },
                        schema,
                    )
                    .await?;
                    match query::Draft::read(parsed)? {
                        query::Draft::Decision(value, custody) => (value, custody, ticket),
                        query::Draft::Questions(..) => {
                            return Err(CallFailure::Invalid.at("generate-query-answer"));
                        }
                    }
                }
            };
            ensure_running(&work)?;
            let payload = effects(value, custody, &prepared.frame)
                .map_err(|error| error.at("response-validation"))?;
            super::apply::apply(
                saves,
                game,
                &work.job,
                ticket,
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

/// A later, separately funded answer uses the same generation and provider
/// envelope owners as the first draft. The caller supplies the exact ticket.
struct GenerationView<'a> {
    ticket: &'a Arc<openlegend_simulation::runtime::RuntimeNpcResponseTicket>,
    prompt: &'a crate::decision_render::PreparedPrompt,
    reply_player: Option<&'a String>,
    through: u64,
    queries: bool,
}

async fn generate(
    game: &CurrentServer,
    dispatch: &Arc<DecisionDispatch>,
    work: &Work,
    model: &Model,
    ceiling: u64,
    stage: &'static str,
    level: i32,
    view: GenerationView<'_>,
    schema: BoundSchema,
) -> Result<provider::GenerationOutput, CallFailure> {
    let budget = game.host.budget();
    let schema = Arc::new(schema);
    let allowance = model.amount_micro_usd.to_string();
    let id = format!("{}:attempt:0:{stage}", work.job.job.id);
    let instructions_bytes = if view.queries {
        game.cognition
            .response_instructions
            .len()
            .saturating_add(game.cognition.query_instructions.len())
            .saturating_add(1)
    } else {
        0
    };
    let _instructions_custody = budget
        .reserve(instructions_bytes)
        .map_err(|_| CallFailure::Invalid)?;
    let instructions = if view.queries {
        std::borrow::Cow::Owned(format!(
            "{} {}",
            game.cognition.response_instructions, game.cognition.query_instructions
        ))
    } else {
        std::borrow::Cow::Borrowed(game.cognition.response_instructions.as_str())
    };
    let preview = if model.macrofold.is_some() && view.reply_player.is_some() {
        work.permit
            .as_ref()
            .zip(view.reply_player)
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
        schema: schema.value(),
        instructions: &instructions,
        prompt: view.prompt.as_str(),
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
        work,
        model,
        ceiling,
        id,
        request,
        InferenceClass::OpenAi,
        stage,
        level,
        view.prompt.as_str(),
        view.through,
    )?;
    call.preview = preview;
    dispatch
        .submit(
            call,
            CallAuthority {
                source: view.ticket.clone(),
                speaker: work.permit.clone(),
            },
            work.cancellation.clone(),
            decode_provider(macrofold, parse_budget.clone(), move |value| {
                if macrofold.is_some() {
                    match provider::macrofold_text(value).map_err(|_| CallFailure::Invalid)? {
                        provider::TextResult::Refused => Err(CallFailure::Invalid),
                        provider::TextResult::Complete(text) => {
                            provider::generation_output(text, &schema, &parse_budget)
                                .map_err(generation_failure)
                        }
                    }
                } else {
                    direct_output(value, &schema, &parse_budget)
                }
            }),
        )
        .await
        .map_err(|error| error.at(stage))
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
        .map_err(response_capacity)?;
    let mode = if choice.transition == "continue" {
        "enqueue"
    } else {
        choice.transition
    };
    let action = record([
        ("kind", "known".into()),
        ("mode", mode.into()),
        ("actionId", choice.id.as_str().into()),
        ("verb", SqlCell::Null),
        ("targetEntityId", SqlCell::Null),
        ("description", SqlCell::Null),
    ]);
    let operation = record([
        ("localId", "action".into()),
        ("requiresAccepted", SqlCell::Array(Vec::new())),
        ("talk", SqlCell::Null),
        ("think", SqlCell::Null),
        ("goal", SqlCell::Null),
        ("plan", SqlCell::Null),
        ("act", action),
    ]);
    let payload = RuntimeNpcOperations::new(
        record([("operations", SqlCell::Array(vec![operation]))]),
        transient,
    )
    .map_err(|error| CallFailure::World(error.into()))?;
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
            decode_provider(
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
            decode_provider(
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

fn direct_output(
    value: &Value,
    schema: &BoundSchema,
    budget: &ByteBudget,
) -> Result<provider::GenerationOutput, CallFailure> {
    let text = provider::direct_text(value, budget).map_err(generation_failure)?;
    provider::generation_output(&text.text, schema, budget).map_err(generation_failure)
}

fn response_capacity(error: CapacityError) -> CallFailure {
    CallFailure::World(RuntimeError::from(error).into())
}

fn generation_failure(error: RenderError) -> CallFailure {
    if matches!(error, RenderError::Capacity) {
        response_capacity(CapacityError)
    } else {
        CallFailure::Invalid
    }
}

fn record<const N: usize>(fields: [(&str, SqlCell); N]) -> SqlCell {
    SqlCell::Object(
        fields
            .into_iter()
            .map(|(name, value)| (name.to_owned(), value))
            .collect(),
    )
}

fn effects(
    value: SqlCell,
    mut custody: openlegend_simulation::host::ByteReservation,
    frame: &prepare::ReceivedFrame,
) -> Result<RuntimeNpcOperations, CallFailure> {
    let SqlCell::Object(mut response) = value else {
        return Err(CallFailure::Invalid);
    };
    let Some(SqlCell::Array(operations)) = response.get_mut("operations") else {
        return Err(CallFailure::Invalid);
    };
    for operation in operations {
        let SqlCell::Object(fields) = operation else {
            return Err(CallFailure::Invalid);
        };
        if fields.get("appraise").is_some_and(SqlCell::is_null) {
            fields.shift_remove("appraise");
        }
        let Some(SqlCell::Object(act)) = fields.get_mut("act") else {
            continue;
        };
        let Some(SqlCell::Object(arguments)) = act.get_mut("invocation") else {
            continue;
        };
        let Some(original) = arguments.get("frame") else {
            continue;
        };
        if original.as_str() != Some("received") {
            continue;
        }
        if arguments.get("family").and_then(SqlCell::as_str) != Some("move") {
            return Err(CallFailure::Invalid);
        }
        let right = arguments
            .get("x")
            .and_then(SqlCell::as_f64)
            .ok_or(CallFailure::Invalid)?;
        let forward = arguments
            .get("z")
            .and_then(SqlCell::as_f64)
            .ok_or(CallFailure::Invalid)?;
        let x = frame.x - frame.heading.cos() * right + frame.heading.sin() * forward;
        let z = frame.z + frame.heading.sin() * right + frame.heading.cos() * forward;
        let coordinate = |value| {
            serde_json::Number::from_f64(value)
                .map(SqlCell::Number)
                .ok_or(CallFailure::Invalid)
        };
        *arguments.get_mut("x").expect("received x was read") = coordinate(x)?;
        *arguments.get_mut("z").expect("received z was read") = coordinate(z)?;
        *arguments.get_mut("frame").expect("received frame was read") = "world".into();
        if let Some(value) = arguments
            .get_mut("surfaceId")
            .filter(|value| value.is_null())
            && let Some(surface) = &frame.support
        {
            custody
                .resize(
                    custody
                        .bytes()
                        .checked_add(surface.len())
                        .ok_or_else(|| response_capacity(CapacityError))?,
                )
                .map_err(response_capacity)?;
            *value = surface.as_str().into();
        }
        // The replacement for the longer "received" tag uses its existing
        // allowance. New coordinate values own no additional text backing.
    }
    RuntimeNpcOperations::new(SqlCell::Object(response), custody)
        .map_err(|error| CallFailure::World(error.into()))
}
