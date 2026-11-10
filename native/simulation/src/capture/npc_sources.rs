//! Selected historical bodies remain detached from current canonical residency.
//! SQL supplies record witnesses, never a receipt, permission map or alias grant.
use super::npc_history::NpcHistoricalScope;
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
pub(crate) use cursor::{NpcSourcesAnswer, NpcSourcesCursor, NpcSourcesRequest};
mod attribution;
use attribution::NpcSourceAttribution;
mod personal;
use personal::CapturedPersonalRecord;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcPersonalSelection {
    pub reference: PersonalSourceRef,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub through: Option<PersonalSourceRef>,
}
impl std::ops::Deref for NpcPersonalSelection {
    type Target = PersonalSourceRef;
    fn deref(&self) -> &Self::Target {
        &self.reference
    }
}

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
    pub personal: Vec<NpcPersonalSelection>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub consolidation_job: Option<String>,
}

#[derive(Deserialize)]
#[serde(tag = "storage", rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) enum NpcPersonalSourceRow {
    Current {
        kind: PersonalSourceKind,
        row: InstalledRow,
    },
    Archive {
        archive: NpcArchivedSourceRow,
        #[serde(deserialize_with = "crate::values::deserialize_nullable")]
        current: Option<InstalledRow>,
    },
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcArchivedSourceRow {
    world_id: String,
    actor_id: String,
    source_kind: PersonalSourceKind,
    source_id: String,
    revision: String,
    payload: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct NpcSourceRows {
    pub pages: Vec<InstalledRow>,
    pub values: Vec<InstalledRow>,
    pub personal: Vec<NpcPersonalSourceRow>,
    pub parents: Vec<InstalledRow>,
    pub duplicate_summary: Option<bool>,
}

pub(crate) struct CapturedNpcPersonalSource {
    pub selection: usize,
    pub record: CapturedPersonalRecord,
    pub through: Option<Arc<PersonalSourceRecord>>,
    pub attribution: NpcSourceAttribution,
    pub originals: crate::experience::CapturedPersonalOriginals,
    _pin: Arc<SharedMemoryPin>,
}
impl CapturedNpcPersonalSource {
    pub(crate) fn current_record(&self) -> Option<&Arc<PersonalSourceRecord>> {
        match &self.record {
            personal::CapturedPersonalRecord::Current(record) => Some(record),
            personal::CapturedPersonalRecord::Archive(_) => None,
        }
    }
}
impl Serialize for CapturedNpcPersonalSource {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let body: &serde_json::value::RawValue =
            serde_json::from_str(self.record.payload()).map_err(serde::ser::Error::custom)?;
        let mut out = serializer
            .serialize_struct("PersonalSource", 5 + usize::from(self.through.is_some()))?;
        out.serialize_field("selection", &self.selection)?;
        out.serialize_field("reference", &self.record.header().reference)?;
        if let Some(parent) = &self.through {
            out.serialize_field("through", &parent.header().reference)?;
        }
        out.serialize_field("value", body)?;
        out.serialize_field("attribution", &self.attribution)?;
        struct Originals<'a>(&'a crate::experience::CapturedPersonalOriginals);
        impl Serialize for Originals<'_> {
            fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                use serde::ser::SerializeSeq;
                #[derive(Serialize)]
                struct Original<'a> {
                    id: &'a str,
                    revision: u64,
                }
                let mut out = serializer.serialize_seq(Some(self.0.observations().len()))?;
                for original in self.0.observations() {
                    out.serialize_element(&Original {
                        id: &original.id,
                        revision: original.revision,
                    })?;
                }
                out.end()
            }
        }
        out.serialize_field("originals", &Originals(&self.originals))?;
        out.end()
    }
}
pub(crate) struct CapturedNpcReceipt {
    pub selection: usize,
    pub capture: Arc<CapturedTemporalReceipt>,
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
    #[serde(skip)]
    personal_cut: cursor::NpcPersonalScope,
    pub personal: Vec<CapturedNpcPersonalSource>,
    pub receipts: Vec<CapturedNpcReceipt>,
    pub unavailable_personal: Vec<usize>,
    pub unavailable_receipts: Vec<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duplicate_summary: Option<bool>,
    #[serde(skip)]
    _storage: ByteReservation,
}

