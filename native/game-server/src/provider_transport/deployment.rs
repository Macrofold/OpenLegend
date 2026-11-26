//! Prepare selected Macrofold deployments inside the original operation. A
//! descriptor shapes a request; only Macrofold admits a Run and its revision.

use super::{HttpEvidence, ProviderDestination, macrofold::DeploymentPin};
use crate::{
    decision_dispatch::CallFailure,
    network::{NetworkError, NetworkOwner},
};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{sync::watch, time::Instant};
use uuid::Uuid;

const DESCRIPTOR_BYTES: usize = 65_536;
const RETRY_DELAY: Duration = Duration::from_secs(30);
const TEMPORARY_TIMEOUT: Duration = Duration::from_secs(240);
const UNAVAILABLE: &str = "deployment_unavailable";
const UNSUPPORTED: &str = "unsupported_model_capability";
const PIN_CHANGED: &str = "deployment_binding_stale";

pub(crate) fn canonical_uuid<'de, D>(de: D) -> Result<Uuid, D::Error>
where
    D: Deserializer<'de>,
{
    let value = String::deserialize(de)?;
    Uuid::try_parse(&value)
        .ok()
        .filter(|uuid| uuid.hyphenated().to_string().eq_ignore_ascii_case(&value))
        .ok_or_else(|| serde::de::Error::custom("expected a hyphenated UUID"))
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ModelBinding {
    #[serde(deserialize_with = "canonical_uuid")]
    pub(crate) deployment_id: Uuid,
    #[serde(
        default,
        deserialize_with = "present_uuid",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) deployment_revision_id: Option<Uuid>,
}

