//! The exact encounter owner is replaced only on a meaningful accepted change.
//! The original owner moves into undo, including each exact pair and deadline.
use super::*;
use crate::combat_encounters::{PersonalEncounter, PersonalEncounters, UnidentifiedContact};
use crate::host::retained_size::map_storage;

impl PhysicalMutation<'_> {
    /// Reserve the actor-local map and any one additional pair or unknown
    /// contact before the edit can allocate. The caller provides storage for
    /// its new strings. The old map stays in undo only while needed.
    pub(crate) fn edit_personal_encounters(
        &mut self,
        actor_id: &str,
        new_text_bytes: usize,
        edit: impl FnOnce(&mut PersonalEncounters) -> Result<(), ExecutionError>,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        let life = entity.physical_life().ok_or(ExecutionError::MissingActor)?;
        let before = entity
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?
            .encounters
            .as_deref();
        let mut workspace = self.journal.budget.reserve(
            heap_sum([
                before
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ExecutionError::Capacity)?,
                size_of::<PersonalEncounters>(),
                map_storage::<String, PersonalEncounter>(
                    before
                        .map_or(0, |state| state.pairs.capacity())
                        .saturating_mul(2)
                        .max(4),
                )
                .ok_or(ExecutionError::Capacity)?,
                map_storage::<String, UnidentifiedContact>(
                    before
                        .map_or(0, |state| state.unknown.capacity())
                        .saturating_mul(2)
                        .max(4),
                )
                .ok_or(ExecutionError::Capacity)?,
                new_text_bytes,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut next = before.cloned().unwrap_or_else(|| PersonalEncounters {
            life,
            pairs: IndexMap::new(),
            unknown: IndexMap::new(),
            next_at: None,
        });
        if next.life != life {
            return Err(ExecutionError::Invariant);
        }
        edit(&mut next)?;
        let next = (!next.pairs.is_empty() || !next.unknown.is_empty()).then_some(next);
        if next.as_ref() == before {
            return Ok(());
        }
        let next = next.map(Box::new);
        workspace.resize(next.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.replace_personal_encounters(handle, next, Some(workspace))
    }

    pub(crate) fn clear_personal_encounters(
        &mut self,
        actor_id: &str,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        if self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .is_some_and(|actor| actor.encounters.is_some())
        {
            self.replace_personal_encounters(handle, None, None)?;
        }
        Ok(())
    }

    fn replace_personal_encounters(
        &mut self,
        entity: EntityHandle,
        next: Option<Box<PersonalEncounters>>,
        workspace: Option<ByteReservation>,
    ) -> Result<(), ExecutionError> {
        let key = UndoKey::PersonalEncounters(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        let before = self
            .state
            .entities
            .resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .encounters
            .as_ref();
        let undo_bytes = if first {
            before
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.journal.reserve(undo_bytes)?;
        if let Some(workspace) = workspace {
            self.journal.reservation.merge(workspace)?;
        }
        let owner = self
            .state
            .entities
            .resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let before = std::mem::replace(&mut owner.encounters, next);
        if first {
            self.journal
                .retain(key, Undo::PersonalEncounters { entity, before })?;
        }
        self.state
            .entities
            .settle_operational_memory(entity, &mut self.journal.reservation, false)
    }
}
