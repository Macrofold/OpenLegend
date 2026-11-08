//! Personally received physical geometry and its unfinished bounded query.
//! Rebuilding an index never creates terrain knowledge or a new observation.

use super::*;
use crate::received::TemporalCurrentGroupCheckpoint;
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use serde::{Deserialize, Serialize};

mod math;
pub(super) use math::EPSILON as RECEIVED_GEOMETRY_EPSILON;
mod receive;
mod recording;
pub(crate) use receive::{
    CompletedGeometryReception, CurrentReceivedGeometry, GeometryReceptionAnswer,
    GeometryReceptionCursor, GeometryReceptionStep, current_received_geometry,
    expire_received_geometry_motion,
};

pub(crate) fn end_received_geometry(
    core: &mut crate::execution::CoreMutation<'_>,
    observer: &str,
    budget: &crate::host::ByteBudget,
) -> Result<(), crate::execution::ExecutionError> {
    let Some(owner) = core
        .state
        .reception
        .perception_evidence
        .as_ref()
        .and_then(|owners| owners.get(observer))
    else {
        return Ok(());
    };
    if owner.geometry.is_none() {
        return Ok(());
    }
    let life = owner.life;
    let lease = core
        .journal
        .acquisitions
        .begin_received(observer, life, None)?;
    recording::end_geometry(core, observer, budget)?;
    retirement::finish_received(core, lease)
}

// The runtime uses a bool for this literal while decoding checks it below.
fn true_flag<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<bool>, D::Error> {
    let flag = bool::deserialize(deserializer)?;
    if flag {
        Ok(Some(true))
    } else {
        Err(serde::de::Error::custom("Invalid truncated coverage flag."))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BoundsQueryCursor {
    #[serde(deserialize_with = "cursor_paths")]
    pub pending: Vec<Vec<i64>>,
    #[serde(deserialize_with = "cursor_offset")]
    pub offset: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub leaf: Option<bool>,
    #[serde(
        default,
        deserialize_with = "true_flag",
        skip_serializing_if = "Option::is_none"
    )]
    pub truncated: Option<bool>,
}

fn cursor_paths<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Vec<Vec<i64>>, D::Error> {
    // JS stores ordinary branches as 0/1 and a prioritized leaf's last entry as
    // -at-1. Floating JSON1.0 is still the integer1 in the current JS format.
    let input = Vec::<Vec<f64>>::deserialize(deserializer)?;
    if input.len() > 64
        || input.iter().any(|path| {
            path.len() > 64
                || path.iter().enumerate().any(|(index, part)| {
                    *part != 0.0
                        && *part != 1.0
                        && !(index + 1 == path.len()
                            && part.is_finite()
                            && part.fract() == 0.0
                            && (-4.0..=-1.0).contains(part))
                })
        })
    {
        return Err(serde::de::Error::custom(
            "Invalid received feature continuation.",
        ));
    }
    Ok(input
        .into_iter()
        .map(|path| path.into_iter().map(|part| part as i64).collect())
        .collect())
}

fn cursor_offset<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<u64, D::Error> {
    let offset = deserialize_safe_integer(deserializer)?;
    if offset <= 4 {
        Ok(offset)
    } else {
        Err(serde::de::Error::custom(
            "Invalid received feature continuation offset.",
        ))
    }
}

