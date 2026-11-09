//! Exact resident/captured receipts. Candidate directories route to real owned
//! entries; they never grant a missing fact. These native read products preserve
//! original ordinals and reception, and are not themselves a privacy grant.

use super::*;
use crate::experience::personal_fact_alias;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{
    EvidenceFamily, EvidenceSource, ObservationContribution, ObservationFactKey, ObservationOrigin,
    ReceivedValueLookup, SourceRevision,
};
use indexmap::IndexSet;
use std::mem::size_of;
use std::sync::Arc;
mod read;

/// Expansion repeats only the immutable metadata referenced by these fields.
/// The same allowance funds read captures and canonical privacy replacements;
/// neither path may materialize proof trees before admitting their allocation.
pub(super) fn receipt_expansion_bound(
    batch: &ReceivedBatch,
    entry: &ReceivedEntry,
) -> Result<usize, ReceivedError> {
    let overflow = || ReceivedError("Temporal read allocation overflow.");
    let metadata = heap_sum([
        entry.receipt.sources.heap_bytes().ok_or_else(overflow)?,
        entry.receipt.frames.heap_bytes().ok_or_else(overflow)?,
        batch
            .actor_id
            .len()
            .checked_add(batch.epoch.len())
            .ok_or_else(overflow)?,
    ])
    .ok_or_else(overflow)?;
    heap_sum([
        size_of::<CapturedTemporalReceipt>(),
        entry.receipt.heap_bytes().ok_or_else(overflow)?,
        metadata
            .checked_mul(
                entry
                    .receipt
                    .facets
                    .len()
                    .checked_mul(6)
                    .and_then(|n| n.checked_add(1))
                    .ok_or_else(overflow)?,
            )
            .ok_or_else(overflow)?,
        entry
            .receipt
            .facets
            .len()
            .checked_mul(size_of::<TemporalFacetReference>())
            .ok_or_else(overflow)?,
    ])
    .and_then(|n| n.checked_mul(3))
    .ok_or_else(overflow)
}

