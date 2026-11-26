//! Compare one historically authorized request. The ordinary spending ledger
//! owns every transfer. The optional result is deleted with its source capture.
use super::{Inspection, LabOperator, LabRuntime};
use crate::{
    access_http::{access_failure, refusal},
    authority::{AccessError, Capability},
    decision_dispatch::{CallFailure, ProviderDisclosure, decode_provider_bound},
    decision_render::provider,
    player_http::diagnostics::comparison_source,
    store::{StoreError, diagnostics::SavedStageCapture},
    world::{NpcDisclosureTurn, WorldError},
};
use axum::{
    Extension, Json, Router,
    body::{Body, Bytes},
    extract::State,
    http::{StatusCode, header},
    response::{IntoResponse, Response},
    routing::post,
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::ByteBudget,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{oneshot, watch};
use uuid::Uuid;

const OUTPUT_BYTES: usize = 500_000;
pub(super) const SCHEMA:&str="CREATE TABLE IF NOT EXISTS cognition_lab.request_comparisons (
    id text PRIMARY KEY, source text NOT NULL REFERENCES intelligence_calls(id) ON DELETE CASCADE,
    digest text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), result text CHECK(octet_length(result)<=500000));
    CREATE INDEX IF NOT EXISTS lab_comparison_created ON cognition_lab.request_comparisons(created_at DESC,id DESC);
    CREATE INDEX IF NOT EXISTS lab_comparison_source ON cognition_lab.request_comparisons(source,created_at DESC,id DESC)";
pub(super) fn router() -> Router<Arc<LabRuntime>> {
    Router::new()
        .route("/decisions/reruns", post(issue))
        .route("/decisions/reruns/history", post(history))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    stage_id: String,
    request_id: Uuid,
    state_override: Option<String>,
}

struct Historical {
    lab: Arc<LabRuntime>,
    op: LabOperator,
    capture: Arc<SavedStageCapture>,
    streaming: bool,
}

