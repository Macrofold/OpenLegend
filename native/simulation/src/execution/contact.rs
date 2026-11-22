use super::*;
use crate::contact::{StrikeOutcome, StrikePhase};

// Only these scalars change at impact. The already funded action retains its
// identity and definition strings throughout both phases.
pub(super) struct ContactPhase {
    phase: Option<StrikePhase>,
    outcome: Option<StrikeOutcome>,
    remaining: f64,
    total: f64,
}

impl ContactPhase {
    pub(super) fn restore(self, action: &mut crate::state::Action) {
        action.strike_phase = self.phase;
        action.strike_outcome = self.outcome;
        action.remaining_seconds = self.remaining;
        action.total_seconds = self.total;
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
