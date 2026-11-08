//! Immutable current PostgreSQL page bodies and their exact derived projections.
//! A physical page is a packing unit; logical receipt addresses and ordinals
//! remain owned by the original receiver and batch.

use super::{
    ReceivedBatch, ReceivedChargeDirectory, ReceivedEntry, ReceivedEntryKind, ReceivedError,
    ReceivedValues, TemporalReceipt, TemporalReceiptLocator, TemporalValueMeaning,
    compact_received_receipt, materialize_received_receipt, received_batch_charge_directory,
    received_record_value_references, temporal_receipt_change_count,
};
use crate::encoding::json_record;
use crate::records::InstalledRow;
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexSet;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeSet, sync::Arc};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StoredBatch {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    batch_order: u64,
    entries: Vec<ReceivedEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StoredPage {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    order: u64,
    actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    physical_life: u64,
    epoch: String,
    from_at: f64,
    through_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    count: u64,
    append_closed: bool,
    batches: Vec<StoredBatch>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemporalPageMetadata {
    pub first_batch_order: Option<u64>,
    pub first_entry: Option<u64>,
    pub first_member: Option<u64>,
    pub last_batch_order: Option<u64>,
    pub last_entry: Option<u64>,
    pub last_member: Option<u64>,
    pub first_at: Option<f64>,
    pub last_at: Option<f64>,
    pub entry_bytes: u64,
    pub count: u64,
    pub subjects: Vec<String>,
    pub tracks: Vec<String>,
    pub source_ids: Vec<String>,
    pub individual_ids: Vec<String>,
    pub occurrence_keys: Vec<String>,
    pub references: Vec<String>,
    pub spatial_context: bool,
    pub charge_directory: ReceivedChargeDirectory,
}

pub fn temporal_page_metadata(
    actor_id: &str,
    physical_life: u64,
    epoch: &str,
    batches: &[Arc<ReceivedBatch>],
    values: &ReceivedValues,
    meaning: Option<&dyn TemporalValueMeaning>,
) -> Result<TemporalPageMetadata, ReceivedError> {
    let mut subjects = IndexSet::new();
    let mut tracks = IndexSet::new();
    let mut source_ids = IndexSet::new();
    let mut individual_ids = IndexSet::new();
    let mut occurrence_keys = IndexSet::new();
    let mut references = IndexSet::new();
    let mut headers = Vec::new();
    let mut spatial_context = false;
    for batch in batches {
        headers.extend(received_batch_charge_directory(batch, values, meaning)?.entries);
        for entry in &batch.entries {
            let record = &entry.receipt;
            subjects.insert(record.header.subject.clone());
            subjects.extend(record.header.context_subjects.iter().flatten().cloned());
            for field in &record.facets {
                if let Some(track) = &field.track {
                    tracks.insert(track.clone());
                }
            }
            if entry.kind == ReceivedEntryKind::Occurrence {
                occurrence_keys.insert(batch.locator(entry.entry_index).id());
            }
            references.extend(
                received_record_value_references(record, None)
                    .into_iter()
                    .map(str::to_owned),
            );
            spatial_context |= record.header.spatial_context == Some(true);
        }
    }
    for header in &headers {
        source_ids.extend(header.source_ids.iter().cloned());
        individual_ids.extend(header.individual_ids.iter().cloned());
    }
    let first = headers.first();
    let last = headers.last();
    let first_at = headers.iter().map(|header| header.at).reduce(f64::min);
    let last_at = headers
        .iter()
        .map(|header| header.through_at)
        .reduce(f64::max);
    Ok(TemporalPageMetadata {
        first_batch_order: first.map(|header| header.batch_order),
        first_entry: first.map(|header| header.first_entry),
        first_member: first.map(|_| 0),
        last_batch_order: last.map(|header| header.batch_order),
        last_entry: last.map(|header| header.entry_index),
        last_member: last.map(|header| header.last_member),
        first_at,
        last_at,
        entry_bytes: headers.iter().map(|header| header.bytes).sum(),
        count: headers.iter().map(|header| header.count).sum(),
        subjects: subjects.into_iter().collect(),
        tracks: tracks.into_iter().collect(),
        source_ids: source_ids.into_iter().collect(),
        individual_ids: individual_ids.into_iter().collect(),
        occurrence_keys: occurrence_keys.into_iter().collect(),
        references: references.into_iter().collect(),
        spatial_context,
        charge_directory: ReceivedChargeDirectory {
            actor_id: actor_id.to_owned(),
            physical_life,
            epoch: epoch.to_owned(),
            entries: headers,
        },
    })
}

fn lookup_bucket(kind: &str, value: &str) -> u64 {
    // The same UTF16 hash owner as source content labels, with the existing
    // PostgreSQL candidate-bucket mask; a bucket never establishes membership.
    u64::from(crate::encoding::content_hash(&format!("{kind}\0{value}")) & 16383)
}

pub(super) fn projection(
    metadata: &TemporalPageMetadata,
    actor_id: &str,
    physical_life: u64,
    epoch: &str,
    payload_bytes: usize,
) -> Result<Vec<Value>, ReceivedError> {
    let mut references = metadata.references.clone();
    references.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    let mut buckets = BTreeSet::new();
    for (kind, values) in [
        ("subjects", &metadata.subjects),
        ("tracks", &metadata.tracks),
        ("sourceIds", &metadata.source_ids),
        ("individualIds", &metadata.individual_ids),
    ] {
        for value in values {
            buckets.insert(lookup_bucket(kind, value));
        }
    }
    let directory = json_record(&metadata.charge_directory)
        .map_err(|_| ReceivedError("Temporal directory encoding failed."))?;
    Ok(vec![
        Value::from(actor_id),
        Value::from(physical_life),
        Value::from(epoch),
        Value::from(metadata.first_batch_order),
        Value::from(metadata.first_entry),
        Value::from(metadata.first_member),
        Value::from(metadata.last_batch_order),
        Value::from(metadata.last_entry),
        Value::from(metadata.last_member),
        Value::from(metadata.first_at),
        Value::from(metadata.last_at),
        Value::from(metadata.entry_bytes),
        Value::from(metadata.count),
        Value::from(payload_bytes as u64),
        Value::from(directory),
        Value::from(u64::from(metadata.spatial_context)),
        Value::from(metadata.subjects.clone()),
        Value::from(metadata.tracks.clone()),
        Value::from(metadata.source_ids.clone()),
        Value::from(metadata.individual_ids.clone()),
        Value::from(references),
        Value::from(metadata.occurrence_keys.clone()),
        Value::from(buckets.into_iter().collect::<Vec<_>>()),
    ])
}

/// Encoded body is canonical authority; typed batches and projections are
/// validated immutable read preparation. An edit constructs one replacement.
#[derive(Debug)]
pub struct TemporalPageRecord {
    id: String,
    row_id: String,
    parent: String,
    slot: String,
    position: u64,
    payload: Arc<str>,
    columns: Arc<[Value]>,
    actor_id: String,
    physical_life: u64,
    epoch: String,
    order: u64,
    batches: Vec<Arc<ReceivedBatch>>,
    metadata: TemporalPageMetadata,
}

impl TemporalPageRecord {
    pub fn install(
        row: InstalledRow,
        actor_id: &str,
        through: f64,
        values: &ReceivedValues,
        meaning: Option<&dyn TemporalValueMeaning>,
    ) -> Result<Self, ReceivedError> {
        let page: StoredPage = serde_json::from_str(&row.payload)
            .map_err(|_| ReceivedError("Invalid current temporal page encoding."))?;
        let parent = json_record(&["world", "experience", "temporal", "actors", actor_id])
            .map_err(|_| ReceivedError("Temporal owner encoding failed."))?;
        let id = json_record(&[
            "world",
            "experience",
            "temporal",
            "actors",
            actor_id,
            "pages",
            &page.id,
        ])
        .map_err(|_| ReceivedError("Temporal identity encoding failed."))?;
        if page.actor_id != actor_id
            || !is_safe_record_id(&page.id)
            || !page.append_closed
            || page.batches.is_empty()
            || row.parent != parent
            || row.id != id
            || row.slot != page.id
            || row.position != page.batches[0].batch_order
        {
            return Err(ReceivedError("Invalid current temporal block owner."));
        }
        let mut batches = Vec::with_capacity(page.batches.len());
        let mut prior_batch = 0;
        let mut addresses = BTreeSet::new();
        for block in page.batches {
            if block.batch_order < prior_batch || block.entries.is_empty() {
                return Err(ReceivedError("Invalid sparse received block."));
            }
            prior_batch = block.batch_order;
            let batch = ReceivedBatch {
                actor_id: actor_id.to_owned(),
                physical_life: page.physical_life,
                epoch: page.epoch.clone(),
                batch_order: block.batch_order,
                entries: block.entries,
            };
            let mut previous = None;
            for entry in &batch.entries {
                if previous.is_some_and(|previous| entry.entry_index <= previous)
                    || !addresses.insert((batch.batch_order, entry.entry_index))
                    || !entry.received_at.is_finite()
                    || entry.received_at > through
                    || entry.charge.count
                        != temporal_receipt_change_count(
                            entry.receipt.header.change,
                            entry.receipt.facets.len(),
                        )
                {
                    return Err(ReceivedError("Invalid sparse received change."));
                }
                if entry.receipt.facets.is_empty()
                    && entry.kind != ReceivedEntryKind::Boundary
                    && entry.receipt.header.change != super::TemporalChange::ReceiverFrame
                {
                    return Err(ReceivedError("Received change has no admitted content."));
                }
                let receipt = materialize_received_receipt(&batch, entry, None)?;
                receipt.validate(actor_id, through, values, None)?;
                if compact_received_receipt(&batch.observer(), &receipt)? != entry.receipt {
                    return Err(ReceivedError("Noncanonical received record."));
                }
                previous = Some(entry.entry_index);
            }
            batches.push(Arc::new(batch));
        }
        let metadata = temporal_page_metadata(
            actor_id,
            page.physical_life,
            &page.epoch,
            &batches,
            values,
            meaning,
        )?;
        if page.bytes != metadata.entry_bytes
            || page.count != metadata.count
            || Some(page.from_at) != metadata.first_at
            || Some(page.through_at) != metadata.last_at
        {
            return Err(ReceivedError(
                "Temporal bounds or scalar charges disagree with its entries.",
            ));
        }
        let expected = projection(
            &metadata,
            actor_id,
            page.physical_life,
            &page.epoch,
            row.payload.len(),
        )?;
        // SQL numeric values and JSON numbers share JavaScript's number domain:
        // typed 0.0 and transported 0 must compare as the existing writer does.
        if json_record(&expected)
            .map_err(|_| ReceivedError("Temporal projection encoding failed."))?
            != json_record(&row.extra)
                .map_err(|_| ReceivedError("Temporal projection encoding failed."))?
        {
            return Err(ReceivedError(
                "Temporal column projection disagrees with its payload.",
            ));
        }
        Ok(Self {
            id: page.id,
            row_id: row.id,
            parent: row.parent,
            slot: row.slot,
            position: row.position,
            payload: Arc::from(row.payload),
            columns: Arc::from(row.extra),
            actor_id: page.actor_id,
            physical_life: page.physical_life,
            epoch: page.epoch,
            order: page.order,
            batches,
            metadata,
        })
    }
    pub fn id(&self) -> &str {
        &self.id
    }
    pub fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub fn physical_life(&self) -> u64 {
        self.physical_life
    }
    pub fn epoch(&self) -> &str {
        &self.epoch
    }
    pub fn order(&self) -> u64 {
        self.order
    }
    pub fn position(&self) -> u64 {
        self.position
    }
    pub fn payload(&self) -> &str {
        &self.payload
    }
    pub fn row_id(&self) -> &str {
        &self.row_id
    }
    pub fn parent(&self) -> &str {
        &self.parent
    }
    pub fn slot(&self) -> &str {
        &self.slot
    }
    pub fn columns(&self) -> &[Value] {
        &self.columns
    }
    pub fn metadata(&self) -> &TemporalPageMetadata {
        &self.metadata
    }
    pub fn batches(&self) -> impl Iterator<Item = &Arc<ReceivedBatch>> {
        self.batches.iter()
    }
    pub fn receipt(
        &self,
        locator: &TemporalReceiptLocator,
        members: Option<&BTreeSet<u64>>,
    ) -> Result<Option<TemporalReceipt>, ReceivedError> {
        if locator.actor_id != self.actor_id
            || locator.physical_life != self.physical_life
            || locator.epoch != self.epoch
        {
            return Ok(None);
        }
        let Some(batch) = self
            .batches
            .iter()
            .find(|batch| batch.batch_order == locator.batch_order)
        else {
            return Ok(None);
        };
        batch
            .entries
            .iter()
            .find(|entry| entry.entry_index == locator.entry_index)
            .map(|entry| materialize_received_receipt(batch, entry, members))
            .transpose()
    }
}
