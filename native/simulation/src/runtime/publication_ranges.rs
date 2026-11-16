//! Two ordered ranges encode large ordinary publication writes directly into
//! disjoint slices of one admitted product. The writer/undo owner still settles
//! the entire candidate together. This runs only on the existing host pool.

use super::{Products, RuntimeError, RuntimeJson, failure};
use crate::encoding::{array_index, json_record_len, write_json_record};
use crate::host::ByteBudget;
use crate::records::{ChangedRow, ChangedRows, SqlCell};
use crate::simulation::CompletedOperation;
use serde::{Serialize, Serializer, ser::SerializeMap};
use std::{collections::BTreeMap, io};

const MIN_ROWS: usize = 16;
const MIN_BODY_BYTES: usize = 16 * 1024;
const MIN_RANGE_BYTES: usize = 4 * 1024;

/// Select the split on actual written row bodies. Rows have already been
/// validated and unchanged rows excluded by their semantic owners. The cheap
/// byte proxy partitions only at canonical table boundaries.
fn split_writes(records: &ChangedRows) -> Option<usize> {
    if records.rows < MIN_ROWS || records.writes.len() < 2 {
        return None;
    }
    let body_bytes =
        |rows: &Vec<ChangedRow>| rows.iter().map(|row| row.payload.len()).sum::<usize>();
    let total = records.writes.values().map(body_bytes).sum::<usize>();
    if total < MIN_BODY_BYTES {
        return None;
    }
    let mut left = 0;
    records
        .writes
        .values()
        .take(records.writes.len() - 1)
        .enumerate()
        .filter_map(|(index, rows)| {
            left += body_bytes(rows);
            let right = total - left;
            (left.min(right) >= MIN_RANGE_BYTES).then_some((index + 1, left.abs_diff(right)))
        })
        .min_by_key(|(_, imbalance)| *imbalance)
        .map(|(split, _)| split)
}

struct Writes<'a> {
    tables: &'a BTreeMap<String, Vec<ChangedRow>>,
    start: usize,
    end: usize,
}
impl Writes<'_> {
    fn entries(&self) -> impl Iterator<Item = (&String, &Vec<ChangedRow>)> {
        self.tables
            .iter()
            .skip(self.start)
            .take(self.end - self.start)
    }

    fn workspace(&self) -> Option<usize> {
        self.entries()
            .flat_map(|(_, rows)| rows)
            .flat_map(|row| &row.extra)
            .try_fold(0, |peak, cell| Some(peak.max(cell_workspace(cell)?)))
    }
}

/// The existing JS-key-order serializer keeps a vector of numeric keys
/// during an object's descent. Siblings are serialized in order. Exact text
/// and exact objects already own their raw encodings.
fn cell_workspace(cell: &SqlCell) -> Option<usize> {
    match cell {
        SqlCell::Array(items) => items
            .iter()
            .try_fold(0, |peak, item| Some(peak.max(cell_workspace(item)?))),
        SqlCell::Object(fields) => {
            let indexed = fields
                .keys()
                .filter(|key| array_index(key).is_some())
                .count();
            let local = if indexed == 0 {
                0
            } else {
                // Vec may briefly own both the old allocation and the
                // doubled capacity while growing its filtered result.
                indexed
                    .max(4)
                    .checked_mul(3 * std::mem::size_of::<(u32, &String, &SqlCell)>())?
            };
            let nested = fields
                .values()
                .try_fold(0, |peak, item| Some(peak.max(cell_workspace(item)?)))?;
            local.checked_add(nested)
        }
        _ => Some(0),
    }
}
impl Serialize for Writes<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(self.end - self.start))?;
        for (table, rows) in self.entries() {
            map.serialize_entry(table, rows)?;
        }
        map.end()
    }
}

struct ProductHead<'a, 'b>(&'b Products<'a>);
impl Serialize for ProductHead<'_, '_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        self.0.serialize_before_records(&mut map)?;
        map.end()
    }
}
struct RecordTail<'a>(&'a ChangedRows);
impl Serialize for RecordTail<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        self.0.serialize_after_writes(&mut map)?;
        map.end()
    }
}
struct ProductTail<'a, 'b>(&'b Products<'a>);
impl Serialize for ProductTail<'_, '_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        self.0.serialize_after_records(&mut map)?;
        map.end()
    }
}

fn body_bytes(value: &impl Serialize) -> Result<usize, RuntimeError> {
    json_record_len(value)
        .map_err(failure)?
        .checked_sub(2)
        .ok_or_else(|| failure("publication JSON framing"))
}

