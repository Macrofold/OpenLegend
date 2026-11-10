//! Finite Source captions use the installed world's wording. Native owns the
//! selected attempts, structural candidates, canonical templates and effects.
use super::*;
use crate::execution::ExecutionError;
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::text::JsText;
use serde_json::value::RawValue;
use std::mem::size_of;

#[derive(Serialize)]
struct Profile {
    id: String,
    version: u64,
}
#[derive(Serialize)]
pub(crate) struct LearningFormatRequest {
    pub binding: GeometryBinding,
    profile: Profile,
    input: Box<RawValue>,
    #[serde(skip)]
    expected: usize,
    #[serde(skip)]
    storage: ByteReservation,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct LearningFormatAnswer {
    pub binding: GeometryBinding,
    pub texts: Vec<Option<JsText>>,
    #[serde(skip)]
    storage: Option<ByteReservation>,
}
impl LearningFormatAnswer {
    pub(crate) fn decode(
        text: &str,
        budget: &ByteBudget,
    ) -> Result<Self, crate::simulation::DriveError> {
        use crate::simulation::DriveError;
        let storage = crate::install::reserve_typed_parse::<Self>(
            text,
            size_of::<Option<JsText>>(),
            None,
            budget,
        )
        .map_err(|e| match e {
            crate::install::InstallError::Capacity => DriveError::Capacity,
            _ => DriveError::MalformedResponse,
        })?;
        let mut answer: Self =
            serde_json::from_str(text).map_err(|_| DriveError::MalformedResponse)?;
        answer.storage = Some(storage);
        Ok(answer)
    }
}
pub(super) struct LearningTexts {
    pub texts: Vec<Option<JsText>>,
    pub storage: ByteReservation,
}
impl LearningFormatRequest {
    pub fn validate(&self, answer: &LearningFormatAnswer) -> Result<(), ExecutionError> {
        if answer.binding != self.binding || answer.texts.len() != self.expected {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        Ok(())
    }
    pub fn new(
        binding: GeometryBinding,
        profile: (&str, u64),
        input: &impl Serialize,
        expected: usize,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let len = crate::encoding::json_record_len(input).map_err(|_| ExecutionError::Invariant)?;
        let storage = budget.reserve(
            len.checked_mul(2)
                .and_then(|n| n.checked_add(profile.0.len() + size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let input = RawValue::from_string(
            crate::encoding::json_record(input).map_err(|_| ExecutionError::Invariant)?,
        )
        .map_err(|_| ExecutionError::Invariant)?;
        Ok(Self {
            binding,
            profile: Profile {
                id: profile.0.to_owned(),
                version: profile.1,
            },
            input,
            expected,
            storage,
        })
    }
    pub fn finish(self, mut answer: LearningFormatAnswer) -> Result<LearningTexts, ExecutionError> {
        self.validate(&answer)?;
        let _ = self.storage;
        Ok(LearningTexts {
            texts: answer.texts,
            storage: answer.storage.take().ok_or(ExecutionError::Invariant)?,
        })
    }
}
#[derive(Serialize)]
pub(super) struct NameRead<'a> {
    command: NameCommand<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    effect: Option<Effect<'a>>,
}
#[derive(Serialize)]
struct NameCommand<'a> {
    #[serde(rename = "type")]
    kind: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    operation: Option<&'static str>,
}
#[derive(Serialize)]
struct Effect<'a> {
    label: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    activate: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    deactivate: Option<&'a str>,
}
pub(super) fn name_read<'a>(
    entry: &'a ActivityOccurrence,
    state: &'a crate::simulation::SimulationState,
) -> Option<NameRead<'a>> {
    use crate::commands::{NativeCommand, StatusOperation};
    if !matches!(
        entry.command,
        NativeCommand::Move { .. }
            | NativeCommand::Say { .. }
            | NativeCommand::StatusEffect { .. }
            | NativeCommand::Follow { .. }
            | NativeCommand::Strike { .. }
    ) {
        return None;
    }
    let (operation, effect) = if let NativeCommand::StatusEffect {
        definition_id,
        operation,
        ..
    } = &entry.command
    {
        (
            Some(if *operation == StatusOperation::Activate {
                "activate"
            } else {
                "deactivate"
            }),
            state
                .installed
                .status_policy
                .definitions
                .iter()
                .find(|d| d.id == *definition_id)
                .map(|d| Effect {
                    label: &d.label,
                    activate: d.actions.as_ref().map(|a| a.activate.as_str()),
                    deactivate: d.actions.as_ref().map(|a| a.deactivate.as_str()),
                }),
        )
    } else {
        (None, None)
    };
    Some(NameRead {
        command: NameCommand {
            kind: entry.command.kind(),
            purpose: entry.command.envelope().purpose.as_ref(),
            operation,
        },
        effect,
    })
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct DescriptionRead<'a> {
    pub name: &'a JsText,
    pub entries: Vec<DescriptionEntry<'a>>,
    pub incomplete: bool,
    pub failures: Vec<&'a ActivityView>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct DescriptionEntry<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_name: Option<&'a JsText>,
    pub view: &'a ActivityView,
}
pub(super) fn manifest_shape(
    state: &crate::simulation::SimulationState,
    budget: &ByteBudget,
) -> Result<(SqlCell, ByteReservation), ExecutionError> {
    // One immutable installed manifest is projected once per batch. Replacing
    // complete definitions by their verified pins is the existing Source key.
    let raw = &state.installed.manifest.row.payload;
    let storage = budget.reserve(
        crate::experience::encoded_body_bound(raw)
            .map_err(|_| ExecutionError::Capacity)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut value: SqlCell = serde_json::from_str(raw).map_err(|_| ExecutionError::Invariant)?;
    let SqlCell::Object(object) = &mut value else {
        return Err(ExecutionError::Invariant);
    };
    object.shift_remove("revision");
    for (field, pin) in [
        ("definitions", "pins"),
        ("senses", "sensePins"),
        ("bodyPolicy", "bodyPolicyPin"),
        ("acoustics", "acousticsPin"),
        ("rangedPolicy", "rangedPolicyPin"),
    ] {
        let value = object.get(pin).ok_or(ExecutionError::Invariant)?.clone();
        object.insert(field.to_owned(), value);
    }
    Ok((value, storage))
}
