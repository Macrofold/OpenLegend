//! Player place-note intentions arrive after exact retained-place admission by
//! the authenticated server. The generic knowledge owner remains the writer.
use super::*;
use crate::knowledge::{KnowledgeEdit, KnowledgeEditCursor, NoteIdentity};
use crate::reception::{KnowledgeSubject, ObserverSubject};
use crate::text::JsText;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct KnowledgeInput {
    account_id: String,
    actor_id: String,
    place_id: String,
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    expected_revision: u64,
    text: JsText,
}

impl NativeWorldSession {
    /// Apply a deliberate focus to the host's already resolved current
    /// contact. The ordinary personal edit owns rollback and publication.
    pub fn begin_player_focus(
        &mut self,
        account: &str,
        actor: &str,
        contact: Option<String>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session.accepted().map_err(failure)?
            .require_player_read(account, actor).map_err(failure)?;
        let cursor = crate::knowledge::KnowledgeEditCursor::focus(actor, contact, &self.budget)
            .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }

    /// The authenticated caller has resolved the current person body reference.
    /// Retain the installed name owner's accepted change through ordinary saving.
    pub fn begin_owner_nickname(
        &mut self,
        account: &str,
        actor: &str,
        contact: String,
        expected_revision: i64,
        nickname: JsText,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_read(account, actor)
            .map_err(failure)?;
        let cursor = crate::knowledge::KnowledgeEditCursor::nickname(
            actor.into(),
            contact,
            expected_revision,
            nickname,
            &self.budget,
        )
        .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }

    /// Admit only the current player's marker collection to the authoritative
    /// knowledge candidate. The installed map supplies bounds and icon choices.
    pub fn begin_owner_map_marker(
        &mut self,
        account: &str,
        actor: &str,
        edit: super::MapMarkerEdit,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_read(account, actor)
            .map_err(failure)?;
        let cursor =
            crate::knowledge::KnowledgeEditCursor::marker(actor.into(), edit, &self.budget)
                .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }

    /// Bind the authenticated player's own note against current recognition or
    /// their current map marker. Both use the same revisioned document writer.
    pub fn begin_owner_knowledge_edit(
        &mut self,
        account: &str,
        actor: &str,
        subject: Option<KnowledgeSubject>,
        expected_revision: i64,
        text: JsText,
        nickname: Option<(i64, JsText)>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let accepted = self.session.accepted().map_err(failure)?;
        accepted
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &accepted.state;
        let (permitted, nickname) = match &subject {
            None => (true, None),
            Some(KnowledgeSubject::MapMarker { marker_id }) => (
                state
                    .reception
                    .map_markers
                    .as_ref()
                    .and_then(|root| root.get(actor))
                    .is_some_and(|markers| markers.contains_key(marker_id)),
                None,
            ),
            Some(KnowledgeSubject::Place { .. }) => (false, None),
            Some(subject) => {
                let person = match subject {
                    KnowledgeSubject::Entity { entity_id } => ObserverSubject::Entity {
                        entity_id: entity_id.clone(),
                    },
                    KnowledgeSubject::Individual { individual_id } => ObserverSubject::Individual {
                        individual_id: individual_id.clone(),
                    },
                    _ => unreachable!("marker and place subjects handled above"),
                };
                let names = crate::worlds::InstalledPersonalNameReader::prepare(
                    &state.physical,
                    &state.reception,
                    &state.installed,
                    &state.experience,
                    actor,
                )
                .map_err(failure)?;
                let retained = match &person {
                    ObserverSubject::Entity { entity_id } => {
                        names.can_remember_subject(entity_id).map_err(failure)?
                    }
                    ObserverSubject::Individual { .. } => names
                        .observer_individual(&person)
                        .is_some_and(|identity| identity.seed_only != Some(true)),
                };
                let permitted = person.validate()
                    && (retained
                        || super::private_notes::person_notepad(
                            state,
                            actor,
                            &person,
                            &self.budget,
                        )?
                        .is_some());
                (
                    permitted,
                    nickname.map(|(revision, text)| NoteIdentity::Nickname {
                        subject: person,
                        revision,
                        text,
                    }),
                )
            }
        };
        let cursor = KnowledgeEditCursor::note(
            actor.into(),
            KnowledgeEdit {
                subject_id: subject,
                expected_revision,
                text,
            },
            permitted,
            nickname,
            &self.budget,
        )
        .map_err(failure)?;
        self.session.begin_personal_edit(cursor).map_err(failure)
    }

    /// The host checks its current creator and inspection grants. The selected
    /// NPC remains the only writable owner. Creator grants never reach another
    /// player's knowledge, even when the selected subject is personally visible.
    pub fn begin_creator_knowledge_edit(
        &mut self,
        account: &str,
        owner: &str,
        actor: &str,
        subject: Option<KnowledgeSubject>,
        expected_revision: i64,
        text: JsText,
        given_name: Option<(i64, JsText)>,
    ) -> Result<Option<CandidateKey>, RuntimeError> {
        self.require_active()?;
        if actor == owner || !self.private_history_permitted(account, owner, actor)? {
            return Ok(None);
        }
        let identity = match (&subject, given_name) {
            (
                Some(KnowledgeSubject::Entity { entity_id }),
                Some((expected_revision, given_name)),
            ) => Some(NoteIdentity::CreatorName(
                crate::worlds::base_knowledge::NameEdit {
                    subject_id: ObserverSubject::Entity {
                        entity_id: entity_id.clone(),
                    },
                    expected_revision,
                    given_name,
                },
            )),
            (
                Some(KnowledgeSubject::Individual { individual_id }),
                Some((expected_revision, given_name)),
            ) => Some(NoteIdentity::CreatorName(
                crate::worlds::base_knowledge::NameEdit {
                    subject_id: ObserverSubject::Individual {
                        individual_id: individual_id.clone(),
                    },
                    expected_revision,
                    given_name,
                },
            )),
            (Some(KnowledgeSubject::Entity { entity_id }), None) => {
                Some(NoteIdentity::CreatorSubject(entity_id.clone()))
            }
            _ => None,
        };
        let permitted = !matches!(subject, Some(KnowledgeSubject::Place { .. }));
        let cursor = KnowledgeEditCursor::note(
            actor.to_owned(),
            KnowledgeEdit {
                subject_id: subject,
                expected_revision,
                text,
            },
            permitted,
            identity,
            &self.budget,
        )
        .map_err(failure)?;
        self.session
            .begin_personal_edit(cursor)
            .map(Some)
            .map_err(failure)
    }

    /// The authenticated application has checked the exact retained place
    /// source in this accepted turn. The place need not still exist in the
    /// physical world. This permits only this player's private document.
    pub fn begin_owner_place_note(
        &mut self,
        account: &str,
        actor: &str,
        place_id: String,
        expected_revision: i64,
        text: JsText,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_read(account, actor)
            .map_err(failure)?;
        self.session
            .begin_knowledge_edit(
                actor.into(),
                KnowledgeEdit {
                    subject_id: Some(KnowledgeSubject::Place { place_id }),
                    expected_revision,
                    text,
                },
                true,
            )
            .map_err(failure)
    }

    pub fn begin_knowledge_edit(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: KnowledgeInput = serde_json::from_slice(input).map_err(failure)?;
        self.begin_owner_place_note(
            &input.account_id,
            &input.actor_id,
            input.place_id,
            input.expected_revision as i64,
            input.text,
        )
    }
}
