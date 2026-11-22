//! The awaiting target holds this same writer through registration,
//! publication, and launch. Checkpoint files are only its input; this owner
//! writes the current canonical, operational and authority rows together.

use super::{CommitError, CurrentOpening, DurableHead, Store, StoreError, StoreResult};
use crate::creation::{ActivationIdentity, ActivationReceipt, InitialAccount, OpeningValidator};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use tokio_postgres::Transaction;
use uuid::Uuid;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Registration {
    pub target_id: String,
    pub generation: u64,
    pub profile_digest: String,
    pub configuration_digest: String,
}

impl Registration {
    async fn read(tx: &Transaction<'_>, lock: bool) -> StoreResult<Option<Self>> {
        let statement = if lock {
            "SELECT target_id,generation,profile_digest,configuration_digest FROM creation_target_registration WHERE id=1 FOR UPDATE"
        } else {
            "SELECT target_id,generation,profile_digest,configuration_digest FROM creation_target_registration WHERE id=1"
        };
        tx.query_opt(statement, &[])
            .await?
            .map(|row| {
                Ok(Self {
                    target_id: row.try_get(0)?,
                    generation: super::ordinal(row.try_get(1)?)?,
                    profile_digest: row.try_get(2)?,
                    configuration_digest: row.try_get(3)?,
                })
            })
            .transpose()
    }
}

#[derive(Deserialize)]
pub(crate) struct StoredActivation {
    pub fingerprint: String,
    pub receipt: ActivationReceipt,
}

impl StoredActivation {
    async fn identify(
        tx: &Transaction<'_>,
        identity: &ActivationIdentity,
    ) -> StoreResult<Option<Self>> {
        let stored = read_activation(tx,
            "SELECT fingerprint,CASE WHEN octet_length(payload)<=8192 THEN payload ELSE '' END FROM creation_activation_receipts WHERE source_installation_id=$1 AND operation_id=$2",
            &[&identity.source_installation_id, &identity.operation_id]
        ).await?;
        if stored.as_ref().is_some_and(|record| {
            record.receipt.identity.source_installation_id != identity.source_installation_id
                || record.receipt.identity.operation_id != identity.operation_id
        }) {
            return Err(StoreError::InvalidRecord);
        }
        Ok(stored)
    }
}

pub(crate) enum ActivationWrite {
    Published(ActivationReceipt),
    Replayed(ActivationReceipt),
    Conflict,
    Occupied,
    StaleTarget,
    Expired,
}

pub(crate) struct FirstInstallation {
    pub opening: CurrentOpening,
    pub history: super::CheckpointHistory,
    pub head: DurableHead,
}

pub(crate) struct ActivationWriteInput {
    pub registration: Registration,
    pub receipt: ActivationReceipt,
    pub fingerprint: String,
    pub expires_at: u64,
    pub account: InitialAccount,
    pub actor: String,
    pub data_dir: std::path::PathBuf,
    pub validate: OpeningValidator,
    pub installation: FirstInstallation,
}

impl Store {
    pub(crate) fn creation_budget(&self) -> &openlegend_simulation::host::ByteBudget {
        &self.budget
    }
    pub(crate) async fn configure_creation(
        &self,
        target_id: String,
        profile_digest: String,
        configuration_digest: String,
    ) -> Result<Registration, CommitError> {
        self.operational(move |tx| Box::pin(async move {
            let previous = Registration::read(tx, true).await?;
            if previous.as_ref().is_some_and(|previous| previous.target_id != target_id) {
                return Err(StoreError::StaleCut);
            }
            if let Some(previous) = &previous && previous.configuration_digest == configuration_digest {
                return Ok(previous.clone());
            }
            let generation = previous.map_or(0, |value| value.generation)
                .checked_add(1).ok_or(StoreError::Capacity)?;
            let ordinal = super::sql_ordinal(generation)?;
            tx.execute(
                "INSERT INTO creation_target_registration VALUES(1,$1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET generation=excluded.generation,configuration_digest=excluded.configuration_digest,profile_digest=excluded.profile_digest",
                &[&target_id,&ordinal,&configuration_digest,&profile_digest],
            ).await?;
            Ok(Registration { target_id, generation, profile_digest, configuration_digest })
        })).await
    }

