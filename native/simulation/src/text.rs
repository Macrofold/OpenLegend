//! JavaScript text is a sequence of UTF-16 code units. JSON permits an isolated
//! surrogate; converting it to a Rust String would either reject usable input
//! or change the words and their retained source hash. Keep those units intact.
use crate::host::retained_size::HeapBytes;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::value::RawValue;
use std::cmp::Ordering;
use std::ops::Range;

#[derive(Clone, Debug)]
pub enum JsText {
    Unicode(String),
    Utf16 {
        units: Vec<u16>,
        json: Box<RawValue>,
    },
}
#[derive(Debug)]
pub struct JsonTextError;
#[derive(Clone, Copy)]
pub enum TextRef<'a> {
    Unicode(&'a str),
    Text(&'a JsText),
}
impl<'a> From<&'a str> for TextRef<'a> {
    fn from(value: &'a str) -> Self {
        Self::Unicode(value)
    }
}
impl<'a> From<&'a JsText> for TextRef<'a> {
    fn from(value: &'a JsText) -> Self {
        Self::Text(value)
    }
}
impl TextRef<'_> {
    pub fn storage_bytes(self) -> usize {
        match self {
            Self::Unicode(value) => value.len(),
            Self::Text(value) => value.storage_bytes(),
        }
    }
    pub fn is_empty(self) -> bool {
        match self {
            Self::Unicode(value) => value.is_empty(),
            Self::Text(value) => value.is_empty(),
        }
    }
    pub fn to_owned(self) -> JsText {
        match self {
            Self::Unicode(value) => value.into(),
            Self::Text(value) => value.clone(),
        }
    }
    pub fn append_to(self, target: &mut JsText) {
        match self {
            Self::Unicode(value) => target.push_str(value),
            Self::Text(value) => target.push_text(value),
        }
    }
}

