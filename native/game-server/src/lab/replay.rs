//! One explicit replay per fresh restore. The held note contains only a digest.
//! Ask the operator for the current selection and text to avoid replaying
//! private speech or restoring a previous timeline's signed target reference.
use super::{LabOperator, LabRuntime, missing, scoped_owner, unavailable};
use crate::{
    access_http::{access_failure, refusal},
    authority::Capability,
    npc::ChatRequest,
    store::JobRequest,
};
use axum::{
    body::{Body, Bytes},
    extract::{Extension, Path, State},
    http::{HeaderMap, Request, StatusCode},
    response::Response,
};
use std::sync::Arc;
use tower::ServiceExt;
use uuid::Uuid;

pub(super) async fn repeat(
    State(lab): State<Arc<LabRuntime>>,
    Extension(operator): Extension<LabOperator>,
    Path((id, load)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let authorize = || {
        operator
            .current(Capability::Inspect, || ())
            .and_then(|()| operator.current(Capability::Play, || ()))
    };
    if let Err(error) = authorize() {
        return access_failure(error);
    }
    let Ok(chat) = serde_json::from_slice::<ChatRequest>(&body) else {
        return refusal(
            StatusCode::BAD_REQUEST,
            "invalid-chat",
            "Supply the conversation you want to repeat.",
        );
    };
    if chat.request_id != load.to_string() || chat.candidate.is_some() {
        return refusal(
            StatusCode::BAD_REQUEST,
            "replay-request",
            "Use the current load request ID for this conversation.",
        );
    }
    let Some(reference) = chat.npc_id else {
        return refusal(
            StatusCode::BAD_REQUEST,
            "replay-target",
            "Select the current conversation recipient.",
        );
    };
    let Ok(owner) = scoped_owner(&operator) else {
        return unavailable();
    };
    let id = id.to_string();
    let source = lab
        .game
        .store
        .read_operational(move |tx| {
            Box::pin(async move {
                let row = tx.query_opt(
            "SELECT summary,source_checksum,stimulus_checksum FROM cognition_lab.retained_runs
             WHERE owner=$1 AND id=$2", &[&owner,&id],
        ).await?;
                row.map(|row| {
                    Ok((
                        super::summary(&row)?,
                        row.try_get::<_, Option<String>>("source_checksum")?,
                        row.try_get::<_, String>("stimulus_checksum")?,
                    ))
                })
                .transpose()
            })
        })
        .await;
    let (run, checksum, expected) = match source {
        Ok(Some(source)) => source,
        Ok(None) => return missing(),
        Err(_) => return unavailable(),
    };
    let restored = match lab
        .game
        .store
        .restored_checkpoint_source(&operator.scope.scope)
        .await
    {
        Ok(source) => source,
        Err(_) => return unavailable(),
    };
    if !restored.is_some_and(|(operation, slot, digest)| {
        operation == load
            && Some(slot) == run.origin_id
            && checksum.as_ref() == Some(&digest)
            && run.load_id != Some(load)
    }) {
        return refusal(
            StatusCode::CONFLICT,
            "fresh-restore-required",
            "Restore the same saved checkpoint before repeating this run.",
        );
    }
    let resolver = lab.references.clone();
    let budget = lab.game.host.budget().clone();
    let reader = operator.clone();
    let target = lab
        .game
        .world
        .capture(move |session| {
            Ok(reader.current(Capability::Play, || {
                resolver.resolve_speech_target(session, &reader.scope.scope, &reference, &budget)
            }))
        })
        .await;
    let target = match target {
        Ok(Ok(Ok(Some(target)))) => target,
        Ok(Ok(Ok(None))) => {
            return refusal(
                StatusCode::CONFLICT,
                "replay-target",
                "Select an available recipient in this timeline.",
            );
        }
        Ok(Err(error)) => return access_failure(error),
        _ => return unavailable(),
    };
    let stimulus = JobRequest {
        composer: None,
        text: chat.text.trimmed(),
        npc_id: target.id,
        volume: Some(chat.volume),
    };
    let Ok(digest) = super::stimulus_digest("chat", &stimulus) else {
        return unavailable();
    };
    if digest != expected {
        return refusal(
            StatusCode::CONFLICT,
            "different-stimulus",
            "The text, recipient or volume differs from the retained conversation.",
        );
    }
    if let Err(error) = authorize() {
        return access_failure(error);
    }
    let mut request = Request::post("/api/chat")
        .body(Body::from(body))
        .expect("fixed route");
    *request.headers_mut() = headers;
    // Normal chat rechecks the signed current target, interaction, clock,
    // spending admission and request ID. A lost acknowledgement uses the normal
    // chat receipt with this load UUID; advancing never generates a new ID.
    super::super::http::player_intent(&lab,&operator,request,|request| async {
        lab.ordinary.clone().oneshot(request).await.expect("Router is infallible")
    }).await
}
