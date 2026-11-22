use super::*;
use crate::gathering::{GatheringBinding, exact_tool, source};
use crate::text::JsText;

impl CommandCursor {
    pub(super) fn prepare_gathering_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        use crate::worlds::activity_display::{
            GatherRead, ObservedActor, ObservedTarget, OrdinaryAction, format,
        };
        let NativeCommand::Gather {
            envelope,
            target_id,
            tool,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let target = source(core.state, target_id).ok_or(ExecutionError::MissingEntity)?;
        let installed = &core.state.installed;
        let definitions = &installed.retained;
        let exact = tool
            .item_id
            .as_ref()
            .and_then(|id| core.state.physical.entities.get(id))
            .and_then(|item| item.item.as_ref())
            .and_then(|item| definitions.items.get(&item.definition_pin.id));
        let bytes = crate::host::retained_size::heap_sum([
            4096,
            8 * actor.name.storage_bytes(),
            8 * target.entity.name.storage_bytes(),
            8 * target.definition.named.name.storage_bytes(),
            8 * envelope
                .purpose
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            8 * envelope
                .chosen_purpose
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            exact.map_or(0, |definition| {
                8 * (definition.named.name.storage_bytes()
                    + definition
                        .description
                        .as_ref()
                        .map_or(0, JsText::storage_bytes))
            }),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = self.budget.reserve(bytes)?;
        let selected_tool = if let Some((item_id, definition)) = tool.item_id.as_ref().zip(exact) {
            let mut same = 0_u64;
            let mut ordinal = 0_u64;
            core.state.inventory.visit_owned(
                &core.state.physical.entities,
                definitions,
                &actor.id,
                &actor.id,
                &mut |item| {
                    if item.named.name == definition.named.name {
                        same += 1;
                        if item.id == item_id {
                            ordinal = same;
                        }
                    }
                    Ok(())
                },
            )?;
            Some((
                crate::worlds::base_gathering::tool_name(&definition.named.name, ordinal, same),
                definition.description.clone(),
            ))
        } else {
            None
        };
        let profile = &installed.content.profile;
        let view = format(
            (profile.id.as_str(), profile.version),
            OrdinaryAction::Gather(GatherRead {
                reach: installed.movement.interaction_radius(),
                quantity: target.stock.quantity,
                seconds: target.stock.work_seconds,
                material: target.definition.named.name.clone(),
                tool: selected_tool,
            }),
            envelope.purpose.clone(),
            envelope
                .chosen_purpose
                .as_ref()
                .map(|binding| binding.description.clone()),
            Some(ObservedActor {
                position: actor
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                heading: actor.spatial.heading,
            }),
            Some(ObservedTarget {
                position: target
                    .entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                name: target.entity.name.clone(),
                health: None,
            }),
        )
        .ok_or(ExecutionError::Invariant)?;
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn prepare_gathering(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Gather {
            envelope,
            target_id,
            tool,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let ordinary = core.state.installed.ordinary_actions.value();
        let Some(target) = source(core.state, target_id).filter(|target| target.stock.quantity > 0)
        else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let found_tool = if let Some(item) = &tool.item_id {
            let Some((pin, _)) = exact_tool(
                core.state,
                &envelope.actor_id,
                item,
                tool.mode,
                &target.definition.pin.id,
            )?
            else {
                self.refuse(&ordinary.not_applicable);
                return Ok(false);
            };
            Some(pin)
        } else {
            None
        };
        let bytes = crate::host::retained_size::heap_sum([
            size_of::<GatheringBinding>(),
            32,
            envelope.id.len(),
            target_id.len(),
            tool.heap_bytes().ok_or(ExecutionError::Capacity)?,
            target
                .definition
                .pin
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            found_tool
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.action_storage = Some(self.budget.reserve(bytes)?);
        self.action = Some(Action::gather(
            envelope.id.clone(),
            target_id.clone(),
            tool.item_id.clone(),
            target.stock.work_seconds,
            GatheringBinding {
                mode: tool.mode,
                source: target.definition.pin.clone(),
                tool: found_tool.cloned(),
            },
        ));
        let binding = GeometryBinding::new(
            crate::host::CandidateKey {
                id: self.binding.candidate_id,
                base_cut: self.binding.base_cut,
                generation: self.binding.generation,
            },
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        self.sight = Some(
            crate::reception::SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                &envelope.actor_id,
                &[target_id],
                binding,
                &self.budget,
            )
            .map_err(|error| match error {
                crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })?,
        );
        self.phase = Phase::GatherSight;
        Ok(true)
    }

    pub(super) fn bind_gathering_permission(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Gather { envelope, target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let target = source(core.state, target_id).ok_or(ExecutionError::MissingEntity)?;
        if !target.definition.tracks_material_origins {
            return Ok(true);
        }
        match core.journal.material_gather.prepare(
            &envelope.actor_id, target_id, &target.definition.pin, None, &self.budget,
        )? {
            Ok(Some(fences)) => {
                let action = self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                let storage = self.action_storage.as_mut().ok_or(ExecutionError::Invariant)?;
                let extra = crate::host::retained_size::heap_sum([
                    fences.custody.bytes(),
                    size_of::<crate::construction_gather::MaterialPermissionBinding>(),
                    target.definition.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
                ]).ok_or(ExecutionError::Capacity)?;
                storage.resize(storage.bytes().checked_add(extra).ok_or(ExecutionError::Capacity)?)?;
                action.material_permission = Some(Box::new(fences.into_binding(&target.definition.pin)));
                Ok(true)
            }
            Ok(None) => Ok(true),
            Err(reason) => {
                self.outcome = Some(outcome(false, reason.code(), reason.message()));
                self.phase = Phase::Done;
                Ok(false)
            }
        }
    }

    pub(super) fn prepare_gathering_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Gather {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let target = core
            .state
            .physical
            .entities
            .get(target_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let reach = core.state.installed.movement.interaction_radius();
        if let Some(ray) = crate::geometry::interaction_reach(actor, target, reach, &self.budget)? {
            self.reserve(size_of::<crate::geometry::SightRay>())?;
            self.question(core, Phase::FeedReach)?.sight.push(ray);
            Ok(true)
        } else {
            self.phase = Phase::FeedApproach;
            Ok(false)
        }
    }

    pub(super) fn gathering_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Gather { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let event = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .action_started_event;
        let terms = crate::worlds::base_gathering::copy();
        let _workspace = self.budget.reserve(
            actor.len() * 3 + target_id.len() + 2 * terms.started.len() + event.len() + 512,
        )?;
        let event_type = event.clone();
        let staged = crate::native_controller::feeding::stage(
            core,
            actor,
            target_id,
            &event_type,
            terms.started.as_str().into(),
            IndexMap::from([(
                "actionType".into(),
                crate::reception::EventScalar::Text("gather".into()),
            )]),
        )?;
        self.reserve(staged.id.len())?;
        self.event = Some(staged.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(staged))
    }
}
