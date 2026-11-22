//! Bounded inspection of the installed public world and exact authored data.

use super::{NativeWorldSession, RuntimeError, RuntimeProgress, failure};
use crate::text::JsText;

pub struct RuntimeWorldInspection<'a> {
    pub progress: RuntimeProgress<'a>,
    pub profile_id: &'a str,
    pub profile_version: u64,
    pub manifest_revision: u64,
    pub policy: &'a str,
    pub item_definition: Option<RuntimeItemDefinitionInspection<'a>>,
}

pub struct RuntimeItemDefinitionInspection<'a> {
    pub name: &'a JsText,
    pub payload: &'a str,
}

impl NativeWorldSession {
    /// Read the authorized world's header and optional public item definition
    /// in one accepted cut. No actor, account, inventory or memory reads run.
    /// A result kept after this callback must independently fund its data.
    pub fn inspect_world<T>(
        &self,
        item_definition_id: Option<&str>,
        inspect: impl FnOnce(RuntimeWorldInspection<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let current = self.session.accepted().map_err(failure)?;
        let installed = &current.state.installed;
        let item_definition = item_definition_id.and_then(|id| {
            Some(RuntimeItemDefinitionInspection {
                name: &installed.retained.items.get(id)?.named.name,
                payload: installed.retained.item_definitions.get(id)?,
            })
        });
        Ok(inspect(RuntimeWorldInspection {
            progress: self.accepted_progress()?,
            profile_id: &installed.content.profile.id,
            profile_version: installed.content.profile.version,
            manifest_revision: installed.manifest.revision,
            policy: installed.retained.invention_policy.payload(),
            item_definition,
        }))
    }
}
