//! Selected and global Craft choices bind the known method and exact kept
//! tool. The simulation re-selects spendable ingredients at start.
use super::*;
use openlegend_simulation::runtime::RuntimeManufactureOffer;
use std::collections::BTreeMap;

pub(super) const CATEGORY: &str = "Create";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Command {
    #[serde(rename = "type")]
    kind: &'static str,
    recipe_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<BTreeMap<String, String>>,
}

#[derive(Serialize)]
struct Intent {
    kind: &'static str,
    command: Command,
}

#[derive(Serialize)]
pub(super) struct ManufactureAction {
    id: String,
    label: JsText,
    category: &'static str,
    description: JsText,
    keywords: [JsText; 1],
    facts: [(&'static str, String); 1],
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<JsText>,
    intent: Intent,
    #[serde(skip)]
    _storage: ByteReservation,
}

/// Build the same row for the chosen recipe and the global catalogue. The
/// row owns its text and tool references until final authorized encoding.
pub(super) fn choice(
    recipe: &str,
    offer: &RuntimeManufactureOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<ManufactureAction, RuntimeError> {
    prepare(recipe, offer, controlling, true, budget)
}

fn prepare(
    recipe: &str,
    offer: &RuntimeManufactureOffer<'_>,
    controlling: bool,
    show_recipe_name: bool,
    budget: &ByteBudget,
) -> Result<ManufactureAction, RuntimeError> {
    let bytes = 2048usize
        .checked_add(recipe.len().checked_mul(2).ok_or(CapacityError)?)
        .and_then(|n| {
            n.checked_add(
                offer
                    .name
                    .storage_bytes()
                    .checked_mul(if show_recipe_name { 2 } else { 1 })?,
            )
        })
        .and_then(|n| n.checked_add(offer.description.storage_bytes()))
        .and_then(|n| n.checked_add(offer.missing.map_or(0, |(_, name)| name.storage_bytes())))
        .and_then(|n| n.checked_add(offer.tool.map_or(0, |(role, item)| role.len() + item.len())))
        .ok_or(CapacityError)?;
    let storage = budget.reserve(bytes)?;
    let reason = if !controlling {
        Some(TAKE_CONTROL.into())
    } else if offer.paused {
        Some(RESUME_WORLD.into())
    } else if !offer.can_act {
        Some("Your character cannot start this work now.".into())
    } else if offer.missing_tool {
        Some("You need an available tool for this recipe.".into())
    } else {
        offer.missing.map(|(quantity, name)| {
            let mut text: JsText = format!("Need {quantity} ").into();
            text.push_text(name);
            text.push_str(".");
            text
        })
    };
    Ok(ManufactureAction {
        id: format!("craft-{recipe}"),
        label: if show_recipe_name {
            JsText::concat(&[&"Craft ".into(), offer.name])
        } else {
            "Craft one batch".into()
        },
        category: CATEGORY,
        description: offer.description.clone(),
        keywords: [offer.name.clone()],
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
                recipe_id: recipe.to_owned(),
                tools: offer
                    .tool
                    .map(|(role, item)| BTreeMap::from([(role.to_owned(), item.to_owned())])),
            },
        },
        _storage: storage,
    })
}

pub(super) fn render(
    recipe: &str,
    offer: RuntimeManufactureOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let action = prepare(recipe, &offer, controlling, false, budget)?;
    resource_menu(offer.sequence, &[action], CATEGORY, budget)
}
