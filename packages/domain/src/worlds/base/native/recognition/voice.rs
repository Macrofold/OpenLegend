//! Actual direct-path voice learning. Prior matching, learning, contact credit
//! and sparse-proof retention remain separate source decisions.

use super::journal::property_order;
use super::*;
use crate::encoding::{json_record, json_record_len};
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{ExperienceState, FeatureFamily};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRanks, CollationRequest};
use crate::received::{ReceivedError, TemporalState};
use crate::reception::ReceivingMutation;
use crate::reception::{
    CurrentBodyReadScope, ObservationFactKey, ObserverLife, ObserverSubject, OwnedCurrentFacet,
    ReceptionState, SightResults,
};
use crate::simulation::{InstalledWorld, PhysicalState};
use crate::values::AttributeValue;
use crate::worlds::base_knowledge::ObserverIdentity;
use crate::worlds::base_knowledge::allocate_individual;
use std::mem::size_of;

fn invalid() -> ReceivedError {
    ReceivedError("Actual received voice recognition is unavailable or changed.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Actual received voice exceeds native byte allowance.")
}
fn collation<T>(value: Result<T, crate::language::CollationError>) -> Result<T, ReceivedError> {
    value.map_err(|_| invalid())
}

struct VoiceEvent {
    id: String,
    at: f64,
    order: u64,
    target_id: Option<String>,
}
pub(crate) struct VoiceReceptionPreparation {
    observer: ObserverLife,
    event: VoiceEvent,
    visible_source: Option<String>,
    body: Option<OwnedCurrentFacet>,
    features: IndexMap<String, RecognitionInterval>,
    quality: f64,
    comparisons: CollationRequest,
    reservation: ByteReservation,
}
pub(crate) struct VoiceReception {
    family: FeatureFamily,
    features: IndexMap<String, RecognitionInterval>,
    recognition: IndividualRecognition,
    reservation: ByteReservation,
}
pub(crate) struct VoiceReceptionParts {
    pub family: FeatureFamily,
    pub features: IndexMap<String, RecognitionInterval>,
    pub recognition: IndividualRecognition,
    pub reservation: ByteReservation,
}
impl VoiceReception {
    pub(crate) fn recognition(&self) -> &IndividualRecognition {
        &self.recognition
    }
    pub(crate) fn into_parts(self) -> VoiceReceptionParts {
        VoiceReceptionParts {
            family: self.family,
            features: self.features,
            recognition: self.recognition,
            reservation: self.reservation,
        }
    }
}
impl VoiceReceptionPreparation {
    pub(crate) fn prepare(
        physical: &PhysicalState,
        reception: &ReceptionState,
        installed: &InstalledWorld,
        experience: &ExperienceState,
        observer_id: &str,
        source_id: &str,
        event: &WorldEvent,
        clarity_margin_db: f64,
        visible: Option<&SightResults>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ReceivedError> {
        let observer = physical.entities.get(observer_id).ok_or_else(invalid)?;
        let Some(actor) = observer.actor.as_ref().filter(|_| observer.has_memory()) else {
            return Ok(None);
        };
        let Some(_) = &actor.individual_recognition else {
            return Ok(None);
        };
        let Some(profile) = physical
            .entities
            .get(source_id)
            .and_then(|source| source.actor.as_ref())
            .and_then(|source| source.voice_profile.as_ref())
        else {
            return Ok(None);
        };
        if !clarity_margin_db.is_finite() {
            return Err(invalid());
        }
        let body = if let Some(sight) = visible {
            let physical_binding = sight.binding();
            // Sight belongs to the contact phase; collation has its own unique
            // provider serial. Both must still refer to this exact candidate cut.
            if (
                physical_binding.candidate_id,
                physical_binding.base_cut,
                physical_binding.generation,
                physical_binding.geometry_revision,
            ) != (
                binding.candidate_id,
                binding.base_cut,
                binding.generation,
                binding.geometry_revision,
            ) || sight.observer().actor_id != observer_id
                || sight.observer().physical_life != actor.physical_life.unwrap_or(0)
            {
                return Err(invalid());
            }
            if sight.seen(source_id) == Some(true) {
                match CurrentBodyReadScope::prepare(
                    reception,
                    &physical.entities,
                    installed,
                    experience,
                    &WildernessEvidenceMeaning,
                    observer_id,
                )? {
                    Some(scope) => scope.capture(source_id, "body", budget)?,
                    None => None,
                }
            } else {
                None
            }
        } else {
            None
        };
        let records = reception
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer_id));
        let heap = records
            .map_or(Some(0), HeapBytes::heap_bytes)
            .ok_or_else(capacity)?;
        let contact_storage = records
            .into_iter()
            .flat_map(IndexMap::values)
            .flat_map(|identity| identity.voice.iter().flat_map(|voice| &voice.samples))
            .try_fold(0usize, |bytes, sample| {
                heap_sum([
                    bytes,
                    size_of::<String>(),
                    json_record_len(&("contact", &sample.source_key, sample.at)).ok()?,
                ])
            })
            .ok_or_else(capacity)?;
        let policy = installed.recognition.value();
        let definition = installed
            .attributes
            .get(
                &actor
                    .individual_recognition
                    .as_ref()
                    .ok_or_else(invalid)?
                    .attribute_id,
            )
            .ok_or_else(invalid)?;
        let policy_bytes = json_record_len(&(&policy.id, policy.version, definition.pin()))
            .map_err(|_| invalid())?;
        let proof_bytes = body
            .as_ref()
            .map(|body| crate::reception::original_fact_json_len(&body.facet().original))
            .transpose()
            .map_err(|_| invalid())?
            .unwrap_or(0);
        let sample_strings = heap_sum([
            json_record_len(&("voice", &event.id)).map_err(|_| invalid())?,
            "awareness:".len() + event.id.len(),
            "utterance:".len() + event.id.len(),
            body.as_ref()
                .and_then(|_| {
                    reception
                        .perception_episodes
                        .as_ref()
                        .and_then(|root| root.get(observer_id))
                        .and_then(|episodes| episodes.get(source_id))
                })
                .map_or(0, String::len),
            policy_bytes,
            proof_bytes,
            map_storage::<String, RecognitionInterval>(4).ok_or_else(capacity)?,
            "pitchRange".len() + "resonance".len() + "texture".len() + "rhythm".len(),
            2 * size_of::<String>(),
        ])
        .ok_or_else(capacity)?;
        // Matching borrows every prior exemplar. Reserve the actual prior field
        // bound for changed identity copies and finite scratch before any clone.
        let allowance = heap_sum([
            size_of::<Self>() + size_of::<VoiceReception>(),
            // Six overlapping owned records bound the source's candidate,
            // sample-retention and familiarity replacement stages. Dictionary
            // bodies are otherwise borrowed; scratch is finite before cloning.
            heap.checked_mul(6).ok_or_else(capacity)?,
            sample_strings.checked_mul(6).ok_or_else(capacity)?,
            contact_storage,
            event.id.len(),
            observer_id.len(),
            source_id.len(),
            event.target_id.as_ref().map_or(0, String::len),
            policy.voice_feature_family.id.len(),
            size_of::<VoiceEvent>()
                + size_of::<RecognitionSample>() * 6
                + size_of::<ObserverIdentity>() * 2,
            records
                .map_or(0, IndexMap::len)
                .checked_mul(size_of::<Match>() * 4 + size_of::<Exemplar<'_>>() * 4)
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        let reservation = budget.reserve(allowance).map_err(|_| capacity())?;
        let observer_life = ObserverLife {
            actor_id: observer_id.to_owned(),
            physical_life: actor.physical_life.unwrap_or(0),
        };
        let sample_key = json_record(&("voice", &event.id)).map_err(|_| invalid())?;
        let source_key = format!("awareness:{}", event.id);
        let contact_key =
            json_record(&("contact", &source_key, event.at)).map_err(|_| invalid())?;
        let prior_contacts: Vec<String> = records
            .into_iter()
            .flat_map(IndexMap::values)
            .flat_map(|identity| identity.voice.iter().flat_map(|voice| &voice.samples))
            .map(|sample| {
                json_record(&("contact", &sample.source_key, sample.at)).map_err(|_| invalid())
            })
            .collect::<Result<_, _>>()?;
        let keys = records
            .into_iter()
            .flat_map(|records| records.iter())
            .flat_map(|(key, identity)| {
                std::iter::once(identity.individual_id.as_deref().unwrap_or(key))
                    .chain(identity.voice.iter().flat_map(|voice| {
                        voice
                            .samples
                            .iter()
                            .map(|sample| sample.key.as_str())
                            .chain(
                                voice
                                    .authored
                                    .iter()
                                    .map(|authored| authored.source.as_str()),
                            )
                    }))
                    .chain(
                        identity
                            .familiarity
                            .iter()
                            .flat_map(|state| state.roots.iter().map(|root| root.key.as_str())),
                    )
            })
            .chain([sample_key.as_str(), contact_key.as_str()])
            .chain(prior_contacts.iter().map(String::as_str));
        let comparisons = collation(CollationRequest::prepare(binding, keys, budget))?;
        Ok(Some(Self {
            observer: observer_life,
            event: VoiceEvent {
                id: event.id.clone(),
                at: event.at,
                order: event.order.unwrap_or(event.sequence),
                target_id: event.target_id.clone(),
            },
            visible_source: body.as_ref().map(|_| source_id.to_owned()),
            body,
            features: profile.received_features(),
            quality: ((clarity_margin_db - 3.0) / 12.0).clamp(0.0, 1.0),
            comparisons,
            reservation,
        }))
    }
    pub(crate) fn comparisons(&self) -> &CollationRequest {
        &self.comparisons
    }
    pub(crate) fn finish(
        self,
        core: &mut CoreMutation<'_>,
        answer: &CollationAnswer,
        budget: &ByteBudget,
    ) -> Result<VoiceReception, ExecutionError> {
        if core
            .state
            .physical
            .entities
            .get(&self.observer.actor_id)
            .and_then(|observer| observer.physical_life())
            != Some(self.observer.physical_life)
        {
            return Err(invalid().into());
        }
        let ranks = collation(self.comparisons.finish(answer))?;
        let mut receiving = ReceivingMutation {
            experience: &core.state.experience,
            cognition: &mut core.journal.cognition,
            current: &mut core.journal.current,
            acquisitions: &mut core.journal.acquisitions,
            meters: &mut core.journal.meters,
            budget,
        };
        let recognition = perceive_voice(
            &mut core.state.physical,
            &mut core.state.reception,
            &core.state.installed,
            &mut core.state.temporal,
            &mut core.journal.recognition,
            &mut receiving,
            &self.observer.actor_id,
            &self.event,
            &self.features,
            self.quality,
            self.visible_source.as_deref(),
            self.body.as_ref().map(|body| &body.facet().original),
            &ranks,
        )?;
        let family = core
            .state
            .installed
            .recognition
            .value()
            .voice_feature_family
            .clone();
        // Free operation-local names and retained body before returning their
        // scratch allowance. The detached result keeps its own actual fields.
        drop(self.observer);
        drop(self.event);
        drop(self.visible_source);
        drop(self.body);
        let mut reservation = self.reservation;
        reservation
            .resize(
                heap_sum([
                    size_of::<VoiceReception>(),
                    self.features.heap_bytes().ok_or_else(capacity)?,
                    family.id.capacity(),
                    recognition.heap_bytes().ok_or_else(capacity)?,
                ])
                .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        Ok(VoiceReception {
            family,
            features: self.features,
            recognition,
            reservation,
        })
    }
}

pub(crate) fn individual_familiarity(identity: &ObserverIdentity) -> f64 {
    let state = identity.familiarity.as_ref();
    let credited = state.map_or(0, |state| {
        state.roots.iter().filter(|root| root.credited).count()
    }) as f64;
    100.0_f64.min(
        state
            .and_then(|state| state.authored.as_ref())
            .map_or(0.0, |authored| authored.value)
            .max(credited),
    )
}
fn initial_quality(perception: f64) -> f64 {
    0.55_f64.max(0.7 - 0.2 * perception / 100.0 - 0.15 * (2.0 / 6.0))
}
#[derive(Clone, Copy)]
struct Exemplar<'a> {
    features: &'a IndexMap<String, RecognitionInterval>,
    quality: f64,
    at: f64,
    order: f64,
    key: &'a str,
    source_key: &'a str,
    authored: bool,
    rank: u32,
}
fn exemplars<'a>(
    voice: &'a RecognitionKnowledge,
    policy: &RecognitionPolicy,
    ranks: &CollationRanks,
) -> Result<Vec<Exemplar<'a>>, ReceivedError> {
    let mut pool = Vec::new();
    if let Some(authored) = &voice.authored {
        for sample in &authored.exemplars {
            pool.push(Exemplar {
                features: &sample.features,
                quality: sample.quality,
                at: authored.installed_at,
                order: sample.ordinal,
                key: &authored.source,
                source_key: &authored.source,
                authored: true,
                rank: collation(ranks.rank(&authored.source))?,
            });
        }
    }
    for sample in &voice.samples {
        pool.push(Exemplar {
            features: &sample.features,
            quality: sample.quality,
            at: sample.at,
            order: sample.order,
            key: &sample.key,
            source_key: &sample.source_key,
            authored: false,
            rank: collation(ranks.rank(&sample.key))?,
        });
    }
    let mut selected = Vec::new();
    let mut covered: IndexSet<&str> = IndexSet::new();
    while !pool.is_empty() && (selected.len() as u64) < policy.matching_exemplars {
        let added = |sample: &Exemplar<'_>| {
            usable(sample.features)
                .filter(|(dimension, _)| !covered.contains(dimension.as_str()))
                .count()
        };
        pool.sort_by(|a, b| {
            added(b)
                .cmp(&added(a))
                .then_with(|| b.quality.total_cmp(&a.quality))
                .then_with(|| usable(b.features).count().cmp(&usable(a.features).count()))
                .then_with(|| a.at.total_cmp(&b.at))
                .then_with(|| b.authored.cmp(&a.authored))
                .then_with(|| a.order.total_cmp(&b.order))
                .then_with(|| a.rank.cmp(&b.rank))
        });
        let sample = pool.remove(0);
        for (dimension, _) in usable(sample.features) {
            covered.insert(dimension);
        }
        selected.push(sample);
    }
    Ok(selected)
}
fn compare(current: &RecognitionSample, remembered: Exemplar<'_>) -> (f64, usize, f64) {
    let mut distance = 0.0;
    let mut a_resolution = 0.0;
    let mut b_resolution = 0.0;
    let mut count = 0usize;
    for (dimension, a) in usable(&current.features) {
        let Some(b) = remembered
            .features
            .get(dimension)
            .filter(|b| b.max - b.min <= 400.0)
        else {
            continue;
        };
        distance += ((a.min + a.max - b.min - b.max) / 2.0).abs() / 1000.0;
        a_resolution += 1.0 - (a.max - a.min) / 1000.0;
        b_resolution += 1.0 - (b.max - b.min) / 1000.0;
        count += 1;
    }
    if count == 0 {
        (f64::INFINITY, 0, 0.0)
    } else {
        (
            distance / count as f64,
            count,
            current
                .quality
                .min(remembered.quality)
                .min(a_resolution / count as f64)
                .min(b_resolution / count as f64),
        )
    }
}
struct Match {
    key: String,
    individual_id: String,
    distance: f64,
    quality: f64,
    exemplar_key: String,
    source_key: String,
    rank: u32,
}
fn match_rank(a: &Match, b: &Match) -> std::cmp::Ordering {
    a.distance
        .total_cmp(&b.distance)
        .then_with(|| b.quality.total_cmp(&a.quality))
        .then_with(|| a.rank.cmp(&b.rank))
}
fn local_subject(identity: &ObserverIdentity) -> Result<ObserverSubject, ReceivedError> {
    Ok(ObserverSubject::Individual {
        individual_id: identity.individual_id.clone().ok_or_else(invalid)?,
    })
}
fn identity<'a>(
    state: &'a ReceptionState,
    observer: &str,
    key: &str,
) -> Result<&'a ObserverIdentity, ReceivedError> {
    state
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .and_then(|records| records.get(key))
        .ok_or_else(invalid)
}
fn blank_identity(
    individual_id: Option<String>,
    seed_only: Option<bool>,
    encounter_id: Option<String>,
    revision: u64,
) -> ObserverIdentity {
    ObserverIdentity {
        retained: None,
        familiarity: None,
        individual_id,
        canonical_id: None,
        seed_only,
        voice: None,
        sight: None,
        name_evidence_ids: None,
        given_name: crate::text::JsText::default(),
        nickname: None,
        revision,
        encounter_id,
        authored: false,
    }
}
fn add_credit(
    voice: &mut RecognitionKnowledge,
    sample: RecognitionSample,
    policy: &RecognitionPolicy,
    scale: f64,
    ranks: &CollationRanks,
) -> Result<bool, ReceivedError> {
    if voice.samples.iter().any(|prior| prior.key == sample.key)
        || voice.next_credit_at.is_some_and(|at| sample.at < at)
    {
        return Ok(false);
    }
    let at = sample.at;
    let mut pool: Vec<(RecognitionSample, u32)> = voice
        .samples
        .iter()
        .chain(std::iter::once(&sample))
        .map(|sample| Ok((sample.clone(), collation(ranks.rank(&sample.key))?)))
        .collect::<Result<_, ReceivedError>>()?;
    pool.sort_by(|(a, ar), (b, br)| {
        b.quality
            .total_cmp(&a.quality)
            .then_with(|| {
                usable(&b.features)
                    .count()
                    .cmp(&usable(&a.features).count())
            })
            .then_with(|| a.at.total_cmp(&b.at))
            .then_with(|| a.order.total_cmp(&b.order))
            .then_with(|| ar.cmp(br))
    });
    let mut selected = Vec::new();
    let mut encounters = IndexSet::new();
    for (index, (sample, _)) in pool.iter().enumerate() {
        if encounters.insert(sample.encounter.as_str()) {
            selected.push(index);
            if selected.len() as u64 == policy.retained_credits {
                break;
            }
        }
    }
    if selected.len() as u64 != policy.retained_credits {
        for index in 0..pool.len() {
            if !selected.contains(&index) {
                selected.push(index);
                if selected.len() as u64 == policy.retained_credits {
                    break;
                }
            }
        }
    }
    voice.samples = selected
        .into_iter()
        .map(|index| pool[index].0.clone())
        .collect();
    voice.last_credit_at = Some(at);
    voice.next_credit_at = Some(at + policy.credit_seconds * scale);
    Ok(true)
}
fn empty_voice() -> RecognitionKnowledge {
    RecognitionKnowledge {
        samples: Vec::new(),
        authored: None,
        last_credit_at: None,
        next_credit_at: None,
    }
}

