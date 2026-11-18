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
    _storage: ByteReservation,
}
struct Pending<H, W> {
    running: bool,
    jobs: VecDeque<Job<H, W>>,
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
                jobs,
            }),
            _storage: storage,
        })
    }

    fn enter(&self, job: Job<H, W>) -> Option<Job<H, W>> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        if state.running {
            // The already admitted active job and waiters all use one host
            // allowance. The queue backing cannot grow beyond that allowance.
            state.jobs.push_back(job);
            None
        } else {
            state.running = true;
            Some(job)
        }
    }

    fn leave(&self) -> Option<Job<H, W>> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let next = state.jobs.pop_front();
        if next.is_none() {
            state.running = false;
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
    let admitted = host.pool().admit()?;
    let cancellation = admitted.cancellation();
    let storage = host
        .budget()
        .reserve(size_of::<(F, C, WorkAdmission, ByteReservation)>())?;
    let job: Job<H, W> = Box::new(move |host, world| {
        let _storage = storage;
        admitted.run(
            |cancel| run(host, world, cancel),
            complete,
            || world.poison(),
        );
    });
    if let Some(job) = world.dispatch().enter(job) {
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
