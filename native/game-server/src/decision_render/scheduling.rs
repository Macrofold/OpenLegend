use openlegend_simulation::{runtime::RuntimeNpcIntakeSelection, values::DefinitionPin};
use serde::Deserialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::num::NonZeroU32;

/// Compiled from the existing native Source scheduler and selected world.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SchedulingPolicy {
    pub(crate) reads_per_pass: usize,
    pub(crate) urgent: f64,
    pub(crate) aging_ms: u64,
    pub(crate) selection: RuntimeNpcIntakeSelection,
    pub(crate) actor_paths: HashMap<String, usize>,
    pub(crate) stimuli: StimulusPolicy,
    pub(crate) significant_events: HashSet<String>,
    pub(crate) policy_revision: u64,
    pub(crate) body_policy_pin: Option<Value>,
    pub(crate) discovery: bool,
    idle_discovery_seconds: Option<NonZeroU32>,
    pub(crate) prepared_responses: Option<DefinitionPin>,
}

impl SchedulingPolicy {
    pub(crate) fn next_discovery_check(&self, at: f64) -> f64 {
        self.idle_discovery_seconds
            .map_or(at, |seconds| at + f64::from(seconds.get()))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct StimulusPolicy {
    pub(crate) salience: HashMap<String, f64>,
    #[serde(rename = "noveltySeconds")]
    _novelty: f64,
    #[serde(rename = "limit")]
    _limit: usize,
    pub(crate) review_seconds: Option<f64>,
}
