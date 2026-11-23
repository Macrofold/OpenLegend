//! Retained archive bodies stay with the checkpoint. Only bounded dependency
//! selections and their exact charges enter the inactive native candidate.

use super::provider;
use super::{CheckpointHistory, RecoveryAuthority};
use crate::store::read::admitted_query_bounded;
use crate::store::{DurableHead, MAX_SAFE_INTEGER, Store, StoreError, StoreResult};
use openlegend_simulation::encoding::{json_record, json_record_len, sha256_hex};
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::SqlCell;
use openlegend_simulation::runtime::{
    RestoreArchiveMatch, RestoreInput, RestoreMetadataInput, RuntimeProviderInput, RuntimeRestoreArchives,
};
pub(super) use openlegend_simulation::runtime::{
    RestoreArchive as Archive, RestoreArchiveCategory as Category,
};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use tokio_postgres::Transaction;

impl Store {
    /// Determine archive retention from the fully staged canonical account
    /// references at this ticket. Abandoned gameplay indexes cannot inform
    /// the replacement or prevent recovery when those indexes are damaged.
    pub(crate) async fn answer_checkpoint_archives(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        request: &RuntimeRestoreArchives,
    ) -> StoreResult<RuntimeProviderInput> {
        let (_, projection) = request.parts();
        self.with_checkpoint_rows(
            tx,
            prospective,
            projection,
            None,
            None,
            self.read_checkpoint_archives(tx, prospective, request),
        )
        .await
    }

