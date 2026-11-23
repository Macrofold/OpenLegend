//! An observed pile offers only still-present portable lots and their current amounts.
use super::*;
use openlegend_simulation::runtime::RuntimePickupOffer;
use openlegend_simulation::text::TextRef;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Action<'a> {
    id: String,
    label: JsText,
    category: &'a str,
    description: TextRef<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
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
    let multiple = offer.items.len() > 1;
    let all = multiple && offer.all_available;
    let group_bytes = if all {
        size_of::<Action>() + target.len() + offer.all_label.len() + 32
    } else {
        0
    };
    let bytes = offer
        .items
        .iter()
        .try_fold(group_bytes, |sum, item| {
            sum.checked_add(size_of::<Action>() + item.id.len() + 32)?
                .checked_add(3 * item.name.storage_bytes() + 4 * offer.label.len())
        })
        .ok_or_else(|| RuntimeError::from(CapacityError))?;
    let _scratch = budget.reserve(bytes)?;
    let intent = |item_id| Intent {
        kind: "command",
        command: Command {
            kind: "pickup",
            target_id: target,
            item_id,
        },
    };
    let mut actions = Vec::with_capacity(offer.items.len() + usize::from(all));
    if all {
        actions.push(Action {
            id: format!("pickup-all-{target}"),
            label: offer.all_label.into(),
            category: offer.label,
            description: offer.all_description.into(),
            item_id: None,
            pickup_limit: None,
            enabled: reason.is_none(),
            reason,
            intent: intent(None),
        });
    }
    actions.extend(offer.items.iter().map(|item| {
        let label = if multiple {
            JsText::concat(&[item.name, &format!(" × {}", item.quantity).into()])
        } else {
            offer.label.into()
        };
        Action {
            id: format!("pickup-{}", item.id),
            label,
            category: offer.label,
            description: item.name.into(),
            item_id: Some(item.id),
            pickup_limit: item.partial_limit,
            enabled: reason.is_none(),
            reason,
            intent: intent(Some(item.id)),
        }
    }));
    resource_menu(offer.sequence, &actions, offer.label, budget)
}
