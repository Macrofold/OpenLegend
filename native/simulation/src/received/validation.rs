//! Current-format receipt validity and borrowed permitted value expansion.
//! An address or a shared value alone never supplies receiver-owned geometry.

use super::values::{BodyKind, LocationKind};
use super::{
    BodyReception, ReceivedError, ReceivedValueFragment, ReceivedValues, TemporalChange,
    TemporalFacetReference, TemporalReceipt, TemporalReception,
};
use crate::encoding::json_record;
use crate::reception::{
    ObservationFrame, ObservedBodyDetails, ObservedBodyPose, ObservedLocation, ObservedPoint,
    ObserverLife,
};
use crate::values::{DefinitionPin, is_safe_record_id};
use serde::Serialize;
use std::{borrow::Cow, collections::BTreeSet};

#[derive(Serialize)]
pub struct MaterializedBody<'a> {
    #[serde(flatten)]
    details: &'a ObservedBodyDetails,
    #[serde(flatten)]
    pose: &'a ObservedBodyPose,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum MaterializedTemporalValue<'a> {
    Body {
        kind: BodyKind,
        body: MaterializedBody<'a>,
    },
    Location {
        kind: LocationKind,
        location: Cow<'a, ObservedLocation>,
        frame: &'a ObservationFrame,
    },
    Other(&'a ReceivedValueFragment),
}

pub fn materialize_temporal_value<'a>(
    reference: &'a TemporalFacetReference,
    fragment: &'a ReceivedValueFragment,
    values: &'a ReceivedValues,
) -> Option<MaterializedTemporalValue<'a>> {
    match (fragment, reference.reception.as_ref()) {
        (ReceivedValueFragment::Body(value), Some(TemporalReception::Body { pose })) => {
            let pose = match pose {
                BodyReception::Pose { pose } => Some(pose),
                BodyReception::Reference { pose_ref } => match values.value_at(pose_ref) {
                    Some(ReceivedValueFragment::BodyPose(value)) => Some(&value.pose),
                    _ => None,
                },
            }?;
            Some(MaterializedTemporalValue::Body {
                kind: BodyKind::Body,
                body: MaterializedBody {
                    details: &value.body,
                    pose,
                },
            })
        }
        (ReceivedValueFragment::Location(value), Some(TemporalReception::Location { frame })) => {
            Some(MaterializedTemporalValue::Location {
                kind: LocationKind::Location,
                location: Cow::Borrowed(&value.location),
                frame,
            })
        }
        (ReceivedValueFragment::BodyPose(value), Some(TemporalReception::Location { frame })) => {
            Some(MaterializedTemporalValue::Location {
                kind: LocationKind::Location,
                location: Cow::Owned(ObservedLocation::Point {
                    point: ObservedPoint::World(value.pose.position),
                    error_radius: 0.0,
                }),
                frame,
            })
        }
        (
            ReceivedValueFragment::Header(_)
            | ReceivedValueFragment::Frame(_)
            | ReceivedValueFragment::Body(_)
            | ReceivedValueFragment::Location(_)
            | ReceivedValueFragment::BodyPose(_),
            _,
        ) => None,
        (_, None) => Some(MaterializedTemporalValue::Other(fragment)),
        _ => None,
    }
}

impl MaterializedTemporalValue<'_> {
    fn validate(&self, observer: &ObserverLife) -> bool {
        match self {
            Self::Body { body, .. } => body.details.validate() && body.pose.validate(),
            Self::Location {
                location, frame, ..
            } => location.validate().is_ok() && frame.validate(),
            Self::Other(ReceivedValueFragment::Sensory(value)) => {
                value.validate().is_ok() && value.validate_participant_observers(observer).is_ok()
            }
            Self::Other(ReceivedValueFragment::PersonalAccount(value)) => !value.id.is_empty(),
            _ => false,
        }
    }
}

pub fn valid_temporal_subject(value: &str) -> bool {
    if is_safe_record_id(value) {
        return true;
    }
    let Ok(parts) = serde_json::from_str::<(String, String, u64, String)>(value) else {
        return false;
    };
    !parts.0.is_empty()
        && DefinitionPin {
            id: parts.1.clone(),
            version: parts.2,
            digest: parts.3.clone(),
        }
        .is_valid()
        && json_record(&parts).is_ok_and(|encoded| encoded == value)
}

fn strings_unique(values: &[String]) -> bool {
    let mut seen = BTreeSet::new();
    values
        .iter()
        .all(|value| !value.is_empty() && seen.insert(value))
}

