//! Player place-note intentions arrive after exact retained-place admission by
//! the authenticated server. The generic knowledge owner remains the writer.
use super::*;
use crate::knowledge::KnowledgeEdit;
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
    /// Bind the authenticated player's own note against current recognition or
    /// a retained private document before entering the ordinary revisioned writer.
    pub fn begin_owner_knowledge_edit(
        &mut self,
        account: &str,
        actor: &str,
        subject: Option<ObserverSubject>,
        expected_revision: i64,
        text: JsText,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let accepted = self.session.accepted().map_err(failure)?;
        accepted
            .require_player_read(account, actor)
            .map_err(failure)?;
        let state = &accepted.state;
        let mut permitted = true;
        if let Some(person) = &subject {
            let names = crate::worlds::InstalledPersonalNameReader::prepare(
                &state.physical,
                &state.reception,
                &state.installed,
                &state.experience,
                actor,
            )
            .map_err(failure)?;
            let retained = match person {
                ObserverSubject::Entity { entity_id } => {
                    names.can_remember_subject(entity_id).map_err(failure)?
                }
                ObserverSubject::Individual { .. } => names
                    .observer_individual(person)
                    .is_some_and(|identity| identity.seed_only != Some(true)),
            };
            permitted = person.validate()
                && (retained
                    || super::private_notes::person_notepad(state, actor, person, &self.budget)?
                        .is_some());
        }
        self.session
            .begin_knowledge_edit(
                actor.into(),
                KnowledgeEdit {
                    subject_id: subject.map(super::private_notes::person_note_subject),
                    expected_revision,
                    text,
                },
                permitted,
            )
            .map_err(failure)
    }

    pub fn begin_knowledge_edit(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: KnowledgeInput = serde_json::from_slice(input).map_err(failure)?;
        self.session
            .accepted()
            .map_err(failure)?
            .require_player_read(&input.account_id, &input.actor_id)
            .map_err(failure)?;
        // Permission to this place is supplied by the server's selected-source
        // owner, as for remembered movement. It grants neither a physical read
        // nor another character's document. No client permission list enters.
        self.session
            .begin_knowledge_edit(
                input.actor_id,
                KnowledgeEdit {
                    subject_id: Some(KnowledgeSubject::Place {
                        place_id: input.place_id,
                    }),
                    expected_revision: input.expected_revision as i64,
                    text: input.text,
                },
                true,
            )
            .map_err(failure)
    }
}
