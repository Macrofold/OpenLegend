//! Saved local-refuge continuation. Definitions are installed world data; these
//! records neither announce a response nor acquire evidence during restoration.

use crate::reception::{AcousticDirection, PerceivedSound};
use crate::state::{Point, SurfacePoint, UnconvertedField};
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_present_safe_integer,
    deserialize_safe_integer,
};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeLocomotion {
    pub profile: DefinitionPin,
    pub locomotion: String,
    pub mode: LocomotionMode,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub episode_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub generation: Option<u64>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LocomotionMode {
    Travel,
    Escape,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeResponseState {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub foraging: Option<UnconvertedField>,
    /// Key iteration follows actual acquisition order, not hash/worker order.
    pub acoustic_patterns: IndexMap<String, AcousticPattern>,
    pub profile: DefinitionPin,
    pub locomotion: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aerial_route_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub episode: Option<NativeResponseEpisode>,
    pub wander: WanderClock,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum WanderClock {
    Due {
        #[serde(rename = "dueAt")]
        due_at: f64,
    },
    Remaining {
        #[serde(rename = "remainingSeconds")]
        remaining_seconds: f64,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        running: Option<bool>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AcousticPattern {
    pub idle_expires_at: f64,
    pub cue: NativeAcousticCue,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeAcousticCue {
    pub event_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub sequence: u64,
    pub at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub physical_life: u64,
    pub sound: PerceivedSound,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeResponseEpisode {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub acoustic_cue: Option<NativeAcousticCue>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub acoustic_leg_required: Option<bool>,
    pub id: String,
    pub started_at: f64,
    pub latest_cause: ResponseCause,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub preparations: Option<IndexMap<String, String>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub preferred_refuge: Option<SurfacePoint>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aerial_route_id: Option<String>,
    pub profile_pin: DefinitionPin,
    pub locomotion: String,
    pub mode: ResponseMode,
    pub dangers: IndexMap<String, NativeDanger>,
    pub review_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub clear_since: Option<f64>,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub proposal_generation: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub proposal: Option<NativeRefugeProposal>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub refuge: Option<NativeRefuge>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub movement: Option<ResponseMovement>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub blocked: Option<BlockedResponse>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ResponseMode {
    Escaping,
    Settling,
    Blocked,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResponseCause {
    pub kind: CauseKind,
    pub id: String,
    pub at: f64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CauseKind {
    Event,
    Action,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResponseMovement {
    pub kind: MovementKind,
    pub id: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MovementKind {
    Action,
    Flight,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BlockedResponse {
    pub reason: String,
    pub basis: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeRefuge {
    /// Missing and explicitly null are different saved states here.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub acoustic_direction: Option<Option<AcousticDirection>>,
    pub point: SurfacePoint,
    pub selected_at: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub draw: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub flight_route_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DangerExtent {
    pub radius: f64,
    pub height: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "lowercase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum NativeDanger {
    Body {
        source_id: String,
        #[serde(deserialize_with = "deserialize_safe_integer")]
        physical_life: u64,
        point: Point,
        extent: DangerExtent,
        observed_at: f64,
        visible: bool,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        lost_at: Option<f64>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        inside_avoidance: Option<bool>,
    },
    Region {
        source: RegionSource,
        point: Point,
        observed_at: f64,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        incoming: Option<Point>,
        #[serde(
            default,
            deserialize_with = "deserialize_present_option",
            skip_serializing_if = "Option::is_none"
        )]
        inside_avoidance: Option<bool>,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RegionSource {
    pub kind: RegionKind,
    pub id: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RegionKind {
    Event,
    Projectile,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeRefugeProposal {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub generation: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub geometry_revision: u64,
    pub at: f64,
    pub origin: SurfacePoint,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub movement_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub wait: Option<NavigationWait>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub search: Option<RefugeSearch>,
    pub body: NavigationBody,
    pub candidates: Vec<RefugeCandidate>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NavigationWait {
    World,
    Entity,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NavigationBody {
    pub radius: f64,
    pub height: f64,
    pub max_slope: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RefugeCandidate {
    pub id: String,
    pub point: SurfacePoint,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub retained: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub preferred: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RefugeSearch {
    pub distance: f64,
    pub bearing: f64,
    pub side: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub attempted: u64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub best: Option<RefugeRoute>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RefugeRoute {
    pub point: SurfacePoint,
    pub path: Vec<SurfacePoint>,
    pub length: f64,
    pub progress: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeResponseProfile {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    pub implementation: ResponseImplementation,
    pub dangers: DangerPolicy,
    pub retention_seconds: f64,
    pub uncertainty_per_second: f64,
    pub maximum_uncertainty: f64,
    pub avoidance_distance: f64,
    pub clearance_margin: f64,
    pub settling_seconds: f64,
    pub review_seconds: f64,
    pub blocked_review_seconds: f64,
    pub passage_distance: f64,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub sound_alarm_minimum_band: Option<f64>,
    pub acoustic_change_band_db: f64,
    pub acoustic_pattern_idle_seconds: f64,
    pub candidates: RefugePolicy,
    pub locomotion: IndexMap<String, LocomotionRates>,
    pub movement_factors: MovementFactors,
    pub wander: WanderPolicy,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub wake: Option<WakePolicy>,
    pub presentation: ResponsePresentation,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum ResponseImplementation {
    #[serde(rename = "local-refuge")]
    LocalRefuge,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DangerPolicy {
    pub species: Vec<String>,
    pub body_plans: Vec<String>,
    pub current_natural_attack: bool,
    pub attack_preparation: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RefugePolicy {
    pub distance: CandidateDistance,
    pub angles: Vec<f64>,
    pub preferred_progress: f64,
    pub minimum_progress: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub minimum_attempts: u64,
    pub maximum_detour_factor: f64,
    pub navigation_wait: NavigationWait,
    pub maximum_route_length: f64,
    pub minimum_advance: f64,
    pub worsening_slack: f64,
    pub arrival_margin_cap: f64,
    pub continuity_improvement: f64,
    pub tie_margin: f64,
    pub distance_weight_scale: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CandidateDistance {
    pub minimum: f64,
    pub maximum: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocomotionRates {
    pub travel: f64,
    pub escape: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub flight_escape: Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct MovementFactors {
    pub scars: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WanderPolicy {
    pub distance: f64,
    pub minimum_wait_seconds: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub wait_choices: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WakePolicy {
    pub attribute_id: String,
    pub above: f64,
    pub reason: WakeReason,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum WakeReason {
    #[serde(rename = "perceived-danger")]
    PerceivedDanger,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResponsePresentation {
    pub alarmed: String,
    pub escaping: String,
    pub settling: String,
    pub blocked: String,
    pub routine: String,
}

impl NativeDanger {
    pub fn point(&self) -> Point {
        match self {
            Self::Body { point, .. } | Self::Region { point, .. } => *point,
        }
    }

    pub fn observed_at(&self) -> f64 {
        match self {
            Self::Body { observed_at, .. } | Self::Region { observed_at, .. } => *observed_at,
        }
    }

    fn uncertainty_from(&self) -> f64 {
        match self {
            Self::Body {
                lost_at,
                observed_at,
                ..
            } => lost_at.unwrap_or(*observed_at),
            Self::Region { observed_at, .. } => *observed_at,
        }
    }

    pub fn uncertainty(&self, profile: &NativeResponseProfile, at: f64) -> f64 {
        if matches!(self, Self::Body { visible: true, .. }) {
            return 0.0;
        }
        ((at - self.uncertainty_from()).max(0.0) * profile.uncertainty_per_second)
            .min(profile.maximum_uncertainty)
    }

    pub fn expires_at(&self, profile: &NativeResponseProfile) -> f64 {
        if matches!(self, Self::Body { visible: true, .. }) {
            f64::INFINITY
        } else {
            self.uncertainty_from() + profile.retention_seconds
        }
    }
}

pub fn body_danger_key(id: &str, physical_life: u64) -> Result<String, serde_json::Error> {
    crate::encoding::json_record(&("body", id, physical_life))
}

pub fn region_danger_key(source: &RegionSource) -> Result<String, serde_json::Error> {
    crate::encoding::json_record(&("region", source.kind, &source.id))
}

pub fn profile_key(profile: &DefinitionPin) -> Result<String, serde_json::Error> {
    crate::encoding::json_record(&(&profile.id, profile.version, &profile.digest))
}

pub fn acoustic_pattern_key(
    cue: &NativeAcousticCue,
    profile: &NativeResponseProfile,
) -> Result<String, serde_json::Error> {
    let source = cue
        .sound
        .visible_source
        .as_ref()
        .map(|source| (&source.entity_id, source.physical_life, &source.episode_id));
    let band = ((cue.sound.clarity_margin_db - cue.sound.detect_threshold_db)
        / profile.acoustic_change_band_db)
        .floor();
    crate::encoding::json_record(&(source, &cue.sound.direction, band))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ResponseValidationError {
    Profile,
    Continuation,
    UnconvertedFamily,
}

impl NativeResponseProfile {
    /// The selected body family supplies its own supported plan meanings. A
    /// local-refuge mechanism does not make wilderness body names universal.
    pub fn validate(
        &self,
        supported_body_plan: impl Fn(&str) -> bool,
        maximum_candidates: usize,
    ) -> Result<(), ResponseValidationError> {
        use crate::identity::MAX_SAFE_INTEGER;
        use crate::values::is_safe_record_id;
        let positive = |value: f64| value.is_finite() && value > 0.0;
        let nonnegative = |value: f64| value.is_finite() && value >= 0.0;
        let valid = is_safe_record_id(&self.id)
            && self.version >= 1
            && self.version <= MAX_SAFE_INTEGER
            && self.dangers.species.iter().all(|id| is_safe_record_id(id))
            && self
                .dangers
                .body_plans
                .iter()
                .all(|plan| supported_body_plan(plan))
            && [
                self.retention_seconds,
                self.avoidance_distance,
                self.settling_seconds,
                self.review_seconds,
                self.blocked_review_seconds,
                self.acoustic_change_band_db,
                self.acoustic_pattern_idle_seconds,
            ]
            .into_iter()
            .all(positive)
            && [
                self.uncertainty_per_second,
                self.maximum_uncertainty,
                self.clearance_margin,
                self.passage_distance,
            ]
            .into_iter()
            .all(nonnegative)
            && self.sound_alarm_minimum_band.is_none_or(|band| {
                nonnegative(band) && band <= MAX_SAFE_INTEGER as f64 && band.fract() == 0.0
            });
        let candidates = &self.candidates;
        let valid = valid
            && positive(candidates.distance.minimum)
            && positive(candidates.distance.maximum)
            && candidates.distance.maximum >= candidates.distance.minimum
            && !candidates.angles.is_empty()
            && candidates.angles.len() <= maximum_candidates
            && candidates.angles.iter().all(|angle| angle.is_finite())
            && candidates.minimum_attempts >= 1
            && candidates.minimum_attempts <= candidates.angles.len() as u64
            && positive(candidates.minimum_progress)
            && candidates.minimum_progress <= 1.0
            && positive(candidates.preferred_progress)
            && candidates.preferred_progress <= 1.0
            && candidates.preferred_progress >= candidates.minimum_progress
            && [
                candidates.maximum_detour_factor,
                candidates.maximum_route_length,
                candidates.minimum_advance,
                candidates.distance_weight_scale,
            ]
            .into_iter()
            .all(positive)
            && [
                candidates.worsening_slack,
                candidates.arrival_margin_cap,
                candidates.continuity_improvement,
                candidates.tie_margin,
            ]
            .into_iter()
            .all(nonnegative)
            && !self.locomotion.is_empty()
            && self.locomotion.iter().all(|(id, rates)| {
                is_safe_record_id(id)
                    && positive(rates.travel)
                    && positive(rates.escape)
                    && rates.flight_escape.is_none_or(positive)
            })
            && positive(self.wander.distance)
            && nonnegative(self.wander.minimum_wait_seconds)
            && self.wander.wait_choices >= 1
            && self.wander.wait_choices <= MAX_SAFE_INTEGER
            && self
                .wake
                .as_ref()
                .is_none_or(|wake| is_safe_record_id(&wake.attribute_id) && wake.above.is_finite())
            && [
                &self.presentation.alarmed,
                &self.presentation.escaping,
                &self.presentation.settling,
                &self.presentation.blocked,
                &self.presentation.routine,
            ]
            .into_iter()
            .all(|text| !crate::encoding::js_trim(text).is_empty());
        if valid {
            Ok(())
        } else {
            Err(ResponseValidationError::Profile)
        }
    }
}
