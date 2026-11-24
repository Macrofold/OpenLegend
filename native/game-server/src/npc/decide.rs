//! One admitted decision keeps its original evidence, deadline and job ID
//! from preparation through settlement. Transport and database waits do not
//! occupy a simulation turn.

use crate::{
    authority::{Authority, AuthorizedScope},
    boot::CurrentServer,
    decision_dispatch::{
        CallAuthority, CallFailure, DecisionDispatch, DirectStageCapture, PreparedCall,
        decode_provider_bound,
    },
    decision_render::{BoundSchema, OfferedAction, RenderError, provider},
    live_save::LiveSaves,
    provider_transport::{
        PreparedProviderRequest, ProviderDestination,
        deployment::{Deployment, OutputPolicy, Preparation},
        macrofold::{BillingBinding, BillingMode},
    },
    store::{AdmittedJob, AttemptRequest, InferenceClass},
    world::DelayedDecisionClock,
};
use openlegend_simulation::{
    encoding::sha256_hex,
    experience::PersonalSourceRef,
    host::{ByteBudget, ByteReservation, CapacityError},
    records::SqlCell,
    runtime::{RuntimeError, RuntimeNpcOperations, RuntimeNpcStageWitness},
};
use serde_json::Value;
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

pub(super) mod escalation;
pub(super) mod prepare;
mod query;

pub(super) struct Models {
    pub(super) judgment: Model,
    pub(super) fast: Option<Model>,
    pub(super) complex: Option<Model>,
    pub(super) fast_deployment: Option<Model>,
    pub(super) complex_deployment: Option<Model>,
    pub(super) ceiling_micro_usd: u64,
    pub(super) embedding: Option<Arc<super::semantic_index::EmbeddingModel>>,
    pub(super) escalation: Option<escalation::ConfiguredEscalation>,
}

impl Models {
    fn response_model(&self, level: i32) -> Option<&Model> {
        if level == 2 {
            self.fast_deployment.as_ref().or(self.fast.as_ref())
        } else {
            self.complex_deployment.as_ref().or(self.complex.as_ref())
        }
    }
}

#[derive(Clone)]
pub(super) struct Model {
    pub(super) destination: ProviderDestination,
    pub(super) requested: String,
    pub(super) macrofold: Option<MacrofoldCatalog>,
    pub(super) deployment: Option<ConfiguredDeployment>,
    pub(super) amount_micro_usd: u64,
    pub(super) output_tokens: usize,
    pub(super) effort: Option<&'static str>,
}

#[derive(Clone)]
pub(super) struct ConfiguredDeployment {
    pub(super) owner: Arc<Deployment>,
    pub(super) output: Option<OutputPolicy>,
}

#[derive(Clone)]
pub(super) struct MacrofoldCatalog {
    pub(super) billing: BillingMode,
    pub(super) connection: Option<String>,
}

impl Model {
    pub(super) fn use_deployment(
        &mut self,
        deployment: ConfiguredDeployment,
        output_limit: Option<usize>,
    ) {
        self.requested = format!(
            "deployment:{}",
            deployment.owner.selection.model_binding.deployment_id
        );
        self.output_tokens = self
            .output_tokens
            .min(output_limit.unwrap_or(self.output_tokens));
        self.macrofold = None;
        self.effort = None;
        self.deployment = Some(deployment);
    }

    pub(super) fn billing(&self) -> Option<BillingBinding> {
        if let Some(deployment) = &self.deployment {
            Some(BillingBinding {
                mode: BillingMode::Byok,
                deployment: Some(deployment.owner.selection.pin()),
            })
        } else {
            self.macrofold.as_ref().map(|catalog| BillingBinding {
                mode: catalog.billing,
                deployment: None,
            })
        }
    }

