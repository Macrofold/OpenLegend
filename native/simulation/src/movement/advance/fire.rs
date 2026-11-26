//! Recheck the exact fire and materials on work start and completion. All
//! elapsed work remains ordinary and fuel credit and debit commit together.
use super::*;
use crate::fire_care::{self, FireOperation};
use crate::narration::{NameArticle, name_phrase};
use crate::text::JsText;
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn finish_fire_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        visible: bool,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let installed = core.state.installed.clone();
        let rule = installed
            .fire_care
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .value();
        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let operation = action.fire_operation.ok_or(ExecutionError::Invariant)?;
        let Some(fire) = visible
            .then(|| fire_care::target(&core.state.physical, target))
            .flatten()
        else {
            self.fail(&rule.refusals.missing_fire.message)?;
            return self.drive(core, None);
        };
        let selection = match fire_care::select(
            core.state,
            &self.actor_id,
            fire,
            operation,
            action.item_id.as_deref(),
        )? {
            Ok(selection) => selection,
            Err(reason) => {
                self.fail(&reason.message)?;
                return self.drive(core, None);
            }
        };
        if action.stage == "approaching" {
            return self.start_contact_work(core);
        }
        let after = rule.heat_after(selection.heat, operation);
        let handle = core
            .state
            .physical
            .entities
            .handle(target)
            .ok_or(ExecutionError::Invariant)?;
        let words = rule.words(operation);
        let _workspace = self.budget.reserve(
            2048 + 4 * self.actor_id.len()
                + 4 * target.len()
                + 3 * id.len()
                + 2 * words.effect.len()
                + words.event_type.len()
                + selection
                    .spent
                    .map_or(0, |lot| lot.id.len() + lot.named.name.storage_bytes() * 3),
        )?;
        let target = target.to_owned();
        let mut clause = JsText::from(words.effect.as_str());
        if operation == FireOperation::Fuel {
            let lot = selection.spent.ok_or(ExecutionError::Invariant)?;
            clause.push_text(&name_phrase(lot.named, NameArticle::Definite, false));
            clause.push_str(" to ");
        }
        // This preflights the exact custody change before spending; no current
        // material can disappear while the candidate owns the world.
        let debit = if let Some(lot) = selection.spent {
            let amounts = IndexMap::from([(lot.id.to_owned(), 1)]);
            let debit = core.plan_owned_debits(&self.actor_id, &amounts)?;
            let Some(debit) = debit else {
                return Err(ExecutionError::Invariant);
            };
            Some(debit)
        } else {
            None
        };
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            return Err(ExecutionError::Invariant);
        }
        if let Some(debit) = debit {
            core.record_owned_debit_sources(&self.actor_id, id, &debit)?;
            core.use_owned_lots(&self.actor_id, "fire-care", debit)?;
        }
        core.physical().set_heat(handle, after)?;
        let event = fire_care::stage_event(
            core,
            &self.actor_id,
            &target,
            &words.event_type,
            clause,
            id,
            false,
        )?;
        let mut result = installed
            .ordinary_actions
            .value()
            .movement_completed
            .outcome(true);
        result.message = words.success.as_str().into();
        if operation == FireOperation::Fuel {
            result.spent = Some(1);
        }
        self.production_result = Some(result);
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}
