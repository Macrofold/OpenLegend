//! Source-equivalent current sample admission. Meaning is decided before any
//! old recording is closed; the setter proves that close actually occurred.
use super::*;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::received::{ReceivedError, ReceivedValueFragment, ReceivedValueReference};
use crate::work::WorkUnit;
use std::{mem::size_of, sync::Arc};

fn invalid() -> ReceivedError {
    ReceivedError("Current sample has no unchanged acquired source binding.")
}
fn capacity() -> ReceivedError {
    ReceivedError("Current sample admission exceeds native byte allowance.")
}
#[derive(Clone, Copy, Default)]
pub(super) struct AttentionChangedParts {
    pub pose: bool,
    pub description: bool,
    pub association: bool,
    pub clock: bool,
    pub membership: bool,
}
#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum CurrentSampleStatus {
    Confirmed,
    Changed,
}
struct PriorBinding {
    group: CurrentGroupIdentity,
    field: CurrentStoredField,
    grant: CurrentFacetGrant,
    times: CurrentFacetTimes,
    revision: u64,
    availability: Option<CurrentAvailability>,
    original: Arc<ReceivedObservation>,
}
pub(super) struct PendingCurrentSample {
    observer: String,
    input: CurrentFacetInput,
    prior: Option<PriorBinding>,
    status: CurrentSampleStatus,
    parts: AttentionChangedParts,
    close: bool,
}
impl PendingCurrentSample {
    pub(super) fn subject_id(&self) -> &str {
        &self.input.grant.subject_id
    }
    pub(super) fn channel(&self) -> &DefinitionPin {
        &self.input.grant.channel
    }
    pub(super) fn kind(&self) -> &str {
        &self.input.field.value.kind
    }
    pub(super) fn status(&self) -> CurrentSampleStatus {
        self.status
    }
    pub(super) fn changed_parts(&self) -> AttentionChangedParts {
        self.parts
    }
    pub(super) fn needs_history_close(&self) -> bool {
        self.close
    }
}
fn owner<'a>(
    state: &'a ReceptionState,
    observer: &str,
) -> Result<&'a PerceptionEvidenceOwner, ReceivedError> {
    state
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
        .ok_or_else(invalid)
}
fn field<'a>(
    state: &'a ReceptionState,
    observer: &str,
    input: &CurrentFacetInput,
) -> Result<Option<CurrentNativeFacet<'a>>, ReceivedError> {
    current_native_facet_at(
        Some(owner(state, observer)?),
        &input.grant.subject_id,
        &input.field.value.kind,
        CurrentFacetSelector {
            channel: Some(&input.grant.channel),
            exposure: None,
            modality: None,
        },
    )
}
fn role(source: &ReceivedObservation, ordinal: u64) -> Result<FacetRole, ReceivedError> {
    source
        .facets
        .get(usize::try_from(ordinal).map_err(|_| invalid())?)
        .map(|facet| facet.role.unwrap_or(FacetRole::Direct))
        .ok_or_else(invalid)
}
fn reference_bound(
    state: &ReceptionState,
    reference: &ReceivedValueReference,
) -> Result<usize, ReceivedError> {
    let fragment = match reference {
        ReceivedValueReference::Inline(value) => Some(value.as_ref()),
        ReceivedValueReference::Shared(id) => state
            .received_values
            .as_ref()
            .and_then(|values| values.shared_value(id)),
    }
    .ok_or_else(invalid)?;
    heap_sum([
        size_of::<SensoryFacet>(),
        fragment.heap_bytes().ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)
}
fn value_bound(state: &ReceptionState, value: &ReceivedFacetValue) -> Result<usize, ReceivedError> {
    let first = reference_bound(state, &value.reference)?;
    let extra = match &value.reception {
        Some(FacetReception::Body { pose_ref }) => reference_bound(state, pose_ref)?,
        Some(FacetReception::Location { frame_ref }) => reference_bound(state, frame_ref)?,
        None => 0,
    };
    first.checked_add(extra).ok_or_else(capacity)
}
fn same_meaning(
    state: &ReceptionState,
    before: CurrentNativeFacet<'_>,
    after: &CurrentFacetInput,
) -> Result<bool, ReceivedError> {
    let a = before.grant;
    let b = &after.grant;
    if a.subject_id != b.subject_id
        || a.subject_physical_life != b.subject_physical_life
        || a.exposure != b.exposure
        || a.modality != b.modality
        || a.channel != b.channel
        || before.field.body_lease_id != after.field.body_lease_id
        || role(before.original_source, before.field.original_ordinal)?
            != role(&after.original, after.field.original_ordinal)?
        || before.field.local_subject != after.field.local_subject
        || before.field.value.kind != after.field.value.kind
    {
        return Ok(false);
    }
    if before.field.value.kind == "location" {
        let values = &state.received_values.as_ref();
        let (
            Some(SensoryFacet::Location {
                location: left,
                frame: left_frame,
            }),
            Some(SensoryFacet::Location {
                location: right,
                frame: right_frame,
            }),
        ) = (
            received_facet_value(values, &before.field.value)?,
            received_facet_value(values, &after.field.value)?,
        )
        else {
            return Ok(false);
        };
        return Ok(match (left, right) {
            (
                ObservedLocation::Point {
                    point: left,
                    error_radius: a,
                },
                ObservedLocation::Point {
                    point: right,
                    error_radius: b,
                },
            ) => left.position() == right.position() && a == b,
            (left, right) => {
                crate::encoding::json_record(&left).map_err(|_| invalid())?
                    == crate::encoding::json_record(&right).map_err(|_| invalid())?
                    && crate::encoding::json_record(&left_frame).map_err(|_| invalid())?
                        == crate::encoding::json_record(&right_frame).map_err(|_| invalid())?
            }
        });
    }
    if !same_received_value_reference(&before.field.value.reference, &after.field.value.reference)?
    {
        return Ok(false);
    }
    match (&before.field.value.reception, &after.field.value.reception) {
        (
            Some(FacetReception::Body { pose_ref: left }),
            Some(FacetReception::Body { pose_ref: right }),
        ) => same_received_value_reference(left, right),
        (Some(FacetReception::Body { .. }), _) | (_, Some(FacetReception::Body { .. })) => {
            Ok(false)
        }
        _ => Ok(true),
    }
}
fn changed_parts(previous: Option<&SensoryFacet>, next: &SensoryFacet) -> AttentionChangedParts {
    let kind = next.kind();
    if matches!(
        kind,
        "location" | "observed-motion" | "surface-patch" | "physical-boundary"
    ) {
        return AttentionChangedParts {
            pose: true,
            ..Default::default()
        };
    }
    if kind == "association" {
        return AttentionChangedParts {
            association: true,
            description: true,
            ..Default::default()
        };
    }
    if matches!(kind, "description" | "carried" | "public-attributes") {
        return AttentionChangedParts {
            description: true,
            ..Default::default()
        };
    }
    if previous.is_none_or(|previous| previous.kind() != kind) {
        return AttentionChangedParts {
            membership: true,
            description: true,
            association: true,
            pose: true,
            clock: false,
        };
    }
    if let (Some(SensoryFacet::Body { body: a }), SensoryFacet::Body { body: b }) = (previous, next)
    {
        return AttentionChangedParts {
            pose: true,
            description: !super::body_meaning::body_meaning_equal(a, b),
            ..Default::default()
        };
    }
    if matches!(kind, "contact" | "detected") {
        return AttentionChangedParts {
            description: true,
            ..Default::default()
        };
    }
    AttentionChangedParts {
        membership: true,
        description: true,
        association: true,
        ..Default::default()
    }
}

/// None is the actual older-sample refusal; it has no current mutation. The
/// caller already owns the exact retained reference from original acquisition.
#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum CurrentValueMode {
    Retained,
    Sampled,
}
pub(super) fn prepare_current_sample(
    core: &mut CoreMutation<'_>,
    observer: &str,
    mut input: CurrentFacetInput,
    mode: CurrentValueMode,
    budget: &ByteBudget,
) -> Result<Option<PendingCurrentSample>, ExecutionError> {
    let state = &core.state.reception;
    let current_owner = owner(state, observer)?;
    let values = &state.received_values.as_ref();
    let header = received_observation_header(values, &input.original)?;
    if current_owner.observer.as_ref() != Some(&header.observer)
        || header.observer.actor_id != observer
    {
        return Err(invalid().into());
    }
    let source = input
        .original
        .facets
        .get(usize::try_from(input.field.original_ordinal).map_err(|_| invalid())?)
        .ok_or_else(invalid)?;
    if source.value.kind != input.field.value.kind {
        return Err(invalid().into());
    }
    let correspondence = if input.field.value.kind == "association" {
        current_native_facet_at(
            Some(current_owner),
            &input.grant.subject_id,
            "body",
            CurrentFacetSelector {
                channel: Some(&input.grant.channel),
                exposure: None,
                modality: None,
            },
        )?
        .is_some_and(|body| {
            input.field.body_lease_id.as_ref() == Some(&body.field.id)
                && body.grant.exposure == input.grant.exposure
        })
    } else {
        false
    };
    if header.channel.as_ref() != Some(&input.grant.channel) && !correspondence {
        return Err(invalid().into());
    }
    if matches!(input.field.value.kind.as_str(), "body" | "location")
        && source.role.unwrap_or(FacetRole::Direct) != FacetRole::Direct
    {
        return Err(invalid().into());
    }
    let previous = field(state, observer, &input)?;
    if previous.is_some_and(|previous| {
        input.times.value_measured_through
            < previous.metadata.times.expanded().value_measured_through
    }) {
        return Ok(None);
    }
    let bytes = heap_sum([
        size_of::<PendingCurrentSample>(),
        observer.len(),
        input.field.heap_bytes().ok_or_else(capacity)?,
        input.grant.heap_bytes().ok_or_else(capacity)?,
        value_bound(state, &input.field.value)?
            .checked_mul(3)
            .ok_or_else(capacity)?,
        previous.map_or(Ok(0), |previous| {
            heap_sum([
                previous.field.heap_bytes().ok_or_else(capacity)?,
                previous.grant.heap_bytes().ok_or_else(capacity)?,
                previous
                    .metadata
                    .availability
                    .heap_bytes()
                    .ok_or_else(capacity)?,
                value_bound(state, &previous.field.value)?
                    .checked_mul(3)
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)
        })?,
    ])
    .ok_or_else(capacity)?;
    core.journal.current.reserve_growth(bytes)?;
    if mode == CurrentValueMode::Sampled {
        let preferred = previous.map(|previous| previous.field.value.clone());
        let value = received_facet_value(values, &input.field.value)?.ok_or_else(invalid)?;
        let (retained, added) = super::originals::retain_facet(
            &mut core.state.reception.received_values,
            value,
            None,
            preferred.as_ref(),
            core.state.physical.header.sim_time,
            core.state.physical.header.sequence,
            &mut core.state.physical.identity,
            &core.state.activity.display,
        )?;
        if added > 0 {
            core.journal
                .meters
                .charge(&[(WorkUnit::OutputBytes, added)])?;
        }
        input.field.value = retained;
    }
    if input.field.value.kind == "body" && input.grant.modality == Modality::Sight {
        let ensured = crate::worlds::base_knowledge::ensure_body_individual(
            core,
            observer,
            &input.grant.subject_id,
            &input.grant,
            budget,
        )?;
        let subject = ensured.as_ref().map(|ensured| ensured.subject());
        core.journal.current.reserve_growth(
            subject
                .map_or(Some(0), HeapBytes::heap_bytes)
                .ok_or_else(capacity)?,
        )?;
        input.field.local_subject = subject.cloned();
    }
    let state = &core.state.reception;
    let current_owner = owner(state, observer)?;
    let values = &state.received_values.as_ref();
    let previous = field(state, observer, &input)?;
    input.availability = previous
        .and_then(|previous| previous.metadata.availability.as_ref())
        .filter(|availability| input.times.value_measured_through < availability.at)
        .cloned();
    let content_changed = match previous {
        Some(previous) => !same_meaning(state, previous, &input)?,
        None => true,
    };
    let changed = content_changed
        || previous
            .and_then(|previous| previous.metadata.availability.as_ref())
            .map(|availability| availability.at)
            != input
                .availability
                .as_ref()
                .map(|availability| availability.at);
    let prior = previous
        .map(|previous| -> Result<PriorBinding, ReceivedError> {
            Ok(PriorBinding {
                group: current_facet_membership(current_owner, previous.field, previous.grant)?,
                field: previous.field.clone(),
                grant: previous.grant.clone(),
                times: previous.metadata.times.expanded(),
                revision: previous.metadata.revision,
                availability: previous.metadata.availability.clone(),
                original: current_owner
                    .current
                    .get(&previous.grant.subject_id)
                    .and_then(|contact| contact.content.originals.get(&previous.grant.original))
                    .cloned()
                    .ok_or_else(invalid)?,
            })
        })
        .transpose()?;
    if !content_changed {
        let old = prior.as_ref().ok_or_else(invalid)?;
        input.field = old.field.clone();
        input.grant = old.grant.clone();
        input.original = old.original.clone();
        input.times = CurrentFacetTimes {
            confirmed_from: input.times.confirmed_from,
            confirmed_through: input.times.confirmed_through,
            ..old.times
        };
    }
    let mut parts = AttentionChangedParts {
        clock: true,
        ..Default::default()
    };
    if changed {
        if let Some(next) = received_facet_value(values, &input.field.value)? {
            let previous_value = prior
                .as_ref()
                .map(|previous| received_facet_value(values, &previous.field.value))
                .transpose()?
                .flatten();
            parts = changed_parts(previous_value.as_ref(), &next);
            if matches!(
                input.field.value.kind.as_str(),
                "body" | "contact" | "detected"
            ) && prior.as_ref().is_none_or(|prior| {
                prior.field.id != input.field.id || prior.grant.exposure != input.grant.exposure
            }) {
                parts.membership = true;
            }
            if prior
                .as_ref()
                .and_then(|prior| prior.field.local_subject.as_ref())
                != input.field.local_subject.as_ref()
            {
                parts.association = true;
            }
        }
    }
    input.field.semantic_revision = match &prior {
        Some(prior) => prior
            .field
            .semantic_revision
            .checked_add(u64::from(changed))
            .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(invalid)?,
        None => 1,
    };
    Ok(Some(PendingCurrentSample {
        observer: observer.to_owned(),
        input,
        close: prior.is_some() && changed,
        prior,
        status: if changed {
            CurrentSampleStatus::Changed
        } else {
            CurrentSampleStatus::Confirmed
        },
        parts,
    }))
}
pub(super) fn apply_current_sample(
    journal: &mut CurrentJournal,
    state: &mut ReceptionState,
    pending: PendingCurrentSample,
    stamp: CurrentReceptionStamp,
) -> Result<(CurrentSampleStatus, AttentionChangedParts), ReceivedError> {
    let previous = field(state, &pending.observer, &pending.input)?;
    match (&pending.prior, previous) {
        (None, None) => {}
        (Some(prior), Some(now)) => {
            if prior.group
                != current_facet_membership(owner(state, &pending.observer)?, now.field, now.grant)?
                || prior.field != *now.field
                || prior.grant != *now.grant
                || prior.times != now.metadata.times.expanded()
                || prior.revision != now.metadata.revision
                || prior.availability != now.metadata.availability
            {
                return Err(invalid());
            }
        }
        _ => return Err(invalid()),
    }
    if pending.close {
        if owner(state, &pending.observer)?
            .current
            .get(&pending.input.grant.subject_id)
            .is_some_and(|contact| {
                contact.content.groups.iter().any(|group| {
                    group.received.grant.channel == pending.input.grant.channel
                        && group.recordings.iter().flatten().any(|mark| {
                            mark.members
                                .iter()
                                .any(|member| member.kind == pending.input.field.value.kind)
                        })
                })
            })
        {
            return Err(ReceivedError(
                "Current sample replacement still owns an outgoing recording.",
            ));
        }
    }
    let subject = pending.input.grant.subject_id.clone();
    let kind = pending.input.field.value.kind.clone();
    let status = pending.status;
    let parts = pending.parts;
    current_facet_set(
        journal,
        state,
        &pending.observer,
        CurrentFacetAddress {
            subject_id: &subject,
            kind: &kind,
            channel: None,
        },
        Some((pending.input, stamp)),
    )?;
    Ok((status, parts))
}
