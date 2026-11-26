//! A private intention list and its allocation move together through the one
//! physical journal. Accepting a candidate never releases canonical custody.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};

pub(crate) struct FundedIntents {
    pub value: Vec<crate::plans::PendingIntent>,
    pub storage: ResidentReservation,
}
impl FundedIntents {
    pub(crate) fn new(
        value: Vec<crate::plans::PendingIntent>,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = value.heap_bytes().ok_or(ExecutionError::Capacity)?;
        if storage.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        storage.resize(bytes)?;
        Ok(Self {
            value,
            storage: budget.adopt_record(storage)?,
        })
    }
}
impl EntityStore {
    pub(crate) fn fund_installed_intents(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        for slot in &mut self.slots {
            if slot.intent_storage.is_some() {
                return Err(ExecutionError::Invariant);
            }
            if let Some(actor) = slot
                .entity
                .as_ref()
                .and_then(|entity| entity.actor.as_ref())
            {
                slot.intent_storage = Some(
                    budget.reserve_record(
                        actor
                            .agency
                            .attempts
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?,
                    )?,
                );
            }
        }
        Ok(())
    }
    pub(crate) fn retain_intents(
        &self,
        handle: EntityHandle,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let slot = self
            .slots
            .get(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        if let Some(storage) = &slot.intent_storage {
            budget.retain_record(storage)?;
        }
        Ok(())
    }
    pub(crate) fn swap_funded_intents(
        &mut self,
        handle: EntityHandle,
        mut after: FundedIntents,
    ) -> Result<FundedIntents, ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|slot| slot.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = slot
            .entity
            .as_mut()
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?;
        let before_bytes = actor
            .agency
            .attempts
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        if let Some(storage) = &slot.intent_storage {
            if !storage.shares_owner(&after.storage) || storage.bytes() < before_bytes {
                return Err(ExecutionError::Invariant);
            }
        } else if before_bytes != 0 {
            return Err(ExecutionError::Invariant);
        }
        let storage = match slot.intent_storage.take() {
            Some(storage) => storage,
            None => after.storage.split_off(0)?,
        };
        let value = std::mem::replace(&mut actor.agency.attempts, after.value);
        slot.intent_storage = Some(after.storage);
        Ok(FundedIntents { value, storage })
    }
}
