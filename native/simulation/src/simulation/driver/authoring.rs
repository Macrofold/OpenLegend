//! A creator changing an installed body need runs the ordinary conditional
//! notices before publication. Normal event disclosure and source acquisition
//! still decide which characters learn about each occurrence.
use super::*;
use crate::conditions::{ConditionReconcileCursor, ConditionReconcileStep};
use crate::knowledge::{CompletedKnowledgeEdit, KnowledgeEditCursor};

pub(super) struct Conditions {
    edit: KnowledgeEditCursor,
    candidate: CandidateKey,
    conditions: ConditionReconcileCursor,
    result: Option<CompletedKnowledgeEdit>,
    event: Option<EventCursor>,
    creation_event: bool,
    _storage: ByteReservation,
}
impl Conditions {
    pub(super) fn new(
        edit: KnowledgeEditCursor,
        conditions: ConditionReconcileCursor,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Ok(Self {
            edit,
            candidate,
            conditions,
            result: None,
            event: None,
            creation_event: false,
            _storage: budget.reserve(size_of::<Self>())?,
        })
    }
    pub(super) fn poll(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: &mut Option<Answer>,
        mut route: Option<EventReply>,
        budget: &ByteBudget,
    ) -> Result<Poll<CompletedKnowledgeEdit, EventReply>, DriveError> {
        if self.result.is_none() {
            if answer.is_some() || route.is_some() {
                return Err(DriveError::StaleResponse);
            }
            let edited = self.edit.step(core, budget)?;
            if !edited.outcome().ok {
                return Ok(Poll::Complete(edited));
            }
            if self.edit.is_creating_person() {
                let actor = edited
                    .outcome()
                    .entity_id
                    .as_deref()
                    .ok_or(ExecutionError::Invariant)?;
                let policy = &core
                    .state
                    .installed
                    .person_creation
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .appearance;
                use crate::events::{
                    AudienceSelection, EmissionText, EventEmissionIntent, EventScope,
                };
                use crate::narration::{Narration, NarrationPart, PersonRole};
                use crate::reception::EventScalar;
                let text = EmissionText::Narration(Narration {
                    parts: vec![
                        NarrationPart::Participant {
                            entity_id: actor.into(),
                            role: PersonRole::Subject,
                            article: None,
                        },
                        NarrationPart::Literal(" ".into()),
                        NarrationPart::Literal(policy.text.clone().into()),
                    ],
                });
                let staged = core.stage_event(EventEmissionIntent {
                    event_type: policy.event.clone(),
                    text,
                    source_id: Some(actor.into()),
                    target_id: None,
                    audience: AudienceSelection::Physical,
                    scope: EventScope::External,
                    data: Some(indexmap::IndexMap::from([
                        ("significant".into(), EventScalar::Boolean(true)),
                        ("godMode".into(), EventScalar::Boolean(true)),
                    ])),
                    origin: None,
                    exposure: None,
                })?;
                let begun = crate::events::begin_staged_occurrence(core, staged, budget)
                    .map_err(CommandOperationError::from)?;
                let binding = GeometryBinding::new(
                    self.candidate,
                    core.state.geometry_revision(),
                    core.journal.next_provider_serial()?,
                );
                self.event = Some(EventCursor::prepare(
                    core,
                    begun,
                    binding,
                    crate::events::EventAccountPlacement::Immediate,
                    budget,
                )?);
                self.creation_event = true;
            }
            self.result = Some(edited);
        }
        let mut completed = None;
        loop {
            if let Some(event) = &mut self.event {
                match poll_event(event, core, answer, route.take(), budget)? {
                    Poll::Question(question, route) => return Ok(Poll::Question(question, route)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Complete(event) => {
                        completed = Some(
                            self.result
                                .as_mut()
                                .ok_or(DriveError::StaleResponse)?
                                .include_event(event)?,
                        );
                        if self.creation_event {
                            // Only an outstanding condition may consume a completed
                            // condition notice. The arrival has already been recorded.
                            completed = None;
                            self.creation_event = false;
                        }
                        self.event = None;
                    }
                }
            }
            match self.conditions.step(core, completed.take())? {
                ConditionReconcileStep::Complete => {
                    return Ok(Poll::Complete(
                        self.result.take().ok_or(DriveError::StaleResponse)?,
                    ));
                }
                ConditionReconcileStep::Occurrence(staged) => {
                    let begun = crate::events::begin_staged_occurrence(core, staged, budget)
                        .map_err(CommandOperationError::from)?;
                    let binding = GeometryBinding::new(
                        self.candidate,
                        core.state.geometry_revision(),
                        core.journal.next_provider_serial()?,
                    );
                    self.event = Some(EventCursor::prepare(
                        core,
                        begun,
                        binding,
                        crate::events::EventAccountPlacement::Immediate,
                        budget,
                    )?);
                }
            }
        }
    }
}
