//! Immutable personally received cognition cuts. Availability/physical loss can
//! change later; only explicit source revocation/correction, receiving-life
//! replacement or world-generation replacement fences the already captured cut.

use super::{ActorPrivacy, ExperienceError, ExperienceState, personal_fact_alias};
use crate::events::OccurrenceHistory;
use crate::received::TemporalValueMeaning;
use crate::reception::{
    CapturedCurrentFacet, EvidenceSource, ObservationContribution, ObservationFactKey,
    ObservationOrigin, ObserverLife, ReceivedFacetProof, SensoryFacet,
};
use crate::state::EntityStore;
use indexmap::IndexMap;
use serde::Serialize;
use std::sync::Arc;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceCut {
    pub observer: ObserverLife,
    pub privacy_revision: u64,
    pub at: f64,
    pub last_included_order: u64,
    pub acquired: Vec<Arc<ObservationContribution>>,
    pub current: Vec<Arc<CapturedCurrentFacet>>,
}

/// The native owner also binds the saved-world replacement generation. This
/// operational fence is kept outside the existing personally permitted DTO.
#[derive(Debug)]
pub struct CapturedEvidenceCut {
    generation: String,
    cut: EvidenceCut,
}

impl CapturedEvidenceCut {
    pub fn generation(&self) -> &str {
        &self.generation
    }
    pub fn cut(&self) -> &EvidenceCut {
        &self.cut
    }
}

pub fn capture_evidence_cut(
    experience: &ExperienceState,
    entities: &EntityStore,
    occurrences: &OccurrenceHistory,
    observer_id: &str,
    at: f64,
    acquired: &[Arc<ObservationContribution>],
    current: &[Arc<CapturedCurrentFacet>],
) -> Result<CapturedEvidenceCut, ExperienceError> {
    let actor = entities
        .get(observer_id)
        .and_then(|entity| entity.actor.as_ref())
        .ok_or(ExperienceError::ForeignOwner)?;
    let observer = ObserverLife {
        actor_id: observer_id.to_owned(),
        physical_life: actor.physical_life.unwrap_or(0),
    };
    let mut unique = IndexMap::new();
    for contribution in acquired {
        if contribution.observer == observer {
            unique.insert(
                format!("{}:{}", contribution.id, contribution.revision),
                Arc::clone(contribution),
            );
        }
    }
    let mut last_included_order = occurrences.last_hot_order();
    for observation in unique.values() {
        if let ObservationOrigin::Occurrence { order, .. } = observation.origin {
            last_included_order = last_included_order.max(order);
        }
    }
    Ok(CapturedEvidenceCut {
        generation: experience.generation().to_owned(),
        cut: EvidenceCut {
            observer: observer.clone(),
            privacy_revision: experience
                .actor(observer_id)
                .map_or(0, |actor| actor.privacy.revision()),
            at,
            last_included_order,
            acquired: unique.into_values().collect(),
            current: current
                .iter()
                .filter(|fact| fact.observer == observer)
                .cloned()
                .collect(),
        },
    })
}

fn unrevoked(privacy: Option<&ActorPrivacy>, id: &str) -> bool {
    privacy.is_none_or(|privacy| !privacy.revoked(id))
}

fn fact_unrevoked(privacy: Option<&ActorPrivacy>, fact: &ObservationFactKey) -> bool {
    unrevoked(privacy, &fact.source.id)
        && personal_fact_alias(&fact.source.id, fact.ordinal)
            .is_ok_and(|alias| unrevoked(privacy, &alias))
}

fn source_fact_unrevoked(
    privacy: Option<&ActorPrivacy>,
    source: &EvidenceSource,
    ordinal: u64,
) -> bool {
    unrevoked(privacy, &source.id)
        && personal_fact_alias(&source.id, ordinal).is_ok_and(|alias| unrevoked(privacy, &alias))
}

fn proof_dependencies_unrevoked(
    privacy: Option<&ActorPrivacy>,
    proof: &ReceivedFacetProof,
) -> bool {
    fact_unrevoked(privacy, &proof.original)
        && source_fact_unrevoked(privacy, &proof.confirmation, proof.original.ordinal)
        && proof
            .aliases
            .iter()
            .flatten()
            .all(|id| unrevoked(privacy, id))
}

