//! The current replacement-body definition and pending outcome. No fallback
//! revival law or scar tuning is embedded in these engine records.

use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::state::Point;
use crate::text::JsText;
use crate::values::{deserialize_nullable, deserialize_safe_integer};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DeathScar {
    pub id: String,
    pub name: String,
    pub description: String,
    pub movement_factor: f64,
    pub outgoing_injury_factor: f64,
    pub incoming_injury_factor: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReincarnationPolicy {
    pub implementation: String,
    pub qualifying_controller: String,
    pub corpse_kind: String,
    pub rest_kind: String,
    pub radius: f64,
    pub retained_type_fraction: f64,
    pub spawn_offset: f64,
    pub placement: ReplacementPlacement,
    pub fill_attributes: Vec<String>,
    pub scars: Vec<DeathScar>,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub treatment: Option<ScarTreatment>,
    pub arrival_text: String,
    pub arrival_narration: String,
    pub continue_label: String,
    pub continue_unavailable_text: String,
    pub no_usable_rest_text: String,
    pub death_text: String,
    pub retained_label: String,
    pub lost_label: String,
    pub treatment_label: String,
    pub treatment_text: String,
    pub treatment_start_clause: String,
    pub treatment_interrupted_text: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReplacementPlacement {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub samples: u64,
    pub neighbor_margin: f64,
    pub occupant_clearance: f64,
    pub threat_reach_margin: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ScarTreatment {
    pub material_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
    pub work_seconds: f64,
    pub reach: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PendingDeath {
    pub at: f64,
    pub position: Point,
    pub corpse_id: String,
    pub retained: Vec<DeathPossessions>,
    pub left: Vec<DeathPossessions>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct DeathPossessions {
    pub name: JsText,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

impl HeapBytes for PendingDeath {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.corpse_id.heap_bytes()?,
            self.retained.heap_bytes()?,
            self.left.heap_bytes()?,
        ])
    }
}

impl HeapBytes for DeathPossessions {
    fn heap_bytes(&self) -> Option<usize> {
        self.name.heap_bytes()
    }
}
