//! Feed advances through the same action timer, body motion, result
//! and receipt owners. Each working cut verifies current reach, sight and stock
//! before advancing the actual timer or applying a meal.
use super::*;
use crate::host::retained_size::HeapBytes;
use crate::native_controller::feeding;
use crate::native_response::FoodStock;
use crate::reception::{EventScalar, SightBatch};
use crate::worlds::base_foraging::feeding_terms;

enum MealDebit {
    Resource { revision: u64 },
    Item { id: String, revision: u64 },
    Remains(crate::state::Remains),
}

impl MoveAdvanceCursor {
    fn meal_target<'a>(
        &self,
        core: &'a CoreMutation<'_>,
    ) -> Result<(&'a Entity, &'a Action, Option<&'a Entity>), ExecutionError> {
        let action_id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, action_id, self.physical_life)?;
        let target = action.target_id.as_ref().ok_or(ExecutionError::Invariant)?;
        Ok((actor, action, core.state.physical.entities.get(target)))
    }

    pub(super) fn begin_feed_check(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let (actor, action, target) = self.meal_target(core)?;
        let gathering = action.is_gathering();
        if gathering && !self.current_gathering_binding(core, action)? {
            self.fail(&crate::worlds::base_gathering::copy().unavailable)?;
            return self.drive(core, None);
        }
        let Some(target) = target.filter(|target| target.actively_participates()) else {
            let installed = core.state.installed.clone();
            let reason = if action.is_picking_up() {
                &installed.ordinary_actions.value().out_of_reach.message
            } else {
                &feeding_terms().out_of_reach
            };
            self.fail(reason)?;
            return self.drive(core, None);
        };
        let reach = interaction_reach(core, gathering);
        if let Some(ray) = crate::geometry::interaction_reach(actor, target, reach, &self.budget)? {
            let storage = self
                .budget
                .reserve(size_of::<GeometryQueries>() + size_of::<crate::geometry::SightRay>())?;
            self.binding.serial = core.journal.next_provider_serial()?;
            let mut query = GeometryQueries::new(self.binding);
            query.sight = vec![ray];
            self.queries = Some((query, storage));
            self.phase = Phase::FeedReach;
            return Ok(Progress::Geometry);
        }
        self.feed_reach_answer(core, false)
    }

    pub(super) fn feed_reach_answer(
        &mut self,
        core: &mut CoreMutation<'_>,
        in_reach: bool,
    ) -> Result<Progress, ExecutionError> {
        let (actor, action, target) = self.meal_target(core)?;
        let target = target.ok_or(ExecutionError::Invariant)?;
        let gathering = action.is_gathering();
        if !in_reach && action.stage == "working" {
            let installed = core.state.installed.clone();
            let message = if action.is_picking_up() {
                &installed.ordinary_actions.value().out_of_reach.message
            } else if gathering {
                &crate::worlds::base_gathering::copy().out_of_reach
            } else {
                &feeding_terms().out_of_reach
            };
            self.fail(message)?;
            return self.drive(core, None);
        }
        if !in_reach {
            if !action.path.is_empty() {
                if self.seconds == 0.0 {
                    self.phase = Phase::Done;
                    return Ok(Progress::Complete);
                }
                let distance = core.state.installed.movement_speed(actor)? * self.seconds;
                self.start_motion(core, distance, Phase::PositiveMotion)?;
                return self.drive(core, None);
            }
            let rules = core.state.installed.clone();
            if action.replans.unwrap_or(0) >= rules.movement_settings.max_replans {
                self.fail(&rules.ordinary_actions.value().movement_changing_route)?;
                return self.drive(core, None);
            }
            let (route, allowance) = feeding::approach(
                actor,
                target,
                interaction_reach(core, gathering),
                &self.budget,
            )?;
            let _container = self.budget.reserve(size_of::<GeometryQueries>())?;
            core.physical().increment_action_replans(
                &self.actor_id,
                self.action_id.as_deref().ok_or(ExecutionError::Invariant)?,
            )?;
            self.binding.serial = core.journal.next_provider_serial()?;
            let mut query = GeometryQueries::new(self.binding);
            query.routes = vec![route];
            let mut allowance = allowance;
            allowance.merge(_container)?;
            self.queries = Some((query, allowance));
            self.phase = Phase::Route;
            return Ok(Progress::Geometry);
        }
        if gathering {
            return self.advance_gathering(core);
        }
        // Keep the same cut and physical-life binding while the engine's
        // ordinary detector determines whether the now-reachable food is known.
        let target_id = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let target_storage = self.budget.reserve(target_id.len())?;
        let target_id = target_id.to_owned();
        self.binding.serial = core.journal.next_provider_serial()?;
        self.meal_sight = Some(
            SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                &self.actor_id,
                &[&target_id],
                self.binding,
                &self.budget,
            )
            .map_err(|error| match error {
                crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })?,
        );
        drop(target_storage);
        self.phase = Phase::FeedSight;
        Ok(Progress::Geometry)
    }

    pub(super) fn feed_sight_answer(
        &mut self,
        core: &mut CoreMutation<'_>,
        answers: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let sight = self
            .meal_sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answers)
            .map_err(|_| ExecutionError::Invariant)?;
        let installed = core.state.installed.clone();
        let (actor, action, target) = self.meal_target(core)?;
        if action.is_picking_up() {
            let visible = target.is_some_and(|pile| sight.seen(&pile.id) == Some(true));
            return self.finish_pickup_sight(core, visible);
        }
        let binding = action.feeding.as_ref().ok_or(ExecutionError::Invariant)?;
        let item = match &binding.source {
            FoodStock::Item { item_id, .. } => Some(item_id.as_str()),
            _ => None,
        };
        let Some((target, meal)) = target
            .filter(|target| sight.seen(&target.id) == Some(true))
            .and_then(|target| {
                feeding::meal(core.state, actor, target, item).map(|meal| (target, meal))
            })
        else {
            self.fail(&feeding_terms().unavailable)?;
            return self.drive(core, None);
        };
        if !meal.matches(binding, &self.budget)? {
            self.fail(&feeding_terms().unavailable)?;
            return self.drive(core, None);
        }
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        if action.stage == "approaching" {
            let replans = action.replans;
            let allowance = self.budget.reserve("working".len())?;
            core.physical().replace_action_route(
                &self.actor_id,
                id,
                crate::state::FundedActionRoute::from_storage(
                    ActionRouteWrite {
                        path: Vec::new(),
                        navigation: None,
                        stage: "working".into(),
                        replans,
                    },
                    allowance,
                    &self.budget,
                )?,
            )?;
            let handle = core
                .state
                .physical
                .entities
                .handle(&self.actor_id)
                .ok_or(ExecutionError::Invariant)?;
            core.physical().refresh_territorial_place(handle)?;
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let terms = feeding_terms();
        let food = installed
            .retained
            .foraging
            .food
            .get(&meal.food.pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let attribute_id = &meal.profile.profile.fullness.attribute_id;
        let definition = installed
            .attributes
            .get(attribute_id)
            .ok_or(ExecutionError::Invariant)?
            .value();
        let crate::status::AttributeSchema::Number { max, .. } = definition.schema else {
            return Err(ExecutionError::Invariant);
        };
        let Some(crate::values::AttributeValue::Number(before)) = installed
            .status_read(&core.state.physical)
            .value(&self.actor_id, attribute_id)?
        else {
            self.fail(&terms.cannot_consume)?;
            return self.drive(core, None);
        };
        let parameters = installed
            .account_law()
            .affects_observation(actor, attribute_id);
        let remaining = action.remaining_seconds;
        let will_finish = remaining <= self.seconds + installed.time_epsilon;
        let prepared = if will_finish {
            let source_bytes = match meal.source {
                feeding::MealSource::Resource(_) => 0,
                feeding::MealSource::Item(id, _) => id.len(),
                feeding::MealSource::Remains(value) => {
                    value.heap_bytes().ok_or(ExecutionError::Capacity)?
                }
            };
            self._reservation.resize(
                self._reservation
                    .bytes()
                    .checked_add(
                        4 * (self.actor_id.len()
                            + id.len()
                            + target.id.len()
                            + food.pin.id.len()
                            + food.definition.name.storage_bytes()
                            + terms.description_prefix.len()
                            + terms.description_suffix.len()
                            + terms.event_type.len())
                            + source_bytes
                            + 1024,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let debit = match meal.source {
                feeding::MealSource::Resource(stock) => MealDebit::Resource {
                    revision: stock.revision.unwrap_or_default(),
                },
                feeding::MealSource::Item(id, lot) => MealDebit::Item {
                    id: id.into(),
                    revision: lot.revision,
                },
                feeding::MealSource::Remains(value) => {
                    let mut after = value.clone();
                    let position = after
                        .yields
                        .iter()
                        .position(|row| row.definition_id == food.pin.id && row.quantity > 0)
                        .ok_or(ExecutionError::Invariant)?;
                    after.yields[position].quantity -= 1;
                    if after.yields[position].quantity == 0 {
                        after.yields.remove(position);
                    }
                    after.harvested = after.yields.is_empty();
                    MealDebit::Remains(after)
                }
            };
            Some((target.id.clone(), debit))
        } else {
            None
        };
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let (target_id, debit) = prepared.ok_or(ExecutionError::Invariant)?;
        let changed = match debit {
            MealDebit::Resource { revision } => {
                core.physical().debit_resource(&target_id, revision, 1)?
            }
            MealDebit::Item {
                id: item_id,
                revision,
            } => core.debit_ground_lot(&target_id, &item_id, &food.pin, revision, id)?,
            MealDebit::Remains(after) => {
                core.physical().set_remains(&target_id, Some(after))?;
                true
            }
        };
        if !changed {
            self.fail(&terms.consumed_first)?;
            return self.drive(core, None);
        }
        let after = crate::values::js_min(max, before + food.definition.nutrition);
        core.physical()
            .apply_ordinary_rate(&self.actor_id, definition, after, parameters)?;
        let description = crate::text::JsText::concat(&[
            &terms.description_prefix.as_str().into(),
            &food.definition.name,
            &terms.description_suffix.as_str().into(),
        ]);
        let data = indexmap::IndexMap::from([
            ("actionId".into(), EventScalar::Text(id.into())),
            (
                "definitionId".into(),
                EventScalar::Text(food.pin.id.as_str().into()),
            ),
            ("quantity".into(), EventScalar::Number(1.0)),
        ]);
        let event = feeding::stage(
            core,
            &self.actor_id,
            &target_id,
            &terms.event_type,
            description,
            data,
        )?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Finish;
        Ok(Progress::Occurrence(event))
    }
}

fn interaction_reach(core: &CoreMutation<'_>, gathering: bool) -> f64 {
    let installed = &core.state.installed;
    if gathering {
        installed.movement.interaction_radius()
    } else {
        installed.retained.item_handling_read.reach
    }
}
