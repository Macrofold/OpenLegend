//! Sparse participation inverses join the same physical checkpoint as action,
//! resource, status and receiving effects. No operational timer writes here.
use super::*;
impl PhysicalMutation<'_> {
    pub(crate) fn replace_participation(
        &mut self,
        id: &str,
        next: crate::state::Participation,
        storage: ByteReservation,
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
        if storage.bytes() < next.heap_bytes().ok_or(ExecutionError::Capacity)? {
            return Err(ExecutionError::Capacity);
        }
        let first = self
            .journal
            .first(&UndoKey::Participation(handle.slot, handle.generation))?;
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                id.len() * 2,
                actor
                    .participation
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        self.journal.reservation.merge(storage)?;
        let before = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .participation
            .replace(next);
        if first {
            self.journal.retain(
                UndoKey::Participation(handle.slot, handle.generation),
                Undo::Participation {
                    entity: handle,
                    before,
                },
            )?;
        }
        self.state.entities.settle_participation_memory(
            handle,
            &mut self.journal.reservation,
            false,
        )?;
        self.state.bodies.refresh(&self.state.entities, id)?;
        Ok(())
    }
    pub(crate) fn participation_changed(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.journal
            .reserve(2 * size_of::<PhysicalChange>() + id.len())?;
        self.journal.change(PhysicalChange::Participation {
            entity_id: id.to_owned(),
        })
    }
    pub(crate) fn set_exit_exposure(
        &mut self,
        id: &str,
        after: Option<f64>,
    ) -> Result<(), ExecutionError> {
        let before = self
            .state
            .participation
            .exposures
            .as_ref()
            .and_then(|rows| rows.get_full(id))
            .map(|(position, _, deadline)| (position, *deadline));
        if before.map(|(_, deadline)| deadline) == after {
            return Ok(());
        }
        if after.is_some_and(|deadline| !deadline.is_finite() || deadline < 0.0) {
            return Err(ExecutionError::Invariant);
        }
        let root_present = self.state.participation.is_present();
        self.journal.reserve(2 * size_of::<Undo>() + id.len() * 4)?;
        let key = UndoKey::ExitExposure(id.to_owned());
        let first = self.journal.first(&key)?;
        self.state
            .participation
            .prepare_write(id, after.is_some())?;
        if first {
            self.journal.retain(
                key,
                Undo::ExitExposure {
                    actor: id.to_owned(),
                    before,
                    root_present,
                },
            )?;
        }
        if let Some(rows) = self.state.participation.exposures.as_mut() {
            if let Some(deadline) = after {
                if rows.contains_key(id) {
                    rows.insert(id.to_owned(), deadline);
                } else {
                    let position = rows
                        .keys()
                        .position(|key| crate::encoding::js_property_cmp(id, key).is_lt())
                        .unwrap_or(rows.len());
                    rows.shift_insert(position, id.to_owned(), deadline);
                }
            } else {
                rows.shift_remove(id);
            }
        }
        self.state.participation.settle()?;
        Ok(())
    }
    pub(crate) fn remove_participation_contact(
        &mut self,
        id: &str,
        subject: &str,
    ) -> Result<(), ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(());
        };
        let Some(value) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.contacts.as_ref())
            .and_then(|contacts| contacts.get(subject))
        else {
            return Ok(());
        };
        self.journal.reserve(
            2 * size_of::<Undo>()
                + subject.len() * 3
                + value.heap_bytes().ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::Contact(handle.slot, handle.generation, subject.to_owned());
        let first = self.journal.first(&key)?;
        let (position, subject, value) = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.contacts.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .shift_remove_full(subject)
            .ok_or(ExecutionError::Invariant)?;
        if first {
            self.journal.retain(
                key,
                Undo::Contact {
                    entity: handle,
                    subject,
                    before: (position, value),
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn clear_participation_fall(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        if entity.spatial.fall_velocity.is_none() {
            return Ok(());
        }
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        self.journal.reserve(2 * size_of::<Undo>())?;
        let key = UndoKey::BodyLifecycle(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::BodyLifecycle {
                    entity: handle,
                    alive: actor.alive,
                    incapacitated: actor.incapacitated,
                    fall_velocity: entity.spatial.fall_velocity,
                    local_avoidance_ready_at: entity.spatial.local_avoidance_ready_at,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?
            .spatial
            .fall_velocity = None;
        Ok(())
    }
}
