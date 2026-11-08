//! One animal's complete physical exposure. Body queries select possible sources;
//! actual sight alone updates its retained estimates. Hidden death, replacement
//! and removal never resolve an old body record.

use crate::encoding::js_string_cmp;
use crate::execution::{ExecutionError, PhysicalMutation};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation};
use crate::native_response::{
    DangerExtent, NativeDanger, NativeResponseProfile, body_danger_key, profile_key,
};
use crate::reception::{SightBatch, SightResults, vision_parameters};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::{Entity, EntityHandle};
use crate::work::{WorkMeters, WorkUnit};
use std::collections::BTreeSet;
use std::mem::size_of;

fn danger_body(profile: &NativeResponseProfile, source: &Entity) -> bool {
    source.actor.as_ref().is_some_and(|actor| {
        profile
            .dangers
            .species
            .iter()
            .any(|species| species == actor.species.as_deref().unwrap_or(""))
            || actor.body.as_ref().is_some_and(|body| {
                profile
                    .dangers
                    .body_plans
                    .iter()
                    .any(|plan| plan == &body.plan)
            })
    })
}

fn danger_source(profile: &NativeResponseProfile, source: &Entity) -> Result<bool, ExecutionError> {
    let Some(actor) = source.actor.as_ref() else {
        return Ok(false);
    };
    if !actor.alive || actor.incapacitated || !source.actively_participates() {
        return Ok(false);
    }
    if danger_body(profile, source) {
        return Ok(true);
    }
    // A selected live strike requires the full strike owner; an opaque input
    // field cannot quietly decide that a natural attack is harmless.
    if profile.dangers.current_natural_attack
        && actor
            .action
            .as_ref()
            .is_some_and(|action| action.kind == "strike" && action.stage == "working")
    {
        return Err(ExecutionError::UnsupportedFamily);
    }
    Ok(false)
}

pub(crate) struct DangerAssessment {
    observer: EntityHandle,
    observer_id: String,
    episode_id: String,
    at: f64,
    pub complete: bool,
    pub changed: bool,
    pub newly_visible: Vec<String>,
    /// Current episode keys in the source's UTF-16 ordering. This product owns
    /// no live entity, and the caller consumes it before the next phase.
    pub records: Vec<String>,
    _reservation: ByteReservation,
}

impl DangerAssessment {
    pub(crate) fn require_current(
        &self,
        physical: &PhysicalState,
        observer_id: &str,
    ) -> Result<(), ExecutionError> {
        if self.observer_id != observer_id
            || self.at != physical.header.sim_time
            || physical
                .entities
                .resolve(self.observer)
                .and_then(|entity| entity.animal.as_ref())
                .and_then(|state| state.episode.as_ref())
                .is_none_or(|episode| episode.id != self.episode_id)
        {
            return Err(ExecutionError::Invariant);
        }
        Ok(())
    }
}

pub(crate) struct DangerBatch {
    observer: EntityHandle,
    observer_id: String,
    episode_id: String,
    at: f64,
    complete: bool,
    candidates: Vec<String>,
    sight: SightBatch,
    reservation: ByteReservation,
}

fn sensor_error(error: crate::reception::SensorError) -> ExecutionError {
    match error {
        crate::reception::SensorError::Capacity => ExecutionError::Capacity,
        crate::reception::SensorError::UnsupportedFamily => ExecutionError::UnsupportedFamily,
        crate::reception::SensorError::MissingObserver => ExecutionError::MissingEntity,
        crate::reception::SensorError::PhysicalPosition => ExecutionError::InvalidPosition,
        _ => ExecutionError::Invariant,
    }
}

