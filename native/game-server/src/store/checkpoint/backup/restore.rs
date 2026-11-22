//! Empty-target operational recovery is distinct from rewinding a live world.
//! The stopped writer confirms canonical, historical and external state in one
//! transaction. Its durable attempt marker owns the separately copied slots.

use super::*;
use crate::command_epoch::RequestIdentity;
use crate::store::assets::AssetRevision;
use crate::store::{CommitError, CurrentOpening, DurableHead, StoreResult, sql_ordinal};
use openlegend_simulation::encoding::{json_record, json_record_len, sha256_hex};
use openlegend_simulation::records::SqlCell;
use openlegend_simulation::runtime::NativeWorldSession;
use std::future::Future;
use std::path::PathBuf;
use std::sync::Arc;
use tokio_postgres::Transaction;

mod artwork;
mod files;
mod occupied;
mod operations;
pub(crate) use artwork::{ArtworkOperator, require_completed_artwork_restore};
pub(crate) use occupied::DamagedReplacement;

const DIRECTORY_OWNER: &str = "integration:save-directory-owner";
const ATTEMPT_PREFIX: &str = "integration:restore-attempt:";
const BACKUP_RECEIPT_PREFIX: &str = "integration:operational-restore:";

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RestoredBackup {
    pub world_id: String,
    pub generation: String,
    pub revision: u64,
    pub retained_checkpoints: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artwork: Option<artwork::BackupArtwork>,
}

