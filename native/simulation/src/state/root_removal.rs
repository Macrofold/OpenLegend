//! Physical root removal keeps the actual body, ordering keys and their
//! backing in the undo until the candidate commits.
use super::*;
use crate::execution::ExecutionError;
use crate::host::ByteReservation;

pub(crate) struct RemovedPhysicalRoot {
    pub handle: EntityHandle,
    pub entity: Entity,
    order: String,
    id_key: String,
    order_entry: (String, String),
    memory_before: (usize, usize),
    metadata: residency::EntityMetadata,
}

impl EntityStore {
    /// Reserve enough journal bytes for the removed map and slot keys before
    /// dropping their resident storage charge. The body retains its own charge.
    pub(crate) fn physical_root_removal_bound(&self, id: &str) -> Option<usize> {
        let (id_key, handle) = self.by_id.get_key_value(id)?;
        let slot = self.slots.get(handle.slot)?;
        let (key, stored_id) = self.by_order.get_key_value(&slot.order)?;
        residency::EntityStoreMemory::member_bytes(
            id_key.capacity(),
            slot.order.capacity(),
            key.capacity(),
            stored_id.capacity(),
        )
    }

    pub(crate) fn remove_physical_root(
        &mut self,
        id: &str,
    ) -> Result<RemovedPhysicalRoot, ExecutionError> {
        let handle = self.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let slot = &mut self.slots[handle.slot];
        let body = slot.entity.as_ref().ok_or(ExecutionError::Invariant)?;
        if !body.physical_root()
            || body.actor.is_some()
            || body.item.is_some()
            || slot.action_storage.is_some()
            || slot.goal_storage.is_some()
            || slot.intent_storage.is_some()
            || slot.metadata_storage.is_none()
        {
            return Err(ExecutionError::Invariant);
        }
        let (id_key, _) = self
            .by_id
            .get_key_value(id)
            .ok_or(ExecutionError::Invariant)?;
        let (key, stored_id) = self
            .by_order
            .get_key_value(&slot.order)
            .ok_or(ExecutionError::Invariant)?;
        if stored_id != id {
            return Err(ExecutionError::Invariant);
        }
        let memory = self.memory.as_mut().ok_or(ExecutionError::Invariant)?;
        let memory_before = memory.counts();
        memory
            .remove_member(
                id_key.capacity(),
                slot.order.capacity(),
                key.capacity(),
                stored_id.capacity(),
            )
            .ok_or(ExecutionError::Invariant)?;
        Ok(RemovedPhysicalRoot {
            handle,
            entity: slot.entity.take().expect("checked root"),
            id_key: self.by_id.remove_entry(id).expect("checked root id").0,
            order_entry: self
                .by_order
                .remove_entry(&slot.order)
                .expect("checked root order"),
            order: std::mem::take(&mut slot.order),
            memory_before,
            metadata: slot.metadata_storage.take().expect("checked root custody"),
        })
    }

    pub(crate) fn restore_physical_root(
        &mut self,
        removed: RemovedPhysicalRoot,
        journal: &mut ByteReservation,
    ) -> Result<String, ExecutionError> {
        let slot = self
            .slots
            .get_mut(removed.handle.slot)
            .ok_or(ExecutionError::Invariant)?;
        let (key, id) = removed.order_entry;
        if slot.entity.is_some()
            || slot.generation != removed.handle.generation
            || self.by_id.contains_key(&id)
            || self.by_order.contains_key(&key)
        {
            return Err(ExecutionError::Invariant);
        }
        let memory = self.memory.as_mut().ok_or(ExecutionError::Invariant)?;
        memory.restore_counts(removed.memory_before);
        slot.order = removed.order;
        slot.entity = Some(removed.entity);
        slot.metadata_storage = Some(removed.metadata);
        self.by_id.insert(removed.id_key, removed.handle);
        let restored_id = id.clone();
        self.by_order.insert(key, id);
        self.settle_store_memory(journal, true)?;
        Ok(restored_id)
    }
}
