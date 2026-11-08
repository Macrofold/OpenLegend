//! Actual pooled values inserted by the sole received-value owner. Unordered
//! pooled rows use the existing schema's position zero, never a new allocator.

use super::ReceivedValues;
use crate::encoding::json_record;
use crate::host::ByteBudget;
use crate::records::{
    OwnerCoverage, RecordEncodingError, RecordLedger, RecordPlacement, RowEffects, RowEncoder,
};
use serde_json::Value;

fn error() -> RecordEncodingError {
    RecordEncodingError("Received value save requires exact current ownership and byte allowance.")
}
pub(crate) fn encode_received_value_changes(
    values: &ReceivedValues,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    const ROOT: &str = "[\"world\",\"receivedValues\"]";
    if values.inserted_records().next().is_none() {
        return Ok(());
    }
    if ledger
        .placement("mind_perception_value_state", ROOT)
        .is_none()
    {
        if ledger.presence("mind_perception_value_state", ROOT, "[\"world\"]") != Some(false) {
            return Err(error());
        }
        let _temporary = budget.reserve(128).map_err(|_| error())?;
        let placement = RecordPlacement {
            id: ROOT.to_owned(),
            parent: "[\"world\"]".to_owned(),
            slot: "receivedValues".to_owned(),
            position: 0,
        };
        output.write_encoded(
            "mind_perception_value_state",
            &placement,
            "{\"sources\":{}}",
            &[],
            false,
            RowEffects::default(),
        )?;
        output.observe_owner(&OwnerCoverage {
            table: "mind_perception_value_state".to_owned(),
            owner: "[\"world\"]".to_owned(),
            complete: true,
            next_ordinal: 1,
            parent_present: true,
        })?;
    }
    let _owner = budget
        .reserve(ROOT.len() + "mind_perception_values".len())
        .map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: "mind_perception_values".to_owned(),
        owner: ROOT.to_owned(),
        complete: true,
        next_ordinal: 1,
        parent_present: true,
    })?;
    for record in values.inserted_records() {
        let _temporary = budget
            .reserve(
                record
                    .id
                    .len()
                    .checked_mul(8)
                    .and_then(|bytes| bytes.checked_add(256))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let placement = RecordPlacement {
            id: json_record(&["world", "receivedValues", "sources", &record.id])
                .map_err(|_| error())?,
            parent: ROOT.to_owned(),
            slot: record.id.clone(),
            position: 0,
        };
        let columns = [
            Value::from(record.id.clone()),
            Value::from(record.at),
            Value::Null,
        ]
        .map(Into::into);
        output.write(
            "mind_perception_values",
            &placement,
            record.as_ref(),
            &columns,
            // The Source pooled dictionary is partial after creation; ordinary
            // changed saves use its upsert, independently of native custody.
            false,
            RowEffects::default(),
        )?;
    }
    Ok(())
}
