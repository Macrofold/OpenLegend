//! The guard locks a permitted facing and an owned shield once at admission.
use super::*;
use crate::commands::guard_input::GuardFacing;
use crate::contact::guard::{Guard, GuardPhase};
use crate::host::retained_size::heap_sum;
use crate::reception::SightBatch;

impl CommandCursor {
    pub(super) fn prepare_guard(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Guard {
            envelope,
            item_id,
            facing,
            auto_equip,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let installed = &state.installed;
        let ordinary = installed.ordinary_actions.value();
        let source = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = source.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let now = state.physical.header.sim_time;
        if actor.action.as_ref().is_some_and(Action::is_guard)
            || actor.combat_ready_at.is_some_and(|end| end > now)
        {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        }
        let Some(lot) =
            crate::install::owned_by(&state.physical, &installed.retained, &source.id, item_id)?
                .filter(|lot| {
                    lot.equipped || *auto_equip && lot.available_quantity == 1 && lot.quantity == 1
                })
        else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let Some((definition, profile)) = installed
            .retained
            .items
            .get(lot.definition_id)
            .filter(|definition| definition.can_guard())
            .and_then(|definition| {
                definition
                    .contact_defense
                    .as_ref()
                    .map(|profile| (definition, profile))
            })
        else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let (heading, target) = match facing {
            GuardFacing::Direction(heading) => (*heading, None),
            GuardFacing::Subject { id, life } => {
                let Some(target) = state.physical.entities.get(id).filter(|target| {
                    target.id != source.id
                        && target.actively_participates()
                        && target.physical_life() == Some(*life)
                }) else {
                    self.refuse(&ordinary.not_applicable);
                    return Ok(false);
                };
                let from = source
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                let to = target
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?;
                let (dx, dz) = (to.x - from.x, to.z - from.z);
                if dx.hypot(dz) <= 1e-8 {
                    self.refuse(&ordinary.not_applicable);
                    return Ok(false);
                }
                (crate::spatial::atan2(dx, dz), Some(id.as_str()))
            }
        };
        let ready = now + profile.preparation_seconds;
        let expires = ready + profile.ready_seconds;
        if !(expires + profile.recovery_seconds).is_finite() {
            return Err(ExecutionError::Invariant);
        }
        let storage = self.budget.reserve(
            heap_sum([
                envelope.id.len(),
                item_id.len(),
                "guard".len() + "working".len(),
                std::mem::size_of::<Guard>(),
                definition
                    .pin
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        self.action = Some(Action::guarding(
            envelope.id.clone(),
            item_id.clone(),
            Guard {
                phase: GuardPhase::Preparing,
                profile: definition.pin.clone(),
                physical_life: source.physical_life().ok_or(ExecutionError::MissingActor)?,
                facing: heading,
                ready_at: ready,
                expires_at: expires,
                recovery_until: None,
            },
            profile.preparation_seconds,
        ));
        self.action_storage = Some(storage);
        let Some(id) = target else {
            self.phase = Phase::Prepared;
            return Ok(false);
        };
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare(
                &state.physical,
                installed,
                &source.id,
                &[id],
                self.binding,
                &self.budget,
            )
            .map_err(ExecutionError::Sensor)?,
        );
        self.phase = Phase::GuardSight;
        Ok(true)
    }

    pub(super) fn finish_guard_sight(
        &mut self,
        core: &CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Guard {
            facing: GuardFacing::Subject { id, .. },
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let result = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(ExecutionError::Sensor)?;
        if result.seen(id) != Some(true) {
            self.refuse(&core.state.installed.ordinary_actions.value().not_applicable);
        } else {
            self.phase = Phase::Prepared;
        }
        Ok(())
    }

    pub(super) fn equip_guard(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Guard {
            envelope,
            item_id,
            auto_equip: true,
            ..
        } = &self.command
        else {
            return Ok(true);
        };
        let equipped = core.state.physical.entities.get(item_id).is_some_and(|item| {
            matches!(&item.placement, Some(crate::state::Placement::Attached { parent_entity_id, .. }) if parent_entity_id == &envelope.actor_id)
        });
        if equipped {
            return Ok(true);
        }
        let decision = core.change_equipment(
            &envelope.actor_id,
            item_id,
            crate::execution::EquipmentRequest::Equip,
        )?;
        if matches!(
            decision,
            crate::execution::EquipmentDecision::Applied { .. }
        ) {
            Ok(true)
        } else {
            let installed = core.state.installed.clone();
            self.refuse(&installed.ordinary_actions.value().not_applicable);
            Ok(false)
        }
    }

    pub(super) fn prepare_guard_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let state = &core.state;
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        let guard = action.guard.as_ref().ok_or(ExecutionError::Invariant)?;
        let definition = state
            .installed
            .retained
            .items
            .get(&guard.profile.id)
            .ok_or(ExecutionError::Invariant)?;
        let profile = definition
            .contact_defense
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let mut storage = self.budget.reserve(
            heap_sum([
                profile
                    .label
                    .len()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
                definition.named.name.storage_bytes(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let view = ActivityView {
            name: profile.label.as_str().into(),
            actor: None,
            tool: Some(definition.named.name.clone()),
            target: None,
            facts: Vec::new(),
            children: None,
            result: None,
        };
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }
}
