//! The selected movement family's canonical route fields. Replanning does not
//! replace the actor, its action identity, or unrelated private continuation.
use super::*;
fn navigation_bytes(
    value: Option<&crate::state::NavigationPending>,
) -> Result<usize, ExecutionError> {
    let Some(value) = value else { return Ok(0) };
    let request = &value.request;
    heap_sum([
        request.wait.as_ref().map_or(0, String::capacity),
        request.from.surface_id.capacity(),
        request
            .destinations
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        request.body.id.capacity(),
        value.failure.as_ref().map_or(0, String::capacity),
    ])
    .ok_or(ExecutionError::Capacity)
}
impl PhysicalMutation<'_> {
    pub(crate) fn clear_action_navigation(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        if action.navigation.is_none() {
            return Ok(());
        }
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                size_of::<PhysicalChange>(),
                action_id.len(),
                id.len(),
                navigation_bytes(action.navigation.as_ref())?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::ActionNavigation(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.change(PhysicalChange::Navigation {
            entity_id: id.into(),
        })?;
        let action = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.action.as_mut())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        let before = action.navigation.take();
        if first {
            self.journal.retain(
                key,
                Undo::ActionNavigation {
                    entity: handle,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn clear_movement_path(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id && action.kind == "move")
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                action_id.len(),
                action.path.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::ActionPath(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        let action = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.action.as_mut())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        let before = std::mem::take(&mut action.path);
        if first {
            self.journal.retain(
                key,
                Undo::ActionPath {
                    entity: handle,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn advance_movement_work(
        &mut self,
        id: &str,
        action_id: &str,
        seconds: f64,
        epsilon: f64,
    ) -> Result<bool, ExecutionError> {
        if !seconds.is_finite() || seconds < 0.0 {
            return Err(ExecutionError::Invariant);
        }
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| {
                action.id == action_id && action.kind == "move" && action.stage == "working"
            })
            .ok_or(ExecutionError::Invariant)?;
        let before = action.remaining_seconds;
        let after = (before - seconds).max(0.0);
        let after = if after <= epsilon { 0.0 } else { after };
        self.journal
            .reserve(2 * size_of::<Undo>() + action_id.len())?;
        let key = UndoKey::ActionRemaining(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::ActionRemaining {
                    entity: handle,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.action.as_mut())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?
            .remaining_seconds = after;
        Ok(after == 0.0)
    }

    pub(crate) fn increment_action_replans(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        let before = action.replans;
        let next = before
            .unwrap_or(0)
            .checked_add(1)
            .filter(|value| *value <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        self.journal
            .reserve(2 * size_of::<Undo>() + action_id.len())?;
        let key = UndoKey::ActionReplans(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::ActionReplans {
                    entity: handle,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.action.as_mut())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?
            .replans = Some(next);
        Ok(())
    }
    pub(crate) fn replace_action_route(
        &mut self,
        id: &str,
        action_id: &str,
        after: ActionRouteWrite,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        if action.kind != "move" {
            return Err(ExecutionError::UnsupportedFamily);
        }
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                size_of::<PhysicalChange>(),
                action_id.len(),
                id.len(),
                action.path.heap_bytes().ok_or(ExecutionError::Capacity)?,
                navigation_bytes(action.navigation.as_ref())?,
                action.stage.capacity(),
                after.path.heap_bytes().ok_or(ExecutionError::Capacity)?,
                navigation_bytes(after.navigation.as_ref())?,
                after.stage.capacity(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::ActionRoute(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.change(PhysicalChange::Navigation {
            entity_id: id.to_owned(),
        })?;
        let action = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.action.as_mut())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        let before = ActionRouteWrite {
            path: std::mem::replace(&mut action.path, after.path),
            navigation: std::mem::replace(&mut action.navigation, after.navigation),
            stage: std::mem::replace(&mut action.stage, after.stage),
            replans: std::mem::replace(&mut action.replans, after.replans),
        };
        if first {
            self.journal.retain(
                key,
                Undo::ActionRoute {
                    entity: handle,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        Ok(())
    }
}
