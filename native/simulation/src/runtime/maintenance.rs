//! Bounded actor IDs come from the host's actual due-header index. The semantic
//! owner checks current due state again under its ordinary native checkpoint.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RecentInput {
    actor_ids: Vec<String>,
}
impl NativeWorldSession {
    pub fn begin_recent_retention(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: RecentInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .begin_recent_retention(input.actor_ids)
            .map_err(failure)
    }
}
