//! Authenticate the host session and bind it to the independent Lab grant.
use super::{
    Availability, HOST, HostPermit, LabError, LabOperator, LabRuntime, Supervisor, decisions,
    host_permit, library, prepare,
};
use crate::{
    access_http::{access_failure, read_cookie, refusal},
    authority::{AccessError, Capability},
};
use axum::{
    Router,
    body::{Body, Bytes},
    extract::{Request, State},
    http::{HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::Response,
};
use http_body::{Body as HttpBody, Frame};
use std::{
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};
use tower::ServiceExt;

/// Recheck the host session when Hyper requests more bytes, including when
/// private streams refresh their ordinary Lab scope after the handler returns.
struct ScopedBody {
    body: Body,
    host: HostPermit,
}
impl HttpBody for ScopedBody {
    type Data = Bytes;
    type Error = axum::Error;
    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Bytes>, Self::Error>>> {
        if self.host.check().is_err() {
            return Poll::Ready(None);
        }
        let this = &mut *self;
        let frame = HOST.sync_scope(this.host.clone(), || {
            Pin::new(&mut this.body).poll_frame(cx)
        });
        this.host.publish(|| frame).unwrap_or(Poll::Ready(None))
    }
}

fn unavailable() -> Response {
    refusal(
        StatusCode::SERVICE_UNAVAILABLE,
        "lab-unavailable",
        "Prepare a separate Lab database and data directory, then reopen the Lab.",
    )
}

pub(super) async fn dispatch(State(supervisor): State<Supervisor>, request: Request) -> Response {
    if !lab_path(request.uri().path()) {
        return refusal(StatusCode::NOT_FOUND, "lab-route", "Unknown Lab operation.");
    }
    let token = match read_cookie(request.headers(), "ol_session") {
        Some(token) => token,
        None => return access_failure(AccessError::Session),
    };
    let tab = match tab(&request) {
        Some(tab) => tab,
        None => return access_failure(AccessError::Changed),
    };
    let host = supervisor.0.host.clone();
    let scope = match host.scope(token, tab).await {
        Ok(scope) => Arc::new(scope),
        Err(error) => return access_failure(error),
    };
    let permit = HostPermit {
        host,
        scope,
        imported: None,
        source_store: supervisor.0.game.store.clone(),
        origin: None,
    };
    if let Err(error) = permit.check() {
        return access_failure(error);
    }
    let mut state = supervisor.0.routes.subscribe();
    let selection = request.uri().path() == "/prepare";
    let (preparation, request) = if selection {
        if request.method() != axum::http::Method::POST {
            return refusal(
                StatusCode::METHOD_NOT_ALLOWED,
                "method",
                "Use the prepare action.",
            );
        }
        let Ok(body) = axum::body::to_bytes(request.into_body(), 256).await else {
            return refusal(
                StatusCode::BAD_REQUEST,
                "source",
                "Choose the starting world or the current game.",
            );
        };
        let Ok(input) = serde_json::from_slice::<prepare::Selection>(&body) else {
            return refusal(
                StatusCode::BAD_REQUEST,
                "source",
                "Choose the starting world or the current game.",
            );
        };
        (Some((input.source, permit.clone())), None)
    } else {
        (None, Some(request))
    };
    match supervisor.start(preparation) {
        Ok(false) if selection => {
            return refusal(
                StatusCode::CONFLICT,
                "lab-open",
                "The Lab is open or being prepared.",
            );
        }
        Err(_) => return unavailable(),
        _ => {}
    }
    let wait = async {
        let ready = state
            .wait_for(|v| matches!(v, Availability::Ready(_) | Availability::Failed(_)))
            .await
            .ok()?;
        Some(match &*ready {
            Availability::Ready(router) => Ok(router.clone()),
            Availability::Failed(reason) => Err(*reason),
            _ => unreachable!("waited for readiness"),
        })
    };
    let router = match tokio::time::timeout(std::time::Duration::from_secs(150), wait).await {
        Ok(Some(Ok(router))) => router,
        Ok(Some(Err(Some(reason)))) => {
            return refusal(StatusCode::SERVICE_UNAVAILABLE, "lab-unavailable", reason);
        }
        _ => return unavailable(),
    };
    let Some(request) = request else {
        use axum::response::IntoResponse;
        return axum::Json(serde_json::json!({"ok":true})).into_response();
    };
    if let Err(error) = permit.check() {
        return access_failure(error);
    }
    let response = HOST
        .scope(permit.clone(), router.oneshot(request))
        .await
        .expect("Router is infallible");
    response
}

fn tab(request: &Request) -> Option<String> {
    let id = request
        .headers()
        .get("x-ol-client")
        .and_then(|value| value.to_str().ok())
        .or_else(|| {
            request
                .uri()
                .query()?
                .split('&')
                .find_map(|entry| entry.strip_prefix("client="))
        })?;
    crate::player_http::valid_tab(id).then(|| id.to_owned())
}

fn lab_path(path: &str) -> bool {
    matches!(
        path,
        "/api/session"
            | "/api/state"
            | "/api/events"
            | "/api/embodiment"
            | "/api/control"
            | "/api/presence"
            | "/api/ai/usage"
            | "/api/operations"
            | "/api/history"
            | "/api/world-events"
            | "/api/world-events/sources"
            | "/api/chat"
            | "/api/chat/retry"
            | "/api/chat/receipt"
            | "/api/chat/preview"
            | "/api/ai/cancel"
            | "/api/player-interaction/availability"
            | "/api/command"
            | "/api/command/receipt"
            | "/api/expression"
            | "/api/actions"
            | "/api/saves/list"
            | "/api/saves/create"
            | "/api/saves/load"
            | "/api/saves/receipt"
            | "/api/saves/delete"
            | "/api/saves/settings"
            | "/api/saves/acknowledge"
            | "/api/god/editor/person"
            | "/api/god/editor/person/inventory"
            | "/api/god/editor/person/memory"
            | "/api/god/editor/person/save"
            | "/api/god/person"
            | "/api/god/editor/person/author"
            | "/api/mind"
            | "/api/mind/subjects"
            | "/api/knowledge"
            | "/api/memories"
            | "/api/activity-history"
            | "/api/god/memories"
            | "/api/god/mind"
            | "/api/god/knowledge"
            | "/api/god/mind/subjects"
            | "/api/god/activity-history"
            | "/api/god/forget-memory"
            | "/api/god/correct-memory"
            | "/api/attention"
            | "/api/action-attempt"
            | "/api/action-attempt/receipt"
            | "/api/god/triggers"
            | "/api/god/trigger"
            | "/api/god/intelligence"
            | "/api/god/intelligence-details"
            | "/api/god/intelligence-stage"
    ) || !path.starts_with("/api/")
}

pub(crate) async fn make_routes(
    ordinary: Router,
    runtime: Arc<LabRuntime>,
) -> Result<Router, LabError> {
    library::initialize(&runtime.game.store).await?;
    super::fields::initialize(&runtime.game.store).await?;
    let possible = runtime.game.store.read_operational(|tx|Box::pin(async move {
        Ok(tx.query_one("SELECT EXISTS (SELECT 1 FROM cognition_lab.fields f JOIN cognition_lab.field_selection s ON f.scenario=s.scenario WHERE f.since<=s.revision AND (f.until_revision IS NULL OR f.until_revision>s.revision))",&[]).await?.get::<_,bool>(0))
    })).await?;
    if let Some(control)=runtime.decisions.lab_controls(){control.set_fields_possible(possible);}
    super::holds::hydrate(&runtime).await?;
    let tools = decisions::router()
        .merge(super::scene::router())
        .merge(super::holds::router())
        .merge(library::router())
        .merge(super::exchange::router())
        .merge(super::start::router())
        .merge(super::fields::router())
        .with_state(runtime.clone());
    Ok(tools
        .merge(ordinary)
        .layer(middleware::from_fn_with_state(runtime, enter)))
}

async fn enter(
    State(runtime): State<Arc<LabRuntime>>,
    mut request: Request,
    next: Next,
) -> Response {
    let mut permit = match host_permit() {
        Ok(permit) => permit,
        Err(error) => return access_failure(error),
    };
    if let Some(source) = &runtime.imported {
        match source.admit(&permit).await {
            Ok(epoch) => {
                permit.imported = Some(epoch);
                permit.origin = Some(source.identity.clone());
            },
            Err(error) => return access_failure(error),
        }
    }
    let binding = permit.clone();
    let response = HOST
        .scope(permit.clone(), async move {
            let Some(host_token) = read_cookie(request.headers(), "ol_session") else {
                return access_failure(AccessError::Session);
            };
            let token = match runtime
                .authority
                .lab_token(&permit.host, &permit.scope, host_token)
                .await
            {
                Ok(token) => token,
                Err(error) => return access_failure(error),
            };
            let scope = match runtime
                .authority
                .scope(&token, permit.scope.scope.connection_id.clone())
                .await
            {
                Ok(scope) => Arc::new(scope),
                Err(error) => return access_failure(error),
            };
            let operator = LabOperator {
                presence: runtime.presence.clone(),
                scope,
                authority: runtime.authority.clone(),
                host: permit,
            };
            if let Err(error) = operator.current(Capability::Create, || ()) {
                return access_failure(error);
            }
            // Ordinary mutation routes validate their own submitted scope, including
            // receipt and beacon rules. Lab-only operations require the inspected cut.
            if !request.uri().path().starts_with("/api/") {
                let submitted = request
                    .headers()
                    .get("x-ol-scope")
                    .and_then(|v| v.to_str().ok());
                if submitted.is_none() || operator.scope.scope.key().ok().as_deref() != submitted {
                    return access_failure(AccessError::Changed);
                }
            }
            request.headers_mut().insert(
                header::COOKIE,
                HeaderValue::from_str(&format!("ol_session={token}")).expect("hex cookie"),
            );
            // Creator edits share the same Hold as model-only fields. No new
            // decision can start before the ordinary owner's edit has settled.
            let scenario_edit = request.method() == axum::http::Method::POST && matches!(
                request.uri().path(), "/scene/participation" | "/api/god/person" | "/api/god/editor/person/author" | "/api/god/editor/person/save"
                    | "/api/god/knowledge" | "/api/god/forget-memory" | "/api/god/correct-memory"
            );
            let _edit = if scenario_edit {
                let submitted = request.headers().get("x-ol-scope").and_then(|value| value.to_str().ok());
                if submitted.is_none() || submitted != operator.scope.scope.key().ok().as_deref() {
                    return access_failure(AccessError::Changed);
                }
                if let Err(error) = operator.authority.current(&operator.scope, Capability::Create, true, |_, _| ()) {
                    return access_failure(error);
                }
                let Some(controls) = runtime.decisions.lab_controls() else {
                    return access_failure(AccessError::Availability);
                };
                let _transition = controls.field_edit_guard().await;
                if !controls.hold_for_edit() {
                    return access_failure(AccessError::Busy);
                }
                Some(_transition)
            } else {
                None
            };
            let stimulus = request.method() == axum::http::Method::POST &&
                matches!(request.uri().path(),"/api/chat"|"/api/expression");
            request.extensions_mut().insert(operator.clone());
            if stimulus {
                return player_intent(&runtime,&operator,request,|request|next.run(request)).await;
            }
            next.run(request).await
        })
        .await;
    response.map(|body| {
        Body::new(ScopedBody {
            body,
            host: binding,
        })
    })
}

/// Both a new conversation and an explicit repeat use the game's real intake
/// while the Lab clock remains at the experiment's starting instant.
pub(super) async fn player_intent<F,Fut>(lab:&LabRuntime,op:&LabOperator,request:Request,send:F)->Response
where F:FnOnce(Request)->Fut,Fut:std::future::Future<Output=Response>{
    if request.headers().get("x-ol-scope").and_then(|v|v.to_str().ok())!=op.scope.scope.key().ok().as_deref(){
        return access_failure(AccessError::Changed);
    }
    if let Err(e)=op.authority.current(&op.scope,Capability::Play,true,|_,_|()) {return access_failure(e)}
    if lab.decisions.lab_controls().is_some_and(|c|c.run_active()){return send(request).await;}
    decisions::stimuli::during_intent(lab,op,async move{Ok(send(request).await)}).await
        .unwrap_or_else(|_|refusal(StatusCode::CONFLICT,"lab-clock-changed","The Lab clock or operator changed. Check the original stimulus receipt."))
}
