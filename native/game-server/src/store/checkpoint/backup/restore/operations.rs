//! Read the backup's external-authority stream in admitted pages. Its exact
//! table catalogue and typed destination columns come from the current release.

use super::*;
use crate::store::read::admitted_query;
use crate::store::write::BATCH_BYTES;
use openlegend_simulation::records::SqlCell;
use serde_json::value::RawValue;
use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio_postgres::types::Type;

pub(super) struct Operations {
    source: BufReader<File>,
    metadata: Metadata,
    line: Vec<u8>,
    hash: Sha256,
    bytes: usize,
    rows: usize,
    table: Option<usize>,
    pending: Option<(usize, Box<RawValue>)>,
    budget: ByteBudget,
    _reader: openlegend_simulation::host::ByteReservation,
}

struct Page {
    table: usize,
    rows: Vec<Box<RawValue>>,
    _custody: openlegend_simulation::host::ByteReservation,
}

impl Operations {
    pub(super) fn open(
        directory: &Path,
        manifest: &Manifest,
        contract: &CheckpointFormat,
        budget: &ByteBudget,
    ) -> StoreResult<Self> {
        let id = manifest.operations.to_string();
        let path = directory.join("checkpoints").join(&id);
        require_directory(&path)?;
        let metadata = read_metadata(&path)?;
        if !metadata.valid_format(
            &id,
            &manifest.world_id,
            contract,
            &contract.backup.operations_format,
        ) || metadata.revision.is_some()
            || metadata.kind.is_some()
            || metadata.sequence.is_some()
        {
            return Err(StoreError::InvalidRecord);
        }
        let source = file(&path.join("world.jsonl"), contract.bytes)?;
        if source.metadata().map_err(io_error)?.len() != metadata.bytes as u64 {
            return Err(StoreError::InvalidRecord);
        }
        let reader = contract
            .row_bytes
            .checked_mul(4)
            .and_then(|size| size.checked_add(FILE_BUFFER + METADATA))
            .ok_or(StoreError::Capacity)?;
        let reader = budget.reserve(reader).map_err(|_| StoreError::Capacity)?;
        Ok(Self {
            source: BufReader::with_capacity(FILE_BUFFER, source),
            metadata,
            line: Vec::with_capacity(contract.row_bytes + 1),
            hash: Sha256::new(),
            bytes: 0,
            rows: 0,
            table: None,
            pending: None,
            budget: budget.clone(),
            _reader: reader,
        })
    }

    fn next(&mut self, contract: &CheckpointFormat) -> StoreResult<Option<Page>> {
        let mut selected = Vec::with_capacity(contract.page);
        let mut funding = self
            .budget
            .reserve(contract.page * std::mem::size_of::<Box<RawValue>>())
            .map_err(|_| StoreError::Capacity)?;
        let mut table = 0;
        let mut bytes = 2usize;
        loop {
            let next = if let Some(next) = self.pending.take() {
                Some(next)
            } else {
                loop {
                    let Some(line) = read_line(
                        &mut self.source,
                        &mut self.line,
                        contract.row_bytes,
                        &mut self.hash,
                        &mut self.bytes,
                    )?
                    else {
                        if self.rows != self.metadata.rows
                            || self.bytes != self.metadata.bytes
                            || self.table != Some(contract.backup.tables.len() - 1)
                            || hex_bytes(&self.hash.clone().finalize()) != self.metadata.checksum
                        {
                            return Err(StoreError::InvalidRecord);
                        }
                        break None;
                    };
                    self.rows += 1;
                    if self.rows > self.metadata.rows || self.bytes > self.metadata.bytes {
                        return Err(StoreError::InvalidRecord);
                    }
                    let line: crate::store::checkpoint::Line<'_> =
                        serde_json::from_str(line).map_err(|_| StoreError::InvalidRecord)?;
                    if let Some(body) = line.row {
                        let index = self.table.ok_or(StoreError::InvalidRecord)?;
                        if contract.backup.tables[index] != line.table {
                            return Err(StoreError::InvalidRecord);
                        }
                        break Some((index, body.to_owned()));
                    }
                    let index = self.table.map_or(0, |previous| previous + 1);
                    if contract.backup.tables.get(index).map(String::as_str)
                        != Some(line.table.as_ref())
                    {
                        return Err(StoreError::InvalidRecord);
                    }
                    self.table = Some(index);
                }
            };
            let Some((index, row)) = next else { break };
            let size = row.get().len();
            let next_size = bytes.checked_add(size + 1).ok_or(StoreError::Capacity)?;
            if !selected.is_empty()
                && (table != index || next_size > BATCH_BYTES || selected.len() == contract.page)
            {
                self.pending = Some((index, row));
                break;
            }
            funding
                .resize(funding.bytes() + size)
                .map_err(|_| StoreError::Capacity)?;
            table = index;
            bytes = next_size;
            selected.push(row);
        }
        Ok((!selected.is_empty()).then_some(Page {
            table,
            rows: selected,
            _custody: funding,
        }))
    }

