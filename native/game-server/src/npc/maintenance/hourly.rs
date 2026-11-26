//! One durable hourly attempt, its bounded provider partitions and the
//! protected save that publishes complete coverage of the original sources.

mod prompt;

use super::super::settings::SummaryModel;
use crate::{
    boot::CurrentServer,
    decision_dispatch::{
        CallFailure, DecisionDispatch, PreparedCall, ProviderDisclosure, decode_provider,
    },
    decision_render::provider::{self, Generation, TextResult},
    live_save::LiveSaves,
    recall_maintenance::{self, ConsolidationOutcome, PublicationConsent},
    store::{
        AttemptRequest, CommitError, DurableHead, InferenceClass, StoreError, durable_head,
        recall::{
            consolidation::ConsolidationCursorWrite,
            maintenance_scan::{
                ConsolidationWindow, HourlyOutcome, HourlyPosition, PendingSchedule,
                SelectedConsolidation,
            },
        },
    },
    world::{NpcDisclosure, NpcDisclosureTurn, WorldError},
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len, sha256_hex},
    host::{ByteBudget, ByteReservation, CapacityError},
    runtime::{
        RuntimeConsolidationBinding, RuntimeConsolidationDream, RuntimeConsolidationGroup,
        RuntimeConsolidationReadings, RuntimeConsolidationTicket, RuntimeError,
        RuntimeHourlyReview, RuntimePreparedDream,
    },
};
use openlegend_world_host::pool::HostError;
use std::sync::Arc;
use tokio::{sync::watch, time::Instant};

pub(super) enum Plan {
    Wait(f64),
    Ready(Selected),
}

pub(super) struct Selected {
    cursor: PendingSchedule<HourlyPosition>,
    selection: SelectedConsolidation,
    hour: u64,
    next_hour: f64,
}

/// A quiet character must not occupy their decision slot while checking
/// whether a memory needs summarizing. The exact ticket is acquired later.
pub(super) async fn plan(
    game: &CurrentServer,
    actor: &str,
    scope: RuntimeHourlyReview,
    mut stopped: watch::Receiver<bool>,
) -> Result<Plan, WorldError> {
    let deadline = Instant::now() + super::super::ADMISSION_WAIT;
    tokio::select! {
        biased;
        _ = async { let _ = stopped.wait_for(|stopped| *stopped).await; } => {
            return Err(HostError::Cancelled.into());
        }
        result = game.world.when_durable(scope.accepted_cut, deadline) => result?,
    }
    let head = game
        .store
        .protected_edit_head()
        .await?
        .ok_or(StoreError::StaleCut)?;
    if head.world_id != scope.world_id || head.generation != scope.generation {
        return Err(StoreError::StaleCut.into());
    }
    let hour = (scope.at / 3600.).floor() as u64;
    let next_hour = (hour as f64 + 1.) * 3600.;
    let cursor = game.store.pending_hourly(head.clone(), actor).await?;
    if cursor
        .current
        .as_ref()
        .is_some_and(|mark| mark.hour == hour)
    {
        return Ok(Plan::Wait(next_hour));
    }
    let Some(selection) = game
        .store
        .select_consolidation(
            head.clone(),
            actor.to_owned(),
            ConsolidationWindow::Hourly { at: scope.at },
        )
        .await?
    else {
        // The exact earliest age is only needed when the due batch was empty.
        return Ok(Plan::Wait(
            game.store
                .next_hourly_source(head, actor.to_owned())
                .await?
                .unwrap_or(f64::INFINITY),
        ));
    };
    if selection.protected_only {
        // The common hourly selector has a routine anchor. A contradictory
        // projection cannot grant a paid attempt.
        return Err(StoreError::InvalidRecord.into());
    }
    Ok(Plan::Ready(Selected {
        cursor,
        selection,
        hour,
        next_hour,
    }))
}

