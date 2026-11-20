//! One bounded compute pool per native host. Waiting for SQL, providers, capture
//! consumption or candidate settlement never occupies a compute job.

pub use openlegend_simulation::host::{ByteBudget, ByteReservation, CapacityError};
use rayon::{ThreadPool, ThreadPoolBuilder};
use std::fmt;
use std::panic::{AssertUnwindSafe, catch_unwind};
#[cfg(feature = "profile-campaign")]
use std::sync::atomic::AtomicU32;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

// Current typed action decoding exceeds the platform's small default worker
// stack in debug builds. This fixed per-worker allocation is part of host
// memory cost; it does not change record/depth admission or gameplay limits.
const COMPUTE_STACK_BYTES: usize = 8 * 1024 * 1024;

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum HostError {
    Busy,
    Closed,
    Cancelled,
    Poisoned,
    Capacity,
    InvalidWorkers,
    ShutdownIncomplete,
    WorkerFailed,
    SynchronizationFailed,
    ThreadCreation(String),
}

impl fmt::Display for HostError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Busy => formatter.write_str("native host compute capacity is busy"),
            Self::Closed => formatter.write_str("native host admission is closed"),
            Self::Cancelled => formatter.write_str("native work was cancelled before acceptance"),
            Self::Poisoned => formatter.write_str("native runtime is unavailable after a panic"),
            Self::Capacity => formatter.write_str("native host byte allowance is exhausted"),
            Self::InvalidWorkers => {
                formatter.write_str("native workers exceed the host CPU allowance")
            }
            Self::ShutdownIncomplete => {
                formatter.write_str("native shutdown still owns active work")
            }
            Self::WorkerFailed => {
                formatter.write_str("native worker did not shut down successfully")
            }
            Self::SynchronizationFailed => {
                formatter.write_str("native host synchronization failed")
            }
            Self::ThreadCreation(reason) => {
                write!(formatter, "native worker creation failed: {reason}")
            }
        }
    }
}

impl std::error::Error for HostError {}

impl From<CapacityError> for HostError {
    fn from(_: CapacityError) -> Self {
        Self::Capacity
    }
}

#[derive(Clone)]
pub struct Cancellation {
    signal: Arc<CancellationSignal>,
    host_closing: Arc<AtomicBool>,
}

pub(crate) struct CancellationSignal {
    requested: AtomicBool,
    #[cfg(feature = "profile-campaign")]
    profile_generation: AtomicU32,
}

// The profile tag fits in the padding of the existing Arc allocation. The
// Cancellation handle and every closure that captures it keep their size.
#[cfg(feature = "profile-campaign")]
const _: () = {
    assert!(std::mem::size_of::<CancellationSignal>() <= std::mem::size_of::<usize>());
    assert!(std::mem::align_of::<CancellationSignal>() <= std::mem::align_of::<usize>());
};

#[cfg(feature = "profile-campaign")]
impl CancellationSignal {
    pub(crate) fn profile_generation(&self) -> u32 {
        self.profile_generation.load(Ordering::Relaxed)
    }
}

impl Cancellation {
    pub fn request(&self) {
        self.signal.requested.store(true, Ordering::Release);
    }

    #[cfg(feature = "profile-campaign")]
    pub(crate) fn profile_key(&self) -> usize {
        Arc::as_ptr(&self.signal) as usize
    }

    #[cfg(feature = "profile-campaign")]
    pub(crate) fn profile_identity(&self) -> std::sync::Weak<CancellationSignal> {
        Arc::downgrade(&self.signal)
    }

    #[cfg(feature = "profile-campaign")]
    pub(crate) fn profile_generation(&self) -> u32 {
        self.signal.profile_generation()
    }

    #[cfg(feature = "profile-campaign")]
    pub(crate) fn set_profile_generation(&self, generation: u32) {
        self.signal
            .profile_generation
            .store(generation, Ordering::Relaxed);
    }

    pub fn requested(&self) -> bool {
        self.signal.requested.load(Ordering::Acquire) || self.host_closing.load(Ordering::Acquire)
    }
}

struct Activity {
    count: Mutex<usize>,
    changed: Condvar,
}

struct WorkPermit {
    activity: Arc<Activity>,
}

impl Drop for WorkPermit {
    fn drop(&mut self) {
        // This mutex never protects gameplay and is held only for this counter.
        let mut count = self
            .activity
            .count
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        *count -= 1;
        self.activity.changed.notify_all();
    }
}

pub(crate) struct WorkAdmission {
    cancellation: Cancellation,
    permit: WorkPermit,
}
impl WorkAdmission {
    pub(crate) fn cancellation(&self) -> Cancellation {
        self.cancellation.clone()
    }

