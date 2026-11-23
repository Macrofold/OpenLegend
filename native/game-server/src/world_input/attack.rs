//! One live, unsaved gesture per controlled body. This binds transport
//! intent to its accepted native action; it owns no skill, pose or damage.
use super::*;
use openlegend_simulation::attack_execution::{PlayerAttackInput, TimedReleaseInput};

#[derive(Clone, Deserialize, Serialize)]
#[serde(tag = "operation", rename_all = "kebab-case", rename_all_fields = "camelCase", deny_unknown_fields)]
pub(crate) enum AttackControl {
    Begin { input_epoch: Uuid, attack_input_token: Uuid, gesture_sequence: u64 },
    Release {
        input_epoch: Uuid, attack_input_token: Uuid, gesture_sequence: u64,
        begin_command_id: String, input: TimedReleaseInput,
    },
    ConfirmReview { input_epoch: Uuid, attack_input_token: Uuid, gesture_sequence: u64 },
    Cancel {
        input_epoch: Uuid, attack_input_token: Uuid, gesture_sequence: u64,
        begin_command_id: String,
    },
}

impl AttackControl {
    fn identity(&self) -> (Uuid, Uuid, u64) {
        match self {
            Self::Begin { input_epoch, attack_input_token, gesture_sequence }
            | Self::Release { input_epoch, attack_input_token, gesture_sequence, .. }
            | Self::ConfirmReview { input_epoch, attack_input_token, gesture_sequence }
            | Self::Cancel { input_epoch, attack_input_token, gesture_sequence, .. } =>
                (*input_epoch, *attack_input_token, *gesture_sequence),
        }
    }

    pub(crate) fn valid(&self, id: impl Fn(&str) -> bool) -> bool {
        (1..=MAX_SAFE_INTEGER).contains(&self.identity().2) && match self {
            Self::Release { begin_command_id, input, .. } => id(begin_command_id) && input.valid(),
            Self::Cancel { begin_command_id, .. } => id(begin_command_id),
            _ => true,
        }
    }
}

#[derive(Clone, Copy, PartialEq)]
pub(crate) enum AttackOperation {
    Begin,
    Release(TimedReleaseInput),
    Cancel,
}

/// Semantic stage retained by the existing one-review owner. New tokens do
/// not change the frozen begin identity or the actual release sample.
pub(crate) struct ReviewedAttack {
    pub operation: AttackOperation,
    pub begin: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReleaseRenewal {
    attack_input_token: Uuid,
    gesture_sequence: u64,
    begin_command_id: String,
    action_id: String,
}

#[derive(Default)]
pub(super) struct AttackState {
    version: u64,
    gesture: Option<Gesture>,
}

struct Gesture {
    sequence: u64,
    begin: String,
    action: Option<String>,
    phase: Phase,
}

enum Phase {
    Open,
    Pending(Coverage),
    Ended,
    Cancelled,
}

struct Coverage {
    starts: f64,
    ends: f64,
    expires: Instant,
    renewal: u64,
}

pub(crate) struct AttackTurn {
    pub scope: InputScope,
    sequence: u64,
    expected: u64,
    pub operation: AttackOperation,
    pub begin: String,
    pub action: Option<String>,
    frontier: f64,
}

impl AttackTurn {
    pub(crate) fn native_input(&self) -> Option<PlayerAttackInput> {
        match self.operation {
            AttackOperation::Begin => Some(PlayerAttackInput::Begin),
            AttackOperation::Release(input) => Some(PlayerAttackInput::Release { input, may_wait: true }),
            AttackOperation::Cancel => None,
        }
    }
}

/// Reserve the optional second input window independently of steering.
pub(super) struct ReleaseProof {
    sequence: u64,
    token: Uuid,
    starts: f64,
}

impl AttackState {
    pub(super) fn expired(&self, now: Instant) -> bool {
        self.pending().is_some_and(|(_, window)| window.expires <= now)
    }

    pub(super) fn held(&self, now: Instant) -> bool {
        self.gesture.as_ref().is_some_and(|gesture| match &gesture.phase {
            Phase::Open => true,
            Phase::Pending(window) => window.expires > now,
            _ => false,
        })
    }

    fn pending(&self) -> Option<(&Gesture, &Coverage)> {
        self.gesture.as_ref().and_then(|gesture| match &gesture.phase {
            Phase::Pending(window) => Some((gesture, window)),
            _ => None,
        })
    }

