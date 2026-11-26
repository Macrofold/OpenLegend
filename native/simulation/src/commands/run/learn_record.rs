//! Learn from a current carried or world inspection. Only a world record
//! needs sight and reach. The grant leaves the object in place.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::ground_items::inspection::{WorldStorage, owned};
use crate::install::GrantSource;
use crate::knowledge::recipe_grants::{LEARNED_EVENT, Learning, learn_recipe, learning_copy};
use crate::reception::{EventScalar, SightBatch};
use crate::text::JsText;
use crate::values::DefinitionPin;

const UNINSPECTED: &str = "record-uninspected";
const UNAVAILABLE: &str = "record-unavailable";
const STALE: &str = "stale-record";
const METHOD: &str = "method-unavailable";

struct AdmittedRecord<'a> {
    root: Option<WorldStorage<'a>>,
    item: &'a crate::state::Entity,
    item_name: &'a JsText,
    recipe: &'a DefinitionPin,
}

struct ReadRecord {
    item_id: String,
    item_name: JsText,
    recipe: DefinitionPin,
    method_name: JsText,
}

fn selected_record<'a>(
    state: &'a crate::simulation::SimulationState,
    actor: &str,
    command: &NativeCommand,
    budget: &ByteBudget,
) -> Result<Result<AdmittedRecord<'a>, (&'static str, &'static str)>, ExecutionError> {
    let NativeCommand::LearnRecord { record, .. } = command else {
        return Err(ExecutionError::Invariant);
    };
    let copy = learning_copy();
    let Some(root) = state
        .physical
        .entities
        .get(actor)
        .filter(|body| body.has_memory())
        .and_then(|actor| actor.actor.as_ref())
        .and_then(|actor| actor.inventory_inspection.as_ref())
        .and_then(|page| page.container_id.as_deref())
    else {
        return Ok(Err((UNINSPECTED, copy.uninspected)));
    };
    let world = WorldStorage::selected(state, actor, root);
    let page = if let Some(world) = &world {
        world.inspection(budget)?
    } else {
        owned::current(state, actor, root, budget)?
    };
    let Some(page) = page else {
        return Ok(Err((UNINSPECTED, copy.uninspected)));
    };
    if !page.item_ids.contains(&record.item_id) {
        return Ok(Err((UNINSPECTED, copy.uninspected)));
    }
    let Some(item) = state.physical.entities.get(&record.item_id).filter(|item| {
        item.retirement.is_none() && crate::install::inventory_parent(item) == Some(root)
    }) else {
        return Ok(Err((UNAVAILABLE, copy.unavailable)));
    };
    let Some(lot) = item.item.as_ref() else {
        return Ok(Err((UNAVAILABLE, copy.unavailable)));
    };
    let definition = state
        .installed
        .retained
        .items
        .get(&lot.definition_pin.id)
        .filter(|definition| definition.pin == lot.definition_pin)
        .ok_or(ExecutionError::Invariant)?;
    let item_read = crate::install::project_owned(
        &state.installed.retained,
        "",
        item,
        false,
        state.physical.holds.quantity(&item.id),
    )?;
    if record.record_pin != definition.pin
        || record.expected_revision != item_read.revision
        || record.placement_revision != item_read.placement_revision
    {
        return Ok(Err((STALE, copy.stale)));
    }
    let Some(method) = definition.recipe_record.as_ref() else {
        return Ok(Err((UNAVAILABLE, copy.unavailable)));
    };
    if !method.available {
        return Ok(Err((METHOD, copy.definition_unavailable)));
    }
    Ok(Ok(AdmittedRecord {
        root: world,
        item,
        item_name: &definition.named.name,
        recipe: &method.method,
    }))
}

impl CommandCursor {
    fn record_refusal(&mut self, code: &str, message: &str) -> Result<(), ExecutionError> {
        self.reserve(64 + code.len() + message.len())?;
        self.outcome = Some(outcome(false, code, message));
        self.phase = Phase::Done;
        Ok(())
    }

    pub(super) fn start_record_learning(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Option<Progress>, ExecutionError> {
        let selected = match selected_record(core.state, actor, &self.command, &self.budget)? {
            Ok(selected) => selected,
            Err((code, message)) => {
                self.record_refusal(code, message)?;
                return Ok(None);
            }
        };
        let Some(root) = &selected.root else {
            let prepared = self.prepare_record(core.state, actor, selected)?;
            if let Some(prepared) = prepared {
                return self.apply_record(core, actor, prepared).map(Some);
            }
            return Ok(None);
        };
        self.binding.serial = core.journal.next_provider_serial()?;
        self.sight = Some(
            SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                actor,
                &[root.root.id.as_str()],
                self.binding,
                &self.budget,
            )
            .map_err(|_| ExecutionError::Invariant)?,
        );
        self.phase = Phase::LearnRecordSight;
        Ok(Some(Progress::Geometry))
    }

