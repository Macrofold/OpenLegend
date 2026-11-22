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
#[serde(rename_all = "camelCase")]
struct Copy {
    carried: &'static str,
    in_carried: &'static str,
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
        if state.physical.entities.get(actor).is_none() {
            return Err(ExecutionError::MissingActor);
        }
        let definition_set = &state.installed.retained;
        let item = state
            .physical
            .entities
            .get(&selected.container_id)
            .filter(|parent| {
                parent.inventory_revision.unwrap_or_default() == selected.expected_revision
            })
            .and_then(|parent| {
                state
                    .physical
                    .entities
                    .get(&selected.item_id)
                    .filter(|item| {
                        crate::install::inventory_parent(item) == Some(parent.id.as_str())
                    })
                    .map(|item| (parent, item))
            });
        let item = if let Some((parent, item)) = item {
            crate::install::owned_by(&state.physical, definition_set, actor, &item.id)?
                .map(|read| (parent, item, read))
        } else {
            None
        };
        let Some((parent, body, lot)) = item else {
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
        let bag_name = if parent.id == actor {
            None
        } else {
            let definition = parent
                .item
                .as_ref()
                .and_then(|item| definition_set.items.get(&item.definition_pin.id))
                .ok_or(ExecutionError::Invariant)?;
            Some(&definition.named.name)
        };
        let Some(prepared) = prepare_item_evidence(
            state,
            actor,
            body,
            lot,
            ItemPlace::Possession(bag_name),
            ItemInspection::Selected,
            &self.budget,
        )?
        else {
            self.refuse_inspection()?;
            return Ok(None);
        };
        self._reservation.merge(prepared.custody)?;
        let event = core.stage_event(prepared.intent)?;
        self.reserve(event.id.len() + COPY.inspected.len() + 64)?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Done;
        self.outcome = Some(outcome(true, "inventory-inspected", COPY.inspected));
        Ok(Some(event))
    }

    pub(super) fn refuse_inspection(&mut self) -> Result<(), ExecutionError> {
        self.reserve(COPY.changed.len() + 64)?;
        self.outcome = Some(outcome(false, "inspection-unavailable", COPY.changed));
        self.phase = Phase::Done;
        Ok(())
    }

    pub(super) fn finish_inspection(&mut self) -> Result<(), ExecutionError> {
        self.reserve(COPY.inspected.len() + 64)?;
        self.outcome = Some(outcome(true, "inventory-inspected", COPY.inspected));
        self.phase = Phase::Done;
        Ok(())
    }
}

pub(super) enum ItemPlace<'a> {
    Possession(Option<&'a JsText>),
    World {
        parent: &'a crate::state::Entity,
        label: &'a JsText,
    },
}
impl ItemPlace<'_> {
    fn label_bytes(&self) -> usize {
        match self {
            Self::Possession(name) => name.map_or(0, JsText::storage_bytes),
            Self::World { parent, label } => {
                label.storage_bytes()
                    + parent.id.len()
                    + parent
                        .world_support()
                        .map_or(0, |(_, support)| support.len())
            }
        }
    }

    fn materialize(self) -> Result<ObservedItemLocation, ExecutionError> {
        match self {
            Self::Possession(bag) => {
                let label = if let Some(bag) = bag {
                    let (prefix, suffix) = COPY
                        .in_carried
                        .split_once("{container}")
                        .ok_or(ExecutionError::Invariant)?;
                    JsText::concat(&[&prefix.into(), bag, &suffix.into()])
                } else {
                    COPY.carried.into()
                };
                Ok(ObservedItemLocation::Possession { label })
            }
            Self::World { parent, label } => Ok(ObservedItemLocation::World {
                point: parent
                    .supported_position()
                    .ok_or(ExecutionError::Invariant)?,
                label: label.clone(),
                container_id: parent.id.clone(),
            }),
        }
    }
}

pub(super) struct ItemEvidence {
    pub intent: EventEmissionIntent,
    pub custody: ByteReservation,
    pub description_bytes: usize,
}

pub(super) enum ItemInspection {
    Page,
    Selected,
}

pub(super) fn prepare_item_evidence(
    state: &crate::simulation::SimulationState,
    actor: &str,
    body: &crate::state::Entity,
    lot: crate::install::OwnedItem<'_>,
    place: ItemPlace<'_>,
    inspection: ItemInspection,
    budget: &ByteBudget,
) -> Result<Option<ItemEvidence>, ExecutionError> {
    let definition_set = &state.installed.retained;
    let item = body.item.as_ref().ok_or(ExecutionError::Invariant)?;
    let definition = definition_set
        .items
        .get(lot.definition_id)
        .ok_or(ExecutionError::Invariant)?;
    let raw = definition_set
        .item_definitions
        .get(lot.definition_id)
        .ok_or(ExecutionError::Invariant)?;
    let _decode = budget.reserve(
        crate::experience::encoded_body_bound(raw).map_err(|_| ExecutionError::Capacity)?,
    )?;
    let facts: AdditionalFacts =
        serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
    // The page records the item's ordinary description. Exact recipe reading
    // has its own action, while a place report also needs exposure on a page.
    if facts.place_report.is_some()
        || (matches!(inspection, ItemInspection::Selected) && definition.recipe_record.is_some())
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let mut workspace = budget.reserve(
        heap_sum([
            8192,
            actor.len() * 4,
            body.id.len() * 4,
            definition.pin.id.len() * 4,
            definition.named.name.storage_bytes(),
            place.label_bytes(),
            COPY.in_carried.len(),
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
    let location = place.materialize()?;
    let (label, at_world) = match &location {
        ObservedItemLocation::World { label, .. } => (label, true),
        ObservedItemLocation::Possession { label } => (label, false),
    };
    let mut description = JsText::from(format!("{} × ", lot.quantity));
    description.push_text(&lot.named.name);
    if lot.equipped {
        description.push_str(COPY.equipped);
    } else {
        description.push_str(", ");
        if at_world {
            description.push_str("at ");
        }
        description.push_text(label);
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
    let description_bytes = description.utf8_len();
    if description_bytes > crate::ground_items::inspection::PAGE_DESCRIPTION_BYTES {
        return Ok(None);
    }
    let mut text = JsText::from(COPY.inspect);
    text.push_text(&lot.named.name);
    if at_world {
        text.push_str(" at ");
        text.push_text(label);
        text.push_str(". ");
    } else {
        text.push_str(" (");
        text.push_text(label);
        text.push_str("). ");
    }
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
            observed_location: Some(location),
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
    Ok(Some(ItemEvidence {
        intent,
        custody: workspace,
        description_bytes,
    }))
}