pub enum CodeUnits<'a> {
    Unicode(std::str::EncodeUtf16<'a>),
    Utf16(std::iter::Copied<std::slice::Iter<'a, u16>>),
}
/// A borrowed code-unit range is safe even when a JavaScript slice splits a
/// surrogate pair. Validation and trimming need no speculative string copy.
#[derive(Clone, Copy)]
pub struct TextSlice<'a> {
    source: &'a JsText,
    start: usize,
    end: usize,
}
impl<'a> TextSlice<'a> {
    pub fn units(self) -> std::iter::Take<std::iter::Skip<CodeUnits<'a>>> {
        self.source
            .units()
            .skip(self.start)
            .take(self.end - self.start)
    }
    pub fn units_len(self) -> usize {
        self.end - self.start
    }
    pub fn is_empty(self) -> bool {
        self.start == self.end
    }
    pub fn character_count(self) -> usize {
        character_count(self.units())
    }
    pub fn slice(self, range: Range<usize>) -> Option<Self> {
        if range.start > range.end || range.end > self.units_len() {
            None
        } else {
            Some(Self {
                source: self.source,
                start: self.start + range.start,
                end: self.start + range.end,
            })
        }
    }
    pub fn equals_str(self, value: &str) -> bool {
        self.units().eq(value.encode_utf16())
    }
    pub fn ends_with_str(self, value: &str) -> bool {
        let length = value.encode_utf16().count();
        length <= self.units_len()
            && self
                .units()
                .skip(self.units_len() - length)
                .eq(value.encode_utf16())
    }
    pub fn trimmed(self) -> Self {
        let mut first = None;
        let mut end = self.start;
        for (offset, unit) in self.units().enumerate() {
            if !whitespace(unit) {
                first.get_or_insert(self.start + offset);
                end = self.start + offset + 1;
            }
        }
        Self {
            source: self.source,
            start: first.unwrap_or(end),
            end,
        }
    }
    pub fn contains(self, needle: Self) -> bool {
        self.find_from(needle, 0).is_some()
    }
    pub fn find_from(self, needle: Self, from: usize) -> Option<usize> {
        let length = needle.units_len();
        let total = self.units_len();
        if from > total || length > total - from {
            return None;
        }
        if length == 0 {
            return Some(from);
        }
        (from..=total - length).find(|at| self.units().skip(*at).take(length).eq(needle.units()))
    }
    pub fn to_owned(self) -> JsText {
        self.source.slice(self.start..self.end)
    }
    /// Reserve the retained units and canonical JSON in the exceptional UTF16
    /// form, including writer growth. The Unicode form needs less storage.
    pub fn storage_bound(self) -> Option<usize> {
        self.units_len().checked_mul(16)?.checked_add(4)
    }
}
fn character_count(units: impl Iterator<Item = u16>) -> usize {
    let mut units = units.peekable();
    let mut count = 0;
    while let Some(unit) = units.next() {
        if (0xd800..=0xdbff).contains(&unit)
            && units
                .peek()
                .is_some_and(|next| (0xdc00..=0xdfff).contains(next))
        {
            units.next();
        }
        count += 1;
    }
    count
}
impl Iterator for CodeUnits<'_> {
    type Item = u16;
    fn next(&mut self) -> Option<u16> {
        match self {
            Self::Unicode(value) => value.next(),
            Self::Utf16(value) => value.next(),
        }
    }
}
impl Default for JsText {
    fn default() -> Self {
        Self::Unicode(String::new())
    }
}
impl From<String> for JsText {
    fn from(value: String) -> Self {
        Self::Unicode(value)
    }
}
impl From<&str> for JsText {
    fn from(value: &str) -> Self {
        Self::Unicode(value.to_owned())
    }
}
impl PartialEq for JsText {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Unicode(left), Self::Unicode(right)) => left == right,
            _ => self.units().eq(other.units()),
        }
    }
}
impl Eq for JsText {}
impl std::hash::Hash for JsText {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        use std::hash::Hash;
        self.units_len().hash(state);
        for unit in self.units() {
            unit.hash(state);
        }
    }
}
impl Ord for JsText {
    fn cmp(&self, other: &Self) -> Ordering {
        self.units().cmp(other.units())
    }
}
impl PartialOrd for JsText {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl PartialEq<str> for JsText {
    fn eq(&self, other: &str) -> bool {
        self.units().eq(other.encode_utf16())
    }
}
impl PartialEq<&str> for JsText {
    fn eq(&self, other: &&str) -> bool {
        self == *other
    }
}
impl PartialEq<String> for JsText {
    fn eq(&self, other: &String) -> bool {
        self == other.as_str()
    }
}
impl HeapBytes for JsText {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Unicode(value) => Some(value.capacity()),
            Self::Utf16 { units, json } => units
                .capacity()
                .checked_mul(2)?
                .checked_add(json.get().len()),
        }
    }
}
fn whitespace(unit: u16) -> bool {
    char::from_u32(u32::from(unit)).is_some_and(crate::encoding::is_js_whitespace)
}
impl JsText {
    pub fn borrowed(&self) -> TextSlice<'_> {
        TextSlice {
            source: self,
            start: 0,
            end: self.units_len(),
        }
    }
    pub fn units(&self) -> CodeUnits<'_> {
        match self {
            Self::Unicode(value) => CodeUnits::Unicode(value.encode_utf16()),
            Self::Utf16 { units, .. } => CodeUnits::Utf16(units.iter().copied()),
        }
    }
    pub fn as_unicode(&self) -> Option<&str> {
        match self {
            Self::Unicode(value) => Some(value),
            Self::Utf16 { .. } => None,
        }
    }
    pub fn unit_at(&self, at: usize) -> Option<u16> {
        self.units().nth(at)
    }
    pub fn starts_with_str(&self, prefix: &str) -> bool {
        let length = prefix.encode_utf16().count();
        self.units().take(length).eq(prefix.encode_utf16())
    }
    pub fn ends_with_str(&self, suffix: &str) -> bool {
        let length = suffix.encode_utf16().count();
        let total = self.units_len();
        length <= total && self.units().skip(total - length).eq(suffix.encode_utf16())
    }
    pub fn ascii_lowercase(&self) -> Self {
        if let Self::Unicode(value) = self {
            return value.to_ascii_lowercase().into();
        }
        Self::from_units(
            self.units()
                .map(|unit| {
                    if (65..=90).contains(&unit) {
                        unit + 32
                    } else {
                        unit
                    }
                })
                .collect(),
        )
    }
    pub fn lowercase(&self) -> Self {
        if let Self::Unicode(value) = self {
            return value.to_lowercase().into();
        }
        let mut output = Vec::new();
        let mut run = String::new();
        for character in char::decode_utf16(self.units()) {
            match character {
                Ok(character) => run.push(character),
                Err(unit) => {
                    output.extend(run.to_lowercase().encode_utf16());
                    run.clear();
                    output.push(unit.unpaired_surrogate());
                }
            }
        }
        output.extend(run.to_lowercase().encode_utf16());
        Self::from_units(output)
    }
    pub fn truncate_units(&mut self, length: usize) {
        *self = self.slice(0..length.min(self.units_len()));
    }
    pub fn first_case(&self, upper: bool) -> Self {
        if let Self::Unicode(value) = self {
            let Some(first) = value.chars().next() else {
                return Self::default();
            };
            if first.len_utf16() == 2 {
                return self.clone();
            }
            let mut result: String = if upper {
                first.to_uppercase().collect()
            } else {
                first.to_lowercase().collect()
            };
            result.push_str(&value[first.len_utf8()..]);
            return result.into();
        }
        let Some(first) = self.units().next() else {
            return Self::default();
        };
        // JavaScript cases text[0], one unit. Surrogates have no case mapping.
        let Some(first) = char::from_u32(u32::from(first)) else {
            return self.clone();
        };
        let mapped: String = if upper {
            first.to_uppercase().collect()
        } else {
            first.to_lowercase().collect()
        };
        Self::from_units(mapped.encode_utf16().chain(self.units().skip(1)).collect())
    }
    pub fn concat(parts: &[&Self]) -> Self {
        Self::join(parts.iter().copied(), "")
    }
    pub fn join<'a>(values: impl Iterator<Item = &'a Self> + Clone, separator: &str) -> Self {
        if values.clone().all(|value| value.as_unicode().is_some()) {
            let bytes = values
                .clone()
                .map(|value| value.storage_bytes())
                .sum::<usize>()
                + values.clone().count().saturating_sub(1) * separator.len();
            let mut text = String::with_capacity(bytes);
            for (index, value) in values.enumerate() {
                if index > 0 {
                    text.push_str(separator);
                }
                if let Self::Unicode(value) = value {
                    text.push_str(value);
                }
            }
            return text.into();
        }
        let mut units = Vec::new();
        for (index, value) in values.enumerate() {
            if index > 0 {
                units.extend(separator.encode_utf16());
            }
            units.extend(value.units());
        }
        Self::from_units(units)
    }
    pub fn json_document_bound(&self) -> Option<usize> {
        self.units_len().checked_mul(6)
    }
    /// A JS string can itself contain a JSON document. Literal isolated units
    /// are legal inside its quoted values; emit their equivalent JSON escape
    /// for the Rust parser. A unit in JSON syntax or an escape stays invalid.
    pub fn json_document(&self) -> Result<String, JsonTextError> {
        use std::fmt::Write;
        let mut output = String::with_capacity(self.json_document_bound().ok_or(JsonTextError)?);
        let mut units = self.units().peekable();
        let mut quoted = false;
        let mut escaped = false;
        while let Some(unit) = units.next() {
            if (0xd800..=0xdbff).contains(&unit)
                && units
                    .peek()
                    .is_some_and(|next| (0xdc00..=0xdfff).contains(next))
            {
                let low = units.next().ok_or(JsonTextError)?;
                output.push(
                    char::from_u32(
                        0x10000 + ((u32::from(unit) - 0xd800) << 10) + (u32::from(low) - 0xdc00),
                    )
                    .ok_or(JsonTextError)?,
                );
                if escaped {
                    escaped = false;
                }
                continue;
            }
            if (0xd800..=0xdfff).contains(&unit) {
                if !quoted || escaped {
                    return Err(JsonTextError);
                }
                write!(output, "\\u{unit:04x}").map_err(|_| JsonTextError)?;
                continue;
            }
            let character = char::from_u32(u32::from(unit)).ok_or(JsonTextError)?;
            output.push(character);
            if escaped {
                escaped = false;
            } else if quoted && unit == 92 {
                escaped = true;
            } else if unit == 34 {
                quoted = !quoted;
            }
        }
        Ok(output)
    }
    pub fn is_empty(&self) -> bool {
        match self {
            Self::Unicode(value) => value.is_empty(),
            Self::Utf16 { units, .. } => units.is_empty(),
        }
    }
    /// String.length, used by the speech command's existing input allowance.
    pub fn units_len(&self) -> usize {
        match self {
            Self::Unicode(value) => value.encode_utf16().count(),
            Self::Utf16 { units, .. } => units.len(),
        }
    }
    /// TextEncoder/Buffer.byteLength counts an isolated surrogate as U+FFFD.
    /// This is a byte allowance only; the retained text keeps its actual unit.
    pub fn utf8_len(&self) -> usize {
        match self {
            Self::Unicode(value) => value.len(),
            Self::Utf16 { units, .. } => char::decode_utf16(units.iter().copied())
                .map(|character| character.map_or(3, char::len_utf8))
                .sum(),
        }
    }
    /// Match the existing Node PostgreSQL client's scalar TEXT transport. Its
    /// UTF-8 encoding replaces isolated units, while the canonical JSON body
    /// retains their escapes. This comparison never rewrites canonical text.
    pub fn matches_utf8_transport(&self, received: &Self) -> bool {
        let Some(received) = received.as_unicode() else {
            return false;
        };
        char::decode_utf16(self.units())
            .map(|character| character.unwrap_or(char::REPLACEMENT_CHARACTER))
            .eq(received.chars())
    }
    /// Array.from(text).length, used by the selected world's personal-name cap.
    pub fn character_count(&self) -> usize {
        character_count(self.units())
    }
    /// Heap/data allowance for callers that retain an additional text copy.
    pub fn storage_bytes(&self) -> usize {
        match self {
            Self::Unicode(value) => value.capacity(),
            Self::Utf16 { units, json } => units.capacity() * 2 + json.get().len(),
        }
    }
    pub fn from_units(units: Vec<u16>) -> Self {
        match String::from_utf16(&units) {
            Ok(value) => Self::Unicode(value),
            Err(_) => {
                let json = quote_units(&units);
                Self::Utf16 {
                    units,
                    json: RawValue::from_string(json).expect("UTF-16 quoting emits valid JSON"),
                }
            }
        }
    }
    pub fn trimmed(&self) -> Self {
        match self {
            Self::Unicode(value) => crate::encoding::js_trim(value).into(),
            Self::Utf16 { units, .. } => {
                let start = units
                    .iter()
                    .position(|unit| !whitespace(*unit))
                    .unwrap_or(units.len());
                let end = units
                    .iter()
                    .rposition(|unit| !whitespace(*unit))
                    .map_or(start, |at| at + 1);
                Self::from_units(units[start..end].to_vec())
            }
        }
    }
    pub fn trim_is_empty(&self) -> bool {
        self.units().all(whitespace)
    }
    pub fn contains(&self, needle: &Self) -> bool {
        self.find_from(needle, 0).is_some()
    }
    pub fn find_from(&self, needle: &Self, from: usize) -> Option<usize> {
        let length = needle.units_len();
        let total = self.units_len();
        if from > total || length > total - from {
            return None;
        }
        if length == 0 {
            return Some(from);
        }
        (from..=total - length).find(|at| self.units().skip(*at).take(length).eq(needle.units()))
    }
    pub fn slice(&self, range: Range<usize>) -> Self {
        Self::from_units(
            self.units()
                .skip(range.start)
                .take(range.end.saturating_sub(range.start))
                .collect(),
        )
    }
    pub fn push_text(&mut self, tail: &Self) {
        if let (Self::Unicode(value), Self::Unicode(tail)) = (&mut *self, tail) {
            value.push_str(tail);
            return;
        }
        *self = Self::from_units(self.units().chain(tail.units()).collect());
    }
    pub fn push_str(&mut self, tail: &str) {
        if let Self::Unicode(value) = self {
            value.push_str(tail);
            return;
        }
        *self = Self::from_units(self.units().chain(tail.encode_utf16()).collect());
    }
}
impl Serialize for JsText {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::Unicode(value) => value.serialize(serializer),
            Self::Utf16 { json, .. } => json.serialize(serializer),
        }
    }
}
impl<'de> Deserialize<'de> for JsText {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct TextVisitor;
        impl<'de> serde::de::Visitor<'de> for TextVisitor {
            type Value = JsText;
            fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                f.write_str("JavaScript text")
            }
            fn visit_newtype_struct<D: Deserializer<'de>>(self, de: D) -> Result<JsText, D::Error> {
                // A trusted typed value/serde buffer already owns a Unicode
                // string. Original JSON uses the raw map path below instead.
                struct Unicode;
                impl<'de> serde::de::Visitor<'de> for Unicode {
                    type Value = JsText;
                    fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                        f.write_str("text")
                    }
                    fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<JsText, E> {
                        Ok(value.into())
                    }
                    fn visit_string<E: serde::de::Error>(self, value: String) -> Result<JsText, E> {
                        Ok(value.into())
                    }
                }
                de.deserialize_string(Unicode)
            }
            fn visit_map<A: serde::de::MapAccess<'de>>(
                self,
                mut map: A,
            ) -> Result<JsText, A::Error> {
                if map.next_key::<String>()?.as_deref() != Some("$serde_json::private::RawValue") {
                    return Err(serde::de::Error::custom("Expected raw JSON text."));
                }
                let source = map.next_value::<String>()?;
                if map.next_key::<serde::de::IgnoredAny>()?.is_some() {
                    return Err(serde::de::Error::custom("Invalid raw JSON text."));
                }
                JsText::from_json_string(&source).map_err(serde::de::Error::custom)
            }
        }
        deserializer.deserialize_newtype_struct("$serde_json::private::RawValue", TextVisitor)
    }
}
impl JsText {
    fn from_json_string(source: &str) -> Result<Self, &'static str> {
        if source.len() < 2 || !source.starts_with('"') || !source.ends_with('"') {
            return Err("Expected JavaScript text.");
        }
        if let Ok(value) = serde_json::from_str::<String>(source) {
            return Ok(Self::Unicode(value));
        }
        // RawValue has already validated JSON syntax. Decode escapes ourselves
        // so an unpaired \uXXXX remains one code unit rather than U+FFFD.
        let mut units = Vec::new();
        let mut chars = source[1..source.len() - 1].chars();
        while let Some(character) = chars.next() {
            if character != '\\' {
                let mut pair = [0; 2];
                units.extend_from_slice(character.encode_utf16(&mut pair));
                continue;
            }
            let escape = chars.next().ok_or("Invalid JSON text escape.")?;
            let unit = match escape {
                '"' => 0x22,
                '\\' => 0x5c,
                '/' => 0x2f,
                'b' => 8,
                'f' => 12,
                'n' => 10,
                'r' => 13,
                't' => 9,
                'u' => {
                    let mut unit = 0u16;
                    for _ in 0..4 {
                        let digit = chars
                            .next()
                            .and_then(|value| value.to_digit(16))
                            .ok_or("Invalid JSON Unicode escape.")?;
                        unit = (unit << 4) | digit as u16;
                    }
                    unit
                }
                _ => return Err("Invalid JSON text escape."),
            };
            units.push(unit);
        }
        Ok(Self::from_units(units))
    }
}
fn quote_units(units: &[u16]) -> String {
    use std::fmt::Write;
    let mut result = String::from("\"");
    let mut at = 0;
    while at < units.len() {
        let unit = units[at];
        at += 1;
        match unit {
            0x22 => result.push_str("\\\""),
            0x5c => result.push_str("\\\\"),
            8 => result.push_str("\\b"),
            12 => result.push_str("\\f"),
            10 => result.push_str("\\n"),
            13 => result.push_str("\\r"),
            9 => result.push_str("\\t"),
            0..=0x1f => write!(result, "\\u{unit:04x}").expect("String formatting"),
            0xd800..=0xdbff
                if units
                    .get(at)
                    .is_some_and(|next| (0xdc00..=0xdfff).contains(next)) =>
            {
                let low = units[at];
                at += 1;
                result.push(
                    char::from_u32(
                        0x10000 + ((u32::from(unit) - 0xd800) << 10) + (u32::from(low) - 0xdc00),
                    )
                    .expect("UTF-16 pair"),
                );
            }
            0xd800..=0xdfff => write!(result, "\\u{unit:04x}").expect("String formatting"),
            _ => result.push(char::from_u32(u32::from(unit)).expect("non-surrogate unit")),
        }
    }
    result.push('"');
    result
}
