//! One installed practice action for the selected, currently visible target.
use super::*;
use openlegend_simulation::runtime::RuntimePracticeOffer;
use resources::{Batch, Choice, Command, Intent};

pub(super) const CATEGORY: &str = "Practice";

pub(super) fn render(
    target: &str,
    offer: RuntimePracticeOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    choices(target, &offer, controlling, budget)?.render(offer.sequence, budget)
}

pub(super) fn choices(
    target: &str,
    offer: &RuntimePracticeOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Batch, RuntimeError> {
    let reason = if !controlling {
        Some(TAKE_CONTROL)
    } else if offer.paused {
        Some(RESUME_WORLD)
    } else {
        offer.reason
    };
    let weapon = offer.weapon.unwrap_or("missing");
    let bytes = target
        .len()
        .checked_mul(3)
        .and_then(|n| n.checked_add(weapon.len().checked_mul(2)?))
        .and_then(|n| n.checked_add(offer.ammunition.map_or(0, str::len)))
        .and_then(|n| n.checked_add(offer.label.len().checked_mul(2)?))
        .and_then(|n| n.checked_add(offer.description.storage_bytes().checked_mul(2)?))
        .and_then(|n| n.checked_add(reason.map_or(0, str::len)))
        .and_then(|n| n.checked_add(CATEGORY.len() + "practice::".len()))
        .ok_or(CapacityError)?;
    let mut batch = Batch::prepare(CATEGORY, 1, bytes, budget)?;
    batch.choices.push(Choice {
        id: format!("practice:{target}:{weapon}"),
        label: offer.label.into(),
        category: CATEGORY.to_owned(),
        target_id: target.to_owned(),
        description: offer.description.clone(),
        keywords: [offer.description.clone(), offer.label.into()],
        enabled: reason.is_none(),
        reason: reason.map(JsText::from),
        intent: Intent::Command {
            command: Command {
                kind: "practice-shot",
                target_id: target.to_owned(),
                item_id: offer.weapon.map(str::to_owned),
                ammunition_id: offer.ammunition.map(str::to_owned),
            },
        },
        item_id: None,
        pickup_limit: None,
        facts: None,
    });
    Ok(batch)
}
