//! Stream only the two known current-format gameplay files. The authenticated
//! Lab exchange supplies private staging and verifies field custody separately.
use super::{
    FILE_BUFFER, Header, METADATA, Metadata, MetadataKind, capture_assets, file, io_error,
};
use crate::{
    lab::scenario::Snapshot,
    store::{Store, StoreError, StoreResult},
};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, Read, Write},
    os::unix::fs::OpenOptionsExt,
    path::{Path, PathBuf},
};
use tokio_postgres::Transaction;

pub(crate) struct Verified {
    pub(crate) snapshot: Snapshot,
    pub(crate) identity: String,
}
fn private_file(path: &Path) -> StoreResult<File> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(path)
        .map_err(io_error)
}
/// Digest in bounded chunks, optionally copying to a new private file.
pub(crate) fn copy_digest(path: &Path, target: Option<&Path>, limit: usize) -> StoreResult<String> {
    let mut input = file(path, limit)?;
    let mut output = target.map(private_file).transpose()?;
    let mut scratch = vec![0; FILE_BUFFER];
    let mut hash = Sha256::new();
    let mut size = 0usize;
    loop {
        let count = input.read(&mut scratch).map_err(io_error)?;
        if count == 0 {
            break;
        }
        size = size
            .checked_add(count)
            .filter(|s| *s <= limit)
            .ok_or(StoreError::Capacity)?;
        hash.update(&scratch[..count]);
        if let Some(output) = &mut output {
            output.write_all(&scratch[..count]).map_err(io_error)?;
        }
    }
    if let Some(output) = output {
        output.sync_all().map_err(io_error)?;
    }
    Ok(openlegend_simulation::encoding::hex_bytes(&hash.finalize()))
}

impl Store {
    pub(crate) fn scenario_origin(
        &self,
        dir: &Path,
        world: &str,
        id: &str,
    ) -> StoreResult<Option<crate::lab::Proof>> {
        let point = super::catalog::read_metadata(dir, id, world, &self.schema.checkpoint)
            .ok_or(StoreError::InvalidRecord)?;
        Ok(point.origin)
    }
}

