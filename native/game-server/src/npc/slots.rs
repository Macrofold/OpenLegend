//! Provider work holds one ordered decision place for its resident, without
//! holding the world writer or another resident's place.

use crate::store::StoreError;
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use std::{
    collections::BTreeMap,
    sync::{Arc, Mutex},
};
use tokio::sync::watch;

pub(super) struct Slots {
    budget: ByteBudget,
    maximum: usize,
    active: Mutex<Active>,
    changed: watch::Sender<u64>,
}

#[derive(Default)]
struct Active {
    by_actor: BTreeMap<String, Arc<Resident>>,
    by_request: BTreeMap<String, Arc<Resident>>,
    closed: bool,
}

pub(super) struct DecisionSlot {
    owner: Arc<Slots>,
    pub(super) resident: Arc<Resident>,
}

pub(super) struct Resident {
    actor: String,
    id: String,
    pub(super) account: Option<String>,
    pub(super) timeline: String,
    pub(super) stop: watch::Sender<bool>,
    done: watch::Sender<bool>,
    _custody: ByteReservation,
}

pub(super) enum Admission {
    Accepted(DecisionSlot),
    Held(watch::Receiver<bool>),
    Capacity(watch::Receiver<u64>),
    Closed,
}

impl Slots {
    pub(super) fn new(budget: ByteBudget, maximum: usize) -> Self {
        Self {
            budget,
            maximum,
            active: Mutex::new(Active::default()),
            changed: watch::channel(0).0,
        }
    }

    pub(super) fn select(
        self: &Arc<Self>,
        npc: &str,
        id: &str,
        account: Option<&str>,
        timeline: &str,
    ) -> Result<Admission, StoreError> {
        let mut active = self
            .active
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        if active.closed {
            return Ok(Admission::Closed);
        }
        if let Some(found) = active
            .by_request
            .get(id)
            .or_else(|| active.by_actor.get(npc))
        {
            return Ok(Admission::Held(found.done.subscribe()));
        }
        if active.by_actor.len() >= self.maximum {
            return Ok(Admission::Capacity(self.changed.subscribe()));
        }
        let custody = self
            .budget
            .reserve(
                2048 + 2 * npc.len() + 2 * id.len() + timeline.len() + account.map_or(0, str::len),
            )
            .map_err(|_| StoreError::Capacity)?;
        let resident = Arc::new(Resident {
            actor: npc.to_owned(),
            id: id.to_owned(),
            timeline: timeline.to_owned(),
            account: account.map(str::to_owned),
            stop: watch::channel(false).0,
            done: watch::channel(false).0,
            _custody: custody,
        });
        active
            .by_actor
            .insert(resident.actor.clone(), resident.clone());
        active
            .by_request
            .insert(resident.id.clone(), resident.clone());
        Ok(Admission::Accepted(DecisionSlot {
            owner: self.clone(),
            resident,
        }))
    }

    pub(super) fn selected(&self, id: &str) -> Result<Option<Arc<Resident>>, StoreError> {
        Ok(self
            .active
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?
            .by_request
            .get(id)
            .cloned())
    }

    pub(super) fn available(&self, actor: &str) -> Result<bool, StoreError> {
        let active = self
            .active
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        Ok(!active.closed
            && active.by_actor.len() < self.maximum
            && !active.by_actor.contains_key(actor))
    }

    pub(super) async fn stop(&self) -> Result<(), StoreError> {
        let mut ended = self.changed.subscribe();
        {
            let mut active = self
                .active
                .lock()
                .map_err(|_| StoreError::WriterUnavailable)?;
            active.closed = true;
            for pending in active.by_actor.values() {
                pending.stop.send_replace(true);
            }
        }
        loop {
            if self
                .active
                .lock()
                .map_err(|_| StoreError::WriterUnavailable)?
                .by_actor
                .is_empty()
            {
                return Ok(());
            }
            ended
                .changed()
                .await
                .map_err(|_| StoreError::WriterUnavailable)?;
        }
    }
}

impl Drop for DecisionSlot {
    fn drop(&mut self) {
        let mut active = self
            .owner
            .active
            .lock()
            .expect("decision ordering owner poisoned");
        active.by_actor.remove(&self.resident.actor);
        active.by_request.remove(&self.resident.id);
        self.resident.done.send_replace(true);
        self.owner.changed.send_modify(|count| *count += 1);
    }
}
