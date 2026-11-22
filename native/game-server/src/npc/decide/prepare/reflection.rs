//! Prepare one resident's private self and remembered sources for a Worktree
//! Run. The native ticket remains the authority for each offered handle.

use super::{
    Arc, CallFailure, CapacityError, CurrentServer, RuntimeNpcBindingInput, RuntimeNpcConsumer,
    RuntimeNpcResponseTicket, WorldError, about_me, agency, alias, body_text, capacity, feelings,
    identity, json, name_phrase, packet_failure, personal_description, prompt_text,
};
use crate::store::RecallScope;
use openlegend_simulation::{
    capture::{
        NpcBindingPurpose, NpcEntityAlias, NpcEntityOrdinal, NpcPersonalEvidence,
        NpcPersonalSelection, NpcSourceSelection, NpcSubjectAlias, NpcSubjectOrdinal,
    },
    experience::PersonalSourceRef,
    host::ByteReservation,
    narration::NameArticle,
    runtime::{
        RuntimeReflectionBinding, RuntimeReflectionEvidenceAlias, RuntimeReflectionFiles,
        RuntimeReflectionTicket,
    },
};
use serde_json::Value;
use std::mem::size_of;

pub(in crate::npc) struct PreparedReflection {
    pub(in crate::npc) ticket: Arc<RuntimeReflectionTicket>,
    pub(in crate::npc) files: RuntimeReflectionFiles,
    pub(in crate::npc) context: Value,
    pub(in crate::npc) subjects: Vec<String>,
    pub(in crate::npc) evidence: Vec<String>,
    _custody: ByteReservation,
}