fn present_uuid<'de, D>(de: D) -> Result<Option<Uuid>, D::Error>
where
    D: Deserializer<'de>,
{
    canonical_uuid(de).map(Some)
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentSelection {
    pub(crate) workspace_id: Uuid,
    pub(crate) model_binding: ModelBinding,
}

impl DeploymentSelection {
    pub(crate) fn pin(self) -> DeploymentPin {
        DeploymentPin {
            id: self.model_binding.deployment_id,
            revision: self.model_binding.deployment_revision_id,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum OutputPolicy {
    #[default]
    Auto,
    JsonSchema,
    JsonObject,
    PromptedJson,
}

impl OutputPolicy {
    pub(crate) fn caption(self) -> &'static str {
        match self {
            Self::Auto => "automatic JSON format",
            Self::JsonSchema => "JSON Schema",
            Self::JsonObject => "JSON object",
            Self::PromptedJson => "JSON requested in the prompt",
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) enum OutputMode {
    JsonSchema,
    JsonObject,
    PromptedJson,
}

#[derive(Clone, Copy)]
pub(crate) struct GenerationCapabilities {
    pub(crate) mode: OutputMode,
    pub(crate) output_tokens: usize,
    pub(crate) streaming: bool,
}

/// A finite configured target owns one immutable capability snapshot. Equal
/// workspace, deployment and explicit pin selections share the same owner.
pub(crate) struct Deployment {
    pub(crate) selection: DeploymentSelection,
    // Keep mutation of cached facts short. The separate read gate coalesces
    // remote work, with no world or database borrow across either lock.
    cache: Mutex<Cache>,
    read: tokio::sync::Mutex<()>,
}

#[derive(Clone, Default)]
struct Cache {
    revision: Option<Arc<Description>>,
    stale: bool,
    generation: u64,
    retry_at: Option<Instant>,
    server_retry_at: Option<Instant>,
    unavailable: bool,
}

impl Deployment {
    pub(crate) fn new(selection: DeploymentSelection) -> Arc<Self> {
        Arc::new(Self {
            selection,
            cache: Mutex::new(Cache::default()),
            read: tokio::sync::Mutex::new(()),
        })
    }

    pub(crate) async fn judgment(
        &self,
        operation: &Preparation<'_>,
        output_tokens: usize,
    ) -> Result<usize, CallFailure> {
        self.prepare(operation, |description| {
            let capability = &description.capabilities;
            (capability.protocol == Protocol::Systemone && capability.text())
                .then_some(output_tokens.min(capability.max_output_tokens))
        })
        .await
    }

    pub(crate) async fn generation(
        &self,
        operation: &Preparation<'_>,
        policy: OutputPolicy,
        schema: &Value,
        output_tokens: usize,
    ) -> Result<GenerationCapabilities, CallFailure> {
        self.prepare(operation, |description| {
            let capability = &description.capabilities;
            if capability.protocol != Protocol::OpenaiChat
                || !capability.chat_completions
                || !capability.text()
            {
                return None;
            }
            let schema_supported = || {
                capability.json_schema
                    && schema_supported(
                        schema,
                        &capability.schema_keywords,
                        capability.schema_dialect.as_deref(),
                    )
            };
            let mode = match policy {
                OutputPolicy::Auto | OutputPolicy::JsonSchema if schema_supported() => {
                    OutputMode::JsonSchema
                }
                OutputPolicy::Auto | OutputPolicy::JsonObject if capability.json_object => {
                    OutputMode::JsonObject
                }
                OutputPolicy::PromptedJson => OutputMode::PromptedJson,
                _ => return None,
            };
            Some(GenerationCapabilities {
                mode,
                output_tokens: output_tokens.min(capability.max_output_tokens),
                streaming: capability.streaming,
            })
        })
        .await
    }

    async fn prepare<T>(
        &self,
        operation: &Preparation<'_>,
        choose: impl Fn(&Description) -> Option<T>,
    ) -> Result<T, CallFailure> {
        let mut stopped = operation.stopped.clone();
        if *stopped.borrow_and_update() {
            return Err(CallFailure::Cancelled);
        }
        let prepare = self.prepare_current(operation, choose);
        tokio::select! {
            biased;
            _ = stop(&mut stopped) => Err(CallFailure::Cancelled),
            result = tokio::time::timeout_at(operation.deadline, prepare) => result.map_err(|_| NetworkError::Deadline)?,
        }
    }

    async fn prepare_current<T>(
        &self,
        operation: &Preparation<'_>,
        choose: impl Fn(&Description) -> Option<T>,
    ) -> Result<T, CallFailure> {
        let initial = self.current(&choose)?;
        let failed_revision = match initial {
            Current::Ready(result) => return Ok(result),
            Current::Refresh(revision) => revision,
        };
        let _read = self.read.lock().await;
        let snapshot = self.snapshot();
        match snapshot.current(&choose, self.selection.pin())? {
            Current::Ready(result) => return Ok(result),
            Current::Refresh(Some(revision))
                if failed_revision
                    .as_ref()
                    .is_none_or(|prior| !Arc::ptr_eq(prior, &revision)) =>
            {
                self.cache
                    .lock()
                    .expect("deployment capability cache")
                    .retry_after(None, false);
                return Err(CallFailure::Deployment(UNSUPPORTED));
            }
            Current::Refresh(_) => (),
        }
        let result = operation.describe(self.selection).await;
        let mut cache = self.cache.lock().expect("deployment capability cache");
        let description = match result {
            Ok(description) => description,
            Err(DescriptionError {
                failure,
                retry_after,
            }) => {
                // An interrupted owner leaves the gate available to an existing
                // waiter with its own deadline. Local admission is not an outage.
                if matches!(failure, CallFailure::Deployment(_)) {
                    cache.retry_after(retry_after, true);
                }
                return Err(failure);
            }
        };
        let chosen = self.select(&description, &choose);
        cache.revision = Some(Arc::new(description));
        cache.stale = cache.generation != snapshot.generation;
        if !cache.stale {
            cache.retry_at = None;
            cache.server_retry_at = None;
            cache.unavailable = false;
            if chosen.is_err() {
                cache.retry_after(None, false);
                cache.stale = matches!(chosen, Err(CallFailure::Deployment(PIN_CHANGED)));
            }
        }
        chosen
    }

    fn current<T>(
        &self,
        choose: &impl Fn(&Description) -> Option<T>,
    ) -> Result<Current<T>, CallFailure> {
        self.snapshot().current(choose, self.selection.pin())
    }

    fn snapshot(&self) -> Cache {
        self.cache
            .lock()
            .expect("deployment capability cache")
            .clone()
    }

    fn select<T>(
        &self,
        description: &Description,
        choose: &impl Fn(&Description) -> Option<T>,
    ) -> Result<T, CallFailure> {
        if self
            .selection
            .pin()
            .revision
            .is_some_and(|pin| pin != description.revision)
        {
            return Err(CallFailure::Deployment(PIN_CHANGED));
        }
        choose(description).ok_or(CallFailure::Deployment(UNSUPPORTED))
    }

    /// Observed Run identity or a definite capability refusal invalidates only
    /// later preparation. It cannot change or repeat the original inference.
    pub(crate) fn observe(&self, actual: Option<DeploymentRevision>, unsupported: bool) {
        let mut cache = self.cache.lock().expect("deployment capability cache");
        if actual.is_some_and(|actual| {
            cache
                .revision
                .as_ref()
                .is_none_or(|hint| actual.deployment_revision_id != hint.revision)
        }) {
            cache.stale = true;
            cache.generation = cache.generation.wrapping_add(1);
            cache.retry_at = cache.server_retry_at;
            cache.unavailable = false;
        } else if unsupported {
            cache.stale = true;
            cache.generation = cache.generation.wrapping_add(1);
            if cache.retry_at.is_none_or(|retry| retry <= Instant::now()) {
                cache.retry_after(None, false);
            }
        }
    }
}

enum Current<T> {
    Ready(T),
    Refresh(Option<Arc<Description>>),
}

impl Cache {
    fn current<T>(
        &self,
        choose: &impl Fn(&Description) -> Option<T>,
        pin: DeploymentPin,
    ) -> Result<Current<T>, CallFailure> {
        let waiting = self.retry_at.is_some_and(|retry| retry > Instant::now());
        if waiting && self.unavailable {
            return Err(CallFailure::Deployment(UNAVAILABLE));
        }
        let Some(description) = &self.revision else {
            return Ok(Current::Refresh(None));
        };
        if self.stale && !waiting {
            return Ok(Current::Refresh(None));
        }
        if pin.revision.is_some_and(|pin| pin != description.revision) {
            return Err(CallFailure::Deployment(PIN_CHANGED));
        }
        match choose(description) {
            Some(result) => Ok(Current::Ready(result)),
            None if waiting || pin.revision.is_some() => Err(CallFailure::Deployment(UNSUPPORTED)),
            None => Ok(Current::Refresh(Some(description.clone()))),
        }
    }

    fn retry_after(&mut self, delay: Option<Duration>, unavailable: bool) {
        let now = Instant::now();
        self.server_retry_at = self
            .server_retry_at
            .max(delay.and_then(|delay| now.checked_add(delay)));
        self.retry_at = self.server_retry_at.max(Some(now + RETRY_DELAY));
        self.unavailable = unavailable;
    }
}

async fn stop(cancelled: &mut watch::Receiver<bool>) {
    while !*cancelled.borrow_and_update() && cancelled.changed().await.is_ok() {}
}

pub(crate) struct Preparation<'a> {
    pub(crate) destination: &'a ProviderDestination,
    pub(crate) network: &'a NetworkOwner,
    pub(crate) budget: &'a ByteBudget,
    pub(crate) stopped: &'a watch::Receiver<bool>,
    pub(crate) deadline: Instant,
}

impl Preparation<'_> {
    async fn describe(&self, target: DeploymentSelection) -> Result<Description, DescriptionError> {
        let path = format!(
            "/v1/model-deployments/{}?workspace_id={}",
            target.model_binding.deployment_id, target.workspace_id
        );
        let request = self.destination.observe(&path)?;
        // Wire, response and bounded decoded strings share one operation escrow.
        let operation = self.network.admit(self.deadline, DESCRIPTOR_BYTES * 8)?;
        let response = operation
            .bytes(request, DESCRIPTOR_BYTES, TEMPORARY_TIMEOUT)
            .await?;
        if !response.status().is_success() {
            let retry_after = HttpEvidence::read(response.status().as_u16(), response.headers())
                .retry_after_ms
                .map(Duration::from_millis);
            return Err(DescriptionError {
                failure: CallFailure::Deployment(UNAVAILABLE),
                retry_after,
            });
        }
        let projection = serde_json::from_slice::<Projection>(response.body())
            .ok()
            .filter(|projection| {
                projection.deployment_id == target.model_binding.deployment_id
                    && projection.admission_open
                    && matches!(projection.state, State::Ready | State::Degraded)
                    && projection.ready_replicas != Some(0)
            })
            .and_then(|projection| projection.serving_revision_id.zip(projection.capabilities))
            .filter(|(_, capability)| capability.valid())
            .ok_or(DescriptionError {
                failure: CallFailure::Deployment(UNAVAILABLE),
                retry_after: None,
            })?;
        let (revision, capabilities) = projection;
        let custody = self
            .budget
            .reserve(capabilities.retained_bytes())
            .map_err(|_| NetworkError::Capacity)?;
        Ok(Description {
            revision,
            capabilities,
            _custody: custody,
        })
    }
}

struct DescriptionError {
    failure: CallFailure,
    retry_after: Option<Duration>,
}

impl From<NetworkError> for DescriptionError {
    fn from(value: NetworkError) -> Self {
        let failure = if value == NetworkError::Transfer {
            CallFailure::Deployment(UNAVAILABLE)
        } else {
            value.into()
        };
        Self {
            failure,
            retry_after: None,
        }
    }
}

struct Description {
    revision: Uuid,
    capabilities: Capabilities,
    _custody: ByteReservation,
}

#[derive(Deserialize)]
struct Projection {
    deployment_id: Uuid,
    serving_revision_id: Option<Uuid>,
    state: State,
    admission_open: bool,
    ready_replicas: Option<usize>,
    capabilities: Option<Capabilities>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum State {
    Stopped,
    Starting,
    Ready,
    Degraded,
    Stopping,
    Failed,
    CleanupPending,
}

#[derive(Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum Protocol {
    OpenaiChat,
    Systemone,
}

#[derive(Deserialize)]
struct Capabilities {
    protocol: Protocol,
    input_modalities: Vec<String>,
    chat_completions: bool,
    json_object: bool,
    json_schema: bool,
    streaming: bool,
    schema_keywords: Vec<String>,
    accepted_parameters: Vec<String>,
    schema_dialect: Option<String>,
    context_window_tokens: u64,
    max_output_tokens: usize,
    max_concurrent_requests: u64,
}

impl Capabilities {
    fn text(&self) -> bool {
        self.input_modalities.iter().any(|input| input == "text")
    }

    fn valid(&self) -> bool {
        let token_bound = openlegend_simulation::identity::MAX_SAFE_INTEGER;
        let short_values = |values: &[String], limit| {
            values.len() <= limit && values.iter().all(|value| value.len() <= 128)
        };
        short_values(&self.input_modalities, 32)
            && short_values(&self.schema_keywords, 256)
            && short_values(&self.accepted_parameters, 256)
            && self
                .schema_dialect
                .as_ref()
                .is_none_or(|dialect| dialect.len() <= 256)
            && [
                self.context_window_tokens,
                self.max_output_tokens as u64,
                self.max_concurrent_requests,
            ]
            .into_iter()
            .all(|value| (1..=token_bound).contains(&value))
    }

    fn retained_bytes(&self) -> usize {
        std::mem::size_of::<Description>()
            + [
                &self.input_modalities,
                &self.schema_keywords,
                &self.accepted_parameters,
            ]
            .into_iter()
            .map(|list| {
                list.capacity() * std::mem::size_of::<String>()
                    + list.iter().map(String::capacity).sum::<usize>()
            })
            .sum::<usize>()
            + self.schema_dialect.as_ref().map_or(0, String::capacity)
    }
}

fn dialect(raw: Option<&str>) -> Option<&'static str> {
    let raw = raw?;
    let domain = raw
        .strip_prefix("https://json-schema.org/")
        .or_else(|| raw.strip_prefix("http://json-schema.org/"))
        .unwrap_or(raw);
    let bare = domain.trim_end_matches(['/', '#']);
    let bare = bare.strip_suffix("/schema").unwrap_or(bare);
    let bare = bare
        .strip_prefix("draft")
        .unwrap_or(bare)
        .trim_start_matches(['-', '/']);
    match bare {
        "07" | "7" => Some("07"),
        "2019-09" => Some("2019-09"),
        "2020-12" => Some("2020-12"),
        _ => None,
    }
}

fn schema_supported(schema: &Value, keywords: &[String], offered_dialect: Option<&str>) -> bool {
    if let Some((requested, offered)) =
        dialect(schema["$schema"].as_str()).zip(dialect(offered_dialect))
        && requested != offered
    {
        return false;
    }
    schemas_supported(schema, keywords)
}

fn schemas_supported(value: &Value, keywords: &[String]) -> bool {
    match value {
        Value::Array(children) => children
            .iter()
            .all(|child| schemas_supported(child, keywords)),
        Value::Object(fields) => fields.iter().all(|(keyword, child)| {
            keywords.contains(keyword)
                && match keyword.as_str() {
                    "properties" | "patternProperties" | "$defs" | "definitions"
                    | "dependencies" | "dependentSchemas" => {
                        child.as_object().is_none_or(|entries| {
                            entries
                                .values()
                                .all(|schema| schemas_supported(schema, keywords))
                        })
                    }
                    "items"
                    | "contains"
                    | "additionalProperties"
                    | "propertyNames"
                    | "not"
                    | "if"
                    | "then"
                    | "else"
                    | "unevaluatedProperties"
                    | "unevaluatedItems"
                    | "allOf"
                    | "anyOf"
                    | "oneOf"
                    | "prefixItems" => schemas_supported(child, keywords),
                    _ => true,
                }
        }),
        _ => true,
    }
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentRevision {
    pub(crate) deployment_id: Uuid,
    pub(crate) deployment_revision_id: Uuid,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentAttribution {
    basis: &'static str,
    deployment_id: Uuid,
    infrastructure_cost_included: bool,
}

impl DeploymentAttribution {
    pub(crate) fn new(deployment_id: Uuid) -> Self {
        Self {
            basis: "deployment",
            deployment_id,
            infrastructure_cost_included: false,
        }
    }
}

/// Optional exact provider facts carried by the existing model receipt, never
/// interpreted as world permissions or per-request provider hosting cost.
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ModelExecutionProof {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) shared_execution: Option<super::worker::Reference>,
    #[serde(skip)]
    pub(crate) shared_dispatched: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) macrofold_run: Option<super::usage::MacrofoldRun>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) macrofold_requested_deployment: Option<DeploymentSelection>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) macrofold_deployment: Option<DeploymentRevision>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) macrofold_cost_attribution: Option<DeploymentAttribution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) native_latency_ms: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) native_truncated: Option<bool>,
}
