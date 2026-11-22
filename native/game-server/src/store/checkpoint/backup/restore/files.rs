//! Reconcile the same durable directory, attempt and per-slot witnesses as
//! the operational restore policy. Files only move before an admitted install.

use super::*;
use std::collections::BTreeSet;
use std::path::PathBuf;

const OWNER: &str = ".directory-owner.json";
const JOURNALS: &str = ".restore-attempts";
const SLOT_OWNER: &str = ".restore-owner.json";
const FORMAT: &str = "operational-restore-attempt-1";

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct DirectoryOwner {
    id: Uuid,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Attempt {
    format: String,
    pub id: Uuid,
    directory_owner: Uuid,
    pub world_id: String,
    starting_revision: Option<u64>,
    saves: Vec<String>,
    preexisting: BTreeSet<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recovery_id: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SlotOwner {
    attempt_id: Uuid,
    id: String,
    world_id: String,
    checksum: String,
}

pub(super) fn read_json<T: serde::de::DeserializeOwned>(
    path: &Path,
    limit: usize,
) -> StoreResult<Option<T>> {
    if !exists(path).map_err(io_error)? {
        return Ok(None);
    }
    serde_json::from_reader(file(path, limit)?.take(limit as u64 + 1))
        .map(Some)
        .map_err(|_| StoreError::InvalidRecord)
}

fn durable_json(path: &Path, body: &impl Serialize) -> StoreResult<()> {
    let mut target = private_file(path).map_err(io_error)?;
    serde_json::to_writer(&mut target, body).map_err(|_| StoreError::InvalidRecord)?;
    target.sync_all().map_err(io_error)?;
    File::open(path.parent().ok_or(StoreError::InvalidRecord)?)
        .and_then(|parent| parent.sync_all())
        .map_err(io_error)
}

pub(super) fn directory(data: &Path, source: &Path) -> StoreResult<PathBuf> {
    fs::create_dir_all(data).map_err(io_error)?;
    let data = fs::canonicalize(data).map_err(io_error)?;
    if data.starts_with(source) || source.starts_with(&data) {
        return Err(StoreError::InvalidRecord);
    }
    let saves = data.join("saves");
    if !exists(&saves).map_err(io_error)? {
        private_directory(&saves).map_err(io_error)?;
        File::open(&data)
            .and_then(|parent| parent.sync_all())
            .map_err(io_error)?;
    }
    require_directory(&saves)?;
    Ok(saves)
}

/// Inspect the directory before writing either owner marker. Recreating a
/// missing marker is safe only when its already-bound directory remains empty.
pub(super) fn verify_owner(
    directory: &Path,
    database: Option<Uuid>,
    world: &str,
    contract: &CheckpointFormat,
) -> StoreResult<()> {
    let owner: Option<DirectoryOwner> = read_json(&directory.join(OWNER), 1024)?;
    if let Some(owner) = owner {
        return (Some(owner.id) == database)
            .then_some(())
            .ok_or(StoreError::InvalidRecord);
    }
    if database.is_some() {
        if fs::read_dir(directory).map_err(io_error)?.next().is_some() {
            return Err(StoreError::InvalidRecord);
        }
        return Ok(());
    }
    verify_world(directory, world, contract)
}

pub(super) fn write_owner(directory: &Path, id: Uuid) -> StoreResult<()> {
    let path = directory.join(OWNER);
    if let Some(previous) = read_json::<DirectoryOwner>(&path, 1024)? {
        if previous.id != id {
            return Err(StoreError::InvalidRecord);
        }
        return Ok(());
    }
    durable_json(&path, &DirectoryOwner { id })
}

fn verify_world(directory: &Path, world: &str, contract: &CheckpointFormat) -> StoreResult<()> {
    for slot in fs::read_dir(directory).map_err(io_error)? {
        let slot = slot.map_err(io_error)?;
        let id = slot.file_name();
        let Some(id) = id.to_str().filter(|id| valid_id(id)) else {
            continue;
        };
        require_directory(&slot.path())?;
        let meta = read_metadata(&slot.path())?;
        if !meta.valid(id, world, contract) {
            return Err(StoreError::InvalidRecord);
        }
    }
    Ok(())
}

pub(super) fn journals(directory: &Path) -> StoreResult<Option<fs::ReadDir>> {
    let path = directory.join(JOURNALS);
    if !exists(&path).map_err(io_error)? {
        return Ok(None);
    }
    require_directory(&path)?;
    Ok(Some(fs::read_dir(path).map_err(io_error)?))
}

pub(super) fn next_attempt(
    files: &mut fs::ReadDir,
    contract: &CheckpointFormat,
) -> StoreResult<Option<Attempt>> {
    for record in files {
        let record = record.map_err(io_error)?;
        let name = record.file_name();
        let Some(id) = name
            .to_str()
            .and_then(|name| name.strip_suffix(".json"))
            .filter(|id| valid_id(id))
        else {
            continue;
        };
        let attempt: Attempt = read_json(&record.path(), contract.backup.manifest_bytes)?
            .ok_or(StoreError::InvalidRecord)?;
        let slots: BTreeSet<_> = attempt.saves.iter().collect();
        if attempt.id.to_string() != id
            || attempt.format != FORMAT
            || attempt.world_id.is_empty()
            || slots.len() != attempt.saves.len()
            || slots.len() > contract.backup.slots
            || attempt.saves.iter().any(|id| !valid_id(id))
            || attempt.preexisting.iter().any(|id| !slots.contains(id))
            || attempt
                .recovery_id
                .as_deref()
                .is_some_and(|id| !valid_id(id))
        {
            return Err(StoreError::InvalidRecord);
        }
        return Ok(Some(attempt));
    }
    Ok(None)
}

pub(super) fn begin(
    directory: &Path,
    manifest: &Manifest,
    directory_owner: Uuid,
) -> StoreResult<Attempt> {
    let mut preexisting = BTreeSet::new();
    for id in &manifest.saves {
        if exists(&directory.join(id)).map_err(io_error)? {
            preexisting.insert(id.clone());
        }
    }
    let attempt = Attempt {
        format: FORMAT.into(),
        id: Uuid::new_v4(),
        directory_owner,
        world_id: manifest.world_id.clone(),
        starting_revision: None,
        saves: manifest.saves.iter().cloned().collect(),
        preexisting,
        recovery_id: None,
    };
    let journal = directory.join(JOURNALS);
    if !exists(&journal).map_err(io_error)? {
        private_directory(&journal).map_err(io_error)?;
        File::open(directory)
            .and_then(|parent| parent.sync_all())
            .map_err(io_error)?;
    }
    require_directory(&journal)?;
    durable_json(&journal.join(format!("{}.json", attempt.id)), &attempt)?;
    Ok(attempt)
}

pub(super) fn publish(
    source: &Path,
    directory: &Path,
    attempt: &Attempt,
    expected: [u8; 32],
    contract: &CheckpointFormat,
    admit_artwork: bool,
    budget: &ByteBudget,
) -> StoreResult<RetainedArtwork> {
    let mut scratch = Vec::new();
    let mut identity = Sha256::new();
    let mut artwork = RetainedArtwork {
        values: Vec::new(),
        custody: budget.reserve(0).map_err(|_| StoreError::Capacity)?,
    };
    for id in &attempt.saves {
        let from = source.join("saves").join(id);
        let destination = directory.join(id);
        let (metadata, raw) =
            retained_metadata(&from, id, &attempt.world_id, contract, &mut identity)?;
        if attempt.preexisting.contains(id) {
            let prior = read_metadata(&destination)?;
            if !prior.valid(id, &attempt.world_id, contract) || prior.checksum != metadata.checksum
            {
                return Err(StoreError::InvalidRecord);
            }
            artwork.retain(
                id,
                transfer_slot(
                    &from,
                    None,
                    &metadata,
                    contract,
                    &mut scratch,
                    admit_artwork,
                )?,
            )?;
            verify_slot(&destination, &prior, contract, &mut scratch)?;
            continue;
        }
        let stage = directory.join(format!(".restore-pending-{}-{id}", attempt.id));
        private_directory(&stage).map_err(io_error)?;
        artwork.retain(
            id,
            transfer_slot(
                &from,
                Some(&stage),
                &metadata,
                contract,
                &mut scratch,
                admit_artwork,
            )?,
        )?;
        let mut meta = private_file(&stage.join("metadata.json")).map_err(io_error)?;
        meta.write_all(&raw).map_err(io_error)?;
        meta.sync_all().map_err(io_error)?;
        durable_json(
            &stage.join(SLOT_OWNER),
            &SlotOwner {
                attempt_id: attempt.id,
                id: id.clone(),
                world_id: attempt.world_id.clone(),
                checksum: metadata.checksum,
            },
        )?;
        publish_directory(&stage, &destination).map_err(io_error)?;
        File::open(directory)
            .and_then(|parent| parent.sync_all())
            .map_err(io_error)?;
    }
    (Into::<[u8; 32]>::into(identity.finalize()) == expected)
        .then_some(artwork)
        .ok_or(StoreError::InvalidRecord)
}

pub(super) struct RetainedArtwork {
    pub values: Vec<(String, AssetRevision)>,
    custody: openlegend_simulation::host::ByteReservation,
}

impl RetainedArtwork {
    fn retain(&mut self, id: &str, selected: Option<(AssetRevision, usize)>) -> StoreResult<()> {
        let Some((selected, source_bytes)) = selected else {
            return Ok(());
        };
        let retained = self
            .custody
            .bytes()
            .checked_add(id.len() + source_bytes * 4 + 2 * size_of::<(String, AssetRevision)>())
            .ok_or(StoreError::Capacity)?;
        self.custody
            .resize(retained)
            .map_err(|_| StoreError::Capacity)?;
        self.values.push((id.to_owned(), selected));
        Ok(())
    }
}

/// Retained slots participate in the same identity as the current checkpoint
/// and operational stream. A repeated receipt also verifies package bytes.
pub(super) fn retained_identity(
    source: &Path,
    manifest: &Manifest,
    contract: &CheckpointFormat,
    verify: bool,
    admit_artwork: bool,
) -> StoreResult<[u8; 32]> {
    let mut identity = Sha256::new();
    let mut scratch = Vec::new();
    for id in &manifest.saves {
        let path = source.join("saves").join(id);
        let (metadata, _) =
            retained_metadata(&path, id, &manifest.world_id, contract, &mut identity)?;
        if verify {
            transfer_slot(
                &path,
                None,
                &metadata,
                contract,
                &mut scratch,
                admit_artwork,
            )?;
        }
    }
    Ok(identity.finalize().into())
}

fn retained_metadata(
    path: &Path,
    id: &str,
    world: &str,
    contract: &CheckpointFormat,
    identity: &mut Sha256,
) -> StoreResult<(Metadata, Vec<u8>)> {
    require_directory(path)?;
    let (metadata, raw) = slot_metadata(path).map_err(|_| StoreError::InvalidRecord)?;
    if !metadata.valid(id, world, contract) {
        return Err(StoreError::InvalidRecord);
    }
    identity.update(id.as_bytes());
    identity.update(metadata.checksum.as_bytes());
    Ok((metadata, raw))
}

pub(super) fn reconcile(
    directory: &Path,
    attempt: &Attempt,
    database_owner: Uuid,
    installed: bool,
    head: Option<&DurableHead>,
    contract: &CheckpointFormat,
) -> StoreResult<()> {
    let file_owner: Option<DirectoryOwner> = read_json(&directory.join(OWNER), 1024)?;
    if file_owner.map(|owner| owner.id) != Some(database_owner)
        || attempt.directory_owner != database_owner
    {
        return Err(StoreError::InvalidRecord);
    }
    if !installed {
        if head.is_some() || attempt.starting_revision.is_some() || attempt.recovery_id.is_some() {
            return Err(StoreError::StaleCut);
        }
        verify_world(directory, &attempt.world_id, contract)?;
        let mut scratch = Vec::new();
        for id in &attempt.saves {
            if attempt.preexisting.contains(id) {
                continue;
            }
            let stage = directory.join(format!(".restore-pending-{}-{id}", attempt.id));
            if exists(&stage).map_err(io_error)? {
                // The UUID attempt owned this unpublished path before copy.
                // A published save still needs its matching embedded witness.
                require_directory(&stage)?;
                fs::remove_dir_all(stage).map_err(io_error)?;
            }
            let path = directory.join(id);
            if !exists(&path).map_err(io_error)? {
                continue;
            }
            require_directory(&path)?;
            let owner: SlotOwner =
                read_json(&path.join(SLOT_OWNER), METADATA)?.ok_or(StoreError::InvalidRecord)?;
            let metadata = read_metadata(&path)?;
            if owner.attempt_id != attempt.id
                || owner.id != *id
                || owner.world_id != attempt.world_id
                || owner.checksum != metadata.checksum
                || !metadata.valid(id, &attempt.world_id, contract)
            {
                return Err(StoreError::InvalidRecord);
            }
            verify_slot(&path, &metadata, contract, &mut scratch)?;
            fs::remove_dir_all(path).map_err(io_error)?;
        }
        File::open(directory)
            .and_then(|parent| parent.sync_all())
            .map_err(io_error)?;
    }
    let journals = directory.join(JOURNALS);
    fs::remove_file(journals.join(format!("{}.json", attempt.id))).map_err(io_error)?;
    File::open(journals)
        .and_then(|parent| parent.sync_all())
        .map_err(io_error)
}

fn verify_slot(
    path: &Path,
    metadata: &Metadata,
    contract: &CheckpointFormat,
    scratch: &mut Vec<u8>,
) -> StoreResult<()> {
    stream_slot(path, metadata, contract, scratch, |_| Ok(()))
        .map_err(|_| StoreError::InvalidRecord)
}

fn transfer_slot(
    path: &Path,
    stage: Option<&Path>,
    metadata: &Metadata,
    contract: &CheckpointFormat,
    scratch: &mut Vec<u8>,
    admit_artwork: bool,
) -> StoreResult<Option<(AssetRevision, usize)>> {
    use crate::store::checkpoint::Line;
    use serde_json::value::RawValue;

    let mut output = stage
        .map(|stage| private_file(&stage.join("world.jsonl")))
        .transpose()
        .map_err(io_error)?
        .map(|file| BufWriter::with_capacity(FILE_BUFFER, file));
    let mut header = true;
    let mut selected = None;
    stream_slot(path, metadata, contract, scratch, |bytes| {
        // The shared checksum verifies the original bytes including the header.
        if !std::mem::take(&mut header) {
            let line: Line<'_> =
                serde_json::from_slice(bytes).map_err(|_| StoreError::InvalidRecord)?;
            if let Some(row) = line.row.filter(|_| line.table == "data_world") {
                #[derive(Deserialize)]
                struct World<'a> {
                    #[serde(borrow)]
                    payload: &'a RawValue,
                }
                let row: World<'_> =
                    serde_json::from_str(row.get()).map_err(|_| StoreError::InvalidRecord)?;
                let payload: std::borrow::Cow<'_, str> = serde_json::from_str(row.payload.get())
                    .map_err(|_| StoreError::InvalidRecord)?;
                let fields: std::collections::BTreeMap<&str, &RawValue> =
                    serde_json::from_str(&payload).map_err(|_| StoreError::InvalidRecord)?;
                if let Some(release) = fields.get("presentationRelease") {
                    if !admit_artwork || selected.is_some() {
                        return Err(StoreError::InvalidRecord.into());
                    }
                    selected = Some((AssetRevision::from_current(release)?, release.get().len()));
                }
            }
        }
        if let Some(writer) = &mut output {
            writer.write_all(bytes)?;
        }
        Ok(())
    })
    .map_err(|_| StoreError::InvalidRecord)?;
    if let Some(mut writer) = output {
        writer.flush().map_err(io_error)?;
        writer.get_ref().sync_all().map_err(io_error)?;
    }
    Ok(selected)
}
