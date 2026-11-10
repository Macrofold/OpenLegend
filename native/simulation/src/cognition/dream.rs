//! Daily interpretation is an optional child of the same consolidation root.
//! It shares the real mind publication owner and commits no independent effect.
use super::{format::VerifiedMaintenanceFormat, reflection::*};
use crate::execution::{CandidateCheckpoint, CoreMutation, ExecutionError};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::ObserverSubject;
use crate::records::SqlCell;
use serde::Deserialize;
pub(crate) struct DreamInput {
    pub job: String,
    pub publication: SqlCell,
    pub subjects: Vec<ObserverSubject>,
    pub storage: ByteReservation,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Publication {
    actor_id: String,
    expected_revision: u64,
    snapshot: String,
    files: Vec<MindFile>,
    thoughts: Vec<crate::text::JsText>,
    evidence_ids: Vec<String>,
    dream_episode: Option<String>,
    goal_changes: Vec<SqlCell>,
    knowledge_changes: Vec<SqlCell>,
    name_changes: Vec<SqlCell>,
    appraisal_changes: Vec<SqlCell>,
    record_changes: Vec<InnerRecordChange>,
}
pub(crate) fn publish(
    core: &mut CoreMutation<'_>,
    checkpoint: &CandidateCheckpoint,
    input: &DreamInput,
    format: &VerifiedMaintenanceFormat,
    budget: &ByteBudget,
) -> Result<(), MindPublicationError> {
    let _parse = budget
        .reserve(
            crate::experience::encoded_body_bound(&format.canonical)
                .map_err(ExecutionError::from)?,
        )
        .map_err(ExecutionError::from)?;
    let publication: Publication =
        serde_json::from_str(&format.canonical).map_err(|_| ExecutionError::Invariant)?;
    if publication.dream_episode.is_none()
        || !publication.goal_changes.is_empty()
        || !publication.knowledge_changes.is_empty()
        || !publication.name_changes.is_empty()
        || !publication.appraisal_changes.is_empty()
    {
        return Err(ExecutionError::InvalidCheckpoint.into());
    }
    if let Some(prior) = core
        .state
        .minds
        .inner_worlds
        .as_ref()
        .and_then(|m| m.get(&publication.actor_id))
        .filter(|p| p.publication_job_id == input.job)
    {
        if prior.publication_body.as_deref() == Some(format.canonical.as_str()) {
            return Ok(());
        }
        return Err(MindPublicationError::Refused(
            "The publication identity was already used or its source was erased.",
        ));
    }
    // Dream preparation captures an expected inner revision, but Source adds no
    // reflection-only snapshot of the actor's unresolved obligations here.
    let prepared = super::reflection::prepare(
        core.state,
        MindPublicationInput {
            actor: &publication.actor_id,
            expected_revision: publication.expected_revision,
            job_id: &input.job,
            snapshot: &publication.snapshot,
            files: &publication.files,
            thoughts: &publication.thoughts,
            evidence_ids: &publication.evidence_ids,
            dream_episode: publication.dream_episode.as_deref(),
            record_changes: &publication.record_changes,
            permitted_subjects: &input.subjects,
            canonical_body: &format.canonical,
            valid_paths: &format.valid_paths,
            file_words: &format.file_words,
            thought_words: &format.thought_words,
        },
        budget,
    )?;
    core.journal.cognition.publish(
        &mut core.state.minds,
        &publication.actor_id,
        prepared,
        budget,
    )?;
    super::finalization::finish_transition(core, checkpoint, &publication.actor_id, &[], budget)?;
    Ok(())
}