pub(super) async fn run(
    game: &Arc<CurrentServer>,
    saves: &Arc<LiveSaves>,
    dispatch: &Arc<DecisionDispatch>,
    model: &SummaryModel,
    selected: Selected,
    stopped: watch::Receiver<bool>,
) -> Result<f64, WorldError> {
    let deadline = Instant::now() + model.timeout;
    let Selected {
        cursor,
        selection,
        hour,
        next_hour,
    } = selected;
    let head = selection.head.clone();
    let actor = selection.actor.as_str();
    let identity = (
        &head.world_id,
        &head.generation,
        &cursor.timeline,
        actor,
        &selection.selection,
    );
    let length = json_record_len(&identity).map_err(RuntimeError::application_refused)?;
    let mut custody = selection.custody;
    custody
        .resize(
            custody
                .bytes()
                .checked_add(length.checked_mul(3).ok_or(StoreError::Capacity)?)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(RuntimeError::from)?;
    let body = json_record(&identity).map_err(RuntimeError::application_refused)?;
    let digest = sha256_hex(body.as_bytes());
    drop(body);
    if cursor
        .current
        .as_ref()
        .is_some_and(|mark| mark.source_digest == digest)
    {
        return Ok(next_hour);
    }
    let job = format!("hourly-memory:{digest}");
    let settings = &game.store.schema.recall.maintenance;
    let ticket = recall_maintenance::prepare(
        game,
        selection.head,
        selection.actor,
        RuntimeConsolidationBinding {
            job_id: job.clone(),
            selection: selection.selection,
            protected_importance: settings.protected_importance,
            summary_bytes: settings.summary_bytes,
            requires_body: true,
            dream_episode: None,
        },
        custody,
    )
    .await?;
    let budget = game.host.budget();
    let prepared = prepare_inference(game, ticket, false).await?;
    require_live(&stopped, deadline)?;
    let mut mark = HourlyPosition {
        hour,
        timeline: cursor.timeline.clone(),
        source_digest: digest,
        outcome: HourlyOutcome::Prepared,
    };
    let marker = cursor.write(&mark)?;
    // Record the exact source set before reserving or starting a provider.
    // A restart can observe an unresolved attempt without paying for it again.
    let marker = save_marker(game, &head, marker).await?;
    let groups = collect(model, dispatch, game, &stopped, deadline, &job, prepared).await;
    match groups {
        Ok(answer) if require_live(&stopped, deadline).is_ok() => {
            mark.outcome = HourlyOutcome::Published;
            let published = following(&marker, &mark, budget)?;
            match recall_maintenance::apply(
                game,
                saves,
                answer.ticket,
                answer.groups,
                answer.allocation,
                answer.dream,
                PublicationConsent {
                    stop: stopped,
                    deadline,
                },
                Some(published),
            )
            .await
            {
                Ok(ConsolidationOutcome::Published) => return Ok(next_hour),
                Ok(_) => (),
                Err(error @ WorldError::Commit(CommitError::Unknown(_))) => return Err(error),
                Err(error) => eprintln!("Hourly memory publication refused: {error}"),
            }
        }
        Ok(_) => (),
        Err(error) => eprintln!("Hourly memory inference finished without publication: {error}"),
    }
    mark.outcome = HourlyOutcome::Refused;
    let refused = following(&marker, &mark, budget)?;
    save_marker(game, &head, refused).await?;
    Ok(next_hour)
}

pub(super) fn require_live(
    stopped: &watch::Receiver<bool>,
    deadline: Instant,
) -> Result<(), WorldError> {
    if *stopped.borrow() {
        Err(HostError::Cancelled.into())
    } else if Instant::now() >= deadline {
        Err(WorldError::NpcDecisionExpired)
    } else {
        Ok(())
    }
}

pub(super) async fn save_marker(
    game: &CurrentServer,
    expected: &DurableHead,
    marker: ConsolidationCursorWrite,
) -> Result<ConsolidationCursorWrite, WorldError> {
    let expected = expected.clone();
    game.store
        .operational(move |tx| {
            Box::pin(async move {
                if durable_head(tx).await?.is_none_or(|head| {
                    head.world_id != expected.world_id || head.generation != expected.generation
                }) {
                    return Err(StoreError::StaleCut);
                }
                marker.commit(tx).await?;
                Ok(marker)
            })
        })
        .await
        .map_err(WorldError::Commit)
}

pub(super) fn following(
    marker: &ConsolidationCursorWrite,
    status: &impl serde::Serialize,
    budget: &ByteBudget,
) -> Result<ConsolidationCursorWrite, WorldError> {
    let bytes = json_record_len(status).map_err(RuntimeError::application_refused)?;
    let custody = budget
        .reserve(256 + marker.key.len() + marker.next.len() + 3 * bytes)
        .map_err(RuntimeError::from)?;
    Ok(ConsolidationCursorWrite {
        key: marker.key.clone(),
        previous: Some(marker.next.clone()),
        next: json_record(status).map_err(RuntimeError::application_refused)?,
        _custody: custody,
    })
}

struct ConsolidationDisclosure {
    ticket: Arc<RuntimeConsolidationTicket>,
    deadline: Instant,
}

impl ProviderDisclosure for ConsolidationDisclosure {
    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stopped: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        if *stopped.borrow() {
            return Err(CallFailure::Cancelled);
        }
        if Instant::now() >= self.deadline {
            return Err(CallFailure::Stale("consolidation-deadline"));
        }
        match turn
            .disclose_consolidation(&self.ticket, start)
            .map_err(CallFailure::World)?
        {
            Ok(()) => Ok(()),
            Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("consolidation-publication-busy")),
            Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
        }
    }
}

