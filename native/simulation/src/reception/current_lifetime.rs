//! The actual observer's receiving lifetime survives finite provider yields.
//! Before a snapshot, its current duties finish, its own temporal builder flushes,
//! and only then its contact prefix is sealed. No other actor is flushed here.
use super::*;
use crate::execution::{AcquisitionLease, CoreMutation, ExecutionError};
use crate::host::retained_size::{heap_sum, map_storage};
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
        self.reconciled = false;
        Ok(())
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
        self.sample_token = None;
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
