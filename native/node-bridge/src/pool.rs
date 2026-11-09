//! One bounded compute pool per native host. Waiting for SQL, providers, capture
//! consumption or candidate settlement never occupies a compute job.

pub use openlegend_simulation::host::{ByteBudget, ByteReservation, CapacityError};
use rayon::{ThreadPool, ThreadPoolBuilder};
use std::fmt;
use std::panic::{AssertUnwindSafe, catch_unwind};
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
    requested: Arc<AtomicBool>,
    host_closing: Arc<AtomicBool>,
}

impl Cancellation {
    pub fn request(&self) {
        self.requested.store(true, Ordering::Release);
    }

    pub fn requested(&self) -> bool {
        self.requested.load(Ordering::Acquire) || self.host_closing.load(Ordering::Acquire)
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

    /// Only owned inputs enter this job. A job must complete its scoped parallel
    /// ranges and rollback before returning; detached rayon jobs are forbidden.
    /// `poison` marks the affected world, rather than poisoning unrelated worlds.
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
        if self.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed);
        }
        let control = self
            .control
            .lock()
            .map_err(|_| HostError::SynchronizationFailed)?;
        if self.closing.load(Ordering::Acquire) {
            return Err(HostError::Closed);
        }
        let pool = control.pool.as_ref().ok_or(HostError::Closed)?;
        let mut count = self
            .activity
            .count
            .lock()
            .map_err(|_| HostError::SynchronizationFailed)?;
        if *count >= self.max_outstanding {
            return Err(HostError::Busy);
        }
        *count += 1;
        drop(count);
        let cancellation = Cancellation {
            requested: Arc::new(AtomicBool::new(false)),
            host_closing: Arc::clone(&self.closing),
        };
        let job_cancellation = cancellation.clone();
        let permit = WorkPermit {
            activity: Arc::clone(&self.activity),
        };
        pool.spawn(move || {
            let _permit = permit;
            let result = if job_cancellation.requested() {
                Ok(Err(HostError::Cancelled))
            } else {
                catch_unwind(AssertUnwindSafe(|| work(&job_cancellation)))
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
        });
        Ok(cancellation)
    }

    pub fn close_admission(&self) {
        self.closing.store(true, Ordering::Release);
    }

    /// Run outside the Node main thread. Timeout retains this pool, its workers
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
