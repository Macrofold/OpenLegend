//! Seed accepted files, then read one verified export from the actor's private
//! Worktree. This staging area cannot itself mutate the accepted world.

use super::super::super::{
    Director, decide::prepare::reflection::PreparedReflection, settings::ReflectionModel,
};
use crate::{
    decision_dispatch::CallFailure,
    network::{NetworkError, NetworkOperation},
    provider_transport::{
        PreparedProviderRequest,
        workspace::{self, FileListing, OwnedWorkspaceReply, WorkspaceIdentity, WorkspaceRead},
    },
    store::{
        StoreError,
        reflection::{PendingFileOperation, ReflectionScope, WorkspaceBinding},
    },
    world::WorldError,
};
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound, sha256_hex},
    host::ByteReservation,
    records::SqlCell,
};
use serde::{Deserialize, de::DeserializeOwned};
use serde_json::json;
use std::{sync::Arc, time::Duration};
use tokio::{sync::watch, time::Instant};

pub(super) struct Worktree<'a> {
    pub(super) director: &'a Director,
    pub(super) model: &'a ReflectionModel,
    pub(super) prepared: &'a PreparedReflection,
    pub(super) scope: Arc<ReflectionScope>,
    pub(super) cancellation: &'a watch::Receiver<bool>,
    pub(super) network: &'a NetworkOperation<'a>,
}

#[derive(Deserialize)]
struct FileOperation {
    id: String,
}

pub(super) struct SeededWorktree {
    pub(super) id: String,
    _custody: ByteReservation,
}

#[derive(Deserialize)]
struct OperationState {
    status: String,
}

