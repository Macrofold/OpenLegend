use super::{DecisionPolicy, RenderError};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation},
    records::SqlCell,
};
use serde_json::{Value, json};

/// These aliases must come from the corresponding native response binding.
/// The published schema lists them, but only that binding can execute them.
#[derive(Clone, Copy)]
pub(crate) struct ResponseReferences<'a> {
    pub(crate) entity: &'a [String],
    pub(crate) action: &'a [String],
    pub(crate) knowledge: &'a [String],
    pub(crate) identity: &'a [String],
    pub(crate) physical: &'a [String],
    pub(crate) attention: &'a [String],
    pub(crate) retention: &'a [String],
    pub(crate) appraisal: Option<&'a Value>,
}

impl ResponseReferences<'_> {
    fn values(&self, key: &str) -> &[String] {
        match key {
            "entity" => self.entity,
            "action" => self.action,
            "knowledge" => self.knowledge,
            "identity" => self.identity,
            "physical" => self.physical,
            "attention" => self.attention,
            "retention" => self.retention,
            _ => &[],
        }
    }
}

pub(crate) struct BoundSchema {
    value: Value,
    _custody: ByteReservation,
}

impl BoundSchema {
    pub(crate) fn value(&self) -> &Value {
        &self.value
    }

    pub(crate) fn preview_root_fields(&self) -> &serde_json::Map<String, Value> {
        self.value["properties"]
            .as_object()
            .expect("bound response schema has an object root")
    }

    /// The body decoder and preview path use the same materialized provider
    /// schema. Converting received coordinates and current effect validation
    /// stay with the native response owner and its retained read.
    pub(crate) fn validate(&self, value: &SqlCell) -> Result<(), RenderError> {
        if matches_schema(&self.value, value) {
            let requests = value
                .get("queries")
                .and_then(SqlCell::as_array)
                .is_some_and(|queries| !queries.is_empty());
            if !requests
                || value
                    .get("operations")
                    .and_then(SqlCell::as_array)
                    .is_some_and(<[SqlCell]>::is_empty)
            {
                return Ok(());
            }
        }
        Err(RenderError::InvalidResponse)
    }

    /// A provisional first operation must be a complete, independent speech
    /// offer using this request's own entity alias. The final response still
    /// needs complete schema and native effect validation.
    pub(crate) fn preview_talk<'a>(&self, operation: &'a Value, player: &str) -> Option<&'a Value> {
        let talk = operation.get("talk")?;
        if talk["addresseeEntityId"] != player
            || !operation["requiresAccepted"]
                .as_array()
                .is_some_and(Vec::is_empty)
            || !matches_schema(&self.value["properties"]["operations"]["items"], operation)
        {
            return None;
        }
        Some(talk)
    }
}

impl DecisionPolicy {
    pub(crate) fn reflection_schema(
        &self,
        subjects: &[String],
        evidence: &[String],
        budget: &ByteBudget,
    ) -> Result<BoundSchema, RenderError> {
        let references = ResponseReferences {
            entity: &[],
            action: &[],
            knowledge: &[],
            identity: subjects,
            physical: &[],
            attention: &[],
            retention: evidence,
            appraisal: None,
        };
        let template = &self.reflection.schema;
        let custody = budget
            .reserve(bound_bytes(template, &references, self))
            .map_err(|_| RenderError::Capacity)?;
        let mut value = template.clone();
        if !bind_references(&mut value, &references, self) {
            return Err(RenderError::Contract);
        }
        Ok(BoundSchema {
            value,
            _custody: custody,
        })
    }

