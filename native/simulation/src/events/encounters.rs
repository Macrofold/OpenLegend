//! Fixed-position private encounter evidence uses the same automatic admission
//! owner as ordinary events. Only its account placement is deferred. Open
//! queues are part of candidate closure and nested rollback, never saved state.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{
    Awareness, AwarenessEncoding, AwarenessInput, acquire_awareness_accounts,
    prepare_awareness_admission,
};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::PhysicalState;
use std::{mem::size_of, sync::Arc};

fn invalid() -> ExecutionError {
    ExecutionError::UnfinishedOccurrence
}
mod staging;
pub(crate) use staging::{EncounterNoticeKind, StagedEncounter};
struct Token {
    _reservation: ByteReservation,
}
#[derive(Clone)]
pub(crate) struct EncounterBatch {
    serial: u64,
    token: Arc<Token>,
}
pub(crate) enum EventAccountPlacement {
    Immediate,
    Encounter(EncounterBatch),
}
struct QueuedAwareness {
    value: Awareness,
    encoding: AwarenessEncoding,
    _reservation: ByteReservation,
}
struct Pending {
    entries: Vec<Arc<QueuedAwareness>>,
    _reservation: ByteReservation,
}
impl Pending {
    fn empty(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            entries: Vec::new(),
            _reservation: budget.reserve(0)?,
        })
    }
    fn copy(&self, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let _reservation = budget.reserve(
            self.entries
                .len()
                .checked_mul(size_of::<Arc<QueuedAwareness>>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut entries = Vec::new();
        entries
            .try_reserve_exact(self.entries.len())
            .map_err(|_| ExecutionError::Capacity)?;
        entries.extend(self.entries.iter().cloned());
        Ok(Self {
            entries,
            _reservation,
        })
    }
    fn reserve(&mut self, additional: usize) -> Result<(), ExecutionError> {
        let needed = self
            .entries
            .len()
            .checked_add(additional)
            .ok_or(ExecutionError::Capacity)?;
        if needed <= self.entries.capacity() {
            return Ok(());
        }
        let before = self._reservation.bytes();
        let backing = needed
            .checked_mul(size_of::<Arc<QueuedAwareness>>())
            .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(
            before
                .checked_add(backing)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        if self
            .entries
            .try_reserve_exact(needed - self.entries.len())
            .is_err()
        {
            self._reservation.resize(before)?;
            return Err(ExecutionError::Capacity);
        }
        self._reservation.resize(
            self.entries
                .capacity()
                .checked_mul(size_of::<Arc<QueuedAwareness>>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
}
struct Scope {
    token: Arc<Token>,
    actor: String,
    life: u64,
    at: f64,
    position: Point,
    maximum: usize,
    pending: Option<Pending>,
    _reservation: ByteReservation,
}
impl Scope {
    fn copy(&self, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let _reservation = budget.reserve(self.actor.len())?;
        Ok(Self {
            token: Arc::clone(&self.token),
            actor: self.actor.clone(),
            life: self.life,
            at: self.at,
            position: self.position,
            maximum: self.maximum,
            pending: Some(self.pending.as_ref().ok_or_else(invalid)?.copy(budget)?),
            _reservation,
        })
    }
    fn current(&self, physical: &PhysicalState) -> bool {
        physical.header.sim_time == self.at
            && physical.entities.get(&self.actor).is_some_and(|a| {
                a.physical_life() == Some(self.life) && a.world_position() == Some(self.position)
            })
    }
}
struct ScopeSet {
    active: Vec<(u64, Scope)>,
    _reservation: ByteReservation,
}
impl ScopeSet {
    fn empty(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            active: Vec::new(),
            _reservation: budget.reserve(0)?,
        })
    }
    fn copy(&self, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let mut result = Self::empty(budget)?;
        result.reserve(self.active.len())?;
        for (key, scope) in &self.active {
            result.active.push((*key, scope.copy(budget)?));
        }
        Ok(result)
    }
    fn reserve(&mut self, additional: usize) -> Result<(), ExecutionError> {
        if additional <= self.active.capacity().saturating_sub(self.active.len()) {
            return Ok(());
        }
        let next = self
            .active
            .len()
            .checked_add(additional)
            .ok_or(ExecutionError::Capacity)?;
        let before = self._reservation.bytes();
        let bytes = next
            .checked_mul(size_of::<(u64, Scope)>())
            .ok_or(ExecutionError::Capacity)?;
        self._reservation
            .resize(before.checked_add(bytes).ok_or(ExecutionError::Capacity)?)?;
        if self
            .active
            .try_reserve_exact(next - self.active.len())
            .is_err()
        {
            self._reservation.resize(before)?;
            return Err(ExecutionError::Capacity);
        }
        self._reservation.resize(
            self.active
                .capacity()
                .checked_mul(size_of::<(u64, Scope)>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
}
pub(crate) struct EncounterCheckpoint {
    set: ScopeSet,
}
pub(crate) struct EncounterScopes {
    set: ScopeSet,
    serial: u64,
    budget: ByteBudget,
}
impl EncounterScopes {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            set: ScopeSet::empty(budget)?,
            serial: 0,
            budget: budget.clone(),
        })
    }
    pub(crate) fn checkpoint(&self) -> Result<EncounterCheckpoint, ExecutionError> {
        Ok(EncounterCheckpoint {
            set: self.set.copy(&self.budget)?,
        })
    }
    pub(crate) fn rollback_to(&mut self, checkpoint: EncounterCheckpoint) {
        self.set = checkpoint.set;
    }
    pub(crate) fn rollback_all(&mut self) -> Result<(), ExecutionError> {
        self.set = ScopeSet::empty(&self.budget)?;
        Ok(())
    }
    pub(crate) fn require_closed(&self) -> Result<(), ExecutionError> {
        if self.set.active.is_empty() {
            Ok(())
        } else {
            Err(invalid())
        }
    }
    fn scope(&self, batch: &EncounterBatch) -> Result<&Scope, ExecutionError> {
        self.set
            .active
            .iter()
            .find(|(serial, s)| *serial == batch.serial && Arc::ptr_eq(&s.token, &batch.token))
            .map(|(_, scope)| scope)
            .ok_or_else(invalid)
    }
    fn scope_mut(&mut self, batch: &EncounterBatch) -> Result<&mut Scope, ExecutionError> {
        self.set
            .active
            .iter_mut()
            .find(|(serial, s)| *serial == batch.serial && Arc::ptr_eq(&s.token, &batch.token))
            .map(|(_, scope)| scope)
            .ok_or_else(invalid)
    }
    pub(crate) fn open(
        &mut self,
        physical: &PhysicalState,
        actor: &str,
        maximum: usize,
    ) -> Result<EncounterBatch, ExecutionError> {
        if maximum == 0 {
            return Err(invalid());
        }
        let body = physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let life = body.physical_life().ok_or(ExecutionError::MissingActor)?;
        let position = body
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        let serial = self.serial.checked_add(1).ok_or(ExecutionError::Identity)?;
        let metadata = self.budget.reserve(actor.len())?;
        let token_capacity = self
            .budget
            .reserve(size_of::<Token>() + 2 * size_of::<usize>() + std::mem::align_of::<Token>())?;
        let pending = Pending::empty(&self.budget)?;
        self.set.reserve(1)?;
        let token = Arc::new(Token {
            _reservation: token_capacity,
        });
        self.set.active.push((
            serial,
            Scope {
                token: Arc::clone(&token),
                actor: actor.into(),
                life,
                at: physical.header.sim_time,
                position,
                maximum,
                pending: Some(pending),
                _reservation: metadata,
            },
        ));
        self.serial = serial;
        Ok(EncounterBatch { serial, token })
    }
    pub(crate) fn validate_event(
        &self,
        batch: &EncounterBatch,
        event: &WorldEvent,
        physical: &PhysicalState,
        event_type: &str,
    ) -> Result<(), ExecutionError> {
        let scope = self.scope(batch)?;
        if !scope.current(physical)
            || event.scope != Some(EventScope::Private)
            || event.event_type != event_type
            || event.audience.len() != 1
            || event.audience[0] != scope.actor
        {
            return Err(invalid());
        }
        Ok(())
    }
    pub(crate) fn enqueue(
        &mut self,
        batch: &EncounterBatch,
        physical: &PhysicalState,
        entries: &[Awareness],
        encodings: &[AwarenessEncoding],
    ) -> Result<(), ExecutionError> {
        if entries.len() != encodings.len() {
            return Err(invalid());
        }
        let scope = self.scope(batch)?;
        if !scope.current(physical) {
            return Err(invalid());
        }
        if !physical
            .entities
            .get(&scope.actor)
            .is_some_and(|a| a.has_memory())
        {
            return Ok(());
        }
        if entries
            .iter()
            .any(|entry| entry.actor_id != scope.actor || entry.speech.is_some())
        {
            return Err(invalid());
        }
        if scope
            .pending
            .as_ref()
            .ok_or_else(invalid)?
            .entries
            .len()
            .checked_add(entries.len())
            .is_none_or(|n| n > scope.maximum)
        {
            return Err(ExecutionError::Capacity);
        }
        self.scope_mut(batch)?
            .pending
            .as_mut()
            .ok_or_else(invalid)?
            .reserve(entries.len())?;
        for (entry, encoding) in entries.iter().zip(encodings) {
            let bound = heap_sum([
                size_of::<QueuedAwareness>(),
                2 * size_of::<usize>(),
                std::mem::align_of::<QueuedAwareness>(),
                entry.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?;
            let reservation = self.budget.reserve(bound)?;
            let value = entry.clone();
            self.scope_mut(batch)?
                .pending
                .as_mut()
                .ok_or_else(invalid)?
                .entries
                .push(Arc::new(QueuedAwareness {
                    value,
                    encoding: *encoding,
                    _reservation: reservation,
                }));
        }
        Ok(())
    }
    pub(crate) fn due(&self, batch: &EncounterBatch) -> Result<bool, ExecutionError> {
        let scope = self.scope(batch)?;
        Ok(scope.pending.as_ref().ok_or_else(invalid)?.entries.len() >= scope.maximum)
    }
    fn take(
        &mut self,
        batch: &EncounterBatch,
        physical: &PhysicalState,
    ) -> Result<Loan, ExecutionError> {
        let scope = self.scope(batch)?;
        if !scope.current(physical) {
            return Err(invalid());
        }
        let reservation = self.budget.reserve(scope.actor.len())?;
        let actor = scope.actor.clone();
        let pending = self.scope_mut(batch)?.pending.take().ok_or_else(invalid)?;
        Ok(Loan {
            batch: batch.clone(),
            actor,
            pending,
            _reservation: reservation,
        })
    }
    fn return_loan(&mut self, loan: Loan, success: bool) -> Result<(), ExecutionError> {
        let empty = if success {
            Some(Pending::empty(&self.budget)?)
        } else {
            None
        };
        let scope = self.scope_mut(&loan.batch)?;
        if scope.pending.is_some() {
            return Err(invalid());
        }
        scope.pending = if success { empty } else { Some(loan.pending) };
        Ok(())
    }
    pub(crate) fn close(&mut self, batch: EncounterBatch) -> Result<(), ExecutionError> {
        if !self
            .scope(&batch)?
            .pending
            .as_ref()
            .ok_or_else(invalid)?
            .entries
            .is_empty()
        {
            return Err(invalid());
        }
        let at = self
            .set
            .active
            .iter()
            .position(|(serial, _)| *serial == batch.serial)
            .ok_or_else(invalid)?;
        self.set.active.remove(at);
        Ok(())
    }
}
struct Loan {
    batch: EncounterBatch,
    actor: String,
    pending: Pending,
    _reservation: ByteReservation,
}
pub(crate) fn flush_encounter_batch(
    core: &mut CoreMutation<'_>,
    batch: &EncounterBatch,
    budget: &ByteBudget,
) -> Result<(), cursor::EventError> {
    let loan = core.journal.encounters.take(batch, &core.state.physical)?;
    let result = (|| {
        if loan.pending.entries.is_empty() {
            return Ok(());
        }
        let _reservation = budget.reserve(
            loan.pending
                .entries
                .len()
                .checked_mul(size_of::<AwarenessInput<'_>>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut input = Vec::new();
        input
            .try_reserve_exact(loan.pending.entries.len())
            .map_err(|_| ExecutionError::Capacity)?;
        input.extend(loan.pending.entries.iter().map(|entry| AwarenessInput {
            awareness: &entry.value,
            encoding: entry.encoding,
        }));
        let schema = Arc::clone(&core.state.installed.schema);
        let admission = prepare_awareness_admission(core, &loan.actor, &input, None, budget)?;
        acquire_awareness_accounts(core, admission, &schema, budget)?;
        Ok(())
    })();
    core.journal.encounters.return_loan(loan, result.is_ok())?;
    result
}
