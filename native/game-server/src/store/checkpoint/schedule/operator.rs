//! The checkpoint panel consumes only file summaries and operational policy.
//! No gameplay rows or checkpoint contents go to an HTTP response.

use super::{CheckpointSchedule, Settings, Uuid};
use crate::store::{
    CommitError, Store, StoreError, StoreResult,
    checkpoint::{CaptureError, CheckpointCursor, MetadataKind, catalog},
};
use crate::world::WorldError;
use openlegend_simulation::host::ByteReservation;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::GenericClient;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CheckpointListing {
    ok: bool,
    saves: Vec<catalog::CheckpointSummary>,
    autosaves: CheckpointStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<CheckpointCursor>,
    #[serde(skip)]
    _custody: ByteReservation,
}

impl CheckpointListing {
    pub(crate) fn autosaves(&self) -> &CheckpointStatus {
        &self.autosaves
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CheckpointStatus {
    saving: bool,
    pending_manual: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    failure: Option<Failure>,
    unavailable_saves: usize,
    storage_bytes: u64,
    settings: Settings,
    #[serde(skip_serializing_if = "Option::is_none")]
    settings_error: Option<&'static str>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Failure {
    id: Uuid,
    at: String,
    kind: MetadataKind,
    message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    acknowledged_at: Option<String>,
}

const DAMAGED_FAILURE: Uuid = Uuid::from_u128(0x00000000_0000_4000_8000_00000000dead);

impl Failure {
    pub(super) fn new(kind: MetadataKind, message: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            at: now(),
            kind,
            message: message.chars().take(500).collect(),
            acknowledged_at: None,
        }
    }

    fn valid(&self) -> bool {
        !self.message.is_empty()
            && self.message.encode_utf16().count() <= 500
            && chrono::DateTime::parse_from_rfc3339(&self.at).is_ok()
            && self
                .acknowledged_at
                .as_ref()
                .is_none_or(|at| chrono::DateTime::parse_from_rfc3339(at).is_ok())
    }

    pub(super) fn undurable(mut self) -> Self {
        self.message = format!(
            "{} (This failure could not be saved and will disappear on restart.)",
            self.message
        )
        .chars()
        .take(500)
        .collect();
        self
    }

    fn damaged() -> Self {
        Self {
            id: DAMAGED_FAILURE,
            at: "1970-01-01T00:00:00.000Z".to_owned(),
            kind: MetadataKind::Auto,
            message: "The stored checkpoint failure record is unreadable. Acknowledge to clear it."
                .to_owned(),
            acknowledged_at: None,
        }
    }
}

impl CheckpointSchedule {
    /// Read only one page of checkpoint summaries, with independent custody
    /// through HTTP serialization. No payload is opened for content hashing.
    pub(crate) async fn catalog(
        &self,
        before: Option<CheckpointCursor>,
    ) -> Result<CheckpointListing, CaptureError> {
        let store = self.store.clone();
        let world = self.world.clone();
        let root = self.directory.clone();
        let (mut catalog, custody) = tokio::task::spawn_blocking(move || {
            let custody = store
                .budget
                .reserve(catalog::LIST_WORKSPACE)
                .map_err(|_| StoreError::Capacity)?;
            Ok::<_, CaptureError>((
                catalog::list(&root, &world, before.as_ref(), &store.schema.checkpoint)?,
                custody,
            ))
        })
        .await
        .map_err(|_| CaptureError::Format)??;
        let pending_manual = self
            .manual
            .lock()
            .map_err(|_| CaptureError::Format)?
            .waiting
            .is_some();
        let (settings, settings_error) = match self.store.checkpoint_settings(&self.world).await {
            Ok(settings) => (settings, None),
            Err(StoreError::InvalidRecord) => (
                self.store.schema.checkpoint.schedule.defaults,
                Some("Stored autosave settings are invalid; save them again."),
            ),
            Err(error) => return Err(error.into()),
        };
        let undurable = self
            .undurable_failure
            .lock()
            .map_err(|_| CaptureError::Format)?
            .clone();
        let failure = match undurable {
            Some(failure) => Some(failure),
            None => self.store.checkpoint_failure(&self.world).await?,
        };
        let status = CheckpointStatus {
            saving: self.slot.try_lock().is_err(),
            pending_manual,
            last_completed_at: catalog.last_automatic.take(),
            failure: failure.filter(|failure| failure.acknowledged_at.is_none()),
            unavailable_saves: catalog.unavailable,
            storage_bytes: catalog.bytes,
            settings,
            settings_error,
        };
        Ok(CheckpointListing {
            ok: true,
            saves: catalog.saves,
            autosaves: status,
            next: catalog.next,
            _custody: custody,
        })
    }

