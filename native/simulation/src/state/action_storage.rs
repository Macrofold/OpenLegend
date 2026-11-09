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

// These are the independently replaced buffer graphs of one action. A route
// update moves only its path/navigation/stage guards; immutable before-images
// keep their existing shared candidate pins. No pinned guard is resized/split.
pub(crate) struct ActionStorage {
    base: crate::host::ResidentReservation,
    route: ActionRouteStorage,
}
pub(crate) struct ActionRouteStorage {
    path: crate::host::ResidentReservation,
    navigation: crate::host::ResidentReservation,
    stage: crate::host::ResidentReservation,
}
impl ActionRouteStorage {
    fn from_storage(
        value: &ActionRouteWrite,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let path = heap(&value.path)?;
        let navigation = heap(&value.navigation)?;
        let stage = value.stage.capacity();
        let total = heap_sum([path, navigation, stage]).ok_or(ExecutionError::Capacity)?;
        if storage.bytes() < total {
            return Err(ExecutionError::Capacity);
        }
        storage.resize(total)?;
        Ok(Self {
            path: budget.adopt_record(storage.split_off(path)?)?,
            navigation: budget.adopt_record(storage.split_off(navigation)?)?,
            stage: budget.adopt_record(storage)?,
        })
    }
    fn install(action: &Action, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            path: budget.reserve_record(heap(&action.path)?)?,
            navigation: budget.reserve_record(heap(&action.navigation)?)?,
            stage: budget.reserve_record(action.stage.capacity())?,
        })
    }
    pub(crate) fn is_funded_by(&self, budget: &ByteBudget) -> bool {
        [&self.path, &self.navigation, &self.stage]
            .iter()
            .all(|guard| budget.resident().owns(guard))
    }
    fn retain(&self, budget: &ByteBudget) -> Result<(), ExecutionError> {
        budget.retain_record(&self.path)?;
        budget.retain_record(&self.navigation)?;
        budget.retain_record(&self.stage)?;
        Ok(())
    }
}
impl ActionStorage {
    fn from_storage(
        value: &Action,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let total = heap(value)?;
        if storage.bytes() < total {
            return Err(ExecutionError::Capacity);
        }
        storage.resize(total)?;
        let path = heap(&value.path)?;
        let navigation = heap(&value.navigation)?;
        let stage = value.stage.capacity();
        Ok(Self {
            route: ActionRouteStorage {
                path: budget.adopt_record(storage.split_off(path)?)?,
                navigation: budget.adopt_record(storage.split_off(navigation)?)?,
                stage: budget.adopt_record(storage.split_off(stage)?)?,
            },
            base: budget.adopt_record(storage)?,
        })
    }
    pub(crate) fn is_funded_by(&self, budget: &ByteBudget) -> bool {
        budget.resident().owns(&self.base) && self.route.is_funded_by(budget)
    }
    pub(crate) fn retain(&self, budget: &ByteBudget) -> Result<(), ExecutionError> {
        budget.retain_record(&self.base)?;
        self.route.retain(budget)
    }
}
pub(crate) struct FundedAction {
    pub value: Action,
    pub storage: ActionStorage,
}
impl FundedAction {
    pub(crate) fn from_storage(
        value: Action,
        storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = ActionStorage::from_storage(&value, storage, budget)?;
        Ok(Self { value, storage })
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
    pub storage: ActionRouteStorage,
}
impl FundedActionRoute {
    pub(crate) fn from_storage(
        value: ActionRouteWrite,
        storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = ActionRouteStorage::from_storage(&value, storage, budget)?;
        Ok(Self { value, storage })
    }
}
pub(crate) struct FundedActionPath {
    pub value: Vec<SurfacePoint>,
    pub storage: crate::host::ResidentReservation,
}
impl FundedActionPath {
    pub(crate) fn from_storage(
        value: Vec<SurfacePoint>,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = heap(&value)?;
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
pub(crate) struct FundedActionNavigation {
    pub value: Option<NavigationPending>,
    pub storage: crate::host::ResidentReservation,
}
impl FundedActionNavigation {
    pub(crate) fn from_storage(
        value: Option<NavigationPending>,
        mut storage: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = heap(&value)?;
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
                let route = ActionRouteStorage::install(action, budget)?;
                let other = heap(action)?
                    .checked_sub(
                        heap_sum([
                            heap(&action.path)?,
                            heap(&action.navigation)?,
                            action.stage.capacity(),
                        ])
                        .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?;
                slot.action_storage = Some(ActionStorage {
                    base: budget.reserve_record(other)?,
                    route,
                });
            }
        }
        Ok(())
    }
    pub(crate) fn action_storage(
        &self,
        handle: EntityHandle,
    ) -> Result<&ActionStorage, ExecutionError> {
        self.slots
            .get(handle.slot)
            .filter(|s| s.generation == handle.generation)
            .and_then(|s| s.action_storage.as_ref())
            .ok_or(ExecutionError::Invariant)
    }
    fn action_storage_mut(
        &mut self,
        handle: EntityHandle,
    ) -> Result<&mut ActionStorage, ExecutionError> {
        self.slots
            .get_mut(handle.slot)
            .filter(|s| s.generation == handle.generation)
            .and_then(|s| s.action_storage.as_mut())
            .ok_or(ExecutionError::Invariant)
    }
    pub(crate) fn retain_action_path(
        &self,
        handle: EntityHandle,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        budget.retain_record(&self.action_storage(handle)?.route.path)?;
        Ok(())
    }
    pub(crate) fn retain_action_navigation(
        &self,
        handle: EntityHandle,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        budget.retain_record(&self.action_storage(handle)?.route.navigation)?;
        Ok(())
    }
    pub(crate) fn retain_action_route(
        &self,
        handle: EntityHandle,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.action_storage(handle)?.route.retain(budget)
    }
    pub(crate) fn swap_action_path_storage(
        &mut self,
        handle: EntityHandle,
        after: crate::host::ResidentReservation,
        bytes: usize,
    ) -> Result<crate::host::ResidentReservation, ExecutionError> {
        let old = &mut self.action_storage_mut(handle)?.route.path;
        if old.bytes() < bytes || !old.shares_owner(&after) {
            return Err(ExecutionError::Invariant);
        }
        Ok(std::mem::replace(old, after))
    }
    pub(crate) fn swap_action_navigation_storage(
        &mut self,
        handle: EntityHandle,
        after: crate::host::ResidentReservation,
        bytes: usize,
    ) -> Result<crate::host::ResidentReservation, ExecutionError> {
        let old = &mut self.action_storage_mut(handle)?.route.navigation;
        if old.bytes() < bytes || !old.shares_owner(&after) {
            return Err(ExecutionError::Invariant);
        }
        Ok(std::mem::replace(old, after))
    }
    pub(crate) fn swap_action_route_storage(
        &mut self,
        handle: EntityHandle,
        after: ActionRouteStorage,
    ) -> Result<ActionRouteStorage, ExecutionError> {
        let old = &mut self.action_storage_mut(handle)?.route;
        if !old.path.shares_owner(&after.path)
            || !old.navigation.shares_owner(&after.navigation)
            || !old.stage.shares_owner(&after.stage)
        {
            return Err(ExecutionError::Invariant);
        }
        Ok(std::mem::replace(old, after))
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
