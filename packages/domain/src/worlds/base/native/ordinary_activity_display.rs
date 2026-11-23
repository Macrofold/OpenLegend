//! The Base world's wording for admitted ordinary actions. Already captured
//! positions describe direct distance without granting routing or speech.

use crate::{
    activity::{ActivityDetail, ActivityFact, ActivityScalar, ActivityView},
    spatial::distance,
    state::Point,
    text::JsText,
};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DisplayWords<'a> {
    stable_learned_purpose: &'a str,
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
    weapon_name: &'a str,
    weapon_target: &'a str,
    weapon_past: &'a str,
    #[serde(borrow)]
    catalogue: StrikeCatalogue<'a>,
}

/// Extra context for a human choosing a strike, never added to NPC offers or
/// to the original activity/review that is shown after selection.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StrikeCatalogue<'a> {
    pub approach_prefix: &'a str,
    pub uncertainty_name: &'a str,
    pub uncertainty: &'a str,
}

pub fn strike_catalogue() -> Option<&'static StrikeCatalogue<'static>> {
    words().map(|words| &words.strike.catalogue)
}

#[derive(Deserialize)]
struct AttackWords<'a> {
    injury: &'a str,
    time: &'a str,
    reach: &'a str,
    chance: &'a str,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct EffectWords {
    pub(crate) label: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) activate: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) deactivate: Option<JsText>,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StrikeRead {
    pub(crate) damage: f64,
    pub(crate) range: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) approach_range: Option<f64>,
    pub(crate) work_seconds: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) recovery_seconds: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) accuracy: Option<f64>,
}

pub enum OrdinaryAction {
    Move(Point),
    Say(JsText),
    Follow,
    Status {
        activate: bool,
        effect: Option<EffectWords>,
    },
    Strike(Option<StrikeRead>),
    Gather(GatherRead),
    Fish {
        description: JsText,
        supply: JsText,
        selected_tool: JsText,
        tool_description: Option<JsText>,
    },
    Production {
        name: JsText,
        details: Vec<ActivityFact>,
    },
}

