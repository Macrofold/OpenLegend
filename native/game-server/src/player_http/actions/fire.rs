//! The ordinary heat context renders authored work and exact permitted fuel
//! lots while the same player disclosure lease covers the selected fire.
use super::*;
use openlegend_simulation::runtime::{
    FireOperation, RuntimeFireChoice, RuntimeFireMenu, VisibleFuel,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FireCommand<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    target_id: &'a str,
    fire_operation: FireOperation,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
}

#[derive(Serialize)]
pub(super) struct FireIntent<'a> {
    kind: &'static str,
    command: FireCommand<'a>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct FireAction<'a> {
    id: String,
    label: JsText,
    category: &'a str,
    description: String,
    keywords: [&'a str; 1],
    target_id: &'a str,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a str>,
    intent: FireIntent<'a>,
}

pub(super) fn render_choice<'a>(
    choice: &'a RuntimeFireChoice<'a>,
    menu: &'a RuntimeFireMenu<'a>,
    target: &'a str,
    name: &JsText,
    blocker: Option<&'a str>,
    custody: &mut ByteReservation,
) -> Result<FireAction<'a>, RuntimeError> {
    let item_name = choice.item.map(|(_, name)| name);
    custody.resize(
        custody
            .bytes()
            .checked_add(
                1024 + 5
                    * (target.len()
                        + name.storage_bytes()
                        + choice.label.len()
                        + choice.description.len()
                        + item_name.map_or(0, JsText::storage_bytes)),
            )
            .ok_or(CapacityError)?,
    )?;
    let mut label = JsText::from(choice.label);
    if let Some(name) = item_name {
        label = JsText::from(menu.copy.fuel_item_prefix.as_str());
        label.push_text(name);
        label.push_str(&menu.copy.fuel_item_suffix);
    } else {
        label.push_str(" ");
    }
    label.push_text(name);
    let fuel = match menu.fuel {
        VisibleFuel::Empty => menu.copy.no_fuel.clone(),
        VisibleFuel::Low => menu.copy.low_fuel.clone(),
        VisibleFuel::Hours(1.0) => menu.copy.one_hour.clone(),
        VisibleFuel::Hours(hours) => menu.copy.hours.replace("{hours}", &hours.to_string()),
    };
    let duration = menu
        .copy
        .duration
        .replace("{seconds}", &choice.work_seconds.to_string());
    let mut description = format!("{fuel}. {} {duration}", choice.description);
    if choice.operation == FireOperation::Fuel {
        let (added, capacity) = menu.additions;
        description.push(' ');
        description.push_str(
            &menu
                .copy
                .fuel_gain
                .replace("{gain}", &added.to_string())
                .replace("{maximum}", &capacity.to_string()),
        );
    }
    let item_id = choice.item.map(|(id, _)| id);
    let command = FireCommand {
        kind: "tend-fire",
        target_id: target,
        fire_operation: choice.operation,
        item_id,
    };
    let signature = json_record(&command).map_err(RuntimeError::application_refused)?;
    let reason = blocker.or(choice.reason);
    Ok(FireAction {
        id: format!("fire-{}", sha256_hex(signature.as_bytes())),
        label,
        category: menu.category,
        description,
        keywords: [&menu.copy.keyword],
        target_id: target,
        enabled: reason.is_none(),
        reason,
        intent: FireIntent {
            kind: "command",
            command,
        },
    })
}
