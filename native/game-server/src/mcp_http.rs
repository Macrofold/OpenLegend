//! Server-only MCP ingress. Browser cookies and authoring handles use a
//! different authority. See docs/world-agent-mcp.md for the finite contract.

mod tools;

use crate::world::HostedWorld;
use axum::{
    Router,
    body::{Body, Bytes, to_bytes},
    extract::{Request, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    response::{IntoResponse, Response},
    routing::any,
};
use openlegend_simulation::{
    encoding::{json_tree_allocation_bound, sha256_hex},
    host::{ByteBudget, ByteReservation},
};
use rmcp::transport::streamable_http_server::{
    StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
};
use std::{
    error::Error,
    sync::{Arc, Mutex},
    time::Duration,
};
use subtle::ConstantTimeEq;
use tokio::sync::{OwnedSemaphorePermit, Semaphore, watch};

const REQUEST_BYTES: usize = 128 * 1024;
const REPLY_BYTES: usize = 160 * 1024;
const DEADLINE: Duration = Duration::from_secs(10);
const CONCURRENT_REQUESTS: usize = 8;

pub(crate) struct Configuration {
    token_sha256: String,
    world_id: String,
    expires_at: chrono::DateTime<chrono::FixedOffset>,
    hosts: Vec<String>,
}

impl Configuration {
    pub(crate) fn read() -> Result<Option<Self>, Box<dyn Error + Send + Sync>> {
        use std::env::{VarError, var};
        fn setting(key: &str) -> Result<String, VarError> {
            match var(key) {
                Err(VarError::NotPresent) => Ok(String::new()),
                value => value,
            }
        }
        let token_sha256 = setting("OPEN_LEGEND_MCP_TOKEN_SHA256")?;
        let world_id = setting("OPEN_LEGEND_MCP_WORLD_ID")?;
        let expiry = setting("OPEN_LEGEND_MCP_EXPIRES_AT")?;
        let hosts = setting("OPEN_LEGEND_MCP_HOSTS")?;
        match setting("OPEN_LEGEND_MCP_WRITES")?.as_str() {
            "" | "false" => (),
            "true" => return Err("This Rust server does not have an MCP authoring owner".into()),
            _ => return Err("OPEN_LEGEND_MCP_WRITES must be true or false".into()),
        }
        if [&token_sha256, &world_id, &expiry, &hosts]
            .into_iter()
            .all(String::is_empty)
        {
            return Ok(None);
        }
        if token_sha256.len() != 64
            || !token_sha256
                .bytes()
                .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
            || world_id.is_empty()
            || world_id.len() > 200
            || !world_id
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        {
            return Err("MCP requires a SHA-256 token hash and exact world ID".into());
        }
        let expires_at = chrono::DateTime::parse_from_rfc3339(&expiry)
            .map_err(|_| "MCP expiry must be an ISO timestamp with timezone")?;
        let hosts: Vec<_> = hosts
            .split(',')
            .map(|host| host.trim().to_ascii_lowercase())
            .collect();
        if hosts.len() > 8 || hosts.iter().any(|host| !exact_host(host)) {
            return Err("MCP hosts must be exact host[:port] values".into());
        }
        Ok(Some(Self {
            token_sha256,
            world_id,
            expires_at,
            hosts,
        }))
    }

    fn authenticates(&self, headers: &HeaderMap) -> bool {
        let Some(token) = headers
            .get(header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .filter(|token| {
                (32..=512).contains(&token.len()) && !token.contains(char::is_whitespace)
            })
        else {
            return false;
        };
        sha256_hex(token.as_bytes())
            .as_bytes()
            .ct_eq(self.token_sha256.as_bytes())
            .into()
    }
}

fn exact_host(host: &str) -> bool {
    if host.is_empty()
        || host.contains(['*', '/', '\\', '@', '?', '#'])
        || host.contains(char::is_whitespace)
    {
        return false;
    }
    let Ok(url) = crate::network::parse_url(&format!("http://{host}")) else {
        return false;
    };
    url.host_str().is_some_and(|name| match url.port() {
        Some(port) => format!("{name}:{port}") == host,
        None => name == host,
    })
}

struct Access {
    config: Arc<Configuration>,
    world_matches: bool,
    stop: watch::Receiver<bool>,
}

impl Access {
    fn current(&self) -> bool {
        self.world_matches && !*self.stop.borrow() && chrono::Utc::now() < self.config.expires_at
    }
}

struct Connector {
    access: Arc<Access>,
    transport: StreamableHttpService<tools::WorldTools, LocalSessionManager>,
    slots: Arc<Semaphore>,
    budget: ByteBudget,
    request_owner: watch::Sender<()>,
}

pub(crate) fn router(
    config: Arc<Configuration>,
    world_id: &str,
    timeline: &str,
    world: Arc<HostedWorld>,
    language: Option<Arc<crate::language::LanguageProvider>>,
    budget: ByteBudget,
    stop: watch::Receiver<bool>,
    request_owner: watch::Sender<()>,
) -> Router {
    let access = Arc::new(Access {
        world_matches: config.world_id == world_id,
        config,
        stop,
    });
    let tools = tools::WorldTools::new(
        access.clone(),
        world,
        timeline.into(),
        budget.clone(),
        language,
    );
    let transport = StreamableHttpService::new(
        move || Ok(tools.clone()),
        LocalSessionManager::default().into(),
        // The exact Host and absence of Origin are checked before invoking
        // this private SDK service. It cannot be mounted on another route.
        StreamableHttpServerConfig::default()
            .disable_allowed_hosts()
            .with_legacy_session_mode(false)
            .with_json_response(true)
            .with_max_request_body_bytes(REQUEST_BYTES),
    );
    Router::new()
        .route("/mcp", any(handle))
        .with_state(Arc::new(Connector {
            access,
            transport,
            slots: Arc::new(Semaphore::new(CONCURRENT_REQUESTS)),
            budget,
            request_owner,
        }))
}

pub(crate) fn disabled() -> Router {
    Router::new().route(
        "/mcp",
        any(|| async { reject(StatusCode::NOT_FOUND, "MCP is disabled.") }),
    )
}

struct RequestLease {
    _admission: OwnedSemaphorePermit,
    _memory: ByteReservation,
    _request_owner: watch::Sender<()>,
    reply: Mutex<Option<ByteReservation>>,
}

struct FundedReply {
    bytes: Bytes,
    _memory: ByteReservation,
    _request_owner: watch::Sender<()>,
}

impl AsRef<[u8]> for FundedReply {
    fn as_ref(&self) -> &[u8] {
        &self.bytes
    }
}

async fn handle(State(connector): State<Arc<Connector>>, request: Request) -> Response {
    let (parts, body) = request.into_parts();
    let headers = &parts.headers;
    let access = &connector.access;
    if headers.contains_key(header::ORIGIN)
        || !headers
            .get(header::HOST)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|host| {
                access
                    .config
                    .hosts
                    .iter()
                    .any(|allowed| host.eq_ignore_ascii_case(allowed))
            })
    {
        return reject(
            StatusCode::FORBIDDEN,
            "Host or Origin is not allowed for this connector.",
        );
    }
    if !access.config.authenticates(headers) {
        return reject(StatusCode::UNAUTHORIZED, "Invalid connector credential.");
    }
    if !access.current() {
        return unavailable();
    }
    if parts.uri.query().is_some() {
        return reject(
            StatusCode::BAD_REQUEST,
            "MCP does not accept URL arguments.",
        );
    }
    if parts.method != Method::POST {
        return reject(StatusCode::METHOD_NOT_ALLOWED, "Use MCP POST requests.");
    }
    if headers.contains_key(header::CONTENT_ENCODING)
        || !headers
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| {
                value
                    .split(';')
                    .next()
                    .is_some_and(|mime| mime.trim().eq_ignore_ascii_case("application/json"))
            })
    {
        return reject(
            StatusCode::UNSUPPORTED_MEDIA_TYPE,
            "Use uncompressed application/json.",
        );
    }
    if headers.get(header::CONTENT_LENGTH).is_some_and(|value| {
        value
            .to_str()
            .ok()
            .and_then(|text| text.parse::<usize>().ok())
            .is_none_or(|n| n > REQUEST_BYTES)
    }) {
        return too_large();
    }
    let Ok(admission) = connector.slots.clone().try_acquire_owned() else {
        return reject(
            StatusCode::TOO_MANY_REQUESTS,
            "Too many concurrent MCP requests.",
        );
    };
    tokio::select! {
        biased;
        _ = crate::launch::stopped(access.stop.clone()) => unavailable(),
        result = tokio::time::timeout(DEADLINE, connector.respond(parts, body, admission)) => {
            result.unwrap_or_else(|_| reject(StatusCode::REQUEST_TIMEOUT, "The MCP request deadline expired."))
        }
    }
}

