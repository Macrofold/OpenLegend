//! A resident can offer one exact subject shot at an already perceived body.
//! The ordinary command preparation owns sight, approach and work admission.
use super::*;
use crate::commands::RangedIntent;
use crate::projectile::{RangedTarget, RuntimeRangedMode, loadout::StockAdmission};
use crate::state::{Entity, EntityHandle, Placement};
use crate::text::JsText;

struct Stock {
    handle: EntityHandle,
    kind: String,
    order: usize,
    _text: ByteReservation,
}

pub(super) struct RangedChoices {
    tools: Vec<EntityHandle>,
    stock: Vec<Stock>,
    _tools: ByteReservation,
    _stock: ByteReservation,
}

impl RangedChoices {
    /// Scan direct equipment first. An unarmed resident has no reason to
    /// walk their carried containers looking for projectiles.
    fn prepare(
        core: &CoreMutation<'_>,
        source: &Entity,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let state = &core.state;
        let items = &state.installed.retained.items;
        let entities = &state.physical.entities;
        let mut choices = Self {
            tools: Vec::new(),
            stock: Vec::new(),
            _tools: budget.reserve(0)?,
            _stock: budget.reserve(0)?,
        };
        for &handle in state.inventory.direct_items(&source.id) {
            let item = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
            let lot = item.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let definition = items
                .get(&lot.definition_pin.id)
                .ok_or(ExecutionError::Invariant)?;
            if definition.ranged_weapon.is_none()
                || !crate::execution::equipment_can_equip(state, source, item, true, budget)?
            {
                continue;
            }
            push(&mut choices.tools, &mut choices._tools, handle, budget)?;
        }
        if choices.tools.is_empty() {
            return Ok(choices);
        }
        let admission = StockAdmission::Replace(budget);
        state.inventory.visit_owned(
            &state.physical,
            &state.installed.retained,
            &source.id,
            &source.id,
            &mut |lot| {
                let definition = items
                    .get(lot.definition_id)
                    .ok_or(ExecutionError::Invariant)?;
                let Some(ammunition) = definition.ammunition.as_ref() else {
                    return Ok(());
                };
                if !admission.available(state, source, lot, definition)? {
                    return Ok(());
                }
                let text = budget.reserve(ammunition.kind.len())?;
                let stock = Stock {
                    handle: entities.handle(lot.id).ok_or(ExecutionError::Invariant)?,
                    kind: ammunition.kind.clone(),
                    order: choices.stock.len(),
                    _text: text,
                };
                push(&mut choices.stock, &mut choices._stock, stock, budget)
            },
        )?;
        choices.stock.sort_unstable_by(|left, right| {
            left.kind
                .cmp(&right.kind)
                .then(left.order.cmp(&right.order))
        });
        Ok(choices)
    }

    fn matching(&self, kind: &str) -> &[Stock] {
        let start = self.stock.partition_point(|lot| lot.kind.as_str() < kind);
        let matching = &self.stock[start..];
        &matching[..matching.partition_point(|lot| lot.kind == kind)]
    }
}

