//! New life starts with fresh current grants. Terminal history is already
//! settled against the old life before this bounded metadata change.
use super::*;

impl CurrentJournal {
    pub(in super::super) fn begin_replacement_life(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        previous: u64,
        next: u64,
    ) -> Result<(), ReceivedError> {
        let old = owner(state, observer)?;
        if old.life != previous
            || previous == next
            || old.geometry.is_some()
            || !old.gaps.is_empty()
            || old
                .motion_samples
                .as_ref()
                .is_some_and(|samples| !samples.is_empty())
        {
            return Err(invalid());
        }

        // Any empty contact shells carry old-life measurements and counters.
        // Record their existing child removals through the ordinary row owner.
        while let Some((subject, _)) = owner(state, observer)?.current.first() {
            self.reserve_growth(subject.len())?;
            let subject = subject.clone();
            self.replace_contact(state, observer, &subject, None)?;
        }
        let old = owner(state, observer)?;
        self.reserve_undo_growth(
            heap_sum([
                5 * observer.len(),
                size_of::<BeforeLife>(),
                old.observer.heap_bytes().ok_or_else(capacity)?,
                old.support.heap_bytes().ok_or_else(capacity)?,
                old.attention.heap_bytes().ok_or_else(capacity)?,
                old.visual_confirmation.heap_bytes().ok_or_else(capacity)?,
                old.motion_samples.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
            5,
        )?;
        let old = owner_mut(state, observer)?;
        let prior = Box::new(BeforeLife {
            number: old.life,
            observer: old.observer.replace(ObserverLife {
                actor_id: observer.to_owned(),
                physical_life: next,
            }),
            support: old.support.take(),
        });
        old.life = next;
        self.undo.push(CurrentUndo::Life {
            observer: observer.to_owned(),
            prior,
        });
        let next_contact = std::mem::take(&mut old.next_contact);
        self.undo.push(CurrentUndo::NextContact {
            observer: observer.to_owned(),
            prior: next_contact,
        });
        if let Some(prior) = old.visual_confirmation.take() {
            self.undo.push(CurrentUndo::VisualConfirmation {
                observer: observer.to_owned(),
                prior: Some(prior),
            });
        }
        if let Some(prior) = old.attention.take() {
            self.undo.push(CurrentUndo::Attention {
                observer: observer.to_owned(),
                prior: Some(prior),
            });
        }
        if let Some(prior) = old.motion_samples.take() {
            self.undo.push(CurrentUndo::Motion {
                observer: observer.to_owned(),
                prior,
                expires_at: old.motion_expires_at.take(),
            });
        }
        for part in [
            CurrentOwnerPart::Observer,
            CurrentOwnerPart::Support,
            CurrentOwnerPart::Sight,
            CurrentOwnerPart::Attention,
            CurrentOwnerPart::Motion,
        ] {
            self.settle_owner(state, observer, part, false)?;
        }
        Ok(())
    }
}
