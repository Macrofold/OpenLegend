//! Practice uses the ordinary approach and action receipt owners. Admission
//! holds one projectile without consuming it, and release is a timed step.
use super::*;
use crate::host::retained_size::heap_sum;
use crate::projectile::{AimedLife, RangedAim, hold_id, practice};

impl CommandCursor {
    pub(super) fn prepare_practice_shot(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::PracticeShot {
            envelope,
            target_id,
            weapon_item_id,
            ammo_item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let installed = &state.installed;
        let ordinary = installed.ordinary_actions.value();
        let actor = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(target) = state.physical.entities.get(target_id) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let Some(choice) = practice::practice_choice(
            state,
            actor,
            target,
            weapon_item_id.as_deref(),
            ammo_item_id.as_deref(),
            None,
        )?
        .filter(|choice| choice.reason.is_none()) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let (weapon, tool) = choice.weapon.ok_or(ExecutionError::Invariant)?;
        let (ammunition, ammunition_type) = choice.ammunition.ok_or(ExecutionError::Invariant)?;
        let range = tool
            .ranged_weapon
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .range;
        let Some(ray) = practice::firing_line(actor, target) else {
            self.refuse(&ordinary.out_of_reach);
            return Ok(false);
        };
        let bytes = heap_sum([
            2 * envelope.id.len(),
            2 * target_id.len(),
            weapon.id.len(),
            ammunition.id.len(),
            tool.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ammunition_type
                .pin
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            choice
                .definition
                .pin()
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            64,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.action_storage = Some(self.budget.reserve(bytes)?);
        let aim = RangedAim {
            source_life: actor.physical_life().ok_or(ExecutionError::MissingActor)?,
            tool: tool.pin.clone(),
            ammunition: ammunition_type.pin.clone(),
            reservation_id: hold_id(&envelope.id),
            manual: false,
            ready: false,
            aim_target: Some(AimedLife {
                id: target_id.clone(),
                life: 0,
            }),
            aim_point: None,
            aim_point_subject: None,
            observed_motion: None,
        };
        self.action = Some(Action::practice_shot(
            envelope.id.clone(),
            aim,
            target_id.clone(),
            weapon.id.into(),
            ammunition.id.into(),
            choice.definition.pin().clone(),
            choice.profile.windup_seconds,
        ));
        if crate::spatial::distance(ray.from, ray.to) > practice::approach_range(installed, range)?
        {
            self.phase = Phase::FeedApproach;
            return Ok(false);
        }
        self.reserve(size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::PracticeReach)?.sight.push(ray);
        Ok(true)
    }

    pub(super) fn practice_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        clear: bool,
    ) -> Result<(), ExecutionError> {
        if !clear {
            self.phase = Phase::FeedApproach;
            return Ok(());
        }
        let actor = core
            .state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let target = self
            .action
            .as_ref()
            .and_then(|action| action.target_id.as_deref())
            .and_then(|id| core.state.physical.entities.get(id))
            .ok_or(ExecutionError::Invariant)?;
        let profile =
            practice::installed_profile(core.state, target).ok_or(ExecutionError::Invariant)?;
        if practice::body_in_firing_line(core.state, actor, target, profile)? {
            self.outcome = Some(outcome(
                false,
                "blocked-lane",
                profile.presentation.lane_unsafe.as_str(),
            ));
            self.phase = Phase::Done;
        } else {
            self.phase = Phase::Prepared;
        }
        Ok(())
    }

    pub(super) fn prepare_practice_view(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        let state = &core.state;
        let target = action
            .target_id
            .as_deref()
            .and_then(|id| state.physical.entities.get(id))
            .ok_or(ExecutionError::Invariant)?;
        let tool = action
            .ranged
            .as_ref()
            .and_then(|aim| state.installed.retained.items.get(&aim.tool.id))
            .ok_or(ExecutionError::Invariant)?;
        let profile =
            practice::installed_profile(state, target).ok_or(ExecutionError::Invariant)?;
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            self.actor_id(),
        )?;
        let name = names.capture_observer_name(&target.id, &self.budget)?;
        let bytes = heap_sum([
            profile.practice_label.len(),
            tool.named.name.storage_bytes(),
            name.name().name.storage_bytes(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = self.budget.reserve(bytes)?;
        let view = ActivityView {
            name: profile.practice_label.as_str().into(),
            actor: None,
            tool: Some(tool.named.name.clone()),
            target: Some(name.name().name.clone()),
            facts: Vec::new(),
            children: None,
            result: None,
        };
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn practice_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::PracticeShot { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let target = state
            .physical
            .entities
            .get(target_id)
            .ok_or(ExecutionError::Invariant)?;
        let profile =
            practice::installed_profile(state, target).ok_or(ExecutionError::Invariant)?;
        let event_type = &state
            .installed
            .ordinary_actions
            .value()
            .action_started_event;
        let clause = &profile.presentation.practice_activity_label;
        let _workspace = self.budget.reserve(
            512 + 3 * actor.len() + target_id.len() + event_type.len() + 4 * clause.len(),
        )?;
        let data = IndexMap::from([(
            "actionType".into(),
            crate::reception::EventScalar::Text("practice-shot".into()),
        )]);
        let event_type = event_type.clone();
        let description = clause.as_str().into();
        let event = crate::native_controller::feeding::stage(
            core,
            actor,
            target_id,
            &event_type,
            description,
            data,
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(event))
    }
}
