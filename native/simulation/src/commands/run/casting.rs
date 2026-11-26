//! Prepare the exact source and tool, then pass the chosen stance to the
//! existing route, action, and receipt owners. A preview cannot draw a catch.
use super::*;
use crate::{casts, reception::EventScalar, values::DefinitionPin};
use std::mem::size_of;

impl CommandCursor {
    pub(super) fn prepare_cast(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Fish {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let binding = GeometryBinding::new(
            crate::host::CandidateKey {
                id: self.binding.candidate_id,
                base_cut: self.binding.base_cut,
                generation: self.binding.generation,
            },
            core.state.geometry_revision(),
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
        self.phase = Phase::CastSight;
        Ok(true)
    }

    fn prepare_cast_action(&mut self, core: &CoreMutation<'_>) -> Result<bool, ExecutionError> {
        let NativeCommand::Fish {
            envelope,
            target_id,
            item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let ordinary = core.state.installed.ordinary_actions.value();
        let Some(source) = casts::source(core.state, target_id) else {
            self.refuse(&ordinary.not_applicable);
            return Ok(false);
        };
        let Some(tool) = casts::tool(core.state, &envelope.actor_id, item_id, &source)? else {
            let problem = &source.rules.definition.tool_required_text;
            self.reserve(problem.storage_bytes() + 64)?;
            self.refuse_cast("cast-unavailable", problem.clone());
            return Ok(false);
        };
        let rules = &source.rules.definition;
        if source.stock.quantity == 0 {
            self.reserve(rules.exhausted_text.storage_bytes() + 64)?;
            self.refuse_cast("depleted", rules.exhausted_text.clone());
            return Ok(false);
        }
        if !source.cast.line_is_possible(rules) {
            self.reserve(casts::messages().blocked_line.len() + 64)?;
            self.refuse_cast("cast-unavailable", casts::messages().blocked_line.into());
            return Ok(false);
        }
        let storage = self.budget.reserve(
            crate::host::retained_size::heap_sum([
                512 + size_of::<casts::Binding>(),
                target_id.len() * 2,
                item_id.len(),
                envelope.id.len(),
                source.cast.stance.surface_id.len(),
                source
                    .rules
                    .pin
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                tool.pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
                source
                    .output
                    .pin
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        self.action = Some(Action::fish(
            envelope.id.clone(),
            target_id.clone(),
            item_id.clone(),
            source.cast.stance.clone(),
            rules.work_seconds,
            casts::Binding {
                definition: source.rules.pin.clone(),
                source: DefinitionPin {
                    id: target_id.clone(),
                    version: 1,
                    digest: casts::source_digest(&source, &self.budget)?,
                },
                tool: tool.pin.clone(),
                output: source.output.pin.clone(),
            },
        ));
        self.action_storage = Some(storage);
        Ok(true)
    }

    pub(super) fn cast_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Fish { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        if sight.seen(target_id) != Some(true) {
            self.refuse(&core.state.installed.ordinary_actions.value().out_of_reach);
            return self.drive(core, None);
        }
        if !self.prepare_cast_action(core)? {
            return self.drive(core, None);
        }
        let NativeCommand::Fish {
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
        let source = casts::source(core.state, target_id).ok_or(ExecutionError::Invariant)?;
        self.reserve(casts::check_storage(actor, source.cast) + size_of::<GeometryQueries>())?;
        let mut queries = GeometryQueries::new(self.binding);
        casts::check_line(&mut queries, actor, source.cast, &self.budget)?;
        self.binding.serial = core.journal.next_provider_serial()?;
        queries.binding = self.binding;
        self.queries = Some(queries);
        self.phase = Phase::CastLine;
        Ok(Progress::Geometry)
    }

    pub(super) fn cast_line(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        if answer.sight.pop() != Some(true) || answer.standing.pop() != Some(true) {
            let text = casts::messages().blocked_line;
            self.reserve(text.len() + 64)?;
            self.refuse_cast("cast-unavailable", text.into());
            return self.drive(core, None);
        }
        let NativeCommand::Fish {
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
        let source = casts::source(core.state, target_id).ok_or(ExecutionError::Invariant)?;
        if casts::at_stance(actor, &source) {
            self.phase = Phase::Prepared;
            return self.drive(core, None);
        }
        self.reserve(casts::approach_storage(actor, &source))?;
        let query = casts::approach(actor, &source)?;
        self.question(core, Phase::Route)?.routes = vec![query];
        Ok(Progress::Geometry)
    }

    pub(super) fn prepare_cast_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        use crate::worlds::activity_display::{
            ObservedActor, ObservedTarget, OrdinaryAction, format,
        };
        let NativeCommand::Fish {
            envelope,
            target_id,
            item_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let source = casts::source(core.state, target_id).ok_or(ExecutionError::Invariant)?;
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let tool = casts::tool(core.state, &envelope.actor_id, item_id, &source)?
            .ok_or(ExecutionError::Invariant)?;
        let terms = &source.rules.definition;
        let supply = if source.stock.quantity > 0 {
            &terms.supply_unknown_text
        } else {
            &terms.exhausted_text
        };
        // An installed item's description can exceed the activity fact limit.
        // This optional explanation must not make its otherwise valid cast fail.
        let tool_description = tool.description.as_ref().filter(|value| {
            !value.is_empty() && value.units_len() <= core.state.activity.display.text
        });
        let mut storage = self.budget.reserve(
            4096 + terms.description.storage_bytes()
                + supply.storage_bytes()
                + source.entity.name.storage_bytes()
                + tool.named.name.storage_bytes()
                + tool_description.map_or(0, crate::text::JsText::storage_bytes)
                + envelope
                    .purpose
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?
                + envelope
                    .chosen_purpose
                    .as_ref()
                    .map_or(0, |value| value.description.storage_bytes()),
        )?;
        let profile = &core.state.installed.content.profile;
        let view = format(
            (&profile.id, profile.version),
            OrdinaryAction::Fish {
                description: terms.description.clone(),
                supply: supply.clone(),
                selected_tool: tool.named.name.clone(),
                tool_description: tool_description.cloned(),
            },
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
                position: source
                    .entity
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                name: source.entity.name.clone(),
                health: None,
            }),
        )
        .ok_or(ExecutionError::Invariant)?;
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn cast_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Fish { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let kind = self.command.kind();
        let event = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .action_started_event;
        let _workspace = self
            .budget
            .reserve(actor.len() * 3 + target_id.len() + event.len() + kind.len() + 512)?;
        let event = event.clone();
        let staged = crate::native_controller::feeding::stage(
            core,
            actor,
            target_id,
            &event,
            format!("started {kind}.").into(),
            indexmap::IndexMap::from([("actionType".into(), EventScalar::Text(kind.into()))]),
        )?;
        self.reserve(staged.id.len())?;
        self.event = Some(staged.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(staged))
    }

    fn refuse_cast(&mut self, code: &str, message: crate::text::JsText) {
        let mut result = outcome(false, code, "");
        result.message = message;
        self.outcome = Some(result);
        self.phase = Phase::Done;
    }
}