    pub(super) fn checksum(&self) -> &str {
        &self.metadata.checksum
    }

    pub(super) fn verify(mut self, contract: &CheckpointFormat) -> StoreResult<()> {
        while self.next(contract)?.is_some() {}
        Ok(())
    }
}

pub(super) async fn stage(
    store: &Arc<Store>,
    tx: &Transaction<'_>,
    mut input: Operations,
) -> StoreResult<()> {
    let mut catalogue = None::<(usize, BTreeSet<String>, String)>;
    let mut schema_seen = false;
    loop {
        let source = store.clone();
        let (reader, page) = tokio::task::spawn_blocking(move || {
            let page = input.next(&source.schema.checkpoint)?;
            Ok::<_, StoreError>((input, page))
        })
        .await
        .map_err(|_| StoreError::Cancelled)??;
        input = reader;
        let Some(page) = page else { break };
        let name = &store.schema.checkpoint.backup.tables[page.table];
        if name.starts_with("asset_") {
            eprintln!(
                "Restore requires independent current artwork authority; no artwork has been installed."
            );
            return Err(StoreError::InvalidRecord);
        }
        let budget = &store.budget;
        if !catalogue
            .as_ref()
            .is_some_and(|(table, _, _)| *table == page.table)
        {
            let (_catalogue, rows) = admitted_query(
                tx,
                "SELECT attname::text FROM pg_catalog.pg_attribute                  WHERE attrelid=to_regclass($1) AND attnum>0 AND NOT attisdropped ORDER BY attnum",
                &[name], budget,
            ).await?;
            let columns = rows
                .iter()
                .map(|row| row.try_get(0).map_err(StoreError::from))
                .collect::<StoreResult<BTreeSet<String>>>()?;
            if columns.is_empty() {
                return Err(StoreError::Schema);
            }
            catalogue = Some((
                page.table,
                columns,
                format!(
                    "INSERT INTO {name} SELECT * FROM json_populate_recordset(NULL::{name},$1::text::json)"
                ),
            ));
        }
        let (_, columns, insert) = catalogue.as_ref().ok_or(StoreError::Schema)?;
        let bytes = page
            .rows
            .iter()
            .try_fold(2usize, |total, row| total.checked_add(row.get().len() + 1))
            .ok_or(StoreError::Capacity)?;
        let _transfer = budget
            .reserve(bytes.checked_mul(4).ok_or(StoreError::Capacity)?)
            .map_err(|_| StoreError::Capacity)?;
        let mut body = String::with_capacity(bytes);
        body.push('[');
        let mut expected = 0u64;
        for row in page.rows {
            let decode = SqlCell::json_decode_bound(row.get()).ok_or(StoreError::InvalidRecord)?;
            let _decode = budget.reserve(decode).map_err(|_| StoreError::Capacity)?;
            let fields: BTreeMap<&str, &RawValue> =
                serde_json::from_str(row.get()).map_err(|_| StoreError::InvalidRecord)?;
            if fields.len() != columns.len() || fields.keys().any(|key| !columns.contains(*key)) {
                return Err(StoreError::InvalidRecord);
            }
            if name == "meta" {
                let key: &str = serde_json::from_str(fields["key"].get())
                    .map_err(|_| StoreError::InvalidRecord)?;
                if key == "schema" {
                    let value: &str = serde_json::from_str(fields["value"].get())
                        .map_err(|_| StoreError::InvalidRecord)?;
                    if schema_seen || value != store.schema.version {
                        return Err(StoreError::Schema);
                    }
                    schema_seen = true;
                    continue;
                }
                if key == DIRECTORY_OWNER
                    || key.starts_with(ATTEMPT_PREFIX)
                    || key.starts_with(BACKUP_RECEIPT_PREFIX)
                {
                    continue;
                }
                if key.starts_with("integration:full-restore-asset-authority:") {
                    return Err(StoreError::InvalidRecord);
                }
            }
            if expected != 0 {
                body.push(',');
            }
            body.push_str(row.get());
            expected += 1;
        }
        if expected != 0 {
            body.push(']');
            let written = tx.execute_typed(insert, &[(&body, Type::TEXT)]).await?;
            if written != expected {
                return Err(StoreError::InvalidRecord);
            }
        }
    }
    if schema_seen {
        Ok(())
    } else {
        Err(StoreError::Schema)
    }
}

pub(super) async fn prepare(
    store: Arc<Store>,
    directory: PathBuf,
    manifest: Arc<Manifest>,
) -> StoreResult<Operations> {
    tokio::task::spawn_blocking(move || {
        Operations::open(
            &directory,
            &manifest,
            &store.schema.checkpoint,
            &store.budget,
        )
    })
    .await
    .map_err(|_| StoreError::Cancelled)?
}
