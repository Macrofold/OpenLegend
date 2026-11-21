//! The stand-alone decision formatter's inputs from its original accepted read.
use super::{
    AcceptedActorRead, ByteBudget, ByteReservation, RuntimeError, RuntimeNpcRead, failure,
};
use crate::install::reserve_typed_parse;
use serde::Deserialize;
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

pub struct RuntimeNpcDecisionFrame {
    pub x: f64,
    pub z: f64,
    pub heading: f64,
    pub support: Option<String>,
    _storage: ByteReservation,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OriginFrame {
    position: HorizontalPosition,
    heading: f64,
    support_surface_id: Option<String>,
}

#[derive(Deserialize)]
struct HorizontalPosition {
    x: f64,
    z: f64,
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
    /// Decode only the pose used for relative effects. The capture's encoded
    /// numbers retain the existing JSON normalization. The frame carries
    /// its support string's independent allowance through response application.
    pub fn frame(&self, budget: &ByteBudget) -> Result<RuntimeNpcDecisionFrame, RuntimeError> {
        let encoded = self.read.own_json();
        let mut storage =
            reserve_typed_parse::<OriginFrame>(encoded, 0, None, budget).map_err(failure)?;
        let frame: OriginFrame = serde_json::from_str(encoded).map_err(failure)?;
        storage.resize(
            frame
                .support_surface_id
                .as_ref()
                .map_or(0, String::capacity),
        )?;
        Ok(RuntimeNpcDecisionFrame {
            x: frame.position.x,
            z: frame.position.z,
            heading: frame.heading,
            support: frame.support_surface_id,
            _storage: storage,
        })
    }

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
