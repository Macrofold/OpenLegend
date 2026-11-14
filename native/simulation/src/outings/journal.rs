use super::*;
#[derive(Clone, Copy)]
pub(crate) struct OutingCheckpoint {
    at: usize,
    present: bool,
}
pub(super) struct OutingUndo {
    pub id: String,
    pub prior: Option<(usize, OutingRecord)>,
}
pub(crate) struct OutingJournal {
    pub(super) undo: Vec<OutingUndo>,
    allocation: ByteReservation,
    budget: ByteBudget,
}
impl OutingState {
    fn backing_bytes(&self) -> Result<usize, ExecutionError> {
        map_storage::<String, OutingRecord>(self.records.as_ref().map_or(0, IndexMap::capacity))
            .and_then(|n| n.checked_add(self.key_bytes))
            .ok_or(ExecutionError::Capacity)
    }
}
impl OutingJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            undo: Vec::new(),
            // CandidateJournal already funds this inline owner. Empty Vec has
            // no allocation; growth below admits the real undo buffer and IDs.
            allocation: budget.reserve(0)?,
            budget: budget.clone(),
        })
    }
    pub(crate) fn checkpoint(&self, state: &OutingState) -> OutingCheckpoint {
        OutingCheckpoint {
            at: self.undo.len(),
            present: state.is_present(),
        }
    }
    // The current-world family owner must check eligibility and links before
    // replacement. Each caller owns a CandidateJournal checkpoint: the candidate
    // ledger restores newly admitted pins after this semantic undo, including
    // refusal before a row change (execution.rs rollback_to/rollback_all).
    pub(super) fn replace(
        &mut self,
        state: &mut OutingState,
        id: &str,
        value: Option<OutingRecord>,
    ) -> Result<(), ExecutionError> {
        if value.as_ref().is_some_and(|v| v.id() != id) {
            return Err(ExecutionError::Invariant);
        }
        if let Some(value) = &value {
            state.index.check_replacement(value)?;
        }
        let rows = state.records.as_ref();
        let old = rows.and_then(|rows| rows.get(id));
        if old.is_none() && value.is_none() {
            return Ok(());
        }
        let new = value.is_some() && old.is_none();
        let capacity = rows.map_or(0, IndexMap::capacity);
        let count = rows.map_or(0, IndexMap::len);
        let prior_key = rows
            .and_then(|rows| rows.get_key_value(id))
            .map_or(0, |(key, _)| key.capacity());
        let desired = if new && count == capacity {
            capacity
                .checked_mul(2)
                .and_then(|n| n.checked_add(3))
                .ok_or(ExecutionError::Capacity)?
        } else {
            capacity
        };
        let keys = state
            .key_bytes
            .checked_add(if new { id.len() } else { 0 })
            .ok_or(ExecutionError::Capacity)?;
        if let Some(old) = old {
            self.budget.retain_record(&old.storage)?;
        }
        let prepared = (|| -> Result<(), ExecutionError> {
            self.allocation.resize(
                self.allocation
                    .bytes()
                    .checked_add(4 * size_of::<OutingUndo>())
                    .and_then(|n| n.checked_add(id.len().checked_mul(2)?))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.undo
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            self.budget.resize_backing(
                &mut state.backing,
                map_storage::<String, OutingRecord>(desired)
                    .and_then(|n| n.checked_add(keys))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            if let Some(rows) = &mut state.records {
                if new {
                    rows.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
                }
            } else {
                let mut rows = IndexMap::new();
                rows.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
                // Preserve None until the fallible new-root allocation succeeds.
                state.records = Some(rows);
            }
            Ok(())
        })();
        if let Err(error) = prepared {
            // Cancel only the forecast. A real allocator capacity that survived
            // a failed reserve remains charged until the candidate rolls back.
            state.backing.resize(state.backing_bytes()?)?;
            return Err(error);
        }
        let rows = state.records.as_mut().ok_or(ExecutionError::Invariant)?;
        let index = rows.get_index_of(id);
        let undo_id = id.to_owned();
        let entry_key = value.as_ref().map(|_| id.to_owned());
        let next_keys = if new {
            state.key_bytes.checked_add(
                entry_key
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .capacity(),
            )
        } else if value.is_none() {
            state.key_bytes.checked_sub(prior_key)
        } else {
            Some(state.key_bytes)
        }
        .ok_or(ExecutionError::Capacity)?;
        let prior = if let Some(value) = value {
            rows.insert(entry_key.ok_or(ExecutionError::Invariant)?, value)
        } else {
            rows.shift_remove(id)
        };
        // All admission/allocator fallibility above precedes the replacement.
        // Stage the before-image before any post-change settlement.
        self.undo.push(OutingUndo {
            id: undo_id,
            prior: index.zip(prior),
        });
        state.key_bytes = next_keys;
        if let Some((_, old)) = &self.undo.last().ok_or(ExecutionError::Invariant)?.prior {
            state.index.remove(old);
        }
        if let Some(value) = rows.get(id) {
            state.index.insert(value);
        }
        state.backing.resize(state.backing_bytes()?)?;
        Ok(())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut OutingState,
        checkpoint: OutingCheckpoint,
    ) -> Result<(), ExecutionError> {
        if checkpoint.at > self.undo.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.undo.len() > checkpoint.at {
            let OutingUndo { id, prior } = self.undo.pop().ok_or(ExecutionError::Invariant)?;
            let rows = state.records.as_mut().ok_or(ExecutionError::Invariant)?;
            if let Some((_, key, current)) = rows.shift_remove_full(&id) {
                state.key_bytes = state
                    .key_bytes
                    .checked_sub(key.capacity())
                    .ok_or(ExecutionError::Invariant)?;
                state.index.remove(&current);
            }
            if let Some((ordinal, prior)) = prior {
                state.index.insert(&prior);
                state.key_bytes = state
                    .key_bytes
                    .checked_add(id.capacity())
                    .ok_or(ExecutionError::Capacity)?;
                rows.shift_insert(ordinal, id, prior);
            }
        }
        if !checkpoint.present {
            state.records = None;
            state.key_bytes = 0;
        }
        let bytes = state.backing_bytes()?;
        if bytes > state.backing.bytes() {
            let growth = bytes - state.backing.bytes();
            self.budget
                .restore_backing(&mut state.backing, self.allocation.split_off(growth)?)?;
        }
        state.backing.resize(bytes)?;
        Ok(())
    }
}
