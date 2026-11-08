//! Ordinary status interruption/deactivation, including the real action-ending
//! and occurrence duties. A continuation cannot manufacture either proof.

use super::*;
use crate::events::{AudienceSelection, EmissionText, EventScope};
use crate::narration::{TemplateBinding, narration_template};
use crate::reception::EventScalar;
use crate::state::Named;
use crate::status::{EffectBindings, StatusDefinition};
mod activation;
pub(crate) use activation::{
    StatusActivationAnswer, StatusActivationCursor, StatusActivationProgress, StatusActivationStep,
};
mod reconcile;
pub(crate) use reconcile::{StatusReconcileCursor, StatusReconcileStep};

pub(crate) enum StatusEnd {
    Unchanged,
    Complete,
    Occurrence(StagedOccurrence),
    Personal(PendingStatusEnd),
}
pub(crate) struct PendingStatusEnd {
    subject: String,
    definition: String,
    reason: String,
    episode: String,
    finish: PendingActionFinish,
}
impl PendingStatusEnd {
    pub(crate) fn personal(&self) -> &crate::activity::PendingActivityResult {
        self.finish.personal()
    }
    pub(crate) fn resume(
        self,
        core: &mut CoreMutation<'_>,
        acquired: &crate::experience::AcquiredActivityResult,
    ) -> Result<StatusEnd, ExecutionError> {
        let finished = core.complete_finish_action(self.finish, acquired)?;
        if finished.actor_id() != self.subject || finished.action_id() != self.episode {
            return Err(ExecutionError::Invariant);
        }
        core.finish_status_end(&self.subject, &self.definition, &self.episode, &self.reason)
    }
}
impl CoreMutation<'_> {
    /// A source-ordered local list, never a full-world search or a cached truth.
    pub(crate) fn interrupt_status_ids(
        &mut self,
        subject: &str,
        reason: &str,
    ) -> Result<Vec<String>, ExecutionError> {
        let entity = self
            .state
            .physical
            .entities
            .get(subject)
            .ok_or(ExecutionError::MissingEntity)?;
        if entity
            .status_effects
            .as_ref()
            .is_some_and(|states| states.values().any(|s| s.contribution.is_some()))
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let defs = &self.state.installed.status_policy.definitions;
        self.journal.physical.reserve(
            defs.len() * size_of::<String>() + defs.iter().map(|d| d.id.len()).sum::<usize>(),
        )?;
        Ok(defs
            .iter()
            .filter(|d| {
                (reason == "body-unavailable" || d.interrupt_on.iter().any(|r| r == reason))
            })
            .map(|d| d.id.clone())
            .collect())
    }
    pub(crate) fn deactivate_status(
        &mut self,
        subject: &str,
        definition_id: &str,
        reason: &str,
    ) -> Result<StatusEnd, ExecutionError> {
        let installed = std::sync::Arc::clone(&self.state.installed);
        let definition = installed
            .status_policy
            .definitions
            .iter()
            .find(|d| d.id == definition_id)
            .ok_or(ExecutionError::Invariant)?;
        if definition.contribution.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let Some(state) = self
            .state
            .physical
            .entities
            .get(subject)
            .ok_or(ExecutionError::MissingEntity)?
            .status_effects
            .as_ref()
            .and_then(|states| states.get(definition_id))
            .filter(|s| s.active)
        else {
            return Ok(StatusEnd::Unchanged);
        };
        if state.contribution.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        self.journal.physical.reserve(
            size_of::<StatusInstance>()
                + state.episode.len() * 3
                + state.source_id.len()
                + state.action_target_id.len()
                + subject.len()
                + definition_id.len()
                + reason.len(),
        )?;
        let episode = state.episode.clone();
        self.physical().release_work(&episode)?;
        // Re-read after relevant earned arithmetic was settled by work release.
        let mut state = self
            .state
            .physical
            .entities
            .get(subject)
            .and_then(|entity| entity.status_effects.as_ref())
            .and_then(|states| states.get(definition_id))
            .ok_or(ExecutionError::Invariant)?
            .clone();
        state.active = false;
        state.automatic_after =
            self.state.physical.header.sim_time + definition.reactivation_delay_seconds;
        self.physical()
            .replace_status(subject, definition_id, state)?;
        let owns_action = self
            .state
            .physical
            .entities
            .get(subject)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| action.id == episode);
        if owns_action {
            let result = crate::commands::Outcome {
                spent: None,
                outputs: None,
                ok: reason == "completed",
                code: if reason == "completed" {
                    "completed"
                } else {
                    "interrupted"
                }
                .to_owned(),
                message: reason.into(),
                recipe_id: None,
                item_id: None,
                entity_id: None,
                goal_id: None,
                plan_id: None,
                action_id: None,
            };
            match self.begin_finish_action(subject, &episode, result)? {
                ActionFinish::Personal(finish) => {
                    return Ok(StatusEnd::Personal(PendingStatusEnd {
                        subject: subject.to_owned(),
                        definition: definition_id.to_owned(),
                        reason: reason.to_owned(),
                        episode,
                        finish,
                    }));
                }
                ActionFinish::Complete(_) => {}
            }
        }
        self.finish_status_end(subject, definition_id, &episode, reason)
    }
    fn finish_status_end(
        &mut self,
        subject: &str,
        definition_id: &str,
        episode: &str,
        reason: &str,
    ) -> Result<StatusEnd, ExecutionError> {
        if self
            .state
            .physical
            .entities
            .get(subject)
            .and_then(|e| e.actor.as_ref())
            .and_then(|a| a.action.as_ref())
            .is_some_and(|a| a.id == episode)
        {
            self.physical().replace_action(
                subject,
                None,
                ActionWrite {
                    generation: PlanGenerationWrite::Advance,
                    behavior: None,
                },
            )?;
        }
        let installed = std::sync::Arc::clone(&self.state.installed);
        let definition = installed
            .status_policy
            .definitions
            .iter()
            .find(|d| d.id == definition_id)
            .ok_or(ExecutionError::Invariant)?;
        let state = self
            .state
            .physical
            .entities
            .get(subject)
            .and_then(|e| e.status_effects.as_ref())
            .and_then(|s| s.get(definition_id))
            .ok_or(ExecutionError::Invariant)?;
        self.journal
            .physical
            .reserve(state.source_id.len() + state.action_target_id.len())?;
        let source = state.source_id.clone();
        let action_target = state.action_target_id.clone();
        let bindings = EffectBindings {
            subject,
            source: &source,
            action_target: &action_target,
        };
        let Some(intent) = self.status_event(definition, bindings, false, reason)? else {
            return Ok(StatusEnd::Complete);
        };
        Ok(StatusEnd::Occurrence(self.stage_event(intent)?))
    }
    fn status_event(
        &mut self,
        definition: &StatusDefinition,
        bindings: EffectBindings<'_>,
        active: bool,
        reason: &str,
    ) -> Result<Option<EventEmissionIntent>, ExecutionError> {
        let operation = if active {
            definition.on_activate.as_ref()
        } else {
            definition.on_deactivate.as_ref()
        };
        let Some(operation) = operation else {
            return Ok(None);
        };
        if !active && reason == "body-unavailable" {
            return Ok(None);
        }
        let target = match operation.emit.target {
            crate::status::EntityReference::Subject => bindings.subject,
            crate::status::EntityReference::Source => bindings.source,
            crate::status::EntityReference::ActionTarget => bindings.action_target,
        };
        if self.state.physical.entities.get(target).is_none() {
            return Ok(None);
        }
        let ids = [
            ("subject", bindings.subject),
            ("source", bindings.source),
            ("actionTarget", bindings.action_target),
        ];
        let names_bytes = ids
            .iter()
            .filter_map(|(_, id)| self.state.physical.entities.get(id))
            .map(|e| {
                e.name.storage_bytes()
                    + e.name_form.as_ref().map_or(0, String::len)
                    + e.indefinite_article.as_ref().map_or(0, String::len)
            })
            .sum::<usize>();
        let tokens = operation
            .emit
            .narration
            .bytes()
            .filter(|b| *b == b'{')
            .count();
        let max_id = ids.iter().map(|(_, id)| id.len()).max().unwrap_or(0);
        let parts = tokens
            .checked_mul(2)
            .and_then(|n| n.checked_add(1))
            .and_then(|n| n.checked_mul(2 * size_of::<crate::narration::NarrationPart>()))
            .ok_or(ExecutionError::Capacity)?;
        let maps = crate::host::retained_size::map_storage::<&str, Named>(3)
            .and_then(|a| {
                crate::host::retained_size::map_storage::<&str, TemplateBinding<'_>>(3)
                    .and_then(|b| a.checked_add(b))
            })
            .and_then(|n| {
                crate::host::retained_size::map_storage::<String, EventScalar>(4)
                    .and_then(|b| n.checked_add(b))
            })
            .ok_or(ExecutionError::Capacity)?;
        self.journal.physical.reserve(
            names_bytes
                .checked_add(operation.emit.narration.len() * 4)
                .and_then(|n| n.checked_add(parts))
                .and_then(|n| n.checked_add(max_id * tokens))
                .and_then(|n| n.checked_add(maps))
                .and_then(|n| {
                    n.checked_add(
                        definition.id.len()
                            + target.len()
                            + reason.len()
                            + "state-changeddefinitionIdactivereasonconversationRelevant".len(),
                    )
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let names: IndexMap<&str, Named> = ids
            .into_iter()
            .filter_map(|(role, id)| {
                self.state.physical.entities.get(id).map(|entity| {
                    (
                        role,
                        Named {
                            name: entity.name.clone(),
                            name_form: entity.name_form.clone(),
                            indefinite_article: entity.indefinite_article.clone(),
                        },
                    )
                })
            })
            .collect();
        let bound: IndexMap<&str, TemplateBinding<'_>> = ids
            .into_iter()
            .filter_map(|(role, id)| {
                names
                    .get(role)
                    .map(|name| (role, TemplateBinding::Entity { id, name }))
            })
            .collect();
        let narration = narration_template(&operation.emit.narration, &bound);
        let mut data = IndexMap::new();
        data.insert(
            "definitionId".to_owned(),
            EventScalar::Text((definition.id.clone()).into()),
        );
        data.insert("active".to_owned(), EventScalar::Boolean(active));
        data.insert(
            "reason".to_owned(),
            EventScalar::Text((reason.to_owned()).into()),
        );
        data.insert(
            "conversationRelevant".to_owned(),
            EventScalar::Boolean(true),
        );
        Ok(Some(EventEmissionIntent {
            event_type: "state-changed".to_owned(),
            text: EmissionText::Narration(narration),
            audience: AudienceSelection::Physical,
            source_id: Some(target.to_owned()),
            target_id: None,
            data: Some(data),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        }))
    }
}
