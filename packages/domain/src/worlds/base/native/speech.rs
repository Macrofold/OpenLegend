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
use std::ops::Range;

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
    pub invalid_public_appeal: SpeechOutcome,
    pub public_appeals: Vec<PublicAppeal>,
    pub overheard_reference_experiment: bool,
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

/// One supported invitation and its practical contribution. The authored
/// words determine which occurrences a listener must actually hear.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PublicAppeal {
    pub id: String,
    pub label: String,
    invitation: String,
    between: String,
    contribution: String,
    closing: String,
    item_definition: String,
}

impl PublicAppeal {
    pub(crate) fn words(&self) -> String {
        let mut text = String::with_capacity(self.word_bytes());
        for part in [
            &self.invitation,
            &self.between,
            &self.contribution,
            &self.closing,
        ] {
            text.push_str(part);
        }
        text
    }

    pub(crate) fn word_bytes(&self) -> usize {
        self.invitation.len() + self.between.len() + self.contribution.len() + self.closing.len()
    }

    fn units(&self) -> impl Iterator<Item = u16> + '_ {
        self.invitation
            .encode_utf16()
            .chain(self.between.encode_utf16())
            .chain(self.contribution.encode_utf16())
            .chain(self.closing.encode_utf16())
    }

    pub(crate) fn required_terms(&self) -> [Range<usize>; 2] {
        let invitation_end = self.invitation.encode_utf16().count();
        let contribution_start = invitation_end + self.between.encode_utf16().count();
        [
            0..invitation_end,
            contribution_start..contribution_start + self.contribution.encode_utf16().count(),
        ]
    }

    /// Consult the existing custody and outstanding stock holds. The result
    /// offers a choice of volunteering and grants no permission to give.
    pub(crate) fn can_supply(
        &self,
        state: &crate::simulation::SimulationState,
        observer: &crate::state::Entity,
    ) -> bool {
        observer
            .actor
            .as_ref()
            .is_some_and(|actor| actor.controller == "npc")
            && observer.has_memory()
            && SpeechAction::allows_speaker(observer)
            && state
                .installed
                .capabilities
                .capability_blocked(Some(observer), "speech")
                .is_ok_and(|blocked| !blocked)
            && crate::handover::gift_participant(state, observer).unwrap_or(false)
            && state
                .inventory
                .visit_owned_until(
                    &state.physical.entities,
                    &observer.id,
                    &observer.id,
                    &mut |entity, _accessible| {
                        Ok(entity.item.as_ref().is_some_and(|item| {
                            item.definition_pin.id == self.item_definition
                                && item.quantity > state.physical.holds.quantity(&entity.id)
                                && state.physical.gifts.for_item(&entity.id).is_none()
                        }))
                    },
                )
                .unwrap_or(false)
    }
}

pub(crate) struct SpeechPlan<'a> {
    rule: &'a SpeechAction,
    source_id: &'a str,
    text: crate::text::TextSlice<'a>,
    target_id: Option<&'a str>,
    target_role: Option<SpeechTargetRole>,
    self_introduction: Option<&'a crate::text::JsText>,
    public_appeal: Option<&'a PublicAppeal>,
    utterance_id: &'a str,
    volume: SpeechVolume,
    acoustics: &'a AcousticPolicy,
}
impl SpeechAction {
    pub(crate) fn valid(&self, definitions: &crate::install::RetainedDefinitions) -> bool {
        self.public_appeals
            .iter()
            .enumerate()
            .all(|(index, appeal)| {
                crate::values::is_safe_record_id(&appeal.id)
                    && !self.public_appeals[..index]
                        .iter()
                        .any(|prior| prior.id == appeal.id)
                    && !appeal.label.trim().is_empty()
                    && !appeal.invitation.is_empty()
                    && appeal.invitation.trim() == appeal.invitation
                    && !appeal.contribution.is_empty()
                    && appeal.contribution.trim() == appeal.contribution
                    && appeal.units().count() as u64 <= self.maximum_characters
                    && definitions
                        .items
                        .get(&appeal.item_definition)
                        .is_some_and(|item| item.portable)
            })
    }