    pub(super) fn record_learning_geometry(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let sight = if matches!(self.phase, Phase::LearnRecordSight) {
            Some(
                self.sight
                    .take()
                    .ok_or(ExecutionError::Invariant)?
                    .finish(answer)
                    .map_err(|_| ExecutionError::Invariant)?,
            )
        } else {
            let requests = self.queries.take().ok_or(ExecutionError::Invariant)?;
            requests
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::Invariant)?;
            if answer.sight.as_slice() != [true] {
                self.record_refusal(UNAVAILABLE, learning_copy().unavailable)?;
                return self.drive(core, None);
            }
            None
        };
        let actor = self.command.envelope().actor_id.clone();
        let selected = match selected_record(core.state, &actor, &self.command, &self.budget)? {
            Ok(selected) => selected,
            Err((code, message)) => {
                self.record_refusal(code, message)?;
                return self.drive(core, None);
            }
        };
        let root = selected.root.as_ref().ok_or(ExecutionError::Invariant)?;
        if let Some(sight) = sight {
            if sight.seen(&root.root.id) == Some(true) {
                if let Some(ray) = root.reach(&self.budget)? {
                    self.reserve(size_of::<crate::geometry::SightRay>())?;
                    self.question(core, Phase::LearnRecordReach)?
                        .sight
                        .push(ray);
                    return Ok(Progress::Geometry);
                }
            }
            self.record_refusal(UNAVAILABLE, learning_copy().unavailable)?;
            return self.drive(core, None);
        }
        let prepared = self.prepare_record(core.state, &actor, selected)?;
        match prepared {
            Some(prepared) => self.apply_record(core, &actor, prepared),
            None => self.drive(core, None),
        }
    }

    fn prepare_record(
        &mut self,
        state: &crate::simulation::SimulationState,
        actor: &str,
        selected: AdmittedRecord<'_>,
    ) -> Result<Option<ReadRecord>, ExecutionError> {
        if self.options.preview || self.preparation_mode.is_some() {
            self.outcome = Some(outcome(true, "available", ""));
            self.phase = Phase::Done;
            return Ok(None);
        }
        let method_body = state
            .installed
            .retained
            .recipes
            .get(&selected.recipe.id)
            .ok_or(ExecutionError::Invariant)?;
        let _workspace = self.budget.reserve(3 * method_body.len() + 4_096)?;
        #[derive(serde::Deserialize)]
        struct NamedMethod {
            name: JsText,
        }
        let method: NamedMethod =
            serde_json::from_str(method_body).map_err(|_| ExecutionError::Invariant)?;
        self.reserve(
            2_048
                + selected.item.id.len() * 2
                + 2 * selected.item_name.storage_bytes()
                + 4 * method.name.storage_bytes()
                + selected.recipe.id.len() * 4
                + selected.recipe.digest.len() * 2
                + actor.len() * 4,
        )?;
        Ok(Some(ReadRecord {
            recipe: selected.recipe.clone(),
            item_name: selected.item_name.clone(),
            item_id: selected.item.id.clone(),
            method_name: method.name,
        }))
    }

    fn apply_record(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
        ReadRecord {
            recipe,
            item_name,
            item_id,
            method_name,
        }: ReadRecord,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::LearnRecord { envelope, record } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let item_revision = record.expected_revision;
        let placement_revision = record.placement_revision;
        let learned = learn_recipe(
            core,
            actor,
            &envelope.id,
            &recipe.id,
            GrantSource::Record,
            &self.budget,
        )?;
        if learned == Learning::Capacity {
            self.record_refusal("knowledge-capacity", learning_copy().capacity)?;
            return self.drive(core, None);
        }
        let mut text = JsText::from(if learned == Learning::Acquired {
            "I learned the exact method for "
        } else {
            "I checked "
        });
        if learned == Learning::Acquired {
            text.push_text(&method_name);
            text.push_str(" from ");
            text.push_text(&item_name);
            text.push_str(". No item was made.");
        } else {
            text.push_text(&item_name);
            text.push_str("; I already know the exact method for ");
            text.push_text(&method_name);
            text.push_str(".");
        }
        let (code, suffix) = if learned == Learning::Acquired {
            ("acquired", " learned.")
        } else {
            (
                "already-known",
                " is already known. No knowledge or items were duplicated.",
            )
        };
        let event = core.stage_event(EventEmissionIntent {
            event_type: LEARNED_EVENT.into(),
            text: EmissionText::Literal(text),
            audience: AudienceSelection::Explicit(vec![actor.to_owned()]),
            source_id: Some(actor.to_owned()),
            target_id: None,
            data: Some(IndexMap::from([
                (
                    "recipeId".into(),
                    EventScalar::Text(recipe.id.clone().into()),
                ),
                ("itemId".into(), EventScalar::Text(item_id.into())),
                (
                    "methodVersion".into(),
                    EventScalar::Number(recipe.version as f64),
                ),
                (
                    "methodDigest".into(),
                    EventScalar::Text(recipe.digest.into()),
                ),
                (
                    "recordRevision".into(),
                    EventScalar::Number(item_revision as f64),
                ),
                (
                    "placementRevision".into(),
                    EventScalar::Number(placement_revision as f64),
                ),
                ("learned".into(), EventScalar::Text(code.into())),
            ])),
            scope: EventScope::Private,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Tail;
        let mut result = outcome(true, code, "");
        result.message = method_name;
        result.message.push_str(suffix);
        result.recipe_id = Some(recipe.id);
        self.outcome = Some(result);
        Ok(Progress::Occurrence(event))
    }
}
