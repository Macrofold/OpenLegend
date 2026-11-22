//! Canonical bytes use the source ICU property order. Both hosts receive a
//! finite funded value and the simulation compares its complete semantic
//! cells. The formatter never receives live world state or grants permissions.
use crate::execution::ExecutionError;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

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
        let mut reservation =
            budget.reserve(len.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
        let json = crate::encoding::json_record(input).map_err(|_| ExecutionError::Invariant)?;
        let shape =
            crate::experience::encoded_body_bound(&json).map_err(|_| ExecutionError::Capacity)?;
        // One prepared input cell, the returned canonical bytes and temporary
        // comparison decoding coexist. This is scratch admission, not a claim
        // that encoded size equals retained allocation or process memory.
        reservation.resize(
            shape
                .checked_mul(2)
                .and_then(|n| n.checked_add(json.capacity()))
                .and_then(|n| n.checked_add(len.checked_mul(4)?))
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
