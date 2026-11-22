//! A requested history window keeps the NPC's original receipt ceiling. Only
//! the existing retained receipt reader may admit the asynchronously read rows.

use super::*;
use crate::{
    capture::{
        NpcHistoryPrefix, NpcPersonalScope, NpcReceiptSelection, NpcSourceRows, NpcSourceSelection,
    },
    received::TemporalReceiptLocator,
    runtime::{RuntimeRecentReceipt, RuntimeRecentSourceRead},
};

pub struct RuntimeNpcHistoryWindow {
    read_serial: u64,
    receipts: Vec<NpcReceiptSelection>,
    pub incomplete: bool,
    pub limit: u64,
    pub operations: u64,
    _storage: ByteReservation,
}

impl NativeWorldSession {
    /// Select only eligible address candidates from the actor's existing
    /// directory, and detach the pending save rows before the SQL wait.
    /// Newer accepted storage may supply old data, but cannot extend the cut.
    pub fn with_npc_history<T>(
        &self,
        read: &RuntimeNpcRead,
        from: f64,
        through: f64,
        prepare: impl FnOnce(RuntimeRecentSourceRead<'_>) -> T,
    ) -> Result<(RuntimeNpcHistoryWindow, Option<T>), RuntimeError> {
        self.require_active()?;
        let scope = &read.historical_scope;
        let state = &self.session.accepted().map_err(failure)?.state;
        if !read.query_expanded || !self.npc_host_current(read) || !scope.still_permitted(state) {
            return Err(stale("native-history-original-cut"));
        }
        let NpcHistoryPrefix::Known { prefix } = &scope.receipt_prefix else {
            return Err(RuntimeError::application_busy(
                "NPC original receipt tail unavailable",
            ));
        };
        let policy = &state.installed.attention.value().scene;
        let actor = state.temporal.actor(&scope.actor_id);
        let clipped = from.max((scope.at - scope.max_age_seconds).max(0.0));
        let through = through.min(scope.at);
        let mut window = RuntimeNpcHistoryWindow {
            read_serial: read.serial,
            receipts: Vec::new(),
            limit: policy.expansion_receipts,
            operations: policy.history_receipts,
            incomplete: prefix.epoch.is_none()
                || from < clipped
                || scope.frontier.as_ref().is_some_and(|frontier| {
                    frontier.expired_through_time.is_some_and(|cut| cut >= from)
                        || frontier
                            .pressure_through
                            .as_ref()
                            .is_some_and(|cut| cut.received_at >= from)
                })
                || actor
                    .and_then(|history| history.header().recording_gap.as_ref())
                    .is_some_and(|gap| gap.from <= through && gap.through >= clipped),
            _storage: self.budget.reserve(0)?,
        };
        let Some(actor) = actor.filter(|_| prefix.epoch.is_some() && clipped <= through) else {
            return Ok((window, None));
        };
        let directory = actor.recent();
        let maximum =
            usize::try_from(policy.candidate_visits.min(directory.count())).map_err(failure)?;
        window._storage.resize(
            maximum
                .checked_mul(size_of::<NpcReceiptSelection>())
                .ok_or_else(|| failure("capacity"))?,
        )?;
        window
            .receipts
            .try_reserve_exact(maximum)
            .map_err(failure)?;
        let maximum_blocks = usize::try_from(policy.candidate_visits).map_err(failure)?;
        'candidates: for (visited, block) in directory.directories().rev().enumerate() {
            if visited >= maximum_blocks {
                window.incomplete = true;
                break;
            }
            let Some(header) = block.entries.first() else {
                continue;
            };
            if header.through_at < clipped || header.at > through {
                continue;
            }
            let Some(ceiling) = prefix.block_ceiling(block, header) else {
                continue;
            };
            for entry_index in (header.first_entry..=ceiling).rev() {
                if window.receipts.len() == maximum {
                    window.incomplete = true;
                    break 'candidates;
                }
                window._storage.resize(
                    window
                        ._storage
                        .bytes()
                        .checked_add(scope.actor_id.len() + block.epoch.len())
                        .ok_or_else(|| failure("capacity"))?,
                )?;
                window.receipts.push(NpcReceiptSelection {
                    locator: TemporalReceiptLocator {
                        actor_id: scope.actor_id.clone(),
                        physical_life: block.physical_life,
                        epoch: block.epoch.clone(),
                        batch_order: header.batch_order,
                        entry_index,
                    },
                    member_indices: None,
                });
            }
        }
        let rows = (!window.receipts.is_empty())
            .then(|| self.with_receipt_source_rows(scope, &window.receipts, None, prepare))
            .transpose()?;
        Ok((window, rows))
    }

    /// The SQL result is still a candidate. Apply the originating receipt
    /// prefix and the actual privacy of this later accepted world, then keep
    /// the admitted inventory with the same NPC request for final disclosure.
    pub fn admit_npc_history(
        &mut self,
        read: &mut RuntimeNpcRead,
        window: RuntimeNpcHistoryWindow,
        rows: NpcSourceRows,
    ) -> Result<usize, RuntimeError> {
        self.require_active()?;
        if !self.npc_host_current(read) || read.serial != window.read_serial {
            return Err(stale("native-history-original-cut"));
        }
        let state = &self.session.accepted().map_err(failure)?.state;
        if !read.historical_scope.still_permitted(state) {
            return Err(stale("native-history-after-storage"));
        }
        self.reserve_npc_inventory(read)?;
        let RuntimeNpcHistoryWindow {
            receipts, _storage, ..
        } = window;
        let selection = NpcSourceSelection {
            receipts,
            personal: Vec::new(),
            consolidation_job: None,
        };
        let sources = crate::capture::PreparedNpcSources::prepare(
            state,
            read.historical_scope.clone(),
            NpcPersonalScope::capture(state, &read.historical_scope.actor_id).map_err(failure)?,
            &selection,
            rows,
            &self.budget,
        )
        .map_err(failure)?;
        self.retain_npc_sources(read, sources)
    }
}

impl RuntimeNpcRead {
    /// Borrow exact permitted rows and their bindable indexes after storage.
    /// The inventory stays on this reader through the final decision.
    pub fn query_receipts(
        &self,
        inventory: usize,
    ) -> Result<
        (
            impl ExactSizeIterator<Item = RuntimeRecentReceipt<'_>>,
            bool,
        ),
        RuntimeError,
    > {
        let prepared = self
            .sources
            .get(inventory)
            .ok_or_else(|| failure("NPC history unavailable"))?;
        Ok((
            prepared
                .receipts
                .iter()
                .map(RuntimeRecentReceipt::from_capture),
            !prepared.unavailable_receipts.is_empty(),
        ))
    }
}
