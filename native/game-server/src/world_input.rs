//! Leases describe a tab's current intention. Native still decides whether
//! and how a character moves. Only the real clock credits a lease with time.

use crate::authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope};
use indexmap::IndexMap;
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation, map_storage},
    identity::MAX_SAFE_INTEGER,
    runtime::{
        AdmittedWorldInput, Direction, NativeWorldSession, RuntimeClock, RuntimePlayerInputState,
        SteeringInput,
    },
};
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::time::Instant;
use uuid::Uuid;

const EXPIRES: Duration = Duration::from_millis(250);
const RENEWS: Duration = Duration::from_millis(100);

#[derive(Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InputScope {
    revision: u64,
    input_epoch: Uuid,
    movement_input_token: Uuid,
    attack_input_token: Uuid,
    renewal_interval_ms: u64,
    expiry_ms: u64,
}

#[derive(Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum InputUpdate {
    Steer {
        input_epoch: Uuid,
        movement_input_token: Uuid,
        movement_sequence: u64,
        direction: Direction,
    },
    Renew {
        input_epoch: Uuid,
        renewal_sequence: u64,
        movement: Option<MovementRenewal>,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MovementRenewal {
    movement_input_token: Uuid,
    movement_sequence: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InputOutcome {
    ok: bool,
    code: &'static str,
    message: &'static str,
    input_scope: InputScope,
    movement_accepted: Option<bool>,
    release_accepted: Option<bool>,
}

struct Window {
    starts: f64,
    ends: f64,
    expires: Instant,
    direction: Direction,
    renewal: u64,
}

struct Input {
    audience: Arc<AuthorizedScope>,
    life: Option<u64>,
    paused: bool,
    scope: InputScope,
    sequence: u64,
    steering: Option<Window>,
    _custody: ByteReservation,
}

struct State {
    actors: IndexMap<String, Input>,
    revision: u64,
    custody: ByteReservation,
    clock: Option<ClockAccount>,
}

#[derive(Clone, Copy)]
struct ClockAccount {
    through: Instant,
    frontier: f64,
    ratio: f64,
}

pub(crate) struct WorldInputs {
    state: Mutex<State>,
    authority: Arc<Authority>,
    budget: ByteBudget,
    maximum: usize,
}

pub(crate) struct InputSnapshot {
    values: Vec<AdmittedWorldInput>,
    permits: Vec<Arc<AuthorizedScope>>,
    windows: Vec<(u64, Uuid, f64)>,
    _custody: ByteReservation,
}

impl WorldInputs {
    pub(crate) fn new(
        authority: Arc<Authority>,
        budget: ByteBudget,
        maximum: usize,
    ) -> Result<Self, AccessError> {
        let custody = budget.reserve(0).map_err(|_| AccessError::Busy)?;
        Ok(Self {
            authority,
            budget,
            maximum,
            state: Mutex::new(State {
                actors: IndexMap::new(),
                revision: 0,
                custody,
                clock: None,
            }),
        })
    }

    pub(crate) fn for_view(
        &self,
        audience: Arc<AuthorizedScope>,
        facts: RuntimePlayerInputState,
        paused: bool,
    ) -> Result<InputScope, AccessError> {
        self.use_input(audience, facts, paused, |input, _| input.scope.clone())
    }

    pub(crate) fn update(
        &self,
        audience: Arc<AuthorizedScope>,
        facts: RuntimePlayerInputState,
        clock: RuntimeClock,
        update: InputUpdate,
    ) -> Result<InputOutcome, AccessError> {
        let now = Instant::now();
        self.use_input(audience, facts, clock.paused, |input, account| {
            let mut result = InputOutcome {
                ok: false,
                code: "input-stale",
                message: "These controls expired. Use a fresh deliberate input.",
                input_scope: input.scope.clone(),
                movement_accepted: None,
                release_accepted: None,
            };
            match update {
                InputUpdate::Steer {
                    input_epoch,
                    movement_input_token,
                    movement_sequence,
                    direction,
                } if input_epoch == input.scope.input_epoch
                    && movement_input_token == input.scope.movement_input_token
                    && (input.sequence + 1..=MAX_SAFE_INTEGER).contains(&movement_sequence)
                    && valid_direction(&direction) =>
                {
                    let moving = direction.x != 0.0 || direction.z != 0.0;
                    if moving && (clock.paused || !facts.alive || !facts.can_steer) {
                        result.code = "steering-unavailable";
                        result.message = "You cannot steer right now.";
                        return result;
                    }
                    input.sequence = movement_sequence;
                    let frontier = account
                        .map_or(clock.at, |account| {
                            account.frontier
                                + now.saturating_duration_since(account.through).as_secs_f64()
                                    * account.ratio
                        })
                        .max(clock.at);
                    input.steering = moving.then_some(Window {
                        starts: frontier,
                        ends: frontier,
                        expires: now + EXPIRES,
                        direction,
                        renewal: 0,
                    });
                    result.ok = true;
                    result.code = "input-accepted";
                    result.message = if moving {
                        "Movement requested."
                    } else {
                        "Movement stopped."
                    };
                    result.movement_accepted = Some(true);
                }
                InputUpdate::Renew {
                    input_epoch,
                    renewal_sequence,
                    movement,
                } if input_epoch == input.scope.input_epoch => {
                    let renewed =
                        movement
                            .zip(input.steering.as_mut())
                            .is_some_and(|(movement, window)| {
                                if movement.movement_input_token != input.scope.movement_input_token
                                    || movement.movement_sequence != input.sequence
                                    || !(window.renewal + 1..=MAX_SAFE_INTEGER)
                                        .contains(&renewal_sequence)
                                {
                                    return false;
                                }
                                window.renewal = renewal_sequence;
                                window.expires = now + EXPIRES;
                                true
                            });
                    if renewed {
                        result.ok = true;
                        result.code = "input-renewed";
                        result.message = "Active controls renewed.";
                    }
                    result.movement_accepted = Some(renewed);
                    result.release_accepted = Some(false);
                }
                _ => {}
            }
            result
        })
    }

    fn use_input<T>(
        &self,
        audience: Arc<AuthorizedScope>,
        facts: RuntimePlayerInputState,
        paused: bool,
        use_input: impl FnOnce(&mut Input, Option<ClockAccount>) -> T,
    ) -> Result<T, AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        self.authority
            .current(&audience, Capability::Play, true, |scope, _| {
                let now = Instant::now();
                let replace = state.actors.get(&scope.actor_id).is_none_or(|input| {
                    !same_controller(scope, &input.audience.scope)
                        || input.life != facts.physical_life
                        || input.paused != paused
                });
                if replace {
                    if !state.actors.contains_key(&scope.actor_id)
                        && state.actors.len() >= self.maximum
                    {
                        let idle = state
                            .actors
                            .values()
                            .position(|input| {
                                input
                                    .steering
                                    .as_ref()
                                    .is_none_or(|window| window.expires <= now)
                            })
                            .ok_or(AccessError::Busy)?;
                        state.actors.swap_remove_index(idle);
                    }
                    if state.actors.len() == state.actors.capacity() {
                        let capacity = state
                            .actors
                            .len()
                            .checked_mul(2)
                            .and_then(|v| v.checked_add(4))
                            .ok_or(AccessError::Busy)?;
                        let bytes = map_storage::<String, Input>(capacity)
                            .ok_or(AccessError::Busy)?
                            .max(state.custody.bytes());
                        let growing = self.budget.reserve(bytes).map_err(|_| AccessError::Busy)?;
                        state.actors.try_reserve(1).map_err(|_| AccessError::Busy)?;
                        state.custody = growing;
                    }
                    let custody = self.budget.reserve(8192).map_err(|_| AccessError::Busy)?;
                    let revision = revision(&mut state)?;
                    state.actors.insert(
                        scope.actor_id.clone(),
                        Input {
                            audience: audience.clone(),
                            life: facts.physical_life,
                            paused,
                            sequence: 0,
                            steering: None,
                            scope: InputScope {
                                revision,
                                input_epoch: Uuid::new_v4(),
                                movement_input_token: Uuid::new_v4(),
                                attack_input_token: Uuid::new_v4(),
                                renewal_interval_ms: RENEWS.as_millis() as u64,
                                expiry_ms: EXPIRES.as_millis() as u64,
                            },
                            _custody: custody,
                        },
                    );
                }
                let account = state.clock;
                if state.actors[&scope.actor_id]
                    .steering
                    .as_ref()
                    .is_some_and(|window| window.expires <= now)
                {
                    let revision = revision(&mut state)?;
                    let input = &mut state.actors[&scope.actor_id];
                    input.scope.revision = revision;
                    input.scope.movement_input_token = Uuid::new_v4();
                    input.steering = None;
                    input.sequence = 0;
                }
                Ok(use_input(&mut state.actors[&scope.actor_id], account))
            })?
    }

    pub(crate) fn exclude(&self) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        state.clock = None;
        state.actors.clear();
        Ok(())
    }

    pub(crate) fn clear_actor(&self, actor: &str) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        state.actors.swap_remove(actor);
        Ok(())
    }

    pub(crate) fn accept_inputs<T>(
        &self,
        snapshot: &InputSnapshot,
        accept: impl FnOnce() -> T,
    ) -> Result<T, AccessError> {
        if snapshot.permits.is_empty() {
            return Ok(accept());
        }
        let state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let now = Instant::now();
        for (permit, (sequence, token, starts)) in snapshot.permits.iter().zip(&snapshot.windows) {
            let current = state
                .actors
                .get(&permit.scope.actor_id)
                .ok_or(AccessError::Changed)?;
            if current.sequence != *sequence
                || current.scope.movement_input_token != *token
                || current
                    .steering
                    .as_ref()
                    .is_none_or(|window| window.expires <= now || window.starts != *starts)
            {
                return Err(AccessError::Changed);
            }
        }
        self.authority.current_inputs(&snapshot.permits, accept)
    }

    /// Only the host's real elapsed interval credits movement. The stored
    /// frontier lets an intention arriving between offers begin at its own time.
    pub(crate) fn credit(
        &self,
        from: Instant,
        to: Instant,
        frontier: f64,
        ratio: f64,
    ) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let end = frontier + to.saturating_duration_since(from).as_secs_f64() * ratio;
        state.clock = Some(ClockAccount {
            through: to,
            frontier: end,
            ratio,
        });
        for input in state.actors.values_mut() {
            if let Some(window) = &mut input.steering
                && window.expires > from
            {
                let seconds = to
                    .min(window.expires)
                    .saturating_duration_since(from)
                    .as_secs_f64();
                window.ends = window.ends.max(frontier + seconds * ratio);
            }
        }
        Ok(())
    }

    pub(crate) fn snapshot(
        &self,
        world: &NativeWorldSession,
    ) -> Result<InputSnapshot, AccessError> {
        let state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let now = Instant::now();
        let active = state.actors.values().filter(|input| {
            input
                .steering
                .as_ref()
                .is_some_and(|window| window.expires > now && window.ends > window.starts)
        });
        let count = active.clone().count();
        // Bound the independently owned native input carrier and scope refs.
        let bytes = count.checked_mul(1024).ok_or(AccessError::Busy)?;
        let custody = self.budget.reserve(bytes).map_err(|_| AccessError::Busy)?;
        let mut result = InputSnapshot {
            values: Vec::with_capacity(count),
            permits: Vec::with_capacity(count),
            windows: Vec::with_capacity(count),
            _custody: custody,
        };
        for input in active {
            let audience = &input.audience;
            if self
                .authority
                .current(audience, Capability::Play, true, |_, _| ())
                .is_err()
            {
                continue;
            }
            let scope = &audience.scope;
            let facts = world
                .player_input_direct(&scope.account_id, &scope.actor_id)
                .map_err(|_| AccessError::Changed)?;
            if facts.physical_life != input.life || !facts.alive || !facts.can_steer {
                continue;
            }
            let window = input.steering.as_ref().expect("active steering");
            result.values.push(AdmittedWorldInput {
                actor_id: scope.actor_id.clone(),
                release: None,
                steering: Some(SteeringInput {
                    direction: Direction {
                        x: window.direction.x,
                        z: window.direction.z,
                    },
                    starts_at: window.starts,
                    ends_at: window.ends,
                }),
            });
            result.permits.push(audience.clone());
            result.windows.push((
                input.sequence,
                input.scope.movement_input_token,
                window.starts,
            ));
        }
        Ok(result)
    }
}

impl InputSnapshot {
    pub(crate) fn take(&mut self) -> Vec<AdmittedWorldInput> {
        std::mem::take(&mut self.values)
    }
}

fn valid_direction(direction: &Direction) -> bool {
    let magnitude = direction.x.hypot(direction.z);
    magnitude == 0.0 || (magnitude - 1.0).abs() <= 16.0 * f64::EPSILON
}

fn revision(state: &mut State) -> Result<u64, AccessError> {
    if state.revision == MAX_SAFE_INTEGER {
        return Err(AccessError::Availability);
    }
    state.revision += 1;
    Ok(state.revision)
}

fn same_controller(first: &RequestScope, next: &RequestScope) -> bool {
    first.account_id == next.account_id
        && first.session_id == next.session_id
        && first.session_revision == next.session_revision
        && first.world_id == next.world_id
        && first.timeline_id == next.timeline_id
        && first.grant_revision == next.grant_revision
        && first.connection_id == next.connection_id
        && first.control_generation == next.control_generation
}
