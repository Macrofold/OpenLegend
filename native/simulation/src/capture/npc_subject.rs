//! One selected observer subject's existing names and notepad metadata.
use crate::execution::ExecutionError;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{KnowledgeSubject, ObserverSubject};
use crate::simulation::SimulationState;
use crate::text::JsText;
use crate::worlds::InstalledPersonalNameReader;
use serde::Serialize;
use std::mem::size_of;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NpcSubjectFact {
    pub(crate) subject: ObserverSubject,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) canonical_id: Option<String>,
    label: JsText,
    pub(crate) identity_present: bool,
    pub(crate) current_communication: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    preferred_name: Option<JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    observer_name: Option<crate::worlds::OwnedPersonalName>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reference_attribution: Option<crate::records::SqlCell>,
    name_revision: u64,
    note_revision: u64,
    note_characters: usize,
    pub(crate) seed_only: bool,
    pub(crate) can_address_remembered: bool,
    named: bool,
    #[serde(skip)]
    _storage: ByteReservation,
}
pub(crate) fn subject_fact(
    state: &SimulationState,
    actor: &str,
    names: &InstalledPersonalNameReader<'_>,
    subject: ObserverSubject,
    budget: &ByteBudget,
) -> Result<NpcSubjectFact, ExecutionError> {
    let identity = names.observer_individual(&subject);
    let canonical = match &subject {
        ObserverSubject::Entity { entity_id } => Some(entity_id.as_str()),
        ObserverSubject::Individual { .. } => {
            identity.and_then(|identity| identity.canonical_id.as_deref())
        }
    };
    let label = names.subject_label(&subject)?;
    let preferred = identity.and_then(|identity| {
        identity
            .nickname
            .as_ref()
            .filter(|name| !name.is_empty())
            .or_else(|| (!identity.given_name.is_empty()).then_some(&identity.given_name))
    });
    let current_communication = match &subject {
        ObserverSubject::Entity { entity_id } => {
            names
                .current_body_association(entity_id)?
                .and_then(|subject| names.observer_individual(subject))
                .and_then(|identity| identity.canonical_id.as_ref())
                == Some(entity_id)
        }
        ObserverSubject::Individual { .. } => false,
    };
    let reference = match &subject {
        ObserverSubject::Entity { entity_id } => Some(
            if let Some((lease, _)) = names.current_body_grant(entity_id)? {
                Ok(lease)
            } else if names.recognizes_subject(entity_id)? {
                Ok("known")
            } else {
                Err(state.physical.header.sequence)
            },
        ),
        ObserverSubject::Individual { .. } => None,
    };
    let _key = budget.reserve(
        subject
            .heap_bytes()
            .and_then(|n| n.checked_mul(6))
            .and_then(|n| n.checked_add(128))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let knowledge = match &subject {
        ObserverSubject::Entity { entity_id } => KnowledgeSubject::Entity {
            entity_id: entity_id.clone(),
        },
        ObserverSubject::Individual { individual_id } => KnowledgeSubject::Individual {
            individual_id: individual_id.clone(),
        },
    };
    let note = state
        .reception
        .actor_knowledge
        .get(actor, Some(&knowledge))?;
    let bytes = size_of::<NpcSubjectFact>()
        .checked_add(subject.heap_bytes().ok_or(ExecutionError::Capacity)?)
        .and_then(|n| n.checked_add(canonical.map_or(0, str::len)))
        .and_then(|n| n.checked_add(label.storage_bytes()))
        .and_then(|n| n.checked_add(preferred.map_or(Some(0), HeapBytes::heap_bytes)?))
        .and_then(|n| n.checked_add(reference.map_or(0, |value| value.map_or(0, str::len))))
        .ok_or(ExecutionError::Capacity)?;
    let storage = budget.reserve(bytes)?;
    Ok(NpcSubjectFact {
        canonical_id: canonical.map(str::to_owned),
        label: label.to_owned(),
        identity_present: identity.is_some(),
        current_communication,
        preferred_name: preferred.cloned(),
        observer_name: match &subject {
            ObserverSubject::Entity { entity_id }
                if state.physical.entities.get(entity_id).is_some() =>
            {
                Some(names.capture_observer_name(entity_id, budget)?)
            }
            _ => None,
        },
        reference_attribution: reference.map(|value| match value {
            Ok(text) => crate::records::SqlCell::from(text),
            Err(sequence) => crate::records::SqlCell::from(sequence),
        }),
        name_revision: identity.map_or(0, |identity| identity.revision),
        note_revision: note.map_or(0, |note| note.revision),
        note_characters: note.map_or(0, |note| note.text.character_count()),
        seed_only: identity.is_some_and(|identity| identity.seed_only == Some(true)),
        can_address_remembered: canonical
            .is_some_and(|id| names.can_address_remembered_subject(id)),
        named: identity.is_some_and(|identity| {
            !identity.given_name.is_empty()
                || identity
                    .nickname
                    .as_ref()
                    .is_some_and(|name| !name.is_empty())
        }),
        subject,
        _storage: storage,
    })
}
