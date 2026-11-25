//! The autonomous wakeup cut reads the same resident personal records as
//! Source unseenExperiences. Cold absence is never promoted to full history.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::TriggerKind;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::mem::size_of;

impl ExperienceState {
    pub(crate) fn resident_maintenance_pressure(&self, awareness: u64, memories: u64) -> bool {
        self.actors.values().any(|actor| {
            [
                (PersonalSourceKind::Awareness, awareness),
                (PersonalSourceKind::Memory, memories),
            ]
            .into_iter()
            .any(|(kind, limit)| {
                actor
                    .sources
                    .get(&kind)
                    .is_some_and(|collection| collection.records().len() as u64 >= limit)
            })
        })
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct IntakeSelection {
    pub limit: usize,
    pub protected_importance: f64,
    pub preferred_importance: f64,
    pub interruption_importance: f64,
    pub interruption_urgency: f64,
}
#[derive(Serialize)]
pub(crate) struct IntakeSource<'a> {
    pub kind: PersonalSourceKind,
    pub value: &'a RawValue,
    #[serde(skip)]
    pub event_id: Option<&'a str>,
    #[serde(skip)]
    pub addressed: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TriggerAwareness<'a> {
    pub event_id: &'a str,
    pub at: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    event_type: Option<&'a str>,
    text: &'a RawValue,
    modality: &'a RawValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    trigger_kind: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    speech: Option<&'a RawValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
}
pub(crate) struct UnseenIntake<'a> {
    pub records: Vec<IntakeSource<'a>>,
    pub max_sequence: u64,
    pub first_unserved: Option<u64>,
    pub interruptions: Vec<IntakeSource<'a>>,
    pub trigger_awareness: Vec<TriggerAwareness<'a>>,
    _storage: ByteReservation,
}

#[derive(Clone, Copy)]
pub(crate) struct PersonalChoices<'a> {
    pub life: u64,
    pub preferred_importance: f64,
    pub significant: &'a [String],
    pub speech_event: &'a str,
    pub speech_result: Option<&'a str>,
}
impl PersonalChoices<'_> {
    /// A record is eligible on its owner's received role or consequence.
    /// Importance alone cannot make a spectator an involved party.
    pub(crate) fn matches(self, header: &PersonalSourceHeader) -> bool {
        let receipt = header.source_receipt.as_ref().or_else(|| {
            header
                .retention
                .as_ref()
                .and_then(|retention| retention.receipt.as_ref())
        });
        if header.sensory || receipt.is_none_or(|receipt| receipt.physical_life != self.life) {
            return false;
        }
        let event_type = header.event_type.as_deref();
        let own_speech = event_type
            .is_some_and(|kind| kind == self.speech_event || self.speech_result == Some(kind));
        match header.reference.kind {
            PersonalSourceKind::Awareness => match header.receiver_role {
                Some(TriggerKind::AddressedSpeech) => true,
                Some(TriggerKind::OverheardSpeech) => header.speech_choice,
                Some(TriggerKind::DirectedAction) => {
                    header.evidence_target_id.as_deref() == Some(header.actor_id.as_str())
                }
                Some(TriggerKind::SelfEvent) => {
                    !own_speech
                        && (header.importance >= self.preferred_importance
                            || event_type.is_some_and(|kind| {
                                self.significant.iter().any(|event| event == kind)
                            }))
                }
                Some(TriggerKind::ObservedEvent) => header.witness_help,
                None => false,
            },
            PersonalSourceKind::Memory => {
                // A result acquired by its activity owner can require a choice
                // even when no separate awareness event was created.
                !own_speech
                    && header.record_kind.as_deref() == Some("episode")
                    && header.source.as_deref() == Some("internal")
                    && header.activity_id.is_some()
            }
            PersonalSourceKind::Summary => false,
        }
    }
}

pub(crate) fn intake_urgency(
    state: &ExperienceState,
    actor: &str,
    weighed: Option<u64>,
    personal: Option<PersonalChoices<'_>>,
) -> Result<(u64, f64), ExperienceError> {
    let awareness = state.optional_collection(actor, PersonalSourceKind::Awareness)?;
    let last = awareness
        .and_then(|collection| collection.records().last())
        .and_then(|record| record.header.sequence)
        .unwrap_or(0);
    // Only new supported causes count toward priority. Verification does not
    // consume urgency, and retirement cannot move the weighed prefix backward.
    let mut through = weighed.unwrap_or(last);
    let mut urgency = 0f64;
    if let Some(since) = weighed.filter(|since| last > *since) {
        for record in awareness
            .into_iter()
            .flat_map(|collection| collection.records())
            .rev()
            .take_while(|record| record.header.sequence.unwrap_or(0) > since)
        {
            if personal.is_none_or(|choices| choices.matches(&record.header)) {
                urgency = urgency.max(record.header.urgency.unwrap_or(0.));
            }
            through = through.max(record.header.sequence.unwrap_or(0));
        }
    }
    Ok((through, urgency))
}

