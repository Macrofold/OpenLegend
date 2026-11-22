//! Operator export of one stopped PostgreSQL database and its retained slots.
//! Gameplay and external authority use the same fixed read cut. The new
//! directory becomes visible only after every private file is synchronized.

use super::capture::{CaptureError, SnapshotCapture, SnapshotKind};
use super::{CheckpointFormat, FILE_BUFFER, METADATA, Metadata, file, pre_load, read_line};
use crate::store::{Session, StorageSchema, Store, StoreError, durable_head};
use openlegend_simulation::{encoding::hex_bytes, host::ByteBudget};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::ffi::CString;
use std::fs::{self, DirBuilder, File, OpenOptions};
use std::io::{self, BufReader, BufWriter, Read, Write};
#[cfg(any(target_os = "macos", target_os = "linux"))]
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::{DirBuilderExt, OpenOptionsExt};
use std::path::Path;
use tokio::time::Instant;
use tokio_postgres::IsolationLevel;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct BackupFormat {
    format: String,
    pub(super) operations_format: String,
    manifest_bytes: usize,
    slots: usize,
    pub(super) tables: Vec<String>,
}

impl BackupFormat {
    pub(super) fn valid(&self) -> bool {
        !self.format.is_empty()
            && !self.operations_format.is_empty()
            && self.manifest_bytes > 0
            && self.slots > 0
            && ["meta", "game_saves"]
                .into_iter()
                .all(|name| self.tables.iter().any(|table| table == name))
            && self.tables.iter().enumerate().all(|(index, name)| {
                !name.is_empty()
                    && name
                        .bytes()
                        .all(|byte| byte.is_ascii_lowercase() || byte == b'_')
                    && !self.tables[..index].contains(name)
            })
    }

