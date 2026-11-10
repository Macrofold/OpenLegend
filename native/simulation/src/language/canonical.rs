//! The source canonicalJson uses Node ICU for property ordering. Prepare one
//! finite JSON value there, then bind and compare its complete semantic
//! cells here. The provider never receives world state or decides permissions.
use crate::execution::ExecutionError;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub(crate) struct CanonicalJsonRequest {
    pub binding: GeometryBinding,
    pub value: SqlCell,
    #[serde(skip)]
    reservation: ByteReservation,
    #[serde(skip)]
    budget: ByteBudget,
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
        Ok(Self {
            binding,
            value,
            reservation,
            budget: budget.clone(),
        })
    }
    /// The mutable borrow gives one cursor exclusive use of its prefunded
    /// comparison workspace; malformed replies leave the question available.
    pub(crate) fn validate(&mut self, answer: &CanonicalJsonAnswer) -> Result<(), ExecutionError> {
        if answer.binding != self.binding {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let decoding = crate::experience::encoded_body_bound(&answer.canonical)
            .map_err(|_| ExecutionError::Capacity)?;
        let required = self
            .value
            .heap_bytes()
            .and_then(|n| n.checked_add(decoding))
            .and_then(|n| n.checked_add(answer.canonical.capacity()))
            .ok_or(ExecutionError::Capacity)?;
        let _extra = self
            .budget
            .reserve(required.saturating_sub(self.reservation.bytes()))?;
        let decoded: SqlCell =
            serde_json::from_str(&answer.canonical).map_err(|_| ExecutionError::Invariant)?;
        if decoded != self.value {
            return Err(ExecutionError::Invariant);
        }
        Ok(())
    }
    pub(crate) fn finish(
        mut self,
        answer: CanonicalJsonAnswer,
    ) -> Result<PreparedCanonicalJson, ExecutionError> {
        self.validate(&answer)?;
        drop(self.value);
        self.reservation.resize(answer.canonical.capacity())?;
        Ok(PreparedCanonicalJson {
            body: answer.canonical,
            _reservation: self.reservation,
        })
    }
}
