//! Stationary work earns time on the same simulation clock. At completion the
//! exact current method produces funded items and a single recorded result.
use super::*;
use crate::{commands::ActivityOutput, manufacturing, reception::EventScalar, text::JsText};
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn advance_craft(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let installed = core.state.installed.clone();
        let method = manufacturing::current(&installed.retained, action);
        let Some(method) = method.filter(|method| {
            core.state
                .learned_capabilities
                .known_recipes(&self.actor_id)
                .contains(&method.pin.id)
        }) else {
            self.fail("the technique has changed or is no longer known.")?;
            return self.drive(core, None);
        };
        if !actor.actively_participates()
            || installed
                .capabilities
                .capability_blocked(Some(actor), "actions")?
        {
            self.fail("the character can no longer continue this work.")?;
            return self.drive(core, None);
        }
        let epsilon = installed.time_epsilon;
        if action.remaining_seconds > self.seconds + epsilon {
            core.physical()
                .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        if !manufacturing::finish_fits(core, method, &self.actor_id, id, &self.budget)? {
            self.fail("the completed work does not fit in the action record.")?;
            return self.drive(core, None);
        }
        let guard = self.budget.reserve(
            1024 + 3 * self.actor_id.len()
                + id.len()
                + method.pin.id.len()
                + 2 * method.name.storage_bytes()
                + method
                    .outputs
                    .iter()
                    .map(|output| {
                        192 + output.port.len()
                            + 2 * output.definition.id.len()
                            + 2 * installed.retained.items[&output.definition.id]
                                .named
                                .name
                                .storage_bytes()
                    })
                    .sum::<usize>(),
        )?;
        if !core
            .physical()
            .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?
        {
            return Err(ExecutionError::Invariant);
        }
        let mut outputs = Vec::with_capacity(method.outputs.len());
        let mut narration: JsText = "made ".into();
        for output in &method.outputs {
            let item_id = core.produce_carried_item(
                &self.actor_id,
                &output.definition.id,
                output.quantity,
                false,
            )?;
            if !outputs.is_empty() {
                narration.push_str(", ");
            }
            narration.push_str(&format!("{} ", output.quantity));
            narration.push_text(&installed.retained.items[&output.definition.id].named.name);
            outputs.push(ActivityOutput {
                port: output.port.clone(),
                item_id,
                definition_id: output.definition.id.clone(),
                quantity: output.quantity,
            });
        }
        narration.push_str(".");
        let event = crate::native_controller::feeding::stage_subject(
            core,
            &self.actor_id,
            None,
            "crafted",
            narration,
            IndexMap::from([(
                "recipeId".into(),
                EventScalar::Text(method.pin.id.clone().into()),
            )]),
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        self.production_result = Some(manufacturing::completion(method, outputs));
        self._reservation.merge(guard)?;
        Ok(Progress::Occurrence(event))
    }
}
