//! The rewind finalizer reads complete private owners and restores only their
//! operational revision floor. Source bodies stay with the ordinary journals.
use super::*;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::restore::RestorePrivacy;
impl ExperienceState {
    pub(crate) fn privacy_metadata_bound(&self) -> Option<usize> {
        let mut bytes =
            map_storage::<String, Vec<String>>(self.actors.len().checked_mul(2)?.checked_add(3)?)?
                .checked_add(map_storage::<String, IndexMap<String, String>>(
                    self.actors.len().checked_mul(2)?.checked_add(3)?,
                )?)?;
        for (id, actor) in &self.actors {
            bytes = bytes
                .checked_add(id.len().checked_mul(2)?)?
                .checked_add(actor.privacy.forgotten.heap_bytes()?)?
                .checked_add(actor.privacy.corrections.heap_bytes()?)?;
        }
        Some(bytes)
    }
    pub(crate) fn restore_privacy_metadata(&self) -> RestorePrivacy {
        let mut forgotten = IndexMap::new();
        let mut corrections = IndexMap::new();
        for (actor, history) in &self.actors {
            if !history.privacy.forgotten.is_empty() {
                forgotten.insert(actor.clone(), history.privacy.forgotten.clone());
            }
            if !history.privacy.corrections.is_empty() {
                corrections.insert(actor.clone(), history.privacy.corrections.clone());
            }
        }
        RestorePrivacy {
            forgotten,
            corrections,
        }
    }
}
impl ExperienceJournal {
    pub(crate) fn restore_privacy_revision(
        &mut self,
        state: &mut ExperienceState,
        actor: &str,
        floor: u64,
    ) -> Result<(), ExperienceError> {
        if floor > MAX_SAFE_INTEGER || !is_safe_record_id(actor) {
            return Err(ExperienceError::InvalidOrdinal);
        }
        if state.actors.get(actor).is_some_and(|actor| {
            actor
                .privacy
                .revision
                .is_some_and(|revision| revision >= floor)
        }) {
            return Ok(());
        }
        self.ensure_privacy_header(state, false)?;
        if !state.actors.contains_key(actor) {
            let before = super::residency::MetadataBefore::capture(state, actor)?;
            let growth = map_storage::<String, PersonalHistory>(
                state
                    .actors
                    .capacity()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(3))
                    .ok_or(ExperienceError::Capacity)?,
            )
            .ok_or(ExperienceError::Capacity)?;
            self.prepare_undo(
                growth
                    .checked_add(actor.len() * 3)
                    .ok_or(ExperienceError::Capacity)?,
            )?;
            state.fund_metadata(&mut self.reservation, growth + actor.len())?;
            state
                .actors
                .try_reserve(1)
                .map_err(|_| ExperienceError::Capacity)?;
            state.actors.insert(
                actor.to_owned(),
                PersonalHistory::install(
                    Vec::new(),
                    ActorPrivacy::install(Vec::new(), IndexMap::new(), None)?,
                    None,
                )?,
            );
            self.undo.push(super::mutation::ExperienceUndo::Privacy(
                super::privacy_mutation::PrivacyUndo::CreatedActor {
                    actor: actor.to_owned(),
                },
            ));
            state.settle_metadata(before, actor, 0, actor.len(), &mut self.reservation)?;
        }
        self.prepare_undo(actor.len())?;
        let privacy = &mut state
            .actors
            .get_mut(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy;
        let before = privacy.revision;
        privacy.revision = Some(floor.max(before.unwrap_or(0)));
        self.undo.push(super::mutation::ExperienceUndo::Privacy(
            super::privacy_mutation::PrivacyUndo::Revision {
                actor: actor.to_owned(),
                before,
            },
        ));
        Ok(())
    }
}
