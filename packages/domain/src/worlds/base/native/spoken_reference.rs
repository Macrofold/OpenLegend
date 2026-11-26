//! The bundled language's finite overheard-clause experiment. A match supplies
//! wording that may concern the listener. It resolves no person or event.
//! docs/projects/witness-decisions-and-memory-tech-design.md#3-supply-evidence-for-the-reasons
use std::ops::Range;

use crate::text::JsText;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ClauseKind {
    Statement,
    Question,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpokenReference<'a> {
    None,
    NameOnly,
    PossiblePersonalReference {
        passage: &'a JsText,
        kind: ClauseKind,
    },
}

/// Exact UTF-16 input and its ordered, non-overlapping ICU word offsets.
pub struct SpokenWords {
    pub units: Vec<u16>,
    pub spans: Vec<Range<usize>>,
}

#[derive(Clone, Copy)]
enum Opening {
    Sentence,
    Quote(u16),
}

const PREDICATES: &[&[&str]] = &[
    &["stole"],
    &["did", "not", "steal"],
    &["didn't", "steal"],
    &["didn’t", "steal"],
];
const COMPLEMENTS: &[&[&str]] = &[&["the", "toll", "money"], &["the", "money"], &["it"]];
const ABBREVIATED_TITLES: &[&str] = &["mr", "mrs", "ms", "dr", "st"];

/// Match a single heard passage using the language provider's word offsets.
/// The edges can stand for sentence boundaries only at the utterance edges.
pub fn match_passage<'a>(
    passage: &'a JsText,
    heard: &SpokenWords,
    self_names: &[SpokenWords],
    first_passage: bool,
    last_passage: bool,
) -> SpokenReference<'a> {
    let units = &heard.units;
    let words = &heard.spans;
    let mut result = SpokenReference::None;
    let mut in_straight_quote = false;
    for (index, word) in words.iter().enumerate() {
        let remainder = &words[index..];
        let previous = index.checked_sub(1).map(|i| &words[i]);
        let past_word = previous.map_or(0, |span| span.end);
        let before = &units[past_word..word.start];
        if first_passage {
            for _ in before.iter().filter(|unit| **unit == 0x22) {
                in_straight_quote = !in_straight_quote;
            }
        }
        let Some(opening) = opening(
            before,
            previous.map(|span| &units[span.clone()]),
            index == 0 && first_passage,
            in_straight_quote,
        ) else {
            if match_names(units, remainder, self_names).next().is_some() {
                result = SpokenReference::NameOnly;
            }
            continue;
        };
        let inverted = take_words(units, remainder, &["did"]).filter(|subject| {
            subject
                .first()
                .is_some_and(|name| whitespace(&units[word.end..name.start]))
        });
        for (subject, question) in [(Some(remainder), false), (inverted, true)] {
            let Some(subject) = subject else { continue };
            for after_name in match_names(units, subject, self_names) {
                if !question {
                    result = SpokenReference::NameOnly;
                }
                if let Some(kind) = clause(
                    units,
                    remainder,
                    after_name,
                    opening,
                    question,
                    last_passage,
                ) {
                    return SpokenReference::PossiblePersonalReference { passage, kind };
                }
            }
        }
    }
    result
}

fn match_names<'a>(
    units: &'a [u16],
    words: &'a [Range<usize>],
    names: &'a [SpokenWords],
) -> impl Iterator<Item = &'a [Range<usize>]> + 'a {
    names.iter().filter_map(move |name| {
        let count = name.spans.len();
        if count == 0 {
            return None;
        }
        let observed = words.get(..count)?;
        for (heard, alias) in observed.iter().zip(&name.spans) {
            if units[heard.clone()] != name.units[alias.clone()] {
                return None;
            }
        }
        for (heard, alias) in observed.windows(2).zip(name.spans.windows(2)) {
            let heard = &units[heard[0].end..heard[1].start];
            let alias = &name.units[alias[0].end..alias[1].start];
            if heard != alias
                && (heard.is_empty()
                    || alias.is_empty()
                    || !whitespace(heard)
                    || !whitespace(alias))
            {
                return None;
            }
        }
        Some(&words[count..])
    })
}

