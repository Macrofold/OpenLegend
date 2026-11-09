//! Shared owned-allocation accounting for actual receiver and storage captures.
//! Payload capacities remain separate from encoded gameplay byte quotas.

use indexmap::{IndexMap, IndexSet};
use std::hash::Hash;
use std::mem::size_of;

pub(crate) trait HeapBytes {
    fn heap_bytes(&self) -> Option<usize>;
}
pub(crate) fn heap_sum<const N: usize>(values: [usize; N]) -> Option<usize> {
    values.into_iter().try_fold(0_usize, usize::checked_add)
}
macro_rules! heap_record { ($ty:ty { $($field:ident),* $(,)? }) => {
 impl $crate::host::retained_size::HeapBytes for $ty { fn heap_bytes(&self)->Option<usize>{
     $crate::host::retained_size::heap_sum([$ ($crate::host::retained_size::HeapBytes::heap_bytes(&self.$field)?),*])
 } }
}; }
pub(crate) use heap_record;

macro_rules! fixed { ($($ty:ty),* $(,)?)=>{$(impl HeapBytes for $ty { fn heap_bytes(&self)->Option<usize>{Some(0)} })*}; }
fixed!(
    (),
    bool,
    f64,
    f32,
    u8,
    u16,
    u32,
    u64,
    usize,
    i8,
    i16,
    i32,
    i64,
    isize
);
impl HeapBytes for String {
    fn heap_bytes(&self) -> Option<usize> {
        Some(self.capacity())
    }
}
impl<T: HeapBytes> HeapBytes for Option<T> {
    fn heap_bytes(&self) -> Option<usize> {
        self.as_ref().map_or(Some(0), HeapBytes::heap_bytes)
    }
}
impl<T: HeapBytes> HeapBytes for Box<T> {
    fn heap_bytes(&self) -> Option<usize> {
        size_of::<T>().checked_add((**self).heap_bytes()?)
    }
}
impl<T: HeapBytes> HeapBytes for Vec<T> {
    fn heap_bytes(&self) -> Option<usize> {
        self.iter().try_fold(
            self.capacity().checked_mul(size_of::<T>())?,
            |sum, value| sum.checked_add(value.heap_bytes()?),
        )
    }
}
impl<T: HeapBytes, const N: usize> HeapBytes for [T; N] {
    fn heap_bytes(&self) -> Option<usize> {
        self.iter()
            .try_fold(0_usize, |sum, value| sum.checked_add(value.heap_bytes()?))
    }
}
impl<A: HeapBytes, B: HeapBytes> HeapBytes for (A, B) {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.0.heap_bytes()?, self.1.heap_bytes()?])
    }
}
// IndexMap exposes one common capacity rather than its two allocator layouts.
// Retain a conservative two-times power-of-two bound for the dense buckets and
// hash-index/control arrays. Payload fields use their actual owned capacities.
pub(crate) fn map_storage<K, V>(capacity: usize) -> Option<usize> {
    map_storage_layout(capacity, size_of::<(usize, K, V)>())
}
/// The same pinned IndexMap layout for a family whose pure decoder chooses the
/// largest actual entry carrier among several supported dictionary fields.
pub(crate) fn map_storage_layout(capacity: usize, entry_bytes: usize) -> Option<usize> {
    if capacity == 0 {
        return Some(0);
    }
    let buckets = capacity
        .checked_add(1)?
        .checked_next_power_of_two()?
        .checked_mul(2)?;
    buckets
        .checked_mul(
            entry_bytes
                .checked_add(size_of::<usize>())?
                .checked_add(1)?,
        )?
        .checked_add(16)
}
/// Pinned Rust B-tree nodes hold eleven keys and twelve edges. Charging one
/// full node for every live entry bounds a sparse tree after removals as well.
pub(crate) fn tree_node_bound<K, V>() -> Option<usize> {
    11_usize
        .checked_mul(size_of::<K>().checked_add(size_of::<V>())?)?
        .checked_add(16 * size_of::<usize>())
}
impl<K: HeapBytes + Eq + Hash, V: HeapBytes> HeapBytes for IndexMap<K, V> {
    fn heap_bytes(&self) -> Option<usize> {
        self.iter().try_fold(
            map_storage::<K, V>(self.capacity())?,
            |sum, (key, value)| heap_sum([sum, key.heap_bytes()?, value.heap_bytes()?]),
        )
    }
}
impl<T: HeapBytes + Eq + Hash> HeapBytes for IndexSet<T> {
    fn heap_bytes(&self) -> Option<usize> {
        self.iter()
            .try_fold(map_storage::<T, ()>(self.capacity())?, |sum, value| {
                sum.checked_add(value.heap_bytes()?)
            })
    }
}

/// Only immutable, freshly decoded serde_json values may use this walk. The
/// pinned Map API hides capacity; fresh decoder growth is bounded by twice its
/// live members plus the allocator minimum. An editable family must retain its
/// own actual map backing owner instead of applying this after arbitrary edits.
pub(crate) fn fresh_json_bytes(value: &serde_json::Value) -> Option<usize> {
    match value {
        serde_json::Value::Null | serde_json::Value::Bool(_) | serde_json::Value::Number(_) => {
            Some(0)
        }
        serde_json::Value::String(value) => value.heap_bytes(),
        serde_json::Value::Array(values) => values.iter().try_fold(
            values
                .capacity()
                .checked_mul(size_of::<serde_json::Value>())?,
            |sum, value| sum.checked_add(fresh_json_bytes(value)?),
        ),
        serde_json::Value::Object(values) => values.iter().try_fold(
            map_storage::<String, serde_json::Value>(values.len().checked_mul(2)?.checked_add(4)?)?,
            |sum, (key, value)| heap_sum([sum, key.capacity(), fresh_json_bytes(value)?]),
        ),
    }
}
impl HeapBytes for crate::state::UnconvertedField {
    fn heap_bytes(&self) -> Option<usize> {
        // Unconverted data is parsed once, inspected/refused, never edited.
        fresh_json_bytes(&self.0)
    }
}
