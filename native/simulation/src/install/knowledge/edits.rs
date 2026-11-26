//! Actual recipe grants and sparse SQL projection share the affected actor's
//! ordered capability list. An accepted grant owns its separately retained
//! proof. Failure restores the list alongside the receiving owner.
use super::*;
use crate::execution::ExecutionError;
use crate::host::ByteReservation;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder, SelectedPlacement,
    SqlCell, encode_marked_owners,
};
use std::mem::size_of;

const OWNERS: &str = "mind_learned_capabilities_owners";
const GRANTS: &str = "mind_learned_capabilities";

struct Before {
    actor: String,
    prior: Option<LearnedOwner>,
    _storage: ByteReservation,
}

#[derive(Default)]
pub(crate) struct LearnedJournal {
    edits: Vec<Before>,
}

impl LearnedJournal {
    pub(crate) fn checkpoint(&self) -> usize {
        self.edits.len()
    }

    pub(crate) fn insert(
        &mut self,
        state: &mut LearnedCapabilities,
        actor: &str,
        grant: Grant,
        custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if state.known_recipes(actor).contains(&grant.recipe_id)
            || custody.bytes() < grant_bound(&grant).ok_or(ExecutionError::Capacity)?
        {
            return Err(ExecutionError::Invariant);
        }
        let added = Arc::new(FundedGrant {
            grant,
            _storage: budget.adopt_record(custody)?,
        });
        self.replace(state, actor, |_| true, Some(added), budget)
    }

    pub(crate) fn remove(
        &mut self,
        state: &mut LearnedCapabilities,
        actor: &str,
        keep: impl Fn(&Grant) -> bool,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.replace(state, actor, keep, None, budget)
    }

