//! Actual completed sight and independently acquired motion/gap continuation.
//! Every mutation moves its prior field into the same candidate journal.
use super::*;
impl CurrentJournal {
    pub(in super::super) fn replace_visual_confirmation(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        after: VisualConfirmation,
    ) -> Result<(), ReceivedError> {
        let prior = &owner(state, observer)?.visual_confirmation;
        self.reserve_growth(
            heap_sum([
                observer.len(),
                prior.heap_bytes().ok_or_else(capacity)?,
                after.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let prior = owner_mut(state, observer)?
            .visual_confirmation
            .replace(after);
        self.undo.push(CurrentUndo::VisualConfirmation {
            observer: observer.into(),
            prior,
        });
        Ok(())
    }
    pub(in super::super) fn set_motion(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        subject: &str,
        after: Option<CurrentMotionSample>,
    ) -> Result<bool, ReceivedError> {
        let current = owner(state, observer)?;
        let root_present = current.motion_samples.is_some();
        let samples = current.motion_samples.as_ref();
        let prior = samples.and_then(|samples| samples.get_full(subject));
        if prior.is_none() && after.is_none() {
            return Ok(false);
        }
        let inserting = after.is_some() && prior.is_none();
        let growth =
            if inserting && samples.is_none_or(|samples| samples.len() == samples.capacity()) {
                map_storage::<String, CurrentMotionSample>(
                    samples
                        .map_or(0, IndexMap::len)
                        .checked_add(1)
                        .and_then(|n| n.checked_mul(2))
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?
            } else {
                0
            };
        self.reserve_growth(
            heap_sum([
                observer.len(),
                2 * subject.len(),
                growth,
                prior
                    .map_or(Some(0), |(_, _, prior)| prior.heap_bytes())
                    .ok_or_else(capacity)?,
                after.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let samples = owner_mut(state, observer)?
            .motion_samples
            .get_or_insert_with(IndexMap::new);
        if inserting {
            samples.try_reserve(1).map_err(|_| capacity())?;
        }
        let prior = samples
            .shift_remove_full(subject)
            .map(|(at, _, value)| (at, value));
        if let Some(after) = after {
            if let Some((at, _)) = &prior {
                samples.shift_insert(*at, subject.into(), after);
            } else {
                samples.insert(subject.into(), after);
            }
        }
        self.undo.push(CurrentUndo::MotionMember {
            observer: observer.into(),
            subject: subject.into(),
            prior,
            root_present,
        });
        Ok(true)
    }
    pub(in super::super) fn refresh_motion_expiry(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<(), ReceivedError> {
        let current = owner(state, observer)?;
        let after = current
            .motion_samples
            .iter()
            .flat_map(IndexMap::values)
            .map(|sample| sample.expires_at)
            .min_by(f64::total_cmp);
        if current.motion_expires_at == after {
            return Ok(());
        }
        let prior = current.motion_expires_at;
        self.reserve_growth(observer.len())?;
        self.undo.push(CurrentUndo::MotionExpiry {
            observer: observer.into(),
            prior,
        });
        owner_mut(state, observer)?.motion_expires_at = after;
        Ok(())
    }
    pub(in super::super) fn set_gap(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        subject: &str,
        after: Option<ReceptionGap>,
    ) -> Result<(), ReceivedError> {
        let current = owner(state, observer)?;
        let prior = current.gaps.get_full(subject);
        if prior.is_none() && after.is_none() {
            return Ok(());
        }
        let inserting = after.is_some() && prior.is_none();
        let growth = if inserting && current.gaps.len() == current.gaps.capacity() {
            map_storage::<String, ReceptionGap>(
                current
                    .gaps
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or_else(capacity)?,
            )
            .ok_or_else(capacity)?
        } else {
            0
        };
        self.reserve_growth(
            heap_sum([
                observer.len(),
                2 * subject.len(),
                growth,
                prior
                    .map_or(Some(0), |(_, _, prior)| prior.heap_bytes())
                    .ok_or_else(capacity)?,
                after.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let gaps = &mut owner_mut(state, observer)?.gaps;
        if inserting {
            gaps.try_reserve(1).map_err(|_| capacity())?;
        }
        let prior = gaps
            .shift_remove_full(subject)
            .map(|(at, _, value)| (at, value));
        if let Some(after) = after {
            if let Some((at, _)) = &prior {
                gaps.shift_insert(*at, subject.into(), after);
            } else {
                gaps.insert(subject.into(), after);
            }
        }
        self.undo.push(CurrentUndo::GapMember {
            observer: observer.into(),
            subject: subject.into(),
            prior,
        });
        Ok(())
    }
}
