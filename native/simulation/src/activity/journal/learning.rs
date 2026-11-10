//! The same sparse activity journal owns learning publication and privacy edits.
//! Immutable body guards stay with each record after undo is destroyed.
use super::*;
use crate::activity::learning::{LearningAcquisition, LearningMethod};
use std::sync::Arc;

impl ActivityJournal {
    pub(crate) fn insert_learning_method(
        &mut self,
        state: &mut ActivityState,
        method: Arc<LearningMethod>,
    ) -> Result<(), ActivityError> {
        if state.library.methods.contains_key(method.id()) {
            return Err(ActivityError::InvalidStructure);
        }
        if state.library.methods.len() as u64 >= state.limits.definitions {
            return Err(ActivityError::Capacity);
        }
        let growth = state.library.metadata_growth_bound(None, method.id())?;
        self.reserve(
            growth
                .checked_add(
                    method
                        .id()
                        .len()
                        .checked_mul(2)
                        .ok_or(ActivityError::Capacity)?,
                )
                .ok_or(ActivityError::Capacity)?,
        )?;
        self.prepare_undo_slots(1)?;
        let before = state.library.before(None, Some(method.id()))?;
        let id = method.id().to_owned();
        self.push(ActivityUndo::MethodInsert { id: id.clone() })?;
        state
            .library
            .methods
            .try_reserve(1)
            .map_err(|_| ActivityError::Capacity)?;
        state.library.methods.insert(id.clone(), method);
        state
            .library
            .settle(before, None, Some(&id), &mut self.reservation)
    }
    pub(crate) fn replace_learning_acquisition(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        id: &str,
        record: Arc<LearningAcquisition>,
    ) -> Result<(), ActivityError> {
        if !state.library.methods.contains_key(id)
            || record
                .body()
                .get("methodId")
                .and_then(crate::records::SqlCell::as_str)
                != Some(id)
            || record
                .body()
                .get("actorId")
                .and_then(crate::records::SqlCell::as_str)
                != Some(actor)
        {
            return Err(ActivityError::InvalidStructure);
        }
        if state.library.acquisitions.get(actor).is_some_and(|owner| {
            !owner.contains_key(id) && owner.len() as u64 >= state.limits.acquisitions
        }) {
            return Err(ActivityError::Capacity);
        }
        let growth = state.library.metadata_growth_bound(Some(actor), id)?;
        self.reserve(
            growth
                .checked_add(actor.len())
                .and_then(|n| n.checked_add(id.len()))
                .ok_or(ActivityError::Capacity)?,
        )?;
        self.prepare_undo_slots(1)?;
        let new_owner = !state.library.acquisitions.contains_key(actor);
        let old = state
            .library
            .acquisitions
            .get(actor)
            .and_then(|owner| owner.get_full(id));
        if let Some((_, _, record)) = old {
            record.retain(&state.budget)?;
        }
        let before = old.map(|(at, _, record)| (at, Arc::clone(record)));
        let metadata = state.library.before(Some(actor), Some(id))?;
        self.push(ActivityUndo::Acquisition {
            actor: actor.to_owned(),
            id: id.to_owned(),
            before,
            new_owner,
        })?;
        if new_owner {
            state
                .library
                .acquisitions
                .try_reserve(1)
                .map_err(|_| ActivityError::Capacity)?;
            state
                .library
                .acquisitions
                .insert(actor.to_owned(), IndexMap::new());
        }
        let owner = state
            .library
            .acquisitions
            .get_mut(actor)
            .ok_or(ActivityError::InvalidStructure)?;
        if !owner.contains_key(id) {
            owner.try_reserve(1).map_err(|_| ActivityError::Capacity)?;
        }
        if let Some(old) = owner.get_mut(id) {
            *old = record;
        } else {
            owner.insert(id.to_owned(), record);
        }
        state
            .library
            .settle(metadata, Some(actor), Some(id), &mut self.reservation)
    }
    pub(crate) fn replace_learning_cursor(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        cursor: LearningCursor,
    ) -> Result<(), ActivityError> {
        let old = state
            .learning
            .get(actor)
            .ok_or(ActivityError::InvalidStructure)?;
        if old == &cursor {
            return Ok(());
        }
        if cursor.assessed.len() as u64 > state.limits.assessed
            || crate::encoding::json_record_len(&cursor.assessed)
                .map_err(|_| ActivityError::InvalidStructure)? as u64
                > state.limits.assessment_bytes
            || cursor.pending.len() as u64 > state.limits.page
            || cursor
                .examined
                .as_ref()
                .is_some_and(|examined| examined.len() as u64 > state.limits.visits)
        {
            return Err(ActivityError::Capacity);
        }
        self.reserve(
            cursor
                .heap_bytes()
                .ok_or(ActivityError::Capacity)?
                .checked_add(actor.len())
                .ok_or(ActivityError::Capacity)?,
        )?;
        let metadata = super::super::residency::MetadataBefore::capture(state, Some(actor), &[])?;
        self.learning_before(state, actor)?;
        state.learning.insert(actor.to_owned(), cursor);
        state.settle_metadata(metadata, Some(actor), &[], &mut self.reservation)
    }
    pub(super) fn revoke_learning_supports(
        &mut self,
        state: &mut ActivityState,
        actor: &str,
        selected: &indexmap::IndexSet<String>,
    ) -> Result<(), ActivityError> {
        let count = state
            .library
            .acquisitions
            .get(actor)
            .map_or(0, IndexMap::len);
        for ordinal in 0..count {
            let (id, record) = state
                .library
                .acquisitions
                .get(actor)
                .and_then(|owner| owner.get_index(ordinal))
                .ok_or(ActivityError::InvalidStructure)?;
            let supports = record
                .body()
                .get("supports")
                .and_then(crate::records::SqlCell::as_array)
                .ok_or(ActivityError::InvalidStructure)?;
            if !supports.iter().any(|support| {
                support
                    .get("revoked")
                    .and_then(crate::records::SqlCell::as_bool)
                    != Some(true)
                    && ["occurrenceIds", "evidenceIds"].iter().any(|field| {
                        support
                            .get(field)
                            .and_then(crate::records::SqlCell::as_array)
                            .is_some_and(|ids| {
                                ids.iter()
                                    .any(|id| id.as_str().is_some_and(|id| selected.contains(id)))
                            })
                    })
            }) {
                continue;
            }
            let mut copy = state
                .budget
                .reserve(
                    record
                        .body()
                        .heap_bytes()
                        .and_then(|n| n.checked_add(id.len()))
                        .and_then(|n| {
                            n.checked_add(
                                std::mem::size_of::<LearningAcquisition>()
                                    + 2 * std::mem::size_of::<usize>(),
                            )
                        })
                        .ok_or(ActivityError::Capacity)?,
                )
                .map_err(|_| ActivityError::Capacity)?;
            let id = id.clone();
            let mut body = record.body().clone();
            let crate::records::SqlCell::Object(object) = &mut body else {
                return Err(ActivityError::UnsupportedFamily);
            };
            let Some(crate::records::SqlCell::Array(supports)) = object.get_mut("supports") else {
                return Err(ActivityError::InvalidStructure);
            };
            for support in supports {
                let affected = ["occurrenceIds", "evidenceIds"].iter().any(|field| {
                    support
                        .get(field)
                        .and_then(crate::records::SqlCell::as_array)
                        .is_some_and(|ids| {
                            ids.iter()
                                .any(|id| id.as_str().is_some_and(|id| selected.contains(id)))
                        })
                });
                if affected {
                    let crate::records::SqlCell::Object(fields) = support else {
                        return Err(ActivityError::UnsupportedFamily);
                    };
                    fields.insert("revoked".into(), true.into());
                }
            }
            let method = body
                .get("methodId")
                .and_then(crate::records::SqlCell::as_str)
                .and_then(|id| state.library.methods.get(id))
                .ok_or(ActivityError::InvalidStructure)?;
            let next = LearningAcquisition::new(
                body,
                actor,
                method,
                &state.language,
                &state.limits,
                copy.split_off(copy.bytes().saturating_sub(id.capacity()))
                    .map_err(|_| ActivityError::Capacity)?,
                &state.budget,
            )?;
            self.replace_learning_acquisition(state, actor, &id, next)?;
        }
        Ok(())
    }
}
