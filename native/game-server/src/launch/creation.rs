//! An explicitly empty target opens a world only after an exact committed
//! receipt. Waiting and live entry share one bound socket and database writer.
use super::{
    DatabaseConfig, LaunchError, ListenerSettings, PreparedGame, ai_budget_limit, build_cache,
    checkpoint_load::LoadInbox, serve_with_recovery, setting, shutdown_signal,
};
use crate::{
    access_http::{BrowserOrigin, guard_origin},
    boot::{CurrentServer, StartupStorage},
    creation::{ActivationReceipt, Adoption, CreationTarget, DestinationConfig, OpeningValidator},
};
use axum::{Router, middleware};
use openlegend_simulation::encoding::sha256_hex;
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::Arc,
};
use tokio::{
    net::TcpListener,
    sync::{Mutex, oneshot, watch},
};
use tower_http::services::{ServeDir, ServeFile};

pub(super) async fn serve(
    release: &Path,
    browser: PathBuf,
    database: DatabaseConfig,
    listen: TcpListener,
    settings: ListenerSettings,
) -> Result<(), LaunchError> {
    let bound = listen.local_addr()?;
    let origin = if settings.local {
        BrowserOrigin::Loopback(bound.port())
    } else {
        BrowserOrigin::Configured(settings.public_origin.as_str().into())
    };
    let mut destination: DestinationConfig =
        serde_json::from_str(&std::env::var("OPEN_LEGEND_CREATION_DESTINATION_JSON")?)
            .map_err(|_| "Invalid creation destination settings")?;
    if !destination.validate_listener(
        settings.local,
        bound.port(),
        &settings.public_origin,
        &setting("OPEN_LEGEND_OIDC_ISSUER", "")?,
    ) {
        return Err("Creation configuration does not match the game listener".into());
    }
    let opening = release.join("opening.json");
    let opening_sha = std::env::var("OPEN_LEGEND_CREATION_OPENING_SHA256")?;
    let startup = Arc::new(StartupStorage::open(release, database, 1, true).await?);
    let clock_rate = startup.base_clock_rate(release)?;
    let budget_usd = ai_budget_limit()?;
    let mut operating = operating_settings(&settings, clock_rate, budget_usd)?;
    operating.extend(crate::npc::creation_model_settings(
        budget_usd,
        startup.store.schema.recall.maintenance.output_tokens,
    )?);
    let config = configuration_fingerprint(&opening_sha, release)?;
    let validate: OpeningValidator = {
        let startup = startup.clone();
        let release = release.to_owned();
        Arc::new(move |opening, account, actor, construction_grants| {
            let startup = startup.clone();
            let release = release.clone();
            Box::pin(async move {
                startup
                    .validate_first_opening(&release, opening, account, actor, Some(construction_grants))
                    .await
            })
        })
    };
    let target = CreationTarget::new(
        startup.store.clone(),
        destination,
        opening,
        opening_sha,
        setting("OPEN_LEGEND_DATA_DIR", ".data")?.into(),
        operating,
        config,
        validate,
    )
    .await?;
    let (publish, mut prepared) = oneshot::channel();
    let settings = Arc::new(settings);
    let activate: Adoption = {
        let startup = startup.clone();
        let publish = Arc::new(Mutex::new(Some(publish)));
        let release = Arc::new(release.to_owned());
        let browser = Arc::new(browser.clone());
        let settings = settings.clone();
        Arc::new(move |receipt: ActivationReceipt| {
            let startup = startup.clone();
            let publish = publish.clone();
            let release = release.clone();
            let browser = browser.clone();
            let settings = settings.clone();
            Box::pin(async move {
                // Only one readiness request can try runtime adoption. A failed
                // attempt leaves the committed rows and their writer in place.
                let mut state = publish.lock().await;
                if state.is_none() {
                    return true;
                }
                let opened = async {
                    let game = CurrentServer::from_storage(
                        &release,
                        Some(&release.join("navigation")),
                        &startup,
                    )
                    .await?;
                    if game
                        .world
                        .capture(|world| Ok(world.world_id()?.to_owned()))
                        .await?
                        != receipt.world_id
                    {
                        return Err(
                            "The committed world does not match the creation receipt".into()
                        );
                    }
                    PreparedGame::open(
                        Arc::new(game),
                        browser.as_ref().clone(),
                        &settings,
                        bound.port(),
                        Arc::new(LoadInbox::default()),
                        false,
                        None,
                    )
                    .await
                }
                .await;
                match opened {
                    Ok(game) => state
                        .take()
                        .expect("pending readiness sender")
                        .send(game)
                        .is_ok(),
                    Err(error) => {
                        eprintln!("OpenLegend created world is unavailable: {error}");
                        false
                    }
                }
            })
        })
    };
    let routes = guard_origin(target.router(activate.clone()), origin.clone());
    if let Some(receipt) = target.committed_activation().await?
        && activate(receipt).await
    {
        let game = prepared.await?;
        drop((activate, target));
        println!("OpenLegend listening on {bound}");
        return serve_with_recovery(
            game,
            listen,
            Some(routes),
            release,
            browser,
            &settings,
            startup,
        )
        .await;
    }
    let waiting = guard_origin(
        Router::new()
            .route_service("/", ServeFile::new(browser.join("index.html")))
            .fallback_service(ServeDir::new(&browser).append_index_html_on_directories(false))
            .layer(middleware::from_fn(build_cache))
            .merge(target.waiting_router(activate)),
        origin,
    );
    // Retain one socket across graceful drain so a readiness transition
    // cannot accidentally relinquish the operator's selected listener.
    let socket = listen.into_std()?;
    let waiting_listener = TcpListener::from_std(socket.try_clone()?)?;
    let (stop, mut stopping) = watch::channel(false);
    let waiting_http = async {
        axum::serve(waiting_listener, waiting)
            .with_graceful_shutdown(async move {
                let _ = stopping.wait_for(|stopped| *stopped).await;
            })
            .await
    };
    tokio::pin!(waiting_http);
    println!("OpenLegend listening on {bound}");
    let opened = tokio::select! {
        result = &mut waiting_http => return Ok(result?),
        signal = shutdown_signal() => { signal?; None }
        ready = &mut prepared => Some(ready?),
    };
    let _ = stop.send(true);
    waiting_http.await?;
    drop(target);
    match opened {
        Some(game) => {
            serve_with_recovery(
                game,
                TcpListener::from_std(socket)?,
                Some(routes),
                release,
                browser,
                &settings,
                startup,
            )
            .await
        }
        None => Ok(()),
    }
}

