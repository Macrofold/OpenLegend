//! Exact shield and facing for current-format commands and activity records.
use super::{CommandEncoding, CommandHeaders, NativeCommand, RuntimeGuardFacing};
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::values::{
    deserialize_present_option, deserialize_present_safe_integer, is_safe_record_id,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum GuardFacing {
    Subject { id: String, life: u64 },
    Direction(f64),
}

impl crate::host::retained_size::HeapBytes for GuardFacing {
    fn heap_bytes(&self) -> Option<usize> {
        Some(match self {
            Self::Subject { id, .. } => id.capacity(),
            Self::Direction(_) => 0,
        })
    }
}

impl GuardFacing {
    pub(crate) fn subject_id(&self) -> Option<&str> {
        match self {
            Self::Subject { id, .. } => Some(id),
            Self::Direction(_) => None,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Stored {
    #[serde(rename = "type")]
    _kind: String,
    #[serde(flatten)]
    headers: CommandHeaders,
    item_id: String,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    target_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_safe_integer")]
    target_life: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    facing: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    auto_equip: Option<bool>,
}

pub(super) fn decode(raw: &str) -> Result<NativeCommand, serde_json::Error> {
    let input: Stored = serde_json::from_str(raw)?;
    let invalid = || serde::de::Error::custom("Invalid selected guard binding.");
    if !input.headers.valid() || !is_safe_record_id(&input.item_id) {
        return Err(invalid());
    }
    let facing = match (input.target_id, input.target_life, input.facing) {
        (Some(id), Some(life), None) if is_safe_record_id(&id) => GuardFacing::Subject { id, life },
        (None, None, Some(direction)) if direction.is_finite() => GuardFacing::Direction(direction),
        _ => return Err(invalid()),
    };
    Ok(NativeCommand::Guard {
        envelope: input.headers.envelope(CommandEncoding::decode(raw)?),
        item_id: input.item_id,
        facing,
        auto_equip: input.auto_equip.unwrap_or(false),
    })
}

pub(super) fn bind(
    headers: CommandHeaders,
    item_id: &str,
    facing: RuntimeGuardFacing<'_>,
    auto_equip: bool,
) -> Result<(NativeCommand, String), serde_json::Error> {
    let command = bind_exact(headers, item_id, facing, auto_equip)?;
    let canonical = command.source_encoding().to_owned();
    Ok((command, canonical))
}

/// Fund one typed resident choice. Only the canonical activity/receipt
/// representation is encoded; the held command is never decoded to apply it.
pub(crate) fn bind_npc(
    id: &str,
    actor_id: &str,
    item_id: &str,
    target_id: &str,
    target_life: u64,
    budget: &ByteBudget,
) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
    let mut storage = budget.reserve(
        heap_sum([id.len(), actor_id.len(), item_id.len(), target_id.len()])
            .and_then(|bytes| bytes.checked_mul(32)?.checked_add(1024))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let command = bind_exact(
        CommandHeaders {
            id: id.to_owned(),
            actor_id: actor_id.to_owned(),
            cooperation: None,
            combat_help_id: None,
            human_initiated: None,
            purpose: None,
            chosen_purpose: None,
        },
        item_id,
        RuntimeGuardFacing::Subject {
            id: target_id,
            life: target_life,
        },
        true,
    )
    .map_err(|_| ExecutionError::Invariant)?;
    storage.resize(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok((command, storage))
}

fn bind_exact(
    headers: CommandHeaders,
    item_id: &str,
    facing: RuntimeGuardFacing<'_>,
    auto_equip: bool,
) -> Result<NativeCommand, serde_json::Error> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Binding<'a> {
        actor_id: &'a str,
        #[serde(skip_serializing_if = "std::ops::Not::not")]
        auto_equip: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        facing: Option<f64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        human_initiated: Option<bool>,
        id: &'a str,
        item_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        target_life: Option<u64>,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let invalid = || serde::ser::Error::custom("Invalid selected guard binding.");
    if !headers.valid() || !is_safe_record_id(item_id) {
        return Err(invalid());
    }
    let (target_id, target_life, heading, bound) = match facing {
        RuntimeGuardFacing::Subject { id, life }
            if is_safe_record_id(id) && life <= crate::identity::MAX_SAFE_INTEGER =>
        {
            (
                Some(id),
                Some(life),
                None,
                GuardFacing::Subject {
                    id: id.into(),
                    life,
                },
            )
        }
        RuntimeGuardFacing::Direction(heading) if heading.is_finite() => {
            (None, None, Some(heading), GuardFacing::Direction(heading))
        }
        _ => return Err(invalid()),
    };
    let input = Binding {
        actor_id: &headers.actor_id,
        auto_equip,
        facing: heading,
        human_initiated: headers.human_initiated,
        id: &headers.id,
        item_id,
        target_id,
        target_life,
        kind: "guard",
    };
    let encoding = CommandEncoding::from_ordered(
        &input,
        4 + usize::from(headers.human_initiated.is_some())
            + usize::from(auto_equip)
            + if target_id.is_some() { 2 } else { 1 },
    )?;
    Ok(NativeCommand::Guard {
        envelope: headers.envelope(encoding),
        item_id: item_id.into(),
        facing: bound,
        auto_equip,
    })
}
