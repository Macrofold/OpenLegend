//! Temporal actor ownership, complete recent directories and explicit residency.
//! Resident page tails are never interpreted as complete history. Cold records
//! retain original physical and logical coordinates at their accepted cut.

use super::{
    CoverageGap, ReceivedChargeDirectory, ReceivedError, ReceivedFrontier, ReceivedRecentDirectory,
    TemporalCurrentGroupCheckpoint, TemporalPageRecord, TemporalReceipt, TemporalReceiptLocator,
};
use crate::encoding::json_record;
use crate::experience::EmptyChildOwner;
use crate::host::retained_size::HeapBytes;
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
mod materialize;
pub(crate) use materialize::hydrate_selected_temporal_pages;
mod privacy;
pub(crate) use privacy::TemporalAccountAliases;
mod revoke;
pub(crate) use revoke::{
    ReleasedTemporalProofs, TemporalFacetRevocation, TemporalPageRevocation,
    invalidate_temporal_evidence, invalidate_temporal_facets,
};
mod append;
mod maintenance;
mod page_storage;
use page_storage::{fresh_page_map_bytes, restored_page_bytes};
mod tail;
use tail::ReceiptTailState;
pub(crate) use tail::{TemporalReceiptPrefix, TemporalReceiptTail, TemporalReceiptTailRequest};
mod residency;
mod save;
pub(crate) use residency::{PackedTemporalSave, PreparedTemporalResidency, SavedTemporalResidency};
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
pub(crate) use save::{
    TemporalSaveLimits, encode_temporal_changes, pack_temporal_save, preview_temporal_rows,
};
pub(super) use support::encoding::SupportEncoding;
pub(crate) use support::{
    SupportRetentionContext, record_snapshot_support, retain_captured_support,
};

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
    actor_storage: crate::host::ResidentReservation,
    header: TemporalActorHeader,
    payload: Arc<str>,
    header_storage: crate::host::ResidentReservation,
    pages: BTreeMap<u64, Arc<TemporalPageRecord>>,
    complete_pages: bool,
    page_order_upper_bound: u64,
    tail: ReceiptTailState,
    recent: ReceivedRecentDirectory,
    pending_pages: Vec<Arc<PendingTemporalPage>>,
    pending_storage: crate::host::ResidentReservation,
    supports: Option<super::TemporalSupportCollection>,
    page_storage: crate::host::ResidentReservation,
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
        closed_tail: bool,
        budget: &crate::host::ByteBudget,
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
            budget,
        )?;
        let page_storage = budget.reserve(fresh_page_map_bytes(pages.len())?)
            .map_err(|_| ReceivedError("Temporal page-index exceeds native allowance."))?;
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
        let tail = ReceiptTailState::installed(&installed, coverage.complete || closed_tail);
        let header_storage = budget
            .reserve_record(
                header
                    .heap_bytes()
                    .and_then(|n| {
                        n.checked_add(row.payload.len() + 2 * std::mem::size_of::<usize>())
                    })
                    .ok_or(ReceivedError("Temporal actor allocation overflow."))?,
            )
            .map_err(|_| ReceivedError("Temporal actor exceeds native allowance."))?;
        Ok(Self {
            actor_storage: budget
                .reserve_record(actor_id.capacity().checked_mul(2).ok_or(ReceivedError(
                    "Temporal actor identity allocation overflow.",
                ))?)
                .map_err(|_| ReceivedError("Temporal actor identity exceeds native allowance."))?,
            actor_id,
            header,
            payload: Arc::from(row.payload),
            header_storage,
            pages: installed,
            complete_pages: coverage.complete,
            page_order_upper_bound: coverage.next_ordinal,
            tail,
            recent,
            pending_pages: Vec::new(),
            pending_storage: budget.reserve_backing(0).map_err(|_| {
                ReceivedError("Temporal pending placement exceeds native allowance.")
            })?,
            supports: None,
            page_storage: budget.adopt_backing(page_storage)
                .map_err(|_| ReceivedError("Temporal page-index custody is unavailable."))?,
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
    pub fn pages(
        &self,
    ) -> impl DoubleEndedIterator<Item = &Arc<TemporalPageRecord>> + ExactSizeIterator {
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
    root_storage: crate::host::ResidentReservation,
    actor_backing: crate::host::ResidentReservation,
    undo: Vec<TemporalUndo>,
    undo_storage: crate::host::ByteReservation,
    budget: crate::host::ByteBudget,
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
        storage: crate::host::ResidentReservation,
    },
    PendingAppend {
        actor_id: String,
        tail_before: ReceiptTailState,
    },
    PageEdit {
        actor_id: String,
        before: Arc<TemporalPageRecord>,
        after_position: Option<u64>,
        removed: Vec<super::RecentDirectoryBlock>,
        appended: Vec<ReceivedChargeDirectory>,
        tail_before: ReceiptTailState,
        page_restore: crate::host::ByteReservation,
    },
    HydratedPages {
        actor_id: String,
        positions: Vec<u64>,
        pending: Vec<(usize, Arc<PendingTemporalPage>)>,
        next_ordinal: u64,
        // Physical projections of genuine pending batches must enter the same
        // accepted SQL output before their pending owners can be discarded.
        projected: Vec<String>,
    },
    RecentRetirement {
        actor_id: String,
        before: maintenance::RecentRetirementUndo,
    },
}

impl TemporalState {
    pub fn install(
        generation: String,
        header: TemporalStateHeader,
        actors: IndexMap<String, TemporalActorHistory>,
        actor_coverage: OwnerCoverage,
        budget: &crate::host::ByteBudget,
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
            root_storage: budget
                .reserve_record(
                    generation
                        .capacity()
                        .checked_add(
                            header
                                .heap_bytes()
                                .ok_or(ReceivedError("Temporal root allocation overflow."))?,
                        )
                        .and_then(|n| n.checked_add(actor_coverage.table.capacity()))
                        .and_then(|n| n.checked_add(actor_coverage.owner.capacity()))
                        .ok_or(ReceivedError("Temporal root allocation overflow."))?,
                )
                .map_err(|_| ReceivedError("Temporal root exceeds native allowance."))?,
            actor_backing: budget
                .reserve_backing(
                    crate::host::retained_size::map_storage::<String, TemporalActorHistory>(
                        actors.capacity(),
                    )
                    .ok_or(ReceivedError("Temporal actor map allocation overflow."))?,
                )
                .map_err(|_| ReceivedError("Temporal actor map exceeds native allowance."))?,
            generation,
            header,
            actors,
            actor_coverage,
            undo: Vec::new(),
            undo_storage: budget
                .reserve(0)
                .map_err(|_| ReceivedError("Temporal undo exceeds native allowance."))?,
            budget: budget.clone(),
        })
    }
    pub fn generation(&self) -> &str {
        &self.generation
    }
    fn reserve_actor_capacity(&mut self, capacity: usize) -> Result<(), ReceivedError> {
        if capacity <= self.actors.capacity() {
            return Ok(());
        }
        let error = || ReceivedError("Temporal actor map exceeds native allowance.");
        let target = capacity.checked_mul(2).ok_or_else(error)?;
        self.budget
            .resize_backing(
                &mut self.actor_backing,
                crate::host::retained_size::map_storage::<String, TemporalActorHistory>(target)
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        self.actors
            .try_reserve(capacity - self.actors.len())
            .map_err(|_| error())?;
        let actual = crate::host::retained_size::map_storage::<String, TemporalActorHistory>(
            self.actors.capacity(),
        )
        .ok_or_else(error)?;
        if actual > self.actor_backing.bytes() {
            return Err(error());
        }
        self.actor_backing.resize(actual).map_err(|_| error())
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
        self.reserve_undo_slots(1, &self.budget.clone())?;
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
                    storage,
                } => {
                    let actor = self
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ReceivedError("Temporal rollback actor is absent."))?;
                    actor.header = before;
                    actor.payload = payload;
                    actor.header_storage = storage;
                }
                TemporalUndo::PendingAppend {
                    actor_id,
                    tail_before,
                } => {
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
                    actor.tail = tail_before;
                }
                TemporalUndo::PageEdit {
                    actor_id,
                    before,
                    after_position,
                    removed,
                    appended,
                    tail_before,
                    page_restore,
                } => {
                    let actor = self
                        .actors
                        .get_mut(&actor_id)
                        .ok_or(ReceivedError("Temporal edit rollback actor is absent."))?;
                    for directory in appended.iter().rev() {
                        actor.recent.rollback_append(directory)?;
                    }
                    for directory in removed {
                        actor.recent.restore_block(directory)?;
                    }
                    if let Some(position) = after_position {
                        actor.pages.remove(&position);
                    }
                    if page_restore.bytes() != 0 {
                        self.budget.restore_backing(&mut actor.page_storage, page_restore)
                            .map_err(|_| ReceivedError("Temporal inverse page-index custody is unavailable."))?;
                    }
                    actor.pages.insert(before.position(), before);
                    actor.settle_page_entries()?;
                    actor.tail = tail_before;
                }
                TemporalUndo::HydratedPages {
                    actor_id,
                    positions,
                    pending,
                    next_ordinal,
                    projected: _,
                } => {
                    let actor = self.actors.get_mut(&actor_id).ok_or(ReceivedError(
                        "Temporal hydration rollback actor is absent.",
                    ))?;
                    for position in positions {
                        actor.pages.remove(&position).ok_or(ReceivedError(
                            "Hydrated temporal page is absent during rollback.",
                        ))?;
                    }
                    for (position, page) in pending {
                        actor.pending_pages.insert(position, page);
                    }
                    actor.page_order_upper_bound = next_ordinal;
                    actor.settle_page_entries()?;
                }
                TemporalUndo::RecentRetirement { actor_id, before } => {
                    let actor = self.actors.get_mut(&actor_id)
                        .ok_or(ReceivedError("Temporal retirement rollback actor is absent."))?;
                    before.restore(actor)?;
                }
            }
        }
        Ok(())
    }
    pub fn discard_undo(&mut self) {
        // Resource guards precede the before-images they fund in the logical
        // stack. Free those images first, just like reverse-order rollback.
        while let Some(undo) = self.undo.pop() {
            drop(undo);
        }
        self.undo = Vec::new();
        self.undo_storage
            .resize(0)
            .expect("shrinking a live reservation cannot fail");
    }

    pub(crate) fn reserve_undo_slots(
        &mut self,
        count: usize,
        budget: &crate::host::ByteBudget,
    ) -> Result<(), ReceivedError> {
        let error = || ReceivedError("Temporal undo capacity is unavailable.");
        if !budget.owns(&self.undo_storage) {
            return Err(error());
        }
        let needed = self.undo.len().checked_add(count).ok_or_else(error)?;
        if needed <= self.undo.capacity() {
            return Ok(());
        }
        let target = self
            .undo
            .capacity()
            .checked_mul(2)
            .map(|n| n.max(needed).max(4))
            .ok_or_else(error)?;
        self.undo_storage
            .resize(
                target
                    .checked_mul(std::mem::size_of::<TemporalUndo>())
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        self.undo
            .try_reserve_exact(target - self.undo.len())
            .map_err(|_| error())
    }
}
