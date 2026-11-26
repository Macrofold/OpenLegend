//! Consent rides on the normal command checkpoint and private receiving
//! path. A pending invitation does not own or move either physical actor.
use super::*;
use crate::commands::{CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep};
use crate::geometry::RoutePlan;
use crate::outings::{OutingKind, OutingStatus, reception::MutualHearing, travel as offers};
use crate::records::SqlCell;
use crate::text::JsText;
use crate::worlds::base_outings::{
    TravelAcceptAnswer, TravelAcceptCursor, TravelAcceptStep, TravelAcceptance, TravelDestination,
    TravelInput, TravelNoticeCause, TravelNoticeEnding, TravelNoticePreparation, travel_able,
    travel_work_preview, travel_work_problem,
};

mod combat;
mod cooperation;
pub(super) struct Consent {
    joint: Option<cooperation::Change>,
    trip: Option<(SqlCell, ByteReservation)>,
    pub(super) notice: Option<TravelNoticePreparation>,
    choice: Option<CommandChoiceCursor>,
    acceptance: Option<TravelAcceptCursor>,
    announce: usize,
    end: Option<TravelNoticeCause>,
    ending_reception: Option<MutualHearing>,
    other_received_ending: bool,
    _custody: ByteReservation,
}

impl Consent {
    fn new(budget: &ByteBudget) -> Result<Box<Self>, ExecutionError> {
        let custody = budget.reserve(size_of::<Self>())?;
        Ok(Box::new(Self {
            joint: None,
            trip: None,
            notice: None,
            choice: None,
            acceptance: None,
            announce: 0,
            end: None,
            ending_reception: None,
            other_received_ending: false,
            _custody: custody,
        }))
    }

    pub(super) fn acceptance(&self) -> Option<&TravelAcceptCursor> {
        self.acceptance.as_ref()
    }

    pub(super) fn queries(&self) -> Option<&GeometryQueries> {
        if let Some(reception) = self.ending_reception.as_ref() {
            return Some(reception.queries());
        }
        self.choice
            .as_ref()
            .and_then(CommandChoiceCursor::geometry_request)
            .or_else(|| {
                self.acceptance
                    .as_ref()
                    .and_then(TravelAcceptCursor::geometry_request)
            })
    }

    pub(super) fn display(&mut self) -> Option<&mut ActivityDisplayCursor> {
        if let Some(choice) = self.choice.as_mut() {
            return choice.display_cursor();
        }
        self.acceptance.as_mut()?.display_cursor()
    }

    pub(super) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(choice) = self.choice.as_mut() {
            choice.abort(core)?;
        }
        if let Some(acceptance) = self.acceptance.as_mut() {
            acceptance.abort(core)?;
        }
        Ok(())
    }
}

