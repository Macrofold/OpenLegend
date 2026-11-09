//! Per-slot canonical metadata custody. Independently replaced action/goal/
//! intent buffers retain their dedicated move owners. This first component
//! covers semantic continuation; remaining physical components join this owner.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
mod authored;
mod store;
pub(super) use store::EntityStoreMemory;

heap_record!(ResolvedSemanticCause {
    purpose,
    qualitative_revision
});
heap_record!(SemanticContinuation {
    discovery,
    reservation,
    occupied_purpose,
    resolved
});

pub(super) struct EntityMetadata {
    _authored: ResidentReservation,
    semantic: usize,
    storage: ResidentReservation,
    budget: ByteBudget,
}
impl EntityMetadata {
    pub(super) fn new(entity: &Entity, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let semantic = semantic_bytes(entity)?;
        Ok(Self {
            _authored: budget
                .reserve_record(authored::bytes(entity).ok_or(ExecutionError::Capacity)?)?,
            semantic,
            storage: budget.reserve_backing(semantic)?,
            budget: budget.clone(),
        })
    }
}

fn semantic_bytes(entity: &Entity) -> Result<usize, ExecutionError> {
    entity
        .actor
        .as_ref()
        .map_or(Some(0), |actor| actor.agency.semantic.heap_bytes())
        .ok_or(ExecutionError::Capacity)
}

impl EntityStore {
    pub(crate) fn fund_entity_metadata(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.fund_store_metadata(budget)?;
        for slot in &mut self.slots {
            let Some(entity) = &slot.entity else { continue };
            if slot.metadata_storage.is_some() {
                return Err(ExecutionError::Invariant);
            }
            slot.metadata_storage = Some(EntityMetadata::new(entity, budget)?);
        }
        Ok(())
    }
    pub(crate) fn settle_semantic_memory(
        &mut self,
        handle: EntityHandle,
        from: &mut ByteReservation,
        restoring: bool,
    ) -> Result<(), ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let after = semantic_bytes(slot.entity.as_ref().ok_or(ExecutionError::MissingEntity)?)?;
        let metadata = slot
            .metadata_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let total = metadata
            .storage
            .bytes()
            .checked_sub(metadata.semantic)
            .and_then(|n| n.checked_add(after))
            .ok_or(ExecutionError::Capacity)?;
        if total > metadata.storage.bytes() {
            let growth = from.split_off(total - metadata.storage.bytes())?;
            if restoring {
                metadata
                    .budget
                    .restore_backing(&mut metadata.storage, growth)?
            } else {
                metadata
                    .budget
                    .fund_backing(&mut metadata.storage, growth)?
            }
        }
        metadata.storage.resize(total)?;
        metadata.semantic = after;
        Ok(())
    }
}
