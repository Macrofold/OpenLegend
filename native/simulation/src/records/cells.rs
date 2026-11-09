//! Indexed SQL values retain JavaScript text too. Payload codecs remain the
//! record owners; these finite values only travel to the existing SQL binder.
use crate::host::retained_size::HeapBytes;
use crate::text::JsText;
use indexmap::IndexMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::{Value, value::RawValue};
use std::sync::Arc;

#[derive(Clone, Debug)]
pub enum SqlCell {
    Null,
    Bool(bool),
    Number(serde_json::Number),
    Text(JsText),
    Array(Vec<SqlCell>),
    Object(IndexMap<String, SqlCell>),
    ExactObject(ExactObject),
}
/// JavaScript permits isolated code units in property names too. Keep that
/// uncommon finite transport case intact without changing every schema-keyed
/// object's normal String lookup or inventing a lossy replacement name.
#[derive(Clone, Debug)]
pub struct ExactObject {
    members: Vec<(JsText, SqlCell)>,
    encoding: Arc<RawValue>,
}
impl ExactObject {
    fn decode(source: &str) -> Result<Self, serde_json::Error> {
        let invalid = || {
            serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Invalid exact JavaScript JSON object.",
            ))
        };
        let bytes = source.as_bytes();
        let mut at = 1usize;
        let whitespace = |at: &mut usize| {
            while bytes
                .get(*at)
                .is_some_and(|b| matches!(b, b' ' | b'\n' | b'\r' | b'\t'))
            {
                *at += 1;
            }
        };
        let mut members: Vec<(JsText, SqlCell)> = Vec::new();
        loop {
            whitespace(&mut at);
            if bytes.get(at) == Some(&b'}') {
                at += 1;
                break;
            }
            if bytes.get(at) != Some(&b'"') {
                return Err(invalid());
            }
            let start = at;
            at += 1;
            let mut escaped = false;
            loop {
                let byte = *bytes.get(at).ok_or_else(invalid)?;
                at += 1;
                if escaped {
                    escaped = false;
                } else if byte == b'\\' {
                    escaped = true;
                } else if byte == b'"' {
                    break;
                }
            }
            let key: JsText = serde_json::from_str(&source[start..at])?;
            whitespace(&mut at);
            if bytes.get(at) != Some(&b':') {
                return Err(invalid());
            }
            at += 1;
            // RawValue is the existing syntax owner and yields one borrowed
            // value without decoding an object's unknown property names. The
            // small scan above only finds the exact quoted key bytes for JsText.
            let mut stream =
                serde_json::Deserializer::from_str(&source[at..]).into_iter::<&RawValue>();
            let value = stream.next().ok_or_else(invalid)??;
            at += stream.byte_offset();
            let value = serde_json::from_str(value.get())?;
            if let Some((_, prior)) = members.iter_mut().find(|(prior, _)| prior == &key) {
                *prior = value;
            } else {
                members.push((key, value));
            }
            whitespace(&mut at);
            match bytes.get(at) {
                Some(b',') => {
                    at += 1;
                }
                Some(b'}') => {
                    at += 1;
                    break;
                }
                _ => return Err(invalid()),
            }
        }
        whitespace(&mut at);
        if at != bytes.len() {
            return Err(invalid());
        }
        // Normalize once with the same scalar codec as ordinary cells. A map
        // key serializer cannot represent an isolated unit, so emit its already
        // validated quoted scalar directly into the immutable derived encoding.
        members.sort_by(|(a, _), (b, _)| {
            match (
                a.as_unicode().and_then(crate::encoding::array_index),
                b.as_unicode().and_then(crate::encoding::array_index),
            ) {
                (Some(a), Some(b)) => a.cmp(&b),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
        });
        let mut json = String::with_capacity(source.len());
        json.push('{');
        for (index, (key, value)) in members.iter().enumerate() {
            if index != 0 {
                json.push(',');
            }
            json.push_str(&crate::encoding::json_record(key)?);
            json.push(':');
            json.push_str(&crate::encoding::json_record(value)?);
        }
        json.push('}');
        Ok(Self {
            members,
            encoding: Arc::from(RawValue::from_string(json)?),
        })
    }
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
            (Self::ExactObject(a), Self::ExactObject(b)) => {
                a.members.len() == b.members.len()
                    && a.members.iter().all(|(key, value)| {
                        b.members
                            .iter()
                            .find(|(other, _)| key == other)
                            .is_some_and(|(_, other)| value == other)
                    })
            }
            (Self::Object(a), Self::ExactObject(b)) | (Self::ExactObject(b), Self::Object(a)) => {
                a.len() == b.members.len()
                    && a.iter().all(|(key, value)| {
                        b.members
                            .iter()
                            .find(|(other, _)| other.as_unicode() == Some(key.as_str()))
                            .is_some_and(|(_, other)| value == other)
                    })
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
    pub fn is_object(&self) -> bool {
        matches!(self, Self::Object(_) | Self::ExactObject(_))
    }
    pub fn object_len(&self) -> Option<usize> {
        match self {
            Self::Object(value) => Some(value.len()),
            Self::ExactObject(value) => Some(value.members.len()),
            _ => None,
        }
    }
    pub fn get(&self, key: &str) -> Option<&Self> {
        match self {
            Self::Object(value) => value.get(key),
            Self::ExactObject(value) => value
                .members
                .iter()
                .find(|(name, _)| name.as_unicode() == Some(key))
                .map(|(_, value)| value),
            _ => None,
        }
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
            (Self::ExactObject(a), Value::Object(b)) => {
                a.members.len() == b.len()
                    && a.members.iter().all(|(key, value)| {
                        key.as_unicode()
                            .and_then(|key| b.get(key))
                            .is_some_and(|other| value == other)
                    })
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
            Self::ExactObject(value) => value.encoding.serialize(serializer),
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
                Some(b'{') => match serde_json::from_str(source) {
                    Ok(value) => Self::Object(value),
                    Err(_) => Self::ExactObject(ExactObject::decode(source)?),
                },
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
            Self::ExactObject(value) => value
                .members
                .heap_bytes()?
                .checked_add(value.encoding.get().len())?
                .checked_add(2 * std::mem::size_of::<usize>()),
            _ => Some(0),
        }
    }
}
