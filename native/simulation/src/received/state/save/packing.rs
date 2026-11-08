//! Whole logical batches are packed once at the immutable database cut. Neither
//! a simulation tick nor an asynchronous retry allocates an observation/order.

use super::*;
use crate::encoding::{json_record, json_record_len};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::{PendingTemporalPage, ReceivedChargeDirectory, TemporalPageMetadata};
use crate::records::{EncodedRows, RecordSchema};
use serde::ser::SerializeMap;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TemporalSaveLimits {
    pub target_bytes: usize,
    pub row_bytes: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredBatch<'a> {
    batch_order: u64,
    entries: &'a [crate::received::ReceivedEntry],
}
struct StoredBatches<'a>(&'a [&'a PendingTemporalPage]);
impl Serialize for StoredBatches<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeSeq;
        let mut sequence = serializer.serialize_seq(Some(self.0.len()))?;
        for page in self.0 {
            let batch = page.batch();
            sequence.serialize_element(&StoredBatch {
                batch_order: batch.batch_order,
                entries: &batch.entries,
            })?;
        }
        sequence.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredPage<'a> {
    id: &'a str,
    order: u64,
    actor_id: &'a str,
    physical_life: u64,
    epoch: &'a str,
    from_at: f64,
    through_at: f64,
    bytes: u64,
    count: u64,
    append_closed: bool,
    batches: StoredBatches<'a>,
}

fn metadata(pages: &[&PendingTemporalPage]) -> Result<TemporalPageMetadata, RecordEncodingError> {
    let first = pages.first().ok_or_else(error)?.batch();
    let mut subjects = IndexSet::new();
    let mut tracks = IndexSet::new();
    let mut sources = IndexSet::new();
    let mut individuals = IndexSet::new();
    let mut occurrences = IndexSet::new();
    let mut references = IndexSet::new();
    let mut entries = Vec::new();
    entries
        .try_reserve_exact(pages.len())
        .map_err(|_| error())?;
    let mut bytes = 0u64;
    let mut count = 0u64;
    let mut first_at = None::<f64>;
    let mut last_at = None::<f64>;
    let mut spatial = false;
    for page in pages {
        let batch = page.batch();
        if batch.actor_id != first.actor_id
            || batch.physical_life != first.physical_life
            || batch.epoch != first.epoch
        {
            return Err(error());
        }
        let m = page.metadata();
        subjects.extend(m.subjects.iter().map(String::as_str));
        tracks.extend(m.tracks.iter().map(String::as_str));
        sources.extend(m.source_ids.iter().map(String::as_str));
        individuals.extend(m.individual_ids.iter().map(String::as_str));
        occurrences.extend(m.occurrence_keys.iter().map(String::as_str));
        references.extend(m.references.iter().map(String::as_str));
        entries.extend(m.charge_directory.entries.iter().cloned());
        bytes = bytes.checked_add(m.entry_bytes).ok_or_else(error)?;
        count = count.checked_add(m.count).ok_or_else(error)?;
        if let Some(at) = m.first_at {
            first_at = Some(first_at.map_or(at, |prior| prior.min(at)));
        }
        if let Some(at) = m.last_at {
            last_at = Some(last_at.map_or(at, |prior| prior.max(at)));
        }
        spatial |= m.spatial_context;
    }
    let start = entries.first().ok_or_else(error)?;
    let end = entries.last().ok_or_else(error)?;
    let mut references = references
        .into_iter()
        .map(str::to_owned)
        .collect::<Vec<_>>();
    references.sort_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()));
    Ok(TemporalPageMetadata {
        first_batch_order: Some(start.batch_order),
        first_entry: Some(start.first_entry),
        first_member: Some(0),
        last_batch_order: Some(end.batch_order),
        last_entry: Some(end.entry_index),
        last_member: Some(end.last_member),
        first_at,
        last_at,
        entry_bytes: bytes,
        count,
        subjects: subjects.into_iter().map(str::to_owned).collect(),
        tracks: tracks.into_iter().map(str::to_owned).collect(),
        source_ids: sources.into_iter().map(str::to_owned).collect(),
        individual_ids: individuals.into_iter().map(str::to_owned).collect(),
        occurrence_keys: occurrences.into_iter().map(str::to_owned).collect(),
        references,
        spatial_context: spatial,
        charge_directory: ReceivedChargeDirectory {
            actor_id: first.actor_id.clone(),
            physical_life: first.physical_life,
            epoch: first.epoch.clone(),
            entries,
        },
    })
}

