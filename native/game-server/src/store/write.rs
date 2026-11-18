//! One exact SQL transaction per detached native prefix. PostgreSQL sees typed
//! parameters derived from the actual immutable row bodies, with no addon packet.

use super::read::GameplayReceipt;
use super::schema::{FIXED_COLUMNS, SqlType, Table};
use super::{Session, Store, StoreError, StoreResult, durable_head, sql_ordinal};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use openlegend_simulation::records::{ChangedRow, ChangedRows, InstalledRow, SaveRows, SqlCell};
use openlegend_simulation::runtime::{RuntimeSave, RuntimeSaveAcknowledgement};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::fmt;
use std::fmt::Write as _;
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio_postgres::Transaction;
use tokio_postgres::types::{ToSql, Type};

// Same ordered writer byte and parameter batch limits as sql-rows.ts.
const PARAMETER_LIMIT: usize = 10_000;
pub(super) const BATCH_BYTES: usize = 262_144;
const DELETE_ROWS: usize = 800;

/// Derived and operational rows belong to the same database transaction as
/// their exact native prefix. The projection is prepared by the acceptance
/// owner and sees only its actual funded candidate/cut, not a newer world.
pub trait PrefixProjection: Sync {
    fn before_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> impl Future<Output = StoreResult<()>> + Send;

    fn after_records(
        &self,
        transaction: &Transaction<'_>,
        rows: &SaveRows,
        revision: u64,
    ) -> impl Future<Output = StoreResult<()>> + Send;
}

#[derive(Debug)]
pub enum CommitError {
    RolledBack(StoreError),
    Unknown(StoreError),
}

pub(super) struct PreparedSaveCommit {
    acknowledgement: RuntimeSaveAcknowledgement,
    receipts: [u8; 32],
    _custody: ByteReservation,
}

impl fmt::Display for CommitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RolledBack(error) => write!(f, "Save did not commit. {error}"),
            Self::Unknown(_) => f.write_str("PostgreSQL commit outcome is unknown. Recover its durable result before admitting play"),
        }
    }
}
impl std::error::Error for CommitError {}

// Cancellation after the database may have received COMMIT cannot be treated
// as rollback. Preserve the prefix and close live admission even if the future
// is dropped instead of returning an error.
struct CommitFence<'a> {
    admitted: &'a AtomicBool,
    confirmed: bool,
}
impl Drop for CommitFence<'_> {
    fn drop(&mut self) {
        if !self.confirmed {
            self.admitted.store(false, Ordering::Release);
        }
    }
}

