//! Saved pending sight continuation. A changed physical input schedules a real
//! detector opportunity; it is never an observation, disclosure or current grant.

use super::*;
use crate::execution::PhysicalChange;
use crate::host::retained_size::{HeapBytes, heap_record, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::ReceivedError;
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::state::Entity;
use crate::values::{
    deserialize_present_option, deserialize_present_safe_integer, deserialize_safe_integer,
    is_safe_record_id,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::mem::size_of;
mod save;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PendingSightScope {
    pub broad: bool,
    pub detail: bool,
    pub observer: bool,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub invalidated_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub invalidated_revision: Option<u64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub before: Option<Point>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub after: Option<Point>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SightMark {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    pub at: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SightProgress {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub detail: Option<SightMark>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub broad: Option<SightMark>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SensoryContinuation {
    pub epoch_at: f64,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub scopes: IndexMap<String, PendingSightScope>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub scope_count: u64,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub processed: IndexMap<String, SightProgress>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub broad_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub detail_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub all: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub invalidated_at: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub invalidated_revision: Option<u64>,
}

heap_record!(PendingSightScope {
    broad,
    detail,
    observer,
    revision,
    invalidated_at,
    invalidated_revision,
    before,
    after
});
heap_record!(SightMark { revision, at });
heap_record!(SightProgress { broad, detail });

#[derive(Clone, Copy, PartialEq)]
struct SensoryHeader {
    epoch_at: f64,
    revision: u64,
    scope_count: u64,
    broad_at: Option<f64>,
    detail_at: Option<f64>,
    all: Option<bool>,
    invalidated_at: Option<f64>,
    invalidated_revision: Option<u64>,
}
impl SensoryHeader {
    fn capture(state: &SensoryContinuation) -> Self {
        Self {
            epoch_at: state.epoch_at,
            revision: state.revision,
            scope_count: state.scope_count,
            broad_at: state.broad_at,
            detail_at: state.detail_at,
            all: state.all,
            invalidated_at: state.invalidated_at,
            invalidated_revision: state.invalidated_revision,
        }
    }
    fn restore(self, state: &mut SensoryContinuation) {
        state.epoch_at = self.epoch_at;
        state.revision = self.revision;
        state.scope_count = self.scope_count;
        state.broad_at = self.broad_at;
        state.detail_at = self.detail_at;
        state.all = self.all;
        state.invalidated_at = self.invalidated_at;
        state.invalidated_revision = self.invalidated_revision;
    }
}

#[derive(Clone, Copy)]
pub(crate) struct SensoryCheckpoint {
    operations: usize,
    header: Option<SensoryHeader>,
}

enum SensoryUndo {
    Scope {
        key: String,
        prior: Option<(usize, PendingSightScope)>,
    },
    Scopes(IndexMap<String, PendingSightScope>),
    Processed {
        key: String,
        prior: Option<(usize, SightProgress)>,
    },
}

pub(crate) struct SensoryJournal {
    undo: Vec<SensoryUndo>,
    reservation: ByteReservation,
}
fn invariant() -> ReceivedError {
    ReceivedError("Invalid native pending-sight continuation or rollback.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Native pending-sight continuation exceeds byte allowance.")
}
fn map_growth<K, V>(length: usize, allocated: usize) -> Result<usize, ReceivedError> {
    if length < allocated {
        return Ok(0);
    }
    // Reserve the next supported allocation bound once at actual growth. Charging
    // the complete existing map at each insert would turn a bounded scope into
    // quadratic admission cost without retaining additional memory.
    let next = length
        .checked_add(1)
        .and_then(|n| n.checked_mul(2))
        .ok_or_else(capacity)?;
    map_storage::<K, V>(next)
        .and_then(|bytes| bytes.checked_sub(map_storage::<K, V>(allocated)?))
        .ok_or_else(capacity)
}
fn next_revision(pending: &mut SensoryContinuation) -> Result<(), ReceivedError> {
    pending.revision = pending
        .revision
        .checked_add(1)
        .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invariant)?;
    Ok(())
}

impl SensoryJournal {
    pub(crate) fn new(budget: &ByteBudget) -> Result<Self, ReceivedError> {
        Ok(Self {
            undo: Vec::new(),
            reservation: budget.reserve(size_of::<Self>()).map_err(|_| capacity())?,
        })
    }
    pub(crate) fn checkpoint(&self, state: &ReceptionState) -> SensoryCheckpoint {
        SensoryCheckpoint {
            operations: self.undo.len(),
            header: state.sensory.as_ref().map(SensoryHeader::capture),
        }
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ReceivedError> {
        self.reservation
            .resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        self.undo.try_reserve(1).map_err(|_| capacity())
    }
    fn remember_scope(
        &mut self,
        pending: &SensoryContinuation,
        key: &str,
    ) -> Result<(), ReceivedError> {
        self.reserve(2 * size_of::<SensoryUndo>() + 2 * key.len())?;
        self.undo.push(SensoryUndo::Scope {
            key: key.to_owned(),
            prior: pending
                .scopes
                .get_full(key)
                .map(|(index, _, scope)| (index, *scope)),
        });
        Ok(())
    }
    fn remember_processed(
        &mut self,
        pending: &SensoryContinuation,
        key: &str,
    ) -> Result<(), ReceivedError> {
        self.reserve(2 * size_of::<SensoryUndo>() + 2 * key.len())?;
        self.undo.push(SensoryUndo::Processed {
            key: key.to_owned(),
            prior: pending
                .processed
                .get_full(key)
                .map(|(index, _, progress)| (index, *progress)),
        });
        Ok(())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut ReceptionState,
        checkpoint: SensoryCheckpoint,
    ) -> Result<(), ReceivedError> {
        if checkpoint.operations > self.undo.len() {
            return Err(invariant());
        }
        while self.undo.len() > checkpoint.operations {
            let pending = state.sensory.as_mut().ok_or_else(invariant)?;
            match self.undo.pop().ok_or_else(invariant)? {
                SensoryUndo::Scopes(prior) => pending.scopes = prior,
                SensoryUndo::Scope { key, prior } => {
                    pending.scopes.shift_remove(&key);
                    if let Some((index, scope)) = prior {
                        if index > pending.scopes.len() {
                            return Err(invariant());
                        }
                        pending.scopes.shift_insert(index, key, scope);
                    }
                }
                SensoryUndo::Processed { key, prior } => {
                    pending.processed.shift_remove(&key);
                    if let Some((index, progress)) = prior {
                        if index > pending.processed.len() {
                            return Err(invariant());
                        }
                        pending.processed.shift_insert(index, key, progress);
                    }
                }
            }
        }
        match checkpoint.header {
            Some(header) => header.restore(state.sensory.as_mut().ok_or_else(invariant)?),
            None => state.sensory = None,
        };
        Ok(())
    }
    pub(crate) fn discard_undo(&mut self) -> Result<(), ReceivedError> {
        self.undo.clear();
        self.reservation
            .resize(size_of::<Self>() + self.undo.capacity() * size_of::<SensoryUndo>())
            .map_err(|_| capacity())
    }
    pub(crate) fn initialize(
        &mut self,
        state: &mut ReceptionState,
        now: f64,
    ) -> Result<(), ReceivedError> {
        if state.sensory.is_none() {
            self.reserve(size_of::<SensoryContinuation>())?;
            state.sensory = Some(SensoryContinuation {
                epoch_at: now,
                revision: 0,
                scope_count: 0,
                scopes: IndexMap::new(),
                processed: IndexMap::new(),
                broad_at: None,
                detail_at: None,
                all: None,
                invalidated_at: None,
                invalidated_revision: None,
            });
        }
        Ok(())
    }
    fn widen(&mut self, pending: &mut SensoryContinuation) -> Result<(), ReceivedError> {
        self.reserve(
            2 * size_of::<SensoryUndo>() + pending.scopes.heap_bytes().ok_or_else(capacity)?,
        )?;
        pending.all = Some(true);
        for scope in pending.scopes.values() {
            if let Some(at) = scope.invalidated_at {
                pending.invalidated_at =
                    Some(pending.invalidated_at.map_or(at, |prior| prior.min(at)));
                let revision = scope.invalidated_revision.ok_or_else(invariant)?;
                pending.invalidated_revision =
                    Some(pending.invalidated_revision.unwrap_or(0).max(revision));
            }
        }
        self.undo
            .push(SensoryUndo::Scopes(std::mem::take(&mut pending.scopes)));
        pending.scope_count = 0;
        Ok(())
    }
    pub(crate) fn queue_physical_change(
        &mut self,
        state: &mut ReceptionState,
        now: f64,
        change: &PhysicalChange,
        scope_limit: usize,
    ) -> Result<(), ReceivedError> {
        let (id, before, after, invalidates) = match change {
            PhysicalChange::ObservationParameters {
                entity_id,
                request_detail,
            } => {
                return if *request_detail {
                    self.request_sight_work(
                        state,
                        now,
                        entity_id,
                        CurrentCheck::Detail,
                        scope_limit,
                    )
                } else {
                    Ok(())
                };
            }
            PhysicalChange::AnimalClock { .. }
            | PhysicalChange::Navigation { .. }
            | PhysicalChange::Behavior {
                outward_change: false,
                ..
            }
            | PhysicalChange::Attribute {
                outward_change: false,
                ..
            } => return Ok(()),
            PhysicalChange::Spatial {
                entity_id,
                before,
                after,
                discontinuity,
                ..
            } => (entity_id, Some(*before), Some(*after), *discontinuity),
            PhysicalChange::Participation { entity_id } => (entity_id, None, None, true),
            // rootMembershipChanged is a spatial notice with nullable bounds;
            // it is distinct from a global spatial-candidate definition change.
            PhysicalChange::Membership {
                entity_id,
                before,
                after,
            } => (entity_id, *before, *after, false),
            PhysicalChange::Body { entity_id }
            | PhysicalChange::Contribution { entity_id }
            | PhysicalChange::Behavior { entity_id, .. }
            | PhysicalChange::Attribute { entity_id, .. } => (entity_id, None, None, false),
        };
        let Some(pending) = state.sensory.as_mut() else {
            return Ok(());
        };
        next_revision(pending)?;
        pending.broad_at.get_or_insert(now);
        pending.detail_at.get_or_insert(now);
        if pending.all == Some(true) {
            if invalidates {
                pending.invalidated_at.get_or_insert(now);
                pending.invalidated_revision = Some(pending.revision);
            }
            return Ok(());
        }
        if !pending.scopes.contains_key(id) && pending.scope_count >= scope_limit as u64 {
            self.widen(pending)?;
            if invalidates {
                pending.invalidated_at.get_or_insert(now);
                pending.invalidated_revision = Some(pending.revision);
            }
            return Ok(());
        }
        self.remember_scope(pending, id)?;
        if !pending.scopes.contains_key(id) {
            self.reserve(
                map_growth::<String, PendingSightScope>(
                    pending.scopes.len(),
                    pending.scopes.capacity(),
                )? + id.len(),
            )?;
            pending.scopes.try_reserve(1).map_err(|_| capacity())?;
            pending.scopes.insert(
                id.clone(),
                PendingSightScope {
                    broad: true,
                    detail: true,
                    observer: true,
                    revision: pending.revision,
                    invalidated_at: None,
                    invalidated_revision: None,
                    before,
                    after: None,
                },
            );
            pending.scope_count += 1;
        }
        let scope = pending.scopes.get_mut(id).ok_or_else(invariant)?;
        scope.broad = true;
        scope.detail = true;
        scope.revision = pending.revision;
        if after.is_some() {
            scope.after = after;
        }
        if invalidates {
            scope.invalidated_at.get_or_insert(now);
            scope.invalidated_revision = Some(pending.revision);
        }
        Ok(())
    }
    pub(crate) fn request_sight_work(
        &mut self,
        state: &mut ReceptionState,
        now: f64,
        observer_id: &str,
        coverage: CurrentCheck,
        scope_limit: usize,
    ) -> Result<(), ReceivedError> {
        if coverage == CurrentCheck::None {
            return Err(invariant());
        }
        self.initialize(state, now)?;
        let pending = state.sensory.as_mut().ok_or_else(invariant)?;
        let prior = pending.scopes.get(observer_id).copied();
        if prior.is_some_and(|prior| {
            if coverage == CurrentCheck::Broad {
                prior.broad
            } else {
                prior.detail
            }
        }) {
            return Ok(());
        }
        next_revision(pending)?;
        pending.detail_at.get_or_insert(now);
        if coverage == CurrentCheck::Broad {
            pending.broad_at.get_or_insert(now);
        }
        if pending.all == Some(true) {
            return Ok(());
        }
        if prior.is_none() && pending.scope_count >= scope_limit as u64 {
            self.widen(pending)?;
            return Ok(());
        }
        self.remember_scope(pending, observer_id)?;
        if prior.is_none() {
            self.reserve(
                map_growth::<String, PendingSightScope>(
                    pending.scopes.len(),
                    pending.scopes.capacity(),
                )? + observer_id.len(),
            )?;
            pending.scopes.try_reserve(1).map_err(|_| capacity())?;
            pending.scope_count += 1;
        }
        let mut scope = prior.unwrap_or(PendingSightScope {
            broad: false,
            detail: false,
            observer: true,
            revision: 0,
            invalidated_at: None,
            invalidated_revision: None,
            before: None,
            after: None,
        });
        scope.broad = coverage == CurrentCheck::Broad || scope.broad;
        scope.detail = true;
        scope.observer = true;
        scope.revision = pending.revision;
        pending.scopes.insert(observer_id.to_owned(), scope);
        Ok(())
    }

    pub(crate) fn complete_sight_work(
        &mut self,
        state: &mut ReceptionState,
        physical: &PhysicalState,
        installed: &InstalledWorld,
        observers: &[crate::state::EntityHandle],
        policies: &mut RoutinePolicyCache,
        completed: &IndexMap<String, CurrentCheck>,
        revision: u64,
    ) -> Result<(), ReceivedError> {
        if state.sensory.is_none() || completed.is_empty() {
            return Ok(());
        }
        let pending = state.sensory.as_mut().ok_or_else(invariant)?;
        for (key, kind) in completed {
            if *kind == CurrentCheck::None {
                return Err(invariant());
            }
            self.remember_processed(pending, key)?;
            if !pending.processed.contains_key(key) {
                self.reserve(
                    map_growth::<String, SightProgress>(
                        pending.processed.len(),
                        pending.processed.capacity(),
                    )? + key.len(),
                )?;
                pending.processed.try_reserve(1).map_err(|_| capacity())?;
            }
            let progress = pending
                .processed
                .entry(key.clone())
                .or_insert(SightProgress {
                    broad: None,
                    detail: None,
                });
            let mark = SightMark {
                revision,
                at: physical.header.sim_time,
            };
            progress.detail = Some(mark);
            if *kind == CurrentCheck::Broad {
                progress.broad = Some(mark);
            }
        }
        let mut broad = true;
        let mut detail = true;
        let mut active = Vec::new();
        for handle in observers {
            let Some(observer) = physical.entities.resolve(*handle) else {
                return Err(invariant());
            };
            let id = &observer.id;
            if !routine_observation_relevant_parts(state.perception_episodes.as_ref(), observer)
                || installed
                    .capabilities
                    .capability_blocked(Some(observer), "perception")
                    .map_err(|_| invariant())?
            {
                continue;
            }
            let prepared = policies.policy(observer)?;
            let Some(policy) = prepared
                .sight
                .as_ref()
                .filter(|policy| policy.mode == SightTiming::Cadence)
            else {
                continue;
            };
            let progress = pending.processed.get(&policy.key);
            broad &= progress
                .and_then(|progress| progress.broad)
                .is_some_and(|mark| mark.revision >= pending.revision);
            if policy.detail_seconds.is_some()
                && state
                    .perception_evidence
                    .as_ref()
                    .and_then(|owners| owners.get(id))
                    .and_then(|owner| owner.attention.as_ref())
                    .is_some_and(|attention| !attention.entries.is_empty())
            {
                detail &= progress
                    .and_then(|progress| progress.detail)
                    .is_some_and(|mark| mark.revision >= pending.revision);
            }
            if !active.contains(&policy.key) {
                self.reserve(size_of::<String>() * 2 + policy.key.capacity())?;
                active.push(policy.key.clone());
            }
        }
        for index in (0..pending.processed.len()).rev() {
            let (key, _) = pending.processed.get_index(index).ok_or_else(invariant)?;
            if !active.contains(key) {
                let key = key.clone();
                self.remember_processed(pending, &key)?;
                pending.processed.shift_remove(&key);
            }
        }
        if broad {
            pending.broad_at = None;
        }
        if detail {
            pending.detail_at = None;
        }
        for index in (0..pending.scopes.len()).rev() {
            let (id, scope) = pending.scopes.get_index(index).ok_or_else(invariant)?;
            let id = id.clone();
            let scope = *scope;
            self.remember_scope(pending, &id)?;
            if (broad || !scope.broad) && (detail || !scope.detail) {
                pending.scopes.shift_remove(&id);
                pending.scope_count -= 1;
            } else {
                let scope = pending.scopes.get_mut(&id).ok_or_else(invariant)?;
                if broad {
                    scope.broad = false;
                }
                if detail {
                    scope.detail = false;
                }
            }
        }
        if pending.broad_at.is_none() && pending.detail_at.is_none() {
            pending.all = None;
            pending.invalidated_at = None;
            pending.invalidated_revision = None;
        }
        Ok(())
    }
}

fn routine_observation_relevant_parts(
    episodes: Option<&IndexMap<String, IndexMap<String, String>>>,
    observer: &Entity,
) -> bool {
    let Some(actor) = observer.actor.as_ref() else {
        return false;
    };
    actor.alive
        && observer.actively_participates()
        && (actor
            .capabilities
            .as_ref()
            .map_or(actor.controller != "native", |capabilities| {
                capabilities.memory
            })
            || observer
                .animal
                .as_ref()
                .is_some_and(|animal| animal.episode.is_some())
            || episodes
                .and_then(|episodes| episodes.get(&observer.id))
                .is_some_and(|episodes| !episodes.is_empty()))
}

pub(crate) fn routine_observation_relevant(state: &ReceptionState, observer: &Entity) -> bool {
    routine_observation_relevant_parts(state.perception_episodes.as_ref(), observer)
}

fn pending_sight_at(
    pending: &SensoryContinuation,
    policy: &super::sensors::RoutineSightPolicy,
    detail: bool,
) -> Option<f64> {
    let at = if detail {
        pending.detail_at
    } else {
        pending.broad_at
    }?;
    let period = if detail {
        policy.detail_seconds
    } else {
        policy.seconds
    }?;
    let progress = pending.processed.get(&policy.key).and_then(|progress| {
        if detail {
            progress.detail
        } else {
            progress.broad
        }
    });
    if progress.is_some_and(|progress| progress.revision >= pending.revision) {
        return None;
    }
    Some(next_sample_at(
        pending.epoch_at,
        period,
        at.max(progress.map_or(pending.epoch_at, |progress| progress.at)),
    ))
}

pub(crate) fn next_routine_sight_at(
    state: &ReceptionState,
    installed: &InstalledWorld,
    observer: &Entity,
) -> Result<Option<f64>, ReceivedError> {
    let Some(pending) = state.sensory.as_ref() else {
        return Ok(None);
    };
    let Some(policy) = super::sensors::routine_sight_policy(installed, observer)
        .filter(|policy| policy.mode == SightTiming::Cadence && policy.seconds.is_some())
    else {
        return Ok(None);
    };
    if !routine_observation_relevant(state, observer)
        || installed
            .capabilities
            .capability_blocked(Some(observer), "perception")
            .map_err(|_| invariant())?
    {
        return Ok(None);
    }
    let mut at = pending_sight_at(pending, &policy, false);
    if policy.detail_seconds.is_some()
        && pending.detail_at.is_some()
        && state
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&observer.id))
            .and_then(|owner| owner.attention.as_ref())
            .is_some_and(|attention| !attention.entries.is_empty())
    {
        if let Some(detail) = pending_sight_at(pending, &policy, true) {
            at = Some(at.map_or(detail, |broad| broad.min(detail)));
        }
    }
    // No deadline query advances a clock or samples a body.
    Ok(at.filter(|at| at.is_finite()))
}

pub(crate) fn sight_scope_due(
    state: &ReceptionState,
    physical: &PhysicalState,
    installed: &InstalledWorld,
    observer: &Entity,
) -> Option<CurrentCheck> {
    let policy = super::sensors::routine_sight_policy(installed, observer)
        .filter(|policy| policy.mode == SightTiming::Cadence && policy.seconds.is_some())?;
    sight_scope_due_prepared(state, physical, observer, Some(&policy))
}

pub(super) fn sight_scope_due_prepared(
    state: &ReceptionState,
    physical: &PhysicalState,
    observer: &Entity,
    policy: Option<&super::sensors::RoutineSightPolicy>,
) -> Option<CurrentCheck> {
    let pending = state.sensory.as_ref()?;
    let policy =
        policy.filter(|policy| policy.mode == SightTiming::Cadence && policy.seconds.is_some())?;
    if pending_sight_at(pending, &policy, false).is_some_and(|at| at <= physical.header.sim_time) {
        return Some(CurrentCheck::Broad);
    }
    if policy.detail_seconds.is_some()
        && pending.detail_at.is_some()
        && pending_sight_at(pending, &policy, true).is_some_and(|at| at <= physical.header.sim_time)
        && state
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(&observer.id))
            .and_then(|owner| owner.attention.as_ref())
            .is_some_and(|attention| !attention.entries.is_empty())
    {
        return Some(CurrentCheck::Detail);
    }
    None
}

impl SensoryContinuation {
    pub fn invalidated_revision_for(&self, observer_id: &str, subject_id: &str) -> Option<u64> {
        [
            self.invalidated_revision,
            self.scopes
                .get(observer_id)
                .and_then(|scope| scope.invalidated_revision),
            self.scopes
                .get(subject_id)
                .and_then(|scope| scope.invalidated_revision),
        ]
        .into_iter()
        .flatten()
        .max()
    }
    pub fn validate(&self, now: f64, scope_limit: usize) -> Result<(), ReceivedError> {
        let time = |time: f64| time.is_finite() && time >= 0.0 && time <= now;
        let revision = |revision: u64| revision <= self.revision;
        if !time(self.epoch_at)
            || self.scope_count != self.scopes.len() as u64
            || self.scope_count > scope_limit as u64
            || self.all == Some(false)
            || (self.all == Some(true) && self.scope_count != 0)
            || [self.broad_at, self.detail_at, self.invalidated_at]
                .into_iter()
                .flatten()
                .any(|at| !time(at))
            || self
                .invalidated_revision
                .is_some_and(|value| !revision(value))
        {
            return Err(invariant());
        }
        for (id, scope) in &self.scopes {
            if !is_safe_record_id(id)
                || (!scope.broad && !scope.detail)
                || !revision(scope.revision)
                || scope.invalidated_at.is_some_and(|at| !time(at))
                || scope
                    .invalidated_revision
                    .is_some_and(|value| !revision(value))
                || [scope.before, scope.after]
                    .into_iter()
                    .flatten()
                    .any(|point| {
                        !point.x.is_finite() || !point.y.is_finite() || !point.z.is_finite()
                    })
            {
                return Err(invariant());
            }
        }
        for (key, progress) in &self.processed {
            if !is_safe_record_id(key)
                || [progress.broad, progress.detail]
                    .into_iter()
                    .flatten()
                    .any(|mark| !revision(mark.revision) || !time(mark.at))
            {
                return Err(invariant());
            }
        }
        Ok(())
    }
}
