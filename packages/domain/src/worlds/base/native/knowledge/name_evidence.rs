//! A preferred name retains the actual offered words and their permitted
//! participant evidence, independently of the durable speech log.

use super::StoredNameSupport;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{Awareness, KnownPlaceMutation, PersonalSourceKind};
use crate::host::retained_size::{HeapBytes, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{SupportRetentionContext, TemporalAppendError, TemporalReceiptLocator};
use crate::worlds::base_recognition::{member_indices, original_support, source_json};
use std::{collections::BTreeSet, mem::size_of};

pub(super) struct HeldNameEvidence {
    pub ids: Vec<String>,
    pub created: Vec<String>,
    pub reservation: ByteReservation,
}
fn grow(reservation: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    reservation.resize(
        reservation
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(())
}
fn append_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(error) => error.into(),
        TemporalAppendError::Work(error) => error.into(),
    }
}
fn primary(kind: &str, rank: u8) -> bool {
    match rank {
        0 => kind == "speech",
        1 => matches!(
            kind,
            "event" | "personal-account" | "description" | "encounter-exposure"
        ),
        _ => matches!(kind, "body" | "contact" | "detected"),
    }
}
fn name_indices<'a>(facets: impl Iterator<Item = (u64, &'a str)> + Clone) -> Option<BTreeSet<u64>> {
    let rank = (0..3).find(|rank| facets.clone().any(|(_, kind)| primary(kind, *rank)))?;
    Some(
        facets
            .filter(|(_, kind)| {
                primary(kind, rank) || matches!(*kind, "perceived-feature" | "association")
            })
            .map(|(index, _)| index)
            .collect(),
    )
}
pub(super) fn release_created(
    core: &mut CoreMutation<'_>,
    observer: &str,
    ids: &[String],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    for id in ids {
        core.state.temporal.release_support(
            observer,
            id,
            core.state.physical.header.sim_time,
            &core.state.installed.attention.value().retention,
            Some(KnownPlaceMutation {
                state: &mut core.state.experience,
                journal: &mut core.journal.experience,
                limits: &core.state.installed.personal_evidence_preparation,
                budget,
            }),
        )?;
    }
    Ok(())
}
fn selected_members(
    core: &CoreMutation<'_>,
    observation: Option<&crate::reception::ObservationContribution>,
    requested: Option<&BTreeSet<u64>>,
    receipt: &TemporalReceiptLocator,
    budget: &ByteBudget,
    reservation: &mut ByteReservation,
) -> Result<Option<BTreeSet<u64>>, ExecutionError> {
    if let Some(observation) = observation {
        return match requested {
            Some(requested) => member_indices(core, observation, requested, Some(receipt), budget),
            None => Ok(None),
        };
    }
    let policy = &core.state.installed.attention.value().retention;
    let Some(retained) = core.state.temporal.retained_receipt(
        receipt,
        None,
        &core.state.reception.received_values.as_ref(),
        &crate::worlds::InstalledEvidenceMeaning,
        core.state.physical.header.sim_time,
        policy.recent.max_age_seconds,
        budget,
    )?
    else {
        return Ok(None);
    };
    grow(
        reservation,
        retained
            .fragments()
            .len()
            .checked_mul(tree_node_bound::<u64, ()>().ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(name_indices(
        retained
            .receipt()
            .facets
            .iter()
            .zip(retained.fragments())
            .map(|(field, value)| (field.member_index, value.kind())),
    ))
}
/// One actual `awareness:event` reference from the introduction caller. Stored
/// account wrappers and native delivery wrappers may have different receipts.
pub(super) fn retain_event_evidence(
    core: &mut CoreMutation<'_>,
    observer: &str,
    event_id: &str,
    actual: Option<&Awareness>,
    budget: &ByteBudget,
) -> Result<Option<HeldNameEvidence>, ExecutionError> {
    let base = event_id
        .len()
        .checked_add("awareness:".len())
        .and_then(|n| n.checked_add(3 * size_of::<String>()))
        .ok_or(ExecutionError::Capacity)?;
    let mut reservation = budget.reserve(base)?;
    let stored = match core
        .state
        .experience
        .optional_collection(observer, PersonalSourceKind::Awareness)?
    {
        Some(collection) => {
            let found = collection
                .records()
                .find(|record| record.header().event_id.as_deref() == Some(event_id));
            if found.is_none() && !collection.coverage().complete {
                return Err(crate::experience::ExperienceError::Unavailable.into());
            }
            found
                .map(|record| StoredNameSupport::capture(record, budget))
                .transpose()?
        }
        None => None,
    };
    let actual = actual.filter(|entry| entry.event_id == event_id);
    let observation = actual
        .and_then(|entry| entry.observation.as_deref())
        .or_else(|| {
            stored
                .as_ref()
                .and_then(|entry| entry.observation.as_deref())
        });
    let fields = observation.map_or(0, |observation| observation.facets.len());
    grow(
        &mut reservation,
        fields
            .checked_mul(tree_node_bound::<u64, ()>().ok_or(ExecutionError::Capacity)?)
            .and_then(|bytes| bytes.checked_mul(2))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let requested = observation.and_then(|observation| {
        name_indices(
            observation
                .facets
                .iter()
                .map(|facet| (facet.ordinal, facet.value.kind())),
        )
    });
    let policy = &core.state.installed.attention.value().retention;
    let recent = core.state.temporal.receipt_for_source(
        observer,
        event_id,
        core.state.physical.header.sim_time,
        policy.recent.max_age_seconds,
    )?;
    let preferred = actual
        .and_then(|entry| entry.source_receipt.as_ref())
        .or_else(|| {
            stored
                .as_ref()
                .and_then(|entry| entry.source_receipt.as_ref())
        });
    let supports = core
        .state
        .temporal
        .actor(observer)
        .and_then(|actor| actor.supports());
    let supports_existed = supports.is_some();
    if supports.is_some_and(|supports| !supports.coverage().complete) {
        return Err(crate::experience::ExperienceError::Unavailable.into());
    }
    // Deduplicate by receipt ID, matching the Source factory rather than by a
    // later materialized wrapper's field order or physical-life annotation.
    let mut considered = Vec::<String>::new();
    let mut selected = None;
    for receipt in preferred.into_iter().chain(recent.as_ref()).chain(
        supports
            .into_iter()
            .flat_map(|supports| supports.records())
            .filter(|record| {
                record
                    .capsule()
                    .receipt
                    .header
                    .source_ids
                    .iter()
                    .any(|id| id == event_id)
            })
            .map(|record| &record.capsule().receipt.locator),
    ) {
        let bytes = receipt
            .epoch
            .len()
            .checked_add(64)
            .ok_or(ExecutionError::Capacity)?;
        grow(
            &mut reservation,
            bytes
                .checked_add(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let id = receipt.id();
        if considered.contains(&id) {
            continue;
        }
        considered
            .try_reserve_exact(1)
            .map_err(|_| ExecutionError::Capacity)?;
        considered.push(id);
        if let Some(members) = selected_members(
            core,
            observation,
            requested.as_ref(),
            receipt,
            budget,
            &mut reservation,
        )? {
            if members.is_empty() {
                continue;
            }
            grow(
                &mut reservation,
                receipt.heap_bytes().ok_or(ExecutionError::Capacity)?,
            )?;
            selected = Some((receipt.clone(), members));
            break;
        }
    }
    if selected.is_none() {
        if let (Some(observation), Some(requested)) = (
            observation,
            requested.as_ref().filter(|set| !set.is_empty()),
        ) {
            if let Some(receipt) =
                original_support(core, observation, requested, true, budget, &mut reservation)?
            {
                if let Some(members) =
                    member_indices(core, observation, requested, Some(&receipt), budget)?
                {
                    selected = Some((receipt, members));
                }
            }
        }
    }
    let Some((receipt, members)) = selected else {
        return Ok(None);
    };
    grow(
        &mut reservation,
        receipt
            .epoch
            .len()
            .checked_add(64)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let id = receipt.id();
    let already_held = supports_existed
        && core
            .state
            .temporal
            .actor(observer)
            .and_then(|actor| actor.supports())
            .map(|supports| supports.get(&id))
            .transpose()?
            .flatten()
            .is_some();
    let policy = &core.state.installed.attention.value().retention;
    let held = core
        .state
        .temporal
        .retain_receipt_support(
            &receipt,
            Some(&members),
            false,
            &policy.optional,
            SupportRetentionContext {
                values: core
                    .state
                    .reception
                    .received_values
                    .as_ref()
                    .ok_or(ExecutionError::UnfinishedOccurrence)?,
                meaning: &crate::worlds::InstalledEvidenceMeaning,
                now: core.state.physical.header.sim_time,
                policy,
                meters: &mut core.journal.meters,
                budget,
                places: Some(KnownPlaceMutation {
                    state: &mut core.state.experience,
                    journal: &mut core.journal.experience,
                    limits: &core.state.installed.personal_evidence_preparation,
                    budget,
                }),
            },
        )
        .map_err(append_error)?;
    let Some(held) = held else { return Ok(None) };
    // JSON can escape every UTF-8 byte as a six-byte sequence. Fund the exact
    // factory's scalar/string bound before it allocates either ID or output.
    grow(
        &mut reservation,
        receipt
            .epoch
            .len()
            .checked_add(observer.len())
            .and_then(|n| n.checked_add(128))
            .and_then(|n| n.checked_mul(6))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let source = source_json(&held.capsule().receipt.locator)?;
    let mut ids = Vec::new();
    ids.try_reserve_exact(2)
        .map_err(|_| ExecutionError::Capacity)?;
    ids.push(format!("awareness:{event_id}"));
    ids.push(source);
    Ok(Some(HeldNameEvidence {
        ids,
        created: if already_held { Vec::new() } else { vec![id] },
        reservation,
    }))
}

/// Explicit edits may carry several acquired events and plain historical IDs.
/// Every awareness reference retains its own exact sparse words; if one fails,
/// only supports newly acquired by this attempt are released, in source order.
pub(super) fn retain_name_evidence(
    core: &mut CoreMutation<'_>,
    observer: &str,
    references: &[String],
    actual: Option<&Awareness>,
    budget: &ByteBudget,
) -> Result<Option<HeldNameEvidence>, ExecutionError> {
    let strings = references
        .iter()
        .try_fold(0usize, |n, id| n.checked_add(id.len()))
        .ok_or(ExecutionError::Capacity)?;
    let mut reservation = budget.reserve(
        strings
            .checked_add(
                references
                    .len()
                    .checked_mul(4 * size_of::<String>())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut ids = Vec::with_capacity(
        references
            .len()
            .checked_mul(3)
            .ok_or(ExecutionError::Capacity)?,
    );
    let mut created = Vec::with_capacity(references.len());
    for id in references {
        if !ids.contains(id) {
            ids.push(id.clone());
        }
    }
    for reference in references {
        let Some(event_id) = reference.strip_prefix("awareness:") else {
            continue;
        };
        let Some(held) = retain_event_evidence(core, observer, event_id, actual, budget)? else {
            release_created(core, observer, &created, budget)?;
            return Ok(None);
        };
        reservation.merge(held.reservation)?;
        for id in held.ids {
            if !ids.contains(&id) {
                ids.push(id);
            }
        }
        created.extend(held.created);
    }
    reservation.resize(
        ids.heap_bytes()
            .and_then(|n| n.checked_add(created.heap_bytes()?))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(Some(HeldNameEvidence {
        ids,
        created,
        reservation,
    }))
}
