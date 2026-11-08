//! One observer finishes receiving before its private notices. The actual event
//! cursor owns every notice's causal duties; only its sealed completion advances
//! publication. The encounter queue closes before this observer can complete.
use super::*;
use crate::events::{
    CompletedEvent, EncounterBatch, EncounterNoticeKind, EventCursor, EventError,
    begin_staged_occurrence,
};
#[derive(Debug)]
pub(crate) enum ObserverReceptionError {
    Execution(ExecutionError),
    Event(EventError),
    Emission(crate::events::EmissionError),
}
impl From<ExecutionError> for ObserverReceptionError {
    fn from(e: ExecutionError) -> Self {
        Self::Execution(e)
    }
}
impl From<EventError> for ObserverReceptionError {
    fn from(e: EventError) -> Self {
        Self::Event(e)
    }
}
impl From<crate::host::CapacityError> for ObserverReceptionError {
    fn from(_: crate::host::CapacityError) -> Self {
        Self::Execution(ExecutionError::Capacity)
    }
}
impl From<crate::received::ReceivedError> for ObserverReceptionError {
    fn from(e: crate::received::ReceivedError) -> Self {
        Self::Execution(e.into())
    }
}
impl From<crate::events::EmissionError> for ObserverReceptionError {
    fn from(e: crate::events::EmissionError) -> Self {
        Self::Emission(e)
    }
}
pub(crate) enum ObserverReceptionAnswer {
    Visual(PersonalVisualAnswer),
    Event(CompletedEvent),
}
pub(crate) enum ObserverReceptionStep<'a> {
    Geometry(&'a GeometryQueries),
    Language(&'a CollationRequest),
    Event(&'a mut EventCursor),
    Complete(CompletedObserverReception),
}
pub(crate) struct CompletedObserverReception {
    pub events: Vec<CompletedEvent>,
    _received: ReceivedPersonalVisual,
    _reservation: ByteReservation,
}
impl CompletedObserverReception {
    pub(crate) fn observer(&self) -> &ObserverLife {
        &self._received.observer
    }
}
enum PublicationPhase {
    Receiving,
    People,
    PublishPeople,
    PublishObjects,
    Objects,
    Finish,
    Done,
}
struct ExpectedEvent {
    id: String,
    order: u64,
    sequence: u64,
}
pub(crate) struct ObserverReceptionCursor {
    visual: Option<PersonalVisualCursor>,
    received: Option<ReceivedPersonalVisual>,
    candidate: CandidateKey,
    phase: PublicationPhase,
    index: usize,
    batch: Option<EncounterBatch>,
    event: Option<EventCursor>,
    expected: Option<ExpectedEvent>,
    events: Vec<CompletedEvent>,
    reservation: Option<ByteReservation>,
}
enum Progress {
    Geometry,
    Language,
    Event,
    Complete(CompletedObserverReception),
}
impl ObserverReceptionCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        sight: SightResults,
        opportunity: VisualOpportunity,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ObserverReceptionError> {
        let reservation = budget.reserve(size_of::<Self>())?;
        Ok(Self {
            visual: Some(PersonalVisualCursor::prepare(
                core,
                sight,
                opportunity,
                candidate,
                budget,
            )?),
            received: None,
            candidate,
            phase: PublicationPhase::Receiving,
            index: 0,
            batch: None,
            event: None,
            expected: None,
            events: Vec::new(),
            reservation: Some(reservation),
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ObserverReceptionAnswer>,
        budget: &ByteBudget,
    ) -> Result<ObserverReceptionStep<'a>, ObserverReceptionError> {
        let progress = self.drive(core, answer, budget)?;
        Ok(match progress {
            Progress::Geometry => ObserverReceptionStep::Geometry(
                self.visual
                    .as_ref()
                    .and_then(PersonalVisualCursor::geometry_request)
                    .ok_or_else(invalid)?,
            ),
            Progress::Language => ObserverReceptionStep::Language(
                self.visual
                    .as_ref()
                    .and_then(PersonalVisualCursor::language_request)
                    .ok_or_else(invalid)?,
            ),
            Progress::Event => {
                ObserverReceptionStep::Event(self.event.as_mut().ok_or_else(invalid)?)
            }
            Progress::Complete(value) => ObserverReceptionStep::Complete(value),
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<ObserverReceptionAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, ObserverReceptionError> {
        if let Some(expected) = &self.expected {
            match answer.take() {
                None => return Ok(Progress::Event),
                Some(ObserverReceptionAnswer::Event(completed)) => {
                    if completed.event.id != expected.id
                        || completed.completed.event_id() != expected.id
                        || completed.completed.order() != expected.order
                        || completed.completed.sequence() != expected.sequence
                    {
                        return Err(invalid().into());
                    }
                    self.events.push(completed);
                    self.event = None;
                    self.expected = None;
                }
                _ => return Err(invalid().into()),
            }
        }
        loop {
            match self.phase {
                PublicationPhase::Receiving => {
                    let input = match answer.take() {
                        Some(ObserverReceptionAnswer::Visual(answer)) => Some(answer),
                        None => None,
                        _ => return Err(invalid().into()),
                    };
                    let step = self
                        .visual
                        .as_mut()
                        .ok_or_else(invalid)?
                        .step(core, input, budget)?;
                    let received = match step {
                        PersonalVisualStep::Geometry(_) => return Ok(Progress::Geometry),
                        PersonalVisualStep::Language(_) => return Ok(Progress::Language),
                        PersonalVisualStep::Received(value) => value,
                    };
                    let bytes = received
                        .notices
                        .len()
                        .checked_mul(size_of::<CompletedEvent>())
                        .ok_or(ExecutionError::Capacity)?;
                    let reservation = self.reservation.as_mut().ok_or_else(invalid)?;
                    reservation.resize(
                        reservation
                            .bytes()
                            .checked_add(bytes)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.events
                        .try_reserve_exact(received.notices.len())
                        .map_err(|_| ExecutionError::Capacity)?;
                    self.batch = Some(EncounterBatch::open(core, &received.observer.actor_id)?);
                    self.received = Some(received);
                    self.visual = None;
                    self.phase = PublicationPhase::People;
                }
                PublicationPhase::People | PublicationPhase::Objects => {
                    if answer.is_some() {
                        return Err(invalid().into());
                    }
                    let received = self.received.as_ref().ok_or_else(invalid)?;
                    let people = matches!(self.phase, PublicationPhase::People);
                    let roster = if people {
                        &received.people
                    } else {
                        &received.objects
                    };
                    while self.index < roster.len() {
                        let id = &roster[self.index];
                        self.index += 1;
                        let Some(notice) = received
                            .notices
                            .iter()
                            .find(|notice| notice.person == people && notice.target_id == *id)
                        else {
                            continue;
                        };
                        let staged = self.batch.as_ref().ok_or_else(invalid)?.stage_notice(
                            core,
                            id,
                            &notice.detail,
                            if people {
                                EncounterNoticeKind::Person
                            } else {
                                EncounterNoticeKind::Object
                            },
                            budget,
                        )?;
                        let (staged, placement, _staging) = staged.into_parts();
                        let reservation = self.reservation.as_mut().ok_or_else(invalid)?;
                        reservation.resize(
                            reservation
                                .bytes()
                                .checked_add(staged.id.len())
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let expected = ExpectedEvent {
                            id: staged.id.clone(),
                            order: staged.order,
                            sequence: staged.sequence,
                        };
                        let begun = begin_staged_occurrence(core, staged, budget)?;
                        let binding = GeometryBinding::new(
                            self.candidate,
                            core.state.installed.geometry.spatial.revision,
                            core.journal.next_provider_serial()?,
                        );
                        self.event = Some(EventCursor::prepare(
                            core, begun, binding, placement, budget,
                        )?);
                        self.expected = Some(expected);
                        return Ok(Progress::Event);
                    }
                    self.index = 0;
                    self.phase = if people {
                        PublicationPhase::PublishPeople
                    } else {
                        PublicationPhase::Finish
                    };
                }
                PublicationPhase::PublishPeople => {
                    let received = self.received.as_mut().ok_or_else(invalid)?;
                    if !received.detail_only {
                        core.journal.current.set_visibility(
                            &mut core.state.reception,
                            &received.observer.actor_id,
                            true,
                            std::mem::take(&mut received.people),
                        )?;
                    }
                    self.require_closed_combat(core)?;
                    self.phase = PublicationPhase::PublishObjects;
                }
                PublicationPhase::PublishObjects => {
                    let received = self.received.as_mut().ok_or_else(invalid)?;
                    // Objects are still needed for their ordered notices; the new
                    // canonical list and this finite continuation have separate custody.
                    if !received.detail_only {
                        core.journal.current.reserve_growth(
                            received
                                .objects
                                .heap_bytes()
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        core.journal.current.set_visibility(
                            &mut core.state.reception,
                            &received.observer.actor_id,
                            false,
                            received.objects.clone(),
                        )?;
                    }
                    self.phase = PublicationPhase::Objects;
                }
                PublicationPhase::Finish => {
                    self.batch
                        .take()
                        .ok_or_else(invalid)?
                        .finish(core, budget)?;
                    self.phase = PublicationPhase::Done;
                    return Ok(Progress::Complete(CompletedObserverReception {
                        events: std::mem::take(&mut self.events),
                        _received: self.received.take().ok_or_else(invalid)?,
                        _reservation: self.reservation.take().ok_or_else(invalid)?,
                    }));
                }
                PublicationPhase::Done => return Err(invalid().into()),
            }
        }
    }
    fn require_closed_combat(&self, core: &CoreMutation<'_>) -> Result<(), ExecutionError> {
        let id = &self
            .received
            .as_ref()
            .ok_or_else(invalid)?
            .observer
            .actor_id;
        let actor = core
            .state
            .physical
            .entities
            .get(id)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        // Full physical import refuses combat encounters and offensive action
        // families; selected command/native writers cannot create them. Ordinary
        // frontiers do not supply Source's finite prepared-response subject graph.
        if actor.encounters.is_some()
            || [actor.agency.plan.as_ref(), actor.agency.suspended_plan()]
                .into_iter()
                .flatten()
                .any(|plan| plan.activity.is_some())
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        for source in core
            .state
            .reception
            .visible_people
            .as_ref()
            .and_then(|r| r.get(id))
            .into_iter()
            .flatten()
        {
            if core
                .state
                .physical
                .entities
                .get(source)
                .and_then(|e| e.actor.as_ref())
                .and_then(|a| a.action.as_ref())
                .is_some_and(|a| a.has_unconverted_fields())
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
        }
        Ok(())
    }
}
