//! Durable app-owned bookkeeping for one resident's remote Worktree. Accepted
//! mind files, obligations and interpretations remain native world records.

use super::{
    CommitError, Store, StoreError, StoreResult, durable_head, read::admitted_query,
    recall::source_kind,
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    experience::PersonalSourceRef,
    host::ByteReservation,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub(crate) struct ReflectionScope {
    pub world: String,
    pub generation: String,
    pub actor: String,
    pub attempt: String,
    workspace_key: String,
    _custody: ByteReservation,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct WorkspaceBinding {
    pub workspace: String,
    pub worktree: String,
    pub pending_file_operation: Option<PendingFileOperation>,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "state", deny_unknown_fields)]
pub(crate) enum PendingFileOperation {
    Starting,
    Accepted { id: String },
}

pub(crate) struct ReadWorkspaceBinding {
    pub current: Option<WorkspaceBinding>,
    _custody: ByteReservation,
}

pub(crate) enum ReflectionDue {
    Ready(Option<ReflectionCue>),
    NoEvidence,
    AlreadyAttempted,
}

/// One coalesced opportunity contains only an actor's exact source revision.
/// A later source read provides the permitted words and binds disclosure.
pub(crate) struct ReflectionCue {
    pub source: PersonalSourceRef,
    stored: String,
    _custody: ByteReservation,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct StoredCue {
    generation: String,
    source: PersonalSourceRef,
}

fn cue_key(world: &str, actor: &str) -> StoreResult<String> {
    let scope = json_record(&[world, actor]).map_err(|_| StoreError::InvalidRecord)?;
    // Stopped and live recovery both clear this world's reflection queue.
    Ok(format!("integration:reflection-queue:{world}:{scope}"))
}

/// Store the latest distinct cue in this actor's single durable queue entry.
pub(super) async fn queue_cue(
    tx: &tokio_postgres::Transaction<'_>,
    world: &str,
    generation: &str,
    actor: &str,
    source: PersonalSourceRef,
) -> StoreResult<bool> {
    let key = cue_key(world, actor)?;
    let value = json_record(&StoredCue {
        generation: generation.to_owned(),
        source,
    })
    .map_err(|_| StoreError::InvalidRecord)?;
    Ok(tx.execute(
        "INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE meta.value IS DISTINCT FROM excluded.value",
        &[&key, &value],
    ).await? == 1)
}

async fn cue_eligible(
    tx: &tokio_postgres::Transaction<'_>,
    world: &str,
    actor: &str,
    source: &PersonalSourceRef,
) -> StoreResult<bool> {
    Ok(tx.query_opt(
        "SELECT 1 FROM recall_sources WHERE world_id=$1 AND actor_id=$2 AND source_kind=$3 AND id=$4 AND revision=$5 AND eligible=1",
        &[&world, &actor, &source_kind(source.kind), &source.id, &source.revision],
    ).await?.is_some())
}

impl ReflectionScope {
    pub(crate) fn new(
        store: &Store,
        world: String,
        generation: String,
        actor: String,
        day: u64,
        destination: &str,
    ) -> StoreResult<Self> {
        let bytes = world.len() + generation.len() + actor.len() + destination.len();
        let mut custody = store
            .budget
            .reserve(2048 + bytes * 8)
            .map_err(|_| StoreError::Capacity)?;
        let digest = |parts: &[&str]| -> StoreResult<String> {
            Ok(sha256_hex(
                json_record(parts)
                    .map_err(|_| StoreError::InvalidRecord)?
                    .as_bytes(),
            ))
        };
        // Reopening an earlier checkpoint cannot buy this actor's same day
        // again. The accepted world generation still fences every disclosure.
        let attempt = format!(
            "reflection:{}",
            digest(&[&world, &actor, &day.to_string()])?
        );
        let workspace_key = format!(
            "integration:reflection-worktree:{}",
            digest(&[&world, &actor, destination])?
        );
        custody
            .resize(
                512 + world.capacity()
                    + generation.capacity()
                    + actor.capacity()
                    + attempt.capacity()
                    + workspace_key.capacity(),
            )
            .map_err(|_| StoreError::Capacity)?;
        Ok(Self {
            world,
            generation,
            actor,
            attempt,
            workspace_key,
            _custody: custody,
        })
    }

    async fn assert_current(&self, tx: &tokio_postgres::Transaction<'_>) -> StoreResult<()> {
        let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
        if head.world_id != self.world || head.generation != self.generation {
            return Err(StoreError::StaleCut);
        }
        Ok(())
    }

    /// Consume only the opportunity selected for this attempt. A newer cue
    /// stays queued. Failure rolls back with the same spending reservation.
    pub(super) async fn take_cue(
        &self,
        tx: &tokio_postgres::Transaction<'_>,
        cue: &ReflectionCue,
    ) -> StoreResult<bool> {
        self.assert_current(tx).await?;
        let key = cue_key(&self.world, &self.actor)?;
        Ok(tx
            .execute(
                "DELETE FROM meta WHERE key=$1 AND value=$2",
                &[&key, &cue.stored],
            )
            .await?
            == 1)
    }
}

impl Store {
    /// The judgment has already settled. Reuse the scope of its admitted
    /// source, with a fresh check under the writer that also owns withdrawal.
    pub(crate) async fn queue_judged_reflection(
        &self,
        world: String,
        generation: String,
        actor: String,
        source: PersonalSourceRef,
    ) -> Result<bool, CommitError> {
        let bytes =
            world.len() + generation.len() + actor.len() + source.id.len() + source.revision.len();
        let _workspace = self
            .budget
            .reserve(2048 + bytes * 8)
            .map_err(|_| CommitError::RolledBack(StoreError::Capacity))?;
        self.operational(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != world
                    || head.generation != generation
                    || !cue_eligible(tx, &world, &actor, &source).await?
                {
                    return Ok(false);
                }
                queue_cue(tx, &world, &generation, &actor, source).await
            })
        })
        .await
    }

    /// Indexed existence is enough for the wake. The actual private source
    /// reader acquires complete permitted records only after slot admission.
    pub(crate) async fn reflection_due(
        self: &Arc<Self>,
        scope: Arc<ReflectionScope>,
    ) -> StoreResult<ReflectionDue> {
        let budget = self.budget.clone();
        self.read_simulation_cut(move |tx| Box::pin(async move {
            scope.assert_current(tx).await?;
            let queue = cue_key(&scope.world, &scope.actor)?;
            let _row_storage = budget.reserve(8192).map_err(|_| StoreError::Capacity)?;
            let row = tx.query_one(
                "SELECT EXISTS(SELECT 1 FROM recall_sources WHERE world_id=$1 AND actor_id=$2 AND eligible=1),
                        EXISTS(SELECT 1 FROM attempts WHERE id=$3)
                        OR EXISTS(SELECT 1 FROM attempts a JOIN attempt_scopes s ON s.attempt_id=a.id
                           JOIN cognition_attempt_links l ON l.attempt_id=a.id
                           WHERE s.actor_id=$2 AND a.status IN ('reserved','uncertain') AND l.stage='reflection-worktree'),
                        (SELECT CASE WHEN octet_length(value)<=4096 THEN value END FROM meta WHERE key=$4)",
                &[&scope.world, &scope.actor, &scope.attempt, &queue],
            ).await?;
            if row.try_get(1)? {
                Ok(ReflectionDue::AlreadyAttempted)
            } else if row.try_get(0)? {
                let cue = if let Some(raw) = row.try_get::<_, Option<&str>>(2)? {
                    let held = budget.reserve(512 + raw.len() * 8).map_err(|_| StoreError::Capacity)?;
                    let value: StoredCue = serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
                    if !value.source.validate() { return Err(StoreError::InvalidRecord); }
                    // Ignore an old cue whose source is already gone. It cannot mask a
                    // later ordinary opportunity. Preparation still owns the final check.
                    let eligible = value.generation == scope.generation
                        && cue_eligible(tx, &scope.world, &scope.actor, &value.source).await?;
                    eligible.then(|| ReflectionCue { source: value.source, stored: raw.to_owned(), _custody: held })
                } else { None };
                Ok(ReflectionDue::Ready(cue))
            } else {
                Ok(ReflectionDue::NoEvidence)
            }
        })).await
    }

    pub(crate) async fn reflection_workspace(
        self: &Arc<Self>,
        scope: Arc<ReflectionScope>,
    ) -> StoreResult<ReadWorkspaceBinding> {
        let budget = self.budget.clone();
        self.read_simulation_cut(move |tx| {
            Box::pin(async move {
                scope.assert_current(tx).await?;
                let (_wire, rows) = admitted_query(tx,
                "SELECT CASE WHEN octet_length(value)<=4096 THEN value END FROM meta WHERE key=$1",
                &[&scope.workspace_key], &budget).await?;
                let raw: Option<&str> = rows.first().map(|row| row.try_get(0)).transpose()?;
                let custody = budget
                    .reserve(512 + raw.map_or(0, |body| body.len() * 6))
                    .map_err(|_| StoreError::Capacity)?;
                let current = raw
                    .map(serde_json::from_str)
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?;
                Ok(ReadWorkspaceBinding {
                    current,
                    _custody: custody,
                })
            })
        })
        .await
    }

    /// Compare the same retained metadata before changing a leased file.
    /// Unknown conditional transfers stay detectable across cold start.
    pub(crate) async fn write_reflection_workspace(
        &self,
        scope: Arc<ReflectionScope>,
        previous: Option<String>,
        next: String,
    ) -> Result<(), CommitError> {
        self.operational(move |tx| Box::pin(async move {
            scope.assert_current(tx).await?;
            let current = tx.query_opt("SELECT CASE WHEN octet_length(value)<=4096 THEN value END FROM meta WHERE key=$1", &[&scope.workspace_key]).await?;
            if current.as_ref().map(|row| row.try_get::<_, &str>(0)).transpose()? != previous.as_deref() {
                return Err(StoreError::StaleCut);
            }
            tx.execute("INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value", &[&scope.workspace_key,&next]).await?;
            Ok(())
        })).await
    }
}
