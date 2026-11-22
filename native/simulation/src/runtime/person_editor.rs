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

impl NativeWorldSession {
    /// Under the application's protected-turn save, hydrate and edit just one
    /// selected memory. The operation proves its current body hash again.
    pub fn begin_memory_ranking(
        &mut self,
        actor: &str,
        expected: &PersonEditorCut<'_>,
        reference: crate::experience::PersonalSourceRef,
        importance: f64,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if reference.kind != crate::experience::PersonalSourceKind::Memory
            || !reference.validate()
            || !crate::values::is_safe_record_id(&reference.id)
            || !(0.0..=10.0).contains(&importance)
        {
            return Err(failure("invalid memory importance"));
        }
        if self.inspect_person_editor(actor, |_, current| current == *expected)? != Some(true) {
            return Err(stale("person-editor-cut"));
        }
        self.session
            .begin_recall_edit(
                actor,
                &reference.id,
                crate::experience::PrivacyEditMode::Rank {
                    revision: reference.revision,
                    importance,
                },
                None,
                self.history_edit_limits,
            )
            .map_err(failure)
    }
}

impl RuntimePreparedProducts<'_> {
    pub fn memory_ranking<'a>(
        &'a self,
        budget: &'a ByteBudget,
    ) -> Result<Option<(&str, &str, &str, RuntimeRecallDecoder<'a>)>, RuntimeError> {
        let CompletedOperation::RecallEdit(edit) = self.operation else {
            return Ok(None);
        };
        let Some(old_revision) = edit.ranking_revision() else {
            return Ok(None);
        };
        Ok(Some((
            edit.actor_id(),
            edit.source_id(),
            old_revision,
            RuntimeRecallDecoder::for_state(self.state, budget)?,
        )))
    }
}
