//! File ordering and retention use the same immutable metadata as the
//! stopped recovery reader. Only integrity-checked automatic points count as
//! replacements, and a failed capture never enters rotation.

use super::{
    CheckpointFormat, FILE_BUFFER, METADATA, Metadata, MetadataKind, capture::CaptureError, file,
};
use crate::store::{Store, StoreError};
use openlegend_simulation::encoding::hex_bytes;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::Arc;

const PAGE: usize = 100;
// A page may keep the bounded manifests until it has selected and returned
// its summaries. Another manifest can be decoding at the same time.
pub(super) const LIST_WORKSPACE: usize = (2 * (PAGE + 2) + 8) * METADATA;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CheckpointCursor {
    id: String,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    sequence: Option<u64>,
}

impl CheckpointCursor {
    pub(crate) fn valid(&self) -> bool {
        self.id.len() == 36
            && uuid::Uuid::parse_str(&self.id).is_ok()
            && chrono::DateTime::parse_from_rfc3339(&self.created_at).is_ok()
            && self
                .sequence
                .is_none_or(|value| value <= crate::store::MAX_SAFE_INTEGER)
    }

    fn of(point: &Metadata) -> Self {
        Self {
            id: point.id.clone(),
            created_at: point.created_at.clone(),
            sequence: point.sequence,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CheckpointSummary {
    #[serde(flatten)]
    position: CheckpointCursor,
    label: String,
    sim_time: f64,
    kind: MetadataKind,
    compatible: bool,
}

#[derive(Default)]
pub(super) struct Catalog {
    pub(super) saves: Vec<CheckpointSummary>,
    pub(super) next: Option<CheckpointCursor>,
    pub(super) last_automatic: Option<String>,
    pub(super) unavailable: usize,
    pub(super) bytes: u64,
}

pub(super) fn list(
    root: &Path,
    world: &str,
    before: Option<&CheckpointCursor>,
    contract: &CheckpointFormat,
) -> Result<Catalog, CaptureError> {
    let mut result = Catalog::default();
    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(result),
        Err(error) => return Err(error.into()),
    };
    let mut points = Vec::with_capacity(PAGE + 2);
    let mut last = None::<CheckpointCursor>;
    for entry in entries {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }
        let name = entry.file_name();
        let Some(id) = name.to_str() else { continue };
        let directory = entry.path();
        result.bytes = ["metadata.json", "world.jsonl"]
            .iter()
            .filter_map(|name| fs::symlink_metadata(directory.join(name)).ok())
            .filter(|entry| entry.is_file())
            .fold(result.bytes, |total, entry| {
                total.saturating_add(entry.len())
            });
        if id.len() != 36 || uuid::Uuid::parse_str(id).is_err() {
            continue;
        }
        let Some(point) = read_manifest(&directory) else {
            result.unavailable += 1;
            continue;
        };
        if point.world_id != world || point.kind == Some(MetadataKind::Recovery) {
            continue;
        }
        if !point.valid(id, world, contract) || !has_body(&directory, &point, contract) {
            result.unavailable += 1;
            continue;
        }
        if point.kind == Some(MetadataKind::Auto)
            && last.as_ref().is_none_or(|prior| {
                compare(&point, &prior.id, &prior.created_at, prior.sequence).is_lt()
            })
        {
            last = Some(CheckpointCursor::of(&point));
        }
        if before.is_some_and(|cursor| {
            !compare(&point, &cursor.id, &cursor.created_at, cursor.sequence).is_gt()
        }) {
            continue;
        }
        points.push(point);
        if points.len() > PAGE + 1 {
            points.sort_unstable_by(compare_points);
            points.pop();
        }
    }
    points.sort_unstable_by(compare_points);
    if points.len() > PAGE {
        points.pop();
        result.next = points.last().map(CheckpointCursor::of);
    }
    result.last_automatic = last.map(|point| point.created_at);
    result.saves = points
        .into_iter()
        .map(|point| CheckpointSummary {
            position: CheckpointCursor::of(&point),
            label: point.label,
            sim_time: point.sim_time,
            kind: point.kind.unwrap_or(MetadataKind::Manual),
            compatible: true,
        })
        .collect();
    Ok(result)
}

fn compare_points(left: &Metadata, right: &Metadata) -> Ordering {
    compare(left, &right.id, &right.created_at, right.sequence)
}

fn compare(left: &Metadata, id: &str, at: &str, sequence: Option<u64>) -> Ordering {
    sequence
        .unwrap_or(0)
        .cmp(&left.sequence.unwrap_or(0))
        .then_with(|| at.cmp(left.created_at.as_str()))
        .then_with(|| id.cmp(left.id.as_str()))
}

pub(super) fn delete(
    root: &Path,
    world: &str,
    id: &str,
    authorize: impl FnOnce() -> Result<(), crate::world::WorldError>,
) -> Result<(), CaptureError> {
    let directory = root.join(id);
    match fs::symlink_metadata(&directory) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            authorize()?;
            return Ok(());
        }
        Err(error) => return Err(error.into()),
        Ok(entry) if entry.is_dir() => {}
        Ok(_) => return Err(StoreError::InvalidRecord.into()),
    }
    let point = read_manifest(&directory).ok_or(StoreError::InvalidRecord)?;
    if point.id != id || point.world_id != world || point.kind == Some(MetadataKind::Recovery) {
        return Err(CaptureError::Conflict);
    }
    authorize()?;
    fs::remove_dir_all(&directory)?;
    File::open(root)?.sync_all()?;
    Ok(())
}

