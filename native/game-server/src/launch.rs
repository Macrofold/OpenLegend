//! The listener, accepted clock and ordinary writer share one installed world.
//! Stopping ingress leaves the final accepted prefix with its save owner.

use crate::{access_http, authority::Authority, boot::CurrentServer, game_clock::GameClock};
use crate::{live_save::LiveSaves, oidc::Oidc};
use axum::{
    Router,
    extract::Request,
    http::{HeaderValue, header},
    middleware::{self, Next},
    response::Response,
};
use std::{error::Error, path::Path, sync::Arc, time::Duration};
use tokio::{net::TcpListener, sync::watch};
use tower_http::services::{ServeDir, ServeFile};

type LaunchError = Box<dyn Error + Send + Sync>;

pub async fn serve(release: &Path, database: tokio_postgres::Config) -> Result<(), LaunchError> {
    #[cfg(feature = "profile-campaign")]
    let _profile = crate::profile::start_from_operator();
    let mode = setting("OPEN_LEGEND_AUTH_MODE", "local")?;
    if !matches!(mode.as_str(), "local" | "oidc") {
        return Err("Unsupported OPEN_LEGEND_AUTH_MODE".into());
    }
    let local = mode == "local";
    let host = setting("OPEN_LEGEND_HOST", "127.0.0.1")?;
    let port = setting("PORT", "3210")?.parse::<u16>()?;
    let loopback_http = setting("OPEN_LEGEND_OIDC_LOOPBACK_HTTP", "false")?.as_str() == "true";
    let public_origin = setting("OPEN_LEGEND_PUBLIC_ORIGIN", "")?;
    if (local || public_origin.starts_with("http:"))
        && !matches!(host.as_str(), "127.0.0.1" | "::1" | "localhost")
    {
        return Err("Local HTTP authentication requires a loopback bind address".into());
    }
    let listen = TcpListener::bind((host.as_str(), port)).await?;
    let bound = listen.local_addr()?;
    let browser = release.join("browser");
    if !tokio::fs::metadata(browser.join("index.html"))
        .await?
        .is_file()
    {
        return Err("The operator release has no browser build".into());
    }
    let game = Arc::new(
        CurrentServer::open_game(release, &release.join("navigation"), database, 1).await?,
    );
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
    let limit_usd = setting("AI_BUDGET_USD", "50")?.parse::<f64>()?;
    if !(0.0..=100.0).contains(&limit_usd) {
        return Err("AI_BUDGET_USD must be between 0 and 100".into());
    }
    let macrofold = !setting("MACROFOLD_API_KEY", "")?.is_empty();
    let jev = !setting("TYPESAFE_API_KEY", &setting("JEV_API_KEY", "")?)?.is_empty();
    let language = !setting("OPENAI_API_KEY", "")?.is_empty();
    let display = crate::store::AiDisplay {
        jev_configured: macrofold || jev,
        llm_configured: macrofold || language,
        limit_usd,
    };
    let schedule = (display.jev_configured && limit_usd > 0.0).then(|| {
        Arc::new(crate::npc::schedule::ScheduleInbox::new(
            game.cognition.clone(),
            custody.clone(),
        ))
    });
    let saves = LiveSaves::new(
        game.world.clone(),
        game.store.clone(),
        custody.clone(),
        game.language().cloned(),
    )?;
    let saves = Arc::new(match &schedule {
        Some(schedule) => saves.with_schedule(schedule.clone()),
        None => saves,
    });
    let clock = Arc::new(
        GameClock::new(game.clone(), saves.clone(), game.view_policy().base_ratio())
            .with_inputs(presence.clone(), inputs.clone()),
    );
    let decisions = Arc::new(crate::npc::Director::new(
        game.clone(),
        saves.clone(),
        authority.clone(),
        limit_usd,
    )?);
    let (end_http, http_stop) = watch::channel(false);
    let (request_owner, mut requests_released) = watch::channel(());
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
        access_http::local_router(authority, bound.port(), game_routes)
    } else {
        let secret = setting("OPEN_LEGEND_OIDC_CLIENT_SECRET", "")?;
        let oidc = Oidc::new(
            public_origin,
            setting("OPEN_LEGEND_OIDC_ISSUER", "")?,
            setting("OPEN_LEGEND_OIDC_CLIENT_ID", "")?,
            (!secret.is_empty()).then_some(secret),
            loopback_http,
            custody.clone(),
        )?;
        access_http::oidc_router(authority, oidc, game_routes)
    };
    clock.initialize().await?;
    println!("OpenLegend listening on {bound}");
    let run = run(
        listen,
        routes,
        clock,
        saves,
        decisions,
        schedule,
        end_http,
        game.clone(),
    )
    .await;
    // Axum can report a finished connection before Hyper drops its
    // service and response body. Wait for their player owners as well.
    let _ = requests_released.changed().await;
    game.world.drain_operations().await;
    let close = Arc::try_unwrap(game)
        .map_err(|_| "The listener left a running world owner")?
        .close()
        .await;
    println!(
        "OpenLegend native memory {}",
        serde_json::json!({
            "transientBytes": custody.used(),
            "transientPeakBytes": custody.peak(),
            "residentBytes": custody.resident().used(),
            "residentPeakBytes": custody.resident().peak(),
            "pendingSaveBytes": custody.pending_save_used(),
            "pendingSavePeakBytes": custody.pending_save_peak(),
        })
    );
    run.and(close)
}

