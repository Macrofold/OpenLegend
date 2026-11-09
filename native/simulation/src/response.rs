//! Supplied decisions use the same semantic command, knowledge and memory
//! owners as ordinary gameplay. Only a completed cursor can append a receipt;
//! replay storage is not an alternate command or writable-world interface.

use crate::commands::Outcome;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

mod state;
pub(crate) use state::{ResponseCheckpoint, ResponseJournal, ResponseState};
mod envelope;
mod save;
pub(crate) use envelope::{ActorResponse, ResponseKind, ResponseOperation};
mod digest;
pub(crate) use digest::{ResponseDigestAnswer, ResponseDigestRequest};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ResponseLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub operations: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub receipts: u64,
}
impl ResponseLimits {
    pub(crate) fn valid(&self) -> bool {
        self.operations > 0 && self.bytes > 0 && self.receipts > 0
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ResponseReceipt {
    pub digest: String,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub components: IndexMap<String, Outcome>,
    pub outcome: Outcome,
}
impl HeapBytes for ResponseReceipt {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.digest.heap_bytes()?,
            self.components.heap_bytes()?,
            self.outcome.heap_bytes()?,
        ])
    }
}