pub(super) struct PreparedInference {
    ticket: RuntimeConsolidationTicket,
    readings: RuntimeConsolidationReadings,
    partitions: prompt::Partitions,
    dream: Option<RuntimeConsolidationDream>,
}

pub(super) async fn prepare_inference(
    game: &CurrentServer,
    ticket: RuntimeConsolidationTicket,
    daily: bool,
) -> Result<PreparedInference, WorldError> {
    let budget = game.host.budget();
    let readings = ticket.consolidation_readings(budget)?;
    let mut partitions = prompt::partitions(&readings, game, daily)?;
    let (ticket, dream) = if daily {
        let count = partitions.values[0].routine.len();
        let allocation = budget
            .reserve(count * std::mem::size_of::<usize>())
            .map_err(RuntimeError::from)?;
        let positions = readings
            .readings
            .iter()
            .enumerate()
            .filter_map(|(position, source)| (!source.protected).then_some(position))
            .take(count)
            .collect::<Vec<_>>();
        game.world
            .capture(move |world| {
                let _allocation = allocation;
                let mut ticket = ticket;
                let dream = world.prepare_consolidation_dream_direct(&mut ticket, &positions)?;
                Ok((ticket, dream))
            })
            .await?
    } else {
        (ticket, None)
    };
    if let Some(dream) = &dream {
        partitions.append_dream(dream, budget)?;
    }
    Ok(PreparedInference {
        ticket,
        readings,
        partitions,
        dream,
    })
}

pub(super) struct InferenceAnswer {
    pub ticket: RuntimeConsolidationTicket,
    pub groups: Vec<RuntimeConsolidationGroup>,
    pub allocation: ByteReservation,
    pub dream: Option<RuntimePreparedDream>,
}

