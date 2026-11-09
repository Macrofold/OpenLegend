//! Sparse participation inverses join the same physical checkpoint as action,
//! resource, status and receiving effects. No operational timer writes here.
use super::*;
impl PhysicalMutation<'_> {
    pub(crate) fn replace_participation(
        &mut self, id: &str, next: crate::state::Participation, mut storage: ByteReservation,
    ) -> Result<(), ExecutionError> {
        let handle = self.state.entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let actor = self.state.entities.resolve(handle).and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if storage.bytes() < next.heap_bytes().ok_or(ExecutionError::Capacity)? {
            return Err(ExecutionError::Capacity);
        }
        let first = self.journal.first(&UndoKey::Participation(handle.slot, handle.generation))?;
        self.journal.reserve(heap_sum([
            2 * size_of::<Undo>(), id.len() * 2,
            actor.participation.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?)?;
        let before = self.state.entities.resolve_mut(handle).and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?.participation.replace(next);
        self.state.entities.settle_participation_memory(handle, &mut storage, false)?;
        if first {
            self.journal.retain(UndoKey::Participation(handle.slot, handle.generation),
                Undo::Participation { entity: handle, before })?;
        }
        self.journal.change(PhysicalChange::Behavior { entity_id: id.to_owned(), outward_change: false })?;
        self.state.bodies.refresh(&self.state.entities, id)?;
        Ok(())
    }
    pub(crate) fn set_exit_exposure(&mut self, id: &str, after: Option<f64>) -> Result<(), ExecutionError> {
        let before = self.state.participation.exposures.as_ref().and_then(|rows| rows.get_full(id))
            .map(|(position, _, deadline)| (position, *deadline));
        if before.map(|(_, deadline)| deadline) == after { return Ok(()); }
        if after.is_some_and(|deadline| !deadline.is_finite() || deadline < 0.0) {
            return Err(ExecutionError::Invariant);
        }
        let root_present = self.state.participation.is_present();
        self.journal.reserve(2 * size_of::<Undo>() + id.len() * 4)?;
        let key = UndoKey::ExitExposure(id.to_owned());
        let first = self.journal.first(&key)?;
        self.state.participation.prepare_write(id, after.is_some())?;
        if first { self.journal.retain(key, Undo::ExitExposure { actor: id.to_owned(), before, root_present })?; }
        if let Some(rows) = self.state.participation.exposures.as_mut() {
            if let Some(deadline) = after { rows.insert(id.to_owned(), deadline); }
            else { rows.shift_remove(id); }
        }
        self.state.participation.settle()?;
        Ok(())
    }
}