impl Store {
    /// Use the one locked writer for a bounded operational transaction. Its
    /// effects and the result cannot outlive the transaction's custody.
    pub(crate) async fn operational<R>(
        &self,
        work: impl for<'a> FnOnce(
            &'a Transaction<'a>,
        ) -> Pin<Box<dyn Future<Output = StoreResult<R>> + Send + 'a>>,
    ) -> Result<R, CommitError> {
        self.assert_write_admission()
            .map_err(CommitError::RolledBack)?;
        let mut session = self.writer.lock().await;
        self.assert_write_admission()
            .map_err(CommitError::RolledBack)?;
        let transaction = session
            .client
            .transaction()
            .await
            .map_err(|cause| CommitError::RolledBack(cause.into()))?;
        match work(&transaction).await {
            Ok(result) => {
                self.commit(transaction).await?;
                Ok(result)
            }
            Err(error) => Err(self.rollback(transaction, error).await),
        }
    }

    async fn commit(&self, transaction: Transaction<'_>) -> Result<(), CommitError> {
        let mut fence = CommitFence {
            admitted: &self.admitted,
            confirmed: false,
        };
        transaction
            .commit()
            .await
            .map_err(|cause| CommitError::Unknown(cause.into()))?;
        fence.confirmed = true;
        Ok(())
    }

    async fn rollback(&self, transaction: Transaction<'_>, error: StoreError) -> CommitError {
        match transaction.rollback().await {
            Ok(()) => CommitError::RolledBack(error),
            Err(cause) => {
                self.admitted.store(false, Ordering::Release);
                CommitError::Unknown(cause.into())
            }
        }
    }

    /// Persist the fixed ordinary or protected prefix and its existing archive
    /// plan. The caller retains the immutable save through COMMIT and applies
    /// the exact returned acknowledgement before releasing its products.
    pub async fn commit_save(
        &self,
        save: &RuntimeSave,
        receipts: &[GameplayReceipt],
        projection: &impl PrefixProjection,
    ) -> Result<RuntimeSaveAcknowledgement, CommitError> {
        self.commit_rows(save.rows(), Some(save), receipts, projection)
            .await
    }

    /// Apply raw prepared rows for the direct repository checks. Runtime callers
    /// use `commit_save` to carry the real save handle's exact archive plans.
    pub async fn commit_prefix(
        &self,
        rows: &SaveRows,
        receipts: &[GameplayReceipt],
        projection: &impl PrefixProjection,
    ) -> Result<RuntimeSaveAcknowledgement, CommitError> {
        self.commit_rows(rows, None, receipts, projection).await
    }

    async fn commit_rows(
        &self,
        rows: &SaveRows,
        save: Option<&RuntimeSave>,
        receipts: &[GameplayReceipt],
        projection: &impl PrefixProjection,
    ) -> Result<RuntimeSaveAcknowledgement, CommitError> {
        self.assert_write_admission()
            .map_err(CommitError::RolledBack)?;
        self.validate_rows(&rows.changes)
            .map_err(CommitError::RolledBack)?;
        let revision = rows
            .base_revision
            .checked_add(1)
            .ok_or(CommitError::RolledBack(StoreError::InvalidRecord))?;
        let base = sql_ordinal(rows.base_revision).map_err(CommitError::RolledBack)?;
        let sql_revision = sql_ordinal(revision).map_err(CommitError::RolledBack)?;
        let _binding = self
            .budget
            .reserve(rows.world_id.len() + rows.generation.len() + 256)
            .map_err(|_| CommitError::RolledBack(StoreError::Capacity))?;
        let mut session = self.writer.lock().await;
        self.assert_write_admission()
            .map_err(CommitError::RolledBack)?;
        let Session {
            client,
            uncertain_save,
            ..
        } = &mut *session;
        let transaction = client
            .transaction()
            .await
            .map_err(|cause| CommitError::RolledBack(cause.into()))?;
        let result = async {
            let advanced = transaction
                .execute(
                    "UPDATE world_head SET revision=$4 WHERE id=1 AND world_id=$1 \
                 AND generation=$2 AND revision=$3",
                    &[&rows.world_id, &rows.generation, &base, &sql_revision],
                )
                .await?;
            if advanced != 1 {
                return Err(StoreError::StaleCut);
            }
            let receipt_digest = self
                .write_receipts(&transaction, &rows.world_id, receipts)
                .await?;
            projection
                .before_records(&transaction, rows, revision)
                .await?;
            if let Some(save) = save {
                self.apply_archives(&transaction, save).await?;
            }
            self.write_records(&transaction, &rows.world_id, sql_revision, &rows.changes)
                .await?;
            self.project_support_places(&transaction, &rows.world_id, &rows.changes)
                .await?;
            projection
                .after_records(&transaction, rows, revision)
                .await?;
            self.project_received(&transaction, &rows.world_id, sql_revision, &rows.changes)
                .await?;
            Ok(receipt_digest)
        }
        .await;
        let receipts = match result {
            Ok(receipts) => receipts,
            Err(error) => return Err(self.rollback(transaction, error).await),
        };
        // Retain the witness before COMMIT can be sent. Dropping the caller
        // while awaiting COMMIT leaves this exact prefix fenced for recovery.
        *uncertain_save = Some(PreparedSaveCommit {
            acknowledgement: RuntimeSaveAcknowledgement {
                world_id: rows.world_id.clone(),
                generation: rows.generation.clone(),
                prefix: rows.prefix,
                base_revision: rows.base_revision,
                revision,
                through_cut: rows.through_cut,
                identity_through: rows.identity_through,
            },
            receipts,
            _custody: _binding,
        });
        self.commit(transaction).await?;
        Ok(uncertain_save
            .take()
            .expect("fresh commit witness")
            .acknowledgement)
    }

    /// Resolve an uncertain save only on the original, still-locked writer.
    /// `Some` is the confirmed ACK to apply without writing again. `None`
    /// confirms rollback, so the exact original prefix can be retried. An
    /// unresolved outcome or a lost writer session leaves admission closed.
    pub async fn reconcile_prefix(
        &self,
        rows: &SaveRows,
        receipts: &[GameplayReceipt],
    ) -> StoreResult<Option<RuntimeSaveAcknowledgement>> {
        let mut session = self.writer.lock().await;
        if self.admitted.load(Ordering::Acquire)
            || !self.writer_connected.load(Ordering::Acquire)
            || session.client.is_closed()
        {
            return Err(StoreError::WriterUnavailable);
        }
        let Session {
            client,
            uncertain_save,
            ..
        } = &mut *session;
        let pending = uncertain_save
            .as_ref()
            .ok_or(StoreError::WriterUnavailable)?;
        let expected = &pending.acknowledgement;
        if expected.world_id != rows.world_id
            || expected.generation != rows.generation
            || expected.prefix != rows.prefix
            || expected.base_revision != rows.base_revision
            || expected.through_cut != rows.through_cut
            || expected.identity_through != rows.identity_through
        {
            return Err(StoreError::StaleCut);
        }
        let transaction = client.transaction().await?;
        let head = durable_head(&transaction)
            .await?
            .ok_or(StoreError::StaleCut)?;
        if head.world_id != expected.world_id || head.generation != expected.generation {
            return Err(StoreError::StaleCut);
        }
        let committed = if head.revision == expected.revision {
            true
        } else if head.revision == expected.base_revision {
            false
        } else {
            return Err(StoreError::StaleCut);
        };
        let mut digest = Sha256::new();
        for chunk in receipts.chunks(128) {
            let _receipt_custody = reserve_receipts(&self.budget, chunk)?;
            let mut ids = Vec::with_capacity(chunk.len());
            let mut payloads = Vec::with_capacity(chunk.len());
            for receipt in chunk {
                let payload = receipt_payload(receipt, &mut digest)?;
                ids.push(receipt.id.as_str());
                payloads.push(payload);
            }
            let matches: i64 = if committed {
                transaction.query_one(
                    "SELECT count(*) FROM gameplay_receipts r JOIN unnest($2::text[],$3::text[]) q(id,payload) \
                     ON r.id=q.id AND r.payload=q.payload WHERE r.world_id=$1",
                    &[&expected.world_id, &ids, &payloads],
                ).await?.try_get(0)?
            } else {
                transaction
                    .query_one(
                        "SELECT count(*) FROM gameplay_receipts WHERE world_id=$1 AND id=ANY($2)",
                        &[&expected.world_id, &ids],
                    )
                    .await?
                    .try_get(0)?
            };
            if matches != if committed { chunk.len() as i64 } else { 0 } {
                return Err(StoreError::StaleCut);
            }
        }
        let actual: [u8; 32] = digest.finalize().into();
        if actual != pending.receipts {
            return Err(StoreError::StaleCut);
        }
        transaction.commit().await?;
        let resolved = uncertain_save.take().expect("reconciled writer witness");
        self.admitted.store(true, Ordering::Release);
        Ok(committed.then_some(resolved.acknowledgement))
    }

    fn validate_rows(&self, changes: &ChangedRows) -> StoreResult<()> {
        let checked = changes
            .writes
            .keys()
            .chain(changes.deletes.keys())
            .chain(changes.expired.keys());
        for name in checked {
            if !self.schema.tables.iter().any(|table| &table.name == name) {
                return Err(StoreError::Schema);
            }
        }
        for table in &self.schema.tables {
            for row in changes.writes.get(&table.name).into_iter().flatten() {
                sql_ordinal(row.position)?;
                if row.extra.len() != table.columns.len() {
                    return Err(StoreError::InvalidRecord);
                }
                if let Some(mask) = &row.write_columns {
                    if row.create
                        || mask.is_empty()
                        || mask.iter().enumerate().any(|(at, name)| {
                            mask[..at].contains(name)
                                || !table.columns.iter().any(|column| &column.name == name)
                        })
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                }
            }
        }
        Ok(())
    }

    async fn write_records(
        &self,
        transaction: &Transaction<'_>,
        world_id: &str,
        revision: i64,
        changes: &ChangedRows,
    ) -> StoreResult<()> {
        // Preserve schema preorder and source row order where another unique
        // index can make order meaningful. Group only independently shaped rows.
        for table in &self.schema.tables {
            let Some(rows) = changes.writes.get(&table.name) else {
                continue;
            };
            let preparation = rows.len().checked_mul(48).ok_or(StoreError::Capacity)?;
            let _groups = self
                .budget
                .reserve(preparation)
                .map_err(|_| StoreError::Capacity)?;
            let mut groups: Vec<Vec<&ChangedRow>> = Vec::new();
            for row in rows {
                let compatible = |peer: &ChangedRow| {
                    row.create == peer.create && row.write_columns == peer.write_columns
                };
                let group = if table.ordered_writes {
                    groups.last_mut().filter(|group| compatible(group[0]))
                } else {
                    groups.iter_mut().find(|group| compatible(group[0]))
                };
                if let Some(group) = group {
                    group.push(row);
                } else {
                    groups.push(vec![row]);
                }
            }
            for group in groups {
                write_group(transaction, table, world_id, revision, &group, &self.budget).await?;
            }
        }
        // Placement edges use a restrictive physical foreign key. Move
        // survivors before deleting the edges of removed entities, as Source does.
        if let Some(removed) = changes.deletes.get("sim_entities") {
            for chunk in removed.chunks(DELETE_ROWS) {
                let _temporary = reserve_delete(&self.budget, world_id, chunk)?;
                transaction
                    .execute(
                        "DELETE FROM sim_placements WHERE world_id=$1 AND parent_id=ANY($2)",
                        &[&world_id, &chunk],
                    )
                    .await?;
            }
        }
        // Deleting children before parents maintains their structural ownership;
        // placement edges above are the additional non-cascade foreign keys.
        for table in self.schema.tables.iter().rev() {
            if let Some(removed) = changes.deletes.get(&table.name) {
                let sql = format!(
                    "DELETE FROM {} WHERE world_id=$1 AND id=ANY($2)",
                    table.name
                );
                for chunk in removed.chunks(DELETE_ROWS) {
                    let _temporary = reserve_delete(&self.budget, world_id, chunk)?;
                    transaction.execute(&sql, &[&world_id, &chunk]).await?;
                }
            }
        }
        Ok(())
    }

    async fn write_receipts(
        &self,
        transaction: &Transaction<'_>,
        world_id: &str,
        receipts: &[GameplayReceipt],
    ) -> StoreResult<[u8; 32]> {
        let mut digest = Sha256::new();
        for chunk in receipts.chunks(128) {
            let _temporary = reserve_receipts(&self.budget, chunk)?;
            let mut payloads = Vec::with_capacity(chunk.len());
            let mut ids = Vec::with_capacity(chunk.len());
            let mut epochs = Vec::with_capacity(chunk.len());
            let mut expiry = Vec::with_capacity(chunk.len());
            for receipt in chunk {
                payloads.push(receipt_payload(receipt, &mut digest)?);
                ids.push(receipt.id.as_str());
                epochs.push(sql_ordinal(receipt.epoch)?);
                expiry.push(sql_ordinal(receipt.expires_at)?);
            }
            transaction.execute(
                "INSERT INTO gameplay_receipts(world_id,id,epoch,expires_at,payload) \
                 SELECT $1,id,epoch,expires_at,payload \
                 FROM unnest($2::text[],$3::bigint[],$4::bigint[],$5::text[]) r(id,epoch,expires_at,payload)",
                &[&world_id,&ids,&epochs,&expiry,&payloads],
            ).await?;
        }
        Ok(digest.finalize().into())
    }
}

