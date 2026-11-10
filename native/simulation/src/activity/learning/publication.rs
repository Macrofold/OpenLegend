//! A genuine held batch may record dispatch and later publish judgments. Fresh
//! scoped sources are checked at each publication; model JSON supplies no proof.
use super::cursor::{
    LearningPreparationAnswer, LearningPreparationCursor, LearningPreparationStep,
    LearningReadContext, PreparedActivityLearning,
};
use super::format::{LearningFormatAnswer, LearningFormatRequest};
use super::history::{LearningHistoryAnswer, LearningHistoryCursor, LearningHistoryRequest};
use super::normalize::NormalizationRead;
use super::*;
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::{CanonicalJsonAnswer, CanonicalJsonRequest};
use crate::records::SqlCell;
use serde::Deserialize;
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum LearningJudgment {
    Retain,
    Decline,
    Uncertain,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct LearningPublicationRequest {
    pub judgments: Vec<LearningJudgment>,
    pub dispatched: bool,
}
pub(crate) enum LearningPublicationAnswer {
    History(LearningHistoryAnswer),
    Format(LearningFormatAnswer),
    Canonical(CanonicalJsonAnswer),
}
pub(crate) enum LearningPublicationStep<'a> {
    History(&'a LearningHistoryRequest),
    Format(&'a LearningFormatRequest),
    Canonical(&'a CanonicalJsonRequest),
    Complete(CompletedActivityLearning),
}
pub(crate) struct CompletedActivityLearning {
    pub outcome: Outcome,
    _storage: ByteReservation,
}
pub(crate) struct LearningPublicationCursor {
    batch: Arc<PreparedActivityLearning>,
    request: LearningPublicationRequest,
    history: Option<LearningHistoryCursor>,
    context: Option<LearningPreparationCursor>,
    key: CandidateKey,
    budget: ByteBudget,
    eligible: bool,
    done: bool,
    storage: ByteReservation,
}
impl LearningPublicationCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        batch: Arc<PreparedActivityLearning>,
        request: LearningPublicationRequest,
        key: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = size_of::<Self>()
            .checked_add(
                request
                    .judgments
                    .capacity()
                    .checked_mul(size_of::<LearningJudgment>())
                    .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| n.checked_add(batch.history.rows.len() * size_of::<String>()))
            .and_then(|n| {
                n.checked_add(
                    batch
                        .history
                        .rows
                        .iter()
                        .map(|r| r.entry.id.len())
                        .sum::<usize>(),
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let eligible = !batch.capacity_blocked
            && !core.state.physical.header.paused
            && core.state.generation == batch.history.generation
            && core.state.physical.header.id == batch.history.world
            && core
                .state
                .physical
                .entities
                .get(&batch.history.actor)
                .and_then(|e| e.actor.as_ref())
                .is_some_and(|a| a.alive && a.physical_life.unwrap_or(0) == batch.history.life);
        let history = if eligible {
            Some(LearningHistoryCursor::selected(
                core,
                &batch.history.actor,
                batch.history.rows.iter().map(|r| r.entry.id.clone()),
                key,
                budget,
            )?)
        } else {
            None
        };
        Ok(Self {
            batch,
            request,
            history,
            context: None,
            key,
            budget: budget.clone(),
            eligible,
            done: false,
            storage,
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<LearningPublicationAnswer>,
    ) -> Result<LearningPublicationStep<'a>, ExecutionError> {
        if self.done {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut child_answer = None;
        if let Some(answer) = answer {
            if let Some(history) = self.history.as_mut() {
                let LearningPublicationAnswer::History(answer) = answer else {
                    return Err(ExecutionError::InvalidCheckpoint);
                };
                history.answer(core.state, answer, &self.budget)?;
            } else {
                child_answer = Some(match answer {
                    LearningPublicationAnswer::History(a) => LearningPreparationAnswer::History(a),
                    LearningPublicationAnswer::Format(a) => LearningPreparationAnswer::Format(a),
                    LearningPublicationAnswer::Canonical(a) => {
                        LearningPreparationAnswer::Canonical(a)
                    }
                });
            }
        }
        if !self.eligible {
            return self.complete(false);
        }
        if let Some(history) = self.history.as_mut() {
            if history.request(core, &self.budget)?.is_some() {
                return Ok(LearningPublicationStep::History(
                    self.history
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .request(core, &self.budget)?
                        .ok_or(ExecutionError::Invariant)?,
                ));
            }
            let history = self
                .history
                .take()
                .ok_or(ExecutionError::Invariant)?
                .finish()?;
            self.context = Some(LearningPreparationCursor::from_history(
                core,
                history,
                self.key,
                &self.budget,
            )?);
        }
        match self
            .context
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .step(core, child_answer)?
        {
            LearningPreparationStep::History(q) => Ok(LearningPublicationStep::History(q)),
            LearningPreparationStep::Format(q) => Ok(LearningPublicationStep::Format(q)),
            LearningPreparationStep::Canonical(q) => Ok(LearningPublicationStep::Canonical(q)),
            LearningPreparationStep::Complete(_) => Err(ExecutionError::Invariant),
            LearningPreparationStep::Context(context) => {
                self.context = None;
                let published = self.publish(core, context)?;
                self.complete(published)
            }
        }
    }
    fn complete(&mut self, ok: bool) -> Result<LearningPublicationStep<'_>, ExecutionError> {
        self.done = true;
        let storage = self
            .budget
            .reserve(size_of::<CompletedActivityLearning>() + "activity-learning".len())?;
        Ok(LearningPublicationStep::Complete(
            CompletedActivityLearning {
                outcome: Outcome {
                    ok,
                    code: "activity-learning".to_owned(),
                    message: "".into(),
                    spent: None,
                    outputs: None,
                    recipe_id: None,
                    item_id: None,
                    entity_id: None,
                    goal_id: None,
                    plan_id: None,
                    action_id: None,
                },
                _storage: storage,
            },
        ))
    }
    fn publish(
        &mut self,
        core: &mut CoreMutation<'_>,
        context: LearningReadContext,
    ) -> Result<bool, ExecutionError> {
        let actor = self.batch.history.actor.as_str();
        for candidate in &self.batch.candidates {
            for id in candidate
                .occurrence_ids
                .iter()
                .chain(&candidate.other_evidence)
            {
                let Some(row) = context.history.entry(id) else {
                    return Ok(false);
                };
                if row.entry.actor_id != actor || row.entry.revoked == Some(true) || row.denied {
                    return Ok(false);
                }
            }
        }
        let person = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        if self.request.dispatched
            && (person.action.is_some()
                || person
                    .agency
                    .plan
                    .as_ref()
                    .is_some_and(|p| p.status == crate::plans::PlanStatus::Active))
        {
            return Ok(false);
        }
        let cursor = core.state.activity.learning.get(actor);
        if self.request.dispatched
            && cursor.is_some_and(|c| {
                self.batch
                    .candidates
                    .iter()
                    .all(|candidate| c.assessed.iter().any(|s| s == candidate.signature()))
                    && if self.batch.more {
                        self.batch
                            .examined
                            .iter()
                            .all(|id| c.examined.as_ref().is_some_and(|set| set.contains(id)))
                    } else {
                        c.position == Some(self.batch.history.through)
                            && c.examined.as_ref().is_none_or(Vec::is_empty)
                            && c.pending
                                .iter()
                                .all(|id| self.batch.history.entry(id).is_none())
                    }
            })
        {
            return Ok(true);
        }
        // Declared supported transitions keep complete command meanings immutable;
        // the Source-normalized shape is nevertheless rebuilt from these actual
        // current SQL rows, current result eligibility and current installed words.
        if !self.request.dispatched {
            let read = NormalizationRead {
                history: &context.history,
                language: &core.state.activity.language,
                limits: &core.state.activity.limits,
                names: &context.names.texts,
                places: &context.places,
                manifest: &context.manifest,
            };
            for (at, candidate) in self.batch.candidates.iter().enumerate() {
                if matches!(
                    self.request.judgments.get(at),
                    Some(LearningJudgment::Retain)
                ) {
                    let _slots = self
                        .budget
                        .reserve(candidate.occurrence_ids.len() * size_of::<usize>())?;
                    let indices = candidate
                        .occurrence_ids
                        .iter()
                        .map(|id| {
                            context
                                .history
                                .rows
                                .iter()
                                .position(|r| r.entry.id == *id)
                                .ok_or(ExecutionError::InvalidCheckpoint)
                        })
                        .collect::<Result<Vec<_>, _>>()?;
                    let Some(normalized) =
                        read.normalize(&indices, !candidate.executable(), &self.budget)?
                    else {
                        return Ok(false);
                    };
                    let _compare = self.budget.reserve(
                        crate::experience::encoded_body_bound(candidate.signature())
                            .map_err(|_| ExecutionError::Capacity)?,
                    )?;
                    let expected: SqlCell = serde_json::from_str(candidate.signature())
                        .map_err(|_| ExecutionError::Invariant)?;
                    if expected != normalized.shape {
                        return Ok(false);
                    };
                }
            }
        }
        let _cursor = self.budget.reserve(
            cursor
                .map_or(Some(0), HeapBytes::heap_bytes)
                .and_then(|n| {
                    n.checked_add(map_storage::<String, ()>(
                        self.batch.examined.len() + self.batch.candidates.len(),
                    )?)
                })
                .and_then(|n| n.checked_add(self.batch.examined.heap_bytes()?))
                .and_then(|n| {
                    n.checked_add(
                        self.batch
                            .candidates
                            .iter()
                            .map(|c| c.signature().len() + size_of::<String>())
                            .sum::<usize>(),
                    )
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let next = cursor.cloned();
        let mut changed = false;
        if let Some(mut next) = next {
            for (at, candidate) in self.batch.candidates.iter().enumerate() {
                if self.request.dispatched {
                    if !next.assessed.iter().any(|s| s == candidate.signature()) {
                        next.assessed.push(candidate.signature().to_owned());
                        if next.assessed.len() as u64 > core.state.activity.limits.assessed
                            || crate::encoding::json_record_len(&next.assessed)
                                .map_err(|_| ExecutionError::Invariant)?
                                as u64
                                > core.state.activity.limits.assessment_bytes
                        {
                            return Err(ExecutionError::Capacity);
                        }
                    }
                } else if matches!(
                    self.request.judgments.get(at),
                    Some(LearningJudgment::Retain)
                ) {
                    if !super::retention::retain(core, &context.history, candidate, &self.budget)? {
                        return Err(ExecutionError::Capacity);
                    }
                    changed = true;
                }
            }
            let examined = next.examined.get_or_insert_with(Vec::new);
            for id in &self.batch.examined {
                if !examined.contains(id) {
                    examined.push(id.clone());
                }
            }
            if !self.batch.more {
                next.position = Some(self.batch.history.through);
                *examined = Vec::new();
                next.pending
                    .retain(|id| self.batch.history.entry(id).is_none());
            }
            changed |= core.state.activity.learning.get(actor) != Some(&next);
            core.journal
                .activity
                .replace_learning_cursor(&mut core.state.activity, actor, next)
                .map_err(ExecutionError::Activity)?;
        }
        let _transfer = self.budget.reserve(
            context.history.rows.len()
                * (size_of::<crate::records::InstalledRow>() + size_of::<ByteReservation>()),
        )?;
        let (rows, _row_custody): (Vec<_>, Vec<_>) = context
            .history
            .rows
            .into_iter()
            .map(|row| row.into_sql())
            .unzip();
        core.journal
            .activity
            .load_selected_occurrences(&mut core.state.activity, rows, &self.budget)
            .map_err(ExecutionError::Activity)?;
        if changed {
            core.state.physical.header.native_interval = None;
        }
        let _ = &self.storage;
        let _ = &context.storage;
        Ok(true)
    }
}
