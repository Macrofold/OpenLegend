//! One candidate owns the saved physical progress and removes the object only
//! when its terminal contact settles. Removed bodies retain their own backing
//! until acceptance or exact rollback.

use super::*;
use crate::projectile::{FlightPosition, ProjectileFlight};

impl PhysicalMutation<'_> {
    pub(crate) fn launch_projectile(
        &mut self,
        flight: ProjectileFlight,
        storage: ByteReservation,
    ) -> Result<(), ExecutionError> {
        let present = self.state.projectiles.present;
        self.journal.reserve(size_of::<Undo>() + flight.id.len())?;
        self.journal
            .undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let id = flight.id.clone();
        self.state.projectiles.launch(
            flight,
            self.state.header.sim_time,
            storage,
            &self.journal.budget,
        )?;
        self.journal
            .undo
            .push(Undo::ProjectileLaunch { id, present });
        Ok(())
    }

    pub(crate) fn set_projectile_progress(
        &mut self,
        id: &str,
        next: FlightPosition,
    ) -> Result<(), ExecutionError> {
        let flight = &mut self
            .state
            .projectiles
            .flights
            .get_mut(id)
            .ok_or(ExecutionError::Invariant)?
            .flight;
        let before = flight.progress();
        if before == next {
            return Ok(());
        }
        let _key = self.journal.budget.reserve(id.len())?;
        let key = UndoKey::ProjectileProgress(id.to_owned());
        if self.journal.first(&key)? {
            self.journal.reserve(size_of::<Undo>() + 2 * id.len())?;
            self.journal.retain(
                key,
                Undo::ProjectileProgress {
                    id: id.to_owned(),
                    before,
                },
            )?;
        }
        flight.set_progress(next);
        Ok(())
    }

    /// Add once for an exact current life after the actual swept sight proof.
    /// The occurrence and response use this same private candidate.
    pub(crate) fn record_projectile_passage(
        &mut self,
        id: &str,
        receiver: &str,
        life: u64,
    ) -> Result<bool, ExecutionError> {
        let flight = self
            .state
            .projectiles
            .flights
            .get_mut(id)
            .ok_or(ExecutionError::Invariant)?;
        if flight.passages.contains(receiver, life) {
            return Ok(false);
        }
        let names = id
            .len()
            .checked_add(receiver.len())
            .and_then(|bytes| bytes.checked_add(size_of::<Undo>()))
            .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(names)?;
        let present = flight.flight.has_passages();
        let ordinal = flight.passages.add(receiver, life, &self.journal.budget)?;
        flight.flight.set_passages(true);
        self.journal.undo.push(Undo::ProjectilePassage {
            id: id.to_owned(),
            receiver: receiver.to_owned(),
            life,
            ordinal,
            present,
        });
        Ok(true)
    }

    pub(crate) fn retire_projectile(&mut self, id: &str) -> Result<(), ExecutionError> {
        let _key = self.journal.budget.reserve(id.len())?;
        let key = UndoKey::ProjectileRetire(id.to_owned());
        if !self.journal.first(&key)? {
            return Err(ExecutionError::Invariant);
        }
        self.journal.reserve(size_of::<Undo>() + id.len())?;
        let flight = self
            .state
            .projectiles
            .flights
            .get(id)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.budget.retain_record(&flight.resident)?;
        flight
            .passages
            .retain_for_retirement(&self.journal.budget)?;
        let (position, id, before) = self
            .state
            .projectiles
            .flights
            .shift_remove_full(id)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.retain(
            key,
            Undo::ProjectileRetire {
                position,
                id,
                before,
            },
        )
    }
}
