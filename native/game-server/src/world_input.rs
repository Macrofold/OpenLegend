//! Leases describe a tab's current intention. Native still decides whether
//! and how a character moves. Only the real clock credits a lease with time.

use crate::authority::{AccessError, Authority, AuthorizedScope, Capability, RequestScope};
use crate::player_command::{AttackReviews, ReleaseReviewRequest, StagedLateReview, prepare_late_review};
use crate::world::WorldError;
use indexmap::IndexMap;
use openlegend_simulation::runtime::{RuntimeError, TimedReleaseReview};
use openlegend_simulation::{
    host::{ByteBudget, ByteReservation, map_storage},
    identity::MAX_SAFE_INTEGER,
    runtime::{
        AdmittedWorldInput, Direction, NativeWorldSession, ReleaseInput as RuntimeReleaseInput,
        RuntimeClock, RuntimePlayerInputState, SteeringInput,
    },
};
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::time::Instant;
use uuid::Uuid;

mod attack;
pub(crate) use attack::{AttackControl, AttackOperation, AttackTurn, ReleaseRenewal, ReviewedAttack};
use attack::{AttackState, ReleaseProof, frontier};

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
        pending_release: Option<ReleaseRenewal>,
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
    attack: AttackState,
    held_for_advance: Option<u64>,
    _custody: ByteReservation,
}

struct State {
    actors: IndexMap<String, Input>,
    revision: u64,
    advance_serial: u64,
    active_advance: Option<u64>,
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
    reviews: Arc<AttackReviews>,
}

pub(crate) struct InputSnapshot {
    values: Vec<AdmittedWorldInput>,
    permits: Vec<Arc<AuthorizedScope>>,
    windows: Vec<InputProof>,
    holder: Option<(Arc<WorldInputs>, u64)>,
    _custody: ByteReservation,
}

pub(crate) struct TimedReviewUpdates {
    entries: Vec<(StagedLateReview, Arc<AuthorizedScope>)>,
    _custody: ByteReservation,
}

struct InputProof {
    steering: Option<(u64, Uuid, f64)>,
    release: Option<ReleaseProof>,
}

impl WorldInputs {
    pub(crate) fn new(
        authority: Arc<Authority>,
        budget: ByteBudget,
        maximum: usize,
        review_capacity: usize,
    ) -> Result<Self, AccessError> {
        let custody = budget.reserve(0).map_err(|_| AccessError::Busy)?;
        Ok(Self {
            authority,
            budget,
            maximum,
            reviews: Arc::new(AttackReviews::new(review_capacity)),
            state: Mutex::new(State {
                actors: IndexMap::new(),
                revision: 0,
                advance_serial: 0,
                active_advance: None,
                custody,
                clock: None,
            }),
        })
    }

    pub(crate) fn reviews(&self) -> &Arc<AttackReviews> {
        &self.reviews
    }

    pub(crate) fn stage_timed_reviews(
        &self,
        snapshot: &InputSnapshot,
        offers: &[TimedReleaseReview],
        budget: &ByteBudget,
    ) -> Result<TimedReviewUpdates, RuntimeError> {
        let bytes = offers.len().checked_mul(std::mem::size_of::<(StagedLateReview, Arc<AuthorizedScope>)>())
            .ok_or(openlegend_simulation::host::CapacityError)?;
        let custody = budget.reserve(bytes)?;
        let mut prepared = Vec::with_capacity(offers.len());
        for offer in offers {
            let (scope, request) = snapshot.permits.iter().zip(&snapshot.windows)
                .filter_map(|(scope, proof)| Some((scope, &proof.release.as_ref()?.review_request)))
                .find(|(scope, request)| scope.scope.actor_id == offer.actor_id()
                    && request.action() == Some(offer.action_id()))
                .ok_or_else(|| RuntimeError::application_refused("Native release review has no input proof."))?;
            let staged = prepare_late_review(scope, request.clone(), offer, budget)?;
            prepared.push((staged, scope.clone()));
        }
        self.reviews
            .reserve_slots(offers.iter().map(TimedReleaseReview::actor_id))
            .map_err(WorldError::candidate_refusal)?;
        Ok(TimedReviewUpdates { entries: prepared, _custody: custody })
    }

