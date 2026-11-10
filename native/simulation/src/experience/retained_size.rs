//! Allocation ownership of an actual newly received personal account. Shared
//! originals are counted conservatively here; their guard also remains owned
//! until admission transfers or releases the account, never its encoded length.

use super::*;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::reception::ObservationContribution;
use std::mem::{align_of, size_of};

heap_record!(TemporalReceiptLocator { actor_id, epoch });
heap_record!(AwarenessSourceBody {
    entity_id,
    lease_id
});
heap_record!(FeatureFamily { id });
heap_record!(AwarenessReceivedFeatures { family, features });
heap_record!(ExperienceRetention { receipt });
heap_record!(AssociationPrivacyFact {
    observation_id,
    learning_sources
});
heap_record!(PersonalPrivacyHeader {
    primary_observation,
    direct_observations,
    learning_observations,
    learning_sources,
    associations
});
impl HeapBytes for PersonalImpressionHeader {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
heap_record!(PersonalSourceHeader {
    reference,
    summary_coverage,
    actor_id,
    event_id,
    event_type,
    evidence_source_id,
    evidence_target_id,
    activity_id,
    source_receipt,
    record_kind,
    source,
    retention,
    impression,
    obligation_evidence_id,
    completion_event_type,
    owned_observations,
    dependencies,
    privacy_dependencies,
    privacy
});

fn original_bytes(original: &Arc<ObservationContribution>) -> Option<usize> {
    heap_sum([
        size_of::<ObservationContribution>(),
        2 * size_of::<usize>() + align_of::<ObservationContribution>() - 1,
        original.as_ref().heap_bytes()?,
    ])
}
impl HeapBytes for Awareness {
    fn heap_bytes(&self) -> Option<usize> {
        let originals = self.observations.as_ref().map_or(Some(0), |values| {
            values.iter().try_fold(
                values
                    .capacity()
                    .checked_mul(size_of::<Arc<ObservationContribution>>())?,
                |bytes, original| bytes.checked_add(original_bytes(original)?),
            )
        })?;
        heap_sum([
            self.exposure.heap_bytes()?,
            self.event_id.heap_bytes()?,
            self.actor_id.heap_bytes()?,
            self.text.heap_bytes()?,
            self.entity_episodes.heap_bytes()?,
            self.entity_ids.heap_bytes()?,
            self.event_type.heap_bytes()?,
            self.event_data.heap_bytes()?,
            self.references.heap_bytes()?,
            self.source_id.heap_bytes()?,
            self.target_id.heap_bytes()?,
            self.retention.heap_bytes()?,
            self.content.heap_bytes()?,
            self.observation.as_ref().map_or(Some(0), original_bytes)?,
            originals,
            self.source_subject.heap_bytes()?,
            self.source_body.heap_bytes()?,
            self.recognition.heap_bytes()?,
            self.received_features.heap_bytes()?,
            self.speech.heap_bytes()?,
            self.sound.heap_bytes()?,
            self.source_receipt.heap_bytes()?,
        ])
    }
}
