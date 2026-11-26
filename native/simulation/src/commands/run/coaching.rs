//! Consent, qualification and partner-specific sight and reach are checked in
//! the ordinary candidate. Ending consent never asks a coach to come back.
use super::*;
use crate::execution::ActionFinish;
use crate::commands::CoachingOperation as Choice;
use crate::install::{CoachingEpisode, LessonPhase};
use crate::reception::EventScalar;
use crate::values::WorkVector;
use crate::work::WorkRequest;

impl CommandCursor {
    fn coaching_selection(&self) -> Result<&crate::commands::LessonSelection, ExecutionError> {
        match &self.command {
            NativeCommand::Coaching { selection, .. } => Ok(selection),
            _ => Err(ExecutionError::Invariant),
        }
    }
    fn coaching_refuse(&mut self, code: &str, text: &str) -> Result<(), ExecutionError> {
        self.reserve(code.len() + text.len())?;
        self.outcome = Some(outcome(false, code, text));
        self.phase = Phase::Done;
        Ok(())
    }
    pub(super) fn begin_coaching(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Progress, ExecutionError> {
        let installed = core.state.installed.clone();
        let pick = self.coaching_selection()?;
        let Some(def) = installed
            .attributes
            .get(&pick.attribute_id)
            .filter(|d| d.value().practice.is_some())
        else {
            self.coaching_refuse(
                "coaching-unavailable",
                "This selected activity is unavailable.",
            )?;
            return self.drive(core, None);
        };
        let profile = def
            .value()
            .practice
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let actor = core
            .state
            .physical
            .entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let other = core.state.physical.entities.get(&pick.target_id);
        let own = actor.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
        let lesson = own
            .coaching_episode_id
            .as_deref()
            .and_then(|id| core.state.physical.coaching.records.get(id));
        let matching = lesson.filter(|l| {
            l.settlement.is_none()
                && Some(&l.id) == pick.episode_id.as_ref()
                && l.pin == *def.pin()
                && l.partner(&actor.id) == Some(pick.target_id.as_str())
        });
        let correct_life = other.is_some_and(|e| e.physical_life() == Some(pick.target_life));
        if !correct_life
            || pick.operation != Choice::Request && matching.is_none()
            || pick.target_id == actor.id
        {
            self.coaching_refuse("coaching-unavailable", &profile.presentation.unavailable)?;
            return self.drive(core, None);
        }
        if pick.operation.ends() {
            if pick.operation == Choice::Decline
                && matching
                    .is_none_or(|l| l.phase != LessonPhase::Requested || l.coach_id != actor.id)
            {
                self.coaching_refuse("coaching-unavailable", &profile.presentation.unavailable)?;
                return self.drive(core, None);
            }
            return self.apply_coaching(core);
        }
        let other = other.ok_or(ExecutionError::MissingActor)?;
        if !core.coaching_party_available(actor, profile)?
            || !core.coaching_party_available(other, profile)?
        {
            self.coaching_refuse("coaching-unavailable", &profile.presentation.unavailable)?;
            return self.drive(core, None);
        }
        let rank = |e: &crate::state::Entity| {
            e.actor
                .as_ref()?
                .practice
                .as_ref()?
                .get(&pick.attribute_id)
                .map(|p| p.rank(profile))
        };
        let applicable = match pick.operation {
            Choice::Request => {
                if lesson.is_some()
                    || other
                        .actor
                        .as_ref()
                        .and_then(|a| a.coaching_episode_id.as_ref())
                        .is_some()
                {
                    self.coaching_refuse(
                        "coaching-in-use",
                        "One of the participants already has an unfinished coaching episode.",
                    )?;
                    return self.drive(core, None);
                }
                rank(actor).is_some()
            }
            Choice::Accept => {
                matching
                    .is_some_and(|l| l.phase == LessonPhase::Requested && l.coach_id == actor.id)
                    && rank(actor) == Some(1)
                    && rank(other).is_some()
            }
            Choice::Feedback => {
                if !matching.is_some_and(|l| {
                    l.phase != LessonPhase::Requested
                        && l.observed.is_some()
                        && !l.actions.contains_key(&actor.id)
                }) {
                    self.coaching_refuse(
                        "observation-required",
                        &profile.presentation.observation_required,
                    )?;
                    return self.drive(core, None);
                }
                if own.action.is_some() {
                    self.coaching_refuse(
                        "busy",
                        "Finish or cancel your current activity before choosing feedback.",
                    )?;
                    return self.drive(core, None);
                }
                let l = matching.ok_or(ExecutionError::Invariant)?;
                rank(if l.coach_id == actor.id { actor } else { other }) == Some(1)
            }
            _ => false,
        };
        if !applicable {
            self.coaching_refuse("coaching-unavailable", &profile.presentation.unavailable)?;
            return self.drive(core, None);
        }
        self.ask_coaching_sight(core, false)
    }
    fn ask_coaching_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        back: bool,
    ) -> Result<Progress, ExecutionError> {
        let mut binding = self.binding;
        binding.serial = core.journal.next_provider_serial()?;
        let pick = self.coaching_selection()?;
        let (actor, target) = (self.actor_id(), pick.target_id.as_str());
        let (from, to) = if back {
            (target, actor)
        } else {
            (actor, target)
        };
        self.sight = Some(
            crate::reception::SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                from,
                &[to],
                binding,
                &self.budget,
            )
            .map_err(|e| match e {
                crate::reception::SensorError::Capacity => ExecutionError::Capacity,
                _ => ExecutionError::Invariant,
            })?,
        );
        self.binding = binding;
        self.phase = if back {
            Phase::CoachingBackSight
        } else {
            Phase::CoachingSight
        };
        Ok(Progress::Geometry)
    }
    pub(super) fn coaching_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let seen = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let back = matches!(self.phase, Phase::CoachingBackSight);
        let installed = core.state.installed.clone();
        let pick = self.coaching_selection()?;
        let profile = installed
            .attributes
            .get(&pick.attribute_id)
            .and_then(|d| d.value().practice.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        if seen.seen(if back {
            self.actor_id()
        } else {
            &pick.target_id
        }) != Some(true)
        {
            self.coaching_refuse("coaching-unavailable", &profile.presentation.unavailable)?;
            return self.drive(core, None);
        }
        if !back && pick.operation != Choice::Request {
            return self.ask_coaching_sight(core, true);
        }
        let entities = &core.state.physical.entities;
        let actor = entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let other = entities
            .get(&pick.target_id)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(ray) = crate::geometry::interaction_reach(
            actor,
            other,
            profile.communication_range,
            &self.budget,
        )?
        else {
            self.coaching_refuse("coaching-unavailable", &profile.presentation.unavailable)?;
            return self.drive(core, None);
        };
        self.reserve(size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::CoachingReach)?.sight.push(ray);
        Ok(Progress::Geometry)
    }
    pub(super) fn coaching_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        allowed: bool,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        if !allowed {
            let i = core.state.installed.clone();
            let d = i
                .attributes
                .get(&self.coaching_selection()?.attribute_id)
                .and_then(|d| d.value().practice.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            self.coaching_refuse("coaching-unavailable", &d.presentation.unavailable)?;
            return self.drive(core, None);
        }
        self.apply_coaching(core)
    }
    pub(super) fn finish_cancelled_member(
        &mut self,
        core: &mut CoreMutation<'_>,
        done: crate::execution::CompletedAction,
    ) -> Result<(), ExecutionError> {
        let actor = done.actor_id();
        let Some(action) = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref()?.action.as_ref())
            .filter(|a| a.id == done.action_id() && a.is_coaching())
        else {
            return Err(ExecutionError::Invariant);
        };
        let id = action.id.clone();
        core.physical().finish_coaching_member(actor, &id)?;
        core.physical().replace_action(
            actor,
            None,
            ActionWrite {
                generation: PlanGenerationWrite::Preserve,
                behavior: None,
            },
        )
    }
    pub(super) fn cancel_feedback(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<Progress>, ExecutionError> {
        let selection = self.coaching_selection()?;
        let lesson = selection
            .episode_id
            .as_ref()
            .and_then(|id| core.state.physical.coaching.records.get(id));
        let Some(lesson) = lesson else {
            self.phase = Phase::Tail;
            return Ok(None);
        };
        if lesson.settlement != Some(crate::install::CoachingSettlement::Interrupted) {
            return Err(ExecutionError::Invariant);
        }
        let (actor, action) = lesson.actions.first().ok_or(ExecutionError::Invariant)?;
        let _workspace = self.budget.reserve(actor.len() + action.len())?;
        let (actor, action) = (actor.clone(), action.clone());
        let p = core
            .state
            .installed
            .attributes
            .get(&lesson.pin.id)
            .and_then(|a| a.value().practice.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let result = outcome(false, "cancelled", &p.presentation.cancel_result);
        match core.begin_finish_action(&actor, &action, result)? {
            ActionFinish::Complete(completed) => {
                self.finish_cancelled_member(core, completed)?;
                Ok(None)
            }
            ActionFinish::Personal(pending) => {
                self.personal = Some(PersonalTask::CoachingStop(pending));
                Ok(Some(Progress::Personal))
            }
        }
    }
    fn apply_coaching(&mut self, core: &mut CoreMutation<'_>) -> Result<Progress, ExecutionError> {
        let installed = core.state.installed.clone();
        let selection = self.coaching_selection()?;
        let def = installed
            .attributes
            .get(&selection.attribute_id)
            .ok_or(ExecutionError::Invariant)?;
        let p = &def
            .value()
            .practice
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .presentation;
        let own = self.actor_id().to_owned();
        let other = selection.target_id.clone();
        let op = selection.operation;
        if self.options.preview {
            self.outcome = Some(outcome(
                true,
                "available",
                match op {
                    Choice::Request => &p.request_result,
                    Choice::Accept => &p.accept_result,
                    Choice::Feedback => &p.feedback_description,
                    _ => &p.end_result,
                },
            ));
            self.phase = Phase::Done;
            return self.drive(core, None);
        }
        let (lesson, kind, message) = if op == Choice::Request {
            let id = core.physical().allocate("coaching")?.id;
            let lesson = CoachingEpisode {
                id: id.clone(),
                learner_id: own.clone(),
                coach_id: other.clone(),
                pin: def.pin().clone(),
                phase: LessonPhase::Requested,
                observed: None,
                observation_event_id: None,
                pending: None,
                settlement: None,
                actions: IndexMap::new(),
                started_at: None,
            };
            core.physical().admit_work(WorkRequest {
                id: id.clone(),
                parent_id: None,
                actor_id: own.clone(),
                module_id: def.pin().id.clone(),
                definition_pin: def.pin().clone(),
                limit: WorkVector {
                    tests: 32,
                    effects: 8,
                    ..Default::default()
                },
                allocation: WorkVector {
                    live: 1,
                    retained_bytes: 2048,
                    subscriptions: 2,
                    ..Default::default()
                },
                recurrence: None,
            })?;
            core.physical().coaching_participant(&own, Some(&id))?;
            core.physical().coaching_participant(&other, Some(&id))?;
            core.physical().put_coaching(&id, Some(lesson))?;
            (id, "coaching-requested", &p.request_result)
        } else {
            let id = selection
                .episode_id
                .clone()
                .ok_or(ExecutionError::Invariant)?;
            let mut episode = core
                .state
                .physical
                .coaching
                .records
                .get(&id)
                .cloned()
                .ok_or(ExecutionError::Invariant)?;
            match op {
                Choice::Accept => {
                    episode.phase = LessonPhase::Observing;
                    core.physical().put_coaching(&id, Some(episode))?;
                    (id, "coaching-accepted", &p.accept_result)
                }
                Choice::Feedback => {
                    let contract = def
                        .value()
                        .practice
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?;
                    let action = Action::coaching(
                        String::new(),
                        other.clone(),
                        id.clone(),
                        episode.pin.clone(),
                        contract.feedback_seconds,
                    );
                    self.action_storage = Some(
                        self.budget
                            .reserve(action.heap_bytes().ok_or(ExecutionError::Capacity)?)?,
                    );
                    self.action = Some(action);
                    self.phase = Phase::Prepared;
                    return self.drive(core, None);
                }
                Choice::Decline | Choice::Withdraw => {
                    core.physical().end_coaching(&id)?;
                    (id, "coaching-ended", &p.end_result)
                }
                Choice::Request => return Err(ExecutionError::Invariant),
            }
        };
        let wording = match op {
            Choice::Request => EmissionText::Narration(crate::narration::Narration::between(
                &own,
                " asked ",
                &other,
                p.request_event_suffix
                    .replace("{skill}", &def.value().name.to_lowercase()),
            )),
            Choice::Accept => EmissionText::Narration(crate::narration::Narration::between(
                &own,
                " agreed to observe ",
                &other,
                p.accept_event_suffix.clone(),
            )),
            Choice::Withdraw | Choice::Decline => EmissionText::Literal(
                p.ended_event
                    .replace(
                        "{reason}",
                        if op == Choice::Decline {
                            "declined"
                        } else {
                            "withdrawn"
                        },
                    )
                    .into(),
            ),
            Choice::Feedback => return Err(ExecutionError::Invariant),
        };
        let event = core.stage_event(EventEmissionIntent {
            event_type: kind.to_owned(),
            text: wording,
            audience: AudienceSelection::Physical,
            scope: EventScope::External,
            source_id: Some(own),
            target_id: Some(other),
            data: Some(IndexMap::from([
                ("episodeId".into(), EventScalar::Text(lesson.into())),
                ("semanticTrigger".into(), EventScalar::Boolean(true)),
            ])),
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = if op.ends() {
            Phase::CoachingClose
        } else {
            Phase::Tail
        };
        self.outcome = Some(outcome(true, kind, message));
        Ok(Progress::Occurrence(event))
    }
}
