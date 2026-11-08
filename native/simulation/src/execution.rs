//! One operation-local physical undo owner, shared by nested native commands.
//! It records changed subrecords, never a world/actor clone. Receiver/history
//! journals must join this same candidate before an actual Ready path exists.

use crate::events::{
    AcquiredOccurrence, CompletedOccurrence, EventEmissionIntent, OccurrenceCheckpoint,
};
use crate::host::{ByteBudget, ByteReservation, CapacityError};
use crate::identity::{IdentityExhausted, IdentityState, IssuedIdentity, MAX_SAFE_INTEGER};
use crate::received::{ReceivedValuesCheckpoint, TemporalCheckpoint};
use crate::reception::{OriginalCheckpoint, OriginalJournal, SensoryCheckpoint, SensoryJournal};
use crate::simulation::{PhysicalState, SimulationState};
use crate::state::{Action, EntityHandle, NativeInterval, Placement, Point};
use crate::status::AttributeDefinition;
use crate::values::{
    AttributeState, NativeValueBinding, NativeValueWindow, StatusInstance, ValueEntityMut,
    ValueError, materialize_episode,
};
use crate::work::{InvocationEdit, WorkDemand, WorkError, WorkPlan, WorkRequest, WorkUndo};
use indexmap::IndexMap;
use std::collections::BTreeSet;
use std::mem::size_of;

mod semantic;

