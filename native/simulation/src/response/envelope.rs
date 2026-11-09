//! Admission checks only the supplied response grammar. World permissions,
//! current references and each operation's ordinary refusal remain with their
//! semantic owners. Keep the exact JSON cell for the one canonical digest;
//! optional-null fields and property order are not rebuilt from typed defaults.
use super::*;
use crate::records::SqlCell;
use crate::text::JsText;

const FIELDS: [&str; 10] = [
    "talk", "act", "think", "goal", "plan", "note", "name", "appraise", "observe", "remember",
];

pub(crate) struct ActorResponse {
    value: SqlCell,
    _reservation: ByteReservation,
}
#[derive(Debug)]
pub(crate) enum ResponseEnvelopeError {
    Malformed,
    Capacity,
}
impl From<crate::host::CapacityError> for ResponseEnvelopeError {
    fn from(_: crate::host::CapacityError) -> Self {
        Self::Capacity
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ResponseKind {
    Talk,
    Act,
    Think,
    Goal,
    Plan,
    Note,
    Name,
    Appraise,
    Observe,
    Remember,
}
pub(crate) struct ResponseOperation<'a> {
    pub local_id: &'a str,
    pub requires_accepted: &'a [SqlCell],
    pub kind: ResponseKind,
    pub data: &'a SqlCell,
}

fn text(value: &SqlCell) -> bool {
    value.as_text().is_some()
}
fn nullable_text(value: &SqlCell) -> bool {
    value.is_null() || text(value)
}
fn strings(value: &SqlCell) -> Option<&[SqlCell]> {
    value.as_array().filter(|values| values.iter().all(text))
}
fn exact(value: &SqlCell, keys: &[&str], optional: &[&str]) -> bool {
    value.as_object().is_some_and(|object| {
        keys.iter().all(|key| object.contains_key(*key))
            && object
                .keys()
                .all(|key| keys.contains(&key.as_str()) || optional.contains(&key.as_str()))
    })
}
fn field<'a>(value: &'a SqlCell, key: &str) -> Option<&'a SqlCell> {
    value.get(key)
}
fn all_fields(value: &SqlCell, keys: &[&str], valid: fn(&SqlCell) -> bool) -> bool {
    keys.iter().all(|key| field(value, key).is_some_and(valid))
}
fn safe_integer(value: &SqlCell) -> bool {
    value.as_f64().is_some_and(|n| {
        n.is_finite() && n.fract() == 0.0 && n.abs() <= crate::identity::MAX_SAFE_INTEGER as f64
    })
}
fn count(value: &SqlCell) -> bool {
    safe_integer(value) && value.as_f64().is_some_and(|n| n >= 0.0)
}
fn one_of(value: &SqlCell, choices: &[&str]) -> bool {
    value.as_str().is_some_and(|s| choices.contains(&s))
}
fn nullable(value: Option<&SqlCell>, valid: impl FnOnce(&SqlCell) -> bool) -> bool {
    value.is_none_or(|value| value.is_null() || valid(value))
}
fn safe_id(value: &SqlCell) -> bool {
    value.as_str().is_some_and(is_safe_record_id)
}
fn local_id(id: &str) -> bool {
    let mut bytes = id.bytes();
    id.len() <= 24
        && bytes.next().is_some_and(|b| b.is_ascii_lowercase())
        && bytes.all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
        && is_safe_record_id(id)
}
fn slots(value: &SqlCell) -> bool {
    if !exact(
        value,
        &[
            "itemId",
            "instrumentId",
            "recipientId",
            "quantity",
            "quantityMode",
            "until",
            "method",
        ],
        &[],
    ) {
        return false;
    }
    let get = |key| field(value, key).expect("Exact intent slot field");
    ["itemId", "instrumentId", "recipientId"]
        .iter()
        .all(|key| nullable(Some(get(key)), safe_id))
        && if get("quantity").is_null() {
            get("quantityMode").is_null()
        } else {
            get("quantity")
                .as_u64()
                .is_some_and(|n| (1..=999).contains(&n))
                && one_of(get("quantityMode"), &["exact", "held"])
        }
        && nullable(Some(get("until")), |value| {
            value
                .as_text()
                .is_some_and(|s| !s.is_empty() && s.units_len() <= 24)
        })
        && nullable(Some(get("method")), |value| {
            value
                .as_text()
                .is_some_and(|s| !s.trim_is_empty() && s.units_len() <= 200)
        })
}
fn valid_operation(value: &SqlCell) -> bool {
    let Some(object) = value.as_object() else {
        return false;
    };
    if object.len() < 7
        || object.keys().any(|key| {
            key != "localId" && key != "requiresAccepted" && !FIELDS.contains(&key.as_str())
        })
        || FIELDS[..5].iter().any(|key| !object.contains_key(*key))
        || FIELDS.iter().any(|key| {
            object
                .get(*key)
                    .is_some_and(|v| !v.is_null() && !v.is_object())
        })
        || FIELDS
            .iter()
            .filter(|key| object.get(**key).is_some_and(|v| !v.is_null()))
            .count()
            != 1
    {
        return false;
    }
    let Some(operation) = operation(value) else {
        return false;
    };
    let data = operation.data;
    let get = |key| field(data, key);
    match operation.kind {
        ResponseKind::Talk => {
            exact(
                data,
                &["text", "addresseeEntityId", "volume"],
                &["selfIntroduction", "addresseeRole"],
            ) && get("text").is_some_and(text)
                && get("addresseeEntityId").is_some_and(nullable_text)
                && get("volume").is_some_and(|v| one_of(v, &["whisper", "normal", "shout"]))
                && nullable(get("selfIntroduction"), text)
                && get("addresseeRole").is_none_or(|v| {
                    !get("addresseeEntityId")
                        .expect("Exact talk field")
                        .is_null()
                        && one_of(v, &["body", "remembered"])
                })
        }
        ResponseKind::Think => {
            exact(data, &["text", "aboutEntityIds"], &[])
                && get("text").is_some_and(text)
                && get("aboutEntityIds").and_then(strings).is_some()
        }
        ResponseKind::Act => {
            exact(
                data,
                &[
                    "kind",
                    "actionId",
                    "verb",
                    "targetEntityId",
                    "description",
                    "mode",
                ],
                &["invocation", "slots"],
            ) && get("kind")
                .is_some_and(|v| one_of(v, &["known", "expression", "proposal", "invoke"]))
                && get("mode").is_some_and(|v| one_of(v, &["enqueue", "replace", "interrupt"]))
                && all_fields(
                    data,
                    &["actionId", "verb", "targetEntityId", "description"],
                    nullable_text,
                )
                && nullable(get("slots"), slots)
        }
        ResponseKind::Goal => {
            exact(
                data,
                &[
                    "operation",
                    "goalId",
                    "expectedRevision",
                    "objective",
                    "parentId",
                ],
                &[],
            ) && get("operation").is_some_and(|v| {
                one_of(
                    v,
                    &["create", "revise", "pause", "resume", "complete", "abandon"],
                )
            }) && all_fields(data, &["goalId", "objective", "parentId"], nullable_text)
                && get("expectedRevision").is_some_and(|v| v.is_null() || count(v))
        }
        ResponseKind::Plan => {
            exact(data, &["mode", "expectedRevision", "goalId", "steps"], &[])
                && get("mode")
                    .is_some_and(|v| one_of(v, &["enqueue", "replace", "interrupt", "cancel"]))
                && get("expectedRevision").is_some_and(count)
                && get("goalId").is_some_and(nullable_text)
                && get("steps")
                    .and_then(SqlCell::as_array)
                    .is_some_and(|steps| {
                        steps.len() <= 8
                            && steps.iter().enumerate().all(|(index, step)| {
                                exact(step, &["actionId", "itemFromStep", "useItemAs"], &[])
                                    && if let Some(action) =
                                        step.get("actionId").filter(|v| !v.is_null())
                                    {
                                        text(action)
                                            && step
                                                .get("itemFromStep")
                                                .is_some_and(SqlCell::is_null)
                                            && step.get("useItemAs").is_some_and(SqlCell::is_null)
                                    } else {
                                        step.get("itemFromStep")
                                            .and_then(SqlCell::as_u64)
                                            .is_some_and(|from| from < index as u64)
                                            && step
                                                .get("useItemAs")
                                                .is_some_and(|v| one_of(v, &["equip", "eat"]))
                                    }
                            })
                    })
        }
        ResponseKind::Note => {
            exact(data, &["subjectId", "expectedRevision", "text"], &[])
                && get("subjectId").is_some_and(nullable_text)
                && get("text").is_some_and(text)
                && get("expectedRevision").is_some_and(safe_integer)
        }
        ResponseKind::Name => {
            exact(data, &["subjectId", "expectedRevision", "givenName"], &[])
                && all_fields(data, &["subjectId", "givenName"], text)
                && get("expectedRevision").is_some_and(safe_integer)
        }
        // The source envelope deliberately leaves AppraisalChange semantics to
        // changeAppraisal, so a bad change is one refused component, not a lost
        // independent talk/goal operation elsewhere in the response.
        ResponseKind::Appraise => true,
        ResponseKind::Observe => {
            exact(data, &["subjects"], &[])
                && get("subjects").and_then(strings).is_some_and(|values| {
                    values.len() <= 32
                        && values
                            .iter()
                            .enumerate()
                            .all(|(at, value)| !values[..at].contains(value))
                })
        }
        ResponseKind::Remember => {
            exact(data, &["sources", "text"], &[])
                && get("sources")
                    .and_then(strings)
                    .is_some_and(|values| !values.is_empty() && values.len() <= 8)
                && get("text")
                    .and_then(SqlCell::as_text)
                    .is_some_and(|value| !value.trim_is_empty() && value.units_len() <= 1200)
        }
    }
}
fn operation(value: &SqlCell) -> Option<ResponseOperation<'_>> {
    let local_id = value.get("localId")?.as_str()?;
    let requires_accepted = value.get("requiresAccepted")?.as_array()?;
    let (index, data) = FIELDS
        .iter()
        .enumerate()
        .find_map(|(i, key)| value.get(key).filter(|v| !v.is_null()).map(|v| (i, v)))?;
    let kind = [
        ResponseKind::Talk,
        ResponseKind::Act,
        ResponseKind::Think,
        ResponseKind::Goal,
        ResponseKind::Plan,
        ResponseKind::Note,
        ResponseKind::Name,
        ResponseKind::Appraise,
        ResponseKind::Observe,
        ResponseKind::Remember,
    ][index];
    Some(ResponseOperation {
        local_id,
        requires_accepted,
        kind,
        data,
    })
}
impl ActorResponse {
    pub(crate) fn decode(
        source: &str,
        limits: &ResponseLimits,
        budget: &ByteBudget,
    ) -> Result<Self, ResponseEnvelopeError> {
        let mut reservation = budget.reserve(
            crate::experience::encoded_body_bound(source)
                .map_err(|_| ResponseEnvelopeError::Capacity)?,
        )?;
        let value: SqlCell =
            serde_json::from_str(source).map_err(|_| ResponseEnvelopeError::Malformed)?;
        let Some(operations) = value.get("operations").and_then(SqlCell::as_array) else {
            return Err(ResponseEnvelopeError::Malformed);
        };
        let valid = exact(&value, &["operations"], &[])
            && operations.len() as u64 <= limits.operations
            && crate::encoding::json_record_len(&value)
                .map_err(|_| ResponseEnvelopeError::Malformed)? as u64
                <= limits.bytes
            && operations.iter().enumerate().all(|(at, raw)| {
                if !valid_operation(raw) {
                    return false;
                }
                let Some(op) = operation(raw) else {
                    return false;
                };
                local_id(op.local_id)
                    && !operations[..at].iter().any(|prior| {
                        prior.get("localId").and_then(SqlCell::as_str) == Some(op.local_id)
                    })
                    && op.requires_accepted.len() <= 16
                    && op.requires_accepted.iter().enumerate().all(|(index, id)| {
                        !op.requires_accepted[..index].contains(id)
                            && id.as_str().is_some_and(|id| {
                                operations[..at].iter().any(|prior| {
                                    prior.get("localId").and_then(SqlCell::as_str) == Some(id)
                                })
                            })
                    })
            });
        if !valid {
            return Err(ResponseEnvelopeError::Malformed);
        }
        reservation.resize(
            value
                .heap_bytes()
                .and_then(|n| n.checked_add(size_of::<Self>()))
                .ok_or(ResponseEnvelopeError::Capacity)?,
        )?;
        Ok(Self {
            value,
            _reservation: reservation,
        })
    }
    pub(crate) fn value(&self) -> &SqlCell {
        &self.value
    }
    pub(crate) fn len(&self) -> usize {
        self.value
            .get("operations")
            .and_then(SqlCell::as_array)
            .expect("Admitted response operations")
            .len()
    }
    pub(crate) fn operation(&self, index: usize) -> Option<ResponseOperation<'_>> {
        operation(self.value.get("operations")?.as_array()?.get(index)?)
    }
}
impl ResponseOperation<'_> {
    pub(crate) fn text(&self, key: &str) -> Option<&JsText> {
        self.data.get(key)?.as_text()
    }
}
