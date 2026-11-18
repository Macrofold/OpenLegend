//! A Rust SQL writer retains the real funded history input independently of
//! the settled candidate. The addon continues to serialize its own handoff.

use super::RuntimePreparedProducts;
use crate::events::OriginalOccurrence;
use crate::experience::CapturedHistoryInput;
use crate::received::{ReceivedChargeDirectory, ReceivedFrontier, TemporalReceipt};
use crate::reception::SensoryFacet;

pub struct RuntimeHistory(CapturedHistoryInput);

pub struct HistoryAccount<'a> {
    pub event_id: &'a str,
    pub actor_id: &'a str,
    pub awareness_payload: Option<&'a str>,
    pub temporal: Option<HistoryTemporal<'a>>,
}

pub struct HistoryTemporal<'a> {
    pub receipt: &'a TemporalReceipt,
    pub values: &'a [SensoryFacet],
    pub bytes: u64,
}

pub struct HistoryCut<'a> {
    pub actor_id: &'a str,
    pub at: f64,
    pub max_age_seconds: f64,
    pub forgotten: &'a [String],
    pub corrected: &'a [String],
    pub frontier: Option<&'a ReceivedFrontier>,
    pub recent_present: bool,
    pub recent_directories: &'a [ReceivedChargeDirectory],
    pub recent_bytes: u64,
    pub recent_count: u64,
}

impl RuntimePreparedProducts<'_> {
    /// Retain the actual exact-cut capture with its original backing guard.
    /// Authority to publish a scoped account still belongs to its reader.
    pub fn retain_history(&self) -> RuntimeHistory {
        RuntimeHistory(self.history.clone())
    }
}

impl RuntimeHistory {
    pub fn world_id(&self) -> &str {
        self.0.world_id()
    }
    pub fn generation(&self) -> &str {
        self.0.generation()
    }
    pub fn base_cut(&self) -> u64 {
        self.0.base_cut()
    }
    pub fn originals(&self) -> impl Iterator<Item = &OriginalOccurrence> {
        self.0.originals()
    }
    pub fn accounts(&self) -> impl Iterator<Item = HistoryAccount<'_>> {
        self.0.accounts().map(
            |(event_id, actor_id, awareness_payload, temporal)| HistoryAccount {
                event_id,
                actor_id,
                awareness_payload,
                temporal: temporal.map(|(receipt, values, bytes)| HistoryTemporal {
                    receipt,
                    values,
                    bytes,
                }),
            },
        )
    }
    pub fn cuts(&self) -> impl Iterator<Item = HistoryCut<'_>> {
        self.0.cuts().map(
            |(
                actor_id,
                at,
                max_age_seconds,
                forgotten,
                corrected,
                frontier,
                recent_present,
                recent_directories,
                recent_bytes,
                recent_count,
            )| HistoryCut {
                actor_id,
                at,
                max_age_seconds,
                forgotten,
                corrected,
                frontier,
                recent_present,
                recent_directories,
                recent_bytes,
                recent_count,
            },
        )
    }
    pub fn policy(&self) -> (u64, Option<&str>) {
        self.0.policy()
    }
}

/// A cold startup that changes only host metadata has no history, source or
/// privacy publication to project. The SQL writer still validates the cut.
pub struct RuntimeStartupPersistence(RuntimeHistory);

impl RuntimeStartupPersistence {
    pub fn binding(&self) -> (&str, &str, u64) {
        (
            self.0.world_id(),
            self.0.generation(),
            self.0.base_cut() + 1,
        )
    }
}

impl RuntimePreparedProducts<'_> {
    pub fn metadata_startup(&self) -> Result<RuntimeStartupPersistence, super::RuntimeError> {
        use super::CompletedOperation;
        if !matches!(self.operation, CompletedOperation::Startup(_))
            || self.restore.is_some()
            || self.protected_save.is_some()
            || !self.source_versions.is_empty()
            || self.events().next().is_some()
            || self.history.originals().next().is_some()
            || self.history.accounts().next().is_some()
            || self.history.cuts().next().is_some()
            || !startup_metadata_rows(self.records)
        {
            return Err(super::failure("startup requires a derived projection"));
        }
        Ok(RuntimeStartupPersistence(self.retain_history()))
    }
}

pub fn startup_metadata_rows(rows: &crate::records::ChangedRows) -> bool {
    rows.deletes.is_empty()
        && rows.expired.is_empty()
        && rows
            .writes
            .keys()
            .all(|name| matches!(name.as_str(), "data_world" | "world_settings"))
}