struct AsText(u64);
impl Serialize for AsText {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.collect_str(&self.0)
    }
}
struct CheckpointRow<'a> {
    world_id: &'a str,
    placement: &'a RecordPlacement,
    payload: &'a str,
    columns: &'a [Value],
}
impl Serialize for CheckpointRow<'_> {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::Error;
        let mut row = s.serialize_map(Some(30))?;
        row.serialize_entry("world_id", self.world_id)?;
        row.serialize_entry("id", &self.placement.id)?;
        row.serialize_entry("parent_id", &self.placement.parent)?;
        row.serialize_entry("slot", &self.placement.slot)?;
        row.serialize_entry("position", &AsText(self.placement.position))?;
        row.serialize_entry("revision", &AsText(crate::identity::MAX_SAFE_INTEGER))?;
        row.serialize_entry("payload", self.payload)?;
        // Checkpoint line order is the existing temporalPageColumns factory order;
        // BIGINT adapter values use their larger quoted form for admission.
        const ORDER: [(&str, usize, bool); 23] = [
            ("actor_id", 0, false),
            ("physical_life", 1, true),
            ("receipt_epoch", 2, false),
            ("first_batch_order", 3, true),
            ("first_entry", 4, true),
            ("first_member", 5, true),
            ("last_batch_order", 6, true),
            ("last_entry", 7, true),
            ("last_member", 8, true),
            ("first_at", 9, false),
            ("last_at", 10, false),
            ("entry_bytes", 11, true),
            ("receipt_count", 12, true),
            ("spatial_context", 15, true),
            ("subject_keys", 16, false),
            ("track_keys", 17, false),
            ("source_ids", 18, false),
            ("individual_ids", 19, false),
            ("value_refs", 20, false),
            ("occurrence_keys", 21, false),
            ("lookup_buckets", 22, false),
            ("charge_directory", 14, false),
            ("encoded_bytes", 13, true),
        ];
        for (name, index, quoted) in ORDER {
            let value = self
                .columns
                .get(index)
                .ok_or_else(|| S::Error::custom("Incomplete temporal SQL projection."))?;
            if quoted {
                row.serialize_entry(
                    name,
                    &AsText(
                        value.as_u64().ok_or_else(|| {
                            S::Error::custom("Invalid temporal BIGINT projection.")
                        })?,
                    ),
                )?;
            } else {
                row.serialize_entry(name, value)?;
            }
        }
        row.end()
    }
}
#[derive(Serialize)]
struct Checkpoint<'a> {
    table: &'static str,
    row: CheckpointRow<'a>,
}