pub(crate) fn temporal_receipt_aliases(
    receipt: &TemporalReceipt,
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    fragments: Option<&[ReceivedValueFragment]>,
) -> Result<IndexSet<String>, ReceivedError> {
    receipt_aliases(
        receipt,
        &receipt.facets,
        &receipt.header.source_ids,
        values,
        meaning,
        fragments,
    )
}
pub(crate) fn temporal_receipt_account_aliases<'a>(
    receipt: &'a TemporalReceipt,
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    fragments: Option<&[ReceivedValueFragment]>,
) -> Result<Vec<&'a str>, ReceivedError> {
    let dependencies = receipt_aliases(receipt, &receipt.facets, &[], values, meaning, fragments)?;
    let event = match &receipt.origin {
        Some(ObservationOrigin::Occurrence { event_id, .. }) => Some(event_id.as_str()),
        _ => None,
    };
    Ok(receipt
        .header
        .source_ids
        .iter()
        .filter(|id| event == Some(id.as_str()) || !dependencies.contains(*id))
        .map(String::as_str)
        .collect())
}
pub(crate) fn temporal_field_aliases(
    receipt_id: &str,
    field: &TemporalFacetReference,
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
) -> Result<IndexSet<String>, ReceivedError> {
    field_aliases(
        receipt_id,
        std::slice::from_ref(field),
        &[],
        values,
        meaning,
        None,
    )
}
fn receipt_aliases(
    receipt: &TemporalReceipt,
    fields: &[TemporalFacetReference],
    source_ids: &[String],
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    fragments: Option<&[ReceivedValueFragment]>,
) -> Result<IndexSet<String>, ReceivedError> {
    field_aliases(&receipt.id, fields, source_ids, values, meaning, fragments)
}
fn field_aliases(
    receipt_id: &str,
    fields: &[TemporalFacetReference],
    source_ids: &[String],
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    fragments: Option<&[ReceivedValueFragment]>,
) -> Result<IndexSet<String>, ReceivedError> {
    let mut aliases = source_ids.iter().cloned().collect::<IndexSet<_>>();
    aliases.insert(receipt_id.to_owned());
    let fact =
        |aliases: &mut IndexSet<String>, key: &ObservationFactKey| -> Result<(), ReceivedError> {
            aliases.insert(key.source.id.clone());
            aliases.insert(
                personal_fact_alias(&key.source.id, key.ordinal)
                    .map_err(|_| ReceivedError("Temporal fact alias failed."))?,
            );
            Ok(())
        };
    for (index, field) in fields.iter().enumerate() {
        aliases.insert(
            personal_fact_alias(receipt_id, field.member_index)
                .map_err(|_| ReceivedError("Temporal member alias failed."))?,
        );
        if let Some(original) = &field.original {
            fact(&mut aliases, original)?;
        }
        for proof in field
            .support
            .iter()
            .chain(field.detail_support.iter().map(|detail| &detail.proof))
        {
            fact(&mut aliases, &proof.original)?;
            aliases.insert(proof.confirmation.id.clone());
            aliases.extend(proof.aliases.iter().flatten().cloned());
        }
        if let Some(source) = &field.received_from {
            aliases.insert(source.id.clone());
        }
        let fragment = if let Some(fragments) = fragments {
            fragments.get(index)
        } else {
            values.value_at(&field.value_ref)
        };
        if let Some(fragment) = fragment {
            aliases.extend(temporal_value_dependency_aliases(fragment, Some(meaning))?);
        }
    }
    Ok(aliases)
}
pub(crate) fn select_temporal_receipt_facets(
    receipt: TemporalReceipt,
    facets: Vec<TemporalFacetReference>,
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
) -> Result<TemporalReceipt, ReceivedError> {
    if facets.len() == receipt.facets.len() {
        return Ok(TemporalReceipt { facets, ..receipt });
    }
    let dependencies = receipt_aliases(&receipt, &receipt.facets, &[], values, meaning, None)?;
    let event = match &receipt.origin {
        Some(ObservationOrigin::Occurrence { event_id, .. }) => Some(event_id),
        _ => None,
    };
    let mut retained = receipt
        .header
        .source_ids
        .iter()
        .filter(|id| event == Some(*id) || !dependencies.contains(*id))
        .cloned()
        .collect::<IndexSet<_>>();
    retained.extend(receipt_aliases(
        &receipt,
        &facets,
        &[],
        values,
        meaning,
        None,
    )?);
    let ordinals = facets
        .iter()
        .map(|field| field.member_index)
        .collect::<BTreeSet<_>>();
    let mut selected = TemporalReceipt { facets, ..receipt };
    selected
        .header
        .source_ids
        .retain(|id| retained.contains(id));
    selected.header.availability = selected
        .header
        .availability
        .take()
        .map(|groups| {
            groups
                .into_iter()
                .filter_map(|mut group| {
                    group.fields.retain(|ordinal| ordinals.contains(ordinal));
                    (!group.fields.is_empty()).then_some(group)
                })
                .collect::<Vec<_>>()
        })
        .filter(|groups| !groups.is_empty());
    Ok(selected)
}
pub(crate) fn observation_receipt_member_indices(
    observation: &ObservationContribution,
    ordinals: &BTreeSet<u64>,
    receipt: &TemporalReceipt,
) -> Option<Vec<u64>> {
    if ordinals.is_empty() {
        return None;
    }
    let source = EvidenceSource {
        family: EvidenceFamily::NativeExposure,
        id: observation.id.clone(),
        revision: SourceRevision::Number(observation.revision),
        observer: observation.observer.clone(),
    };
    let mut found = BTreeSet::new();
    let mut selected = Vec::new();
    for field in &receipt.facets {
        let Some(original) = &field.original else {
            continue;
        };
        if original.source == source && ordinals.contains(&original.ordinal) {
            found.insert(original.ordinal);
            selected.push(field.member_index);
        }
    }
    (found.len() == ordinals.len()).then_some(selected)
}

