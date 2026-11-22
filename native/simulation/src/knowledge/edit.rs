//! The notepad is replaced as one revisioned document. Empty text remains a
//! tombstone, and its provenance never becomes a body or execution grant.
use super::*;
use crate::received::KnowledgeAccountChange;
use crate::text::JsText;
use crate::values::is_safe_record_id;
use std::sync::LazyLock;

pub(crate) struct KnowledgeEdit {
    pub subject_id: Option<KnowledgeSubject>,
    pub expected_revision: i64,
    pub text: JsText,
}
pub(crate) struct CompletedKnowledgeEdit {
    outcome: Outcome,
    storage: ByteReservation,
}
impl CompletedKnowledgeEdit {
    pub(crate) fn outcome(&self) -> &Outcome {
        &self.outcome
    }
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.storage)
    }
}

enum PrivateEdit {
    Promise(crate::experience::PromiseAmendment),
    Focus(Option<String>),
    Marker(super::cartography::MapMarkerEdit),
    Note {
        edit: KnowledgeEdit,
        permitted: bool,
    },
    Nickname {
        contact: String,
        revision: i64,
        nickname: JsText,
    },
}

/// Run an owner-authorized personal edit under the shared undo checkpoint.
/// Each edit calls its existing record owner, which retains its own rules.
pub(crate) struct KnowledgeEditCursor {
    actor_id: String,
    edit: PrivateEdit,
    done: bool,
    _storage: ByteReservation,
}
impl KnowledgeEditCursor {
    pub(crate) fn focus(
        actor_id: &str,
        contact: Option<String>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([size_of::<Self>(), actor_id.len(), contact.as_ref().map_or(0, String::capacity)])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor_id: actor_id.to_owned(),
            edit: PrivateEdit::Focus(contact),
            done: false,
            _storage: storage,
        })
    }

    pub(crate) fn promise(
        actor_id: String,
        edit: crate::experience::PromiseAmendment,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([size_of::<Self>(), actor_id.capacity(), edit.input_bytes()])
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self { actor_id, edit: PrivateEdit::Promise(edit), done: false, _storage: storage })
    }

    pub(crate) fn new(
        actor_id: String,
        edit: KnowledgeEdit,
        permitted: bool,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor_id.heap_bytes().ok_or(ExecutionError::Capacity)?,
                edit.subject_id
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                edit.text.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor_id,
            edit: PrivateEdit::Note { edit, permitted },
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn marker(
        actor_id: String,
        edit: super::cartography::MapMarkerEdit,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(heap_sum([
            size_of::<Self>(), actor_id.capacity(),
            edit.heap_bytes().ok_or(ExecutionError::Capacity)?,
        ]).ok_or(ExecutionError::Capacity)?)?;
        Ok(Self {
            actor_id,
            edit: PrivateEdit::Marker(edit),
            done: false,
            _storage: storage,
        })
    }

    pub(crate) fn nickname(
        actor_id: String,
        contact: String,
        revision: i64,
        nickname: JsText,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor_id.capacity(),
                contact.capacity(),
                nickname.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor_id,
            edit: PrivateEdit::Nickname {
                contact,
                revision,
                nickname,
            },
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<CompletedKnowledgeEdit, ExecutionError> {
        if self.done {
            return Err(ExecutionError::Invariant);
        }
        self.done = true;
        let checkpoint = core.journal.checkpoint(core.state)?;
        let result = match &self.edit {
            PrivateEdit::Promise(edit) => crate::experience::amend_owned_promise(
                core, &self.actor_id, edit, budget,
            ).and_then(|changed| {
                if changed {
                    result(true, "commitment-updated", "Native obligation updated.", budget)
                } else {
                    result(false, "commitment-rejected", "Stale or unsupported obligation change.", budget)
                }
            }),
            PrivateEdit::Focus(contact) => edit_focus(core, &self.actor_id, contact.as_deref(), budget),
            PrivateEdit::Marker(edit) => super::cartography::edit_marker(core, &self.actor_id, edit, budget),
            PrivateEdit::Note { edit, permitted } => edit_knowledge(
                core,
                &self.actor_id,
                edit,
                if *permitted {
                    edit.subject_id.as_slice()
                } else {
                    &[]
                },
                &[],
                budget,
            ),
            PrivateEdit::Nickname {
                contact,
                revision,
                nickname,
            } => crate::worlds::base_knowledge::assign_nickname(
                core,
                &self.actor_id,
                contact,
                *revision,
                nickname,
                budget,
            )
            .map(|edit| {
                let (outcome, storage) = edit.into_parts();
                CompletedKnowledgeEdit { outcome, storage }
            }),
        };
        match result {
            Ok(result) => {
                // Source's owner editor discards refused edits, including the
                // empty accounting owners prepared by a quota refusal.
                if result.outcome().ok {
                    core.journal.keep(core.state, checkpoint)?;
                } else {
                    core.journal.rollback_to(core.state, checkpoint)?;
                }
                Ok(result)
            }
            Err(error) => {
                core.journal.rollback_to(core.state, checkpoint)?;
                Err(error)
            }
        }
    }
}

#[derive(serde::Deserialize)]
struct FocusCopy {
    focused: String,
    cleared: String,
    unavailable: String,
}

static FOCUS_COPY: LazyLock<FocusCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/worlds/base/attention-focus-copy.json"
    ))
    .expect("authored attention preference language")
});