fn flush(
    pages: &[&PendingTemporalPage],
    world_id: &str,
    limits: TemporalSaveLimits,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if pages.is_empty() {
        return Ok(());
    }
    let batch = pages[0].batch();
    let metadata_bytes = pages
        .iter()
        .try_fold(0usize, |bytes, page| {
            bytes.checked_add(page.metadata().heap_bytes()?)
        })
        .ok_or_else(error)?;
    let keys = pages
        .iter()
        .try_fold(0usize, |n, page| {
            let m = page.metadata();
            n.checked_add(
                m.subjects.len()
                    + m.tracks.len()
                    + m.source_ids.len()
                    + m.individual_ids.len()
                    + m.occurrence_keys.len()
                    + m.references.len(),
            )
        })
        .ok_or_else(error)?;
    let scratch = heap_sum([
        metadata_bytes.checked_mul(4).ok_or_else(error)?,
        map_storage::<&str, ()>(keys)
            .and_then(|bytes| bytes.checked_mul(4))
            .ok_or_else(error)?,
        batch
            .actor_id
            .len()
            .checked_add(batch.epoch.len())
            .and_then(|n| n.checked_mul(64))
            .ok_or_else(error)?,
        4096,
    ])
    .ok_or_else(error)?;
    let _metadata = budget.reserve(scratch).map_err(|_| error())?;
    let metadata = metadata(pages)?;
    let id = json_record(&(
        &batch.actor_id,
        batch.physical_life,
        &batch.epoch,
        metadata.first_batch_order,
        metadata.first_entry,
        metadata.first_member,
    ))
    .map_err(|_| error())?;
    let page = StoredPage {
        id: &id,
        order: metadata.first_batch_order.ok_or_else(error)?,
        actor_id: &batch.actor_id,
        physical_life: batch.physical_life,
        epoch: &batch.epoch,
        from_at: metadata.first_at.ok_or_else(error)?,
        through_at: metadata.last_at.ok_or_else(error)?,
        bytes: metadata.entry_bytes,
        count: metadata.count,
        append_closed: true,
        batches: StoredBatches(pages),
    };
    let payload_bytes = json_record_len(&page).map_err(|_| error())?;
    let metadata_bytes = json_record_len(&metadata).map_err(|_| error())?;
    if payload_bytes
        .checked_add(metadata_bytes)
        .ok_or_else(error)?
        > limits.target_bytes
        && pages.len() > 1
    {
        let middle = pages.len().div_ceil(2);
        drop(page);
        drop(id);
        drop(metadata);
        drop(_metadata);
        flush(&pages[..middle], world_id, limits, output, budget)?;
        return flush(&pages[middle..], world_id, limits, output, budget);
    }
    let _payload = budget
        .reserve(
            payload_bytes
                .checked_mul(2)
                .map(|n| n.max(8))
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let payload = json_record(&page).map_err(|_| error())?;
    let order = page.order;
    drop(page);
    let _columns = budget
        .reserve(metadata_bytes.checked_mul(3).ok_or_else(error)?)
        .map_err(|_| error())?;
    let columns = crate::received::page::projection(
        &metadata,
        &batch.actor_id,
        batch.physical_life,
        &batch.epoch,
        payload.len(),
    )
    .map_err(|_| error())?;
    let placement = RecordPlacement {
        id: json_record(&[
            "world",
            "experience",
            "temporal",
            "actors",
            &batch.actor_id,
            "pages",
            &id,
        ])
        .map_err(|_| error())?,
        parent: json_record(&["world", "experience", "temporal", "actors", &batch.actor_id])
            .map_err(|_| error())?,
        slot: id,
        position: order,
    };
    let line = Checkpoint {
        table: "mind_temporal_pages",
        row: CheckpointRow {
            world_id,
            placement: &placement,
            payload: &payload,
            columns: &columns,
        },
    };
    if json_record_len(&line)
        .map_err(|_| error())?
        .checked_add(1)
        .ok_or_else(error)?
        > limits.row_bytes
    {
        return Err(RecordEncodingError(
            "An indivisible received history record exceeds its current checkpoint admission limit.",
        ));
    }
    output.write_encoded(
        "mind_temporal_pages",
        &placement,
        &payload,
        &columns,
        true,
        RowEffects::default(),
    )
}

/// This read is performed synchronously at the accepted cut before handing the
/// prefix to PostgreSQL. A retry reuses its fixed EncodedRows/SavePrefix bytes.
pub(crate) fn pack_temporal_save(
    state: &TemporalState,
    world_id: &str,
    acknowledged_before: Option<u64>,
    limits: TemporalSaveLimits,
    schema: &RecordSchema,
    budget: &ByteBudget,
) -> Result<EncodedRows, RecordEncodingError> {
    if limits.target_bytes == 0 || limits.row_bytes == 0 {
        return Err(error());
    }
    let count = state
        .actors
        .values()
        .try_fold(0usize, |count, actor| {
            count.checked_add(actor.pending_pages.len())
        })
        .ok_or_else(error)?;
    let _selection = budget
        .reserve(
            count
                .checked_mul(
                    size_of::<&PendingTemporalPage>() * 8
                        + size_of::<Vec<&PendingTemporalPage>>() * 2,
                )
                .and_then(|bytes| {
                    bytes.checked_add(map_storage::<(&str, u64, &str), Vec<&PendingTemporalPage>>(
                        count,
                    )?)
                })
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let mut pending = Vec::new();
    pending.try_reserve_exact(count).map_err(|_| error())?;
    for actor in state.actors.values() {
        for page in &actor.pending_pages {
            let batch = page.batch();
            if acknowledged_before.is_some_and(|before| batch.batch_order < before) {
                continue;
            }
            if let Some(frontier) = &actor.header.frontier {
                if frontier
                    .expired_through_time
                    .is_some_and(|expired| page.metadata().last_at.is_some_and(|at| at <= expired))
                {
                    continue;
                }
                if frontier.pressure_through.as_ref().is_some_and(|pressure| {
                    batch.batch_order < pressure.address.batch_order
                        || (batch.batch_order == pressure.address.batch_order
                            && batch.entries.last().is_some_and(|last| {
                                last.entry_index <= pressure.address.entry_index
                            }))
                }) {
                    continue;
                }
            }
            pending.push(page.as_ref());
        }
    }
    pending.sort_unstable_by_key(|page| page.flush_order());
    let mut owners = IndexMap::<(&str, u64, &str), Vec<&PendingTemporalPage>>::new();
    owners.try_reserve(count).map_err(|_| error())?;
    for page in pending {
        let batch = page.batch();
        owners
            .entry((&batch.actor_id, batch.physical_life, &batch.epoch))
            .or_default()
            .push(page);
    }
    let mut output = RowEncoder::new(schema, budget)?;
    for (_, mut pages) in owners {
        pages.sort_unstable_by_key(|page| page.batch().batch_order);
        for pair in pages.windows(2) {
            if pair[0].batch().batch_order == pair[1].batch().batch_order
                && !Arc::ptr_eq(pair[0].batch(), pair[1].batch())
            {
                return Err(error());
            }
        }
        pages.dedup_by(|a, b| Arc::ptr_eq(a.batch(), b.batch()));
        let mut start = 0;
        let mut estimated = 0usize;
        for index in 0..pages.len() {
            let bytes = usize::try_from(pages[index].batch_encoded_bytes()).map_err(|_| error())?;
            if index > start
                && estimated.checked_add(bytes).ok_or_else(error)? > limits.target_bytes
            {
                flush(&pages[start..index], world_id, limits, &mut output, budget)?;
                start = index;
                estimated = 0;
            }
            estimated = estimated.checked_add(bytes).ok_or_else(error)?;
        }
        flush(&pages[start..], world_id, limits, &mut output, budget)?;
    }
    output.finish()
}