impl Worktree<'_> {
    pub(super) fn running(&self) -> Result<(), CallFailure> {
        if *self.cancellation.borrow() {
            return Err(CallFailure::Cancelled);
        }
        if Instant::now() >= self.network.deadline() {
            return Err(NetworkError::Deadline.into());
        }
        Ok(())
    }

    /// The bounded response owner stays private. A file-dependent request
    /// repeats native consent after any await and at its real transfer start.
    pub(super) async fn request(
        &self,
        request: PreparedProviderRequest,
        file: bool,
        private_revision: Option<u64>,
    ) -> Result<OwnedWorkspaceReply, CallFailure> {
        self.running()?;
        let turn = if private_revision.is_some() {
            Some(
                self.director
                    .game
                    .world
                    .npc_disclosure_turn()
                    .await
                    .map_err(CallFailure::World)?,
            )
        } else {
            None
        };
        workspace::exchange(
            request,
            self.network,
            self.director.game.host.budget(),
            file,
            |start| {
                self.running()?;
                if let Some(turn) = turn {
                    super::start_private(turn, &self.prepared.ticket, private_revision, start)
                } else {
                    start();
                    Ok(())
                }
            },
        )
        .await
    }

    pub(super) fn decode<T: DeserializeOwned>(
        &self,
        reply: &OwnedWorkspaceReply,
    ) -> Result<(T, openlegend_simulation::host::ByteReservation), CallFailure> {
        if !(200..300).contains(&reply.status) {
            return Err(CallFailure::Refused(reply.status));
        }
        let source = std::str::from_utf8(&reply.bytes).map_err(|_| CallFailure::Invalid)?;
        let bytes = json_tree_allocation_bound(source).ok_or(CallFailure::Invalid)?;
        let storage = self
            .director
            .game
            .host
            .budget()
            .reserve(bytes)
            .map_err(|_| CallFailure::Admission)?;
        let body = serde_json::from_str(source).map_err(|_| CallFailure::Invalid)?;
        Ok((body, storage))
    }

    pub(super) async fn seed(&self) -> Result<SeededWorktree, CallFailure> {
        let store = &self.director.game.store;
        let budget = self.director.game.host.budget();
        let mut metadata = budget
            .reserve(64 * 1024)
            .map_err(|_| CallFailure::Admission)?;
        let current = store
            .reflection_workspace(self.scope.clone())
            .await
            .map_err(|error| CallFailure::World(WorldError::Storage(error)))?;
        let mut binding = if let Some(binding) = current.current {
            binding
        } else {
            let operation = label(&[
                self.model.destination.workspace_scope(),
                &self.scope.world,
                &self.scope.actor,
            ])?;
            let name = format!("Open Legend private mind {}", &operation[..20]);
            let provision = json!({"name":name,"persistence":"persistent","permissions":self.director.game.cognition.reflection.permissions});
            let reply = self
                .request(
                    self.model
                        .destination
                        .workspace_provision(&provision, &operation, budget)?,
                    false,
                    None,
                )
                .await?;
            let (created, _response): (WorkspaceIdentity, _) = self.decode(&reply)?;
            let binding = WorkspaceBinding {
                workspace: created.id,
                worktree: created.default_worktree_id,
                pending_file_operation: None,
            };
            self.write(None, &binding).await?;
            binding
        };
        match binding.pending_file_operation.clone() {
            Some(PendingFileOperation::Accepted { id }) => {
                self.wait_file_operation(&id).await?;
                self.clear_pending(&mut binding).await?;
            }
            Some(PendingFileOperation::Starting) => {
                return Err(CallFailure::Stale(
                    "reflection-workspace-operation-unresolved",
                ));
            }
            None => (),
        }
        let listing = self.list(&binding.worktree).await?;
        let mut revision = listing.0.revision.clone();
        for file in &listing.0.entries {
            let supplied = file
                .path
                .strip_prefix("mind/")
                .and_then(|path| path.strip_suffix(".md"));
            if !self
                .prepared
                .files
                .files
                .iter()
                .any(|file| Some(file.id.as_str()) == supplied)
            {
                self.edit(&mut binding, &file.path, &revision, None).await?;
                revision = self.list(&binding.worktree).await?.0.revision;
            }
        }
        for file in &self.prepared.files.files {
            let path = format!("mind/{}.md", file.id);
            let text = file.text.as_unicode().ok_or(CallFailure::Invalid)?;
            self.edit(&mut binding, &path, &revision, Some(text))
                .await?;
            revision = self.list(&binding.worktree).await?.0.revision;
        }
        let id = binding.worktree;
        metadata
            .resize(std::mem::size_of::<SeededWorktree>() + id.capacity())
            .map_err(|_| CallFailure::Admission)?;
        Ok(SeededWorktree {
            id,
            _custody: metadata,
        })
    }

    async fn list(
        &self,
        worktree: &str,
    ) -> Result<(FileListing, openlegend_simulation::host::ByteReservation), CallFailure> {
        let budget = self.director.game.host.budget();
        let reply = self
            .request(
                self.model.destination.list_mind_files(worktree, budget)?,
                false,
                None,
            )
            .await?;
        let listing = self.decode::<FileListing>(&reply)?;
        listing.0.validate()?;
        Ok(listing)
    }

    async fn edit(
        &self,
        binding: &mut WorkspaceBinding,
        path: &str,
        revision: &str,
        text: Option<&str>,
    ) -> Result<(), CallFailure> {
        let budget = self.director.game.host.budget();
        let content = text.map(|text| sha256_hex(text.as_bytes()));
        let operation = label(&[
            &self.scope.attempt,
            &binding.worktree,
            path,
            revision,
            content.as_deref().unwrap_or("remove"),
        ])?;
        let request = self.model.destination.edit_mind_file(
            &binding.worktree,
            path,
            revision,
            &operation,
            text,
            budget,
        )?;
        let prior = json_record(binding).map_err(|_| CallFailure::Invalid)?;
        binding.pending_file_operation = Some(PendingFileOperation::Starting);
        self.write(Some(prior), binding).await?;
        let result = self
            .request(request, true, Some(self.prepared.files.revision))
            .await;
        let reply = match result {
            Ok(reply) => reply,
            Err(error @ (CallFailure::Stale(_) | CallFailure::Cancelled)) => {
                // These refusals precede the actual first poll. No remote file
                // operation can retain this private input.
                self.clear_pending(binding).await?;
                return Err(error);
            }
            Err(error) => return Err(error),
        };
        if (400..500).contains(&reply.status) {
            self.clear_pending(binding).await?;
            return Err(CallFailure::Refused(reply.status));
        }
        let (accepted, _storage): (FileOperation, _) = self.decode(&reply)?;
        if accepted.id.is_empty() || accepted.id.len() > 256 {
            return Err(CallFailure::Invalid);
        }
        let prior = json_record(binding).map_err(|_| CallFailure::Invalid)?;
        binding.pending_file_operation = Some(PendingFileOperation::Accepted {
            id: accepted.id.clone(),
        });
        self.write(Some(prior), binding).await?;
        let succeeded = self.wait_file_operation(&accepted.id).await?;
        self.clear_pending(binding).await?;
        if !succeeded {
            return Err(CallFailure::Invalid);
        }
        Ok(())
    }

    async fn wait_file_operation(&self, id: &str) -> Result<bool, CallFailure> {
        let budget = self.director.game.host.budget();
        loop {
            let request = self
                .model
                .destination
                .workspace_metadata(WorkspaceRead::FileOperation(id), budget)?;
            let reply = self.request(request, false, None).await?;
            if reply.status == 429 {
                super::wait(
                    self,
                    Duration::from_millis(reply.retry_after_ms.unwrap_or(60_000).max(1000)),
                )
                .await?;
                continue;
            }
            let (completed, _storage): (OperationState, _) = self.decode(&reply)?;
            match completed.status.as_str() {
                "succeeded" => return Ok(true),
                "failed" => return Ok(false),
                "pending" | "queued" | "running" => {
                    super::wait(self, Duration::from_millis(300)).await?;
                }
                _ => return Err(CallFailure::Invalid),
            }
        }
    }

    async fn clear_pending(&self, binding: &mut WorkspaceBinding) -> Result<(), CallFailure> {
        let prior = json_record(binding).map_err(|_| CallFailure::Invalid)?;
        binding.pending_file_operation = None;
        self.write(Some(prior), binding).await
    }

    async fn write(
        &self,
        previous: Option<String>,
        next: &WorkspaceBinding,
    ) -> Result<(), CallFailure> {
        let next = json_record(next).map_err(|_| CallFailure::Invalid)?;
        self.director
            .game
            .store
            .write_reflection_workspace(self.scope.clone(), previous, next)
            .await
            .map_err(CallFailure::Commit)
    }

    pub(super) async fn export(
        &self,
        worktree: &str,
        storage: &mut openlegend_simulation::host::ByteReservation,
    ) -> Result<(String, SqlCell), CallFailure> {
        let budget = self.director.game.host.budget();
        let (listing, _metadata) = self.list(worktree).await?;
        let mut files = Vec::with_capacity(listing.entries.len());
        for entry in &listing.entries {
            if entry.size_bytes > 8_000 {
                return Err(CallFailure::Invalid);
            }
            let reply = self
                .request(
                    self.model
                        .destination
                        .read_mind_file(worktree, &entry.path, budget)?,
                    true,
                    Some(self.prepared.files.revision),
                )
                .await?;
            if reply.status != 200
                || reply
                    .revision
                    .as_ref()
                    .is_some_and(|revision| revision != &listing.revision)
            {
                return Err(CallFailure::Stale("reflection-worktree-export-changed"));
            }
            let text = String::from_utf8(reply.bytes).map_err(|_| CallFailure::Invalid)?;
            let path = entry
                .path
                .strip_prefix("mind/")
                .ok_or(CallFailure::Invalid)?;
            storage
                .resize(storage.bytes() + entry.path.len() + 512)
                .map_err(|_| CallFailure::Admission)?;
            storage
                .merge(reply.storage)
                .map_err(|_| CallFailure::Admission)?;
            files.push(SqlCell::Object(
                [("path".into(), path.into()), ("text".into(), text.into())]
                    .into_iter()
                    .collect(),
            ));
        }
        if self.list(worktree).await?.0.revision != listing.revision {
            return Err(CallFailure::Stale("reflection-worktree-export-changed"));
        }
        Ok((listing.revision, SqlCell::Array(files)))
    }
}

fn label(parts: &[&str]) -> Result<String, CallFailure> {
    json_record(parts)
        .map(|body| sha256_hex(body.as_bytes()))
        .map_err(|_| CallFailure::World(WorldError::Storage(StoreError::InvalidRecord)))
}
