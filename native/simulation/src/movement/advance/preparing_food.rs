//! Work earns elapsed time only while the chosen heat remains reachable and
//! lit. The ordinary journal owns the ingredient and completion boundaries.
use super::*;
use crate::commands::ActivityOutput;
use crate::food_preparation as food;
use crate::host::retained_size::HeapBytes;
use crate::reception::EventScalar;
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn check_cook(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let heat = action
            .heat_id
            .as_deref()
            .and_then(|id| food::heat(core.state, id));
        let Some(heat) = heat.filter(|_| food::current(core.state, action).is_some()) else {
            self.fail(food::messages().interrupted)?;
            return self.drive(core, None);
        };
        let reach = core.state.installed.movement.interaction_radius();
        if let Some(ray) = crate::geometry::interaction_reach(actor, heat, reach, &self.budget)? {
            let allowance = self
                .budget
                .reserve(size_of::<GeometryQueries>() + size_of::<crate::geometry::SightRay>())?;
            self.binding.serial = core.journal.next_provider_serial()?;
            let mut query = GeometryQueries::new(self.binding);
            query.sight = vec![ray];
            self.queries = Some((query, allowance));
            self.phase = Phase::CookReach;
            Ok(Progress::Geometry)
        } else {
            self.cook_reach_answer(core, false)
        }
    }

    pub(super) fn cook_reach_answer(
        &mut self,
        core: &mut CoreMutation<'_>,
        reached: bool,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        if !reached && action.stage == "working" {
            self.fail(food::messages().out_of_reach)?;
            return self.drive(core, None);
        }
        if !reached {
            if !action.path.is_empty() {
                if self.seconds == 0.0 {
                    self.phase = Phase::Done;
                    return Ok(Progress::Complete);
                }
                let distance = core.state.installed.movement_speed(actor)? * self.seconds;
                self.start_motion(core, distance, Phase::PositiveMotion)?;
                return self.drive(core, None);
            }
            let installed = core.state.installed.clone();
            if action.replans.unwrap_or(0) >= installed.movement_settings.max_replans {
                self.fail(&installed.ordinary_actions.value().movement_changing_route)?;
                return self.drive(core, None);
            }
            let heat = action
                .heat_id
                .as_deref()
                .and_then(|id| food::heat(core.state, id))
                .ok_or(ExecutionError::Invariant)?;
            let (route, mut allowance) = crate::native_controller::feeding::approach(
                actor,
                heat,
                installed.movement.interaction_radius(),
                &self.budget,
            )?;
            allowance.merge(self.budget.reserve(size_of::<GeometryQueries>())?)?;
            core.physical()
                .increment_action_replans(&self.actor_id, id)?;
            self.binding.serial = core.journal.next_provider_serial()?;
            let mut query = GeometryQueries::new(self.binding);
            query.routes = vec![route];
            self.queries = Some((query, allowance));
            self.phase = Phase::Route;
            return Ok(Progress::Geometry);
        }
        if action.stage == "approaching" {
            return self.start_cook_work(core);
        }
        self.advance_cook(core)
    }

    fn start_cook_work(&mut self, core: &mut CoreMutation<'_>) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let binding = action
            .food_preparation
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let recipe = installed
            .retained
            .preparations
            .get(&binding.definition.id)
            .ok_or(ExecutionError::Invariant)?;
        let Some(claims) = food::claims(
            core.state,
            &self.actor_id,
            recipe,
            &binding.inputs,
            &self.budget,
        )?
        else {
            self.fail(food::messages().ingredients_missing)?;
            return self.drive(core, None);
        };
        let Some(debits) = core.plan_owned_debits(&self.actor_id, &claims.lots)? else {
            self.fail(food::messages().ingredients_missing)?;
            return self.drive(core, None);
        };
        let heat = action.heat_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let allowance = self.budget.reserve(
            512 + id.len()
                + heat.len()
                + binding.heap_bytes().ok_or(ExecutionError::Capacity)?
                + food::requirements_bound(recipe).ok_or(ExecutionError::Capacity)?,
        )?;
        let mut working = Action::cook(
            id.into(),
            heat.into(),
            recipe.definition.work_seconds,
            binding.clone(),
        );
        working.replans = action.replans;
        working.consumed = food::work_requirements(recipe);
        let action = crate::state::FundedAction::from_storage(working, allowance, &self.budget)?;
        if !food::start_work(core, &self.actor_id, id, recipe, debits, &self.budget)? {
            self.fail(food::messages().record_capacity)?;
            return self.drive(core, None);
        }
        core.physical().replace_action(
            &self.actor_id,
            Some(action),
            ActionWrite {
                generation: PlanGenerationWrite::Preserve,
                behavior: None,
            },
        )?;
        self.phase = Phase::Done;
        Ok(Progress::Complete)
    }

    fn advance_cook(&mut self, core: &mut CoreMutation<'_>) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let epsilon = core.state.installed.time_epsilon;
        if action.remaining_seconds > self.seconds + epsilon {
            core.physical()
                .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let installed = core.state.installed.clone();
        let recipe = installed
            .retained
            .preparations
            .get(
                &action
                    .food_preparation
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?
                    .definition
                    .id,
            )
            .ok_or(ExecutionError::Invariant)?;
        let terms = &recipe.definition;
        let heat = action.heat_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let workspace = self.budget.reserve(
            1024 + id.len()
                + self.actor_id.len() * 3
                + heat.len() * 2
                + recipe.pin.id.len() * 2
                + terms.name.storage_bytes() * 2
                + terms.completed_text.storage_bytes() * 2
                + terms
                    .outputs
                    .iter()
                    .map(|output| 192 + output.definition_id.len() * 2)
                    .sum::<usize>(),
        )?;
        let heat = heat.to_owned();
        if !food::check_completion(core, &self.actor_id, id, recipe, &self.budget)? {
            self.fail(food::messages().record_capacity)?;
            return self.drive(core, None);
        }
        if !core
            .physical()
            .advance_timed_work(&self.actor_id, id, self.seconds, epsilon)?
        {
            return Err(ExecutionError::Invariant);
        }
        let mut outputs = Vec::with_capacity(terms.outputs.len());
        for output in &terms.outputs {
            let item_id = core.produce_carried_item(
                &self.actor_id,
                &output.definition_id,
                output.quantity,
                false,
            )?;
            outputs.push(ActivityOutput {
                port: output.definition_id.clone(),
                item_id,
                definition_id: output.definition_id.clone(),
                quantity: output.quantity,
            });
        }
        let event = crate::native_controller::feeding::stage(
            core,
            &self.actor_id,
            &heat,
            "cooked",
            terms.completed_text.clone(),
            IndexMap::from([
                ("actionId".into(), EventScalar::Text(id.into())),
                (
                    "preparationId".into(),
                    EventScalar::Text(recipe.pin.id.clone().into()),
                ),
                (
                    "quantity".into(),
                    EventScalar::Number(outputs.iter().map(|output| output.quantity as f64).sum()),
                ),
            ]),
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        self.production_result = Some(food::completed_outcome(recipe, outputs));
        self._reservation.merge(workspace)?;
        Ok(Progress::Occurrence(event))
    }
}
