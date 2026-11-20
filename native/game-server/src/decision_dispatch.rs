//! Admit spending before starting one prepared provider exchange. The native
//! evidence and live player grant own the synchronous start. Settlement is
//! durable even if the caller no longer wants the output.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability},
    boot::CurrentServer,
    network::{NetworkError, NetworkOwner},
    provider_transport::{
        ActiveRun, FundedReply, HttpEvidence, InferenceEvent, InferenceEvents,
        PreparedProviderRequest, ProviderDestination, ProviderExchange, ProviderReply,
    },
    store::{
        AttemptAdmission, AttemptRequest, CommitError, ModelReceipt, ModelUsage, ReservedAttempt,
    },
    world::{NpcDisclosure, NpcDisclosureTurn, WorldError},
};
use chrono::{SecondsFormat, Utc};
use openlegend_simulation::{encoding::hex_bytes, runtime::RuntimeNpcResponseTicket};
use openlegend_world_host::pool::HostError;
use std::{
    fmt,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use tokio::{sync::watch, time::Instant};

mod previews;
pub(crate) use previews::{PreviewTerminal, ReplyPreview, ReplyPreviews, ReplyReceipt};

pub(crate) struct PreparedCall {
    pub request: PreparedProviderRequest,
    pub allowance: AttemptRequest,
    pub requested_model: String,
    pub context_digest: String,
    pub macrofold_billing_mode: Option<&'static str>,
    pub deadline: Instant,
    pub evidence_cut: u64,
    pub preview: Option<crate::npc::preview::PreviewAttempt>,
}

pub(crate) struct CallAuthority {
    pub source: Arc<RuntimeNpcResponseTicket>,
    pub speaker: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
}

pub(crate) struct ProviderObservation<T> {
    pub value: Result<T, CallFailure>,
    pub provider_request_id: Option<String>,
    pub model: Option<String>,
    pub usage: Option<ModelUsage>,
    pub charged_microusd: Option<u64>,
    pub completion_uncertain: bool,
}

#[derive(Debug)]
pub(crate) enum CallFailure {
    Admission,
    Existing,
    Cancelled,
    Stale(&'static str),
    Authority(AccessError),
    World(WorldError),
    DecodeBusy,
    Transport(NetworkError),
    Refused(u16),
    Invalid,
    Commit(CommitError),
    At {
        stage: &'static str,
        failed: Box<CallFailure>,
    },
}

impl fmt::Display for CallFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Admission => f.write_str("The provider allowance is already committed"),
            Self::Existing => f.write_str("This exact provider attempt already exists"),
            Self::Cancelled => f.write_str("This request was cancelled"),
            Self::Stale(reason) => {
                write!(f, "The provider request lost its current source: {reason}")
            }
            Self::Authority(error) => error.fmt(f),
            Self::World(error) => error.fmt(f),
            Self::DecodeBusy => f.write_str("Compute capacity remained busy for the funded reply"),
            Self::Transport(error) => error.fmt(f),
            Self::Refused(status) => write!(f, "The provider refused the request ({status})"),
            Self::Invalid => f.write_str("The provider returned an invalid response"),
            Self::Commit(error) => error.fmt(f),
            Self::At { stage, failed } => write!(f, "{stage}: {failed}"),
        }
    }
}
impl std::error::Error for CallFailure {}

impl CallFailure {
    #[cfg(feature = "profile-campaign")]
    pub(crate) fn profile_outcome<T>(
        result: &Result<T, Self>,
    ) -> openlegend_simulation::profile::Outcome {
        use openlegend_simulation::profile::Outcome;
        match result {
            Ok(_) => Outcome::Completed,
            Err(error) => match error.cause().1 {
                Self::Cancelled => Outcome::Cancelled,
                Self::Admission
                | Self::Existing
                | Self::Stale(_)
                | Self::Authority(_)
                | Self::Refused(_)
                | Self::DecodeBusy => Outcome::Refused,
                _ => Outcome::Failed,
            },
        }
    }

