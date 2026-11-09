//! First semantic decoding of one known immutable family. The owner supplies
//! actual Rust collection carriers; encoded row transport has a different life.
use super::InstallError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use std::mem::{align_of, size_of};

pub(crate) fn reserve_typed_parse<T>(
    source: &str,
    array_item_bytes: usize,
    map_value_bytes: Option<usize>,
    budget: &ByteBudget,
) -> Result<ByteReservation, InstallError> {
    let shape = crate::encoding::JsonAllocationShape::read(source)
        .map_err(|_| InstallError::DefinitionBody)?;
    let arrays = shape
        .array_items
        .checked_mul(4)
        .and_then(|n| n.checked_mul(array_item_bytes))
        .ok_or(InstallError::Capacity)?;
    // A fixed struct does not allocate a map for its field identifiers. When
    // this family also contains dynamic maps, count every member conservatively
    // with that family's largest actual value carrier, not a world-wide type.
    let maps = match map_value_bytes {
        None => 0,
        Some(value) => {
            let capacity = shape
                .members
                .checked_mul(2)
                .and_then(|n| n.checked_add(4))
                .ok_or(InstallError::Capacity)?;
            map_storage::<String, ()>(capacity)
                .and_then(|n| n.checked_add(capacity.checked_mul(value)?))
                .ok_or(InstallError::Capacity)?
        }
    };
    let bytes = heap_sum([
        size_of::<T>(),
        size_of::<ResidentReservation>(),
        4 * size_of::<usize>() + align_of::<T>() - 1,
        arrays,
        maps,
        // Includes owned strings, shared serde unescape storage and the exact
        // UTF16 scalar codec's raw/units/derived encoding where present.
        source.len().checked_mul(12).ok_or(InstallError::Capacity)?,
    ])
    .ok_or(InstallError::Capacity)?;
    budget.reserve(bytes).map_err(|_| InstallError::Capacity)
}
