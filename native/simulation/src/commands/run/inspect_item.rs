//! An exact explicit read gains one private occurrence. Passive inventory
//! pages, possession changes and preview never select story evidence.

use super::inspect_storage::PreparedStorage;
use super::*;
use crate::{
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    ground_items::inspection::{WorldStorage, owned},
    host::retained_size::{HeapBytes, heap_sum},
    reception::{EncounterExposure, EventScalar, ObservedItemLocation, VersionedFamily},
    state::{Individuality, InventoryInspection, Named},
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
        let Some(actor_body) = state.physical.entities.get(actor) else {
            return Err(ExecutionError::MissingActor);
        };
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
        let bag = if parent.id == actor {
            None
        } else {
            let definition = parent
                .item
                .as_ref()
                .and_then(|item| definition_set.items.get(&item.definition_pin.id))
                .ok_or(ExecutionError::Invariant)?;
            Some(&definition.named)
        };
        let Some(prepared) = prepare_item_evidence(
            state,
            actor,
            body,
            lot,
            ItemPlace::Possession(bag.map(|name| &name.name)),
            &self.budget,
        )?
        else {
            self.refuse_inspection()?;
            return Ok(None);
        };
        if definition_set
            .items
            .get(lot.definition_id)
            .is_some_and(|definition| definition.recipe_record.is_some())
        {
            let Some((scope, mut custody)) = owned::scope(state, actor, &parent.id, &self.budget)?
            else {
                self.refuse_inspection()?;
                return Ok(None);
            };
            let Some(EncounterExposure::InventoryItem { description, .. }) =
                prepared.intent.exposure.as_ref()
            else {
                return Err(ExecutionError::Invariant);
            };
            custody.resize(
                heap_sum([
                    custody.bytes(),
                    4096,
                    parent.id.len(),
                    body.id.len() * 2,
                    lot.named.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    bag.map_or_else(
                        || {
                            heap_sum([
                                parent.name.storage_bytes(),
                                parent.name_form.as_ref().map_or(0, String::len),
                                parent.indefinite_article.as_ref().map_or(0, String::len),
                            ])
                        },
                        HeapBytes::heap_bytes,
                    )
                    .ok_or(ExecutionError::Capacity)?,
                    description
                        .storage_bytes()
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut summary = JsText::from(": ");
            summary.push_text(description);
            let page = InventoryInspection {
                revision: selected.expected_revision,
                scope,
                container_id: Some(parent.id.clone()),
                container_name: bag.cloned().unwrap_or_else(|| Named {
                    name: parent.name.clone(),
                    name_form: parent.name_form.clone(),
                    indefinite_article: parent.indefinite_article.clone(),
                }),
                after: body.id.clone(),
                more: false,
                item_ids: vec![body.id.clone()],
                item_names: vec![lot.named.clone()],
                evidence_ids: Vec::with_capacity(2),
            };
            self.storage_inspection = Some(PreparedStorage::owned_record(
                page, custody, prepared, summary,
            ));
            self.phase = Phase::StoragePage;
            return Ok(None);
        }
        // Ordinary owned details record a private fact without requiring a
        // page. Keep the previously opened world storage under its original
        // inspection fences so selecting the source cannot close its destination.
        let world_page = actor_body
            .actor
            .as_ref()
            .and_then(|actor| actor.inventory_inspection.as_ref())
            .and_then(|page| page.container_id.as_deref())
            .is_some_and(|root| WorldStorage::selected(state, actor, root).is_some());
        if !world_page {
            core.physical().clear_inventory_inspection(actor)?;
        }
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

pub(super) fn prepare_item_evidence(
    state: &crate::simulation::SimulationState,
    actor: &str,
    body: &crate::state::Entity,
    lot: crate::install::OwnedItem<'_>,
    place: ItemPlace<'_>,
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
    // A place report needs its own exact evidence and remains outside this read.
    if facts.place_report.is_some() {
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
