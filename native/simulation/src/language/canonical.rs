//! Canonical bytes use the source ICU property order. Both hosts receive a
//! finite funded value and the simulation compares its complete semantic
//! cells. The formatter never receives live world state or grants permissions.
use crate::execution::ExecutionError;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;
use std::{borrow::Cow, cmp::Ordering, io::Write};

#[derive(Debug)]
pub enum CanonicalWriteError {
    InvalidRecord,
    Output,
}

/// Sort the keys of an admitted record with the supplied locale. Arrays and
/// scalar spellings stay exact. The caller funds the borrowing sort workspace
/// and output backing before calling.
pub fn write_canonical_record(
    input: &str,
    compare: &impl Fn(&str, &str) -> Option<Ordering>,
    out: &mut impl Write,
) -> Result<(), CanonicalWriteError> {
    let invalid = |_| CanonicalWriteError::InvalidRecord;
    match input.as_bytes().first() {
        Some(b'{') => {
            let mut object: IndexMap<String, &RawValue> =
                serde_json::from_str(input).map_err(invalid)?;
            let mut failed = false;
            object.sort_by(|left, _, right, _| compare_keys(compare, left, right, &mut failed));
            if failed {
                return Err(CanonicalWriteError::InvalidRecord);
            }
            sequence(b"{", b"}", object, out, |(key, value), out| {
                property(&key, out)?;
                write_canonical_record(value.get(), compare, out)
            })?;
        }
        Some(b'[') => {
            let array = serde_json::from_str::<Vec<&RawValue>>(input).map_err(invalid)?;
            sequence(b"[", b"]", array, out, |value, out| {
                write_canonical_record(value.get(), compare, out)
            })?;
        }
        Some(_) => out
            .write_all(input.as_bytes())
            .map_err(|_| CanonicalWriteError::Output)?,
        None => return Err(CanonicalWriteError::InvalidRecord),
    }
    Ok(())
}

/// Sort an already decoded record without encoding before the sort or copying
/// its values. The caller funds the list of references and the final output.
pub fn write_canonical_cell(
    input: &SqlCell,
    compare: &impl Fn(&str, &str) -> Option<Ordering>,
    out: &mut impl Write,
) -> Result<(), CanonicalWriteError> {
    match input {
        SqlCell::Object(members) => {
            let mut entries: Vec<_> = members.iter().enumerate().collect();
            let mut failed = false;
            entries.sort_unstable_by(|(i, (a, _)), (j, (b, _))| {
                compare_keys(compare, a, b, &mut failed).then_with(|| i.cmp(j))
            });
            if failed {
                return Err(CanonicalWriteError::InvalidRecord);
            }
            sequence(b"{", b"}", entries, out, |(_, (key, value)), out| {
                property(key, out)?;
                write_canonical_cell(value, compare, out)
            })
        }
        SqlCell::Array(values) => sequence(b"[", b"]", values, out, |value, out| {
            write_canonical_cell(value, compare, out)
        }),
        // Locale ordering uses Unicode property names. Scalar text can still
        // contain exact isolated UTF-16 units through the usual record writer.
        SqlCell::ExactObject(_) => Err(CanonicalWriteError::InvalidRecord),
        scalar => crate::encoding::write_json_record(scalar, &mut *out)
            .map_err(|_| CanonicalWriteError::InvalidRecord),
    }
}

fn compare_keys(
    compare: &impl Fn(&str, &str) -> Option<Ordering>,
    left: &str,
    right: &str,
    failed: &mut bool,
) -> Ordering {
    compare(left, right).unwrap_or_else(|| {
        *failed = true;
        Ordering::Equal
    })
}

fn property(key: &str, out: &mut impl Write) -> Result<(), CanonicalWriteError> {
    crate::encoding::write_json_record(key, &mut *out)
        .map_err(|_| CanonicalWriteError::InvalidRecord)?;
    out.write_all(b":").map_err(|_| CanonicalWriteError::Output)
}

fn sequence<T, W: Write>(
    open: &[u8],
    close: &[u8],
    items: impl IntoIterator<Item = T>,
    out: &mut W,
    mut item: impl FnMut(T, &mut W) -> Result<(), CanonicalWriteError>,
) -> Result<(), CanonicalWriteError> {
    let capacity = |_| CanonicalWriteError::Output;
    out.write_all(open).map_err(capacity)?;
    for (index, value) in items.into_iter().enumerate() {
        if index != 0 {
            out.write_all(b",").map_err(capacity)?;
        }
        item(value, out)?;
    }
    out.write_all(close).map_err(capacity)
}

