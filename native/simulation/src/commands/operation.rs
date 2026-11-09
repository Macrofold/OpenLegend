//! Standalone commands and plan children share this execution owner. It owns
//! their real checkpoint, personal-result acquisition and common finalizer;
//! callers supply only finite physical/language answers to the existing owners.
use super::*;
use crate::events::{
    CompletedEvent, EventAccountPlacement, EventCursor, EventError, WorldEvent,
    begin_staged_occurrence,
};
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::experience::{
    MemoryAcquisitionError, ResultAcquisitionError, acquire_activity_result,
    prepare_activity_result,
};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use std::mem::size_of;

#[derive(Debug)]
pub(crate) enum CommandOperationError {
    Execution(ExecutionError),
    Event(EventError),
    Emission(crate::events::EmissionError),
    Result(ResultAcquisitionError),
    Reconcile(MemoryAcquisitionError),
    Occurrence(crate::events::OccurrenceError),
}
impl From<crate::events::OccurrenceError> for CommandOperationError {
    fn from(error: crate::events::OccurrenceError)->Self { Self::Occurrence(error) }
}
impl From<ExecutionError> for CommandOperationError {
    fn from(error: ExecutionError) -> Self {
        Self::Execution(error)
    }
}
impl From<crate::host::CapacityError> for CommandOperationError {
    fn from(_: crate::host::CapacityError) -> Self {
        ExecutionError::Capacity.into()
    }
}
impl From<EventError> for CommandOperationError {
    fn from(error: EventError) -> Self {
        Self::Event(error)
    }
}
impl From<crate::events::EmissionError> for CommandOperationError {
    fn from(error: crate::events::EmissionError) -> Self {
        Self::Emission(error)
    }
}
impl From<ResultAcquisitionError> for CommandOperationError {
    fn from(error: ResultAcquisitionError) -> Self {
        Self::Result(error)
    }
}
impl From<MemoryAcquisitionError> for CommandOperationError {
    fn from(error: MemoryAcquisitionError) -> Self {
        Self::Reconcile(error)
    }
}
pub(crate) enum CommandOperationAnswer {
    Geometry(GeometryAnswers),
    Event(CompletedEvent),
    Display(super::CompletedActivityDisplay),
}
pub(crate) enum CommandOperationStep<'a> {
    Geometry(&'a GeometryQueries),
    Event(&'a mut EventCursor),
    Display(&'a mut super::ActivityDisplayCursor),
    Complete(CompletedCommandOperation),
}
pub(crate) struct CompletedCommandOperation {
    pub command: CompletedCommand,
    pub events: Vec<WorldEvent>,
    _reservation: ByteReservation,
}
impl CompletedCommandOperation {
    pub(crate) fn into_parts(self) -> (CompletedCommand, Vec<WorldEvent>, ByteReservation) {
        (self.command, self.events, self._reservation)
    }
}
struct ExpectedEvent {
    id: String,
    order: u64,
    sequence: u64,
    _reservation: ByteReservation,
}
pub(crate) struct CommandOperation {
    cursor: CommandCursor,
    child: Option<CandidateCheckpoint>,
    candidate: CandidateKey,
    event: Option<EventCursor>,
    expected: Option<ExpectedEvent>,
    command_answer: Option<CommandAnswer>,
    events: Vec<WorldEvent>,
    event_backing: usize,
    reservation: Option<ByteReservation>,
}
enum Progress {
    Geometry,
    Event,
    Display,
    Complete(CompletedCommandOperation),
}
impl CommandOperation {
    pub(crate) fn is_complete(&self) -> bool {
        self.child.is_none() && self.reservation.is_none()
    }
    /// Cursor construction is read-only. The checkpoint precedes its first
    /// step, so an ordinary refusal cannot retain even a dependent write.
    pub(crate) fn from_cursor(
        core: &mut CoreMutation<'_>,
        cursor: CommandCursor,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, CommandOperationError> {
        let reservation = budget.reserve(size_of::<Self>())?;
        let child = core.journal.checkpoint(core.state)?;
        Ok(Self {
            cursor,
            child: Some(child),
            candidate,
            event: None,
            expected: None,
            command_answer: None,
            events: Vec::new(),
            event_backing: 0,
            reservation: Some(reservation),
        })
    }
    /// Operational failure rolls back this child. Earlier completed response
    /// components belong to its parent and therefore remain intact.
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        self.cursor.abort(core)?;
        if let Some(child) = self.child.take() {
            core.journal.rollback_to(core.state, child)?;
        }
        self.event = None;
        self.expected = None;
        self.command_answer = None;
        self.events.clear();
        Ok(())
    }
    fn retain_event(
        &mut self,
        value: CompletedEvent,
    ) -> Result<CommandAnswer, CommandOperationError> {
        let Some(expected) = &self.expected else {
            return Err(ExecutionError::UnfinishedOccurrence.into());
        };
        if value.event.id != expected.id
            || value.completed.event_id() != expected.id
            || value.completed.order() != expected.order
            || value.completed.sequence() != expected.sequence
        {
            return Err(ExecutionError::UnfinishedOccurrence.into());
        }
        let reservation = self.reservation.as_mut().ok_or(ExecutionError::Invariant)?;
        if self.events.len() == self.events.capacity() {
            let needed = self
                .events
                .len()
                .checked_add(1)
                .ok_or(ExecutionError::Capacity)?;
            let backing = needed
                .checked_mul(size_of::<WorldEvent>())
                .ok_or(ExecutionError::Capacity)?;
            reservation.resize(
                reservation
                    .bytes()
                    .checked_add(backing - self.event_backing)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.events
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
            let actual = self
                .events
                .capacity()
                .checked_mul(size_of::<WorldEvent>())
                .ok_or(ExecutionError::Capacity)?;
            reservation.resize(
                reservation
                    .bytes()
                    .checked_add(actual - backing)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.event_backing = actual;
        }
        let CompletedEvent {
            event,
            completed,
            awareness,
            reservation: event_reservation,
        } = value;
        // All real output storage stays funded after the event cursor drops.
        // Its no-longer-needed compact awareness output is freed here.
        drop(awareness);
        reservation.merge(event_reservation)?;
        self.events.push(event);
        self.event = None;
        self.expected = None;
        Ok(CommandAnswer::Occurrence(completed))
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandOperationAnswer>,
        budget: &ByteBudget,
    ) -> Result<CommandOperationStep<'a>, CommandOperationError> {
        let progress = match self.drive(core, answer, budget) {
            Ok(value) => value,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            Progress::Geometry => CommandOperationStep::Geometry(
                self.cursor
                    .geometry_request()
                    .ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Event => {
                CommandOperationStep::Event(self.event.as_mut().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete(value) => CommandOperationStep::Complete(value),
            Progress::Display => CommandOperationStep::Display(
                self.cursor
                    .display_cursor()
                    .ok_or(ExecutionError::Invariant)?,
            ),
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandOperationAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, CommandOperationError> {
        if self.reservation.is_none() {
            return Err(ExecutionError::Invariant.into());
        }
        match answer {
            Some(CommandOperationAnswer::Event(value)) => {
                self.command_answer = Some(self.retain_event(value)?)
            }
            Some(CommandOperationAnswer::Display(value)) if self.event.is_none() => {
                self.command_answer = Some(CommandAnswer::Display(value));
            }
            Some(CommandOperationAnswer::Geometry(value)) if self.event.is_none() => {
                self.command_answer = Some(CommandAnswer::Geometry(value))
            }
            Some(_) => return Err(ExecutionError::UnfinishedOccurrence.into()),
            None => {}
        }
        if self.event.is_some() {
            return Ok(Progress::Event);
        }
        loop {
            match self.cursor.step(core, self.command_answer.take())? {
                CommandStep::Geometry(_) => return Ok(Progress::Geometry),
                CommandStep::Display(_) => return Ok(Progress::Display),
                CommandStep::Occurrence(staged) => {
                    let reservation = budget.reserve(
                        staged
                            .id
                            .len()
                            .checked_add(size_of::<ExpectedEvent>())
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.expected = Some(ExpectedEvent {
                        id: staged.id.clone(),
                        order: staged.order,
                        sequence: staged.sequence,
                        _reservation: reservation,
                    });
                    let begun = begin_staged_occurrence(core, staged, budget)?;
                    let binding = GeometryBinding::new(
                        self.candidate,
                        core.state.installed.geometry.spatial.revision,
                        core.journal.next_provider_serial()?,
                    );
                    self.event = Some(EventCursor::prepare(
                        core,
                        begun,
                        binding,
                        EventAccountPlacement::Immediate,
                        budget,
                    )?);
                    return Ok(Progress::Event);
                }
                CommandStep::Personal(pending) => {
                    let plan = prepare_activity_result(core, pending, budget)?;
                    let schema = core.state.installed.schema.clone();
                    self.command_answer = Some(CommandAnswer::Personal(acquire_activity_result(
                        core, plan, &schema,
                    )?));
                }
                CommandStep::EndEvidence {
                    observer_id,
                    physical_life,
                    at,
                } => {
                    let proof = crate::reception::end_current_evidence(core, observer_id, budget)?;
                    if proof.physical_life() != physical_life || proof.at() != at {
                        return Err(ExecutionError::UnfinishedOccurrence.into());
                    }
                    self.command_answer = Some(CommandAnswer::EvidenceEnded(proof));
                }
                CommandStep::Complete(pending) => {
                    let child = self.child.take().ok_or(ExecutionError::InvalidCheckpoint)?;
                    let completed =
                        complete_command_in_draft(core, child, pending, &self.events, budget)?;
                    if !completed.outcome().ok {
                        self.events.clear();
                    }
                    return Ok(Progress::Complete(CompletedCommandOperation {
                        command: completed,
                        events: std::mem::take(&mut self.events),
                        _reservation: self.reservation.take().ok_or(ExecutionError::Invariant)?,
                    }));
                }
            }
        }
    }
}
