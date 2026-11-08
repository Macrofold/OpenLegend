//! A trajectory is an acquired pair of points. It cannot be reconstructed from
//! current physical velocity or from a missing ordinary stored facet.
use super::*;
use crate::experience::personal_fact_alias;

impl<'a> CurrentBodyReadScope<'a> {
    fn eligible_motion_location(
        &self,
        subject_id: &str,
        at: f64,
        budget: &ByteBudget,
    ) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
        let Some(track) = self
            .owner
            .motion_samples
            .as_ref()
            .and_then(|tracks| tracks.get(subject_id))
        else {
            return Ok(None);
        };
        if at >= track.expires_at || self.native_body(subject_id)?.is_none() {
            return Ok(None);
        }
        let Some(location) = self.native_location(subject_id)? else {
            return Ok(None);
        };
        if location.field.motion_continuity_revision.unwrap_or(0) != track.continuity_revision
            || location.metadata.times.expanded().value_measured_through != track.through
        {
            return Ok(None);
        }
        if let Some(privacy) = self
            .experience
            .actor(&self.observer.id)
            .map(|actor| &actor.privacy)
        {
            let earlier = &track.earlier;
            // Composite aliases can escape every source byte. Fund their exact
            // finite source fields before creating the temporary lookup strings.
            let bound = [
                earlier.original.id.len(),
                earlier.confirmation.id.len(),
                location.original_source.id.len(),
                location.field.id.len(),
            ]
            .into_iter()
            .try_fold(0usize, |sum, len| {
                sum.checked_add(len.checked_mul(6)?.checked_add(64)?)
            })
            .ok_or_else(capacity)?;
            let _scratch = budget.reserve(bound).map_err(|_| capacity())?;
            for (id, ordinal) in [
                (earlier.original.id.as_str(), earlier.original.ordinal),
                (earlier.confirmation.id.as_str(), earlier.original.ordinal),
                (
                    location.original_source.id.as_str(),
                    location.field.original_ordinal,
                ),
                (location.field.id.as_str(), location.field.original_ordinal),
            ] {
                if privacy.revoked(id)
                    || privacy
                        .revoked(&personal_fact_alias(id, ordinal).map_err(|_| unavailable())?)
                {
                    return Ok(None);
                }
            }
            if earlier
                .aliases
                .iter()
                .flatten()
                .any(|id| privacy.revoked(id))
                || match &location.original_source.origin {
                    ObservationOrigin::Occurrence { event_id, .. } => privacy.revoked(event_id),
                    ObservationOrigin::Exposure {
                        source: Some(source),
                        ..
                    } => privacy.revoked(&source.id),
                    _ => false,
                }
            {
                return Ok(None);
            }
        }
        Ok(Some(location))
    }
    pub(crate) fn has_current_motion(
        &self,
        subject_id: &str,
        at: f64,
        budget: &ByteBudget,
    ) -> Result<bool, ReceivedError> {
        Ok(self
            .eligible_motion_location(subject_id, at, budget)?
            .is_some())
    }
    pub(crate) fn capture_motion(
        &self,
        subject_id: &str,
        at: f64,
        budget: &ByteBudget,
    ) -> Result<Option<OwnedCurrentFacet>, ReceivedError> {
        let Some(_) = self.eligible_motion_location(subject_id, at, budget)? else {
            return Ok(None);
        };
        let Some(location) = self.native(
            subject_id,
            "location",
            CurrentFacetSelector {
                modality: Some(Modality::Sight),
                channel: self
                    .owner
                    .visual_confirmation
                    .as_ref()
                    .map(|phase| &phase.channel),
                exposure: None,
            },
        )?
        else {
            return Ok(None);
        };
        let track = self
            .owner
            .motion_samples
            .as_ref()
            .and_then(|tracks| tracks.get(subject_id))
            .ok_or_else(unavailable)?;
        let observer = self.owner.observer.as_ref().ok_or_else(unavailable)?;
        let mut captured = self.capture_input(location, "location", budget)?;
        let bound = heap_sum([
            descriptor_heap(self.lookup(), &track.earlier.value)?,
            track.earlier.heap_bytes().ok_or_else(capacity)?,
            observer
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(2)
                .ok_or_else(capacity)?,
            captured
                .value
                .heap_bytes()
                .ok_or_else(capacity)?
                .checked_mul(3)
                .ok_or_else(capacity)?,
            captured
                .value
                .id
                .len()
                .checked_mul(6)
                .and_then(|value| value.checked_add(64))
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        captured
            .reservation
            .resize(
                captured
                    .reservation
                    .bytes()
                    .checked_add(bound)
                    .ok_or_else(capacity)?,
            )
            .map_err(|_| capacity())?;
        let Some(SensoryFacet::Location {
            location: earlier_location,
            frame: earlier_frame,
        }) = received_facet_value(self.lookup(), &track.earlier.value)?
        else {
            return Err(unavailable());
        };
        let mut value = Arc::try_unwrap(captured.value).map_err(|_| unavailable())?;
        let SensoryFacet::Location {
            location: later_location,
            frame: later_frame,
        } = value.value
        else {
            return Err(unavailable());
        };
        let earlier = ReceivedLocationSample {
            location: earlier_location,
            frame: earlier_frame,
            measured_from: track.earlier.times[0],
            measured_through: track.earlier.times[1],
            acquired_at: track.earlier.times[2],
            confirmed_from: track.earlier.times[3],
            confirmed_through: track.earlier.times[4],
            original: ObservationFactKey {
                source: EvidenceSource {
                    family: EvidenceFamily::NativeExposure,
                    observer: observer.clone(),
                    id: track.earlier.original.id.clone(),
                    revision: SourceRevision::Number(track.earlier.original.revision),
                },
                ordinal: track.earlier.original.ordinal,
            },
            confirmation: EvidenceSource {
                family: EvidenceFamily::NativeExposure,
                observer: observer.clone(),
                id: track.earlier.confirmation.id.clone(),
                revision: SourceRevision::Number(track.earlier.confirmation.revision),
            },
            aliases: track.earlier.aliases.clone(),
        };
        let later = ReceivedLocationSample {
            location: later_location,
            frame: later_frame,
            measured_from: value.value_measured_from,
            measured_through: value.value_measured_through,
            acquired_at: value.value_acquired_at,
            confirmed_from: value.confirmed_from,
            confirmed_through: value.confirmed_through,
            original: value.original.clone(),
            confirmation: value.confirmation.clone(),
            aliases: value.original_aliases.clone(),
        };
        value.id = crate::encoding::json_record(&[value.id.as_str(), "observed-motion"])
            .map_err(|_| unavailable())?;
        value.value_measured_from = earlier.measured_from;
        value.value_measured_through = later.measured_through;
        value.value_acquired_at = later.acquired_at;
        value.value = SensoryFacet::ObservedMotion {
            exposure: value.exposure.clone(),
            earlier,
            later,
            correspondence: MotionCorrespondence::UnambiguousReceivedContinuity,
        };
        let actual = heap_sum([
            size_of::<OwnedCurrentFacet>(),
            size_of::<CapturedCurrentFacet>(),
            value.heap_bytes().ok_or_else(capacity)?,
            2 * size_of::<usize>(),
            align_of::<CapturedCurrentFacet>() - 1,
        ])
        .ok_or_else(capacity)?;
        captured
            .reservation
            .resize(actual)
            .map_err(|_| capacity())?;
        Ok(Some(OwnedCurrentFacet {
            value: Arc::new(value),
            reservation: captured.reservation,
        }))
    }
}
