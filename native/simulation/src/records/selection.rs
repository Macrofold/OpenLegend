//! Temporary SQL placement products. These retain addresses/borrowed values,
//! never another mutable body graph. Owners still select every changed field.
use super::{RecordEncodingError, RecordLedger, RecordPlacement};
use crate::host::{ByteBudget, ByteReservation};
use indexmap::IndexMap;
use std::mem::size_of;

fn error() -> RecordEncodingError {
    RecordEncodingError("Changed row has unavailable canonical placement or capacity.")
}
pub(crate) struct OrderedMapRows<'a, T> {
    entries: Vec<(&'a str, &'a T)>,
    _reservation: ByteReservation,
}
impl<'a, T> OrderedMapRows<'a, T> {
    pub(crate) fn new(
        map: &'a IndexMap<String, T>,
        budget: &ByteBudget,
    ) -> Result<Self, RecordEncodingError> {
        // Stable sorting may retain its full scratch array. Only canonical
        // array-index properties move; other keys preserve insertion order.
        let bytes = map
            .len()
            .checked_mul(2 * size_of::<(&str, &T)>())
            .ok_or_else(error)?;
        let reservation = budget.reserve(bytes).map_err(|_| error())?;
        let mut entries = Vec::with_capacity(map.len());
        entries.extend(map.iter().map(|(key, value)| (key.as_str(), value)));
        entries.sort_by(|(left, _), (right, _)| crate::encoding::js_property_cmp(left, right));
        Ok(Self {
            entries,
            _reservation: reservation,
        })
    }
    pub(crate) fn iter(&self) -> impl Iterator<Item = (u64, &'a str, &'a T)> + '_ {
        self.entries
            .iter()
            .enumerate()
            .map(|(position, (key, value))| (position as u64, *key, *value))
    }
}
pub(crate) struct SelectedPlacement {
    value: RecordPlacement,
    create: bool,
    _reservation: ByteReservation,
}
impl SelectedPlacement {
    pub(crate) fn new(
        ledger: &RecordLedger,
        table: &str,
        path: &[&str],
        parent: &[&str],
        slot: &str,
        position: u64,
        proven_new: bool,
        budget: &ByteBudget,
    ) -> Result<Self, RecordEncodingError> {
        let id_bytes = crate::encoding::json_record_len(path).map_err(|_| error())?;
        let parent_bytes = crate::encoding::json_record_len(parent).map_err(|_| error())?;
        let bytes = id_bytes
            .checked_add(parent_bytes)
            .and_then(|bytes| bytes.checked_mul(2))
            .and_then(|bytes| bytes.checked_add(slot.len() + 2 * size_of::<String>()))
            .ok_or_else(error)?;
        let reservation = budget.reserve(bytes).map_err(|_| error())?;
        let id = crate::encoding::json_record(path).map_err(|_| error())?;
        let parent = crate::encoding::json_record(parent).map_err(|_| error())?;
        if let Some(before) = ledger.placement(table, &id) {
            if before.parent != parent {
                return Err(error());
            }
        }
        let create = match ledger.presence(table, &id, &parent) {
            Some(present) => !present,
            None if proven_new => true,
            None => return Err(error()),
        };
        Ok(Self {
            value: RecordPlacement {
                id,
                parent,
                slot: slot.into(),
                position,
            },
            create,
            _reservation: reservation,
        })
    }
    pub(crate) fn value(&self) -> &RecordPlacement {
        &self.value
    }
    pub(crate) fn create(&self) -> bool {
        self.create
    }
}
