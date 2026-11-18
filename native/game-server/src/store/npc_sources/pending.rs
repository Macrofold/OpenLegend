//! Detached pending-cut custody for one NPC source reader.
use super::*;
use openlegend_simulation::received::SourceVersionArchiveChange;

#[derive(Default)]
pub(super) struct Rows {
    personal: BTreeMap<(Kind, String), Option<InstalledRow>>,
    pages: BTreeMap<String, Option<InstalledRow>>,
    values: BTreeMap<String, Option<InstalledRow>>,
    archives: BTreeMap<(Kind, String, String), ArchivePlacement>,
}

struct ArchivePlacement {
    present: bool,
    payload: Option<String>,
}

pub(super) struct Overlay<'a> {
    pub detached: Option<&'a Rows>,
    pub suffix: &'a Rows,
}

pub(super) enum Archived<'a> {
    Durable,
    Removed,
    Body(&'a str),
}

impl Rows {
    /// Canonical row copies are limited to the selected personal keys, named
    /// Summary parents and the actor's relevant pending receipt page range.
    pub(super) fn merge(
        &mut self,
        store: &Store,
        actor: &str,
        selection: &Selection,
        rows: &ChangedRows,
        custody: &mut ByteReservation,
    ) -> StoreResult<()> {
        if [
            "data_world",
            "world_settings",
            "experience_state",
            "mind_temporal_state",
            "mind_temporal_actors",
            "mind_awareness_owners",
            "mind_memories_owners",
            "mind_summaries_owners",
        ]
        .into_iter()
        .any(|table| rows.deletes.contains_key(table))
        {
            return Err(StoreError::StaleCut);
        }
        for kind in KINDS {
            let table = kind.table();
            let wanted = |id: &str| {
                selection
                    .personal
                    .iter()
                    .any(|source| source.kind == kind && source.id == id)
                    || (kind == Kind::Summary
                        && (selection.parents.contains(id)
                            || selection.consolidation_job.as_ref().is_some_and(|job| {
                                id.strip_prefix(job)
                                    .is_some_and(|tail| tail.starts_with(':'))
                            })))
            };
            let at = if kind == Kind::Memory { 2 } else { 3 };
            for id in rows.deletes.get(table).into_iter().flatten() {
                let path = Path::parse(store, id)?;
                if path.at(at)? == actor && wanted(path.last()?) {
                    grow(
                        custody,
                        id.len().checked_add(256).ok_or(StoreError::Capacity)?,
                    )?;
                    self.personal.insert((kind, path.last()?.to_owned()), None);
                }
            }
            if let Some(writes) = rows.writes.get(table) {
                let table = store.npc_table(table)?;
                let owner = column(table, "actor_id")?;
                let source = column(table, "source_id")?;
                for row in writes {
                    if value_text(row, owner)? != actor {
                        continue;
                    }
                    let id = value_text(row, source)?;
                    if wanted(id) {
                        self.personal
                            .insert((kind, id.to_owned()), Some(retain(row, custody)?));
                    }
                }
            }
        }
        if selection.receipts.is_empty() {
            return Ok(());
        }
        let table = store.npc_table(receipts::PAGES)?;
        let actor_column = column(table, "actor_id")?;
        let batch = column(table, "first_batch_order")?;
        let entry = column(table, "first_entry")?;
        let through = selection
            .receipts
            .iter()
            .map(|receipt| (receipt.batch, receipt.entry))
            .max()
            .ok_or(StoreError::InvalidRecord)?;
        for row in rows.writes.get(receipts::PAGES).into_iter().flatten() {
            if value_text(row, actor_column)? == actor
                && (value_ordinal(row, batch)?, value_ordinal(row, entry)?) <= through
            {
                self.pages
                    .insert(row.id.clone(), Some(retain(row, custody)?));
            }
        }
        for id in rows.deletes.get(receipts::PAGES).into_iter().flatten() {
            let path = Path::parse(store, id)?;
            if path.at(4)? == actor {
                grow(
                    custody,
                    id.len().checked_add(128).ok_or(StoreError::Capacity)?,
                )?;
                self.pages.insert(id.clone(), None);
            }
        }
        Ok(())
    }

    pub(super) fn values_from(
        &mut self,
        store: &Store,
        rows: &ChangedRows,
        custody: &mut ByteReservation,
    ) -> StoreResult<()> {
        // Value packets are immutable. Only the origins named by an actual
        // selected pending actor page can gain new pending bodies. Keep
        // deletion masks for a durable candidate page without copying bodies.
        let value_refs = column(store.npc_table(receipts::PAGES)?, "value_refs")?;
        let mut needed = BTreeSet::new();
        for page in self.pages.values().filter_map(Option::as_ref) {
            for item in page
                .extra
                .get(value_refs)
                .and_then(SqlCell::as_array)
                .ok_or(StoreError::InvalidRecord)?
            {
                let id = item.as_str().ok_or(StoreError::InvalidRecord)?;
                needed.insert(id);
            }
        }
        if !needed.is_empty() {
            let table = store.npc_table(receipts::VALUES)?;
            let source = column(table, "source_id")?;
            for row in rows.writes.get(receipts::VALUES).into_iter().flatten() {
                let id = value_text(row, source)?;
                if needed.contains(id) {
                    self.values
                        .insert(id.to_owned(), Some(retain(row, custody)?));
                }
            }
        }
        for id in rows.deletes.get(receipts::VALUES).into_iter().flatten() {
            let path = Path::parse(store, id)?;
            grow(
                custody,
                id.len().checked_add(128).ok_or(StoreError::Capacity)?,
            )?;
            self.values.insert(path.last()?.to_owned(), None);
        }
        Ok(())
    }

