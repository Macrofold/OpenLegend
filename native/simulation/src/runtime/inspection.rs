//! Bounded inspection of the installed public world and exact authored data.

use super::{NativeWorldSession, RuntimeError, RuntimeProgress, failure};
use crate::text::TextRef;

pub struct RuntimeWorldInspection<'a> {
    pub progress: RuntimeProgress<'a>,
    pub profile_id: &'a str,
    pub profile_version: u64,
    pub manifest_revision: u64,
    pub policy: &'a str,
    pub definition: Option<RuntimeDefinitionInspection<'a>>,
}

#[derive(Clone, Copy)]
pub enum RuntimeDefinitionKind {
    Item,
    Attribute,
}

pub struct RuntimeDefinitionInspection<'a> {
    pub name: TextRef<'a>,
    pub payload: &'a str,
}

impl NativeWorldSession {
    /// Read the authorized world's header and one optional public definition
    /// in one accepted cut. No actor, account, inventory or memory reads run.
    /// A result kept after this callback must independently fund its data.
    pub fn inspect_world<T>(
        &self,
        selected: Option<(RuntimeDefinitionKind, &str)>,
        inspect: impl FnOnce(RuntimeWorldInspection<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let current = self.session.accepted().map_err(failure)?;
        let installed = &current.state.installed;
        let definition = selected.and_then(|(kind, id)| match kind {
            RuntimeDefinitionKind::Item => Some(RuntimeDefinitionInspection {
                name: (&installed.retained.items.get(id)?.named.name).into(),
                payload: installed.retained.item_definitions.get(id)?,
            }),
            RuntimeDefinitionKind::Attribute => {
                let attribute = installed.attributes.get(id)?;
                Some(RuntimeDefinitionInspection {
                    name: attribute.value().name.as_str().into(),
                    payload: attribute.source(),
                })
            }
        });
        Ok(inspect(RuntimeWorldInspection {
            progress: self.accepted_progress()?,
            profile_id: &installed.content.profile.id,
            profile_version: installed.content.profile.version,
            manifest_revision: installed.manifest.revision,
            policy: installed.retained.invention_policy.payload(),
            definition,
        }))
    }
}
