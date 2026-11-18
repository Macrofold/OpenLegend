//! Read admission for the installed asset release. Publishing and grant changes
//! remain with the catalog owner. This reader returns a finite scalar witness.

use super::{CurrentOpening, Store, StoreError, StoreResult};
use serde::{Deserialize, Serialize};
use tokio_postgres::Transaction;

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AssetRevision {
    owner: AssetOwner,
    asset_id: String,
    revision_id: String,
    pub(crate) manifest_sha256: String,
}

#[derive(Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct AssetOwner {
    kind: String,
    id: String,
}

#[derive(Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Artifact {
    pub(crate) boundary: String,
    pub(crate) access_domain: String,
    pub(crate) sha256: String,
    pub(crate) bytes: u64,
    pub(crate) media_type: String,
}

impl AssetRevision {
    pub(crate) fn from_current(encoded: &serde_json::value::RawValue) -> StoreResult<Self> {
        let release: Self =
            serde_json::from_str(encoded.get()).map_err(|_| StoreError::InvalidRecord)?;
        if !release.valid() {
            return Err(StoreError::InvalidRecord);
        }
        Ok(release)
    }

    fn key(&self) -> String {
        serde_json::to_string(&[
            &self.owner.kind,
            &self.owner.id,
            &self.asset_id,
            &self.revision_id,
        ])
        .expect("asset keys consist of JSON strings")
    }

    pub(crate) fn valid(&self) -> bool {
        matches!(
            self.owner.kind.as_str(),
            "engine" | "world" | "collection" | "creator" | "instance"
        ) && valid_digest(&self.manifest_sha256)
            && [&self.owner.id, &self.asset_id, &self.revision_id]
                .into_iter()
                .all(|id| !id.is_empty() && !id.contains('\0'))
            && serde_json::to_string(&[self.key(), self.manifest_sha256.clone()])
                .is_ok_and(|key| key.len() <= 1000)
    }
}

impl Artifact {
    fn key(&self) -> String {
        serde_json::to_string(&[&self.boundary, &self.access_domain, &self.sha256])
            .expect("artifact keys consist of JSON strings")
    }

    pub(crate) fn valid(&self, max_bytes: u64) -> bool {
        matches!(
            self.boundary.as_str(),
            "runtime" | "art-studies" | "art-library" | "intake" | "asset-recovery"
        ) && self.access_domain.len() <= 128
            && self
                .access_domain
                .as_bytes()
                .first()
                .is_some_and(u8::is_ascii_alphanumeric)
            && self
                .access_domain
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b"._-".contains(&byte))
            && valid_digest(&self.sha256)
            && self.bytes <= max_bytes
            && valid_media_type(&self.media_type)
    }
}

fn valid_media_type(value: &str) -> bool {
    let tokens = |part: &str| {
        !part.is_empty()
            && part
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b"!#$&^_.+-".contains(&byte))
    };
    let (kind, parameters) = value.split_once(';').unwrap_or((value, ""));
    value.len() <= 160
        && (!value.contains(';')
            || !parameters.is_empty() && parameters.bytes().all(|byte| (32..=126).contains(&byte)))
        && kind
            .split_once('/')
            .is_some_and(|(group, name)| tokens(group) && tokens(name))
}

