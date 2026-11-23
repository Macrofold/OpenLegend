//! Real-time offers belong to the application. Native simulation owns time
//! advancement and its accepted result. A refused candidate consumes no debt.

use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability, bootstrap::ConfiguredAccounts},
    boot::CurrentServer,
    command_epoch::RequestIdentity,
    live_save::{AcceptedSaveInput, LiveSaves, ProtectedGameplaySave},
    npc::schedule::ScheduleWake,
    operator_maintenance::{OperatorMaintenance, Snapshot, Window},
    presence::Presence,
    store::{
        CommitError, MetadataProjection, StoreError, checkpoint::CheckpointSchedule,
        construction_gather::MaterialGatherProjection,
    },
    world::{ApplicationStart, IO_YIELD, ProtectedCommit, WorldError},
    world_input::{InputSnapshot, TimedReviewUpdates, WorldInputs},
};
use openlegend_simulation::{
    construction_gather::{ConstructionEffect, MaterialGrants},
    host::ByteReservation,
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
    deferred_routes: bool,
    save: Option<Arc<AcceptedSaveInput>>,
    timed_reviews: Option<TimedReviewUpdates>,
}

struct ProtectedAdvance {
    advance: Advance,
    save: ProtectedGameplaySave,
    acquisitions: Vec<Arc<ConstructionEffect>>,
    wake: Option<ScheduleWake>,
    _custody: ByteReservation,
}

fn begin_current_offer(
    session: &mut NativeWorldSession,
    clock: RuntimeClock,
    seconds: f64,
    inputs: Option<Arc<WorldInputs>>,
    capture: Option<Arc<Mutex<Option<InputSnapshot>>>>,
    materials: Option<Arc<MaterialGrants>>,
) -> Result<openlegend_simulation::host::CandidateKey, RuntimeError> {
    let current = session.clock()?;
    if current.paused || current.speed != clock.speed || current.at != clock.at {
        return Err(RuntimeError::application_busy("The accepted clock changed before the elapsed offer"));
    }
    match (inputs, capture) {
        (Some(inputs), Some(capture)) => {
            let mut held = capture.lock().map_err(|_| RuntimeError::application_refused(HostError::Poisoned))?;
            let mut snapshot = inputs.snapshot(session).map_err(|error| match error {
                AccessError::Busy | AccessError::Changed => RuntimeError::application_busy(error),
                error => RuntimeError::application_refused(error),
            })?;
            let values = snapshot.take();
            // No movement window is accepted with a rolled back offer.
            let key = session.begin_authoritative_advance(seconds, 4096, values, materials)?;
            *held = Some(snapshot);
            Ok(key)
        }
        _ => session.begin_authoritative_advance(seconds, 4096, Vec::new(), materials),
    }
}

fn stage_release_reviews(
    product: &openlegend_simulation::runtime::RuntimePreparedProducts<'_>,
    inputs: Option<&WorldInputs>,
    snapshot: Option<&Mutex<Option<InputSnapshot>>>,
    budget: &openlegend_simulation::host::ByteBudget,
) -> Result<Option<TimedReviewUpdates>, RuntimeError> {
    let offers = product.timed_release_reviews();
    if offers.is_empty() {
        return Ok(None);
    }
    let missing = || RuntimeError::application_refused("Native release review has no live input.");
    let input = inputs.ok_or_else(missing)?;
    let snapshot = snapshot.ok_or_else(missing)?.lock()
        .map_err(RuntimeError::application_refused)?;
    let snapshot = snapshot.as_ref().ok_or_else(missing)?;
    input.stage_timed_reviews(snapshot, offers, budget).map(Some)
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
    exit_grace: Duration,
    inputs: Option<Arc<WorldInputs>>,
    started: Instant,
    accepted_reset: Arc<Mutex<Instant>>,
    maintenance: Arc<OperatorMaintenance>,
    identity: Arc<tokio::sync::Mutex<RequestIdentity>>,
}

impl GameClock {
    pub(crate) fn new(
        game: Arc<CurrentServer>,
        saves: Arc<LiveSaves>,
        checkpoints: Arc<CheckpointSchedule>,
        base_ratio: f64,
        identity: Arc<tokio::sync::Mutex<RequestIdentity>>,
    ) -> Self {
        let started = Instant::now();
        Self {
            game,
            saves,
            checkpoints,
            base_ratio,
            presence: None,
            exit_grace: Duration::ZERO,
            inputs: None,
            started,
            accepted_reset: Arc::new(Mutex::new(started)),
            maintenance: Arc::new(OperatorMaintenance::default()),
            identity,
        }
    }

