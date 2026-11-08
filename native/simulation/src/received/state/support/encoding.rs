//! Two real source factories create sparse receipts. Their object member order
//! is part of personal-account SHA256 identity, even when fields are equivalent.

use super::*;
use serde::de::{Error, MapAccess, Visitor};
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_json::value::RawValue;

pub(super) enum SupportEncoding<'a> {
    Receipt { availability_last: bool },
    Observation,
    Existing(&'a str),
}
struct OriginalFacet<'a>(&'a TemporalFacetReference);
impl Serialize for OriginalFacet<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let f = self.0;
        let mut fields = s.serialize_map(None)?;
        if let Some(support) = &f.support {
            fields.serialize_entry("support", support)?;
        }
        fields.serialize_entry("role", &f.clock.role)?;
        fields.serialize_entry("asOf", &f.clock.as_of)?;
        fields.serialize_entry("measuredFrom", &f.clock.measured_from)?;
        fields.serialize_entry("measuredThrough", &f.clock.measured_through)?;
        fields.serialize_entry("acquiredAt", &f.clock.acquired_at)?;
        fields.serialize_entry("memberIndex", &f.member_index)?;
        if let Some(original) = &f.original {
            fields.serialize_entry("original", &crate::reception::original_fact_view(original))?;
        }
        fields.serialize_entry("valueRef", &f.value_ref)?;
        if let Some(reception) = &f.reception {
            fields.serialize_entry("reception", reception)?;
        }
        fields.end()
    }
}
struct OriginalFacets<'a>(&'a [TemporalFacetReference]);
impl Serialize for OriginalFacets<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut list = s.serialize_seq(Some(self.0.len()))?;
        for field in self.0 {
            list.serialize_element(&OriginalFacet(field))?;
        }
        list.end()
    }
}
struct Receipt<'a> {
    receipt: &'a TemporalReceipt,
    mode: &'a SupportEncoding<'a>,
}
impl Serialize for Receipt<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let r = self.receipt;
        let h = &r.header;
        let mut fields = s.serialize_map(None)?;
        if matches!(self.mode, SupportEncoding::Observation) {
            fields.serialize_entry("actorId", &r.locator.actor_id)?;
            fields.serialize_entry("physicalLife", &r.locator.physical_life)?;
            fields.serialize_entry("epoch", &r.locator.epoch)?;
            fields.serialize_entry("batchOrder", &r.locator.batch_order)?;
            fields.serialize_entry("entryIndex", &r.locator.entry_index)?;
            fields.serialize_entry("id", &r.id)?;
            fields.serialize_entry("at", &r.at)?;
            fields.serialize_entry("order", &r.order)?;
            fields.serialize_entry("acquisition", &h.acquisition)?;
            fields.serialize_entry("subject", &h.subject)?;
            fields.serialize_entry("change", &h.change)?;
            fields.serialize_entry("required", &r.required)?;
            fields.serialize_entry("sourceIds", &h.source_ids)?;
            fields.serialize_entry("facets", &OriginalFacets(&r.facets))?;
            if let Some(identity) = &h.subject_identity {
                fields.serialize_entry("subjectIdentity", identity)?;
            }
            if let Some(availability) = &h.availability {
                fields.serialize_entry("availability", availability)?;
            }
        } else {
            let availability_last = matches!(
                self.mode,
                SupportEncoding::Receipt {
                    availability_last: true
                }
            );
            fields.serialize_entry("acquisition", &h.acquisition)?;
            fields.serialize_entry("subject", &h.subject)?;
            fields.serialize_entry("change", &h.change)?;
            if let Some(spatial) = h.spatial_context {
                fields.serialize_entry("spatialContext", &spatial)?;
            }
            fields.serialize_entry("sourceIds", &h.source_ids)?;
            if let Some(identity) = &h.subject_identity {
                fields.serialize_entry("subjectIdentity", identity)?;
            }
            if let Some(subjects) = &h.context_subjects {
                fields.serialize_entry("contextSubjects", subjects)?;
            }
            if !availability_last {
                if let Some(availability) = &h.availability {
                    fields.serialize_entry("availability", availability)?;
                }
            }
            if let Some(at) = h.availability_at {
                fields.serialize_entry("availabilityAt", &at)?;
            }
            if let Some(gap) = &h.coverage_gap {
                fields.serialize_entry("coverageGap", gap)?;
            }
            if let Some(ended) = &h.ended_fields {
                fields.serialize_entry("endedFields", ended)?;
            }
            fields.serialize_entry("actorId", &r.locator.actor_id)?;
            fields.serialize_entry("physicalLife", &r.locator.physical_life)?;
            fields.serialize_entry("epoch", &r.locator.epoch)?;
            fields.serialize_entry("batchOrder", &r.locator.batch_order)?;
            fields.serialize_entry("entryIndex", &r.locator.entry_index)?;
            fields.serialize_entry("id", &r.id)?;
            fields.serialize_entry("at", &r.at)?;
            fields.serialize_entry("order", &r.order)?;
            fields.serialize_entry("required", &r.required)?;
            if let Some(frame) = &r.receiver_frame {
                fields.serialize_entry("receiverFrame", frame)?;
            }
            if let Some(origin) = &r.origin {
                fields.serialize_entry("origin", origin)?;
            }
            fields.serialize_entry("facets", &r.facets)?;
            if availability_last {
                if let Some(availability) = &h.availability {
                    fields.serialize_entry("availability", availability)?;
                }
            }
        }
        fields.end()
    }
}
#[derive(Clone, Copy, Deserialize)]
#[serde(field_identifier, rename_all = "lowercase")]
enum Key {
    Receipt,
    Values,
    Bytes,
    Required,
}
impl Key {
    fn name(self) -> &'static str {
        match self {
            Self::Receipt => "receipt",
            Self::Values => "values",
            Self::Bytes => "bytes",
            Self::Required => "required",
        }
    }
}
struct Existing<'a> {
    fields: [Option<(Key, &'a RawValue)>; 4],
}
impl<'de> Deserialize<'de> for Existing<'de> {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct Read;
        impl<'de> Visitor<'de> for Read {
            type Value = Existing<'de>;
            fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                f.write_str("the current four-field immutable support capsule")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
                let mut fields = [None; 4];
                let mut length = 0;
                while let Some(key) = map.next_key::<Key>()? {
                    if length == 4 {
                        return Err(A::Error::custom("Extra support capsule field."));
                    }
                    fields[length] = Some((key, map.next_value::<&'de RawValue>()?));
                    length += 1;
                }
                if length != 4 {
                    return Err(A::Error::custom("Incomplete support capsule."));
                }
                Ok(Existing { fields })
            }
        }
        d.deserialize_map(Read)
    }
}
struct Capsule<'a> {
    capsule: &'a TemporalSupportCapsule,
    mode: &'a SupportEncoding<'a>,
    existing: Option<Existing<'a>>,
}
impl Serialize for Capsule<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let mut fields = s.serialize_map(Some(4))?;
        if let Some(existing) = &self.existing {
            for (key, raw) in existing.fields.iter().flatten() {
                match key {
                    Key::Bytes => fields.serialize_entry(key.name(), &self.capsule.bytes)?,
                    Key::Required => fields.serialize_entry(key.name(), &self.capsule.required)?,
                    _ => fields.serialize_entry(key.name(), raw)?,
                }
            }
        } else {
            fields.serialize_entry(
                "receipt",
                &Receipt {
                    receipt: &self.capsule.receipt,
                    mode: self.mode,
                },
            )?;
            fields.serialize_entry("values", &self.capsule.values)?;
            fields.serialize_entry("bytes", &self.capsule.bytes)?;
            fields.serialize_entry("required", &self.capsule.required)?;
        }
        fields.end()
    }
}
pub(super) fn encode(
    capsule: &TemporalSupportCapsule,
    mode: SupportEncoding<'_>,
) -> Result<String, ReceivedError> {
    let existing = match mode {
        SupportEncoding::Existing(payload) => {
            Some(serde_json::from_str::<Existing<'_>>(payload).map_err(|_| invalid())?)
        }
        _ => None,
    };
    json_record(&Capsule {
        capsule,
        mode: &mode,
        existing,
    })
    .map_err(|_| invalid())
}
