//! Scoped menu wording for a selected, already matched practice target.
use super::*;
use crate::narration::{NameArticle, name_phrase};
use crate::projectile::practice::practice_choice;
use crate::simulation::SimulationState;
use crate::state::{Entity, Named};
use crate::text::{JsText, TextRef, substitute_fields, substituted_fields_bound};

pub struct RuntimePracticeOffer<'a> {
    pub sequence: u64,
    pub label: &'a str,
    pub description: &'a JsText,
    pub weapon: Option<&'a str>,
    pub ammunition: Option<&'a str>,
    pub reason: Option<&'a str>,
    pub paused: bool,
}

pub(super) fn offer<T>(
    state: &SimulationState,
    actor: &str,
    observed_name: &Named,
    target: &Entity,
    equipment: Option<&str>,
    budget: &ByteBudget,
    render: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
) -> Result<T, RuntimeError> {
    let entity = state
        .physical
        .entities
        .get(actor)
        .ok_or_else(|| failure("missing practice actor"))?;
    let choice = practice_choice(state, entity, target, equipment, None, None)
        .map_err(failure)?
        .ok_or_else(|| failure("missing installed practice target"))?;
    let profile = choice.profile;
    let words = &profile.presentation;
    let workspace = observed_name
        .name
        .storage_bytes()
        .checked_add(
            choice
                .weapon
                .map_or(0, |(_, item)| item.named.name.storage_bytes()),
        )
        .and_then(|n| n.checked_mul(6))
        .and_then(|n| n.checked_add(2048))
        .ok_or(CapacityError)?;
    let mut custody = budget.reserve(workspace)?;
    let mut enlarge = |amount: Option<usize>| -> Result<(), CapacityError> {
        custody.resize(
            custody
                .bytes()
                .checked_add(amount.ok_or(CapacityError)?)
                .ok_or(CapacityError)?,
        )
    };
    let target_name = name_phrase(observed_name, NameArticle::Definite, false);
    let tool = if let Some((_, tool)) = choice.weapon {
        let fields = [("toolName", TextRef::from(&tool.named.name))];
        enlarge(substituted_fields_bound(&words.selected_tool, &fields))?;
        substitute_fields(&words.selected_tool, &fields)
    } else {
        words.missing_tool.as_str().into()
    };
    let chance = if let Some(handling) = choice.handling {
        let percent = crate::encoding::json_record(&(100.0 * handling.accuracy)).map_err(failure)?;
        let fields = [("accuracyPercent", TextRef::from(percent.as_str()))];
        enlarge(substituted_fields_bound(&words.target_chance, &fields))?;
        substitute_fields(&words.target_chance, &fields)
    } else {
        JsText::from("")
    };
    let seconds = crate::encoding::json_record(&profile.windup_seconds).map_err(failure)?;
    let fields = [
        ("label", TextRef::from(profile.practice_label.as_str())),
        ("target", TextRef::from(&target_name)),
        ("tool", TextRef::from(&tool)),
        ("windupSeconds", TextRef::from(seconds.as_str())),
        ("chance", TextRef::from(&chance)),
        ("scope", TextRef::from(profile.scope.as_str())),
    ];
    enlarge(substituted_fields_bound(
        &words.practice_description,
        &fields,
    ))?;
    let description = substitute_fields(&words.practice_description, &fields);
    render(RuntimeResourceOffer::Practice(RuntimePracticeOffer {
        sequence: state.physical.header.sequence,
        paused: state.physical.header.paused,
        label: &profile.practice_label,
        description: &description,
        weapon: choice.weapon.map(|(lot, _)| lot.id),
        ammunition: choice.ammunition.map(|(lot, _)| lot.id),
        reason: choice.reason,
    }))
}
