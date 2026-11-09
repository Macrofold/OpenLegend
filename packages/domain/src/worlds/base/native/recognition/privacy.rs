//! Revoked learned proof is removed without resetting admitted credit clocks.
//! The same Source ICU provider orders remaining tied exemplars before writes.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRanks, CollationRequest};
use crate::reception::ReceivingMutation;
use crate::worlds::base_knowledge::ObserverIdentity;
use std::mem::size_of;
pub(crate) struct RecognitionPrivacyPreparation {
    actor: String,
    generation: String,
    cut: u64,
    identity: u64,
    at: f64,
    affected: IndexSet<String>,
    comparisons: CollationRequest,
    _storage: ByteReservation,
}
fn invalid() -> ExecutionError {
    ExecutionError::Invariant
}
impl RecognitionPrivacyPreparation {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        actor: &str,
        affected: &IndexSet<String>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(records) = core
            .state
            .reception
            .observer_identities
            .as_ref()
            .and_then(|root| root.get(actor))
        else {
            return Ok(None);
        };
        let bytes = affected
            .iter()
            .try_fold(
                map_storage::<String, ()>(affected.len()).ok_or(ExecutionError::Capacity)?,
                |n, key| n.checked_add(key.len()),
            )
            .and_then(|n| n.checked_add(actor.len()))
            .and_then(|n| n.checked_add(core.state.generation.len()))
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let strings = records
            .values()
            .flat_map(|identity| identity.voice.iter().chain(identity.sight.iter()))
            .flat_map(|knowledge| knowledge.samples.iter())
            .map(|sample| sample.key.as_str());
        let comparisons = CollationRequest::prepare(binding, strings, budget)
            .map_err(|_| ExecutionError::Capacity)?;
        Ok(Some(Self {
            actor: actor.to_owned(),
            generation: core.state.generation.clone(),
            cut: core.state.accepted_cut,
            identity: core.state.physical.identity.next_id(),
            at: core.state.physical.header.sim_time,
            affected: affected.clone(),
            comparisons,
            _storage: storage,
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
    ) -> Result<(), ExecutionError> {
        if self.generation != core.state.generation
            || self.cut != core.state.accepted_cut
            || self.identity != core.state.physical.identity.next_id()
            || self.at != core.state.physical.header.sim_time
        {
            return Err(invalid());
        }
        let ranks = self.comparisons.finish(answer).map_err(|_| invalid())?;
        apply(core, &self.actor, self.affected, &ranks, budget)
    }
}
fn revoked(keys: &[String], affected: &IndexSet<String>) -> bool {
    keys.iter().any(|key| affected.contains(key))
        || recognition_support_sources(keys).iter().any(|source| {
            let id = source.id();
            affected.contains(id)
                || affected.iter().any(|key| {
                    ["awareness:", "memory:", "summary:"]
                        .iter()
                        .any(|prefix| key.strip_prefix(prefix) == Some(id))
                })
        })
}
fn retain(
    knowledge: &mut RecognitionKnowledge,
    policy: &RecognitionPolicy,
    ranks: &CollationRanks,
) -> Result<(), ExecutionError> {
    // Only actual remaining records are copied; clone capacity derives from len.
    let mut ranked = knowledge
        .samples
        .iter()
        .map(|sample| {
            Ok((
                sample.clone(),
                ranks.rank(&sample.key).map_err(|_| invalid())?,
            ))
        })
        .collect::<Result<Vec<_>, ExecutionError>>()?;
    ranked.sort_by(|(a, ar), (b, br)| {
        let number = |a: f64, b: f64| {
            if a < b {
                std::cmp::Ordering::Less
            } else if a > b {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Equal
            }
        };
        number(b.quality, a.quality)
            .then_with(|| {
                usable(&b.features)
                    .count()
                    .cmp(&usable(&a.features).count())
            })
            .then_with(|| number(a.at, b.at))
            .then_with(|| number(a.order, b.order))
            .then_with(|| ar.cmp(br))
    });
    let mut chosen = Vec::new();
    let mut encounters = IndexSet::new();
    for (index, (sample, _)) in ranked.iter().enumerate() {
        if encounters.insert(sample.encounter.as_str()) {
            chosen.push(index);
            if chosen.len() as u64 == policy.retained_credits {
                break;
            }
        }
    }
    if chosen.len() as u64 != policy.retained_credits {
        for index in 0..ranked.len() {
            if !chosen.contains(&index) {
                chosen.push(index);
                if chosen.len() as u64 == policy.retained_credits {
                    break;
                }
            }
        }
    }
    knowledge.samples = chosen
        .into_iter()
        .map(|index| ranked[index].0.clone())
        .collect();
    Ok(())
}
fn apply(
    core: &mut CoreMutation<'_>,
    actor: &str,
    mut affected: IndexSet<String>,
    ranks: &CollationRanks,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let records = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(actor))
        .ok_or_else(invalid)?;
    let mut names = 0usize;
    let mut body = 0usize;
    let mut supports = 0usize;
    for (key, identity) in records {
        names = names
            .checked_add(key.len())
            .ok_or(ExecutionError::Capacity)?;
        body = body.max(identity.heap_bytes().ok_or(ExecutionError::Capacity)?);
        supports = supports
            .checked_add(identity.heap_bytes().ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?;
    }
    let _scratch = budget.reserve(
        heap_sum([
            names,
            records
                .len()
                .checked_mul(size_of::<String>() + 2 * size_of::<usize>())
                .ok_or(ExecutionError::Capacity)?,
            // Key parsing, one copied identity, and two finite exemplar rankings can
            // overlap. Their owned vectors are rebuilt at current len, not capacity.
            body.checked_mul(6).ok_or(ExecutionError::Capacity)?,
            supports.checked_mul(4).ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut keys = records.keys().cloned().collect::<Vec<_>>();
    keys.sort_by(|a, b| journal::property_order(a, b));
    loop {
        let before = affected.len();
        for identity in records.values() {
            for root in identity.familiarity.iter().flat_map(|state| &state.roots) {
                if revoked(&root.support, &affected) && affected.insert(root.source_key.clone()) {
                    affected.extend(
                        recognition_support_sources(std::slice::from_ref(&root.source_key))
                            .iter()
                            .map(|source| source.id().to_owned()),
                    );
                }
            }
            for sample in identity
                .voice
                .iter()
                .chain(&identity.sight)
                .flat_map(|knowledge| &knowledge.samples)
            {
                if revoked(&sample.support, &affected) && affected.insert(sample.source_key.clone())
                {
                    affected.extend(
                        recognition_support_sources(std::slice::from_ref(&sample.source_key))
                            .iter()
                            .map(|source| source.id().to_owned()),
                    );
                }
            }
        }
        if before == affected.len() {
            break;
        }
    }
    let checkpoint = core.journal.recognition.checkpoint(&core.state.reception);
    let mut changed = false;
    for key in keys {
        let original = core
            .journal
            .recognition
            .identity_at(&core.state.reception, checkpoint, actor, &key)
            .ok_or_else(invalid)?;
        let familiarity = original.familiarity.as_ref().is_some_and(|state| {
            state
                .roots
                .iter()
                .any(|root| revoked(&root.support, &affected))
                || state
                    .authored
                    .as_ref()
                    .is_some_and(|source| revoked(std::slice::from_ref(&source.source), &affected))
        });
        let name = original
            .name_evidence_ids
            .as_deref()
            .is_some_and(|keys| revoked(keys, &affected));
        let modalities = original
            .voice
            .iter()
            .chain(&original.sight)
            .any(|knowledge| {
                knowledge
                    .samples
                    .iter()
                    .any(|sample| revoked(&sample.support, &affected))
                    || knowledge
                        .authored
                        .as_ref()
                        .is_some_and(|source| affected.contains(&source.source))
            });
        if !familiarity && !name && !modalities {
            continue;
        }
        let mut next = original.clone();
        if let Some(state) = &mut next.familiarity {
            state
                .roots
                .retain(|root| !revoked(&root.support, &affected));
            if state
                .authored
                .as_ref()
                .is_some_and(|source| revoked(std::slice::from_ref(&source.source), &affected))
            {
                state.authored = None;
            }
        }
        for knowledge in next.voice.iter_mut().chain(&mut next.sight) {
            let before = knowledge.samples.len();
            knowledge
                .samples
                .retain(|sample| !revoked(&sample.support, &affected));
            let authored = knowledge
                .authored
                .as_ref()
                .is_some_and(|source| affected.contains(&source.source));
            if before != knowledge.samples.len() || authored {
                retain(knowledge, core.state.installed.recognition.value(), ranks)?;
                if authored {
                    knowledge.authored = None;
                }
            }
        }
        if name {
            next.given_name = "".into();
            next.name_evidence_ids = Some(Vec::new());
        }
        if next.authored
            && next
                .voice
                .as_ref()
                .is_none_or(|knowledge| knowledge.authored.is_none())
            && next
                .sight
                .as_ref()
                .is_none_or(|knowledge| knowledge.authored.is_none())
        {
            next.authored = false;
            next.canonical_id = None;
        }
        next.revision = next
            .revision
            .checked_add(1)
            .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        let key = next.individual_id.clone().unwrap_or(key);
        if next.retained == Some(true) {
            if !retention::commit_observer_identity(core, actor, &key, next, budget)? {
                return Err(invalid());
            }
        } else {
            let mut receiving = ReceivingMutation {
                experience: &core.state.experience,
                cognition: &mut core.journal.cognition,
                current: &mut core.journal.current,
                acquisitions: &mut core.journal.acquisitions,
                meters: &mut core.journal.meters,
                budget,
            };
            let original = core
                .state
                .reception
                .observer_identities
                .as_ref()
                .and_then(|root| root.get(actor))
                .and_then(|records| records.get(&key));
            let cohort = if journal::correspondence_changes(original, Some(&next)) {
                receiving.prepare_identity(
                    &core.state.physical,
                    &core.state.reception,
                    &core.state.installed,
                    actor,
                )?
            } else {
                None
            };
            core.journal.recognition.replace_incidental_identity(
                &mut core.state.reception,
                &mut core.state.temporal,
                actor,
                &key,
                next,
                core.state.physical.header.sim_time,
                &core.state.installed.attention.value().retention,
            )?;
            if let Some(cohort) = cohort {
                receiving.reconcile(
                    &mut core.state.physical,
                    &mut core.state.reception,
                    &core.state.installed,
                    &mut core.state.temporal,
                    cohort,
                    None,
                )?;
            }
        }
        changed = true;
    }
    if changed {
        core.journal.recognition.advance_revision(
            &mut core.state.reception,
            actor,
            &mut core.journal.cognition,
        )?;
    }
    Ok(())
}
