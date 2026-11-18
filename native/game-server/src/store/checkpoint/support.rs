//! The stopped candidate asks only about surviving personal account aliases.
//! Its SQL projection supplies the exact current rows, without opening recent
//! pages, prose or another actor's account scope.

use super::provider;
use crate::store::read::admitted_query;
use crate::store::{DurableHead, Store, StoreError, StoreResult};
use openlegend_simulation::encoding::json_record_len;
use openlegend_simulation::geometry::GeometryBinding;
use openlegend_simulation::runtime::{RuntimeProvider, RuntimeProviderInput};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::collections::BTreeSet;
use tokio_postgres::Transaction;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Question {
    binding: GeometryBinding,
    world_id: String,
    generation: String,
    accepted_cut: u64,
    actor_id: String,
    aliases: Vec<String>,
    restore_projection: Box<RawValue>,
}

#[derive(Serialize)]
struct Answer {
    binding: GeometryBinding,
    retained: Vec<usize>,
}

impl Store {
    /// Read the candidate's actual staged account metadata, with no redundant
    /// recent-page or derived-index preparation for this alias-only question.
    pub(crate) async fn answer_checkpoint_support(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        provider: &RuntimeProvider,
    ) -> StoreResult<RuntimeProviderInput> {
        let (request, _custody): (Question, _) =
            provider::prepare(self, provider, "support-membership")?;
        if request.world_id != prospective.world_id
            || request.generation != prospective.generation
            || request.accepted_cut != 0
            || request.binding.base_cut != request.accepted_cut
            || !openlegend_simulation::values::is_safe_record_id(&request.actor_id)
            || request.aliases.iter().any(String::is_empty)
        {
            return Err(StoreError::StaleCut);
        }
        #[derive(Deserialize)]
        struct Limits {
            support: SupportLimits,
        }
        #[derive(Deserialize)]
        struct SupportLimits {
            rows: usize,
            bytes: usize,
        }
        let limits: Limits = serde_json::from_str(self.restore_retention_preparation().get())
            .map_err(|_| StoreError::Schema)?;
        let bytes = json_record_len(&request.aliases).map_err(|_| StoreError::InvalidRecord)?;
        if request.aliases.len() > limits.support.rows || bytes > limits.support.bytes {
            return Err(StoreError::Capacity);
        }
        let workspace = request
            .aliases
            .len()
            .checked_mul(192)
            .and_then(|n| n.checked_add(bytes.checked_mul(4)?))
            .ok_or(StoreError::Capacity)?;
        let _workspace = self
            .budget
            .reserve(workspace)
            .map_err(|_| StoreError::Capacity)?;
        self.with_checkpoint_projection(
            tx,
            prospective,
            &request.restore_projection,
            false,
            async {
                let (_transfer, rows) = admitted_query(
                    tx,
                    &self.schema.checkpoint.support_membership,
                    &[&request.world_id, &request.actor_id, &request.aliases],
                    &self.budget,
                )
                .await?;
                let matches = rows
                    .iter()
                    .map(|row| row.try_get::<_, &str>(0).map_err(StoreError::from))
                    .collect::<StoreResult<BTreeSet<_>>>()?;
                let retained = request
                    .aliases
                    .iter()
                    .enumerate()
                    .filter_map(|(index, alias)| matches.contains(alias.as_str()).then_some(index))
                    .collect();
                let answer = Answer {
                    binding: request.binding,
                    retained,
                };
                let (json, custody) = self.encode_restore_output(&answer, usize::MAX)?;
                Ok(RuntimeProviderInput::new(json, custody))
            },
        )
        .await
    }
}