#[derive(Serialize)]
pub(crate) struct CanonicalJsonRequest {
    pub binding: GeometryBinding,
    #[serde(rename = "value")]
    input: Arc<CanonicalJsonValue>,
    #[serde(skip)]
    reservation: ByteReservation,
    #[serde(skip)]
    budget: ByteBudget,
}
#[derive(Serialize)]
#[serde(transparent)]
pub(crate) struct CanonicalJsonValue {
    pub value: SqlCell,
    #[serde(skip)]
    reservation: ByteReservation,
}
impl CanonicalJsonValue {
    pub(crate) fn bytes(&self) -> usize {
        self.reservation.bytes()
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct CanonicalJsonAnswer {
    pub binding: GeometryBinding,
    pub canonical: String,
}
pub(crate) struct PreparedCanonicalJson {
    pub body: String,
    _reservation: ByteReservation,
}
impl PreparedCanonicalJson {
    pub(crate) fn into_parts(self) -> (String, ByteReservation) {
        (self.body, self._reservation)
    }
}
impl CanonicalJsonRequest {
    /// Make an independently owned, immutable formatter input from an existing
    /// typed value. The active cursor and its provider borrow the same body.
    pub(crate) fn copy_cell(
        binding: GeometryBinding,
        value: &SqlCell,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ExecutionError> {
        let input_custody = budget.reserve(Self::value_bytes(value)?)?;
        let reservation =
            budget.reserve(std::mem::size_of::<Self>() + 2 * std::mem::size_of::<usize>())?;
        Ok(Arc::new(Self {
            binding,
            input: Arc::new(CanonicalJsonValue {
                value: value.clone(),
                reservation: input_custody,
            }),
            reservation,
            budget: budget.clone(),
        }))
    }

    pub(crate) fn prepare<T: Serialize>(
        binding: GeometryBinding,
        input: &T,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let len = crate::encoding::json_record_len(input).map_err(|_| ExecutionError::Invariant)?;
        let reservation = budget.reserve(len.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
        let json = crate::encoding::json_record(input).map_err(|_| ExecutionError::Invariant)?;
        Self::admit_encoding(binding, Cow::Owned(json), budget, reservation)
    }

    /// Borrow the command owner's exact retained encoding long enough to
    /// prepare the formatter's funded cells. The answer has its own validation.
    pub(crate) fn borrow_encoding(
        binding: GeometryBinding,
        source: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::admit_encoding(binding, Cow::Borrowed(source), budget, budget.reserve(0)?)
    }

    fn admit_encoding(
        binding: GeometryBinding,
        json: Cow<'_, str>,
        budget: &ByteBudget,
        mut reservation: ByteReservation,
    ) -> Result<Self, ExecutionError> {
        let shape =
            crate::experience::encoded_body_bound(&json).map_err(|_| ExecutionError::Capacity)?;
        let encoded_allocation = match &json {
            Cow::Owned(value) => value.capacity(),
            Cow::Borrowed(_) => 0,
        };
        // One prepared input cell, the returned canonical bytes and temporary
        // comparison decoding coexist. This is scratch admission, not a claim
        // that encoded size equals retained allocation or process memory.
        reservation.resize(
            shape
                .checked_mul(2)
                .and_then(|n| n.checked_add(encoded_allocation))
                .and_then(|n| n.checked_add(json.len().checked_mul(4)?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let value = serde_json::from_str(&json).map_err(|_| ExecutionError::Invariant)?;
        drop(json);
        let input_bytes = Self::value_bytes(&value)?;
        reservation.resize(reservation.bytes().max(input_bytes))?;
        let input_custody = reservation.split_off(input_bytes)?;
        Ok(Self {
            binding,
            input: Arc::new(CanonicalJsonValue {
                value,
                reservation: input_custody,
            }),
            reservation,
            budget: budget.clone(),
        })
    }

    fn value_bytes(value: &SqlCell) -> Result<usize, ExecutionError> {
        value
            .heap_bytes()
            .and_then(|bytes| {
                bytes.checked_add(
                    std::mem::size_of::<CanonicalJsonValue>() + 2 * std::mem::size_of::<usize>(),
                )
            })
            .ok_or(ExecutionError::Capacity)
    }

    pub(crate) fn value(&self) -> &SqlCell {
        &self.input.value
    }

    /// Share the already admitted immutable value. The caller keeps its
    /// comparison workspace even if the provider still owns this value.
    pub(crate) fn input(&self) -> &Arc<CanonicalJsonValue> {
        &self.input
    }
    /// The mutable borrow gives one cursor exclusive use of its prefunded
    /// comparison workspace; malformed replies leave the question available.
    pub(crate) fn validate(&mut self, answer: &CanonicalJsonAnswer) -> Result<(), ExecutionError> {
        self.validate_shared_value(answer)
    }

    /// A typed format question shares only its immutable input with the
    /// worker; validation still runs once in the owning candidate lane.
    pub(crate) fn validate_shared_value(
        &self,
        answer: &CanonicalJsonAnswer,
    ) -> Result<(), ExecutionError> {
        if answer.binding != self.binding {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let decoding = crate::experience::encoded_body_bound(&answer.canonical)
            .map_err(|_| ExecutionError::Capacity)?;
        // The value and the supplied answer both have their own custody.
        let _extra = self
            .budget
            .reserve(decoding.saturating_sub(self.reservation.bytes()))?;
        let decoded: SqlCell =
            serde_json::from_str(&answer.canonical).map_err(|_| ExecutionError::Invariant)?;
        if &decoded != self.value() {
            return Err(ExecutionError::Invariant);
        }
        Ok(())
    }
    pub(crate) fn finish(
        mut self,
        answer: CanonicalJsonAnswer,
    ) -> Result<PreparedCanonicalJson, ExecutionError> {
        self.validate(&answer)?;
        drop(self.input);
        self.reservation.resize(answer.canonical.capacity())?;
        Ok(PreparedCanonicalJson {
            body: answer.canonical,
            _reservation: self.reservation,
        })
    }
}
