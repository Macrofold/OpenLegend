use super::*;
use crate::execution::{EquipmentDecision, EquipmentRequest};
use crate::simulation::SimulationState;
use crate::state::Entity;
use crate::text::JsText;
use serde::Deserialize;
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EquipmentCopy {
    equipped: JsText,
    stowed: JsText,
    stowed_result: JsText,
    equipped_event: JsText,
    stowed_event: JsText,
    auto_equip: JsText,
    put_away: JsText,
    attack_unavailable: JsText,
    attack_changed: JsText,
    unavailable: JsText,
    busy: JsText,
    stale: JsText,
    released: JsText,
    equip_label: JsText,
    unequip_activity: JsText,
}

static COPY: LazyLock<EquipmentCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/worlds/base/equipment-copy.json"
    ))
    .expect("authored equipment language")
});

fn item_name<'a>(state: &'a SimulationState, item: &Entity) -> Option<&'a JsText> {
    let lot = item.item.as_ref()?;
    let definition = state.installed.retained.items.get(&lot.definition_pin.id)?;
    (definition.pin == lot.definition_pin).then_some(&definition.named.name)
}

/// Render only the conflicting held items in this prepared physical cut.
/// The caller retains the returned reservation with this independently owned text.
pub(crate) fn equipment_preview(
    state: &SimulationState,
    actor: &Entity,
    item: &Entity,
    budget: &ByteBudget,
) -> Result<(JsText, ByteReservation), ExecutionError> {
    let capacity = state
        .inventory
        .attachment_count(&actor.id)
        .checked_mul(2)
        .and_then(|n| n.checked_add(3))
        .ok_or(ExecutionError::Capacity)?;
    let slots = capacity
        .checked_mul(size_of::<&JsText>())
        .ok_or(ExecutionError::Capacity)?;
    let mut custody = budget.reserve(slots)?;
    let comma = JsText::from(", ");
    let period = JsText::from(".");
    let mut names = Vec::with_capacity(capacity);
    names.push(&COPY.auto_equip);
    for conflict in crate::execution::equipment_conflicts(state, &actor.id, item) {
        names.push(if names.len() == 1 {
            &COPY.put_away
        } else {
            &comma
        });
        names.push(item_name(state, conflict).ok_or(ExecutionError::Invariant)?);
    }
    names.push(&period);
    let bytes = names
        .iter()
        .try_fold(0usize, |total, name| {
            total.checked_add(name.storage_bytes())
        })
        .and_then(|bytes| bytes.checked_mul(8))
        .and_then(|bytes| bytes.checked_add(slots))
        .ok_or(ExecutionError::Capacity)?;
    custody.resize(bytes)?;
    let text = JsText::concat(&names);
    drop(names);
    custody.resize(text.storage_bytes())?;
    Ok((text, custody))
}

impl CommandCursor {
    pub(super) fn refuse_strike_weapon(&mut self, changed: bool) -> Result<(), ExecutionError> {
        let (code, message) = if changed {
            ("equipment-changed", &COPY.attack_changed)
        } else {
            ("weapon-unavailable", &COPY.attack_unavailable)
        };
        self.reserve(code.len() + message.storage_bytes())?;
        let mut result = outcome(false, code, "");
        result.message = message.clone();
        self.outcome = Some(result);
        self.phase = Phase::Done;
        Ok(())
    }

