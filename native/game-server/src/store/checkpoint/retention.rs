//! The inactive candidate selects complete private accounts using the same
//! bounded metadata and body reads as the Source reader.

use super::archives::Category;
use super::provider;
use crate::store::read::admitted_query_bounded;
use crate::store::{DurableHead, Store, StoreError, StoreResult, ordinal};
use openlegend_simulation::experience::{AccountClass, PersonalSourceKind as Kind};
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::SqlCell;
use openlegend_simulation::runtime::{
    AccountBodiesReply, AccountBodyRow, AccountCandidate, AccountMetadataReply,
    RestoreAccountAnswer, RestoreAccountBinding, RestoreAccountQuery, RetentionPreparation,
    RuntimeProviderInput, RuntimeRestoreAccounts, render_account_summary,
};
use serde::Deserialize;
use serde_json::value::RawValue;
use std::collections::BTreeMap;
use std::mem::size_of;
use tokio_postgres::{Transaction, types::Json};

const KINDS: [Kind; 3] = [Kind::Awareness, Kind::Memory, Kind::Summary];

#[derive(Deserialize)]
struct Limits {
    accounts: RetentionPreparation,
}

#[derive(Deserialize)]
struct Columns {
    source_id: String,
    account_revision: String,
    at: f64,
    logical_bytes: u64,
    retention_class: Category,
    next_due_at: Option<f64>,
    policy_priority: u64,
    active_or_protected: u8,
}

impl Store {
    pub(crate) fn account_summary_prefix(&self) -> &str {
        &self.schema.checkpoint.summary_memory_prefix
    }

    pub(crate) fn account_retention_limits(&self) -> StoreResult<RetentionPreparation> {
        serde_json::from_str::<Limits>(self.restore_retention_preparation().get())
            .map(|limits| limits.accounts)
            .map_err(|_| StoreError::Schema)
    }

    /// Select accounts in the exact inactive cut. Only the independently
    /// funded answer survives the rollback of the prospective SQL savepoint.
    pub(crate) async fn answer_checkpoint_account_retention(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        request: &RuntimeRestoreAccounts,
    ) -> StoreResult<RuntimeProviderInput> {
        let (question, rows) = request.parts();
        let limits = self.account_retention_limits()?;
        self.with_checkpoint_rows(tx, prospective, rows, None, None, async {
            let at = match question.query {
                RestoreAccountQuery::Metadata { at, .. }
                | RestoreAccountQuery::Records { at, .. } => at,
            };
            provider::verify_header(self, tx, prospective, 0, question.binding, Some(at)).await?;
            let (answer, custody) = match question.query {
                RestoreAccountQuery::Metadata { at, due, pressured } => {
                    let pressure = pressured
                        .classes()
                        .filter_map(|class| match class {
                            AccountClass::Optional => Some(Category::Optional.as_str()),
                            AccountClass::Required => Some(Category::Required.as_str()),
                            AccountClass::Speech => Some(Category::Speech.as_str()),
                            AccountClass::Sensory => None,
                        })
                        .collect::<Vec<_>>();
                    let (reply, custody) = self
                        .checkpoint_account_metadata(
                            tx,
                            question.binding,
                            at,
                            due,
                            &pressure,
                            &limits,
                        )
                        .await?;
                    (RestoreAccountAnswer::Metadata(reply), custody)
                }
                RestoreAccountQuery::Records { selected, .. } => {
                    let (reply, custody) = self
                        .checkpoint_account_records(
                            tx,
                            question.binding,
                            selected,
                            &limits,
                            question.maximum_transfer_bytes,
                        )
                        .await?;
                    (RestoreAccountAnswer::Records(reply), custody)
                }
            };
            RuntimeProviderInput::restore_accounts(request, answer, custody).map_err(|error| {
                if error.is_capacity() {
                    StoreError::Capacity
                } else {
                    StoreError::InvalidRecord
                }
            })
        })
        .await
    }

