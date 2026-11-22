//! Pending consent follows the exact loose-stock and participant indexes.
//! The current candidate journal identifies mutations and restores its cutoff
//! together with any review hints on rollback.

use super::*;
use std::collections::BTreeSet;

impl PhysicalJournal {
    pub(crate) fn queue_gift_reviews(
        &mut self,
        state: &mut PhysicalState,
    ) -> Result<(), ExecutionError> {
        let through = self.undo.len();
        if through == self.gift_review_through || state.gifts.is_empty() {
            self.gift_review_through = through;
            return Ok(());
        }
        let mut requested = BTreeSet::<String>::new();
        let mut scratch = None::<ByteReservation>;
        let mut select = |id: &str| -> Result<(), ExecutionError> {
            if requested.contains(id) || !state.gifts.can_queue_review(id) {
                return Ok(());
            }
            let bound = crate::host::retained_size::tree_node_bound::<String, ()>()
                .and_then(|size| size.checked_add(id.len()))
                .ok_or(ExecutionError::Capacity)?;
            if let Some(storage) = &mut scratch {
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(bound)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
            } else {
                scratch = Some(self.budget.reserve(bound)?);
            }
            requested.insert(id.to_owned());
            Ok(())
        };
        for undo in self
            .undo
            .get(self.gift_review_through..through)
            .ok_or(ExecutionError::Invariant)?
        {
            let lot = match undo {
                Undo::Inventory(edit) if edit.edited_item() || edit.changed_placement() => state
                    .entities
                    .resolve(edit.child)
                    .map(|entity| entity.id.as_str()),
                Undo::ItemHoldAdded { id, .. } => state.holds.get(id).map(|hold| hold.item_id()),
                Undo::ItemHoldEnded { hold, .. } => Some(hold.item_id()),
                Undo::Placement { entity, .. } => state
                    .entities
                    .resolve(*entity)
                    .filter(|entity| entity.item.is_some())
                    .map(|entity| entity.id.as_str()),
                _ => None,
            };
            if let Some(offer) = lot.and_then(|id| state.gifts.for_item(id)) {
                select(&offer.id)?;
            }
            let participant = match undo {
                Undo::Participation { entity, .. }
                | Undo::RestoreActor { entity, .. }
                | Undo::BodyRevision { entity, .. }
                | Undo::BodyLifecycle { entity, .. }
                | Undo::Action { entity, .. } => Some(*entity),
                Undo::Episode(episode) => Some(episode.entity),
                _ => None,
            };
            if let Some(actor) = participant.and_then(|handle| state.entities.resolve(handle)) {
                for offer in state.gifts.for_actor(&actor.id) {
                    select(&offer.id)?;
                }
            }
        }
        for id in requested {
            self.reserve(size_of::<Undo>() + id.len())?;
            self.undo.push(Undo::Gift(state.gifts.queue_review(id)?));
        }
        self.gift_review_through = self.undo.len();
        Ok(())
    }
}

impl CoreMutation<'_> {
    pub(crate) fn queue_gift_reviews(&mut self) -> Result<(), ExecutionError> {
        self.journal
            .physical
            .queue_gift_reviews(&mut self.state.physical)
    }

    pub(crate) fn take_gift_review(&mut self, id: &str) -> Result<bool, ExecutionError> {
        if !self.state.physical.gifts.review_pending(id) {
            return Ok(false);
        }
        self.journal
            .physical
            .reserve(size_of::<Undo>() + id.len())?;
        let undo = self
            .state
            .physical
            .gifts
            .take_review(id)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.physical.undo.push(Undo::Gift(undo));
        Ok(true)
    }
}
