//! The managed supervisor supplies one private job capability. The remote
//! execution service owns funding, lane selection, provider keys and settlement.
use super::{
    NetworkError, PreparedProviderRequest, ProviderDestination, ProviderRoute, Url, header,
};
use openlegend_simulation::{encoding::sha256_hex, host::ByteBudget};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs::File,
    io::Read,
    path::Path,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Grant {
    url: String,
    id: String,
    token: String,
    campaign_id: String,
    job_id: String,
    case_id: String,
    source_hash: String,
    deadline_ms: u64,
    pub(crate) lanes: Vec<Lane>,
    #[serde(skip)]
    namespace: String,
}
#[derive(Clone, Deserialize)]
pub(crate) struct Lane {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) model: String,
    pub(crate) provider: String,
}
#[derive(Clone, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Reference {
    pub(crate) grant_id: String,
    pub(crate) attempt_id: String,
    campaign_id: String,
    job_id: String,
    case_id: String,
    source_hash: String,
}
#[derive(Clone)]
pub(crate) struct Binding {
    pub(crate) grant: Arc<Grant>,
    pub(crate) lane: Lane,
}
#[derive(Clone)]
pub(crate) struct ReceiptBinding {
    pub(crate) reference: Reference,
    pub(crate) lane: Lane,
    grant: Arc<Grant>,
}
type Error = Box<dyn std::error::Error + Send + Sync>;

