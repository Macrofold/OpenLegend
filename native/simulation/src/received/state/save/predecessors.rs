//! A privacy edit's actual first page and final replacement survive row sealing.
//! They authorize history revocation only; physical packing owns the saved rows.
use super::super::*;
use crate::host::ByteBudget;
use crate::host::retained_size::map_storage;
use crate::records::{RecordEncodingError, RecordSchema};
use serde::ser::{SerializeMap, SerializeSeq};
use serde::{Serialize, Serializer};
use std::mem::size_of;

struct PageEdit {
    before: Arc<TemporalPageRecord>,
    after: Option<Arc<TemporalPageRecord>>,
}
pub(crate) struct TemporalPredecessors {
    pages: Vec<PageEdit>,
    columns: [usize; 4],
    _storage: crate::host::ByteReservation,
}
fn invalid() -> RecordEncodingError {
    RecordEncodingError("Temporal edit has no exact first predecessor and final page.")
}
pub(crate) fn capture_temporal_predecessors(
    state: &TemporalState,
    schema: &RecordSchema,
    budget: &ByteBudget,
) -> Result<TemporalPredecessors, RecordEncodingError> {
    let count = state
        .undo
        .iter()
        .filter(|operation| matches!(operation, TemporalUndo::PageEdit { .. }))
        .count();
    let temporary = budget
        .reserve(
            map_storage::<&str, (&Arc<TemporalPageRecord>, &str, Option<u64>)>(count)
                .ok_or_else(invalid)?,
        )
        .map_err(|_| invalid())?;
    let storage = budget
        .reserve(
            count
                .checked_mul(size_of::<PageEdit>())
                .ok_or_else(invalid)?,
        )
        .map_err(|_| invalid())?;
    let mut selected = IndexMap::new();
    selected.try_reserve_exact(count).map_err(|_| invalid())?;
    for operation in &state.undo {
        if let TemporalUndo::PageEdit {
            actor_id,
            before,
            after_position,
            ..
        } = operation
        {
            let entry = selected.entry(before.row_id()).or_insert((
                before,
                actor_id.as_str(),
                *after_position,
            ));
            // Several invalidations may touch one physical block. Only the
            // first before-image and the final state belong to this whole cut.
            entry.2 = *after_position;
        }
    }
    let layout = schema.layout("mind_temporal_pages")?;
    let mut columns = [0; 4];
    for (slot, name) in
        columns
            .iter_mut()
            .zip(["subject_keys", "source_ids", "individual_ids", "value_refs"])
    {
        *slot = layout
            .columns
            .iter()
            .position(|field| field == name)
            .ok_or_else(invalid)?;
    }
    let mut pages = Vec::new();
    pages.try_reserve_exact(count).map_err(|_| invalid())?;
    for (id, (before, actor, position)) in selected {
        let after = position
            .map(|position| {
                state
                    .actors
                    .get(actor)
                    .and_then(|owner| owner.pages.get(&position))
                    .filter(|page| page.row_id() == id)
                    .cloned()
                    .ok_or_else(invalid)
            })
            .transpose()?;
        pages.push(PageEdit {
            before: Arc::clone(before),
            after,
        });
    }
    drop(temporary);
    Ok(TemporalPredecessors {
        pages,
        columns,
        _storage: storage,
    })
}
impl TemporalPredecessors {
    pub(crate) fn value(&self) -> impl Serialize + '_ {
        PageEdits(self)
    }
}
struct PageEdits<'a>(&'a TemporalPredecessors);
impl Serialize for PageEdits<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut sequence = serializer.serialize_seq(Some(self.0.pages.len()))?;
        for page in &self.0.pages {
            sequence.serialize_element(&Edit {
                page,
                columns: &self.0.columns,
            })?;
        }
        sequence.end()
    }
}
struct Edit<'a> {
    page: &'a PageEdit,
    columns: &'a [usize; 4],
}
impl Serialize for Edit<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(4))?;
        map.serialize_entry("id", self.page.before.row_id())?;
        map.serialize_entry(
            "before",
            &Page {
                page: &self.page.before,
                columns: self.columns,
            },
        )?;
        map.serialize_entry(
            "after",
            &self.page.after.as_ref().map(|page| Page {
                page,
                columns: self.columns,
            }),
        )?;
        map.serialize_entry(
            "afterPayload",
            &self.page.after.as_ref().map(|page| page.payload()),
        )?;
        map.end()
    }
}
struct Page<'a> {
    page: &'a TemporalPageRecord,
    columns: &'a [usize; 4],
}
impl Serialize for Page<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::Error;
        let page = self.page;
        let metadata = page.metadata();
        let mut map = serializer.serialize_map(Some(15))?;
        map.serialize_entry("id", page.id())?;
        map.serialize_entry("order", &page.order())?;
        map.serialize_entry("actorId", page.actor_id())?;
        map.serialize_entry("physicalLife", &page.physical_life())?;
        map.serialize_entry("epoch", page.epoch())?;
        map.serialize_entry(
            "fromAt",
            &metadata
                .first_at
                .ok_or_else(|| S::Error::custom("Temporal predecessor has no first time"))?,
        )?;
        map.serialize_entry(
            "throughAt",
            &metadata
                .last_at
                .ok_or_else(|| S::Error::custom("Temporal predecessor has no last time"))?,
        )?;
        map.serialize_entry("bytes", &metadata.entry_bytes)?;
        map.serialize_entry("count", &metadata.count)?;
        // Every TemporalPageRecord is a validated immutable, append-closed row.
        map.serialize_entry("appendClosed", &true)?;
        map.serialize_entry("batches", &Batches(page))?;
        for (name, index) in ["subjects", "sourceIds", "individualIds", "sourceRefs"]
            .into_iter()
            .zip(self.columns)
        {
            map.serialize_entry(
                name,
                page.columns()
                    .get(*index)
                    .ok_or_else(|| S::Error::custom("Temporal predecessor column missing"))?,
            )?;
        }
        map.end()
    }
}
struct Batches<'a>(&'a TemporalPageRecord);
impl Serialize for Batches<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut sequence = serializer.serialize_seq(None)?;
        for batch in self.0.batches() {
            sequence.serialize_element(batch.value())?;
        }
        sequence.end()
    }
}