pub(super) fn highest_sequence(
    root: &Path,
    world: &str,
    contract: &CheckpointFormat,
) -> Result<u64, CaptureError> {
    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(0),
        Err(error) => return Err(error.into()),
    };
    let mut highest = 0;
    for entry in entries {
        if let Some(record) = metadata(entry?, world, contract) {
            highest = highest.max(record.sequence.unwrap_or(0));
        }
    }
    Ok(highest)
}

impl Store {
    pub(super) async fn rotate_automatic(
        self: &Arc<Self>,
        root: PathBuf,
        world: &str,
        retention: usize,
    ) -> Result<(), CaptureError> {
        let storage = Arc::clone(self);
        let world_id = world.to_owned();
        let (deleted, operation) = tokio::task::spawn_blocking(move || {
            let _custody = storage
                .budget
                .reserve(FILE_BUFFER)
                .map_err(|_| StoreError::Capacity)?;
            rotate_files(&root, &world_id, retention, &storage.schema.checkpoint)
        })
        .await
        .map_err(|_| CaptureError::Format)??;
        let mut cleanup = Ok(());
        for id in deleted {
            if let Err(error) = self.release_checkpoint_assets(world, &id, false).await {
                cleanup = Err(error.into());
            }
        }
        operation.and(cleanup)
    }
}

fn rotate_files(
    root: &Path,
    world: &str,
    retention: usize,
    contract: &CheckpointFormat,
) -> Result<(Vec<String>, Result<(), CaptureError>), CaptureError> {
    let mut points = Vec::new();
    for entry in fs::read_dir(root)? {
        if let Some(point) = metadata(entry?, world, contract)
            && point.kind == Some(MetadataKind::Auto)
        {
            points.push(point);
        }
    }
    points.sort_unstable_by(compare_points);
    let supported: Vec<usize> = points
        .iter()
        .enumerate()
        .filter(|(_, point)| digest_matches(root, point, contract).unwrap_or(false))
        .take(retention)
        .map(|(index, _)| index)
        .collect();
    if supported.len() < retention {
        return Ok((Vec::new(), Ok(())));
    }
    let mut deleted = Vec::new();
    let removed = (|| {
        for (index, point) in points.into_iter().enumerate() {
            if !supported.contains(&index) {
                fs::remove_dir_all(root.join(&point.id))?;
                deleted.push(point.id);
            }
        }
        Ok(())
    })();
    if !deleted.is_empty() {
        File::open(root)?.sync_all()?;
    }
    Ok((deleted, removed))
}

fn metadata(entry: fs::DirEntry, world: &str, contract: &CheckpointFormat) -> Option<Metadata> {
    let name = entry.file_name();
    let id = name.to_str()?;
    read_metadata(&entry.path(), id, world, contract)
}

fn read_metadata(
    directory: &Path,
    id: &str,
    world: &str,
    contract: &CheckpointFormat,
) -> Option<Metadata> {
    if uuid::Uuid::parse_str(id).is_err()
        || id.len() != 36
        || !fs::symlink_metadata(directory).ok()?.is_dir()
    {
        return None;
    }
    let metadata = read_manifest(directory)?;
    (metadata.valid(id, world, contract) && has_body(directory, &metadata, contract))
        .then_some(metadata)
}

fn read_manifest(directory: &Path) -> Option<Metadata> {
    let read = file(&directory.join("metadata.json"), METADATA).ok()?;
    serde_json::from_reader(read.take(METADATA as u64 + 1)).ok()
}

fn has_body(directory: &Path, metadata: &Metadata, limit: &CheckpointFormat) -> bool {
    file(&directory.join("world.jsonl"), limit.bytes)
        .ok()
        .and_then(|payload| payload.metadata().ok())
        .is_some_and(|payload| payload.len() == metadata.bytes as u64)
}

pub(super) fn verify_repeated_manual(
    root: &Path,
    world: &str,
    id: &str,
    label: &str,
    contract: &CheckpointFormat,
) -> Result<bool, CaptureError> {
    let directory = root.join(id);
    match fs::symlink_metadata(&directory) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(false),
        Err(error) => return Err(error.into()),
        Ok(_) => (),
    }
    let point = read_metadata(&directory, id, world, contract).ok_or(StoreError::InvalidRecord)?;
    if point.kind.unwrap_or(MetadataKind::Manual) != MetadataKind::Manual || point.label != label {
        return Err(CaptureError::Conflict);
    }
    if !digest_matches(root, &point, contract)? {
        return Err(StoreError::InvalidRecord.into());
    }
    File::open(root)?.sync_all()?;
    Ok(true)
}

fn digest_matches(
    root: &Path,
    metadata: &Metadata,
    contract: &CheckpointFormat,
) -> Result<bool, CaptureError> {
    let mut reader = file(&root.join(&metadata.id).join("world.jsonl"), contract.bytes)?;
    let mut digest = Sha256::new();
    let mut workspace = vec![0; FILE_BUFFER];
    let mut length = 0;
    loop {
        let bytes = reader.read(&mut workspace)?;
        if bytes == 0 {
            break;
        }
        length += bytes;
        if length > metadata.bytes {
            return Ok(false);
        }
        digest.update(&workspace[..bytes]);
    }
    Ok(length == metadata.bytes && hex_bytes(&digest.finalize()) == metadata.checksum)
}
