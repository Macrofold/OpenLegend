//! A borrowed interval of the existing sparse journal, not a second state or
//! mutation owner. Restore retention starts after its genuine privacy baseline.
use super::*;

#[derive(Clone, Copy)]
pub(in crate::experience) struct PersonalChanges<'a> {
    pub(in crate::experience) undo: &'a [ExperienceUndo],
}
impl<'a> PersonalChanges<'a> {
    pub(in crate::experience) fn created_collections(
        self,
    ) -> impl Iterator<Item = (PersonalSourceKind, &'a str, u64)> + 'a {
        self.undo.iter().filter_map(|operation| match operation {
            ExperienceUndo::Collection {
                actor_id,
                kind,
                owner_next,
                ..
            } => Some((*kind, actor_id.as_str(), *owner_next)),
            _ => None,
        })
    }
    pub(in crate::experience) fn removed(
        self,
    ) -> impl DoubleEndedIterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.undo.iter().filter_map(|operation| match operation {
            ExperienceUndo::Remove { before, .. } => Some(before),
            _ => None,
        })
    }
    pub(in crate::experience) fn replaced(
        self,
        state: &'a ExperienceState,
    ) -> impl Iterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.undo.iter().filter_map(|operation| {
            let ExperienceUndo::Replace {
                actor_id,
                kind,
                position,
                ..
            } = operation
            else {
                return None;
            };
            state
                .actors
                .get(actor_id)?
                .sources
                .get(kind)?
                .by_ordinal
                .get(position)
        })
    }
    pub(in crate::experience) fn appended(
        self,
        state: &'a ExperienceState,
    ) -> impl Iterator<Item = &'a Arc<PersonalSourceRecord>> {
        self.undo.iter().filter_map(|operation| {
            let ExperienceUndo::Append(undo) = operation else {
                return None;
            };
            state
                .actors
                .get(&undo.actor_id)?
                .sources
                .get(&undo.kind)?
                .by_ordinal
                .get(&undo.position)
        })
    }
    pub(in crate::experience) fn summary_collections(
        self,
    ) -> impl Iterator<Item = (&'a str, &'a PersonalSourceCollection)> {
        self.undo.iter().filter_map(|operation| match operation {
            ExperienceUndo::SummaryCollection { actor, before } => Some((actor.as_str(), before)),
            _ => None,
        })
    }
}
impl ExperienceJournal {
    pub(crate) fn retired_records_since(
        &self,
        checkpoint: ExperienceCheckpoint,
    ) -> Result<impl Iterator<Item = &Arc<PersonalSourceRecord>>, ExperienceError> {
        Ok(self.personal_changes(Some(checkpoint))?.removed())
    }
    /// Account retention only removes or replaces existing source records.
    /// Hydration and collection-presence metadata do not require another
    /// source-version round; these are Source's non-append array changes.
    pub(crate) fn retention_sources_changed_since(
        &self,
        checkpoint: ExperienceCheckpoint,
    ) -> Result<bool, ExperienceError> {
        Ok(self
            .personal_changes(Some(checkpoint))?
            .undo
            .iter()
            .any(|operation| {
                matches!(
                    operation,
                    ExperienceUndo::Remove { .. }
                        | ExperienceUndo::Replace { .. }
                        | ExperienceUndo::SummaryCollection { .. }
                )
            }))
    }
    pub(in crate::experience) fn personal_changes(
        &self,
        since: Option<ExperienceCheckpoint>,
    ) -> Result<PersonalChanges<'_>, ExperienceError> {
        let start = since.map_or(0, |checkpoint| checkpoint.operations);
        let undo = self
            .undo
            .get(start..)
            .ok_or(ExperienceError::StaleHydration)?;
        Ok(PersonalChanges { undo })
    }
    pub(in crate::experience) fn all_personal_changes(&self) -> PersonalChanges<'_> {
        PersonalChanges { undo: &self.undo }
    }
}