pub(super) async fn collect(
    settings: &SummaryModel,
    dispatch: &Arc<DecisionDispatch>,
    game: &CurrentServer,
    stopped: &watch::Receiver<bool>,
    deadline: Instant,
    job: &str,
    prepared: PreparedInference,
) -> Result<InferenceAnswer, CallFailure> {
    let PreparedInference {
        ticket,
        readings,
        partitions,
        dream,
    } = prepared;
    let ticket = Arc::new(ticket);
    let model = &settings.model;
    let policy = &game.store.schema.recall.maintenance;
    let budget = game.host.budget();
    let billing = model.macrofold.as_ref().map(|catalog| catalog.billing);
    let amount = model.amount_micro_usd.to_string();
    let mut output = prompt::Coverage::new(readings, budget)?;
    let mut interpretation = None;
    for (index, partition) in partitions.values.into_iter().enumerate() {
        require_live(stopped, deadline).map_err(CallFailure::World)?;
        let id = format!("{job}:summary:{index}");
        let dream = dream.as_ref().filter(|_| index == 0);
        let interpreting = dream.is_some();
        let schema = dream
            .map(|offer| prompt::dream_schema(policy, offer, budget))
            .transpose()?;
        let instructions = if interpreting {
            &policy.daily_instructions
        } else {
            &policy.hourly_instructions
        };
        if partition.prompt.len().saturating_add(instructions.len()) > 500_000 {
            return Err(CallFailure::Invalid);
        }
        let generation = Generation {
            schema_name: "memory_consolidation",
            schema: schema
                .as_ref()
                .map_or(&policy.hourly_schema, |schema| &schema.value),
            instructions,
            prompt: &partition.prompt,
            effort: if interpreting {
                Some(&policy.daily_effort)
            } else {
                model.effort
            },
            max_output_tokens: model.output_tokens,
            stream: false,
        };
        let request = provider::generation_request(
            &model.destination,
            &model.requested,
            model.route(&amount, deadline),
            generation,
            &id,
            budget,
        )?;
        let digest = sha256_hex(partition.prompt.as_bytes());
        let decode_budget = budget.clone();
        let mut reply = dispatch
            .submit(
                PreparedCall {
                    request,
                    allowance: AttemptRequest {
                        id,
                        actor: ticket.actor_id().to_owned(),
                        job: job.to_owned(),
                        provider: InferenceClass::OpenAi,
                        category: "maintenance",
                        stage: "memory_consolidation",
                        level: Some(if interpreting { 5 } else { 2 }),
                        background: true,
                        amount: model.amount_micro_usd,
                        ceiling: settings.ceiling,
                    },
                    requested_model: model.requested.clone(),
                    context_digest: digest,
                    macrofold_billing_mode: billing.map(|mode| match mode {
                        crate::provider_transport::macrofold::BillingMode::Byok => "byok",
                        crate::provider_transport::macrofold::BillingMode::Managed => "managed",
                    }),
                    deadline,
                    evidence_cut: ticket.accepted_cut(),
                    preview: None,
                },
                ConsolidationDisclosure {
                    ticket: ticket.clone(),
                    deadline,
                },
                stopped.clone(),
                decode_provider(billing, decode_budget.clone(), move |response| {
                    if billing.is_some() {
                        match provider::macrofold_text(response)
                            .map_err(|_| CallFailure::Invalid)?
                        {
                            TextResult::Refused => Err(CallFailure::Invalid),
                            TextResult::Complete(text) => {
                                prompt::decode(text, &decode_budget, interpreting)
                            }
                        }
                    } else {
                        let text = provider::direct_text(response, &decode_budget)
                            .map_err(|_| CallFailure::Invalid)?;
                        prompt::decode(&text.text, &decode_budget, interpreting)
                    }
                }),
            )
            .await?;
        if let Some(value) = reply.interpretation.take() {
            interpretation = Some(
                dream
                    .ok_or(CallFailure::Invalid)?
                    .prepare_publication_direct(&ticket, value, &mut reply.custody, budget)
                    .map_err(|error| CallFailure::World(error.into()))?,
            );
        }
        output.accept(partition.routine, reply, policy.summary_bytes)?;
    }
    let ticket = Arc::try_unwrap(ticket)
        .map_err(|_| CallFailure::Stale("consolidation holds a provider lease"))?;
    let (groups, allocation) = output.finish()?;
    Ok(InferenceAnswer {
        ticket,
        groups,
        allocation,
        dream: interpretation,
    })
}

fn capacity(error: CapacityError) -> CallFailure {
    CallFailure::World(RuntimeError::from(error).into())
}
