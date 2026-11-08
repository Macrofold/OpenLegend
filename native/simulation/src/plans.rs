//! Actor-local native frontiers. A plan retains commands and evidence references,
//! not a second action executor or a second copy of their personal accounts.

use crate::activity::ResultEvidence;
use crate::commands::{NativeCommand, Outcome};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::state::UnconvertedField;
use crate::values::{deserialize_nullable, deserialize_present_option, deserialize_safe_integer};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AgencyLimits {
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub goals: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub goal_history: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub steps: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub history: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub places: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum StepStatus {
    Queued,
    Running,
    Completed,
    Blocked,
    Cancelled,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum PlanStatus {
    Active,
    Blocked,
    Completed,
    Cancelled,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum PlanMode {
    Enqueue,
    Replace,
    Interrupt,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PlanStep {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target_episodes: Option<IndexMap<String, Option<String>>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub activity_key: Option<String>,
    pub id: String,
    pub command: NativeCommand,
    pub status: StepStatus,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub action_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub outcome: Option<Outcome>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub result_evidence: Option<ResultEvidence>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActorPlan {
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub result_evidence: Option<ResultEvidence>,
    // The selected proof converts ordinary frontiers. An actual activity graph
    // remains an installation refusal, never an ignored optional child.
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub activity: Option<UnconvertedField>,
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub revision: u64,
    #[serde(deserialize_with = "deserialize_nullable")]
    pub goal_id: Option<String>,
    pub status: PlanStatus,
    pub steps: Vec<PlanStep>,
}

impl ActorPlan {
    /// Only the installed ordinary family can take a bounded before-image.
    /// Activity graphs must enter their own real owner before being mutable.
    pub(crate) fn clone_ordinary(&self) -> Result<Self, crate::execution::ExecutionError> {
        if self.activity.is_some() || self.steps.iter().any(|step| step.activity_key.is_some()) {
            return Err(crate::execution::ExecutionError::UnsupportedFamily);
        }
        Ok(Self {
            result_evidence: self.result_evidence.clone(),
            activity: None,
            id: self.id.clone(),
            revision: self.revision,
            goal_id: self.goal_id.clone(),
            status: self.status,
            steps: self.steps.clone(),
        })
    }
}

impl HeapBytes for PlanStep {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.target_episodes.heap_bytes()?,
            self.activity_key.heap_bytes()?,
            self.id.heap_bytes()?,
            self.command.heap_bytes()?,
            self.action_id.heap_bytes()?,
            self.outcome.heap_bytes()?,
            self.result_evidence.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ActorPlan {
    fn heap_bytes(&self) -> Option<usize> {
        if self.activity.is_some() {
            return None;
        }
        heap_sum([
            self.result_evidence.heap_bytes()?,
            self.id.heap_bytes()?,
            self.goal_id.heap_bytes()?,
            self.steps.heap_bytes()?,
        ])
    }
}
