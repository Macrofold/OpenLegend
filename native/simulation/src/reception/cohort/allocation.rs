//! Allocation of correspondence metadata only. Received bodies remain borrowed.
use super::*;
use crate::encoding::{JsonAllocationShape, json_record_len};
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::received::{ReceivedValueFragment, TemporalCurrentGroupInput};
use std::mem::size_of;

fn sum(values: impl IntoIterator<Item = usize>) -> Result<usize, ReceivedError> {
    values
        .into_iter()
        .try_fold(0usize, usize::checked_add)
        .ok_or_else(capacity)
}
fn times(n: usize, bytes: usize) -> Result<usize, ReceivedError> {
    n.checked_mul(bytes).ok_or_else(capacity)
}
// Bounds include the pinned Vec capacity, with a four
// element minimum. Each remaining growable collection separately funds its
// old/new backing overlap. JSON byte growth includes both allocations.
fn vector<T>(n: usize) -> Result<usize, ReceivedError> {
    if n == 0 {
        return Ok(0);
    }
    times(
        n.max(4).checked_next_power_of_two().ok_or_else(capacity)?,
        size_of::<T>(),
    )
}
fn encoded(n: usize) -> Result<usize, ReceivedError> {
    Ok(times(n, 3)?.max(8))
}
fn subject_bytes(subject: &ObserverSubject) -> Result<usize, ReceivedError> {
    encoded(
        match subject {
            ObserverSubject::Entity { entity_id } => json_record_len(&("entity", entity_id)),
            ObserverSubject::Individual { individual_id } => {
                json_record_len(&("individual", individual_id))
            }
        }
        .map_err(|_| invalid())?,
    )
}
fn track_bytes(group: &CurrentReceivedGroup) -> Result<usize, ReceivedError> {
    let grant = &group.received.grant;
    encoded(
        json_record_len(&(
            &grant.exposure,
            &grant.channel.id,
            grant.channel.version,
            &grant.channel.digest,
        ))
        .map_err(|_| invalid())?,
    )
}
fn candidate(owner: &PerceptionEvidenceOwner, id: &str, extra: &[&str]) -> bool {
    extra.contains(&id)
        || owner.attention.as_ref().is_some_and(|a| {
            a.entries.iter().any(|e| e.source_id == id)
                || a.annotations.values().any(|a| a.source_id == id)
        })
}
// association_evidence_status clones only this association, decodes support
// keys one at a time, and keeps its source vector / deduplicated ID set. Charge
// the two simultaneously live Value graphs (key + selected source), their
// unescape scratch, typed source copies, and generated personal-fact aliases.
// No received body/detail value participates in this correspondence read.
fn association_workspace(value: &SensoryFacet) -> Result<usize, ReceivedError> {
    let SensoryFacet::Association {
        learning_support, ..
    } = value
    else {
        return Ok(0);
    };
    let keys = learning_support.as_deref().unwrap_or(&[]);
    let count = keys.len();
    let mut strings = 0usize;
    let mut decoding = 0usize;
    for key in keys {
        strings = sum([strings, times(sum([key.len(), 48])?, 2)?])?;
        if key.trim_start().starts_with(['{', '[', '"']) {
            // Invalid support strings are ignored by the meaning owner; parser
            // failure must still be funded without making them a new refusal.
            let shape = JsonAllocationShape::read(key).unwrap_or(JsonAllocationShape {
                array_items: key.len(),
                members: key.len(),
                strings: key.len(),
                containers: key.len(),
            });
            let graph = sum([
                times(key.len(), 3)?, // decoded strings and growing unescape scratch
                times(shape.array_items, 4 * size_of::<serde_json::Value>())?,
                times(
                    shape.members,
                    map_storage::<String, serde_json::Value>(1).ok_or_else(capacity)?,
                )?,
            ])?;
            decoding = decoding.max(sum([
                times(graph, 2)?,
                times(key.len(), 2)?,
                2 * size_of::<EvidenceSource>(),
            ])?);
        }
    }
    sum([
        value.heap_bytes().ok_or_else(capacity)?,
        vector::<(EvidenceSource, String, usize)>(count)?,
        map_storage::<String, ()>(times(count, 2)?).ok_or_else(capacity)?,
        vector::<String>(times(count, 2)?)?,
        strings,
        decoding,
    ])
}