    pub(super) fn retained_bytes(&self) -> Option<usize> {
        self.tables.iter().try_fold(
            self.format
                .capacity()
                .checked_add(self.operations_format.capacity())?
                .checked_add(self.tables.capacity().checked_mul(size_of::<String>())?)?,
            |bytes, table| bytes.checked_add(table.capacity()),
        )
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Manifest<'a> {
    format: &'a str,
    world_id: &'a str,
    checkpoint: Uuid,
    operations: Uuid,
    saves: BTreeSet<String>,
}

/// Holds a shared advisory lock on the normal writer key throughout capture
/// and publication. No writable store, simulation session or asset claim is
/// installed. Retained files come from the operator-selected stopped data
/// directory described by SB17 in docs/limits/persistence.md.
pub(in crate::store) async fn write_operational_backup(
    mut reader: Session,
    schema: &StorageSchema,
    budget: &ByteBudget,
    data: &Path,
    destination: &Path,
) -> Result<usize, CaptureError> {
    if exists(destination)? {
        return Err(io::Error::from(io::ErrorKind::AlreadyExists).into());
    }
    let tx = reader
        .client
        .build_transaction()
        .isolation_level(IsolationLevel::RepeatableRead)
        .read_only(true)
        .start()
        .await?;
    if !Store::current_schema(&tx, schema).await? {
        return Err(StoreError::InitializationRequired.into());
    }
    let head = durable_head(&tx)
        .await?
        .ok_or(StoreError::OpeningRequired)?;
    let contract = &schema.checkpoint;
    let world = &head.world_id;
    if tx
        .query_opt(
            "SELECT 1 FROM game_saves WHERE id=$1 AND world_id<>$2 LIMIT 1",
            &[&pre_load::ID, world],
        )
        .await?
        .is_some()
    {
        return Err(StoreError::InvalidRecord.into());
    }
    let pointed = pre_load::pointed_file(&tx, world, &contract.format).await?;

    let parent = destination
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    if destination.file_name().is_none() {
        return Err(io::Error::from(io::ErrorKind::InvalidInput).into());
    }
    let staging = parent.join(format!(".backup-pending-{}", Uuid::new_v4()));
    private_directory(&staging)?;
    let result: Result<usize, CaptureError> = async {
        let mut manifest = Manifest {
            format: &contract.backup.format,
            world_id: world,
            checkpoint: Uuid::new_v4(),
            operations: Uuid::new_v4(),
            saves: BTreeSet::new(),
        };
        let checkpoints = staging.join("checkpoints");
        let capture = SnapshotCapture::new(schema, budget, Instant::now());
        capture
            .write(
                &checkpoints,
                world,
                &manifest.checkpoint.to_string(),
                &tx,
                SnapshotKind::Gameplay {
                    revision: head.revision,
                    sequence: None,
                    kind: None,
                    label: "Operational backup".into(),
                },
            )
            .await?;
        let capture = SnapshotCapture::new(schema, budget, Instant::now());
        capture
            .write(
                &checkpoints,
                world,
                &manifest.operations.to_string(),
                &tx,
                SnapshotKind::Operations,
            )
            .await?;

        // One reusable bounded record buffer, file buffers and persisted slot
        // identities are separate from either database stream's allowance.
        let _files = budget
            .reserve(
                contract
                    .row_bytes
                    .checked_mul(2)
                    .and_then(|bytes| bytes.checked_add(2 * FILE_BUFFER + 4 * METADATA))
                    .and_then(|bytes| bytes.checked_add(contract.backup.manifest_bytes))
                    .and_then(|bytes| bytes.checked_add(contract.backup.slots.checked_mul(96)?))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        manifest.saves = copy_slots(&data.join("saves"), &staging.join("saves"), world, contract)?;
        if let Some(pointed) = pointed
            && !manifest.saves.contains(&pointed)
        {
            return Err(StoreError::InvalidRecord.into());
        }
        let bytes = serde_json::to_vec(&manifest).map_err(|_| CaptureError::Format)?;
        if bytes.len() > contract.backup.manifest_bytes {
            return Err(StoreError::Capacity.into());
        }
        let mut output = private_file(&staging.join("manifest.json"))?;
        output.write_all(&bytes)?;
        output.sync_all()?;
        tx.commit().await?;
        File::open(&staging)?.sync_all()?;
        publish_directory(&staging, destination)?;
        File::open(parent)?.sync_all()?;
        Ok(manifest.saves.len())
    }
    .await;
    if result.is_err() {
        let _ = fs::remove_dir_all(&staging);
    }
    result
}

fn copy_slots(
    source: &Path,
    target: &Path,
    world: &str,
    contract: &CheckpointFormat,
) -> Result<BTreeSet<String>, CaptureError> {
    let entries = match fs::read_dir(source) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(BTreeSet::new()),
        others => others?,
    };
    let mut saved = BTreeSet::new();
    let mut scratch = Vec::new();
    for entry in entries {
        let entry = entry?;
        let name = entry.file_name();
        let Some(name) = name.to_str().filter(|name| name.len() == 36) else {
            continue;
        };
        if Uuid::parse_str(name).is_err() {
            continue;
        }
        if !entry.file_type()?.is_dir() {
            continue;
        }
        let path = entry.path();
        let mut raw = Vec::new();
        file(&path.join("metadata.json"), METADATA)?
            .take(METADATA as u64 + 1)
            .read_to_end(&mut raw)?;
        let metadata: Metadata =
            serde_json::from_slice(&raw).map_err(|_| StoreError::InvalidRecord)?;
        if raw.len() > METADATA || !metadata.valid(name, &metadata.world_id, contract) {
            return Err(StoreError::InvalidRecord.into());
        }
        if metadata.world_id != world {
            continue;
        }
        if saved.len() == contract.backup.slots {
            return Err(StoreError::Capacity.into());
        }
        if !saved.insert(name.to_owned()) {
            return Err(StoreError::InvalidRecord.into());
        }
        if saved.len() == 1 {
            private_directory(target)?;
        }
        let slot = target.join(name);
        private_directory(&slot)?;
        copy_slot(&path, &slot, &metadata, contract, &mut scratch)?;
        let mut output = private_file(&slot.join("metadata.json"))?;
        output.write_all(&raw)?;
        output.sync_all()?;
        File::open(&slot)?.sync_all()?;
    }
    if !saved.is_empty() {
        File::open(target)?.sync_all()?;
    }
    Ok(saved)
}

fn copy_slot(
    source: &Path,
    target: &Path,
    metadata: &Metadata,
    contract: &CheckpointFormat,
    scratch: &mut Vec<u8>,
) -> Result<(), CaptureError> {
    let body = file(&source.join("world.jsonl"), contract.bytes)?;
    if body.metadata()?.len() != metadata.bytes as u64 {
        return Err(StoreError::InvalidRecord.into());
    }
    let mut input = BufReader::with_capacity(FILE_BUFFER, body);
    let mut output =
        BufWriter::with_capacity(FILE_BUFFER, private_file(&target.join("world.jsonl"))?);
    let mut hash = Sha256::new();
    let mut bytes = 0;
    let mut rows = 0;
    while read_line(
        &mut input,
        scratch,
        contract.row_bytes,
        &mut hash,
        &mut bytes,
    )?
    .is_some()
    {
        rows += 1;
        if rows > metadata.rows || bytes > metadata.bytes {
            return Err(StoreError::InvalidRecord.into());
        }
        output.write_all(scratch)?;
    }
    if rows != metadata.rows
        || bytes != metadata.bytes
        || hex_bytes(&hash.finalize()) != metadata.checksum
    {
        return Err(StoreError::InvalidRecord.into());
    }
    output.flush()?;
    output.get_ref().sync_all()?;
    Ok(())
}

fn exists(path: &Path) -> io::Result<bool> {
    match fs::symlink_metadata(path) {
        Ok(_) => Ok(true),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error),
    }
}

fn private_directory(path: &Path) -> io::Result<()> {
    DirBuilder::new().mode(0o700).create(path)
}

fn private_file(path: &Path) -> io::Result<File> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(path)
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn publish_directory(source: &Path, target: &Path) -> io::Result<()> {
    let from = CString::new(source.as_os_str().as_bytes())?;
    let to = CString::new(target.as_os_str().as_bytes())?;
    // Both paths remain live, NUL-terminated and immutably owned throughout
    // the syscall. Plain rename could replace a concurrent empty directory.
    #[cfg(target_os = "macos")]
    let result = unsafe { libc::renamex_np(from.as_ptr(), to.as_ptr(), libc::RENAME_EXCL) };
    #[cfg(target_os = "linux")]
    let result = unsafe {
        libc::renameat2(
            libc::AT_FDCWD,
            from.as_ptr(),
            libc::AT_FDCWD,
            to.as_ptr(),
            libc::RENAME_NOREPLACE,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(io::Error::last_os_error())
    }
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn publish_directory(_: &Path, _: &Path) -> io::Result<()> {
    Err(io::ErrorKind::Unsupported.into())
}