fn receipt_payload(receipt: &GameplayReceipt, digest: &mut Sha256) -> StoreResult<String> {
    receipt.validate()?;
    let value = serde_json::to_string(receipt).map_err(|_| StoreError::InvalidRecord)?;
    digest.update((value.len() as u64).to_be_bytes());
    digest.update(value.as_bytes());
    Ok(value)
}

fn reserve_receipts(
    budget: &ByteBudget,
    receipts: &[GameplayReceipt],
) -> StoreResult<ByteReservation> {
    let bytes = receipts
        .iter()
        .try_fold(0usize, |size, receipt| {
            size.checked_add(receipt.result.get().len())?
                .checked_add(receipt.id.len())?
                .checked_add(receipt.fingerprint.len())?
                .checked_add(receipt.recovery_fingerprint.as_ref().map_or(0, String::len))?
                .checked_add(512)
        })
        .and_then(|bytes| bytes.checked_mul(12))
        .ok_or(StoreError::Capacity)?;
    budget.reserve(bytes).map_err(|_| StoreError::Capacity)
}

fn reserve_delete(
    budget: &ByteBudget,
    world_id: &str,
    ids: &[String],
) -> StoreResult<ByteReservation> {
    let bytes = ids
        .iter()
        .try_fold(world_id.len() + 512, |size, id| {
            size.checked_add(id.len() + 16)
        })
        .and_then(|bytes| bytes.checked_mul(2))
        .ok_or(StoreError::Capacity)?;
    budget.reserve(bytes).map_err(|_| StoreError::Capacity)
}

