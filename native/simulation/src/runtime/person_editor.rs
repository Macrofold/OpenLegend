//! The creator memory panel borrows only the specific person's identity and
//! installed draft pins. Personal sources still enter through the history cut.
use super::*;
use crate::{install::VerifiedDefinition, values::DefinitionPin};

#[derive(Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonEditorCut<'a> {
    pub generation: std::borrow::Cow<'a, str>,
    pub manifest_revision: u64,
    pub body_policy_pin: Option<DefinitionPin>,
    pub life: u64,
}

impl NativeWorldSession {
    pub fn inspect_person_editor<T>(
        &self,
        actor: &str,
        read: impl FnOnce(&crate::text::JsText, PersonEditorCut<'_>) -> T,
    ) -> Result<Option<T>, RuntimeError> {
        let state = &self.session.publication_read().map_err(failure)?.state;
        let Some(entity) = state
            .physical
            .entities
            .get(actor)
            .filter(|entity| entity.has_memory())
        else {
            return Ok(None);
        };
        let Some(body) = &entity.actor else {
            return Ok(None);
        };
        Ok(Some(read(
            &entity.name,
            PersonEditorCut {
                generation: std::borrow::Cow::Borrowed(&state.generation),
                manifest_revision: state.installed.manifest.revision,
                body_policy_pin: state
                    .installed
                    .body_policy
                    .as_ref()
                    .map(VerifiedDefinition::pin)
                    .cloned(),
                life: body.physical_life.unwrap_or(0),
            },
        )))
    }
}

/// The authorized editor changes only explicitly selected memory fields. A
/// deletion uses the same forgetting graph as the original creator route.
pub enum PersonMemoryEdit {
    Update {
        importance: f64,
        text: Option<crate::text::JsText>,
    },
    Forget,
}
impl PersonMemoryEdit {
    pub fn withdraws_source(&self) -> bool {
        matches!(self, Self::Forget | Self::Update { text: Some(_), .. })
    }

    pub fn valid(&self, kind: crate::experience::PersonalSourceKind) -> bool {
        match self {
            Self::Update { importance, text } => {
                (0.0..=10.0).contains(importance)
                    && text.as_ref().is_none_or(|text| {
                        text.character_count()
                            <= if kind == crate::experience::PersonalSourceKind::Memory {
                                32_768
                            } else {
                                20_000
                            }
                    })
            }
            Self::Forget => true,
        }
    }
}

impl NativeWorldSession {
    /// Hydrate the exact selected memory inside a protected save. The draft
    /// and the source’s current revision are enforced before any replacement.
    pub fn begin_editor_memory_edit(
        &mut self,
        actor: &str,
        expected: &PersonEditorCut<'_>,
        reference: crate::experience::PersonalSourceRef,
        edit: PersonMemoryEdit,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if reference.kind == crate::experience::PersonalSourceKind::Awareness
            || !reference.validate()
            || !crate::values::is_safe_record_id(&reference.id)
            || !edit.valid(reference.kind)
        {
            return Err(failure("invalid memory edit"));
        }
        if self.inspect_person_editor(actor, |_, current| current == *expected)? != Some(true) {
            return Err(stale("person-editor-cut"));
        }
        use crate::experience::PrivacyEditMode;
        let mode = match edit {
            PersonMemoryEdit::Update {
                importance,
                text: None,
            } => PrivacyEditMode::Rank {
                kind: reference.kind,
                revision: reference.revision,
                importance,
            },
            PersonMemoryEdit::Update {
                importance,
                text: Some(text),
            } => PrivacyEditMode::Rewrite {
                kind: reference.kind,
                revision: reference.revision,
                importance,
                text,
            },
            PersonMemoryEdit::Forget => PrivacyEditMode::ForgetSource {
                kind: reference.kind,
                revision: reference.revision,
            },
        };
        self.session
            .begin_recall_edit(actor, &reference.id, mode, None, self.history_edit_limits)
            .map_err(failure)
    }
}

impl RuntimePreparedProducts<'_> {
    pub fn person_replacement<'a>(
        &'a self,
        budget: &'a ByteBudget,
    ) -> Result<
        Option<(
            crate::experience::PersonalSourceKind,
            &str,
            &str,
            &str,
            RuntimeRecallDecoder<'a>,
        )>,
        RuntimeError,
    > {
        let CompletedOperation::RecallEdit(edit) = self.operation else {
            return Ok(None);
        };
        let Some((kind, old_revision)) = edit.replacement() else {
            return Ok(None);
        };
        Ok(Some((
            kind,
            edit.actor_id(),
            edit.source_id(),
            old_revision,
            RuntimeRecallDecoder::for_state(self.state, budget)?,
        )))
    }
}
