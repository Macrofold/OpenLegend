//! Selected historical bodies remain detached from current canonical residency.
//! SQL supplies record witnesses, never a receipt, permission map or alias grant.
use super::npc_history::{NpcHistoricalScope, NpcHistoryPrefix};
use crate::execution::ExecutionError;
use crate::experience::{PersonalSourceKind, PersonalSourceRecord, PersonalSourceRef};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, SharedMemoryPin};
use crate::received::{
    CapturedTemporalReceipt, ReceivedValues, TemporalPageRecord, TemporalReceiptLocator,
    capture_received_entry,
};
use crate::reception::OriginalRevisionRegistry;
use crate::records::InstalledRow;
use crate::simulation::{AcceptedActorRead, SimulationState};
use indexmap::{IndexMap, IndexSet};
use serde::ser::{SerializeSeq, SerializeStruct};
use serde::{Deserialize, Serialize, Serializer};
use std::collections::BTreeSet;
use std::mem::size_of;
use std::sync::Arc;
mod cursor;
pub(crate) use cursor::{NpcSourcesAnswer, NpcSourcesCursor};
mod attribution;
use attribution::NpcSourceAttribution;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcReceiptSelection {
    pub locator: TemporalReceiptLocator,
    /// Omission selects the actual whole receipt; an empty list selects a
    /// genuine fieldless history boundary/frame, never every member.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub member_indices: Option<BTreeSet<u64>>,
}
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcSourceSelection {
    pub receipts: Vec<NpcReceiptSelection>,
    pub personal: Vec<PersonalSourceRef>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcPersonalSourceRow {
    pub kind: PersonalSourceKind,
    pub row: InstalledRow,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcSourceRows {
    pub pages: Vec<InstalledRow>,
    pub values: Vec<InstalledRow>,
    pub personal: Vec<NpcPersonalSourceRow>,
}

pub(crate) struct CapturedNpcPersonalSource {
    pub selection: usize,
    pub record: Arc<PersonalSourceRecord>,
    pub attribution: NpcSourceAttribution,
    _pin: Arc<SharedMemoryPin>,
}
impl Serialize for CapturedNpcPersonalSource {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let body: &serde_json::value::RawValue =
            serde_json::from_str(self.record.payload()).map_err(serde::ser::Error::custom)?;
        let mut out = serializer.serialize_struct("PersonalSource", 4)?;
        out.serialize_field("selection", &self.selection)?;
        out.serialize_field("reference", &self.record.header().reference)?;
        out.serialize_field("value", body)?;
        out.serialize_field("attribution", &self.attribution)?;
        out.end()
    }
}
pub(crate) struct CapturedNpcReceipt {
    pub selection: usize,
    pub capture: CapturedTemporalReceipt,
}
impl Serialize for CapturedNpcReceipt {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        struct Values<'a>(&'a CapturedTemporalReceipt);
        impl Serialize for Values<'_> {
            fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                let mut out = serializer.serialize_seq(Some(self.0.fragments().len()))?;
                for index in 0..self.0.fragments().len() {
                    out.serialize_element(&self.0.value(index).ok_or_else(|| {
                        serde::ser::Error::custom("selected receipt reception is unavailable")
                    })?)?;
                }
                out.end()
            }
        }
        let mut out = serializer.serialize_struct("ReceiptSource", 3)?;
        out.serialize_field("selection", &self.selection)?;
        out.serialize_field("receipt", &self.capture.read_view())?;
        out.serialize_field("values", &Values(&self.capture))?;
        out.end()
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreparedNpcSources {
    #[serde(skip)]
    pub scope: Arc<NpcHistoricalScope>,
    pub personal: Vec<CapturedNpcPersonalSource>,
    pub receipts: Vec<CapturedNpcReceipt>,
    pub unavailable_personal: Vec<usize>,
    pub unavailable_receipts: Vec<usize>,
    #[serde(skip)]
    _storage: ByteReservation,
}

