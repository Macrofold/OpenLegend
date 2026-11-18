//! The latest delivered story is a private rendering of current personal
//! records. A banner does not establish new facts or inherit the world log.

use super::super::{Store, StoreError, StoreResult, ordinal, read::admitted_query};
use super::transcript::{TranscriptItem, narration};
use openlegend_simulation::{
    encoding::json_record, host::ByteReservation, received::TemporalReceiptLocator,
    records::SqlCell,
};
use serde::{Deserialize, Serialize, Serializer};
use tokio_postgres::Transaction;

pub(crate) struct NarrationBanner {
    item: TranscriptItem,
    privacy_revision: u64,
    temporal: Vec<(TemporalReceiptLocator, f64)>,
    _custody: ByteReservation,
}

impl PartialEq for NarrationBanner {
    fn eq(&self, other: &Self) -> bool {
        self.item == other.item
    }
}

impl Serialize for NarrationBanner {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.item.serialize(serializer)
    }
}

impl NarrationBanner {
    pub(crate) fn select(
        &mut self,
        player: &mut openlegend_simulation::runtime::RuntimePlayerRead,
        actor: &str,
        references: &crate::player_references::PlayerReferences<'_>,
        budget: &openlegend_simulation::host::ByteBudget,
    ) -> Result<bool, crate::world::WorldError> {
        if !player.bind_narrator(self.privacy_revision, &self.temporal, budget)? {
            return Ok(false);
        }
        self.temporal = Vec::new();
        self.item.project_impacts(actor, references)?;
        Ok(true)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TemporalSource {
    receipt: TemporalReceiptLocator,
    received_at: f64,
}

impl Store {
    /// Check the selected owner's latest stored banner and all of its
    /// personal source grants within the profile's existing snapshot. Only
    /// this one eligible body is admitted and transferred. The caller still
    /// checks its temporal and privacy witnesses in the live player lease.
    pub(crate) async fn latest_banner(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        owner: &str,
        actor: &str,
    ) -> StoreResult<Option<NarrationBanner>> {
        let _query = self
            .budget
            .reserve(
                self.schema
                    .banner_account
                    .len()
                    .checked_add(4096)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let statement=format!(
            "WITH latest AS MATERIALIZED (
               SELECT b.* FROM story_banners b WHERE b.world_id=$1 AND b.owner_id=$2
               ORDER BY b.position DESC,b.id DESC LIMIT 1)
             SELECT b.id,b.position,b.payload,
               COALESCE((SELECT payload::bigint FROM mind_privacy_revisions WHERE world_id=$1 AND id=$4),0),
               COALESCE((SELECT json_agg(json_build_object('receipt',p.payload::jsonb#>'{{account,receipt}}',
                 'receivedAt',(p.payload::jsonb#>>'{{account,receivedAt}}')::double precision))
                 FROM story_event_sources src JOIN history_perspectives p
                 ON p.world_id=src.world_id AND p.actor_id=$3 AND p.event_id=src.event_id
                 WHERE src.world_id=b.world_id AND src.owner_id=b.owner_id AND src.narration_id=b.id
                   AND p.payload::jsonb#>>'{{account,kind}}'='temporal'),'[]'::json)::text
             FROM latest b WHERE NOT EXISTS (
               SELECT 1 FROM story_event_sources src
               WHERE src.world_id=b.world_id AND src.owner_id=b.owner_id AND src.narration_id=b.id
                 AND NOT EXISTS (SELECT 1 FROM history_perspectives p
                   WHERE p.world_id=src.world_id AND p.actor_id=$3 AND p.event_id=src.event_id AND {}))",
            self.schema.banner_account
        );
        let key = json_record(&["world", "experience", "privacyRevisions", actor])
            .map_err(|_| StoreError::InvalidRecord)?;
        let (_transfer, rows) = admitted_query(
            tx,
            &statement,
            &[&world, &owner, &actor, &key],
            &self.budget,
        )
        .await?;
        let Some(row) = rows.first() else {
            return Ok(None);
        };
        let payload = row.try_get::<_, &str>(2)?;
        let source_rows = row.try_get::<_, &str>(4)?;
        let bytes = [payload, source_rows]
            .iter()
            .try_fold(2048usize, |used, value| {
                used.checked_add(SqlCell::json_decode_bound(value)?)
            })
            .ok_or(StoreError::Capacity)?;
        let custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let item = narration(row, payload, actor)?;
        let sources = serde_json::from_str::<Vec<TemporalSource>>(source_rows)
            .map_err(|_| StoreError::InvalidRecord)?;
        if sources
            .iter()
            .any(|source| source.receipt.actor_id != actor || !source.received_at.is_finite())
        {
            return Err(StoreError::InvalidRecord);
        }
        let temporal = sources
            .into_iter()
            .map(|source| (source.receipt, source.received_at))
            .collect();
        Ok(Some(NarrationBanner {
            item,
            privacy_revision: ordinal(row.try_get(3)?)?,
            temporal,
            _custody: custody,
        }))
    }
}
