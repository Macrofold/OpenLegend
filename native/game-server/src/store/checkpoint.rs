//! Stream one currently retained checkpoint without decoding the abandoned
//! gameplay graph. The source file remains read-only until the separate
//! native restore and protected PostgreSQL installation have both qualified.

use super::schema::{FIXED_COLUMNS, SqlType, StorageSchema, Table};
use super::{CurrentOpening, DurableHead, MAX_SAFE_INTEGER, Store, StoreError, StoreResult};
use openlegend_simulation::encoding::hex_bytes;
use openlegend_simulation::events::OriginalOccurrenceInput;
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use openlegend_simulation::records::{InstalledRow, SqlCell};
use openlegend_simulation::text::JsText;
use serde::Deserialize;
use serde_json::value::RawValue;
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

mod archives;
mod authority;
mod history_read;
mod positions;
mod provider;
mod retention;
mod support;
mod version_baseline;
mod write;
pub(super) use authority::{AcceptedPrivacy, validate_privacy};
pub(crate) use authority::{RecoveryAuthority, read_recovery_authority};
pub(crate) use history_read::PreparedCheckpointHistory;
pub(crate) use positions::reconcile_history_positions;

const METADATA: usize = 16 * 1024;
const FILE_BUFFER: usize = 64 * 1024;

/// The build exports this exact current contract from the existing checkpoint
/// owner. No other save version or artifact layout participates.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CheckpointFormat {
    pub(super) encoding: String,
    pub(super) format: String,
    pub(super) row_bytes: usize,
    pub(super) bytes: usize,
    pub(super) rows: usize,
    pub(super) page: usize,
    pub(super) history_tables: Vec<String>,
    pub(super) history_position_tables: Vec<String>,
    pub(super) retention_preparation: Box<RawValue>,
    pub(super) history_edit: HistoryEditSql,
    pub(super) archive_selection: String,
    pub(super) archive_rows: usize,
    pub(super) support_membership: String,
    pub(super) retention_membership: String,
    pub(super) account_metadata: BTreeMap<String, String>,
    pub(super) summary_memory_prefix: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct HistoryEditSql {
    pub(super) dependencies: String,
    pub(super) alias_pages: String,
    pub(super) addressed_pages: String,
    pub(super) page_rows: u64,
    pub(super) page_bytes: u64,
    pub(super) source_bytes: u64,
}

impl CheckpointFormat {
    pub(super) fn retained_bytes(&self) -> Option<usize> {
        let bytes = self
            .encoding
            .capacity()
            .checked_add(self.format.capacity())?
            .checked_add(self.retention_preparation.get().len())?
            .checked_add(self.archive_selection.capacity())?
            .checked_add(self.support_membership.capacity())?
            .checked_add(self.retention_membership.capacity())?
            .checked_add(self.history_edit.dependencies.capacity())?
            .checked_add(self.history_edit.alias_pages.capacity())?
            .checked_add(self.history_edit.addressed_pages.capacity())?;
        let bytes = self.account_metadata.iter().try_fold(
            bytes.checked_add(self.summary_memory_prefix.capacity())?,
            |n, (table, sql)| {
                n.checked_add(table.capacity())?
                    .checked_add(sql.capacity())?
                    .checked_add(128)
            },
        )?;
        [&self.history_tables, &self.history_position_tables]
            .into_iter()
            .try_fold(bytes, |bytes, values| {
                values.iter().try_fold(
                    bytes.checked_add(values.capacity().checked_mul(size_of::<String>())?)?,
                    |n, name| n.checked_add(name.capacity()),
                )
            })
    }