struct WriteShape<'a> {
    columns: Vec<(&'a str, SqlType)>,
    extras: Vec<usize>,
    create: bool,
    masked: bool,
}
impl<'a> WriteShape<'a> {
    fn for_row(table: &'a Table, row: &ChangedRow) -> StoreResult<Self> {
        let Some(mask) = row.write_columns.as_ref() else {
            return Ok(Self::full(table, row.create));
        };
        let mut columns = vec![FIXED_COLUMNS[0], FIXED_COLUMNS[1], FIXED_COLUMNS[5]];
        let mut extras = Vec::new();
        for name in mask {
            let at = table
                .columns
                .iter()
                .position(|column| &column.name == name)
                .ok_or(StoreError::InvalidRecord)?;
            let column = &table.columns[at];
            columns.push((column.name.as_str(), column.data_type));
            extras.push(at);
        }
        Ok(Self {
            columns,
            extras,
            create: row.create,
            masked: true,
        })
    }

    fn full(table: &'a Table, create: bool) -> Self {
        Self {
            columns: FIXED_COLUMNS
                .into_iter()
                .chain(
                    table
                        .columns
                        .iter()
                        .map(|column| (column.name.as_str(), column.data_type)),
                )
                .collect(),
            extras: (0..table.columns.len()).collect(),
            create,
            masked: false,
        }
    }

