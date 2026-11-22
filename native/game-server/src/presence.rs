//! Page visibility belongs to the application. A heartbeat never changes a
//! body or grants control, and an older report cannot replace a newer one.

use crate::authority::{
    AccessError, Authority, AuthorizedScope, Capability, ControlChange, ControlOperation,
    ControlRequest,
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
}

struct Page {
    scope: Arc<AuthorizedScope>,
    order: Option<u64>,
    visible: bool,
    pending_return: bool,
    at: Instant,
    _custody: ByteReservation,
}

pub(crate) struct ControlPresence {
    owner: Arc<Presence>,
    returning: Option<Arc<AuthorizedScope>>,
    inserted: bool,
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
            }),
            capacity,
            budget,
        })
    }

    pub(crate) fn visible(&self) -> Result<bool, AccessError> {
        let state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let now = Instant::now();
        Ok(state
            .pages
            .values()
            .any(|page| page.visible && self.current(page, now)))
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
            && now.saturating_duration_since(page.at) <= LIVE
            && self
                .authority
                .current(&page.scope, Capability::Play, true, |_, _| ())
                .is_ok()
    }

    fn admit_page(&self, state: &mut State, now: Instant) -> Result<(), AccessError> {
        if state.pages.len() >= self.capacity {
            state.pages.retain(|_, page| {
                page.pending_return || now.saturating_duration_since(page.at) <= LIVE
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
                    page.visible = shown;
                    page.at = now;
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
                        pending_return: false,
                        at: now,
                        _custody: custody,
                    },
                );
                Ok(true)
            })?
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
            page.scope = scope;
            page.order = None;
            page.visible = false;
            page.pending_return = false;
            page.at = Instant::now();
            self.returning = None;
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
