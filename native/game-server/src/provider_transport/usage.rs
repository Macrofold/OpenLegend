//! Bounded, on-demand observation of an already admitted Macrofold inference.
//! This path cannot dispatch inference or settle the game's spending ledger.
use super::{
    ProviderDestination, ProviderRoute,
    macrofold::decimal_count,
    workspace::{self, WorkspaceRead},
};
use crate::network::{NetworkError, NetworkOperation, NetworkOwner};
use chrono::{DateTime, SecondsFormat, Utc};
use openlegend_simulation::{
    encoding::json_tree_allocation_bound,
    host::{ByteBudget, ByteReservation},
};
use reqwest::header;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::{collections::HashSet, future::Future, time::Duration};
use tokio::time::Instant;
use uuid::Uuid;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct MacrofoldRun {
    id: Uuid,
    origin: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ObservedUsage {
    run_id: Uuid,
    observed_at_ms: i64,
    rows: usize,
    charged_micro_usd: Option<u64>,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
}

#[derive(Deserialize)]
struct Identity {
    principal_type: String,
    organization_id: Option<Uuid>,
    effective_scopes: Vec<String>,
    workspace_restrictions: Vec<Uuid>,
}

#[derive(Deserialize)]
struct Run {
    id: Uuid,
    organization_id: Uuid,
    kind: String,
    workspace_id: Option<Uuid>,
}

#[derive(Deserialize)]
struct Page {
    currency: String,
    data: Vec<Entry>,
    next_cursor: Option<String>,
}

#[derive(Deserialize)]
struct Entry {
    id: Uuid,
    run_id: Option<Uuid>,
    workspace_id: Option<Uuid>,
    kind: String,
    charged_micro_usd: Option<String>,
    model_usage: Option<ModelUsage>,
}

#[derive(Deserialize)]
struct ModelUsage {
    completeness: String,
    provisional: bool,
    input_tokens: Option<String>,
    output_tokens: Option<String>,
}

impl ProviderDestination {
    /// A typed Run from this destination's actual inference admission. The
    /// origin is only a comparison key and never constructs an outbound URL.
    pub(crate) fn macrofold_run(&self, id: Uuid) -> Option<MacrofoldRun> {
        if self.route != ProviderRoute::Macrofold || id.is_nil() {
            return None;
        }
        let origin = self.url.origin().ascii_serialization();
        (origin.len() <= 2048).then_some(MacrofoldRun { id, origin })
    }

    /// Observe one exact original Run using a single existing network slot
    /// and deadline. Authorize each GET at its first poll. Returned facts are
    /// bounded and independent from the provider body and its transport.
    pub(crate) async fn observe_macrofold_usage<E: From<NetworkError>, Turn, Start>(
        &self,
        network: &NetworkOwner,
        proof: &MacrofoldRun,
        from: &str,
        budget: &ByteBudget,
        authorize: impl Fn() -> Turn,
    ) -> Result<Option<ObservedUsage>, E>
    where
        Turn: Future<Output = Result<Start, E>>,
        Start: FnOnce(&mut dyn FnMut()) -> Result<(), E>,
    {
        if self.route != ProviderRoute::Macrofold
            || proof.id.is_nil()
            || self.url.origin().ascii_serialization() != proof.origin
        {
            return Ok(None);
        }
        let now = Utc::now();
        let Ok(start) = DateTime::parse_from_rfc3339(from) else {
            return Ok(None);
        };
        if start >= now {
            return Ok(None);
        }
        let operation = network.admit(Instant::now() + Duration::from_secs(30), 4096)?;
        let (identity, _identity): (Identity, _) = self
            .usage_read(
                &operation,
                WorkspaceRead::Identity,
                None,
                budget,
                authorize(),
            )
            .await?;
        let Some(organization) = identity.organization_id else {
            return Ok(None);
        };
        // The usage API accepts an organization credential with usage:read
        // and no workspace restrictions. Do not fall back to a broader key.
        if organization.is_nil()
            || identity.principal_type != "api_key"
            || !identity.workspace_restrictions.is_empty()
            || !identity
                .effective_scopes
                .iter()
                .any(|scope| scope == "usage:read")
        {
            return Ok(None);
        }
        let id = proof.id.to_string();
        let (run, _run): (Run, _) = self
            .usage_read(
                &operation,
                WorkspaceRead::Run(&id),
                Some(organization),
                budget,
                authorize(),
            )
            .await?;
        if run.id != proof.id
            || run.kind != "inference"
            || run.organization_id != organization
            || run.workspace_id.is_some_and(|id| id.is_nil())
        {
            return Ok(None);
        }
        let workspace = run.workspace_id.map(|id| id.to_string());
        let at = now.to_rfc3339_opts(SecondsFormat::Millis, true);
        let (page, _page): (Page, _) = self
            .usage_read(
                &operation,
                WorkspaceRead::RunUsage {
                    id: &id,
                    from,
                    to: &at,
                    workspace: workspace.as_deref(),
                },
                Some(organization),
                budget,
                authorize(),
            )
            .await?;
        Ok(page.observe(&run, now))
    }

    async fn usage_read<T: DeserializeOwned, E: From<NetworkError>, Start>(
        &self,
        operation: &NetworkOperation<'_>,
        read: WorkspaceRead<'_>,
        organization: Option<Uuid>,
        budget: &ByteBudget,
        authorize: impl Future<Output = Result<Start, E>>,
    ) -> Result<(T, ByteReservation), E>
    where
        Start: FnOnce(&mut dyn FnMut()) -> Result<(), E>,
    {
        let mut request = self.workspace_metadata(read, budget)?;
        if let Some(organization) = organization {
            let value = header::HeaderValue::from_str(&organization.to_string())
                .map_err(|_| NetworkError::Destination)?;
            request
                .request
                .headers_mut()
                .insert("x-organization-id", value);
        }
        let reply = workspace::exchange_after(request, operation, budget, false, authorize).await?;
        if reply.status != 200 {
            return Err(NetworkError::Transfer.into());
        }
        let text = std::str::from_utf8(&reply.bytes).map_err(|_| NetworkError::Transfer)?;
        let bytes = json_tree_allocation_bound(text).ok_or(NetworkError::Capacity)?;
        let owned = budget.reserve(bytes).map_err(|_| NetworkError::Capacity)?;
        let value = serde_json::from_str(text).map_err(|_| NetworkError::Transfer)?;
        Ok((value, owned))
    }
}

impl Page {
    fn observe(self, run: &Run, at: DateTime<Utc>) -> Option<ObservedUsage> {
        if self.currency != "USD"
            || self.next_cursor.is_some()
            || self.data.is_empty()
            || self.data.len() > 100
        {
            return None;
        }
        let mut ids = HashSet::with_capacity(self.data.len());
        let mut charge = Some(0);
        let mut input = Some(0);
        let mut output = Some(0);
        let mut model = false;
        let add = |left: Option<u64>, right: Option<&str>| {
            left?
                .checked_add(decimal_count(right?)?)
                .filter(|value| *value <= openlegend_simulation::identity::MAX_SAFE_INTEGER)
        };
        for row in &self.data {
            if row.run_id != Some(run.id)
                || row.workspace_id != run.workspace_id
                || row.id.is_nil()
                || !ids.insert(row.id)
            {
                return None;
            }
            charge = add(charge, row.charged_micro_usd.as_deref());
            match row.kind.as_str() {
                "model" => {
                    model = true;
                    let usage = row.model_usage.as_ref();
                    if let Some(usage) =
                        usage.filter(|usage| usage.completeness == "complete" && !usage.provisional)
                    {
                        input = add(input, usage.input_tokens.as_deref());
                        output = add(output, usage.output_tokens.as_deref());
                    } else {
                        input = None;
                        output = None;
                        if usage.is_some_and(|usage| usage.provisional) {
                            charge = None;
                        }
                    }
                }
                "tool" | "compute" | "storage" => {}
                _ => return None,
            }
        }
        if charge.is_none() && input.is_none() && output.is_none() {
            return None;
        }
        Some(ObservedUsage {
            run_id: run.id,
            observed_at_ms: at.timestamp_millis(),
            rows: self.data.len(),
            charged_micro_usd: charge,
            input_tokens: input.filter(|_| model),
            output_tokens: output.filter(|_| model),
        })
    }
}
