//! Current item custody. The ordered child index is derived from Placement,
//! never saved as a second relationship or accepted from a browser.

use super::{InstallError, RetainedDefinitions, RowImport, rows::take_collection};
use crate::{
    execution::ExecutionError,
    host::retained_size::{HeapBytes, heap_record, map_storage},
    host::{ByteBudget, ByteReservation, ResidentReservation},
    identity::MAX_SAFE_INTEGER,
    records::OwnerCoverage,
    state::{Entity, EntityHandle, EntityStore, Individuality, Named, Placement},
    values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id},
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::LazyLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StorageLimits {
    count_pin: DefinitionPin,
    maximum_depth: usize,
    maximum_container_grantees: usize,
    ordinary_view_entries: usize,
    shortcut_entries: usize,
}

static LIMITS: LazyLock<StorageLimits> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/object-storage.json"
    ))
    .expect("shared object storage limits are a build input")
});

pub(crate) fn inventory_display_limit() -> usize {
    LIMITS.ordinary_view_entries
}

pub fn shortcut_limit() -> usize {
    LIMITS.shortcut_entries
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ContainerDefinition {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    capacity: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    maximum_depth: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ItemDefinitionFields {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub name: crate::text::JsText,
    pub name_form: Option<String>,
    pub indefinite_article: Option<String>,
    pub icon: Option<String>,
    #[serde(default)]
    pub portable: bool,
    pub packing_load: Option<u64>,
    pub container: Option<ContainerDefinition>,
    equipment: Option<Equipment>,
    #[serde(default)]
    tracks_material_origins: bool,
    assembly_material: Option<serde::de::IgnoredAny>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Equipment {
    ports: Vec<String>,
    uses: Vec<EquipmentUse>,
}

#[derive(Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
enum EquipmentUse {
    Melee,
    Ranged,
    Gather,
    Guard,
}

pub(crate) struct ItemDefinitionRead {
    pub pin: DefinitionPin,
    pub named: Named,
    pub icon: Option<String>,
    pub portable: bool,
    packing_load: Option<u64>,
    container: Option<ContainerDefinition>,
    equipment: Option<Equipment>,
    tracks_material_origins: bool,
}

impl ItemDefinitionRead {
    pub(super) fn from_verified(
        key: &str,
        canonical: &str,
        value: ItemDefinitionFields,
    ) -> Result<Self, InstallError> {
        let pin = DefinitionPin {
            id: value.id,
            version: value.version,
            digest: crate::encoding::content_label(canonical),
        };
        if pin.id != key
            || !pin.is_valid()
            || !crate::narration::valid_name_parts(
                &value.name,
                value.name_form.as_deref(),
                value.indefinite_article.as_deref(),
            )
            || value
                .packing_load
                .is_some_and(|load| load > MAX_SAFE_INTEGER)
        {
            return Err(InstallError::DefinitionBody);
        }
        if let Some(equipment) = &value.equipment {
            if equipment.ports.is_empty()
                || equipment.ports.iter().enumerate().any(|(i, port)| {
                    !is_safe_record_id(port)
                        || port == "assembly"
                        || equipment.ports[..i].contains(port)
                })
                || equipment
                    .uses
                    .iter()
                    .enumerate()
                    .any(|(i, usage)| equipment.uses[..i].contains(usage))
            {
                return Err(InstallError::DefinitionBody);
            }
        }
        Ok(Self {
            pin,
            named: Named {
                name: value.name,
                name_form: value.name_form,
                indefinite_article: value.indefinite_article,
            },
            icon: value.icon,
            portable: value.portable,
            packing_load: value.packing_load,
            container: value.container,
            equipment: value.equipment,
            tracks_material_origins: value.tracks_material_origins
                || value.assembly_material.is_some(),
        })
    }
}

heap_record!(ItemDefinitionRead {
    pin,
    named,
    icon,
    equipment
});
impl HeapBytes for Equipment {
    fn heap_bytes(&self) -> Option<usize> {
        self.ports.heap_bytes()?.checked_add(
            self.uses
                .capacity()
                .checked_mul(size_of::<EquipmentUse>())?,
        )
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PackingLoad {
    pub(super) definition: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(super) load: u64,
}
heap_record!(PackingLoad { definition });

pub(crate) struct Inventory {
    resource_reservations: OwnerCoverage,
    children: IndexMap<String, Children>,
    _custody: ResidentReservation,
}

#[derive(Default)]
struct Children {
    items: Vec<EntityHandle>,
    equipped: Vec<EntityHandle>,
}

/// A loan from one player's accepted state. The raw item ID is only for the
/// legal holder's command bindings, never an outward observation.
#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnedItem<'a> {
    pub id: &'a str,
    pub definition_id: &'a str,
    pub revision: u64,
    pub placement_revision: u64,
    pub quantity: u64,
    pub available_quantity: u64,
    pub equipped: bool,
    #[serde(flatten)]
    pub named: &'a Named,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub container: Option<OwnedContainer>,
    #[serde(skip)]
    pub equipment_ports: &'a [String],
}

#[derive(Clone, Copy, PartialEq, Serialize)]
pub struct OwnedContainer {
    pub capacity: u64,
}

impl Inventory {
    /// Installation still closes resource holds. The next activity owner must
    /// replace this result when it starts issuing claims.
    pub(crate) fn work_allocation(&self) -> crate::values::WorkVector {
        crate::values::WorkVector::default()
    }

    pub(crate) fn resource_reservations(&self) -> &OwnerCoverage {
        &self.resource_reservations
    }

    pub(crate) fn has_children(&self, parent: &str) -> bool {
        self.children.contains_key(parent)
    }

    pub(crate) fn children<'a>(
        &'a self,
        entities: &'a EntityStore,
        parent: &str,
        equipped_only: bool,
    ) -> impl Iterator<Item = &'a Entity> {
        self.children
            .get(parent)
            .into_iter()
            .flat_map(move |children| {
                if equipped_only {
                    &children.equipped
                } else {
                    &children.items
                }
            })
            .filter_map(|handle| entities.resolve(*handle))
    }

    /// Visit only actual accessible descendants, in the same order as the
    /// Source indexed custody reader. A restricted bag itself is visible to
    /// its holder, and checking access controls whether its contents are read.
    pub(crate) fn visit_owned<'a>(
        &'a self,
        entities: &'a EntityStore,
        definitions: &'a RetainedDefinitions,
        actor: &str,
        parent: &str,
        visit: &mut impl FnMut(OwnedItem<'a>) -> Result<(), ExecutionError>,
    ) -> Result<(), ExecutionError> {
        for entity in self.children(entities, parent, false) {
            let accessible = accessible_bag(entity, actor);
            visit(project_owned(definitions, actor, entity, accessible)?)?;
            if accessible {
                self.visit_owned(entities, definitions, actor, &entity.id, visit)?;
            }
        }
        Ok(())
    }
}

/// Bind one exact shortcut in work proportional to its depth. Knowing the ID
/// of a lot in somebody else's or a restricted bag cannot open that bag.
pub(crate) fn owned_by<'a>(
    entities: &'a EntityStore,
    definitions: &'a RetainedDefinitions,
    actor: &str,
    id: &str,
) -> Result<Option<OwnedItem<'a>>, ExecutionError> {
    let Some(entity) = entities
        .get(id)
        .filter(|entity| entity.item.is_some() && entity.retirement.is_none())
    else {
        return Ok(None);
    };
    let mut parent = parent_id(entity);
    for _ in 0..=LIMITS.maximum_depth {
        let Some(current) = parent else {
            return Ok(None);
        };
        if current == actor {
            return project_owned(definitions, actor, entity, accessible_bag(entity, actor))
                .map(Some);
        }
        let Some(container) = entities
            .get(current)
            .filter(|body| body.retirement.is_none() && accessible_bag(body, actor))
        else {
            return Ok(None);
        };
        parent = parent_id(container);
    }
    Err(ExecutionError::Invariant)
}

