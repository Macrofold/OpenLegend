//! The source canonicalJson uses Node ICU for property ordering. Prepare one
//! finite response body there, then bind and compare its complete semantic
//! cells here. The provider never receives world state or decides permissions.
use super::*;
use crate::geometry::GeometryBinding;
use crate::records::SqlCell;

#[derive(Serialize)]
pub(crate) struct ResponseDigestRequest {
    pub binding: GeometryBinding,
    pub value: SqlCell,
    #[serde(skip)]
    reservation: ByteReservation,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ResponseDigestAnswer {
    pub binding: GeometryBinding,
    pub canonical: String,
}
pub(super) struct ResponseDigest {
    pub body: String,
    _reservation: ByteReservation,
}
impl ResponseDigestRequest {
    pub(super) fn prepare<T: Serialize>(
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
        })
    }
    pub(super) fn finish(
        mut self,
        answer: ResponseDigestAnswer,
    ) -> Result<ResponseDigest, ExecutionError> {
        if answer.binding != self.binding {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let decoding = crate::experience::encoded_body_bound(&answer.canonical)
            .map_err(|_| ExecutionError::Capacity)?;
        self.reservation.resize(
            self.value
                .heap_bytes()
                .and_then(|n| n.checked_add(decoding))
                .and_then(|n| n.checked_add(answer.canonical.capacity()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let decoded: SqlCell =
            serde_json::from_str(&answer.canonical).map_err(|_| ExecutionError::Invariant)?;
        if decoded != self.value {
            return Err(ExecutionError::Invariant);
        }
        drop(decoded);
        drop(self.value);
        self.reservation.resize(answer.canonical.capacity())?;
        Ok(ResponseDigest {
            body: answer.canonical,
            _reservation: self.reservation,
        })
    }
}
