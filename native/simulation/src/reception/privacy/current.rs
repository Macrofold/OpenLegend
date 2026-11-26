//! Source-keyed withdrawal closes only the selected members before the sole
//! setter removes them. Other fields and their received measurements survive.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::received::{ReceivedValueFragment, TemporalChange};
use std::mem::size_of;
use std::sync::Arc;
struct Address {
    subject: String,
    kind: String,
    channel: DefinitionPin,
    correspondence: bool,
}
fn original_revoked(
    field: CurrentNativeFacet<'_>,
    affected: &IndexSet<String>,
    recognition: &IndexSet<String>,
    values: &impl ReceivedValueLookup,
    meaning: &impl crate::experience::PersonalEvidenceMeaning,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let original = field.original_source;
    let _alias = budget.reserve(
        original
            .id
            .len()
            .checked_mul(12)
            .and_then(|n| n.checked_add(128))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    if affected.contains(&original.id)
        || affected.contains(&crate::experience::personal_fact_alias(
            &original.id,
            field.field.original_ordinal,
        )?)
        || matches!(&original.origin, ObservationOrigin::Occurrence { event_id, .. } if affected.contains(event_id))
    {
        return Ok(true);
    }
    if field.field.value.kind != "association" {
        return Ok(false);
    }
    let Some(ReceivedValueFragment::Sensory(SensoryFacet::Association {
        learning_support, ..
    })) = values.value_at(&field.field.value.reference)
    else {
        return Err(ExecutionError::Invariant);
    };
    let _support = budget.reserve(
        values
            .value_at(&field.field.value.reference)
            .and_then(HeapBytes::heap_bytes)
            .and_then(|n| n.checked_mul(4))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(recognition.contains(&original.id)
        || meaning
            .recognition_source_ids(learning_support.as_deref().unwrap_or(&[]))
            .iter()
            .any(|id| recognition.contains(id)))
}
fn correspondence(kind: &str) -> bool {
    !matches!(
        kind,
        "location"
            | "observed-motion"
            | "surface-patch"
            | "physical-boundary"
            | "description"
            | "carried"
            | "public-attributes"
    )
}
pub(super) fn revoke_current(
    core: &mut CoreMutation<'_>,
    observer: &str,
    affected: &IndexSet<String>,
    recognition: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(owner) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
    else {
        return Ok(());
    };
    let count = owner
        .current
        .values()
        .try_fold(0usize, |n, contact| {
            n.checked_add(contact.content.field_order.len())
        })
        .ok_or(ExecutionError::Capacity)?;
    let bytes = owner
        .current
        .iter()
        .try_fold(0usize, |n, (subject, contact)| {
            heap_sum([
                n,
                subject
                    .len()
                    .checked_mul(contact.content.field_order.len())?,
                contact.content.field_order.heap_bytes()?,
                contact
                    .content
                    .field_order
                    .len()
                    .checked_mul(size_of::<Address>() + size_of::<CurrentFacetAddress>())?,
            ])
        })
        .and_then(|n| n.checked_add(map_storage::<String, ()>(count.checked_mul(4)?)?))
        .ok_or(ExecutionError::Capacity)?;
    let bytes = bytes
        .checked_add(
            owner
                .current
                .len()
                .checked_mul(2 * size_of::<usize>())
                .ok_or(ExecutionError::Capacity)?,
        )
        .and_then(|n| n.checked_add(observer.len()))
        .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let mut contacts = owner.current.iter().collect::<Vec<_>>();
    contacts.sort_by_key(|(_, contact)| contact.order);
    let mut addresses = Vec::new();
    addresses
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    let values = &core.state.reception.received_values.as_ref();
    let meaning = core.state.installed.account_law();
    for (subject, contact) in contacts {
        for identity in &contact.content.field_order {
            let (kind, id, version, digest): (String, String, u64, String) =
                serde_json::from_str(identity).map_err(|_| ExecutionError::Invariant)?;
            let channel = DefinitionPin {
                id,
                version,
                digest,
            };
            let Some(field) = current_contact_native_facet(
                contact,
                &kind,
                CurrentFacetSelector {
                    channel: Some(&channel),
                    ..Default::default()
                },
            )?
            else {
                continue;
            };
            if original_revoked(field, affected, recognition, values, &meaning, budget)? {
                addresses.push(Address {
                    subject: subject.clone(),
                    correspondence: correspondence(&kind),
                    kind,
                    channel,
                });
            }
        }
    }
    let life = owner.life;
    let observer_life = ObserverLife {
        actor_id: observer.to_owned(),
        physical_life: life,
    };
    // Source removeCurrentFacets owns this lifetime even for an empty selected
    // key set. Entering it performs the real owner() sequence reset; skipping
    // it would retain old transient originals and their shared-value uses.
    let transition = core
        .journal
        .acquisitions
        .begin_received(observer, life, None)?;
    let mut lifetime = CurrentReceptionLifetime::begin(core, &observer_life, None, None, budget)?;
    lifetime.ensure_prefix(core, budget)?;
    let refs = addresses
        .iter()
        .map(|address| CurrentFacetAddress {
            subject_id: &address.subject,
            kind: &address.kind,
            channel: Some(&address.channel),
        })
        .collect::<Vec<_>>();
    materialize_current_checks(
        &mut core.journal.current,
        &mut core.state.reception,
        observer,
        &refs,
    )?;
    let mut withdrawn = IndexSet::new();
    let mut geometry = IndexSet::new();
    let mut correspondences = IndexSet::new();
    let mut retired = IndexSet::new();
    let mut need_sight = CurrentCheck::None;
    for address in &addresses {
        withdrawn.insert(address.subject.clone());
        if matches!(address.kind.as_str(), "body" | "location") {
            geometry.insert(address.subject.clone());
        }
        if address.correspondence {
            correspondences.insert(address.subject.clone());
        }
        let owner = core
            .state
            .reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer))
            .ok_or(ExecutionError::Invariant)?;
        if owner
            .visual_confirmation
            .as_ref()
            .is_some_and(|confirmation| confirmation.channel == address.channel)
        {
            if matches!(address.kind.as_str(), "body" | "location")
                && owner
                    .motion_samples
                    .as_ref()
                    .is_some_and(|samples| samples.contains_key(&address.subject))
            {
                retired.insert(address.subject.clone());
            }
            let field = current_native_facet_at(
                Some(owner),
                &address.subject,
                &address.kind,
                CurrentFacetSelector {
                    channel: Some(&address.channel),
                    ..Default::default()
                },
            )?;
            if field.is_some_and(|field| field.grant.modality == Modality::Sight) {
                let check = if matches!(
                    address.kind.as_str(),
                    "description" | "carried" | "pile-contents" | "public-attributes"
                ) {
                    CurrentCheck::Detail
                } else {
                    CurrentCheck::Broad
                };
                if check == CurrentCheck::Broad || need_sight == CurrentCheck::None {
                    need_sight = check;
                }
            }
        }
        core.journal.current.set_visual_measurement(
            &mut core.state.reception,
            observer,
            &address.subject,
            None,
        )?;
        current_recording::close_current_member_history(
            core,
            observer,
            &address.subject,
            &address.kind,
            &address.channel,
            TemporalChange::Unchecked,
            budget,
        )?;
        current_facet_set(
            &mut core.journal.current,
            &mut core.state.reception,
            observer,
            CurrentFacetAddress {
                subject_id: &address.subject,
                kind: &address.kind,
                channel: Some(&address.channel),
            },
            None,
        )?;
        lifetime.note(&address.subject, true)?;
    }
    if let Some(before) = &lifetime.before {
        for source in &correspondences {
            if before.correspondence_changed(
                &core.state.reception,
                &core.state.experience,
                source,
                budget,
            )? {
                reconcile_current_cohort(core, Arc::clone(before), None, budget)?;
                lifetime.reconciled = true;
            }
        }
    }
    phase::retire_motion_subjects(core, observer, retired.iter().map(String::as_str))?;
    if prune_withdrawn_attention(
        &core.state.physical,
        &mut core.state.reception,
        &core.state.installed,
        &core.state.experience,
        &mut core.journal.current,
        observer,
        Some(&withdrawn),
        Some(&geometry),
    )? {
        lifetime.reconciled = false;
    }
    if need_sight != CurrentCheck::None {
        core.journal.sensory.request_sight_work(
            &mut core.state.reception,
            core.state.physical.header.sim_time,
            observer,
            need_sight,
            core.state.installed.maximum_change_scopes,
        )?;
    }
    lifetime.finish(core, budget)?;
    retirement::finish_received(core, transition)?;
    revoke_motion(core, observer, affected, budget)
}
fn revoke_motion(
    core: &mut CoreMutation<'_>,
    observer: &str,
    affected: &IndexSet<String>,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let Some(samples) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .and_then(|owner| owner.motion_samples.as_ref())
    else {
        return Ok(());
    };
    let _storage = budget.reserve(
        samples
            .keys()
            .try_fold(
                samples
                    .len()
                    .checked_mul(size_of::<String>())
                    .ok_or(ExecutionError::Capacity)?,
                |n, key| n.checked_add(key.len()),
            )
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut retired = Vec::new();
    retired
        .try_reserve_exact(samples.len())
        .map_err(|_| ExecutionError::Capacity)?;
    for (subject, track) in samples {
        let earlier = &track.earlier;
        if affected.contains(&earlier.original.id)
            || affected.contains(&crate::experience::personal_fact_alias(
                &earlier.original.id,
                earlier.original.ordinal,
            )?)
            || affected.contains(&earlier.confirmation.id)
            || earlier
                .aliases
                .iter()
                .flatten()
                .any(|id| affected.contains(id))
        {
            retired.push(subject.clone());
        }
    }
    phase::retire_motion_subjects(core, observer, retired.iter().map(String::as_str))?;
    Ok(())
}
