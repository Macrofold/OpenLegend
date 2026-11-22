//! The stopped command validates the imported canonical records through the
//! same native opening and geometry owner as the normal listener.

use super::*;
use crate::store::checkpoint::{ArtworkOperator, BackupReplacement, RestoredBackup};

pub enum BackupRestoreMode {
    Empty,
    Artwork(String),
    Replace(uuid::Uuid, BackupPredecessor),
}

pub async fn restore_world(
    release: &Path,
    database: Config,
    data: &Path,
    source: &Path,
    mode: BackupRestoreMode,
) -> Result<RestoredBackup, BootError> {
    let initialize = !matches!(mode, BackupRestoreMode::Replace(..));
    let startup = Arc::new(StartupStorage::open(release, database, 1, initialize).await?);
    let installed = || {
        InstalledAssets::load(
            &release.join("assets.json"),
            &startup.manifest.assets_sha256,
            None,
            startup.manifest.asset_max_object_bytes,
            startup.host.budget(),
        )
    };
    let (artwork, replacement) = match mode {
        BackupRestoreMode::Empty => (None, None),
        BackupRestoreMode::Artwork(principal) => {
            if !openlegend_simulation::values::is_safe_record_id(&principal) {
                return Err(StoreError::InvalidRecord.into());
            }
            (
                Some(ArtworkOperator {
                    principal,
                    installed: installed()?.release().clone(),
                }),
                None,
            )
        }
        BackupRestoreMode::Replace(operation, predecessor) => {
            let budget = startup.host.budget();
            let (definitions, definition_custody) =
                read_definitions(release, &startup.manifest, budget)?;
            (
                None,
                Some(BackupReplacement {
                    operation,
                    predecessor,
                    definitions,
                    definition_custody,
                    language: Arc::new(LanguageProvider::open(&release.join("language"), budget)?),
                    installed_release: installed()?.release().clone(),
                }),
            )
        }
    };
    let validator = startup.clone();
    let release = release.to_owned();
    let result = startup
        .store
        .restore_operational_backup(
            source,
            data,
            artwork,
            replacement,
            move |opening| async move {
                let host = validator.host.clone();
                let validation = host
                    .compute(move || -> Result<NativeWorldSession, BootError> {
                        let (session, _, _) = validator.install(&release, opening, true)?;
                        session.check_current_work()?;
                        session.with_geometry(|map| {
                            SpatialProvider::from_release(
                                map,
                                &release.join("navigation"),
                                validator.host.budget(),
                            )
                        })??;
                        Ok(session)
                    })
                    .await
                    .map_err(|_| StoreError::WriterUnavailable)?;
                validation.map_err(|error| {
                    eprintln!("The recovered database is not a usable current opening: {error}");
                    StoreError::InvalidRecord
                })
            },
        )
        .await;
    startup.host.clone().shutdown().await?;
    Ok(result?)
}