    async fn checkpoint_account_metadata(
        &self,
        tx: &Transaction<'_>,
        binding: &RestoreAccountBinding,
        at: f64,
        due: bool,
        pressure: &[&str],
        limits: &RetentionPreparation,
    ) -> StoreResult<(AccountMetadataReply, ByteReservation)> {
        let mut result = BTreeMap::new();
        let mut custody = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        let mut next_due: Option<f64> = None;
        let mut more = false;
        for kind in KINDS {
            let (_wire, rows) = admitted_query_bounded(
                tx,
                &self.schema.checkpoint.account_metadata[kind.table()],
                &[&binding.actor_id, &at, &due, &pressure, &binding.world_id],
                &self.budget,
                None,
            )
            .await?;
            // Own the private tree while SQL rows and the decoded metadata
            // coexist. The reply later retains only the selected vector.
            let tree = rows
                .len()
                .checked_mul(
                    11 * size_of::<((Kind, String), AccountCandidate)>() + 16 * size_of::<usize>(),
                )
                .ok_or(StoreError::Capacity)?;
            Self::fund_restore_accounts(&mut custody, tree)?;
            let mut due_rows = 0;
            for row in rows {
                match row.try_get::<_, &str>(7)? {
                    "deadline" => {
                        #[derive(Deserialize)]
                        struct Deadline {
                            next_due_at: Option<f64>,
                        }
                        if let Some(deadline) = row.try_get::<_, Json<Deadline>>(5)?.0.next_due_at {
                            next_due = Some(next_due.map_or(deadline, |old| old.min(deadline)));
                        }
                        continue;
                    }
                    "due" => due_rows += 1,
                    "pressure" => {}
                    _ => return Err(StoreError::InvalidRecord),
                }
                let raw = row.try_get::<_, Json<&RawValue>>(5)?.0.get();
                let record_id: &str = row.try_get(1)?;
                let bound = SqlCell::json_decode_bound(raw).ok_or(StoreError::InvalidRecord)?;
                let mut decode = self
                    .budget
                    .reserve(bound)
                    .map_err(|_| StoreError::Capacity)?;
                let fields: Columns =
                    serde_json::from_str(raw).map_err(|_| StoreError::InvalidRecord)?;
                let fields_bytes = fields
                    .source_id
                    .capacity()
                    .checked_add(fields.source_id.len())
                    .and_then(|bytes| bytes.checked_add(fields.account_revision.capacity()))
                    .and_then(|bytes| bytes.checked_add(record_id.len()))
                    .ok_or(StoreError::Capacity)?;
                decode
                    .resize(fields_bytes)
                    .map_err(|_| StoreError::Capacity)?;
                custody.merge(decode).map_err(|_| StoreError::Capacity)?;
                result.insert(
                    (kind, fields.source_id.clone()),
                    AccountCandidate {
                        kind,
                        id: fields.source_id,
                        record_id: record_id.to_owned(),
                        position: ordinal(row.try_get(3)?)?,
                        revision: fields.account_revision,
                        at: fields.at,
                        bytes: fields.logical_bytes,
                        class: match fields.retention_class {
                            Category::Optional => AccountClass::Optional,
                            Category::Required => AccountClass::Required,
                            Category::Speech => AccountClass::Speech,
                        },
                        due: fields.next_due_at,
                        rank: fields.policy_priority,
                        protected: fields.active_or_protected == 1,
                    },
                );
            }
            more |= due_rows > limits.rows;
            if result.len() > limits.metadata_rows {
                return Err(StoreError::Capacity);
            }
        }
        let vector = result
            .len()
            .checked_mul(size_of::<AccountCandidate>())
            .ok_or(StoreError::Capacity)?;
        Self::fund_restore_accounts(&mut custody, vector)?;
        Ok((
            AccountMetadataReply {
                metadata: result.into_values().collect(),
                next_due,
                more,
            },
            custody,
        ))
    }

