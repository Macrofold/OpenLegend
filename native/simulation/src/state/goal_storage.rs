//! Goal prose and its vector backing keep custody with the actual actor slot.
//! A before-image moves both values and allowance; acceptance drops only undo.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};

impl HeapBytes for Goal {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.id.heap_bytes()?,
            self.objective.heap_bytes()?,
            self.status.heap_bytes()?,
            self.parent_id.heap_bytes()?,
            self.author.heap_bytes()?,
            self.source_id.heap_bytes()?,
            self.completion.heap_bytes()?,
        ])
    }
}
pub(crate) struct FundedGoals {
    pub value: Vec<Goal>,
    pub storage: ByteReservation,
}
impl FundedGoals {
    pub(crate) fn new(
        value: Vec<Goal>,
        mut storage: ByteReservation,
    ) -> Result<Self, ExecutionError> {
        let bytes = value.heap_bytes().ok_or(ExecutionError::Capacity)?;
        if storage.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        storage.resize(bytes)?;
        Ok(Self { value, storage })
    }
}
impl EntityStore {
    pub(crate) fn fund_installed_goals(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        for slot in &mut self.slots {
            if slot.goal_storage.is_some() {
                return Err(ExecutionError::Invariant);
            }
            if let Some(actor) = slot
                .entity
                .as_ref()
                .and_then(|entity| entity.actor.as_ref())
            {
                slot.goal_storage = Some(
                    budget.reserve(
                        actor
                            .agency
                            .goals
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?,
                    )?,
                );
            }
        }
        Ok(())
    }
    pub(crate) fn swap_funded_goals(
        &mut self,
        handle: EntityHandle,
        mut after: FundedGoals,
    ) -> Result<FundedGoals, ExecutionError> {
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
            .goals
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        if let Some(storage) = &slot.goal_storage {
            if !storage.shares_owner(&after.storage) || storage.bytes() < before_bytes {
                return Err(ExecutionError::Invariant);
            }
        } else if before_bytes != 0 {
            return Err(ExecutionError::Invariant);
        }
        let before_storage = slot
            .goal_storage
            .take()
            .unwrap_or(after.storage.split_off(0)?);
        let value = std::mem::replace(&mut actor.agency.goals, after.value);
        slot.goal_storage = Some(after.storage);
        Ok(FundedGoals {
            value,
            storage: before_storage,
        })
    }
}
