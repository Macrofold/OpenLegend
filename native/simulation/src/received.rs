//! Exact received chronology and retained block metadata.
//!
//! Addresses belong to the observer, physical life and saved receipt epoch;
//! neither SQL packing nor worker order creates a new address or observation.
//! Mirrors domain/received-batches.ts and temporal-evidence.ts's directory owner.

use std::collections::{BTreeMap, BTreeSet};
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::identity::MAX_SAFE_INTEGER;
use crate::reception::{EvidenceFamily, EvidenceSource, SourceRevision};
use crate::values::{deserialize_nullable, deserialize_present_option, deserialize_safe_integer};

mod alias_allocation;
mod current;
mod metadata;
pub use alias_allocation::DependencyAliasAllocation;
pub(crate) use alias_allocation::temporal_receipt_aliases_bound;
mod result;
pub(crate) use current::{
    CurrentRecordingContext, CurrentRecordingRevocation, CurrentRecordingUpdates,
    TemporalCurrentGroupInput, current_group_recording_complete, plan_current_recording_revocation,
    terminal_member_bytes,
};
mod save;
mod selection;
pub(crate) use save::encode_received_value_changes;
pub(crate) use selection::{
    CapturedTemporalReceipt, capture_received_entry, observation_receipt_member_indices, select_temporal_receipt_facets,
    temporal_field_aliases, temporal_receipt_account_aliases, temporal_receipt_aliases,
};
mod recent_residency;
mod recent;
pub(crate) use recent::{CompletedRecentRetention, RecentRetentionCursor};
mod retained_size;
use recent_residency::RecentDirectoryBlock;
pub use result::*;
mod page;
mod state;
pub use state::*;
mod validation;
pub use page::*;
pub use validation::*;
pub mod record;
pub use metadata::*;
pub mod values;
pub use record::*;
mod checkpoint;
mod support;
pub use support::{TemporalSupportCapsule, TemporalSupportCollection, TemporalSupportRecord};
mod install;
pub use checkpoint::{CurrentMemberPart, TemporalCurrentContent, TemporalCurrentGroupCheckpoint};
pub(crate) use install::install_temporal;
pub use values::{
    ReceivedValueFragment, ReceivedValueRecord, ReceivedValueReference, ReceivedValues,
    ReceivedValuesCheckpoint, RetainedValue, retain_received_value,
};

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedPosition {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub batch_order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub entry_index: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub member_index: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalReceiptLocator {
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub epoch: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub batch_order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub entry_index: u64,
}

impl TemporalReceiptLocator {
    pub(crate) fn id_len(&self) -> Option<usize> {
        "temporal-receipt-"
            .len()
            .checked_add(self.epoch.len())?
            .checked_add(2)?
            .checked_add(if self.batch_order == 0 {
                1
            } else {
                self.batch_order.ilog10() as usize + 1
            })?
            .checked_add(if self.entry_index == 0 {
                1
            } else {
                self.entry_index.ilog10() as usize + 1
            })
    }
    pub fn id(&self) -> String {
        format!(
            "temporal-receipt-{}-{}-{}",
            self.epoch, self.batch_order, self.entry_index
        )
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ReceiptObserver<'a> {
    actor_id: &'a str,
    physical_life: u64,
}
#[derive(Serialize)]
pub(crate) struct TemporalReceiptSource<'a> {
    family: EvidenceFamily,
    id: &'a str,
    revision: u64,
    observer: ReceiptObserver<'a>,
}
/// Serialize the actual receipt source factory without cloning its identifiers.
/// Both callers hold a validated locator and its corresponding receipt ID.
pub(crate) fn temporal_receipt_source<'a>(
    locator: &'a TemporalReceiptLocator,
    id: &'a str,
) -> TemporalReceiptSource<'a> {
    TemporalReceiptSource {
        family: EvidenceFamily::NativeExposure,
        id,
        revision: 1,
        observer: ReceiptObserver {
            actor_id: &locator.actor_id,
            physical_life: locator.physical_life,
        },
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParsedTemporalReceiptId {
    pub epoch: String,
    pub batch_order: u64,
    pub entry_index: u64,
}

fn canonical_digits(value: &str) -> Option<u64> {
    if value.is_empty()
        || !value.bytes().all(|byte| byte.is_ascii_digit())
        || (value.len() > 1 && value.starts_with('0'))
    {
        return None;
    }
    value
        .parse::<u64>()
        .ok()
        .filter(|value| *value <= MAX_SAFE_INTEGER)
}

/// Mirrors the existing receipt grammar exactly. Parsing supplies only candidate
/// coordinates; the actual observer and receiving life still come from its owner.
pub fn parse_temporal_receipt_id(id: &str) -> Option<ParsedTemporalReceiptId> {
    let body = id.strip_prefix("temporal-receipt-")?;
    let (before_entry, entry) = body.rsplit_once('-')?;
    let (epoch, batch) = before_entry.rsplit_once('-')?;
    let (prefix, epoch_number) = epoch.rsplit_once("-receipt-epoch-")?;
    if prefix.is_empty()
        || prefix.contains(['\n', '\r', '\u{2028}', '\u{2029}'])
        || epoch_number.is_empty()
        || !epoch_number.bytes().all(|byte| byte.is_ascii_digit())
    {
        return None;
    }
    let batch_order = canonical_digits(batch)?;
    let entry_index = canonical_digits(entry)?;
    if batch_order == 0 {
        return None;
    }
    Some(ParsedTemporalReceiptId {
        epoch: epoch.to_owned(),
        batch_order,
        entry_index,
    })
}

pub fn temporal_receipt_locator_from_source(
    source: &EvidenceSource,
) -> Option<TemporalReceiptLocator> {
    if source.family != EvidenceFamily::NativeExposure
        || source.revision != SourceRevision::Number(1)
    {
        return None;
    }
    let parsed = parse_temporal_receipt_id(&source.id)?;
    Some(TemporalReceiptLocator {
        actor_id: source.observer.actor_id.clone(),
        physical_life: source.observer.physical_life,
        epoch: parsed.epoch,
        batch_order: parsed.batch_order,
        entry_index: parsed.entry_index,
    })
}

pub fn is_temporal_receipt_source(source: &EvidenceSource) -> bool {
    temporal_receipt_locator_from_source(source).is_some()
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedAddress {
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub epoch: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub batch_order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub entry_index: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub member_index: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedPressureFrontier {
    pub address: ReceivedPosition,
    pub received_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub order: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedFrontier {
    #[serde(deserialize_with = "deserialize_nullable")]
    pub expired_through_time: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pressure_through: Option<ReceivedPressureFrontier>,
}

pub fn received_position_eligible(
    position: &ReceivedPosition,
    at: f64,
    frontier: Option<&ReceivedFrontier>,
) -> bool {
    frontier.is_none_or(|frontier| {
        frontier
            .expired_through_time
            .is_none_or(|expired| at > expired)
            && frontier
                .pressure_through
                .as_ref()
                .is_none_or(|pressure| position > &pressure.address)
    })
}

pub fn temporal_recent_at(at: f64, now: f64, max_age_seconds: f64) -> bool {
    at + max_age_seconds > now
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedChargeEntry {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub batch_order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub first_entry: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub entry_index: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub last_member: u64,
    pub at: f64,
    pub through_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub order: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub count: u64,
    pub individual_ids: Vec<String>,
    pub source_ids: Vec<String>,
}

impl ReceivedChargeEntry {
    pub fn last_position(&self) -> ReceivedPosition {
        ReceivedPosition {
            batch_order: self.batch_order,
            entry_index: self.entry_index,
            member_index: self.last_member,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedChargeDirectory {
    pub actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub epoch: String,
    pub entries: Vec<ReceivedChargeEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReceivedError(pub &'static str);

impl fmt::Display for ReceivedError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.0)
    }
}

impl std::error::Error for ReceivedError {}

// The padded numeric key is the existing OrderedRecord key. Lexical iteration
// therefore retains the same chronological block order, including cold rebuilds.
fn block_key(physical_life: u64, epoch: &str, batch_order: u64) -> String {
    format!(
        "[\"{batch_order:016}\",{physical_life},{}]",
        serde_json::to_string(epoch).expect("String serialization cannot fail")
    )
}

fn add_charge(previous: u64, added: u64) -> Result<u64, ReceivedError> {
    previous
        .checked_add(added)
        .filter(|value| *value <= MAX_SAFE_INTEGER)
        .ok_or(ReceivedError(
            "Received charge exceeds safe integer capacity.",
        ))
}

/// Rebuildable exact eligibility metadata. The authoritative logical totals live
/// here once, and the actor codec writes these same values; a cold rebuild checks
/// the saved totals before this owner can be installed. No receipt body is read
/// merely to answer eligibility or membership.
#[derive(Debug)]
pub struct ReceivedRecentDirectory {
    blocks: BTreeMap<String, RecentDirectoryBlock>,
    individuals: BTreeMap<String, u64>,
    bytes: u64,
    count: u64,
    budget: crate::host::ByteBudget,
    _roots: crate::host::ResidentReservation,
}

impl PartialEq for ReceivedRecentDirectory {
    fn eq(&self, other: &Self) -> bool {
        self.bytes == other.bytes
            && self.count == other.count
            && self.individuals == other.individuals
            && self.blocks.len() == other.blocks.len()
            && self.blocks.iter().zip(&other.blocks).all(
                |((key, value), (other_key, other_value))| {
                    key == other_key && value.directory == other_value.directory
                },
            )
    }
}

impl ReceivedRecentDirectory {
    pub(crate) fn new(budget: &crate::host::ByteBudget) -> Result<Self, ReceivedError> {
        let roots = crate::host::retained_size::tree_node_bound::<String, RecentDirectoryBlock>()
            .and_then(|n| n.checked_add(crate::host::retained_size::tree_node_bound::<String, u64>()?))
            .ok_or(ReceivedError("Recent directory root allocation overflow."))?;
        Ok(Self {
            blocks: BTreeMap::new(),
            individuals: BTreeMap::new(),
            bytes: 0,
            count: 0,
            budget: budget.clone(),
            // Empty B-trees may retain their allocated root after retirement.
            // Live block guards fund their actual additional nodes/memberships.
            _roots: budget.reserve_backing(roots)
                .map_err(|_| ReceivedError("Recent directory roots exceed native allowance."))?,
        })
    }
    pub fn install(
        directories: &[ReceivedChargeDirectory],
        frontier: Option<&ReceivedFrontier>,
        expected: Option<(u64, u64)>,
        budget: &crate::host::ByteBudget,
    ) -> Result<Self, ReceivedError> {
        let selected = eligible_received_charge_directories(directories, frontier)?;
        let mut installed = Self::new(budget)?;
        for directory in selected {
            installed.append(&directory)?;
        }
        if expected.is_some_and(|expected| expected != (installed.bytes, installed.count)) {
            return Err(ReceivedError(
                "Received block totals disagree with current authority.",
            ));
        }
        Ok(installed)
    }

    pub fn bytes(&self) -> u64 {
        self.bytes
    }

    pub fn count(&self) -> u64 {
        self.count
    }

    pub fn directories(&self) -> impl Iterator<Item = &ReceivedChargeDirectory> {
        self.blocks.values().map(|block| &block.directory)
    }

    pub fn has_individual(&self, id: &str) -> bool {
        self.individuals.contains_key(id)
    }

    /// This proves only the block's current eligibility, never a particular
    /// received field or permission to reconstruct a missing member.
    pub fn contains(&self, locator: &TemporalReceiptLocator, received_after: f64) -> bool {
        let key = block_key(locator.physical_life, &locator.epoch, locator.batch_order);
        self.blocks.get(&key).is_some_and(|directory| {
            directory.actor_id == locator.actor_id
                && directory.entries.first().is_some_and(|header| {
                    locator.entry_index >= header.first_entry
                        && locator.entry_index <= header.entry_index
                        && header.through_at > received_after
                })
        })
    }

    pub fn append(&mut self, directory: &ReceivedChargeDirectory) -> Result<(), ReceivedError> {
        let mut workspace = self
            .budget
            .reserve(recent_residency::append_workspace(directory)?)
            .map_err(|_| ReceivedError("Recent directory exceeds native allowance."))?;
        // Installation and mutation validate these short headers once. Reserve
        // charge arithmetic before insertion so a failed bound changes nothing.
        let mut bytes = self.bytes;
        let mut count = self.count;
        let mut keys = BTreeSet::new();
        let mut individual_changes: BTreeMap<&str, u64> = BTreeMap::new();
        for header in &directory.entries {
            let key = block_key(
                directory.physical_life,
                &directory.epoch,
                header.batch_order,
            );
            if self.blocks.contains_key(&key) || !keys.insert(key) {
                return Err(ReceivedError("Recent block repeats its canonical address."));
            }
            bytes = add_charge(bytes, header.bytes)?;
            count = add_charge(count, header.count)?;
            for id in &header.individual_ids {
                let added = individual_changes.get(id.as_str()).copied().unwrap_or(0);
                individual_changes.insert(id, add_charge(added, 1)?);
            }
        }
        for (id, added) in &individual_changes {
            add_charge(self.individuals.get(*id).copied().unwrap_or(0), *added)?;
        }
        // Materialize each new canonical block under its own custody before
        // changing either index. Undo moves that custody with the exact block.
        let mut prepared = Vec::new();
        prepared
            .try_reserve_exact(directory.entries.len())
            .map_err(|_| ReceivedError("Recent directory allocation failed."))?;
        for header in &directory.entries {
            prepared.push(RecentDirectoryBlock::prepare(
                directory,
                header,
                &mut workspace,
                &self.budget,
            )?);
        }
        for (id, added) in individual_changes {
            let next = self.individuals.get(id).copied().unwrap_or(0) + added;
            self.individuals.insert(id.to_owned(), next);
        }
        for block in prepared {
            let key = block_key(
                block.physical_life,
                &block.epoch,
                block.entries[0].batch_order,
            );
            self.blocks.insert(key, block);
        }
        self.bytes = bytes;
        self.count = count;
        Ok(())
    }

    /// Explicit correction removes a real eligible block and retains its exact
    /// short directory for inverse mutation. Missing/expired blocks stay absent.
    fn take_block(
        &mut self,
        physical_life: u64,
        epoch: &str,
        batch_order: u64,
    ) -> Result<Option<RecentDirectoryBlock>, ReceivedError> {
        let key = block_key(physical_life, epoch, batch_order);
        let Some(directory) = self.blocks.get(&key) else {
            return Ok(None);
        };
        self.budget
            .retain_record(&directory.storage)
            .map_err(|_| ReceivedError("Recent before-image exceeds native allowance."))?;
        let mut bytes = self.bytes;
        let mut count = self.count;
        for header in &directory.entries {
            bytes = bytes
                .checked_sub(header.bytes)
                .ok_or(ReceivedError("Recent edit bytes underflow."))?;
            count = count
                .checked_sub(header.count)
                .ok_or(ReceivedError("Recent edit count underflow."))?;
            for id in &header.individual_ids {
                if !self.individuals.contains_key(id) {
                    return Err(ReceivedError("Recent edit membership is absent."));
                }
            }
        }
        let directory = self
            .blocks
            .remove(&key)
            .expect("Owned recent block checked");
        for header in &directory.entries {
            for id in &header.individual_ids {
                let held = self
                    .individuals
                    .get_mut(id)
                    .expect("Owned recent membership checked");
                *held -= 1;
                if *held == 0 {
                    self.individuals.remove(id);
                }
            }
        }
        self.bytes = bytes;
        self.count = count;
        Ok(Some(directory))
    }

    /// Restore the exact funded before-image. Its candidate pin was retained
    /// before removal, so rollback neither clones a body nor asks for new quota.
    fn restore_block(&mut self, block: RecentDirectoryBlock) -> Result<(), ReceivedError> {
        let header = block
            .entries
            .first()
            .ok_or(ReceivedError("Recent rollback block is empty."))?;
        if block.entries.len() != 1 {
            return Err(ReceivedError("Recent rollback block is not canonical."));
        }
        let key = block_key(block.physical_life, &block.epoch, header.batch_order);
        if self.blocks.contains_key(&key) {
            return Err(ReceivedError("Recent rollback block already exists."));
        }
        let bytes = add_charge(self.bytes, header.bytes)?;
        let count = add_charge(self.count, header.count)?;
        for id in &header.individual_ids {
            let held = self.individuals.get(id).copied().unwrap_or(0);
            self.individuals.insert(id.clone(), add_charge(held, 1)?);
        }
        self.blocks.insert(key, block);
        self.bytes = bytes;
        self.count = count;
        Ok(())
    }

    /// Only the temporal mutation journal removes an unaccepted appended block.
    /// Accepted age/pressure retirement has its separate chronological owner.
    fn rollback_append(
        &mut self,
        directory: &ReceivedChargeDirectory,
    ) -> Result<(), ReceivedError> {
        for header in directory.entries.iter().rev() {
            let key = block_key(
                directory.physical_life,
                &directory.epoch,
                header.batch_order,
            );
            if !self.blocks.get(&key).is_some_and(|held| {
                held.actor_id == directory.actor_id
                    && held.physical_life == directory.physical_life
                    && held.epoch == directory.epoch
                    && held.entries.as_slice() == std::slice::from_ref(header)
            }) {
                return Err(ReceivedError(
                    "Temporal rollback directory differs from its appended source.",
                ));
            }
            self.blocks.remove(&key);
            self.bytes = self
                .bytes
                .checked_sub(header.bytes)
                .ok_or(ReceivedError("Temporal rollback bytes underflow."))?;
            self.count = self
                .count
                .checked_sub(header.count)
                .ok_or(ReceivedError("Temporal rollback count underflow."))?;
            for id in &header.individual_ids {
                let count = self
                    .individuals
                    .get(id)
                    .copied()
                    .ok_or(ReceivedError("Temporal rollback individual is absent."))?;
                if count == 1 {
                    self.individuals.remove(id);
                } else {
                    self.individuals.insert(id.clone(), count - 1);
                }
            }
        }
        Ok(())
    }


}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TemporalRetentionPolicy {
    pub max_age_seconds: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_changes: u64,
}

/// Physical packs may contain the same logical block metadata. Keep one exact
/// canonical block at its original order and honor the current personal frontier.
pub fn eligible_received_charge_directories(
    directories: &[ReceivedChargeDirectory],
    frontier: Option<&ReceivedFrontier>,
) -> Result<Vec<ReceivedChargeDirectory>, ReceivedError> {
    let mut blocks: BTreeMap<(String, u64, String, u64), ReceivedChargeDirectory> = BTreeMap::new();
    let mut order = Vec::new();
    for directory in directories {
        for header in &directory.entries {
            if !received_position_eligible(&header.last_position(), header.through_at, frontier) {
                continue;
            }
            let key = (
                directory.actor_id.clone(),
                directory.physical_life,
                directory.epoch.clone(),
                header.batch_order,
            );
            if let Some(prior) = blocks.get(&key) {
                let held = &prior.entries[0];
                if held.first_entry != header.first_entry
                    || held.entry_index != header.entry_index
                    || held.bytes != header.bytes
                    || held.count != header.count
                {
                    return Err(ReceivedError("Conflicting received block headers."));
                }
            } else {
                order.push(key.clone());
                blocks.insert(
                    key,
                    ReceivedChargeDirectory {
                        actor_id: directory.actor_id.clone(),
                        physical_life: directory.physical_life,
                        epoch: directory.epoch.clone(),
                        entries: vec![header.clone()],
                    },
                );
            }
        }
    }
    // Stable sort retains the first supplied block for same-time distinct owners,
    // matching Array.sort rather than hash or worker completion order.
    order.sort_by_key(|key| key.3);
    Ok(order
        .into_iter()
        .map(|key| blocks.remove(&key).expect("Selected directory is present"))
        .collect())
}

mod batch;
pub use batch::TemporalBatch;

pub(crate) use state::{PackedTemporalSave, PreparedTemporalResidency, SavedTemporalResidency};
