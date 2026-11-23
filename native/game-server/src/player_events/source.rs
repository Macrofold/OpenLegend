use super::{PlayerEventError, PlayerReferences, RetainedPlayerEvent, speech};
use openlegend_simulation::{
    encoding::sha256_hex,
    reception::{EncounterExposure, ObservedItemLocation, PerceivedSpeech, SpeechPerception},
    state::SurfacePoint,
    text::JsText,
    values::is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;

#[derive(Clone, Copy, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum Family {
    Speech,
    Encounter,
}
impl Family {
    fn name(self) -> &'static str {
        match self {
            Self::Speech => "speech",
            Self::Encounter => "encounter",
        }
    }
}

#[derive(Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct EventSourceReference {
    token: String,
    pub(crate) source_id: String,
    revision: String,
    family: Family,
}
impl EventSourceReference {
    fn issue(
        issuer: &PlayerReferences<'_>,
        generation: &str,
        family: Family,
        source_id: &str,
        revision: &str,
    ) -> Result<Self, PlayerEventError> {
        Ok(Self {
            token: issuer.event_source(generation, family.name(), source_id, revision)?,
            source_id: source_id.to_owned(),
            revision: revision.to_owned(),
            family,
        })
    }

    pub(crate) fn valid(
        &self,
        issuer: &PlayerReferences<'_>,
        generation: &str,
    ) -> Result<bool, PlayerEventError> {
        Ok(self.source_id.len() <= 120
            && is_safe_record_id(&self.source_id)
            && !self.revision.is_empty()
            && self.revision.len() <= 200
            && self.token.len() == 64
            && bool::from(
                self.token.as_bytes().ct_eq(
                    issuer
                        .event_source(
                            generation,
                            self.family.name(),
                            &self.source_id,
                            &self.revision,
                        )?
                        .as_bytes(),
                ),
            ))
    }
}

#[derive(Serialize)]
#[serde(
    tag = "status",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub(crate) enum EventSourceDetail<'a> {
    Available {
        reference: EventSourceReference,
        time: f64,
        order: u64,
        acquisition: &'static str,
        acquisition_label: &'static str,
        source_label: JsText,
        text: &'a JsText,
        #[serde(skip_serializing_if = "Option::is_none")]
        inscription: Option<&'a JsText>,
        #[serde(skip_serializing_if = "Option::is_none")]
        speech: Option<PerceivedSpeech>,
        #[serde(skip_serializing_if = "Option::is_none")]
        observed_location: Option<SourceLocation<'a>>,
        corrected: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        correction_note: Option<JsText>,
    },
    Unavailable {
        source_id: &'a str,
        reason: &'static str,
    },
}
impl<'a> EventSourceDetail<'a> {
    pub(crate) fn unavailable(source_id: &'a str) -> Self {
        Self::Unavailable {
            source_id,
            reason: "This source is no longer available in your retained history.",
        }
    }
}

/// Only the label and sampled point are public. The stored container identity
/// is private and must not become a live target through a historical read.
#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub(crate) enum SourceLocation<'a> {
    World {
        point: &'a SurfacePoint,
        label: &'a JsText,
    },
    Possession {
        label: &'a JsText,
    },
}
impl<'a> From<&'a ObservedItemLocation> for SourceLocation<'a> {
    fn from(value: &'a ObservedItemLocation) -> Self {
        match value {
            ObservedItemLocation::World { point, label, .. } => Self::World { point, label },
            ObservedItemLocation::Possession { label } => Self::Possession { label },
        }
    }
}

impl RetainedPlayerEvent {
    fn source_family(&self) -> Option<Family> {
        match self.evidence.kind() {
            "speech" => Some(Family::Speech),
            "encounter" => Some(Family::Encounter),
            _ => None,
        }
    }

    pub(crate) fn source_reference(
        &self,
        issuer: &PlayerReferences<'_>,
        generation: &str,
        revision: &str,
    ) -> Result<Option<EventSourceReference>, PlayerEventError> {
        self.source_family()
            .map(|family| {
                EventSourceReference::issue(issuer, generation, family, &self.id, revision)
            })
            .transpose()
    }

    pub(crate) fn source_detail<'a>(
        &'a self,
        issuer: &PlayerReferences<'_>,
        generation: &str,
        requested: &'a EventSourceReference,
        order: u64,
        revision: &str,
        correction: Option<(&str, Option<&JsText>)>,
    ) -> Result<EventSourceDetail<'a>, PlayerEventError> {
        if self.source_family() != Some(requested.family) || self.id != requested.source_id {
            return Err(PlayerEventError::InvalidCapture);
        }
        let mut inscription = None;
        let mut observed_location = None;
        let evidence = &self.evidence;
        let (acquisition, acquisition_label, source_label) = match requested.family {
            Family::Speech => {
                let speaking = evidence.source_id.as_deref() == Some(evidence.actor_id.as_str())
                    || evidence
                        .speech
                        .as_ref()
                        .is_some_and(|speech| speech.perception == SpeechPerception::SelfBody);
                let label = evidence
                    .speech
                    .as_ref()
                    .and_then(|speech| speech.speaker.as_ref())
                    .map(|speaker| speaker.name_at_time.clone());
                if speaking {
                    (
                        "spoken-by-self",
                        "Spoken by you",
                        label.unwrap_or_else(|| "You".into()),
                    )
                } else {
                    (
                        "heard-speech",
                        "Heard",
                        label.unwrap_or_else(|| "Unrecognized speaker".into()),
                    )
                }
            }
            Family::Encounter => match &self.exposure {
                Some(EncounterExposure::InventoryItem {
                    label,
                    inscription: words,
                    observed_location: location,
                    ..
                }) => {
                    inscription = words.as_ref();
                    observed_location = location.as_ref().map(SourceLocation::from);
                    if inscription.is_some() {
                        (
                            "inspected-document",
                            "Inspected a written account",
                            label.clone(),
                        )
                    } else {
                        ("inspected-item", "Inspected", label.clone())
                    }
                }
                Some(EncounterExposure::Place { label, .. }) => {
                    ("observed-place", "Observed", label.clone())
                }
                None => (
                    "observed-encounter",
                    "Observed",
                    "Observed encounter".into(),
                ),
            },
        };
        let corrected_revision = correction.map(|(id, _)| {
            let qualified = format!("{revision}:corrected:{id}");
            sha256_hex(qualified.as_bytes())
        });
        let reference = EventSourceReference::issue(
            issuer,
            generation,
            requested.family,
            &self.id,
            corrected_revision.as_deref().unwrap_or(revision),
        )?;
        let correction_note = correction.map(|(_, text)| {
            if let Some(text) = text {
                let mut note = JsText::from("Qualified by later observation: ");
                note.push_text(text);
                note
            } else {
                "Qualified by a later observation in retained history.".into()
            }
        });
        Ok(EventSourceDetail::Available {
            reference,
            time: self.time,
            order,
            acquisition,
            acquisition_label,
            source_label,
            text: self.text(),
            inscription,
            speech: evidence.speech.as_ref().map(speech::wire_speech),
            observed_location,
            corrected: correction.is_some(),
            correction_note,
        })
    }
}
