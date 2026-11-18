//! Scoped unsaved temporal rows share the actual save packer and accepted cut.
//! This is an internal indexed-read product, not a model/HTTP disclosure grant.
use super::*;
use std::borrow::Cow;

/// Original accepted SQL-cut facts for the active remembered-place request.
/// The I/O owner takes independently funded copies only of relevant data.
pub struct RuntimeKnownPlaceRead<'a> {
    pub binding: crate::geometry::GeometryBinding,
    pub world_id: &'a str,
    pub generation: &'a str,
    pub actor_id: &'a str,
    pub maximum_rows: u64,
    pub maximum_bytes: u64,
    pub durable_revision: u64,
    pub durable_cut: u64,
    pub in_flight_through: Option<u64>,
    pub privacy: &'a crate::experience::ActorPrivacy,
    pub detached: Option<&'a crate::records::ChangedRows>,
    pub suffix: &'a crate::records::ChangedRows,
}

#[derive(Deserialize)]
struct KnownPlacesQuestion<'a> {
    #[serde(borrow)]
    value: KnownPlacesRequest<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct KnownPlacesRequest<'a> {
    binding: crate::geometry::GeometryBinding,
    #[serde(borrow)]
    world_id: Cow<'a, str>,
    #[serde(borrow)]
    generation: Cow<'a, str>,
    #[serde(borrow)]
    actor_id: Cow<'a, str>,
    physical_life: u64,
    privacy_revision: u64,
    expected_revision: u64,
    maximum_rows: u64,
    maximum_bytes: u64,
}

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
    /// Lend the needed save owners to the active provider without capturing
    /// temporal pages or going back through the application mutation lane.
    pub fn with_known_place_read<T>(
        &self,
        ticket: &RuntimeProvider,
        prepare: impl FnOnce(RuntimeKnownPlaceRead<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let question = ticket.question()?;
        if question.kind() != crate::simulation::ProviderKind::KnownPlaces {
            return Ok(None);
        }
        let text = question
            .json()
            .ok_or_else(|| failure("missing place request"))?;
        let _header = self
            .budget
            .reserve(
                text.len()
                    .checked_mul(3)
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        let KnownPlacesQuestion { value: request } = serde_json::from_str(text).map_err(failure)?;
        if request.binding != question.binding() {
            return Err(failure("place request binding changed"));
        }
        let (save, privacy, (detached, suffix)) = self
            .session
            .known_place_read(
                request.binding,
                &request.world_id,
                &request.generation,
                &request.actor_id,
                request.physical_life,
                request.privacy_revision,
                request.expected_revision,
            )
            .map_err(failure)?;
        Ok(Some(prepare(RuntimeKnownPlaceRead {
            binding: request.binding,
            world_id: &request.world_id,
            generation: &request.generation,
            actor_id: &request.actor_id,
            maximum_rows: request.maximum_rows,
            maximum_bytes: request.maximum_bytes,
            durable_revision: save.durable_revision,
            durable_cut: save.durable_cut,
            in_flight_through: save.in_flight_through,
            privacy,
            detached,
            suffix,
        })))
    }
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
