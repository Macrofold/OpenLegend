//! Semantic opportunities are saved private continuation, not sensory facts.
//! These mutations share the candidate physical journal and never open an
//! interval merely because a provider job completed.

use super::*;

impl CoreMutation<'_> {
    /// Source finishCommandWorld reconciles the command actor and characters
    /// whose chosen purpose can have changed. Placement, received detail and
    /// ordinary attribute writes cannot change that purpose; plan/action owners
    /// can. Select from this child journal, never the whole population/history.
    pub(crate) fn reconcile_command_semantics(
        &mut self,
        child: &CandidateCheckpoint,
        actor: &str,
    ) -> Result<(), ExecutionError> {
        if self.journal.frames.len() != child.depth + 1 {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let physical = self
            .journal
            .frames
            .last()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .physical;
        let frame = self
            .journal
            .physical
            .frames
            .get(physical.depth)
            .filter(|frame| frame.serial == physical.serial)
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let changed = &self.journal.physical.undo[frame.undo_start..];
        let count = changed
            .iter()
            .filter(|undo| semantic_subject(undo).is_some())
            .count()
            .checked_add(1)
            .ok_or(ExecutionError::Capacity)?;
        let text_bytes = changed
            .iter()
            .try_fold(actor.len(), |bytes, undo| {
                bytes.checked_add(
                    semantic_subject(undo)
                        .and_then(|handle| self.state.physical.entities.resolve(handle))
                        .map_or(0, |entity| entity.id.len()),
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let budget = self.journal.byte_budget().clone();
        let _guard = budget.reserve(
            crate::host::retained_size::map_storage::<String, ()>(count)
                .and_then(|bytes| bytes.checked_add(text_bytes))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut ids = IndexSet::with_capacity(count);
        ids.insert(actor.to_owned());
        for undo in changed {
            if let Some(entity) = semantic_subject(undo)
                .and_then(|handle| self.state.physical.entities.resolve(handle))
            {
                if !ids.contains(&entity.id) {
                    ids.insert(entity.id.clone());
                }
            }
        }
        for id in ids {
            self.physical().reconcile_semantic_interval(&id)?;
        }
        Ok(())
    }
}
fn semantic_subject(undo: &Undo) -> Option<EntityHandle> {
    match undo {
        Undo::Action { entity, .. } | Undo::AgencyPlan { entity, .. } => Some(*entity),
        _ => None,
    }
}

impl PhysicalMutation<'_> {
    fn semantic_meta(&mut self, handle: EntityHandle) -> Result<(), ExecutionError> {
        let key = UndoKey::SemanticMeta(handle.slot, handle.generation);
        if !self.journal.first(&key)? {
            return Ok(());
        }
        let semantic = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.semantic.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(
            size_of::<Undo>() * 2
                + semantic.discovery.len()
                + semantic.reservation.as_ref().map_or(0, String::len)
                + semantic.occupied_purpose.as_ref().map_or(0, String::len),
        )?;
        self.journal.retain(
            key,
            Undo::SemanticMeta {
                entity: handle,
                interval: semantic.interval,
                discovery: semantic.discovery.clone(),
                reservation: semantic.reservation.clone(),
                occupied_purpose: semantic.occupied_purpose.clone(),
            },
        )
    }
    fn open_semantic_interval(&mut self, handle: EntityHandle) -> Result<(), ExecutionError> {
        let semantic = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.semantic.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let next = semantic
            .interval
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        self.semantic_meta(handle)?;
        let key = UndoKey::SemanticResolved(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.reserve(size_of::<Undo>() * 2)?;
        self.journal
            .undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let semantic = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let before = std::mem::take(&mut semantic.resolved);
        semantic.interval = next;
        semantic.discovery = "available".to_owned();
        semantic.reservation = None;
        if first {
            self.journal.retain(
                key,
                Undo::SemanticResolved {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn begin_semantic_work(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(());
        };
        let Some(actor) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
        else {
            return Ok(());
        };
        if actor.capabilities.as_ref().is_some_and(|c| !c.cognition)
            || actor.action.as_ref().is_none_or(|a| a.id != action_id)
            || actor.agency.semantic.is_none()
        {
            return Ok(());
        }
        let (kind, purpose_id) = actor
            .agency
            .plan
            .as_ref()
            .filter(|plan| {
                matches!(
                    plan.status,
                    crate::plans::PlanStatus::Active | crate::plans::PlanStatus::Blocked
                )
            })
            .map_or(("action", action_id), |plan| ("plan", plan.id.as_str()));
        self.journal.reserve(purpose_id.len() * 6 + 64)?;
        let purpose = crate::encoding::json_record(&[kind, purpose_id])
            .map_err(|_| ExecutionError::Invariant)?;
        if actor
            .agency
            .semantic
            .as_ref()
            .is_some_and(|s| s.occupied_purpose.as_ref() == Some(&purpose))
        {
            return Ok(());
        }
        self.semantic_meta(handle)?;
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .occupied_purpose = Some(purpose);
        Ok(())
    }
    pub(crate) fn finish_semantic_work(
        &mut self,
        id: &str,
        action_id: &str,
    ) -> Result<(), ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(());
        };
        let Some(semantic) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.semantic.as_ref())
        else {
            return Ok(());
        };
        let purpose = crate::encoding::json_record(&["action", action_id])
            .map_err(|_| ExecutionError::Invariant)?;
        if semantic.occupied_purpose.as_ref() != Some(&purpose) {
            return Ok(());
        }
        self.open_semantic_interval(handle)?;
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .occupied_purpose = None;
        Ok(())
    }
    pub(crate) fn reconcile_semantic_interval(&mut self, id: &str) -> Result<(), ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(());
        };
        let Some(actor) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
        else {
            return Ok(());
        };
        let Some(semantic) = &actor.agency.semantic else {
            return Ok(());
        };
        let purpose = if actor.capabilities.as_ref().is_some_and(|c| !c.cognition) {
            None
        } else if let Some(plan) = actor.agency.plan.as_ref().filter(|plan| {
            matches!(
                plan.status,
                crate::plans::PlanStatus::Active | crate::plans::PlanStatus::Blocked
            )
        }) {
            self.journal.reserve(plan.id.len() * 6 + 64)?;
            Some(
                crate::encoding::json_record(&["plan", plan.id.as_str()])
                    .map_err(|_| ExecutionError::Invariant)?,
            )
        } else if let Some(action) = &actor.action {
            self.journal.reserve(action.id.len() * 6 + 64)?;
            Some(
                crate::encoding::json_record(&["action", action.id.as_str()])
                    .map_err(|_| ExecutionError::Invariant)?,
            )
            .filter(|purpose| semantic.occupied_purpose.as_ref() == Some(purpose))
        } else {
            None
        };
        if purpose == semantic.occupied_purpose {
            return Ok(());
        }
        if purpose.is_none() && semantic.occupied_purpose.is_some() {
            self.open_semantic_interval(handle)?;
        } else {
            self.semantic_meta(handle)?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .occupied_purpose = purpose;
        Ok(())
    }
    pub(crate) fn reserve_discovery(
        &mut self,
        id: &str,
        interval: u64,
        reservation: String,
    ) -> Result<bool, ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(false);
        };
        let Some(actor) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
        else {
            return Ok(false);
        };
        let Some(semantic) = &actor.agency.semantic else {
            return Ok(false);
        };
        if !actor.alive
            || semantic.occupied_purpose.is_some()
            || semantic.discovery != "available"
            || semantic.interval != interval
        {
            return Ok(false);
        }
        self.semantic_meta(handle)?;
        let semantic = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        semantic.discovery = "reserved".to_owned();
        semantic.reservation = Some(reservation);
        Ok(true)
    }
    pub(crate) fn settle_discovery(
        &mut self,
        id: &str,
        reservation: &str,
        dispatched: bool,
    ) -> Result<bool, ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(false);
        };
        let Some(semantic) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.agency.semantic.as_ref())
        else {
            return Ok(false);
        };
        if semantic.discovery != "reserved" || semantic.reservation.as_deref() != Some(reservation)
        {
            return Ok(false);
        }
        self.semantic_meta(handle)?;
        let semantic = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .and_then(|a| a.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        semantic.discovery = if dispatched { "spent" } else { "available" }.to_owned();
        semantic.reservation = None;
        Ok(true)
    }
}
