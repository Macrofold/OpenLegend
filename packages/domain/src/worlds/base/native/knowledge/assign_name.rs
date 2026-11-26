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
pub(crate) enum NicknameSubject<'a> {
    Contact(&'a str),
    Remembered(&'a ObserverSubject),
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
    assign_name(core, observer, edit, permitted, evidence, false, budget)
}

/// A creator's canonical acquaintance is selected authored knowledge. An
/// observer-local individual still needs its own retained recognition.
pub(crate) fn assign_creator_name(
    core: &mut CoreMutation<'_>,
    observer: &str,
    edit: &NameEdit,
    budget: &ByteBudget,
) -> Result<CompletedNameEdit, ExecutionError> {
    let authored = matches!(&edit.subject_id, ObserverSubject::Entity { .. });
    assign_name(
        core,
        observer,
        edit,
        std::slice::from_ref(&edit.subject_id),
        &[],
        authored,
        budget,
    )
}

fn assign_name(
    core: &mut CoreMutation<'_>,
    observer: &str,
    edit: &NameEdit,
    permitted: &[ObserverSubject],
    evidence: &[String],
    authored: bool,
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
            if !authored
                && !names.can_remember_subject(entity_id)?
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
    if current
        .is_some_and(|identity| identity.given_name == name && (!authored || identity.authored))
    {
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
    let _voice = if let Some(entity) = entity {
        candidate.individual_id = Some(key.clone());
        candidate.canonical_id = Some(entity.into());
        candidate.encounter_id = episode;
        if authored {
            candidate.authored = true;
            install_authored_voice(core, observer, entity, &mut candidate, budget)?
        } else {
            None
        }
    } else {
        None
    };
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

/// Preserve Source's authored acquaintance without inventing a received sample.
fn install_authored_voice(
    core: &CoreMutation<'_>,
    observer: &str,
    source: &str,
    identity: &mut ObserverIdentity,
    budget: &ByteBudget,
) -> Result<Option<ByteReservation>, ExecutionError> {
    use crate::worlds::base_recognition::{
        AuthoredExemplar, AuthoredFamiliarity, AuthoredRecognition, FamiliarityState,
        RecognitionBaseline, RecognitionKnowledge,
    };
    if identity
        .voice
        .as_ref()
        .is_some_and(|voice| voice.authored.is_some())
    {
        return Ok(None);
    }
    let physical = &core.state.physical;
    let Some(profile) = physical
        .entities
        .get(source)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.voice_profile.as_ref())
    else {
        return Ok(None);
    };
    let observer_body = physical
        .entities
        .get(observer)
        .ok_or(ExecutionError::Invariant)?;
    let Some(attribute) = observer_body
        .actor
        .as_ref()
        .and_then(|actor| actor.individual_recognition.as_ref())
        .and_then(|binding| core.state.installed.attributes.get(&binding.attribute_id))
    else {
        return Ok(None);
    };
    let Some(crate::values::AttributeValue::Number(perception)) = crate::status::read_attribute(
        observer_body,
        attribute.value(),
        physical.pending_values.as_ref(),
    )
    .map_err(|_| ExecutionError::Invariant)?
    else {
        return Ok(None);
    };
    let policy = core.state.installed.recognition.value();
    let authored_key = &("authored-acquaintance", source, &policy.id, policy.version);
    let key_bytes =
        crate::encoding::json_record_len(authored_key).map_err(|_| ExecutionError::Invariant)?;
    let custody = budget.reserve(
        2048_usize
            .checked_add(key_bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let key = crate::encoding::json_record(authored_key).map_err(|_| ExecutionError::Invariant)?;
    let order = core
        .state
        .reception
        .observer_identities
        .as_ref()
        .and_then(|root| root.get(observer))
        .map_or(0, |entries| entries.len()) as f64;
    identity.voice = Some(RecognitionKnowledge {
        samples: Vec::new(),
        authored: Some(AuthoredRecognition {
            source: key.clone(),
            installed_at: physical.header.sim_time,
            perception,
            order,
            baseline: RecognitionBaseline::Familiar,
            exemplars: vec![AuthoredExemplar {
                features: profile.received_features(),
                quality: 1.0,
                ordinal: 0.0,
            }],
        }),
        last_credit_at: None,
        next_credit_at: None,
    });
    identity.familiarity = Some(FamiliarityState {
        roots: Vec::new(),
        fast_credits: 0,
        last_credit_at: None,
        next_credit_at: None,
        authored: Some(AuthoredFamiliarity {
            source: key,
            value: 100.0,
        }),
    });
    Ok(Some(custody))
}

/// Creator notes on an entity record an authored association without adding
/// a name or a voice profile. A full optional allowance keeps the prior identity.
pub(crate) fn remember_authored_subject(
    core: &mut CoreMutation<'_>,
    observer: &str,
    subject: &str,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let names = PersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer,
    )?;
    let _target = budget.reserve(256 + subject.len())?;
    let selected = ObserverSubject::Entity {
        entity_id: subject.to_owned(),
    };
    let previous = names.observer_individual(&selected);
    if previous.is_some_and(|existing| existing.authored) {
        return Ok(());
    }
    let (next, _previous) = if let Some(prior) = previous {
        let (mut next, storage) = clone_identity(prior, &prior.given_name, budget)?;
        next.revision = next
            .revision
            .checked_add(1)
            .filter(|next| *next <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Capacity)?;
        next.authored = true;
        (next, Some(storage))
    } else {
        let candidate = ObserverIdentity {
            retained: None,
            familiarity: None,
            individual_id: None,
            canonical_id: Some(subject.to_owned()),
            seed_only: None,
            voice: None,
            sight: None,
            name_evidence_ids: None,
            given_name: JsText::default(),
            nickname: None,
            revision: 0,
            encounter_id: names.episode(subject).cloned(),
            authored: true,
        };
        (candidate, None)
    };
    let changed = previous.is_some();
    drop(names);
    let mut next = next;
    let key = match &next.individual_id {
        Some(key) => key.clone(),
        None if changed => return Ok(()),
        None => allocate_individual(&mut core.state.physical, &core.state.reception, observer)?,
    };
    if next.individual_id.is_none() {
        next.individual_id = Some(key.clone());
    }
    if commit_observer_identity(core, observer, &key, next, budget)? && changed {
        core.journal.recognition.advance_revision(
            &mut core.state.reception,
            observer,
            &mut core.journal.cognition,
        )?;
    }
    Ok(())
}

/// Save a label for a current or remembered person. The accepted observer
/// identity owns naming; a retained note alone supplies no recognition.
pub(crate) fn assign_nickname(
    core: &mut CoreMutation<'_>,
    observer: &str,
    target: NicknameSubject<'_>,
    expected_revision: i64,
    nickname: &JsText,
    budget: &ByteBudget,
) -> Result<CompletedNameEdit, ExecutionError> {
    let names = PersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        observer,
    )?;
    let contact = match &target {
        NicknameSubject::Contact(contact) => *contact,
        NicknameSubject::Remembered(_) => "",
    };
    let _subject = budget.reserve(256 + observer.len() + contact.len())?;
    let subject = match target {
        NicknameSubject::Contact(contact) => names
            .current_body_subject(contact)?
            .filter(|_| {
                contact != observer
                    && core
                        .state
                        .physical
                        .entities
                        .get(contact)
                        .is_some_and(|entity| entity.actor.is_some())
            })
            .map(std::borrow::Cow::Owned),
        NicknameSubject::Remembered(subject) => subject
            .validate()
            .then_some(std::borrow::Cow::Borrowed(subject)),
    };
    let Some(subject) = subject.filter(|subject| {
        !matches!(
            subject.as_ref(), ObserverSubject::Entity { entity_id } if entity_id == observer
        )
    }) else {
        return result(
            false,
            "unpermitted-subject",
            "This person is unavailable.",
            budget,
        );
    };
    let current = names.observer_individual(&subject);
    let entity = match subject.as_ref() {
        ObserverSubject::Entity { entity_id } => Some(entity_id.as_str()),
        ObserverSubject::Individual { .. } => None,
    };
    let recognized = match current {
        Some(identity) => identity.seed_only != Some(true),
        None => match entity {
            Some(id) => names.can_remember_subject(id)?,
            None => false,
        },
    };
    if !recognized {
        return result(
            false,
            "recognition-unavailable",
            "This person is no longer recognized.",
            budget,
        );
    }
    let revision = current.map_or(0, |identity| identity.revision);
    if u64::try_from(expected_revision) != Ok(revision) {
        return result(
            false,
            "stale-identity",
            "The name changed. Read it again before editing.",
            budget,
        );
    }
    let _text = budget.reserve(nickname.storage_bytes() + 128)?;
    let nickname = nickname.trimmed();
    let limit = core.state.installed.name_rules.value().nickname_characters;
    if nickname.character_count() as u64 > limit {
        return result(
            false,
            "invalid-nickname",
            &format!("Keep the nickname within {limit} characters."),
            budget,
        );
    }
    if current
        .and_then(|identity| identity.nickname.as_ref())
        .map_or_else(|| nickname.is_empty(), |previous| previous == &nickname)
    {
        return result(
            true,
            "nickname-unchanged",
            "Your nickname is already current.",
            budget,
        );
    }
    if exhausted(core, observer, revision) {
        return result(
            false,
            "identity-exhausted",
            "This name cannot be edited further.",
            budget,
        );
    }
    let mut bytes = current
        .map_or(Some(0), HeapBytes::heap_bytes)
        .ok_or(ExecutionError::Capacity)?;
    let key_bytes = current
        .and_then(|identity| identity.individual_id.as_ref())
        .map_or(observer.len() + 64, String::len);
    bytes = crate::host::retained_size::heap_sum([
        bytes,
        key_bytes,
        key_bytes,
        entity.map_or(0, str::len),
        entity
            .and_then(|id| names.episode(id))
            .map_or(0, String::len),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let _candidate = budget.reserve(bytes)?;
    let mut next = current.cloned().unwrap_or_else(|| ObserverIdentity {
        retained: None,
        familiarity: None,
        individual_id: None,
        canonical_id: None,
        seed_only: None,
        voice: None,
        sight: None,
        name_evidence_ids: None,
        given_name: JsText::default(),
        nickname: None,
        revision: 0,
        encounter_id: None,
        authored: false,
    });
    if let Some(id) = entity {
        next.canonical_id = Some(id.to_owned());
        if next.encounter_id.is_none() {
            next.encounter_id = names.episode(id).cloned();
        }
    }
    drop(names);
    let key = match &next.individual_id {
        Some(id) => id.clone(),
        None => allocate_individual(&mut core.state.physical, &core.state.reception, observer)?,
    };
    if next.individual_id.is_none() {
        next.individual_id = Some(key.clone());
    }
    let cleared = nickname.is_empty();
    next.nickname = (!cleared).then_some(nickname);
    next.revision += 1;
    if !commit_observer_identity(core, observer, &key, next, budget)? {
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
        "nickname-edited",
        if cleared {
            "Your nickname was cleared."
        } else {
            "Your nickname was saved."
        },
        budget,
    )
}