    pub(crate) fn game(&self) -> &CurrentServer {
        &self.game
    }
    pub(crate) fn maintenance(&self) -> &Arc<OperatorMaintenance> {
        &self.maintenance
    }
    pub(crate) fn uptime(&self) -> Duration {
        self.started.elapsed()
    }
    pub(crate) fn saving_failed(&self) -> bool {
        self.saves.has_failed()
    }
    pub(crate) fn fail_maintenance(&self, error: WorldError) {
        self.saves.latch_fault(error);
    }

    pub(crate) async fn set_maintenance(
        &self,
        snapshot: Arc<Snapshot>,
        edit: Option<(Arc<Window>, Option<u64>)>,
        operator: Option<(Arc<Authority>, Arc<AuthorizedScope>)>,
    ) -> Result<(), WorldError> {
        let _protected = self.saves.enter_protected().await?;
        let previous = self.game.world.capture(NativeWorldSession::clock).await?;
        let transition = previous.maintenance != snapshot.active;
        let paused = if transition {
            let visible = self
                .presence
                .as_ref()
                .map_or(Ok(true), |presence| presence.visible())?;
            snapshot.active || previous.manually_paused || !(visible || previous.exit_exposure_active)
        } else {
            previous.paused
        };
        let mut identity = if transition {
            Some((
                self.identity.clone().lock_owned().await,
                Arc::new(Mutex::new(None)),
            ))
        } else {
            None
        };
        let staged_epoch = identity.as_ref().map(|(_, epoch)| epoch.clone());
        let active = snapshot.active;
        let revision = snapshot.revision;
        let provider = self.game.clone();
        let store = self.game.store.clone();
        let budget = self.game.host.budget().clone();
        let persisted_operator = operator.as_ref().map(|(_, scope)| scope.clone());
        let clock = self.accepted_reset.clone();
        let inputs = self.inputs.clone();
        let saves = self.saves.clone();
        let maintenance = self.maintenance.clone();
        let world = self.game.world.clone();
        self.game
            .world
            .execute_protected_then(
                move |session| {
                    session.begin_operator_maintenance(
                        paused,
                        previous.speed,
                        previous.manually_paused,
                        active,
                        revision,
                    )
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
                move || {
                    if let Some((authority, scope)) = operator {
                        authority.current(&scope, Capability::Create, false, |_, _| ())?;
                    }
                    Ok(())
                },
                move |metadata, prefix| -> ProtectedCommit<'_> {
                    Box::pin(async move {
                        store
                            .commit_prefix(
                                prefix.rows(),
                                &[],
                                &crate::store::operator_maintenance::MaintenanceProjection {
                                    metadata,
                                    edit,
                                    operator: persisted_operator,
                                    budget,
                                    staged_epoch,
                                },
                            )
                            .await
                    })
                },
                move |_| {
                    if let Some((identity, epoch)) = identity.as_mut() {
                        identity.epoch = epoch
                            .lock()
                            .map_err(|_| HostError::Poisoned)?
                            .take()
                            .ok_or(StoreError::StaleCut)?;
                        *clock.lock().map_err(|_| HostError::Poisoned)? = Instant::now();
                        if let Some(inputs) = inputs {
                            inputs.exclude()?;
                        }
                        if !paused {
                            saves.resume_semantic_index();
                        }
                    }
                    world.publish_decision_clock(paused);
                    maintenance.publish(snapshot);
                    saves.signal_view();
                    Ok(())
                },
            )
            .await?;
        Ok(())
    }

    /// A visibility transition has the same acknowledgement boundary as the
    /// saved clock change it requested. Ordinary heartbeat renewal has no
    /// reason to invoke this owner.
    pub(crate) async fn presence_changed(&self) -> Result<(), WorldError> {
        self.clock_with_presence().await.map(|_| ())
    }

    pub(crate) fn with_inputs(
        mut self,
        presence: Arc<Presence>,
        inputs: Arc<WorldInputs>,
        exit_grace: Duration,
    ) -> Self {
        self.presence = Some(presence);
        self.exit_grace = exit_grace;
        self.inputs = Some(inputs);
        self
    }

