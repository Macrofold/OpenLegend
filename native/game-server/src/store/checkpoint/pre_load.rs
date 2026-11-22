//! A protected pointer selects the recoverable point immediately before the
//! last installed load. The package itself uses the ordinary checkpoint writer.

use super::{Metadata, MetadataKind, capture::CaptureError};
use crate::store::{Store, StoreError, StoreResult};
use openlegend_simulation::encoding::{json_record, sha256_hex};
use serde::{Deserialize, Serialize};
use std::{path::Path, sync::Arc};
use tokio_postgres::{GenericClient, Transaction};
use uuid::Uuid;

pub(super) const ID: &str = "before-load";
const LABEL: &str = "Before last load";

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Pointer {
    file: Uuid,
}

pub(super) async fn pointed_file(
    tx: &impl GenericClient,
    world: &str,
    format: &str,
) -> StoreResult<Option<String>> {
    tx.query_opt(
        "SELECT CASE WHEN length(payload)<=1024 THEN payload END,checksum,format FROM game_saves WHERE world_id=$1 AND id=$2",
        &[&world, &ID],
    )
    .await?
    .map(|row| {
        let payload: Option<&str> = row.try_get(0)?;
        let payload = payload.ok_or(StoreError::InvalidRecord)?;
        let checksum: &str = row.try_get(1)?;
        let version: &str = row.try_get(2)?;
        let pointer: Pointer = serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
        let canonical = json_record(&pointer).map_err(|_| StoreError::InvalidRecord)?;
        if version != format || sha256_hex(canonical.as_bytes()) != checksum {
            return Err(StoreError::InvalidRecord);
        }
        Ok(pointer.file.to_string())
    })
    .transpose()
}

pub(super) struct BeforeLoad(Metadata);

impl BeforeLoad {
    pub(super) async fn install(&self, tx: &Transaction<'_>) -> StoreResult<()> {
        let point = &self.0;
        let file = Uuid::parse_str(&point.id).map_err(|_| StoreError::InvalidRecord)?;
        let payload = json_record(&Pointer { file }).map_err(|_| StoreError::InvalidRecord)?;
        let checksum = sha256_hex(payload.as_bytes());
        tx.execute(
            "INSERT INTO game_saves (id,world_id,label,created_at,sim_time,format,checksum,payload) \
             VALUES ($1,$2,$3,$4,$5::double precision,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET \
             world_id=excluded.world_id,label=excluded.label,created_at=excluded.created_at, \
             sim_time=excluded.sim_time,format=excluded.format,checksum=excluded.checksum,payload=excluded.payload",
            &[&ID,&point.world_id,&LABEL,&point.created_at,&point.sim_time,&point.format,&checksum,&payload],
        ).await?;
        Ok(())
    }

    pub(super) fn file_id(&self) -> &str {
        &self.0.id
    }
}

impl Store {
    /// Only the drained listener uses this path. No accepted live prefix
    /// exists, so the protected writer's exact PostgreSQL cut can be captured.
    pub(super) async fn capture_pre_load(
        self: &Arc<Self>,
        directory: &Path,
        world: &str,
    ) -> Result<BeforeLoad, CaptureError> {
        self.capture_local_checkpoint(
            None,
            directory.to_owned(),
            world,
            Uuid::new_v4().to_string(),
            MetadataKind::Recovery,
            LABEL.to_owned(),
            || Ok(()),
        )
        .await
        .map(BeforeLoad)
    }

    pub(super) async fn pre_load_file(&self, world: &str) -> StoreResult<Option<String>> {
        let reader = self.reader.lock().await;
        pointed_file(&reader.client, world, &self.schema.checkpoint.format).await
    }

    pub(super) async fn discard_pre_load(&self, directory: &Path, world: &str, point: BeforeLoad) {
        if let Err(error) = self
            .remove_pre_load_file(directory, world, point.file_id())
            .await
        {
            eprintln!("Could not remove a refused checkpoint recovery copy: {error}");
        }
    }

    pub(super) async fn remove_pre_load_file(
        &self,
        directory: &Path,
        world: &str,
        id: &str,
    ) -> Result<(), CaptureError> {
        match tokio::fs::remove_dir_all(directory.join(id)).await {
            Ok(()) => tokio::fs::File::open(directory).await?.sync_all().await?,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
            Err(error) => return Err(error.into()),
        }
        self.release_checkpoint_assets(world, id, false).await?;
        Ok(())
    }

    pub(super) async fn retain_pre_load(self: &Arc<Self>, directory: &Path, world: &str, id: &str) {
        if let Err(error) = self
            .rotate_checkpoints(
                directory.to_owned(),
                world,
                2,
                MetadataKind::Recovery,
                Some(id.to_owned()),
            )
            .await
        {
            eprintln!("Could not rotate the preceding checkpoint recovery copies: {error}");
        }
    }
}