    fn replace(
        &mut self,
        state: &mut LearnedCapabilities,
        actor: &str,
        keep: impl Fn(&Grant) -> bool,
        added: Option<Arc<FundedGrant>>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let edits = budget.reserve(4 * size_of::<Before>() + actor.len())?;
        self.edits
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let prior = state.owners.get(actor);
        let grants = prior
            .into_iter()
            .flat_map(|prior| prior.grants.iter())
            .filter(|grant| keep(&grant.grant))
            .chain(added.iter());
        let count = grants.clone().count();
        let keys = grants
            .clone()
            .try_fold(0usize, |bytes, grant| {
                bytes.checked_add(grant.grant.recipe_id.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage =
            budget.reserve_record(owner_bound(count, keys).ok_or(ExecutionError::Capacity)?)?;
        if let Some(prior) = prior {
            budget.retain_record(&prior._storage)?;
            for before in prior.grants.iter().filter(|before| !keep(&before.grant)) {
                budget.retain_record(&before._storage)?;
            }
        }
        let mut recipes = Vec::with_capacity(count);
        let mut next = Vec::with_capacity(count);
        for grant in grants {
            recipes.push(grant.grant.recipe_id.clone());
            next.push(Arc::clone(grant));
        }
        let created = prior.is_none();
        if created {
            // Keep the actual allocation estimate after removals. IndexMap
            // reports insertion room, which can change without freeing memory.
            let previous = state.storage.bytes();
            let growth = if state.owners.len() == state.owners.capacity() {
                let target = state
                    .owners
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or(ExecutionError::Capacity)?
                    .max(3);
                Some((
                    target,
                    map_storage::<String, LearnedOwner>(target).ok_or(ExecutionError::Capacity)?,
                ))
            } else {
                None
            };
            let map_bytes = growth.map_or(state.map_bytes, |(_, bound)| state.map_bytes.max(bound));
            let bytes = previous
                .checked_add(actor.len())
                .and_then(|n| n.checked_add(map_bytes - state.map_bytes))
                .ok_or(ExecutionError::Capacity)?;
            budget.resize_backing(&mut state.storage, bytes)?;
            state.map_bytes = map_bytes;
            if let Some((target, _)) = growth
                && state
                    .owners
                    .try_reserve_exact(target - state.owners.len())
                    .is_err()
            {
                // Either backing may already have grown on a failed reserve.
                state.storage.resize(bytes - actor.len())?;
                return Err(ExecutionError::Capacity);
            }
        }
        let next = LearnedOwner {
            recipes,
            grants: next,
            _storage: storage,
        };
        let prior = if let Some(previous) = state.owners.get_mut(actor) {
            Some(std::mem::replace(previous, next))
        } else {
            state.owners.insert(actor.into(), next);
            None
        };
        self.edits.push(Before {
            actor: actor.into(),
            prior,
            _storage: edits,
        });
        Ok(())
    }

    pub(crate) fn rollback_to(
        &mut self,
        state: &mut LearnedCapabilities,
        at: usize,
    ) -> Result<(), ExecutionError> {
        if at > self.edits.len() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while self.edits.len() > at {
            let edit = self.edits.pop().ok_or(ExecutionError::Invariant)?;
            if let Some(prior) = edit.prior {
                *state
                    .owners
                    .get_mut(&edit.actor)
                    .ok_or(ExecutionError::Invariant)? = prior;
            } else {
                let (_, key, _) = state
                    .owners
                    .shift_remove_full(&edit.actor)
                    .ok_or(ExecutionError::Invariant)?;
                state.storage.resize(
                    state
                        .storage
                        .bytes()
                        .checked_sub(key.capacity())
                        .ok_or(ExecutionError::Invariant)?,
                )?;
            }
        }
        Ok(())
    }

    pub(crate) fn encode(
        &self,
        state: &LearnedCapabilities,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        if self.edits.is_empty() {
            return Ok(());
        }
        let error =
            || RecordEncodingError("Learned recipe changes lack current placement or capacity.");
        let _selected = budget
            .reserve(
                map_storage::<&str, Option<&LearnedOwner>>(self.edits.len())
                    .and_then(|n| n.checked_mul(2))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut actors = IndexMap::new();
        for edit in &self.edits {
            actors
                .entry(edit.actor.as_str())
                .or_insert(edit.prior.as_ref());
        }
        // Every actor observed by this journal still owns a list, even when
        // forgetting removed the last learned grant.
        let owners = actors
            .iter()
            .map(|(actor, prior)| (*actor, prior.is_some()))
            .collect();
        encode_marked_owners(
            ledger,
            OWNERS,
            "knowledge",
            &owners,
            Some(&state.owners),
            false,
            true,
            output,
            budget,
        )?;
        for (actor, prior) in actors {
            let current = state.owners.get(actor).ok_or_else(error)?;
            let parent = ["world", "knowledge", actor];
            let _columns = budget.reserve(actor.len() + 64).map_err(|_| error())?;
            let columns = [SqlCell::from(actor)];
            for (position, grant) in current.grants.iter().enumerate() {
                if prior
                    .and_then(|prior| prior.grants.get(position))
                    .is_some_and(|before| Arc::ptr_eq(before, grant))
                {
                    continue;
                }
                let ordinal = position.to_string();
                let id = &grant.grant.recipe_id;
                let selected = SelectedPlacement::new(
                    ledger,
                    GRANTS,
                    &["world", "knowledge", actor, id],
                    &parent,
                    &ordinal,
                    position as u64,
                    !prior.is_some_and(|before| before.recipes.contains(id)),
                    budget,
                )?;
                output.write(
                    GRANTS,
                    selected.value(),
                    &grant.grant,
                    &columns,
                    selected.create(),
                    RowEffects::default(),
                )?;
            }
            if let Some(prior) = prior {
                for id in &prior.recipes {
                    if current.recipes.contains(id) {
                        continue;
                    }
                    let bytes =
                        crate::encoding::json_record_len(&["world", "knowledge", actor, id])
                            .map_err(|_| error())?;
                    let _id = budget.reserve(bytes).map_err(|_| error())?;
                    let row = crate::encoding::json_record(&["world", "knowledge", actor, id])
                        .map_err(|_| error())?;
                    output.delete(GRANTS, &row, false)?;
                }
            }
            let _parent = budget
                .reserve(6 * (actor.len() + 16) + size_of::<OwnerCoverage>())
                .map_err(|_| error())?;
            output.observe_owner(&OwnerCoverage {
                table: GRANTS.into(),
                owner: crate::encoding::json_record(&parent).map_err(|_| error())?,
                complete: true,
                next_ordinal: current.grants.len() as u64,
                parent_present: true,
            })?;
        }
        Ok(())
    }
}

impl LearnedCapabilities {
    pub(crate) fn acquired_grants(&self, actor: &str) -> impl Iterator<Item = &Grant> {
        self.owners
            .get(actor)
            .into_iter()
            .flat_map(|owner| owner.grants.iter())
            .map(|grant| &grant.grant)
            .filter(|grant| grant.source != GrantSource::Authored)
    }
}