impl Store {
    /// Reopen only the packaged current format, with independently admitted
    /// files and database work. The caller owns the stopped writer throughout.
    pub(crate) async fn restore_operational_backup<F>(
        self: &Arc<Self>,
        source: &Path,
        data: &Path,
        artwork_operator: Option<ArtworkOperator>,
        replacement: Option<DamagedReplacement>,
        validate: impl FnOnce(CurrentOpening) -> F + Send + 'static,
    ) -> Result<RestoredBackup, CommitError>
    where
        F: Future<Output = StoreResult<NativeWorldSession>> + Send + 'static,
    {
        let store = self.clone();
        let source = source.to_owned();
        let data = data.to_owned();
        let (source, manifest, retained, directory, _files) = local(move || {
            let contract = &store.schema.checkpoint;
            let workspace = store
                .budget
                .reserve(
                    contract
                        .backup
                        .manifest_bytes
                        .checked_mul(8)
                        .and_then(|n| {
                            n.checked_add(contract.row_bytes * 4 + 2 * FILE_BUFFER + 8 * METADATA)
                        })
                        .ok_or(StoreError::Capacity)?,
                )
                .map_err(|_| StoreError::Capacity)?;
            require_directory(&source)?;
            let source = fs::canonicalize(source).map_err(io_error)?;
            let manifest: Manifest = files::read_json(
                &source.join("manifest.json"),
                contract.backup.manifest_bytes,
            )?
            .ok_or(StoreError::InvalidRecord)?;
            manifest.validate(contract)?;
            require_directory(&source.join("checkpoints"))?;
            if !manifest.saves.is_empty() {
                require_directory(&source.join("saves"))?;
            }
            let retained = files::retained_identity(&source, &manifest, contract, false, false)?;
            let directory = files::directory(&data, &source)?;
            Ok((source, Arc::new(manifest), retained, directory, workspace))
        })
        .await
        .map_err(CommitError::RolledBack)?;

        let checkpoint = self
            .retained_checkpoint(
                source.join("checkpoints"),
                manifest.checkpoint.to_string(),
                manifest.world_id.clone(),
            )
            .await
            .map_err(CommitError::RolledBack)?;
        let input = operations::prepare(self.clone(), source.clone(), manifest.clone())
            .await
            .map_err(CommitError::RolledBack)?;
        let identity = json_record(&(
            &*manifest,
            &checkpoint.checksum,
            input.checksum(),
            hex_bytes(&retained),
        ))
        .map_err(|_| CommitError::RolledBack(StoreError::InvalidRecord))?;
        let package_id = sha256_hex(identity.as_bytes());
        let receipt_key = format!("{BACKUP_RECEIPT_PREFIX}{package_id}");

        let existing = self
            .read_restore_state(&receipt_key)
            .await
            .map_err(CommitError::RolledBack)?;
        let store = self.clone();
        let world = manifest.world_id.clone();
        let target = directory.clone();
        local(move || {
            files::verify_owner(&target, existing.owner, &world, &store.schema.checkpoint)
        })
        .await
        .map_err(CommitError::RolledBack)?;
        if existing.owner.is_some() {
            self.reconcile_restore_files(&directory, &existing)
                .await
                .map_err(CommitError::RolledBack)?;
        }
        if let Some(replacement) = replacement {
            return self
                .replace_damaged_from_backup(
                    occupied::Package {
                        source,
                        manifest,
                        retained,
                        directory,
                        checkpoint,
                        operations: input,
                        id: package_id,
                    },
                    existing,
                    replacement,
                )
                .await;
        }
        if let Some(head) = existing.head {
            let receipt = existing
                .receipt
                .filter(|receipt| {
                    receipt.world_id == head.world_id && receipt.revision <= head.revision
                })
                .ok_or(CommitError::RolledBack(StoreError::StaleCut))?;
            artwork::assert_replay(receipt.artwork.as_ref(), artwork_operator.as_ref())
                .map_err(CommitError::RolledBack)?;
            let store = self.clone();
            return local(move || {
                let contract = &store.schema.checkpoint;
                input.verify(contract)?;
                if files::retained_identity(
                    &source,
                    &manifest,
                    contract,
                    true,
                    artwork_operator.is_some(),
                )? != retained
                {
                    return Err(StoreError::InvalidRecord);
                }
                Ok(receipt)
            })
            .await
            .map_err(CommitError::RolledBack);
        }

        let head = DurableHead {
            world_id: manifest.world_id.clone(),
            generation: Uuid::new_v4().to_string(),
            revision: checkpoint.revision,
        };
        let (mut opening, history) = checkpoint
            .into_opening(self, head.clone())
            .map_err(CommitError::RolledBack)?;
        opening
            .pause_operational_restore(&self.budget, artwork_operator.is_some())
            .map_err(CommitError::RolledBack)?;

        let owner = self.bind_restore_directory(existing.owner, None).await?;

        let target = directory.clone();
        let selection = manifest.clone();
        let attempt = local(move || {
            files::write_owner(&target, owner)?;
            files::begin(&target, &selection, owner, None).map(Arc::new)
        })
        .await
        .map_err(CommitError::RolledBack)?;
        let target = directory.clone();
        let store = self.clone();
        let pending = attempt.clone();
        let admit_artwork = artwork_operator.is_some();
        let copy = local(move || {
            files::publish(
                &source,
                &target,
                &pending,
                retained,
                &store.schema.checkpoint,
                admit_artwork,
                &store.budget,
            )
        })
        .await;
        let result = match copy {
            Err(error) => Err(CommitError::RolledBack(error)),
            Ok(retained_artwork) => {
                let writer = self.clone();
                self.operational(move |tx| {
                    Box::pin(async move {
                        writer.require_empty_restore_target(tx, Some(owner)).await?;
                        tx.execute(
                    "INSERT INTO world_head(id,world_id,revision,generation) VALUES (1,$1,$2,$3)",
                    &[&head.world_id, &sql_ordinal(head.revision)?, &head.generation],
                ).await?;
                        writer
                            .stage_opening_records(tx, &opening, &history, false)
                            .await?;
                        operations::stage(
                            &writer,
                            tx,
                            input,
                            operations::Import::Empty { admit_artwork },
                        ).await?;
                        writer
                            .check_imported_recovery_pointer(tx, &manifest)
                            .await?;
                        let session = validate(opening).await?;
                        let artwork = artwork::quarantine(
                            tx,
                            &head,
                            package_id,
                            &session,
                            artwork_operator,
                            &retained_artwork.values,
                        )
                        .await?;
                        let decoder = session
                            .operational_recall_decoder(
                                &head.world_id,
                                &head.generation,
                                head.revision,
                            )
                            .map_err(|error| {
                                eprintln!("Restore could not prepare recall from the staged world: {error}");
                                StoreError::InvalidRecord
                            })?;
                        writer
                            .rebuild_checkpoint_projections(tx, &head.world_id, &decoder)
                            .await?;
                        writer.validate_received(tx, &head.world_id).await?;

                        let mut authority = crate::store::checkpoint::read_recovery_authority(
                            tx,
                            &head,
                            None,
                            &writer.budget,
                        )
                        .await?;
                        let (canonical, _custody) =
                            writer.current_recovery_privacy(tx, &head.world_id).await?;
                        if authority.ledger.as_mut().is_some_and(|ledger| {
                            // A protected privacy edit keeps empty lists in the
                            // ledger. Canonical storage has no rows for them.
                            // Compare the restrictions without rewriting the ledger.
                            ledger.forgotten.retain(|_, sources| !sources.is_empty());
                            ledger.corrections.retain(|_, changes| !changes.is_empty());
                            ledger.forgotten != canonical.forgotten
                                || ledger.corrections != canonical.corrections
                        }) || (authority.ledger.is_none()
                            && (!canonical.forgotten.is_empty()
                                || !canonical.corrections.is_empty()))
                        {
                            return Err(StoreError::InvalidRecord);
                        }
                        RequestIdentity::restore(tx, &head.world_id, &authority.timeline).await?;
                        let key = format!("{ATTEMPT_PREFIX}{}", attempt.id);
                        let marker = json_record(&serde_json::json!({"worldId": head.world_id}))
                            .map_err(|_| StoreError::InvalidRecord)?;
                        let report = RestoredBackup {
                            world_id: head.world_id,
                            generation: head.generation,
                            revision: head.revision,
                            retained_checkpoints: manifest.saves.len(),
                            artwork,
                        };
                        let receipt =
                            json_record(&report).map_err(|_| StoreError::InvalidRecord)?;
                        tx.execute(
                            "INSERT INTO meta(key,value) VALUES($1,$2),($3,$4)",
                            &[&key, &marker, &receipt_key, &receipt],
                        )
                        .await?;
                        Ok(report)
                    })
                })
                .await
            }
        };

        self.finish_restore_files(&directory, owner, None, &result)
            .await;
        result
    }