    pub(crate) fn response_schema(
        &self,
        speech: bool,
        expressions: bool,
        queries: bool,
        references: &ResponseReferences<'_>,
        budget: &ByteBudget,
    ) -> Result<BoundSchema, RenderError> {
        if references.entity.is_empty() {
            return Err(RenderError::Contract);
        }
        let template = &self
            .schemas
            .iter()
            .find(|variant| variant.speech == speech && variant.expressions == expressions)
            .ok_or(RenderError::Contract)?
            .schema;
        let additional = references.appraisal.map_or(0, tree_bytes);
        let bytes = bound_bytes(template, references, self).saturating_add(additional);
        let custody = budget.reserve(bytes).map_err(|_| RenderError::Capacity)?;
        let mut value = template.clone();
        if !queries {
            let root = value.as_object_mut().ok_or(RenderError::Contract)?;
            root.get_mut("properties")
                .and_then(Value::as_object_mut)
                .ok_or(RenderError::Contract)?
                .shift_remove("queries");
            root.get_mut("required")
                .and_then(Value::as_array_mut)
                .ok_or(RenderError::Contract)?
                .retain(|name| name != "queries");
        }
        let variants = value["properties"]["operations"]["items"]["anyOf"]
            .as_array_mut()
            .ok_or(RenderError::Contract)?;
        variants.retain_mut(|variant| {
            let Some(properties) = variant["properties"].as_object_mut() else {
                return false;
            };
            if let Some(template) = properties
                .get_mut("appraise")
                .filter(|value| value["type"] != "null")
            {
                let Some(appraisal) = references.appraisal else {
                    return false;
                };
                *template = appraisal.clone();
            }
            if let Some(name) = properties
                .get_mut("name")
                .filter(|value| value["type"] != "null")
            {
                if references.identity.is_empty() {
                    return false;
                }
                name["properties"]["subjectId"] =
                    json!({"type":"string","enum":references.identity});
            }
            !(references.attention.is_empty() && properties["observe"]["type"] != "null"
                || references.retention.is_empty() && properties["remember"]["type"] != "null")
        });
        // Naming references do not enter the other operation schemas.
        let ordinary = ResponseReferences {
            identity: &[],
            ..*references
        };
        if !bind_references(&mut value, &ordinary, self) {
            return Err(RenderError::Contract);
        }
        Ok(BoundSchema {
            value,
            _custody: custody,
        })
    }
}

fn alias_group<'a>(policy: &'a DecisionPolicy, value: &Value) -> Option<&'a str> {
    let token = value.as_str()?;
    if !token.starts_with("@rgs:") {
        return None;
    }
    policy
        .references
        .iter()
        .find_map(|(kind, marker)| (marker == token).then_some(kind.as_str()))
}

fn bind_references(
    value: &mut Value,
    references: &ResponseReferences<'_>,
    policy: &DecisionPolicy,
) -> bool {
    if let Some(object) = value.as_object_mut() {
        if let Some(group) = object
            .get("const")
            .and_then(|value| alias_group(policy, value))
        {
            let offered = references.values(group);
            if offered.is_empty() {
                return false;
            }
            if let [only] = offered {
                object["const"] = Value::String(only.clone());
            } else {
                object.shift_remove("const");
                object.insert(
                    "enum".into(),
                    Value::Array(offered.iter().cloned().map(Value::String).collect()),
                );
            }
        }
        if let Some(enumerated) =
            object
                .get_mut("enum")
                .and_then(Value::as_array_mut)
                .filter(|choices| {
                    choices
                        .iter()
                        .any(|value| alias_group(policy, value).is_some())
                })
        {
            let old = std::mem::take(enumerated);
            for choice in old {
                if let Some(group) = alias_group(policy, &choice) {
                    enumerated.extend(references.values(group).iter().cloned().map(Value::String));
                } else {
                    enumerated.push(choice);
                }
            }
            if enumerated.is_empty() {
                return false;
            }
            if enumerated.len() == 1 {
                let only = enumerated.pop().expect("one value");
                object.shift_remove("enum");
                object.insert("const".into(), only);
            }
        }
        if let Some(alternatives) = object.get_mut("anyOf").and_then(Value::as_array_mut) {
            alternatives.retain_mut(|choice| bind_references(choice, references, policy));
            if alternatives.is_empty() {
                return false;
            }
            if alternatives.len() == 1 {
                *value = alternatives.pop().expect("one alternative");
            }
            return true;
        }
        if let Some(properties) = object.get_mut("properties").and_then(Value::as_object_mut) {
            return properties
                .values_mut()
                .all(|child| bind_references(child, references, policy));
        }
        if let Some(items) = object.get_mut("items") {
            return bind_references(items, references, policy);
        }
    }
    true
}

