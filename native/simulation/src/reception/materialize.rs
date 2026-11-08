//! Read products of selected, already received originals. Resolution never
//! samples physical state or repairs unavailable fragments from a later world.

use super::*;
use crate::received::{
    ReceivedError, ReceivedValueFragment, ReceivedValueReference, ReceivedValues,
};

/// A source lookup supplies values, not a personal grant. The caller first
/// selects an original from the actual observer/life owner. Captures implement
/// this same read seam with their retained closure, never with a live world.
pub trait ReceivedValueLookup {
    fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment>;

    fn value_at<'a>(
        &'a self,
        reference: &'a ReceivedValueReference,
    ) -> Option<&'a ReceivedValueFragment> {
        match reference {
            ReceivedValueReference::Shared(id) => self.shared_value(id),
            ReceivedValueReference::Inline(value) => Some(value),
        }
    }
}

impl ReceivedValueLookup for ReceivedValues {
    fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment> {
        self.shared_value(id)
    }
}

impl ReceivedValueLookup for Option<&ReceivedValues> {
    fn shared_value(&self, id: &str) -> Option<&ReceivedValueFragment> {
        self.and_then(|values| values.shared_value(id))
    }
}

pub fn received_observation_header<'a>(
    values: &'a impl ReceivedValueLookup,
    original: &'a ReceivedObservation,
) -> Result<&'a ReceivedObservationHeader, ReceivedError> {
    match values.value_at(&original.header_ref) {
        Some(ReceivedValueFragment::Header(value)) => Ok(&value.header),
        _ => Err(ReceivedError(
            "The received observation header is unavailable.",
        )),
    }
}

pub fn received_observation_frame<'a>(
    values: &'a impl ReceivedValueLookup,
    reference: &'a ReceivedValueReference,
) -> Result<&'a ObservationFrame, ReceivedError> {
    match values.value_at(reference) {
        Some(ReceivedValueFragment::Frame(value)) => Ok(&value.frame),
        _ => Err(ReceivedError(
            "The captured observation frame is unavailable.",
        )),
    }
}

pub fn received_body_parts<'a>(
    values: &'a impl ReceivedValueLookup,
    descriptor: &'a ReceivedFacetValue,
) -> Option<(&'a ObservedBodyDetails, &'a ObservedBodyPose)> {
    if descriptor.kind != "body" {
        return None;
    }
    let Some(FacetReception::Body { pose_ref }) = descriptor.reception.as_ref() else {
        return None;
    };
    match (
        values.value_at(&descriptor.reference),
        values.value_at(pose_ref),
    ) {
        (
            Some(ReceivedValueFragment::Body(details)),
            Some(ReceivedValueFragment::BodyPose(pose)),
        ) => Some((&details.body, &pose.pose)),
        _ => None,
    }
}

pub fn materialize_observed_body(
    details: &ObservedBodyDetails,
    pose: &ObservedBodyPose,
) -> ObservedBody {
    ObservedBody {
        kind: details.kind.clone(),
        appearance: details.appearance.clone(),
        radius: details.radius,
        height: details.height,
        outward: details.outward.clone(),
        position: pose.position,
        heading: pose.heading,
        support_surface_id: pose.support_surface_id.clone(),
        activity: details.activity.clone(),
        label: details.label.clone(),
        description: details.description.clone(),
        quantity: details.quantity,
        heat_lit: details.heat_lit,
        remains_phase: details.remains_phase,
        storage: details.storage.clone(),
        assembly: details.assembly.clone(),
        animation: details.animation.clone(),
        effects: details.effects.clone(),
        body_plan: details.body_plan,
        subtype: details.subtype.clone(),
        icon: details.icon.clone(),
    }
}

pub fn split_observed_body(body: ObservedBody) -> (ObservedBodyDetails, ObservedBodyPose) {
    let pose = ObservedBodyPose {
        position: body.position,
        heading: body.heading,
        support_surface_id: body.support_surface_id,
    };
    let details = ObservedBodyDetails {
        kind: body.kind,
        appearance: body.appearance,
        radius: body.radius,
        height: body.height,
        outward: body.outward,
        activity: body.activity,
        label: body.label,
        description: body.description,
        quantity: body.quantity,
        heat_lit: body.heat_lit,
        remains_phase: body.remains_phase,
        storage: body.storage,
        assembly: body.assembly,
        animation: body.animation,
        effects: body.effects,
        body_plan: body.body_plan,
        subtype: body.subtype,
        icon: body.icon,
    };
    (details, pose)
}

pub fn received_facet_value(
    values: &impl ReceivedValueLookup,
    descriptor: &ReceivedFacetValue,
) -> Result<Option<SensoryFacet>, ReceivedError> {
    if descriptor.kind == "body" {
        return Ok(
            received_body_parts(values, descriptor).map(|(details, pose)| SensoryFacet::Body {
                body: materialize_observed_body(details, pose),
            }),
        );
    }
    let Some(value) = values.value_at(&descriptor.reference) else {
        return Ok(None);
    };
    if descriptor.kind == "location" {
        let location = match value {
            ReceivedValueFragment::Location(value) => value.location.clone(),
            ReceivedValueFragment::BodyPose(value) => ObservedLocation::Point {
                point: value.pose.position.into(),
                error_radius: 0.0,
            },
            _ => return Ok(None),
        };
        let Some(FacetReception::Location { frame_ref }) = descriptor.reception.as_ref() else {
            return Ok(None);
        };
        let frame = received_observation_frame(values, frame_ref)?.clone();
        return Ok(Some(SensoryFacet::Location { location, frame }));
    }
    if descriptor.reception.is_some() || value.kind() != descriptor.kind {
        return Ok(None);
    }
    match value {
        ReceivedValueFragment::Sensory(value) => Ok(Some(value.clone())),
        _ => Ok(None),
    }
}

