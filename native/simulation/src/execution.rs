//! One operation-local physical undo owner, shared by nested native commands.
//! It records changed subrecords, never a world/actor clone. Receiver/history
//! journals must join this same candidate before an actual Ready path exists.

use crate::activity::{ActivityCheckpoint, ActivityJournal};
use crate::commands::{CommandCheckpoint, CommandJournal};
use crate::events::{
    AcquiredOccurrence, CompletedOccurrence, EventEmissionIntent, OccurrenceCheckpoint,
};
use crate::experience::{ExperienceCheckpoint, ExperienceJournal};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CapacityError};
use crate::identity::{IdentityExhausted, IdentityState, IssuedIdentity, MAX_SAFE_INTEGER};
use crate::received::{ReceivedValuesCheckpoint, TemporalCheckpoint};
use crate::reception::{
    CurrentCheckpoint, CurrentJournal, EpisodeCheckpoint, EpisodeJournal, OriginalCheckpoint,
    OriginalJournal, SensoryCheckpoint, SensoryJournal,
};
use crate::simulation::{PhysicalState, SimulationState};
use crate::state::{Action, EntityHandle, NativeInterval, Placement, Point};
use crate::status::AttributeDefinition;
use crate::values::{
    AttributeState, NativeValueBinding, NativeValueWindow, StatusInstance, ValueEntityMut,
    ValueError, materialize_episode,
};
use crate::work::{InvocationEdit, WorkDemand, WorkError, WorkPlan, WorkRequest, WorkUndo};
use indexmap::{IndexMap, IndexSet};
use std::mem::size_of;

mod agency;
mod attributes;
mod body;
mod conditions;
mod practice;
mod rates;
mod routes;
mod save;
mod semantic;
mod sensing;
mod status;
mod temporal;
mod values;
pub(crate) use status::{
    PendingStatusEnd, StatusActivationAnswer, StatusActivationCursor, StatusActivationProgress,
    StatusActivationStep, StatusEnd, StatusReconcileCursor, StatusReconcileStep,
};
pub(crate) use temporal::{
    AcquisitionLease, ReceivedLease, TemporalLoan, TemporalScopes, TemporalScopesCheckpoint,
};

#[derive(Debug)]
pub(crate) enum ExecutionError {
    Capacity,
    MissingEntity,
    MissingActor,
    MissingBody,
    Sensor(crate::reception::SensorError),
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
    Activity(crate::activity::ActivityError),
    Experience(crate::experience::ExperienceError),
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
pub(crate) struct CompletedAction {
    actor_id: String,
    action_id: String,
}
impl CompletedAction {
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor_id
    }
    pub(crate) fn action_id(&self) -> &str {
        &self.action_id
    }
}
pub(crate) struct PendingActionFinish {
    actor_id: String,
    action_id: String,
    personal: crate::activity::PendingActivityResult,
    outcome: crate::commands::Outcome,
}
impl PendingActionFinish {
    pub(crate) fn personal(&self) -> &crate::activity::PendingActivityResult {
        &self.personal
    }
}
pub(crate) enum ActionFinish {
    Complete(CompletedAction),
    Personal(PendingActionFinish),
}

struct CandidateFrame {
    encounters: crate::events::EncounterCheckpoint,
    appraisals: crate::appraisals::AppraisalCheckpoint,
    cognition: crate::cognition::CognitionCheckpoint,
    physical: PhysicalCheckpoint,
    received: Option<ReceivedValuesCheckpoint>,
    occurrences: OccurrenceCheckpoint,
    temporal: TemporalCheckpoint,
    acquisitions: TemporalScopesCheckpoint,
    originals: OriginalCheckpoint,
    current: CurrentCheckpoint,
    sensory: SensoryCheckpoint,
    episodes: EpisodeCheckpoint,
    activity: ActivityCheckpoint,
    experience: ExperienceCheckpoint,
    commands: CommandCheckpoint,
    recognition: crate::worlds::InstalledRecognitionCheckpoint,
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
    pub encounters: crate::events::EncounterScopes,
    budget: ByteBudget,
    pub cognition: crate::cognition::CognitionJournal,
    pub physical: PhysicalJournal,
    pub meters: crate::work::WorkMeters,
    pub originals: OriginalJournal,
    pub current: CurrentJournal,
    pub sensory: SensoryJournal,
    pub episodes: EpisodeJournal,
    pub activity: ActivityJournal,
    pub experience: ExperienceJournal,
    pub commands: CommandJournal,
    pub acquisitions: TemporalScopes,
    pub recognition: crate::worlds::InstalledRecognitionJournal,
    root_received: Option<ReceivedValuesCheckpoint>,
    root_occurrences: OccurrenceCheckpoint,
    root_temporal: TemporalCheckpoint,
    root_originals: OriginalCheckpoint,
    root_current: CurrentCheckpoint,
    root_sensory: SensoryCheckpoint,
    root_episodes: EpisodeCheckpoint,
    root_activity: ActivityCheckpoint,
    root_experience: ExperienceCheckpoint,
    root_commands: CommandCheckpoint,
    root_recognition: crate::worlds::InstalledRecognitionCheckpoint,
    root_cognition: crate::cognition::CognitionCheckpoint,
    root_appraisals: crate::appraisals::AppraisalCheckpoint,
    sensory_cursor: PhysicalChangeCursor,
    frames: Vec<CandidateFrame>,
    pending: Vec<PendingOccurrence>,
    next_occurrence: u64,
    next_provider_serial: u64,
}
impl CandidateJournal {
    pub(crate) fn byte_budget(&self) -> &ByteBudget {
        &self.budget
    }
    /// The receiver's semantic owners select their own rows. The final SQL
    /// prefix later removes redundant cascade deletes; private ledger metadata
    /// still retains every exact child tombstone until acceptance.
    pub(crate) fn encode_reception_changes(
        &self,
        state: &SimulationState,
        output: &mut crate::records::RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), crate::records::RecordEncodingError> {
        let reception = &state.reception;
        let schema = &state.installed.schema;
        let records = &state.records;
        crate::reception::encode_perception_owner_changes(
            reception,
            schema,
            records,
            &self.originals,
            self.root_originals,
            &self.current,
            self.root_current,
            output,
            budget,
        )?;
        self.current.encode_contact_changes(
            reception,
            self.root_current,
            records,
            output,
            budget,
        )?;
        self.current.encode_scene_changes(
            reception,
            self.root_current,
            schema,
            records,
            output,
            budget,
        )?;
        self.current.encode_motion_changes(
            reception,
            self.root_current,
            schema,
            records,
            output,
            budget,
        )?;
        self.current.encode_visibility_changes(
            reception,
            self.root_current,
            schema,
            records,
            output,
            budget,
        )?;
        self.episodes.encode_changes(
            reception,
            self.root_episodes,
            schema,
            records,
            output,
            budget,
        )?;
        self.recognition.encode_changes(
            reception,
            self.root_recognition,
            schema,
            records,
            output,
            budget,
        )?;
        self.sensory
            .encode_changes(reception, self.root_sensory, records, output, budget)?;
        if let Some(values) = &reception.received_values {
            crate::received::encode_received_value_changes(values, records, output, budget)?;
        }
        Ok(())
    }
    /// Disposable provider binding freshness, independent of gameplay identity
    /// and retained across nested rollback to fence every late answer.
    pub(crate) fn next_provider_serial(&mut self) -> Result<u64, ExecutionError> {
        let next = self
            .next_provider_serial
            .checked_add(1)
            .filter(|value| *value <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Invariant)?;
        self.next_provider_serial = next;
        Ok(next)
    }

