//! Real-time offers belong to the application. Native simulation owns time
//! advancement and its accepted result. A refused candidate consumes no debt.

use crate::{
    authority::{Authority, AuthorizedScope, Capability},
    boot::CurrentServer,
    live_save::{AcceptedSaveInput, LiveSaves},
    presence::Presence,
    store::{MetadataProjection, StoreError, checkpoint::CheckpointSchedule},
    world::{ApplicationStart, IO_YIELD, ProtectedCommit, WorldError},
    world_input::{InputSnapshot, WorldInputs},
};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeClock, RuntimeDirectOutput, RuntimeError,
};
use openlegend_world_host::pool::HostError;
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{
    sync::watch,
    time::{Instant, MissedTickBehavior},
};

const CADENCE: Duration = Duration::from_millis(50);
const TICK_SLICE: Duration = Duration::from_millis(32);
const SUSPENDED_GAP: Duration = Duration::from_secs(2);
const MAX_GAME_OFFER: f64 = 86400.0;

struct Advance {
    seconds: f64,
    navigation_pending: bool,
    deferred_routes: bool,
    save: Option<Arc<AcceptedSaveInput>>,
}

struct CheckpointInterval<'a> {
    checkpoints: &'a CheckpointSchedule,
    elapsed: Duration,
}

impl Drop for CheckpointInterval<'_> {
    fn drop(&mut self) {
        self.checkpoints.advance(self.elapsed);
    }
}

pub struct GameClock {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    checkpoints: Arc<CheckpointSchedule>,
    base_ratio: f64,
    presence: Option<Arc<Presence>>,
    inputs: Option<Arc<WorldInputs>>,
    accepted_reset: Mutex<Instant>,
}

impl GameClock {
    pub(crate) fn new(
        game: Arc<CurrentServer>,
        saves: Arc<LiveSaves>,
        checkpoints: Arc<CheckpointSchedule>,
        base_ratio: f64,
    ) -> Self {
        Self {
            game,
            saves,
            checkpoints,
            base_ratio,
            presence: None,
            inputs: None,
            accepted_reset: Mutex::new(Instant::now()),
        }
    }

    /// A visibility transition has the same acknowledgement boundary as the
    /// saved clock change it requested. Ordinary heartbeat renewal has no
    /// reason to invoke this owner.
    pub(crate) async fn presence_changed(&self) -> Result<(), WorldError> {
        self.clock_with_presence().await.map(|_| ())
    }

    pub(crate) fn with_inputs(mut self, presence: Arc<Presence>, inputs: Arc<WorldInputs>) -> Self {
        self.presence = Some(presence);
        self.inputs = Some(inputs);
        self
    }

    async fn clock_with_presence(&self) -> Result<(RuntimeClock, bool), WorldError> {
        let current = self.game.world.capture(NativeWorldSession::clock).await?;
        let Some(presence) = &self.presence else {
            return Ok((current, false));
        };
        let should_pause = |clock: RuntimeClock| {
            Ok::<_, WorldError>(
                clock.manually_paused || !(presence.visible()? || clock.exit_exposure_active),
            )
        };
        if should_pause(current)? == current.paused {
            return Ok((current, false));
        }
        let _protected = self.saves.enter_protected().await?;
        let current = self.game.world.capture(NativeWorldSession::clock).await?;
        let paused = should_pause(current)?;
        if paused == current.paused {
            return Ok((current, false));
        }
        self.persist_control(RuntimeClock { paused, ..current }, true, || Ok(()))
            .await?;
        Ok((RuntimeClock { paused, ..current }, true))
    }

    pub(crate) async fn manual_pause(
        &self,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
        setting: Option<bool>,
    ) -> Result<bool, WorldError> {
        self.set_manual_pause(setting, move || {
            Ok(authority.current(&scope, Capability::Play, true, |_, _| ())?)
        })
        .await
    }

    /// World recovery uses the same durable pause and elapsed-time reset as
    /// the player's control, with the operator's save permission instead.
    pub(crate) async fn pause_for_recovery(
        &self,
        authority: Arc<Authority>,
        scope: Arc<AuthorizedScope>,
    ) -> Result<(), WorldError> {
        self.set_manual_pause(Some(true), move || {
            Ok(authority.current(&scope, Capability::Save, false, |_, _| ())?)
        })
        .await?;
        Ok(())
    }

