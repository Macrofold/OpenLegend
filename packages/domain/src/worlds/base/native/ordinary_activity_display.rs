//! The Base world's wording for admitted ordinary actions. Already captured
//! positions describe direct distance without granting routing or speech.

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
    #[serde(borrow)]
    say: SayWords<'a>,
    follow_name: &'a str,
    #[serde(borrow)]
    status: StatusWords<'a>,
    #[serde(borrow)]
    strike: StrikeWords<'a>,
    #[serde(borrow)]
    observed: ObservedWords<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatusWords<'a> {
    name: &'a str,
    activate_prefix: &'a str,
    deactivate_prefix: &'a str,
    result_name: &'a str,
    result: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StrikeWords<'a> {
    name: &'a str,
    attack_name: &'a str,
    approach_name: &'a str,
    approach_prefix: &'a str,
    approach_suffix: &'a str,
}

#[derive(Deserialize)]
struct AttackWords<'a> {
    injury: &'a str,
    time: &'a str,
    reach: &'a str,
    chance: &'a str,
}

#[derive(Deserialize)]
pub(crate) struct EffectWords {
    label: JsText,
    activate: Option<JsText>,
    deactivate: Option<JsText>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StrikeRead {
    damage: f64,
    range: f64,
    approach_range: Option<f64>,
    work_seconds: f64,
    recovery_seconds: Option<f64>,
    accuracy: Option<f64>,
}

pub(crate) enum OrdinaryAction {
    Move(Point),
    Say(JsText),
    Follow,
    Status {
        activate: bool,
        effect: Option<EffectWords>,
    },
    Strike(Option<StrikeRead>),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SayWords<'a> {
    name: &'a str,
    chunk_units: usize,
    words_name: &'a str,
    more_words_name: &'a str,
    reply_name: &'a str,
    reply: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservedWords<'a> {
    distance_name: &'a str,
    distance_suffix: &'a str,
    direction_name: &'a str,
    directions: [&'a str; 8],
    health_name: &'a str,
}

#[derive(Clone, Copy, Deserialize)]
pub(crate) struct ObservedActor {
    pub(crate) position: Point,
    heading: f64,
}

#[derive(Deserialize)]
pub(crate) struct ObservedTarget {
    name: JsText,
    position: Point,
    health: Option<openlegend_simulation::reception::AttributeView>,
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
    action: OrdinaryAction,
    purpose: Option<JsText>,
    chosen_purpose: Option<JsText>,
    actor: Option<ObservedActor>,
    target: Option<ObservedTarget>,
) -> Option<ActivityView> {
    if profile != ("grounded-wilderness", 1) {
        return None;
    }
    let words = words()?;
    let mut facts = Vec::new();
    if let Some(purpose) = chosen_purpose {
        facts.push(fact(words.chosen_purpose, purpose));
    }
    let mut target = actor.zip(target).map(|(actor, target)| {
        let observation = &words.observed;
        let measured = tenth(distance(actor.position, target.position));
        facts.push(fact(
            observation.distance_name,
            format!("{measured}{}", observation.distance_suffix).into(),
        ));
        let bearing = actor.heading
            - (target.position.x - actor.position.x).atan2(target.position.z - actor.position.z);
        let direction =
            ((bearing / std::f64::consts::FRAC_PI_4 + 0.5).floor() as i32).rem_euclid(8) as usize;
        facts.push(fact(
            observation.direction_name,
            observation.directions[direction].into(),
        ));
        if let Some(health) = target.health.and_then(|health| health_phrase(&health)) {
            facts.push(fact(observation.health_name, health));
        }
        target.name
    });
    let name = match action {
        OrdinaryAction::Move(destination) => {
            let movement = &words.r#move;
            if let Some(actor) = actor {
                target = Some(
                    format!(
                        "{}{}{}{}",
                        movement.target_prefix,
                        tenth(destination.x),
                        movement.coordinate_separator,
                        tenth(destination.z)
                    )
                    .into(),
                );
                let distance = format!(
                    "{}{}",
                    tenth(distance(actor.position, destination)),
                    movement.distance_suffix
                );
                facts.push(fact(movement.distance_name, distance.into()));
            }
            purpose.unwrap_or_else(|| movement.name.into())
        }
        OrdinaryAction::Say(text) => {
            let speech = &words.say;
            for at in (0..text.units_len()).step_by(speech.chunk_units) {
                let key = if at == 0 {
                    speech.words_name
                } else {
                    speech.more_words_name
                };
                facts.push(fact(
                    key,
                    text.slice(at..(at + speech.chunk_units).min(text.units_len())),
                ));
            }
            facts.push(fact(speech.reply_name, speech.reply.into()));
            purpose.unwrap_or_else(|| speech.name.into())
        }
        OrdinaryAction::Follow => purpose.unwrap_or_else(|| words.follow_name.into()),
        OrdinaryAction::Status { activate, effect } => {
            let status = &words.status;
            facts.push(fact(status.result_name, status.result.into()));
            match effect {
                Some(effect) if activate => effect
                    .activate
                    .unwrap_or_else(|| prepend(status.activate_prefix, &effect.label)),
                Some(effect) => effect
                    .deactivate
                    .unwrap_or_else(|| prepend(status.deactivate_prefix, &effect.label)),
                None => purpose.unwrap_or_else(|| status.name.into()),
            }
        }
        OrdinaryAction::Strike(strike) => {
            let display = &words.strike;
            if let Some(strike) = strike {
                let attack = attack_words()?;
                let damage = number(strike.damage)?;
                let time =
                    number(strike.work_seconds + strike.recovery_seconds.unwrap_or_default())?;
                let range = number(strike.range)?;
                let chance = number((strike.accuracy.unwrap_or(1.0) * 100.0 + 0.5).floor())?;
                let text = format!(
                    "{damage}{}{time}{}{range}{}{chance}{}",
                    attack.injury, attack.time, attack.reach, attack.chance
                );
                facts.push(fact(display.attack_name, text.into()));
                let approach = number(strike.approach_range.unwrap_or(strike.range))?;
                facts.push(fact(
                    display.approach_name,
                    format!(
                        "{}{approach}{}",
                        display.approach_prefix, display.approach_suffix
                    )
                    .into(),
                ));
            }
            purpose.unwrap_or_else(|| display.name.into())
        }
    };
    Some(ActivityView {
        name,
        facts,
        actor: None,
        target,
        tool: None,
        children: None,
        result: None,
    })
}

fn prepend(prefix: &str, label: &JsText) -> JsText {
    JsText::concat(&[&JsText::from(prefix), label])
}

fn number(value: f64) -> Option<String> {
    openlegend_simulation::encoding::json_record(&(value + 0.0)).ok()
}

fn attack_words() -> Option<&'static AttackWords<'static>> {
    static WORDS: OnceLock<Option<AttackWords<'static>>> = OnceLock::new();
    WORDS
        .get_or_init(|| serde_json::from_str(include_str!("../../../attack-description.json")).ok())
        .as_ref()
}

fn health_phrase(health: &openlegend_simulation::reception::AttributeView) -> Option<JsText> {
    let openlegend_simulation::values::AttributeValue::Number(value) = health.value.as_ref()?
    else {
        return None;
    };
    // Source's Number(toPrecision(4)) rounds to four significant digits.
    let rounded = format!("{value:.3e}").parse::<f64>().ok()?;
    let mut phrase: JsText = health.name.clone().into();
    phrase.push_str(&format!(": {}", number(rounded)?));
    if let Some(maximum) = health.max {
        match health.min {
            Some(minimum) if minimum != 0.0 => phrase.push_str(&format!(
                " (range {}–{})",
                number(minimum)?,
                number(maximum)?
            )),
            _ => phrase.push_str(&format!("/{}", number(maximum)?)),
        }
    }
    phrase.push_str(".");
    Some(phrase)
}