impl PreparedNpcSources {
    pub(crate) fn prepare(
        state: &SimulationState,
        scope: Arc<NpcHistoricalScope>,
        personal_cut: cursor::NpcPersonalScope,
        selection: &NpcSourceSelection,
        rows: NpcSourceRows,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !scope.still_permitted(state)
            || !scope.allows_selection(selection.receipts.is_empty())
            || selection.consolidation_job.is_some() != rows.duplicate_summary.is_some()
            || selection.consolidation_job.is_some() && !scope.allows_consolidation()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        if personal_cut.accepted_cut != state.accepted_cut
            || personal_cut.at != state.physical.header.sim_time
            || personal_cut.identity_through != state.physical.identity.next_id()
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let actor = scope.actor_id.as_str();
        // All decode/carrier memory is admitted by the caller before parsing
        // the provider answer. This owner additionally funds its actual maps
        // and future detached output before constructing them.
        type ReceiptKey<'a> = (u64, &'a str, u64, u64);
        type PersonalKey<'a> = (PersonalSourceKind, &'a str, &'a str);
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
            map_storage::<(&str, &str), Arc<PersonalSourceRecord>>(rows.parents.len())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<ReceiptKey<'_>, usize>(selection.receipts.len())
                .ok_or(ExecutionError::Capacity)?,
            selection
                .personal
                .len()
                .checked_mul(size_of::<
                    Option<(
                        Arc<PersonalSourceRecord>,
                        crate::experience::CapturedPersonalOriginals,
                    )>,
                >())
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
                    .insert(
                        (
                            requested.kind,
                            requested.id.as_str(),
                            requested.revision.as_str(),
                        ),
                        index,
                    )
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
        let mut personal_by_id: Vec<
            Option<(
                CapturedPersonalRecord,
                crate::experience::CapturedPersonalOriginals,
                Option<Arc<PersonalSourceRecord>>,
            )>,
        > = std::iter::repeat_with(|| None)
            .take(selection.personal.len())
            .collect();
        let mut parents = IndexMap::with_capacity(rows.parents.len());
        for row in rows.parents {
            let parent = personal::current_record(
                state,
                &personal_cut,
                actor,
                PersonalSourceKind::Summary,
                row,
                budget,
            )?;
            let reference = &parent.header().reference;
            let requested = selection
                .personal
                .iter()
                .filter_map(|source| source.through.as_ref())
                .find(|source| source.id == reference.id)
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            if requested != reference {
                continue;
            }
            let privacy = state.experience.actor(actor).map(|actor| &actor.privacy);
            if privacy.is_some_and(|privacy| {
                privacy.is_forgotten(&reference.id)
                    || parent
                        .header()
                        .privacy_dependencies
                        .iter()
                        .any(|id| privacy.revoked(id))
            }) {
                continue;
            }
            if parents
                .insert((requested.id.as_str(), requested.revision.as_str()), parent)
                .is_some()
            {
                return Err(ExecutionError::InvalidCheckpoint);
            }
        }
        for supplied in rows.personal {
            let (record, current) = match supplied {
                NpcPersonalSourceRow::Current { kind, row } => (
                    CapturedPersonalRecord::Current(personal::current_record(
                        state,
                        &personal_cut,
                        actor,
                        kind,
                        row,
                        budget,
                    )?),
                    None,
                ),
                NpcPersonalSourceRow::Archive { archive, current } => {
                    if archive.world_id != scope.world_id || archive.actor_id != actor {
                        return Err(ExecutionError::InvalidCheckpoint);
                    }
                    let _decode =
                        budget.reserve(crate::experience::encoded_body_bound(&archive.payload)?)?;
                    let record = crate::experience::ArchivedPersonalSourceRecord::install(
                        archive.source_kind,
                        actor,
                        archive.payload,
                        &law,
                        budget,
                    )?;
                    if record.header().reference.kind != archive.source_kind
                        || record.header().reference.id != archive.source_id
                        || record.header().reference.revision != archive.revision
                    {
                        return Err(ExecutionError::InvalidCheckpoint);
                    }
                    let current = current
                        .map(|row| {
                            personal::current_record(
                                state,
                                &personal_cut,
                                actor,
                                archive.source_kind,
                                row,
                                budget,
                            )
                        })
                        .transpose()?;
                    if current
                        .as_ref()
                        .is_some_and(|current| current.header().reference.id != archive.source_id)
                    {
                        return Err(ExecutionError::InvalidCheckpoint);
                    }
                    (CapturedPersonalRecord::Archive(Arc::new(record)), current)
                }
            };
            let header = record.header();
            // Source personal producers use different sequence clocks (for
            // example received sample order versus gameplay sequence). The
            // source time and exact digest bind both current and retired bodies;
            // only a genuine current row has a collection ordinal.
            if header.at > personal_cut.at {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let &index = requested_personal
                .get(&(
                    header.reference.kind,
                    header.reference.id.as_str(),
                    header.reference.revision.as_str(),
                ))
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            if header.reference != selection.personal[index].reference {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            let through = if let Some(reference) = &selection.personal[index].through {
                let Some(parent) =
                    parents.get(&(reference.id.as_str(), reference.revision.as_str()))
                else {
                    continue;
                };
                if !parent.covers_source(&header.reference, budget)? {
                    return Err(ExecutionError::InvalidCheckpoint);
                }
                Some(Arc::clone(parent))
            } else {
                // A derived-cache reference cannot revive an old body after a
                // newer current version exists. Exact summary coverage above
                // is the separate legitimate retained-original path.
                if current
                    .as_ref()
                    .is_some_and(|current| current.header().reference != header.reference)
                {
                    continue;
                }
                None
            };
            let original_capture =
                record.capture_originals(&mut originals, personal_cut.at, budget)?;
            if personal_by_id[index]
                .replace((record, original_capture, through))
                .is_some()
            {
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
            let Some((record, original_capture, through)) = personal_by_id[index].take() else {
                unavailable_personal.push(index);
                continue;
            };
            let privacy = state.experience.actor(actor).map(|actor| &actor.privacy);
            if privacy.is_some_and(|privacy| {
                privacy.is_forgotten(&requested.id)
                    || record
                        .header()
                        .event_id
                        .as_deref()
                        .is_some_and(|id| privacy.is_forgotten(id))
            }) {
                unavailable_personal.push(index);
                continue;
            }
            personal.push(CapturedNpcPersonalSource {
                selection: index,
                attribution: NpcSourceAttribution::capture(state, actor, &record, &names, budget)?,
                originals: original_capture,
                through,
                _pin: record.capture_pin(budget)?,
                record,
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
                    capture: capture.into_shared()?,
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
            personal_cut,
            personal,
            receipts,
            unavailable_personal,
            unavailable_receipts,
            duplicate_summary: rows.duplicate_summary,
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
            source.originals.validate(&mut originals)?;
        }
        Ok(())
    }
}
