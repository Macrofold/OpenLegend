//! Ordinary journal and conversation use only the accounts owned by this
//! player's native read. The original metadata supplies chronology, never
//! another character's text, source identity, or unreceived words.

use crate::player_references::PlayerReferences;
use indexmap::IndexMap;
use openlegend_simulation::{
    capture::PlayerPerception,
    experience::{PlayerEventAccount, PlayerEventBody, PlayerEventRoles},
    host::{ByteBudget, ByteReservation, CapacityError},
    narration::{NativeText, native_text},
    reception::{
        EncounterExposure, EventScalar, ExperienceModality, ObserverSubject, PerceivedSound,
        PerceivedSpeech, ReceivedReference, ReferenceRole, SensoryFacet,
    },
    runtime::RuntimePlayerRead,
    text::JsText,
};
use serde::{Deserialize, Serialize};
use std::{error::Error, fmt};

mod source;
mod speech;

pub(crate) use source::{EventSourceDetail, EventSourceReference};

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
#[derive(Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Presentation {
    category: String,
    icon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    display_to_player: Option<bool>,
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

impl Evidence {
    fn read(body: PlayerEventBody<'_>, observer: &str) -> Result<Self, PlayerEventError> {
        match body {
            PlayerEventBody::Awareness(payload) => Self::persisted(payload, observer),
            PlayerEventBody::Received { event, sound } => {
                let SensoryFacet::Event {
                    event_type,
                    text,
                    modality,
                    data,
                    references,
                    source_subject,
                    ..
                } = event
                else {
                    return Err(PlayerEventError::InvalidCapture);
                };
                let heard = match sound {
                    Some(SensoryFacet::Sound { sound, .. }) => Some(sound.clone()),
                    Some(_) => return Err(PlayerEventError::InvalidCapture),
                    None => None,
                };
                Ok(Self::received(
                    observer,
                    ObservedEvent {
                        event_type: event_type.clone(),
                        text: text.clone(),
                        modality: *modality,
                        data: data.clone(),
                        references: references.clone(),
                        source_subject: source_subject.clone(),
                        heard,
                    },
                ))
            }
        }
    }

    fn persisted(body: &str, observer: &str) -> Result<Self, PlayerEventError> {
        let evidence: Self = serde_json::from_str(body)?;
        if evidence.actor_id != observer {
            return Err(PlayerEventError::InvalidCapture);
        }
        Ok(evidence)
    }

