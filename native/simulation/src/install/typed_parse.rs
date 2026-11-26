//! First semantic decoding of one known immutable family. The owner supplies
//! actual Rust collection carriers; encoded row transport has a different life.
use super::InstallError;
use crate::host::retained_size::{heap_sum, map_storage_layout};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation};
use serde_json::Value;
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
        text_parse_bytes(source.len())?,
    ])
    .ok_or(InstallError::Capacity)?;
    budget.reserve(bytes).map_err(|_| InstallError::Capacity)
}

fn text_parse_bytes(source_bytes: usize) -> Result<usize, InstallError> {
    source_bytes.checked_mul(12).ok_or(InstallError::Capacity)
}

/// Complete only a serde_json::Value parse after its decoder has returned.
/// Keep the original collection allowance and actual surviving text; the
/// decoder's unescape workspace no longer lives through later row assembly.
/// Typed conversion storage is separate and must remain admitted by its owner.
pub(super) fn finish_json_parse(
    mut storage: ByteReservation,
    source: &str,
    value: &serde_json::Value,
) -> Result<ByteReservation, InstallError> {
    let retained = storage
        .bytes()
        .checked_sub(text_parse_bytes(source.len())?)
        .and_then(|bytes| bytes.checked_add(json_owned_string_bytes(value)?))
        .ok_or(InstallError::Capacity)?;
    storage
        .resize(retained)
        .map_err(|_| InstallError::Capacity)?;
    Ok(storage)
}

// A completed serde JSON parse leaves its owned keys and string values alive,
// while the decoder's unescape buffer is gone. Collection backing keeps the
// original preflight allowance until the later consuming typed conversion.
fn json_owned_string_bytes(value: &Value) -> Option<usize> {
    match value {
        Value::String(text) => Some(text.capacity()),
        Value::Array(values) => values.iter().try_fold(0usize, |bytes, value| {
            bytes.checked_add(json_owned_string_bytes(value)?)
        }),
        Value::Object(values) => values.iter().try_fold(0usize, |bytes, (key, value)| {
            bytes
                .checked_add(key.capacity())?
                .checked_add(json_owned_string_bytes(value)?)
        }),
        _ => Some(0),
    }
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
