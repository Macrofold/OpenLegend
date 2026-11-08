//! Explicit source corrections replace only revoked fields at their original
//! receipt coordinates. Expiry/frontiers and physical SQL packing are separate
//! owners; a logical pending page cannot masquerade as a stored physical row.

use super::*;
use crate::experience::personal_fact_alias;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    ReceivedBatch, ReceivedCharge, ReceivedEntry, ReceivedEntryKind, ReceivedValueFragment,
    ReceivedValues, TemporalFacetReference, TemporalValueMeaning, compact_received_receipt,
    eligible_received_charge_directories, materialize_received_receipt, materialize_temporal_value,
    temporal_field_aliases,
};
use crate::reception::SensoryFacet;
use indexmap::IndexSet;
use std::mem::size_of;
mod run;
pub(crate) use run::{
    ReleasedTemporalProofs, invalidate_temporal_evidence, invalidate_temporal_facets,
};

pub(crate) enum TemporalFacetRevocation<'a> {
    Sources(&'a IndexSet<String>),
    Associations {
        affected: &'a IndexSet<String>,
        facts: &'a IndexSet<String>,
    },
}
impl TemporalFacetRevocation<'_> {
    pub(crate) fn revokes(
        &self,
        receipt_id: &str,
        field: &TemporalFacetReference,
        values: &ReceivedValues,
        meaning: &dyn TemporalValueMeaning,
    ) -> Result<bool, ReceivedError> {
        let Some(fragment) = values.value_at(&field.value_ref) else {
            return Ok(false);
        };
        if materialize_temporal_value(field, fragment, values).is_none() {
            return Ok(false);
        }
        match self {
            Self::Sources(affected) => {
                Ok(temporal_field_aliases(receipt_id, field, values, meaning)?
                    .iter()
                    .any(|id| affected.contains(id)))
            }
            Self::Associations { affected, facts } => {
                let ReceivedValueFragment::Sensory(SensoryFacet::Association {
                    learning_support,
                    ..
                }) = fragment
                else {
                    return Ok(false);
                };
                if let Some(original) = &field.original {
                    if affected.contains(&original.source.id)
                        || facts.contains(
                            &personal_fact_alias(&original.source.id, original.ordinal)
                                .map_err(|_| invalid())?,
                        )
                    {
                        return Ok(true);
                    }
                }
                Ok(meaning
                    .recognition_support_source_ids(learning_support.as_deref().unwrap_or(&[]))?
                    .iter()
                    .any(|id| affected.contains(id)))
            }
        }
    }
}

/// These candidates must pass the selected world's recent-retirement prune
/// after current recording removals and before the next privacy phase. Merely
/// rewriting a page cannot seal an explicit privacy edit.
pub(crate) struct TemporalPageRevocation {
    pub individual_candidates: IndexSet<String>,
    _reservation: ByteReservation,
}
fn invalid() -> ReceivedError {
    ReceivedError("Temporal correction requires complete current physical page ownership.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Temporal correction exceeds native byte allowance.")
}

