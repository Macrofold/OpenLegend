//! The ordinary action clock owns one finite attempt. It validates a due
//! cast before drawing, and puts stock, output, event, and result in one cut.
use super::*;
use crate::{
    casts, commands::ActivityOutput, host::retained_size::HeapBytes, reception::EventScalar,
};

impl MoveAdvanceCursor {
    pub(super) fn advance_cast(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let epsilon = core.state.installed.time_epsilon;
        if action.remaining_seconds > self.seconds + epsilon {
            core.physical()
                .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let Some(source) = action
            .target_id
            .as_deref()
            .and_then(|id| casts::source(core.state, id))
        else {
            self.fail(casts::messages().missing_source)?;
            return self.drive(core, None);
        };
        let tool_id = action.item_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let terms = &source.rules.definition;
        let Some(tool) = casts::tool(core.state, &self.actor_id, tool_id, &source)? else {
            self.reserve(terms.tool_required_text.storage_bytes())?;
            self.failure = Some(terms.tool_required_text.clone());
            self.phase = Phase::Finish;
            return self.drive(core, None);
        };
        let binding = action.fishing.as_deref().ok_or(ExecutionError::Invariant)?;
        if !casts::matches(&source, tool, binding, &self.budget)? {
            self.fail(casts::messages().changed_binding)?;
        } else if !source.cast.line_is_possible(terms) {
            self.fail(casts::messages().blocked_line)?;
        } else if !casts::at_stance(actor, &source) {
            self.fail(casts::messages().out_of_reach)?;
        } else if source.stock.quantity == 0 {
            self.reserve(terms.exhausted_text.storage_bytes())?;
            self.failure = Some(terms.exhausted_text.clone());
            self.phase = Phase::Finish;
        } else {
            let storage = self
                .budget
                .reserve(size_of::<GeometryQueries>() + casts::check_storage(actor, source.cast))?;
            let mut queries = GeometryQueries::new(self.binding);
            casts::check_line(&mut queries, actor, source.cast, &self.budget)?;
            self.binding.serial = core.journal.next_provider_serial()?;
            queries.binding = self.binding;
            self.queries = Some((queries, storage));
            self.phase = Phase::CastLine;
            return Ok(Progress::Geometry);
        }
        self.drive(core, None)
    }

    pub(super) fn finish_cast_line(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        if answer.sight.pop() != Some(true) || answer.standing.pop() != Some(true) {
            self.fail(casts::messages().blocked_line)?;
            return self.drive(core, None);
        }
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let source = action
            .target_id
            .as_deref()
            .and_then(|id| casts::source(core.state, id))
            .ok_or(ExecutionError::Invariant)?;
        let terms = &source.rules.definition;
        let chance = terms.chance;
        let epsilon = core.state.installed.time_epsilon;
        let revision = source.stock.revision.unwrap_or(0);
        let bytes = 1024
            + id.len() * 2
            + self.actor_id.len() * 3
            + source.entity.id.len() * 2
            + source.stock.definition_id.len() * 5
            + terms
                .caught_text
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                * 2
            + terms
                .empty_text
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?
                * 2;
        let workspace = self.budget.reserve(bytes)?;
        let id = id.to_owned();
        let target = source.entity.id.clone();
        let definition = source.stock.definition_id.clone();
        let caught_text = terms.caught_text.clone();
        let empty_text = terms.empty_text.clone();
        if !core
            .physical()
            .advance_timed_work(&self.actor_id, &id, self.seconds, epsilon)?
        {
            return Err(ExecutionError::Invariant);
        }
        let caught = core.physical().draw() < chance;
        let mut outputs = Vec::new();
        let item_id = if caught {
            if !core.physical().debit_resource(&target, revision, 1)? {
                return Err(ExecutionError::Invariant);
            }
            let item = core.produce_carried_stock(&self.actor_id, &definition, 1)?;
            outputs.push(ActivityOutput {
                port: definition.clone(),
                item_id: item.clone(),
                definition_id: definition.clone(),
                quantity: 1,
            });
            Some(item)
        } else {
            None
        };
        let text = if caught { caught_text } else { empty_text };
        let event = crate::native_controller::feeding::stage(
            core,
            &self.actor_id,
            &target,
            "cast-completed",
            text.clone(),
            indexmap::IndexMap::from([
                ("actionId".into(), EventScalar::Text(id.into())),
                ("caught".into(), EventScalar::Boolean(caught)),
                (
                    "quantity".into(),
                    EventScalar::Number(if caught { 1.0 } else { 0.0 }),
                ),
                ("definitionId".into(), EventScalar::Text(definition.into())),
            ]),
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        self.cast_result = Some(Outcome {
            spent: None,
            outputs: Some(outputs),
            ok: true,
            code: if caught { "caught" } else { "empty" }.into(),
            message: text,
            item_id,
            recipe_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        });
        self._reservation.merge(workspace)?;
        Ok(Progress::Occurrence(event))
    }
}
