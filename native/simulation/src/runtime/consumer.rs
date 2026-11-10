//! Decoding a finite native product allocates a second, independently lived
//! consumer graph. Its custody must outlive the last decoded/derived consumer,
//! not merely the encoded Buffer that JSON.parse consumed.
use super::{RuntimeError, failure};
use crate::encoding::JsonAllocationShape;
use crate::host::{ByteBudget, ByteReservation};
use std::{
    mem::{align_of, size_of},
    sync::Arc,
};

pub struct RuntimeConsumer {
    body: Arc<ByteReservation>,
    budget: ByteBudget,
    _reference: ByteReservation,
}

fn reference_bytes() -> Option<usize> {
    // Native class carrier plus conservative 64-bit opaque-wrapper metadata.
    size_of::<RuntimeConsumer>()
        .checked_add(32 * size_of::<u64>())
        .and_then(|n| n.checked_add(align_of::<RuntimeConsumer>() - 1))
}

/// Allocation escrow for the supported 64-bit Node/V8 JSON parser, not an
/// assertion about VM heap/RSS. No reviver or arbitrary constructor is admitted.
///
/// The source string/flattening/decoded character data each fit two bytes per
/// encoded byte. Container carriers, parser continuations and backing headers
/// receive 32 words; named/indexed properties receive 64 words for maps/descriptors,
/// dictionary or dense elements, handle/property stacks and number cells; array
/// items receive 8 words; string headers/alignment/interning receive 8 words.
/// Counts come from these exact bytes rather than another capture/world scan.
/// Source audit: Node22.23.2 deps/v8/src/json/json-parser.cc BuildJsonObject /
/// BuildJsonArray, js-data-object-builder.*, objects/{map,hash-table,fixed-array}.
/// Qualifying a different engine requires checking these layout bounds again.
fn decoded_bound(bytes: &[u8]) -> Result<usize, RuntimeError> {
    let shape =
        JsonAllocationShape::read(std::str::from_utf8(bytes).map_err(failure)?).map_err(failure)?;
    let word = size_of::<u64>();
    bytes
        .len()
        .checked_mul(6)
        .and_then(|n| n.checked_add(shape.containers.checked_mul(32 * word)?))
        .and_then(|n| n.checked_add(shape.members.checked_mul(64 * word)?))
        .and_then(|n| n.checked_add(shape.array_items.checked_mul(8 * word)?))
        .and_then(|n| n.checked_add(shape.strings.checked_mul(8 * word)?))
        .and_then(|n| n.checked_add(size_of::<ByteReservation>() + 2 * size_of::<usize>()))
        .ok_or_else(|| failure("native consumer allocation overflow"))
}

pub(super) fn prepare(bytes: &[u8], budget: &ByteBudget) -> Result<RuntimeConsumer, RuntimeError> {
    RuntimeConsumer::fund(decoded_bound(bytes)?, budget)
}

impl RuntimeConsumer {
    /// Capacity-only host admission for a finite SQL transfer or formatter
    /// preparation. It grants no read, write, source or publication authority.
    pub fn reserve(bytes: usize, budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let bytes = bytes
            .checked_add(size_of::<ByteReservation>() + 2 * size_of::<usize>())
            .ok_or_else(|| failure("native consumer allocation overflow"))?;
        Self::fund(bytes, budget)
    }

    /// The host already holds the raw transfer's admission before supplying
    /// these borrowed bytes. This scan allocates no decoded JSON graph.
    pub fn for_json(bytes: &[u8], budget: &ByteBudget) -> Result<Self, RuntimeError> {
        prepare(bytes, budget)
    }

    fn fund(bytes: usize, budget: &ByteBudget) -> Result<Self, RuntimeError> {
        let body = budget.reserve(bytes).map_err(failure)?;
        let reference = budget
            .reserve(reference_bytes().ok_or_else(|| failure("capacity"))?)
            .map_err(failure)?;
        Ok(Self {
            body: Arc::new(body),
            budget: budget.clone(),
            _reference: reference,
        })
    }

    /// An optional async task/cache or detached result obtains its own real
    /// reference custody while sharing the already admitted decoded graph.
    pub fn retain(&self) -> Result<Self, RuntimeError> {
        let reference = self
            .budget
            .reserve(reference_bytes().ok_or_else(|| failure("capacity"))?)
            .map_err(failure)?;
        Ok(Self {
            body: Arc::clone(&self.body),
            budget: self.budget.clone(),
            _reference: reference,
        })
    }
}
