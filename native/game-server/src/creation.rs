//! Operator-configured, exact reviewed creation on an awaiting destination.
//! The activation cell is SQL's one writer boundary. HTTP never receives
//! database settings, service keys to forward, or a writable world.

mod bundle;
mod contracts;
mod routes;

pub(crate) use contracts::{
    ActivationIdentity, ActivationReceipt, DestinationConfig, InitialAccount, millis,
};

use crate::{
    authority::Capability,
    store::{
        CommitError, CurrentOpening, Store, StoreError, StoreResult,
        creation::{ActivationWrite, ActivationWriteInput, Registration, retained_files},
    },
};
use bundle::Bundle;
use contracts::{Check, MAX_ORDINAL, START_MILLIS, Start, valid_hash, valid_key};
use openlegend_simulation::{encoding::sha256_hex, runtime::NativeWorldSession};
use ring::hmac;
use serde::Serialize;
use serde_json::{Value, value::RawValue};
use std::{collections::BTreeMap, future::Future, path::PathBuf, pin::Pin, sync::Arc};

pub(crate) type OpeningValidator = Arc<
    dyn Fn(&Store, CurrentOpening, &str, &str) -> StoreResult<NativeWorldSession> + Send + Sync,
>;
pub(crate) type Adoption =
    Arc<dyn Fn(ActivationReceipt) -> Pin<Box<dyn Future<Output = bool> + Send>> + Send + Sync>;

pub(crate) struct CreationTarget {
    store: Arc<Store>,
    config: DestinationConfig,
    registration: Registration,
    bundle: Option<Bundle>,
    operating: BTreeMap<String, Value>,
    data_dir: PathBuf,
    validate: OpeningValidator,
    intake: tokio::sync::Mutex<()>,
    intake_bytes: openlegend_simulation::host::ByteBudget,
}

#[derive(Debug)]
pub(crate) enum CreationError {
    Busy,
    Forbidden,
    Occupied,
    StaleTarget,
    Conflict,
    Expired,
    InvalidCandidate,
    Unavailable,
    Storage(StoreError),
    Commit(CommitError),
}

impl std::fmt::Display for CreationError {
    fn fmt(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        out.write_str(self.message())
    }
}

impl std::error::Error for CreationError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Storage(problem) => Some(problem),
            Self::Commit(problem) => Some(problem),
            _ => None,
        }
    }
}

impl CreationError {
    fn message(&self) -> &'static str {
        match self {
            Self::Busy => "Creation intake is busy. Try again shortly.",
            Self::Forbidden => {
                "This installation or creator is not authorized for the requested creation target."
            }
            Self::Occupied => {
                "This target contains retained world or operational data. No existing data was changed."
            }
            Self::StaleTarget => {
                "The target configuration changed. Review its current account mapping and operating profile again."
            }
            Self::Conflict => {
                "This start identity was already used for different approved contents."
            }
            Self::Expired => "The reviewed start authorization expired.",
            Self::InvalidCandidate => {
                "The opening does not match its exact reviewed candidate or cannot be installed."
            }
            Self::Unavailable | Self::Storage(_) | Self::Commit(_) => {
                "The creation operation could not finish. Check its exact receipt before another Start."
            }
        }
    }
}

