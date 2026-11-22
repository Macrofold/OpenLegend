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

/// Exact player intent after the ordinary reference resolver. Invitation
/// targets are real current actor/object IDs, never browser reference tokens.
#[derive(Clone, Copy)]
pub enum PlayerTravelIntent<'a> {
    Invite {
        recipient: &'a str,
        destination: PlayerTravelDestination<'a>,
        purpose: Option<&'a crate::text::JsText>,
        mode: crate::plans::PlanMode,
    },
    Remedy {
        operation: crate::worlds::base_outings::TravelOperation,
        invitation: &'a str,
        revision: u64,
        mode: Option<crate::plans::PlanMode>,
    },
}

#[derive(Clone, Copy)]
pub enum PlayerTravelDestination<'a> {
    Stationary(&'a str),
    Point(&'a crate::state::SurfacePoint),
}

impl PlayerTravelIntent<'_> {
    pub(super) fn text_bytes(self) -> usize {
        match self {
            Self::Invite {
                recipient,
                destination,
                purpose,
                ..
            } => {
                recipient.len()
                    + match destination {
                        PlayerTravelDestination::Stationary(id) => id.len(),
                        PlayerTravelDestination::Point(point) => point.surface_id.len(),
                    }
                    + purpose.map_or(0, crate::text::JsText::storage_bytes)
            }
            Self::Remedy { invitation, .. } => invitation.len(),
        }
    }

    pub(super) fn bind(
        self,
        id: &str,
        actor: &str,
    ) -> Result<(NativeCommand, String), serde_json::Error> {
        use crate::records::SqlCell;
        use crate::text::JsText;
        use crate::worlds::base_outings::TravelOperation;
        use indexmap::IndexMap;

        let mut fields = IndexMap::with_capacity(12);
        let text = |input: &str| SqlCell::Text(input.into());
        fields.insert("actorId".into(), text(actor));
        if let Self::Invite { destination, .. } = self {
            match destination {
                PlayerTravelDestination::Stationary(destination) => {
                    fields.insert("destinationId".into(), text(destination))
                }
                PlayerTravelDestination::Point(point) => {
                    let finite = |value: f64| {
                        serde_json::Number::from_f64(value)
                            .map(SqlCell::Number)
                            .ok_or_else(|| {
                                serde::de::Error::custom("Non-finite travel destination.")
                            })
                    };
                    let value = IndexMap::from([
                        ("surfaceId".into(), text(&point.surface_id)),
                        ("x".into(), finite(point.x)?),
                        ("y".into(), finite(point.y)?),
                        ("z".into(), finite(point.z)?),
                    ]);
                    fields.insert("destination".into(), SqlCell::Object(value))
                }
            };
        }
        if let Self::Remedy { revision, .. } = self {
            fields.insert("expectedRevision".into(), SqlCell::Number(revision.into()));
        }
        fields.insert("humanInitiated".into(), SqlCell::Bool(true));
        fields.insert("id".into(), text(id));
        let (mode, operation, invitation) = match self {
            Self::Invite { mode, .. } => (Some(mode), TravelOperation::Invite, None),
            Self::Remedy {
                operation,
                invitation,
                mode,
                ..
            } => (mode, operation, Some(invitation)),
        };
        if let Some(mode) = mode {
            fields.insert(
                "mode".into(),
                text(crate::outings::travel::mode_label(mode)),
            );
        }
        fields.insert("operation".into(), text(operation.as_str()));
        if let Some(invitation) = invitation {
            fields.insert("outingId".into(), text(invitation));
        }
        if let Self::Invite {
            recipient, purpose, ..
        } = self
        {
            if let Some(purpose) = purpose {
                fields.insert("purpose".into(), SqlCell::Text(JsText::clone(purpose)));
            }
            fields.insert("recipientId".into(), text(recipient));
        }
        fields.insert(
            "type".into(),
            text(crate::worlds::base_outings::travel_command_type()),
        );
        let encoding = crate::encoding::json_record(&SqlCell::Object(fields))?;
        Ok((decode(&encoding)?, encoding))
    }
}
