//! Reflection proposals reach the same individual-name and notepad writers as
//! explicit responses; the held native ticket supplies every subject grant.
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{KnowledgeSubject, ObserverSubject};
use crate::records::SqlCell;
use crate::response::ResponseBindings;
use crate::text::JsText;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct NameEdit {
    pub subject_id: ObserverSubject,
    pub expected_revision: i64,
    pub given_name: JsText,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct NoteEdit {
    pub subject_id: Option<ObserverSubject>,
    pub expected_revision: i64,
    pub text: JsText,
}
fn knowledge_subject(subject: &ObserverSubject) -> KnowledgeSubject {
    match subject {
        ObserverSubject::Entity { entity_id } => KnowledgeSubject::Entity {
            entity_id: entity_id.clone(),
        },
        ObserverSubject::Individual { individual_id } => KnowledgeSubject::Individual {
            individual_id: individual_id.clone(),
        },
    }
}
pub(super) fn decode<T: serde::de::DeserializeOwned>(
    value: &SqlCell,
    budget: &ByteBudget,
) -> Result<(T, ByteReservation), ExecutionError> {
    let mut storage = budget.reserve(
        value
            .heap_bytes()
            .and_then(|n| n.checked_mul(12))
            .and_then(|n| n.checked_add(512))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let encoded = crate::encoding::json_record(value).map_err(|_| ExecutionError::Invariant)?;
    storage.resize(
        storage
            .bytes()
            .checked_add(crate::experience::encoded_body_bound(&encoded)?)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let value = serde_json::from_str(&encoded).map_err(|_| ExecutionError::InvalidCheckpoint)?;
    Ok((value, storage))
}
pub(super) fn name(
    core: &mut CoreMutation<'_>,
    actor: &str,
    change: &NameEdit,
    permitted: &[ObserverSubject],
    evidence: &[String],
    budget: &ByteBudget,
) -> Result<(Outcome, ByteReservation), ExecutionError> {
    // Clone the bounded edit only after its transient allocation is admitted.
    let _copy = budget.reserve(
        change
            .subject_id
            .heap_bytes()
            .and_then(|n| n.checked_add(change.given_name.heap_bytes()?))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(crate::worlds::base_knowledge::assign_subject_name(
        core,
        actor,
        &crate::worlds::base_knowledge::NameEdit {
            subject_id: change.subject_id.clone(),
            expected_revision: change.expected_revision,
            given_name: change.given_name.clone(),
        },
        permitted,
        evidence,
        budget,
    )?
    .into_parts())
}
pub(super) fn note(
    core: &mut CoreMutation<'_>,
    bindings: &ResponseBindings,
    change: &NoteEdit,
    permitted: &[ObserverSubject],
    evidence: &[String],
    budget: &ByteBudget,
) -> Result<Option<(Outcome, ByteReservation)>, ExecutionError> {
    let actor = bindings.actor_id();
    let _copies = budget.reserve(
        permitted
            .iter()
            .try_fold(
                (permitted.len() + 2)
                    .checked_mul(std::mem::size_of::<KnowledgeSubject>())
                    .ok_or(ExecutionError::Capacity)?,
                |n, s| {
                    n.checked_add(s.heap_bytes().ok_or(ExecutionError::Capacity)?)
                        .ok_or(ExecutionError::Capacity)
                },
            )?
            .checked_add(change.text.heap_bytes().ok_or(ExecutionError::Capacity)?)
            .and_then(|n| n.checked_add(change.subject_id.heap_bytes()?.checked_mul(2)?))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let subject = change.subject_id.as_ref().map(knowledge_subject);
    let remembered = change
        .subject_id
        .as_ref()
        .is_some_and(|s| bindings.remembered_note_subject(s));
    if let Some(selected) = &change.subject_id {
        let names = crate::worlds::InstalledPersonalNameReader::prepare(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            actor,
        )?;
        let recognized = if remembered {
            core.state
                .reception
                .actor_knowledge
                .get(actor, subject.as_ref())?
                .is_some()
        } else {
            match selected {
                ObserverSubject::Entity { entity_id } => names.can_remember_subject(entity_id)?,
                individual @ ObserverSubject::Individual { .. } => {
                    names.observer_individual(individual).is_some()
                }
            }
        };
        if !recognized {
            return Ok(None);
        }
    }
    let allowed: Vec<_> = if remembered {
        subject.iter().cloned().collect()
    } else {
        permitted.iter().map(knowledge_subject).collect()
    };
    // Source rememberSubject(authored=false) creates no identity. The ordinary
    // knowledge writer retains the existing subject and exact evidence itself.
    Ok(Some(
        crate::knowledge::edit_knowledge(
            core,
            actor,
            &crate::knowledge::KnowledgeEdit {
                subject_id: subject,
                expected_revision: change.expected_revision,
                text: change.text.clone(),
            },
            &allowed,
            evidence,
            budget,
        )?
        .into_parts(),
    ))
}
