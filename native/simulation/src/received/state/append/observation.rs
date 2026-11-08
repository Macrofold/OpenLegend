//! The received original is the only source of facet values, dates and ordinal
//! identity. A recording admission may start now without resampling that source.

use super::*;
use crate::reception::{FacetRole, ObservationContribution};

#[derive(Default)]
pub(crate) struct ObservationCaptureOptions<'a> {
    pub subject: Option<&'a str>,
    pub source_ordinals: Option<&'a BTreeSet<u64>>,
    pub context_subjects: Option<&'a [String]>,
    pub change: Option<TemporalChange>,
    pub confirmed_through: Option<f64>,
    pub terminal_reservation_delta: Option<i64>,
}
impl TemporalAcquisition {
    pub(crate) fn capture_observation(
        &mut self,
        state: &mut TemporalState,
        values: &mut ReceivedValues,
        identity: &mut IdentityState,
        transition: &mut ReceivedTransition,
        meaning: &dyn TemporalValueMeaning,
        meters: &mut WorkMeters,
        now: f64,
        sequence: u64,
        observation: &ObservationContribution,
        source_ids: &[String],
        required: bool,
        options: ObservationCaptureOptions<'_>,
    ) -> Result<Option<TemporalReceiptLocator>, TemporalAppendError> {
        if observation.observer.actor_id != self.actor_id()
            || observation.observer.physical_life != self.physical_life()
        {
            return Err(ReceivedError("Temporal original has foreign receiving ownership.").into());
        }
        let original_heap = observation
            .heap_bytes()
            .ok_or(ReceivedError("Temporal original allocation overflow."))?;
        let selected = observation
            .facets
            .iter()
            .filter(|facet| {
                options
                    .source_ordinals
                    .is_none_or(|ordinals| ordinals.contains(&facet.ordinal))
            })
            .count();
        let context_bytes = options
            .context_subjects
            .unwrap_or(&[])
            .iter()
            .try_fold(0usize, |n, s| n.checked_add(s.len()))
            .ok_or(ReceivedError("Temporal context allocation overflow."))?;
        let sources = source_ids
            .iter()
            .try_fold(0usize, |n, id| n.checked_add(id.len()))
            .ok_or(ReceivedError("Temporal sources allocation overflow."))?;
        let extras = selected
            .checked_mul(
                std::mem::size_of::<TemporalCaptureFacet>()
                    + observation.id.len()
                    + observation.observer.actor_id.len(),
            )
            .ok_or(ReceivedError("Temporal original allocation overflow."))?;
        let scratch = heap_sum([
            original_heap,
            extras,
            context_bytes,
            sources,
            source_ids.len() * std::mem::size_of::<String>(),
            options.subject.map_or(0, str::len),
        ])
        .and_then(|n| n.checked_mul(2))
        .ok_or(ReceivedError("Temporal original allocation overflow."))?;
        let _scratch = self
            .budget
            .reserve(scratch)
            .map_err(|_| ReceivedError("Temporal original capacity exhausted."))?;
        let key = json_record(&(
            &observation.id,
            observation.revision,
            options.source_ordinals,
        ))
        .map_err(|_| ReceivedError("Temporal source decision encoding failed."))?;
        if let Some(previous) = self.decisions.get(&key) {
            return Ok(previous.clone());
        }
        let recording = matches!(
            options.change,
            Some(TemporalChange::Baseline | TemporalChange::Change)
        );
        let subject =
            options
                .subject
                .map(str::to_owned)
                .unwrap_or_else(|| match &observation.origin {
                    ObservationOrigin::Occurrence { event_id, .. } => event_id.clone(),
                    ObservationOrigin::Exposure { episode_id, .. } => episode_id.clone(),
                });
        let mut facets = Vec::new();
        facets
            .try_reserve_exact(selected)
            .map_err(|_| ReceivedError("Temporal original facets capacity exhausted."))?;
        for field in observation.facets.iter().filter(|facet| {
            options
                .source_ordinals
                .is_none_or(|ordinals| ordinals.contains(&facet.ordinal))
        }) {
            let (value, reception) = super::super::support::split(&field.value)?;
            facets.push(TemporalCaptureFacet {
                value,
                reception,
                preferred: None,
                clock: ReceivedFieldClock {
                    role: match field.role {
                        FacetRole::Direct => crate::received::ReceivedRole::Direct,
                        FacetRole::Inference => crate::received::ReceivedRole::Inference,
                        FacetRole::Testimony => crate::received::ReceivedRole::Testimony,
                    },
                    as_of: field.as_of,
                    measured_from: field.measured_from,
                    measured_through: field.measured_through,
                    acquired_at: field.acquired_at,
                    confirmed_through: options.confirmed_through,
                },
                member_index: Some(field.ordinal),
                track: None,
                support: field.support.clone(),
                detail_support: None,
                pose_frame: None,
                original: Some(ObservationFactKey {
                    source: EvidenceSource {
                        family: crate::reception::EvidenceFamily::NativeExposure,
                        id: observation.id.clone(),
                        revision: crate::reception::SourceRevision::Number(observation.revision),
                        observer: observation.observer.clone(),
                    },
                    ordinal: field.ordinal,
                }),
                received_from: None,
            });
        }
        let order = if recording {
            transition.received_order(identity)?
        } else {
            observation.received_order
        };
        let locator = self.append(
            state,
            values,
            identity,
            transition,
            meaning,
            meters,
            now,
            sequence,
            TemporalCaptureInput {
                spatial_context: false,
                availability_at: None,
                coverage_gap: None,
                ended_fields: None,
                terminal_reservation_bytes: None,
                terminal_reservation_delta: options.terminal_reservation_delta,
                received_at: Some(if recording {
                    now
                } else {
                    observation.acquired_at
                }),
                received_order: Some(order),
                availability: None,
                receiver_frame: None,
                subject,
                context_subjects: options
                    .context_subjects
                    .filter(|subjects| !subjects.is_empty())
                    .map(<[String]>::to_vec),
                subject_identity: None,
                change: options.change.unwrap_or(TemporalChange::Occurrence),
                required,
                source_ids: source_ids.to_vec(),
                origin: Some(observation.origin.clone()),
                facets,
            },
        )?;
        let next = map_storage::<String, Option<TemporalReceiptLocator>>(
            self.decisions
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(2))
                .ok_or(ReceivedError("Temporal decision allocation overflow."))?,
        )
        .ok_or(ReceivedError("Temporal decision allocation overflow."))?;
        self.reservation
            .resize(
                heap_sum([
                    self.current_heap_bytes()?,
                    next,
                    key.len(),
                    locator
                        .heap_bytes()
                        .ok_or(ReceivedError("Temporal decision allocation overflow."))?,
                ])
                .ok_or(ReceivedError("Temporal decision allocation overflow."))?,
            )
            .map_err(|_| ReceivedError("Temporal decision capacity exhausted."))?;
        self.decisions
            .try_reserve(1)
            .map_err(|_| ReceivedError("Temporal decision capacity exhausted."))?;
        self.decisions.insert(key, locator.clone());
        self.reservation
            .resize(self.current_heap_bytes()?)
            .map_err(|_| ReceivedError("Temporal decision capacity exhausted."))?;
        Ok(locator)
    }
}
