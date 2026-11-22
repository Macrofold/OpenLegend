//! One world replacement can be admitted while the current listener is live.
//! Keep the request independent of the HTTP connection that submitted it.

use crate::authority::{AuthorizedScope, RequestScope};
use openlegend_simulation::host::ByteReservation;
use std::sync::{Arc, Mutex};
use tokio::sync::Notify;
use uuid::Uuid;

pub(crate) struct LoadRequest {
    pub(crate) id: Uuid,
    pub(crate) slot: String,
    pub(crate) authorized: Arc<AuthorizedScope>,
    pub(crate) custody: ByteReservation,
}

#[derive(Clone)]
struct Identity {
    id: Uuid,
    slot: String,
    account: String,
    timeline: String,
}

impl Identity {
    fn of(request: &LoadRequest) -> Self {
        Self {
            id: request.id,
            slot: request.slot.clone(),
            account: request.authorized.scope.account_id.clone(),
            timeline: request.authorized.scope.timeline_id.clone(),
        }
    }

    fn matches(&self, scope: &RequestScope, slot: &str, timeline: &str) -> bool {
        self.slot == slot && self.account == scope.account_id && self.timeline == timeline
    }
}

enum Active {
    Waiting(LoadRequest),
    Draining(Identity),
}

#[derive(Default)]
struct Queue {
    active: Option<Active>,
    refused: Option<(Identity, ByteReservation)>,
}

#[derive(Clone, Copy)]
pub(crate) enum LoadState {
    Pending,
    Refused,
    Conflict,
    Missing,
}

#[derive(Default)]
pub(crate) struct LoadInbox {
    queue: Mutex<Queue>,
    ready: Notify,
}

impl LoadInbox {
    /// Submit within the current save grant's disclosure boundary. Only the
    /// launch supervisor may take the operation out of the waiting slot.
    pub(crate) fn submit(&self, request: LoadRequest) -> Result<LoadState, ()> {
        let mut queue = self.queue.lock().map_err(|_| ())?;
        let scope = &request.authorized.scope;
        let state = queue.state(scope, request.id, &request.slot, &scope.timeline_id);
        if !matches!(state, LoadState::Missing) {
            return Ok(state);
        }
        if queue.active.is_some() {
            return Err(());
        }
        queue.active = Some(Active::Waiting(request));
        self.ready.notify_one();
        Ok(LoadState::Pending)
    }

    pub(crate) fn status(
        &self,
        scope: &RequestScope,
        id: Uuid,
        slot: &str,
        timeline: &str,
    ) -> Result<LoadState, ()> {
        Ok(self
            .queue
            .lock()
            .map_err(|_| ())?
            .state(scope, id, slot, timeline))
    }

    pub(super) async fn next(&self) -> Result<LoadRequest, ()> {
        loop {
            {
                let mut queue = self.queue.lock().map_err(|_| ())?;
                if matches!(queue.active, Some(Active::Waiting(_))) {
                    let Some(Active::Waiting(request)) = queue.active.take() else {
                        unreachable!("checked the waiting load under the same lock")
                    };
                    queue.active = Some(Active::Draining(Identity::of(&request)));
                    return Ok(request);
                }
            }
            self.ready.notified().await;
        }
    }

    pub(super) fn finish(&self, request: LoadRequest, refused: bool) -> Result<(), ()> {
        let mut queue = self.queue.lock().map_err(|_| ())?;
        let Some(Active::Draining(active)) = queue.active.take() else {
            return Err(());
        };
        if request.id != active.id {
            return Err(());
        }
        if refused {
            queue.refused = Some((active, request.custody));
        }
        Ok(())
    }
}

impl Queue {
    fn state(&self, scope: &RequestScope, id: Uuid, slot: &str, timeline: &str) -> LoadState {
        if let Some(Active::Waiting(request)) = &self.active
            && request.id == id
        {
            return if request.slot == slot
                && request.authorized.scope.account_id == scope.account_id
                && request.authorized.scope.timeline_id == timeline
            {
                LoadState::Pending
            } else {
                LoadState::Conflict
            };
        }
        if let Some(Active::Draining(identity)) = &self.active
            && identity.id == id
        {
            return if identity.matches(scope, slot, timeline) {
                LoadState::Pending
            } else {
                LoadState::Conflict
            };
        }
        match &self.refused {
            Some((identity, _)) if identity.id == id => {
                if identity.matches(scope, slot, timeline) {
                    LoadState::Refused
                } else {
                    LoadState::Conflict
                }
            }
            _ => LoadState::Missing,
        }
    }
}