impl From<StoreError> for CreationError {
    fn from(error: StoreError) -> Self {
        match error {
            StoreError::InvalidRecord => Self::InvalidCandidate,
            StoreError::Capacity => Self::Busy,
            other => Self::Storage(other),
        }
    }
}
impl From<CommitError> for CreationError {
    fn from(error: CommitError) -> Self {
        match error {
            CommitError::RolledBack(StoreError::InvalidRecord) => Self::InvalidCandidate,
            CommitError::RolledBack(StoreError::StaleCut) => Self::StaleTarget,
            CommitError::RolledBack(StoreError::Capacity) => Self::Busy,
            other => Self::Commit(other),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CheckResult<'a> {
    target_id: &'a str,
    target_generation: u64,
    target_profile_digest: &'a str,
    label: &'a str,
    entry_url: &'a str,
    profile: &'a contracts::Profile,
    control_account_id: &'a str,
    creator_account_id_at_destination: &'a str,
    control_capabilities: &'a [Capability],
    operating_configuration: &'a BTreeMap<String, Value>,
    status: &'static str,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    compiled_world_digest: Option<&'a str>,
    findings: &'a [String],
}

impl CreationTarget {
    pub(crate) async fn new(
        store: Arc<Store>,
        mut config: DestinationConfig,
        opening_path: PathBuf,
        opening_sha256: String,
        data_dir: PathBuf,
        operating: BTreeMap<String, Value>,
        private_digest: String,
        validate: OpeningValidator,
    ) -> Result<Arc<Self>, CreationError> {
        if !config.valid()
            || !valid_hash(&private_digest)
            || !operating.iter().all(|(name, value)| {
                contracts::valid_text(name, 100)
                    && match value {
                        Value::String(text) => text.encode_utf16().count() <= 1000,
                        Value::Bool(_) | Value::Number(_) => true,
                        _ => false,
                    }
            })
        {
            return Err(CreationError::Forbidden);
        }
        for creator in &mut config.creators {
            let mut unique = Vec::new();
            creator.account.capabilities.retain(|capability| {
                if unique.contains(capability) {
                    false
                } else {
                    unique.push(*capability);
                    true
                }
            });
        }
        if !valid_hash(&opening_sha256) {
            return Err(CreationError::InvalidCandidate);
        }
        // The approved input is needed to create a world. Once committed, its
        // receipt and current canonical rows own entry and recovery.
        let bundle = if store
            .published_activation(config.id.clone())
            .await?
            .is_none()
        {
            Some(Bundle::open(&store, opening_path, &opening_sha256)?)
        } else {
            None
        };
        let profile = digest((
            &config.profile,
            &operating,
            &private_digest,
            &opening_sha256,
        ))?;
        let mut private =
            serde_json::to_value(&config).map_err(|_| CreationError::InvalidCandidate)?;
        let sources = private["sources"]
            .as_array_mut()
            .ok_or(CreationError::Forbidden)?;
        for (value, source) in sources.iter_mut().zip(&config.sources) {
            let fields = value.as_object_mut().ok_or(CreationError::Forbidden)?;
            fields.shift_remove("intakeKey");
            fields.insert(
                "keyDigest".into(),
                sha256_hex(source.intake_key.as_bytes()).into(),
            );
        }
        let configuration = digest((private, &profile))?;
        let registration = store
            .configure_creation(config.id.clone(), profile, configuration)
            .await?;
        Ok(Arc::new(Self {
            store,
            config,
            registration,
            bundle,
            operating,
            data_dir,
            validate,
            intake: tokio::sync::Mutex::new(()),
            intake_bytes: openlegend_simulation::host::ByteBudget::new(16 * 1024 * 1024),
        }))
    }

    pub(crate) async fn committed_activation(
        &self,
    ) -> Result<Option<ActivationReceipt>, CreationError> {
        self.store
            .published_activation(self.config.id.clone())
            .await
            .map_err(Into::into)
    }

    fn permitted_source(&self, submitted: &str) -> Result<&str, CreationError> {
        if !valid_key(submitted) {
            return Err(CreationError::Forbidden);
        }
        let context = b"Open Legend destination intake";
        let key = hmac::Key::new(hmac::HMAC_SHA256, submitted.as_bytes());
        self.config
            .sources
            .iter()
            .find(|source| {
                let key_of_source = hmac::Key::new(hmac::HMAC_SHA256, source.intake_key.as_bytes());
                let signature = hmac::sign(&key_of_source, context);
                hmac::verify(&key, context, signature.as_ref()).is_ok()
            })
            .map(|source| source.installation_id.as_str())
            .ok_or(CreationError::Forbidden)
    }

    fn source(
        &self,
        allowed_source: &str,
        supplied_source: &str,
        target: &str,
    ) -> Result<(), CreationError> {
        if allowed_source != supplied_source || target != self.config.id {
            return Err(CreationError::Forbidden);
        }
        Ok(())
    }

    fn mapped(&self, source: &str, creator: &str) -> Result<&InitialAccount, CreationError> {
        self.config
            .creators
            .iter()
            .find(|mapping| {
                mapping.source_installation_id == source && mapping.creator_account_id == creator
            })
            .map(|mapping| &mapping.account)
            .ok_or(CreationError::Forbidden)
    }

    async fn unoccupied(&self) -> Result<bool, CreationError> {
        Ok(self.store.creation_unoccupied().await? && !retained_files(&self.data_dir).await?)
    }

    async fn check(&self, source: &str, request: Check) -> Result<CheckResult<'_>, CreationError> {
        self.source(source, &request.source_installation_id, &request.target_id)?;
        let mapping = self.mapped(source, &request.creator_account_id)?;
        if self.store.creation_registration().await?.as_ref() != Some(&self.registration) {
            return Err(CreationError::StaleTarget);
        }
        let mut result = CheckResult {
            target_id: &self.config.id,
            target_generation: self.registration.generation,
            target_profile_digest: &self.registration.profile_digest,
            label: &self.config.label,
            entry_url: &self.config.entry_url,
            profile: &self.config.profile,
            control_account_id: &mapping.account_id,
            creator_account_id_at_destination: &mapping.account_id,
            control_capabilities: &mapping.capabilities,
            operating_configuration: &self.operating,
            status: "ready",
            message: "The prepared target is empty and permits this creator.",
            compiled_world_digest: None,
            findings: &[],
        };
        if !self.unoccupied().await? {
            result.status = "occupied";
            result.message = CreationError::Occupied.message();
        } else {
            match (request.candidate, request.candidate_digest) {
                (None, None) => (),
                (Some(candidate), Some(digest)) => {
                    let bundle = self.bundle.as_ref().ok_or(CreationError::Unavailable)?;
                    bundle.review(&candidate, &digest, &mapping.account_id)?;
                    bundle
                        .validate(
                            self.store.clone(),
                            mapping.account_id.clone(),
                            self.validate.clone(),
                        )
                        .await?;
                    result.compiled_world_digest = Some(bundle.compiled_digest());
                    result.findings = bundle.findings();
                }
                _ => return Err(CreationError::InvalidCandidate),
            }
        }
        Ok(result)
    }

    async fn receipt(
        &self,
        source: &str,
        identity: ActivationIdentity,
    ) -> Result<Option<ActivationReceipt>, CreationError> {
        self.source(
            source,
            &identity.source_installation_id,
            &identity.target_id,
        )?;
        if !identity.valid() {
            return Err(CreationError::InvalidCandidate);
        }
        // Receipt inspection does not renew a creator's publication grant.
        self.store
            .creation_receipt(identity.clone())
            .await?
            .map(|prior| {
                if prior.receipt.identity == identity {
                    Ok(prior.receipt)
                } else {
                    Err(CreationError::Conflict)
                }
            })
            .transpose()
    }

    async fn activate(
        &self,
        source: &str,
        request: Start,
    ) -> Result<ActivationReceipt, CreationError> {
        let Start {
            identity,
            expires_at,
            candidate,
        } = request;
        self.source(
            source,
            &identity.source_installation_id,
            &identity.target_id,
        )?;
        if !identity.valid() || candidate.get().len() > contracts::CANDIDATE_BYTES {
            return Err(CreationError::InvalidCandidate);
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Fingerprint<'a> {
            #[serde(flatten)]
            identity: &'a ActivationIdentity,
            expires_at: u64,
            candidate: &'a RawValue,
        }
        let fingerprint = digest(Fingerprint {
            identity: &identity,
            expires_at,
            candidate: &candidate,
        })?;
        if let Some(prior) = self.store.creation_receipt(identity.clone()).await? {
            return if prior.fingerprint == fingerprint {
                Ok(prior.receipt)
            } else {
                Err(CreationError::Conflict)
            };
        }
        let account = self.mapped(source, &identity.creator_account_id)?.clone();
        if identity.target_generation != self.registration.generation
            || identity.target_profile_digest != self.registration.profile_digest
        {
            return Err(CreationError::StaleTarget);
        }
        if !current_deadline(expires_at) {
            return Err(CreationError::Expired);
        }
        if !self.unoccupied().await? {
            // A competing identical Start can publish between this and the receipt cut.
            return match self.store.creation_receipt(identity).await? {
                Some(prior) if prior.fingerprint == fingerprint => Ok(prior.receipt),
                Some(_) => Err(CreationError::Conflict),
                None => Err(CreationError::Occupied),
            };
        }
        let bundle = self.bundle.as_ref().ok_or(CreationError::Unavailable)?;
        bundle.review(&candidate, &identity.candidate_digest, &account.account_id)?;
        if bundle.compiled_digest() != identity.compiled_world_digest {
            return Err(CreationError::InvalidCandidate);
        }
        let installation = bundle.prepare(&self.store).await?;
        let receipt = ActivationReceipt {
            identity,
            world_id: bundle.world().to_owned(),
            control_account_id: account.account_id.clone(),
            creator_account_id_at_destination: account.account_id.clone(),
            entry_url: self.config.entry_url.clone(),
            committed_at: 0,
        };
        match self
            .store
            .publish_initial_world(ActivationWriteInput {
                registration: self.registration.clone(),
                receipt,
                fingerprint,
                expires_at,
                account,
                actor: bundle.actor().to_owned(),
                data_dir: self.data_dir.clone(),
                validate: self.validate.clone(),
                installation,
            })
            .await?
        {
            ActivationWrite::Published(receipt) | ActivationWrite::Replayed(receipt) => Ok(receipt),
            ActivationWrite::Conflict => Err(CreationError::Conflict),
            ActivationWrite::Occupied => Err(CreationError::Occupied),
            ActivationWrite::StaleTarget => Err(CreationError::StaleTarget),
            ActivationWrite::Expired => Err(CreationError::Expired),
        }
    }
}

pub(crate) fn current_deadline(expires_at: u64) -> bool {
    let now = millis();
    expires_at > now && expires_at <= now.saturating_add(START_MILLIS).min(MAX_ORDINAL)
}

fn digest(value: impl Serialize) -> Result<String, CreationError> {
    serde_json::to_vec(&value)
        .map(|bytes| sha256_hex(&bytes))
        .map_err(|_| CreationError::InvalidCandidate)
}
