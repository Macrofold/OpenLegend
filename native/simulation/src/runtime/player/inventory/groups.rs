//! Display only equivalent direct lots together. A group selects existing
//! physical lots and never merges their identities or origins.
use super::*;
use crate::encoding::write_json_record;
use crate::execution::OwnedStockLot;
use crate::host::retained_size::map_storage;
use crate::identity::MAX_SAFE_INTEGER;
use sha2::{Digest, Sha256};
use std::io::{self, Write};

struct GroupDigest(Sha256);

impl Write for GroupDigest {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.update(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

type Key = [u8; 32];

fn stock_key(
    entity: &Entity,
    definition: &ItemDefinitionRead,
    budget: &ByteBudget,
) -> Result<Option<Key>, RuntimeError> {
    let lot = entity
        .item
        .as_ref()
        .ok_or_else(|| failure("inventory lot unavailable"))?;
    if entity.container.is_some()
        || definition.recipe_record.is_some()
        || lot.individuality != crate::state::Individuality::Homogeneous
        || !matches!(entity.placement, Some(Placement::Contained { .. }))
        || lot.assembly_claim.is_some()
        || entity
            .status_effects
            .as_ref()
            .is_some_and(|entries| !entries.is_empty())
        || entity
            .mechanism_fields
            .as_ref()
            .is_some_and(|fields| !fields.is_empty())
    {
        return Ok(None);
    }
    let count = entity
        .attributes
        .as_ref()
        .map_or(0, |entries| entries.len());
    let _scratch = budget.reserve(
        count
            .checked_mul(2 * std::mem::size_of::<(&str, &crate::values::AttributeValue)>())
            .ok_or(CapacityError)?,
    )?;
    let mut attributes = entity
        .attributes
        .iter()
        .flatten()
        .map(|(id, entry)| (id.as_str(), &entry.value))
        .collect::<Vec<_>>();
    attributes.sort_unstable_by_key(|(id, _)| *id);
    let ownership = entity
        .declared_owner
        .as_ref()
        .map(|owner| (&owner.holder_id, &owner.disclosure));
    let mut hash = GroupDigest(Sha256::new());
    write_json_record(
        &(&lot.definition_pin, &lot.unit_pin, attributes, ownership),
        &mut hash,
    )
    .map_err(failure)?;
    Ok(Some(hash.0.finalize().into()))
}

pub struct InventoryGroup {
    first: usize,
    others: Vec<usize>,
    key: Option<Key>,
    pub quantity: u64,
}

impl InventoryGroup {
    fn slots(&self) -> impl Iterator<Item = usize> + '_ {
        std::iter::once(self.first).chain(self.others.iter().copied())
    }

    pub fn first(&self) -> usize {
        self.first
    }

    pub fn members(&self) -> usize {
        1 + self.others.len()
    }

    pub fn key(&self) -> Option<Key> {
        self.key
    }
}

pub struct InventoryGroups {
    rows: Vec<InventoryGroup>,
    cut: Key,
    _space: ByteReservation,
}

impl InventoryGroups {
    pub fn rows(&self) -> &[InventoryGroup] {
        &self.rows
    }

    pub fn cut(&self) -> Key {
        self.cut
    }
}

pub struct InventoryGroupAvailability {
    pub representative: usize,
    pub available: u64,
}

pub enum StockGroupRefusal {
    Changed,
    TooManyLots,
}

pub fn stock_group_limit_message() -> &'static str {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Copy {
        group_limit: String,
    }
    static MESSAGE: std::sync::LazyLock<String> = std::sync::LazyLock::new(|| {
        let copy: Copy = serde_json::from_str(include_str!(
            "../../../../../../packages/domain/src/worlds/base/item-move-copy.json"
        ))
        .expect("authored inventory grouping language");
        copy.group_limit.replace(
            "{limit}",
            &crate::stock_transfer::limits().moved_lots.to_string(),
        )
    });
    &MESSAGE
}

pub struct ResolvedInventoryGroup {
    pub selection: crate::execution::OwnedStockSelection,
    _space: ByteReservation,
}

