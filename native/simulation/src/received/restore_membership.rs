//! The stopped full installation can answer recent membership from its finite
//! actor pages. Only the candidate borrows these bodies. The SQL application
//! still owns canonical-account membership at the same prospective cut.

use super::*;
use crate::experience::parse_personal_fact_alias;
use crate::host::ByteBudget;
use crate::reception::{ObserverSubject, ReceivedValueLookup};
use indexmap::IndexSet;

pub(crate) struct RestoreRecentSelection<'a> {
    pub actor: &'a TemporalActorHistory,
    pub at: f64,
    pub max_age: f64,
    pub aliases: &'a [String],
    pub individuals: &'a [String],
    pub max_pages: usize,
    pub max_bytes: usize,
}

fn invalid() -> ReceivedError {
    ReceivedError("Exact recent restore membership is incomplete or exceeds preparation.")
}

/// Full recent membership uses the same receiver cutoff, exact acquired
/// fields, and world recognition meaning as the record metadata. Candidate
/// page metadata selects bodies for inspection without granting membership.
pub(crate) fn restore_recent_membership(
    request: RestoreRecentSelection<'_>,
    aliases: &mut [bool],
    individuals: &mut [bool],
    values: &impl ReceivedValueLookup,
    meaning: &dyn TemporalValueMeaning,
    budget: &ByteBudget,
) -> Result<(), ReceivedError> {
    let actor = request.actor;
    if !actor.complete_pages()
        || aliases.len() != request.aliases.len()
        || individuals.len() != request.individuals.len()
        || !request.at.is_finite()
        || !request.max_age.is_finite()
        || request.max_age < 0.0
    {
        return Err(invalid());
    }
    let items = request
        .aliases
        .len()
        .checked_add(request.individuals.len())
        .ok_or_else(invalid)?;
    let mut storage = budget
        .reserve(items.checked_mul(192).ok_or_else(invalid)?)
        .map_err(|_| invalid())?;
    let _source_selection = budget
        .reserve(
            request
                .aliases
                .iter()
                .try_fold(0usize, |n, id| n.checked_add(id.len().checked_mul(8)?))
                .ok_or_else(invalid)?,
        )
        .map_err(|_| invalid())?;
    let mut wanted_aliases = request
        .aliases
        .iter()
        .map(String::as_str)
        .zip(aliases.iter_mut())
        .filter_map(|(id, selected)| (!*selected).then_some((id, selected)))
        .collect::<BTreeMap<_, _>>();
    let mut wanted_individuals = request
        .individuals
        .iter()
        .map(String::as_str)
        .zip(individuals.iter_mut())
        .filter_map(|(id, selected)| (!*selected).then_some((id, selected)))
        .collect::<BTreeMap<_, _>>();
    if request.aliases.iter().collect::<BTreeSet<_>>().len() != request.aliases.len()
        || request.individuals.iter().collect::<BTreeSet<_>>().len() != request.individuals.len()
    {
        return Err(invalid());
    }
    let direct_aliases = wanted_aliases
        .keys()
        .filter_map(|id| {
            let fact = parse_personal_fact_alias(id);
            parse_temporal_receipt_id(fact.as_ref().map_or(id, |(source, _)| source))
                .map(|address| (*id, (address, fact.map(|(_, member)| member))))
        })
        .collect::<BTreeMap<_, _>>();
    let frontier = actor.header().frontier.as_ref();
    let recent_after = (request.at - request.max_age).max(
        frontier
            .and_then(|value| value.expired_through_time)
            .unwrap_or(f64::NEG_INFINITY),
    );
    let mut source_ids = IndexSet::<String>::new();
    let mut pages = 0usize;
    let mut bytes = 0usize;
    let mut inspect =
        |meta: &TemporalPageMetadata,
         batches: &mut dyn Iterator<Item = &std::sync::Arc<TemporalBatch>>,
         page_bytes: usize|
         -> Result<(), ReceivedError> {
            if meta.last_at.is_none_or(|at| at <= recent_after)
                || frontier
                    .and_then(|value| value.pressure_through.as_ref())
                    .is_some_and(|pressure| {
                        meta.last_batch_order
                            .zip(meta.last_entry)
                            .zip(meta.last_member)
                            .is_none_or(|((batch, entry), member)| {
                                (batch, entry, member)
                                    <= (
                                        pressure.address.batch_order,
                                        pressure.address.entry_index,
                                        pressure.address.member_index,
                                    )
                            })
                    })
                || !(meta
                    .source_ids
                    .iter()
                    .any(|id| wanted_aliases.contains_key(id.as_str()))
                    || meta
                        .individual_ids
                        .iter()
                        .any(|id| wanted_individuals.contains_key(id.as_str())))
            {
                return Ok(());
            }
            pages = pages.checked_add(1).ok_or_else(invalid)?;
            bytes = bytes.checked_add(page_bytes).ok_or_else(invalid)?;
            for id in &meta.references {
                if !source_ids.contains(id.as_str()) {
                    let addition = 128usize.checked_add(id.len()).ok_or_else(invalid)?;
                    storage
                        .resize(storage.bytes().checked_add(addition).ok_or_else(invalid)?)
                        .map_err(|_| invalid())?;
                    source_ids.insert(id.clone());
                    let own = values.shared_value_bytes(id).ok_or_else(invalid)?;
                    bytes = bytes
                        .checked_add(usize::try_from(own).map_err(|_| invalid())?)
                        .ok_or_else(invalid)?;
                }
            }
            if pages > request.max_pages || bytes > request.max_bytes {
                return Err(invalid());
            }
            for batch in batches {
                let _locator = budget
                    .reserve(
                        batch
                            .actor_id
                            .len()
                            .checked_add(batch.epoch.len())
                            .and_then(|n| n.checked_mul(8))
                            .and_then(|n| n.checked_add(512))
                            .ok_or_else(invalid)?,
                    )
                    .map_err(|_| invalid())?;
                for entry in &batch.entries {
                    if !temporal_recent_at(entry.received_at, request.at, request.max_age)
                        || !actor
                            .recent()
                            .contains(&batch.locator(entry.entry_index), f64::NEG_INFINITY)
                    {
                        continue;
                    }
                    let eligible = |member_index| {
                        received_position_eligible(
                            &ReceivedPosition {
                                batch_order: batch.batch_order,
                                entry_index: entry.entry_index,
                                member_index,
                            },
                            entry.received_at,
                            frontier,
                        )
                    };
                    if (entry.kind == ReceivedEntryKind::Occurrence && !eligible(0))
                        || (!entry
                            .receipt
                            .facets
                            .iter()
                            .any(|field| eligible(field.member_index))
                            && (!entry.receipt.facets.is_empty() || !eligible(0)))
                    {
                        continue;
                    }
                    wanted_aliases.retain(|key, matched| {
                        if direct_aliases.get(key).is_some_and(|(address, member)| {
                            (
                                address.epoch.as_str(),
                                address.batch_order,
                                address.entry_index,
                            ) == (batch.epoch.as_str(), batch.batch_order, entry.entry_index)
                                && member.is_none_or(|member| {
                                    entry.receipt.facets.iter().any(|field| {
                                        field.member_index == member && eligible(member)
                                    })
                                })
                        }) {
                            **matched = true;
                            false
                        } else {
                            true
                        }
                    });
                    if wanted_aliases
                        .keys()
                        .any(|id| !direct_aliases.contains_key(id))
                    {
                        let _work = budget
                            .reserve(selection::receipt_expansion_bound(batch, entry)?)
                            .map_err(|_| invalid())?;
                        let mut receipt = materialize_received_receipt(batch, entry, None)?;
                        receipt.facets.retain(|field| eligible(field.member_index));
                        let _aliases = budget
                            .reserve(
                                alias_allocation::temporal_receipt_lookup_aliases_bound(
                                    &receipt, values, meaning,
                                )
                                .ok_or_else(invalid)?,
                            )
                            .map_err(|_| invalid())?;
                        for alias in temporal_receipt_aliases(&receipt, values, meaning, None)? {
                            if !direct_aliases.contains_key(alias.as_str())
                                && let Some(matched) = wanted_aliases.remove(alias.as_str())
                            {
                                *matched = true;
                            }
                        }
                    }
                    if !wanted_individuals.is_empty() {
                        if let Some(ObserverSubject::Individual { individual_id }) =
                            &entry.receipt.header.subject_identity
                            && let Some(matched) = wanted_individuals.remove(individual_id.as_str())
                        {
                            *matched = true;
                        }
                        for field in entry
                            .receipt
                            .facets
                            .iter()
                            .filter(|field| eligible(field.member_index))
                        {
                            if let Some(id) = values
                                .value_at(&field.value_ref)
                                .and_then(temporal_value_individual_id)
                                && let Some(matched) = wanted_individuals.remove(id)
                            {
                                *matched = true;
                            }
                        }
                    }
                    if wanted_aliases.is_empty() && wanted_individuals.is_empty() {
                        return Ok(());
                    }
                }
            }
            Ok(())
        };
    for page in actor.pages() {
        inspect(page.metadata(), &mut page.batches(), page.payload().len())?;
    }
    for page in actor.pending_pages() {
        let bytes = usize::try_from(page.metadata().entry_bytes).map_err(|_| invalid())?;
        inspect(page.metadata(), &mut std::iter::once(page.batch()), bytes)?;
    }
    Ok(())
}
