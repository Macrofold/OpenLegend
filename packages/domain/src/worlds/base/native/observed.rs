//! Wilderness-family outward presentation records. They disclose received
//! appearance, never private targets, inventory or mechanical authority.

use crate::state::{Point, SurfacePoint};
use crate::values::{deserialize_present_option, deserialize_safe_integer};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FinitePanel {
    pub corners: [Point; 4],
    pub thickness: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AssemblyRole {
    Post,
    GatePost,
    Cover,
    Binding,
    Hearth,
    Panel,
    AccessPanel,
    Gate,
    FirstRail,
    SecondRail,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShapeGeometry {
    Cylinder,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedAssemblyShape {
    pub min: Point,
    pub max: Point,
    pub id: String,
    pub role: AssemblyRole,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub geometry: Option<ShapeGeometry>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub panel: Option<FinitePanel>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AssemblyPresentation {
    pub post_color: String,
    pub cover_color: String,
    pub cover_opacity: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FlexiblePart {
    pub id: String,
    pub name: String,
    pub slot: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub condition: Option<String>,
    pub role: FlexibleRole,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bay: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FlexibleRole {
    Post,
    Cover,
    Binding,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BoundaryPart {
    pub id: String,
    pub name: String,
    pub slot: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub condition: Option<String>,
    pub role: BoundaryRole,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BoundaryRole {
    Post,
    GatePost,
    Panel,
    AccessPanel,
    Gate,
    FirstRail,
    SecondRail,
    Binding,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "implementation",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum ObservedAssembly {
    #[serde(rename = "four-corner-flexible-bays")]
    FlexibleBays {
        presentation: AssemblyPresentation,
        family_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        heading: f64,
        site: SurfacePoint,
        shapes: Vec<ObservedAssemblyShape>,
        arrangement_id: String,
        parts: Vec<FlexiblePart>,
    },
    #[serde(rename = "grounded-panel-boundary")]
    GroundedBoundary {
        presentation: AssemblyPresentation,
        family_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        revision: u64,
        heading: f64,
        site: SurfacePoint,
        shapes: Vec<ObservedAssemblyShape>,
        material_revision: String,
        parts: Vec<BoundaryPart>,
    },
}

impl ObservedAssembly {
    pub fn validate(&self) -> bool {
        let (family, heading, site, presentation, shapes) = match self {
            Self::FlexibleBays {
                family_id,
                heading,
                site,
                presentation,
                shapes,
                ..
            }
            | Self::GroundedBoundary {
                family_id,
                heading,
                site,
                presentation,
                shapes,
                ..
            } => (family_id, heading, site, presentation, shapes),
        };
        if family.is_empty()
            || !heading.is_finite()
            || !finite_point(&site.point())
            || !presentation.cover_opacity.is_finite()
            || !(0.0..=1.0).contains(&presentation.cover_opacity)
        {
            return false;
        }
        let mut ids = BTreeSet::new();
        match self {
            Self::FlexibleBays { parts, .. } => {
                for part in parts {
                    if part.id.is_empty() || !ids.insert(part.id.as_str()) {
                        return false;
                    }
                }
            }
            Self::GroundedBoundary { parts, .. } => {
                for part in parts {
                    if part.id.is_empty() || !ids.insert(part.id.as_str()) {
                        return false;
                    }
                }
            }
        }
        for shape in shapes {
            let role_allowed = match self {
                Self::FlexibleBays { .. } => matches!(
                    shape.role,
                    AssemblyRole::Post | AssemblyRole::Cover | AssemblyRole::Binding
                ),
                Self::GroundedBoundary { .. } => {
                    !matches!(shape.role, AssemblyRole::Cover | AssemblyRole::Hearth)
                }
            };
            if !ids.contains(shape.id.as_str())
                || !role_allowed
                || !finite_point(&shape.min)
                || !finite_point(&shape.max)
                || shape.min.x > shape.max.x
                || shape.min.y > shape.max.y
                || shape.min.z > shape.max.z
            {
                return false;
            }
            if let Some(panel) = &shape.panel {
                if panel.corners.iter().any(|point| !finite_point(point))
                    || !panel.thickness.is_finite()
                    || panel.thickness <= 0.0
                {
                    return false;
                }
            }
        }
        true
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AnimationKind {
    Punch,
    Melee,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AnimationPhase {
    Windup,
    Recovery,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HorizontalDirection {
    pub x: f64,
    pub z: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ObservedActionAnimation {
    pub id: String,
    pub kind: AnimationKind,
    pub phase: AnimationPhase,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub tool: Option<String>,
    pub progress: f64,
    pub direction: HorizontalDirection,
}

impl ObservedActionAnimation {
    pub fn validate(&self) -> bool {
        self.progress.is_finite()
            && (0.0..=1.0).contains(&self.progress)
            && self.direction.x.is_finite()
            && self.direction.z.is_finite()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RemainsPhase {
    Fresh,
    Rotting,
    Removed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BodyPlan {
    Biped,
    Quadruped,
    Avian,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectedPose {
    Horizontal,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ParticleAnchor {
    Head,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ParticleMotion {
    #[serde(rename = "floatAway")]
    FloatAway,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Particle {
    pub text: String,
    pub anchor: ParticleAnchor,
    pub motion: ParticleMotion,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TimingClock {
    SimulationSeconds,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EffectTiming {
    pub expires_at: f64,
    pub duration_seconds: f64,
    pub clock: TimingClock,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StatusEffectProjection {
    pub id: String,
    pub label: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub explanation: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub icon: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub timing: Option<EffectTiming>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pose: Option<ProjectedPose>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub particle: Option<Particle>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpeechVolume {
    Whisper,
    Normal,
    Shout,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClaimPresence {
    Possible,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum IntervalKind {
    StatedInterval,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum IntervalPrecision {
    Approximate,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ClaimedInterval {
    pub kind: IntervalKind,
    pub from: f64,
    pub through: f64,
    pub precision: IntervalPrecision,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum ObservationClaim {
    Danger {
        #[serde(rename = "where")]
        location: crate::reception::ObservedLocation,
        when: ClaimedInterval,
        presence: ClaimPresence,
    },
}

impl ObservationClaim {
    pub fn validate(&self) -> bool {
        match self {
            Self::Danger { location, when, .. } => {
                location.validate().is_ok()
                    && when.from.is_finite()
                    && when.through.is_finite()
                    && when.through > when.from
            }
        }
    }
}

fn finite_point(point: &Point) -> bool {
    point.x.is_finite() && point.y.is_finite() && point.z.is_finite()
}
