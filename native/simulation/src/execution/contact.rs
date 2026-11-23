use super::*;
use crate::contact::guard::GuardPhase;
use crate::contact::{StrikeOutcome, StrikePhase};

// Only these scalars change at impact. The already funded action retains its
// identity and definition strings throughout both phases.
pub(super) struct ContactPhase {
    phase: Option<StrikePhase>,
    outcome: Option<StrikeOutcome>,
    remaining: f64,
    total: f64,
    guard: Option<(GuardPhase, Option<f64>)>,
}

impl ContactPhase {
    pub(super) fn restore(self, action: &mut crate::state::Action) {
        action.strike_phase = self.phase;
        action.strike_outcome = self.outcome;
        action.remaining_seconds = self.remaining;
        action.total_seconds = self.total;
        if let Some((guard, (phase, deadline))) = action.guard.as_mut().zip(self.guard) {
            guard.phase = phase;
            guard.recovery_until = deadline;
        }
    }
}

impl PhysicalMutation<'_> {
    pub(crate) fn replace_strike_motion(
        &mut self,
        id: &str,
        action_id: &str,
        motion: Option<crate::state::FundedStrikeMotion>,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        self.journal
            .reserve(2 * size_of::<Undo>() + action_id.len())?;
        let key = UndoKey::StrikeMotion(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        if first {
            self.state
                .entities
                .retain_strike_motion(entity, &self.journal.budget)?;
        }
        let before = self.state.entities.swap_funded_strike_motion(
            entity,
            action_id,
            motion,
            &self.journal.budget,
        )?;
        if first {
            self.journal.retain(
                key,
                Undo::StrikeMotion {
                    entity,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        Ok(())
    }

    pub(crate) fn retain_combat_recovery(
        &mut self,
        id: &str,
        deadline: f64,
    ) -> Result<(), ExecutionError> {
        if !deadline.is_finite() || deadline < self.state.header.sim_time {
            return Err(ExecutionError::Invariant);
        }
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .combat_ready_at;
        if before.is_some_and(|prior| deadline <= prior) {
            return Ok(());
        }
        self.journal.reserve(2 * size_of::<Undo>())?;
        let key = UndoKey::CombatReady(entity.slot, entity.generation);
        if self.journal.first(&key)? {
            self.journal
                .retain(key, Undo::CombatReady { entity, before })?;
        }
        self.state
            .entities
            .resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .combat_ready_at = Some(deadline);
        Ok(())
    }

    pub(crate) fn retain_evasion_recovery(
        &mut self,
        id: &str,
        deadline: f64,
    ) -> Result<(), ExecutionError> {
        if !deadline.is_finite() || deadline <= self.state.header.sim_time {
            return Err(ExecutionError::Invariant);
        }
        let entity = self.state.entities.handle(id).ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?
            .evasion_ready_at;
        if before.is_some_and(|prior| deadline <= prior) {
            return Ok(());
        }
        self.journal.reserve(2 * size_of::<Undo>())?;
        let key = UndoKey::EvasionReady(entity.slot, entity.generation);
        if self.journal.first(&key)? {
            self.journal.retain(key, Undo::EvasionReady { entity, before })?;
        }
        self.state
            .entities
            .resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .ok_or(ExecutionError::MissingActor)?
            .evasion_ready_at = Some(deadline);
        Ok(())
    }
    pub(crate) fn start_contact_recovery(
        &mut self,
        id: &str,
        action_id: &str,
        outcome: StrikeOutcome,
        seconds: f64,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(entity)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| {
                action.id == action_id && action.strike_phase == Some(StrikePhase::Windup)
            })
            .ok_or(ExecutionError::Invariant)?;
        let before = ContactPhase {
            phase: action.strike_phase,
            outcome: action.strike_outcome,
            remaining: action.remaining_seconds,
            total: action.total_seconds,
            guard: None,
        };
        let moving = action.strike_motion.is_some();
        self.journal
            .reserve(2 * size_of::<Undo>() + action_id.len())?;
        let key = UndoKey::ContactPhase(entity.slot, entity.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::ContactPhase {
                    entity,
                    action_id: action_id.into(),
                    before,
                },
            )?;
        }
        self.retain_combat_recovery(id, self.state.header.sim_time + seconds)?;
        if moving {
            self.clear_movement_path(id, action_id)?;
            self.clear_action_navigation(id, action_id)?;
            self.replace_strike_motion(id, action_id, None)?;
        }
        let action = self
            .state
            .entities
            .resolve_mut(entity)
            .and_then(|entity| entity.actor.as_mut())
            .and_then(|actor| actor.action.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        action.strike_phase = Some(StrikePhase::Recovery);
        action.strike_outcome = Some(outcome);
        action.remaining_seconds = seconds;
        action.total_seconds = seconds;
        self.behavior_changed(id, false)?;
        Ok(())
    }
}

impl PhysicalMutation<'_> {
    /// Update the existing action's finite guard phase and retained recovery.
    /// Both changes share the same inverse journal as actual injury.
    pub(crate) fn advance_guard(
        &mut self,
        id: &str,
        phase: GuardPhase,
        remaining: f64,
        total: f64,
        recovery: Option<f64>,
    ) -> Result<(), ExecutionError> {
        let entity = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = self
            .state
            .entities
            .resolve(entity)
            .and_then(|body| body.actor.as_ref())
            .and_then(|body| body.action.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let guard = action.guard.as_ref().ok_or(ExecutionError::Invariant)?;
        if (
            guard.phase,
            guard.recovery_until,
            action.remaining_seconds,
            action.total_seconds,
        ) == (phase, recovery, remaining, total)
        {
            return Ok(());
        }
        let key = UndoKey::ContactPhase(entity.slot, entity.generation);
        if self.journal.first(&key)? {
            self.journal
                .reserve(2 * size_of::<Undo>() + action.id.len())?;
            self.journal.retain(
                key,
                Undo::ContactPhase {
                    entity,
                    action_id: action.id.clone(),
                    before: ContactPhase {
                        phase: action.strike_phase,
                        outcome: action.strike_outcome,
                        remaining: action.remaining_seconds,
                        total: action.total_seconds,
                        guard: Some((guard.phase, guard.recovery_until)),
                    },
                },
            )?;
        }
        let phase_change = guard.phase != phase;
        if let Some(deadline) = recovery.filter(|deadline| *deadline >= self.state.header.sim_time)
        {
            self.retain_combat_recovery(id, deadline)?;
        }
        let action = self
            .state
            .entities
            .resolve_mut(entity)
            .and_then(|body| body.actor.as_mut())
            .and_then(|body| body.action.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let guard = action.guard.as_mut().ok_or(ExecutionError::Invariant)?;
        guard.phase = phase;
        guard.recovery_until = recovery;
        action.remaining_seconds = remaining;
        action.total_seconds = total;
        if phase_change {
            self.behavior_changed(id, false)?;
        }
        Ok(())
    }
}
