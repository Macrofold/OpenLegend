//! Current item custody. The ordered child index is derived from Placement,
//! never saved as a second relationship or accepted from a browser.

use super::{InstallError, RetainedDefinitions, RowImport, rows::take_collection};
use crate::{
    execution::ExecutionError,
    host::retained_size::{HeapBytes, heap_record, map_storage},
    host::{ByteBudget, ByteReservation, ResidentReservation},
    identity::MAX_SAFE_INTEGER,
    material_exposure::{MaterialPresence, StockExposure},
    records::OwnerCoverage,
    state::{Entity, EntityHandle, EntityStore, Individuality, LivingBody, Named, Placement},
    values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id},
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::LazyLock};

mod melee;
pub(crate) use melee::{MeleeProfile, equipped_melee};

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

pub(crate) fn item_count_pin() -> &'static DefinitionPin {
    &LIMITS.count_pin
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
    pub gather_label: Option<crate::text::JsText>,
    description: Option<crate::text::JsText>,
    #[serde(default)]
    properties: Vec<crate::text::JsText>,
    ammunition: Option<crate::projectile::Ammunition>,
    ranged_weapon: Option<crate::projectile::RangedWeapon>,
    #[serde(default, deserialize_with = "crate::values::deserialize_present_option")]
    execution: Option<Box<crate::attack_execution::AttackExecutionProfile>>,
    contact_defense: Option<crate::contact::guard::DefenseProfile>,
    melee: Option<MeleeProfile>,
    nutrition: Option<f64>,
    fishing_tool: Option<FishingTool>,
    gathering_tool: Option<GatheringTool>,
    #[serde(default)]
    pub portable: bool,
    pub packing_load: Option<u64>,
    pub container: Option<ContainerDefinition>,
    equipment: Option<Equipment>,
    #[serde(default)]
    tracks_material_origins: bool,
    assembly_material: Option<MaterialRole>,
    recipe_id: Option<String>,
    recipe_record: Option<ItemRecipeRecord>,
    contents_exposure: Option<ContentsExposure>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ContentsExposure {
    profile: DefinitionPin,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ItemRecipeRecord {
    pub method: DefinitionPin,
    #[serde(rename = "disclosure")]
    _disclosure: RecipeDisclosure,
    #[serde(skip)]
    pub available: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum RecipeDisclosure {
    Method,
}

heap_record!(ItemRecipeRecord { method });

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MaterialRole {
    pub family_id: String,
    pub role: String,
    pub post_height: Option<f64>,
    pub cover_profile: Option<DefinitionPin>,
}
heap_record!(MaterialRole { family_id, role, cover_profile });

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ItemMaterialRule {
    pub initial_attributes: Vec<String>,
    pub state_attributes: Vec<String>,
    pub homogeneous: bool,
    pub bag_refusal: Option<crate::text::JsText>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Equipment {
    ports: Vec<String>,
    uses: Vec<EquipmentUse>,
}

impl Equipment {
    fn fits(&self, body: &LivingBody) -> bool {
        self.ports
            .iter()
            .all(|port| body.equipment_ports.iter().any(|owned| owned.id == *port))
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum EquipmentUse {
    Melee,
    Ranged,
    Gather,
    Guard,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GatheringTool {
    resource_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    quantity: u64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct FishingTool {
    kind: String,
}

pub(crate) struct ItemDefinitionRead {
    pub pin: DefinitionPin,
    pub named: Named,
    pub icon: Option<String>,
    pub gather_label: Option<crate::text::JsText>,
    pub description: Option<crate::text::JsText>,
    pub properties: Vec<crate::text::JsText>,
    pub category: &'static str,
    pub(crate) nutrition: Option<f64>,
    pub(crate) ranged_weapon: Option<crate::projectile::RangedWeapon>,
    pub(crate) execution: Option<Box<crate::attack_execution::AttackExecutionProfile>>,
    pub(crate) contact_defense: Option<crate::contact::guard::DefenseProfile>,
    melee: Option<MeleeProfile>,
    pub(crate) ammunition: Option<crate::projectile::Ammunition>,
    plain_material: bool,
    gathering_tool: Option<GatheringTool>,
    fishing_tool: Option<FishingTool>,
    pub portable: bool,
    pub(super) packing_load: Option<u64>,
    container: Option<ContainerDefinition>,
    equipment: Option<Equipment>,
    pub tracks_material_origins: bool,
    pub material: Option<ItemMaterialRule>,
    pub assembly_material: Option<MaterialRole>,
    pub(crate) recipe_id: Option<String>,
    pub(crate) recipe_record: Option<ItemRecipeRecord>,
    open_contents: bool,
    pub(crate) exposure: Option<crate::material_exposure::ExposedMaterial>,
}

impl ItemDefinitionRead {
    pub(super) fn from_verified(
        key: &str,
        canonical: &str,
        value: ItemDefinitionFields,
        assembly: Option<&super::retained::RetainedMap>,
        exposure: Option<&IndexMap<String, &serde_json::value::RawValue>>,
        laws: &mut crate::material_exposure::ExposureLaws<'_>,
        budget: &ByteBudget,
    ) -> Result<Self, InstallError> {
        let pin = DefinitionPin {
            id: value.id,
            version: value.version,
            digest: crate::encoding::content_label(canonical),
        };
        if pin.id != key
            || !pin.is_valid()
            || value.recipe_record.as_ref().is_some_and(|record| !record.method.is_valid())
            || !crate::narration::valid_name_parts(
                &value.name,
                value.name_form.as_deref(),
                value.indefinite_article.as_deref(),
            )
            || value
                .packing_load
                .is_some_and(|load| load > MAX_SAFE_INTEGER)
            || value
                .gathering_tool
                .as_ref()
                .is_some_and(|tool| !is_safe_record_id(&tool.resource_id) || tool.quantity == 0)
            || value.fishing_tool.as_ref().is_some_and(|tool| !is_safe_record_id(&tool.kind))
            || value.ranged_weapon.as_ref().is_some_and(|weapon| !weapon.valid())
            || value.melee.as_ref().is_some_and(|profile| !profile.valid())
            || value.execution.as_ref().is_some_and(|profile| {
                !profile.valid() || (value.ranged_weapon.is_none() && value.melee.is_none())
            })
            || value.contact_defense.as_ref().is_some_and(|profile| {
                !profile.valid() || !value.equipment.as_ref().is_some_and(|gear| gear.uses.contains(&EquipmentUse::Guard))
            })
            || value.ammunition.as_ref().is_some_and(|ammunition| !ammunition.valid())
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
        let (material, material_exposure) = value.assembly_material.as_ref().map(|role| {
            #[derive(Deserialize)]
            struct Family<'a> {
                implementation: &'a str,
                #[serde(borrow)]
                inventory: IndexMap<&'a str, &'a serde_json::value::RawValue>,
            }
            let payload = assembly.and_then(|families| families.get(&role.family_id))
                .ok_or(InstallError::DefinitionBody)?;
            let _workspace = budget.reserve(payload.len().checked_mul(2).ok_or(InstallError::Capacity)?)
                .map_err(|_| InstallError::Capacity)?;
            let family: Family<'_> = serde_json::from_str(payload).map_err(|_| InstallError::DefinitionBody)?;
            let rule = family.inventory.get(role.role.as_str()).ok_or(InstallError::DefinitionBody)?;
            let material = serde_json::from_str::<ItemMaterialRule>(rule.get())
                .map_err(|_| InstallError::DefinitionBody)?;
            let exposure = if family.implementation == "four-corner-flexible-bays" {
                crate::material_exposure::ExposureRole::from_role(&role.role)
                    .map(|kind| laws.material(&role.family_id, payload, kind, budget)).transpose()?
            } else {
                None
            };
            Ok::<_, InstallError>((Some(material), exposure))
        }).transpose()?.unwrap_or((None, None));
        if let Some(contents) = &value.contents_exposure {
            #[derive(Deserialize)]
            struct Profile<'a> {
                id: &'a str,
                version: u64,
                implementation: &'a str,
            }
            let pin = &contents.profile;
            let payload = exposure.and_then(|profiles| profiles.get(&pin.id))
                .ok_or(InstallError::DefinitionBody)?;
            let profile: Profile<'_> = serde_json::from_str(payload.get())
                .map_err(|_| InstallError::DefinitionBody)?;
            if value.container.is_none() || !pin.is_valid()
                || profile.id != pin.id || profile.version != pin.version
                || profile.implementation != "open-single-level"
                || crate::encoding::content_label(payload.get()) != pin.digest
            {
                return Err(InstallError::DefinitionBody);
            }
        }
        let category = if value.equipment.is_some() || value.fishing_tool.is_some() {
            "equipment"
        } else if value.ammunition.is_some() {
            "ammunition"
        } else if value.properties.iter().any(|value| value == "food") {
            "food"
        } else {
            "material"
        };
        Ok(Self {
            pin,
            named: Named {
                name: value.name,
                name_form: value.name_form,
                indefinite_article: value.indefinite_article,
            },
            icon: value.icon,
            gather_label: value.gather_label,
            description: value.description,
            properties: value.properties,
            category,
            nutrition: value.nutrition,
            plain_material: value.portable && value.container.is_none()
                && value.ranged_weapon.is_none() && value.melee.is_none()
                && value.gathering_tool.is_none() && value.ammunition.is_none()
                && value.nutrition.is_none_or(|value| value == 0.0),
            ranged_weapon: value.ranged_weapon,
            execution: value.execution,
            contact_defense: value.contact_defense,
            melee: value.melee,
            ammunition: value.ammunition,
            gathering_tool: value.gathering_tool,
            fishing_tool: value.fishing_tool,
            portable: value.portable,
            packing_load: value.packing_load,
            container: value.container,
            equipment: value.equipment,
            tracks_material_origins: value.tracks_material_origins
                || value.assembly_material.is_some(),
            material,
            assembly_material: value.assembly_material,
            recipe_id: value.recipe_id,
            recipe_record: value.recipe_record,
            open_contents: value.contents_exposure.is_some(),
            exposure: material_exposure,
        })
    }

    pub(crate) fn has_no_container(&self) -> bool { self.container.is_none() }
    pub(crate) fn can_consume_as_plain_material(&self) -> bool { self.plain_material }

    pub(crate) fn gathering_tool_yield(&self) -> Option<(&str, u64)> {
        self.gathering_tool
            .as_ref()
            .map(|tool| (tool.resource_id.as_str(), tool.quantity))
    }

    pub(crate) fn gathering_yield(&self, resource: &str) -> Option<u64> {
        self.gathering_tool_yield()
            .filter(|(material, _)| *material == resource)
            .map(|(_, quantity)| quantity)
    }

    pub(crate) fn equips_for_gathering(&self) -> bool {
        self.equips_for(EquipmentUse::Gather)
    }

    pub(crate) fn equips_for(&self, uses: EquipmentUse) -> bool {
        self.equipment
            .as_ref()
            .is_some_and(|gear| gear.uses.contains(&uses))
    }

    pub(crate) fn packing_load(&self) -> Option<u64> {
        self.packing_load
    }
    pub(crate) fn fishing_kind(&self) -> Option<&str> {
        self.fishing_tool.as_ref().map(|tool| tool.kind.as_str())
    }

    pub(crate) fn can_guard(&self) -> bool {
        self.equipment.as_ref().is_some_and(|gear| gear.uses.contains(&EquipmentUse::Guard))
    }

    pub(crate) fn equipment_ports(&self) -> Option<&[String]> {
        self.equipment.as_ref().map(|gear| gear.ports.as_slice())
    }

    pub(crate) fn is_container(&self) -> bool {
        self.container.is_some()
    }

    pub(crate) fn has_open_contents(&self) -> bool {
        self.open_contents
    }

    pub(crate) fn container_maximum_depth(&self) -> Option<u64> {
        self.container.as_ref().map(|definition| definition.maximum_depth)
    }

    pub(crate) fn container_capacity(&self) -> Option<u64> {
        self.container.as_ref().map(|definition| definition.capacity)
    }
}

heap_record!(ItemDefinitionRead {
    pin,
    named,
    icon,
    gather_label,
    description,
    properties,
    ranged_weapon,
    execution,
    contact_defense,
    ammunition,
    gathering_tool,
    fishing_tool,
    material,
    assembly_material,
    equipment,
    recipe_id,
    recipe_record
});
heap_record!(GatheringTool { resource_id });
heap_record!(FishingTool { kind });
heap_record!(ItemMaterialRule { initial_attributes, state_attributes, bag_refusal });
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
    pub(crate) lineage: OwnerCoverage,
    pub(crate) exposure: StockExposure,
    children: IndexMap<String, Children>,
    _custody: ResidentReservation,
}

#[derive(Default)]
struct Children {
    items: Vec<EntityHandle>,
    equipped: Vec<EntityHandle>,
    material_detail_revision: u64,
}

/// Inverse for removing one exposed item. Moving the last list into this
/// value keeps its capacity funded until acceptance or exact rollback.
pub(crate) struct RemovedInventoryChild {
    membership: RemovedMembership,
    pub(crate) material: MaterialPresence,
}

enum RemovedMembership {
    Member(usize),
    Last {
        position: usize,
        parent: String,
        children: Children,
        storage: ResidentReservation,
    },
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
    #[serde(skip)]
    pub individual: bool,
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

pub struct InventoryDetail<'a> {
    pub item: OwnedItem<'a>,
    pub category: &'static str,
    pub description: Option<&'a crate::text::JsText>,
    pub properties: &'a [crate::text::JsText],
    pub material_condition: Option<MaterialCondition<'a>>,
    pub equipment_ports: Option<&'a [String]>,
    pub equipment_fits: bool,
    pub eating: Option<crate::consumption::EatingOffer<'a>>,
    pub drop: Option<DropOffer<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialCondition<'a> {
    pub(crate) label: &'a crate::text::JsText,
    pub(crate) process: &'static str,
    pub(crate) covered_fraction: f64,
}

pub struct DropOffer<'a> {
    pub label: &'a str,
    pub reason: Option<&'a str>,
}

/// Both the native attachment owner and the explicit inventory preview use
/// one installed port-intersection rule.
pub fn equipment_ports_conflict(left: &[String], right: &[String]) -> bool {
    left.iter().any(|port| right.contains(port))
}

impl Inventory {
    /// Reserve resident backing for one new attachment in an existing child's
    /// collection. Detaching retains backing so an aborted edit can reinsert.
    pub(crate) fn reserve_attachment(
        &mut self,
        parent: &str,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let equipped = &mut self
            .children
            .get_mut(parent)
            .ok_or(ExecutionError::Invariant)?
            .equipped;
        if equipped.len() == equipped.capacity() {
            let before = equipped.capacity();
            let next = before.checked_add(1).ok_or(ExecutionError::Capacity)?;
            let mut admitted = budget.reserve(
                next.checked_mul(size_of::<EntityHandle>()).ok_or(ExecutionError::Capacity)?,
            )?;
            let mut replacement = Vec::new();
            replacement
                .try_reserve_exact(next)
                .map_err(|_| ExecutionError::Capacity)?;
            admitted.resize(replacement.capacity() * size_of::<EntityHandle>())?;
            let growth = admitted.split_off((replacement.capacity() - before) * size_of::<EntityHandle>())?;
            budget.fund_backing(&mut self._custody, growth)?;
            replacement.extend_from_slice(equipped);
            *equipped = replacement;
        }
        Ok(())
    }

    pub(crate) fn attachment_count(&self, parent: &str) -> usize {
        self.children.get(parent).map_or(0, |kids| kids.equipped.len())
    }

    pub(crate) fn direct_item_count(&self, parent: &str) -> usize {
        self.children.get(parent).map_or(0, |kids| kids.items.len())
    }

    pub(crate) fn material_detail_revision(&self, root: &str) -> u64 {
        self.children.get(root).map_or(0, |children| children.material_detail_revision)
    }

    pub(crate) fn set_material_detail_revision(
        &mut self,
        root: &str,
        revision: u64,
    ) -> Result<(), ExecutionError> {
        self.children
            .get_mut(root)
            .ok_or(ExecutionError::Invariant)?
            .material_detail_revision = revision;
        Ok(())
    }

    pub(crate) fn set_attachment(
        &mut self,
        entities: &EntityStore,
        parent: &str,
        child: EntityHandle,
        attached: bool,
    ) -> Result<(), ExecutionError> {
        let equipped = &mut self
            .children
            .get_mut(parent)
            .ok_or(ExecutionError::Invariant)?
            .equipped;
        let id = &entities.resolve(child).ok_or(ExecutionError::Invariant)?.id;
        let position = equipped.binary_search_by(|handle| {
            let existing = entities.resolve(*handle).map_or("", |body| body.id.as_str());
            crate::encoding::js_string_cmp(existing, id)
        });
        match (position, attached) {
            (Err(i), true) if equipped.len() < equipped.capacity() => equipped.insert(i, child),
            (Ok(i), false) => { equipped.remove(i); }
            _ => return Err(ExecutionError::Invariant),
        }
        Ok(())
    }

    /// Add a validated contained lot to the already installed direct-contents
    /// index. Only this parent's list can grow. The existing entity owner keeps
    /// the lot itself. Insertion reserves backing before changing membership.
    pub(crate) fn add_item(
        &mut self,
        entities: &EntityStore,
        parent: &str,
        child: EntityHandle,
        material: MaterialPresence,
        budget: &ByteBudget,
    ) -> Result<(), crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        let id = &entities.resolve(child).ok_or(ExecutionError::Invariant)?.id;
        self.exposure.prepare_insert(material, budget)?;
        if let Some(kids) = self.children.get_mut(parent) {
            let position = kids
                .items
                .binary_search_by(|handle| {
                    let existing = entities
                        .resolve(*handle)
                        .map_or("", |entity| entity.id.as_str());
                    crate::encoding::js_string_cmp(existing, id)
                })
                .err()
                .ok_or(ExecutionError::Invariant)?;
            if kids.items.len() == kids.items.capacity() {
                let before = kids.items.capacity();
                let mut admitted = budget.reserve(
                    before
                        .checked_mul(2)
                        .map(|n| n.max(4))
                        .and_then(|n| n.checked_mul(size_of::<EntityHandle>()))
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                kids.items
                    .try_reserve(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                admitted.resize((kids.items.capacity() - before) * size_of::<EntityHandle>())?;
                budget.fund_backing(&mut self._custody, admitted)?;
            }
            kids.items.insert(position, child);
        } else {
            let before = map_storage::<String, Children>(self.children.capacity())
                .ok_or(ExecutionError::Capacity)?;
            let target = if self.children.len() == self.children.capacity() {
                self.children
                    .capacity()
                    .checked_mul(2)
                    .map(|n| n.max(4))
                    .ok_or(ExecutionError::Capacity)?
            } else {
                0
            };
            let mut admitted = budget.reserve(
                map_storage::<String, Children>(target)
                    .and_then(|n| n.checked_add(parent.len() + size_of::<EntityHandle>()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.children
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            let after = map_storage::<String, Children>(self.children.capacity())
                .ok_or(ExecutionError::Capacity)?;
            let parent = parent.to_owned();
            let kids = Children {
                items: vec![child],
                ..Children::default()
            };
            admitted.resize(after - before + parent.capacity() + size_of::<EntityHandle>())?;
            budget.fund_backing(&mut self._custody, admitted)?;
            self.children.insert(parent, kids);
        }
        self.exposure.insert(child, material);
        Ok(())
    }

    pub(crate) fn undo_add_item(
        &mut self,
        parent: &str,
        child: EntityHandle,
    ) -> Result<(), crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        let kids = self
            .children
            .get_mut(parent)
            .ok_or(ExecutionError::Invariant)?;
        let at = kids
            .items
            .iter()
            .position(|entry| *entry == child)
            .ok_or(ExecutionError::Invariant)?;
        kids.items.remove(at);
        if kids.items.is_empty() {
            let (key, kids) = self
                .children
                .shift_remove_entry(parent)
                .ok_or(ExecutionError::Invariant)?;
            let removed = key.capacity() + kids.items.capacity() * size_of::<EntityHandle>();
            self._custody.resize(
                self._custody
                    .bytes()
                    .checked_sub(removed)
                    .ok_or(ExecutionError::Invariant)?,
            )?;
        }
        self.exposure.remove(child);
        Ok(())
    }

    pub(crate) fn detach_loose_item(
        &mut self,
        parent: &str,
        child: EntityHandle,
    ) -> Result<RemovedInventoryChild, crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        let kids = self
            .children
            .get_mut(parent)
            .ok_or(ExecutionError::Invariant)?;
        let at = kids
            .items
            .iter()
            .position(|entry| *entry == child)
            .ok_or(ExecutionError::Invariant)?;
        if kids.equipped.contains(&child) {
            return Err(ExecutionError::Invariant);
        }
        if kids.items.len() > 1 {
            kids.items.remove(at);
            return Ok(RemovedInventoryChild {
                membership: RemovedMembership::Member(at),
                material: self.exposure.remove(child),
            });
        }
        let (key, kids) = self
            .children
            .get_key_value(parent)
            .ok_or(ExecutionError::Invariant)?;
        let bytes = key.capacity()
            + (kids.items.capacity() + kids.equipped.capacity()) * size_of::<EntityHandle>();
        let storage = self._custody.split_off(bytes)?;
        let (position, parent, children) = self
            .children
            .shift_remove_full(parent)
            .ok_or(ExecutionError::Invariant)?;
        Ok(RemovedInventoryChild {
            membership: RemovedMembership::Last { position, parent, children, storage },
            material: self.exposure.remove(child),
        })
    }

    pub(crate) fn restore_loose_item(
        &mut self,
        parent: &str,
        child: EntityHandle,
        removed: RemovedInventoryChild,
    ) -> Result<(), crate::execution::ExecutionError> {
        use crate::execution::ExecutionError;
        match removed.membership {
            RemovedMembership::Member(position) => {
                self.children
                    .get_mut(parent)
                    .ok_or(ExecutionError::Invariant)?
                    .items
                    .insert(position, child);
            }
            RemovedMembership::Last {
                position,
                parent,
                children,
                storage,
            } => {
                self._custody.merge(storage)?;
                self.children.shift_insert(position, parent, children);
            }
        }
        self.exposure.insert(child, removed.material);
        Ok(())
    }

    pub(crate) fn has_direct_item(
        &self,
        entities: &EntityStore,
        parent: &str,
        item: &Entity,
    ) -> bool {
        self.children.get(parent).is_some_and(|kids| {
            kids.items
                .binary_search_by(|handle| {
                    let existing = entities
                        .resolve(*handle)
                        .map_or("", |entity| entity.id.as_str());
                    crate::encoding::js_string_cmp(existing, &item.id)
                })
                .is_ok()
        })
    }

    pub(crate) fn detached_item_bytes(&self, parent: &str) -> usize {
        self.children
            .get_key_value(parent)
            .filter(|(_, kids)| kids.items.len() == 1)
            .map_or(0, |(key, kids)| {
                key.capacity()
                    + (kids.items.capacity() + kids.equipped.capacity()) * size_of::<EntityHandle>()
            })
    }

    pub(crate) fn has_children(&self, parent: &str) -> bool {
        self.children.contains_key(parent)
    }

    pub(crate) fn direct_items(&self, parent: &str) -> &[EntityHandle] {
        self.children
            .get(parent)
            .map_or(&[], |kids| kids.items.as_slice())
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
        physical: &'a crate::simulation::PhysicalState,
        definitions: &'a RetainedDefinitions,
        actor: &str,
        parent: &str,
        visit: &mut impl FnMut(OwnedItem<'a>) -> Result<(), ExecutionError>,
    ) -> Result<(), ExecutionError> {
        self.visit_owned_until(&physical.entities, actor, parent, &mut |entity, accessible| {
            visit(project_owned(definitions, actor, entity, accessible, physical.holds.quantity(&entity.id))?)?;
            Ok(false)
        }).map(|_| ())
    }

    /// Visit affected stock in original order, without reading the rest once
    /// the caller has completed its bounded exact selection.
    pub(crate) fn visit_owned_until<'a>(
        &'a self,
        entities: &'a EntityStore,
        actor: &str,
        parent: &str,
        visit: &mut impl FnMut(&'a Entity, bool) -> Result<bool, ExecutionError>,
    ) -> Result<bool, ExecutionError> {
        for entity in self.children(entities, parent, false) {
            let accessible = accessible_bag(entity, actor);
            if visit(entity, accessible)?
                || (accessible && self.visit_owned_until(entities, actor, &entity.id, visit)?)
            {
                return Ok(true);
            }
        }
        Ok(false)
    }
}

/// Bind one exact shortcut in work proportional to its depth. Knowing the ID
/// of a lot in somebody else's or a restricted bag cannot open that bag.
pub(crate) fn owned_by<'a>(
    physical: &'a crate::simulation::PhysicalState,
    definitions: &'a RetainedDefinitions,
    actor: &str,
    id: &str,
) -> Result<Option<OwnedItem<'a>>, ExecutionError> {
    owned_item_ancestry(physical, actor, id, |_| {})?
        .map(|entity| {
            project_owned(
                definitions,
                actor,
                entity,
                accessible_bag(entity, actor),
                physical.holds.quantity(id),
            )
        })
        .transpose()
}

pub(crate) fn inventory_ancestor_limit() -> usize {
    LIMITS.maximum_depth + 1
}

/// Read the exact live item and its accessible enclosing bags. Parents are
/// visited nearest first, excluding the actor. Only success with the required
/// actor root permits any of the visited facts to be used.
pub(crate) fn owned_item_ancestry<'a>(
    physical: &'a crate::simulation::PhysicalState,
    actor: &str,
    id: &str,
    mut parent_bag: impl FnMut(&'a Entity),
) -> Result<Option<&'a Entity>, ExecutionError> {
    let entities = &physical.entities;
    let Some(entity) = entities
        .get(id)
        .filter(|entity| entity.item.is_some() && entity.retirement.is_none())
    else {
        return Ok(None);
    };
    let mut parent = parent_id(entity);
    for _ in 0..inventory_ancestor_limit() {
        let Some(current) = parent else {
            return Ok(None);
        };
        if current == actor {
            return Ok(Some(entity));
        }
        let Some(container) = entities
            .get(current)
            .filter(|body| body.retirement.is_none() && accessible_bag(body, actor))
        else {
            return Ok(None);
        };
        parent_bag(container);
        parent = parent_id(container);
    }
    Err(ExecutionError::Invariant)
}

pub(crate) fn accessible_bag(entity: &Entity, actor: &str) -> bool {
    entity.container.as_ref().is_some_and(|bag| {
        bag.access
            .as_ref()
            .is_none_or(|access| access.actors.iter().any(|id| id == actor))
    })
}

pub(crate) fn project_owned<'a>(
    definitions: &'a RetainedDefinitions,
    actor: &str,
    entity: &'a Entity,
    accessible: bool,
    held: u64,
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
        available_quantity: lot.quantity.saturating_sub(held),
        equipped,
        individual: lot.individuality == Individuality::Individual,
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
    has_lineage: bool,
    through: f64,
    entities: &EntityStore,
    definitions: &RetainedDefinitions,
    pile_kind: &str,
    budget: &ByteBudget,
) -> Result<Inventory, InstallError> {
    let lineage = take_collection(
        import,
        "sim_object_lineage",
        "[\"world\"]",
        has_lineage,
        false,
    )?;
    for row in lineage.rows {
        crate::install::rows::validate_map_row(
            &row,
            "[\"world\"]",
            "objectLineage",
            &row.slot,
            lineage.coverage.next_ordinal,
        )?;
        let _parse = crate::install::reserve_typed_parse::<crate::state::ObjectLineage>(
            &row.payload,
            0,
            None,
            budget,
        )?;
        let item: crate::state::ObjectLineage =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let [source, target] = row.extra.as_slice() else {
            return Err(InstallError::CurrentFormat);
        };
        if row.slot != item.id
            || !item.valid(through)
            || source.as_str() != Some(item.source_id.as_str())
            || match &item.target_id {
                Some(id) => target.as_str() != Some(id.as_str()),
                None => !matches!(target, crate::records::SqlCell::Null),
            }
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    let mut children = IndexMap::<String, Children>::new();
    let mut exposure = StockExposure::new(budget).map_err(|_| InstallError::Capacity)?;
    let mut storage = budget.reserve(0).map_err(|_| InstallError::Capacity)?;
    // The startup scratch admits the index's backing before each new key and
    // child. Final custody reflects only the maps and slices actually retained.
    for id in entities.ordered_ids() {
        let entity = entities.get(id).ok_or(InstallError::CurrentFormat)?;
        validate_item(entities, definitions, entity)?;
        if let Some(claim) = entity.item.as_ref().and_then(|lot|lot.assembly_claim.as_ref()) {
            let root = entities.get(&claim.root_id).and_then(|root|root.assembly.as_ref()).ok_or(InstallError::CurrentFormat)?;
            root.validate_material(entity, definitions, pile_kind, entities)?;
        }
        if let Some(parent_id) = parent_id(entity) {
            let parent = entities.get(parent_id).ok_or(InstallError::CurrentFormat)?;
            let lot = entity.item.as_ref().ok_or(InstallError::CurrentFormat)?;
            let material = MaterialPresence::of(entity, definitions.items[&lot.definition_pin.id].exposure.as_ref())
                .map_err(|_| InstallError::CurrentFormat)?;
            exposure.prepare_insert(material, budget).map_err(|_| InstallError::Capacity)?;
            exposure.insert(entities.handle(id).ok_or(InstallError::CurrentFormat)?, material);
            if let Some(structure) = &parent.assembly {
                // Structural parts are attached at a single physical slot. They
                // aren't equipped possessions, so never enter bag/hand indexes.
                structure.installed_part(entities, parent_id, id).ok_or(InstallError::CurrentFormat)?;
                continue;
            }
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
                    || !equipment.fits(body)
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
        lineage: lineage.coverage,
        exposure,
        children,
        _custody: budget
            .adopt_backing(storage)
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

pub(crate) fn parent_id(entity: &Entity) -> Option<&str> {
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

pub(crate) fn validate_item(
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
    if lot.material_contribution_ids.as_ref().is_some_and(|ids| ids.is_empty()
        || ids.len() > crate::construction_gather::material_origin_limit()
        || ids.iter().enumerate().any(|(i,id)| !is_safe_record_id(id) || ids[..i].contains(id))) {
        return Err(InstallError::CurrentFormat);
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