#[derive(Debug)]
pub(crate) enum ExecutionError {
    Capacity,
    MissingEntity,
    MissingActor,
    MissingBody,
    UnsupportedFamily,
    InvalidPosition,
    InvalidHealth,
    InvalidCheckpoint,
    UnfinishedOccurrence,
    Identity,
    Invariant,
    Values(ValueError),
    Work(WorkError),
    Received(crate::received::ReceivedError),
    OwnerRollback,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct OccurrenceToken {
    serial: u64,
    id: String,
    order: u64,
    sequence: u64,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum OccurrencePhase {
    Acquiring,
    Acquired,
}
#[derive(Clone)]
struct PendingOccurrence {
    token: OccurrenceToken,
    phase: OccurrencePhase,
}

pub(crate) struct StagedOccurrence {
    pub token: OccurrenceToken,
    pub intent: EventEmissionIntent,
    pub id: String,
    pub order: u64,
    pub sequence: u64,
    pub at: f64,
}

struct CandidateFrame {
    physical: PhysicalCheckpoint,
    received: Option<ReceivedValuesCheckpoint>,
    occurrences: OccurrenceCheckpoint,
    temporal: TemporalCheckpoint,
    originals: OriginalCheckpoint,
    sensory: SensoryCheckpoint,
    sensory_cursor: PhysicalChangeCursor,
    // This is only the finite synchronous emitter call stack, not event bodies,
    // physical state or accumulated history. Saved work limits bound its depth.
    pending: Vec<PendingOccurrence>,
}
pub(crate) struct CandidateCheckpoint {
    depth: usize,
}

/// All owner journals enter/leave one nested checkpoint together. No Ready or
/// accept path is provided until actual receiving/history mutation and changed
/// record encoding have joined this owner completely.
pub(crate) struct CandidateJournal {
    pub physical: PhysicalJournal,
    pub meters: crate::work::WorkMeters,
    pub originals: OriginalJournal,
    pub sensory: SensoryJournal,
    root_received: Option<ReceivedValuesCheckpoint>,
    root_occurrences: OccurrenceCheckpoint,
    root_temporal: TemporalCheckpoint,
    root_originals: OriginalCheckpoint,
    root_sensory: SensoryCheckpoint,
    sensory_cursor: PhysicalChangeCursor,
    frames: Vec<CandidateFrame>,
    pending: Vec<PendingOccurrence>,
    next_occurrence: u64,
}
impl CandidateJournal {
    pub(crate) fn begin(
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let group = state.installed.work_policy.policy().group;
        let mut physical = PhysicalJournal::begin(&state.physical, budget)?;
        physical.reserve(size_of::<Self>() + crate::work::WorkMeters::heap_bound(group)?)?;
        let originals = OriginalJournal::new(budget).map_err(|_| ExecutionError::Capacity)?;
        let root_originals = originals.checkpoint();
        let sensory = SensoryJournal::new(budget).map_err(|_| ExecutionError::Capacity)?;
        let root_sensory = sensory.checkpoint(&state.reception);
        let sensory_cursor = physical.change_cursor();
        Ok(Self {
            physical,
            meters: crate::work::WorkMeters::new(group)?,
            originals,
            sensory,
            root_received: state
                .reception
                .received_values
                .as_ref()
                .map(|v| v.checkpoint()),
            root_occurrences: state.occurrences.checkpoint(),
            root_temporal: state.temporal.checkpoint(),
            root_originals,
            root_sensory,
            sensory_cursor,
            frames: Vec::new(),
            pending: Vec::new(),
            next_occurrence: 0,
        })
    }
    pub(crate) fn checkpoint(
        &mut self,
        state: &SimulationState,
    ) -> Result<CandidateCheckpoint, ExecutionError> {
        self.physical.reserve(
            size_of::<CandidateFrame>() * 2
                + self
                    .pending
                    .iter()
                    .map(|p| size_of::<PendingOccurrence>() * 2 + p.token.id.len())
                    .sum::<usize>(),
        )?;
        self.frames
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let physical = self.physical.checkpoint(&state.physical)?;
        let token = CandidateCheckpoint {
            depth: self.frames.len(),
        };
        self.frames.push(CandidateFrame {
            physical,
            received: state
                .reception
                .received_values
                .as_ref()
                .map(|v| v.checkpoint()),
            occurrences: state.occurrences.checkpoint(),
            temporal: state.temporal.checkpoint(),
            originals: self.originals.checkpoint(),
            sensory: self.sensory.checkpoint(&state.reception),
            sensory_cursor: self.sensory_cursor,
            pending: self.pending.clone(),
        });
        Ok(token)
    }
    pub(crate) fn keep(&mut self, token: CandidateCheckpoint) -> Result<(), ExecutionError> {
        if self.frames.len() != token.depth + 1 {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let frame = self.frames.pop().ok_or(ExecutionError::InvalidCheckpoint)?;
        self.physical.keep(frame.physical)
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut SimulationState,
        token: CandidateCheckpoint,
    ) -> Result<(), ExecutionError> {
        if self.frames.len() != token.depth + 1 {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let frame = self.frames.pop().ok_or(ExecutionError::InvalidCheckpoint)?;
        state
            .occurrences
            .rollback_to(frame.occurrences)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        state
            .temporal
            .rollback_to(frame.temporal)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.originals
            .rollback_to(&mut state.reception, frame.originals)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.sensory
            .rollback_to(&mut state.reception, frame.sensory)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.sensory_cursor = frame.sensory_cursor;
        match (frame.received, state.reception.received_values.as_mut()) {
            (Some(checkpoint), Some(values)) => values
                .rollback_to(checkpoint)
                .map_err(|_| ExecutionError::OwnerRollback)?,
            (None, _) => {
                state.reception.received_values = None;
            }
            _ => return Err(ExecutionError::OwnerRollback),
        }
        self.pending = frame.pending;
        self.physical
            .rollback_to(&mut state.physical, frame.physical)
    }
    pub(crate) fn rollback_all(
        &mut self,
        state: &mut SimulationState,
    ) -> Result<(), ExecutionError> {
        state
            .occurrences
            .rollback_to(self.root_occurrences)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        state
            .temporal
            .rollback_to(self.root_temporal)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.originals
            .rollback_to(&mut state.reception, self.root_originals)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.sensory
            .rollback_to(&mut state.reception, self.root_sensory)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.sensory_cursor = PhysicalChangeCursor { at: 0 };
        match (self.root_received, state.reception.received_values.as_mut()) {
            (Some(checkpoint), Some(values)) => values
                .rollback_to(checkpoint)
                .map_err(|_| ExecutionError::OwnerRollback)?,
            (None, _) => {
                state.reception.received_values = None;
            }
            _ => return Err(ExecutionError::OwnerRollback),
        }
        self.frames.clear();
        self.pending.clear();
        self.physical.rollback_all(&mut state.physical)
    }
}

pub(crate) struct CoreMutation<'a> {
    pub state: &'a mut SimulationState,
    pub journal: &'a mut CandidateJournal,
}
impl CoreMutation<'_> {
    pub(crate) fn physical(&mut self) -> PhysicalMutation<'_> {
        PhysicalMutation {
            state: &mut self.state.physical,
            journal: &mut self.journal.physical,
        }
    }
    pub(crate) fn sync_sensory_changes(&mut self) -> Result<(), ExecutionError> {
        let through = self.journal.physical.change_cursor();
        for change in self
            .journal
            .physical
            .changes_since(self.journal.sensory_cursor)?
        {
            self.journal
                .sensory
                .queue_physical_change(
                    &mut self.state.reception,
                    self.state.physical.header.sim_time,
                    change,
                    self.state.installed.maximum_change_scopes,
                )
                .map_err(ExecutionError::Received)?;
        }
        self.journal.sensory_cursor = through;
        Ok(())
    }
    /// Allocate in source order before any receiver can allocate its own source
    /// IDs. Only an already acquired parent's native reactions may nest events.
    pub(crate) fn stage_event(
        &mut self,
        intent: EventEmissionIntent,
    ) -> Result<StagedOccurrence, ExecutionError> {
        if self
            .journal
            .pending
            .last()
            .is_some_and(|p| p.phase != OccurrencePhase::Acquired)
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let max_depth = self
            .state
            .installed
            .work_policy
            .policy()
            .group
            .depth
            .ok_or(ExecutionError::Invariant)?;
        if self.journal.pending.len() as u64 >= max_depth {
            return Err(ExecutionError::Work(WorkError::Contract(
                crate::work::WorkUnit::Depth,
            )));
        }
        let serial = self.journal.next_occurrence;
        let next = serial.checked_add(1).ok_or(ExecutionError::Invariant)?;
        let sequence = self
            .state
            .physical
            .header
            .sequence
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        self.journal
            .physical
            .reserve(size_of::<PendingOccurrence>() * 2 + 128)?;
        self.journal
            .pending
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let issued = self.state.physical.identity.allocate("event")?;
        let order = self.state.physical.identity.next_id();
        let token = OccurrenceToken {
            serial,
            id: issued.id.clone(),
            order,
            sequence,
        };
        self.journal.pending.push(PendingOccurrence {
            token: token.clone(),
            phase: OccurrencePhase::Acquiring,
        });
        self.journal.next_occurrence = next;
        Ok(StagedOccurrence {
            token,
            intent,
            id: issued.id,
            order,
            sequence,
            at: self.state.physical.header.sim_time,
        })
    }
    pub(crate) fn acquired_occurrence(
        &mut self,
        acquired: &AcquiredOccurrence,
    ) -> Result<(), ExecutionError> {
        let pending = self
            .journal
            .pending
            .last_mut()
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        if pending.phase != OccurrencePhase::Acquiring
            || pending.token.id != acquired.event_id()
            || pending.token.order != acquired.order()
            || pending.token.sequence != acquired.sequence()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        pending.phase = OccurrencePhase::Acquired;
        Ok(())
    }
    pub(crate) fn complete_occurrence(
        &mut self,
        complete: CompletedOccurrence,
    ) -> Result<(), ExecutionError> {
        let pending = self
            .journal
            .pending
            .last()
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        if pending.phase != OccurrencePhase::Acquired
            || pending.token.id != complete.event_id()
            || pending.token.order != complete.order()
            || pending.token.sequence != complete.sequence()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        self.journal.pending.pop();
        Ok(())
    }
}
impl From<CapacityError> for ExecutionError {
    fn from(_: CapacityError) -> Self {
        Self::Capacity
    }
}
impl From<ValueError> for ExecutionError {
    fn from(value: ValueError) -> Self {
        Self::Values(value)
    }
}
impl From<WorkError> for ExecutionError {
    fn from(value: WorkError) -> Self {
        Self::Work(value)
    }
}
impl From<IdentityExhausted> for ExecutionError {
    fn from(_: IdentityExhausted) -> Self {
        Self::Identity
    }
}

#[derive(Clone, Debug)]
pub(crate) enum PhysicalChange {
    Spatial {
        entity_id: String,
        before: Point,
        after: Point,
        support_unchanged: bool,
        discontinuity: bool,
    },
    Body {
        entity_id: String,
    },
    Behavior {
        entity_id: String,
        outward_change: bool,
    },
    Attribute {
        entity_id: String,
        outward_change: bool,
    },
    AnimalClock {
        entity_id: String,
    },
}
#[derive(Clone, Copy)]
pub(crate) struct PhysicalChangeCursor {
    at: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Continuity {
    Physical,
    Relocation,
}
#[derive(Clone, Copy, Debug)]
pub(crate) struct MovementWrite {
    pub steps: u64,
    pub heading: Option<f64>,
    pub continuity: Continuity,
}
#[derive(Clone, Copy)]
pub(crate) enum PlanGenerationWrite {
    Preserve,
    Advance,
}
pub(crate) struct ActionWrite {
    pub generation: PlanGenerationWrite,
    pub behavior: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum UndoKey {
    Placement(usize, u64),
    Health(usize, u64),
    Action(usize, u64),
    ActionPath(usize, u64),
    AnimalEpisode(usize, u64),
    AnimalWander(usize, u64),
    AnimalPhysicalLife(usize, u64),
    AcousticPattern(usize, u64, String),
    SemanticMeta(usize, u64),
    SemanticResolved(usize, u64),
    Episode(String),
    Invocation(String),
}

struct ClockSnapshot {
    sequence: u64,
    sim_time: f64,
    paused: bool,
    native_interval: Option<NativeInterval>,
}
impl ClockSnapshot {
    fn capture(state: &PhysicalState) -> Self {
        Self {
            sequence: state.header.sequence,
            sim_time: state.header.sim_time,
            paused: state.header.paused,
            native_interval: state.header.native_interval.clone(),
        }
    }
    fn restore(self, state: &mut PhysicalState) {
        state.header.sequence = self.sequence;
        state.header.sim_time = self.sim_time;
        state.header.paused = self.paused;
        state.header.native_interval = self.native_interval;
    }
}

struct Frame {
    serial: u64,
    undo_start: usize,
    changes_start: usize,
    clock: ClockSnapshot,
    identity: IdentityState,
    written: BTreeSet<UndoKey>,
}
#[derive(Clone, Copy)]
pub(crate) struct PhysicalCheckpoint {
    depth: usize,
    serial: u64,
}

struct EpisodeUndo {
    episode: String,
    binding: (usize, NativeValueBinding),
    elapsed_seconds: f64,
    sim_time: f64,
    binding_count: u64,
    subject_index: usize,
    links: Vec<(usize, String, String)>,
    entity: EntityHandle,
    attributes: Vec<(String, AttributeState)>,
    status_id: String,
    status: StatusInstance,
}
enum Undo {
    Placement {
        entity: EntityHandle,
        before: Placement,
        heading: f64,
    },
    Health {
        entity: EntityHandle,
        before: f64,
    },
    Action {
        entity: EntityHandle,
        before: Option<Action>,
        plan_generation: u64,
    },
    ActionPath {
        entity: EntityHandle,
        action_id: String,
        before: Vec<crate::state::SurfacePoint>,
    },
    AnimalEpisode {
        entity: EntityHandle,
        before: Option<crate::native_response::NativeResponseEpisode>,
    },
    AnimalWander {
        entity: EntityHandle,
        before: crate::native_response::WanderClock,
    },
    AnimalPhysicalLife {
        entity: EntityHandle,
        before: u64,
    },
    AcousticPattern {
        entity: EntityHandle,
        key: String,
        before: Option<(usize, crate::native_response::AcousticPattern)>,
    },
    SemanticMeta {
        entity: EntityHandle,
        interval: u64,
        discovery: String,
        reservation: Option<String>,
        occupied_purpose: Option<String>,
    },
    SemanticResolved {
        entity: EntityHandle,
        before: IndexMap<String, crate::state::ResolvedSemanticCause>,
    },
    Episode(EpisodeUndo),
    Work(WorkUndo),
}

/// The reservation stays alive until rollback/acceptance has destroyed or
/// transferred all owned scratch. Nested rollback does not claim freed capacity
/// while Vec allocations and before-values are still retained by this batch.
pub(crate) struct PhysicalJournal {
    reservation: ByteReservation,
    undo: Vec<Undo>,
    frames: Vec<Frame>,
    changes: Vec<PhysicalChange>,
    next_frame: u64,
}
impl PhysicalJournal {
    pub(crate) fn begin(
        state: &PhysicalState,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let mut value = Self {
            reservation: budget.reserve(size_of::<Self>() + size_of::<Frame>())?,
            undo: Vec::new(),
            frames: Vec::with_capacity(1),
            changes: Vec::new(),
            next_frame: 1,
        };
        value.frames.push(Frame {
            serial: 0,
            undo_start: 0,
            changes_start: 0,
            clock: ClockSnapshot::capture(state),
            identity: state.identity,
            written: BTreeSet::new(),
        });
        Ok(value)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let total = self
            .reservation
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(total)?;
        Ok(())
    }
    pub(crate) fn checkpoint(
        &mut self,
        state: &PhysicalState,
    ) -> Result<PhysicalCheckpoint, ExecutionError> {
        let serial = self.next_frame;
        self.next_frame = serial
            .checked_add(1)
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        self.reserve(size_of::<Frame>() * 2)?;
        self.frames
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let token = PhysicalCheckpoint {
            depth: self.frames.len(),
            serial,
        };
        self.frames.push(Frame {
            serial,
            undo_start: self.undo.len(),
            changes_start: self.changes.len(),
            clock: ClockSnapshot::capture(state),
            identity: state.identity,
            written: BTreeSet::new(),
        });
        Ok(token)
    }
    fn check_top(&self, checkpoint: PhysicalCheckpoint) -> Result<(), ExecutionError> {
        if checkpoint.depth == 0
            || self.frames.len() != checkpoint.depth + 1
            || self
                .frames
                .last()
                .is_none_or(|f| f.serial != checkpoint.serial)
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        Ok(())
    }
    pub(crate) fn keep(&mut self, checkpoint: PhysicalCheckpoint) -> Result<(), ExecutionError> {
        self.check_top(checkpoint)?;
        let child = self.frames.pop().ok_or(ExecutionError::InvalidCheckpoint)?;
        self.frames
            .last_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .written
            .extend(child.written);
        Ok(())
    }
    pub(crate) fn rollback_to(
        &mut self,
        state: &mut PhysicalState,
        checkpoint: PhysicalCheckpoint,
    ) -> Result<(), ExecutionError> {
        self.check_top(checkpoint)?;
        let child = self.frames.pop().ok_or(ExecutionError::InvalidCheckpoint)?;
        self.rollback_frame(state, child)
    }
    pub(crate) fn rollback_all(&mut self, state: &mut PhysicalState) -> Result<(), ExecutionError> {
        while let Some(frame) = self.frames.pop() {
            self.rollback_frame(state, frame)?;
        }
        Ok(())
    }
    fn rollback_frame(
        &mut self,
        state: &mut PhysicalState,
        frame: Frame,
    ) -> Result<(), ExecutionError> {
        while self.undo.len() > frame.undo_start {
            let undo = self.undo.pop().ok_or(ExecutionError::Invariant)?;
            match undo {
                Undo::Placement {
                    entity,
                    before,
                    heading,
                } => {
                    let entity = state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?;
                    entity.placement = Some(before);
                    entity.spatial.heading = heading;
                    let id = entity.id.clone();
                    state.bodies.refresh(&state.entities, &id);
                }
                Undo::Health { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .health = before
                }
                Undo::Action {
                    entity,
                    before,
                    plan_generation,
                } => {
                    let actor = state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?;
                    actor.action = before;
                    actor.plan_generation = plan_generation;
                }
                Undo::ActionPath {
                    entity,
                    action_id,
                    before,
                } => {
                    let action = state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .and_then(|a| a.action.as_mut())
                        .ok_or(ExecutionError::Invariant)?;
                    if action.id != action_id {
                        return Err(ExecutionError::Invariant);
                    }
                    action.path = before;
                }
                Undo::AnimalEpisode { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.animal.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .episode = before;
                }
                Undo::AnimalWander { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.animal.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .wander = before;
                }
                Undo::AnimalPhysicalLife { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.animal.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .physical_life = before;
                }
                Undo::AcousticPattern {
                    entity,
                    key,
                    before,
                } => {
                    let patterns = &mut state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.animal.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .acoustic_patterns;
                    patterns.shift_remove(&key);
                    if let Some((index, value)) = before {
                        patterns.shift_insert(index, key, value);
                    }
                }
                Undo::SemanticMeta {
                    entity,
                    interval,
                    discovery,
                    reservation,
                    occupied_purpose,
                } => {
                    let semantic = state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .and_then(|a| a.agency.semantic.as_mut())
                        .ok_or(ExecutionError::Invariant)?;
                    semantic.interval = interval;
                    semantic.discovery = discovery;
                    semantic.reservation = reservation;
                    semantic.occupied_purpose = occupied_purpose;
                }
                Undo::SemanticResolved { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .and_then(|a| a.agency.semantic.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .resolved = before;
                }
                Undo::Episode(undo) => restore_episode(state, undo)?,
                Undo::Work(undo) => state.work.rollback(undo)?,
            }
        }
        self.changes.truncate(frame.changes_start);
        frame.clock.restore(state);
        // A rejected private candidate issued nothing. High-water preservation
        // belongs only to the separate accepted gameplay-restore owner.
        state.identity = frame.identity;
        Ok(())
    }
    fn first(&self, key: &UndoKey) -> Result<bool, ExecutionError> {
        Ok(!self
            .frames
            .last()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .written
            .contains(key))
    }
    fn retain(&mut self, key: UndoKey, undo: Undo) -> Result<(), ExecutionError> {
        self.undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        self.frames
            .last_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .written
            .insert(key);
        self.undo.push(undo);
        Ok(())
    }
    fn change(&mut self, change: PhysicalChange) -> Result<(), ExecutionError> {
        self.changes
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        self.changes.push(change);
        Ok(())
    }
    pub(crate) fn changes(&self) -> &[PhysicalChange] {
        &self.changes
    }
    pub(crate) fn change_cursor(&self) -> PhysicalChangeCursor {
        PhysicalChangeCursor {
            at: self.changes.len(),
        }
    }
    pub(crate) fn changes_since(
        &self,
        cursor: PhysicalChangeCursor,
    ) -> Result<&[PhysicalChange], ExecutionError> {
        self.changes
            .get(cursor.at..)
            .ok_or(ExecutionError::InvalidCheckpoint)
    }
    pub(crate) fn scratch_bytes(&self) -> usize {
        self.reservation.bytes()
    }
}

pub(crate) struct PhysicalMutation<'a> {
    pub state: &'a mut PhysicalState,
    pub journal: &'a mut PhysicalJournal,
}
impl PhysicalMutation<'_> {
    pub(crate) fn draw(&mut self) -> f64 {
        self.state.identity.draw()
    }
    pub(crate) fn allocate(&mut self, prefix: &str) -> Result<IssuedIdentity, ExecutionError> {
        Ok(self.state.identity.allocate(prefix)?)
    }
    pub(crate) fn reserve_response_growth(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.journal.reserve(bytes)
    }

