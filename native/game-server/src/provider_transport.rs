//! NPC inference wire requests. The director owns funding, source fencing,
//! response schemas and effects. This owner never starts a replacement inference.
//! docs/projects/rust-game-server-tech-design.md#6-execute-npc-decisions-without-node-rgs06

use crate::network::{NetworkError, NetworkOperation, NetworkResponse, permitted_destination};
use openlegend_simulation::encoding::write_json_record;
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use reqwest::{Method, Request, Url, header};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    io::{self, Write},
    time::{Duration, SystemTime},
};

mod events;
pub(crate) mod macrofold;
pub(crate) use events::{InferenceEvent, InferenceEvents};

const REQUEST_BYTES: usize = 500_000;
const DIRECT_REPLY_BYTES: usize = 500_000;
const MACROFOLD_REPLY_BYTES: usize = 1_000_000;
const DIAGNOSTIC_BYTES: usize = 8192;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ProviderRoute {
    Macrofold,
    Jev,
    OpenAi,
}

impl ProviderRoute {
    pub(crate) fn reply_bytes(self) -> usize {
        match self {
            Self::Macrofold => MACROFOLD_REPLY_BYTES,
            Self::Jev | Self::OpenAi => DIRECT_REPLY_BYTES,
        }
    }
}

pub(crate) struct ProviderDestination {
    route: ProviderRoute,
    url: Url,
    authorization: header::HeaderValue,
}

impl ProviderDestination {
    /// `custom_base` comes from trusted server configuration only. Same-Run
    /// status/result URLs admitted later must belong to this selected origin.
    pub(crate) fn new(
        route: ProviderRoute,
        custom_base: Option<&str>,
        api_key: &str,
    ) -> Result<Self, NetworkError> {
        let configured = match (custom_base, route) {
            (Some(base), _) => base,
            (None, ProviderRoute::Jev) => "https://api.typesafe.ai/v1/systemone",
            (None, ProviderRoute::OpenAi) => "https://api.openai.com/v1/responses",
            (None, ProviderRoute::Macrofold) => return Err(NetworkError::Destination),
        };
        let mut url = Url::parse(configured).map_err(|_| NetworkError::Destination)?;
        if !permitted_destination(&url, false) || url.fragment().is_some() || api_key.is_empty() {
            return Err(NetworkError::Destination);
        }
        if route == ProviderRoute::Macrofold {
            url = url
                .join("/v1/inferences")
                .map_err(|_| NetworkError::Destination)?;
        }
        let mut authorization = header::HeaderValue::from_str(&format!("Bearer {api_key}"))
            .map_err(|_| NetworkError::Destination)?;
        authorization.set_sensitive(true);
        Ok(Self {
            route,
            url,
            authorization,
        })
    }

    /// Complete, immutable request bytes ready for the final authority check.
    /// Custody follows the actual submitted body to transport cleanup.
    pub(crate) fn inference(
        &self,
        body: &impl Serialize,
        operation_id: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        self.post(self.url.clone(), body, operation_id, budget)
    }

    pub(crate) fn observe(&self, location: &str) -> Result<Request, NetworkError> {
        if self.route != ProviderRoute::Macrofold {
            return Err(NetworkError::Destination);
        }
        let url = self
            .url
            .join(location)
            .map_err(|_| NetworkError::Destination)?;
        if url.origin() != self.url.origin()
            || !permitted_destination(&url, false)
            || url.fragment().is_some()
        {
            return Err(NetworkError::Destination);
        }
        Ok(self.request(Method::GET, url))
    }

    /// Cancellation names one already admitted Run. It creates no inference.
    pub(crate) fn cancel(
        &self,
        run: &str,
        operation_id: &str,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        if self.route != ProviderRoute::Macrofold || !valid_reference(run, 256) {
            return Err(NetworkError::Destination);
        }
        let mut destination = self.url.clone();
        destination
            .path_segments_mut()
            .map_err(|_| NetworkError::Destination)?
            .clear()
            .extend(["v1", "runs", run, "cancel"]);
        self.post(
            destination,
            &serde_json::Map::<String, serde_json::Value>::new(),
            Some(operation_id),
            budget,
        )
    }

