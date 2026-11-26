//! The creator memory panel borrows only the specific person's identity and
//! installed draft pins. Personal sources still enter through the history cut.
use super::*;
use crate::text::JsText;
use crate::{install::VerifiedDefinition, values::DefinitionPin};

/// Creator-authored fields read directly from the current character.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PersonProfile<T> {
    pub name: T,
    pub description: Option<T>,
    pub personality: Option<T>,
    pub backstory: Option<T>,
}
impl<T: Serialize> PersonProfile<T> {
    pub fn digest(&self) -> Result<String, serde_json::Error> {
        crate::encoding::json_record_digest(self)
    }
}

/// The native recall index admits authored episodes from these personal sources.
#[derive(Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthoredMemorySource {
    Observed,
    Heard,
    Felt,
    #[default]
    Internal,
    SelfThought,
}
impl AuthoredMemorySource {
    pub const OPTIONS: [Self; 5] = [
        Self::Observed,
        Self::Heard,
        Self::Felt,
        Self::Internal,
        Self::SelfThought,
    ];

    pub fn permits(source: &str) -> bool {
        Self::deserialize(serde::de::value::StrDeserializer::<serde::de::value::Error>::new(source))
            .is_ok()
    }
}

#[derive(Deserialize)]
#[serde(
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum PersonAuthorChange {
    Identity {
        expected_hash: String,
        profile: PersonProfile<JsText>,
    },
    Inventory(PersonInventoryEdit),
    Attribute(PersonAttributeEdit),
    Event(AuthoredEvent),
    Traits {
        expected_hash: String,
        ids: Vec<String>,
    },
    Goal {
        expected_agency_revision: u64,
        change: crate::plans::GoalChange,
    },
    Memory {
        #[serde(default)]
        source: AuthoredMemorySource,
        expected_next: u64,
        summary: JsText,
        importance: f64,
    },
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthoredEvent {
    pub expected_ordinal: u64,
    pub at: f64,
    pub text: JsText,
    pub perspectives: Vec<AuthoredPerspective>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AuthoredPerspective {
    pub actor_id: String,
    pub text: JsText,
    pub modality: crate::reception::ExperienceModality,
}
impl AuthoredEvent {
    fn valid(&self) -> bool {
        fn wording(text: &JsText) -> bool {
            !text.trim_is_empty() && text.units_len() <= 32768
        }
        self.at.is_finite()
            && self.at >= 0.0
            && wording(&self.text)
            && self
                .perspectives
                .iter()
                .all(|p| wording(&p.text) && !p.actor_id.is_empty())
    }
    fn bytes(&self) -> usize {
        self.text.storage_bytes()
            + self.perspectives.capacity() * size_of::<AuthoredPerspective>()
            + self
                .perspectives
                .iter()
                .map(|p| p.actor_id.capacity() + p.text.storage_bytes())
                .sum::<usize>()
    }
}
impl PersonAuthorChange {
    pub fn valid(&self) -> bool {
        match self {
            Self::Inventory(edit) => crate::values::is_safe_record_id(&edit.definition_id) && edit.quantity <= crate::identity::MAX_SAFE_INTEGER,
            Self::Event(event) => event.valid(),
            Self::Traits { ids, .. } => ids.iter().all(|id| crate::values::is_safe_record_id(id)),
            Self::Attribute(edit) => {
                crate::values::is_safe_record_id(&edit.id)
                    && edit.value.is_finite()
                    && edit.expected_value.is_finite()
            }
            Self::Goal { change, .. } => {
                matches!(
                    change.operation,
                    crate::plans::GoalOperation::Create
                        | crate::plans::GoalOperation::Revise
                        | crate::plans::GoalOperation::Abandon
                ) && change
                    .objective
                    .as_ref()
                    .is_none_or(|value| !value.trim_is_empty() && value.units_len() <= 500)
                    && [change.goal_id.as_ref(), change.parent_id.as_ref()]
                        .into_iter()
                        .flatten()
                        .all(crate::values::is_safe_record_text)
            }
            Self::Memory {
                summary,
                importance,
                ..
            } => {
                !summary.trim_is_empty()
                    && summary.units_len() <= 32_768
                    && (0.0..=10.0).contains(importance)
            }
            Self::Identity { profile, .. } => {
                !profile.name.trim_is_empty()
                    && profile.name.units_len() <= 80
                    && profile
                        .description
                        .as_ref()
                        .is_none_or(|s| s.units_len() <= 2000)
                    && profile
                        .personality
                        .as_ref()
                        .is_none_or(|s| s.units_len() <= 1000)
                    && profile
                        .backstory
                        .as_ref()
                        .is_none_or(|s| s.units_len() <= 4000)
            }
        }
    }
    pub(crate) fn input_bytes(&self) -> usize {
        match self {
            Self::Inventory(edit) => edit.definition_id.capacity(),
            Self::Event(event) => event.bytes(),
            Self::Traits { expected_hash, ids } => {
                expected_hash.capacity()
                    + ids.capacity() * size_of::<String>()
                    + ids.iter().map(String::capacity).sum::<usize>()
            }
            Self::Attribute(edit) => edit.id.capacity(),
            Self::Goal { change, .. } => [&change.goal_id, &change.objective, &change.parent_id]
                .into_iter()
                .flatten()
                .map(JsText::storage_bytes)
                .sum(),
            Self::Memory { summary, .. } => summary.storage_bytes(),
            Self::Identity {
                expected_hash,
                profile,
            } => {
                expected_hash.len()
                    + profile.name.storage_bytes()
                    + [
                        &profile.description,
                        &profile.personality,
                        &profile.backstory,
                    ]
                    .into_iter()
                    .flatten()
                    .map(JsText::storage_bytes)
                    .sum::<usize>()
            }
        }
    }
}

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
        read: impl FnOnce(
            PersonProfile<&JsText>,
            u64,
            PersonEditorCut<'_>,
            &str,
            &crate::state::ActorAgency,
            PersonAttributes<'_>,
        ) -> T,
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
            PersonProfile {
                name: &entity.name,
                description: body.description.as_ref(),
                personality: body.personality.as_ref(),
                backstory: body.backstory.as_ref(),
            },
            state
                .experience
                .actor(actor)
                .and_then(|history| {
                    history
                        .collection(crate::experience::PersonalSourceKind::Memory)
                        .ok()
                })
                .map_or(0, |rows| rows.coverage().next_ordinal),
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
            &state.installed.occurrence_rules.value().speech_event,
            &body.agency,
            PersonAttributes {
                state,
                person: entity,
            },
        )))
    }
}