    /// The animal controller owns these bounded subrecords. Their guards join
    /// the same physical checkpoint used by action and value writes.
    pub(crate) fn snapshot_episode(
        &mut self,
        id: &str,
    ) -> Result<&mut Option<crate::native_response::NativeResponseEpisode>, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AnimalEpisode(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            let before = &self
                .state
                .entities
                .resolve(handle)
                .and_then(|e| e.animal.as_ref())
                .ok_or(ExecutionError::UnsupportedFamily)?
                .episode;
            self.journal.reserve(
                crate::native_response::episode_clone_bytes(before)
                    .checked_add(size_of::<Undo>() * 2)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.journal.retain(
                key,
                Undo::AnimalEpisode {
                    entity: handle,
                    before: before.clone(),
                },
            )?;
        }
        Ok(&mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.animal.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .episode)
    }
    pub(crate) fn snapshot_wander(
        &mut self,
        id: &str,
    ) -> Result<&mut crate::native_response::WanderClock, ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let key = UndoKey::AnimalWander(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            let before = &self
                .state
                .entities
                .resolve(handle)
                .and_then(|e| e.animal.as_ref())
                .ok_or(ExecutionError::UnsupportedFamily)?
                .wander;
            self.journal.reserve(size_of::<Undo>() * 2)?;
            self.journal.retain(
                key,
                Undo::AnimalWander {
                    entity: handle,
                    before: before.clone(),
                },
            )?;
        }
        Ok(&mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.animal.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .wander)
    }
    pub(crate) fn set_animal_physical_life(
        &mut self,
        id: &str,
        value: u64,
    ) -> Result<(), ExecutionError> {
        if value > MAX_SAFE_INTEGER {
            return Err(ExecutionError::Invariant);
        }
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let before = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.animal.as_ref())
            .ok_or(ExecutionError::UnsupportedFamily)?
            .physical_life;
        if before == value {
            return Ok(());
        }
        let key = UndoKey::AnimalPhysicalLife(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.reserve(size_of::<Undo>() * 2)?;
            self.journal.retain(
                key,
                Undo::AnimalPhysicalLife {
                    entity: handle,
                    before,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.animal.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .physical_life = value;
        Ok(())
    }
    pub(crate) fn set_acoustic_pattern(
        &mut self,
        id: &str,
        key: &str,
        value: Option<crate::native_response::AcousticPattern>,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let patterns = &self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.animal.as_ref())
            .ok_or(ExecutionError::UnsupportedFamily)?
            .acoustic_patterns;
        if patterns.get(key) == value.as_ref() {
            return Ok(());
        }
        let undo_key = UndoKey::AcousticPattern(handle.slot, handle.generation, key.to_owned());
        if self.journal.first(&undo_key)? {
            let prior = patterns
                .get_full(key)
                .map(|(index, _, value)| (index, value));
            self.journal.reserve(
                crate::native_response::acoustic_pattern_clone_bytes(prior.map(|(_, value)| value))
                    .checked_add(size_of::<Undo>() * 2 + key.len() * 4)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.journal.retain(
                undo_key,
                Undo::AcousticPattern {
                    entity: handle,
                    key: key.to_owned(),
                    before: prior.map(|(index, value)| (index, value.clone())),
                },
            )?;
        }
        let patterns = &mut self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.animal.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .acoustic_patterns;
        if let Some(value) = value {
            patterns.insert(key.to_owned(), value);
        } else {
            patterns.shift_remove(key);
        }
        Ok(())
    }
    pub(crate) fn behavior_changed(
        &mut self,
        id: &str,
        outward_change: bool,
    ) -> Result<(), ExecutionError> {
        self.journal
            .reserve(size_of::<PhysicalChange>() * 2 + id.len() * 2)?;
        self.journal.change(PhysicalChange::Behavior {
            entity_id: id.to_owned(),
            outward_change,
        })
    }
    pub(crate) fn animal_clock_changed(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.journal
            .reserve(size_of::<PhysicalChange>() * 2 + id.len() * 2)?;
        self.journal.change(PhysicalChange::AnimalClock {
            entity_id: id.to_owned(),
        })
    }

    /// Geometry is proved by the existing provider before reaching this owner.
    /// All callers share the same revision, continuity and heading assignment.
    pub(crate) fn set_position(
        &mut self,
        id: &str,
        point: Point,
        support: Option<String>,
        movement: Option<MovementWrite>,
    ) -> Result<(), ExecutionError> {
        if ![point.x, point.y, point.z].into_iter().all(f64::is_finite) {
            return Err(ExecutionError::InvalidPosition);
        }
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        // An unported live flight must refuse, never disappear on a ground write.
        if entity.spatial.flight.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let Some(Placement::World {
            position: before,
            support_surface_id: prior_support,
            revision,
            motion_continuity_revision,
        }) = &entity.placement
        else {
            return Err(ExecutionError::InvalidPosition);
        };
        let dx = point.x - before.x;
        let dz = point.z - before.z;
        let heading = movement.and_then(|m| m.heading).unwrap_or_else(|| {
            if dx.hypot(dz) > 1e-8 {
                dx.atan2(dz)
            } else {
                entity.spatial.heading
            }
        });
        let steps = movement.map_or(1, |m| m.steps);
        let next_revision = revision
            .checked_add(steps)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::InvalidPosition)?;
        if steps == 0 || steps > MAX_SAFE_INTEGER || !heading.is_finite() {
            return Err(ExecutionError::InvalidPosition);
        }
        let changed = point != *before || support != *prior_support;
        if !changed && movement.is_none() && heading == entity.spatial.heading {
            return Ok(());
        }
        let key = UndoKey::Placement(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.reserve(
            size_of::<Undo>() * 2
                + size_of::<PhysicalChange>() * 2
                + id.len() * 4
                + prior_support.as_ref().map_or(0, String::len)
                + support.as_ref().map_or(0, String::len),
        )?;
        if first {
            self.journal.retain(
                key,
                Undo::Placement {
                    entity: handle,
                    before: entity
                        .placement
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .clone(),
                    heading: entity.spatial.heading,
                },
            )?;
        }
        let continuity = if movement.is_some_and(|m| m.continuity == Continuity::Physical) {
            *motion_continuity_revision
        } else {
            Some(next_revision)
        };
        if changed || movement.is_some() {
            self.journal.change(PhysicalChange::Spatial {
                entity_id: id.to_owned(),
                before: *before,
                after: point,
                support_unchanged: support == *prior_support,
                discontinuity: !movement.is_some_and(|m| m.continuity == Continuity::Physical),
            })?;
            let entity = self
                .state
                .entities
                .resolve_mut(handle)
                .ok_or(ExecutionError::Invariant)?;
            entity.placement = Some(Placement::World {
                position: point,
                support_surface_id: support,
                revision: next_revision,
                motion_continuity_revision: continuity,
            });
            entity.spatial.heading = heading;
        } else {
            self.state
                .entities
                .resolve_mut(handle)
                .ok_or(ExecutionError::Invariant)?
                .spatial
                .heading = heading;
        }
        self.state.bodies.refresh(&self.state.entities, id);
        Ok(())
    }

    /// Raw native health, preserving the current whole-point rounding law. Body
    /// lifecycle/condition reconciliation remains an ordered required phase.
    pub(crate) fn set_health(
        &mut self,
        id: &str,
        mut value: f64,
        native_health: Option<&AttributeDefinition>,
    ) -> Result<bool, ExecutionError> {
        if !value.is_finite() {
            return Err(ExecutionError::InvalidHealth);
        }
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let body = actor.body.as_ref().ok_or(ExecutionError::MissingBody)?;
        if native_health
            .and_then(|d| d.native_health.as_ref())
            .is_some_and(|health| health.precision == "whole-points")
            && value != actor.health
        {
            let delta = value - actor.health;
            value = actor.health + delta.signum() * (delta.abs() + 0.5).floor().max(1.0);
        }
        value = crate::values::js_max(0.0, crate::values::js_min(body.max_health, value));
        if actor.health == value {
            return Ok(false);
        }
        let key = UndoKey::Health(handle.slot, handle.generation);
        self.journal
            .reserve(size_of::<Undo>() * 2 + size_of::<PhysicalChange>() * 2 + id.len() * 4)?;
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::Health {
                    entity: handle,
                    before: actor.health,
                },
            )?;
        }
        self.state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?
            .health = value;
        Ok(true)
    }