    pub(crate) fn at(self, stage: &'static str) -> Self {
        match self {
            Self::At { .. } => self,
            failed => Self::At {
                stage,
                failed: Box::new(failed),
            },
        }
    }

    pub(crate) fn cause(&self) -> (&'static str, &Self) {
        match self {
            Self::At { stage, failed } => (stage, failed),
            failed => ("decision", failed),
        }
    }
}

impl From<NetworkError> for CallFailure {
    fn from(error: NetworkError) -> Self {
        Self::Transport(error)
    }
}

impl CallAuthority {
    /// No file, SQL, provider wait or encoder can escape this callback.
    /// Distinguish world occupancy from a real withdrawal at the native gate.
    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stopped: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        let send = || {
            if *stopped.borrow() {
                return Err(CallFailure::Cancelled);
            }
            match turn
                .disclose(&self.source, start)
                .map_err(CallFailure::World)?
            {
                Ok(()) => Ok(()),
                Err(NpcDisclosure::Busy) => Err(CallFailure::Stale("world-publication-busy")),
                Err(NpcDisclosure::Refused(reason)) => Err(CallFailure::Stale(reason)),
            }
        };
        match &self.speaker {
            Some((authority, scope)) => authority
                .current(scope, Capability::Play, true, |_, _| send())
                .map_err(CallFailure::Authority)?,
            None => send(),
        }
    }
}

pub(crate) struct DecisionDispatch {
    game: Arc<CurrentServer>,
    network: NetworkOwner,
    previews: Arc<ReplyPreviews>,
}

impl DecisionDispatch {
    pub(crate) fn new(
        game: Arc<CurrentServer>,
        worker_capacity: usize,
    ) -> Result<Self, NetworkError> {
        let network = NetworkOwner::new(worker_capacity, game.host.budget().clone(), false)?;
        Ok(Self {
            game,
            network,
            previews: Arc::new(ReplyPreviews::new()),
        })
    }

    pub(crate) fn previews(&self) -> &Arc<ReplyPreviews> {
        &self.previews
    }

    /// The admitted decoder inspects precisely one response for this phase.
    /// It runs off the writer lane and returns a usable value and independent
    /// charge facts even if one of those observations fails.
    pub(crate) async fn submit<T, Decode>(
        self: &Arc<Self>,
        call: PreparedCall,
        permit: CallAuthority,
        stopped: watch::Receiver<bool>,
        decode: Decode,
    ) -> Result<T, CallFailure>
    where
        T: Send + 'static,
        Decode: FnOnce(FundedReply, &HttpEvidence) -> ProviderObservation<T> + Send + 'static,
    {
        let stage = call.allowance.stage;
        let owner = self.clone();
        let operation = async move {
            openlegend_simulation::profile_body!(
                PROVIDER,
                { owner.run(call, permit, stopped, decode).await },
                CallFailure::profile_outcome
            )
        };
        #[cfg(feature = "profile-campaign")]
        let operation = openlegend_simulation::profile::carry(
            openlegend_simulation::profile::current(),
            operation,
        );
        tokio::spawn(operation)
            .await
            .map_err(|_| CallFailure::Invalid.at(stage))?
            .map_err(|error| error.at(stage))
    }