    /// Prepare deployed judgments through the bounded same-origin description
    /// read. The normal dispatch still reserves spending and checks source at POST.
    pub(super) async fn judgment_request(
        &self,
        dispatch: &DecisionDispatch,
        budget: &ByteBudget,
        stopped: &watch::Receiver<bool>,
        deadline: Instant,
        id: &str,
        judgment: provider::Judgment<'_>,
    ) -> Result<PreparedProviderRequest, CallFailure> {
        if let Some(target) = &self.deployment {
            let operation = self.preparation(dispatch, budget, stopped, deadline);
            let output = target
                .owner
                .judgment(&operation, self.output_tokens)
                .await?;
            return Ok(provider::deployment_judgment_request(
                &self.destination,
                &target.owner,
                deadline,
                judgment,
                output,
                id,
                budget,
            )?);
        }
        let allowance = self.amount_micro_usd.to_string();
        Ok(provider::judgment_request(
            &self.destination,
            &self.requested,
            self.route(&allowance, deadline),
            judgment,
            self.output_tokens,
            id,
            budget,
        )?)
    }

    fn preparation<'a>(
        &'a self,
        dispatch: &'a DecisionDispatch,
        budget: &'a ByteBudget,
        stopped: &'a watch::Receiver<bool>,
        deadline: Instant,
    ) -> Preparation<'a> {
        Preparation {
            destination: &self.destination,
            network: dispatch.network(),
            budget,
            stopped,
            deadline,
        }
    }

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
    pub(super) discovery: Option<Arc<super::discovery::DiscoveryDispatch>>,
}

impl Work {
    fn discovery(&self) -> Option<Arc<super::discovery::DiscoveryDispatch>> {
        self.automatic.as_ref().and_then(|automatic| automatic.discovery.clone())
    }
}

