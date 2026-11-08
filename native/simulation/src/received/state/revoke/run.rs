//! Source-ordered temporal privacy phases. Page/current recording edits and
//! sparse support release each run their actual world identity retirement.

use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::KnownPlaceMutation;
use crate::received::{
    plan_current_recording_revocation, received_record_account_aliases, temporal_receipt_aliases,
    temporal_value_individual_id,
};
use crate::reception::{ObserverSubject, current_groups_set_recording};
use crate::worlds::{IndividualPruneMode, prune_selected_observer_individuals};

pub(crate) struct ReleasedTemporalProofs {
    pub sources: Vec<String>,
    _reservation: ByteReservation,
}

pub(crate) fn invalidate_temporal_facets(
    core: &mut CoreMutation<'_>,
    actor: &str,
    revoked: &TemporalFacetRevocation<'_>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let installed = Arc::clone(&core.state.installed);
    let meaning = installed.account_law();
    let values = core
        .state
        .reception
        .received_values
        .as_ref()
        .ok_or_else(invalid)?;
    let pages = core
        .state
        .temporal
        .revoke_physical_facets(actor, values, &meaning, revoked, budget)?;
    let recordings = plan_current_recording_revocation(
        core.state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(actor)),
        values,
        revoked,
        &meaning,
        budget,
    )?;
    core.state
        .temporal
        .release_terminal_reservation(actor, recordings.refund)?;
    if !recordings.updates.is_empty() {
        current_groups_set_recording(
            &mut core.journal.current,
            &mut core.state.reception,
            actor,
            &recordings.updates,
        )?;
    }
    prune_selected_observer_individuals(
        core,
        actor,
        &pages.individual_candidates,
        IndividualPruneMode::RecentRetirement,
        budget,
    )?;
    Ok(())
}

pub(crate) fn invalidate_temporal_evidence(
    core: &mut CoreMutation<'_>,
    actor: &str,
    affected: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<ReleasedTemporalProofs, ExecutionError> {
    let Some(history) = core.state.temporal.actor(actor) else {
        return Ok(ReleasedTemporalProofs {
            sources: Vec::new(),
            _reservation: budget.reserve(0)?,
        });
    };
    if !history.complete_pages
        || !history.pending_pages.is_empty()
        || history
            .supports
            .as_ref()
            .is_none_or(|supports| !supports.coverage().complete)
    {
        return Err(invalid().into());
    }
    let installed = Arc::clone(&core.state.installed);
    let meaning = installed.account_law();
    let values = core
        .state
        .reception
        .received_values
        .as_ref()
        .ok_or_else(invalid)?;
    let mut bytes = size_of::<ReleasedTemporalProofs>();
    let mut count = 0usize;
    for page in history.pages.values() {
        bytes = heap_sum([
            bytes,
            page.payload().len().checked_mul(4).ok_or_else(capacity)?,
            page.metadata()
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(4)
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        for batch in page.batches() {
            for entry in &batch.entries {
                count = count.checked_add(1).ok_or_else(capacity)?;
                bytes = bytes
                    .checked_add(
                        batch
                            .locator(entry.entry_index)
                            .id_len()
                            .ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?;
            }
        }
    }
    for support in history.supports.as_ref().ok_or_else(invalid)?.records() {
        bytes = heap_sum([
            bytes,
            support
                .payload()
                .len()
                .checked_mul(8)
                .ok_or_else(capacity)?,
            size_of::<Arc<crate::received::TemporalSupportRecord>>(),
            support.capsule().receipt.id.len(),
        ])
        .ok_or_else(capacity)?;
        count = count.checked_add(1).ok_or_else(capacity)?;
    }
    let reservation = budget.reserve(
        bytes
            .checked_add(
                count
                    .checked_mul(size_of::<String>())
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?,
    )?;
    let mut sources = Vec::new();
    sources.try_reserve_exact(count).map_err(|_| capacity())?;
    for page in history.pages.values() {
        for batch in page.batches() {
            for entry in &batch.entries {
                if received_record_account_aliases(batch, entry, values, &meaning)?
                    .iter()
                    .any(|id| affected.contains(*id))
                {
                    sources.push(batch.locator(entry.entry_index).id());
                }
            }
        }
    }
    // Facet edits and their prune precede sparse support removal, preserving the
    // intermediate current/identity lifetime seen by the Source implementation.
    invalidate_temporal_facets(
        core,
        actor,
        &TemporalFacetRevocation::Sources(affected),
        budget,
    )?;
    let values = core
        .state
        .reception
        .received_values
        .as_ref()
        .ok_or_else(invalid)?;
    let mut supports = Vec::new();
    supports.try_reserve_exact(count).map_err(|_| capacity())?;
    let mut candidates = IndexSet::new();
    if let Some(history) = core.state.temporal.actor(actor) {
        for support in history.supports.as_ref().ok_or_else(invalid)?.records() {
            let capsule = support.capsule();
            if temporal_receipt_aliases(&capsule.receipt, values, &meaning, Some(&capsule.values))?
                .iter()
                .any(|id| affected.contains(id))
            {
                if let Some(ObserverSubject::Individual { individual_id }) =
                    &capsule.receipt.header.subject_identity
                {
                    candidates.insert(individual_id.clone());
                }
                candidates.extend(
                    capsule
                        .values
                        .iter()
                        .filter_map(temporal_value_individual_id)
                        .map(str::to_owned),
                );
                supports.push(Arc::clone(support));
            }
        }
    }
    let now = core.state.physical.header.sim_time;
    for support in supports {
        let id = &support.capsule().receipt.id;
        core.state.temporal.release_support(
            actor,
            id,
            now,
            &installed.attention.value().retention,
            Some(KnownPlaceMutation {
                state: &mut core.state.experience,
                journal: &mut core.journal.experience,
                limits: &installed.personal_evidence_preparation,
                budget,
            }),
        )?;
        sources.push(id.clone());
    }
    prune_selected_observer_individuals(
        core,
        actor,
        &candidates,
        IndividualPruneMode::RecentRetirement,
        budget,
    )?;
    Ok(ReleasedTemporalProofs {
        sources,
        _reservation: reservation,
    })
}
