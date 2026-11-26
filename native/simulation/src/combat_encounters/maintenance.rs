//! Retire only this observer's ended exact attack associations. Sight that
//! returns to a known preparation resumes activity without a hostile revision.
use super::authorities::{increment, pair_for};
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::reception::{ObserverLife, SensorError, SightBatch};
use std::mem::size_of;

pub(crate) struct SeenAttack {
    pub(crate) source: String,
    pub(crate) life: u64,
    pub(crate) action: String,
    pub(crate) episode: Option<String>,
    pub(crate) occurrence: String,
    pub(crate) had_pair: bool,
    pub(crate) _custody: ByteReservation,
}

struct ObservedFlight {
    subject: String,
    token: String,
    flight: String,
    other_life: u64,
}

/// Only a personally received, still-active projectile can request a point
/// sight check. This cursor owns its small exact list until its last answer.
pub(crate) struct CheckedFlights {
    waiting: Option<SightBatch>,
    remaining: Vec<ObservedFlight>,
    _storage: ByteReservation,
}

impl CheckedFlights {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        observer: &ObserverLife,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(owner) = core
            .state
            .physical
            .entities
            .get(&observer.actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.encounters.as_ref())
            .filter(|owner| owner.life == observer.physical_life)
        else {
            return Ok(None);
        };
        let active = || {
            owner.pairs.iter().flat_map(|(subject, pair)| {
                pair.active
                    .iter()
                    .filter(|(_, active)| active.kind == ObservedAttackKind::Projectile)
                    .map(move |(token, active)| (subject, pair.other_life, token, &active.id))
            })
        };
        let (count, bytes) = active()
            .try_fold(
                (0usize, 0usize),
                |(count, bytes), (subject, _, token, flight)| {
                    Some((
                        count.checked_add(1)?,
                        heap_sum([
                            bytes,
                            size_of::<ObservedFlight>(),
                            subject.len(),
                            token.len(),
                            flight.len(),
                        ])?,
                    ))
                },
            )
            .ok_or(ExecutionError::Capacity)?;
        if count == 0 {
            return Ok(None);
        }
        let storage = budget.reserve(bytes)?;
        let mut remaining = Vec::new();
        remaining
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        remaining.extend(
            active().map(|(subject, other_life, token, flight)| ObservedFlight {
                subject: subject.clone(),
                token: token.clone(),
                flight: flight.clone(),
                other_life,
            }),
        );
        remaining.reverse();
        Ok(Some(Self {
            waiting: None,
            remaining,
            _storage: storage,
        }))
    }

    pub(crate) fn request(&self) -> Option<&GeometryQueries> {
        self.waiting.as_ref().map(SightBatch::queries)
    }

    /// Return true with one genuine pending geometry question, or false when
    /// this observer's tracked projectile facts are complete.
    pub(crate) fn advance(
        &mut self,
        core: &mut CoreMutation<'_>,
        observer: &ObserverLife,
        candidate: CandidateKey,
        answers: Option<GeometryAnswers>,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let sensor_error = |error| match error {
            SensorError::Capacity => ExecutionError::Capacity,
            _ => ExecutionError::Invariant,
        };
        if let Some(waiting) = self.waiting.take() {
            let Some(answers) = answers else {
                self.waiting = Some(waiting);
                return Ok(true);
            };
            let seen = waiting
                .finish(answers)
                .map_err(sensor_error)?
                .point_seen()
                .ok_or(ExecutionError::Invariant)?;
            let checked = self.remaining.pop().ok_or(ExecutionError::Invariant)?;
            if !seen {
                end_flight(core, &observer.actor_id, &checked)?;
            }
        } else if answers.is_some() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        while let Some(next) = self.remaining.last() {
            let state = &core.state;
            let point = state
                .physical
                .projectiles
                .flights
                .get(&next.flight)
                .filter(|row| {
                    let flight = &row.flight;
                    flight.source_id == next.subject && flight.source_life == next.other_life
                })
                .map(|row| row.flight.position);
            if let Some(point) = point {
                let binding = GeometryBinding::new(
                    candidate,
                    state.geometry_revision(),
                    core.journal.next_provider_serial()?,
                );
                let sight = SightBatch::prepare_with_point(
                    &state.physical,
                    &state.installed,
                    &observer.actor_id,
                    &[],
                    Some(point),
                    binding,
                    budget,
                )
                .map_err(sensor_error)?;
                if !sight.queries().sight.is_empty() {
                    self.waiting = Some(sight);
                    return Ok(true);
                }
                if sight
                    .finish_sight(binding, &[])
                    .map_err(sensor_error)?
                    .point_seen()
                    != Some(false)
                {
                    return Err(ExecutionError::Invariant);
                }
            }
            let checked = self.remaining.pop().ok_or(ExecutionError::Invariant)?;
            end_flight(core, &observer.actor_id, &checked)?;
        }
        Ok(false)
    }
}

fn end_flight(
    core: &mut CoreMutation<'_>,
    observer: &str,
    observed: &ObservedFlight,
) -> Result<(), ExecutionError> {
    let until = core.state.physical.header.sim_time
        + policy(core.state)
            .ok_or(ExecutionError::Invariant)?
            .recent_seconds;
    core.physical()
        .edit_personal_encounters(observer, 0, |state| {
            let Some(pair) = state
                .pairs
                .get_mut(&observed.subject)
                .filter(|pair| pair.other_life == observed.other_life)
            else {
                return Ok(());
            };
            if pair.active.shift_remove(&observed.token).is_some() && pair.active.is_empty() {
                pair.incoming_until = Some(until);
                pair.movement_revision = increment(pair.movement_revision)?;
                pair.preference_revision = increment(pair.preference_revision)?;
            }
            state.refresh_deadline();
            Ok(())
        })
}