impl Connector {
    async fn respond(
        &self,
        mut parts: axum::http::request::Parts,
        body: Body,
        admission: OwnedSemaphorePermit,
    ) -> Response {
        let Ok(mut memory) = self.budget.reserve(2 * REQUEST_BYTES) else {
            return capacity();
        };
        let Ok(bytes) = to_bytes(body, REQUEST_BYTES).await else {
            return too_large();
        };
        if !self.access.current() {
            return unavailable();
        }
        let Some(decoded) = std::str::from_utf8(&bytes)
            .ok()
            .and_then(json_tree_allocation_bound)
        else {
            return reject(
                StatusCode::BAD_REQUEST,
                "Invalid or incomplete MCP request.",
            );
        };
        // One request body, its admitted JSON decode, and the SDK's bounded
        // wire assembly. The SDK may own the request briefly after disconnect.
        if memory
            .resize(bytes.len() + decoded + 2 * REPLY_BYTES)
            .is_err()
        {
            return capacity();
        }
        let lease = Arc::new(RequestLease {
            _admission: admission,
            _memory: memory,
            _request_owner: self.request_owner.clone(),
            reply: Mutex::new(None),
        });
        parts.extensions.insert(lease.clone());
        let sdk = self
            .transport
            .handle(Request::from_parts(parts, Body::from(bytes)))
            .await;
        let (mut parts, body) = sdk.into_parts();
        let Ok(bytes) = to_bytes(Body::new(body), REPLY_BYTES).await else {
            return capacity();
        };
        // Transfer only the independently funded wire bytes, not decode
        // workspace or an owned world read, across the actual handoff.
        let Ok(memory) = self.budget.reserve(bytes.len() + size_of::<FundedReply>()) else {
            return capacity();
        };
        let stopping = self.access.stop.borrow();
        if *stopping || chrono::Utc::now() >= self.access.config.expires_at {
            return unavailable();
        }
        parts
            .headers
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        Response::from_parts(
            parts,
            Body::from(Bytes::from_owner(FundedReply {
                bytes,
                _memory: memory,
                _request_owner: self.request_owner.clone(),
            })),
        )
    }
}

fn reject(status: StatusCode, message: &'static str) -> Response {
    let mut response =
        (status, axum::Json(serde_json::json!({ "error": message }))).into_response();
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    match status {
        StatusCode::UNAUTHORIZED => {
            response
                .headers_mut()
                .insert(header::WWW_AUTHENTICATE, HeaderValue::from_static("Bearer"));
        }
        StatusCode::METHOD_NOT_ALLOWED => {
            response
                .headers_mut()
                .insert(header::ALLOW, HeaderValue::from_static("POST"));
        }
        _ => (),
    }
    response
}

fn unavailable() -> Response {
    reject(
        StatusCode::FORBIDDEN,
        "World read grant expired, changed, or is unavailable.",
    )
}

fn capacity() -> Response {
    reject(
        StatusCode::SERVICE_UNAVAILABLE,
        "The MCP request exceeded its available memory.",
    )
}

fn too_large() -> Response {
    reject(StatusCode::PAYLOAD_TOO_LARGE, "MCP body limit exceeded.")
}
