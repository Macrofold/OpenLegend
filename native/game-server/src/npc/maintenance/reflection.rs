//! Scheduled intentional reflection keeps the original paid Run and its
//! private file proposal separate from accepted native mind state.

mod worktree;

use super::super::{ADMISSION_WAIT, Director, decide::prepare::reflection as prepare};
use crate::{
    decision_dispatch::CallFailure,
    live_save::ProtectedGameplaySave,
    network::NetworkError,
    provider_transport::{
        PreparedProviderRequest,
        macrofold::BillingMode,
        workspace::{self, WorkspaceRead},
    },
    store::{
        AttemptAdmission, AttemptRequest, InferenceClass, ModelReceipt, ModelUsage, StoreError,
        reflection::{ReflectionCue, ReflectionScope},
    },
    world::{NpcDisclosure, NpcDisclosureTurn, ProtectedCommit, WorldError},
};
use chrono::{SecondsFormat, Utc};
use openlegend_simulation::{
    encoding::{hex_bytes, json_record, json_tree_allocation_bound, sha256_hex},
    host::ByteReservation,
    identity::MAX_SAFE_INTEGER,
    records::SqlCell,
    runtime::{RuntimeDirectOutput, RuntimeError, RuntimeReflectionTicket},
};
use openlegend_world_host::pool::HostError;
use serde::{Deserialize, de::DeserializeOwned};
use serde_json::json;
use std::{
    collections::HashSet,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tokio::{sync::watch, time::Instant};
use worktree::Worktree;

pub(super) enum Plan {
    Wait(f64),
    Ready(Selected, f64),
}

pub(super) struct Selected {
    pub(super) scope: Arc<ReflectionScope>,
    cue: Option<ReflectionCue>,
}

pub(super) async fn plan(
    director: &Director,
    actor: &str,
    inspect_cue: bool,
) -> Result<Plan, WorldError> {
    let Some(model) = &director.reflection_model else {
        return Ok(Plan::Wait(f64::INFINITY));
    };
    let selected = actor.to_owned();
    let Some(window) = director
        .game
        .world
        .capture(move |world| world.reflection_opportunity(&selected))
        .await?
    else {
        return Ok(Plan::Wait(f64::INFINITY));
    };
    let policy = &director.game.cognition.reflection;
    let day = (window.at / policy.day_seconds).floor();
    let tomorrow = (day + 1.) * policy.day_seconds;
    if window.last_reflection_at > 0.
        && (window.last_reflection_at / policy.day_seconds).floor() == day
    {
        return Ok(Plan::Wait(tomorrow));
    }
    let due = window.last_reflection_at + policy.minimum_interval_seconds;
    if !window.idle {
        // An accepted change to the actor will wake the same due entry.
        return Ok(Plan::Wait(f64::INFINITY));
    }
    if window.at < due && !inspect_cue {
        return Ok(Plan::Wait(due));
    }
    director
        .game
        .world
        .when_durable(window.accepted_cut, Instant::now() + ADMISSION_WAIT)
        .await?;
    let store = &director.game.store;
    let scope = Arc::new(ReflectionScope::new(
        store,
        window.world_id,
        window.generation,
        actor.to_owned(),
        day as u64,
        model.destination.workspace_scope(),
    )?);
    use crate::store::reflection::ReflectionDue;
    let cue = match store.reflection_due(scope.clone()).await? {
        ReflectionDue::NoEvidence => return Ok(Plan::Wait(f64::INFINITY)),
        ReflectionDue::AlreadyAttempted => return Ok(Plan::Wait(tomorrow)),
        ReflectionDue::Ready(None) if window.at < due => return Ok(Plan::Wait(due)),
        ReflectionDue::Ready(cue) => cue,
    };
    Ok(Plan::Ready(Selected { scope, cue }, tomorrow))
}

#[derive(Deserialize)]
struct AcceptedRun {
    run_id: String,
    worktree_id: String,
    worker_id: String,
    session_id: String,
}

#[derive(Deserialize)]
struct RunStatus {
    id: String,
    status: String,
    persistence_status: Option<String>,
    started_at: Option<String>,
    #[serde(default)]
    cost_micro_usd: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct ModelPage {
    data: Vec<WorkspaceModel>,
}

#[derive(Deserialize)]
struct WorkspaceModel {
    id: String,
    enabled: bool,
    harnesses: Vec<String>,
    billing_modes: Vec<String>,
}

#[derive(Deserialize)]
struct RunResult {
    run_id: String,
    #[serde(rename = "final")]
    final_result: bool,
    execution_outcome: Option<String>,
    persistence_status: Option<String>,
    output_text: Option<String>,
}

#[derive(Deserialize)]
struct EventPage {
    data: Vec<RunEvent>,
    next_cursor: Option<String>,
}

#[derive(Deserialize)]
struct RunEvent {
    sequence: String,
    #[serde(rename = "type")]
    kind: String,
    data: Option<ToolData>,
}

#[derive(Deserialize)]
struct ToolData {
    tool_call_id: Option<String>,
}

#[derive(Deserialize)]
struct UsagePage {
    data: Vec<UsageEntry>,
    next_cursor: Option<String>,
}

#[derive(Deserialize)]
struct UsageEntry {
    run_id: String,
    kind: String,
    model_usage: Option<UsageModel>,
    charged_micro_usd: Option<serde_json::Value>,
}

#[derive(Deserialize)]
struct UsageModel {
    completeness: String,
    provisional: bool,
    input_tokens: serde_json::Value,
    output_tokens: serde_json::Value,
    cached_input_tokens: Option<serde_json::Value>,
    cache_write_input_tokens: Option<serde_json::Value>,
    reported_micro_usd: Option<serde_json::Value>,
}

fn count(raw: &serde_json::Value) -> Option<u64> {
    let count = raw.as_u64().or_else(|| {
        let string = raw.as_str()?;
        if string.is_empty() || !string.bytes().all(|byte| byte.is_ascii_digit()) {
            return None;
        }
        string.parse().ok()
    })?;
    (count <= MAX_SAFE_INTEGER).then_some(count)
}

fn usage(page: UsagePage, run: &str, byok: bool) -> Option<(ModelUsage, Option<f64>)> {
    if page.next_cursor.is_some() || page.data.len() > 100 {
        return None;
    }
    let mut has_model = false;
    let mut total = ModelUsage {
        input_tokens: 0,
        output_tokens: 0,
    };
    let mut charge = Some(0u64);
    let sum = |left: u64, right: u64| {
        left.checked_add(right)
            .filter(|result| *result <= MAX_SAFE_INTEGER)
    };
    for row in page.data {
        if row.run_id != run {
            return None;
        }
        let billed = match row.kind.as_str() {
            "model" => {
                let model = row.model_usage?;
                if model.completeness != "complete" || model.provisional {
                    return None;
                }
                let input = count(&model.input_tokens)?;
                let output = count(&model.output_tokens)?;
                let optional = |raw: Option<&serde_json::Value>| raw.map_or(Some(0), count);
                let cached = optional(model.cached_input_tokens.as_ref())?;
                let written = optional(model.cache_write_input_tokens.as_ref())?;
                if sum(cached, written)? > input {
                    return None;
                }
                total.input_tokens = sum(total.input_tokens, input)?;
                total.output_tokens = sum(total.output_tokens, output)?;
                has_model = true;
                model.reported_micro_usd
            }
            "tool" | "compute" | "storage" => row.charged_micro_usd,
            _ => return None,
        };
        if byok {
            charge = charge
                .zip(billed.as_ref().and_then(count))
                .and_then(|(left, right)| sum(left, right));
        }
    }
    has_model.then_some((
        total,
        charge.filter(|_| byok).map(|cost| cost as f64 / 1_000_000.),
    ))
}

pub(super) fn start_private(
    turn: NpcDisclosureTurn<'_>,
    ticket: &RuntimeReflectionTicket,
    workspace: Option<u64>,
    start: impl FnOnce(),
) -> Result<(), CallFailure> {
    match turn
        .disclose_reflection(ticket, workspace, start)
        .map_err(CallFailure::World)?
    {
        Ok(()) => Ok(()),
        Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("reflection-publication-busy")),
        Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
    }
}

pub(super) async fn run(
    director: Arc<Director>,
    selected: Selected,
    stopped: watch::Receiver<bool>,
) -> Result<(), CallFailure> {
    let Selected { scope, cue } = selected;
    let game = &director.game;
    let store = &game.store;
    let budget = game.host.budget();
    let model = director
        .reflection_model
        .as_ref()
        .ok_or(CallFailure::Admission)?;
    let deadline = Instant::now() + model.timeout;
    let network = director.dispatch.network().admit(deadline, 64 * 1024)?;
    let prepared = prepare::prepare(
        game,
        &scope.actor,
        &scope.attempt,
        &game.cognition.reflection.stimulus,
        cue.as_ref().map(|cue| &cue.source),
    )
    .await?;
    if prepared
        .files
        .files
        .iter()
        .any(|file| file.text.as_unicode().is_none())
    {
        return Err(CallFailure::Invalid);
    }
    let worktree = Worktree {
        director: &director,
        model,
        prepared: &prepared,
        scope: scope.clone(),
        cancellation: &stopped,
        network: &network,
    };
    let billing = match model.billing {
        BillingMode::Managed => "managed",
        BillingMode::Byok => "byok",
    };
    let (models, _models): (ModelPage, _) = observe(&worktree, WorkspaceRead::Models).await?;
    if !models.data.iter().any(|candidate| {
        candidate.enabled
            && candidate.id == model.model
            && candidate.harnesses.contains(&model.harness)
            && candidate.billing_modes.iter().any(|mode| mode == billing)
    }) {
        return Err(CallFailure::Admission);
    }
    drop(models);
    drop(_models);
    let seeded = worktree.seed().await?;
    let schema = game
        .cognition
        .reflection_schema(&prepared.subjects, &prepared.evidence, budget)
        .map_err(|_| CallFailure::Invalid)?;
    let policy = &game.cognition.reflection;
    let request_scratch = budget
        .reserve(400_000)
        .map_err(|_| CallFailure::Admission)?;
    let prompt = json_record(&json!({
        "instructions": policy.instructions, "context": prepared.context, "schema": schema.value(),
        "workspace": {"directory":"mind", "guidance":policy.workspace_guidance,
            "files":prepared.files.files.iter().map(|file| format!("mind/{}.md",file.id)).collect::<Vec<_>>()},
    })).map_err(|_| CallFailure::Invalid)?;
    if prompt.len() > 100_000 {
        return Err(CallFailure::Invalid);
    }
    let timeout = deadline.saturating_duration_since(Instant::now()).as_secs();
    if timeout < 1 {
        return Err(NetworkError::Deadline.into());
    }
    let mut body = json!({
        "worktree_id":seeded.id,"harness":model.harness,"model":model.model,"billing_mode":billing,
        "model_parameters":policy.model_parameters,"permissions":policy.permissions,"connection_grants":[],
        "worker_id":model.worker,"prompt":prompt,"queue_if_busy":false,"scheduling_class":"background",
        "queue_timeout_seconds":timeout,"limits":{"timeout_seconds":timeout,"max_cost_micro_usd":model.amount.to_string()},
    });
    if let Some(connection) = &model.connection {
        body["provider_connection_id"] = json!(connection);
    }
    if let Some(memory) = model.memory_mib {
        body["memory_mib"] = json!(memory);
    }
    let request = model
        .destination
        .workspace_run(&body, &scope.attempt, budget)?;
    let context_digest = sha256_hex(
        body["prompt"]
            .as_str()
            .ok_or(CallFailure::Invalid)?
            .as_bytes(),
    );
    drop(body);
    drop(request_scratch);
    let attempt = match store
        .reserve_reflection_model(
            AttemptRequest {
                id: scope.attempt.clone(),
                actor: scope.actor.clone(),
                job: scope.attempt.clone(),
                provider: InferenceClass::OpenAi,
                category: "generation",
                stage: "reflection-worktree",
                level: Some(5),
                background: true,
                amount: model.amount,
                ceiling: model.ceiling,
            },
            scope.clone(),
            cue,
        )
        .await
        .map_err(CallFailure::Commit)?
    {
        AttemptAdmission::Reserved(attempt) => attempt,
        AttemptAdmission::Exhausted => return Err(CallFailure::Admission),
        AttemptAdmission::Existing => return Err(CallFailure::Existing),
    };
    let dispatched = AtomicBool::new(false);
    let started = Instant::now();
    let mut receipt = ModelReceipt {
        request_id: scope.attempt.clone(),
        provider: InferenceClass::OpenAi,
        requested_model: model.model.clone(),
        model: model.model.clone(),
        model_version_status: "unavailable",
        provider_request_id: None,
        context_digest,
        provider_request_digest: hex_bytes(&request.digest),
        started_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
        completed_at: String::new(),
        latency_ms: 0.,
        dispatched: false,
        transport_started: false,
        response_received: false,
        completion_uncertain: true,
        http_status: None,
        provider_error_code: None,
        retry_after_ms: None,
        macrofold_billing_mode: Some(billing),
        usage: None,
        estimated_cost_usd: None,
    };
    let completed = async {
        worktree.running()?;
        if !store
            .model_dispatch_intent(&attempt)
            .await
            .map_err(CallFailure::Commit)?
        {
            return Err(CallFailure::Existing);
        }
        let accepted = start_run(&worktree, request, &dispatched).await?;
        receipt.http_status = Some(accepted.status);
        let (accepted, _accepted): (AcceptedRun, _) = worktree.decode(&accepted)?;
        if accepted.worker_id != model.worker
            || accepted.worktree_id != seeded.id
            || accepted.session_id.is_empty()
            || accepted.run_id.is_empty()
        {
            return Err(CallFailure::Invalid);
        }
        receipt.provider_request_id = Some(accepted.run_id.clone());
        receipt.dispatched = true;
        receipt.transport_started = true;
        store
            .record_model_run(&attempt, receipt.clone())
            .await
            .map_err(CallFailure::Commit)?;
        let finished = wait_run(&worktree, &accepted.run_id).await;
        if let Err(error) = &finished {
            eprintln!("Reflection Run observation ended: {error}");
            if let Ok(request) = model.destination.cancel(
                &accepted.run_id,
                &format!("{}:cancel", scope.attempt),
                budget,
            ) {
                let _ =
                    workspace::exchange::<CallFailure>(request, &network, budget, false, |start| {
                        start();
                        Ok(())
                    })
                    .await;
            }
        }
        let (status, terminal, storage) = finished?;
        receipt.response_received = true;
        receipt.completion_uncertain = false;
        if matches!(model.billing, BillingMode::Managed) {
            receipt.estimated_cost_usd = status
                .cost_micro_usd
                .as_ref()
                .and_then(count)
                .map(|cost| cost as f64 / 1_000_000.);
        }
        let at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
        if let Ok((page, _storage)) = observe::<UsagePage>(
            &worktree,
            WorkspaceRead::RunUsage {
                id: &accepted.run_id,
                from: &receipt.started_at,
                to: &at,
            },
        )
        .await
        {
            if let Some((tokens, charge)) = usage(
                page,
                &accepted.run_id,
                matches!(model.billing, BillingMode::Byok),
            ) {
                receipt.usage = Some(tokens);
                if let Some(charge) = charge {
                    receipt.estimated_cost_usd = Some(
                        receipt
                            .estimated_cost_usd
                            .map_or(charge, |prior| prior.max(charge)),
                    );
                }
            }
        }
        if status.status != "succeeded" {
            return Err(CallFailure::Invalid);
        }
        Ok((terminal.output_text.ok_or(CallFailure::Invalid)?, storage))
    }
    .await;
    receipt.dispatched = dispatched.load(Ordering::Acquire);
    receipt.transport_started = receipt.dispatched;
    receipt.completed_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    receipt.latency_ms = started.elapsed().as_secs_f64() * 1000.;
    store
        .settle_model(attempt, receipt)
        .await
        .map_err(CallFailure::Commit)?;
    let (output, provider_storage) = completed?;
    let bytes = json_tree_allocation_bound(&output).ok_or(CallFailure::Invalid)?;
    let mut storage = budget
        .reserve(bytes + 4096)
        .map_err(|_| CallFailure::Admission)?;
    let answer: SqlCell = serde_json::from_str(&output).map_err(|_| CallFailure::Invalid)?;
    drop(output);
    drop(provider_storage);
    schema.validate(&answer).map_err(|_| CallFailure::Invalid)?;
    let SqlCell::Object(mut answer) = answer else {
        return Err(CallFailure::Invalid);
    };
    let (revision, files) = worktree.export(&seeded.id, &mut storage).await?;
    answer.insert("revision".into(), revision.into());
    answer.insert("files".into(), files);
    publish(
        &director,
        prepared.ticket,
        SqlCell::Object(answer),
        storage,
        stopped,
        deadline,
    )
    .await
    .map_err(CallFailure::World)
}

async fn start_run(
    worktree: &Worktree<'_>,
    request: PreparedProviderRequest,
    transmitted: &AtomicBool,
) -> Result<workspace::OwnedWorkspaceReply, CallFailure> {
    let game = &worktree.director.game;
    let turn = game
        .world
        .npc_disclosure_turn()
        .await
        .map_err(CallFailure::World)?;
    workspace::exchange(
        request,
        worktree.network,
        game.host.budget(),
        false,
        |start| {
            worktree.running()?;
            start_private(
                turn,
                &worktree.prepared.ticket,
                Some(worktree.prepared.files.revision),
                || {
                    transmitted.store(true, Ordering::Release);
                    start();
                },
            )
        },
    )
    .await
}

async fn wait_run(
    worktree: &Worktree<'_>,
    run: &str,
) -> Result<(RunStatus, RunResult, ByteReservation), CallFailure> {
    let mut after = 0u64;
    let mut tools = HashSet::new();
    let _events = worktree
        .director
        .game
        .host
        .budget()
        .reserve(8192)
        .map_err(|_| CallFailure::Admission)?;
    let mut input_wait = 0;
    loop {
        let (status, mut storage): (RunStatus, _) =
            observe(worktree, WorkspaceRead::Run(run)).await?;
        if status.id != run {
            return Err(CallFailure::Invalid);
        }
        let (page, _page): (EventPage, _) =
            observe(worktree, WorkspaceRead::RunEvents(run, after)).await?;
        if page.next_cursor.is_some() || page.data.len() > 100 {
            return Err(CallFailure::Invalid);
        }
        for event in page.data {
            let sequence = event
                .sequence
                .parse::<u64>()
                .map_err(|_| CallFailure::Invalid)?;
            if sequence <= after {
                return Err(CallFailure::Invalid);
            }
            after = sequence;
            if event.kind == "tool.started" {
                let id = event
                    .data
                    .and_then(|tool| tool.tool_call_id)
                    .ok_or(CallFailure::Invalid)?;
                if id.len() > 256 {
                    return Err(CallFailure::Invalid);
                }
                tools.insert(id);
                if tools.len() > 8 {
                    return Err(CallFailure::Invalid);
                }
            }
        }
        let expected = match status.status.as_str() {
            "succeeded" => Some("success"),
            "failed" => Some("failure"),
            "cancelled" => Some("cancelled"),
            "timed_out" => Some("timed_out"),
            "waiting_for_input" => {
                input_wait += 1;
                if input_wait >= 3 {
                    return Err(CallFailure::Invalid);
                }
                None
            }
            _ => None,
        };
        if let Some(expected) = expected {
            loop {
                let (result, result_storage): (RunResult, _) =
                    observe(worktree, WorkspaceRead::RunResult(run)).await?;
                if result.run_id != run {
                    return Err(CallFailure::Invalid);
                }
                if result.final_result {
                    let settled = |persistence: Option<&str>| {
                        persistence == Some("verified")
                            || (persistence == Some("not_required")
                                && matches!(expected, "failure" | "cancelled")
                                && status.started_at.is_none())
                    };
                    if result.execution_outcome.as_deref() != Some(expected)
                        || !settled(status.persistence_status.as_deref())
                        || !settled(result.persistence_status.as_deref())
                    {
                        return Err(CallFailure::Invalid);
                    }
                    storage
                        .merge(result_storage)
                        .map_err(|_| CallFailure::Admission)?;
                    return Ok((status, result, storage));
                }
                wait(worktree, Duration::from_millis(250)).await?;
            }
        }
        wait(worktree, Duration::from_secs(2)).await?;
    }
}

async fn observe<T: DeserializeOwned>(
    worktree: &Worktree<'_>,
    read: WorkspaceRead<'_>,
) -> Result<(T, ByteReservation), CallFailure> {
    let budget = worktree.director.game.host.budget();
    loop {
        let request = worktree
            .model
            .destination
            .workspace_metadata(read, budget)?;
        let reply = worktree.request(request, false, None).await?;
        if reply.status != 429 {
            return worktree.decode(&reply);
        }
        wait(
            worktree,
            Duration::from_millis(reply.retry_after_ms.unwrap_or(60_000).max(1000)),
        )
        .await?;
    }
}

async fn wait(worktree: &Worktree<'_>, delay: Duration) -> Result<(), CallFailure> {
    let mut stopped = worktree.cancellation.clone();
    tokio::select! {
        _ = async { let _ = stopped.wait_for(|value| *value).await; } => Err(CallFailure::Cancelled),
        _ = tokio::time::sleep_until(worktree.network.deadline()) => Err(NetworkError::Deadline.into()),
        _ = tokio::time::sleep(delay) => Ok(()),
    }
}

async fn publish(
    director: &Director,
    ticket: Arc<RuntimeReflectionTicket>,
    proposal: SqlCell,
    storage: ByteReservation,
    stopped: watch::Receiver<bool>,
    deadline: Instant,
) -> Result<(), WorldError> {
    fn check(stop: &watch::Receiver<bool>, deadline: Instant) -> Result<(), WorldError> {
        if *stop.borrow() || Instant::now() >= deadline {
            return Err(HostError::Cancelled.into());
        }
        Ok(())
    }
    check(&stopped, deadline)?;
    let game = &director.game;
    let saves = &director.saves;
    let _resolution = game.world.begin_source_edit(ticket.actor_id())?;
    let _barrier = saves.enter_protected().await?;
    let writer = game.store.clone();
    let storage_owner = writer.clone();
    let language = game.language().cloned();
    let provider = game.clone();
    let before = stopped.clone();
    let result = game
        .world
        .execute_protected(
            move |world| {
                check(&before, deadline).map_err(RuntimeError::application_refused)?;
                world.begin_protected_reflection(&ticket, proposal, storage)
            },
            move |question| {
                let provider = provider.clone();
                async move { provider.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    return Err(RuntimeError::application_refused(StoreError::InvalidRecord));
                };
                if !product.outcome().ok {
                    return Err(RuntimeError::application_refused(StoreError::StaleCut));
                }
                ProtectedGameplaySave::prepare(&product, &storage_owner, budget)
            },
            move || check(&stopped, deadline),
            move |prepared, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let projection = prepared.projection(&writer, language.as_deref());
                    let acknowledged = writer.commit_save(prefix, &[], &projection).await?;
                    prepared.record_commit(&projection);
                    Ok(acknowledged)
                })
            },
        )
        .await?
        .ok_or(StoreError::StaleCut)?;
    result.acknowledged(saves);
    Ok(())
}
