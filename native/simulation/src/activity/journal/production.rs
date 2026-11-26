//! Record the actual products of completed work. The inventory owns the lots;
//! these event-time facts and links belong to the actor's activity history.
use super::*;
use crate::commands::ActivityOutput;
use crate::install::ItemDefinitionRead;
use crate::text::JsText;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Words {
    produced: String,
    produced_prefix: String,
    quantity: String,
    material: String,
    unknown_material: String,
    ingredient_history: String,
    mixed_ingredient_history: String,
    reached_working_distance: String,
}

static WORDS: LazyLock<Words> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/activity-result-copy.json"
    ))
    .expect("shared activity result wording")
});

impl ActivityJournal {
    pub(crate) fn reached_preparation_work(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        action: &str,
    ) -> Result<(), ActivityError> {
        let Some(entry) = state.active(action)? else {
            return Ok(());
        };
        if entry.actor_id != actor {
            return Err(ActivityError::InvalidStructure);
        }
        if entry.view.children.as_ref().is_none_or(Vec::is_empty) {
            return Ok(());
        }
        self.reserve(entry.id.len() + WORDS.reached_working_distance.len())?;
        let id = entry.id.clone();
        self.record_before(state, actor, &id)?;
        let child = state
            .collections
            .get_mut(actor)
            .and_then(|owner| owner.records.get_mut(&id))
            .and_then(|record| record.occurrence.view.children.as_mut())
            .and_then(|children| children.first_mut())
            .ok_or(ActivityError::InvalidStructure)?;
        child.result = Some(WORDS.reached_working_distance.as_str().into());
        self.settle_record(state, actor, &id)
    }

    /// Exercise the same completion envelope without keeping its provisional
    /// outputs, active-record edits, or personal-result preparation.
    pub(crate) fn check_production_finish(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        action: &str,
        result: crate::commands::Outcome,
        at: f64,
        before_names: &IndexMap<String, String>,
        definitions: &IndexMap<String, ItemDefinitionRead>,
    ) -> Result<bool, ActivityError> {
        let checkpoint = self.checkpoint();
        let accepted =
            self.prepare_end(state, actor, action, result, at, before_names, definitions);
        let available = match accepted {
            Ok(_) => Ok(true),
            Err(ActivityError::Capacity | ActivityError::InvalidFact) => Ok(false),
            Err(problem) => Err(problem),
        };
        self.rollback_to(state, checkpoint)?;
        available
    }

    pub(super) fn produced_fact(
        &mut self,
        outputs: &[ActivityOutput],
        definitions: &IndexMap<String, ItemDefinitionRead>,
        limits: &ActivityLimits,
    ) -> Result<Option<ActivityFact>, ActivityError> {
        if outputs.is_empty() {
            return Ok(None);
        }
        if outputs.len() as u64 > limits.outputs {
            return Err(ActivityError::InvalidStructure);
        }
        let labels = outputs
            .iter()
            .try_fold(0usize, |bytes, output| {
                let name = definitions
                    .get(&output.definition_id)
                    .map(|def| &def.named.name);
                bytes.checked_add(name.map_or(WORDS.unknown_material.len(), JsText::storage_bytes))
            })
            .ok_or(ActivityError::Capacity)?;
        let trees = map_storage::<JsText, ActivityDetail>(2).ok_or(ActivityError::Capacity)?;
        self.reserve(
            heap_sum([
                2048,
                labels.checked_mul(8).ok_or(ActivityError::Capacity)?,
                outputs
                    .len()
                    .checked_mul(trees + size_of::<ActivityDetail>() + 132)
                    .ok_or(ActivityError::Capacity)?,
            ])
            .ok_or(ActivityError::Capacity)?,
        )?;
        let mut details = Vec::with_capacity(outputs.len());
        let mut sentence = JsText::from(WORDS.produced_prefix.as_str());
        for output in outputs {
            let material = definitions.get(&output.definition_id).map_or_else(
                || WORDS.unknown_material.as_str().into(),
                |definition| definition.named.name.clone(),
            );
            if !details.is_empty() {
                sentence.push_str(", ");
            }
            sentence.push_str(&format!("{} ", output.quantity));
            sentence.push_text(&material);
            details.push(ActivityDetail::Fields(
                ActivityFields::new(IndexMap::from([
                    (
                        WORDS.quantity.as_str().into(),
                        ActivityDetail::Scalar(ActivityScalar::Number(output.quantity as f64)),
                    ),
                    (
                        WORDS.material.as_str().into(),
                        ActivityDetail::Scalar(ActivityScalar::String(material)),
                    ),
                ]))
                .map_err(|_| ActivityError::InvalidStructure)?,
            ));
        }
        Ok(Some(ActivityFact {
            name: WORDS.produced.as_str().into(),
            value: ActivityDetail::List(details),
            critical: true,
            sentence: Some(sentence),
        }))
    }