/// This is the exact dependency interpretation of sensoryFacetDependencies.
/// Confirmation's matching logical ordinal matters independently of its source.
fn facet_dependencies_unrevoked(
    privacy: Option<&ActorPrivacy>,
    value: &SensoryFacet,
    support: Option<&ReceivedFacetProof>,
) -> bool {
    if support.is_some_and(|proof| !proof_dependencies_unrevoked(privacy, proof)) {
        return false;
    }
    match value {
        SensoryFacet::Claim {
            support,
            support_aliases,
            ..
        } => support.iter().all(|key| {
            fact_unrevoked(privacy, key)
                && support_aliases
                    .iter()
                    .flatten()
                    .all(|alias| unrevoked(privacy, &alias.id))
        }),
        SensoryFacet::PhysicalBoundary { boundary } => [
            &boundary.near_surface.support,
            &boundary.far_surface.support,
        ]
        .into_iter()
        .all(|key| fact_unrevoked(privacy, key)),
        SensoryFacet::ObservedMotion { earlier, later, .. } => {
            [earlier, later].into_iter().all(|sample| {
                fact_unrevoked(privacy, &sample.original)
                    && source_fact_unrevoked(privacy, &sample.confirmation, sample.original.ordinal)
                    && sample
                        .aliases
                        .iter()
                        .flatten()
                        .all(|id| unrevoked(privacy, id))
            })
        }
        _ => true,
    }
}

fn association_unrevoked(
    privacy: Option<&ActorPrivacy>,
    value: &SensoryFacet,
    original_id: &str,
    ordinal: u64,
    meaning: &dyn TemporalValueMeaning,
) -> bool {
    let SensoryFacet::Association {
        learning_support, ..
    } = value
    else {
        return true;
    };
    let keys = learning_support.as_deref().unwrap_or(&[]);
    keys.iter().all(|key| unrevoked(privacy, key))
        && meaning
            .recognition_support_source_ids(keys)
            .is_ok_and(|ids| ids.iter().all(|id| unrevoked(privacy, id)))
        && personal_fact_alias(original_id, ordinal).is_ok_and(|alias| unrevoked(privacy, &alias))
}

pub fn evidence_cut_eligible(
    experience: &ExperienceState,
    entities: &EntityStore,
    captured: &CapturedEvidenceCut,
    meaning: &dyn TemporalValueMeaning,
) -> bool {
    if experience.generation() != captured.generation {
        return false;
    }
    let cut = &captured.cut;
    let privacy = experience
        .actor(&cut.observer.actor_id)
        .map(|actor| &actor.privacy);
    if privacy.map_or(0, ActorPrivacy::revision) != cut.privacy_revision {
        return false;
    }
    let Some(actor) = entities
        .get(&cut.observer.actor_id)
        .and_then(|entity| entity.actor.as_ref())
    else {
        return false;
    };
    if actor.physical_life.unwrap_or(0) != cut.observer.physical_life {
        return false;
    }
    for observation in &cut.acquired {
        if !unrevoked(privacy, &observation.id) {
            return false;
        }
        match &observation.origin {
            ObservationOrigin::Occurrence { event_id, .. } if !unrevoked(privacy, event_id) => {
                return false;
            }
            ObservationOrigin::Exposure {
                source: Some(source),
                ..
            } if !unrevoked(privacy, &source.id) => return false,
            _ => {}
        }
        if observation.facets.iter().any(|facet|!facet_dependencies_unrevoked(privacy,&facet.value,facet.support.as_ref())||!association_unrevoked(privacy,&facet.value,&observation.id,facet.ordinal,meaning)||matches!(&facet.value,SensoryFacet::Claim {support_aliases,..} if support_aliases.iter().flatten().any(|alias|!unrevoked(privacy,&alias.id)))) {return false;}
    }
    cut.current.iter().all(|facet| {
        if !fact_unrevoked(privacy, &facet.original)
            || !unrevoked(privacy, &facet.confirmation.id)
            || facet
                .original_aliases
                .iter()
                .flatten()
                .any(|id| !unrevoked(privacy, id))
        {
            return false;
        }
        if facet.pose_support.as_ref().is_some_and(|support| {
            !fact_unrevoked(privacy, &support.original)
                || !unrevoked(privacy, &support.confirmation.id)
                || support
                    .aliases
                    .iter()
                    .flatten()
                    .any(|id| !unrevoked(privacy, id))
        }) || facet.description_support.as_ref().is_some_and(|support| {
            !fact_unrevoked(privacy, &support.original)
                || !unrevoked(privacy, &support.confirmation.id)
                || support
                    .aliases
                    .iter()
                    .flatten()
                    .any(|id| !unrevoked(privacy, id))
        }) {
            return false;
        }
        association_unrevoked(
            privacy,
            &facet.value,
            &facet.original.source.id,
            facet.original.ordinal,
            meaning,
        ) && facet_dependencies_unrevoked(privacy, &facet.value, None)
    })
}
