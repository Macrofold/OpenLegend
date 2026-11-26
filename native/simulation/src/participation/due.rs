//! One Source-order snapshot of deadlines due at this actual simulation instant.
//! Each completed child removes its genuine canonical exposure before the next.
use super::*;
use crate::execution::ExecutionError;
use crate::simulation::PhysicalState;
use std::mem::size_of;

pub(crate) struct DueExits {
    actors: Vec<String>,
    next: usize,
    at: f64,
    _storage: crate::host::ByteReservation,
}
impl DueExits {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        epsilon: f64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let at = physical.header.sim_time;
        let selected = || {
            physical
                .participation
                .exposures()
                .into_iter()
                .flat_map(|rows| rows.iter())
                .filter(|(_, deadline)| **deadline - at <= epsilon)
                .map(|(actor, _)| actor)
        };
        let count = selected().count();
        let bytes = selected().try_fold(
            count
                .checked_mul(size_of::<String>())
                .ok_or(ExecutionError::Capacity)?,
            |n, id| n.checked_add(id.len()).ok_or(ExecutionError::Capacity),
        )?;
        let storage = budget.reserve(bytes)?;
        let mut actors = Vec::with_capacity(count);
        actors.extend(selected().cloned());
        Ok(Self {
            actors,
            next: 0,
            at,
            _storage: storage,
        })
    }
    pub(crate) fn current(&self) -> Option<&str> {
        self.actors.get(self.next).map(String::as_str)
    }
    pub(crate) fn complete(
        &mut self,
        completed: &CompletedParticipation,
    ) -> Result<(), ExecutionError> {
        if self.current() != Some(completed.actor_id()) || !completed.is_deadline(self.at) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        self.next += 1;
        Ok(())
    }
}
pub(crate) fn next_exit_deadline(physical: &PhysicalState) -> f64 {
    let now = physical.header.sim_time;
    physical
        .participation
        .exposures()
        .into_iter()
        .flat_map(|rows| rows.values())
        .copied()
        .filter(|deadline| *deadline > now)
        .min_by(f64::total_cmp)
        .unwrap_or(f64::INFINITY)
}