impl BoundsQueryCursor {
    pub fn validate(&self) -> bool {
        self.pending.len() <= 64
            && self.pending.iter().all(|path| {
                path.len() <= 64
                    && path.iter().enumerate().all(|(index, part)| {
                        *part == 0
                            || *part == 1
                            || (index + 1 == path.len() && (-4..=-1).contains(part))
                    })
            })
            && self.offset <= 4
            && self.truncated != Some(false)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedGeometryFeature {
    pub observation: ObservationContribution,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recording: Option<TemporalCurrentGroupCheckpoint>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GeometryFragment {
    pub feature_id: String,
    pub u0: f64,
    pub u1: f64,
    pub v0: f64,
    pub v1: f64,
    pub key: String,
    pub observation: ObservationContribution,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub recording: Option<TemporalCurrentGroupCheckpoint>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PriorGeometryFrame {
    pub at: f64,
    pub frame: ObservationFrame,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReceivedGeometryState {
    pub basis: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub input_revision: u64,
    pub source_basis: String,
    pub episode_id: String,
    pub frame: ObservationFrame,
    pub frame_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub prior_frame: Option<PriorGeometryFrame>,
    pub eye: Point,
    pub radius: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub geometry_revision: u64,
    pub supported_through: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    pub next_at: f64,
    pub query_key: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub anchor_cursor: u64,
    pub fragments: Vec<GeometryFragment>,
    pub boundaries: Vec<ReceivedGeometryFeature>,
    pub boundary_keys: Vec<String>,
    pub finished: bool,
    pub unknown: bool,
    pub complete: bool,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub visited: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bytes: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub feature_cursor: Option<BoundsQueryCursor>,
}

impl ReceivedGeometryState {
    pub(crate) fn validate(
        &self,
        owner: &PerceptionEvidenceOwner,
        _values: &impl ReceivedValueLookup,
        now: f64,
        input_revision: u64,
        attention: &crate::attention::AttentionPolicy,
        temporal: &crate::received::TemporalState,
        originals: &mut OriginalRevisionRegistry,
    ) -> Result<(), crate::received::ReceivedError> {
        let invalid = || crate::received::ReceivedError("Invalid received contextual geometry.");
        let time = |at: f64| at.is_finite() && at >= 0.0 && at <= now;
        let policy = &attention.geometry;
        if [
            &self.basis,
            &self.source_basis,
            &self.episode_id,
            &self.query_key,
        ]
        .into_iter()
        .any(|text| text.is_empty())
            || !time(self.frame_at)
            || self.prior_frame.as_ref().is_some_and(|prior| {
                !prior.at.is_finite()
                    || prior.at < 0.0
                    || prior.at > self.frame_at
                    || !prior.frame.validate()
            })
            || !self.frame.validate()
            || ![self.eye.x, self.eye.y, self.eye.z, self.radius]
                .into_iter()
                .all(f64::is_finite)
            || self.radius <= 0.0
            || !time(self.supported_through)
            || !self.next_at.is_finite()
            || self.next_at < 0.0
            || self.visited > policy.visits
            || self.bytes > policy.max_bytes
            || self.input_revision > input_revision
            || self.complete != (self.finished && !self.unknown)
            || self.fragments.len() + self.boundaries.len() > policy.max_views as usize
            || self.boundary_keys.len() != self.boundaries.len()
            || self
                .boundary_keys
                .iter()
                .collect::<std::collections::BTreeSet<_>>()
                .len()
                != self.boundary_keys.len()
            || self
                .feature_cursor
                .as_ref()
                .is_some_and(|cursor| !cursor.validate())
        {
            return Err(invalid());
        }
        let observer = owner.observer.as_ref().ok_or_else(invalid)?;
        let mut ids = std::collections::BTreeSet::new();
        let mut keys = std::collections::BTreeSet::new();
        let mut bytes = 0u64;
        for fragment in &self.fragments {
            let extent = crate::encoding::json_record(&(
                &fragment.feature_id,
                fragment.u0,
                fragment.u1,
                fragment.v0,
                fragment.v1,
            ))
            .map_err(|_| invalid())?;
            if fragment.feature_id.is_empty()
                || ![fragment.u0, fragment.u1, fragment.v0, fragment.v1]
                    .into_iter()
                    .all(|value| value.is_finite() && (0.0..=1.0).contains(&value))
                || fragment.u0 >= fragment.u1
                || fragment.v0 >= fragment.v1
                || fragment.key != extent
                || !keys.insert(fragment.key.as_str())
                || fragment.observation.facets.len() != 1
                || !matches!(
                    fragment.observation.facets[0].value,
                    SensoryFacet::SurfacePatch { .. }
                )
            {
                return Err(invalid());
            }
        }
        for (observation, recording) in self
            .fragments
            .iter()
            .map(|fragment| (&fragment.observation, fragment.recording.as_ref()))
            .chain(
                self.boundaries
                    .iter()
                    .map(|boundary| (&boundary.observation, boundary.recording.as_ref())),
            )
        {
            originals.validate(observation)?;
            if !ids.insert(observation.id.as_str())
                || observation.observer.actor_id != observer.actor_id
                || observation.observer.physical_life != owner.life
                || observation.modality != Modality::Sight
                || observation.acquired_at > now
                || observation.facets.len() != 1
                || !matches!(
                    observation.facets[0].value,
                    SensoryFacet::SurfacePatch { .. } | SensoryFacet::PhysicalBoundary { .. }
                )
            {
                return Err(invalid());
            }
            if let Some(recording) = recording {
                let epoch = &temporal
                    .actor(&observer.actor_id)
                    .ok_or_else(invalid)?
                    .header()
                    .epoch;
                recording.validate(
                    now,
                    &[crate::received::CurrentMemberPart {
                        kind: observation.facets[0].value.kind().to_owned(),
                        part: CurrentReceivedPart::Value,
                    }],
                    &observation.observer,
                    epoch,
                )?;
            }
            if let SensoryFacet::PhysicalBoundary { boundary } = &observation.facets[0].value {
                for surface in [&boundary.near_surface, &boundary.far_surface] {
                    let source = &surface.support.source;
                    if source.family!=EvidenceFamily::NativeExposure||source.observer.actor_id!=observer.actor_id||source.observer.physical_life!=owner.life||surface.support.ordinal!=0||!self.fragments.iter().any(|fragment|fragment.observation.id==source.id&&matches!(source.revision,SourceRevision::Number(revision)if revision==fragment.observation.revision)&&matches!(fragment.observation.facets[0].value,SensoryFacet::SurfacePatch{..})){return Err(invalid())}
                }
            }
            bytes = bytes
                .checked_add(
                    u64::try_from(
                        crate::encoding::json_record_len(observation).map_err(|_| invalid())?,
                    )
                    .map_err(|_| invalid())?,
                )
                .ok_or_else(invalid)?;
        }
        if bytes != self.bytes {
            return Err(invalid());
        }
        Ok(())
    }
}