pub(crate) fn unseen_intake<'a>(
    state: &'a ExperienceState,
    actor: &str,
    after: u64,
    selection: IntakeSelection,
    significant: &[String],
    schedule: Option<(u64, PersonalChoices<'_>)>,
    budget: &ByteBudget,
) -> Result<UnseenIntake<'a>, ExperienceError> {
    if !selection.protected_importance.is_finite()
        || !selection.preferred_importance.is_finite()
        || !selection.interruption_importance.is_finite()
        || !selection.interruption_urgency.is_finite()
    {
        return Err(ExperienceError::InvalidBody("intake importance"));
    }
    let kinds = [
        PersonalSourceKind::Awareness,
        PersonalSourceKind::Memory,
        PersonalSourceKind::Summary,
    ];
    let collections = [
        state.optional_collection(actor, kinds[0])?,
        state.optional_collection(actor, kinds[1])?,
        state.optional_collection(actor, kinds[2])?,
    ];
    let count = collections
        .iter()
        .flatten()
        .try_fold(0usize, |n, c| n.checked_add(c.records().len()))
        .ok_or(ExperienceError::Capacity)?;
    let storage = budget
        .reserve(
            count
                .checked_mul(
                    2 * size_of::<(&PersonalSourceRecord, u8)>()
                        + 2 * size_of::<IntakeSource<'_>>()
                        + size_of::<TriggerAwareness<'_>>(),
                )
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let privacy = state.actor(actor).map(|actor| &actor.privacy);
    let forgotten = |id: &str| {
        privacy.is_some_and(|privacy| {
            privacy.is_forgotten(id)
                || (schedule.is_some()
                    && privacy
                        .corrections()
                        .get(id)
                        .is_some_and(|value| !value.is_empty()))
        })
    };
    let aware = collections[0];
    let aware_count = aware.map_or(0, |collection| collection.records().len());
    let resident_awareness = |id: &str| aware.and_then(|collection| collection.resident_record(id));
    let duplicate_awareness = |id: &str| {
        resident_awareness(id).is_some_and(|record| {
            let header = &record.header;
            !header.sensory
                && schedule.is_none_or(|(_, choices)| {
                    choices.matches(header) && !forgotten(&header.reference.id)
                })
        })
    };
    let mut selected = Vec::with_capacity(count);
    let mut max_sequence = after;
    let mut first_unserved = None;
    for (index, collection) in collections.iter().enumerate() {
        for record in collection
            .into_iter()
            .flat_map(|collection| collection.records())
        {
            let header = &record.header;
            let visible = match kinds[index] {
                PersonalSourceKind::Awareness => {
                    !header.sensory && !forgotten(header.event_id.as_deref().unwrap_or(""))
                }
                PersonalSourceKind::Memory => {
                    !forgotten(&header.reference.id)
                        && !forgotten(header.event_id.as_deref().unwrap_or(""))
                        && (header.record_kind.as_deref() == Some("commitment")
                            || (header.record_kind.as_deref() == Some("episode")
                                && header.source.as_deref() != Some("inferred")))
                        && !(header.record_kind.as_deref() == Some("episode")
                            && header.event_id.as_deref().is_some_and(duplicate_awareness))
                }
                PersonalSourceKind::Summary => !header.summary_coverage.iter().any(|id| {
                    privacy.is_some_and(|privacy| {
                        privacy.is_forgotten(id)
                            || privacy
                                .corrections()
                                .get(id)
                                .is_some_and(|value| !value.is_empty())
                    })
                }),
            };
            if !visible {
                continue;
            }
            let sequence = header.sequence.unwrap_or(0);
            if sequence <= after {
                continue;
            }
            if let Some((through, choices)) = schedule {
                if !choices.matches(header) {
                    continue;
                }
                if sequence > through {
                    first_unserved =
                        Some(first_unserved.map_or(sequence, |first: u64| first.min(sequence)));
                    continue;
                }
                selected.push((record.as_ref(), 0));
                continue;
            }
            max_sequence = max_sequence.max(sequence);
            let preferred = header.importance >= selection.preferred_importance
                || (kinds[index] != PersonalSourceKind::Summary
                    && (header.event_type.as_deref() == Some("speech")
                        || header
                            .event_type
                            .as_ref()
                            .is_some_and(|kind| significant.contains(kind))));
            let rank = if header.importance >= selection.protected_importance {
                2
            } else {
                u8::from(preferred)
            };
            selected.push((record.as_ref(), rank));
        }
    }
    if schedule.is_some() {
        selected.sort_by_key(|(record, _)| record.header.sequence);
        if let Some((record, _)) = selected.get(selection.limit) {
            first_unserved = record.header.sequence;
        }
        // Return only complete sequence groups. If an entire group cannot fit,
        // its sequence remains unacknowledged and the caller can report capacity.
        if let Some(first) = first_unserved {
            selected.truncate(
                selected.partition_point(|(record, _)| record.header.sequence < Some(first)),
            );
        }
        if let Some((last, _)) = selected.last() {
            max_sequence = last.header.sequence.unwrap_or(after);
        }
    } else {
        selected.sort_by(|(a, ar), (b, br)| {
            br.cmp(ar)
                .then_with(|| b.header.sequence.cmp(&a.header.sequence))
        });
    }
    let _selected_ids = budget
        .reserve(
            crate::host::retained_size::tree_node_bound::<&str, ()>()
                .and_then(|n| n.checked_mul(selected.len().min(selection.limit)))
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let selected_ids = selected
        .iter()
        .take(selection.limit)
        .map(|(record, _)| {
            record
                .header
                .event_id
                .as_deref()
                .unwrap_or(&record.header.reference.id)
        })
        .collect::<std::collections::BTreeSet<_>>();
    let mut trigger_awareness = Vec::with_capacity(if schedule.is_some() {
        0
    } else {
        selected_ids.len()
    });
    for id in &selected_ids {
        if schedule.is_some() {
            break;
        }
        // This is Source responseTrigger's resident-array lookup, including an
        // older account preceding the watermark. Missing residency is its
        // explicit presentation fallback, never a cold/global absence proof.
        let Some(record) = resident_awareness(id) else {
            continue;
        };
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Fields<'a> {
            #[serde(borrow)]
            text: &'a RawValue,
            #[serde(borrow)]
            modality: &'a RawValue,
            #[serde(borrow)]
            trigger_kind: Option<&'a RawValue>,
            #[serde(borrow)]
            content: Option<&'a RawValue>,
            #[serde(borrow)]
            speech: Option<&'a RawValue>,
        }
        let fields: Fields = serde_json::from_str(record.payload())
            .map_err(|_| ExperienceError::InvalidBody("intake trigger awareness"))?;
        trigger_awareness.push(TriggerAwareness {
            event_id: record
                .header
                .event_id
                .as_deref()
                .ok_or(ExperienceError::InvalidBody("intake trigger identity"))?,
            at: record.header.at,
            event_type: record.header.event_type.as_deref(),
            text: fields.text,
            modality: fields.modality,
            trigger_kind: fields.trigger_kind,
            content: fields.content,
            speech: fields.speech,
            target_id: record.header.evidence_target_id.as_deref(),
        });
    }
    let mut interruptions = Vec::with_capacity(aware_count);
    for record in aware
        .into_iter()
        .flat_map(|c| c.records())
        .rev()
        .take_while(|record| record.header.sequence.unwrap_or(0) > after)
    {
        if record.header.importance < selection.interruption_importance
            || !record
                .header
                .event_id
                .as_deref()
                .is_some_and(|id| selected_ids.contains(id))
        {
            continue;
        }
        if record.header.urgency.unwrap_or(0.) < selection.interruption_urgency {
            continue;
        }
        interruptions.push(IntakeSource {
            kind: PersonalSourceKind::Awareness,
            event_id: record.header.event_id.as_deref(),
            addressed: false,
            value: serde_json::from_str(record.payload())
                .map_err(|_| ExperienceError::InvalidBody("intake interruption"))?,
        });
    }
    interruptions.reverse();
    let mut records = Vec::with_capacity(selected.len().min(selection.limit));
    for (record, _) in selected.into_iter().take(selection.limit) {
        records.push(IntakeSource {
            kind: record.header.reference.kind,
            event_id: record.header.event_id.as_deref(),
            addressed: record.header.receiver_role == Some(TriggerKind::AddressedSpeech),
            value: serde_json::from_str(record.payload())
                .map_err(|_| ExperienceError::InvalidBody("intake source"))?,
        });
    }
    Ok(UnseenIntake {
        records,
        max_sequence,
        first_unserved,
        interruptions,
        trigger_awareness,
        _storage: storage,
    })
}
