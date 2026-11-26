//! Revocation withdraws only supported urgency/direct cues and relation proof.
//! The next actual attention opportunity still owns competition and recording.
use super::*;
use crate::attention::AttentionState;
fn revoked(
    fact: Option<&ObservationFactKey>,
    affected: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let Some(fact) = fact else {
        return Ok(false);
    };
    if affected.is_empty() {
        return Ok(false);
    }
    let bytes = crate::encoding::json_record_len(fact).map_err(|_| ExecutionError::Invariant)?;
    // At most the fact/source encodings and its shorter personal alias coexist;
    // each serializer buffer grows below twice its final byte length.
    let _encoding = budget.reserve(bytes.checked_mul(6).ok_or(ExecutionError::Capacity)?)?;
    Ok(affected.contains(&fact.source.id)
        || affected.contains(&crate::experience::personal_fact_alias(
            &fact.source.id,
            fact.ordinal,
        )?)
        || affected
            .contains(&crate::encoding::json_record(fact).map_err(|_| ExecutionError::Invariant)?)
        || affected.contains(
            &crate::encoding::json_record(&fact.source).map_err(|_| ExecutionError::Invariant)?,
        ))
}
fn mark(state: &mut AttentionState, key: &str) -> Result<(), ExecutionError> {
    state.relation_revision = state
        .relation_revision
        .checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    state
        .relation_dirty
        .insert(key.to_owned(), state.relation_revision);
    Ok(())
}
pub(super) fn revoke_attention(
    core: &mut CoreMutation<'_>,
    observer: &str,
    affected: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(attention) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .and_then(|owner| owner.attention.as_ref())
    else {
        return Ok(());
    };
    let mut changed = false;
    for value in attention.annotations.values() {
        changed |= revoked(value.urgency_source.as_ref(), affected, budget)?
            || revoked(value.direct_source.as_ref(), affected, budget)?;
    }
    for latch in attention.latches.values() {
        changed |= !affected.is_empty() && latch.clear_since.is_some();
        for fact in latch
            .entry_proof
            .iter()
            .chain(&latch.newest_proof)
            .flatten()
        {
            changed |= revoked(Some(fact), affected, budget)?;
        }
    }
    if !changed {
        return Ok(());
    }
    // Each actual relation key may be added once. Both dirty/scans maps remain
    // in the same sparse attention before-image owned by CurrentJournal.
    let _temporary = budget.reserve(
        attention
            .latches
            .keys()
            .try_fold(
                crate::host::retained_size::map_storage::<String, u64>(
                    attention
                        .relation_dirty
                        .len()
                        .checked_add(attention.latches.len())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
                |n, key| n.checked_add(key.len()),
            )
            .ok_or(ExecutionError::Capacity)?,
    )?;
    core.journal.current.reserve_growth(_temporary.bytes())?;
    core.journal.current.invalidate_attention_work(observer)?;
    let state = core
        .journal
        .current
        .attention_mut(&mut core.state.reception, observer)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    for value in state.annotations.values_mut() {
        if revoked(value.urgency_source.as_ref(), affected, budget)? {
            value.urgency = 0.0;
            value.urgency_through = None;
            value.urgency_source = None;
        }
        if revoked(value.direct_source.as_ref(), affected, budget)? {
            value.direct = false;
            value.direct_through = None;
            value.direct_source = None;
        }
    }
    // Split borrows explicitly to preserve the Source double increment when an
    // active all-clear interval and its proof are revoked in the same call.
    let keys = state.latches.keys().cloned().collect::<Vec<_>>();
    for key in keys {
        let latch = state
            .latches
            .get_mut(&key)
            .ok_or(ExecutionError::Invariant)?;
        let clear_active =
            !affected.is_empty() && latch.clear_since.take().is_some() && latch.active;
        let mut proof = false;
        for fact in latch
            .entry_proof
            .iter()
            .chain(&latch.newest_proof)
            .flatten()
        {
            proof |= revoked(Some(fact), affected, budget)?;
        }
        if clear_active {
            mark(state, &key)?;
        }
        if proof {
            let latch = state
                .latches
                .get_mut(&key)
                .ok_or(ExecutionError::Invariant)?;
            latch.active = false;
            latch.entry_proof = None;
            latch.newest_proof = None;
            latch.entered_at = None;
            latch.witness_id = None;
            latch.clear_since = None;
            mark(state, &key)?;
            state.relation_scans.shift_remove(&key);
        }
    }
    core.journal
        .current
        .settle_attention(&mut core.state.reception, observer)?;
    Ok(())
}
