//! Serve the exact mounted release with current catalog and session permission.
//! The mount is a read-only deployment input outside the public build tree.

use crate::{
    access_http::read_cookie,
    authority::Authority,
    store::{
        Store, StoreResult,
        assets::{Artifact, AssetRevision, valid_digest},
    },
};
use axum::{
    Router,
    body::{Body, Bytes},
    extract::{Path as RoutePath, Query, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    response::Response,
    routing::get,
};
use http_body::{Body as HttpBody, Frame, SizeHint};
use openlegend_simulation::{
    encoding::{hex_bytes, sha256_hex},
    host::{ByteBudget, ByteReservation, ResidentReservation},
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    error::Error,
    fs::File,
    future::Future,
    io::{self, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    pin::Pin,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
    task::{Context, Poll},
    time::Duration,
};
use tokio::{
    sync::{OwnedSemaphorePermit, Semaphore, watch},
    task::JoinHandle,
    time::{Instant, sleep_until},
};

const INDEX_BYTES: usize = 4 * 1024 * 1024;
const CHUNK_BYTES: usize = 64 * 1024;
// The existing server asset-output limit and end-to-end transfer deadline.
const TRANSFERS: usize = 16;
const TRANSFER_TIMEOUT: Duration = Duration::from_secs(300);
type AssetError = Box<dyn Error + Send + Sync>;

pub(super) mod selection;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct AssetIndex {
    release: AssetRevision,
    files: HashMap<String, Artifact>,
}

pub(crate) struct InstalledAssets {
    index: AssetIndex,
    root: Option<PathBuf>,
    max_object_bytes: u64,
    _custody: ResidentReservation,
}

impl InstalledAssets {
    /// Validate and retain the exact release index once at boot. The known
    /// artifact identity resolves byte bodies under the separate readonly mount.
    pub(crate) fn load(
        index_path: &Path,
        expected_sha256: &str,
        root: Option<PathBuf>,
        max_object_bytes: u64,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, AssetError> {
        let _workspace = budget.reserve(2 * INDEX_BYTES)?;
        let mut source = File::open(index_path)?.take((INDEX_BYTES + 1) as u64);
        let mut bytes = Vec::new();
        source.read_to_end(&mut bytes)?;
        if bytes.len() > INDEX_BYTES
            || sha256_hex(&bytes) != expected_sha256
            || !valid_digest(expected_sha256)
            || max_object_bytes == 0
        {
            return Err("The installed runtime asset index does not match its build pin".into());
        }
        let _custody = budget.resident().reserve(bytes.len() * 8 + 8192)?;
        let index: AssetIndex = serde_json::from_slice(&bytes)?;
        if !index.release.valid()
            || index.files.len() > 20_000
            || index.files.iter().any(|(name, artifact)| {
                !valid_logical_path(name) || !artifact.valid(9_007_199_254_740_991)
            })
        {
            return Err("The installed runtime asset index is invalid".into());
        }
        let root = root.map(|root| root.canonicalize()).transpose()?;
        if let Some(root) = &root {
            if !root.is_dir() {
                return Err("The runtime asset mount must be a directory".into());
            }
            // The public build's static handler must never reach the
            // protected mount without passing the current catalog grant.
            let public = index_path.with_file_name("browser").canonicalize()?;
            if root.starts_with(&public) || public.starts_with(root) {
                return Err(
                    "The runtime asset mount must be outside the browser build tree".into(),
                );
            }
        }
        Ok(Arc::new(Self {
            index,
            root,
            max_object_bytes,
            _custody,
        }))
    }

    pub(crate) fn release(&self) -> &AssetRevision {
        &self.index.release
    }

    /// Read current permission for the saved binding only when it matches this
    /// browser build's exact release. Pure native depiction remains available
    /// while the retained release cannot currently be disclosed.
    pub(crate) async fn permitted_release(
        &self,
        store: &Store,
        account: &str,
        saved_release: &AssetRevision,
    ) -> StoreResult<Option<i64>> {
        if saved_release != self.release() {
            return Ok(None);
        }
        store
            .permit_installed_asset(account, self.release(), None)
            .await
    }
}

fn valid_logical_path(path: &str) -> bool {
    let bytes = path.as_bytes();
    !path.is_empty()
        && path.encode_utf16().count() <= 4096
        && !path
            .bytes()
            .any(|byte| byte.is_ascii_control() || byte == b'\\')
        && !(bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':')
        && path.split('/').all(|part| !matches!(part, "" | "." | ".."))
}

#[derive(Clone)]
struct AssetRoutes {
    installed: Arc<InstalledAssets>,
    authority: Arc<Authority>,
    store: Arc<Store>,
    budget: ByteBudget,
    capacity: Arc<Semaphore>,
    stop: watch::Receiver<bool>,
}

pub(crate) fn router(
    installed: Arc<InstalledAssets>,
    authority: Arc<Authority>,
    store: Arc<Store>,
    budget: ByteBudget,
    stop: watch::Receiver<bool>,
) -> Router {
    Router::new()
        .route("/__assets/{*repository_path}", get(asset))
        .with_state(AssetRoutes {
            installed,
            authority,
            store,
            budget,
            capacity: Arc::new(Semaphore::new(TRANSFERS)),
            stop,
        })
}

#[derive(Deserialize)]
struct Pins {
    release: Option<String>,
    sha256: Option<String>,
}

async fn asset(
    State(state): State<AssetRoutes>,
    RoutePath(path): RoutePath<String>,
    Query(pins): Query<Pins>,
    method: Method,
    headers: HeaderMap,
) -> Response {
    let Ok(permit) = state.capacity.clone().try_acquire_owned() else {
        return unavailable();
    };
    let deadline = Instant::now() + TRANSFER_TIMEOUT;
    let mut stop = state.stop.clone();
    tokio::select! {
        biased;
        _ = stop.wait_for(|stop| *stop) => unavailable(),
        _ = sleep_until(deadline) => unavailable(),
        result = selected_asset(state, path, pins, method, headers, permit, deadline) => result,
    }
}

async fn selected_asset(
    state: AssetRoutes,
    path: String,
    pins: Pins,
    method: Method,
    headers: HeaderMap,
    permit: OwnedSemaphorePermit,
    deadline: Instant,
) -> Response {
    let Some(token) = read_cookie(&headers, "ol_session") else {
        return denied("This asset requires current project access.");
    };
    let Ok(access) = state.authority.asset_access(token).await else {
        return denied("This asset requires current project access.");
    };
    let file = state
        .installed
        .index
        .files
        .get(&path)
        .filter(|file| file.bytes <= state.installed.max_object_bytes);
    let current = || {
        // The release check also protects a missing path from exposing the
        // private index to an account that cannot use it.
        state
            .store
            .permit_installed_asset(access.account_id(), state.installed.release(), file)
    };
    let generation = match current().await {
        Ok(Some(generation)) => generation,
        Ok(None) => return denied("This asset requires current project access."),
        Err(_) => return unavailable(),
    };
    let changed = || denied("Access to this asset changed during preparation.");
    let Some(file) = file else {
        return state
            .authority
            .disclose_asset(&access, || {
                failure(
                    StatusCode::NOT_FOUND,
                    "Asset is not in the selected release.",
                )
            })
            .unwrap_or_else(|_| changed());
    };
    if pins
        .release
        .as_ref()
        .is_some_and(|value| value != &state.installed.release().manifest_sha256)
        || pins
            .sha256
            .as_ref()
            .is_some_and(|value| value != &file.sha256)
    {
        return state
            .authority
            .disclose_asset(&access, || {
                failure(
                    StatusCode::CONFLICT,
                    "The selected asset release changed. Reload the page.",
                )
            })
            .unwrap_or_else(|_| changed());
    }
    let tag = format!("\"{}\"", file.sha256);
    let tag = tag.as_str();
    let out = asset_headers(file, tag, pins.sha256.is_some());
    let read_header = |name| headers.get(name).and_then(|value| value.to_str().ok());
    if read_header(header::IF_NONE_MATCH)
        .is_some_and(|value| value.split(',').any(|value| value.trim() == tag))
    {
        return state
            .authority
            .disclose_asset(&access, || {
                response(StatusCode::NOT_MODIFIED, out, Body::empty())
            })
            .unwrap_or_else(|_| changed());
    }
    let requested_range = (method == Method::GET
        && read_header(header::IF_RANGE).is_none_or(|value| value == tag))
    .then(|| headers.get(header::RANGE))
    .flatten();
    let (range, mut out) = if let Some(range) = requested_range {
        let Some((start, end)) = range
            .to_str()
            .ok()
            .and_then(|range| range_of(range, file.bytes))
        else {
            let mut out = out;
            insert(
                &mut out,
                header::CONTENT_RANGE,
                format!("bytes */{}", file.bytes),
            );
            return state
                .authority
                .disclose_asset(&access, || {
                    response(StatusCode::RANGE_NOT_SATISFIABLE, out, Body::empty())
                })
                .unwrap_or_else(|_| changed());
        };
        let mut out = out;
        insert(
            &mut out,
            header::CONTENT_RANGE,
            format!("bytes {start}-{end}/{}", file.bytes),
        );
        (Some((start, end)), out)
    } else {
        (None, out)
    };
    let bytes = range.map_or(file.bytes, |(start, end)| end - start + 1);
    insert(&mut out, header::CONTENT_LENGTH, bytes.to_string());
    if method == Method::HEAD {
        return state
            .authority
            .disclose_asset(&access, || response(StatusCode::OK, out, Body::empty()))
            .unwrap_or_else(|_| changed());
    }
    let Some(root) = state.installed.root.as_deref() else {
        return unavailable();
    };
    let Some(opened) = verified_file(
        root,
        file,
        range.map_or(0, |(start, _)| start),
        &state.budget,
        permit,
    )
    .await
    else {
        return unavailable();
    };
    match current().await {
        Ok(Some(actual)) if actual == generation => {}
        Ok(_) => return changed(),
        Err(_) => return unavailable(),
    }
    state
        .authority
        .disclose_asset(&access, || {
            response(
                if range.is_some() {
                    StatusCode::PARTIAL_CONTENT
                } else {
                    StatusCode::OK
                },
                out,
                Body::new(AssetBody::new(
                    opened,
                    bytes,
                    state.budget,
                    deadline,
                    state.stop,
                )),
            )
        })
        .unwrap_or_else(|_| changed())
}

fn range_of(value: &str, bytes: u64) -> Option<(u64, u64)> {
    let (start, end) = value.strip_prefix("bytes=")?.split_once('-')?;
    let number = |value: &str| {
        value
            .bytes()
            .all(|byte| byte.is_ascii_digit())
            .then(|| value.parse::<u64>().ok())
            .flatten()
            .filter(|value| *value <= (1u64 << 53) - 1)
    };
    let last = bytes.checked_sub(1)?;
    if start.is_empty() {
        let suffix = number(end)?;
        let start = bytes.saturating_sub(suffix);
        return (start <= last).then_some((start, last));
    }
    let start = number(start)?;
    let end = if end.is_empty() {
        last
    } else {
        number(end)?.min(last)
    };
    (start <= end).then_some((start, end))
}

fn insert(headers: &mut HeaderMap, name: header::HeaderName, value: impl AsRef<str>) {
    headers.insert(
        name,
        HeaderValue::from_str(value.as_ref()).expect("admitted header"),
    );
}

fn asset_headers(file: &Artifact, tag: &str, pinned: bool) -> HeaderMap {
    let mut headers = HeaderMap::new();
    insert(&mut headers, header::CONTENT_TYPE, &file.media_type);
    insert(&mut headers, header::X_CONTENT_TYPE_OPTIONS, "nosniff");
    insert(&mut headers, header::ACCEPT_RANGES, "bytes");
    insert(&mut headers, header::ETAG, tag);
    insert(
        &mut headers,
        header::CACHE_CONTROL,
        if file.access_domain != "public" {
            "private, no-store"
        } else if pinned {
            "public, max-age=31536000, immutable"
        } else {
            "no-cache"
        },
    );
    let base = file.media_type.split(';').next().unwrap_or_default();
    if !matches!(
        base,
        "image/png"
            | "image/jpeg"
            | "image/webp"
            | "image/gif"
            | "image/avif"
            | "model/gltf-binary"
            | "application/json"
    ) && !["audio/", "video/", "font/"]
        .iter()
        .any(|prefix| base.starts_with(prefix))
    {
        insert(&mut headers, header::CONTENT_DISPOSITION, "attachment");
        insert(
            &mut headers,
            header::CONTENT_SECURITY_POLICY,
            "sandbox; default-src 'none'",
        );
    }
    headers
}

fn response(status: StatusCode, headers: HeaderMap, body: Body) -> Response {
    let mut response = Response::new(body);
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    response
}

fn failure(status: StatusCode, reason: &str) -> Response {
    let mut headers = HeaderMap::new();
    insert(&mut headers, header::CACHE_CONTROL, "no-store");
    response(status, headers, Body::from(reason.to_owned()))
}

fn unavailable() -> Response {
    failure(
        StatusCode::SERVICE_UNAVAILABLE,
        "Asset preparation failed. Pull the selected assets and try again.",
    )
}

fn denied(reason: &str) -> Response {
    let mut response = failure(StatusCode::FORBIDDEN, reason);
    insert(
        response.headers_mut(),
        header::CACHE_CONTROL,
        "private, no-store",
    );
    response
}

struct OpenAsset {
    file: File,
    transfer: Arc<OwnedSemaphorePermit>,
}

struct VerificationStop(Arc<AtomicBool>);
impl Drop for VerificationStop {
    fn drop(&mut self) {
        self.0.store(true, Ordering::Relaxed);
    }
}

async fn verified_file(
    root: &Path,
    asset: &Artifact,
    offset: u64,
    budget: &ByteBudget,
    permit: OwnedSemaphorePermit,
) -> Option<OpenAsset> {
    let workspace = budget.reserve(CHUNK_BYTES + 4096).ok()?;
    let stop = VerificationStop(Arc::default());
    let cancellation = Arc::clone(&stop.0);
    let root = root.to_owned();
    let digest = asset.sha256.clone();
    let size = asset.bytes;
    let path = root
        .join(&asset.boundary)
        .join(&asset.access_domain)
        .join(&digest);
    // Each blocking callback owns its bytes and permit even if the HTTP
    // caller is dropped. Cancellation interrupts verification between reads.
    tokio::task::spawn_blocking(move || -> Option<OpenAsset> {
        let _workspace = workspace;
        let path = path.canonicalize().ok()?;
        if !path.starts_with(&root) || !path.metadata().ok()?.is_file() {
            return None;
        }
        let mut file = File::open(path).ok()?;
        let metadata = file.metadata().ok()?;
        if !metadata.is_file() || !metadata.permissions().readonly() || metadata.len() != size {
            return None;
        }
        let mut remaining = size;
        let mut hasher = Sha256::new();
        let mut buffer = vec![0; remaining.clamp(1, CHUNK_BYTES as u64) as usize];
        while remaining > 0 {
            if cancellation.load(Ordering::Relaxed) {
                return None;
            }
            let length = remaining.min(CHUNK_BYTES as u64) as usize;
            file.read_exact(&mut buffer[..length]).ok()?;
            hasher.update(&buffer[..length]);
            remaining -= length as u64;
        }
        if file.read(&mut buffer[..1]).ok()? != 0
            || hex_bytes(&hasher.finalize()) != digest
            || file.seek(SeekFrom::Start(offset)).ok()? != offset
        {
            return None;
        }
        Some(OpenAsset {
            file,
            transfer: Arc::new(permit),
        })
    })
    .await
    .ok()
    .flatten()
}

struct OwnedChunk {
    data: Vec<u8>,
    _reservation: ByteReservation,
    _transfer: Arc<OwnedSemaphorePermit>,
}
impl AsRef<[u8]> for OwnedChunk {
    fn as_ref(&self) -> &[u8] {
        &self.data
    }
}

type PendingRead = JoinHandle<io::Result<(OpenAsset, Bytes)>>;
struct AssetBody {
    ready: Option<OpenAsset>,
    reading: Option<PendingRead>,
    remaining: u64,
    budget: ByteBudget,
    stopped: Pin<Box<dyn Future<Output = ()> + Send>>,
    deadline: Pin<Box<tokio::time::Sleep>>,
}

impl AssetBody {
    fn new(
        opened: OpenAsset,
        remaining: u64,
        budget: ByteBudget,
        deadline: Instant,
        mut stop: watch::Receiver<bool>,
    ) -> Self {
        Self {
            ready: Some(opened),
            reading: None,
            remaining,
            budget,
            deadline: Box::pin(sleep_until(deadline)),
            stopped: Box::pin(async move {
                let _ = stop.wait_for(|closed| *closed).await;
            }),
        }
    }

    fn finish(&mut self) {
        self.remaining = 0;
        drop(self.ready.take());
        if let Some(reading) = self.reading.take() {
            reading.abort();
        }
    }
}

impl Drop for AssetBody {
    fn drop(&mut self) {
        self.finish();
    }
}

impl HttpBody for AssetBody {
    type Data = Bytes;
    type Error = io::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Bytes>, io::Error>>> {
        if self.remaining == 0 {
            return Poll::Ready(None);
        }
        if self.deadline.as_mut().poll(cx).is_ready() || self.stopped.as_mut().poll(cx).is_ready() {
            self.finish();
            return Poll::Ready(Some(Err(io::Error::new(
                io::ErrorKind::TimedOut,
                "Asset transfer ended",
            ))));
        }
        if let Some(mut opened) = self.ready.take() {
            let length = self.remaining.min(CHUNK_BYTES as u64) as usize;
            let Ok(custody) = self.budget.reserve(length + 256) else {
                self.finish();
                return Poll::Ready(Some(Err(io::Error::other(
                    "Asset output capacity exhausted",
                ))));
            };
            self.reading = Some(tokio::task::spawn_blocking(move || {
                let mut data = vec![0; length];
                opened.file.read_exact(&mut data)?;
                let bytes = Bytes::from_owner(OwnedChunk {
                    data,
                    _reservation: custody,
                    _transfer: Arc::clone(&opened.transfer),
                });
                Ok((opened, bytes))
            }));
        }
        let read = self.reading.as_mut().expect("a read owns the open file");
        let Poll::Ready(result) = Pin::new(read).poll(cx) else {
            return Poll::Pending;
        };
        self.reading = None;
        match result.map_err(io::Error::other).and_then(|result| result) {
            Ok((opened, bytes)) => {
                self.remaining -= bytes.len() as u64;
                if self.remaining != 0 {
                    self.ready = Some(opened);
                }
                Poll::Ready(Some(Ok(Frame::data(bytes))))
            }
            Err(error) => {
                self.finish();
                Poll::Ready(Some(Err(error)))
            }
        }
    }

    fn is_end_stream(&self) -> bool {
        self.remaining == 0
    }

    fn size_hint(&self) -> SizeHint {
        SizeHint::with_exact(self.remaining)
    }
}
