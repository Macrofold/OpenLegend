//! Correct only received geometry whose original proof was revoked. Terrain and
//! other observers' geometry never supply a replacement personal fact.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, retained_size::HeapBytes};
use indexmap::IndexSet;
fn revoked(id: &str, ordinal: u64, affected: &IndexSet<String>) -> Result<bool, ExecutionError> {
    Ok(affected.contains(id)
        || ["awareness:", "memory:", "summary:"]
            .iter()
            .any(|prefix| affected.contains(&format!("{prefix}{id}")))
        || affected.contains(&crate::experience::personal_fact_alias(id, ordinal)?))
}
pub(crate) fn revoke_received_geometry_evidence(
    core: &mut CoreMutation<'_>,
    observer: &str,
    affected: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(owner) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
    else {
        return Ok(());
    };
    let Some(prior) = &owner.geometry else {
        return Ok(());
    };
    let life = owner.life;
    let count = prior
        .fragments
        .len()
        .checked_add(prior.boundaries.len())
        .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(
        prior
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?
            .checked_add(
                crate::host::retained_size::map_storage::<String, ()>(count)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| {
                n.checked_add(prior.fragments.iter().try_fold(0usize, |n, feature| {
                    n.checked_add(feature.observation.id.len())
                })?)
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut removed = IndexSet::new();
    for feature in &prior.fragments {
        if revoked(&feature.observation.id, 0, affected)? {
            removed.insert(feature.observation.id.clone());
        }
    }
    let mut keep = Vec::new();
    keep.try_reserve_exact(prior.boundaries.len())
        .map_err(|_| ExecutionError::Capacity)?;
    for feature in &prior.boundaries {
        let valid = match feature.observation.facets.first().map(|facet| &facet.value) {
            Some(SensoryFacet::PhysicalBoundary { boundary }) => {
                !revoked(&feature.observation.id, 0, affected)?
                    && [
                        &boundary.near_surface.support,
                        &boundary.far_surface.support,
                    ]
                    .iter()
                    .try_fold(true, |valid, support| {
                        Ok::<_, ExecutionError>(
                            valid
                                && !removed.contains(&support.source.id)
                                && !revoked(&support.source.id, support.ordinal, affected)?,
                        )
                    })?
            }
            _ => false,
        };
        keep.push(valid);
    }
    if removed.is_empty() && keep.iter().all(|keep| *keep) {
        return Ok(());
    }
    let mut next = prior.clone();
    let lease = core
        .journal
        .acquisitions
        .begin_received(observer, life, None)?;
    for feature in &next.fragments {
        if removed.contains(&feature.observation.id) {
            recording::close_geometry_feature(
                core,
                observer,
                &feature.observation,
                feature.recording.as_ref(),
                next.supported_through,
                crate::received::TemporalChange::Unchecked,
                budget,
            )?;
        }
    }
    for (feature, keep) in next.boundaries.iter().zip(&keep) {
        if !keep {
            recording::close_geometry_feature(
                core,
                observer,
                &feature.observation,
                feature.recording.as_ref(),
                next.supported_through,
                crate::received::TemporalChange::Unchecked,
                budget,
            )?;
        }
    }
    let mut at = 0;
    next.boundary_keys.retain(|_| {
        let selected = keep[at];
        at += 1;
        selected
    });
    let mut at = 0;
    next.boundaries.retain(|_| {
        let selected = keep[at];
        at += 1;
        selected
    });
    next.fragments
        .retain(|feature| !removed.contains(&feature.observation.id));
    next.bytes = next
        .fragments
        .iter()
        .map(|feature| &feature.observation)
        .chain(next.boundaries.iter().map(|feature| &feature.observation))
        .try_fold(0u64, |n, observation| {
            n.checked_add(crate::encoding::json_record_len(observation).ok()? as u64)
        })
        .ok_or(ExecutionError::Capacity)?;
    next.generation = next
        .generation
        .checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    next.finished = false;
    next.unknown = true;
    next.complete = false;
    next.feature_cursor = None;
    core.journal
        .current
        .replace_geometry(&mut core.state.reception, observer, next)?;
    attention_control::dirty_attention_relations(
        &core.state.physical,
        &mut core.state.reception,
        &mut core.journal.current,
        observer,
        &[crate::attention::AttentionRelationFamily::ClosingDrop],
    )?;
    retirement::finish_received(core, lease)
}
