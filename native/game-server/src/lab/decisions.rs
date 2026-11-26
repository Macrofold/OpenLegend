//! A Lab hold stops one fully prepared inference before any spending or provider
//! admission. Only the ordinary dispatcher can start the request or apply its result.
pub(crate) mod runs;
pub(crate) mod participants;
mod rerun;
pub(crate) mod settings;
pub(crate) mod stimuli;
use super::{LabOperator, LabRuntime};
use crate::{
    access_http::{access_failure, refusal},
    authority::{AccessError, AuthorizedScope, Capability},
    decision_dispatch::{CallAuthority, CallFailure, DirectStageCapture, PreparedCall},
    launch::stopped,
    provider_transport::{PromptEdit},
};
use axum::{
    Extension, Json, Router,
    body::{Body, Bytes},
    extract::{DefaultBodyLimit, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use openlegend_simulation::runtime::RuntimeNpcResponseTicket;
use serde::{Deserialize, Serialize};
use std::{
    future::Future,
    pin::Pin,
    sync::{Arc, Mutex, Weak},
    task::{Context, Poll},
    time::Duration,
};
use tokio::{
    sync::{Semaphore, oneshot, watch},
    time::Instant,
};
use uuid::Uuid;

#[derive(Clone, Default)]
pub(crate) struct HoldTime(Arc<Mutex<Duration>>);
impl HoldTime {
    pub(crate) fn duration(&self) -> Duration {
        *self.0.lock().unwrap_or_else(|e| e.into_inner())
    }
}

pub(crate) struct DecisionControl {
    pub(crate) namespace: String,
    // Prepared requests already belong to bounded native jobs. At most one
    // request holds the operator's attention and a preview at a time.
    turn: Semaphore,
    comparison: Arc<Semaphore>,
    state: Mutex<ControlState>,
    transition: tokio::sync::Mutex<()>,
}
#[derive(Default)]
struct ControlState {
    field_epoch: Arc<()>,
    fields_possible: bool,
    settings: Arc<settings::Settings>,
    participants: Arc<participants::Participants>,
    interval: Option<runs::Interval>,
    starting: bool,
    restore_pause: bool,
    running: Option<LabOperator>,
    pending: Option<(Arc<Prepared>, oneshot::Sender<Release>)>,
}
struct Release {
    grant: runs::DispatchGrant,
    edit: Option<PromptEdit>,
}
struct Prepared {
    handle: Uuid,
    attempt: String,
    job: String,
    actor: String,
    model: String,
    stage: &'static str,
    source: Option<Source>,
    editable_path: Option<&'static str>,
}
struct Source {
    ticket: Weak<RuntimeNpcResponseTicket>,
    capture: Arc<DirectStageCapture>,
    speaker: Arc<AuthorizedScope>,
}
impl Prepared {
    fn new(call: &PreparedCall, source: Option<&CallAuthority>) -> Self {
        let source = source.and_then(|authority| {
            Some(Source {
                ticket: Arc::downgrade(&authority.source),
                capture: authority.stage_capture.clone()?,
                speaker: authority.speaker.as_ref()?.1.clone(),
            })
        });
        Self {
            handle: Uuid::new_v4(),
            attempt: call.allowance.id.clone(),
            job: call.allowance.job.clone(),
            actor: call.allowance.actor.clone(),
            model: call.requested_model.clone(),
            stage: call.allowance.stage,
            editable_path: crate::provider_transport::editable_prompt(call.allowance.stage, call.request.route()),
            source,
        }
    }
}
/// A disconnected request can be dropped while the native pause transition is
/// waiting on disk. The clock loop settles its original pause after cancellation.
struct Opening<'a> {
    control: &'a DecisionControl,
    was_paused: bool,
    completed: bool,
}
impl Drop for Opening<'_> {
    fn drop(&mut self) {
        let mut state = self.control.state.lock().unwrap_or_else(|e| e.into_inner());
        state.starting = false;
        if !self.completed && self.was_paused {
            state.restore_pause = true;
        }
    }
}

struct Holding<'a>(&'a DecisionControl, Uuid);
impl Drop for Holding<'_> {
    fn drop(&mut self) {
        let mut state = self.0.state.lock().unwrap_or_else(|e| e.into_inner());
        if state
            .pending
            .as_ref()
            .is_some_and(|(p, _)| p.handle == self.1)
        {
            state.pending.take();
        }
    }
}

