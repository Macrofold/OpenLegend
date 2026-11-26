//! Capture only occurrence views actually referenced by this actor's visible
//! practice progress. The present record must bind the exact event and family.
//! A missing resident description leaves the retained practice support intact.

use super::*;
use std::collections::BTreeSet;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PracticeRecord<'a> {
    pub(super) key: &'a str,
    pub(super) view: &'a crate::activity::ActivityView,
}
pub(super) fn practice_records<'a>(
    state: &'a SimulationState,
    actor: &'a crate::state::Entity,
    budget: &ByteBudget,
) -> Result<(Vec<PracticeRecord<'a>>, ByteReservation), ExecutionError> {
    let progress = actor
        .actor
        .as_ref()
        .and_then(|actor| actor.practice.as_ref());
    let count = state
        .installed
        .attributes
        .values()
        .try_fold(0usize, |count, definition| {
            count
                .checked_add(if definition.value().practice.is_some() {
                    progress
                        .and_then(|progress| progress.get(&definition.value().id))
                        .map_or(0, |p| p.releases.len())
                } else {
                    0
                })
                .ok_or(ExecutionError::Capacity)
        })?;
    let bytes = count
        .checked_mul(size_of::<PracticeRecord<'_>>())
        .and_then(|n| {
            n.checked_add(
                count.checked_mul(crate::host::retained_size::tree_node_bound::<&str, ()>()?)?,
            )
        })
        .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(bytes)?;
    let mut records = Vec::new();
    records
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut seen = BTreeSet::new();
    for definition in state.installed.attributes.values() {
        let Some(profile) = &definition.value().practice else {
            continue;
        };
        let Some(progress) = progress.and_then(|progress| progress.get(&definition.value().id))
        else {
            continue;
        };
        for support in &progress.releases {
            match state
                .activity
                .occurrence_by_id(&actor.id, &support.occurrence_id)
            {
                Ok(Some(occurrence)) => {
                    if occurrence.revoked == Some(true)
                        || occurrence.release.as_ref().is_none_or(|release| {
                            !release.supports(&support.event_id, &profile.family)
                        })
                    {
                        return Err(ExecutionError::Activity(
                            crate::activity::ActivityError::InvalidStructure,
                        ));
                    }
                    if seen.insert(support.occurrence_id.as_str()) {
                        records.push(PracticeRecord {
                            key: &support.occurrence_id,
                            view: &occurrence.view,
                        });
                    }
                }
                Ok(None) | Err(crate::activity::ActivityError::Unavailable) => {}
                Err(error) => return Err(ExecutionError::Activity(error)),
            }
        }
    }
    Ok((records, reservation))
}