    pub(crate) fn publish_timed_reviews(&self, reviews: &TimedReviewUpdates) {
        if reviews.entries.is_empty() { return; }
        let mut state = self.state.lock().expect("accepted input owner is intact");
        for (review, scope) in &reviews.entries {
            let actor = &scope.scope.actor_id;
            let current = state.actors.get(actor).is_some_and(|input| {
                same_controller(&input.audience.scope, &scope.scope)
                    && input.attack.matches_review_request(&review.request)
            });
            if !current { continue; }
            let Ok(revision) = revision(&mut state) else { continue; };
            let input = &mut state.actors[actor];
            input.stop_for_review(revision, Uuid::new_v4());
            input.attack.end_pending_review();
            self.reviews.publish_late(review.pending.clone());
        }
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
        live_pending_release: Option<&str>,
    ) -> Result<InputOutcome, AccessError> {
        let now = Instant::now();
        self.use_input(audience, facts, clock.paused, |input, account| {
            let frontier = (!clock.paused && facts.alive && facts.can_steer)
                .then(|| frontier(account, clock.at, now));
            input.apply(&update, now, frontier, live_pending_release)
        })
    }

    /// During a private elapsed turn, renew only input lanes already checked
    /// against the accepted actor. A stale claim in one lane cannot block a
    /// current claim in the other. Settlement ends the serial before publication.
    pub(crate) fn update_during_advance(
        &self,
        audience: &AuthorizedScope,
        update: &InputUpdate,
    ) -> Result<Option<InputOutcome>, AccessError> {
        match update {
            InputUpdate::Renew { movement, pending_release, .. }
                if movement.is_some() || pending_release.is_some() => {}
            InputUpdate::Steer { direction, .. } if direction.x == 0.0 && direction.z == 0.0 => {}
            _ => return Ok(None),
        }
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let Some(advance) = state.active_advance else {
            return Ok(None);
        };
        let actor = &audience.scope.actor_id;
        if !state.actors.get(actor).is_some_and(|input| {
            same_controller(&input.audience.scope, &audience.scope)
        }) {
            return Ok(None);
        }
        self.authority
            .current(audience, Capability::Play, true, |_, _| {
                let now = Instant::now();
                expire_inputs(&mut state, actor, now)?;
                let input = &mut state.actors[actor];
                let release = match update {
                    InputUpdate::Renew { movement, pending_release, renewal_sequence, .. } => {
                        let movement_current = movement.as_ref().is_some_and(|request| {
                            input.matches_movement_renewal(request, *renewal_sequence)
                        });
                        if movement_current && input.held_for_advance != Some(advance) {
                            return Ok(None);
                        }
                        let release = pending_release.as_ref().filter(|request| {
                            input.attack.matches_renewal(
                                request, input.scope.attack_input_token, *renewal_sequence, now,
                            )
                        });
                        if (!movement_current && release.is_none())
                            || (release.is_some() && !input.attack.checked_for_advance(advance))
                        {
                            return Ok(None);
                        }
                        release.map(ReleaseRenewal::action_id)
                    }
                    InputUpdate::Steer { .. } => {
                        if input.steering.is_none() || input.held_for_advance != Some(advance) {
                            return Ok(None);
                        }
                        None
                    }
                };
                Ok(Some(input.apply(update, now, None, release)))
            })?
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
                                !input.attack.held(now) && input
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
                            attack: AttackState::default(),
                            held_for_advance: None,
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
                expire_inputs(&mut state, &scope.actor_id, now)?;
                Ok(use_input(&mut state.actors[&scope.actor_id], account))
            })?
    }

    pub(crate) fn exclude(&self) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        self.reviews.clear().map_err(|_| AccessError::Availability)?;
        state.clock = None;
        state.actors.clear();
        Ok(())
    }

    pub(crate) fn clear_actor(&self, actor: &str) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        self.reviews.clear_actor(actor).map_err(|_| AccessError::Availability)?;
        state.actors.swap_remove(actor);
        Ok(())
    }

    pub(crate) fn accept_inputs<T>(
        &self,
        snapshot: &InputSnapshot,
        accept: impl FnOnce() -> T,
    ) -> Result<T, AccessError> {
        if snapshot.holder.is_none() {
            return Ok(accept());
        }
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        snapshot.end_advance(&mut state);
        let now = Instant::now();
        for (permit, proof) in snapshot.permits.iter().zip(&snapshot.windows) {
            let current = state.actors.get(&permit.scope.actor_id).ok_or(AccessError::Changed)?;
            let steering = proof.steering.is_none_or(|(sequence, token, starts)| {
                current.sequence == sequence && current.scope.movement_input_token == token
                    && current.steering.as_ref().is_some_and(|window| window.expires > now && window.starts == starts)
            });
            let release = proof.release.as_ref().is_none_or(|release| {
                current.attack.accepts(release, current.scope.attack_input_token, now)
            });
            if !steering || !release {
                return Err(AccessError::Changed);
            }
        }
        self.authority.current_inputs(&snapshot.permits, accept)
    }

    /// Only the host's real elapsed interval credits movement. The stored
    /// frontier lets an intention arriving between offers begin at its own time.
    /// A changed clock speed uses the old rate for this interval and admits
    /// new intentions at the next rate from the very same cut.
    pub(crate) fn credit(
        &self,
        from: Instant,
        to: Instant,
        frontier: f64,
        ratio: f64,
        next_ratio: Option<f64>,
    ) -> Result<(), AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let end = frontier + to.saturating_duration_since(from).as_secs_f64() * ratio;
        state.clock = Some(ClockAccount {
            through: to,
            frontier: end,
            ratio: next_ratio.unwrap_or(ratio),
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
            input.attack.credit(from, to, frontier, ratio);
        }
        Ok(())
    }

    pub(crate) fn snapshot(
        self: &Arc<Self>,
        world: &NativeWorldSession,
    ) -> Result<InputSnapshot, AccessError> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let now = Instant::now();
        let count = state
            .actors
            .values()
            .filter(|input| {
                input
                    .steering
                    .as_ref()
                    .is_some_and(|window| window.expires > now && window.ends > window.starts)
                    || input.attack.live(now)
            })
            .count();
        // Bound the independently owned native input carrier and scope refs.
        let bytes = count.checked_mul(1024).ok_or(AccessError::Busy)?;
        let custody = self.budget.reserve(bytes).map_err(|_| AccessError::Busy)?;
        let mut result = InputSnapshot {
            values: Vec::with_capacity(count),
            permits: Vec::with_capacity(count),
            windows: Vec::with_capacity(count),
            holder: None,
            _custody: custody,
        };
        let serial = state
            .advance_serial
            .checked_add(1)
            .ok_or(AccessError::Availability)?;
        // A later snapshot must never reuse marks written before a refusal.
        state.advance_serial = serial;
        let mut checked_input = false;
        for input in state.actors.values_mut() {
            let steering = input.steering.as_ref().filter(|window| window.expires > now);
            let release = input.attack.live(now);
            if steering.is_none() && !release {
                continue;
            }
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
            if facts.physical_life != input.life || !facts.alive {
                continue;
            }
            let steering = steering.filter(|_| facts.can_steer);
            if steering.is_some() {
                input.held_for_advance = Some(serial);
                checked_input = true;
            }
            // A new direction can start beyond this offer. Setting the
            // steering fast-path mark grants no motion before its window.
            let steering = steering.filter(|window| window.ends > window.starts);
            let release = if release {
                world.with_player_attack(&scope.account_id, &scope.actor_id, |current| {
                    input.attack.snapshot(now, input.scope.attack_input_token, serial, |action| {
                        current == Some((action, true))
                    })
                }).map_err(|_| AccessError::Changed)?
            } else {
                None
            };
            if steering.is_none() && release.is_none() {
                continue;
            }
            checked_input = true;
            let (release, release_proof) = release.map_or((None, None), |(release, proof)| {
                (Some(release), Some(proof))
            });
            result.values.push(AdmittedWorldInput {
                actor_id: scope.actor_id.clone(),
                release,
                steering: steering.map(|window| SteeringInput {
                    direction: Direction { x: window.direction.x, z: window.direction.z },
                    starts_at: window.starts,
                    ends_at: window.ends,
                }),
            });
            result.permits.push(audience.clone());
            result.windows.push(InputProof {
                steering: steering.map(|window| (input.sequence, input.scope.movement_input_token, window.starts)),
                release: release_proof,
            });
        }
        if checked_input {
            state.active_advance = Some(serial);
            result.holder = Some((self.clone(), serial));
        }
        Ok(result)
    }
}

