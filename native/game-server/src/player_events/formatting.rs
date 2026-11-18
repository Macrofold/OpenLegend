//! Human-facing formatting of already acquired numeric and action details.
//! The public row keeps its original before, after and occurrence values.

use super::{CoordinateTextRule, EventScalar, Evidence, JsText, ReferenceRole};
use openlegend_simulation::narration::display_number;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AttributeChange {
    attribute_id: String,
    definition_version: f64,
    before: f64,
    after: f64,
    unit: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    meaning: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cause: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kind: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cause_meaning: Option<JsText>,
}

impl AttributeChange {
    pub(super) fn from_evidence(evidence: &Evidence) -> Option<Self> {
        if evidence.kind() != "attribute-changed" {
            return None;
        }
        let text = |key| match evidence.data(key) {
            Some(EventScalar::Text(value)) => Some(value),
            _ => None,
        };
        let number = |key| match evidence.data(key) {
            Some(EventScalar::Number(value)) => Some(*value),
            _ => None,
        };
        Some(Self {
            attribute_id: text("attributeId")?.as_unicode()?.to_owned(),
            definition_version: number("definitionVersion")?,
            before: number("before")?,
            after: number("after")?,
            unit: text("unit")?.clone(),
            name: text("attributeName").cloned(),
            meaning: text("attributeMeaning").cloned(),
            cause: text("causeLabel").cloned(),
            kind: (text("changeKind").and_then(JsText::as_unicode) == Some("health"))
                .then_some("health"),
            cause_meaning: text("causeMeaning").cloned(),
        })
    }
}

pub(super) fn event_text(
    evidence: &Evidence,
    self_actor: bool,
    rendered: JsText,
    change: Option<&AttributeChange>,
    coordinates: Option<&CoordinateTextRule>,
) -> Result<JsText, serde_json::Error> {
    let subject = if self_actor {
        Some("I".into())
    } else {
        evidence
            .references
            .iter()
            .find(|item| item.role == ReferenceRole::Actor)
            .map(|item| item.label.clone())
    };
    if let Some(change) = change
        && let Some(subject) = subject.filter(|name| !name.is_empty())
        && let Some(name) = change.name.as_ref().filter(|name| !name.is_empty())
    {
        let delta = change.after - change.before;
        let health = change.kind == Some("health");
        let amount = display_number(delta.abs(), health)?;
        let mut outcome = subject.first_case(true);
        if health && delta < 0.0 {
            outcome.push_str(" took ");
            outcome.push_str(&amount);
            outcome.push_str(" damage");
        } else {
            outcome.push_str(if delta < 0.0 { " lost " } else { " gained " });
            outcome.push_str(&amount);
            outcome.push_str(" ");
            outcome.push_text(&name.lowercase());
        }
        if let Some(cause) = change.cause.as_ref().filter(|cause| !cause.is_empty()) {
            outcome.push_str(" from ");
            outcome.push_text(&cause.lowercase());
        }
        outcome.push_str(".");
        return Ok(outcome);
    }
    if evidence.speech.is_none()
        && let Some(rule) = coordinates
        && (evidence.kind() == rule.event_type
            || (evidence.kind() == rule.action_event_type
                && matches!(evidence.data("actionType"), Some(EventScalar::Text(kind))
                if kind.as_unicode().is_some_and(|kind| rule.action_types.iter().any(|name| name == kind)))))
        && let Some((heading, x, z)) = rendered
            .as_unicode()
            .and_then(|text| coordinate_text(text, &rule.prefixes))
    {
        return Ok(format!(
            "{heading}{}, {}.",
            display_number(x, false)?,
            display_number(z, false)?,
        )
        .into());
    }
    Ok(rendered)
}

fn coordinate_text<'a>(value: &'a str, prefixes: &[String]) -> Option<(&'a str, f64, f64)> {
    let end = value.strip_suffix('.')?;
    let (left, z) = end.rsplit_once(", ")?;
    let number_at = left.len()
        - left
            .bytes()
            .rev()
            .take_while(|byte| {
                byte.is_ascii_digit() || matches!(byte, b'.' | b'e' | b'E' | b'-' | b'+')
            })
            .count();
    let heading = &left[..number_at];
    if !prefixes.iter().any(|prefix| {
        heading
            .as_bytes()
            .get(heading.len().saturating_sub(prefix.len())..)
            .is_some_and(|tail| tail.eq_ignore_ascii_case(prefix.as_bytes()))
    }) {
        return None;
    }
    let x = coordinate_number(&left[number_at..])?;
    let z = coordinate_number(z)?;
    Some((heading, x, z))
}

fn coordinate_number(value: &str) -> Option<f64> {
    let digits = |word: &str| !word.is_empty() && word.bytes().all(|byte| byte.is_ascii_digit());
    let (base, exponent) = value
        .split_once(['e', 'E'])
        .map_or((value, None), |(base, exp)| (base, Some(exp)));
    let base = base.strip_prefix('-').unwrap_or(base);
    let (whole, fraction) = base
        .split_once('.')
        .map_or((base, None), |(whole, fraction)| (whole, Some(fraction)));
    (digits(whole)
        && fraction.is_none_or(digits)
        && exponent.is_none_or(|exp| digits(exp.strip_prefix(['+', '-']).unwrap_or(exp))))
    .then(|| value.parse().ok())
    .flatten()
}
