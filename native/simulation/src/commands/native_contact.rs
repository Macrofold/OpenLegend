use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, CandidateKey};

/// The autonomous controller uses the same action admission and replacement
/// as other native commands. There is no browser receipt for this intention.
pub(crate) fn begin_native_contact(
    core: &mut CoreMutation<'_>,
    source: &str,
    target: crate::state::EntityHandle,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Input<'a> {
        id: &'a str,
        actor_id: &'a str,
        #[serde(rename = "type")]
        kind: &'static str,
        target_id: &'a str,
        definition_id: &'a str,
    }
    let entities = &core.state.physical.entities;
    let threat = entities
        .get(source)
        .and_then(|entity| entity.threat.as_ref())
        .ok_or(ExecutionError::Invariant)?;
    let target = entities.resolve(target).ok_or(ExecutionError::Invariant)?;
    let definition_id = threat.strike_definition();
    let _scratch =
        budget.reserve((source.len() + target.id.len() + definition_id.len() + 64) * 12)?;
    let id = format!("native-contact-{}", core.state.physical.identity.next_id());
    let encoded = crate::encoding::json_record(&Input {
        id: &id,
        actor_id: source,
        kind: "strike",
        target_id: &target.id,
        definition_id,
    })
    .map_err(|_| ExecutionError::Invariant)?;
    let command = serde_json::from_str(&encoded).map_err(|_| ExecutionError::Invariant)?;
    let binding = GeometryBinding::new(
        candidate,
        core.state.installed.geometry.spatial.revision,
        core.journal.next_provider_serial()?,
    );
    let cursor = CommandCursor::new(
        command,
        encoded,
        CommandOptions {
            preview: false,
            native_controller: true,
            native_movement: None,
            durable_receipt: false,
        },
        binding,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}
