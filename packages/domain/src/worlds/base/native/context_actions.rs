//! Base selects the preferred family and ranks its existing exact menu rows.
use crate::{
    combat_encounters::EncounterFamily,
    install::{EquipmentUse, ItemDefinitionRead},
};
use serde::Deserialize;
use std::{collections::BTreeMap, sync::LazyLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Ranks {
    priority: BTreeMap<String, u32>,
    equipped_use_order: Vec<EquipmentUse>,
    equipped_action_order: Vec<String>,
    speak: u32,
    combat: CombatRanks,
    unavailable_label: String,
    unavailable_description: String,
    recovery_text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CombatRanks {
    base: u32,
    release: u32,
    exact: u32,
    equipped_contact: u32,
    unarmed_contact: u32,
}

static RANKS: LazyLock<Ranks> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../config/context-actions.json"))
        .expect("Base contextual action ranking is a shipped build input")
});

pub(crate) fn family(speak: bool, held: bool, combat: bool) -> EncounterFamily {
    if speak {
        EncounterFamily::Speak
    } else if held {
        EncounterFamily::Release
    } else if combat {
        EncounterFamily::Attack
    } else {
        EncounterFamily::Ordinary
    }
}

#[derive(Clone, Copy)]
pub enum Choice<'a> {
    Speak,
    Release,
    Strike {
        exact: bool,
        equipped: bool,
        carried: bool,
    },
    Ranged {
        kind: &'a str,
        exact: bool,
        carried: bool,
    },
}

/// The installed world's held-tool shortcut compares only already-equipped
/// items. A lower rank is preferred; existing attachment order breaks ties.
pub(crate) fn equipped_use_rank(profile: (&str, u64), item: &ItemDefinitionRead) -> Option<usize> {
    if !matches!(profile, ("grounded-wilderness", 1)) {
        return None;
    }
    RANKS
        .equipped_use_order
        .iter()
        .position(|uses| item.equips_for(*uses))
}

/// Choose among the exact held item's already-permitted target actions. The
/// caller still owns the current component's scope, tool and eligibility.
pub fn equipped_action_rank(kind: &str) -> Option<usize> {
    RANKS
        .equipped_action_order
        .iter()
        .position(|allowed| allowed == kind)
}

pub fn unavailable() -> (&'static str, &'static str) {
    (&RANKS.unavailable_label, &RANKS.unavailable_description)
}

pub(crate) fn recovering() -> &'static str {
    &RANKS.recovery_text
}

/// Only the previously chosen family contributes a default. A disabled row
/// remains eligible here, letting availability explain the exact action.
pub fn rank(family: EncounterFamily, choice: Choice<'_>) -> Option<u32> {
    use EncounterFamily::*;
    match choice {
        Choice::Speak => matches!(family, Speak | Ordinary).then_some(RANKS.speak),
        Choice::Release => (family == Release)
            .then(|| RANKS.combat.base + RANKS.combat.release + RANKS.priority["release-shot"]),
        Choice::Strike {
            exact,
            equipped,
            carried,
        } if matches!(family, Attack | Ordinary) && (exact || !carried) => {
            let method = if exact {
                RANKS.combat.exact
            } else if equipped {
                RANKS.combat.equipped_contact
            } else {
                RANKS.combat.unarmed_contact
            };
            Some(
                RANKS.priority["strike"]
                    + if family == Attack {
                        RANKS.combat.base + method
                    } else {
                        0
                    },
            )
        }
        Choice::Ranged {
            kind,
            exact,
            carried,
        } if matches!(family, Attack | Ordinary) && (exact || !carried) => Some(
            *RANKS.priority.get(kind)?
                + if family == Attack {
                    RANKS.combat.base + if exact { RANKS.combat.exact } else { 0 }
                } else {
                    0
                },
        ),
        _ => None,
    }
}
