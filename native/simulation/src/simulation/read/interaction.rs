//! One selected player's current Send preconditions. Target routing never
//! supplies authority: the selected world reader proves an acquired role.
use super::*;
use crate::reception::CurrentBodyReadScope;
use crate::worlds::InstalledPersonalNameReader;
use serde::Serialize;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum InteractionMode {
    Speak,
    Act,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum AvailabilitySubjects {
    Body,
    Person,
}

#[derive(serde::Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum AvailabilityRole {
    Absent,
    #[serde(rename = "self")]
    SelfActor,
    Body {
        id: String,
        lease_id: String,
        life: u64,
    },
    Person {
        id: String,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AvailabilityContact<'a> {
    source_id: &'a str,
    lease_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    physical_life: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AvailableInteraction<'a> {
    actor_available: bool,
    recipient_available: bool,
    funding_actor_id: &'a str,
    reply: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient_name: Option<&'a crate::text::JsText>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlayerInteractionFacts<'a> {
    #[serde(flatten)]
    available: AvailableInteraction<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient_can_respond: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    heard_utterance: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    recipient_description: Option<crate::worlds::base_knowledge::OwnedPersonalName>,
}

impl Simulation {
    fn interaction_names<'a>(
        &'a self,
        actor_id: &'a str,
    ) -> Result<InstalledPersonalNameReader<'a>, ActorReadError> {
        InstalledPersonalNameReader::prepare(
            &self.state.physical,
            &self.state.reception,
            &self.state.installed,
            &self.state.experience,
            actor_id,
        )
        .map_err(|error| ActorReadError::Capture(error.into()))
    }

    pub(crate) fn player_availability_contacts<'a>(
        &'a self,
        account: &str,
        actor_id: &str,
        budget: &ByteBudget,
    ) -> Result<(Vec<AvailabilityContact<'a>>, ByteReservation), ActorReadError> {
        self.require_player_read(account, actor_id)?;
        let scope = CurrentBodyReadScope::prepare(
            &self.state.reception,
            &self.state.physical.entities,
            &self.state.installed,
            &self.state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor_id,
        )
        .map_err(ExecutionError::from)?;
        let Some(scope) = scope else {
            return Ok((Vec::new(), budget.reserve(0).map_err(ExecutionError::from)?));
        };
        let ordered = scope
            .ordered_subjects(budget)
            .map_err(ExecutionError::from)?;
        let count = scope.state().current.len();
        let bytes = count
            .checked_mul(std::mem::size_of::<AvailabilityContact>())
            .ok_or(ExecutionError::Capacity)?;
        let mut custody = budget.reserve(bytes).map_err(ExecutionError::from)?;
        let mut contacts = Vec::new();
        contacts
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for id in ordered.ids().filter(|id| *id != actor_id) {
            let Some(body) = scope.native_body(id).map_err(ExecutionError::from)? else {
                continue;
            };
            contacts.push(AvailabilityContact {
                source_id: &body.grant.subject_id,
                lease_id: &body.field.id,
                physical_life: body.grant.subject_physical_life,
            });
        }
        custody
            .resize(contacts.capacity() * std::mem::size_of::<AvailabilityContact>())
            .map_err(ExecutionError::from)?;
        Ok((contacts, custody))
    }

    pub(crate) fn player_availability_people<'a>(
        &'a self,
        account: &str,
        actor_id: &'a str,
        budget: &ByteBudget,
    ) -> Result<crate::worlds::RememberedCommunicationIds<'a>, ActorReadError> {
        self.require_player_read(account, actor_id)?;
        self.interaction_names(actor_id)?
            .remembered_communication_ids(budget)
            .map_err(ExecutionError::from)
            .map_err(Into::into)
    }

    pub(crate) fn player_availability<'a>(
        &'a self,
        account: &str,
        actor_id: &'a str,
        mode: InteractionMode,
        role: &'a AvailabilityRole,
    ) -> Result<Option<AvailableInteraction<'a>>, ActorReadError> {
        self.require_player_read(account, actor_id)?;
        let (target, names) = match role {
            AvailabilityRole::Absent => (None, None),
            AvailabilityRole::SelfActor => (Some(actor_id), None),
            AvailabilityRole::Body { id, lease_id, life } => {
                let names = self.interaction_names(actor_id)?;
                if id == actor_id
                    || !names
                        .current_body_grant(id)
                        .map_err(ExecutionError::from)?
                        .is_some_and(|(lease, current_life)| {
                            lease == lease_id && current_life.unwrap_or(0) == *life
                        })
                {
                    return Ok(None);
                }
                (Some(id.as_str()), Some(names))
            }
            AvailabilityRole::Person { id } => {
                let names = self.interaction_names(actor_id)?;
                if !names.is_remembered_communication_subject(id) {
                    return Ok(None);
                }
                (Some(id.as_str()), Some(names))
            }
        };
        let names = if names.is_none() && target.is_some() && matches!(mode, InteractionMode::Speak)
        {
            Some(self.interaction_names(actor_id)?)
        } else {
            names
        };
        self.evaluate_interaction(actor_id, mode, target.zip(names.as_ref()))
            .map(Some)
    }

    /// Present the same current gameplay decision to readiness and execution.
    /// Execution separately prepares its description, response and hearing.
    fn evaluate_interaction<'a>(
        &'a self,
        actor_id: &'a str,
        mode: InteractionMode,
        selected: Option<(&'a str, &InstalledPersonalNameReader<'a>)>,
    ) -> Result<AvailableInteraction<'a>, ActorReadError> {
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
        let mut available = AvailableInteraction {
            actor_available,
            recipient_available: true,
            funding_actor_id: actor_id,
            reply: false,
            recipient_name: None,
        };
        if let Some((target_id, names)) = selected.filter(|_| speaking) {
            let target = self
                .state
                .physical
                .entities
                .get(target_id)
                .and_then(|target| target.actor.as_ref());
            available.recipient_available = target.is_some_and(|target| target.alive)
                && (names.can_address_remembered_subject(target_id)
                    || names
                        .current_body_local_subject(target_id)
                        .map_err(ExecutionError::from)?
                        .is_some());
            available.reply = available.recipient_available
                && target.is_some_and(|target| target.controller == "npc");
            if available.reply {
                available.funding_actor_id = target_id;
            }
            available.recipient_name = if target_id == actor_id {
                Some(&entity.name)
            } else {
                names
                    .current_body_identity(target_id)
                    .map_err(ExecutionError::from)?
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
        Ok(available)
    }

    pub(crate) fn player_interaction<'a>(
        &'a self,
        account: &str,
        actor_id: &'a str,
        mode: InteractionMode,
        target_id: Option<&'a str>,
        budget: &ByteBudget,
        utterance_event_id: Option<&str>,
    ) -> Result<PlayerInteractionFacts<'a>, ActorReadError> {
        self.require_player_read(account, actor_id)?;
        let selected = target_id
            .filter(|_| matches!(mode, InteractionMode::Speak))
            .map(|id| self.interaction_names(actor_id).map(|names| (id, names)))
            .transpose()?;
        let available = self.evaluate_interaction(
            actor_id,
            mode,
            selected.as_ref().map(|(id, names)| (*id, names)),
        )?;
        let mut facts = PlayerInteractionFacts {
            available,
            recipient_can_respond: None,
            heard_utterance: None,
            recipient_description: None,
        };
        if let Some((target_id, names)) = selected {
            let target = self.state.physical.entities.get(target_id);
            facts.recipient_can_respond = if !facts.available.recipient_available {
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
            if let Some(event_id) =
                utterance_event_id.filter(|_| facts.available.recipient_available)
            {
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
                facts.heard_utterance = Some(
                    awareness
                        .and_then(|collection| collection.resident_record(event_id))
                        .is_some_and(|record| {
                            record.header().heard_addressed_speech
                                && record.header().evidence_source_id.as_deref() == Some(actor_id)
                        }),
                );
            }
            facts.recipient_description = Some(
                names
                    .capture_observer_name(target_id, budget)
                    .map_err(ExecutionError::from)?,
            );
        }
        Ok(facts)
    }
}
