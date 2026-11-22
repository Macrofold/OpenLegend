//! An observed pile offers only still-present portable lots and their current amounts.
use super::*;
use openlegend_simulation::runtime::RuntimePickupOffer;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Action<'a> {
    id: String,
    label: JsText,
    category: &'a str,
    description: &'a JsText,
    item_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pickup_limit: Option<u64>,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a str>,
    intent: Intent<'a>,
}

#[derive(Serialize)]
struct Intent<'a> {
    kind: &'static str,
    command: Command<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Command<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    target_id: &'a str,
    item_id: &'a str,
}

pub(super) fn render(
    target: &str,
    offer: RuntimePickupOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let reason = if controlling {
        offer.reason
    } else {
        Some("Take control of your character to act here.")
    };
    let bytes = offer
        .items
        .iter()
        .try_fold(0usize, |sum, row| {
            let item = row.item;
            sum.checked_add(size_of::<Action>() + item.id.len() + 32)?
                .checked_add(3 * item.name.storage_bytes() + 4 * offer.label.len())
        })
        .ok_or_else(|| RuntimeError::from(CapacityError))?;
    let _scratch = budget.reserve(bytes)?;
    let actions = offer
        .items
        .iter()
        .map(|row| {
            let item = row.item;
            let label = if offer.items.len() == 1 {
                offer.label.into()
            } else {
                JsText::concat(&[&item.name, &format!(" × {}", item.quantity as u64).into()])
            };
            Action {
                id: format!("pickup-{}", item.id),
                label,
                category: offer.label,
                description: &item.name,
                item_id: &item.id,
                pickup_limit: row.partial_limit,
                enabled: reason.is_none(),
                reason,
                intent: Intent {
                    kind: "command",
                    command: Command {
                        kind: "pickup",
                        target_id: target,
                        item_id: &item.id,
                    },
                },
            }
        })
        .collect::<Vec<_>>();
    resource_menu(offer.sequence, &actions, offer.label, budget)
}
