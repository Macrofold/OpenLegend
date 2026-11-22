//! Exact known manufacture starts through the same command and receipt
//! boundary as ordinary work. The read-only stock plan spends nothing.
use super::*;
use crate::activity::{ActivityDetail, ActivityFact, ActivityScalar};
use crate::manufacturing::{self, MaterialChoice};
use crate::text::JsText;

impl CommandCursor {
    pub(super) fn prepare_craft(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Craft {
            envelope,
            recipe_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        if installed.retained.recipes.get(recipe_id).is_none() {
            return self.refuse_craft(
                "unknown-recipe",
                "That technique has not been admitted.".into(),
            );
        }
        if !core
            .state
            .learned_capabilities
            .known_recipes(&envelope.actor_id)
            .contains(recipe_id)
        {
            return self.refuse_craft(
                "not-learned",
                "Your character has not learned this technique.".into(),
            );
        }
        let Some(method) = installed.retained.manufacture.get(recipe_id) else {
            return self.refuse_craft(
                "not-applicable",
                "This method cannot be used here yet.".into(),
            );
        };
        let stock = manufacturing::materials(core.state, &envelope.actor_id, method, &self.budget)?;
        let claims = match stock {
            MaterialChoice::Available(stock) => stock,
            MaterialChoice::Missing(need) => {
                let name = &installed.retained.items[&need.definition_id].named.name;
                let _workspace = self.budget.reserve(64 + 2 * name.storage_bytes())?;
                let mut reason: JsText = format!("Need {} ", need.quantity).into();
                reason.push_text(name);
                reason.push_str(".");
                return self.refuse_craft("missing-material", reason);
            }
        };
        let Some(debits) = core.plan_owned_debits(&envelope.actor_id, &claims.amounts)? else {
            return self.refuse_craft(
                "missing-material",
                "The required materials are no longer available.".into(),
            );
        };
        self.action_storage = Some(self.budget.reserve(
            512 + envelope.id.len()
                + recipe_id.len()
                + method.pin.heap_bytes().ok_or(ExecutionError::Capacity)?
                + method.totals.heap_bytes().ok_or(ExecutionError::Capacity)?,
        )?);
        self.action = Some(Action::craft(
            envelope.id.clone(),
            method.pin.clone(),
            method.work_seconds,
            method.totals.clone(),
        ));
        self.production_debits = Some(debits);
        self.phase = Phase::Prepared;
        Ok(())
    }

    pub(super) fn prepare_craft_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        use crate::worlds::activity_display::{OrdinaryAction, format};
        let NativeCommand::Craft {
            envelope,
            recipe_id,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let method = installed
            .retained
            .manufacture
            .get(recipe_id)
            .ok_or(ExecutionError::Invariant)?;
        let mut storage = self.budget.reserve(
            2048 + 3 * method.name.storage_bytes()
                + method
                    .inputs
                    .iter()
                    .map(|input| {
                        64 + 4 * installed.retained.items[&input.definition_id]
                            .named
                            .name
                            .storage_bytes()
                    })
                    .sum::<usize>(),
        )?;
        let mut materials = JsText::default();
        for input in &method.inputs {
            if !materials.is_empty() {
                materials.push_str(", ");
            }
            materials.push_str(&format!("{} ", input.quantity));
            materials.push_text(&installed.retained.items[&input.definition_id].named.name);
        }
        let work = format!(
            "{} game seconds; materials are spent when work starts and are not returned on interruption",
            method.work_seconds,
        );
        let fact = |name: &str, value: JsText| ActivityFact {
            name: name.into(),
            value: ActivityDetail::Scalar(ActivityScalar::String(value)),
            critical: true,
            sentence: None,
        };
        let profile = &installed.content.profile;
        let view = format(
            (&profile.id, profile.version),
            OrdinaryAction::Production {
                name: "Make".into(),
                details: vec![fact("materials", materials), fact("work", work.into())],
            },
            envelope.purpose.clone(),
            envelope
                .chosen_purpose
                .as_ref()
                .map(|binding| binding.description.clone()),
            None,
            None,
        )
        .ok_or(ExecutionError::Invariant)?;
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn admit_craft_record(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
        action: &Action,
    ) -> Result<bool, ExecutionError> {
        let installed = core.state.installed.clone();
        let method =
            manufacturing::current(&installed.retained, action).ok_or(ExecutionError::Invariant)?;
        let debits = self
            .production_debits
            .take()
            .ok_or(ExecutionError::Invariant)?;
        // The command's original candidate checkpoint rolls back both the
        // record and every prior claim if the checked result cannot fit.
        core.record_owned_debit_sources(actor, &action.id, &debits)?;
        if !manufacturing::finish_fits(core, method, actor, &action.id, &self.budget)? {
            self.refuse_craft(
                "experience-capacity",
                "This work will not fit in the action record.".into(),
            )?;
            return Ok(false);
        }
        core.use_owned_lots(actor, &action.id, debits)?;
        Ok(true)
    }

    pub(super) fn craft_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Craft { recipe_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let method = installed
            .retained
            .manufacture
            .get(recipe_id)
            .ok_or(ExecutionError::Invariant)?;
        let event = &installed.ordinary_actions.value().action_started_event;
        let _workspace = self
            .budget
            .reserve(512 + event.len() + 3 * actor.len() + 2 * method.name.storage_bytes())?;
        let mut text: JsText = "started crafting ".into();
        text.push_text(&method.name);
        text.push_str(".");
        let event = event.clone();
        let occurrence = crate::native_controller::feeding::stage_subject(
            core,
            actor,
            None,
            &event,
            text,
            IndexMap::from([(
                "actionType".into(),
                crate::reception::EventScalar::Text("craft".into()),
            )]),
        )?;
        self.reserve(occurrence.id.len())?;
        self.event = Some(occurrence.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(occurrence))
    }

    fn refuse_craft(&mut self, code: &str, text: JsText) -> Result<(), ExecutionError> {
        self.reserve(code.len() + text.storage_bytes() + 64)?;
        let mut result = outcome(false, code, "");
        result.message = text;
        self.outcome = Some(result);
        self.phase = Phase::Done;
        Ok(())
    }
}
