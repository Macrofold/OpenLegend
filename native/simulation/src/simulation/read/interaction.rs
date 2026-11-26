//! One selected player's current Send preconditions. Target routing never
//! supplies authority: the selected world reader proves an acquired role.
use super::*;
use crate::worlds::InstalledPersonalNameReader;
use serde::Serialize;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InteractionMode {
    Speak,
    Act,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerInteractionFacts<'a> {
    pub actor_available: bool,
    pub recipient_available: bool,
    pub funding_actor_id: &'a str,
    pub reply: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_can_respond: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub heard_utterance: Option<bool>,
    #[serde(skip)]
    pub addressed_source: Option<&'a crate::experience::PersonalSourceRef>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_name: Option<&'a crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient_description: Option<crate::worlds::base_knowledge::OwnedPersonalName>,
    #[serde(skip)]
    public_appeals: &'a [crate::worlds::base_speech::PublicAppeal],
}

impl PlayerInteractionFacts<'_> {
    pub fn recipient_description(&self) -> Option<&crate::state::Named> {
        self.recipient_description
            .as_ref()
            .map(|description| description.name())
    }

    /// Detach only the installed choices for an available ambient composer.
    /// The caller carries this independent storage until the response is sent.
    pub fn prepare_public_appeals(
        &self,
        budget: &crate::host::ByteBudget,
    ) -> Result<
        (
            Vec<crate::speech::PublicAppealChoice>,
            crate::host::ByteReservation,
        ),
        crate::host::CapacityError,
    > {
        use crate::speech::PublicAppealChoice;
        let bytes = self
            .public_appeals
            .iter()
            .try_fold(0usize, |bytes, appeal| {
                bytes
                    .checked_add(size_of::<PublicAppealChoice>())?
                    .checked_add(appeal.id.len())?
                    .checked_add(appeal.label.len())?
                    .checked_add(appeal.word_bytes())
            })
            .ok_or(crate::host::CapacityError)?;
        let custody = budget.reserve(bytes)?;
        let mut choices = Vec::with_capacity(self.public_appeals.len());
        for appeal in self.public_appeals {
            choices.push(PublicAppealChoice {
                id: appeal.id.clone(),
                label: appeal.label.clone(),
                text: appeal.words(),
            });
        }
        Ok((choices, custody))
    }
}

impl Simulation {
    pub(crate) fn player_interaction<'a>(
        &'a self,
        account: &str,
        actor_id: &'a str,
        mode: InteractionMode,
        target_id: Option<&'a str>,
        budget: &crate::host::ByteBudget,
        utterance_event_id: Option<&str>,
    ) -> Result<PlayerInteractionFacts<'a>, ActorReadError> {
        self.require_player_read(account, actor_id)?;
        let entity = self
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ActorReadError::Denied)?;
        let actor = entity.actor.as_ref().ok_or(ActorReadError::Denied)?;
        let speaking = matches!(mode, InteractionMode::Speak);
        let actor_available = actor.alive
            && !actor.incapacitated
            && entity.actively_participates()
            && (!speaking
                || actor
                    .capabilities
                    .as_ref()
                    .map_or(actor.controller != "native", |c| c.speech))
            && !self
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), if speaking { "speech" } else { "actions" })
                .map_err(|error| ActorReadError::Capture(error.into()))?;
        let mut heard_utterance = None;
        let mut addressed_source = None;
        let mut recipient_available = true;
        let mut reply = false;
        let mut recipient_can_respond = None;
        let mut recipient_name = None;
        let mut recipient_description = None;
        if let Some(target_id) = target_id.filter(|_| speaking) {
            let names = InstalledPersonalNameReader::prepare(
                &self.state.physical,
                &self.state.reception,
                &self.state.installed,
                &self.state.experience,
                actor_id,
            )
            .map_err(|error| ActorReadError::Capture(error.into()))?;
            let target = self.state.physical.entities.get(target_id);
            recipient_available = target
                .and_then(|target| target.actor.as_ref())
                .is_some_and(|target| target.alive)
                && (names.can_address_remembered_subject(target_id)
                    || names
                        .current_body_local_subject(target_id)
                        .map_err(|error| ActorReadError::Capture(error.into()))?
                        .is_some());
            reply = recipient_available
                && target
                    .and_then(|target| target.actor.as_ref())
                    .is_some_and(|target| target.controller == "npc");
            recipient_can_respond = if !recipient_available {
                None
            } else {
                Some(if let Some(target) = target {
                    target
                        .actor
                        .as_ref()
                        .is_some_and(|actor| actor.alive && !actor.incapacitated)
                        && !(self
                            .state
                            .installed
                            .capabilities
                            .capability_blocked(Some(target), "speech")
                            .map_err(|error| ActorReadError::Capture(error.into()))?
                            && self
                                .state
                                .installed
                                .capabilities
                                .capability_blocked(Some(target), "actions")
                                .map_err(|error| ActorReadError::Capture(error.into()))?)
                } else {
                    false
                })
            };
            if let Some(event_id) = utterance_event_id.filter(|_| recipient_available) {
                // Source's immediate reply gate consults its actual resident
                // awareness array; cold history is not another hearing grant.
                let awareness = self
                    .state
                    .experience
                    .optional_collection(
                        target_id,
                        crate::experience::PersonalSourceKind::Awareness,
                    )
                    .map_err(|error| ActorReadError::Capture(error.into()))?;
                let heard = awareness
                    .and_then(|collection| collection.resident_record(event_id))
                    .map(|record| record.header())
                    .filter(|header| {
                        header.heard_addressed_speech
                            && header.evidence_source_id.as_deref() == Some(actor_id)
                    });
                heard_utterance = Some(heard.is_some());
                // The retry caller can use this exact resident source only
                // while the speaker and listener retain the original evidence.
                addressed_source = heard
                    .filter(|header| {
                        !self
                            .state
                            .experience
                            .actor(actor_id)
                            .is_some_and(|entry| entry.privacy.revoked(event_id))
                            && !self.state.experience.actor(target_id).is_some_and(|entry| {
                                entry.privacy.revoked(event_id)
                                    || header
                                        .privacy_dependencies
                                        .iter()
                                        .any(|id| entry.privacy.revoked(id))
                            })
                    })
                    .map(|header| &header.reference);
            }
            recipient_description = Some(
                names
                    .capture_observer_name(target_id, budget)
                    .map_err(|error| ActorReadError::Capture(error.into()))?,
            );
            recipient_name = if target_id == actor_id {
                Some(&entity.name)
            } else {
                names
                    .current_body_identity(target_id)
                    .map_err(|error| ActorReadError::Capture(error.into()))?
                    .and_then(|identity| {
                        identity
                            .nickname
                            .as_ref()
                            .filter(|name| !name.is_empty())
                            .or_else(|| {
                                (!identity.given_name.is_empty()).then_some(&identity.given_name)
                            })
                    })
            };
        }
        Ok(PlayerInteractionFacts {
            actor_available,
            recipient_available,
            funding_actor_id: if reply {
                target_id.expect("reply has selected target")
            } else {
                actor_id
            },
            reply,
            recipient_can_respond,
            heard_utterance,
            addressed_source,
            recipient_name,
            recipient_description,
            public_appeals: if actor_available && speaking && target_id.is_none() {
                &self.state.installed.speech_action.value().public_appeals
            } else {
                &[]
            },
        })
    }
}
