//! Read the current canonical format without constructing another world. Size
//! each exact selection inside its owning snapshot, before body transfer.

use super::schema::{SqlType, Table};
use super::{DurableHead, Store, StoreError, StoreResult, durable_head, ordinal, sql_ordinal};
use openlegend_simulation::events::OriginalOccurrenceInput;
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use openlegend_simulation::records::{
    CurrentRecords, EntityOrdering, EntityOrderingEntry, InstalledRow, OwnerCoverage, SqlCell,
};
use serde::de::{DeserializeSeed, IgnoredAny, MapAccess, Visitor};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::collections::{BTreeMap, HashMap};
use std::future::Future;
use std::mem::size_of;
use std::pin::Pin;
use tokio_postgres::types::ToSql;
use tokio_postgres::{IsolationLevel, Row, Transaction};

pub struct CurrentOpening {
    pub records: CurrentRecords,
    pub originals: Vec<OriginalOccurrenceInput>,
    pub custody: ByteReservation,
}

/// These are the existing receipt fields, including the distinct read-only
/// recovery fingerprint. The public result is retained as its original bytes.
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GameplayReceipt {
    pub id: String,
    pub epoch: u64,
    pub fingerprint: String,
    #[serde(deserialize_with = "Deserialize::deserialize")]
    pub recovery_fingerprint: Option<String>,
    pub expires_at: u64,
    pub result: Box<RawValue>,
}

pub struct AdmittedReceipt {
    receipt: GameplayReceipt,
    _custody: ByteReservation,
}

impl AdmittedReceipt {
    pub fn receipt(&self) -> &GameplayReceipt {
        &self.receipt
    }
}

impl GameplayReceipt {
    pub(crate) fn validate(&self) -> StoreResult<()> {
        #[derive(Deserialize)]
        struct RequiredResult {
            #[serde(rename = "ok")]
            _ok: bool,
            #[serde(rename = "code")]
            _code: openlegend_simulation::text::JsText,
            #[serde(rename = "message")]
            _message: openlegend_simulation::text::JsText,
            #[serde(rename = "jobId", default, deserialize_with = "present_text")]
            _job_id: Option<openlegend_simulation::text::JsText>,
            #[serde(rename = "itemId", default, deserialize_with = "present_text")]
            _item_id: Option<openlegend_simulation::text::JsText>,
            #[serde(rename = "recipeId", default, deserialize_with = "present_text")]
            _recipe_id: Option<openlegend_simulation::text::JsText>,
            #[serde(rename = "goalId", default, deserialize_with = "present_text")]
            _goal_id: Option<openlegend_simulation::text::JsText>,
            #[serde(rename = "planId", default, deserialize_with = "present_text")]
            _plan_id: Option<openlegend_simulation::text::JsText>,
            #[serde(rename = "actionId", default, deserialize_with = "present_text")]
            _action_id: Option<openlegend_simulation::text::JsText>,
        }
        fn present_text<'de, D: serde::Deserializer<'de>>(
            deserializer: D,
        ) -> Result<Option<openlegend_simulation::text::JsText>, D::Error> {
            Deserialize::deserialize(deserializer).map(Some)
        }
        sql_ordinal(self.epoch)?;
        sql_ordinal(self.expires_at)?;
        if self.id.is_empty()
            || self.fingerprint.is_empty()
            || self
                .recovery_fingerprint
                .as_ref()
                .is_some_and(String::is_empty)
        {
            return Err(StoreError::InvalidRecord);
        }
        let _: RequiredResult =
            serde_json::from_str(self.result.get()).map_err(|_| StoreError::InvalidRecord)?;
        Ok(())
    }
}

