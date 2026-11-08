//! Sparse canonical privacy edits. The complete invalidation coordinator owns
//! dependency expansion and all receiver/cognition consequences; these writes
//! alone never certify that a privacy operation has completed.

use super::*;
use crate::host::retained_size::{map_storage, tree_node_bound};
use std::mem::size_of;

pub(super) enum PrivacyUndo {
    Revision {
        actor: String,
        before: Option<u64>,
    },
    Forgotten {
        actor: String,
        id: String,
        length: usize,
    },
    Correction {
        actor: String,
        id: String,
        before: Option<(usize, String)>,
    },
}
impl PrivacyUndo {
    pub(super) fn actor(&self) -> &str {
        match self {
            Self::Revision { actor, .. }
            | Self::Forgotten { actor, .. }
            | Self::Correction { actor, .. } => actor,
        }
    }
    pub(super) fn rollback(self, state: &mut ExperienceState) -> Result<(), ExperienceError> {
        let privacy = &mut state
            .actors
            .get_mut(self.actor())
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy;
        match self {
            Self::Revision { before, .. } => privacy.revision = before,
            Self::Forgotten { id, length, .. } => {
                if privacy.forgotten.len() != length + 1
                    || privacy.forgotten.last() != Some(&id)
                    || !privacy.forgotten_index.remove(&id)
                {
                    return Err(ExperienceError::StaleHydration);
                }
                privacy.forgotten.pop();
            }
            Self::Correction { id, before, .. } => {
                privacy.corrections.shift_remove(&id);
                if let Some((position, value)) = before {
                    privacy.corrections.shift_insert(position, id, value);
                }
            }
        }
        Ok(())
    }
}
impl ExperienceJournal {
    fn privacy_capacity(&mut self, bytes: usize) -> Result<(), ExperienceError> {
        self.prepare_undo(bytes)
    }
    pub(super) fn advance_privacy_revision(
        &mut self,
        state: &mut ExperienceState,
        actor: &str,
    ) -> Result<u64, ExperienceError> {
        let before = state
            .actors
            .get(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy
            .revision;
        let next = before
            .unwrap_or(0)
            .checked_add(1)
            .filter(|next| *next <= MAX_SAFE_INTEGER)
            .ok_or(ExperienceError::InvalidOrdinal)?;
        self.ensure_privacy_header(state, false)?;
        self.privacy_capacity(actor.len())?;
        let operation = PrivacyUndo::Revision {
            actor: actor.to_owned(),
            before,
        };
        state
            .actors
            .get_mut(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy
            .revision = Some(next);
        self.undo
            .push(super::mutation::ExperienceUndo::Privacy(operation));
        Ok(next)
    }
    pub(super) fn forget_alias(
        &mut self,
        state: &mut ExperienceState,
        actor: &str,
        id: &str,
    ) -> Result<bool, ExperienceError> {
        let privacy = &state
            .actors
            .get(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy;
        if privacy.forgotten_index.contains(id) {
            return Ok(false);
        }
        if id.is_empty() {
            return Err(ExperienceError::InvalidBody("forgotten source"));
        }
        let length = privacy.forgotten.len();
        let target = if length == privacy.forgotten.capacity() {
            privacy
                .forgotten
                .capacity()
                .checked_mul(2)
                .map(|n| n.max(4))
                .ok_or(ExperienceError::Capacity)?
        } else {
            privacy.forgotten.capacity()
        };
        let growth = if target > privacy.forgotten.capacity() {
            target
                .checked_mul(size_of::<String>())
                .ok_or(ExperienceError::Capacity)?
        } else {
            0
        };
        let bytes = actor
            .len()
            .checked_add(id.len().checked_mul(3).ok_or(ExperienceError::Capacity)?)
            .and_then(|bytes| bytes.checked_add(growth))
            .and_then(|bytes| bytes.checked_add(tree_node_bound::<String, ()>()?))
            .ok_or(ExperienceError::Capacity)?;
        self.privacy_capacity(bytes)?;
        let privacy = &mut state
            .actors
            .get_mut(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy;
        if target > privacy.forgotten.capacity() {
            privacy
                .forgotten
                .try_reserve_exact(target - length)
                .map_err(|_| ExperienceError::Capacity)?;
        }
        let operation = PrivacyUndo::Forgotten {
            actor: actor.to_owned(),
            id: id.to_owned(),
            length,
        };
        privacy.forgotten.push(id.to_owned());
        privacy.forgotten_index.insert(id.to_owned());
        self.undo
            .push(super::mutation::ExperienceUndo::Privacy(operation));
        Ok(true)
    }
    pub(super) fn set_correction(
        &mut self,
        state: &mut ExperienceState,
        actor: &str,
        id: &str,
        evidence: Option<&str>,
    ) -> Result<bool, ExperienceError> {
        let privacy = &state
            .actors
            .get(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy;
        if privacy.corrections.get(id).map(String::as_str) == evidence {
            return Ok(false);
        }
        if id.is_empty() || evidence.is_some_and(str::is_empty) {
            return Err(ExperienceError::InvalidBody("correction source"));
        }
        let before = privacy
            .corrections
            .get_full(id)
            .map(|(position, _, value)| (position, value.as_str()));
        let target = if before.is_none()
            && evidence.is_some()
            && privacy.corrections.len() == privacy.corrections.capacity()
        {
            privacy
                .corrections
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(2))
                .ok_or(ExperienceError::Capacity)?
        } else {
            privacy.corrections.capacity()
        };
        let growth = if target > privacy.corrections.capacity() {
            map_storage::<String, String>(target).ok_or(ExperienceError::Capacity)?
        } else {
            0
        };
        let bytes = actor
            .len()
            .checked_add(id.len().checked_mul(3).ok_or(ExperienceError::Capacity)?)
            .and_then(|bytes| bytes.checked_add(evidence.map_or(0, str::len)))
            .and_then(|bytes| bytes.checked_add(before.map_or(0, |(_, value)| value.len())))
            .and_then(|bytes| bytes.checked_add(growth))
            .ok_or(ExperienceError::Capacity)?;
        self.privacy_capacity(bytes)?;
        if evidence.is_some() {
            self.ensure_privacy_header(state, true)?;
        }
        let privacy = &mut state
            .actors
            .get_mut(actor)
            .ok_or(ExperienceError::ForeignOwner)?
            .privacy;
        if target > privacy.corrections.capacity() {
            privacy
                .corrections
                .try_reserve(target - privacy.corrections.len())
                .map_err(|_| ExperienceError::Capacity)?;
        }
        let before = privacy
            .corrections
            .get_full(id)
            .map(|(position, _, value)| (position, value.clone()));
        let operation = PrivacyUndo::Correction {
            actor: actor.to_owned(),
            id: id.to_owned(),
            before,
        };
        if let Some(evidence) = evidence {
            privacy
                .corrections
                .insert(id.to_owned(), evidence.to_owned());
        } else {
            privacy.corrections.shift_remove(id);
        }
        self.undo
            .push(super::mutation::ExperienceUndo::Privacy(operation));
        Ok(true)
    }
    pub(super) fn changed_privacy_actors(&self) -> impl Iterator<Item = &str> {
        self.undo.iter().filter_map(|operation| match operation {
            super::mutation::ExperienceUndo::Privacy(undo) => Some(undo.actor()),
            _ => None,
        })
    }
}
