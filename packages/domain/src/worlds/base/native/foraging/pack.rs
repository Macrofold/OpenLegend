//! Typed readers for the pack rules authored by the base-world ecology.
//! Movement and attack eligibility remain with the existing engine owners.

use crate::host::retained_size::heap_record;
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Hunt {
    pub prey_species: Vec<String>,
    pub biped_rule: Biped,
    pub approach: Approach,
    pub strike_id: String,
    pub locomotion_id: String,
    pub pursuit: Pursuit,
    pub lost_sight: LostSight,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Biped {
    pub night_only: bool,
    pub fullness_below: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub other_visible_packmates: u64,
    pub packmate_radius_metres: f64,
    pub other_biped_exclusion_metres: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Approach {
    pub radius_metres: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub bearings: u64,
    pub improve_separation_metres: f64,
    pub target_movement_metres: f64,
    pub review_game_seconds: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Pursuit {
    pub game_seconds: f64,
    pub route_metres: f64,
    pub reconsider_after_game_seconds: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LostSight {
    pub last_point_game_seconds: f64,
    pub total_search_game_seconds: f64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub candidate_count: u64,
    pub radius_metres: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Regroup {
    pub separation_above_metres: f64,
    pub stop_separation_metres: f64,
    pub leg_metres: f64,
    pub leg_game_seconds: f64,
    pub refresh_displacement_metres: f64,
    pub review_game_seconds: f64,
}

fn positive<const N: usize>(values: [f64; N]) -> bool {
    values
        .into_iter()
        .all(|value| value.is_finite() && value > 0.0)
}

impl Hunt {
    pub(super) fn valid(&self) -> bool {
        self.prey_species
            .iter()
            .all(|species| is_safe_record_id(species))
            && is_safe_record_id(&self.strike_id)
            && is_safe_record_id(&self.locomotion_id)
            && self.biped_rule.other_visible_packmates > 0
            && (1..=6).contains(&self.approach.bearings)
            && (1..=3).contains(&self.lost_sight.candidate_count)
            && positive([
                self.biped_rule.fullness_below,
                self.biped_rule.packmate_radius_metres,
                self.biped_rule.other_biped_exclusion_metres,
                self.approach.radius_metres,
                self.approach.improve_separation_metres,
                self.approach.target_movement_metres,
                self.approach.review_game_seconds,
                self.pursuit.game_seconds,
                self.pursuit.route_metres,
                self.pursuit.reconsider_after_game_seconds,
                self.lost_sight.last_point_game_seconds,
                self.lost_sight.total_search_game_seconds,
                self.lost_sight.radius_metres,
            ])
    }
}

impl Regroup {
    pub(super) fn valid(&self) -> bool {
        self.stop_separation_metres < self.separation_above_metres
            && positive([
                self.stop_separation_metres,
                self.separation_above_metres,
                self.leg_metres,
                self.leg_game_seconds,
                self.refresh_displacement_metres,
                self.review_game_seconds,
            ])
    }
}

heap_record!(Hunt {
    prey_species,
    strike_id,
    locomotion_id
});
