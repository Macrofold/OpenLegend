//! The bridge owns operational threads and buffers. Gameplay is added through
//! concrete simulation owners; this foundation exposes no generic world write.

pub mod geometry;
pub mod pool;
pub mod records;
mod world;

use napi::bindgen_prelude::BufferSlice;
use napi::{Error, Result, Status};
use napi_derive::napi;
use pool::{ByteBudget, HostError, HostPool};
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;

const HOST_BYTE_ALLOWANCE: usize = 128 * 1024 * 1024;
const OPEN: u8 = 0;
const CLOSING: u8 = 1;
const SHUTDOWN_PENDING: u8 = 2;
const CLOSED: u8 = 3;
const UNAVAILABLE: u8 = 4;

static HOST: OnceLock<Mutex<Option<Arc<HostRuntime>>>> = OnceLock::new();

#[napi(string_enum)]
pub enum HostPhase {
    Open,
    Closing,
    ShutdownPending,
    Closed,
    Unavailable,
}

#[napi(object)]
pub struct HostStatus {
    pub phase: HostPhase,
    pub workers: u32,
    pub pending_jobs: u32,
    pub pending_bytes: u32,
    pub peak_bytes: u32,
    pub byte_allowance: u32,
    pub resident_reserved_bytes: f64,
    pub peak_resident_reserved_bytes: f64,
    pub pending_save_reserved_bytes: f64,
    pub peak_pending_save_reserved_bytes: f64,
    pub closing: bool,
    pub poisoned: bool,
    pub error: Option<String>,
}

#[napi(object)]
pub struct NativeBuildInfo {
    pub package_version: String,
    pub rust_version: String,
    pub target: String,
    pub profile: String,
    pub source_sha256: Option<String>,
    pub features: Option<Vec<String>>,
    pub rust_flags: Option<String>,
}

struct HostRuntime {
    pool: HostPool,
    bytes: ByteBudget,
    phase: AtomicU8,
    poisoned: AtomicBool,
    error: Mutex<Option<String>>,
    worlds: Mutex<Vec<Arc<world::WorldRuntime>>>,
}

impl HostRuntime {
    fn status(&self) -> Result<HostStatus> {
        let integer = |value| {
            u32::try_from(value).map_err(|_| failure("native host count exceeds its bridge range"))
        };
        Ok(HostStatus {
            phase: match self.phase.load(Ordering::Acquire) {
                OPEN => HostPhase::Open,
                CLOSING => HostPhase::Closing,
                SHUTDOWN_PENDING => HostPhase::ShutdownPending,
                CLOSED => HostPhase::Closed,
                _ => HostPhase::Unavailable,
            },
            workers: integer(self.pool.workers())?,
            pending_jobs: integer(self.pool.outstanding().map_err(host_error)?)?,
            pending_bytes: integer(self.bytes.used())?,
            peak_bytes: integer(self.bytes.peak())?,
            byte_allowance: integer(self.bytes.limit())?,
            // These are owned allocation bounds, not process RSS. Captured
            // shared bodies remain counted until their final owner releases.
            resident_reserved_bytes: self.bytes.resident().used() as f64,
            peak_resident_reserved_bytes: self.bytes.resident().peak() as f64,
            pending_save_reserved_bytes: self.bytes.pending_save_used() as f64,
            peak_pending_save_reserved_bytes: self.bytes.pending_save_peak() as f64,
            closing: self.pool.is_closing(),
            poisoned: self.poisoned.load(Ordering::Acquire),
            error: self
                .error
                .lock()
                .map_err(|_| failure("native host error state is unavailable"))?
                .clone(),
        })
    }

    fn begin_shutdown(runtime: &Arc<Self>) -> Result<()> {
        {
            let worlds = runtime
                .worlds
                .lock()
                .map_err(|_| failure("native world registry unavailable"))?;
            if worlds.iter().any(|world| !world.stopped()) {
                return Err(failure(
                    "native worlds must finish their actual save and stop barriers before host shutdown",
                ));
            }
            // Installation registers under this same short control lock and
            // rechecks admission. It cannot arrive between this test and close.
            runtime.pool.close_admission();
        }
        let previous = runtime.phase.load(Ordering::Acquire);
        if previous == CLOSING || previous == CLOSED {
            return Ok(());
        }
        if previous == UNAVAILABLE {
            return Err(failure(
                "native host is unavailable; its original shutdown outcome must be resolved",
            ));
        }
        if runtime
            .phase
            .compare_exchange(previous, CLOSING, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return Ok(());
        }
        let retained = Arc::clone(runtime);
        let launch = thread::Builder::new()
            .name("openlegend-shutdown".into())
            .spawn(move || {
                // This lifecycle thread never computes gameplay or resolves callbacks.
                // Joining cannot consume a compute worker or block Node's main thread.
                let result = catch_unwind(AssertUnwindSafe(|| {
                    retained.pool.shutdown(Duration::from_secs(5))
                }));
                match result {
                    Ok(Ok(())) => {
                        if retained.bytes.used() != 0
                            || retained.bytes.resident().used() != 0
                            || retained.bytes.pending_save_used() != 0
                        {
                            // Detached outputs/captures can outlive computation.
                            // Joining workers does not release their actual memory
                            // or permit a fresh host to borrow that allowance.
                            retained.phase.store(SHUTDOWN_PENDING, Ordering::Release);
                            return;
                        }
                        retained.phase.store(CLOSED, Ordering::Release);
                        if let Ok(mut registry) = registry().lock()
                            && registry
                                .as_ref()
                                .is_some_and(|current| Arc::ptr_eq(current, &retained))
                        {
                            *registry = None;
                        }
                    }
                    Ok(Err(HostError::ShutdownIncomplete)) => {
                        // The global owner retains the pool and its reservations.
                        // Another request observes/finishes this same shutdown.
                        retained.phase.store(SHUTDOWN_PENDING, Ordering::Release);
                    }
                    Ok(Err(error)) => retained.unavailable(error.to_string()),
                    Err(_) => retained.unavailable("native shutdown panicked".into()),
                }
            });
        if let Err(error) = launch {
            runtime.phase.store(SHUTDOWN_PENDING, Ordering::Release);
            return Err(failure(format!("native shutdown could not start: {error}")));
        }
        Ok(())
    }