impl Store {
    /// Read finite application-owned records in an independent fixed snapshot.
    /// This confers no gameplay source authority; the caller owns its final
    /// session/grant check. Variable bodies use the existing transfer preflight.
    pub(crate) async fn read_operational<R>(
        &self,
        work: impl for<'a> FnOnce(
            &'a Transaction<'a>,
        ) -> Pin<Box<dyn Future<Output = StoreResult<R>> + Send + 'a>>,
    ) -> StoreResult<R> {
        let mut reader = self.reader.lock().await;
        let transaction = reader
            .client
            .build_transaction()
            .read_only(true)
            .isolation_level(IsolationLevel::RepeatableRead)
            .start()
            .await?;
        let result = work(&transaction).await?;
        transaction.commit().await?;
        Ok(result)
    }

    pub async fn current_head(&self) -> StoreResult<Option<DurableHead>> {
        let reader = self.reader.lock().await;
        durable_head(&reader.client).await
    }

    /// Load actual complete canonical records in one fixed snapshot. Normal
    /// gameplay readers should use a scoped cut, not this startup selection.
    pub async fn current_opening(&self) -> StoreResult<Option<CurrentOpening>> {
        let mut reader = self.reader.lock().await;
        let transaction = reader
            .client
            .build_transaction()
            .read_only(true)
            .isolation_level(IsolationLevel::RepeatableRead)
            .start()
            .await?;
        let Some(head) = durable_head(&transaction).await? else {
            transaction.commit().await?;
            return Ok(None);
        };
        let maintenance = transaction
            .query_opt(
                "SELECT 1 FROM ops_maintenance WHERE world_id=$1 \
             AND payload::jsonb->>'status' IN ('scheduled','active') LIMIT 1",
                &[&head.world_id],
            )
            .await?;
        if maintenance.is_some() {
            return Err(StoreError::Maintenance);
        }
        self.validate_received(&transaction, &head.world_id).await?;
        let initial = self
            .schema
            .tables
            .len()
            .checked_mul(512)
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(initial)
            .map_err(|_| StoreError::Capacity)?;
        let mut tables = BTreeMap::new();
        for table in &self.schema.tables {
            let query = current_select(table);
            let params: &[&(dyn ToSql + Sync)] = &[&head.world_id];
            let (_wire, rows) = admitted_query(&transaction, &query, params, &self.budget).await?;
            grow(&mut custody, allocation::<InstalledRow>(rows.len())?)?;
            let mut records = Vec::with_capacity(rows.len());
            for row in rows {
                let mut decode = self
                    .budget
                    .reserve(installed_row_bound(table, &row)?)
                    .map_err(|_| StoreError::Capacity)?;
                let record = installed_row(table, row)?;
                let retained = record.retained_bytes().ok_or(StoreError::Capacity)?;
                release_workspace(&mut decode, retained)?;
                custody.merge(decode).map_err(|_| StoreError::Capacity)?;
                records.push(record);
            }
            tables.insert(table.name.clone(), records);
        }
        let originals = {
            #[derive(Deserialize)]
            struct Pointer<'a> {
                id: &'a str,
            }
            let hot = &tables["world_hot_events"];
            let _ids = self
                .budget
                .reserve(
                    hot.iter()
                        .try_fold(0usize, |bytes, row| {
                            bytes
                                .checked_add(64)?
                                .checked_add(row.payload.len().checked_mul(4)?)
                        })
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            let ids = hot
                .iter()
                .map(|row| {
                    serde_json::from_str::<Pointer<'_>>(&row.payload)
                        .map(|pointer| pointer.id)
                        .map_err(|_| StoreError::InvalidRecord)
                })
                .collect::<StoreResult<Vec<_>>>()?;
            if ids.is_empty() {
                Vec::new()
            } else {
                let (_wire, rows) = admitted_query(
                    &transaction,
                    "SELECT id,payload FROM history_events WHERE world_id=$1 AND id=ANY($2) ORDER BY position,id",
                    &[&head.world_id, &ids],
                    &self.budget,
                ).await?;
                if rows.len() != ids.len() {
                    return Err(StoreError::InvalidRecord);
                }
                let body = rows.iter().try_fold(
                    allocation::<OriginalOccurrenceInput>(rows.len())?,
                    |bytes, row| {
                        let id = text_bytes(row, 0)?;
                        let payload = text_bytes(row, 1)?;
                        bytes
                            .checked_add(id)
                            .and_then(|bytes| bytes.checked_add(payload))
                            .ok_or(StoreError::Capacity)
                    },
                )?;
                grow(&mut custody, body)?;
                rows.into_iter()
                    .map(|row| {
                        Ok(OriginalOccurrenceInput {
                            event_id: row.try_get(0)?,
                            payload: row.try_get(1)?,
                        })
                    })
                    .collect::<StoreResult<Vec<_>>>()?
            }
        };
        transaction.commit().await?;
        let records = self.opening_records(head, tables, &mut custody)?;
        Ok(Some(CurrentOpening {
            records,
            originals,
            custody,
        }))
    }

    fn opening_records(
        &self,
        head: DurableHead,
        tables: BTreeMap<String, Vec<InstalledRow>>,
        custody: &mut ByteReservation,
    ) -> StoreResult<CurrentRecords> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Header<'a> {
            id: &'a str,
            next_id: u64,
        }
        let header: Header<'_> = serde_json::from_str(
            &tables["world_settings"]
                .iter()
                .find(|row| row.id == "[\"world\"]")
                .ok_or(StoreError::InvalidRecord)?
                .payload,
        )
        .map_err(|_| StoreError::InvalidRecord)?;
        if header.id != head.world_id {
            return Err(StoreError::InvalidRecord);
        }
        sql_ordinal(header.next_id)?;
        let children = self
            .schema
            .tables
            .iter()
            .try_fold(0usize, |size, table| {
                let bytes = tables[&table.name].iter().try_fold(0usize, |bytes, row| {
                    table.children.iter().try_fold(bytes, |bytes, child| {
                        bytes.checked_add(160 + row.id.len() + child.table.len())
                    })
                })?;
                size.checked_add(bytes)
            })
            .ok_or(StoreError::Capacity)?;
        custody
            .resize(
                custody
                    .bytes()
                    .checked_add(children)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let mut coverage = Vec::new();
        for table in &self.schema.tables {
            for child in &table.children {
                let mut next = HashMap::new();
                for row in &tables[&child.table] {
                    let successor = row
                        .position
                        .checked_add(1)
                        .ok_or(StoreError::InvalidRecord)?;
                    let ordinal = next.entry(row.parent.as_str()).or_insert(0);
                    *ordinal = (*ordinal).max(successor);
                }
                for parent in &tables[&table.name] {
                    let value = child_presence(&parent.payload, &child.field)?;
                    let high = next.get(parent.id.as_str()).copied().unwrap_or(0);
                    if (!value && high > 0) || high > super::MAX_SAFE_INTEGER {
                        return Err(StoreError::InvalidRecord);
                    }
                    coverage.push(OwnerCoverage {
                        table: child.table.clone(),
                        owner: parent.id.clone(),
                        complete: true,
                        next_ordinal: if child.order_by_identity {
                            header.next_id
                        } else {
                            high
                        },
                        parent_present: value,
                    });
                }
            }
        }
        let entities = self
            .schema
            .tables
            .iter()
            .find(|table| table.name == "sim_entities")
            .ok_or(StoreError::Schema)?;
        let id_column = entities
            .columns
            .iter()
            .position(|column| column.name == "entity_id")
            .ok_or(StoreError::Schema)?;
        let ids = tables["sim_entities"].iter().map(|row| {
            row.extra[id_column]
                .as_str()
                .ok_or(StoreError::InvalidRecord)
        });
        let entity_ordering = entity_ordering(ids, tables["sim_entities"].len(), custody)?;
        // Text normalizations remain owned by the prepared installation. Until
        // those supported SQL owners are linked, refuse positive saved rows.
        if !tables["sim_intentions"].is_empty() || !tables["activity_methods"].is_empty() {
            return Err(StoreError::InvalidRecord);
        }
        Ok(CurrentRecords {
            world_id: head.world_id,
            database_schema: self.schema.version.clone(),
            durable_revision: head.revision,
            generation: head.generation,
            entity_ordering,
            normalized_intents: Vec::new(),
            activity_method_signatures: Vec::new(),
            tables,
            coverage,
        })
    }

    /// The exact selection runs once for sizing, and only a hit sends a body.
    /// A retained hit owns its own allocation after the snapshot closes.
    pub async fn command_receipt(
        &self,
        world_id: &str,
        id: &str,
    ) -> StoreResult<Option<AdmittedReceipt>> {
        let mut reader = self.reader.lock().await;
        let transaction = reader
            .client
            .build_transaction()
            .read_only(true)
            .isolation_level(IsolationLevel::RepeatableRead)
            .start()
            .await?;
        let (mut custody, mut rows) = admitted_query(
            &transaction,
            "SELECT epoch,expires_at,payload FROM gameplay_receipts WHERE world_id=$1 AND id=$2",
            &[&world_id, &id],
            &self.budget,
        )
        .await?;
        transaction.commit().await?;
        let Some(row) = rows.pop() else {
            return Ok(None);
        };
        let payload: &str = row.try_get(2)?;
        let receipt: GameplayReceipt =
            serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
        receipt.validate()?;
        if !rows.is_empty()
            || receipt.id != id
            || receipt.epoch != ordinal(row.try_get(0)?)?
            || receipt.expires_at != ordinal(row.try_get(1)?)?
        {
            return Err(StoreError::InvalidRecord);
        }
        drop(row);
        drop(rows);
        let retained = [
            size_of::<AdmittedReceipt>(),
            receipt.id.capacity(),
            receipt.fingerprint.capacity(),
            receipt
                .recovery_fingerprint
                .as_ref()
                .map_or(0, String::capacity),
            receipt.result.get().len(),
        ]
        .into_iter()
        .try_fold(0usize, usize::checked_add)
        .ok_or(StoreError::Capacity)?;
        release_workspace(&mut custody, retained)?;
        Ok(Some(AdmittedReceipt {
            receipt,
            _custody: custody,
        }))
    }
}

