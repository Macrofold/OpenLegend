//! Selected Crafting-panel choice. The action binds only the already-known
//! method; the simulation re-selects available carried ingredients at start.
use super::*;
use openlegend_simulation::runtime::RuntimeManufactureOffer;

pub(super) fn render(
    recipe: &str,
    offer: RuntimeManufactureOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Command<'a> {
        #[serde(rename = "type")]
        kind: &'static str,
        recipe_id: &'a str,
    }
    #[derive(Serialize)]
    struct Intent<'a> {
        kind: &'static str,
        command: Command<'a>,
    }
    #[derive(Serialize)]
    struct Choice<'a> {
        id: String,
        label: &'static str,
        category: &'static str,
        description: &'a JsText,
        keywords: [&'a JsText; 1],
        facts: [(&'static str, String); 1],
        enabled: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<JsText>,
        intent: Intent<'a>,
    }
    let _workspace = budget.reserve(
        2048 + recipe.len()
            + offer
                .missing
                .map_or(0, |(_, name)| 4 * name.storage_bytes()),
    )?;
    let reason = if !controlling {
        Some("Take control of your character to act here.".into())
    } else if offer.paused {
        Some("Resume the world to act.".into())
    } else if !offer.can_act {
        Some("Your character cannot start this work now.".into())
    } else {
        offer.missing.map(|(quantity, name)| {
            let mut text: JsText = format!("Need {quantity} ").into();
            text.push_text(name);
            text.push_str(".");
            text
        })
    };
    let action = Choice {
        id: format!("craft-{recipe}"),
        label: "Craft one batch",
        category: "Create",
        description: offer.description,
        keywords: [offer.name],
        facts: [(
            "Work",
            format!(
                "{} game seconds. Materials are spent at the start.",
                offer.work_seconds
            ),
        )],
        enabled: reason.is_none(),
        reason,
        intent: Intent {
            kind: "command",
            command: Command {
                kind: "craft",
                recipe_id: recipe,
            },
        },
    };
    resource_menu(offer.sequence, &[action], "Create", budget)
}
