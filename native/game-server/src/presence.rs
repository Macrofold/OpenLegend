//! Page visibility belongs to the application. A heartbeat never changes a
//! body or grants control, and an older report cannot replace a newer one.

use crate::authority::{
    AccessError, Authority, AuthorizedScope, Capability, ControlChange, ControlOperation,
    ControlRequest, DepartureControl,
};
use indexmap::IndexMap;
use openlegend_simulation::host::{ByteBudget, ByteReservation, map_storage};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::time::Instant;

const LIVE: Duration = Duration::from_secs(12);

pub(crate) struct Presence {
    authority: Arc<Authority>,
    state: Mutex<State>,
    capacity: usize,
    budget: ByteBudget,
}

struct State {
    pages: IndexMap<(String, String), Page>,
    custody: ByteReservation,
    next_check: Option<Instant>,
}

struct Page {
    scope: Arc<AuthorizedScope>,
    order: Option<u64>,
    visible: bool,
    admitted: bool,
    abandoned: bool,
    streams: usize,
    background: bool,
    pending_return: bool,
    at: Instant,
    _custody: ByteReservation,
}

pub(crate) struct StreamPresence {
    owner: Arc<Presence>,
    page: Arc<AuthorizedScope>,
}

pub(crate) struct ControlPresence {
    owner: Arc<Presence>,
    returning: Option<Arc<AuthorizedScope>>,
    inserted: bool,
    released: Option<Arc<AuthorizedScope>>,
}

impl Presence {
    pub(crate) fn new(
        authority: Arc<Authority>,
        capacity: usize,
        budget: ByteBudget,
    ) -> Result<Self, AccessError> {
        let custody = budget.reserve(0).map_err(|_| AccessError::Busy)?;
        Ok(Self {
            authority,
            state: Mutex::new(State {
                pages: IndexMap::new(),
                custody,
                next_check: None,
            }),
            capacity,
            budget,
        })
    }

    pub(crate) fn visible(&self) -> Result<bool, AccessError> {
        let state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let now = Instant::now();
        Ok(state.pages.values().any(|page| {
            self.current(page, now)
                && (page.visible && now.saturating_duration_since(page.at) <= LIVE
                    || page.streams > 0 && page.background)
        }))
    }

    // An occupied tab remains present during a short focus transition. The
    // ordinary acquire selection can only take over an unattended control.
    pub(crate) fn controller_present(&self, actor: &str) -> Result<bool, AccessError> {
        let state = self.state.lock().map_err(|_| AccessError::Availability)?;
        Ok(self.has_controller(&state, actor))
    }

