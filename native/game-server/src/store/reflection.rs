//! Durable app-owned bookkeeping for one resident's remote Worktree. Accepted
//! mind files, obligations and interpretations remain native world records.

use super::{CommitError, Store, StoreError, StoreResult, durable_head, read::admitted_query};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
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
    Ready,
    NoEvidence,
    AlreadyAttempted,
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
}

impl Store {
    /// Indexed existence is enough for the wake. The actual private source
    /// reader acquires complete permitted records only after slot admission.
    pub(crate) async fn reflection_due(
        self: &Arc<Self>,
        scope: Arc<ReflectionScope>,
    ) -> StoreResult<ReflectionDue> {
        self.read_simulation_cut(move |tx| Box::pin(async move {
            scope.assert_current(tx).await?;
            let row = tx.query_one(
                "SELECT EXISTS(SELECT 1 FROM recall_sources WHERE world_id=$1 AND actor_id=$2 AND eligible=1),
                        EXISTS(SELECT 1 FROM attempts WHERE id=$3)
                        OR EXISTS(SELECT 1 FROM attempts a JOIN attempt_scopes s ON s.attempt_id=a.id
                           JOIN cognition_attempt_links l ON l.attempt_id=a.id
                           WHERE s.actor_id=$2 AND a.status IN ('reserved','uncertain') AND l.stage='reflection-worktree')",
                &[&scope.world, &scope.actor, &scope.attempt],
            ).await?;
            if row.try_get(1)? {
                Ok(ReflectionDue::AlreadyAttempted)
            } else if row.try_get(0)? {
                Ok(ReflectionDue::Ready)
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
