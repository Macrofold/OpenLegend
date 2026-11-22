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

pub(super) fn render<'a>(
    menu: RuntimeFoodMenu<'a>,
    controls: bool,
    selected_item: Option<&'a str>,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let blocker = if !controls {
        Some("Take control of your character to act here.")
    } else if menu.paused {
        Some("Resume the world to act.")
    } else {
        None
    };
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
        actions.push(PreparationAction {
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
        });
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
    resource_menu(menu.sequence, &actions, CATEGORY, budget)
}
