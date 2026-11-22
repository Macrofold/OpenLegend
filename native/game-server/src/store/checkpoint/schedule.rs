//! Running-wall-time recovery points are operational policy. The clock feeds
//! one coalesced opportunity and never waits for storage or file output.

use super::{MetadataKind, capture::CaptureError};
use crate::live_save::LiveSaves;
use crate::store::{MAX_SAFE_INTEGER, Store, StoreError, StoreResult};
use crate::world::WorldError;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{
    Arc, Mutex as ManualLock,
    atomic::{AtomicU64, Ordering},
};
use std::time::Duration;
use tokio::sync::{Mutex, watch};
use uuid::Uuid;

mod operator;
pub(crate) use operator::CreationReceipt;

const RETRY: Duration = Duration::from_secs(30);

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PolicyLimits {
    interval_minutes: Range,
    retain: Range,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(deny_unknown_fields)]
struct Range {
    min: u64,
    max: u64,
}

impl Range {
    fn contains(self, value: u64) -> bool {
        (self.min..=self.max).contains(&value)
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct SchedulePolicy {
    defaults: Settings,
    limits: PolicyLimits,
}

impl SchedulePolicy {
    pub(super) fn valid(&self) -> bool {
        self.limits.interval_minutes.min > 0
            && self.limits.interval_minutes.max <= u64::MAX / 60_000_000_000
            && self.limits.retain.min > 0
            && self.valid_settings(self.defaults)
            && self.defaults.revision == 0
    }

    fn valid_settings(&self, settings: Settings) -> bool {
        self.limits
            .interval_minutes
            .contains(settings.interval_minutes)
            && self.limits.retain.contains(settings.retain as u64)
            && settings.revision <= MAX_SAFE_INTEGER
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Settings {
    enabled: bool,
    interval_minutes: u64,
    retain: usize,
    #[serde(default)]
    revision: u64,
}

impl Settings {
    fn interval(self) -> Duration {
        if self.enabled {
            Duration::from_secs(60 * self.interval_minutes)
        } else {
            Duration::ZERO
        }
    }
}

pub(crate) struct CheckpointSchedule {
    store: Arc<Store>,
    saves: Arc<LiveSaves>,
    world: String,
    directory: PathBuf,
    elapsed: AtomicU64,
    threshold: AtomicU64,
    due: watch::Sender<()>,
    configured: watch::Sender<()>,
    slot: Mutex<()>,
    manual: ManualLock<ManualQueue>,
    undurable_failure: ManualLock<Option<operator::Failure>>,
}

type ManualOutcome = Result<(), Arc<CaptureError>>;

struct ManualRequest {
    id: Uuid,
    label: String,
    outcome: watch::Receiver<Option<ManualOutcome>>,
}

#[derive(Default)]
struct ManualQueue {
    running: Option<ManualRequest>,
    waiting: Option<ManualRequest>,
}

impl CheckpointSchedule {
    pub(crate) fn new(
        store: Arc<Store>,
        saves: Arc<LiveSaves>,
        world: String,
        directory: PathBuf,
    ) -> Self {
        Self {
            store,
            saves,
            world,
            directory,
            elapsed: AtomicU64::new(0),
            threshold: AtomicU64::new(0),
            due: watch::channel(()).0,
            configured: watch::channel(()).0,
            slot: Mutex::new(()),
            manual: ManualLock::new(ManualQueue::default()),
            undurable_failure: ManualLock::new(None),
        }
    }

    /// Feed elapsed real time accepted by the clock's running interval. No
    /// database or file work occurs on this path. A busy interval can retain
    /// one due checkpoint, regardless of how much more time elapses.
    pub(crate) fn advance(&self, elapsed: Duration) {
        let threshold = self.threshold.load(Ordering::Relaxed);
        if threshold == 0 || elapsed.is_zero() {
            return;
        }
        let elapsed = u64::try_from(elapsed.as_nanos()).unwrap_or(u64::MAX);
        let advanced = self
            .elapsed
            .try_update(Ordering::AcqRel, Ordering::Acquire, |prior| {
                (prior < threshold).then(|| prior.saturating_add(elapsed).min(threshold))
            });
        if advanced.is_err()
            || advanced.is_ok_and(|before| before.saturating_add(elapsed) >= threshold)
        {
            self.due.send_replace(());
        }
    }

    /// An authorized manual save can wait behind the file writer. One
    /// waiting user has priority over the coalesced automatic opportunity.
    /// Check the caller again when the exact durable snapshot is established.
    pub(crate) async fn manual_checkpoint(
        self: &Arc<Self>,
        id: Uuid,
        label: String,
        validate: impl Fn() -> Result<(), WorldError> + Send + Sync + 'static,
    ) -> ManualOutcome {
        if label.is_empty() || label.encode_utf16().count() > 80 {
            return Err(Arc::new(StoreError::InvalidRecord.into()));
        }
        validate().map_err(|error| Arc::new(error.into()))?;
        let (mut result, start) = {
            let mut manual = self
                .manual
                .lock()
                .map_err(|_| Arc::new(CaptureError::Format))?;
            if let Some(prior) = manual
                .running
                .as_ref()
                .into_iter()
                .chain(&manual.waiting)
                .find(|request| request.id == id)
            {
                if prior.label != label {
                    return Err(Arc::new(CaptureError::Conflict));
                }
                (prior.outcome.clone(), None)
            } else {
                if manual.waiting.is_some() {
                    return Err(Arc::new(CaptureError::Busy));
                }
                let (done, outcome) = watch::channel(None);
                manual.waiting = Some(ManualRequest {
                    id,
                    label: label.clone(),
                    outcome: outcome.clone(),
                });
                (outcome, Some(done))
            }
        };
        if let Some(done) = start {
            let schedule = self.clone();
            // The admitted operation outlives its HTTP subscribers. The same
            // ID receives the original outcome while it is waiting or running.
            tokio::spawn(async move {
                let slot = schedule.slot.lock().await;
                if let Ok(mut manual) = schedule.manual.lock() {
                    manual.running = manual.waiting.take();
                } else {
                    done.send_replace(Some(Err(Arc::new(CaptureError::Format))));
                    return;
                }
                let result = schedule.capture_manual(id, label, &validate).await;
                if let Err(error) = &result
                    && !matches!(error, CaptureError::Busy | CaptureError::Conflict)
                    && !matches!(error, CaptureError::World(reason)
                        if matches!(reason, WorldError::Access(_)) || reason.is_admission_refusal())
                {
                    schedule
                        .record_failure(MetadataKind::Manual, "Manual checkpoint failed", error)
                        .await;
                }
                done.send_replace(Some(result.map_err(Arc::new)));
                if let Ok(mut manual) = schedule.manual.lock() {
                    manual.running = None;
                }
                drop(slot);
            });
        }
        let completed = result
            .wait_for(Option::is_some)
            .await
            .map_err(|_| Arc::new(CaptureError::Format))?;
        completed
            .as_ref()
            .expect("completed manual checkpoint")
            .clone()
    }

    async fn capture_manual(
        &self,
        id: Uuid,
        label: String,
        validate: impl Fn() -> Result<(), WorldError> + Sync,
    ) -> Result<(), CaptureError> {
        let id = id.to_string();
        let root = self.directory.clone();
        let world = self.world.clone();
        let repeated_id = id.clone();
        let repeated_label = label.clone();
        let store = self.store.clone();
        let repeated = tokio::task::spawn_blocking(move || {
            let _custody = store
                .budget
                .reserve(super::FILE_BUFFER)
                .map_err(|_| StoreError::Capacity)?;
            super::catalog::verify_repeated_manual(
                &root,
                &world,
                &repeated_id,
                &repeated_label,
                &store.schema.checkpoint,
            )
        })
        .await
        .map_err(|_| CaptureError::Format)?;
        match repeated {
            Ok(true) => {
                validate()?;
                self.store
                    .complete_checkpoint_assets(&self.world, &id)
                    .await
                    .map_err(Into::into)
            }
            Ok(false) => self
                .store
                .capture_local_checkpoint(
                    Some(&self.saves),
                    self.directory.clone(),
                    &self.world,
                    id,
                    MetadataKind::Manual,
                    label,
                    validate,
                )
                .await
                .map(|_| ()),
            Err(error) => Err(error),
        }
    }

    pub(crate) async fn run(&self, mut stop: watch::Receiver<bool>) {
        let mut due = self.due.subscribe();
        let mut configured = self.configured.subscribe();
        let mut busy = 0;
        let mut settings_failures = 0;
        let mut settings = self.read_settings(&mut settings_failures).await;
        self.configure(settings.as_ref());
        while !*stop.borrow() {
            tokio::select! {
                biased;
                _ = stop.changed() => break,
                _ = configured.changed() => {
                    settings = self.read_settings(&mut settings_failures).await;
                    self.configure(settings.as_ref());
                    continue;
                }
                _ = due.changed() => (),
            }
            let wait_for = self.threshold.load(Ordering::Acquire);
            if wait_for == 0 || self.elapsed.load(Ordering::Acquire) < wait_for {
                continue;
            }
            if settings.is_err() {
                settings = self.read_settings(&mut settings_failures).await;
                self.configure(settings.as_ref());
                self.elapsed.store(0, Ordering::Release);
                continue;
            }
            // A manual capture marks its wait before entering the FIFO slot.
            // Only a later running clock interval can wake an automatic capture.
            let slot = self.manual.lock().ok().and_then(|manual| {
                if manual.waiting.is_some() {
                    None
                } else {
                    self.slot.try_lock().ok()
                }
            });
            let Some(_slot) = slot else {
                continue;
            };
            if *stop.borrow() {
                break;
            }
            self.elapsed.store(0, Ordering::Release);
            let id = Uuid::new_v4().to_string();
            let result = self
                .store
                .capture_local_checkpoint(
                    Some(&self.saves),
                    self.directory.clone(),
                    &self.world,
                    id,
                    MetadataKind::Auto,
                    "Autosave".to_owned(),
                    || Ok(()),
                )
                .await;
            match result {
                Ok(_) => {
                    busy = 0;
                    if configured.has_changed().unwrap_or(false) {
                        configured.mark_unchanged();
                        settings = self.read_settings(&mut settings_failures).await;
                        self.configure(settings.as_ref());
                    }
                    let Ok(policy) = &settings else { continue };
                    if let Err(error) = self
                        .store
                        .rotate_automatic(self.directory.clone(), &self.world, policy.retain)
                        .await
                    {
                        self.record_failure(
                            MetadataKind::Auto,
                            "Automatic checkpoint rotation failed",
                            &error,
                        )
                        .await;
                    }
                }
                Err(CaptureError::World(error)) if error.is_admission_refusal() => {
                    busy += 1;
                    let retry = wait_for.saturating_sub(RETRY.as_nanos() as u64);
                    self.elapsed.fetch_max(retry, Ordering::AcqRel);
                    if busy == 3 {
                        self.record_failure(
                            MetadataKind::Auto,
                            "Automatic checkpoints are waiting for the server",
                            &error,
                        )
                        .await;
                    }
                }
                Err(error) => {
                    busy = 0;
                    self.record_failure(MetadataKind::Auto, "Automatic checkpoint failed", &error)
                        .await;
                }
            }
            // Intervals during output still accrue, but if play paused before
            // the file finished, an already due capture waits for resume.
            due.mark_unchanged();
        }
        self.threshold.store(0, Ordering::Release);
    }

    fn configure(&self, settings: Result<&Settings, &StoreError>) {
        let interval = match settings {
            Ok(settings) => settings.interval(),
            Err(StoreError::InvalidRecord) => Duration::ZERO,
            Err(_) => RETRY,
        };
        self.threshold
            .store(interval.as_nanos() as u64, Ordering::Release);
        if !interval.is_zero() {
            self.elapsed
                .fetch_min(interval.as_nanos() as u64, Ordering::AcqRel);
        }
    }

    async fn read_settings(&self, failures: &mut u64) -> StoreResult<Settings> {
        let result = self.store.checkpoint_settings(&self.world).await;
        match &result {
            Ok(_) => *failures = 0,
            Err(StoreError::InvalidRecord) => {
                self.record_failure(
                    MetadataKind::Auto,
                    "Automatic checkpoint settings are invalid",
                    &StoreError::InvalidRecord,
                )
                .await;
            }
            Err(error) => {
                *failures += 1;
                if *failures == 3 {
                    self.record_failure(
                        MetadataKind::Auto,
                        "Automatic checkpoint settings could not be read",
                        error,
                    )
                    .await;
                }
            }
        }
        result
    }

    async fn record_failure(
        &self,
        kind: MetadataKind,
        stage: &str,
        error: &impl std::fmt::Display,
    ) {
        let message = format!("{stage}. {error}.");
        let failure = operator::Failure::new(kind, message.clone());
        let saved = self
            .store
            .record_checkpoint_failure(&self.world, &failure)
            .await
            .is_ok();
        if let Ok(mut undurable) = self.undurable_failure.lock() {
            *undurable = (!saved).then(|| failure.undurable());
        }
        if !saved {
            eprintln!("{message}");
        }
    }
}
