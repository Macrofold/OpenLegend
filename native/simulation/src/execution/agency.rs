//! Bounded actor-local frontier inverses share the physical candidate journal.
//! Personal results remain with their real activity/memory acquisition owners.
use super::*;
use crate::plans::{ActorPlan, PlanStep};

impl PhysicalMutation<'_> {
    pub(crate) fn replace_intents(
        &mut self,
        id: &str,
        after: crate::state::FundedIntents,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AgencyIntents(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.state.entities.retain_intents(handle, budget)?;
        self.journal.reserve(2 * size_of::<Undo>())?;
        let before = self.state.entities.swap_funded_intents(handle, after)?;
        if first {
            self.journal.retain(
                key,
                Undo::AgencyIntents {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }

    pub(crate) fn replace_goals(
        &mut self,
        id: &str,
        after: crate::state::FundedGoals,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AgencyGoals(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.state.entities.retain_goals(handle, budget)?;
        self.journal.reserve(2 * size_of::<Undo>())?;
        let before = self.state.entities.swap_funded_goals(handle, after)?;
        if first {
            self.journal.retain(
                key,
                Undo::AgencyGoals {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn reserve_plan_growth(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.journal.reserve(bytes)
    }
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
            let agency = &self
                .state
                .entities
                .resolve(handle)
                .and_then(|e| e.actor.as_ref())
                .ok_or(ExecutionError::MissingActor)?
                .agency;
            let paused = &agency.suspended;
            let order = agency.order;
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
                    order,
                },
            )?;
        }
        let agency = &mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .agency;
        agency.order.suspended();
        Ok(&mut agency.suspended)
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

impl crate::host::retained_size::HeapBytes for crate::state::RememberedPlace {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.subject_id.capacity(),
            self.label.heap_bytes()?,
            self.episode.heap_bytes()?,
            self.point.heap_bytes()?,
        ])
    }
}
impl PhysicalMutation<'_> {
    /// Source remembers at most the installed bounded actor-local place list.
    /// Its one inverse preserves absent versus present-empty ownership.
    pub(crate) fn remember_sighting(
        &mut self,
        actor_id: &str,
        subject: &str,
        point: crate::state::SurfacePoint,
        label: crate::text::JsText,
        episode: Option<String>,
        limit: u64,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(actor_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AgencyPlaces(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            let agency = &self
                .state
                .entities
                .resolve(handle)
                .and_then(|e| e.actor.as_ref())
                .ok_or(ExecutionError::MissingActor)?
                .agency;
            let places = &agency.places;
            let order = agency.order;
            self.journal.reserve(
                places
                    .heap_bytes()
                    .and_then(|n| n.checked_add(2 * size_of::<Undo>()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let before = places.clone();
            self.journal.retain(
                key,
                Undo::AgencyPlaces {
                    entity: handle,
                    before,
                    order,
                },
            )?;
        }
        let agency = &mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .agency;
        let places = &mut agency.places;
        let count = places.as_ref().map_or(0, Vec::len);
        self.journal.reserve(
            heap_sum([
                label.heap_bytes().ok_or(ExecutionError::Capacity)?,
                episode.heap_bytes().ok_or(ExecutionError::Capacity)?,
                point.heap_bytes().ok_or(ExecutionError::Capacity)?,
                subject.len(),
                count
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2 * size_of::<crate::state::RememberedPlace>()))
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        agency.order.places();
        let places = places.get_or_insert_with(Vec::new);
        if let Some(last) = places
            .last_mut()
            .filter(|last| last.subject_id == subject && last.episode == episode)
        {
            last.point = point;
            last.at = self.state.header.sim_time;
            last.label = label;
            return Ok(());
        }
        if let Some(index) = places.iter().position(|place| place.subject_id == subject) {
            places.remove(index);
        }
        places.push(crate::state::RememberedPlace {
            subject_id: subject.into(),
            label,
            episode,
            point,
            at: self.state.header.sim_time,
        });
        if places.len() as u64 > limit {
            places.remove(0);
        }
        Ok(())
    }
}

impl PhysicalMutation<'_> {
    /// The installer has proved complete zero lessons, and selected admissions
    /// refuse coaching references. Source's sweep still deletes a present {}.
    pub(crate) fn reconcile_closed_coaching(&mut self) -> Result<(), ExecutionError> {
        if !self.state.coaching.present {
            return Ok(());
        }
        let key = UndoKey::CoachingPresence;
        self.journal.reserve(2 * size_of::<Undo>())?;
        if self.journal.first(&key)? {
            self.journal
                .retain(key, Undo::CoachingPresence { before: true })?;
        }
        self.state.coaching.present = false;
        Ok(())
    }
}
