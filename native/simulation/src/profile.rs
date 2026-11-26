//! The diagnostic-only boundary shared by the simulation, worker and server.
//! The host owns clocks, retention and export. Probe results never enter a
//! simulation decision or a durable record.

use std::{
    cell::Cell,
    future::{Future, poll_fn},
    marker::PhantomData,
    pin::pin,
    rc::Rc,
    sync::{
        OnceLock,
        atomic::{AtomicU32, Ordering},
    },
};

pub mod sites;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Site {
    index: u8,
    id: &'static str,
    unit: &'static str,
}

impl Site {
    pub const fn numbered(index: u8, id: &'static str, unit: &'static str) -> Self {
        Self { index, id, unit }
    }

    pub const fn id(self) -> &'static str {
        self.id
    }

    pub const fn unit(self) -> &'static str {
        self.unit
    }

    pub const fn index(self) -> u8 {
        self.index
    }

    pub const fn mask(self) -> u64 {
        if self.index < u64::BITS as u8 {
            1u64 << self.index
        } else {
            0
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    Completed,
    Refused,
    Cancelled,
    Failed,
}

pub fn result_outcome<T, E>(result: &Result<T, E>) -> Outcome {
    if result.is_ok() {
        Outcome::Completed
    } else {
        Outcome::Failed
    }
}

/// New operations may carry in from warmup. Existing operations can settle
/// through the drain, while counters describe only the measured window.
#[derive(Clone, Copy)]
pub enum ObservationWindow {
    Start,
    Count,
    Continue,
}

/// A capture and invocation identity. Slot reuse is fenced by the invocation
/// ID. This value owns no recorder, world, job, or transport resource.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Link {
    generation: u32,
    slot: u16,
    id: u64,
    site: Site,
}

impl Link {
    pub const fn new(generation: u32, slot: u16, id: u64, site: Site) -> Self {
        Self {
            generation,
            slot,
            id,
            site,
        }
    }

    pub const fn generation(self) -> u32 {
        self.generation
    }

    pub const fn slot(self) -> usize {
        self.slot as usize
    }

    pub const fn id(self) -> u64 {
        self.id
    }

    pub const fn site(self) -> Site {
        self.site
    }
}

/// All callbacks are optional and must be bounded, nonblocking and
/// nonpanicking. A host decline has no bearing on the game operation.
pub trait Observer: Sync {
    fn selected(&self, site: Site) -> bool;
    fn generation(&self) -> u32;
    fn begin(&self, site: Site, parent: Option<Link>) -> Option<Link>;
    fn resume(&self, link: Link, lane: u32, active_parent: Option<Link>) -> bool;
    fn suspend(&self, link: Link, lane: u32);
    fn end(&self, link: Link, outcome: Outcome, work: Option<u64>);
    fn count(&self, site: Site, value: u64);
    fn omitted(&self, generation: u32, window: ObservationWindow);
}

static OBSERVER: OnceLock<&'static dyn Observer> = OnceLock::new();
static NEXT_LANE: AtomicU32 = AtomicU32::new(1);

#[derive(Clone, Copy, Default)]
struct ThreadContext {
    logical: Option<Link>,
    active: Option<Link>,
}

thread_local! {
    static CONTEXT: Cell<ThreadContext> = const { Cell::new(ThreadContext {
        logical: None,
        active: None,
    }) };
    static LANE: u32 = NEXT_LANE.fetch_add(1, Ordering::Relaxed);
}

pub fn install(observer: &'static dyn Observer) -> bool {
    OBSERVER.set(observer).is_ok()
}

#[doc(hidden)]
#[inline]
pub fn observer_for(site: Site) -> Option<&'static dyn Observer> {
    OBSERVER
        .get()
        .copied()
        .filter(|observer| observer.selected(site))
}

pub fn selected(site: Site) -> bool {
    observer_for(site).is_some()
}

pub fn generation() -> u32 {
    OBSERVER.get().map_or(0, |observer| observer.generation())
}

pub fn current() -> Option<Link> {
    let generation = generation();
    if generation == 0 {
        return None;
    }
    CONTEXT
        .try_with(|context| context.get().logical)
        .ok()
        .flatten()
        .filter(|link| generation == link.generation())
}

/// Scope for an inherited logical parent. Drop before yielding or awaiting.
pub struct Context {
    previous: Option<ThreadContext>,
    _thread: PhantomData<Rc<()>>,
}

impl Context {
    fn enter(value: ThreadContext) -> Self {
        Self {
            previous: CONTEXT.try_with(|context| context.replace(value)).ok(),
            _thread: PhantomData,
        }
    }
}

impl Drop for Context {
    fn drop(&mut self) {
        if let Some(previous) = self.previous {
            let _ = CONTEXT.try_with(|context| context.set(previous));
        }
    }
}

