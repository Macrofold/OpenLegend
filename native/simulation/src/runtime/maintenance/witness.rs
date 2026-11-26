//! An admitted consolidation can wait outside the world turn. Watch just
//! its exact current source rows across acceptance and save acknowledgement.

use super::{ByteBudget, ByteReservation, RuntimeError, failure};
use crate::{
    experience::PersonalSourceRecord,
    records::{ChangedRows, RecordSchema},
};
use std::{
    collections::BTreeMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
};

const PERSONAL_TABLES: [&str; 3] = ["mind_awareness", "mind_memories", "mind_summaries"];

pub(in crate::runtime) struct ConsolidationWatches {
    active: AtomicUsize,
    rows: Mutex<BTreeMap<&'static str, BTreeMap<Arc<str>, Vec<Watch>>>>,
    _storage: ByteReservation,
}

struct Watch {
    current: Arc<AtomicBool>,
    revision: Arc<str>,
    column: usize,
}

pub(super) struct ConsolidationWatch {
    registry: Arc<ConsolidationWatches>,
    keys: Vec<(&'static str, Arc<str>)>,
    current: Arc<AtomicBool>,
    _storage: ByteReservation,
}

impl ConsolidationWatches {
    pub(in crate::runtime) fn new(budget: &ByteBudget) -> Result<Arc<Self>, RuntimeError> {
        let storage = budget.reserve(std::mem::size_of::<Self>() + 32)?;
        Ok(Arc::new(Self {
            active: AtomicUsize::new(0),
            rows: Mutex::new(BTreeMap::new()),
            _storage: storage,
        }))
    }

    pub(in crate::runtime) fn active(&self) -> bool {
        self.active.load(Ordering::Relaxed) != 0
    }

    pub(super) fn watch<'a>(
        self: &Arc<Self>,
        records: impl ExactSizeIterator<Item = &'a PersonalSourceRecord> + Clone,
        schema: &RecordSchema,
        budget: &ByteBudget,
    ) -> Result<ConsolidationWatch, RuntimeError> {
        let bytes = records
            .clone()
            .try_fold(512usize, |n, record| {
                n.checked_add(768)?
                    .checked_add(record.row_id().len())?
                    .checked_add(record.header().reference.revision.len())
            })
            .ok_or_else(|| failure("capacity"))?;
        let storage = budget.reserve(bytes)?;
        let current = Arc::new(AtomicBool::new(true));
        // Prepare every applicable schema position before installing a watch.
        let prepared = records
            .map(|record| {
                let reference = &record.header().reference;
                let table = reference.kind.table();
                let column = schema
                    .layout(table)
                    .map_err(failure)?
                    .columns
                    .iter()
                    .position(|name| name == "account_revision")
                    .ok_or_else(|| failure("missing personal source revision"))?;
                Ok((table, record, column))
            })
            .collect::<Result<Vec<_>, RuntimeError>>()?;
        let mut keys = Vec::with_capacity(prepared.len());
        let mut rows = self.rows.lock().unwrap_or_else(|error| error.into_inner());
        for (table, record, column) in prepared {
            let id: Arc<str> = Arc::from(record.row_id());
            rows.entry(table)
                .or_default()
                .entry(id.clone())
                .or_default()
                .push(Watch {
                    current: current.clone(),
                    revision: Arc::from(record.header().reference.revision.as_str()),
                    column,
                });
            keys.push((table, id));
        }
        self.active.fetch_add(1, Ordering::Relaxed);
        Ok(ConsolidationWatch {
            registry: self.clone(),
            keys,
            current,
            _storage: storage,
        })
    }

    /// Inspect only accepted changes. An unchanged replacement can change a
    /// row position without withdrawing the exact experience in the prompt.
    pub(in crate::runtime) fn observe(&self, changes: &ChangedRows) {
        let rows = self.rows.lock().unwrap_or_else(|error| error.into_inner());
        for table in PERSONAL_TABLES {
            let Some(watched) = rows.get(table) else {
                continue;
            };
            for row in changes.writes.get(table).into_iter().flatten() {
                if let Some(owners) = watched.get(row.id.as_str()) {
                    for owner in owners {
                        let current = row.extra.get(owner.column).and_then(|cell| cell.as_str());
                        if row.logical_removal == Some(true)
                            || current != Some(owner.revision.as_ref())
                        {
                            owner.current.store(false, Ordering::Release);
                        }
                    }
                }
            }
            for id in [changes.deletes.get(table), changes.expired.get(table)]
                .into_iter()
                .flatten()
                .flatten()
            {
                if let Some(owners) = watched.get(id.as_str()) {
                    for owner in owners {
                        owner.current.store(false, Ordering::Release);
                    }
                }
            }
        }
    }
}

impl ConsolidationWatch {
    pub(super) fn current(&self) -> bool {
        self.current.load(Ordering::Acquire)
    }
}

impl Drop for ConsolidationWatch {
    fn drop(&mut self) {
        let mut rows = self
            .registry
            .rows
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        for (table, id) in &self.keys {
            if let Some(rows) = rows.get_mut(table)
                && let Some(watches) = rows.get_mut(id)
            {
                watches.retain(|watch| !Arc::ptr_eq(&watch.current, &self.current));
                if watches.is_empty() {
                    rows.remove(id);
                }
            }
        }
        rows.retain(|_, rows| !rows.is_empty());
        self.registry.active.fetch_sub(1, Ordering::Relaxed);
    }
}
