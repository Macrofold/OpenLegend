//! The stopped candidate selects complete, private canonical accounts using
//! the same bounded metadata and selected-body rules as the Source reader.

use super::archives::Category;
use super::provider::{self, Binding};
use crate::store::read::{admitted_query_bounded, append_current_record_fields, installed_row};
use crate::store::{DurableHead, Store, StoreError, StoreResult, ordinal};
use openlegend_simulation::experience::PersonalSourceKind as Kind;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::records::{InstalledRow, SqlCell};
use openlegend_simulation::runtime::{RuntimeProvider, RuntimeProviderInput};
use openlegend_simulation::text::{JsText, TextRef};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::collections::BTreeMap;
use tokio_postgres::{Transaction, types::Json};

const KINDS: [Kind; 3] = [Kind::Awareness, Kind::Memory, Kind::Summary];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    binding: Binding,
    phase: String,
    data: Box<RawValue>,
    maximum_transfer_bytes: usize,
    restore_projection: Box<RawValue>,
}

#[derive(Deserialize)]
struct Limits {
    accounts: AccountLimits,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AccountLimits {
    rows: usize,
    bytes: usize,
    metadata_rows: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MetadataRequest {
    world_id: String,
    generation: String,
    accepted_cut: u64,
    actor_id: String,
    at: f64,
    due: bool,
    pressured: Vec<Category>,
}

#[derive(Deserialize)]
struct Columns {
    source_id: String,
    account_revision: String,
    at: f64,
    logical_bytes: usize,
    retention_class: Category,
    next_due_at: Option<f64>,
    policy_priority: u64,
    active_or_protected: u8,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Account {
    kind: Kind,
    id: String,
    record_id: String,
    position: u64,
    revision: String,
    at: f64,
    bytes: usize,
    class: Category,
    due: Option<f64>,
    rank: u64,
    protected: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Metadata {
    metadata: Vec<Account>,
    next_due: Option<f64>,
    more: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RecordsRequest {
    actor_id: String,
    at: f64,
    selected: Vec<Account>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AccountRow {
    kind: Kind,
    row: InstalledRow,
    rendered_summary: Option<JsText>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Records {
    rows: Vec<AccountRow>,
    occupied_memory_ids: Vec<String>,
}

#[derive(Serialize)]
struct Answer<'a, T> {
    binding: &'a Binding,
    phase: &'a str,
    data: T,
}

impl Store {
    /// Apply the exact projection inside a savepoint before selecting the
    /// actor's retained rows. Only the independently funded answer survives.
    pub(crate) async fn answer_checkpoint_account_retention(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        request: &RuntimeProvider,
    ) -> StoreResult<RuntimeProviderInput> {
        let (question, _custody): (Request, _) =
            provider::prepare(self, request, "restore-retention")?;
        let actor = question
            .binding
            .actor_id
            .as_deref()
            .ok_or(StoreError::InvalidRecord)?;
        let limits = serde_json::from_str::<Limits>(self.restore_retention_preparation().get())
            .map_err(|_| StoreError::Schema)?
            .accounts;
        self.with_checkpoint_projection(
            tx,
            prospective,
            &question.restore_projection,
            false,
            async {
                match question.phase.as_str() {
                    "metadata" => {
                        let data: MetadataRequest = serde_json::from_str(question.data.get())
                            .map_err(|_| StoreError::InvalidRecord)?;
                        if data.world_id != prospective.world_id
                            || data.generation != prospective.generation
                            || data.accepted_cut != 0
                            || data.actor_id != actor
                            || !data.at.is_finite()
                            || data.pressured.len() > 3
                        {
                            return Err(StoreError::StaleCut);
                        }
                        provider::verify_header(
                            self,
                            tx,
                            prospective,
                            0,
                            &question.binding,
                            Some(data.at),
                        )
                        .await?;
                        self.checkpoint_account_metadata(tx, &question, data, &limits)
                            .await
                    }
                    "records" => {
                        let data: RecordsRequest = serde_json::from_str(question.data.get())
                            .map_err(|_| StoreError::InvalidRecord)?;
                        if data.actor_id != actor || !data.at.is_finite() {
                            return Err(StoreError::StaleCut);
                        }
                        provider::verify_header(
                            self,
                            tx,
                            prospective,
                            0,
                            &question.binding,
                            Some(data.at),
                        )
                        .await?;
                        self.checkpoint_account_records(tx, &question, data, &limits)
                            .await
                    }
                    _ => Err(StoreError::InvalidRecord),
                }
            },
        )
        .await
    }

    async fn checkpoint_account_metadata(
        &self,
        tx: &Transaction<'_>,
        question: &Request,
        data: MetadataRequest,
        limits: &AccountLimits,
    ) -> StoreResult<RuntimeProviderInput> {
        let pressure: Vec<_> = data.pressured.into_iter().map(Category::as_str).collect();
        let mut result = BTreeMap::new();
        let mut custody = Vec::with_capacity(KINDS.len());
        let mut next_due: Option<f64> = None;
        let mut more = false;
        for kind in KINDS {
            let (funds, rows) = admitted_query_bounded(
                tx,
                &self.schema.checkpoint.account_metadata[kind.table()],
                &[
                    &data.actor_id,
                    &data.at,
                    &data.due,
                    &pressure,
                    &data.world_id,
                ],
                &self.budget,
                None,
            )
            .await?;
            custody.push(funds);
            let mut due = 0;
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
                    "due" => due += 1,
                    "pressure" => {}
                    _ => return Err(StoreError::InvalidRecord),
                }
                let fields = row.try_get::<_, Json<Columns>>(5)?.0;
                let record_id: String = row.try_get(1)?;
                result.insert(
                    (kind, fields.source_id.clone()),
                    Account {
                        kind,
                        id: fields.source_id,
                        record_id,
                        position: ordinal(row.try_get(3)?)?,
                        revision: fields.account_revision,
                        at: fields.at,
                        bytes: fields.logical_bytes,
                        class: fields.retention_class,
                        due: fields.next_due_at,
                        rank: fields.policy_priority,
                        protected: fields.active_or_protected == 1,
                    },
                );
            }
            more |= due > limits.rows;
            if result.len() > limits.metadata_rows {
                return Err(StoreError::Capacity);
            }
        }
        self.encode_account_retention(
            question,
            Metadata {
                metadata: result.into_values().collect(),
                next_due,
                more,
            },
        )
    }

    async fn checkpoint_account_records(
        &self,
        tx: &Transaction<'_>,
        question: &Request,
        data: RecordsRequest,
        limits: &AccountLimits,
    ) -> StoreResult<RuntimeProviderInput> {
        if data.selected.len() > limits.rows
            || data
                .selected
                .iter()
                .try_fold(0usize, |n, account| n.checked_add(account.bytes))
                .is_none_or(|bytes| bytes > limits.bytes)
        {
            return Err(StoreError::Capacity);
        }
        let world = question.binding.world_id.as_str();
        let mut rows = Vec::with_capacity(data.selected.len());
        let mut custody: Vec<ByteReservation> = Vec::with_capacity(KINDS.len() + 1);
        let mut wire = question.maximum_transfer_bytes;
        for kind in KINDS {
            let wanted: BTreeMap<_, _> = data
                .selected
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
            let mut sql = String::from("SELECT ");
            append_current_record_fields(&mut sql, table, "");
            sql.push_str(" FROM ");
            sql.push_str(&table.name);
            sql.push_str(" WHERE world_id=$1 AND actor_id=$2 AND id=ANY($3::text[])");
            let (funds, selected) = admitted_query_bounded(
                tx,
                &sql,
                &[&world, &data.actor_id, &ids],
                &self.budget,
                Some(&mut wire),
            )
            .await?;
            custody.push(funds);
            if selected.len() != wanted.len() {
                return Err(StoreError::StaleCut);
            }
            for row in selected {
                let row = installed_row(table, row)?;
                if wanted
                    .get(row.id.as_str())
                    .is_none_or(|asked| asked.bytes != row.payload.len())
                {
                    return Err(StoreError::StaleCut);
                }
                let rendered_summary = if kind == Kind::Summary {
                    #[derive(Deserialize)]
                    struct Text {
                        text: JsText,
                    }
                    let _parser = self
                        .budget
                        .reserve(
                            SqlCell::json_decode_bound(&row.payload)
                                .ok_or(StoreError::InvalidRecord)?,
                        )
                        .map_err(|_| StoreError::Capacity)?;
                    let body: Text = serde_json::from_str(&row.payload)
                        .map_err(|_| StoreError::InvalidRecord)?;
                    let mut summary =
                        JsText::from(self.schema.checkpoint.summary_memory_prefix.as_str());
                    TextRef::from(&body.text).append_to(&mut summary);
                    Some(summary)
                } else {
                    None
                };
                rows.push(AccountRow {
                    kind,
                    row,
                    rendered_summary,
                });
            }
        }
        if rows.len() != data.selected.len() {
            return Err(StoreError::InvalidRecord);
        }
        let ids: Vec<_> = data
            .selected
            .iter()
            .filter(|row| row.kind != Kind::Memory)
            .map(|row| row.id.as_str())
            .collect();
        let occupied = if ids.is_empty() {
            Vec::new()
        } else {
            let (funds, selected) = admitted_query_bounded(
                tx,
                "SELECT source_id FROM mind_memories WHERE world_id=$1 AND actor_id=$2 AND source_id=ANY($3::text[])",
                &[&world, &data.actor_id, &ids],
                &self.budget,
                Some(&mut wire),
            ).await?;
            custody.push(funds);
            selected
                .into_iter()
                .map(|row| row.try_get(0).map_err(StoreError::from))
                .collect::<StoreResult<_>>()?
        };
        self.encode_account_retention(
            question,
            Records {
                rows,
                occupied_memory_ids: occupied,
            },
        )
    }

    fn encode_account_retention(
        &self,
        request: &Request,
        data: impl Serialize,
    ) -> StoreResult<RuntimeProviderInput> {
        let answer = Answer {
            binding: &request.binding,
            phase: &request.phase,
            data,
        };
        let (json, custody) =
            self.encode_restore_output(&answer, request.maximum_transfer_bytes)?;
        Ok(RuntimeProviderInput::new(json, custody))
    }
}