    pub(crate) async fn creation_registration(&self) -> StoreResult<Option<Registration>> {
        self.read_operational(|tx| Box::pin(Registration::read(tx, false)))
            .await
    }

    pub(crate) async fn creation_unoccupied(&self) -> StoreResult<bool> {
        let selection = self.schema.creation_target_occupied.clone();
        self.read_operational(move |tx| {
            Box::pin(async move {
                let occupied: bool = tx.query_one(&selection, &[]).await?.try_get(0)?;
                Ok(!occupied)
            })
        })
        .await
    }

    pub(crate) async fn creation_receipt(
        &self,
        identity: ActivationIdentity,
    ) -> StoreResult<Option<StoredActivation>> {
        self.read_operational(move |tx| {
            Box::pin(async move { StoredActivation::identify(tx, &identity).await })
        })
        .await
    }

    pub(crate) async fn published_activation(
        &self,
        target: String,
    ) -> StoreResult<Option<ActivationReceipt>> {
        self.read_operational(move |tx| Box::pin(async move {
            let value = read_activation(tx,
                "SELECT fingerprint,CASE WHEN octet_length(payload)<=8192 THEN payload ELSE '' END FROM creation_activation_receipts WHERE target_id=$1",
                &[&target]).await?;
            if value.as_ref().is_some_and(|record| record.receipt.identity.target_id != target) {
                return Err(StoreError::InvalidRecord);
            }
            // A damaged gameplay head can block adoption without erasing a
            // committed operational outcome. Launch verifies the head on open.
            Ok(value.map(|value| value.receipt))
        })).await
    }

