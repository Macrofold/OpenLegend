//! An NPC's history query retains its originating reception cutoff. This is a
//! finite read scope, not a replacement temporal actor or a mutable SQL cache.
use crate::execution::ExecutionError;
use crate::experience::{PersonalSourceKind, SourceCoverage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{ReceivedFrontier, TemporalReceipt};
use crate::simulation::{AcceptedActorRead, SimulationState};
use serde::Serialize;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NpcReceiptPrefix {
    pub physical_life: u64,
    pub epoch: Option<String>,
    pub through_batch_order: i64,
    pub through_entry_index: i64,
    pub through_order: u64,
}

#[derive(Serialize)]
#[serde(tag = "state", rename_all = "kebab-case")]
pub(crate) enum NpcHistoryPrefix {
    Known {
        prefix: NpcReceiptPrefix,
    },
    Pending {
        #[serde(rename = "physicalLife")]
        physical_life: u64,
        epoch: String,
        #[serde(rename = "tailRevision")]
        tail_revision: u64,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NpcHistoricalScope {
    pub world_id: String,
    pub generation: String,
    pub actor_id: String,
    pub read_serial: u64,
    pub accepted_cut: u64,
    pub identity_through: u64,
    pub sequence: u64,
    pub at: f64,
    pub physical_life: u64,
    pub privacy_revision: u64,
    pub max_age_seconds: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub released_through: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frontier: Option<ReceivedFrontier>,
    pub receipt_prefix: NpcHistoryPrefix,
    #[serde(skip)]
    personal: [Option<SourceCoverage>; 3],
    #[serde(skip)]
    _storage: ByteReservation,
}

impl NpcHistoricalScope {
    pub(crate) fn capture(
        state: &SimulationState,
        read: &AcceptedActorRead,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let cut = read.perception.evidence.cut();
        if state.accepted_cut != read.accepted_cut
            || state.generation != read.perception.evidence.generation()
            || state.physical.header.id != read.perception.world_id
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let actor = &read.perception.actor_id;
        let temporal = state.temporal.actor(actor);
        let epoch = temporal.map_or(0, |history| history.header().epoch.len());
        let bytes = (size_of::<Self>() + 2 * size_of::<usize>())
            .checked_add(read.perception.world_id.len())
            .and_then(|n| n.checked_add(state.generation.len()))
            .and_then(|n| n.checked_add(actor.len()))
            .and_then(|n| n.checked_add(epoch))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let identity_through = state.physical.identity.next_id();
        let receipt_prefix = match state.temporal.receipt_prefix(actor, identity_through) {
            Ok(prefix) => NpcHistoryPrefix::Known {
                prefix: NpcReceiptPrefix {
                    physical_life: prefix.physical_life,
                    epoch: prefix.epoch.map(str::to_owned),
                    through_batch_order: prefix.through_batch_order,
                    through_entry_index: prefix.through_entry_index,
                    through_order: prefix.through_order,
                },
            },
            Err(request) => NpcHistoryPrefix::Pending {
                physical_life: request.physical_life,
                epoch: request.epoch.to_owned(),
                tail_revision: request.tail_revision,
            },
        };
        let coverage = |kind| {
            state
                .experience
                .optional_collection(actor, kind)
                .map(|collection| collection.map(|collection| collection.coverage().clone()))
                .map_err(ExecutionError::from)
        };
        Ok(Self {
            world_id: read.perception.world_id.clone(),
            generation: state.generation.clone(),
            actor_id: actor.clone(),
            read_serial: serial,
            accepted_cut: read.accepted_cut,
            identity_through,
            sequence: state.physical.header.sequence,
            at: read.perception.at,
            physical_life: cut.observer.physical_life,
            privacy_revision: cut.privacy_revision,
            max_age_seconds: state
                .installed
                .attention
                .value()
                .retention
                .recent
                .max_age_seconds,
            released_through: temporal.and_then(|history| history.header().released_through),
            frontier: temporal.and_then(|history| history.header().frontier.clone()),
            receipt_prefix,
            personal: [
                coverage(PersonalSourceKind::Awareness)?,
                coverage(PersonalSourceKind::Memory)?,
                coverage(PersonalSourceKind::Summary)?,
            ],
            _storage: storage,
        })
    }

    /// Historical copies survive ordinary age and contact loss. Only their
    /// actual timeline, observer life and privacy owner fence later disclosure.
    pub(crate) fn still_permitted(&self, state: &SimulationState) -> bool {
        state.generation == self.generation
            && state.physical.header.id == self.world_id
            && state.physical.header.sim_time >= self.at
            && state
                .physical
                .entities
                .get(&self.actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .is_some_and(|actor| actor.physical_life.unwrap_or(0) == self.physical_life)
            && state
                .experience
                .actor(&self.actor_id)
                .map_or(0, |actor| actor.privacy.revision())
                == self.privacy_revision
    }

    pub(crate) fn personal_coverage(&self, kind: PersonalSourceKind) -> Option<&SourceCoverage> {
        self.personal[match kind {
            PersonalSourceKind::Awareness => 0,
            PersonalSourceKind::Memory => 1,
            PersonalSourceKind::Summary => 2,
        }]
        .as_ref()
    }

    pub(crate) fn includes_receipt(&self, receipt: &TemporalReceipt) -> bool {
        let NpcHistoryPrefix::Known { prefix } = &self.receipt_prefix else {
            return false;
        };
        prefix.epoch.is_some()
            && receipt.locator.actor_id == self.actor_id
            && receipt.order <= prefix.through_order
            && (receipt.locator.physical_life != prefix.physical_life
                || Some(receipt.locator.epoch.as_str()) != prefix.epoch.as_deref()
                || (
                    receipt.locator.batch_order as i128,
                    receipt.locator.entry_index as i128,
                ) <= (
                    prefix.through_batch_order as i128,
                    prefix.through_entry_index as i128,
                ))
            && receipt.at >= (self.at - self.max_age_seconds).max(0.0)
            && receipt.at <= self.at
    }
}