fn bound_bytes(
    value: &Value,
    references: &ResponseReferences<'_>,
    policy: &DecisionPolicy,
) -> usize {
    if let Some(key) = alias_group(policy, value) {
        return references
            .values(key)
            .iter()
            .map(|value| 64usize.saturating_add(value.len()))
            .fold(0, usize::saturating_add)
            .saturating_add(128);
    }
    match value {
        Value::Array(items) => size_sum(
            64,
            items
                .iter()
                .map(|item| bound_bytes(item, references, policy)),
        ),
        Value::Object(fields) => size_sum(
            128,
            fields.iter().map(|(key, item)| {
                128usize
                    .saturating_add(key.len())
                    .saturating_add(bound_bytes(item, references, policy))
            }),
        ),
        _ => tree_bytes(value),
    }
}

pub(crate) fn tree_bytes(value: &Value) -> usize {
    match value {
        Value::String(value) => 32usize.saturating_add(value.len()),
        Value::Array(items) => size_sum(64, items.iter().map(tree_bytes)),
        Value::Object(fields) => size_sum(
            128,
            fields.iter().map(|(key, item)| {
                128usize
                    .saturating_add(key.len())
                    .saturating_add(tree_bytes(item))
            }),
        ),
        _ => 32,
    }
}

fn size_sum(base: usize, values: impl Iterator<Item = usize>) -> usize {
    values.fold(base, usize::saturating_add)
}

/// Validate an incremental preview and a complete exact-text response against
/// the same schema without rebuilding either input as the other value type.
trait SchemaValue: PartialEq<Value> + Sized {
    fn null(&self) -> bool;
    fn boolean(&self) -> bool;
    fn string(&self) -> Option<&str>;
    fn string_length(&self) -> Option<usize>;
    fn number(&self) -> Option<f64>;
    fn array(&self) -> Option<&[Self]>;
    fn members(&self) -> Option<impl Iterator<Item = (&str, &Self)>>;
    fn field(&self, name: &str) -> Option<&Self>;
}

impl SchemaValue for Value {
    fn null(&self) -> bool {
        self.is_null()
    }

    fn boolean(&self) -> bool {
        self.is_boolean()
    }

    fn string(&self) -> Option<&str> {
        self.as_str()
    }

    fn string_length(&self) -> Option<usize> {
        Some(self.as_str()?.chars().count())
    }

    fn number(&self) -> Option<f64> {
        self.as_f64()
    }

    fn array(&self) -> Option<&[Self]> {
        self.as_array().map(Vec::as_slice)
    }

    fn members(&self) -> Option<impl Iterator<Item = (&str, &Self)>> {
        Some(
            self.as_object()?
                .iter()
                .map(|(key, value)| (key.as_str(), value)),
        )
    }

    fn field(&self, name: &str) -> Option<&Self> {
        self.get(name)
    }
}

impl SchemaValue for SqlCell {
    fn null(&self) -> bool {
        self.is_null()
    }

    fn boolean(&self) -> bool {
        self.as_bool().is_some()
    }

    fn string(&self) -> Option<&str> {
        self.as_str()
    }

    fn string_length(&self) -> Option<usize> {
        let text = self.as_text()?;
        Some(
            text.as_unicode()
                .map_or_else(|| text.character_count(), |text| text.chars().count()),
        )
    }

    fn number(&self) -> Option<f64> {
        self.as_f64()
    }

    fn array(&self) -> Option<&[Self]> {
        self.as_array()
    }

