//! An NPC's history query retains its originating reception cutoff. This is a
//! finite read scope, not a replacement temporal actor or a mutable SQL cache.
use crate::execution::ExecutionError;
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

impl NpcReceiptPrefix {
    /// The latest address from this block that the original cut can name.
    /// This routes storage only; each materialized receipt is checked again.
    pub(crate) fn block_ceiling(
        &self,
        directory: &crate::received::ReceivedChargeDirectory,
        header: &crate::received::ReceivedChargeEntry,
    ) -> Option<u64> {
        let epoch = self.epoch.as_deref()?;
        if header.order > self.through_order {
            return None;
        }
        let ceiling = header.entry_index;
        if directory.epoch != epoch || directory.physical_life != self.physical_life {
            return Some(ceiling);
        }
        match i128::from(header.batch_order).cmp(&i128::from(self.through_batch_order)) {
            std::cmp::Ordering::Less => Some(ceiling),
            std::cmp::Ordering::Equal => Some(ceiling.min(u64::try_from(self.through_entry_index).ok()?)),
            std::cmp::Ordering::Greater => None,
        }
    }
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
    #[serde(skip)]
    pub(crate) durable_revision: u64,
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
    permission: HistoricalPermission,
    #[serde(skip)]
    _storage: ByteReservation,
}
enum HistoricalPermission {
    ReceivingLife,
    /// Maintenance of already owned personal accounts does not require a live
    /// body. This private constructor never grants temporal receipt selection.
    PersonalOwner,
}

impl NpcHistoricalScope {
    pub(crate) fn capture_recent(
        state: &SimulationState,
        actor: &str,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::capture_history(
            state,
            actor,
            serial,
            HistoricalPermission::ReceivingLife,
            budget,
        )
    }
    /// Deliberate personal history inspection permits a real actor with no
    /// acquired accounts yet; absent privacy ownership is the actual empty cut.
    pub(crate) fn capture_history_personal(
        state: &SimulationState,
        actor: &str,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::capture_history(
            state,
            actor,
            serial,
            HistoricalPermission::PersonalOwner,
            budget,
        )
    }
    fn capture_history(
        state: &SimulationState,
        actor: &str,
        serial: u64,
        permission: HistoricalPermission,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let physical = state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        Self::capture_owner(
            state,
            actor,
            serial,
            physical.physical_life.unwrap_or(0),
            state
                .experience
                .actor(actor)
                .map_or(0, |actor| actor.privacy.revision()),
            permission,
            budget,
        )
    }
    pub(crate) fn capture(
        state: &SimulationState,
        read: &AcceptedActorRead,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if state.accepted_cut != read.accepted_cut
            || state.generation != read.perception.evidence.generation()
            || state.physical.header.id != read.perception.world_id
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        Self::capture_owner(
            state,
            &read.perception.actor_id,
            serial,
            read.perception.evidence.cut().observer.physical_life,
            read.perception.evidence.cut().privacy_revision,
            HistoricalPermission::ReceivingLife,
            budget,
        )
    }

    pub(crate) fn capture_personal(
        state: &SimulationState,
        actor: &str,
        serial: u64,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let history = state
            .experience
            .actor(actor)
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let physical = state
            .physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        Self::capture_owner(
            state,
            actor,
            serial,
            physical.physical_life.unwrap_or(0),
            history.privacy.revision(),
            HistoricalPermission::PersonalOwner,
            budget,
        )
    }

    fn capture_owner(
        state: &SimulationState,
        actor: &str,
        serial: u64,
        physical_life: u64,
        privacy_revision: u64,
        permission: HistoricalPermission,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let temporal = state.temporal.actor(actor);
        let epoch = temporal.map_or(0, |history| history.header().epoch.len());
        let bytes = (size_of::<Self>() + 2 * size_of::<usize>())
            .checked_add(state.physical.header.id.len())
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
        Ok(Self {
            world_id: state.physical.header.id.clone(),
            generation: state.generation.clone(),
            actor_id: actor.to_owned(),
            read_serial: serial,
            accepted_cut: state.accepted_cut,
            durable_revision: state.durable_revision,
            identity_through,
            sequence: state.physical.header.sequence,
            at: state.physical.header.sim_time,
            physical_life,
            privacy_revision,
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
            permission,
            _storage: storage,
        })
    }

    /// Historical copies survive ordinary age and contact loss. Only their
    /// actual timeline, observer life and privacy owner fence later disclosure.
    pub(crate) fn still_permitted(&self, state: &SimulationState) -> bool {
        self.refusal(state).is_none()
    }

    pub(crate) fn refusal(&self, state: &SimulationState) -> Option<&'static str> {
        if state.generation != self.generation || state.physical.header.id != self.world_id {
            return Some("native-history-timeline");
        }
        if !(state.physical.header.sim_time >= self.at) {
            return Some("native-history-chronology");
        }
        if matches!(self.permission, HistoricalPermission::ReceivingLife)
            && !state
                .physical
                .entities
                .get(&self.actor_id)
                .and_then(|entity| entity.actor.as_ref())
                .is_some_and(|actor| actor.physical_life.unwrap_or(0) == self.physical_life)
        {
            return Some("native-history-actor-life");
        }
        let revision = state
            .experience
            .actor(&self.actor_id)
            .map_or(0, |actor| actor.privacy.revision());
        (revision != self.privacy_revision).then_some("native-history-privacy-revision")
    }

    pub(super) fn allows_selection(&self, receipts_empty: bool) -> bool {
        match self.permission {
            HistoricalPermission::PersonalOwner => receipts_empty,
            HistoricalPermission::ReceivingLife => {
                matches!(self.receipt_prefix, NpcHistoryPrefix::Known { .. })
            }
        }
    }

    pub(super) fn allows_consolidation(&self) -> bool {
        matches!(self.permission, HistoricalPermission::PersonalOwner)
    }
    pub(crate) fn includes_receipt(&self, receipt: &TemporalReceipt) -> bool {
        if matches!(self.permission, HistoricalPermission::PersonalOwner) {
            return false;
        }
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