    /// The caller has finished the protected writer drain and receipt lookup.
    /// Hold the presence lock through fencing so the latest valid heartbeat
    /// decides whether an ordinary acquisition may replace an unattended tab.
    pub(crate) fn fence_control(
        self: &Arc<Self>,
        authorized: &AuthorizedScope,
        request: ControlRequest,
    ) -> Result<(ControlChange, ControlPresence), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let acquire = request.operation == ControlOperation::Acquire;
        let releasing = request.operation == ControlOperation::Release;
        let unattended = acquire && !self.has_controller(&state, &authorized.scope.actor_id);
        if acquire
            && !unattended
            && !self
                .authority
                .current(authorized, Capability::Play, false, |_, controls| controls)?
        {
            return Err(AccessError::Changed);
        }
        let change = self
            .authority
            .fence_control(authorized, request, unattended)?;
        let returning = change.returning_scope().cloned();
        let inserted = if let Some(scope) = &returning {
            let key = page_key(scope);
            if let Some(page) = state.pages.get_mut(&key) {
                page.pending_return = true;
                false
            } else {
                let now = Instant::now();
                self.admit_page(&mut state, now)?;
                let custody = self.budget.reserve(8192).map_err(|_| AccessError::Busy)?;
                state.pages.insert(
                    key,
                    Page {
                        scope: scope.clone(),
                        order: None,
                        visible: false,
                        admitted: false,
                        abandoned: false,
                        streams: 0,
                        background: false,
                        pending_return: true,
                        at: now,
                        _custody: custody,
                    },
                );
                true
            }
        } else {
            false
        };
        Ok((
            change,
            ControlPresence {
                owner: self.clone(),
                returning,
                inserted,
                released: releasing
                    .then(|| {
                        state
                            .pages
                            .get(&page_key(authorized))
                            .map(|page| page.scope.clone())
                    })
                    .flatten(),
            },
        ))
    }

    fn has_controller(&self, state: &State, actor: &str) -> bool {
        let now = Instant::now();
        state
            .pages
            .values()
            .any(|page| page.scope.scope.actor_id == actor && self.current(page, now))
    }

    fn current(&self, page: &Page, now: Instant) -> bool {
        !page.pending_return
            && page.live(now)
            && self
                .authority
                .current(&page.scope, Capability::Play, true, |_, _| ())
                .is_ok()
    }

    fn admit_page(&self, state: &mut State, now: Instant) -> Result<(), AccessError> {
        if state.pages.len() >= self.capacity {
            state.pages.retain(|_, page| {
                page.pending_return || page.admitted || page.streams > 0 || page.live(now)
            });
            if state.pages.len() >= self.capacity {
                return Err(AccessError::Busy);
            }
        }
        if state.pages.len() == state.pages.capacity() {
            let limit = state.pages.len().saturating_mul(2).saturating_add(4);
            let bytes = map_storage::<(String, String), Page>(limit)
                .ok_or(AccessError::Busy)?
                .max(state.custody.bytes());
            let funded = self.budget.reserve(bytes).map_err(|_| AccessError::Busy)?;
            state.pages.try_reserve(1).map_err(|_| AccessError::Busy)?;
            state.custody = funded;
        }
        Ok(())
    }

    pub(crate) fn report(
        &self,
        authorized: Arc<AuthorizedScope>,
        shown: bool,
        order: Option<u64>,
    ) -> Result<bool, AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        self.authority
            .current(&authorized, Capability::Play, true, |scope, _| {
                let now = Instant::now();
                let key = page_key(&authorized);
                if let Some(page) = state.pages.get_mut(&key) {
                    if page.scope.scope.control_generation == scope.control_generation
                        && order
                            .zip(page.order)
                            .is_some_and(|(current, prior)| current <= prior)
                    {
                        return Ok(false);
                    }
                    let transition = page.visible != shown
                        || now.saturating_duration_since(page.at) > LIVE
                        || page.scope.scope.control_generation != scope.control_generation;
                    if order.is_some()
                        || page.scope.scope.control_generation != scope.control_generation
                    {
                        page.order = order;
                    }
                    page.scope = authorized.clone();
                    page.admitted = true;
                    page.abandoned = !shown && page.streams == 0;
                    page.visible = shown;
                    page.at = now;
                    Self::schedule(&mut state, if shown { now + LIVE } else { now });
                    return Ok(transition);
                }
                self.admit_page(&mut state, now)?;
                let custody = self.budget.reserve(8192).map_err(|_| AccessError::Busy)?;
                state.pages.insert(
                    key,
                    Page {
                        scope: authorized.clone(),
                        order,
                        visible: shown,
                        admitted: true,
                        abandoned: !shown,
                        streams: 0,
                        background: false,
                        pending_return: false,
                        at: now,
                        _custody: custody,
                    },
                );
                Self::schedule(&mut state, if shown { now + LIVE } else { now });
                Ok(true)
            })?
    }

    /// A controlling response owns one transport lease. Its destructor never
    /// clears the successor generation's page or an independently held stream.
    pub(crate) fn connect(
        self: &Arc<Self>,
        authorized: Arc<AuthorizedScope>,
        background: bool,
    ) -> Result<Option<StreamPresence>, AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        self.authority
            .current(&authorized, Capability::Play, false, |_, controls| {
                if !controls {
                    return Ok(None);
                }
                let now = Instant::now();
                let key = page_key(&authorized);
                if !state.pages.contains_key(&key) {
                    self.admit_page(&mut state, now)?;
                    state.pages.insert(
                        key.clone(),
                        Page {
                            scope: authorized.clone(),
                            order: None,
                            visible: false,
                            admitted: true,
                            abandoned: false,
                            streams: 0,
                            background,
                            pending_return: false,
                            at: now,
                            _custody: self.budget.reserve(8192).map_err(|_| AccessError::Busy)?,
                        },
                    );
                }
                let page = state.pages.get_mut(&key).ok_or(AccessError::Availability)?;
                if page.scope.scope.control_generation != authorized.scope.control_generation {
                    return Err(AccessError::Changed);
                }
                page.admitted = true;
                page.abandoned = false;
                page.background = background;
                page.streams = page.streams.checked_add(1).ok_or(AccessError::Busy)?;
                Ok(Some(StreamPresence {
                    owner: self.clone(),
                    page: authorized.clone(),
                }))
            })?
    }

    pub(crate) fn session_ended(&self, session: &str) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        for page in state
            .pages
            .values_mut()
            .filter(|page| page.scope.scope.session_id == session)
        {
            page.abandoned = true;
            page.visible = false;
            page.streams = 0;
        }
        Self::schedule(&mut state, Instant::now());
        Ok(())
    }

    /// The ordinary clock has an empty fast path. Only an actual transport
    /// loss or a reached heartbeat deadline can require a protected check.
    pub(crate) fn departure_due(&self) -> Result<bool, AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let now = Instant::now();
        if state.next_check.is_none_or(|deadline| deadline > now) {
            return Ok(false);
        }
        Ok(Self::lost_page(&mut state, now).is_some())
    }

    /// Recheck presence after entering the protected world lane, then fence
    /// the exact lost controller while holding the same lock as reports.
    pub(crate) fn fence_departure(&self) -> Result<Option<DepartureControl>, AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let scope = Self::lost_page(&mut state, Instant::now()).map(|page| page.scope.clone());
        scope
            .map(|scope| self.authority.fence_departure(scope))
            .transpose()
    }

    fn lost_page(state: &mut State, now: Instant) -> Option<&Page> {
        let mut next = None;
        let mut candidate = None;
        for page in state.pages.values() {
            if page.pending_return || !page.admitted {
                continue;
            }
            if !page.live(now) {
                candidate = Some(page);
                next = Some(now);
                break;
            }
            if page.streams == 0 {
                let deadline = page.at + LIVE;
                next = Some(next.map_or(deadline, |prior: Instant| prior.min(deadline)));
            }
        }
        state.next_check = next;
        candidate
    }

    pub(crate) fn departure_finished(&self, scope: &AuthorizedScope) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let key = page_key(scope);
        if state.pages.get(&key).is_some_and(|page| {
            page.scope.scope.control_generation == scope.scope.control_generation
                && !page.pending_return
        }) {
            state.pages.swap_remove(&key);
        }
        Ok(())
    }

    fn schedule(state: &mut State, at: Instant) {
        state.next_check = Some(state.next_check.map_or(at, |prior| prior.min(at)));
    }
}

