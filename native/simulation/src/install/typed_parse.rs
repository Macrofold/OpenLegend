//! First semantic decoding of one known immutable family. The owner supplies
//! actual Rust collection carriers; encoded row transport has a different life.
use super::InstallError;
use crate::host::retained_size::{heap_sum, map_storage_layout};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use std::mem::{align_of, size_of};

pub(crate) fn reserve_typed_parse<T>(
    source: &str,
    array_item_bytes: usize,
    map_entry_bytes: Option<usize>,
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
    // with that family's largest actual bucket entry, not a world-wide type.
    // Each small map can allocate its own minimum, so include container-local
    // growth rather than treating all members as one coalesced dictionary.
    let maps = match map_entry_bytes {
        None => 0,
        Some(entry) => {
            let capacity = shape
                .members
                .checked_mul(2)
                .and_then(|n| n.checked_add(shape.containers.checked_mul(4)?))
                .ok_or(InstallError::Capacity)?;
            map_storage_layout(capacity, entry).ok_or(InstallError::Capacity)?
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

/// A compiled immutable family declares its actual collection layouts. This is
/// allocation metadata, never a registry of executable rules or world limits.
pub(crate) trait DefinitionAllocation: crate::host::retained_size::HeapBytes {
    fn array_item_bytes() -> usize;
    fn map_entry_bytes() -> Option<usize>;
}
macro_rules! definition_layout {
    ($ty:ty; arrays [$($array:ty),* $(,)?]; maps [$($map:ty),* $(,)?]) => {
        impl $crate::install::DefinitionAllocation for $ty {
            fn array_item_bytes() -> usize {
                // The pinned serde tagged/untagged decoder may hold one Content
                // tree while matching a variant. Recursive untagged families
                // must stream instead; multiplying a whole tree at each depth
                // is not covered by one immutable input allowance.
                [
                    std::mem::size_of::<Self>(),
                    std::mem::size_of::<serde::__private229::de::Content<'static>>(),
                    $(std::mem::size_of::<$array>(),)*
                ].into_iter().max().unwrap_or(0)
            }
            fn map_entry_bytes() -> Option<usize> {
                Some([
                    std::mem::size_of::<(serde::__private229::de::Content<'static>, serde::__private229::de::Content<'static>)>(),
                    std::mem::size_of::<(usize, String, serde_json::Value)>(),
                    $(std::mem::size_of::<(usize, String, $map)>(),)*
                ].into_iter().max().unwrap_or(0))
            }
        }
    };
}
pub(crate) use definition_layout;
