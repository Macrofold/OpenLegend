//! Save acknowledgement relocates the committed physical prefix. It never
//! changes logical receipt charges, source IDs, privacy or simulation clocks.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::page::TemporalPageEditIdentity;
use crate::records::{ChangedRows, EncodedRows, RecordEncodingError};
use std::mem::size_of;
mod apply;
pub(crate) use apply::PreparedTemporalResidency;

pub(crate) struct PackedTemporalSave {
    pub(super) rows: EncodedRows,
    pub(super) residency: Arc<SavedTemporalResidency>,
}
impl PackedTemporalSave {
    pub(crate) fn changes(&self) -> &ChangedRows {
        self.rows.changes()
    }
    pub(crate) fn owners(&self) -> &[OwnerCoverage] {
        self.rows.owners()
    }
    pub(crate) fn into_parts(
        self,
    ) -> (
        ChangedRows,
        Vec<OwnerCoverage>,
        ByteReservation,
        Arc<SavedTemporalResidency>,
    ) {
        let (rows, owners, guard) = self.rows.into_parts();
        (rows, owners, guard, self.residency)
    }
}
pub(super) struct SavedActorTail {
    pub(super) pages: Vec<Arc<TemporalPageRecord>>,
    pub(super) edits: Vec<Arc<TemporalPageEditIdentity>>,
}
pub(crate) struct SavedTemporalResidency {
    world_id: String,
    generation: String,
    through_cut: u64,
    identity_through: u64,
    resident_bytes: usize,
    pub(super) actors: IndexMap<String, SavedActorTail>,
    pub(super) affected: indexmap::IndexSet<String>,
    _storage: ByteReservation,
}
fn error() -> RecordEncodingError {
    RecordEncodingError(
        "Saved temporal residency requires its exact immutable prefix and allowance.",
    )
}
impl SavedTemporalResidency {
    pub(crate) fn matches(&self, world: &str, generation: &str, cut: u64, identity: u64) -> bool {
        self.world_id == world
            && self.generation == generation
            && self.through_cut == cut
            && self.identity_through == identity
    }
    pub(crate) fn through_cut(&self) -> u64 {
        self.through_cut
    }
    pub(crate) fn identity_through(&self) -> u64 {
        self.identity_through
    }
    pub(super) fn prepare(
        cut: &crate::records::save::TemporalSaveCut<'_>,
        packed: Vec<Arc<TemporalPageRecord>>,
        existing: &ChangedRows,
        resident_bytes: usize,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, RecordEncodingError> {
        let state = cut.temporal;
        let current = state
            .actors
            .values()
            .try_fold(0usize, |n, a| n.checked_add(a.pages.len()))
            .ok_or_else(error)?;
        let count = current.checked_add(packed.len()).ok_or_else(error)?;
        let names = state
            .actors
            .keys()
            .try_fold(0usize, |n, k| n.checked_add(k.len()))
            .ok_or_else(error)?;
        let size = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            cut.world_id.len(),
            cut.generation.len(),
            names.checked_mul(2).ok_or_else(error)?,
            map_storage::<String, ()>(
                state
                    .actors
                    .len()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(1))
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?,
            map_storage::<String, SavedActorTail>(
                state
                    .actors
                    .len()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(1))
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?,
            map_storage::<&str, Vec<Arc<TemporalPageRecord>>>(
                packed
                    .len()
                    .checked_mul(2)
                    .and_then(|n| n.checked_add(1))
                    .ok_or_else(error)?,
            )
            .ok_or_else(error)?,
            count
                .checked_mul(
                    size_of::<Arc<TemporalPageRecord>>()
                        .checked_mul(4)
                        .ok_or_else(error)?,
                )
                .ok_or_else(error)?,
            current
                .checked_mul(size_of::<Arc<TemporalPageEditIdentity>>())
                .ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        let mut storage = budget.reserve(size).map_err(|_| error())?;
        let mut affected = indexmap::IndexSet::new();
        affected
            .try_reserve(state.actors.len())
            .map_err(|_| error())?;
        for row in existing
            .writes
            .get("mind_temporal_pages")
            .into_iter()
            .flatten()
        {
            let actor = row
                .extra
                .first()
                .and_then(crate::records::SqlCell::as_str)
                .ok_or_else(error)?;
            affected.insert(actor.to_owned());
        }
        for id in existing
            .deletes
            .get("mind_temporal_pages")
            .into_iter()
            .flatten()
            .chain(
                existing
                    .expired
                    .get("mind_temporal_pages")
                    .into_iter()
                    .flatten(),
            )
        {
            let path: Vec<String> = serde_json::from_str(id).map_err(|_| error())?;
            affected.insert(path.get(4).ok_or_else(error)?.clone());
        }
        for page in &packed {
            affected.insert(page.actor_id().to_owned());
        }

        let mut grouped = IndexMap::<&str, Vec<Arc<TemporalPageRecord>>>::new();
        grouped.try_reserve(packed.len()).map_err(|_| error())?;
        for page in &packed {
            let group = grouped.entry(page.actor_id()).or_default();
            group.try_reserve(1).map_err(|_| error())?;
            group.push(Arc::clone(page));
        }
        let mut actors = IndexMap::new();
        actors
            .try_reserve(state.actors.len())
            .map_err(|_| error())?;
        for (actor_id, actor) in &state.actors {
            let incoming = grouped
                .get(actor_id.as_str())
                .map_or(&[][..], Vec::as_slice);
            let capacity = actor
                .pages
                .len()
                .checked_add(incoming.len())
                .ok_or_else(error)?;
            let mut pages = Vec::new();
            pages.try_reserve_exact(capacity).map_err(|_| error())?;
            let mut edits = Vec::new();
            edits
                .try_reserve_exact(actor.pages.len())
                .map_err(|_| error())?;
            for page in actor.pages.values() {
                // Only the exact body carried by this immutable SQL prefix can
                // become acknowledged. A later sparse edit has another marker.
                if let Some(id) = page.edit_identity().filter(|_| {
                    existing
                        .writes
                        .get("mind_temporal_pages")
                        .is_some_and(|rows| {
                            rows.iter()
                                .any(|row| row.id == page.row_id() && row.payload == page.payload())
                        })
                }) {
                    edits.push(Arc::clone(id));
                }
                pages.push(Arc::clone(page));
            }
            pages.extend(incoming.iter().cloned());
            // Current physical pages cannot overlap their first logical entry.
            // Therefore Source's ICU page-ID tie-break is never needed here.
            pages.sort_by_key(|page| {
                (
                    page.metadata().first_batch_order,
                    page.metadata().first_entry,
                )
            });
            if pages.windows(2).any(|pair| {
                pair[0].metadata().first_batch_order == pair[1].metadata().first_batch_order
                    && pair[0].metadata().first_entry == pair[1].metadata().first_entry
            }) {
                return Err(error());
            }
            let mut bytes = 0usize;
            let mut start = pages.len();
            for index in (0..pages.len()).rev() {
                let next = pages[index].payload().len();
                if bytes > 0 && bytes.checked_add(next).ok_or_else(error)? > resident_bytes {
                    break;
                }
                bytes = bytes.checked_add(next).ok_or_else(error)?;
                start = index;
            }
            pages.drain(..start);
            actors.insert(actor_id.clone(), SavedActorTail { pages, edits });
        }
        drop(grouped);
        drop(packed);
        let actual = actors
            .iter()
            .try_fold(
                heap_sum([
                    size_of::<Self>() + 2 * size_of::<usize>(),
                    cut.world_id.len(),
                    cut.generation.len(),
                    map_storage::<String, SavedActorTail>(actors.capacity()).ok_or_else(error)?,
                    map_storage::<String, ()>(affected.capacity()).ok_or_else(error)?,
                    affected
                        .iter()
                        .try_fold(0usize, |n, k| n.checked_add(k.capacity()))
                        .ok_or_else(error)?,
                ])
                .ok_or_else(error)?,
                |n, (actor, tail)| {
                    heap_sum([
                        n,
                        actor.capacity(),
                        tail.pages
                            .capacity()
                            .checked_mul(size_of::<Arc<TemporalPageRecord>>())?,
                        tail.edits
                            .capacity()
                            .checked_mul(size_of::<Arc<TemporalPageEditIdentity>>())?,
                    ])
                },
            )
            .ok_or_else(error)?;
        storage.resize(actual).map_err(|_| error())?;
        Ok(Arc::new(Self {
            world_id: cut.world_id.to_owned(),
            generation: cut.generation.to_owned(),
            through_cut: cut.through_cut,
            identity_through: cut.identity_through,
            resident_bytes,
            actors,
            affected,
            _storage: storage,
        }))
    }
}
