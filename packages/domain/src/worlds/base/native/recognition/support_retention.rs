//! Sparse proof is held by actual learned identity, notepad and selected-world
//! recognition keys. This is the same Base law used by recent retirement.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::KnowledgeSubject;
use std::mem::size_of;

pub(crate) struct HeldSupportAliases {
    pub(crate) keys: IndexSet<String>,
    _storage: ByteReservation,
}

pub(crate) fn held_support_aliases(
    core: &CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<HeldSupportAliases, ExecutionError> {
    let identities = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|owners| owners.get(observer));
    let documents = core
        .state
        .reception
        .actor_knowledge
        .as_ref()
        .and_then(|owners| owners.get(observer));
    let mut count = 0usize;
    let mut strings = 0usize;
    let mut text = |key: &str| -> Result<(), ExecutionError> {
        count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
        strings = strings
            .checked_add(key.len().checked_mul(6).ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?;
        Ok(())
    };
    if let Some(identities) = identities {
        for (id, identity) in identities.iter() {
            text(id)?;
            for key in super::journal::support_keys(identity) {
                text(key)?;
            }
        }
    }
    if let Some(documents) = documents {
        for document in documents.values() {
            if let Some(KnowledgeSubject::Individual { individual_id }) = &document.subject_id {
                text(individual_id)?;
            }
            for key in &document.evidence_ids {
                text(key)?;
            }
        }
    }
    for id in core.state.minds.pinned_individuals(observer) {
        text(id)?;
    }
    let _storage = budget.reserve(
        heap_sum([
            strings,
            map_storage::<String, ()>(count.checked_mul(8).ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
            count
                .checked_mul(8 * size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let candidates: IndexSet<String> = identities
        .into_iter()
        .flat_map(|owner| owner.keys().cloned())
        .collect();
    let mut pinned: IndexSet<String> = core
        .state
        .minds
        .pinned_individuals(observer)
        .map(str::to_owned)
        .collect();
    if let Some(documents) = documents {
        for document in documents.values() {
            if !document.text.trim_is_empty() {
                if let Some(KnowledgeSubject::Individual { individual_id }) = &document.subject_id {
                    pinned.insert(individual_id.clone());
                }
            }
        }
    }
    let mut keys =
        super::prune::retained_identity_evidence_keys(core, observer, &candidates, &pinned);
    if let Some(documents) = documents {
        for document in documents.values() {
            keys.extend(document.evidence_ids.iter().cloned());
        }
    }
    // The current native learned-capability owner admits only the actual empty
    // Source collection. Nonempty recipe records refuse installation;
    // they are never treated as an absent support dependency here.
    let source_keys: Vec<String> = keys.iter().cloned().collect();
    let parsing = recognition_support_allocation_bound(&source_keys)
        .and_then(|bound| bound.bytes())
        .ok_or(ExecutionError::Capacity)?;
    let _parsing = budget.reserve(parsing)?;
    keys.extend(
        recognition_support_source_ids(&source_keys).map_err(|_| ExecutionError::Invariant)?,
    );
    Ok(HeldSupportAliases { keys, _storage })
}