fn accessible_bag(entity: &Entity, actor: &str) -> bool {
    entity.container.as_ref().is_some_and(|bag| {
        bag.access
            .as_ref()
            .is_none_or(|access| access.actors.iter().any(|id| id == actor))
    })
}

fn project_owned<'a>(
    definitions: &'a RetainedDefinitions,
    actor: &str,
    entity: &'a Entity,
    accessible: bool,
) -> Result<OwnedItem<'a>, ExecutionError> {
    let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
    let definition = definitions
        .items
        .get(&lot.definition_pin.id)
        .ok_or(ExecutionError::Invariant)?;
    let placement = entity.placement.as_ref().ok_or(ExecutionError::Invariant)?;
    let (placement_revision, equipped) = match placement {
        Placement::Contained { revision, .. } => (*revision, false),
        Placement::Attached {
            revision,
            parent_entity_id,
            ..
        } => (*revision, parent_entity_id == actor),
        Placement::World { .. } => return Err(ExecutionError::Invariant),
    };
    Ok(OwnedItem {
        id: &entity.id,
        definition_id: &definition.pin.id,
        revision: lot.revision,
        placement_revision,
        quantity: lot.quantity,
        available_quantity: lot.quantity,
        equipped,
        named: &definition.named,
        icon: definition.icon.as_deref().filter(|icon| !icon.is_empty()),
        container: definition
            .container
            .as_ref()
            .filter(|_| accessible)
            .map(|container| OwnedContainer {
                capacity: container.capacity,
            }),
        equipment_ports: definition
            .equipment
            .as_ref()
            .filter(|_| equipped)
            .map_or(&[], |equipment| equipment.ports.as_slice()),
    })
}

