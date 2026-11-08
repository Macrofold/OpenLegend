//! Indexed SQL values retain JavaScript text too. Payload codecs remain the
//! record owners; these finite values only travel to the existing SQL binder.
use crate::host::retained_size::HeapBytes;
use crate::text::JsText;
use indexmap::IndexMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::{Value, value::RawValue};

#[derive(Clone, Debug)]
pub enum SqlCell {
    Null,
    Bool(bool),
    Number(serde_json::Number),
    Text(JsText),
    Array(Vec<SqlCell>),
    Object(IndexMap<String, SqlCell>),
}
impl PartialEq for SqlCell {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Null, Self::Null) => true,
            (Self::Bool(a), Self::Bool(b)) => a == b,
            (Self::Number(a), Self::Number(b)) => a.as_f64() == b.as_f64(),
            (Self::Text(a), Self::Text(b)) => a == b,
            (Self::Array(a), Self::Array(b)) => a == b,
            (Self::Object(a), Self::Object(b)) => {
                a.len() == b.len() && a.iter().all(|(key, value)| b.get(key) == Some(value))
            }
            _ => false,
        }
    }
}
impl SqlCell {
    pub fn is_null(&self) -> bool {
        matches!(self, Self::Null)
    }
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Self::Text(text) => text.as_unicode(),
            _ => None,
        }
    }
    pub fn as_text(&self) -> Option<&JsText> {
        match self {
            Self::Text(text) => Some(text),
            _ => None,
        }
    }
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            Self::Number(number) => number.as_f64(),
            _ => None,
        }
    }
    pub fn as_u64(&self) -> Option<u64> {
        self.as_f64()
            .filter(|value| {
                value.is_finite()
                    && value.fract() == 0.0
                    && *value >= 0.0
                    && *value < 18446744073709551616.0
            })
            .map(|value| value as u64)
    }
    pub fn as_i64(&self) -> Option<i64> {
        self.as_f64()
            .filter(|value| {
                value.is_finite()
                    && value.fract() == 0.0
                    && *value >= -9223372036854775808.0
                    && *value < 9223372036854775808.0
            })
            .map(|value| value as i64)
    }
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Self::Bool(value) => Some(*value),
            _ => None,
        }
    }
    pub fn as_array(&self) -> Option<&[Self]> {
        match self {
            Self::Array(value) => Some(value),
            _ => None,
        }
    }
    pub fn as_object(&self) -> Option<&IndexMap<String, Self>> {
        match self {
            Self::Object(value) => Some(value),
            _ => None,
        }
    }
    pub fn get(&self, key: &str) -> Option<&Self> {
        self.as_object()?.get(key)
    }
}
impl From<Value> for SqlCell {
    fn from(value: Value) -> Self {
        match value {
            Value::Null => Self::Null,
            Value::Bool(value) => Self::Bool(value),
            Value::Number(value) => Self::Number(value),
            Value::String(value) => Self::Text(value.into()),
            Value::Array(values) => Self::Array(values.into_iter().map(Into::into).collect()),
            Value::Object(values) => Self::Object(
                values
                    .into_iter()
                    .map(|(key, value)| (key, value.into()))
                    .collect(),
            ),
        }
    }
}
impl From<JsText> for SqlCell {
    fn from(value: JsText) -> Self {
        Self::Text(value)
    }
}
impl From<String> for SqlCell {
    fn from(value: String) -> Self {
        Self::Text(value.into())
    }
}
impl From<&str> for SqlCell {
    fn from(value: &str) -> Self {
        Self::Text(value.into())
    }
}
impl From<bool> for SqlCell {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}
impl From<u64> for SqlCell {
    fn from(value: u64) -> Self {
        Self::Number(value.into())
    }
}
impl From<f64> for SqlCell {
    fn from(value: f64) -> Self {
        serde_json::Number::from_f64(value).map_or(Self::Null, Self::Number)
    }
}
impl PartialEq<Value> for SqlCell {
    fn eq(&self, value: &Value) -> bool {
        match (self, value) {
            (Self::Null, Value::Null) => true,
            (Self::Bool(a), Value::Bool(b)) => a == b,
            (Self::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
            (Self::Text(a), Value::String(b)) => a.units().eq(b.encode_utf16()),
            (Self::Array(a), Value::Array(b)) => a == b,
            (Self::Object(a), Value::Object(b)) => {
                a.len() == b.len()
                    && a.iter()
                        .all(|(key, value)| b.get(key).is_some_and(|other| value == other))
            }
            _ => false,
        }
    }
}
impl Serialize for SqlCell {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Null => serializer.serialize_unit(),
            Self::Bool(value) => serializer.serialize_bool(*value),
            Self::Number(value) => serializer.serialize_f64(value.as_f64().ok_or_else(|| {
                serde::ser::Error::custom("SQL number exceeds JavaScript range.")
            })?),
            Self::Text(value) => value.serialize(serializer),
            Self::Array(value) => value.serialize(serializer),
            Self::Object(value) => crate::encoding::serialize_js_map(value, serializer),
        }
    }
}
impl<'de> Deserialize<'de> for SqlCell {
    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let source = raw.get();
        let parse = || -> Result<Self, serde_json::Error> {
            Ok(match source.as_bytes().first() {
                Some(b'n') => {
                    let _: () = serde_json::from_str(source)?;
                    Self::Null
                }
                Some(b't' | b'f') => Self::Bool(serde_json::from_str(source)?),
                Some(b'"') => Self::Text(serde_json::from_str(source)?),
                Some(b'[') => Self::Array(serde_json::from_str(source)?),
                Some(b'{') => Self::Object(serde_json::from_str(source)?),
                _ => Self::Number(serde_json::from_str(source)?),
            })
        };
        parse().map_err(serde::de::Error::custom)
    }
}
impl HeapBytes for SqlCell {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Text(value) => value.heap_bytes(),
            Self::Array(values) => values.heap_bytes(),
            Self::Object(values) => values.heap_bytes(),
            _ => Some(0),
        }
    }
}
