//! Bind endpoint work to actions already working at the slice's start. Arrival
//! after motion cannot give newly started work any of that elapsed interval.
//! See docs/simulation-time.md#native-interval-contract.
use super::NativeParticipants;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::state::EntityHandle;
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) struct SliceActions {
    pub working: IndexMap<EntityHandle, String>,
    pub approaching: Vec<EntityHandle>,
    _reservation: ByteReservation,
}
impl SliceActions {
    pub(crate) fn capture(
        core: &CoreMutation<'_>,
        participants: &NativeParticipants,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let count = participants.actors().len();
        let mut reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                map_storage::<EntityHandle, String>(count).ok_or(ExecutionError::Capacity)?,
                count
                    .checked_mul(size_of::<EntityHandle>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut working = IndexMap::with_capacity(count);
        let mut approaching = Vec::with_capacity(count);
        for handle in participants.actors() {
            let Some(entity) = core.state.physical.entities.resolve(*handle) else {
                continue;
            };
            let Some(actor) = entity
                .actor
                .as_ref()
                .filter(|actor| actor.alive && !actor.incapacitated)
            else {
                continue;
            };
            let Some(action) = &actor.action else {
                continue;
            };
            if !matches!(action.kind.as_str(), "move" | "status-effect")
                || action.has_unconverted_fields()
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
            let restricted = core
                .state
                .installed
                .capabilities
                .capability_blocked(Some(entity), "locomotion")?;
            if action.stage == "working" && (!restricted || action.kind == "status-effect") {
                reservation.resize(
                    reservation
                        .bytes()
                        .checked_add(action.id.len())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                working.insert(*handle, action.id.clone());
            }
            if action.kind == "move" && action.stage == "approaching" && !restricted {
                approaching.push(*handle);
            }
        }
        Ok(Self {
            working,
            approaching,
            _reservation: reservation,
        })
    }
}
