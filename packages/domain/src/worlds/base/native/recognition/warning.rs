//! A partially understood utterance cannot drop a negation and become a claim.
use super::*;
use crate::encoding::js_trim;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::reception::SpeechSegment;
use std::mem::size_of;
pub(crate) struct WarningInterpretation {
    pub label: String,
    pub duration: f64,
    _reservation: ByteReservation,
}
fn prefix_end(text: &str, literal: &str) -> Option<usize> {
    let mut chars = text.char_indices();
    let mut end = 0;
    for wanted in literal.chars() {
        let (at, actual) = chars.next()?;
        let mut lower = actual.to_lowercase();
        if lower.next() != Some(wanted) || lower.next().is_some() {
            return None;
        }
        end = at + actual.len_utf8();
    }
    Some(end)
}
pub(crate) fn ordinary_warning(
    policy: &RecognitionPolicy,
    time_scale: f64,
    segments: &[SpeechSegment],
    budget: &ByteBudget,
) -> Result<Option<WarningInterpretation>, ReceivedError> {
    if segments.is_empty()
        || segments
            .iter()
            .any(|segment| !matches!(segment, SpeechSegment::Heard { .. }))
    {
        return Ok(None);
    }
    let bytes = segments
        .iter()
        .try_fold(segments.len(), |bytes, segment| match segment {
            SpeechSegment::Heard { text } => bytes.checked_add(text.len()),
            _ => Some(bytes),
        })
        .ok_or(ReceivedError(
            "Warning interpretation exceeds native byte allowance.",
        ))?;
    let reservation = budget
        .reserve(
            bytes
                .checked_mul(2)
                .and_then(|n| n.checked_add(size_of::<WarningInterpretation>()))
                .ok_or(ReceivedError(
                    "Warning interpretation exceeds native byte allowance.",
                ))?,
        )
        .map_err(|_| ReceivedError("Warning interpretation exceeds native byte allowance."))?;
    let text = segments
        .iter()
        .filter_map(|segment| match segment {
            SpeechSegment::Heard { text } => Some(text.as_str()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join(" ");
    let mut clauses = text
        .split(|c| policy.warning.delimiters.contains(c))
        .map(js_trim)
        .filter(|s| !s.is_empty());
    let Some(clause) = clauses.next() else {
        return Ok(None);
    };
    if clauses.next().is_some()
        || clause
            .chars()
            .any(|c| matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}'))
    {
        return Ok(None);
    }
    for prefix in &policy.warning.prefixes {
        let Some(end) = prefix_end(clause, prefix) else {
            continue;
        };
        let after = &clause[end..];
        let Some(end) = prefix_end(after, &policy.warning.join) else {
            continue;
        };
        let remainder = &after[end..];
        // Source's fixed suffix is matched case-insensitively. Compare its
        // finite characters from the end so the captured place keeps its text.
        let count = policy.warning.suffix.chars().count();
        let Some((start, _)) = remainder.char_indices().rev().nth(count.saturating_sub(1)) else {
            continue;
        };
        if prefix_end(&remainder[start..], &policy.warning.suffix) != Some(remainder.len() - start)
        {
            continue;
        }
        let label = js_trim(&remainder[..start]);
        if !label.is_empty() {
            return Ok(Some(WarningInterpretation {
                label: label.to_owned(),
                duration: policy.warning_seconds * time_scale,
                _reservation: reservation,
            }));
        }
    }
    Ok(None)
}