pub fn attach(parent: Option<Link>) -> Context {
    match parent {
        Some(parent) => Context::enter(ThreadContext {
            logical: Some(parent),
            active: None,
        }),
        None => Context {
            previous: None,
            _thread: PhantomData,
        },
    }
}

pub async fn carry<F: Future>(parent: Option<Link>, future: F) -> F::Output {
    if parent.is_none() {
        return future.await;
    }
    let mut future = pin!(future);
    poll_fn(move |cx| {
        let _parent = attach(parent);
        future.as_mut().poll(cx)
    })
    .await
}

/// A logical operation can move between workers between active segments.
pub struct Operation {
    link: Option<Link>,
    outcome: Outcome,
    work: Option<u64>,
    _one_owner: PhantomData<Cell<()>>,
}

pub fn begin(site: Site) -> Operation {
    Operation {
        link: observer_for(site).and_then(|observer| observer.begin(site, current())),
        outcome: Outcome::Cancelled,
        work: Some(0),
        _one_owner: PhantomData,
    }
}

impl Operation {
    pub const fn link(&self) -> Option<Link> {
        self.link
    }

    pub const fn is_observed(&self) -> bool {
        self.link.is_some()
    }

    pub fn outcome(&mut self, outcome: Outcome) {
        self.outcome = outcome;
    }

    pub fn work(&mut self, amount: u64) {
        if self.link.is_some() {
            self.work = self.work.and_then(|work| work.checked_add(amount));
        }
    }

    pub fn finish(mut self, outcome: Outcome) {
        self.outcome(outcome);
    }

    /// A missed terminal observation remains censored when its capture stops.
    pub fn omit_finish(&mut self) {
        self.link = None;
    }

    pub fn segment(&self) -> Segment {
        Segment::enter(self.link)
    }
}

impl Drop for Operation {
    fn drop(&mut self) {
        if let Some((link, observer)) = self.link.zip(OBSERVER.get().copied()) {
            let outcome = if std::thread::panicking() {
                Outcome::Failed
            } else {
                self.outcome
            };
            observer.end(link, outcome, self.work);
        }
    }
}

/// One actual execution segment. It is tied to the current thread by its
/// context guard, so callers cannot move an active segment across an await.
pub struct Segment {
    link: Option<Link>,
    lane: u32,
    _context: Context,
}

impl Segment {
    fn enter(link: Option<Link>) -> Self {
        let mut lane = 0;
        let mut active = None;
        if let Some((link, observer)) = link.zip(OBSERVER.get().copied())
            && let Ok(thread) = LANE.try_with(|lane| *lane)
        {
            let parent = CONTEXT
                .try_with(|context| context.get().active)
                .ok()
                .flatten();
            if observer.resume(link, thread, parent) {
                lane = thread;
                active = Some(link);
            }
        }
        let context = if let Some(active) = active {
            Context::enter(ThreadContext {
                logical: Some(active),
                active: Some(active),
            })
        } else {
            attach(link)
        };
        Self {
            link: active,
            lane,
            _context: context,
        }
    }
}

impl Drop for Segment {
    fn drop(&mut self) {
        if let Some((link, observer)) = self.link.zip(OBSERVER.get().copied()) {
            observer.suspend(link, self.lane);
        }
    }
}

/// A single synchronous operation. Suspend before ending, including on unwind.
pub struct Scope {
    _segment: Segment,
    operation: Operation,
}

pub fn sync(site: Site) -> Scope {
    let mut operation = begin(site);
    operation.outcome(Outcome::Completed);
    Scope {
        _segment: operation.segment(),
        operation,
    }
}

impl Scope {
    pub const fn link(&self) -> Option<Link> {
        self.operation.link()
    }

    pub const fn is_observed(&self) -> bool {
        self.operation.is_observed()
    }

    pub fn outcome(&mut self, outcome: Outcome) {
        self.operation.outcome(outcome);
    }

    pub fn work(&mut self, amount: u64) {
        self.operation.work(amount);
    }

    pub fn finish(mut self, outcome: Outcome) {
        self.outcome(outcome);
    }
}

pub async fn observe<F: Future>(site: Site, future: F) -> F::Output {
    observe_with(site, future, |_| Outcome::Completed).await
}

pub async fn observe_with<F, C>(site: Site, future: F, classify: C) -> F::Output
where
    F: Future,
    C: FnOnce(&F::Output) -> Outcome,
{
    let operation = begin(site);
    if !operation.is_observed() {
        return future.await;
    }
    let mut future = pin!(future);
    let link = operation.link();
    let result = poll_fn(move |cx| {
        let _segment = Segment::enter(link);
        future.as_mut().poll(cx)
    })
    .await;
    operation.finish(classify(&result));
    result
}

pub fn omitted(generation: u32, window: ObservationWindow) {
    if let Some(observer) = OBSERVER.get() {
        observer.omitted(generation, window);
    }
}
