//! Read the shared neutral relative-movement grammar. A match provides
//! offsets only. The ordinary native command still owns the pose and route.

use openlegend_simulation::{encoding::js_trim, runtime::RelativeAttemptSyntax, text::JsText};
use serde::Deserialize;
use std::{collections::HashMap, sync::OnceLock};

#[derive(Deserialize)]
struct CoordinateGrammar {
    relative: Grammar,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Grammar {
    verbs: Vec<String>,
    implicit_distance_verb: String,
    units: Vec<String>,
    directions: HashMap<String, [f64; 2]>,
    same_clause_join: String,
}

fn grammar() -> &'static Grammar {
    static GRAMMAR: OnceLock<CoordinateGrammar> = OnceLock::new();
    &GRAMMAR
        .get_or_init(|| {
            serde_json::from_str(include_str!(
                "../../../../packages/domain/src/typed-point.json"
            ))
            .expect("the build contains the shared neutral coordinate grammar")
        })
        .relative
}

fn distance(input: &str, units: &[String]) -> Option<f64> {
    let digits = |text: &str| text.bytes().take_while(u8::is_ascii_digit).count();
    let mut end = digits(input);
    if end == 0 {
        return None;
    }
    if let Some(fraction) = input[end..].strip_prefix('.') {
        let count = digits(fraction);
        if count == 0 {
            return None;
        }
        end += count + 1;
    }
    let unit = input[end..].strip_prefix(' ').unwrap_or(&input[end..]);
    if !unit.is_empty() && !units.iter().any(|known| known == unit) {
        return None;
    }
    let metres: f64 = input[..end].parse().ok()?;
    metres.is_finite().then_some(metres)
}

fn segment(input: &str, grammar: &Grammar) -> Option<(Option<f64>, [f64; 2])> {
    let (amount, direction) = input.rsplit_once(' ').unwrap_or(("", input));
    let direction = *grammar.directions.get(direction)?;
    let amount = if amount.is_empty() {
        None
    } else {
        Some(distance(amount, &grammar.units)?)
    };
    Some((amount, direction))
}

pub(crate) fn parse(text: &JsText) -> Option<RelativeAttemptSyntax> {
    let text = js_trim(text.as_unicode()?.trim_end_matches(['.', '!']));
    let (verb, words) = text.split_once(' ')?;
    let grammar = grammar();
    if !grammar.verbs.iter().any(|known| known == verb) {
        return None;
    }
    // Split only a same-clause conjunction. Sequential or unknown wording
    // cannot accidentally start the recognized prefix of a different action.
    let mut parts = words.match_indices(' ').filter_map(|(index, _)| {
        words[index + 1..]
            .strip_prefix(&grammar.same_clause_join)
            .and_then(|tail| tail.strip_prefix(' '))
            .map(|tail| (&words[..index], tail))
    });
    let (first, second) = match parts.next() {
        Some((first, second)) if parts.next().is_none() => (first, Some(second)),
        Some(_) => return None,
        None => (words, None),
    };
    let (first_metres, first) = segment(first, grammar)?;
    let (second_metres, second) = match second {
        Some(words) => segment(words, grammar)?,
        None => (Some(0.0), [0.0, 0.0]),
    };
    if verb != grammar.implicit_distance_verb && (first_metres.is_none() || second_metres.is_none())
    {
        return Some(RelativeAttemptSyntax::DistanceNeeded);
    }
    let first_metres = first_metres.unwrap_or(1.0);
    let second_metres = second_metres.unwrap_or(1.0);
    let x = first_metres * first[0] + second_metres * second[0];
    let z = first_metres * first[1] + second_metres * second[1];
    (x.is_finite() && z.is_finite()).then_some(RelativeAttemptSyntax::Offset { x, z })
}
