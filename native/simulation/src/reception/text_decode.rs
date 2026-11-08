//! Decode each typed facet from its own raw fields. Eager serde enum buffers
//! cannot retain an isolated UTF-16 surrogate in a nested heard name or word.
use super::*;
use crate::encoding::RawFields;
use serde_json::value::RawValue;

impl<'de> Deserialize<'de> for EventScalar {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let source = raw.get();
        let result = match source.as_bytes().first() {
            Some(b'"') => serde_json::from_str(source).map(Self::Text),
            Some(b'n') => serde_json::from_str(source).map(Self::Null),
            Some(b't' | b'f') => serde_json::from_str(source).map(Self::Boolean),
            _ => serde_json::from_str(source).map(Self::Number),
        };
        result.map_err(serde::de::Error::custom)
    }
}
impl<'de> Deserialize<'de> for SpeechSegment {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            let mut fields = RawFields::parse(raw.get())?;
            let kind: String = fields.take("kind")?;
            let result = match kind.as_str() {
                "heard" => Self::Heard {
                    text: fields.take("text")?,
                },
                "unintelligible" => Self::Unintelligible,
                _ => return Err("Unknown speech segment kind.".into()),
            };
            fields.finish()?;
            Ok(result)
        };
        parse().map_err(serde::de::Error::custom)
    }
}
impl<'de> Deserialize<'de> for SensoryFacet {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        let raw = Box::<RawValue>::deserialize(de)?;
        let parse = || -> Result<Self, String> {
            let mut fields = RawFields::parse(raw.get())?;
            let kind: String = fields.take("kind")?;
            let result = match kind.as_str() {
                "surface-patch" => Self::SurfacePatch {
                    patch: fields.take("patch")?,
                },
                "physical-boundary" => Self::PhysicalBoundary {
                    boundary: fields.take("boundary")?,
                },
                "detected" => Self::Detected {
                    detected: fields.take("detected")?,
                    limits: fields.take("limits")?,
                },
                "location" => Self::Location {
                    location: fields.take("location")?,
                    frame: fields.take("frame")?,
                },
                "body" => Self::Body {
                    body: fields.take("body")?,
                },
                "description" => Self::Description {
                    text: fields.take("text")?,
                },
                "carried" => Self::Carried {
                    items: fields.take("items")?,
                },
                "pile-contents" => Self::PileContents {
                    items: fields.take("items")?,
                },
                "public-attributes" => Self::PublicAttributes {
                    attributes: fields.take("attributes")?,
                },
                "observed-motion" => Self::ObservedMotion {
                    exposure: fields.take("exposure")?,
                    earlier: fields.take("earlier")?,
                    later: fields.take("later")?,
                    correspondence: fields.take("correspondence")?,
                },
                "contact" => Self::Contact {
                    exposure: fields.take("exposure")?,
                    detail: fields.take("detail")?,
                },
                "speech" => Self::Speech {
                    speech: fields.take("speech")?,
                    participants: fields.optional("participants")?,
                },
                "perceived-feature" => Self::PerceivedFeature {
                    sample: fields.take("sample")?,
                },
                "sound" => Self::Sound {
                    sound: fields.take("sound")?,
                    source: fields.optional("source")?,
                },
                "encounter-exposure" => Self::EncounterExposure {
                    exposure: fields.take("exposure")?,
                },
                "event" => Self::Event {
                    event_type: fields.take("eventType")?,
                    text: fields.take("text")?,
                    modality: fields.take("modality")?,
                    importance: fields.take("importance")?,
                    sequence: fields.safe_integer("sequence")?,
                    recognized: fields.take("recognized")?,
                    intelligible: fields.take("intelligible")?,
                    entity_episodes: fields.optional("entityEpisodes")?,
                    trigger_kind: fields.optional("triggerKind")?,
                    source_subject: fields.optional("sourceSubject")?,
                    urgency: fields.optional("urgency")?,
                    content: fields.optional("content")?,
                    data: fields.take("data")?,
                    references: fields.take("references")?,
                    participants: fields.optional("participants")?,
                },
                "association" => Self::Association {
                    subject: fields.take("subject")?,
                    strength: fields.take("strength")?,
                    learning_support: fields.optional("learningSupport")?,
                },
                "claim" => Self::Claim {
                    claim: fields.take("claim")?,
                    strength: fields.take("strength")?,
                    speaker: fields.take("speaker")?,
                    words_as_heard: fields.take("wordsAsHeard")?,
                    support: fields.take("support")?,
                    support_aliases: fields.optional("supportAliases")?,
                },
                _ => return Err("Unknown sensory facet kind.".into()),
            };
            fields.finish()?;
            Ok(result)
        };
        parse().map_err(serde::de::Error::custom)
    }
}