impl CommandCursor {
    fn travel_input<'a>(
        &'a self,
        core: &CoreMutation<'_>,
    ) -> Result<TravelInput<'a>, ExecutionError> {
        let NativeCommand::Outing {
            envelope,
            parameters,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        core.state
            .installed
            .ordinary_actions
            .value()
            .travel
            .input(parameters.value(), envelope.purpose.as_ref())
            .map_err(|_| ExecutionError::UnsupportedFamily)
    }

    fn travel_result(
        &mut self,
        ok: bool,
        code: &str,
        text: impl Into<JsText>,
    ) -> Result<(), ExecutionError> {
        let text = text.into();
        self.reserve(128 + code.len() + text.storage_bytes())?;
        let mut result = outcome(ok, code, "");
        result.message = text;
        self.outcome = Some(result);
        self.phase = if ok { Phase::Tail } else { Phase::Done };
        Ok(())
    }

    pub(super) fn begin_travel(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, ExecutionError> {
        let installed = core.state.installed.clone();
        let words = &installed.ordinary_actions.value().travel.messages;
        if let NativeCommand::Outing { parameters, .. } = &self.command {
            let args = parameters.value();
            if args.get("operation").and_then(SqlCell::as_str) == Some("help")
                || args
                    .get("outingId")
                    .and_then(SqlCell::as_str)
                    .and_then(|id| core.state.outings.get(id))
                    .is_some_and(|r| r.kind() == OutingKind::CombatHelp)
            {
                return self.begin_combat_help(core);
            }
        }
        if let NativeCommand::Outing { parameters, .. } = &self.command
            && cooperation::selected(core.state, parameters.value())
        {
            return self.begin_joint(core);
        }

        if !installed.travel || installed.retained.social_offer_read.is_none() {
            self.travel_result(false, "unsupported-command", words.unavailable.as_str())?;
            return Ok(None);
        }
        let input = match self.travel_input(core) {
            Ok(input) => input,
            Err(ExecutionError::UnsupportedFamily) => {
                self.travel_result(false, "invalid-command", words.terms.as_str())?;
                return Ok(None);
            }
            Err(error) => return Err(error),
        };
        let actor = self.actor_id();
        match input {
            TravelInput::Invite {
                recipient_id,
                destination,
                ..
            } => {
                if actor == recipient_id {
                    self.travel_result(false, "not-visible", words.person.as_str())?;
                    return Ok(None);
                }
                if !travel_able(core, actor)? || !travel_able(core, recipient_id)? {
                    self.travel_result(false, "outing-unavailable", words.nearby.as_str())?;
                    return Ok(None);
                }
                if let Some(problem) =
                    offers::pending_slots(core, actor, recipient_id, &self.budget)?
                {
                    self.travel_result(false, problem.code, problem.message.clone())?;
                    return Ok(None);
                }
                if offers::live_pair(&core.state.outings, actor, recipient_id, &self.budget)? {
                    self.travel_result(false, "outing-pending", words.pending.as_str())?;
                    return Ok(None);
                }
                let accepted = |id| {
                    core.state
                        .outings
                        .accepted_id(id, OutingKind::Travel, &self.budget)
                };
                if accepted(actor)?.is_some() || accepted(recipient_id)?.is_some() {
                    self.travel_result(false, "outing-limit", words.limit.as_str())?;
                    return Ok(None);
                }
                let contact = match destination {
                    TravelDestination::Entity(id) => Some(id),
                    TravelDestination::Point(_) => None,
                };
                let targets = [recipient_id, contact.unwrap_or(recipient_id)];
                let mut binding = self.binding;
                binding.serial = core.journal.next_provider_serial()?;
                self.sight = Some(
                    crate::reception::SightBatch::prepare(
                        &core.state.physical,
                        &installed,
                        actor,
                        &targets[..1 + usize::from(contact.is_some())],
                        binding,
                        &self.budget,
                    )
                    .map_err(|error| match error {
                        crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                        _ => ExecutionError::Invariant,
                    })?,
                );
                self.binding = binding;
                self.phase = Phase::TravelStartSight;
                Ok(Some(Progress::Geometry))
            }
            TravelInput::Decline {
                outing_id,
                expected_revision,
                ..
            }
            | TravelInput::Leave {
                outing_id,
                expected_revision,
                ..
            } => {
                let decline = matches!(input, TravelInput::Decline { .. });
                let Some(record) = core.state.outings.get(outing_id).filter(|record| {
                    record.kind() == OutingKind::Travel
                        && record.revision() == expected_revision
                        && record.participants().contains(&actor)
                        && (!decline
                            || record.status() == OutingStatus::Pending
                                && record.participants()[1] == actor)
                }) else {
                    self.travel_result(false, "outing-unavailable", words.unavailable.as_str())?;
                    return Ok(None);
                };
                if !crate::outings::view::knows_current(core.state, actor, outing_id, &self.budget)?
                {
                    self.travel_result(false, "outing-unavailable", words.unavailable.as_str())?;
                    return Ok(None);
                }
                let size = record.body().heap_bytes().ok_or(ExecutionError::Capacity)?;
                let custody = self.budget.reserve(size + outing_id.len())?;
                let mut prepared = Consent::new(&self.budget)?;
                prepared.trip = Some((record.body().clone_within_heap_bound(), custody));
                prepared.end = Some(if decline {
                    TravelNoticeCause::Declined
                } else {
                    TravelNoticeCause::Left
                });
                let participants = record.participants();
                let other = participants
                    .into_iter()
                    .find(|id| *id != actor)
                    .ok_or(ExecutionError::Invariant)?;
                if crate::outings::view::knows_current(core.state, other, outing_id, &self.budget)?
                {
                    let mut binding = self.binding;
                    binding.serial = core.journal.next_provider_serial()?;
                    prepared.ending_reception =
                        MutualHearing::prepare(core, participants, binding, &self.budget)?;
                    self.binding = binding;
                }
                let awaiting = prepared.ending_reception.is_some();
                self.travel = Some(prepared);
                if awaiting {
                    self.phase = Phase::TravelEndReception;
                    return Ok(Some(Progress::Geometry));
                }
                self.finish_travel_end(core, None).map(Some)
            }
            TravelInput::Accept {
                outing_id,
                expected_revision,
                ..
            } => {
                let Some(record) = core.state.outings.get(outing_id).filter(|record| {
                    record.kind() == OutingKind::Travel
                        && record.status() == OutingStatus::Pending
                        && record.participants()[1] == actor
                        && record.revision() == expected_revision
                }) else {
                    self.travel_result(false, "outing-unavailable", words.unavailable.as_str())?;
                    return Ok(None);
                };
                if !crate::outings::view::knows_current(core.state, actor, outing_id, &self.budget)?
                {
                    self.travel_result(false, "outing-unavailable", words.unavailable.as_str())?;
                    return Ok(None);
                }
                if !offers::pending_current(core, record, &self.budget)?
                    || !offers::destination_current(core, record, &self.budget)?
                {
                    self.travel_result(false, "outing-changed", words.changed.as_str())?;
                    return Ok(None);
                }
                let proposer = record.participants()[0];
                let mut binding = self.binding;
                binding.serial = core.journal.next_provider_serial()?;
                let sight = crate::reception::SightBatch::prepare(
                    &core.state.physical,
                    &installed,
                    actor,
                    &[proposer],
                    binding,
                    &self.budget,
                )
                .map_err(|error| match error {
                    crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                    _ => ExecutionError::Invariant,
                })?;
                self.sight = Some(sight);
                self.binding = binding;
                self.phase = Phase::TravelStartSight;
                Ok(Some(Progress::Geometry))
            }
        }
    }

    pub(super) fn finish_travel_end(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GeometryAnswers>,
    ) -> Result<Progress, ExecutionError> {
        if self.travel.as_ref().is_some_and(|t| t.joint.is_some()) {
            return self.finish_joint(core, answer);
        }
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        let trip = &travel.trip.as_ref().ok_or(ExecutionError::Invariant)?.0;
        travel.other_received_ending = match (travel.ending_reception.take(), answer) {
            (Some(reception), Some(answer)) => reception.finish(
                core,
                [
                    offers::text(trip, "proposerId")?,
                    offers::text(trip, "recipientId")?,
                ],
                answer,
            )?,
            (None, None) => false,
            _ => return Err(ExecutionError::InvalidCheckpoint),
        };
        let cause = travel.end.ok_or(ExecutionError::Invariant)?;
        let submitting = &self.command.envelope().actor_id;
        let received = [
            offers::text(trip, "proposerId")?,
            offers::text(trip, "recipientId")?,
        ]
        .map(|actor| actor == submitting || travel.other_received_ending);
        core.remove_outing(offers::text(trip, "id")?)?;
        offers::stop_owned_travel(core, trip, cause, received, &self.budget)?;
        self.phase = Phase::TravelNotices;
        self.drive(core, None)
    }

    pub(super) fn travel_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let (other, destination) = match self.travel_input(core)? {
            TravelInput::Invite {
                recipient_id,
                destination,
                ..
            } => (recipient_id, Some(destination)),
            TravelInput::Accept { outing_id, .. } => (
                core.state
                    .outings
                    .get(outing_id)
                    .ok_or(ExecutionError::Invariant)?
                    .participants()[0],
                None,
            ),
            _ => return Err(ExecutionError::Invariant),
        };
        let ordinary = core.state.installed.ordinary_actions.value();
        if sight.seen(other) != Some(true) {
            self.travel_result(
                false,
                "not-visible",
                ordinary.travel.messages.person.as_str(),
            )?;
            return self.drive(core, None);
        }
        if let Some(TravelDestination::Entity(id)) = destination {
            let at = core.state.physical.entities.get(id);
            if sight.seen(id) != Some(true)
                || at.is_none_or(|target| {
                    target.actor.is_some()
                        || target.retirement.is_some()
                        || target.supported_position().is_none()
                })
            {
                self.travel_result(
                    false,
                    "outing-destination",
                    ordinary.travel.messages.destination.as_str(),
                )?;
                return self.drive(core, None);
            }
        }
        let entities = &core.state.physical.entities;
        let proposer = entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let recipient = entities.get(other).ok_or(ExecutionError::MissingActor)?;
        let reach = core.state.installed.retained.item_handling_read.reach;
        let Some(ray) =
            crate::geometry::interaction_reach(proposer, recipient, reach, &self.budget)?
        else {
            self.travel_result(
                false,
                "outing-unavailable",
                ordinary.travel.messages.nearby.as_str(),
            )?;
            return self.drive(core, None);
        };
        self.reserve(size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::TravelReach)?.sight.push(ray);
        Ok(Progress::Geometry)
    }

    pub(super) fn travel_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        allowed: bool,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let installed = core.state.installed.clone();
        if !allowed {
            self.travel_result(
                false,
                "outing-unavailable",
                installed
                    .ordinary_actions
                    .value()
                    .travel
                    .messages
                    .nearby
                    .as_str(),
            )?;
            return self.drive(core, None);
        }
        let destination = match self.travel_input(core)? {
            TravelInput::Invite { destination, .. } => destination,
            TravelInput::Accept {
                outing_id, mode, ..
            } => {
                let mut prepared = Consent::new(&self.budget)?;
                prepared.acceptance = Some(TravelAcceptCursor::new(
                    core,
                    outing_id,
                    mode,
                    self.binding,
                    &self.budget,
                )?);
                self.travel = Some(prepared);
                self.phase = Phase::TravelAccept;
                return self.travel_accept(core, None);
            }
            _ => return Err(ExecutionError::Invariant),
        };
        if let TravelDestination::Entity(id) = destination {
            let entities = &core.state.physical.entities;
            let proposer = entities
                .get(self.actor_id())
                .ok_or(ExecutionError::MissingActor)?;
            let target = entities.get(id).ok_or(ExecutionError::MissingEntity)?;
            let (route, custody) = crate::native_controller::feeding::approach(
                proposer,
                target,
                installed.retained.item_handling_read.reach,
                &self.budget,
            )?;
            self._reservation.merge(custody)?;
            self.question(core, Phase::TravelDestination)?
                .routes
                .push(route);
            return Ok(Progress::Geometry);
        }
        self.travel_destination(core, None)
    }

    pub(super) fn travel_destination(
        &mut self,
        core: &mut CoreMutation<'_>,
        resolved: Option<RoutePlan>,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let TravelInput::Invite {
            recipient_id,
            destination,
            mode,
            purpose,
        } = self.travel_input(core)?
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let ordinary = installed.ordinary_actions.value();
        let words = &ordinary.travel.messages;
        let bytes = match destination {
            TravelDestination::Point(point) => {
                point.heap_bytes().ok_or(ExecutionError::Capacity)?
            }
            TravelDestination::Entity(id) => {
                let target = core
                    .state
                    .physical
                    .entities
                    .get(id)
                    .ok_or(ExecutionError::MissingEntity)?;
                target.name.storage_bytes()
                    + target
                        .placement
                        .heap_bytes()
                        .ok_or(ExecutionError::Capacity)?
                    + id.len()
            }
        };
        let storage = self.budget.reserve(
            bytes
                .checked_mul(8)
                .and_then(|n| n.checked_add(2048))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut item = IndexMap::new();
        match destination {
            TravelDestination::Entity(id) => {
                let point = match resolved {
                    Some(RoutePlan::Reached { mut path, .. }) => path.pop().or_else(|| {
                        core.state
                            .physical
                            .entities
                            .get(self.actor_id())?
                            .supported_position()
                    }),
                    Some(RoutePlan::Pending { mut request, .. })
                        if request.destinations.len() == 1 =>
                    {
                        request.destinations.pop()
                    }
                    _ => None,
                };
                let Some(point) = point else {
                    self.travel_result(false, "outing-destination", words.destination.as_str())?;
                    return self.drive(core, None);
                };
                let target = core
                    .state
                    .physical
                    .entities
                    .get(id)
                    .ok_or(ExecutionError::MissingEntity)?;
                let point = offers::point_cell(point)?;
                let at = offers::stationary_placement(target)?.ok_or(ExecutionError::Invariant)?;
                item.insert("point".into(), point);
                item.insert("label".into(), SqlCell::Text(target.name.clone()));
                item.insert("entityId".into(), SqlCell::Text(id.into()));
                item.insert("placement".into(), SqlCell::Text(at.into()));
            }
            TravelDestination::Point(point) => {
                let coordinate = |key| {
                    point
                        .get(key)
                        .and_then(SqlCell::as_f64)
                        .ok_or(ExecutionError::Invariant)
                };
                let x = coordinate("x")?;
                let z = coordinate("z")?;
                if x.abs() > installed.spatial.max_extent || z.abs() > installed.spatial.max_extent
                {
                    self.travel_result(false, "outing-destination", words.destination.as_str())?;
                    return self.drive(core, None);
                }
                let x = JsText::from(crate::worlds::activity_display::tenth(x));
                let z = JsText::from(crate::worlds::activity_display::tenth(z));
                let label = ordinary.plan.text(
                    &ordinary.travel.templates.point_name,
                    &[("x", (&x).into()), ("z", (&z).into())],
                );
                item.insert("point".into(), point.clone_within_heap_bound());
                item.insert("label".into(), SqlCell::Text(label));
            }
        }
        let draft = offers::prepare_pending(
            core,
            &self.command.envelope().id,
            self.actor_id(),
            recipient_id,
            SqlCell::Object(item),
            purpose,
            mode,
            &self.budget,
        )?;
        drop(storage);
        if let Some(problem) = travel_work_problem(core, &draft.0, self.actor_id(), mode)? {
            let (code, message) = match problem {
                crate::worlds::base_outings::TravelWorkRefusal::Busy => {
                    ("outing-busy", &words.busy)
                }
                crate::worlds::base_outings::TravelWorkRefusal::Changed => {
                    ("outing-changed", &words.changed)
                }
            };
            self.travel_result(false, code, message.as_str())?;
            return self.drive(core, None);
        }
        let preview =
            travel_work_preview(core, &draft.0, self.actor_id(), self.binding, &self.budget)?;
        let mut prepared = Consent::new(&self.budget)?;
        prepared.trip = Some(draft);
        prepared.choice = Some(preview);
        self.travel = Some(prepared);
        self.phase = Phase::TravelChoice;
        self.travel_choice(core, None)
    }

    pub(super) fn travel_choice(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandChoiceAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        let child = travel.choice.as_mut().ok_or(ExecutionError::Invariant)?;
        let result = match child.step(core, answer)? {
            CommandChoiceStep::Geometry(_) => return Ok(Progress::Geometry),
            CommandChoiceStep::Display(_) => return Ok(Progress::Display),
            CommandChoiceStep::Complete(choice) => choice,
        };
        travel.choice = None;
        let installed = core.state.installed.clone();
        let words = &installed.ordinary_actions.value().travel.messages;
        if !result.outcome().ok {
            self.travel_result(false, "outing-route", words.route.as_str())?;
            return self.drive(core, None);
        }
        if self.options.preview {
            self.travel_result(true, "available", words.invited.as_str())?;
            return self.drive(core, None);
        }
        let (draft, custody) = travel.trip.as_mut().ok_or(ExecutionError::Invariant)?;
        let id = core.state.physical.identity.allocate("outing")?.id;
        let SqlCell::Object(fields) = draft else {
            return Err(ExecutionError::Invariant);
        };
        // No retained alias to the temporary command identity is needed.
        fields.insert("id".into(), SqlCell::Text(id.into()));
        let body_bytes = draft.heap_bytes().ok_or(ExecutionError::Capacity)?;
        // Keep the notice's independent body and transfer one authoritative row.
        let stored = self.budget.reserve(body_bytes)?;
        custody.resize(body_bytes)?;
        core.replace_outing(draft.clone_within_heap_bound(), stored, &self.budget)?;
        self.phase = Phase::TravelNotices;
        self.drive(core, None)
    }

    pub(super) fn travel_accept(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<TravelAcceptAnswer>,
    ) -> Result<Progress, ExecutionError> {
        let installed = core.state.installed.clone();
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        let child = travel
            .acceptance
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        match child.step(core, answer)? {
            TravelAcceptStep::Geometry(_) => return Ok(Progress::Geometry),
            TravelAcceptStep::Display(_) => return Ok(Progress::Display),
            TravelAcceptStep::Personal(_) => return Ok(Progress::Personal),
            TravelAcceptStep::Complete(TravelAcceptance::Refused(outcome)) => {
                let bytes = outcome.heap_bytes().ok_or(ExecutionError::Capacity)?;
                self._reservation.resize(
                    self._reservation
                        .bytes()
                        .checked_add(bytes)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                self.outcome = Some(outcome.clone());
                self.phase = Phase::Done;
                return self.drive(core, None);
            }
            TravelAcceptStep::Complete(TravelAcceptance::InvalidName) => {
                self.travel_result(
                    false,
                    "invalid-command",
                    installed
                        .ordinary_actions
                        .value()
                        .travel
                        .messages
                        .terms
                        .as_str(),
                )?;
                return self.drive(core, None);
            }
            TravelAcceptStep::Complete(TravelAcceptance::Accepted) => {}
        }
        let TravelInput::Accept { outing_id, .. } = self.travel_input(core)? else {
            return Err(ExecutionError::Invariant);
        };
        let record = core
            .state
            .outings
            .get(outing_id)
            .ok_or(ExecutionError::Invariant)?;
        if record.status() != OutingStatus::Traveling {
            return Err(ExecutionError::Invariant);
        }
        let custody = self
            .budget
            .reserve(record.body().heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let body = record.body().clone_within_heap_bound();
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        travel.acceptance = None;
        travel.trip = Some((body, custody));
        self.phase = Phase::TravelNotices;
        self.drive(core, None)
    }

    pub(super) fn prepare_travel_notice(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, ExecutionError> {
        if self.travel.as_ref().is_some_and(|t| t.joint.is_some()) {
            return self.next_joint_notice(core);
        }
        let travel = self.travel.as_mut().ok_or(ExecutionError::Invariant)?;
        let (body, _) = travel.trip.as_ref().ok_or(ExecutionError::Invariant)?;
        let ordinary = core.state.installed.clone();
        let ordinary = ordinary.ordinary_actions.value();
        let rules = &ordinary.travel;
        let proposer = offers::text(body, "proposerId")?;
        let recipient = offers::text(body, "recipientId")?;
        let submitting_actor = &self.command.envelope().actor_id;
        let destination = body
            .get("destination")
            .and_then(|cell| cell.get("label"))
            .and_then(SqlCell::as_text)
            .ok_or(ExecutionError::Invariant)?;
        let purpose = body.get("purpose").and_then(SqlCell::as_text);
        let actor = if travel.announce == 0 {
            proposer
        } else {
            recipient
        };
        let accepted = offers::text(body, "status")? == "traveling";
        if travel.announce == 2 {
            let reason = match travel.end {
                Some(TravelNoticeCause::Left) => ("outing-ended", &rules.messages.left),
                Some(TravelNoticeCause::Declined) => ("outing-ended", &rules.messages.declined),
                Some(_) => return Err(ExecutionError::Invariant),
                None if accepted => ("outing-accepted", &rules.messages.accepted),
                None => ("outing-invited", &rules.messages.invited),
            };
            self.travel_result(true, reason.0, reason.1.as_str())?;
            return Ok(None);
        }
        travel.announce += 1;
        let ending = travel.end.map(|cause| TravelNoticeEnding {
            cause,
            actor_id: Some(submitting_actor),
        });
        // Confirmation of a personal withdrawal is always private to the
        // actor who did it. Another actor's unseen choices must remain unknown.
        if ending.is_some() && actor != submitting_actor && !travel.other_received_ending {
            return self.prepare_travel_notice(core);
        }
        let (template, detail) = if let Some(ending) = ending {
            let reason = ending.cause.reason(&rules.messages);
            (
                &rules.templates.ended,
                Some(("reason", JsText::from(reason))),
            )
        } else if accepted {
            (&rules.templates.accepted, None)
        } else {
            let template = match (actor == proposer, purpose) {
                (true, None) => &rules.templates.invited_proposer,
                (true, Some(_)) => &rules.templates.invited_proposer_purpose,
                (false, None) => &rules.templates.invited_recipient,
                (false, Some(_)) => &rules.templates.invited_recipient_purpose,
            };
            (
                template,
                purpose.map(|purpose| ("purpose", purpose.clone())),
            )
        };
        let extra = destination.storage_bytes()
            + detail.as_ref().map_or(0, |(_, text)| text.storage_bytes());
        let scratch = self.budget.reserve(512 + 12 * extra)?;
        let mut fields = vec![("place", destination.into())];
        fields.extend(detail.as_ref().map(|(name, text)| (*name, text.into())));
        let text = ordinary.plan.text(template, &fields);
        self.binding.serial = core.journal.next_provider_serial()?;
        travel.notice = TravelNoticePreparation::prepare(
            core,
            body,
            actor,
            &text,
            ending,
            self.binding,
            &self.budget,
        )?;
        drop(scratch);
        if travel.notice.is_none() {
            return self.prepare_travel_notice(core);
        }
        self.phase = Phase::TravelTerms;
        Ok(Some(Progress::TravelTerms))
    }

    pub(super) fn link_travel_notice(
        &self,
        core: &mut CoreMutation<'_>,
        receipt: &CompletedOccurrence,
    ) -> Result<(), ExecutionError> {
        let travel = self.travel.as_ref().ok_or(ExecutionError::Invariant)?;
        let trip = &travel.trip.as_ref().ok_or(ExecutionError::Invariant)?.0;
        let field = if travel.announce == 1 {
            "proposerId"
        } else {
            "recipientId"
        };
        offers::link_plan_notice(core, trip, offers::text(trip, field)?, receipt)
    }

    pub(super) fn accept_travel_notice(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: crate::language::CanonicalJsonAnswer,
    ) -> Result<Progress, ExecutionError> {
        if !matches!(self.phase, Phase::TravelTerms) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let prepared = self
            .travel
            .as_mut()
            .and_then(|travel| travel.notice.take())
            .ok_or(ExecutionError::Invariant)?;
        let (intent, _custody) = prepared.finish(answer)?;
        let event = core.stage_event(intent)?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::TravelNotices;
        Ok(Progress::Occurrence(event))
    }
}