    /// Read the exact admitted archive references without decoding their prose.
    async fn read_checkpoint_archives(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        request: &RuntimeRestoreArchives,
    ) -> StoreResult<RuntimeProviderInput> {
        let (input, _) = request.parts();
        provider::verify_header(self, tx, prospective, 0, &input.binding, None).await?;
        if input.archives.len() > self.schema.checkpoint.archive_rows
            || input
                .offset
                .checked_add(input.archives.len())
                .is_none_or(|end| end as u64 > MAX_SAFE_INTEGER)
        {
            return Err(StoreError::InvalidRecord);
        }
        #[derive(Serialize)]
        struct Wanted<'a> {
            ordinal: usize,
            actor_id: &'a str,
            kind: &'a str,
            id: &'a str,
            revision: &'a str,
        }
        let bytes = input
            .archives
            .iter()
            .try_fold(1024usize, |n, row| {
                n.checked_add(row.actor_id.len())?
                    .checked_add(row.kind.len())?
                    .checked_add(row.id.len())?
                    .checked_add(row.revision.len())?
                    .checked_add(512)
            })
            .and_then(|n| n.checked_mul(16))
            .ok_or(StoreError::Capacity)?;
        let _workspace = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let wanted: Vec<_> = input
            .archives
            .iter()
            .enumerate()
            .filter(|(_, archive)| archive.kind != "perspective")
            .map(|(ordinal, row)| Wanted {
                ordinal,
                actor_id: &row.actor_id,
                kind: &row.kind,
                id: &row.id,
                revision: &row.revision,
            })
            .collect();
        let frame = input.reply_header_bytes().ok_or(StoreError::InvalidRecord)?;
        let mut wire = input
            .maximum_transfer_bytes
            .checked_sub(frame)
            .ok_or(StoreError::Capacity)?;
        let bytes = wanted.len().checked_mul(std::mem::size_of::<RestoreArchiveMatch>())
            .and_then(|n| n.checked_add(512))
            .and_then(|n| n.checked_add(input.binding.world_id.len()))
            .and_then(|n| n.checked_add(input.binding.generation.len()))
            .ok_or(StoreError::Capacity)?;
        let custody = self.budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
        let mut selected = Vec::new();
        selected.try_reserve_exact(wanted.len()).map_err(|_| StoreError::Capacity)?;
        if !wanted.is_empty() {
            let encoded = json_record(&wanted).map_err(|_| StoreError::InvalidRecord)?;
            let (_transfer, rows) = admitted_query_bounded(
                tx,
                &self.schema.checkpoint.archive_selection,
                &[&encoded, &input.binding.world_id],
                &self.budget,
                Some(&mut wire),
            )
            .await?;
            for row in rows {
                let index = usize::try_from(row.try_get::<_, i32>(0)?)
                    .map_err(|_| StoreError::InvalidRecord)?;
                if selected.len() == wanted.len() || input
                    .archives
                    .get(index)
                    .is_none_or(|archive| archive.kind == "perspective")
                {
                    return Err(StoreError::InvalidRecord);
                }
                let raw: &str = row.try_get(1)?;
                let category = match raw {
                    "optional" => Category::Optional,
                    "required" => Category::Required,
                    "speech" => Category::Speech,
                    _ => return Err(StoreError::InvalidRecord),
                };
                selected.push(RestoreArchiveMatch {
                    index: (input.offset + index) as u64,
                    category,
                });
            }
        }
        RuntimeProviderInput::restore_archives(request, selected, custody).map_err(|_| StoreError::Capacity)
    }

    /// Prepare restoration using current target authority. The caller supplies
    /// an authoritative privacy ledger, either durable or from a separately
    /// validated current installation. A checkpoint cannot supply that fact.
    pub(crate) fn prepare_restore_input(
        &self,
        current: RecoveryAuthority,
        history: &CheckpointHistory,
        timeline: &str,
        privacy: super::authority::AcceptedPrivacy,
    ) -> StoreResult<(RestoreInput, [ByteReservation; 2])> {
        #[derive(Deserialize)]
        struct Stored<'a> {
            world_id: &'a str,
            actor_id: &'a str,
            source_kind: &'a str,
            source_id: &'a str,
            revision: &'a str,
            #[serde(borrow)]
            payload: Cow<'a, str>,
            retention_class: Category,
        }
        if uuid::Uuid::parse_str(timeline).is_err() || current.timeline == timeline {
            return Err(StoreError::InvalidRecord);
        }
        let rows = history
            .tables
            .get("mind_source_versions")
            .ok_or(StoreError::InvalidRecord)?;
        let mut budget = self
            .budget
            .reserve(
                rows.len()
                    .checked_mul(size_of::<Archive>())
                    .and_then(|size| size.checked_add(timeline.len()))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let mut archives = Vec::with_capacity(rows.len());
        for stored in rows {
            let _parse = self
                .budget
                .reserve(SqlCell::json_decode_bound(stored.get()).ok_or(StoreError::InvalidRecord)?)
                .map_err(|_| StoreError::Capacity)?;
            let row: Stored<'_> =
                serde_json::from_str(stored.get()).map_err(|_| StoreError::InvalidRecord)?;
            if row.world_id != current.head.world_id
                || row.revision != sha256_hex(row.payload.as_bytes())
            {
                return Err(StoreError::InvalidRecord);
            }
            let retained = [row.actor_id, row.source_kind, row.source_id, row.revision]
                .into_iter()
                .try_fold(budget.bytes(), |n, value| n.checked_add(value.len()))
                .ok_or(StoreError::Capacity)?;
            budget.resize(retained).map_err(|_| StoreError::Capacity)?;
            archives.push(Archive {
                actor_id: row.actor_id.to_owned(),
                kind: row.source_kind.to_owned(),
                id: row.source_id.to_owned(),
                revision: row.revision.to_owned(),
                category: row.retention_class,
                bytes: u64::try_from(row.payload.len()).map_err(|_| StoreError::Capacity)?,
            });
        }
        // The externally selected storage contract still enters through its
        // canonical decoder. Only our already validated SQL data moves directly.
        let retention_preparation = serde_json::from_str(self.restore_retention_preparation().get())
            .map_err(|_| StoreError::InvalidRecord)?;
        let input = RestoreInput {
            privacy,
            metadata: RestoreMetadataInput {
                identity_floor: current.identity_floor,
                actor_owners: current.owners,
                world_grants: current.grants,
                privacy_revisions: current.privacy_revisions,
                namespace: timeline.to_owned(),
                archives,
            },
            retention_preparation,
        };
        Ok((input, [current.storage, budget]))
    }

    pub(super) fn encode_restore_output(
        &self,
        value: &impl Serialize,
        limit: usize,
    ) -> StoreResult<(String, ByteReservation)> {
        let length = json_record_len(value).map_err(|_| StoreError::InvalidRecord)?;
        let bytes = length
            .checked_mul(4)
            .filter(|_| length <= limit)
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let encoded = json_record(value).map_err(|_| StoreError::InvalidRecord)?;
        custody
            .resize(encoded.capacity())
            .map_err(|_| StoreError::Capacity)?;
        Ok((encoded, custody))
    }
}
