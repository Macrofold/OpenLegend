//! The open inventory asks for its own exact page. Stream projections and
//! shortcut updates do not prepare descriptions or equipment commands.
use super::{PlayerScenePolicy, PublicArt};
use crate::{authority::RequestScope, language::LanguageProvider};
use axum::body::Bytes;
use openlegend_simulation::{
    encoding::{js_trim, json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    install::{DirectInventory, OwnedItem, equipment_ports_conflict},
    text::JsText,
};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::LazyLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InventoryPageRequest {
    container_id: Option<String>,
    cursor: Option<String>,
    query: Option<String>,
    merge_source_id: Option<String>,
    #[serde(default)]
    sort: Sort,
    #[serde(default)]
    filter: Filter,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum Sort {
    #[default]
    Native,
    NameAsc,
    NameDesc,
    QuantityDesc,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum Filter {
    #[default]
    All,
    Equipped,
    Containers,
}

impl InventoryPageRequest {
    pub(crate) fn accepts(&self, actor: &str) -> bool {
        self.container_id.as_deref().is_none_or(|id| id == actor)
            && self.merge_source_id.is_none()
            && self
                .query
                .as_ref()
                .is_none_or(|query| query.encode_utf16().count() <= 160)
            && self.cursor.as_ref().is_none_or(|cursor| cursor.len() <= 96)
    }
}

pub(crate) enum InventoryPageError {
    Stale,
    Capacity,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EquipmentCopy {
    equip_label: String,
    unequip_label: String,
    busy: String,
    control_required: String,
    incompatible: String,
    single_lot: String,
    held_at: String,
}

static COPY: LazyLock<EquipmentCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/worlds/base/equipment-copy.json"
    ))
    .expect("authored equipment language")
});

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Item<'a> {
    #[serde(flatten)]
    lot: OwnedItem<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    art: Option<&'a PublicArt>,
    category: &'static str,
    description: &'a JsText,
    tags: &'a [JsText],
    actions: Vec<Action<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    characteristics: Option<[HeldPlacement; 1]>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    equipment_conflicts: Vec<EquipmentConflict<'a>>,
}

#[derive(Serialize)]
struct EquipmentConflict<'a> {
    id: &'a str,
    #[serde(flatten)]
    named: &'a openlegend_simulation::state::Named,
    characteristics: [HeldPlacement; 1],
}

#[derive(Serialize)]
struct HeldPlacement {
    id: &'static str,
    label: &'static str,
    value: String,
}

fn held_placement(
    inventory: &DirectInventory<'_>,
    ports: &[String],
    custody: &mut ByteReservation,
) -> Result<HeldPlacement, InventoryPageError> {
    use InventoryPageError::Capacity;
    let label = |port: &String| {
        inventory
            .body_ports
            .iter()
            .find(|p| p.id == *port)
            .map(|p| p.label.as_str())
    };
    let bytes = ports
        .iter()
        .try_fold(0_usize, |sum, port| sum.checked_add(label(port)?.len() + 3));
    let size = bytes.unwrap_or(COPY.incompatible.len());
    custody
        .resize(custody.bytes().checked_add(size).ok_or(Capacity)?)
        .map_err(|_| Capacity)?;
    let value = if let Some(bytes) = bytes {
        let mut value = String::with_capacity(bytes);
        for port in ports {
            if !value.is_empty() {
                value.push_str(" + ");
            }
            value.push_str(label(port).ok_or(Capacity)?);
        }
        value
    } else {
        COPY.incompatible.clone()
    };
    Ok(HeldPlacement {
        id: "held-placement",
        label: &COPY.held_at,
        value,
    })
}

#[derive(Serialize)]
struct Action<'a> {
    id: String,
    label: &'a str,
    command: ItemCommand<'a>,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ItemCommand<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    item_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    placement_revision: Option<u64>,
}

#[derive(Serialize)]
struct Root<'a> {
    id: &'a str,
    name: &'a JsText,
    revision: u64,
}