impl TemporalState {
    pub(crate) fn revoke_physical_facets(
        &mut self,
        actor_id: &str,
        values: &ReceivedValues,
        meaning: &dyn TemporalValueMeaning,
        revoked: &TemporalFacetRevocation<'_>,
        budget: &ByteBudget,
    ) -> Result<TemporalPageRevocation, ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(TemporalPageRevocation {
                individual_candidates: IndexSet::new(),
                _reservation: budget.reserve(0).map_err(|_| capacity())?,
            });
        };
        // The edit preparation owner hydrates the actual packed live cut first.
        // A database barrier would hide the required accepted-unsaved case.
        if !actor.complete_pages || !actor.pending_pages.is_empty() {
            return Err(invalid());
        }
        let count = actor
            .pages
            .values()
            .try_fold(0usize, |sum, page| {
                sum.checked_add(page.metadata().individual_ids.len())
            })
            .ok_or_else(capacity)?;
        let names = actor
            .pages
            .values()
            .flat_map(|page| &page.metadata().individual_ids)
            .try_fold(0usize, |sum, id| sum.checked_add(id.len()))
            .ok_or_else(capacity)?;
        let reservation = budget
            .reserve(
                heap_sum([
                    map_storage::<String, ()>(count).ok_or_else(capacity)?,
                    names,
                    actor
                        .pages
                        .len()
                        .checked_mul(size_of::<u64>())
                        .ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let positions = actor.pages.keys().copied().collect::<Vec<_>>();
        let mut individual_candidates = IndexSet::new();
        individual_candidates
            .try_reserve(count)
            .map_err(|_| capacity())?;
        for position in positions {
            let page = Arc::clone(
                self.actors
                    .get(actor_id)
                    .and_then(|actor| actor.pages.get(&position))
                    .ok_or_else(invalid)?,
            );
            let mut owned = heap_sum([
                page.payload().len().checked_mul(6).ok_or_else(capacity)?,
                page.metadata()
                    .heap_bytes()
                    .ok_or_else(capacity)?
                    .checked_mul(5)
                    .ok_or_else(capacity)?,
                actor_id.len().checked_mul(5).ok_or_else(capacity)?,
                page.row_id().len().checked_mul(3).ok_or_else(capacity)?,
                size_of::<TemporalUndo>() * 3,
            ])
            .ok_or_else(capacity)?;
            for batch in page.batches() {
                owned = owned
                    .checked_add(
                        batch
                            .heap_bytes()
                            .ok_or_else(capacity)?
                            .checked_mul(6)
                            .ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?;
            }
            let retained = budget.reserve(owned).map_err(|_| capacity())?;
            let mut changed = false;
            let mut batches = Vec::new();
            for batch in page.batches() {
                let mut entries = Vec::new();
                entries
                    .try_reserve_exact(batch.entries.len())
                    .map_err(|_| capacity())?;
                for entry in &batch.entries {
                    let mut temporary =
                        super::super::selection::receipt_expansion_bound(batch, entry)?;
                    for field in &entry.receipt.facets {
                        if let Some(value) = values.value_at(&field.value_ref) {
                            temporary = temporary
                                .checked_add(
                                    value
                                        .heap_bytes()
                                        .ok_or_else(capacity)?
                                        .checked_mul(4)
                                        .ok_or_else(capacity)?,
                                )
                                .ok_or_else(capacity)?;
                        }
                    }
                    let _expanded = budget.reserve(temporary).map_err(|_| capacity())?;
                    let mut receipt = materialize_received_receipt(batch, entry, None)?;
                    let before = receipt.facets.len();
                    let mut kept = Vec::new();
                    kept.try_reserve_exact(before).map_err(|_| capacity())?;
                    for field in std::mem::take(&mut receipt.facets) {
                        if !revoked.revokes(&receipt.id, &field, values, meaning)? {
                            kept.push(field);
                        }
                    }
                    changed |= kept.len() != before;
                    if kept.is_empty() && before != 0 {
                        continue;
                    }
                    receipt.facets = kept;
                    let compact = compact_received_receipt(&batch.observer(), &receipt)?;
                    let bytes =
                        crate::encoding::json_record_len(&compact).map_err(|_| invalid())? as u64;
                    entries.push(ReceivedEntry {
                        entry_index: entry.entry_index,
                        order: entry.order,
                        received_at: entry.received_at,
                        kind: entry.kind,
                        required: entry.required,
                        charge: ReceivedCharge {
                            bytes,
                            count: if entry.kind == ReceivedEntryKind::Boundary {
                                0
                            } else {
                                receipt.facets.len() as u64
                            },
                        },
                        receipt: compact,
                    });
                }
                if !entries.is_empty() {
                    batches.push(Arc::new(ReceivedBatch {
                        actor_id: batch.actor_id.clone(),
                        physical_life: batch.physical_life,
                        epoch: batch.epoch.clone(),
                        batch_order: batch.batch_order,
                        entries,
                    }));
                }
            }
            if !changed {
                continue;
            }
            let after = page
                .replace_batches(batches, values, meaning)?
                .map(Arc::new);
            let actor = self.actors.get(actor_id).ok_or_else(invalid)?;
            let appended = after
                .as_ref()
                .map(|page| {
                    eligible_received_charge_directories(
                        std::slice::from_ref(&page.metadata().charge_directory),
                        actor.header.frontier.as_ref(),
                    )
                })
                .transpose()?
                .unwrap_or_default();
            let mut removed = Vec::new();
            removed
                .try_reserve_exact(page.batches().count())
                .map_err(|_| capacity())?;
            let mut appended_undo = Vec::new();
            appended_undo
                .try_reserve_exact(appended.len())
                .map_err(|_| capacity())?;
            let after_position = after.as_ref().map(|page| page.position());
            if after_position
                .is_some_and(|next| next != position && actor.pages.contains_key(&next))
            {
                return Err(invalid());
            }
            self.undo.try_reserve(3).map_err(|_| capacity())?;
            self.undo.push(TemporalUndo::Reservation(retained));
            self.undo.push(TemporalUndo::PageEdit {
                actor_id: actor_id.to_owned(),
                before: Arc::clone(&page),
                after_position,
                removed,
                appended: appended_undo,
            });
            let actor = self.actors.get_mut(actor_id).ok_or_else(invalid)?;
            let TemporalUndo::PageEdit {
                removed,
                appended: appended_undo,
                ..
            } = self.undo.last_mut().expect("Prepared temporal edit undo")
            else {
                unreachable!()
            };
            for batch in page.batches() {
                if let Some(directory) =
                    actor
                        .recent
                        .take_block(batch.physical_life, &batch.epoch, batch.batch_order)?
                {
                    removed.push(directory);
                }
            }
            for directory in appended {
                actor.recent.append(&directory)?;
                appended_undo.push(directory);
            }
            actor.pages.remove(&position).ok_or_else(invalid)?;
            if let Some(after) = after {
                if actor.pages.insert(after.position(), after).is_some() {
                    return Err(invalid());
                }
            }
            let mut header = actor.header.clone();
            header.bytes = actor.recent.bytes();
            header.count = actor.recent.count();
            self.replace_header(actor_id, header)?;
            individual_candidates.extend(page.metadata().individual_ids.iter().cloned());
        }
        Ok(TemporalPageRevocation {
            individual_candidates,
            _reservation: reservation,
        })
    }
}
