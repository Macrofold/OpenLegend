//! The notepad is replaced as one revisioned document. Empty text remains a
//! tombstone, and its provenance never becomes a body or execution grant.
use super::*;
use crate::received::KnowledgeAccountChange;
use crate::reception::ObserverSubject;
use crate::text::JsText;
use crate::values::is_safe_record_id;
use crate::worlds::base_knowledge::{self, NicknameSubject};
use std::sync::LazyLock;

pub(crate) struct KnowledgeEdit {
    pub subject_id: Option<KnowledgeSubject>,
    pub expected_revision: i64,
    pub text: JsText,
}
pub(crate) struct CompletedKnowledgeEdit {
    pub(crate) events: Vec<crate::events::WorldEvent>,
    outcome: Outcome,
    storage: ByteReservation,
}
impl CompletedKnowledgeEdit {
    pub(super) fn from_parts(outcome: Outcome, storage: ByteReservation) -> Self {
        Self {
            outcome,
            storage,
            events: Vec::new(),
        }
    }
    pub(crate) fn include_event(
        &mut self,
        event: crate::events::CompletedEvent,
    ) -> Result<crate::events::CompletedOccurrence, ExecutionError> {
        if self.events.len() == self.events.capacity() {
            let before = self.events.capacity();
            let row = size_of::<crate::events::WorldEvent>();
            self.storage.resize(
                self.storage
                    .bytes()
                    .checked_add(row)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.events
                .try_reserve_exact(1)
                .map_err(|_| ExecutionError::Capacity)?;
            let extra = (self.events.capacity() - before - 1)
                .checked_mul(row)
                .ok_or(ExecutionError::Capacity)?;
            self.storage.resize(
                self.storage
                    .bytes()
                    .checked_add(extra)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
        }
        self.storage.merge(event.reservation)?;
        self.events.push(event.event);
        Ok(event.completed)
    }
    pub(crate) fn outcome(&self) -> &Outcome {
        &self.outcome
    }
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.storage)
    }
}

pub(crate) enum NoteIdentity {
    Nickname {
        subject: ObserverSubject,
        revision: i64,
        text: JsText,
    },
    CreatorName(base_knowledge::NameEdit),
    CreatorSubject(String),
}

impl NoteIdentity {
    fn heap_bytes(&self) -> Option<usize> {
        match self {
            Self::Nickname { subject, text, .. } => {
                subject.heap_bytes()?.checked_add(text.heap_bytes()?)
            }
            Self::CreatorName(name) => name
                .subject_id
                .heap_bytes()?
                .checked_add(name.given_name.heap_bytes()?),
            Self::CreatorSubject(id) => id.heap_bytes(),
        }
    }
}

