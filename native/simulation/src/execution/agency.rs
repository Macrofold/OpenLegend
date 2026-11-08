//! Bounded actor-local frontier inverses share the physical candidate journal.
//! Personal results remain with their real activity/memory acquisition owners.
use super::*;
use crate::plans::{ActorPlan, PlanStep};

impl PhysicalMutation<'_> {
    pub(crate) fn plan_mut(&mut self, id: &str) -> Result<&mut Option<ActorPlan>, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AgencyPlan(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            let plan = &self
                .state
                .entities
                .resolve(handle)
                .and_then(|e| e.actor.as_ref())
                .ok_or(ExecutionError::MissingActor)?
                .agency
                .plan;
            let heap = plan.heap_bytes().ok_or(ExecutionError::UnsupportedFamily)?;
            self.journal.reserve(
                heap.checked_add(2 * size_of::<Undo>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let before = plan.as_ref().map(ActorPlan::clone_ordinary).transpose()?;
            self.journal.retain(
                key,
                Undo::AgencyPlan {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(&mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .agency
            .plan)
    }
    pub(crate) fn suspended_plan_mut(
        &mut self,
        id: &str,
    ) -> Result<&mut Option<Option<ActorPlan>>, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AgencySuspended(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            let paused = &self
                .state
                .entities
                .resolve(handle)
                .and_then(|e| e.actor.as_ref())
                .ok_or(ExecutionError::MissingActor)?
                .agency
                .suspended;
            let heap = paused
                .heap_bytes()
                .ok_or(ExecutionError::UnsupportedFamily)?;
            self.journal.reserve(
                heap.checked_add(2 * size_of::<Undo>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let before = paused
                .as_ref()
                .map(|p| p.as_ref().map(ActorPlan::clone_ordinary).transpose())
                .transpose()?;
            self.journal.retain(
                key,
                Undo::AgencySuspended {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(&mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .agency
            .suspended)
    }
    pub(crate) fn replace_plan_history(
        &mut self,
        id: &str,
        history: Vec<PlanStep>,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AgencyHistory(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.reserve(2 * size_of::<Undo>())?;
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?;
        let before = std::mem::replace(&mut actor.agency.history, history);
        if first {
            self.journal.retain(
                key,
                Undo::AgencyHistory {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn advance_agency_revision(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .agency
            .revision;
        let after = before
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        let key = UndoKey::AgencyRevision(handle.slot, handle.generation);
        self.journal.reserve(2 * size_of::<Undo>())?;
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::AgencyRevision {
                    entity: handle,
                    before,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .agency
            .revision = after;
        Ok(())
    }
    pub(crate) fn advance_plan_generation(&mut self, id: &str) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .plan_generation;
        let after = before
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        let key = UndoKey::PlanGeneration(handle.slot, handle.generation);
        self.journal.reserve(2 * size_of::<Undo>())?;
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::PlanGeneration {
                    entity: handle,
                    before,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .plan_generation = after;
        Ok(())
    }
}