impl NativeWorldSession {
    /// Begin a revision-checked creator edit after the server resolves the
    /// subject. The same world turn still enforces the private actor boundary.
    pub fn begin_person_authoring(
        &mut self,
        account: &str,
        owner: &str,
        actor: &str,
        expected: &PersonEditorCut<'_>,
        change: PersonAuthorChange,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        if !change.valid()
            || !self.private_history_permitted(account, owner, actor)?
            || !self.may_edit_recall(owner, actor)?
        {
            return Err(failure("person authoring unavailable"));
        }
        if let PersonAuthorChange::Event(event) = &change {
            for perspective in &event.perspectives {
                if !self.private_history_permitted(account, owner, &perspective.actor_id)?
                    || !self.may_edit_recall(owner, &perspective.actor_id)?
                {
                    return Err(stale("person-editor-cut"));
                }
            }
        }
        let current =
            self.inspect_person_editor(actor, |profile, next, cut, _, agency, attributes| {
                cut == *expected
                    && match &change {
                        PersonAuthorChange::Identity { expected_hash, .. } => profile
                            .digest()
                            .is_ok_and(|digest| digest == *expected_hash),
                        PersonAuthorChange::Memory { expected_next, .. } => next == *expected_next,
                        PersonAuthorChange::Traits { expected_hash, .. } => {
                            attributes.trait_options().is_some()
                                && crate::encoding::json_record_digest(&attributes.traits())
                                    .is_ok_and(|cut| cut == *expected_hash)
                        }
                        PersonAuthorChange::Event(event) => {
                            event.expected_ordinal == attributes.history_ordinal()
                                && event.at <= attributes.sim_time()
                        }
                        PersonAuthorChange::Inventory(edit) => attributes.inventory_revision() == edit.expected_revision,
                        PersonAuthorChange::Attribute(edit) => attributes.matches(edit),
                        PersonAuthorChange::Goal {
                            expected_agency_revision,
                            ..
                        } => agency.revision == *expected_agency_revision,
                    }
            })?;
        if current != Some(true) {
            return Err(stale("person-editor-cut"));
        }
        let cursor = crate::knowledge::KnowledgeEditCursor::author(actor, change, &self.budget)
            .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }
}

/// The authorized editor changes only explicitly selected memory fields. A
/// deletion uses the same forgetting graph as the original creator route.
pub enum PersonMemoryEdit {
    Update {
        importance: f64,
        text: Option<crate::text::JsText>,
        content: Option<Option<crate::text::JsText>>,
    },
    Forget,
}
impl PersonMemoryEdit {
    pub fn withdraws_source(&self) -> bool {
        matches!(
            self,
            Self::Forget
                | Self::Update { text: Some(_), .. }
                | Self::Update {
                    content: Some(_),
                    ..
                }
        )
    }

    pub fn valid(&self, kind: crate::experience::PersonalSourceKind) -> bool {
        match self {
            Self::Update {
                importance,
                text,
                content,
            } => {
                (0.0..=10.0).contains(importance)
                    && (content.is_none()
                        || kind == crate::experience::PersonalSourceKind::Awareness)
                    && content
                        .as_ref()
                        .and_then(Option::as_ref)
                        .is_none_or(|text| text.character_count() <= 20_000)
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
        if !reference.validate()
            || !crate::values::is_safe_record_id(&reference.id)
            || !edit.valid(reference.kind)
        {
            return Err(failure("invalid memory edit"));
        }
        if self.inspect_person_editor(actor, |_, _, current, _, _, _| current == *expected)?
            != Some(true)
        {
            return Err(stale("person-editor-cut"));
        }
        use crate::experience::PrivacyEditMode;
        let mode = match edit {
            PersonMemoryEdit::Update {
                importance,
                text: None,
                content: None,
            } => PrivacyEditMode::Rank {
                kind: reference.kind,
                revision: reference.revision,
                importance,
            },
            PersonMemoryEdit::Update {
                importance,
                text,
                content,
            } => PrivacyEditMode::Rewrite {
                kind: reference.kind,
                revision: reference.revision,
                importance,
                wording: crate::experience::RecollectionWording { text, content },
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
