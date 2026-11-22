//! Fire work uses ordinary sight, reach and movement before a continuing action
//! exists. Availability does not reserve or burn the chosen material.
use super::*;
use crate::fire_care as fire;
use crate::reception::SightBatch;

impl CommandCursor {
    pub(super) fn prepare_fire(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::TendFire {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let ordinary = installed.ordinary_actions.value();
        let Some(rule) = installed.fire_care.as_ref().map(|rule| rule.value()) else {
            self.refuse(&ordinary.unsupported_capability);
            return Ok(false);
        };
        if fire::target(&core.state.physical, target_id).is_none() {
            self.refuse(&rule.refusals.missing_fire);
            return Ok(false);
        }
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare(
                &core.state.physical,
                &installed,
                &envelope.actor_id,
                &[target_id],
                self.binding,
                &self.budget,
            )
            .map_err(|error| match error {
                crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })?,
        );
        self.phase = Phase::FireSight;
        Ok(true)
    }

    pub(super) fn fire_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::TendFire {
            envelope,
            target_id,
            operation,
            item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let rule = installed
            .fire_care
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .value();
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        if sight.seen(target_id) != Some(true) {
            self.refuse(&rule.refusals.missing_fire);
            return self.drive(core, None);
        }
        let target =
            fire::target(&core.state.physical, target_id).ok_or(ExecutionError::Invariant)?;
        if let Err(reason) = fire::select(
            core.state,
            &envelope.actor_id,
            target,
            *operation,
            item_id.as_deref(),
        )? {
            self.refuse(reason);
            return self.drive(core, None);
        }
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        self.action_storage = Some(self.budget.reserve(
            128 + envelope.id.len() + target_id.len() + item_id.as_ref().map_or(0, String::len),
        )?);
        self.action = Some(Action::tend_fire(
            envelope.id.clone(),
            target_id.clone(),
            *operation,
            item_id.clone(),
            rule.work_seconds(*operation),
        ));
        if let Some(ray) = crate::geometry::interaction_reach(
            actor,
            target,
            installed.movement.interaction_radius(),
            &self.budget,
        )? {
            self.reserve(size_of::<crate::geometry::SightRay>())?;
            self.question(core, Phase::FeedReach)?.sight.push(ray);
            return Ok(Progress::Geometry);
        }
        self.phase = Phase::FeedApproach;
        self.drive(core, None)
    }

    pub(super) fn prepare_fire_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::TendFire {
            target_id,
            operation,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let rule = installed
            .fire_care
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .value();
        let target =
            fire::target(&core.state.physical, target_id).ok_or(ExecutionError::Invariant)?;
        let words = rule.words(*operation);
        let mut storage = self.budget.reserve(
            512 + words.label.len()
                + words.description.len()
                + target.name.storage_bytes() * 3
                + rule.menu.duration.len(),
        )?;
        let mut title = crate::text::JsText::from(words.label.as_str());
        title.push_str(" ");
        title.push_text(&target.name);
        let duration = rule
            .menu
            .duration
            .replace("{seconds}", &rule.work_seconds(*operation).to_string());
        let view = ActivityView {
            name: title,
            actor: None,
            tool: None,
            target: Some(target.name.clone()),
            facts: vec![crate::activity::ActivityFact {
                name: "cost".into(),
                value: crate::activity::ActivityDetail::Scalar(
                    crate::activity::ActivityScalar::String(
                        format!("{} {duration}", words.description).into(),
                    ),
                ),
                critical: true,
                sentence: None,
            }],
            children: None,
            result: None,
        };
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn fire_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::TendFire {
            envelope,
            target_id,
            operation,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let words = installed
            .fire_care
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .value()
            .words(*operation);
        let event_type = &installed.ordinary_actions.value().action_started_event;
        let _workspace = self.budget.reserve(
            512 + 3 * actor.len() + 3 * target_id.len() + words.start.len() + event_type.len(),
        )?;
        let event = fire::stage_event(
            core,
            actor,
            target_id,
            event_type,
            words.start.as_str().into(),
            &envelope.id,
            true,
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(event))
    }
}