async fn admitted_query(
    transaction: &Transaction<'_>,
    selection: &str,
    params: &[&(dyn ToSql + Sync)],
    budget: &ByteBudget,
) -> StoreResult<(ByteReservation, Vec<Row>)> {
    let statement = format!(
        "SELECT count(*),COALESCE(sum(octet_length(row_to_json(selected)::text)),0)::bigint FROM ({selection}) selected"
    );
    let bound = transaction.query_one(&statement, params).await?;
    let count = usize::try_from(ordinal(bound.try_get(0)?)?).map_err(|_| StoreError::Capacity)?;
    if count == 0 {
        let empty = budget.reserve(0).map_err(|_| StoreError::Capacity)?;
        return Ok((empty, Vec::new()));
    }
    let bytes = usize::try_from(ordinal(bound.try_get(1)?)?).map_err(|_| StoreError::Capacity)?;
    // Wire buffers and driver row descriptors can overlap. The decoder admits
    // shape-dependent carrier storage separately before building a Rust graph.
    let bytes = bytes
        .checked_mul(16)
        .and_then(|total| total.checked_add(count.checked_mul(1024)?))
        .ok_or(StoreError::Capacity)?;
    let allowance = budget.reserve(bytes).map_err(|_| StoreError::Capacity)?;
    let rows = transaction.query(selection, params).await?;
    if rows.len() != count {
        return Err(StoreError::StaleCut);
    }
    Ok((allowance, rows))
}

