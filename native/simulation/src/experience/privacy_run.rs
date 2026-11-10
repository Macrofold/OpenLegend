//! One Source-ordered invalidation operation. Preparation is a purpose-bound
//! residency read; no edit completes before receiver, learning and mind cleanup.
use super::*;
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::{CollationAnswer, CollationRequest};
use crate::received::{
    TemporalFacetRevocation, invalidate_temporal_evidence, invalidate_temporal_facets,
};
use crate::worlds::RecognitionPrivacyPreparation;

pub(crate) enum PrivacyEditMode {
    Forget,
    Correct { event_id: String },
}
pub(crate) enum PrivacyEditAnswer {
    History(HistoryEditAnswer),
    Collation(CollationAnswer),
}
pub(crate) enum PrivacyEditStep<'a> {
    History(Arc<HistoryEditQuestion>),
    Collation(&'a CollationRequest),
    Complete(CompletedPrivacyEdit),
}
pub(super) enum PrivacyEditProgress {
    History(Arc<HistoryEditQuestion>),
    Collation,
    Complete(CompletedPrivacyEdit),
}
pub(crate) struct CompletedPrivacyEdit {
    consequences: PrivacyConsequences,
}
impl CompletedPrivacyEdit {
    pub(crate) fn actor_id(&self) -> &str {
        &self.consequences.selection.actor_id
    }
    pub(crate) fn affected(&self) -> impl Iterator<Item = &str> {
        self.consequences
            .selection
            .affected
            .iter()
            .map(String::as_str)
    }
}
pub(crate) struct PrivacyEditCursor {
    preparation: Option<PrivacyPreparationCursor>,
    recognition: Option<RecognitionPrivacyPreparation>,
    consequences: Option<PrivacyConsequences>,
    verification: Option<super::privacy_prepare::HistoryPageVerification>,
    finalized: bool,
    mode: PrivacyEditMode,
    candidate: CandidateKey,
    checkpoint: Option<CandidateCheckpoint>,
    done: bool,
    _storage: ByteReservation,
}
impl PrivacyEditCursor {
    pub(super) fn from_prepared(
        core: &mut CoreMutation<'_>,
        prepared: PreparedPrivacyEdit,
        mode: PrivacyEditMode,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            std::mem::size_of::<Self>()
                .checked_add(match &mode {
                    PrivacyEditMode::Forget => 0,
                    PrivacyEditMode::Correct { event_id } => event_id.capacity(),
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let checkpoint = core.journal.checkpoint(core.state)?;
        let mut cursor = Self {
            preparation: None,
            recognition: None,
            consequences: None,
            verification: None,
            finalized: false,
            mode,
            candidate,
            checkpoint: Some(checkpoint),
            done: false,
            _storage: storage,
        };
        if let Err(error) = cursor.initialize(core, prepared, budget) {
            cursor.abort(core)?;
            return Err(error);
        }
        Ok(cursor)
    }
    fn initialize(
        &mut self,
        core: &mut CoreMutation<'_>,
        prepared: PreparedPrivacyEdit,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let (selection, verification) =
            prepared.into_verified_parts(core, self.candidate, budget)?;
        self.verification = Some(verification);
        self.consequences = Some(begin(core, selection, &self.mode, budget)?);
        let consequences = self
            .consequences
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        self.recognition = RecognitionPrivacyPreparation::prepare(
            core,
            &consequences.selection.actor_id,
            &consequences.recognition_affected,
            binding,
            budget,
        )?;
        Ok(())
    }
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        actor: &str,
        roots: &[String],
        mode: PrivacyEditMode,
        candidate: CandidateKey,
        limits: HistoryEditLimits,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            std::mem::size_of::<Self>()
                .checked_add(match &mode {
                    PrivacyEditMode::Forget => 0,
                    PrivacyEditMode::Correct { event_id } => event_id.capacity(),
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let checkpoint = core.journal.checkpoint(core.state)?;
        let preparation =
            match PrivacyPreparationCursor::new(core, actor, roots, candidate, limits, budget) {
                Ok(preparation) => preparation,
                Err(error) => {
                    core.journal.rollback_to(core.state, checkpoint)?;
                    return Err(error);
                }
            };
        Ok(Self {
            preparation: Some(preparation),
            recognition: None,
            consequences: None,
            verification: None,
            finalized: false,
            mode,
            candidate,
            checkpoint: Some(checkpoint),
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(mut preparation) = self.preparation.take() {
            preparation.abort(core)?;
        }
        self.recognition = None;
        self.consequences = None;
        self.verification = None;
        self.done = true;
        if let Some(checkpoint) = self.checkpoint.take() {
            core.journal.rollback_to(core.state, checkpoint)?;
        }
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PrivacyEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<PrivacyEditStep<'a>, HistoryPreparationError> {
        Ok(match self.advance(core, answer, budget)? {
            PrivacyEditProgress::History(question) => PrivacyEditStep::History(question),
            PrivacyEditProgress::Collation => PrivacyEditStep::Collation(self.pending_collation()?),
            PrivacyEditProgress::Complete(completed) => PrivacyEditStep::Complete(completed),
        })
    }
    pub(super) fn pending_collation(&self) -> Result<&CollationRequest, ExecutionError> {
        Ok(self
            .recognition
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .comparisons())
    }
    pub(super) fn advance(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PrivacyEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<PrivacyEditProgress, HistoryPreparationError> {
        if self.done {
            return Err(HistoryPreparationError::StaleResponse);
        }
        if self.finalized {
            let answer = match answer {
                Some(PrivacyEditAnswer::History(answer)) => Some(answer),
                None => None,
                _ => return Err(HistoryPreparationError::StaleResponse),
            };
            return self.verify_and_complete(core, answer, budget);
        }
        let mut collation = None;
        if let Some(preparation) = &mut self.preparation {
            let answer = match answer {
                None => None,
                Some(PrivacyEditAnswer::History(answer)) => Some(answer),
                _ => return Err(HistoryPreparationError::StaleResponse),
            };
            let completed = match preparation.step(core, answer, budget) {
                Ok(PrivacyPreparationStep::Read(question)) => {
                    return Ok(PrivacyEditProgress::History(question));
                }
                Ok(PrivacyPreparationStep::Complete(completed)) => completed,
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
            if let Err(error) = self.initialize(core, completed, budget) {
                self.abort(core)?;
                return Err(error.into());
            }
        } else {
            match answer {
                Some(PrivacyEditAnswer::Collation(answer)) => collation = Some(answer),
                None => {}
                _ => return Err(HistoryPreparationError::StaleResponse),
            }
        }
        if let Some(answer) = collation {
            let preparation = self
                .recognition
                .take()
                .ok_or(HistoryPreparationError::StaleResponse)?;
            if preparation.comparisons().binding() != answer.binding {
                self.recognition = Some(preparation);
                return Err(HistoryPreparationError::StaleResponse);
            }
            if let Err(error) = preparation.finish(core, &answer, budget) {
                self.abort(core)?;
                return Err(error.into());
            }
        } else if self.recognition.is_some() {
            return Ok(PrivacyEditProgress::Collation);
        }
        let consequences = self
            .consequences
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if let Err(error) = finish(core, consequences, &self.mode, budget) {
            self.abort(core)?;
            return Err(error.into());
        }
        self.finalized = true;
        self.verify_and_complete(core, None, budget)
    }
    fn verify_and_complete(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<HistoryEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<PrivacyEditProgress, HistoryPreparationError> {
        let result = self
            .verification
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .step(core, answer, budget);
        match result {
            Ok(Some(question)) => return Ok(PrivacyEditProgress::History(question)),
            Ok(None) => {}
            Err(
                error @ (HistoryPreparationError::StaleResponse
                | HistoryPreparationError::MalformedResponse
                | HistoryPreparationError::Capacity),
            ) => return Err(error),
            Err(error) => {
                self.abort(core)?;
                return Err(error);
            }
        }
        let checkpoint = self
            .checkpoint
            .take()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        core.journal.keep(core.state, checkpoint)?;
        self.done = true;
        Ok(PrivacyEditProgress::Complete(CompletedPrivacyEdit {
            consequences: self.consequences.take().ok_or(ExecutionError::Invariant)?,
        }))
    }
}
fn begin(
    core: &mut CoreMutation<'_>,
    selection: PrivacySelection,
    mode: &PrivacyEditMode,
    budget: &ByteBudget,
) -> Result<PrivacyConsequences, ExecutionError> {
    let actor = selection.actor_id.clone();
    if !selection.scope.matches(core.state, &actor)
        || core
            .state
            .experience
            .actor(&actor)
            .is_none_or(|history| history.privacy.revision() != selection.privacy_revision)
    {
        return Err(ExecutionError::InvalidCheckpoint);
    }
    if !selection.roots.is_empty() {
        core.journal
            .experience
            .advance_privacy_revision(&mut core.state.experience, &actor)?;
        core.state.temporal.mark_support_dirty(&actor, None)?;
    }
    core.journal
        .experience
        .invalidate_known_places(&mut core.state.experience, &actor)?;
    // Learned recipes, inspection and combat acquisitions are closed empty
    // families in the selected installer; its admitted writers create none.
    let released =
        invalidate_temporal_evidence(core, &actor, &selection.affected, &selection.scope, budget)?;
    crate::reception::revoke_received_geometry_evidence(core, &actor, &selection.affected, budget)?;
    crate::reception::revoke_attention_evidence(core, &actor, &selection.affected, budget)?;
    let consequences = continue_privacy_selection(
        selection,
        core.state,
        &released.sources,
        matches!(mode, PrivacyEditMode::Forget),
        budget,
    )?;
    invalidate_temporal_facets(
        core,
        &actor,
        &TemporalFacetRevocation::Associations {
            affected: &consequences.recognition_affected,
            facts: &consequences.revoked_facts,
        },
        &consequences.selection.scope,
        budget,
    )?;
    for id in &consequences.revoked_facts {
        match mode {
            PrivacyEditMode::Forget => {
                core.journal
                    .experience
                    .forget_alias(&mut core.state.experience, &actor, id)?;
            }
            PrivacyEditMode::Correct { event_id } => {
                core.journal.experience.set_correction(
                    &mut core.state.experience,
                    &actor,
                    id,
                    Some(event_id),
                )?;
            }
        }
    }
    core.journal.originals.revoke_originals(
        &mut core.state.reception,
        &actor,
        &consequences.selection.affected,
    )?;
    crate::reception::revoke_current_evidence(
        core,
        &actor,
        &consequences.selection.affected,
        &consequences.recognition_affected,
        budget,
    )?;
    Ok(consequences)
}
fn finish(
    core: &mut CoreMutation<'_>,
    consequences: &PrivacyConsequences,
    mode: &PrivacyEditMode,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let actor = &consequences.selection.actor_id;
    let affected = &consequences.selection.affected;
    core.journal
        .activity
        .revoke_evidence(
            &mut core.state.activity,
            actor,
            affected,
            &consequences.selection.scope,
        )
        .map_err(ExecutionError::Activity)?;
    core.revoke_practice_support(actor, affected, budget)?;
    if matches!(mode, PrivacyEditMode::Forget) {
        for id in affected
            .iter()
            .filter(|id| !consequences.retained_direct.contains(*id))
        {
            core.journal
                .experience
                .forget_alias(&mut core.state.experience, actor, id)?;
        }
        let privacy = &core
            .state
            .experience
            .actor(actor)
            .ok_or(ExecutionError::Invariant)?
            .privacy;
        let _keys = budget.reserve(
            privacy
                .corrections
                .keys()
                .try_fold(
                    privacy
                        .corrections
                        .len()
                        .checked_mul(std::mem::size_of::<String>())
                        .ok_or(ExecutionError::Capacity)?,
                    |n, key| n.checked_add(key.len()),
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let keys = privacy
            .corrections
            .iter()
            .filter(|(id, evidence)| {
                !consequences.retained_direct.contains(*id)
                    && (affected.contains(*id) || affected.contains(*evidence))
            })
            .map(|(id, _)| id.clone())
            .collect::<Vec<_>>();
        for id in keys {
            core.journal
                .experience
                .set_correction(&mut core.state.experience, actor, &id, None)?;
        }
    }
    // Awareness/memory removal precedes knowledge invalidation. Summaries are
    // withdrawn afterward, exactly where Source prunes its consolidated canvas.
    for source in consequences
        .removals
        .iter()
        .filter(|source| source.kind != PersonalSourceKind::Summary)
    {
        core.journal.experience.remove(
            &mut core.state.experience,
            actor,
            source.kind,
            &source.id,
        )?;
    }
    core.journal.recognition.advance_revision(
        &mut core.state.reception,
        actor,
        &mut core.journal.cognition,
    )?;
    let _appraisals = crate::appraisals::invalidate_appraisals(core, actor, budget)?;
    crate::knowledge::revoke_knowledge_documents(core, actor, budget)?;
    for source in consequences
        .removals
        .iter()
        .filter(|source| source.kind == PersonalSourceKind::Summary)
    {
        core.journal.experience.remove(
            &mut core.state.experience,
            actor,
            source.kind,
            &source.id,
        )?;
    }
    core.journal
        .cognition
        .clear_derived_mind(&mut core.state.minds, actor, budget)?;
    // Removal before-images are the exact accounting inputs, including cold
    // records loaded solely for this edit. Do not recount resident tails.
    let policy = &core.state.installed.attention.value().retention;
    for source in &consequences.removals {
        let prior = core
            .journal
            .experience
            .removed()
            .rev()
            .find(|record| record.header.actor_id == *actor && record.header.reference == *source)
            .ok_or(ExecutionError::Invariant)?;
        core.state.temporal.adjust_account(
            actor,
            prior.header.class,
            -(prior.payload.len() as i128),
            -1,
            None,
            core.state.physical.header.sim_time,
            policy,
        )?;
    }
    if let PrivacyEditMode::Correct { event_id } = mode {
        // Both live correction and accepted-ledger replay preserve the whole
        // acquired account's pre-invalidation aliases, after derived cleanup.
        // Association facts above are additional roots, not a substitute.
        for alias in &consequences.selection.roots {
            core.journal.experience.set_correction(
                &mut core.state.experience,
                actor,
                alias,
                Some(event_id),
            )?;
        }
    }
    Ok(())
}
