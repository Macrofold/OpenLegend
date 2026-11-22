use super::*;
use crate::contact::{may_target, profile};

impl CommandCursor {
    pub(super) fn prepare_natural_contact(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Strike {
            envelope,
            definition_id,
            target_id,
            weapon_item_id,
            auto_equip,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if !self.options.native_controller
            || weapon_item_id.is_some()
            || auto_equip.is_some()
            || envelope.human_initiated.is_some()
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let installed = &core.state.installed;
        let ordinary = installed.ordinary_actions.value();
        let physical = &core.state.physical;
        let source = physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let definition =
            profile(installed, source, definition_id).ok_or(ExecutionError::UnsupportedFamily)?;
        let Some(target) = physical.entities.get(target_id) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let Some(life) = target
            .physical_life()
            .filter(|life| may_target(installed, source, target, *life))
        else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let current = source.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        if current
            .combat_ready_at
            .is_some_and(|at| at > physical.header.sim_time)
        {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        }
        let Some(ray) =
            crate::geometry::interaction_reach(source, target, definition.range, &self.budget)?
        else {
            self.refuse(&ordinary.out_of_reach);
            return Ok(false);
        };
        self.action_storage = Some(self.budget.reserve(
            envelope.id.len() + definition_id.len() + target_id.len() + "strikeworking".len(),
        )?);
        self.action = Some(Action::natural_contact(
            envelope.id.clone(),
            target_id.clone(),
            life,
            definition,
        ));
        self.reserve(std::mem::size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::ContactReach)?.sight = vec![ray];
        Ok(true)
    }

    pub(super) fn natural_contact_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        source: &str,
    ) -> Result<Progress, ExecutionError> {
        let text = core
            .state
            .physical
            .entities
            .get(source)
            .and_then(|entity| entity.threat.as_ref())
            .ok_or(ExecutionError::Invariant)?
            .windup_text();
        self.reserve(text.storage_bytes() + source.len() + "attack-preparation".len())?;
        let text = text.clone();
        let event = core.stage_event(EventEmissionIntent {
            event_type: "attack-preparation".into(),
            text: EmissionText::Literal(text),
            audience: AudienceSelection::Physical,
            source_id: Some(source.into()),
            target_id: None,
            data: None,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Tail;
        Ok(Progress::Occurrence(event))
    }
}
