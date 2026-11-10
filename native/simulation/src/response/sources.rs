//! Response references select the ticket's already captured facts. Deliberate
//! retention and notepad/name edits use the existing canonical semantic owners.
use super::*;
use crate::execution::CoreMutation;
use crate::experience::{EvidenceCutMember, evidence_cut_member_eligible, temporal_facet_eligible};
use crate::received::{CapturedTemporalReceipt, TemporalReceiptLocator};
use crate::reception::{KnowledgeSubject, ObserverSubject};
use crate::records::SqlCell;
use crate::text::JsText;
use std::collections::BTreeSet;

pub(super) fn privacy_revision(core: &CoreMutation<'_>, actor: &str) -> u64 {
    core.state
        .experience
        .actor(actor)
        .map_or(0, |actor| actor.privacy.revision())
}
pub(super) fn receipt_details_current(
    core: &CoreMutation<'_>,
    bindings: &ResponseBindings,
) -> Result<bool, ExecutionError> {
    let Some(situation) = &bindings.input.situation else {
        return Ok(true);
    };
    let actor = bindings.actor_id();
    let privacy = core
        .state
        .experience
        .actor(actor)
        .map(|actor| &actor.privacy);
    let law = core.state.installed.account_law();
    for capture in situation.receipt_details.values() {
        let receipt = capture.receipt();
        if receipt.at > core.state.physical.header.sim_time
            || receipt.facets.len() != capture.fragments().len()
            || privacy.is_some_and(|privacy| {
                privacy.revoked(&receipt.id)
                    || receipt
                        .header
                        .source_ids
                        .iter()
                        .any(|id| privacy.revoked(id))
            })
        {
            return Ok(false);
        }
        for (field, value) in receipt.facets.iter().zip(capture.fragments()) {
            if !temporal_facet_eligible(
                &core.state.experience,
                &receipt.locator.actor_id,
                field,
                value,
                &law,
            )? {
                return Ok(false);
            }
        }
    }
    let cut = &bindings.input.reads.original.perception.evidence;
    for selected in situation.observation_references.values() {
        let eligible = match selected {
            ResponseObservation::Acquired(index) => evidence_cut_member_eligible(
                &core.state.experience,
                &core.state.physical.entities,
                cut,
                EvidenceCutMember::Acquired(*index),
                &law,
            ),
            ResponseObservation::Personal(original) => {
                crate::experience::retained_observation_eligible(
                    &core.state.experience,
                    actor,
                    original,
                    &law,
                )
            }
        };
        if !eligible {
            return Ok(false);
        }
    }
    Ok(true)
}
fn retained(
    core: &CoreMutation<'_>,
    locator: &TemporalReceiptLocator,
    budget: &ByteBudget,
) -> Result<Option<CapturedTemporalReceipt>, ExecutionError> {
    Ok(core.state.temporal.retained_receipt(
        locator,
        None,
        &core.state.reception.received_values.as_ref(),
        &core.state.installed.account_law(),
        core.state.physical.header.sim_time,
        core.state
            .installed
            .attention
            .value()
            .retention
            .recent
            .max_age_seconds,
        budget,
    )?)
}
fn unavailable_remember(budget: &ByteBudget) -> Result<ComponentResult, ExecutionError> {
    ComponentResult::prepare(
        false,
        "remember-unavailable",
        "The supplied sources or memory allowance are unavailable.".into(),
        budget,
    )
}
pub(super) fn observe(
    core: &mut CoreMutation<'_>,
    bindings: &ResponseBindings,
    operation: &ResponseOperation<'_>,
    budget: &ByteBudget,
) -> Result<ComponentResult, ExecutionError> {
    let Some(situation) = &bindings.input.situation else {
        return ComponentResult::prepare(
            false,
            "situation-expired",
            "The supplied observation is no longer available.".into(),
            budget,
        );
    };
    let actor = bindings.actor_id();
    if situation.privacy_revision != privacy_revision(core, actor) {
        return ComponentResult::prepare(
            false,
            "situation-expired",
            "The supplied observation is no longer available.".into(),
            budget,
        );
    }
    let requested = operation
        .data
        .get("subjects")
        .and_then(SqlCell::as_array)
        .ok_or(ExecutionError::Invariant)?;
    let mut bytes = requested
        .len()
        .checked_mul(size_of::<String>())
        .ok_or(ExecutionError::Capacity)?;
    for reference in requested {
        let Some(key) = reference
            .as_str()
            .and_then(|reference| situation.attention_references.get(reference))
        else {
            return ComponentResult::prepare(
                false,
                "attention-unavailable",
                "Those observations are no longer available for attention.".into(),
                budget,
            );
        };
        bytes = bytes
            .checked_add(key.len())
            .ok_or(ExecutionError::Capacity)?;
    }
    let _selection = budget.reserve(bytes)?;
    let keys: Vec<_> = requested
        .iter()
        .map(|reference| {
            situation
                .attention_references
                .get(reference.as_str().expect("Selected reference"))
                .expect("Selected attention key")
                .clone()
        })
        .collect();
    if crate::reception::set_attention_focus(core, actor, &keys, budget)? {
        ComponentResult::prepare(true, "attention-selected",
            "Focus preferences updated from the supplied observations; detailed tracking remains limited and can be interrupted.".into(), budget)
    } else {
        ComponentResult::prepare(
            false,
            "attention-unavailable",
            "Those observations are no longer available for attention.".into(),
            budget,
        )
    }
}
enum SelectedReceipt<'a> {
    Borrowed(&'a CapturedTemporalReceipt),
    Owned(CapturedTemporalReceipt),
}
impl SelectedReceipt<'_> {
    fn capture(&self) -> &CapturedTemporalReceipt {
        match self {
            Self::Borrowed(value) => value,
            Self::Owned(value) => value,
        }
    }
}
pub(super) fn remember(
    core: &mut CoreMutation<'_>,
    bindings: &ResponseBindings,
    response_id: &str,
    operation: &ResponseOperation<'_>,
    budget: &ByteBudget,
) -> Result<ComponentResult, ExecutionError> {
    let Some(situation) = &bindings.input.situation else {
        return ComponentResult::prepare(
            false,
            "situation-expired",
            "The supplied observation is no longer available.".into(),
            budget,
        );
    };
    let actor = bindings.actor_id();
    if situation.privacy_revision != privacy_revision(core, actor) {
        return ComponentResult::prepare(
            false,
            "situation-expired",
            "The supplied observation is no longer available.".into(),
            budget,
        );
    }
    let requested = operation
        .data
        .get("sources")
        .and_then(SqlCell::as_array)
        .ok_or(ExecutionError::Invariant)?;
    let _selection = budget.reserve(
        requested
            .len()
            .checked_mul(size_of::<SelectedReceipt>() + size_of::<&CapturedTemporalReceipt>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let checkpoint = core.journal.checkpoint(core.state)?;
    let attempt = (|| -> Result<bool, ExecutionError> {
        core.begin_received_value_scope()?;
        let mut selected = Vec::with_capacity(requested.len());
        for (index, reference) in requested.iter().enumerate() {
            if requested[..index].contains(reference) {
                continue;
            }
            let Some(reference) = reference.as_str() else {
                return Ok(false);
            };
            if let Some(locator) = situation.retention_references.get(reference) {
                let captured = if let Some(captured) = situation.receipt_details.get(reference) {
                    SelectedReceipt::Borrowed(captured)
                } else {
                    let Some(captured) = retained(core, locator, budget)? else {
                        return Ok(false);
                    };
                    SelectedReceipt::Owned(captured)
                };
                let receipt = captured.capture().receipt();
                if captured.capture().fragments().is_empty()
                    || locator.actor_id != actor
                    || receipt.locator.actor_id != actor
                    || &receipt.locator != locator
                {
                    return Ok(false);
                }
                selected.push(captured);
                continue;
            }
            let cut = &bindings.input.reads.original.perception.evidence;
            let law = core.state.installed.account_law();
            let captured = if let Some(index) = situation.current_references.get(reference) {
                if !evidence_cut_member_eligible(
                    &core.state.experience,
                    &core.state.physical.entities,
                    cut,
                    EvidenceCutMember::Current(*index),
                    &law,
                ) {
                    return Ok(false);
                }
                let Some(record) = crate::received::record_snapshot_support(
                    core,
                    actor,
                    &cut.cut().current[*index],
                    budget,
                )?
                else {
                    return Ok(false);
                };
                retained(core, &record.capsule().receipt.locator, budget)?
            } else if let Some(selected) = situation.observation_references.get(reference) {
                let eligible = match selected {
                    ResponseObservation::Acquired(index) => evidence_cut_member_eligible(
                        &core.state.experience,
                        &core.state.physical.entities,
                        cut,
                        EvidenceCutMember::Acquired(*index),
                        &law,
                    ),
                    ResponseObservation::Personal(original) => {
                        crate::experience::retained_observation_eligible(
                            &core.state.experience,
                            actor,
                            original,
                            &law,
                        )
                    }
                };
                if !eligible {
                    return Ok(false);
                }
                let original = selected
                    .observation(cut.cut())
                    .ok_or(ExecutionError::Invariant)?;
                if original.observer.actor_id != actor {
                    return Ok(false);
                }
                if !crate::received::ensure_temporal_actor(core, actor, budget)? {
                    return Ok(false);
                }
                let mut ordinals_storage = budget.reserve(
                    original
                        .facets
                        .len()
                        .checked_mul(
                            crate::host::retained_size::tree_node_bound::<u64, ()>()
                                .ok_or(ExecutionError::Capacity)?,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let ordinals: BTreeSet<_> =
                    original.facets.iter().map(|field| field.ordinal).collect();
                let locator = crate::worlds::base_recognition::original_support(
                    core,
                    original,
                    &ordinals,
                    false,
                    budget,
                    &mut ordinals_storage,
                )?;
                locator
                    .as_ref()
                    .map(|locator| retained(core, locator, budget))
                    .transpose()?
                    .flatten()
            } else {
                return Ok(false);
            };
            let Some(captured) = captured else {
                return Ok(false);
            };
            selected.push(SelectedReceipt::Owned(captured));
        }
        let key_bytes = crate::encoding::json_record_len(&(response_id, operation.local_id))
            .map_err(|_| ExecutionError::Invariant)?;
        let _identity = budget.reserve(
            key_bytes
                .checked_mul(2)
                .and_then(|bytes| bytes.checked_add(64))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let key = crate::encoding::json_record(&(response_id, operation.local_id))
            .map_err(|_| ExecutionError::Invariant)?;
        let id = format!("remember-{}", crate::encoding::content_label(&key));
        let received: Vec<_> = selected.iter().map(SelectedReceipt::capture).collect();
        crate::experience::remember_interpretation(
            core,
            actor,
            &id,
            operation.text("text").ok_or(ExecutionError::Invariant)?,
            &received,
            budget,
        )
    })();
    let accepted = match attempt {
        Ok(true) => {
            core.journal.keep(core.state, checkpoint)?;
            true
        }
        Ok(false) => {
            core.journal.rollback_to(core.state, checkpoint)?;
            false
        }
        Err(error) => {
            core.journal.rollback_to(core.state, checkpoint)?;
            return Err(error);
        }
    };
    if accepted {
        ComponentResult::prepare(
            true,
            "interpretation-remembered",
            "An interpretation was remembered with its supplied sources.".into(),
            budget,
        )
    } else {
        unavailable_remember(budget)
    }
}

pub(super) struct KnowledgeComponent {
    pub result: Option<ComponentResult>,
    pub evidence: Option<(Vec<String>, ByteReservation)>,
}
fn knowledge_subject(subject: &ObserverSubject) -> KnowledgeSubject {
    match subject {
        ObserverSubject::Entity { entity_id } => KnowledgeSubject::Entity {
            entity_id: entity_id.clone(),
        },
        ObserverSubject::Individual { individual_id } => KnowledgeSubject::Individual {
            individual_id: individual_id.clone(),
        },
    }
}
pub(super) fn knowledge(
    core: &mut CoreMutation<'_>,
    bindings: &ResponseBindings,
    operation: &ResponseOperation<'_>,
    evidence_ids: &[String],
    budget: &ByteBudget,
) -> Result<KnowledgeComponent, ExecutionError> {
    let actor = bindings.actor_id();
    let wire = operation.text("subjectId").filter(|text| !text.is_empty());
    let failed = |code, message| -> Result<KnowledgeComponent, ExecutionError> {
        Ok(KnowledgeComponent {
            result: Some(ComponentResult::prepare(
                false,
                code,
                crate::text::TextRef::Unicode(message),
                budget,
            )?),
            evidence: None,
        })
    };
    if wire.is_some_and(|value| value.as_unicode().is_none()) {
        return failed(
            "unpermitted-subject",
            "The identity subject was not supplied.",
        );
    }
    let reference = wire.and_then(JsText::as_unicode);
    let note_reference = if operation.kind == ResponseKind::Note {
        reference.and_then(|key| bindings.input.knowledge_references.get(key))
    } else {
        None
    };
    let identity_reference = reference.and_then(|key| bindings.input.identity_references.get(key));
    let bytes = heap_sum([
        operation
            .data
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(4)
            .ok_or(ExecutionError::Capacity)?,
        bindings
            .input
            .entity_ids
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?,
        bindings
            .input
            .identity_references
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?,
        (bindings.input.entity_ids.len() + bindings.input.identity_references.len())
            .checked_mul(size_of::<ObserverSubject>() + size_of::<KnowledgeSubject>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let _preparation = budget.reserve(bytes)?;
    let subject = reference.map(|reference| {
        note_reference
            .or(identity_reference)
            .cloned()
            .unwrap_or_else(|| ObserverSubject::Entity {
                entity_id: reference.into(),
            })
    });
    let names = crate::worlds::InstalledPersonalNameReader::prepare(
        &core.state.physical,
        &core.state.reception,
        &core.state.installed,
        &core.state.experience,
        actor,
    )?;
    if let Some(ObserverSubject::Entity { entity_id }) = &subject
        && note_reference.is_none()
        && !names.can_address_remembered_subject(entity_id)
        && bindings
            .input
            .expected_encounters
            .as_ref()
            .is_some_and(|expected| {
                expected.get(entity_id)
                    != core
                        .state
                        .reception
                        .perception_episodes
                        .as_ref()
                        .and_then(|root| root.get(actor))
                        .and_then(|episodes| episodes.get(entity_id))
            })
    {
        return failed(
            "stale-encounter",
            "The perceived subject encounter changed.",
        );
    }
    let known_individual = subject
        .as_ref()
        .and_then(|subject| names.observer_individual(subject))
        .and_then(|identity| identity.individual_id.as_deref());
    let matches = |capture: &&CapturedTemporalReceipt| {
        let receipt = capture.receipt();
        subject.is_none()
            || match &subject {
                Some(ObserverSubject::Entity { entity_id }) => {
                    receipt.header.subject == *entity_id
                        || receipt
                            .header
                            .context_subjects
                            .as_ref()
                            .is_some_and(|subjects| subjects.contains(entity_id))
                        || matches!(&receipt.header.subject_identity,Some(ObserverSubject::Entity{entity_id:id}) if id==entity_id)
                        || matches!(&receipt.header.subject_identity,Some(ObserverSubject::Individual{individual_id}) if Some(individual_id.as_str())==known_individual)
                }
                Some(ObserverSubject::Individual { individual_id }) => {
                    matches!(&receipt.header.subject_identity,Some(ObserverSubject::Individual{individual_id:id}) if id==individual_id)
                }
                None => true,
            }
    };
    let count = bindings
        .input
        .situation
        .as_ref()
        .map_or(0, |situation| situation.receipt_details.len());
    let _selection = budget.reserve(
        count
            .checked_mul(size_of::<&CapturedTemporalReceipt>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let received: Vec<_> = bindings
        .input
        .situation
        .as_ref()
        .into_iter()
        .flat_map(|situation| situation.receipt_details.values())
        .map(std::sync::Arc::as_ref)
        .filter(matches)
        .collect();
    let mut needs_retention = false;
    for capture in &received {
        needs_retention |= retained(core, &capture.receipt().locator, budget)?.is_none();
    }
    let mut checkpoint = if needs_retention {
        Some(core.journal.checkpoint(core.state)?)
    } else {
        None
    };
    let changed = (|| -> Result<KnowledgeComponent, ExecutionError> {
        let mut new_evidence = None;
        if needs_retention {
            core.begin_received_value_scope()?;
            let mut storage = budget.reserve(
                evidence_ids
                    .iter()
                    .try_fold(
                        evidence_ids
                            .len()
                            .checked_mul(size_of::<String>())
                            .ok_or(ExecutionError::Capacity)?,
                        |bytes, id| {
                            bytes
                                .checked_add(id.capacity())
                                .ok_or(ExecutionError::Capacity)
                        },
                    )?
                    .checked_add(
                        received
                            .len()
                            .checked_mul(size_of::<String>() + 256)
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut ids = Vec::with_capacity(evidence_ids.len() + received.len());
            for id in evidence_ids {
                if !ids.contains(id) {
                    ids.push(id.clone());
                }
            }
            for capture in &received {
                if retained(core, &capture.receipt().locator, budget)?.is_some() {
                    continue;
                }
                let limits = core
                    .state
                    .installed
                    .attention
                    .value()
                    .retention
                    .optional
                    .clone();
                let Some(record) = crate::received::retain_captured_support(
                    core, actor, capture, false, &limits, budget,
                )?
                else {
                    core.journal.rollback_to(
                        core.state,
                        checkpoint.take().ok_or(ExecutionError::Invariant)?,
                    )?;
                    return failed(
                        "evidence-unavailable",
                        "The selected evidence could not be retained.",
                    );
                };
                let source = crate::received::temporal_receipt_source(
                    &record.capsule().receipt.locator,
                    &record.capsule().receipt.id,
                );
                let bytes = crate::encoding::json_record_len(&source)
                    .map_err(|_| ExecutionError::Invariant)?;
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                let id =
                    crate::encoding::json_record(&source).map_err(|_| ExecutionError::Invariant)?;
                if !ids.contains(&id) {
                    ids.push(id);
                }
            }
            storage.resize(ids.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            new_evidence = Some((ids, storage));
        }
        let admitted = new_evidence
            .as_ref()
            .map_or(evidence_ids, |(ids, _)| ids.as_slice());
        let mut permitted: Vec<_> = bindings
            .input
            .entity_ids
            .iter()
            .map(|id| ObserverSubject::Entity {
                entity_id: id.clone(),
            })
            .collect();
        permitted.extend(bindings.input.identity_references.values().cloned());
        let result = if operation.kind == ResponseKind::Name {
            subject
                .as_ref()
                .map(|subject| {
                    crate::worlds::base_knowledge::assign_subject_name(
                        core,
                        actor,
                        &crate::worlds::base_knowledge::NameEdit {
                            subject_id: subject.clone(),
                            expected_revision: operation
                                .data
                                .get("expectedRevision")
                                .and_then(SqlCell::as_f64)
                                .ok_or(ExecutionError::Invariant)?
                                as i64,
                            given_name: operation
                                .text("givenName")
                                .ok_or(ExecutionError::Invariant)?
                                .clone(),
                        },
                        &permitted,
                        admitted,
                        budget,
                    )
                    .map(|result| ComponentResult::from_parts(result.into_parts()))
                })
                .transpose()?
        } else {
            let converted = subject.as_ref().map(knowledge_subject);
            let names = crate::worlds::InstalledPersonalNameReader::prepare(
                &core.state.physical,
                &core.state.reception,
                &core.state.installed,
                &core.state.experience,
                actor,
            )?;
            let rememberable = match &subject {
                None => true,
                Some(ObserverSubject::Entity { entity_id }) => {
                    names.can_remember_subject(entity_id)?
                        || names.can_address_remembered_subject(entity_id)
                }
                Some(subject @ ObserverSubject::Individual { .. }) => names
                    .observer_individual(subject)
                    .is_some_and(|identity| identity.individual_id.is_some()),
            };
            let existing = note_reference.is_some()
                && core
                    .state
                    .reception
                    .actor_knowledge
                    .get(actor, converted.as_ref())?
                    .is_some();
            if subject.is_some()
                && if note_reference.is_some() {
                    !existing
                } else {
                    !rememberable
                }
            {
                Some(ComponentResult::prepare(
                    false,
                    "recognition-unavailable",
                    "The subject has no supported identity binding.".into(),
                    budget,
                )?)
            } else {
                let allowed: Vec<_> = if let Some(subject) = note_reference {
                    vec![knowledge_subject(subject)]
                } else {
                    permitted.iter().map(knowledge_subject).collect()
                };
                Some(ComponentResult::from_parts(
                    crate::knowledge::edit_knowledge(
                        core,
                        actor,
                        &crate::knowledge::KnowledgeEdit {
                            subject_id: converted,
                            expected_revision: operation
                                .data
                                .get("expectedRevision")
                                .and_then(SqlCell::as_f64)
                                .ok_or(ExecutionError::Invariant)?
                                as i64,
                            text: operation
                                .text("text")
                                .ok_or(ExecutionError::Invariant)?
                                .clone(),
                        },
                        &allowed,
                        admitted,
                        budget,
                    )?
                    .into_parts(),
                ))
                // Source rememberSubject(..., authored=false) changes nothing: an
                // existing identity is retained, and a note cannot invent one.
            }
        };
        if let Some(checkpoint) = checkpoint.take() {
            if result.as_ref().is_some_and(|result| result.outcome.ok) {
                core.journal.keep(core.state, checkpoint)?;
            } else {
                core.journal.rollback_to(core.state, checkpoint)?;
                new_evidence = None;
            }
        }
        Ok(KnowledgeComponent {
            result,
            evidence: new_evidence,
        })
    })();
    if changed.is_err()
        && let Some(checkpoint) = checkpoint.take()
    {
        core.journal.rollback_to(core.state, checkpoint)?;
    }
    changed
}