fn push<T>(
    entries: &mut Vec<T>,
    custody: &mut ByteReservation,
    value: T,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if entries.len() == entries.capacity() {
        let capacity = entries
            .len()
            .checked_mul(2)
            .ok_or(ExecutionError::Capacity)?
            .max(2);
        let next = budget.reserve(
            capacity
                .checked_mul(size_of::<T>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        entries
            .try_reserve_exact(capacity - entries.len())
            .map_err(|_| ExecutionError::Capacity)?;
        *custody = next;
    }
    entries.push(value);
    Ok(())
}

impl NpcCandidateCursor {
    pub(super) fn offer_ranged(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        tool_index: usize,
        stock_index: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        self.stage = Enumerate::Ranged(index + 1, 0, 0);
        let Some(target) = self.targets.get(index) else {
            self.ranged_choices = None;
            self.stage = Enumerate::Guard(0, 0);
            return Ok(());
        };
        if !target.visible || !target.alive {
            return Ok(());
        }
        let state = &core.state;
        let installed = &state.installed;
        let entities = &state.physical.entities;
        let source = entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let Some(life) = entities.get(&target.id).and_then(Entity::physical_life) else {
            return Ok(());
        };
        let Some(subject) = crate::projectile::selected_body(state, source, (&target.id, life))
        else {
            return Ok(());
        };
        if self.ranged_choices.is_none() {
            if !installed
                .retained
                .item_handling_read
                .can_handle(&source.spatial.body.id)
            {
                self.stage = Enumerate::Guard(0, 0);
                return Ok(());
            }
            let choices = RangedChoices::prepare(core, source, &self.budget)?;
            if choices.stock.is_empty() || choices.tools.is_empty() {
                self.stage = Enumerate::Guard(0, 0);
                return Ok(());
            }
            self.ranged_choices = Some(choices);
        }
        let choices = self
            .ranged_choices
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let Some(&handle) = choices.tools.get(tool_index) else {
            return Ok(());
        };
        let tool = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
        let weapon = tool
            .item
            .as_ref()
            .and_then(|item| installed.retained.items.get(&item.definition_pin.id))
            .and_then(|definition| definition.ranged_weapon.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        self.stage = Enumerate::Ranged(index, tool_index + 1, 0);
        let Some(stock) = choices.matching(&weapon.ammunition_kind).get(stock_index) else {
            return Ok(());
        };
        let ammunition = entities
            .resolve(stock.handle)
            .ok_or(ExecutionError::Invariant)?;
        let hunt = crate::projectile::may_hunt(installed, subject);
        let mode = if hunt {
            RuntimeRangedMode::Hunt
        } else {
            RuntimeRangedMode::ShootOnce
        };
        let purpose = hunt.then_some(
            installed
                .occurrence_rules
                .value()
                .response
                .offers
                .hunting_purpose
                .as_str(),
        );
        let _target_storage = self.budget.reserve(target.id.len())?;
        let selected = RangedTarget::Subject {
            id: target.id.clone(),
            life,
        };
        let input = RangedChoice {
            actor_id: &self.actor,
            ammo_item_id: &ammunition.id,
            auto_equip: true,
            id: preparation_id,
            purpose,
            ranged_target: &selected,
            kind: mode.kind(),
            weapon_item_id: &tool.id,
        };
        let (command, storage) = self.bind_offer(
            preparation_id,
            purpose,
            &input,
            7 + usize::from(hunt),
            0,
            |envelope| {
                Ok(NativeCommand::Ranged {
                    envelope,
                    intent: RangedIntent::Start {
                        mode,
                        target: selected.clone(),
                        weapon: Some(tool.id.clone()),
                        ammunition: Some(ammunition.id.clone()),
                        auto_equip: true,
                    },
                })
            },
        )?;
        let identities = [&tool.id, &ammunition.id, &target.id];
        let bytes =
            crate::encoding::json_record_len(&identities).map_err(|_| ExecutionError::Invariant)?;
        let _identity_storage = self.budget.reserve(bytes)?;
        let identity =
            crate::encoding::json_record(&identities).map_err(|_| ExecutionError::Invariant)?;
        let id = self.id(&["shot:", &identity])?;
        self.stage = Enumerate::Ranged(index, tool_index, stock_index + 1);
        self.start(
            core,
            id,
            NpcOfferMeaning::Ranged { body: target.body },
            command,
            storage,
            WorkTransitionMode::Replace,
        )
    }

    pub(super) fn describe_ranged(
        &self,
        core: &CoreMutation<'_>,
        offer: &mut PreparedNpcOffer,
    ) -> Result<(), ExecutionError> {
        let NpcOfferMeaning::Ranged { body } = offer.meaning else {
            return Ok(());
        };
        let Some(NativeCommand::Ranged {
            envelope,
            intent:
                RangedIntent::Start {
                    ammunition: Some(stock),
                    weapon: Some(tool),
                    ..
                },
        }) = offer.command.command()
        else {
            return Err(ExecutionError::Invariant);
        };
        let state = &core.state;
        let installed = &state.installed;
        let entities = &state.physical.entities;
        let source = entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let tool = entities.get(tool).ok_or(ExecutionError::Invariant)?;
        let stock = entities.get(stock).ok_or(ExecutionError::Invariant)?;
        let stock_lot = stock.item.as_ref().ok_or(ExecutionError::Invariant)?;
        let stock_definition = installed
            .retained
            .items
            .get(&stock_lot.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let weapon_definition = tool
            .item
            .as_ref()
            .and_then(|lot| installed.retained.items.get(&lot.definition_pin.id))
            .ok_or(ExecutionError::Invariant)?;
        let weapon = weapon_definition
            .ranged_weapon
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let ammunition = stock_definition
            .ammunition
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let policy = installed
            .manifest
            .ranged_policy
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let occurrences = installed.occurrence_rules.value();
        let menu = &occurrences
            .ranged
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .menu;
        let target = self
            .description_context
            .as_ref()
            .and_then(|read| read.named_body(body))
            .ok_or(ExecutionError::Invariant)?;
        let (equipment, _equipment_storage) =
            if matches!(&tool.placement, Some(Placement::Attached { .. })) {
                (JsText::default(), self.budget.reserve(0)?)
            } else {
                crate::commands::equipment_preview(state, source, tool, &self.budget)?
            };
        let mut storage = self.budget.reserve(
            super::casting::text_bound(
                [
                    &equipment,
                    &target.name,
                    &weapon_definition.named.name,
                    &stock_definition.named.name,
                ]
                .into_iter()
                .chain(weapon_definition.description.as_ref()),
            )?
            .checked_add(policy.accuracy_explanation.len() * 2 + 4096)
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let description = crate::worlds::activity_display::ranged_offer(
            &equipment,
            target,
            weapon_definition,
            stock_definition,
            menu,
            envelope
                .purpose
                .is_some()
                .then_some(&occurrences.response.offers.hunting),
            crate::worlds::activity_display::RangedOfferFacts {
                damage: (weapon.damage + ammunition.damage_bonus).max(0.0),
                range: weapon.range,
                approach: policy.approach_range(weapon.range),
                flight_speed: weapon.flight_speed,
                windup: policy.windup_seconds,
                steadiness: weapon.accuracy,
                stock: stock_lot.quantity,
                accuracy_explanation: &policy.accuracy_explanation,
            },
        )
        .ok_or(ExecutionError::Invariant)?;
        storage.resize(description.storage_bytes())?;
        offer._storage.merge(storage)?;
        offer.description = Some(description);
        Ok(())
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RangedChoice<'a> {
    actor_id: &'a str,
    ammo_item_id: &'a str,
    auto_equip: bool,
    id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a str>,
    ranged_target: &'a RangedTarget,
    #[serde(rename = "type")]
    kind: &'a str,
    weapon_item_id: &'a str,
}
