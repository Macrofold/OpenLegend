//! Finite preparation by the same ICU environment as the source runtime. It
//! supplies language facts, never observer knowledge or executable world policy.

use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::mem::size_of;

mod attempts;
pub(crate) use attempts::{
    AttemptNormalizationAnswer, AttemptNormalizationRequest, NormalizedAttempt,
    NormalizedAttemptFacts, FreeTypedActionSyntax,
};

#[derive(Debug)]
pub(crate) enum CollationError {
    Capacity,
    Binding,
    Permutation,
    Groups,
    MissingKey,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WordsRequest {
    binding: GeometryBinding,
    strings: Vec<crate::text::JsText>,
    #[serde(skip)]
    reservation: ByteReservation,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct WordsAnswer {
    pub binding: GeometryBinding,
    pub words: Vec<Vec<crate::text::JsText>>,
}
pub(crate) struct WordFacts {
    words: Vec<Vec<crate::text::JsText>>,
    _reservation: ByteReservation,
}
impl WordFacts {
    pub(crate) fn get(&self, index: usize) -> Option<&[crate::text::JsText]> {
        self.words.get(index).map(Vec::as_slice)
    }
}
impl WordsRequest {
    pub(crate) fn prepare<'a, I>(
        binding: GeometryBinding,
        strings: I,
        budget: &ByteBudget,
    ) -> Result<Self, CollationError>
    where
        I: Iterator<Item = &'a crate::text::JsText> + Clone,
    {
        let (count, bytes) = strings
            .clone()
            .try_fold((0usize, 0usize), |(count, bytes), value| {
                Some((
                    count.checked_add(1)?,
                    bytes.checked_add(value.storage_bytes())?,
                ))
            })
            .ok_or(CollationError::Capacity)?;
        // Every word-like result owns a nonempty source slice. Fund the request
        // plus the maximum simultaneous returned slices before either copy.
        // Deserialized nonempty Vec capacity can grow to twice its length or
        // the pinned allocator's four-element minimum. Include both outer and
        // inner vectors while the request still owns its input strings.
        let outer = count.checked_mul(2).ok_or(CollationError::Capacity)?.max(4);
        let inner = bytes
            .checked_mul(2)
            .ok_or(CollationError::Capacity)?
            .max(count.checked_mul(4).ok_or(CollationError::Capacity)?);
        let allowance = heap_sum([
            size_of::<Self>() + size_of::<WordFacts>(),
            count
                .checked_mul(size_of::<crate::text::JsText>())
                .ok_or(CollationError::Capacity)?,
            outer
                .checked_mul(size_of::<Vec<crate::text::JsText>>())
                .ok_or(CollationError::Capacity)?,
            inner
                .checked_mul(size_of::<crate::text::JsText>())
                .ok_or(CollationError::Capacity)?,
            bytes.checked_mul(2).ok_or(CollationError::Capacity)?,
        ])
        .ok_or(CollationError::Capacity)?;
        let reservation = budget
            .reserve(allowance)
            .map_err(|_| CollationError::Capacity)?;
        let mut owned = Vec::new();
        owned
            .try_reserve_exact(count)
            .map_err(|_| CollationError::Capacity)?;
        owned.extend(strings.cloned());
        Ok(Self {
            binding,
            strings: owned,
            reservation,
        })
    }
    pub(crate) fn strings(&self) -> &[crate::text::JsText] {
        &self.strings
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn finish(self, answer: WordsAnswer) -> Result<WordFacts, CollationError> {
        if self.binding != answer.binding {
            return Err(CollationError::Binding);
        }
        if self.strings.len() != answer.words.len() {
            return Err(CollationError::Permutation);
        }
        for (text, words) in self.strings.iter().zip(&answer.words) {
            let mut from = 0;
            for word in words {
                if word.is_empty() {
                    return Err(CollationError::MissingKey);
                }
                let Some(at) = text.find_from(word, from) else {
                    return Err(CollationError::MissingKey);
                };
                from = at + word.units_len();
            }
        }
        let Self {
            binding: _,
            strings,
            mut reservation,
        } = self;
        drop(strings);
        reservation
            .resize(
                size_of::<WordFacts>()
                    + answer.words.heap_bytes().ok_or(CollationError::Capacity)?,
            )
            .map_err(|_| CollationError::Capacity)?;
        Ok(WordFacts {
            words: answer.words,
            _reservation: reservation,
        })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CollationAnswer {
    pub binding: GeometryBinding,
    pub order: Vec<u32>,
    /// Aligned with `order`; ICU-equivalent strings share a group. Keeping
    /// equivalence is necessary for each later stable sort's own input order.
    pub groups: Vec<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CollationRequest {
    binding: GeometryBinding,
    strings: Vec<String>,
    #[serde(skip)]
    reservation: ByteReservation,
}

pub(crate) struct CollationRanks {
    ranks: IndexMap<String, u32>,
    _reservation: ByteReservation,
}

impl CollationRequest {
    pub(crate) fn prepare<'a, I>(
        binding: GeometryBinding,
        strings: I,
        budget: &ByteBudget,
    ) -> Result<Self, CollationError>
    where
        I: Iterator<Item = &'a str> + Clone,
    {
        let (count, bytes) = strings
            .clone()
            .try_fold((0usize, 0usize), |(n, bytes), value| {
                Some((n.checked_add(1)?, bytes.checked_add(value.len())?))
            })
            .ok_or(CollationError::Capacity)?;
        if count > u32::MAX as usize {
            return Err(CollationError::Capacity);
        }
        // Reserve both the request and the peak while consuming its answer.
        // Only one allocation owns each string after the request is consumed.
        let allowance = heap_sum([
            size_of::<Self>() + size_of::<CollationRanks>(),
            bytes,
            count
                .checked_mul(size_of::<String>() + size_of::<bool>() + size_of::<u32>())
                .ok_or(CollationError::Capacity)?,
            map_storage::<String, u32>(count).ok_or(CollationError::Capacity)?,
        ])
        .ok_or(CollationError::Capacity)?;
        let reservation = budget
            .reserve(allowance)
            .map_err(|_| CollationError::Capacity)?;
        let mut owned = Vec::new();
        owned
            .try_reserve_exact(count)
            .map_err(|_| CollationError::Capacity)?;
        owned.extend(strings.map(str::to_owned));
        Ok(Self {
            binding,
            strings: owned,
            reservation,
        })
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn strings(&self) -> &[String] {
        &self.strings
    }

    pub(crate) fn finish(self, answer: &CollationAnswer) -> Result<CollationRanks, CollationError> {
        if self.binding != answer.binding {
            return Err(CollationError::Binding);
        }
        let count = self.strings.len();
        if answer.order.len() != count || answer.groups.len() != count {
            return Err(CollationError::Permutation);
        }
        let mut seen = vec![false; count];
        let mut last_group = None;
        for (&index, &group) in answer.order.iter().zip(&answer.groups) {
            let seen = seen
                .get_mut(index as usize)
                .ok_or(CollationError::Permutation)?;
            if std::mem::replace(seen, true) {
                return Err(CollationError::Permutation);
            }
            if last_group.map_or(group != 0, |prior| group != prior && group != prior + 1) {
                return Err(CollationError::Groups);
            }
            last_group = Some(group);
        }
        let Self {
            binding: _,
            strings,
            mut reservation,
        } = self;
        let mut ranks_by_input = vec![0; count];
        for (&index, &group) in answer.order.iter().zip(&answer.groups) {
            ranks_by_input[index as usize] = group;
        }
        let mut ranks = IndexMap::with_capacity(count);
        for (string, rank) in strings.into_iter().zip(ranks_by_input) {
            if let Some(previous) = ranks.insert(string, rank)
                && previous != rank
            {
                return Err(CollationError::Groups);
            }
        }
        drop(seen);
        reservation
            .resize(
                size_of::<CollationRanks>() + ranks.heap_bytes().ok_or(CollationError::Capacity)?,
            )
            .map_err(|_| CollationError::Capacity)?;
        Ok(CollationRanks {
            ranks,
            _reservation: reservation,
        })
    }
}
impl CollationRanks {
    pub(crate) fn rank(&self, key: &str) -> Result<u32, CollationError> {
        self.ranks
            .get(key)
            .copied()
            .ok_or(CollationError::MissingKey)
    }
    pub(crate) fn compare(&self, a: &str, b: &str) -> Result<Ordering, CollationError> {
        if a == b {
            return Ok(Ordering::Equal);
        }
        let a = self.ranks.get(a).ok_or(CollationError::MissingKey)?;
        let b = self.ranks.get(b).ok_or(CollationError::MissingKey)?;
        Ok(a.cmp(b))
    }
}
