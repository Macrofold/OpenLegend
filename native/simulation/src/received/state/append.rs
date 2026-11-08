//! Original acquisition batching and bounded recent-history admission. All IDs
//! are issued by the shared saved identity owner in source order; refused entries
//! can leave ordinal gaps and never become invented observations.

use super::{TemporalActorHeader, TemporalState, TemporalUndo};
use crate::work::{WorkError, WorkMeters, WorkUnit};

#[derive(Debug)]
pub enum TemporalAppendError {
    Received(ReceivedError),
    Work(WorkError),
}
impl From<ReceivedError> for TemporalAppendError {
    fn from(error: ReceivedError) -> Self {
        Self::Received(error)
    }
}
impl From<WorkError> for TemporalAppendError {
    fn from(error: WorkError) -> Self {
        Self::Work(error)
    }
}
impl std::fmt::Display for TemporalAppendError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for TemporalAppendError {}
use crate::encoding::{json_record, json_record_len};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::{IdentityState, MAX_SAFE_INTEGER};
use crate::received::{
    CoverageGap, ReceivedBatch, ReceivedCharge, ReceivedEntry, ReceivedEntryKind, ReceivedError,
    ReceivedFieldClock, ReceivedReceiptHeader, ReceivedValueFragment, ReceivedValueReference,
    ReceivedValues, TemporalAvailability, TemporalChange, TemporalDetailSupport,
    TemporalFacetReference, TemporalPageMetadata, TemporalReceipt, TemporalReceiptLocator,
    TemporalReception, TemporalRetentionPolicy, TemporalValueMeaning, compact_received_receipt,
    materialize_received_receipt, temporal_page_metadata, temporal_receipt_change_count,
};
use crate::reception::{
    EvidenceSource, ObservationFactKey, ObservationFrame, ObservationOrigin, ObserverSubject,
    ReceivedFacetProof,
};
use indexmap::{IndexMap, IndexSet};
use std::{collections::BTreeSet, sync::Arc};

mod observation;
pub(crate) use observation::ObservationCaptureOptions;

const NATIVE_PAGE_BYTES: u64 = 64 * 1024;
const NATIVE_PAGE_SLOTS: u64 = 256;
const INDIVISIBLE_RECEIPT_BYTES: u64 = 1024 * 1024;

#[derive(Debug, serde::Serialize)]
pub struct TemporalCaptureFacet {
    pub value: ReceivedValueFragment,
    pub preferred: Option<ReceivedValueReference>,
    pub reception: Option<TemporalReception>,
    pub clock: ReceivedFieldClock,
    pub member_index: Option<u64>,
    pub track: Option<String>,
    pub support: Option<ReceivedFacetProof>,
    pub detail_support: Option<TemporalDetailSupport>,
    pub pose_frame: Option<ObservationFrame>,
    pub original: Option<ObservationFactKey>,
    pub received_from: Option<EvidenceSource>,
}

#[derive(Debug, serde::Serialize)]
pub struct TemporalCaptureInput {
    pub spatial_context: bool,
    pub availability_at: Option<f64>,
    pub coverage_gap: Option<CoverageGap>,
    pub ended_fields: Option<Vec<(String, crate::reception::CurrentReceivedPart)>>,
    pub terminal_reservation_bytes: Option<u64>,
    pub terminal_reservation_delta: Option<i64>,
    pub received_at: Option<f64>,
    pub received_order: Option<u64>,
    pub availability: Option<Vec<TemporalAvailability>>,
    pub receiver_frame: Option<ObservationFrame>,
    pub subject: String,
    pub context_subjects: Option<Vec<String>>,
    pub subject_identity: Option<ObserverSubject>,
    pub change: TemporalChange,
    pub required: bool,
    pub source_ids: Vec<String>,
    pub origin: Option<ObservationOrigin>,
    pub facets: Vec<TemporalCaptureFacet>,
}

#[derive(Debug)]
pub struct PendingTemporalPage {
    id: String,
    batch: Arc<ReceivedBatch>,
    metadata: TemporalPageMetadata,
    from_at: f64,
    through_at: f64,
    batch_encoded_bytes: u64,
}