    async fn checkpoint_account_records(
        &self,
        tx: &Transaction<'_>,
        binding: &RestoreAccountBinding,
        requested: &[AccountCandidate],
        limits: &RetentionPreparation,
        mut wire: usize,
    ) -> StoreResult<(AccountBodiesReply, ByteReservation)> {
        if requested.len() > limits.rows
            || requested
                .iter()
                .try_fold(0u64, |n, account| n.checked_add(account.bytes))
                .is_none_or(|bytes| bytes > limits.bytes as u64)
        {
            return Err(StoreError::Capacity);
        }
        let workspace = requested
            .len()
            .checked_mul(11 * size_of::<(&str, &AccountCandidate)>() + 18 * size_of::<usize>())
            .ok_or(StoreError::Capacity)?;
        let _workspace = self
            .budget
            .reserve(workspace)
            .map_err(|_| StoreError::Capacity)?;
        let row_slots = requested
            .len()
            .checked_mul(size_of::<AccountBodyRow>())
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(row_slots)
            .map_err(|_| StoreError::Capacity)?;
        let mut rows = Vec::with_capacity(requested.len());
        for kind in KINDS {
            let wanted: BTreeMap<_, _> = requested
                .iter()
                .filter(|account| account.kind == kind)
                .map(|account| (account.record_id.as_str(), account))
                .collect();
            if wanted.is_empty() {
                continue;
            }
            let ids: Vec<_> = wanted.keys().copied().collect();
            let table = self
                .schema
                .tables
                .iter()
                .find(|table| table.name == kind.table())
                .ok_or(StoreError::Schema)?;
            let selected = self
                .select_current_rows_bounded(
                    tx,
                    table,
                    "world_id=$1 AND actor_id=$2 AND id=ANY($3::text[])",
                    &[&binding.world_id, &binding.actor_id, &ids],
                    &mut custody,
                    Some(&mut wire),
                )
                .await?;
            if selected.len() != wanted.len() {
                return Err(StoreError::StaleCut);
            }
            for row in selected {
                if wanted
                    .get(row.id.as_str())
                    .is_none_or(|asked| asked.bytes != row.payload.len() as u64)
                {
                    return Err(StoreError::StaleCut);
                }
                let rendered_summary = if kind == Kind::Summary {
                    let prefix = self.schema.checkpoint.summary_memory_prefix.as_str();
                    let (summary, rendered) =
                        render_account_summary(&row.payload, prefix, &self.budget).map_err(
                            |error| match error {
                                openlegend_simulation::experience::ExperienceError::Capacity => {
                                    StoreError::Capacity
                                }
                                _ => StoreError::InvalidRecord,
                            },
                        )?;
                    custody.merge(rendered).map_err(|_| StoreError::Capacity)?;
                    Some(summary)
                } else {
                    None
                };
                rows.push(AccountBodyRow {
                    kind,
                    row,
                    rendered_summary,
                });
            }
        }
        if rows.len() != requested.len() {
            return Err(StoreError::InvalidRecord);
        }
        let ids: Vec<_> = requested
            .iter()
            .filter(|row| row.kind != Kind::Memory)
            .map(|row| row.id.as_str())
            .collect();
        let occupied_memory_ids = if ids.is_empty() {
            Vec::new()
        } else {
            let (_wire, selected) = admitted_query_bounded(
                tx, "SELECT source_id FROM mind_memories WHERE world_id=$1 AND actor_id=$2 AND source_id=ANY($3::text[])",
                &[&binding.world_id, &binding.actor_id, &ids], &self.budget, Some(&mut wire),
            ).await?;
            let bytes = selected.iter().try_fold(0usize, |bytes, row| {
                let value: &str = row.try_get(0)?;
                bytes
                    .checked_add(size_of::<String>() + value.len())
                    .ok_or(StoreError::Capacity)
            })?;
            Self::fund_restore_accounts(&mut custody, bytes)?;
            selected
                .into_iter()
                .map(|row| row.try_get(0).map_err(StoreError::from))
                .collect::<StoreResult<_>>()?
        };
        Ok((
            AccountBodiesReply {
                rows,
                occupied_memory_ids,
            },
            custody,
        ))
    }

    fn fund_restore_accounts(custody: &mut ByteReservation, extra: usize) -> StoreResult<()> {
        let bytes = custody
            .bytes()
            .checked_add(extra)
            .ok_or(StoreError::Capacity)?;
        custody.resize(bytes).map_err(|_| StoreError::Capacity)
    }
}
