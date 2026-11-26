//! An observed pile offers only still-present portable lots and their current amounts.
use super::*;
use openlegend_simulation::runtime::RuntimePickupOffer;
use resources::{Batch, Choice, Command, Intent};

pub(super) fn render(
    target: &str,
    offer: RuntimePickupOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    choices(target, &offer, controlling, budget)?.render(offer.sequence, budget)
}

pub(super) fn choices(
    target: &str,
    offer: &RuntimePickupOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Batch, RuntimeError> {
    let reason = if controlling {
        offer.reason
    } else {
        Some(TAKE_CONTROL)
    };
    let multiple = offer.items.len() > 1;
    let all = multiple && offer.all_available;
    let common = offer
        .label
        .len()
        .checked_mul(2)
        .and_then(|n| n.checked_add(offer.all_label.len()))
        .and_then(|n| n.checked_add(target.len().checked_mul(3)?))
        .and_then(|n| n.checked_add(reason.map_or(0, str::len)))
        .ok_or(CapacityError)?;
    let all_bytes = if all {
        common
            .checked_add(offer.all_label.len())
            .and_then(|n| n.checked_add(offer.all_description.len()))
            .and_then(|n| n.checked_add("pickup-all-".len()))
            .ok_or(CapacityError)?
    } else {
        0
    };
    let bytes = offer
        .items
        .iter()
        .try_fold(all_bytes, |sum, item| {
            sum.checked_add(common)?
                .checked_add(item.id.len().checked_mul(3)?)?
                .checked_add(item.name.storage_bytes().checked_mul(13)?)?
                .checked_add(offer.label.len())?
                .checked_add(48)
        })
        .ok_or(CapacityError)?;
    let count = offer
        .items
        .len()
        .checked_add(usize::from(all))
        .ok_or(CapacityError)?;
    let mut batch = Batch::prepare(offer.label, count, bytes, budget)?;
    let choice = |id, label, description, item_id: Option<&str>, pickup_limit| Choice {
        id,
        label,
        category: offer.label.to_owned(),
        description,
        keywords: [offer.label.into(), offer.all_label.into()],
        target_id: target.to_owned(),
        item_id: item_id.map(str::to_owned),
        pickup_limit,
        facts: None,
        enabled: reason.is_none(),
        reason: reason.map(JsText::from),
        intent: Intent::Command {
            command: Command {
                kind: "pickup",
                target_id: target.to_owned(),
                item_id: item_id.map(str::to_owned),
                ammunition_id: None,
            },
        },
    };
    if all {
        batch.choices.push(choice(
            format!("pickup-all-{target}"),
            offer.all_label.into(),
            offer.all_description.into(),
            None,
            None,
        ));
    }
    for item in offer.items {
        let label = if multiple {
            JsText::concat(&[item.name, &format!(" × {}", item.quantity).into()])
        } else {
            offer.label.into()
        };
        batch.choices.push(choice(
            format!("pickup-{}", item.id),
            label,
            item.name.clone(),
            Some(item.id),
            item.partial_limit,
        ));
    }
    Ok(batch)
}