#[derive(Serialize)]
struct Page<'a> {
    ok: bool,
    container: Root<'a>,
    breadcrumbs: [Root<'a>; 1],
    items: Vec<Item<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<String>,
}

impl PlayerScenePolicy {
    pub(crate) fn encode_inventory_page(
        &self,
        inventory: DirectInventory<'_>,
        scope: &RequestScope,
        controlling: bool,
        input: InventoryPageRequest,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> Result<Bytes, InventoryPageError> {
        use InventoryPageError::{Capacity, Stale};
        let _cursor = budget.reserve(4096).map_err(|_| Capacity)?;
        let query = JsText::from(input.query.as_deref().map_or("", js_trim)).lowercase();
        let key = json_record(&(
            scope,
            inventory.revision,
            &query,
            &input.sort,
            &input.filter,
        ))
        .map_err(|_| Capacity)?;
        let cut = sha256_hex(key.as_bytes());
        let after: usize = if let Some(cursor) = input.cursor.as_deref() {
            let (expected, count) = cursor.rsplit_once('.').ok_or(Stale)?;
            if expected != cut {
                return Err(Stale);
            }
            count.parse().map_err(|_| Stale)?
        } else {
            0
        };
        let count = inventory.items.len();
        let order_funding = match input.sort {
            Sort::Native => 0,
            Sort::QuantityDesc => count.checked_mul(2 * size_of::<usize>()).ok_or(Capacity)?,
            Sort::NameAsc | Sort::NameDesc => inventory
                .items
                .iter()
                .try_fold(0_usize, |sum, item| {
                    sum.checked_add(size_of::<JsText>() + 8 * size_of::<usize>())?
                        .checked_add(item.item.named.name.storage_bytes().checked_mul(6)?)
                })
                .ok_or(Capacity)?,
        };
        let mut custody = budget.reserve(order_funding).map_err(|_| Capacity)?;
        let order = if matches!(input.sort, Sort::Native) {
            None
        } else {
            let mut order: Vec<_> = (0..count).collect();
            if matches!(input.sort, Sort::QuantityDesc) {
                order.sort_by_key(|index| std::cmp::Reverse(inventory.items[*index].item.quantity))
            } else {
                let names: Vec<_> = inventory
                    .items
                    .iter()
                    .map(|item| item.item.named.name.clone())
                    .collect();
                let (sorted, groups) = language.collate(&names).map_err(|_| Capacity)?;
                let mut ranks = vec![0; count];
                for (index, rank) in sorted.into_iter().zip(groups) {
                    ranks[index as usize] = rank;
                }
                if matches!(input.sort, Sort::NameDesc) {
                    order.sort_by_key(|index| std::cmp::Reverse(ranks[*index]));
                } else {
                    order.sort_by_key(|index| ranks[*index]);
                }
            }
            Some(order)
        };
        if after > count {
            return Err(Stale);
        }
        let equipped_count = inventory
            .items
            .iter()
            .filter(|entry| entry.item.equipped)
            .count();
        let _equipped = budget
            .reserve(
                equipped_count
                    .checked_mul(size_of::<&OwnedItem<'_>>())
                    .ok_or(Capacity)?,
            )
            .map_err(|_| Capacity)?;
        let mut equipped: Vec<&OwnedItem<'_>> = Vec::with_capacity(equipped_count);
        equipped.extend(
            inventory
                .items
                .iter()
                .filter(|entry| entry.item.equipped)
                .map(|entry| &entry.item),
        );
        let blank = JsText::default();
        let query: Vec<u16> = query.units().collect();
        let mut items = Vec::new();
        let mut checked = after;
        for position in (after..count).take(200) {
            if items.len() == 40 {
                break;
            }
            checked += 1;
            let index = order.as_ref().map_or(position, |order| order[position]);
            let entry = &inventory.items[index];
            let _query_work = if query.is_empty() {
                None
            } else {
                Some(
                    budget
                        .reserve(6 * entry.item.named.name.storage_bytes())
                        .map_err(|_| Capacity)?,
                )
            };
            if (matches!(input.filter, Filter::Equipped) && !entry.item.equipped)
                || (matches!(input.filter, Filter::Containers) && entry.item.container.is_none())
                || (!query.is_empty()
                    && !entry
                        .item
                        .named
                        .name
                        .lowercase()
                        .units()
                        .collect::<Vec<_>>()
                        .windows(query.len())
                        .any(|part| part == query.as_slice()))
            {
                continue;
            }
            custody
                .resize(
                    custody
                        .bytes()
                        .checked_add(
                            2 * size_of::<Item<'_>>()
                                + 4 * size_of::<Action<'_>>()
                                + entry.item.id.len()
                                + 16,
                        )
                        .ok_or(Capacity)?,
                )
                .map_err(|_| Capacity)?;
            let item = &entry.item;
            let mut actions: Vec<_> = entry
                .equipment_ports
                .map(|_| {
                    let (kind, label) = if item.equipped {
                        ("unequip", COPY.unequip_label.as_str())
                    } else {
                        ("equip", COPY.equip_label.as_str())
                    };
                    let reason = if !controlling {
                        Some(COPY.control_required.as_str())
                    } else if !inventory.can_act {
                        Some(COPY.busy.as_str())
                    } else if item.quantity != 1 {
                        Some(COPY.single_lot.as_str())
                    } else if !entry.equipment_fits {
                        Some(COPY.incompatible.as_str())
                    } else {
                        None
                    };
                    Action {
                        id: format!("{kind}-{}", item.id),
                        label,
                        enabled: reason.is_none(),
                        command: ItemCommand {
                            kind,
                            item_id: item.id,
                            expected_revision: item.equipped.then_some(item.revision),
                            placement_revision: item.equipped.then_some(item.placement_revision),
                        },
                        reason,
                    }
                })
                .into_iter()
                .collect();
            if let Some(eating) = &entry.eating {
                custody.resize(custody.bytes().checked_add(item.id.len() + 4).ok_or(Capacity)?)
                    .map_err(|_| Capacity)?;
                let reason = if controlling { eating.reason } else { Some(COPY.control_required.as_str()) };
                actions.push(Action {
                    id: format!("eat-{}", item.id),
                    label: eating.label,
                    enabled: reason.is_none(),
                    reason,
                    command: ItemCommand {
                        kind: "eat",
                        item_id: item.id,
                        expected_revision: None,
                        placement_revision: None,
                    },
                });
            }
            let mut equipment_conflicts = Vec::new();
            let characteristics = if let Some(ports) = entry.equipment_ports {
                if !item.equipped {
                    for other in equipped
                        .iter()
                        .copied()
                        .filter(|other| equipment_ports_conflict(other.equipment_ports, ports))
                    {
                        custody
                            .resize(
                                custody
                                    .bytes()
                                    .checked_add(4 * size_of::<EquipmentConflict<'_>>())
                                    .ok_or(Capacity)?,
                            )
                            .map_err(|_| Capacity)?;
                        equipment_conflicts.push(EquipmentConflict {
                            id: other.id,
                            named: other.named,
                            characteristics: [held_placement(
                                &inventory,
                                other.equipment_ports,
                                &mut custody,
                            )?],
                        });
                    }
                }
                Some([held_placement(&inventory, ports, &mut custody)?])
            } else {
                None
            };
            items.push(Item {
                lot: *item,
                art: self.observed.item_art.get(item.definition_id),
                category: entry.category,
                description: entry.description.unwrap_or(&blank),
                tags: entry.properties,
                actions,
                characteristics,
                equipment_conflicts,
            });
        }
        let root = || Root {
            id: inventory.id,
            name: inventory.name,
            revision: inventory.revision,
        };
        // Commands remain subject to a fresh control and physical check.
        // Unsupported item actions are an empty list, as required by the browser.
        crate::wire::encode(
            &Page {
                ok: true,
                container: root(),
                breadcrumbs: [root()],
                items,
                next: (checked < count).then(|| format!("{cut}.{checked}")),
            },
            b"",
            b"",
            budget,
        )
        .map_err(|_| Capacity)
    }
}
