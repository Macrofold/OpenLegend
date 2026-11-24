//! Exact known manufacture starts through the same command and receipt
//! boundary as ordinary work. The read-only stock plan spends nothing.
use super::*;
use crate::manufacturing::{self, MaterialChoice, ToolRequest};
use crate::text::JsText;

impl CommandCursor {
    pub(super) fn prepare_craft(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Craft {
            envelope,
            recipe_id,
            tools,
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
        let stock = manufacturing::materials(
            core.state,
            &envelope.actor_id,
            method,
            ToolRequest::Exact(tools.as_ref()),
            &self.budget,
        )?;
        let mut claims = match stock {
            MaterialChoice::Available(stock) => stock,
            MaterialChoice::MissingTool => {
                return self.refuse_craft(
                    "missing-material",
                    "Choose an available tool for this recipe.".into(),
                );
            }
            MaterialChoice::Missing(need) => {
                let name = &installed.retained.items[&need.definition_id].named.name;
                let _workspace = self.budget.reserve(64 + 2 * name.storage_bytes())?;
                let mut reason: JsText = format!("Need {} ", need.quantity).into();
                reason.push_text(name);
                reason.push_str(".");
                return self.refuse_craft("missing-material", reason);
            }
        };
        self.action_storage = Some(self.budget.reserve(
            512 + envelope.id.len()
                + recipe_id.len()
                + method.pin.heap_bytes().ok_or(ExecutionError::Capacity)?
                + method.totals.heap_bytes().ok_or(ExecutionError::Capacity)?
                + claims.tool.heap_bytes().ok_or(ExecutionError::Capacity)?,
        )?);
        self.action = Some(Action::craft(
            envelope.id.clone(),
            method.pin.clone(),
            method.work_seconds,
            method.totals.clone(),
            claims.tool.take(),
        ));
        self.craft_stock = Some(claims);
        self.phase = Phase::Prepared;
        Ok(())
    }

    pub(super) fn prepare_craft_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        use crate::worlds::activity_display::{OrdinaryAction, craft_words, format};
        let envelope = self.command.envelope();
        let installed = &core.state.installed;
        let action = self.action.as_ref().ok_or(ExecutionError::Invariant)?;
        let method =
            manufacturing::current(&installed.retained, action).ok_or(ExecutionError::Invariant)?;
        let tool = action.manufacture_tools.as_deref().and_then(<[_]>::first);
        let profile = &installed.content.profile;
        let profile = (profile.id.as_str(), profile.version);
        let wording = craft_words(profile).ok_or(ExecutionError::UnsupportedFamily)?;
        let (details, mut storage) =
            wording.facts(method, &installed.retained, tool, &self.budget)?;
        let chosen_purpose = envelope
            .chosen_purpose
            .as_ref()
            .map(|binding| &binding.description);
        storage.resize(
            crate::host::retained_size::heap_sum([
                storage.bytes(),
                envelope
                    .purpose
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                chosen_purpose.map_or(0, JsText::storage_bytes),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let view = format(
            profile,
            OrdinaryAction::Craft(details),
            envelope.purpose.clone(),
            chosen_purpose.cloned(),
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
        action_id: &str,
    ) -> Result<bool, ExecutionError> {
        let installed = core.state.installed.clone();
        let action = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        let method =
            manufacturing::current(&installed.retained, action).ok_or(ExecutionError::Invariant)?;
        let stock = self.craft_stock.take().ok_or(ExecutionError::Invariant)?;
        // The replaced action's holds are already released in this candidate.
        // Include the new tool claim in the exact debit and inventory revisions.
        // A refusal rolls the replacement and both actions' claims back together.
        core.reserve_craft_tool(actor)?;
        let Some(debits) = core.plan_owned_debits(actor, &stock.amounts)? else {
            self.refuse_craft(
                "missing-material",
                "The required materials are no longer available.".into(),
            )?;
            return Ok(false);
        };
        core.record_owned_debit_sources(actor, action_id, &debits)?;
        if !manufacturing::finish_fits(core, method, actor, action_id, &self.budget)? {
            self.refuse_craft(
                "experience-capacity",
                "This work will not fit in the action record.".into(),
            )?;
            return Ok(false);
        }
        core.use_owned_lots(actor, action_id, debits)?;
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
        let profile = &installed.content.profile;
        let wording = crate::worlds::activity_display::craft_words((&profile.id, profile.version))
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let _workspace = self.budget.reserve(
            512 + event.len()
                + 3 * actor.len()
                + 2 * (wording.started.len() + method.name.storage_bytes()),
        )?;
        let text =
            crate::text::substitute_fields(wording.started, &[("recipe", (&method.name).into())]);
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
