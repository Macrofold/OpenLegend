//! A candidate is a structural idea plus the actor's private bindings. Only the
//! completed native preparation can produce this retained batch member.
use super::normalize::{NormalizedActivity, object, string};
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::text::JsText;
use serde::ser::SerializeStruct;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct LearningMatch {
    pub method_id: String,
    pub occurrence_ids: Vec<String>,
}
pub(super) struct LearningCandidate {
    pub method: SqlCell,
    pub occurrence_ids: Vec<String>,
    pub bindings: SqlCell,
    pub description: JsText,
    pub other_evidence: Vec<String>,
    pub matches: Vec<LearningMatch>,
    pub matching_deferred: bool,
    pub indices: Vec<usize>,
    pub incomplete: bool,
    pub storage: ByteReservation,
}
impl Serialize for LearningCandidate {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut out = s.serialize_struct("ActivityCandidate", 8)?;
        out.serialize_field("signature", self.signature())?;
        out.serialize_field("method", &self.method)?;
        out.serialize_field("occurrenceIds", &self.occurrence_ids)?;
        out.serialize_field("bindings", &self.bindings)?;
        out.serialize_field("description", &self.description)?;
        if !self.other_evidence.is_empty() {
            out.serialize_field("otherEvidence", &self.other_evidence)?;
        }
        out.serialize_field("matches", &self.matches)?;
        if self.matching_deferred {
            out.serialize_field("matchingDeferred", &true)?;
        }
        out.end()
    }
}
fn content_label(value: &str) -> String {
    let mut hash = 2166136261u32;
    for unit in value.encode_utf16() {
        hash = (hash ^ u32::from(unit)).wrapping_mul(16777619);
    }
    let mut n = hash;
    let mut digits = Vec::with_capacity(7);
    loop {
        let d = (n % 36) as u8;
        digits.push(if d < 10 { b'0' + d } else { b'a' + d - 10 });
        n /= 36;
        if n == 0 {
            break;
        }
    }
    digits.reverse();
    String::from_utf8(digits).expect("base36 ASCII")
}
impl LearningCandidate {
    pub fn signature(&self) -> &str {
        self.method
            .get("signature")
            .and_then(SqlCell::as_str)
            .expect("constructed signature")
    }
    pub fn executable(&self) -> bool {
        self.method.get("executable").and_then(SqlCell::as_bool) == Some(true)
    }
    pub fn new(
        mut normalized: NormalizedActivity,
        signature: String,
        canonical_storage: ByteReservation,
        indices: Vec<usize>,
        incomplete: bool,
        state: &ActivityState,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        normalized.storage.merge(canonical_storage)?;
        let grow = normalized
            .name()
            .storage_bytes()
            .checked_mul(2)
            .and_then(|n| n.checked_add(signature.len()))
            .and_then(|n| {
                n.checked_add(size_of::<Self>() + 512 + indices.capacity() * size_of::<usize>())
            })
            .ok_or(ExecutionError::Capacity)?;
        normalized.storage.resize(
            normalized
                .storage
                .bytes()
                .checked_add(grow)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let name = normalized.name().clone();
        let id = format!("activity-{}", content_label(&signature));
        let SqlCell::Object(mut shape) = normalized.shape else {
            return Err(ExecutionError::Invariant);
        };
        let method = object([
            (
                "executable",
                shape
                    .shift_remove("executable")
                    .ok_or(ExecutionError::Invariant)?,
            ),
            ("id", string(id)),
            ("signature", string(signature)),
            (
                "manifest",
                shape
                    .shift_remove("manifest")
                    .ok_or(ExecutionError::Invariant)?,
            ),
            ("name", SqlCell::Text(name)),
            (
                "root",
                shape
                    .shift_remove("root")
                    .ok_or(ExecutionError::Invariant)?,
            ),
            (
                "roles",
                shape
                    .shift_remove("roles")
                    .ok_or(ExecutionError::Invariant)?,
            ),
        ]);
        if crate::encoding::json_record_len(&method).map_err(|_| ExecutionError::Invariant)? as u64
            > state.limits.record_bytes
        {
            return Ok(None);
        }
        if let Err(error) =
            super::models::validate_method(&method, &state.language, &state.limits, budget)
        {
            return if matches!(error, ActivityError::UnsupportedFamily) {
                Err(ExecutionError::UnsupportedFamily)
            } else {
                Ok(None)
            };
        }
        Ok(Some(Self {
            method,
            occurrence_ids: normalized.occurrence_ids,
            bindings: normalized.bindings,
            description: JsText::from(""),
            other_evidence: Vec::new(),
            matches: Vec::new(),
            matching_deferred: false,
            indices,
            incomplete,
            storage: normalized.storage,
        }))
    }
    pub fn already_known(&self, state: &ActivityState, actor: &str) -> bool {
        let known = state
            .library
            .methods
            .values()
            .find(|m| m.signature() == self.signature());
        let acquisition = known.and_then(|m| {
            state
                .library
                .acquisitions
                .get(actor)
                .and_then(|owner| owner.get(m.id()))
        });
        if state
            .learning
            .get(actor)
            .is_some_and(|c| c.assessed.iter().any(|s| s == self.signature()))
            && acquisition.is_none()
        {
            return true;
        }
        acquisition.is_some_and(|a| {
            a.body()
                .get("supports")
                .and_then(SqlCell::as_array)
                .is_some_and(|supports| {
                    supports.iter().any(|s| {
                        s.get("revoked").and_then(SqlCell::as_bool) != Some(true)
                            && same_ids(s.get("occurrenceIds"), &self.occurrence_ids)
                    })
                })
        })
    }
    pub fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.storage
            .resize(
                self.storage
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .map_err(Into::into)
    }
}
pub(super) fn same_ids(value: Option<&SqlCell>, ids: &[String]) -> bool {
    value.and_then(SqlCell::as_array).is_some_and(|a| {
        a.len() == ids.len()
            && a.iter()
                .zip(ids)
                .all(|(a, b)| a.as_str() == Some(b.as_str()))
    })
}
