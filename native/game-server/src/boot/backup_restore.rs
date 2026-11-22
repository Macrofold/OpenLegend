//! The stopped command validates the imported canonical records through the
//! same native opening and geometry owner as the normal listener.

use super::*;
use crate::store::checkpoint::RestoredBackup;

pub async fn restore_world(
    release: &Path,
    database: Config,
    data: &Path,
    source: &Path,
) -> Result<RestoredBackup, BootError> {
    let startup = Arc::new(StartupStorage::open(release, database, 1, true).await?);
    let validator = startup.clone();
    let release = release.to_owned();
    let result = startup
        .store
        .restore_operational_backup(source, data, move |opening| async move {
            let host = validator.host.clone();
            let validation = host
                .compute(move || -> Result<NativeWorldSession, BootError> {
                    let (session, _, _) = validator.install(&release, opening, true)?;
                    session.check_current_work()?;
                    if session.saved_presentation_release().0.is_some() {
                        return Err(StoreError::InvalidRecord.into());
                    }
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
        })
        .await;
    startup.host.clone().shutdown().await?;
    Ok(result?)
}