    fn request(&self, method: Method, url: Url) -> Request {
        let mut request = Request::new(method, url);
        request
            .headers_mut()
            .insert(header::AUTHORIZATION, self.authorization.clone());
        request.headers_mut().insert(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static("application/json"),
        );
        request
    }

    fn post(
        &self,
        url: Url,
        body: &impl Serialize,
        operation_id: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let mut body_bytes = BoundedBody::new(REQUEST_BYTES, budget)?;
        if let Err(error) = write_json_record(body, &mut body_bytes) {
            return Err(if error.is_io() {
                NetworkError::Capacity
            } else {
                NetworkError::Transfer
            });
        }
        let BoundedBody { bytes, storage, .. } = body_bytes;
        let digest = Sha256::digest(&bytes).into();
        let mut request = self.request(Method::POST, url);
        if let Some(operation_id) = operation_id {
            if self.route != ProviderRoute::Macrofold {
                return Err(NetworkError::Destination);
            }
            let value = header::HeaderValue::from_str(operation_id)
                .map_err(|_| NetworkError::Destination)?;
            request.headers_mut().insert("idempotency-key", value);
        }
        *request.body_mut() = Some(bytes.into());
        Ok(PreparedProviderRequest {
            request,
            digest,
            _body: storage,
        })
    }
}

pub(crate) struct PreparedProviderRequest {
    pub(crate) request: Request,
    pub(crate) digest: [u8; 32],
    pub(crate) _body: ByteReservation,
}

/// A response is opened within the caller's currentness lease and then
/// consumed off the world lane. Any provider body handed to a later semantic
/// owner carries independent allocation custody.
pub(crate) struct ProviderExchange<'a> {
    response: NetworkResponse<'a>,
    limit: usize,
    evidence: HttpEvidence,
    _request: Option<ByteReservation>,
}

impl<'a> ProviderExchange<'a> {
    pub(crate) async fn start<E: From<NetworkError>>(
        operation: &'a NetworkOperation<'a>,
        request: PreparedProviderRequest,
        route: ProviderRoute,
        stream: bool,
        timeout: Duration,
        authorize: impl FnOnce(&mut dyn FnMut()) -> Result<(), E>,
    ) -> Result<Self, E> {
        let PreparedProviderRequest { request, _body, .. } = request;
        Self::open(
            operation,
            request,
            Some(_body),
            route,
            stream,
            timeout,
            authorize,
        )
        .await
    }

    /// Observation reads a previously admitted Macrofold Run; the original
    /// operation still owns the deadline and the caller checks exact Run IDs.
    pub(crate) async fn observe(
        operation: &'a NetworkOperation<'a>,
        request: Request,
        timeout: Duration,
    ) -> Result<Self, NetworkError> {
        Self::open(
            operation,
            request,
            None,
            ProviderRoute::Macrofold,
            false,
            timeout,
            |start| {
                start();
                Ok(())
            },
        )
        .await
    }

    async fn open<E: From<NetworkError>>(
        operation: &'a NetworkOperation<'a>,
        request: Request,
        custody: Option<ByteReservation>,
        route: ProviderRoute,
        stream: bool,
        timeout: Duration,
        authorize: impl FnOnce(&mut dyn FnMut()) -> Result<(), E>,
    ) -> Result<Self, E> {
        if stream && route != ProviderRoute::Macrofold {
            return Err(NetworkError::Destination.into());
        }
        let limit = route.reply_bytes();
        let wire = if stream { limit * 4 } else { limit };
        let response = operation
            .response(request, wire, timeout, authorize)
            .await?;
        let status = response.status().as_u16();
        let evidence = HttpEvidence::read(status, response.headers());
        Ok(Self {
            response,
            limit,
            evidence,
            _request: custody,
        })
    }

    /// Record known status before waiting on a body. Cancellation or an
    /// unavailable diagnostic body cannot reclassify known HTTP evidence.
    pub(crate) fn evidence(&self) -> &HttpEvidence {
        &self.evidence
    }

    pub(crate) fn streaming(&self) -> bool {
        self.response.status().is_success()
            && self
                .response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .is_some_and(|value| {
                    value
                        .split(';')
                        .next()
                        .is_some_and(|mime| mime.trim().eq_ignore_ascii_case("text/event-stream"))
                })
    }

