//! Perception parent rows contain phase originals and finite continuation
//! metadata, never child contacts, attention maps or geometry bodies. Rebuild
//! only changed parents' before-images from their semantic inverse journals.
use super::*;
mod references;
use crate::host::retained_size::map_storage;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::{
    OrderedMapRows, OwnerCoverage, RecordEncodingError, RecordLedger, RecordSchema, RowEncoder,
    SelectedPlacement,
};
pub(super) use references::ReferenceDelta;
use std::{mem::size_of, sync::Arc};

pub(super) fn error() -> RecordEncodingError {
    RecordEncodingError("Perception save requires complete current ownership and allowance.")
}
#[derive(Clone, Copy)]
pub(super) struct ChildMarker;
impl Serialize for ChildMarker {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        serializer.serialize_map(Some(0))?.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct OwnerHeader<'a> {
    pub life: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observer: Option<ObserverLife>,
    pub received_at_sequence: u64,
    pub received: Vec<Arc<ReceivedObservation>>,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub receipts: IndexMap<String, u64>,
    pub current: ChildMarker,
    pub next_contact: u64,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub gaps: IndexMap<String, ReceptionGap>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visual_confirmation: Option<VisualConfirmation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attention: Option<ChildMarker>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geometry: Option<ChildMarker>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motion_samples: Option<ChildMarker>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motion_expires_at: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support: Option<&'a DetectionSupportState>,
}
pub(super) struct HeaderBefore<'a> {
    pub value: Option<OwnerHeader<'a>>,
    reservation: ByteReservation,
}
impl HeaderBefore<'_> {
    pub fn reserve<T: Serialize + ?Sized>(&mut self, value: &T) -> Result<(), RecordEncodingError> {
        let bytes = crate::encoding::json_record_len(value)
            .map_err(|_| error())?
            .checked_mul(16)
            .ok_or_else(error)?;
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())
    }
}
pub(super) type Headers<'a> = IndexMap<&'a str, HeaderBefore<'a>>;
pub(super) fn select_header<'a>(
    selected: &mut Headers<'a>,
    state: &'a ReceptionState,
    observer: &'a str,
    schema: &RecordSchema,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if selected.contains_key(observer) {
        return Ok(());
    }
    let owner = state
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(error)?;
    let bytes = schema
        .layout("mind_perception_owners")?
        .project_len(owner)
        .map_err(|_| error())?
        .checked_mul(16)
        .and_then(|bytes| bytes.checked_add(size_of::<HeaderBefore>()))
        .ok_or_else(error)?;
    let reservation = budget.reserve(bytes).map_err(|_| error())?;
    selected.insert(
        observer,
        HeaderBefore {
            value: Some(OwnerHeader {
                visual_confirmation: owner.visual_confirmation.clone(),
                motion_samples: owner.motion_samples.as_ref().map(|_| ChildMarker),
                motion_expires_at: owner.motion_expires_at,
                geometry: owner.geometry.as_ref().map(|_| ChildMarker),
                attention: owner.attention.as_ref().map(|_| ChildMarker),
                life: owner.life,
                received_at_sequence: owner.received_at_sequence,
                observer: owner.observer.clone(),
                next_contact: owner.next_contact,
                received: owner.received.clone(),
                receipts: owner.receipts.clone(),
                current: ChildMarker,
                gaps: owner.gaps.clone(),
                support: owner.support.as_ref(),
            }),
            reservation,
        },
    );
    Ok(())
}
pub(crate) fn encode_perception_owner_changes(
    state: &ReceptionState,
    schema: &RecordSchema,
    ledger: &RecordLedger,
    originals: &OriginalJournal,
    original_before: OriginalCheckpoint,
    current: &CurrentJournal,
    current_before: CurrentCheckpoint,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let count = originals
        .header_change_count(original_before)?
        .checked_add(current.header_change_count(current_before)?)
        .ok_or_else(error)?;
    if count == 0 {
        return Ok(());
    }
    let _selection = budget
        .reserve(map_storage::<&str, HeaderBefore>(count).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut selected = IndexMap::with_capacity(count);
    originals.select_headers(state, original_before, &mut selected, schema, budget)?;
    current.select_headers(state, current_before, &mut selected, schema, budget)?;
    current.restore_headers(current_before, &mut selected)?;
    originals.restore_headers(original_before, &mut selected)?;
    let owners = state.perception_evidence.as_ref().ok_or_else(error)?;
    // Only inserting a parent can change this ordered root's other ordinals.
    let membership = selected.values().any(|before| before.value.is_none());
    let ordered = membership
        .then(|| OrderedMapRows::new(owners, budget))
        .transpose()?;
    let reordered_count = if membership { owners.len() } else { 0 };
    let _positions = budget
        .reserve(map_storage::<&str, u64>(reordered_count).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut positions = IndexMap::with_capacity(reordered_count);
    if let Some(ordered) = &ordered {
        for (position, observer, _) in ordered.iter() {
            positions.insert(observer, position);
        }
    }
    for (observer, before) in &selected {
        let after = owners.get(*observer).ok_or_else(error)?;
        let path = ["world", "perceptionEvidence", *observer];
        let id_bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
        let _id_guard = budget.reserve(id_bytes * 2).map_err(|_| error())?;
        let id = crate::encoding::json_record(&path).map_err(|_| error())?;
        let prior_position = ledger
            .placement("mind_perception_owners", &id)
            .map(|row| row.position);
        let position = positions
            .get(*observer)
            .copied()
            .or(prior_position)
            .ok_or_else(error)?;
        write_header(
            schema,
            ledger,
            output,
            budget,
            observer,
            before.value.as_ref(),
            after,
            position,
            prior_position,
        )?;
    }
    if let Some(ordered) = &ordered {
        for (position, observer, after) in ordered.iter() {
            if selected.contains_key(observer) {
                continue;
            }
            let path = ["world", "perceptionEvidence", observer];
            let bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
            let _guard = budget.reserve(bytes * 2).map_err(|_| error())?;
            let id = crate::encoding::json_record(&path).map_err(|_| error())?;
            let prior_position = ledger
                .placement("mind_perception_owners", &id)
                .ok_or_else(error)?
                .position;
            if prior_position == position {
                continue;
            }
            // No semantic change: the original references remain exact.
            let mut one = IndexMap::new();
            let _one_guard = budget
                .reserve(map_storage::<&str, HeaderBefore>(1).ok_or_else(error)?)
                .map_err(|_| error())?;
            select_header(&mut one, state, observer, schema, budget)?;
            write_header(
                schema,
                ledger,
                output,
                budget,
                observer,
                one[observer].value.as_ref(),
                after,
                position,
                Some(prior_position),
            )?;
        }
    }
    output.observe_owner(&OwnerCoverage {
        table: "mind_perception_owners".into(),
        owner: "[\"world\"]".into(),
        complete: true,
        next_ordinal: owners.len() as u64,
        parent_present: true,
    })?;
    Ok(())
}
fn write_header(
    schema: &RecordSchema,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
    observer: &str,
    before: Option<&OwnerHeader<'_>>,
    after: &PerceptionEvidenceOwner,
    position: u64,
    prior_position: Option<u64>,
) -> Result<(), RecordEncodingError> {
    let layout = schema.layout("mind_perception_owners")?;
    let before_bytes = before
        .map(|before| layout.project_len(before))
        .transpose()
        .map_err(|_| error())?
        .unwrap_or(0);
    let bytes = layout
        .project_len(after)
        .map_err(|_| error())?
        .checked_add(before_bytes)
        .and_then(|bytes| bytes.checked_mul(16))
        .ok_or_else(error)?;
    let _encoding = budget.reserve(bytes).map_err(|_| error())?;
    let before_payload = before
        .map(|before| layout.project(before))
        .transpose()
        .map_err(|_| error())?;
    let payload = layout.project(after).map_err(|_| error())?;
    if before_payload.as_deref() == Some(payload.as_str()) && prior_position == Some(position) {
        return Ok(());
    }
    let references = ReferenceDelta::new(
        before.map(|before| {
            received_header_value_references(before.visual_confirmation.as_ref(), &before.received)
        }),
        received_owner_value_references(after),
        false,
    );
    let address = SelectedPlacement::new(
        ledger,
        "mind_perception_owners",
        &["world", "perceptionEvidence", observer],
        &["world"],
        observer,
        position,
        before.is_none(),
        budget,
    )?;
    output.write_encoded(
        "mind_perception_owners",
        address.value(),
        &payload,
        &[observer.into(), references.cell()],
        false,
        references.effects(),
    )
}
