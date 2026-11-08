//! Retention threshold from the actual saved policy or selected authored
//! default. It is not a fixed engine-wide importance threshold.

use super::{CanonicalInput, InstallError, RowImport};
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct SocialPolicy {
    pub notable_threshold: f64,
}

pub(crate) struct SocialSettings {
    pub saved: Option<SocialPolicy>,
    pub defaults: SocialPolicy,
}
impl SocialSettings {
    pub(crate) fn notable_threshold(&self) -> f64 {
        self.saved
            .as_ref()
            .unwrap_or(&self.defaults)
            .notable_threshold
    }
}

pub(crate) fn install_social(
    import: &mut RowImport,
    presence: Option<bool>,
    defaults: &CanonicalInput,
) -> Result<SocialSettings, InstallError> {
    // Undefined selects the world's authored default; null is not a supported
    // current policy and may not silently take that same branch.
    if presence == Some(false) {
        return Err(InstallError::CurrentFormat);
    }
    let default_policy: SocialPolicy =
        serde_json::from_str(&defaults.canonical).map_err(|_| InstallError::DefinitionBody)?;
    defaults.verify(&default_policy)?;
    let saved = super::rows::take_one::<SocialPolicy>(
        import,
        "config_social",
        "[\"world\"]",
        "socialPolicy",
        presence == Some(true),
    )?
    .map(|(row, policy)| {
        if !row.extra.is_empty() || !policy.notable_threshold.is_finite() {
            Err(InstallError::CurrentFormat)
        } else {
            Ok(policy)
        }
    })
    .transpose()?;
    if !default_policy.notable_threshold.is_finite() {
        return Err(InstallError::DefinitionBody);
    }
    Ok(SocialSettings {
        saved,
        defaults: default_policy,
    })
}
