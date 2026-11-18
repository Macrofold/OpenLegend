//! The Base world's wording for an admitted Move. The same authored words
//! supply the TypeScript display. Coordinates describe the chosen place and
//! direct distance, which carries no route or movement authority.

use openlegend_simulation::{
    activity::{ActivityDetail, ActivityFact, ActivityScalar, ActivityView},
    spatial::distance,
    state::Point,
    text::JsText,
};
use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DisplayWords<'a> {
    chosen_purpose: &'a str,
    #[serde(borrow)]
    r#move: MoveWords<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveWords<'a> {
    name: &'a str,
    target_prefix: &'a str,
    coordinate_separator: &'a str,
    distance_name: &'a str,
    distance_suffix: &'a str,
}

fn words() -> Option<&'static DisplayWords<'static>> {
    static WORDS: OnceLock<Option<DisplayWords<'static>>> = OnceLock::new();
    WORDS
        .get_or_init(|| {
            serde_json::from_str(include_str!("../config/ordinary-activity-display.json")).ok()
        })
        .as_ref()
}

fn fact(name: &str, value: JsText) -> ActivityFact {
    ActivityFact {
        name: name.into(),
        value: ActivityDetail::Scalar(ActivityScalar::String(value)),
        critical: true,
        sentence: None,
    }
}

/// At installed map extents, the digits are rounded exactly like
/// Number.toFixed(1). When multiplication rounds to a halfway value, the
/// fused residual distinguishes an exact tie from a value just below it.
fn tenth(value: f64) -> String {
    let magnitude = value.abs();
    let scaled = magnitude * 10.0;
    let floor = scaled.floor();
    let remainder = scaled - floor;
    let round_up = remainder > 0.5 || (remainder == 0.5 && magnitude.mul_add(10.0, -scaled) >= 0.0);
    let ticks = floor as u64 + u64::from(round_up);
    let sign = if value < 0.0 { "-" } else { "" };
    format!("{sign}{}.{}", ticks / 10, ticks % 10)
}

pub(crate) fn format(
    profile: (&str, u64),
    purpose: Option<JsText>,
    chosen_purpose: Option<JsText>,
    actor: Point,
    destination: Point,
) -> Option<ActivityView> {
    if profile != ("grounded-wilderness", 1) {
        return None;
    }
    let words = words()?;
    let movement = &words.r#move;
    let target = format!(
        "{}{}{}{}",
        movement.target_prefix,
        tenth(destination.x),
        movement.coordinate_separator,
        tenth(destination.z),
    );
    let distance = format!(
        "{}{}",
        tenth(distance(actor, destination)),
        movement.distance_suffix,
    );
    let mut facts = Vec::with_capacity(1 + usize::from(chosen_purpose.is_some()));
    if let Some(purpose) = chosen_purpose {
        facts.push(fact(words.chosen_purpose, purpose));
    }
    facts.push(fact(movement.distance_name, distance.into()));
    Some(ActivityView {
        name: purpose.unwrap_or_else(|| movement.name.into()),
        facts,
        actor: None,
        target: Some(target.into()),
        tool: None,
        children: None,
        result: None,
    })
}