    /// A delete joins an already running publication and competes for the
    /// same slot. A waiting create keeps its place and refuses this deletion.
    pub(crate) async fn delete(
        self: &Arc<Self>,
        id: Uuid,
        authorize: impl Fn() -> Result<(), WorldError> + Send + Sync + 'static,
    ) -> Result<(), CaptureError> {
        authorize()?;
        self.refuse_waiting_delete(id)?;
        let schedule = Arc::clone(self);
        tokio::spawn(async move {
            let _slot = schedule.slot.lock().await;
            schedule.refuse_waiting_delete(id)?;
            let id = id.to_string();
            let world = schedule.world.clone();
            let root = schedule.directory.clone();
            let remove = id.clone();
            let authorize = Arc::new(authorize);
            let check = authorize.clone();
            tokio::task::spawn_blocking(move || {
                catalog::delete(&root, &world, &remove, || check())
            })
            .await
            .map_err(|_| CaptureError::Format)??;
            let result = schedule
                .store
                .release_checkpoint_assets(&schedule.world, &id, false)
                .await;
            drop(authorize);
            result.map_err(Into::into)
        })
        .await
        .map_err(|_| CaptureError::Format)?
    }

    fn refuse_waiting_delete(&self, id: Uuid) -> Result<(), CaptureError> {
        let queue = self.manual.lock().map_err(|_| CaptureError::Format)?;
        if queue
            .waiting
            .as_ref()
            .is_some_and(|request| request.id == id)
        {
            return Err(CaptureError::Busy);
        }
        Ok(())
    }

    pub(crate) async fn update_settings(
        self: &Arc<Self>,
        mut requested: Settings,
        authorize: impl Fn() -> Result<(), WorldError> + Send + Sync + 'static,
    ) -> Result<(), CaptureError> {
        authorize()?;
        let schedule = self.clone();
        tokio::spawn(async move {
            let store = schedule.store.clone();
            let policy = &store.schema.checkpoint.schedule;
            if !policy.valid_settings(requested) {
                return Err(StoreError::InvalidRecord.into());
            }
            let key = format!("checkpoint:settings:{}", schedule.world);
            let default = policy.defaults;
            let limits = policy.limits;
            let authorize = Arc::new(authorize);
            let check = authorize.clone();
            let result = store
                .operational(move |tx| {
                    Box::pin(async move {
                        let policy = super::SchedulePolicy {
                            defaults: default,
                            limits,
                        };
                        let current = read_settings(tx, &key, &policy).await;
                        match current {
                            Ok(current) if current.revision != requested.revision => {
                                return Err(StoreError::StaleCut);
                            }
                            Err(StoreError::InvalidRecord) | Ok(_) => (),
                            Err(error) => return Err(error),
                        }
                        requested.revision = requested
                            .revision
                            .checked_add(1)
                            .filter(|value| *value <= crate::store::MAX_SAFE_INTEGER)
                            .ok_or(StoreError::InvalidRecord)?;
                        let value = serde_json::to_string(&requested)
                            .map_err(|_| StoreError::InvalidRecord)?;
                        check().map_err(|_| StoreError::StaleCut)?;
                        put(tx, &key, &value).await
                    })
                })
                .await
                .map_err(write_refusal);
            drop(authorize);
            result?;
            schedule.configured.send_replace(());
            Ok(())
        })
        .await
        .map_err(|_| CaptureError::Format)?
    }