pub(crate) struct CapturedTemporalReceipt {
    pub(super) receipt: TemporalReceipt,
    pub(super) fragments: Vec<ReceivedValueFragment>,
    // The actual immutable source factory supplies metadata member order when
    // a previously supplied sparse receipt is retained again. No live lookup or
    // per-field ordering registry is introduced.
    support: Option<Arc<TemporalSupportRecord>>,
    _support_pins: Option<(
        Arc<crate::host::SharedMemoryPin>,
        Arc<crate::host::SharedMemoryPin>,
    )>,
    _reservation: ByteReservation,
}
impl CapturedTemporalReceipt {
    pub(crate) fn read_view(&self) -> impl serde::Serialize + '_ {
        read::receipt_read(&self.receipt)
    }
    pub(crate) fn into_parts(
        self,
    ) -> (TemporalReceipt, Vec<ReceivedValueFragment>, ByteReservation) {
        (self.receipt, self.fragments, self._reservation)
    }
    pub(crate) fn support_payload(&self) -> Option<&str> {
        self.support.as_ref().map(|support| support.payload())
    }
    pub(crate) fn receipt(&self) -> &TemporalReceipt {
        &self.receipt
    }
    pub(crate) fn fragments(&self) -> &[ReceivedValueFragment] {
        &self.fragments
    }
    pub(crate) fn value(&self, index: usize) -> Option<MaterializedTemporalValue<'_>> {
        static NO_SHARED_VALUES: Option<&ReceivedValues> = None;
        materialize_temporal_value(
            self.receipt.facets.get(index)?,
            self.fragments.get(index)?,
            &NO_SHARED_VALUES,
        )
    }
}
impl TemporalState {
    pub(crate) fn receipt_for_source(
        &self,
        actor_id: &str,
        source_id: &str,
        now: f64,
        max_age: f64,
    ) -> Result<Option<TemporalReceiptLocator>, ReceivedError> {
        let Some(actor) = self.actor(actor_id) else {
            return Ok(None);
        };
        for page in actor.pending_pages().iter().rev() {
            let batch = page.batch();
            for entry in &batch.entries {
                if temporal_recent_at(entry.received_at, now, max_age)
                    && entry
                        .receipt
                        .header
                        .source_ids
                        .iter()
                        .any(|id| id == source_id)
                {
                    return Ok(Some(batch.locator(entry.entry_index)));
                }
            }
        }
        for page in actor.pages().rev() {
            for batch in page.batches() {
                for entry in &batch.entries {
                    if temporal_recent_at(entry.received_at, now, max_age)
                        && entry
                            .receipt
                            .header
                            .source_ids
                            .iter()
                            .any(|id| id == source_id)
                    {
                        return Ok(Some(batch.locator(entry.entry_index)));
                    }
                }
            }
        }
        if !actor.complete_pages()
            && actor.recent().directories().any(|directory| {
                directory.entries.iter().any(|entry| {
                    entry.through_at + max_age > now
                        && entry.source_ids.iter().any(|id| id == source_id)
                })
            })
        {
            return Err(ReceivedError(
                "Temporal source lookup requires original cold coverage.",
            ));
        }
        Ok(None)
    }
    pub(crate) fn native_receipt(
        &self,
        locator: &TemporalReceiptLocator,
        members: Option<&std::collections::BTreeSet<u64>>,
        values: &impl ReceivedValueLookup,
        meaning: &dyn TemporalValueMeaning,
        budget: &ByteBudget,
    ) -> Result<Option<CapturedTemporalReceipt>, ReceivedError> {
        let Some(actor) = self.actor(&locator.actor_id) else {
            return Ok(None);
        };
        let mut found = None;
        for page in actor.pages() {
            for batch in page.batches() {
                if batch.physical_life == locator.physical_life
                    && batch.epoch == locator.epoch
                    && batch.batch_order == locator.batch_order
                {
                    if let Some(entry) = batch
                        .entries
                        .iter()
                        .find(|entry| entry.entry_index == locator.entry_index)
                    {
                        found = Some((batch.as_ref(), entry));
                        break;
                    }
                }
            }
            if found.is_some() {
                break;
            }
        }
        if found.is_none() {
            for page in actor.pending_pages() {
                let batch = page.batch();
                if batch.physical_life == locator.physical_life
                    && batch.epoch == locator.epoch
                    && batch.batch_order == locator.batch_order
                {
                    if let Some(entry) = batch
                        .entries
                        .iter()
                        .find(|entry| entry.entry_index == locator.entry_index)
                    {
                        found = Some((batch.as_ref(), entry));
                        break;
                    }
                }
            }
        }
        let Some((batch, entry)) = found else {
            if actor.complete_pages() || locator.batch_order >= actor.page_order_upper_bound() {
                return Ok(None);
            }
            return Err(ReceivedError(
                "Temporal receipt requires original cold coverage.",
            ));
        };
        // Retained support requires a real facet. History selection separately
        // admits an actual fieldless boundary/frame through the same capture.
        if entry.receipt.facets.is_empty() {
            return Ok(None);
        }
        capture_received_entry(
            batch,
            entry,
            members,
            actor.header().frontier.as_ref(),
            values,
            meaning,
            budget,
        )
    }
    pub(crate) fn retained_receipt(
        &self,
        locator: &TemporalReceiptLocator,
        members: Option<&std::collections::BTreeSet<u64>>,
        values: &impl ReceivedValueLookup,
        meaning: &dyn TemporalValueMeaning,
        now: f64,
        max_age: f64,
        budget: &ByteBudget,
    ) -> Result<Option<CapturedTemporalReceipt>, ReceivedError> {
        let native = self.native_receipt(locator, members, values, meaning, budget);
        match native {
            Ok(Some(captured)) if temporal_recent_at(captured.receipt.at, now, max_age) => {
                return Ok(Some(captured));
            }
            Err(error) => {
                if let Some(support) = self
                    .actor(&locator.actor_id)
                    .and_then(|actor| actor.supports())
                    .map(|supports| supports.get(&locator.id()))
                    .transpose()?
                    .flatten()
                {
                    if support.capsule().receipt.locator == *locator {
                        return capture_support(support, members, values, meaning, budget);
                    }
                }
                return Err(error);
            }
            _ => {}
        }
        let Some(support) = self
            .actor(&locator.actor_id)
            .and_then(|actor| actor.supports())
            .map(|supports| supports.get(&locator.id()))
            .transpose()?
            .flatten()
        else {
            return Ok(None);
        };
        if support.capsule().receipt.locator != *locator {
            return Ok(None);
        }
        capture_support(support, members, values, meaning, budget)
    }
}

