//! One real Awareness receiver. Its original, current interpretation and history
//! share the candidate's owners; provider yields cannot publish partial work.
use super::*;
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::Awareness;
use crate::geometry::GeometryBinding;
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRequest};
use crate::worlds::InstalledBodyFamiliarityPreparation;
use std::{mem::size_of, sync::Arc};

enum Phase {
    Current,
    Familiarity(InstalledBodyFamiliarityPreparation),
    Complete,
}
pub(crate) struct ReceivingCursor {
    current: CurrentReceptionLifetime,
    event_id: String,
    pending: Option<PendingAwarenessObservation>,
    phase: Phase,
    reservation: ByteReservation,
}
pub(crate) enum ReceivingStep<'a> {
    Language(&'a CollationRequest),
    Complete(CompletedAwarenessObservation),
}
fn invalid() -> ExecutionError {
    ExecutionError::Received(crate::received::ReceivedError(
        "Awareness receiver has changed or retains unfinished current work.",
    ))
}
impl ReceivingCursor {
    pub(crate) fn prepare(
        core: &mut CoreMutation<'_>,
        event: &WorldEvent,
        awareness: &Awareness,
        received_point: Option<Point>,
        sample_token: Option<u64>,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        let Some(mut pending) = acquire_awareness_observation(
            core,
            event,
            awareness,
            received_point,
            sample_token,
            budget,
        )?
        else {
            return Ok(None);
        };
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                pending.observer.actor_id.len(),
                event.id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let current = CurrentReceptionLifetime::begin(
            core,
            &pending.observer,
            pending.acquisition.take(),
            sample_token,
            budget,
        )?;
        Ok(Some(Self {
            current,
            event_id: event.id.clone(),
            pending: Some(pending),
            phase: Phase::Current,
            reservation,
        }))
    }
    pub(crate) fn language_request(&self) -> Option<&CollationRequest> {
        match &self.phase {
            Phase::Familiarity(preparation) => Some(preparation.comparisons()),
            _ => None,
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        event: &WorldEvent,
        awareness: &Awareness,
        binding: GeometryBinding,
        answer: Option<CollationAnswer>,
        budget: &ByteBudget,
    ) -> Result<ReceivingStep<'a>, ExecutionError> {
        if self.event_id != event.id
            || awareness.event_id != event.id
            || awareness.actor_id != self.current.observer.actor_id
            || core
                .state
                .physical
                .entities
                .get(&self.current.observer.actor_id)
                .and_then(|entity| entity.physical_life())
                != Some(self.current.observer.physical_life)
        {
            return Err(invalid());
        }
        if let Some(answer) = answer {
            let Phase::Familiarity(preparation) =
                std::mem::replace(&mut self.phase, Phase::Current)
            else {
                return Err(invalid());
            };
            preparation.finish(core, &answer, budget)?;
        }
        if matches!(self.phase, Phase::Familiarity(_)) {
            let Phase::Familiarity(preparation) = &self.phase else {
                unreachable!()
            };
            return Ok(ReceivingStep::Language(preparation.comparisons()));
        }
        if matches!(self.phase, Phase::Complete) {
            return Err(invalid());
        }
        loop {
            let pending = self.pending.as_ref().ok_or_else(invalid)?;
            let Some(work) = pending.current.first() else {
                break;
            };
            let extra = match work {
                AwarenessCurrentWork::Association {
                    subject_id,
                    body_lease_id,
                    ..
                } => subject_id.len() + body_lease_id.len(),
                AwarenessCurrentWork::Attention { subject_id, .. } => subject_id.len(),
            };
            self.reservation.resize(
                self.reservation
                    .bytes()
                    .checked_add(extra)
                    .and_then(|n| n.checked_add(size_of::<AwarenessCurrentWork>()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let work = work.clone();
            match work {
                AwarenessCurrentWork::Association {
                    subject_id,
                    physical_life,
                    body_lease_id,
                    ordinal,
                } => {
                    self.acquire_association(
                        core,
                        event,
                        &subject_id,
                        physical_life,
                        &body_lease_id,
                        ordinal,
                        budget,
                    )?;
                    self.pending.as_mut().ok_or_else(invalid)?.current.remove(0);
                    if let Some(preparation) = InstalledBodyFamiliarityPreparation::prepare(
                        core,
                        &self.current.observer.actor_id,
                        &subject_id,
                        binding,
                        budget,
                    )? {
                        self.phase = Phase::Familiarity(preparation);
                        let Phase::Familiarity(preparation) = &self.phase else {
                            unreachable!()
                        };
                        return Ok(ReceivingStep::Language(preparation.comparisons()));
                    }
                }
                AwarenessCurrentWork::Attention {
                    subject_id,
                    direct,
                    urgency,
                    ordinal,
                } => {
                    if core
                        .state
                        .physical
                        .entities
                        .get(&self.current.observer.actor_id)
                        .is_some_and(|observer| observer.has_memory())
                    {
                        self.current.ensure_prefix(core, budget)?;
                        let source = self
                            .pending
                            .as_ref()
                            .and_then(|pending| pending.source.as_ref())
                            .ok_or_else(invalid)?;
                        let bytes = heap_sum([
                            3 * size_of::<String>(),
                            3 * subject_id.len(),
                            size_of::<ObservationFactKey>(),
                            source.id.len(),
                            self.current.observer.actor_id.len(),
                            map_storage::<String, ObservationFactKey>(2)
                                .ok_or(ExecutionError::Capacity)?,
                            map_storage::<String, f64>(2).ok_or(ExecutionError::Capacity)?,
                        ])
                        .ok_or(ExecutionError::Capacity)?;
                        core.journal.current.reserve_growth(bytes)?;
                        let mut proofs = IndexMap::new();
                        proofs.insert(
                            subject_id.clone(),
                            ObservationFactKey {
                                source: EvidenceSource {
                                    family: EvidenceFamily::NativeExposure,
                                    id: source.id.clone(),
                                    revision: SourceRevision::Number(source.revision),
                                    observer: self.current.observer.clone(),
                                },
                                ordinal,
                            },
                        );
                        let urgency = IndexMap::from([(subject_id.clone(), urgency)]);
                        let changed = [subject_id.clone()];
                        let direct = if direct {
                            vec![subject_id.clone()]
                        } else {
                            Vec::new()
                        };
                        update_attention(
                            &core.state.physical,
                            &mut core.state.reception,
                            &core.state.installed,
                            &core.state.experience,
                            &mut core.journal.current,
                            &self.current.observer.actor_id,
                            AttentionUpdate {
                                changed_source_ids: Some(&changed),
                                urgency: Some(&urgency),
                                proofs: Some(&proofs),
                                direct_subjects: Some(&direct),
                                geometry_source_ids: None,
                            },
                        )?;
                        if let Some(before) = &self.current.before {
                            reconcile_current_cohort(
                                core,
                                Arc::clone(before),
                                self.current.sample_token,
                                budget,
                            )?;
                        }
                        self.current.reconciled = true;
                    }
                    self.pending.as_mut().ok_or_else(invalid)?.current.remove(0);
                }
            }
        }
        let completed = self
            .pending
            .take()
            .ok_or_else(invalid)?
            .finish(core, awareness, budget)?;
        self.current.finish(core, budget)?;
        self.phase = Phase::Complete;
        Ok(ReceivingStep::Complete(completed))
    }
    fn acquire_association(
        &mut self,
        core: &mut CoreMutation<'_>,
        event: &WorldEvent,
        subject: &str,
        life: u64,
        body_lease: &str,
        ordinal: u64,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.current.ensure_prefix(core, budget)?;
        let source = self
            .pending
            .as_ref()
            .and_then(|pending| pending.source.as_ref())
            .ok_or_else(invalid)?;
        let scope = CurrentBodyReadScope::prepare(
            &core.state.reception,
            &core.state.physical.entities,
            &core.state.installed,
            &core.state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            &self.current.observer.actor_id,
        )?
        .ok_or_else(invalid)?;
        let body = scope
            .native_body(subject)?
            .filter(|body| {
                body.field.id == body_lease && body.grant.subject_physical_life == Some(life)
            })
            .ok_or_else(invalid)?;
        let source_facet = source
            .facets
            .get(usize::try_from(ordinal).map_err(|_| invalid())?)
            .filter(|facet| facet.value.kind == "association")
            .ok_or_else(invalid)?;
        let values = core.state.reception.received_values.as_ref();
        let header = received_observation_header(&values, source)?;
        let key_bytes = crate::encoding::json_record_len(&(&source.id, source.revision))
            .map_err(|_| invalid())?;
        core.journal.current.reserve_growth(
            heap_sum([
                size_of::<CurrentFacetInput>(),
                source_facet
                    .value
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                body.grant.heap_bytes().ok_or(ExecutionError::Capacity)?,
                key_bytes,
                subject.len(),
                body_lease.len(),
                "perception-lease-".len() + 16,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut grant = body.grant.clone();
        grant.original =
            crate::encoding::json_record(&(&source.id, source.revision)).map_err(|_| invalid())?;
        let input = CurrentFacetInput {
            field: CurrentStoredField {
                id: core
                    .state
                    .physical
                    .identity
                    .allocate("perception-lease")?
                    .id,
                body_lease_id: Some(body_lease.to_owned()),
                local_subject: None,
                motion_continuity_revision: None,
                source_placement_revision: None,
                value: source_facet.value.clone(),
                original_ordinal: ordinal,
                semantic_revision: 1,
            },
            grant,
            original: Arc::clone(source),
            times: CurrentFacetTimes {
                value_measured_from: event.at,
                value_measured_through: event.at,
                value_acquired_at: header.acquired_at,
                confirmed_from: event.at,
                confirmed_through: event.at,
            },
            revision: 1,
            availability: None,
        };
        let token = match self.current.sample_token {
            Some(token) => token,
            None => {
                let token = core
                    .state
                    .physical
                    .identity
                    .allocate("received-sample")?
                    .sequence;
                self.current.sample_token = Some(token);
                token
            }
        };
        let lease = core.journal.acquisitions.begin_received(
            &self.current.observer.actor_id,
            self.current.observer.physical_life,
            Some(token),
        )?;
        let before = CurrentCohort::capture(
            &core.state.physical,
            &core.state.reception,
            &core.state.installed,
            &core.state.experience,
            &self.current.observer.actor_id,
            budget,
        )?;
        let measured = received_facet_value(
            &core.state.reception.received_values.as_ref(),
            &input.field.value,
        )?
        .ok_or_else(invalid)?;
        if let Some(pending) = prepare_current_sample(
            core,
            &self.current.observer.actor_id,
            input,
            CurrentValueMode::Measured {
                value: measured,
                prepared_pose: None,
            },
            budget,
        )? {
            close_current_sample_history(core, &self.current.observer.actor_id, &pending, budget)?;
            let (status, parts) = apply_current_sample(
                &mut core.journal.current,
                &mut core.state.reception,
                pending,
                CurrentReceptionStamp {
                    received_at: core.state.physical.header.sim_time,
                    received_order: token,
                    confirmed_revision: 1,
                    frame_ref: None,
                },
            )?;
            self.current.installed_sample(
                core,
                subject,
                "association",
                status,
                parts,
                before.as_ref(),
                token,
                budget,
            )?;
        }
        let values = core
            .state
            .reception
            .received_values
            .as_ref()
            .ok_or(ExecutionError::UnfinishedOccurrence)?;
        core.journal.acquisitions.finish_received(
            lease,
            &mut core.state.temporal,
            values,
            &mut core.state.physical.identity,
            &crate::worlds::InstalledEvidenceMeaning,
            &mut core.journal.meters,
        )?;
        Ok(())
    }
    pub(crate) fn flush_before_snapshot(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        self.current.flush_before_snapshot(core, budget)
    }
}
