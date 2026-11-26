//! Both participants choose ordinary work under the containing command's ONE
//! candidate checkpoint. Source outings.ts::executeOuting discards both work
//! admissions on refusal; this cursor never publishes an intermediate plan.
use super::{OutingKind, OutingStatus};
use crate::commands::{
    CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep, CompletedActivityDisplay, Outcome,
};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::plans::{
    PlanMode, RequestedActivityAnswer, RequestedActivityCursor, RequestedActivityInitialError,
    RequestedActivityStart, RequestedActivityStep,
};
use crate::records::SqlCell;
use indexmap::IndexMap;
use std::mem::size_of;

pub(crate) enum TravelAcceptAnswer {
    Geometry(GeometryAnswers),
    Display(CompletedActivityDisplay),
    Personal(crate::experience::AcquiredActivityResult),
}
pub(crate) enum TravelAcceptStep<'a> {
    Geometry(&'a GeometryQueries),
    Display(&'a mut crate::commands::ActivityDisplayCursor),
    Personal(&'a crate::activity::PendingActivityResult),
    Complete(&'a TravelAcceptance),
}
pub(crate) enum TravelAcceptance {
    Accepted,
    Refused(Outcome),
    InvalidName,
}
enum Progress {
    Geometry,
    Display,
    Personal,
    Complete,
}
#[derive(PartialEq, Eq)]
enum Phase {
    Check,
    Prepare,
    Start,
    Install,
    Done,
}
pub(crate) struct TravelAcceptCursor {
    trip: Option<SqlCell>,
    recipient_mode: PlanMode,
    participant: usize,
    phase: Phase,
    choice: Option<CommandChoiceCursor>,
    requested: Option<RequestedActivityCursor>,
    result: Option<TravelAcceptance>,
    binding: GeometryBinding,
    budget: ByteBudget,
    storage: ByteReservation,
}
impl TravelAcceptCursor {
    /// The parent has already checked exact recipient/revision, expiry, current
    /// destination, reception and shared slots. Geometry/child availability is
    /// still checked for BOTH actors here before either changes their work.
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        trip_id: &str,
        recipient_mode: PlanMode,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let trip = core
            .state
            .outings
            .get(trip_id)
            .ok_or(ExecutionError::Invariant)?;
        if trip.kind() != OutingKind::Travel || trip.status() != OutingStatus::Pending {
            return Err(ExecutionError::Invariant);
        }
        let bytes = trip
            .body()
            .heap_bytes()
            .and_then(|n| n.checked_add(size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        Ok(Self {
            trip: Some(trip.body().clone_within_heap_bound()),
            recipient_mode,
            participant: 0,
            phase: Phase::Check,
            choice: None,
            requested: None,
            result: None,
            binding,
            budget: budget.clone(),
            storage,
        })
    }
    fn trip(&self) -> Result<&SqlCell, ExecutionError> {
        self.trip.as_ref().ok_or(ExecutionError::Invariant)
    }
    fn actor(&self) -> Result<&str, ExecutionError> {
        self.trip()?
            .get(if self.participant == 0 {
                "proposerId"
            } else {
                "recipientId"
            })
            .and_then(SqlCell::as_str)
            .ok_or(ExecutionError::Invariant)
    }
    fn mode(&self) -> Result<PlanMode, ExecutionError> {
        if self.participant != 0 {
            return Ok(self.recipient_mode);
        }
        match self.trip()?.get("proposerMode").and_then(SqlCell::as_str) {
            Some("enqueue") => Ok(PlanMode::Enqueue),
            Some("replace") => Ok(PlanMode::Replace),
            Some("interrupt") => Ok(PlanMode::Interrupt),
            _ => Err(ExecutionError::Invariant),
        }
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.storage.resize(
            self.storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn refuse(&mut self, code: &str, message: &str) -> Result<(), ExecutionError> {
        self.reserve(
            code.len()
                .checked_add(message.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.result = Some(TravelAcceptance::Refused(Outcome {
            ok: false,
            code: code.into(),
            message: message.into(),
            spent: None,
            outputs: None,
            recipe_id: None,
            item_id: None,
            entity_id: None,
            goal_id: None,
            plan_id: None,
            action_id: None,
        }));
        self.phase = Phase::Done;
        Ok(())
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(choice) = &mut self.choice {
            choice.abort(core)?;
        }
        if let Some(requested) = &mut self.requested {
            requested.abort(core)?;
        }
        self.choice = None;
        self.requested = None;
        Ok(())
    }
    fn install(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        let trip = self.trip()?;
        let participants = ["proposerId", "recipientId"].map(|field| {
            trip.get(field)
                .and_then(SqlCell::as_str)
                .ok_or(ExecutionError::Invariant)
        });
        let [a, b] = participants;
        let actors = [a?, b?];
        let mut extra = map_storage::<String, SqlCell>(2)
            .and_then(|n| n.checked_mul(2))
            .ok_or(ExecutionError::Capacity)?;
        for actor in actors {
            let plan = core
                .state
                .physical
                .entities
                .get(actor)
                .and_then(|e| e.actor.as_ref())
                .and_then(|a| a.agency.plan.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            extra = extra
                .checked_add(actor.len().checked_mul(2).ok_or(ExecutionError::Capacity)?)
                .and_then(|n| n.checked_add(plan.id.len()))
                .ok_or(ExecutionError::Capacity)?;
        }
        // Existing outer fields are replaced in place; only plans is appended.
        // Admit its possible map growth and the two actual participant maps.
        extra = extra
            .checked_add(trip.heap_bytes().ok_or(ExecutionError::Capacity)?)
            .and_then(|n| n.checked_add(512))
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(extra)?;
        let mut plans = IndexMap::with_capacity(2);
        for field in ["proposerId", "recipientId"] {
            let actor = self
                .trip()?
                .get(field)
                .and_then(SqlCell::as_str)
                .ok_or(ExecutionError::Invariant)?;
            let plan = core
                .state
                .physical
                .entities
                .get(actor)
                .and_then(|e| e.actor.as_ref())
                .and_then(|a| a.agency.plan.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            plans.insert(actor.to_owned(), SqlCell::Text(plan.id.as_str().into()));
        }
        let mut trip = self.trip.take().ok_or(ExecutionError::Invariant)?;
        let SqlCell::Object(fields) = &mut trip else {
            return Err(ExecutionError::UnsupportedFamily);
        };
        fields.insert("status".into(), SqlCell::Text("traveling".into()));
        fields.insert("revision".into(), SqlCell::Number(2.into()));
        // Source edits this existing participant map. A valid pending record
        // may already have entries; their insertion order remains canonical.
        let Some(SqlCell::Object(company)) = fields.get_mut("company") else {
            return Err(ExecutionError::Invariant);
        };
        for actor in plans.keys() {
            if let Some(current) = company.get_mut(actor) {
                *current = SqlCell::Bool(true);
            } else {
                company.insert(actor.clone(), SqlCell::Bool(true));
            }
        }
        fields.insert("plans".into(), SqlCell::Object(plans));
        let body = self
            .storage
            .split_off(trip.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        core.replace_outing(trip, body, &self.budget)?;
        self.result = Some(TravelAcceptance::Accepted);
        self.phase = Phase::Done;
        Ok(())
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<TravelAcceptAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let mut answer = answer;
        loop {
            match self.phase {
                Phase::Check => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    if let Some(problem) =
                        super::travel_work_problem(core, self.trip()?, self.actor()?, self.mode()?)?
                    {
                        let installed = core.state.installed.clone();
                        let message = &installed.ordinary_actions.value().travel.messages;
                        let (code, text) = match problem {
                            super::TravelWorkRefusal::Changed => {
                                ("outing-changed", &message.changed)
                            }
                            super::TravelWorkRefusal::Busy => ("outing-busy", &message.busy),
                        };
                        self.refuse(code, text)?;
                        continue;
                    }
                    self.choice = Some(super::travel_work_preview(
                        core,
                        self.trip()?,
                        self.actor()?,
                        self.binding,
                        &self.budget,
                    )?);
                    self.phase = Phase::Prepare;
                }
                Phase::Prepare => {
                    let supplied = answer
                        .take()
                        .map(|answer| match answer {
                            TravelAcceptAnswer::Geometry(value) => {
                                Ok(CommandChoiceAnswer::Geometry(value))
                            }
                            TravelAcceptAnswer::Display(value) => {
                                Ok(CommandChoiceAnswer::Display(value))
                            }
                            _ => Err(ExecutionError::UnfinishedOccurrence),
                        })
                        .transpose()?;
                    match self
                        .choice
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, supplied)?
                    {
                        CommandChoiceStep::Geometry(_) => return Ok(Progress::Geometry),
                        CommandChoiceStep::Display(_) => return Ok(Progress::Display),
                        CommandChoiceStep::Complete(value) => {
                            let ok = value.outcome().ok;
                            self.choice = None;
                            if !ok {
                                let installed = core.state.installed.clone();
                                self.refuse(
                                    "outing-route",
                                    &installed.ordinary_actions.value().travel.messages.route,
                                )?;
                            } else if self.participant == 0 {
                                self.participant = 1;
                                self.phase = Phase::Check;
                            } else {
                                self.participant = 0;
                                self.phase = Phase::Start;
                            }
                        }
                    }
                }
                Phase::Start => {
                    if self.requested.is_none() {
                        let input = super::travel_requested_input(
                            core,
                            self.trip()?,
                            self.actor()?,
                            self.mode()?,
                            &self.budget,
                        );
                        match input {
                            Ok((input, _storage)) => {
                                self.requested = Some(RequestedActivityCursor::new(
                                    input,
                                    self.binding,
                                    &self.budget,
                                )?)
                            }
                            Err(RequestedActivityInitialError::InvalidName) => {
                                self.result = Some(TravelAcceptance::InvalidName);
                                self.phase = Phase::Done;
                                continue;
                            }
                            Err(RequestedActivityInitialError::Execution(error)) => {
                                return Err(error);
                            }
                        }
                    }
                    let supplied = answer.take().map(|answer| match answer {
                        TravelAcceptAnswer::Geometry(value) => {
                            RequestedActivityAnswer::Geometry(value)
                        }
                        TravelAcceptAnswer::Display(value) => {
                            RequestedActivityAnswer::Display(value)
                        }
                        TravelAcceptAnswer::Personal(value) => {
                            RequestedActivityAnswer::Personal(value)
                        }
                    });
                    match self
                        .requested
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .step(core, supplied)?
                    {
                        RequestedActivityStep::Geometry(_) => return Ok(Progress::Geometry),
                        RequestedActivityStep::Display(_) => return Ok(Progress::Display),
                        RequestedActivityStep::Personal(_) => return Ok(Progress::Personal),
                        RequestedActivityStep::Complete(result) => {
                            if let RequestedActivityStart::Refused(outcome) = result {
                                let bytes = outcome.heap_bytes().ok_or(ExecutionError::Capacity)?;
                                self.storage.resize(
                                    self.storage
                                        .bytes()
                                        .checked_add(bytes)
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                self.result = Some(TravelAcceptance::Refused(outcome.clone()));
                                self.phase = Phase::Done;
                            } else if self.participant == 0 {
                                self.participant = 1;
                            } else {
                                self.phase = Phase::Install;
                            }
                            self.requested = None;
                        }
                    }
                }
                Phase::Install => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.install(core)?;
                }
                Phase::Done => {
                    if answer.is_some() {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    return Ok(Progress::Complete);
                }
            }
        }
    }
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        if let Some(choice) = &self.choice {
            choice.geometry_request()
        } else {
            self.requested
                .as_ref()
                .and_then(RequestedActivityCursor::geometry_request)
        }
    }

    pub(crate) fn display_cursor(&mut self) -> Option<&mut crate::commands::ActivityDisplayCursor> {
        if let Some(choice) = &mut self.choice {
            choice.display_cursor()
        } else {
            self.requested
                .as_mut()
                .and_then(RequestedActivityCursor::display_cursor)
        }
    }

    pub(crate) fn personal(
        &self,
    ) -> Result<&crate::activity::PendingActivityResult, ExecutionError> {
        self.requested
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal()
    }

    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<TravelAcceptAnswer>,
    ) -> Result<TravelAcceptStep<'a>, ExecutionError> {
        let progress = match self.drive(core, answer) {
            Ok(value) => value,
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        Ok(match progress {
            Progress::Geometry => TravelAcceptStep::Geometry(
                self.geometry_request().ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Display => {
                TravelAcceptStep::Display(self.display_cursor().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Personal => TravelAcceptStep::Personal(self.personal()?),
            Progress::Complete => {
                TravelAcceptStep::Complete(self.result.as_ref().ok_or(ExecutionError::Invariant)?)
            }
        })
    }
}
