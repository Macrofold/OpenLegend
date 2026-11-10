//! Earned continuous arithmetic, matching domain/native-values.ts.
//!
//! A read projects the original numeric anchor without settling it, charging
//! work, advancing a revision or emitting evidence. The execution owner settles
//! affected episodes before actual mutation, and publishes the invalidations
//! returned when it retains another segment. See docs/simulation-time.md#native-interval-contract.

use indexmap::IndexMap;
use std::borrow::Cow;
use std::collections::BTreeSet;
use std::fmt;

use serde::de::{self, Visitor};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;

use crate::host::retained_size::heap_record;
use crate::identity::MAX_SAFE_INTEGER;

heap_record!(AttributeState { value });
heap_record!(NativeValueAttribute { rates });
heap_record!(NativeValueBinding {
    entity_id,
    status_id,
    episode,
    attributes
});
heap_record!(RetainedBinding {
    entity_id,
    status_id,
    episode,
    attributes
});
heap_record!(NativeValueWindow {
    bindings,
    by_entity
});

// JavaScript's number representation admits `1.0` as the integer 1. Preserve
// that current-format meaning while refusing fractions, negatives and overflow.
pub(crate) fn deserialize_safe_integer<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<u64, D::Error> {
    struct SafeInteger;
    impl Visitor<'_> for SafeInteger {
        type Value = u64;
        fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter.write_str("a nonnegative JavaScript safe integer")
        }
        fn visit_u64<E: de::Error>(self, value: u64) -> Result<u64, E> {
            if value <= MAX_SAFE_INTEGER {
                Ok(value)
            } else {
                Err(E::custom("Integer is exhausted."))
            }
        }
        fn visit_i64<E: de::Error>(self, value: i64) -> Result<u64, E> {
            if value >= 0 {
                self.visit_u64(value as u64)
            } else {
                Err(E::custom("Integer is negative."))
            }
        }
        fn visit_f64<E: de::Error>(self, value: f64) -> Result<u64, E> {
            if value.is_finite()
                && value >= 0.0
                && value <= MAX_SAFE_INTEGER as f64
                && value.fract() == 0.0
            {
                Ok(value as u64)
            } else {
                Err(E::custom("Invalid safe integer."))
            }
        }
    }
    deserializer.deserialize_any(SafeInteger)
}

// Missing optional fields stay absent. An explicit JSON null must not silently
// erase a present boolean/string/record that current-format validation needs.
pub(crate) fn deserialize_present_option<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    T::deserialize(deserializer).map(Some)
}

/// A required nullable field retains JSON null; unlike optional fields, the
/// containing record must actually supply it.
pub(crate) fn deserialize_nullable<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer)
}

/// Optional count with the same mathematical-integer admission as a required
/// count; a JSON `1.0` remains usable and null never erases a supplied counter.
pub(crate) fn deserialize_present_safe_integer<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<u64>, D::Error> {
    deserialize_safe_integer(deserializer).map(Some)
}

/// Preserve the same count domain inside source Record dictionaries. Key
/// validity remains with the owning record family; not every derived key is an ID.
pub(crate) fn deserialize_safe_integer_map<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<IndexMap<String, u64>, D::Error> {
    struct Count(u64);
    impl<'de> Deserialize<'de> for Count {
        fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
            deserialize_safe_integer(deserializer).map(Self)
        }
    }
    let values = IndexMap::<String, Count>::deserialize(deserializer)?;
    Ok(values
        .into_iter()
        .map(|(key, count)| (key, count.0))
        .collect())
}

pub(crate) fn deserialize_present_safe_integer_map<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<IndexMap<String, u64>>, D::Error> {
    deserialize_safe_integer_map(deserializer).map(Some)
}

