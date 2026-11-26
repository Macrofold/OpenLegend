//! Materialize a new source as a named native scenario. The ordinary checkpoint
//! confirmation, pre-load save, receipt and runtime replacement perform the load.
use super::{
    LabError, LabOperator, LabRuntime,
    prepare::{self, Source},
    scenario::Snapshot,
};
use crate::{
    access_http::{access_failure, refusal},
    authority::{Capability, assert_saved_grant},
    creation::bundle::Bundle,
    store::{StoreError, checkpoint::exchange::private_stage},
};
use axum::{
    Extension, Json, Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::post,
};
use serde::Deserialize;
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Selection {
    id: Uuid,
    source: Source,
}
pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new().route("/scenarios/start", post(start))
}
async fn start(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Selection>,
) -> Response {
    if let Err(e) = op.current(Capability::Save, || ()).and_then(|_| {
        op.authority
            .current_recall_operator(&op.scope, true, |_| ())
    }) {
        return access_failure(e);
    }
    let writer = op.clone();
    let id = input.id;
    match tokio::spawn(async move { prepare(&lab, &writer, input).await }).await {
        Ok(Ok(())) => op
            .current(Capability::Save, || {
                Json(serde_json::json!({"ok":true,"id":id})).into_response()
            })
            .unwrap_or_else(access_failure),
        outcome => {
            if let Ok(Err(error)) = outcome {
                eprintln!("Lab scenario source unavailable: {error}");
            }
            refusal(
                StatusCode::CONFLICT,
                "source-unavailable",
                "Check the selected world, paused game, current player permissions and reviewed opening.",
            )
        }
    }
}

async fn prepare(lab: &LabRuntime, op: &LabOperator, input: Selection) -> Result<(), LabError> {
    let (_files, root) = lab.checkpoints.hold_files().await;
    let id = input.id.to_string();
    let target = root.join(&id);
    let world = op.scope.scope.world_id.clone();
    if target.try_exists()? {
        let (db, dir, key, selected) = (
            lab.game.store.clone(),
            target.clone(),
            id.clone(),
            world.clone(),
        );
        let known = tokio::task::spawn_blocking(move || {
            db.transfer_scenario_files(&dir, None, &selected, &key)
        })
        .await??;
        if !known.snapshot.source_start
            || (input.source == Source::Game) != known.snapshot.origin.is_some()
        {
            return Err(StoreError::StaleCut.into());
        }
        op.host
            .for_source(known.snapshot.origin.as_ref())
            .await?
            .check()?;
        lab.game
            .store
            .complete_checkpoint_assets(&world, &id)
            .await?;
        return Ok(());
    }
    let root_copy = root.to_owned();
    let stage = tokio::task::spawn_blocking(move || private_stage(&root_copy)).await??;
    let result = materialize(lab, op, root, &stage, &target, &id, input.source).await;
    let _ = tokio::fs::remove_dir_all(stage).await;
    result
}

async fn materialize(
    lab: &LabRuntime,
    op: &LabOperator,
    root: &Path,
    stage: &Path,
    target: &Path,
    id: &str,
    source: Source,
) -> Result<(), LabError> {
    let host = lab.setup.0.upgrade().ok_or(StoreError::Cancelled)?;
    let startup = &lab.setup.1;
    let (input, installation, origin, label) = match source {
        Source::Opening => {
            let checksum = std::env::var("OPEN_LEGEND_LAB_OPENING_SHA256")?;
            let bundle = Bundle::open(
                &lab.game.store,
                host.release.join("opening.json"),
                &checksum,
            )?;
            if bundle.account() != op.scope.scope.account_id
                || bundle.actor() != op.scope.scope.actor_id
            {
                return Err(StoreError::Cancelled.into());
            }
            (
                bundle.checkpoint_directory(),
                bundle.prepare(&lab.game.store).await?,
                None,
                "Reviewed opening",
            )
        }
        Source::Game => {
            for capability in [Capability::Play, Capability::Inspect, Capability::Save] {
                op.host
                    .host
                    .current(&op.host.scope, capability, false, |_, _| ())?;
            }
            let host_scope = op.host.scope.scope.clone();
            if host_scope.actor_id != op.scope.scope.actor_id
                || host_scope.account_id != op.scope.scope.account_id
            {
                return Err(StoreError::Cancelled.into());
            }
            let raw = Uuid::new_v4().to_string();
            let (installation, proof) =
                prepare::read_snapshot(&host, startup, stage.to_owned(), raw.clone(), host_scope)
                    .await?;
            (
                stage.join(raw),
                installation,
                Some(proof),
                "Paused game snapshot",
            )
        }
    };
    let world = op.scope.scope.world_id.clone();
    if installation.head.world_id != world {
        return Err("The selected source belongs to a different native world".into());
    }
    let approved = op.host.for_source(origin.as_ref()).await?;
    let grants = (source == Source::Opening).then_some(installation.construction_grants);
    startup
        .validate_first_opening(
            &host.release,
            installation.opening,
            op.scope.scope.account_id.clone(),
            op.scope.scope.actor_id.clone(),
            grants,
        )
        .await?;
    drop(installation.history);
    let namespace = lab
        .game
        .store
        .scenario_namespace()
        .ok_or(StoreError::InvalidRecord)?;
    let scope = op.scope.scope.clone();
    let snapshot = lab
        .game
        .store
        .operational(move |tx| {
            Box::pin(async move {
                assert_saved_grant(tx, &scope, "save").await?;
                Snapshot::starting(tx, namespace, origin).await
            })
        })
        .await?;
    let sequence = lab
        .game
        .store
        .claim_scenario_start(root.to_owned(), world.clone(), id)
        .await?;
    let staged = stage.to_path_buf();
    let writer = lab.game.store.clone();
    let selected = world.clone();
    let key = id.to_owned();
    let result = async {
        let generated = tokio::task::spawn_blocking(move || {
            let child = private_stage(&staged)?;
            writer
                .write_scenario_start(&input, &child, snapshot, &selected, &key, label, sequence)?;
            Ok::<PathBuf, StoreError>(child)
        })
        .await??;
        let scope=op.scope.for_lab_source(approved);
        op.authority.current(&scope,Capability::Save,false,|_,_| std::fs::rename(generated,target))??;
        let out = root.to_owned();
        tokio::task::spawn_blocking(move || std::fs::File::open(out)?.sync_all()).await??;
        lab.game
            .store
            .complete_checkpoint_assets(&world, id)
            .await?;
        Ok::<(), LabError>(())
    }
    .await;
    if result.is_err() && !target.try_exists()? {
        let _ = lab
            .game
            .store
            .release_checkpoint_assets(&world, id, true)
            .await;
    }
    result
}