    fn statement(&self, table: &Table, count: usize) -> String {
        let columns = self
            .columns
            .iter()
            .map(|(name, _)| *name)
            .collect::<Vec<_>>()
            .join(",");
        let mut values = String::new();
        let mut parameter = 1;
        for index in 0..count {
            if index != 0 {
                values.push(',');
            }
            values.push('(');
            for (at, (_, data_type)) in self.columns.iter().enumerate() {
                if at != 0 {
                    values.push(',');
                }
                write!(values, "${parameter}").expect("string write");
                if matches!(data_type, SqlType::Json) {
                    values.push_str("::text::jsonb");
                }
                parameter += 1;
            }
            values.push(')');
        }
        if self.masked {
            let set = self.columns[2..]
                .iter()
                .map(|(name, _)| format!("{name}=incoming.{name}"))
                .collect::<Vec<_>>()
                .join(",");
            format!(
                "UPDATE {} target SET {set} FROM (VALUES {values}) incoming({columns}) \
                     WHERE target.world_id=incoming.world_id AND target.id=incoming.id",
                table.name
            )
        } else {
            let mut sql = format!("INSERT INTO {} ({columns}) VALUES {values}", table.name);
            if !self.create {
                let set = self.columns[2..]
                    .iter()
                    .map(|(name, _)| format!("{name}=excluded.{name}"))
                    .collect::<Vec<_>>()
                    .join(",");
                write!(sql, " ON CONFLICT(world_id,id) DO UPDATE SET {set}").expect("string write");
            }
            sql
        }
    }
}

