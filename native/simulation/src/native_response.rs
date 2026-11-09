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

mod validation;
pub(crate) use validation::validate_native_response;

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

#[derive(Debug, PartialEq, Serialize, Deserialize)]
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

impl NativeResponseEpisode {
    /// The current schema stores dangers and preparations as child rows. A
    /// child estimate changes no episode-header value; optional child presence
    /// still changes its marker. Destructuring makes new fields an explicit
    /// storage decision. See docs/performance/storage.md.
    fn saved_header(&self) -> impl PartialEq + '_ {
        let Self {
            acoustic_cue,
            acoustic_leg_required,
            id,
            started_at,
            latest_cause,
            preparations,
            preferred_refuge,
            aerial_route_id,
            profile_pin,
            locomotion,
            mode,
            dangers: _,
            review_at,
            clear_since,
            proposal_generation,
            proposal,
            refuge,
            movement,
            blocked,
        } = self;
        (
            (
                acoustic_cue,
                acoustic_leg_required,
                id,
                started_at,
                latest_cause,
                preparations.is_some(),
                preferred_refuge,
                aerial_route_id,
                profile_pin,
                locomotion,
            ),
            (
                mode,
                review_at,
                clear_since,
                proposal_generation,
                proposal,
                refuge,
                movement,
                blocked,
            ),
        )
    }
    pub(crate) fn same_saved_header(&self, other: &Self) -> bool {
        self.saved_header() == other.saved_header()
    }
}

// A retained undo record clones only this bounded response subtree. Rebuild its
// maps at current length so obsolete raw-table capacity cannot hide behind an
// encoded-size estimate or multiply across nested checkpoints.
fn clone_map<V: Clone>(values: &IndexMap<String, V>) -> IndexMap<String, V> {
    let mut copy = IndexMap::with_capacity(values.len());
    for (key, value) in values {
        copy.insert(key.clone(), value.clone());
    }
    copy
}

impl Clone for NativeResponseEpisode {
    fn clone(&self) -> Self {
        Self {
            acoustic_cue: self.acoustic_cue.clone(),
            acoustic_leg_required: self.acoustic_leg_required,
            id: self.id.clone(),
            started_at: self.started_at,
            latest_cause: self.latest_cause.clone(),
            preparations: self.preparations.as_ref().map(clone_map),
            preferred_refuge: self.preferred_refuge.clone(),
            aerial_route_id: self.aerial_route_id.clone(),
            profile_pin: self.profile_pin.clone(),
            locomotion: self.locomotion.clone(),
            mode: self.mode,
            dangers: clone_map(&self.dangers),
            review_at: self.review_at,
            clear_since: self.clear_since,
            proposal_generation: self.proposal_generation,
            proposal: self.proposal.clone(),
            refuge: self.refuge.clone(),
            movement: self.movement.clone(),
            blocked: self.blocked.clone(),
        }
    }
}

fn string_clone_bytes(value: &String) -> usize {
    value.capacity().saturating_add(64)
}
fn optional_string_bytes(value: &Option<String>) -> usize {
    value.as_ref().map_or(0, string_clone_bytes)
}
fn surface_clone_bytes(point: &SurfacePoint) -> usize {
    string_clone_bytes(&point.surface_id)
}
fn vector_clone_bytes<T>(values: &Vec<T>) -> usize {
    if values.is_empty() {
        0
    } else {
        values
            .capacity()
            .saturating_mul(std::mem::size_of::<T>())
            .saturating_add(64)
    }
}
fn map_clone_bytes<V>(values: &IndexMap<String, V>) -> usize {
    if values.is_empty() {
        return 0;
    }
    let buckets = values
        .len()
        .checked_mul(2)
        .and_then(usize::checked_next_power_of_two)
        .unwrap_or(usize::MAX)
        .max(4);
    values
        .len()
        .saturating_mul(std::mem::size_of::<(usize, String, V)>().saturating_add(16))
        .saturating_add(buckets.saturating_mul(std::mem::size_of::<usize>() + 1))
        .saturating_add(192)
}

fn sound_clone_bytes(sound: &PerceivedSound) -> usize {
    sound.visible_source.as_ref().map_or(0, |source| {
        string_clone_bytes(&source.entity_id)
            .saturating_add(optional_string_bytes(&source.episode_id))
            .saturating_add(source.description.name.storage_bytes().saturating_add(64))
            .saturating_add(optional_string_bytes(&source.description.name_form))
            .saturating_add(optional_string_bytes(
                &source.description.indefinite_article,
            ))
    })
}

