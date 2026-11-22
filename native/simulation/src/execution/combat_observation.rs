use super::*;

impl PhysicalMutation<'_> {
    /// Move one admitted receipt map into the action without copying its route
    /// or marking the physical preparation as a new action.
    pub(crate) fn replace_attack_observers(
        &mut self,
        entity: EntityHandle,
        action_id: &str,
        next: crate::state::FundedAttackObservers,
    ) -> Result<(), ExecutionError> {
        let key = UndoKey::AttackObservers(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        if first {
            self.journal
                .reserve(2 * size_of::<Undo>() + action_id.len())?;
            self.state
                .entities
                .retain_attack_observers(entity, &self.journal.budget)?;
        }
        let before = self.state.entities.swap_attack_observers(
            entity,
            action_id,
            Some(next),
            &self.journal.budget,
        )?;
        if first {
            self.journal.retain(
                key,
                Undo::AttackObservers {
                    entity,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        Ok(())
    }
}
