//! Typed private intent syntax. No retained description is an executable action.
use super::*;
use crate::records::SqlCell;
use crate::text::JsText;
use crate::values::is_safe_record_id;
use serde_json::value::RawValue;

/// The seven closed slot fields retain their supplied object order for exact
/// save/request formatting. Matching uses Source's fixed slot-value array.
#[derive(Clone, Debug)]
pub struct IntentSlots {
    value: SqlCell,
    key: String,
}
const SLOT_KEYS: [&str; 7] = [
    "itemId",
    "instrumentId",
    "recipientId",
    "quantity",
    "quantityMode",
    "until",
    "method",
];
impl PartialEq for IntentSlots {
    fn eq(&self, other: &Self) -> bool {
        self.key == other.key
    }
}
impl Serialize for IntentSlots {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value.serialize(serializer)
    }
}
impl<'de> Deserialize<'de> for IntentSlots {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Self::from_cell(SqlCell::deserialize(deserializer)?).map_err(serde::de::Error::custom)
    }
}
impl IntentSlots {
    pub(crate) fn from_cell(value: SqlCell) -> Result<Self, &'static str> {
        let get = |key| value.get(key);
        let nullable_id = |key| {
            get(key).is_some_and(|v| v.is_null() || v.as_str().is_some_and(is_safe_record_id))
        };
        if value.object_len() != Some(7)
            || SLOT_KEYS.iter().any(|key| get(key).is_none())
            || !["itemId", "instrumentId", "recipientId"]
                .into_iter()
                .all(nullable_id)
            || !if get("quantity").is_some_and(SqlCell::is_null) {
                get("quantityMode").is_some_and(SqlCell::is_null)
            } else {
                get("quantity").and_then(SqlCell::as_f64).is_some_and(|n| {
                    n.is_finite() && n.fract() == 0.0 && (1.0..=999.0).contains(&n)
                }) && get("quantityMode")
                    .and_then(SqlCell::as_str)
                    .is_some_and(|mode| matches!(mode, "exact" | "held"))
            }
            || !get("until").is_some_and(|v| {
                v.is_null()
                    || v.as_text()
                        .is_some_and(|text| !text.is_empty() && text.units_len() <= 24)
            })
            || !get("method").is_some_and(|v| {
                v.is_null()
                    || v.as_text()
                        .is_some_and(|text| !text.trim_is_empty() && text.units_len() <= 200)
            })
        {
            return Err("Invalid private intention slots.");
        }
        let values = SLOT_KEYS.map(|key| value.get(key).expect("Validated closed slot"));
        let key = if values.iter().all(|v| v.is_null()) {
            String::new()
        } else {
            crate::encoding::json_record(&values)
                .map_err(|_| "Private intention slot encoding failed.")?
        };
        Ok(Self { value, key })
    }
    pub(crate) fn nonempty(&self) -> bool {
        !self.key.is_empty()
    }
    pub(crate) fn named_times_valid(&self, world: &crate::simulation::InstalledWorld) -> bool {
        self.value.get("until").is_some_and(|value| {
            value.is_null()
                || value
                    .as_text()
                    .and_then(JsText::as_unicode)
                    .is_some_and(|name| world.status_policy.named_times.contains_key(name))
        })
    }
    pub(crate) fn value(&self) -> &SqlCell {
        &self.value
    }
}
impl HeapBytes for IntentSlots {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.value.heap_bytes()?, self.key.heap_bytes()?])
    }
}

