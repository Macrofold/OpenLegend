//! The listener, accepted clock and ordinary writer share one installed world.
//! Stopping ingress leaves the final accepted prefix with its save owner.

use crate::{
    access_http,
    authority::Authority,
    boot::{CurrentServer, StartupStorage},
    game_clock::GameClock,
};
use crate::{live_save::LiveSaves, oidc::Oidc};
use axum::{
    Router,
    extract::Request,
    http::{HeaderValue, header},
    middleware::{self, Next},
    response::Response,
};
use std::{
    error::Error,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};
use tokio::{net::TcpListener, sync::watch};
use tokio_postgres::Config as DatabaseConfig;
use tower_http::services::{ServeDir, ServeFile};

type LaunchError = Box<dyn Error + Send + Sync>;

pub(crate) mod checkpoint_load;
mod creation;
use checkpoint_load::{LoadInbox, LoadRequest};

struct JournalLaunch {
    authority: Arc<Authority>,
    model: Option<crate::narrator::NarratorModel>,
    world: String,
    batch_ms: u64,
}

struct ListenerSettings {
    local: bool,
    host: String,
    port: u16,
    loopback_http: bool,
    public_origin: String,
}

impl ListenerSettings {
    fn read() -> Result<Self, LaunchError> {
        let mode = setting("OPEN_LEGEND_AUTH_MODE", "local")?;
        if !matches!(mode.as_str(), "local" | "oidc") {
            return Err("Unsupported OPEN_LEGEND_AUTH_MODE".into());
        }
        let local = mode == "local";
        let host = setting("OPEN_LEGEND_HOST", "127.0.0.1")?;
        let port = setting("PORT", "3210")?.parse()?;
        let loopback_http = setting("OPEN_LEGEND_OIDC_LOOPBACK_HTTP", "false")? == "true";
        let public_origin = setting("OPEN_LEGEND_PUBLIC_ORIGIN", "")?;
        if (local || public_origin.starts_with("http:"))
            && !matches!(host.as_str(), "127.0.0.1" | "::1" | "localhost")
        {
            return Err("Local HTTP authentication requires a loopback bind address".into());
        }
        Ok(Self {
            local,
            host,
            port,
            loopback_http,
            public_origin,
        })
    }
}

struct PreparedGame {
    routes: Router,
    game: Arc<CurrentServer>,
    clock: Arc<GameClock>,
    saves: Arc<LiveSaves>,
    decisions: Arc<crate::npc::Director>,
    schedule: Arc<crate::npc::schedule::ScheduleInbox>,
    checkpoints: Arc<crate::store::checkpoint::CheckpointSchedule>,
    loads: Arc<LoadInbox>,
    journal: JournalLaunch,
    embedding: Option<Arc<crate::npc::semantic_index::EmbeddingModel>>,
    end_http: watch::Sender<bool>,
    requests_released: watch::Receiver<()>,
}

pub async fn serve(release: &Path, database: DatabaseConfig) -> Result<(), LaunchError> {
    #[cfg(feature = "profile-campaign")]
    let _profile = crate::profile::start_from_operator();
    let settings = ListenerSettings::read()?;
    let listen = TcpListener::bind((settings.host.as_str(), settings.port)).await?;
    let bound = listen.local_addr()?;
    let browser = release.join("browser");
    if !tokio::fs::metadata(browser.join("index.html"))
        .await?
        .is_file()
    {
        return Err("The operator release has no browser build".into());
    }
    match setting("OPEN_LEGEND_STARTUP_MODE", "ordinary")?.as_str() {
        "ordinary" => (),
        "awaiting-creation" => {
            return creation::serve(release, browser, database, listen, settings).await;
        }
        _ => return Err("Unsupported OPEN_LEGEND_STARTUP_MODE".into()),
    }
    let startup = Arc::new(StartupStorage::open(release, database, 1, false).await?);
    let game =
        CurrentServer::from_storage(release, Some(&release.join("navigation")), &startup).await?;
    let loads = Arc::new(LoadInbox::default());
    let game = PreparedGame::open(
        Arc::new(game),
        browser.clone(),
        &settings,
        bound.port(),
        loads,
    )
    .await?;
    println!("OpenLegend listening on {bound}");
    serve_with_recovery(game, listen, None, release, browser, &settings, startup).await
}

