//! The one selected invocation binds through the existing command codec.
//! This constructs transport, not a second physical or permission executor.
use super::ActivityExecution;
use crate::commands::{CooperationBinding, NativeCommand, PurposeBinding};
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::simulation::InstalledWorld;
use crate::text::JsText;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BoundMove<'a> {
    id: &'a str,
    actor_id: &'a str,
    #[serde(rename = "type")]
    family: &'a str,
    purpose: &'a JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    chosen_purpose: Option<&'a PurposeBinding>,
    #[serde(skip_serializing_if = "Option::is_none")]
    human_initiated: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    combat_help_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cooperation: Option<&'a CooperationBinding>,
    destination: &'a SqlCell,
}

pub(crate) fn bind_single_invoke(
    execution: &ActivityExecution,
    actor: &str,
    id: &str,
    world: &InstalledWorld,
    budget: &ByteBudget,
) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
    let invocation = execution.single_invoke()?;
    if !world
        .ordinary_actions
        .value()
        .plan
        .supports_requested_movement(invocation.family)
        || invocation.args.len() != 1
        || execution.bindings.object_len() != Some(1)
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let argument = invocation
        .args
        .get("destination")
        .filter(|value| value.object_len() == Some(1))
        .and_then(|value| value.get("role"))
        .and_then(SqlCell::as_text)
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let destination = execution
        .bindings
        .get_text(argument)
        .filter(|value| value.object_len() == Some(4))
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let command = BoundMove {
        id,
        actor_id: actor,
        family: invocation.family,
        purpose: invocation.name,
        chosen_purpose: execution
            .request
            .as_ref()
            .and_then(|r| r.chosen_purpose.as_ref()),
        human_initiated: execution.human_initiated,
        combat_help_id: execution.combat_help_id.as_deref(),
        cooperation: execution.cooperation.as_ref(),
        destination,
    };
    // Source bindActivityCommand creates these exact fields in this order.
    // Decode only the new finite command, never the saved activity AST again.
    let bytes =
        crate::encoding::json_record_len(&command).map_err(|_| ExecutionError::Invariant)?;
    let mut storage = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let encoded = crate::encoding::json_record(&command).map_err(|_| ExecutionError::Invariant)?;
    let parsing = crate::experience::encoded_body_bound(&encoded)
        .map_err(|_| ExecutionError::Capacity)?
        .checked_add(
            encoded
                .len()
                .checked_mul(8)
                .ok_or(ExecutionError::Capacity)?,
        )
        .ok_or(ExecutionError::Capacity)?;
    storage.resize(
        storage
            .bytes()
            .checked_add(parsing)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let command: NativeCommand =
        serde_json::from_str(&encoded).map_err(|_| ExecutionError::UnsupportedFamily)?;
    if !matches!(command, NativeCommand::Move { .. }) {
        return Err(ExecutionError::UnsupportedFamily);
    }
    drop(encoded);
    storage.resize(
        crate::host::retained_size::HeapBytes::heap_bytes(&command)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok((command, storage))
}