impl DecisionControl {
    pub(crate) fn new(namespace: &str) -> Self {
        Self {
            namespace: namespace.to_owned(),
            turn: Semaphore::new(1),
            comparison: Arc::new(Semaphore::new(1)),
            state: Mutex::default(),
            transition: tokio::sync::Mutex::default(),
        }
    }

    // A reader cannot prolong a native ticket after Step releases this exact
    // call. The next stage may need sole ownership to reopen the source.
    fn with_source<T>(
        &self,
        expected: &Prepared,
        read: impl FnOnce(&ControlState, &RuntimeNpcResponseTicket) -> T,
    ) -> Option<T> {
        let state = self.state.lock().ok()?;
        let pending = &state.pending.as_ref()?.0;
        if pending.handle != expected.handle {
            return None;
        }
        let ticket = pending.source.as_ref()?.ticket.upgrade()?;
        Some(read(&state, &ticket))
    }

    /// Wait without a world turn, allowance or shared network permit. Ordinary
    /// NPC jobs get their operator wait credited to their original useful lifetime.
    pub(crate) async fn admit(
        &self,
        call: &mut PreparedCall,
        permit: Option<&CallAuthority>,
        stop: &watch::Receiver<bool>,
    ) -> Result<runs::DispatchGrant, CallFailure> {
        if permit.is_some() {
            self.follow_focal_job(&call.allowance.actor, &call.allowance.job);
        }
        if call.allowance.background
            && !self.permits_background(&call.allowance.job, &call.allowance.actor)
        {
            return Err(CallFailure::Stale("lab-autonomy-held"));
        }
        call.request.namespace(&self.namespace)?;
        if let Some(operator) = self.lease()
            && self.state.lock().is_ok_and(|state| state.interval.as_ref().is_some_and(runs::Interval::permits_calls)) {
            return Ok(operator);
        }
        let started = Instant::now();
        if call.deadline <= started {
            return Err(CallFailure::Stale("decision-deadline"));
        }
        let credit = permit.and_then(|p| p.hold_time.as_ref());
        let wait = async {
            let _turn = self
                .turn
                .acquire()
                .await
                .map_err(|_| CallFailure::Cancelled)?;
            let (send, receive) = oneshot::channel();
            let _held = {
                let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
                if let Some((operator, interval)) =
                    state.running.clone().zip(state.interval.as_ref().filter(|run| run.permits_calls()))
                {
                    return Ok(Release {
                        grant: runs::DispatchGrant {
                            operator,
                            interval: Some(interval.id),
                        },
                        edit: None,
                    });
                }
                let preview = Arc::new(Prepared::new(call, permit));
                let held = Holding(self, preview.handle);
                state.pending = Some((preview, send));
                held
            };
            receive.await.map_err(|_| CallFailure::Cancelled)
        };
        let released = tokio::select! {
            biased;
            _ = stopped(stop.clone()) => return Err(CallFailure::Cancelled),
            _ = tokio::time::sleep_until(call.deadline), if credit.is_none() =>
                return Err(CallFailure::Stale("decision-deadline")),
            result = wait => result?,
        };
        if let Some(credit) = credit {
            let elapsed = started.elapsed();
            *credit.0.lock().unwrap_or_else(|e| e.into_inner()) += elapsed;
            call.deadline += elapsed;
        }
        if let Some(edit) = released.edit {
            call.context_digest = call.request.apply_lab_edit(edit);
        }
        Ok(released.grant)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Command {
    action: Action,
    attempt_id: Option<Uuid>,
    state_override: Option<String>,
    run: Option<runs::Request>,
}
#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
enum Action {
    Hold,
    Resume,
    Step,
    Cancel,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct View<'a> {
    mode: &'static str,
    run: Option<&'a runs::Interval>,
    prepared: Option<Stage<'a>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Stage<'a> {
    attempt_id: Uuid,
    provider_attempt_id: &'a str,
    job_id: &'a str,
    stage: &'a str,
    model: &'a str,
    input: Option<&'a str>,
    editable: bool,
    editable_text: Option<&'a str>,
}

pub(crate) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .merge(settings::router())
        .merge(participants::router())
        .merge(stimuli::router())
        .merge(rerun::router())
        .route("/guides",get(guides))
        .route("/decisions", get(inspect))
        .route("/decisions/control", post(control))
        .layer(DefaultBodyLimit::max(512 * 1024))
}

fn stale() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "stale-prepared-call",
        "The prepared call changed. Refresh the decision before continuing.",
    )
}

