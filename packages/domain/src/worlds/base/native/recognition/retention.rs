//! Lasting recognition keeps only the received feature/association proof from
//! the same delivered observation. Raw utterance retention is independent.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{Awareness, KnownPlaceMutation};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    SupportRetentionContext, TemporalAppendError, TemporalReceiptLocator,
    observation_receipt_member_indices,
};
use crate::reception::{
    EvidenceFamily, EvidenceSource, ObserverSubject, ReceivingMutation, SourceRevision,
};
use std::{collections::BTreeSet, mem::size_of};

fn invalid() -> crate::received::ReceivedError {
    crate::received::ReceivedError("Recognition retention lacks its actual delivered proof.")
}
fn append_error(error: TemporalAppendError) -> ExecutionError {
    match error {
        TemporalAppendError::Received(error) => ExecutionError::Received(error),
        TemporalAppendError::Work(error) => ExecutionError::Work(error),
    }
}
fn grow(reservation: &mut ByteReservation, bytes: usize) -> Result<(), ExecutionError> {
    reservation.resize(
        reservation
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(())
}
pub(crate) fn commit_observer_identity(
    core: &mut CoreMutation<'_>,
    observer: &str,
    key: &str,
    candidate: crate::worlds::InstalledObserverIdentity,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let mut receiving = ReceivingMutation {
        experience: &core.state.experience,
        cognition: &mut core.journal.cognition,
        current: &mut core.journal.current,
        acquisitions: &mut core.journal.acquisitions,
        meters: &mut core.journal.meters,
        budget,
    };
    core.journal.recognition.commit(
        &mut core.state.reception,
        &mut core.state.temporal,
        observer,
        key,
        candidate,
        core.state.physical.header.sim_time,
        core.state.installed.recognition.value(),
        core.state
            .installed
            .content
            .time_policy
            .normal_game_seconds_per_second,
        &core.state.installed.attention.value().retention,
        &mut core.state.physical,
        &core.state.installed,
        &mut receiving,
    )
}
pub(crate) fn retire_observer_identity(
    core: &mut CoreMutation<'_>,
    observer: &str,
    key: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let mut receiving = ReceivingMutation {
        experience: &core.state.experience,
        cognition: &mut core.journal.cognition,
        current: &mut core.journal.current,
        acquisitions: &mut core.journal.acquisitions,
        meters: &mut core.journal.meters,
        budget,
    };
    core.journal.recognition.retire(
        &mut core.state.reception,
        &mut core.state.temporal,
        observer,
        key,
        core.state.physical.header.sim_time,
        &core.state.installed.attention.value().retention,
        &mut core.state.physical,
        &core.state.installed,
        &mut receiving,
    )
}
pub(crate) fn source_json(locator: &TemporalReceiptLocator) -> Result<String, ExecutionError> {
    let id = locator.id();
    crate::encoding::json_record(&crate::received::temporal_receipt_source(locator, &id))
        .map_err(|_| invalid().into())
}
fn rebase_contacts(
    identity: &mut crate::worlds::InstalledObserverIdentity,
    provisional: &str,
    retained: &str,
) -> Result<(), ExecutionError> {
    for root in identity
        .familiarity
        .iter_mut()
        .flat_map(|state| &mut state.roots)
    {
        if root.source_key == provisional {
            root.source_key = retained.to_owned();
            root.key = crate::encoding::json_record(&("contact", retained, root.at))
                .map_err(|_| invalid())?;
            for support in &mut root.support {
                if support == provisional {
                    *support = retained.to_owned();
                }
            }
        }
    }
    Ok(())
}
pub(crate) fn member_indices(
    core: &CoreMutation<'_>,
    observation: &crate::reception::ObservationContribution,
    requested: &BTreeSet<u64>,
    receipt: Option<&TemporalReceiptLocator>,
    budget: &ByteBudget,
) -> Result<Option<BTreeSet<u64>>, ExecutionError> {
    let Some(receipt) = receipt else {
        return Ok(None);
    };
    let policy = &core.state.installed.attention.value().retention;
    let Some(retained) = core.state.temporal.retained_receipt(
        receipt,
        &core.state.reception.received_values.as_ref(),
        &crate::worlds::InstalledEvidenceMeaning,
        core.state.physical.header.sim_time,
        policy.recent.max_age_seconds,
        budget,
    )?
    else {
        return Ok(None);
    };
    Ok(
        observation_receipt_member_indices(observation, requested, retained.receipt())
            .map(|members| members.into_iter().collect()),
    )
}
pub(crate) fn original_support(
    core: &mut CoreMutation<'_>,
    observation: &crate::reception::ObservationContribution,
    requested: &BTreeSet<u64>,
    required: bool,
    budget: &ByteBudget,
    reservation: &mut ByteReservation,
) -> Result<Option<TemporalReceiptLocator>, ExecutionError> {
    // This Source caller is an actual just-delivered Awareness. An old-life
    // record may reuse already owned proof but never append a new sensation.
    let observer = &observation.observer.actor_id;
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    if entity.physical_life() != Some(observation.observer.physical_life) {
        let policy = &core.state.installed.attention.value().retention;
        let recent = core.state.temporal.receipt_for_source(
            observer,
            &observation.id,
            core.state.physical.header.sim_time,
            policy.recent.max_age_seconds,
        )?;
        if let Some(locator) =
            recent.filter(|locator| locator.physical_life == observation.observer.physical_life)
        {
            if member_indices(core, observation, requested, Some(&locator), budget)?.is_some() {
                return Ok(Some(locator));
            }
        }
        if let Some(supports) = core
            .state
            .temporal
            .actor(observer)
            .and_then(|actor| actor.supports())
        {
            if !supports.coverage().complete {
                return Err(invalid().into());
            }
            for record in supports.records() {
                let receipt = &record.capsule().receipt;
                if receipt.locator.physical_life != observation.observer.physical_life
                    || !receipt.facets.iter().any(|field| {
                        field
                            .original
                            .as_ref()
                            .is_some_and(|original| original.source.id == observation.id)
                    })
                {
                    continue;
                }
                if member_indices(core, observation, requested, Some(&receipt.locator), budget)?
                    .is_some()
                {
                    grow(
                        reservation,
                        receipt
                            .locator
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    return Ok(Some(receipt.locator.clone()));
                }
            }
        }
        return Ok(None);
    }
    let policy = &core.state.installed.attention.value().retention;
    let lease = core.journal.acquisitions.begin_received(
        observer,
        observation.observer.physical_life,
        None,
    )?;
    let mut loan = core.journal.acquisitions.loan(
        lease,
        &core.state.temporal,
        &policy.recent,
        policy.maintenance_headroom,
    )?;
    let result = match loan.parts() {
        Some((_, transition)) => core
            .state
            .temporal
            .retain_observation_support(
                observation,
                Some(requested),
                required,
                if required {
                    &policy.required
                } else {
                    &policy.optional
                },
                &mut core.state.reception.received_values,
                &core.state.activity.display,
                &mut core.state.physical.identity,
                transition,
                core.state.physical.header.sim_time,
                core.state.physical.header.sequence,
                policy,
                &mut core.journal.meters,
                Some(KnownPlaceMutation {
                    state: &mut core.state.experience,
                    journal: &mut core.journal.experience,
                    limits: &core.state.installed.personal_evidence_preparation,
                    budget,
                }),
                budget,
            )
            .map_err(append_error),
        None => Ok(None),
    };
    core.journal.acquisitions.return_loan(loan)?;
    let result = result?;
    if let Some(values) = core.state.reception.received_values.as_ref() {
        core.journal.acquisitions.finish_received(
            lease,
            &mut core.state.temporal,
            values,
            &mut core.state.physical.identity,
            &crate::worlds::InstalledEvidenceMeaning,
            &mut core.journal.meters,
        )?;
    } else {
        core.journal.acquisitions.finish_empty_received(lease)?;
    }
    Ok(result)
}
pub(crate) fn retain_recognition_evidence(
    core: &mut CoreMutation<'_>,
    evidence: &Awareness,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let (Some(observation), Some(recognition)) = (&evidence.observation, &evidence.recognition)
    else {
        return Ok(());
    };
    let observer = &evidence.actor_id;
    let Some(records) = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|owners| owners.get(observer))
    else {
        return Ok(());
    };
    let base = heap_sum([
        4 * size_of::<String>(),
        evidence
            .event_id
            .len()
            .checked_mul(3)
            .ok_or(ExecutionError::Capacity)?,
        "voice-seed-".len() + "awareness:".len(),
        map_storage::<String, ()>(6).ok_or(ExecutionError::Capacity)?,
        observation
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(4)
            .ok_or(ExecutionError::Capacity)?,
        observation
            .facets
            .len()
            .checked_mul(6 * size_of::<u64>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut reservation = budget.reserve(base)?;
    let mut ids = IndexSet::new();
    for subject in [&recognition.subject, &recognition.learned_subject]
        .into_iter()
        .flatten()
    {
        if let ObserverSubject::Individual { individual_id } = subject {
            grow(&mut reservation, individual_id.len())?;
            ids.insert(individual_id.clone());
        }
    }
    let seed = format!("voice-seed-{}", evidence.event_id);
    if records.contains_key(&seed) {
        ids.insert(seed);
    }
    let provisional = format!("awareness:{}", evidence.event_id);
    let requested: BTreeSet<_> = observation
        .facets
        .iter()
        .filter(|facet| matches!(facet.value.kind(), "perceived-feature" | "association"))
        .map(|facet| facet.ordinal)
        .collect();
    for key in ids {
        let Some(prior) = core
            .state
            .reception
            .observer_identities
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .and_then(|records| records.get(&key))
        else {
            continue;
        };
        let modalities = [prior.voice.as_ref(), prior.sight.as_ref()].map(|knowledge| {
            knowledge.is_some_and(|knowledge| {
                knowledge
                    .samples
                    .iter()
                    .any(|sample| sample.source_key == provisional)
            })
        });
        let has_contact = prior.familiarity.as_ref().is_some_and(|state| {
            state
                .roots
                .iter()
                .any(|root| root.source_key == provisional)
        });
        if !modalities.into_iter().any(|modality| modality) && !has_contact {
            continue;
        }
        let epoch = core
            .state
            .temporal
            .actor(observer)
            .map_or(0, |actor| actor.header().epoch.len());
        let syntax=r#"{"family":"native-exposure","id":"","revision":1,"observer":{"actorId":"","physicalLife":}}"#.len();
        let rebased = heap_sum([
            epoch,
            observer.len(),
            "temporal-receipt--0-0".len(),
            3 * 16,
            syntax,
        ])
        .and_then(|bytes| bytes.checked_mul(6))
        .ok_or(ExecutionError::Capacity)?;
        let mut copies = 3usize;
        for sample in prior
            .voice
            .iter()
            .chain(prior.sight.iter())
            .flat_map(|knowledge| &knowledge.samples)
            .filter(|sample| sample.source_key == provisional)
        {
            copies = copies
                .checked_add(
                    1 + sample
                        .support
                        .iter()
                        .filter(|key| *key == &provisional)
                        .count(),
                )
                .ok_or(ExecutionError::Capacity)?;
        }
        for root in prior
            .familiarity
            .iter()
            .flat_map(|state| &state.roots)
            .filter(|root| root.source_key == provisional)
        {
            // A contact key quotes the already encoded source once more.
            copies = copies
                .checked_add(
                    7 + root
                        .support
                        .iter()
                        .filter(|key| *key == &provisional)
                        .count(),
                )
                .ok_or(ExecutionError::Capacity)?;
        }
        grow(
            &mut reservation,
            heap_sum([
                prior
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?
                    .checked_mul(4)
                    .ok_or(ExecutionError::Capacity)?,
                rebased
                    .checked_mul(copies.checked_mul(3).ok_or(ExecutionError::Capacity)?)
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let prior = prior.clone();
        let has_modalities = modalities.into_iter().any(|modality| modality);
        let now = core.state.physical.header.sim_time;
        let max_age = core
            .state
            .installed
            .attention
            .value()
            .retention
            .recent
            .max_age_seconds;
        let mut receipt =
            core.state
                .temporal
                .receipt_for_source(observer, &evidence.event_id, now, max_age)?;
        let mut members = member_indices(core, observation, &requested, receipt.as_ref(), budget)?;
        if members.is_none() && has_modalities && !requested.is_empty() {
            receipt = original_support(
                core,
                observation,
                &requested,
                false,
                budget,
                &mut reservation,
            )?;
            members = member_indices(core, observation, &requested, receipt.as_ref(), budget)?;
        }
        let already_held = receipt
            .as_ref()
            .map(|locator| {
                core.state
                    .temporal
                    .actor(observer)
                    .and_then(|actor| actor.supports())
                    .map(|supports| supports.get(&locator.id()))
                    .transpose()
            })
            .transpose()?
            .flatten()
            .flatten()
            .is_some();
        let held = if let (Some(receipt), Some(members)) = (&receipt, &members) {
            if has_modalities {
                let policy = &core.state.installed.attention.value().retention;
                core.state
                    .temporal
                    .retain_receipt_support(
                        receipt,
                        Some(members),
                        false,
                        &policy.optional,
                        SupportRetentionContext {
                            values: core
                                .state
                                .reception
                                .received_values
                                .as_ref()
                                .ok_or(ExecutionError::UnfinishedOccurrence)?,
                            meaning: &crate::worlds::InstalledEvidenceMeaning,
                            now,
                            policy,
                            meters: &mut core.journal.meters,
                            budget,
                            places: Some(KnownPlaceMutation {
                                state: &mut core.state.experience,
                                journal: &mut core.journal.experience,
                                limits: &core.state.installed.personal_evidence_preparation,
                                budget,
                            }),
                        },
                    )
                    .map_err(append_error)?
            } else {
                None
            }
        } else {
            None
        };
        let proof = held
            .as_ref()
            .map(|held| &held.capsule().receipt.locator)
            .or_else(|| (!has_modalities).then_some(receipt.as_ref()).flatten());
        if let Some(proof) = proof {
            let retained = source_json(proof)?;
            let mut candidate = prior.clone();
            for (index, knowledge) in [&mut candidate.voice, &mut candidate.sight]
                .into_iter()
                .enumerate()
            {
                if modalities[index] {
                    for sample in &mut knowledge.as_mut().ok_or_else(invalid)?.samples {
                        if sample.source_key == provisional {
                            sample.source_key = retained.clone();
                            for support in &mut sample.support {
                                if *support == provisional {
                                    *support = retained.clone();
                                }
                            }
                        }
                    }
                }
            }
            rebase_contacts(&mut candidate, &provisional, &retained)?;
            if commit_observer_identity(core, observer, &key, candidate, budget)? {
                continue;
            }
            if let Some(held) = held.as_ref().filter(|_| !already_held) {
                let policy = &core.state.installed.attention.value().retention;
                core.state.temporal.release_support(
                    observer,
                    &held.capsule().receipt.id,
                    now,
                    policy,
                    Some(KnownPlaceMutation {
                        state: &mut core.state.experience,
                        journal: &mut core.journal.experience,
                        limits: &core.state.installed.personal_evidence_preparation,
                        budget,
                    }),
                )?;
            }
        }
        let mut candidate = prior;
        for (index, knowledge) in [&mut candidate.voice, &mut candidate.sight]
            .into_iter()
            .enumerate()
        {
            if modalities[index] {
                knowledge
                    .as_mut()
                    .ok_or_else(invalid)?
                    .samples
                    .retain(|sample| sample.source_key != provisional);
            }
        }
        let recent = receipt.as_ref().map(source_json).transpose()?;
        if has_modalities && has_contact {
            if let Some(recent) = &recent {
                rebase_contacts(&mut candidate, &provisional, recent)?;
                if candidate.individual_id.is_some()
                    && commit_observer_identity(core, observer, &key, candidate.clone(), budget)?
                {
                    continue;
                }
            }
        }
        if let Some(familiarity) = &mut candidate.familiarity {
            familiarity.roots.retain(|root| {
                root.source_key != provisional && Some(&root.source_key) != recent.as_ref()
            });
        }
        if candidate.individual_id.is_some() {
            commit_observer_identity(core, observer, &key, candidate, budget)?;
        } else {
            retire_observer_identity(core, observer, &key, budget)?;
        }
    }
    Ok(())
}
