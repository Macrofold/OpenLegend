//! The ordinary command checks support using the installed pile footprint.
//! No item or pile changes while the physical query is outstanding.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::geometry::StandingQuery;
use crate::narration::{NarrationPart, TemplateBinding, narration_template};
use crate::state::{Entity, Named};
use crate::text::JsText;

impl CommandCursor {
    pub(super) fn prepare_drop(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor: &str,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Drop {
            item_id, quantity, group, ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = core.state.installed.clone();
        let policy = &installed.retained.item_handling_read;
        if let Some(group) = group {
            if let Err(problem) = core.check_stock_group(actor, group)? {
                let reason = match problem {
                    crate::execution::OwnedMoveError::Quantity => &policy.drop.quantity,
                    crate::execution::OwnedMoveError::Busy => &policy.drop.needed,
                    _ => &policy.drop.unavailable,
                };
                self.drop_result(false, reason)?;
                return Ok(false);
            }
            if core.state.physical.entities.get(actor).and_then(Entity::world_support).is_none() {
                self.drop_result(false, &policy.drop.support)?;
                return Ok(false);
            }
        } else if let Some(reason) = core.check_drop_item(actor, item_id, *quantity)? {
            self.drop_result(false, reason)?;
            return Ok(false);
        }
        let site = core
            .state
            .physical
            .entities
            .get(actor)
            .and_then(Entity::supported_position)
            .ok_or(ExecutionError::Invariant)?;
        self.reserve(
            2 * (site.surface_id.len() + policy.object_body.id.len()) + size_of::<StandingQuery>(),
        )?;
        let question = self.question(core, Phase::DropStanding)?;
        question.standing.push(StandingQuery {
            point: site,
            body: policy.object_body.clone(),
        });
        Ok(true)
    }

    pub(super) fn finish_drop(
        &mut self,
        core: &mut CoreMutation<'_>,
        admitted: bool,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let installed = core.state.installed.clone();
        let policy = &installed.retained.item_handling_read.drop;
        if !admitted || self.options.preview {
            self.drop_result(
                admitted,
                if admitted {
                    &policy.success
                } else {
                    &policy.support
                },
            )?;
            return self.drive(core, None);
        }
        let NativeCommand::Drop {
            envelope,
            item_id,
            quantity,
            group,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(&envelope.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let item = core
            .state
            .physical
            .entities
            .get(item_id)
            .and_then(|entity| entity.item.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let item_name = &installed
            .retained
            .items
            .get(&item.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?
            .named
            .name;
        let bindings = crate::host::retained_size::heap_sum([
            actor.name.storage_bytes(),
            actor
                .name_form
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            actor
                .indefinite_article
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            item_name.storage_bytes(),
            envelope.actor_id.len(),
            item_id.len(),
            32,
        ])
        .ok_or(ExecutionError::Capacity)?;
        let tokens = policy
            .narration
            .bytes()
            .filter(|byte| *byte == b'{')
            .count();
        let bytes = crate::host::retained_size::heap_sum([
            4096,
            bindings,
            4 * policy.narration.len(),
            tokens
                .checked_mul(4 * (bindings + size_of::<NarrationPart>()))
                .ok_or(ExecutionError::Capacity)?,
        ])
        .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let actor_id = envelope.actor_id.clone();
        let actor_name = Named {
            name: actor.name.clone(),
            name_form: actor.name_form.clone(),
            indefinite_article: actor.indefinite_article.clone(),
        };
        let site = actor
            .supported_position()
            .ok_or(ExecutionError::Invariant)?;
        let items = Named {
            name: JsText::concat(&[&format!("{quantity} ").into(), item_name]),
            name_form: None,
            indefinite_article: None,
        };
        let narration = narration_template(
            &policy.narration,
            &IndexMap::from([
                (
                    "actor",
                    TemplateBinding::Entity {
                        id: &actor_id,
                        name: &actor_name,
                    },
                ),
                ("items", TemplateBinding::Named(&items)),
            ]),
        );
        let pile = core.prepare_drop_pile(&site)?;
        if let Some(group) = group {
            core.drop_stock_group(&actor_id, group, &pile)?;
        } else {
            core.drop_checked_lot(&actor_id, item_id, *quantity, &pile)?;
        }
        self.drop_result(true, &policy.success)?;
        self.begin_source_scope(core)?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: "items-dropped".into(),
            text: EmissionText::Narration(narration),
            audience: AudienceSelection::Physical,
            source_id: Some(actor_id),
            target_id: Some(pile),
            data: None,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Tail;
        Ok(Progress::Occurrence(event))
    }

    fn drop_result(&mut self, ok: bool, text: &str) -> Result<(), ExecutionError> {
        self.reserve(48 + 4 * text.len())?;
        self.outcome = Some(outcome(
            ok,
            if ok { "dropped" } else { "cannot-drop" },
            text,
        ));
        self.phase = if ok && !self.options.preview {
            Phase::Tail
        } else {
            Phase::Done
        };
        Ok(())
    }
}
