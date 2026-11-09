//! Scoped unsaved temporal rows share the actual save packer and accepted cut.
//! This is an internal indexed-read product, not a model/HTTP disclosure grant.
use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReadCutInput {
    actor_id: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TailOwner {
    actor_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    physical_life: u64,
    epoch: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    tail_revision: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TailReply {
    world_id: String,
    generation: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    accepted_cut: u64,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    identity_through: u64,
    request: TailOwner,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    tail: Option<crate::received::TemporalReceiptTail>,
}
impl NativeWorldSession {
    pub fn resolve_receipt_tail(&mut self, input: &[u8]) -> Result<(), RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: TailReply = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .resolve_receipt_tail(
                &input.world_id,
                &input.generation,
                input.accepted_cut,
                input.identity_through,
                &crate::received::TemporalReceiptTailRequest {
                    actor_id: &input.request.actor_id,
                    physical_life: input.request.physical_life,
                    epoch: &input.request.epoch,
                    tail_revision: input.request.tail_revision,
                },
                input.tail,
            )
            .map_err(failure)
    }
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
