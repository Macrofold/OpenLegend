//! One ordinary activation, including all prior-action, terminal sensing and
//! lifecycle occurrence duties. Only the outer coordinator can satisfy them.
use super::*;
use crate::events::CompletedOccurrence;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::EndedCurrentEvidence;
use crate::status::{StatusOperation, status_condition_scratch};

pub(crate) enum StatusActivationAnswer {
    Personal(crate::experience::AcquiredActivityResult),
    Occurrence(CompletedOccurrence),
    EvidenceEnded(EndedCurrentEvidence),
}
pub(crate) enum StatusActivationStep<'a> {
    Personal(&'a crate::activity::PendingActivityResult),
    Occurrence(StagedOccurrence),
    EndEvidence {
        observer_id: &'a str,
        physical_life: u64,
        at: f64,
    },
    Complete(bool),
}
enum Personal {
    Interruption(PendingStatusEnd),
    Prior(PendingActionFinish),
}
impl Personal {
    fn result(&self) -> &crate::activity::PendingActivityResult {
        match self {
            Self::Interruption(pending) => pending.personal(),
            Self::Prior(pending) => pending.personal(),
        }
    }
}
#[derive(Clone, Copy)]
enum Phase {
    Check,
    Interrupt,
    PriorAction,
    Install,
    EndEvidence,
    Occupy,
    Event,
    Done,
}
pub(crate) enum StatusActivationProgress {
    Personal,
    Occurrence(StagedOccurrence),
    EndEvidence,
    Complete(bool),
}
pub(crate) struct StatusActivationCursor {
    subject: String,
    definition: String,
    source: String,
    action_target: String,
    reason: String,
    phase: Phase,
    interrupts: Vec<String>,
    next_interrupt: usize,
    episode: Option<String>,
    personal: Option<Personal>,
    event: Option<String>,
    life: u64,
    at: f64,
    accepted: bool,
    reservation: ByteReservation,
}
impl StatusActivationCursor {
    pub(crate) fn personal(&self) -> Option<&crate::activity::PendingActivityResult> {
        self.personal.as_ref().map(Personal::result)
    }
    pub(crate) fn evidence_end(&self) -> Option<(&str, u64, f64)> {
        matches!(self.phase, Phase::EndEvidence).then_some((&self.subject, self.life, self.at))
    }
    pub(crate) fn new(
        subject: &str,
        definition: &str,
        source: &str,
        action_target: &str,
        reason: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = [
            subject.len(),
            definition.len(),
            source.len(),
            action_target.len(),
            reason.len(),
        ]
        .into_iter()
        .try_fold(size_of::<Self>(), usize::checked_add)
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            subject: subject.into(),
            definition: definition.into(),
            source: source.into(),
            action_target: action_target.into(),
            reason: reason.into(),
            phase: Phase::Check,
            interrupts: Vec::new(),
            next_interrupt: 0,
            episode: None,
            personal: None,
            event: None,
            life: 0,
            at: 0.0,
            accepted: false,
            reservation,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn status_end(&mut self, end: StatusEnd) -> Result<Option<StagedOccurrence>, ExecutionError> {
        match end {
            StatusEnd::Unchanged | StatusEnd::Complete => Ok(None),
            StatusEnd::Personal(pending) => {
                self.personal = Some(Personal::Interruption(pending));
                Ok(None)
            }
            StatusEnd::Occurrence(event) => {
                self.reserve(event.id.len())?;
                self.event = Some(event.id.clone());
                Ok(Some(event))
            }
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<StatusActivationAnswer>,
    ) -> Result<StatusActivationStep<'a>, ExecutionError> {
        let progress = self.drive(core, answer)?;
        Ok(match progress {
            StatusActivationProgress::Personal => StatusActivationStep::Personal(
                self.personal
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .result(),
            ),
            StatusActivationProgress::Occurrence(event) => StatusActivationStep::Occurrence(event),
            StatusActivationProgress::EndEvidence => StatusActivationStep::EndEvidence {
                observer_id: &self.subject,
                physical_life: self.life,
                at: self.at,
            },
            StatusActivationProgress::Complete(accepted) => {
                StatusActivationStep::Complete(accepted)
            }
        })
    }
    pub(crate) fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<StatusActivationAnswer>,
    ) -> Result<StatusActivationProgress, ExecutionError> {
        if let Some(answer) = answer {
            match answer {
                StatusActivationAnswer::Personal(acquired) => {
                    match self
                        .personal
                        .take()
                        .ok_or(ExecutionError::UnfinishedOccurrence)?
                    {
                        Personal::Interruption(pending) => {
                            if let Some(event) =
                                self.status_end(pending.resume(core, &acquired)?)?
                            {
                                return Ok(StatusActivationProgress::Occurrence(event));
                            }
                        }
                        Personal::Prior(pending) => {
                            core.complete_finish_action(pending, &acquired)?;
                        }
                    }
                }
                StatusActivationAnswer::Occurrence(completed) => {
                    if self.event.as_deref() != Some(completed.event_id()) {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.event = None;
                }
                StatusActivationAnswer::EvidenceEnded(ended) => {
                    if !matches!(self.phase, Phase::EndEvidence)
                        || ended.observer_id() != self.subject
                        || ended.physical_life() != self.life
                        || ended.at() != self.at
                    {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    self.phase = Phase::Occupy;
                }
            }
        } else if self.event.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        let installed = core.state.installed.clone();
        let definition = installed
            .status_policy
            .definitions
            .iter()
            .find(|definition| definition.id == self.definition)
            .ok_or(ExecutionError::Invariant)?;
        if definition.contribution.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        loop {
            if self.personal.is_some() {
                return Ok(StatusActivationProgress::Personal);
            }
            match self.phase {
                Phase::Check => {
                    let bindings = EffectBindings {
                        subject: &self.subject,
                        source: &self.source,
                        action_target: &self.action_target,
                    };
                    let scratch = status_condition_scratch(
                        &core.state.physical.entities,
                        bindings,
                        &definition.requires,
                    )
                    .max(
                        definition
                            .activation_condition
                            .as_ref()
                            .map_or(0, |condition| {
                                status_condition_scratch(
                                    &core.state.physical.entities,
                                    bindings,
                                    condition,
                                )
                            }),
                    );
                    self.reserve(scratch)?;
                    let bindings = EffectBindings {
                        subject: &self.subject,
                        source: &self.source,
                        action_target: &self.action_target,
                    };
                    if !installed
                        .status_read(&core.state.physical)
                        .can_activate_metered(bindings, definition, &mut core.journal.meters)?
                    {
                        self.phase = Phase::Done;
                        continue;
                    }
                    let entity = core
                        .state
                        .physical
                        .entities
                        .get(&self.subject)
                        .ok_or(ExecutionError::MissingEntity)?;
                    self.life = entity.physical_life().unwrap_or(0);
                    self.at = core.state.physical.header.sim_time;
                    if definition.occupies_action && entity.actor.is_some() {
                        self.interrupts = core.interrupt_status_ids(&self.subject, "new-action")?;
                    }
                    self.phase = Phase::Interrupt;
                }
                Phase::Interrupt => {
                    if let Some(id) = self.interrupts.get(self.next_interrupt) {
                        let end = core.deactivate_status(&self.subject, id, "new-action")?;
                        self.next_interrupt += 1;
                        if let Some(event) = self.status_end(end)? {
                            return Ok(StatusActivationProgress::Occurrence(event));
                        }
                        continue;
                    }
                    self.phase = Phase::PriorAction;
                }
                Phase::PriorAction => {
                    self.phase = Phase::Install;
                    if definition.occupies_action {
                        if let Some(action) = core
                            .state
                            .physical
                            .entities
                            .get(&self.subject)
                            .and_then(|entity| entity.actor.as_ref())
                            .and_then(|actor| actor.action.as_ref())
                        {
                            self.reserve(
                                action.id.len()
                                    + definition.label.len()
                                    + installed
                                        .ordinary_actions
                                        .value()
                                        .status_interruption_suffix
                                        .len()
                                    + size_of::<crate::commands::Outcome>(),
                            )?;
                            let id = action.id.clone();
                            let result = crate::commands::Outcome {
                                ok: false,
                                code: "interrupted".into(),
                                message: format!(
                                    "{}{}",
                                    definition.label,
                                    installed
                                        .ordinary_actions
                                        .value()
                                        .status_interruption_suffix
                                ),
                                spent: None,
                                outputs: None,
                                recipe_id: None,
                                item_id: None,
                                entity_id: None,
                                goal_id: None,
                                plan_id: None,
                                action_id: None,
                            };
                            if let ActionFinish::Personal(pending) =
                                core.begin_finish_action(&self.subject, &id, result)?
                            {
                                self.personal = Some(Personal::Prior(pending));
                            }
                        }
                    }
                }
                Phase::Install => {
                    // ID issuance precedes actual recurring work admission, as
                    // in Source. Failure stays inside the shared candidate undo.
                    self.reserve(
                        64 + self.source.len() + self.action_target.len() + definition.id.len(),
                    )?;
                    let episode = core.physical().allocate("effect")?.id;
                    let work = installed
                        .status_work
                        .get(&definition.id)
                        .ok_or(ExecutionError::Invariant)?;
                    core.physical()
                        .admit_status_work(&self.subject, &episode, work)?;
                    core.physical().replace_status(
                        &self.subject,
                        &definition.id,
                        StatusInstance {
                            active: true,
                            episode: episode.clone(),
                            elapsed_seconds: 0.0,
                            automatic_after: 0.0,
                            source_id: self.source.clone(),
                            action_target_id: self.action_target.clone(),
                            contribution: None,
                        },
                    )?;
                    self.episode = Some(episode);
                    self.accepted = true;
                    self.phase=if definition.while_active.iter().any(|operation|matches!(operation,StatusOperation::Restrict{restrict_capabilities}if restrict_capabilities.capabilities.iter().any(|capability|capability=="perception"))){Phase::EndEvidence}else{Phase::Occupy};
                }
                Phase::EndEvidence => return Ok(StatusActivationProgress::EndEvidence),
                Phase::Occupy => {
                    if definition.occupies_action
                        && core
                            .state
                            .physical
                            .entities
                            .get(&self.subject)
                            .is_some_and(|entity| entity.actor.is_some())
                    {
                        let episode = self.episode.as_ref().ok_or(ExecutionError::Invariant)?;
                        self.reserve(episode.len() + definition.id.len() + size_of::<Action>())?;
                        core.physical().replace_action(
                            &self.subject,
                            Some(Action::status_effect(
                                self.episode
                                    .as_ref()
                                    .ok_or(ExecutionError::Invariant)?
                                    .clone(),
                                definition.id.clone(),
                            )),
                            ActionWrite {
                                generation: PlanGenerationWrite::Advance,
                                behavior: None,
                            },
                        )?;
                    }
                    self.phase = Phase::Event;
                }
                Phase::Event => {
                    self.phase = Phase::Done;
                    let bindings = EffectBindings {
                        subject: &self.subject,
                        source: &self.source,
                        action_target: &self.action_target,
                    };
                    if let Some(intent) =
                        core.status_event(definition, bindings, true, &self.reason)?
                    {
                        let event = core.stage_event(intent)?;
                        self.reserve(event.id.len())?;
                        self.event = Some(event.id.clone());
                        return Ok(StatusActivationProgress::Occurrence(event));
                    }
                }
                Phase::Done => return Ok(StatusActivationProgress::Complete(self.accepted)),
            }
        }
    }
}