impl DirectInventory<'_> {
    /// Prepare display membership in direct custody order. This scans the
    /// requested container once. Metadata and sibling groups stay inside the
    /// admitted inventory read, and only displayed groups need availability.
    pub fn display_groups(&self, budget: &ByteBudget) -> Result<InventoryGroups, RuntimeError> {
        let count = self.count();
        let mut space = budget.reserve(
            count
                .checked_mul(
                    std::mem::size_of::<InventoryGroup>() + 4 * std::mem::size_of::<usize>(),
                )
                .ok_or(CapacityError)?,
        )?;
        let _keys = budget.reserve(map_storage::<Key, usize>(count).ok_or(CapacityError)?)?;
        let mut keys: IndexMap<Key, usize> = IndexMap::with_capacity(count);
        let mut rows: Vec<InventoryGroup> = Vec::with_capacity(count);
        for child in 0..count {
            let entity = self.child(child)?;
            let quantity = entity
                .item
                .as_ref()
                .ok_or_else(|| failure("inventory lot unavailable"))?
                .quantity;
            let key = stock_key(entity, self.definition(entity)?, budget)?;
            if let Some(key) = key {
                if let Some(&index) = keys.get(&key) {
                    let row = rows
                        .get_mut(index)
                        .ok_or_else(|| failure("inventory group unavailable"))?;
                    if quantity <= MAX_SAFE_INTEGER - row.quantity {
                        row.others.push(child);
                        row.quantity += quantity;
                        continue;
                    }
                    // A valid exact lot remains its own row if adding it
                    // would make the displayed group total inexact.
                } else {
                    keys.insert(key, rows.len());
                    rows.push(InventoryGroup {
                        first: child,
                        others: Vec::new(),
                        key: Some(key),
                        quantity,
                    });
                    continue;
                }
            }
            rows.push(InventoryGroup {
                first: child,
                others: Vec::new(),
                key: None,
                quantity,
            });
        }
        let bytes = rows
            .iter()
            .try_fold(
                rows.capacity()
                    .checked_mul(std::mem::size_of::<InventoryGroup>())
                    .ok_or(CapacityError)?,
                |bytes, row| {
                    bytes.checked_add(
                        row.others
                            .capacity()
                            .checked_mul(std::mem::size_of::<usize>())?,
                    )
                },
            )
            .ok_or(CapacityError)?;
        space.resize(bytes)?;
        let mut hash = Sha256::new();
        for row in &rows {
            hash.update(row.first.to_le_bytes());
            hash.update(row.quantity.to_le_bytes());
            hash.update(row.members().to_le_bytes());
            if let Some(key) = row.key {
                hash.update(key);
            }
            for index in &row.others {
                hash.update(index.to_le_bytes());
            }
        }
        Ok(InventoryGroups {
            rows,
            cut: hash.finalize().into(),
            _space: space,
        })
    }

    fn available_group_lot(&self, entity: &Entity) -> Result<u64, RuntimeError> {
        let lot = entity
            .item
            .as_ref()
            .ok_or_else(|| failure("inventory lot unavailable"))?;
        if !matches!(entity.placement, Some(Placement::Contained { .. }))
            || self.lot_in_use(entity)?
        {
            return Ok(0);
        }
        Ok(lot
            .quantity
            .saturating_sub(self.state.physical.holds.quantity(&entity.id)))
    }

    pub fn group_availability(
        &self,
        group: &InventoryGroup,
    ) -> Result<InventoryGroupAvailability, RuntimeError> {
        let mut representative = group.first();
        let mut available = 0;
        for index in group.slots() {
            let quantity = self.available_group_lot(self.child(index)?)?;
            if available == 0 && quantity > 0 {
                representative = index;
            }
            available += quantity;
        }
        Ok(InventoryGroupAvailability {
            representative,
            available,
        })
    }

    fn resolve_stock_group(
        &self,
        inbox: StockGroupRequest<'_>,
        budget: &ByteBudget,
    ) -> Result<Result<ResolvedInventoryGroup, StockGroupRefusal>, RuntimeError> {
        let owner = self
            .breadcrumbs
            .last()
            .ok_or_else(|| failure("inventory root unavailable"))?;
        if owner.revision != inbox.revision || inbox.quantity == 0 {
            return Ok(Err(StockGroupRefusal::Changed));
        }
        let entities = &self.state.physical.entities;
        let Some(representative) = entities.get(inbox.representative).filter(|item| {
            self.state
                .inventory
                .has_direct_item(entities, owner.id, item)
        }) else {
            return Ok(Err(StockGroupRefusal::Changed));
        };
        if stock_key(representative, self.definition(representative)?, budget)? != Some(inbox.key) {
            return Ok(Err(StockGroupRefusal::Changed));
        }
        let reference = representative
            .item
            .as_ref()
            .ok_or_else(|| failure("inventory lot unavailable"))?;
        let limit = crate::stock_transfer::limits().moved_lots;
        let mut space = budget.reserve(
            limit
                .checked_mul(std::mem::size_of::<OwnedStockLot>())
                .and_then(|n| n.checked_add(owner.id.len()))
                .ok_or(CapacityError)?,
        )?;
        let mut members = Vec::with_capacity(limit);
        let mut remaining = inbox.quantity;
        let mut total = 0_u64;
        let mut count = 0;
        let mut representative_is_member = false;
        // Resolve just the selected group. Other definitions do not need
        // their display keys, ordering, slot lists, or projections rebuilt.
        for handle in self.children {
            let entity = entities
                .resolve(*handle)
                .ok_or_else(|| failure("inventory index unavailable"))?;
            let lot = entity
                .item
                .as_ref()
                .ok_or_else(|| failure("inventory lot unavailable"))?;
            if lot.definition_pin != reference.definition_pin
                || lot.unit_pin != reference.unit_pin
                || lot.quantity > MAX_SAFE_INTEGER - total
                || stock_key(entity, self.definition(entity)?, budget)? != Some(inbox.key)
            {
                continue;
            }
            total += lot.quantity;
            count += 1;
            representative_is_member |= entity.id == inbox.representative;
            if remaining == 0 {
                if count > 1 && representative_is_member {
                    break;
                }
                continue;
            }
            let selected = self.available_group_lot(entity)?.min(remaining);
            if selected == 0 {
                continue;
            }
            if members.len() == limit {
                return Ok(Err(StockGroupRefusal::TooManyLots));
            }
            let Placement::Contained { revision, .. } = entity
                .placement
                .as_ref()
                .ok_or_else(|| failure("inventory lot placement unavailable"))?
            else {
                return Err(failure("inventory lot placement unavailable"));
            };
            space.resize(
                space
                    .bytes()
                    .checked_add(entity.id.len())
                    .ok_or(CapacityError)?,
            )?;
            members.push(OwnedStockLot {
                item_id: entity.id.clone(),
                quantity: selected,
                revision: lot.revision,
                placement_revision: *revision,
            });
            remaining -= selected;
            if remaining == 0 && count > 1 && representative_is_member {
                break;
            }
        }
        if remaining != 0 || count <= 1 || !representative_is_member {
            return Ok(Err(StockGroupRefusal::Changed));
        }
        Ok(Ok(ResolvedInventoryGroup {
            selection: crate::execution::OwnedStockSelection {
                container_id: owner.id.to_owned(),
                revision: owner.revision,
                quantity: inbox.quantity,
                members,
            },
            _space: space,
        }))
    }
}

pub struct StockGroupRequest<'a> {
    pub container: &'a str,
    pub revision: u64,
    pub key: Key,
    pub representative: &'a str,
    pub quantity: u64,
}

impl NativeWorldSession {
    /// Expand an issued group into owned revisions under the same current
    /// custody read used by Inventory. The small result owns its allocation
    /// until the command binder takes its independent copy.
    pub fn resolve_inventory_group(
        &self,
        account: &str,
        actor: &str,
        group: StockGroupRequest<'_>,
    ) -> Result<Result<ResolvedInventoryGroup, StockGroupRefusal>, RuntimeError> {
        self.with_player_direct_inventory(account, actor, Some(group.container), |read, budget| {
            read.map_or(Ok(Err(StockGroupRefusal::Changed)), |inventory| {
                inventory.resolve_stock_group(group, budget)
            })
        })?
    }
}
