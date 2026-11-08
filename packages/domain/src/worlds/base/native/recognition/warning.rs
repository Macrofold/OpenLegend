//! A partially understood utterance cannot drop a negation and become a claim.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::reception::SpeechSegment;
use crate::text::{JsText, TextSlice};
use std::mem::size_of;
pub(crate) struct WarningInterpretation {
    pub label: JsText,
    pub duration: f64,
    _reservation: ByteReservation,
}
fn prefix_end(text: TextSlice<'_>, literal: &str) -> Option<usize> {
    let mut units = text.units();
    let mut end = 0;
    for wanted in literal.chars() {
        let actual = char::from_u32(u32::from(units.next()?))?;
        let mut lower = actual.to_lowercase();
        if lower.next() != Some(wanted) || lower.next().is_some() {
            return None;
        }
        end += 1;
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
            SpeechSegment::Heard { text } => bytes.checked_add(text.storage_bytes()),
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
    let text = JsText::join(
        segments.iter().filter_map(|segment| match segment {
            SpeechSegment::Heard { text } => Some(text),
            _ => None,
        }),
        " ",
    );
    let full = text.borrowed();
    let mut start = 0;
    let mut clause = None;
    for end in (0..=text.units_len()).filter(|at| {
        *at == text.units_len()
            || text.unit_at(*at).is_some_and(|unit| {
                policy
                    .warning
                    .delimiters
                    .encode_utf16()
                    .any(|delimiter| delimiter == unit)
            })
    }) {
        let candidate = full
            .slice(start..end)
            .expect("bounded warning clause")
            .trimmed();
        start = end + 1;
        if candidate.is_empty() {
            continue;
        }
        if clause.replace(candidate).is_some() {
            return Ok(None);
        }
    }
    let Some(clause) = clause else {
        return Ok(None);
    };
    if clause
        .units()
        .any(|unit| matches!(unit, 10 | 13 | 0x2028 | 0x2029))
    {
        return Ok(None);
    }
    for prefix in &policy.warning.prefixes {
        let Some(end) = prefix_end(clause, prefix) else {
            continue;
        };
        let after = clause
            .slice(end..clause.units_len())
            .expect("matched prefix");
        let Some(end) = prefix_end(after, &policy.warning.join) else {
            continue;
        };
        let remainder = after
            .slice(end..after.units_len())
            .expect("matched warning join");
        let count = policy.warning.suffix.encode_utf16().count();
        let Some(start) = remainder.units_len().checked_sub(count) else {
            continue;
        };
        let suffix = remainder
            .slice(start..remainder.units_len())
            .expect("bounded warning suffix");
        if prefix_end(suffix, &policy.warning.suffix) != Some(count) {
            continue;
        }
        let label = remainder
            .slice(0..start)
            .expect("bounded warning label")
            .trimmed();
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