async fn serve_with_recovery(
    game: PreparedGame,
    listen: TcpListener,
    extra: Option<Router>,
    release: &Path,
    browser: PathBuf,
    settings: &ListenerSettings,
    startup: Arc<StartupStorage>,
) -> Result<(), LaunchError> {
    let port = listen.local_addr()?.port();
    let directory = PathBuf::from(setting("OPEN_LEGEND_DATA_DIR", ".data")?).join("saves");
    let socket = listen.into_std()?;
    let custody = game.game.host.budget().clone();
    let loads = game.loads.clone();
    let result = async {
        let mut game = game;
        loop {
            let listener = TcpListener::from_std(socket.try_clone()?)?;
            let Some(request) = game.serve(listener, extra.clone()).await? else {
                return Ok(());
            };
            report_native_memory("OpenLegend checkpoint handoff memory", &custody);
            let outcome = startup
                .recover_live_checkpoint(
                    release,
                    &directory,
                    &request.slot,
                    request.id,
                    &request.authorized.scope,
                )
                .await;
            let refused = match outcome {
                Ok(()) => false,
                Err(crate::store::CommitError::RolledBack(error)) => {
                    eprintln!("Live checkpoint load refused: {error}");
                    true
                }
                Err(error) => return Err(error.into()),
            };
            let current =
                CurrentServer::from_storage(release, Some(&release.join("navigation")), &startup)
                    .await?;
            game = PreparedGame::open(
                Arc::new(current),
                browser.clone(),
                settings,
                port,
                loads.clone(),
            )
            .await?;
            loads
                .finish(request, refused)
                .map_err(|_| "Cannot settle the checkpoint request")?;
        }
    }
    .await;
    // The socket, operational Store and pending outcomes outlive an individual
    // world during Load. Release them before reporting a complete shutdown.
    drop((socket, extra, startup, loads));
    report_native_memory("OpenLegend native memory", &custody);
    result
}

fn report_native_memory(label: &str, custody: &openlegend_simulation::host::ByteBudget) {
    println!(
        "{label} {}",
        serde_json::json!({
            "transientBytes": custody.used(),
            "transientPeakBytes": custody.peak(),
            "residentBytes": custody.resident().used(),
            "residentPeakBytes": custody.resident().peak(),
            "pendingSaveBytes": custody.pending_save_used(),
            "pendingSavePeakBytes": custody.pending_save_peak(),
        })
    );
}

