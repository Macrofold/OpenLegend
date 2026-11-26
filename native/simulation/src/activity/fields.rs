//! Bounded human-labelled activity detail fields. Keys are JavaScript text too;
//! an isolated unit must survive both validation and the exact JSON fallback.
use super::{ActivityDetail, JsText};
use crate::host::retained_size::{HeapBytes, heap_sum};
use indexmap::IndexMap;
use serde::{Serialize, Serializer, ser::SerializeMap};
use serde_json::value::RawValue;
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct ActivityFields {
    entries: IndexMap<JsText, ActivityDetail>,
    raw: Option<Arc<RawValue>>,
}
impl PartialEq for ActivityFields {
    fn eq(&self, other: &Self) -> bool {
        self.entries.iter().eq(other.entries.iter())
    }
}
impl ActivityFields {
    pub(crate) fn new(
        entries: IndexMap<JsText, ActivityDetail>,
    ) -> Result<Self, serde_json::Error> {
        // serde's map-key serializer accepts Unicode strings only. Keep an immutable
        // encoded projection only when an actual key needs the current UTF16 codec;
        // ordinary keys continue to stream, including allocation-free byte counts.
        let raw = entries
            .keys()
            .any(|key| key.as_unicode().is_none())
            .then(|| encode(entries.iter()))
            .transpose()?
            .map(RawValue::from_string)
            .transpose()?
            .map(Arc::from);
        Ok(Self { entries, raw })
    }
    pub fn len(&self) -> usize {
        self.entries.len()
    }
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
    pub fn iter(&self) -> indexmap::map::Iter<'_, JsText, ActivityDetail> {
        self.entries.iter()
    }
}
impl<'a> IntoIterator for &'a ActivityFields {
    type Item = (&'a JsText, &'a ActivityDetail);
    type IntoIter = indexmap::map::Iter<'a, JsText, ActivityDetail>;
    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}
fn index(key: &JsText) -> Option<u32> {
    key.as_unicode().and_then(crate::encoding::array_index)
}
fn ordered<'a, T: 'a>(
    entries: impl Iterator<Item = (&'a JsText, &'a T)> + Clone,
) -> impl Iterator<Item = (&'a JsText, &'a T)> {
    let mut indexed: Vec<_> = entries
        .clone()
        .filter_map(|(key, value)| index(key).map(|index| (index, key, value)))
        .collect();
    indexed.sort_unstable_by_key(|(index, _, _)| *index);
    indexed
        .into_iter()
        .map(|(_, key, value)| (key, value))
        .chain(entries.filter(|(key, _)| index(key).is_none()))
}
pub(super) fn encode<'a, T: Serialize + 'a>(
    entries: impl Iterator<Item = (&'a JsText, &'a T)> + Clone,
) -> Result<String, serde_json::Error> {
    let mut output = String::from("{");
    for (index, (key, value)) in ordered(entries).enumerate() {
        if index > 0 {
            output.push(',')
        }
        output.push_str(&crate::encoding::json_record(key)?);
        output.push(':');
        output.push_str(&crate::encoding::json_record(value)?);
    }
    output.push('}');
    Ok(output)
}
impl Serialize for ActivityFields {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        if let Some(raw) = &self.raw {
            return raw.serialize(serializer);
        }
        let mut output = serializer.serialize_map(Some(self.entries.len()))?;
        for (key, value) in ordered(self.entries.iter()) {
            output.serialize_entry(
                key.as_unicode()
                    .expect("Non-Unicode activity keys own their immutable encoding"),
                value,
            )?;
        }
        output.end()
    }
}
impl HeapBytes for ActivityFields {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.entries.heap_bytes()?,
            self.raw
                .as_ref()
                .map_or(0, |v| v.get().len() + 2 * std::mem::size_of::<usize>()),
        ])
    }
}

/// RawValue first validates the complete JSON value. This small member scanner
/// locates original key/value bytes; it never builds an arbitrary value tree.
pub(super) fn raw_entries(
    source: &str,
) -> Result<IndexMap<JsText, Box<RawValue>>, serde_json::Error> {
    let source = source.trim();
    let mut at = 1;
    let mut entries = IndexMap::new();
    let invalid =
        || <serde_json::Error as serde::de::Error>::custom("Invalid activity field object.");
    if source.as_bytes().first() != Some(&b'{') {
        return Err(invalid());
    }
    loop {
        while source
            .as_bytes()
            .get(at)
            .is_some_and(u8::is_ascii_whitespace)
        {
            at += 1
        }
        if source.as_bytes().get(at) == Some(&b'}') {
            return Ok(entries);
        }
        if source.as_bytes().get(at) != Some(&b'"') {
            return Err(invalid());
        }
        let start = at;
        at += 1;
        let mut escaped = false;
        loop {
            let byte = *source.as_bytes().get(at).ok_or_else(invalid)?;
            at += 1;
            if escaped {
                escaped = false
            } else if byte == b'\\' {
                escaped = true
            } else if byte == b'"' {
                break;
            }
        }
        let key: JsText = serde_json::from_str(&source[start..at])?;
        while source
            .as_bytes()
            .get(at)
            .is_some_and(u8::is_ascii_whitespace)
        {
            at += 1
        }
        if source.as_bytes().get(at) != Some(&b':') {
            return Err(invalid());
        }
        at += 1;
        let mut value =
            serde_json::Deserializer::from_str(&source[at..]).into_iter::<Box<RawValue>>();
        let raw = value.next().ok_or_else(invalid)??;
        at += value.byte_offset();
        entries.insert(key, raw);
        while source
            .as_bytes()
            .get(at)
            .is_some_and(u8::is_ascii_whitespace)
        {
            at += 1
        }
        match source.as_bytes().get(at) {
            Some(b',') => at += 1,
            Some(b'}') => return Ok(entries),
            _ => return Err(invalid()),
        }
    }
}
