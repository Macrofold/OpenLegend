//! Exact private history for the existing native correction and forgetting
//! cursor. The caller owns the candidate's prospective SQL view and must
//! discard that view after this selection.

use super::provider::{self, Binding};
use crate::store::read::{admitted_query, admitted_query_bounded};
use crate::store::{DurableHead, MAX_SAFE_INTEGER, Store, StoreError, StoreResult, ordinal};
use openlegend_simulation::encoding::{json_record, json_record_len};
use openlegend_simulation::experience::parse_personal_fact_alias;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::received::{parse_temporal_receipt_id, receipt_source_bucket};
use openlegend_simulation::records::{InstalledRow, OwnerCoverage};
use openlegend_simulation::runtime::{RuntimeProvider, RuntimeProviderInput};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::collections::BTreeMap;
use std::sync::Arc;
use tokio_postgres::Transaction;
use tokio_postgres::types::ToSql;

#[derive(Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum Phase {
    Closure,
    Records,
    Verify,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Source {
    actor_id: String,
    source_id: String,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Predecessor {
    id: String,
    revision: u64,
}

#[derive(Default, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Totals {
    pages: u64,
    page_bytes: u64,
    source_bytes: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Question {
    binding: Binding,
    actor_id: String,
    phase: Phase,
    sources: Vec<Source>,
    resident_pages: Vec<String>,
    resident_values: Vec<String>,
    at: f64,
    max_age_seconds: f64,
    totals: Totals,
    maximum_transfer_bytes: usize,
    predecessors: Vec<Predecessor>,
    restore_projection: Option<Box<RawValue>>,
}

pub(crate) struct PreparedCheckpointHistory {
    input: Question,
    _custody: ByteReservation,
}

impl PreparedCheckpointHistory {
    pub(crate) fn projection(&self) -> &RawValue {
        self.input
            .restore_projection
            .as_deref()
            .expect("checked private restore projection")
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Answer<'a> {
    binding: &'a Binding,
    durable_revision: u64,
    selection: Vec<Source>,
    tables: BTreeMap<String, Vec<InstalledRow>>,
    owners: Vec<OwnerCoverage>,
    predecessors: Vec<Predecessor>,
    totals: Totals,
}

#[derive(Serialize)]
struct SqlSource<'a> {
    actor_id: &'a str,
    source_id: &'a str,
}

impl Store {
    /// Decode the actual private provider question under an independent
    /// allowance. No arbitrary serialized source can enter this preparation.
    pub(crate) fn prepare_checkpoint_history(
        &self,
        provider: &RuntimeProvider,
    ) -> StoreResult<PreparedCheckpointHistory> {
        let (input, custody): (Question, _) = provider::prepare(self, provider, "history")?;
        if input.restore_projection.is_none() {
            return Err(StoreError::InvalidRecord);
        }
        Ok(PreparedCheckpointHistory {
            input,
            _custody: custody,
        })
    }

    /// Query the exact prospective rows under the stopped writer's savepoint.
    /// SQL candidate buckets never stand in for native evidence validation.
    pub(crate) async fn read_checkpoint_history(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        prepared: &PreparedCheckpointHistory,
    ) -> StoreResult<RuntimeProviderInput> {
        self.read_history_at(tx, prospective, 0, &prepared.input)
            .await
    }

    /// The protected world caller holds one accepted turn and has flushed
    /// its exact predecessor. This live read reuses the restore selection
    /// without letting an awaited SQL snapshot drift to a later accepted cut.
    pub(crate) async fn read_live_personal_history(
        self: &Arc<Self>,
        provider: &RuntimeProvider,
        durable: DurableHead,
        accepted_cut: u64,
    ) -> StoreResult<RuntimeProviderInput> {
        self.assert_write_admission()?;
        let (request, custody): (Question, _) = provider::prepare(self, provider, "history")?;
        if request.restore_projection.is_some() {
            return Err(StoreError::InvalidRecord);
        }
        let store = Arc::clone(self);
        self.read_operational(move |tx| {
            Box::pin(async move {
                let _request_storage = custody;
                store
                    .read_history_at(tx, &durable, accepted_cut, &request)
                    .await
            })
        })
        .await
    }

    async fn read_history_at(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        accepted_cut: u64,
        request: &Question,
    ) -> StoreResult<RuntimeProviderInput> {
        verify_request(request)?;
        provider::verify_header(
            self,
            tx,
            prospective,
            accepted_cut,
            &request.binding,
            Some(request.at),
        )
        .await?;
        let mut custody = self
            .budget
            .reserve(4096)
            .map_err(|_| StoreError::Capacity)?;
        let mut answer = Answer {
            binding: &request.binding,
            durable_revision: prospective.revision,
            selection: Vec::new(),
            tables: BTreeMap::new(),
            owners: Vec::new(),
            predecessors: Vec::new(),
            totals: Totals::default(),
        };
        let frame = json_record_len(&answer).map_err(|_| StoreError::InvalidRecord)?;
        let mut wire = request
            .maximum_transfer_bytes
            .checked_sub(frame)
            .ok_or(StoreError::Capacity)?;
        if request.phase == Phase::Verify {
            let ids: Vec<&str> = request
                .predecessors
                .iter()
                .map(|row| row.id.as_str())
                .collect();
            answer.predecessors = self
                .history_predecessors(tx, &request.binding.world_id, &ids, &mut custody)
                .await?;
            let mut found: BTreeMap<_, _> = answer
                .predecessors
                .iter()
                .map(|row| (row.id.as_str(), row.revision))
                .collect();
            if answer.predecessors.len() != ids.len()
                || request
                    .predecessors
                    .iter()
                    .any(|wanted| found.remove(wanted.id.as_str()) != Some(wanted.revision))
                || !found.is_empty()
            {
                return Err(StoreError::StaleCut);
            }
            // Native requires the original request order as well as exact body revision.
            answer.predecessors.clear();
            for row in &request.predecessors {
                answer.predecessors.push(Predecessor {
                    id: row.id.clone(),
                    revision: row.revision,
                });
            }
        } else {
            let origin = crate::store::recall::native_origin_dependency_key();
            let scope: Vec<_> = request
                .sources
                .iter()
                .map(|source| SqlSource {
                    actor_id: &source.actor_id,
                    source_id: &source.source_id,
                })
                .collect();
            let roots = self.encode_history_query(&scope, &mut custody)?;
            let (mut storage, rows) = admitted_query_bounded(
                tx,
                &self.schema.checkpoint.history_edit.dependencies,
                &[&roots, &request.binding.world_id, &origin],
                &self.budget,
                Some(&mut wire),
            )
            .await?;
            for row in &rows {
                let actor_id: String = row.try_get(0)?;
                let source_id: String = row.try_get(1)?;
                if actor_id != request.actor_id || source_id.is_empty() {
                    return Err(StoreError::InvalidRecord);
                }
                answer.selection.push(Source {
                    actor_id,
                    source_id,
                });
            }
            drop(rows);
            let retained = answer
                .selection
                .iter()
                .try_fold(
                    answer
                        .selection
                        .capacity()
                        .checked_mul(size_of::<Source>())
                        .ok_or(StoreError::Capacity)?,
                    |bytes, source| {
                        bytes
                            .checked_add(source.actor_id.capacity())?
                            .checked_add(source.source_id.capacity())
                    },
                )
                .ok_or(StoreError::Capacity)?;
            storage.resize(retained).map_err(|_| StoreError::Capacity)?;
            custody.merge(storage).map_err(|_| StoreError::Capacity)?;
            answer.totals = request.totals;
            if request.phase == Phase::Closure {
                self.read_history_closure(tx, request, &mut answer, &mut custody, &mut wire)
                    .await?;
            } else {
                self.read_history_records(tx, request, &mut answer, &mut custody, &mut wire)
                    .await?;
            }
        }
        let bytes = json_record_len(&answer).map_err(|_| StoreError::InvalidRecord)?;
        if bytes > request.maximum_transfer_bytes {
            return Err(StoreError::Capacity);
        }
        let mut output = self
            .budget
            .reserve(bytes.checked_mul(4).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let serialized = json_record(&answer).map_err(|_| StoreError::InvalidRecord)?;
        output
            .resize(serialized.capacity())
            .map_err(|_| StoreError::Capacity)?;
        Ok(RuntimeProviderInput::new(serialized, output))
    }

    async fn read_history_closure(
        &self,
        tx: &Transaction<'_>,
        request: &Question,
        answer: &mut Answer<'_>,
        custody: &mut ByteReservation,
        wire: &mut usize,
    ) -> StoreResult<()> {
        #[derive(Serialize)]
        struct Alias<'a> {
            actor_id: &'a str,
            lookup_source_id: String,
            lookup_bucket: u16,
        }
        #[derive(Serialize)]
        struct Address<'a> {
            actor_id: &'a str,
            epoch: String,
            batch_order: u64,
            entry_index: u64,
            member_index: Option<u64>,
        }
        let workspace = answer
            .selection
            .iter()
            .try_fold(1024usize, |n, source| {
                n.checked_add(256)?
                    .checked_add(source.source_id.len().checked_mul(8)?)
            })
            .ok_or(StoreError::Capacity)?;
        let _selectors = self
            .budget
            .reserve(workspace)
            .map_err(|_| StoreError::Capacity)?;
        let mut aliases = Vec::new();
        let mut addresses = Vec::new();
        for source in &answer.selection {
            let fact = parse_personal_fact_alias(&source.source_id);
            let lookup = fact
                .as_ref()
                .map_or(source.source_id.as_str(), |(observation, _)| observation);
            if let Some(position) = parse_temporal_receipt_id(lookup) {
                addresses.push(Address {
                    actor_id: &source.actor_id,
                    epoch: position.epoch,
                    batch_order: position.batch_order,
                    entry_index: position.entry_index,
                    member_index: fact.as_ref().map(|(_, member)| *member),
                });
            } else {
                aliases.push(Alias {
                    actor_id: &source.actor_id,
                    lookup_source_id: lookup.to_owned(),
                    lookup_bucket: receipt_source_bucket(lookup),
                });
            }
        }
        let sql = &self.schema.checkpoint.history_edit;
        let world = &request.binding.world_id;
        let mut pages = BTreeMap::new();
        let mut page_scope = self.budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        if !aliases.is_empty() {
            let query = self.encode_history_query(&aliases, custody)?;
            self.history_page_ids(
                tx,
                &sql.alias_pages,
                &[
                    world,
                    &request.max_age_seconds,
                    &request.at,
                    &request.resident_pages,
                    &query,
                ],
                &mut pages,
                &mut page_scope,
            )
            .await?;
        }
        if !addresses.is_empty() {
            let query = self.encode_history_query(&addresses, custody)?;
            self.history_page_ids(
                tx,
                &sql.addressed_pages,
                &[&query, world, &request.resident_pages],
                &mut pages,
                &mut page_scope,
            )
            .await?;
        }
        answer.totals.pages = answer
            .totals
            .pages
            .checked_add(pages.len() as u64)
            .ok_or(StoreError::Capacity)?;
        answer.totals.page_bytes = pages
            .values()
            .try_fold(answer.totals.page_bytes, |n, bytes| n.checked_add(*bytes))
            .ok_or(StoreError::Capacity)?;
        if answer.totals.pages > sql.page_rows || answer.totals.page_bytes > sql.page_bytes {
            return Err(StoreError::Capacity);
        }
        if pages.is_empty() {
            if answer.totals.source_bytes > sql.source_bytes {
                return Err(StoreError::Capacity);
            }
            answer
                .tables
                .insert("mind_temporal_pages".to_owned(), Vec::new());
            answer
                .tables
                .insert("mind_perception_values".to_owned(), Vec::new());
            return Ok(());
        }
        let ids: Vec<_> = pages.keys().map(String::as_str).collect();
        let page_values = "WITH wanted AS MATERIALIZED (SELECT DISTINCT unnest(value_refs) AS source_id FROM mind_temporal_pages WHERE world_id=$1 AND id=ANY($2))";
        let size_query = format!(
            "{page_values} SELECT count(*),count(v.source_id),COALESCE(sum(octet_length(v.payload)),0)::bigint FROM wanted w LEFT JOIN mind_perception_values v ON v.world_id=$1 AND v.source_id=w.source_id WHERE NOT(w.source_id=ANY($3))"
        );
        let size = tx
            .query_one(&size_query, &[world, &ids, &request.resident_values])
            .await?;
        let count = ordinal(size.try_get(0)?)?;
        if count != ordinal(size.try_get(1)?)? {
            return Err(StoreError::InvalidRecord);
        }
        answer.totals.source_bytes = answer
            .totals
            .source_bytes
            .checked_add(ordinal(size.try_get(2)?)?)
            .ok_or(StoreError::Capacity)?;
        if answer.totals.source_bytes > sql.source_bytes {
            return Err(StoreError::Capacity);
        }
        let rows = self
            .history_records(
                tx,
                "mind_temporal_pages",
                "world_id=$1 AND id=ANY($2)",
                &[world, &ids],
                custody,
                wire,
            )
            .await?;
        let uses = "world_id=$1 AND source_id IN (SELECT DISTINCT unnest(value_refs) FROM mind_temporal_pages WHERE world_id=$1 AND id=ANY($2)) AND NOT(source_id=ANY($3))";
        let values = self
            .history_records(
                tx,
                "mind_perception_values",
                uses,
                &[world, &ids, &request.resident_values],
                custody,
                wire,
            )
            .await?;
        if rows.len() != ids.len() || values.len() as u64 != count {
            return Err(StoreError::StaleCut);
        }
        answer.predecessors = self.history_predecessors(tx, world, &ids, custody).await?;
        if answer.predecessors.len() != ids.len() {
            return Err(StoreError::StaleCut);
        }
        answer.tables.insert("mind_temporal_pages".to_owned(), rows);
        answer
            .tables
            .insert("mind_perception_values".to_owned(), values);
        Ok(())
    }

    async fn read_history_records(
        &self,
        tx: &Transaction<'_>,
        request: &Question,
        answer: &mut Answer<'_>,
        custody: &mut ByteReservation,
        wire: &mut usize,
    ) -> StoreResult<()> {
        let scope: Vec<_> = answer
            .selection
            .iter()
            .map(|source| SqlSource {
                actor_id: &source.actor_id,
                source_id: &source.source_id,
            })
            .collect();
        let scope = self.encode_history_query(&scope, custody)?;
        let world = &request.binding.world_id;
        let appraisal = json_record(&["world", "appraisals", &request.actor_id])
            .map_err(|_| StoreError::InvalidRecord)?;
        for table in [
            "mind_awareness",
            "mind_memories",
            "mind_summaries",
            "activity_occurrences",
            "mind_appraisals",
        ] {
            let rows = if table == "mind_appraisals" {
                self.history_records(
                    tx,
                    table,
                    "world_id=$1 AND parent_id=$2",
                    &[world, &appraisal],
                    custody,
                    wire,
                )
                .await?
            } else {
                let sql = format!(
                    "world_id=$1 AND EXISTS (SELECT 1 FROM jsonb_to_recordset($2::text::jsonb) d(actor_id text,source_id text) WHERE d.actor_id={table}.actor_id AND d.source_id={table}.source_id)"
                );
                self.history_records(tx, table, &sql, &[world, &scope], custody, wire)
                    .await?
            };
            answer.tables.insert(table.to_owned(), rows);
            let selection = format!(
                "SELECT o.id,(SELECT position FROM {table} t WHERE t.world_id=o.world_id AND t.parent_id=o.id ORDER BY position DESC LIMIT 1) AS last FROM {table}_owners o WHERE o.world_id=$1 AND o.slot=$2"
            );
            let (storage, rows) = admitted_query_bounded(
                tx,
                &selection,
                &[world, &request.actor_id],
                &self.budget,
                Some(wire),
            )
            .await?;
            for row in rows {
                let last: Option<i64> = row.try_get(1)?;
                let next_ordinal = match last {
                    Some(last) => ordinal(last)?
                        .checked_add(1)
                        .filter(|next| *next <= MAX_SAFE_INTEGER)
                        .ok_or(StoreError::InvalidRecord)?,
                    None => 0,
                };
                answer.owners.push(OwnerCoverage {
                    table: table.to_owned(),
                    owner: row.try_get(0)?,
                    complete: table == "mind_appraisals",
                    next_ordinal,
                    parent_present: true,
                });
            }
            custody.merge(storage).map_err(|_| StoreError::Capacity)?;
        }
        Ok(())
    }

    fn encode_history_query(
        &self,
        value: &impl Serialize,
        custody: &mut ByteReservation,
    ) -> StoreResult<String> {
        let size = json_record_len(value).map_err(|_| StoreError::InvalidRecord)?;
        let bytes = size.checked_mul(4).ok_or(StoreError::Capacity)?;
        let mut storage = self
            .budget
            .reserve(bytes)
            .map_err(|_| StoreError::Capacity)?;
        let query = json_record(value).map_err(|_| StoreError::InvalidRecord)?;
        storage
            .resize(query.capacity())
            .map_err(|_| StoreError::Capacity)?;
        custody.merge(storage).map_err(|_| StoreError::Capacity)?;
        Ok(query)
    }

    async fn history_records(
        &self,
        tx: &Transaction<'_>,
        table: &str,
        predicate: &str,
        params: &[&(dyn ToSql + Sync)],
        custody: &mut ByteReservation,
        wire: &mut usize,
    ) -> StoreResult<Vec<InstalledRow>> {
        let table = self
            .schema
            .tables
            .iter()
            .find(|entry| entry.name == table)
            .ok_or(StoreError::Schema)?;
        self.select_current_rows_bounded(tx, table, predicate, params, custody, Some(wire))
            .await
    }

    async fn history_page_ids(
        &self,
        tx: &Transaction<'_>,
        sql: &str,
        params: &[&(dyn ToSql + Sync)],
        pages: &mut BTreeMap<String, u64>,
        custody: &mut ByteReservation,
    ) -> StoreResult<()> {
        let (storage, rows) = admitted_query(tx, sql, params, &self.budget).await?;
        for row in rows {
            let id: String = row.try_get(0)?;
            let bytes = ordinal(row.try_get(1)?)?;
            if pages
                .insert(id, bytes)
                .is_some_and(|before| before != bytes)
            {
                return Err(StoreError::StaleCut);
            }
        }
        custody.merge(storage).map_err(|_| StoreError::Capacity)?;
        Ok(())
    }

    async fn history_predecessors(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        ids: &[&str],
        custody: &mut ByteReservation,
    ) -> StoreResult<Vec<Predecessor>> {
        let (storage, rows) = admitted_query(
            tx, "SELECT id,revision FROM mind_temporal_pages WHERE world_id=$1 AND id=ANY($2) ORDER BY parent_id,position,id", &[&world,&ids], &self.budget,
        ).await?;
        let result = rows
            .into_iter()
            .map(|row| {
                Ok(Predecessor {
                    id: row.try_get(0)?,
                    revision: ordinal(row.try_get(1)?)?,
                })
            })
            .collect::<StoreResult<Vec<_>>>()?;
        custody.merge(storage).map_err(|_| StoreError::Capacity)?;
        Ok(result)
    }
}

fn verify_request(request: &Question) -> StoreResult<()> {
    if [
        request.totals.pages,
        request.totals.page_bytes,
        request.totals.source_bytes,
    ]
    .into_iter()
    .any(|value| value > MAX_SAFE_INTEGER)
        || request.actor_id.is_empty()
        || !request.at.is_finite()
        || request.at < 0.0
        || !request.max_age_seconds.is_finite()
        || request.max_age_seconds < 0.0
        || (request.phase != Phase::Verify && !request.predecessors.is_empty())
        || request
            .predecessors
            .iter()
            .any(|row| row.id.is_empty() || row.revision > MAX_SAFE_INTEGER)
        || request
            .sources
            .iter()
            .any(|source| source.actor_id != request.actor_id || source.source_id.is_empty())
        || request
            .resident_values
            .iter()
            .chain(&request.resident_pages)
            .any(String::is_empty)
    {
        return Err(StoreError::InvalidRecord);
    }
    Ok(())
}