impl TemporalReceipt {
    pub fn validate(
        &self,
        actor_id: &str,
        through: f64,
        values: &ReceivedValues,
        selected_values: Option<&[ReceivedValueFragment]>,
    ) -> Result<(), ReceivedError> {
        let header = &self.header;
        let terminal = matches!(
            header.change,
            TemporalChange::Loss
                | TemporalChange::Unchecked
                | TemporalChange::AttentionExit
                | TemporalChange::RecordingGap
        );
        if self.locator.actor_id != actor_id
            || self.id != self.locator.id()
            || !self.at.is_finite()
            || self.at < 0.0
            || self.at > through
            || !valid_temporal_subject(&header.subject)
            || !strings_unique(&header.source_ids)
            || header.context_subjects.as_ref().is_some_and(|subjects| {
                !strings_unique(subjects)
                    || subjects
                        .iter()
                        .any(|subject| !valid_temporal_subject(subject))
            })
            || header.spatial_context.is_some_and(|value| !value)
            || header
                .availability_at
                .is_some_and(|at| !at.is_finite() || at < 0.0 || at > self.at)
            || header.coverage_gap.as_ref().is_some_and(|gap| {
                !gap.from.is_finite()
                    || !gap.through.is_finite()
                    || gap.from < 0.0
                    || gap.from > gap.through
                    || gap.through > self.at
            })
            || (self.facets.is_empty() && !terminal)
        {
            return Err(ReceivedError("Invalid received receipt."));
        }
        let observer = ObserverLife {
            actor_id: actor_id.to_owned(),
            physical_life: self.locator.physical_life,
        };
        if self
            .origin
            .as_ref()
            .is_some_and(|origin| origin.validate(&observer, self.at).is_err())
            || self
                .receiver_frame
                .as_ref()
                .is_some_and(|frame| !frame.validate())
            || header
                .subject_identity
                .as_ref()
                .is_some_and(|subject| !subject.validate())
        {
            return Err(ReceivedError("Invalid received receipt binding."));
        }
        let mut members = BTreeSet::new();
        for (index, field) in self.facets.iter().enumerate() {
            let clock = &field.clock;
            if !members.insert(field.member_index)
                || ![
                    clock.as_of,
                    clock.measured_from,
                    clock.measured_through,
                    clock.acquired_at,
                ]
                .into_iter()
                .all(f64::is_finite)
                || clock.measured_from < 0.0
                || clock.measured_through < clock.measured_from
                || clock.measured_through > clock.acquired_at
                || clock.acquired_at > self.at
                || clock.confirmed_through.is_some_and(|at| {
                    !at.is_finite() || at < clock.measured_through || at > self.at
                })
            {
                return Err(ReceivedError("Invalid received logical member."));
            }
            let fragment = match selected_values {
                Some(selected) => selected.get(index),
                None => values.value_at(&field.value_ref),
            }
            .ok_or(ReceivedError("Received member has no retained value."))?;
            fragment.validate(through)?;
            let sources = [
                field.original.as_ref().map(|key| &key.source),
                field.received_from.as_ref(),
                field.support.as_ref().map(|proof| &proof.confirmation),
                field.support.as_ref().map(|proof| &proof.original.source),
                field
                    .detail_support
                    .as_ref()
                    .map(|detail| &detail.proof.confirmation),
                field
                    .detail_support
                    .as_ref()
                    .map(|detail| &detail.proof.original.source),
            ];
            if sources
                .into_iter()
                .flatten()
                .any(|source| source.validate().is_err() || source.observer != observer)
            {
                return Err(ReceivedError("Foreign received source."));
            }
            for proof in field
                .support
                .iter()
                .chain(field.detail_support.iter().map(|detail| &detail.proof))
            {
                if proof.validate(&observer, self.at).is_err() {
                    return Err(ReceivedError("Invalid received proof."));
                }
            }
            if !materialize_temporal_value(field, fragment, values)
                .is_some_and(|value| value.validate(&observer))
            {
                return Err(ReceivedError(
                    "Temporal fragment has no matching personal reception.",
                ));
            }
        }
        if let Some(ended) = &header.ended_fields {
            let mut seen = BTreeSet::new();
            if ended.is_empty()
                || !terminal
                || ended.iter().any(|(kind, part)| {
                    kind.is_empty() || !seen.insert((kind, json_record(part).unwrap_or_default()))
                })
            {
                return Err(ReceivedError("Invalid received field boundary."));
            }
        }
        if let Some(availability) = &header.availability {
            let mut assigned = BTreeSet::new();
            for group in availability {
                if !group.at.is_finite()
                    || group.at < 0.0
                    || group.at > self.at
                    || group.fields.is_empty()
                    || group
                        .fields
                        .iter()
                        .any(|field| !members.contains(field) || !assigned.insert(*field))
                {
                    return Err(ReceivedError("Invalid retained field availability."));
                }
            }
        }
        Ok(())
    }
}

pub fn temporal_receipt_change_count(change: TemporalChange, fields: usize) -> u64 {
    if matches!(
        change,
        TemporalChange::Loss
            | TemporalChange::Unchecked
            | TemporalChange::AttentionExit
            | TemporalChange::RecordingGap
            | TemporalChange::ReceiverFrame
    ) {
        0
    } else {
        fields as u64
    }
}