    async fn clock_with_presence(&self) -> Result<(RuntimeClock, bool), WorldError> {
        if let Some(presence) = &self.presence {
            crate::embodiment::reconcile(&self.game, &self.saves, presence, self.exit_grace)
                .await?;
        }
        let current = self.game.world.capture(NativeWorldSession::clock).await?;
        let Some(presence) = &self.presence else {
            return Ok((current, false));
        };
        if !current.manually_paused && presence.restored_due()? && presence.visible()? {
            crate::embodiment::reconcile_restored(
                &self.game, &self.saves, presence, self.exit_grace,
            ).await?;
        }
        let should_pause = |clock: RuntimeClock| {
            Ok::<_, WorldError>(
                clock.maintenance
                    || clock.manually_paused
                    || !(presence.visible()? || clock.exit_exposure_active),
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
        self.set_manual_pause(setting, false, move || {
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
        self.set_manual_pause(Some(true), true, move || {
            Ok(authority.current(&scope, Capability::Save, false, |_, _| ())?)
        })
        .await?;
        Ok(())
    }

    async fn set_manual_pause(
        &self,
        setting: Option<bool>,
        recovery: bool,
        validate: impl Fn() -> Result<(), WorldError> + Send + 'static,
    ) -> Result<bool, WorldError> {
        validate()?;
        let _protected = self.saves.enter_protected().await?;
        let previous = self.game.world.capture(NativeWorldSession::clock).await?;
        if previous.maintenance && !recovery {
            return Err(WorldError::OperatorMaintenance);
        }
        let visible = match &self.presence {
            Some(presence) => presence.visible()?,
            None => true,
        };
        if setting == Some(false) && !visible {
            return Ok(false);
        }
        let manual = setting.unwrap_or(previous.manually_paused);
        let paused = previous.maintenance || manual || !(visible || previous.exit_exposure_active);
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
        let world = self.game.world.clone();
        self.game
            .world
            .execute_protected_then(
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
                move |_| {
                    world.publish_decision_clock(next.paused);
                    Ok(())
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

    /// Reconcile the loaded hot state before accepting connections. When the
    /// operator configured new account access, save it with the body ownership
    /// before admission. Ordinary cold startup uses the background save queue.
    pub(crate) async fn initialize(
        &self,
        configured: Option<Arc<ConfiguredAccounts>>,
    ) -> Result<(), WorldError> {
        if let Some(presence) = &self.presence
            && !self.game.world.capture(NativeWorldSession::has_simulated_departure).await?
        {
            presence.enable_elapsed_exit()?;
        }
        let game = self.game.clone();
        let accept = self.saves.clone();
        let materials = if self.game.world.capture(NativeWorldSession::has_bound_material_gather).await? {
            Some(self.game.store.construction_materials(self.game.world_id(), None).await?)
        } else {
            None
        };
        let answer = move |question| {
            let game = game.clone();
            async move { game.answer_operation(question).await }
        };
        if let Some(accounts) = configured {
            let bindings = accounts.clone();
            let store = self.game.store.clone();
            let staging_store = store.clone();
            let language = self.game.language().cloned();
            self.game
                .world
                .execute_protected_then(
                    move |session| session.begin_configured_startup(materials, &bindings.owners),
                    answer,
                    move |output, budget| {
                        let RuntimeDirectOutput::Prepared(value) = output else {
                            unreachable!("startup cannot preview")
                        };
                        if !value.outcome().ok {
                            return Err(RuntimeError::application_refused(&value.outcome().code));
                        }
                        ProtectedGameplaySave::prepare(&value, &staging_store, budget)
                    },
                    || Ok(()),
                    move |save, prefix| -> ProtectedCommit<'_> {
                        Box::pin(async move {
                            let projection = accounts.projection(save, &store, language.as_deref());
                            let acknowledgement = store.commit_save(prefix, &[], &projection).await?;
                            save.record_commit(&projection.gameplay);
                            Ok(acknowledgement)
                        })
                    },
                    move |save| {
                        save.acknowledged(&accept);
                        Ok(())
                    },
                )
                .await?;
        } else {
            let prepare = self.saves.clone();
            self.game
                .world
                .execute_and_publish(
                    #[cfg(feature = "profile-campaign")]
                    openlegend_simulation::profile::sites::TURN_CLOCK,
                    move |session| Ok(ApplicationStart::Candidate(session.begin_startup_with_materials(materials)?)),
                    answer,
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
        }
        if let Some(presence) = &self.presence {
            crate::embodiment::reconcile_startup(
                &self.game,
                &self.saves,
                presence,
                self.exit_grace,
            )
            .await?;
        }
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
                let review_inputs = inputs.clone();
                let review_snapshots = settlement.clone();
                let publish_inputs = inputs.clone();
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
                                let key = session.begin_authoritative_advance(seconds, 4096, values, None)?;
                                *held = Some(snapshot);
                                key
                            }
                            _ => session.begin_authoritative_advance(seconds, 4096, Vec::new(), None)?,
                        };
                        Ok(ApplicationStart::Candidate(key))
                    },
                    move |question| {
                        let game = game.clone();
                        async move { game.answer_operation(question).await }
                    },
                    move |output, budget| {
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
                            timed_reviews: stage_release_reviews(
                                &product, review_inputs.as_deref(), review_snapshots.as_deref(), budget,
                            )?,
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
                        if let Some((inputs, reviews)) = publish_inputs.as_ref().zip(staged.timed_reviews.as_ref()) {
                            inputs.publish_timed_reviews(reviews);
                        }
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

    async fn advance_with_materials(
        &self,
        clock: RuntimeClock,
        seconds: f64,
    ) -> Result<Option<Advance>, WorldError> {
        // The ordinary candidate already rolled back before we wait here.
        // No earlier accepted time or input is lost when this attempt refuses.
        let _protected = self.saves.enter_protected().await?;
        let materials = self.game.store.construction_materials(self.game.world_id(), None).await?;
        let game = self.game.clone();
        let store = self.game.store.clone();
        let language = self.game.language().cloned();
        let staging_store = store.clone();
        let staging_saves = self.saves.clone();
        let inputs = self.inputs.clone();
        let settlement = inputs.as_ref().map(|_| Arc::new(Mutex::new(None::<InputSnapshot>)));
        let capture = settlement.clone();
        let recheck = inputs.clone();
        let review_inputs = inputs.clone();
        let review_snapshots = settlement.clone();
        let publish_inputs = inputs.clone();
        let result = self.game.world.execute_protected_then(
            move |session| begin_current_offer(session, clock, seconds, inputs, capture, Some(materials)),
            move |question| {
                let game = game.clone();
                async move { game.answer_operation(question).await }
            },
            move |output, budget| {
                let RuntimeDirectOutput::Prepared(product) = output else {
                    unreachable!("advance cannot preview")
                };
                let result = product.outcome();
                if !result.ok {
                    return Err(RuntimeError::application_refused(&result.code));
                }
                let bytes = product.material_acquisitions().len()
                    .checked_mul(std::mem::size_of::<Arc<ConstructionEffect>>())
                    .ok_or(openlegend_simulation::host::CapacityError)?;
                let custody = budget.reserve(bytes)?;
                Ok(ProtectedAdvance {
                    advance: Advance {
                        seconds: product.progress().at - clock.at,
                        navigation_pending: result.code == "navigation-pending",
                        deferred_routes: product.has_deferred_navigation(),
                        save: None,
                        timed_reviews: stage_release_reviews(
                            &product, review_inputs.as_deref(), review_snapshots.as_deref(), budget,
                        )?,
                    },
                    save: ProtectedGameplaySave::prepare(&product, &staging_store, budget)?,
                    acquisitions: product.material_acquisitions().to_vec(),
                    wake: staging_saves.stage_schedule(&product)?,
                    _custody: custody,
                })
            },
            move || {
                if let (Some(inputs), Some(settlement)) = (recheck, settlement) {
                    let held = settlement.lock().map_err(|_| HostError::Poisoned)?;
                    let snapshot = held.as_ref().ok_or(HostError::Poisoned)?;
                    inputs.accept_inputs(snapshot, || ())?;
                }
                Ok(())
            },
            move |candidate, prefix| -> ProtectedCommit<'_> {
                Box::pin(async move {
                    let projection = MaterialGatherProjection {
                        store: &store,
                        gameplay: candidate.save.projection(&store, language.as_deref()),
                        acquisitions: &candidate.acquisitions,
                    };
                    let acknowledgement = store.commit_save(prefix, &[], &projection).await?;
                    candidate.save.record_commit(&projection.gameplay);
                    Ok(acknowledgement)
                })
            },
            move |candidate| {
                if let Some((inputs, reviews)) = publish_inputs.as_ref().zip(candidate.advance.timed_reviews.as_ref()) {
                    inputs.publish_timed_reviews(reviews);
                }
                Ok(())
            },
        ).await;
        match result {
            Ok(Some(candidate)) => {
                self.saves.accept_schedule(candidate.wake.as_ref());
                candidate.save.acknowledged(&self.saves);
                Ok(Some(candidate.advance))
            }
            Err(WorldError::Access(AccessError::Changed)
                | WorldError::Commit(CommitError::RolledBack(StoreError::StaleCut))) => {
                Err(WorldError::ClockChanged)
            }
            Ok(None) => Ok(None),
            Err(error) => Err(error),
        }
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
                Err(WorldError::Storage(StoreError::WriterUnavailable)
                    | WorldError::Access(AccessError::Busy | AccessError::Changed)
                    | WorldError::Commit(CommitError::RolledBack(StoreError::StaleCut | StoreError::Timeout | StoreError::Capacity))) => {
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
            let offer = debt.min(MAX_GAME_OFFER);
            let result = self.advance(clock, offer).await;
            drop(_ordinary);
            let result = match result {
                Err(WorldError::Simulation(error)) if error.construction_gather_needs_authority() => {
                    match self.advance_with_materials(clock, offer).await {
                        Err(WorldError::Storage(StoreError::Capacity)
                            | WorldError::Commit(CommitError::RolledBack(StoreError::Capacity))) => {
                            Err(HostError::Capacity.into())
                        }
                        result => result,
                    }
                }
                result => result,
            };
            let routes = match result {
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
