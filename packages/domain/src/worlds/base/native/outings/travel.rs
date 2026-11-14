//! The selected Base travel grammar and immutable Source-authored words.
//! Input borrows its already funded command body; this module grants no
//! participant, route, work or publication authority and opens no executor.
use super::{count, fields, id, point, text};
use crate::plans::PlanMode;
use crate::records::SqlCell;
use crate::text::JsText;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

/// The Source OutingCommand wire tag selects this compiled Base reader. The
/// operation reader and installed family still refuse unopened operations.
pub(crate) fn travel_command_type() -> &'static str {
    "outing"
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum TravelOperation {
    Invite,
    Accept,
    Decline,
    Leave,
}
impl TravelOperation {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::Invite => "invite",
            Self::Accept => "accept",
            Self::Decline => "decline",
            Self::Leave => "leave",
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum TravelParticipantCapability {
    Memory,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TravelCompanyLabels {
    pub visible: String,
    pub hidden: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TravelTemplates {
    pub purpose: String,
    pub accept_idle: String,
    pub accept_replace: String,
    pub decline: String,
    pub withdraw: String,
    pub context: String,
    pub travel_name: String,
    pub point_name: String,
    pub invited_proposer: String,
    pub invited_proposer_purpose: String,
    pub invited_recipient: String,
    pub invited_recipient_purpose: String,
    pub accepted: String,
    pub arrived: String,
    pub ended: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TravelMessages {
    pub person: String,
    pub nearby: String,
    pub terms: String,
    pub limit: String,
    pub pending: String,
    pub destination: String,
    pub busy: String,
    pub changed: String,
    pub route: String,
    pub unavailable: String,
    pub invited: String,
    pub accepted: String,
    pub declined: String,
    pub left: String,
    pub expired: String,
    pub interrupted: String,
    pub finished: String,
    pub company: String,
    pub separated: String,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TravelRules {
    pub family: String,
    pub kind: String,
    pub event_type: String,
    pub agreement_family: String,
    pub participant_capability: TravelParticipantCapability,
    pub operations: Vec<TravelOperation>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub max_purpose_characters: u64,
    pub label: String,
    pub leave_label: String,
    pub companion_prefix: String,
    pub agreement_description: String,
    pub description: String,
    pub company_labels: TravelCompanyLabels,
    pub templates: TravelTemplates,
    pub messages: TravelMessages,
}

/// Numeric spelling is deliberately not implemented here. The existing bound
/// Source display/canonical formatter supplies JS toFixed(1) strings for
/// point_name/context. Existing PlanRules::text/text_bound substitute only
/// authored markers once, preserving literal user JsText code units.
impl TravelRules {
    pub(crate) fn participant(&self, entity: &crate::state::Entity) -> bool {
        match self.participant_capability {
            TravelParticipantCapability::Memory => entity.has_memory(),
        }
    }

    /// Only syntax is consumed here. The selected family's preparation owns
    /// current participant/revision/work/placement/route and shared offer policy.
    /// Common headers stay in the command envelope. This world-specific syntax
    /// does not retrim purpose; common command admission retains its own checks.
    pub(crate) fn input<'a>(
        &self,
        payload: &'a SqlCell,
        purpose: Option<&'a JsText>,
    ) -> Result<TravelInput<'a>, TravelInputError> {
        if purpose.is_some_and(|value| value.units_len() as u64 > self.max_purpose_characters) {
            return Err(TravelInputError);
        }
        let operation = match text(payload, "operation").map_err(|_| TravelInputError)? {
            "invite" => TravelOperation::Invite,
            "accept" => TravelOperation::Accept,
            "decline" => TravelOperation::Decline,
            "leave" => TravelOperation::Leave,
            _ => return Err(TravelInputError),
        };
        if !self.operations.contains(&operation) {
            return Err(TravelInputError);
        }
        let mode = |value: &SqlCell| match value.as_str() {
            Some("enqueue") => Ok(PlanMode::Enqueue),
            Some("replace") => Ok(PlanMode::Replace),
            Some("interrupt") => Ok(PlanMode::Interrupt),
            _ => Err(TravelInputError),
        };
        if operation == TravelOperation::Invite {
            fields(
                payload,
                &["operation", "recipientId", "mode"],
                &["destinationId", "destination"],
            )
            .map_err(|_| TravelInputError)?;
            id(payload, "recipientId").map_err(|_| TravelInputError)?;
            let destination = match (payload.get("destinationId"), payload.get("destination")) {
                (Some(_), None) => {
                    id(payload, "destinationId").map_err(|_| TravelInputError)?;
                    TravelDestination::Entity(
                        text(payload, "destinationId").map_err(|_| TravelInputError)?,
                    )
                }
                (None, Some(value)) => {
                    // Source keeps valid point extras in the original command;
                    // the geometry owner later copies only its consumed fields.
                    point(value, true).map_err(|_| TravelInputError)?;
                    TravelDestination::Point(value)
                }
                _ => return Err(TravelInputError),
            };
            return Ok(TravelInput::Invite {
                recipient_id: text(payload, "recipientId").map_err(|_| TravelInputError)?,
                destination,
                mode: mode(payload.get("mode").ok_or(TravelInputError)?)?,
                purpose,
            });
        }
        fields(
            payload,
            &["operation", "outingId", "expectedRevision"],
            &["mode"],
        )
        .map_err(|_| TravelInputError)?;
        id(payload, "outingId").map_err(|_| TravelInputError)?;
        let outing_id = text(payload, "outingId").map_err(|_| TravelInputError)?;
        let expected_revision =
            count(payload, "expectedRevision", 0).map_err(|_| TravelInputError)?;
        let mode = payload.get("mode").map(mode).transpose()?;
        Ok(match operation {
            TravelOperation::Accept => TravelInput::Accept {
                outing_id,
                expected_revision,
                mode: mode.ok_or(TravelInputError)?,
            },
            TravelOperation::Decline => TravelInput::Decline {
                outing_id,
                expected_revision,
                mode,
            },
            TravelOperation::Leave => TravelInput::Leave {
                outing_id,
                expected_revision,
                mode,
            },
            TravelOperation::Invite => unreachable!(),
        })
    }
}
#[derive(Debug)]
pub(crate) enum TravelDestination<'a> {
    Entity(&'a str),
    Point(&'a SqlCell),
}
#[derive(Debug)]
pub(crate) enum TravelInput<'a> {
    Invite {
        recipient_id: &'a str,
        destination: TravelDestination<'a>,
        mode: PlanMode,
        purpose: Option<&'a JsText>,
    },
    Accept {
        outing_id: &'a str,
        expected_revision: u64,
        mode: PlanMode,
    },
    Decline {
        outing_id: &'a str,
        expected_revision: u64,
        mode: Option<PlanMode>,
    },
    Leave {
        outing_id: &'a str,
        expected_revision: u64,
        mode: Option<PlanMode>,
    },
}
#[derive(Clone, Copy, Debug)]
pub(crate) struct TravelInputError;
