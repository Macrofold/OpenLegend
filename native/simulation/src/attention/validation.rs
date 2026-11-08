//! Current-format attention continuation integrity. Parsing numeric shapes is
//! separate from binding the selection/proofs to its actual receiving life.

use super::*;
use crate::received::ReceivedError;
use crate::reception::ObserverLife;
use std::collections::BTreeSet;

pub fn attention_subject_key(
    source_id: &str,
    exposure: &ObservationExposure,
) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&(
        &exposure.observer.actor_id,
        exposure.observer.physical_life,
        &exposure.track,
        source_id,
    ))
    .map_err(|_| ReceivedError("Attention subject identity encoding failed."))
}

fn relation_key(anchor: &str, family: AttentionRelationFamily) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&(anchor, family))
        .map_err(|_| ReceivedError("Attention relation identity encoding failed."))
}

fn nonnegative(value: f64) -> bool {
    value.is_finite() && value >= 0.0
}
fn valid_exposure(exposure: &ObservationExposure, observer: &ObserverLife) -> bool {
    exposure.validate().is_ok() && &exposure.observer == observer
}
fn valid_proof(proof: Option<&[ObservationFactKey]>, observer: &ObserverLife) -> bool {
    proof.is_none_or(|proof| {
        !proof.is_empty()
            && proof.len() <= 8
            && proof.iter().all(|fact| {
                fact.ordinal <= crate::identity::MAX_SAFE_INTEGER
                    && fact.source.validate().is_ok()
                    && &fact.source.observer == observer
            })
    })
}

impl AttentionState {
    pub fn validate(
        &self,
        policy: &AttentionPolicy,
        observer: &ObserverLife,
    ) -> Result<(), ReceivedError> {
        if self.policy.is_empty()
            || self.entries.len() as f64 > policy.maximum_capacity
            || self.explicit.len() as f64 > policy.maximum_capacity
            || self.explicit.iter().collect::<BTreeSet<_>>().len() != self.explicit.len()
            || !nonnegative(self.next_relation_at)
        {
            return Err(ReceivedError("Invalid attention continuation."));
        }
        for (key, candidate) in &self.annotations {
            let anchor = candidate.anchor.as_ref().is_none_or(|anchor| {
                anchor.point.position().x.is_finite()
                    && anchor.point.position().y.is_finite()
                    && anchor.point.position().z.is_finite()
                    && nonnegative(anchor.error_radius)
                    && nonnegative(anchor.at)
            });
            if candidate.source_id.is_empty()
                || candidate.lease_id.is_empty()
                || !valid_exposure(&candidate.exposure, observer)
                || key != &attention_subject_key(&candidate.source_id, &candidate.exposure)?
                || candidate.order >= self.next_order
                || !nonnegative(candidate.acquired_at)
                || !candidate.urgency.is_finite()
                || !(0.0..=10.0).contains(&candidate.urgency)
                || (candidate.urgency > 0.0 && candidate.urgency_through.is_none())
                || candidate
                    .urgency_through
                    .is_some_and(|through| !nonnegative(through))
                || candidate
                    .direct_through
                    .is_some_and(|through| !nonnegative(through))
                || !anchor
            {
                return Err(ReceivedError("Invalid attention candidate."));
            }
            for fact in [&candidate.urgency_source, &candidate.direct_source]
                .into_iter()
                .flatten()
            {
                if fact.ordinal > crate::identity::MAX_SAFE_INTEGER
                    || fact.source.validate().is_err()
                    || fact.source.observer != candidate.exposure.observer
                {
                    return Err(ReceivedError("Invalid received attention cue."));
                }
            }
        }
        let mut keys = BTreeSet::new();
        for entry in &self.entries {
            let Some(candidate) = self.annotations.get(&entry.key) else {
                return Err(ReceivedError("Invalid selected attention."));
            };
            if !keys.insert(&entry.key)
                || entry.source_id != candidate.source_id
                || entry.lease_id != candidate.lease_id
                || !valid_exposure(&entry.exposure, observer)
                || attention_subject_key(&entry.source_id, &entry.exposure)? != entry.key
                || entry.description_revision.is_empty()
                || entry.change_revision.is_empty()
                || !nonnegative(entry.started_at)
                || !entry.stable_until.is_finite()
                || entry.stable_until < entry.started_at
                || entry
                    .subject
                    .as_ref()
                    .is_some_and(|subject| !subject.validate())
            {
                return Err(ReceivedError("Invalid selected attention."));
            }
        }
        if self
            .explicit
            .iter()
            .any(|key| !self.annotations.contains_key(key))
        {
            return Err(ReceivedError("Invalid selected attention."));
        }
        for (key, latch) in &self.latches {
            if (latch.anchor_key != SELF_RELATION_KEY
                && !self.annotations.contains_key(&latch.anchor_key))
                || key != &relation_key(&latch.anchor_key, latch.family)?
                || latch.clear_since.is_some_and(|time| !nonnegative(time))
                || latch.entered_at.is_some_and(|time| !nonnegative(time))
                || latch.witness_id.as_ref().is_some_and(String::is_empty)
                || (latch.active
                    && (latch.entry_proof.is_none()
                        || latch.entered_at.is_none()
                        || latch.witness_id.is_none()))
                || !valid_proof(latch.entry_proof.as_deref(), observer)
                || !valid_proof(latch.newest_proof.as_deref(), observer)
            {
                return Err(ReceivedError(
                    "Invalid attention relation latch or receiving life.",
                ));
            }
        }
        let valid_key = |key: &str| {
            serde_json::from_str::<(String, AttentionRelationFamily)>(key)
                .ok()
                .is_some_and(|(anchor, _)| {
                    anchor == SELF_RELATION_KEY || self.annotations.contains_key(&anchor)
                })
        };
        for (key, revision) in &self.relation_dirty {
            if !valid_key(key) || *revision > self.relation_revision {
                return Err(ReceivedError("Invalid attention relation continuation."));
            }
        }
        for key in self.relation_scans.keys() {
            if !valid_key(key) {
                return Err(ReceivedError("Invalid attention relation scan."));
            }
        }
        Ok(())
    }
}
