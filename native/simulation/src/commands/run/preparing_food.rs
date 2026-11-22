//! Admit the exact recipe and visible heat. Approach uses the ordinary route,
//! and the work owner spends the ingredients when that route reaches the fire.
use super::*;
use crate::activity::{ActivityDetail, ActivityFact, ActivityFields, ActivityScalar};
use crate::food_preparation as food;
use crate::reception::{EventScalar, SightBatch};
use crate::text::JsText;
use std::mem::size_of;

impl CommandCursor {
    pub(super) fn prepare_cook(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Cook {
            envelope,
            heat_id,
            definition,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if !core
            .state
            .installed
            .retained
            .preparations
            .get(&definition.id)
            .is_some_and(|recipe| recipe.pin == *definition)
        {
            self.refuse_cook("stale-preparation", food::messages().stale)?;
            return Ok(false);
        }
        if food::heat(core.state, heat_id).is_none() {
            self.refuse_cook("no-heat", food::messages().heat_needed)?;
            return Ok(false);
        }
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                &envelope.actor_id,
                &[heat_id],
                self.binding,
                &self.budget,
            )
            .map_err(|error| match error {
                crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })?,
        );
        self.phase = Phase::CookSight;
        Ok(true)
    }

    pub(super) fn cook_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Cook {
            envelope,
            heat_id,
            definition,
            inputs,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        if sight.seen(heat_id) != Some(true) {
            self.refuse_cook("no-heat", food::messages().heat_needed)?;
            return self.drive(core, None);
        }
        let recipe = core
            .state
            .installed
            .retained
            .preparations
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?;
        if !recipe.matches_inputs(inputs) {
            self.refuse_cook("missing-material", food::messages().ingredients_missing)?;
            return self.drive(core, None);
        }
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let heat = food::heat(core.state, heat_id).ok_or(ExecutionError::MissingEntity)?;
        let reach = core.state.installed.movement.interaction_radius();
        self.action_storage = Some(
            self.budget.reserve(
                512 + recipe
                    .binding_bytes(inputs)
                    .ok_or(ExecutionError::Capacity)?
                    + heat_id.len()
                    + envelope.id.len(),
            )?,
        );
        self.action = Some(Action::cook(
            envelope.id.clone(),
            heat_id.clone(),
            recipe.definition.work_seconds,
            recipe.bind(inputs.clone()),
        ));
        if let Some(ray) = crate::geometry::interaction_reach(actor, heat, reach, &self.budget)? {
            self.reserve(size_of::<crate::geometry::SightRay>())?;
            self.question(core, Phase::CookReach)?.sight.push(ray);
            Ok(Progress::Geometry)
        } else {
            self.cook_reach(core, false)
        }
    }

    pub(super) fn cook_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        reached: bool,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let NativeCommand::Cook {
            envelope,
            heat_id,
            definition,
            inputs,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let recipe = core
            .state
            .installed
            .retained
            .preparations
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?;
        let Some(claims) =
            food::claims(core.state, &envelope.actor_id, recipe, inputs, &self.budget)?
        else {
            self.refuse_cook("missing-material", food::messages().ingredients_missing)?;
            return self.drive(core, None);
        };
        if reached {
            let Some(debits) = core.plan_owned_debits(&envelope.actor_id, &claims.lots)? else {
                self.refuse_cook("missing-material", food::messages().ingredients_missing)?;
                return self.drive(core, None);
            };
            self.grow_action_storage(
                food::requirements_bound(recipe).ok_or(ExecutionError::Capacity)?,
            )?;
            self.action
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .consumed = food::work_requirements(recipe);
            self.production_debits = Some(debits);
            self.phase = Phase::Prepared;
            return self.drive(core, None);
        }
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let heat = food::heat(core.state, heat_id).ok_or(ExecutionError::MissingEntity)?;
        let (route, custody) = crate::native_controller::feeding::approach(
            actor,
            heat,
            core.state.installed.movement.interaction_radius(),
            &self.budget,
        )?;
        self.question(core, Phase::Route)?.routes = vec![route];
        self._reservation.merge(custody)?;
        Ok(Progress::Geometry)
    }

    pub(super) fn prepare_cook_view(
        &mut self,
        core: &CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        use crate::worlds::activity_display::{
            ObservedActor, ObservedTarget, OrdinaryAction, format,
        };
        let NativeCommand::Cook {
            envelope,
            heat_id,
            definition,
            inputs,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let retained = &core.state.installed.retained;
        let recipe = retained
            .preparations
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?;
        let heat = food::heat(core.state, heat_id).ok_or(ExecutionError::Invariant)?;
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let limits = &core.state.activity.limits;
        let terms = &recipe.definition;
        let _detail_text = |id: &str| -> usize { retained.items[id].named.name.storage_bytes() };
        let mut storage = self.budget.reserve(
            4096 + 4 * (heat.name.storage_bytes() + terms.name.storage_bytes())
                + terms
                    .inputs
                    .iter()
                    .map(|input| 512 + 6 * (_detail_text(&input.definition_id) + input.role.len()))
                    .sum::<usize>()
                + terms
                    .outputs
                    .iter()
                    .map(|output| 384 + 6 * _detail_text(&output.definition_id))
                    .sum::<usize>(),
        )?;
        let messages = food::messages();
        let mut facts = vec![fact(
            "cost",
            format!(
                "{}{}{}",
                messages.cost_prefix, terms.work_seconds, messages.cost_suffix,
            ),
        )];
        let mut products = Vec::with_capacity(terms.outputs.len());
        let mut output_sentence: JsText = messages.output_prefix.into();
        for (index, output) in terms.outputs.iter().enumerate() {
            let label = &retained.items[&output.definition_id].named.name;
            if index > 0 {
                output_sentence.push_str(", ");
            }
            output_sentence.push_str(&format!("{} ", output.quantity));
            output_sentence.push_text(label);
            products.push(detail(IndexMap::from([
                ("quantity".into(), count(output.quantity)),
                ("material".into(), text(label.clone())),
            ]))?);
        }
        facts.push(ActivityFact {
            name: "output".into(),
            value: ActivityDetail::List(products),
            sentence: Some(output_sentence),
            critical: true,
        });
        let group_size =
            usize::try_from(limits.detail_entries).map_err(|_| ExecutionError::Invariant)?;
        for (group, portions) in terms.inputs.chunks(group_size).enumerate() {
            let mut sentence: JsText = messages.ingredients_prefix.into();
            let mut selected = Vec::with_capacity(portions.len());
            for (index, ingredient) in portions.iter().enumerate() {
                let label = &retained.items[&ingredient.definition_id].named.name;
                let owned = crate::install::owned_by(
                    &core.state.physical.entities,
                    retained,
                    &envelope.actor_id,
                    &inputs[&ingredient.role],
                )?
                .ok_or(ExecutionError::Invariant)?;
                if index > 0 {
                    sentence.push_str("; ");
                }
                sentence.push_str(&format!("{}: {} ", ingredient.role, ingredient.quantity));
                sentence.push_text(label);
                sentence.push_str(&format!(" ({}{})", owned.quantity, messages.carried_suffix));
                selected.push(detail(IndexMap::from([
                    ("role".into(), text(ingredient.role.as_str())),
                    ("material".into(), text(label.clone())),
                    ("required quantity".into(), count(ingredient.quantity)),
                    ("selected carried quantity".into(), count(owned.quantity)),
                ]))?);
            }
            facts.push(ActivityFact {
                name: if group == 0 {
                    "ingredients".into()
                } else {
                    format!("more ingredients {}", group + 1).into()
                },
                value: ActivityDetail::List(selected),
                sentence: Some(sentence),
                critical: true,
            });
        }
        facts.push(fact(
            "approach",
            format!(
                "Move to within {} m; the route length is not known",
                core.state.installed.movement.interaction_radius()
            ),
        ));
        facts.push(fact("fire", messages.fire_condition));
        let profile = &core.state.installed.content.profile;
        let view = format(
            (&profile.id, profile.version),
            OrdinaryAction::Production {
                name: terms.name.clone(),
                details: facts,
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
                position: heat
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                name: heat.name.clone(),
                health: None,
            }),
        )
        .ok_or(ExecutionError::Invariant)?;
        storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.view = Some(view);
        self.view_reservation = Some(storage);
        Ok(())
    }

    pub(super) fn cook_started(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Cook { heat_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let ordinary = &core
            .state
            .installed
            .ordinary_actions
            .value()
            .action_started_event;
        let _workspace = self
            .budget
            .reserve(3 * actor.len() + heat_id.len() + ordinary.len() + 512)?;
        let event = ordinary.clone();
        let staged = crate::native_controller::feeding::stage(
            core,
            actor,
            heat_id,
            &event,
            food::messages().started.into(),
            IndexMap::from([(
                "actionType".into(),
                EventScalar::Text(self.command.kind().into()),
            )]),
        )?;
        self.reserve(staged.id.len())?;
        self.event = Some(staged.id.clone());
        self.after_event = Phase::AfterDeparture;
        Ok(Progress::Occurrence(staged))
    }

    pub(super) fn admit_cook_record(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
        action: &Action,
    ) -> Result<bool, ExecutionError> {
        let installed = core.state.installed.clone();
        let pin = &action
            .food_preparation
            .as_deref()
            .ok_or(ExecutionError::Invariant)?
            .definition;
        let recipe = installed
            .retained
            .preparations
            .get(&pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let fits = if let Some(debits) = self.production_debits.take() {
            food::start_work(core, actor, &action.id, recipe, debits, &self.budget)?
        } else {
            food::check_completion(core, actor, &action.id, recipe, &self.budget)?
        };
        if !fits {
            self.refuse_cook("experience-capacity", food::messages().record_capacity)?;
        }
        Ok(fits)
    }

    fn refuse_cook(&mut self, code: &str, reason: &str) -> Result<(), ExecutionError> {
        self.reserve(code.len() + reason.len() + 64)?;
        self.outcome = Some(outcome(false, code, reason));
        self.phase = Phase::Done;
        Ok(())
    }
}

fn text(value: impl Into<JsText>) -> ActivityDetail {
    ActivityDetail::Scalar(ActivityScalar::String(value.into()))
}

fn count(value: u64) -> ActivityDetail {
    ActivityDetail::Scalar(ActivityScalar::Number(value as f64))
}

fn detail(fields: IndexMap<String, ActivityDetail>) -> Result<ActivityDetail, ExecutionError> {
    Ok(ActivityDetail::Fields(
        ActivityFields::new(
            fields
                .into_iter()
                .map(|(key, value)| (key.into(), value))
                .collect(),
        )
        .map_err(|_| ExecutionError::Invariant)?,
    ))
}

fn fact(name: &str, value: impl Into<JsText>) -> ActivityFact {
    ActivityFact {
        name: name.into(),
        value: text(value),
        critical: true,
        sentence: None,
    }
}