pub(super) fn install_inventory(
    import: &mut RowImport,
    present: bool,
    entities: &EntityStore,
    definitions: &RetainedDefinitions,
    pile_kind: &str,
    budget: &ByteBudget,
) -> Result<Inventory, InstallError> {
    let reservations = take_collection(
        import,
        "sim_resource_reservations",
        "[\"world\"]",
        present,
        true,
    )?;
    if !reservations.rows.is_empty() {
        return Err(InstallError::UnsupportedFamily("resourceReservations"));
    }
    let mut children = IndexMap::<String, Children>::new();
    let mut storage = budget.reserve(0).map_err(|_| InstallError::Capacity)?;
    // The startup scratch admits the index's backing before each new key and
    // child. Final custody reflects only the maps and slices actually retained.
    for id in entities.ordered_ids() {
        let entity = entities.get(id).ok_or(InstallError::CurrentFormat)?;
        validate_item(entities, definitions, entity)?;
        if let Some(parent_id) = parent_id(entity) {
            let parent = entities.get(parent_id).ok_or(InstallError::CurrentFormat)?;
            let lot = entity.item.as_ref().ok_or(InstallError::CurrentFormat)?;
            if !(parent.actor.is_some() || parent.kind == pile_kind || parent.container.is_some())
                || parent.retirement.is_some()
            {
                return Err(InstallError::CurrentFormat);
            }
            validate_ancestors(entities, entity)?;
            let equipped = if let Some(Placement::Attached {
                port_id,
                slot,
                local,
                ..
            }) = &entity.placement
            {
                if slot.is_some() || local.is_some() || port_id == "assembly" {
                    return Err(InstallError::UnsupportedFamily("assembly item attachment"));
                }
                let equipment = definitions.items[&lot.definition_pin.id]
                    .equipment
                    .as_ref()
                    .ok_or(InstallError::CurrentFormat)?;
                let body = parent
                    .actor
                    .as_ref()
                    .and_then(|actor| actor.body.as_ref())
                    .ok_or(InstallError::CurrentFormat)?;
                if equipment.ports.first() != Some(port_id)
                    || lot.individuality != Individuality::Individual
                    || equipment
                        .ports
                        .iter()
                        .any(|port| !body.equipment_ports.iter().any(|p| p.id == *port))
                {
                    return Err(InstallError::CurrentFormat);
                }
                if children
                    .get(parent_id)
                    .into_iter()
                    .flat_map(|children| &children.equipped)
                    .any(|other| {
                        entities.resolve(*other).is_some_and(|other| {
                            let (Some(Placement::Attached { .. }), Some(other_lot)) =
                                (&other.placement, &other.item)
                            else {
                                return false;
                            };
                            definitions
                                .items
                                .get(&other_lot.definition_pin.id)
                                .and_then(|definition| definition.equipment.as_ref())
                                .is_some_and(|other| {
                                    other
                                        .ports
                                        .iter()
                                        .any(|port| equipment.ports.contains(port))
                                })
                        })
                    })
                {
                    return Err(InstallError::CurrentFormat);
                }
                true
            } else {
                false
            };
            let extra = if children.contains_key(parent_id) {
                0
            } else {
                map_storage::<String, Children>(4)
                    .and_then(|bytes| bytes.checked_add(parent_id.len()))
                    .ok_or(InstallError::Capacity)?
            };
            let entry_bound = if equipped { 4 } else { 2 };
            grow(
                &mut storage,
                extra
                    .checked_add(entry_bound * size_of::<EntityHandle>())
                    .ok_or(InstallError::Capacity)?,
            )?;
            if extra != 0 {
                children
                    .try_reserve(1)
                    .map_err(|_| InstallError::Capacity)?;
                children.insert(parent_id.to_owned(), Children::default());
            }
            let family = children
                .get_mut(parent_id)
                .ok_or(InstallError::CurrentFormat)?;
            let handle = entities.handle(id).ok_or(InstallError::CurrentFormat)?;
            family
                .items
                .try_reserve(1)
                .map_err(|_| InstallError::Capacity)?;
            family.items.push(handle);
            if equipped {
                family
                    .equipped
                    .try_reserve(1)
                    .map_err(|_| InstallError::Capacity)?;
                family.equipped.push(handle);
            }
        }
    }
    for (parent, kids) in &mut children {
        for group in [&mut kids.items, &mut kids.equipped] {
            group.sort_unstable_by(|a, b| {
                let id = |handle| {
                    entities
                        .resolve(handle)
                        .map_or("", |entity| entity.id.as_str())
                };
                crate::encoding::js_string_cmp(id(*a), id(*b))
            });
        }
        let entity = entities.get(parent).ok_or(InstallError::CurrentFormat)?;
        if let Some(bag) = &entity.container {
            let mut load = 0_u64;
            let mut height = 0_u64;
            for child in &kids.items {
                let child = entities
                    .resolve(*child)
                    .ok_or(InstallError::CurrentFormat)?;
                let lot = child.item.as_ref().ok_or(InstallError::CurrentFormat)?;
                let definition = &definitions.items[&lot.definition_pin.id];
                let packing = definition
                    .packing_load
                    .or_else(|| {
                        definitions
                            .item_handling_read
                            .packing_load(&lot.definition_pin)
                    })
                    .ok_or(InstallError::CurrentFormat)?;
                load = packing
                    .checked_mul(lot.quantity)
                    .and_then(|weight| {
                        weight.checked_add(child.container.as_ref().map_or(0, |bag| bag.load))
                    })
                    .and_then(|weight| weight.checked_add(load))
                    .filter(|weight| *weight <= MAX_SAFE_INTEGER)
                    .ok_or(InstallError::CurrentFormat)?;
                height = height.max(1 + child.container.as_ref().map_or(0, |bag| bag.height));
            }
            if bag.height != height || bag.load != load {
                return Err(InstallError::CurrentFormat);
            }
        }
    }
    for id in entities.ordered_ids() {
        if !children.contains_key(id)
            && entities
                .get(id)
                .and_then(|entity| entity.container.as_ref())
                .is_some_and(|bag| bag.load != 0 || bag.height != 0)
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    let bytes = children.iter().try_fold(
        map_storage::<String, Children>(children.capacity()).ok_or(InstallError::Capacity)?,
        |sum, (id, kids)| {
            kids.items
                .capacity()
                .checked_add(kids.equipped.capacity())
                .and_then(|count| count.checked_mul(size_of::<EntityHandle>()))
                .and_then(|bytes| bytes.checked_add(id.capacity()))
                .and_then(|bytes| bytes.checked_add(sum))
                .ok_or(InstallError::Capacity)
        },
    )?;
    storage.resize(bytes).map_err(|_| InstallError::Capacity)?;
    Ok(Inventory {
        resource_reservations: reservations.coverage,
        children,
        _custody: budget
            .adopt_record(storage)
            .map_err(|_| InstallError::Capacity)?,
    })
}

fn grow(storage: &mut ByteReservation, extra: usize) -> Result<(), InstallError> {
    let bytes = storage
        .bytes()
        .checked_add(extra)
        .ok_or(InstallError::Capacity)?;
    storage.resize(bytes).map_err(|_| InstallError::Capacity)
}

fn parent_id(entity: &Entity) -> Option<&str> {
    match &entity.placement {
        Some(
            Placement::Contained {
                parent_entity_id, ..
            }
            | Placement::Attached {
                parent_entity_id, ..
            },
        ) => Some(parent_entity_id),
        _ => None,
    }
}

fn validate_ancestors(entities: &EntityStore, entity: &Entity) -> Result<(), InstallError> {
    let mut current = entity;
    for _ in 0..=LIMITS.maximum_depth {
        match &current.placement {
            Some(Placement::World { .. }) if current.retirement.is_none() => return Ok(()),
            _ => {
                current = parent_id(current)
                    .and_then(|parent| entities.get(parent))
                    .ok_or(InstallError::CurrentFormat)?;
                if current.retirement.is_some() {
                    return Err(InstallError::CurrentFormat);
                }
            }
        }
    }
    Err(InstallError::CurrentFormat)
}

fn validate_item(
    entities: &EntityStore,
    definitions: &RetainedDefinitions,
    entity: &Entity,
) -> Result<(), InstallError> {
    if let Some(owner) = &entity.declared_owner {
        if owner.revision == 0
            || !is_safe_record_id(&owner.source_id)
            || owner
                .holder_id
                .as_ref()
                .is_some_and(|id| !is_safe_record_id(id))
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    let Some(lot) = &entity.item else {
        return if entity.container.is_some() {
            Err(InstallError::CurrentFormat)
        } else {
            Ok(())
        };
    };
    if lot.assembly_claim.is_some() || lot.material_contribution_ids.is_some() {
        return Err(InstallError::UnsupportedFamily(
            "active construction material custody",
        ));
    }
    let definition = definitions
        .items
        .get(&lot.definition_pin.id)
        .ok_or(InstallError::DefinitionPin)?;
    if lot.definition_pin != definition.pin
        || lot.unit_pin != LIMITS.count_pin
        || lot.quantity == 0
        || (lot.individuality == Individuality::Individual && lot.quantity != 1)
    {
        return Err(InstallError::CurrentFormat);
    }
    match &lot.material_origin_ids {
        None if !definition.tracks_material_origins => {}
        Some(origins)
            if definition.tracks_material_origins
                && !origins.is_empty()
                && origins
                    .iter()
                    .enumerate()
                    .all(|(i, id)| is_safe_record_id(id) && !origins[..i].contains(id)) => {}
        _ => return Err(InstallError::CurrentFormat),
    }
    if let Some(bag) = &entity.container {
        let rule = definition
            .container
            .as_ref()
            .ok_or(InstallError::CurrentFormat)?;
        if bag.definition_pin != lot.definition_pin
            || lot.individuality != Individuality::Individual
            || bag.height > rule.maximum_depth
            || bag.load > rule.capacity
            || bag.load_revision != bag.subtree_revision
            || bag.access.as_ref().is_some_and(|access| {
                access.actors.len() > LIMITS.maximum_container_grantees
                    || access.actors.iter().any(|id| {
                        !is_safe_record_id(id)
                            || entities.get(id).is_none_or(|holder| holder.actor.is_none())
                    })
            })
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    Ok(())
}