    pub(crate) async fn json(mut self, budget: &ByteBudget) -> Result<ProviderReply, NetworkError> {
        let success = self.response.status().is_success();
        if success && self.streaming() {
            return Err(NetworkError::Transfer);
        }
        let limit = if success {
            self.limit
        } else {
            DIAGNOSTIC_BYTES.min(self.limit)
        };
        self.response.lower_limit(limit);
        let body = read_body(&mut self.response, limit, budget).await;
        if !success {
            if let Ok(body) = body {
                self.evidence.read_error(&body.bytes);
            }
            return Ok(ProviderReply::Refused(self.evidence));
        }
        let body = body?;
        Ok(ProviderReply::Json {
            evidence: self.evidence,
            body: FundedReply {
                bytes: body.bytes,
                _storage: body.storage,
            },
        })
    }
}

async fn read_body(
    response: &mut NetworkResponse<'_>,
    limit: usize,
    budget: &ByteBudget,
) -> Result<BoundedBody, NetworkError> {
    let mut body = BoundedBody::new(limit, budget)?;
    while let Some(chunk) = response.next().await? {
        body.extend(&chunk)?;
    }
    Ok(body)
}

pub(crate) enum ProviderReply {
    Json {
        evidence: HttpEvidence,
        body: FundedReply,
    },
    Refused(HttpEvidence),
}

pub(crate) struct FundedReply {
    pub(crate) bytes: Vec<u8>,
    _storage: ByteReservation,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HttpEvidence {
    pub(crate) status: u16,
    pub(crate) trace_id: Option<String>,
    pub(crate) retry_after_ms: Option<u64>,
    pub(crate) remaining_requests: Option<u64>,
    pub(crate) remaining_tokens: Option<u64>,
    pub(crate) reset_requests_ms: Option<u64>,
    pub(crate) reset_tokens_ms: Option<u64>,
    pub(crate) error_code: Option<String>,
    pub(crate) error_type: Option<String>,
}

impl HttpEvidence {
    fn read(status: u16, headers: &header::HeaderMap) -> Self {
        let field = |name| headers.get(name).and_then(|value| value.to_str().ok());
        let safe_count = |name| {
            field(name)
                .filter(|value| value.len() <= 32 && value.bytes().all(|c| c.is_ascii_digit()))
                .and_then(|value| value.parse::<u64>().ok())
                .filter(|count| *count <= MAX_SAFE_INTEGER)
        };
        Self {
            status,
            trace_id: field("x-request-id")
                .filter(|value| valid_reference(value, 256))
                .map(str::to_owned),
            retry_after_ms: field("retry-after").and_then(retry_after),
            remaining_requests: safe_count("x-ratelimit-remaining-requests"),
            remaining_tokens: safe_count("x-ratelimit-remaining-tokens"),
            reset_requests_ms: field("x-ratelimit-reset-requests").and_then(reset_after),
            reset_tokens_ms: field("x-ratelimit-reset-tokens").and_then(reset_after),
            error_code: None,
            error_type: None,
        }
    }

    fn read_error(&mut self, bytes: &[u8]) {
        // Unknown or malformed bodies can lose diagnostics. Only these bounded
        // identifiers are retained. No provider prose enters the receipt.
        #[derive(Deserialize)]
        struct Body<'a> {
            #[serde(borrow)]
            error: Details<'a>,
        }
        #[derive(Deserialize)]
        struct Details<'a> {
            code: Option<&'a str>,
            #[serde(rename = "type")]
            kind: Option<&'a str>,
        }
        let safe = |value: &str| {
            value.len() <= 128
                && value.as_bytes().first().is_some_and(u8::is_ascii_lowercase)
                && value
                    .bytes()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'_')
        };
        if let Ok(body) = serde_json::from_slice::<Body<'_>>(bytes) {
            self.error_code = body
                .error
                .code
                .filter(|value| safe(value))
                .map(str::to_owned);
            self.error_type = body
                .error
                .kind
                .filter(|value| safe(value))
                .map(str::to_owned);
        }
    }

    /// Only documented pre-admission refusals establish there was no model
    /// invocation. In particular, an ordinary 409 or 5xx is not safe to replay.
    pub(crate) fn admission_rejected(&self, route: ProviderRoute) -> bool {
        let code = self.error_code.as_deref().unwrap_or_default();
        if route == ProviderRoute::Macrofold {
            matches!(self.status, 400 | 401 | 403 | 404 | 413 | 422 | 429)
                || matches!(code, "execution_disabled" | "inference_disabled")
                || (self.status == 402
                    && matches!(code, "insufficient_credit" | "deployment_budget_exhausted"))
                || (self.status == 409
                    && matches!(code, "deployment_binding_stale" | "deployment_not_ready"))
                || (self.status == 503
                    && matches!(
                        code,
                        "deployment_unavailable" | "inference_admission_timeout"
                    ))
        } else {
            matches!(self.status, 400 | 401 | 403 | 404 | 413 | 422 | 429 | 529)
        }
    }
}

