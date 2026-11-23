//! Bounded inspection of the installed public world and exact authored data.

use super::{NativeWorldSession, RuntimeError, RuntimeProgress, failure};
use crate::{simulation::InstalledWorld, text::TextRef, values::DefinitionPin};
use std::sync::Arc;

mod live;
pub use live::{RuntimeLiveEntity, RuntimeLiveInspection, RuntimeLiveSupport};

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
    Sense,
    BodyPolicy,
    Recipe,
    ItemHandling,
}

/// Holds the already admitted immutable definitions past the accepted world
/// turn. No list of definition IDs, bodies, actors or private records is copied.
#[derive(Clone)]
pub struct RuntimeDefinitionCatalogue(Arc<InstalledWorld>);

impl RuntimeDefinitionCatalogue {
    pub fn same_installation(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.0, &other.0)
    }

    pub fn count(&self, kind: RuntimeDefinitionKind) -> usize {
        let installed = &self.0;
        match kind {
            RuntimeDefinitionKind::Item => installed.retained.item_definitions.len(),
            RuntimeDefinitionKind::Attribute => installed.attributes.len(),
            RuntimeDefinitionKind::Sense => installed.senses.len(),
            RuntimeDefinitionKind::BodyPolicy => usize::from(installed.body_policy.is_some()),
            RuntimeDefinitionKind::Recipe => installed.retained.recipes.len(),
            RuntimeDefinitionKind::ItemHandling => 1,
        }
    }

    pub fn id_at(&self, kind: RuntimeDefinitionKind, index: usize) -> Option<&str> {
        let installed = &self.0;
        match kind {
            RuntimeDefinitionKind::Item => installed.retained.item_definitions.id_at(index),
            RuntimeDefinitionKind::Attribute => installed
                .attributes
                .get_index(index)
                .map(|(id, _)| id.as_str()),
            RuntimeDefinitionKind::Sense => {
                installed.senses.get_index(index).map(|(id, _)| id.as_str())
            }
            RuntimeDefinitionKind::BodyPolicy => {
                (index == 0 && installed.body_policy.is_some()).then_some("current")
            }
            RuntimeDefinitionKind::Recipe => installed.retained.recipes.id_at(index),
            RuntimeDefinitionKind::ItemHandling => {
                (index == 0).then_some(installed.retained.item_handling_pin.id.as_str())
            }
        }
    }

    /// Check the existing exact family pin without exposing a recipe compiler
    /// or an authoring capability. A definition view can project this binding.
    pub fn recipe_family_pin(&self, id: &str) -> Option<&DefinitionPin> {
        self.0
            .manifest
            .recipe_families
            .iter()
            .find(|pin| pin.id == id)
    }

    pub fn definition(
        &self,
        kind: RuntimeDefinitionKind,
        id: &str,
    ) -> Option<RuntimeDefinitionInspection<'_>> {
        self.0.public_definition(kind, id)
    }
}

pub enum RuntimeDefinitionInspection<'a> {
    Complete {
        name: TextRef<'a>,
        payload: &'a str,
    },
    /// The application must remove private authoring provenance before disclosure.
    Recipe(&'a str),
    ItemHandling {
        payload: &'a str,
        pin: &'a DefinitionPin,
    },
}

impl NativeWorldSession {
    /// Pin the public definition owner and headers at one accepted cut for
    /// off-turn lexical paging. The returned owner retains installed memory.
    pub fn capture_definition_catalogue<T>(
        &self,
        capture: impl FnOnce(RuntimeProgress<'_>, u64, RuntimeDefinitionCatalogue) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let current = self.session.accepted().map_err(failure)?;
        let installed = &current.state.installed;
        Ok(capture(
            self.accepted_progress()?,
            installed.manifest.revision,
            RuntimeDefinitionCatalogue(Arc::clone(installed)),
        ))
    }

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
        let definition = selected.and_then(|(kind, id)| installed.public_definition(kind, id));
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

impl InstalledWorld {
    fn public_definition(
        &self,
        kind: RuntimeDefinitionKind,
        id: &str,
    ) -> Option<RuntimeDefinitionInspection<'_>> {
        match kind {
            RuntimeDefinitionKind::Item => Some(RuntimeDefinitionInspection::Complete {
                name: (&self.retained.items.get(id)?.named.name).into(),
                payload: self.retained.item_definitions.get(id)?,
            }),
            RuntimeDefinitionKind::Attribute => {
                let attribute = self.attributes.get(id)?;
                Some(RuntimeDefinitionInspection::Complete {
                    name: attribute.value().name.as_str().into(),
                    payload: attribute.source(),
                })
            }
            RuntimeDefinitionKind::Sense => {
                let sense = self.senses.get(id)?;
                Some(RuntimeDefinitionInspection::Complete {
                    name: sense.value().id().into(),
                    payload: sense.source(),
                })
            }
            RuntimeDefinitionKind::BodyPolicy => {
                if id != "current" {
                    return None;
                }
                Some(RuntimeDefinitionInspection::Complete {
                    name: "Body policy".into(),
                    payload: self.body_policy.as_ref()?.source(),
                })
            }
            RuntimeDefinitionKind::Recipe => Some(RuntimeDefinitionInspection::Recipe(
                self.retained.recipes.get(id)?,
            )),
            RuntimeDefinitionKind::ItemHandling => {
                let pin = &self.retained.item_handling_pin;
                if id != pin.id {
                    return None;
                }
                Some(RuntimeDefinitionInspection::ItemHandling {
                    payload: self.retained.item_handling.payload(),
                    pin,
                })
            }
        }
    }
}
