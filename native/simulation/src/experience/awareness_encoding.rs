//! Actual transient producer factories. Canonical personal identity uses the
//! source's construction order, including an early undefined receipt later
//! filled by account admission. No field-order registry enters saved state.

use super::Awareness;
use crate::reception::{ReceivedReference, SoundAcquisition};
use indexmap::IndexMap;
use serde::ser::SerializeMap;
use serde::{Serialize, Serializer};

#[derive(Clone, Copy, Debug)]
pub(crate) enum AwarenessFactory {
    Event,
    Speech,
    Sound { voice_like: bool },
}
#[derive(Clone, Copy, Debug)]
pub(crate) struct AwarenessEncoding {
    pub factory: AwarenessFactory,
    pub source_receipt_before_observation: bool,
}
#[derive(Clone, Copy)]
pub(crate) struct AwarenessInput<'a> {
    pub awareness: &'a Awareness,
    pub encoding: AwarenessEncoding,
}
struct JsMap<'a, T>(&'a IndexMap<String, T>);
impl<T: Serialize> Serialize for JsMap<'_, T> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        crate::encoding::serialize_js_map(self.0, s)
    }
}
struct Body<'a> {
    body: &'a Awareness,
    encoding: AwarenessEncoding,
}
impl Serialize for Body<'_> {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let b = self.body;
        let mut f = s.serialize_map(None)?;
        macro_rules! field {
            ($key:literal,$value:expr) => {
                f.serialize_entry($key, $value)?
            };
        }
        macro_rules! optional {
            ($key:literal,$value:expr) => {
                if let Some(value) = $value {
                    field!($key, value);
                }
            };
        }
        field!("retentionClass", &b.retention_class);
        match self.encoding.factory {
            AwarenessFactory::Event => {
                optional!("exposure", &b.exposure);
                field!("eventId", &b.event_id);
                field!("actorId", &b.actor_id);
                field!("text", &b.text);
                field!("at", &b.at);
                field!("sequence", &b.sequence);
                field!("modality", &b.modality);
                if let Some(value) = &b.entity_episodes {
                    field!("entityEpisodes", &JsMap(value));
                }
                field!("recognized", &b.recognized);
                field!("intelligible", &b.intelligible);
                field!("entityIds", &b.entity_ids);
                field!("importance", &b.importance);
                optional!("urgency", &b.urgency);
                optional!("eventType", &b.event_type);
                if let Some(value) = &b.event_data {
                    field!("eventData", &JsMap(value));
                }
                if let Some(value) = &b.references {
                    field!(
                        "references",
                        &crate::reception::event_references_view(value)
                    );
                }
                optional!("sourceId", &b.source_id);
                optional!("targetId", &b.target_id);
                optional!("triggerKind", &b.trigger_kind);
                optional!("retention", &b.retention);
                optional!("content", &b.content);
                optional!("change", &b.change);
            }
            AwarenessFactory::Speech => {
                field!("eventId", &b.event_id);
                field!("actorId", &b.actor_id);
                field!("at", &b.at);
                field!("sequence", &b.sequence);
                optional!("eventType", &b.event_type);
                field!("text", &b.text);
                optional!("content", &b.content);
                optional!("speech", &b.speech);
                field!("modality", &b.modality);
                field!("recognized", &b.recognized);
                field!("intelligible", &b.intelligible);
                optional!("sourceId", &b.source_id);
                optional!("sourceBody", &b.source_body);
                optional!("recognition", &b.recognition);
                optional!("receivedFeatures", &b.received_features);
                optional!("sourceSubject", &b.source_subject);
                optional!("targetId", &b.target_id);
                field!("entityIds", &b.entity_ids);
                if let Some(value) = &b.entity_episodes {
                    field!("entityEpisodes", &JsMap(value));
                }
                field!("importance", &b.importance);
                optional!("urgency", &b.urgency);
                optional!("triggerKind", &b.trigger_kind);
            }
            AwarenessFactory::Sound { voice_like } => {
                optional!("expiresAt", &b.expires_at);
                field!("eventId", &b.event_id);
                field!("actorId", &b.actor_id);
                field!("at", &b.at);
                field!("sequence", &b.sequence);
                optional!("eventType", &b.event_type);
                optional!("sound", &b.sound);
                field!("text", &b.text);
                field!("modality", &b.modality);
                field!("recognized", &b.recognized);
                field!("intelligible", &b.intelligible);
                field!("entityIds", &b.entity_ids);
                let source_in_base = b.sound.as_ref().is_some_and(|sound| {
                    sound.acquisition == SoundAcquisition::SelfBody
                        || sound.visible_source.is_some()
                });
                if source_in_base {
                    optional!("sourceId", &b.source_id);
                }
                optional!("references", &b.references);
                optional!("triggerKind", &b.trigger_kind);
                field!("importance", &b.importance);
                optional!("urgency", &b.urgency);
                if voice_like {
                    optional!("recognition", &b.recognition);
                    optional!("receivedFeatures", &b.received_features);
                    if !source_in_base {
                        optional!("sourceId", &b.source_id);
                    }
                    optional!("sourceSubject", &b.source_subject);
                }
            }
        }
        if self.encoding.source_receipt_before_observation {
            optional!("sourceReceipt", &b.source_receipt);
        }
        optional!("observation", &b.observation);
        optional!("observations", &b.observations);
        if !self.encoding.source_receipt_before_observation {
            optional!("sourceReceipt", &b.source_receipt);
        }
        f.end()
    }
}
pub(super) fn encode(
    body: &Awareness,
    encoding: AwarenessEncoding,
) -> Result<String, serde_json::Error> {
    crate::encoding::json_record(&Body { body, encoding })
}
