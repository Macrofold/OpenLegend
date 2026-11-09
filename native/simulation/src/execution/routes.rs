//! The selected movement family's canonical route fields. Replanning does not
//! replace the actor, its action identity, or unrelated private continuation.
use super::*;
impl PhysicalMutation<'_> {
    /// Private sampling is saved route continuation, not a new outward change.
    /// docs/simulation-time.md#native-interval-contract
    pub(crate) fn set_motion_sample_remaining(
        &mut self,
        handle: EntityHandle,
        action_id: &str,
        remaining: f64,
    ) -> Result<(), ExecutionError> {
        if !remaining.is_finite() || remaining < 0.0 {
            return Err(ExecutionError::Invariant);
        }
        let action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id && action.kind == "move")
            .ok_or(ExecutionError::Invariant)?;
        let before = action.motion_sample_remaining_metres;
        if before == Some(remaining) {
            return Ok(());
        }
        self.journal
            .reserve(2 * size_of::<Undo>() + action_id.len())?;
        let key = UndoKey::ActionSample(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::ActionSample {
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
            .motion_sample_remaining_metres = Some(remaining);
        Ok(())
    }
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
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::ActionNavigation(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.change(PhysicalChange::Navigation {
            entity_id: id.into(),
        })?;
        let storage = self.journal.reservation.split_off(0)?;
        let before = action_storage::swap_navigation(
            self.state,
            handle,
            action_id,
            crate::state::FundedActionNavigation {
                value: None,
                storage,
            },
        )?;
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
        let _action = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id && action.kind == "move")
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(
            heap_sum([2 * size_of::<Undo>(), action_id.len()]).ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::ActionPath(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        let storage = self.journal.reservation.split_off(0)?;
        let before = action_storage::swap_path(
            self.state,
            handle,
            action_id,
            crate::state::FundedActionPath {
                value: Vec::new(),
                storage,
            },
        )?;
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
        after: crate::state::FundedActionRoute,
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
        if !self
            .state
            .entities
            .action_storage(handle)?
            .shares_owner(&after.storage)
        {
            return Err(ExecutionError::Invariant);
        }
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                size_of::<PhysicalChange>(),
                action_id.len(),
                id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = UndoKey::ActionRoute(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.change(PhysicalChange::Navigation {
            entity_id: id.to_owned(),
        })?;
        let before = action_storage::swap_route(self.state, handle, action_id, after)?;
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