impl PreparedGame {
    async fn open(
        game: Arc<CurrentServer>,
        browser: PathBuf,
        settings: &ListenerSettings,
        port: u16,
        loads: Arc<LoadInbox>,
    ) -> Result<Self, LaunchError> {
        let local = settings.local;
        let custody = game.host.budget().clone();
        let duration = setting("OPEN_LEGEND_SESSION_HOURS", "8")?.parse::<f64>()?;
        let players = setting("OPEN_LEGEND_PLAYER_CAPACITY", "100")?.parse::<i64>()?;
        if !(0.1..=24.0).contains(&duration) {
            return Err("OPEN_LEGEND_SESSION_HOURS must be between 0.1 and 24".into());
        }
        let world_id = game
            .world
            .capture(|world| Ok(world.world_id()?.to_owned()))
            .await?;
        let (authority, identity) = Authority::for_world(
            game.store.clone(),
            world_id.clone(),
            Duration::from_secs_f64(duration * 3600.0),
            4096_i64.max(16 * players),
            local,
            custody.clone(),
        )
        .await?;
        let authority = Arc::new(authority);
        let presence = Arc::new(crate::presence::Presence::new(
            authority.clone(),
            usize::try_from(6 * players)?,
            custody.clone(),
        )?);
        let inputs = Arc::new(crate::world_input::WorldInputs::new(
            authority.clone(),
            custody.clone(),
            usize::try_from(6 * players)?,
        )?);
        let grace = setting("OPEN_LEGEND_EXIT_GRACE_SECONDS", "15")?.parse::<f64>()?;
        if !(1.0..=60.0).contains(&grace) {
            return Err("OPEN_LEGEND_EXIT_GRACE_SECONDS must be between 1 and 60".into());
        }
        let limit_usd = ai_budget_limit()?;
        let macrofold = !setting("MACROFOLD_API_KEY", "")?.is_empty();
        let jev = !setting("TYPESAFE_API_KEY", &setting("JEV_API_KEY", "")?)?.is_empty();
        let language = !setting("OPENAI_API_KEY", "")?.is_empty();
        let display = crate::store::AiDisplay {
            jev_configured: macrofold || jev,
            llm_configured: macrofold || language,
            limit_usd,
        };
        let schedule = Arc::new(crate::npc::schedule::ScheduleInbox::new(
            game.cognition.clone(),
            custody.clone(),
            display.jev_configured && limit_usd > 0.0,
        ));
        let saves = LiveSaves::new(
            game.world.clone(),
            game.store.clone(),
            custody.clone(),
            game.language().cloned(),
        )?;
        let saves = Arc::new(saves.with_schedule(schedule.clone()));
        let checkpoints = Arc::new(crate::store::checkpoint::CheckpointSchedule::new(
            game.store.clone(),
            saves.clone(),
            world_id.clone(),
            PathBuf::from(setting("OPEN_LEGEND_DATA_DIR", ".data")?).join("saves"),
        ));
        let clock = Arc::new(
            GameClock::new(
                game.clone(),
                saves.clone(),
                checkpoints.clone(),
                game.view_policy().base_ratio(),
            )
            .with_inputs(presence.clone(), inputs.clone()),
        );
        let decisions = Arc::new(crate::npc::Director::new(
            game.clone(),
            saves.clone(),
            authority.clone(),
            limit_usd,
        )?);
        let embedding = decisions.embedding_model();
        let batch_ms = setting("NARRATION_BATCH_MS", "750")?.parse::<u64>()?;
        if batch_ms > 10_000 {
            return Err("NARRATION_BATCH_MS must be between 0 and 10000".into());
        }
        let journal = JournalLaunch {
            authority: authority.clone(),
            model: decisions.narrator_model(limit_usd)?,
            world: world_id.clone(),
            batch_ms,
        };
        let (end_http, http_stop) = watch::channel(false);
        let (request_owner, requests_released) = watch::channel(());
        let requests = crate::player_http::router(
            authority.clone(),
            identity,
            game.clone(),
            saves.clone(),
            presence,
            inputs,
            clock.clone(),
            decisions.clone(),
            world_id,
            usize::try_from(4 * players)?,
            Duration::from_secs_f64(grace),
            usize::try_from(3 * players)?,
            display,
            setting("OPEN_LEGEND_GOD_MODE", "false")? == "true",
            http_stop.clone(),
            request_owner,
            checkpoints.clone(),
            loads.clone(),
        )
        .map_err(|_| "Could not establish per-process player reference keys")?;
        let game_routes = Router::new()
            .route_service("/", ServeFile::new(browser.join("index.html")))
            .fallback_service(ServeDir::new(browser).append_index_html_on_directories(false))
            .layer(middleware::from_fn(build_cache))
            .merge(requests);
        let game_routes = match game.installed_assets() {
            Some(assets) => game_routes.merge(crate::player_http::assets::router(
                assets.clone(),
                authority.clone(),
                game.store.clone(),
                custody.clone(),
                http_stop,
            )),
            None => game_routes,
        };
        let routes = if local {
            access_http::local_router(authority, port, game_routes)
        } else {
            let secret = setting("OPEN_LEGEND_OIDC_CLIENT_SECRET", "")?;
            let oidc = Oidc::new(
                settings.public_origin.clone(),
                setting("OPEN_LEGEND_OIDC_ISSUER", "")?,
                setting("OPEN_LEGEND_OIDC_CLIENT_ID", "")?,
                (!secret.is_empty()).then_some(secret),
                settings.loopback_http,
                custody.clone(),
            )?;
            access_http::oidc_router(
                authority,
                oidc,
                game_routes,
                Some(access_http::Enrollment {
                    game: game.clone(),
                    saves: saves.clone(),
                }),
            )
        };
        clock.initialize().await?;
        Ok(Self {
            routes,
            clock,
            saves,
            decisions,
            schedule,
            checkpoints,
            loads,
            journal,
            embedding,
            end_http,
            requests_released,
            game,
        })
    }

