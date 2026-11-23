//! An installed item profile and a loan from one current equipment read.

use super::{EquipmentUse, ItemDefinitionRead, RetainedDefinitions};
use crate::state::{Entity, EntityStore, Placement};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MeleeProfile {
    pub damage: f64,
    pub accuracy: f64,
    pub range: f64,
    pub approach_range: f64,
    pub windup_seconds: f64,
    pub recovery_seconds: f64,
}

impl MeleeProfile {
    pub(super) fn valid(&self) -> bool {
        self.damage.is_finite()
            && self.damage >= 0.0
            && (0.0..=1.0).contains(&self.accuracy)
            && self.range.is_finite()
            && self.range > 0.0
            && self.approach_range > 0.0
            && self.approach_range <= self.range
            && self.windup_seconds.is_finite()
            && self.windup_seconds > 0.0
            && self.recovery_seconds.is_finite()
            && self.recovery_seconds > 0.0
    }
}

impl ItemDefinitionRead {
    /// Nominal facts for a locally available candidate. A profile alone does
    /// not permit use, and this read does not establish present attachment.
    pub(crate) fn melee_profile(&self) -> Option<&MeleeProfile> {
        self.equipment
            .as_ref()
            .filter(|equipment| equipment.uses.contains(&EquipmentUse::Melee))
            .and(self.melee.as_ref())
    }
}

/// Read the exact live item and its current definition. A direct attachment
/// needs no bag traversal. `wearer` belongs to the same state cut as `entities`.
/// Both returns are borrowed and may be reused only within that cut.
/// See docs/targeted-actions.md#equipped-contact-strikes.
pub(crate) fn equipped_melee<'a>(
    entities: &'a EntityStore,
    definitions: &'a RetainedDefinitions,
    wearer: &Entity,
    item_id: &str,
) -> Option<(&'a ItemDefinitionRead, &'a MeleeProfile)> {
    let body = wearer.actor.as_ref()?.body.as_ref()?;
    let item = entities
        .get(item_id)
        .filter(|item| item.retirement.is_none())?;
    let Placement::Attached {
        parent_entity_id,
        port_id,
        ..
    } = item.placement.as_ref()?
    else {
        return None;
    };
    if parent_entity_id != &wearer.id {
        return None;
    }
    let lot = item.item.as_ref()?;
    let definition = definitions.items.get(&lot.definition_pin.id)?;
    let equipment = definition.equipment.as_ref()?;
    if definition.pin != lot.definition_pin
        || equipment.ports.first() != Some(port_id)
        || !equipment.fits(body)
    {
        return None;
    }
    Some((definition, definition.melee_profile()?))
}