pub(in crate::npc) async fn prepare(
    game: &Arc<CurrentServer>,
    actor: &str,
    job: &str,
    reason: &str,
    cue: Option<&PersonalSourceRef>,
) -> Result<PreparedReflection, CallFailure> {
    let budget = game.host.budget();
    let actor_storage = budget.reserve(actor.len() * 2).map_err(capacity)?;
    let actor_id = actor.to_owned();
    let body = game
        .world
        .capture(move |world| {
            let _actor = actor_storage;
            world.read_maintenance_direct(actor_id)
        })
        .await
        .map_err(CallFailure::World)?;
    let revision = body
        .inner_revision()
        .ok_or(CallFailure::Stale("reflection-workspace"))?;
    let consumer = RuntimeNpcConsumer::Reflection;
    let origin = game
        .world
        .capture_npc_read(actor, consumer.as_str())
        .await
        .map_err(CallFailure::World)?;
    let scope = origin.decision_origin();
    let references = game
        .store
        .recall_references(RecallScope {
            world: scope.world_id,
            generation: scope.generation,
            actor,
            at: scope.at,
            identity_through: scope.identity_through,
        })
        .await
        .map_err(|error| CallFailure::World(WorldError::Storage(error)))?;
    let exclusive_cue = cue.filter(|source| !references.required.contains(source));
    let recent = references
        .optional
        .iter()
        .filter(|source| Some(*source) != cue)
        .take(game.cognition.recent_recall);
    let selection = references
        .required
        .iter()
        .chain(exclusive_cue)
        .chain(recent);
    let required = references.required.len() + usize::from(exclusive_cue.is_some());
    let selection_bytes = selection
        .clone()
        .try_fold(0usize, |bytes, reference| {
            bytes
                .checked_add(size_of::<NpcPersonalSelection>())?
                .checked_add(reference.id.len() + reference.revision.len())
        })
        .ok_or_else(|| capacity(CapacityError))?;
    if selection_bytes == 0 {
        return Err(CallFailure::Stale("reflection-has-no-current-evidence"));
    }
    let selection_storage = budget.reserve(selection_bytes).map_err(capacity)?;
    let origin = game
        .world
        .select_npc_sources(
            game.clone(),
            origin,
            NpcSourceSelection {
                personal: selection
                    .map(|reference| NpcPersonalSelection {
                        reference: reference.clone(),
                        through: None,
                    })
                    .collect(),
                receipts: Vec::new(),
                consolidation_job: None,
            },
            selection_storage,
        )
        .await
        .map_err(CallFailure::World)?;
    let history = origin.personal_sources(budget).map_err(packet_failure)?;
    if history
        .unavailable_personal
        .iter()
        .any(|index| *index < required)
    {
        return Err(CallFailure::Stale("reflection-required-evidence-withdrawn"));
    }
    let current = game
        .world
        .capture_npc_recall(game.clone(), actor, consumer.as_str())
        .await
        .map_err(CallFailure::World)?;
    let self_facts = current.current_self().map_err(packet_failure)?;
    let self_prompt = self_facts.prompt().ok_or(CallFailure::Invalid)?;
    let text_bytes = history
        .admitted_bytes()
        .checked_mul(8)
        .and_then(|bytes| bytes.checked_add(self_prompt.projection_bytes()?))
        .and_then(|bytes| bytes.checked_add(48 * 1024))
        .ok_or_else(|| capacity(CapacityError))?;
    let mut custody = budget
        .reserve(text_bytes.max(selection_bytes.saturating_mul(12)))
        .map_err(capacity)?;
    let key = uuid::Uuid::new_v4().simple().to_string();
    let self_alias = alias(&key, "myself", 0);
    let mut subjects = vec![self_alias.clone()];
    let mut subject_bindings = vec![NpcSubjectAlias {
        alias: self_alias.clone(),
        source: NpcSubjectOrdinal::Myself,
    }];
    let mut entities = vec![NpcEntityAlias {
        alias: self_alias.clone(),
        source: NpcEntityOrdinal::Myself,
    }];
    let mut people = Vec::new();
    for &ordinal in current.selected_body_ordinals().map_err(packet_failure)? {
        let observed = current
            .presented_body(ordinal)
            .ok_or(CallFailure::Invalid)?;
        let handle = alias(&key, "body", ordinal);
        let name = name_phrase(observed.name, NameArticle::Definite, false);
        if current.has_interpretation_subject(ordinal) {
            subjects.push(handle.clone());
            subject_bindings.push(NpcSubjectAlias {
                alias: handle.clone(),
                source: NpcSubjectOrdinal::Body { ordinal },
            });
            people.push(json!({"reference": handle, "name": prompt_text(&name)}));
        }
        entities.push(NpcEntityAlias {
            alias: handle,
            source: NpcEntityOrdinal::Body { ordinal },
        });
    }
    let mut indices: Vec<_> = (0..history.personal.len()).collect();
    indices.sort_by(|left, right| {
        super::personal_time(&history.personal[*left])
            .total_cmp(&super::personal_time(&history.personal[*right]))
            .then_with(|| {
                history.personal[*left]
                    .value
                    .sequence
                    .cmp(&history.personal[*right].value.sequence)
            })
    });
    let mut evidence = Vec::with_capacity(indices.len());
    let mut aliases = Vec::with_capacity(indices.len());
    let mut remembered = Vec::with_capacity(indices.len());
    let mut cue_handle = None;
    for &ordinal in &indices {
        let account = &history.personal[ordinal];
        let (text, at) = personal_description(account)?;
        let handle = alias(&key, "evidence", ordinal);
        if cue == Some(&account.reference) {
            cue_handle = Some(handle.clone());
        }
        remembered.push(
            json!({"reference":handle,"text":text,"at":at,"acquisition":account.value.modality}),
        );
        evidence.push(handle.clone());
        aliases.push(RuntimeReflectionEvidenceAlias {
            alias: handle,
            inventory: history.ordinal,
            ordinal,
        });
    }
    let name = name_phrase(&self_prompt.observer_name, NameArticle::None, false);
    let mut context = json!({
        "stimulus": reason,
        "identity": identity(self_prompt, &prompt_text(&name), &self_alias),
        "aboutMe": about_me(game, self_prompt)?,
        "body": body_text(self_prompt)?,
        "agency": agency(self_prompt, &current)?,
        "feelings": feelings(current.feelings().map_err(packet_failure)?)?,
        "subjects": people,
        "experience": remembered,
    });
    if cue.is_some() {
        context["trigger"] = cue_handle
            .ok_or(CallFailure::Stale("reflection-cue-withdrawn"))?
            .into();
    }
    let request = RuntimeNpcBindingInput {
        decision_id: job.to_owned(),
        consumer,
        purpose: NpcBindingPurpose::Reflection,
        actions: Vec::new(),
        semantic_causes: Vec::new(),
        evidence: indices
            .into_iter()
            .map(|ordinal| NpcPersonalEvidence {
                inventory: history.ordinal,
                ordinal,
            })
            .collect(),
        entities,
        attention: Vec::new(),
        presented: Vec::new(),
    }
    .fund_reflection(subject_bindings, &mut custody)
    .map_err(packet_failure)?;
    drop(history);
    let npc: RuntimeNpcResponseTicket = game
        .world
        .bind_npc(origin, current, request, None)
        .await
        .map_err(CallFailure::World)?;
    let (ticket, files) = game
        .world
        .capture(move |world| {
            let ticket = world.bind_reflection_direct(
                &body,
                &body,
                &mut Some(npc),
                RuntimeReflectionBinding {
                    expected_revision: revision,
                    evidence_aliases: aliases,
                    dream_episode: None,
                },
            )?;
            let files = world.reflection_workspace_files(&ticket)?;
            Ok((ticket, files))
        })
        .await
        .map_err(CallFailure::World)?;
    Ok(PreparedReflection {
        ticket: Arc::new(ticket),
        files,
        context,
        subjects,
        evidence,
        _custody: custody,
    })
}
