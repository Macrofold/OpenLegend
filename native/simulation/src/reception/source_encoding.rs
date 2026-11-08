//! Actual Source materialization and event-reference factories. Their member
//! order participates in personal-source SHA256; canonical semantic equality
//! cannot substitute for these newly produced bytes.
use super::*;
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Serialize, Serializer};

pub(crate) struct EventReferences<'a>(&'a [ReceivedReference]);
pub(crate) fn event_references_view(references: &[ReceivedReference]) -> EventReferences<'_> {
    EventReferences(references)
}
struct EventReference<'a>(&'a ReceivedReference);
impl Serialize for EventReference<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut fields = serializer.serialize_map(Some(3))?;
        fields.serialize_entry("id", &self.0.id)?;
        fields.serialize_entry("role", &self.0.role)?;
        fields.serialize_entry("label", &self.0.label)?;
        fields.end()
    }
}
impl Serialize for EventReferences<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut values = serializer.serialize_seq(Some(self.0.len()))?;
        for reference in self.0 {
            values.serialize_element(&EventReference(reference))?;
        }
        values.end()
    }
}
struct MaterializedValue<'a> {
    value: &'a SensoryFacet,
    ordinary: bool,
}
impl Serialize for MaterializedValue<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let SensoryFacet::Event {
            event_type,
            text,
            modality,
            importance,
            sequence,
            recognized,
            intelligible,
            entity_episodes,
            trigger_kind,
            source_subject,
            urgency,
            content,
            data,
            references,
            participants,
        } = self.value
        else {
            return self.value.serialize(serializer);
        };
        let mut fields = serializer.serialize_map(None)?;
        fields.serialize_entry("kind", "event")?;
        fields.serialize_entry("eventType", event_type)?;
        fields.serialize_entry("text", text)?;
        fields.serialize_entry("modality", modality)?;
        fields.serialize_entry("importance", importance)?;
        fields.serialize_entry("sequence", sequence)?;
        fields.serialize_entry("recognized", recognized)?;
        fields.serialize_entry("intelligible", intelligible)?;
        if let Some(value) = entity_episodes {
            fields.serialize_entry("entityEpisodes", &JsMap(value))?;
        }
        if let Some(value) = trigger_kind {
            fields.serialize_entry("triggerKind", value)?;
        }
        if let Some(value) = source_subject {
            fields.serialize_entry("sourceSubject", value)?;
        }
        if let Some(value) = urgency {
            fields.serialize_entry("urgency", value)?;
        }
        if let Some(value) = content {
            fields.serialize_entry("content", value)?;
        }
        fields.serialize_entry("data", &JsMap(data))?;
        if self.ordinary {
            fields.serialize_entry("references", &event_references_view(references))?;
        } else {
            fields.serialize_entry("references", references)?;
        }
        if let Some(value) = participants {
            fields.serialize_entry("participants", value)?;
        }
        fields.end()
    }
}
struct JsMap<'a, T>(&'a IndexMap<String, T>);
impl<T: Serialize> Serialize for JsMap<'_, T> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        crate::encoding::serialize_js_map(self.0, serializer)
    }
}
struct MaterializedFacet<'a> {
    value: &'a ObservationFacet,
    acquired_at: f64,
    ordinary: bool,
}
impl Serialize for MaterializedFacet<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let field = self.value;
        let mut fields = serializer.serialize_map(None)?;
        fields.serialize_entry("ordinal", &field.ordinal)?;
        fields.serialize_entry("role", &field.role)?;
        fields.serialize_entry("asOf", &field.as_of)?;
        fields.serialize_entry("measuredFrom", &field.measured_from)?;
        fields.serialize_entry("measuredThrough", &field.measured_through)?;
        // Canonical compact originals retain acquiredAt only when it differs from
        // their header. Source spreads this explicit metadata before its support;
        // otherwise materialization appends acquiredAt after that metadata.
        if field.acquired_at != self.acquired_at {
            fields.serialize_entry("acquiredAt", &field.acquired_at)?;
        }
        if let Some(support) = &field.support {
            fields.serialize_entry("support", support)?;
        }
        if field.acquired_at == self.acquired_at {
            fields.serialize_entry("acquiredAt", &field.acquired_at)?;
        }
        fields.serialize_entry(
            "value",
            &MaterializedValue {
                value: &field.value,
                ordinary: self.ordinary,
            },
        )?;
        fields.end()
    }
}
struct MaterializedFacets<'a> {
    value: &'a ObservationContribution,
    ordinary: bool,
}
impl Serialize for MaterializedFacets<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut fields = serializer.serialize_seq(Some(self.value.facets.len()))?;
        for field in &self.value.facets {
            fields.serialize_element(&MaterializedFacet {
                value: field,
                acquired_at: self.value.acquired_at,
                ordinary: self.ordinary,
            })?;
        }
        fields.end()
    }
}
impl Serialize for ObservationContribution {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut fields = serializer.serialize_map(None)?;
        fields.serialize_entry("id", &self.id)?;
        fields.serialize_entry("revision", &self.revision)?;
        fields.serialize_entry("origin", &self.origin)?;
        if let Some(context) = &self.context {
            fields.serialize_entry("context", context)?;
        }
        fields.serialize_entry(
            "facets",
            &MaterializedFacets {
                value: self,
                ordinary: !self
                    .facets
                    .iter()
                    .any(|field| matches!(field.value, SensoryFacet::Sound { .. })),
            },
        )?;
        fields.serialize_entry("observer", &self.observer)?;
        fields.serialize_entry("acquiredAt", &self.acquired_at)?;
        fields.serialize_entry("receivedOrder", &self.received_order)?;
        fields.serialize_entry("modality", &self.modality)?;
        fields.serialize_entry("detector", &self.detector)?;
        if let Some(channel) = &self.channel {
            fields.serialize_entry("channel", channel)?;
        }
        fields.end()
    }
}
