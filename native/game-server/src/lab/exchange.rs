//! A private exchange directory is addressed only by immutable checkpoint UUID.
//! The source database retains the proof needed to reopen protected content.
use super::{LabOperator, LabRuntime, fields::exchange::Values, library::scoped_owner, scenario};
use crate::{
    access_http::{access_failure, refusal},
    authority::{Capability, assert_saved_grant},
    store::{
        Store, StoreError, StoreResult,
        checkpoint::exchange::{copy_digest, private_stage},
    },
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
    fs::{self, File, OpenOptions},
    io::{BufWriter, Write},
    os::unix::fs::OpenOptionsExt,
    path::{Path, PathBuf},
    sync::Arc,
};
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Selection {
    id: Uuid,
}
pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/scenarios/export", post(export))
        .route("/scenarios/import", post(import))
}
async fn export(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Selection>,
) -> Response {
    execute(lab, op, input.id, true).await
}
async fn import(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Selection>,
) -> Response {
    execute(lab, op, input.id, false).await
}
async fn execute(lab: Arc<LabRuntime>, op: LabOperator, id: Uuid, export: bool) -> Response {
    if let Err(error) = op.current(Capability::Save, || ()).and_then(|_| {
        op.authority
            .current_recall_operator(&op.scope, true, |_| ())
    }) {
        return access_failure(error);
    }
    let write = op.clone();
    // File/SQL publication outlives the initiating browser. A retry uses the
    // immutable source ID and matches the recorded digest before publication.
    match tokio::spawn(async move { transfer(&lab, &write, id, export).await }).await {
        Ok(Ok(())) => op
            .current(Capability::Save, || {
                Json(serde_json::json!({"ok":true,"id":id})).into_response()
            })
            .unwrap_or_else(access_failure),
        _ => refusal(
            StatusCode::CONFLICT,
            "scenario-unavailable",
            "The scenario files, source permissions, or privacy record could not be verified.",
        ),
    }
}
async fn transfer(lab: &LabRuntime, op: &LabOperator, id: Uuid, export: bool) -> StoreResult<()> {
    let (_lease, saves) = lab.checkpoints.hold_files().await;
    let exchange = saves
        .parent()
        .ok_or(StoreError::InvalidRecord)?
        .join("exchange");
    let (source, destination) = if export {
        (saves.to_owned(), exchange)
    } else {
        (exchange, saves.to_owned())
    };
    let destination_id = destination.join(id.to_string());
    let stage_root = destination.clone();
    let stage = tokio::task::spawn_blocking(move || private_stage(&stage_root))
        .await
        .map_err(|_| StoreError::Cancelled)??;
    let result = transfer_under_lease(lab, op, &source, &stage, &destination_id, id, export).await;
    let _ = tokio::fs::remove_dir_all(stage).await;
    result
}
async fn transfer_under_lease(
    lab: &LabRuntime,
    op: &LabOperator,
    source: &Path,
    stage: &Path,
    destination: &Path,
    id: Uuid,
    export: bool,
) -> StoreResult<()> {
    let world_id = op.scope.scope.world_id.clone();
    let db = lab.game.store.clone();
    let root = source.join(id.to_string());
    let source_proof =
        tokio::task::spawn_blocking(move || db.scenario_origin(&root, &world_id, &id.to_string()))
            .await
            .map_err(|_| StoreError::Cancelled)??;
    let mut selected = op.clone();
    selected.host = op
        .host
        .for_source(source_proof.as_ref())
        .await
        .map_err(|_| StoreError::Cancelled)?;
    selected.scope = Arc::new(op.scope.for_lab_source(selected.host.clone()));
    let op = &selected;
    let owner = scoped_owner(op)?;
    let epoch = lab
        .authority
        .evidence_epoch()
        .map_err(|_| StoreError::Cancelled)?;
    let world = op.scope.scope.world_id.clone();
    let scope = op.scope.scope.clone();
    let permitted_owner = owner.clone();
    let current=lab.game.store.read_operational(move|tx|Box::pin(async move{
        assert_saved_grant(tx,&scope,"save").await?;
        super::prepare::ledger(tx,&scope).await?;
        let current=scenario::privacy_cut(tx).await?;
        if !export {
            tx.query_opt("SELECT 1 FROM cognition_lab.scenario_exports WHERE id=$1::text::uuid AND owner=$2 AND privacy_cut=$3",
                &[&id.to_string(),&permitted_owner,&current]).await?.ok_or(StoreError::Cancelled)?;
        }
        Ok(current)
    })).await?;
    let db = lab.game.store.clone();
    let input = source.join(id.to_string());
    let staged = stage.to_owned();
    let world_id = world.clone();
    let verified = tokio::task::spawn_blocking(move || {
        db.transfer_scenario_files(&input, Some(&staged), &world_id, &id.to_string())
    })
    .await
    .map_err(|_| StoreError::Cancelled)??;
    if Some(verified.snapshot.namespace) != lab.game.store.scenario_namespace()
        || verified.snapshot.privacy != current
    {
        return Err(StoreError::Cancelled);
    }
    let hold_ref=verified.snapshot.holds;
    let budget=lab.game.host.budget().clone();
    let (holds,custody)=lab.game.store.read_operational(move|tx|Box::pin(async move{super::holds::read(tx,hold_ref,&budget).await})).await?;
    let holds=Arc::new(openlegend_simulation::runtime::NativeValueHolds::new(holds,custody).map_err(|_|StoreError::InvalidRecord)?);
    let permitted_holds=holds.clone();
    let data = Values::read(
        &lab.game.store,
        verified.snapshot.fields,
        owner.clone(),
        lab.game.host.budget().clone(),
    )
    .await?;
    let selection = data.clone();
    let scope = op.scope.scope.clone();
    if !lab
        .game
        .world
        .capture(move |session| {
            for hold in permitted_holds.rows() {
                if !session.intelligence_person_current(&scope.account_id,&scope.actor_id,&hold.actor_id,hold.life)? {return Ok(false)}
            }
            selection.permitted(session,&scope)
        })
        .await
        .map_err(|_| StoreError::Cancelled)?
    {
        return Err(StoreError::Cancelled);
    }
    let file = stage.join("fields.json");
    let input = source.join(id.to_string()).join("fields.json");
    let rendered = data.clone();
    let fields = tokio::task::spawn_blocking(move || -> StoreResult<String> {
        let out = OpenOptions::new()
            .create_new(true)
            .write(true)
            .mode(0o600)
            .open(&file)
            .map_err(|_| StoreError::InvalidRecord)?;
        let mut out = BufWriter::new(out);
        #[derive(serde::Serialize)]
        struct Companions<'a>{
            #[serde(flatten)]
            fields:&'a Values,
            holds:&'a [openlegend_simulation::runtime::NativeValueHold],
        }
        serde_json::to_writer(&mut out, &Companions{fields:&rendered,holds:holds.rows()}).map_err(|_| StoreError::InvalidRecord)?;
        out.flush().map_err(|_| StoreError::InvalidRecord)?;
        out.get_ref()
            .sync_all()
            .map_err(|_| StoreError::InvalidRecord)?;
        let length = usize::try_from(
            out.get_ref()
                .metadata()
                .map_err(|_| StoreError::InvalidRecord)?
                .len(),
        )
        .map_err(|_| StoreError::Capacity)?;
        drop(out);
        let digest = copy_digest(&file, None, length)?;
        if !export {
            if copy_digest(&input, None, length)? != digest {
                return Err(StoreError::InvalidRecord);
            }
            fs::remove_file(&file).map_err(|_| StoreError::InvalidRecord)?;
        }
        Ok(digest)
    })
    .await
    .map_err(|_| StoreError::Cancelled)??;
    let fingerprint =
        openlegend_simulation::encoding::json_record_digest(&(verified.identity, fields))
            .map_err(|_| StoreError::InvalidRecord)?;
    let scope = op.scope.scope.clone();
    let final_operator = op.clone();
    lab.game.store.operational(move |tx|Box::pin(async move{
        for capability in ["create","inspect","save"] {assert_saved_grant(tx,&scope,capability).await?;}
        if current!=scenario::privacy_cut(tx).await? {return Err(StoreError::StaleCut)}
        let key=id.to_string();
        if export{
            tx.execute("INSERT INTO cognition_lab.scenario_exports(id,owner,fingerprint,privacy_cut)
                VALUES($1::text::uuid,$2,$3,$4) ON CONFLICT DO NOTHING",&[&key,&owner,&fingerprint,&current]).await?;
        }
        tx.query_opt("SELECT 1 FROM cognition_lab.scenario_exports WHERE id=$1::text::uuid AND owner=$2 AND fingerprint=$3 AND privacy_cut=$4",
            &[&key,&owner,&fingerprint,&current]).await?.ok_or(StoreError::Cancelled)?;
        Store::copy_scenario_assets(tx,&scope.world_id,&key,export).await?;
        final_operator.current(Capability::Save,||()).map_err(|_|StoreError::Cancelled)?;
        Ok(())
    })).await.map_err(|_|StoreError::Cancelled)?;
    // A pre-existing target must be byte-identical. Keep all files private
    // until the complete transfer and current authority have been checked.
    if destination
        .try_exists()
        .map_err(|_| StoreError::InvalidRecord)?
    {
        verify_existing(&lab.game.store, stage, destination, &world, id, export).await?;
    } else {
        let _barrier = lab
            .saves
            .enter_protected()
            .await
            .map_err(|_| StoreError::Cancelled)?;
        let scope = op.scope.scope.clone();
        if !lab
            .game
            .world
            .capture(move |session| data.permitted(session, &scope))
            .await
            .map_err(|_| StoreError::Cancelled)?
        {
            return Err(StoreError::Cancelled);
        }
        if epoch
            != lab
                .authority
                .evidence_epoch()
                .map_err(|_| StoreError::Cancelled)?
        {
            return Err(StoreError::Cancelled);
        }
        op.current(Capability::Save, || fs::rename(stage, destination))
            .map_err(|_| StoreError::Cancelled)?
            .map_err(|_| StoreError::InvalidRecord)?;
        let parent = destination
            .parent()
            .ok_or(StoreError::InvalidRecord)?
            .to_owned();
        tokio::task::spawn_blocking(move || File::open(parent)?.sync_all())
            .await
            .map_err(|_| StoreError::Cancelled)?
            .map_err(|_| StoreError::InvalidRecord)?;
    }
    Ok(())
}
async fn verify_existing(
    store: &Arc<Store>,
    stage: &Path,
    destination: &Path,
    world: &str,
    id: Uuid,
    export: bool,
) -> StoreResult<()> {
    let store = store.clone();
    let stage = stage.to_owned();
    let target = destination.to_owned();
    let world = world.to_owned();
    tokio::task::spawn_blocking(move || {
        let current = store.transfer_scenario_files(&target, None, &world, &id.to_string())?;
        let bytes = fs::metadata(stage.join("metadata.json"))
            .map_err(|_| StoreError::InvalidRecord)?
            .len() as usize;
        if current.identity != copy_digest(&stage.join("metadata.json"), None, bytes)? {
            return Err(StoreError::StaleCut);
        }
        if export {
            let path = stage.join("fields.json");
            let bytes = fs::metadata(&path)
                .map_err(|_| StoreError::InvalidRecord)?
                .len() as usize;
            if copy_digest(&target.join("fields.json"), None, bytes)?
                != copy_digest(&path, None, bytes)?
            {
                return Err(StoreError::StaleCut);
            }
        }
        Ok(())
    })
    .await
    .map_err(|_| StoreError::Cancelled)?
}
