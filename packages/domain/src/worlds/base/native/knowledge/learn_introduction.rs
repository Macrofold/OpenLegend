//! A heard introduction may rename only the listener's supported individual.
//! The canonical speaker is never a substitute for an acquired subject.

use super::name_evidence::{release_created, retain_name_evidence};
use super::{HeardIntroductions, ObserverIdentity, PersonalNameReader};
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::Awareness;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::ObserverSubject;
use crate::worlds::base_recognition::commit_observer_identity;

fn reader<'a>(
    core: &'a CoreMutation<'_>,
    observer: &'a str,
) -> Result<PersonalNameReader<'a>, ExecutionError> {
    Ok(PersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer,
    )?)
}
fn clone_identity(
    prior: &ObserverIdentity,
    name: &crate::text::JsText,
    budget: &ByteBudget,
) -> Result<(ObserverIdentity, ByteReservation), ExecutionError> {
    let bytes = prior
        .heap_bytes()
        .and_then(|n| n.checked_add(name.storage_bytes()))
        .ok_or(ExecutionError::Capacity)?;
    let reservation = budget.reserve(bytes)?;
    let mut candidate = prior.clone();
    candidate.given_name = name.clone();
    Ok((candidate, reservation))
}
fn current_local(
    reader: &PersonalNameReader<'_>,
    subject: &ObserverSubject,
) -> Result<bool, ExecutionError> {
    let Some(scope) = &reader.scope else {
        return Ok(false);
    };
    for (id, contact) in &scope.state().current {
        if !contact.content.groups.iter().any(|group| {
            group
                .received
                .fields
                .get("body")
                .and_then(|field| field.local_subject.as_ref())
                == Some(subject)
        }) {
            continue;
        }
        if scope
            .native_body(id)?
            .and_then(|body| body.field.local_subject.as_ref())
            == Some(subject)
        {
            return Ok(true);
        }
    }
    Ok(false)
}
fn can_name(
    reader: &PersonalNameReader<'_>,
    subject: &ObserverSubject,
    identity: &ObserverIdentity,
) -> Result<bool, ExecutionError> {
    if identity.individual_id.as_ref().is_none_or(String::is_empty)
        || identity.seed_only == Some(true)
    {
        return Ok(false);
    }
    if identity.authored || current_local(reader, subject)? {
        return Ok(true);
    }
    if let Some(canonical) = identity.canonical_id.as_deref() {
        if identity
            .voice
            .as_ref()
            .is_some_and(|voice| !voice.samples.is_empty())
            || identity
                .sight
                .as_ref()
                .is_some_and(|sight| !sight.samples.is_empty())
            || identity.encounter_id.as_ref().is_some_and(|episode| {
                !episode.is_empty() && reader.episode(canonical) == Some(episode)
            })
        {
            return Ok(true);
        }
    }
    Ok(identity
        .voice
        .as_ref()
        .is_some_and(|voice| voice.authored.is_some() || voice.samples.len() >= 2)
        || identity
            .sight
            .as_ref()
            .is_some_and(|sight| sight.authored.is_some() || !sight.samples.is_empty()))
}
fn assign_individual(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &ObserverSubject,
    event: &str,
    name: &crate::text::JsText,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let names = reader(core, observer)?;
    let Some(prior) = names.observer_individual(subject) else {
        return Ok(());
    };
    if !can_name(&names, subject, prior)? || &prior.given_name == name {
        return Ok(());
    }
    let (mut candidate, _candidate_reservation) = clone_identity(prior, name, budget)?;
    candidate.revision = candidate
        .revision
        .checked_add(1)
        .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    let key = candidate
        .individual_id
        .as_deref()
        .ok_or(ExecutionError::Invariant)?;
    // The candidate owns this key while the actual retention owner mutates
    // history. A separate borrowed current-body scope cannot outlive that edit.
    let key_reservation = budget.reserve(key.len())?;
    let key = key.to_owned();
    drop(names);
    let Some(held) = retain_name_evidence(core, observer, event, None, budget)? else {
        return Ok(());
    };
    let super::name_evidence::HeldNameEvidence {
        ids,
        created,
        reservation: _evidence_reservation,
    } = held;
    candidate.name_evidence_ids = Some(ids);
    if commit_observer_identity(core, observer, &key, candidate, budget)? {
        core.journal
            .recognition
            .advance_revision(&mut core.state.reception, observer)?;
    } else {
        release_created(core, observer, created.as_deref(), budget)?;
    }
    drop(key_reservation);
    Ok(())
}
fn assign_entity(
    core: &mut CoreMutation<'_>,
    observer: &str,
    target: &str,
    event: &str,
    name: &crate::text::JsText,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if observer == target
        || core
            .state
            .physical
            .entities
            .get(observer)
            .is_none_or(|entity| entity.actor.is_none())
        || core.state.physical.entities.get(target).is_none()
    {
        return Ok(());
    }
    let names = reader(core, observer)?;
    let target_actor = core
        .state
        .physical
        .entities
        .get(target)
        .is_some_and(|entity| entity.actor.is_some());
    let permitted = if target_actor {
        names.remembered(target)
            || names
                .current_body_association(target)?
                .and_then(|subject| names.observer_individual(subject))
                .is_some_and(|identity| identity.canonical_id.as_deref() == Some(target))
    } else {
        names.current_body_grant(target)?.is_some()
    };
    if !permitted {
        return Ok(());
    }
    let prior = names.identity_for_entity(target);
    if prior.is_some_and(|identity| &identity.given_name == name) {
        return Ok(());
    }
    let episode = names.episode(target);
    let extra = target
        .len()
        .checked_add(episode.map_or(0, String::len))
        .and_then(|n| n.checked_add(64))
        .ok_or(ExecutionError::Capacity)?;
    let _extra_reservation = budget.reserve(extra)?;
    let (mut candidate, _candidate_reservation) = if let Some(prior) = prior {
        clone_identity(prior, name, budget)?
    } else {
        let reservation = budget.reserve(name.storage_bytes())?;
        (
            ObserverIdentity {
                retained: None,
                familiarity: None,
                individual_id: None,
                canonical_id: None,
                seed_only: None,
                voice: None,
                sight: None,
                name_evidence_ids: None,
                given_name: name.clone(),
                nickname: None,
                revision: 0,
                encounter_id: None,
                authored: false,
            },
            reservation,
        )
    };
    candidate.encounter_id = episode.cloned();
    candidate.canonical_id = Some(target.to_owned());
    candidate.revision = candidate
        .revision
        .checked_add(1)
        .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)?;
    drop(names);
    // Source allocates the individual before attempting evidence admission,
    // including when the subsequent quota refuses the requested name.
    if candidate.individual_id.is_none() {
        let issued = core
            .state
            .physical
            .identity
            .allocate_entity("individual", |id| {
                core.state
                    .reception
                    .observer_identities
                    .as_ref()
                    .and_then(|owners| owners.get(observer))
                    .is_some_and(|records| records.contains_key(id))
            })?;
        candidate.individual_id = Some(issued.id);
    }
    let key = candidate
        .individual_id
        .as_deref()
        .ok_or(ExecutionError::Invariant)?;
    let _key_reservation = budget.reserve(key.len())?;
    let key = key.to_owned();
    let Some(held) = retain_name_evidence(core, observer, event, None, budget)? else {
        return Ok(());
    };
    let super::name_evidence::HeldNameEvidence {
        ids,
        created,
        reservation: _evidence_reservation,
    } = held;
    candidate.name_evidence_ids = Some(ids);
    if commit_observer_identity(core, observer, &key, candidate, budget)? {
        core.journal
            .recognition
            .advance_revision(&mut core.state.reception, observer)?;
    } else {
        release_created(core, observer, created.as_deref(), budget)?;
    }
    Ok(())
}
pub(crate) fn learn_heard_introductions(
    core: &mut CoreMutation<'_>,
    heard: &HeardIntroductions,
    acquired: &[Awareness],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    for index in heard.evidence_indices() {
        let evidence = acquired.get(index).ok_or(ExecutionError::Invariant)?;
        if evidence.event_id != heard.event_id() {
            return Err(ExecutionError::Invariant);
        }
        let observer = &evidence.actor_id;
        let names = reader(core, observer)?;
        let body = if let Some(binding) = &evidence.source_body {
            let current = names.current_body_grant(&binding.entity_id)?;
            if current.is_some_and(|(lease, life)| {
                Some(lease) == binding.lease_id.as_deref() && life == Some(binding.physical_life)
            }) {
                names
                    .current_body_association(&binding.entity_id)?
                    .or(names.current_body_local_subject(&binding.entity_id)?)
            } else {
                None
            }
        } else {
            None
        };
        let subject = evidence.source_subject.as_ref().or(body);
        let subject_bytes = subject
            .map_or(Some(0), HeapBytes::heap_bytes)
            .ok_or(ExecutionError::Capacity)?;
        let _subject_reservation = budget.reserve(subject_bytes)?;
        let subject = subject.cloned();
        drop(names);
        if let Some(subject) = subject {
            match &subject {
                ObserverSubject::Individual { .. } => assign_individual(
                    core,
                    observer,
                    &subject,
                    heard.event_id(),
                    heard.name(),
                    budget,
                )?,
                ObserverSubject::Entity { entity_id } => assign_entity(
                    core,
                    observer,
                    entity_id,
                    heard.event_id(),
                    heard.name(),
                    budget,
                )?,
            }
        } else {
            let _key_reservation = budget.reserve(heard.event_id().len() + "voice-seed-".len())?;
            let key = format!("voice-seed-{}", heard.event_id());
            let Some(seed) = core
                .state
                .reception
                .observer_identities
                .as_ref()
                .and_then(|owners| owners.get(observer))
                .and_then(|records| records.get(&key))
                .filter(|seed| seed.seed_only == Some(true))
            else {
                continue;
            };
            let (mut candidate, _candidate_reservation) =
                clone_identity(seed, heard.name(), budget)?;
            let Some(held) =
                retain_name_evidence(core, observer, heard.event_id(), Some(evidence), budget)?
            else {
                continue;
            };
            let super::name_evidence::HeldNameEvidence {
                ids,
                created,
                reservation: _evidence_reservation,
            } = held;
            candidate.name_evidence_ids = Some(ids);
            if !commit_observer_identity(core, observer, &key, candidate, budget)? {
                release_created(core, observer, created.as_deref(), budget)?;
            }
            // A voice seed is still a provisional sample. Source changes no
            // identity revision or knowledge revision at this branch.
        }
    }
    Ok(())
}