fn current_select(table: &Table) -> String {
    let mut select = String::from("SELECT ");
    append_current_record_fields(&mut select, table, "");
    for column in &table.columns {
        if matches!(
            column.data_type,
            SqlType::TextArray | SqlType::SmallIntegerArray
        ) {
            select.push_str(&format!(
                ",cardinality({0})::bigint AS {0}_length,octet_length({0}::text)::bigint AS {0}_bytes",
                column.name,
            ));
        }
    }
    select.push_str(&format!(
        " FROM {} WHERE world_id=$1 ORDER BY parent_id,position,id",
        table.name
    ));
    select
}

/// Use the canonical positional projection for any exact typed row read.
/// Joined selectors can qualify their trusted table alias without changing
/// how SQL JSON cells are transferred for the shared row decoder.
pub(super) fn append_current_record_fields(select: &mut String, table: &Table, qualifier: &str) {
    for (index, name) in ["id", "parent_id", "slot", "position", "payload"].iter().enumerate() {
        if index != 0 {
            select.push(',');
        }
        select.push_str(qualifier);
        select.push_str(name);
    }
    for column in &table.columns {
        select.push(',');
        select.push_str(qualifier);
        select.push_str(&column.name);
        if matches!(column.data_type, SqlType::Json) {
            select.push_str("::text");
        }
    }
}