impl PendingTemporalPage {
    pub fn id(&self) -> &str {
        &self.id
    }
    pub fn batch(&self) -> &Arc<ReceivedBatch> {
        &self.batch
    }
    pub fn metadata(&self) -> &TemporalPageMetadata {
        &self.metadata
    }
    pub fn from_at(&self) -> f64 {
        self.from_at
    }
    pub fn through_at(&self) -> f64 {
        self.through_at
    }
    pub fn batch_encoded_bytes(&self) -> u64 {
        self.batch_encoded_bytes
    }
    pub fn receipt(
        &self,
        locator: &TemporalReceiptLocator,
        members: Option<&BTreeSet<u64>>,
    ) -> Result<Option<TemporalReceipt>, ReceivedError> {
        if locator.actor_id != self.batch.actor_id
            || locator.physical_life != self.batch.physical_life
            || locator.epoch != self.batch.epoch
            || locator.batch_order != self.batch.batch_order
        {
            return Ok(None);
        }
        self.batch
            .entries
            .iter()
            .find(|entry| entry.entry_index == locator.entry_index)
            .map(|entry| materialize_received_receipt(&self.batch, entry, members))
            .transpose()
    }
}

#[derive(Clone, Debug)]
struct Terminal {
    entry: usize,
    reserved_bytes: u64,
}

/// Operation-local scope, reusable by nested receiving calls. It is flushed by
/// its actual owner before a snapshot/yield; beginning it allocates no IDs.
pub struct TemporalAcquisition {
    budget: ByteBudget,
    reservation: ByteReservation,
    batch: ReceivedBatch,
    frame: Option<ObservationFrame>,
    next_entry: u64,
    policy: TemporalRetentionPolicy,
    headroom: f64,
    bytes: u64,
    count: u64,
    slots: u64,
    native_bytes: u64,
    values: IndexSet<String>,
    terminals: IndexMap<String, IndexMap<String, Terminal>>,
    decisions: IndexMap<String, Option<TemporalReceiptLocator>>,
}

/// One actual receiving transition shares its reserved order across nested
/// history calls. Its lifetime is separate from the larger acquisition batch.
#[derive(Clone, Copy, Debug)]
pub struct ReceivedTransition {
    order: Option<u64>,
    sample_token: Option<u64>,
}

impl ReceivedTransition {
    pub fn new(sample_token: Option<u64>) -> Self {
        Self {
            order: sample_token,
            sample_token,
        }
    }
    pub fn sample_token(&self) -> Option<u64> {
        self.sample_token
    }
    pub fn checkpoint(&self) -> Self {
        *self
    }
    pub fn restore(&mut self, before: Self) {
        *self = before;
    }
    pub fn received_order(&mut self, identity: &mut IdentityState) -> Result<u64, ReceivedError> {
        if let Some(order) = self.order {
            return Ok(order);
        }
        let order = issued(identity, "received-order")?;
        self.order = Some(order);
        Ok(order)
    }
}

fn encoded_bytes<T: serde::Serialize>(value: &T) -> Result<u64, ReceivedError> {
    json_record_len(value)
        .map(|bytes| bytes as u64)
        .map_err(|_| ReceivedError("Temporal encoding failed."))
}
fn issued(identity: &mut IdentityState, family: &str) -> Result<u64, ReceivedError> {
    identity
        .allocate(family)
        .map(|issued| issued.sequence)
        .map_err(|_| ReceivedError("Received identity is exhausted."))
}
fn add_count(value: u64, added: u64) -> Result<u64, ReceivedError> {
    value
        .checked_add(added)
        .filter(|next| *next <= MAX_SAFE_INTEGER)
        .ok_or(ReceivedError(
            "Temporal counter exceeds the saved integer domain.",
        ))
}
fn adjust_count(value: u64, delta: i128) -> Result<u64, ReceivedError> {
    u64::try_from(i128::from(value) + delta)
        .ok()
        .filter(|next| *next <= MAX_SAFE_INTEGER)
        .ok_or(ReceivedError("Temporal counter underflow or overflow."))
}
fn terminal_change(change: TemporalChange) -> bool {
    matches!(
        change,
        TemporalChange::Loss
            | TemporalChange::Unchecked
            | TemporalChange::AttentionExit
            | TemporalChange::RecordingGap
    )
}