pub(super) fn reserve(
    reception: &ReceptionState,
    owner: &PerceptionEvidenceOwner,
    observer: &str,
    extra: &[&str],
    before: Option<&CurrentCohort>,
    budget: &ByteBudget,
) -> Result<ByteReservation, ReceivedError> {
    let attention = owner.attention.as_ref();
    let entries = attention.map_or(&[][..], |a| a.entries.as_slice());
    let annotations = attention.map_or(0, |a| a.annotations.len());
    let candidates = sum([entries.len(), annotations, extra.len()])?;
    let mut id_strings = sum(extra.iter().map(|id| id.len()))?;
    for e in entries {
        id_strings = sum([id_strings, e.source_id.len()])?;
    }
    if let Some(a) = attention {
        for v in a.annotations.values() {
            id_strings = sum([id_strings, v.source_id.len()])?;
        }
    }
    let mut count = 0usize;
    let mut payload = 0usize;
    let mut subject_keys = 0usize;
    let mut selected_payload = 0usize;
    let mut borrowed = 0usize;
    let mut association = 0usize;
    let mut partitions = 0usize;
    let mut reconcile_key = 0usize;
    let mut before_keys = 0usize;
    if let Some(before) = before {
        for id in before.tracks.keys() {
            before_keys = sum([before_keys, id.len()])?;
        }
    }
    for (id, contact) in &owner.current {
        let selected = candidate(owner, id, extra);
        if selected || before.is_some_and(|b| b.tracks.contains_key(id)) {
            for group in &contact.content.groups {
                partitions = sum([partitions, group.metadata.len()])?;
                reconcile_key = reconcile_key.max(track_bytes(group)?);
            }
        }
        if !selected {
            continue;
        }
        borrowed = borrowed.max(sum([
            times(
                vector::<(&DefinitionPin, &str, usize)>(contact.content.groups.len())?,
                2,
            )?,
            times(
                contact.content.groups.len(),
                size_of::<CurrentNativeFacet<'_>>(),
            )?,
        ])?);
        let mut associated_heap = 0;
        let mut associated_key = 0;
        for group in &contact.content.groups {
            if let Some(field) = group.received.fields.get("association")
                && field.value.reception.is_none()
                && let Some(ReceivedValueFragment::Sensory(
                    value @ SensoryFacet::Association { subject, .. },
                )) = reception
                    .received_values
                    .as_ref()
                    .value_at(&field.value.reference)
            {
                associated_heap = associated_heap.max(subject.heap_bytes().ok_or_else(capacity)?);
                associated_key = associated_key.max(subject_bytes(subject)?);
                association = association.max(sum([
                    association_workspace(value)?,
                    encoded(sum([48, times(group.received.grant.original.len(), 6)?])?)?,
                ])?);
            }
        }
        for group in &contact.content.groups {
            let mut field_heap = None;
            let mut local_heap = 0usize;
            let mut local_key = 0usize;
            for kind in ["body", "contact", "detected"] {
                if let Some(field) = group.received.fields.get(kind) {
                    field_heap = Some(field_heap.unwrap_or(0).max(field.id.len()));
                    local_heap =
                        local_heap.max(field.local_subject.heap_bytes().ok_or_else(capacity)?);
                    if let Some(subject) = &field.local_subject {
                        local_key = local_key.max(subject_bytes(subject)?);
                    }
                }
            }
            let Some(field_heap) = field_heap else {
                continue;
            };
            count = sum([count, 1])?;
            let grant = &group.received.grant;
            let track = track_bytes(group)?;
            let common = sum([
                grant.subject_id.len(),
                grant.exposure.len(),
                grant.channel.heap_bytes().ok_or_else(capacity)?,
            ])?;
            payload = sum([
                payload,
                common,
                field_heap,
                track,
                local_heap,
                local_heap.max(associated_heap),
            ])?;
            selected_payload = sum([selected_payload, common, track])?;
            subject_keys = sum([subject_keys, local_key, local_key.max(associated_key)])?;
        }
    }
    let subjects = times(count, 2)?;
    let union = sum([before.map_or(0, |b| b.tracks.len()), count])?;
    // Candidate IDs can grow for explicit extra sources; inner track maps
    // grow as channels arrive. Their two backing copies coexist during resize.
    let bytes = sum([
        size_of::<CurrentCohort>() + 2 * size_of::<usize>(),
        observer.len(),
        attention
            .map_or(Some(0), |a| a.entries.heap_bytes())
            .ok_or_else(capacity)?,
        times(
            map_storage::<String, ()>(candidates).ok_or_else(capacity)?,
            2,
        )?,
        id_strings,
        // Stable property-order sorting owns its borrowed vector and sort scratch.
        times(
            annotations,
            2 * size_of::<(&String, &crate::attention::AttentionAnnotation)>(),
        )?,
        vector::<TrackDescriptor>(count)?,
        payload,
        borrowed,
        association,
        map_storage::<String, IndexMap<String, SelectedTrack>>(count).ok_or_else(capacity)?,
        times(
            count,
            times(
                map_storage::<String, SelectedTrack>(1).ok_or_else(capacity)?,
                2,
            )?,
        )?,
        times(selected_payload, 2)?, // retained map and an in-flight replacement copy
        map_storage::<String, ()>(subjects).ok_or_else(capacity)?,
        times(subject_keys, 2)?,
        // Reconciliation borrows body/partition inputs. Its only extra owned
        // data are the before/after source union, generated keys and this Vec.
        map_storage::<String, ()>(union).ok_or_else(capacity)?,
        before_keys,
        selected_payload,
        reconcile_key,
        vector::<TemporalCurrentGroupInput<'_>>(partitions)?,
    ])?;
    budget.reserve(bytes).map_err(|_| capacity())
}

pub(super) fn retained(cohort: &CurrentCohort) -> Result<usize, ReceivedError> {
    sum([
        size_of::<CurrentCohort>() + 2 * size_of::<usize>(),
        cohort.observer.actor_id.len(),
        cohort.entries.heap_bytes().ok_or_else(capacity)?,
        cohort.tracks.heap_bytes().ok_or_else(capacity)?,
        cohort.subjects.heap_bytes().ok_or_else(capacity)?,
        cohort.descriptors.heap_bytes().ok_or_else(capacity)?,
    ])
}
