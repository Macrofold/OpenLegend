//! Reapply accepted privacy to one private restored candidate. Correction
//! groups finish once, then genuine forget operations keep their own guarded
//! finish boundaries, exactly as Source's reapplyExperiencePrivacy does.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::language::CollationRequest;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RestorePrivacyInput {
    pub forgotten: IndexMap<String, Vec<String>>,
    pub corrections: IndexMap<String, IndexMap<String, String>>,
}
heap_record!(RestorePrivacyInput {
    forgotten,
    corrections
});

pub(crate) enum RestorePrivacyStep<'a> {
    History(Arc<HistoryEditQuestion>),
    Collation(&'a CollationRequest),
    Complete,
}
enum Progress {
    History(Arc<HistoryEditQuestion>),
    Collation,
    Complete,
}
enum Child {
    Correction(PrivacyEditCursor),
    Forget(RecallEditCursor),
}
pub(crate) struct RestorePrivacyCursor {
    input: RestorePrivacyInput,
    groups: IndexMap<String, IndexMap<String, Vec<String>>>,
    actor: usize,
    item: usize,
    corrections_done: bool,
    child: Option<Child>,
    key: CandidateKey,
    limits: HistoryEditLimits,
    done: bool,
    _storage: ByteReservation,
}
impl RestorePrivacyCursor {
    pub(crate) fn has_pending_edits(&self, core: &CoreMutation<'_>) -> bool {
        !self.groups.is_empty()
            || self.input.forgotten.iter().any(|(actor, sources)| {
                let owner = core.state.experience.actor(actor);
                sources.iter().any(|source| {
                    !owner.is_some_and(|owner| owner.privacy.forgotten_ids().contains(source))
                })
            })
    }
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        input: RestorePrivacyInput,
        key: CandidateKey,
        limits: HistoryEditLimits,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        // The grouped worklist and the supplied ledger coexist. Its shape is
        // bounded by actual input entries, including the sparse map carriers.
        let heap = input.heap_bytes().ok_or(ExecutionError::Capacity)?;
        let entries = input
            .corrections
            .values()
            .try_fold(0usize, |n, values| n.checked_add(values.len()))
            .ok_or(ExecutionError::Capacity)?;
        let bytes = heap
            .checked_mul(3)
            .and_then(|n| n.checked_add(entries.checked_mul(256)?))
            .and_then(|n| n.checked_add(std::mem::size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut groups = IndexMap::<String, IndexMap<String, Vec<String>>>::new();
        for (actor, corrections) in &input.corrections {
            let existing = core.state.experience.actor(actor);
            for (source, evidence) in corrections {
                if input
                    .forgotten
                    .get(actor)
                    .is_some_and(|ids| ids.contains(source))
                    || existing.is_some_and(|owner| {
                        owner.privacy.corrections().get(source) == Some(evidence)
                    })
                {
                    continue;
                }
                groups
                    .entry(actor.clone())
                    .or_default()
                    .entry(evidence.clone())
                    .or_default()
                    .push(source.clone());
            }
        }
        Ok(Self {
            input,
            groups,
            actor: 0,
            item: 0,
            corrections_done: false,
            child: None,
            key,
            limits,
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(child) = &mut self.child {
            match child {
                Child::Correction(child) => child.abort(core)?,
                Child::Forget(child) => child.abort(core)?,
            }
        }
        self.child = None;
        self.done = true;
        Ok(())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<PrivacyEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<RestorePrivacyStep<'a>, HistoryPreparationError> {
        Ok(match self.advance(core, answer, budget)? {
            Progress::History(question) => RestorePrivacyStep::History(question),
            Progress::Complete => RestorePrivacyStep::Complete,
            Progress::Collation => RestorePrivacyStep::Collation(
                match self.child.as_ref().ok_or(ExecutionError::Invariant)? {
                    Child::Correction(child) => child.pending_collation()?,
                    Child::Forget(child) => child.pending_collation()?,
                },
            ),
        })
    }
    fn advance(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<PrivacyEditAnswer>,
        budget: &ByteBudget,
    ) -> Result<Progress, HistoryPreparationError> {
        if self.done {
            return Err(HistoryPreparationError::StaleResponse);
        }
        loop {
            if let Some(child) = &mut self.child {
                match child {
                    Child::Correction(child) => match child.advance(core, answer.take(), budget)? {
                        super::privacy_run::PrivacyEditProgress::History(question) => {
                            return Ok(Progress::History(question));
                        }
                        super::privacy_run::PrivacyEditProgress::Collation => {
                            return Ok(Progress::Collation);
                        }
                        super::privacy_run::PrivacyEditProgress::Complete(_) => {}
                    },
                    Child::Forget(child) => match child.step(core, answer.take(), budget)? {
                        RecallEditStep::History(question) => {
                            return Ok(Progress::History(question));
                        }
                        RecallEditStep::Collation(_) => return Ok(Progress::Collation),
                        RecallEditStep::Complete(done) => {
                            if !done.outcome().ok {
                                return Err(ExecutionError::from(ExperienceError::InvalidBody(
                                    "restored privacy protects an unresolved obligation",
                                ))
                                .into());
                            }
                        }
                    },
                }
                self.child = None;
                self.item += 1;
            } else if answer.is_some() {
                return Err(HistoryPreparationError::StaleResponse);
            }
            if !self.corrections_done {
                if let Some((actor, targets)) = self.groups.get_index(self.actor) {
                    if let Some((evidence, roots)) = targets.get_index(self.item) {
                        self.child = Some(Child::Correction(PrivacyEditCursor::new(
                            core,
                            actor,
                            roots,
                            PrivacyEditMode::Correct {
                                event_id: evidence.clone(),
                            },
                            self.key,
                            self.limits,
                            budget,
                        )?));
                        continue;
                    }
                    self.actor += 1;
                    self.item = 0;
                    continue;
                }
                if !self.groups.is_empty() {
                    // Source calls finish once for all correction groups.
                    core.physical().reconcile_closed_coaching()?;
                    advance_commitments(core, &[], budget).map_err(ExecutionError::from)?;
                    core.state.physical.header.native_interval = None;
                    core.state.physical.header.sequence = core
                        .state
                        .physical
                        .header
                        .sequence
                        .checked_add(1)
                        .filter(|v| *v <= MAX_SAFE_INTEGER)
                        .ok_or(ExecutionError::Identity)?;
                    core.sync_sensory_changes()?;
                }
                self.corrections_done = true;
                self.actor = 0;
                self.item = 0;
            }
            if let Some((actor, ids)) = self.input.forgotten.get_index(self.actor) {
                if let Some(source) = ids.get(self.item) {
                    if core
                        .state
                        .experience
                        .actor(actor)
                        .is_some_and(|owner| owner.privacy.is_forgotten(source))
                    {
                        self.item += 1;
                        continue;
                    }
                    self.child = Some(Child::Forget(RecallEditCursor::new(
                        core,
                        actor,
                        source,
                        PrivacyEditMode::Forget,
                        RecallAdmission::Replay,
                        self.key,
                        self.limits,
                        budget,
                    )?));
                    continue;
                }
                self.actor += 1;
                self.item = 0;
                continue;
            }
            self.done = true;
            return Ok(Progress::Complete);
        }
    }
}
