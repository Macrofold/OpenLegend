//! The stand-alone decision formatter's inputs from its original accepted read.
use super::{AcceptedActorRead, ByteBudget, ByteReservation, RuntimeError, RuntimeNpcRead};
pub use crate::capture::npc_self::RuntimeNpcDecisionFrame;
use std::mem::size_of;

pub struct RuntimeNpcDecisionOrigin<'a> {
    pub actor_id: &'a str,
    pub accepted_cut: u64,
    pub world_id: &'a str,
    pub generation: &'a str,
    pub at: f64,
    pub identity_through: u64,
    read: &'a AcceptedActorRead,
}

impl RuntimeNpcRead {
    /// Borrow the exact original cut for the historical query and stand-alone
    /// formatter. The read is still required for binding and currentness.
    pub fn decision_origin(&self) -> RuntimeNpcDecisionOrigin<'_> {
        RuntimeNpcDecisionOrigin {
            actor_id: &self.read.perception.actor_id,
            accepted_cut: self.read.accepted_cut,
            world_id: &self.historical_scope.world_id,
            generation: &self.historical_scope.generation,
            at: self.historical_scope.at,
            identity_through: self.historical_scope.identity_through,
            read: &self.read,
        }
    }
}

impl RuntimeNpcDecisionOrigin<'_> {
    /// Selected original entries in the native presentation order. The
    /// output owns only ordinal backing, independently of the detached read.
    pub fn attention_ordinals(
        &self,
        budget: &ByteBudget,
    ) -> Result<(Vec<usize>, ByteReservation), RuntimeError> {
        use crate::host::CapacityError;

        let presentations = self.read.perception.attention_presentations();
        let count = presentations.iter().filter(|entry| entry.selected).count();
        let storage =
            budget.reserve(count.checked_mul(size_of::<usize>()).ok_or(CapacityError)?)?;
        let mut ordinals = Vec::new();
        ordinals
            .try_reserve_exact(count)
            .map_err(|_| CapacityError)?;
        ordinals.extend(
            presentations
                .iter()
                .enumerate()
                .filter_map(|(index, entry)| entry.selected.then_some(index)),
        );
        Ok((ordinals, storage))
    }
}
