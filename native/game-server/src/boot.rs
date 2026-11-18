//! Load trusted build artifacts, then let the direct repository select the
//! exact current world. No setup input can replace a failed durable open.

use crate::{
    language::LanguageProvider,
    spatial::SpatialProvider,
    store::{StorageSchema, Store},
    world::{HostedWorld, WorldHost},
};
use openlegend_simulation::encoding::sha256_hex;
use openlegend_simulation::runtime::{
    RuntimeActivation, RuntimeInstallDefinitions, RuntimeInstallSources,
};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::io::{Read, Take};
use std::path::Path;
use std::sync::Arc;
use tokio_postgres::Config;
use tokio_postgres_rustls::MakeRustlsConnect;

const TRANSIENT_BYTES: usize = 2 * 1024 * 1024 * 1024;
type BootError = Box<dyn Error + Send + Sync>;

/// Release filenames are fixed. Only the operator selects this release
/// directory. Verify artifact bytes before decoding current definitions.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReleaseManifest {
    storage_sha256: String,
    definitions_sha256: String,
}

fn read_bounded(path: &Path, maximum: usize) -> Result<Vec<u8>, BootError> {
    let file = std::fs::File::open(path)?;
    if file.metadata()?.len() > maximum as u64 {
        return Err("Game server release artifact exceeds its admitted size".into());
    }
    let mut reader: Take<_> = file.take(maximum as u64 + 1);
    let mut data = Vec::new();
    reader.read_to_end(&mut data)?;
    if data.len() > maximum {
        return Err("Game server release artifact exceeds its admitted size".into());
    }
    Ok(data)
}

fn artifact<T: serde::de::DeserializeOwned>(
    release_dir: &Path,
    file: &str,
    expected: &str,
    maximum: usize,
) -> Result<T, BootError> {
    let bytes = read_bounded(&release_dir.join(file), maximum)?;
    if sha256_hex(&bytes) != expected {
        return Err(format!("Game server release artifact {file} has changed").into());
    }
    Ok(serde_json::from_slice(&bytes)?)
}

pub struct CurrentServer {
    pub host: Arc<WorldHost>,
    pub store: Arc<Store>,
    pub world: Arc<HostedWorld>,
    pub spatial: Arc<SpatialProvider>,
    language: Option<Arc<LanguageProvider>>,
    pub verified: VerifiedOpening,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifiedOpening {
    world_id: String,
    generation: String,
    revision: u64,
    accepted_cut: u64,
    sim_time: f64,
    sequence: u64,
    paused: bool,
}

impl CurrentServer {
    pub fn language(&self) -> Option<&Arc<LanguageProvider>> {
        self.language.as_ref()
    }

    /// Prepare one cold installed writer from PostgreSQL. Normal game startup
    /// must then reconcile presence and hot evidence through the simulation's
    /// startup operation before exposing any player view.
    pub async fn open(release: &Path, database: Config, workers: usize) -> Result<Self, BootError> {
        Self::open_current(release, None, database, workers).await
    }

    /// A live listener must use the checked navigation release, including when
    /// no route was needed to cold-open the selected world.
    pub async fn open_game(
        release: &Path,
        navigation: &Path,
        database: Config,
        workers: usize,
    ) -> Result<Self, BootError> {
        Self::open_current(release, Some(navigation), database, workers).await
    }