impl Store {
    /// Verify the native metadata, header and whole body as one immutable file.
    /// This explicit transfer runs on a blocking worker with admitted scratch.
    pub(crate) fn transfer_scenario_files(
        &self,
        from: &Path,
        to: Option<&Path>,
        world: &str,
        id: &str,
    ) -> StoreResult<Verified> {
        if !fs::symlink_metadata(from.parent().ok_or(StoreError::InvalidRecord)?)
            .map_err(io_error)?
            .is_dir()
            || !fs::symlink_metadata(from).map_err(io_error)?.is_dir()
        {
            return Err(StoreError::InvalidRecord);
        }
        let format = &self.schema.checkpoint;
        let _work = self
            .budget
            .reserve(
                format
                    .row_bytes
                    .checked_mul(4)
                    .and_then(|b| b.checked_add(FILE_BUFFER * 3 + METADATA * 8))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let meta = from.join("metadata.json");
        let body = from.join("world.jsonl");
        let metadata: Metadata = serde_json::from_reader(file(&meta, METADATA)?)
            .map_err(|_| StoreError::InvalidRecord)?;
        if !metadata.valid(id, world, format)
            || !matches!(
                metadata.kind,
                Some(MetadataKind::Manual | MetadataKind::Scenario)
            )
        {
            return Err(StoreError::InvalidRecord);
        }
        let native = file(&body, format.bytes)?;
        if native.metadata().map_err(io_error)?.len() != metadata.bytes as u64 {
            return Err(StoreError::InvalidRecord);
        }
        let mut header = Vec::new();
        BufReader::new(native)
            .take(format.row_bytes as u64 + 1)
            .read_until(b'\n', &mut header)
            .map_err(io_error)?;
        if header.last() != Some(&b'\n') || header.len() > format.row_bytes {
            return Err(StoreError::InvalidRecord);
        }
        let header: Header =
            serde_json::from_slice(&header).map_err(|_| StoreError::InvalidRecord)?;
        let snapshot = header.scenario.ok_or(StoreError::InvalidRecord)?;
        if snapshot.origin != metadata.origin
            || Some(snapshot.namespace()) != metadata.lab_namespace
        {
            return Err(StoreError::InvalidRecord);
        }
        if header.world_id != world
            || header.revision != metadata.revision.ok_or(StoreError::InvalidRecord)?
            || header.encoding != format.encoding
            || header.format != format.format
        {
            return Err(StoreError::InvalidRecord);
        }
        if copy_digest(
            &body,
            to.map(|p| p.join("world.jsonl")).as_deref(),
            format.bytes,
        )? != metadata.checksum
        {
            return Err(StoreError::InvalidRecord);
        }
        let identity = copy_digest(
            &meta,
            to.map(|p| p.join("metadata.json")).as_deref(),
            METADATA,
        )?;
        Ok(Verified { snapshot, identity })
    }

    /// Keep the selected checkpoint's authorized art pins for the independently
    /// retained export. A returning local slot acquires those exact pins again.
    pub(crate) async fn copy_scenario_assets(
        tx: &Transaction<'_>,
        world: &str,
        id: &str,
        export: bool,
    ) -> StoreResult<()> {
        let slot = capture_assets::owner_id(world, id)?;
        let archive = capture_assets::owner_id(world, &format!("lab-exchange:{id}"))?;
        let (from, to) = if export {
            (&slot, &archive)
        } else {
            (&archive, &slot)
        };
        capture_assets::copy_holds(tx, "save", from, "save", to).await
    }
}

pub(crate) fn private_stage(root: &Path) -> StoreResult<PathBuf> {
    use std::os::unix::fs::DirBuilderExt;
    if !root.exists() {
        fs::DirBuilder::new()
            .mode(0o700)
            .create(root)
            .map_err(io_error)?;
    }
    if !fs::symlink_metadata(root).map_err(io_error)?.is_dir() {
        return Err(StoreError::InvalidRecord);
    }
    let stage = root.join(format!(".pending-{}", uuid::Uuid::new_v4()));
    fs::DirBuilder::new()
        .mode(0o700)
        .create(&stage)
        .map_err(io_error)?;
    Ok(stage)
}

impl Store {
    /// Keep all source rows verbatim. Only the lab-owned checkpoint header,
    /// ID, label and checksum change. The trusted reader checked the original.
    pub(crate) fn write_scenario_start(
        &self,
        source: &Path,
        stage: &Path,
        snapshot: Snapshot,
        world: &str,
        id: &str,
        label: &str,
        sequence: u64,
    ) -> StoreResult<()> {
        let format = &self.schema.checkpoint;
        let _workspace = self
            .budget
            .reserve(
                format
                    .row_bytes
                    .checked_mul(4)
                    .and_then(|n| n.checked_add(FILE_BUFFER * 3 + METADATA * 6))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let mut metadata: Metadata =
            serde_json::from_reader(file(&source.join("metadata.json"), METADATA)?)
                .map_err(|_| StoreError::InvalidRecord)?;
        if metadata.world_id != world || !metadata.valid(&metadata.id, world, format) {
            return Err(StoreError::InvalidRecord);
        }
        let mut read = BufReader::new(file(&source.join("world.jsonl"), format.bytes)?);
        let mut first = Vec::new();
        (&mut read)
            .take(format.row_bytes as u64 + 1)
            .read_until(b'\n', &mut first)
            .map_err(io_error)?;
        if first.last() != Some(&b'\n') || first.len() > format.row_bytes {
            return Err(StoreError::InvalidRecord);
        }
        let mut header: Header =
            serde_json::from_slice(&first).map_err(|_| StoreError::InvalidRecord)?;
        if header.scenario.is_some() || header.world_id != world {
            return Err(StoreError::InvalidRecord);
        }
        metadata.origin = snapshot.origin.clone();
        metadata.lab_namespace = Some(snapshot.namespace());
        header.scenario = Some(snapshot);
        let mut encoded = serde_json::to_vec(&header).map_err(|_| StoreError::InvalidRecord)?;
        encoded.push(b'\n');
        metadata.bytes = metadata
            .bytes
            .checked_sub(first.len())
            .and_then(|n| n.checked_add(encoded.len()))
            .filter(|n| *n <= format.bytes)
            .ok_or(StoreError::Capacity)?;
        let mut original = Sha256::new();
        original.update(&first);
        let mut hash = Sha256::new();
        hash.update(&encoded);
        let mut output = private_file(&stage.join("world.jsonl"))?;
        output.write_all(&encoded).map_err(io_error)?;
        let mut scratch = vec![0; FILE_BUFFER];
        loop {
            let len = read.read(&mut scratch).map_err(io_error)?;
            if len == 0 {
                break;
            }
            original.update(&scratch[..len]);
            hash.update(&scratch[..len]);
            output.write_all(&scratch[..len]).map_err(io_error)?;
        }
        if openlegend_simulation::encoding::hex_bytes(&original.finalize()) != metadata.checksum
            || output.metadata().map_err(io_error)?.len() != metadata.bytes as u64
        {
            return Err(StoreError::InvalidRecord);
        }
        output.sync_all().map_err(io_error)?;
        metadata.id = id.to_owned();
        metadata.sequence = Some(sequence);
        metadata.kind = Some(MetadataKind::Scenario);
        metadata.label = label.to_owned();
        metadata.created_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        metadata.checksum = openlegend_simulation::encoding::hex_bytes(&hash.finalize());
        let mut out = private_file(&stage.join("metadata.json"))?;
        serde_json::to_writer(&mut out, &metadata).map_err(|_| StoreError::InvalidRecord)?;
        out.sync_all().map_err(io_error)?;
        File::open(stage)
            .and_then(|f| f.sync_all())
            .map_err(io_error)
    }
    pub(crate) async fn claim_scenario_start(
        self: &std::sync::Arc<Self>,
        root: PathBuf,
        world: String,
        id: &str,
    ) -> StoreResult<u64> {
        let store = self.clone();
        let selected = world.clone();
        let highest = tokio::task::spawn_blocking(move || {
            super::catalog::highest_sequence(&root, &selected, &store.schema.checkpoint)
        })
        .await
        .map_err(|_| StoreError::Cancelled)?
        .map_err(|_| StoreError::InvalidRecord)?;
        Ok(self.claim_checkpoint(&world, id, highest).await?.1)
    }
}
