//! One installed practice action for the selected, currently visible target.
use super::*;
use openlegend_simulation::runtime::RuntimePracticeOffer;

const CATEGORY: &str = "Practice";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Choice<'a> {
    id: String,
    label: &'a str,
    category: &'static str,
    target_id: &'a str,
    description: &'a JsText,
    keywords: [&'a JsText; 1],
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
    #[serde(skip_serializing_if = "Option::is_none")]
    ammunition_id: Option<&'a str>,
}

pub(super) fn render(
    target: &str,
    offer: RuntimePracticeOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let reason = if !controlling {
        Some("Take control of your character to act here.")
    } else if offer.paused {
        Some("Resume the world to act.")
    } else {
        offer.reason
    };
    let weapon_key = offer.weapon.unwrap_or("missing");
    // The action only borrows the native offer. Reserve its one allocated ID;
    // `resource_menu` independently admits the bytes used by the HTTP response.
    let id_bytes = "practice::".len() + target.len() + weapon_key.len();
    let _id_custody = budget.reserve(id_bytes)?;
    let mut id = String::with_capacity(id_bytes);
    id.push_str("practice:");
    id.push_str(target);
    id.push(':');
    id.push_str(weapon_key);
    let choice = Choice {
        id,
        label: offer.label,
        category: CATEGORY,
        target_id: target,
        description: offer.description,
        keywords: [offer.description],
        enabled: reason.is_none(),
        reason,
        intent: Intent {
            kind: "command",
            command: Command {
                kind: "practice-shot",
                target_id: target,
                item_id: offer.weapon,
                ammunition_id: offer.ammunition,
            },
        },
    };
    resource_menu(offer.sequence, &[choice], CATEGORY, budget)
}
