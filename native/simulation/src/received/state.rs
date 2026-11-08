//! Temporal actor ownership, complete recent directories and explicit residency.
//! Resident page tails are never interpreted as complete history. Cold records
//! retain original physical and logical coordinates at their accepted cut.

use super::{
    CoverageGap, ReceivedChargeDirectory, ReceivedError, ReceivedFrontier, ReceivedRecentDirectory,
    TemporalCurrentGroupCheckpoint, TemporalPageRecord, TemporalReceipt, TemporalReceiptLocator,
};
use crate::encoding::json_record;
use crate::experience::EmptyChildOwner;
use crate::records::{InstalledRow, OwnerCoverage};
use crate::values::{
    deserialize_nullable, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, sync::Arc};

mod accounts;
mod actor;
mod privacy;
pub(crate) use privacy::TemporalAccountAliases;
mod append;
mod save;
mod versions;
pub(crate) use actor::ensure_temporal_actor;
pub(crate) use versions::{SourceVersionPlan, apply_source_version_plan};
mod support;
pub(crate) use accounts::{AccountAdditionBudget, KnowledgeAccountChange};
pub(crate) use append::{ObservationCaptureOptions, TemporalAcquisitionCheckpoint};
pub use append::{
    PendingTemporalPage, ReceivedTransition, TemporalAcquisition, TemporalAppendError,
    TemporalCaptureFacet, TemporalCaptureInput,
};
pub(crate) use save::{TemporalSaveLimits, encode_temporal_changes, pack_temporal_save};
pub(crate) use support::SupportRetentionContext;
pub(super) use support::encoding::SupportEncoding;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalStateHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub namespace: String,
    pub actors: EmptyChildOwner,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AccountCharge {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub count: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountClass {
    Optional,
    Required,
    Speech,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalAccounts {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub next_due: Option<f64>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub knowledge_due: Option<f64>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub support_dirty_revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub support_settled_revision: u64,
    pub optional: AccountCharge,
    pub required: AccountCharge,
    pub speech: AccountCharge,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub archives: Option<IndexMap<AccountClass, AccountCharge>>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalActorHeader {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub epoch: String,
    /// Current record codec child-presence marker. Actual rows are separately
    /// owned; an inline page would be an incompatible transport.
    pub pages: [(); 0],
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub count: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub terminal_reserved_bytes: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub next_due: Option<f64>,
    pub maintenance_due: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub released_through: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub frontier: Option<ReceivedFrontier>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recording_gap: Option<CoverageGap>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub accounts: Option<TemporalAccounts>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub supports: Option<EmptyChildOwner>,
}

#[derive(Debug)]
pub struct TemporalActorHistory {
    actor_id: String,
    header: TemporalActorHeader,
    payload: Arc<str>,
    pages: BTreeMap<u64, Arc<TemporalPageRecord>>,
    complete_pages: bool,
    page_order_upper_bound: u64,
    recent: ReceivedRecentDirectory,
    pending_pages: Vec<Arc<PendingTemporalPage>>,
    supports: Option<super::TemporalSupportCollection>,
}

fn finite_optional(value: Option<f64>) -> bool {
    value.is_none_or(f64::is_finite)
}

impl TemporalActorHistory {
    /// Complete canonical block directories can cover cold pages without making
    /// their bodies resident. Checkpoints are the actual current owners used to
    /// reconcile secured terminal bytes, never a supplied aggregate promise.
    pub fn install(
        actor_id: String,
        row: InstalledRow,
        pages: Vec<Arc<TemporalPageRecord>>,
        coverage: OwnerCoverage,
        directories: &[ReceivedChargeDirectory],
        recordings: &[&TemporalCurrentGroupCheckpoint],
        through: f64,
    ) -> Result<Self, ReceivedError> {
        let header: TemporalActorHeader = serde_json::from_str(&row.payload)
            .map_err(|_| ReceivedError("Invalid current temporal actor encoding."))?;
        let parent = json_record(&["world", "experience", "temporal"])
            .map_err(|_| ReceivedError("Temporal actor owner encoding failed."))?;
        let id = json_record(&["world", "experience", "temporal", "actors", &actor_id])
            .map_err(|_| ReceivedError("Temporal actor identity encoding failed."))?;
        if !is_safe_record_id(&actor_id)
            || row.id != id
            || row.parent != parent
            || row.slot != actor_id
            || coverage.table != "mind_temporal_pages"
            || coverage.owner != id
            || !coverage.parent_present
            || !finite_optional(header.next_due)
            || header.accounts.as_ref().is_some_and(|accounts| {
                !finite_optional(accounts.next_due)
                    || !finite_optional(accounts.knowledge_due)
                    || accounts.support_settled_revision > accounts.support_dirty_revision
                    || accounts.archives.as_ref().is_some_and(|archives| {
                        archives.len() != 3
                            || [
                                AccountClass::Optional,
                                AccountClass::Required,
                                AccountClass::Speech,
                            ]
                            .iter()
                            .any(|class| !archives.contains_key(class))
                    })
            })
        {
            return Err(ReceivedError(
                "Invalid temporal actor ownership or maintenance.",
            ));
        }
        if let Some(frontier) = &header.frontier {
            if frontier
                .expired_through_time
                .is_some_and(|at| !at.is_finite() || at > through)
                || frontier
                    .pressure_through
                    .as_ref()
                    .is_some_and(|pressure| !pressure.received_at.is_finite())
            {
                return Err(ReceivedError("Invalid received eligibility frontier."));
            }
        }
        let pressure = header
            .frontier
            .as_ref()
            .and_then(|frontier| frontier.pressure_through.as_ref());
        let expected = vec![
            Value::from(actor_id.clone()),
            Value::from(header.next_due),
            Value::from(
                header
                    .frontier
                    .as_ref()
                    .and_then(|frontier| frontier.expired_through_time),
            ),
            Value::from(pressure.map(|pressure| pressure.address.batch_order)),
            Value::from(pressure.map(|pressure| pressure.address.entry_index)),
            Value::from(pressure.map(|pressure| pressure.address.member_index)),
            Value::from(pressure.map(|pressure| pressure.received_at)),
            Value::from(pressure.map(|pressure| pressure.order)),
            Value::from(header.bytes),
            Value::from(header.count),
        ];
        if json_record(&expected)
            .map_err(|_| ReceivedError("Temporal actor projection encoding failed."))?
            != json_record(&row.extra)
                .map_err(|_| ReceivedError("Temporal actor projection encoding failed."))?
        {
            return Err(ReceivedError(
                "Temporal actor columns disagree with its payload.",
            ));
        }
        let mut reserved = 0_u64;
        for recording in recordings {
            if recording.epoch != header.epoch
                || recording.last_source.observer.actor_id != actor_id
                || recording.last_source.observer.physical_life != header.physical_life
            {
                return Err(ReceivedError("Foreign temporal terminal reservation."));
            }
            if !recording.gap {
                reserved = reserved
                    .checked_add(
                        recording
                            .terminal_bytes
                            .checked_mul(recording.members.len() as u64)
                            .ok_or(ReceivedError("Temporal terminal reservation overflow."))?,
                    )
                    .ok_or(ReceivedError("Temporal terminal reservation overflow."))?;
            }
        }
        if reserved != header.terminal_reserved_bytes {
            return Err(ReceivedError(
                "Recording terminal reservations disagree with current owners.",
            ));
        }
        if directories
            .iter()
            .any(|directory| directory.actor_id != actor_id)
        {
            return Err(ReceivedError("Foreign temporal charge directory."));
        }
        let recent = ReceivedRecentDirectory::install(
            directories,
            header.frontier.as_ref(),
            Some((header.bytes, header.count)),
        )?;
        let mut installed = BTreeMap::new();
        for page in pages {
            if page.actor_id() != actor_id
                || page.position() >= coverage.next_ordinal
                || installed.insert(page.position(), page).is_some()
            {
                return Err(ReceivedError(
                    "Temporal resident page ownership or ordinal disagrees.",
                ));
            }
        }
        Ok(Self {
            actor_id,
            header,
            payload: Arc::from(row.payload),
            pages: installed,
            complete_pages: coverage.complete,
            page_order_upper_bound: coverage.next_ordinal,
            recent,
            pending_pages: Vec::new(),
            supports: None,
        })
    }
    pub fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub fn header(&self) -> &TemporalActorHeader {
        &self.header
    }
    pub fn payload(&self) -> &str {
        &self.payload
    }
    pub fn pages(&self) -> impl DoubleEndedIterator<Item = &Arc<TemporalPageRecord>> {
        self.pages.values()
    }
    pub fn pending_pages(&self) -> &[Arc<PendingTemporalPage>] {
        &self.pending_pages
    }
    pub fn complete_pages(&self) -> bool {
        self.complete_pages
    }
    pub fn page_order_upper_bound(&self) -> u64 {
        self.page_order_upper_bound
    }
    pub fn recent(&self) -> &ReceivedRecentDirectory {
        &self.recent
    }
    pub fn supports(&self) -> Option<&super::TemporalSupportCollection> {
        self.supports.as_ref()
    }
    pub(crate) fn install_supports(
        &mut self,
        supports: super::TemporalSupportCollection,
    ) -> Result<(), ReceivedError> {
        if self.supports.is_some()
            || supports.coverage().parent_present != self.header.supports.is_some()
        {
            return Err(ReceivedError(
                "Retained support presence disagrees with temporal owner.",
            ));
        }
        self.supports = Some(supports);
        Ok(())
    }
    pub fn receipt(
        &self,
        locator: &TemporalReceiptLocator,
        members: Option<&std::collections::BTreeSet<u64>>,
    ) -> Result<Option<TemporalReceipt>, ReceivedError> {
        if locator.actor_id != self.actor_id {
            return Err(ReceivedError("Foreign temporal receiver."));
        }
        for page in self.pages.values() {
            if let Some(receipt) = page.receipt(locator, members)? {
                return Ok(Some(receipt));
            }
        }
        for page in &self.pending_pages {
            if let Some(receipt) = page.receipt(locator, members)? {
                return Ok(Some(receipt));
            }
        }
        if self.complete_pages {
            Ok(None)
        } else {
            Err(ReceivedError(
                "Temporal receipt requires original cold coverage.",
            ))
        }
    }
}

#[derive(Debug)]
pub struct TemporalState {
    generation: String,
    header: TemporalStateHeader,
    actors: IndexMap<String, TemporalActorHistory>,
    actor_coverage: OwnerCoverage,
    undo: Vec<TemporalUndo>,
}

#[derive(Clone, Copy, Debug)]
pub struct TemporalCheckpoint {
    operations: usize,
}

#[derive(Debug)]
enum TemporalUndo {
    Reservation(crate::host::ByteReservation),
    CreatedActor {
        actor_id: String,
        before_next: u64,
    },
    Support {
        actor_id: String,
        id: String,
        before: Option<(usize, Arc<super::TemporalSupportRecord>)>,
        next_ordinal: u64,
        parent_present: bool,
    },
    Header {
        actor_id: String,
        before: TemporalActorHeader,
        payload: Arc<str>,
    },
    PendingAppend {
        actor_id: String,
    },
}

impl TemporalState {
    pub fn install(
        generation: String,
        header: TemporalStateHeader,
        actors: IndexMap<String, TemporalActorHistory>,
        actor_coverage: OwnerCoverage,
    ) -> Result<Self, ReceivedError> {
        if actor_coverage.table != "mind_temporal_actors"
            || actor_coverage.owner != "[\"world\",\"experience\",\"temporal\"]"
            || !actor_coverage.complete
            || !actor_coverage.parent_present
            || generation.is_empty()
            || header.version != 1
            || actors
                .iter()
                .any(|(actor, history)| actor != history.actor_id())
        {
            return Err(ReceivedError("Invalid received history owner."));
        }
        Ok(Self {
            generation,
            header,
            actors,
            actor_coverage,
            undo: Vec::new(),
        })
    }
    pub fn generation(&self) -> &str {
        &self.generation
    }
    pub fn header(&self) -> &TemporalStateHeader {
        &self.header
    }
    pub fn actor(&self, id: &str) -> Option<&TemporalActorHistory> {
        self.actors.get(id)
    }
    pub fn checkpoint(&self) -> TemporalCheckpoint {
        TemporalCheckpoint {
            operations: self.undo.len(),
        }
    }
    pub(super) fn retain_reservation(
        &mut self,
        reservation: crate::host::ByteReservation,
    ) -> Result<(), ReceivedError> {
        self.undo
            .try_reserve_exact(1)
            .map_err(|_| ReceivedError("Temporal undo capacity is unavailable."))?;
        self.undo.push(TemporalUndo::Reservation(reservation));
        Ok(())
    }
    pub fn rollback_to(&mut self, checkpoint: TemporalCheckpoint) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() {
            return Err(ReceivedError("Stale temporal rollback cursor."));
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().expect("Journal length checked") {
                TemporalUndo::Reservation(_) => {}
                TemporalUndo::CreatedActor {
                    actor_id,
                    before_next,
                } => {
                    if self.actors.shift_remove(&actor_id).is_none() {
                        return Err(ReceivedError("Temporal rollback actor is absent."));
                    }
                    self.actor_coverage.next_ordinal = before_next;
                }
                TemporalUndo::Support {
                    actor_id,
                    id,
                    before,
                    next_ordinal,
                    parent_present,
                } => {
                    let actor = self
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ReceivedError("Temporal support rollback actor is absent."))?;
                    let supports = actor
                        .supports
                        .as_mut()
                        .ok_or(ReceivedError("Temporal support rollback owner is absent."))?;
                    supports.records.shift_remove(&id);
                    if let Some((at, record)) = before {
                        supports.records.shift_insert(at, id, record);
                    }
                    supports.coverage.next_ordinal = next_ordinal;
                    supports.coverage.parent_present = parent_present;
                }
                TemporalUndo::Header {
                    actor_id,
                    before,
                    payload,
                } => {
                    let actor = self
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ReceivedError("Temporal rollback actor is absent."))?;
                    actor.header = before;
                    actor.payload = payload;
                }
                TemporalUndo::PendingAppend { actor_id } => {
                    let actor = self
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ReceivedError("Temporal rollback actor is absent."))?;
                    let page = actor
                        .pending_pages
                        .pop()
                        .ok_or(ReceivedError("Temporal rollback page is absent."))?;
                    actor
                        .recent
                        .rollback_append(&page.metadata().charge_directory)?;
                }
            }
        }
        Ok(())
    }
    pub fn discard_undo(&mut self) {
        self.undo.clear();
    }
}
