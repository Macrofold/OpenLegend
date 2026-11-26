//! A creator places one freshly constructed person. The actor, holdings,
//! private sources, and command receipt share the enclosing candidate's undo.
use super::*;
use crate::reception::VoiceFeatures;
use crate::{
    experience::PersonalSourceKind,
    runtime::{PersonCreation, PersonProfile},
    state::Goal,
    text::JsText,
};

impl CoreMutation<'_> {
    pub(crate) fn create_person(
        &mut self,
        expected: &str,
        draft: &PersonCreation,
        budget: &ByteBudget,
    ) -> Result<Result<(), (&'static str, &'static str)>, ExecutionError> {
        let installed = self.state.installed.clone();
        let template = installed
            .person_creation
            .as_ref()
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let catalogue = crate::worlds::base_traits::catalogue(&installed.content.profile)
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let point = draft.position.point();
        let physical = &self.state.physical;
        if physical
            .bodies
            .any_body(point, template.clearance, |handle| {
                physical
                    .entities
                    .resolve(handle)
                    .and_then(|e| e.world_position())
                    .is_some_and(|p| crate::spatial::distance(point, p) < template.clearance)
            })
        {
            return Ok(Err((
                "occupied",
                "Choose blank space away from another object.",
            )));
        }
        if draft.trait_ids.len() > catalogue.max_selected
            || draft.trait_ids.iter().enumerate().any(|(i, id)| {
                draft.trait_ids[..i].contains(id) || !catalogue.choices.iter().any(|t| t.id == *id)
            })
        {
            return Ok(Err((
                "invalid-person",
                "Select available character traits once each.",
            )));
        }
        let bytes =
            crate::encoding::json_record_len(draft).map_err(|_| ExecutionError::Invariant)?;
        let _work = budget.reserve(
            (bytes + template.entity.get().len()) * 8
                + catalogue
                    .choices
                    .iter()
                    .map(|t| {
                        t.name.storage_bytes()
                            + t.description.storage_bytes()
                            + t.id.len()
                            + size_of::<crate::state::CharacterTrait>()
                    })
                    .sum::<usize>(),
        )?;
        let mut entity = template.fresh().map_err(|_| ExecutionError::Invariant)?;
        let physical = &mut self.state.physical;
        let id = physical
            .identity
            .allocate_entity("person", |id| physical.entities.get(id).is_some())?
            .id;
        if id != expected {
            return Err(ExecutionError::Invariant);
        }
        let traits = if draft.trait_ids.is_empty() {
            let mut available: Vec<_> = catalogue.choices.iter().collect();
            if template.random_traits > available.len() {
                return Err(ExecutionError::Invariant);
            }
            (0..template.random_traits)
                .map(|_| {
                    let index = (physical.identity.draw() * available.len() as f64) as usize;
                    available.remove(index).clone()
                })
                .collect()
        } else {
            draft
                .trait_ids
                .iter()
                .map(|id| {
                    catalogue
                        .choices
                        .iter()
                        .find(|t| t.id == *id)
                        .cloned()
                        .ok_or(ExecutionError::Invariant)
                })
                .collect::<Result<_, _>>()?
        };
        entity.id = id.clone();
        entity.name = draft.name.trimmed();
        entity.placement = Some(Placement::World {
            position: point,
            support_surface_id: Some(draft.position.surface_id.clone()),
            revision: 0,
            motion_continuity_revision: None,
        });
        let profile = PersonProfile {
            name: entity.name.clone(),
            description: None,
            personality: (!draft.personality.trim_is_empty()).then(|| draft.personality.trimmed()),
            backstory: (!draft.backstory.trim_is_empty()).then(|| draft.backstory.trimmed()),
        };
        let identity = person_profile::AuthoredProfile::from_draft(&profile, &entity);
        let body = entity.actor.as_mut().ok_or(ExecutionError::MissingActor)?;
        body.personality = profile.personality;
        body.backstory = profile.backstory;
        body.traits = Some(traits);
        body.voice_profile = Some(VoiceFeatures::sampled(|| {
            (physical.identity.draw() * template.voice.count as f64) as u64 * template.voice.step
        }));
        let goals: Vec<_> = draft
            .initial_goals
            .iter()
            .map(|s| s.trim().to_owned())
            .collect();
        body.agency.goals = goals
            .iter()
            .enumerate()
            .map(|(i, goal)| Goal {
                id: format!("seed-goal:{i}"),
                revision: 0,
                objective: JsText::from(goal.as_str()),
                status: "active".into(),
                parent_id: None,
                author: "creator".into(),
                source_id: "creation".into(),
                completion: None,
            })
            .collect();
        let biography = identity.identity_text(Some(&goals));
        body.initial_goals = Some(goals);
        self.physical().insert_entity(entity, true)?;
        self.journal
            .cognition
            .create_person(&mut self.state.minds, &id, biography, budget)?;
        self.journal
            .knowledge
            .ensure_observer(&mut self.state.reception.actor_knowledge, &id)?;
        for source in [PersonalSourceKind::Awareness, PersonalSourceKind::Memory] {
            self.journal
                .experience
                .ensure_collection(&mut self.state.experience, source, &id)?;
        }
        for (def, quantity) in &template.starting_stock {
            self.produce_carried_stock(&id, def, *quantity)?;
        }
        Ok(Ok(()))
    }
}