    pub(super) fn archives<'a>(
        &mut self,
        actor: &str,
        selection: &Selection,
        changes: impl Iterator<Item = SourceVersionArchiveChange<'a>>,
        custody: &mut ByteReservation,
    ) -> StoreResult<()> {
        for change in changes {
            if change.actor_id != actor {
                continue;
            }
            let Some(reference) = selection.personal.iter().find(|reference| {
                reference.id == change.id
                    && reference.revision == change.revision
                    && kind_name(reference.kind) == change.kind
            }) else {
                continue;
            };
            let bytes = change
                .id
                .len()
                .checked_add(change.revision.len())
                .and_then(|n| n.checked_add(change.payload.map_or(0, str::len)))
                .and_then(|n| n.checked_add(256))
                .ok_or(StoreError::Capacity)?;
            grow(custody, bytes)?;
            let key = (
                reference.kind,
                change.id.to_owned(),
                change.revision.to_owned(),
            );
            match self.archives.entry(key) {
                std::collections::btree_map::Entry::Vacant(entry) => {
                    entry.insert(ArchivePlacement {
                        present: change.desired.is_some(),
                        payload: change.payload.map(str::to_owned),
                    });
                }
                std::collections::btree_map::Entry::Occupied(mut entry)
                    if entry.get().present && entry.get().payload.is_none() =>
                {
                    entry.get_mut().payload = change.payload.map(str::to_owned);
                }
                _ => {}
            }
        }
        Ok(())
    }
}

impl Overlay<'_> {
    pub(super) fn personal(&self, kind: Kind, id: &str) -> Option<Option<&InstalledRow>> {
        let key = (kind, id.to_owned());
        self.suffix
            .personal
            .get(&key)
            .or_else(|| self.detached.and_then(|owner| owner.personal.get(&key)))
            .map(Option::as_ref)
    }

    pub(super) fn archive(&self, source: &PersonalSourceRef) -> Archived<'_> {
        let key = (source.kind, source.id.clone(), source.revision.clone());
        let before = self.detached.and_then(|owner| owner.archives.get(&key));
        let newest = self.suffix.archives.get(&key).or(before);
        match newest {
            Some(change) if !change.present => Archived::Removed,
            Some(change) => change
                .payload
                .as_deref()
                .or_else(|| before.and_then(|old| old.payload.as_deref()))
                .map_or(Archived::Durable, Archived::Body),
            None => Archived::Durable,
        }
    }

    pub(super) fn has_summary_job(&self, prefix: &str) -> bool {
        self.personal_rows().any(|((kind, id), row)| {
            *kind == Kind::Summary && id.starts_with(prefix) && row.is_some()
        })
    }

    pub(super) fn summary_deletions(&self) -> Vec<&str> {
        self.personal_rows()
            .filter_map(|((kind, id), row)| {
                (*kind == Kind::Summary && row.is_none()).then_some(id.as_str())
            })
            .collect()
    }

    fn personal_rows(&self) -> impl Iterator<Item = (&(Kind, String), &Option<InstalledRow>)> {
        self.detached
            .into_iter()
            .flat_map(|owner| owner.personal.iter())
            .filter(|(id, _)| !self.suffix.personal.contains_key(*id))
            .chain(self.suffix.personal.iter())
    }

    pub(super) fn pages(&self) -> impl Iterator<Item = (&String, &Option<InstalledRow>)> {
        self.detached
            .into_iter()
            .flat_map(|owner| owner.pages.iter())
            .filter(|(id, _)| !self.suffix.pages.contains_key(*id))
            .chain(self.suffix.pages.iter())
    }

    pub(super) fn value(&self, id: &str) -> Option<Option<&InstalledRow>> {
        self.suffix
            .values
            .get(id)
            .or_else(|| self.detached.and_then(|owner| owner.values.get(id)))
            .map(Option::as_ref)
    }
}

struct Path {
    segments: Vec<String>,
    _storage: ByteReservation,
}

impl Path {
    fn parse(store: &Store, id: &str) -> StoreResult<Self> {
        let _storage = store
            .budget
            .reserve(
                id.len()
                    .checked_mul(4)
                    .and_then(|n| n.checked_add(512))
                    .ok_or(StoreError::Capacity)?,
            )
            .map_err(|_| StoreError::Capacity)?;
        let segments = serde_json::from_str(id).map_err(|_| StoreError::InvalidRecord)?;
        Ok(Self { segments, _storage })
    }
    fn at(&self, at: usize) -> StoreResult<&str> {
        self.segments
            .get(at)
            .map(String::as_str)
            .ok_or(StoreError::InvalidRecord)
    }
    fn last(&self) -> StoreResult<&str> {
        self.segments
            .last()
            .map(String::as_str)
            .ok_or(StoreError::InvalidRecord)
    }
}

fn value_text(row: &ChangedRow, at: usize) -> StoreResult<&str> {
    row.extra
        .get(at)
        .and_then(SqlCell::as_str)
        .ok_or(StoreError::InvalidRecord)
}

fn value_ordinal(row: &ChangedRow, at: usize) -> StoreResult<u64> {
    row.extra
        .get(at)
        .and_then(SqlCell::as_u64)
        .ok_or(StoreError::InvalidRecord)
}
