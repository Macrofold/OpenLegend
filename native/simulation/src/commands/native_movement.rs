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
use crate::state::SurfacePoint;
use std::mem::size_of;

impl HeapBytes for NativeMovementInput {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.binding.profile.heap_bytes()?,
            self.binding.locomotion.heap_bytes()?,
            self.binding.episode_id.heap_bytes()?,
            match self.route.as_ref() {
                Some(route) => heap_sum([
                    route.candidate.id.heap_bytes()?,
                    route.candidate.point.heap_bytes()?,
                    route.path.heap_bytes()?,
                ])?,
                None => 0,
            },
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
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StopInput<'a> {
    id: &'a str,
    actor_id: &'a str,
    #[serde(rename = "type")]
    kind: &'static str,
}

pub(crate) fn begin_native_feed(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    target_id: &str,
    item_id: Option<&str>,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct FeedInput<'a> {
        id: &'a str,
        actor_id: &'a str,
        target_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        item_id: Option<&'a str>,
        #[serde(rename = "type")]
        kind: &'static str,
    }
    let _scratch = budget
        .reserve((actor_id.len() + target_id.len() + item_id.map_or(0, str::len) + 64) * 12
            + size_of::<NativeCommand>())?;
    let id = format!("native-forage-{}", core.state.physical.identity.next_id());
    let encoded = json_record(&FeedInput {
        id: &id,
        actor_id,
        target_id,
        item_id,
        kind: "feed",
    })
    .map_err(|_| ExecutionError::Invariant)?;
    let command = serde_json::from_str(&encoded).map_err(|_| ExecutionError::Invariant)?;
    let geometry = GeometryBinding::new(
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
        geometry,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}

pub(crate) fn begin_native_stop(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    let _scratch = budget.reserve((actor_id.len() + 64) * 12 + size_of::<NativeCommand>())?;
    let id = format!("native-stop-{}", core.state.physical.identity.next_id());
    let input = StopInput {
        id: &id,
        actor_id,
        kind: "cancel",
    };
    let bytes = json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
    let _encoded = budget.reserve(bytes.checked_mul(8).ok_or(ExecutionError::Capacity)?)?;
    let encoded = json_record(&input).map_err(|_| ExecutionError::Invariant)?;
    let command = NativeCommand::Cancel {
        expected_action_id: None,
        dismiss_review: false,
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
    };
    let geometry = GeometryBinding::new(
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
        geometry,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}
pub(crate) fn begin_native_movement(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    route: RefugeRoute,
    mode: LocomotionMode,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    begin_native_ground(core, actor_id, Some(route), None, None, mode, candidate, budget)
}

pub(crate) fn begin_native_foraging_move(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    destination: &SurfacePoint,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    begin_native_ground(
        core,
        actor_id,
        None,
        Some(destination),
        None,
        LocomotionMode::Travel,
        candidate,
        budget,
    )
}

pub(crate) fn begin_native_hunt_move(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    destination: &SurfacePoint,
    plan: Option<crate::geometry::GuardedRoutePlan>,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    begin_native_ground(core, actor_id, None, Some(destination), plan, LocomotionMode::Travel, candidate, budget)
}

pub(crate) fn begin_territorial_move(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    destination: &SurfacePoint,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    // Territorial motion is ordinary Move work. Its installed movement
    // factor belongs to the world's speed calculation, not an escape profile.
    let _scratch = budget.reserve(
        heap_sum([actor_id.len(), destination.surface_id.len(), 80])
            .and_then(|n| n.checked_mul(12))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let id = format!(
        "native-territorial-{}",
        core.state.physical.identity.next_id()
    );
    let encoded = json_record(&MovementInput {
        id: &id,
        actor_id,
        kind: "move",
        destination,
    })
    .map_err(|_| ExecutionError::Invariant)?;
    let command = serde_json::from_str(&encoded).map_err(|_| ExecutionError::Invariant)?;
    let geometry = GeometryBinding::new(
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
        geometry,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}

fn begin_native_ground(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    route: Option<RefugeRoute>,
    proposed: Option<&SurfacePoint>,
    prepared: Option<crate::geometry::GuardedRoutePlan>,
    mode: LocomotionMode,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    let destination = route
        .as_ref()
        .map(|route| &route.candidate.point)
        .or(proposed)
        .ok_or(ExecutionError::Invariant)?;
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
        LocomotionMode::Travel => (&animal.profile, crate::native_controller::foraging::travel_locomotion(
            &core.state.installed, entity, core.state.physical.header.sim_time,
        ).unwrap_or(animal.locomotion.as_str()), None),
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
        destination.surface_id.len(),
        64,
        binding_bytes,
    ])
    .and_then(|bytes| bytes.checked_mul(12))
    .and_then(|bytes| bytes.checked_add(size_of::<NativeCommand>()))
    .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let name = if proposed.is_some() {
        "native-forage"
    } else {
        "native-move"
    };
    let id = format!("{name}-{}", core.state.physical.identity.next_id());
    let movement = MovementInput {
        id: &id,
        actor_id,
        kind: "move",
        destination,
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
        destination: destination.clone().into(),
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
            preview: false,
            native_controller: true,
            native_movement: Some(NativeMovementInput { binding, route, prepared }),
            durable_receipt: false,
        },
        geometry,
        budget,
    )?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
}
