//! The physical candidate owns rollback and changed-record projection for the
//! controller's small mutable state. The installed law is never cloned here.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::native_controller::territorial::{Mode, Progress, Threat};

impl PhysicalMutation<'_> {
    /// Capture the actual supported location after an admitted feeding or
    /// resting transition. An unsettled route cannot move an active territory.
    pub(crate) fn refresh_territorial_place(
        &mut self,
        handle: EntityHandle,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        let Some(threat) = entity
            .threat
            .as_ref()
            .filter(|threat| threat.use_current_place(entity))
        else {
            return Ok(());
        };
        let Some(Placement::World {
            position,
            support_surface_id: Some(support),
            ..
        }) = entity.placement.as_ref()
        else {
            return Ok(());
        };
        if *position == threat.policy.home.point() {
            return Ok(());
        }
        let key = UndoKey::TerritorialPlace(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        let before = threat
            .policy
            .place_bytes()
            .ok_or(ExecutionError::Capacity)?;
        let after = support
            .len()
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(
            heap_sum([
                2 * size_of::<Undo>(),
                if first { before } else { 0 },
                after,
                size_of::<PhysicalChange>() + entity.id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let home = crate::state::SurfacePoint {
            x: position.x,
            y: position.y,
            z: position.z,
            surface_id: support.clone(),
        };
        let refuge = home.clone();
        self.journal.change(PhysicalChange::Behavior {
            entity_id: entity.id.clone(),
            outward_change: false,
        })?;
        let policy = &mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.threat.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .policy;
        let old_home = std::mem::replace(&mut policy.home, home);
        let old_refuge = std::mem::replace(&mut policy.refuge, refuge);
        if first {
            self.journal.retain(
                key,
                Undo::TerritorialPlace {
                    entity: handle,
                    home: old_home,
                    refuge: old_refuge,
                },
            )?;
        }
        self.state
            .entities
            .settle_operational_memory(handle, &mut self.journal.reservation, false)
    }

    pub(crate) fn interrupt_territorial_alarm(
        &mut self,
        handle: EntityHandle,
        id: &str,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        let Some(threat) = entity.threat.as_ref().filter(|threat| {
            threat.progress.mode != Mode::Idle
                && entity
                    .animal
                    .as_ref()
                    .is_some_and(|animal| animal.foraging.is_some())
        }) else {
            return Ok(());
        };
        let action = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref());
        let _work = self.journal.budget.reserve(
            threat
                .progress
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                + action.map_or(0, |action| action.id.len()),
        )?;
        let mut next = threat.progress.clone();
        Threat::stop_pursuit(&mut next);
        if let Some(action_id) = action.map(|action| action.id.clone()) {
            self.release_work(&action_id)?;
            self.replace_action(
                id,
                None,
                ActionWrite {
                    generation: PlanGenerationWrite::Advance,
                    behavior: Some(false),
                },
            )?;
        }
        self.replace_territorial_progress(handle, next, true)
    }

    pub(crate) fn admit_territorial_detour(
        &mut self,
        actor: &str,
        route: &crate::geometry::RoutePlan,
    ) -> Result<bool, ExecutionError> {
        let expensive = match route {
            crate::geometry::RoutePlan::Pending { .. } => true,
            crate::geometry::RoutePlan::Reached { expanded, .. }
            | crate::geometry::RoutePlan::InvalidEndpoint { expanded, .. }
            | crate::geometry::RoutePlan::NoRoute { expanded, .. }
            | crate::geometry::RoutePlan::BudgetExceeded { expanded, .. } => *expanded > 0,
        };
        if !expensive {
            return Ok(true);
        }
        let handle = self
            .state
            .entities
            .handle(actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let Some(threat) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.threat.as_ref())
        else {
            return Ok(true);
        };
        if threat.progress.mode == crate::native_controller::territorial::Mode::Idle {
            return Ok(true);
        }
        if !threat.detour_available() {
            return Ok(false);
        }
        let _custody = self.journal.budget.reserve(
            threat
                .progress
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut next = threat.progress.clone();
        next.detours_spent += 1;
        self.replace_territorial_progress(handle, next, false)?;
        Ok(true)
    }

    pub(super) fn record_territorial_travel(
        &mut self,
        handle: EntityHandle,
        travelled: f64,
    ) -> Result<(), ExecutionError> {
        if travelled <= 0.0 {
            return Ok(());
        }
        let Some(threat) = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.threat.as_ref())
        else {
            return Ok(());
        };
        if threat.remaining_pursuit_distance().is_none() {
            return Ok(());
        }
        let _custody = self.journal.budget.reserve(
            threat
                .progress
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut next = threat.progress.clone();
        next.travelled_metres = Some(next.travelled_metres.unwrap_or_default() + travelled);
        self.replace_territorial_progress(handle, next, false)
    }

    pub(crate) fn replace_territorial_progress(
        &mut self,
        handle: EntityHandle,
        next: Progress,
        changed: bool,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = &entity
            .threat
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .progress;
        if before == &next {
            return Ok(());
        }
        let key = UndoKey::Territorial(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        let before_bytes = before.heap_bytes().ok_or(ExecutionError::Capacity)?;
        let after_bytes = next.heap_bytes().ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(
            heap_sum([
                size_of::<Undo>() * 2,
                if first { before_bytes } else { 0 },
                after_bytes.saturating_sub(before_bytes),
                if changed {
                    size_of::<PhysicalChange>() + entity.id.len()
                } else {
                    0
                },
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        if changed {
            self.journal.change(PhysicalChange::Behavior {
                entity_id: entity.id.clone(),
                outward_change: false,
            })?;
        }
        let progress = &mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|entity| entity.threat.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .progress;
        if first {
            let before = std::mem::replace(progress, next);
            self.journal.retain(
                key,
                Undo::Territorial {
                    entity: handle,
                    before,
                },
            )?;
        } else {
            *progress = next;
        }
        self.state
            .entities
            .settle_operational_memory(handle, &mut self.journal.reservation, false)
    }
}