    /// Called only after the action family has completed prior-plan lifecycle
    /// and admitted its replacement; the moved before-value is never cloned.
    pub(crate) fn replace_action(
        &mut self,
        id: &str,
        action: Option<Action>,
        write: ActionWrite,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let next = match write.generation {
            PlanGenerationWrite::Preserve => actor.plan_generation,
            PlanGenerationWrite::Advance => actor
                .plan_generation
                .checked_add(1)
                .filter(|n| *n <= MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Invariant)?,
        };
        let first = self
            .journal
            .first(&UndoKey::Action(handle.slot, handle.generation))?;
        self.journal
            .reserve(size_of::<Undo>() * 2 + size_of::<PhysicalChange>() * 2 + id.len() * 4)?;
        self.journal
            .undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        if let Some(outward_change) = write.behavior {
            self.journal.change(PhysicalChange::Behavior {
                entity_id: id.to_owned(),
                outward_change,
            })?;
        }
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let before = std::mem::replace(&mut actor.action, action);
        let generation = actor.plan_generation;
        actor.plan_generation = next;
        if first {
            self.journal.retain(
                UndoKey::Action(handle.slot, handle.generation),
                Undo::Action {
                    entity: handle,
                    before,
                    plan_generation: generation,
                },
            )?;
        }
        Ok(())
    }