impl TemporalState {
    pub fn begin_acquisition(
        &self,
        actor_id: &str,
        physical_life: u64,
        frame: Option<ObservationFrame>,
        policy: TemporalRetentionPolicy,
        maintenance_headroom: f64,
        budget: &ByteBudget,
    ) -> Result<Option<TemporalAcquisition>, ReceivedError> {
        let Some(actor) = self.actors.get(actor_id) else {
            return Ok(None);
        };
        if actor.header.physical_life != physical_life {
            return Err(ReceivedError(
                "Receiving life requires its original temporal retirement.",
            ));
        }
        let bytes = heap_sum([
            std::mem::size_of::<TemporalAcquisition>(),
            actor_id.len(),
            actor.header.epoch.len(),
            frame
                .heap_bytes()
                .ok_or(ReceivedError("Temporal frame allocation overflow."))?,
        ])
        .ok_or(ReceivedError("Temporal acquisition allocation overflow."))?;
        let reservation = budget
            .reserve(bytes)
            .map_err(|_| ReceivedError("Temporal acquisition capacity exhausted."))?;
        Ok(Some(TemporalAcquisition {
            budget: budget.clone(),
            reservation,
            batch: ReceivedBatch {
                actor_id: actor_id.to_owned(),
                physical_life,
                epoch: actor.header.epoch.clone(),
                batch_order: 0,
                entries: Vec::new(),
            },
            frame,
            next_entry: 0,
            policy,
            headroom: 1.0 + maintenance_headroom,
            bytes: 0,
            count: 0,
            slots: 0,
            native_bytes: 0,
            values: IndexSet::new(),
            terminals: IndexMap::new(),
            decisions: IndexMap::new(),
        }))
    }