    async fn bind_restore_directory(
        self: &Arc<Self>,
        current: Option<Uuid>,
        expected: Option<DurableHead>,
    ) -> Result<Uuid, CommitError> {
        let owner_id = current.unwrap_or_else(Uuid::new_v4);
        let writer = self.clone();
        self.operational(move |tx| {
            Box::pin(async move {
                if let Some(expected) = expected {
                    if durable_head(tx).await?.as_ref() != Some(&expected)
                        || owner(tx).await? != current
                    {
                        return Err(StoreError::StaleCut);
                    }
                } else {
                    writer.require_empty_restore_target(tx, current).await?;
                }
                if current.is_none() {
                    let encoded = json_record(&owner_id).map_err(|_| StoreError::InvalidRecord)?;
                    tx.execute(
                        "INSERT INTO meta(key,value) VALUES($1,$2)",
                        &[&DIRECTORY_OWNER, &encoded],
                    )
                    .await?;
                }
                Ok(owner_id)
            })
        })
        .await
    }

    async fn finish_restore_files(
        self: &Arc<Self>,
        directory: &Path,
        owner: Uuid,
        rollback_head: Option<DurableHead>,
        result: &Result<RestoredBackup, CommitError>,
    ) {
        match result {
            Err(CommitError::Unknown(_)) => {
                eprintln!(
                    "Restore commit is uncertain. Keep the source and target unchanged and retry to reconcile the saved attempt."
                );
            }
            outcome => {
                let existing = RestoreState {
                    head: outcome
                        .as_ref()
                        .ok()
                        .map(|saved| DurableHead {
                            world_id: saved.world_id.clone(),
                            generation: saved.generation.clone(),
                            revision: saved.revision,
                        })
                        .or(rollback_head),
                    owner: Some(owner),
                    receipt: None,
                };
                if let Err(error) = self.reconcile_restore_files(directory, &existing).await {
                    // A completed DB install stays completed. Retain ambiguous
                    // ownership/files and tell the operator what to inspect.
                    eprintln!("Restore attempt files were kept for inspection: {error}");
                }
            }
        }
    }