pub(super) fn installed_row(table: &Table, row: Row) -> StoreResult<InstalledRow> {
    let mut extra = Vec::with_capacity(table.columns.len());
    for (offset, column) in table.columns.iter().enumerate() {
        extra.push(cell(&row, 5 + offset, column.data_type)?);
    }
    Ok(InstalledRow {
        id: row.try_get(0)?,
        parent: row.try_get(1)?,
        slot: row.try_get(2)?,
        position: ordinal(row.try_get(3)?)?,
        payload: row.try_get(4)?,
        extra,
    })
}

fn installed_row_bound(table: &Table, row: &Row) -> StoreResult<usize> {
    let mut bound = allocation::<SqlCell>(table.columns.len())?;
    for index in [0, 1, 2, 4] {
        bound = bound
            .checked_add(text_bytes(row, index)?)
            .ok_or(StoreError::Capacity)?;
    }
    let mut metric = 5 + table.columns.len();
    for (index, column) in table.columns.iter().enumerate() {
        let bytes = match column.data_type {
            SqlType::Text => text_bytes(row, index + 5)?,
            SqlType::Json => {
                let source: Option<&str> = row.try_get(index + 5)?;
                source
                    .map_or(Some(0), SqlCell::json_decode_bound)
                    .ok_or(StoreError::Capacity)?
            }
            SqlType::TextArray | SqlType::SmallIntegerArray => {
                let count = unsigned_measure(row, metric)?;
                let text = unsigned_measure(row, metric + 1)?;
                metric += 2;
                // Driver Vec<T> and the converted Vec<SqlCell> can coexist;
                // reserve their growth plus the actual selected string body.
                let element = match column.data_type {
                    SqlType::TextArray => size_of::<String>(),
                    _ => size_of::<i16>(),
                };
                count
                    .checked_mul(4 * (size_of::<SqlCell>() + element))
                    .and_then(|bytes| bytes.checked_add(text))
                    .ok_or(StoreError::Capacity)?
            }
            _ => 0,
        };
        bound = bound.checked_add(bytes).ok_or(StoreError::Capacity)?;
    }
    Ok(bound)
}

fn allocation<T>(count: usize) -> StoreResult<usize> {
    count
        .checked_mul(size_of::<T>())
        .ok_or(StoreError::Capacity)
}

fn text_bytes(row: &Row, at: usize) -> StoreResult<usize> {
    Ok(row.try_get::<_, Option<&str>>(at)?.map_or(0, str::len))
}

fn unsigned_measure(row: &Row, at: usize) -> StoreResult<usize> {
    let value: Option<i64> = row.try_get(at)?;
    usize::try_from(value.unwrap_or_default()).map_err(|_| StoreError::Capacity)
}

fn grow(custody: &mut ByteReservation, extra: usize) -> StoreResult<()> {
    custody
        .resize(
            custody
                .bytes()
                .checked_add(extra)
                .ok_or(StoreError::Capacity)?,
        )
        .map_err(|_| StoreError::Capacity)
}

fn release_workspace(custody: &mut ByteReservation, retained: usize) -> StoreResult<()> {
    if retained > custody.bytes() {
        return Err(StoreError::Capacity);
    }
    custody.resize(retained).map_err(|_| StoreError::Capacity)
}