fn perceive_voice(
    physical: &mut PhysicalState,
    state: &mut ReceptionState,
    installed: &InstalledWorld,
    temporal: &mut TemporalState,
    journal: &mut RecognitionJournal,
    receiving: &mut ReceivingMutation<'_>,
    observer: &str,
    event: &VoiceEvent,
    features: &IndexMap<String, RecognitionInterval>,
    quality: f64,
    visible: Option<&str>,
    body_support: Option<&ObservationFactKey>,
    ranks: &CollationRanks,
) -> Result<IndividualRecognition, ExecutionError> {
    let policy = installed.recognition.value();
    let scale = installed.content.time_policy.normal_game_seconds_per_second;
    let retention = &installed.attention.value().retention;
    let quality = quality.min(resolution(features));
    let mut result = IndividualRecognition {
        recognized: false,
        body_support_before_matching: body_support.is_some(),
        subject: None,
        learned_subject: None,
        candidates: Vec::new(),
        more_candidates: false,
        quality,
        perception: None,
        policy: None,
        prior_exemplar_key: None,
        learning_support: None,
        seed_correlation: None,
        familiarity: None,
    };
    let entity = physical.entities.get(observer).ok_or_else(invalid)?;
    let Some(binding) = entity
        .actor
        .as_ref()
        .and_then(|actor| actor.individual_recognition.as_ref())
    else {
        return Ok(result);
    };
    let definition = installed
        .attributes
        .get(&binding.attribute_id)
        .ok_or_else(invalid)?;
    let Some(AttributeValue::Number(perception)) =
        crate::status::read_attribute(entity, definition.value(), physical.pending_values.as_ref())
            .map_err(|_| invalid())?
    else {
        return Err(invalid().into());
    };
    if !perception.is_finite() || !(0.0..=100.0).contains(&perception) {
        return Err(invalid().into());
    }
    let policy_key =
        json_record(&(&policy.id, policy.version, definition.pin())).map_err(|_| invalid())?;
    let mut expired: Vec<String> = state
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .into_iter()
        .flat_map(|records| records.iter())
        .filter(|(_, identity)| {
            identity.seed_only == Some(true)
                && identity.voice.as_ref().is_some_and(|voice| {
                    voice.samples.iter().all(|sample| {
                        sample.at + policy.seed_seconds * scale <= physical.header.sim_time
                    })
                })
        })
        .map(|(key, _)| key.clone())
        .collect();
    expired.sort_by(|a, b| property_order(a, b));
    for key in expired {
        journal.retire(
            state,
            temporal,
            observer,
            &key,
            physical.header.sim_time,
            retention,
            physical,
            installed,
            receiving,
        )?;
    }
    journal.ensure_observer(state, observer)?;
    let episode = visible
        .and_then(|visible| {
            state
                .perception_episodes
                .as_ref()
                .and_then(|root| root.get(observer))
                .and_then(|records| records.get(visible))
        })
        .cloned();
    let mut sample = RecognitionSample {
        key: json_record(&("voice", &event.id)).map_err(|_| invalid())?,
        source_key: format!("awareness:{}", event.id),
        at: event.at,
        order: event.order as f64,
        encounter: episode
            .clone()
            .unwrap_or_else(|| format!("utterance:{}", event.id)),
        features: features.clone(),
        quality,
        perception,
        policy: policy_key.clone(),
        support: vec![format!("awareness:{}", event.id)],
        contact_eligible: event.target_id.as_deref() == Some(observer)
            || visible.is_some_and(|source| {
                state
                    .perception_evidence
                    .as_ref()
                    .and_then(|root| root.get(observer))
                    .and_then(|owner| owner.attention.as_ref())
                    .is_some_and(|attention| {
                        attention
                            .entries
                            .iter()
                            .any(|entry| entry.source_id == source)
                    })
            }),
    };
    result.perception = Some(perception);
    result.policy = Some(policy_key);
    if let Some(proof) = body_support {
        let proof = crate::reception::original_fact_json(proof)?;
        sample.support.push(proof.clone());
        result.learning_support = Some(vec![proof]);
    }
    let p = perception / 100.0;
    let mut candidates = Vec::new();
    let mut recognized = Vec::new();
    let records = state
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .ok_or_else(invalid)?;
    let mut ordered: Vec<_> = records.iter().collect();
    ordered.sort_by(|(a, _), (b, _)| property_order(a, b));
    for (key, identity) in ordered {
        let (Some(individual_id), Some(voice)) = (&identity.individual_id, &identity.voice) else {
            continue;
        };
        if identity.seed_only == Some(true) {
            continue;
        }
        let equivalent = voice.authored.as_ref().map_or(0, |authored| {
            if authored.baseline == RecognitionBaseline::Familiar {
                6
            } else {
                2
            }
        });
        if equivalent.max(voice.samples.len()) < 2 {
            continue;
        }
        let familiarity = (individual_familiarity(identity) / 6.0).min(1.0);
        let mut candidate: Option<Match> = None;
        let mut reliable: Option<Match> = None;
        for exemplar in exemplars(voice, policy, ranks)? {
            let (distance, dimensions, match_quality) = compare(&sample, exemplar);
            if dimensions < 2 || match_quality < 0.2 || distance > 0.3 {
                continue;
            }
            let entry = || Match {
                key: key.clone(),
                individual_id: individual_id.clone(),
                distance,
                quality: match_quality,
                exemplar_key: exemplar.key.to_owned(),
                source_key: exemplar.source_key.to_owned(),
                rank: ranks
                    .rank(individual_id)
                    .expect("Prepared recognition comparison key"),
            };
            if candidate
                .as_ref()
                .is_none_or(|prior| distance < prior.distance)
            {
                candidate = Some(entry());
            }
            if dimensions >= 3
                && match_quality >= 0.7 - 0.2 * p - 0.15 * familiarity
                && distance <= 0.08 + 0.04 * p + 0.04 * familiarity
                && reliable.as_ref().is_none_or(|prior| {
                    distance < prior.distance
                        || (distance == prior.distance && match_quality > prior.quality)
                })
            {
                reliable = Some(entry());
            }
        }
        if let Some(candidate) = candidate {
            candidates.push(candidate);
        }
        if let Some(reliable) = reliable {
            recognized.push(reliable);
        }
    }
    candidates.sort_by(match_rank);
    recognized.sort_by(match_rank);
    result.candidates = candidates
        .iter()
        .take(2)
        .map(|entry| RecognitionCandidate {
            individual_id: entry.individual_id.clone(),
            distance: entry.distance,
        })
        .collect();
    result.more_candidates = candidates.len() > 2;
    if let Some(winner) = recognized.first().filter(|winner| {
        candidates
            .iter()
            .all(|entry| entry.key == winner.key || entry.distance - winner.distance >= 0.08)
    }) {
        let proof = familiarity_support(
            state,
            temporal,
            journal,
            physical,
            installed,
            receiving,
            observer,
            &winner.key,
            physical.header.sim_time,
            policy,
            scale,
            retention,
            ranks,
        )?;
        if proof.is_some()
            || (winner.quality >= 0.7 - 0.2 * p && winner.distance <= 0.08 + 0.04 * p)
        {
            result.recognized = true;
            result.subject = Some(local_subject(identity(state, observer, &winner.key)?)?);
            result.prior_exemplar_key = Some(winner.exemplar_key.clone());
            result.familiarity = Some(if proof.is_none() {
                0.0
            } else {
                individual_familiarity(identity(state, observer, &winner.key)?)
            });
            let mut support = IndexSet::new();
            support.insert(winner.source_key.clone());
            if let Some(body) = body_support {
                support.insert(crate::reception::original_fact_json(body)?);
            }
            support.extend(proof.unwrap_or_default());
            result.learning_support = Some(support.iter().cloned().collect());
            sample.support.extend(support);
        }
    }
    let mut associated = result.subject.as_ref().and_then(|subject| match subject {
        ObserverSubject::Individual { individual_id } => Some(individual_id.clone()),
        _ => None,
    });
    if associated.is_none() && visible.is_some() {
        let records = state
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(observer))
            .ok_or_else(invalid)?;
        let mut ordered: Vec<_> = records.iter().collect();
        ordered.sort_by(|(a, _), (b, _)| property_order(a, b));
        associated = ordered
            .into_iter()
            .find(|(_, identity)| {
                identity.seed_only != Some(true)
                    && !identity.authored
                    && identity.encounter_id.is_some()
                    && identity.encounter_id == episode
            })
            .map(|(key, _)| key.clone());
    }
    let learned = associated
        .as_ref()
        .and_then(|key| identity(state, observer, key).ok())
        .and_then(|identity| identity.voice.as_ref())
        .is_some_and(|voice| voice.authored.is_some() || voice.samples.len() >= 2);
    if quality
        < if learned {
            0.55
        } else {
            initial_quality(perception)
        }
        || usable(features).count() < 3
    {
        return Ok(result);
    }
    if state
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .ok_or_else(invalid)?
        .values()
        .any(|identity| {
            identity
                .voice
                .as_ref()
                .is_some_and(|voice| voice.samples.iter().any(|prior| prior.key == sample.key))
        })
    {
        return Ok(result);
    }
    if associated.is_none() && visible.is_some() {
        let id = allocate_individual(physical, state, observer)?;
        journal.insert_ephemeral(
            state,
            observer,
            &id,
            blank_identity(Some(id.clone()), None, episode, 1),
        )?;
        associated = Some(id);
    }
    if let Some(key) = associated {
        let mut candidate = identity(state, observer, &key)?.clone();
        if add_credit(
            candidate.voice.get_or_insert_with(empty_voice),
            sample.clone(),
            policy,
            scale,
            ranks,
        )? {
            candidate.revision = candidate
                .revision
                .checked_add(1)
                .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or_else(invalid)?;
            if candidate.individual_id.is_some()
                && !journal.commit(
                    state,
                    temporal,
                    observer,
                    &key,
                    candidate,
                    physical.header.sim_time,
                    policy,
                    scale,
                    retention,
                    physical,
                    installed,
                    receiving,
                )?
            {
                return Ok(result);
            }
        }
        credit_contact(
            state,
            temporal,
            journal,
            physical,
            installed,
            receiving,
            observer,
            &key,
            &sample,
            physical.header.sim_time,
            policy,
            scale,
            retention,
            ranks,
        )?;
        result.learned_subject = Some(local_subject(identity(state, observer, &key)?)?);
        return Ok(result);
    }
    learn_unseen(
        physical,
        state,
        installed,
        temporal,
        journal,
        receiving,
        observer,
        &mut sample,
        &mut result,
        &candidates,
        ranks,
    )?;
    Ok(result)
}

