//! The menu borrows installed recipes and exact role choices during the
//! authorized read. Only the public heat reference crosses the wire.
use super::*;
use crate::player_references::PlayerReferences;
use openlegend_simulation::{
    capture::PlayerObservedBody,
    runtime::{RuntimeFoodMenu, RuntimePreparation},
};

const CATEGORY: &str = "Create";

pub(super) fn heat_contact(
    references: &PlayerReferences<'_>,
    body: PlayerObservedBody<'_>,
    selected: Option<&str>,
) -> Result<Option<String>, RuntimeError> {
    let token = references
        .contact(
            body.source_id,
            body.physical_life.unwrap_or(0),
            body.lease_id,
        )
        .map_err(RuntimeError::application_refused)?;
    Ok(selected
        .is_none_or(|selected| selected == token)
        .then_some(token))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Command<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    preparation_id: &'a str,
    preparation_version: u64,
    preparation_digest: &'a str,
    target_id: &'a str,
    inputs: &'a indexmap::IndexMap<String, String>,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum Intent<'a> {
    Command { command: Command<'a> },
    Unavailable,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PreparationAction<'a> {
    id: String,
    label: JsText,
    category: &'static str,
    description: &'a JsText,
    keywords: [&'a JsText; 1],
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'static str>,
    intent: Intent<'a>,
}

#[derive(Serialize)]
#[serde(untagged)]
enum FoodAction<'a> {
    Cooking(PreparationAction<'a>),
    Eating(EatAction<'a>),
    Fire(super::fire::FireAction<'a>),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct EatAction<'a> {
    id: String,
    label: JsText,
    category: &'static str,
    description: &'a str,
    keywords: [&'a JsText; 1],
    item_id: &'a str,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a str>,
    intent: EatIntent<'a>,
}

#[derive(Serialize)]
struct EatIntent<'a> {
    kind: &'static str,
    command: EatCommand<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EatCommand<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    item_id: &'a str,
}

pub(super) fn action_blocker(controls: bool, paused: bool) -> Option<&'static str> {
    if !controls {
        Some(TAKE_CONTROL)
    } else if paused {
        Some(RESUME_WORLD)
    } else {
        None
    }
}

/// Fund the owned label and row before constructing an exact Eat command.
/// The offered name and reason remain borrowed from the accepted menu cut.
pub(super) fn eat_choice<'a>(
    item_id: &'a str,
    name: &'a JsText,
    verb: &'a str,
    reason: Option<&'a str>,
    custody: &mut ByteReservation,
) -> Result<EatAction<'a>, CapacityError> {
    custody.resize(
        custody
            .bytes()
            .checked_add(512 + 4 * (item_id.len() + name.storage_bytes() + verb.len()))
            .ok_or(CapacityError)?,
    )?;
    let mut label = JsText::from(verb);
    label.push_str(" ");
    label.push_text(name);
    Ok(EatAction {
        id: format!("eat-{item_id}"),
        label,
        category: "Body",
        description: verb,
        keywords: [name],
        item_id,
        enabled: reason.is_none(),
        reason,
        intent: EatIntent {
            kind: "command",
            command: EatCommand {
                kind: "eat",
                item_id,
            },
        },
    })
}

pub(super) fn render<'a>(
    menu: RuntimeFoodMenu<'a>,
    controls: bool,
    selected_item: Option<&'a str>,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let blocker = action_blocker(controls, menu.paused);
    let mut custody = budget.reserve(0)?;
    let mut actions = Vec::new();
    let mut push = |preparation: &'a RuntimePreparation<'a>,
                    heat: Option<&'a openlegend_simulation::runtime::RuntimeHeatContact>|
     -> Result<(), RuntimeError> {
        if selected_item.is_some() && preparation.inputs.is_none() {
            return Ok(());
        }
        let reason = blocker
            .or_else(|| {
                heat.filter(|heat| heat.lit)
                    .is_none()
                    .then_some("A visible lit heat source is needed.")
            })
            .or_else(|| {
                preparation
                    .inputs
                    .is_none()
                    .then_some("The exact selected ingredients are no longer available.")
            });
        let target = heat.map(|heat| heat.target.as_str());
        let fields = preparation.inputs.map_or(0, |inputs| {
            inputs
                .iter()
                .map(|(role, item)| role.len() + item.len() + 64)
                .sum::<usize>()
        });
        custody.resize(
            custody
                .bytes()
                .checked_add(
                    1024 + 6
                        * (fields
                            + preparation.pin.id.len()
                            + preparation.name.storage_bytes()
                            + heat.map_or(0, |heat| heat.name.storage_bytes() + heat.target.len())),
                )
                .ok_or(CapacityError)?,
        )?;
        let signature = json_record(&(preparation.pin, target, preparation.inputs))
            .map_err(RuntimeError::application_refused)?;
        let mut label = preparation.name.clone();
        if let Some(heat) = heat {
            label.push_str(" at ");
            label.push_text(&heat.name);
        }
        let intent = match target.zip(preparation.inputs) {
            Some((target, inputs)) => Intent::Command {
                command: Command {
                    kind: "cook",
                    preparation_id: &preparation.pin.id,
                    preparation_version: preparation.pin.version,
                    preparation_digest: &preparation.pin.digest,
                    target_id: target,
                    inputs,
                },
            },
            None => Intent::Unavailable,
        };
        actions.push(FoodAction::Cooking(PreparationAction {
            id: format!("cook-{}", sha256_hex(signature.as_bytes())),
            label,
            category: CATEGORY,
            description: preparation.description,
            keywords: [preparation.name],
            target_id: target,
            item_id: selected_item,
            enabled: reason.is_none(),
            reason,
            intent,
        }));
        Ok(())
    };
    for preparation in menu.preparations {
        if menu.heat.is_empty() {
            push(preparation, None)?;
        } else {
            for heat in menu.heat {
                if selected_item.is_none() || heat.lit {
                    push(preparation, Some(heat))?;
                }
            }
            if selected_item.is_some() && !menu.heat.iter().any(|heat| heat.lit) {
                push(preparation, None)?;
            }
        }
    }
    let has_cooking = !actions.is_empty();
    if let Some((fire, heat)) = menu.fire.as_ref().zip(menu.heat.first()) {
        for choice in &fire.choices {
            actions.push(FoodAction::Fire(super::fire::render_choice(
                choice, fire, &heat.target, &heat.name, blocker, &mut custody,
            )?));
        }
        return if has_cooking {
            resource_menu_categories(menu.sequence, &actions, &[CATEGORY, fire.category], budget)
        } else {
            resource_menu(menu.sequence, &actions, fire.category, budget)
        };
    }
    if let Some((item_id, (name, offer))) = selected_item.zip(menu.eating) {
        actions.push(FoodAction::Eating(eat_choice(
            item_id,
            name,
            offer.label,
            blocker.or(offer.reason),
            &mut custody,
        )?));
        if has_cooking {
            return resource_menu_categories(menu.sequence, &actions, &[CATEGORY, "Body"], budget);
        }
        return resource_menu(menu.sequence, &actions, "Body", budget);
    }
    resource_menu(menu.sequence, &actions, CATEGORY, budget)
}
