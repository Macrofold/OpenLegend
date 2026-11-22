//! The creator's recall edit uses the complete semantic cursor. Its history
//! reads yield through the ordinary provider boundary; no raw setter is public.
use super::*;
use serde::ser::{SerializeMap, SerializeSeq};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ForgetInput {
    actor_id: String,
    source_id: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CorrectInput {
    actor_id: String,
    source_id: String,
    correction_event_id: String,
}
impl NativeWorldSession {
    /// The application has separately checked Creator and, for another
    /// actor, Inspect. No creator session inherits another player's mind.
    pub fn may_edit_recall(&self, owner: &str, actor: &str) -> Result<bool, RuntimeError> {
        let accepted = self.session.accepted().map_err(failure)?;
        Ok(accepted
            .state
            .physical
            .entities
            .get(actor)
            .is_some_and(|entity| {
                entity.has_memory()
                    && entity
                        .actor
                        .as_ref()
                        .is_some_and(|body| actor == owner || body.controller != "player")
            }))
    }

    /// A disclosed receipt can select an edit only for the same accepted
    /// world, receiving actor and privacy revision. The edit cursor still
    /// proves the addressed receipt and its permitted correction source.
    pub fn recent_receipt_edit_current(
        &self,
        world: &str,
        generation: &str,
        actor: &str,
        life: u64,
        privacy_revision: u64,
    ) -> Result<bool, RuntimeError> {
        let state = &self.session.accepted().map_err(failure)?.state;
        Ok(state.physical.header.id == world
            && state.generation == generation
            && state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.actor.as_ref())
                .is_some_and(|actor| actor.physical_life.unwrap_or(0) == life)
            && state
                .experience
                .actor(actor)
                .map_or(0, |experience| experience.privacy.revision())
                == privacy_revision)
    }
    /// Application authority and retained-source admission remain with the
    /// existing creator service. Native owns the actual protected-obligation
    /// check, scoped erasure, transition, rollback and accepted save products.
    pub fn begin_forget(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: ForgetInput = serde_json::from_slice(input).map_err(failure)?;
        self.begin_recall_edit_direct(&input.actor_id, &input.source_id, None)
    }

    /// Begin the same protected edit from trusted, already decoded application
    /// arguments. Storage and rollback stay with the semantic cursor.
    pub fn begin_recall_edit_direct(
        &mut self,
        actor_id: &str,
        source_id: &str,
        correction: Option<String>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let held = self.held_source_proof(actor_id, source_id)?;
        let edit = match correction {
            Some(event_id) => crate::experience::PrivacyEditMode::Correct { event_id },
            None => crate::experience::PrivacyEditMode::Forget,
        };
        self.session
            .begin_recall_edit(actor_id, source_id, edit, held, self.history_edit_limits)
            .map_err(failure)
    }
    pub fn begin_correct(&mut self, input: &[u8]) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: CorrectInput = serde_json::from_slice(input).map_err(failure)?;
        self.begin_recall_edit_direct(
            &input.actor_id,
            &input.source_id,
            Some(input.correction_event_id),
        )
    }
}

pub struct RuntimePrivacyEdit<'a> {
    edit: &'a crate::experience::CompletedRecallEdit,
    pub actor_id: &'a str,
    pub forgotten: &'a [String],
    pub corrections: &'a indexmap::IndexMap<String, String>,
}

impl RuntimePrivacyEdit<'_> {
    pub fn invalidated_ids(&self) -> impl Iterator<Item = &str> {
        self.edit.invalidated_ids()
    }
}

impl RuntimeProvider {
    pub fn asks_personal_history(&self) -> Result<bool, RuntimeError> {
        Ok(self.question()?.kind() == crate::simulation::ProviderKind::History)
    }
}

impl RuntimePreparedProducts<'_> {
    /// Borrow the complete changed actor constraints and exact invalidated
    /// IDs while the actual protected simulation operation still owns them.
    pub fn privacy_edit(&self) -> Option<RuntimePrivacyEdit<'_>> {
        let CompletedOperation::RecallEdit(edit) = self.operation else {
            return None;
        };
        let (forgotten, corrections) = edit.privacy_constraints()?;
        Some(RuntimePrivacyEdit {
            edit,
            actor_id: edit.actor_id(),
            forgotten,
            corrections,
        })
    }
}
struct Invalidated<'a>(&'a crate::experience::CompletedRecallEdit);
struct Ids<'a>(&'a crate::experience::CompletedRecallEdit);
impl Serialize for Invalidated<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(1))?;
        map.serialize_entry(self.0.actor_id(), &Ids(self.0))?;
        map.end()
    }
}
impl Serialize for Ids<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut list = serializer.serialize_seq(None)?;
        for id in self.0.invalidated_ids() {
            list.serialize_element(id)?;
        }
        list.end()
    }
}
/// Actor-scoped constraints are a complete replacement for this actor only.
/// The existing privacy-ledger owner must retain every other actor's accepted
/// constraints when composing its SQL commit input.
pub(super) fn serialize<M: SerializeMap>(
    operation: &CompletedOperation,
    map: &mut M,
) -> Result<(), M::Error> {
    if let CompletedOperation::RecallEdit(done) = operation {
        if let Some(change) = done.privacy_change() {
            map.serialize_entry("invalidatedMemoryIds", &Invalidated(done))?;
            map.serialize_entry("privacyChange", &change)?;
        }
    }
    if let CompletedOperation::Consolidation(done) = operation {
        if done.outcome.ok {
            struct Retired<'a>(&'a str, &'a [String]);
            impl Serialize for Retired<'_> {
                fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
                    let mut m = s.serialize_map(Some(1))?;
                    m.serialize_entry(self.0, self.1)?;
                    m.end()
                }
            }
            map.serialize_entry("invalidatedMemoryIds", &Retired(&done.actor, &done.retired))?;
        }
    }
    Ok(())
}
