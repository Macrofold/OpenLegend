//! Complete the short action against the current seen pile and stock. The
//! pickup occurrence is received while the source still exists.
use super::*;
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope};
use crate::ground_items::{can_pick_up, pickup_contents, pickup_lot, pickup_pile};
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
        let item = action.item_id.as_deref();
        let requested = action.quantity;
        let Some(pile) = visible
            .then(|| pickup_pile(core.state, actor, target))
            .flatten()
        else {
            self.fail(&copy.out_of_reach.message)?;
            return self.drive(core, None);
        };
        if action.stage == "approaching" {
            if !can_pick_up(core.state, pile, item, None) {
                self.fail(&copy.not_applicable.message)?;
                return self.drive(core, None);
            }
            return self.start_contact_work(core);
        }
        let selected = || {
            item.is_none()
                .then(|| pickup_contents(core.state, pile))
                .into_iter()
                .flatten()
                .chain(item.and_then(|id| pickup_lot(core.state, pile, id)))
        };
        let mut count = 0usize;
        let mut item_bytes = 0usize;
        let mut available = true;
        for lot in selected() {
            if !lot.admits_quantity(requested) {
                available = false;
                break;
            }
            count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
            item_bytes = heap_sum([
                item_bytes,
                size_of::<(String, u64)>() + size_of::<JsText>() + 128,
                4 * lot.entity.id.len(),
                6 * lot.definition.named.name.storage_bytes(),
                2 * lot.definition.pin.id.len(),
            ])
            .ok_or(ExecutionError::Capacity)?;
        }
        if !available || count == 0 {
            self.fail(&copy.not_applicable.message)?;
            return self.drive(core, None);
        }
        let policy = &installed.retained.item_handling_read;
        let _selection = self.budget.reserve(
            heap_sum([
                4096,
                item_bytes,
                4 * (actor.name.storage_bytes() + pile.name.storage_bytes()),
                4 * policy.pickup_narration.len(),
                3 * actor.id.len(),
                4 * target.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut lots = Vec::with_capacity(count);
        let mut descriptions = Vec::with_capacity(count);
        let mut definition = None;
        for lot in selected() {
            let quantity = requested.unwrap_or(lot.lot.quantity);
            lots.push((lot.entity.id.clone(), quantity));
            descriptions.push(JsText::concat(&[
                &format!("{quantity} ").into(),
                &lot.definition.named.name,
            ]));
            if count == 1 {
                definition = Some(lot.definition.pin.id.clone());
            }
        }
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
            name: JsText::join(descriptions.iter(), ", "),
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
        if !core.physical().advance_timed_work(
            &self.actor_id,
            id,
            self.seconds,
            installed.time_epsilon,
        )? {
            self.phase = Phase::Done;
            return Ok(Progress::Complete);
        }
        let Some(item) = core.take_ground_items(&self.actor_id, &target, &lots)? else {
            self.fail(&copy.not_applicable.message)?;
            return self.drive(core, None);
        };
        // The event owner takes custody of narration. Only the outcome
        // and event identity stay with this cursor after the transfer.
        let result_bytes = definition.as_ref().map_or(0, |definition| {
            size_of::<crate::commands::ActivityOutput>() + 2 * (item.len() + definition.len())
        });
        self.reserve(
            copy.movement_completed.code.len()
                + copy.movement_completed.message.len()
                + result_bytes,
        )?;
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
        if let Some(definition) = definition {
            result.item_id = Some(item.clone());
            result.outputs = Some(vec![crate::commands::ActivityOutput {
                port: definition.clone(),
                definition_id: definition,
                item_id: item,
                quantity: lots[0].1,
            }]);
        }
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
