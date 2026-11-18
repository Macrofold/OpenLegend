//! Ordinary journal and conversation use only the accounts owned by this
//! player's native read. The original metadata supplies chronology, never
//! another character's text, source identity, or unreceived words.

use crate::player_references::PlayerReferences;
use indexmap::IndexMap;
use openlegend_simulation::{
    capture::PlayerPerception,
    host::{ByteBudget, ByteReservation, CapacityError},
    narration::{NativeText, native_text},
    reception::{
        EventScalar, ExperienceModality, ObserverSubject, PerceivedSound, PerceivedSpeech,
        ReferenceRole, SensoryFacet,
    },
    runtime::RuntimePlayerRead,
    text::JsText,
};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::{error::Error, fmt};

mod speech;

const JOURNAL_ROWS: usize = 60;
const CONVERSATION_ROWS: usize = 30;

#[derive(Debug)]
pub enum PlayerEventError {
    InvalidCapture,
    Capacity,
    Encoding(serde_json::Error),
}

impl fmt::Display for PlayerEventError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCapture => f.write_str("Player event evidence does not match its reader"),
            Self::Capacity => f.write_str("Player event preparation exceeded its byte allowance"),
            Self::Encoding(error) => error.fmt(f),
        }
    }
}

impl Error for PlayerEventError {}
impl From<CapacityError> for PlayerEventError {
    fn from(_: CapacityError) -> Self {
        Self::Capacity
    }
}
impl From<serde_json::Error> for PlayerEventError {
    fn from(value: serde_json::Error) -> Self {
        Self::Encoding(value)
    }
}

