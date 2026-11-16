//! One runnable outer operation per world. Borrowed Rayon children must never
//! steal work that waits for the session locked by their own suspended parent.
//! docs/projects/native-runtime-foundations-tech-design.md#r0--one-runnable-outer-call-per-world

use super::{HostRuntime, WorldRuntime};
use crate::pool::{Cancellation, HostError, WorkAdmission};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use std::{
    collections::VecDeque,
    mem::size_of,
    sync::{Arc, Mutex},
};

type Job = Box<dyn FnOnce(&Arc<HostRuntime>, &Arc<WorldRuntime>) + Send>;

pub(super) struct SerialDispatch {
    state: Mutex<Pending>,
    _storage: ByteReservation,
}
struct Pending {
    running: bool,
    jobs: VecDeque<Job>,
}

impl SerialDispatch {
    pub(super) fn new(budget: &ByteBudget, capacity: usize) -> Result<Self, HostError> {
        let mut storage = budget.reserve(
            capacity
                .checked_mul(size_of::<Job>())
                .ok_or(HostError::Capacity)?,
        )?;
        let mut jobs = VecDeque::new();
        jobs.try_reserve_exact(capacity)
            .map_err(|_| HostError::Capacity)?;
        storage.resize(
            jobs.capacity()
                .checked_mul(size_of::<Job>())
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

    fn enter(&self, job: Job) -> Option<Job> {
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

    fn leave(&self) -> Option<Job> {
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
pub(super) fn submit_world<T, F, C>(
    host: &Arc<HostRuntime>,
    world: &Arc<WorldRuntime>,
    run: F,
    complete: C,
) -> Result<(), HostError>
where
    T: Send + 'static,
    F: FnOnce(&Arc<HostRuntime>, &Arc<WorldRuntime>, &Cancellation) -> Result<T, HostError>
        + Send
        + 'static,
    C: FnOnce(Result<T, HostError>) + Send + 'static,
{
    let admitted = host.pool.admit()?;
    let storage = host
        .bytes
        .reserve(size_of::<(F, C, WorkAdmission, ByteReservation)>())?;
    let job: Job = Box::new(move |host, world| {
        let _storage = storage;
        admitted.run(
            |cancel| run(host, world, cancel),
            complete,
            || world.fence.poison(),
        );
    });
    if let Some(job) = world.dispatch.enter(job) {
        schedule(host, world, job);
    }
    Ok(())
}

fn schedule(host: &Arc<HostRuntime>, world: &Arc<WorldRuntime>, job: Job) {
    let turn = Running {
        host: Arc::clone(host),
        world: Arc::clone(world),
    };
    host.pool.schedule(move || turn.run(job));
}

struct Running {
    host: Arc<HostRuntime>,
    world: Arc<WorldRuntime>,
}
impl Running {
    fn run(self, job: Job) {
        job(&self.host, &self.world);
    }
}
impl Drop for Running {
    fn drop(&mut self) {
        if std::thread::panicking() {
            self.world.fence.poison();
        }
        if let Some(job) = self.world.dispatch.leave() {
            schedule(&self.host, &self.world, job);
        }
    }
}