impl Grant {
    /// Read only the supervisor's small job capability at Lab bootstrap. The
    /// token remains inside sensitive request headers and never enters a capture.
    pub(crate) fn read(path: &Path, namespace: &str) -> Result<Arc<Self>, Error> {
        let mut bytes = Vec::new();
        File::open(path)?.take(65537).read_to_end(&mut bytes)?;
        if bytes.len() > 65536 {
            return Err("Worker grant exceeds its control-file limit".into());
        }
        let mut grant: Self = serde_json::from_slice(&bytes)?;
        let url = Url::parse(&grant.url)?;
        let safe = |s: &str| {
            !s.is_empty()
                && s.len() <= 160
                && s.bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"._-:".contains(&b))
        };
        if !crate::network::permitted_destination(&url, false)
            || url.path() != "/"
            || url.query().is_some()
            || url.fragment().is_some()
            || ![&grant.id, &grant.job_id, &grant.case_id, &grant.campaign_id]
                .iter()
                .all(|v| safe(v))
            || grant.token.is_empty()
            || grant.source_hash.len() != 64
            || !grant.source_hash.bytes().all(|c| c.is_ascii_hexdigit())
            || grant.lanes.is_empty()
            || grant.lanes.len() > 32
            || !grant.lanes.iter().all(|l| {
                safe(&l.id)
                    && !l.model.is_empty()
                    && l.model.len() <= 240
                    && ["jev", "openai", "macrofold"].contains(&l.provider.as_str())
            })
        {
            return Err("Worker grant origin or binding is invalid".into());
        }
        grant.namespace = namespace.to_owned();
        Ok(Arc::new(grant))
    }
    pub(crate) fn destination(self: &Arc<Self>, lane: &Lane) -> Result<ProviderDestination, Error> {
        let route = match lane.kind.as_str() {
            "judge" => ProviderRoute::WorkerJudge,
            "generate" => ProviderRoute::WorkerGenerate,
            _ => return Err("Unsupported Lab inference lane".into()),
        };
        let mut url = Url::parse(&self.url)?;
        url.path_segments_mut()
            .map_err(|_| "Invalid execution origin")?
            .clear()
            .extend(["grants", &self.id, "execute"]);
        let mut authorization = header::HeaderValue::from_str(&format!("Bearer {}", self.token))?;
        authorization.set_sensitive(true);
        Ok(ProviderDestination {
            route,
            url,
            authorization: Some(authorization),
            worker: Some(Binding {
                grant: self.clone(),
                lane: lane.clone(),
            }),
        })
    }
}
impl ProviderDestination {
    pub(crate) fn same_worker_grant(&self, prior: Option<&Reference>) -> bool {
        match (&self.worker, prior) {
            (None, None) => true,
            (Some(binding), Some(reference)) => {
                reference.grant_id == binding.grant.id
                    && reference.source_hash == binding.grant.source_hash
                    && reference.case_id == binding.grant.case_id
                    && reference.job_id == binding.grant.job_id
                    && reference.campaign_id == binding.grant.campaign_id
            }
            _ => false,
        }
    }
    pub(crate) fn worker_comparison(
        &self,
        body: &mut Value,
        new_id: &str,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let binding = self.worker.as_ref().ok_or(NetworkError::Destination)?;
        if body["lane"] != binding.lane.id
            || body["caseId"] != binding.grant.case_id
            || body["sourceHash"] != binding.grant.source_hash
        {
            return Err(NetworkError::Destination);
        }
        let input = body
            .get_mut("request")
            .and_then(Value::as_object_mut)
            .ok_or(NetworkError::Transfer)?;
        if input.remove("requestId").is_none() {
            return Err(NetworkError::Transfer);
        }
        input.remove("deadlineMs");
        self.worker_request(new_id, input, budget)
    }
    pub(crate) fn worker_request(
        &self,
        native_id: &str,
        input: &impl Serialize,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let binding = self.worker.as_ref().ok_or(NetworkError::Destination)?;
        let grant = &binding.grant;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| NetworkError::Deadline)?
            .as_millis();
        if now >= u128::from(grant.deadline_ms) {
            return Err(NetworkError::Deadline);
        }
        let request_id = sha256_hex(
            &serde_json::to_vec(&[grant.namespace.as_str(), native_id])
                .map_err(|_| NetworkError::Transfer)?,
        );
        let attempt_id = sha256_hex(
            &serde_json::to_vec(&[&grant.id, &grant.case_id, &request_id])
                .map_err(|_| NetworkError::Transfer)?,
        );
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Input<'a, T> {
            request_id: &'a str,
            deadline_ms: u64,
            #[serde(flatten)]
            input: &'a T,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Envelope<'a, T> {
            lane: &'a str,
            case_id: &'a str,
            source_hash: &'a str,
            request: T,
        }
        let mut call = self.post(
            self.url.clone(),
            &Envelope {
                lane: &binding.lane.id,
                case_id: &grant.case_id,
                source_hash: &grant.source_hash,
                request: Input {
                    request_id: &request_id,
                    deadline_ms: grant.deadline_ms,
                    input,
                },
            },
            None,
            budget,
        )?;
        call.worker = Some(ReceiptBinding {
            grant: grant.clone(),
            reference: Reference {
                grant_id: grant.id.clone(),
                campaign_id: grant.campaign_id.clone(),
                job_id: grant.job_id.clone(),
                case_id: grant.case_id.clone(),
                source_hash: grant.source_hash.clone(),
                attempt_id,
            },
            lane: binding.lane.clone(),
        });
        Ok(call)
    }
}
impl ReceiptBinding {
    /// Cancel the already funded operation by its original grant/case hash.
    /// This endpoint cannot create a request or transfer provider credentials.
    pub(crate) fn cancel(
        &self,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let dest = self
            .grant
            .destination(&self.lane)
            .map_err(|_| NetworkError::Destination)?;
        let mut url = dest.url.clone();
        url.path_segments_mut()
            .map_err(|_| NetworkError::Destination)?
            .clear()
            .extend([
                "grants",
                &self.reference.grant_id,
                "attempts",
                &self.reference.attempt_id,
                "cancel",
            ]);
        dest.post(url, &serde_json::Map::<String, Value>::new(), None, budget)
    }
    pub(crate) fn matches(&self, receipt: &Value) -> bool {
        receipt["requestId"].as_str() == Some(&self.reference.attempt_id)
            && receipt["provider"].as_str() == Some(&self.lane.provider)
            && receipt["requestedModel"].as_str() == Some(&self.lane.model)
            && serde_json::from_value::<Reference>(receipt["sharedExecution"].clone())
                .is_ok_and(|r| r == self.reference)
    }
}
