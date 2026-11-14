//! Personally received terms are not the live consent record. Source:
//! personal-social.ts::validatePersonalSocial. Keep that grammar and its exact
//! ordered body, including expired/ended terms and point extras.
use crate::execution::ExecutionError;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::text::JsText;
use crate::values::is_safe_record_text;
use serde::{Serialize, Serializer};
use std::mem::size_of;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum MovementTermsKind {
    Travel,
    CombatHelp,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum MovementTermsStatus {
    Pending,
    Traveling,
    Helping,
    Ended,
}

pub(crate) struct MovementTerms {
    body: SqlCell,
    allocation: ByteReservation,
}
fn invalid() -> ExecutionError {
    ExecutionError::InvalidCheckpoint
}
fn member<'a>(v: &'a SqlCell, key: &str) -> Result<&'a SqlCell, ExecutionError> {
    v.get(key).ok_or_else(invalid)
}
fn fields(v: &SqlCell, required: &[&str], optional: &[&str]) -> Result<(), ExecutionError> {
    let fields = v.as_object().ok_or_else(invalid)?;
    if required.iter().any(|key| !fields.contains_key(*key))
        || fields
            .keys()
            .any(|key| !required.contains(&key.as_str()) && !optional.contains(&key.as_str()))
    {
        return Err(invalid());
    }
    Ok(())
}
fn id<'a>(v: &'a SqlCell, key: &str) -> Result<&'a JsText, ExecutionError> {
    member(v, key)?
        .as_text()
        .filter(|id| is_safe_record_text(id))
        .ok_or_else(invalid)
}
fn number(v: &SqlCell, key: &str) -> Result<f64, ExecutionError> {
    member(v, key)?
        .as_f64()
        .filter(|n| n.is_finite())
        .ok_or_else(invalid)
}
fn validate(v: &SqlCell, observer: &str) -> Result<(), ExecutionError> {
    fields(
        v,
        &[
            "family",
            "id",
            "revision",
            "createdAt",
            "expiresAt",
            "kind",
            "proposerId",
            "recipientId",
            "status",
            "destination",
            "ownArrived",
        ],
        &["purpose", "opponentId", "cause"],
    )?;
    if member(v, "family")?.as_str() != Some("movement-outing") {
        return Err(invalid());
    }
    id(v, "id")?;
    member(v, "revision")?
        .as_u64()
        .filter(|n| *n > 0 && *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    let created = number(v, "createdAt")?;
    if created < 0. || number(v, "expiresAt")? < created {
        return Err(invalid());
    }
    let a = id(v, "proposerId")?;
    let b = id(v, "recipientId")?;
    if a == b || !(a.units().eq(observer.encode_utf16()) || b.units().eq(observer.encode_utf16())) {
        return Err(invalid());
    }
    let travel = match member(v, "kind")?.as_str() {
        Some("travel") => true,
        Some("combat-help") => false,
        _ => return Err(invalid()),
    };
    let ended = match member(v, "status")?.as_str() {
        Some("ended") => true,
        Some("pending" | "traveling" | "helping") => false,
        _ => return Err(invalid()),
    };
    if member(v, "ownArrived")?.as_bool().is_none() || ended != v.get("cause").is_some() {
        return Err(invalid());
    }
    for key in ["purpose", "cause"] {
        if v.get(key).is_some_and(|value| value.as_text().is_none()) {
            return Err(invalid());
        }
    }
    let destination = member(v, "destination")?;
    fields(
        destination,
        &["label"],
        if travel { &["point"] } else { &[] },
    )?;
    if member(destination, "label")?
        .as_text()
        .is_none_or(JsText::is_empty)
    {
        return Err(invalid());
    }
    if travel {
        let point = member(destination, "point")?;
        for coordinate in ["x", "y", "z"] {
            number(point, coordinate)?;
        }
        id(point, "surfaceId")?;
    } else {
        id(v, "opponentId")?;
    }
    // Source deliberately does not tie kind to one non-ended status, cap or
    // trim these strings, or validate an unused travel opponentId. Preserve it.
    Ok(())
}
impl MovementTerms {
    pub(crate) fn decode(
        observer: &str,
        agreement: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut allocation = crate::install::reserve_typed_parse::<SqlCell>(
            agreement,
            size_of::<SqlCell>(),
            Some(size_of::<(usize, JsText, SqlCell)>()),
            budget,
        )
        .map_err(|error| match error {
            crate::install::InstallError::Capacity => ExecutionError::Capacity,
            _ => invalid(),
        })?;
        let body: SqlCell = serde_json::from_str(agreement).map_err(|_| invalid())?;
        validate(&body, observer)?;
        let retained = body
            .heap_bytes()
            .and_then(|n| n.checked_add(size_of::<Self>()))
            .filter(|n| *n <= allocation.bytes())
            .ok_or(ExecutionError::Invariant)?;
        allocation.resize(retained)?;
        Ok(Self { body, allocation })
    }
    pub(crate) fn value(&self) -> &SqlCell {
        &self.body
    }
    pub(crate) fn family(&self) -> &str {
        "movement-outing"
    }
    pub(crate) fn id(&self) -> &JsText {
        self.body
            .get("id")
            .and_then(SqlCell::as_text)
            .expect("validated movement ID")
    }
    pub(crate) fn revision(&self) -> u64 {
        self.body
            .get("revision")
            .and_then(SqlCell::as_u64)
            .expect("validated movement revision")
    }
    pub(crate) fn kind(&self) -> MovementTermsKind {
        if self.body.get("kind").and_then(SqlCell::as_str) == Some("travel") {
            MovementTermsKind::Travel
        } else {
            MovementTermsKind::CombatHelp
        }
    }
    pub(crate) fn status(&self) -> MovementTermsStatus {
        match self.body.get("status").and_then(SqlCell::as_str) {
            Some("pending") => MovementTermsStatus::Pending,
            Some("traveling") => MovementTermsStatus::Traveling,
            Some("helping") => MovementTermsStatus::Helping,
            _ => MovementTermsStatus::Ended,
        }
    }
}
impl Serialize for MovementTerms {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.body.serialize(serializer)
    }
}