pub fn materialize_observation(
    values: &impl ReceivedValueLookup,
    original: &ReceivedObservation,
) -> Result<ObservationContribution, ReceivedError> {
    // Resolve the complete selected closure first. A partial response cannot
    // silently drop a missing personal facet or acquire it from present state.
    let header = received_observation_header(values, original)?;
    let (from, through) = match original.origin {
        ObservationOrigin::Occurrence { at, .. } => (at, at),
        ObservationOrigin::Exposure {
            measured_from,
            measured_through,
            ..
        } => (measured_from, measured_through),
    };
    let facets = original
        .facets
        .iter()
        .enumerate()
        .map(|(ordinal, facet)| {
            let measured_through = facet.measured_through.unwrap_or(through);
            Ok(ObservationFacet {
                support: facet.support.clone(),
                ordinal: facet.ordinal.unwrap_or(ordinal as u64),
                role: facet.role.unwrap_or(FacetRole::Direct),
                as_of: facet.as_of.unwrap_or(measured_through),
                measured_from: facet.measured_from.unwrap_or(from),
                measured_through,
                acquired_at: facet.acquired_at.unwrap_or(header.acquired_at),
                value: received_facet_value(values, &facet.value)?.ok_or(ReceivedError(
                    "The received facet reference has incompatible meaning.",
                ))?,
            })
        })
        .collect::<Result<Vec<_>, ReceivedError>>()?;
    Ok(ObservationContribution {
        id: original.id.clone(),
        revision: original.revision,
        observer: header.observer.clone(),
        origin: original.origin.clone(),
        acquired_at: header.acquired_at,
        received_order: header.received_order,
        modality: header.modality,
        channel: header
            .channel
            .as_ref()
            .or(original.channel.as_ref())
            .cloned(),
        detector: header.detector.clone(),
        context: original.context.clone(),
        facets,
    })
}

/// Identity of one actual acquisition. Source IDs, later aliases and retained
/// facet contents cannot make a second acquisition of an existing occurrence.
#[derive(Serialize)]
#[serde(untagged)]
enum AcquisitionOrigin<'a> {
    Occurrence((&'static str, &'a str, f64, u64)),
    Exposure((&'static str, &'a str, &'a str, f64, f64)),
}
fn acquisition_key<'a>(
    modality: Modality,
    detector: &'a DetectorIdentity,
    channel: Option<&'a DefinitionPin>,
    origin: &'a ObservationOrigin,
) -> impl Serialize + 'a {
    let channel = channel.map(|pin| (&pin.id, pin.version, &pin.digest));
    let origin = match origin {
        ObservationOrigin::Occurrence {
            event_id,
            at,
            order,
        } => AcquisitionOrigin::Occurrence(("occurrence", event_id, *at, *order)),
        ObservationOrigin::Exposure {
            episode_id,
            detector_id,
            measured_from,
            measured_through,
            ..
        } => AcquisitionOrigin::Exposure((
            "exposure",
            episode_id,
            detector_id,
            *measured_from,
            *measured_through,
        )),
    };
    (modality, &detector.id, detector.version, channel, origin)
}
pub fn observation_acquisition_key(
    modality: Modality,
    detector: &DetectorIdentity,
    channel: Option<&DefinitionPin>,
    origin: &ObservationOrigin,
) -> Result<String, ReceivedError> {
    crate::encoding::json_record(&acquisition_key(modality, detector, channel, origin))
        .map_err(|_| ReceivedError("Received acquisition identity encoding failed."))
}
pub(super) fn observation_acquisition_key_len(
    modality: Modality,
    detector: &DetectorIdentity,
    channel: Option<&DefinitionPin>,
    origin: &ObservationOrigin,
) -> Result<usize, ReceivedError> {
    crate::encoding::json_record_len(&acquisition_key(modality, detector, channel, origin))
        .map_err(|_| ReceivedError("Received acquisition identity encoding failed."))
}

pub fn received_observation_value_references(
    original: &ReceivedObservation,
) -> impl Iterator<Item = &str> {
    std::iter::once(&original.header_ref)
        .chain(original.facets.iter().flat_map(|facet| {
            std::iter::once(&facet.value.reference).chain(match &facet.value.reception {
                Some(FacetReception::Body { pose_ref }) => Some(pose_ref),
                Some(FacetReception::Location { frame_ref }) => Some(frame_ref),
                None => None,
            })
        }))
        .filter_map(|reference| match reference {
            ReceivedValueReference::Shared(id) => Some(id.as_str()),
            ReceivedValueReference::Inline(_) => None,
        })
}
