//! Quiet knowledge expiry is native-only; no account metadata or body query is
//! opened by its independent saved deadline.
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

pub(crate) struct KnowledgeRetentionCursor {
    actors: Vec<String>,
    next: usize,
    _storage: ByteReservation,
}
pub(crate) struct CompletedKnowledgeRetention {
    pub(crate) outcome: Outcome,
    _storage: ByteReservation,
}
impl KnowledgeRetentionCursor {
    pub(crate) fn new(actors: Vec<String>, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                size_of::<CompletedKnowledgeRetention>(),
                actors.heap_bytes().ok_or(ExecutionError::Capacity)?,
                "knowledge-retention".len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actors,
            next: 0,
            _storage: storage,
        })
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<Option<CompletedKnowledgeRetention>, ExecutionError> {
        if let Some(actor) = self.actors.get(self.next) {
            crate::worlds::base_recognition::maintain_recognition(core, actor, budget)?;
            self.next += 1;
            return Ok(None);
        }
        let storage = self
            ._storage
            .split_off(size_of::<CompletedKnowledgeRetention>() + "knowledge-retention".len())?;
        Ok(Some(CompletedKnowledgeRetention {
            // Technical operation status, not a world-authored action or text.
            outcome: Outcome {
                spent: None,
                outputs: None,
                ok: true,
                code: "knowledge-retention".to_owned(),
                message: "".into(),
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            },
            _storage: storage,
        }))
    }
}
