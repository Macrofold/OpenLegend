//! Checked owned weapons are prepared once for the selected, currently seen
//! bodies. Preview/execution still run through the ordinary contact owner.
use super::*;
use crate::contact::ContactRead;
use crate::state::{Entity, EntityHandle, Placement};
use crate::text::JsText;
use crate::worlds::activity_display::{StrikeRead, equipped_strike_offer};

struct Weapon {
    handle: EntityHandle,
    equipment: JsText,
    _storage: ByteReservation,
}

pub(super) struct MeleeChoices {
    weapons: Vec<Weapon>,
    _storage: ByteReservation,
}

impl MeleeChoices {
    fn prepare(
        core: &CoreMutation<'_>,
        source: &Entity,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let state = &core.state;
        let entities = &state.physical.entities;
        let mut weapons = Vec::new();
        let mut storage = budget.reserve(0)?;
        for &handle in state.inventory.direct_items(&source.id) {
            let item = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
            if ContactRead::carried(state, source, item, budget)?.is_none() {
                continue;
            }
            let (equipment, _storage) =
                if matches!(&item.placement, Some(Placement::Attached { .. })) {
                    (JsText::default(), budget.reserve(0)?)
                } else {
                    crate::commands::equipment_preview(state, source, item, budget)?
                };
            if weapons.len() == weapons.capacity() {
                let cap = weapons
                    .len()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?
                    .max(2);
                let next = budget.reserve(
                    cap.checked_mul(size_of::<Weapon>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                weapons
                    .try_reserve_exact(cap - weapons.len())
                    .map_err(|_| ExecutionError::Capacity)?;
                storage = next;
            }
            weapons.push(Weapon {
                handle,
                equipment,
                _storage,
            });
        }
        Ok(Self {
            weapons,
            _storage: storage,
        })
    }
}

impl NpcCandidateCursor {
    pub(super) fn offer_equipped_strike(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        weapon_index: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        self.stage = Enumerate::EquippedStrike(index + 1, 0);
        let Some(target) = self.targets.get(index) else {
            self.melee_choices = None;
            self.stage = Enumerate::Guard(0, 0);
            return Ok(());
        };
        if !target.visible || !target.alive {
            return Ok(());
        }
        let state = &core.state;
        let entities = &state.physical.entities;
        let source = entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        let subject = entities.get(&target.id).ok_or(ExecutionError::Invariant)?;
        let Some(life) = subject
            .physical_life()
            .filter(|&life| crate::contact::may_target(&state.installed, source, subject, life))
        else {
            return Ok(());
        };
        if self.melee_choices.is_none() {
            let choices = MeleeChoices::prepare(core, source, &self.budget)?;
            if choices.weapons.is_empty() {
                self.stage = Enumerate::Guard(0, 0);
                return Ok(());
            }
            self.melee_choices = Some(choices);
        }
        let Some(weapon) = self
            .melee_choices
            .as_ref()
            .and_then(|choices| choices.weapons.get(weapon_index))
        else {
            return Ok(());
        };
        let item = entities
            .resolve(weapon.handle)
            .ok_or(ExecutionError::Invariant)?;
        // The same preparation cut owns the known weapon and its prospective
        // resource checks. The ordinary preview still owns geometry/admission.
        let definition_id = &item
            .item
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .definition_pin
            .id;
        let rules = &state.installed.occurrence_rules.value().response.offers;
        let hunting = rules.hunting.methods.melee
            && source
                .actor
                .as_ref()
                .and_then(|actor| actor.body.as_ref())
                .is_some_and(|body| rules.manual_work_body_plans.contains(&body.plan))
            && subject
                .actor
                .as_ref()
                .and_then(|actor| actor.species.as_ref())
                .is_some_and(|species| rules.hunting.known_prey.contains(species));
        let input = EquippedStrike {
            actor_id: &self.actor,
            auto_equip: true,
            definition_id,
            id: preparation_id,
            purpose: hunting.then_some(rules.hunting_purpose.as_str()),
            target_id: &target.id,
            target_life: life,
            kind: &rules.strike_command,
            weapon_item_id: &item.id,
        };
        let (command, storage) = self.bind_offer(
            preparation_id,
            input.purpose,
            &input,
            8 + usize::from(hunting),
            0,
            |envelope| {
                Ok(NativeCommand::Strike {
                    envelope,
                    target_id: target.id.clone(),
                    target_life: Some(life),
                    definition_id: definition_id.clone(),
                    weapon_item_id: Some(item.id.clone()),
                    auto_equip: Some(true),
                })
            },
        )?;
        let id = self.id(&[definition_id, ":", &item.id, ":", &target.id])?;
        self.stage = Enumerate::EquippedStrike(index, weapon_index + 1);
        self.start(
            core,
            id,
            NpcOfferMeaning::EquippedStrike {
                body: target.body,
                weapon: weapon_index,
            },
            command,
            storage,
            WorkTransitionMode::Replace,
        )
    }

    pub(super) fn describe_equipped_strike(
        &self,
        core: &CoreMutation<'_>,
        offer: &mut PreparedNpcOffer,
    ) -> Result<(), ExecutionError> {
        let NpcOfferMeaning::EquippedStrike { body, weapon } = offer.meaning else {
            return Ok(());
        };
        let Some(NativeCommand::Strike {
            envelope,
            definition_id,
            ..
        }) = offer.command.command()
        else {
            return Err(ExecutionError::Invariant);
        };
        let weapon = self
            .melee_choices
            .as_ref()
            .and_then(|choices| choices.weapons.get(weapon))
            .ok_or(ExecutionError::Invariant)?;
        let state = &core.state;
        let definition = state
            .installed
            .retained
            .items
            .get(definition_id)
            .ok_or(ExecutionError::Invariant)?;
        let profile = definition
            .melee_profile()
            .ok_or(ExecutionError::Invariant)?;
        let name = self
            .description_context
            .as_ref()
            .and_then(|read| read.named_body(body))
            .ok_or(ExecutionError::Invariant)?;
        let hunting = &state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .hunting;
        let mut storage = self.budget.reserve(
            super::casting::text_bound(
                [&weapon.equipment, &definition.named.name, &name.name]
                    .into_iter()
                    .chain(definition.description.as_ref()),
            )?
            .checked_add(4096)
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let description = equipped_strike_offer(
            &weapon.equipment,
            &definition.named,
            definition.description.as_ref(),
            name,
            StrikeRead {
                damage: profile.damage,
                range: profile.range,
                approach_range: Some(profile.approach_range),
                work_seconds: profile.windup_seconds,
                recovery_seconds: Some(profile.recovery_seconds),
                accuracy: Some(profile.accuracy),
            },
            envelope.purpose.is_some().then_some(hunting),
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
struct EquippedStrike<'a> {
    actor_id: &'a str,
    auto_equip: bool,
    definition_id: &'a str,
    id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a str>,
    target_id: &'a str,
    target_life: u64,
    #[serde(rename = "type")]
    kind: &'a str,
    weapon_item_id: &'a str,
}
