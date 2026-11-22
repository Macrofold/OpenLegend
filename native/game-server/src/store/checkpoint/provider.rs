//! Shared ownership of the stopped candidate's private provider request and
//! exact current SQL identity. Live routes cannot construct this product.

use crate::store::read::admitted_query;
use crate::store::{DurableHead, MAX_SAFE_INTEGER, Store, StoreError, StoreResult, durable_head};
use openlegend_simulation::{
    experience::HistoryBinding, host::ByteReservation, records::SqlCell, runtime::RuntimeProvider,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use tokio_postgres::Transaction;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Binding {
    pub(super) world_id: String,
    pub(super) generation: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) actor_id: Option<String>,
    pub(super) accepted_cut: u64,
    pub(super) identity_through: u64,
    candidate_id: u64,
    candidate_generation: u64,
    request_serial: u64,
}

pub(super) fn prepare<T: DeserializeOwned>(
    store: &Store,
    provider: &RuntimeProvider,
    kind: &str,
) -> StoreResult<(T, ByteReservation)> {
    #[derive(Deserialize)]
    struct Envelope<T> {
        kind: String,
        value: T,
    }
    provider
        .with_request(|request| {
            let workspace = SqlCell::json_decode_bound(request).ok_or(StoreError::InvalidRecord)?;
            let custody = store
                .budget
                .reserve(workspace)
                .map_err(|_| StoreError::Capacity)?;
            let envelope: Envelope<T> =
                serde_json::from_str(request).map_err(|_| StoreError::InvalidRecord)?;
            if envelope.kind != kind {
                return Err(StoreError::InvalidRecord);
            }
            Ok((envelope.value, custody))
        })
        .map_err(|_| StoreError::InvalidRecord)?
}

/// The same SQL fence checks an encoded restore request or an admitted
/// typed personal-history request without copying either set of identities.
pub(super) struct HeaderRef<'a> {
    world_id: &'a str,
    generation: &'a str,
    accepted_cut: u64,
    identity_through: u64,
    candidate_id: u64,
    candidate_generation: u64,
    request_serial: u64,
}

impl<'a> From<&'a Binding> for HeaderRef<'a> {
    fn from(binding: &'a Binding) -> Self {
        Self {
            world_id: &binding.world_id,
            generation: &binding.generation,
            accepted_cut: binding.accepted_cut,
            identity_through: binding.identity_through,
            candidate_id: binding.candidate_id,
            candidate_generation: binding.candidate_generation,
            request_serial: binding.request_serial,
        }
    }
}

impl<'a> From<&'a HistoryBinding> for HeaderRef<'a> {
    fn from(binding: &'a HistoryBinding) -> Self {
        Self {
            world_id: &binding.world_id,
            generation: &binding.generation,
            accepted_cut: binding.accepted_cut,
            identity_through: binding.identity_through,
            candidate_id: binding.candidate_id,
            candidate_generation: binding.candidate_generation,
            request_serial: binding.request_serial,
        }
    }
}

pub(super) async fn verify_header<'a>(
    store: &Store,
    tx: &Transaction<'_>,
    prospective: &DurableHead,
    accepted_cut: u64,
    binding: impl Into<HeaderRef<'a>>,
    at: Option<f64>,
) -> StoreResult<()> {
    let binding = binding.into();
    if binding.world_id != prospective.world_id
        || binding.generation != prospective.generation
        || binding.accepted_cut != accepted_cut
        || [
            binding.identity_through,
            binding.candidate_id,
            binding.candidate_generation,
            binding.request_serial,
        ]
        .into_iter()
        .any(|value| value > MAX_SAFE_INTEGER)
        || durable_head(tx).await?.as_ref() != Some(prospective)
    {
        return Err(StoreError::StaleCut);
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Settings<'a> {
        id: &'a str,
        next_id: u64,
        sim_time: f64,
    }
    let (_transfer, rows) = admitted_query(
        tx,
        "SELECT payload FROM world_settings WHERE world_id=$1 AND id='[\"world\"]'",
        &[&binding.world_id],
        &store.budget,
    )
    .await?;
    let [settings] = rows.as_slice() else {
        return Err(StoreError::StaleCut);
    };
    let header: Settings<'_> =
        serde_json::from_str(settings.try_get(0)?).map_err(|_| StoreError::InvalidRecord)?;
    if header.id != binding.world_id
        || header.next_id != binding.identity_through
        || at.is_some_and(|at| header.sim_time != at)
    {
        return Err(StoreError::StaleCut);
    }
    Ok(())
}
