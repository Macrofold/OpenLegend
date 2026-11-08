//! Borrow only an object's field bytes before decoding a selected typed variant.
//! Serde's tagged-enum buffer decodes every nested string eagerly, which cannot
//! retain JavaScript's isolated UTF-16 units. No arbitrary value tree is built.
use indexmap::IndexMap;
use serde::de::DeserializeOwned;
use serde_json::value::RawValue;

pub(crate) struct RawFields<'a> {
    fields: IndexMap<String, &'a RawValue>,
}
impl<'a> RawFields<'a> {
    pub(crate) fn parse(source: &'a str) -> Result<Self, String> {
        Ok(Self {
            fields: serde_json::from_str(source).map_err(|error| error.to_string())?,
        })
    }
    pub(crate) fn contains(&self, key: &str) -> bool {
        self.fields.contains_key(key)
    }
    pub(crate) fn take<T: DeserializeOwned>(&mut self, key: &str) -> Result<T, String> {
        let raw = self
            .fields
            .shift_remove(key)
            .ok_or_else(|| format!("Missing field {key}."))?;
        serde_json::from_str(raw.get()).map_err(|error| error.to_string())
    }
    pub(crate) fn optional<T: DeserializeOwned>(&mut self, key: &str) -> Result<Option<T>, String> {
        self.fields
            .shift_remove(key)
            .map(|raw| serde_json::from_str(raw.get()).map_err(|error| error.to_string()))
            .transpose()
    }
    pub(crate) fn safe_integer(&mut self, key: &str) -> Result<u64, String> {
        #[derive(serde::Deserialize)]
        #[serde(transparent)]
        struct Integer(#[serde(deserialize_with = "crate::values::deserialize_safe_integer")] u64);
        self.take::<Integer>(key).map(|value| value.0)
    }
    pub(crate) fn finish(self) -> Result<(), String> {
        if self.fields.is_empty() {
            Ok(())
        } else {
            Err("Unexpected typed record field.".to_owned())
        }
    }
}
