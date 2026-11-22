//! Item holds belong to the accepted action and the exact stock, not to a
//! command transport. Only outstanding holds remain resident. Changed and
//! settled bodies are saved from the same physical inverse journal.
//! See docs/maintainers/state-contributions.md#current-behavior.

use crate::execution::ExecutionError;
use crate::host::{
    ByteBudget, ByteReservation, ResidentReservation,
    retained_size::{HeapBytes, heap_record, heap_sum},
};
use crate::install::{
    ImportedCollection, InstallError, reserve_typed_parse, rows::validate_map_row,
};
use crate::records::OwnerCoverage;
use crate::state::EntityStore;
use crate::text::JsText;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, mem::size_of};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
enum ResourceRef {
    Attribute {
        entity_id: String,
        definition: DefinitionPin,
    },
    Replenisher {
        entity_id: String,
        definition: DefinitionPin,
    },
    Gathering {
        entity_id: String,
        definition: DefinitionPin,
    },
    Item {
        item_id: String,
        definition: DefinitionPin,
    },
}

impl ResourceRef {
    fn valid(&self) -> bool {
        let (id, definition) = match self {
            Self::Attribute {
                entity_id,
                definition,
            }
            | Self::Replenisher {
                entity_id,
                definition,
            }
            | Self::Gathering {
                entity_id,
                definition,
            } => (entity_id, definition),
            Self::Item {
                item_id,
                definition,
            } => (item_id, definition),
        };
        is_safe_record_id(id) && definition.is_valid()
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ClaimState {
    Held,
    Consumed,
    Released,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResourceReservation {
    pub(crate) id: String,
    invocation_id: String,
    actor_id: String,
    resource: ResourceRef,
    pub(crate) amount: f64,
    #[serde(rename = "requestDigest")]
    request_digest: JsText,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) revision: u64,
    pub(crate) state: ClaimState,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    expires_at: Option<f64>,
}

heap_record!(ResourceReservation {
    id,
    invocation_id,
    actor_id,
    resource,
    request_digest
});

impl crate::host::retained_size::HeapBytes for ResourceRef {
    fn heap_bytes(&self) -> Option<usize> {
        let (id, definition) = match self {
            Self::Attribute {
                entity_id,
                definition,
            }
            | Self::Replenisher {
                entity_id,
                definition,
            }
            | Self::Gathering {
                entity_id,
                definition,
            } => (entity_id, definition),
            Self::Item {
                item_id,
                definition,
            } => (item_id, definition),
        };
        heap_sum([id.capacity(), definition.heap_bytes()?])
    }
}

pub(crate) struct HeldRecord {
    pub(crate) value: ResourceReservation,
    pub(crate) ordinal: u64,
    residency: ResidentReservation,
}

impl HeldRecord {
    pub(crate) fn retain(&self, budget: &ByteBudget) -> Result<ByteReservation, ExecutionError> {
        Ok(budget.reserve(self.residency.bytes())?)
    }

    pub(crate) fn item_id(&self) -> &str {
        self.stock().0
    }

    fn stock(&self) -> (&str, &DefinitionPin, u64) {
        let ResourceRef::Item {
            item_id,
            definition,
        } = &self.value.resource
        else {
            unreachable!("only checked item holds enter the active index")
        };
        (item_id, definition, self.value.amount as u64)
    }

    fn from_funded(
        value: ResourceReservation,
        ordinal: u64,
        mut workspace: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(String, Self), ExecutionError> {
        use crate::host::retained_size::HeapBytes;
        let (item, _) = match &value.resource {
            ResourceRef::Item {
                item_id,
                definition,
            } => (item_id, definition),
            _ => return Err(ExecutionError::UnsupportedFamily),
        };
        // Account the body and both ordered index entries before inserting.
        // Ongoing captures borrow none of this state after the world lane.
        let admitted = heap_sum([
            value.heap_bytes().ok_or(ExecutionError::Capacity)?,
            value.id.len(),
            item.len(),
            2 * size_of::<(String, HeldRecord)>(),
            2 * size_of::<(String, u64)>(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        workspace.resize(admitted)?;
        let key = value.id.clone();
        Ok((
            key,
            Self {
                value,
                ordinal,
                residency: budget.adopt_record(workspace)?,
            },
        ))
    }
}

pub(crate) struct ItemHolds {
    pub(crate) coverage: OwnerCoverage,
    rows: BTreeMap<String, HeldRecord>,
    quantities: BTreeMap<String, u64>,
}

impl ItemHolds {
    pub(crate) fn get(&self, id: &str) -> Option<&HeldRecord> {
        self.rows.get(id)
    }

    pub(crate) fn quantity(&self, item: &str) -> u64 {
        self.quantities.get(item).copied().unwrap_or_default()
    }

    pub(crate) fn work_allocation(&self) -> crate::values::WorkVector {
        crate::values::WorkVector {
            live: self.rows.len() as u64,
            // Record bodies have independently admitted actual RAM. Charge
            // active logical ownership here without retaining terminal rows.
            claims: self.rows.len() as u64,
            ..Default::default()
        }
    }

    pub(crate) fn put(&mut self, id: String, record: HeldRecord) -> Result<(), ExecutionError> {
        if self.rows.contains_key(&id) {
            return Err(ExecutionError::Invariant);
        }
        let (item, _, amount) = record.stock();
        let total = self
            .quantity(item)
            .checked_add(amount)
            .ok_or(ExecutionError::Invariant)?;
        if let Some(quantity) = self.quantities.get_mut(item) {
            *quantity = total;
        } else {
            self.quantities.insert(item.to_owned(), total);
        }
        self.rows.insert(id, record);
        Ok(())
    }

    pub(crate) fn remove(&mut self, id: &str) -> Result<(String, HeldRecord), ExecutionError> {
        let (key, row) = self
            .rows
            .remove_entry(id)
            .ok_or(ExecutionError::Invariant)?;
        let (item, _, amount) = row.stock();
        let value = self
            .quantities
            .get_mut(item)
            .ok_or(ExecutionError::Invariant)?;
        *value = value.checked_sub(amount).ok_or(ExecutionError::Invariant)?;
        if *value == 0 {
            self.quantities.remove(item);
        }
        Ok((key, row))
    }

    pub(crate) fn matches(
        &self,
        actor: &str,
        action: &str,
        index: usize,
        stone: &crate::hearth::Stone,
        definition: &DefinitionPin,
    ) -> bool {
        self.rows
            .get(&hearth_hold_id(action, index))
            .is_some_and(|row| {
                let (item, pin, amount) = row.stock();
                (item, pin, amount) == (&*stone.item_id, definition, stone.quantity)
                    && row.value.state == ClaimState::Held
                    && row.value.actor_id == actor
                    && row.value.invocation_id == action
            })
    }
}

pub(crate) fn hearth_hold_id(action_id: &str, index: usize) -> String {
    format!("{action_id}:hearth-input:{index}")
}

pub(crate) fn prepare_hold(
    actor_id: &str,
    invocation_id: &str,
    index: usize,
    stone: &crate::hearth::Stone,
    definition: &DefinitionPin,
    lot_revision: u64,
    ordinal: u64,
    budget: &ByteBudget,
) -> Result<(String, HeldRecord), ExecutionError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ClaimRequest<'a> {
        actor_id: &'a str,
        amount: u64,
        expected_revision: u64,
        id: &'a str,
        invocation_id: &'a str,
        resource: SortedResource<'a>,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct SortedResource<'a> {
        definition: SortedDefinition<'a>,
        item_id: &'a str,
        kind: &'static str,
    }
    #[derive(Serialize)]
    struct SortedDefinition<'a> {
        digest: &'a str,
        id: &'a str,
        version: u64,
    }
    let workspace = budget.reserve(
        512 + 6
            * (actor_id.len()
                + invocation_id.len()
                + stone.item_id.len()
                + definition.id.len()
                + definition.digest.len()),
    )?;
    let id = hearth_hold_id(invocation_id, index);
    if !is_safe_record_id(&id) {
        return Err(ExecutionError::Invariant);
    }
    let resource = ResourceRef::Item {
        item_id: stone.item_id.clone(),
        definition: definition.clone(),
    };
    let request_digest = crate::encoding::json_record(&ClaimRequest {
        id: &id,
        invocation_id,
        actor_id,
        amount: stone.quantity,
        expected_revision: lot_revision,
        resource: SortedResource {
            definition: SortedDefinition {
                digest: &definition.digest,
                id: &definition.id,
                version: definition.version,
            },
            item_id: &stone.item_id,
            kind: "item",
        },
    })
    .map_err(|_| ExecutionError::Invariant)?;
    HeldRecord::from_funded(
        ResourceReservation {
            id,
            invocation_id: invocation_id.into(),
            actor_id: actor_id.into(),
            resource,
            amount: stone.quantity as f64,
            request_digest: request_digest.into(),
            revision: 1,
            state: ClaimState::Held,
            expires_at: None,
        },
        ordinal,
        workspace,
        budget,
    )
}

/// Load only exact outstanding selected claims. Terminal row identity remains
/// in the durable record ledger; the former actors/materials may no longer exist.
pub(crate) fn install(
    reservations: ImportedCollection,
    entities: &EntityStore,
    budget: &ByteBudget,
) -> Result<ItemHolds, InstallError> {
    let mut holds = ItemHolds {
        coverage: reservations.coverage,
        rows: BTreeMap::new(),
        quantities: BTreeMap::new(),
    };
    let next = holds.coverage.next_ordinal;
    for row in reservations.rows {
        validate_map_row(&row, "[\"world\"]", "resourceReservations", &row.slot, next)?;
        let funding = reserve_typed_parse::<ResourceReservation>(&row.payload, 0, None, budget)?;
        let value: ResourceReservation =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        if value.id != row.slot
            || !row.extra.is_empty()
            || ![&value.id, &value.invocation_id, &value.actor_id]
                .into_iter()
                .all(|id| is_safe_record_id(id))
            || !value.resource.valid()
            || !value.amount.is_finite()
            || value.amount < 0.0
            || value.revision == 0
            || value
                .expires_at
                .is_some_and(|at| !at.is_finite() || at < 0.0)
        {
            return Err(InstallError::CurrentFormat);
        }
        if value.state != ClaimState::Held {
            continue;
        }
        let (
            ResourceRef::Item {
                item_id,
                definition,
            },
            None,
        ) = (&value.resource, value.expires_at)
        else {
            return Err(InstallError::UnsupportedFamily(
                "active resource reservation",
            ));
        };
        let Some(actor) = entities
            .get(&value.actor_id)
            .filter(|entity| entity.retirement.is_none())
            .and_then(|entity| entity.actor.as_ref())
            .filter(|actor| actor.alive)
        else {
            return Err(InstallError::CurrentFormat);
        };
        let Some(action) = actor
            .action
            .as_ref()
            .filter(|action| action.id == value.invocation_id)
        else {
            return Err(InstallError::CurrentFormat);
        };
        let Some(work) = action.hearth_work.as_ref() else {
            return Err(InstallError::UnsupportedFamily(
                "active resource reservation",
            ));
        };
        let lot = entities
            .get(item_id)
            .and_then(|entity| entity.item.as_ref())
            .ok_or(InstallError::CurrentFormat)?;
        if lot.definition_pin != *definition
            || value.amount <= 0.0
            || value.amount.fract() != 0.0
            || value.amount > (lot.quantity.saturating_sub(holds.quantity(item_id))) as f64
            || value.revision != 1
            || !work.stones.iter().enumerate().any(|(index, stone)| {
                stone.item_id == *item_id
                    && stone.quantity as f64 == value.amount
                    && value.id == hearth_hold_id(&action.id, index)
            })
        {
            return Err(InstallError::CurrentFormat);
        }
        let (id, active) = HeldRecord::from_funded(value, row.position, funding, budget)
            .map_err(|_| InstallError::Capacity)?;
        holds
            .put(id, active)
            .map_err(|_| InstallError::CurrentFormat)?;
    }
    Ok(holds)
}
