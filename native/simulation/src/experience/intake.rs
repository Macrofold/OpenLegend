//! The autonomous wakeup cut reads the same resident personal records as
//! Source unseenExperiences. Cold absence is never promoted to full history.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
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

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct IntakeSelection {
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
    pub interruptions: Vec<IntakeSource<'a>>,
    pub trigger_awareness: Vec<TriggerAwareness<'a>>,
    pub awareness_through: u64,
    pub urgency: f64,
    _storage: ByteReservation,
}
pub(crate) fn unseen_intake<'a>(
    state: &'a ExperienceState,
    actor: &str,
    after: u64,
    weighed: Option<u64>,
    selection: IntakeSelection,
    significant: &[String],
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
    let forgotten = |id: &str| privacy.is_some_and(|privacy| privacy.is_forgotten(id));
    let aware = collections[0];
    let aware_count = aware.map_or(0, |collection| collection.records().len());
    let _aware_storage = budget
        .reserve(
            crate::host::retained_size::tree_node_bound::<&str, ()>()
                .and_then(|n| n.checked_mul(aware_count))
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let aware_events = aware
        .into_iter()
        .flat_map(|collection| collection.records())
        .filter(|record| !record.header.sensory)
        .filter_map(|record| record.header.event_id.as_deref())
        .collect::<std::collections::BTreeSet<_>>();
    let last = aware
        .and_then(|collection| collection.records().last())
        .and_then(|record| record.header.sequence)
        .unwrap_or(0);
    // Verification never consumes urgency. Refresh starts at the current tail,
    // and a later retirement cannot move its already-weighed watermark backward.
    let mut awareness_through = weighed.unwrap_or(last);
    let mut urgency = 0f64;
    if let Some(since) = weighed.filter(|since| last > *since) {
        for record in aware
            .into_iter()
            .flat_map(|collection| collection.records())
            .rev()
            .take_while(|record| record.header.sequence.unwrap_or(0) > since)
        {
            urgency = urgency.max(record.header.urgency.unwrap_or(0.));
            awareness_through = awareness_through.max(record.header.sequence.unwrap_or(0));
        }
    }
    let mut selected = Vec::with_capacity(count);
    let mut max_sequence = after;
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
                            && header
                                .event_id
                                .as_deref()
                                .is_some_and(|event| aware_events.contains(event)))
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
            max_sequence = max_sequence.max(sequence);
            if sequence <= after {
                continue;
            }
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
    selected.sort_by(|(a, ar), (b, br)| {
        br.cmp(ar).then_with(|| {
            b.header
                .sequence
                .unwrap_or(0)
                .cmp(&a.header.sequence.unwrap_or(0))
        })
    });
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
    let mut trigger_awareness = Vec::with_capacity(selected_ids.len());
    for id in &selected_ids {
        // This is Source responseTrigger's resident-array lookup, including an
        // older account preceding the watermark. Missing residency is its
        // explicit presentation fallback, never a cold/global absence proof.
        let resident = aware.and_then(|collection| {
            collection
                .lookup
                .get(*id)
                .and_then(|position| collection.by_ordinal.get(position))
        });
        let Some(record) = resident else {
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
            value: serde_json::from_str(record.payload())
                .map_err(|_| ExperienceError::InvalidBody("intake source"))?,
        });
    }
    Ok(UnseenIntake {
        records,
        max_sequence,
        interruptions,
        trigger_awareness,
        awareness_through,
        urgency,
        _storage: storage,
    })
}
