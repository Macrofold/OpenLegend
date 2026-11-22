//! Reconcile only live consent. Plans retain their own authority, and an
//! observed separation changes the observer's terms without revealing a route.
use super::reception::{MutualHearing, sees};
use super::*;
use crate::{
    execution::{CoreMutation, StagedOccurrence},
    geometry::{GeometryAnswers, GeometryBinding, GeometryQueries},
    language::{CanonicalJsonAnswer, CanonicalJsonRequest},
    plans::PlanStatus,
    text::{JsText, TextRef},
    worlds::base_outings::{
        TravelNoticeCause, TravelNoticeEnding, TravelNoticePreparation, travel_able,
    },
};

#[derive(Clone, Copy)]
enum Notice {
    Arrived,
    Company(bool),
    Ended(TravelNoticeCause),
}

pub(crate) struct SettleTravel {
    key: crate::host::CandidateKey,
    ids: Vec<String>,
    next: usize,
    current: Option<(SqlCell, ByteReservation)>,
    notices: [Option<(usize, Notice)>; 6],
    notice: Option<(usize, TravelNoticePreparation)>,
    awaiting_receipt: Option<usize>,
    ending: Option<Ending>,
    _custody: ByteReservation,
}

struct Ending {
    cause: TravelNoticeCause,
    permitted: [bool; 2],
    reception: MutualHearing,
}

pub(crate) enum TravelAnswer {
    Geometry(GeometryAnswers),
    Terms(CanonicalJsonAnswer),
}

pub(crate) enum TravelStep {
    Geometry,
    Complete,
    Terms,
    Occurrence(StagedOccurrence),
}

