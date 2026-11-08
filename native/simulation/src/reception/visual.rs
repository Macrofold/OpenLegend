//! A proved native sight phase acquires real current facts. Memory observers
//! additionally need scene/attention finalizers; they cannot use the native-only
//! completion below to bypass those duties.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    ReceivedError, ReceivedValueFragment, ReceivedValueReference, TemporalChange,
    retain_received_value,
    values::{FrameFragment, FrameKind},
};
use crate::work::WorkUnit;
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};

mod sample;
use sample::receive_subject;
fn invalid() -> ExecutionError {
    ReceivedError("Visual reception lost its actual sight or current owner.").into()
}
fn owner<'a>(
    core: &'a CoreMutation<'_>,
    observer: &str,
) -> Result<&'a PerceptionEvidenceOwner, ExecutionError> {
    core.state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|s| s.get(observer))
        .ok_or_else(invalid)
}
pub(super) struct VisualReception {
    observer: ObserverLife,
    channel: DefinitionPin,
    detector: DetectorIdentity,
    frame: ObservationFrame,
    frame_ref: ReceivedValueReference,
    prior: Option<VisualConfirmation>,
    frame_changed: bool,
    revision: u64,
    input_revision: u64,
    unchecked: IndexSet<String>,
    retired_motion: IndexSet<String>,
    lost_individuals: IndexSet<String>,
    current: CurrentReceptionLifetime,
    reservation: ByteReservation,
}
/// Only this real producer can return a completed memoryless sight cut. It
/// makes no claim that personal attention or received scene geometry completed.
pub(crate) struct CompletedNativeVisual {
    observer: ObserverLife,
    at: f64,
    input_revision: u64,
    _reservation: ByteReservation,
}
impl CompletedNativeVisual {
    pub(crate) fn observer(&self) -> &ObserverLife {
        &self.observer
    }
    pub(crate) fn at(&self) -> f64 {
        self.at
    }
    pub(crate) fn input_revision(&self) -> u64 {
        self.input_revision
    }
}
pub(crate) fn receive_native_visual(
    core: &mut CoreMutation<'_>,
    sight: &SightResults,
    budget: &ByteBudget,
) -> Result<CompletedNativeVisual, ExecutionError> {
    let observer = core
        .state
        .physical
        .entities
        .get(&sight.observer().actor_id)
        .ok_or(ExecutionError::MissingActor)?;
    if observer.has_memory() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if observer.physical_life() != Some(sight.observer().physical_life) {
        return Err(invalid());
    }
    let detector = selected_senses(&core.state.installed, observer)
        .find_map(|sense| match sense {
            SenseDefinition::VisionGeometry { id, version, .. } => Some(DetectorIdentity {
                id: id.clone(),
                version: *version,
            }),
            _ => None,
        })
        .ok_or(ExecutionError::UnsupportedFamily)?;
    let channel = core
        .state
        .installed
        .senses
        .get(&detector.id)
        .ok_or_else(invalid)?
        .pin()
        .clone();
    let frame = ObservationFrame {
        position_at_observation: observer
            .world_position()
            .ok_or(ExecutionError::InvalidPosition)?,
        forward_at_observation: Some(observer.spatial.heading),
    };
    let now = core.state.physical.header.sim_time;
    core.journal.originals.ensure_owner(
        &mut core.state.reception,
        observer,
        core.state.physical.header.sequence,
    )?;
    let prior = &owner(core, &sight.observer().actor_id)?.visual_confirmation;
    let frame_changed = prior.as_ref().is_none_or(|prior| {
        prior.channel != channel
            || received_observation_frame(
                &core.state.reception.received_values.as_ref(),
                &prior.frame_ref,
            )
            .map_or(true, |old| old != &frame)
    });
    let bytes = heap_sum([
        size_of::<VisualReception>(),
        sight
            .observer()
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        channel.heap_bytes().ok_or(ExecutionError::Capacity)?,
        detector.heap_bytes().ok_or(ExecutionError::Capacity)?,
        prior.heap_bytes().ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut reservation = budget.reserve(bytes)?;
    let prior = prior.clone();
    let revision = prior
        .as_ref()
        .map_or(0, |p| p.revision)
        .checked_add(1)
        .filter(|n| *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)?;
    let retained = retain_received_value(
        &mut core.state.reception.received_values,
        ReceivedValueFragment::Frame(FrameFragment {
            kind: FrameKind::Frame,
            frame: frame.clone(),
        }),
        None,
        now,
        core.state.physical.header.sequence,
        &mut core.state.physical.identity,
        &core.state.activity.display,
    )?;
    if retained.added_bytes > 0 {
        core.journal
            .meters
            .charge(&[(WorkUnit::OutputBytes, retained.added_bytes)])?;
    }
    reservation.resize(
        reservation
            .bytes()
            .checked_add(
                retained
                    .reference
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut current = CurrentReceptionLifetime::begin(core, sight.observer(), None, None, budget)?;
    current.ensure_prefix(core, budget)?;
    let mut phase = VisualReception {
        observer: sight.observer().clone(),
        channel,
        detector,
        frame,
        frame_ref: retained.reference,
        prior,
        frame_changed,
        revision,
        input_revision: core
            .state
            .reception
            .sensory
            .as_ref()
            .map_or(0, |s| s.revision),
        unchecked: IndexSet::new(),
        retired_motion: IndexSet::new(),
        lost_individuals: IndexSet::new(),
        current,
        reservation,
    };
    phase.receive_losses(core, sight, budget)?;
    for (id, seen) in sight.iter() {
        if seen && id != phase.observer.actor_id {
            receive_subject(&mut phase, core, id, sight, false, budget)?;
        }
    }
    let complete = Some(CurrentSightStamp {
        through: now,
        revision: phase.revision,
        input_revision: phase.input_revision,
        frame_ref: phase.frame_ref.clone(),
        received_order: core
            .state
            .physical
            .identity
            .allocate("received-sample")?
            .sequence,
    });
    core.journal.current.replace_visual_confirmation(
        &mut core.state.reception,
        &phase.observer.actor_id,
        VisualConfirmation {
            channel: phase.channel.clone(),
            through: now,
            revision: phase.revision,
            complete,
            frame_ref: phase.frame_ref.clone(),
            frame_revision: if phase.frame_changed {
                phase.revision
            } else {
                phase.prior.as_ref().ok_or_else(invalid)?.frame_revision
            },
        },
    )?;
    for id in &phase.retired_motion {
        core.journal.current.set_motion(
            &mut core.state.reception,
            &phase.observer.actor_id,
            id,
            None,
        )?;
    }
    crate::worlds::base_recognition::prune_lost_body_individuals(
        core,
        &phase.observer.actor_id,
        &phase.lost_individuals,
        budget,
    )?;
    core.journal
        .current
        .refresh_motion_expiry(&mut core.state.reception, &phase.observer.actor_id)?;
    phase.current.finish(core, budget)?;
    let VisualReception {
        observer,
        input_revision,
        mut reservation,
        channel,
        detector,
        frame,
        frame_ref,
        prior,
        unchecked,
        retired_motion,
        lost_individuals,
        current,
        ..
    } = phase;
    drop((
        channel,
        detector,
        frame,
        frame_ref,
        prior,
        unchecked,
        retired_motion,
        lost_individuals,
        current,
    ));
    reservation.resize(
        size_of::<CompletedNativeVisual>()
            + observer.heap_bytes().ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(CompletedNativeVisual {
        observer,
        at: now,
        input_revision,
        _reservation: reservation,
    })
}

struct Address {
    subject: String,
    kind: String,
    channel: DefinitionPin,
}
impl VisualReception {
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn receive_losses(
        &mut self,
        core: &mut CoreMutation<'_>,
        sight: &SightResults,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let now = core.state.physical.header.sim_time;
        let current = owner(core, &self.observer.actor_id)?;
        let bound = current
            .current
            .iter()
            .try_fold(0usize, |sum, (id, c)| {
                heap_sum([
                    sum,
                    id.len().checked_mul(8)?,
                    super::current_journal::contact_copy_heap(c)
                        .ok()?
                        .checked_mul(3)?,
                    c.content
                        .field_order
                        .len()
                        .checked_mul(size_of::<Address>() + size_of::<CurrentGroupCoverage>())?,
                ])
            })
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(bound)?;
        let mut contacts: Vec<_> = owner(core, &self.observer.actor_id)?
            .current
            .iter()
            .collect();
        contacts.sort_by_key(|(_, c)| c.order);
        let mut lost = Vec::new();
        let mut unchecked: Vec<(f64, Vec<CurrentGroupCoverage>)> = Vec::new();
        let expired: Vec<_> = owner(core, &self.observer.actor_id)?
            .gaps
            .iter()
            .filter(|(_, g)| g.through < now)
            .map(|(id, _)| id.clone())
            .collect();
        for (id, contact) in contacts {
            let body = current_contact_native_facet(
                contact,
                "body",
                CurrentFacetSelector {
                    channel: Some(&self.channel),
                    ..Default::default()
                },
            )?;
            let checked = body
                .map(|b| -> Result<_, ExecutionError> {
                    Ok(effective_current_check(
                        owner(core, &self.observer.actor_id)?,
                        b.grant,
                        b.metadata,
                        true,
                    )?)
                })
                .transpose()?
                .flatten();
            let invalidated = if self.prior.is_some() {
                core.state.reception.sensory.as_ref().and_then(|pending| {
                    [
                        (pending.invalidated_at, pending.invalidated_revision),
                        pending
                            .scopes
                            .get(&self.observer.actor_id)
                            .map_or((None, None), |s| (s.invalidated_at, s.invalidated_revision)),
                        pending
                            .scopes
                            .get(id)
                            .map_or((None, None), |s| (s.invalidated_at, s.invalidated_revision)),
                    ]
                    .into_iter()
                    .filter(|(at, revision)| {
                        at.is_some()
                            && revision.is_some_and(|revision| {
                                checked.is_none_or(|c| revision > c.input_revision)
                            })
                    })
                    .filter_map(|(at, _)| at)
                    .min_by(f64::total_cmp)
                    .map(|at| at.max(checked.map_or(0.0, |c| c.through)))
                })
            } else {
                None
            };
            let exposures: IndexSet<_> =
                contact
                    .content
                    .groups
                    .iter()
                    .filter(|group| {
                        let grant = &group.received.grant;
                        (grant.channel == self.channel
                            || self
                                .prior
                                .as_ref()
                                .is_some_and(|p| p.channel == grant.channel))
                            && (group.received.fields.contains_key("body")
                                || contact.content.originals.get(&grant.original).is_some_and(
                                    |s| s.facets.iter().any(|f| f.value.kind == "body"),
                                ))
                    })
                    .map(|g| g.received.grant.exposure.as_str())
                    .collect();
            for group in &contact.content.groups {
                let grant = &group.received.grant;
                if grant.modality != Modality::Sight
                    || !exposures.contains(grant.exposure.as_str())
                    || !(grant.channel == self.channel
                        || self
                            .prior
                            .as_ref()
                            .is_some_and(|p| p.channel == grant.channel))
                {
                    continue;
                }
                if let Some(at) = invalidated {
                    self.unchecked.insert(id.clone());
                    self.retired_motion.insert(id.clone());
                    let coverage = CurrentGroupCoverage {
                        subject_id: id.clone(),
                        identity: CurrentGroupIdentity::of(group),
                        kinds: None,
                    };
                    if let Some((_, groups)) = unchecked.iter_mut().find(|(held, _)| *held == at) {
                        groups.push(coverage)
                    } else {
                        unchecked.push((at, vec![coverage]));
                    }
                }
                let eligible = if sight.seen(id) == Some(true) && id != &self.observer.actor_id {
                    core.state
                        .physical
                        .entities
                        .get(id)
                        .map(|e| e.physical_life())
                } else {
                    None
                };
                if Some(grant.subject_physical_life) == eligible && grant.channel == self.channel {
                    continue;
                }
                if let Some(ObserverSubject::Individual { individual_id }) = group
                    .received
                    .fields
                    .get("body")
                    .and_then(|f| f.local_subject.as_ref())
                {
                    self.lost_individuals.insert(individual_id.clone());
                }
                for kind in group.received.fields.keys() {
                    lost.push(Address {
                        subject: id.clone(),
                        kind: kind.clone(),
                        channel: grant.channel.clone(),
                    });
                }
            }
        }
        for id in expired {
            core.journal.current.set_gap(
                &mut core.state.reception,
                &self.observer.actor_id,
                &id,
                None,
            )?;
        }
        for (at, coverage) in unchecked {
            current_set_unchecked(
                &mut core.journal.current,
                &mut core.state.reception,
                &self.observer.actor_id,
                &coverage,
                at,
            )?;
        }
        for id in &self.retired_motion {
            core.journal.current.set_motion(
                &mut core.state.reception,
                &self.observer.actor_id,
                id,
                None,
            )?;
        }
        let grace = core
            .state
            .installed
            .observation_rules
            .value()
            .sighting
            .episode_grace_seconds
            * core
                .state
                .installed
                .content
                .time_policy
                .normal_game_seconds_per_second;
        for address in lost {
            if address.kind == "body" && grace > 0.0 {
                if let Some(body) = current_native_facet_at(
                    Some(owner(core, &self.observer.actor_id)?),
                    &address.subject,
                    &address.kind,
                    CurrentFacetSelector {
                        channel: Some(&address.channel),
                        ..Default::default()
                    },
                )? {
                    if let ObservationOrigin::Exposure { episode_id, .. } =
                        &body.original_source.origin
                    {
                        let gap = ReceptionGap {
                            episode_id: episode_id.clone(),
                            lost_at: now,
                            through: now + grace,
                            physical_life: body.grant.subject_physical_life,
                        };
                        core.journal.current.set_gap(
                            &mut core.state.reception,
                            &self.observer.actor_id,
                            &address.subject,
                            Some(gap),
                        )?;
                    }
                }
            }
            self.remove_member(
                core,
                &address.subject,
                &address.kind,
                &address.channel,
                TemporalChange::Loss,
                budget,
            )?;
        }
        Ok(())
    }
    fn remove_member(
        &mut self,
        core: &mut CoreMutation<'_>,
        subject: &str,
        kind: &str,
        channel: &DefinitionPin,
        reason: TemporalChange,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let transition = core.journal.acquisitions.begin_received(
            &self.observer.actor_id,
            self.observer.physical_life,
            None,
        )?;
        materialize_current_checks(
            &mut core.journal.current,
            &mut core.state.reception,
            &self.observer.actor_id,
            &[CurrentFacetAddress {
                subject_id: subject,
                kind,
                channel: Some(channel),
            }],
        )?;
        close_current_member_history(
            core,
            &self.observer.actor_id,
            subject,
            kind,
            channel,
            reason,
            budget,
        )?;
        core.journal.current.set_visual_measurement(
            &mut core.state.reception,
            &self.observer.actor_id,
            subject,
            None,
        )?;
        current_facet_set(
            &mut core.journal.current,
            &mut core.state.reception,
            &self.observer.actor_id,
            CurrentFacetAddress {
                subject_id: subject,
                kind,
                channel: Some(channel),
            },
            None,
        )?;
        if matches!(kind, "body" | "location") {
            self.retired_motion.insert(subject.into());
        }
        self.current.note(subject, true)?;
        super::retirement::finish_received(core, transition)
    }
}