/// Source compares JSON.stringify(resolution), including member order, when
/// refreshing a reason. Keep one validated immutable cell and its derived
/// spelling; a fixed Rust field order would change that ordinary revision duty.
#[derive(Clone, Debug)]
pub struct ActionResolution {
    value: SqlCell,
    encoded: String,
}
impl PartialEq for ActionResolution {
    fn eq(&self, other: &Self) -> bool {
        self.encoded == other.encoded
    }
}
impl Serialize for ActionResolution {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.value.serialize(serializer)
    }
}
impl<'de> Deserialize<'de> for ActionResolution {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = SqlCell::deserialize(deserializer)?;
        Self::from_cell(value).map_err(serde::de::Error::custom)
    }
}
impl ActionResolution {
    pub(crate) fn from_cell(value: SqlCell) -> Result<Self, &'static str> {
        let get = |key| value.get(key);
        if value.object_len() != Some(4)
            || !get("category")
                .and_then(SqlCell::as_str)
                .is_some_and(|category| {
                    matches!(
                        category,
                        "needs_clarification"
                            | "needs_planning"
                            | "needs_information"
                            | "blocked"
                            | "unsupported_capability"
                            | "forbidden"
                            | "unavailable"
                    )
                })
            || !get("reason")
                .and_then(SqlCell::as_text)
                .is_some_and(|text| !text.trim_is_empty() && text.units_len() <= 500)
            || !get("depends")
                .and_then(SqlCell::as_array)
                .is_some_and(|ids| {
                    ids.len() <= 8
                        && ids.iter().all(|id| {
                            id.as_str()
                                .is_some_and(|id| id == "@visible" || is_safe_record_id(id))
                        })
                })
            || !get("signature")
                .and_then(SqlCell::as_text)
                .is_some_and(|text| !text.is_empty() && text.units_len() <= 16)
        {
            return Err("Invalid private action resolution.");
        }
        let encoded = crate::encoding::json_record(&value)
            .map_err(|_| "Private action resolution encoding failed.")?;
        Ok(Self { value, encoded })
    }
    pub(crate) fn value(&self) -> &SqlCell {
        &self.value
    }
}
impl HeapBytes for ActionResolution {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.value.heap_bytes()?, self.encoded.heap_bytes()?])
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PendingIntent {
    pub id: String,
    pub description: JsText,
    pub normalized: JsText,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub target_entity_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub slots: Option<IntentSlots>,
    pub mode: PlanMode,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub manifest_revision: u64,
    pub status: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub resolution: Option<ActionResolution>,
    // A held executable alternative is not produced by supplied response
    // proposals. Its presence is refused by selected-family admission below.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub alternative: Option<Box<RawValue>>,
}
impl PartialEq for PendingIntent {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
            && self.description == other.description
            && self.normalized == other.normalized
            && self.target_entity_id == other.target_entity_id
            && self.slots == other.slots
            && self.mode == other.mode
            && self.manifest_revision == other.manifest_revision
            && self.status == other.status
            && self.resolution == other.resolution
            && self.alternative.as_ref().map(|v| v.get())
                == other.alternative.as_ref().map(|v| v.get())
    }
}
impl HeapBytes for PendingIntent {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.id.heap_bytes()?,
            self.description.heap_bytes()?,
            self.normalized.heap_bytes()?,
            self.target_entity_id.heap_bytes()?,
            self.slots.heap_bytes()?,
            self.status.heap_bytes()?,
            self.resolution.heap_bytes()?,
            self.alternative
                .as_ref()
                .map_or(0, |value| value.get().len()),
        ])
    }
}
pub(in super::super) fn validate_installed(
    attempts: &[PendingIntent],
    limits: &AgencyLimits,
) -> Result<(), crate::install::InstallError> {
    use crate::install::InstallError;
    if attempts.len() as u64 > limits.attempts {
        return Err(InstallError::CurrentFormat);
    }
    for (index, intent) in attempts.iter().enumerate() {
        if intent.status == "awaiting-confirmation" || intent.alternative.is_some() {
            return Err(InstallError::UnsupportedFamily(
                "held private action revision",
            ));
        }
        if !is_safe_record_id(&intent.id)
            || attempts[..index].iter().any(|prior| prior.id == intent.id)
            || intent.description.trim_is_empty()
            || intent.description.units_len() as u64 > limits.attempt_characters
            || intent
                .target_entity_id
                .as_ref()
                .is_some_and(|id| !is_safe_record_id(id))
            || intent.slots.as_ref().is_some_and(|slots| !slots.nonempty())
            || intent.manifest_revision == 0
            || intent.status != "needs-interpretation"
        {
            return Err(InstallError::CurrentFormat);
        }
        // NFKC/lowercase equality was checked once against the exact pure
        // preparation when the canonical intention row entered this owner.
    }
    Ok(())
}
