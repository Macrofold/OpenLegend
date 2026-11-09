//! An explicit private label changes the already supported individual. Its
//! exact evidence remains with the same sparse retention and identity owners
//! as introductions, without creating new recognition or a physical grant.
use super::learn_introduction::{can_name, clone_identity};
use super::name_evidence::{release_created, retain_name_evidence};
use super::*;
use crate::commands::Outcome;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::HeapBytes;
use crate::text::JsText;
use crate::values::is_safe_record_id;
use crate::worlds::base_recognition::commit_observer_identity;

pub(crate) struct NameEdit {
    pub subject_id: ObserverSubject,
    pub expected_revision: i64,
    pub given_name: JsText,
}
pub(crate) struct CompletedNameEdit {
    outcome: Outcome,
    storage: ByteReservation,
}
impl CompletedNameEdit {
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.storage)
    }
}
fn result(
    ok: bool,
    code: &str,
    message: &str,
    budget: &ByteBudget,
) -> Result<CompletedNameEdit, ExecutionError> {
    let mut storage = budget.reserve(
        code.len()
            .checked_add(message.len())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let outcome = Outcome {
        ok,
        code: code.into(),
        message: message.into(),
        spent: None,
        outputs: None,
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    };
    storage.resize(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok(CompletedNameEdit { outcome, storage })
}
fn exhausted(core: &CoreMutation<'_>, observer: &str, revision: u64) -> bool {
    revision >= crate::identity::MAX_SAFE_INTEGER
        || core
            .state
            .reception
            .knowledge_revisions
            .as_ref()
            .and_then(|root| root.get(observer))
            .is_some_and(|revision| *revision >= crate::identity::MAX_SAFE_INTEGER)
}
pub(crate) fn assign_subject_name(
    core: &mut CoreMutation<'_>,
    observer: &str,
    edit: &NameEdit,
    permitted: &[ObserverSubject],
    evidence: &[String],
    budget: &ByteBudget,
) -> Result<CompletedNameEdit, ExecutionError> {
    if !permitted.contains(&edit.subject_id) {
        return result(
            false,
            "unpermitted-subject",
            "The identity subject was not supplied.",
            budget,
        );
    }
    let names = PersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer,
    )?;
    let current = names.observer_individual(&edit.subject_id);
    let entity = match &edit.subject_id {
        ObserverSubject::Entity { entity_id } => {
            if !is_safe_record_id(entity_id)
                || !core
                    .state
                    .physical
                    .entities
                    .get(observer)
                    .is_some_and(|e| e.actor.is_some())
                || core.state.physical.entities.get(entity_id).is_none()
            {
                return result(
                    false,
                    "unpermitted-subject",
                    "The identity subject was not supplied.",
                    budget,
                );
            }
            if observer == entity_id {
                return result(
                    false,
                    "self-identity",
                    "Self-name comes from authored character identity.",
                    budget,
                );
            }
            if edit.expected_revision < 0
                || edit.expected_revision as u64 != current.map_or(0, |i| i.revision)
            {
                return result(
                    false,
                    "stale-identity",
                    "The preferred name changed.",
                    budget,
                );
            }
            if !names.can_remember_subject(entity_id)?
                && !names.can_address_remembered_subject(entity_id)
            {
                return result(
                    false,
                    "recognition-unavailable",
                    "No supported continuous encounter binds this individual; existing knowledge was retained.",
                    budget,
                );
            }
            Some(entity_id.as_str())
        }
        ObserverSubject::Individual { .. } => {
            if !current
                .map(|identity| can_name(&names, &edit.subject_id, identity))
                .transpose()?
                .unwrap_or(false)
            {
                return result(
                    false,
                    "recognition-unavailable",
                    "No learned individual supports this name.",
                    budget,
                );
            }
            if edit.expected_revision < 0
                || Some(edit.expected_revision as u64) != current.map(|i| i.revision)
            {
                return result(
                    false,
                    "stale-identity",
                    "The preferred name changed.",
                    budget,
                );
            }
            None
        }
    };
    let rules = core.state.installed.name_rules.value();
    if edit.given_name.trim_is_empty()
        || edit.given_name.character_count() as u64 > rules.given_name_characters
    {
        return result(
            false,
            "invalid-given-name",
            "A preferred name must contain 1–120 characters.",
            budget,
        );
    }
    let _trim_guard = budget.reserve(edit.given_name.storage_bytes())?;
    let name = edit.given_name.trimmed();
    if current.is_some_and(|identity| identity.given_name == name) {
        return result(
            true,
            "given-name-unchanged",
            "Preferred name is already current.",
            budget,
        );
    }
    if exhausted(
        core,
        observer,
        current.map_or(0, |identity| identity.revision),
    ) {
        return result(
            false,
            "identity-revision-exhausted",
            "The preferred name cannot accept another revision; its previous value was retained.",
            budget,
        );
    }
    let (mut candidate, _candidate_guard) = match current {
        Some(identity) => clone_identity(identity, &name, budget)?,
        None => {
            let storage = budget.reserve(name.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            (
                ObserverIdentity {
                    retained: None,
                    familiarity: None,
                    individual_id: None,
                    canonical_id: None,
                    seed_only: None,
                    voice: None,
                    sight: None,
                    name_evidence_ids: None,
                    given_name: name,
                    nickname: None,
                    revision: 0,
                    encounter_id: None,
                    authored: false,
                },
                storage,
            )
        }
    };
    let key_bytes = candidate
        .individual_id
        .as_ref()
        .map_or(observer.len() + 64, String::len);
    let _key_guard = budget.reserve(
        key_bytes
            .checked_mul(2)
            .and_then(|n| n.checked_add(entity.map_or(0, str::len)))
            .and_then(|n| n.checked_add(names.episode(entity.unwrap_or("")).map_or(0, String::len)))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let episode = entity.and_then(|id| names.episode(id)).cloned();
    drop(names);
    // Source creates the structural identity owner before retention can refuse.
    if entity.is_some() {
        core.journal
            .recognition
            .ensure_observer(&mut core.state.reception, observer)?;
    }
    let key = match &candidate.individual_id {
        Some(id) => id.clone(),
        None => allocate_individual(&mut core.state.physical, &core.state.reception, observer)?,
    };
    let Some(held) = retain_name_evidence(core, observer, evidence, None, budget)? else {
        return result(
            false,
            "knowledge-capacity",
            "The exact introduction could not be retained; the previous name was retained.",
            budget,
        );
    };
    candidate.revision += 1;
    if let Some(entity) = entity {
        candidate.individual_id = Some(key.clone());
        candidate.canonical_id = Some(entity.into());
        candidate.encounter_id = episode;
    }
    candidate.name_evidence_ids = Some(held.ids);
    if !commit_observer_identity(core, observer, &key, candidate, budget)? {
        release_created(core, observer, &held.created, budget)?;
        return result(
            false,
            "knowledge-capacity",
            "Personal knowledge is full; the previous name was retained.",
            budget,
        );
    }
    core.journal.recognition.advance_revision(
        &mut core.state.reception,
        observer,
        &mut core.journal.cognition,
    )?;
    result(
        true,
        "given-name-edited",
        "Observer-specific given name updated.",
        budget,
    )
}
