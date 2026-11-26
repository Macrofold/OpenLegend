//! Source-ordered status reconciliation. Static membership is the existing
//! controller/kind roster; each next rule rereads actual current bindings.
use super::activation::StatusActivationProgress;
use super::*;
use crate::host::{ByteBudget, ByteReservation};
use crate::status::{StatusOperation, status_condition_scratch};

pub(crate) enum StatusReconcileStep<'a> {
    Personal(&'a crate::activity::PendingActivityResult),
    Occurrence(StagedOccurrence),
    EndEvidence {
        observer_id: &'a str,
        physical_life: u64,
        at: f64,
    },
    Complete,
}
enum Progress {
    Personal,
    Occurrence(StagedOccurrence),
    EndEvidence,
    Complete,
}
pub(crate) struct StatusReconcileCursor {
    entity: String,
    indices: Option<Vec<usize>>,
    next: usize,
    activation: Option<StatusActivationCursor>,
    ending: Option<PendingStatusEnd>,
    event: Option<String>,
    budget: ByteBudget,
    reservation: ByteReservation,
}
impl StatusReconcileCursor {
    pub(crate) fn new(entity: &str, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            size_of::<Self>()
                .checked_add(entity.len())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            entity: entity.into(),
            indices: None,
            next: 0,
            activation: None,
            ending: None,
            event: None,
            budget: budget.clone(),
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
                self.ending = Some(pending);
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
    ) -> Result<StatusReconcileStep<'a>, ExecutionError> {
        let progress = self.drive(core, answer)?;
        Ok(match progress {
            Progress::Personal => {
                StatusReconcileStep::Personal(if let Some(pending) = &self.ending {
                    pending.personal()
                } else {
                    self.activation
                        .as_ref()
                        .and_then(StatusActivationCursor::personal)
                        .ok_or(ExecutionError::Invariant)?
                })
            }
            Progress::Occurrence(event) => StatusReconcileStep::Occurrence(event),
            Progress::EndEvidence => {
                let (observer_id, physical_life, at) = self
                    .activation
                    .as_ref()
                    .and_then(StatusActivationCursor::evidence_end)
                    .ok_or(ExecutionError::Invariant)?;
                StatusReconcileStep::EndEvidence {
                    observer_id,
                    physical_life,
                    at,
                }
            }
            Progress::Complete => StatusReconcileStep::Complete,
        })
    }
    fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<StatusActivationAnswer>,
    ) -> Result<Progress, ExecutionError> {
        if self.activation.is_none() {
            if let Some(answer) = answer.take() {
                match answer {
                    StatusActivationAnswer::Personal(acquired) => {
                        let ending = self
                            .ending
                            .take()
                            .ok_or(ExecutionError::UnfinishedOccurrence)?;
                        if let Some(event) = self.status_end(ending.resume(core, &acquired)?)? {
                            return Ok(Progress::Occurrence(event));
                        }
                    }
                    StatusActivationAnswer::Occurrence(completed) => {
                        if self.event.as_deref() != Some(completed.event_id()) {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                        self.event = None;
                    }
                    StatusActivationAnswer::EvidenceEnded(_) => {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                }
            } else if self.event.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        let installed = core.state.installed.clone();
        if self.indices.is_none() {
            let entity = core
                .state
                .physical
                .entities
                .get(&self.entity)
                .ok_or(ExecutionError::MissingEntity)?;
            if entity
                .status_effects
                .as_ref()
                .is_some_and(|states| states.values().any(|state| state.contribution.is_some()))
            {
                return Err(ExecutionError::UnsupportedFamily);
            }
            self.reserve(
                installed
                    .status_policy
                    .definitions
                    .len()
                    .checked_mul(size_of::<usize>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut indices = Vec::with_capacity(installed.status_policy.definitions.len());
            if entity.actively_participates() {
                let roster = installed.status_rosters.get(
                    &installed.status_read(&core.state.physical),
                    entity,
                    &mut core.journal.meters,
                    &self.budget,
                )?;
                for (index, definition) in installed.status_policy.definitions.iter().enumerate() {
                    if roster.selected(index)
                        || entity
                            .status_effects
                            .as_ref()
                            .and_then(|states| states.get(&definition.id))
                            .is_some_and(|state| state.active)
                    {
                        indices.push(index);
                    }
                }
            }
            self.indices = Some(indices);
        }
        loop {
            if self.ending.is_some() {
                return Ok(Progress::Personal);
            }
            if let Some(activation) = self.activation.as_mut() {
                match activation.drive(core, answer.take())? {
                    StatusActivationProgress::Personal => return Ok(Progress::Personal),
                    StatusActivationProgress::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    StatusActivationProgress::EndEvidence => return Ok(Progress::EndEvidence),
                    StatusActivationProgress::Complete(_) => {
                        self.activation = None;
                        continue;
                    }
                }
            }
            let Some(index) = self
                .indices
                .as_ref()
                .and_then(|indices| indices.get(self.next))
                .copied()
            else {
                return Ok(Progress::Complete);
            };
            self.next += 1;
            let definition = installed
                .status_policy
                .definitions
                .get(index)
                .ok_or(ExecutionError::Invariant)?;
            let entity = core
                .state
                .physical
                .entities
                .get(&self.entity)
                .ok_or(ExecutionError::MissingEntity)?;
            let state = entity
                .status_effects
                .as_ref()
                .and_then(|states| states.get(&definition.id));
            let active = state.is_some_and(|state| state.active);
            if !active
                && (!definition.enabled
                    || definition.automatic_activation.is_none()
                    || definition.occupies_action && entity.actor.is_none())
            {
                continue;
            }
            let bindings = EffectBindings::for_status(&self.entity, state);
            let scratch = status_condition_scratch(
                &core.state.physical.entities,
                bindings,
                &definition.requires,
            )
            .max(
                definition
                    .automatic_deactivation
                    .as_ref()
                    .map_or(0, |condition| {
                        status_condition_scratch(&core.state.physical.entities, bindings, condition)
                    }),
            )
            .max(
                definition
                    .automatic_activation
                    .as_ref()
                    .map_or(0, |condition| {
                        status_condition_scratch(&core.state.physical.entities, bindings, condition)
                    }),
            );
            self.reserve(scratch)?;
            let bindings = EffectBindings::for_status(&self.entity, state);
            let read = installed.status_read(&core.state.physical);
            let mut target_unavailable = false;
            if active {
                for operation in &definition.while_active {
                    let (target, attribute) = match operation {
                        StatusOperation::Rate { change_rate, .. } => {
                            (change_rate.target, &change_rate.attribute)
                        }
                        StatusOperation::Every { change_every, .. } => {
                            (change_every.target, &change_every.attribute)
                        }
                        StatusOperation::Restrict { .. } => continue,
                    };
                    if !matches!(
                        read.value(bindings.target(target), attribute)?,
                        Some(crate::values::AttributeValue::Number(_))
                    ) {
                        target_unavailable = true;
                        break;
                    }
                }
            }
            let reason = if target_unavailable {
                Some("target-unavailable")
            } else if active {
                if !definition.enabled
                    || !read
                        .evaluate_metered(bindings, &definition.requires, &mut core.journal.meters)?
                        .matches
                {
                    Some("inapplicable")
                } else if let Some(condition) = &definition.automatic_deactivation {
                    read.evaluate_metered(bindings, condition, &mut core.journal.meters)?
                        .matches
                        .then_some("completed")
                } else {
                    None
                }
            } else {
                if core.state.physical.header.sim_time
                    < state.map_or(0.0, |state| state.automatic_after)
                {
                    continue;
                }
                let bindings = EffectBindings::for_status(&self.entity, None);
                if !read
                    .evaluate_metered(
                        bindings,
                        definition
                            .automatic_activation
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?,
                        &mut core.journal.meters,
                    )?
                    .matches
                {
                    continue;
                }
                self.activation = Some(StatusActivationCursor::new(
                    &self.entity,
                    &definition.id,
                    &self.entity,
                    &self.entity,
                    "automatic",
                    &self.budget,
                )?);
                continue;
            };
            if let Some(reason) = reason {
                let end = core.deactivate_status(&self.entity, &definition.id, reason)?;
                if let Some(event) = self.status_end(end)? {
                    return Ok(Progress::Occurrence(event));
                }
            }
        }
    }
}