fn credit_contact(
    state: &mut ReceptionState,
    temporal: &mut TemporalState,
    journal: &mut RecognitionJournal,
    physical: &mut PhysicalState,
    installed: &InstalledWorld,
    receiving: &mut ReceivingMutation<'_>,
    observer: &str,
    key: &str,
    sample: &RecognitionSample,
    now: f64,
    policy: &RecognitionPolicy,
    scale: f64,
    retention: &crate::attention::AttentionRetentionPolicy,
    ranks: &CollationRanks,
) -> Result<(), ExecutionError> {
    if !sample.contact_eligible {
        return Ok(());
    }
    if !sample.order.is_finite()
        || sample.order < 0.0
        || sample.order.fract() != 0.0
        || sample.order > crate::identity::MAX_SAFE_INTEGER as f64
    {
        return Err(invalid().into());
    }
    let previous = identity(state, observer, key)?;
    let Some(candidate) = super::contact::contact_candidate(
        previous,
        super::contact::ContactInput {
            source_key: &sample.source_key,
            at: sample.at,
            order: sample.order as u64,
            support: &[],
        },
        now,
        policy,
        scale,
        ranks,
    )?
    else {
        return Ok(());
    };
    journal.commit(
        state, temporal, observer, key, candidate, now, policy, scale, retention, physical,
        installed, receiving,
    )?;
    Ok(())
}

