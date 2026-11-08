//! Utterance-local partial hearing over the existing ICU provider's exact word
//! boundaries. Its saved mask uses the source local stream, never world RNG.

use crate::encoding::{content_hash, js_trim};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::SpeechSegment;
use crate::values::deserialize_safe_integer;
use serde::Deserialize;
use std::mem::size_of;
use std::sync::Arc;

mod contact;
pub(crate) use contact::*;
mod awareness;
pub(crate) use awareness::*;
mod receiver;
pub(crate) use receiver::*;

#[derive(Clone, Copy, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SpeechWord {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub start: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub end: u64,
}

#[derive(Debug)]
pub(crate) enum SpeechError {
    Capacity,
    InvalidWords,
}

pub(crate) struct SpeechWords {
    text: Arc<str>,
    lowercase: String,
    words: Vec<SpeechWord>,
    _reservation: ByteReservation,
}

pub(crate) struct HeardSegments {
    pub segments: Vec<SpeechSegment>,
    pub reservation: ByteReservation,
}

impl SpeechWords {
    pub(crate) fn clear(&self, budget: &ByteBudget) -> Result<HeardSegments, SpeechError> {
        let reservation = budget
            .reserve(size_of::<HeardSegments>() + size_of::<SpeechSegment>() + self.text.len())
            .map_err(|_| SpeechError::Capacity)?;
        let mut segments = Vec::new();
        segments
            .try_reserve_exact(1)
            .map_err(|_| SpeechError::Capacity)?;
        segments.push(SpeechSegment::Heard {
            text: self.text.to_string(),
        });
        Ok(HeardSegments {
            segments,
            reservation,
        })
    }
    pub(crate) fn prepare(
        text: &str,
        words: &[SpeechWord],
        lowercase: &str,
        budget: &ByteBudget,
    ) -> Result<Self, SpeechError> {
        let mut previous = 0;
        for word in words {
            let start = usize::try_from(word.start).map_err(|_| SpeechError::InvalidWords)?;
            let end = usize::try_from(word.end).map_err(|_| SpeechError::InvalidWords)?;
            if start < previous
                || end <= start
                || end > text.len()
                || !text.is_char_boundary(start)
                || !text.is_char_boundary(end)
            {
                return Err(SpeechError::InvalidWords);
            }
            previous = end;
        }
        let bytes = words
            .len()
            .checked_mul(size_of::<SpeechWord>())
            .and_then(|bytes| bytes.checked_add(text.len()))
            .and_then(|bytes| bytes.checked_add(lowercase.len()))
            .and_then(|bytes| bytes.checked_add(size_of::<Self>() + 2 * size_of::<usize>()))
            .ok_or(SpeechError::Capacity)?;
        let reservation = budget.reserve(bytes).map_err(|_| SpeechError::Capacity)?;
        let mut owned = Vec::new();
        owned
            .try_reserve_exact(words.len())
            .map_err(|_| SpeechError::Capacity)?;
        owned.extend_from_slice(words);
        Ok(Self {
            text: Arc::from(text),
            lowercase: lowercase.to_owned(),
            words: owned,
            _reservation: reservation,
        })
    }

    pub(crate) fn text(&self) -> &str {
        &self.text
    }
    pub(crate) fn lowercase(&self) -> &str {
        &self.lowercase
    }

    pub(crate) fn partial(
        &self,
        key: &str,
        budget: &ByteBudget,
    ) -> Result<HeardSegments, SpeechError> {
        let count = self.words.len();
        // The source allocates runs then a heard set. A dense bool vector gives
        // the same selected indices without per-word hash allocation or order.
        let bytes = count
            .checked_mul(size_of::<(usize, usize)>() + size_of::<bool>())
            .and_then(|bytes| {
                bytes.checked_add(count.max(1).checked_mul(size_of::<SpeechSegment>())?)
            })
            .and_then(|bytes| bytes.checked_add(self.text.len()))
            .and_then(|bytes| bytes.checked_add(key.len()))
            .and_then(|bytes| bytes.checked_add(size_of::<HeardSegments>() + 15))
            .ok_or(SpeechError::Capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| SpeechError::Capacity)?;
        let mut seed = content_hash(&format!("speech-mask-v1:{key}"));
        let mut random = || {
            seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            f64::from(seed) / 4_294_967_296.0
        };
        let mut runs = Vec::new();
        runs.try_reserve_exact(count)
            .map_err(|_| SpeechError::Capacity)?;
        let mut at = 0;
        while at < count {
            let end = (at + 1 + (random() * 3.0).floor() as usize).min(count);
            runs.push((at, end));
            at = end;
        }
        for index in (1..runs.len()).rev() {
            let other = (random() * (index + 1) as f64).floor() as usize;
            runs.swap(index, other);
        }
        let mut remaining = if count == 1 {
            usize::from(random() < 0.5)
        } else {
            count / 2
        };
        let mut heard = Vec::new();
        heard
            .try_reserve_exact(count)
            .map_err(|_| SpeechError::Capacity)?;
        heard.resize(count, false);
        for (from, to) in runs.iter().copied() {
            let end = (from + remaining).min(to);
            heard[from..end].fill(true);
            remaining -= end - from;
            if remaining == 0 {
                break;
            }
        }
        let mut segments = Vec::new();
        segments
            .try_reserve_exact(count.max(1))
            .map_err(|_| SpeechError::Capacity)?;
        let mut at = 0;
        while at < count {
            let from = at;
            let visible = heard[at];
            while at < count && heard[at] == visible {
                at += 1;
            }
            if visible {
                let end = if at == count {
                    self.text.len()
                } else {
                    self.words[at - 1].end as usize
                };
                segments.push(SpeechSegment::Heard {
                    text: js_trim(&self.text[self.words[from].start as usize..end]).to_owned(),
                });
            } else {
                segments.push(SpeechSegment::Unintelligible);
            }
        }
        if segments.is_empty() {
            segments.push(SpeechSegment::Unintelligible);
        }
        drop(runs);
        drop(heard);
        reservation
            .resize(
                size_of::<HeardSegments>()
                    + segments.capacity() * size_of::<SpeechSegment>()
                    + segments
                        .iter()
                        .map(|segment| match segment {
                            SpeechSegment::Heard { text } => text.capacity(),
                            SpeechSegment::Unintelligible => 0,
                        })
                        .sum::<usize>(),
            )
            .map_err(|_| SpeechError::Capacity)?;
        Ok(HeardSegments {
            segments,
            reservation,
        })
    }
}