fn encode(
    runtime: &LabRuntime,
    state: &ControlState,
    input: Option<(&str, Option<&str>)>,
) -> Result<Bytes, AccessError> {
    let active = state.pending.as_ref().map(|(p, _)| p.as_ref());
    let prepared = active.map(|call| Stage {
        attempt_id: call.handle,
        provider_attempt_id: &call.attempt,
        job_id: &call.job,
        stage: call.stage,
        model: &call.model,
        input: input.map(|i| i.0),
        editable: input.and_then(|i| i.1).is_some(),
        editable_text: input.and_then(|i| i.1),
    });
    crate::wire::encode(
        &View {
            mode: if state.running.is_some() {
                "running"
            } else {
                "held"
            },
            run: state.interval.as_ref(),
            prepared,
        },
        b"",
        b"",
        runtime.game.host.budget(),
    )
    .map_err(|_| AccessError::Availability)
}

async fn guides(State(runtime):State<Arc<LabRuntime>>,Extension(operator):Extension<LabOperator>)->Response{
    if let Err(error)=operator.current(Capability::Inspect,||()){return access_failure(error);}
    let Ok(turn)=runtime.game.world.clone().player_disclosure_turn().await else{return access_failure(AccessError::Availability)};
    let bytes=operator.current(Capability::Inspect,||turn.accepted(|session|{
        let guides=session.experiment_guides()?;
        crate::wire::encode(&guides,b"",b"",runtime.game.host.budget()).map(Some)
            .map_err(openlegend_simulation::runtime::RuntimeError::application_refused)
    }).map_err(|_|AccessError::Availability).and_then(|v|v.ok_or(AccessError::Availability)));
    match bytes{
        Ok(Ok(bytes))=>([(header::CONTENT_TYPE,"application/json"),(header::CACHE_CONTROL,"no-store")],bytes).into_response(),
        Ok(Err(error))|Err(error)=>access_failure(error),
    }
}

/// Recheck the original signed actor, exact native evidence and both current
/// grants when the HTTP body is polled, and encode inside the publication lease.
async fn inspect(
    State(runtime): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
) -> Response {
    if let Err(e) = op.current(Capability::Inspect, || ()) {
        return access_failure(e);
    }
    let body = async move {
        let controls = runtime
            .decisions
            .lab_controls()
            .ok_or(AccessError::Availability)?;
        controls.lease();
        let selected = controls
            .state
            .lock()
            .map_err(|_| AccessError::Availability)?
            .pending
            .as_ref()
            .map(|(p, _)| p.clone());
        if let Some(call) = &selected
            && let Some(source) = &call.source
            && source.speaker.scope.recovery_fields() == op.scope.scope.recovery_fields()
            && let Some((input, editable)) = source
                .capture
                .inspect(call.editable_path, runtime.game.host.budget())
        {
            let turn = runtime
                .game
                .world
                .npc_disclosure_turn()
                .await
                .map_err(|_| AccessError::Availability)?;
            let result = op.current(Capability::Inspect, || {
                controls.with_source(call, |state, ticket| {
                    turn.disclose(
                        ticket,
                        Some((source.capture.witness(), &op.scope.scope)),
                        false,
                        source.capture.fields.as_deref(),
                        |life| {
                            encode(
                                &runtime,
                                state,
                                life.map(|_| (input, editable.as_ref().map(|e| e.0.as_str()))),
                            )
                        },
                    )
                })
            })?;
            if let Some(Ok(Ok(bytes))) = result {
                return bytes;
            }
        }
        op.current(Capability::Inspect, || {
            let state = controls
                .state
                .lock()
                .map_err(|_| AccessError::Availability)?;
            encode(&runtime, &state, None)
        })?
    };
    (
        [
            (header::CONTENT_TYPE, "application/json"),
            (header::CACHE_CONTROL, "no-store"),
        ],
        Body::new(Inspection(Some(Box::pin(body)))),
    )
        .into_response()
}