    pub(crate) async fn acknowledge(
        self: &Arc<Self>,
        id: Uuid,
        authorize: impl Fn() -> Result<(), WorldError> + Send + Sync + 'static,
    ) -> Result<bool, CaptureError> {
        authorize()?;
        let schedule = self.clone();
        tokio::spawn(async move {
            let key = format!("checkpoint:failure:{}", schedule.world);
            let authorize = Arc::new(authorize);
            let check = authorize.clone();
            let result = schedule
                .store
                .operational(move |tx| {
                    Box::pin(async move {
                        let current = read_failure(tx, &key).await?;
                        let Some(mut failure) = current.filter(|failure| {
                            failure.id == id && failure.acknowledged_at.is_none()
                        }) else {
                            return Ok(false);
                        };
                        check().map_err(|_| StoreError::StaleCut)?;
                        if id == DAMAGED_FAILURE {
                            tx.execute("DELETE FROM meta WHERE key=$1", &[&key]).await?;
                        } else {
                            failure.acknowledged_at = Some(now());
                            let payload = serde_json::to_string(&failure)
                                .map_err(|_| StoreError::InvalidRecord)?;
                            put(tx, &key, &payload).await?;
                        }
                        Ok(true)
                    })
                })
                .await
                .map_err(write_refusal);
            let was_undurable = if result.is_ok() {
                authorize()?;
                let mut failure = schedule
                    .undurable_failure
                    .lock()
                    .map_err(|_| CaptureError::Format)?;
                if failure.as_ref().is_some_and(|failure| failure.id == id) {
                    *failure = None;
                    true
                } else {
                    false
                }
            } else {
                false
            };
            drop(authorize);
            result.map(|acknowledged| acknowledged || was_undurable)
        })
        .await
        .map_err(|_| CaptureError::Format)?
    }
}

impl Store {
    pub(super) async fn checkpoint_settings(&self, world: &str) -> StoreResult<Settings> {
        let reader = self.reader.lock().await;
        let key = format!("checkpoint:settings:{world}");
        read_settings(&reader.client, &key, &self.schema.checkpoint.schedule).await
    }

    async fn checkpoint_failure(&self, world: &str) -> StoreResult<Option<Failure>> {
        let reader = self.reader.lock().await;
        read_failure(&reader.client, &format!("checkpoint:failure:{world}")).await
    }

    pub(super) async fn record_checkpoint_failure(
        &self,
        world: &str,
        failure: &Failure,
    ) -> StoreResult<()> {
        let key = format!("checkpoint:failure:{world}");
        let value = serde_json::to_string(failure).map_err(|_| StoreError::InvalidRecord)?;
        let writer = self.writer.lock().await;
        self.assert_write_admission()?;
        put(&writer.client, &key, &value).await
    }
}

async fn read_settings(
    db: &impl GenericClient,
    key: &str,
    policy: &super::SchedulePolicy,
) -> StoreResult<Settings> {
    let Some(row) = db.query_opt(
        "SELECT CASE WHEN octet_length(value)<=1024 THEN value ELSE '' END FROM meta WHERE key=$1",
        &[&key],
    ).await? else { return Ok(policy.defaults) };
    let value: &str = row.try_get(0)?;
    let settings: Settings = serde_json::from_str(value).map_err(|_| StoreError::InvalidRecord)?;
    if settings.revision > 0 && policy.valid_settings(settings) {
        Ok(settings)
    } else {
        Err(StoreError::InvalidRecord)
    }
}

async fn read_failure(db: &impl GenericClient, key: &str) -> StoreResult<Option<Failure>> {
    let row = db.query_opt(
        "SELECT CASE WHEN octet_length(value)<=4096 THEN value ELSE '' END FROM meta WHERE key=$1",
        &[&key],
    ).await?;
    row.map(|row| {
        let value: &str = row.try_get(0)?;
        Ok(serde_json::from_str::<Failure>(value)
            .ok()
            .filter(Failure::valid)
            .unwrap_or_else(Failure::damaged))
    })
    .transpose()
}

async fn put(db: &impl GenericClient, key: &str, value: &str) -> StoreResult<()> {
    db.execute(
        "INSERT INTO meta VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        &[&key, &value],
    )
    .await?;
    Ok(())
}

fn write_refusal(error: CommitError) -> CaptureError {
    match error {
        CommitError::RolledBack(StoreError::StaleCut) => CaptureError::Conflict,
        other => CaptureError::World(WorldError::Commit(other)),
    }
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}
