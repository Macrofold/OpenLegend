//! References belong to one immutable, personally owned literal. The prose is
//! never a source of identifiers. See witness-decisions-and-memory-tech-design §4.

use super::{ExperienceError, PersonalSourceKind, PersonalSourceRef};
use crate::host::retained_size::HeapBytes;
use crate::narration::NativeText;
use crate::reception::ObserverSubject;
use crate::text::{JsText, TextSlice};
use crate::values::{DefinitionPin, is_safe_record_id};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LiteralRange {
    pub start: usize,
    pub end: usize,
}

impl LiteralRange {
    pub(crate) fn fits(self, units: &[u16]) -> bool {
        let valid_boundary = |offset: usize| {
            offset <= units.len()
                && !(offset > 0
                    && offset < units.len()
                    && (0xd800..=0xdbff).contains(&units[offset - 1])
                    && (0xdc00..=0xdfff).contains(&units[offset]))
        };
        self.start < self.end && valid_boundary(self.start) && valid_boundary(self.end)
    }

    pub(crate) fn shifted(self, offset: usize) -> Option<Self> {
        Some(Self {
            start: self.start.checked_add(offset)?,
            end: self.end.checked_add(offset)?,
        })
    }

    fn selected_text(self, literal: &JsText) -> Option<TextSlice<'_>> {
        if self.start >= self.end {
            return None;
        }
        let passage = literal.borrowed().slice(self.start..self.end)?;
        match literal {
            JsText::Unicode(_) => passage.as_unicode()?,
            JsText::Utf16 { units, .. } if self.fits(units) => return Some(passage),
            JsText::Utf16 { .. } => return None,
        };
        Some(passage)
    }

    /// Find a single complete occurrence in an exact received passage. The
    /// ordinary Unicode path searches borrowed strings. An exceptional text
    /// with isolated surrogates is compared as code units without changing it.
    pub(crate) fn unique_quotation(
        passage: &JsText,
        quote: TextSlice<'_>,
        budget: &crate::host::ByteBudget,
    ) -> Result<Option<Self>, ExperienceError> {
        if quote.is_empty() {
            return Ok(None);
        }
        if let (Some(passage), Some(needle)) = (passage.as_unicode(), quote.as_unicode()) {
            let Some(start) = passage.find(needle) else {
                return Ok(None);
            };
            // Advance by one scalar so overlapping occurrences also count.
            let next = start
                + needle
                    .chars()
                    .next()
                    .expect("nonempty quotation")
                    .len_utf8();
            if passage[next..].contains(needle) {
                return Ok(None);
            }
            let start = passage[..start].encode_utf16().count();
            return Ok(Some(Self {
                start,
                end: start + quote.units_len(),
            }));
        }
        let _storage;
        let units = match passage {
            JsText::Utf16 { units, .. } => Cow::Borrowed(units.as_slice()),
            JsText::Unicode(_) => {
                _storage = budget
                    .reserve(
                        passage
                            .units_len()
                            .checked_mul(2)
                            .ok_or(ExperienceError::Capacity)?,
                    )
                    .map_err(|_| ExperienceError::Capacity)?;
                Cow::Owned(passage.units().collect::<Vec<_>>())
            }
        };
        let mut matches =
            units
                .windows(quote.units_len())
                .enumerate()
                .filter_map(|(start, candidate)| {
                    let range = Self {
                        start,
                        end: start + quote.units_len(),
                    };
                    (range.fits(&units) && candidate.iter().copied().eq(quote.units()))
                        .then_some(range)
                });
        Ok(matches.next().filter(|_| matches.next().is_none()))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum LiteralReference {
    Subject {
        subject: ObserverSubject,
    },
    Object {
        object_id: String,
    },
    Place {
        place_id: String,
    },
    Category {
        definition: DefinitionPin,
    },
    Time {
        from: f64,
        through: f64,
        calendar: DefinitionPin,
    },
    Source {
        source: PersonalSourceRef,
        #[serde(skip_serializing_if = "Option::is_none")]
        quote: Option<LiteralRange>,
    },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LiteralBinding {
    pub range: LiteralRange,
    pub reference: usize,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LiteralReferences {
    pub references: Vec<LiteralReference>,
    pub bindings: Vec<LiteralBinding>,
}

const INVALID: ExperienceError = ExperienceError::InvalidBody("literal references");

impl LiteralReferences {
    pub fn is_empty(&self) -> bool {
        self.references.is_empty() && self.bindings.is_empty()
    }

    pub fn requires_verbatim(&self, actor: &str) -> bool {
        self.references.iter().any(|reference| match reference {
            LiteralReference::Subject {
                subject: ObserverSubject::Entity { entity_id },
            } => entity_id != actor,
            _ => true,
        })
    }

    pub fn source_references(&self) -> impl Iterator<Item = &PersonalSourceRef> {
        self.references
            .iter()
            .filter_map(|reference| match reference {
                LiteralReference::Source { source, .. } => Some(source),
                _ => None,
            })
    }

    /// Add an occurrence of a reference supplied by the rendering owner. This
    /// only compares this literal's table and reads no world or history data.
    pub(crate) fn bind(&mut self, reference: LiteralReference, range: LiteralRange) {
        let key = self
            .references
            .iter()
            .position(|prior| *prior == reference)
            .unwrap_or_else(|| {
                let key = self.references.len();
                self.references.push(reference);
                key
            });
        self.bindings.push(LiteralBinding {
            range,
            reference: key,
        });
    }

    /// Check shape and UTF-16 boundaries in one literal scan. A lone surrogate
    /// is a real stored code unit; only splitting a valid pair is prohibited.
    /// This temporary unit vector is covered by the body/answer decode owner.
    pub(crate) fn validate(&self, text: &JsText) -> Result<(), ExperienceError> {
        if self.is_empty() {
            return Ok(());
        }
        if self.references.is_empty() || self.bindings.is_empty() {
            return Err(INVALID);
        }
        let units: Vec<_> = text.units().collect();
        for binding in &self.bindings {
            let reference = self.references.get(binding.reference).ok_or(INVALID)?;
            if !binding.range.fits(&units) {
                return Err(INVALID);
            }
            // Width is part of the exact quote contract even when an optional
            // original has aged out and can no longer be loaded at restore.
            if let LiteralReference::Source {
                quote: Some(quote), ..
            } = reference
                && quote.end.checked_sub(quote.start)
                    != Some(binding.range.end - binding.range.start)
            {
                return Err(INVALID);
            }
        }
        let mut used = vec![false; self.references.len()];
        for binding in &self.bindings {
            used[binding.reference] = true;
        }
        for (reference, used) in self.references.iter().zip(used) {
            let valid = match reference {
                LiteralReference::Subject { subject } => subject.validate(),
                LiteralReference::Object { object_id } => is_safe_record_id(object_id),
                LiteralReference::Place { place_id } => is_safe_record_id(place_id),
                LiteralReference::Category { definition } => definition.is_valid(),
                LiteralReference::Time {
                    from,
                    through,
                    calendar,
                } => {
                    from.is_finite()
                        && through.is_finite()
                        && from <= through
                        && calendar.is_valid()
                }
                LiteralReference::Source { source, quote } => {
                    source.validate() && quote.is_none_or(|range| range.start < range.end)
                }
            };
            if !used || !valid {
                return Err(INVALID);
            }
        }
        Ok(())
    }
}

impl HeapBytes for LiteralBinding {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}

impl HeapBytes for LiteralReference {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Subject { subject } => subject.heap_bytes(),
            Self::Object { object_id } => object_id.heap_bytes(),
            Self::Place { place_id } => place_id.heap_bytes(),
            Self::Category { definition }
            | Self::Time {
                calendar: definition,
                ..
            } => definition
                .id
                .capacity()
                .checked_add(definition.digest.capacity()),
            Self::Source { source, .. } => source.heap_bytes(),
        }
    }
}

impl LiteralReferences {
    pub fn storage_bytes(&self) -> Option<usize> {
        self.references
            .heap_bytes()?
            .checked_add(self.bindings.heap_bytes()?)
    }
}

/// Read the revision's annotations and its exact literal only when it has a
/// table. Used by current-format storage and exact selected readers, under the
/// caller's existing body decode reservation.
pub(super) fn decode_record(
    kind: PersonalSourceKind,
    payload: &str,
) -> Result<LiteralReferences, ExperienceError> {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Record<'a> {
        literal_references: LiteralReferences,
        #[serde(borrow)]
        summary: Option<&'a serde_json::value::RawValue>,
        #[serde(borrow)]
        text: Option<&'a serde_json::value::RawValue>,
    }
    let record: Record<'_> = serde_json::from_str(payload).map_err(|_| INVALID)?;
    let literal = match kind {
        PersonalSourceKind::Memory => {
            serde_json::from_str(record.summary.ok_or(INVALID)?.get()).map_err(|_| INVALID)?
        }
        PersonalSourceKind::Awareness | PersonalSourceKind::Summary => {
            let NativeText::Literal(text) =
                serde_json::from_str(record.text.ok_or(INVALID)?.get()).map_err(|_| INVALID)?
            else {
                return Err(INVALID);
            };
            text
        }
    };
    record.literal_references.validate(&literal)?;
    Ok(record.literal_references)
}

