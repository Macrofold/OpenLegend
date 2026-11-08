//! Borrowed addresses and independently effective current checks. A broad sight
//! completion can renew freshness without mutating or copying stationary facts.

use super::*;
use crate::received::{ReceivedError, ReceivedValueReference};
use std::borrow::Cow;

#[derive(Clone, Copy, Default)]
pub struct CurrentFacetSelector<'a> {
    pub exposure: Option<&'a str>,
    pub modality: Option<Modality>,
    pub channel: Option<&'a DefinitionPin>,
}

#[derive(Clone, Copy)]
pub struct CurrentNativeFacet<'a> {
    pub field: &'a CurrentStoredField,
    pub grant: &'a CurrentFacetGrant,
    pub original_source: &'a ReceivedObservation,
    pub metadata: &'a CurrentPartPartition,
}

pub fn received_track_key(
    exposure: &str,
    channel: &DefinitionPin,
) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&(exposure, &channel.id, channel.version, &channel.digest))
        .map_err(|_| ReceivedError("Received track identity encoding failed."))
}

pub fn current_field_parts(field: &CurrentStoredField) -> &'static [CurrentReceivedPart] {
    if field.value.kind == "body" {
        &[CurrentReceivedPart::Detail, CurrentReceivedPart::Pose]
    } else {
        &[CurrentReceivedPart::Value]
    }
}

pub fn current_group_metadata<'a>(
    group: &'a CurrentReceivedGroup,
    kind: &str,
    part: Option<CurrentReceivedPart>,
) -> Option<&'a CurrentPartPartition> {
    let part = part.unwrap_or(
        if group
            .received
            .fields
            .get(kind)
            .is_some_and(|field| field.value.kind == "body")
        {
            CurrentReceivedPart::Detail
        } else {
            CurrentReceivedPart::Value
        },
    );
    // A current installation validates unique members. Last-address lookup also
    // matches the source owner's map semantics for editable phase metadata.
    group.metadata.iter().rev().find(|partition| {
        partition
            .members
            .iter()
            .any(|(field, member)| field == kind && *member == part)
    })
}

pub fn current_group_native_facet<'a>(
    group: &'a CurrentReceivedGroup,
    original: &'a ReceivedObservation,
    kind: &str,
    partition: Option<&'a CurrentPartPartition>,
) -> Option<CurrentNativeFacet<'a>> {
    Some(CurrentNativeFacet {
        field: group.received.fields.get(kind)?,
        grant: &group.received.grant,
        original_source: original,
        metadata: partition.or_else(|| current_group_metadata(group, kind, None))?,
    })
}

pub fn current_contact_native_facet<'a>(
    contact: &'a CurrentContact,
    kind: &str,
    selector: CurrentFacetSelector<'_>,
) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
    let mut selected = None;
    for group in &contact.content.groups {
        let grant = &group.received.grant;
        if !group.received.fields.contains_key(kind)
            || selector
                .modality
                .is_some_and(|modality| modality != grant.modality)
            || selector
                .channel
                .is_some_and(|channel| channel != &grant.channel)
            || selector
                .exposure
                .is_some_and(|exposure| exposure != grant.exposure)
        {
            continue;
        }
        if selected.is_some() {
            return Ok(None);
        }
        selected = Some(group);
    }
    let Some(group) = selected else {
        return Ok(None);
    };
    let original = contact
        .content
        .originals
        .get(&group.received.grant.original)
        .ok_or(ReceivedError("A current group has no acquired original."))?;
    Ok(current_group_native_facet(group, original, kind, None))
}

pub fn current_native_facet_at<'a>(
    owner: Option<&'a PerceptionEvidenceOwner>,
    subject_id: &str,
    kind: &str,
    selector: CurrentFacetSelector<'_>,
) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
    let Some(contact) = owner.and_then(|owner| owner.current.get(subject_id)) else {
        return Ok(None);
    };
    current_contact_native_facet(contact, kind, selector)
}

pub fn current_facet_exposure(
    owner: &PerceptionEvidenceOwner,
    input: CurrentNativeFacet<'_>,
) -> Result<ObservationExposure, ReceivedError> {
    Ok(ObservationExposure {
        observer: owner
            .observer
            .as_ref()
            .ok_or(ReceivedError(
                "A current observation has no receiving observer.",
            ))?
            .clone(),
        episode_id: input.grant.exposure.clone(),
        track: received_track_key(&input.grant.exposure, &input.grant.channel)?,
    })
}

#[derive(Clone, Copy)]
pub struct SightStampRef<'a> {
    pub through: f64,
    pub revision: u64,
    pub input_revision: u64,
    pub received_order: u64,
    pub frame_ref: &'a ReceivedValueReference,
}
impl<'a> From<&'a CurrentSightStamp> for SightStampRef<'a> {
    fn from(stamp: &'a CurrentSightStamp) -> Self {
        Self {
            through: stamp.through,
            revision: stamp.revision,
            input_revision: stamp.input_revision,
            received_order: stamp.received_order,
            frame_ref: &stamp.frame_ref,
        }
    }
}
impl<'a> From<&'a CurrentSightCheck> for SightStampRef<'a> {
    fn from(stamp: &'a CurrentSightCheck) -> Self {
        Self {
            through: stamp.through,
            revision: stamp.revision,
            input_revision: stamp.input_revision,
            received_order: stamp.received_order,
            frame_ref: &stamp.frame_ref,
        }
    }
}

