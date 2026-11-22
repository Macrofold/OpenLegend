//! The open inventory asks for its own exact page. Stream projections and
//! shortcut updates do not prepare descriptions or equipment commands.
use super::{PlayerScenePolicy, PublicArt};
use crate::{
    authority::RequestScope, language::LanguageProvider,
    player_references::{InventoryGroupClaim, ReferenceIssuer},
};
use axum::body::Bytes;
use openlegend_simulation::{
    encoding::{js_trim, json_record, sha256_hex},
    host::{ByteBudget, ByteReservation},
    install::{MaterialCondition, OwnedItem, equipment_ports_conflict},
    runtime::{
        DirectInventory, InspectedRecipeRecord, InventoryContainer, InventoryCrumb, RuntimeError,
    },
    text::JsText,
};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::LazyLock};

mod world_storage;
use super::self_view::recipes::{InspectedRecipe, Recipe};
use world_storage::{learn_action, recipe_stock};

#[derive(Serialize)]
struct RecipeRecord {
    #[serde(skip_serializing_if = "Option::is_none")]
    method: Option<InspectedRecipe>,
    message: &'static str,
}

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
    pub(crate) fn accepts(&self) -> bool {
        self.container_id
            .as_deref()
            .is_none_or(openlegend_simulation::values::is_safe_record_id)
            && self.merge_source_id.as_deref().is_none_or(|id| {
                openlegend_simulation::values::is_safe_record_id(id)
                    && matches!(self.sort, Sort::Native)
                    && matches!(self.filter, Filter::All)
                    && self.container_id.as_deref().is_none_or(|id| !id.starts_with("contact-"))
            })
            && self
                .query
                .as_ref()
                .is_none_or(|query| query.encode_utf16().count() <= 160)
            && self.cursor.as_ref().is_none_or(|cursor| cursor.len() <= 96)
    }

    pub(crate) fn container(&self) -> Option<&str> {
        self.container_id.as_deref()
    }

    pub(crate) fn continued(&self) -> bool {
        self.cursor.is_some()
    }
}

pub(crate) enum InventoryPageError {
    Stale,
    Capacity,
    Read(RuntimeError),
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArrangementCopy {
    split_label: String,
    busy: String,
}

static ARRANGEMENT_COPY: LazyLock<ArrangementCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/worlds/base/item-move-copy.json"
    ))
    .expect("authored item arrangement language")
});

static COPY: LazyLock<EquipmentCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/worlds/base/equipment-copy.json"
    ))
    .expect("authored equipment language")
});

/// Return each input's locale-equivalence rank so the existing custody order
/// remains stable for ties in either direction. The caller funds the list.
fn collation_ranks(language: &LanguageProvider, names: &[JsText]) -> Result<Vec<u32>, InventoryPageError> {
    let (sorted, groups) = language.collate(names).map_err(|_| InventoryPageError::Capacity)?;
    let mut ranks = vec![0; names.len()];
    for (index, rank) in sorted.into_iter().zip(groups) {
        ranks[index as usize] = rank;
    }
    Ok(ranks)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Item<'a> {
    #[serde(flatten)]
    lot: OwnedItem<'a>,
    individual: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    art: Option<&'a PublicArt>,
    category: &'static str,
    description: &'a JsText,
    tags: &'a [JsText],
    #[serde(skip_serializing_if = "Option::is_none")]
    material_condition: Option<MaterialCondition<'a>>,
    actions: Vec<Action<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    characteristics: Option<[HeldPlacement; 1]>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    equipment_conflicts: Vec<EquipmentConflict<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipe_record: Option<RecipeRecord>,
    #[serde(skip_serializing_if = "Option::is_none")]
    group: Option<DisplayGroup>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplayGroup {
    token: String,
    members: usize,
    representative_quantity: u64,
    representative_available_quantity: u64,
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
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    placement_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quantity: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    record_pin: Option<&'a openlegend_simulation::values::DefinitionPin>,
    #[serde(skip_serializing_if = "Option::is_none")]
    inventory_group: Option<String>,
}

#[derive(Serialize)]
struct Root<'a> {
    #[serde(flatten)]
    source: InventoryCrumb<'a>,
    #[serde(flatten)]
    container: Option<InventoryContainer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    location: Option<JsText>,
}

