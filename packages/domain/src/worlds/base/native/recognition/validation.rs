//! Current selected-world identity and recognition validation. Import refuses
//! unusable private records before a name or voice consumer can read them.

use super::*;
use crate::encoding::{js_trim, json_record};
use crate::received::ReceivedError;
use crate::reception::{ObserverSubject, ReceptionState};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::values::{AttributeValue, is_safe_record_id};
use crate::worlds::base_knowledge::ObserverIdentity;
use std::collections::BTreeSet;

fn invalid() -> ReceivedError {
    ReceivedError("Invalid selected observer identity or recognition.")
}
fn between(value: f64, min: f64, max: f64) -> bool {
    value.is_finite() && value >= min && value <= max
}
fn safe_integer(value: f64) -> bool {
    value.is_finite()
        && value.fract() == 0.0
        && value.abs() <= crate::identity::MAX_SAFE_INTEGER as f64
}
fn knowledge_valid(
    knowledge: &RecognitionKnowledge,
    sight: bool,
    policy: &RecognitionPolicy,
) -> bool {
    if knowledge.samples.len() as u64 > policy.retained_credits
        || knowledge
            .samples
            .iter()
            .map(|sample| sample.key.as_str())
            .collect::<BTreeSet<_>>()
            .len()
            != knowledge.samples.len()
        || knowledge.samples.iter().any(|sample| {
            !valid_received_features(&sample.features)
                || sample.key.is_empty()
                || sample.encounter.is_empty()
                || sample.policy.is_empty()
                || !valid_support_key(&sample.source_key)
                || recognition_support_sources(std::slice::from_ref(&sample.source_key)).is_empty()
                || usable(&sample.features).count() < 3
                || sample.support.is_empty()
                || sample.support.len() > 64
                || sample.support.iter().any(|key| !valid_support_key(key))
                || !sample.at.is_finite()
                || !sample.order.is_finite()
                || !between(sample.quality, 0.55, 1.0)
                || sample.quality > resolution(&sample.features)
                || !between(sample.perception, 0.0, 100.0)
        })
        || knowledge
            .last_credit_at
            .is_some_and(|at| !at.is_finite() || at < 0.0)
        || knowledge.next_credit_at.is_some_and(|at| {
            !at.is_finite() || knowledge.last_credit_at.is_none_or(|last| at < last)
        })
    {
        return false;
    }
    if let Some(authored) = &knowledge.authored {
        let familiarity = if authored.baseline == RecognitionBaseline::Familiar {
            6.0
        } else if sight {
            1.0
        } else {
            2.0
        };
        let quality =
            0.55_f64.max(0.7 - 0.2 * authored.perception / 100.0 - 0.15 * familiarity / 6.0);
        if !authored.installed_at.is_finite()
            || !between(authored.perception, 0.0, 100.0)
            || !safe_integer(authored.order)
            || authored.source.is_empty()
            || authored.exemplars.is_empty()
            || authored.exemplars.len() > 4
            || authored.exemplars.iter().any(|sample| {
                !valid_received_features(&sample.features)
                    || !sample.quality.is_finite()
                    || sample.quality < 0.0
                    || sample.quality > resolution(&sample.features)
            })
            || !authored
                .exemplars
                .iter()
                .any(|sample| usable(&sample.features).count() >= 3 && sample.quality >= quality)
        {
            return false;
        }
    }
    true
}
fn familiarity_valid(state: &FamiliarityState, now: f64, policy: &RecognitionPolicy) -> bool {
    if state.roots.len() as u64 > policy.familiarity_roots
        || state.roots.iter().filter(|root| root.required).count() > 6
        || state
            .roots
            .iter()
            .map(|root| root.key.as_str())
            .collect::<BTreeSet<_>>()
            .len()
            != state.roots.len()
        || state.fast_credits > 6
        || state
            .last_credit_at
            .is_some_and(|at| !between(at, 0.0, now))
        || state
            .next_credit_at
            .is_some_and(|at| !at.is_finite() || state.last_credit_at.is_none_or(|last| at < last))
        || state.authored.as_ref().is_some_and(|authored| {
            !valid_support_key(&authored.source)
                || !between(authored.value, 0.0, 100.0)
                || authored.value.fract() != 0.0
        })
    {
        return false;
    }
    state.roots.iter().all(|root| {
        valid_support_key(&root.source_key)
            && !recognition_support_sources(std::slice::from_ref(&root.source_key)).is_empty()
            && between(root.at, 0.0, now)
            && json_record(&("contact", &root.source_key, root.at)).is_ok_and(|key| key == root.key)
            && (!root.required || root.credited)
            && root.support.iter().any(|key| key == &root.source_key)
            && root.support.len() <= 10
            && root.support.iter().all(|key| valid_support_key(key))
    })
}
fn identity_valid(
    identity: &ObserverIdentity,
    key: &str,
    now: f64,
    installed: &InstalledWorld,
) -> bool {
    let names = installed.name_rules.value();
    let policy = installed.recognition.value();
    is_safe_record_id(key)
        && identity.individual_id.as_ref().is_none_or(|id| id == key)
        && identity
            .canonical_id
            .as_ref()
            .is_none_or(|id| is_safe_record_id(id))
        && identity
            .name_evidence_ids
            .as_ref()
            .is_none_or(|keys| keys.iter().all(|key| !key.is_empty()))
        && identity.given_name.character_count() as u64 <= names.given_name_characters
        && identity.nickname.as_ref().is_none_or(|name| {
            !name.trim_is_empty() && name.character_count() as u64 <= names.nickname_characters
        })
        && identity
            .familiarity
            .as_ref()
            .is_none_or(|state| familiarity_valid(state, now, policy))
        && identity
            .voice
            .as_ref()
            .is_none_or(|knowledge| knowledge_valid(knowledge, false, policy))
        && identity
            .sight
            .as_ref()
            .is_none_or(|knowledge| knowledge_valid(knowledge, true, policy))
}
pub(crate) fn validate_selected_identities(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
) -> Result<(), ReceivedError> {
    for id in physical.entities.ordered_ids() {
        let entity = physical.entities.get(id).ok_or_else(invalid)?;
        let Some(actor) = &entity.actor else {
            continue;
        };
        if actor
            .voice_profile
            .as_ref()
            .is_some_and(|voice| !voice.validate())
        {
            return Err(invalid());
        }
        if let Some(recognition) = &actor.individual_recognition {
            let definition = installed
                .attributes
                .get(&recognition.attribute_id)
                .ok_or_else(invalid)?;
            if !matches!(crate::status::read_attribute(entity,definition.value(),physical.pending_values.as_ref()).map_err(|_|invalid())?,
                Some(AttributeValue::Number(value)) if between(value,0.0,100.0))
            {
                return Err(invalid());
            }
        }
    }
    for (observer, identities) in reception.observer_identities.iter().flatten() {
        if physical
            .entities
            .get(observer)
            .and_then(|entity| entity.actor.as_ref())
            .is_none()
            || identities.iter().any(|(key, identity)| {
                !identity_valid(identity, key, physical.header.sim_time, installed)
            })
        {
            return Err(invalid());
        }
    }
    for (observer, episodes) in reception.perception_episodes.iter().flatten() {
        if physical
            .entities
            .get(observer)
            .and_then(|entity| entity.actor.as_ref())
            .is_none()
            || episodes
                .iter()
                .any(|(key, episode)| !is_safe_record_id(key) || episode.is_empty())
        {
            return Err(invalid());
        }
    }
    Ok(())
}
impl IndividualRecognition {
    pub(crate) fn validate(&self) -> bool {
        between(self.quality, 0.0, 1.0)
            && self.candidates.len() <= 2
            && self.candidates.iter().all(|candidate| {
                !candidate.individual_id.is_empty() && between(candidate.distance, 0.0, 1.0)
            })
            && self.subject.as_ref().is_none_or(ObserverSubject::validate)
            && self
                .learned_subject
                .as_ref()
                .is_none_or(ObserverSubject::validate)
            && (!self.recognized || self.subject.is_some())
            && self
                .perception
                .is_none_or(|value| between(value, 0.0, 100.0))
            && self.learning_support.as_ref().is_none_or(|keys| {
                keys.len() <= 62 && keys.iter().all(|key| valid_support_key(key))
            })
            && self
                .familiarity
                .is_none_or(|value| between(value, 0.0, 100.0) && value.fract() == 0.0)
    }
}
