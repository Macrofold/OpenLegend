//! Page visibility belongs to the application. A heartbeat never changes a
//! body or grants control, and an older report cannot replace a newer one.

use crate::authority::{AccessError, Authority, AuthorizedScope, Capability};
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
    at: Instant,
    _custody: ByteReservation,
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
        let now = Instant::now();
        Ok(state
            .pages
            .values()
            .any(|page| page.scope.scope.actor_id == actor && self.current(page, now)))
    }

    fn current(&self, page: &Page, now: Instant) -> bool {
        now.saturating_duration_since(page.at) <= LIVE
            && self
                .authority
                .current(&page.scope, Capability::Play, true, |_, _| ())
                .is_ok()
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
                let key = (scope.session_id.clone(), scope.connection_id.clone());
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
                if state.pages.len() >= self.capacity {
                    state
                        .pages
                        .retain(|_, page| now.saturating_duration_since(page.at) <= LIVE);
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
                let custody = self.budget.reserve(8192).map_err(|_| AccessError::Busy)?;
                state.pages.insert(
                    key,
                    Page {
                        scope: authorized.clone(),
                        order,
                        visible: shown,
                        at: now,
                        _custody: custody,
                    },
                );
                Ok(true)
            })?
    }
}
