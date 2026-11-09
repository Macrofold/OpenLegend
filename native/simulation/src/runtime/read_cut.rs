//! Scoped unsaved temporal rows share the actual save packer and accepted cut.
//! This is an internal indexed-read product, not a model/HTTP disclosure grant.
use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReadCutInput {
    actor_id: String,
}
impl NativeWorldSession {
    pub fn read_cut(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: ReadCutInput = serde_json::from_slice(input).map_err(failure)?;
        let captured = self
            .session
            .read_cut(&input.actor_id, self.temporal_save_limits, &self.budget)
            .map_err(failure)?;
        RuntimeJson::encode(&captured, &self.budget)
    }
}