    async fn set_manual_pause(
        &self,
        setting: Option<bool>,
        validate: impl Fn() -> Result<(), WorldError> + Send + 'static,
    ) -> Result<bool, WorldError> {
        validate()?;
        let _protected = self.saves.enter_protected().await?;
        let previous = self.game.world.capture(NativeWorldSession::clock).await?;
        let visible = match &self.presence {
            Some(presence) => presence.visible()?,
            None => true,
        };
        if setting == Some(false) && !visible {
            return Ok(false);
        }
        let manual = setting.unwrap_or(previous.manually_paused);
        let paused = manual || !(visible || previous.exit_exposure_active);
        if manual != previous.manually_paused || paused != previous.paused {
            let active = RuntimeClock {
                paused,
                manually_paused: manual,
                ..previous
            };
            self.persist_control(active, previous.paused || paused, validate)
                .await?;
        } else {
            validate()?;
        }
        Ok(true)
    }

    /// Only the ordinary-save barrier holder can settle a durable clock
    /// transition. The caller supplies the current authorization check.
    async fn persist_control(
        &self,
        next: RuntimeClock,
        reset_elapsed: bool,
        validate: impl FnOnce() -> Result<(), WorldError> + Send + 'static,
    ) -> Result<(), WorldError> {
        let provider = self.game.clone();
        let store = self.game.store.clone();
        self.game
            .world
            .execute_protected(
                move |session| {
                    session.begin_control_direct(next.paused, next.speed, next.manually_paused)
                },
                move |question| {
                    let game = provider.clone();
                    async move { game.answer_operation(question).await }
                },
                |value, _| {
                    let RuntimeDirectOutput::Prepared(value) = value else {
                        unreachable!("host control cannot preview")
                    };
                    value.metadata_control().map(MetadataProjection::new)
                },
                validate,
                move |projection, prefix| -> ProtectedCommit<'_> {
                    Box::pin(
                        async move { store.commit_prefix(prefix.rows(), &[], projection).await },
                    )
                },
            )
            .await?;
        if reset_elapsed {
            *self
                .accepted_reset
                .lock()
                .map_err(|_| HostError::Poisoned)? = Instant::now();
            if let Some(inputs) = &self.inputs {
                inputs.exclude()?;
            }
            if !next.paused {
                self.saves.resume_semantic_index();
            }
        }
        self.saves.signal_view();
        Ok(())
    }

    /// Reconcile the loaded hot state before accepting connections. Startup
    /// now contributes to the same ordinary store queue as later gameplay.
    pub async fn initialize(&self) -> Result<(), WorldError> {
        let game = self.game.clone();
        let prepare = self.saves.clone();
        let accept = self.saves.clone();
        self.game
            .world
            .execute_and_publish(
                #[cfg(feature = "profile-campaign")]
                openlegend_simulation::profile::sites::TURN_CLOCK,
                |session| Ok(ApplicationStart::Candidate(session.begin_startup()?)),
                move |question| {
                    let game = game.clone();
                    async move { game.answer_operation(question).await }
                },
                move |output, _| match output {
                    RuntimeDirectOutput::Prepared(product) if product.outcome().ok => {
                        prepare.stage(&product, None)
                    }
                    RuntimeDirectOutput::Prepared(product) => {
                        Err(RuntimeError::application_refused(&product.outcome().code))
                    }
                    RuntimeDirectOutput::Preview(_) => unreachable!("startup cannot preview"),
                },
                |fence, key, _| Ok(fence.settle(key, true)?),
                move |save| accept.accept(save),
            )
            .await?;
        Ok(())
    }

    async fn advance(
        &self,
        clock: RuntimeClock,
        seconds: f64,
    ) -> Result<Option<Advance>, WorldError> {
        openlegend_simulation::profile_body!(
            CLOCK,
            {
                let game = self.game.clone();
                let prepare = self.saves.clone();
                let accept = self.saves.clone();
                let inputs = self.inputs.clone();
                let settlement = inputs
                    .as_ref()
                    .map(|_| Arc::new(Mutex::new(None::<InputSnapshot>)));
                let capture = settlement.clone();
                let recheck = inputs.clone();
                let advance = self.game.world.execute_and_publish(
                    #[cfg(feature = "profile-campaign")]
                    openlegend_simulation::profile::sites::TURN_CLOCK,
                    move |session| {
                        // Pause/speed can change while this caller waits for the turn.
                        let current = session.clock()?;
                        if current.paused || current.speed != clock.speed || current.at != clock.at
                        {
                            return Err(WorldError::ClockChanged);
                        }
                        let key = match (inputs, capture) {
                            (Some(inputs), Some(capture)) => {
                                let mut held = capture.lock().map_err(|_| HostError::Poisoned)?;
                                let mut snapshot = inputs.snapshot(session)?;
                                let values = snapshot.take();
                                // A refused begin drops the input proof before this world
                                // turn ends. A running candidate retains it until settlement.
                                let key = session.begin_advance_direct(seconds, 4096, values)?;
                                *held = Some(snapshot);
                                key
                            }
                            _ => session.begin_advance_direct(seconds, 4096, Vec::new())?,
                        };
                        Ok(ApplicationStart::Candidate(key))
                    },
                    move |question| {
                        let game = game.clone();
                        async move { game.answer_operation(question).await }
                    },
                    move |output, _| {
                        let RuntimeDirectOutput::Prepared(product) = output else {
                            unreachable!("advance cannot preview")
                        };
                        let result = product.outcome();
                        if !result.ok {
                            return Err(RuntimeError::application_refused(&result.code));
                        }
                        let seconds = product.progress().at - clock.at;
                        let navigation_pending = result.code == "navigation-pending";
                        let deferred_routes = product.has_deferred_navigation();
                        let save = if navigation_pending && seconds == 0.0 {
                            None
                        } else {
                            Some(prepare.stage(&product, None)?)
                        };
                        Ok(Advance {
                            seconds,
                            navigation_pending,
                            deferred_routes,
                            save,
                        })
                    },
                    move |fence, key, staged| {
                        let active = staged.save.is_some();
                        match (recheck, settlement) {
                            (Some(inputs), Some(settlement)) if active => {
                                let held = settlement.lock().map_err(|_| HostError::Poisoned)?;
                                let snapshot = held.as_ref().expect("prepared input snapshot");
                                match inputs.accept_inputs(snapshot, || fence.settle(key, true)) {
                                    Ok(result) => Ok(result?),
                                    Err(crate::authority::AccessError::Changed) => {
                                        Ok(fence.settle(key, false)?)
                                    }
                                    Err(error) => Err(error.into()),
                                }
                            }
                            _ => Ok(fence.settle(key, active)?),
                        }
                    },
                    move |staged| {
                        accept.accept(staged.save.as_ref().expect("accepted clock has save input"))
                    },
                );
                tokio::pin!(advance);
                let mut publication =
                    tokio::time::interval_at(Instant::now() + TICK_SLICE, IO_YIELD);
                publication.set_missed_tick_behavior(MissedTickBehavior::Skip);
                loop {
                    tokio::select! {
                        biased;
                        result = &mut advance => {
                            #[cfg(feature = "profile-campaign")]
                            if let Ok(Some(accepted)) = &result {
                                let mut observation = openlegend_simulation::profile_scope!(ACCEPTED);
                                if observation.is_observed() {
                                    observation.work((accepted.seconds * 1_000_000.0) as u64);
                                }
                            }
                            return result;
                        },
                        _ = publication.tick() => {
                            // The first deadline can pass while another operation owns
                            // the turn. Keep offering a boundary until this single
                            // clock advance finishes, as on the pool-backed host.
                            // docs/limits/native-work.md#nw12
                            self.game.world.request_advance_publication();
                        }
                    }
                }
            },
            WorldError::profile_outcome
        )
    }

    /// One loop offers time from a monotonic cursor and yields between
    /// catch-up publications. It must be joined before the save task drains.
    pub async fn run(&self, stop: watch::Receiver<bool>) -> Result<(), WorldError> {
        let started = Instant::now();
        let (offered, sample) = watch::channel(Duration::ZERO);
        // Sample suspension independently. An operation waiting for geometry
        // or the next accepted turn must not discard the elapsed time it owes.
        let mut sampler = tokio::task::JoinSet::new();
        sampler.spawn(async move {
            let mut next = tokio::time::interval_at(started + CADENCE, CADENCE);
            next.set_missed_tick_behavior(MissedTickBehavior::Skip);
            let mut previous = started;
            let mut suspended = Duration::ZERO;
            loop {
                next.tick().await;
                let now = Instant::now();
                let gap = now.saturating_duration_since(previous);
                previous = now;
                if gap > SUSPENDED_GAP {
                    suspended += gap;
                }
                if offered.send(suspended).is_err() {
                    return;
                }
            }
        });
        let mut route = tokio::task::JoinSet::new();
        let result = self.run_offers(stop, started, sample, &mut route).await;
        // A deferred route holds the server while it awaits geometry. Join
        // its cancellation before the listener can release the world owner.
        route.shutdown().await;
        sampler.shutdown().await;
        result
    }

    async fn run_offers(
        &self,
        mut stop: watch::Receiver<bool>,
        started: Instant,
        mut sample: watch::Receiver<Duration>,
        route: &mut tokio::task::JoinSet<Result<(), WorldError>>,
    ) -> Result<(), WorldError> {
        let mut previous = started;
        let mut excluded = Duration::ZERO;
        let mut debt = 0.0;
        let mut more = false;
        let mut was_paused = true;
        let mut reset = *self
            .accepted_reset
            .lock()
            .map_err(|_| HostError::Poisoned)?;
        while !*stop.borrow() {
            if more {
                tokio::task::yield_now().await;
            } else {
                tokio::select! {
                    _ = stop.changed() => break,
                    _ = sample.changed() => (),
                }
            }
            let now = Instant::now();
            let elapsed = now.saturating_duration_since(previous);
            let (clock, changed) = match self.clock_with_presence().await {
                Err(WorldError::Storage(StoreError::WriterUnavailable)) => {
                    more = false;
                    continue;
                }
                Err(error) if error.is_admission_refusal() => {
                    more = false;
                    continue;
                }
                other => other?,
            };
            // The checkpoint uses nonwaiting save admission. Deliver its
            // interval after this pass drops the ordinary intake read guard.
            let mut checkpoint = CheckpointInterval {
                checkpoints: &self.checkpoints,
                elapsed: Duration::ZERO,
            };
            let _ordinary = self.saves.enter_ordinary().await;
            let from = previous;
            previous = now;
            let suspended = *sample.borrow_and_update();
            let gap = suspended.saturating_sub(excluded);
            excluded = suspended;
            let latest_reset = *self
                .accepted_reset
                .lock()
                .map_err(|_| HostError::Poisoned)?;
            if clock.paused || changed || latest_reset != reset {
                reset = latest_reset;
                previous = if clock.paused {
                    Instant::now()
                } else {
                    latest_reset
                };
                if clock.paused
                    && !was_paused
                    && let Some(inputs) = &self.inputs
                {
                    inputs.exclude()?;
                }
                was_paused = true;
                openlegend_simulation::profile_count!(RELEASE_DEBT, (debt * 1_000_000.0) as u64);
                debt = 0.0;
                more = false;
                continue;
            }
            was_paused = false;
            if !gap.is_zero() {
                if let Some(inputs) = &self.inputs {
                    inputs.exclude()?;
                }
                openlegend_simulation::profile_count!(RELEASE_DEBT, (debt * 1_000_000.0) as u64);
                debt = 0.0;
            }
            let ratio = clock.speed * self.base_ratio;
            let admitted = elapsed.saturating_sub(gap);
            if let Some(inputs) = &self.inputs {
                let entrance = if gap.is_zero() { from } else { now - admitted };
                inputs.credit(entrance, now, clock.at + debt, ratio)?;
            }
            checkpoint.elapsed = admitted;
            let offered = admitted.as_secs_f64() * ratio;
            debt += offered;
            openlegend_simulation::profile_count!(OFFERED, (offered * 1_000_000.0) as u64);
            more = false;
            if debt < 1e-6 {
                continue;
            }
            while let Some(result) = route.try_join_next() {
                match result.map_err(|_| HostError::WorkerFailed)? {
                    Err(error) if error.is_admission_refusal() => {}
                    other => other?,
                }
            }
            match self.saves.check_admission(now) {
                Err(WorldError::Storage(StoreError::WriterUnavailable)) => continue,
                other => other?,
            }
            let routes = match self.advance(clock, debt.min(MAX_GAME_OFFER)).await {
                Ok(Some(advance)) => {
                    debt = (debt - advance.seconds).max(0.0);
                    more = debt >= 1e-6 && advance.seconds > 0.0 && !advance.navigation_pending;
                    (advance.deferred_routes || advance.navigation_pending)
                        .then_some(advance.navigation_pending)
                }
                Ok(None) => Some(true),
                Err(
                    WorldError::ClockChanged | WorldError::Storage(StoreError::WriterUnavailable),
                ) => None,
                Err(error) if error.is_admission_refusal() => None,
                Err(error) => return Err(error),
            };
            if let Some(include_world) = routes
                && route.is_empty()
            {
                let game = self.game.clone();
                route.spawn(async move { game.complete_route(include_world).await });
            }
        }
        Ok(())
    }
}
