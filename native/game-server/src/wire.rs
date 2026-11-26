//! Encoding and the socket's detached payload share the exact admitted bytes.
//! A private stream chooses its payload under the disclosure lease first.

use axum::body::Bytes;
use openlegend_simulation::{
    encoding::{json_record_len, write_json_record},
    host::{ByteBudget, ByteReservation},
};
use serde::Serialize;
use std::io::{self, Write};

#[derive(Debug)]
pub enum WireError {
    Capacity,
    Encoding(serde_json::Error),
}

impl std::fmt::Display for WireError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Capacity => f.write_str("The selected response exceeded its byte allowance"),
            Self::Encoding(error) => error.fmt(f),
        }
    }
}

impl std::error::Error for WireError {}

struct FundedBytes {
    bytes: Vec<u8>,
    _custody: ByteReservation,
}

impl AsRef<[u8]> for FundedBytes {
    fn as_ref(&self) -> &[u8] {
        &self.bytes
    }
}

struct ExactSink<'a> {
    bytes: &'a mut Vec<u8>,
    limit: usize,
}

impl Write for ExactSink<'_> {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        if bytes.len() > self.limit - self.bytes.len() {
            return Err(io::Error::other(
                "public payload outgrew its admitted encoding",
            ));
        }
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

/// Size and encode only the selected payload. Header and body bytes from a
/// selected SSE frame use one allocation. The transport retains its owner
/// independently of the decoded previous-view state and disclosure lease.
pub fn encode(
    value: &(impl Serialize + ?Sized),
    prefix: &[u8],
    suffix: &[u8],
    budget: &ByteBudget,
) -> Result<Bytes, WireError> {
    let length = json_record_len(value).map_err(WireError::Encoding)?;
    let limit = prefix
        .len()
        .checked_add(length)
        .ok_or(WireError::Capacity)?;
    let total = limit.checked_add(suffix.len()).ok_or(WireError::Capacity)?;
    const OWNER_BYTES: usize =
        std::mem::size_of::<FundedBytes>() + 4 * std::mem::size_of::<usize>();
    let storage = total.checked_add(OWNER_BYTES).ok_or(WireError::Capacity)?;
    let custody = budget.reserve(storage).map_err(|_| WireError::Capacity)?;
    let mut bytes = Vec::new();
    bytes
        .try_reserve_exact(total)
        .map_err(|_| WireError::Capacity)?;
    bytes.extend_from_slice(prefix);
    write_json_record(
        value,
        ExactSink {
            bytes: &mut bytes,
            limit,
        },
    )
    .map_err(WireError::Encoding)?;
    if bytes.len() != limit {
        return Err(WireError::Capacity);
    }
    bytes.extend_from_slice(suffix);
    Ok(Bytes::from_owner(FundedBytes {
        bytes,
        _custody: custody,
    }))
}
