//! Capture sequence and independently held presentation assets belong to the
//! operational database. Rewinding gameplay cannot rewind either owner.

use crate::store::assets::AssetRevision;
use crate::store::{
    DurableHead, Store, StoreError, StoreResult, durable_head, ordinal, sql_ordinal,
};
use serde::Deserialize;
use tokio_postgres::Transaction;

impl Store {
    pub(super) async fn claim_checkpoint(
        &self,
        world: &str,
        id: &str,
        highest_retained: u64,
    ) -> StoreResult<(DurableHead, u64)> {
        let mut writer = self.writer.lock().await;
        self.assert_write_admission()?;
        let tx = writer.client.transaction().await?;
        let head = durable_head(&tx).await?.ok_or(StoreError::InvalidRecord)?;
        if head.world_id != world {
            return Err(StoreError::StaleCut);
        }
        // The caller holds the sole capture slot and has verified that this
        // ID was not published. A crash before publication may have left a
        // provisional claim whose cut can no longer be read.
        let cleared = tx.execute(
            "DELETE FROM asset_save_claims WHERE world_id=$1 AND save_id=$2 AND status='capturing'",
            &[&world, &id],
        ).await?;
        if cleared != 0 {
            drop_holds(&tx, &owner_id(world, id)?, &["save-capture"]).await?;
        }
        let next = sql_ordinal(
            highest_retained
                .checked_add(1)
                .ok_or(StoreError::Capacity)?,
        )?;
        let key = format!("checkpoint:sequence:{world}");
        let sequence: i64 = tx.query_one(
            "INSERT INTO meta VALUES ($1,cast($2::bigint as text)) ON CONFLICT(key) DO UPDATE SET value=GREATEST(meta.value::bigint+1,$2)::text RETURNING value::bigint",
            &[&key, &next],
        ).await?.try_get(0)?;
        let sequence = ordinal(sequence)?;
        self.hold_checkpoint_assets(&tx, &head, id).await?;
        tx.commit().await?;
        Ok((head, sequence))
    }

    async fn hold_checkpoint_assets(
        &self,
        tx: &Transaction<'_>,
        head: &DurableHead,
        id: &str,
    ) -> StoreResult<()> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Host<'a> {
            #[serde(borrow)]
            presentation_release: Option<&'a serde_json::value::RawValue>,
        }
        let world = &head.world_id;
        let (_custody, rows) = crate::store::read::admitted_query(
            tx,
            "SELECT payload FROM data_world WHERE world_id=$1 AND id='[]'",
            &[world],
            &self.budget,
        )
        .await?;
        let [row] = rows.as_slice() else {
            return Err(StoreError::InvalidRecord);
        };
        let raw: &str = row.try_get(0)?;
        let binding: Host<'_> = serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
        let Some(reference) = binding.presentation_release else {
            return Ok(());
        };
        let release = AssetRevision::from_current(reference)?;
        let key = release.key();
        let reference = serde_json::to_value(&release).map_err(|_| StoreError::InvalidRecord)?;
        tx.query_opt(
            crate::store::assets::RETAINED_RELEASE,
            &[
                &key,
                &release.manifest_sha256,
                world,
                &reference,
                &"world",
                world,
            ],
        )
        .await?
        .ok_or(StoreError::InvalidRecord)?;
        let owner = owner_id(world, id)?;
        let revision = sql_ordinal(head.revision)?;
        let payload = openlegend_simulation::encoding::json_record(&release)
            .map_err(|_| StoreError::InvalidRecord)?;
        let inserted = tx.execute(
            "INSERT INTO asset_save_claims VALUES ($1,$2,$3,'capturing',$4) ON CONFLICT(world_id,save_id) DO NOTHING",
            &[world,&id,&revision,&payload],
        ).await?;
        if inserted != 1 {
            return Err(StoreError::StaleCut);
        }
        copy_holds(tx, "world", world, "save-capture", &owner).await
    }

    pub(super) async fn complete_checkpoint_assets(
        &self,
        world: &str,
        id: &str,
    ) -> StoreResult<()> {
        let owner = owner_id(world, id)?;
        let mut writer = self.writer.lock().await;
        self.assert_write_admission()?;
        let tx = writer.client.transaction().await?;
        copy_holds(&tx, "save-capture", &owner, "save", &owner).await?;
        drop_holds(&tx, &owner, &["save-capture"]).await?;
        tx.execute(
            "UPDATE asset_save_claims SET status='published' WHERE world_id=$1 AND save_id=$2",
            &[&world, &id],
        )
        .await?;
        tx.commit().await?;
        Ok(())
    }

    pub(super) async fn release_checkpoint_assets(
        &self,
        world: &str,
        id: &str,
        unpublished_only: bool,
    ) -> StoreResult<()> {
        let owner = owner_id(world, id)?;
        let mut writer = self.writer.lock().await;
        self.assert_write_admission()?;
        let tx = writer.client.transaction().await?;
        let mut sql =
            String::from("DELETE FROM asset_save_claims WHERE world_id=$1 AND save_id=$2");
        if unpublished_only {
            sql.push_str(" AND status='capturing'");
        }
        tx.execute(&sql, &[&world, &id]).await?;
        let kinds: &[&str] = if unpublished_only {
            &["save-capture"]
        } else {
            &["save", "save-capture"]
        };
        drop_holds(&tx, &owner, kinds).await?;
        tx.commit().await?;
        Ok(())
    }
}

fn owner_id(world: &str, slot: &str) -> StoreResult<String> {
    openlegend_simulation::encoding::json_record(&[world, slot])
        .map_err(|_| StoreError::InvalidRecord)
}

async fn copy_holds(
    tx: &Transaction<'_>,
    from_kind: &str,
    from_id: &str,
    to_kind: &str,
    to_id: &str,
) -> StoreResult<()> {
    let fields: &[&(dyn tokio_postgres::types::ToSql + Sync)] =
        &[&to_kind, &to_id, &from_kind, &from_id];
    tx.execute("INSERT INTO asset_pins SELECT $1,$2,revision_key,manifest_sha256 FROM asset_pins WHERE owner_kind=$3 AND owner_id=$4 ON CONFLICT DO NOTHING",fields).await?;
    tx.execute("INSERT INTO asset_pin_files SELECT $1,$2,artifact_key,payload FROM asset_pin_files WHERE owner_kind=$3 AND owner_id=$4 ON CONFLICT DO NOTHING",fields).await?;
    Ok(())
}

async fn drop_holds(tx: &Transaction<'_>, id: &str, kinds: &[&str]) -> StoreResult<()> {
    tx.execute(
        "DELETE FROM asset_pins WHERE owner_kind=ANY($1::text[]) AND owner_id=$2",
        &[&kinds, &id],
    )
    .await?;
    tx.execute(
        "DELETE FROM asset_pin_files WHERE owner_kind=ANY($1::text[]) AND owner_id=$2",
        &[&kinds, &id],
    )
    .await?;
    Ok(())
}
