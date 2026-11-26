//! One runnable outer operation per world. Borrowed Rayon children must never
//! steal work that waits for the session locked by their own suspended parent.
//! docs/projects/native-runtime-foundations-tech-design.md#r0--one-runnable-outer-call-per-world

use crate::pool::{Cancellation, HostError, WorkAdmission};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use std::{
    collections::VecDeque,
    mem::size_of,
    sync::{Arc, Mutex},
};

pub trait DispatchHost: Send + Sync + 'static {
    fn pool(&self) -> &crate::pool::HostPool;
    fn budget(&self) -> &ByteBudget;
}

pub trait DispatchWorld<H>: Send + Sync + Sized + 'static {
    fn dispatch(&self) -> &SerialDispatch<H, Self>;
    fn poison(&self);
}

type Job<H, W> = Box<dyn FnOnce(&Arc<H>, &Arc<W>) + Send>;

pub struct SerialDispatch<H, W> {
    state: Mutex<Pending<H, W>>,
}
struct Pending<H, W> {
    running: bool,
    retiring: bool,
    jobs: VecDeque<Job<H, W>>,
    storage: Option<ByteReservation>,
}

impl<H, W> Pending<H, W> {
    fn release_queue(&mut self) {
        self.jobs = VecDeque::new();
        self.storage = None;
    }
}

impl<H, W> SerialDispatch<H, W> {
    pub fn new(budget: &ByteBudget, capacity: usize) -> Result<Self, HostError> {
        let mut storage = budget.reserve(
            capacity
                .checked_mul(size_of::<Job<H, W>>())
                .ok_or(HostError::Capacity)?,
        )?;
        let mut jobs = VecDeque::new();
        jobs.try_reserve_exact(capacity)
            .map_err(|_| HostError::Capacity)?;
        storage.resize(
            jobs.capacity()
                .checked_mul(size_of::<Job<H, W>>())
                .ok_or(HostError::Capacity)?,
        )?;
        Ok(Self {
            state: Mutex::new(Pending {
                running: false,
                retiring: false,
                jobs,
                storage: Some(storage),
            }),
        })
    }

    /// Stop accepting operations after the durable writer has stopped. Already
    /// queued calls finish in order. Free their queue backing and its charge
    /// after the last call, even if application handles still own the world.
    pub fn retire(&self) {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        state.retiring = true;
        if !state.running {
            state.release_queue();
        }
    }

    fn enter(&self, job: Job<H, W>) -> Result<Option<Job<H, W>>, HostError> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        if state.retiring {
            return Err(HostError::Closed);
        }
        if state.running {
            // The already admitted active job and waiters all use one host
            // allowance. The queue backing cannot grow beyond that allowance.
            state.jobs.push_back(job);
            Ok(None)
        } else {
            state.running = true;
            Ok(Some(job))
        }
    }

    fn leave(&self) -> Option<Job<H, W>> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let next = state.jobs.pop_front();
        if next.is_none() {
            state.running = false;
            if state.retiring {
                state.release_queue();
            }
        }
        next
    }
}

/// Each waiting closure owns admission and storage, but receives its world
/// and host from the runner at invocation. Queued callbacks must not capture
/// either owning Arc, directly or through a JS class.
pub fn submit_world<H, W, T, F, C>(
    host: &Arc<H>,
    world: &Arc<W>,
    run: F,
    complete: C,
) -> Result<Cancellation, HostError>
where
    H: DispatchHost,
    W: DispatchWorld<H>,
    T: Send + 'static,
    F: FnOnce(&Arc<H>, &Arc<W>, &Cancellation) -> Result<T, HostError> + Send + 'static,
    C: FnOnce(Result<T, HostError>) + Send + 'static,
{
    try_submit_world(host, world, || (run, complete))
}

/// Check the existing bounded admission before taking the caller's inputs.
/// A busy result leaves them with the caller and has run nothing. The queued
/// work and completion take ownership only on a successful submission.
pub fn try_submit_world<H, W, T, F, C>(
    host: &Arc<H>,
    world: &Arc<W>,
    prepare: impl FnOnce() -> (F, C),
) -> Result<Cancellation, HostError>
where
    H: DispatchHost,
    W: DispatchWorld<H>,
    T: Send + 'static,
    F: FnOnce(&Arc<H>, &Arc<W>, &Cancellation) -> Result<T, HostError> + Send + 'static,
    C: FnOnce(Result<T, HostError>) + Send + 'static,
{
    let admitted = host.pool().admit()?;
    let cancellation = admitted.cancellation();
    let storage = host
        .budget()
        .reserve(size_of::<(F, C, WorkAdmission, ByteReservation)>())?;
    let (run, complete) = prepare();
    #[cfg(feature = "profile-campaign")]
    capture::register(&cancellation);
    let job: Job<H, W> = Box::new(move |host, world| {
        let _storage = storage;
        admitted.run(
            |cancel| run(host, world, cancel),
            complete,
            || world.poison(),
        );
    });
    if let Some(job) = world.dispatch().enter(job)? {
        schedule(host, world, job);
    }
    Ok(cancellation)
}

