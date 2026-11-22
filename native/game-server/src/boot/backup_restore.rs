//! The stopped command validates the imported canonical records through the
//! same native opening and geometry owner as the normal listener.

use super::*;
use crate::store::checkpoint::{ArtworkOperator, DamagedReplacement, RestoredBackup};

pub async fn restore_world(
    release: &Path,
    database: Config,
    data: &Path,
    source: &Path,
    artwork_principal: Option<String>,
    damaged: Option<(uuid::Uuid, Option<uuid::Uuid>)>,
) -> Result<RestoredBackup, BootError> {
    let startup = Arc::new(StartupStorage::open(release, database, 1, damaged.is_none()).await?);
    let installed = || {
        InstalledAssets::load(
            &release.join("assets.json"),
            &startup.manifest.assets_sha256,
            None,
            startup.manifest.asset_max_object_bytes,
            startup.host.budget(),
        )
    };
    let artwork = if let Some(principal) = artwork_principal {
        if !openlegend_simulation::values::is_safe_record_id(&principal) {
            return Err(StoreError::InvalidRecord.into());
        }
        let assets = installed()?;
        Some(ArtworkOperator {
            principal,
            installed: assets.release().clone(),
        })
    } else {
        None
    };
    let replacement = if let Some((operation, floor)) = damaged {
        let budget = startup.host.budget();
        let (definitions, definition_custody) =
            read_definitions(release, &startup.manifest, budget)?;
        Some(DamagedReplacement {
            operation,
            floor,
            definitions,
            definition_custody,
            language: Arc::new(LanguageProvider::open(&release.join("language"), budget)?),
            installed_release: installed()?.release().clone(),
        })
    } else {
        None
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
