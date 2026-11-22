//! An opening is immutable release data prepared by the world-owned builder.
//! Its rows use the current checkpoint format and the same bounded reader.

use super::contracts::{CANDIDATE_BYTES, valid_hash, valid_id};
use super::{CreationError, OpeningValidator};
use crate::store::{DurableHead, Store, StoreError, creation::FirstInstallation};
use openlegend_simulation::{encoding::sha256_hex, host::ByteReservation};
use serde::Deserialize;
use serde_json::value::RawValue;
use std::{fs::File, io::Read, path::PathBuf, sync::Arc};
use uuid::Uuid;

const MANIFEST_BYTES: usize = 128 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReviewedOpening {
    candidate: Box<RawValue>,
    candidate_digest: String,
    compiled_world_digest: String,
    checkpoint_sha256: String,
    slot_id: Uuid,
    world_id: String,
    actor_id: String,
    control_account_id: String,
    findings: Vec<String>,
}

pub(super) struct Bundle {
    reviewed: ReviewedOpening,
    directory: PathBuf,
    _custody: ByteReservation,
}

impl Bundle {
    pub(super) fn open(
        store: &Store,
        path: PathBuf,
        expected_sha256: &str,
    ) -> Result<Self, CreationError> {
        let hold = store
            .creation_budget()
            .reserve(8 * MANIFEST_BYTES)
            .map_err(|_| StoreError::Capacity)?;
        let mut bytes = Vec::new();
        let file = File::open(&path).map_err(|_| CreationError::InvalidCandidate)?;
        file.take((MANIFEST_BYTES + 1) as u64)
            .read_to_end(&mut bytes)
            .map_err(|_| CreationError::InvalidCandidate)?;
        if bytes.len() > MANIFEST_BYTES
            || !valid_hash(expected_sha256)
            || sha256_hex(&bytes) != expected_sha256
        {
            return Err(CreationError::InvalidCandidate);
        }
        let reviewed: ReviewedOpening =
            serde_json::from_slice(&bytes).map_err(|_| CreationError::InvalidCandidate)?;
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct CandidateId<'a> {
            world_id: &'a str,
        }
        let candidate = serde_json::from_str::<CandidateId<'_>>(reviewed.candidate.get())
            .map_err(|_| CreationError::InvalidCandidate)?;
        if !valid_id(&reviewed.world_id)
            || !valid_id(&reviewed.actor_id)
            || !valid_id(&reviewed.control_account_id)
            || !valid_hash(&reviewed.candidate_digest)
            || !valid_hash(&reviewed.compiled_world_digest)
            || !valid_hash(&reviewed.checkpoint_sha256)
            || candidate.world_id != reviewed.world_id
            || reviewed.candidate.get().len() > CANDIDATE_BYTES
            || sha256_hex(reviewed.candidate.get().as_bytes()) != reviewed.candidate_digest
            || reviewed.findings.len() > 256
            || reviewed
                .findings
                .iter()
                .any(|finding| finding.encode_utf16().count() > 2000)
        {
            return Err(CreationError::InvalidCandidate);
        }
        Ok(Self {
            reviewed,
            directory: path
                .parent()
                .ok_or(CreationError::InvalidCandidate)?
                .join("opening-records"),
            _custody: hold,
        })
    }

    pub(super) fn review(
        &self,
        candidate: &RawValue,
        candidate_digest: &str,
        account: &str,
    ) -> Result<(), CreationError> {
        if candidate.get() != self.reviewed.candidate.get()
            || candidate_digest != self.reviewed.candidate_digest
        {
            return Err(CreationError::InvalidCandidate);
        }
        if account != self.reviewed.control_account_id {
            return Err(CreationError::Forbidden);
        }
        Ok(())
    }

    pub(super) fn world(&self) -> &str {
        &self.reviewed.world_id
    }

    pub(super) fn actor(&self) -> &str {
        &self.reviewed.actor_id
    }

    pub(super) fn compiled_digest(&self) -> &str {
        &self.reviewed.compiled_world_digest
    }

    pub(super) fn findings(&self) -> &[String] {
        &self.reviewed.findings
    }

    pub(super) async fn prepare(
        &self,
        store: &Arc<Store>,
    ) -> Result<FirstInstallation, CreationError> {
        let checkpoint = store
            .retained_checkpoint(
                self.directory.clone(),
                self.reviewed.slot_id.to_string(),
                self.reviewed.world_id.clone(),
            )
            .await?;
        if checkpoint.revision != 1
            || checkpoint.sim_time != 0.0
            || checkpoint.checksum != self.reviewed.checkpoint_sha256
        {
            return Err(CreationError::InvalidCandidate);
        }
        let head = DurableHead {
            world_id: self.reviewed.world_id.clone(),
            generation: Uuid::new_v4().to_string(),
            revision: 1,
        };
        let (opening, history) = checkpoint.into_opening(store, head.clone())?;
        Ok(FirstInstallation {
            opening,
            history,
            head,
        })
    }

    pub(super) async fn validate(
        &self,
        store: Arc<Store>,
        account: String,
        validate: OpeningValidator,
    ) -> Result<(), CreationError> {
        let FirstInstallation { opening, .. } = self.prepare(&store).await?;
        validate(opening, account, self.reviewed.actor_id.clone()).await?;
        Ok(())
    }
}