    async fn require_empty_restore_target(
        &self,
        tx: &Transaction<'_>,
        expected_owner: Option<Uuid>,
    ) -> StoreResult<()> {
        if durable_head(tx).await?.is_some() || owner(tx).await? != expected_owner {
            return Err(StoreError::StaleCut);
        }
        // The existing generated occupancy inventory includes durable history,
        // receipts and derived rows. Only this operation's owner marker is new.
        let selection = format!(
            "WITH meta AS (SELECT * FROM open_legend.meta WHERE key<>$1) {}",
            self.schema.creation_target_occupied,
        );
        let occupied: bool = tx
            .query_one(&selection, &[&DIRECTORY_OWNER])
            .await?
            .try_get(0)?;
        let mut tables = self
            .schema
            .checkpoint
            .backup
            .tables
            .iter()
            .map(String::as_str)
            .filter(|table| table.starts_with("asset_"))
            .collect::<Vec<_>>();
        tables.push("creation_target_registration");
        let extra = tables
            .into_iter()
            .map(|table| format!("SELECT 1 FROM {table}"))
            .collect::<Vec<_>>()
            .join(" UNION ALL ");
        let extra: bool = tx
            .query_one(&format!("SELECT EXISTS({extra})"), &[])
            .await?
            .try_get(0)?;
        if occupied || extra {
            return Err(StoreError::DamagedInstallation);
        }
        Ok(())
    }

    async fn check_imported_recovery_pointer(
        &self,
        tx: &Transaction<'_>,
        manifest: &Manifest,
    ) -> StoreResult<()> {
        let pointed =
            pre_load::pointed_file(tx, &manifest.world_id, &self.schema.checkpoint.format).await?;
        if pointed.is_some_and(|file| !manifest.saves.contains(&file))
            || tx
                .query_opt(
                    "SELECT 1 FROM game_saves WHERE id=$1 AND world_id<>$2 LIMIT 1",
                    &[&pre_load::ID, &manifest.world_id],
                )
                .await?
                .is_some()
        {
            return Err(StoreError::InvalidRecord);
        }
        Ok(())
    }

    async fn read_restore_state(&self, receipt: &str) -> StoreResult<RestoreState> {
        let receipt = receipt.to_owned();
        self.read_operational(move |tx| {
            Box::pin(async move {
                Ok(RestoreState {
                    head: durable_head(tx).await?,
                    owner: owner(tx).await?,
                    receipt: meta(tx, &receipt).await?,
                })
            })
        })
        .await
    }

