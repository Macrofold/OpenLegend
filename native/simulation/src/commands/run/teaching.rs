//! An exact recipe lesson uses one receiver's real hearing before admitting
//! the same private capability grant used by an inspected method record.
use super::*;
use crate::install::GrantSource;
use crate::knowledge::recipe_grants::{Learning, learn_recipe};
use crate::knowledge::recipe_teaching;
use crate::reception::EventScalar;
use crate::text::JsText;
use crate::worlds::InstalledSpeechAction;

impl CommandCursor {
    pub(super) fn start_teaching(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Teach {
            envelope,
            target_id,
            target_life,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let speaker = state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let messages = &state.installed.ordinary_actions.value().teaching;
        if !InstalledSpeechAction::allows_speaker(speaker) {
            self.refuse(&messages.no_speech);
            return Ok(false);
        }
        let Some(listener) = state.physical.entities.get(target_id).filter(|entity| {
            entity.physical_life() == Some(*target_life) && recipe_teaching::listener(entity)
        }) else {
            self.refuse(&messages.not_heard);
            return Ok(false);
        };
        self.binding.serial = core.journal.next_provider_serial()?;
        let sound = recipe_teaching::sound(state, speaker, listener, self.binding, &self.budget)?;
        if sound.queries().sound.is_empty() {
            self.refuse(&messages.not_heard);
            return Ok(false);
        }
        self.selected_sound = Some(sound);
        self.phase = Phase::TeachHearing;
        Ok(true)
    }

    pub(super) fn finish_teaching(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Teach {
            envelope,
            target_id,
            recipe_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let messages = &installed.ordinary_actions.value().teaching;
        let sound = self
            .selected_sound
            .take()
            .ok_or(ExecutionError::Invariant)?;
        let heard = recipe_teaching::clearly_heard(sound, answer, &installed, target_id)?;
        if !heard {
            self.refuse(&messages.not_heard);
            return self.drive(core, None);
        }
        let taught = installed.retained.recipes.get(recipe_id).filter(|_| {
            core.state
                .learned_capabilities
                .known_recipes(&envelope.actor_id)
                .iter()
                .any(|known| known == recipe_id)
        });
        let Some(recipe) = taught else {
            self.refuse(&messages.not_learned);
            return self.drive(core, None);
        };
        #[derive(Deserialize)]
        struct RecipeName {
            name: JsText,
        }
        let work = self.budget.reserve(
            768 + 4 * (envelope.actor_id.len() + target_id.len() + recipe_id.len() + recipe.len())
                + messages.verb.len()
                + messages.method_clause.len()
                + messages.event.len(),
        )?;
        let RecipeName { name } =
            serde_json::from_str(recipe).map_err(|_| ExecutionError::Invariant)?;
        if learn_recipe(
            core,
            target_id,
            &envelope.id,
            recipe_id,
            GrantSource::Taught,
            &self.budget,
        )? == Learning::Capacity
        {
            self.refuse(&messages.capacity);
            return self.drive(core, None);
        }
        let mut method = JsText::from(messages.method_clause.as_str());
        method.push_text(&name);
        method.push_str(".");
        let event = core.stage_event(EventEmissionIntent {
            event_type: messages.event.clone(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: envelope.actor_id.clone(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(format!(" {}", messages.verb).into()),
                    NarrationPart::Participant {
                        entity_id: target_id.clone(),
                        role: if target_id == &envelope.actor_id {
                            PersonRole::Reflexive
                        } else {
                            PersonRole::Object
                        },
                        article: None,
                    },
                    NarrationPart::Literal(method),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(envelope.actor_id.clone()),
            target_id: Some(target_id.clone()),
            data: Some(IndexMap::from([
                (
                    "recipeId".into(),
                    EventScalar::Text(recipe_id.as_str().into()),
                ),
                ("targetReference".into(), EventScalar::Boolean(true)),
            ])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self._reservation.merge(work)?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Tail;
        self.outcome = Some(messages.completed.outcome(true));
        Ok(Progress::Occurrence(event))
    }
}
