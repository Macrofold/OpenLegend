//! Physical loss may retire empty encounter subjects, while actual personal
//! notes, recent members and independently owned proof keep their local IDs.
use super::*;
use crate::encoding::json_record;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::{
    ReceivedError, ReceivedPosition, ReceivedValueFragment, received_position_eligible,
    temporal_receipt_locator_from_source,
};
use crate::reception::{ObserverSubject, SensoryFacet, received_facet_value};
use std::mem::size_of;
fn unavailable() -> ReceivedError {
    ReceivedError("Lost local identity requires unavailable personal ownership.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Lost local identities exceed native byte allowance.")
}
fn individual(subject: &ObserverSubject) -> Option<&str> {
    match subject {
        ObserverSubject::Individual { individual_id } => Some(individual_id),
        _ => None,
    }
}
fn recent_root(
    core: &CoreMutation<'_>,
    observer: &str,
    root: &FamiliarityRoot,
    cutoff: f64,
) -> bool {
    let Some(actor) = core.state.temporal.actor(observer) else {
        return false;
    };
    if root.at <= cutoff {
        return false;
    }
    let sources = recognition_support_sources(std::slice::from_ref(&root.source_key));
    let Some(RecognitionSupportSource::Evidence(source)) = sources.first() else {
        return false;
    };
    let Some(locator) = temporal_receipt_locator_from_source(source) else {
        return false;
    };
    if locator.actor_id != observer || !actor.recent().contains(&locator, f64::NEG_INFINITY) {
        return false;
    }
    for key in &root.support {
        if key.starts_with("awareness:")
            || key.starts_with("memory:")
            || key.starts_with("summary:")
        {
            continue;
        }
        // These keys were validated at the identity owner. Project only the two
        // fields used by this deletion-only frontier check; no body lookup.
        #[derive(Deserialize)]
        struct Key {
            source: Option<Source>,
            #[serde(
                rename = "memberIndex",
                default,
                deserialize_with = "crate::values::deserialize_present_safe_integer"
            )]
            member_index: Option<u64>,
        }
        #[derive(Deserialize)]
        struct Source {
            id: Option<String>,
        }
        if let Ok(key) = serde_json::from_str::<Key>(key) {
            if key.source.as_ref().and_then(|source| source.id.as_deref())
                == Some(source.id.as_str())
            {
                if let Some(member_index) = key.member_index {
                    if !received_position_eligible(
                        &ReceivedPosition {
                            batch_order: locator.batch_order,
                            entry_index: locator.entry_index,
                            member_index,
                        },
                        root.at,
                        actor.header().frontier.as_ref(),
                    ) {
                        return false;
                    }
                }
            }
        }
    }
    true
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum IndividualPruneMode {
    CurrentLoss,
    RecentRetirement,
}
/// Complete checkpoint retention also expires seeds for actors that have not
/// yet opened accounting. Source creates their first totals only afterward.
pub(crate) fn maintain_restore_recognition(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if core.state.temporal.actor(observer)
        .is_some_and(|actor| actor.header().accounts.is_some()) {
        return super::maintain_recognition(core, observer, budget);
    }
    let installed = core.state.installed.clone();
    let mut receiving = crate::reception::ReceivingMutation {
        experience: &core.state.experience,
        cognition: &mut core.journal.cognition,
        current: &mut core.journal.current,
        acquisitions: &mut core.journal.acquisitions,
        meters: &mut core.journal.meters,
        budget,
    };
    super::maintenance::expire_seeds(
        &mut core.state.physical, &mut core.state.reception, &installed,
        &mut core.state.temporal, &mut core.journal.recognition, &mut receiving, observer,
    )
}
struct IndividualPruning {
    pinned: IndexSet<String>,
    _storage: crate::host::ByteReservation,
}
fn prepare_pruning(
    core: &mut CoreMutation<'_>,
    observer: &str,
    candidates: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<Option<IndividualPruning>, ExecutionError> {
    if candidates.is_empty() {
        return Ok(None);
    }
    let Some(identities) = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|owners| owners.get(observer))
    else {
        return Ok(None);
    };
    let mut bytes = heap_sum([
        size_of::<IndexSet<String>>() * 3,
        map_storage::<String, ()>(candidates.len().checked_mul(4).ok_or_else(capacity)?)
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    for key in candidates {
        bytes = heap_sum([
            bytes,
            key.len().checked_mul(4).ok_or_else(capacity)?,
            identities
                .get(key)
                .map_or(Some(0), HeapBytes::heap_bytes)
                .and_then(|n| n.checked_mul(4))
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
    }
    if let Some(actor) = core.state.temporal.actor(observer) {
        if let Some(supports) = actor.supports() {
            if !supports.coverage().complete {
                return Err(unavailable().into());
            }
            for record in supports.records() {
                if let Some(id) = record
                    .capsule()
                    .receipt
                    .header
                    .subject_identity
                    .as_ref()
                    .and_then(individual)
                {
                    bytes = heap_sum([
                        bytes,
                        id.len(),
                        map_storage::<String, ()>(2).ok_or_else(capacity)?,
                    ])
                    .ok_or_else(capacity)?;
                }
                bytes = bytes
                    .checked_add(
                        map_storage::<String, ()>(
                            record
                                .capsule()
                                .values
                                .len()
                                .checked_mul(2)
                                .ok_or_else(capacity)?,
                        )
                        .ok_or_else(capacity)?,
                    )
                    .ok_or_else(capacity)?;
                for value in record.capsule().values.iter() {
                    bytes = bytes
                        .checked_add(value.heap_bytes().ok_or_else(capacity)?)
                        .ok_or_else(capacity)?
                }
            }
        } else if actor.header().supports.is_some() {
            return Err(unavailable().into());
        }
    }
    if let Some(current) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
    {
        for contact in current.current.values() {
            for group in &contact.content.groups {
                bytes = bytes
                    .checked_add(group.received.heap_bytes().ok_or_else(capacity)?)
                    .ok_or_else(capacity)?
            }
        }
    }
    for id in core.state.minds.pinned_individuals(observer) {
        bytes = heap_sum([
            bytes,
            id.len(),
            map_storage::<String, ()>(2).ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
    }
    // The source subset's roots carry up to ten independent evidence keys; the
    // hash indexes own real key copies as well as their table backing.
    for id in candidates {
        if let Some(identity) = identities.get(id) {
            let keys = identity.name_evidence_ids.as_ref().map_or(0, Vec::len)
                + identity
                    .voice
                    .iter()
                    .chain(identity.sight.iter())
                    .flat_map(|p| &p.samples)
                    .map(|sample| 1 + sample.support.len())
                    .sum::<usize>()
                + identity
                    .familiarity
                    .iter()
                    .flat_map(|f| &f.roots)
                    .map(|root| 1 + root.support.len())
                    .sum::<usize>();
            bytes = bytes
                .checked_add(
                    map_storage::<String, ()>(keys.checked_mul(2).ok_or_else(capacity)?)
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?;
        }
    }
    let reservation = budget.reserve(bytes)?;
    let mut pinned = IndexSet::new();
    if let Some(documents) = core
        .state
        .reception
        .actor_knowledge
        .as_ref()
        .and_then(|owners| owners.get(observer))
    {
        for id in candidates {
            let slot = format!(
                "subject:{}",
                json_record(&("individual", id)).map_err(|_| unavailable())?
            );
            if documents
                .get(&slot)
                .is_some_and(|document| !document.text.trim_is_empty())
            {
                pinned.insert(id.clone());
            }
        }
    }
    for id in core.state.minds.pinned_individuals(observer) {
        pinned.insert(id.to_owned());
    }
    let held = retained_identity_evidence_keys(core, observer, candidates, &pinned);
    let now = core.state.physical.header.sim_time;
    let cutoff = now
        - core
            .state
            .installed
            .attention
            .value()
            .retention
            .recent
            .max_age_seconds;
    let mut dropped = Vec::new();
    for id in candidates {
        let Some(identity) = core
            .state
            .reception
            .observer_identities
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .and_then(|identities| identities.get(id))
        else {
            continue;
        };
        let Some(familiarity) = identity
            .familiarity
            .as_ref()
            .filter(|state| !state.roots.is_empty())
        else {
            continue;
        };
        let keep = familiarity
            .roots
            .iter()
            .map(|root| {
                root.required
                    || held.contains(&root.source_key)
                    || recent_root(core, observer, root, cutoff)
            })
            .collect::<Vec<_>>();
        if keep.iter().all(|keep| *keep) {
            continue;
        }
        for (root, keep) in familiarity.roots.iter().zip(&keep) {
            if !keep {
                dropped.push(root.source_key.clone());
                dropped.extend(root.support.iter().cloned());
            }
        }
        let mut next = identity.clone();
        next.familiarity.as_mut().ok_or_else(unavailable)?.roots = next
            .familiarity
            .as_ref()
            .ok_or_else(unavailable)?
            .roots
            .iter()
            .zip(keep)
            .filter(|(_, keep)| *keep)
            .map(|(root, _)| root.clone())
            .collect();
        next.revision = next
            .revision
            .checked_add(1)
            .filter(|r| *r <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(unavailable)?;
        core.journal.recognition.replace_incidental_identity(
            &mut core.state.reception,
            &mut core.state.temporal,
            observer,
            id,
            next,
            now,
            &core.state.installed.attention.value().retention,
        )?;
    }
    if !dropped.is_empty() {
        let sources = recognition_support_sources(&dropped)
            .into_iter()
            .map(|source| source.id().to_owned())
            .collect::<Vec<_>>();
        core.state
            .temporal
            .mark_support_dirty(observer, Some(&sources))?;
    }
    Ok(Some(IndividualPruning { pinned, _storage: reservation }))
}
fn finish_pruning(
    core: &mut CoreMutation<'_>,
    observer: &str,
    candidates: &IndexSet<String>,
    mode: IndividualPruneMode,
    mut prepared: IndividualPruning,
    retained: Option<&IndexSet<String>>,
    budget: &ByteBudget,
) -> Result<usize, ExecutionError> {
    let now = core.state.physical.header.sim_time;
    let pinned = &mut prepared.pinned;
    if let Some(supports) = core
        .state
        .temporal
        .actor(observer)
        .and_then(|actor| actor.supports())
    {
        for record in supports.records() {
            let capsule = record.capsule();
            if let Some(id) = capsule
                .receipt
                .header
                .subject_identity
                .as_ref()
                .and_then(individual)
            {
                pinned.insert(id.to_owned());
            }
            for value in capsule.values.iter() {
                let id = match value {
                    ReceivedValueFragment::Sensory(SensoryFacet::Association {
                        subject, ..
                    }) => individual(subject),
                    ReceivedValueFragment::Sensory(SensoryFacet::Event {
                        source_subject: Some(subject),
                        ..
                    }) => individual(subject),
                    _ => None,
                };
                if let Some(id) = id {
                    pinned.insert(id.to_owned());
                }
            }
        }
    }
    if let Some(retained) = retained {
        pinned.extend(retained.iter().filter(|id| candidates.contains(*id)).cloned());
    }
    let _retained_pins = budget.reserve(pinned.heap_bytes().ok_or_else(capacity)?)?;
    let retained_pins = pinned.clone();
    if let Some(current) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
    {
        for contact in current.current.values() {
            for group in &contact.content.groups {
                for field in group.received.fields.values() {
                    if let Some(id) = field.local_subject.as_ref().and_then(individual) {
                        pinned.insert(id.to_owned());
                    }
                    if field.value.kind == "association" {
                        let value = received_facet_value(
                            &core.state.reception.received_values.as_ref(),
                            &field.value,
                        )?;
                        if let Some(SensoryFacet::Association { subject, .. }) = value.as_ref() {
                            if let Some(id) = individual(subject) {
                                pinned.insert(id.to_owned());
                            }
                        }
                    }
                }
            }
        }
    }
    let mut removed = 0;
    for id in candidates {
        let Some(identity) = core
            .state
            .reception
            .observer_identities
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .and_then(|identities| identities.get(id))
        else {
            continue;
        };
        let learned = identity.authored
            || identity
                .nickname
                .as_ref()
                .is_some_and(|name| !name.is_empty())
            || !identity.given_name.is_empty()
            || identity
                .voice
                .as_ref()
                .is_some_and(|p| p.authored.is_some() || !p.samples.is_empty())
            || identity
                .sight
                .as_ref()
                .is_some_and(|p| p.authored.is_some() || !p.samples.is_empty())
            || identity
                .familiarity
                .as_ref()
                .is_some_and(|f| f.authored.is_some() || !f.roots.is_empty());
        if mode == IndividualPruneMode::RecentRetirement
            && identity.retained == Some(true)
            && !learned
            && !retained_pins.contains(id)
            && pinned.contains(id)
        {
            let _copy = budget.reserve(identity.heap_bytes().ok_or_else(capacity)?)?;
            let mut next = identity.clone();
            next.retained = None;
            core.journal.recognition.replace_incidental_identity(
                &mut core.state.reception,
                &mut core.state.temporal,
                observer,
                id,
                next,
                now,
                &core.state.installed.attention.value().retention,
            )?;
            continue;
        }
        if identity.authored
            || pinned.contains(id)
            || core.state.temporal.actor(observer).is_some_and(|actor| {
                actor
                    .recent()
                    .has_individual(identity.individual_id.as_deref().unwrap_or(id))
            })
            || mode == IndividualPruneMode::CurrentLoss && identity.retained == Some(true)
            || identity
                .nickname
                .as_ref()
                .is_some_and(|name| !name.is_empty())
            || !identity.given_name.is_empty()
            || identity
                .voice
                .as_ref()
                .is_some_and(|p| p.authored.is_some() || !p.samples.is_empty())
            || identity
                .sight
                .as_ref()
                .is_some_and(|p| p.authored.is_some() || !p.samples.is_empty())
            || identity
                .familiarity
                .as_ref()
                .is_some_and(|f| f.authored.is_some() || !f.roots.is_empty())
        {
            continue;
        }
        retire_observer_identity(core, observer, id, budget)?;
        removed += 1;
    }
    Ok(removed)
}

/// Physical loss and recent expiry do not revoke independent source proof.
pub(crate) fn prune_observer_individuals(
    core: &mut CoreMutation<'_>,
    observer: &str,
    candidates: &IndexSet<String>,
    mode: IndividualPruneMode,
    budget: &ByteBudget,
) -> Result<usize, ExecutionError> {
    let Some(prepared) = prepare_pruning(core, observer, candidates, budget)? else {
        return Ok(0);
    };
    finish_pruning(core, observer, candidates, mode, prepared, None, budget)
}

/// Exceptional lasting-account retirement has real SQL membership proof.
/// Familiarity fades before released source evidence, and only then may an
/// empty personal identity return to current-only ownership or disappear.
pub(crate) struct PreparedIndividualRetirement {
    observer: String,
    candidates: IndexSet<String>,
    retained: IndexSet<String>,
    prepared: Option<IndividualPruning>,
    privacy: Option<super::RecognitionPrivacyPreparation>,
    _storage: crate::host::ByteReservation,
}
impl PreparedIndividualRetirement {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        observer: &str,
        released: &IndexSet<String>,
        retained: &IndexSet<String>,
        binding: crate::geometry::GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let identities = core.state.reception.observer_identities.as_ref()
            .and_then(|owners| owners.get(observer));
        let count = identities.map_or(0, IndexMap::len);
        let strings = identities.into_iter().flat_map(|records| records.keys())
            .try_fold(0usize, |n, key| n.checked_add(key.len().checked_mul(2)?))
            .ok_or_else(capacity)?;
        let storage = budget.reserve(heap_sum([
            size_of::<Self>(), observer.len(), strings,
            map_storage::<String, ()>(count.checked_mul(4).ok_or_else(capacity)?)
                .ok_or_else(capacity)?,
        ]).ok_or_else(capacity)?)?;
        let mut candidates = IndexSet::with_capacity(count);
        let mut selected_retained = IndexSet::with_capacity(count);
        for key in identities.into_iter().flat_map(|records| records.keys()) {
            candidates.insert(key.clone());
            if retained.contains(key) { selected_retained.insert(key.clone()); }
        }
        // Comparison allocation precedes the familiarity writer; its selected
        // sample keys are unchanged by familiarity's independent roots.
        let privacy = if released.is_empty() { None } else {
            super::RecognitionPrivacyPreparation::prepare(core, observer, released, binding, budget)?
        };
        let prepared = prepare_pruning(core, observer, &candidates, budget)?;
        Ok(Self { observer: observer.to_owned(), candidates,
            retained: selected_retained, prepared, privacy, _storage: storage })
    }
    pub(crate) fn comparisons(&self) -> Option<&crate::language::CollationRequest> {
        self.privacy.as_ref().map(|privacy| privacy.comparisons())
    }
    pub(crate) fn validate_answer(
        &self,
        answer: Option<&crate::language::CollationAnswer>,
    ) -> Result<(), ExecutionError> {
        match (&self.privacy, answer) {
            (Some(privacy), Some(answer)) => {
                privacy.comparisons().finish(answer).map_err(|_| ExecutionError::Invariant)?;
                Ok(())
            }
            (None, None) => Ok(()),
            _ => Err(ExecutionError::Invariant),
        }
    }
    pub(crate) fn finish(
        self,
        core: &mut CoreMutation<'_>,
        answer: Option<&crate::language::CollationAnswer>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if let Some(privacy) = self.privacy {
            privacy.finish(core, answer.ok_or(ExecutionError::Invariant)?, budget)?;
        }
        if let Some(prepared) = self.prepared {
            finish_pruning(core, &self.observer, &self.candidates,
                IndividualPruneMode::RecentRetirement, prepared, Some(&self.retained), budget)?;
        }
        Ok(())
    }
}

/// Source retainedIdentityEvidenceKeys is shared by retirement and support
/// cleanup. Callers fund the selected key copies before entering this factory.
pub(super) fn retained_identity_evidence_keys(
    core: &CoreMutation<'_>,
    observer: &str,
    candidates: &IndexSet<String>,
    pinned: &IndexSet<String>,
) -> IndexSet<String> {
    let Some(identities) = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|owners| owners.get(observer))
    else {
        return IndexSet::new();
    };
    let mut held = IndexSet::new();
    for id in candidates {
        let Some(identity) = identities.get(id) else {
            continue;
        };
        held.extend(identity.name_evidence_ids.iter().flatten().cloned());
        for profile in [&identity.voice, &identity.sight].into_iter().flatten() {
            for sample in &profile.samples {
                held.insert(sample.source_key.clone());
                held.extend(sample.support.iter().cloned());
            }
        }
        let meaningful = identity.authored
            || identity.nickname.as_ref().is_some_and(|n| !n.is_empty())
            || !identity.given_name.is_empty()
            || identity
                .voice
                .as_ref()
                .is_some_and(|p| p.authored.is_some() || p.samples.len() >= 2)
            || identity
                .sight
                .as_ref()
                .is_some_and(|p| p.authored.is_some() || !p.samples.is_empty())
            || pinned.contains(id)
            || identity.encounter_id.as_deref().is_some_and(|episode| {
                core.state
                    .physical
                    .entities
                    .get(observer)
                    .and_then(|e| e.actor.as_ref())
                    .and_then(|a| a.agency.plan.as_ref())
                    .is_some_and(|plan| {
                        plan.steps
                            .iter()
                            .filter(|s| {
                                matches!(
                                    s.status,
                                    crate::plans::StepStatus::Queued
                                        | crate::plans::StepStatus::Running
                                )
                            })
                            .flat_map(|s| s.target_episodes.iter().flat_map(|m| m.values()))
                            .flatten()
                            .any(|held| held == episode)
                    })
            });
        for root in identity.familiarity.iter().flat_map(|state| &state.roots) {
            if meaningful || root.required {
                held.insert(root.source_key.clone());
                held.extend(root.support.iter().cloned());
            }
        }
    }
    held
}
