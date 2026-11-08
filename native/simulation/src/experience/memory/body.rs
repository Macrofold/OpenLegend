//! One personally produced record under construction. Unknown rich fields stay
//! immutable raw JSON; only this memory owner assigns identities and receipts.

use super::*;
use crate::reception::ObservationContribution;
use serde::de::DeserializeOwned;
use serde_json::value::RawValue;

pub(in super::super) struct MemoryBody {
    fields: IndexMap<String, Box<RawValue>>,
}
impl MemoryBody {
    pub(in super::super) fn decode(encoded: &str) -> Result<Self, MemoryAcquisitionError> {
        let fields = serde_json::from_str(encoded)
            .map_err(|_| ExperienceError::InvalidBody("memory object"))?;
        Ok(Self { fields })
    }
    pub(in super::super) fn get<T: DeserializeOwned>(
        &self,
        key: &'static str,
    ) -> Result<Option<T>, MemoryAcquisitionError> {
        self.fields
            .get(key)
            .map(|raw| {
                serde_json::from_str(raw.get())
                    .map_err(|_| ExperienceError::InvalidBody(key).into())
            })
            .transpose()
    }
    pub(in super::super) fn contains(&self, key: &str) -> bool {
        self.fields.contains_key(key)
    }
    pub(in super::super) fn set<T: Serialize>(
        &mut self,
        key: &str,
        value: &T,
    ) -> Result<(), MemoryAcquisitionError> {
        let encoded = json_record(value).map_err(|_| MemoryAcquisitionError::Encoding)?;
        self.set_raw(key, encoded)
    }
    pub(in super::super) fn set_raw(
        &mut self,
        key: &str,
        encoded: String,
    ) -> Result<(), MemoryAcquisitionError> {
        let value = RawValue::from_string(encoded).map_err(|_| MemoryAcquisitionError::Encoding)?;
        self.fields.insert(key.to_owned(), value);
        Ok(())
    }
    pub(in super::super) fn encoded(&self) -> Result<String, MemoryAcquisitionError> {
        struct Fields<'a>(&'a IndexMap<String, Box<RawValue>>);
        impl Serialize for Fields<'_> {
            fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                crate::encoding::serialize_js_map(self.0, s)
            }
        }
        json_record(&Fields(&self.fields)).map_err(|_| MemoryAcquisitionError::Encoding)
    }
    pub(in super::super) fn projection(
        &self,
    ) -> Result<Map<String, Value>, MemoryAcquisitionError> {
        let value = super::super::header_input::header_fields(&self.fields)?;
        let Value::Object(value) = value else {
            return Err(ExperienceError::InvalidBody("memory object").into());
        };
        Ok(value)
    }
    pub(in super::super) fn originals(
        &self,
    ) -> Result<Vec<ObservationContribution>, MemoryAcquisitionError> {
        #[derive(Deserialize)]
        struct Inputs {
            #[serde(default)]
            observation: Option<ObservationContribution>,
            #[serde(default)]
            observations: Vec<ObservationContribution>,
        }
        let mut result = Vec::new();
        if let Some(manifest) = self.fields.get("manifest") {
            let body: Inputs = serde_json::from_str(manifest.get())
                .map_err(|_| ExperienceError::InvalidBody("manifest originals"))?;
            result.extend(body.observations);
        }
        if let Some(original) = self.get("observation")? {
            result.push(original);
        }
        result.extend(
            self.get::<Vec<ObservationContribution>>("observations")?
                .unwrap_or_default(),
        );
        if let Some(evidence) = self.fields.get("evidence") {
            let body: Inputs = serde_json::from_str(evidence.get())
                .map_err(|_| ExperienceError::InvalidBody("memory evidence originals"))?;
            result.extend(body.observation);
            result.extend(body.observations);
        }
        Ok(result)
    }
}
