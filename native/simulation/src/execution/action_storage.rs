//! Field inverses keep the exact allocation they move out of a resident action.
//! These swaps are shared only by its semantic writer and reverse-order undo.
use super::*;
use crate::state::{FundedActionNavigation, FundedActionPath, FundedActionRoute};
fn check(state: &PhysicalState, entity: EntityHandle, id: &str) -> Result<(), ExecutionError> {
    let action = state
        .entities
        .resolve(entity)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .filter(|a| a.id == id)
        .ok_or(ExecutionError::Invariant)?;
    if action.has_unconverted_fields() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    Ok(())
}
pub(super) fn swap_path(
    state: &mut PhysicalState,
    entity: EntityHandle,
    id: &str,
    after: FundedActionPath,
) -> Result<FundedActionPath, ExecutionError> {
    let bytes = state
        .entities
        .resolve(entity)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .ok_or(ExecutionError::Invariant)?
        .path
        .heap_bytes()
        .ok_or(ExecutionError::Capacity)?;
    check(state, entity, id)?;
    let storage = state
        .entities
        .swap_action_path_storage(entity, after.storage, bytes)?;
    let action = state
        .entities
        .resolve_mut(entity)
        .and_then(|e| e.actor.as_mut())
        .and_then(|a| a.action.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    let value = std::mem::replace(&mut action.path, after.value);
    Ok(FundedActionPath { value, storage })
}
pub(super) fn swap_navigation(
    state: &mut PhysicalState,
    entity: EntityHandle,
    id: &str,
    after: FundedActionNavigation,
) -> Result<FundedActionNavigation, ExecutionError> {
    let bytes = state
        .entities
        .resolve(entity)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .ok_or(ExecutionError::Invariant)?
        .navigation
        .heap_bytes()
        .ok_or(ExecutionError::Capacity)?;
    check(state, entity, id)?;
    let storage = state
        .entities
        .swap_action_navigation_storage(entity, after.storage, bytes)?;
    let action = state
        .entities
        .resolve_mut(entity)
        .and_then(|e| e.actor.as_mut())
        .and_then(|a| a.action.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    let value = std::mem::replace(&mut action.navigation, after.value);
    Ok(FundedActionNavigation { value, storage })
}
pub(super) fn swap_route(
    state: &mut PhysicalState,
    entity: EntityHandle,
    id: &str,
    after: FundedActionRoute,
) -> Result<FundedActionRoute, ExecutionError> {
    let action = state
        .entities
        .resolve(entity)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let _bytes = heap_sum([
        action.path.heap_bytes().ok_or(ExecutionError::Capacity)?,
        action
            .navigation
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        action.stage.capacity(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    check(state, entity, id)?;
    let storage = state
        .entities
        .swap_action_route_storage(entity, after.storage)?;
    let action = state
        .entities
        .resolve_mut(entity)
        .and_then(|e| e.actor.as_mut())
        .and_then(|a| a.action.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    let value = ActionRouteWrite {
        path: std::mem::replace(&mut action.path, after.value.path),
        navigation: std::mem::replace(&mut action.navigation, after.value.navigation),
        stage: std::mem::replace(&mut action.stage, after.value.stage),
        replans: std::mem::replace(&mut action.replans, after.value.replans),
    };
    Ok(FundedActionRoute { value, storage })
}