fn bounded_ms(value: f64) -> Option<u64> {
    (value.is_finite() && value >= 0.0 && value.ceil() <= MAX_SAFE_INTEGER as f64)
        .then(|| value.ceil() as u64)
}

fn decimal(value: &str) -> Option<f64> {
    let (whole, fraction) = value.split_once('.').unwrap_or((value, "0"));
    (!whole.is_empty()
        && !fraction.is_empty()
        && whole
            .bytes()
            .chain(fraction.bytes())
            .all(|b| b.is_ascii_digit()))
    .then(|| value.parse().ok())
    .flatten()
}

fn retry_after(value: &str) -> Option<u64> {
    if value.len() > 128 {
        return None;
    }
    if let Some(seconds) = decimal(value) {
        return bounded_ms(seconds * 1000.0);
    }
    let deadline = httpdate::parse_http_date(value).ok()?;
    if httpdate::fmt_http_date(deadline) != value {
        return None;
    }
    let delay = deadline
        .duration_since(SystemTime::now())
        .unwrap_or_default();
    bounded_ms(delay.as_secs_f64() * 1000.0)
}

fn reset_after(mut value: &str) -> Option<u64> {
    if value.is_empty() || value.len() > 128 {
        return None;
    }
    let mut milliseconds = 0.0;
    while !value.is_empty() {
        let end = value.find(|c: char| !c.is_ascii_digit() && c != '.')?;
        let number = decimal(&value[..end])?;
        value = &value[end..];
        let (unit, rest) = if let Some(rest) = value.strip_prefix("ms") {
            (1.0, rest)
        } else {
            let unit = match value.as_bytes().first()? {
                b's' => 1_000.0,
                b'm' => 60_000.0,
                b'h' => 3_600_000.0,
                b'd' => 86_400_000.0,
                _ => return None,
            };
            (unit, &value[1..])
        };
        milliseconds += number * unit;
        value = rest;
    }
    bounded_ms(milliseconds)
}

struct BoundedBody {
    bytes: Vec<u8>,
    storage: ByteReservation,
    limit: usize,
}

impl BoundedBody {
    fn new(limit: usize, budget: &ByteBudget) -> Result<Self, NetworkError> {
        Ok(Self {
            bytes: Vec::new(),
            storage: budget.reserve(0).map_err(|_| NetworkError::Capacity)?,
            limit,
        })
    }

    fn extend(&mut self, bytes: &[u8]) -> Result<(), NetworkError> {
        let capacity = self.bytes.capacity();
        let end = self
            .bytes
            .len()
            .checked_add(bytes.len())
            .filter(|&len| len <= self.limit)
            .ok_or(NetworkError::Capacity)?;
        if end > capacity {
            let next = end.max(1024.max(capacity * 2).min(self.limit));
            // The allocator may move backing on growth while the old buffer
            // still exists. Fund both before asking it to grow this Vec.
            self.storage
                .resize(capacity + next)
                .map_err(|_| NetworkError::Capacity)?;
            self.bytes
                .try_reserve_exact(next - self.bytes.len())
                .map_err(|_| NetworkError::Capacity)?;
            self.storage
                .resize(self.bytes.capacity())
                .map_err(|_| NetworkError::Capacity)?;
        }
        self.bytes.extend_from_slice(bytes);
        Ok(())
    }
}

impl Write for BoundedBody {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.extend(bytes)
            .map_err(|_| io::Error::other("provider request size or capacity"))?;
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

fn valid_reference(value: &str, maximum: usize) -> bool {
    !value.is_empty()
        && value.len() <= maximum
        && value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, b'.' | b'_' | b':' | b'-'))
}
