//! Load trusted build artifacts, then let the direct repository select the
//! exact current world. No setup input can replace a failed durable open.

use crate::{
    decision_render::DecisionPolicy,
    language::LanguageProvider,
    player_http::assets::InstalledAssets,
    player_view::PlayerViewPolicy,
    spatial::SpatialProvider,
    store::{CurrentOpening, StorageSchema, Store, StoreError, StoreResult},
    world::{HostedWorld, WorldHost},
};
use openlegend_simulation::runtime::{
    NativeWorldSession, RuntimeActivation, RuntimeError, RuntimeInstallDefinitions,
    RuntimeInstallSources,
};
use openlegend_simulation::{
    encoding::sha256_hex,
    host::{ByteBudget, ByteReservation},
};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::future::Future;
use std::io::{Read, Take};
use std::path::Path;
use std::sync::Arc;
use tokio_postgres::Config;
use tokio_postgres_rustls::MakeRustlsConnect;
use tokio_util::task::AbortOnDropHandle;
mod backup_restore;
pub use backup_restore::restore_world;

const TRANSIENT_BYTES: usize = 2 * 1024 * 1024 * 1024;
type BootError = Box<dyn Error + Send + Sync>;

/// Release filenames are fixed. Only the operator selects this release
/// directory. Verify artifact bytes before decoding current definitions.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReleaseManifest {
    storage_sha256: String,
    definitions_sha256: String,
    view_sha256: String,
    cognition_sha256: String,
    assets_sha256: String,
    asset_max_object_bytes: u64,
}

fn read_manifest(release: &Path) -> Result<ReleaseManifest, BootError> {
    Ok(serde_json::from_slice(&read_bounded(
        &release.join("manifest.json"),
        4 * 1024,
    )?)?)
}

pub(crate) fn release_digest(release: &Path) -> Result<String, BootError> {
    Ok(sha256_hex(&read_bounded(
        &release.join("manifest.json"),
        4 * 1024,
    )?))
}

async fn open_store(
    release: &Path,
    manifest: &ReleaseManifest,
    database: Config,
    budget: &ByteBudget,
    initialize: bool,
) -> Result<Arc<Store>, BootError> {
    let _workspace = budget.reserve(16 * 1024 * 1024)?;
    let (schema, tls) = storage_configuration(release, manifest)?;
    Ok(Arc::new(
        Store::open(database, tls, schema, initialize, budget.clone()).await?,
    ))
}

fn storage_configuration(
    release: &Path,
    manifest: &ReleaseManifest,
) -> Result<(StorageSchema, MakeRustlsConnect), BootError> {
    let schema = artifact(
        release,
        "storage.json",
        &manifest.storage_sha256,
        2 * 1024 * 1024,
    )?;
    let _ = rustls::crypto::ring::default_provider().install_default();
    let (tls, _) = MakeRustlsConnect::with_native_certs()
        .map_err(|_| "No usable trust roots for PostgreSQL")?;
    Ok((schema, tls))
}

/// Explicitly prepare only the current PostgreSQL layout. Gameplay and
/// authority still require the separate exact starting-world activation.
pub async fn initialize_storage(
    release: &Path,
    database: Config,
) -> Result<&'static str, BootError> {
    let manifest = read_manifest(release)?;
    let budget = ByteBudget::new(TRANSIENT_BYTES);
    let store = open_store(release, &manifest, database, &budget, true).await?;
    Ok(store.initialized_storage().await?)
}

/// Export an existing stopped database and its retained current-format slots.
pub async fn backup_world(
    release: &Path,
    database: Config,
    data: &Path,
    destination: &Path,
) -> Result<usize, BootError> {
    let manifest = read_manifest(release)?;
    let budget = ByteBudget::new(TRANSIENT_BYTES);
    let _workspace = budget.reserve(16 * 1024 * 1024)?;
    let (schema, tls) = storage_configuration(release, &manifest)?;
    Ok(Store::backup_world(database, tls, &schema, &budget, data, destination).await?)
}

