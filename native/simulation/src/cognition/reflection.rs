//! Atomic private workspace publication. Subject/evidence resolution and pure
//! Unicode formatting are completed by the sealed native reflection ticket.
use super::*;
use crate::execution::ExecutionError;
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum, tree_node_bound};
use crate::simulation::SimulationState;
use crate::text::JsText;

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct MindFile {
    pub path: JsText,
    pub text: JsText,
}
heap_record!(MindFile { path, text });

#[derive(Deserialize, Serialize)]
#[serde(
    tag = "operation",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub(crate) enum InnerRecordChange {
    Remove {
        id: String,
        expected_revision: u64,
    },
    Upsert {
        id: String,
        expected_revision: u64,
        document_id: String,
        kind: InnerKind,
        subject_id: Option<ObserverSubject>,
        source: InnerSource,
        confidence: f64,
        trust: Option<f64>,
        status: InnerStatus,
        evidence: Vec<EvidenceLink>,
    },
}
impl InnerRecordChange {
    fn id(&self) -> &str {
        match self {
            Self::Remove { id, .. } | Self::Upsert { id, .. } => id,
        }
    }
    fn expected_revision(&self) -> u64 {
        match self {
            Self::Remove {
                expected_revision, ..
            }
            | Self::Upsert {
                expected_revision, ..
            } => *expected_revision,
        }
    }
}
impl HeapBytes for InnerRecordChange {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Remove { id, .. } => id.heap_bytes(),
            Self::Upsert {
                id,
                document_id,
                subject_id,
                evidence,
                ..
            } => heap_sum([
                id.heap_bytes()?,
                document_id.heap_bytes()?,
                subject_id.heap_bytes()?,
                evidence.heap_bytes()?,
            ]),
        }
    }
}
pub(crate) struct MindPublicationInput<'a> {
    pub actor: &'a str,
    pub expected_revision: u64,
    pub job_id: &'a str,
    pub snapshot: &'a str,
    pub files: &'a [MindFile],
    pub thoughts: &'a [JsText],
    pub evidence_ids: &'a [String],
    pub dream_episode: Option<&'a str>,
    pub record_changes: &'a [InnerRecordChange],
    pub permitted_subjects: &'a [ObserverSubject],
    pub canonical_body: &'a str,
    pub valid_paths: &'a [bool],
    pub file_words: &'a [u64],
    pub thought_words: &'a [u64],
}
pub(crate) struct PreparedMindPublication {
    pub(super) mind: ActorMind,
    pub(super) inner: InnerWorld,
}
#[derive(Debug)]
pub(crate) enum MindPublicationError {
    Refused(&'static str),
    Execution(ExecutionError),
}
impl From<ExecutionError> for MindPublicationError {
    fn from(e: ExecutionError) -> Self {
        Self::Execution(e)
    }
}
impl From<crate::host::CapacityError> for MindPublicationError {
    fn from(_: crate::host::CapacityError) -> Self {
        Self::Execution(ExecutionError::Capacity)
    }
}
impl From<crate::experience::ExperienceError> for MindPublicationError {
    fn from(e: crate::experience::ExperienceError) -> Self {
        Self::Execution(ExecutionError::from(e))
    }
}
fn slice_bytes<T: HeapBytes>(values: &[T]) -> Option<usize> {
    values.iter().try_fold(
        values.len().checked_mul(std::mem::size_of::<T>())?,
        |n, value| n.checked_add(value.heap_bytes()?),
    )
}
fn next(n: u64) -> Result<u64, MindPublicationError> {
    n.checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(MindPublicationError::Execution(ExecutionError::Invariant))
}
fn refused<T>(message: &'static str) -> Result<T, MindPublicationError> {
    Err(MindPublicationError::Refused(message))
}
fn safe_record_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
        && !matches!(id, "__proto__" | "constructor" | "prototype")
}
/// The outer cursor checks all other leaf edits in the same root checkpoint.
/// This preparation never installs a partially valid mind or truncates prose.
pub(crate) fn validate_front(
    state: &SimulationState,
    input: &MindPublicationInput<'_>,
) -> Result<(), MindPublicationError> {
    let prior = state
        .minds
        .inner_worlds
        .as_ref()
        .and_then(|m| m.get(input.actor));
    let entity = state.physical.entities.get(input.actor);
    let actor = entity.and_then(|e| e.actor.as_ref());
    if prior.is_none_or(|p| p.revision != input.expected_revision)
        || actor.is_none_or(|a| {
            !a.alive || a.incapacitated || a.capabilities.as_ref().is_some_and(|c| !c.inner_world)
        })
        || entity.is_none_or(|e| !e.has_memory())
        || state.physical.header.paused
    {
        return refused("Actor or accepted revision changed.");
    }
    let mind = state
        .minds
        .minds
        .as_ref()
        .and_then(|m| m.get(input.actor))
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let limits = &state.installed.mind_limits;
    if input.canonical_body.len() as u64 > limits.proposal_bytes {
        return refused("Reflection is too large to save. Existing thoughts and notes were kept.");
    }
    if input.thoughts.is_empty()
        || input.thoughts.len() > 3
        || input.thought_words.len() != input.thoughts.len()
        || input
            .thoughts
            .iter()
            .zip(input.thought_words)
            .any(|(t, words)| t.trim_is_empty() || *words > 20)
    {
        return refused("Invalid presentation thoughts.");
    }
    if input.files.is_empty()
        || input.files.len() as u64 > limits.documents
        || input.valid_paths.len() != input.files.len()
        || input.file_words.len() != input.files.len()
    {
        return refused("The inner world requires 1–10 files.");
    }
    for (i, file) in input.files.iter().enumerate() {
        if !input.valid_paths[i]
            || file.path.as_unicode().is_none()
            || !file.path.ends_with_str(".md")
            || input.files[..i].iter().any(|old| old.path == file.path)
        {
            return refused("Invalid or duplicate inner-world filename.");
        }
        if input.file_words[i] > limits.words
            || file
                .path
                .utf8_len()
                .checked_add(1)
                .and_then(|n| n.checked_add(file.text.utf8_len()))
                .is_none_or(|n| n as u64 > limits.document_bytes)
        {
            return refused("Inner-world file quota exceeded; content was not truncated.");
        }
    }
    for document in mind.documents.iter().filter(|d| {
        d.protected
            || mind.records.iter().any(|r| {
                r.document_id == d.id
                    && r.kind == InnerKind::Commitment
                    && r.status == InnerStatus::Active
            })
    }) {
        if !input.files.iter().any(|f| {
            f.path.borrowed().ends_with_str(".md")
                && f.path
                    .as_unicode()
                    .is_some_and(|path| path.strip_suffix(".md") == Some(document.id.as_str()))
                && f.text == document.text
        }) {
            return refused("Essential identity must be preserved.");
        }
    }
    if let Some(episode) = input.dream_episode {
        let dream = crate::capture::maintenance::dream_status(state, input.actor);
        if dream.is_none_or(|(current, elapsed, after)| current != episode || elapsed < after) {
            return refused("Dream interrupted.");
        }
        if mind.last_dream_episode.as_deref() == Some(episode) {
            return refused("This sleep episode was already interpreted.");
        }
    }
    if input.evidence_ids.iter().any(|id| {
        state
            .experience
            .actor(input.actor)
            .is_some_and(|h| h.privacy.is_forgotten(id))
    }) {
        return refused("Evidence was forgotten.");
    }
    Ok(())
}
pub(crate) fn prepare(
    state: &SimulationState,
    input: MindPublicationInput<'_>,
    budget: &ByteBudget,
) -> Result<PreparedMindPublication, MindPublicationError> {
    validate_front(state, &input)?;
    let mind = state
        .minds
        .minds
        .as_ref()
        .and_then(|m| m.get(input.actor))
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let limits = &state.installed.mind_limits;
    if input.record_changes.len() as u64 > limits.records.saturating_mul(2)
        || input
            .record_changes
            .iter()
            .enumerate()
            .any(|(i, c)| input.record_changes[..i].iter().any(|p| p.id() == c.id()))
    {
        return refused("Too many or duplicate record operations.");
    }
    // Actual old bodies and new proposal text coexist. Admit every copied
    // carrier/string before cloning, then transfer only the resulting owners.
    let copied = heap_sum([
        mind.heap_bytes().ok_or(ExecutionError::Capacity)?,
        slice_bytes(input.files).ok_or(ExecutionError::Capacity)?,
        slice_bytes(input.thoughts).ok_or(ExecutionError::Capacity)?,
        slice_bytes(input.record_changes).ok_or(ExecutionError::Capacity)?,
        slice_bytes(input.evidence_ids).ok_or(ExecutionError::Capacity)?,
        input.canonical_body.len(),
        input.snapshot.len(),
        input.job_id.len(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut workspace = budget.reserve(
        copied
            .checked_mul(4)
            .and_then(|n| {
                n.checked_add(
                    (input.files.len() + input.record_changes.len() + input.thoughts.len())
                        * 4
                        * std::mem::size_of::<InnerRecord>(),
                )
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut documents = Vec::with_capacity(input.files.len());
    for file in input.files {
        let id = file
            .path
            .as_unicode()
            .and_then(|p| p.strip_suffix(".md"))
            .ok_or(ExecutionError::Invariant)?;
        let prior = mind.documents.iter().find(|d| d.id == id);
        documents.push(if let Some(prior) = prior.filter(|d| d.text == file.text) {
            prior.clone()
        } else {
            MindDocument {
                id: id.into(),
                title: prior.map_or_else(|| JsText::from(id), |p| p.title.clone()),
                text: file.text.clone(),
                revision: next(prior.map_or(0, |p| p.revision))?,
                protected: prior.is_some_and(|p| p.protected),
                evidence: prior.map_or_else(Vec::new, |p| p.evidence.clone()),
            }
        });
    }
    let mut records = mind.records.clone();
    let memory = state
        .experience
        .optional_collection(input.actor, crate::experience::PersonalSourceKind::Memory)?;
    if memory.is_some_and(|m| !m.complete_current_obligations()) {
        return Err(ExecutionError::UnsupportedFamily.into());
    }
    let count = memory.map_or(0, |m| m.records().len());
    let _promise_storage = budget.reserve(
        tree_node_bound::<&str, ()>()
            .and_then(|n| n.checked_mul(count * 2))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let promises = memory
        .into_iter()
        .flat_map(|m| m.records())
        .filter(|m| m.header().own_speech_promise)
        .flat_map(|m| {
            std::iter::once(m.header().reference.id.as_str()).chain(m.header().event_id.as_deref())
        })
        .collect::<std::collections::BTreeSet<_>>();
    for change in input.record_changes {
        let index = records.iter().position(|r| r.id == change.id());
        let prior = index.map(|i| &records[i]);
        if !safe_record_id(change.id())
            || prior.map_or(0, |p| p.revision) != change.expected_revision()
        {
            return refused("Invalid or stale record identity.");
        }
        if prior.is_some_and(|p| {
            p.kind == InnerKind::Identity
                || (p.kind == InnerKind::Commitment && p.status == InnerStatus::Active)
        }) {
            return refused("Protected records cannot be changed.");
        }
        let InnerRecordChange::Upsert {
            id,
            expected_revision,
            document_id,
            kind,
            subject_id,
            source,
            confidence,
            trust,
            status,
            evidence,
        } = change
        else {
            if let Some(index) = index {
                records.remove(index);
                continue;
            }
            return refused("Record to remove is missing.");
        };
        if *source == InnerSource::Authored
            || *kind == InnerKind::Identity
            || !documents.iter().any(|d| d.id == *document_id)
            || !confidence.is_finite()
            || !(0.0..=1.0).contains(confidence)
            || trust.is_some_and(|n| !n.is_finite() || !(-1.0..=1.0).contains(&n))
            || evidence.len() > 16
            || evidence.iter().any(|e| !input.evidence_ids.contains(&e.id))
            || subject_id
                .as_ref()
                .is_some_and(|s| !s.validate() || !input.permitted_subjects.contains(s))
        {
            return refused("Invalid record values or unoffered support.");
        }
        if *kind == InnerKind::Relationship
            && subject_id.as_ref().is_none_or(
                |s| matches!(s, ObserverSubject::Entity { entity_id } if entity_id == input.actor),
            )
        {
            return refused("A relationship requires another known subject.");
        }
        if (input.dream_episode.is_some() || *kind == InnerKind::Dream)
            && *source != InnerSource::Imagined
        {
            return refused("Dream interpretations must remain imagined.");
        }
        if input.dream_episode.is_none() && *kind != InnerKind::Dream && evidence.is_empty() {
            return refused("A lasting interpretation requires supported evidence.");
        }
        if *kind == InnerKind::Commitment
            && !prior.is_some_and(|p| p.kind == *kind && p.status == *status)
            && (*source != InnerSource::Inferred
                || *status != InnerStatus::Active
                || !evidence.iter().any(|e| promises.contains(e.id.as_str())))
        {
            return refused("An interpreted commitment requires the actor’s actual promise.");
        }
        let record = InnerRecord {
            id: id.clone(),
            revision: next(*expected_revision)?,
            document_id: document_id.clone(),
            kind: kind.clone(),
            subject_id: subject_id.clone(),
            source: source.clone(),
            confidence: *confidence,
            trust: *trust,
            status: *status,
            evidence: evidence.clone(),
        };
        if let Some(index) = index {
            records[index] = record;
        } else {
            records.push(record);
        }
    }
    if records.len() as u64 > limits.records
        || records
            .iter()
            .any(|r| !documents.iter().any(|d| d.id == r.document_id))
    {
        return refused("Mind capacity or document reference is invalid.");
    }
    let retained = (limits.thoughts as usize)
        .saturating_sub(input.thoughts.len())
        .min(mind.thoughts.len());
    let mut thoughts = Vec::with_capacity(retained + input.thoughts.len());
    thoughts.extend(
        mind.thoughts[mind.thoughts.len() - retained..]
            .iter()
            .cloned(),
    );
    for text in input.thoughts {
        thoughts.push(PrivateThought {
            decision_id: input.job_id.into(),
            at: state.physical.header.sim_time,
            text: text.clone(),
            kind: if input.dream_episode.is_some() {
                ThoughtKind::Dream
            } else {
                ThoughtKind::Reflection
            },
            source: if input.dream_episode.is_some() {
                ThoughtSource::Imagined
            } else {
                ThoughtSource::Inferred
            },
        });
    }
    let mut mind = ActorMind {
        revision: next(mind.revision)?,
        documents,
        records,
        thoughts,
        last_reflection_at: state.physical.header.sim_time,
        last_dream_episode: input
            .dream_episode
            .map(str::to_owned)
            .or_else(|| mind.last_dream_episode.clone()),
        contents_storage: None,
        metadata_storage: None,
    };
    let mut inner = InnerWorld {
        revision: next(input.expected_revision)?,
        source_snapshot: input.snapshot.into(),
        publication_job_id: input.job_id.into(),
        publication_body: Some(input.canonical_body.into()),
        evidence_ids: input.evidence_ids.to_vec(),
        reconsideration_required: None,
        contents_storage: None,
        metadata_storage: None,
    };
    let mut transfer =
        |bytes: usize| -> Result<crate::host::ResidentReservation, MindPublicationError> {
            Ok(budget.adopt_record(workspace.split_off(bytes)?)?)
        };
    mind.contents_storage = Some(transfer(
        mind_contents_bytes(&mind).ok_or(ExecutionError::Capacity)?,
    )?);
    mind.metadata_storage = Some(transfer(
        mind.last_dream_episode.as_ref().map_or(0, String::capacity),
    )?);
    inner.contents_storage = Some(transfer(
        inner_contents_bytes(&inner).ok_or(ExecutionError::Capacity)?,
    )?);
    inner.metadata_storage = Some(transfer(
        inner.source_snapshot.capacity() + inner.publication_job_id.capacity(),
    )?);
    Ok(PreparedMindPublication { mind, inner })
}
pub(crate) fn publish(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    publication: PreparedMindPublication,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    core.journal
        .cognition
        .publish(&mut core.state.minds, actor, publication, budget)
}
