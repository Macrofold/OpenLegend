//! A selected installed hearth. Geometry, exact material custody and placement
//! permission are separate owners. This module retains the definition and the
//! action's genuine dependencies in the current saved format.
use crate::host::retained_size::heap_record;
use crate::install::{InstallError, ItemDefinitionRead};
use crate::state::{Point, SurfacePoint};
use crate::text::JsText;
use crate::values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
mod materials;
pub(crate) mod site;
pub(crate) use materials::{MaterialSelection, current_problem, select_materials};
use serde::{Deserialize, Serialize};

pub(crate) fn valid_plan(pin: &DefinitionPin, site: &SurfacePoint) -> bool {
    pin.is_valid()
        && is_safe_record_id(&site.surface_id)
        && [site.x, site.y, site.z].into_iter().all(f64::is_finite)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Definition {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    implementation: Implementation,
    pub name: JsText,
    pub description: JsText,
    pub action_label: JsText,
    pub activity_text: JsText,
    pub completed_text: JsText,
    pub help: JsText,
    pub radius_metres: f64,
    pub height_metres: f64,
    pub clearance_height_metres: f64,
    pub maximum_height_difference_metres: f64,
    pub terrain_only: bool,
    pub work_seconds: f64,
    pub input: Material,
}

#[derive(Debug, Deserialize)]
enum Implementation {
    #[serde(rename = "campfire-ring")]
    CampfireRing,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Material {
    pub definition: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

pub(crate) struct InstalledHearth {
    pub pin: DefinitionPin,
    pub definition: Definition,
}

impl Definition {
    pub(crate) fn install(
        self,
        id: &str,
        canonical: &str,
        items: &IndexMap<String, ItemDefinitionRead>,
        maximum_extent: f64,
    ) -> Result<InstalledHearth, InstallError> {
        let pin = DefinitionPin {
            id: self.id.clone(),
            version: self.version,
            digest: crate::encoding::content_label(canonical),
        };
        if pin.id != id
            || !pin.is_valid()
            || !matches!(self.implementation, Implementation::CampfireRing)
            || ![
                &self.name,
                &self.description,
                &self.action_label,
                &self.activity_text,
                &self.completed_text,
                &self.help,
            ]
            .into_iter()
            .all(|text| !text.trim_is_empty() && text.units_len() <= 2000)
            || !(0.0 < self.radius_metres && self.radius_metres <= maximum_extent)
            || !(0.0 < self.height_metres && self.height_metres <= self.clearance_height_metres)
            || self.clearance_height_metres > maximum_extent
            || !(0.0 <= self.maximum_height_difference_metres
                && self.maximum_height_difference_metres.is_finite())
            || !(0.0 < self.work_seconds && self.work_seconds <= 86400.0)
            || !(1..=crate::stock_transfer::limits().moved_lots as u64).contains(&self.input.quantity)
            || !items.get(&self.input.definition.id).is_some_and(|item| {
                item.pin == self.input.definition && item.tracks_material_origins
            })
        {
            return Err(InstallError::DefinitionBody);
        }
        Ok(InstalledHearth {
            pin,
            definition: self,
        })
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlacedHearth {
    pub definition: DefinitionPin,
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub action_id: String,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Binding {
    pub definition: DefinitionPin,
    pub site: SurfacePoint,
    pub point: Point,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub stones: Vec<Stone>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Stone {
    pub item_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
    pub origin_ids: Vec<String>,
}

impl PlacedHearth {
    pub(crate) fn valid(&self, entity: &crate::state::Entity, installed: &InstalledHearth) -> bool {
        // The accepted construction record is historical. Its builder need
        // not still exist or have access to the site after construction.
        self.definition == installed.pin
            && is_safe_record_id(&self.actor_id)
            && is_safe_record_id(&self.action_id)
            && entity.kind == "campfire"
            && entity.heat.is_some()
            && entity.supported_position().is_some()
            && entity.spatial.body.radius == installed.definition.radius_metres
            && entity.spatial.body.height == installed.definition.height_metres
    }
}

heap_record!(Definition {
    id,
    name,
    description,
    action_label,
    activity_text,
    completed_text,
    help,
    input
});
heap_record!(Material { definition });
heap_record!(InstalledHearth { pin, definition });
heap_record!(PlacedHearth {
    definition,
    actor_id,
    action_id
});
heap_record!(Binding {
    definition,
    site,
    stones
});
heap_record!(Stone {
    item_id,
    origin_ids
});

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Messages {
    pub available: crate::worlds::InstalledActionMessage,
    pub unavailable_definition: crate::worlds::InstalledActionMessage,
    pub activity: ActivityCopy,
    pub unavailable: crate::worlds::InstalledActionMessage,
    pub not_visible: crate::worlds::InstalledActionMessage,
    pub support: crate::worlds::InstalledActionMessage,
    pub blocked: crate::worlds::InstalledActionMessage,
    pub occupied: crate::worlds::InstalledActionMessage,
    pub scan_incomplete: crate::worlds::InstalledActionMessage,
    pub permission: crate::worlds::InstalledActionMessage,
    pub stance: crate::worlds::InstalledActionMessage,
    pub changed: crate::worlds::InstalledActionMessage,
    pub changed_material: crate::worlds::InstalledActionMessage,
    pub changed_stance: crate::worlds::InstalledActionMessage,
    pub missing_grant: JsText,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityCopy {
    pub material_name: JsText,
    pub material_suffix: JsText,
    pub work_name: JsText,
    pub work_suffix: JsText,
    pub placement_name: JsText,
}

pub(crate) fn messages() -> &'static Messages {
    static MESSAGES: std::sync::LazyLock<Messages> = std::sync::LazyLock::new(|| {
        serde_json::from_str(include_str!(
            "../../../packages/domain/src/hearth-placement-messages.json"
        ))
        .expect("shared hearth placement messages")
    });
    &MESSAGES
}

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PlacementPresentation {
    host: DefinitionPin,
    pub icon: String,
    pub label: JsText,
}
heap_record!(PlacementPresentation { host, icon, label });

pub(crate) struct InstalledPlacement {
    pub presentation: PlacementPresentation,
    _custody: crate::host::ResidentReservation,
}

impl InstalledPlacement {
    pub(crate) fn install(
        input: crate::install::CanonicalInput,
        manifest: &crate::install::AuthoredManifest,
        budget: &crate::host::ByteBudget,
    ) -> Result<Self, InstallError> {
        use crate::host::retained_size::HeapBytes;
        let _parse = crate::install::reserve_typed_parse::<PlacementPresentation>(
            &input.canonical,
            0,
            None,
            budget,
        )?;
        let presentation: PlacementPresentation =
            serde_json::from_str(&input.canonical).map_err(|_| InstallError::DefinitionBody)?;
        input.verify(&presentation)?;
        if !manifest.activity_hosts.contains(&presentation.host)
            || !is_safe_record_id(&presentation.icon)
            || presentation.label.trim_is_empty()
        {
            return Err(InstallError::DefinitionBody);
        }
        let custody = budget
            .reserve_record(presentation.heap_bytes().ok_or(InstallError::Capacity)?)
            .map_err(|_| InstallError::Capacity)?;
        Ok(Self {
            presentation,
            _custody: custody,
        })
    }
}

/// Check the imported action against its exact same-format active claim rows.
/// No current permission comes from those rows; startup reconciles it separately.
pub(crate) fn valid_saved(
    physical: &crate::simulation::PhysicalState,
    installed: &crate::simulation::InstalledWorld,
    actor: &crate::state::Entity,
    action: &crate::state::Action,
) -> bool {
    let (Some(work), Some(grant), Some(stance)) = (
        action.hearth_work.as_ref(),
        action.construction_grant.as_ref(),
        action.destination.as_ref(),
    ) else {
        return false;
    };
    let Some(meaning) = installed
        .retained
        .hearths
        .get(&work.definition.id)
        .filter(|meaning| meaning.pin == work.definition)
    else {
        return false;
    };
    let definition = &meaning.definition;
    let finite = |point: Point| [point.x, point.y, point.z].into_iter().all(f64::is_finite);
    if installed.hearth_placement.is_none()
        || action.total_seconds != definition.work_seconds
        || !matches!(action.stage.as_str(), "working" | "approaching")
        || (action.stage == "working" && (!action.path.is_empty() || action.navigation.is_some()))
        || !is_safe_record_id(&grant.id)
        || grant.revision == 0
        || !is_safe_record_id(&work.site.surface_id)
        || !finite(work.site.point())
        || !finite(work.point)
        || !finite(stance.point())
        || stance.surface_id != work.site.surface_id
        || installed
            .geometry
            .spatial
            .surfaces
            .iter()
            .all(|surface| surface.id != work.site.surface_id)
        || actor.physical_life().unwrap_or_default() != work.physical_life
        || work.stones.is_empty()
        || work.stones.len() > crate::stock_transfer::limits().moved_lots
    {
        return false;
    }
    let mut total = 0u64;
    for (index, stone) in work.stones.iter().enumerate() {
        if !is_safe_record_id(&stone.item_id)
            || stone.quantity == 0
            || stone.origin_ids.is_empty()
            || work.stones[..index]
                .iter()
                .any(|other| other.item_id == stone.item_id)
            || stone
                .origin_ids
                .iter()
                .enumerate()
                .any(|(at, id)| !is_safe_record_id(id) || stone.origin_ids[..at].contains(id))
            || !physical.holds.matches(
                &actor.id,
                &action.id,
                index,
                stone,
                &definition.input.definition,
            )
        {
            return false;
        }
        let Some(lot) = physical
            .entities
            .get(&stone.item_id)
            .and_then(|entity| entity.item.as_ref())
        else {
            return false;
        };
        if lot.definition_pin != definition.input.definition
            || lot.material_origin_ids.as_ref() != Some(&stone.origin_ids)
        {
            return false;
        }
        let Some(next) = total.checked_add(stone.quantity) else {
            return false;
        };
        total = next;
    }
    total == definition.input.quantity
}