fn read_definitions(
    release: &Path,
    manifest: &ReleaseManifest,
    budget: &ByteBudget,
) -> Result<(RuntimeInstallDefinitions, ByteReservation), BootError> {
    let custody = budget.reserve(32 * 1024 * 1024)?;
    let definitions = artifact(
        release,
        "definitions.json",
        &manifest.definitions_sha256,
        4 * 1024 * 1024,
    )?;
    Ok((definitions, custody))
}

/// Recover a stopped database with the same validated installed definitions
/// and language data as the normal listener. Opening the store owns the
/// exclusive writer lock without installing the damaged live gameplay rows.
pub async fn recover_checkpoint(
    release: &Path,
    database: Config,
    directory: &Path,
    slot: &str,
    operation: &str,
    floor: Option<&str>,
) -> Result<serde_json::Value, BootError> {
    let manifest = read_manifest(release)?;
    let budget = ByteBudget::new(TRANSIENT_BYTES);
    let (definitions, custody) = read_definitions(release, &manifest, &budget)?;
    let language = Arc::new(LanguageProvider::open(&release.join("language"), &budget)?);
    let installed = InstalledAssets::load(
        &release.join("assets.json"),
        &manifest.assets_sha256,
        None,
        manifest.asset_max_object_bytes,
        &budget,
    )?;
    let store = open_store(release, &manifest, database, &budget, false).await?;
    let recovered = store
        .recover_checkpoint(
            directory,
            slot,
            floor,
            operation,
            definitions,
            custody,
            language,
            installed.release(),
            None,
        )
        .await?;
    drop(store);
    Ok(serde_json::json!({
        "worldId": recovered.head.world_id,
        "generation": recovered.head.generation,
        "revision": recovered.head.revision,
        "slotId": recovered.slot_id,
        "operationId": recovered.operation_id,
        "timeline": recovered.timeline,
        "acceptedCut": recovered.accepted_cut,
    }))
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
    view: Arc<PlayerViewPolicy>,
    pub(crate) cognition: Arc<DecisionPolicy>,
    assets: Option<Arc<InstalledAssets>>,
    _cognition_custody: openlegend_simulation::host::ByteReservation,
    pub verified: VerifiedOpening,
}

pub(crate) struct StartupStorage {
    manifest: ReleaseManifest,
    host: Arc<WorldHost>,
    pub(crate) store: Arc<Store>,
}

impl StartupStorage {
    /// A drained listener retains the same Store writer and content release
    /// while installing a current, operator-authorized replacement cut.
    pub(crate) async fn recover_live_checkpoint(
        &self,
        release: &Path,
        directory: &Path,
        slot: &str,
        operation: uuid::Uuid,
        scope: &crate::authority::RequestScope,
        installed_release: &crate::store::assets::AssetRevision,
    ) -> Result<(), crate::store::CommitError> {
        let (definitions, custody, language) = (|| -> Result<_, BootError> {
            let budget = self.host.budget();
            let (definitions, custody) = read_definitions(release, &self.manifest, budget)?;
            let language = Arc::new(LanguageProvider::open(&release.join("language"), budget)?);
            Ok((definitions, custody, language))
        })()
        .map_err(|error| {
            eprintln!("Cannot read installed definitions for checkpoint load: {error}");
            crate::store::CommitError::RolledBack(StoreError::InvalidRecord)
        })?;
        self.store
            .recover_checkpoint(
                directory,
                slot,
                None,
                &operation.to_string(),
                definitions,
                custody,
                language,
                installed_release,
                Some(scope),
            )
            .await?;
        Ok(())
    }

