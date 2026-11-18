//! Retained archive bodies stay with the checkpoint. Only bounded dependency
//! selections and their exact charges enter the inactive native candidate.

use super::provider::{self, Binding};
use super::{CheckpointHistory, RecoveryAuthority};
use crate::store::read::admitted_query_bounded;
use crate::store::{DurableHead, MAX_SAFE_INTEGER, Store, StoreError, StoreResult};
use openlegend_simulation::encoding::{json_record, json_record_len, sha256_hex};
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::SqlCell;
use openlegend_simulation::runtime::{RuntimeProvider, RuntimeProviderInput};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::borrow::Cow;
use tokio_postgres::Transaction;

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(super) enum Category {
    Optional,
    Required,
    Speech,
}

impl Category {
    pub(super) fn as_str(self) -> &'static str {
        match self {
            Self::Optional => "optional",
            Self::Required => "required",
            Self::Speech => "speech",
        }
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Archive {
    pub(super) actor_id: String,
    pub(super) kind: String,
    pub(super) id: String,
    pub(super) revision: String,
    pub(super) category: Category,
    pub(super) bytes: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Question {
    binding: Binding,
    offset: u64,
    archives: Vec<Archive>,
    maximum_transfer_bytes: usize,
    restore_projection: Box<RawValue>,
}

pub(crate) struct PreparedCheckpointArchives {
    input: Question,
    _custody: ByteReservation,
}

impl PreparedCheckpointArchives {
    pub(crate) fn projection(&self) -> &RawValue {
        &self.input.restore_projection
    }
}

#[derive(Serialize)]
struct Selected {
    index: u64,
    category: Category,
}

#[derive(Serialize)]
struct Answer<'a> {
    binding: &'a Binding,
    selected: Vec<Selected>,
}

pub(crate) struct RestoreInput {
    encoded: String,
    _custody: ByteReservation,
}

impl RestoreInput {
    pub(crate) fn bytes(&self) -> &[u8] {
        self.encoded.as_bytes()
    }
}

impl Store {
    /// Determine archive retention from the fully staged canonical account
    /// references at this ticket. Abandoned gameplay indexes cannot inform
    /// the replacement or prevent recovery when those indexes are damaged.
    pub(crate) async fn answer_checkpoint_archives(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        request: &RuntimeProvider,
    ) -> StoreResult<RuntimeProviderInput> {
        let prepared = self.prepare_checkpoint_archives(request)?;
        self.with_checkpoint_projection(
            tx,
            prospective,
            prepared.projection(),
            self.read_checkpoint_archives(tx, prospective, &prepared),
        )
        .await
    }

    pub(crate) fn prepare_checkpoint_archives(
        &self,
        request: &RuntimeProvider,
    ) -> StoreResult<PreparedCheckpointArchives> {
        let (input, custody) = provider::prepare(self, request, "restore-archives")?;
        Ok(PreparedCheckpointArchives {
            input,
            _custody: custody,
        })
    }

    /// Read only the exact archive references requested by the inactive native
    /// owner, from its prospective SQL cut. Never decode their private prose.
    pub(crate) async fn read_checkpoint_archives(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        prepared: &PreparedCheckpointArchives,
    ) -> StoreResult<RuntimeProviderInput> {
        let input = &prepared.input;
        provider::verify_header(self, tx, prospective, 0, &input.binding, None).await?;
        if input.archives.len() > self.schema.checkpoint.archive_rows
            || input
                .offset
                .checked_add(input.archives.len() as u64)
                .is_none_or(|end| end > MAX_SAFE_INTEGER)
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
        let mut answer = Answer {
            binding: &input.binding,
            selected: Vec::new(),
        };
        let frame = json_record_len(&answer).map_err(|_| StoreError::InvalidRecord)?;
        let mut wire = input
            .maximum_transfer_bytes
            .checked_sub(frame)
            .ok_or(StoreError::Capacity)?;
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
                if input
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
                answer.selected.push(Selected {
                    index: input.offset + index as u64,
                    category,
                });
            }
        }
        let (json, custody) = self.encode_restore_output(&answer, input.maximum_transfer_bytes)?;
        Ok(RuntimeProviderInput::new(json, custody))
    }

    /// Prepare restoration using current target authority. The caller supplies
    /// an authoritative privacy ledger, either durable or from a separately
    /// validated current installation. A checkpoint cannot supply that fact.
    pub(crate) fn prepare_restore_input(
        &self,
        current: &RecoveryAuthority,
        history: &CheckpointHistory,
        timeline: &str,
        privacy: &super::authority::AcceptedPrivacy,
    ) -> StoreResult<RestoreInput> {
        use super::authority::{AcceptedPrivacy, ActorOwner, WorldGrant};
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
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Metadata<'a> {
            identity_floor: u64,
            actor_owners: &'a [ActorOwner],
            world_grants: &'a [WorldGrant],
            privacy_revisions: &'a indexmap::IndexMap<String, u64>,
            namespace: &'a str,
            archives: Vec<Archive>,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Input<'a> {
            privacy: &'a AcceptedPrivacy,
            metadata: Metadata<'a>,
            retention_preparation: &'a RawValue,
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
                bytes: row.payload.len(),
            });
        }
        let input = Input {
            privacy,
            metadata: Metadata {
                identity_floor: current.identity_floor,
                actor_owners: &current.owners,
                world_grants: &current.grants,
                privacy_revisions: &current.privacy_revisions,
                namespace: timeline,
                archives,
            },
            retention_preparation: self.restore_retention_preparation(),
        };
        let (encoded, custody) = self.encode_restore_output(&input, MAX_SAFE_INTEGER as usize)?;
        Ok(RestoreInput {
            encoded,
            _custody: custody,
        })
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
