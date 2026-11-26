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
    prepare_contact(core, source, target, false, candidate, budget)
}

pub(crate) fn begin_native_hunt_contact(
    core: &mut CoreMutation<'_>,
    source: &str,
    target: crate::state::EntityHandle,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    prepare_contact(core, source, target, true, candidate, budget)
}

fn prepare_contact(
    core: &mut CoreMutation<'_>,
    source: &str,
    target: crate::state::EntityHandle,
    hunt: bool,
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
    let target = entities.resolve(target).ok_or(ExecutionError::Invariant)?;
    let actor = entities.get(source).ok_or(ExecutionError::MissingActor)?;
    let definition_id = if hunt {
        let state = actor.animal.as_ref().and_then(|animal| animal.foraging.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        state.work.as_ref().filter(|work| {
            work.kind == crate::native_response::ForagingWorkKind::Hunt
                && work.target_id.as_deref() == Some(target.id.as_str())
                && work.target_life == target.physical_life()
        }).ok_or(ExecutionError::Invariant)?;
        &core.state.installed.retained.foraging.profiles.get(&state.profile.id)
            .and_then(|profile| profile.profile.hunt.as_ref()).ok_or(ExecutionError::UnsupportedFamily)?.strike_id
    } else {
        actor.threat.as_ref().ok_or(ExecutionError::Invariant)?.strike_definition()
    };
    let _scratch =
        budget.reserve((source.len() + target.id.len() + definition_id.len() + 64) * 12)?;
    let family = if hunt { "native-forage" } else { "native-contact" };
    let id = format!("{family}-{}", core.state.physical.identity.next_id());
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
        core.state.geometry_revision(),
        core.journal.next_provider_serial()?,
    );
    let cursor = CommandCursor::new(
        command,
        encoded,
        CommandOptions {
            preview: false,
            native_controller: true,
            native_movement: None,
            trade_evidence: None,
            durable_receipt: false,
        },
        binding,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}
