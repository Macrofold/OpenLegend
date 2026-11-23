//! A synchronous contact definition read shared by preparation and impact.

use crate::commands::NativeCommand;
use crate::execution::{ExecutionError, equipment_can_equip};
use crate::host::ByteBudget;
use crate::install::{ItemDefinitionRead, MeleeProfile, equipped_melee};
use crate::simulation::{InstalledWorld, SimulationState};
use crate::state::{Action, Entity, EntityStore};
use crate::worlds::base_decision_offers::{NativeStrikeRead, StrikePreparationRead};

#[derive(Clone, Copy)]
pub(crate) struct ContactRead<'a> {
    pub id: &'a str,
    pub version: u64,
    pub damage: f64,
    pub range: f64,
    pub approach_range: Option<f64>,
    pub work_seconds: f64,
    pub recovery_seconds: Option<f64>,
    pub accuracy: Option<f64>,
    pub auto_move_to_range: bool,
    pub preparation_motion: Option<&'a StrikePreparationRead>,
    pub kind: ContactKind<'a>,
}

#[derive(Clone, Copy)]
pub(crate) enum ContactKind<'a> {
    Natural(&'a NativeStrikeRead),
    Equipped {
        item_id: &'a str,
        definition: &'a ItemDefinitionRead,
    },
}

impl<'a> From<&'a NativeStrikeRead> for ContactRead<'a> {
    fn from(strike: &'a NativeStrikeRead) -> Self {
        Self {
            id: &strike.id,
            version: strike.version,
            damage: strike.damage,
            range: strike.range,
            approach_range: strike.approach_range,
            work_seconds: strike.work_seconds,
            recovery_seconds: strike.recovery_seconds,
            accuracy: strike.accuracy,
            auto_move_to_range: strike.auto_move_to_range,
            preparation_motion: strike.preparation_motion.as_ref(),
            kind: ContactKind::Natural(strike),
        }
    }
}

impl<'a> ContactRead<'a> {
    /// Resolve the exact intended weapon through the common equipment
    /// prerequisites when this request explicitly prepares to equip it.
    pub(crate) fn command(
        state: &'a SimulationState,
        source: &Entity,
        command: &'a NativeCommand,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let NativeCommand::Strike {
            definition_id,
            weapon_item_id,
            auto_equip,
            ..
        } = command
        else {
            return Err(ExecutionError::Invariant);
        };
        let read = Self::select(
            &state.installed,
            &state.physical.entities,
            source,
            definition_id,
            weapon_item_id.as_deref(),
        );
        if *auto_equip != Some(true) || weapon_item_id.is_none() {
            return Ok(read);
        }
        let Some(item) = weapon_item_id
            .as_ref()
            .and_then(|id| state.physical.entities.get(id))
        else {
            return Ok(None);
        };
        if let Some(read) = read {
            return Ok(equipment_can_equip(state, source, item, true, budget)?.then_some(read));
        }
        let read = Self::carried(state, source, item, budget)?;
        Ok(read.filter(|read| read.id == definition_id))
    }

    pub(crate) fn carried(
        state: &'a SimulationState,
        source: &Entity,
        item: &'a Entity,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(lot) = item.item.as_ref() else {
            return Ok(None);
        };
        let Some(definition) = state
            .installed
            .retained
            .items
            .get(&lot.definition_pin.id)
            .filter(|definition| definition.pin == lot.definition_pin)
        else {
            return Ok(None);
        };
        let Some(profile) = definition.melee_profile() else {
            return Ok(None);
        };
        let Some(read) = Self::weapon(&state.installed, source, &item.id, definition, profile)
        else {
            return Ok(None);
        };
        Ok(equipment_can_equip(state, source, item, true, budget)?.then_some(read))
    }

    /// Read one exact equipped lot or one installed natural strike. This
    /// borrows the selected state. Eligibility and targets are checked by
    /// the caller through the ordinary contact owner.
    pub(crate) fn select(
        installed: &'a InstalledWorld,
        entities: &'a EntityStore,
        source: &Entity,
        definition_id: &str,
        item_id: Option<&'a str>,
    ) -> Option<Self> {
        let Some(item_id) = item_id else {
            return super::profile(installed, source, definition_id).map(Self::from);
        };
        let read = Self::equipped(installed, entities, source, item_id)?;
        (read.id == definition_id).then_some(read)
    }

    /// Synchronous equivalent of checking a listed exact equipped strike.
    pub(crate) fn equipped(
        installed: &'a InstalledWorld,
        entities: &'a EntityStore,
        source: &Entity,
        item_id: &'a str,
    ) -> Option<Self> {
        let (definition, profile) = equipped_melee(entities, &installed.retained, source, item_id)?;
        Self::weapon(installed, source, item_id, definition, profile)
    }

    fn weapon(
        installed: &InstalledWorld,
        source: &Entity,
        item_id: &'a str,
        definition: &'a ItemDefinitionRead,
        profile: &MeleeProfile,
    ) -> Option<Self> {
        let actor = source.actor.as_ref()?;
        let body = actor.body.as_ref()?;
        if !matches!(actor.controller.as_str(), "player" | "npc")
            || super::motion::support_parts(source).is_none()
        {
            return None;
        }
        let id = definition.pin.id.as_str();
        let allowed_body = installed
            .occurrence_rules
            .value()
            .response
            .offers
            .natural_strike_body_plans
            .contains(&body.plan)
            || actor
                .natural_strike_ids
                .as_ref()
                .is_some_and(|ids| ids.contains(&definition.pin.id));
        allowed_body.then_some(Self {
            id,
            version: definition.pin.version,
            damage: profile.damage,
            range: profile.range,
            approach_range: Some(profile.approach_range),
            work_seconds: profile.windup_seconds,
            recovery_seconds: Some(profile.recovery_seconds),
            accuracy: Some(profile.accuracy),
            auto_move_to_range: true,
            preparation_motion: None,
            kind: ContactKind::Equipped {
                item_id,
                definition,
            },
        })
    }

    /// Rebind the exact current equipment and installed pin from saved work.
    pub(crate) fn action(
        installed: &'a InstalledWorld,
        entities: &'a EntityStore,
        source: &Entity,
        action: &'a Action,
    ) -> Option<Self> {
        let read = Self::select(
            installed,
            entities,
            source,
            action.definition_id.as_deref()?,
            action.weapon_item_id.as_deref(),
        )?;
        let digest = match read.kind {
            ContactKind::Natural(_) => None,
            ContactKind::Equipped { definition, .. } => Some(definition.pin.digest.as_str()),
        };
        (action.definition_version == Some(read.version)
            && action.contact_weapon_digest.as_deref() == digest)
            .then_some(read)
    }
}