/// Required nullable safe count. Missing is still rejected by the containing
/// field; an explicit null is the source's actual absent physical-life value.
pub(crate) fn deserialize_nullable_safe_integer<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<u64>, D::Error> {
    struct NullableCount;
    impl<'de> Visitor<'de> for NullableCount {
        type Value = Option<u64>;
        fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
            formatter.write_str("null or a nonnegative JavaScript safe integer")
        }
        fn visit_none<E: de::Error>(self) -> Result<Self::Value, E> {
            Ok(None)
        }
        fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> {
            Ok(None)
        }
        fn visit_some<D: Deserializer<'de>>(
            self,
            deserializer: D,
        ) -> Result<Self::Value, D::Error> {
            deserialize_safe_integer(deserializer).map(Some)
        }
    }
    deserializer.deserialize_option(NullableCount)
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AttributeValue {
    Number(f64),
    Category(String),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttributeState {
    pub value: AttributeValue,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub concern_active: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DefinitionPin {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub digest: String,
}

impl DefinitionPin {
    pub fn is_valid(&self) -> bool {
        is_safe_record_id(&self.id)
            && self.version > 0
            && self.version <= MAX_SAFE_INTEGER
            && !self.digest.is_empty()
            && self.digest.encode_utf16().count() <= 128
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusInstance {
    // The retained-arithmetic owner refuses contributions. Other family owners
    // must validate their actual contribution shape before installation.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub contribution: Option<Value>,
    pub active: bool,
    pub episode: String,
    pub elapsed_seconds: f64,
    pub automatic_after: f64,
    pub source_id: String,
    pub action_target_id: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeValueAttribute {
    // Unlike the key-addressed maps, this order is semantic. Never parallelize
    // or replace this reduction with an unordered sum.
    pub rates: Vec<f64>,
    pub min: f64,
    pub max: f64,
    pub changed: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct NativeValueDemand {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub tests: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub effects: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeValueBinding {
    pub entity_id: String,
    pub status_id: String,
    pub episode: String,
    pub attributes: IndexMap<String, NativeValueAttribute>,
    pub demand: NativeValueDemand,
    pub from: f64,
}

/// Prepared by the status owner for one actual starting-state interval. It is
/// not a client command or a substitute for that owner's retention eligibility.
#[derive(Clone, Debug, PartialEq)]
pub struct RetainedBinding {
    pub entity_id: String,
    pub status_id: String,
    pub episode: String,
    pub attributes: IndexMap<String, NativeValueAttribute>,
    pub demand: NativeValueDemand,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeValueWindow {
    pub elapsed_seconds: f64,
    pub sim_time: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub binding_count: u64,
    pub bindings: IndexMap<String, NativeValueBinding>,
    pub by_entity: IndexMap<String, IndexMap<String, String>>,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkVector {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidates: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub tests: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub input_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub output_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub effects: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub claims: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub subscriptions: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub live: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub queued: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub retained_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub depth: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecurringWork {
    pub interval_seconds: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub burst: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkInvocation {
    pub id: String,
    pub root_id: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub parent_id: Option<String>,
    pub actor_id: String,
    pub module_id: String,
    pub definition_pin: DefinitionPin,
    pub limit: WorkVector,
    pub allocation: WorkVector,
    pub used: WorkVector,
    pub started_at: f64,
    pub interval_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub executions: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub children: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recurrence: Option<RecurringWork>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ValueError {
    InvalidContinuation,
    InvalidMeaning,
    MissingEntity,
    MissingAttribute,
    MissingStatus,
    MissingInvocation,
    ExhaustedRevision,
    WorkContract(&'static str),
}

impl fmt::Display for ValueError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidContinuation => {
                f.write_str("Invalid saved native arithmetic continuation.")
            }
            Self::InvalidMeaning => f.write_str("Invalid saved native arithmetic meaning."),
            Self::MissingEntity => f.write_str("Pending native value lost its entity."),
            Self::MissingAttribute => f.write_str("Pending native value lost its numeric anchor."),
            Self::MissingStatus => f.write_str("Pending native value lost its status episode."),
            Self::MissingInvocation => {
                f.write_str("Pending native value has no admitted invocation.")
            }
            Self::ExhaustedRevision => f.write_str("Attribute or work revision exhausted."),
            Self::WorkContract(unit) => {
                write!(f, "Native work exceeded its admitted {unit} envelope.")
            }
        }
    }
}

impl std::error::Error for ValueError {}

fn safe_add(a: u64, b: u64) -> Result<u64, ValueError> {
    a.checked_add(b)
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or(ValueError::ExhaustedRevision)
}

/// The current JSON key contract, including Object.prototype names that are
/// refused at the TypeScript boundary. Native dictionaries never have a prototype.
pub const MAX_RECORD_ID_UNITS: usize = 180;
pub fn is_safe_record_id(value: &str) -> bool {
    !crate::encoding::js_trim(value).is_empty()
        && value.encode_utf16().count() <= MAX_RECORD_ID_UNITS
        && !matches!(
            value,
            "prototype"
                | "constructor"
                | "__defineGetter__"
                | "__defineSetter__"
                | "hasOwnProperty"
                | "__lookupGetter__"
                | "__lookupSetter__"
                | "isPrototypeOf"
                | "propertyIsEnumerable"
                | "toString"
                | "valueOf"
                | "__proto__"
                | "toLocaleString"
        )
}

/// JavaScript record keys can contain isolated UTF16 units. Their identity is
/// preserved even when no existing Unicode-backed native record can match it.
pub(crate) fn is_safe_record_text(value: &crate::text::JsText) -> bool {
    value.as_unicode().map_or_else(
        || !value.trim_is_empty() && value.units_len() <= MAX_RECORD_ID_UNITS,
        is_safe_record_id,
    )
}

pub(crate) fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else if a == 0.0 && b == 0.0 {
        if a.is_sign_negative() || b.is_sign_negative() {
            -0.0
        } else {
            0.0
        }
    } else if a < b {
        a
    } else {
        b
    }
}

pub(crate) fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else if a == 0.0 && b == 0.0 {
        if a.is_sign_positive() || b.is_sign_positive() {
            0.0
        } else {
            -0.0
        }
    } else if a > b {
        a
    } else {
        b
    }
}

fn projected_number(anchor: f64, operation: &NativeValueAttribute, elapsed: f64, from: f64) -> f64 {
    let rate = operation.rates.iter().fold(0.0, |sum, rate| sum + rate);
    js_max(
        operation.min,
        js_min(operation.max, anchor + rate * (elapsed - from)),
    )
}

/// Preserve the anchor's revision and concern latch. These are current values,
/// not newly earned observations or additional semantic mutations.
pub fn projected_attribute<'a>(
    anchor: &'a AttributeState,
    operation: &NativeValueAttribute,
    elapsed: f64,
    from: f64,
) -> Result<Cow<'a, AttributeState>, ValueError> {
    let AttributeValue::Number(number) = anchor.value else {
        return Ok(Cow::Borrowed(anchor));
    };
    if anchor.revision > MAX_SAFE_INTEGER {
        return Err(ValueError::ExhaustedRevision);
    }
    Ok(Cow::Owned(AttributeState {
        value: AttributeValue::Number(projected_number(number, operation, elapsed, from)),
        revision: anchor.revision,
        concern_active: anchor.concern_active,
    }))
}

impl NativeValueWindow {
    pub fn binding_for(&self, entity_id: &str, attribute_id: &str) -> Option<&NativeValueBinding> {
        let episode = self.by_entity.get(entity_id)?.get(attribute_id)?;
        self.bindings.get(episode)
    }

    pub fn current_attribute<'a>(
        &self,
        entity_id: &str,
        attribute_id: &str,
        anchor: &'a AttributeState,
    ) -> Result<Cow<'a, AttributeState>, ValueError> {
        let Some(binding) = self.binding_for(entity_id, attribute_id) else {
            return Ok(Cow::Borrowed(anchor));
        };
        let operation = binding
            .attributes
            .get(attribute_id)
            .ok_or(ValueError::InvalidContinuation)?;
        projected_attribute(anchor, operation, self.elapsed_seconds, binding.from)
    }

    pub fn current_status_elapsed(&self, anchor: &StatusInstance) -> f64 {
        match self.bindings.get(&anchor.episode) {
            Some(binding) => anchor.elapsed_seconds + self.elapsed_seconds - binding.from,
            None => anchor.elapsed_seconds,
        }
    }

    /// The execution owner settles these episodes, in established input order,
    /// before charging/retaining a changed cohort. No simulation state is cloned.
    pub fn replaced_episodes(&self, incoming: &[RetainedBinding]) -> Vec<String> {
        let selected: IndexMap<_, _> = incoming.iter().map(|b| (b.episode.as_str(), b)).collect();
        self.bindings
            .values()
            .filter(|prior| {
                let Some(next) = selected.get(prior.episode.as_str()) else {
                    return true;
                };
                prior.attributes != next.attributes
                    || prior.status_id != next.status_id
                    || prior.entity_id != next.entity_id
                    || prior.demand != next.demand
            })
            .map(|binding| binding.episode.clone())
            .collect()
    }

    pub fn entity_episodes(&self, entity_id: &str) -> Vec<String> {
        self.by_entity
            .get(entity_id)
            .map(|attributes| attributes.values().cloned().collect())
            .unwrap_or_default()
    }
}

/// Direct borrows into one native entity's canonical maps. This is not another
/// actor record or a generic writable-world interface.
pub struct ValueEntityMut<'a> {
    pub id: &'a str,
    pub attributes: &'a mut IndexMap<String, AttributeState>,
    pub statuses: &'a mut IndexMap<String, StatusInstance>,
}

/// Materialize only this actual episode. It emits no history and charges no
/// work: both belong to the original integration. Caller owns rollback/publication.
pub fn materialize_episode(
    window: &mut Option<NativeValueWindow>,
    episode: &str,
    entity: ValueEntityMut<'_>,
) -> Result<(), ValueError> {
    let Some(owned) = window else { return Ok(()) };
    let Some(binding) = owned.bindings.get(episode) else {
        return Ok(());
    };
    if entity.id != binding.entity_id {
        return Err(ValueError::MissingEntity);
    }
    // Preflight the exact changed subrecords before touching anchors. This
    // bounded list contains no whole entity, status body or accumulated history.
    let mut projected = Vec::with_capacity(binding.attributes.len());
    for (id, operation) in &binding.attributes {
        let anchor = entity
            .attributes
            .get(id)
            .ok_or(ValueError::MissingAttribute)?;
        let value = projected_attribute(anchor, operation, owned.elapsed_seconds, binding.from)?;
        projected.push((id, value.into_owned()));
    }
    let status = entity
        .statuses
        .get(&binding.status_id)
        .ok_or(ValueError::MissingStatus)?;
    if status.episode != episode {
        return Err(ValueError::MissingStatus);
    }
    let elapsed = owned.current_status_elapsed(status);
    let subject = owned
        .by_entity
        .get(&binding.entity_id)
        .ok_or(ValueError::InvalidContinuation)?;
    if owned.binding_count == 0
        || binding
            .attributes
            .keys()
            .any(|id| subject.get(id).map(String::as_str) != Some(episode))
    {
        return Err(ValueError::InvalidContinuation);
    }
    for (id, value) in projected {
        let anchor = entity
            .attributes
            .get_mut(id)
            .ok_or(ValueError::MissingAttribute)?;
        anchor.value = value.value;
        anchor.revision = value.revision;
    }
    entity
        .statuses
        .get_mut(&binding.status_id)
        .ok_or(ValueError::MissingStatus)?
        .elapsed_seconds = elapsed;
    let entity_id = binding.entity_id.clone();
    let attribute_ids: Vec<_> = binding.attributes.keys().cloned().collect();
    owned.bindings.shift_remove(episode);
    owned.binding_count -= 1;
    let subject = owned
        .by_entity
        .get_mut(&entity_id)
        .ok_or(ValueError::InvalidContinuation)?;
    for id in attribute_ids {
        subject.shift_remove(&id);
    }
    if subject.is_empty() {
        owned.by_entity.shift_remove(&entity_id);
    }
    if owned.binding_count == 0 {
        *window = None;
    }
    Ok(())
}

/// Recurring accounting mirrors work-budget.ts. Retaining arithmetic is not
/// permission to bank intervals or bypass admitted work limits.
pub fn advance_invocation_interval(
    invocation: &mut WorkInvocation,
    sim_time: f64,
) -> Result<(), ValueError> {
    let recurrence = invocation.recurrence.ok_or(ValueError::MissingInvocation)?;
    if invocation.root_id != invocation.id {
        return Err(ValueError::MissingInvocation);
    }
    if sim_time <= invocation.interval_at
        || sim_time < invocation.interval_at + recurrence.interval_seconds
    {
        return Ok(());
    }
    if invocation.children > 0 {
        return Err(ValueError::MissingInvocation);
    }
    let revision = safe_add(invocation.revision, 1)?;
    invocation.interval_at = sim_time;
    invocation.used = WorkVector::default();
    invocation.executions = 0;
    invocation.revision = revision;
    Ok(())
}

pub fn charge_retained_invocation(
    invocation: &mut WorkInvocation,
    demand: NativeValueDemand,
) -> Result<(), ValueError> {
    if invocation
        .recurrence
        .is_some_and(|recurrence| invocation.executions >= recurrence.burst)
    {
        return Err(ValueError::WorkContract("effects"));
    }
    let tests = safe_add(invocation.used.tests, demand.tests)?;
    let effects = safe_add(invocation.used.effects, demand.effects)?;
    if tests > invocation.limit.tests {
        return Err(ValueError::WorkContract("tests"));
    }
    if effects > invocation.limit.effects {
        return Err(ValueError::WorkContract("effects"));
    }
    let executions = safe_add(invocation.executions, 1)?;
    let revision = safe_add(invocation.revision, 1)?;
    invocation.used.tests = tests;
    invocation.used.effects = effects;
    invocation.executions = executions;
    invocation.revision = revision;
    Ok(())
}

/// Append earned time only after the execution owner settled replaced episodes
/// and charged each incoming binding through its existing invocation owner.
/// Required invalidation is the set of changed attribute identities in `incoming`;
/// selected-world disclosure/sensory policy stays with the installed law owner.
pub fn retain_segment(
    window: &mut Option<NativeValueWindow>,
    incoming: Vec<RetainedBinding>,
    seconds: f64,
    sim_time: f64,
) -> Result<(), ValueError> {
    if incoming.is_empty() {
        return Ok(());
    }
    let owned = window.get_or_insert_with(|| NativeValueWindow {
        elapsed_seconds: 0.0,
        sim_time,
        binding_count: 0,
        bindings: IndexMap::new(),
        by_entity: IndexMap::new(),
    });
    let from = owned.elapsed_seconds;
    for binding in incoming {
        if owned.bindings.contains_key(&binding.episode) {
            continue;
        }
        let count = safe_add(owned.binding_count, 1)?;
        let subject = owned
            .by_entity
            .entry(binding.entity_id.clone())
            .or_default();
        for id in binding.attributes.keys() {
            subject.insert(id.clone(), binding.episode.clone());
        }
        owned.binding_count = count;
        owned.bindings.insert(
            binding.episode.clone(),
            NativeValueBinding {
                entity_id: binding.entity_id,
                status_id: binding.status_id,
                episode: binding.episode,
                attributes: binding.attributes,
                demand: binding.demand,
                from,
            },
        );
    }
    owned.elapsed_seconds += seconds;
    owned.sim_time = sim_time;
    Ok(())
}

/// One installed ordinary numeric attribute's actual immutable arithmetic
/// meaning. Build from its admitted definition, never from saved continuation.
#[derive(Clone, Debug)]
pub struct ArithmeticAttributeMeaning {
    pub ordinary_numeric: bool,
    pub min: f64,
    pub max: f64,
    pub thresholds: Vec<f64>,
    pub rates: Vec<ArithmeticRateChoice>,
}

#[derive(Clone, Copy, Debug)]
pub struct ArithmeticRateChoice {
    pub rate: f64,
    pub optional: bool,
}

/// Compiled by the existing selected status-family owner. Linear excludes
/// periodic/nonlinear work, health/reservoirs and unresolved foreign targets.
#[derive(Clone, Debug)]
pub struct ArithmeticMeaning {
    pub linear: bool,
    pub source_self_required: bool,
    pub action_target_self_required: bool,
    pub targets_self: bool,
    pub while_active_len: usize,
    pub demand: NativeValueDemand,
    pub attributes: IndexMap<String, ArithmeticAttributeMeaning>,
}

/// Read-only current-format boundary into actual canonical anchors and exact
/// installed meaning. Implementations cannot supply saved claims as definitions.
pub trait NativeValueValidation {
    fn is_actor(&self, entity_id: &str) -> bool;
    fn attribute(&self, entity_id: &str, attribute_id: &str) -> Option<&AttributeState>;
    fn status(&self, entity_id: &str, status_id: &str) -> Option<&StatusInstance>;
    fn invocation(&self, episode: &str) -> Option<&WorkInvocation>;
    fn meaning(&self, entity_id: &str, status_id: &str) -> Option<&ArithmeticMeaning>;
}

fn rate_choices_match(actual: &[f64], choices: &[ArithmeticRateChoice]) -> bool {
    let mut positions = BTreeSet::from([0]);
    for choice in choices {
        let mut next = if choice.optional {
            positions.clone()
        } else {
            BTreeSet::new()
        };
        for position in positions {
            if actual.get(position) == Some(&choice.rate) {
                next.insert(position + 1);
            }
        }
        positions = next;
    }
    positions.contains(&actual.len())
}

fn validate_meaning(
    binding: &NativeValueBinding,
    status: &StatusInstance,
    meaning: &ArithmeticMeaning,
) -> Result<(), ValueError> {
    if !meaning.linear
        || !meaning.targets_self
        || status.contribution.is_some()
        || !status.active
        || (meaning.source_self_required && status.source_id != binding.entity_id)
        || (meaning.action_target_self_required && status.action_target_id != binding.entity_id)
        || binding.demand != meaning.demand
    {
        return Err(ValueError::InvalidMeaning);
    }
    for (id, expected) in &meaning.attributes {
        let actual = binding
            .attributes
            .get(id)
            .map(|value| value.rates.as_slice())
            .unwrap_or(&[]);
        if !rate_choices_match(actual, &expected.rates) {
            return Err(ValueError::InvalidMeaning);
        }
    }
    for (id, actual) in &binding.attributes {
        let expected = meaning
            .attributes
            .get(id)
            .ok_or(ValueError::InvalidMeaning)?;
        let mut sign = 0.0_f64;
        for rate in &actual.rates {
            if *rate != 0.0 {
                if sign != 0.0 && rate.signum() != sign {
                    return Err(ValueError::InvalidMeaning);
                }
                sign = rate.signum();
            }
        }
        if !expected.ordinary_numeric || actual.min != expected.min || actual.max != expected.max {
            return Err(ValueError::InvalidMeaning);
        }
    }
    Ok(())
}

/// Call after the ordinary current world and installed-family validator. This
/// proves the extra continuation links before pure readers/materialization; it
/// neither repairs values nor replays the predicates that selected earlier rates.
pub fn validate_window(
    window: &NativeValueWindow,
    world_sim_time: f64,
    source: &impl NativeValueValidation,
) -> Result<(), ValueError> {
    let fail = ValueError::InvalidContinuation;
    if !window.elapsed_seconds.is_finite()
        || window.elapsed_seconds <= 0.0
        || !window.sim_time.is_finite()
        || window.sim_time > world_sim_time
        || window.elapsed_seconds
            > window.sim_time + 16.0 * f64::EPSILON * js_max(1.0, window.sim_time)
        || window.binding_count == 0
        || window.binding_count > MAX_SAFE_INTEGER
        || window.bindings.len() as u64 != window.binding_count
    {
        return Err(fail);
    }
    let mut expected: IndexMap<&str, IndexMap<&str, &str>> = IndexMap::new();
    for (episode, binding) in &window.bindings {
        if !is_safe_record_id(episode)
            || !is_safe_record_id(&binding.entity_id)
            || !is_safe_record_id(&binding.status_id)
            || binding.episode != *episode
            || !binding.from.is_finite()
            || binding.from < 0.0
            || binding.from >= window.elapsed_seconds
            || binding.attributes.is_empty()
            || binding.demand.tests > MAX_SAFE_INTEGER
            || binding.demand.effects > MAX_SAFE_INTEGER
        {
            return Err(fail);
        }
        let status = source
            .status(&binding.entity_id, &binding.status_id)
            .ok_or(ValueError::InvalidContinuation)?;
        let work = source
            .invocation(episode)
            .ok_or(ValueError::InvalidContinuation)?;
        let meaning = source
            .meaning(&binding.entity_id, &binding.status_id)
            .ok_or(ValueError::InvalidContinuation)?;
        if !source.is_actor(&binding.entity_id)
            || status.episode != *episode
            || !status.active
            || work.recurrence.is_none()
            || work.parent_id.is_some()
            || work.children != 0
            || work.root_id != *episode
            || work.actor_id != binding.entity_id
            || work.module_id != binding.status_id
            || window.sim_time < work.interval_at
            || binding.attributes.len() > meaning.while_active_len
        {
            return Err(fail);
        }
        let owner = expected.entry(&binding.entity_id).or_default();
        let mut operations = 0;
        for (id, operation) in &binding.attributes {
            if !is_safe_record_id(id)
                || operation.rates.is_empty()
                || operation.rates.len() > meaning.while_active_len
                || operation.rates.iter().any(|rate| !rate.is_finite())
                || !operation.min.is_finite()
                || !operation.max.is_finite()
                || operation.min > operation.max
                || owner.insert(id, episode).is_some()
            {
                return Err(fail);
            }
            operations += operation.rates.len();
            if operations > meaning.while_active_len {
                return Err(fail);
            }
            let anchor = source
                .attribute(&binding.entity_id, id)
                .ok_or(ValueError::InvalidContinuation)?;
            let AttributeValue::Number(value) = anchor.value else {
                return Err(fail);
            };
            let installed = meaning
                .attributes
                .get(id)
                .ok_or(ValueError::InvalidContinuation)?;
            let next = projected_number(value, operation, window.elapsed_seconds, binding.from);
            if !next.is_finite()
                || (next != value
                    && installed.thresholds.iter().any(|threshold| {
                        js_min(value, next) <= *threshold && js_max(value, next) >= *threshold
                    }))
                || (next != value) != operation.changed
            {
                return Err(fail);
            }
        }
        validate_meaning(binding, status, meaning)?;
    }
    if window.by_entity.len() != expected.len() {
        return Err(fail);
    }
    for (entity, values) in &window.by_entity {
        if !is_safe_record_id(entity) {
            return Err(fail);
        }
        let mappings = expected
            .get(entity.as_str())
            .ok_or(ValueError::InvalidContinuation)?;
        if values.len() != mappings.len()
            || values.iter().any(|(id, episode)| {
                !is_safe_record_id(id)
                    || mappings.get(id.as_str()).copied() != Some(episode.as_str())
            })
        {
            return Err(fail);
        }
    }
    Ok(())
}