pub(super) async fn run(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    dispatch: &Arc<DecisionDispatch>,
    models: &Models,
    work: Work,
    reflection: &mut Option<prepare::reflection::Recommendation>,
) -> Result<(), CallFailure> {
    openlegend_simulation::profile_body!(
        NPC,
        {
            // The original route judgment is already part of this decision.
            // A later handoff cannot acquire a new clock after a pause.
            let offered_fallback = work.permit.is_none()
                && work
                    .automatic
                    .as_ref()
                    .is_some_and(|trigger| trigger.discovery.is_none());
            let conversation_fallback = work.job.job.kind == "chat"
                && work.permit.is_some()
                && work.automatic.is_none();
            let configured_fallback = models
                .escalation
                .as_ref()
                .filter(|_| offered_fallback || conversation_fallback)
                .map(|route| (route, game.world.delayed_decision_clock()));
            let mut stop = work.cancellation.clone();
            let mut collected = tokio::select! {
                biased;
                _ = stopped(&mut stop) => return Err(CallFailure::Cancelled),
                prepared = tokio::time::timeout_at(work.deadline,prepare::collect(game, dispatch, models.embedding.as_deref(), &work, dispatch.stage_captures().is_some())) => {
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
                        | CallFailure::CompletionUnconfirmed
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
            let operation = ":attempt:0:route";
            let id = format!("{}{operation}", work.job.job.id);
            let input = provider::Judgment {
                state: provider::JudgmentState::Prompt(prepared.route.as_str()),
                questions,
            };
            let request = decision
                .judgment_request(
                    dispatch,
                    budget,
                    &work.cancellation,
                    work.deadline,
                    &id,
                    input,
                )
                .await
                .map_err(|error| error.at("route"))?;
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
                        discovery: work.discovery(),
                        stage_capture: None,
                        remembered_places: false,
                    },
                    work.cancellation.clone(),
                    decode_provider_bound(
                        decision.billing(),
                        true,
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
            if available
                && observed.choice("reflection") == Some("yes")
                && let Some(source) = work.source.first()
            {
                *reflection = prepare::reflection::Recommendation::from_decision(
                    &prepared.ticket, source, budget,
                );
            }
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
            // The higher route is the first reply-generation attempt for the
            // original conversation. A completed ordinary generation never
            // returns here to buy another answer.
            if !choose
                && conversation_fallback
                && prepared.addressed
                && let Some((fallback, clock)) = configured_fallback.as_ref().filter(|(fallback, _)| {
                    fallback.permits(escalation::Reason::SemanticEscalation)
                })
            {
                return escalation::respond(
                    game,
                    saves,
                    dispatch,
                    fallback,
                    work,
                    prepared,
                    clock.clone(),
                )
                .await
                .map_err(|error| error.at("decision-escalation"));
            }
            let include_actions = choose
                || !prepared.speech_trigger
                || observed.choice("possibleAction") != Some("no")
                || observed.probability("possibleAction", "no").unwrap_or(0.0) < 0.8;
            let mut selected = Vec::new();
            let mut escalation = 2;
            if include_actions {
                let fallback = configured_fallback
                    .filter(|_| offered_fallback && choose && escalation::has_action(&prepared));
                let configured = fallback.as_ref().map(|(route, _)| *route);
                let accepted = action_attention(
                    game,
                    dispatch,
                    &work,
                    &prepared,
                    decision,
                    models.ceiling_micro_usd,
                    choose,
                    configured,
                )
                .await;
                let reconsider = match accepted {
                    Ok(Some(ActionAttention::Rated(rated, rated_context))) => {
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
                            if let Some(((route, clock), picked)) = fallback
                                .as_ref()
                                .filter(|(route, _)| {
                                    route.permits(escalation::Reason::NativeRejection)
                                })
                                .zip(picked)
                            {
                                let Some(refused) = apply_choice(
                                    game,
                                    saves,
                                    &work,
                                    prepared.ticket.clone(),
                                    picked,
                                    true,
                                    None,
                                )
                                .await?
                                else {
                                    return Ok(());
                                };
                                let eligible = Instant::now();
                                let selected =
                                    budget.reserve(picked.id.len()).map_err(response_capacity)?;
                                let alias = (picked.id.clone(), selected);
                                return escalation::reconsider_rejected(
                                    game,
                                    saves,
                                    dispatch,
                                    route,
                                    work,
                                    prepared,
                                    alias,
                                    refused,
                                    eligible,
                                    clock.clone(),
                                )
                                .await
                                .map_err(|error| error.at("decision-escalation"));
                            }
                            return finish_native(game, saves, work, prepared.ticket, picked).await;
                        }
                        fallback.as_ref().and_then(|(route, clock)| {
                            let reason = escalation::reason(&prepared, &rated)?;
                            route
                                .permits(reason)
                                .then_some((*route, clock, rated_context, reason))
                        })
                    }
                    Ok(Some(ActionAttention::Recovery(reason, context))) => fallback
                        .as_ref()
                        .filter(|(route, _)| route.permits(reason))
                        .map(|(route, clock)| (*route, clock, context, reason)),
                    Ok(None) => None,
                    // A settled optional judgment can have unusable ratings. Keep
                    // the permitted offers and let the generation dispatch recheck
                    // the same decision. A level-one rating is the decision itself.
                    Err(error) if !choose && matches!(error.cause().1, CallFailure::Invalid) => {
                        ensure_running(&work)?;
                        selected.extend(&prepared.context.offers);
                        None
                    }
                    Err(error) => return Err(error.at("action-attention")),
                };
                if let Some((route, clock, context, reason)) = reconsider {
                    return escalation::run(
                        game,
                        saves,
                        dispatch,
                        route,
                        work,
                        prepared,
                        context,
                        reason,
                        None,
                        clock.clone(),
                    )
                    .await
                    .map_err(|error| error.at("decision-escalation"));
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
            let model = models
                .response_model(level)
                .ok_or(CallFailure::Invalid.at("route"))?;
            // The route already rendered required context with query support
            // and without these optional additions. Reuse its exact byte count.
            let mut offered = selected
                .into_iter()
                .map(|offer| OfferedAction {
                    id: &offer.id,
                    description: &offer.caption,
                })
                .collect::<Vec<_>>();
            let mut scene_bytes = prepared.route.remaining();
            let query_bytes = game.cognition.query_instruction_bytes();
            let query_origin = prepared.ticket.received_query_origin()
                .filter(|_| query_bytes <= scene_bytes);
            let questions_offered = query_origin.is_some();
            if questions_offered {
                scene_bytes -= query_bytes;
            }
            let include_actions = if include_actions {
                match game
                    .cognition
                    .fit_prompt_actions(&mut offered, scene_bytes)
                    .map_err(generation_failure)
                    .map_err(|error| error.at("generation-prompt"))?
                {
                    Some(remaining) => {
                        scene_bytes = remaining;
                        true
                    }
                    None => false,
                }
            } else {
                false
            };
            prepared.context.fields["situationQueries"] = questions_offered.into();
            let regions = query_origin
                .map(|(original, limits)| {
                    // The opaque region aliases have the same lifetime as this
                    // decision's original evidence, not the later live scene.
                    query::Regions::offer(
                        original,
                        limits,
                        prepared.context.reference_scope(),
                        &prepared.frame,
                        &prepared.context.fields["receivedSituation"],
                        scene_bytes,
                        budget,
                    )
                })
                .transpose()
                .map_err(|error| error.at("generation-preparation"))?
                .flatten();
            if let Some(regions) = &regions {
                regions
                    .present(&mut prepared.context.fields["receivedSituation"])
                    .map_err(|error| error.at("generation-preparation"))?;
            }
            ensure_running(&work)?;
            let remembered = if prepared.context.offers_remembered_places(game) {
                let ticket = Arc::clone(&prepared.ticket);
                match game.world
                    .capture(move |session| session.prepare_npc_remembered_places(&ticket))
                    .await
                {
                    Ok(()) => Some(prepared.ticket.as_ref()),
                    // The optional catalogue has not been disclosed. The
                    // original response keeps its normal checks and admission.
                    Err(error) if error.is_admission_refusal() => None,
                    Err(error) => return Err(prepare::binding_failure(error)
                        .at("remembered-place-preparation")),
                }
            } else {
                None
            };
            let (response, schema) = prepared
                .context
                .render_response(game, &offered, include_actions, None, remembered)
                .map_err(|error| error.at("generation-preparation"))?;
            let reply_player = if prepared.addressed {
                prepared.context.preview_player.as_ref()
            } else {
                None
            };
            let stage_proof = if schema.discloses_remembered_places() {
                None
            } else {
                prepared.context.direct_stage_witness(&prepared.ticket, &offered, budget)
            };
            let (parsed, mut captured_stage) = generate(
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
                    queries: questions_offered,
                    stage_proof,
                },
                schema,
            )
            .await?;
            drop(response);
            ensure_running(&work)?;
            let (value, custody, ticket) = match query::Draft::read(parsed)? {
                query::Draft::Decision(value, custody) => (value, custody, prepared.ticket),
                query::Draft::Questions(questions, held) => {
                    drop(captured_stage.take());
                    let prior = Arc::try_unwrap(prepared.ticket)
                        .map_err(|_| CallFailure::Stale("native-response-ticket-retained"))?;
                    let (original, current, mut binding, policy) = game
                        .world
                        .reopen_npc_for_queries(prior, work.permit.clone())
                        .await
                        .map_err(prepare::binding_failure)?;
                    let (original, historical) = if query::HistoryReads::requested(&questions) {
                        // The originating read already funds its own backing.
                        // Keep this optional storage future off ordinary NPC
                        // worker stacks, including while the accepted read moves.
                        let read = query::HistoryReads::prepare(
                            &game.world, Box::new(original), &current, &binding, &questions, budget,
                        );
                        let _storage = budget.reserve(std::mem::size_of_val(&read)).map_err(response_capacity)?;
                        let mut cancelled = work.cancellation.clone();
                        let (selected, history) = tokio::select! {
                            biased;
                            _ = stopped(&mut cancelled) =>
                                return Err(CallFailure::Cancelled.at("situation-history")),
                            _ = tokio::time::sleep_until(work.deadline) =>
                                return Err(CallFailure::Stale("decision-deadline").at("situation-history")),
                            prepared = Box::pin(read) => prepared?,
                        };
                        (*selected, history)
                    } else {
                        (original, query::HistoryReads::empty(budget)?)
                    };
                    prepared.context.fields["situationQueries"] = false.into();
                    let (response, schema) = {
                        let answers = query::answer(
                            &questions,
                            &binding,
                            &original,
                            &current,
                            &policy,
                            budget,
                            prepared.context.reference_scope(),
                            &prepared.frame,
                            regions.as_ref(),
                            &historical,
                        )?;
                        let (mut response, schema) = prepared
                            .context
                            .render_response(game, &offered, include_actions, Some(&answers), None)
                            .map_err(|error| error.at("situation-query-preparation"))?;
                        response.append_received_evidence(&answers).map_err(generation_failure)?;
                        answers.bind(&mut binding)?;
                        (response, schema)
                    };
                    drop(questions);
                    drop(held);
                    ensure_running(&work)?;
                    let origin = work.automatic.as_ref().map(|trigger| trigger.read.clone());
                    let ticket = game.world
                        .bind_npc(original, current, binding, origin)
                        .await
                        .map_err(prepare::binding_failure)?;
                    let (parsed, _) = generate(
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
                            stage_proof: None,
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
                None,
                dispatch.stage_captures().zip(captured_stage),
            )
            .await
            .map(|_| ())
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
    stage_proof: Option<(RuntimeNpcStageWitness, ByteReservation)>,
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
) -> Result<(provider::GenerationOutput, Option<Arc<DirectStageCapture>>), CallFailure> {
    let budget = game.host.budget();
    let schema = Arc::new(schema);
    let allowance = model.amount_micro_usd.to_string();
    let id = format!("{}:attempt:0:{stage}", work.job.job.id);
    let instructions_bytes = if view.queries {
        game.cognition
            .response_instructions
            .len()
            .saturating_add(game.cognition.query_instruction_bytes())
    } else {
        0
    };
    let _instructions_custody = budget
        .reserve(instructions_bytes)
        .map_err(response_capacity)
        .map_err(|error| error.at("generation-instructions"))?;
    let instructions = if view.queries {
        std::borrow::Cow::Owned(format!(
            "{} {}",
            game.cognition.response_instructions, game.cognition.query_instructions
        ))
    } else {
        std::borrow::Cow::Borrowed(game.cognition.response_instructions.as_str())
    };
    let capabilities = if let Some(target) = &model.deployment {
        let operation = model.preparation(dispatch, budget, &work.cancellation, work.deadline);
        Some(
            target
                .owner
                .generation(
                    &operation,
                    target.output.expect("configured response output policy"),
                    schema.value(),
                    model.output_tokens,
                )
                .await
                .map_err(|error| error.at(stage))?,
        )
    } else {
        None
    };
    let stream_available = capabilities.map_or(model.macrofold.is_some(), |mode| mode.streaming);
    let preview = if stream_available && view.reply_player.is_some() {
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
        max_output_tokens: capabilities.map_or(model.output_tokens, |mode| mode.output_tokens),
        stream: preview.is_some(),
    };
    let request = if let Some((target, capabilities)) = model.deployment.as_ref().zip(capabilities)
    {
        provider::deployment_generation_request(
            &model.destination,
            &target.owner,
            &allowance,
            work.deadline,
            capabilities.mode,
            generation,
            &id,
            budget,
        )?
    } else {
        provider::generation_request(
            &model.destination,
            &model.requested,
            model.route(&allowance, work.deadline),
            generation,
            &id,
            budget,
        )?
    };
    let capture = view
        .stage_proof
        .zip(dispatch.stage_captures())
        .zip(work.permit.as_ref())
        .and_then(|((proof, captures), (_, owner))| {
            captures.prepare(proof, &request, &id, owner.scope.grant_revision, budget)
        });
    let macrofold = model.billing();
    let parse_budget = budget.clone();
    let remembered_places = schema.discloses_remembered_places();
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
                discovery: work.discovery(),
                stage_capture: capture.clone(),
                remembered_places,
            },
            work.cancellation.clone(),
            decode_provider_bound(macrofold, false, parse_budget.clone(), move |value| {
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
        .map(|result| (result, capture))
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
    apply_choice(game, saves, &work, ticket, choice, false, None)
        .await
        .map(|_| ())
}

async fn apply_choice(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    work: &Work,
    ticket: Arc<openlegend_simulation::runtime::RuntimeNpcResponseTicket>,
    choice: &prepare::NativeOffer,
    reconsider: bool,
    delayed_clock: Option<DelayedDecisionClock>,
) -> Result<Option<super::apply::RefusedChoice>, CallFailure> {
    let mode = if choice.transition == "continue" {
        "enqueue"
    } else {
        choice.transition
    };
    let payload =
        RuntimeNpcOperations::known_action(&choice.id, mode, reconsider, game.host.budget())
            .map_err(|error| CallFailure::World(error.into()).at("response-preparation"))?;
    super::apply::apply(
        saves,
        game,
        &work.job,
        ticket,
        payload,
        work.permit.clone(),
        work.cancellation.clone(),
        work.deadline,
        None,
        delayed_clock,
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
    let id = format!("{}:attempt:0:attention:0", work.job.job.id);
    let attended = review.request.clone();
    let request = decision
        .judgment_request(
            dispatch,
            budget,
            &work.cancellation,
            work.deadline,
            &id,
            provider::Judgment {
                state: provider::JudgmentState::Structured(&attended.state),
                questions: &attended.questions,
            },
        )
        .await?;
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
                discovery: work.discovery(),
                stage_capture: None,
                remembered_places: false,
            },
            work.cancellation.clone(),
            decode_provider_bound(decision.billing(), true, budget.clone(), move |output| {
                provider::decode_optional_attention(output, &attended.questions, &parser)
                    .map_err(|_| CallFailure::Invalid)
            }),
        )
        .await
}

enum ActionAttention {
    Rated(
        provider::JudgmentAnswer,
        Arc<crate::decision_render::BoundAttention>,
    ),
    Recovery(
        escalation::Reason,
        Arc<crate::decision_render::BoundAttention>,
    ),
}

async fn action_attention(
    game: &Arc<CurrentServer>,
    dispatch: &Arc<DecisionDispatch>,
    work: &Work,
    prepared: &prepare::Prepared,
    decision: &Model,
    ceiling: u64,
    choose: bool,
    fallback: Option<&escalation::ConfiguredEscalation>,
) -> Result<Option<ActionAttention>, CallFailure> {
    let budget = game.host.budget();
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
    let request = decision
        .judgment_request(
            dispatch,
            budget,
            &work.cancellation,
            work.deadline,
            &id,
            judgment,
        )
        .await?;
    let parser = budget.clone();
    let retain_invalid =
        fallback.is_some_and(|route| route.permits(escalation::Reason::InvalidOutput));
    let unavailable_context = fallback
        .filter(|route| route.permits(escalation::Reason::RouteUnavailable))
        .map(|_| Arc::clone(&attention));
    let assessed = dispatch
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
                discovery: work.discovery(),
                stage_capture: None,
                remembered_places: false,
            },
            work.cancellation.clone(),
            decode_provider_bound(decision.billing(), true, budget.clone(), move |output| {
                match provider::decode_judgment(output, &attention.questions, &parser) {
                    Ok(rated) => Ok(Some(ActionAttention::Rated(rated, attention))),
                    // Only a received judgment envelope can report a bad offered answer.
                    // The spending owner still checks that the earlier execution ended.
                    Err(RenderError::InvalidResponse) if retain_invalid => Ok(Some(
                        ActionAttention::Recovery(escalation::Reason::InvalidOutput, attention),
                    )),
                    Err(_) => Err(CallFailure::Invalid),
                }
            }),
        )
        .await;
    match (assessed, unavailable_context) {
        (Err(error), Some(context))
            if matches!(error.cause().1, CallFailure::ProviderInputLimit) =>
        {
            Ok(Some(ActionAttention::Recovery(
                escalation::Reason::RouteUnavailable,
                context,
            )))
        }
        (outcome, _) => outcome,
    }
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
        macrofold_billing_mode: model.billing().map(|binding| billing_name(binding.mode)),
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
    match error {
        RenderError::Capacity => response_capacity(CapacityError),
        RenderError::ContextLimit => CallFailure::ContextLimit,
        _ => CallFailure::Invalid,
    }
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
