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
}

static WORDS: LazyLock<Words> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/activity-result-copy.json"
    ))
    .expect("shared activity result wording")
});

impl ActivityJournal {
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
            let metadata =
                super::super::residency::MetadataBefore::capture_item(state, &output.item_id)?;
            let new = previous.is_none();
            self.push(ActivityUndo::ItemSources {
                key: output.item_id.clone(),
                before: None,
            })?;
            if new {
                state
                    .items
                    .try_reserve(1)
                    .map_err(|_| ActivityError::Capacity)?;
            }
            let before = state.items.insert(output.item_id.clone(), next);
            let Some(ActivityUndo::ItemSources { before: saved, .. }) = self.undo.last_mut() else {
                unreachable!("item output journal entry");
            };
            *saved = before;
            state.settle_item_metadata(metadata, &output.item_id, &mut self.reservation)?;
        }
        Ok(())
    }

    pub(super) fn restore_item_sources(
        &mut self,
        state: &mut ActivityState,
        key: &str,
        before: Option<Vec<ActivityItemSource>>,
    ) -> Result<(), ActivityError> {
        let metadata = super::super::residency::MetadataBefore::capture_item(state, key)?;
        if let Some(before) = before {
            *state
                .items
                .get_mut(key)
                .ok_or(ActivityError::InvalidStructure)? = before;
        } else {
            state.items.shift_remove(key);
        }
        state.settle_item_metadata(metadata, key, &mut self.reservation)
    }
}
