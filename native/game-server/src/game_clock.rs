//! Real-time offers belong to the application. Native simulation owns time
//! advancement and its accepted result. A refused candidate consumes no debt.

use crate::{
    boot::CurrentServer,
    live_save::{AcceptedSaveInput, LiveSaves},
    presence::Presence,
    store::{MetadataProjection, StoreError},
    world::{ApplicationStart, ProtectedCommit, WorldError},
    world_input::{InputSnapshot, WorldInputs},
};
use openlegend_simulation::{
    host::FenceError,
    runtime::{NativeWorldSession, RuntimeClock, RuntimeDirectOutput, RuntimeError},
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
    save: Option<Arc<AcceptedSaveInput>>,
}

pub struct GameClock {
    game: Arc<CurrentServer>,
    saves: Arc<LiveSaves>,
    base_ratio: f64,
    presence: Option<Arc<Presence>>,
    inputs: Option<Arc<WorldInputs>>,
}

impl GameClock {
    pub fn new(game: Arc<CurrentServer>, saves: Arc<LiveSaves>, base_ratio: f64) -> Self {
        Self {
            game,
            saves,
            base_ratio,
            presence: None,
            inputs: None,
        }
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
        let provider = self.game.clone();
        let store = self.game.store.clone();
        self.game
            .world
            .execute_protected(
                move |session| {
                    session.begin_control_direct(paused, current.speed, current.manually_paused)
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
                || Ok(()),
                move |projection, prefix| -> ProtectedCommit<'_> {
                    Box::pin(
                        async move { store.commit_prefix(prefix.rows(), &[], projection).await },
                    )
                },
            )
            .await?;
        self.saves.signal_view();
        Ok((RuntimeClock { paused, ..current }, true))
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
            move |session| {
                // Pause/speed can change while this caller waits for the turn.
                let current = session.clock()?;
                if current.paused || current.speed != clock.speed || current.at != clock.at {
                    return Err(WorldError::ClockChanged);
                }
                let values = match (inputs, capture) {
                    (Some(inputs), Some(capture)) => {
                        let mut snapshot = inputs.snapshot(session)?;
                        let values = snapshot.take();
                        *capture.lock().map_err(|_| HostError::Poisoned)? = Some(snapshot);
                        values
                    }
                    _ => Vec::new(),
                };
                Ok(ApplicationStart::Candidate(
                    session.begin_advance_direct(seconds, 4096, values)?,
                ))
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
                let save = if navigation_pending && seconds == 0.0 {
                    None
                } else {
                    Some(prepare.stage(&product, None)?)
                };
                Ok(Advance {
                    seconds,
                    navigation_pending,
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
        tokio::select! {
            result = &mut advance => result,
            _ = tokio::time::sleep(TICK_SLICE) => {
                self.game.world.request_advance_publication();
                advance.await
            }
        }
    }

    /// One loop offers time from a monotonic cursor and yields between
    /// catch-up publications. It must be joined before the save task drains.
    pub async fn run(&self, mut stop: watch::Receiver<bool>) -> Result<(), WorldError> {
        let started = Instant::now();
        let (offered, mut sample) = watch::channel(Duration::ZERO);
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
        let mut previous = started;
        let mut excluded = Duration::ZERO;
        let mut debt = 0.0;
        let mut more = false;
        let mut was_paused = true;
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
                Err(WorldError::Host(HostError::Busy)) => {
                    more = false;
                    continue;
                }
                other => other?,
            };
            let _ordinary = self.saves.enter_ordinary().await;
            let from = previous;
            previous = now;
            let suspended = *sample.borrow_and_update();
            let gap = suspended.saturating_sub(excluded);
            excluded = suspended;
            if clock.paused || changed {
                previous = Instant::now();
                if !was_paused && let Some(inputs) = &self.inputs {
                    inputs.exclude()?;
                }
                was_paused = true;
                debt = 0.0;
                more = false;
                continue;
            }
            was_paused = false;
            if !gap.is_zero() {
                if let Some(inputs) = &self.inputs {
                    inputs.exclude()?;
                }
                debt = 0.0;
            }
            let ratio = clock.speed * self.base_ratio;
            let admitted = elapsed.saturating_sub(gap);
            if let Some(inputs) = &self.inputs {
                let entrance = if gap.is_zero() { from } else { now - admitted };
                inputs.credit(entrance, now, clock.at + debt, ratio)?;
            }
            debt += admitted.as_secs_f64() * ratio;
            more = false;
            if debt < 1e-6 {
                continue;
            }
            match self.saves.check_admission(now) {
                Err(WorldError::Storage(StoreError::WriterUnavailable)) => continue,
                other => other?,
            }
            match self.advance(clock, debt.min(MAX_GAME_OFFER)).await {
                Ok(Some(advance)) => {
                    debt = (debt - advance.seconds).max(0.0);
                    more = debt >= 1e-6 && advance.seconds > 0.0 && !advance.navigation_pending;
                }
                Ok(None)
                | Err(WorldError::ClockChanged)
                | Err(WorldError::Host(HostError::Busy))
                | Err(WorldError::Fence(FenceError::Busy)) => (),
                Err(error) => return Err(error),
            }
        }
        Ok(())
    }
}
