//! Per-apply copies reuse the original admitted allocation bounds. IndexMap's
//! normal Clone can round its dense entries up to the hidden hash capacity.
use crate::commands::PurposeBinding;
use crate::records::SqlCell;
use crate::response::{ResponseActionChoice, ResponseSituation};
use indexmap::IndexMap;

pub(super) fn map<V>(
    source: &IndexMap<String, V>,
    mut copy: impl FnMut(&V) -> V,
) -> IndexMap<String, V> {
    let mut result = IndexMap::with_capacity(source.capacity());
    for (key, value) in source {
        result.insert(key.clone(), copy(value));
    }
    result
}

pub(super) fn action(source: &ResponseActionChoice) -> ResponseActionChoice {
    ResponseActionChoice {
        invocation: source
            .invocation
            .as_ref()
            .map(SqlCell::clone_within_heap_bound),
        purpose: source.purpose.as_ref().map(|purpose| PurposeBinding {
            definition: purpose.definition.clone(),
            id: purpose.id.clone(),
            description: purpose.description.clone(),
            roles: map(&purpose.roles, Clone::clone),
            source_ids: purpose.source_ids.clone(),
        }),
        transition: source.transition,
        expected_work: source.expected_work.clone(),
    }
}

pub(super) fn situation(source: &ResponseSituation) -> ResponseSituation {
    ResponseSituation {
        privacy_revision: source.privacy_revision,
        attention_references: map(&source.attention_references, Clone::clone),
        retention_references: map(&source.retention_references, Clone::clone),
        receipt_details: map(&source.receipt_details, Clone::clone),
        observation_references: map(&source.observation_references, Clone::clone),
        current_references: map(&source.current_references, Clone::clone),
        presented: source.presented.clone(),
        semantic_causes: source.semantic_causes.clone(),
    }
}
