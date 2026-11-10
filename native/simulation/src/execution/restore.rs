//! Operational rewind changes these actor fields before privacy reconciliation.
//! Their original values remain in the same sparse physical journal.
use super::*;
impl PhysicalMutation<'_> {
    pub(crate) fn restore_actor_operational(
        &mut self,
        id: &str,
        make_player: bool,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if (!make_player || actor.controller == "player") && actor.inventory_inspection.is_none() {
            return Ok(());
        }
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                id.len() * 2,
                actor.controller.capacity() * 2,
                actor
                    .inventory_inspection
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                12,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let first = self
            .journal
            .first(&UndoKey::RestoreActor(handle.slot, handle.generation))?;
        let controller = if first {
            Some(actor.controller.clone())
        } else {
            None
        };
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let inspection = actor.inventory_inspection.take();
        if make_player && actor.controller != "player" {
            actor.controller = "player".to_owned();
        }
        if let Some(controller) = controller {
            self.journal.retain(
                UndoKey::RestoreActor(handle.slot, handle.generation),
                Undo::RestoreActor {
                    entity: handle,
                    controller,
                    inspection,
                },
            )?;
        }
        self.state.entities.settle_operational_memory(
            handle,
            &mut self.journal.reservation,
            false,
        )?;
        self.state.bodies.refresh(&self.state.entities, id)?;
        Ok(())
    }
}