/// Exact selected personal evidence can support a quotation, never a shared
/// event row or similarly worded account. This runs only on annotation writes.
pub(super) fn validate_sources(
    annotations: &LiteralReferences,
    literal: &JsText,
    experience: &super::ExperienceState,
    actor: &str,
    budget: &crate::host::ByteBudget,
) -> Result<(), ExperienceError> {
    for (index, reference) in annotations.references.iter().enumerate() {
        let LiteralReference::Source { source, quote } = reference else {
            continue;
        };
        let owner = experience
            .actor(actor)
            .ok_or(ExperienceError::ForeignOwner)?;
        if owner.privacy.revoked(&source.id) {
            return Err(ExperienceError::Revoked);
        }
        let record = owner
            .collection(source.kind)?
            .resident_record(&source.id)
            .filter(|record| record.header().reference == *source)
            .ok_or(ExperienceError::Unavailable)?;
        if record
            .header()
            .privacy_dependencies
            .iter()
            .any(|id| owner.privacy.revoked(id))
        {
            return Err(ExperienceError::Revoked);
        }
        if let Some(range) = quote {
            let validate_match = |source_text: &JsText, range: LiteralRange| {
                let quote = range.selected_text(source_text).ok_or(INVALID)?;
                for binding in annotations
                    .bindings
                    .iter()
                    .filter(|binding| binding.reference == index)
                {
                    let text = literal
                        .borrowed()
                        .slice(binding.range.start..binding.range.end)
                        .ok_or(INVALID)?;
                    if !quote.units().eq(text.units()) {
                        return Err(INVALID);
                    }
                }
                Ok(())
            };
            if source.kind == PersonalSourceKind::Awareness {
                #[derive(Deserialize)]
                struct SpeechAccount {
                    speech: Option<ReceivedSpeech>,
                }
                #[derive(Deserialize)]
                struct ReceivedSpeech {
                    segments: Vec<crate::reception::SpeechSegment>,
                }
                let _decode = budget
                    .reserve(super::encoded_body_bound(record.payload())?)
                    .map_err(|_| ExperienceError::Capacity)?;
                let facts: SpeechAccount =
                    serde_json::from_str(record.payload()).map_err(|_| INVALID)?;
                if let Some(speech) = facts.speech {
                    let (_, segment, words) = crate::speech::quoted_segments(&speech.segments)
                        .find(|(_, segment, _)| {
                            segment.start <= range.start && range.end <= segment.end
                        })
                        .ok_or(INVALID)?;
                    validate_match(
                        words,
                        LiteralRange {
                            start: range.start - segment.start,
                            end: range.end - segment.start,
                        },
                    )?;
                    continue;
                }
            }
            let (source_text, _storage) =
                super::consolidation::consolidation_reading(record, budget).map_err(|error| {
                    match error {
                        crate::execution::ExecutionError::Capacity => ExperienceError::Capacity,
                        _ => INVALID,
                    }
                })?;
            validate_match(&source_text, *range)?;
        }
    }
    Ok(())
}
