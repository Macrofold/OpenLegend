use super::*;
use crate::execution::{EquipmentDecision, EquipmentRequest};
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

impl CommandCursor {
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
        let installed = &core.state.installed.retained;
        let entities = &core.state.physical.entities;
        let item_name = |id| {
            let lot = entities.resolve(id)?.item.as_ref()?;
            Some(&installed.items.get(&lot.definition_pin.id)?.named.name)
        };
        let name = entities
            .handle(item_id)
            .and_then(item_name)
            .ok_or(ExecutionError::Invariant)?;
        let actor = entities.get(actor_id).ok_or(ExecutionError::MissingActor)?;
        let stowed_bytes = stowed
            .iter()
            .try_fold(0_usize, |sum, id| {
                sum.checked_add(item_name(*id)?.storage_bytes())?
                    .checked_add(4)
            })
            .ok_or(ExecutionError::Capacity)?;
        let text_work = crate::host::retained_size::heap_sum([
            1024,
            8 * (name.storage_bytes() + stowed_bytes + actor.name.storage_bytes()),
            item_id.len(),
            actor_id.len(),
            (stowed.len() * 2) * size_of::<&JsText>(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(text_work)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut result = outcome(true, if equipping { "equipped" } else { "unequipped" }, "");
        let text = if equipping {
            let separator = JsText::from(", ");
            let period = JsText::from(".");
            let mut names = Vec::with_capacity(stowed.len() * 2);
            for id in &stowed {
                if !names.is_empty() {
                    names.push(&separator);
                }
                names.push(item_name(*id).ok_or(ExecutionError::Invariant)?);
            }
            let stowed = JsText::concat(&names);
            let (message, narration) = if names.is_empty() {
                (
                    JsText::concat(&[&COPY.equipped, name, &period]),
                    JsText::concat(&[&COPY.equipped_event, name, &period]),
                )
            } else {
                (
                    JsText::concat(&[
                        &COPY.equipped,
                        name,
                        &period,
                        &COPY.stowed,
                        &stowed,
                        &COPY.stowed_result,
                    ]),
                    JsText::concat(&[
                        &COPY.equipped_event,
                        name,
                        &COPY.stowed_event,
                        &stowed,
                        &period,
                    ]),
                )
            };
            result.message = message;
            result.item_id = Some(item_id.clone());
            Some(narration)
        } else {
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
        let event = core.stage_event(EventEmissionIntent {
            event_type: "equipped".to_owned(),
            text: EmissionText::Narration(Narration {
                parts: vec![
                    NarrationPart::Participant {
                        entity_id: actor_id.into(),
                        role: PersonRole::Subject,
                        article: None,
                    },
                    NarrationPart::Literal(JsText::concat(&[&" ".into(), &text])),
                ],
            }),
            audience: AudienceSelection::Physical,
            source_id: Some(actor_id.into()),
            target_id: None,
            data: None,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::ImmediateResult;
        Ok(Some(event))
    }
}
