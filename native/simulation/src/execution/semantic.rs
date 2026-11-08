//! Semantic opportunities are saved private continuation, not sensory facts.
//! These mutations share the candidate physical journal and never open an
//! interval merely because a provider job completed.

use super::*;

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
        if actor.agency.plan.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        self.journal.reserve(action_id.len() * 2 + 64)?;
        let purpose = crate::encoding::json_record(&["action", action_id])
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
        if actor.agency.plan.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let purpose = if actor.capabilities.as_ref().is_some_and(|c| !c.cognition) {
            None
        } else {
            actor
                .action
                .as_ref()
                .map(|action| {
                    crate::encoding::json_record(&["action", action.id.as_str()])
                        .map_err(|_| ExecutionError::Invariant)
                })
                .transpose()?
                .filter(|action| semantic.occupied_purpose.as_ref() == Some(action))
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
