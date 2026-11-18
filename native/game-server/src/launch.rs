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
        world_id,
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
    let saves = Arc::new(LiveSaves::new(
        game.world.clone(),
        game.store.clone(),
        custody.clone(),
        game.language().cloned(),
    )?);
    let grace = setting("OPEN_LEGEND_EXIT_GRACE_SECONDS", "15")?.parse::<f64>()?;
    if !(1.0..=60.0).contains(&grace) {
        return Err("OPEN_LEGEND_EXIT_GRACE_SECONDS must be between 1 and 60".into());
    }
    let requests = crate::player_http::router(
        authority.clone(),
        identity,
        game.clone(),
        saves.clone(),
        presence.clone(),
        inputs.clone(),
        usize::try_from(4 * players)?,
        Duration::from_secs_f64(grace),
    );
    let game_routes = Router::new()
        .route_service("/", ServeFile::new(browser.join("index.html")))
        .fallback_service(ServeDir::new(browser).append_index_html_on_directories(false))
        .layer(middleware::from_fn(build_cache))
        .merge(requests);
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
    let clock = GameClock::new(game.clone(), saves.clone(), 60.0).with_inputs(presence, inputs);
    clock.initialize().await?;
    println!("OpenLegend listening on {bound}");
    let run = run(listen, routes, clock, saves).await;
    let close = Arc::try_unwrap(game)
        .map_err(|_| "The listener left a running world owner")?
        .close()
        .await;
    run.and(close)
}

async fn run(
    listen: TcpListener,
    routes: Router,
    clock: GameClock,
    saves: Arc<LiveSaves>,
) -> Result<(), LaunchError> {
    let (end_http, http_stop) = watch::channel(false);
    let (end_clock, clock_stop) = watch::channel(false);
    let (end_saves, save_stop) = watch::channel(false);
    let http = async move {
        axum::serve(listen, routes)
            .with_graceful_shutdown(stopped(http_stop))
            .await
    };
    let clock_work = clock.run(clock_stop);
    let save_work = saves.run(save_stop);
    tokio::pin!(http, clock_work, save_work);
    let mut http_result = None;
    let mut clock_result = None;
    let mut save_result = None;
    let signal = tokio::select! {
        result = &mut http => { http_result = Some(result); Ok(()) }
        result = &mut clock_work => { clock_result = Some(result); Ok(()) }
        result = &mut save_work => { save_result = Some(result); Ok(()) }
        result = shutdown_signal() => result,
    };
    let _ = end_http.send(true);
    let _ = end_clock.send(true);
    // Let pending accepted commands finish while their writer still runs.
    while http_result.is_none() || clock_result.is_none() {
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
        }
    }
    let _ = end_saves.send(true);
    if save_result.is_none() {
        save_result = Some(save_work.await);
    }
    signal?;
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