    pub(super) fn record_item_sources(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        occurrence: &str,
        outputs: &[ActivityOutput],
    ) -> Result<(), ActivityError> {
        for output in outputs {
            let previous = state.items.get(&output.item_id);
            if previous.is_some_and(|rows| rows.len() as u64 >= state.limits.links) {
                continue;
            }
            let added = actor.len() + occurrence.len() + output.port.len();
            let size = previous
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ActivityError::Capacity)?;
            let existing_base = previous.map_or(0, Vec::len);
            let map_growth = if previous.is_none() {
                map_storage::<String, Vec<ActivityItemSource>>(
                    state
                        .items
                        .capacity()
                        .max(4)
                        .checked_mul(2)
                        .ok_or(ActivityError::Capacity)?,
                )
                .ok_or(ActivityError::Capacity)?
            } else {
                0
            };
            self.reserve(
                heap_sum([
                    size,
                    added,
                    size_of::<ActivityItemSource>(),
                    2 * output.item_id.len(),
                    map_growth,
                ])
                .ok_or(ActivityError::Capacity)?,
            )?;
            let mut next = Vec::with_capacity(existing_base + 1);
            next.extend(previous.into_iter().flatten().cloned());
            next.push(ActivityItemSource {
                actor_id: actor.to_owned(),
                occurrence_id: occurrence.to_owned(),
                port: output.port.clone(),
                quantity: output.quantity as f64,
                ambiguous: None,
            });
            self.replace_item_sources(state, &output.item_id, Some(next))?;
        }
        Ok(())
    }

    fn replace_item_sources(
        &mut self,
        state: &mut ActivityState,
        key: &str,
        next: Option<Vec<ActivityItemSource>>,
    ) -> Result<(), ActivityError> {
        let metadata = super::super::residency::MetadataBefore::capture_item(state, key)?;
        let position = state.items.get_index_of(key);
        self.reserve(2 * key.len())?;
        self.prepare_undo_slots(1)?;
        if position.is_none() && next.is_some() {
            state
                .items
                .try_reserve(1)
                .map_err(|_| ActivityError::Capacity)?;
        }
        let old = match next {
            Some(next) => state.items.insert(key.to_owned(), next),
            None => state.items.shift_remove(key),
        };
        self.undo.push(ActivityUndo::ItemSources {
            key: key.into(),
            before: position.zip(old),
        });
        state.settle_item_metadata(metadata, key, &mut self.reservation)
    }

    /// Consume the actual accepted lot, carrying its permitted causal links
    /// into this occurrence. A mixed stack contributes bounds, not exact units.
    pub(crate) fn consume_item_source(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        action: &str,
        item: &str,
        before_quantity: u64,
        consumed: u64,
    ) -> Result<(), ActivityError> {
        let Some(sources) = state.items.get(item) else {
            return Ok(());
        };
        let sources_bytes = sources.heap_bytes().ok_or(ActivityError::Capacity)?;
        let retained = (before_quantity - consumed) as f64;
        let ambiguous = sources.len() > 1
            || sources.iter().any(|source| source.ambiguous == Some(true))
            || sources.iter().map(|source| source.quantity).sum::<f64>() < before_quantity as f64;
        let active = state.active(action)?;
        let occurrence = active.filter(|entry| entry.actor_id == actor);
        let has_fact = occurrence.is_some_and(|entry| {
            entry
                .view
                .facts
                .iter()
                .any(|fact| fact.name == WORDS.ingredient_history.as_str())
        });
        let maximum_links = occurrence.map_or(0, |entry| {
            (state.limits.links as usize).saturating_sub(entry.connections.len())
        });
        let occurrence_length = occurrence.map_or(0, |entry| entry.id.len());
        self.reserve(
            3 * sources_bytes
                + 3 * occurrence_length
                + 512
                + sources.len() * size_of::<ActivityConnection>()
                + WORDS.ingredient_history.len()
                + WORDS.mixed_ingredient_history.len(),
        )?;
        let occurrence_id = occurrence.map(|entry| entry.id.clone());
        let mut links = Vec::new();
        let mut next = Vec::with_capacity(sources.len());
        for source in sources {
            if occurrence_id
                .as_ref()
                .is_some_and(|id| source.occurrence_id != *id)
                && source.actor_id == actor
                && links.len() < maximum_links
            {
                links.push(ActivityConnection {
                    from: source.occurrence_id.clone(),
                    relation: ConnectionKind::Material,
                    quantity: (!ambiguous).then(|| (consumed as f64).min(source.quantity)),
                    port: Some(source.port.clone()),
                });
            }
            let mut source = source.clone();
            source.quantity = if ambiguous {
                source.quantity.min(retained)
            } else {
                (source.quantity - consumed as f64).max(0.0)
            };
            if ambiguous {
                source.ambiguous = Some(true);
            }
            next.push(source);
        }
        if let Some(id) = occurrence_id.filter(|_| !links.is_empty() || ambiguous) {
            self.record_before(state, actor, &id)?;
            let entry = &mut state
                .collections
                .get_mut(actor)
                .and_then(|collection| collection.records.get_mut(&id))
                .ok_or(ActivityError::InvalidStructure)?
                .occurrence;
            entry.connections.append(&mut links);
            if ambiguous {
                entry.incomplete = Some(true);
                if !has_fact {
                    entry.view.facts.push(ActivityFact {
                        name: WORDS.ingredient_history.as_str().into(),
                        value: ActivityDetail::Scalar(ActivityScalar::String(
                            WORDS.mixed_ingredient_history.as_str().into(),
                        )),
                        critical: true,
                        sentence: None,
                    });
                }
            }
            entry.validate(actor, &state.limits, &state.display)?;
            self.settle_record(state, actor, &id)?;
        }
        self.replace_item_sources(
            state,
            item,
            next.iter()
                .any(|source| source.quantity > 0.0)
                .then_some(next),
        )
    }

    /// Move existing material history with the measured portion. Like ordinary
    /// consumption, a mixed stack preserves bounds without assigning identities
    /// to units it cannot distinguish.
    pub(crate) fn transfer_item_sources(
        &mut self,
        state: &mut ActivityState,
        item: &str,
        target: &str,
        before: u64,
        quantity: u64,
    ) -> Result<(), ActivityError> {
        let Some(sources) = state.items.get(item) else {
            return Ok(());
        };
        let previous_target = state.items.get(target);
        let limit = state.limits.links as usize;
        let free = (before - quantity) as f64;
        let ambiguous = sources.len() > 1
            || sources.iter().any(|source| source.ambiguous == Some(true))
            || sources.iter().map(|source| source.quantity).sum::<f64>() < before as f64;
        let map_growth = if previous_target.is_none() {
            map_storage::<String, Vec<ActivityItemSource>>(
                state
                    .items
                    .capacity()
                    .max(4)
                    .checked_mul(2)
                    .ok_or(ActivityError::Capacity)?,
            )
            .ok_or(ActivityError::Capacity)?
        } else {
            0
        };
        self.reserve(
            heap_sum([
                2 * sources.heap_bytes().ok_or(ActivityError::Capacity)?,
                previous_target
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ActivityError::Capacity)?,
                2 * (item.len() + target.len()),
                map_growth,
            ])
            .ok_or(ActivityError::Capacity)?,
        )?;
        let target_capacity = previous_target.map_or(0, Vec::len);
        let mut transferred = Vec::with_capacity(limit.min(target_capacity + sources.len()));
        transferred.extend(previous_target.into_iter().flatten().cloned());
        let mut remaining = Vec::with_capacity(sources.len());
        for source in sources {
            let moved = (quantity as f64).min(source.quantity);
            let prior = transferred.iter_mut().find(|candidate| {
                candidate.actor_id == source.actor_id
                    && candidate.occurrence_id == source.occurrence_id
                    && candidate.port == source.port
            });
            if let Some(prior) = prior {
                prior.quantity += moved;
                if ambiguous {
                    prior.ambiguous = Some(true);
                }
            } else if transferred.len() < limit {
                let mut entry = source.clone();
                entry.quantity = moved;
                if ambiguous {
                    entry.ambiguous = Some(true);
                }
                transferred.push(entry);
            }
            let mut source = source.clone();
            source.quantity = if ambiguous {
                source.quantity.min(free)
            } else {
                (source.quantity - quantity as f64).max(0.0)
            };
            if ambiguous {
                source.ambiguous = Some(true);
            }
            remaining.push(source);
        }
        self.replace_item_sources(state, target, Some(transferred))?;
        self.replace_item_sources(
            state,
            item,
            remaining
                .iter()
                .any(|source| source.quantity > 0.0)
                .then_some(remaining),
        )
    }

    pub(super) fn restore_item_sources(
        &mut self,
        state: &mut ActivityState,
        key: &str,
        before: Option<(usize, Vec<ActivityItemSource>)>,
    ) -> Result<(), ActivityError> {
        let metadata = super::super::residency::MetadataBefore::capture_item(state, key)?;
        state.items.shift_remove(key);
        if let Some((position, before)) = before {
            state.items.shift_insert(position, key.into(), before);
        }
        state.settle_item_metadata(metadata, key, &mut self.reservation)
    }
}
