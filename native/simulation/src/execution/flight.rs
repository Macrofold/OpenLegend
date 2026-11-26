//! Flight and falling state use the same physical journal as placement.

use super::*;
use crate::flight::FlightProgress;

impl PhysicalMutation<'_> {
    /// Replace the exact continuation and its owned route binding. Admission
    /// covers the old body through rollback and the new resident size.
    pub(crate) fn replace_flight(
        &mut self,
        entity: EntityHandle,
        next: Option<FlightProgress>,
        next_fall: Option<f64>,
    ) -> Result<(), ExecutionError> {
        let state = &self
            .state
            .entities
            .resolve(entity)
            .ok_or(ExecutionError::MissingEntity)?
            .spatial;
        if state.flight == next && state.fall_velocity == next_fall {
            return Ok(());
        }
        let key = UndoKey::Flight(entity.slot, entity.generation);
        let first = self.journal.first(&key)?;
        let bytes = heap_sum([
            size_of::<Undo>(),
            state.flight.heap_bytes().ok_or(ExecutionError::Capacity)?,
            next.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.journal.reserve(bytes)?;
        let state = &mut self
            .state
            .entities
            .resolve_mut(entity)
            .ok_or(ExecutionError::MissingEntity)?
            .spatial;
        let before = std::mem::replace(&mut state.flight, next);
        let fall_velocity = std::mem::replace(&mut state.fall_velocity, next_fall);
        if first {
            self.journal.retain(
                key,
                Undo::Flight {
                    entity,
                    before,
                    fall_velocity,
                },
            )?;
        }
        self.state
            .entities
            .settle_operational_memory(entity, &mut self.journal.reservation, false)
    }
}

impl PhysicalMutation<'_> {
    /// A refused owned flight waits at its actual physical pose for a new
    /// finite choice. The previous flight remains recoverable in the journal.
    pub(crate) fn await_flight_choice(
        &mut self,
        handle: EntityHandle,
    ) -> Result<(), ExecutionError> {
        let flight = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.spatial.flight.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        self.journal
            .reserve(flight.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let mut flight = self
            .state
            .entities
            .resolve(handle)
            .and_then(|entity| entity.spatial.flight.clone())
            .ok_or(ExecutionError::Invariant)?;
        flight.awaiting_choice = Some(true);
        self.replace_flight(handle, Some(flight), None)
    }
}
