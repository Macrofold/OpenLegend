//! The Rust application admits outgoing work before acquiring buffers or
//! starting a socket. A child exchange cannot renew its operation's deadline.

use openlegend_simulation::host::{ByteBudget, ByteReservation};
use std::{
    fmt,
    future::{Future, poll_fn},
    sync::Arc,
    task::Poll,
    time::Duration,
};
use tokio::{
    sync::{OwnedSemaphorePermit, Semaphore},
    time::Instant,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NetworkError {
    Busy,
    Deadline,
    Capacity,
    Destination,
    Transfer,
    NotStarted,
}

impl fmt::Display for NetworkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Busy => "Network operation capacity is occupied",
            Self::Deadline => "Network operation expired",
            Self::Capacity => "Network data exceeds its admitted size",
            Self::Destination => "Network operation cannot use this destination",
            Self::Transfer => "Network transfer failed",
            Self::NotStarted => "The reserved exchange was not started",
        })
    }
}

impl std::error::Error for NetworkError {}

pub(crate) struct NetworkOwner {
    client: reqwest::Client,
    slots: Arc<Semaphore>,
    budget: ByteBudget,
    allow_loopback_http: bool,
}

impl NetworkOwner {
    pub(crate) fn new(
        capacity: usize,
        budget: ByteBudget,
        allow_loopback_http: bool,
    ) -> Result<Self, NetworkError> {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .retry(reqwest::retry::never())
            .no_proxy()
            .build()
            .map_err(|_| NetworkError::Transfer)?;
        Ok(Self {
            client,
            slots: Arc::new(Semaphore::new(capacity)),
            budget,
            allow_loopback_http,
        })
    }

    /// Both worlds use the same connection pool and concurrency limit. Request
    /// buffers still belong to the world that requested them.
    pub(crate) fn for_world(&self, budget: ByteBudget) -> Self {
        Self {
            client: self.client.clone(),
            slots: self.slots.clone(),
            budget,
            allow_loopback_http: self.allow_loopback_http,
        }
    }

    pub(crate) fn admit(
        &self,
        until: Instant,
        workspace_bytes: usize,
    ) -> Result<NetworkOperation<'_>, NetworkError> {
        if until <= Instant::now() {
            return Err(NetworkError::Deadline);
        }
        let permit = Arc::clone(&self.slots)
            .try_acquire_owned()
            .map_err(|_| NetworkError::Busy)?;
        let workspace = self
            .budget
            .reserve(workspace_bytes)
            .map_err(|_| NetworkError::Capacity)?;
        Ok(NetworkOperation {
            owner: self,
            until,
            _workspace: workspace,
            _permit: permit,
        })
    }
}

/// Parse an operator-configured URL without starting network work.
pub(crate) fn parse_url(value: &str) -> Result<reqwest::Url, NetworkError> {
    reqwest::Url::parse(value).map_err(|_| NetworkError::Destination)
}

pub(crate) fn permitted_destination(url: &reqwest::Url, allow_loopback_http: bool) -> bool {
    if !url.username().is_empty() || url.password().is_some() {
        return false;
    }
    match url.scheme() {
        "https" => url.has_host(),
        "http" if allow_loopback_http => {
            matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"))
        }
        _ => false,
    }
}

pub(crate) struct NetworkOperation<'a> {
    owner: &'a NetworkOwner,
    until: Instant,
    _workspace: ByteReservation,
    _permit: OwnedSemaphorePermit,
}

