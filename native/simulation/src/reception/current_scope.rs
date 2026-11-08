//! A synchronous borrowed view of one actual receiving life. Physical state is
//! consulted only for grant eligibility; values come from received records.

use super::retained_size::{HeapBytes, heap_sum};
use super::*;
use crate::experience::{AssociationEvidenceStatus, ExperienceState, association_evidence_status};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{ReceivedError, ReceivedValueFragment, TemporalValueMeaning};
use crate::simulation::InstalledWorld;
use crate::state::{Entity, EntityStore};
use std::mem::{align_of, size_of};
use std::sync::Arc;

mod motion;

fn unavailable() -> ReceivedError {
    ReceivedError("Selected current received value is unavailable or incompatible.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Selected current received capture exceeds native byte allowance.")
}

/// Detached immutable output and its capacity always move together.
pub struct OwnedCurrentFacet {
    value: Arc<CapturedCurrentFacet>,
    reservation: ByteReservation,
}
impl OwnedCurrentFacet {
    pub fn facet(&self) -> &CapturedCurrentFacet {
        &self.value
    }
    pub(crate) fn into_parts(self) -> (Arc<CapturedCurrentFacet>, ByteReservation) {
        (self.value, self.reservation)
    }
}

pub(crate) struct CurrentBodyReadScope<'a> {
    reception: &'a ReceptionState,
    values: Option<&'a crate::received::ReceivedValues>,
    entities: &'a EntityStore,
    installed: &'a InstalledWorld,
    experience: &'a ExperienceState,
    meaning: &'a dyn TemporalValueMeaning,
    observer: &'a Entity,
    owner: &'a PerceptionEvidenceOwner,
}
impl<'a> CurrentBodyReadScope<'a> {
    pub(crate) fn prepare(
        reception: &'a ReceptionState,
        entities: &'a EntityStore,
        installed: &'a InstalledWorld,
        experience: &'a ExperienceState,
        meaning: &'a dyn TemporalValueMeaning,
        observer_id: &str,
    ) -> Result<Option<Self>, ReceivedError> {
        let Some(observer) = entities.get(observer_id) else {
            return Ok(None);
        };
        let Some(actor) = observer.actor.as_ref().filter(|actor| actor.alive) else {
            return Ok(None);
        };
        let Some(owner) = reception
            .perception_evidence
            .as_ref()
            .and_then(|owners| owners.get(observer_id))
            .filter(|owner| owner.life == actor.physical_life.unwrap_or(0))
        else {
            return Ok(None);
        };
        if !observer.actively_participates()
            || installed
                .capabilities
                .capability_blocked(Some(observer), "perception")
                .map_err(|_| unavailable())?
        {
            return Ok(None);
        }
        Ok(Some(Self {
            reception,
            values: reception.received_values.as_ref(),
            entities,
            installed,
            experience,
            meaning,
            observer,
            owner,
        }))
    }
    pub(crate) fn state(&self) -> &'a PerceptionEvidenceOwner {
        self.owner
    }
    pub(super) fn received_values(&self) -> Option<&'a crate::received::ReceivedValues> {
        self.values
    }
    pub(super) fn value(
        &self,
        reference: &'a crate::received::ReceivedValueReference,
    ) -> Option<&'a crate::received::ReceivedValueFragment> {
        match reference {
            crate::received::ReceivedValueReference::Shared(id) => {
                self.values.and_then(|values| values.shared_value(id))
            }
            crate::received::ReceivedValueReference::Inline(value) => Some(value),
        }
    }
    fn lookup(&self) -> &Option<&'a crate::received::ReceivedValues> {
        &self.values
    }
    pub(crate) fn channel_eligible(&self, pin: &DefinitionPin) -> bool {
        let bindings = self
            .observer
            .actor
            .as_ref()
            .and_then(|actor| actor.senses.as_ref())
            .unwrap_or(&self.installed.default_senses);
        bindings.iter().any(|id| id == &pin.id)
            && self
                .installed
                .senses
                .get(&pin.id)
                .is_some_and(|sense| sense.pin() == pin)
    }
    pub(crate) fn native(
        &self,
        id: &str,
        kind: &str,
        selector: CurrentFacetSelector<'_>,
    ) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
        current_native_facet_at(Some(self.owner), id, kind, selector)
    }
    pub(crate) fn attention_source(
        &self,
        id: &str,
        lease: &str,
    ) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
        received_attention_source(self.owner, id, lease)
    }
    pub(crate) fn native_body(
        &self,
        id: &str,
    ) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
        let Some(pin) = self
            .installed
            .senses
            .values()
            .find(|sense| {
                self.channel_eligible(sense.pin())
                    && matches!(sense.value(), SenseDefinition::VisionGeometry { .. })
            })
            .map(|sense| sense.pin())
        else {
            return Ok(None);
        };
        let Some(body) = self.native(
            id,
            "body",
            CurrentFacetSelector {
                channel: Some(pin),
                ..Default::default()
            },
        )?
        else {
            return Ok(None);
        };
        let invalidated = self
            .reception
            .sensory
            .as_ref()
            .and_then(|pending| pending.invalidated_revision_for(&self.observer.id, id));
        let confirmed = effective_current_check(self.owner, body.grant, body.metadata, true)?
            .filter(|check| check.through >= body.metadata.times.expanded().confirmed_through);
        let subject = self.entities.get(id);
        let expected_life = subject
            .and_then(|subject| subject.actor.as_ref())
            .map(|actor| actor.physical_life.unwrap_or(0));
        // Option ordering preserves the source's absent -1 comparison without
        // fabricating a saved revision or treating a changed scope as absent.
        if body.metadata.availability.is_none()
            && confirmed.map(|check| check.input_revision) >= invalidated
            && body.field.value.kind == "body"
            && role(body) == FacetRole::Direct
            && subject.is_some_and(Entity::actively_participates)
            && body.grant.subject_physical_life == expected_life
        {
            Ok(Some(body))
        } else {
            Ok(None)
        }
    }
    pub(crate) fn native_location(
        &self,
        id: &str,
    ) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
        let Some(body) = self.native_body(id)? else {
            return Ok(None);
        };
        let location = self.native(
            id,
            "location",
            CurrentFacetSelector {
                channel: Some(&body.grant.channel),
                exposure: Some(&body.grant.exposure),
                ..Default::default()
            },
        )?;
        Ok(location.filter(|location| {
            location.metadata.availability.is_none()
                && location.grant.subject_physical_life == body.grant.subject_physical_life
                && role(*location) == FacetRole::Direct
        }))
    }
    pub(crate) fn lease_eligible(
        &self,
        input: CurrentNativeFacet<'_>,
        allow_unchecked: bool,
    ) -> Result<bool, ReceivedError> {
        if input.metadata.availability.is_some() && !allow_unchecked {
            return Ok(false);
        }
        if !allow_unchecked
            && matches!(input.field.value.kind.as_str(), "body" | "location")
            && role(input) != FacetRole::Direct
        {
            return Ok(false);
        }
        if !self.channel_eligible(&input.grant.channel) {
            return Ok(false);
        }
        if input.field.value.kind == "association" {
            let value =
                received_facet_value(self.lookup(), &input.field.value)?.ok_or_else(unavailable)?;
            if association_evidence_status(
                self.experience,
                &self.observer.id,
                &value,
                Some((&input.original_source.id, input.field.original_ordinal)),
                self.meaning,
            )
            .map_err(|_| unavailable())?
                != AssociationEvidenceStatus::Retained
            {
                return Ok(false);
            }
        }
        if let Some(life) = input.grant.subject_physical_life {
            if self
                .entities
                .get(&input.grant.subject_id)
                .is_none_or(|subject| {
                    !subject.actively_participates()
                        || subject
                            .actor
                            .as_ref()
                            .is_none_or(|actor| actor.physical_life.unwrap_or(0) != life)
                })
            {
                return Ok(false);
            }
        }
        let body = self.native(
            &input.grant.subject_id,
            "body",
            CurrentFacetSelector {
                channel: Some(&input.grant.channel),
                ..Default::default()
            },
        )?;
        if body.is_some() && input.grant.modality == Modality::Sight && !allow_unchecked {
            return Ok(self.native_body(&input.grant.subject_id)?.is_some());
        }
        Ok(true)
    }
    pub(crate) fn observed(
        &self,
        id: &str,
        kind: &str,
    ) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
        let pin = self
            .owner
            .visual_confirmation
            .as_ref()
            .map(|phase| &phase.channel);
        let input = self.native(
            id,
            kind,
            CurrentFacetSelector {
                modality: Some(Modality::Sight),
                channel: pin,
                exposure: None,
            },
        )?;
        let Some(input) = input.filter(|_| self.entities.get(id).is_some()) else {
            return Ok(None);
        };
        if !self.lease_eligible(input, false)? {
            return Ok(None);
        }
        if let Some(lease) = &input.field.body_lease_id {
            if self
                .native_body(id)?
                .is_none_or(|body| &body.field.id != lease)
            {
                return Ok(None);
            }
        }
        Ok(Some(input))
    }
    pub(crate) fn local_subject(
        &self,
        id: &str,
    ) -> Result<Option<&'a ObserverSubject>, ReceivedError> {
        Ok(self
            .native_body(id)?
            .and_then(|body| body.field.local_subject.as_ref()))
    }
    pub(crate) fn association(&self, id: &str) -> Result<Option<&ObserverSubject>, ReceivedError> {
        let Some(body) = self.native_body(id)? else {
            return Ok(None);
        };
        let Some(input) = self.native(
            id,
            "association",
            CurrentFacetSelector {
                modality: Some(Modality::Sight),
                ..Default::default()
            },
        )?
        else {
            return Ok(None);
        };
        self.received_association(body, input)
    }
    /// Correspondence uses the actual acquired body and association even while
    /// its physical freshness is unchecked. A live-body reader still performs
    /// its independent physical eligibility check before calling this helper.
    pub(super) fn received_association(
        &self,
        body: CurrentNativeFacet<'a>,
        input: CurrentNativeFacet<'a>,
    ) -> Result<Option<&'a ObserverSubject>, ReceivedError> {
        let Some(ReceivedValueFragment::Sensory(
            value @ SensoryFacet::Association {
                strength: AssociationStrength::Supported,
                subject,
                ..
            },
        )) = self.value(&input.field.value.reference)
        else {
            return Ok(None);
        };
        if input.field.body_lease_id.as_ref() != Some(&body.field.id)
            || association_evidence_status(
                self.experience,
                &self.observer.id,
                value,
                Some((&input.original_source.id, input.field.original_ordinal)),
                self.meaning,
            )
            .map_err(|_| unavailable())?
                != AssociationEvidenceStatus::Retained
        {
            return Ok(None);
        }
        Ok(Some(subject))
    }
    pub(crate) fn ordered_subjects(
        &self,
        budget: &ByteBudget,
    ) -> Result<OwnedCurrentSubjects, ReceivedError> {
        let bytes = heap_sum([
            size_of::<OwnedCurrentSubjects>(),
            self.owner
                .current
                .len()
                .checked_mul(size_of::<(u64, String)>())
                .ok_or_else(capacity)?,
            self.owner
                .current
                .keys()
                .try_fold(0usize, |sum, id| sum.checked_add(id.len()))
                .ok_or_else(capacity)?,
        ])
        .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(bytes).map_err(|_| capacity())?;
        let mut ids = Vec::new();
        ids.try_reserve_exact(self.owner.current.len())
            .map_err(|_| capacity())?;
        for (id, contact) in &self.owner.current {
            ids.push((contact.order, id.clone()));
        }
        ids.sort_by_key(|(order, _)| *order);
        let heap = ids.heap_bytes().ok_or_else(capacity)?;
        reservation
            .resize(size_of::<OwnedCurrentSubjects>() + heap)
            .map_err(|_| capacity())?;
        Ok(OwnedCurrentSubjects {
            ids,
            _reservation: reservation,
        })
    }
    pub(crate) fn body_label(&self, id: &str) -> Result<Option<&Named>, ReceivedError> {
        let Some(body) = self.native_body(id)? else {
            return Ok(None);
        };
        Ok(received_body_parts(self.lookup(), &body.field.value)
            .and_then(|(details, _)| details.label.as_ref()))
    }
    pub(crate) fn capture(
        &self,
        id: &str,
        kind: &str,
        budget: &ByteBudget,
    ) -> Result<Option<OwnedCurrentFacet>, ReceivedError> {
        let Some(input) = self.observed(id, kind)? else {
            return Ok(None);
        };
        self.capture_input(input, kind, budget).map(Some)
    }
    fn capture_input(
        &self,
        input: CurrentNativeFacet<'a>,
        kind: &str,
        budget: &ByteBudget,
    ) -> Result<OwnedCurrentFacet, ReceivedError> {
        let id = &input.grant.subject_id;
        let pose = if kind == "body" {
            self.native(
                id,
                "location",
                CurrentFacetSelector {
                    channel: Some(&input.grant.channel),
                    exposure: Some(&input.grant.exposure),
                    ..Default::default()
                },
            )?
        } else {
            None
        };
        let description = if kind == "body" {
            self.native(
                id,
                "description",
                CurrentFacetSelector {
                    channel: Some(&input.grant.channel),
                    exposure: Some(&input.grant.exposure),
                    ..Default::default()
                },
            )?
            .filter(|value| {
                role(*value) == FacetRole::Direct && value.metadata.availability.is_none()
            })
        } else {
            None
        };
        let description = match description {
            Some(description) if self.lease_eligible(description, false)? => Some(description),
            _ => None,
        };
        // Walk only the selected field's closure before materializing. The
        // conservative duplication bound also covers provenance string copies.
        let mut heap = 0usize;
        for selected in std::iter::once(input).chain(pose).chain(description) {
            heap = heap_sum([
                heap,
                selected.original_source.heap_bytes().ok_or_else(capacity)?,
                descriptor_heap(self.lookup(), &selected.field.value)?,
                selected.field.id.capacity(),
                selected
                    .field
                    .body_lease_id
                    .heap_bytes()
                    .ok_or_else(capacity)?,
                selected
                    .field
                    .local_subject
                    .heap_bytes()
                    .ok_or_else(capacity)?,
                selected.grant.subject_id.capacity(),
                selected.grant.exposure.capacity(),
                selected.grant.channel.heap_bytes().ok_or_else(capacity)?,
                self.observer.id.capacity(),
            ])
            .ok_or_else(capacity)?;
        }
        let bound = heap_sum([
            size_of::<OwnedCurrentFacet>(),
            size_of::<CapturedCurrentFacet>(),
            heap.checked_mul(4).ok_or_else(capacity)?,
            2 * size_of::<usize>(),
            align_of::<CapturedCurrentFacet>() - 1,
        ])
        .ok_or_else(capacity)?;
        let mut reservation = budget.reserve(bound).map_err(|_| capacity())?;
        let mut descriptor = input.field.value.clone();
        if let Some(location) = pose {
            if matches!(
                self.lookup().value_at(&location.field.value.reference),
                Some(ReceivedValueFragment::BodyPose(_))
            ) {
                descriptor.reception = Some(FacetReception::Body {
                    pose_ref: location.field.value.reference.clone(),
                });
            }
        }
        let mut value =
            received_facet_value(self.lookup(), &descriptor)?.ok_or_else(unavailable)?;
        let pose_support = pose
            .map(|pose| self.pose_support(pose))
            .transpose()?
            .flatten();
        let mut description_support = None;
        if let Some(description) = description {
            if let (SensoryFacet::Body { body }, Some(SensoryFacet::Description { text })) = (
                &mut value,
                received_facet_value(self.lookup(), &description.field.value)?,
            ) {
                body.description = Some(text);
                description_support = Some(self.description_support(description)?);
            }
        }
        let (times, revision) = self.effective_times(input)?;
        let captured = CapturedCurrentFacet {
            availability: input.metadata.availability.clone(),
            pose_support,
            description_support,
            id: input.field.id.clone(),
            observer: self
                .owner
                .observer
                .as_ref()
                .ok_or_else(unavailable)?
                .clone(),
            body_lease_id: input.field.body_lease_id.clone(),
            local_subject: input.field.local_subject.clone(),
            exposure: current_facet_exposure(self.owner, input)?,
            original: self.fact(input)?,
            role: role(input),
            original_aliases: original_alias(input.original_source),
            modality: input.grant.modality,
            value,
            confirmation: self.confirmation(input, revision)?,
            value_measured_from: times.value_measured_from,
            value_measured_through: times.value_measured_through,
            value_acquired_at: times.value_acquired_at,
            confirmed_from: times.confirmed_from,
            confirmed_through: times.confirmed_through,
        };
        let actual = heap_sum([
            size_of::<OwnedCurrentFacet>(),
            size_of::<CapturedCurrentFacet>(),
            captured.heap_bytes().ok_or_else(capacity)?,
            2 * size_of::<usize>(),
            align_of::<CapturedCurrentFacet>() - 1,
        ])
        .ok_or_else(capacity)?;
        reservation.resize(actual).map_err(|_| capacity())?;
        Ok(OwnedCurrentFacet {
            value: Arc::new(captured),
            reservation,
        })
    }
    fn effective_times(
        &self,
        input: CurrentNativeFacet<'_>,
    ) -> Result<(CurrentFacetTimes, u64), ReceivedError> {
        let mut times = input.metadata.times.expanded();
        let mut revision = input.metadata.revision;
        if let Some(check) =
            effective_current_check(self.owner, input.grant, input.metadata, false)?
                .filter(|check| check.through >= times.confirmed_through)
        {
            times.confirmed_through = check.through;
            revision = revision.max(check.revision)
        }
        Ok((times, revision))
    }
    fn fact(&self, input: CurrentNativeFacet<'_>) -> Result<ObservationFactKey, ReceivedError> {
        Ok(ObservationFactKey {
            source: EvidenceSource {
                family: EvidenceFamily::NativeExposure,
                id: input.original_source.id.clone(),
                revision: SourceRevision::Number(input.original_source.revision),
                observer: self
                    .owner
                    .observer
                    .as_ref()
                    .ok_or_else(unavailable)?
                    .clone(),
            },
            ordinal: input.field.original_ordinal,
        })
    }
    fn confirmation(
        &self,
        input: CurrentNativeFacet<'_>,
        revision: u64,
    ) -> Result<EvidenceSource, ReceivedError> {
        Ok(EvidenceSource {
            family: EvidenceFamily::NativeExposure,
            id: input.field.id.clone(),
            revision: SourceRevision::Number(revision),
            observer: self
                .owner
                .observer
                .as_ref()
                .ok_or_else(unavailable)?
                .clone(),
        })
    }
    fn pose_support(
        &self,
        input: CurrentNativeFacet<'_>,
    ) -> Result<Option<CurrentBodyPoseSupport>, ReceivedError> {
        if !matches!(
            self.lookup().value_at(&input.field.value.reference),
            Some(ReceivedValueFragment::BodyPose(_))
        ) {
            return Ok(None);
        }
        let Some(SensoryFacet::Location { frame, .. }) =
            received_facet_value(self.lookup(), &input.field.value)?
        else {
            return Ok(None);
        };
        let (times, revision) = self.effective_times(input)?;
        Ok(Some(CurrentBodyPoseSupport {
            frame,
            role: role(input),
            availability: input.metadata.availability.clone(),
            pose_measured_from: times.value_measured_from,
            pose_measured_through: times.value_measured_through,
            pose_acquired_at: times.value_acquired_at,
            original: self.fact(input)?,
            confirmation: self.confirmation(input, revision)?,
            confirmed_from: times.confirmed_from,
            confirmed_through: times.confirmed_through,
            aliases: None,
        }))
    }
    fn description_support(
        &self,
        input: CurrentNativeFacet<'_>,
    ) -> Result<CurrentDescriptionSupport, ReceivedError> {
        let (times, revision) = self.effective_times(input)?;
        Ok(CurrentDescriptionSupport {
            role: role(input),
            availability: input.metadata.availability.clone(),
            description_measured_from: times.value_measured_from,
            description_measured_through: times.value_measured_through,
            description_acquired_at: times.value_acquired_at,
            original: self.fact(input)?,
            confirmation: self.confirmation(input, revision)?,
            confirmed_from: times.confirmed_from,
            confirmed_through: times.confirmed_through,
            aliases: None,
        })
    }
}
pub(crate) struct OwnedCurrentSubjects {
    ids: Vec<(u64, String)>,
    _reservation: ByteReservation,
}
impl OwnedCurrentSubjects {
    pub(crate) fn ids(&self) -> impl Iterator<Item = &str> {
        self.ids.iter().map(|(_, id)| id.as_str())
    }
}
fn role(input: CurrentNativeFacet<'_>) -> FacetRole {
    input
        .original_source
        .facets
        .get(input.field.original_ordinal as usize)
        .and_then(|facet| facet.role)
        .unwrap_or(FacetRole::Direct)
}
fn original_alias(source: &ReceivedObservation) -> Option<Vec<String>> {
    match &source.origin {
        ObservationOrigin::Occurrence { event_id, .. } => Some(vec![event_id.clone()]),
        ObservationOrigin::Exposure {
            source: Some(source),
            ..
        } => Some(vec![source.id.clone()]),
        _ => None,
    }
}
fn descriptor_heap(
    values: &impl ReceivedValueLookup,
    value: &ReceivedFacetValue,
) -> Result<usize, ReceivedError> {
    let mut heap = values
        .value_at(&value.reference)
        .ok_or_else(unavailable)?
        .heap_bytes()
        .ok_or_else(capacity)?;
    match &value.reception {
        Some(FacetReception::Body { pose_ref }) => {
            heap = heap
                .checked_add(
                    values
                        .value_at(pose_ref)
                        .ok_or_else(unavailable)?
                        .heap_bytes()
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?
        }
        Some(FacetReception::Location { frame_ref }) => {
            heap = heap
                .checked_add(
                    values
                        .value_at(frame_ref)
                        .ok_or_else(unavailable)?
                        .heap_bytes()
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?
        }
        None => {}
    }
    Ok(heap)
}