enum PrivateEdit {
    CreatePerson {
        request: String,
        digest: String,
        draft: Box<crate::runtime::PersonCreation>,
        new: bool,
    },
    Author(crate::runtime::PersonAuthorChange),
    Promise(crate::experience::PromiseAmendment),
    Focus(Option<String>),
    Marker(super::cartography::MapMarkerEdit),
    Note {
        edit: KnowledgeEdit,
        permitted: bool,
        identity: Option<NoteIdentity>,
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
    pub(crate) fn condition_subject(
        &self,
        installed: &crate::simulation::InstalledWorld,
    ) -> Option<&str> {
        if self.is_creating_person() {
            return Some(&self.actor_id);
        }
        matches!(&self.edit, PrivateEdit::Author(crate::runtime::PersonAuthorChange::Attribute(edit))
            if edit.value != edit.expected_value && installed.attributes.get(&edit.id).is_some_and(|d|d.value().condition.is_some())).then_some(self.actor_id.as_str())
    }
    pub(crate) fn is_creating_person(&self) -> bool {
        matches!(self.edit, PrivateEdit::CreatePerson { new: true, .. })
    }
    pub(crate) fn create_person(
        id: Option<String>,
        request: String,
        digest: String,
        draft: crate::runtime::PersonCreation,
        bytes: usize,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage =
            budget.reserve(size_of::<Self>() + bytes + id.as_ref().map_or(0, String::capacity))?;
        let new = id.is_some();
        Ok(Self {
            actor_id: id.unwrap_or_default(),
            edit: PrivateEdit::CreatePerson {
                request,
                digest,
                draft: Box::new(draft),
                new,
            },
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn author(
        actor: &str,
        change: crate::runtime::PersonAuthorChange,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(size_of::<Self>() + actor.len() + change.input_bytes())?;
        Ok(Self {
            actor_id: actor.to_owned(),
            edit: PrivateEdit::Author(change),
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn focus(
        actor_id: &str,
        contact: Option<String>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor_id.len(),
                contact.as_ref().map_or(0, String::capacity),
            ])
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
        Ok(Self {
            actor_id,
            edit: PrivateEdit::Promise(edit),
            done: false,
            _storage: storage,
        })
    }

    pub(crate) fn new(
        actor_id: String,
        edit: KnowledgeEdit,
        permitted: bool,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::note(actor_id, edit, permitted, None, budget)
    }

    pub(crate) fn note(
        actor_id: String,
        edit: KnowledgeEdit,
        permitted: bool,
        identity: Option<NoteIdentity>,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let name_bytes = identity
            .as_ref()
            .map_or(Some(0), NoteIdentity::heap_bytes)
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor_id.heap_bytes().ok_or(ExecutionError::Capacity)?,
                name_bytes,
                edit.subject_id
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                edit.text.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            actor_id,
            edit: PrivateEdit::Note {
                edit,
                permitted,
                identity,
            },
            done: false,
            _storage: storage,
        })
    }
    pub(crate) fn marker(
        actor_id: String,
        edit: super::cartography::MapMarkerEdit,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let storage = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                actor_id.capacity(),
                edit.heap_bytes().ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
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
            PrivateEdit::CreatePerson {
                request,
                digest,
                draft,
                ..
            } => create_person(core, &self.actor_id, request, digest, draft, budget),
            PrivateEdit::Author(change) => {
                super::author::apply(core, &self.actor_id, change, budget)
            }
            PrivateEdit::Promise(edit) => {
                crate::experience::amend_owned_promise(core, &self.actor_id, edit, budget).and_then(
                    |changed| {
                        if changed {
                            result(
                                true,
                                "commitment-updated",
                                "Native obligation updated.",
                                budget,
                            )
                        } else {
                            result(
                                false,
                                "commitment-rejected",
                                "Stale or unsupported obligation change.",
                                budget,
                            )
                        }
                    },
                )
            }
            PrivateEdit::Focus(contact) => {
                edit_focus(core, &self.actor_id, contact.as_deref(), budget)
            }
            PrivateEdit::Marker(edit) => {
                super::cartography::edit_marker(core, &self.actor_id, edit, budget)
            }
            PrivateEdit::Note {
                edit,
                permitted,
                identity,
            } => edit_note(
                core,
                &self.actor_id,
                edit,
                *permitted,
                identity.as_ref(),
                budget,
            ),
            PrivateEdit::Nickname {
                contact,
                revision,
                nickname,
            } => base_knowledge::assign_nickname(
                core,
                &self.actor_id,
                NicknameSubject::Contact(contact),
                *revision,
                nickname,
                budget,
            )
            .map(|edit| {
                let (outcome, storage) = edit.into_parts();
                CompletedKnowledgeEdit::from_parts(outcome, storage)
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

/// The name owner and note owner share the enclosing candidate checkpoint.
fn edit_note(
    core: &mut CoreMutation<'_>,
    actor: &str,
    edit: &KnowledgeEdit,
    permitted: bool,
    identity: Option<&NoteIdentity>,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    let named = match identity {
        Some(_) if !permitted => {
            return result(
                false,
                "unpermitted-subject",
                "This person is unavailable.",
                budget,
            );
        }
        Some(NoteIdentity::Nickname {
            subject,
            revision,
            text,
        }) => Some(base_knowledge::assign_nickname(
            core,
            actor,
            NicknameSubject::Remembered(subject),
            *revision,
            text,
            budget,
        )?),
        Some(NoteIdentity::CreatorName(name)) => Some(base_knowledge::assign_creator_name(
            core, actor, name, budget,
        )?),
        _ => None,
    };
    if let Some(named) = named {
        let (outcome, storage) = named.into_parts();
        if !outcome.ok {
            return Ok(CompletedKnowledgeEdit::from_parts(outcome, storage));
        }
    }
    let readback = edit_knowledge(
        core,
        actor,
        edit,
        if permitted {
            edit.subject_id.as_slice()
        } else {
            &[]
        },
        &[],
        budget,
    )?;
    if readback.outcome().ok
        && let Some(NoteIdentity::CreatorSubject(subject)) = identity
    {
        base_knowledge::remember_authored_subject(core, actor, subject, budget)?;
    }
    Ok(readback)
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
        return result(
            false,
            "attention-unavailable",
            &FOCUS_COPY.unavailable,
            budget,
        );
    }
    let message = if contact.is_some() {
        &FOCUS_COPY.focused
    } else {
        &FOCUS_COPY.cleared
    };
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
    Ok(CompletedKnowledgeEdit::from_parts(outcome, storage))
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

fn create_person(
    core: &mut CoreMutation<'_>,
    id: &str,
    request: &str,
    digest: &str,
    draft: &crate::runtime::PersonCreation,
    budget: &ByteBudget,
) -> Result<CompletedKnowledgeEdit, ExecutionError> {
    if let Some(prior) = core.state.commands.get(request) {
        if prior.receipt.digest != digest {
            return result(
                false,
                "identity",
                "That request identity was already used.",
                budget,
            );
        }
        let outcome = &prior.receipt.outcome;
        let storage = budget.reserve(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        return Ok(CompletedKnowledgeEdit::from_parts(outcome.clone(), storage));
    }
    if let Err((code, reason)) = core.create_person(id, draft, budget)? {
        return result(false, code, reason, budget);
    }
    let mut completed = result(true, "spawned", "Character added.", budget)?;
    completed
        .storage
        .resize(completed.storage.bytes() + id.len())?;
    completed.outcome.entity_id = Some(id.into());
    core.journal.commands.append(
        &mut core.state.commands,
        request,
        digest,
        &completed.outcome,
    )?;
    Ok(completed)
}