    pub(crate) fn run<T>(
        self,
        work: impl FnOnce(&Cancellation) -> Result<T, HostError>,
        complete: impl FnOnce(Result<T, HostError>),
        poison: impl Fn(),
    ) {
        let Self {
            cancellation,
            permit: _permit,
        } = self;
        let cancelled = cancellation.requested();
        #[cfg(feature = "profile-campaign")]
        let _parent = crate::dispatch::capture::start(&cancellation, cancelled);
        let result = if cancelled {
            Ok(Err(HostError::Cancelled))
        } else {
            catch_unwind(AssertUnwindSafe(|| {
                #[cfg(feature = "profile-campaign")]
                let mut observation = openlegend_simulation::profile_scope!(DISPATCH_EXEC);
                let result = work(&cancellation);
                #[cfg(feature = "profile-campaign")]
                observation.outcome(match &result {
                    Ok(_) => openlegend_simulation::profile::Outcome::Completed,
                    Err(HostError::Cancelled) => openlegend_simulation::profile::Outcome::Cancelled,
                    Err(HostError::Busy | HostError::Capacity | HostError::Closed) => {
                        openlegend_simulation::profile::Outcome::Refused
                    }
                    Err(_) => openlegend_simulation::profile::Outcome::Failed,
                });
                result
            }))
        };
        let result = match result {
            Ok(result) => result,
            Err(_) => {
                let _ = catch_unwind(AssertUnwindSafe(&poison));
                Err(HostError::Poisoned)
            }
        };
        if catch_unwind(AssertUnwindSafe(|| complete(result))).is_err() {
            let _ = catch_unwind(AssertUnwindSafe(poison));
        }
    }
}

struct Control {
    pool: Option<ThreadPool>,
    joins: Vec<JoinHandle<()>>,
}

pub struct HostPool {
    workers: usize,
    max_outstanding: usize,
    closing: Arc<AtomicBool>,
    activity: Arc<Activity>,
    control: Mutex<Control>,
}

impl HostPool {
    pub fn new(workers: usize) -> Result<Self, HostError> {
        let available = thread::available_parallelism()
            .map_err(|_| HostError::InvalidWorkers)?
            .get();
        if workers == 0 || workers > available {
            return Err(HostError::InvalidWorkers);
        }
        let handles = Arc::new(Mutex::new(Vec::with_capacity(workers)));
        let spawn_handles = Arc::clone(&handles);
        let built = ThreadPoolBuilder::new()
            .num_threads(workers)
            .stack_size(COMPUTE_STACK_BYTES)
            .thread_name(|index| format!("openlegend-compute-{index}"))
            .spawn_handler(move |worker| {
                let mut builder = thread::Builder::new();
                if let Some(name) = worker.name() {
                    builder = builder.name(name.to_owned());
                }
                if let Some(size) = worker.stack_size() {
                    builder = builder.stack_size(size);
                }
                let handle = builder.spawn(|| worker.run())?;
                spawn_handles
                    .lock()
                    .unwrap_or_else(|error| error.into_inner())
                    .push(handle);
                Ok(())
            })
            .build();
        let pool = match built {
            Ok(pool) => pool,
            Err(error) => {
                // Rayon closes its partially built registry. Join any workers
                // already created instead of detaching them on setup failure.
                let joins =
                    std::mem::take(&mut *handles.lock().unwrap_or_else(|error| error.into_inner()));
                for worker in joins {
                    let _ = worker.join();
                }
                return Err(HostError::ThreadCreation(error.to_string()));
            }
        };
        let joins = std::mem::take(
            &mut *handles
                .lock()
                .map_err(|_| HostError::SynchronizationFailed)?,
        );
        Ok(Self {
            workers,
            // NSC-L02 bounds all queued/running outer work across this host.
            // Unadmitted ranges remain caller-owned cursors, not queued jobs.
            max_outstanding: workers.checked_mul(2).ok_or(HostError::InvalidWorkers)?,
            closing: Arc::new(AtomicBool::new(false)),
            activity: Arc::new(Activity {
                count: Mutex::new(0),
                changed: Condvar::new(),
            }),
            control: Mutex::new(Control {
                pool: Some(pool),
                joins,
            }),
        })
    }

    pub fn workers(&self) -> usize {
        self.workers
    }

    pub fn is_closing(&self) -> bool {
        self.closing.load(Ordering::Acquire)
    }

    pub fn outstanding(&self) -> Result<usize, HostError> {
        self.activity
            .count
            .lock()
            .map(|count| *count)
            .map_err(|_| HostError::SynchronizationFailed)
    }

