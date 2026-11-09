//! The actual observer's receiving lifetime survives finite provider yields.
//! Before a snapshot, its current duties finish, its own temporal builder flushes,
//! and only then its contact prefix is sealed. No other actor is flushed here.
use super::*;
use crate::execution::{AcquisitionLease, CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};
fn invalid() -> ExecutionError {
    ExecutionError::Received(crate::received::ReceivedError(
        "Current receiving lifetime has changed or is unfinished.",
    ))
}
pub(super) struct CurrentReceptionLifetime {
    pub observer: ObserverLife,
    acquisition: Option<AcquisitionLease>,
    prefix: Option<CurrentContactBatchLease>,
    pub before: Option<Arc<CurrentCohort>>,
    measured: IndexSet<String>,
    checked: IndexSet<String>,
    selected_sources: IndexSet<String>,
    frame_checked: IndexSet<String>,
    frame_checked_ready: bool,
    frame_ref: Option<crate::received::ReceivedValueReference>,
    frame_changed: bool,
    pub reconciled: bool,
    pub sample_token: Option<u64>,
    reservation: ByteReservation,
}
impl CurrentReceptionLifetime {
    pub(super) fn begin(
        core: &mut CoreMutation<'_>,
        observer: &ObserverLife,
        acquisition: Option<AcquisitionLease>,
        sample_token: Option<u64>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            size_of::<Self>()
                .checked_add(observer.actor_id.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let acquisition = match acquisition {
            Some(acquisition) => acquisition,
            None => {
                let entity = core
                    .state
                    .physical
                    .entities
                    .get(&observer.actor_id)
                    .ok_or(ExecutionError::MissingActor)?;
                core.journal.acquisitions.begin_acquisition(
                    &observer.actor_id,
                    observer.physical_life,
                    Some(ObservationFrame {
                        position_at_observation: entity
                            .world_position()
                            .ok_or(ExecutionError::UnsupportedFamily)?,
                        forward_at_observation: Some(entity.spatial.heading),
                    }),
                )?
            }
        };
        Ok(Self {
            observer: observer.clone(),
            acquisition: Some(acquisition),
            prefix: None,
            before: None,
            measured: IndexSet::new(),
            checked: IndexSet::new(),
            selected_sources: IndexSet::new(),
            frame_checked: IndexSet::new(),
            frame_checked_ready: false,
            frame_ref: None,
            frame_changed: false,
            reconciled: false,
            sample_token,
            reservation,
        })
    }
    pub(super) fn ensure_prefix(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if self.prefix.is_some() {
            return Ok(());
        }
        let entity = core
            .state
            .physical
            .entities
            .get(&self.observer.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        core.journal.originals.ensure_owner(
            &mut core.state.reception,
            entity,
            core.state.physical.header.sequence,
        )?;
        self.before = CurrentCohort::capture(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            &self.observer.actor_id,
            budget,
        )?;
        self.prefix = Some(
            core.journal
                .current
                .begin_batch(&core.state.reception, &self.observer.actor_id)?,
        );
        if let Some(before) = self.before.as_ref().map(Arc::clone) {
            self.note_selected(before.track_source_ids())?;
        }
        self.reconciled = false;
        Ok(())
    }
    pub(super) fn note_selected<'a>(
        &mut self,
        ids: impl Iterator<Item = &'a str> + Clone,
    ) -> Result<(), ExecutionError> {
        let count = ids
            .clone()
            .filter(|id| !self.selected_sources.contains(*id))
            .count();
        if count == 0 {
            return Ok(());
        }
        let bytes = ids
            .clone()
            .filter(|id| !self.selected_sources.contains(*id))
            .try_fold(0usize, |sum, id| sum.checked_add(id.len()))
            .ok_or(ExecutionError::Capacity)?;
        let capacity = self
            .selected_sources
            .len()
            .checked_add(count)
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .and_then(|n| n.checked_add(map_storage::<String, ()>(capacity)?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.selected_sources
            .try_reserve(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for id in ids {
            if !self.selected_sources.contains(id) {
                self.selected_sources.insert(id.to_owned());
            }
        }
        Ok(())
    }
    pub(super) fn selected_sources(&self) -> impl Iterator<Item = &str> {
        self.selected_sources.iter().map(String::as_str)
    }
    pub(super) fn note(&mut self, source: &str, changed: bool) -> Result<(), ExecutionError> {
        let target = if changed {
            &mut self.measured
        } else {
            &mut self.checked
        };
        if target.contains(source) {
            return Ok(());
        }
        let storage = if target.len() == target.capacity() {
            map_storage::<String, ()>(
                target
                    .len()
                    .checked_add(1)
                    .and_then(|n| n.checked_mul(2))
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(source.len())
                .and_then(|n| n.checked_add(storage))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        target
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        target.insert(source.to_owned());
        self.reconciled = false;
        Ok(())
    }
    /// Both a visual subject patch and an acquired event association complete
    /// their actual correspondence/recording immediately after the sole setter.
    pub(super) fn installed_sample(
        &mut self,
        core: &mut CoreMutation<'_>,
        source: &str,
        kind: &str,
        status: CurrentSampleStatus,
        parts: AttentionChangedParts,
        before: Option<&Arc<CurrentCohort>>,
        token: u64,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let changed = status == CurrentSampleStatus::Changed;
        self.note(source, changed)?;
        let correspondence = changed
            && (parts.membership || parts.association)
            && before
                .map(|before| {
                    before.correspondence_changed(
                        &core.state.reception,
                        &core.state.experience,
                        source,
                    )
                })
                .transpose()?
                .unwrap_or(false);
        if correspondence {
            if let Some(before) = before {
                reconcile_current_cohort(core, Arc::clone(before), Some(token), budget)?;
            }
            self.reconciled = true;
        }
        if changed {
            let fresh = if correspondence {
                CurrentCohort::capture(
                    &core.state.physical,
                    &core.state.reception,
                    &core.state.installed,
                    &core.state.experience,
                    &self.observer.actor_id,
                    budget,
                )?
            } else {
                None
            };
            let selected = fresh
                .as_ref()
                .or(before)
                .map(|before| {
                    before.active_tracks(&core.state.reception, &core.state.experience, source)
                })
                .transpose()?;
            if let Some(selected) = selected {
                self.note_selected(selected.keys().map(String::as_str))?;
                record_current_reception(
                    core,
                    &self.observer.actor_id,
                    source,
                    kind,
                    &selected,
                    Some(token),
                    budget,
                )?;
            }
        }
        Ok(())
    }
    pub(super) fn note_frame(
        &mut self,
        core: &mut CoreMutation<'_>,
        reference: &crate::received::ReceivedValueReference,
        changed: bool,
    ) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(reference.heap_bytes().ok_or(ExecutionError::Capacity)?)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.frame_ref = Some(reference.clone());
        self.frame_changed |= changed;
        core.journal
            .current
            .note_frame_context(&self.observer.actor_id, self.frame_changed)?;
        Ok(())
    }
    pub(super) fn note_frame_checked<'a>(
        &mut self,
        ids: impl Iterator<Item = &'a str> + Clone,
        changed: bool,
    ) -> Result<(), ExecutionError> {
        if !changed && self.frame_checked_ready {
            return Ok(());
        }
        let count = ids.clone().count();
        let bytes = ids
            .clone()
            .try_fold(0usize, |sum, id| sum.checked_add(id.len()))
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .and_then(|n| n.checked_add(map_storage::<String, ()>(count)?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.frame_checked.clear();
        self.frame_checked
            .try_reserve(count)
            .map_err(|_| ExecutionError::Capacity)?;
        self.frame_checked.extend(ids.map(str::to_owned));
        self.frame_checked_ready = true;
        Ok(())
    }
    pub(super) fn record_receiver_frame(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if !self.frame_changed || self.frame_ref.is_none() {
            return Ok(());
        }
        let Some(before) = &self.before else {
            return Ok(());
        };
        let owner = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|o| o.get(&self.observer.actor_id))
            .ok_or_else(invalid)?;
        let entries = owner
            .attention
            .as_ref()
            .map_or(&[][..], |a| a.entries.as_slice());
        let count = entries
            .len()
            .checked_add(before.entry_entries().len())
            .ok_or(ExecutionError::Capacity)?;
        let track_bytes = before
            .entry_entries()
            .iter()
            .chain(entries)
            .try_fold(0usize, |bytes, entry| {
                bytes.checked_add(entry.exposure.track.len())
            })
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(
                    count
                        .checked_mul(size_of::<String>() + size_of::<&str>())
                        .ok_or(ExecutionError::Capacity)?,
                )
                .and_then(|bytes| {
                    bytes.checked_add(map_storage::<&str, &crate::attention::AttentionEntry>(
                        count,
                    )?)
                })
                .and_then(|bytes| bytes.checked_add(track_bytes))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let now = core.state.physical.header.sim_time;
        let frame = received_observation_frame(
            &core.state.reception.received_values.as_ref(),
            self.frame_ref.as_ref().ok_or_else(invalid)?,
        )?
        .clone();
        let mut candidates = indexmap::IndexMap::with_capacity(count);
        for entry in before.entry_entries().iter().chain(entries) {
            candidates.insert(entry.exposure.track.as_str(), entry);
        }
        let mut tracks = Vec::with_capacity(count);
        for (track, entry) in candidates {
            if !self.checked.contains(&entry.source_id)
                && !self.measured.contains(&entry.source_id)
                && !self.frame_checked.contains(&entry.source_id)
            {
                continue;
            }
            if core
                .journal
                .current
                .recorded_frame(&self.observer.actor_id, track)
                == Some(&frame)
            {
                continue;
            }
            let Some(contact) = owner.current.get(&entry.source_id) else {
                continue;
            };
            let mut held = false;
            for group in &contact.content.groups {
                if group.received.grant.modality != Modality::Sight
                    || received_track_key(
                        &group.received.grant.exposure,
                        &group.received.grant.channel,
                    )? != entry.exposure.track
                {
                    continue;
                }
                for partition in &group.metadata {
                    let effective = effective_current_partition(owner, group, partition, false)?;
                    if effective.availability.is_some()
                        || effective.times.expanded().confirmed_through != now
                    {
                        continue;
                    }
                    let Some(reference) = effective.frame_ref.as_ref() else {
                        continue;
                    };
                    if received_observation_frame(
                        &core.state.reception.received_values.as_ref(),
                        reference,
                    )? == &frame
                    {
                        held = true;
                        break;
                    }
                }
                if held {
                    break;
                }
            }
            if held {
                tracks.push(entry.exposure.track.clone());
            }
        }
        if tracks.is_empty() {
            return Ok(());
        }
        // An empty contextual selection does not create a timeline or rotate
        // its body-life epoch. Only an actual receipt needs that owner.
        if !crate::received::ensure_temporal_actor(core, &self.observer.actor_id, budget)? {
            return Ok(());
        }
        let owner = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&self.observer.actor_id))
            .ok_or_else(invalid)?;
        let tracks: Vec<&str> = tracks.iter().map(String::as_str).collect();
        let policy = &core.state.installed.attention.value().retention;
        core.state.temporal.append_receiver_frame(
            &mut crate::received::CurrentRecordingContext {
                current: &mut core.journal.current,
                actor_id: &self.observer.actor_id,
                owner,
                values: core
                    .state
                    .reception
                    .received_values
                    .as_mut()
                    .ok_or_else(invalid)?,
                identity: &mut core.state.physical.identity,
                scopes: &mut core.journal.acquisitions,
                recent_policy: &policy.recent,
                maintenance_headroom: policy.maintenance_headroom,
                meaning: &crate::worlds::InstalledEvidenceMeaning,
                meters: &mut core.journal.meters,
                now,
                sequence: core.state.physical.header.sequence,
                budget,
            },
            &tracks,
            &frame,
        )?;
        Ok(())
    }
    /// Source beforeSnapshot callback: finish THIS observer, flush its actual
    /// temporal page, then seal its contact prefix before the next observer.
    pub(super) fn flush_before_snapshot(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let Some(prefix) = self.prefix.take() else {
            return Ok(());
        };
        if !self.measured.is_empty() {
            prune_withdrawn_attention(
                &core.state.physical,
                &mut core.state.reception,
                &core.state.installed,
                &core.state.experience,
                &mut core.journal.current,
                &self.observer.actor_id,
                Some(&self.measured),
                None,
            )?;
        }
        if !self.reconciled && (!self.measured.is_empty() || !self.checked.is_empty()) {
            if let Some(before) = &self.before {
                reconcile_current_cohort(core, Arc::clone(before), self.sample_token, budget)?;
            }
            self.reconciled = true;
        }
        self.record_receiver_frame(core, budget)?;
        if prefix.owns_prefix() {
            if let Some(values) = core.state.reception.received_values.as_ref() {
                core.journal.acquisitions.flush_acquisition(
                    self.acquisition.ok_or_else(invalid)?,
                    &mut core.state.temporal,
                    values,
                    &mut core.state.physical.identity,
                    &crate::worlds::InstalledEvidenceMeaning,
                    &mut core.journal.meters,
                )?;
            } else if core
                .journal
                .acquisitions
                .pending_charge(&self.observer.actor_id)?
                != (0, 0)
            {
                return Err(invalid());
            }
        }
        core.journal
            .current
            .finish_batch(&mut core.state.reception, prefix)?;
        self.before = None;
        self.measured.clear();
        self.checked.clear();
        self.selected_sources.clear();
        self.sample_token = None;
        self.frame_checked.clear();
        self.frame_checked_ready = false;
        self.frame_ref = None;
        self.frame_changed = false;
        Ok(())
    }
    pub(super) fn finish(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.flush_before_snapshot(core, budget)?;
        let acquisition = self.acquisition.take().ok_or_else(invalid)?;
        if let Some(values) = core.state.reception.received_values.as_ref() {
            core.journal.acquisitions.finish_acquisition(
                acquisition,
                &mut core.state.temporal,
                values,
                &mut core.state.physical.identity,
                &crate::worlds::InstalledEvidenceMeaning,
                &mut core.journal.meters,
            )?;
        } else {
            core.journal
                .acquisitions
                .finish_empty_acquisition(acquisition)?;
        }
        Ok(())
    }
}
