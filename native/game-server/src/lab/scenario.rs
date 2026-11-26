//! The native checkpoint header pairs the exact world cut with its applied
//! Lab settings. The field store keeps immutable rows behind a bounded reference.
use super::{decisions::{participants,settings}, fields};
use crate::store::{StoreError, StoreResult};
use serde::{Deserialize, Serialize};
use tokio_postgres::Transaction;
use uuid::Uuid;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Snapshot {
    pub(super) namespace: Uuid,
    pub(crate) source_start: bool,
    pub(super) fields: fields::FieldRevision,
    pub(super) holds: Option<Uuid>,
    inference: settings::Settings,
    #[serde(default,skip_serializing_if="participants::Participants::is_empty")]
    participants: participants::Participants,
    pub(crate) origin: Option<super::Proof>,
    pub(super) privacy: String,
}

impl Snapshot {
    pub(crate) fn namespace(&self) -> Uuid {
        self.namespace
    }

    /// Read both small records in the checkpoint's already-pinned SQL snapshot.
    /// Gameplay writes resume before this read or any part of file streaming.
    pub(crate) async fn capture(tx: &Transaction<'_>, namespace: Uuid) -> StoreResult<Self> {
        Ok(Self {
            namespace,
            source_start: false,
            holds: super::holds::selected(tx).await?,
            fields: fields::read_checkpoint_ref(tx).await?,
            inference: settings::read_checkpoint(tx).await?,
            participants: participants::checkpoint(tx).await?,
            origin: super::prepare::read_source(tx).await?,
            privacy: privacy_cut(tx).await?,
        })
    }

    pub(super) async fn starting(
        tx: &Transaction<'_>,
        namespace: Uuid,
        origin: Option<super::Proof>,
    ) -> StoreResult<Self> {
        // Revision zero is immutable. The field owner forks when a later edit
        // branches from this cut, so all reviewed starts share one empty origin.
        tx.execute("INSERT INTO cognition_lab.field_scenarios(id,tip) VALUES($1::text::uuid,0) ON CONFLICT DO NOTHING",&[&namespace.to_string()]).await?;
        Ok(Self {
            namespace,
            source_start: true,
            holds: None,
            fields: fields::FieldRevision {
                scenario: namespace,
                revision: 0,
            },
            inference: settings::Settings::default(),
            participants: participants::Participants::default(),
            origin,
            privacy: privacy_cut(tx).await?,
        })
    }

    /// Stage the paired settings and field selection beside the new world and
    /// load receipt. Any later validation or SQL failure rolls them back together.
    pub(crate) async fn restore(
        &self,
        tx: &Transaction<'_>,
        namespace: Uuid,
        models: Option<&settings::Settings>,
    ) -> StoreResult<()> {
        if self.namespace != namespace {
            return Err(StoreError::StaleCut);
        }
        let source = self
            .origin
            .as_ref()
            .map(serde_json::to_string)
            .transpose()
            .map_err(|_| StoreError::InvalidRecord)?;
        tx.execute(
            "UPDATE cognition_lab_identity SET source=$1 WHERE singleton",
            &[&source],
        )
        .await?;
        fields::restore_checkpoint_ref(tx, &self.fields).await?;
        super::holds::restore(tx,self.holds).await?;
        participants::restore(tx,&self.participants).await?;
        settings::restore_checkpoint(tx, models.unwrap_or(&self.inference)).await
    }
}

/// Privacy changes invalidate older private exports. The checkpoint can read
/// this indexed token without scanning the correction/forgetting ledger.
pub(super) async fn initialize(
    store: &crate::store::Store,
) -> Result<(), crate::store::CommitError> {
    super::holds::initialize(store).await?;
    store.operational(|tx|Box::pin(async move {
        tx.batch_execute(r#"CREATE TABLE IF NOT EXISTS cognition_lab.departures(world_id text NOT NULL,actor_id text NOT NULL,id text NOT NULL,deadline bigint NOT NULL, PRIMARY KEY(world_id, actor_id, id));
            CREATE TABLE IF NOT EXISTS cognition_lab.privacy_cut(
            singleton boolean PRIMARY KEY CHECK(singleton), token text NOT NULL);
            INSERT INTO cognition_lab.privacy_cut SELECT true,
              encode(sha256(convert_to(coalesce((SELECT value::jsonb FROM meta WHERE key LIKE 'integration:privacy-ledger:%'),
                 '{"forgotten":{},"corrections":{}}'::jsonb)::text,'UTF8')),'hex') ON CONFLICT DO NOTHING;
            CREATE TABLE IF NOT EXISTS cognition_lab.scenario_exports(
                id uuid PRIMARY KEY, owner text NOT NULL, fingerprint text NOT NULL, privacy_cut text NOT NULL);"#).await?;
        Ok(())
    })).await
}
pub(super) async fn privacy_cut(tx: &Transaction<'_>) -> StoreResult<String> {
    Ok(tx
        .query_one(
            "SELECT token FROM cognition_lab.privacy_cut WHERE singleton",
            &[],
        )
        .await?
        .try_get(0)?)
}

/// Called only by the native privacy ledger's two mutation owners. Capture
/// reads this digest in constant space even when the ledger grows.
pub(crate) async fn record_privacy(
    store: &crate::store::Store,
    tx: &Transaction<'_>,
    body: &str,
) -> StoreResult<()> {
    if store.scenario_namespace().is_some() {
        tx.execute("UPDATE cognition_lab.privacy_cut SET token=encode(sha256(convert_to($1::text::jsonb::text,'UTF8')),'hex') WHERE singleton",&[&body]).await?;
    }
    Ok(())
}
