//! The decision menu's target order is the received body order, filtered by
//! actual detailed attention and explicit expansions. A broad scene or the raw
//! current-value packet is not a grant to discover every physical participant.
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::CurrentBodyReadScope;
use crate::simulation::{AcceptedActorRead, SimulationState};
use std::mem::size_of;

pub(crate) struct NpcObservationSelection {
    body_ordinals: Vec<usize>,
    _storage: ByteReservation,
}
impl NpcObservationSelection {
    pub(crate) fn body_ordinals(&self) -> &[usize] {
        &self.body_ordinals
    }
    pub(crate) fn prepare(
        state: &SimulationState,
        read: &AcceptedActorRead,
        expanded_body_ordinals: &[usize],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !matches!(read.purpose, super::ActorReadPurpose::NpcDecision)
            || read.accepted_cut != state.accepted_cut
            || read.perception.world_id != state.physical.header.id
            || read.perception.evidence.generation() != state.generation
            || expanded_body_ordinals
                .iter()
                .any(|index| *index >= read.perception.bodies.len())
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let storage = budget.reserve(
            read.perception
                .bodies
                .len()
                .checked_mul(size_of::<usize>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut body_ordinals = Vec::with_capacity(read.perception.bodies.len());
        let _expanded_storage = budget.reserve(read.perception.bodies.len())?;
        let mut expanded = vec![0u8; read.perception.bodies.len()];
        for index in expanded_body_ordinals {
            expanded[*index] = 1;
        }
        let scope = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            &read.perception.actor_id,
        )?;
        if let Some(scope) = scope {
            let entries = scope
                .state()
                .attention
                .as_ref()
                .map(|attention| &attention.entries);
            for (index, body) in read.perception.bodies.iter().enumerate() {
                if expanded[index] == 0
                    && !entries.is_some_and(|entries| {
                        entries
                            .iter()
                            .any(|entry| entry.source_id == body.source_id)
                    })
                {
                    continue;
                }
                // A read can be held across application awaits. Preparation
                // binds the real same-cut lease rather than trusting its ID.
                if scope
                    .native_body(&body.source_id)?
                    .is_some_and(|current| current.field.id == body.lease_id)
                {
                    body_ordinals.push(index);
                }
            }
        }
        Ok(Self {
            body_ordinals,
            _storage: storage,
        })
    }
}