async fn control(
    State(runtime): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(mut command): Json<Command>,
) -> Response {
    let Some(controls) = runtime.decisions.lab_controls() else {
        return stale();
    };
    let edit = if let Some(text) = command.state_override.take() {
        if !matches!(command.action, Action::Step | Action::Resume) {
            return stale();
        }
        if let Err(e) = op.current(Capability::Inspect, || ()) {
            return access_failure(e);
        }
        let pending = controls
            .state
            .lock()
            .ok()
            .and_then(|s| s.pending.as_ref().map(|(p, _)| p.clone()));
        let Some(pending) = pending.filter(|p| Some(p.handle) == command.attempt_id) else {
            return stale();
        };
        let Some(path) = pending.editable_path else {
            return stale();
        };
        let Some(source) = &pending.source else {
            return access_failure(AccessError::Forbidden);
        };
        if source.speaker.scope.recovery_fields() != op.scope.scope.recovery_fields() {
            return access_failure(AccessError::Forbidden);
        }
        let Ok(turn) = runtime.game.world.npc_disclosure_turn().await else {
            return stale();
        };
        let admitted = op.current(Capability::Inspect, || {
            controls.with_source(&pending, |_, ticket| {
                turn.disclose(
                    ticket,
                    Some((source.capture.witness(), &op.scope.scope)),
                    false,
                    source.capture.fields.as_deref(),
                    |life| life.is_some(),
                )
            })
        });
        if !matches!(admitted, Ok(Some(Ok(Ok(true))))) {
            return stale();
        }
        let Some(input) = source.capture.safe_body(runtime.game.host.budget()) else {
            return stale();
        };
        match PromptEdit::prepare(input, path, text, runtime.game.host.budget()) {
            Ok(edit) => Some(edit),
            Err(_) => {
                return refusal(
                    StatusCode::BAD_REQUEST,
                    "invalid-edited-state",
                    "Use nonempty text that fits the provider request limit.",
                );
            }
        }
    } else {
        None
    };
    if matches!(command.action, Action::Step | Action::Resume) && !op.present().unwrap_or(false) {
        return refusal(
            StatusCode::CONFLICT,
            "lab-control-required",
            "Take control in this Lab tab before starting a decision.",
        );
    }
    if command.action != Action::Resume && command.run.is_some() {
        return stale();
    }
    // Serialize interval start and its clock stop so a late stop cannot pause
    // a freshly started interval.
    let _transition = controls.transition.lock().await;
    let mut opening = None;
    let mut interval = None;
    let mut watch_job = None;
    // A composer already holds the signed receipt. Its job may reach the
    // breakpoint between Submit and this request. Only that exact job matches.
    let submitted = command.run.as_ref().filter(|r|r.mode==runs::Mode::OneResponse)
        .and_then(|r|r.job_id.clone()).filter(|_|command.attempt_id.is_none());
    let matches_prepared=|pending:Option<&Prepared>|{
        pending.map(|p|p.handle)==command.attempt_id ||
        pending.is_some_and(|p|submitted.as_deref()==Some(p.job.as_str()))
    };
    if command.action == Action::Resume {
        if !controls
            .settings()
            .validate(&runtime.decisions.lab_model_choices())
        {
            return refusal(
                StatusCode::CONFLICT,
                "unavailable-model-setting",
                "Select installed models before starting this interval.",
            );
        }
        let prepared = {
            let state = controls.state.lock().unwrap_or_else(|e| e.into_inner());
            if state.running.is_some() {
                return stale();
            }
            state.pending.as_ref().map(|(p, _)| p.clone())
        };
        if !matches_prepared(prepared.as_deref()) {
            return stale();
        }
        let mut request = command
            .run
            .take()
            .unwrap_or_else(|| runs::Request::resume(prepared.is_some()));
        let job = if let Some(id) = &request.job_id {
            match runtime.decisions.receipt(&op.scope, id).await {
                Ok(Some(job)) if !job.job.status.terminal() => {
                    Some((job.job.id.clone(), job.job.request.npc_id.clone()))
                }
                _ => return stale(),
            }
        } else {
            prepared.as_ref().map(|p| (p.job.clone(), p.actor.clone()))
        };
        let focal_reference = request.focal_actor_id.take();
        if let Some(reference) = &focal_reference {
            match stimuli::npc_subject(&runtime, &op, reference.clone()).await {
                Ok(actor) => request.focal_actor_id = Some(actor),
                Err(_) => {
                    return refusal(
                        StatusCode::CONFLICT,
                        "invalid-focal-actor",
                        "Select a current visible NPC for this interval.",
                    );
                }
            }
        }
        let Ok(clock) = runtime
            .game
            .world
            .capture(openlegend_simulation::runtime::NativeWorldSession::clock)
            .await
        else {
            return stale();
        };
        match request.bind(clock.at, job, focal_reference) {
            Ok(run) => {
                watch_job = run.job_id.clone();
                interval = Some(run)
            }
            Err(why) => return refusal(StatusCode::BAD_REQUEST, "invalid-run", why),
        }
        if let Err(error) = op.current(Capability::Create, || ()) {
            return access_failure(error);
        }
        controls
            .state
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .starting = true;
        opening = Some(Opening {
            control: controls,
            was_paused: clock.manually_paused,
            completed: false,
        });
        if runtime
            .clock
            .manual_control(
                runtime.authority.clone(),
                op.scope.clone(),
                Some(false),
                None,
            )
            .await
            .is_err()
        {
            return stale();
        }
    }
    let result = match op.current(Capability::Create, || {
        let mut state = controls
            .state
            .lock()
            .map_err(|_| AccessError::Availability)?;
        if command.action == Action::Hold {
            if command.attempt_id.is_some() {
                return Ok(false);
            }
            state.end("operator-hold");
            return Ok(true);
        }
        if !matches_prepared(state.pending.as_ref().map(|(p,_)|p.as_ref())) {
            return Ok(false);
        }
        if command.action != Action::Resume && state.pending.is_none() {
            return Ok(false);
        }
        let id = interval.as_ref().map(|r| r.id);
        if interval.as_ref().is_none_or(runs::Interval::permits_calls)
            && let Some((_, release)) = state.pending.take()
            && command.action != Action::Cancel
            && release
                .send(Release {
                    grant: runs::DispatchGrant {
                        operator: op.clone(),
                        interval: id,
                    },
                    edit,
                })
                .is_err()
        {
            return Ok(false);
        }
        if command.action == Action::Resume {
            state.running = Some(op.clone());
            state.restore_pause = false;
            state.interval = interval.take();
        }
        Ok(true)
    }) {
        Ok(Ok(true)) => {
            if command.action == Action::Resume {
                if let Some(id) = watch_job
                    && let Ok(Some(job)) = runtime.decisions.receipt(&op.scope, &id).await
                    && job.job.status.terminal()
                {
                    controls.terminal_job(&id);
                }
            }
            Json(serde_json::json!({"ok":true})).into_response()
        }
        Ok(Ok(false)) => stale(),
        Ok(Err(e)) | Err(e) => access_failure(e),
    };
    if let Some(guard) = &mut opening {
        guard.completed = result.status().is_success();
    }
    result
}