/// The position and payload are already funded by their native save or
/// current-format checkpoint. The SQL binder borrows the original bytes.
struct RecordForWrite<'a> {
    id: &'a str,
    parent: &'a str,
    slot: &'a str,
    position: u64,
    payload: &'a str,
    extra: &'a [SqlCell],
}

impl<'a> From<&'a ChangedRow> for RecordForWrite<'a> {
    fn from(row: &'a ChangedRow) -> Self {
        Self {
            id: &row.id,
            parent: &row.parent,
            slot: &row.slot,
            position: row.position,
            payload: &row.payload,
            extra: &row.extra,
        }
    }
}

impl<'a> From<&'a InstalledRow> for RecordForWrite<'a> {
    fn from(row: &'a InstalledRow) -> Self {
        Self {
            id: &row.id,
            parent: &row.parent,
            slot: &row.slot,
            position: row.position,
            payload: &row.payload,
            extra: &row.extra,
        }
    }
}

async fn write_group(
    transaction: &Transaction<'_>,
    table: &Table,
    world_id: &str,
    revision: i64,
    group: &[&ChangedRow],
    budget: &ByteBudget,
) -> StoreResult<()> {
    write_rows(
        transaction,
        table,
        world_id,
        revision,
        WriteShape::for_row(table, group[0])?,
        group.len(),
        |index| group[index].into(),
        budget,
    )
    .await
}

pub(super) async fn insert_checkpoint_rows(
    transaction: &Transaction<'_>,
    table: &Table,
    world_id: &str,
    revision: i64,
    rows: &[InstalledRow],
    budget: &ByteBudget,
) -> StoreResult<()> {
    if rows.is_empty() {
        return Ok(());
    }
    write_rows(
        transaction,
        table,
        world_id,
        revision,
        WriteShape::full(table, true),
        rows.len(),
        |index| (&rows[index]).into(),
        budget,
    )
    .await
}

async fn write_rows<'a>(
    transaction: &Transaction<'_>,
    table: &Table,
    world_id: &str,
    revision: i64,
    shape: WriteShape<'_>,
    count: usize,
    row: impl Fn(usize) -> RecordForWrite<'a> + Sync,
    budget: &ByteBudget,
) -> StoreResult<()> {
    let columns = shape.columns.len();
    let mut from = 0;
    while from < count {
        let mut through = from;
        let mut bytes = 0usize;
        while through < count {
            let row = row(through);
            let extra = shape
                .extras
                .iter()
                .try_fold(0usize, |bytes, index| {
                    bytes.checked_add(cell_bound(&row.extra[*index])?)
                })
                .ok_or(StoreError::Capacity)?;
            let size = world_id.len()
                + row.id.len()
                + columns * 16
                + extra
                + if shape.masked {
                    0
                } else {
                    row.parent.len() + row.slot.len() + row.payload.len()
                };
            if through != from
                && (bytes.checked_add(size).ok_or(StoreError::Capacity)? > BATCH_BYTES
                    || (through - from + 1) * columns > PARAMETER_LIMIT)
            {
                break;
            }
            bytes = bytes.checked_add(size).ok_or(StoreError::Capacity)?;
            through += 1;
        }
        let count = through - from;
        let scratch = bytes
            .checked_mul(4)
            .and_then(|bytes| bytes.checked_add(count * columns * 128 + 4096))
            .ok_or(StoreError::Capacity)?;
        let _temporary = budget.reserve(scratch).map_err(|_| StoreError::Capacity)?;
        let sql = shape.statement(table, count);
        let mut values = Vec::with_capacity(count * columns);
        for index in from..through {
            let row = row(index);
            values.push(Bind::text(world_id));
            values.push(Bind::text(row.id));
            if !shape.masked {
                values.push(Bind::text(row.parent));
                values.push(Bind::text(row.slot));
                values.push(Bind::Integer(Some(sql_ordinal(row.position)?)));
            }
            values.push(Bind::Integer(Some(revision)));
            if !shape.masked {
                values.push(Bind::text(row.payload));
            }
            for index in &shape.extras {
                values.push(Bind::cell(
                    &row.extra[*index],
                    table.columns[*index].data_type,
                )?);
            }
        }
        let params: Vec<(&(dyn ToSql + Sync), Type)> = values
            .iter()
            .zip(shape.columns.iter().cycle())
            .map(|(value, (_, data_type))| (value.param(), data_type.parameter()))
            .collect();
        // Client execute_typed avoids a separate statement preparation for each
        // batch shape, including variable-size final batches.
        let written = transaction.execute_typed(&sql, &params).await?;
        if written != count as u64 {
            return Err(StoreError::StaleCut);
        }
        from = through;
    }
    Ok(())
}