    pub(crate) async fn publish_initial_world(
        self: &Arc<Self>,
        input: ActivationWriteInput,
    ) -> Result<ActivationWrite, CommitError> {
        let store = self.clone();
        let operation = self.operational(move |tx| {
            Box::pin(async move {
                let registration = Registration::read(tx, true).await?;
                if let Some(prior) = StoredActivation::identify(tx, &input.receipt.identity).await?
                {
                    return Ok(if prior.fingerprint == input.fingerprint {
                        ActivationWrite::Replayed(prior.receipt)
                    } else {
                        ActivationWrite::Conflict
                    });
                }
                if registration.as_ref() != Some(&input.registration) {
                    return Ok(ActivationWrite::StaleTarget);
                }
                if !crate::creation::current_deadline(input.expires_at) {
                    return Ok(ActivationWrite::Expired);
                }
                let occupied: bool = tx
                    .query_one(&store.schema.creation_target_occupied, &[])
                    .await?
                    .try_get(0)?;
                if occupied || retained_files(&input.data_dir).await? {
                    return Ok(ActivationWrite::Occupied);
                }
                let FirstInstallation {
                    opening,
                    history,
                    head,
                } = input.installation;
                if head.world_id != input.receipt.world_id || head.revision != 1 {
                    return Err(StoreError::InvalidRecord);
                }
                tx.execute(
                    "INSERT INTO world_head(id,world_id,revision,generation) VALUES (1,$1,1,$2)",
                    &[&head.world_id, &head.generation],
                )
                .await?;
                store
                    .stage_opening_records(tx, &opening, &history, false)
                    .await
                    .inspect_err(|error| {
                        eprintln!("OpenLegend could not stage the opening records: {error}")
                    })?;
                let account = &input.account.account_id;
                let actor = &input.actor;
                let native = (input.validate)(opening, account.clone(), actor.clone()).await?;
                Store::stage_initial_artwork(
                    tx,
                    &head.world_id,
                    native.artwork.as_ref(),
                    account,
                )
                .await?;
                let decoder = native.session.opening_recall_decoder().map_err(|error| {
                    eprintln!("OpenLegend refused the opening recall preparation: {error}");
                    StoreError::InvalidRecord
                })?;
                store
                    .rebuild_checkpoint_projections(tx, &head.world_id, &decoder)
                    .await
                    .inspect_err(|error| {
                        eprintln!("OpenLegend could not stage the opening recall records: {error}")
                    })?;
                store.validate_received(tx, &head.world_id).await?;
                let capabilities = serde_json::to_string(&input.account.capabilities)
                    .map_err(|_| StoreError::InvalidRecord)?;
                tx.execute(
                    "INSERT INTO auth_accounts VALUES ($1,$2,$3)",
                    &[account, &input.account.issuer, &input.account.subject],
                )
                .await?;
                tx.execute(
                    "INSERT INTO auth_grants VALUES ($1,$2,$3,1,$4)",
                    &[&head.world_id, account, actor, &capabilities],
                )
                .await?;
                tx.execute(
                    "INSERT INTO auth_actor_owners VALUES ($1,$2,$3)",
                    &[&head.world_id, actor, account],
                )
                .await?;
                let timeline_key = format!("integration:world-timeline:{}", head.world_id);
                let timeline = serde_json::to_string(&Uuid::new_v4().to_string())
                    .map_err(|_| StoreError::InvalidRecord)?;
                tx.execute(
                    "INSERT INTO meta VALUES ($1,$2)",
                    &[&timeline_key, &timeline],
                )
                .await?;
                let mut receipt = input.receipt;
                receipt.committed_at = crate::creation::millis();
                if receipt.committed_at >= input.expires_at {
                    // No initial row or grant can escape after the approval expires.
                    return Err(StoreError::Cancelled);
                }
                let body =
                    serde_json::to_string(&receipt).map_err(|_| StoreError::InvalidRecord)?;
                let identity = &receipt.identity;
                let generation = super::sql_ordinal(identity.target_generation)?;
                tx.execute(
                    "INSERT INTO creation_activation_receipts VALUES($1,$2,$3,$4,$5,$6)",
                    &[
                        &identity.source_installation_id,
                        &identity.operation_id,
                        &identity.target_id,
                        &generation,
                        &input.fingerprint,
                        &body,
                    ],
                )
                .await?;
                Ok(ActivationWrite::Published(receipt))
            })
        });
        match operation.await {
            Err(CommitError::RolledBack(StoreError::Cancelled)) => Ok(ActivationWrite::Expired),
            other => other,
        }
    }
}

async fn read_activation(
    tx: &Transaction<'_>,
    sql: &str,
    arguments: &[&(dyn tokio_postgres::types::ToSql + Sync)],
) -> StoreResult<Option<StoredActivation>> {
    tx.query_opt(sql, arguments)
        .await?
        .map(|row| {
            let raw: &str = row.try_get(1)?;
            let receipt: ActivationReceipt =
                serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
            if !receipt.valid() {
                return Err(StoreError::InvalidRecord);
            }
            Ok(StoredActivation {
                fingerprint: row.try_get(0)?,
                receipt,
            })
        })
        .transpose()
}

pub(crate) async fn retained_files(directory: &Path) -> StoreResult<bool> {
    use std::io::ErrorKind::NotFound;
    let mut entries = match tokio::fs::read_dir(directory).await {
        Ok(entries) => entries,
        Err(error) if error.kind() == NotFound => return Ok(false),
        Err(_) => return Err(StoreError::InvalidRecord),
    };
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|_| StoreError::InvalidRecord)?
    {
        if entry.file_name() != "saves"
            || !entry
                .file_type()
                .await
                .map_err(|_| StoreError::InvalidRecord)?
                .is_dir()
        {
            return Ok(true);
        }
        let mut files = tokio::fs::read_dir(entry.path())
            .await
            .map_err(|_| StoreError::InvalidRecord)?;
        if files
            .next_entry()
            .await
            .map_err(|_| StoreError::InvalidRecord)?
            .is_some()
        {
            return Ok(true);
        }
    }
    Ok(false)
}
