//! The stand-alone decision formatter's inputs from its original accepted read.
use super::{AcceptedActorRead, ByteBudget, ByteReservation, RuntimeError, RuntimeNpcRead, failure};
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

#[derive(Deserialize)]
struct CurrentAttention {
    attention: SelectedAttention,
}

#[derive(Deserialize)]
struct SelectedAttention {
    entries: Vec<AttentionKey>,
}

#[derive(Deserialize)]
struct AttentionKey {
    key: String,
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
        let mut storage = reserve_typed_parse::<OriginFrame>(encoded, 0, None, budget)
            .map_err(failure)?;
        let frame: OriginFrame = serde_json::from_str(encoded).map_err(failure)?;
        storage.resize(frame.support_surface_id.as_ref().map_or(0, String::capacity))?;
        Ok(RuntimeNpcDecisionFrame {
            x: frame.position.x,
            z: frame.position.z,
            heading: frame.heading,
            support: frame.support_surface_id,
            _storage: storage,
        })
    }

    /// Decode the original selected entries and resolve them to the unchanged
    /// native presentation ordinals. Call once per original read and keep the
    /// returned guard with the vector through both formatter uses.
    pub fn attention_ordinals(
        &self,
        budget: &ByteBudget,
    ) -> Result<(Vec<usize>, ByteReservation), RuntimeError> {
        let presentations = self.read.perception.attention_presentations();
        if presentations.is_empty() {
            return Ok((Vec::new(), budget.reserve(0)?));
        }
        let encoded = self
            .read
            .perception
            .encoded_npc_current()
            .ok_or_else(|| failure("NPC current attention is unavailable"))?;
        let _parse = reserve_typed_parse::<CurrentAttention>(
            encoded,
            size_of::<AttentionKey>(),
            None,
            budget,
        )
        .map_err(failure)?;
        let current: CurrentAttention = serde_json::from_str(encoded).map_err(failure)?;
        let entries = &current.attention.entries;
        let capacity = presentations.len().min(entries.len());
        let storage = budget.reserve(
            capacity
                .checked_mul(size_of::<usize>())
                .ok_or_else(|| failure("NPC attention selection size"))?,
        )?;
        let mut ordinals = Vec::new();
        ordinals.try_reserve_exact(capacity).map_err(failure)?;
        // The native presentation roster comes from an ordered map with
        // unique keys, so at most one ordinal can match each selected entry.
        for (ordinal, presentation) in presentations.iter().enumerate() {
            if entries.iter().any(|entry| entry.key == presentation.key) {
                ordinals.push(ordinal);
            }
        }
        Ok((ordinals, storage))
    }
}
