//! A native route enters the same command checkpoint, permissions, action,
//! conditions and finalization as an ordinary movement intention. It carries
//! its prepared route, never a writable actor or a second movement owner.
use super::*;
use crate::encoding::json_record_len;
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

/// Controller-generated fields and their Source encoding are prepared
/// together here. A caller cannot pair this action with other bytes.
pub(super) struct BoundNativeMovement(NativeCommand);

impl BoundNativeMovement {
    pub(super) fn into_command(self) -> NativeCommand {
        self.0
    }
}

fn controller_headers(id: String, actor_id: &str) -> Result<CommandHeaders, ExecutionError> {
    let headers = CommandHeaders {
        id,
        actor_id: actor_id.into(),
        cooperation: None,
        combat_help_id: None,
        human_initiated: None,
        purpose: None,
        chosen_purpose: None,
    };
    if !headers.valid() {
        return Err(ExecutionError::Invariant);
    }
    Ok(headers)
}

fn begin(
    core: &mut CoreMutation<'_>,
    command: BoundNativeMovement,
    movement: Option<NativeMovementInput>,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    let binding = GeometryBinding::new(
        candidate,
        core.state.installed.geometry.spatial.revision,
        core.journal.next_provider_serial()?,
    );
    let cursor = CommandCursor::from_native_movement(command, movement, binding, budget)?;
    CommandOperation::from_cursor(core, cursor, candidate, budget)
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
    let headers = controller_headers(id, actor_id)?;
    if !is_safe_record_id(target_id) || !item_id.is_none_or(is_safe_record_id) {
        return Err(ExecutionError::Invariant.into());
    }
    let encoding = CommandEncoding::from_ordered(
        &FeedInput {
            id: &headers.id,
            actor_id: &headers.actor_id,
            target_id,
            item_id,
            kind: "feed",
        },
        4 + usize::from(item_id.is_some()),
    )
    .map_err(|_| ExecutionError::Invariant)?;
    let command = BoundNativeMovement(NativeCommand::Feed {
        envelope: headers.envelope(encoding),
        target_id: target_id.into(),
        item_id: item_id.map(str::to_owned),
    });
    begin(core, command, None, candidate, budget)
}

pub(crate) fn begin_native_stop(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    candidate: CandidateKey,
    budget: &ByteBudget,
) -> Result<CommandOperation, CommandOperationError> {
    let _scratch = budget.reserve((actor_id.len() + 64) * 12 + size_of::<NativeCommand>())?;
    let id = format!("native-stop-{}", core.state.physical.identity.next_id());
    let headers = controller_headers(id, actor_id)?;
    let input = StopInput {
        id: &headers.id,
        actor_id: &headers.actor_id,
        kind: "cancel",
    };
    let bytes = json_record_len(&input).map_err(|_| ExecutionError::Invariant)?;
    let _encoded = budget.reserve(bytes.checked_mul(8).ok_or(ExecutionError::Capacity)?)?;
    let encoding = CommandEncoding::from_ordered(&input, 3).map_err(|_| ExecutionError::Invariant)?;
    let command = BoundNativeMovement(NativeCommand::Cancel {
        expected_action_id: None,
        dismiss_review: false,
        envelope: headers.envelope(encoding),
    });
    begin(core, command, None, candidate, budget)
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
    // This branch used to acquire its position from Source JSON, where
    // either signed zero is represented as zero. Keep that physical input.
    let destination = SurfacePoint {
        x: destination.x + 0.0,
        y: destination.y + 0.0,
        z: destination.z + 0.0,
        surface_id: destination.surface_id.clone(),
    };
    let headers = controller_headers(id, actor_id)?;
    let command = movement_command(headers, destination)?;
    begin(core, command, None, candidate, budget)
}

fn movement_command(
    headers: CommandHeaders,
    destination: SurfacePoint,
) -> Result<BoundNativeMovement, ExecutionError> {
    if ![destination.x, destination.y, destination.z]
        .into_iter()
        .all(f64::is_finite)
    {
        return Err(ExecutionError::Invariant);
    }
    let encoding = CommandEncoding::from_ordered(
        &MovementInput {
            id: &headers.id,
            actor_id: &headers.actor_id,
            kind: "move",
            destination: &destination,
        },
        4,
    )
    .map_err(|_| ExecutionError::Invariant)?;
    Ok(BoundNativeMovement(NativeCommand::Move {
        envelope: headers.envelope(encoding),
        destination: destination.into(),
    }))
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
    let headers = controller_headers(id, actor_id)?;
    let encoded_bytes = json_record_len(&MovementInput {
        id: &headers.id,
        actor_id: &headers.actor_id,
        kind: "move",
        destination,
    })
    .map_err(|_| ExecutionError::Invariant)?;
    let _encoding = budget.reserve(
        encoded_bytes
            .checked_mul(8)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let command = movement_command(headers, destination.clone())?;
    let binding = NativeLocomotion {
        profile: pin.clone(),
        locomotion: locomotion.into(),
        mode,
        episode_id: episode_binding.map(|(id, _)| id.clone()),
        generation: episode_binding.map(|(_, generation)| generation),
    };
    begin(
        core,
        command,
        Some(NativeMovementInput { binding, route, prepared }),
        candidate,
        budget,
    )
}
