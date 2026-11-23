//! Finite input assessment and saved meaning for one admitted weapon attempt.
//! Host leases authorize a release. These values grant no control or contact.
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::text::JsText;
use crate::values::{DefinitionPin, deserialize_present_option};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum TimedReleaseInput {
    Ordinary,
    TimedRelease { phase: f64 },
}

impl TimedReleaseInput {
    pub fn valid(self) -> bool {
        match self {
            Self::Ordinary => true,
            Self::TimedRelease { phase } => phase.is_finite() && (0.0..1.0).contains(&phase),
        }
    }
}

/// Already authorized control for one exact signed attack. The runtime clock
/// separately carries the host's live pending-release window.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PlayerAttackInput {
    Begin,
    Release {
        input: TimedReleaseInput,
        may_wait: bool,
    },
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum TimingKind {
    TimedRelease,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TimingLabels {
    instruction: JsText,
    poor: JsText,
    ordinary: JsText,
    excellent: JsText,
}

impl TimingLabels {
    fn valid(&self) -> bool {
        [
            &self.instruction,
            &self.poor,
            &self.ordinary,
            &self.excellent,
        ]
        .into_iter()
        .all(|text| !text.trim_is_empty() && text.units_len() <= 1000)
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TimedReleaseProfile {
    kind: TimingKind,
    period_seconds: f64,
    center: f64,
    green_width: f64,
    ordinary_width: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    labels: Option<TimingLabels>,
}

impl TimedReleaseProfile {
    /// Bytes an independently published copy retains, excluding its inline header.
    pub fn retained_bytes(&self) -> Option<usize> {
        self.heap_bytes()
    }

    fn landmarks(&self) -> ([f64; 5], [f64; 5]) {
        let radius = [
            self.center - self.ordinary_width,
            self.center - self.green_width,
            self.center,
            self.center + self.green_width,
            self.center + self.ordinary_width,
        ];
        (radius.map(|r| r / 2.0), radius.map(|r| 1.0 - r / 2.0))
    }

    fn valid(&self) -> bool {
        let complement = 1.0 - self.center;
        if !self.period_seconds.is_finite()
            || self.period_seconds <= 0.0
            || !self.center.is_finite()
            || self.center <= 0.0
            || self.center >= 1.0
            || !self.green_width.is_finite()
            || self.green_width <= 0.0
            || !self.ordinary_width.is_finite()
            || self.ordinary_width <= self.green_width
            || self.ordinary_width > self.center.min(complement)
            || self.ordinary_width >= self.center.max(complement)
            || self.labels.as_ref().is_some_and(|labels| !labels.valid())
        {
            return false;
        }
        let (ascending, descending) = self.landmarks();
        ascending[0] >= 0.0
            && ascending[4] <= 0.5
            && descending[4] >= 0.5
            && descending[0] <= 1.0
            && ascending.windows(2).all(|pair| pair[0] < pair[1])
            && descending.windows(2).all(|pair| pair[0] > pair[1])
    }

    /// Evaluate one bounded phase under already-installed meaning. Exact
    /// landmarks preserve the authored bands without a width tolerance.
    fn assess(&self, input: TimedReleaseInput) -> Option<ExecutionAssessment> {
        if !input.valid() {
            return None;
        }
        let TimedReleaseInput::TimedRelease { phase } = input else {
            return Some(ExecutionAssessment::new(0.0, ExecutionMode::Ordinary));
        };
        let (ascending, descending) = self.landmarks();
        let mut deviation = (1.0 - (2.0 * phase - 1.0).abs() - self.center).abs();
        for half in [ascending, descending] {
            deviation = if phase == half[2] {
                0.0
            } else if phase == half[1] || phase == half[3] {
                self.green_width
            } else if phase == half[0] || phase == half[4] {
                self.ordinary_width
            } else {
                deviation
            };
        }
        let tail = self.center.max(1.0 - self.center) - self.ordinary_width;
        let score = if deviation <= self.green_width {
            1.0 - deviation / self.green_width
        } else if deviation <= self.ordinary_width {
            0.0
        } else {
            -((deviation - self.ordinary_width) / tail).min(1.0)
        };
        let score = [-1.0, 0.0, 1.0]
            .into_iter()
            .find(|anchor| (score - *anchor).abs() <= 16.0 * f64::EPSILON)
            .unwrap_or_else(|| score.clamp(-1.0, 1.0));
        Some(ExecutionAssessment::new(score, ExecutionMode::Manual))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum ExecutionMode {
    Ordinary,
    Manual,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum Quality {
    Poor,
    Ordinary,
    Excellent,
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ExecutionAssessment {
    score: f64,
    quality: Quality,
    mode: ExecutionMode,
}

impl ExecutionAssessment {
    fn new(score: f64, mode: ExecutionMode) -> Self {
        let quality = if score < 0.0 {
            Quality::Poor
        } else if score > 0.0 {
            Quality::Excellent
        } else {
            Quality::Ordinary
        };
        Self {
            score,
            quality,
            mode,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct Contribution {
    positive: f64,
    negative: f64,
}

impl Contribution {
    fn valid(self) -> bool {
        [self.positive, self.negative]
            .into_iter()
            .all(|coefficient| (0.0..=1.0).contains(&coefficient))
    }

    fn factor(self, score: f64) -> f64 {
        1.0 + self.positive * score.max(0.0) + self.negative * score.min(0.0)
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AttackExecutionProfile {
    pub(crate) profile: TimedReleaseProfile,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    contact: Option<Contribution>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    injury: Option<Contribution>,
}

fn valid_meaning(
    profile: &TimedReleaseProfile,
    contact: Option<Contribution>,
    injury: Option<Contribution>,
) -> bool {
    profile.valid()
        && contact.is_none_or(Contribution::valid)
        && injury.is_none_or(Contribution::valid)
}

impl AttackExecutionProfile {
    pub(crate) fn valid(&self) -> bool {
        valid_meaning(&self.profile, self.contact, self.injury)
    }
    pub(crate) fn maximum_injury_factor(&self) -> f64 {
        self.injury.map_or(1.0, |channel| channel.factor(1.0))
    }
}

/// A released attack remembers exactly what was admitted, even after its
/// actor, tool or browser is gone. Timing does not choose a ray or collision.
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AttackExecutionEvidence {
    tool: DefinitionPin,
    profile: TimedReleaseProfile,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    contact: Option<Contribution>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    injury: Option<Contribution>,
    committed_at: f64,
    input: TimedReleaseInput,
    assessment: ExecutionAssessment,
}

impl AttackExecutionEvidence {
    pub(crate) fn tool(&self) -> &DefinitionPin {
        &self.tool
    }
    pub(crate) fn committed_at(&self) -> f64 {
        self.committed_at
    }

    pub(crate) fn valid(&self) -> bool {
        self.tool.is_valid()
            && self.committed_at.is_finite()
            && self.committed_at >= 0.0
            && valid_meaning(&self.profile, self.contact, self.injury)
            && self.profile.assess(self.input) == Some(self.assessment)
    }

    pub(crate) fn contact_factor(&self) -> f64 {
        self.contact
            .map_or(1.0, |channel| channel.factor(self.assessment.score))
    }

    pub(crate) fn injury_factor(&self) -> f64 {
        self.injury
            .map_or(1.0, |channel| channel.factor(self.assessment.score))
    }

    pub(crate) fn timed(&self) -> bool {
        matches!(self.input, TimedReleaseInput::TimedRelease { .. })
    }
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttackExecutionView<'a> {
    pub profile: &'a TimedReleaseProfile,
    pub ready: bool,
    pub release_requested: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assessment: Option<ExecutionAssessment>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AttackExecutionState {
    profile: TimedReleaseProfile,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    contact: Option<Contribution>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    injury: Option<Contribution>,
    tool: DefinitionPin,
    pub(crate) ready: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) input: Option<TimedReleaseInput>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) pending_release: Option<Box<PendingRelease>>,
}

impl AttackExecutionState {
    /// Admit an independent copy of the display profile and exact tool pin
    /// before it is installed in a preparation.
    pub(crate) fn prepare(
        profile: &AttackExecutionProfile,
        tool: &DefinitionPin,
        budget: &ByteBudget,
    ) -> Result<(Box<Self>, ByteReservation), ExecutionError> {
        let storage = budget.reserve(
            profile
                .heap_bytes()
                .and_then(|bytes| bytes.checked_add(tool.heap_bytes()?))
                .and_then(|bytes| bytes.checked_add(std::mem::size_of::<Self>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok((
            Box::new(Self {
                profile: profile.profile.clone(),
                contact: profile.contact,
                injury: profile.injury,
                tool: tool.clone(),
                ready: false,
                input: None,
                pending_release: None,
            }),
            storage,
        ))
    }

    pub(crate) fn player_view(&self) -> AttackExecutionView<'_> {
        AttackExecutionView {
            profile: &self.profile,
            ready: self.ready,
            release_requested: self.pending_release.is_some(),
            assessment: self.input.and_then(|input| self.profile.assess(input)),
        }
    }

    pub(crate) fn matches(&self, installed: &AttackExecutionProfile, tool: &DefinitionPin) -> bool {
        self.tool == *tool
            && self.profile == installed.profile
            && self.contact == installed.contact
            && self.injury == installed.injury
    }

    pub(crate) fn assess(
        &self,
        input: TimedReleaseInput,
    ) -> Result<AssessedRelease, ExecutionError> {
        let assessment = self.profile.assess(input).ok_or(ExecutionError::Invariant)?;
        let injury_factor = self.injury.map_or(1.0, |channel| channel.factor(assessment.score));
        Ok(AssessedRelease { input, assessment, injury_factor })
    }

    /// Fund independent historical or flight custody before cloning the
    /// installed meaning. The caller owns this reservation through handoff.
    pub(crate) fn commit(
        &self,
        release: AssessedRelease,
        at: f64,
        budget: &ByteBudget,
    ) -> Result<(AttackExecutionEvidence, ByteReservation), ExecutionError> {
        let storage = budget.reserve(
            heap_sum([
                self.profile.heap_bytes().ok_or(ExecutionError::Capacity)?,
                self.tool.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok((
            AttackExecutionEvidence {
                tool: self.tool.clone(),
                profile: self.profile.clone(),
                contact: self.contact,
                injury: self.injury,
                committed_at: at,
                input: release.input,
                assessment: release.assessment,
            },
            storage,
        ))
    }
}

/// Reuse the admitted sample for the release review and commitment.
pub(crate) struct AssessedRelease {
    input: TimedReleaseInput,
    assessment: ExecutionAssessment,
    pub(crate) injury_factor: f64,
}

/// Exact saved intention. A host must still admit this action's finite
/// release window before it can be consumed automatically.
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PendingRelease {
    pub input: TimedReleaseInput,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aim_target: Option<crate::projectile::AimedLife>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aim_point: Option<crate::state::Point>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub aim_point_subject: Option<crate::projectile::AimedLife>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub lethal_permission: Option<crate::contact::StrikePermission>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub requires_lethal_review: Option<bool>,
}

heap_record!(TimingLabels {
    instruction,
    poor,
    ordinary,
    excellent
});
heap_record!(TimedReleaseProfile { labels });
heap_record!(AttackExecutionProfile { profile });
heap_record!(AttackExecutionEvidence { tool, profile });
heap_record!(AttackExecutionState {
    tool,
    profile,
    pending_release
});
heap_record!(PendingRelease {
    aim_target,
    aim_point_subject,
    lethal_permission
});

impl PendingRelease {
    /// Retain the exact one button-up choice. Only the clock's independently
    /// authorized live input can turn this saved intention into a release.
    pub(crate) fn prepare(
        input: TimedReleaseInput,
        target: Option<crate::projectile::RuntimeRangedTarget<'_>>,
        permission: Option<&crate::contact::StrikePermission>,
        budget: &ByteBudget,
    ) -> Result<(Box<Self>, ByteReservation), ExecutionError> {
        use crate::projectile::{AimedLife, RuntimeRangedTarget};
        if !input.valid() {
            return Err(ExecutionError::Invariant);
        }
        let storage = budget.reserve(
            heap_sum([
                std::mem::size_of::<Self>(),
                target.map_or(0, RuntimeRangedTarget::selected_text_bytes),
                permission
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let owned = |(id, life): (&str, u64)| AimedLife {
            id: id.to_owned(),
            life,
        };
        let (aim_target, aim_point, aim_point_subject) = match target {
            Some(RuntimeRangedTarget::Subject { id, life }) => {
                (Some(owned((id, life))), None, None)
            }
            Some(RuntimeRangedTarget::Point { point, subject }) => {
                (None, Some(point), subject.map(owned))
            }
            None => (None, None, None),
        };
        Ok((
            Box::new(Self {
                input,
                aim_target,
                aim_point,
                aim_point_subject,
                lethal_permission: permission.cloned(),
                requires_lethal_review: Some(true),
            }),
            storage,
        ))
    }

    pub(crate) fn selection(&self) -> Option<crate::projectile::RuntimeRangedTarget<'_>> {
        use crate::projectile::RuntimeRangedTarget;
        match (&self.aim_target, self.aim_point) {
            (Some(body), None) if self.aim_point_subject.is_none() => {
                Some(RuntimeRangedTarget::Subject {
                    id: &body.id,
                    life: body.life,
                })
            }
            (None, Some(point)) => Some(RuntimeRangedTarget::Point {
                point,
                subject: self
                    .aim_point_subject
                    .as_ref()
                    .map(|body| (body.id.as_str(), body.life)),
            }),
            _ => None,
        }
    }

    fn valid(&self, actor: &crate::state::Entity, ranged: bool) -> bool {
        use crate::projectile::RuntimeRangedTarget;
        let identity = |id: &str, life: u64| {
            id != actor.id
                && crate::values::is_safe_record_id(id)
                && life <= crate::identity::MAX_SAFE_INTEGER
        };
        self.input.valid()
            && self.lethal_permission.as_ref().is_none_or(|permission| {
                self.requires_lethal_review == Some(true) && permission.valid_for_source(actor)
            })
            && if ranged {
                match self.selection() {
                    Some(RuntimeRangedTarget::Subject { id, life }) => identity(id, life),
                    Some(RuntimeRangedTarget::Point { point, subject }) => {
                        [point.x, point.y, point.z].into_iter().all(f64::is_finite)
                            && subject.is_none_or(|(id, life)| identity(id, life))
                    }
                    None => false,
                }
            } else {
                self.aim_target.is_none()
                    && self.aim_point.is_none()
                    && self.aim_point_subject.is_none()
            }
    }
}

pub(crate) fn valid_saved(
    state: &crate::simulation::PhysicalState,
    installed: &crate::simulation::InstalledWorld,
    actor: &crate::state::Entity,
    action: &crate::state::Action,
) -> bool {
    use crate::contact::StrikePhase;
    let Some(execution) = action.attack_execution.as_deref() else {
        return true;
    };
    let item = action.weapon_item_id.as_deref().and_then(|id| {
        crate::install::owned_by(state, &installed.retained, &actor.id, id)
            .ok()
            .flatten()
            .filter(|tool| tool.equipped)
    });
    let tool = item.and_then(|item| installed.retained.items.get(item.definition_id));
    if !tool.is_some_and(|tool| {
        tool.execution
            .as_ref()
            .is_some_and(|profile| execution.matches(profile, &tool.pin))
    }) || !actor
        .actor
        .as_ref()
        .is_some_and(|source| source.controller == "player")
        || action.stage != "working"
        || !action.path.is_empty()
        || action.navigation.is_some()
    {
        return false;
    }
    let aim = action
        .ranged
        .as_ref()
        .filter(|aim| action.kind == "aim" && aim.manual);
    if let Some(aim) = aim {
        aim.ready == execution.ready
            && execution.input.is_none()
            && execution
                .pending_release
                .as_ref()
                .is_none_or(|release| release.valid(actor, true))
    } else if action.is_natural_contact() {
        match action.strike_phase {
            Some(StrikePhase::Windup) => {
                execution.input.is_none()
                    && execution.ready == (action.remaining_seconds == 0.0)
                    && action.strike_motion.is_none()
                    && execution
                        .pending_release
                        .as_ref()
                        .is_none_or(|release| release.valid(actor, false))
            }
            Some(StrikePhase::Recovery) => {
                !execution.ready
                    && execution.pending_release.is_none()
                    && execution.input.is_some_and(TimedReleaseInput::valid)
            }
            None => false,
        }
    } else {
        false
    }
}