impl Historical {
    fn disclose<T>(
        &self,
        turn: NpcDisclosureTurn<'_>,
        expose: impl FnOnce() -> T,
    ) -> Result<T, CallFailure> {
        self.lab
            .authority
            .current_private_view(&self.op.scope, true, |scope, _| {
                turn.historical_stage(scope, &self.capture, expose)
            })
            .map_err(CallFailure::Authority)?
            .map_err(CallFailure::World)?
            .ok_or(CallFailure::Stale("historical-source-changed"))
    }
}
impl ProviderDisclosure for Historical {
    fn signed_source(&self) -> Option<&crate::authority::AuthorizedScope> {
        Some(&self.op.scope)
    }
    fn allows_stream(&self) -> bool {
        self.streaming
    }
    fn start(
        &self,
        turn: NpcDisclosureTurn<'_>,
        stop: &watch::Receiver<bool>,
        start: &mut dyn FnMut(),
    ) -> Result<(), CallFailure> {
        if *stop.borrow() {
            return Err(CallFailure::Cancelled);
        }
        self.disclose(turn, start)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultView<'a> {
    ok: bool,
    comparison_id: Option<&'a str>,
    attempt_id: Option<&'a str>,
    recorded_at: Option<&'a str>,
    status: &'a str,
    output: Option<&'a serde_json::value::RawValue>,
}

async fn issue(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(input): Json<Request>,
) -> Response {
    if input.stage_id.len() > 512 || input.stage_id.is_empty() {
        return access_failure(AccessError::Forbidden);
    }
    if !op.present().unwrap_or(false) {
        return access_failure(AccessError::Changed);
    }
    if let Err(e) = op.current(Capability::Create, || ()) {
        return access_failure(e);
    }
    let Some(controls) = lab.decisions.lab_controls() else {
        return access_failure(AccessError::Availability);
    };
    let Ok(slot) = controls.comparison.clone().try_acquire_owned() else {
        return access_failure(AccessError::Busy);
    };
    let (send, receive) = oneshot::channel();
    let owner = lab.clone();
    if lab
        .decisions
        .start_job(async move {
            let _slot = slot;
            let response = run(owner, op, input).await;
            let _ = send.send(response);
        })
        .is_err()
    {
        return access_failure(AccessError::Availability);
    }
    receive
        .await
        .unwrap_or_else(|_| access_failure(AccessError::Availability))
}

async fn run(lab: Arc<LabRuntime>, op: LabOperator, input: Request) -> Response {
    let source_id = input.stage_id;
    let (mut selected, cut) = match comparison_source(&lab, &op, source_id.clone()).await {
        Ok(v) => v,
        Err(WorldError::Access(e)) => return access_failure(e),
        Err(_) => return access_failure(AccessError::Availability),
    };
    let Some(capture) = selected.stage_capture.take().map(Arc::new) else {
        return unavailable();
    };
    let Some(original) = selected.attempts.first() else {
        return unavailable();
    };
    let identity = (op.scope.scope.recovery_fields(), input.request_id);
    let Ok(encoded) = json_record(&identity) else {
        return unavailable();
    };
    let id = format!("lab-request-{}", sha256_hex(encoded.as_bytes()));
    let comparison = match lab.decisions.prepare_comparison(
        original,
        &capture,
        id.clone(),
        input.state_override,
        cut,
    ) {
        Ok(v) => v,
        Err(_) => {
            return refusal(
                StatusCode::CONFLICT,
                "comparison-input-unavailable",
                "The request or its model configuration is no longer available for this comparison.",
            );
        }
    };
    drop(selected);
    let source = Arc::new(Historical {
        lab: lab.clone(),
        op: op.clone(),
        capture,
        streaming: comparison.streaming,
    });
    let Ok(turn) = lab.game.world.npc_disclosure_turn().await else {
        return unavailable();
    };
    if source.disclose(turn, || ()).is_err() {
        return unavailable();
    }
    let digest = comparison.call.context_digest.clone();
    let table_id = id.clone();
    let source_key = format!("rust-stage:{source_id}");
    // A retry reuses one durable operation ID, including after a lost response.
    // Keep the existing bounded stage history's count, with each result charged at read.
    let stored=lab.game.store.operational(move|tx|Box::pin(async move{
        let inserted=tx.execute("INSERT INTO cognition_lab.request_comparisons(id,source,digest)
            SELECT $1,id,$3 FROM intelligence_calls WHERE id=$2 ON CONFLICT(id) DO NOTHING",
            &[&table_id,&source_key,&digest]).await?;
        if inserted==1{
            tx.execute("DELETE FROM cognition_lab.request_comparisons WHERE id IN
                (SELECT id FROM cognition_lab.request_comparisons ORDER BY created_at DESC,id DESC OFFSET 1000)",&[]).await?;
            return Ok(true)
        }
        let same=tx.query_opt("SELECT 1 FROM cognition_lab.request_comparisons WHERE id=$1 AND source=$2 AND digest=$3",
            &[&table_id,&source_key,&digest]).await?.is_some();
        if !same{return Err(StoreError::StaleCut)}
        Ok(false)
    })).await;
    match stored {
        Err(_) => {
            return refusal(
                StatusCode::CONFLICT,
                "comparison-replaced",
                "The source or this comparison request changed.",
            );
        }
        Ok(true) => {
            let budget = lab.game.host.budget().clone();
            let parse = budget.clone();
            let judgment = comparison.judgment;
            let shared = comparison.shared;
            let billing = comparison.billing;
            let disclosure = Historical {
                lab: lab.clone(),
                op: op.clone(),
                capture: source.capture.clone(),
                streaming: source.streaming,
            };
            let (_owner, stop) = watch::channel(false);
            let result = lab
                .decisions
                .provider_dispatch()
                .compare(
                    comparison.call,
                    disclosure,
                    source.op.clone(),
                    stop,
                    decode_provider_bound(billing, judgment, budget, move |v| {
                        let text = if judgment {
                            let answers = v
                                .get("answers")
                                .filter(|v| v.is_object())
                                .ok_or(CallFailure::Invalid)?;
                            crate::wire::encode(answers, b"", b"", &parse)
                                .map_err(|_| CallFailure::DecodeBusy)?
                        } else if shared {
                            crate::wire::encode(v,b"",b"",&parse).map_err(|_|CallFailure::DecodeBusy)?
                        } else if billing.is_some() {
                            match provider::macrofold_text(v).map_err(|_| CallFailure::Invalid)? {
                                provider::TextResult::Refused => return Err(CallFailure::Invalid),
                                provider::TextResult::Complete(value) => {
                                    encode_text(value, &parse)?
                                }
                            }
                        } else {
                            encode_text(
                                &provider::direct_text(v, &parse)
                                    .map_err(|_| CallFailure::Invalid)?
                                    .text,
                                &parse,
                            )?
                        };
                        if text.len() > OUTPUT_BYTES {
                            return Err(CallFailure::DecodeBusy);
                        }
                        Ok(text)
                    }),
                )
                .await;
            if let Ok(text) = result {
                let save = id.clone();
                if lab.game.store.operational(move|tx|Box::pin(async move{
                    let output=std::str::from_utf8(&text).map_err(|_|StoreError::InvalidRecord)?;
                    tx.execute("UPDATE cognition_lab.request_comparisons SET result=$2 WHERE id=$1 AND result IS NULL",&[&save,&output]).await?;
                    Ok(())
                })).await.is_err(){return access_failure(AccessError::Availability)}
            }
        }
        Ok(false) => {}
    }
    result_body(source, source_id, Some(id), None)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct History {
    stage_id: String,
    before: Option<String>,
}

async fn history(
    State(lab): State<Arc<LabRuntime>>,
    Extension(op): Extension<LabOperator>,
    Json(query): Json<History>,
) -> Response {
    if query.stage_id.is_empty()
        || query.stage_id.len() > 512
        || query.before.as_ref().is_some_and(|id| id.len() > 128)
    {
        return unavailable();
    }
    let Ok((mut selected, _)) = comparison_source(&lab, &op, query.stage_id.clone()).await else {
        return unavailable();
    };
    let Some(capture) = selected.stage_capture.take() else {
        return unavailable();
    };
    let source = Arc::new(Historical {
        lab,
        op,
        capture: Arc::new(capture),
        streaming: false,
    });
    result_body(source, query.stage_id, None, query.before)
}

fn result_body(
    source: Arc<Historical>,
    stage_id: String,
    exact: Option<String>,
    before: Option<String>,
) -> Response {
    let body = async move {
        let lab = &source.lab;
        let budget = lab.game.host.budget().clone();
        let original = format!("rust-stage:{stage_id}");
        let bytes=lab.game.store.read_operational(move|tx|Box::pin(async move{
            let (_transfer,rows)=crate::store::admitted_query(tx,
                "SELECT c.result,a.status,a.receipt::json->>'completionUncertain' AS uncertain,
                   a.receipt::json->>'transportStarted' AS sent,c.id,c.created_at::text,
                   c.id||':attempt:0:comparison' AS attempt FROM cognition_lab.request_comparisons c
                 LEFT JOIN attempts a ON a.id=c.id||':attempt:0:comparison'
                 WHERE c.source=$1 AND ($2::text IS NULL OR c.id=$2)
                   AND ($3::text IS NULL OR (c.created_at,c.id)<(SELECT created_at,id FROM cognition_lab.request_comparisons WHERE source=$1 AND id=$3))
                 ORDER BY c.created_at DESC,c.id DESC LIMIT 1",&[&original,&exact,&before],&budget).await?;
            let mut view=ResultView{ok:true,comparison_id:None,attempt_id:None,recorded_at:None,status:"no-comparisons",output:None};
            if let Some(row)=rows.first(){
                let raw:Option<&str>=row.try_get(0)?;
                view.output=raw.map(serde_json::from_str).transpose().map_err(|_|StoreError::InvalidRecord)?;
                view.comparison_id=row.try_get(4)?;
                view.recorded_at=row.try_get(5)?;
                view.attempt_id=row.try_get(6)?;
                view.status=if raw.is_some(){"received"}else{match (row.try_get::<_,Option<&str>>(1)?,row.try_get::<_,Option<&str>>(2)?,row.try_get::<_,Option<&str>>(3)?){
                    (Some("reserved"),_,_)=>"pending",
                    (Some("uncertain"),_,_)|(_,Some("true"),_)=>"completion-uncertain",
                    (_,_,Some("true"))=>"output-unavailable",_=>"not-dispatched"
                }};
            }
            crate::wire::encode(&view,b"",b"",&budget).map_err(|_|StoreError::Capacity)
        })).await.map_err(|_|AccessError::Changed)?;
        let turn = lab
            .game
            .world
            .npc_disclosure_turn()
            .await
            .map_err(|_| AccessError::Availability)?;
        // Withhold the old result when a correction wins the race to the body
        // poll. A safe refusal frame lets the client remove its previous view.
        Ok(source.disclose(turn, || bytes).unwrap_or_else(|_| Bytes::from_static(
            br#"{"ok":false,"code":"comparison-source-unavailable","message":"The original source changed. This comparison is unavailable."}"#
        )))
    };
    (
        [
            (header::CONTENT_TYPE, "application/json"),
            (header::CACHE_CONTROL, "no-store"),
        ],
        Body::new(Inspection(Some(Box::pin(body)))),
    )
        .into_response()
}
fn encode_text(text: &str, budget: &ByteBudget) -> Result<Bytes, CallFailure> {
    if text.len() > OUTPUT_BYTES {
        return Err(CallFailure::DecodeBusy);
    }
    crate::wire::encode(text, b"", b"", budget).map_err(|_| CallFailure::DecodeBusy)
}
fn unavailable() -> Response {
    refusal(
        StatusCode::CONFLICT,
        "comparison-source-unavailable",
        "The exact request is unavailable under the current character, timeline and source permissions.",
    )
}