fn schedule<H: DispatchHost, W: DispatchWorld<H>>(host: &Arc<H>, world: &Arc<W>, job: Job<H, W>) {
    let turn = Running {
        host: Arc::clone(host),
        world: Arc::clone(world),
    };
    host.pool().schedule(move || turn.run(job));
}

struct Running<H: DispatchHost, W: DispatchWorld<H>> {
    host: Arc<H>,
    world: Arc<W>,
}
impl<H: DispatchHost, W: DispatchWorld<H>> Running<H, W> {
    fn run(self, job: Job<H, W>) {
        job(&self.host, &self.world);
    }
}
impl<H: DispatchHost, W: DispatchWorld<H>> Drop for Running<H, W> {
    fn drop(&mut self) {
        if std::thread::panicking() {
            self.world.poison();
        }
        if let Some(job) = self.world.dispatch().leave() {
            schedule(&self.host, &self.world, job);
        }
    }
}

#[cfg(feature = "profile-campaign")]
pub(super) mod capture {
    use std::{
        collections::HashMap,
        sync::{Mutex, OnceLock, Weak},
    };

    use openlegend_simulation::profile::{
        self, Context, Link, ObservationWindow, Operation, Outcome, sites,
    };

    use crate::pool::{Cancellation, CancellationSignal};

    // Diagnostic custody is outside the game's closure reservation. The map
    // is strictly bounded, and the weak key owns no live job or world. A key
    // cannot be reused by a later job while this weak reference exists.
    const CAPACITY: usize = 1024;

    struct Queued {
        identity: Weak<CancellationSignal>,
        parent: Option<Link>,
        wait: Operation,
    }

    static QUEUED: OnceLock<Mutex<HashMap<usize, Queued>>> = OnceLock::new();

    pub(crate) fn register(cancellation: &Cancellation) {
        let generation = profile::generation();
        if generation == 0 {
            return;
        }
        let parent = profile::current().filter(|link| link.generation() == generation);
        if parent.is_none() && !profile::selected(sites::DISPATCH_WAIT) {
            return;
        }
        let Some(queue) = QUEUED.get() else { return };
        let Ok(mut queued) = queue.try_lock() else {
            profile::omitted(generation, ObservationWindow::Start);
            return;
        };
        if profile::generation() != generation {
            return;
        }
        if queued.len() == CAPACITY {
            // A missed lookup leaves its wait unobserved. Clear those keys
            // even while an independent caller still owns a cancellation handle.
            queued.retain(|_, entry| {
                let pending = entry
                    .identity
                    .upgrade()
                    .is_some_and(|signal| signal.profile_generation() == generation);
                if !pending {
                    entry.wait.omit_finish();
                }
                pending
            });
        }
        if queued.len() == CAPACITY {
            drop(queued);
            profile::omitted(generation, ObservationWindow::Start);
            return;
        }
        let wait = profile::begin(sites::DISPATCH_WAIT);
        if parent.is_none() && !wait.is_observed() {
            return;
        }
        queued.insert(
            cancellation.profile_key(),
            Queued {
                identity: cancellation.profile_identity(),
                parent,
                wait,
            },
        );
        cancellation.set_profile_generation(generation);
    }

    pub(crate) fn start(cancellation: &Cancellation, cancelled: bool) -> Context {
        let generation = cancellation.profile_generation();
        if generation == 0 {
            return profile::attach(None);
        }
        if profile::generation() != generation {
            cancellation.set_profile_generation(0);
            return profile::attach(None);
        }
        let entry = QUEUED
            .get()
            .and_then(|queue| queue.try_lock().ok()?.remove(&cancellation.profile_key()));
        cancellation.set_profile_generation(0);
        if let Some(entry) = entry {
            entry.wait.finish(if cancelled {
                Outcome::Cancelled
            } else {
                Outcome::Completed
            });
            return profile::attach(entry.parent);
        }
        // Even if wait timing was not selected, the lost parent association
        // makes the corresponding capture incomplete.
        profile::omitted(generation, ObservationWindow::Continue);
        profile::attach(None)
    }

    pub(super) fn prepare() -> bool {
        if QUEUED.get().is_some() {
            return true;
        }
        let mut queue = HashMap::new();
        queue.try_reserve(CAPACITY).is_ok() && QUEUED.set(Mutex::new(queue)).is_ok()
    }

    pub(super) fn clear() {
        if let Some(queued) = QUEUED.get() {
            // Called by the capture owner, never while holding a game lock.
            queued.lock().unwrap_or_else(|err| err.into_inner()).clear();
        }
    }
}

/// Reserve diagnostic scheduling storage during operator arming, outside any
/// gameplay lane. A refusal affects only the capture.
#[cfg(feature = "profile-campaign")]
pub fn prepare_profile_dispatch() -> bool {
    capture::prepare()
}

/// Discard optional scheduling metadata at capture stop. Game queue and
/// cancellation ownership remain with the dispatcher.
#[cfg(feature = "profile-campaign")]
pub fn clear_profile_dispatch() {
    capture::clear();
}