fn cell(row: &Row, at: usize, data_type: SqlType) -> StoreResult<SqlCell> {
    let value = match data_type {
        SqlType::Text => row.try_get::<_, Option<String>>(at)?.map(SqlCell::from),
        SqlType::Integer => {
            let value: Option<i64> = row.try_get(at)?;
            if value.is_some_and(|value| value.unsigned_abs() > super::MAX_SAFE_INTEGER) {
                return Err(StoreError::InvalidRecord);
            }
            value.map(|value| SqlCell::Number(value.into()))
        }
        SqlType::Double => {
            let value: Option<f64> = row.try_get(at)?;
            if value.is_some_and(|value| !value.is_finite()) {
                return Err(StoreError::InvalidRecord);
            }
            value.map(SqlCell::from)
        }
        SqlType::Json => row
            .try_get::<_, Option<&str>>(at)?
            .map(serde_json::from_str)
            .transpose()
            .map_err(|_| StoreError::InvalidRecord)?,
        SqlType::TextArray => row
            .try_get::<_, Option<Vec<String>>>(at)?
            .map(|array| SqlCell::Array(array.into_iter().map(SqlCell::from).collect())),
        SqlType::SmallIntegerArray => row.try_get::<_, Option<Vec<i16>>>(at)?.map(|array| {
            SqlCell::Array(
                array
                    .into_iter()
                    .map(|value| SqlCell::Number(value.into()))
                    .collect(),
            )
        }),
    };
    Ok(value.unwrap_or(SqlCell::Null))
}

fn child_presence(payload: &str, field: &str) -> StoreResult<bool> {
    if field == "$" {
        return Ok(payload != "null");
    }
    struct Child<'a>(&'a str);
    impl<'de> DeserializeSeed<'de> for Child<'_> {
        type Value = bool;
        fn deserialize<D: serde::Deserializer<'de>>(self, reader: D) -> Result<bool, D::Error> {
            reader.deserialize_map(self)
        }
    }
    impl<'de> Visitor<'de> for Child<'_> {
        type Value = bool;
        fn expecting(&self, buffer: &mut std::fmt::Formatter) -> std::fmt::Result {
            buffer.write_str("a canonical parent record")
        }
        fn visit_map<M: MapAccess<'de>>(self, mut fields: M) -> Result<bool, M::Error> {
            let mut present = false;
            while let Some(key) = fields.next_key::<&str>()? {
                if key == self.0 {
                    present = fields.next_value::<&RawValue>()?.get() != "null";
                } else {
                    fields.next_value::<IgnoredAny>()?;
                }
            }
            Ok(present)
        }
    }
    let mut decoder = serde_json::Deserializer::from_str(payload);
    let present = Child(field)
        .deserialize(&mut decoder)
        .map_err(|_| StoreError::InvalidRecord)?;
    decoder.end().map_err(|_| StoreError::InvalidRecord)?;
    Ok(present)
}

fn entity_ordering<'a>(
    ids: impl Iterator<Item = StoreResult<&'a str>>,
    count: usize,
    custody: &mut ByteReservation,
) -> StoreResult<EntityOrdering> {
    let mut next_insertion = 0;
    grow(custody, allocation::<EntityOrderingEntry>(count)?)?;
    let mut entries = Vec::with_capacity(count);
    for id in ids {
        let id = id?;
        // The padded key is at most 18 ASCII characters. format!'s backing
        // can grow while it emits the fixed decimal representation.
        grow(
            custody,
            id.len().checked_add(48).ok_or(StoreError::Capacity)?,
        )?;
        let numeric = id.parse::<u32>().ok().filter(|value| {
            *value < u32::MAX
                && (id == "0" || !id.starts_with('0'))
                && id.bytes().all(|byte| byte.is_ascii_digit())
        });
        let key = if let Some(value) = numeric {
            format!("0/{value:010}")
        } else {
            let position = next_insertion;
            next_insertion += 1;
            format!("1/{position:016}")
        };
        entries.push(EntityOrderingEntry {
            id: id.to_owned(),
            key,
        });
    }
    entries.sort_unstable_by(|left, right| left.key.cmp(&right.key));
    Ok(EntityOrdering {
        next_insertion,
        entries,
    })
}
