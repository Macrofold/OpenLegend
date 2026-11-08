//! Current JavaScript-compatible JSON and source labels.
//!
//! Number spelling, UTF-8 bytes and property order participate in existing
//! quotas/source revisions. This is not `events.ts::canonicalJson`: that owner
//! sorts keys with localeCompare and needs its own exact collation contract.

use indexmap::IndexMap;
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Serialize, Serializer};
use serde_json::Value;
use std::fmt::Write as _;
use std::io;

/// ECMAScript whitespace differs from Rust's Unicode White_Space property.
/// Validation reads the trimmed slice; it never rewrites authored content.
pub fn js_trim(value: &str) -> &str {
    value.trim_matches(is_js_whitespace)
}

pub fn is_js_whitespace(character: char) -> bool {
    matches!(character,
            '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}'
            | '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}'
            | '\u{205f}' | '\u{3000}' | '\u{feff}'
    )
}

#[derive(Default)]
struct JsFormatter {
    number: ryu_js::Buffer,
}

impl serde_json::ser::Formatter for JsFormatter {
    fn write_f64<W: ?Sized + io::Write>(&mut self, writer: &mut W, value: f64) -> io::Result<()> {
        writer.write_all(self.number.format(value).as_bytes())
    }

    fn write_f32<W: ?Sized + io::Write>(&mut self, writer: &mut W, value: f32) -> io::Result<()> {
        // JavaScript receives the provider's f32 as a Number before stringifying.
        self.write_f64(writer, f64::from(value))
    }
}

/// Serialize an owned schema record in its declared source property order.
/// Dictionary fields with arbitrary keys must use `serialize_js_map`; immutable
/// Value bodies use `json_value` so integer-property enumeration stays exact.
pub fn json_record<T: Serialize + ?Sized>(record: &T) -> Result<String, serde_json::Error> {
    let mut bytes = Vec::new();
    let mut serializer = serde_json::Serializer::with_formatter(&mut bytes, JsFormatter::default());
    record.serialize(&mut serializer)?;
    // serde_json only emits UTF-8. Avoid a second parse or payload re-encoding.
    Ok(String::from_utf8(bytes).expect("JSON serializer emitted non-UTF-8 data"))
}

pub fn json_value(value: &Value) -> Result<String, serde_json::Error> {
    json_record(&JsValue(value))
}

pub fn serialize_js_value<S: Serializer>(value: &Value, serializer: S) -> Result<S::Ok, S::Error> {
    JsValue(value).serialize(serializer)
}

pub fn serialize_optional_js_value<S: Serializer>(
    value: &Option<Value>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    match value {
        Some(value) => serializer.serialize_some(&JsValue(value)),
        None => serializer.serialize_none(),
    }
}

pub fn serialize_js_object<S: Serializer>(
    value: &serde_json::Map<String, Value>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    serialize_value_entries(value.len(), value.iter(), serializer)
}

pub fn serialize_optional_js_object<S: Serializer>(
    value: &Option<serde_json::Map<String, Value>>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    match value {
        Some(value) => serialize_js_object(value, serializer),
        None => serializer.serialize_none(),
    }
}

pub fn serialize_js_values<S: Serializer>(
    value: &IndexMap<String, Value>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    serialize_value_entries(value.len(), value.iter(), serializer)
}

pub fn serialize_optional_js_values<S: Serializer>(
    value: &Option<IndexMap<String, Value>>,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    match value {
        Some(value) => serialize_js_values(value, serializer),
        None => serializer.serialize_none(),
    }
}

fn serialize_value_entries<'a, S: Serializer>(
    length: usize,
    entries: impl Iterator<Item = (&'a String, &'a Value)> + Clone,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    let mut output = serializer.serialize_map(Some(length))?;
    let mut indexed: Vec<_> = entries
        .clone()
        .filter_map(|(key, value)| array_index(key).map(|index| (index, key, value)))
        .collect();
    indexed.sort_unstable_by_key(|(index, _, _)| *index);
    for (_, key, value) in indexed {
        output.serialize_entry(key, &JsValue(value))?;
    }
    for (key, value) in entries {
        if array_index(key).is_none() {
            output.serialize_entry(key, &JsValue(value))?;
        }
    }
    output.end()
}

/// JSON.stringify enumerates canonical array-index properties numerically,
/// followed by all other string keys in their actual insertion order.
fn array_index(key: &str) -> Option<u32> {
    if key.is_empty() || (key.len() > 1 && key.starts_with('0')) {
        return None;
    }
    if !key.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>().ok().filter(|value| *value != u32::MAX)
}

pub fn serialize_js_map<S, T>(map: &IndexMap<String, T>, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
    T: Serialize,
{
    let mut output = serializer.serialize_map(Some(map.len()))?;
    let mut indexed: Vec<_> = map
        .iter()
        .filter_map(|(key, value)| array_index(key).map(|index| (index, key, value)))
        .collect();
    indexed.sort_unstable_by_key(|(index, _, _)| *index);
    for (_, key, value) in indexed {
        output.serialize_entry(key, value)?;
    }
    for (key, value) in map {
        if array_index(key).is_none() {
            output.serialize_entry(key, value)?;
        }
    }
    output.end()
}

pub fn serialize_optional_js_map<S, T>(
    map: &Option<IndexMap<String, T>>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
    T: Serialize,
{
    match map {
        Some(map) => serialize_js_map(map, serializer),
        None => serializer.serialize_none(),
    }
}

struct JsValue<'a>(&'a Value);
impl Serialize for JsValue<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self.0 {
            Value::Null => serializer.serialize_unit(),
            Value::Bool(value) => serializer.serialize_bool(*value),
            Value::Number(value) => {
                // Value may store an integral token as u64. JavaScript parses
                // every JSON number to f64 before it can become current state.
                serializer.serialize_f64(value.as_f64().ok_or_else(|| {
                    serde::ser::Error::custom("JSON number is outside the JavaScript number range")
                })?)
            }
            Value::String(value) => serializer.serialize_str(value),
            Value::Array(values) => {
                let mut output = serializer.serialize_seq(Some(values.len()))?;
                for value in values {
                    output.serialize_element(&JsValue(value))?;
                }
                output.end()
            }
            Value::Object(values) => serialize_js_object(values, serializer),
        }
    }
}

/// Existing non-security labels hash UTF-16 code units, rather than UTF-8 bytes.
/// Admission/dedup still compares the complete canonical body at its owner.
pub fn content_hash(value: &str) -> u32 {
    let mut hash = 2_166_136_261_u32;
    for unit in value.encode_utf16() {
        hash = (hash ^ u32::from(unit)).wrapping_mul(16_777_619);
    }
    hash
}

pub fn content_label(value: &str) -> String {
    let mut remaining = content_hash(value);
    let mut digits = [0_u8; 7];
    let mut from = digits.len();
    loop {
        from -= 1;
        let digit = (remaining % 36) as u8;
        digits[from] = if digit < 10 {
            b'0' + digit
        } else {
            b'a' + digit - 10
        };
        remaining /= 36;
        if remaining == 0 {
            break;
        }
    }
    String::from_utf8(digits[from..].to_vec()).expect("base36 digits must be UTF-8")
}

/// Exact personal-source revision over already encoded current-format bytes.
/// Callers must not substitute the smaller non-security content label.
pub fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut output = String::with_capacity(64);
    for byte in Sha256::digest(bytes) {
        write!(output, "{byte:02x}").expect("writing to a String cannot fail");
    }
    output
}
