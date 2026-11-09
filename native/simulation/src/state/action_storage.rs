//! Actual action buffers and their host custody move together. These guards are
//! neither saved state nor another action representation/mutation authority.
use super::*;
use crate::execution::{ActionRouteWrite, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};

impl HeapBytes for Yield {
    fn heap_bytes(&self) -> Option<usize> {
        Some(self.definition_id.capacity())
    }
}
impl HeapBytes for NavigationRequest {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.wait.heap_bytes()?,
            self.from.heap_bytes()?,
            self.destinations.heap_bytes()?,
            self.body.id.capacity(),
        ])
    }
}
impl HeapBytes for NavigationPending {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.request.heap_bytes()?, self.failure.heap_bytes()?])
    }
}
impl HeapBytes for crate::native_response::NativeLocomotion {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.profile.heap_bytes()?,
            self.locomotion.capacity(),
            self.episode_id.heap_bytes()?,
        ])
    }
}
impl HeapBytes for Action {
    fn heap_bytes(&self) -> Option<usize> {
        // Installation and all selected writers refuse the actual unconverted
        // families. Their payload can never disappear from an allocation estimate.
        if self.has_unconverted_fields() {
            return None;
        }
        heap_sum([
            self.native_locomotion.heap_bytes()?,
            self.id.capacity(),
            self.kind.capacity(),
            self.stage.capacity(),
            self.target_id.heap_bytes()?,
            self.destination.heap_bytes()?,
            self.path.heap_bytes()?,
            self.navigation.heap_bytes()?,
            self.attribute_id.heap_bytes()?,
            self.definition_id.heap_bytes()?,
            self.resource_definition.heap_bytes()?,
            self.consumed.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ActionRouteWrite {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.path.heap_bytes()?,
            self.navigation.heap_bytes()?,
            self.stage.capacity(),
        ])
    }
}
fn heap<T: HeapBytes>(value: &T) -> Result<usize, ExecutionError> {
    value.heap_bytes().ok_or(ExecutionError::UnsupportedFamily)
}

pub(crate) struct FundedAction {
    pub value: Action,
    pub storage: ByteReservation,
}
impl FundedAction {
    pub(crate) fn from_storage(
        value: Action,
        storage: ByteReservation,
    ) -> Result<Self, ExecutionError> {
        let mut funded = Self { value, storage };
        let bytes = heap(&funded.value)?;
        if funded.storage.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        funded.storage.resize(bytes)?;
        Ok(funded)
    }
}
impl std::ops::Deref for FundedAction {
    type Target = Action;
    fn deref(&self) -> &Action {
        &self.value
    }
}
pub(crate) struct FundedActionRoute {
    pub value: ActionRouteWrite,
    pub storage: ByteReservation,
}
impl FundedActionRoute {
    pub(crate) fn from_storage(
        value: ActionRouteWrite,
        storage: ByteReservation,
    ) -> Result<Self, ExecutionError> {
        let mut funded = Self { value, storage };
        let bytes = heap(&funded.value)?;
        if funded.storage.bytes() < bytes {
            return Err(ExecutionError::Capacity);
        }
        funded.storage.resize(bytes)?;
        Ok(funded)
    }
}
pub(crate) struct FundedActionPath {
    pub value: Vec<SurfacePoint>,
    pub storage: ByteReservation,
}
pub(crate) struct FundedActionNavigation {
    pub value: Option<NavigationPending>,
    pub storage: ByteReservation,
}

impl EntityStore {
    pub(crate) fn fund_installed_actions(
        &mut self,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        for slot in &mut self.slots {
            if slot.action_storage.is_some() {
                return Err(ExecutionError::Invariant);
            }
            if let Some(action) = slot
                .entity
                .as_ref()
                .and_then(|e| e.actor.as_ref())
                .and_then(|a| a.action.as_ref())
            {
                slot.action_storage = Some(budget.reserve(heap(action)?)?);
            }
        }
        Ok(())
    }
    pub(crate) fn action_storage(
        &self,
        handle: EntityHandle,
    ) -> Result<&ByteReservation, ExecutionError> {
        self.slots
            .get(handle.slot)
            .filter(|s| s.generation == handle.generation)
            .and_then(|s| s.action_storage.as_ref())
            .ok_or(ExecutionError::Invariant)
    }
    pub(crate) fn detach_action_storage(
        &mut self,
        handle: EntityHandle,
        bytes: usize,
    ) -> Result<ByteReservation, ExecutionError> {
        Ok(self
            .slots
            .get_mut(handle.slot)
            .filter(|s| s.generation == handle.generation)
            .and_then(|s| s.action_storage.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .split_off(bytes)?)
    }
    pub(crate) fn attach_action_storage(
        &mut self,
        handle: EntityHandle,
        storage: ByteReservation,
    ) -> Result<(), ExecutionError> {
        let guard = self
            .slots
            .get_mut(handle.slot)
            .filter(|s| s.generation == handle.generation)
            .and_then(|s| s.action_storage.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        if !guard.shares_owner(&storage) {
            return Err(ExecutionError::Invariant);
        }
        guard.merge(storage)?;
        Ok(())
    }
    pub(crate) fn swap_funded_action(
        &mut self,
        handle: EntityHandle,
        after: Option<FundedAction>,
    ) -> Result<Option<FundedAction>, ExecutionError> {
        let slot = self
            .slots
            .get_mut(handle.slot)
            .filter(|s| s.generation == handle.generation)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = slot
            .entity
            .as_mut()
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?;
        if actor.action.is_some() != slot.action_storage.is_some() {
            return Err(ExecutionError::Invariant);
        }
        let (value, storage) = after
            .map(|a| (Some(a.value), Some(a.storage)))
            .unwrap_or((None, None));
        let before = std::mem::replace(&mut actor.action, value);
        let old = std::mem::replace(&mut slot.action_storage, storage);
        Ok(before
            .zip(old)
            .map(|(value, storage)| FundedAction { value, storage }))
    }
}