    pub(super) fn apply_equipment(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor_id: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::Equipment {
            item_id, request, ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let decision = core.change_equipment(actor_id, item_id, *request)?;
        let EquipmentDecision::Applied { stowed, _custody } = decision else {
            let (code, message) = match decision {
                EquipmentDecision::Busy => ("not-equippable", &COPY.busy),
                EquipmentDecision::Unavailable => ("not-equippable", &COPY.unavailable),
                EquipmentDecision::Changed => ("stale", &COPY.stale),
                EquipmentDecision::Applied { .. } => unreachable!(),
            };
            self._reservation
                .resize(self._reservation.bytes() + message.storage_bytes() + code.len())?;
            let mut result = outcome(false, code, "");
            result.message = message.clone();
            self.outcome = Some(result);
            self.phase = Phase::Done;
            return Ok(None);
        };
        let equipping = *request == EquipmentRequest::Equip;
        let name = core
            .state
            .physical
            .entities
            .get(item_id)
            .and_then(|item| item_name(&core.state, item))
            .ok_or(ExecutionError::Invariant)?;
        let actor = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let mut result = outcome(true, if equipping { "equipped" } else { "unequipped" }, "");
        let text = if equipping {
            let (message, narration) =
                equipped_copy(&core.state, actor, item_id, &stowed, &mut self._reservation)?;
            result.message = message;
            result.item_id = Some(item_id.clone());
            Some(narration)
        } else {
            self._reservation
                .resize(self._reservation.bytes() + COPY.released.storage_bytes())?;
            result.message = COPY.released.clone();
            None
        };
        self.outcome = Some(result);
        if self.options.preview {
            self.phase = Phase::Done;
            return Ok(None);
        }
        if !self.options.native_controller {
            let view = ActivityView {
                name: if equipping {
                    COPY.equip_label.clone()
                } else {
                    COPY.unequip_activity.clone()
                },
                actor: Some(actor.name.clone()),
                tool: Some(name.clone()),
                target: None,
                facts: Vec::new(),
                children: None,
                result: None,
            };
            let custody = self
                .budget
                .reserve(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            let id = &self.command.envelope().id;
            self.activity_id = Some(
                core.journal
                    .activity
                    .begin(
                        &mut core.state.activity,
                        &core.state.physical.entities,
                        &self.command,
                        id,
                        view,
                        custody,
                        core.state.physical.header.sim_time,
                        activity_parent(&core.state.physical.entities, &self.command),
                    )
                    .map_err(ExecutionError::Activity)?,
            );
        }
        self.phase = Phase::ImmediateResult;
        let Some(text) = text else { return Ok(None) };
        self.begin_source_scope(core)?;
        let event = stage_equipped(core, actor_id, &text)?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::ImmediateResult;
        Ok(Some(event))
    }
}

fn equipped_copy(
    state: &SimulationState,
    actor: &Entity,
    item_id: &str,
    stowed: &[crate::state::EntityHandle],
    custody: &mut ByteReservation,
) -> Result<(JsText, JsText), ExecutionError> {
    let name = state
        .physical
        .entities
        .get(item_id)
        .and_then(|item| item_name(state, item))
        .ok_or(ExecutionError::Invariant)?;
    let stowed_name = |handle| {
        state
            .physical
            .entities
            .resolve(handle)
            .and_then(|item| item_name(state, item))
    };
    let stowed_bytes = stowed
        .iter()
        .try_fold(0usize, |sum, handle| {
            sum.checked_add(stowed_name(*handle)?.storage_bytes())?
                .checked_add(4)
        })
        .ok_or(ExecutionError::Capacity)?;
    let bytes = crate::host::retained_size::heap_sum([
        1024,
        8 * (name.storage_bytes() + stowed_bytes + actor.name.storage_bytes()),
        item_id.len(),
        actor.id.len(),
        stowed.len() * 2 * size_of::<&JsText>(),
    ])
    .ok_or(ExecutionError::Capacity)?;
    custody.resize(
        custody
            .bytes()
            .checked_add(bytes)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let period = JsText::from(".");
    if stowed.is_empty() {
        return Ok((
            JsText::concat(&[&COPY.equipped, name, &period]),
            JsText::concat(&[&COPY.equipped_event, name, &period]),
        ));
    }
    let comma = JsText::from(", ");
    let mut names = Vec::with_capacity(2 * stowed.len());
    for handle in stowed {
        if !names.is_empty() {
            names.push(&comma);
        }
        names.push(stowed_name(*handle).ok_or(ExecutionError::Invariant)?);
    }
    let names = JsText::concat(&names);
    Ok((
        JsText::concat(&[
            &COPY.equipped,
            name,
            &period,
            &COPY.stowed,
            &names,
            &COPY.stowed_result,
        ]),
        JsText::concat(&[
            &COPY.equipped_event,
            name,
            &COPY.stowed_event,
            &names,
            &period,
        ]),
    ))
}

fn stage_equipped(
    core: &mut CoreMutation<'_>,
    actor_id: &str,
    text: &JsText,
) -> Result<StagedOccurrence, ExecutionError> {
    core.stage_event(EventEmissionIntent {
        event_type: "equipped".to_owned(),
        text: EmissionText::Narration(Narration {
            parts: vec![
                NarrationPart::Participant {
                    entity_id: actor_id.into(),
                    role: PersonRole::Subject,
                    article: None,
                },
                NarrationPart::Literal(JsText::concat(&[&" ".into(), text])),
            ],
        }),
        audience: AudienceSelection::Physical,
        source_id: Some(actor_id.into()),
        target_id: None,
        data: None,
        scope: EventScope::External,
        origin: None,
        exposure: None,
    })
}

impl CommandCursor {
    /// Settle the already admitted change only after replacing the previous
    /// action has released its exact stock holds in the same candidate.
    pub(super) fn equip_strike(
        &mut self,
        core: &mut CoreMutation<'_>,
        actor_id: &str,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::Strike {
            weapon_item_id: Some(item_id),
            auto_equip: Some(true),
            ..
        } = &self.command
        else {
            return Ok(None);
        };
        if matches!(core.state.physical.entities.get(item_id).and_then(|item| item.placement.as_ref()),
            Some(crate::state::Placement::Attached { parent_entity_id, .. }) if parent_entity_id == actor_id)
        {
            return Ok(None);
        }
        let EquipmentDecision::Applied { stowed, _custody } =
            core.equip_for_action(actor_id, item_id)?
        else {
            return Err(ExecutionError::InvalidCheckpoint);
        };
        let actor = core
            .state
            .physical
            .entities
            .get(actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let (message, narration) =
            equipped_copy(&core.state, actor, item_id, &stowed, &mut self._reservation)?;
        self.outcome
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .message = message;
        let event = stage_equipped(core, actor_id, &narration)?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::ContactAfterEquip;
        Ok(Some(event))
    }
}
