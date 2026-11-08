//! Record the existing current field directly. Neutral value/pose/frame links
//! retain their actual acquisition; later confirmation changes support clocks,
//! never the held physical measurement or an observer's original position.

use super::*;
use crate::reception::{
    FacetReception, FacetRole, current_group_native_facet, effective_current_check,
    received_body_parts, received_observation_frame,
};

pub(super) fn facet_input(
    owner: &PerceptionEvidenceOwner,
    values: &ReceivedValues,
    input: &TemporalCurrentGroupInput<'_>,
    kind: &str,
    partition: &CurrentPartPartition,
) -> Result<TemporalCaptureFacet, ReceivedError> {
    let native =
        current_group_native_facet(input.group, input.original_source, kind, Some(partition))
            .ok_or(ReceivedError("Received change has no current typed value."))?;
    native_facet_input(owner, values, native)
}

pub(super) fn native_facet_input(
    owner: &PerceptionEvidenceOwner,
    values: &ReceivedValues,
    native: crate::reception::CurrentNativeFacet<'_>,
) -> Result<TemporalCaptureFacet, ReceivedError> {
    let partition = native.metadata;
    let observer = owner.observer.as_ref().ok_or(ReceivedError(
        "Current temporal field has no receiving observer.",
    ))?;
    let fragment = values
        .value_at(&native.field.value.reference)
        .ok_or(ReceivedError("Current temporal value is unavailable."))?;
    if fragment.kind() != native.field.value.kind
        && !(native.field.value.kind == "location"
            && matches!(fragment, ReceivedValueFragment::BodyPose(_)))
    {
        return Err(ReceivedError(
            "Current temporal value and descriptor disagree.",
        ));
    }
    let reception = match fragment {
        ReceivedValueFragment::Body(_) => {
            let Some(FacetReception::Body { pose_ref }) = &native.field.value.reception else {
                return Err(ReceivedError("Current body has no received pose."));
            };
            if received_body_parts(values, &native.field.value).is_none() {
                return Err(ReceivedError("Current body has no received pose."));
            }
            Some(TemporalReception::Body {
                pose: BodyReception::Reference {
                    pose_ref: pose_ref.clone(),
                },
            })
        }
        ReceivedValueFragment::Location(_) | ReceivedValueFragment::BodyPose(_) => {
            let Some(FacetReception::Location { frame_ref }) = &native.field.value.reception else {
                return Err(ReceivedError("Current location has no received frame."));
            };
            Some(TemporalReception::Location {
                frame: received_observation_frame(values, frame_ref)?.clone(),
            })
        }
        ReceivedValueFragment::Sensory(_)
        | ReceivedValueFragment::PersonalAccount(_)
        | ReceivedValueFragment::ActionResult(_) => {
            if native.field.value.reception.is_some() {
                return Err(ReceivedError("Current scalar has foreign reception."));
            }
            None
        }
        _ => {
            return Err(ReceivedError(
                "Current temporal value is not a recordable field.",
            ));
        }
    };
    let role = native
        .original_source
        .facets
        .get(native.field.original_ordinal as usize)
        .and_then(|field| field.role)
        .unwrap_or(FacetRole::Direct);
    let role = match role {
        FacetRole::Direct => ReceivedRole::Direct,
        FacetRole::Inference => ReceivedRole::Inference,
        FacetRole::Testimony => ReceivedRole::Testimony,
    };
    let mut times = partition.times.expanded();
    let mut revision = partition.revision;
    if let Some(check) = effective_current_check(owner, native.grant, partition, false)? {
        times.confirmed_through = check.through;
        revision = revision.max(check.revision);
    }
    let original = ObservationFactKey {
        source: EvidenceSource {
            family: EvidenceFamily::NativeExposure,
            id: native.original_source.id.clone(),
            revision: SourceRevision::Number(native.original_source.revision),
            observer: observer.clone(),
        },
        ordinal: native.field.original_ordinal,
    };
    let confirmation = EvidenceSource {
        family: EvidenceFamily::NativeExposure,
        id: native.field.id.clone(),
        revision: SourceRevision::Number(revision),
        observer: observer.clone(),
    };
    let appearance = ReceivedFacetProof {
        original: original.clone(),
        confirmation: confirmation.clone(),
        confirmed_from: times.confirmed_from,
        confirmed_through: times.confirmed_through,
        aliases: None,
    };
    let body = matches!(fragment, ReceivedValueFragment::Body(_));
    let detail_support = body.then(|| TemporalDetailSupport {
        proof: appearance.clone(),
        role,
        from: times.value_measured_from,
        through: times.value_measured_through,
        acquired_at: times.value_acquired_at,
    });
    let received_from = if body {
        original.source.clone()
    } else {
        confirmation
    };
    let support = if body {
        ReceivedFacetProof {
            original: original.clone(),
            confirmation: received_from.clone(),
            confirmed_from: times.value_measured_from,
            confirmed_through: times.value_measured_through,
            aliases: None,
        }
    } else {
        appearance
    };
    Ok(TemporalCaptureFacet {
        value: fragment.clone(),
        preferred: Some(native.field.value.reference.clone()),
        reception,
        clock: ReceivedFieldClock {
            role,
            as_of: times.value_measured_through,
            measured_from: times.value_measured_from,
            measured_through: times.value_measured_through,
            acquired_at: times.value_acquired_at,
            confirmed_through: None,
        },
        member_index: None,
        track: None,
        support: Some(support),
        detail_support,
        pose_frame: None,
        original: Some(original),
        received_from: Some(received_from),
    })
}