fn familiarity_support(
    state: &mut ReceptionState,
    temporal: &mut TemporalState,
    journal: &mut RecognitionJournal,
    physical: &mut PhysicalState,
    installed: &InstalledWorld,
    receiving: &mut ReceivingMutation<'_>,
    observer: &str,
    key: &str,
    now: f64,
    policy: &RecognitionPolicy,
    scale: f64,
    retention: &crate::attention::AttentionRetentionPolicy,
    ranks: &CollationRanks,
) -> Result<Option<Vec<String>>, ExecutionError> {
    let prior = identity(state, observer, key)?;
    let Some(familiarity) = &prior.familiarity else {
        return Ok(Some(Vec::new()));
    };
    if familiarity
        .authored
        .as_ref()
        .map_or(0.0, |authored| authored.value)
        >= 6.0_f64.min(individual_familiarity(prior))
    {
        return Ok(Some(
            familiarity
                .authored
                .iter()
                .map(|authored| authored.source.clone())
                .collect(),
        ));
    }
    let mut selected: Vec<(usize, u32)> = familiarity
        .roots
        .iter()
        .enumerate()
        .filter(|(_, root)| root.credited)
        .map(|(index, root)| Ok((index, collation(ranks.rank(&root.key))?)))
        .collect::<Result<_, ReceivedError>>()?;
    selected.sort_by(|(a, ar), (b, br)| {
        let a = &familiarity.roots[*a];
        let b = &familiarity.roots[*b];
        b.required
            .cmp(&a.required)
            .then_with(|| a.at.total_cmp(&b.at))
            .then_with(|| a.order.cmp(&b.order))
            .then_with(|| ar.cmp(br))
    });
    selected.truncate(6.min(familiarity.roots.len()));
    let support: Vec<String> = selected
        .iter()
        .flat_map(|(index, _)| familiarity.roots[*index].support.iter().cloned())
        .collect();
    let mut candidate = prior.clone();
    let mut promotions = Vec::new();
    for source in recognition_support_sources(&support) {
        let capsule = temporal
            .actor(observer)
            .and_then(|actor| actor.supports())
            .map(|supports| {
                if let RecognitionSupportSource::Evidence(source) = &source {
                    if crate::received::is_temporal_receipt_source(source) {
                        return supports.get(&source.id).map(|record| record.cloned());
                    }
                    return Ok(None);
                }
                Ok(supports
                    .records()
                    .find(|record| {
                        record
                            .capsule()
                            .receipt
                            .header
                            .source_ids
                            .iter()
                            .any(|id| id == source.id())
                    })
                    .cloned())
            })
            .transpose()?
            .flatten();
        let Some(capsule) = capsule else {
            continue;
        };
        if capsule.capsule().required || promotions.contains(&capsule.capsule().receipt.id) {
            continue;
        }
        let id = capsule.capsule().receipt.id.clone();
        let values = state.received_values.as_ref().ok_or_else(invalid)?;
        if !temporal.set_support_required(
            observer,
            &id,
            true,
            &retention.required,
            values,
            now,
            retention,
        )? {
            for id in promotions {
                temporal.set_support_required(
                    observer,
                    &id,
                    false,
                    &retention.optional,
                    values,
                    now,
                    retention,
                )?;
            }
            return Ok(None);
        }
        promotions.push(id);
    }
    for (index, _) in selected {
        candidate.familiarity.as_mut().ok_or_else(invalid)?.roots[index].required = true;
    }
    if candidate.individual_id.is_some()
        && !journal.commit(
            state, temporal, observer, key, candidate, now, policy, scale, retention, physical,
            installed, receiving,
        )?
    {
        let values = state.received_values.as_ref().ok_or_else(invalid)?;
        for id in promotions {
            temporal.set_support_required(
                observer,
                &id,
                false,
                &retention.optional,
                values,
                now,
                retention,
            )?;
        }
        return Ok(None);
    }
    Ok(Some(
        support
            .into_iter()
            .collect::<IndexSet<_>>()
            .into_iter()
            .collect(),
    ))
}
fn learn_unseen(
    physical: &mut PhysicalState,
    state: &mut ReceptionState,
    installed: &InstalledWorld,
    temporal: &mut TemporalState,
    journal: &mut RecognitionJournal,
    receiving: &mut ReceivingMutation<'_>,
    observer: &str,
    sample: &mut RecognitionSample,
    result: &mut IndividualRecognition,
    candidates: &[Match],
    ranks: &CollationRanks,
) -> Result<(), ExecutionError> {
    let policy = installed.recognition.value();
    let scale = installed.content.time_policy.normal_game_seconds_per_second;
    let retention = &installed.attention.value().retention;
    struct Seed {
        key: String,
        prior: RecognitionSample,
        distance: f64,
        rank: u32,
    }
    let mut seeds = Vec::new();
    let records = state
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .ok_or_else(invalid)?;
    let mut ordered: Vec<_> = records.iter().collect();
    ordered.sort_by(|(a, _), (b, _)| property_order(a, b));
    for (key, identity) in ordered {
        let Some(voice) = &identity.voice else {
            continue;
        };
        if !(identity.seed_only == Some(true)
            || (voice.authored.is_none() && voice.samples.len() == 1))
            || !voice
                .samples
                .iter()
                .any(|prior| prior.at > sample.at - policy.seed_seconds * scale)
        {
            continue;
        }
        let mut matches: Vec<_> = voice
            .samples
            .iter()
            .filter_map(|prior| {
                let compared = compare(
                    sample,
                    Exemplar {
                        features: &prior.features,
                        quality: prior.quality,
                        at: prior.at,
                        order: prior.order,
                        key: &prior.key,
                        source_key: &prior.source_key,
                        authored: false,
                        rank: 0,
                    },
                );
                (compared.1 >= 3
                    && compared.2 >= initial_quality(sample.perception)
                    && compared.0 <= 0.3)
                    .then_some((prior, compared.0))
            })
            .collect();
        matches.sort_by(|(a, ad), (b, bd)| ad.total_cmp(bd).then_with(|| a.at.total_cmp(&b.at)));
        if let Some((prior, distance)) = matches.first() {
            seeds.push(Seed {
                key: key.clone(),
                prior: (*prior).clone(),
                distance: *distance,
                rank: collation(ranks.rank(&prior.key))?,
            });
        }
    }
    seeds.sort_by(|a, b| {
        a.distance
            .total_cmp(&b.distance)
            .then_with(|| a.rank.cmp(&b.rank))
    });
    let unique = seeds.first().is_some_and(|seed| {
        seed.distance <= 0.1
            && seeds
                .iter()
                .all(|other| other.key == seed.key || other.distance - seed.distance >= 0.08)
            && candidates
                .iter()
                .all(|other| other.key == seed.key || other.distance - seed.distance >= 0.08)
    });
    if unique {
        let seed = &seeds[0];
        let prior = identity(state, observer, &seed.key)?;
        result.seed_correlation = Some(SeedCorrelation {
            sample_key: seed.prior.key.clone(),
            individual_id: prior.individual_id.clone(),
        });
    }
    if unique && sample.at - seeds[0].prior.at >= policy.credit_seconds * scale {
        let seed = &seeds[0];
        result.learning_support = Some(vec![seed.prior.source_key.clone()]);
        sample.support.push(seed.prior.source_key.clone());
        let prior = identity(state, observer, &seed.key)?.clone();
        let id = match &prior.individual_id {
            Some(id) => id.clone(),
            None => allocate_individual(physical, state, observer)?,
        };
        let mut candidate = if prior.individual_id.is_some() {
            prior.clone()
        } else {
            let mut candidate = blank_identity(Some(id.clone()), None, None, 1);
            candidate.given_name = prior.given_name.clone();
            candidate.name_evidence_ids = Some(prior.name_evidence_ids.clone().unwrap_or_default());
            candidate.voice = Some(empty_voice());
            candidate
        };
        let voice = candidate.voice.as_mut().ok_or_else(invalid)?;
        if voice.samples.is_empty() {
            add_credit(voice, seed.prior.clone(), policy, scale, ranks)?;
        }
        add_credit(voice, sample.clone(), policy, scale, ranks)?;
        if !journal.commit(
            state,
            temporal,
            observer,
            &id,
            candidate,
            physical.header.sim_time,
            policy,
            scale,
            retention,
            physical,
            installed,
            receiving,
        )? {
            return Ok(());
        }
        credit_contact(
            state,
            temporal,
            journal,
            physical,
            installed,
            receiving,
            observer,
            &id,
            &seed.prior,
            physical.header.sim_time,
            policy,
            scale,
            retention,
            ranks,
        )?;
        credit_contact(
            state,
            temporal,
            journal,
            physical,
            installed,
            receiving,
            observer,
            &id,
            sample,
            physical.header.sim_time,
            policy,
            scale,
            retention,
            ranks,
        )?;
        if prior.seed_only == Some(true) {
            journal.retire(
                state,
                temporal,
                observer,
                &seed.key,
                physical.header.sim_time,
                retention,
                physical,
                installed,
                receiving,
            )?;
        }
        result.learned_subject = Some(local_subject(identity(state, observer, &id)?)?);
        journal.advance_revision(state, observer, receiving.cognition)?;
    } else if !unique {
        let mut seed = blank_identity(None, Some(true), None, 0);
        seed.voice = Some(RecognitionKnowledge {
            samples: vec![sample.clone()],
            ..empty_voice()
        });
        journal.commit(
            state,
            temporal,
            observer,
            &format!(
                "voice-seed-{}",
                sample
                    .source_key
                    .strip_prefix("awareness:")
                    .ok_or_else(invalid)?
            ),
            seed,
            physical.header.sim_time,
            policy,
            scale,
            retention,
            physical,
            installed,
            receiving,
        )?;
    }
    Ok(())
}