    /// Keep this Store and its exclusive database writer when entry becomes
    /// available. The empty target carries no live world or scheduled gameplay.
    pub(crate) async fn open(
        release: &Path,
        database: Config,
        workers: usize,
        initialize: bool,
    ) -> Result<Self, BootError> {
        let manifest = read_manifest(release)?;
        let players = match std::env::var("OPEN_LEGEND_PLAYER_CAPACITY") {
            Ok(value) => value.parse::<usize>().ok(),
            Err(std::env::VarError::NotPresent) => Some(100),
            Err(_) => None,
        };
        let players = players
            .filter(|players| (1..=10_000).contains(players))
            .ok_or("OPEN_LEGEND_PLAYER_CAPACITY must be between 1 and 10000")?;
        let host = WorldHost::new(workers, TRANSIENT_BYTES, players * 4)?;
        let store = open_store(release, &manifest, database, host.budget(), initialize).await?;
        Ok(Self {
            manifest,
            host,
            store,
        })
    }

    /// Use the same bounded worker as ordinary cold installation. Native
    /// action and entity decoding need the host's compute stack in debug.
    pub(crate) async fn validate_creation_opening(
        self: &Arc<Self>,
        release: &Path,
        opening: CurrentOpening,
        account: String,
        actor: String,
        construction_grants: Arc<[openlegend_simulation::InitialConstructionGrant]>,
    ) -> StoreResult<crate::creation::ValidatedOpening> {
        use crate::world::WorldError;
        use openlegend_world_host::pool::HostError;
        let startup = self.clone();
        let release = release.to_owned();
        let validation = self
            .host
            .compute(move || -> Result<crate::creation::ValidatedOpening, BootError> {
                let (session, _, _) = startup.install(&release, opening, true)?;
                session.check_initial_player(&account, &actor)?;
                session.check_initial_construction_grants(&actor, &construction_grants)?;
                session.check_current_work()?;
                let (selected, revision) = session.saved_presentation_release();
                let artwork = if let Some(selected) = selected {
                    let assets = InstalledAssets::load(
                        &release.join("assets.json"),
                        &startup.manifest.assets_sha256,
                        None,
                        startup.manifest.asset_max_object_bytes,
                        startup.host.budget(),
                    )?;
                    let selected = crate::store::assets::AssetRevision::from_current(selected)?;
                    if revision != Some(1) || assets.release() != &selected {
                        return Err(StoreError::InvalidRecord.into());
                    }
                    Some(selected)
                } else {
                    None
                };
                session.with_geometry(|map| {
                    SpatialProvider::from_release(
                        map,
                        &release.join("navigation"),
                        startup.host.budget(),
                    )
                })??;
                Ok(crate::creation::ValidatedOpening { session, artwork })
            })
            .await
            .map_err(|error| match error {
                WorldError::Host(HostError::Capacity | HostError::Busy) => StoreError::Capacity,
                WorldError::Host(HostError::Cancelled) => StoreError::Cancelled,
                _ => StoreError::WriterUnavailable,
            })?;
        validation.map_err(|error| match error.downcast_ref::<openlegend_simulation::host::CapacityError>() {
            Some(_) => StoreError::Capacity,
            None if matches!(error.downcast_ref::<RuntimeError>(), Some(error) if error.is_capacity()) => StoreError::Capacity,
            None => {
                eprintln!("OpenLegend rejected the configured opening: {error}");
                StoreError::InvalidRecord
            }
        })
    }

