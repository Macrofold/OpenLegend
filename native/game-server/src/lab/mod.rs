//! Own an isolated, lazily opened native world and drain its work on reload
//! or shutdown. The ordinary game listener remains the only public socket.
use crate::{
    authority::{AccessError, Authority, AuthorizedScope, Capability},
    boot::{CurrentServer, StartupStorage},
    launch::{Ingress, ListenerSettings, PreparedGame, checkpoint_load::LoadInbox},
    npc::Director,
};
use axum::Router;
use std::{
    error::Error,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tokio::sync::watch;
mod http;
mod holds;
pub(crate) use http::make_routes;
pub(crate) mod decisions;
pub(crate) mod fields;
pub(crate) mod library;
mod scene;
mod prepare;
pub(crate) mod scenario;
mod exchange;
mod start;
pub(crate) use prepare::{Proof, SourceWithdrawal};
type LabError = Box<dyn Error + Send + Sync>;

#[derive(Clone)]
pub(crate) struct HostPermit {
    host: Arc<Authority>,
    scope: Arc<AuthorizedScope>,
    imported: Option<(u64, u64)>,
    source_store: Arc<crate::store::Store>,
    origin: Option<Arc<str>>,
}
impl HostPermit {
    pub(crate) fn scope(&self) -> &crate::authority::RequestScope {
        &self.scope.scope
    }
    pub(crate) fn origin(&self) -> Option<&str> { self.origin.as_deref() }
    pub(crate) async fn for_source(&self, proof: Option<&Proof>) -> Result<Self,AccessError>{
        let mut checked=self.clone();
        checked.origin=None;
        if let Some(proof)=proof{
            let guard=prepare::SourceGuard::new(proof.clone(),self.source_store.clone());
            checked.imported=Some(guard.admit(self).await?);
            checked.origin=Some(guard.identity);
        }
        Ok(checked)
    }
    pub(crate) fn check(&self) -> Result<(), AccessError> {
        self.publish(|| ())
    }
    pub(crate) fn publish<T>(&self, action: impl FnOnce() -> T) -> Result<T, AccessError> {
        self.host
            .publish_for_lab(&self.scope, self.imported, action)
    }
}
tokio::task_local! { static HOST: HostPermit; }
pub(crate) fn host_permit() -> Result<HostPermit, AccessError> {
    HOST.try_with(Clone::clone)
        .map_err(|_| AccessError::Forbidden)
}

#[derive(Clone)]
pub(super) struct LabOperator {
    presence: Arc<crate::presence::Presence>,
    pub(super) scope: Arc<AuthorizedScope>,
    authority: Arc<Authority>,
    host: HostPermit,
}
impl LabOperator {
    pub(super) fn present(&self) -> Result<bool, AccessError> {
        self.presence.connected(&self.scope)
    }
    pub(super) fn host_scope(&self) -> &crate::authority::RequestScope {
        &self.host.scope.scope
    }
    pub(super) fn current<T>(
        &self,
        capability: Capability,
        publish: impl FnOnce() -> T,
    ) -> Result<T, AccessError> {
        self.authority
            .current(&self.scope, capability, false, |_, _| publish())
    }
}

pub(crate) struct LabRuntime {
    pub(crate) setup: (std::sync::Weak<StateInner>, Arc<StartupStorage>),
    pub(crate) checkpoints: Arc<crate::store::checkpoint::CheckpointSchedule>,
    pub(crate) saves: Arc<crate::live_save::LiveSaves>,
    pub(crate) clock: Arc<crate::game_clock::GameClock>,
    pub(crate) grace: std::time::Duration,
    pub(super) imported: Option<Arc<prepare::SourceGuard>>,
    pub(crate) presence: Arc<crate::presence::Presence>,
    pub(crate) game: Arc<CurrentServer>,
    pub(crate) decisions: Arc<Director>,
    pub(crate) references: Arc<crate::player_references::ReferenceIssuer>,
    pub(crate) authority: Arc<Authority>,
    pub(crate) ordinary: Router,
}

pub(crate) struct Parent {
    pub(super) imported: Option<Arc<prepare::SourceGuard>>,
    pub(crate) director: Arc<Director>,
    pub(crate) host: std::sync::Weak<StateInner>,
    pub(crate) startup: Arc<StartupStorage>,
    pub(crate) data: PathBuf,
    pub(crate) namespace: String,
}

pub(crate) struct StateInner {
    game: Arc<CurrentServer>,
    saves: Arc<crate::live_save::LiveSaves>,
    release: PathBuf,
    game_data: PathBuf,
    settings: ListenerSettings,
    port: u16,
    host: Arc<Authority>,
    director: Arc<Director>,
    stop: watch::Receiver<bool>,
    started: Mutex<Option<tokio::task::JoinHandle<()>>>,
    routes: watch::Sender<Availability>,
}
#[derive(Clone)]
pub(crate) enum Availability {
    Idle,
    Opening,
    Ready(Router),
    Failed(Option<&'static str>),
}
#[derive(Clone)]
pub(crate) struct Supervisor(Arc<StateInner>);
impl Supervisor {
    pub(crate) fn new(
        release: PathBuf,
        game_data: PathBuf,
        settings: ListenerSettings,
        port: u16,
        host: Arc<Authority>,
        game: Arc<CurrentServer>,
        saves: Arc<crate::live_save::LiveSaves>,
        director: Arc<Director>,
        stop: watch::Receiver<bool>,
    ) -> Self {
        Self(Arc::new(StateInner {
            release,
            game_data,
            game,
            saves,
            settings,
            port,
            host,
            director,
            stop,
            started: Mutex::default(),
            routes: watch::channel(Availability::Idle).0,
        }))
    }
    pub(crate) fn router(&self) -> Router {
        Router::new()
            .fallback(http::dispatch)
            .with_state(self.clone())
    }
    fn start(&self, preparation: Option<(prepare::Source, HostPermit)>) -> Result<bool, LabError> {
        if *self.0.stop.borrow() {
            return Err("The game listener is stopping".into());
        }
        let mut task = self
            .0
            .started
            .lock()
            .map_err(|_| "Lab startup is unavailable")?;
        if task.is_none() || task.as_ref().is_some_and(|task| task.is_finished()) {
            self.0.routes.send_replace(Availability::Opening);
            let host = self.clone();
            *task = Some(tokio::spawn(async move {
                let preparing = preparation.is_some();
                let reason = match Box::pin(host.run(preparation)).await {
                    Ok(()) => None,
                    Err(error) => {
                        eprintln!("Cognition Lab unavailable: {error}");
                        if error
                            .downcast_ref::<crate::store::StoreError>()
                            .is_some_and(|e| matches!(e, crate::store::StoreError::WriterOwned))
                        {
                            Some(
                                "The selected Lab database already has a running writer. Choose a separate Lab database.",
                            )
                        } else if preparing {
                            Some(
                                "Check the Lab directory, empty database, permissions and matching release. A game copy also requires the paused game and access to every participating player.",
                            )
                        } else {
                            None
                        }
                    }
                };
                host.0.routes.send_replace(Availability::Failed(reason));
            }));
            return Ok(true);
        }
        Ok(false)
    }
    pub(crate) async fn drain(self) -> Result<(), LabError> {
        let task = self
            .0
            .started
            .lock()
            .map_err(|_| "Lab shutdown unavailable")?
            .take();
        if let Some(task) = task {
            task.await?;
        }
        Ok(())
    }
    async fn run(
        &self,
        preparation: Option<(prepare::Source, HostPermit)>,
    ) -> Result<(), LabError> {
        let host = &self.0;
        let url = std::env::var("OPEN_LEGEND_LAB_DATABASE_URL")
            .map_err(|_| "Configure a separate OPEN_LEGEND_LAB_DATABASE_URL")?;
        let database = url
            .parse::<tokio_postgres::Config>()
            .map_err(|_| "Invalid Lab PostgreSQL configuration")?;
        let data = std::env::var_os("OPEN_LEGEND_LAB_DATA_DIR")
            .ok_or("Configure an existing OPEN_LEGEND_LAB_DATA_DIR")?;
        let data = tokio::fs::canonicalize(data).await?;
        let main = canonical_destination(&host.game_data).await?;
        let game_saves = canonical_destination(&main.join("saves")).await?;
        let lab_saves = canonical_destination(&data.join("saves")).await?;
        if !data.is_dir()
            || overlaps(&data, &main)
            || overlaps(&lab_saves, &game_saves)
            || overlaps(&lab_saves, &main)
            || overlaps(&data, &game_saves)
        {
            return Err("Choose disjoint game and Lab data directories".into());
        }
        // Store::open takes the exclusive database writer lock before any
        // initialization or restore. Aliases pointing to the game writer fail.
        let startup = Arc::new(
            StartupStorage::open(&host.release, database, 1, preparation.is_some()).await?,
        );
        let namespace=startup.store.operational(|tx| Box::pin(async move {
            tx.batch_execute(
                "CREATE TABLE IF NOT EXISTS cognition_lab_identity (
                    singleton boolean PRIMARY KEY CHECK (singleton), namespace uuid NOT NULL, source text
                 )"
            ).await?;
            tx.execute(
                "INSERT INTO cognition_lab_identity(singleton,namespace)
                 VALUES(true,$1::text::uuid) ON CONFLICT DO NOTHING",
                 &[&uuid::Uuid::new_v4().to_string()]
            ).await?;
            Ok(tx.query_one("SELECT namespace::text FROM cognition_lab_identity WHERE singleton",&[]).await?.try_get::<_,String>(0)?)
        })).await?;
        if let Some((source, permit)) = preparation {
            prepare::install(host, &startup, &data, source, permit).await?;
        }
        decisions::settings::initialize(&startup.store).await?;
        scenario::initialize(&startup.store).await?;
        startup.store.enable_scenario_checkpoints(&namespace)?;
        decisions::participants::init(&startup.store).await?;
        let loads = Arc::new(LoadInbox::default());
        loop {
            if *host.stop.borrow() {break;}
            // Source membership belongs to the selected checkpoint. Rebuild the
            // guard after the same transaction changes the live world and proof.
            let imported = prepare::initialize(&startup.store).await?
                .map(|proof|Arc::new(prepare::SourceGuard::new(proof,host.game.store.clone())));
            let parent=Parent{imported,director:host.director.clone(),data:data.clone(),namespace:namespace.clone(),
                host:Arc::downgrade(host),startup:startup.clone()};
            let game = Arc::new(
                CurrentServer::from_storage(
                    &host.release,
                    Some(&host.release.join("navigation")),
                    &startup,
                )
                .await?,
            );
            let installed = game
                .installed_assets()
                .ok_or("The Lab requires an installed asset release")?
                .release()
                .clone();
            let prepared = PreparedGame::open(
                game,
                host.release.join("browser"),
                &host.settings,
                host.port,
                loads.clone(),
                true,
                Some(&parent),
            )
            .await?;
            let Some(load) = prepared
                .drive(Ingress::Lab(host.routes.clone(), host.stop.clone()))
                .await?
            else {
                break;
            };
            if load.authorized.check_host().is_err() {
                loads
                    .finish(load, true)
                    .map_err(|_| "Cannot settle Lab scenario restore")?;
                continue;
            }
            let restored = startup
                .recover_live_checkpoint(
                    &host.release,
                    &parent.data.join("saves"),
                    &load,
                    &installed,
                )
                .await;
            let refused = match restored {
                Ok(()) => false,
                Err(crate::store::CommitError::RolledBack(_)) => true,
                Err(error) => return Err(error.into()),
            };
            loads
                .finish(load, refused)
                .map_err(|_| "Cannot settle Lab scenario restore")?;
        }
        Ok(())
    }
}

fn overlaps(a: &Path, b: &Path) -> bool {
    a.starts_with(b) || b.starts_with(a)
}

/// Resolve existing links (including saves/) before comparing destinations.
/// A new game does not necessarily have a data directory until its first save.
async fn canonical_destination(path: &Path) -> std::io::Result<PathBuf> {
    let mut existing = std::path::absolute(path)?;
    let mut missing = Vec::new();
    loop {
        match tokio::fs::canonicalize(&existing).await {
            Ok(mut resolved) => {
                for name in missing.into_iter().rev() {
                    resolved.push(name);
                }
                return Ok(resolved);
            }
            Err(error)
                if error.kind() == std::io::ErrorKind::NotFound
                    && existing.file_name().is_some()
                    && tokio::fs::symlink_metadata(&existing)
                        .await
                        .is_err_and(|e| e.kind() == std::io::ErrorKind::NotFound) =>
            {
                missing.push(existing.file_name().expect("a path component").to_owned());
                existing.pop();
            }
            Err(error) => return Err(error),
        }
    }
}
