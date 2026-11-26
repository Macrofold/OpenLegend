//! Defense binds an exact shield and either received personal danger or a
//! presently observed preparation. The guard command rechecks its own binding.
use super::*;
use crate::commands::guard_input::{GuardFacing, bind_npc};
use crate::contact::StrikePhase;
use crate::state::{Action, Entity, EntityHandle};
use crate::text::JsText;
use std::sync::Arc;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcGuardTool {
    pub label: String,
    pub shield: JsText,
    pub preparation: f64,
    pub ready: f64,
    pub coverage: f64,
    pub reduction: f64,
    pub recovery: f64,
    pub equipment: JsText,
    #[serde(skip)]
    _storage: ByteReservation,
}

pub(super) struct GuardChoices {
    shields: Vec<(EntityHandle, Arc<NpcGuardTool>)>,
    _storage: ByteReservation,
}

fn observed_preparation(source: &Entity) -> bool {
    source.actively_participates()
        && source
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(|action| {
                action.stage == "working"
                    && (action.is_ranged_attack()
                        || action.is_natural_contact()
                            && action.strike_phase == Some(StrikePhase::Windup))
            })
}

impl GuardChoices {
    /// Look only at the actor's direct lots, the same custody the current
    /// equipment owner can attach. Prepare each shield once for all threats.
    fn prepare(
        core: &CoreMutation<'_>,
        actor: &Entity,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let state = &core.state;
        let entities = &state.physical.entities;
        let inventory = &state.inventory;
        let installed = &state.installed.retained;
        let mut shields = Vec::new();
        let mut storage = budget.reserve(0)?;
        for &handle in inventory.direct_items(&actor.id) {
            let item = entities.resolve(handle).ok_or(ExecutionError::Invariant)?;
            let Some((definition, profile)) = item
                .item
                .as_ref()
                .and_then(|lot| installed.items.get(&lot.definition_pin.id))
                .filter(|definition| definition.can_guard())
                .and_then(|definition| {
                    definition
                        .contact_defense
                        .as_ref()
                        .map(|profile| (definition, profile))
                })
            else {
                continue;
            };
            if !crate::execution::equipment_can_equip(state, actor, item, true, budget)? {
                continue;
            }
            let equipped = matches!(
                item.placement,
                Some(crate::state::Placement::Attached { .. })
            );
            let mut facts = budget.reserve(
                heap_sum([
                    size_of::<NpcGuardTool>() + 2 * size_of::<usize>(),
                    profile.label.len(),
                    definition.named.name.storage_bytes(),
                ])
                .ok_or(ExecutionError::Capacity)?,
            )?;
            let equipment = if equipped {
                JsText::default()
            } else {
                let (description, custody) =
                    crate::commands::equipment_preview(state, actor, item, budget)?;
                facts.merge(custody)?;
                description
            };
            if shields.len() == shields.capacity() {
                let capacity = shields
                    .len()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?
                    .max(2);
                let replacement = budget.reserve(
                    capacity
                        .checked_mul(size_of::<(EntityHandle, Arc<NpcGuardTool>)>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                shields
                    .try_reserve_exact(capacity - shields.len())
                    .map_err(|_| ExecutionError::Capacity)?;
                storage = replacement;
            }
            shields.push((
                handle,
                Arc::new(NpcGuardTool {
                    label: profile.label.clone(),
                    shield: definition.named.name.clone(),
                    preparation: profile.preparation_seconds,
                    ready: profile.ready_seconds,
                    coverage: profile.coverage_degrees,
                    reduction: profile.reduction,
                    recovery: profile.recovery_seconds,
                    equipment,
                    _storage: facts,
                }),
            ));
        }
        Ok(Self {
            shields,
            _storage: storage,
        })
    }
}

impl NpcCandidateCursor {
    pub(super) fn offer_guard(
        &mut self,
        core: &mut CoreMutation<'_>,
        index: usize,
        shield: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        self.stage = Enumerate::Guard(index + 1, 0);
        let state = &core.state;
        let entities = &state.physical.entities;
        let (facing, body) = if let (0, Some(recent)) = (index, self.guard_threat.as_ref()) {
            (recent.facing(), None)
        } else {
            let Some(target) = self
                .targets
                .get(index - usize::from(self.guard_threat.is_some()))
            else {
                self.guard_choices = None;
                self.stage = Enumerate::CurrentWork(0);
                return Ok(());
            };
            let Some(source) = target
                .visible
                .then(|| entities.get(&target.id))
                .flatten()
                .filter(|entity| observed_preparation(entity))
            else {
                return Ok(());
            };
            let life = source.physical_life().ok_or(ExecutionError::MissingActor)?;
            (
                GuardFacing::Subject {
                    id: source.id.as_str(),
                    life,
                },
                Some(target.body),
            )
        };
        let actor = entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        if self.guard_choices.is_none() {
            let body = actor.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
            let rules = &state.installed.occurrence_rules.value().response.offers;
            if !body
                .body
                .as_ref()
                .is_some_and(|body| rules.manual_work_body_plans.contains(&body.plan))
                || body
                    .combat_ready_at
                    .is_some_and(|at| at > state.physical.header.sim_time)
                || body.action.as_ref().is_some_and(Action::is_guard)
            {
                self.stage = Enumerate::CurrentWork(0);
                return Ok(());
            }
            let choices = GuardChoices::prepare(core, actor, &self.budget)?;
            if choices.shields.is_empty() {
                self.stage = Enumerate::CurrentWork(0);
                return Ok(());
            }
            self.guard_choices = Some(choices);
        }
        let Some((item, tool)) = self
            .guard_choices
            .as_ref()
            .and_then(|choices| choices.shields.get(shield))
        else {
            return Ok(());
        };
        let item = entities.resolve(*item).ok_or(ExecutionError::Invariant)?;
        let (command, guard) =
            bind_npc(preparation_id, &self.actor, &item.id, facing, &self.budget)?;
        let id = match facing {
            GuardFacing::Subject { id, .. } => self.id(&["guard:", &item.id, ":", id])?,
            _ => self.id(&["guard-current-facing:", &item.id])?,
        };
        let meaning = NpcOfferMeaning::Guard {
            body,
            tool: Arc::clone(tool),
        };
        self.stage = Enumerate::Guard(index, shield + 1);
        self.start(
            core,
            id,
            meaning,
            command,
            guard,
            WorkTransitionMode::Replace,
        )
    }
}
