//! Apply a validated backup through the existing same-world checkpoint writer.
//! Its present operational owners survive.

use super::*;
use crate::language::LanguageProvider;
use crate::store::checkpoint::recover::ReplacementAuthority;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::runtime::RuntimeInstallDefinitions;

#[derive(Clone, Copy)]
pub enum BackupPredecessor {
    Readable,
    Damaged { floor: Option<Uuid> },
}

pub(crate) struct BackupReplacement {
    pub operation: Uuid,
    pub predecessor: BackupPredecessor,
    pub definitions: RuntimeInstallDefinitions,
    pub definition_custody: ByteReservation,
    pub language: Arc<LanguageProvider>,
    pub installed_release: AssetRevision,
}

pub(super) struct Package {
    pub source: PathBuf,
    pub manifest: Arc<Manifest>,
    pub retained: [u8; 32],
    pub directory: PathBuf,
    pub checkpoint: crate::store::checkpoint::AdministrativeCheckpoint,
    pub operations: operations::Operations,
    pub id: String,
}

impl Store {
    pub(super) async fn replace_from_backup<F>(
        self: &Arc<Self>,
        package: Package,
        existing: RestoreState,
        replacement: BackupReplacement,
        validate: impl FnOnce(CurrentOpening) -> F,
    ) -> Result<RestoredBackup, CommitError>
    where
        F: Future<Output = StoreResult<NativeWorldSession>>,
    {
        let expected = existing
            .head
            .filter(|head| head.world_id == package.manifest.world_id)
            .ok_or(CommitError::RolledBack(StoreError::StaleCut))?;
        self.require_completed_artwork_restore()
            .await
            .map_err(CommitError::RolledBack)?;
        let request_key = format!("integration:load-request:{}", replacement.operation);
        let source = match replacement.predecessor {
            BackupPredecessor::Readable => "readable-backup",
            BackupPredecessor::Damaged { .. } => "backup",
        };
        let requested = format!("{source}:{}", package.id);
        let (observed, prior) = self
            .read_recovery_witness(&request_key)
            .await
            .map_err(CommitError::RolledBack)?;
        if observed.as_ref() != Some(&expected) {
            return Err(CommitError::RolledBack(StoreError::StaleCut));
        }
        let retained_count = package.manifest.saves.len();
        if let Some(prior) = prior {
            prior
                .verify_stopped(&expected, &requested)
                .map_err(CommitError::RolledBack)?;
            let store = self.clone();
            return local(move || {
                let contract = &store.schema.checkpoint;
                package.operations.verify(contract)?;
                if files::retained_identity(
                    &package.source,
                    &package.manifest,
                    contract,
                    true,
                    true,
                )? != package.retained
                {
                    return Err(StoreError::InvalidRecord);
                }
                Ok(report(prior.head(), retained_count))
            })
            .await
            .map_err(CommitError::RolledBack);
        }

        let (floor_id, recovery) = match (replacement.predecessor, self.current_opening().await) {
            (BackupPredecessor::Readable, Ok(opening)) => {
                drop(validate(opening).await.map_err(CommitError::RolledBack)?);
                (None, Some(Uuid::new_v4().to_string()))
            }
            (
                BackupPredecessor::Damaged { floor },
                Err(StoreError::InvalidRecord | StoreError::DamagedInstallation),
            ) => (floor, None),
            (_, Err(error)) => return Err(CommitError::RolledBack(error)),
            (BackupPredecessor::Damaged { .. }, Ok(_)) => {
                eprintln!(
                    "This recovery requires structural damage in the current target records."
                );
                return Err(CommitError::RolledBack(StoreError::StaleCut));
            }
        };
        let floor = if let Some(id) = floor_id {
            // Read only an already retained target checkpoint. None of this
            // backup's files have been published to that directory yet.
            Some(
                self.retained_checkpoint(
                    package.directory.clone(),
                    id.to_string(),
                    expected.world_id.clone(),
                )
                .await
                .map_err(CommitError::RolledBack)?,
            )
        } else {
            None
        };
        let owner = self
            .bind_restore_directory(existing.owner, Some(expected.clone()))
            .await?;
        let directory = package.directory;
        let target = directory.clone();
        let manifest = package.manifest;
        let revision = expected.revision;
        let attempt = local(move || {
            files::write_owner(&target, owner)?;
            files::begin(
                &target,
                &manifest.world_id,
                &manifest.saves,
                owner,
                Some(revision),
                recovery,
            )
        })
        .await
        .map(Arc::new)
        .map_err(CommitError::RolledBack)?;
        let target = directory.clone();
        let pending = attempt.clone();
        let store = self.clone();
        let source = package.source;
        let identity = package.retained;
        let saved = local(move || {
            files::publish(
                &source,
                &target,
                &pending,
                identity,
                &store.schema.checkpoint,
                true,
                &store.budget,
            )
        })
        .await;
        let prepared = match saved {
            Ok(saves) => self
                .capture_stopped_predecessor(&directory, &expected, &attempt)
                .await
                .map(|point| (saves, point)),
            Err(error) => Err(error),
        };
        let result = match prepared {
            Err(error) => Err(CommitError::RolledBack(error)),
            Ok((saves, before_load)) => {
                let store = self.clone();
                let previous = expected.clone();
                let operation = replacement.operation;
                let checkpoint = package.checkpoint;
                let operations = package.operations;
                self.operational(move |tx| {
                    Box::pin(async move {
                        if super::owner(tx).await? != Some(owner)
                            || durable_head(tx).await?.as_ref() != Some(&previous)
                        {
                            return Err(StoreError::StaleCut);
                        }
                        let world = &previous.world_id;
                        // The backup can carry old art. The occupied target's
                        // catalogue and exact retained pins decide its use.
                        for (id, release) in &saves.values {
                            let slot_owner =
                                json_record(&[world, id]).map_err(|_| StoreError::InvalidRecord)?;
                            artwork::require_pins(tx, world, "save", &slot_owner, release).await?;
                        }
                        operations::stage(
                            &store,
                            tx,
                            operations,
                            operations::Import::Existing { world },
                        )
                        .await?;
                        let head = DurableHead {
                            world_id: world.clone(),
                            generation: Uuid::new_v4().to_string(),
                            revision: previous
                                .revision
                                .max(checkpoint.revision)
                                .checked_add(1)
                                .ok_or(StoreError::Capacity)?,
                        };
                        let timeline = Uuid::new_v4().to_string();
                        let adopted = store
                            .stage_recovery(
                                tx,
                                &previous,
                                head,
                                &timeline,
                                &request_key,
                                &requested,
                                checkpoint,
                                floor.as_ref(),
                                replacement.definitions,
                                replacement.definition_custody,
                                &replacement.language,
                                &replacement.installed_release,
                                None,
                                before_load.as_ref(),
                                if before_load.is_some() {
                                    ReplacementAuthority::ReadableBackup
                                } else {
                                    ReplacementAuthority::DamagedBackup
                                },
                                None,
                            )
                            .await?;
                        mark_restore_attempt(tx, &attempt).await?;
                        Ok(adopted)
                    })
                })
                .await
                .and_then(|prepared| prepared.activate(&operation.to_string()))
                .map(|restored| report(restored.head, retained_count))
            }
        };
        self.finish_restore_files(
            &directory,
            owner,
            Some(expected),
            result.as_ref().map(RestoredBackup::head),
        )
        .await;
        result
    }
}

fn report(head: DurableHead, retained_checkpoints: usize) -> RestoredBackup {
    RestoredBackup {
        world_id: head.world_id,
        generation: head.generation,
        revision: head.revision,
        retained_checkpoints,
        artwork: None,
    }
}
