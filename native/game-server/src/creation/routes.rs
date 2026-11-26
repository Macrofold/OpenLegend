use super::{
    ActivationIdentity, ActivationReceipt, Adoption, CreationError, CreationTarget,
    contracts::{Check, Start},
};
use axum::{
    Router,
    body::{Body, to_bytes},
    extract::{Request, State},
    http::{StatusCode, header},
    response::Response,
    routing::{get, post},
};
use openlegend_simulation::host::ByteReservation;
use serde::{Serialize, de::DeserializeOwned};
use std::{sync::Arc, time::Duration};

const BODY_BYTES: usize = 128 * 1024;
const BODY_TIME: Duration = Duration::from_secs(10);
const LANE_TIME: Duration = Duration::from_secs(5);

#[derive(Clone)]
struct Routes {
    target: Arc<CreationTarget>,
    adopt: Adoption,
}

impl CreationTarget {
    /// These internal routes are kept after adoption. Retained status reads
    /// remain available through the same authenticated destination owner.
    pub(crate) fn router(self: &Arc<Self>, adopt: Adoption) -> Router {
        Router::new()
            .route("/internal/world-creation/check", post(check))
            .route("/internal/world-creation/activate", post(activate))
            .route("/internal/world-creation/receipt", post(receipt))
            .route("/api/creation-host", get(status))
            .with_state(self.routes(adopt))
    }

    /// A pending destination still exposes the status used by the browser and
    /// permits a fresh adoption attempt on an explicit entry. Gameplay and
    /// authentication own these routes once the authoritative world is live.
    pub(crate) fn waiting_router(self: &Arc<Self>, adopt: Adoption) -> Router {
        Router::new()
            .route("/api/state", get(waiting))
            .route("/auth/login", get(waiting))
            .with_state(self.routes(adopt.clone()))
            .merge(self.router(adopt))
    }

    fn routes(self: &Arc<Self>, adopt: Adoption) -> Routes {
        Routes {
            target: self.clone(),
            adopt,
        }
    }
}

struct Intake<T> {
    source: String,
    request: T,
    _workspace: ByteReservation,
    _body: ByteReservation,
}

async fn decode<T: DeserializeOwned>(
    target: &CreationTarget,
    request: Request,
) -> Result<Intake<T>, Response> {
    let (parts, body) = request.into_parts();
    if parts.uri.query().is_some() {
        return Err(invalid());
    }
    let headers = parts.headers;
    if headers.contains_key(header::ORIGIN)
        || headers
            .get("sec-fetch-site")
            .is_some_and(|value| value == "cross-site")
    {
        return Err(refusal(
            StatusCode::FORBIDDEN,
            "origin",
            "Creation intake is available to configured source installations.",
        ));
    }
    if !headers
        .get(header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("application/json"))
    {
        return Err(refusal(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "content-type",
            "Use a JSON request.",
        ));
    }
    let key = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .ok_or_else(|| error(&CreationError::Forbidden))?;
    let source = target
        .permitted_source(key)
        .map_err(|problem| error(&problem))?
        .to_owned();
    let mut retained = target
        .intake_bytes
        .reserve(BODY_BYTES)
        .map_err(|_| busy())?;
    let workspace = target
        .store
        .creation_budget()
        .reserve(8 * BODY_BYTES)
        .map_err(|_| busy())?;
    let body = tokio::time::timeout(BODY_TIME, to_bytes(body, BODY_BYTES))
        .await
        .map_err(|_| invalid())?
        .map_err(|_| invalid())?;
    retained.resize(body.len()).map_err(|_| busy())?;
    let request = serde_json::from_slice(&body).map_err(|_| invalid())?;
    Ok(Intake {
        source,
        request,
        _workspace: workspace,
        _body: retained,
    })
}

async fn check(State(state): State<Routes>, request: Request) -> Response {
    let intake = match decode::<Check>(&state.target, request).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    if !intake.request.valid() {
        return invalid();
    }
    let Ok(_lane) = tokio::time::timeout(LANE_TIME, state.target.intake.lock()).await else {
        return busy();
    };
    match state.target.check(&intake.source, intake.request).await {
        Ok(value) => encode(&state.target, &value),
        Err(problem) => error(&problem),
    }
}

async fn activate(State(state): State<Routes>, request: Request) -> Response {
    let intake = match decode::<Start>(&state.target, request).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    let target = state.target.clone();
    let result = match tokio::spawn(async move {
        let Intake {
            source,
            request,
            _workspace,
            _body,
        } = intake;
        let _lane = tokio::time::timeout(LANE_TIME, target.intake.lock())
            .await
            .map_err(|_| CreationError::Busy)?;
        target.activate(&source, request).await
    })
    .await
    {
        Ok(result) => result,
        Err(_) => return error(&CreationError::Unavailable),
    };
    match result {
        Ok(value) => activation(&state, Some(value)).await,
        Err(problem) => error(&problem),
    }
}