/// Integrate the same object serializer into a slice with one outer object
/// owner. Write only the interior and check the counted length at the seam.
struct ObjectBody<'a> {
    output: &'a mut [u8],
    seen: usize,
}
impl io::Write for ObjectBody<'_> {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        if bytes.is_empty() {
            return Ok(0);
        }
        let full_len = self.output.len() + 2;
        let through = self.seen + bytes.len();
        if through > full_len
            || (self.seen == 0 && bytes[0] != b'{')
            || (through == full_len && bytes[bytes.len() - 1] != b'}')
        {
            return Err(io::Error::other("publication range framing or size"));
        }
        let skip_start = usize::from(self.seen == 0);
        let skip_end = usize::from(through == full_len);
        self.output[self.seen + skip_start - 1..through - skip_end - 1]
            .copy_from_slice(&bytes[skip_start..bytes.len() - skip_end]);
        self.seen = through;
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
fn write_body(value: &impl Serialize, output: &mut [u8]) -> Result<(), RuntimeError> {
    let full_len = output.len() + 2;
    let mut body = ObjectBody { output, seen: 0 };
    write_json_record(value, &mut body).map_err(failure)?;
    if body.seen != full_len {
        return Err(failure("publication range length"));
    }
    Ok(())
}

fn next<'a>(dst: &mut &'a mut [u8], len: usize) -> &'a mut [u8] {
    let (used, remaining) = std::mem::take(dst).split_at_mut(len);
    *dst = remaining;
    used
}
fn delimiter(dst: &mut &mut [u8], bytes: &[u8]) {
    next(dst, bytes.len()).copy_from_slice(bytes);
}

pub(super) fn encode(
    products: &Products<'_>,
    budget: &ByteBudget,
    worker_ranges: bool,
) -> Result<RuntimeJson, RuntimeError> {
    // Direct library users and single-worker hosts use the inline encoder.
    // No join creates or borrows the process-global Rayon pool.
    if !worker_ranges
        || rayon::current_thread_index().is_none()
        || !matches!(products.operation, CompletedOperation::Advance(_))
    {
        return RuntimeJson::encode(products, budget);
    }
    let Some(split) = split_writes(products.records) else {
        return RuntimeJson::encode(products, budget);
    };
    let tables = &products.records.writes;
    let first = Writes {
        tables,
        start: 0,
        end: split,
    };
    let second = Writes {
        tables,
        start: split,
        end: tables.len(),
    };
    // Overlapping key-order work is charged before either range runs. If
    // its workspace crowds the ordinary output, keep the established serial
    // admission behavior at this batch.
    let Some(workspace) = first
        .workspace()
        .and_then(|left| left.checked_add(second.workspace()?))
    else {
        return RuntimeJson::encode(products, budget);
    };
    let Ok(range_workspace) = budget.reserve(workspace) else {
        return RuntimeJson::encode(products, budget);
    };
    let head = ProductHead(products);
    let records = RecordTail(products.records);
    let tail = ProductTail(products);
    let (first_len, second_len) = rayon::join(|| body_bytes(&first), || body_bytes(&second));
    let lengths = [
        body_bytes(&head)?,
        first_len?,
        second_len?,
        body_bytes(&records)?,
        body_bytes(&tail)?,
    ];
    const FRAMING: [&[u8]; 6] = [
        b"{",
        b",\"records\":{\"writes\":{",
        b",",
        b"},",
        b"},",
        b"}",
    ];
    let required = lengths
        .iter()
        .try_fold(
            FRAMING.iter().map(|part| part.len()).sum::<usize>(),
            |size, len| size.checked_add(*len),
        )
        .ok_or_else(|| failure("capacity"))?;
    let charge = required.checked_mul(2).ok_or_else(|| failure("capacity"))?;
    let mut custody = match budget.reserve(charge) {
        Ok(custody) => custody,
        Err(_) => {
            drop(range_workspace);
            return RuntimeJson::encode(products, budget);
        }
    };
    let mut bytes = Vec::new();
    bytes.try_reserve_exact(required).map_err(failure)?;
    bytes.resize(required, 0);
    let mut dst = bytes.as_mut_slice();
    delimiter(&mut dst, FRAMING[0]);
    let head_bytes = next(&mut dst, lengths[0]);
    delimiter(&mut dst, FRAMING[1]);
    let first_bytes = next(&mut dst, lengths[1]);
    delimiter(&mut dst, FRAMING[2]);
    let second_bytes = next(&mut dst, lengths[2]);
    delimiter(&mut dst, FRAMING[3]);
    let record_bytes = next(&mut dst, lengths[3]);
    delimiter(&mut dst, FRAMING[4]);
    let tail_bytes = next(&mut dst, lengths[4]);
    delimiter(&mut dst, FRAMING[5]);

    write_body(&head, head_bytes)?;
    let (first_result, second_result) = rayon::join(
        || write_body(&first, first_bytes),
        || write_body(&second, second_bytes),
    );
    first_result?;
    second_result?;
    drop(range_workspace);
    write_body(&records, record_bytes)?;
    write_body(&tail, tail_bytes)?;
    custody.resize(bytes.capacity()).map_err(failure)?;
    Ok(RuntimeJson {
        bytes,
        custody,
        handoff: None,
    })
}