impl InputSnapshot {
    pub(crate) fn take(&mut self) -> Vec<AdmittedWorldInput> {
        std::mem::take(&mut self.values)
    }

    fn end_advance(&self, state: &mut State) {
        if let Some((_, serial)) = self.holder.as_ref()
            && state.active_advance == Some(*serial)
        {
            state.active_advance = None;
        }
    }
}

impl Drop for InputSnapshot {
    fn drop(&mut self) {
        if let Some((owner, _)) = &self.holder
            && let Ok(mut state) = owner.state.lock()
        {
            self.end_advance(&mut state);
        }
    }
}

impl Input {
    fn stop_for_review(&mut self, revision: u64, movement_token: Uuid) {
        self.scope.revision = revision;
        self.scope.movement_input_token = movement_token;
        self.steering = None;
        self.sequence = 0;
        self.held_for_advance = None;
    }

    fn matches_movement_renewal(&self, movement: &MovementRenewal, sequence: u64) -> bool {
        self.steering.as_ref().is_some_and(|window| {
            movement.movement_input_token == self.scope.movement_input_token
                && movement.movement_sequence == self.sequence
                && (window.renewal + 1..=MAX_SAFE_INTEGER).contains(&sequence)
        })
    }

    fn apply(
        &mut self,
        update: &InputUpdate,
        now: Instant,
        start_frontier: Option<f64>,
        live_pending_release: Option<&str>,
    ) -> InputOutcome {
        let mut result = InputOutcome {
            ok: false,
            code: "input-stale",
            message: "These controls expired. Use a fresh deliberate input.",
            input_scope: self.scope.clone(),
            movement_accepted: None,
            release_accepted: None,
        };
        match update {
            InputUpdate::Steer {
                input_epoch,
                movement_input_token,
                movement_sequence,
                direction,
            } if *input_epoch == self.scope.input_epoch
                && *movement_input_token == self.scope.movement_input_token
                && (self.sequence + 1..=MAX_SAFE_INTEGER).contains(movement_sequence)
                && valid_direction(direction) =>
            {
                let moving = direction.x != 0.0 || direction.z != 0.0;
                self.steering = if moving {
                    let Some(frontier) = start_frontier else {
                        result.code = "steering-unavailable";
                        result.message = "You cannot steer right now.";
                        return result;
                    };
                    Some(Window {
                        starts: frontier,
                        ends: frontier,
                        expires: now + EXPIRES,
                        direction: Direction {
                            x: direction.x,
                            z: direction.z,
                        },
                        renewal: 0,
                    })
                } else {
                    None
                };
                self.sequence = *movement_sequence;
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
                pending_release,
            } if *input_epoch == self.scope.input_epoch => {
                let renewed = movement.as_ref().is_some_and(|request| {
                    self.matches_movement_renewal(request, *renewal_sequence)
                });
                if let Some(window) = self.steering.as_mut().filter(|_| renewed) {
                    window.renewal = *renewal_sequence;
                    window.expires = now + EXPIRES;
                }
                let renewed_release = pending_release.as_ref().is_some_and(|pending| {
                    self.attack.renew(
                        pending, self.scope.attack_input_token, *renewal_sequence, now,
                        live_pending_release,
                    )
                });
                if renewed || renewed_release {
                    result.ok = true;
                    result.code = "input-renewed";
                    result.message = "Active controls renewed.";
                }
                result.movement_accepted = Some(renewed);
                result.release_accepted = Some(renewed_release);
            }
            _ => {}
        }
        result
    }
}

fn valid_direction(direction: &Direction) -> bool {
    let magnitude = direction.x.hypot(direction.z);
    magnitude == 0.0 || (magnitude - 1.0).abs() <= 16.0 * f64::EPSILON
}

fn expire_inputs(state: &mut State, actor: &str, now: Instant) -> Result<(), AccessError> {
    if state.actors[actor].steering.as_ref().is_some_and(|window| window.expires <= now) {
        let revision = revision(state)?;
        let input = &mut state.actors[actor];
        input.scope.revision = revision;
        input.scope.movement_input_token = Uuid::new_v4();
        input.steering = None;
        input.sequence = 0;
        input.held_for_advance = None;
    }
    expire_attack(state, actor, now)?;
    Ok(())
}

fn expire_attack(state: &mut State, actor: &str, now: Instant) -> Result<bool, AccessError> {
    if !state.actors.get(actor).is_some_and(|input| input.attack.expired(now)) {
        return Ok(false);
    }
    let revision = revision(state)?;
    let input = &mut state.actors[actor];
    input.scope.revision = revision;
    input.scope.attack_input_token = Uuid::new_v4();
    input.attack = AttackState::default();
    Ok(true)
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
