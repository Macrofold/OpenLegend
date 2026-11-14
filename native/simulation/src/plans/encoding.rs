//! A requested activity and an ordinary plan construct their step fields in
//! different orders. That order survives Source JSON and decision signatures.
use super::PlanStep;
use serde::ser::SerializeMap;
use serde::{Serialize, Serializer};

impl Serialize for PlanStep {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("id", &self.id)?;
        map.serialize_entry("command", &self.command)?;
        if let Some(key) = &self.activity_key {
            // activity-execution.ts::activityFrontier installs the status and
            // activity key before target bindings. Keep exact UTF16 keys.
            map.serialize_entry("status", &self.status)?;
            map.serialize_entry("activityKey", key)?;
            if let Some(targets) = &self.target_episodes {
                map.serialize_entry("targetEpisodes", targets)?;
            }
        } else {
            if let Some(targets) = &self.target_episodes {
                map.serialize_entry("targetEpisodes", targets)?;
            }
            map.serialize_entry("status", &self.status)?;
        }
        if let Some(id) = &self.action_id {
            map.serialize_entry("actionId", id)?;
        }
        if let Some(outcome) = &self.outcome {
            map.serialize_entry("outcome", outcome)?;
        }
        if let Some(evidence) = &self.result_evidence {
            map.serialize_entry("resultEvidence", evidence)?;
        }
        map.end()
    }
}
