//! The autonomous wakeup cut reads the same resident personal records as
//! Source unseenExperiences. Cold absence is never promoted to full history.
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::mem::size_of;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct IntakeSelection {
    pub limit: usize,
    pub protected_importance: f64,
    pub preferred_importance: f64,
}
#[derive(Serialize)]
pub(crate) struct IntakeSource<'a> {
    pub kind: PersonalSourceKind,
    pub value: &'a RawValue,
}
pub(crate) struct UnseenIntake<'a> {
    pub records: Vec<IntakeSource<'a>>,
    pub max_sequence: u64,
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
    if !selection.protected_importance.is_finite() || !selection.preferred_importance.is_finite() {
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
                    size_of::<(&PersonalSourceRecord, u8)>() + size_of::<IntakeSource<'_>>(),
                )
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let privacy = state.actor(actor).map(|actor| &actor.privacy);
    let forgotten = |id: &str| privacy.is_some_and(|privacy| privacy.is_forgotten(id));
    let aware = collections[0];
    let awareness_through = aware
        .and_then(|collection| collection.records().last())
        .and_then(|record| record.header.sequence)
        .unwrap_or(0);
    let urgency = if let Some(weighed) = weighed {
        aware
            .into_iter()
            .flat_map(|c| c.records())
            .rev()
            .take_while(|record| record.header.sequence.unwrap_or(0) > weighed)
            .try_fold(0f64, |urgency, record| {
                #[derive(Deserialize)]
                struct Urgency {
                    #[serde(default)]
                    urgency: Option<f64>,
                }
                let value: Urgency = serde_json::from_str(record.payload())
                    .map_err(|_| ExperienceError::InvalidBody("intake urgency"))?;
                Ok::<_, ExperienceError>(urgency.max(value.urgency.unwrap_or(0.)))
            })?
    } else {
        0.
    };
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
                            && header.event_id.as_deref().is_some_and(|event| {
                                aware.into_iter().flat_map(|c| c.records()).any(|a| {
                                    !a.header.sensory && a.header.event_id.as_deref() == Some(event)
                                })
                            }))
                }
                PersonalSourceKind::Summary => !header
                    .summary_coverage
                    .iter()
                    .any(|id| privacy.is_some_and(|privacy| privacy.revoked(id))),
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
                || header.event_type.as_deref() == Some("speech")
                || header
                    .event_type
                    .as_ref()
                    .is_some_and(|kind| significant.contains(kind));
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
    let mut records = Vec::with_capacity(selected.len().min(selection.limit));
    for (record, _) in selected.into_iter().take(selection.limit) {
        records.push(IntakeSource {
            kind: record.header.reference.kind,
            value: serde_json::from_str(record.payload())
                .map_err(|_| ExperienceError::InvalidBody("intake source"))?,
        });
    }
    Ok(UnseenIntake {
        records,
        max_sequence,
        awareness_through,
        urgency,
        _storage: storage,
    })
}