impl DangerBatch {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        installed: &InstalledWorld,
        observer_id: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let observer = physical
            .entities
            .get(observer_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let episode = observer
            .animal
            .as_ref()
            .and_then(|state| state.episode.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let pin = profile_key(&episode.profile_pin).map_err(|_| ExecutionError::Invariant)?;
        if !installed.response_profiles.contains_key(&pin) {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let vision = vision_parameters(installed, observer);
        let complete = vision.radius > 0.0
            && observer.actively_participates()
            && !installed
                .capabilities
                .capability_blocked(Some(observer), "perception")?;
        // Reserve before the candidate index allocates its result. The same
        // allowance covers temporary key sets and edits until finish releases
        // them. This is a typed allocation bound, not an encoded-size estimate.
        let (candidate_count, id_bytes) = if complete {
            physical.bodies.candidate_capacity(
                observer
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                vision.radius,
            )
        } else {
            (0, 0)
        };
        let old_bytes = episode.dangers.keys().map(String::capacity).sum::<usize>();
        let bytes = candidate_count
            .saturating_mul(512)
            .saturating_add(id_bytes.saturating_mul(16))
            .saturating_add(episode.dangers.len().saturating_mul(768))
            .saturating_add(old_bytes.saturating_mul(8))
            .saturating_add(observer_id.len())
            .saturating_add(episode.id.len());
        let reservation = budget
            .reserve(bytes)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut candidates = Vec::new();
        if complete {
            let origin = observer
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            candidates.extend(
                physical
                    .bodies
                    .candidates(origin, vision.radius)
                    .into_iter()
                    .map(|(id, _)| id.to_owned()),
            );
        }
        let mut targets: Vec<&str> = candidates.iter().map(String::as_str).collect();
        if complete {
            for danger in episode.dangers.values() {
                if let NativeDanger::Body { source_id, .. } = danger {
                    if physical.entities.get(source_id).is_some()
                        && !targets.contains(&source_id.as_str())
                    {
                        targets.push(source_id);
                    }
                }
            }
        }
        let sight =
            SightBatch::prepare(physical, installed, observer_id, &targets, binding, budget)
                .map_err(sensor_error)?;
        Ok(Self {
            observer: physical
                .entities
                .handle(observer_id)
                .ok_or(ExecutionError::MissingEntity)?,
            observer_id: observer_id.to_owned(),
            episode_id: episode.id.clone(),
            at: physical.header.sim_time,
            complete,
            candidates,
            sight,
            reservation,
        })
    }

    pub(crate) fn queries(&self) -> &GeometryQueries {
        self.sight.queries()
    }

    pub(crate) fn finish(
        self,
        mutation: &mut PhysicalMutation<'_>,
        installed: &InstalledWorld,
        meters: &mut WorkMeters,
        answers: GeometryAnswers,
    ) -> Result<DangerAssessment, ExecutionError> {
        let sight = self.sight.finish(answers).map_err(sensor_error)?;
        let observer = mutation
            .state
            .entities
            .resolve(self.observer)
            .ok_or(ExecutionError::MissingEntity)?;
        let episode = observer
            .animal
            .as_ref()
            .and_then(|state| state.episode.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        if mutation.state.header.sim_time != self.at
            || episode.id != self.episode_id
            || sight.observer().actor_id != self.observer_id
            || Some(sight.observer().physical_life) != observer.physical_life()
        {
            return Err(ExecutionError::Invariant);
        }
        let pin = profile_key(&episode.profile_pin).map_err(|_| ExecutionError::Invariant)?;
        let profile = installed
            .response_profiles
            .get(&pin)
            .ok_or(ExecutionError::UnsupportedFamily)?
            .value();
        let mut visible = BTreeSet::new();
        let mut visibly_ended = BTreeSet::new();
        let mut newly_visible = Vec::new();
        let mut edits = Vec::new();
        for id in &self.candidates {
            meters.charge(&[(WorkUnit::Tests, 1)])?;
            let source = mutation
                .state
                .entities
                .get(id)
                .ok_or(ExecutionError::Invariant)?;
            let Some(actor) = source.actor.as_ref() else {
                continue;
            };
            if id == &self.observer_id {
                continue;
            }
            let life = actor.physical_life.unwrap_or(0);
            if !actor.alive || actor.incapacitated {
                let original = source
                    .remains
                    .as_ref()
                    .map_or(id.as_str(), |remains| remains.source_id.as_str());
                let key = body_danger_key(original, life).map_err(|_| ExecutionError::Invariant)?;
                if matches!(episode.dangers.get(&key), Some(NativeDanger::Body { .. }))
                    && seen(&sight, id)?
                {
                    visibly_ended.insert(key);
                }
                continue;
            }
            let key = body_danger_key(id, life).map_err(|_| ExecutionError::Invariant)?;
            let old = episode.dangers.get(&key);
            if (old.is_none() && !danger_source(profile, source)?) || !seen(&sight, id)? {
                continue;
            }
            visible.insert(key.clone());
            let point = source
                .world_position()
                .ok_or(ExecutionError::InvalidPosition)?;
            let extent = source.body_profile();
            let (fresh, changed, inside) = match old {
                Some(NativeDanger::Body {
                    visible,
                    point: before,
                    extent: prior,
                    inside_avoidance,
                    ..
                }) => (
                    !visible,
                    !visible
                        || before != &point
                        || prior.radius != extent.radius
                        || prior.height != extent.height,
                    *inside_avoidance,
                ),
                _ => (true, true, None),
            };
            if fresh {
                newly_visible.push(key.clone());
            }
            if changed {
                edits.push((
                    key,
                    Some(NativeDanger::Body {
                        source_id: id.clone(),
                        physical_life: life,
                        point,
                        extent: DangerExtent {
                            radius: extent.radius,
                            height: extent.height,
                        },
                        observed_at: self.at,
                        visible: true,
                        lost_at: None,
                        inside_avoidance: inside,
                    }),
                ));
            }
        }
        for (key, old) in &episode.dangers {
            meters.charge(&[(WorkUnit::Tests, 1)])?;
            if let NativeDanger::Body {
                source_id,
                physical_life,
                visible: was_visible,
                ..
            } = old
            {
                if !visible.contains(key) {
                    let ended = visibly_ended.contains(key)
                        || (self.complete
                            && mutation
                                .state
                                .entities
                                .get(source_id)
                                .is_some_and(|source| {
                                    source
                                        .actor
                                        .as_ref()
                                        .and_then(|actor| actor.physical_life)
                                        .unwrap_or(0)
                                        == *physical_life
                                        && sight.seen(source_id) == Some(true)
                                        && source.actor.as_ref().is_none_or(|actor| !actor.alive)
                                }));
                    if ended {
                        edits.push((key.clone(), None));
                        continue;
                    }
                    if *was_visible {
                        let mut lost = old.clone();
                        if let NativeDanger::Body {
                            visible, lost_at, ..
                        } = &mut lost
                        {
                            *visible = false;
                            *lost_at = Some(self.at);
                        }
                        if lost.expires_at(profile) <= self.at {
                            edits.push((key.clone(), None));
                        } else {
                            edits.push((key.clone(), Some(lost)));
                        }
                        continue;
                    }
                }
            }
            if old.expires_at(profile) <= self.at {
                edits.push((key.clone(), None));
            }
        }
        let changed = !edits.is_empty();
        if changed {
            let growth = edits
                .iter()
                .map(|(key, value)| {
                    size_of::<(String, NativeDanger)>() * 4
                        + key.capacity()
                        + match value {
                            Some(NativeDanger::Body { source_id, .. }) => source_id.capacity(),
                            Some(NativeDanger::Region { source, .. }) => source.id.capacity(),
                            None => 0,
                        }
                })
                .sum();
            mutation.reserve_response_growth(growth)?;
            let episode = mutation
                .snapshot_episode(&self.observer_id)?
                .as_mut()
                .ok_or(ExecutionError::Invariant)?;
            for (key, value) in edits {
                match value {
                    Some(value) => {
                        episode.dangers.insert(key, value);
                    }
                    None => {
                        episode.dangers.shift_remove(&key);
                    }
                }
            }
        }
        let episode = mutation
            .state
            .entities
            .get(&self.observer_id)
            .and_then(|entity| entity.animal.as_ref())
            .and_then(|state| state.episode.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let mut records: Vec<String> = if self.complete {
            episode.dangers.keys().cloned().collect()
        } else {
            Vec::new()
        };
        records.sort_by(|left, right| js_string_cmp(left, right));
        drop(sight);
        drop(visible);
        drop(visibly_ended);
        drop(self.candidates);
        let mut reservation = self.reservation;
        reservation
            .resize(
                size_of::<DangerAssessment>()
                    + self.observer_id.capacity()
                    + self.episode_id.capacity()
                    + (records.capacity() + newly_visible.capacity()) * size_of::<String>()
                    + records
                        .iter()
                        .chain(&newly_visible)
                        .map(String::capacity)
                        .sum::<usize>(),
            )
            .map_err(|_| ExecutionError::Capacity)?;
        Ok(DangerAssessment {
            observer: self.observer,
            observer_id: self.observer_id,
            episode_id: self.episode_id,
            at: self.at,
            complete: self.complete,
            changed,
            newly_visible,
            records,
            _reservation: reservation,
        })
    }
}

fn seen(sight: &SightResults, id: &str) -> Result<bool, ExecutionError> {
    sight.seen(id).ok_or(ExecutionError::Invariant)
}
