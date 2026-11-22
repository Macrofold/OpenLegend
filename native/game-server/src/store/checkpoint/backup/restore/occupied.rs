//! Apply a validated backup to a damaged same-world target through the
//! existing checkpoint replacement. Its present operational owners survive.

use super::*;
use crate::language::LanguageProvider;
use crate::store::checkpoint::recover::ReplacementAuthority;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::runtime::RuntimeInstallDefinitions;

pub(crate) struct DamagedReplacement {
    pub operation: Uuid,
    pub floor: Option<Uuid>,
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
    pub(super) async fn replace_damaged_from_backup(
        self: &Arc<Self>,
        package: Package,
        existing: RestoreState,
        replacement: DamagedReplacement,
    ) -> Result<RestoredBackup, CommitError> {
        let expected = existing
            .head
            .filter(|head| head.world_id == package.manifest.world_id)
            .ok_or(CommitError::RolledBack(StoreError::StaleCut))?;
        self.require_completed_artwork_restore()
            .await
            .map_err(CommitError::RolledBack)?;
        let request_key = format!("integration:load-request:{}", replacement.operation);
        let requested = format!("backup:{}", package.id);
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

        match self.current_opening().await {
            Err(StoreError::InvalidRecord | StoreError::DamagedInstallation) => {}
            Err(error) => return Err(CommitError::RolledBack(error)),
            Ok(_) => {
                eprintln!(
                    "This recovery requires structural damage in the current target records."
                );
                return Err(CommitError::RolledBack(StoreError::StaleCut));
            }
        }
        let floor = if let Some(id) = replacement.floor {
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
            files::begin(&target, &manifest, owner, Some(revision))
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
        let result = match saved {
            Err(error) => Err(CommitError::RolledBack(error)),
            Ok(saves) => {
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
                                None,
                                ReplacementAuthority::DamagedBackup,
                            )
                            .await?;
                        let marker_key = format!("{ATTEMPT_PREFIX}{}", attempt.id);
                        let marker = json_record(&serde_json::json!({"worldId": world}))
                            .map_err(|_| StoreError::InvalidRecord)?;
                        tx.execute(
                            "INSERT INTO meta(key,value) VALUES($1,$2)",
                            &[&marker_key, &marker],
                        )
                        .await?;
                        Ok(adopted)
                    })
                })
                .await
                .and_then(|prepared| prepared.activate(&operation.to_string()))
                .map(|restored| report(restored.head, retained_count))
            }
        };
        self.finish_restore_files(&directory, owner, Some(expected), &result)
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