fn clause(
    units: &[u16],
    start: &[Range<usize>],
    after_name: &[Range<usize>],
    opening: Opening,
    question: bool,
    last_passage: bool,
) -> Option<ClauseKind> {
    let before_name = start.len() - after_name.len();
    let name_end = start[before_name - 1].end;
    if !whitespace(&units[name_end..after_name.first()?.start]) {
        return None;
    }
    let predicates = if question {
        &[&["steal"][..]][..]
    } else {
        PREDICATES
    };
    predicates.iter().find_map(|predicate| {
        let after_predicate = take_words(units, after_name, predicate)?;
        let predicate_end = after_name[predicate.len() - 1].end;
        if !whitespace(&units[predicate_end..after_predicate.first()?.start]) {
            return None;
        }
        COMPLEMENTS.iter().find_map(|complement| {
            let after_complement = take_words(units, after_predicate, complement)?;
            let end = after_predicate[complement.len() - 1].end;
            let following = after_complement
                .first()
                .map_or(units.len(), |word| word.start);
            ending(
                &units[end..following],
                opening,
                question,
                !after_complement.is_empty(),
                last_passage,
            )
        })
    })
}

fn take_words<'a>(
    units: &[u16],
    words: &'a [Range<usize>],
    expected: &[&str],
) -> Option<&'a [Range<usize>]> {
    let observed = words.get(..expected.len())?;
    for (index, (word, spelling)) in observed.iter().zip(expected).enumerate() {
        if index > 0 && !whitespace(&units[observed[index - 1].end..word.start]) {
            return None;
        }
        if !grammar_word(&units[word.clone()], spelling) {
            return None;
        }
    }
    Some(&words[expected.len()..])
}

fn grammar_word(units: &[u16], spelling: &str) -> bool {
    units
        .iter()
        .copied()
        .map(|unit| match unit {
            0x41..=0x5a => unit + 0x20,
            _ => unit,
        })
        .eq(spelling.encode_utf16())
}

fn opening(
    before: &[u16],
    previous: Option<&[u16]>,
    first: bool,
    in_straight_quote: bool,
) -> Option<Opening> {
    match before.iter().copied().rev().find(|unit| !space(*unit)) {
        Some(0x22) if in_straight_quote => return Some(Opening::Quote(0x22)),
        Some(0x201c) => return Some(Opening::Quote(0x201d)),
        None if first => return Some(Opening::Sentence),
        _ => {}
    }
    let previous = previous?;
    let (&mark, spacing) = before.split_first()?;
    if !clause_mark(mark) || spacing.is_empty() || !whitespace(spacing) {
        return None;
    }
    // A period can belong to a name, as in J. Oren or Mr. Oren.
    if mark == 0x2e
        && (matches!(previous, [0x41..=0x5a | 0x61..=0x7a])
            || previous.contains(&0x2e)
            || ABBREVIATED_TITLES
                .iter()
                .any(|title| grammar_word(previous, title)))
    {
        return None;
    }
    Some(Opening::Sentence)
}

fn ending(
    after: &[u16],
    opening: Opening,
    question: bool,
    word_follows: bool,
    last_passage: bool,
) -> Option<ClauseKind> {
    let Some(index) = after.iter().position(|unit| !space(*unit)) else {
        return (matches!(opening, Opening::Sentence)
            && !question
            && !word_follows
            && last_passage)
            .then_some(ClauseKind::Statement);
    };
    let mark = after[index];
    let tail = &after[index + 1..];
    let next_mark = tail.iter().copied().find(|unit| !space(*unit));
    let closed = match opening {
        Opening::Sentence => {
            clause_mark(mark)
                && next_mark != Some(0x2e)
                && tail.first().copied().map_or(!word_follows, |unit| {
                    space(unit) || matches!(unit, 0x22 | 0x201d)
                })
        }
        Opening::Quote(close) => mark == close || (clause_mark(mark) && next_mark == Some(close)),
    };
    if !closed || (question && mark != 0x3f) {
        return None;
    }
    Some(if mark == 0x3f {
        ClauseKind::Question
    } else {
        ClauseKind::Statement
    })
}

fn clause_mark(unit: u16) -> bool {
    matches!(unit, 0x2e | 0x3f | 0x21)
}

fn whitespace(units: &[u16]) -> bool {
    units.iter().copied().all(space)
}

fn space(unit: u16) -> bool {
    char::from_u32(u32::from(unit)).is_some_and(char::is_whitespace)
}
