//! A name's stored evidence comes from the actual admitted awareness account,
//! which can have a different wrapper/receipt from the native delivery cue.

use crate::execution::ExecutionError;
use crate::experience::{PersonalSourceKind, PersonalSourceRecord, encoded_body_bound};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::TemporalReceiptLocator;
use crate::reception::ObservationContribution;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct NameSupportFields {
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    observation: Option<Arc<ObservationContribution>>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    source_receipt: Option<TemporalReceiptLocator>,
}
pub(crate) struct StoredNameSupport {
    pub(super) observation: Option<Arc<ObservationContribution>>,
    pub(super) source_receipt: Option<TemporalReceiptLocator>,
    _reservation: ByteReservation,
}
impl StoredNameSupport {
    pub(crate) fn capture(
        record: &PersonalSourceRecord,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if record.header().reference.kind != PersonalSourceKind::Awareness {
            return Err(ExecutionError::Invariant);
        }
        let bytes = encoded_body_bound(record.payload()).map_err(|_| ExecutionError::Invariant)?;
        let reservation = budget.reserve(bytes)?;
        let fields: NameSupportFields =
            serde_json::from_str(record.payload()).map_err(|_| ExecutionError::Invariant)?;
        Ok(Self {
            observation: fields.observation,
            source_receipt: fields.source_receipt,
            _reservation: reservation,
        })
    }
}