    pub(crate) fn public_appeal(&self, id: &str) -> Option<&PublicAppeal> {
        self.public_appeals.iter().find(|appeal| appeal.id == id)
    }

    pub(crate) fn allows_speaker(actor: &crate::state::Entity) -> bool {
        actor.actor.as_ref().is_some_and(|actor| {
            actor
                .capabilities
                .as_ref()
                .map_or(actor.controller != "native", |capabilities| capabilities.speech)
        })
    }

    /// Whether this witness has a practical option to warn someone whom
    /// they can see. Use the quiet-air reach as a screening bound only;
    /// the chosen utterance still computes real and private hearing.
    pub(crate) fn can_warn(
        world: &crate::simulation::InstalledWorld,
        witness: &crate::state::Entity,
        target: &crate::state::Entity,
    ) -> Result<bool, crate::execution::ExecutionError> {
        if !(witness
            .actor
            .as_ref()
            .is_some_and(|actor| actor.controller == "npc" && actor.alive && !actor.incapacitated)
            && witness.actively_participates()
            && witness.has_memory()
            && Self::allows_speaker(witness)
            && !world
                .capabilities
                .capability_blocked(Some(witness), "speech")?)
        {
            return Ok(false);
        }
        let acoustics = world.acoustics.value();
        let reach = acoustics.unobstructed_word_reach(acoustics.loudest_speech_volume());
        Ok(witness.world_position().zip(target.world_position()).is_some_and(|(a, b)| {
            (a.x - b.x).hypot((a.y - b.y).hypot(a.z - b.z)) <= reach
        }))
    }
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
            public_appeal,
            volume,
        } = command
        else {
            return Err(&self.invalid_speech);
        };
        if !entities
            .get(&envelope.actor_id)
            .is_some_and(Self::allows_speaker)
        {
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
        let public_appeal = public_appeal
            .as_deref()
            .map(|id| {
                self.public_appeal(id)
                    .filter(|appeal| {
                        target_id.is_none()
                            && self_introduction.is_none()
                            && trimmed.units().eq(appeal.units())
                    })
                    .ok_or(&self.invalid_public_appeal)
            })
            .transpose()?;
        Ok(SpeechPlan {
            rule: self,
            source_id: &envelope.actor_id,
            text: trimmed,
            target_id: target_id.as_deref(),
            target_role: target_id
                .as_ref()
                .map(|_| target_role.unwrap_or(SpeechTargetRole::Body)),
            self_introduction: self_introduction.as_ref().filter(|name| !name.is_empty()),
            public_appeal,
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
            map_storage::<String, EventScalar>(8 + usize::from(self.public_appeal.is_some()))?,
            self.rule.event_type.len(), self.source_id.len().checked_mul(2)?,
            self.text.storage_bound()?.checked_mul(2)?, ": ".len(), self.target_id.map_or(0, str::len),
            self.self_introduction.map_or(0, crate::text::JsText::storage_bytes), self.utterance_id.len(),
            self.acoustics.id.len(), "remembered".len(), "whisper".len(),
            self.public_appeal.map_or(0, |appeal| "publicAppeal".len() + appeal.id.len()),
            "texttargetRoleselfIntroductionutteranceIdvolumeacousticPolicyIdacousticPolicyVersionsourceLevelDbSplAt1m".len(),
        ])
    }
    pub(crate) fn emission(&self) -> EventEmissionIntent {
        let volume = self.volume.id();
        let mut data = IndexMap::with_capacity(8 + usize::from(self.public_appeal.is_some()));
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
        if let Some(appeal) = self.public_appeal {
            data.insert(
                "publicAppeal".into(),
                EventScalar::Text(appeal.id.clone().into()),
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
