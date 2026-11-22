//! Exact action holds share the physical inverse journal with inventory and
//! the action itself. Settled claim records survive only in the saved prefix.
use super::*;
use crate::item_holds::{ClaimState, hearth_hold_id, prepare_hold};

impl CoreMutation<'_> {
    /// Reserve the complete staged group before installing any claim. The
    /// action is already native and journalled, so refusal rolls that back too.
    pub(crate) fn reserve_hearth_holds(&mut self, actor_id: &str) -> Result<(), ExecutionError> {
        let physical = &self.state.physical;
        let action = physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let work = action
            .hearth_work
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let definition = self
            .state
            .installed
            .retained
            .hearths
            .get(&work.definition.id)
            .filter(|value| value.pin == work.definition)
            .ok_or(ExecutionError::Invariant)?;
        let budget = &self.journal.physical.budget;
        let _buffer = budget
            .reserve(work.stones.len() * size_of::<(String, crate::item_holds::HeldRecord)>())?;
        let mut prepared = Vec::with_capacity(work.stones.len());
        for (index, stone) in work.stones.iter().enumerate() {
            use crate::work::WorkUnit;
            self.journal
                .meters
                .charge(&[(WorkUnit::Claims, 1), (WorkUnit::Effects, 1)])?;
            let lot = physical
                .entities
                .get(&stone.item_id)
                .and_then(|entity| entity.item.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            if lot
                .quantity
                .saturating_sub(physical.holds.quantity(&stone.item_id))
                < stone.quantity
            {
                return Err(ExecutionError::Invariant);
            }
            let ordinal = physical
                .holds
                .coverage
                .next_ordinal
                .checked_add(index as u64)
                .filter(|ordinal| *ordinal < MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            prepared.push(prepare_hold(
                actor_id,
                &action.id,
                index,
                stone,
                &definition.definition.input.definition,
                lot.revision,
                ordinal,
                budget,
            )?);
        }
        let mut physical = self.physical();
        for (id, record) in prepared {
            physical.journal.reserve(id.len() + size_of::<Undo>())?;
            let coverage = &physical.state.holds.coverage;
            let undo = Undo::ItemHoldAdded {
                id: id.clone(),
                ordinal: coverage.next_ordinal,
                parent_present: coverage.parent_present,
            };
            physical.hold_availability(record.item_id())?;
            physical.state.holds.put(id, record)?;
            physical.state.holds.coverage.next_ordinal += 1;
            physical.state.holds.coverage.parent_present = true;
            physical.journal.undo.push(undo);
        }
        Ok(())
    }
}

impl PhysicalMutation<'_> {
    pub(crate) fn release_hearth_holds(
        &mut self,
        actor: EntityHandle,
    ) -> Result<(), ExecutionError> {
        let count = self
            .state
            .entities
            .resolve(actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .and_then(|action| action.hearth_work.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .stones
            .len();
        for index in 0..count {
            let action = self
                .state
                .entities
                .resolve(actor)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.action.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            // This key is needed only when an action ends. Entries may already
            // have been consumed at successful completion in this candidate.
            self.journal.reserve(action.id.len() + 32)?;
            let id = hearth_hold_id(&action.id, index);
            self.end_item_hold(&id, ClaimState::Released)?;
        }
        Ok(())
    }

    pub(crate) fn end_item_hold(&mut self, id: &str, to: ClaimState) -> Result<(), ExecutionError> {
        let Some(row) = self.state.holds.get(id) else {
            return Ok(());
        };
        let after = row
            .value
            .revision
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        let retained = row.retain(&self.journal.budget)?;
        if to == ClaimState::Released {
            let scratch = self.journal.budget.reserve(row.item_id().len())?;
            let item = row.item_id().to_owned();
            self.hold_availability(&item)?;
            drop(scratch);
        }
        self.journal
            .reserve(size_of::<crate::item_holds::HeldRecord>() + size_of::<Undo>())?;
        let (key, mut hold) = self.state.holds.remove(id)?;
        let amount = hold.value.amount;
        hold.value.state = to;
        hold.value.revision = after;
        if to == ClaimState::Consumed {
            hold.value.amount = 0.0;
        }
        self.journal.undo.push(Undo::ItemHoldEnded {
            key,
            hold: Box::new(hold),
            amount,
            _custody: retained,
        });
        Ok(())
    }
}