    pub(super) fn replace_header(
        &mut self,
        actor_id: &str,
        header: TemporalActorHeader,
    ) -> Result<(), ReceivedError> {
        let payload: Arc<str> = Arc::from(
            json_record(&header).map_err(|_| ReceivedError("Temporal actor encoding failed."))?,
        );
        self.undo
            .try_reserve(1)
            .map_err(|_| ReceivedError("Temporal undo reservation failed."))?;
        let actor = self
            .actors
            .get_mut(actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?;
        self.undo.push(TemporalUndo::Header {
            actor_id: actor_id.to_owned(),
            before: std::mem::replace(&mut actor.header, header),
            payload: std::mem::replace(&mut actor.payload, payload),
        });
        Ok(())
    }

    fn recording_gap(
        &mut self,
        actor_id: &str,
        at: f64,
        maintenance: bool,
    ) -> Result<(), ReceivedError> {
        let mut header = self
            .actors
            .get(actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?
            .header
            .clone();
        header.recording_gap = Some(CoverageGap {
            from: header.recording_gap.as_ref().map_or(at, |gap| gap.from),
            through: at,
        });
        header.maintenance_due |= maintenance;
        self.replace_header(actor_id, header)
    }

    fn flush_batch(
        &mut self,
        batch: ReceivedBatch,
        policy: &TemporalRetentionPolicy,
        values: &ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
    ) -> Result<Option<u64>, ReceivedError> {
        if batch.entries.is_empty() {
            return Ok(None);
        }
        let id = identity
            .allocate("temporal-page")
            .map_err(|_| ReceivedError("Temporal page identity is exhausted."))?
            .id;
        let from_at = batch.entries.first().expect("Batch not empty").received_at;
        let through_at = batch.entries.last().expect("Batch not empty").received_at;
        let batch = Arc::new(batch);
        let metadata = temporal_page_metadata(
            &batch.actor_id,
            batch.physical_life,
            &batch.epoch,
            std::slice::from_ref(&batch),
            values,
            Some(meaning),
        )?;
        let mut rich_bytes = 0;
        for reference in &metadata.references {
            rich_bytes = add_count(
                rich_bytes,
                values
                    .shared_value_bytes(reference)
                    .ok_or(ReceivedError("Temporal block value is unavailable."))?,
            )?;
        }
        let batch_encoded_bytes = metadata
            .entry_bytes
            .checked_sub(rich_bytes)
            .ok_or(ReceivedError("Temporal block encoded charge underflow."))?;
        let actor = self
            .actors
            .get(&batch.actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?;
        if actor.header.epoch != batch.epoch || actor.header.physical_life != batch.physical_life {
            return Err(ReceivedError(
                "Temporal batch belongs to another receiver timeline.",
            ));
        }
        let mut header = actor.header.clone();
        header.bytes = add_count(header.bytes, metadata.entry_bytes)?;
        header.count = add_count(header.count, metadata.count)?;
        header.next_due = Some(
            header
                .next_due
                .map_or(from_at + policy.max_age_seconds, |at| {
                    at.min(from_at + policy.max_age_seconds)
                }),
        );
        header.maintenance_due |=
            header.bytes > policy.max_bytes || header.count > policy.max_changes;
        let actor_id = batch.actor_id.clone();
        self.undo
            .try_reserve(2)
            .map_err(|_| ReceivedError("Temporal undo reservation failed."))?;
        self.actors
            .get_mut(&actor_id)
            .expect("Actor checked")
            .pending_pages
            .try_reserve(1)
            .map_err(|_| ReceivedError("Temporal page reservation failed."))?;
        self.replace_header(&actor_id, header)?;
        let actor = self.actors.get_mut(&actor_id).expect("Actor checked");
        actor.recent.append(&metadata.charge_directory)?;
        actor.pending_pages.push(Arc::new(PendingTemporalPage {
            id,
            batch,
            metadata,
            from_at,
            through_at,
            batch_encoded_bytes,
        }));
        self.undo.push(TemporalUndo::PendingAppend { actor_id });
        Ok(Some(batch_encoded_bytes))
    }
}

impl TemporalAcquisition {
    pub(crate) fn pending_charge(&self) -> (u64, u64) {
        (self.bytes, self.count)
    }
    pub(crate) fn has_pending_entries(&self) -> bool {
        !self.batch.entries.is_empty()
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.batch.actor_id
    }
    pub(crate) fn physical_life(&self) -> u64 {
        self.batch.physical_life
    }
    pub fn decision(&self, key: &str) -> Option<&Option<TemporalReceiptLocator>> {
        self.decisions.get(key)
    }
    pub fn record_decision(&mut self, key: String, locator: Option<TemporalReceiptLocator>) {
        self.decisions.insert(key, locator);
    }
    fn next_coordinates(
        &mut self,
        identity: &mut IdentityState,
        transition: &mut ReceivedTransition,
    ) -> Result<(u64, u64), ReceivedError> {
        if self.batch.batch_order == 0 {
            self.batch.batch_order = issued(identity, "received-batch")?;
        }
        let entry = self.next_entry;
        self.next_entry = add_count(self.next_entry, 1)?;
        Ok((entry, transition.received_order(identity)?))
    }
    fn flush(
        &mut self,
        state: &mut TemporalState,
        values: &ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
    ) -> Result<(), TemporalAppendError> {
        let scratch = self
            .current_heap_bytes()?
            .checked_mul(3)
            .and_then(|bytes| bytes.checked_add((self.native_bytes as usize).checked_mul(2)?))
            .ok_or(ReceivedError("Temporal flush allocation overflow."))?;
        self.reservation
            .resize(self.reservation.bytes().max(scratch))
            .map_err(|_| ReceivedError("Temporal flush capacity exhausted."))?;
        let next = ReceivedBatch {
            actor_id: self.batch.actor_id.clone(),
            physical_life: self.batch.physical_life,
            epoch: self.batch.epoch.clone(),
            batch_order: 0,
            entries: Vec::new(),
        };
        if let Some(bytes) = state.flush_batch(
            std::mem::replace(&mut self.batch, next),
            &self.policy,
            values,
            identity,
            meaning,
        )? {
            // Source charges the actual compact native append immediately,
            // including before allocating the next entry after a block split.
            meters.charge(&[(WorkUnit::Effects, 1), (WorkUnit::OutputBytes, bytes)])?;
        }
        self.next_entry = 0;
        self.bytes = 0;
        self.count = 0;
        self.slots = 0;
        self.native_bytes = 0;
        self.values.clear();
        self.terminals.clear();
        self.decisions.clear();
        Ok(())
    }
    pub(crate) fn finish(
        mut self,
        state: &mut TemporalState,
        values: &ReceivedValues,
        identity: &mut IdentityState,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
    ) -> Result<(), TemporalAppendError> {
        self.flush(state, values, identity, meaning, meters)
    }

    fn append_inner(
        &mut self,
        state: &mut TemporalState,
        values: &mut ReceivedValues,
        identity: &mut IdentityState,
        transition: &mut ReceivedTransition,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
        now: f64,
        sequence: u64,
        mut input: TemporalCaptureInput,
    ) -> Result<Option<TemporalReceiptLocator>, TemporalAppendError> {
        let error = |message| TemporalAppendError::Received(ReceivedError(message));
        if input.change == TemporalChange::RetainedState {
            return Err(error("A retained-state read is not a new acquisition."));
        }
        if input.facets.is_empty()
            && !terminal_change(input.change)
            && input.change != TemporalChange::ReceiverFrame
        {
            return Ok(None);
        }
        let terminal_key = if input.terminal_reservation_bytes.is_some() {
            Some(
                json_record(&(
                    input.received_at.unwrap_or(now),
                    input.coverage_gap.as_ref().map(|gap| gap.from),
                    input.coverage_gap.as_ref().map(|gap| gap.through),
                    input.change,
                ))
                .map_err(|_| ReceivedError("Temporal terminal key encoding failed."))?,
            )
        } else {
            None
        };
        if let Some(key) = &terminal_key
            && let Some(prior) = self
                .terminals
                .get_mut(&input.subject)
                .and_then(|terminals| terminals.get_mut(key))
        {
            let entry = self
                .batch
                .entries
                .get_mut(prior.entry)
                .ok_or(ReceivedError("Temporal terminal continuation is absent."))?;
            let before = encoded_bytes(&entry.receipt)?;
            entry.receipt.header.ended_fields = match (
                entry.receipt.header.ended_fields.take(),
                input.ended_fields.take(),
            ) {
                (Some(mut previous), Some(next)) => {
                    for part in next {
                        if !previous.contains(&part) {
                            previous.push(part);
                        }
                    }
                    Some(previous)
                }
                _ => None,
            };
            if input.spatial_context {
                entry.receipt.header.spatial_context = Some(true);
            }
            let added = i128::from(encoded_bytes(&entry.receipt)?) - i128::from(before);
            prior.reserved_bytes = add_count(
                prior.reserved_bytes,
                input
                    .terminal_reservation_bytes
                    .expect("Terminal key requires reservation"),
            )?;
            entry.charge.bytes = adjust_count(entry.charge.bytes, added)?;
            if entry.charge.bytes > prior.reserved_bytes {
                return Err(error(
                    "Recording terminal exceeds its admitted reservation.",
                ));
            }
            self.bytes = adjust_count(self.bytes, added)?;
            self.native_bytes = adjust_count(self.native_bytes, added)?;
            let entry_index = entry.entry_index;
            return Ok(Some(self.batch.locator(entry_index)));
        }
        let actor = state
            .actors
            .get(&self.batch.actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?;
        let expected_count = temporal_receipt_change_count(input.change, input.facets.len());
        if !input.required
            && input.terminal_reservation_bytes.is_none()
            && (actor.header.count + self.count + expected_count) as f64
                > self.policy.max_changes as f64 * self.headroom
        {
            state.recording_gap(&self.batch.actor_id, now, true)?;
            return Ok(None);
        }
        let kind = match input.change {
            TemporalChange::Baseline => ReceivedEntryKind::Baseline,
            TemporalChange::Occurrence => ReceivedEntryKind::Occurrence,
            change if terminal_change(change) => ReceivedEntryKind::Boundary,
            _ => ReceivedEntryKind::Sample,
        };
        let (mut entry_index, order) = self.next_coordinates(identity, transition)?;
        let received_at = input.received_at.unwrap_or(now);
        let received_order = input.received_order.unwrap_or(order);
        let spatial_context = input.spatial_context
            || input
                .facets
                .iter()
                .any(|facet| matches!(facet.value.kind(), "surface-patch" | "physical-boundary"));
        let mut facets = Vec::with_capacity(input.facets.len());
        for (index, facet) in input.facets.into_iter().enumerate() {
            let retained = values.retain(
                facet.value,
                facet.preferred.as_ref(),
                now,
                sequence,
                identity,
            )?;
            facets.push(TemporalFacetReference {
                clock: facet.clock,
                member_index: facet.member_index.unwrap_or(index as u64),
                value_ref: retained.reference,
                track: facet.track,
                original: facet.original,
                received_from: facet.received_from,
                support: facet.support,
                detail_support: facet.detail_support,
                pose_frame: facet.pose_frame,
                reception: facet.reception,
            });
        }
        let locator = self.batch.locator(entry_index);
        let mut receipt = TemporalReceipt {
            header: ReceivedReceiptHeader {
                acquisition: self.batch.batch_order,
                subject: input.subject.clone(),
                change: input.change,
                spatial_context: spatial_context.then_some(true),
                source_ids: input
                    .source_ids
                    .into_iter()
                    .collect::<IndexSet<_>>()
                    .into_iter()
                    .collect(),
                subject_identity: input.subject_identity,
                context_subjects: input.context_subjects,
                availability: input.availability,
                availability_at: input.availability_at,
                coverage_gap: input.coverage_gap,
                ended_fields: input.ended_fields,
            },
            id: locator.id(),
            locator,
            at: received_at,
            order: received_order,
            required: input.required,
            receiver_frame: if kind != ReceivedEntryKind::Boundary {
                input.receiver_frame.or_else(|| self.frame.clone())
            } else {
                None
            },
            origin: input.origin,
            facets,
        };
        let mut bytes = encoded_bytes(&receipt)?;
        let count = temporal_receipt_change_count(receipt.header.change, receipt.facets.len());
        let slots = (receipt.facets.len() as u64).max(1);
        if bytes > INDIVISIBLE_RECEIPT_BYTES {
            if receipt.required {
                return Err(error("Required received record exceeds bounded admission."));
            }
            state.recording_gap(&self.batch.actor_id, now, false)?;
            return Ok(None);
        }
        if !self.batch.entries.is_empty()
            && (self.native_bytes + bytes > NATIVE_PAGE_BYTES
                || self.slots + slots > NATIVE_PAGE_SLOTS)
        {
            self.flush(state, values, identity, meaning, meters)?;
            (entry_index, _) = self.next_coordinates(identity, transition)?;
            receipt.locator = self.batch.locator(entry_index);
            receipt.id = receipt.locator.id();
            receipt.header.acquisition = self.batch.batch_order;
            bytes = encoded_bytes(&receipt)?;
        }
        let added_values: IndexSet<String> = receipt
            .facets
            .iter()
            .flat_map(|facet| facet.value_references())
            .filter(|reference| !self.values.contains(*reference))
            .map(str::to_owned)
            .collect();
        let mut rich_bytes = 0;
        for reference in &added_values {
            rich_bytes = add_count(
                rich_bytes,
                values
                    .shared_value_bytes(reference)
                    .ok_or(ReceivedError("Received admission has missing content."))?,
            )?;
        }
        let terminal = input.terminal_reservation_bytes.is_some()
            && kind == ReceivedEntryKind::Boundary
            && receipt.facets.is_empty();
        if terminal
            && bytes
                > input
                    .terminal_reservation_bytes
                    .expect("Terminal reservation checked")
        {
            return Err(error(
                "Recording terminal exceeds its admitted reservation.",
            ));
        }
        let actor = state
            .actors
            .get(&self.batch.actor_id)
            .ok_or(ReceivedError("Temporal actor is absent."))?;
        let reserved = adjust_count(
            actor.header.terminal_reserved_bytes,
            i128::from(input.terminal_reservation_delta.unwrap_or(0)),
        )?;
        if !receipt.required
            && !terminal
            && ((actor.header.bytes + self.bytes + bytes + rich_bytes + reserved) as f64
                > self.policy.max_bytes as f64 * self.headroom
                || (actor.header.count + self.count + count) as f64
                    > self.policy.max_changes as f64 * self.headroom)
        {
            state.recording_gap(&self.batch.actor_id, now, true)?;
            return Ok(None);
        }
        if input
            .terminal_reservation_delta
            .is_some_and(|delta| delta != 0)
        {
            let mut header = actor.header.clone();
            header.terminal_reserved_bytes = reserved;
            state.replace_header(&self.batch.actor_id, header)?;
        }
        let compact = compact_received_receipt(&self.batch.observer(), &receipt)?;
        self.batch
            .entries
            .try_reserve(1)
            .map_err(|_| ReceivedError("Received entry reservation failed."))?;
        let entry_position = self.batch.entries.len();
        self.batch.entries.push(ReceivedEntry {
            entry_index,
            order: received_order,
            received_at,
            kind,
            required: receipt.required,
            charge: ReceivedCharge { bytes, count },
            receipt: compact,
        });
        if terminal {
            self.terminals.entry(input.subject).or_default().insert(
                terminal_key.expect("Terminal key checked"),
                Terminal {
                    entry: entry_position,
                    reserved_bytes: input
                        .terminal_reservation_bytes
                        .expect("Terminal reservation checked"),
                },
            );
        } else {
            self.terminals.shift_remove(&input.subject);
        }
        self.bytes = add_count(self.bytes, add_count(bytes, rich_bytes)?)?;
        self.native_bytes = add_count(self.native_bytes, bytes)?;
        self.values.extend(added_values);
        self.count = add_count(self.count, count)?;
        self.slots = add_count(self.slots, slots)?;
        Ok(Some(self.batch.locator(entry_index)))
    }
}

/// A nested candidate retains only its active compact builder. Completed pages,
/// actor history and the shared value pool retain their own sparse undo cursors.
pub(crate) struct TemporalAcquisitionCheckpoint {
    before: TemporalAcquisition,
}
impl TemporalAcquisitionCheckpoint {
    pub(crate) fn into_acquisition(self) -> TemporalAcquisition {
        self.before
    }
}
impl std::fmt::Debug for TemporalAcquisition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TemporalAcquisition")
            .field("actor_id", &self.batch.actor_id)
            .field("physical_life", &self.batch.physical_life)
            .field("entries", &self.batch.entries.len())
            .finish()
    }
}
impl TemporalAcquisition {
    pub(crate) fn current_heap_bytes(&self) -> Result<usize, ReceivedError> {
        let allocation_error = || ReceivedError("Temporal builder allocation overflow.");
        let mut terminals =
            map_storage::<String, IndexMap<String, Terminal>>(self.terminals.capacity())
                .ok_or_else(allocation_error)?;
        for (subject, parts) in &self.terminals {
            terminals = heap_sum([
                terminals,
                subject.heap_bytes().ok_or_else(allocation_error)?,
                map_storage::<String, Terminal>(parts.capacity()).ok_or_else(allocation_error)?,
            ])
            .ok_or_else(allocation_error)?;
            for key in parts.keys() {
                terminals = terminals
                    .checked_add(key.heap_bytes().ok_or_else(allocation_error)?)
                    .ok_or_else(allocation_error)?;
            }
        }
        let mut values =
            map_storage::<String, ()>(self.values.capacity()).ok_or_else(allocation_error)?;
        for value in &self.values {
            values = values
                .checked_add(value.heap_bytes().ok_or_else(allocation_error)?)
                .ok_or_else(allocation_error)?;
        }
        heap_sum([
            std::mem::size_of::<TemporalAcquisition>(),
            self.batch.heap_bytes().ok_or_else(allocation_error)?,
            self.frame.heap_bytes().ok_or_else(allocation_error)?,
            terminals,
            values,
            self.decisions.heap_bytes().ok_or_else(allocation_error)?,
        ])
        .ok_or_else(allocation_error)
    }
    pub(crate) fn checkpoint(
        &self,
        _budget: &ByteBudget,
    ) -> Result<TemporalAcquisitionCheckpoint, ReceivedError> {
        // The builder owns its shared allowance; a caller cannot redirect a
        // nested before-image to a fresh counter with a different allowance.
        let reservation = self
            .budget
            .reserve(self.current_heap_bytes()?)
            .map_err(|_| ReceivedError("Temporal checkpoint capacity exhausted."))?;
        Ok(TemporalAcquisitionCheckpoint {
            before: Self {
                budget: self.budget.clone(),
                reservation,
                batch: self.batch.clone(),
                frame: self.frame.clone(),
                next_entry: self.next_entry,
                policy: self.policy.clone(),
                headroom: self.headroom,
                bytes: self.bytes,
                count: self.count,
                slots: self.slots,
                native_bytes: self.native_bytes,
                values: self.values.clone(),
                terminals: self.terminals.clone(),
                decisions: self.decisions.clone(),
            },
        })
    }
    pub(crate) fn restore(&mut self, checkpoint: TemporalAcquisitionCheckpoint) {
        *self = checkpoint.before;
    }
    fn reserve_append(&mut self, input: &TemporalCaptureInput) -> Result<(), ReceivedError> {
        let input_heap = std::mem::size_of::<TemporalCaptureInput>()
            .checked_add(
                input
                    .heap_bytes()
                    .ok_or(ReceivedError("Temporal capture allocation overflow."))?,
            )
            .ok_or(ReceivedError("Temporal capture allocation overflow."))?;
        let current = self.current_heap_bytes()?;
        // Counting may need dictionary-key sorting scratch. Its existing typed
        // map/field storage is reserved before walking the input. No encoded
        // payload is allocated merely to determine this envelope.
        let initial = current
            .checked_add(
                input_heap
                    .checked_mul(2)
                    .ok_or(ReceivedError("Temporal capture allocation overflow."))?,
            )
            .ok_or(ReceivedError("Temporal capture allocation overflow."))?;
        self.reservation
            .resize(initial)
            .map_err(|_| ReceivedError("Temporal capture capacity exhausted."))?;
        let encoded = json_record_len(input)
            .map_err(|_| ReceivedError("Temporal capture encoding failed."))?;
        // The append can simultaneously own the full input/receipt, compact
        // field copy, growing index/vector storage and the split's encoded
        // batch/metadata scratch. The actual final capacities replace this
        // conservative envelope as soon as those temporary owners are gone.
        let copies = heap_sum([
            current,
            input_heap,
            self.batch.actor_id.len(),
            self.batch.epoch.len(),
            std::mem::size_of::<TemporalReceipt>(),
        ])
        .and_then(|n| n.checked_mul(3))
        .ok_or(ReceivedError("Temporal append allocation overflow."))?;
        let encoding = encoded
            .checked_add(self.native_bytes as usize)
            .and_then(|n| n.checked_mul(2))
            .ok_or(ReceivedError(
                "Temporal append encoding allocation overflow.",
            ))?;
        self.reservation
            .resize(
                copies
                    .checked_add(encoding)
                    .ok_or(ReceivedError("Temporal append allocation overflow."))?,
            )
            .map_err(|_| ReceivedError("Temporal append capacity exhausted."))
    }
    pub(crate) fn append(
        &mut self,
        state: &mut TemporalState,
        values: &mut ReceivedValues,
        identity: &mut IdentityState,
        transition: &mut ReceivedTransition,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
        now: f64,
        sequence: u64,
        input: TemporalCaptureInput,
    ) -> Result<Option<TemporalReceiptLocator>, TemporalAppendError> {
        self.reserve_append(&input)?;
        let result = self.append_inner(
            state, values, identity, transition, meaning, meters, now, sequence, input,
        );
        self.reservation
            .resize(self.current_heap_bytes()?)
            .map_err(|_| ReceivedError("Temporal builder capacity exhausted."))?;
        result
    }
}
