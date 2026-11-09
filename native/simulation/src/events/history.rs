//! Immutable original occurrences and their separate hot-list placements.
//! `world_hot_events` stores only an ID pointer; complete bodies come from the
//! existing history_events source at the same accepted cut, never reconstruction.

use super::WorldEvent;
use crate::encoding::json_record;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use crate::identity::MAX_SAFE_INTEGER;
use crate::records::{ChangedRow, InstalledRow, OwnerCoverage};
use crate::values::is_safe_record_id;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::mem::size_of;
use std::{collections::BTreeMap, sync::Arc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OccurrenceError(pub &'static str);
impl std::fmt::Display for OccurrenceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.0)
    }
}
impl std::error::Error for OccurrenceError {}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OriginalOccurrenceInput {
    pub event_id: String,
    pub payload: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct HotEventPointer {
    id: String,
}

#[derive(Debug)]
pub struct OriginalOccurrence {
    event: WorldEvent,
    payload: Arc<str>,
    _reservation: Option<ByteReservation>,
}

impl OriginalOccurrence {
    fn from_input(input: OriginalOccurrenceInput) -> Result<Self, OccurrenceError> {
        let event: WorldEvent = serde_json::from_str(&input.payload)
            .map_err(|_| OccurrenceError("Invalid current original occurrence."))?;
        if event.id != input.event_id
            || !event.text.validate()
            || event
                .narration
                .as_ref()
                .is_some_and(|narration| !narration.validate())
        {
            return Err(OccurrenceError(
                "Original occurrence identity or wording disagrees.",
            ));
        }
        Ok(Self {
            event,
            payload: Arc::from(input.payload),
            _reservation: None,
        })
    }
    pub fn event(&self) -> &WorldEvent {
        &self.event
    }
    pub fn payload(&self) -> &str {
        &self.payload
    }
}

#[derive(Debug)]
pub struct HotOccurrencePlacement {
    event: Arc<OriginalOccurrence>,
    row_id: String,
    parent: String,
    slot: String,
    position: u64,
}

impl HotOccurrencePlacement {
    pub fn event(&self) -> &Arc<OriginalOccurrence> {
        &self.event
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
    pub fn position(&self) -> u64 {
        self.position
    }
    pub fn changed_row(&self) -> Result<ChangedRow, OccurrenceError> {
        Ok(ChangedRow {
            id: self.row_id.clone(),
            parent: self.parent.clone(),
            slot: self.slot.clone(),
            position: self.position,
            payload: json_record(&HotEventPointer {
                id: self.event.event.id.clone(),
            })
            .map_err(|_| OccurrenceError("Hot occurrence pointer encoding failed."))?,
            extra: Vec::new(),
            create: true,
            received_uses_changed: None,
            write_columns: None,
            logical_removal: None,
            received_value_additions: None,
            received_value_removals: None,
        })
    }
}

#[derive(Clone, Copy, Debug)]
pub struct OccurrenceCheckpoint {
    operations: usize,
}

#[derive(Debug)]
enum OccurrenceUndo {
    Append {
        id: String,
        position: u64,
        next_ordinal: u64,
    },
}

/// Original bodies are internal authority. A player/model still needs its own
/// acquired personal account; this collection is never an unscoped public view.
#[derive(Debug)]
pub struct OccurrenceHistory {
    originals: IndexMap<String, Arc<OriginalOccurrence>>,
    hot: BTreeMap<u64, HotOccurrencePlacement>,
    complete_hot: bool,
    next_hot_ordinal: u64,
    archived_count: Option<u64>,
    undo: Vec<OccurrenceUndo>,
}

impl OccurrenceHistory {
    pub fn install(
        rows: Vec<InstalledRow>,
        originals: Vec<OriginalOccurrenceInput>,
        coverage: OwnerCoverage,
        archived_count: Option<u64>,
    ) -> Result<Self, OccurrenceError> {
        let parent = json_record(&["world"])
            .map_err(|_| OccurrenceError("Occurrence owner encoding failed."))?;
        if coverage.table != "world_hot_events"
            || coverage.owner != parent
            || !coverage.parent_present
            || archived_count.is_some_and(|count| count > MAX_SAFE_INTEGER)
        {
            return Err(OccurrenceError("Invalid hot occurrence coverage."));
        }
        let mut sources = IndexMap::new();
        for original in originals {
            let original = Arc::new(OriginalOccurrence::from_input(original)?);
            if sources
                .insert(original.event.id.clone(), original)
                .is_some()
            {
                return Err(OccurrenceError("Duplicate original occurrence identity."));
            }
        }
        let mut hot = BTreeMap::new();
        let mut ids = std::collections::BTreeSet::new();
        for row in rows {
            let pointer: HotEventPointer = serde_json::from_str(&row.payload)
                .map_err(|_| OccurrenceError("Hot occurrence row is not a current ID pointer."))?;
            let expected = json_record(&["world", "events", &pointer.id])
                .map_err(|_| OccurrenceError("Hot occurrence identity encoding failed."))?;
            if !row.extra.is_empty()
                || row.id != expected
                || row.parent != parent
                || row.position >= coverage.next_ordinal
                || !ids.insert(pointer.id.clone())
            {
                return Err(OccurrenceError(
                    "Hot occurrence placement disagrees with original identity.",
                ));
            }
            let event = Arc::clone(sources.get(&pointer.id).ok_or(OccurrenceError(
                "Hot occurrence lacks its original history body.",
            ))?);
            if hot
                .insert(
                    row.position,
                    HotOccurrencePlacement {
                        event,
                        row_id: row.id,
                        parent: row.parent,
                        slot: row.slot,
                        position: row.position,
                    },
                )
                .is_some()
            {
                return Err(OccurrenceError("Duplicate hot occurrence ordinal."));
            }
        }
        Ok(Self {
            originals: sources,
            hot,
            complete_hot: coverage.complete,
            next_hot_ordinal: coverage.next_ordinal,
            archived_count,
            undo: Vec::new(),
        })
    }
    pub fn archived_count(&self) -> Option<u64> {
        self.archived_count
    }
    pub fn complete_hot(&self) -> bool {
        self.complete_hot
    }
    pub fn next_hot_ordinal(&self) -> u64 {
        self.next_hot_ordinal
    }
    pub fn last_hot_order(&self) -> u64 {
        self.hot
            .last_key_value()
            .and_then(|(_, record)| record.event.event.order)
            .unwrap_or(0)
    }
    pub fn hot(&self) -> impl DoubleEndedIterator<Item = &HotOccurrencePlacement> + ExactSizeIterator {
        self.hot.values()
    }
    pub(crate) fn appended(&self) -> impl Iterator<Item = &HotOccurrencePlacement> {
        self.undo.iter().filter_map(|operation| match operation {
            OccurrenceUndo::Append { position, .. } => self.hot.get(position),
        })
    }
    /// Missing residency is unavailable evidence, never proof no occurrence exists.
    pub fn original(&self, id: &str) -> Result<&Arc<OriginalOccurrence>, OccurrenceError> {
        self.originals.get(id).ok_or(OccurrenceError(
            "Original occurrence requires its accepted cold source.",
        ))
    }
    pub fn checkpoint(&self) -> OccurrenceCheckpoint {
        OccurrenceCheckpoint {
            operations: self.undo.len(),
        }
    }
    /// The event emitter calls this only after original personal acquisition and
    /// placement. Independent reaction events append later at their own ordinals.
    pub(crate) fn append(
        &mut self,
        event: &WorldEvent,
        budget: &ByteBudget,
    ) -> Result<Arc<OriginalOccurrence>, OccurrenceError> {
        if !is_safe_record_id(&event.id)
            || self.originals.contains_key(&event.id)
            || self.next_hot_ordinal >= MAX_SAFE_INTEGER
            || !event.text.validate()
        {
            return Err(OccurrenceError("Invalid new original occurrence."));
        }
        let payload_bytes = crate::encoding::json_record_len(&event)
            .map_err(|_| OccurrenceError("Original occurrence encoding failed."))?;
        let bytes = heap_sum([
            event
                .heap_bytes()
                .ok_or(OccurrenceError("Original occurrence capacity overflow."))?,
            payload_bytes
                .checked_mul(2)
                .ok_or(OccurrenceError("Original occurrence capacity overflow."))?,
            size_of::<OriginalOccurrence>() + 2 * size_of::<usize>(),
            tree_node_bound::<u64, HotOccurrencePlacement>()
                .ok_or(OccurrenceError("Original occurrence capacity overflow."))?,
            map_storage::<String, Arc<OriginalOccurrence>>(4)
                .ok_or(OccurrenceError("Original occurrence capacity overflow."))?,
            event
                .id
                .len()
                .checked_mul(9)
                .and_then(|n| n.checked_add(128))
                .ok_or(OccurrenceError("Original occurrence capacity overflow."))?,
            4 * size_of::<OccurrenceUndo>(),
        ])
        .ok_or(OccurrenceError("Original occurrence capacity overflow."))?;
        let reservation = budget
            .reserve(bytes)
            .map_err(|_| OccurrenceError("Original occurrence exceeds native byte allowance."))?;
        self.originals
            .try_reserve(1)
            .map_err(|_| OccurrenceError("Original occurrence capacity unavailable."))?;
        self.undo
            .try_reserve_exact(1)
            .map_err(|_| OccurrenceError("Original occurrence undo unavailable."))?;
        let payload = json_record(&event)
            .map_err(|_| OccurrenceError("Original occurrence encoding failed."))?;
        let id = event.id.clone();
        let original = Arc::new(OriginalOccurrence {
            event: event.clone(),
            payload: Arc::from(payload),
            _reservation: Some(reservation),
        });
        let position = self.next_hot_ordinal;
        let row_id = json_record(&["world", "events", &id])
            .map_err(|_| OccurrenceError("Hot occurrence identity encoding failed."))?;
        let parent = json_record(&["world"])
            .map_err(|_| OccurrenceError("Hot occurrence owner encoding failed."))?;
        self.undo.push(OccurrenceUndo::Append {
            id: id.clone(),
            position,
            next_ordinal: self.next_hot_ordinal,
        });
        self.hot.insert(
            position,
            HotOccurrencePlacement {
                event: Arc::clone(&original),
                row_id,
                parent,
                slot: self.hot.len().to_string(),
                position,
            },
        );
        self.originals.insert(id, Arc::clone(&original));
        self.next_hot_ordinal += 1;
        Ok(original)
    }
    pub fn rollback_to(&mut self, checkpoint: OccurrenceCheckpoint) -> Result<(), OccurrenceError> {
        if checkpoint.operations > self.undo.len() {
            return Err(OccurrenceError("Stale occurrence rollback cursor."));
        }
        while self.undo.len() > checkpoint.operations {
            match self.undo.pop().expect("Journal length checked") {
                OccurrenceUndo::Append {
                    id,
                    position,
                    next_ordinal,
                } => {
                    if self.hot.remove(&position).is_none()
                        || self.originals.shift_remove(&id).is_none()
                    {
                        return Err(OccurrenceError("Occurrence rollback source is absent."));
                    }
                    self.next_hot_ordinal = next_ordinal;
                }
            }
        }
        Ok(())
    }
    pub fn discard_undo(&mut self) {
        self.undo = Vec::new();
    }
}