impl PreparedNpcSources {
    pub(crate) fn prepare(
        state: &SimulationState,
        scope: Arc<NpcHistoricalScope>,
        selection: &NpcSourceSelection,
        rows: NpcSourceRows,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !scope.still_permitted(state)
            || matches!(scope.receipt_prefix, NpcHistoryPrefix::Pending { .. })
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let actor = scope.actor_id.as_str();
        // All decode/carrier memory is admitted by the caller before parsing
        // the provider answer. This owner additionally funds its actual maps
        // and future detached output before constructing them.
        type ReceiptKey<'a> = (u64, &'a str, u64, u64);
        type PersonalKey<'a> = (PersonalSourceKind, &'a str);
        let bytes = heap_sum([
            size_of::<Self>(),
            map_storage::<String, ()>(rows.pages.len()).ok_or(ExecutionError::Capacity)?,
            rows.pages
                .iter()
                .try_fold(0usize, |n, row| n.checked_add(row.id.len()))
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<&str, bool>(rows.values.len()).ok_or(ExecutionError::Capacity)?,
            map_storage::<PersonalKey<'_>, usize>(selection.personal.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<ReceiptKey<'_>, usize>(selection.receipts.len())
                .ok_or(ExecutionError::Capacity)?,
            selection
                .personal
                .len()
                .checked_mul(size_of::<Option<Arc<PersonalSourceRecord>>>())
                .ok_or(ExecutionError::Capacity)?,
            selection
                .receipts
                .len()
                .checked_mul(size_of::<
                    Option<(
                        &crate::received::ReceivedBatch,
                        &crate::received::ReceivedEntry,
                    )>,
                >())
                .ok_or(ExecutionError::Capacity)?,
            rows.values
                .len()
                .checked_mul(size_of::<crate::received::ReceivedValueRecord>())
                .ok_or(ExecutionError::Capacity)?,
            rows.pages
                .len()
                .checked_mul(size_of::<TemporalPageRecord>())
                .ok_or(ExecutionError::Capacity)?,
            rows.personal
                .len()
                .checked_mul(size_of::<CapturedNpcPersonalSource>())
                .ok_or(ExecutionError::Capacity)?,
            selection
                .receipts
                .len()
                .checked_mul(size_of::<CapturedNpcReceipt>() + size_of::<usize>())
                .ok_or(ExecutionError::Capacity)?,
            selection
                .personal
                .len()
                .checked_mul(size_of::<CapturedNpcPersonalSource>() + size_of::<usize>())
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let law = state.installed.account_law();
        let limits = &state.activity.display;
        fn receipt_key(locator: &TemporalReceiptLocator) -> (u64, &str, u64, u64) {
            (
                locator.physical_life,
                locator.epoch.as_str(),
                locator.batch_order,
                locator.entry_index,
            )
        }
        let mut requested_receipts = IndexMap::with_capacity(selection.receipts.len());
        for (index, requested) in selection.receipts.iter().enumerate() {
            if requested.locator.actor_id != actor
                || requested_receipts
                    .insert(receipt_key(&requested.locator), index)
                    .is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let mut requested_personal = IndexMap::with_capacity(selection.personal.len());
        for (index, requested) in selection.personal.iter().enumerate() {
            if !requested.validate()
                || requested_personal
                    .insert((requested.kind, requested.id.as_str()), index)
                    .is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let mut originals = OriginalRevisionRegistry::new(budget)?;
        let mut records = Vec::with_capacity(rows.values.len());
        for row in rows.values {
            records.push(crate::received::values::decode_received_value_row(&row)?);
        }
        // This is an actual detached subset of the shared-value owner, not a
        // fabricated pool or an installation into the world's live values.
        let values = ReceivedValues::install(
            records,
            state.physical.header.sim_time,
            state.physical.header.sequence,
            Arc::clone(limits),
            budget,
        )?;
        let mut pages = Vec::with_capacity(rows.pages.len());
        let mut page_ids = IndexSet::with_capacity(rows.pages.len());
        for row in rows.pages {
            if !page_ids.insert(row.id.clone()) {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let _decode = budget.reserve(crate::experience::encoded_body_bound(&row.payload)?)?;
            let page = TemporalPageRecord::install(
                row,
                actor,
                state.physical.header.sim_time,
                &values,
                Some(&law),
                limits,
                budget,
            )?;
            if !page.batches().any(|batch| {
                batch.entries.iter().any(|entry| {
                    requested_receipts.contains_key(&(
                        batch.physical_life,
                        batch.epoch.as_str(),
                        batch.batch_order,
                        entry.entry_index,
                    ))
                })
            }) {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            pages.push(page);
        }
        let mut value_ids = IndexMap::with_capacity(values.resident_ids().len());
        for id in values.resident_ids() {
            value_ids.insert(id, false);
        }
        let mut receipt_entries = vec![None; selection.receipts.len()];
        for page in &pages {
            for id in &page.metadata().references {
                *value_ids
                    .get_mut(id.as_str())
                    .ok_or(ExecutionError::InvalidCheckpoint)? = true;
            }
            for batch in page.batches() {
                for entry in &batch.entries {
                    if let Some(&index) = requested_receipts.get(&(
                        batch.physical_life,
                        batch.epoch.as_str(),
                        batch.batch_order,
                        entry.entry_index,
                    )) {
                        if receipt_entries[index]
                            .replace((batch.as_ref(), entry))
                            .is_some()
                        {
                            return Err(ExecutionError::InvalidCheckpoint);
                        }
                    }
                }
            }
        }
        if value_ids.values().any(|used| !used) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut personal_by_id: Vec<Option<Arc<PersonalSourceRecord>>> =
            vec![None; selection.personal.len()];
        for supplied in rows.personal {
            let _decode = budget.reserve(crate::experience::encoded_body_bound(
                &supplied.row.payload,
            )?)?;
            let record =
                PersonalSourceRecord::install(supplied.kind, actor, supplied.row, &law, budget)?;
            let header = record.header();
            let coverage = scope
                .personal_coverage(supplied.kind)
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            // Source personal producers use different sequence clocks (for
            // example received sample order versus gameplay sequence). The
            // actual owner ordinal, time and exact body digest bind this read.
            if !coverage.parent_present
                || record.position() >= coverage.next_ordinal
                || header.at > scope.at
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let &index = requested_personal
                .get(&(supplied.kind, header.reference.id.as_str()))
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            if header.reference != selection.personal[index] {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            record.validate_originals(&mut originals, scope.at)?;
            if personal_by_id[index].replace(Arc::new(record)).is_some() {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        let mut personal = Vec::with_capacity(selection.personal.len());
        let mut unavailable_personal = Vec::new();
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor,
        )?;
        for (index, requested) in selection.personal.iter().enumerate() {
            let Some(record) = &personal_by_id[index] else {
                unavailable_personal.push(index);
                continue;
            };
            let privacy = state.experience.actor(actor).map(|actor| &actor.privacy);
            if privacy.is_some_and(|privacy| {
                privacy.revoked(&requested.id)
                    || record
                        .header()
                        .event_id
                        .as_deref()
                        .is_some_and(|id| privacy.revoked(id))
            }) {
                unavailable_personal.push(index);
                continue;
            }
            personal.push(CapturedNpcPersonalSource {
                selection: index,
                attribution: NpcSourceAttribution::capture(state, actor, record, &names, budget)?,
                _pin: record.capture_pin(budget)?,
                record: Arc::clone(record),
            });
        }
        let mut receipts = Vec::with_capacity(selection.receipts.len());
        let mut unavailable_receipts = Vec::new();
        for (index, requested) in selection.receipts.iter().enumerate() {
            let captured = receipt_entries[index]
                .map(|(batch, entry)| {
                    capture_received_entry(
                        batch,
                        entry,
                        requested.member_indices.as_ref(),
                        scope.frontier.as_ref(),
                        &values,
                        &law,
                        budget,
                    )
                })
                .transpose()?
                .flatten();
            let Some(capture) = captured else {
                unavailable_receipts.push(index);
                continue;
            };
            let receipt = capture.receipt();
            let privacy = state.experience.actor(actor).map(|actor| &actor.privacy);
            let mut eligible = scope.includes_receipt(receipt)
                && !privacy.is_some_and(|privacy| {
                    privacy.revoked(&receipt.id)
                        || receipt
                            .header
                            .source_ids
                            .iter()
                            .any(|id| privacy.revoked(id))
                })
                && requested
                    .member_indices
                    .as_ref()
                    .is_none_or(|members| members.len() == receipt.facets.len());
            for (field, fragment) in receipt.facets.iter().zip(capture.fragments()) {
                eligible &= crate::experience::temporal_facet_eligible(
                    &state.experience,
                    actor,
                    field,
                    fragment,
                    &law,
                )?;
            }
            if eligible {
                receipts.push(CapturedNpcReceipt {
                    selection: index,
                    capture,
                })
            } else {
                unavailable_receipts.push(index)
            }
        }
        drop(receipt_entries);
        drop(value_ids);
        drop(page_ids);
        drop(pages);
        drop(values);
        drop(personal_by_id);
        drop(originals);
        drop(requested_receipts);
        drop(requested_personal);
        storage.resize(
            heap_sum([
                size_of::<Self>(),
                personal
                    .capacity()
                    .checked_mul(size_of::<CapturedNpcPersonalSource>())
                    .ok_or(ExecutionError::Capacity)?,
                receipts
                    .capacity()
                    .checked_mul(size_of::<CapturedNpcReceipt>())
                    .ok_or(ExecutionError::Capacity)?,
                unavailable_personal
                    .capacity()
                    .checked_mul(size_of::<usize>())
                    .ok_or(ExecutionError::Capacity)?,
                unavailable_receipts
                    .capacity()
                    .checked_mul(size_of::<usize>())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            scope,
            personal,
            receipts,
            unavailable_personal,
            unavailable_receipts,
            _storage: storage,
        })
    }

    pub(crate) fn validate_origin(
        &self,
        read: &AcceptedActorRead,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if read.perception.actor_id != self.scope.actor_id
            || read.perception.world_id != self.scope.world_id
            || read.perception.evidence.generation() != self.scope.generation
            || read.accepted_cut != self.scope.accepted_cut
            || read.perception.at != self.scope.at
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut originals = OriginalRevisionRegistry::new(budget)?;
        for observation in &read.perception.evidence.cut().acquired {
            originals.validate(observation)?;
        }
        for source in &self.personal {
            let _decode = budget.reserve(crate::experience::encoded_body_bound(
                source.record.payload(),
            )?)?;
            source
                .record
                .validate_originals(&mut originals, self.scope.at)?;
        }
        Ok(())
    }
}