async fn receipt(State(state): State<Routes>, request: Request) -> Response {
    let intake = match decode::<ActivationIdentity>(&state.target, request).await {
        Ok(value) => value,
        Err(response) => return response,
    };
    match state.target.receipt(&intake.source, intake.request).await {
        Ok(value) => activation(&state, value).await,
        Err(problem) => error(&problem),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Host<'a> {
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    world_id: Option<&'a str>,
    message: &'static str,
}

#[derive(Serialize)]
struct Activation<'a> {
    receipt: Option<&'a ActivationReceipt>,
    host: Host<'a>,
}

async fn activation(state: &Routes, receipt: Option<ActivationReceipt>) -> Response {
    let host = match &receipt {
        Some(receipt) => host_for(state, Some(receipt)).await,
        None => Host {
            status: "awaiting-creation",
            world_id: None,
            message: "No matching receipt is committed for this exact Start.",
        },
    };
    let mut response = encode(
        &state.target,
        &Activation {
            receipt: receipt.as_ref(),
            host,
        },
    );
    response.headers_mut().insert(
        header::CONNECTION,
        header::HeaderValue::from_static("close"),
    );
    response
}

async fn host_for<'a>(state: &Routes, receipt: Option<&'a ActivationReceipt>) -> Host<'a> {
    if let Some(receipt) = receipt {
        let (status, message) = if (state.adopt)(receipt.clone()).await {
            ("ready", "The created world is ready.")
        } else {
            (
                "host-unavailable",
                "The world was created. The game host is not available yet.",
            )
        };
        Host {
            status,
            world_id: Some(&receipt.world_id),
            message,
        }
    } else {
        Host {
            status: "awaiting-creation",
            world_id: None,
            message: "This host is prepared, but no world is running yet.",
        }
    }
}

async fn status(State(state): State<Routes>) -> Response {
    let receipt = match state.target.committed_activation().await {
        Ok(receipt) => receipt,
        Err(problem) => return error(&problem),
    };
    let data = host_for(&state, receipt.as_ref()).await;
    let ready = data.status == "ready";
    let mut response = encode(&state.target, &Status { data });
    if !ready && response.status().is_success() {
        *response.status_mut() = StatusCode::SERVICE_UNAVAILABLE;
    }
    response
}

async fn waiting(State(state): State<Routes>) -> Response {
    let receipt = match state.target.committed_activation().await {
        Ok(receipt) => receipt,
        Err(problem) => return error(&problem),
    };
    let data = host_for(&state, receipt.as_ref()).await;
    let mut response = encode(
        &state.target,
        &Unavailable {
            ok: false,
            code: "creation-host",
            message: data.message,
            data,
        },
    );
    if response.status().is_success() {
        *response.status_mut() = StatusCode::SERVICE_UNAVAILABLE;
    }
    response
}

#[derive(Serialize)]
struct Status<'a> {
    data: Host<'a>,
}

#[derive(Serialize)]
struct Unavailable<'a> {
    ok: bool,
    code: &'static str,
    data: Host<'a>,
    message: &'static str,
}

fn encode(target: &CreationTarget, value: &impl Serialize) -> Response {
    use axum::response::IntoResponse;
    match crate::wire::encode(value, b"", b"", target.store.creation_budget()) {
        Ok(bytes) => (
            [
                (header::CONTENT_TYPE, "application/json; charset=utf-8"),
                (header::CACHE_CONTROL, "no-store"),
            ],
            Body::from(bytes),
        )
            .into_response(),
        Err(_) => busy(),
    }
}

fn error(problem: &CreationError) -> Response {
    let (status, code) = match problem {
        CreationError::Busy => return busy(),
        CreationError::Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
        CreationError::Occupied => (StatusCode::CONFLICT, "occupied"),
        CreationError::StaleTarget => (StatusCode::CONFLICT, "stale-target"),
        CreationError::Conflict => (StatusCode::CONFLICT, "conflict"),
        CreationError::Expired => (StatusCode::CONFLICT, "expired"),
        CreationError::InvalidCandidate => (StatusCode::CONFLICT, "invalid-candidate"),
        CreationError::Unavailable | CreationError::Storage(_) | CreationError::Commit(_) => {
            (StatusCode::INTERNAL_SERVER_ERROR, "creation-host")
        }
    };
    refusal(status, code, problem.message())
}

fn invalid() -> Response {
    refusal(
        StatusCode::BAD_REQUEST,
        "invalid-input",
        "The request does not match the supported bounded creation input.",
    )
}

fn busy() -> Response {
    refusal(
        StatusCode::SERVICE_UNAVAILABLE,
        "overload",
        "Creation intake is busy. Try again shortly.",
    )
}

fn refusal(status: StatusCode, code: &str, message: &str) -> Response {
    crate::access_http::refusal(status, code, message)
}
