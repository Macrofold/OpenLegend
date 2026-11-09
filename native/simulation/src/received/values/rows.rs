//! The same current SQL shared-value body/cells bind installation and selected
//! cold-page hydration. Loading a row grants no observer a receipt.
use super::*;
use crate::records::InstalledRow;
pub(crate) fn decode_received_value_row(
    row: &InstalledRow,
) -> Result<ReceivedValueRecord, ReceivedError> {
    let error = || ReceivedError("Invalid current received-value row binding.");
    let record: ReceivedValueRecord = serde_json::from_str(&row.payload).map_err(|_| error())?;
    let id = json_record(&["world", "receivedValues", "sources", record.id.as_str()])
        .map_err(|_| error())?;
    if row.id != id
        || row.parent != "[\"world\",\"receivedValues\"]"
        || row.slot != record.id
        || row.extra.len() != 3
        || !row.extra[0]
            .as_text()
            .is_some_and(|value| value == record.id.as_str())
        || row.extra[1].as_f64() != Some(record.at)
        || (!row.extra[2].is_null()
            && !row.extra[2]
                .as_u64()
                .is_some_and(|n| n <= crate::identity::MAX_SAFE_INTEGER))
    {
        return Err(error());
    }
    Ok(record)
}