enum Bind<'a> {
    Text(Option<Cow<'a, str>>),
    Integer(Option<i64>),
    Double(Option<f64>),
    TextArray(Option<Vec<&'a str>>),
    SmallIntegerArray(Option<Vec<i16>>),
}
impl<'a> Bind<'a> {
    fn text(value: &'a str) -> Self {
        Self::Text(Some(Cow::Borrowed(value)))
    }
    fn cell(value: &'a SqlCell, data_type: SqlType) -> StoreResult<Self> {
        if value.is_null() {
            return Ok(match data_type {
                SqlType::Text | SqlType::Json => Self::Text(None),
                SqlType::Integer => Self::Integer(None),
                SqlType::Double => Self::Double(None),
                SqlType::TextArray => Self::TextArray(None),
                SqlType::SmallIntegerArray => Self::SmallIntegerArray(None),
            });
        }
        let invalid = || StoreError::InvalidRecord;
        Ok(match data_type {
            SqlType::Text => Self::text(value.as_str().ok_or_else(invalid)?),
            SqlType::Integer => Self::Integer(Some(
                value
                    .as_i64()
                    .filter(|value| value.unsigned_abs() <= super::MAX_SAFE_INTEGER)
                    .ok_or_else(invalid)?,
            )),
            SqlType::Double => Self::Double(Some(value.as_f64().ok_or_else(invalid)?)),
            SqlType::Json => Self::Text(Some(Cow::Owned(
                openlegend_simulation::encoding::json_record(value)
                    .map_err(|_| StoreError::InvalidRecord)?,
            ))),
            SqlType::TextArray => Self::TextArray(Some(
                value
                    .as_array()
                    .ok_or_else(invalid)?
                    .iter()
                    .map(|cell| cell.as_str().ok_or_else(invalid))
                    .collect::<StoreResult<_>>()?,
            )),
            SqlType::SmallIntegerArray => Self::SmallIntegerArray(Some(
                value
                    .as_array()
                    .ok_or_else(invalid)?
                    .iter()
                    .map(|cell| {
                        cell.as_i64()
                            .and_then(|value| i16::try_from(value).ok())
                            .ok_or_else(invalid)
                    })
                    .collect::<StoreResult<_>>()?,
            )),
        })
    }
    fn param(&self) -> &(dyn ToSql + Sync) {
        match self {
            Self::Text(value) => value,
            Self::Integer(value) => value,
            Self::Double(value) => value,
            Self::TextArray(value) => value,
            Self::SmallIntegerArray(value) => value,
        }
    }
}

fn cell_bound(value: &SqlCell) -> Option<usize> {
    // JSON formatting must charge escaping and container storage. SQL text
    // bindings themselves borrow the original strings for the whole call.
    match value {
        SqlCell::Null | SqlCell::Bool(_) | SqlCell::Number(_) => Some(32),
        SqlCell::Text(text) => text.json_document_bound()?.checked_add(32),
        SqlCell::Array(array) => array
            .iter()
            .try_fold(32usize, |sum, cell| sum.checked_add(cell_bound(cell)?)),
        SqlCell::Object(object) => object.iter().try_fold(32usize, |sum, (name, cell)| {
            sum.checked_add(name.len().checked_mul(6)?)?
                .checked_add(cell_bound(cell)?)
        }),
        SqlCell::ExactObject(_) => None,
    }
}