    /// Consume the exact current rows. Startup and pending activation use the
    /// same native validator, with no fallback opening or constructed overlay.
    fn install(
        &self,
        release: &Path,
        mut opening: CurrentOpening,
        require_language: bool,
    ) -> Result<
        (
            NativeWorldSession,
            RuntimeActivation,
            Option<Arc<LanguageProvider>>,
        ),
        BootError,
    > {
        let budget = self.host.budget();
        let (definitions, definition_custody) = read_definitions(release, &self.manifest, budget)?;
        let language = (require_language || opening.needs_language())
            .then(|| LanguageProvider::open(&release.join("language"), budget).map(Arc::new))
            .transpose()?;
        if let Some(language) = &language {
            opening.prepare_language(language, budget)?;
        }
        let receipt = RuntimeActivation {
            world_id: opening.records.world_id.clone(),
            generation: opening.records.generation.clone(),
            revision: opening.records.durable_revision,
            accepted_cut: 0,
        };
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
            &self.store.schema.version,
            budget.clone(),
            custody,
        )?;
        Ok((session, receipt, language))
    }

    pub(crate) fn base_clock_rate(&self, release: &Path) -> Result<f64, BootError> {
        Ok(admitted_view(release, &self.manifest.view_sha256, self.host.budget())?.base_ratio())
    }
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
    pub(crate) fn world_id(&self) -> &str {
        &self.verified.world_id
    }

    pub fn language(&self) -> Option<&Arc<LanguageProvider>> {
        self.language.as_ref()
    }

    pub(crate) fn view_policy(&self) -> &Arc<PlayerViewPolicy> {
        &self.view
    }

    pub(crate) fn installed_assets(&self) -> Option<&Arc<InstalledAssets>> {
        self.assets.as_ref()
    }

    /// Prepare one cold installed writer from PostgreSQL. Normal game startup
    /// must then reconcile presence and hot evidence through the simulation's
    /// startup operation before exposing any player view.
    pub async fn open(release: &Path, database: Config, workers: usize) -> Result<Self, BootError> {
        Self::open_current(release, None, database, workers).await
    }

    async fn open_current(
        release: &Path,
        navigation: Option<&Path>,
        database: Config,
        workers: usize,
    ) -> Result<Self, BootError> {
        let storage = Arc::new(StartupStorage::open(release, database, workers, false).await?);
        Self::from_storage(release, navigation, &storage).await
    }

    pub(crate) async fn from_storage(
        release: &Path,
        navigation: Option<&Path>,
        startup: &Arc<StartupStorage>,
    ) -> Result<Self, BootError> {
        let StartupStorage {
            manifest,
            host,
            store,
        } = startup.as_ref();
        let budget = host.budget();
        // These are finite trusted build products. Retain their independent
        // construction charge across deserialization and cold adoption.
        let view = admitted_view(release, &manifest.view_sha256, budget)?;
        let cognition_custody = budget.reserve(4 * 1024 * 1024)?;
        let cognition = Arc::new(artifact(
            release,
            "cognition.json",
            &manifest.cognition_sha256,
            512 * 1024,
        )?);
        let assets = navigation
            .map(|_| {
                InstalledAssets::load(
                    &release.join("assets.json"),
                    &manifest.assets_sha256,
                    std::env::var_os("OPEN_LEGEND_RUNTIME_ASSET_ROOT").map(Into::into),
                    manifest.asset_max_object_bytes,
                    budget,
                )
            })
            .transpose()?;
        let opening = store.current_opening().await?;
        let install = startup.clone();
        let release_dir = release.to_owned();
        let require_language = navigation.is_some();
        let (session, receipt, language) = host
            .compute(move || install.install(&release_dir, opening, require_language))
            .await??;
        let revision = receipt.revision;
        let (retained_release, asset_revision) = session.saved_presentation_release();
        if let Some(retained_release) = retained_release {
            if asset_revision.is_none_or(|revision| revision == 0) {
                return Err(
                    "The saved presentation release has no current binding revision".into(),
                );
            }
            let release = crate::store::assets::AssetRevision::from_current(retained_release)?;
            store
                .require_retained_asset_release(&receipt.world_id, &release)
                .await?;
        }
        let spatial = session.with_geometry(|map| -> Result<SpatialProvider, BootError> {
            match navigation {
                Some(directory) => Ok(SpatialProvider::from_release(map, directory, budget)?),
                None => Ok(SpatialProvider::new(map, budget)?),
            }
        })??;
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
        let world = host.adopt(session, receipt, Arc::clone(store))?;
        Ok(Self {
            host: Arc::clone(host),
            store: Arc::clone(store),
            world,
            spatial: Arc::new(spatial),
            language,
            view,
            cognition,
            assets,
            _cognition_custody: cognition_custody,
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
            let answer = self
                .read_for_operation(async move { store.read_known_places(prepared).await })
                .await?;
            return Ok((question, answer));
        }
        if question.asks_source_versions()? {
            let (question, prepared) = self.world.prepare_source_versions(question).await?;
            let store = Arc::clone(&self.store);
            let answer = self
                .read_for_operation(async move { store.read_source_versions(prepared).await })
                .await?;
            return Ok((question, answer));
        }
        if question.asks_npc_sources()? {
            let (question, prepared) = self.world.prepare_npc_sources(question).await?;
            let store = Arc::clone(&self.store);
            let answer = self
                .read_for_operation(async move { store.read_npc_sources(prepared).await })
                .await?;
            return Ok((question, answer));
        }
        if question.asks_activity_history()? {
            let (question, prepared) = self.world.prepare_activity_history(question).await?;
            let store = self.store.clone();
            let answer = self
                .read_for_operation(async move { store.read_activity_history(prepared).await })
                .await?;
            return Ok((question, answer));
        }
        let spatial = Arc::clone(&self.spatial);
        let language = self.language.clone();
        let cognition = self.cognition.clone();
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
                        match crate::operation_format::answer(&question, &budget, language.as_deref())? {
                            Some(answer) => answer,
                            None => cognition.answer_choices(&question, &budget)
                                .map_err(openlegend_simulation::runtime::RuntimeError::application_refused)?
                                .ok_or(WorldError::ProviderKind)?,
                        }
                    }
                };
                Ok((question, answer))
            })
            .await?
    }

    /// Keep the read input owned until the operation finishes or cancels.
    /// Dropping the caller aborts the read. The tracker still joins its
    /// cleanup on shutdown and maps a failed task to the existing refusal.
    async fn read_for_operation<T: Send + 'static>(
        &self,
        read: impl Future<Output = StoreResult<T>> + Send + 'static,
    ) -> Result<T, crate::world::WorldError> {
        Ok(AbortOnDropHandle::new(self.world.operations.spawn(read))
            .await
            .map_err(|_| openlegend_world_host::pool::HostError::WorkerFailed)??)
    }

    /// Drive one independently captured physical route at a time through
    /// the shared compute pool. No route wait holds the world mutation turn.
    pub(crate) async fn complete_route(
        &self,
        include_world: bool,
    ) -> Result<(), crate::world::WorldError> {
        let mut read = self.world.navigation(include_world).await?;
        while let Some(ticket) = read {
            let spatial = self.spatial.clone();
            let budget = self.host.budget().clone();
            let (ticket, answer, funding) = self
                .host
                .compute(move || {
                    let (answer, funding) =
                        spatial.compute(ticket.queries()?, &budget)?.into_parts();
                    Ok::<_, crate::world::WorldError>((ticket, answer, funding))
                })
                .await??;
            read = self
                .world
                .resolve_navigation(ticket, answer, funding)
                .await?;
        }
        Ok(())
    }

    /// The caller first drains any accepted gameplay prefix. A confirmed
    /// cold validation opens no game input and has no prefix to drain.
    pub async fn close(self) -> Result<(), BootError> {
        self.world.stop().await?;
        self.host.shutdown().await?;
        Ok(())
    }
}

fn admitted_view(
    release: &Path,
    expected: &str,
    budget: &openlegend_simulation::host::ByteBudget,
) -> Result<Arc<PlayerViewPolicy>, BootError> {
    const MAX_VIEW_BYTES: usize = 4 * 1024 * 1024;
    let workspace = budget.reserve(MAX_VIEW_BYTES)?;
    let contents = read_bounded(&release.join("view.json"), MAX_VIEW_BYTES)?;
    if sha256_hex(&contents) != expected {
        return Err("The installed public view artifact has changed".into());
    }
    // Public compiled static artifacts keep their custody with each retained
    // installation. JSON strings, carriers and raw map fields have bounded
    // scope here and decoded players never make another copy of the map.
    let backing = contents
        .len()
        .checked_mul(12)
        .and_then(|bytes| bytes.checked_add(8192))
        .ok_or("The installed public view exceeds its allowance")?;
    let resident = budget.resident().reserve(backing)?;
    let view: PlayerViewPolicy = serde_json::from_slice(&contents)?;
    drop(workspace);
    Ok(Arc::new(view.with_storage(resident)))
}
