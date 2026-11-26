use super::*;
use crate::activity::{ActivityDetail, ActivityFact, ActivityScalar};
use crate::host::retained_size::heap_sum;
use crate::movement::evasion::{COORDINATE_EPSILON, Evasion, legal_distance, profile};
use crate::movement::{MotionOperation, MotionStep};
use std::mem::size_of;

impl CommandCursor {
    pub(super) fn prepare_evasion(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Evade {
            envelope,
            destination,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let Some(copy) = installed.occurrence_rules.value().evasion.as_ref() else {
            self.refuse(&installed.ordinary_actions.value().not_applicable);
            return Ok(false);
        };
        let entity = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some((profile, pin)) = profile(&installed, entity) else {
            self.refuse_evasion("evasion-unavailable", &copy.unavailable)?;
            return Ok(false);
        };
        let Some((from, _)) = entity.world_support() else {
            self.refuse_evasion("evasion-unavailable", &copy.unavailable)?;
            return Ok(false);
        };
        let now = core.state.physical.header.sim_time;
        if let Some(deadline) = entity
            .actor
            .as_ref()
            .and_then(|actor| actor.evasion_ready_at)
            .filter(|deadline| *deadline > now)
        {
            self.reserve(copy.recovery.len() * 2 + profile.label.len() * 2 + 96)?;
            self.refuse_evasion(
                "evasion-recovery",
                &copy
                    .recovery
                    .replace("{label}", &profile.label)
                    .replace("{seconds}", &(deadline - now).ceil().to_string()),
            )?;
            return Ok(false);
        }
        let distance = crate::spatial::distance(from, destination.point());
        if !legal_distance(distance, profile.maximum_distance) {
            self.reserve(copy.distance.len() * 2 + 96)?;
            self.refuse_evasion(
                "evasion-distance",
                &copy
                    .distance
                    .replace("{maximum}", &profile.maximum_distance.to_string()),
            )?;
            return Ok(false);
        }
        self.action_storage = Some(
            self.budget.reserve(
                heap_sum([
                    envelope.id.len(),
                    "evade".len() + "approaching".len(),
                    size_of::<SurfacePoint>(),
                    destination.surface_id.len(),
                    destination.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?,
        );
        let evasion = Evasion {
            source_life: entity.physical_life().ok_or(ExecutionError::MissingActor)?,
            profile: pin.clone(),
            started_at: now,
            ends_at: now + profile.seconds,
            repeat_at: now + profile.repeat_seconds,
            speed: distance / profile.seconds,
        };
        if !(evasion.ends_at.is_finite()
            && evasion.ends_at > now
            && evasion.repeat_at.is_finite()
            && evasion.repeat_at > now)
        {
            return Err(ExecutionError::Invariant);
        }
        self.action = Some(Action::evading(
            envelope.id.clone(),
            destination.clone(),
            evasion,
            profile.seconds,
        ));
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        self.evasion_path = Some(Box::new(MotionOperation::forecast(
            core,
            entity,
            &action.path,
            None,
            distance,
            true,
            profile.seconds,
            self.binding,
            &self.budget,
        )?));
        self.phase = Phase::EvadePath;
        Ok(true)
    }

    pub(super) fn check_evasion_path(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<bool, ExecutionError> {
        let operation = self
            .evasion_path
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        let clear = match operation.step(core, answer)? {
            MotionStep::Geometry(_) => return Ok(true),
            MotionStep::Complete(clear) => clear,
        };
        let motion = self
            .evasion_path
            .take()
            .ok_or(ExecutionError::Invariant)?
            .into_forecast()?;
        let point = self
            .action
            .as_ref()
            .and_then(|action| action.destination.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        if clear
            && motion.track.pose.last().is_some_and(|last| {
                crate::spatial::distance(*last, point.point()) <= COORDINATE_EPSILON
            })
        {
            self.phase = Phase::Prepared;
        } else {
            let installed = core.state.installed.clone();
            let copy = installed
                .occurrence_rules
                .value()
                .evasion
                .as_ref()
                .ok_or(ExecutionError::Invariant)?;
            self.refuse_evasion("evasion-blocked", &copy.blocked_path)?;
        }
        Ok(false)
    }

    pub(super) fn prepare_evasion_view(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        let evasion = action.evasion.as_ref().ok_or(ExecutionError::Invariant)?;
        let entity = core
            .state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let installed = &core.state.installed;
        let (profile, _) = profile(installed, entity).ok_or(ExecutionError::Invariant)?;
        let copy = installed
            .occurrence_rules
            .value()
            .evasion
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let mut storage = self.budget.reserve(
            heap_sum([
                4 * size_of::<ActivityFact>(),
                2 * (profile.label.len()
                    + profile.description.len()
                    + copy.distance_fact.len()
                    + copy.duration_fact.len()
                    + copy.repeat_fact.len()
                    + copy.path_fact.len()),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let fact = |name: &str, value| ActivityFact {
            name: name.into(),
            value: ActivityDetail::Scalar(value),
            critical: false,
            sentence: None,
        };
        let view = ActivityView {
            name: profile.label.as_str().into(),
            actor: None,
            target: None,
            tool: None,
            facts: vec![
                fact(
                    &copy.distance_fact,
                    ActivityScalar::Number(evasion.speed * profile.seconds),
                ),
                fact(&copy.duration_fact, ActivityScalar::Number(profile.seconds)),
                fact(
                    &copy.repeat_fact,
                    ActivityScalar::Number(profile.repeat_seconds),
                ),
                fact(
                    &copy.path_fact,
                    ActivityScalar::String(profile.description.as_str().into()),
                ),
            ],
            children: None,
            result: None,
        };
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    fn refuse_evasion(&mut self, code: &str, message: &str) -> Result<(), ExecutionError> {
        self.reserve(code.len() + message.len() * 2)?;
        self.outcome = Some(outcome(false, code, message));
        self.phase = Phase::Done;
        Ok(())
    }
}
