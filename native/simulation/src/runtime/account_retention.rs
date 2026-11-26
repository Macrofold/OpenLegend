//! Detached account preparation owns metadata/selected bodies only. Its actual
//! canonical application still consumes the ordinary Session candidate.
use super::*;
use crate::experience::{
    AccountBodiesReply, AccountMetadataReply, AccountRetentionRead, next_due_actor,
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
    /// Pick one due account owner from scalar headers and prepare its complete
    /// resident sources while the accepted turn is still held. Partial
    /// installations cannot imply a negative result for omitted history.
    /// Advance the fair service cursor before preparation can refuse.
    pub fn begin_resident_account_retention(
        &mut self,
        next_actor: &mut usize,
        limits: RetentionPreparation,
        summary_prefix: &str,
    ) -> Result<Option<CandidateKey>, RuntimeError> {
        self.require_active()?;
        let state = &self.session.accepted().map_err(failure)?.state;
        if state.physical.header.paused {
            return Ok(None);
        }
        let Some((index, actor)) = next_due_actor(state, *next_actor) else {
            return Ok(None);
        };
        *next_actor = index + 1;
        let prepared = AccountRetentionRead::prepare_resident(
            state,
            actor,
            limits,
            summary_prefix,
            &self.budget,
        )
        .map_err(failure)?;
        self.session
            .begin_account_retention(prepared)
            .map(Some)
            .map_err(failure)
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