    async fn open_current(
        release: &Path,
        navigation: Option<&Path>,
        database: Config,
        workers: usize,
    ) -> Result<Self, BootError> {
        let manifest: ReleaseManifest =
            serde_json::from_slice(&read_bounded(&release.join("manifest.json"), 4 * 1024)?)?;
        // Match the existing server's configured request envelope. The
        // world writer's wait queue does not introduce a smaller player cap.
        let players = match std::env::var("OPEN_LEGEND_PLAYER_CAPACITY") {
            Ok(value) => value.parse::<usize>().ok(),
            Err(std::env::VarError::NotPresent) => Some(100),
            Err(_) => None,
        };
        let players = players
            .filter(|players| (1..=10_000).contains(players))
            .ok_or("OPEN_LEGEND_PLAYER_CAPACITY must be between 1 and 10000")?;
        let host = WorldHost::new(workers, TRANSIENT_BYTES, players * 4)?;
        let budget = host.budget();
        // These are finite trusted build products. Retain their independent
        // construction charge across deserialization and cold adoption.
        let storage_manifest = budget.reserve(16 * 1024 * 1024)?;
        let schema: StorageSchema = artifact(
            release,
            "storage.json",
            &manifest.storage_sha256,
            2 * 1024 * 1024,
        )?;
        let storage_version = schema.version.clone();
        let definition_custody = budget.reserve(32 * 1024 * 1024)?;
        let definitions: RuntimeInstallDefinitions = artifact(
            release,
            "definitions.json",
            &manifest.definitions_sha256,
            4 * 1024 * 1024,
        )?;
        let _ = rustls::crypto::ring::default_provider().install_default();
        let (tls, _) = MakeRustlsConnect::with_native_certs()
            .map_err(|_| "No usable trust roots for PostgreSQL")?;
        let store = Arc::new(Store::open(database, tls, schema, false, budget.clone()).await?);
        drop(storage_manifest);
        let opening = store
            .current_opening()
            .await?
            .ok_or("No initialized current-format game world exists")?;
        let receipt = RuntimeActivation {
            world_id: opening.records.world_id.clone(),
            generation: opening.records.generation.clone(),
            revision: opening.records.durable_revision,
            accepted_cut: 0,
        };
        let revision = receipt.revision;
        let mut custody = opening.custody;
        custody.merge(definition_custody)?;
        let session = definitions.install_current(
            RuntimeInstallSources {
                records: opening.records,
                originals: opening.originals,
                cold_directories: None,
                working_set: None,
                accepted_cut: receipt.accepted_cut,
            },
            &storage_version,
            budget.clone(),
            custody,
        )?;
        let spatial = session.with_geometry(|map| -> Result<SpatialProvider, BootError> {
            match navigation {
                Some(directory) => Ok(SpatialProvider::from_release(map, directory, budget)?),
                None => Ok(SpatialProvider::new(map, budget)?),
            }
        })??;
        let language = navigation
            .map(|_| LanguageProvider::open(&release.join("language"), host.budget()).map(Arc::new))
            .transpose()?;
        let cut = session.accepted_progress()?;
        let verified = VerifiedOpening {
            world_id: cut.world_id.to_owned(),
            generation: cut.generation.to_owned(),
            revision,
            accepted_cut: cut.through_cut,
            sim_time: cut.at,
            sequence: cut.sequence,
            paused: cut.paused,
        };
        let world = host.adopt(session, receipt, Arc::clone(&store))?;
        Ok(Self {
            host,
            store,
            world,
            spatial: Arc::new(spatial),
            language,
            verified,
        })
    }

    /// Answer the operation's finite request using the current accepted cut.
    /// PostgreSQL waits keep their own inputs without occupying a worker.
    /// Physical providers use their typed requests without encoding them.
    pub async fn answer_operation(
        &self,
        question: openlegend_simulation::runtime::RuntimeProvider,
    ) -> Result<
        (
            openlegend_simulation::runtime::RuntimeProvider,
            openlegend_simulation::runtime::RuntimeProviderInput,
        ),
        crate::world::WorldError,
    > {
        use crate::world::WorldError;
        use openlegend_simulation::runtime::RuntimeProviderInput;
        if question.asks_known_places()? {
            let (question, prepared) = self.world.prepare_known_places(question).await?;
            let store = Arc::clone(&self.store);
            let answer = tokio::spawn(async move { store.read_known_places(prepared).await })
                .await
                .map_err(|_| openlegend_world_host::pool::HostError::WorkerFailed)??;
            return Ok((question, answer));
        }
        let spatial = Arc::clone(&self.spatial);
        let language = self.language.clone();
        let budget = self.host.budget().clone();
        self.host
            .compute(move || {
                let result = question.with_geometry(|queries| spatial.compute(queries, &budget))?;
                let answer = match result {
                    Some(result) => {
                        let (answer, custody) = result?.into_parts();
                        RuntimeProviderInput::geometry(answer, custody)?
                    }
                    None => {
                        crate::operation_format::answer(&question, &budget, language.as_deref())?
                            .ok_or(WorldError::ProviderKind)?
                    }
                };
                Ok((question, answer))
            })
            .await?
    }

    /// The caller first drains any accepted gameplay prefix. A confirmed
    /// cold validation opens no game input and has no prefix to drain.
    pub async fn close(self) -> Result<(), BootError> {
        self.world.stop().await?;
        self.host.shutdown().await?;
        Ok(())
    }
}