    /// Waiting outer calls own the same host permit as runnable calls. A
    /// caller that waits outside Rayon must schedule or drop that permit.
    pub(crate) fn admit(&self) -> Result<WorkAdmission, HostError> {
        if self.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed);
        }
        openlegend_simulation::profile_call!(
            HOST_ADMIT,
            {
                let control = self
                    .control
                    .lock()
                    .map_err(|_| HostError::SynchronizationFailed)?;
                if self.closing.load(Ordering::Acquire) || control.pool.is_none() {
                    return Err(HostError::Closed);
                }
                let mut count = self
                    .activity
                    .count
                    .lock()
                    .map_err(|_| HostError::SynchronizationFailed)?;
                if *count >= self.max_outstanding {
                    return Err(HostError::Busy);
                }
                *count += 1;
                Ok(WorkAdmission {
                    cancellation: Cancellation {
                        signal: Arc::new(CancellationSignal {
                            requested: AtomicBool::new(false),
                            #[cfg(feature = "profile-campaign")]
                            profile_generation: AtomicU32::new(0),
                        }),
                        host_closing: Arc::clone(&self.closing),
                    },
                    permit: WorkPermit {
                        activity: Arc::clone(&self.activity),
                    },
                })
            },
            |outcome: &Result<_, _>| match outcome {
                Ok(_) => openlegend_simulation::profile::Outcome::Completed,
                Err(HostError::Busy | HostError::Capacity | HostError::Closed) =>
                    openlegend_simulation::profile::Outcome::Refused,
                Err(_) => openlegend_simulation::profile::Outcome::Failed,
            }
        )
    }

    pub fn capacity(&self) -> usize {
        self.max_outstanding
    }

    /// The closure owns an existing WorkAdmission. Shutdown cannot retire the
    /// registry while that permit is live, even after admission has closed.
    pub(crate) fn schedule(&self, work: impl FnOnce() + Send + 'static) {
        self.control
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .pool
            .as_ref()
            .expect("admitted work keeps the host pool alive")
            .spawn(work);
    }

    /// Only owned inputs enter this job. Complete scoped ranges and rollback
    /// before returning. Detached Rayon work can outlive neither the admission
    /// nor its captured inputs.
    pub fn submit<T, F, C, P>(
        &self,
        work: F,
        complete: C,
        poison: P,
    ) -> Result<Cancellation, HostError>
    where
        T: Send + 'static,
        F: FnOnce(&Cancellation) -> Result<T, HostError> + Send + 'static,
        C: FnOnce(Result<T, HostError>) + Send + 'static,
        P: Fn() + Send + 'static,
    {
        self.submit_with(|| (work, complete, poison))
    }

    /// Admit one job before taking its inputs. If the pool is busy, the
    /// caller can keep its existing owned input and no work has been queued.
    pub fn submit_with<T, F, C, P>(
        &self,
        prepare: impl FnOnce() -> (F, C, P),
    ) -> Result<Cancellation, HostError>
    where
        T: Send + 'static,
        F: FnOnce(&Cancellation) -> Result<T, HostError> + Send + 'static,
        C: FnOnce(Result<T, HostError>) + Send + 'static,
        P: Fn() + Send + 'static,
    {
        let admitted = self.admit()?;
        let (work, complete, poison) = prepare();
        let cancellation = admitted.cancellation();
        #[cfg(feature = "profile-campaign")]
        crate::dispatch::capture::register(&cancellation);
        self.schedule(move || admitted.run(work, complete, poison));
        Ok(cancellation)
    }

    pub fn close_admission(&self) {
        self.closing.store(true, Ordering::Release);
    }

    /// Run outside the async I/O runtime. Timeout retains this pool, its workers
    /// and every active reservation; it is not a successful release. The caller
    /// may observe/finish the same shutdown after the original jobs settle.
    pub fn shutdown(&self, allowance: Duration) -> Result<(), HostError> {
        self.close_admission();
        let deadline = Instant::now()
            .checked_add(allowance)
            .ok_or(HostError::ShutdownIncomplete)?;
        let mut count = self
            .activity
            .count
            .lock()
            .map_err(|_| HostError::SynchronizationFailed)?;
        while *count != 0 {
            let remaining = deadline
                .checked_duration_since(Instant::now())
                .ok_or(HostError::ShutdownIncomplete)?;
            let (next, result) = self
                .activity
                .changed
                .wait_timeout(count, remaining)
                .map_err(|_| HostError::SynchronizationFailed)?;
            count = next;
            if result.timed_out() && *count != 0 {
                return Err(HostError::ShutdownIncomplete);
            }
        }
        drop(count);
        let mut control = self
            .control
            .lock()
            .map_err(|_| HostError::SynchronizationFailed)?;
        // No admitted job remains and admission is closed. Dropping the Rayon
        // registry signals its idle workers before joining their actual threads.
        drop(control.pool.take());
        let joins = std::mem::take(&mut control.joins);
        drop(control);
        let mut failed = false;
        for worker in joins {
            failed |= worker.join().is_err();
        }
        if failed {
            Err(HostError::WorkerFailed)
        } else {
            Ok(())
        }
    }
}

impl Drop for HostPool {
    fn drop(&mut self) {
        // Explicit asynchronous shutdown is the successful lifecycle boundary.
        // Abandoned handles still cancel cooperative work and close admission;
        // callbacks retain their owned buffers until that work actually ends.
        self.closing.store(true, Ordering::Release);
    }
}