    async fn reconcile_restore_files(
        self: &Arc<Self>,
        directory: &Path,
        state: &RestoreState,
    ) -> StoreResult<()> {
        let Some(owner) = state.owner else {
            return Ok(());
        };
        let path = directory.to_owned();
        let Some(mut journals) = local(move || files::journals(&path)).await? else {
            return Ok(());
        };
        loop {
            let store = self.clone();
            let (files, attempt) = local(move || {
                let attempt = files::next_attempt(&mut journals, &store.schema.checkpoint)?;
                Ok((journals, attempt))
            })
            .await?;
            journals = files;
            let Some(attempt) = attempt else { break };
            let key = format!("{ATTEMPT_PREFIX}{}", attempt.id);
            let marker = self
                .read_operational(move |tx| Box::pin(async move { meta::<Marker>(tx, &key).await }))
                .await?;
            let installed = if let Some(marker) = marker {
                if marker.world_id != attempt.world_id
                    || state
                        .head
                        .as_ref()
                        .is_none_or(|head| head.world_id != attempt.world_id)
                {
                    return Err(StoreError::InvalidRecord);
                }
                true
            } else {
                false
            };
            let protected = if !installed && attempt.starting_revision.is_some() {
                self.pre_load_file(&attempt.world_id).await?
            } else {
                None
            };
            let target = directory.to_owned();
            let store = self.clone();
            let head = state.head.clone();
            local(move || {
                files::reconcile(
                    &target,
                    &attempt,
                    owner,
                    installed,
                    head.as_ref(),
                    protected.as_deref(),
                    &store.schema.checkpoint,
                )
            })
            .await?;
        }
        Ok(())
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Marker {
    world_id: String,
}

struct RestoreState {
    head: Option<DurableHead>,
    owner: Option<Uuid>,
    receipt: Option<RestoredBackup>,
}

async fn owner(tx: &Transaction<'_>) -> StoreResult<Option<Uuid>> {
    meta(tx, DIRECTORY_OWNER).await
}

async fn meta<T: serde::de::DeserializeOwned>(
    tx: &Transaction<'_>,
    key: &str,
) -> StoreResult<Option<T>> {
    tx.query_opt(
        "SELECT CASE WHEN octet_length(value)<=4096 THEN value END FROM meta WHERE key=$1",
        &[&key],
    )
    .await?
    .map(|row| {
        let value: Option<&str> = row.try_get(0)?;
        serde_json::from_str(value.ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::InvalidRecord)
    })
    .transpose()
}

impl Manifest {
    fn validate(&self, contract: &CheckpointFormat) -> StoreResult<()> {
        let saves = self.saves.iter().collect::<BTreeSet<_>>();
        if self.format != contract.backup.format
            || !openlegend_simulation::values::is_safe_record_id(&self.world_id)
            || self.checkpoint == self.operations
            || saves.len() != self.saves.len()
            || self.saves.len() > contract.backup.slots
            || self.saves.iter().any(|id| !valid_id(id))
        {
            return Err(StoreError::InvalidRecord);
        }
        Ok(())
    }
}

impl CurrentOpening {
    fn pause_operational_restore(
        &mut self,
        budget: &ByteBudget,
        admit_artwork: bool,
    ) -> StoreResult<()> {
        for (table, field) in [
            ("world_settings", "paused"),
            ("data_world", "manuallyPaused"),
        ] {
            let [row] = self
                .records
                .tables
                .get_mut(table)
                .ok_or(StoreError::InvalidRecord)?
                .as_mut_slice()
            else {
                return Err(StoreError::InvalidRecord);
            };
            let _decode = budget
                .reserve(SqlCell::json_decode_bound(&row.payload).ok_or(StoreError::InvalidRecord)?)
                .map_err(|_| StoreError::Capacity)?;
            let SqlCell::Object(mut payload) =
                serde_json::from_str(&row.payload).map_err(|_| StoreError::InvalidRecord)?
            else {
                return Err(StoreError::InvalidRecord);
            };
            if !matches!(payload.get(field), Some(SqlCell::Bool(_))) {
                return Err(StoreError::InvalidRecord);
            }
            if !admit_artwork
                && table == "data_world"
                && payload.contains_key("presentationRelease")
            {
                eprintln!(
                    "Restore requires independent current artwork authority; no artwork has been installed."
                );
                return Err(StoreError::InvalidRecord);
            }
            payload.insert(field.into(), SqlCell::Bool(true));
            let size = json_record_len(&payload).map_err(|_| StoreError::InvalidRecord)?;
            let working = self
                .custody
                .bytes()
                .checked_add(size)
                .ok_or(StoreError::Capacity)?;
            self.custody
                .resize(working)
                .map_err(|_| StoreError::Capacity)?;
            let previous = row.payload.capacity();
            row.payload = json_record(&payload).map_err(|_| StoreError::InvalidRecord)?;
            self.custody
                .resize(working.checked_sub(previous).ok_or(StoreError::Capacity)?)
                .map_err(|_| StoreError::Capacity)?;
        }
        Ok(())
    }
}

fn valid_id(value: &str) -> bool {
    Uuid::parse_str(value).is_ok_and(|id| id.to_string() == value)
}

fn require_directory(path: &Path) -> StoreResult<()> {
    if fs::symlink_metadata(path).map_err(io_error)?.is_dir() {
        Ok(())
    } else {
        Err(StoreError::InvalidRecord)
    }
}

fn read_metadata(path: &Path) -> StoreResult<Metadata> {
    require_directory(path)?;
    files::read_json(&path.join("metadata.json"), METADATA)?.ok_or(StoreError::InvalidRecord)
}

async fn local<T: Send + 'static>(
    work: impl FnOnce() -> StoreResult<T> + Send + 'static,
) -> StoreResult<T> {
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|_| StoreError::Cancelled)?
}