    pub(crate) fn settle_episode(&mut self, episode: &str) -> Result<(), ExecutionError> {
        let Some(window) = &self.state.pending_values else {
            return Ok(());
        };
        let Some((binding_index, _, binding)) = window.bindings.get_full(episode) else {
            return Ok(());
        };
        let handle = self
            .state
            .entities
            .handle(&binding.entity_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::MissingEntity)?;
        let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let attributes = actor
            .attributes
            .as_ref()
            .ok_or(ValueError::MissingAttribute)?;
        let statuses = entity
            .status_effects
            .as_ref()
            .ok_or(ValueError::MissingStatus)?;
        let status = statuses
            .get(&binding.status_id)
            .ok_or(ValueError::MissingStatus)?;
        let (subject_index, _, links) = window
            .by_entity
            .get_full(&binding.entity_id)
            .ok_or(ValueError::InvalidContinuation)?;
        let bytes = size_of::<Undo>() * 2
            + episode.len() * 4
            + binding.entity_id.len() * 4
            + binding.status_id.len() * 4
            + binding
                .attributes
                .iter()
                .map(|(id, rates)| {
                    id.len() * 8
                        + size_of::<AttributeState>() * 2
                        + rates.rates.len() * size_of::<f64>()
                        + attributes.get(id).map_or(0, |a| match &a.value {
                            crate::values::AttributeValue::Category(s) => s.len(),
                            _ => 0,
                        })
                })
                .sum::<usize>();
        self.journal.reserve(bytes)?;
        let key = UndoKey::Episode(episode.to_owned());
        if self.journal.first(&key)? {
            let mut prior_attributes = Vec::with_capacity(binding.attributes.len());
            let mut prior_links = Vec::with_capacity(binding.attributes.len());
            for id in binding.attributes.keys() {
                prior_attributes.push((
                    id.clone(),
                    attributes
                        .get(id)
                        .ok_or(ValueError::MissingAttribute)?
                        .clone(),
                ));
                let (index, _, value) =
                    links.get_full(id).ok_or(ValueError::InvalidContinuation)?;
                prior_links.push((index, id.clone(), value.clone()));
            }
            self.journal.retain(
                key,
                Undo::Episode(EpisodeUndo {
                    episode: episode.to_owned(),
                    binding: (binding_index, binding.clone()),
                    elapsed_seconds: window.elapsed_seconds,
                    sim_time: window.sim_time,
                    binding_count: window.binding_count,
                    subject_index,
                    links: prior_links,
                    entity: handle,
                    attributes: prior_attributes,
                    status_id: binding.status_id.clone(),
                    status: status.clone(),
                }),
            )?;
        }
        let entity = self
            .state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?;
        let actor = entity.actor.as_mut().ok_or(ExecutionError::Invariant)?;
        materialize_episode(
            &mut self.state.pending_values,
            episode,
            ValueEntityMut {
                id: &entity.id,
                attributes: actor.attributes.as_mut().ok_or(ExecutionError::Invariant)?,
                statuses: entity
                    .status_effects
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?,
            },
        )?;
        Ok(())
    }

