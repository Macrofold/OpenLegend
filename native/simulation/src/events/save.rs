//! The hot SQL table stores real original IDs only. Complete original bodies
//! remain in the same cut's history projection, never in a second event writer.

use super::OccurrenceHistory;
use crate::host::ByteBudget;
use crate::records::{OwnerCoverage, RecordEncodingError, RecordPlacement, RowEffects, RowEncoder};
use serde::Serialize;

#[derive(Serialize)]
struct Pointer<'a> {
    id: &'a str,
}
fn error() -> RecordEncodingError {
    RecordEncodingError("Occurrence save requires its actual placement and byte allowance.")
}
pub(crate) fn encode_occurrence_changes(
    history: &OccurrenceHistory,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if history.appended().next().is_none() {
        return Ok(());
    }
    let _owner = budget
        .reserve("world_hot_events".len() + "[\"world\"]".len())
        .map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: "world_hot_events".to_owned(),
        owner: "[\"world\"]".to_owned(),
        complete: history.complete_hot(),
        next_ordinal: history.next_hot_ordinal(),
        parent_present: true,
    })?;
    for placed in history.appended() {
        let _placement = budget
            .reserve(
                placed
                    .row_id()
                    .len()
                    .checked_add(placed.parent().len())
                    .and_then(|bytes| bytes.checked_add(placed.slot().len()))
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let placement = RecordPlacement {
            id: placed.row_id().to_owned(),
            parent: placed.parent().to_owned(),
            slot: placed.slot().to_owned(),
            position: placed.position(),
        };
        output.write(
            "world_hot_events",
            &placement,
            &Pointer {
                id: &placed.event().event().id,
            },
            &[],
            true,
            RowEffects::default(),
        )?;
    }
    Ok(())
}