fn operating_settings(
    settings: &ListenerSettings,
    clock_rate: f64,
    budget_usd: f64,
) -> Result<BTreeMap<String, Value>, LaunchError> {
    Ok(BTreeMap::from([
        (
            "authenticationMode".to_owned(),
            json!(if settings.local { "local" } else { "oidc" }),
        ),
        (
            "simulationSecondsPerRealSecond".to_owned(),
            json!(clock_rate),
        ),
        (
            "playerCapacity".to_owned(),
            json!(setting("OPEN_LEGEND_PLAYER_CAPACITY", "100")?.parse::<u64>()?),
        ),
        (
            "departureGraceMs".to_owned(),
            json!(setting("OPEN_LEGEND_EXIT_GRACE_SECONDS", "15")?.parse::<f64>()? * 1000.0),
        ),
        ("monthlyActorAiBudgetUsd".to_owned(), json!(budget_usd)),
        (
            "creatorToolsEnabled".to_owned(),
            json!(setting("OPEN_LEGEND_GOD_MODE", "false")? == "true"),
        ),
    ]))
}

/// Only a digest of server-owned settings participates in the reviewed
/// registration. Credentials and transport details are never returned.
fn configuration_fingerprint(opening: &str, release: &Path) -> Result<String, LaunchError> {
    let relevant = [
        "OPEN_LEGEND_",
        "OPENLEGEND_",
        "AI_",
        "COGNITION_",
        "EMBEDDING_",
        "JEV_",
        "TYPESAFE_",
        "MACROFOLD_",
        "OPENAI_",
    ];
    let settings: BTreeMap<_, _> = std::env::vars_os()
        .filter_map(|(key, value)| {
            let key = key.into_string().ok()?;
            relevant
                .iter()
                .any(|prefix| key.starts_with(prefix))
                .then_some((key, value))
        })
        .collect();
    let configuration: BTreeMap<_, _> = settings
        .iter()
        .map(|(key, value)| (key, value.as_encoded_bytes()))
        .collect();
    let manifest = crate::boot::release_digest(release)?;
    Ok(sha256_hex(&serde_json::to_vec(&(
        opening,
        manifest,
        configuration,
    ))?))
}
