//! One candidate owns the saved physical progress and removes the object only
//! when its terminal contact settles. Removed bodies retain their own backing
//! until acceptance or exact rollback.

use super::*;
use crate::projectile::{FlightPosition, ProjectileCrossing, ProjectileFlight};

pub(crate) enum CrossingChange<'a> {
    Open(ProjectileCrossing),
    Close(&'a str),
}

impl PhysicalMutation<'_> {
    /// Retirement cannot leave an active crossing pointing at a departed body.
    pub(crate) fn close_body_crossings(&mut self, id: &str, life: u64) -> Result<(), ExecutionError> {
        loop {
            let next = self.state.projectiles.flights.iter().find_map(|(shot, row)| {
                row.flight.encounters.as_ref()?.iter().find_map(|(key, entry)| {
                    (entry.body_id == id && entry.body_life == life).then_some((shot, key))
                })
            });
            let Some((shot, key)) = next else { return Ok(()); };
            let _names = self.journal.budget.reserve(shot.len() + key.len())?;
            let (shot, key) = (shot.to_owned(), key.to_owned());
            self.projectile_crossing(&shot, CrossingChange::Close(&key))?;
        }
    }

    /// Crossing evidence is sparse and changes only at admission or exit.
    /// Move the previous admitted map into the inverse while the next map has
    /// independent custody. Ordinary projectile progress never copies its rows.
    pub(crate) fn projectile_crossing(
        &mut self,
        id: &str,
        change: CrossingChange<'_>,
    ) -> Result<(), ExecutionError> {
        let row = self.state.projectiles.flights.get_mut(id).ok_or(ExecutionError::Invariant)?;
        let retained = row.flight.encounters.as_ref();
        let added = if let CrossingChange::Open(entry) = &change {
            entry.body_id.len().checked_mul(6).and_then(|key| key.checked_add(24))
                .and_then(|key| entry.heap_bytes()?.checked_add(key))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let count = retained.map_or(0, IndexMap::len).checked_add(1).ok_or(ExecutionError::Capacity)?;
        let growth = crate::host::retained_size::map_storage::<String, ProjectileCrossing>(count)
            .ok_or(ExecutionError::Capacity)?;
        let mut workspace = self.journal.budget.reserve(heap_sum([
            row.flight.encounters.heap_bytes().ok_or(ExecutionError::Capacity)?,
            growth,
            added,
        ]).ok_or(ExecutionError::Capacity)?)?;
        let mut next = retained.cloned().unwrap_or_default();
        match change {
            CrossingChange::Open(entry) => {
                let key = entry.key().map_err(|_| ExecutionError::Invariant)?;
                if next.contains_key(&key) {
                    return Err(ExecutionError::Invariant);
                }
                next.try_reserve_exact(1).map_err(|_| ExecutionError::Capacity)?;
                next.insert(key, entry);
            }
            CrossingChange::Close(key) => {
                next.shift_remove(key).ok_or(ExecutionError::Invariant)?;
            }
        }
        workspace.resize(next.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let storage = self.journal.budget.adopt_record(workspace)?;
        self.journal.reserve(size_of::<Undo>() + id.len())?;
        if let Some(before) = &row.crossing_storage {
            self.journal.budget.retain_record(before)?;
        }
        self.journal.undo.try_reserve(1).map_err(|_| ExecutionError::Capacity)?;
        self.journal.undo.push(Undo::ProjectileCrossings {
            id: id.to_owned(),
            before: row.flight.encounters.replace(next),
            storage: row.crossing_storage.replace(storage),
        });
        Ok(())
    }

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
        if let Some(storage) = &flight.crossing_storage {
            self.journal.budget.retain_record(storage)?;
        }
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
