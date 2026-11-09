//! A native route enters the same command checkpoint, permissions, action,
//! conditions and finalization as an ordinary movement intention. It carries
//! its prepared route, never a writable actor or a second movement owner.
use super::*;
use crate::encoding::{json_record, json_record_len};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, CandidateKey};
use crate::native_refuge::RefugeRoute;
use crate::native_response::{LocomotionMode, NativeLocomotion};
use std::mem::size_of;

impl HeapBytes for NativeMovementInput {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.binding.profile.heap_bytes()?,
            self.binding.locomotion.heap_bytes()?,
            self.binding.episode_id.heap_bytes()?,
            self.route.candidate.id.heap_bytes()?,
            self.route.candidate.point.heap_bytes()?,
            self.route.path.heap_bytes()?,
        ])
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MovementInput<'a> {
    id: &'a str,
    actor_id: &'a str,
    #[serde(rename = "type")]
    kind: &'static str,
    destination: &'a SurfacePoint,
}
pub(crate) fn begin_native_movement(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    route: RefugeRoute,
    mode: LocomotionMode,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    let entity = core
        .state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingActor)?;
    let animal = entity
        .animal
        .as_ref()
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let episode = animal.episode.as_ref();
    let (pin, locomotion, episode_binding) = match mode {
        LocomotionMode::Travel => (&animal.profile, animal.locomotion.as_str(), None),
        LocomotionMode::Escape => {
            let episode = episode.ok_or(ExecutionError::Invariant)?;
            (
                &episode.profile_pin,
                episode.locomotion.as_str(),
                Some((&episode.id, episode.proposal_generation)),
            )
        }
    };
    let binding_bytes = heap_sum([
        pin.heap_bytes().ok_or(ExecutionError::Capacity)?,
        locomotion.len(),
        episode.map_or(0, |episode| episode.id.len()),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let bytes = heap_sum([
        actor_id.len(),
        route.candidate.point.surface_id.len(),
        64,
        binding_bytes,
    ])
    .and_then(|bytes| bytes.checked_mul(12))
    .and_then(|bytes| bytes.checked_add(size_of::<NativeCommand>()))
    .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let id = format!("native-move-{}", core.state.physical.identity.next_id());
    let movement = MovementInput {
        id: &id,
        actor_id,
        kind: "move",
        destination: &route.candidate.point,
    };
    let encoded_bytes = json_record_len(&movement).map_err(|_| ExecutionError::Invariant)?;
    let _encoding = budget.reserve(
        encoded_bytes
            .checked_mul(8)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let encoded = json_record(&movement).map_err(|_| ExecutionError::Invariant)?;
    let command = NativeCommand::Move {
        envelope: CommandEnvelope {
            encoding: CommandEncoding::decode(&encoded).map_err(|_| ExecutionError::Invariant)?,
            id,
            actor_id: actor_id.into(),
            cooperation: None,
            combat_help_id: None,
            human_initiated: None,
            purpose: None,
            chosen_purpose: None,
        },
        destination: route.candidate.point.clone(),
    };
    let binding = NativeLocomotion {
        profile: pin.clone(),
        locomotion: locomotion.into(),
        mode,
        episode_id: episode_binding.map(|(id, _)| id.clone()),
        generation: episode_binding.map(|(_, generation)| generation),
    };
    let geometry = GeometryBinding::new(
        candidate,
        core.state.installed.geometry.spatial.revision,
        core.journal.next_provider_serial()?,
    );
    // Native controller commands have no idempotency receipt. Their original
    // JSON bytes supply the same input-byte charge as Source's internal command.
    let cursor = CommandCursor::new(
        command,
        encoded,
        CommandOptions {
            native_controller: true,
            native_movement: Some(NativeMovementInput { binding, route }),
        },
        geometry,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}
