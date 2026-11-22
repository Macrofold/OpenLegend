use crate::authority::Capability;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::value::RawValue;
use std::collections::BTreeMap;

pub(super) const MAX_ORDINAL: u64 = 9_007_199_254_740_991;
pub(super) const CANDIDATE_BYTES: usize = 24_000;
pub(super) const START_MILLIS: u64 = 7 * 86_400_000;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct DestinationConfig {
    pub(super) id: String,
    pub(super) label: String,
    pub(super) entry_url: String,
    pub(super) profile: Profile,
    pub(super) sources: Vec<SourceConfig>,
    pub(super) creators: Vec<CreatorConfig>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct SourceConfig {
    pub(super) installation_id: String,
    pub(super) intake_key: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct CreatorConfig {
    pub(super) source_installation_id: String,
    pub(super) creator_account_id: String,
    pub(super) account: InitialAccount,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct InitialAccount {
    pub issuer: String,
    pub subject: String,
    pub account_id: String,
    pub capabilities: Vec<Capability>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Profile {
    pub(super) id: String,
    pub(super) revision: u64,
    pub(super) description: String,
}

impl DestinationConfig {
    /// Bind the reviewed destination and initial credentials to the listener
    /// that will actually authenticate the new world's first account.
    pub(crate) fn validate_listener(
        &mut self,
        local: bool,
        actual_port: u16,
        public_origin: &str,
        oidc_issuer: &str,
    ) -> bool {
        use crate::authority::{LOCAL_ISSUER, LOCAL_SUBJECT};
        use crate::network::{parse_url, permitted_destination};
        let Ok(entry) = parse_url(&self.entry_url) else {
            return false;
        };
        let issuer = if local { LOCAL_ISSUER } else { oidc_issuer };
        let Ok(issuer) = parse_url(issuer) else {
            return false;
        };
        if if local {
            entry.scheme() != "http"
                || !permitted_destination(&entry, true)
                || entry.port_or_known_default() != Some(actual_port)
        } else {
            entry.origin().ascii_serialization() != public_origin
        } {
            return false;
        }
        self.creators.iter_mut().all(|creator| {
            let account = &mut creator.account;
            if parse_url(&account.issuer).ok().as_ref() != Some(&issuer)
                || (local
                    && (account.subject != LOCAL_SUBJECT || account.account_id != LOCAL_SUBJECT))
            {
                return false;
            }
            account.issuer = if local {
                LOCAL_ISSUER.to_owned()
            } else {
                issuer.to_string()
            };
            true
        })
    }

    pub(super) fn valid(&self) -> bool {
        use std::collections::HashSet;
        let entry = crate::network::parse_url(&self.entry_url);
        valid_id(&self.id)
            && valid_text(&self.label, 128)
            && entry.is_ok_and(|url| {
                crate::network::permitted_destination(&url, true)
                    && url.path() == "/"
                    && url.query().is_none()
                    && url.fragment().is_none()
            })
            && valid_id(&self.profile.id)
            && (1..=MAX_ORDINAL).contains(&self.profile.revision)
            && valid_text(&self.profile.description, 1000)
            && (1..=256).contains(&self.sources.len())
            && (1..=256).contains(&self.creators.len())
            && {
                let mut sources = HashSet::new();
                let mut keys = HashSet::new();
                let mut mappings = HashSet::new();
                self.sources.iter().all(|source| {
                    valid_id(&source.installation_id)
                        && valid_key(&source.intake_key)
                        && sources.insert(&source.installation_id)
                        && keys.insert(&source.intake_key)
                }) && self.creators.iter().all(|creator| {
                    let account = &creator.account;
                    sources.contains(&creator.source_installation_id)
                        && valid_id(&creator.creator_account_id)
                        && mappings
                            .insert((&creator.source_installation_id, &creator.creator_account_id))
                        && crate::network::parse_url(&account.issuer).is_ok()
                        && valid_text(&account.subject, 512)
                        && valid_id(&account.account_id)
                        && (1..=6).contains(&account.capabilities.len())
                        && account.capabilities.contains(&Capability::Play)
                })
            }
    }
}

pub(super) fn valid_key(value: &str) -> bool {
    (32..=512).contains(&value.len())
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"._~-".contains(&byte))
}

pub(super) fn valid_text(value: &str, units: usize) -> bool {
    !value.trim().is_empty() && !value.contains('\0') && value.encode_utf16().count() <= units
}

pub(super) fn valid_id(value: &str) -> bool {
    valid_text(value, 100)
        && !matches!(
            value,
            "prototype"
                | "constructor"
                | "__proto__"
                | "__defineGetter__"
                | "__defineSetter__"
                | "hasOwnProperty"
                | "__lookupGetter__"
                | "__lookupSetter__"
                | "isPrototypeOf"
                | "propertyIsEnumerable"
                | "toLocaleString"
                | "toString"
                | "valueOf"
        )
}

pub(super) fn valid_hash(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Check {
    pub(super) source_installation_id: String,
    pub(super) creator_account_id: String,
    pub(super) target_id: String,
    pub(super) candidate: Option<Box<RawValue>>,
    pub(super) candidate_digest: Option<String>,
}

impl Check {
    pub(super) fn valid(&self) -> bool {
        [
            &self.source_installation_id,
            &self.creator_account_id,
            &self.target_id,
        ]
        .into_iter()
        .all(|field| valid_id(field))
            && match (&self.candidate, &self.candidate_digest) {
                (None, None) => true,
                (Some(candidate), Some(digest)) => {
                    candidate.get().len() <= CANDIDATE_BYTES && valid_hash(digest)
                }
                _ => false,
            }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivationIdentity {
    pub source_installation_id: String,
    pub creator_account_id: String,
    pub target_id: String,
    pub operation_id: String,
    pub approval_id: String,
    pub target_generation: u64,
    pub target_profile_digest: String,
    pub candidate_digest: String,
    pub compiled_world_digest: String,
}

impl ActivationIdentity {
    pub(crate) fn valid(&self) -> bool {
        [
            &self.source_installation_id,
            &self.creator_account_id,
            &self.target_id,
            &self.operation_id,
            &self.approval_id,
        ]
        .into_iter()
        .all(|field| valid_id(field))
            && (1..=MAX_ORDINAL).contains(&self.target_generation)
            && [
                &self.target_profile_digest,
                &self.candidate_digest,
                &self.compiled_world_digest,
            ]
            .into_iter()
            .all(|field| valid_hash(field))
    }
}

pub(super) struct Start {
    pub(super) identity: ActivationIdentity,
    pub(super) expires_at: u64,
    pub(super) candidate: Box<RawValue>,
}

impl<'de> Deserialize<'de> for Start {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        use serde::de::Error;
        let mut fields = BTreeMap::<String, Box<RawValue>>::deserialize(deserializer)?;
        let candidate = fields
            .remove("candidate")
            .ok_or_else(|| D::Error::missing_field("candidate"))?;
        let expires_at = fields
            .remove("expiresAt")
            .and_then(|value| serde_json::from_str::<u64>(value.get()).ok())
            .filter(|value| (1..=MAX_ORDINAL).contains(value))
            .ok_or_else(|| D::Error::custom("invalid start deadline"))?;
        Ok(Self {
            identity: serde_json::from_slice(
                &serde_json::to_vec(&fields).map_err(D::Error::custom)?,
            )
            .map_err(D::Error::custom)?,
            expires_at,
            candidate,
        })
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivationReceipt {
    #[serde(flatten)]
    pub identity: ActivationIdentity,
    pub world_id: String,
    pub control_account_id: String,
    pub creator_account_id_at_destination: String,
    pub entry_url: String,
    pub committed_at: u64,
}

impl ActivationReceipt {
    pub(crate) fn valid(&self) -> bool {
        self.identity.valid()
            && valid_id(&self.world_id)
            && valid_id(&self.control_account_id)
            && self.creator_account_id_at_destination == self.control_account_id
            && self.committed_at <= MAX_ORDINAL
            && crate::network::parse_url(&self.entry_url)
                .is_ok_and(|url| crate::network::permitted_destination(&url, true))
    }
}

pub(crate) fn millis() -> u64 {
    chrono::Utc::now().timestamp_millis().max(0) as u64
}