impl Page {
    fn live(&self, now: Instant) -> bool {
        !self.abandoned && (self.streams > 0 || now.saturating_duration_since(self.at) < LIVE)
    }
}

impl Drop for StreamPresence {
    fn drop(&mut self) {
        if let Ok(mut state) = self.owner.state.lock()
            && let Some(page) = state.pages.get_mut(&page_key(&self.page))
            && page.scope.scope.control_generation == self.page.scope.control_generation
            && page.streams > 0
        {
            page.streams -= 1;
            if page.streams == 0 {
                page.abandoned = true;
                page.visible = false;
                Presence::schedule(&mut state, Instant::now());
            }
        }
    }
}

fn page_key(authorized: &AuthorizedScope) -> (String, String) {
    (
        authorized.scope.session_id.clone(),
        authorized.scope.connection_id.clone(),
    )
}

impl ControlPresence {
    /// Activate the preadmitted page after the protected commit. This blocks
    /// automatic replacement during LA233's first-heartbeat grace, without
    /// counting the page as visible or starting the clock.
    pub(crate) fn confirmed(mut self, change: ControlChange) -> Result<(), AccessError> {
        let mut state = self
            .owner
            .state
            .lock()
            .map_err(|_| AccessError::Availability)?;
        if let Some(scope) = change.confirmed()? {
            let page = state
                .pages
                .get_mut(&page_key(&scope))
                .ok_or(AccessError::Availability)?;
            page.scope = scope.clone();
            page.order = None;
            page.visible = false;
            page.admitted = true;
            page.abandoned = false;
            page.streams = 0;
            page.background = false;
            page.pending_return = false;
            page.at = Instant::now();
            let due = page.at + LIVE;
            Presence::schedule(&mut state, due);
            self.returning = None;
            let actor = &scope.scope.actor_id;
            let generation = scope.scope.control_generation;
            state.pages.retain(|_, page| {
                page.scope.scope.actor_id != *actor
                    || page.scope.scope.control_generation == generation
            });
        } else if let Some(scope) = self.released.take() {
            let key = page_key(&scope);
            if state.pages.get(&key).is_some_and(|page| {
                page.scope.scope.control_generation == scope.scope.control_generation
            }) {
                state.pages.swap_remove(&key);
            }
        }
        Ok(())
    }
}

impl Drop for ControlPresence {
    fn drop(&mut self) {
        if let Some(scope) = &self.returning
            && let Ok(mut state) = self.owner.state.lock()
        {
            let key = page_key(scope);
            if self.inserted {
                state.pages.swap_remove(&key);
            } else if let Some(page) = state.pages.get_mut(&key) {
                page.pending_return = false;
            }
        }
    }
}
