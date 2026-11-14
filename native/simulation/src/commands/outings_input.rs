//! One immutable family-specific input body, separate from the shared command
//! identity. The installed world owns its grammar and executable admission.
use super::{CommandEncoding, CommandHeaders, NativeCommand};
use crate::host::retained_size::HeapBytes;
use crate::records::SqlCell;

#[derive(Debug, PartialEq)]
pub(crate) struct OutingParameters {
    value: SqlCell,
}
impl OutingParameters {
    pub(crate) fn value(&self) -> &SqlCell {
        &self.value
    }
}
impl Clone for OutingParameters {
    fn clone(&self) -> Self {
        Self {
            value: self.value.clone_within_heap_bound(),
        }
    }
}
impl HeapBytes for OutingParameters {
    fn heap_bytes(&self) -> Option<usize> {
        self.value.heap_bytes()
    }
}

pub(super) fn decode(source: &str) -> Result<NativeCommand, serde_json::Error> {
    let headers: CommandHeaders = serde_json::from_str(source)?;
    if !headers.valid() {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid selected native command binding.",
        )));
    }
    let cell: SqlCell = serde_json::from_str(source)?;
    if cell.as_object().is_none() {
        return Err(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "A native command requires named fields.",
        )));
    }
    // The recording and typed body share this one decode. Capture property
    // order before moving common headers out of the family-specific body.
    let encoding = CommandEncoding::from_cell(&cell)?;
    let SqlCell::Object(mut fields) = cell else {
        unreachable!("Command object was checked before consuming it");
    };
    for field in [
        "type",
        "id",
        "actorId",
        "purpose",
        "humanInitiated",
        "cooperation",
        "combatHelpId",
        "chosenPurpose",
    ] {
        fields.shift_remove(field);
    }
    Ok(NativeCommand::Outing {
        envelope: headers.envelope(encoding),
        parameters: OutingParameters {
            value: SqlCell::Object(fields),
        },
    })
}
