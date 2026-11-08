//! Competition between actually received tracks. Selection changes neither the
//! physical world nor historical evidence; the receiver closes those duties.

use super::*;
use crate::attention::*;
use crate::encoding::json_record;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::ReceivedError;
use crate::simulation::{InstalledWorld, PhysicalState};
use indexmap::IndexSet;
use std::mem::size_of;

mod candidates;
mod relations;
mod selection;
mod withdrawal;
use candidates::{AttentionCandidate, build_candidates, current_point};
pub(crate) use relations::evaluate_attention_relations;
pub(crate) use withdrawal::prune_withdrawn_attention;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid current attention opportunity.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current attention exceeds native byte allowance.")
}

#[derive(Default)]
pub(crate) struct AttentionUpdate<'a> {
    pub changed_source_ids: Option<&'a [String]>,
    pub geometry_source_ids: Option<&'a [String]>,
    pub urgency: Option<&'a IndexMap<String, f64>>,
    pub proofs: Option<&'a IndexMap<String, ObservationFactKey>>,
    pub direct_subjects: Option<&'a [String]>,
}
pub(crate) struct AttentionSelection {
    pub before: Vec<String>,
    pub after: Vec<String>,
    pub subjects: IndexMap<String, ObserverSubject>,
    /// The candidate's real receiver invalidates its measurement preparation
    /// before making another capture; callers cannot turn this into a receipt.
    pub measurement_changed: bool,
}
fn policy_key(policy: &AttentionPolicy, capacity: Option<f64>) -> Result<String, ReceivedError> {
    json_record(&(
        &policy.id,
        policy.version,
        capacity,
        policy.maximum_capacity,
        policy.maximum_score,
        policy.ongoing_share,
        policy.stability_seconds,
        policy.switch_margin,
        policy.familiarity_bonus,
        policy.displacement_metres_per_point,
        policy.maximum_motion_cue,
        policy.new_description_cue,
        policy.urgent_cue,
        &policy.relation,
    ))
    .map_err(|_| invalid())
}
fn initial_state(policy: &AttentionPolicy) -> Result<AttentionState, ReceivedError> {
    Ok(AttentionState {
        policy: policy_key(policy, None)?,
        next_order: 0,
        annotations: IndexMap::new(),
        entries: Vec::new(),
        explicit: Vec::new(),
        latches: IndexMap::new(),
        next_relation_at: 0.0,
        relation_cursor: 0,
        discovery_cursor: -1,
        relation_revision: 0,
        relation_dirty: IndexMap::new(),
        relation_scans: IndexMap::new(),
    })
}
fn target<'a>(physical: &'a PhysicalState, observer: &str) -> Option<&'a str> {
    physical
        .entities
        .get(observer)
        .and_then(|e| e.actor.as_ref())
        .and_then(|a| a.action.as_ref())
        .and_then(|a| a.target_id.as_deref())
}
fn ordered_annotations(state: &AttentionState) -> Vec<(&String, &AttentionAnnotation)> {
    let mut entries: Vec<_> = state.annotations.iter().collect();
    entries.sort_by(|(a, _), (b, _)| crate::encoding::js_property_cmp(a, b));
    entries
}
fn relation_keys(state: &AttentionState, target: Option<&str>, now: f64) -> IndexSet<String> {
    let mut keys = IndexSet::new();
    keys.insert(SELF_RELATION_KEY.to_owned());
    for entry in &state.entries {
        keys.insert(entry.key.clone());
    }
    for (key, value) in ordered_annotations(state) {
        if Some(value.source_id.as_str()) == target
            || value.direct && value.direct_through.unwrap_or(f64::INFINITY) > now
        {
            keys.insert(key.clone());
        }
    }
    keys
}
fn relation_key(key: &str, family: AttentionRelationFamily) -> Result<String, ReceivedError> {
    json_record(&(key, family)).map_err(|_| invalid())
}
fn mark_relations(
    state: &mut AttentionState,
    target: Option<&str>,
    now: f64,
    families: &[AttentionRelationFamily],
    anchors: Option<&IndexSet<String>>,
) -> Result<(), ReceivedError> {
    state.relation_revision = state
        .relation_revision
        .checked_add(1)
        .filter(|v| *v <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    for key in relation_keys(state, target, now) {
        if anchors.is_none_or(|anchors| anchors.contains(&key)) {
            for family in families {
                state
                    .relation_dirty
                    .insert(relation_key(&key, *family)?, state.relation_revision);
            }
        }
    }
    Ok(())
}
fn lost_witness(state: &mut AttentionState, key: &str) {
    let Some(track) = state
        .annotations
        .get(key)
        .map(|v| v.exposure.track.as_str())
    else {
        return;
    };
    for latch in state.latches.values_mut() {
        if latch.witness_id.as_deref() == Some(track) {
            latch.clear_since = None;
        }
    }
}
fn owner<'a>(state: &'a ReceptionState, observer: &str) -> Option<&'a PerceptionEvidenceOwner> {
    state
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
}

