//! Private semantic changes join the actual operation undo. These are accepted
//! invalidation facts, never replacement world revisions or perception effects.
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use indexmap::IndexMap;
use serde::Serialize;
use std::mem::size_of;

#[derive(PartialEq, Eq, Hash, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub(crate) enum SemanticNotice {
    State {
        entity_id: String,
        field: PrivateStateField,
    },
    Knowledge {
        actor_id: String,
    },
}
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum PrivateStateField {
    Appraisal,
}
impl SemanticNotice {
    pub(super) fn actor(&self) -> &str {
        match self {
            Self::State { entity_id, .. } => entity_id,
            Self::Knowledge { actor_id } => actor_id,
        }
    }
    pub(super) fn copy(&self) -> Self {
        match self {
            Self::State { entity_id, field } => Self::State {
                entity_id: entity_id.clone(),
                field: *field,
            },
            Self::Knowledge { actor_id } => Self::Knowledge {
                actor_id: actor_id.clone(),
            },
        }
    }
}
impl HeapBytes for SemanticNotice {
    fn heap_bytes(&self) -> Option<usize> {
        Some(match self {
            Self::State { entity_id, .. } => entity_id.capacity(),
            Self::Knowledge { actor_id } => actor_id.capacity(),
        })
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreparedSemanticNotices {
    pub changes: Vec<SemanticNotice>,
    pub conservative: bool,
    /// Source stateChangeRevision increments for every real changed() call,
    /// including both calls in an actual resolve operation.
    pub appraisal_revision: u64,
    #[serde(skip)]
    _reservation: ByteReservation,
}
impl PreparedSemanticNotices {
    pub(super) fn prepare<'a, I>(
        records: I,
        maximum_scopes: usize,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError>
    where
        I: Iterator<Item = &'a SemanticNotice> + Clone,
    {
        let count = records.clone().count().min(maximum_scopes);
        let longest_actor = records
            .clone()
            .map(|record| record.actor().len())
            .max()
            .unwrap_or(0);
        let bound = heap_sum([
            longest_actor
                .checked_mul(count)
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<&SemanticNotice, &SemanticNotice>(count)
                .ok_or(ExecutionError::Capacity)?,
            count
                .checked_mul(size_of::<SemanticNotice>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut reservation = budget.reserve(bound)?;
        let mut coalesced = IndexMap::with_capacity(count);
        let mut appraisal_revision = 0u64;
        let mut conservative = false;
        for record in records {
            if matches!(record, SemanticNotice::State { .. }) {
                appraisal_revision = appraisal_revision
                    .checked_add(1)
                    .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                    .ok_or(ExecutionError::Invariant)?;
            }
            // Source retains its first bounded set of distinct scopes; a
            // later repeat still replaces its entry without changing order.
            if !coalesced.contains_key(record) && coalesced.len() >= maximum_scopes {
                conservative = true;
                continue;
            }
            coalesced.insert(record, record);
        }
        let mut changes = Vec::with_capacity(coalesced.len());
        changes.extend(coalesced.values().map(|record| record.copy()));
        drop(coalesced);
        reservation.resize(changes.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok(Self {
            changes,
            conservative,
            appraisal_revision,
            _reservation: reservation,
        })
    }
}