    fn members(&self) -> Option<impl Iterator<Item = (&str, &Self)>> {
        Some(
            self.as_object()?
                .iter()
                .map(|(key, value)| (key.as_str(), value)),
        )
    }

    fn field(&self, name: &str) -> Option<&Self> {
        self.get(name)
    }
}

/// Validate the finite, reference-free shapes from the pinned schema producer.
/// A schema outside that subset is refused rather than partially validated.
fn matches_schema(schema: &Value, value: &impl SchemaValue) -> bool {
    let Some(fields) = schema.as_object() else {
        return false;
    };
    if !fields.keys().all(|key| {
        matches!(
            key.as_str(),
            "$schema"
                | "description"
                | "type"
                | "anyOf"
                | "const"
                | "enum"
                | "properties"
                | "required"
                | "additionalProperties"
                | "items"
                | "minItems"
                | "maxItems"
                | "minLength"
                | "maxLength"
                | "minimum"
                | "maximum"
                | "pattern"
        )
    }) {
        return false;
    }
    if let Some(expected) = schema.get("const") {
        if value != expected {
            return false;
        }
    }
    if let Some(allowed) = schema.get("enum").and_then(Value::as_array) {
        if !allowed.iter().any(|expected| value == expected) {
            return false;
        }
    }
    if let Some(alternatives) = schema.get("anyOf").and_then(Value::as_array) {
        if !alternatives
            .iter()
            .any(|option| matches_schema(option, value))
        {
            return false;
        }
    }
    match &schema["type"] {
        Value::String(kind) => matches_type(kind, schema, value),
        Value::Array(kinds) => kinds
            .iter()
            .filter_map(Value::as_str)
            .any(|kind| matches_type(kind, schema, value)),
        Value::Null => fields.contains_key("anyOf"),
        _ => false,
    }
}

fn matches_type(kind: &str, schema: &Value, value: &impl SchemaValue) -> bool {
    match kind {
        "null" => value.null(),
        "boolean" => value.boolean(),
        "string" => value.string_length().is_some_and(|length| {
            let pattern = schema.get("pattern").and_then(Value::as_str);
            within_count(length, &schema["minLength"], &schema["maxLength"])
                && match pattern {
                    None => true,
                    Some("^[a-z][a-z0-9_]{0,23}$") => value.string().is_some_and(|value| {
                        let mut bytes = value.bytes();
                        value.len() <= 24
                            && bytes.next().is_some_and(|byte| byte.is_ascii_lowercase())
                            && bytes.all(|byte| {
                                byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_'
                            })
                    }),
                    _ => false,
                }
        }),
        "integer" | "number" => value.number().is_some_and(|number| {
            number.is_finite()
                && (kind != "integer" || number.fract() == 0.0)
                && schema["minimum"]
                    .as_f64()
                    .is_none_or(|minimum| number >= minimum)
                && schema["maximum"]
                    .as_f64()
                    .is_none_or(|maximum| number <= maximum)
        }),
        "array" => value.array().is_some_and(|array| {
            within_count(array.len(), &schema["minItems"], &schema["maxItems"])
                && array
                    .iter()
                    .all(|item| matches_schema(&schema["items"], item))
        }),
        "object" => value.members().is_some_and(|mut members| {
            let Some(properties) = schema["properties"].as_object() else {
                return false;
            };
            let Some(required) = schema["required"].as_array() else {
                return false;
            };
            schema["additionalProperties"] == json!(false)
                && required
                    .iter()
                    .all(|key| key.as_str().is_some_and(|key| value.field(key).is_some()))
                && members.all(|(key, value)| {
                    properties
                        .get(key)
                        .is_some_and(|child| matches_schema(child, value))
                })
        }),
        _ => false,
    }
}

fn within_count(count: usize, minimum: &Value, maximum: &Value) -> bool {
    minimum
        .as_u64()
        .is_none_or(|minimum| count as u64 >= minimum)
        && maximum
            .as_u64()
            .is_none_or(|maximum| count as u64 <= maximum)
}
