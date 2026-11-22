//! Complete the short action against the current seen pile and stock. The
//! pickup occurrence is received while the source still exists.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::ground_items::{pickup_lot, pickup_pile};
use crate::host::retained_size::heap_sum;
use crate::narration::{TemplateBinding, narration_template};
use crate::reception::EventScalar;
use crate::state::Named;
use crate::text::JsText;
use indexmap::IndexMap;

impl MoveAdvanceCursor {
    pub(super) fn finish_pickup_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        visible: bool,
    ) -> Result<Progress, ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (actor, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let installed = core.state.installed.clone();
        let copy = installed.ordinary_actions.value();
        let target = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let item = action.item_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let Some(pile) = visible
            .then(|| pickup_pile(core.state, actor, target))
            .flatten()
        else {
            self.fail(&copy.out_of_reach.message)?;
            return self.drive(core, None);
        };
        let Some(lot) = pickup_lot(core.state, pile, item) else {
            self.fail(&copy.not_applicable.message)?;
            return self.drive(core, None);
        };
        if action.stage == "approaching" {
            return self.start_contact_work(core);
        }
        let policy = &installed.retained.item_handling_read;
        let requested = action.quantity;
        if !lot.admits_quantity(requested) {
            self.fail(&copy.not_applicable.message)?;
            return self.drive(core, None);
        }
        let quantity = requested.unwrap_or(lot.lot.quantity);
        let displayed_name = &lot.definition.named.name;
        let definition = &lot.definition.pin.id;
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(
                    heap_sum([
                        4096,
                        4 * (actor.name.storage_bytes() + pile.name.storage_bytes()),
                        4 * (displayed_name.storage_bytes() + policy.pickup_narration.len()),
                        3 * actor.id.len(),
                        4 * target.len(),
                        4 * item.len(),
                        4 * definition.len(),
                        copy.movement_completed.message.len(),
                    ])
                    .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let actor_name = Named {
            name: actor.name.clone(),
            name_form: actor.name_form.clone(),
            indefinite_article: actor.indefinite_article.clone(),
        };
        let source_name = Named {
            name: pile.name.clone(),
            name_form: pile.name_form.clone(),
            indefinite_article: pile.indefinite_article.clone(),
        };
        let items_name = Named {
            name: JsText::concat(&[&format!("{quantity} ").into(), displayed_name]),
            name_form: None,
            indefinite_article: None,
        };
        let narration = narration_template(
            &policy.pickup_narration,
            &IndexMap::from([
                (
                    "actor",
                    TemplateBinding::Entity {
                        id: &self.actor_id,
                        name: &actor_name,
                    },
                ),
                ("items", TemplateBinding::Named(&items_name)),
                (
                    "source",
                    TemplateBinding::Entity {
                        id: target,
                        name: &source_name,
                    },
                ),
            ]),
        );
        let target = target.to_owned();
        let item = item.to_owned();
        let definition = definition.to_owned();
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let Some(item) = core.take_ground_lot(&self.actor_id, &target, &item, requested)? else {
            self.fail(&copy.not_applicable.message)?;
            return self.drive(core, None);
        };
        core.begin_received_value_scope()?;
        let event = core.stage_event(EventEmissionIntent {
            event_type: "items-picked-up".into(),
            text: EmissionText::Narration(narration),
            audience: AudienceSelection::Physical,
            source_id: Some(self.actor_id.clone()),
            target_id: Some(target),
            data: Some(IndexMap::from([(
                "targetMustBeVisible".into(),
                EventScalar::Boolean(true),
            )])),
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        let mut result = copy.movement_completed.outcome(true);
        result.item_id = Some(item.clone());
        result.outputs = Some(vec![crate::commands::ActivityOutput {
            port: definition.clone(),
            definition_id: definition,
            item_id: item,
            quantity,
        }]);
        self.production_result = Some(result);
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::PickupRetire;
        Ok(Progress::Occurrence(event))
    }

    pub(super) fn retire_pickup_source(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<(), ExecutionError> {
        let id = self.action_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let (_, action) = bound(core, &self.actor_id, id, self.physical_life)?;
        let pile = action
            .target_id
            .as_deref()
            .ok_or(ExecutionError::Invariant)?;
        let _custody = self.budget.reserve(pile.len())?;
        let pile = pile.to_owned();
        core.retire_empty_pickup_pile(&pile)?;
        self.phase = Phase::Finish;
        Ok(())
    }
}