fn cue_clone_bytes(cue: &NativeAcousticCue) -> usize {
    string_clone_bytes(&cue.event_id).saturating_add(sound_clone_bytes(&cue.sound))
}

pub(crate) fn new_cue_clone_bytes(event_id: &String, sound: &PerceivedSound) -> usize {
    std::mem::size_of::<NativeAcousticCue>()
        .saturating_add(string_clone_bytes(event_id))
        .saturating_add(sound_clone_bytes(sound))
}

pub(crate) fn acoustic_pattern_clone_bytes(value: Option<&AcousticPattern>) -> usize {
    value.map_or(0, |pattern| {
        std::mem::size_of::<AcousticPattern>().saturating_add(cue_clone_bytes(&pattern.cue))
    })
}

/// Conservative typed clone reservation, including container storage and a
/// fixed allocation/alignment allowance per allocation. Runtime RSS still owns
/// allocator/OS cost evidence; JSON encoding is not a resident-byte measure.
pub(crate) fn episode_clone_bytes(value: &Option<NativeResponseEpisode>) -> usize {
    let Some(value) = value else {
        return std::mem::size_of::<Option<NativeResponseEpisode>>();
    };
    let mut bytes = std::mem::size_of::<NativeResponseEpisode>()
        .saturating_add(string_clone_bytes(&value.id))
        .saturating_add(string_clone_bytes(&value.latest_cause.id))
        .saturating_add(string_clone_bytes(&value.profile_pin.id))
        .saturating_add(string_clone_bytes(&value.profile_pin.digest))
        .saturating_add(string_clone_bytes(&value.locomotion))
        .saturating_add(optional_string_bytes(&value.aerial_route_id))
        .saturating_add(value.acoustic_cue.as_ref().map_or(0, cue_clone_bytes))
        .saturating_add(
            value
                .preferred_refuge
                .as_ref()
                .map_or(0, surface_clone_bytes),
        )
        .saturating_add(map_clone_bytes(&value.dangers));
    if let Some(preparations) = &value.preparations {
        bytes = bytes.saturating_add(map_clone_bytes(preparations));
        for (key, value) in preparations {
            bytes = bytes
                .saturating_add(string_clone_bytes(key))
                .saturating_add(string_clone_bytes(value));
        }
    }
    for (key, danger) in &value.dangers {
        bytes = bytes
            .saturating_add(string_clone_bytes(key))
            .saturating_add(match danger {
                NativeDanger::Body { source_id, .. } => string_clone_bytes(source_id),
                NativeDanger::Region { source, .. } => string_clone_bytes(&source.id),
            });
    }
    if let Some(proposal) = &value.proposal {
        bytes = bytes
            .saturating_add(surface_clone_bytes(&proposal.origin))
            .saturating_add(optional_string_bytes(&proposal.movement_id))
            .saturating_add(vector_clone_bytes(&proposal.candidates));
        for candidate in &proposal.candidates {
            bytes = bytes
                .saturating_add(string_clone_bytes(&candidate.id))
                .saturating_add(surface_clone_bytes(&candidate.point));
        }
        if let Some(best) = proposal
            .search
            .as_ref()
            .and_then(|search| search.best.as_ref())
        {
            bytes = bytes
                .saturating_add(surface_clone_bytes(&best.point))
                .saturating_add(vector_clone_bytes(&best.path));
            for point in &best.path {
                bytes = bytes.saturating_add(surface_clone_bytes(point));
            }
        }
    }
    if let Some(refuge) = &value.refuge {
        bytes = bytes
            .saturating_add(surface_clone_bytes(&refuge.point))
            .saturating_add(optional_string_bytes(&refuge.flight_route_id));
    }
    if let Some(movement) = &value.movement {
        bytes = bytes.saturating_add(string_clone_bytes(&movement.id));
    }
    if let Some(blocked) = &value.blocked {
        bytes = bytes
            .saturating_add(string_clone_bytes(&blocked.reason))
            .saturating_add(string_clone_bytes(&blocked.basis));
    }
    bytes
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
    pub projectile_passage: String,
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

    pub(crate) fn uncertainty_from(&self) -> f64 {
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
pub(crate) fn profile_key_len(profile: &DefinitionPin) -> Result<usize, serde_json::Error> {
    crate::encoding::json_record_len(&(&profile.id, profile.version, &profile.digest))
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
            && !crate::encoding::js_trim(&self.presentation.projectile_passage).is_empty();
        if valid {
            Ok(())
        } else {
            Err(ResponseValidationError::Profile)
        }
    }
}

#[path = "native_response/policy_residency.rs"]
mod policy_residency;
