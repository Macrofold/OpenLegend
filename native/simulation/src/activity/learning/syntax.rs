use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ResidentReservation};
use std::mem::size_of;

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub(super) enum BindingKind {
    Object,
    Place,
    Text,
}
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BindingField {
    pub kind: BindingKind,
    pub output: bool,
    #[serde(rename = "self")]
    pub self_allowed: bool,
}
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct CommandFields {
    pub required: Vec<String>,
    #[serde(default)]
    pub optional: Vec<String>,
    pub bindings: IndexMap<String, BindingField>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LearningLanguage {
    commands: IndexMap<String, CommandFields>,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    text_characters: u64,
    preparation: LearningPreparationLimits,
    failure_codes: Vec<String>,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct LearningPreparationLimits {
    pub page: usize,
    pub rows: usize,
    pub bytes: usize,
    pub link_passes: usize,
}
pub(crate) struct InstalledLearningLanguage {
    pub(super) commands: IndexMap<String, CommandFields>,
    pub(super) text_characters: u64,
    pub(super) preparation: LearningPreparationLimits,
    pub(super) failure_codes: Vec<String>,
    _storage: ResidentReservation,
}
impl HeapBytes for BindingField {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
impl HeapBytes for CommandFields {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.required.heap_bytes()?,
            self.optional.heap_bytes()?,
            self.bindings.heap_bytes()?,
        ])
    }
}
impl HeapBytes for LearningLanguage {
    fn heap_bytes(&self) -> Option<usize> {
        self.commands
            .heap_bytes()?
            .checked_add(self.failure_codes.heap_bytes()?)
    }
}
impl LearningLanguage {
    pub(crate) fn install(
        self,
        budget: &ByteBudget,
    ) -> Result<InstalledLearningLanguage, crate::install::InstallError> {
        let bytes = self
            .heap_bytes()
            .and_then(|n| {
                n.checked_add(size_of::<InstalledLearningLanguage>() + 2 * size_of::<usize>())
            })
            .ok_or(crate::install::InstallError::Capacity)?;
        let storage = budget
            .reserve_record(bytes)
            .map_err(|_| crate::install::InstallError::Capacity)?;
        for (command, fields) in &self.commands {
            if !is_safe_record_id(command)
                || fields
                    .required
                    .iter()
                    .chain(&fields.optional)
                    .any(|field| !is_safe_record_id(field))
                || fields.bindings.keys().any(|field| {
                    !fields.required.contains(field) && !fields.optional.contains(field)
                })
            {
                return Err(crate::install::InstallError::CurrentFormat);
            }
        }
        Ok(InstalledLearningLanguage {
            commands: self.commands,
            text_characters: self.text_characters,
            preparation: self.preparation,
            failure_codes: self.failure_codes,
            _storage: storage,
        })
    }
}