impl NetworkOperation<'_> {
    pub(crate) fn deadline(&self) -> Instant {
        self.until
    }

    pub(crate) fn into_workspace(self) -> ByteReservation {
        self._workspace
    }

    /// Start exactly once inside the caller's synchronous final validation.
    /// The first poll hands the real request to the HTTP client. The gate is
    /// never held during DNS, TLS, response waits or body reading.
    pub(crate) async fn response<E: From<NetworkError>>(
        &self,
        request: reqwest::Request,
        maximum_bytes: usize,
        request_timeout: Duration,
        authorize: impl FnOnce(&mut dyn FnMut()) -> Result<(), E>,
    ) -> Result<NetworkResponse<'_>, E> {
        if !permitted_destination(request.url(), self.owner.allow_loopback_http) {
            return Err(NetworkError::Destination.into());
        }
        let until = self.until.min(Instant::now() + request_timeout);
        let mut authorize = Some(authorize);
        let mut pending = std::pin::pin!(async { self.owner.client.execute(request).await });
        let response =
            tokio::time::timeout_at(
                until,
                poll_fn(|cx| {
                    if let Some(authorize) = authorize.take() {
                        if Instant::now() >= until {
                            return Poll::Ready(Err(NetworkError::Deadline.into()));
                        }
                        let mut result = None;
                        if let Err(error) = authorize(&mut || {
                            if result.is_none() {
                                result =
                                    Some(pending.as_mut().poll(cx).map(|value| {
                                        value.map_err(|_| NetworkError::Transfer.into())
                                    }));
                            }
                        }) {
                            return Poll::Ready(Err(error));
                        }
                        result.unwrap_or(Poll::Ready(Err(NetworkError::NotStarted.into())))
                    } else {
                        pending
                            .as_mut()
                            .poll(cx)
                            .map(|value| value.map_err(|_| NetworkError::Transfer.into()))
                    }
                }),
            )
            .await
            .map_err(|_| E::from(NetworkError::Deadline))??;
        let declared_too_large = response
            .content_length()
            .is_some_and(|bytes| bytes > maximum_bytes as u64);
        Ok(NetworkResponse {
            response,
            until,
            remaining_bytes: maximum_bytes,
            declared_too_large,
            _operation: self,
        })
    }

    /// The enclosing SDK operation owns its response and parser escrow until
    /// its final consumer completes. Drop the actual response on any refusal.
    pub(crate) async fn bytes(
        &self,
        request: reqwest::Request,
        maximum_bytes: usize,
        request_timeout: Duration,
    ) -> Result<axum::http::Response<Vec<u8>>, NetworkError> {
        let mut response = self
            .response::<NetworkError>(request, maximum_bytes, request_timeout, |start| {
                start();
                Ok(())
            })
            .await?;
        let expected = response.response.content_length().unwrap_or_default();
        if expected > maximum_bytes as u64 {
            return Err(NetworkError::Capacity);
        }
        let mut accepted = axum::http::Response::builder().status(response.status());
        std::mem::swap(
            accepted.headers_mut().ok_or(NetworkError::Transfer)?,
            response.response.headers_mut(),
        );
        let mut bytes = Vec::new();
        bytes
            .try_reserve_exact(expected as usize)
            .map_err(|_| NetworkError::Capacity)?;
        while let Some(chunk) = response.next().await? {
            bytes
                .try_reserve(chunk.len())
                .map_err(|_| NetworkError::Capacity)?;
            bytes.extend_from_slice(&chunk);
        }
        accepted.body(bytes).map_err(|_| NetworkError::Transfer)
    }
}

/// Status and headers precede body handling. A slow or malformed body cannot
/// erase an already observed provider receipt. Chunks remain within the
/// original operation's custody and deadline. A later owner funds its copy.
pub(crate) struct NetworkResponse<'a> {
    response: reqwest::Response,
    until: Instant,
    remaining_bytes: usize,
    declared_too_large: bool,
    _operation: &'a NetworkOperation<'a>,
}

impl NetworkResponse<'_> {
    pub(crate) fn status(&self) -> axum::http::StatusCode {
        self.response.status()
    }

    pub(crate) fn headers(&self) -> &axum::http::HeaderMap {
        self.response.headers()
    }

    pub(crate) fn lower_limit(&mut self, bytes: usize) {
        self.remaining_bytes = self.remaining_bytes.min(bytes);
        self.declared_too_large |= self
            .response
            .content_length()
            .is_some_and(|length| length > self.remaining_bytes as u64);
    }

    pub(crate) async fn next(&mut self) -> Result<Option<axum::body::Bytes>, NetworkError> {
        if Instant::now() >= self.until {
            return Err(NetworkError::Deadline);
        }
        if self.declared_too_large {
            return Err(NetworkError::Capacity);
        }
        let chunk = tokio::time::timeout_at(self.until, self.response.chunk())
            .await
            .map_err(|_| NetworkError::Deadline)?
            .map_err(|_| NetworkError::Transfer)?;
        if let Some(bytes) = &chunk {
            self.remaining_bytes = self
                .remaining_bytes
                .checked_sub(bytes.len())
                .ok_or(NetworkError::Capacity)?;
        }
        Ok(chunk)
    }
}