    fn apply_work(&mut self, plan: WorkPlan) -> Result<(), ExecutionError> {
        for edit in plan.edits {
            let id = match &edit {
                InvocationEdit::Put(value) => &value.id,
                InvocationEdit::Remove(id) => id,
            };
            let key = UndoKey::Invocation(id.clone());
            let first = self.journal.first(&key)?;
            self.journal.reserve(
                size_of::<Undo>() * 2
                    + id.len() * 4
                    + self.state.work.invocation(id).map_or(0, |i| {
                        i.id.len()
                            + i.root_id.len()
                            + i.actor_id.len()
                            + i.module_id.len()
                            + i.definition_pin.id.len()
                            + i.definition_pin.digest.len()
                            + i.parent_id.as_ref().map_or(0, String::len)
                    }),
            )?;
            self.journal
                .undo
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            let undo = self.state.work.apply(edit)?;
            if first {
                self.journal.retain(key, Undo::Work(undo))?;
            }
        }
        Ok(())
    }
    pub(crate) fn admit_work(&mut self, request: WorkRequest) -> Result<(), ExecutionError> {
        self.settle_episode(&request.id)?;
        if let Some(parent) = &request.parent_id {
            self.settle_episode(parent)?;
        }
        let plan = self.state.work.plan_admission(
            request,
            &self.state.entities,
            self.state.header.sim_time,
        )?;
        self.apply_work(plan)
    }
    pub(crate) fn charge_work(
        &mut self,
        id: &str,
        demand: WorkDemand,
    ) -> Result<(), ExecutionError> {
        self.settle_episode(id)?;
        let plan = self.state.work.plan_charge(id, demand)?;
        self.apply_work(plan)
    }
    pub(crate) fn advance_work_interval(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.settle_episode(id)?;
        let plan = self
            .state
            .work
            .plan_interval(id, self.state.header.sim_time)?;
        self.apply_work(plan)
    }
    pub(crate) fn release_work(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.settle_episode(id)?;
        let plan = self.state.work.plan_release(id)?;
        self.apply_work(plan)
    }