fn check_covers(stamp: SightStampRef<'_>, partition: &CurrentPartPartition, through: f64) -> bool {
    stamp.through >= through
        && (stamp.through > partition.received_at
            || (stamp.through == partition.received_at
                && stamp.received_order >= partition.received_order))
}

pub fn effective_current_check<'a>(
    owner: &'a PerceptionEvidenceOwner,
    grant: &CurrentFacetGrant,
    partition: &CurrentPartPartition,
    presence_only: bool,
) -> Result<Option<SightStampRef<'a>>, ReceivedError> {
    if partition.availability.is_some()
        || grant.modality != Modality::Sight
        || owner
            .observer
            .as_ref()
            .is_none_or(|observer| observer.physical_life != owner.life)
    {
        return Ok(None);
    }
    let Some(phase) = owner
        .visual_confirmation
        .as_ref()
        .filter(|phase| phase.channel == grant.channel)
    else {
        return Ok(None);
    };
    let Some(body) = current_native_facet_at(
        Some(owner),
        &grant.subject_id,
        "body",
        CurrentFacetSelector {
            channel: Some(&grant.channel),
            exposure: Some(&grant.exposure),
            modality: None,
        },
    )?
    else {
        return Ok(None);
    };
    if body.metadata.availability.is_some() || body.grant.exposure != grant.exposure {
        return Ok(None);
    }
    let check = if presence_only {
        CurrentCheck::Broad
    } else {
        partition.check
    };
    if check == CurrentCheck::None
        || partition
            .members
            .iter()
            .all(|(_, part)| *part == CurrentReceivedPart::Pose)
    {
        return Ok(None);
    }
    let explicit = owner
        .current
        .get(&grant.subject_id)
        .and_then(|contact| contact.sight.as_ref());
    let candidate = match check {
        CurrentCheck::Detail => explicit
            .and_then(|stamp| stamp.detail.as_ref())
            .map(SightStampRef::from),
        _ => explicit.map(SightStampRef::from),
    };
    let through = partition.times.expanded().confirmed_through;
    let selected = candidate.filter(|stamp| check_covers(*stamp, partition, through));
    let complete = if check == CurrentCheck::Broad {
        phase.complete.as_ref().map(SightStampRef::from)
    } else {
        None
    };
    Ok(
        match complete.filter(|stamp| check_covers(*stamp, partition, through)) {
            Some(complete)
                if selected.is_none_or(|selected| {
                    complete.through > selected.through
                        || (complete.through == selected.through
                            && complete.received_order > selected.received_order)
                }) =>
            {
                Some(complete)
            }
            _ => selected,
        },
    )
}

pub(crate) fn same_received_value_reference(
    left: &ReceivedValueReference,
    right: &ReceivedValueReference,
) -> Result<bool, ReceivedError> {
    match (left, right) {
        (ReceivedValueReference::Shared(left), ReceivedValueReference::Shared(right)) => {
            Ok(left == right)
        }
        (ReceivedValueReference::Inline(left), ReceivedValueReference::Inline(right)) => {
            Ok(crate::encoding::json_record(left)
                .map_err(|_| ReceivedError("Received reference encoding failed."))?
                == crate::encoding::json_record(right)
                    .map_err(|_| ReceivedError("Received reference encoding failed."))?)
        }
        _ => Ok(false),
    }
}

pub fn current_partition_with_check<'a>(
    partition: &'a CurrentPartPartition,
    confirmation: SightStampRef<'_>,
    detach: bool,
) -> Result<Cow<'a, CurrentPartPartition>, ReceivedError> {
    let mut times = partition.times.expanded();
    let revision = if detach {
        partition.revision.max(confirmation.revision)
    } else {
        partition.revision
    };
    if revision == partition.revision
        && times.confirmed_through == confirmation.through
        && partition.confirmed_revision >= confirmation.revision
        && partition.received_order == confirmation.received_order
    {
        if let Some(reference) = partition.frame_ref.as_ref()
            && same_received_value_reference(reference, confirmation.frame_ref)?
        {
            return Ok(Cow::Borrowed(partition));
        }
    }
    let mut selected = partition.clone();
    times.confirmed_through = confirmation.through;
    selected.revision = revision;
    selected.confirmed_revision = partition.confirmed_revision.max(confirmation.revision);
    selected.received_order = confirmation.received_order;
    selected.frame_ref = Some(confirmation.frame_ref.clone());
    selected.times = CurrentGroupTimes::pack(times);
    Ok(Cow::Owned(selected))
}

pub fn effective_current_partition<'a>(
    owner: &PerceptionEvidenceOwner,
    group: &CurrentReceivedGroup,
    partition: &'a CurrentPartPartition,
    detach: bool,
) -> Result<Cow<'a, CurrentPartPartition>, ReceivedError> {
    match effective_current_check(owner, &group.received.grant, partition, false)? {
        Some(confirmation) => current_partition_with_check(partition, confirmation, detach),
        None => Ok(Cow::Borrowed(partition)),
    }
}
