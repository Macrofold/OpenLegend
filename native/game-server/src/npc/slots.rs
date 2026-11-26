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
    waiting_actors: BTreeMap<String, usize>,
    waiting_capacity: usize,
    closed: bool,
}

pub(super) enum SlotPriority<'a> {
    Ordinary,
    Foreground,
    Send(&'a mut WaitingSend),
}

/// An explicit Send owns this priority only after encountering a busy slot.
/// Releasing the HTTP attempt also releases its actor and capacity preference.
pub(super) struct WaitingSend {
    owner: Arc<Slots>,
    waiting: Option<(String, bool, ByteReservation)>,
}

impl WaitingSend {
    fn mark(&mut self, active: &mut Active, actor: &str, capacity: bool) -> Result<(), StoreError> {
        if let Some((prior, prior_capacity, _)) = self.waiting.as_mut()
            && prior == actor
        {
            if *prior_capacity != capacity {
                if capacity {
                    active.waiting_capacity += 1;
                } else {
                    active.waiting_capacity -= 1;
                }
                *prior_capacity = capacity;
            }
            return Ok(());
        }
        let custody = self
            .owner
            .budget
            .reserve(512 + 2 * actor.len())
            .map_err(|_| StoreError::Capacity)?;
        self.clear(active);
        *active.waiting_actors.entry(actor.to_owned()).or_default() += 1;
        active.waiting_capacity += usize::from(capacity);
        self.waiting = Some((actor.to_owned(), capacity, custody));
        Ok(())
    }

    fn clear(&mut self, active: &mut Active) {
        if let Some((actor, capacity, _)) = self.waiting.take() {
            let count = active.waiting_actors.get_mut(&actor).unwrap();
            *count -= 1;
            if *count == 0 {
                active.waiting_actors.remove(&actor);
            }
            active.waiting_capacity -= usize::from(capacity);
        }
    }

    pub(super) fn is_waiting(&self) -> bool {
        self.waiting.is_some()
    }
}

impl Drop for WaitingSend {
    fn drop(&mut self) {
        if self.is_waiting() {
            let owner = self.owner.clone();
            self.clear(
                &mut owner
                    .active
                    .lock()
                    .expect("decision ordering owner poisoned"),
            );
            owner.changed.send_modify(|revision| *revision += 1);
        }
    }
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
    pub(super) fn changes(&self) -> watch::Receiver<u64> {
        self.changed.subscribe()
    }

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
        priority: SlotPriority<'_>,
    ) -> Result<Admission, StoreError> {
        let mut active = self
            .active
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        if active.closed {
            return Ok(Admission::Closed);
        }
        if let Some(ended) = active
            .by_request
            .get(id)
            .or_else(|| active.by_actor.get(npc))
            .map(|found| found.done.subscribe())
        {
            if let SlotPriority::Send(waiting) = priority {
                waiting.mark(&mut active, npc, false)?;
            }
            return Ok(Admission::Held(ended));
        }
        if active.by_actor.len() >= self.maximum {
            if let SlotPriority::Send(waiting) = priority {
                waiting.mark(&mut active, npc, true)?;
            }
            return Ok(Admission::Capacity(self.changed.subscribe()));
        }
        if matches!(priority, SlotPriority::Ordinary) && active.has_waiting_send(npc) {
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
        if let SlotPriority::Send(waiting) = priority {
            waiting.clear(&mut active);
        }
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
        self.available_for_background(actor, true)
    }

    /// Advisory availability for a directed Send. The actual POST owns
    /// the bounded waiting registration and repeats current checks.
    pub(super) fn accepting_sends(&self) -> Result<bool, StoreError> {
        Ok(!self
            .active
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?
            .closed)
    }

    pub(super) fn waiting_send(self: &Arc<Self>) -> WaitingSend {
        WaitingSend {
            owner: self.clone(),
            waiting: None,
        }
    }

    pub(super) fn available_for_background(
        &self,
        actor: &str,
        urgent: bool,
    ) -> Result<bool, StoreError> {
        let active = self
            .active
            .lock()
            .map_err(|_| StoreError::WriterUnavailable)?;
        Ok(!active.closed
            && active.by_actor.len() < self.maximum
            && !active.by_actor.contains_key(actor)
            && (urgent || !active.has_waiting_send(actor)))
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

impl Active {
    fn has_waiting_send(&self, actor: &str) -> bool {
        self.waiting_capacity > 0 || self.waiting_actors.contains_key(actor)
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
