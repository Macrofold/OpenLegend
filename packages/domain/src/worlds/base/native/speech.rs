//! The bundled speaking family. Input allowance, event family and wording come
//! from BASE_SPEECH_ACTION, the same authored definition used by Source.

use crate::commands::{NativeCommand, SpeechTargetRole};
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::install::DefinitionIdentity;
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::{AcousticPolicy, EventScalar};
use crate::state::EntityStore;
use crate::values::deserialize_safe_integer;
use crate::worlds::base_observed::SpeechVolume;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct SpeechOutcome {
    pub code: String,
    pub message: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SpeechAction {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub maximum_characters: u64,
    pub event_type: String,
    pub no_speech: SpeechOutcome,
    pub invalid_speech: SpeechOutcome,
    pub invalid_volume: SpeechOutcome,
    pub invalid_role: SpeechOutcome,
    pub missing_recipient: SpeechOutcome,
    pub non_person_recipient: SpeechOutcome,
    pub success: SpeechOutcome,
}
impl DefinitionIdentity for SpeechAction {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

pub(crate) struct SpeechPlan<'a> {
    rule: &'a SpeechAction,
    source_id: &'a str,
    text: crate::text::TextSlice<'a>,
    target_id: Option<&'a str>,
    target_role: Option<SpeechTargetRole>,
    self_introduction: Option<&'a crate::text::JsText>,
    utterance_id: &'a str,
    volume: SpeechVolume,
    acoustics: &'a AcousticPolicy,
}
impl SpeechAction {
    /// Command-wide permission/action checks precede this exact family check.
    /// Nothing here acquires delivery, knowledge, original proof or history.
    pub(crate) fn prepare<'a>(
        &'a self,
        command: &'a NativeCommand,
        entities: &EntityStore,
        acoustics: &'a AcousticPolicy,
    ) -> Result<SpeechPlan<'a>, &'a SpeechOutcome> {
        let NativeCommand::Say {
            envelope,
            text,
            target_id,
            target_role,
            self_introduction,
            volume,
        } = command
        else {
            return Err(&self.invalid_speech);
        };
        let actor = entities
            .get(&envelope.actor_id)
            .and_then(|entity| entity.actor.as_ref());
        if !actor.is_some_and(|actor| {
            actor
                .capabilities
                .as_ref()
                .map_or(actor.controller != "native", |capabilities| {
                    capabilities.speech
                })
        }) {
            return Err(&self.no_speech);
        }
        let trimmed = text.borrowed().trimmed();
        if trimmed.is_empty() || text.units_len() as u64 > self.maximum_characters {
            return Err(&self.invalid_speech);
        }
        let volume = acoustics
            .volume(volume.as_deref().unwrap_or("normal"))
            .ok_or(&self.invalid_volume)?;
        if target_role.is_some() && target_id.is_none() {
            return Err(&self.invalid_role);
        }
        if let Some(target) = target_id {
            let target = entities.get(target).ok_or(&self.missing_recipient)?;
            if target.actor.is_none() {
                return Err(&self.non_person_recipient);
            }
        }
        Ok(SpeechPlan {
            rule: self,
            source_id: &envelope.actor_id,
            text: trimmed,
            target_id: target_id.as_deref(),
            target_role: target_id
                .as_ref()
                .map(|_| target_role.unwrap_or(SpeechTargetRole::Body)),
            self_introduction: self_introduction.as_ref().filter(|name| !name.is_empty()),
            utterance_id: &envelope.id,
            volume,
            acoustics,
        })
    }
}

impl SpeechPlan<'_> {
    pub(crate) fn text(&self) -> crate::text::TextSlice<'_> {
        self.text
    }
    pub(crate) fn volume(&self) -> SpeechVolume {
        self.volume
    }
    /// The command cursor reserves this bound before materializing the intent,
    /// and retains its guard until the emitter has consumed the entire event.
    pub(crate) fn heap_bound(&self) -> Option<usize> {
        heap_sum([
            size_of::<EventEmissionIntent>(), 3 * size_of::<NarrationPart>(),
            map_storage::<String, EventScalar>(8)?,
            self.rule.event_type.len(), self.source_id.len().checked_mul(2)?,
            self.text.storage_bound()?.checked_mul(2)?, ": ".len(), self.target_id.map_or(0, str::len),
            self.self_introduction.map_or(0, crate::text::JsText::storage_bytes), self.utterance_id.len(),
            self.acoustics.id.len(), "remembered".len(), "whisper".len(),
            "texttargetRoleselfIntroductionutteranceIdvolumeacousticPolicyIdacousticPolicyVersionsourceLevelDbSplAt1m".len(),
        ])
    }
    pub(crate) fn emission(&self) -> EventEmissionIntent {
        let volume = match self.volume {
            SpeechVolume::Whisper => "whisper",
            SpeechVolume::Normal => "normal",
            SpeechVolume::Shout => "shout",
        };
        let mut data = IndexMap::with_capacity(8);
        data.insert(
            "text".to_owned(),
            EventScalar::Text(self.text.to_owned().into()),
        );
        if let Some(role) = self.target_role {
            data.insert(
                "targetRole".to_owned(),
                EventScalar::Text(
                    match role {
                        SpeechTargetRole::Body => "body",
                        SpeechTargetRole::Remembered => "remembered",
                    }
                    .to_owned()
                    .into(),
                ),
            );
        }
        if let Some(name) = self.self_introduction {
            data.insert(
                "selfIntroduction".to_owned(),
                EventScalar::Text(name.to_owned().into()),
            );
        }
        data.insert(
            "utteranceId".to_owned(),
            EventScalar::Text(self.utterance_id.to_owned().into()),
        );
        data.insert(
            "volume".to_owned(),
            EventScalar::Text(volume.to_owned().into()),
        );
        data.insert(
            "acousticPolicyId".to_owned(),
            EventScalar::Text(self.acoustics.id.clone().into()),
        );
        data.insert(
            "acousticPolicyVersion".to_owned(),
            EventScalar::Number(self.acoustics.version as f64),
        );
        data.insert(
            "sourceLevelDbSplAt1m".to_owned(),
            EventScalar::Number(self.acoustics.source_level(self.volume)),
        );
        EventEmissionIntent {
            event_type: self.rule.event_type.clone(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: self.source_id.to_owned(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(": ".to_owned().into()),
                    NarrationPart::Literal(self.text.to_owned().into()),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.source_id.to_owned()),
            target_id: self.target_id.map(str::to_owned),
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        }
    }
}

#[path = "policy_residency/speech.rs"]
mod policy_residency;