    /// The finally-equivalent path/placement boundary, including a blocked
    /// operation's successful prefix. Provider waits never publish this cursor.
    pub(crate) fn finish_motion(
        &mut self,
        mut cursor: crate::movement::MotionCursor,
    ) -> Result<bool, ExecutionError> {
        let result = cursor.result().ok_or(ExecutionError::Invariant)?;
        let entity = self
            .state
            .entities
            .resolve(cursor.actor)
            .ok_or(ExecutionError::MissingEntity)?;
        let action = entity
            .actor
            .as_ref()
            .and_then(|a| a.action.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if action.id != cursor.action_id || action.path != cursor.path {
            return Err(ExecutionError::Invariant);
        }
        let id = entity.id.clone();
        if cursor.consumed_points > 0 {
            self.journal.reserve(
                size_of::<Undo>() * 2
                    + cursor.action_id.len() * 2
                    + cursor.path.len() * size_of::<crate::state::SurfacePoint>(),
            )?;
            self.journal
                .undo
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
            let key = UndoKey::ActionPath(cursor.actor.slot, cursor.actor.generation);
            let first = self.journal.first(&key)?;
            let remaining = cursor.path.split_off(cursor.consumed_points);
            let action = self
                .state
                .entities
                .resolve_mut(cursor.actor)
                .and_then(|e| e.actor.as_mut())
                .and_then(|a| a.action.as_mut())
                .ok_or(ExecutionError::Invariant)?;
            let before = std::mem::replace(&mut action.path, remaining);
            if first {
                self.journal.retain(
                    key,
                    Undo::ActionPath {
                        entity: cursor.actor,
                        action_id: cursor.action_id,
                        before,
                    },
                )?;
            }
        }
        if cursor.steps > 0 {
            self.set_position(
                &id,
                cursor.position.point(),
                Some(cursor.position.surface_id),
                Some(MovementWrite {
                    steps: cursor.steps,
                    heading: Some(cursor.heading),
                    continuity: Continuity::Physical,
                }),
            )?;
        }
        Ok(result)
    }
}

fn restore_episode(state: &mut PhysicalState, undo: EpisodeUndo) -> Result<(), ExecutionError> {
    let entity_id = undo.binding.1.entity_id.clone();
    let window = state
        .pending_values
        .get_or_insert_with(|| NativeValueWindow {
            elapsed_seconds: undo.elapsed_seconds,
            sim_time: undo.sim_time,
            binding_count: undo.binding_count,
            bindings: IndexMap::new(),
            by_entity: IndexMap::new(),
        });
    window.elapsed_seconds = undo.elapsed_seconds;
    window.sim_time = undo.sim_time;
    window.binding_count = undo.binding_count;
    window
        .bindings
        .shift_insert(undo.binding.0, undo.episode, undo.binding.1);
    if !window.by_entity.contains_key(&entity_id) {
        window
            .by_entity
            .shift_insert(undo.subject_index, entity_id.clone(), IndexMap::new());
    }
    let subject = window
        .by_entity
        .get_mut(&entity_id)
        .ok_or(ExecutionError::Invariant)?;
    let mut links = undo.links;
    links.sort_by_key(|(index, _, _)| *index);
    for (index, id, value) in links {
        subject.shift_insert(index, id, value);
    }
    let entity = state
        .entities
        .resolve_mut(undo.entity)
        .ok_or(ExecutionError::Invariant)?;
    let attributes = entity
        .actor
        .as_mut()
        .and_then(|a| a.attributes.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    for (id, value) in undo.attributes {
        *attributes.get_mut(&id).ok_or(ExecutionError::Invariant)? = value;
    }
    *entity
        .status_effects
        .as_mut()
        .and_then(|s| s.get_mut(&undo.status_id))
        .ok_or(ExecutionError::Invariant)? = undo.status;
    Ok(())
}
