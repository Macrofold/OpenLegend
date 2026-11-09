//! Canonical membership/index backing is independent of body/action records.
//! New members update cached allocation components; ordinary insertion never
//! walks the whole growing population merely to update memory accounting.
use super::*;
use crate::host::retained_size::{heap_sum, tree_node_bound};
use std::mem::size_of;

pub(in super::super) struct EntityStoreMemory {
    ids: usize,
    order: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}
impl EntityStoreMemory {
    pub(in super::super) fn counts(&self) -> (usize, usize) {
        (self.ids, self.order)
    }
    pub(in super::super) fn restore_counts(&mut self, (ids, order): (usize, usize)) {
        self.ids = ids;
        self.order = order;
    }
    pub(in super::super) fn set_order_bytes(&mut self, order: usize) {
        self.order = order;
    }
    fn id_member_bytes(id: usize) -> Option<usize> {
        tree_node_bound::<String, EntityHandle>()?.checked_add(id)
    }
    pub(in super::super) fn order_member_bytes(
        slot_order: usize,
        key: usize,
        id: usize,
    ) -> Option<usize> {
        heap_sum([tree_node_bound::<String, String>()?, slot_order, key, id])
    }
    pub(in super::super) fn add_member(
        &mut self,
        id: usize,
        slot_order: usize,
        order_key: usize,
    ) -> Option<()> {
        self.ids = self.ids.checked_add(Self::id_member_bytes(id)?)?;
        self.order = self
            .order
            .checked_add(Self::order_member_bytes(slot_order, order_key, id)?)?;
        Some(())
    }
}
impl EntityStore {
    pub(in super::super) fn fund_store_metadata(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if self.memory.is_some() {
            return Err(ExecutionError::Invariant);
        }
        let ids = self
            .by_id
            .keys()
            .try_fold(0_usize, |sum, id| {
                sum.checked_add(EntityStoreMemory::id_member_bytes(id.capacity())?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let order = self
            .by_order
            .iter()
            .try_fold(0_usize, |sum, (key, id)| {
                let handle = self.by_id.get(id)?;
                sum.checked_add(EntityStoreMemory::order_member_bytes(
                    self.slots.get(handle.slot)?.order.capacity(),
                    key.capacity(),
                    id.capacity(),
                )?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let bytes = heap_sum([
            ids,
            order,
            self.slots
                .capacity()
                .checked_mul(size_of::<EntitySlot>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.memory = Some(EntityStoreMemory {
            ids,
            order,
            storage: budget.reserve_backing(bytes)?,
            budget: budget.clone(),
        });
        Ok(())
    }
    pub(crate) fn settle_store_memory(
        &mut self,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let memory = self.memory.as_mut().ok_or(ExecutionError::Invariant)?;
        let bytes = heap_sum([
            memory.ids,
            memory.order,
            self.slots
                .capacity()
                .checked_mul(size_of::<EntitySlot>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        if bytes > memory.storage.bytes() {
            let growth = from.split_off(bytes - memory.storage.bytes())?;
            if restoring {
                memory.budget.restore_backing(&mut memory.storage, growth)?;
            } else {
                memory.budget.fund_backing(&mut memory.storage, growth)?;
            }
        }
        memory.storage.resize(bytes)?;
        Ok(())
    }
}