    pub(super) fn validate(&self, schema: &StorageSchema) -> StoreResult<()> {
        let mut known: BTreeSet<&str> = schema
            .tables
            .iter()
            .map(|table| table.name.as_str())
            .collect();
        if self.encoding.is_empty()
            || self.format.is_empty()
            || self.row_bytes == 0
            || self.page == 0
            || self.rows <= schema.tables.len()
            || self.row_bytes > self.bytes
            || self.archive_selection.is_empty()
            || self.archive_rows == 0
            || self.support_membership.is_empty()
            || self.retention_membership.is_empty()
            || self.summary_memory_prefix.is_empty()
            || self.account_metadata.len() != 3
            || ["mind_awareness", "mind_memories", "mind_summaries"]
                .into_iter()
                .any(|table| {
                    self.account_metadata
                        .get(table)
                        .is_none_or(String::is_empty)
                })
            || self.history_edit.dependencies.is_empty()
            || self.history_edit.alias_pages.is_empty()
            || self.history_edit.addressed_pages.is_empty()
            || self.history_edit.page_rows == 0
            || self.history_edit.page_bytes == 0
            || self.history_edit.source_bytes == 0
            || self.history_position_tables.is_empty()
            || self
                .history_position_tables
                .iter()
                .enumerate()
                .any(|(position, table)| {
                    self.history_position_tables[..position].contains(table)
                        || !schema
                            .tables
                            .iter()
                            .any(|parent| parent.children.iter().any(|child| child.table == *table))
                })
            || !["history_events", "history_totals"]
                .into_iter()
                .all(|required| self.history_tables.iter().any(|table| table == required))
            || self.history_tables.iter().any(|table| {
                table.is_empty()
                    || !table.bytes().all(|c| c.is_ascii_lowercase() || c == b'_')
                    || !known.insert(table)
            })
        {
            return Err(StoreError::Schema);
        }
        Ok(())
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Metadata {
    id: String,
    world_id: String,
    label: String,
    created_at: String,
    sim_time: f64,
    format: String,
    checksum: String,
    encoding: String,
    kind: Option<MetadataKind>,
    bytes: usize,
    rows: usize,
    revision: Option<u64>,
    sequence: Option<u64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum MetadataKind {
    Manual,
    Auto,
    Recovery,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Header {
    encoding: String,
    format: String,
    world_id: String,
    revision: u64,
    tables: Vec<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Line<'a> {
    #[serde(borrow)]
    table: Cow<'a, str>,
    #[serde(borrow)]
    row: Option<&'a RawValue>,
}

pub(crate) struct AdministrativeCheckpoint {
    pub world_id: String,
    pub id: String,
    pub checksum: String,
    pub revision: u64,
    pub sim_time: f64,
    pub canonical: BTreeMap<String, Vec<InstalledRow>>,
    pub history: BTreeMap<String, Vec<Box<RawValue>>>,
    pub custody: ByteReservation,
    history_custody: ByteReservation,
}

pub(crate) struct CheckpointHistory {
    pub tables: BTreeMap<String, Vec<Box<RawValue>>>,
    _custody: ByteReservation,
}

impl Store {
    /// Read one retained file on an operator worker while independently
    /// holding the schema release. No PostgreSQL lane is held during file I/O.
    pub(crate) async fn retained_checkpoint(
        self: &Arc<Self>,
        directory: PathBuf,
        id: String,
        world: String,
    ) -> StoreResult<AdministrativeCheckpoint> {
        let store = Arc::clone(self);
        tokio::task::spawn_blocking(move || {
            AdministrativeCheckpoint::read(
                &directory,
                &id,
                &world,
                &store.schema,
                &store.schema.checkpoint,
                &store.budget,
            )
        })
        .await
        .map_err(|_| StoreError::InvalidRecord)?
    }

    pub(crate) fn restore_retention_preparation(&self) -> &RawValue {
        &self.schema.checkpoint.retention_preparation
    }
}

impl AdministrativeCheckpoint {
    /// Bounded local file I/O belongs on a stopped operator's blocking worker.
    /// Each typed row and history body carries its own admission after the
    /// reusable line buffer is released. No PostgreSQL write starts here.
    pub(crate) fn read(
        directory: &Path,
        id: &str,
        world: &str,
        schema: &StorageSchema,
        contract: &CheckpointFormat,
        budget: &ByteBudget,
    ) -> StoreResult<Self> {
        if Uuid::parse_str(id).is_err() || id.len() != 36 {
            return Err(StoreError::InvalidRecord);
        }
        let directory = directory.join(id);
        if !fs::symlink_metadata(&directory).map_err(io_error)?.is_dir() {
            return Err(StoreError::InvalidRecord);
        }
        let _workspace = budget
            .reserve(
                contract
                    .row_bytes
                    .checked_mul(2)
                    .and_then(|bytes| bytes.checked_add(1 + FILE_BUFFER + METADATA * 8))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let metadata =
            file(&directory.join("metadata.json"), METADATA)?.take((METADATA + 1) as u64);
        let metadata: Metadata =
            serde_json::from_reader(metadata).map_err(|_| StoreError::InvalidRecord)?;
        if metadata.id != id
            || metadata.world_id != world
            || metadata.format != contract.format
            || metadata.encoding != contract.encoding
            || metadata.label.is_empty()
            || metadata.label.encode_utf16().count() > 80
            || !metadata.created_at.ends_with('Z')
            || chrono::DateTime::parse_from_rfc3339(&metadata.created_at).is_err()
            || !metadata.sim_time.is_finite()
            || metadata.rows == 0
            || metadata.rows > contract.rows
            || metadata.bytes == 0
            || metadata.bytes > contract.bytes
            || metadata
                .revision
                .is_some_and(|revision| revision > MAX_SAFE_INTEGER)
            || metadata
                .sequence
                .is_some_and(|sequence| sequence == 0 || sequence > MAX_SAFE_INTEGER)
            || metadata.checksum.len() != 64
            || !metadata
                .checksum
                .bytes()
                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
        {
            return Err(StoreError::InvalidRecord);
        }
        let _kind = metadata.kind;
        let payload = file(&directory.join("world.jsonl"), contract.bytes)?;
        if payload.metadata().map_err(io_error)?.len() != metadata.bytes as u64 {
            return Err(StoreError::InvalidRecord);
        }
        let mut reader = BufReader::with_capacity(FILE_BUFFER, payload);
        let mut scratch = Vec::new();
        scratch
            .try_reserve_exact(
                contract
                    .row_bytes
                    .checked_add(1)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let mut hash = Sha256::new();
        let mut length = 0usize;
        let mut lines = 0usize;
        // Keep line parsing separate from transport. The checksum covers its
        // original bytes including the final LF, never a re-encoded value.
        let head = read_line(
            &mut reader,
            &mut scratch,
            contract.row_bytes,
            &mut hash,
            &mut length,
        )?
        .ok_or(StoreError::InvalidRecord)?;
        let _header = budget
            .reserve(SqlCell::json_decode_bound(head).ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::Capacity)?;
        let header: Header = serde_json::from_str(head).map_err(|_| StoreError::InvalidRecord)?;
        lines += 1;
        if header.world_id != world
            || header.format != contract.format
            || header.encoding != contract.encoding
            || header.revision > MAX_SAFE_INTEGER
            || metadata
                .revision
                .is_some_and(|revision| revision != header.revision)
        {
            return Err(StoreError::InvalidRecord);
        }
        let expected: BTreeSet<_> = schema
            .tables
            .iter()
            .map(|table| table.name.as_str())
            .chain(contract.history_tables.iter().map(String::as_str))
            .collect();
        let declared: BTreeSet<_> = header.tables.iter().map(String::as_str).collect();
        if expected != declared || header.tables.len() != declared.len() {
            return Err(StoreError::InvalidRecord);
        }
        let mut custody = budget
            .reserve(
                schema
                    .tables
                    .len()
                    .checked_mul(512)
                    .and_then(|n| n.checked_add(world.len() + id.len() + metadata.checksum.len()))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let mut history_custody = budget
            .reserve(
                contract
                    .history_tables
                    .len()
                    .checked_mul(512)
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let mut canonical = BTreeMap::<String, Vec<InstalledRow>>::new();
        let mut history = BTreeMap::<String, Vec<Box<RawValue>>>::new();
        let tables: BTreeMap<&str, &Table> = schema
            .tables
            .iter()
            .map(|table| (table.name.as_str(), table))
            .collect();
        let mut section = 0usize;
        let mut table = None::<&str>;
        while let Some(text) = read_line(
            &mut reader,
            &mut scratch,
            contract.row_bytes,
            &mut hash,
            &mut length,
        )? {
            lines = lines.checked_add(1).ok_or(StoreError::Capacity)?;
            if lines > metadata.rows || length > metadata.bytes {
                return Err(StoreError::InvalidRecord);
            }
            let line: Line<'_> =
                serde_json::from_str(text).map_err(|_| StoreError::InvalidRecord)?;
            if let Some(row) = line.row {
                let current = table
                    .filter(|name| *name == line.table)
                    .ok_or(StoreError::InvalidRecord)?;
                if let Some(owned) = tables.get(current) {
                    let _workspace = budget
                        .reserve(
                            SqlCell::json_decode_bound(row.get())
                                .ok_or(StoreError::InvalidRecord)?,
                        )
                        .map_err(|_| StoreError::Capacity)?;
                    let record = canonical_row(owned, row, world, header.revision)?;
                    let rows = canonical
                        .get_mut(current)
                        .ok_or(StoreError::InvalidRecord)?;
                    let retained = record.retained_bytes().ok_or(StoreError::Capacity)?;
                    grow_rows(&mut custody, rows, retained)?;
                    rows.push(record);
                } else {
                    #[derive(Deserialize)]
                    struct Scope<'a> {
                        world_id: &'a str,
                    }
                    if serde_json::from_str::<Scope<'_>>(row.get())
                        .map_err(|_| StoreError::InvalidRecord)?
                        .world_id
                        != world
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    let rows = history.get_mut(current).ok_or(StoreError::InvalidRecord)?;
                    grow_rows(&mut history_custody, rows, row.get().len())?;
                    rows.push(row.to_owned());
                }
            } else {
                let section_name = header
                    .tables
                    .get(section)
                    .filter(|name| name.as_str() == line.table)
                    .ok_or(StoreError::InvalidRecord)?;
                section = section.checked_add(1).ok_or(StoreError::Capacity)?;
                table = Some(section_name);
                if tables.contains_key(section_name.as_str()) {
                    canonical.insert(section_name.clone(), Vec::new());
                } else {
                    history.insert(section_name.clone(), Vec::new());
                }
            }
        }
        if section != header.tables.len()
            || lines != metadata.rows
            || length != metadata.bytes
            || hex_bytes(&hash.finalize()) != metadata.checksum
        {
            return Err(StoreError::InvalidRecord);
        }
        for rows in canonical.values_mut() {
            rows.sort_unstable_by(|a, b| a.id.cmp(&b.id));
            if rows.windows(2).any(|pair| pair[0].id == pair[1].id) {
                return Err(StoreError::InvalidRecord);
            }
            rows.sort_unstable_by(|a, b| {
                (&a.parent, a.position, &a.id).cmp(&(&b.parent, b.position, &b.id))
            });
        }
        validate_history_count(&history)?;
        // Loaded bodies are data. The inactive native installer still checks
        // exact families, definitions, identities and acquired-source closure.
        Ok(Self {
            world_id: metadata.world_id,
            id: metadata.id,
            checksum: metadata.checksum,
            revision: header.revision,
            sim_time: metadata.sim_time,
            canonical,
            history,
            custody,
            history_custody,
        })
    }

    /// Bind current-format records to the prospective SQL head and retain their
    /// real hot originals. The historical table reader has its own backing so
    /// finishing native installation cannot invalidate later restore reads.
    pub(crate) fn into_opening(
        self,
        store: &Store,
        replacement: DurableHead,
    ) -> StoreResult<(CurrentOpening, CheckpointHistory)> {
        if replacement.world_id != self.world_id {
            return Err(StoreError::StaleCut);
        }
        let mut custody = self.custody;
        let originals = restore_originals(
            &self.canonical["world_hot_events"],
            &self.history["history_events"],
            &store.budget,
            &mut custody,
        )?;
        let records = store.opening_records(replacement, self.canonical, &mut custody)?;
        Ok((
            CurrentOpening {
                records,
                originals,
                custody,
            },
            CheckpointHistory {
                tables: self.history,
                _custody: self.history_custody,
            },
        ))
    }

    /// A retained source can establish the target's identity floor only when
    /// it describes the target's durable revision and exact current timeline.
    fn target_allocation_floor(&self, target: &super::DurableHead, timeline: &str) -> Option<u64> {
        if self.world_id != target.world_id || self.revision != target.revision {
            return None;
        }
        #[derive(Deserialize)]
        struct Temporal<'a> {
            namespace: &'a str,
        }
        let [temporal] = self.canonical.get("mind_temporal_state")?.as_slice() else {
            return None;
        };
        if serde_json::from_str::<Temporal<'_>>(&temporal.payload)
            .ok()?
            .namespace
            != timeline
        {
            return None;
        }
        let [settings] = self.canonical.get("world_settings")?.as_slice() else {
            return None;
        };
        allocation_floor(&settings.payload, &target.world_id)
    }
}

fn restore_originals(
    hot: &[InstalledRow],
    history: &[Box<RawValue>],
    budget: &ByteBudget,
    custody: &mut ByteReservation,
) -> StoreResult<Vec<OriginalOccurrenceInput>> {
    let (_selection, ids) = super::read::hot_occurrence_ids(hot, budget)?;
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let count = ids.len();
    let mut selected = ids
        .into_iter()
        .map(|id| (id, false))
        .collect::<BTreeMap<_, _>>();
    if selected.len() != count {
        return Err(StoreError::InvalidRecord);
    }
    let grow = |custody: &mut ByteReservation, bytes: usize| {
        let next = custody
            .bytes()
            .checked_add(bytes)
            .ok_or(StoreError::Capacity)?;
        custody.resize(next).map_err(|_| StoreError::Capacity)
    };
    grow(
        custody,
        count
            .checked_mul(size_of::<OriginalOccurrenceInput>())
            .ok_or(StoreError::Capacity)?,
    )?;
    let mut originals = Vec::with_capacity(count);
    #[derive(Deserialize)]
    struct Original<'a> {
        id: &'a str,
        #[serde(borrow)]
        payload: &'a RawValue,
    }
    for row in history {
        let row: Original<'_> =
            serde_json::from_str(row.get()).map_err(|_| StoreError::InvalidRecord)?;
        let Some(found) = selected.get_mut(row.id) else {
            continue;
        };
        if std::mem::replace(found, true) {
            return Err(StoreError::InvalidRecord);
        }
        let body = row.payload.get();
        let _decode = budget
            .reserve(SqlCell::json_decode_bound(body).ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::Capacity)?;
        let payload: String = serde_json::from_str(body).map_err(|_| StoreError::InvalidRecord)?;
        grow(
            custody,
            payload
                .capacity()
                .checked_add(row.id.len())
                .ok_or(StoreError::Capacity)?,
        )?;
        originals.push(OriginalOccurrenceInput {
            event_id: row.id.to_owned(),
            payload,
        });
    }
    if originals.len() != count {
        return Err(StoreError::InvalidRecord);
    }
    Ok(originals)
}

fn allocation_floor(payload: &str, world: &str) -> Option<u64> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Identity<'a> {
        id: &'a str,
        next_id: u64,
    }
    let identity = serde_json::from_str::<Identity<'_>>(payload).ok()?;
    (identity.id == world && (1..=MAX_SAFE_INTEGER).contains(&identity.next_id))
        .then_some(identity.next_id)
}

fn file(path: &Path, limit: usize) -> StoreResult<File> {
    if !fs::symlink_metadata(path).map_err(io_error)?.is_file() {
        return Err(StoreError::InvalidRecord);
    }
    let file = File::open(path).map_err(io_error)?;
    let meta = file.metadata().map_err(io_error)?;
    if !meta.is_file() || meta.len() > limit as u64 {
        return Err(StoreError::InvalidRecord);
    }
    Ok(file)
}

fn io_error(_: std::io::Error) -> StoreError {
    StoreError::InvalidRecord
}

fn read_line<'a>(
    reader: &mut impl BufRead,
    scratch: &'a mut Vec<u8>,
    maximum: usize,
    hash: &mut Sha256,
    bytes: &mut usize,
) -> StoreResult<Option<&'a str>> {
    scratch.clear();
    let wanted = maximum.checked_add(1).ok_or(StoreError::Capacity)?;
    let count = reader
        .take(wanted as u64)
        .read_until(b'\n', scratch)
        .map_err(io_error)?;
    if count == 0 {
        return Ok(None);
    }
    if count > maximum || scratch.last() != Some(&b'\n') {
        return Err(StoreError::InvalidRecord);
    }
    *bytes = bytes.checked_add(count).ok_or(StoreError::Capacity)?;
    hash.update(&*scratch);
    std::str::from_utf8(&scratch[..count - 1])
        .map(Some)
        .map_err(|_| StoreError::InvalidRecord)
}

fn grow_rows<T>(custody: &mut ByteReservation, rows: &mut Vec<T>, body: usize) -> StoreResult<()> {
    let add = if rows.len() == rows.capacity() {
        rows.capacity().max(4)
    } else {
        0
    };
    let bytes = add
        .checked_mul(size_of::<T>())
        .and_then(|n| n.checked_add(body))
        .and_then(|n| n.checked_add(custody.bytes()))
        .ok_or(StoreError::Capacity)?;
    custody.resize(bytes).map_err(|_| StoreError::Capacity)?;
    rows.try_reserve_exact(add)
        .map_err(|_| StoreError::Capacity)
}

// PostgreSQL's Node client writes BIGINT checkpoint cells as quoted decimal.
// Their typed runtime columns use safe integer numbers, as on a direct open.
fn integer(raw: &RawValue) -> StoreResult<u64> {
    let value = if raw.get().starts_with('"') {
        serde_json::from_str::<&str>(raw.get())
            .map_err(|_| StoreError::InvalidRecord)?
            .parse()
            .map_err(|_| StoreError::InvalidRecord)?
    } else {
        serde_json::from_str(raw.get()).map_err(|_| StoreError::InvalidRecord)?
    };
    (value <= MAX_SAFE_INTEGER)
        .then_some(value)
        .ok_or(StoreError::InvalidRecord)
}

fn canonical_row(
    table: &Table,
    raw: &RawValue,
    world: &str,
    revision: u64,
) -> StoreResult<InstalledRow> {
    let body: BTreeMap<&str, &RawValue> =
        serde_json::from_str(raw.get()).map_err(|_| StoreError::InvalidRecord)?;
    let field = |name: &str| body.get(name).copied().ok_or(StoreError::InvalidRecord);
    let text = |name: &str| {
        serde_json::from_str::<String>(field(name)?.get()).map_err(|_| StoreError::InvalidRecord)
    };
    if body.len() != FIXED_COLUMNS.len() + table.columns.len()
        || text("world_id")? != world
        || integer(field("revision")?)? > revision
    {
        return Err(StoreError::InvalidRecord);
    }
    let extra = table
        .columns
        .iter()
        .map(|column| cell(column.data_type, field(&column.name)?))
        .collect::<StoreResult<Vec<_>>>()?;
    Ok(InstalledRow {
        id: text("id")?,
        parent: text("parent_id")?,
        slot: text("slot")?,
        position: integer(field("position")?)?,
        payload: text("payload")?,
        extra,
    })
}

fn cell(kind: SqlType, raw: &RawValue) -> StoreResult<SqlCell> {
    let encoded = raw.get();
    if encoded == "null" {
        return Ok(SqlCell::Null);
    }
    match kind {
        SqlType::Text => serde_json::from_str::<JsText>(encoded)
            .map(SqlCell::Text)
            .map_err(|_| StoreError::InvalidRecord),
        SqlType::Integer => {
            let number = if encoded.starts_with('"') {
                serde_json::from_str::<&str>(encoded)
                    .map_err(|_| StoreError::InvalidRecord)?
                    .parse::<i64>()
                    .map_err(|_| StoreError::InvalidRecord)?
            } else {
                serde_json::from_str(encoded).map_err(|_| StoreError::InvalidRecord)?
            };
            if number.unsigned_abs() > MAX_SAFE_INTEGER {
                return Err(StoreError::InvalidRecord);
            }
            Ok(SqlCell::Number(number.into()))
        }
        SqlType::Double => {
            let number =
                serde_json::from_str::<f64>(encoded).map_err(|_| StoreError::InvalidRecord)?;
            serde_json::Number::from_f64(number)
                .map(SqlCell::Number)
                .ok_or(StoreError::InvalidRecord)
        }
        SqlType::Json => serde_json::from_str(encoded).map_err(|_| StoreError::InvalidRecord),
        SqlType::TextArray => serde_json::from_str::<Vec<JsText>>(encoded)
            .map(|values| SqlCell::Array(values.into_iter().map(SqlCell::Text).collect()))
            .map_err(|_| StoreError::InvalidRecord),
        SqlType::SmallIntegerArray => serde_json::from_str::<Vec<i16>>(encoded)
            .map(|values| {
                SqlCell::Array(
                    values
                        .into_iter()
                        .map(|value| SqlCell::Number(value.into()))
                        .collect(),
                )
            })
            .map_err(|_| StoreError::InvalidRecord),
    }
}

fn validate_history_count(history: &BTreeMap<String, Vec<Box<RawValue>>>) -> StoreResult<()> {
    #[derive(Deserialize)]
    struct Total<'a> {
        #[serde(borrow)]
        event_count: &'a RawValue,
    }
    let totals = history
        .get("history_totals")
        .ok_or(StoreError::InvalidRecord)?;
    let events = history
        .get("history_events")
        .ok_or(StoreError::InvalidRecord)?;
    if totals.len() != 1 {
        return Err(StoreError::InvalidRecord);
    }
    let total: Total<'_> =
        serde_json::from_str(totals[0].get()).map_err(|_| StoreError::InvalidRecord)?;
    if integer(total.event_count)? != events.len() as u64 {
        return Err(StoreError::InvalidRecord);
    }
    Ok(())
}