#[derive(Serialize)]
struct Page<'a> {
    ok: bool,
    container: Root<'a>,
    breadcrumbs: &'a [InventoryCrumb<'a>],
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
        input: &InventoryPageRequest,
        language: &LanguageProvider,
        references: &ReferenceIssuer,
        budget: &ByteBudget,
    ) -> Result<Bytes, InventoryPageError> {
        use InventoryPageError::{Capacity, Read, Stale};
        let path_bytes = inventory
            .breadcrumbs
            .iter()
            .try_fold(4096_usize, |sum, part| sum.checked_add(part.id.len() + 128))
            .ok_or(Capacity)?;
        let _cursor = budget.reserve(path_bytes).map_err(|_| Capacity)?;
        let path_cut = inventory
            .breadcrumbs
            .iter()
            .map(|part| {
                (
                    part.id,
                    part.revision,
                    part.placement_revision,
                    part.subtree_revision,
                )
            })
            .collect::<Vec<_>>();
        let root = *inventory.breadcrumbs.last().ok_or(Stale)?;
        let groups = input.merge_source_id.is_none()
            .then(|| inventory.display_groups(budget)).transpose().map_err(Read)?;
        let group_rows = groups.as_ref().map(|groups| groups.rows());
        let scope_key = scope.key().map_err(|_| Capacity)?;
        let child = |index: usize| group_rows.map_or(index, |rows| rows[index].first());
        let count = group_rows.map_or_else(|| inventory.count(), |rows| rows.len());
        let quantity = |index: usize| group_rows.map_or_else(|| inventory.quantity(index), |rows| Ok(rows[index].quantity));
        let query = JsText::from(input.query.as_deref().map_or("", js_trim)).lowercase();
        let key = json_record(&(scope, path_cut, groups.as_ref().map(|groups| groups.cut()), &query, &input.sort, &input.filter, &input.merge_source_id))
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
        if after > count {
            return Err(Stale);
        }
        let merge = input.merge_source_id.as_deref().map(|id| {
            inventory.merge_source(id).map_err(Read)?.ok_or(Stale)
        }).transpose()?;
        let order_funding = match input.sort {
            Sort::Native => 0,
            Sort::QuantityDesc => count.checked_mul(4 * size_of::<usize>()).ok_or(Capacity)?,
            Sort::NameAsc | Sort::NameDesc => {
                let mut bytes = 0_usize;
                for index in 0..count {
                    let name = inventory.name(child(index)).map_err(Read)?;
                    bytes = bytes
                        .checked_add(size_of::<JsText>() + 8 * size_of::<usize>())
                        .and_then(|base| base.checked_add(name.storage_bytes().checked_mul(6)?))
                        .ok_or(Capacity)?;
                }
                bytes
            }
        };
        let mut custody = budget.reserve(order_funding).map_err(|_| Capacity)?;
        let order = match input.sort {
            Sort::Native => None,
            Sort::QuantityDesc => {
                let mut ranks = (0..count)
                    .map(|index| {
                        quantity(index)
                            .map(|quantity| (index, quantity))
                            .map_err(Read)
                    })
                    .collect::<Result<Vec<_>, _>>()?;
                ranks.sort_by_key(|(_, quantity)| std::cmp::Reverse(*quantity));
                Some(
                    ranks
                        .into_iter()
                        .map(|(index, _)| index)
                        .collect::<Vec<_>>(),
                )
            }
            Sort::NameAsc | Sort::NameDesc => {
                let mut order: Vec<_> = (0..count).collect();
                let names = (0..count)
                    .map(|index| inventory.name(child(index)).cloned().map_err(Read))
                    .collect::<Result<Vec<_>, _>>()?;
                let ranks = collation_ranks(language, &names)?;
                if matches!(input.sort, Sort::NameDesc) {
                    order.sort_by_key(|index| std::cmp::Reverse(ranks[*index]));
                } else {
                    order.sort_by_key(|index| ranks[*index]);
                }
                Some(order)
            }
        };
        let _equipped = budget
            .reserve(
                inventory
                    .equipped_count()
                    .checked_mul(size_of::<OwnedItem<'_>>())
                    .ok_or(Capacity)?,
            )
            .map_err(|_| Capacity)?;
        let equipped = inventory
            .equipped()
            .collect::<Result<Vec<_>, _>>()
            .map_err(Read)?;
        let blank = JsText::default();
        let query: Vec<u16> = query.units().collect();
        let mut items = Vec::new();
        let mut checked = after;
        let selected_recipe = inventory.inspected_recipe(budget).map_err(Read)?;
        for position in (after..count).take(200) {
            if items.len() == 40 {
                break;
            }
            checked += 1;
            let position = order.as_ref().map_or(position, |order| order[position]);
            let index = child(position);
            if let Some(source) = &merge
                && !inventory.merge_matches(source, index).map_err(Read)?
            {
                continue;
            }
            let slot = inventory.slot(index).map_err(Read)?;
            let _query_work = if merge.is_some() || query.is_empty() {
                None
            } else {
                Some(
                    budget
                        .reserve(6 * slot.item.named.name.storage_bytes())
                        .map_err(|_| Capacity)?,
                )
            };
            if (matches!(input.filter, Filter::Equipped) && !slot.item.equipped)
                || (matches!(input.filter, Filter::Containers) && slot.item.container.is_none())
                || (merge.is_none() && !query.is_empty()
                    && !slot
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
            let group = group_rows.map(|rows| &rows[position]).filter(|group| group.members() > 1);
            let availability = group.map(|group| inventory.group_availability(group)).transpose().map_err(Read)?;
            let slot = match &availability {
                Some(available) if available.representative != index =>
                    inventory.slot(available.representative).map_err(Read)?,
                _ => slot,
            };
            let split = if merge.is_none() {
                inventory.split_offer(&slot).map_err(Read)?
            } else { None };
            let entry = inventory.describe(slot).map_err(Read)?;
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
            let mut lot = *item;
            let display_group = if let Some((group, availability)) = group.zip(availability) {
                // The two outgoing copies are the row and the existing Drop action.
                let token_bytes = (scope_key.len() + root.id.len() + 336).checked_mul(12).ok_or(Capacity)?;
                custody.resize(custody.bytes().checked_add(token_bytes).ok_or(Capacity)?).map_err(|_| Capacity)?;
                let token = references.seal_inventory_group(&InventoryGroupClaim {
                    scope: scope_key.as_str(),
                    container: root.id,
                    revision: root.revision,
                    key: group.key().ok_or(Stale)?,
                }).ok_or(Capacity)?;
                lot.quantity = group.quantity;
                lot.available_quantity = availability.available;
                Some(DisplayGroup {
                    token,
                    members: group.members(),
                    representative_quantity: item.quantity,
                    representative_available_quantity: if availability.available > 0 { item.available_quantity } else { 0 },
                })
            } else {
                None
            };
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
                            target_id: None,
                            target_revision: None,
                            expected_revision: item.equipped.then_some(item.revision),
                            placement_revision: item.equipped.then_some(item.placement_revision),
                            quantity: None,
                            record_pin: None,
                            inventory_group: None,
                        },
                        reason,
                    }
                })
                .into_iter()
                .collect();
            if let Some(eating) = &entry.eating {
                custody
                    .resize(
                        custody
                            .bytes()
                            .checked_add(item.id.len() + 4)
                            .ok_or(Capacity)?,
                    )
                    .map_err(|_| Capacity)?;
                let reason = if controlling {
                    eating.reason
                } else {
                    Some(COPY.control_required.as_str())
                };
                actions.push(Action {
                    id: format!("eat-{}", item.id),
                    label: eating.label,
                    enabled: reason.is_none(),
                    reason,
                    command: ItemCommand {
                        kind: "eat",
                        item_id: item.id,
                        target_id: None,
                        target_revision: None,
                        expected_revision: None,
                        placement_revision: None,
                        quantity: None,
                        record_pin: None,
                        inventory_group: None,
                    },
                });
            }
            if let Some(drop) = &entry.drop {
                custody
                    .resize(
                        custody
                            .bytes()
                            .checked_add(item.id.len() + 5)
                            .ok_or(Capacity)?,
                    )
                    .map_err(|_| Capacity)?;
                let reason = if controlling {
                    drop.reason
                } else {
                    Some(COPY.control_required.as_str())
                };
                actions.push(Action {
                    id: format!("drop-{}", item.id),
                    label: drop.label,
                    enabled: reason.is_none(),
                    reason,
                    command: ItemCommand {
                        kind: "drop",
                        item_id: item.id,
                        target_id: None,
                        target_revision: None,
                        expected_revision: None,
                        placement_revision: None,
                        quantity: Some(if display_group.is_some() { lot.available_quantity } else { item.quantity }),
                        record_pin: None,
                        inventory_group: display_group.as_ref().map(|group| group.token.clone()),
                    },
                });
            }
            if let Some(split) = split {
                custody.resize(
                    custody.bytes().checked_add(item.id.len() + 6).ok_or(Capacity)?,
                ).map_err(|_| Capacity)?;
                let reason = if controlling {
                    split.reason.or_else(|| split.in_use.then_some(ARRANGEMENT_COPY.busy.as_str()))
                } else {
                    Some(COPY.control_required.as_str())
                };
                actions.push(Action {
                    id: format!("split-{}", item.id),
                    label: &ARRANGEMENT_COPY.split_label,
                    enabled: reason.is_none(),
                    reason,
                    command: ItemCommand {
                        kind: "split-item",
                        item_id: item.id,
                        target_id: Some(split.parent.id),
                        target_revision: Some(split.parent.revision),
                        expected_revision: Some(item.revision),
                        placement_revision: Some(item.placement_revision),
                        quantity: Some(1),
                        record_pin: None,
                        inventory_group: None,
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
            let recipe_record = match selected_recipe
                .filter(|(id, _)| *id == item.id)
                .map(|(_, record)| record)
            {
                Some(InspectedRecipeRecord::Available {
                    recipe_id,
                    known,
                    record_pin,
                }) => {
                    let template = self.self_view.authored_recipe(recipe_id).ok_or_else(|| {
                        Read(RuntimeError::application_refused(
                            "Installed recipe presentation unavailable",
                        ))
                    })?;
                    let (stock, _stock) =
                        recipe_stock(budget, template.stock_definitions(), |stock| {
                            inventory.tally_recipe_stock(stock)
                        })?;
                    let method =
                        Recipe::prepare(template, &stock, &mut custody).map_err(|_| Capacity)?;
                    custody
                        .resize(
                            custody
                                .bytes()
                                .checked_add(4 * size_of::<Action<'_>>() + item.id.len() + 32)
                                .ok_or(Capacity)?,
                        )
                        .map_err(|_| Capacity)?;
                    actions.push(learn_action(
                        *item,
                        record_pin,
                        inventory.paused(),
                        controlling,
                        || inventory.can_learn(),
                    )?);
                    Some(RecipeRecord::available(method, known))
                }
                Some(InspectedRecipeRecord::Unavailable) => Some(RecipeRecord::unavailable()),
                None => None,
            };
            items.push(Item {
                material_condition: entry.material_condition,
                lot,
                individual: item.individual,
                art: self.observed.item_art.get(item.definition_id),
                category: entry.category,
                description: entry.description.unwrap_or(&blank),
                tags: entry.properties,
                actions,
                characteristics,
                equipment_conflicts,
                recipe_record,
                group: display_group,
            });
        }
        let source = root;
        let location = if inventory.container.is_some() {
            let ancestors = &inventory.breadcrumbs[1..inventory.breadcrumbs.len() - 1];
            let bytes = ancestors
                .iter()
                .try_fold(64_usize, |sum, ancestor| {
                    sum.checked_add(ancestor.name.storage_bytes().checked_mul(6)? + 12)
                })
                .ok_or(Capacity)?;
            custody
                .resize(custody.bytes().checked_add(bytes).ok_or(Capacity)?)
                .map_err(|_| Capacity)?;
            Some(if ancestors.is_empty() {
                "Carried by you".into()
            } else {
                let names = JsText::join(ancestors.iter().map(|part| part.name), " › ");
                JsText::concat(&[&"In ".into(), &names, &", Carried by you".into()])
            })
        } else {
            None
        };
        // Commands remain subject to a fresh control and physical check.
        // Unsupported item actions are an empty list, as required by the browser.
        crate::wire::encode(
            &Page {
                ok: true,
                container: Root {
                    source,
                    container: inventory.container,
                    location,
                },
                breadcrumbs: inventory.breadcrumbs,
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