    pub(super) fn credit(&mut self, from: Instant, to: Instant, frontier: f64, ratio: f64) {
        if let Some(Phase::Pending(window)) = self.gesture.as_mut().map(|gesture| &mut gesture.phase)
            && window.expires > from
        {
            let seconds = to.min(window.expires).saturating_duration_since(from).as_secs_f64();
            window.ends = window.ends.max(frontier + seconds * ratio);
        }
    }

    pub(super) fn renew(
        &mut self,
        update: &ReleaseRenewal,
        token: Uuid,
        sequence: u64,
        now: Instant,
    ) -> bool {
        let Some(gesture) = self.gesture.as_mut() else { return false; };
        let Phase::Pending(window) = &mut gesture.phase else { return false; };
        if update.attack_input_token != token || update.gesture_sequence != gesture.sequence
            || update.begin_command_id != gesture.begin || gesture.action.as_ref() != Some(&update.action_id)
            || window.expires <= now || !(window.renewal + 1..=MAX_SAFE_INTEGER).contains(&sequence)
        {
            return false;
        }
        window.renewal = sequence;
        window.expires = now + EXPIRES;
        true
    }

    pub(super) fn offered(&self, now: Instant) -> bool {
        self.pending().is_some_and(|(_, window)| window.expires > now && window.ends > window.starts)
    }

    pub(super) fn snapshot(
        &self, now: Instant, token: Uuid, current: impl FnOnce(&str) -> bool,
    ) -> Option<(RuntimeReleaseInput, ReleaseProof)> {
        let (gesture, window) = self.pending()?;
        let action = gesture.action.as_ref()?;
        if window.expires <= now || window.ends <= window.starts || !current(action) {
            return None;
        }
        Some((
            RuntimeReleaseInput { action_id: action.clone(), starts_at: window.starts, ends_at: window.ends },
            ReleaseProof { sequence: gesture.sequence, token, starts: window.starts },
        ))
    }

    pub(super) fn accepts(&self, proof: &ReleaseProof, token: Uuid, now: Instant) -> bool {
        self.pending().is_some_and(|(gesture, window)| proof.token == token
            && proof.sequence == gesture.sequence && proof.starts == window.starts && window.expires > now)
    }

    fn cancel(&mut self, sequence: u64, begin: &str, action: Option<String>) -> Result<(), AccessError> {
        self.version = self.version.checked_add(1).ok_or(AccessError::Availability)?;
        self.gesture = Some(Gesture { sequence, begin: begin.into(), action, phase: Phase::Cancelled });
        Ok(())
    }
}

pub(super) fn frontier(account: Option<ClockAccount>, at: f64, now: Instant) -> f64 {
    account.map_or(at, |account| {
        account.frontier + now.saturating_duration_since(account.through).as_secs_f64() * account.ratio
    }).max(at)
}

impl WorldInputs {
    /// Mark an exact early cancellation before it waits behind an in-flight
    /// Begin. No body action is changed here, and no other gesture is stopped.
    pub(crate) fn cancel_gesture(
        &self, audience: &AuthorizedScope, control: &AttackControl, action: Option<&str>,
    ) -> Result<(), AccessError> {
        let AttackControl::Cancel { begin_command_id, .. } = control else { return Ok(()); };
        let (epoch, token, sequence) = control.identity();
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        self.authority.current(audience, Capability::Play, true, |scope, _| {
            let current = state.actors.get(&scope.actor_id).ok_or(AccessError::Changed)?;
            if !same_controller(scope, &current.audience.scope)
                || current.scope.input_epoch != epoch || current.scope.attack_input_token != token
                || expire_attack(&mut state, &scope.actor_id, Instant::now())?
            {
                return Err(AccessError::Changed);
            }
            let current = &mut state.actors[&scope.actor_id];
            let bound = if let Some(prior) = &current.attack.gesture {
                if prior.sequence == sequence && prior.begin == *begin_command_id
                    && action.is_none_or(|action| prior.action.as_deref() == Some(action))
                {
                    prior.action.clone()
                } else if prior.sequence < sequence
                    && matches!(prior.phase, Phase::Cancelled | Phase::Ended) && action.is_none()
                {
                    None
                } else {
                    return Err(AccessError::Changed);
                }
            } else if action.is_none() {
                None
            } else {
                return Err(AccessError::Changed);
            };
            current.attack.cancel(sequence, begin_command_id, bound)
        })?
    }

