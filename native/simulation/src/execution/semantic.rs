//! Semantic opportunities are saved private continuation, not sensory facts.
//! These mutations share the candidate physical journal and never open an
//! interval merely because a provider job completed.

use super::*;

fn occupied_purpose(actor: &crate::state::ActorState) -> Result<Option<String>, ExecutionError> {
    if actor
        .capabilities
        .as_ref()
        .is_some_and(|capabilities| !capabilities.cognition)
    {
        return Ok(None);
    }
    if let Some(plan) = actor.agency.plan.as_ref().filter(|plan| {
        matches!(
            plan.status,
            crate::plans::PlanStatus::Active | crate::plans::PlanStatus::Blocked
        )
    }) {
        return crate::encoding::json_record(&["plan", plan.id.as_str()])
            .map(Some)
            .map_err(|_| ExecutionError::Invariant);
    }
    if let Some(action) = &actor.action {
        let purpose = crate::encoding::json_record(&["action", action.id.as_str()])
            .map_err(|_| ExecutionError::Invariant)?;
        return Ok(Some(purpose).filter(|purpose| {
            actor
                .agency
                .semantic
                .as_ref()
                .is_some_and(|semantic| semantic.occupied_purpose.as_ref() == Some(purpose))
        }));
    }
    Ok(None)
}

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
    pub(crate) fn resolve_semantic_cause(
        &mut self,
        id: &str,
        key: &str,
        qualitative_revision: &str,
        severity: f64,
        live: Option<&IndexMap<String, crate::attention::AttentionAnnotation>>,
    ) -> Result<(), ExecutionError> {
        let Some(handle) = self.state.entities.handle(id) else {
            return Ok(());
        };
        let Some(actor) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.actor.as_ref())
        else {
            return Ok(());
        };
        let Some(semantic) = actor.agency.semantic.as_ref() else {
            return Ok(());
        };
        let heap = semantic
            .resolved
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        let growth =
            crate::host::retained_size::map_storage::<String, crate::state::ResolvedSemanticCause>(
                semantic
                    .resolved
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(
            crate::host::retained_size::heap_sum([
                heap.checked_mul(3).ok_or(ExecutionError::Capacity)?,
                growth,
                semantic
                    .resolved
                    .len()
                    .checked_mul(size_of::<usize>())
                    .ok_or(ExecutionError::Capacity)?,
                key.len(),
                qualitative_revision.len(),
                actor
                    .agency
                    .plan
                    .as_ref()
                    .map_or(0, |plan| plan.id.len())
                    .checked_mul(6)
                    .ok_or(ExecutionError::Capacity)?,
                actor
                    .action
                    .as_ref()
                    .map_or(0, |action| action.id.len())
                    .checked_mul(6)
                    .ok_or(ExecutionError::Capacity)?,
                2 * size_of::<Undo>() + 128,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let purpose = occupied_purpose(actor)?;
        let mut removed = Vec::with_capacity(semantic.resolved.len());
        for (index, existing) in semantic.resolved.keys().enumerate() {
            let anchor: [String; 2] =
                serde_json::from_str(existing).map_err(|_| ExecutionError::Invariant)?;
            if live.is_none_or(|live| !live.contains_key(&anchor[0])) {
                removed.push(index);
            }
        }
        let undo = UndoKey::SemanticResolved(handle.slot, handle.generation);
        if self.journal.first(&undo)? {
            self.journal.retain(
                undo,
                Undo::SemanticResolved {
                    entity: handle,
                    before: semantic.resolved.clone(),
                },
            )?;
        }
        let semantic = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.agency.semantic.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        for index in removed.into_iter().rev() {
            semantic.resolved.shift_remove_index(index);
        }
        semantic
            .resolved
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        semantic.resolved.insert(
            key.into(),
            crate::state::ResolvedSemanticCause {
                interval: semantic.interval,
                purpose,
                qualitative_revision: qualitative_revision.into(),
                severity,
            },
        );
        self.settle_semantic_memory(id)
    }
    pub(crate) fn settle_semantic_memory(&mut self, actor_id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        self.settle_semantic_handle(handle)
    }
    fn settle_semantic_handle(&mut self, handle: EntityHandle) -> Result<(), ExecutionError> {
        self.state
            .entities
            .settle_semantic_memory(handle, &mut self.journal.reservation, false)
    }
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
        let held = if first {
            self.state
                .entities
                .resolve(handle)
                .and_then(|e| e.actor.as_ref())
                .and_then(|a| a.agency.semantic.as_ref())
                .ok_or(ExecutionError::Invariant)?
                .resolved
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.journal.reserve(size_of::<Undo>() * 2 + held)?;
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
        self.settle_semantic_handle(handle)
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
        self.settle_semantic_handle(handle)
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
        self.journal.reserve(action_id.len() * 6 + 64)?;
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
        self.settle_semantic_handle(handle)
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
        self.journal.reserve(
            actor
                .agency
                .plan
                .as_ref()
                .map_or(0, |plan| plan.id.len())
                .max(actor.action.as_ref().map_or(0, |action| action.id.len()))
                .checked_mul(6)
                .and_then(|n| n.checked_add(64))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let purpose = occupied_purpose(actor)?;
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
        self.settle_semantic_handle(handle)
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
        self.journal.reserve(reservation.capacity() + 32)?;
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
        self.settle_semantic_handle(handle)?;
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
        self.settle_semantic_handle(handle)?;
        Ok(true)
    }
}
