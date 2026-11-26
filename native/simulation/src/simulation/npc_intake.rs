//! Optional cognition admission changes the saved semantic continuation through
//! the same candidate journal as chosen work. Scheduling hints grant no effects.
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use serde::Deserialize;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcIntakeRequest {
    pub actor_id: String,
    pub operation: NpcIntakeOperation,
}
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) enum NpcIntakeOperation {
    #[serde(rename_all = "camelCase")]
    ReserveDiscovery {
        #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
        interval: u64,
        reservation: String,
    },
    SettleDiscovery {
        reservation: String,
        dispatched: bool,
    },
}
pub(super) struct NpcIntakeCursor {
    request: Option<NpcIntakeRequest>,
    _storage: ByteReservation,
}
pub(crate) struct CompletedNpcIntake {
    pub(crate) outcome: Outcome,
    _storage: ByteReservation,
}
impl NpcIntakeCursor {
    pub(super) fn new(
        request: NpcIntakeRequest,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let reservation = match &request.operation {
            NpcIntakeOperation::ReserveDiscovery { reservation, .. }
            | NpcIntakeOperation::SettleDiscovery { reservation, .. } => reservation,
        };
        if !crate::values::is_safe_record_id(&request.actor_id) || reservation.is_empty() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let storage = budget.reserve(
            size_of::<Self>()
                .checked_add(request.actor_id.capacity())
                .and_then(|n| n.checked_add(reservation.capacity()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            request: Some(request),
            _storage: storage,
        })
    }
    pub(super) fn complete(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<CompletedNpcIntake, ExecutionError> {
        let request = self
            .request
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let storage = budget.reserve(size_of::<CompletedNpcIntake>() + "npc-intake".len())?;
        let ok = match request.operation {
            NpcIntakeOperation::ReserveDiscovery {
                interval,
                reservation,
            } => core
                .physical()
                .reserve_discovery(&request.actor_id, interval, reservation)?,
            NpcIntakeOperation::SettleDiscovery {
                reservation,
                dispatched,
            } => core
                .physical()
                .settle_discovery(&request.actor_id, &reservation, dispatched)?,
        };
        Ok(CompletedNpcIntake {
            outcome: Outcome {
                ok,
                code: "npc-intake".into(),
                message: "".into(),
                spent: None,
                outputs: None,
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            },
            _storage: storage,
        })
    }
}
