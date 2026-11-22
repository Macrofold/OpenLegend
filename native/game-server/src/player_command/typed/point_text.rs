//! Read one normalized coordinate phrase. Installed support and planned
//! movement are resolved by the native command owner, after authorization.

use super::*;

#[derive(Deserialize)]
struct GeometryGrammar {
    verbs: Vec<String>,
    destination: String,
    axes: [String; 2],
    support: Vec<String>,
}

pub(super) struct PointWords {
    pub(super) x: f64,
    pub(super) z: f64,
    pub(super) support: Option<String>,
    _custody: ByteReservation,
}

fn grammar() -> &'static GeometryGrammar {
    static GRAMMAR: OnceLock<GeometryGrammar> = OnceLock::new();
    GRAMMAR.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../../packages/domain/src/typed-point.json"
        ))
        .expect("the build contains the neutral coordinate grammar")
    })
}

fn axis<'a>(text: &'a str, label: &str) -> Option<&'a str> {
    let text = text.trim_start_matches(' ');
    match text.strip_prefix(label) {
        Some(value) => Some(
            value
                .trim_start_matches(' ')
                .strip_prefix('=')?
                .trim_start_matches(' '),
        ),
        None => Some(text),
    }
}

/// Read the shared signed-decimal form without accepting other number
/// syntax such as exponents, a missing digit or a separate sign token.
fn decimal(input: &str) -> Option<(f64, &str)> {
    let minus = usize::from(input.starts_with('-'));
    let digits = |text: &str| text.bytes().take_while(u8::is_ascii_digit).count();
    let integer = digits(&input[minus..]);
    if integer == 0 {
        return None;
    }
    let mut end = minus + integer;
    if let Some(tail) = input[end..].strip_prefix('.') {
        let fraction = digits(tail);
        if fraction == 0 {
            return None;
        }
        end += 1 + fraction;
    }
    Some((input[..end].parse().ok()?, &input[end..]))
}

fn capture(text: &str) -> Option<(f64, f64, Option<&str>)> {
    let grammar = grammar();
    let (verb, rest) = text.split_once(' ')?;
    if !grammar.verbs.iter().any(|candidate| candidate == verb) {
        return None;
    }
    let rest = rest
        .strip_prefix(&grammar.destination)
        .and_then(|next| next.strip_prefix(' '))
        .unwrap_or(rest);
    let (first, second) = rest.split_once(',')?;
    let (x, tail) = decimal(axis(first, &grammar.axes[0])?)?;
    if !tail.bytes().all(|byte| byte == b' ') {
        return None;
    }
    let (z, tail) = decimal(axis(second, &grammar.axes[1])?)?;
    let support = if tail.is_empty() {
        None
    } else {
        let clause = tail.strip_prefix(' ')?;
        let (verb, id) = clause.trim_start_matches(' ').split_once(' ')?;
        let id = id.trim_start_matches(' ');
        if !grammar.support.iter().any(|known| known == verb)
            || id.is_empty()
            || !id.bytes().all(|byte| {
                byte.is_ascii_lowercase()
                    || byte.is_ascii_digit()
                    || matches!(byte, b'_' | b':' | b'-')
            })
        {
            return None;
        }
        Some(id)
    };
    Some((x, z, support))
}

pub(super) fn parse(text: &str, budget: &ByteBudget) -> Result<Option<PointWords>, WorldError> {
    let Some((x, z, support)) = capture(text) else {
        return Ok(None);
    };
    let custody = budget
        .reserve(support.map_or(0, str::len))
        .map_err(|_| StoreError::Capacity)?;
    Ok(Some(PointWords {
        x,
        z,
        support: support.map(str::to_owned),
        _custody: custody,
    }))
}