    async fn serve(
        self,
        listen: TcpListener,
        extra: Option<Router>,
    ) -> Result<Option<LoadRequest>, LaunchError> {
        let Self {
            routes,
            clock,
            saves,
            decisions,
            schedule,
            checkpoints,
            loads,
            journal,
            embedding,
            end_http,
            mut requests_released,
            game,
        } = self;
        let routes = match extra {
            Some(extra) => routes.merge(extra),
            None => routes,
        };
        let run = run(
            listen,
            routes,
            clock,
            saves,
            decisions,
            schedule,
            checkpoints,
            loads,
            journal,
            embedding,
            end_http,
            game.clone(),
        )
        .await;
        // Axum can report a finished connection before Hyper drops its
        // service and response body. Wait for their player owners as well.
        let _ = requests_released.changed().await;
        game.world.drain_operations().await;
        let game = Arc::try_unwrap(game).map_err(|_| "The listener left a running world owner")?;
        if matches!(run, Ok(Some(_))) {
            // The host and its one Store remain with the listener supervisor.
            game.world.stop().await?;
            drop(game);
        } else {
            game.close().await?;
        }
        run
    }
}

async fn run(
    listen: TcpListener,
    routes: Router,
    clock: Arc<GameClock>,
    saves: Arc<LiveSaves>,
    decisions: Arc<crate::npc::Director>,
    schedule: Arc<crate::npc::schedule::ScheduleInbox>,
    checkpoints: Arc<crate::store::checkpoint::CheckpointSchedule>,
    loads: Arc<LoadInbox>,
    journal: JournalLaunch,
    embedding: Option<Arc<crate::npc::semantic_index::EmbeddingModel>>,
    end_http: watch::Sender<bool>,
    game: Arc<CurrentServer>,
) -> Result<Option<LoadRequest>, LaunchError> {
    let http_stop = end_http.subscribe();
    let scheduler = tokio::spawn(
        decisions
            .clone()
            .run_schedule(schedule.clone(), end_http.subscribe()),
    );
    let maintenance = tokio::spawn(
        decisions
            .clone()
            .run_maintenance(schedule, end_http.subscribe()),
    );
    let semantic = tokio::spawn(crate::npc::semantic_index::run(
        game.clone(),
        decisions.provider_dispatch(),
        embedding,
        saves.semantic_waker(),
        end_http.subscribe(),
    ));
    let recovery_authority = journal.authority.clone();
    let narration = tokio::spawn(crate::narrator::run(
        game.clone(),
        saves.clone(),
        decisions.provider_dispatch(),
        journal.authority,
        journal.model,
        journal.world,
        journal.batch_ms,
        saves.story_waker(),
        end_http.subscribe(),
    ));
    let checkpoint_stop = end_http.subscribe();
    let checkpoint_work = checkpoints.run(checkpoint_stop);
    let (end_clock, clock_stop) = watch::channel(false);
    let (end_saves, save_stop) = watch::channel(false);
    let (end_lexical, lexical_stop) = watch::channel(false);
    let lexical = tokio::spawn(crate::lexical_maintenance::run(
        game,
        saves.lexical_waker(),
        lexical_stop,
    ));
    let http = async move {
        axum::serve(crate::socket::Listener(listen), routes)
            .with_graceful_shutdown(stopped(http_stop))
            .await
    };
    let clock_work = clock.run(clock_stop);
    let save_work = saves.run(save_stop);
    let loading = async {
        loop {
            let request = loads
                .next()
                .await
                .map_err(|_| "Cannot admit a checkpoint request")?;
            match clock
                .pause_for_recovery(recovery_authority.clone(), request.authorized.clone())
                .await
            {
                Ok(()) => return Ok::<_, LaunchError>(Some(request)),
                Err(error) => {
                    eprintln!("Could not pause for checkpoint load: {error}");
                    loads
                        .finish(request, true)
                        .map_err(|_| "Cannot settle the checkpoint request")?;
                }
            }
        }
    };
    tokio::pin!(http, clock_work, save_work, checkpoint_work, loading);
    let mut http_result = None;
    let mut clock_result = None;
    let mut save_result = None;
    let mut decision_result = None;
    let mut checkpoints_stopped = false;
    let signal = tokio::select! {
        result = &mut http => { http_result = Some(result); Ok(None) }
        result = &mut clock_work => { clock_result = Some(result); Ok(None) }
        result = &mut save_work => { save_result = Some(result); Ok(None) }
        _ = &mut checkpoint_work => { checkpoints_stopped = true; Ok(None) }
        result = shutdown_signal() => result.map(|_| None).map_err(Into::into),
        request = &mut loading => request,
    };
    let _ = end_http.send(true);
    let _ = end_clock.send(true);
    let _ = end_lexical.send(true);
    let stop_decisions = async move {
        // Let the scheduler acknowledge its in-flight PostgreSQL write and
        // register the corresponding task before draining decision owners.
        let (scheduled, maintained, narrated, indexed) =
            tokio::join!(scheduler, maintenance, narration, semantic);
        let settled = decisions.stop().await;
        scheduled?;
        maintained?;
        narrated??;
        indexed?;
        settled?;
        Ok::<_, LaunchError>(())
    };
    tokio::pin!(stop_decisions);
    // Let pending accepted commands finish while their writer still runs.
    while http_result.is_none()
        || clock_result.is_none()
        || decision_result.is_none()
        || !checkpoints_stopped
    {
        tokio::select! {
            result = &mut http, if http_result.is_none() => {
                http_result = Some(result);
            }
            result = &mut clock_work, if clock_result.is_none() => {
                clock_result = Some(result);
            }
            result = &mut save_work, if save_result.is_none() => {
                save_result = Some(result);
            }
            result = &mut stop_decisions, if decision_result.is_none() => {
                decision_result = Some(result);
            }
            _ = &mut checkpoint_work, if !checkpoints_stopped => {
                checkpoints_stopped = true;
            }
        }
    }
    let _ = end_saves.send(true);
    if save_result.is_none() {
        save_result = Some(save_work.await);
    }
    lexical.await?;
    let load = signal?;
    decision_result.expect("joined decision owner")?;
    save_result.expect("joined save owner")?;
    clock_result.ok_or("The save owner stopped before the clock")??;
    http_result.ok_or("The save owner stopped before ingress")??;
    Ok(load)
}