/// Comes from the selected world's existing event presentation and player
/// view policies. Journal selection has no authored fallback in this module.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PlayerEventPolicy {
    journal_movement: MovementJournalRule,
    presentation: EventPresentationPolicy,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MovementJournalRule {
    event_type: String,
    action_type: String,
    text_suffix: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EventPresentationPolicy {
    types: IndexMap<String, Presentation>,
    fallback: Presentation,
    #[serde(rename = "coordinateText")]
    coordinate_text: Option<CoordinateTextRule>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CoordinateTextRule {
    event_type: String,
    action_event_type: String,
    action_types: Vec<String>,
    prefixes: Vec<String>,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Presentation {
    category: String,
    icon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    display_to_player: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Read<'a> {
    actor_id: &'a str,
    world_id: &'a str,
    at: f64,
    #[serde(borrow)]
    accounts: Vec<Account<'a>>,
}

#[derive(Deserialize)]
struct Original<'a> {
    id: &'a str,
    sequence: u64,
    at: f64,
    order: Option<u64>,
    #[serde(rename = "type")]
    kind: &'a str,
}

#[derive(Deserialize)]
struct Account<'a> {
    #[serde(borrow)]
    original: Original<'a>,
    #[serde(borrow)]
    evidence: Option<&'a RawValue>,
    #[serde(borrow)]
    values: Option<&'a RawValue>,
    #[serde(borrow)]
    roles: &'a RawValue,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Evidence {
    actor_id: String,
    event_type: String,
    text: NativeText,
    modality: ExperienceModality,
    #[serde(default)]
    references: Vec<EventReference>,
    source_id: Option<String>,
    target_id: Option<String>,
    source_subject: Option<ObserverSubject>,
    event_data: Option<IndexMap<String, EventScalar>>,
    speech: Option<PerceivedSpeech>,
    sound: Option<PerceivedSound>,
}

#[derive(Deserialize)]
struct EventReference {
    id: String,
    label: JsText,
    role: ReferenceRole,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RoleFacts {
    self_contact: bool,
    actor_contact: Option<Contact>,
    source_communication_id: Option<String>,
    target_communication_id: Option<String>,
    target_contact: Option<Contact>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Contact {
    id: String,
    life: u64,
    lease_id: String,
}

impl Evidence {
    fn read(account: &Account<'_>, observer: &str) -> Result<Option<Self>, PlayerEventError> {
        match (account.evidence, account.values) {
            (Some(persisted), None) => {
                let evidence: Self = serde_json::from_str(persisted.get())?;
                if evidence.actor_id != observer {
                    return Err(PlayerEventError::InvalidCapture);
                }
                Ok(Some(evidence))
            }
            (None, Some(captured)) => {
                // A selected temporal/current value is the account. It is
                // never reconstructed from the objective occurrence.
                let mut event = None;
                let mut heard = None;
                for value in serde_json::from_str::<Vec<SensoryFacet>>(captured.get())? {
                    match value {
                        value @ SensoryFacet::Event { .. } if event.is_none() => {
                            event = Some(value)
                        }
                        SensoryFacet::Sound { sound, .. } if heard.is_none() => heard = Some(sound),
                        _ => {}
                    }
                }
                let Some(SensoryFacet::Event {
                    event_type,
                    text,
                    modality,
                    data,
                    references,
                    source_subject,
                    ..
                }) = event
                else {
                    return Ok(None);
                };
                let source_id = references
                    .iter()
                    .find(|item| item.role == ReferenceRole::Actor)
                    .map(|reference| reference.id.clone());
                let target_id = references
                    .iter()
                    .find(|item| item.role == ReferenceRole::Target)
                    .map(|reference| reference.id.clone());
                Ok(Some(Self {
                    actor_id: observer.to_owned(),
                    event_type,
                    text: NativeText::Literal(text),
                    modality,
                    references: references
                        .into_iter()
                        .map(|reference| EventReference {
                            id: reference.id,
                            label: reference.label,
                            role: reference.role,
                        })
                        .collect(),
                    source_id,
                    target_id,
                    source_subject,
                    event_data: Some(data),
                    speech: None,
                    sound: heard,
                }))
            }
            _ => Err(PlayerEventError::InvalidCapture),
        }
    }

    fn kind(&self) -> &str {
        if self.sound.is_some() && self.speech.is_none() {
            "sound"
        } else {
            &self.event_type
        }
    }

    fn data(&self, key: &str) -> Option<&EventScalar> {
        if self.sound.is_some() || self.speech.is_some() {
            return None;
        }
        self.event_data.as_ref()?.get(key)
    }

    fn in_conversation(&self) -> bool {
        self.kind() == "speech"
            || matches!(self.data("responseId"), Some(EventScalar::Text(_)))
            || matches!(
                self.data("conversationRelevant"),
                Some(EventScalar::Boolean(true))
            )
    }

    fn is_journal_movement(&self, rule: &MovementJournalRule) -> bool {
        self.kind() == rule.event_type
            && match self.data("actionType") {
                Some(EventScalar::Text(kind)) => kind.as_unicode() == Some(&rule.action_type),
                None => native_text(&self.text).ends_with_str(&rule.text_suffix),
                _ => false,
            }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PerceivedReference {
    id: String,
    label: JsText,
    role: ReferenceRole,
    kind: &'static str,
    #[serde(flatten)]
    live: LiveReference,
}

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct LiveReference {
    #[serde(skip_serializing_if = "Option::is_none")]
    contact_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    communication_reference: Option<String>,
}

impl Contact {
    fn issue(&self, issuer: &PlayerReferences<'_>) -> Result<String, serde_json::Error> {
        issuer.contact(&self.id, self.life, &self.lease_id)
    }
}

fn live_references(
    facts: RoleFacts,
    evidence: &Evidence,
    issuer: &PlayerReferences<'_>,
) -> Result<(LiveReference, LiveReference), PlayerEventError> {
    Ok((
        LiveReference {
            contact_reference: if facts.self_contact {
                Some(evidence.actor_id.clone())
            } else {
                facts
                    .actor_contact
                    .map(|contact| contact.issue(issuer))
                    .transpose()?
            },
            communication_reference: facts
                .source_communication_id
                .filter(|id| *id != evidence.actor_id && Some(id) == evidence.source_id.as_ref())
                .map(|id| issuer.person(&id))
                .transpose()?,
        },
        match facts.target_communication_id {
            Some(id) => LiveReference {
                communication_reference: Some(issuer.person(&id)?),
                contact_reference: facts
                    .target_contact
                    .map(|contact| contact.issue(issuer))
                    .transpose()?,
            },
            None => LiveReference::default(),
        },
    ))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SpokenEvent {
    #[serde(flatten)]
    speech: PerceivedSpeech,
    speaker_reference: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker_contact: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SoundEvent {
    acquisition: openlegend_simulation::reception::SoundAcquisition,
    acquired_at: f64,
    listener_position: openlegend_simulation::state::Point,
    received_level_db_spl: f64,
    clarity_margin_db: f64,
    detect_threshold_db: f64,
    direction: Option<openlegend_simulation::reception::AcousticDirection>,
    visible_source: Option<SoundSource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kind: Option<openlegend_simulation::reception::SoundKind>,
}
#[derive(Serialize)]
struct SoundSource {
    reference: String,
    description: openlegend_simulation::state::Named,
}

impl SoundEvent {
    fn project(
        sound: &PerceivedSound,
        event: &str,
        issuer: &PlayerReferences<'_>,
    ) -> Result<Self, PlayerEventError> {
        let visible_source = sound
            .visible_source
            .as_ref()
            .map(|sound| {
                Ok::<_, serde_json::Error>(SoundSource {
                    reference: issuer.historical(event, &sound.entity_id, "sound-source")?,
                    description: sound.description.clone(),
                })
            })
            .transpose()?;
        Ok(Self {
            acquisition: sound.acquisition,
            acquired_at: sound.acquired_at,
            listener_position: sound.listener_position,
            received_level_db_spl: sound.received_level_db_spl,
            clarity_margin_db: sound.clarity_margin_db,
            detect_threshold_db: sound.detect_threshold_db,
            direction: sound.direction,
            visible_source,
            kind: sound.kind,
        })
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicEvent {
    presentation: Presentation,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    references: Vec<PerceivedReference>,
    #[serde(skip_serializing_if = "Option::is_none")]
    descriptive: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attribute_change: Option<formatting::AttributeChange>,
    id: String,
    time: f64,
    #[serde(rename = "type")]
    kind: String,
    text: JsText,
    modality: ExperienceModality,
    #[serde(skip_serializing_if = "Option::is_none")]
    actor_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speech: Option<SpokenEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speech_presentation: Option<speech::SpeechPresentation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sound: Option<SoundEvent>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationEvent {
    id: String,
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    mechanical: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speech: Option<PerceivedSpeech>,
    speaker: JsText,
    text: JsText,
    time: f64,
    #[serde(flatten)]
    reply: Option<ReplyStatus>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplyStatus {
    reply_status: SpeechReplyStatus,
    reply_request_id: String,
    retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reply_reason: Option<JsText>,
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpeechReplyStatus {
    Queued,
    Judging,
    Generating,
    Completed,
    Failed,
    Cancelled,
    Stale,
}

#[derive(Deserialize)]
pub struct SpeechReply {
    pub id: String,
    pub status: SpeechReplyStatus,
    pub message: JsText,
}

mod formatting;

pub struct PreparedPlayerEvents {
    journal: Vec<PublicEvent>,
    conversation: Vec<ConversationEvent>,
    event_ids: Vec<String>,
    _reply_custody: Option<ByteReservation>,
    _custody: ByteReservation,
}

impl PreparedPlayerEvents {
    pub fn journal(&self) -> &[PublicEvent] {
        &self.journal
    }
    pub fn conversation(&self) -> &[ConversationEvent] {
        &self.conversation
    }
    /// These IDs must all pass `player_publication` before transport takes a frame.
    pub fn event_ids(&self) -> &[String] {
        &self.event_ids
    }
    pub fn speech_reply_ids(&self) -> impl Iterator<Item = &str> {
        self.conversation
            .iter()
            .filter(|event| event.speaker_id.is_some())
            .map(|event| event.id.as_str())
    }
    /// Take the independently admitted lookup result. The selected reply text
    /// keeps its own backing through the last frame consumer.
    pub fn attach_replies(
        mut self,
        mut replies: IndexMap<String, SpeechReply>,
        mut custody: ByteReservation,
    ) -> Result<Self, PlayerEventError> {
        if self._reply_custody.is_some() {
            return Err(PlayerEventError::InvalidCapture);
        }
        let mut retained = 0usize;
        for event in &mut self.conversation {
            if event.speaker_id.is_some()
                && let Some(reply) = replies.shift_remove(&event.id)
                && !reply.message.is_empty()
            {
                event.reply = Some(ReplyStatus {
                    reply_status: reply.status,
                    reply_request_id: reply.id,
                    retryable: reply.status == SpeechReplyStatus::Failed,
                    reply_reason: matches!(
                        reply.status,
                        SpeechReplyStatus::Failed
                            | SpeechReplyStatus::Cancelled
                            | SpeechReplyStatus::Stale
                    )
                    .then_some(reply.message),
                });
                let reply = event.reply.as_ref().expect("attached reply");
                retained = retained
                    .checked_add(reply.reply_request_id.capacity())
                    .and_then(|bytes| {
                        bytes.checked_add(
                            reply.reply_reason.as_ref().map_or(0, JsText::storage_bytes),
                        )
                    })
                    .ok_or(PlayerEventError::Capacity)?;
            }
        }
        drop(replies);
        if retained > custody.bytes() {
            return Err(PlayerEventError::Capacity);
        }
        custody.resize(retained)?;
        self._reply_custody = Some(custody);
        Ok(self)
    }
}

/// Decode the already permitted captured accounts once, take the same bounded
/// journal/conversation union, and own all selected output. No whole-world or
/// raw occurrence audience enters this path. The caller owns the originating
/// read and must retain it for final disclosure.
pub fn prepare(
    read: &RuntimePlayerRead,
    policy: &PlayerEventPolicy,
    issuer: &PlayerReferences<'_>,
    budget: &ByteBudget,
) -> Result<PreparedPlayerEvents, PlayerEventError> {
    let payload = read.event_payload();
    // Bounded carrier overhead plus the possible independently escaped text,
    // structured speech spans, opaque handles and both permitted views.
    let reserved = payload
        .len()
        .checked_mul(24)
        .and_then(|n| n.checked_add(4096))
        .ok_or(PlayerEventError::Capacity)?;
    let custody = budget.reserve(reserved)?;
    let mut input: Read<'_> = serde_json::from_str(payload)?;
    let perception: PlayerPerception<'_> = read
        .perception()
        .map_err(|_| PlayerEventError::InvalidCapture)?;
    if input.actor_id != perception.actor_id
        || input.world_id != perception.world_id
        || input.at != perception.at
    {
        return Err(PlayerEventError::InvalidCapture);
    }
    input.accounts.sort_by(|a, b| {
        b.original
            .order
            .unwrap_or(b.original.sequence)
            .cmp(&a.original.order.unwrap_or(a.original.sequence))
    });
    let mut prepared = PreparedPlayerEvents {
        journal: Vec::new(),
        conversation: Vec::new(),
        event_ids: Vec::new(),
        _reply_custody: None,
        _custody: custody,
    };
    for account in input.accounts {
        let Some(evidence) = Evidence::read(&account, input.actor_id)? else {
            continue;
        };
        if account.original.kind == "speech"
            && evidence.speech.is_none()
            && evidence.sound.is_none()
        {
            return Err(PlayerEventError::InvalidCapture);
        }
        let journal = prepared.journal.len() < JOURNAL_ROWS
            && !evidence.is_journal_movement(&policy.journal_movement);
        let conversation =
            prepared.conversation.len() < CONVERSATION_ROWS && evidence.in_conversation();
        if !journal && !conversation {
            continue;
        }
        let text = native_text(&evidence.text);
        if conversation {
            prepared
                .conversation
                .push(conversation_row(&account.original, &evidence, &text));
        }
        if journal {
            prepared
                .journal
                .push(public_row(&account, &evidence, text, policy, issuer)?);
        }
        prepared.event_ids.push(account.original.id.to_owned());
        if prepared.journal.len() == JOURNAL_ROWS
            && prepared.conversation.len() == CONVERSATION_ROWS
        {
            break;
        }
    }
    prepared.journal.reverse();
    prepared.conversation.reverse();
    prepared.event_ids.reverse();
    if prepared.event_ids.is_empty() {
        prepared._custody.resize(0)?;
    }
    Ok(prepared)
}

fn conversation_row(
    original: &Original<'_>,
    evidence: &Evidence,
    rendered: &JsText,
) -> ConversationEvent {
    let speaker = match evidence.speech.as_ref() {
        Some(speech) => speech.speaker.as_ref().map(|speaker| &speaker.name_at_time),
        None => evidence
            .references
            .iter()
            .find(|item| item.role == ReferenceRole::Actor)
            .map(|item| &item.label),
    };
    let text = match evidence.speech.as_ref() {
        Some(speech)
            if speech.intelligibility
                != openlegend_simulation::reception::Intelligibility::None =>
        {
            speech::words(speech)
        }
        _ => match evidence.data("text") {
            Some(EventScalar::Text(text)) => text.clone(),
            Some(EventScalar::Boolean(flag)) => if *flag { "true" } else { "false" }.into(),
            Some(EventScalar::Number(number)) => {
                openlegend_simulation::encoding::json_record(number)
                    .expect("captured finite event scalar")
                    .into()
            }
            _ => rendered.clone(),
        },
    };
    ConversationEvent {
        id: original.id.to_owned(),
        kind: if evidence.kind() == "speech" {
            "speech"
        } else {
            "action"
        },
        mechanical: matches!(
            evidence.data("mechanical"),
            Some(EventScalar::Boolean(false))
        )
        .then_some(false),
        speaker_id: (evidence.source_id.as_deref() == Some(&evidence.actor_id))
            .then(|| evidence.actor_id.clone()),
        speech: evidence.speech.as_ref().map(speech::wire_speech),
        speaker: speaker.cloned().unwrap_or_else(|| "Someone".into()),
        text,
        time: original.at,
        reply: None,
    }
}

fn public_row(
    account: &Account<'_>,
    evidence: &Evidence,
    rendered: JsText,
    policy: &PlayerEventPolicy,
    issuer: &PlayerReferences<'_>,
) -> Result<PublicEvent, PlayerEventError> {
    let id = account.original.id;
    let (actor, target) =
        live_references(serde_json::from_str(account.roles.get())?, evidence, issuer)?;
    let self_actor = evidence.source_id.as_deref() == Some(&evidence.actor_id);
    let references = evidence
        .references
        .iter()
        .map(|reference| {
            let (role, live) = match reference.role {
                ReferenceRole::Actor => ("actor", actor.clone()),
                ReferenceRole::Target => ("target", target.clone()),
                ReferenceRole::Participant => ("participant", LiveReference::default()),
            };
            Ok::<_, serde_json::Error>(PerceivedReference {
                id: issuer.historical(id, &reference.id, role)?,
                label: reference.label.clone(),
                role: reference.role,
                kind: "historical",
                live,
            })
        })
        .collect::<Result<Vec<_>, _>>()?;
    let (speech, speech_presentation) = match evidence.speech.as_ref() {
        Some(speech) => {
            let speaker_reference = if self_actor {
                issuer.speech_participant("self")?
            } else if let Some(subject) = &evidence.source_subject {
                issuer.speech_participant(subject)?
            } else {
                issuer.speech_participant(id)?
            };
            let presentation = speech::project(
                speech,
                speech::Participants {
                    observer: &evidence.actor_id,
                    source: evidence.source_id.as_deref(),
                    target: evidence.target_id.as_deref(),
                    source_contact: actor.contact_reference.as_deref(),
                    target_contact: target.contact_reference.as_deref(),
                },
                id,
                issuer,
            )?;
            (
                Some(SpokenEvent {
                    speech: speech::wire_speech(speech),
                    speaker_reference,
                    speaker_contact: actor.contact_reference,
                }),
                Some(presentation),
            )
        }
        None => (None, None),
    };
    let sound = evidence
        .sound
        .as_ref()
        .map(|sound| SoundEvent::project(sound, id, issuer))
        .transpose()?;
    let kind = evidence.kind();
    let attribute_change = formatting::AttributeChange::from_evidence(evidence);
    let text = formatting::event_text(
        evidence,
        self_actor,
        rendered,
        attribute_change.as_ref(),
        policy.presentation.coordinate_text.as_ref(),
    )?;
    Ok(PublicEvent {
        presentation: policy
            .presentation
            .types
            .get(kind)
            .unwrap_or(&policy.presentation.fallback)
            .clone(),
        references,
        descriptive: (kind == "expression"
            && matches!(
                evidence.data("descriptive"),
                Some(EventScalar::Boolean(true))
            )
            && matches!(
                evidence.data("mechanical"),
                Some(EventScalar::Boolean(false))
            ))
        .then_some(true),
        attribute_change,
        id: id.to_owned(),
        time: account.original.at,
        kind: kind.to_owned(),
        text,
        modality: evidence.modality,
        actor_id: self_actor.then(|| evidence.actor_id.clone()),
        target_id: (evidence.target_id.as_deref() == Some(&evidence.actor_id))
            .then(|| evidence.actor_id.clone()),
        speech,
        speech_presentation,
        sound,
    })
}
