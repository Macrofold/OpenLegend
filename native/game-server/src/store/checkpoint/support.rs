//! The stopped candidate asks only about surviving personal account aliases.
//! Its SQL projection supplies the exact current rows, without opening recent
//! pages, prose or another actor's account scope.

use super::provider;
use crate::store::read::admitted_query;
use crate::store::{DurableHead, Store, StoreError, StoreResult};
use openlegend_simulation::encoding::json_record_len;
use openlegend_simulation::geometry::GeometryBinding;
use openlegend_simulation::host::ByteReservation;
use openlegend_simulation::runtime::{
    RuntimeProvider, RuntimeProviderInput, RuntimeRestoreMembership,
};
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

pub(crate) struct RetainedAccountMembership {
    pub aliases: Vec<usize>,
    pub individuals: Vec<usize>,
    pub max_pages: usize,
    pub max_bytes: usize,
    _storage: ByteReservation,
}

#[derive(Deserialize)]
struct RestoreLimits {
    support: MembershipLimits,
}

#[derive(Deserialize)]
struct MembershipLimits {
    rows: usize,
    bytes: usize,
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
        let limits = self.restore_membership_limits()?;
        let bytes = json_record_len(&request.aliases).map_err(|_| StoreError::InvalidRecord)?;
        if request.aliases.len() > limits.rows || bytes > limits.bytes {
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

    /// Return only exact canonical-account matches. The already installed
    /// candidate independently adds recent, frontier-qualified receipt matches.
    pub(crate) async fn checkpoint_retention_membership(
        &self,
        tx: &Transaction<'_>,
        prospective: &DurableHead,
        request: &RuntimeRestoreMembership,
    ) -> StoreResult<RetainedAccountMembership> {
        let (world, generation, actor, cut) = request.scope();
        if world != prospective.world_id || generation != prospective.generation || cut != 0 {
            return Err(StoreError::StaleCut);
        }
        let (aliases, individuals) = request.requested();
        let limits = self.restore_membership_limits()?;
        let items = aliases
            .len()
            .checked_add(individuals.len())
            .ok_or(StoreError::Capacity)?;
        let bytes = [aliases, individuals]
            .into_iter()
            .try_fold(0usize, |used, list| {
                used.checked_add(json_record_len(list).ok()?)
            })
            .ok_or(StoreError::Capacity)?;
        if items > limits.rows || bytes > limits.bytes {
            return Err(StoreError::Capacity);
        }
        let workspace = bytes
            .checked_mul(4)
            .and_then(|n| n.checked_add(items.checked_mul(192)?))
            .ok_or(StoreError::Capacity)?;
        let mut custody = self
            .budget
            .reserve(workspace)
            .map_err(|_| StoreError::Capacity)?;
        let (aliases, individuals) = self
            .with_checkpoint_projection(tx, prospective, request.projection(), false, async {
                let (_transfer, rows) = admitted_query(
                    tx,
                    &self.schema.checkpoint.retention_membership,
                    &[&world, &actor, &aliases, &individuals],
                    &self.budget,
                )
                .await?;
                let mut matched_aliases = BTreeSet::new();
                let mut matched_individuals = BTreeSet::new();
                for row in &rows {
                    let member: &str = row.try_get(1)?;
                    match row.try_get(0)? {
                        "alias" => {
                            matched_aliases.insert(member);
                        }
                        "individual" => {
                            matched_individuals.insert(member);
                        }
                        _ => return Err(StoreError::InvalidRecord),
                    }
                }
                let select = |asked: &[String], matched: BTreeSet<&str>| {
                    asked
                        .iter()
                        .enumerate()
                        .filter_map(|(index, member)| {
                            matched.contains(member.as_str()).then_some(index)
                        })
                        .collect::<Vec<_>>()
                };
                Ok((
                    select(aliases, matched_aliases),
                    select(individuals, matched_individuals),
                ))
            })
            .await?;
        let retained = [aliases.capacity(), individuals.capacity()]
            .into_iter()
            .try_fold(size_of::<RetainedAccountMembership>(), |n, size| {
                n.checked_add(size.checked_mul(size_of::<usize>())?)
            })
            .ok_or(StoreError::Capacity)?;
        custody.resize(retained).map_err(|_| StoreError::Capacity)?;
        Ok(RetainedAccountMembership {
            aliases,
            individuals,
            max_pages: limits.rows,
            max_bytes: limits.bytes,
            _storage: custody,
        })
    }

    fn restore_membership_limits(&self) -> StoreResult<MembershipLimits> {
        serde_json::from_str::<RestoreLimits>(self.restore_retention_preparation().get())
            .map(|limits| limits.support)
            .map_err(|_| StoreError::Schema)
    }
}