/// Polling once ensures the source check and serialization happen when the
/// connection can receive this frame. Dropping a slow reader drops its future.
struct Inspection<F>(Option<Pin<Box<F>>>);
impl<F: Future<Output = Result<Bytes, AccessError>> + Send> http_body::Body for Inspection<F> {
    type Data = Bytes;
    type Error = AccessError;
    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<http_body::Frame<Bytes>, AccessError>>> {
        let Some(future) = self.0.as_mut() else {
            return Poll::Ready(None);
        };
        let bytes = std::task::ready!(future.as_mut().poll(cx));
        self.0.take();
        Poll::Ready(Some(bytes.map(http_body::Frame::data)))
    }
}

impl DecisionControl {
    pub(super) fn run_active(&self)->bool{ self.lease().is_some() }

    pub(super) async fn field_edit_guard(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.transition.lock().await
    }

    pub(super) fn hold_for_edit(&self) -> bool {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if state.starting { return false; }
        state.end("scenario-authoring");
        state.pending.take();
        state.field_epoch = Arc::new(());
        true
    }

    pub(super) fn invalidate_fields(&self) {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.pending.take();
        state.field_epoch = Arc::new(());
    }

    pub(crate) fn fields_possible(&self) -> bool {
        self.state.lock().unwrap_or_else(|e|e.into_inner()).fields_possible
    }
    pub(super) fn set_fields_possible(&self, possible:bool) {
        self.state.lock().unwrap_or_else(|e|e.into_inner()).fields_possible=possible;
    }
    pub(crate) fn field_operator(&self)->Option<(Arc<crate::authority::Authority>,Arc<AuthorizedScope>)>{
        let operator = self.lease()?.operator;
        Some((operator.authority,operator.scope))
    }
    pub(crate) fn field_epoch(&self) -> Arc<()> {
        self.state.lock().unwrap_or_else(|e| e.into_inner()).field_epoch.clone()
    }
}
