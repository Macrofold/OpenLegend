//! Detached account preparation owns metadata/selected bodies only. Its actual
//! canonical application still consumes the ordinary Session candidate.
use super::*;
use crate::experience::{
    AccountBodiesReply, AccountMetadataReply, AccountRetentionRead, RetentionPreparation,
};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    actor_id: String,
    preparation: RetentionPreparation,
}
pub struct RuntimeAccountRetention {
    read: Option<AccountRetentionRead>,
}
impl RuntimeAccountRetention {
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let read = self
            .read
            .as_ref()
            .ok_or_else(|| failure("account retention was consumed"))?;
        RuntimeJson::encode(&read.packet().map_err(failure)?, budget)
    }
    pub fn select(
        &mut self,
        input: &[u8],
        budget: &ByteBudget,
    ) -> Result<RuntimeJson, RuntimeError> {
        let _decode = decode_preparation(input, budget)?;
        let reply: AccountMetadataReply = serde_json::from_slice(input).map_err(failure)?;
        let value = self
            .read
            .as_mut()
            .ok_or_else(|| failure("account retention was consumed"))?
            .select(reply, budget)
            .map_err(failure)?;
        RuntimeJson::encode(&value, budget)
    }
    pub fn load(&mut self, input: &[u8], budget: &ByteBudget) -> Result<(), RuntimeError> {
        let _decode =
            crate::install::row_input::prepare_account_bodies(input, budget).map_err(failure)?;
        let reply: AccountBodiesReply = serde_json::from_slice(input).map_err(failure)?;
        self.read
            .as_mut()
            .ok_or_else(|| failure("account retention was consumed"))?
            .load(reply, budget)
            .map_err(failure)
    }
}
impl NativeWorldSession {
    pub fn read_account_retention(
        &self,
        input: &[u8],
    ) -> Result<RuntimeAccountRetention, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: Request = serde_json::from_slice(input).map_err(failure)?;
        let read = AccountRetentionRead::capture(
            &self.session.accepted().map_err(failure)?.state,
            &input.actor_id,
            input.preparation,
            &self.budget,
        )
        .map_err(failure)?;
        Ok(RuntimeAccountRetention { read: Some(read) })
    }
    pub fn begin_account_retention(
        &mut self,
        read: &mut RuntimeAccountRetention,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .begin_account_retention(
                read.read
                    .take()
                    .ok_or_else(|| failure("account retention was consumed"))?,
            )
            .map_err(failure)
    }
}