pub struct GatherRead {
    pub(crate) reach: f64,
    pub(crate) quantity: u64,
    pub(crate) seconds: f64,
    pub(crate) material: JsText,
    pub(crate) tool: Option<(JsText, Option<JsText>)>,
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

#[derive(Clone, Copy, Deserialize, Serialize)]
pub struct ObservedActor {
    pub(crate) position: Point,
    pub(crate) heading: f64,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct ObservedTarget {
    pub(crate) name: JsText,
    pub(crate) position: Point,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) health: Option<crate::reception::AttributeView>,
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
pub(crate) fn tenth(value: f64) -> String {
    let magnitude = value.abs();
    let scaled = magnitude * 10.0;
    let floor = scaled.floor();
    let remainder = scaled - floor;
    let round_up = remainder > 0.5 || (remainder == 0.5 && magnitude.mul_add(10.0, -scaled) >= 0.0);
    let ticks = floor as u64 + u64::from(round_up);
    let sign = if value < 0.0 { "-" } else { "" };
    format!("{sign}{}.{}", ticks / 10, ticks % 10)
}

/// Learning uses the same installed names as a current activity display.
/// Only the world's designated shared purpose survives template normalization.
pub(crate) fn shared_name(
    profile: (&str, u64),
    kind: &str,
    purpose: Option<&JsText>,
    operation: Option<&str>,
    effect: Option<(&str, Option<&str>, Option<&str>)>,
) -> Option<JsText> {
    if profile != ("grounded-wilderness", 1) {
        return None;
    }
    let words = words()?;
    if let ("status-effect", Some((label, activate, deactivate))) = (kind, effect) {
        let (name, prefix) = if operation == Some("activate") {
            (activate, words.status.activate_prefix)
        } else {
            (deactivate, words.status.deactivate_prefix)
        };
        return Some(name.map(JsText::from).unwrap_or_else(|| prepend(prefix, &label.into())));
    }
    let fallback = match kind {
        "move" => words.r#move.name,
        "say" => words.say.name,
        "follow" => words.follow_name,
        "strike" => words.strike.name,
        "status-effect" => words.status.name,
        _ => return None,
    };
    Some(
        purpose
            .filter(|text| *text == words.stable_learned_purpose)
            .cloned()
            .unwrap_or_else(|| fallback.into()),
    )
}

impl From<crate::contact::ContactRead<'_>> for StrikeRead {
    fn from(strike: crate::contact::ContactRead<'_>) -> Self {
        Self {
            damage: strike.damage,
            range: strike.range,
            approach_range: strike.approach_range,
            work_seconds: strike.work_seconds,
            recovery_seconds: strike.recovery_seconds,
            accuracy: strike.accuracy,
        }
    }
}

pub(crate) fn weapon_strike_name(weapon: &crate::state::Named, target: Option<&JsText>) -> Option<JsText> {
    let words = &words()?.strike;
    let name = crate::narration::name_phrase(weapon, crate::narration::NameArticle::Indefinite, false);
    if let Some(target) = target {
        let (before, after) = words.weapon_target.split_once("{target}")?;
        let (between, end) = after.split_once("{weapon}")?;
        Some(JsText::concat(&[&before.into(), target, &between.into(), &name, &end.into()]))
    } else {
        let (before, after) = words.weapon_name.split_once("{weapon}")?;
        Some(JsText::concat(&[&before.into(), &name, &after.into()]))
    }
}

pub(crate) fn weapon_strike_past(weapon: &crate::state::Named) -> Option<JsText> {
    let (before, after) = words()?.strike.weapon_past.split_once("{weapon}")?;
    let name = crate::narration::name_phrase(weapon, crate::narration::NameArticle::Definite, false);
    Some(JsText::concat(&[&before.into(), &name, &after.into()]))
}

pub fn format(
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
    let mut tool = None;
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
        OrdinaryAction::Gather(read) => {
            let copy = super::base_gathering::copy();
            if let Some((name, description)) = read.tool {
                tool = Some(name);
                if let Some(description) = description {
                    let mut row = fact("description", description);
                    row.critical = false;
                    facts.push(row);
                }
            }
            facts.push(fact(
                &copy.approach_name,
                copy.approach
                    .replace("{reach}", &number(read.reach)?)
                    .into(),
            ));
            let template = copy
                .work
                .replace("{seconds}", &number(read.seconds)?)
                .replace("{quantity}", &read.quantity.to_string());
            let (before, after) = template.split_once("{material}")?;
            facts.push(fact(
                &copy.work_name,
                JsText::concat(&[&before.into(), &read.material, &after.into()]),
            ));
            purpose.unwrap_or_else(|| copy.name.as_str().into())
        }
        OrdinaryAction::Fish {
            description,
            supply,
            selected_tool,
            tool_description,
        } => {
            #[derive(Deserialize)]
            struct CastCopy<'a> { label: &'a str, approach: &'a str }
            static COPY: OnceLock<CastCopy<'static>> = OnceLock::new();
            let copy = COPY.get_or_init(|| serde_json::from_str(include_str!("../cast-copy.json"))
                .expect("base cast activity wording"));
            tool = Some(selected_tool);
            if let Some(description) = tool_description {
                facts.push(ActivityFact {
                    critical: false,
                    ..fact("description", description)
                });
            }
            facts.push(fact("cast", description));
            facts.push(fact("supply", supply));
            facts.push(fact("approach", copy.approach.into()));
            purpose.unwrap_or_else(|| copy.label.into())
        }
        OrdinaryAction::Production { name, details } => {
            facts.extend(details);
            purpose.unwrap_or(name)
        }
    };
    Some(ActivityView {
        name,
        facts,
        actor: None,
        target,
        tool,
        children: None,
        result: None,
    })
}

fn prepend(prefix: &str, label: &JsText) -> JsText {
    JsText::concat(&[&JsText::from(prefix), label])
}

fn number(value: f64) -> Option<String> {
    crate::encoding::json_record(&(value + 0.0)).ok()
}

fn attack_words() -> Option<&'static AttackWords<'static>> {
    static WORDS: OnceLock<Option<AttackWords<'static>>> = OnceLock::new();
    WORDS
        .get_or_init(|| serde_json::from_str(include_str!("../../../attack-description.json")).ok())
        .as_ref()
}

fn health_phrase(health: &crate::reception::AttributeView) -> Option<JsText> {
    let crate::values::AttributeValue::Number(value) = health.value.as_ref()? else {
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
