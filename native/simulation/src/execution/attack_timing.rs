//! Change one prepared attack's admitted input while keeping its physical
//! action, route, reservation and exact work identity in the same owner.
use super::*;
use crate::attack_execution::{AttackExecutionState, PendingRelease, TimedReleaseInput};
use crate::state::FundedAttackExecution;

impl PhysicalMutation<'_> {
    pub(crate) fn mark_attack_ready(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        self.edit_attack_execution(id, action_id, None, |execution| {
            execution.ready = true;
        })
    }

    pub(crate) fn hold_attack_release(
        &mut self,
        id: &str,
        action_id: &str,
        pending: Box<PendingRelease>,
        storage: ByteReservation,
    ) -> Result<(), ExecutionError> {
        self.edit_attack_execution(id, action_id, Some(storage), |execution| {
            execution.pending_release = Some(pending);
        })
    }

    pub(crate) fn disarm_attack_release(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        self.edit_attack_execution(id, action_id, None, |execution| {
            execution.pending_release = None;
        })
    }

    pub(crate) fn retain_committed_strike_input(
        &mut self,
        id: &str,
        action_id: &str,
        input: TimedReleaseInput,
    ) -> Result<(), ExecutionError> {
        self.edit_attack_execution(id, action_id, None, |execution| {
            execution.ready = false;
            execution.pending_release = None;
            execution.input = Some(input);
        })
    }

    fn edit_attack_execution(
        &mut self,
        id: &str,
        action_id: &str,
        extra: Option<ByteReservation>,
        edit: impl FnOnce(&mut AttackExecutionState),
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let current = self
            .state
            .entities
            .resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id)
            .and_then(|action| action.attack_execution.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let budget = self.journal.budget.clone();
        let mut storage = budget.reserve(current.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        if let Some(extra) = extra {
            storage.merge(extra)?;
        }
        let mut updated = current.clone();
        edit(&mut updated);
        let after = FundedAttackExecution::from_storage(updated, storage, &budget)?;
        let key = UndoKey::AttackExecution(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        if first {
            self.journal
                .reserve(2 * size_of::<Undo>() + action_id.len())?;
            self.state
                .entities
                .retain_attack_execution(entity, &budget)?;
        }
        let before = self
            .state
            .entities
            .swap_attack_execution(entity, action_id, after, &budget)?;
        if first {
            self.journal.retain(
                key,
                Undo::AttackExecution {
                    entity,
                    action_id: action_id.to_owned(),
                    before,
                },
            )?;
        }
        Ok(())
    }
}