    fn unavailable(&self, reason: String) {
        self.pool.close_admission();
        self.poisoned.store(true, Ordering::Release);
        self.phase.store(UNAVAILABLE, Ordering::Release);
        if let Ok(mut error) = self.error.lock() {
            *error = Some(reason);
        }
    }
}

#[napi]
pub struct NativeHost {
    runtime: Arc<HostRuntime>,
}

#[napi]
impl NativeHost {
    #[napi(constructor)]
    pub fn new(workers: f64) -> Result<Self> {
        boundary(|| {
            let available = thread::available_parallelism()
                .map_err(|_| failure("native host CPU allowance is unavailable"))?
                .get();
            if !workers.is_finite()
                || workers.fract() != 0.0
                || workers < 1.0
                || workers > available as f64
            {
                return Err(Error::new(
                    Status::InvalidArg,
                    "workers must be an integer within the host CPU allowance",
                ));
            }
            let mut registry = registry()
                .lock()
                .map_err(|_| failure("native host registry is unavailable"))?;
            if registry.is_some() {
                return Err(failure(
                    "a native host already owns the process compute pool",
                ));
            }
            let runtime = Arc::new(HostRuntime {
                pool: HostPool::new(workers as usize).map_err(host_error)?,
                bytes: ByteBudget::new(HOST_BYTE_ALLOWANCE),
                phase: AtomicU8::new(OPEN),
                poisoned: AtomicBool::new(false),
                error: Mutex::new(None),
                worlds: Mutex::new(Vec::new()),
            });
            *registry = Some(Arc::clone(&runtime));
            Ok(Self { runtime })
        })
    }

    /// Opening must admit its encoded input before a resident world exists.
    /// This grants capacity only, with the same lifetime as world consumers.
    #[napi]
    pub fn reserve_consumer_bytes(&self, bytes: f64) -> Result<world::NativeWorldConsumer> {
        boundary(|| {
            if self.runtime.pool.is_closing() {
                return Err(failure("native consumer admission is closed"));
            }
            world::NativeWorldConsumer::reserve_bytes(bytes, &self.runtime.bytes)
        })
    }
    #[napi]
    pub fn reserve_consumer_json(
        &self,
        bytes: BufferSlice<'_>,
    ) -> Result<world::NativeWorldConsumer> {
        boundary(|| {
            if self.runtime.pool.is_closing() {
                return Err(failure("native consumer admission is closed"));
            }
            world::NativeWorldConsumer::reserve_json(&bytes, &self.runtime.bytes)
        })
    }

    /// This status reads control metadata only, never tentative gameplay state.
    #[napi]
    pub fn status(&self) -> Result<HostStatus> {
        boundary(|| self.runtime.status())
    }

    /// The host must finish its required save barrier before closing. Poll status
    /// to observe successful joining; a pending timeout keeps capacity owned.
    #[napi]
    pub fn request_shutdown(&self) -> Result<HostStatus> {
        boundary(|| {
            HostRuntime::begin_shutdown(&self.runtime)?;
            self.runtime.status()
        })
    }
}

impl Drop for NativeHost {
    fn drop(&mut self) {
        // Abandonment requests the same cleanup. The registry retains ownership
        // if cancellation cannot finish; GC is never a successful release receipt.
        let _ = catch_unwind(AssertUnwindSafe(|| {
            HostRuntime::begin_shutdown(&self.runtime)
        }));
    }
}

#[napi]
pub fn native_host_status() -> Result<Option<HostStatus>> {
    boundary(|| {
        registry()
            .lock()
            .map_err(|_| failure("native host registry is unavailable"))?
            .as_ref()
            .map(|runtime| runtime.status())
            .transpose()
    })
}

#[napi]
pub fn native_build_info() -> Result<NativeBuildInfo> {
    boundary(|| {
        Ok(NativeBuildInfo {
            package_version: env!("CARGO_PKG_VERSION").into(),
            rust_version: env!("OPENLEGEND_RUST_VERSION").into(),
            target: env!("OPENLEGEND_TARGET").into(),
            profile: env!("OPENLEGEND_PROFILE").into(),
            source_sha256: option_env!("OPENLEGEND_NATIVE_SOURCE_SHA256").map(str::to_owned),
            features: option_env!("OPENLEGEND_NATIVE_FEATURES")
                .map(|value| {
                    serde_json::from_str(value)
                        .map_err(|_| failure("native build feature identity is invalid"))
                })
                .transpose()?,
            rust_flags: option_env!("OPENLEGEND_RUST_FLAGS").map(str::to_owned),
        })
    })
}

fn registry() -> &'static Mutex<Option<Arc<HostRuntime>>> {
    HOST.get_or_init(|| Mutex::new(None))
}

fn host_error(error: HostError) -> Error {
    failure(error.to_string())
}

fn failure(reason: impl Into<String>) -> Error {
    Error::new(Status::GenericFailure, reason.into())
}

fn boundary<T>(operation: impl FnOnce() -> Result<T>) -> Result<T> {
    catch_unwind(AssertUnwindSafe(operation))
        .map_err(|_| failure("native bridge panicked; runtime is unavailable"))?
}