pub(crate) fn restore_seen_action(
    core: &mut CoreMutation<'_>,
    observer: &str,
    known: SeenAttack,
) -> Result<(), ExecutionError> {
    let bytes = heap_sum([
        known.source.len(),
        8 * known.action.len() + 32,
        map_storage::<String, ObservedAttack>(4).ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    core.physical()
        .edit_personal_encounters(observer, bytes, |state| {
            let pair = pair_for(
                state,
                &known.source,
                known.life,
                known.episode,
                known.had_pair,
            )?;
            let kind = ObservedAttackKind::Action;
            let key = crate::encoding::json_record(&(kind, &known.action))
                .map_err(|_| ExecutionError::Invariant)?;
            pair.active
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            pair.active.insert(
                key,
                ObservedAttack {
                    kind,
                    id: known.action,
                    occurrence_id: known.occurrence,
                },
            );
            pair.movement_revision = increment(pair.movement_revision)?;
            pair.preference_revision = increment(pair.preference_revision)?;
            Ok(())
        })
}

pub(crate) fn next_encounter_work_at(state: &SimulationState, observer: &str) -> Option<f64> {
    state
        .physical
        .entities
        .get(observer)?
        .actor
        .as_ref()?
        .encounters
        .as_ref()?
        .next_at
}

/// Time-only retirement uses the existing receiving deadline. This does not
/// sample the opponent or renew any previously acquired attack.
pub(crate) fn expire_due(
    core: &mut CoreMutation<'_>,
    observer: &str,
) -> Result<(), ExecutionError> {
    let now = core.state.physical.header.sim_time;
    if next_encounter_work_at(core.state, observer).is_none_or(|due| due > now) {
        return Ok(());
    }
    core.physical()
        .edit_personal_encounters(observer, 0, |state| {
            for pair in state.pairs.values_mut() {
                if pair.incoming_until.is_some_and(|due| due <= now) {
                    pair.incoming_until = None;
                    pair.preference_revision = increment(pair.preference_revision)?;
                }
                if pair
                    .own
                    .as_ref()
                    .and_then(|owned| owned.until)
                    .is_some_and(|due| due <= now)
                {
                    pair.own = None;
                    pair.preference_revision = increment(pair.preference_revision)?;
                }
                if pair.incoming_until.is_none() && pair.active.is_empty() {
                    pair.last_cause = None;
                }
            }
            // Keep the bare revision for the same life and recognition
            // episode. A pre-fight signed Speak must not become fresh again.
            state.pairs.retain(|_, pair| {
                pair.preference_revision != 0
                    || pair.incoming_until.is_some()
                    || !pair.active.is_empty()
                    || pair.own.is_some()
                    || pair.speak.is_some()
            });
            state.unknown.retain(|_, contact| contact.until > now);
            state.refresh_deadline();
            Ok(())
        })
}

pub(crate) fn settle_seen_actions(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let state = &*core.state;
    let Some(entity) = state.physical.entities.get(observer) else {
        return Ok(());
    };
    let Some(owner) = entity
        .actor
        .as_ref()
        .and_then(|actor| actor.encounters.as_ref())
    else {
        return Ok(());
    };
    let Some(policy) = policy(state)
        .filter(|_| entity.actively_participates() && entity.physical_life() == Some(owner.life))
    else {
        return core.physical().clear_personal_encounters(observer);
    };
    let now = state.physical.header.sim_time;
    let until = now + policy.recent_seconds;
    let visible = state
        .reception
        .visible_people
        .as_ref()
        .and_then(|rows| rows.get(observer));
    let ended = |target: &str, pair: &PersonalEncounter, active: &ObservedAttack| {
        if active.kind != ObservedAttackKind::Action {
            return false;
        }
        let current = visible
            .filter(|people| people.iter().any(|id| id == target))
            .and_then(|_| state.physical.entities.get(target))
            .filter(|source| {
                current_pair(state, entity, source)
                    .is_some_and(|current| std::ptr::eq(current, pair))
            })
            .and_then(observed_preparation);
        !current.is_some_and(|action| {
            action.id == active.id
                && action.target_id.as_deref() == Some(observer)
                && action.target_life == Some(owner.life)
        })
    };
    let mut storage = budget.reserve(0)?;
    let mut removals = Vec::new();
    for (subject, pair) in &owner.pairs {
        for (token, active) in &pair.active {
            if ended(subject, pair, active) {
                storage.resize(
                    heap_sum([
                        storage.bytes(),
                        2 * size_of::<(String, String)>(),
                        subject.len(),
                        token.len(),
                    ])
                    .ok_or(ExecutionError::Capacity)?,
                )?;
                removals
                    .try_reserve_exact(1)
                    .map_err(|_| ExecutionError::Capacity)?;
                removals.push((subject.clone(), token.clone()));
            }
        }
    }
    if removals.is_empty() {
        return Ok(());
    }
    core.physical()
        .edit_personal_encounters(observer, 0, |state| {
            for (subject, token) in removals {
                let pair = state
                    .pairs
                    .get_mut(&subject)
                    .ok_or(ExecutionError::Invariant)?;
                if pair.active.shift_remove(&token).is_some() && pair.active.is_empty() {
                    pair.incoming_until = Some(until);
                    pair.movement_revision = increment(pair.movement_revision)?;
                    pair.preference_revision = increment(pair.preference_revision)?;
                }
            }
            state.refresh_deadline();
            Ok(())
        })
}
