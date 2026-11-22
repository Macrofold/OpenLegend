//! An exact explicit read gains one private occurrence. Passive inventory
//! pages, possession changes and preview never select story evidence.

use super::*;
use crate::{
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    host::retained_size::heap_sum,
    reception::{EncounterExposure, EventScalar, ObservedItemLocation, VersionedFamily},
    state::Individuality,
    text::JsText,
};
use indexmap::IndexMap;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
struct Copy {
    carried: &'static str,
    equipped: &'static str,
    inspect: &'static str,
    properties: &'static str,
    edible: &'static str,
    melee: &'static str,
    written: &'static str,
    changed: &'static str,
    inspected: &'static str,
}

static COPY: LazyLock<Copy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/inventory-inspection-copy.json"
    ))
    .expect("repository-owned inventory wording")
});

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdditionalFacts {
    mechanism_fields: Option<IndexMap<String, IndexMap<String, f64>>>,
    inscription: Option<JsText>,
    melee: Option<serde::de::IgnoredAny>,
    place_report: Option<serde::de::IgnoredAny>,
    recipe_record: Option<serde::de::IgnoredAny>,
}

impl CommandCursor {
    pub(super) fn inspect_item(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::InspectInventory {
            selected: Some(selected),
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let owner = state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let definition_set = &state.installed.retained;
        let item = (selected.container_id == actor
            && selected.expected_revision == owner.inventory_revision.unwrap_or(0))
        .then(|| state.physical.entities.get(&selected.item_id))
        .flatten()
        .filter(|entity| crate::install::inventory_parent(entity) == Some(actor));
        let item = if let Some(item) = item {
            crate::install::owned_by(&state.physical, definition_set, actor, &item.id)?
                .map(|read| (item, read))
        } else {
            None
        };
        let Some((body, lot)) = item else {
            self.reserve(COPY.changed.len() + 64)?;
            self.outcome = Some(outcome(false, "inspection-unavailable", COPY.changed));
            self.phase = Phase::Done;
            return Ok(None);
        };
        if self.options.preview || self.preparation_mode.is_some() {
            self.reserve(COPY.inspected.len() + 64)?;
            self.outcome = Some(outcome(true, "available", COPY.inspected));
            self.phase = Phase::Done;
            return Ok(None);
        }
        let item = body.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let definition = definition_set
            .items
            .get(lot.definition_id)
            .ok_or(ExecutionError::Invariant)?;
        let raw = definition_set
            .item_definitions
            .get(lot.definition_id)
            .ok_or(ExecutionError::Invariant)?;
        let _decode = self.budget.reserve(
            crate::experience::encoded_body_bound(raw).map_err(|_| ExecutionError::Capacity)?,
        )?;
        let facts: AdditionalFacts =
            serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
        if facts.place_report.is_some() || facts.recipe_record.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let mut workspace = self.budget.reserve(
            heap_sum([
                8192,
                actor.len() * 4,
                body.id.len() * 4,
                definition.pin.id.len() * 4,
                definition.named.name.storage_bytes(),
                definition
                    .description
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                definition
                    .properties
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                facts
                    .inscription
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                facts
                    .mechanism_fields
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .and_then(|bytes| bytes.checked_mul(6))
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut description = JsText::from(format!("{} × ", lot.quantity));
        description.push_text(&lot.named.name);
        if lot.equipped {
            description.push_str(COPY.equipped);
        } else {
            description.push_str(", ");
            description.push_str(COPY.carried);
        }
        description.push_str(". ");
        let mut has_fact = false;
        let mut append = |text: &JsText| {
            if !text.is_empty() {
                if has_fact {
                    description.push_str(" ");
                }
                description.push_text(text);
                has_fact = true;
            }
        };
        if let Some(text) = &definition.description {
            append(text);
        }
        if !definition.properties.is_empty() {
            let mut props = JsText::from(COPY.properties);
            for (index, value) in definition.properties.iter().enumerate() {
                if index != 0 {
                    props.push_str(", ");
                }
                props.push_text(value);
            }
            props.push_str(".");
            append(&props);
        }
        if let Some(value) = definition.nutrition.filter(|value| *value != 0.0) {
            append(&COPY.edible.replace("{quantity}", &value.to_string()).into());
        }
        if facts.melee.is_some() {
            append(&COPY.melee.into());
        }
        if let Some(words) = facts.inscription.as_ref().filter(|value| !value.is_empty()) {
            let (prefix, suffix) = COPY
                .written
                .split_once("{words}")
                .ok_or(ExecutionError::Invariant)?;
            description.push_str(prefix);
            description.push_text(words);
            description.push_str(suffix);
        }
        if description.utf8_len() > 8000 {
            self.reserve(COPY.changed.len() + 64)?;
            self.outcome = Some(outcome(false, "inspection-unavailable", COPY.changed));
            self.phase = Phase::Done;
            return Ok(None);
        }
        let mut text = JsText::from(COPY.inspect);
        text.push_text(&lot.named.name);
        text.push_str(" (");
        text.push_str(COPY.carried);
        text.push_str("). ");
        text.push_text(&description);
        let introduction_key = if item.individuality == Individuality::Individual {
            format!("inventory-item:{}", body.id)
        } else {
            format!("inventory-definition:{}", definition.pin.id)
        };
        let intent = EventEmissionIntent {
            event_type: "encounter".into(),
            text: EmissionText::Literal(text),
            audience: AudienceSelection::Explicit(vec![actor.to_owned()]),
            source_id: Some(actor.to_owned()),
            target_id: Some(body.id.clone()),
            data: Some(IndexMap::from([
                ("acquisition".into(), EventScalar::Boolean(true)),
                ("change".into(), EventScalar::Text("onset".into())),
                (
                    "importance".into(),
                    EventScalar::Number(state.installed.cognition.recording.exposure_importance),
                ),
                ("urgency".into(), EventScalar::Number(0.0)),
            ])),
            scope: EventScope::Private,
            origin: None,
            exposure: Some(EncounterExposure::InventoryItem {
                id: body.id.clone(),
                definition: VersionedFamily {
                    id: definition.pin.id.clone(),
                    version: definition.pin.version,
                },
                label: lot.named.name.clone(),
                description,
                introduction_key,
                inscription: facts.inscription,
                observed_location: Some(ObservedItemLocation::Possession {
                    label: COPY.carried.into(),
                }),
                mechanism_fields: facts.mechanism_fields,
            }),
        };
        let EmissionText::Literal(words) = &intent.text else {
            return Err(ExecutionError::Invariant);
        };
        workspace.resize(
            heap_sum([
                1024,
                actor.len() * 2,
                body.id.len(),
                words.storage_bytes(),
                intent
                    .exposure
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                intent.data.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        self._reservation.merge(workspace)?;
        let event = core.stage_event(intent)?;
        self.reserve(event.id.len() + COPY.inspected.len() + 64)?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Done;
        self.outcome = Some(outcome(true, "inventory-inspected", COPY.inspected));
        Ok(Some(event))
    }
}
