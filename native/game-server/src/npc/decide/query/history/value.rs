//! Use the held acquisition frame and the same descriptions as private
//! Recent observations. Raw storage identities and world coordinates stay local.
use super::{CallFailure, prepare};
use openlegend_simulation::{
    encoding::sha256_hex,
    received::{MaterializedTemporalValue, ReceivedValueFragment},
    reception::{
        ObservationFrame, ObservedLocation, ReceivedLocationSample, SensoryFacet, SpeechSegment,
    },
    runtime::RuntimeRecentReceipt,
    state::Point,
};
use serde_json::{Value, json};

pub(super) fn row(
    selected: &RuntimeRecentReceipt<'_>,
    decision: &prepare::ReceivedFrame,
    scope: &str,
    inventory: usize,
    ordinal: usize,
) -> Result<Value, CallFailure> {
    let receipt = selected.receipt();
    let reference = prepare::alias(scope, &format!("history-{inventory}"), ordinal);
    let subject = |track: &str| {
        // UUID scope and fixed separator are private to this request. Unlike
        // entity aliases, the result carries no permission to act on a subject.
        sha256_hex(format!("{scope}:history-subject:{track}").as_bytes())[..24].to_owned()
    };
    let mut facets = Vec::with_capacity(receipt.facets.len());
    for (field, value) in receipt.facets.iter().zip(selected.values()) {
        let presented = project_value(value, decision, receipt.header.change);
        let mut facet = json!({
            "ordinal": field.member_index,
            "role": field.clock.role,
            "asOf": field.clock.as_of,
            "measuredFrom": field.clock.measured_from,
            "measuredThrough": field.clock.measured_through,
            "acquiredAt": field.clock.acquired_at,
            "confirmedThrough": field.clock.confirmed_through,
            "value": presented,
        });
        if let Some(frame) = &field.pose_frame {
            facet["acquisitionFrame"] = observed_frame(decision, frame);
        }
        facets.push(facet);
    }
    if facets.len() != receipt.facets.len() {
        return Err(CallFailure::Invalid);
    }
    let mut row = json!({
        "reference":reference,
        "subject":subject(&receipt.header.subject),
        "acquiredAt":receipt.at,
        "change":receipt.header.change,
        "facets":facets,
    });
    if let Some(frame) = &receipt.receiver_frame {
        row["receiverFrame"] = observed_frame(decision, frame);
    }
    if let Some(context) = &receipt.header.context_subjects {
        row["contextFor"] = json!(
            context
                .iter()
                .map(|track| subject(track))
                .collect::<Vec<_>>()
        );
    }
    if let Some(gap) = &receipt.header.coverage_gap {
        row["coverageGap"] = json!(gap);
    }
    if let Some(at) = receipt.header.availability_at {
        row["availabilityAt"] = json!(at);
    }
    if let Some(availability) = &receipt.header.availability {
        row["availability"] = json!(availability);
    }
    Ok(row)
}

fn point(frame: &prepare::ReceivedFrame, point: Point) -> prepare::RelativeBody {
    prepare::relative_body(
        Point {
            x: frame.x,
            y: frame.y,
            z: frame.z,
        },
        frame.heading,
        point,
    )
}

fn vector(frame: &prepare::ReceivedFrame, point: Point) -> prepare::RelativeBody {
    prepare::relative_body(
        Point {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        },
        frame.heading,
        point,
    )
}

fn facing(frame: &prepare::ReceivedFrame, heading: f64) -> prepare::RelativeBody {
    let (x, z) = heading.sin_cos();
    vector(frame, Point { x, y: 0.0, z })
}

fn observed_frame(frame: &prepare::ReceivedFrame, observed: &ObservationFrame) -> Value {
    let mut result =
        json!({"observerAtAcquisition":point(frame, observed.position_at_observation)});
    if let Some(heading) = observed.forward_at_observation {
        result["facingAtAcquisition"] = json!(facing(frame, heading));
    }
    result
}