pub(crate) fn valid_digest(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

impl Store {
    /// Check the canonical saved world's matching catalog binding and its
    /// current retained file/revision pins before admitting a game writer.
    /// A known, retained release may still be withheld from a particular
    /// account, or rendered natively when the installed browser pin differs.
    pub(crate) async fn require_retained_asset_release(
        &self,
        world_id: &str,
        release: &AssetRevision,
    ) -> StoreResult<()> {
        let key = release.key();
        let reference = serde_json::to_value(release).map_err(|_| StoreError::InvalidRecord)?;
        let reader = self.reader.lock().await;
        reader
            .client
            .query_opt(
                concat!(
                    include_str!("assets-closure.sql"),
                    include_str!("assets-retained.sql")
                ),
                &[
                    &key,
                    &release.manifest_sha256,
                    &world_id,
                    &reference,
                    &"world",
                    &world_id,
                ],
            )
            .await?
            .ok_or(StoreError::InvalidRecord)?;
        Ok(())
    }

    /// Restore only the currently bound release, using the chosen slot's
    /// independently retained files if its world hold needs reconstruction.
    /// The stopped operator supplies no new principal or asset permission.
    pub(super) async fn recovery_asset_binding(
        &self,
        tx: &Transaction<'_>,
        world: &str,
        slot: &str,
        opening: &CurrentOpening,
    ) -> StoreResult<()> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Host<'a> {
            #[serde(borrow)]
            presentation_release: Option<&'a serde_json::value::RawValue>,
        }
        let row = opening
            .records
            .tables
            .get("data_world")
            .and_then(|rows| rows.iter().find(|row| row.id == "[]"))
            .ok_or(StoreError::InvalidRecord)?;
        let state: Host<'_> =
            serde_json::from_str(&row.payload).map_err(|_| StoreError::InvalidRecord)?;
        let Some(reference) = state.presentation_release else {
            for table in ["asset_pins", "asset_pin_files"] {
                tx.execute(
                    &format!("DELETE FROM {table} WHERE owner_kind='world' AND owner_id=$1"),
                    &[&world],
                )
                .await?;
            }
            tx.execute(
                "DELETE FROM asset_world_bindings WHERE world_id=$1",
                &[&world],
            )
            .await?;
            return Ok(());
        };
        let release = AssetRevision::from_current(reference)?;
        let key = release.key();
        let reference = serde_json::to_value(&release).map_err(|_| StoreError::InvalidRecord)?;
        let saved = openlegend_simulation::encoding::json_record(&[world, slot])
            .map_err(|_| StoreError::InvalidRecord)?;
        let retained = concat!(
            include_str!("assets-closure.sql"),
            include_str!("assets-retained.sql")
        );
        let current = tx
            .query_opt(
                retained,
                &[
                    &key,
                    &release.manifest_sha256,
                    &world,
                    &reference,
                    &"world",
                    &world,
                ],
            )
            .await?;
        if current.is_some() {
            return Ok(());
        }
        tx.query_opt(
            retained,
            &[
                &key,
                &release.manifest_sha256,
                &world,
                &reference,
                &"save",
                &saved,
            ],
        )
        .await?
        .ok_or(StoreError::StaleCut)?;
        for table in ["asset_pins", "asset_pin_files"] {
            tx.execute(
                &format!("DELETE FROM {table} WHERE owner_kind='world' AND owner_id=$1"),
                &[&world],
            )
            .await?;
        }
        tx.execute("INSERT INTO asset_pins SELECT 'world',$1,revision_key,manifest_sha256 FROM asset_pins WHERE owner_kind='save' AND owner_id=$2", &[&world,&saved]).await?;
        tx.execute("INSERT INTO asset_pin_files SELECT 'world',$1,artifact_key,payload FROM asset_pin_files WHERE owner_kind='save' AND owner_id=$2", &[&world,&saved]).await?;
        Ok(())
    }

    /// Select one current release permission witness in a fixed PostgreSQL
    /// statement. An exact file must belong to the approved root/dependency
    /// closure. No catalog payload is transferred to the request.
    pub(crate) async fn permit_installed_asset(
        &self,
        account: &str,
        release: &AssetRevision,
        file: Option<&Artifact>,
    ) -> StoreResult<Option<i64>> {
        let key = release.key();
        let file_key = file.map(Artifact::key);
        let file = file
            .map(serde_json::to_value)
            .transpose()
            .map_err(|_| StoreError::InvalidRecord)?;
        let reader = self.reader.lock().await;
        Ok(reader
            .client
            .query_opt(
                concat!(
                    include_str!("assets-closure.sql"),
                    include_str!("assets-permission.sql")
                ),
                &[&key, &release.manifest_sha256, &account, &file_key, &file],
            )
            .await?
            .map(|row| row.try_get(0))
            .transpose()?)
    }
}