/// Recomputing the bounded received candidate catalogue is intentionally the
/// first implementation. It preserves the source competition, discovery and
/// relation cursors without retaining a second writable attention authority.
pub(crate) fn update_attention(
    physical: &PhysicalState,
    reception: &mut ReceptionState,
    installed: &InstalledWorld,
    experience: &crate::experience::ExperienceState,
    journal: &mut CurrentJournal,
    observer: &str,
    update: AttentionUpdate<'_>,
) -> Result<AttentionSelection, ReceivedError> {
    let Some(entity) = physical
        .entities
        .get(observer)
        .filter(|e| e.actor.is_some())
    else {
        return Ok(AttentionSelection {
            before: vec![],
            after: vec![],
            subjects: IndexMap::new(),
            measurement_changed: false,
        });
    };
    let Some(current) = owner(reception, observer) else {
        return Ok(AttentionSelection {
            before: vec![],
            after: vec![],
            subjects: IndexMap::new(),
            measurement_changed: false,
        });
    };
    let policy = installed.attention.value();
    let now = physical.header.sim_time;
    let work_target = target(physical, observer);
    // Reserve copies, ranking/grouping containers and the new saved state before
    // materializing any of them. Immutable received bodies remain shared.
    let count = current
        .current
        .values()
        .try_fold(
            current
                .attention
                .as_ref()
                .map_or(0, |s| s.annotations.len()),
            |n, contact| n.checked_add(contact.content.groups.len()),
        )
        .ok_or_else(capacity)?;
    let state_bytes = current.attention.heap_bytes().ok_or_else(capacity)?;
    // A fresh owner has no prior attention allocation. The complete immutable
    // policy bounds the smaller policy-key tuple and its transient encoding.
    let policy_bytes = crate::encoding::json_record_len(policy).map_err(|_| invalid())?;
    let current_bytes = current
        .current
        .iter()
        .try_fold(0usize, |n, (id, contact)| {
            // New bindings can appear in the changed-source set, annotation, two
            // indexes and output keys. JSON identities may escape each UTF-8 byte
            // to six bytes. The input's owned string capacities bound these copies;
            // descriptive encodings are reserved separately at their real owner.
            let groups = contact.content.groups.iter().try_fold(0usize, |n, group| {
                heap_sum([
                    n,
                    group.received.heap_bytes()?.checked_mul(8)?,
                    size_of::<CurrentReceivedContent>().checked_mul(2)?,
                ])
            })?;
            heap_sum([n, id.len().checked_mul(12)?, groups])
        })
        .ok_or_else(capacity)?;
    let scratch = heap_sum([
        policy_bytes.checked_mul(2).ok_or_else(capacity)?,
        2 * size_of::<AttentionState>(),
        state_bytes.checked_mul(6).ok_or_else(capacity)?,
        current_bytes,
        count
            .checked_mul(12 * size_of::<AttentionCandidate>())
            .ok_or_else(capacity)?,
        map_storage::<String, AttentionCandidate>(count.checked_mul(2).ok_or_else(capacity)?)
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    journal.reserve_growth(scratch)?;
    let mut state = current
        .attention
        .clone()
        .map(Ok)
        .unwrap_or_else(|| initial_state(policy))?;
    let previous_anchors = relation_keys(&state, work_target, now);
    let entries_before = state.entries.clone();
    let before = entries_before.iter().map(|v| v.source_id.clone()).collect();
    let capacity_value = installed
        .account_law()
        .attention_capacity(physical, installed, entity)?;
    if !capacity_value.is_finite()
        || capacity_value.fract() != 0.0
        || capacity_value < 1.0
        || capacity_value > policy.maximum_capacity
    {
        return Err(invalid());
    }
    let capacity_value = capacity_value as usize;
    let next_policy = policy_key(policy, Some(capacity_value as f64))?;
    let policy_changed = state.policy != next_policy;
    state.policy = next_policy;
    let mut by_source: IndexMap<String, Vec<String>> = IndexMap::new();
    let expiry_due = state.annotations.values().any(|value| {
        value.urgency_through.unwrap_or(f64::INFINITY) <= now
            || value.direct_through.unwrap_or(f64::INFINITY) <= now
    });
    for (key, value) in ordered_annotations(&state) {
        by_source
            .entry(value.source_id.clone())
            .or_default()
            .push(key.clone());
    }
    let mut changed = IndexSet::new();
    if let Some(ids) = update.changed_source_ids.filter(|_| !policy_changed) {
        changed.extend(ids.iter().cloned());
        if let Some(urgency) = update.urgency {
            let mut ids: Vec<_> = urgency.keys().collect();
            ids.sort_by(|a, b| crate::encoding::js_property_cmp(a, b));
            changed.extend(ids.into_iter().cloned());
        }
        if let Some(direct) = update.direct_subjects {
            changed.extend(direct.iter().cloned());
        }
        for value in state.annotations.values() {
            if value.urgency_through.unwrap_or(f64::INFINITY) <= now
                || value.direct_through.unwrap_or(f64::INFINITY) <= now
            {
                changed.insert(value.source_id.clone());
            }
        }
    } else {
        let mut ids: Vec<_> = current.current.keys().collect();
        ids.sort_by(|a, b| crate::encoding::js_string_cmp(a, b));
        for id in ids {
            if !received_attention_sources(current, id)?.is_empty() {
                changed.insert(id.clone());
            }
        }
        changed.extend(by_source.keys().cloned());
    }
    let geometry: IndexSet<_> = update
        .geometry_source_ids
        .map(|ids| ids.iter().cloned().collect())
        .unwrap_or_else(|| changed.clone());
    let mut geometry_changed = false;
    let mut changed_geometry_keys = IndexSet::new();
    let scope = CurrentBodyReadScope::prepare(
        reception,
        &physical.entities,
        installed,
        experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer,
    )?;
    for source_id in &changed {
        let prior = by_source.get(source_id).map(Vec::as_slice).unwrap_or(&[]);
        let mut live = IndexSet::new();
        for body in received_attention_sources(current, source_id)? {
            if scope
                .as_ref()
                .is_none_or(|scope| !scope.channel_eligible(&body.grant.channel))
            {
                continue;
            }
            let previous = prior.iter().find(|key| {
                state
                    .annotations
                    .get(*key)
                    .is_some_and(|value| value.lease_id == body.field.id)
            });
            let exposure = current_facet_exposure(current, body)?;
            let key = attention_subject_key(source_id, &exposure).map_err(|_| invalid())?;
            live.insert(key.clone());
            if let Some(previous) = previous.filter(|previous| *previous != &key) {
                lost_witness(&mut state, previous);
                state.annotations.shift_remove(previous);
            }
            let old = state.annotations.get(&key);
            let mut annotation = if let Some(old) = old {
                let mut annotation = old.clone();
                annotation.lease_id = body.field.id.clone();
                annotation
            } else {
                let order = state.next_order;
                state.next_order = order
                    .checked_add(1)
                    .filter(|v| *v <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or_else(invalid)?;
                AttentionAnnotation {
                    source_id: source_id.clone(),
                    lease_id: body.field.id.clone(),
                    exposure,
                    order,
                    acquired_at: body.metadata.times.expanded().value_acquired_at,
                    urgency: 0.0,
                    direct: false,
                    presented_description: None,
                    presented_change: None,
                    anchor: None,
                    urgency_through: None,
                    urgency_source: None,
                    direct_through: None,
                    direct_source: None,
                }
            };
            if annotation.anchor.is_none() {
                annotation.anchor = current_point(
                    scope.as_ref().ok_or_else(invalid)?,
                    source_id,
                    CurrentFacetSelector {
                        channel: Some(&body.grant.channel),
                        exposure: Some(&body.grant.exposure),
                        modality: None,
                    },
                )?;
            }
            if old.is_none() || geometry.contains(source_id) {
                geometry_changed = true;
                changed_geometry_keys.insert(key.clone());
            }
            if annotation.urgency_through.unwrap_or(f64::INFINITY) <= now {
                annotation.urgency = 0.0;
                annotation.urgency_through = None;
                annotation.urgency_source = None;
            }
            if annotation.direct_through.unwrap_or(f64::INFINITY) <= now {
                annotation.direct = false;
                annotation.direct_through = None;
                annotation.direct_source = None;
            }
            let urgency = update
                .urgency
                .and_then(|values| values.get(source_id))
                .copied()
                .unwrap_or(0.0);
            if urgency > 0.0 && urgency >= annotation.urgency {
                annotation.urgency = urgency;
                annotation.urgency_through = Some(now + policy.stability_seconds);
                annotation.urgency_source = update
                    .proofs
                    .and_then(|proofs| proofs.get(source_id))
                    .cloned();
            }
            if update
                .direct_subjects
                .is_some_and(|ids| ids.contains(source_id))
            {
                annotation.direct = true;
                annotation.direct_through = Some(now + policy.stability_seconds);
                annotation.direct_source = update
                    .proofs
                    .and_then(|proofs| proofs.get(source_id))
                    .cloned();
            }
            if old != Some(&annotation) {
                state.annotations.insert(key, annotation);
            }
        }
        for key in prior {
            if !live.contains(key) {
                lost_witness(&mut state, key);
                state.annotations.shift_remove(key);
                geometry_changed = true;
            }
        }
    }
    let candidates = build_candidates(
        physical, reception, installed, experience, observer, &state, journal,
    )?;
    let live: IndexSet<_> = candidates.keys().cloned().collect();
    state.explicit.retain(|key| live.contains(key));
    let selected = selection::select(
        physical,
        reception,
        installed,
        experience,
        observer,
        &mut state,
        &entries_before,
        &candidates,
        capacity_value,
        update.changed_source_ids.is_some() && !policy_changed && !expiry_due,
        update.urgency.is_none_or(IndexMap::is_empty)
            && update.direct_subjects.is_none_or(|ids| ids.is_empty()),
    )?;
    state.latches.retain(|_, latch| {
        latch.anchor_key == SELF_RELATION_KEY || live.contains(&latch.anchor_key)
    });
    state.entries = selected.entries;
    for map in [&mut state.relation_dirty] {
        map.retain(|key, _| {
            serde_json::from_str::<(String, AttentionRelationFamily)>(key)
                .is_ok_and(|(anchor, _)| anchor == SELF_RELATION_KEY || live.contains(&anchor))
        });
    }
    state.relation_scans.retain(|key, _| {
        serde_json::from_str::<(String, AttentionRelationFamily)>(key)
            .is_ok_and(|(anchor, _)| anchor == SELF_RELATION_KEY || live.contains(&anchor))
    });
    if policy_changed {
        for latch in state.latches.values_mut() {
            if latch.active {
                latch.clear_since = None;
            }
        }
        mark_relations(
            &mut state,
            work_target,
            now,
            &[
                AttentionRelationFamily::ClosingBody,
                AttentionRelationFamily::ClosingDrop,
            ],
            None,
        )?;
    } else if geometry_changed {
        mark_relations(
            &mut state,
            work_target,
            now,
            &[AttentionRelationFamily::ClosingBody],
            None,
        )?;
        let anchors = relation_keys(&state, work_target, now)
            .into_iter()
            .filter(|key| changed_geometry_keys.contains(key))
            .collect::<IndexSet<_>>();
        if !anchors.is_empty() {
            mark_relations(
                &mut state,
                work_target,
                now,
                &[AttentionRelationFamily::ClosingDrop],
                Some(&anchors),
            )?;
        }
    }
    for key in relation_keys(&state, work_target, now) {
        if !previous_anchors.contains(&key) {
            for family in [
                AttentionRelationFamily::ClosingBody,
                AttentionRelationFamily::ClosingDrop,
            ] {
                state
                    .relation_dirty
                    .insert(relation_key(&key, family)?, state.relation_revision);
            }
        }
    }
    let after = state
        .entries
        .iter()
        .map(|entry| entry.source_id.clone())
        .collect();
    let measurement_changed = state.entries.len() != entries_before.len()
        || state
            .entries
            .iter()
            .zip(&entries_before)
            .any(|(a, b)| a.key != b.key || a.lease_id != b.lease_id || a.subject != b.subject);
    *journal.attention_mut(reception, observer)? = Some(state);
    Ok(AttentionSelection {
        before,
        after,
        subjects: selected.subjects,
        measurement_changed,
    })
}

/// Ending a motion/geometry input invalidates its actual relation scans without
/// creating an attention selection or a fresh sensory sample.
pub(super) fn dirty_attention_relations(
    physical: &PhysicalState,
    reception: &mut ReceptionState,
    journal: &mut CurrentJournal,
    observer: &str,
    families: &[AttentionRelationFamily],
) -> Result<(), ReceivedError> {
    dirty_relations(physical, reception, journal, observer, families, None)
}
pub(super) fn dirty_attention_self_relations(
    physical: &PhysicalState,
    reception: &mut ReceptionState,
    journal: &mut CurrentJournal,
    observer: &str,
    families: &[AttentionRelationFamily],
) -> Result<(), ReceivedError> {
    let anchors = IndexSet::from([SELF_RELATION_KEY.to_owned()]);
    dirty_relations(
        physical,
        reception,
        journal,
        observer,
        families,
        Some(&anchors),
    )
}
fn dirty_relations(
    physical: &PhysicalState,
    reception: &mut ReceptionState,
    journal: &mut CurrentJournal,
    observer: &str,
    families: &[AttentionRelationFamily],
    anchors: Option<&IndexSet<String>>,
) -> Result<(), ReceivedError> {
    let Some(prior) = owner(reception, observer).and_then(|owner| owner.attention.as_ref()) else {
        return Ok(());
    };
    journal.reserve_growth(
        heap_sum([
            prior
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(3)
                .ok_or_else(capacity)?,
            map_storage::<String, u64>(
                prior
                    .annotations
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(4))
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?,
    )?;
    let mut next = prior.clone();
    mark_relations(
        &mut next,
        target(physical, observer),
        physical.header.sim_time,
        families,
        anchors,
    )?;
    *journal.attention_mut(reception, observer)? = Some(next);
    Ok(())
}