fn edit_focus(
    core: &mut CoreMutation<'_>,
    actor: &str,
    contact: Option<&str>,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    if core.state.physical.header.paused {
        return result(false, "paused", "Resume the world before acting.", budget);
    }
    if !crate::reception::set_player_attention_target(core, actor, contact, budget)? {
        return result(false, "attention-unavailable", &FOCUS_COPY.unavailable, budget);
    }
    let message = if contact.is_some() { &FOCUS_COPY.focused } else { &FOCUS_COPY.cleared };
    result(true, "attention-selected", message, budget)
}

pub(super) fn result(
    ok: bool,
    code: &str,
    message: &str,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    let mut storage = budget.reserve(
        code.len()
            .checked_add(message.len())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let outcome = Outcome {
        spent: None,
        outputs: None,
        ok,
        code: code.into(),
        message: message.into(),
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    };
    storage.resize(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(CompletedKnowledgeEdit { outcome, storage })
}
fn valid_subject(subject: &KnowledgeSubject) -> bool {
    match subject {
        KnowledgeSubject::Entity { entity_id } => is_safe_record_id(entity_id),
        KnowledgeSubject::Individual { individual_id } => is_safe_record_id(individual_id),
        KnowledgeSubject::Place { place_id } => is_safe_record_id(place_id),
        KnowledgeSubject::MapMarker { marker_id } => is_safe_record_id(marker_id),
    }
}
pub(crate) fn edit_knowledge(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    edit: &KnowledgeEdit,
    permitted_subjects: &[KnowledgeSubject],
    evidence_ids: &[String],
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    let installed = core.state.installed.clone();
    let Some(policy) = &installed.retained.knowledge_limits else {
        return result(
            false,
            "knowledge-unavailable",
            "Knowledge is unavailable for this actor.",
            budget,
        );
    };
    if !is_safe_record_id(actor_id)
        || !core
            .state
            .physical
            .entities
            .get(actor_id)
            .is_some_and(|entity| entity.actor.is_some())
    {
        return result(
            false,
            "knowledge-unavailable",
            "Knowledge is unavailable for this actor.",
            budget,
        );
    }
    let key_bound = edit
        .subject_id
        .heap_bytes()
        .and_then(|n| n.checked_mul(6))
        .and_then(|n| n.checked_add(128))
        .ok_or(ExecutionError::Capacity)?;
    let _key_storage = budget.reserve(key_bound)?;
    let key = knowledge_key(edit.subject_id.as_ref())?;
    let current = core
        .state
        .reception
        .actor_knowledge
        .as_ref()
        .and_then(|root| root.get(actor_id))
        .and_then(|docs| docs.get(&key));
    if let Some(subject) = &edit.subject_id {
        let exists = match subject {
            KnowledgeSubject::Place { .. } => true,
            KnowledgeSubject::MapMarker { marker_id } => {
                current.is_some()
                    || core
                        .state
                        .reception
                        .map_markers
                        .as_ref()
                        .and_then(|root| root.get(actor_id))
                        .is_some_and(|markers| markers.contains_key(marker_id))
            }
            KnowledgeSubject::Entity { entity_id } => {
                current.is_some() || core.state.physical.entities.get(entity_id).is_some()
            }
            KnowledgeSubject::Individual { individual_id } => {
                current.is_some()
                    || core
                        .state
                        .reception
                        .observer_identities
                        .as_ref()
                        .and_then(|root| root.get(actor_id))
                        .and_then(|identities| identities.get(individual_id))
                        .is_some_and(|identity| {
                            identity.individual_id.as_ref() == Some(individual_id)
                        })
            }
        };
        if !valid_subject(subject) || !permitted_subjects.contains(subject) || !exists {
            return result(
                false,
                "unpermitted-subject",
                "The knowledge subject was not supplied.",
                budget,
            );
        }
    }
    let before_revision = current.map_or(0, |document| document.revision);
    if edit.expected_revision < 0 || edit.expected_revision as u64 != before_revision {
        return result(
            false,
            "stale-knowledge",
            "The knowledge document changed; read its current revision.",
            budget,
        );
    }
    let limit = if edit.subject_id.is_none() {
        policy.max_characters.general
    } else {
        policy.max_characters.subject
    };
    if edit.text.character_count() as u64 > limit {
        let _message = budget.reserve(160)?;
        return result(
            false,
            "knowledge-overflow",
            &format!(
                "Rewrite the complete notepad within {limit} characters; the previous text was retained."
            ),
            budget,
        );
    }
    if core
        .state
        .experience
        .actor(actor_id)
        .is_some_and(|actor| evidence_ids.iter().any(|id| actor.privacy.is_forgotten(id)))
    {
        return result(
            false,
            "forgotten-evidence",
            "Knowledge cannot retain forgotten evidence.",
            budget,
        );
    }
    if current.is_some_and(|document| document.text == edit.text) {
        return result(
            true,
            "knowledge-unchanged",
            "Knowledge is already current.",
            budget,
        );
    }
    let knowledge_revision = core
        .state
        .reception
        .knowledge_revisions
        .as_ref()
        .and_then(|root| root.get(actor_id))
        .copied()
        .unwrap_or(0);
    if before_revision >= crate::identity::MAX_SAFE_INTEGER
        || knowledge_revision >= crate::identity::MAX_SAFE_INTEGER
    {
        return result(
            false,
            "knowledge-revision-exhausted",
            "The knowledge document cannot accept another revision; its previous text was retained.",
            budget,
        );
    }
    let previous = current.map(|entry| &**entry);
    let evidence = if edit.text.is_empty() {
        &[][..]
    } else if evidence_ids.is_empty() {
        previous.map_or(&[][..], |document| document.evidence_ids.as_slice())
    } else {
        evidence_ids
    };
    let strings = evidence
        .iter()
        .try_fold(0usize, |n, id| n.checked_add(id.len()))
        .ok_or(ExecutionError::Capacity)?;
    let bytes = heap_sum([
        edit.subject_id
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?,
        edit.text.heap_bytes().ok_or(ExecutionError::Capacity)?,
        evidence
            .len()
            .checked_mul(size_of::<String>())
            .ok_or(ExecutionError::Capacity)?,
        strings,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(bytes)?;
    let mut retained = Vec::with_capacity(evidence.len());
    for id in evidence {
        if !retained.contains(id) {
            retained.push(id.clone());
        }
    }
    let next = KnowledgeDocument {
        origin: KnowledgeOrigin::ActorEdit,
        subject_id: edit.subject_id.clone(),
        text: edit.text.clone(),
        revision: before_revision + 1,
        evidence_ids: retained,
    };
    storage.resize(next.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    let before_bytes = previous
        .filter(|document| document.origin == KnowledgeOrigin::ActorEdit)
        .map(crate::encoding::json_record_len)
        .transpose()
        .map_err(|_| ExecutionError::Invariant)?
        .map(|n| n as u64);
    let after_bytes =
        crate::encoding::json_record_len(&next).map_err(|_| ExecutionError::Invariant)? as u64;
    let dropped = previous.is_some_and(|document| {
        document
            .evidence_ids
            .iter()
            .any(|id| !next.evidence_ids.contains(id))
    });
    // Source creates these structural owners before its quota decision. A
    // refused document must preserve that real empty-owner side effect; an
    // outer operation rollback still restores the original absence exactly.
    core.journal
        .knowledge
        .ensure_observer(&mut core.state.reception.actor_knowledge, actor_id)?;
    crate::received::ensure_experience_accounting(core, actor_id, budget)?;
    // Existing cold totals and sparse supports remain the canonical account
    // owner. Unknown bootstrap/partial ownership cannot be guessed as zero.
    if !core.state.temporal.adjust_retained_knowledge(
        actor_id,
        KnowledgeAccountChange {
            before_bytes,
            after_bytes: Some(after_bytes),
            required: false,
            revocation: false,
        },
        core.state.physical.header.sim_time,
        &installed.attention.value().retention,
    )? {
        return result(
            false,
            "knowledge-capacity",
            "Personal knowledge is full; the previous document was retained.",
            budget,
        );
    }
    core.journal.knowledge.replace(
        &mut core.state.reception.actor_knowledge,
        actor_id,
        key,
        next,
        storage,
    )?;
    if dropped {
        core.state.temporal.mark_support_dirty(actor_id, None)?;
    }
    core.journal.recognition.advance_revision(
        &mut core.state.reception,
        actor_id,
        &mut core.journal.cognition,
    )?;
    result(true, "knowledge-edited", "Knowledge updated.", budget)
}