    async fn run<T, Decode>(
        &self,
        call: PreparedCall,
        permit: CallAuthority,
        mut stopped: watch::Receiver<bool>,
        decode: Decode,
    ) -> Result<T, CallFailure>
    where
        T: Send + 'static,
        Decode: FnOnce(FundedReply, &HttpEvidence) -> ProviderObservation<T> + Send + 'static,
    {
        if *stopped.borrow() {
            return Err(CallFailure::Cancelled);
        }
        let PreparedCall {
            request,
            allowance,
            requested_model,
            context_digest,
            macrofold_billing_mode,
            deadline,
            evidence_cut,
            mut preview,
        } = call;
        let waiting = self.game.world.when_durable(evidence_cut, deadline);
        tokio::select! {
            biased;
            _ = cancelled(&mut stopped) => return Err(CallFailure::Cancelled),
            result = waiting => result.map_err(CallFailure::World)?,
        }
        let route = request.route();
        let observer = request.observer();
        let operation = self.network.admit(deadline, 32768)?;
        let provider = allowance.provider;
        let digest = hex_bytes(&request.digest);
        let attempt = match self
            .game
            .store
            .reserve_model(allowance)
            .await
            .map_err(CallFailure::Commit)?
        {
            AttemptAdmission::Exhausted => return Err(CallFailure::Admission),
            AttemptAdmission::Existing => return Err(CallFailure::Existing),
            AttemptAdmission::Reserved(attempt) => attempt,
        };
        let started_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
        let started = Instant::now();
        let mut evidence = None;
        let mut body_received = false;
        let transmitted = AtomicBool::new(false);
        let mut observation = None;
        let mut accepted_run = None;
        let intent = if *stopped.borrow() {
            Err(CallFailure::Cancelled)
        } else {
            match self.game.store.model_dispatch_intent(&attempt).await {
                Ok(true) => Ok(()),
                Ok(false) => return Err(CallFailure::Existing),
                Err(error @ CommitError::RolledBack(_)) => Err(CallFailure::Commit(error)),
                Err(error) => return Err(CallFailure::Commit(error)),
            }
        };
        let remember =
            |attempt: &ReservedAttempt, run: &ActiveRun, http: &HttpEvidence| ModelReceipt {
                request_id: attempt.id().to_owned(),
                provider,
                requested_model: requested_model.clone(),
                model: requested_model.clone(),
                model_version_status: "unavailable",
                provider_request_id: Some(run.id.clone()),
                context_digest: context_digest.clone(),
                provider_request_digest: digest.clone(),
                started_at: started_at.clone(),
                completed_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
                latency_ms: started.elapsed().as_secs_f64() * 1000.0,
                dispatched: true,
                transport_started: true,
                response_received: false,
                completion_uncertain: true,
                http_status: Some(http.status),
                provider_error_code: None,
                retry_after_ms: http.retry_after_ms,
                macrofold_billing_mode,
                usage: None,
                estimated_cost_usd: None,
            };
        let result = if intent.is_ok() {
            let transfer = async {
                let turn = tokio::time::timeout_at(deadline, self.game.world.npc_disclosure_turn())
                    .await
                    .map_err(|_| CallFailure::Transport(NetworkError::Deadline))?
                    .map_err(CallFailure::World)?;
                let timeout = deadline.saturating_duration_since(Instant::now());
                let stop = &stopped;
                let did_transmit = &transmitted;
                let stream = preview.is_some();
                let exchange =
                    ProviderExchange::start(&operation, request, stream, timeout, move |start| {
                        permit.start(turn, stop, &mut || {
                            did_transmit.store(true, Ordering::Release);
                            start();
                        })
                    })
                    .await?;
                evidence = Some(exchange.evidence().clone());
                Ok(exchange)
            };
            let mut cancel = stopped.clone();
            let response = tokio::select! {
                biased;
                result = transfer => result,
                _ = cancelled(&mut cancel) => Err(CallFailure::Cancelled),
            };
            let budget = self.game.host.budget();
            let response = match response {
                Ok(exchange) if exchange.streaming() => {
                    let http = exchange.evidence().clone();
                    let mut display = None;
                    let streamed = async {
                        let mut events = InferenceEvents::new(exchange, budget)?;
                        loop {
                            let next = tokio::select! {
                                biased;
                                result = events.next(budget) => result?,
                                _ = cancelled(&mut stopped) => return Err(CallFailure::Cancelled),
                            };
                            match next {
                                Some(InferenceEvent::Accepted { run: _, data }) => {
                                    let observer =
                                        observer.as_ref().ok_or(NetworkError::Transfer)?;
                                    let run = Arc::new(
                                        observer
                                            .admitted_run(data.value.get().as_bytes(), budget)?,
                                    );
                                    accepted_run = Some(run.clone());
                                    drop(data);
                                    self.game
                                        .store
                                        .record_model_run(&attempt, remember(&attempt, &run, &http))
                                        .await
                                        .map_err(CallFailure::Commit)?;
                                }
                                Some(InferenceEvent::Text { .. }) => {
                                    if let Some(preview) = &mut preview
                                        && !preview.prefix_ended()
                                    {
                                        if let Ok(Some(speech)) =
                                            preview.inspect(events.prefix(), budget)
                                        {
                                            display = self
                                                .previews
                                                .begin(&self.game, preview, speech)
                                                .await;
                                        }
                                    }
                                }
                                Some(InferenceEvent::Terminal {
                                    data,
                                    preview_matches,
                                }) => {
                                    if preview_matches && let Some(display) = display.take() {
                                        display.complete();
                                    }
                                    return Ok(data.into_reply());
                                }
                                None => return Err(CallFailure::Transport(NetworkError::Transfer)),
                            }
                        }
                    }
                    .await;
                    drop(display);
                    let body = match streamed {
                        Err(CallFailure::Transport(NetworkError::Transfer))
                            if accepted_run.is_some() && observer.is_some() =>
                        {
                            let run = accepted_run.clone().expect("known admitted Run");
                            let observer = observer.as_ref().expect("bound Macrofold destination");
                            tokio::select! {
                                biased;
                                result = observer.follow_run(&operation, run, deadline, budget) => result.map_err(CallFailure::Transport),
                                _ = cancelled(&mut stopped) => Err(CallFailure::Cancelled),
                            }
                        }
                        outcome => outcome,
                    };
                    body.map(|body| ProviderReply::Json {
                        evidence: http,
                        body,
                    })
                }
                Ok(exchange) => tokio::select! {
                    biased;
                    result = exchange.json(budget) => result.map_err(CallFailure::Transport),
                    _ = cancelled(&mut stopped) => Err(CallFailure::Cancelled),
                },
                Err(error) => Err(error),
            };
            match response {
                Ok(ProviderReply::Refused(http)) => {
                    let status = http.status;
                    evidence = Some(http);
                    Err(CallFailure::Refused(status))
                }
                Ok(ProviderReply::Json {
                    evidence: http,
                    body,
                }) => {
                    evidence = Some(http.clone());
                    let body = match (http.status, observer.as_ref()) {
                        (202, Some(observer)) => match observer.admitted_run(&body.bytes, budget) {
                            Ok(run) => {
                                let run = Arc::new(run);
                                accepted_run = Some(run.clone());
                                drop(body);
                                let recorded = self
                                    .game
                                    .store
                                    .record_model_run(&attempt, remember(&attempt, &run, &http))
                                    .await;
                                match recorded {
                                    Ok(()) => tokio::select! {
                                        biased;
                                        result = observer.follow_run(&operation, run, deadline, budget) => result.map_err(CallFailure::Transport),
                                        _ = cancelled(&mut stopped) => Err(CallFailure::Cancelled),
                                    },
                                    Err(error) => Err(CallFailure::Commit(error)),
                                }
                            }
                            Err(error) => Err(CallFailure::Transport(error)),
                        },
                        _ => Ok(body),
                    };
                    match body {
                        Ok(body) => {
                            body_received = true;
                            // Retain any observable charge even when caller
                            // cancellation wins before the gameplay effect.
                            match self
                                .game
                                .host
                                .compute_before(deadline, move || decode(body, &http))
                                .await
                            {
                                Ok(decoded) => {
                                    observation = Some(decoded);
                                    Ok(())
                                }
                                Err(WorldError::Host(HostError::Busy)) => {
                                    Err(CallFailure::DecodeBusy.at("response-decode"))
                                }
                                Err(error) => Err(CallFailure::World(error).at("response-decode")),
                            }
                        }
                        Err(error) => Err(error),
                    }
                }
                Err(error) => Err(error),
            }
        } else {
            intent
        };
        let dispatched = transmitted.load(Ordering::Acquire)
            && !evidence
                .as_ref()
                .is_some_and(|http| http.admission_rejected(route));
        let charged = observation.as_ref().and_then(|out| out.charged_microusd);
        let uncertain = dispatched
            && observation
                .as_ref()
                .is_none_or(|out| out.completion_uncertain);
        let model = observation.as_mut().and_then(|out| out.model.take());
        let provider_request_id = observation
            .as_mut()
            .and_then(|out| out.provider_request_id.take())
            .or_else(|| accepted_run.as_ref().map(|run| run.id.clone()))
            .or_else(|| evidence.as_mut().and_then(|http| http.trace_id.take()));
        let receipt = ModelReceipt {
            request_id: attempt.id().to_owned(),
            provider,
            model_version_status: if model.is_some() {
                "reported"
            } else {
                "unavailable"
            },
            model: model.unwrap_or_else(|| requested_model.clone()),
            requested_model,
            provider_request_id,
            context_digest,
            provider_request_digest: digest.clone(),
            started_at,
            completed_at: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
            latency_ms: started.elapsed().as_secs_f64() * 1000.0,
            dispatched,
            transport_started: transmitted.load(Ordering::Acquire),
            response_received: body_received,
            completion_uncertain: uncertain,
            http_status: evidence.as_ref().map(|http| http.status),
            provider_error_code: evidence.as_mut().and_then(|http| http.error_code.take()),
            retry_after_ms: evidence.as_ref().and_then(|http| http.retry_after_ms),
            macrofold_billing_mode,
            usage: observation.as_mut().and_then(|out| out.usage.take()),
            estimated_cost_usd: charged.map(|value| value as f64 / 1_000_000.0),
        };
        let settled = self.game.store.settle_model(attempt, receipt).await;
        if matches!(
            &result,
            Err(CallFailure::Cancelled
                | CallFailure::Transport(NetworkError::Deadline)
                | CallFailure::Commit(_))
        ) && let Some((observer, run)) = observer.as_ref().zip(accepted_run.as_deref())
        {
            drop(operation);
            self.cancel_known_run(observer, run, &digest).await;
        }
        settled.map_err(CallFailure::Commit)?;
        if *stopped.borrow_and_update()
            && (result.is_ok()
                || matches!(&result, Err(error) if matches!(error.cause().1, CallFailure::DecodeBusy)))
        {
            return Err(CallFailure::Cancelled.at("response-decode"));
        }
        result?;
        observation.ok_or(CallFailure::Invalid)?.value
    }

    async fn cancel_known_run(
        &self,
        observer: &ProviderDestination,
        run: &ActiveRun,
        digest: &str,
    ) {
        // Provider cleanup addresses one already recorded Run. It cannot
        // purchase another reply, and an unsuccessful notice leaves its
        // funded unknown outcome in the durable ledger.
        let timeout = Duration::from_secs(5);
        let budget = self.game.host.budget();
        let operation = match self.network.admit(Instant::now() + timeout, 32768) {
            Ok(operation) => operation,
            Err(_) => return,
        };
        let cancel_id = format!("cancel:{digest}");
        let request = match observer.cancel(&run.id, &cancel_id, budget) {
            Ok(request) => request,
            Err(_) => return,
        };
        if let Ok(exchange) =
            ProviderExchange::start::<NetworkError>(&operation, request, false, timeout, |start| {
                start();
                Ok(())
            })
            .await
        {
            let _ = exchange.json(budget).await;
        }
    }
}

async fn cancelled(stop: &mut watch::Receiver<bool>) {
    while !*stop.borrow() && stop.changed().await.is_ok() {}
}