    fn facets(
        values: Vec<SensoryFacet>,
        observer: &str,
    ) -> Result<Option<(Self, Option<EncounterExposure>)>, PlayerEventError> {
        // A selected temporal/current value is the account. It is
        // never reconstructed from the objective occurrence.
        let mut event = None;
        let mut heard = None;
        let mut exposure = None;
        let mut speech = None;
        for value in values {
            match value {
                value @ SensoryFacet::Event { .. } if event.is_none() => event = Some(value),
                SensoryFacet::Sound { sound, .. } if heard.is_none() => heard = Some(sound),
                SensoryFacet::Speech { speech: value, .. } if speech.is_none() => {
                    speech = Some(value)
                }
                SensoryFacet::EncounterExposure { exposure: value } if exposure.is_none() => {
                    exposure = Some(value);
                }
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
        let mut evidence = Self::received(
            observer,
            ObservedEvent {
                event_type,
                text,
                modality,
                data,
                references,
                source_subject,
                heard,
            },
        );
        evidence.speech = speech;
        Ok(Some((evidence, exposure)))
    }

    fn received(observer: &str, event: ObservedEvent) -> Self {
        let source_id = event
            .references
            .iter()
            .find(|item| item.role == ReferenceRole::Actor)
            .map(|reference| reference.id.clone());
        let target_id = event
            .references
            .iter()
            .find(|item| item.role == ReferenceRole::Target)
            .map(|reference| reference.id.clone());
        Self {
            actor_id: observer.to_owned(),
            event_type: event.event_type,
            text: NativeText::Literal(event.text),
            modality: event.modality,
            references: event
                .references
                .into_iter()
                .map(|reference| EventReference {
                    id: reference.id,
                    label: reference.label,
                    role: reference.role,
                })
                .collect(),
            source_id,
            target_id,
            source_subject: event.source_subject,
            event_data: Some(event.data),
            speech: None,
            sound: event.heard,
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

struct ObservedEvent {
    event_type: String,
    text: JsText,
    modality: ExperienceModality,
    data: IndexMap<String, EventScalar>,
    references: Vec<ReceivedReference>,
    source_subject: Option<ObserverSubject>,
    heard: Option<PerceivedSound>,
}

pub(crate) struct RetainedPlayerEvent {
    pub id: String,
    pub time: f64,
    evidence: Evidence,
    rendered: JsText,
    source_body: Option<openlegend_simulation::experience::AwarenessSourceBody>,
    exposure: Option<EncounterExposure>,
    pub expires_at: Option<f64>,
}

impl RetainedPlayerEvent {
    pub(crate) fn awareness(
        id: String,
        time: f64,
        payload: &str,
        actor: &str,
    ) -> Result<Self, PlayerEventError> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct ArchivedScope {
            event_id: Option<String>,
            source_body: Option<openlegend_simulation::experience::AwarenessSourceBody>,
            exposure: Option<EncounterExposure>,
            expires_at: Option<f64>,
        }
        let archived: ArchivedScope = serde_json::from_str(payload)?;
        if archived
            .event_id
            .as_deref()
            .is_some_and(|stored| stored != id)
        {
            return Err(PlayerEventError::InvalidCapture);
        }
        let evidence = Evidence::persisted(payload, actor)?;
        let rendered = native_text(&evidence.text);
        Ok(Self {
            id,
            time,
            evidence,
            rendered,
            source_body: archived.source_body,
            exposure: archived.exposure,
            expires_at: archived.expires_at,
        })
    }

    pub(crate) fn temporal(
        id: String,
        time: f64,
        values: Vec<SensoryFacet>,
        actor: &str,
    ) -> Result<Self, PlayerEventError> {
        let (evidence, exposure) =
            Evidence::facets(values, actor)?.ok_or(PlayerEventError::InvalidCapture)?;
        let rendered = native_text(&evidence.text);
        Ok(Self {
            id,
            time,
            evidence,
            rendered,
            source_body: None,
            exposure,
            expires_at: None,
        })
    }

    pub(crate) fn text(&self) -> &JsText {
        &self.rendered
    }

    pub(crate) fn project(
        &self,
        policy: &PlayerEventPolicy,
        issuer: &PlayerReferences<'_>,
        roles: &openlegend_simulation::runtime::RuntimeRecordedEventRoles<'_>,
    ) -> Result<PublicEvent, PlayerEventError> {
        let evidence = &self.evidence;
        let actor = roles
            .project(
                evidence.source_id.as_deref(),
                evidence.target_id.as_deref(),
                evidence.source_subject.as_ref(),
                self.source_body.as_ref(),
                evidence
                    .speech
                    .as_ref()
                    .is_some_and(|speech| speech.addressee.is_some()),
            )
            .map_err(|_| PlayerEventError::InvalidCapture)?;
        project_row(
            &self.id,
            self.time,
            &actor,
            evidence,
            self.rendered.clone(),
            policy,
            issuer,
        )
    }
}

impl PlayerEventPolicy {
    /// Select installed kinds before touching stored account bodies. Fallback
    /// admission inverts the smaller predicate over configured kinds.
    pub(crate) fn history_kinds(&self, category: &str, show_all: bool) -> (Vec<&str>, bool) {
        let shown = |value: &Presentation| {
            (category == "all" || value.category == category)
                && (show_all || value.display_to_player == Some(true))
        };
        let include_fallback = shown(&self.presentation.fallback);
        let kinds = self
            .presentation
            .types
            .iter()
            .filter_map(|(kind, rule)| (shown(rule) != include_fallback).then_some(kind.as_str()))
            .collect();
        (kinds, !include_fallback)
    }
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct PerceivedReference {
    id: String,
    label: JsText,
    role: ReferenceRole,
    kind: &'static str,
    #[serde(flatten)]
    live: LiveReference,
}

#[derive(Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct LiveReference {
    #[serde(skip_serializing_if = "Option::is_none")]
    contact_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    communication_reference: Option<String>,
}

fn live_references(
    facts: &PlayerEventRoles,
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
                    .as_ref()
                    .map(|contact| issuer.contact(&contact.id, contact.life, &contact.lease_id))
                    .transpose()?
            },
            communication_reference: facts
                .source_communication_id
                .as_deref()
                .filter(|id| *id != evidence.actor_id && Some(*id) == evidence.source_id.as_deref())
                .map(|id| issuer.person(id))
                .transpose()?,
        },
        match facts.target_communication_id.as_deref() {
            Some(id) => LiveReference {
                communication_reference: Some(issuer.person(id)?),
                contact_reference: facts
                    .target_contact
                    .as_ref()
                    .map(|contact| issuer.contact(&contact.id, contact.life, &contact.lease_id))
                    .transpose()?,
            },
            None => LiveReference::default(),
        },
    ))
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpokenEvent {
    #[serde(flatten)]
    speech: PerceivedSpeech,
    speaker_reference: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    speaker_contact: Option<String>,
}

#[derive(PartialEq, Serialize)]
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
#[derive(PartialEq, Serialize)]
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

#[derive(PartialEq, Serialize)]
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
impl PublicEvent {
    pub(crate) fn id(&self) -> &str {
        &self.id
    }
}

#[derive(PartialEq, Serialize)]
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

#[derive(PartialEq, Serialize)]
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

impl SpeechReplyStatus {
    pub(crate) fn terminal(self) -> bool {
        matches!(
            self,
            Self::Completed | Self::Failed | Self::Cancelled | Self::Stale
        )
    }
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

/// Take the bounded journal/conversation union from one owned native read.
/// The caller retains that read through final disclosure. Only awareness still
/// stored in its canonical database form needs decoding.
pub fn prepare(
    read: &RuntimePlayerRead,
    policy: &PlayerEventPolicy,
    issuer: &PlayerReferences<'_>,
    budget: &ByteBudget,
) -> Result<PreparedPlayerEvents, PlayerEventError> {
    let input = read
        .events()
        .map_err(|_| PlayerEventError::InvalidCapture)?;
    let (world_id, actor_id, at) = input.scope();
    let perception: PlayerPerception<'_> = read
        .perception()
        .map_err(|_| PlayerEventError::InvalidCapture)?;
    if actor_id != perception.actor_id || world_id != perception.world_id || at != perception.at {
        return Err(PlayerEventError::InvalidCapture);
    }
    let records = input.accounts();
    let base = records
        .len()
        .checked_mul(2 * size_of::<PlayerEventAccount<'_>>())
        .and_then(|bytes| bytes.checked_add(4096))
        .ok_or(PlayerEventError::Capacity)?;
    // Bound growing output lists and their independently retained text,
    // references and escaped handles. Awareness decoding uses the same
    // allowance as its projection and only reads the selected record.
    let row = size_of::<Evidence>()
        + 2 * (size_of::<PublicEvent>() + size_of::<ConversationEvent>() + size_of::<String>());
    let reserved = input
        .accounts()
        .try_fold(base, |bytes, account| {
            let (id, _, _, _) = account.chronology();
            let body = account
                .selected_body_bytes()?
                .checked_add(id.len())?
                .checked_add(actor_id.len())?;
            bytes.checked_add(row)?.checked_add(body.checked_mul(24)?)
        })
        .ok_or(PlayerEventError::Capacity)?;
    let custody = budget.reserve(reserved)?;
    let mut accounts: Vec<_> = records.collect();
    accounts.sort_by_key(|account| std::cmp::Reverse(account.chronology().2));
    let mut prepared = PreparedPlayerEvents {
        journal: Vec::new(),
        conversation: Vec::new(),
        event_ids: Vec::new(),
        _reply_custody: None,
        _custody: custody,
    };
    for account in accounts {
        let (id, at, _, kind) = account.chronology();
        let body = account.body().ok_or(PlayerEventError::InvalidCapture)?;
        let evidence = Evidence::read(body, actor_id)?;
        if kind == "speech" && evidence.speech.is_none() && evidence.sound.is_none() {
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
                .push(conversation_row(id, at, &evidence, &text));
        }
        if journal {
            prepared.journal.push(project_row(
                id,
                at,
                account.roles(),
                &evidence,
                text,
                policy,
                issuer,
            )?);
        }
        prepared.event_ids.push(id.to_owned());
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
    id: &str,
    at: f64,
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
        id: id.to_owned(),
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
        time: at,
        reply: None,
    }
}

fn project_row(
    id: &str,
    at: f64,
    roles: &PlayerEventRoles,
    evidence: &Evidence,
    rendered: JsText,
    policy: &PlayerEventPolicy,
    issuer: &PlayerReferences<'_>,
) -> Result<PublicEvent, PlayerEventError> {
    let (actor, target) = live_references(roles, evidence, issuer)?;
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
        time: at,
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
