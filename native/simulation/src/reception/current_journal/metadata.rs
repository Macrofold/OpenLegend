//! Actual completed sight and independently acquired motion/gap continuation.
//! Every mutation moves its prior field into the same candidate journal.
use super::*;
fn visibility_capacity(
    len: usize,
    backing: usize,
    inserting: bool,
) -> Result<usize, ReceivedError> {
    if inserting && len == backing {
        len.checked_add(1)
            .and_then(|count| count.checked_mul(2))
            .map(|count| count.max(4))
            .ok_or_else(capacity)
    } else {
        Ok(backing)
    }
}
impl CurrentJournal {
    pub(crate) fn set_exposure_objects(
        &mut self,
        state: &mut ReceptionState,
        objects: super::super::exposure::ExposureObjects,
    ) -> Result<(), ReceivedError> {
        if state
            .exposure_objects
            .as_ref()
            .is_some_and(|prior| prior.same_categories(&objects))
        {
            return Ok(());
        }
        self.reserve_growth(0)?;
        let prior = state.exposure_objects.replace(Arc::new(objects));
        self.undo.push(CurrentUndo::ExposureObjects { prior });
        Ok(())
    }
    /// Move one old map into undo. Per-place members retain only their own
    /// before-image across Source's incremental acquisition yields.
    pub(in super::super) fn replace_visible_places(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        after: IndexMap<String, u64>,
    ) -> Result<bool, ReceivedError> {
        let root = state.visible_places.as_ref();
        let prior = root.and_then(|rows| rows.get_full(observer));
        if prior.is_some_and(|(_, _, prior)| *prior == after)
            || (prior.is_none() && after.is_empty())
        {
            return Ok(false);
        }
        let before = state.visibility_allocation(VisibilityPart::Places, observer)?;
        let root_present = root.is_some();
        let inserting = prior.is_none();
        let old_capacity = root.map_or(0, IndexMap::capacity);
        let target = visibility_capacity(root.map_or(0, IndexMap::len), old_capacity, inserting)?;
        let parent = map_storage::<String, IndexMap<String, u64>>(target).ok_or_else(capacity)?;
        let parent_growth = parent.saturating_sub(
            map_storage::<String, IndexMap<String, u64>>(old_capacity).ok_or_else(capacity)?,
        );
        let after_bytes = after.heap_bytes().ok_or_else(capacity)?;
        self.reserve_growth(
            heap_sum([
                observer.len().checked_mul(2).ok_or_else(capacity)?,
                parent_growth,
                before.1,
                after_bytes,
            ])
            .ok_or_else(capacity)?,
        )?;
        state.prepare_visibility_growth(
            VisibilityPart::Places,
            before,
            (observer.len(), after_bytes),
            Some(parent),
            &mut self.reservation,
        )?;
        let allocation = (|| -> Result<(), ReceivedError> {
            if state.visible_places.is_none() {
                let mut rows = IndexMap::new();
                rows.try_reserve(1).map_err(|_| capacity())?;
                state.visible_places = Some(rows);
            } else if target > old_capacity {
                state
                    .visible_places
                    .as_mut()
                    .ok_or_else(invalid)?
                    .try_reserve(1)
                    .map_err(|_| capacity())?;
            }
            Ok(())
        })();
        if let Err(error) = allocation {
            state.cancel_visibility_growth()?;
            return Err(error);
        }
        let rows = state.visible_places.as_mut().ok_or_else(invalid)?;
        let prior = rows
            .shift_remove_full(observer)
            .map(|(at, _, values)| (at, values));
        if let Some((at, _)) = &prior {
            rows.shift_insert(*at, observer.to_owned(), after);
        } else {
            rows.insert(observer.to_owned(), after);
        }
        self.undo.push(CurrentUndo::VisiblePlaces {
            observer: observer.to_owned(),
            prior,
            root_present,
        });
        let after = state.visibility_allocation(VisibilityPart::Places, observer)?;
        state.settle_visibility(
            VisibilityPart::Places,
            before,
            after,
            &mut self.reservation,
            false,
        )?;
        Ok(true)
    }
    pub(in super::super) fn set_visible_place(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        place: &str,
        revision: u64,
    ) -> Result<(), ReceivedError> {
        let root = state.visible_places.as_ref();
        if root.and_then(|rows| rows.get(observer)).is_none() {
            let root_present = root.is_some();
            let old_capacity = root.map_or(0, IndexMap::capacity);
            let target = visibility_capacity(root.map_or(0, IndexMap::len), old_capacity, true)?;
            let parent =
                map_storage::<String, IndexMap<String, u64>>(target).ok_or_else(capacity)?;
            let growth = parent.saturating_sub(
                map_storage::<String, IndexMap<String, u64>>(old_capacity).ok_or_else(capacity)?,
            );
            self.reserve_growth(
                heap_sum([observer.len().checked_mul(2).ok_or_else(capacity)?, growth])
                    .ok_or_else(capacity)?,
            )?;
            state.prepare_visibility_growth(
                VisibilityPart::Places,
                (0, 0),
                (observer.len(), 0),
                Some(parent),
                &mut self.reservation,
            )?;
            let allocation = (|| -> Result<(), ReceivedError> {
                if state.visible_places.is_none() {
                    let mut rows = IndexMap::new();
                    rows.try_reserve(1).map_err(|_| capacity())?;
                    state.visible_places = Some(rows);
                } else if target > old_capacity {
                    state
                        .visible_places
                        .as_mut()
                        .ok_or_else(invalid)?
                        .try_reserve(1)
                        .map_err(|_| capacity())?;
                }
                Ok(())
            })();
            if let Err(error) = allocation {
                state.cancel_visibility_growth()?;
                return Err(error);
            }
            state
                .visible_places
                .as_mut()
                .ok_or_else(invalid)?
                .insert(observer.to_owned(), IndexMap::new());
            self.undo.push(CurrentUndo::VisiblePlaces {
                observer: observer.to_owned(),
                prior: None,
                root_present,
            });
            let after = state.visibility_allocation(VisibilityPart::Places, observer)?;
            state.settle_visibility(
                VisibilityPart::Places,
                (0, 0),
                after,
                &mut self.reservation,
                false,
            )?;
        }
        let rows = state
            .visible_places
            .as_ref()
            .and_then(|root| root.get(observer))
            .ok_or_else(invalid)?;
        if rows.get(place) == Some(&revision) {
            return Ok(());
        }
        let inserting = !rows.contains_key(place);
        let old_capacity = rows.capacity();
        let target = visibility_capacity(rows.len(), old_capacity, inserting)?;
        let before_member = map_storage::<String, u64>(old_capacity).ok_or_else(capacity)?;
        let forecast = map_storage::<String, u64>(target)
            .and_then(|bytes| bytes.checked_add(if inserting { place.len() } else { 0 }))
            .ok_or_else(capacity)?;
        self.reserve_growth(
            heap_sum([
                observer.len(),
                place.len().checked_mul(2).ok_or_else(capacity)?,
                forecast.saturating_sub(before_member),
            ])
            .ok_or_else(capacity)?,
        )?;
        state.prepare_visibility_growth(
            VisibilityPart::Places,
            (0, before_member),
            (0, forecast),
            None,
            &mut self.reservation,
        )?;
        let rows = state
            .visible_places
            .as_mut()
            .and_then(|root| root.get_mut(observer))
            .ok_or_else(invalid)?;
        if target > old_capacity && rows.try_reserve(1).is_err() {
            state.cancel_visibility_growth()?;
            return Err(capacity());
        }
        let prior = rows.get_full(place).map(|(at, _, value)| (at, *value));
        rows.insert(place.to_owned(), revision);
        let after_member = map_storage::<String, u64>(rows.capacity())
            .and_then(|bytes| {
                bytes.checked_add(if inserting {
                    rows.get_key_value(place)?.0.capacity()
                } else {
                    0
                })
            })
            .ok_or_else(capacity)?;
        self.undo.push(CurrentUndo::VisiblePlaceMember {
            observer: observer.to_owned(),
            place: place.to_owned(),
            prior,
        });
        state.settle_visibility(
            VisibilityPart::Places,
            (0, before_member),
            (0, after_member),
            &mut self.reservation,
            false,
        )?;
        Ok(())
    }
    pub(in super::super) fn clear_visible_places(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
    ) -> Result<bool, ReceivedError> {
        self.replace_visible_places(state, observer, IndexMap::new())
    }
    pub(crate) fn set_visibility(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        people: bool,
        after: Vec<String>,
    ) -> Result<bool, ReceivedError> {
        let part = VisibilityPart::bodies(people);
        let before = state.visibility_allocation(part, observer)?;
        let root = if people {
            state.visible_people.as_ref()
        } else {
            state.visible_objects.as_ref()
        };
        let prior = root.and_then(|rows| rows.get_full(observer));
        if prior.is_some_and(|(_, _, prior)| *prior == after) {
            return Ok(false);
        }
        let root_present = root.is_some();
        let old_capacity = root.map_or(0, IndexMap::capacity);
        let target =
            visibility_capacity(root.map_or(0, IndexMap::len), old_capacity, prior.is_none())?;
        let parent = map_storage::<String, Vec<String>>(target).ok_or_else(capacity)?;
        let growth = parent
            .saturating_sub(map_storage::<String, Vec<String>>(old_capacity).ok_or_else(capacity)?);
        let after_bytes = after.heap_bytes().ok_or_else(capacity)?;
        self.reserve_growth(
            heap_sum([
                observer.len().checked_mul(2).ok_or_else(capacity)?,
                growth,
                before.1,
                after_bytes,
            ])
            .ok_or_else(capacity)?,
        )?;
        state.prepare_visibility_growth(
            part,
            before,
            (observer.len(), after_bytes),
            Some(parent),
            &mut self.reservation,
        )?;
        let root = if people {
            &mut state.visible_people
        } else {
            &mut state.visible_objects
        };
        let allocation = (|| -> Result<(), ReceivedError> {
            if root.is_none() {
                let mut rows = IndexMap::new();
                rows.try_reserve(1).map_err(|_| capacity())?;
                *root = Some(rows);
            } else if target > old_capacity {
                root.as_mut()
                    .ok_or_else(invalid)?
                    .try_reserve(1)
                    .map_err(|_| capacity())?;
            }
            Ok(())
        })();
        if let Err(error) = allocation {
            state.cancel_visibility_growth()?;
            return Err(error);
        }
        let root = if people {
            &mut state.visible_people
        } else {
            &mut state.visible_objects
        };
        let rows = root.as_mut().ok_or_else(invalid)?;
        let prior = rows
            .shift_remove_full(observer)
            .map(|(at, _, values)| (at, values));
        if let Some((at, _)) = &prior {
            rows.shift_insert(*at, observer.to_owned(), after);
        } else {
            rows.insert(observer.to_owned(), after);
        }
        self.undo.push(CurrentUndo::Visibility {
            observer: observer.to_owned(),
            people,
            prior,
            root_present,
        });
        let after = state.visibility_allocation(part, observer)?;
        state.settle_visibility(part, before, after, &mut self.reservation, false)?;
        Ok(true)
    }
    pub(in super::super) fn set_visual_measurement(
        &mut self,
        state: &mut ReceptionState,
        observer: &str,
        subject: &str,
        after: Option<VisualMeasurement>,
    ) -> Result<(), ReceivedError> {
        let Some(contact) = owner(state, observer)?.current.get(subject) else {
            return if after.is_none() {
                Ok(())
            } else {
                Err(invalid())
            };
        };
        if contact.visual_measurement.is_none() && after.is_none() {
            return Ok(());
        }
        self.reserve_growth(
            heap_sum([
                observer.len(),
                subject.len(),
                contact
                    .visual_measurement
                    .heap_bytes()
                    .ok_or_else(capacity)?,
                after.heap_bytes().ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let prior = std::mem::replace(
            &mut owner_mut(state, observer)?
                .current
                .get_mut(subject)
                .ok_or_else(invalid)?
                .visual_measurement,
            after,
        );
        self.undo.push(CurrentUndo::VisualMeasurement {
            observer: observer.into(),
            subject: subject.into(),
            prior,
        });
        self.settle_contact(state, observer, subject)?;
        Ok(())
    }
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
        self.settle_owner(state, observer, CurrentOwnerPart::Sight, false)?;
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
        self.settle_owner(state, observer, CurrentOwnerPart::Motion, false)?;
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
        self.settle_owner(state, observer, CurrentOwnerPart::Gaps, false)?;
        Ok(())
    }
}