fn location(frame: &prepare::ReceivedFrame, observed: &ObservedLocation) -> Value {
    match observed {
        ObservedLocation::Point {
            point: at,
            error_radius,
        } => json!({
            "kind":"point","point": point(frame, at.position()),"errorRadius":error_radius
        }),
        ObservedLocation::Region { center, radius } => json!({
            "kind":"region","center":point(frame, center.position()),"radius":radius
        }),
        ObservedLocation::Bearing {
            from,
            sector,
            elevation,
            spread,
        } => {
            let (z, x) = (*sector as f64 * std::f64::consts::FRAC_PI_4).sin_cos();
            json!({"kind":"bearing","from":point(frame, from.position()),
                "direction":vector(frame, Point { x, y:0.0, z }),"elevation":elevation,"spread": spread})
        }
    }
}

fn motion_sample(frame: &prepare::ReceivedFrame, sample: &ReceivedLocationSample) -> Value {
    json!({
        "location":location(frame, &sample.location),
        "acquisitionFrame":observed_frame(frame, &sample.frame),
        "measuredFrom":sample.measured_from,
        "measuredThrough":sample.measured_through,
        "acquiredAt":sample.acquired_at,
        "confirmedThrough":sample.confirmed_through,
    })
}

fn project_value(
    value: MaterializedTemporalValue<'_>,
    frame: &prepare::ReceivedFrame,
    change: openlegend_simulation::received::TemporalChange,
) -> Value {
    match value {
        MaterializedTemporalValue::Body { body, .. } => {
            let item = body.details();
            json!({"kind":"body","body":{
                "kind": item.kind,
                "name": item.label.as_ref().map(|label| prepare::prompt_text(&label.name)),
                "appearance":prepare::prompt_text(&item.appearance),
                "position":point(frame, body.pose().position),
                "radius":item.radius,
                "height":item.height,
                "outward":item.outward,
                "activity":item.activity,
            }})
        }
        MaterializedTemporalValue::Location {
            location: at,
            frame: original,
            ..
        } => json!({
            "kind":"location","location":location(frame, &at),"acquisitionFrame":observed_frame(frame, original)
        }),
        MaterializedTemporalValue::Other(ReceivedValueFragment::Sensory(
            SensoryFacet::ObservedMotion { earlier, later, .. },
        )) => json!({
            "kind":"observed-motion",
            "earlier":motion_sample(frame, earlier),
            "later":motion_sample(frame, later),
        }),
        MaterializedTemporalValue::Other(ReceivedValueFragment::Sensory(
            SensoryFacet::SurfacePatch { patch },
        )) => json!({
            "kind":"surface-patch","patch":{
                "vertices":patch.vertices.iter().map(|at| point(frame, *at)).collect::<Vec<_>>(),
                "normal":vector(frame, patch.normal),"errorRadius":patch.error_radius,
                "acquisitionFrame":observed_frame(frame, &patch.frame),
            }
        }),
        MaterializedTemporalValue::Other(ReceivedValueFragment::Sensory(
            SensoryFacet::PhysicalBoundary { boundary },
        )) => json!({
            "kind":"physical-boundary","boundary":{
                "a":point(frame,boundary.a),"b":point(frame,boundary.b),"errorRadius":boundary.error_radius,
                "nearSurface":point(frame,boundary.near_surface.point),
                "farSurface":point(frame,boundary.far_surface.point),"dropLower":boundary.drop_lower,
            }
        }),
        MaterializedTemporalValue::Other(ReceivedValueFragment::Sensory(
            SensoryFacet::Speech { speech, .. },
        )) => {
            let segments = speech
                .segments
                .iter()
                .map(|segment| match segment {
                    SpeechSegment::Heard { text } => {
                        json!({"kind":"heard","text":prepare::prompt_text(text)})
                    }
                    SpeechSegment::Unintelligible => json!({"kind":"unintelligible"}),
                })
                .collect::<Vec<_>>();
            json!({
                "kind":"speech","segments":segments,"perception":speech.perception,
                "intelligibility":speech.intelligibility,"addressing":speech.addressing,
                "speaker":speech.speaker.as_ref().map(|item| prepare::prompt_text(&item.name_at_time)),
                "addressee":speech.addressee.as_ref().map(|item| prepare::prompt_text(&item.name_at_time)),
            })
        }
        other => {
            let text = crate::history_text::described(std::iter::once(other), change, true);
            json!({"kind":"received-description","text":prepare::prompt_text(&text)})
        }
    }
}