    /// Check one exact input against the accepted body and return only the
    /// sealed transport facts needed by the native command and final gate.
    pub(crate) fn attack_turn(
        &self,
        audience: &Arc<AuthorizedScope>,
        facts: RuntimePlayerInputState,
        clock: RuntimeClock,
        control: &AttackControl,
        review: Option<&ReviewedAttack>,
        command_id: &str,
        action: Option<&str>,
        current_action: Option<&str>,
    ) -> Result<AttackTurn, AccessError> {
        self.use_input(audience.clone(), facts, clock.paused, |input, account| {
            let (epoch, token, sequence) = control.identity();
            if input.scope.input_epoch != epoch || input.scope.attack_input_token != token {
                return Err(AccessError::Changed);
            }
            let prior = input.attack.gesture.as_ref();
            let is_current = |gesture: &Gesture| {
                gesture.action.as_deref().is_some_and(|action| Some(action) == current_action)
            };
            let (operation, begin, action) = match control {
                AttackControl::Begin { .. } if facts.alive
                    && prior.is_none_or(|prior| prior.sequence < sequence
                        && !(matches!(prior.phase, Phase::Open | Phase::Pending(_)) && is_current(prior))) =>
                    (AttackOperation::Begin, command_id, None),
                AttackControl::Release { begin_command_id, input, .. } if facts.alive && prior.is_some_and(|prior| {
                    prior.sequence == sequence && prior.begin == *begin_command_id
                        && matches!(prior.phase, Phase::Open) && action == current_action
                        && prior.action.as_deref() == action && action.is_some()
                }) => (AttackOperation::Release(*input), begin_command_id.as_str(), action),
                AttackControl::ConfirmReview { .. } if facts.alive
                    && prior.is_none_or(|prior| prior.sequence < sequence) =>
                {
                    let review = review.ok_or(AccessError::Changed)?;
                    if match review.operation {
                        AttackOperation::Begin => action.is_some(),
                        AttackOperation::Release(_) => action.is_none() || action != current_action,
                        AttackOperation::Cancel => true,
                    } {
                        return Err(AccessError::Changed);
                    }
                    (review.operation, review.begin.as_str(), action)
                }
                AttackControl::Cancel { begin_command_id, .. } => {
                    let prior = prior.filter(|prior| prior.sequence == sequence
                        && prior.begin == *begin_command_id && matches!(prior.phase, Phase::Cancelled))
                        .ok_or(AccessError::Changed)?;
                    let action = prior.action.as_deref().filter(|action| Some(*action) == current_action);
                    (AttackOperation::Cancel, begin_command_id.as_str(), action)
                }
                _ => return Err(AccessError::Changed),
            };
            Ok(AttackTurn {
                scope: input.scope.clone(),
                sequence,
                expected: input.attack.version,
                operation,
                begin: begin.to_owned(),
                action: action.map(str::to_owned),
                frontier: frontier(account, clock.at, Instant::now()),
            })
        })?
    }

    /// Keep the final native gate and the bounded host update under the same
    /// lock. A concurrent withdrawal changes the expected gesture first.
    pub(crate) fn accept_attack<T, E: From<AccessError>>(
        &self,
        audience: &AuthorizedScope,
        turn: &AttackTurn,
        action: Option<&str>,
        pending: bool,
        reviewed: bool,
        accept: impl FnOnce() -> Result<T, E>,
    ) -> Result<T, E> {
        let mut state = self.state.lock().map_err(|_| AccessError::Availability)?;
        let account = state.clock;
        let current = state.actors.get_mut(&audience.scope.actor_id).ok_or(AccessError::Changed)?;
        if !same_controller(&audience.scope, &current.audience.scope)
            || current.scope.input_epoch != turn.scope.input_epoch
            || current.scope.attack_input_token != turn.scope.attack_input_token
            || current.attack.version != turn.expected
        {
            return Err(AccessError::Changed.into());
        }
        let version = current.attack.version.checked_add(1).ok_or(AccessError::Availability)?;
        let now = Instant::now();
        let starts = frontier(account, turn.frontier, now);
        let phase = match (turn.operation, action, pending, reviewed) {
            (_, _, _, true) => Phase::Ended,
            (AttackOperation::Begin, Some(_), _, _) => Phase::Open,
            (AttackOperation::Release(_), Some(_), true, _) => Phase::Pending(Coverage {
                starts, ends: starts, expires: now + EXPIRES, renewal: 0,
            }),
            (AttackOperation::Cancel, _, _, _) => Phase::Cancelled,
            _ => Phase::Ended,
        };
        // Both short IDs are covered by the existing per-controller allowance.
        let gesture = Gesture {
            sequence: turn.sequence, begin: turn.begin.clone(),
            action: action.map(str::to_owned), phase,
        };
        let output = accept()?;
        current.attack.version = version;
        current.attack.gesture = Some(gesture);
        Ok(output)
    }
}
