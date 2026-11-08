//! Withdrawal preserves old alarms but cannot preserve their live witnesses.
use super::*;

pub(crate) fn prune_withdrawn_attention(
    physical: &PhysicalState,
    reception: &mut ReceptionState,
    installed: &InstalledWorld,
    experience: &crate::experience::ExperienceState,
    journal: &mut CurrentJournal,
    observer: &str,
    source_ids: Option<&IndexSet<String>>,
    geometry_source_ids: Option<&IndexSet<String>>,
) -> Result<bool, ReceivedError> {
    let Some(current) = owner(reception, observer) else {
        return Ok(false);
    };
    let Some(prior) = current.attention.as_ref() else {
        return Ok(false);
    };
    journal.reserve_growth(
        heap_sum([
            prior
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(6)
                .ok_or_else(capacity)?,
            prior
                .annotations
                .len()
                .checked_mul(6 * size_of::<String>())
                .ok_or_else(capacity)?,
            map_storage::<String, u64>(
                prior
                    .annotations
                    .len()
                    .checked_mul(4)
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?,
    )?;
    let mut state = prior.clone();
    let mut removed = IndexSet::new();
    let mut withdrawn_tracks = IndexSet::new();
    let mut changed_anchors = IndexSet::new();
    let scope = CurrentBodyReadScope::prepare(
        reception,
        &physical.entities,
        installed,
        experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer,
    )?;
    for (key, annotation) in ordered_annotations(&state) {
        if source_ids.is_some_and(|sources| !sources.contains(&annotation.source_id)) {
            continue;
        }
        let source =
            received_attention_source(current, &annotation.source_id, &annotation.lease_id)?;
        let exposure = source
            .map(|source| current_facet_exposure(current, source))
            .transpose()?;
        if let (Some(source), Some(exposure)) = (source, exposure) {
            if scope
                .as_ref()
                .is_some_and(|scope| scope.channel_eligible(&source.grant.channel))
                && attention_subject_key(&annotation.source_id, &exposure).map_err(|_| invalid())?
                    == *key
                && exposure.observer == annotation.exposure.observer
            {
                if geometry_source_ids
                    .is_some_and(|sources| sources.contains(&annotation.source_id))
                {
                    changed_anchors.insert(key.clone());
                    withdrawn_tracks.insert(annotation.exposure.track.clone());
                }
                continue;
            }
        }
        removed.insert(key.clone());
        withdrawn_tracks.insert(annotation.exposure.track.clone());
    }
    if removed.is_empty() && changed_anchors.is_empty() {
        return Ok(false);
    }
    for key in &removed {
        state.annotations.shift_remove(key);
    }
    state.entries.retain(|entry| !removed.contains(&entry.key));
    state.explicit.retain(|key| !removed.contains(key));
    let mut revision = None;
    for family in [
        AttentionRelationFamily::ClosingBody,
        AttentionRelationFamily::ClosingDrop,
    ] {
        for key in &removed {
            let relation = relation_key(key, family)?;
            state.latches.shift_remove(&relation);
            state.relation_scans.shift_remove(&relation);
            state.relation_dirty.shift_remove(&relation);
        }
        for key in &changed_anchors {
            let relation = relation_key(key, family)?;
            state.relation_scans.shift_remove(&relation);
            if let Some(latch) = state.latches.get_mut(&relation) {
                latch.clear_since = None;
            }
            state.relation_dirty.insert(
                relation,
                next_revision(&mut revision, &mut state.relation_revision)?,
            );
        }
    }
    for (key, latch) in &mut state.latches {
        if latch
            .witness_id
            .as_ref()
            .is_some_and(|witness| withdrawn_tracks.contains(witness))
        {
            latch.clear_since = None;
            state.relation_scans.shift_remove(key);
            state.relation_dirty.insert(
                key.clone(),
                next_revision(&mut revision, &mut state.relation_revision)?,
            );
        }
    }
    *journal.attention_mut(reception, observer)? = Some(state);
    Ok(!removed.is_empty())
}
fn next_revision(owned: &mut Option<u64>, current: &mut u64) -> Result<u64, ReceivedError> {
    if let Some(revision) = owned {
        return Ok(*revision);
    }
    *current = current
        .checked_add(1)
        .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    *owned = Some(*current);
    Ok(*current)
}
