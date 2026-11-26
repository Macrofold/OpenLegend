//! Ordinary fire offers bind perceived heat to installed rules and exact
//! accessible stock. The command owner rechecks sight, reach, holds and effects.
use super::*;
use crate::fire_care::{self, FireCare, FireOperation};
use crate::host::retained_size::map_storage;
use crate::text::JsText;
use indexmap::IndexMap;

pub(super) struct FuelChoices {
    lots: IndexMap<usize, String>,
    _backing: ByteReservation,
    _ids: ByteReservation,
}

impl FuelChoices {
    /// Choose an exact accessible lot per fuel definition in inventory order.
    /// All eligible fires in this capture reuse this same finite stock read.
    fn prepare(
        core: &CoreMutation<'_>,
        rule: &FireCare,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let state = &*core.state;
        let mut lots = IndexMap::new();
        let mut backing = budget.reserve(0)?;
        let mut ids = budget.reserve(0)?;
        fire_care::owned_materials(state, rule, actor, |lot| {
            let definition = state
                .installed
                .retained
                .items
                .get_index_of(lot.definition_id)
                .ok_or(ExecutionError::Invariant)?;
            if lots.contains_key(&definition) {
                return Ok(());
            }
            if lots.len() == lots.capacity() {
                let capacity = lots
                    .capacity()
                    .max(2)
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?;
                let replacement = budget.reserve(
                    map_storage::<usize, String>(capacity).ok_or(ExecutionError::Capacity)?,
                )?;
                lots.try_reserve_exact(capacity - lots.len())
                    .map_err(|_| ExecutionError::Capacity)?;
                backing = replacement;
            }
            ids.resize(
                ids.bytes()
                    .checked_add(lot.id.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            lots.insert(definition, lot.id.to_owned());
            Ok(())
        })?;
        Ok(Self {
            lots,
            _backing: backing,
            _ids: ids,
        })
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FireCommand<'a> {
    actor_id: &'a str,
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'static str,
    target_id: &'a str,
    operation: FireOperation,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
}

impl NpcCandidateCursor {
    pub(super) fn offer_fire(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        choice: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        let target = &self.targets[index];
        let rule = core
            .state
            .installed
            .fire_care
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .value();
        self.stage = Enumerate::Fire(index + 1, 0);
        let Some(heat) = (target.visible && target.heat_lit.is_some())
            .then(|| fire_care::target(&core.state.physical, &target.id))
            .flatten()
            .and_then(|entity| entity.heat)
        else {
            return Ok(());
        };
        let has_stock = core.state.inventory.has_children(&self.actor);
        let (operation, item_id) = if choice == 0 {
            self.stage = Enumerate::Fire(index, 1);
            if heat.lit {
                (FireOperation::Extinguish, None)
            } else if heat.fuel_seconds > 0.0 && has_stock {
                (FireOperation::Light, None)
            } else {
                return Ok(());
            }
        } else {
            if !has_stock || !rule.can_add_fuel(heat) {
                return Ok(());
            }
            if self.fuels.is_none() {
                self.fuels = Some(FuelChoices::prepare(core, rule, &self.actor, &self.budget)?);
            }
            let Some((_, item)) = self
                .fuels
                .as_ref()
                .and_then(|fuels| fuels.lots.get_index(choice - 1))
            else {
                return Ok(());
            };
            self.stage = Enumerate::Fire(index, choice + 1);
            (FireOperation::Fuel, Some(item.as_str()))
        };
        let body = target.body;
        let input = FireCommand {
            actor_id: &self.actor,
            id: preparation_id,
            kind: "tend-fire",
            target_id: &target.id,
            operation,
            item_id,
        };
        let (command, guard) = self.bind_offer(
            preparation_id,
            None,
            &input,
            5 + usize::from(item_id.is_some()),
            0,
            |envelope| {
                Ok(NativeCommand::TendFire {
                    envelope,
                    target_id: target.id.clone(),
                    operation,
                    item_id: item_id.map(str::to_owned),
                })
            },
        )?;
        let _digest_storage = self.budget.reserve(64)?;
        let digest = crate::encoding::sha256_hex(command.source_encoding().as_bytes());
        let id = self.id(&["fire-care-", &digest])?;
        self.start(
            core,
            id,
            NpcOfferMeaning::FireCare { body },
            command,
            guard,
            WorkTransitionMode::Replace,
        )
    }

    pub(super) fn describe_fire(
        &self,
        core: &CoreMutation<'_>,
        offer: &mut PreparedNpcOffer,
    ) -> Result<(), ExecutionError> {
        let NpcOfferMeaning::FireCare { body } = offer.meaning else {
            return Ok(());
        };
        let Some(NativeCommand::TendFire {
            operation, item_id, ..
        }) = offer.command.command()
        else {
            return Err(ExecutionError::Invariant);
        };
        let installed = &core.state.installed;
        let rule = installed
            .fire_care
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .value();
        let words = rule.words(*operation);
        let target = self
            .description_context
            .as_ref()
            .and_then(|context| context.observed_name(body))
            .ok_or(ExecutionError::Invariant)?;
        // The ordinary preview already checked ownership. Read only the
        // installed name, never a privately held record identifier.
        let item = item_id
            .as_ref()
            .map(|id| {
                core.state
                    .physical
                    .entities
                    .get(id)
                    .and_then(|entity| entity.item.as_ref())
                    .and_then(|item| installed.retained.items.get(&item.definition_pin.id))
                    .map(|definition| &definition.named.name)
                    .ok_or(ExecutionError::Invariant)
            })
            .transpose()?;
        // Every finite f64 has a decimal display of fewer than 512 bytes.
        let _time_workspace = self.budget.reserve(512)?;
        let seconds = rule.work_seconds(*operation).to_string();
        let duration = &rule.menu.duration;
        let duration_bound = duration
            .matches("{seconds}")
            .count()
            .checked_mul(seconds.len())
            .and_then(|bytes| bytes.checked_add(duration.len()))
            .ok_or(ExecutionError::Capacity)?;
        let (prefix, suffix) = if item.is_some() {
            (&*rule.menu.fuel_item_prefix, &*rule.menu.fuel_item_suffix)
        } else {
            (&*words.label, " ")
        };
        let known_text = heap_sum([
            prefix.len(),
            suffix.len(),
            words.description.len(),
            duration_bound,
        ])
        .and_then(|bytes| bytes.checked_mul(16))
        .ok_or(ExecutionError::Capacity)?;
        let text_bound = super::casting::text_bound([target].into_iter().chain(item))?;
        let mut storage = self.budget.reserve(
            text_bound
                .checked_add(known_text)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let prefix = prefix.into();
        let suffix = suffix.into();
        let detail = words.description.as_str().into();
        let duration = duration.replace("{seconds}", &seconds).into();
        let description = JsText::join(
            [&prefix].into_iter().chain(item).chain([
                &suffix,
                target,
                &". ".into(),
                &detail,
                &" ".into(),
                &duration,
            ]),
            "",
        );
        storage.resize(description.storage_bytes())?;
        offer._storage.merge(storage)?;
        offer.description = Some(description);
        Ok(())
    }
}
