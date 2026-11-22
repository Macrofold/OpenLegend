//! Saved control for an ongoing follow. The path still belongs to the ordinary
//! movement owner. A remembered point is the follower's own observation.

use crate::host::retained_size::heap_record;
use crate::state::{Point, SurfacePoint};
use crate::values::deserialize_present_option;
use serde::{Deserialize, Serialize};

mod control;
pub(crate) use control::{FollowCursor, FollowDecision, FollowMode, FollowStep, FollowStop};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum FollowStance {
    Behind,
    Beside,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum FollowLoss {
    LastSeen,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum FollowRelation {
    Behind,
    Beside,
    Left,
    Right,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct FollowParameters {
    pub relation: Option<FollowRelation>,
    pub on_lost: Option<FollowLoss>,
    pub until: Option<f64>,
    pub complete: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct FollowSighting {
    pub point: SurfacePoint,
    pub at: f64,
}
heap_record!(FollowSighting { point });

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FollowState {
    pub distance: f64,
    pub next_repath_at: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub relation: Option<FollowStance>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub side: Option<i8>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub on_lost: Option<FollowLoss>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub until: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub complete: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub travel_heading: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub last_seen: Option<FollowSighting>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub episode: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub pursuing: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub last_observed_position: Option<Point>,
}
heap_record!(FollowState { last_seen, episode });

impl FollowParameters {
    pub(crate) fn distance(
        self,
        rules: &crate::worlds::base_decision_offers::DecisionOfferRules,
        requested: Option<f64>,
        now: f64,
        self_target: bool,
    ) -> Result<f64, &crate::worlds::InstalledActionMessage> {
        let distance = requested.unwrap_or(rules.follow.default_distance);
        if self_target
            || !distance.is_finite()
            || distance <= 0.0
            || (self.complete != Some(true) && distance < rules.follow.minimum_distance)
            || distance > rules.follow.maximum_distance
        {
            return Err(&rules.availability.invalid_follow);
        }
        if self
            .until
            .is_some_and(|until| !until.is_finite() || until <= now)
        {
            return Err(&rules.follow_outcomes.expired);
        }
        if self.complete == Some(true)
            && (self.until.is_none() || self.relation.is_some() || self.on_lost.is_some())
        {
            return Err(&rules.follow_outcomes.finite_required);
        }
        Ok(distance)
    }

    /// Call only with an actually seen target pose. The observer's chosen side
    /// stays fixed even when the target later turns and walks another way.
    pub(crate) fn start(
        self,
        distance: f64,
        source: Point,
        target: Point,
        heading: f64,
    ) -> FollowState {
        let (relation, side) = match self.relation {
            None => (None, None),
            Some(FollowRelation::Behind) => (Some(FollowStance::Behind), None),
            Some(relation) => {
                let side = match relation {
                    FollowRelation::Left => -1,
                    FollowRelation::Right => 1,
                    _ if (source.x - target.x) * -heading.cos()
                        + (source.z - target.z) * heading.sin()
                        < 0.0 =>
                    {
                        -1
                    }
                    _ => 1,
                };
                (Some(FollowStance::Beside), Some(side))
            }
        };
        FollowState {
            distance,
            next_repath_at: 0.0,
            relation,
            side,
            on_lost: self.on_lost,
            until: self.until,
            complete: self.complete,
            travel_heading: None,
            last_seen: None,
            episode: None,
            pursuing: None,
            last_observed_position: None,
        }
    }
}

impl FollowState {
    /// Update the saved observation only from a current completed sight check.
    /// A stationary target refreshes the time without inventing a direction.
    pub(crate) fn observe(&mut self, point: SurfacePoint, at: f64, heading_distance: f64) {
        if let Some(previous) = &mut self.last_seen {
            if crate::spatial::distance(previous.point.point(), point.point()) < heading_distance {
                previous.at = at;
                return;
            }
            self.travel_heading =
                Some((point.x - previous.point.x).atan2(point.z - previous.point.z));
        }
        self.last_seen = Some(FollowSighting { point, at });
    }
}

impl FollowState {
    /// A loaded action must already carry a valid continuation. Installation
    /// cannot recover a missing sighting or replace the original deadline.
    pub(crate) fn valid(
        &self,
        rules: &crate::worlds::base_decision_offers::FollowOfferRules,
        at: f64,
    ) -> bool {
        let finite_arrival = self.complete == Some(true);
        self.distance.is_finite()
            && self.distance > 0.0
            && (finite_arrival || self.distance >= rules.minimum_distance)
            && self.distance <= rules.maximum_distance
            && self.next_repath_at.is_finite()
            && self.next_repath_at >= 0.0
            // An original deadline can pass while an actor cannot act. Keep
            // it through cold reopen and let the next eligible turn end it.
            && self.until.is_none_or(f64::is_finite)
            && (!finite_arrival
                || (self.until.is_some() && self.relation.is_none() && self.on_lost.is_none()))
            && self.complete != Some(false)
            && self.pursuing != Some(false)
            && (self.pursuing.is_none() || (self.on_lost.is_some() && self.last_seen.is_some()))
            && match self.relation {
                Some(FollowStance::Beside) => matches!(self.side, Some(-1 | 1)),
                _ => self.side.is_none(),
            }
            && self.travel_heading.is_none_or(f64::is_finite)
            && self.last_seen.as_ref().is_none_or(|seen| {
                seen.at.is_finite()
                    && seen.at >= 0.0
                    && seen.at <= at
                    && valid_point(seen.point.point())
                    && crate::values::is_safe_record_id(&seen.point.surface_id)
            })
            && self.last_observed_position.is_none_or(valid_point)
            && self.episode.as_deref().is_none_or(crate::values::is_safe_record_id)
    }
}

fn valid_point(point: Point) -> bool {
    point.x.is_finite() && point.y.is_finite() && point.z.is_finite()
}
