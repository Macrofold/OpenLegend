//! The browser selects one immutable release. The authoritative save, exact
//! asset pins and original receipt commit together under the existing writer.

use super::{AssetRevision, bind_world_assets, permitted_asset};
use crate::authority::{RequestScope, assert_saved_grant};
use crate::store::{MetadataProjection, PrefixProjection, Store, StoreError, StoreResult};
use openlegend_simulation::encoding::{json_record, sha256_hex};
use openlegend_simulation::records::SaveRows;
use serde::{Deserialize, Serialize};
use tokio_postgres::{GenericClient, Transaction};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ArtworkChoice {
    pub(crate) id: String,
    pub(crate) timeline: String,
    pub(crate) reference: AssetRevision,
    pub(crate) expected_revision: u64,
}

impl ArtworkChoice {
    pub(crate) fn valid(&self) -> bool {
        crate::npc::valid_request_id(&self.id)
            && crate::npc::valid_request_id(&self.timeline)
            && self.reference.valid()
            && self.expected_revision < crate::store::MAX_SAFE_INTEGER
    }

    pub(crate) fn receipt(&self, scope: &RequestScope) -> StoreResult<ArtworkOperation> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Input<'a> {
            timeline: &'a str,
            reference: &'a AssetRevision,
            expected_revision: u64,
        }
        let choice = json_record(&Input {
            timeline: &self.timeline,
            reference: &self.reference,
            expected_revision: self.expected_revision,
        })
        .map_err(|_| StoreError::InvalidRecord)?;
        let identity = json_record(&[&scope.world_id, &scope.account_id, &self.id])
            .map_err(|_| StoreError::InvalidRecord)?;
        Ok(ArtworkOperation {
            key: format!("integration:asset-world-selection:{identity}"),
            fingerprint: sha256_hex(choice.as_bytes()),
        })
    }
}

pub(crate) struct ArtworkOperation {
    key: String,
    fingerprint: String,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Receipt {
    fingerprint: String,
    reference: AssetRevision,
}

impl ArtworkOperation {
    async fn read(&self, client: &impl GenericClient) -> StoreResult<Option<AssetRevision>> {
        client
            .query_opt(
                "SELECT CASE WHEN octet_length(value)<=8192 THEN value END FROM meta WHERE key=$1",
                &[&self.key],
            )
            .await?
            .map(|row| {
                let value: Option<&str> = row.try_get(0)?;
                let receipt: Receipt =
                    serde_json::from_str(value.ok_or(StoreError::InvalidRecord)?)
                        .map_err(|_| StoreError::InvalidRecord)?;
                if receipt.fingerprint != self.fingerprint {
                    return Err(StoreError::StaleCut);
                }
                if !receipt.reference.valid() {
                    return Err(StoreError::InvalidRecord);
                }
                Ok(receipt.reference)
            })
            .transpose()
    }
}

impl Store {
    /// Inspect the original operation under the reader. Read permission for
    /// that exact reference is still checked before returning it to the tab.
    pub(crate) async fn artwork_receipt(
        &self,
        operation: &ArtworkOperation,
    ) -> StoreResult<Option<AssetRevision>> {
        let reader = self.reader.lock().await;
        operation.read(&reader.client).await
    }
}

pub(crate) struct ArtworkProjection<'a> {
    pub(crate) metadata: &'a MetadataProjection,
    pub(crate) operation: ArtworkOperation,
    pub(crate) reference: AssetRevision,
    pub(crate) scope: std::sync::Arc<crate::authority::AuthorizedScope>,
}

impl PrefixProjection for ArtworkProjection<'_> {
    async fn before_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> StoreResult<()> {
        self.metadata.before_records(tx, rows, revision).await
    }

    async fn after_records(
        &self,
        tx: &Transaction<'_>,
        rows: &SaveRows,
        _: u64,
    ) -> StoreResult<()> {
        let scope = &self.scope.scope;
        let world = &scope.world_id;
        let reference = &self.reference;
        if rows.world_id != *world || self.operation.read(tx).await?.is_some() {
            return Err(StoreError::StaleCut);
        }
        assert_saved_grant(tx, scope, "save").await?;
        permitted_asset(tx, &scope.account_id, reference, None)
            .await?
            .ok_or(StoreError::StaleCut)?;
        bind_world_assets(tx, world, reference, &scope.account_id).await?;
        let receipt = json_record(&Receipt {
            fingerprint: self.operation.fingerprint.clone(),
            reference: reference.clone(),
        })
        .map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "INSERT INTO meta (key,value) VALUES ($1,$2)",
            &[&self.operation.key, &receipt],
        )
        .await?;
        Ok(())
    }
}