async fn stopped(mut receiver: watch::Receiver<bool>) {
    while !*receiver.borrow() && receiver.changed().await.is_ok() {}
}

async fn shutdown_signal() -> std::io::Result<()> {
    #[cfg(unix)]
    {
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())?;
        tokio::select! {
            result = tokio::signal::ctrl_c() => result,
            _ = terminate.recv() => Ok(()),
        }
    }
    #[cfg(not(unix))]
    tokio::signal::ctrl_c().await
}

async fn build_cache(request: Request, next: Next) -> Response {
    let is_html = request.uri().path() == "/" || request.uri().path().ends_with(".html");
    let mut response = next.run(request).await;
    if response.status().is_success() {
        response.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static(if is_html {
                "no-cache"
            } else {
                "public, max-age=3600"
            }),
        );
    }
    response
}

fn ai_budget_limit() -> Result<f64, LaunchError> {
    let limit = setting("AI_BUDGET_USD", "50")?.parse::<f64>()?;
    if !(0.0..=100.0).contains(&limit) {
        return Err("AI_BUDGET_USD must be between 0 and 100".into());
    }
    Ok(limit)
}

fn setting(name: &str, default: &str) -> Result<String, std::env::VarError> {
    match std::env::var(name) {
        Err(std::env::VarError::NotPresent) => Ok(default.to_owned()),
        value => value,
    }
}
