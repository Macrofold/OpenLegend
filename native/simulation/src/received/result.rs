//! The actor's received own outcome. Its execution-history row is not a grant;
//! the exact personal receipt remains subject to ordinary recent eligibility.

use crate::activity::{ActivityDisplayLimits, ActivityFact, validate_result_facts};
use crate::values::is_safe_record_id;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum ActionResultKind {
    #[serde(rename = "action-result")]
    ActionResult,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActionResultStatus {
    Completed,
    Cancelled,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActionResultOutcome {
    pub ok: bool,
    pub code: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActionResultValue {
    pub kind: ActionResultKind,
    pub id: String,
    pub text: String,
    pub status: ActionResultStatus,
    pub outcome: ActionResultOutcome,
    pub facts: Vec<ActivityFact>,
}

impl ActionResultValue {
    pub fn validate(&self, limits: &ActivityDisplayLimits) -> bool {
        is_safe_record_id(&self.id)
            && (self.status == ActionResultStatus::Completed) == self.outcome.ok
            && validate_result_facts(&self.facts, limits).is_ok()
    }
}