impl SettleTravel {
    /// Select only the installed finite live set. Nothing in terminal history
    /// is visited. The ordinary no-offer path returns before allocating.
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        key: crate::host::CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(records) = core
            .state
            .outings
            .records
            .as_ref()
            .filter(|map| !map.is_empty())
        else {
            return Ok(None);
        };
        let mut custody = budget.reserve(size_of::<Self>())?;
        let mut ids = Vec::new();
        let mut add = |id: &str| {
            custody.resize(
                custody
                    .bytes()
                    .checked_add(id.len() + 4 * size_of::<String>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            ids.push(id.to_owned());
            Ok::<_, ExecutionError>(())
        };
        for id in records.keys() {
            add(id)?;
        }
        if ids.is_empty() {
            return Ok(None);
        }
        Ok(Some(Self {
            key,
            ids,
            next: 0,
            current: None,
            notices: [None; 6],
            notice: None,
            awaiting_receipt: None,
            ending: None,
            _custody: custody,
        }))
    }

    fn inspect(
        core: &CoreMutation<'_>,
        record: &OutingRecord,
        budget: &ByteBudget,
    ) -> Result<Inspection, ExecutionError> {
        if record.kind() != OutingKind::Travel {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let body = record.body();
        if record.status() == OutingStatus::Pending {
            let expires = body
                .get("expiresAt")
                .and_then(SqlCell::as_f64)
                .ok_or(ExecutionError::Invariant)?;
            if expires <= core.state.physical.header.sim_time {
                return Ok(Inspection::end(TravelNoticeCause::Expired));
            }
            if !travel::pending_current(core, record, budget)?
                || !travel::destination_current(core, record, budget)?
            {
                return Ok(Inspection::end(TravelNoticeCause::Changed));
            }
            return Ok(Inspection::default());
        }
        if !travel::destination_current(core, record, budget)? {
            return Ok(Inspection::end(TravelNoticeCause::Unavailable));
        }
        let plans = body.get("plans").ok_or(ExecutionError::Invariant)?;
        let arrived = body
            .get("arrived")
            .and_then(SqlCell::as_array)
            .ok_or(ExecutionError::Invariant)?;
        let company = body.get("company").ok_or(ExecutionError::Invariant)?;
        let mut result = Inspection::default();
        for (index, actor) in record.participants().into_iter().enumerate() {
            if !travel_able(core, actor)? {
                return Ok(Inspection::end(TravelNoticeCause::Unavailable));
            }
            let actor_body = core
                .state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.actor.as_ref())
                .ok_or(ExecutionError::MissingActor)?;
            let plan_id = travel::text(plans, actor)?;
            let Some(plan) = actor_body.agency.plan.as_ref().filter(|plan| {
                plan.id == plan_id
                    && !matches!(plan.status, PlanStatus::Cancelled | PlanStatus::Blocked)
                    && actor_body.action.as_ref().is_none_or(|action| {
                        plan.steps.iter().any(|step| {
                            step.status == crate::plans::StepStatus::Running
                                && step.action_id.as_ref() == Some(&action.id)
                        })
                    })
            }) else {
                return Ok(Inspection::end(TravelNoticeCause::Interrupted));
            };
            result.arrival[index] = plan.status == PlanStatus::Completed
                && !arrived.iter().any(|cell| cell.as_str() == Some(actor));
            let other = record.participants()[1 - index];
            let seen = sees(core, actor, other)?;
            if company.get(actor).and_then(SqlCell::as_bool) != Some(seen) {
                result.company[index] = Some(seen);
            }
        }
        if arrived.len() + result.arrival.iter().filter(|arrived| **arrived).count() == 2 {
            result.end = Some(TravelNoticeCause::Finished);
        }
        Ok(result)
    }

    fn advance_one(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(id) = self.ids.get(self.next) else {
            return Ok(false);
        };
        self.next += 1;
        let Some(record) = core.state.outings.get(id) else {
            return Ok(true);
        };
        let next = Self::inspect(core, record, budget)?;
        if next.end.is_none()
            && !next.arrival.iter().any(|v| *v)
            && !next.company.iter().any(Option::is_some)
        {
            return Ok(true);
        }
        let bytes = record.body().heap_bytes().ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve(
            bytes
                .checked_mul(2)
                .and_then(|n| n.checked_add(1536))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut body = record.body().clone_within_heap_bound();
        let SqlCell::Object(values) = &mut body else {
            return Err(ExecutionError::Invariant);
        };
        let mut at = 0;
        for (index, actor) in record.participants().into_iter().enumerate() {
            if next.arrival[index] {
                let Some(SqlCell::Array(arrived)) = values.get_mut("arrived") else {
                    return Err(ExecutionError::Invariant);
                };
                arrived.push(SqlCell::Text(actor.into()));
                self.notices[at] = Some((index, Notice::Arrived));
                at += 1;
            }
            if let Some(seen) = next.company[index] {
                let Some(SqlCell::Object(company)) = values.get_mut("company") else {
                    return Err(ExecutionError::Invariant);
                };
                company.insert(actor.to_owned(), SqlCell::Bool(seen));
                self.notices[at] = Some((index, Notice::Company(seen)));
                at += 1;
            }
        }
        let mut permission = [false; 2];
        if next.end.is_some() {
            for (index, actor) in record.participants().into_iter().enumerate() {
                permission[index] =
                    crate::outings::view::knows_current(core.state, actor, id, budget)?;
            }
        }
        self.current = Some((body, custody));
        if let Some(cause) = next.end {
            if matches!(cause, TravelNoticeCause::Expired) {
                self.close(core, cause, permission, budget)?;
            } else {
                let receiver = if permission.iter().any(|allowed| *allowed) {
                    let trip = &self.current.as_ref().ok_or(ExecutionError::Invariant)?.0;
                    let binding = GeometryBinding::new(
                        self.key,
                        core.state.installed.geometry.spatial.revision,
                        core.journal.next_provider_serial()?,
                    );
                    MutualHearing::prepare(core, participants(trip)?, binding, budget)?
                } else {
                    None
                };
                if let Some(reception) = receiver {
                    self.ending = Some(Ending {
                        cause,
                        permitted: permission,
                        reception,
                    });
                } else {
                    self.close(core, cause, [false; 2], budget)?;
                }
            }
        } else {
            let body = &self.current.as_ref().ok_or(ExecutionError::Invariant)?.0;
            let allocation = budget.reserve(body.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            core.replace_outing(body.clone_within_heap_bound(), allocation, budget)?;
        }
        Ok(true)
    }

    fn close(
        &mut self,
        core: &mut CoreMutation<'_>,
        cause: TravelNoticeCause,
        permission: [bool; 2],
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let body = &self.current.as_ref().ok_or(ExecutionError::Invariant)?.0;
        core.remove_outing(travel::text(body, "id")?)?;
        travel::stop_owned_travel(core, body, cause, permission, budget)?;
        let mut available = self.notices.iter_mut().filter(|entry| entry.is_none());
        for (index, allowed) in permission.into_iter().enumerate() {
            if allowed {
                *available.next().ok_or(ExecutionError::Invariant)? =
                    Some((index, Notice::Ended(cause)));
            }
        }
        Ok(())
    }

    pub(crate) fn geometry(&self) -> Option<&GeometryQueries> {
        self.ending
            .as_ref()
            .map(|ending| ending.reception.queries())
    }

    pub(crate) fn link_notice(
        &mut self,
        core: &mut CoreMutation<'_>,
        receipt: &crate::events::CompletedOccurrence,
    ) -> Result<(), ExecutionError> {
        let index = self
            .awaiting_receipt
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        let trip = &self.current.as_ref().ok_or(ExecutionError::Invariant)?.0;
        travel::link_plan_notice(core, trip, participants(trip)?[index], receipt)
    }

    pub(crate) fn terms(&self) -> Option<&CanonicalJsonRequest> {
        self.notice.as_ref()?.1.canonical_request().ok()
    }

    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<TravelAnswer>,
        budget: &ByteBudget,
    ) -> Result<TravelStep, ExecutionError> {
        match answer {
            Some(TravelAnswer::Terms(answer)) => {
                let (index, prior) = self
                    .notice
                    .take()
                    .ok_or(ExecutionError::InvalidCheckpoint)?;
                let (intent, _guard) = prior.finish(answer)?;
                self.awaiting_receipt = Some(index);
                return Ok(TravelStep::Occurrence(core.stage_event(intent)?));
            }
            Some(TravelAnswer::Geometry(answer)) => {
                let pending = self
                    .ending
                    .take()
                    .ok_or(ExecutionError::InvalidCheckpoint)?;
                let body = &self.current.as_ref().ok_or(ExecutionError::Invariant)?.0;
                let visible = pending
                    .reception
                    .finish(core, participants(body)?, answer)?;
                self.close(
                    core,
                    pending.cause,
                    if visible {
                        pending.permitted
                    } else {
                        [false; 2]
                    },
                    budget,
                )?;
            }
            None => {}
        }
        if self.notice.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        loop {
            if self.ending.is_some() {
                return Ok(TravelStep::Geometry);
            }
            if let Some((index, kind)) = self.notices.iter_mut().find_map(Option::take) {
                let trip = &self.current.as_ref().ok_or(ExecutionError::Invariant)?.0;
                let actor = travel::text(
                    trip,
                    if index == 0 {
                        "proposerId"
                    } else {
                        "recipientId"
                    },
                )?;
                let ordinary = core.state.installed.ordinary_actions.value();
                let rules = &ordinary.travel;
                let destination = trip
                    .get("destination")
                    .and_then(|body| body.get("label"))
                    .and_then(SqlCell::as_text)
                    .ok_or(ExecutionError::Invariant)?;
                let _rendering = budget.reserve(512 + destination.storage_bytes() * 12)?;
                let proper = |template| {
                    ordinary
                        .plan
                        .text(template, &[("place", TextRef::from(destination))])
                };
                let (words, ending) = match kind {
                    Notice::Arrived => (proper(&rules.templates.arrived), None),
                    Notice::Company(seen) => (
                        JsText::from(if seen {
                            rules.messages.company.as_str()
                        } else {
                            rules.messages.separated.as_str()
                        }),
                        None,
                    ),
                    Notice::Ended(cause) => {
                        let reason = cause.reason(&rules.messages);
                        let words = ordinary.plan.text(
                            &rules.templates.ended,
                            &[("place", destination.into()), ("reason", reason.into())],
                        );
                        (
                            words,
                            Some(TravelNoticeEnding {
                                cause,
                                actor_id: None,
                            }),
                        )
                    }
                };
                let binding = GeometryBinding::new(
                    self.key,
                    core.state.installed.geometry.spatial.revision,
                    core.journal.next_provider_serial()?,
                );
                self.notice = TravelNoticePreparation::prepare(
                    core, trip, actor, &words, ending, binding, budget,
                )?
                .map(|notice| (index, notice));
                if self.notice.is_some() {
                    return Ok(TravelStep::Terms);
                }
            } else {
                self.current = None;
                if !self.advance_one(core, budget)? {
                    return Ok(TravelStep::Complete);
                }
            }
        }
    }
}

#[derive(Default)]
struct Inspection {
    arrival: [bool; 2],
    company: [Option<bool>; 2],
    end: Option<TravelNoticeCause>,
}
impl Inspection {
    fn end(cause: TravelNoticeCause) -> Self {
        Self {
            end: Some(cause),
            ..Self::default()
        }
    }
}

fn participants(trip: &SqlCell) -> Result<[&str; 2], ExecutionError> {
    Ok([
        travel::text(trip, "proposerId")?,
        travel::text(trip, "recipientId")?,
    ])
}
