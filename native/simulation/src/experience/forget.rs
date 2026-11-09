//! Creator recall deletion includes Source's protected-obligation guard and
//! complete transition boundary; a raw invalidation is not a public forget.
use super::*;
use crate::commands::Outcome;
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::CollationRequest;

pub(crate) enum ForgetExperienceStep<'a> {
    History(Arc<HistoryEditQuestion>),
    Collation(&'a CollationRequest),
    Complete(CompletedForgetExperience),
}
pub(crate) struct CompletedForgetExperience {
    actor: String,
    source: String,
    outcome: Outcome,
    invalidated: Option<CompletedPrivacyEdit>,
    privacy: Option<PrivacyConstraintChange>,
    _storage: ByteReservation,
}
impl CompletedForgetExperience {
    pub(crate) fn actor_id(&self) -> &str {
        &self.actor
    }
    pub(crate) fn source_id(&self) -> &str {
        &self.source
    }
    pub(crate) fn outcome(&self) -> &Outcome {
        &self.outcome
    }
    pub(crate) fn invalidated_ids(&self) -> impl Iterator<Item = &str> {
        self.invalidated
            .iter()
            .flat_map(CompletedPrivacyEdit::affected)
    }
    pub(crate) fn privacy_change(&self) -> Option<impl Serialize + '_> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Change<'a> {
            actor_id: &'a str,
            forgotten: &'a [String],
            corrections: &'a IndexMap<String, String>,
        }
        self.privacy.as_ref().map(|value| Change {
            actor_id: &self.actor,
            forgotten: &value.forgotten,
            corrections: &value.corrections,
        })
    }
}
struct PrivacyConstraintChange {
    forgotten: Vec<String>,
    corrections: IndexMap<String, String>,
    _storage: ByteReservation,
}
impl PrivacyConstraintChange {
    fn capture(
        core: &CoreMutation<'_>,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let privacy = &core
            .state
            .experience
            .actor(actor)
            .ok_or(ExecutionError::Invariant)?
            .privacy;
        let names = privacy
            .forgotten
            .iter()
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .and_then(|n| {
                privacy.corrections.iter().try_fold(n, |n, (id, value)| {
                    n.checked_add(id.len())?.checked_add(value.len())
                })
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(
            heap_sum([
                std::mem::size_of::<Self>(),
                names,
                privacy
                    .forgotten
                    .len()
                    .checked_mul(std::mem::size_of::<String>())
                    .ok_or(ExecutionError::Capacity)?,
                crate::host::retained_size::map_storage::<String, String>(
                    privacy.corrections.len(),
                )
                .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut forgotten = Vec::new();
        forgotten
            .try_reserve_exact(privacy.forgotten.len())
            .map_err(|_| ExecutionError::Capacity)?;
        forgotten.extend(privacy.forgotten.iter().cloned());
        let corrections = privacy
            .corrections
            .iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        Ok(Self {
            forgotten,
            corrections,
            _storage: storage,
        })
    }
}
pub(crate) struct ForgetExperienceCursor {
    actor: String,
    source: String,
    preparation: Option<PrivacyPreparationCursor>,
    edit: Option<PrivacyEditCursor>,
    candidate: CandidateKey,
    limits: HistoryEditLimits,
    memory_alias_added: bool,
    checkpoint: Option<CandidateCheckpoint>,
    outcomes: Option<(Outcome, Outcome)>,
    storage: Option<ByteReservation>,
    done: bool,
}
impl ForgetExperienceCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        source: &str,
        candidate: CandidateKey,
        limits: HistoryEditLimits,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let rules = &core.state.installed.account_rules.value().privacy_outcomes;
        let bytes = heap_sum([
            std::mem::size_of::<Self>(),
            actor.len(),
            source.len(),
            rules
                .commitment
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            rules
                .forgotten
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let outcomes = (rules.commitment.clone(), rules.forgotten.clone());
        let roots_storage = budget.reserve(source.len() + std::mem::size_of::<String>())?;
        let roots = [source.to_owned()];
        let checkpoint = core.journal.checkpoint(core.state)?;
        let preparation =
            match PrivacyPreparationCursor::new(core, actor, &roots, candidate, limits, budget) {
                Ok(preparation) => preparation,
                Err(error) => {
                    core.journal.rollback_to(core.state, checkpoint)?;
                    return Err(error);
                }
            };
        drop(roots_storage);
        Ok(Self {
            actor: actor.to_owned(),
            source: source.to_owned(),
            preparation: Some(preparation),
            edit: None,
            candidate,
            limits,
            memory_alias_added: false,
            checkpoint: Some(checkpoint),
            outcomes: Some(outcomes),
            storage: Some(storage),
            done: false,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(mut preparation) = self.preparation.take() {
            preparation.abort(core)?;
        }
        if let Some(mut edit) = self.edit.take() {
            edit.abort(core)?;
        }
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        self.done = true;
        Ok(())
    }
    fn complete(
        &mut self,
        accepted: bool,
        invalidated: Option<CompletedPrivacyEdit>,
        privacy: Option<PrivacyConstraintChange>,
    ) -> Result<CompletedForgetExperience, ExecutionError> {
        let (refused, success) = self.outcomes.take().ok_or(ExecutionError::Invariant)?;
        self.done = true;
        Ok(CompletedForgetExperience {
            actor: std::mem::take(&mut self.actor),
            source: std::mem::take(&mut self.source),
            outcome: if accepted { success } else { refused },
            invalidated,
            privacy,
            _storage: self.storage.take().ok_or(ExecutionError::Invariant)?,
        })
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PrivacyEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<ForgetExperienceStep<'a>, HistoryPreparationError> {
        if self.done {
            return Err(HistoryPreparationError::StaleResponse);
        }
        let mut edit_answer = answer;
        if let Some(preparation) = &mut self.preparation {
            let received = match edit_answer.take() {
                Some(PrivacyEditAnswer::History(answer)) => Some(answer),
                None => None,
                _ => return Err(HistoryPreparationError::StaleResponse),
            };
            let prepared = match preparation.step(core, received, budget) {
                Ok(PrivacyPreparationStep::Read(question)) => {
                    return Ok(ForgetExperienceStep::History(question));
                }
                Ok(PrivacyPreparationStep::Complete(prepared)) => prepared,
                Err(
                    error @ (HistoryPreparationError::StaleResponse
                    | HistoryPreparationError::MalformedResponse
                    | HistoryPreparationError::Capacity),
                ) => return Err(error),
                Err(error) => {
                    self.abort(core)?;
                    return Err(error);
                }
            };
            self.preparation = None;
            let readiness = forget_readiness(core, &self.actor, &self.source, &prepared.selection);
            let extra = match readiness {
                Ok(ForgetReadiness::Refused) => {
                    self.abort(core)?;
                    return Ok(ForgetExperienceStep::Complete(
                        self.complete(false, None, None)?,
                    ));
                }
                Ok(ForgetReadiness::Ready(extra)) => extra,
                Err(error) => {
                    self.abort(core)?;
                    return Err(error.into());
                }
            };
            if !self.memory_alias_added
                && let Some(extra) = extra
            {
                // Source delete of a memory seeds both its identity and event.
                // The extra root must participate in privacy roots, not merely
                // the later dependency set (which affects disputed corrections).
                let _roots = match budget
                    .reserve(self.source.len() + extra.len() + 2 * std::mem::size_of::<String>())
                {
                    Ok(storage) => storage,
                    Err(_) => {
                        self.abort(core)?;
                        return Err(ExecutionError::Capacity.into());
                    }
                };
                let roots = [self.source.clone(), extra];
                match PrivacyPreparationCursor::new(
                    core,
                    &self.actor,
                    &roots,
                    self.candidate,
                    self.limits,
                    budget,
                ) {
                    Ok(preparation) => {
                        self.preparation = Some(preparation);
                        self.memory_alias_added = true;
                    }
                    Err(error) => {
                        self.abort(core)?;
                        return Err(error.into());
                    }
                }
                drop(prepared);
                let Some(preparation) = self.preparation.as_mut() else {
                    return Err(ExecutionError::Invariant.into());
                };
                return match preparation.step(core, None, budget)? {
                    PrivacyPreparationStep::Read(question) => {
                        Ok(ForgetExperienceStep::History(question))
                    }
                    PrivacyPreparationStep::Complete(_) => Err(ExecutionError::Invariant.into()),
                };
            }
            match PrivacyEditCursor::from_prepared(
                core,
                prepared,
                PrivacyEditMode::Forget,
                self.candidate,
                budget,
            ) {
                Ok(edit) => self.edit = Some(edit),
                Err(error) => {
                    self.abort(core)?;
                    return Err(error.into());
                }
            }
        }
        let Some(edit) = self.edit.as_mut() else {
            return Err(ExecutionError::Invariant.into());
        };
        let completed = match edit.advance(core, edit_answer, budget) {
            Ok(super::privacy_run::PrivacyEditProgress::History(question)) => {
                return Ok(ForgetExperienceStep::History(question));
            }
            Ok(super::privacy_run::PrivacyEditProgress::Collation) => {
                return Ok(ForgetExperienceStep::Collation(
                    self.edit
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .pending_collation()?,
                ));
            }
            Ok(super::privacy_run::PrivacyEditProgress::Complete(completed)) => completed,
            Err(
                error @ (HistoryPreparationError::StaleResponse
                | HistoryPreparationError::MalformedResponse
                | HistoryPreparationError::Capacity),
            ) => return Err(error),
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        };
        // Source finish() reconciles other commitments even with no occurrence.
        // The physical checkpoint restores the inherited interval/sequence on
        // failure; residency-only preparation never advances either clock.
        let finalized = (|| {
            core.physical().reconcile_closed_coaching()?;
            advance_commitments(core, &[], budget)?;
            core.state.physical.header.native_interval = None;
            core.state.physical.header.sequence = core
                .state
                .physical
                .header
                .sequence
                .checked_add(1)
                .filter(|v| *v <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            core.sync_sensory_changes()?;
            Ok::<_, ExecutionError>(())
        })();
        if let Err(error) = finalized {
            self.abort(core)?;
            return Err(error.into());
        }
        let privacy = match PrivacyConstraintChange::capture(core, &self.actor, budget) {
            Ok(value) => value,
            Err(error) => {
                self.abort(core)?;
                return Err(error.into());
            }
        };
        let checkpoint = self
            .checkpoint
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        core.journal.keep(core.state, checkpoint)?;
        Ok(ForgetExperienceStep::Complete(self.complete(
            true,
            Some(completed),
            Some(privacy),
        )?))
    }
}
enum ForgetReadiness {
    Refused,
    Ready(Option<String>),
}
fn forget_readiness(
    core: &CoreMutation<'_>,
    actor: &str,
    source: &str,
    selection: &PrivacySelection,
) -> Result<ForgetReadiness, ExecutionError> {
    if !selection.scope.matches(core.state, actor) {
        return Err(ExecutionError::InvalidCheckpoint);
    }
    let memories = core
        .state
        .experience
        .optional_collection(actor, PersonalSourceKind::Memory)?;
    if memories.is_some_and(|owner| !owner.complete_current_obligations()) {
        return Err(ExperienceError::UnknownCoverage.into());
    }
    let values = &core.state.reception.received_values.as_ref();
    let _roots = core.journal.byte_budget().reserve(
        source.len()
            + crate::host::retained_size::map_storage::<String, ()>(1)
                .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut roots = IndexSet::from([source.to_owned()]);
    let mut aliases = core.state.temporal.resident_account_alias_index(
        actor,
        values,
        &core.state.installed.account_law(),
        core.journal.byte_budget(),
    )?;
    aliases.expand(&mut roots)?;
    if memories
        .into_iter()
        .flat_map(PersonalSourceCollection::records)
        .any(|record| {
            let h = &record.header;
            h.unresolved_commitment
                && [
                    Some(h.reference.id.as_str()),
                    h.event_id.as_deref(),
                    h.obligation_evidence_id.as_deref(),
                ]
                .into_iter()
                .flatten()
                .any(|id| roots.contains(id))
        })
    {
        return Ok(ForgetReadiness::Refused);
    }
    let awareness = core
        .state
        .experience
        .optional_collection(actor, PersonalSourceKind::Awareness)?;
    let summaries = core
        .state
        .experience
        .optional_collection(actor, PersonalSourceKind::Summary)?;
    let selected = [awareness, memories, summaries]
        .into_iter()
        .flatten()
        .find_map(|owner| {
            owner
                .records()
                .find(|record| record.header.reference.id == source)
        });
    if let Some(record) = selected {
        if !core
            .state
            .physical
            .entities
            .get(actor)
            .is_some_and(crate::state::Entity::has_memory)
            || record.header.class == AccountClass::Sensory
        {
            return Ok(ForgetReadiness::Refused);
        }
        if record.header.reference.kind == PersonalSourceKind::Memory {
            return Ok(ForgetReadiness::Ready(
                record.header.event_id.clone().filter(|id| id != source),
            ));
        }
    }
    // The sealed selection certifies the negative source lookup. No full owner
    // is inferred merely from the small resident autobiographical tail.
    Ok(ForgetReadiness::Ready(None))
}
