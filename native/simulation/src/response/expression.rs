//! A gesture uses fresh physical sight and the selected world's vocabulary.
//! Its occurrence must complete normal receiving before the component succeeds.
use super::*;
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{CoreMutation, StagedOccurrence};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, SightRay};
use crate::host::CandidateKey;
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::reception::{EventScalar, SightBatch};

pub(crate) enum ExpressionStep<'a> {
    Geometry(&'a GeometryQueries),
    Occurrence(StagedOccurrence),
    Complete(CompletedExpression),
}
pub(crate) struct CompletedExpression {
    outcome: Outcome,
    reservation: ByteReservation,
}
impl CompletedExpression {
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.reservation)
    }
}
pub(crate) enum ExpressionAnswer {
    Geometry(GeometryAnswers),
    Occurrence(CompletedOccurrence),
}
pub(crate) struct ExpressionCursor {
    actor: String,
    response: String,
    target: Option<String>,
    verb: String,
    queries: Option<GeometryQueries>,
    sight: Option<SightBatch>,
    expected: Option<(String, u64, u64)>,
    outcome: Option<Outcome>,
    reservation: Option<ByteReservation>,
}
fn outcome(ok: bool, code: &str, message: &str) -> Outcome {
    Outcome {
        ok,
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
    }
}
impl ExpressionCursor {
    pub(super) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.queries.as_ref()
    }
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        response: &str,
        verb: &str,
        target: Option<&str>,
        permitted: &[String],
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let rules = &core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .expression;
        let source = core
            .state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        let supported = source
            .actor
            .as_ref()
            .and_then(|actor| actor.body.as_ref())
            .is_some_and(|body| rules.body_plans.contains(&body.plan));
        let expression = rules.verbs.get(verb);
        let selected = target.and_then(|id| core.state.physical.entities.get(id));
        let invalid_target = target
            .is_some_and(|id| !permitted.iter().any(|allowed| allowed == id) || selected.is_none());
        let reachable = !expression.is_some_and(|expression| expression.requires_reach)
            || selected.is_some_and(|target| {
                target.actively_participates()
                    && target.id != actor
                    && source
                        .world_position()
                        .zip(target.world_position())
                        .is_some_and(|(from, to)| {
                            crate::spatial::distance(from, to)
                                <= core.state.installed.movement.interaction_radius()
                        })
            });
        let refused = if !supported {
            Some(outcome(false, "unsupported-body", &rules.unsupported_body))
        } else if expression.is_none()
            || invalid_target
            || !reachable
            || selected
                .is_some_and(|target| target.actor.as_ref().is_some_and(|actor| !actor.alive))
        {
            Some(outcome(false, "invalid-expression", &rules.unavailable))
        } else {
            None
        };
        let rules_bytes = expression
            .map_or(Some(0), |rule| {
                heap_sum([
                    rule.verb.len(),
                    rule.head_suffix.as_ref().map_or(0, String::len),
                    rule.target_prefix.len(),
                ])
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor.len().checked_mul(8).ok_or(ExecutionError::Capacity)?,
                response.len(),
                target
                    .map_or(0, str::len)
                    .checked_mul(3)
                    .ok_or(ExecutionError::Capacity)?,
                verb.len(),
                rules_bytes,
                rules.event_type.len(),
                10 * size_of::<NarrationPart>(),
                map_storage::<String, EventScalar>(8).ok_or(ExecutionError::Capacity)?,
                rules.unsupported_body.len() + rules.unavailable.len() + rules.accepted.len() + 512,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut result = Self {
            actor: actor.into(),
            response: response.into(),
            target: target.map(str::to_owned),
            verb: verb.into(),
            queries: None,
            sight: None,
            expected: None,
            outcome: refused,
            reservation: Some(reservation),
        };
        if result.outcome.is_none()
            && let Some(target) = target
        {
            let binding = GeometryBinding::new(
                candidate,
                core.state.installed.geometry.spatial.revision,
                core.journal.next_provider_serial()?,
            );
            let sight = SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                actor,
                &[target],
                binding,
                budget,
            )
            .map_err(|_| ExecutionError::Invariant)?;
            let count = sight
                .queries()
                .sight
                .len()
                .checked_add(1)
                .ok_or(ExecutionError::Capacity)?;
            let reservation = result
                .reservation
                .as_mut()
                .ok_or(ExecutionError::Invariant)?;
            reservation.resize(
                reservation
                    .bytes()
                    .checked_add(
                        count
                            .checked_mul(size_of::<SightRay>())
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut queries = GeometryQueries::new(binding);
            queries
                .sight
                .try_reserve_exact(count)
                .map_err(|_| ExecutionError::Capacity)?;
            queries.sight.extend(sight.queries().sight.iter().cloned());
            // Source expressions test the physical world-position segment in
            // addition to detector sight. Interaction anchors change its meaning.
            queries.sight.push(SightRay {
                from: source
                    .world_position()
                    .ok_or(ExecutionError::InvalidPosition)?,
                to: selected
                    .and_then(|target| target.world_position())
                    .ok_or(ExecutionError::InvalidPosition)?,
            });
            result.queries = Some(queries);
            result.sight = Some(sight);
        }
        Ok(result)
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<ExpressionAnswer>,
    ) -> Result<ExpressionStep<'a>, ExecutionError> {
        if self.reservation.is_none() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        if let Some(expected) = &self.expected {
            let Some(ExpressionAnswer::Occurrence(completed)) = answer else {
                return Err(ExecutionError::UnfinishedOccurrence);
            };
            if completed.event_id() != expected.0
                || completed.order() != expected.1
                || completed.sequence() != expected.2
            {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            self.expected = None;
            self.outcome = Some(outcome(
                true,
                "expressed",
                &core
                    .state
                    .installed
                    .occurrence_rules
                    .value()
                    .response
                    .expression
                    .accepted,
            ));
        } else if let Some(ExpressionAnswer::Geometry(answer)) = answer {
            let queries = self
                .queries
                .take()
                .ok_or(ExecutionError::InvalidCheckpoint)?;
            queries
                .validate_answers(&answer)
                .map_err(|_| ExecutionError::InvalidCheckpoint)?;
            let sight = self.sight.take().ok_or(ExecutionError::Invariant)?;
            let count = sight.queries().sight.len();
            let seen = sight
                .finish_sight(answer.binding, &answer.sight[..count])
                .map_err(|_| ExecutionError::InvalidCheckpoint)?;
            if !answer.sight[count]
                || self
                    .target
                    .as_ref()
                    .is_none_or(|target| seen.seen(target) != Some(true))
            {
                self.outcome = Some(outcome(
                    false,
                    "invalid-expression",
                    &core
                        .state
                        .installed
                        .occurrence_rules
                        .value()
                        .response
                        .expression
                        .unavailable,
                ));
            }
        } else if answer.is_some() {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        if let Some(queries) = &self.queries {
            return Ok(ExpressionStep::Geometry(queries));
        }
        if let Some(outcome) = self.outcome.take() {
            return Ok(ExpressionStep::Complete(CompletedExpression {
                outcome,
                reservation: self.reservation.take().ok_or(ExecutionError::Invariant)?,
            }));
        }
        let rule = core
            .state
            .installed
            .occurrence_rules
            .value()
            .response
            .expression
            .verbs
            .get(&self.verb)
            .ok_or(ExecutionError::Invariant)?;
        let mut parts = Vec::with_capacity(10);
        parts.push(NarrationPart::Participant {
            entity_id: self.actor.clone(),
            role: PersonRole::Subject,
            article: None,
        });
        parts.push(NarrationPart::Literal(" ".into()));
        parts.push(NarrationPart::Verb {
            subject_id: self.actor.clone(),
            verb: rule.verb.clone(),
        });
        if let Some(suffix) = &rule.head_suffix {
            parts.push(NarrationPart::Literal(" ".into()));
            parts.push(NarrationPart::Participant {
                entity_id: self.actor.clone(),
                role: PersonRole::Possessive,
                article: None,
            });
            parts.push(NarrationPart::Literal(suffix.as_str().into()));
        }
        if let Some(target) = &self.target {
            parts.push(NarrationPart::Literal(rule.target_prefix.as_str().into()));
            parts.push(NarrationPart::Participant {
                entity_id: target.clone(),
                role: if target == &self.actor {
                    PersonRole::Reflexive
                } else {
                    PersonRole::Object
                },
                article: None,
            });
        }
        parts.push(NarrationPart::Literal(".".into()));
        let mut data = IndexMap::with_capacity(4);
        data.insert("mechanical".into(), EventScalar::Boolean(false));
        data.insert(
            "responseId".into(),
            EventScalar::Text(self.response.as_str().into()),
        );
        data.insert("semanticTrigger".into(), EventScalar::Boolean(true));
        if self.target.is_some() {
            data.insert("targetReference".into(), EventScalar::Boolean(true));
        }
        let staged = core.stage_event(EventEmissionIntent {
            event_type: core
                .state
                .installed
                .occurrence_rules
                .value()
                .response
                .expression
                .event_type
                .clone(),
            text: EmissionText::Narration(Narration { parts }),
            audience: AudienceSelection::Physical,
            source_id: Some(self.actor.clone()),
            target_id: self.target.clone(),
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.expected = Some((staged.id.clone(), staged.order, staged.sequence));
        Ok(ExpressionStep::Occurrence(staged))
    }
}