/// Capture one actual imported/native entry without constructing a temporal
/// actor or changing canonical residency. A historical read supplies its own
/// admitted frontier; later expiry must not rewrite that originating read.
pub(crate) fn capture_received_entry(
    batch: &ReceivedBatch,
    entry: &ReceivedEntry,
    members: Option<&BTreeSet<u64>>,
    frontier: Option<&ReceivedFrontier>,
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    budget: &ByteBudget,
) -> Result<Option<CapturedTemporalReceipt>, ReceivedError> {
    let reservation = budget
        .reserve(receipt_expansion_bound(batch, entry)?)
        .map_err(|_| ReceivedError("Temporal read capacity exhausted."))?;
    let receipt = materialize_received_receipt(batch, entry, None)?;
    let eligible = |member_index| {
        received_position_eligible(
            &ReceivedPosition {
                batch_order: batch.batch_order,
                entry_index: entry.entry_index,
                member_index,
            },
            receipt.at,
            frontier,
        )
    };
    if receipt.facets.is_empty() {
        return if members.is_none_or(BTreeSet::is_empty) && eligible(0) {
            capture_receipt(receipt, None, values, budget, reservation)
        } else {
            Ok(None)
        };
    }
    let facets = receipt
        .facets
        .iter()
        .filter(|field| {
            members.is_none_or(|members| members.contains(&field.member_index))
                && eligible(field.member_index)
        })
        .cloned()
        .collect::<Vec<_>>();
    if facets.is_empty() {
        return Ok(None);
    }
    let receipt = select_temporal_receipt_facets(receipt, facets, values, meaning)?;
    capture_receipt(receipt, None, values, budget, reservation)
}
fn capture_support(
    support: &Arc<TemporalSupportRecord>,
    members: Option<&std::collections::BTreeSet<u64>>,
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    budget: &ByteBudget,
) -> Result<Option<CapturedTemporalReceipt>, ReceivedError> {
    let capsule = support.capsule();
    let mut bytes = heap_sum([
        size_of::<CapturedTemporalReceipt>(),
        capsule
            .receipt
            .heap_bytes()
            .ok_or(ReceivedError("Temporal support read allocation overflow."))?,
    ])
    .ok_or(ReceivedError("Temporal support read allocation overflow."))?;
    for fragment in capsule.values.iter() {
        bytes = bytes
            .checked_add(
                fragment
                    .heap_bytes()
                    .ok_or(ReceivedError("Temporal support value allocation overflow."))?,
            )
            .ok_or(ReceivedError("Temporal support value allocation overflow."))?;
    }
    let reservation = budget
        .reserve(
            bytes
                .checked_mul(2)
                .ok_or(ReceivedError("Temporal support read allocation overflow."))?,
        )
        .map_err(|_| ReceivedError("Temporal support read capacity exhausted."))?;
    let slots = capsule.receipt.facets.len();
    let _lookup_storage = budget
        .reserve(
            crate::host::retained_size::map_storage::<&str, &ReceivedValueFragment>(slots).ok_or(
                ReceivedError("Temporal support lookup allocation overflow."),
            )?,
        )
        .map_err(|_| ReceivedError("Temporal support read capacity exhausted."))?;
    let mut shared = indexmap::IndexMap::with_capacity(slots);
    for (field, fragment) in capsule.receipt.facets.iter().zip(capsule.values.iter()) {
        if let ReceivedValueReference::Shared(id) = &field.value_ref {
            shared.insert(id.as_str(), fragment);
        }
    }
    struct CapturedValues<'a, L> {
        shared: indexmap::IndexMap<&'a str, &'a ReceivedValueFragment>,
        fallback: &'a L,
    }
    impl<L: ReceivedValueLookup> ReceivedValueLookup for CapturedValues<'_, L> {
        fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment> {
            self.shared
                .get(id)
                .copied()
                .or_else(|| self.fallback.shared_value(id))
        }
    }
    let lookup = CapturedValues {
        shared,
        fallback: values,
    };
    let facets = capsule
        .receipt
        .facets
        .iter()
        .filter(|field| members.is_none_or(|members| members.contains(&field.member_index)))
        .cloned()
        .collect::<Vec<_>>();
    if facets.is_empty() {
        return Ok(None);
    }
    let receipt =
        select_temporal_receipt_facets(capsule.receipt.as_ref().clone(), facets, &lookup, meaning)?;
    let captured = capture_receipt(
        receipt,
        Some((&capsule.receipt.facets, &capsule.values)),
        &lookup,
        budget,
        reservation,
    )?;
    let Some(mut capture) = captured else {
        return Ok(None);
    };
    capture._support_pins = Some(support.capture_pins(budget)?);
    capture.support = Some(Arc::clone(support));
    Ok(Some(capture))
}
fn capture_receipt(
    mut receipt: TemporalReceipt,
    fragments: Option<(&[TemporalFacetReference], &[ReceivedValueFragment])>,
    values: &impl ReceivedValueLookup,
    budget: &ByteBudget,
    mut reservation: ByteReservation,
) -> Result<Option<CapturedTemporalReceipt>, ReceivedError> {
    let _indices_storage = budget
        .reserve(
            crate::host::retained_size::map_storage::<u64, &ReceivedValueFragment>(
                fragments.map_or(0, |(fields, _)| fields.len()),
            )
            .ok_or(ReceivedError("Temporal selected lookup overflow."))?,
        )
        .map_err(|_| ReceivedError("Temporal selected lookup exceeds byte allowance."))?;
    let mut by_member =
        indexmap::IndexMap::with_capacity(fragments.map_or(0, |(fields, _)| fields.len()));
    if let Some((fields, values)) = fragments {
        for (field, value) in fields.iter().zip(values) {
            by_member.insert(field.member_index, value);
        }
    }
    let mut bytes = heap_sum([
        size_of::<CapturedTemporalReceipt>(),
        receipt
            .heap_bytes()
            .ok_or(ReceivedError("Temporal read allocation overflow."))?,
        receipt
            .facets
            .len()
            .checked_mul(size_of::<ReceivedValueFragment>())
            .ok_or(ReceivedError("Temporal read allocation overflow."))?,
    ])
    .ok_or(ReceivedError("Temporal read allocation overflow."))?;
    for field in receipt.facets.iter() {
        let Some(fragment) = (if fragments.is_some() {
            by_member.get(&field.member_index).copied()
        } else {
            values.value_at(&field.value_ref)
        }) else {
            return Ok(None);
        };
        bytes = bytes
            .checked_add(
                fragment
                    .heap_bytes()
                    .ok_or(ReceivedError("Temporal value read allocation overflow."))?,
            )
            .ok_or(ReceivedError("Temporal value read allocation overflow."))?;
        if let Some(TemporalReception::Body {
            pose: BodyReception::Reference { pose_ref },
        }) = &field.reception
        {
            let Some(ReceivedValueFragment::BodyPose(pose)) = values.value_at(pose_ref) else {
                return Ok(None);
            };
            bytes = bytes
                .checked_add(
                    pose.pose
                        .heap_bytes()
                        .ok_or(ReceivedError("Temporal pose read allocation overflow."))?,
                )
                .ok_or(ReceivedError("Temporal pose read allocation overflow."))?;
        }
    }
    reservation
        .resize(
            reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ReceivedError("Temporal read allocation overflow."))?,
        )
        .map_err(|_| ReceivedError("Temporal read capacity exhausted."))?;
    let mut selected = Vec::new();
    selected
        .try_reserve_exact(receipt.facets.len())
        .map_err(|_| ReceivedError("Temporal values read capacity exhausted."))?;
    for field in receipt.facets.iter_mut() {
        let Some(fragment) = (if fragments.is_some() {
            by_member.get(&field.member_index).copied()
        } else {
            values.value_at(&field.value_ref)
        }) else {
            return Ok(None);
        };
        selected.push(fragment.clone());
        if let Some(TemporalReception::Body {
            pose: BodyReception::Reference { pose_ref },
        }) = &field.reception
        {
            let Some(ReceivedValueFragment::BodyPose(pose)) = values.value_at(pose_ref) else {
                return Ok(None);
            };
            field.reception = Some(TemporalReception::Body {
                pose: BodyReception::Pose {
                    pose: pose.pose.clone(),
                },
            });
        }
    }
    let mut actual = heap_sum([
        size_of::<CapturedTemporalReceipt>(),
        receipt
            .heap_bytes()
            .ok_or(ReceivedError("Temporal read allocation overflow."))?,
        selected
            .capacity()
            .checked_mul(size_of::<ReceivedValueFragment>())
            .ok_or(ReceivedError("Temporal read allocation overflow."))?,
    ])
    .ok_or(ReceivedError("Temporal read allocation overflow."))?;
    for fragment in &selected {
        actual = actual
            .checked_add(
                fragment
                    .heap_bytes()
                    .ok_or(ReceivedError("Temporal read allocation overflow."))?,
            )
            .ok_or(ReceivedError("Temporal read allocation overflow."))?;
    }
    reservation
        .resize(actual)
        .map_err(|_| ReceivedError("Temporal read capacity exhausted."))?;
    Ok(Some(CapturedTemporalReceipt {
        receipt,
        fragments: selected,
        support: None,
        _support_pins: None,
        _reservation: reservation,
    }))
}