    /// This closes the owners currently joined here. The outer coordinator
    /// additionally owes actual receiver, record-encoding and save products.
    pub(crate) fn require_closed_operations(&self) -> Result<(), ExecutionError> {
        if !self.frames.is_empty()
            || !self.pending.is_empty()
            || !self.meters.is_idle()
            || !self.activity.is_complete()
        {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        self.current.require_closed()?;
        self.encounters.require_closed()?;
        self.acquisitions.require_closed()
    }
    pub(crate) fn begin(
        state: &SimulationState,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let group = state.installed.work_policy.policy().group;
        let mut physical = PhysicalJournal::begin(&state.physical, budget)?;
        physical.reserve(size_of::<Self>() + crate::work::WorkMeters::heap_bound(group)?)?;
        let originals = OriginalJournal::new(budget).map_err(|_| ExecutionError::Capacity)?;
        let root_originals = originals.checkpoint();
        let current = CurrentJournal::new(budget).map_err(ExecutionError::Received)?;
        let root_current = current.checkpoint();
        let sensory = SensoryJournal::new(budget).map_err(|_| ExecutionError::Capacity)?;
        let root_sensory = sensory.checkpoint(&state.reception);
        let episodes = EpisodeJournal::new(budget).map_err(ExecutionError::Received)?;
        let root_episodes = episodes.checkpoint(&state.reception);
        let activity = ActivityJournal::new(budget).map_err(ExecutionError::Activity)?;
        let root_activity = activity.checkpoint();
        let experience = ExperienceJournal::new(budget).map_err(|_| ExecutionError::Capacity)?;
        let root_experience = experience.checkpoint();
        let commands = CommandJournal::new(budget)?;
        let root_commands = commands.checkpoint();
        let acquisitions = TemporalScopes::new(budget)?;
        let recognition = crate::worlds::InstalledRecognitionJournal::new(budget)
            .map_err(ExecutionError::Received)?;
        let root_recognition = recognition.checkpoint(&state.reception);
        let sensory_cursor = physical.change_cursor();
        let cognition = crate::cognition::CognitionJournal::new(budget)?;
        let root_cognition = cognition.checkpoint();
        Ok(Self {
            encounters: crate::events::EncounterScopes::new(budget)?,
            budget: budget.clone(),
            root_appraisals: state.appraisals.checkpoint(),
            cognition,
            root_cognition,
            physical,
            meters: crate::work::WorkMeters::new(group)?,
            originals,
            current,
            sensory,
            episodes,
            activity,
            experience,
            commands,
            acquisitions,
            recognition,
            root_received: state
                .reception
                .received_values
                .as_ref()
                .map(|v| v.checkpoint()),
            root_occurrences: state.occurrences.checkpoint(),
            root_temporal: state.temporal.checkpoint(),
            root_originals,
            root_current,
            root_sensory,
            root_episodes,
            root_activity,
            root_experience,
            root_commands,
            root_recognition,
            sensory_cursor,
            frames: Vec::new(),
            pending: Vec::new(),
            next_occurrence: 0,
            next_provider_serial: 0,
        })
    }
    pub(crate) fn checkpoint(
        &mut self,
        state: &SimulationState,
    ) -> Result<CandidateCheckpoint, ExecutionError> {
        let encounters = self.encounters.checkpoint()?;
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
        let acquisitions = self.acquisitions.checkpoint()?;
        let physical = match self.physical.checkpoint(&state.physical) {
            Ok(physical) => physical,
            Err(error) => {
                self.acquisitions.keep(acquisitions)?;
                return Err(error);
            }
        };
        let token = CandidateCheckpoint {
            depth: self.frames.len(),
        };
        self.frames.push(CandidateFrame {
            encounters,
            appraisals: state.appraisals.checkpoint(),
            cognition: self.cognition.checkpoint(),
            physical,
            received: state
                .reception
                .received_values
                .as_ref()
                .map(|v| v.checkpoint()),
            occurrences: state.occurrences.checkpoint(),
            temporal: state.temporal.checkpoint(),
            acquisitions,
            originals: self.originals.checkpoint(),
            current: self.current.checkpoint(),
            sensory: self.sensory.checkpoint(&state.reception),
            episodes: self.episodes.checkpoint(&state.reception),
            activity: self.activity.checkpoint(),
            experience: self.experience.checkpoint(),
            commands: self.commands.checkpoint(),
            recognition: self.recognition.checkpoint(&state.reception),
            sensory_cursor: self.sensory_cursor,
            pending: self.pending.clone(),
        });
        Ok(token)
    }
    pub(crate) fn keep(
        &mut self,
        state: &mut SimulationState,
        token: CandidateCheckpoint,
    ) -> Result<(), ExecutionError> {
        if self.frames.len() != token.depth + 1 {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let frame = self
            .frames
            .last()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        self.acquisitions.validate_keep(frame.acquisitions)?;
        if let Err(error) = self.physical.prepare_keep(frame.physical) {
            // Capacity is still tentative here. The linear child token must
            // restore its state before it is consumed, including IDs/history.
            self.rollback_to(state, token)?;
            return Err(error);
        }
        let frame = self.frames.pop().ok_or(ExecutionError::InvalidCheckpoint)?;
        self.acquisitions.keep(frame.acquisitions)?;
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
        self.encounters.rollback_to(frame.encounters);
        self.acquisitions.rollback_to(frame.acquisitions)?;
        state.appraisals.rollback_to(frame.appraisals)?;
        self.cognition
            .rollback_to(&mut state.minds, frame.cognition)?;
        self.recognition
            .rollback_to(&mut state.reception, frame.recognition)
            .map_err(ExecutionError::Received)?;
        self.activity
            .rollback_to(&mut state.activity, frame.activity)
            .map_err(ExecutionError::Activity)?;
        self.commands
            .rollback_to(&mut state.commands, frame.commands)?;
        self.experience
            .rollback_to(&mut state.experience, frame.experience)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.episodes
            .rollback_to(&mut state.reception, frame.episodes)
            .map_err(ExecutionError::Received)?;
        state
            .occurrences
            .rollback_to(frame.occurrences)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        state
            .temporal
            .rollback_to(frame.temporal)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.current
            .rollback_to(&mut state.reception, frame.current)
            .map_err(ExecutionError::Received)?;
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
        self.encounters.rollback_all()?;
        self.acquisitions.rollback_all()?;
        state.appraisals.rollback_to(self.root_appraisals)?;
        self.cognition
            .rollback_to(&mut state.minds, self.root_cognition)?;
        self.recognition
            .rollback_to(&mut state.reception, self.root_recognition)
            .map_err(ExecutionError::Received)?;
        self.activity
            .rollback_to(&mut state.activity, self.root_activity)
            .map_err(ExecutionError::Activity)?;
        self.commands
            .rollback_to(&mut state.commands, self.root_commands)?;
        self.experience
            .rollback_to(&mut state.experience, self.root_experience)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.episodes
            .rollback_to(&mut state.reception, self.root_episodes)
            .map_err(ExecutionError::Received)?;
        state
            .occurrences
            .rollback_to(self.root_occurrences)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        state
            .temporal
            .rollback_to(self.root_temporal)
            .map_err(|_| ExecutionError::OwnerRollback)?;
        self.current
            .rollback_to(&mut state.reception, self.root_current)
            .map_err(ExecutionError::Received)?;
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
    pub(crate) fn begin_received_value_scope(&mut self) -> Result<(), ExecutionError> {
        if let Some(values) = &mut self.state.reception.received_values {
            self.journal.physical.reserve(
                values
                    .new_preparation_scope_bound()
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            values
                .begin_preparation_scope()
                .map_err(ExecutionError::Received)?;
        }
        Ok(())
    }
    /// Source finishPlanAction duties precede its optional plan-step branch.
    /// An absent plan never skips semantic closure, personal recording or work.
    pub(crate) fn begin_finish_action(
        &mut self,
        actor_id: &str,
        action_id: &str,
        result: crate::commands::Outcome,
    ) -> Result<ActionFinish, ExecutionError> {
        let actor = self
            .state
            .physical
            .entities
            .get(actor_id)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if actor.agency.plan.as_ref().is_some_and(|plan| {
            plan.activity.is_some() || plan.steps.iter().any(|step| step.activity_key.is_some())
        }) || actor
            .agency
            .suspended_plan()
            .is_some_and(|plan| plan.activity.is_some())
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        self.journal.physical.reserve(
            actor_id.len()
                + action_id.len()
                + result.heap_bytes().ok_or(ExecutionError::Capacity)?,
        )?;
        self.physical().finish_semantic_work(actor_id, action_id)?;
        // Source finishPlanAction publishes this behavior change even when an
        // immediate command has no continuing action. It owes a sensory recheck.
        self.physical().behavior_changed(actor_id, true)?;
        let pending = self
            .journal
            .activity
            .prepare_end(
                &mut self.state.activity,
                actor_id,
                action_id,
                result.clone(),
                self.state.physical.header.sim_time,
                &self
                    .state
                    .installed
                    .ordinary_actions
                    .value()
                    .before_attempt_facts,
            )
            .map_err(ExecutionError::Activity)?;
        if let Some(personal) = pending {
            return Ok(ActionFinish::Personal(PendingActionFinish {
                actor_id: actor_id.to_owned(),
                action_id: action_id.to_owned(),
                personal,
                outcome: result,
            }));
        }
        self.physical().release_work(action_id)?;
        let evidence = self
            .state
            .activity
            .occurrence_for(actor_id, action_id)
            .map_err(ExecutionError::Activity)?
            .and_then(|entry| entry.result_evidence.as_ref());
        self.journal.physical.reserve(
            evidence
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let evidence = evidence.cloned();
        crate::plans::finish_plan_action(self, actor_id, action_id, result, evidence)?;
        Ok(ActionFinish::Complete(CompletedAction {
            actor_id: actor_id.to_owned(),
            action_id: action_id.to_owned(),
        }))
    }
    pub(crate) fn complete_finish_action(
        &mut self,
        pending: PendingActionFinish,
        acquired: &crate::experience::AcquiredActivityResult,
    ) -> Result<CompletedAction, ExecutionError> {
        self.complete_activity_result(pending.personal, acquired)?;
        self.physical().release_work(&pending.action_id)?;
        self.journal.physical.reserve(
            acquired
                .evidence()
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let evidence = acquired.evidence().cloned();
        crate::plans::finish_plan_action(
            self,
            &pending.actor_id,
            &pending.action_id,
            pending.outcome,
            evidence,
        )?;
        Ok(CompletedAction {
            actor_id: pending.actor_id,
            action_id: pending.action_id,
        })
    }
    pub(crate) fn remove_observer_episodes(
        &mut self,
        observer: &str,
    ) -> Result<(), ExecutionError> {
        self.journal
            .episodes
            .remove_observer(&mut self.state.reception, observer)
            .map(|_| ())
            .map_err(ExecutionError::Received)
    }
    pub(crate) fn complete_activity_result(
        &mut self,
        pending: crate::activity::PendingActivityResult,
        acquired: &crate::experience::AcquiredActivityResult,
    ) -> Result<(), ExecutionError> {
        let actor = acquired.actor_id();
        let evidence = self
            .journal
            .activity
            .complete_result(&mut self.state.activity, pending, acquired)
            .map_err(ExecutionError::Activity)?;
        self.physical().set_result_evidence(actor, evidence)
    }
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
        complete: &CompletedOccurrence,
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
impl From<crate::received::ReceivedError> for ExecutionError {
    fn from(value: crate::received::ReceivedError) -> Self {
        Self::Received(value)
    }
}
impl From<crate::experience::ExperienceError> for ExecutionError {
    fn from(value: crate::experience::ExperienceError) -> Self {
        Self::Experience(value)
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
    Membership {
        entity_id: String,
        before: Option<Point>,
        after: Option<Point>,
    },
    Navigation {
        entity_id: String,
    },
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
    ObservationParameters {
        entity_id: String,
        request_detail: bool,
    },
    Contribution {
        entity_id: String,
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
pub(crate) struct ActionRouteWrite {
    pub path: Vec<crate::state::SurfacePoint>,
    pub navigation: Option<crate::state::NavigationPending>,
    pub stage: String,
    pub replans: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
enum UndoKey {
    CoachingPresence,
    AgencyPlaces(usize, u64),
    AgencyPlan(usize, u64),
    AgencySuspended(usize, u64),
    AgencyHistory(usize, u64),
    AgencyRevision(usize, u64),
    PlanGeneration(usize, u64),
    BodyRevision(usize, u64),
    BodyLifecycle(usize, u64),
    Remains(usize, u64),
    PendingDeath(usize, u64),
    Scar(usize, u64, String),
    Contacts(usize, u64),
    Placement(usize, u64),
    Heading(usize, u64),
    Health(usize, u64),
    Action(usize, u64),
    ActionPath(usize, u64),
    ActionRoute(usize, u64),
    ActionReplans(usize, u64),
    ActionNavigation(usize, u64),
    ActionRemaining(usize, u64),
    ActionSample(usize, u64),
    SensoryProgress(usize, u64),
    AnimalEpisode(usize, u64),
    AnimalWander(usize, u64),
    AnimalPhysicalLife(usize, u64),
    AcousticPattern(usize, u64, String),
    SemanticMeta(usize, u64),
    SemanticResolved(usize, u64),
    ResultEvidence(usize, u64),
    Status(usize, u64, String),
    Attribute(usize, u64, String),
    Condition(usize, u64, String),
    Practice(usize, u64, String),
    NativeWindow,
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
    written: IndexSet<UndoKey>,
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
#[derive(Clone, Copy)]
struct WindowClock {
    elapsed_seconds: f64,
    sim_time: f64,
    binding_count: u64,
}
enum Undo {
    CoachingPresence {
        before: bool,
    },
    Practice {
        entity: EntityHandle,
        key: String,
        before: crate::state::PracticeProgress,
    },
    AgencyPlaces {
        entity: EntityHandle,
        before: Option<Vec<crate::state::RememberedPlace>>,
    },
    AgencyPlan {
        entity: EntityHandle,
        before: Option<crate::plans::ActorPlan>,
    },
    AgencySuspended {
        entity: EntityHandle,
        before: Option<Option<crate::plans::ActorPlan>>,
    },
    AgencyHistory {
        entity: EntityHandle,
        before: Vec<crate::plans::PlanStep>,
    },
    AgencyRevision {
        entity: EntityHandle,
        before: u64,
    },
    PlanGeneration {
        entity: EntityHandle,
        before: u64,
    },
    AddedEntity(crate::state::EntityInsertion),
    BodyRevision {
        entity: EntityHandle,
        before: u64,
    },
    BodyLifecycle {
        entity: EntityHandle,
        alive: bool,
        incapacitated: bool,
        fall_velocity: Option<f64>,
        local_avoidance_ready_at: Option<f64>,
    },
    Remains {
        entity: EntityHandle,
        before: Option<crate::state::Remains>,
    },
    PendingDeath {
        entity: EntityHandle,
        before: Option<crate::body::PendingDeath>,
        combat_ready_at: Option<f64>,
        evasion_ready_at: Option<f64>,
    },
    Scar {
        entity: EntityHandle,
        key: String,
        before: Option<(usize, f64)>,
        root_present: bool,
    },
    Contacts {
        entity: EntityHandle,
        before: IndexMap<String, crate::reception::ContactEpisode>,
    },
    SensoryProgress {
        entity: EntityHandle,
        before: Option<crate::reception::SensoryProgress>,
    },
    Condition {
        entity: EntityHandle,
        key: String,
        before: Option<(usize, crate::state::ConditionEpisode)>,
        root_present: bool,
    },
    ActionNavigation {
        entity: EntityHandle,
        action_id: String,
        before: Option<crate::state::NavigationPending>,
    },
    ActionRemaining {
        entity: EntityHandle,
        action_id: String,
        before: f64,
    },
    ActionSample {
        entity: EntityHandle,
        action_id: String,
        before: Option<f64>,
    },
    ActionReplans {
        entity: EntityHandle,
        action_id: String,
        before: Option<u64>,
    },
    ActionRoute {
        entity: EntityHandle,
        action_id: String,
        before: ActionRouteWrite,
    },
    Heading {
        entity: EntityHandle,
        before: f64,
    },
    NativeWindow {
        before: Option<WindowClock>,
    },
    RetainedBinding {
        episode: String,
        entity_id: String,
        attributes: Vec<String>,
    },
    Attribute {
        entity: EntityHandle,
        id: String,
        before: AttributeState,
    },
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
    ResultEvidence {
        entity: EntityHandle,
        before: Option<crate::activity::ResultEvidence>,
    },
    Status {
        entity: EntityHandle,
        key: String,
        before: Option<(usize, StatusInstance)>,
        root_present: bool,
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
            written: IndexSet::new(),
        });
        Ok(value)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        use crate::host::retained_size::map_storage;
        let undo_capacity = if self.undo.len() == self.undo.capacity() {
            self.undo
                .capacity()
                .checked_mul(2)
                .map(|n| n.max(4))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let changes_needed = self
            .changes
            .len()
            .checked_add(2)
            .ok_or(ExecutionError::Capacity)?;
        let change_capacity = if changes_needed > self.changes.capacity() {
            self.changes
                .capacity()
                .checked_mul(2)
                .map(|n| n.max(changes_needed).max(4))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let written = self
            .frames
            .last()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let key_capacity = if written.written.len() == written.written.capacity() {
            written
                .written
                .len()
                .checked_add(1)
                .and_then(|n| n.checked_mul(2))
                .and_then(|n| n.checked_add(8))
                .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        let total = heap_sum([
            self.reservation.bytes(),
            bytes,
            undo_capacity
                .checked_mul(size_of::<Undo>())
                .ok_or(ExecutionError::Capacity)?,
            change_capacity
                .checked_mul(size_of::<PhysicalChange>())
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<UndoKey, ()>(key_capacity).ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.reservation.resize(total)?;
        if undo_capacity > 0 {
            self.undo
                .try_reserve_exact(undo_capacity - self.undo.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        if change_capacity > 0 {
            self.changes
                .try_reserve_exact(change_capacity - self.changes.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        if key_capacity > 0 {
            let frame = self
                .frames
                .last_mut()
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            frame
                .written
                .try_reserve(key_capacity - frame.written.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
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
        if self.frames.len() == self.frames.capacity() {
            let capacity = self
                .frames
                .capacity()
                .checked_mul(2)
                .map(|n| n.max(2))
                .ok_or(ExecutionError::Capacity)?;
            self.reservation.resize(
                self.reservation
                    .bytes()
                    .checked_add(
                        capacity
                            .checked_mul(size_of::<Frame>())
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.frames
                .try_reserve_exact(capacity - self.frames.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
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
            written: IndexSet::new(),
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
    fn prepare_keep(&mut self, checkpoint: PhysicalCheckpoint) -> Result<(), ExecutionError> {
        self.check_top(checkpoint)?;
        let child = self
            .frames
            .last()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let parent_index = self.frames.len() - 2;
        let parent = &self.frames[parent_index];
        let needed = parent
            .written
            .len()
            .checked_add(child.written.len())
            .ok_or(ExecutionError::Capacity)?;
        if needed > parent.written.capacity() {
            let capacity = needed
                .checked_mul(2)
                .and_then(|n| n.checked_add(8))
                .ok_or(ExecutionError::Capacity)?;
            let bytes = crate::host::retained_size::map_storage::<UndoKey, ()>(capacity)
                .ok_or(ExecutionError::Capacity)?;
            self.reservation.resize(
                self.reservation
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let parent = &mut self.frames[parent_index];
            parent
                .written
                .try_reserve(capacity - parent.written.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        Ok(())
    }
    pub(crate) fn keep(&mut self, checkpoint: PhysicalCheckpoint) -> Result<(), ExecutionError> {
        self.prepare_keep(checkpoint)?;
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
                Undo::AgencyPlan { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .agency
                        .plan = before;
                }
                Undo::CoachingPresence { before } => {
                    state.coaching.present = before;
                }
                Undo::AgencyPlaces { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .agency
                        .places = before;
                }
                Undo::AgencySuspended { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .agency
                        .suspended = before;
                }
                Undo::AgencyHistory { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .agency
                        .history = before;
                }
                Undo::AgencyRevision { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .agency
                        .revision = before;
                }
                Undo::PlanGeneration { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .plan_generation = before;
                }
                Undo::AddedEntity(before) => {
                    let (id, renumbered) = state
                        .entities
                        .undo_insertion(before)
                        .map_err(|_| ExecutionError::Invariant)?;
                    if renumbered {
                        state.bodies.refresh_ordering(&state.entities);
                    }
                    state.bodies.refresh(&state.entities, &id);
                }
                Undo::BodyRevision { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.body.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .revision = before;
                }
                Undo::BodyLifecycle {
                    entity,
                    alive,
                    incapacitated,
                    fall_velocity,
                    local_avoidance_ready_at,
                } => {
                    let entity = state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?;
                    let actor = entity.actor.as_mut().ok_or(ExecutionError::Invariant)?;
                    actor.alive = alive;
                    actor.incapacitated = incapacitated;
                    entity.spatial.fall_velocity = fall_velocity;
                    entity.spatial.local_avoidance_ready_at = local_avoidance_ready_at;
                    let id = entity.id.clone();
                    state.bodies.refresh(&state.entities, &id);
                }
                Undo::Remains { entity, before } => {
                    let entity = state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?;
                    entity.remains = before;
                    let id = entity.id.clone();
                    state.bodies.refresh(&state.entities, &id);
                }
                Undo::PendingDeath {
                    entity,
                    before,
                    combat_ready_at,
                    evasion_ready_at,
                } => {
                    let entity = state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?;
                    let actor = entity.actor.as_mut().ok_or(ExecutionError::Invariant)?;
                    actor.pending_death = before;
                    actor.combat_ready_at = combat_ready_at;
                    actor.evasion_ready_at = evasion_ready_at;
                    let id = entity.id.clone();
                    state.bodies.refresh(&state.entities, &id);
                }
                Undo::Scar {
                    entity,
                    key,
                    before,
                    root_present,
                } => {
                    let actor = state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?;
                    let scars = actor.scars.as_mut().ok_or(ExecutionError::Invariant)?;
                    scars.shift_remove(&key);
                    if let Some((position, value)) = before {
                        scars.shift_insert(position, key, value);
                    }
                    if !root_present {
                        if !scars.is_empty() {
                            return Err(ExecutionError::Invariant);
                        }
                        actor.scars = None;
                    }
                }
                Undo::Contacts { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .contacts = Some(before);
                }
                Undo::NativeWindow { before } => match before {
                    None => {
                        if state.pending_values.as_ref().is_some_and(|window| {
                            !window.bindings.is_empty() || !window.by_entity.is_empty()
                        }) {
                            return Err(ExecutionError::Invariant);
                        }
                        state.pending_values = None;
                    }
                    Some(before) => {
                        let window =
                            state
                                .pending_values
                                .get_or_insert_with(|| NativeValueWindow {
                                    elapsed_seconds: before.elapsed_seconds,
                                    sim_time: before.sim_time,
                                    binding_count: before.binding_count,
                                    bindings: IndexMap::new(),
                                    by_entity: IndexMap::new(),
                                });
                        window.elapsed_seconds = before.elapsed_seconds;
                        window.sim_time = before.sim_time;
                        window.binding_count = before.binding_count;
                    }
                },
                Undo::RetainedBinding {
                    episode,
                    entity_id,
                    attributes,
                } => {
                    if let Some(window) = state.pending_values.as_mut() {
                        if window.bindings.shift_remove(&episode).is_some() {
                            window.binding_count = window
                                .binding_count
                                .checked_sub(1)
                                .ok_or(ExecutionError::Invariant)?;
                        }
                        if let Some(subject) = window.by_entity.get_mut(&entity_id) {
                            for id in attributes {
                                if subject.get(&id) == Some(&episode) {
                                    subject.shift_remove(&id);
                                }
                            }
                            if subject.is_empty() {
                                window.by_entity.shift_remove(&entity_id);
                            }
                        }
                        if window.binding_count == 0 {
                            state.pending_values = None;
                        }
                    }
                }
                Undo::Condition {
                    entity,
                    key,
                    before,
                    root_present,
                } => {
                    let actor = state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?;
                    let map = actor.conditions.as_mut().ok_or(ExecutionError::Invariant)?;
                    map.shift_remove(&key);
                    if let Some((position, before)) = before {
                        map.shift_insert(position, key, before);
                    }
                    if !root_present {
                        if !map.is_empty() {
                            return Err(ExecutionError::Invariant);
                        }
                        actor.conditions = None;
                    }
                }
                Undo::Attribute { entity, id, before } => {
                    let entity = state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?;
                    let attributes = if let Some(actor) = entity.actor.as_mut() {
                        actor.attributes.as_mut()
                    } else {
                        entity.attributes.as_mut()
                    }
                    .ok_or(ExecutionError::Invariant)?;
                    *attributes.get_mut(&id).ok_or(ExecutionError::Invariant)? = before;
                }
                Undo::Practice {
                    entity,
                    key,
                    before,
                } => {
                    *state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.practice.as_mut())
                        .and_then(|practice| practice.get_mut(&key))
                        .ok_or(ExecutionError::Invariant)? = before;
                }
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
                Undo::ActionNavigation {
                    entity,
                    action_id,
                    before,
                } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.action.as_mut())
                        .filter(|action| action.id == action_id)
                        .ok_or(ExecutionError::Invariant)?
                        .navigation = before;
                }
                Undo::ActionRemaining {
                    entity,
                    action_id,
                    before,
                } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.action.as_mut())
                        .filter(|action| action.id == action_id)
                        .ok_or(ExecutionError::Invariant)?
                        .remaining_seconds = before;
                }
                Undo::ActionSample {
                    entity,
                    action_id,
                    before,
                } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.action.as_mut())
                        .filter(|action| action.id == action_id)
                        .ok_or(ExecutionError::Invariant)?
                        .motion_sample_remaining_metres = before;
                }
                Undo::SensoryProgress { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?
                        .sensory_progress = before;
                }
                Undo::ActionReplans {
                    entity,
                    action_id,
                    before,
                } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.action.as_mut())
                        .filter(|action| action.id == action_id)
                        .ok_or(ExecutionError::Invariant)?
                        .replans = before;
                }
                Undo::ActionRoute {
                    entity,
                    action_id,
                    before,
                } => {
                    let action = state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|entity| entity.actor.as_mut())
                        .and_then(|actor| actor.action.as_mut())
                        .filter(|action| action.id == action_id)
                        .ok_or(ExecutionError::Invariant)?;
                    action.path = before.path;
                    action.navigation = before.navigation;
                    action.stage = before.stage;
                    action.replans = before.replans;
                }
                Undo::Heading { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?
                        .spatial
                        .heading = before;
                }
                Undo::Health { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .health = before
                }
                Undo::ResultEvidence { entity, before } => {
                    state
                        .entities
                        .resolve_mut(entity)
                        .and_then(|e| e.actor.as_mut())
                        .ok_or(ExecutionError::Invariant)?
                        .agency
                        .last_result_evidence = before;
                }
                Undo::Status {
                    entity,
                    key,
                    before,
                    root_present,
                } => {
                    let statuses = &mut state
                        .entities
                        .resolve_mut(entity)
                        .ok_or(ExecutionError::Invariant)?
                        .status_effects;
                    let map = statuses.as_mut().ok_or(ExecutionError::Invariant)?;
                    map.shift_remove(&key);
                    if let Some((at, value)) = before {
                        map.shift_insert(at, key, value);
                    }
                    if !root_present {
                        if !map.is_empty() {
                            return Err(ExecutionError::Invariant);
                        }
                        *statuses = None;
                    }
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
        if self.undo.len() == self.undo.capacity()
            || self
                .frames
                .last()
                .is_none_or(|frame| frame.written.len() == frame.written.capacity())
        {
            return Err(ExecutionError::Invariant);
        }
        self.frames
            .last_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?
            .written
            .insert(key);
        self.undo.push(undo);
        Ok(())
    }
    fn change(&mut self, change: PhysicalChange) -> Result<(), ExecutionError> {
        if self.changes.len() == self.changes.capacity() {
            return Err(ExecutionError::Invariant);
        }
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
    /// A selected resting facing changes orientation and emits Source's
    /// zero-distance spatial notice. It neither moves placement nor advances
    /// the route/continuity counters used to recognize actual motion.
    pub(crate) fn set_heading(&mut self, id: &str, heading: f64) -> Result<(), ExecutionError> {
        if !heading.is_finite() {
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
        if entity.spatial.local_pose.is_some() || entity.spatial.flight.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let position = entity
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?;
        self.journal
            .reserve(size_of::<Undo>() * 2 + size_of::<PhysicalChange>() * 2 + id.len() * 2)?;
        let key = UndoKey::Heading(handle.slot, handle.generation);
        if self.journal.first(&key)? {
            self.journal.retain(
                key,
                Undo::Heading {
                    entity: handle,
                    before: entity.spatial.heading,
                },
            )?;
        }
        self.journal.change(PhysicalChange::Spatial {
            entity_id: id.to_owned(),
            before: position,
            after: position,
            support_unchanged: true,
            discontinuity: false,
        })?;
        self.state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?
            .spatial
            .heading = heading;
        Ok(())
    }
    pub(crate) fn settle_entity(&mut self, id: &str) -> Result<(), ExecutionError> {
        let Some(bindings) = self
            .state
            .pending_values
            .as_ref()
            .and_then(|window| window.by_entity.get(id))
        else {
            return Ok(());
        };
        self.journal.reserve(
            bindings.len() * size_of::<String>() * 2
                + bindings.values().map(String::len).sum::<usize>(),
        )?;
        // Object.values takes a snapshot before the first materialization
        // removes any binding. Preserve duplicates and source iteration order.
        let episodes: Vec<String> = bindings.values().cloned().collect();
        for episode in episodes {
            self.settle_episode(&episode)?;
        }
        Ok(())
    }
    pub(crate) fn admit_status_work(
        &mut self,
        actor_id: &str,
        episode: &str,
        work: &crate::status::CompiledStatusWork,
    ) -> Result<(), ExecutionError> {
        self.journal.reserve(
            actor_id.len()
                + episode.len()
                + work.pin.id.len() * 2
                + work.pin.digest.len()
                + size_of::<WorkRequest>(),
        )?;
        self.admit_work(work.request(actor_id, episode)?)
    }
    pub(crate) fn reserve_status_growth(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.journal.reserve(bytes)
    }
    pub(crate) fn replace_status(
        &mut self,
        id: &str,
        status_id: &str,
        status: StatusInstance,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::Invariant)?;
        if status.contribution.is_some()
            || entity
                .status_effects
                .as_ref()
                .and_then(|s| s.get(status_id))
                .is_some_and(|s| s.contribution.is_some())
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        if let Some(episode) = entity
            .status_effects
            .as_ref()
            .and_then(|s| s.get(status_id))
            .map(|s| s.episode.as_str())
        {
            self.journal.reserve(episode.len())?;
            let episode = episode.to_owned();
            self.settle_episode(&episode)?;
        }
        let entity = self
            .state
            .entities
            .resolve(handle)
            .ok_or(ExecutionError::Invariant)?;
        self.journal.reserve(status_id.len())?;
        let key = UndoKey::Status(handle.slot, handle.generation, status_id.to_owned());
        let first = self.journal.first(&key)?;
        let capacity = entity.status_effects.as_ref().map_or(0, IndexMap::capacity);
        let len = entity.status_effects.as_ref().map_or(0, IndexMap::len);
        let growth = if len == capacity {
            crate::host::retained_size::map_storage::<String, StatusInstance>(
                capacity.saturating_add(1).saturating_mul(2),
            )
            .ok_or(ExecutionError::Capacity)?
        } else {
            0
        };
        self.journal.reserve(
            size_of::<Undo>() * 2
                + size_of::<PhysicalChange>() * 2
                + status_id.len() * 3
                + id.len() * 2
                + growth,
        )?;
        self.journal
            .undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        self.journal.change(PhysicalChange::Contribution {
            entity_id: id.to_owned(),
        })?;
        let target = self
            .state
            .entities
            .resolve_mut(handle)
            .ok_or(ExecutionError::Invariant)?;
        let root_present = target.status_effects.is_some();
        let map = target.status_effects.get_or_insert_with(IndexMap::new);
        let before = map
            .shift_remove_full(status_id)
            .map(|(at, _, value)| (at, value));
        if let Some((at, _)) = &before {
            map.shift_insert(*at, status_id.to_owned(), status);
        } else {
            map.insert(status_id.to_owned(), status);
        }
        if first {
            self.journal.retain(
                key,
                Undo::Status {
                    entity: handle,
                    key: status_id.to_owned(),
                    before,
                    root_present,
                },
            )?;
        }
        Ok(())
    }
    pub(crate) fn set_result_evidence(
        &mut self,
        id: &str,
        evidence: Option<crate::activity::ResultEvidence>,
    ) -> Result<(), ExecutionError> {
        let handle = self
            .state
            .entities
            .handle(id)
            .ok_or(ExecutionError::MissingEntity)?;
        if self
            .state
            .entities
            .resolve(handle)
            .and_then(|e| e.actor.as_ref())
            .is_none()
        {
            return Err(ExecutionError::MissingActor);
        }
        let key = UndoKey::ResultEvidence(handle.slot, handle.generation);
        let first = self.journal.first(&key)?;
        self.journal.reserve(size_of::<Undo>() * 2)?;
        self.journal
            .undo
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        let actor = self
            .state
            .entities
            .resolve_mut(handle)
            .and_then(|e| e.actor.as_mut())
            .ok_or(ExecutionError::Invariant)?;
        let before = std::mem::replace(&mut actor.agency.last_result_evidence, evidence);
        if first {
            self.journal.retain(
                key,
                Undo::ResultEvidence {
                    entity: handle,
                    before,
                },
            )?;
        }
        Ok(())
    }
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
        let binding_changed = actor.action.as_ref().map(|action| action.id.as_str())
            != action.as_ref().map(|action| action.id.as_str());
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
        // Preserve each binding transition. Field inverses taken while a new
        // action runs must see that action again before the earlier binding is
        // restored. The old action moves into this inverse without cloning.
        if first || binding_changed {
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
        let Some(binding) = self
            .state
            .pending_values
            .as_ref()
            .and_then(|window| window.bindings.get(episode))
        else {
            return Ok(());
        };
        let handle = self
            .state
            .entities
            .handle(&binding.entity_id)
            .ok_or(ExecutionError::MissingEntity)?;
        self.journal.reserve(
            binding
                .attributes
                .len()
                .checked_mul(size_of::<String>())
                .and_then(|n| {
                    binding
                        .attributes
                        .keys()
                        .try_fold(n, |sum, id| sum.checked_add(id.len()))
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let attributes: Vec<String> = binding.attributes.keys().cloned().collect();
        // One episode can select a different conditional attribute subset later
        // in this candidate. Its first binding image cannot stand in for the
        // separate before-value of a newly selected sparse attribute.
        for id in &attributes {
            self.snapshot_attribute(handle, id)?;
        }
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
        let mut bytes = heap_sum([
            size_of::<Undo>() * 2,
            binding.heap_bytes().ok_or(ExecutionError::Capacity)?,
            episode
                .len()
                .checked_mul(4)
                .ok_or(ExecutionError::Capacity)?,
            binding
                .entity_id
                .len()
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?,
            binding.status_id.len(),
            status.episode.len(),
            status.source_id.len(),
            status.action_target_id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        for id in binding.attributes.keys() {
            let attribute = attributes.get(id).ok_or(ValueError::MissingAttribute)?;
            bytes = heap_sum([
                bytes,
                size_of::<(String, AttributeState)>(),
                size_of::<(usize, String, String)>(),
                // The value owner preflights a temporary projection before it
                // edits any anchor. Numeric windows cannot project categories.
                size_of::<(String, AttributeState)>(),
                attribute.heap_bytes().ok_or(ExecutionError::Capacity)?,
                id.len().checked_mul(3).ok_or(ExecutionError::Capacity)?,
                episode.len(),
            ])
            .ok_or(ExecutionError::Capacity)?;
        }
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
            // Keep structural inverses in their real order even when this
            // invocation's earlier value was already captured. Otherwise a
            // later removal leaves holes when older absolute positions replay.
            // Removed records move into this inverse; no extra clone is needed.
            if first || undo.changes_membership() {
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
        if cursor.is_forecast() {
            return Err(ExecutionError::Invariant);
        }
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
        self.journal.reserve(entity.id.len())?;
        let id = entity.id.clone();
        if cursor.consumed_points > 0 {
            self.journal.reserve(
                size_of::<Undo>() * 2
                    + cursor.action_id.len() * 2
                    + action.path.heap_bytes().ok_or(ExecutionError::Capacity)?
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
