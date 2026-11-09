//! Complete private notepads have one typed mutation/custody owner. References
//! are supplied permissions, not discovered by reading hidden physical names.
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{KnowledgeDocument, KnowledgeOrigin, KnowledgeSubject};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize, Serializer};
use std::mem::size_of;

mod state;
pub(crate) use state::{KnowledgeCheckpoint, KnowledgeJournal, KnowledgeState};
mod edit;
mod save;
mod revoke;
pub(crate) use revoke::revoke_knowledge_documents;
pub(crate) use edit::{CompletedKnowledgeEdit, KnowledgeEdit, edit_knowledge};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct KnowledgePolicy {
    pub policy: KnowledgeFamily,
    pub max_characters: CharacterLimits,
}
#[derive(Debug, Deserialize)]
pub(crate) enum KnowledgeFamily {
    #[serde(rename = "editable-notepads")]
    EditableNotepads,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CharacterLimits {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub general: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    pub subject: u64,
}

pub(crate) fn knowledge_key(subject: Option<&KnowledgeSubject>) -> Result<String, ExecutionError> {
    match subject {
        None => Ok("general".into()),
        Some(KnowledgeSubject::Place { place_id }) => Ok(format!("place:{place_id}")),
        Some(KnowledgeSubject::MapMarker { marker_id }) => Ok(format!("map-marker:{marker_id}")),
        Some(KnowledgeSubject::Entity { entity_id }) => {
            crate::encoding::json_record(&("entity", entity_id))
                .map(|key| format!("subject:{key}"))
                .map_err(|_| ExecutionError::Invariant)
        }
        Some(KnowledgeSubject::Individual { individual_id }) => {
            crate::encoding::json_record(&("individual", individual_id))
                .map(|key| format!("subject:{key}"))
                .map_err(|_| ExecutionError::Invariant)
        }
    }
}
impl HeapBytes for KnowledgeSubject {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Entity { entity_id } => entity_id.heap_bytes(),
            Self::Individual { individual_id } => individual_id.heap_bytes(),
            Self::Place { place_id } => place_id.heap_bytes(),
            Self::MapMarker { marker_id } => marker_id.heap_bytes(),
        }
    }
}
impl HeapBytes for KnowledgeDocument {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.subject_id.heap_bytes()?,
            self.text.heap_bytes()?,
            self.evidence_ids.heap_bytes()?,
        ])
    }
}
