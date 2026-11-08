//! Ending a receiver closes its real history and current ownership before a
//! restrictive status can publish its occupying action or lifecycle event.
use super::*;
use crate::attention::AttentionRelationFamily;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::TemporalChange;
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};
pub(crate) struct EndedCurrentEvidence {
    observer_id: String,
    physical_life: u64,
    at: f64,
    _reservation: ByteReservation,
}
impl EndedCurrentEvidence {
    pub(crate) fn observer_id(&self) -> &str {
        &self.observer_id
    }
    pub(crate) fn physical_life(&self) -> u64 {
        self.physical_life
    }
    pub(crate) fn at(&self) -> f64 {
        self.at
    }
}
fn invalid() -> ExecutionError {
    crate::received::ReceivedError(
        "Current evidence cannot finish without its actual receiver and history owners.",
    )
    .into()
}
struct Address {
    subject: String,
    kind: String,
    channel: DefinitionPin,
}
fn owner<'a>(core: &'a CoreMutation<'_>, observer: &str) -> Option<&'a PerceptionEvidenceOwner> {
    core.state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
}
pub(super) fn finish_received(
    core: &mut CoreMutation<'_>,
    lease: crate::execution::ReceivedLease,
) -> Result<(), ExecutionError> {
    if let Some(values) = core.state.reception.received_values.as_ref() {
        core.journal.acquisitions.finish_received(
            lease,
            &mut core.state.temporal,
            values,
            &mut core.state.physical.identity,
            &crate::worlds::InstalledEvidenceMeaning,
            &mut core.journal.meters,
        )
    } else {
        core.journal.acquisitions.finish_empty_received(lease)
    }
}
fn end_geometry(
    core: &mut CoreMutation<'_>,
    observer: &str,
    life: u64,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if owner(core, observer).is_some_and(|owner| owner.geometry.is_some() && owner.life != life) {
        return Err(invalid());
    }
    super::geometry::end_received_geometry(core, observer, budget)
}
/// Full ordinary end (zero episode grace), used by perception-restricting
/// statuses. Targeted/modality-specific loss remains the detector's operation.
pub(crate) fn end_current_evidence(
    core: &mut CoreMutation<'_>,
    observer: &str,
    budget: &ByteBudget,
) -> Result<EndedCurrentEvidence, ExecutionError> {
    let life = core
        .state
        .physical
        .entities
        .get(observer)
        .and_then(|entity| entity.physical_life())
        .ok_or(ExecutionError::MissingActor)?;
    end_current_for_life(core, observer, life, budget)
}
fn end_current_for_life(
    core: &mut CoreMutation<'_>,
    observer: &str,
    life: u64,
    budget: &ByteBudget,
) -> Result<EndedCurrentEvidence, ExecutionError> {
    let entity = core
        .state
        .physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::MissingActor)?;
    let at = core.state.physical.header.sim_time;
    let proof_reservation = budget.reserve(
        size_of::<EndedCurrentEvidence>()
            .checked_add(observer.len())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let Some(current) = owner(core, observer) else {
        return Ok(EndedCurrentEvidence {
            observer_id: observer.to_owned(),
            physical_life: life,
            at,
            _reservation: proof_reservation,
        });
    };
    let has_work = !current.current.is_empty()
        || current.geometry.is_some()
        || current
            .motion_samples
            .as_ref()
            .is_some_and(|motion| !motion.is_empty())
        || !current.gaps.is_empty()
        || current
            .attention
            .as_ref()
            .is_some_and(|attention| !attention.annotations.is_empty());
    if !has_work {
        return Ok(EndedCurrentEvidence {
            observer_id: observer.to_owned(),
            physical_life: life,
            at,
            _reservation: proof_reservation,
        });
    }
    // A retired old-life owner may remain as an empty historical header.
    // Source cleanup returns before comparing lives when there is no end work.
    if current.life != life {
        return Err(invalid());
    }
    if entity.physical_life() == Some(life) {
        // Source receiveCurrentChange enters the current sequence even when
        // ending perception leaves no eligible receiver for the next event.
        // Old-life retirement must keep its old owner until that life closes.
        core.journal
            .originals
            .ensure_owner(
                &mut core.state.reception,
                entity,
                core.state.physical.header.sequence,
            )
            .map_err(ExecutionError::Received)?;
    }
    let current = owner(core, observer).ok_or_else(invalid)?;
    let mut count = 0usize;
    let mut bytes = current
        .current
        .len()
        .checked_mul(size_of::<(&String, &CurrentContact)>())
        .ok_or(ExecutionError::Capacity)?;
    for (id, contact) in &current.current {
        count = count
            .checked_add(contact.content.field_order.len())
            .ok_or(ExecutionError::Capacity)?;
        bytes = heap_sum([
            bytes,
            id.len()
                .checked_mul(contact.content.field_order.len())
                .ok_or(ExecutionError::Capacity)?,
            contact
                .content
                .field_order
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            contact
                .content
                .groups
                .iter()
                .try_fold(0usize, |sum, group| {
                    heap_sum([sum, group.received.heap_bytes()?])
                })
                .ok_or(ExecutionError::Capacity)?,
            contact
                .content
                .field_order
                .len()
                .checked_mul(
                    size_of::<Address>()
                        + size_of::<ObserverSubject>()
                        + size_of::<CurrentFacetAddress>(),
                )
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
    }
    bytes = heap_sum([
        bytes,
        map_storage::<String, ()>(count.checked_mul(2).ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let _scratch = budget.reserve(bytes)?;
    let mut contacts = Vec::new();
    contacts
        .try_reserve_exact(current.current.len())
        .map_err(|_| ExecutionError::Capacity)?;
    contacts.extend(current.current.iter());
    contacts.sort_by_key(|(_, contact)| contact.order);
    let mut addresses = Vec::new();
    addresses
        .try_reserve_exact(count)
        .map_err(|_| ExecutionError::Capacity)?;
    let mut lost = IndexSet::new();
    lost.try_reserve(count)
        .map_err(|_| ExecutionError::Capacity)?;
    for (subject, contact) in contacts {
        for identity in &contact.content.field_order {
            let (kind, id, version, digest): (String, String, u64, String) =
                serde_json::from_str(identity).map_err(|_| invalid())?;
            let channel = DefinitionPin {
                id,
                version,
                digest,
            };
            let field = current_contact_native_facet(
                contact,
                &kind,
                CurrentFacetSelector {
                    channel: Some(&channel),
                    ..Default::default()
                },
            )?;
            if let Some(field) = field {
                if kind == "body" {
                    if let Some(ObserverSubject::Individual { individual_id }) =
                        &field.field.local_subject
                    {
                        lost.insert(individual_id.clone());
                    }
                }
                addresses.push(Address {
                    subject: subject.clone(),
                    kind,
                    channel,
                });
            }
        }
    }
    let before = CurrentCohort::capture(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer,
        budget,
    )?;
    let frame = entity.world_position().map(|position| ObservationFrame {
        position_at_observation: position,
        forward_at_observation: Some(entity.spatial.heading),
    });
    let acquisition = core
        .journal
        .acquisitions
        .begin_acquisition(observer, life, frame)?;
    let prefix = core
        .journal
        .current
        .begin_batch(&core.state.reception, observer)?;
    end_geometry(core, observer, life, budget)?;
    let transition = core
        .journal
        .acquisitions
        .begin_received(observer, life, None)?;
    let mut addresses_ref = Vec::new();
    addresses_ref
        .try_reserve_exact(addresses.len())
        .map_err(|_| ExecutionError::Capacity)?;
    addresses_ref.extend(addresses.iter().map(|address| CurrentFacetAddress {
        subject_id: &address.subject,
        kind: &address.kind,
        channel: Some(&address.channel),
    }));
    materialize_current_checks(
        &mut core.journal.current,
        &mut core.state.reception,
        observer,
        &addresses_ref,
    )?;
    for address in &addresses {
        super::current_recording::close_current_member_history(
            core,
            observer,
            &address.subject,
            &address.kind,
            &address.channel,
            TemporalChange::Loss,
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
    }
    finish_received(core, transition)?;
    if core
        .journal
        .current
        .retire_motion(&mut core.state.reception, observer)?
    {
        attention_control::dirty_attention_relations(
            &core.state.physical,
            &mut core.state.reception,
            &mut core.journal.current,
            observer,
            &[
                AttentionRelationFamily::ClosingBody,
                AttentionRelationFamily::ClosingDrop,
            ],
        )?;
    }
    core.journal
        .current
        .clear_gaps(&mut core.state.reception, observer)?;
    prune_withdrawn_attention(
        &core.state.physical,
        &mut core.state.reception,
        &core.state.installed,
        &core.state.experience,
        &mut core.journal.current,
        observer,
        None,
        None,
    )?;
    crate::worlds::prune_selected_observer_individuals(
        core,
        observer,
        &lost,
        crate::worlds::IndividualPruneMode::CurrentLoss,
        budget,
    )?;
    if let Some(before) = before {
        reconcile_current_cohort(core, Arc::clone(&before), None, budget)?;
    }
    if prefix.owns_prefix() {
        if let Some(values) = core.state.reception.received_values.as_ref() {
            core.journal.acquisitions.flush_acquisition(
                acquisition,
                &mut core.state.temporal,
                values,
                &mut core.state.physical.identity,
                &crate::worlds::InstalledEvidenceMeaning,
                &mut core.journal.meters,
            )?;
        } else if core.journal.acquisitions.pending_charge(observer)? != (0, 0) {
            return Err(invalid());
        }
    }
    core.journal
        .current
        .finish_batch(&mut core.state.reception, prefix)?;
    if let Some(values) = core.state.reception.received_values.as_ref() {
        core.journal.acquisitions.finish_acquisition(
            acquisition,
            &mut core.state.temporal,
            values,
            &mut core.state.physical.identity,
            &crate::worlds::InstalledEvidenceMeaning,
            &mut core.journal.meters,
        )?;
    } else {
        core.journal
            .acquisitions
            .finish_empty_acquisition(acquisition)?;
    }
    Ok(EndedCurrentEvidence {
        observer_id: observer.to_owned(),
        physical_life: life,
        at,
        _reservation: proof_reservation,
    })
}

/// A completed old receiving life is distinct from an ordinary current loss.
/// Physical replacement may already have advanced; all terminals above remain
/// bound to the actual old received owner and its existing temporal epoch.
pub(crate) struct RetiredPerceptionLife {
    observer_id: String,
    physical_life: u64,
    at: f64,
    _reservation: ByteReservation,
}
impl RetiredPerceptionLife {
    pub(crate) fn observer_id(&self) -> &str {
        &self.observer_id
    }
    pub(crate) fn physical_life(&self) -> u64 {
        self.physical_life
    }
    pub(crate) fn at(&self) -> f64 {
        self.at
    }
}
pub(crate) fn retire_perception_life(
    core: &mut CoreMutation<'_>,
    observer: &str,
    old_life: u64,
    budget: &ByteBudget,
) -> Result<RetiredPerceptionLife, ExecutionError> {
    if owner(core, observer).is_some_and(|owner| owner.life != old_life)
        || core
            .state
            .temporal
            .actor(observer)
            .is_some_and(|actor| actor.header().physical_life != old_life)
    {
        return Err(invalid());
    }
    let mut ended = end_current_for_life(core, observer, old_life, budget)?;
    core.state
        .temporal
        .clear_recording_reservations(observer, old_life)?;
    ended._reservation.resize(
        size_of::<RetiredPerceptionLife>()
            .checked_add(ended.observer_id.capacity())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(RetiredPerceptionLife {
        observer_id: ended.observer_id,
        physical_life: ended.physical_life,
        at: ended.at,
        _reservation: ended._reservation,
    })
}
