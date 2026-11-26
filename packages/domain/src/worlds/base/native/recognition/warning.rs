//! A partially understood utterance cannot drop a negation and become a claim.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::install::InstallError;
use crate::received::ReceivedError;
use crate::reception::{DetectorIdentity, ObservedLocation, PossibleStrength, SpeechSegment};
use crate::text::{JsText, TextSlice};
use crate::worlds::base_observed::{
    ClaimPresence, ClaimedInterval, IntervalKind, IntervalPrecision, ObservationClaim,
};
use std::mem::size_of;
pub(crate) struct WarningInterpretation<'a> {
    pub label: JsText,
    pub duration: f64,
    detector: &'a DetectorIdentity,
    _reservation: ByteReservation,
}

impl WarningInterpretation<'_> {
    pub(crate) fn detector(&self) -> &DetectorIdentity {
        self.detector
    }

    /// Build the owned testimony once the caller has admitted storage and
    /// resolved this listener's actual place support.
    pub(crate) fn testimony(
        &self,
        location: &ObservedLocation,
        at: f64,
    ) -> (ObservationClaim, PossibleStrength, DetectorIdentity) {
        (
            ObservationClaim::Danger {
                location: location.clone(),
                when: ClaimedInterval {
                    kind: IntervalKind::StatedInterval,
                    from: at,
                    through: at + self.duration,
                    precision: IntervalPrecision::Approximate,
                },
                presence: ClaimPresence::Possible,
            },
            PossibleStrength::Possible,
            self.detector.clone(),
        )
    }
}

impl RecognitionPolicy {
    pub(crate) fn validate_warning(&self) -> Result<(), InstallError> {
        let warning = &self.warning;
        if !warning.seconds.is_finite()
            || warning.seconds <= 0.0
            || warning.detector.id.is_empty()
            || warning.detector.version == 0
        {
            return Err(InstallError::DefinitionBody);
        }
        Ok(())
    }

    /// Interpret only complete received segments. Temporary label storage stays
    /// charged until the caller resolves the place and drops the interpretation.
    pub(crate) fn interpret_heard_warning(
        &self,
        time_scale: f64,
        segments: &[SpeechSegment],
        budget: &ByteBudget,
    ) -> Result<Option<WarningInterpretation<'_>>, ReceivedError> {
        ordinary_warning(&self.warning, time_scale, segments, budget)
    }
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
fn ordinary_warning<'a>(
    rules: &'a WarningRules,
    time_scale: f64,
    segments: &[SpeechSegment],
    budget: &ByteBudget,
) -> Result<Option<WarningInterpretation<'a>>, ReceivedError> {
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
                rules
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
    for prefix in &rules.prefixes {
        let Some(end) = prefix_end(clause, prefix) else {
            continue;
        };
        let after = clause
            .slice(end..clause.units_len())
            .expect("matched prefix");
        let Some(end) = prefix_end(after, &rules.join) else {
            continue;
        };
        let remainder = after
            .slice(end..after.units_len())
            .expect("matched warning join");
        let count = rules.suffix.encode_utf16().count();
        let Some(start) = remainder.units_len().checked_sub(count) else {
            continue;
        };
        let suffix = remainder
            .slice(start..remainder.units_len())
            .expect("bounded warning suffix");
        if prefix_end(suffix, &rules.suffix) != Some(count) {
            continue;
        }
        let label = remainder
            .slice(0..start)
            .expect("bounded warning label")
            .trimmed();
        if !label.is_empty() {
            let duration = rules.seconds * time_scale;
            if !duration.is_finite() {
                return Err(ReceivedError(
                    "The installed warning duration must be finite.",
                ));
            }
            return Ok(Some(WarningInterpretation {
                label: label.to_owned(),
                duration,
                detector: &rules.detector,
                _reservation: reservation,
            }));
        }
    }
    Ok(None)
}
