//! Candidate-local acquisition lifetimes. The actor's existing scope is reused
//! by nested events/results; only the scope that opened a batch may flush it.
//! Journals below retain changed compact builders, never actor/history clones.

use super::ExecutionError;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::IdentityState;
use crate::received::{
    ReceivedTransition, ReceivedValues, TemporalAcquisition, TemporalAcquisitionCheckpoint,
    TemporalAppendError, TemporalCaptureInput, TemporalReceiptLocator, TemporalRetentionPolicy,
    TemporalState, TemporalValueMeaning,
};
use crate::reception::ObservationFrame;
use crate::work::WorkMeters;
use indexmap::IndexMap;
use std::mem::size_of;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct AcquisitionLease {
    serial: u64,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct ReceivedLease {
    serial: u64,
}

struct AcquisitionScope {
    serial: u64,
    owner: u64,
    life: u64,
    frame: Option<ObservationFrame>,
    prepared: Option<TemporalAcquisition>,
    leases: usize,
    loan: Option<u64>,
    saved_frame: Option<u64>,
}
struct AcquisitionGuard {
    actor: String,
    scope: u64,
    owned: bool,
}
#[derive(Clone, Copy)]
struct TransitionScope {
    serial: u64,
    value: ReceivedTransition,
    leases: usize,
    loan: Option<u64>,
    saved_frame: Option<u64>,
}
struct ReceivedGuard {
    actor: String,
    transition: u64,
    owned: bool,
    previous: Option<TransitionScope>,
    acquisition: Option<AcquisitionLease>,
}

enum Undo {
    AcquisitionBegin {
        lease: u64,
        actor: String,
        new_scope: bool,
    },
    AcquisitionFinish {
        lease: u64,
        guard_index: usize,
        guard: AcquisitionGuard,
        removed: Option<(usize, String, AcquisitionScope)>,
    },
    Builder {
        actor: String,
        before: Option<TemporalAcquisitionCheckpoint>,
        saved_frame: Option<u64>,
    },
    ReceivedBegin {
        lease: u64,
        actor: String,
        previous: Option<TransitionScope>,
        new_scope: bool,
    },
    ReceivedFinish {
        lease: u64,
        guard_index: usize,
        guard: ReceivedGuard,
        removed: Option<(usize, String, TransitionScope)>,
    },
    Transition {
        actor: String,
        before: TransitionScope,
    },
}

#[derive(Clone, Copy)]
pub(crate) struct TemporalScopesCheckpoint {
    undo: usize,
    previous_frame: u64,
    frame: u64,
}

/// A loan permits a real producer to borrow CoreMutation while its compact
/// batch is detached from the journal. It must be returned before a nested
/// candidate checkpoint or another acquisition for this actor can begin.
pub(crate) struct TemporalLoan {
    lease: u64,
    scope: u64,
    transition: u64,
    serial: u64,
    prepared: Option<TemporalAcquisition>,
    order: ReceivedTransition,
}
impl TemporalLoan {
    pub(crate) fn parts(&mut self) -> Option<(&mut TemporalAcquisition, &mut ReceivedTransition)> {
        Some((self.prepared.as_mut()?, &mut self.order))
    }
}

pub(crate) struct TemporalScopes {
    scopes: IndexMap<String, AcquisitionScope>,
    acquisitions: IndexMap<u64, AcquisitionGuard>,
    transitions: IndexMap<String, TransitionScope>,
    received: IndexMap<u64, ReceivedGuard>,
    undo: Vec<Undo>,
    serial: u64,
    frame: u64,
    budget: ByteBudget,
    reservation: ByteReservation,
}
fn map_growth<K, V>(len: usize, capacity: usize) -> Result<usize, ExecutionError> {
    if len < capacity {
        return Ok(0);
    }
    // IndexMap's two allocations have a conservative shared-layout bound.
    // Fund the replacement before reserve can temporarily retain both arrays.
    let next = capacity
        .checked_mul(2)
        .and_then(|v| v.checked_add(8))
        .ok_or(ExecutionError::Capacity)?;
    map_storage::<K, V>(next).ok_or(ExecutionError::Capacity)
}
fn append_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(error) => ExecutionError::Received(error),
        TemporalAppendError::Work(error) => ExecutionError::Work(error),
    }
}
impl TemporalScopes {
    pub(crate) fn owns_received(&self, lease: ReceivedLease) -> Result<bool, ExecutionError> {
        let guard = self
            .received
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let transition = self
            .transitions
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if transition.serial != guard.transition || transition.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        Ok(guard.owned)
    }
    pub(crate) fn pending_charge(&self, actor: &str) -> Result<(u64, u64), ExecutionError> {
        let Some(scope) = self.scopes.get(actor) else {
            return Ok((0, 0));
        };
        if scope.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        Ok(scope
            .prepared
            .as_ref()
            .map_or((0, 0), TemporalAcquisition::pending_charge))
    }
    /// Source appendTemporalReceipt owns one None-sample transition unless an
    /// actual outer transition already exists. A larger actor acquisition alone
    /// does not share receipt order across independent append calls.
    pub(crate) fn append_receipt(
        &mut self,
        state: &mut TemporalState,
        values: &mut ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
        actor: &str,
        physical_life: u64,
        now: f64,
        sequence: u64,
        input: TemporalCaptureInput,
        policy: &TemporalRetentionPolicy,
        maintenance_headroom: f64,
    ) -> Result<Option<TemporalReceiptLocator>, ExecutionError> {
        let lease = self.begin_received(actor, physical_life, None)?;
        let mut loan = self.loan(lease, state, policy, maintenance_headroom)?;
        let result = match loan.parts() {
            Some((scope, transition)) => scope
                .append(
                    state, values, identity, transition, meaning, meters, now, sequence, input,
                )
                .map_err(append_error),
            None => Ok(None),
        };
        // An error still returns the detached builder before the shared
        // candidate rollback. Source abort does not flush a failed standalone
        // call, so only successful work closes/flushes the owned lease here.
        self.return_loan(loan)?;
        let result = result?;
        self.finish_received(lease, state, values, identity, meaning, meters)?;
        Ok(result)
    }
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            scopes: IndexMap::new(),
            acquisitions: IndexMap::new(),
            transitions: IndexMap::new(),
            received: IndexMap::new(),
            undo: Vec::new(),
            serial: 0,
            frame: 0,
            budget: budget.clone(),
            reservation: budget.reserve(size_of::<Self>())?,
        })
    }
    fn next(&mut self) -> Result<u64, ExecutionError> {
        self.serial = self
            .serial
            .checked_add(1)
            .ok_or(ExecutionError::Invariant)?;
        Ok(self.serial)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn prepare_undo(&mut self, payload: usize) -> Result<(), ExecutionError> {
        let array = if self.undo.len() == self.undo.capacity() {
            self.undo
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(8))
                .and_then(|n| n.checked_mul(size_of::<Undo>()))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.reserve(array.checked_add(payload).ok_or(ExecutionError::Capacity)?)?;
        self.undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)
    }
    fn no_loans(&self) -> bool {
        self.scopes.values().all(|scope| scope.loan.is_none())
            && self.transitions.values().all(|scope| scope.loan.is_none())
    }
    pub(crate) fn checkpoint(&mut self) -> Result<TemporalScopesCheckpoint, ExecutionError> {
        if !self.no_loans() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let checkpoint = TemporalScopesCheckpoint {
            undo: self.undo.len(),
            previous_frame: self.frame,
            frame: self.next()?,
        };
        self.frame = checkpoint.frame;
        Ok(checkpoint)
    }
    pub(crate) fn keep(
        &mut self,
        checkpoint: TemporalScopesCheckpoint,
    ) -> Result<(), ExecutionError> {
        if self.frame != checkpoint.frame || !self.no_loans() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.frame = checkpoint.previous_frame;
        Ok(())
    }
    fn touch_builder(&mut self, actor: &str) -> Result<(), ExecutionError> {
        let scope = self.scopes.get(actor).ok_or(ExecutionError::Invariant)?;
        if scope.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if scope.saved_frame == Some(self.frame) {
            return Ok(());
        }
        let before = scope
            .prepared
            .as_ref()
            .map(|scope| scope.checkpoint(&self.budget))
            .transpose()
            .map_err(ExecutionError::Received)?;
        let saved_frame = scope.saved_frame;
        self.prepare_undo(actor.len())?;
        self.undo.push(Undo::Builder {
            actor: actor.to_owned(),
            before,
            saved_frame,
        });
        self.scopes
            .get_mut(actor)
            .ok_or(ExecutionError::Invariant)?
            .saved_frame = Some(self.frame);
        Ok(())
    }
    fn touch_transition(&mut self, actor: &str) -> Result<(), ExecutionError> {
        let before = *self
            .transitions
            .get(actor)
            .ok_or(ExecutionError::Invariant)?;
        if before.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if before.saved_frame == Some(self.frame) {
            return Ok(());
        }
        self.prepare_undo(actor.len())?;
        self.undo.push(Undo::Transition {
            actor: actor.to_owned(),
            before,
        });
        self.transitions
            .get_mut(actor)
            .ok_or(ExecutionError::Invariant)?
            .saved_frame = Some(self.frame);
        Ok(())
    }
    /// The first scope owns its exact frame. A nested borrow never replaces it.
    /// No history actor, batch, order or gameplay ID is created here.
    pub(crate) fn begin_acquisition(
        &mut self,
        actor: &str,
        life: u64,
        frame: Option<ObservationFrame>,
    ) -> Result<AcquisitionLease, ExecutionError> {
        if self
            .scopes
            .get(actor)
            .is_some_and(|scope| scope.life != life || scope.loan.is_some())
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let new_scope = !self.scopes.contains_key(actor);
        let scope_bytes = if new_scope {
            map_growth::<String, AcquisitionScope>(self.scopes.len(), self.scopes.capacity())?
                .checked_add(frame.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let bytes = scope_bytes
            .checked_add(map_growth::<u64, AcquisitionGuard>(
                self.acquisitions.len(),
                self.acquisitions.capacity(),
            )?)
            .and_then(|v| v.checked_add(actor.len().checked_mul(3)?))
            .ok_or(ExecutionError::Capacity)?;
        self.prepare_undo(bytes)?;
        self.acquisitions
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        if new_scope {
            self.scopes
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
        }
        let serial = self.next()?;
        let scope_serial = if new_scope {
            self.next()?
        } else {
            self.scopes
                .get(actor)
                .ok_or(ExecutionError::Invariant)?
                .serial
        };
        self.undo.push(Undo::AcquisitionBegin {
            lease: serial,
            actor: actor.to_owned(),
            new_scope,
        });
        if new_scope {
            self.scopes.insert(
                actor.to_owned(),
                AcquisitionScope {
                    serial: scope_serial,
                    owner: serial,
                    life,
                    frame,
                    prepared: None,
                    leases: 0,
                    loan: None,
                    saved_frame: None,
                },
            );
        }
        let scope = self
            .scopes
            .get_mut(actor)
            .ok_or(ExecutionError::Invariant)?;
        scope.leases = scope
            .leases
            .checked_add(1)
            .ok_or(ExecutionError::Invariant)?;
        self.acquisitions.insert(
            serial,
            AcquisitionGuard {
                actor: actor.to_owned(),
                scope: scope_serial,
                owned: new_scope,
            },
        );
        Ok(AcquisitionLease { serial })
    }
    /// A transition with no supplied sample borrows the current order. A
    /// different actual sample temporarily replaces it and restores it later.
    pub(crate) fn begin_received(
        &mut self,
        actor: &str,
        life: u64,
        sample_token: Option<u64>,
    ) -> Result<ReceivedLease, ExecutionError> {
        if self
            .scopes
            .get(actor)
            .is_some_and(|scope| scope.life != life || scope.loan.is_some())
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let previous = self.transitions.get(actor).copied();
        if previous.is_some_and(|scope| scope.loan.is_some()) {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let new_scope = previous.is_none_or(|scope| {
            sample_token.is_some() && scope.value.sample_token() != sample_token
        });
        let acquisition = if new_scope {
            Some(self.begin_acquisition(actor, life, None)?)
        } else {
            None
        };
        let bytes =
            map_growth::<u64, ReceivedGuard>(self.received.len(), self.received.capacity())?
                .checked_add(if new_scope && previous.is_none() {
                    map_growth::<String, TransitionScope>(
                        self.transitions.len(),
                        self.transitions.capacity(),
                    )?
                } else {
                    0
                })
                .and_then(|v| v.checked_add(actor.len().checked_mul(3)?))
                .ok_or(ExecutionError::Capacity)?;
        self.prepare_undo(bytes)?;
        self.received
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        if new_scope && previous.is_none() {
            self.transitions
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
        }
        let serial = self.next()?;
        let transition_serial = if new_scope {
            self.next()?
        } else {
            previous.ok_or(ExecutionError::Invariant)?.serial
        };
        self.undo.push(Undo::ReceivedBegin {
            lease: serial,
            actor: actor.to_owned(),
            previous,
            new_scope,
        });
        if new_scope {
            self.transitions.insert(
                actor.to_owned(),
                TransitionScope {
                    serial: transition_serial,
                    value: ReceivedTransition::new(sample_token),
                    leases: 0,
                    loan: None,
                    saved_frame: None,
                },
            );
        }
        let transition = self
            .transitions
            .get_mut(actor)
            .ok_or(ExecutionError::Invariant)?;
        transition.leases = transition
            .leases
            .checked_add(1)
            .ok_or(ExecutionError::Invariant)?;
        self.received.insert(
            serial,
            ReceivedGuard {
                actor: actor.to_owned(),
                transition: transition_serial,
                owned: new_scope,
                previous,
                acquisition,
            },
        );
        Ok(ReceivedLease { serial })
    }
    pub(crate) fn loan(
        &mut self,
        lease: ReceivedLease,
        state: &TemporalState,
        policy: &TemporalRetentionPolicy,
        maintenance_headroom: f64,
    ) -> Result<TemporalLoan, ExecutionError> {
        let guard = self
            .received
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let actor = guard.actor.as_str();
        let transition = self
            .transitions
            .get(actor)
            .ok_or(ExecutionError::Invariant)?;
        if transition.serial != guard.transition || transition.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let scope = self.scopes.get(actor).ok_or(ExecutionError::Invariant)?;
        if scope.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        // This small ID copy is funded before either semantic owner is touched.
        let bytes = actor.len();
        self.reserve(bytes)?;
        let actor = self
            .received
            .get(&lease.serial)
            .ok_or(ExecutionError::Invariant)?
            .actor
            .clone();
        self.touch_builder(&actor)?;
        self.touch_transition(&actor)?;
        let serial = self.next()?;
        let scope = self
            .scopes
            .get_mut(&actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.prepared.is_none() {
            let _frame_clone = self
                .budget
                .reserve(scope.frame.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            scope.prepared = state
                .begin_acquisition(
                    &actor,
                    scope.life,
                    scope.frame.clone(),
                    policy.clone(),
                    maintenance_headroom,
                    &self.budget,
                )
                .map_err(ExecutionError::Received)?;
        }
        scope.loan = Some(serial);
        let transition = self
            .transitions
            .get_mut(&actor)
            .ok_or(ExecutionError::Invariant)?;
        transition.loan = Some(serial);
        Ok(TemporalLoan {
            lease: lease.serial,
            scope: scope.serial,
            transition: transition.serial,
            serial,
            prepared: scope.prepared.take(),
            order: transition.value,
        })
    }
    pub(crate) fn return_loan(&mut self, loan: TemporalLoan) -> Result<(), ExecutionError> {
        let guard = self
            .received
            .get(&loan.lease)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let scope = self
            .scopes
            .get_mut(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        let transition = self
            .transitions
            .get_mut(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.serial != loan.scope
            || scope.loan != Some(loan.serial)
            || transition.serial != loan.transition
            || transition.loan != Some(loan.serial)
            || scope.prepared.is_some()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        scope.prepared = loan.prepared;
        scope.loan = None;
        transition.value = loan.order;
        transition.loan = None;
        Ok(())
    }
    /// Snapshot preparation has two source-ordered passes: every receiver's
    /// actual pending-recording duty first, then these original scope leases.
    /// Flushing alone cannot replace the receiver's first pass.
    pub(crate) fn snapshot_lease(&self, index: usize) -> Option<AcquisitionLease> {
        self.scopes
            .get_index(index)
            .map(|(_, scope)| AcquisitionLease {
                serial: scope.owner,
            })
    }
    pub(crate) fn lease_actor(&self, lease: AcquisitionLease) -> Result<&str, ExecutionError> {
        self.acquisitions
            .get(&lease.serial)
            .map(|guard| guard.actor.as_str())
            .ok_or(ExecutionError::UnfinishedOccurrence)
    }
    /// The actual receiver first seals its pending current recordings. This
    /// drains accepted history and keeps the scope/frame available for reuse.
    pub(crate) fn flush_acquisition(
        &mut self,
        lease: AcquisitionLease,
        state: &mut TemporalState,
        values: &ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
    ) -> Result<(), ExecutionError> {
        let guard = self
            .acquisitions
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let scope = self
            .scopes
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.serial != guard.scope || scope.loan.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        self.reserve(guard.actor.len())?;
        let actor = self
            .acquisitions
            .get(&lease.serial)
            .ok_or(ExecutionError::Invariant)?
            .actor
            .clone();
        self.touch_builder(&actor)?;
        if let Some(prepared) = self
            .scopes
            .get_mut(&actor)
            .ok_or(ExecutionError::Invariant)?
            .prepared
            .take()
        {
            prepared
                .finish(state, values, identity, meaning, meters)
                .map_err(append_error)?;
        }
        Ok(())
    }
    pub(crate) fn finish_acquisition(
        &mut self,
        lease: AcquisitionLease,
        state: &mut TemporalState,
        values: &ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
    ) -> Result<(), ExecutionError> {
        let guard = self
            .acquisitions
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let scope = self
            .scopes
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.serial != guard.scope || scope.loan.is_some() || guard.owned && scope.leases != 1 {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if guard.owned {
            self.flush_acquisition(lease, state, values, identity, meaning, meters)?;
        }
        self.close_acquisition(lease)
    }
    /// A real inline-only acquisition has no value pool to flush through. A
    /// borrowed lease leaves its owner's builder untouched; an owned lease may
    /// close only when it contains no accepted entry requiring that owner.
    pub(crate) fn finish_empty_acquisition(
        &mut self,
        lease: AcquisitionLease,
    ) -> Result<(), ExecutionError> {
        let guard = self
            .acquisitions
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let scope = self
            .scopes
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.serial != guard.scope
            || scope.loan.is_some()
            || guard.owned
                && (scope.leases != 1
                    || scope
                        .prepared
                        .as_ref()
                        .is_some_and(TemporalAcquisition::has_pending_entries))
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        self.close_acquisition(lease)
    }
    fn close_acquisition(&mut self, lease: AcquisitionLease) -> Result<(), ExecutionError> {
        let guard = self
            .acquisitions
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let scope = self
            .scopes
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.serial != guard.scope || scope.loan.is_some() || guard.owned && scope.leases != 1 {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        self.prepare_undo(0)?;
        let (guard_index, _, guard) = self
            .acquisitions
            .shift_remove_full(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let scope = self
            .scopes
            .get_mut(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if scope.serial != guard.scope || scope.loan.is_some() || guard.owned && scope.leases != 1 {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let removed = if guard.owned {
            Some(
                self.scopes
                    .shift_remove_full(&guard.actor)
                    .ok_or(ExecutionError::Invariant)?,
            )
        } else {
            scope.leases -= 1;
            None
        };
        self.undo.push(Undo::AcquisitionFinish {
            lease: lease.serial,
            guard_index,
            guard,
            removed,
        });
        Ok(())
    }
    pub(crate) fn finish_received(
        &mut self,
        lease: ReceivedLease,
        state: &mut TemporalState,
        values: &ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
    ) -> Result<(), ExecutionError> {
        let guard = self
            .received
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let transition = self
            .transitions
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if transition.serial != guard.transition
            || transition.loan.is_some()
            || guard.owned && transition.leases != 1
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if let Some(acquisition) = guard.acquisition {
            self.finish_acquisition(acquisition, state, values, identity, meaning, meters)?;
        }
        self.close_received(lease)
    }
    /// An inline-only original may have no shared value pool. Closing it still
    /// proves that no owned accepted entry needs the real flush/value owner.
    pub(crate) fn finish_empty_received(
        &mut self,
        lease: ReceivedLease,
    ) -> Result<(), ExecutionError> {
        let guard = self
            .received
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let transition = self
            .transitions
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if transition.serial != guard.transition
            || transition.loan.is_some()
            || guard.owned && transition.leases != 1
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if let Some(lease) = guard.acquisition {
            self.finish_empty_acquisition(lease)?;
        }
        self.close_received(lease)
    }
    fn close_received(&mut self, lease: ReceivedLease) -> Result<(), ExecutionError> {
        let guard = self
            .received
            .get(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let current = self
            .transitions
            .get(&guard.actor)
            .ok_or(ExecutionError::Invariant)?;
        if current.serial != guard.transition
            || current.loan.is_some()
            || guard.owned && current.leases != 1
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let payload = if guard.owned && guard.previous.is_some() {
            guard.actor.len()
        } else {
            0
        };
        self.prepare_undo(payload)?;
        let (guard_index, _, guard) = self
            .received
            .shift_remove_full(&lease.serial)
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        let removed = if guard.owned {
            let current = self
                .transitions
                .shift_remove_full(&guard.actor)
                .ok_or(ExecutionError::Invariant)?;
            if let Some(previous) = guard.previous {
                self.transitions
                    .shift_insert(current.0, guard.actor.clone(), previous);
            }
            Some(current)
        } else {
            let current = self
                .transitions
                .get_mut(&guard.actor)
                .ok_or(ExecutionError::Invariant)?;
            current.leases = current
                .leases
                .checked_sub(1)
                .ok_or(ExecutionError::Invariant)?;
            None
        };
        self.undo.push(Undo::ReceivedFinish {
            lease: lease.serial,
            guard_index,
            guard,
            removed,
        });
        Ok(())
    }
    // A failed producer aborts through the shared candidate checkpoint. Merely
    // dropping an unflushed builder while accepting its quota/value mutations
    // would leave a half-recorded occurrence eligible for publication.
    pub(crate) fn rollback_to(
        &mut self,
        checkpoint: TemporalScopesCheckpoint,
    ) -> Result<(), ExecutionError> {
        if self.frame != checkpoint.frame || checkpoint.undo > self.undo.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.rollback(checkpoint.undo)?;
        self.frame = checkpoint.previous_frame;
        Ok(())
    }
    pub(crate) fn rollback_all(&mut self) -> Result<(), ExecutionError> {
        self.rollback(0)?;
        self.frame = 0;
        self.require_closed()
    }
    fn rollback(&mut self, through: usize) -> Result<(), ExecutionError> {
        while self.undo.len() > through {
            match self.undo.pop().ok_or(ExecutionError::InvalidCheckpoint)? {
                Undo::AcquisitionBegin {
                    lease,
                    actor,
                    new_scope,
                } => {
                    self.acquisitions
                        .shift_remove(&lease)
                        .ok_or(ExecutionError::Invariant)?;
                    if new_scope {
                        self.scopes
                            .shift_remove(&actor)
                            .ok_or(ExecutionError::Invariant)?;
                    } else {
                        let scope = self
                            .scopes
                            .get_mut(&actor)
                            .ok_or(ExecutionError::Invariant)?;
                        scope.leases = scope
                            .leases
                            .checked_sub(1)
                            .ok_or(ExecutionError::Invariant)?;
                    }
                }
                Undo::AcquisitionFinish {
                    lease,
                    guard_index,
                    guard,
                    removed,
                } => {
                    if let Some((index, key, scope)) = removed {
                        self.scopes.shift_insert(index, key, scope);
                    } else {
                        let scope = self
                            .scopes
                            .get_mut(&guard.actor)
                            .ok_or(ExecutionError::Invariant)?;
                        scope.leases = scope
                            .leases
                            .checked_add(1)
                            .ok_or(ExecutionError::Invariant)?;
                    }
                    self.acquisitions.shift_insert(guard_index, lease, guard);
                }
                Undo::Builder {
                    actor,
                    before,
                    saved_frame,
                } => {
                    let scope = self
                        .scopes
                        .get_mut(&actor)
                        .ok_or(ExecutionError::Invariant)?;
                    scope.prepared = before.map(TemporalAcquisitionCheckpoint::into_acquisition);
                    scope.loan = None;
                    scope.saved_frame = saved_frame;
                }
                Undo::ReceivedBegin {
                    lease,
                    actor,
                    previous,
                    new_scope,
                } => {
                    self.received
                        .shift_remove(&lease)
                        .ok_or(ExecutionError::Invariant)?;
                    if new_scope {
                        let (index, key, _) = self
                            .transitions
                            .shift_remove_full(&actor)
                            .ok_or(ExecutionError::Invariant)?;
                        if let Some(previous) = previous {
                            self.transitions.shift_insert(index, key, previous);
                        }
                    } else {
                        let current = self
                            .transitions
                            .get_mut(&actor)
                            .ok_or(ExecutionError::Invariant)?;
                        current.leases = current
                            .leases
                            .checked_sub(1)
                            .ok_or(ExecutionError::Invariant)?;
                    }
                }
                Undo::ReceivedFinish {
                    lease,
                    guard_index,
                    guard,
                    removed,
                } => {
                    if let Some((index, key, current)) = removed {
                        self.transitions.shift_remove(&key);
                        self.transitions.shift_insert(index, key, current);
                    } else {
                        let current = self
                            .transitions
                            .get_mut(&guard.actor)
                            .ok_or(ExecutionError::Invariant)?;
                        current.leases = current
                            .leases
                            .checked_add(1)
                            .ok_or(ExecutionError::Invariant)?;
                    }
                    self.received.shift_insert(guard_index, lease, guard);
                }
                Undo::Transition { actor, before } => {
                    *self
                        .transitions
                        .get_mut(&actor)
                        .ok_or(ExecutionError::Invariant)? = before;
                }
            }
        }
        Ok(())
    }
    pub(crate) fn require_closed(&self) -> Result<(), ExecutionError> {
        if !self.scopes.is_empty()
            || !self.acquisitions.is_empty()
            || !self.transitions.is_empty()
            || !self.received.is_empty()
            || !self.no_loans()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ExecutionError> {
        self.require_closed()?;
        if self.frame != 0 {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.undo.clear();
        Ok(())
    }
}
