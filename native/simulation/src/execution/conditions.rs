//! Sparse condition episodes interpret existing meters; they never introduce a
//! second physiological value or acquire awareness during a physical write.
use super::*;
use crate::host::retained_size::map_storage;
use crate::state::ConditionEpisode;
impl PhysicalMutation<'_> {
    pub(crate) fn put_condition(
        &mut self,
        id: &str,
        attribute: &str,
        after: Option<ConditionEpisode>,
    ) -> Result<bool, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let before = actor
            .conditions
            .as_ref()
            .and_then(|conditions| conditions.get_full(attribute))
            .map(|(position, _, before)| (position, before.clone()));
        if before.as_ref().map(|(_, episode)| episode) == after.as_ref() {
            return Ok(false);
        }
        let root_present = actor.conditions.is_some();
        let needed = actor
            .conditions
            .as_ref()
            .map_or(0, IndexMap::len)
            .checked_add(usize::from(after.is_some() && before.is_none()))
            .ok_or(ExecutionError::Capacity)?;
        let growth = if actor
            .conditions
            .as_ref()
            .is_none_or(|map| needed > map.capacity())
        {
            map_storage::<String, ConditionEpisode>(
                needed
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(8))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                attribute
                    .len()
                    .checked_mul(3)
                    .ok_or(ExecutionError::Capacity)?,
                growth,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut created = if !root_present {
            let mut map = IndexMap::new();
            map.try_reserve(needed)
                .map_err(|_| ExecutionError::Capacity)?;
            Some(map)
        } else {
            None
        };
        if root_present && after.is_some() {
            self.state
                .entities
                .resolve_mut(handle)
                .and_then(|entity| entity.actor.as_mut())
                .and_then(|actor| actor.conditions.as_mut())
                .ok_or(ExecutionError::Invariant)?
                .try_reserve(usize::from(before.is_none()))
                .map_err(|_| ExecutionError::Capacity)?;
        }
        let key = UndoKey::Condition(handle.slot, handle.generation, attribute.into());
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::Condition {
                    entity: handle,
                    key: attribute.into(),
                    before: before.clone(),
                    root_present,
                },
            )?;
        }
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        if let Some(map) = created.take() {
            actor.conditions = Some(map);
        }
        let map = actor.conditions.as_mut().ok_or(ExecutionError::Invariant)?;
        match after {
            Some(after) => {
                if let Some((position, _)) = before {
                    map.shift_insert(position, attribute.into(), after);
                } else {
                    map.insert(attribute.into(), after);
                }
            }
            None => {
                map.shift_remove(attribute);
            }
        }
        Ok(true)
    }
}