async fn run(
    listen: TcpListener,
    routes: Router,
    clock: Arc<GameClock>,
    saves: Arc<LiveSaves>,
    decisions: Arc<crate::npc::Director>,
    schedule: Option<Arc<crate::npc::schedule::ScheduleInbox>>,
    end_http: watch::Sender<bool>,
    game: Arc<CurrentServer>,
) -> Result<(), LaunchError> {
    let http_stop = end_http.subscribe();
    let scheduler = schedule
        .map(|inbox| tokio::spawn(decisions.clone().run_schedule(inbox, end_http.subscribe())));
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
    tokio::pin!(http, clock_work, save_work);
    let mut http_result = None;
    let mut clock_result = None;
    let mut save_result = None;
    let mut decision_result = None;
    let signal = tokio::select! {
        result = &mut http => { http_result = Some(result); Ok(()) }
        result = &mut clock_work => { clock_result = Some(result); Ok(()) }
        result = &mut save_work => { save_result = Some(result); Ok(()) }
        result = shutdown_signal() => result,
    };
    let _ = end_http.send(true);
    let _ = end_clock.send(true);
    let _ = end_lexical.send(true);
    let stop_decisions = async move {
        // Let the scheduler acknowledge its in-flight PostgreSQL write and
        // register the corresponding task before draining decision owners.
        let scheduled = match scheduler {
            Some(task) => task.await,
            None => Ok(()),
        };
        let settled = decisions.stop().await;
        scheduled?;
        settled?;
        Ok::<_, LaunchError>(())
    };
    tokio::pin!(stop_decisions);
    // Let pending accepted commands finish while their writer still runs.
    while http_result.is_none() || clock_result.is_none() || decision_result.is_none() {
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
        }
    }
    let _ = end_saves.send(true);
    if save_result.is_none() {
        save_result = Some(save_work.await);
    }
    lexical.await?;
    signal?;
    decision_result.expect("joined decision owner")?;
    save_result.expect("joined save owner")?;
    clock_result.ok_or("The save owner stopped before the clock")??;
    http_result.ok_or("The save owner stopped before ingress")??;
    Ok(())
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

fn setting(name: &str, default: &str) -> Result<String, std::env::VarError> {
    match std::env::var(name) {
        Err(std::env::VarError::NotPresent) => Ok(default.to_owned()),
        value => value,
    }
}
