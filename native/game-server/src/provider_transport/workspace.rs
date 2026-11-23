//! Scoped Macrofold Worktree transfer. The caller supplies currentness to
//! every private write and owns admission, paid attempts and world effects.

use super::{PreparedProviderRequest, ProviderDestination, ProviderRoute, valid_reference};
use crate::network::{NetworkError, NetworkOperation};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use reqwest::{Method, Url, header};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

const FILE_REPLY_BYTES: usize = 16_000;
const METADATA_REPLY_BYTES: usize = 64_000;

#[derive(Clone, Copy)]
pub(crate) enum WorkspaceRead<'a> {
    FileOperation(&'a str),
    Run(&'a str),
    RunResult(&'a str),
    RunEvents(&'a str, u64),
    RunUsage {
        id: &'a str,
        from: &'a str,
        to: &'a str,
    },
    Models,
}

#[derive(Deserialize)]
pub(crate) struct WorkspaceIdentity {
    pub id: String,
    pub default_worktree_id: String,
}

#[derive(Deserialize)]
pub(crate) struct FileListing {
    pub revision: String,
    pub entries: Vec<FileEntry>,
    next_cursor: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct FileEntry {
    pub path: String,
    #[serde(rename = "type")]
    kind: String,
    pub size_bytes: usize,
}

impl FileListing {
    /// The actor Worktree must contain only one complete page of safe files.
    pub(crate) fn validate(&self) -> Result<(), NetworkError> {
        if self.next_cursor.is_some()
            || self.entries.len() > 20
            || !valid_revision(&self.revision)
            || self.entries.iter().enumerate().any(|(index, file)| {
                file.kind != "file"
                    || !mind_path(&file.path)
                    || self.entries[..index]
                        .iter()
                        .any(|prior| prior.path == file.path)
            })
        {
            return Err(NetworkError::Transfer);
        }
        Ok(())
    }
}

fn valid_revision(revision: &str) -> bool {
    !revision.is_empty() && revision.len() <= 256 && header::HeaderValue::from_str(revision).is_ok()
}

pub(crate) fn mind_path(path: &str) -> bool {
    let Some(id) = path
        .strip_prefix("mind/")
        .and_then(|name| name.strip_suffix(".md"))
    else {
        return false;
    };
    !id.is_empty()
        && id.chars().count() <= 64
        && id
            .chars()
            .all(|character| character.is_alphanumeric() || matches!(character, '_' | ' ' | '-'))
}

pub(crate) struct OwnedWorkspaceReply {
    pub status: u16,
    pub retry_after_ms: Option<u64>,
    pub revision: Option<String>,
    pub bytes: Vec<u8>,
    pub storage: ByteReservation,
}

/// The existing network operation bounds body transfer and deadline. Fund
/// the retained reply independently from the captured private request text.
pub(crate) async fn exchange<E: From<NetworkError>>(
    prepared: PreparedProviderRequest,
    operation: &NetworkOperation<'_>,
    budget: &ByteBudget,
    file: bool,
    start: impl FnOnce(&mut dyn FnMut()) -> Result<(), E>,
) -> Result<OwnedWorkspaceReply, E> {
    let PreparedProviderRequest { request, _body, .. } = prepared;
    let maximum = if file {
        FILE_REPLY_BYTES
    } else {
        METADATA_REPLY_BYTES
    };
    let mut storage = budget
        .reserve(maximum * 2 + 512)
        .map_err(|_| NetworkError::Capacity)?;
    let remaining = operation
        .deadline()
        .saturating_duration_since(tokio::time::Instant::now());
    let mut response = operation
        .response(request, maximum, remaining, start)
        .await?;
    let status = response.status().as_u16();
    let retry_after_ms = response
        .headers()
        .get(header::RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .and_then(super::retry_after);
    let revision = response
        .headers()
        .get(header::ETAG)
        .map(|value| value.to_str().map_err(|_| NetworkError::Transfer))
        .transpose()?
        .map(|value| value.trim_matches('"'))
        .map(|value| {
            if valid_revision(value) {
                Ok(value.to_owned())
            } else {
                Err(NetworkError::Transfer)
            }
        })
        .transpose()?;
    let mut bytes = Vec::new();
    while let Some(chunk) = response.next().await? {
        bytes
            .try_reserve(chunk.len())
            .map_err(|_| NetworkError::Capacity)?;
        bytes.extend_from_slice(&chunk);
    }
    storage
        .resize(bytes.capacity() + revision.as_ref().map_or(0, String::capacity))
        .map_err(|_| NetworkError::Capacity)?;
    Ok(OwnedWorkspaceReply {
        status,
        retry_after_ms,
        revision,
        bytes,
        storage,
    })
}

impl ProviderDestination {
    pub(crate) fn workspace_scope(&self) -> &str {
        self.url.as_str()
    }

    fn workspace_endpoint(&self, path: &[&str]) -> Result<Url, NetworkError> {
        if self.route != ProviderRoute::Macrofold {
            return Err(NetworkError::Destination);
        }
        let mut url = self.url.clone();
        url.set_query(None);
        url.path_segments_mut()
            .map_err(|_| NetworkError::Destination)?
            .clear()
            .extend(path);
        Ok(url)
    }

    pub(crate) fn workspace_metadata(
        &self,
        read: WorkspaceRead<'_>,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let checked = |id| {
            if valid_reference(id, 256) {
                Ok(id)
            } else {
                Err(NetworkError::Destination)
            }
        };
        let url = match read {
            WorkspaceRead::FileOperation(id) => {
                self.workspace_endpoint(&["v1", "operations", checked(id)?])?
            }
            WorkspaceRead::Run(id) => self.workspace_endpoint(&["v1", "runs", checked(id)?])?,
            WorkspaceRead::RunResult(id) => {
                self.workspace_endpoint(&["v1", "runs", checked(id)?, "result"])?
            }
            WorkspaceRead::RunEvents(id, after) => {
                let mut url = self.workspace_endpoint(&["v1", "runs", checked(id)?, "events"])?;
                url.query_pairs_mut()
                    .append_pair("after", &after.to_string())
                    .append_pair("limit", "100");
                url
            }
            WorkspaceRead::Models => {
                let mut url = self.workspace_endpoint(&["v1", "models"])?;
                url.query_pairs_mut().append_pair("limit", "100");
                url
            }
            WorkspaceRead::RunUsage { id, from, to } => {
                let mut url = self.workspace_endpoint(&["v1", "billing", "usage"])?;
                url.query_pairs_mut()
                    .append_pair("run_id", checked(id)?)
                    .append_pair("from", from)
                    .append_pair("to", to)
                    .append_pair("limit", "100");
                url
            }
        };
        self.workspace_body(Method::GET, url, None, None, None, budget)
    }

    pub(crate) fn workspace_provision(
        &self,
        body: &impl Serialize,
        operation_id: &str,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        self.post(
            self.workspace_endpoint(&["v1", "workspaces"])?,
            body,
            Some(operation_id),
            budget,
        )
    }

    pub(crate) fn list_mind_files(
        &self,
        worktree: &str,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        if !valid_reference(worktree, 256) {
            return Err(NetworkError::Destination);
        }
        let mut url = self.workspace_endpoint(&["v1", "worktrees", worktree, "files"])?;
        url.query_pairs_mut()
            .append_pair("path", "mind")
            .append_pair("limit", "20");
        self.workspace_body(Method::GET, url, None, None, None, budget)
    }

    pub(crate) fn read_mind_file(
        &self,
        worktree: &str,
        path: &str,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let url = self.mind_file_url(worktree, path)?;
        self.workspace_body(Method::GET, url, None, None, None, budget)
    }

    pub(crate) fn edit_mind_file(
        &self,
        worktree: &str,
        path: &str,
        revision: &str,
        operation: &str,
        text: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let url = self.mind_file_url(worktree, path)?;
        let method = if text.is_some() {
            Method::PUT
        } else {
            Method::DELETE
        };
        self.workspace_body(method, url, text, Some(revision), Some(operation), budget)
    }

    pub(crate) fn workspace_run(
        &self,
        body: &impl Serialize,
        operation_id: &str,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        self.post(
            self.workspace_endpoint(&["v1", "runs"])?,
            body,
            Some(operation_id),
            budget,
        )
    }

    fn mind_file_url(&self, worktree: &str, path: &str) -> Result<Url, NetworkError> {
        if !valid_reference(worktree, 256) || !mind_path(path) {
            return Err(NetworkError::Destination);
        }
        let mut url = self.workspace_endpoint(&["v1", "worktrees", worktree, "file"])?;
        url.query_pairs_mut().append_pair("path", path);
        Ok(url)
    }

    fn workspace_body(
        &self,
        method: Method,
        url: Url,
        text: Option<&str>,
        revision: Option<&str>,
        operation: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<PreparedProviderRequest, NetworkError> {
        let size = text.map_or(0, str::len);
        if size > FILE_REPLY_BYTES {
            return Err(NetworkError::Capacity);
        }
        let storage = budget
            .reserve(size + 2048)
            .map_err(|_| NetworkError::Capacity)?;
        let mut request = self.request(method, url);
        if let Some(revision) = revision {
            request.headers_mut().insert(
                header::IF_MATCH,
                header::HeaderValue::from_str(revision).map_err(|_| NetworkError::Destination)?,
            );
        }
        if let Some(operation) = operation {
            request.headers_mut().insert(
                "idempotency-key",
                header::HeaderValue::from_str(operation).map_err(|_| NetworkError::Destination)?,
            );
        }
        if let Some(text) = text {
            request.headers_mut().insert(
                header::CONTENT_TYPE,
                header::HeaderValue::from_static("application/octet-stream"),
            );
            *request.body_mut() = Some(text.to_owned().into());
        }
        let digest = Sha256::digest(text.unwrap_or("").as_bytes()).into();
        Ok(PreparedProviderRequest {
            route: ProviderRoute::Macrofold,
            request,
            digest,
            _body: storage,
            observation: Some(self.clone()),
            deployment: None,
        })
    }
}
