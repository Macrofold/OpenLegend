//! Stopped backup publication can import artwork only under quarantine. The
//! authenticated recovery tool owns the independently current permissions.

use super::*;

pub(crate) const ARTWORK_RESTORE: &str = "integration:rust-operational-artwork-restore";

pub(crate) struct ArtworkOperator {
    pub principal: String,
    pub installed: AssetRevision,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BackupArtwork {
    package_id: String,
    principal: String,
    release: AssetRevision,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Stage {
    status: Phase,
    world_id: String,
    generation: String,
    revision: u64,
    artwork: BackupArtwork,
}

#[derive(Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum Phase {
    Pending,
    Complete,
}

pub(super) fn assert_replay(
    staged: Option<&BackupArtwork>,
    incoming: Option<&ArtworkOperator>,
) -> StoreResult<()> {
    match (staged, incoming) {
        (None, None) => Ok(()),
        (Some(staged), Some(incoming))
            if staged.principal == incoming.principal && staged.release == incoming.installed =>
        {
            Ok(())
        }
        _ => Err(StoreError::StaleCut),
    }
}

/// Check the package's exact retained pins while its imported catalogue is
/// private to this transaction. Recovered grants never admit delivery here.
/// The final operator transaction rechecks current permission on the world.
pub(super) async fn quarantine(
    tx: &Transaction<'_>,
    head: &DurableHead,
    package_id: String,
    session: &NativeWorldSession,
    operator: Option<ArtworkOperator>,
    saves: &[(String, AssetRevision)],
) -> StoreResult<Option<BackupArtwork>> {
    let (release, revision) = session.saved_presentation_release();
    let Some(operator) = operator else {
        return if release.is_none() && saves.is_empty() {
            Ok(None)
        } else {
            Err(StoreError::InvalidRecord)
        };
    };
    let release = AssetRevision::from_current(release.ok_or(StoreError::InvalidRecord)?)?;
    if revision.is_none_or(|value| value == 0) || release != operator.installed {
        return Err(StoreError::InvalidRecord);
    }
    require_pins(tx, &head.world_id, "world", &head.world_id, &release).await?;
    for (save, selected) in saves {
        let owner = json_record(&[&head.world_id, save]).map_err(|_| StoreError::InvalidRecord)?;
        require_pins(tx, &head.world_id, "save", &owner, selected).await?;
    }
    if tx
        .execute(
            "UPDATE asset_authority SET complete=0 WHERE id='current' AND complete=1",
            &[],
        )
        .await?
        != 1
    {
        return Err(StoreError::InvalidRecord);
    }
    let artwork = BackupArtwork {
        package_id,
        principal: operator.principal,
        release,
    };
    let stage = json_record(&Stage {
        status: Phase::Pending,
        world_id: head.world_id.clone(),
        generation: head.generation.clone(),
        revision: head.revision,
        artwork: artwork.clone(),
    })
    .map_err(|_| StoreError::InvalidRecord)?;
    tx.execute(
        "INSERT INTO meta(key,value) VALUES($1,$2)",
        &[&ARTWORK_RESTORE, &stage],
    )
    .await?;
    Ok(Some(artwork))
}

pub(super) async fn require_pins(
    tx: &Transaction<'_>,
    world: &str,
    kind: &str,
    owner: &str,
    release: &AssetRevision,
) -> StoreResult<()> {
    let key = release.key();
    let encoded = serde_json::to_value(release).map_err(|_| StoreError::InvalidRecord)?;
    tx.query_opt(
        crate::store::assets::RETAINED_RELEASE,
        &[
            &key,
            &release.manifest_sha256,
            &world,
            &encoded,
            &kind,
            &owner,
        ],
    )
    .await?
    .ok_or(StoreError::InvalidRecord)?;
    Ok(())
}

pub(crate) async fn require_completed_artwork_restore(
    tx: &impl tokio_postgres::GenericClient,
) -> StoreResult<()> {
    let stage = tx
        .query_opt(
            "SELECT CASE WHEN octet_length(value)<=4096 THEN value END FROM meta WHERE key=$1",
            &[&ARTWORK_RESTORE],
        )
        .await?;
    if let Some(stage) = stage {
        let value: Option<&str> = stage.try_get(0)?;
        let stage: Stage = serde_json::from_str(value.ok_or(StoreError::InvalidRecord)?)
            .map_err(|_| StoreError::InvalidRecord)?;
        if stage.status == Phase::Pending {
            eprintln!(
                "Restored artwork awaits independently current authority. Resume the same backup with the asset recovery tool."
            );
            return Err(StoreError::StaleCut);
        }
    }
    Ok(())
}

impl Store {
    pub(crate) async fn require_completed_artwork_restore(&self) -> StoreResult<()> {
        self.read_operational(|tx| {
            Box::pin(async move { require_completed_artwork_restore(tx).await })
        })
        .await
    }
}
