//! Exact action holds share the physical inverse journal with inventory and
//! the action itself. Settled claim records survive only in the saved prefix.
use super::*;
use crate::item_holds::{ActionHoldKey, ClaimState, HeldRecord, prepare_hold};

impl CoreMutation<'_> {
    pub(crate) fn reserve_projectile(&mut self, actor: &str) -> Result<(), ExecutionError> {
        let physical = &self.state.physical;
        let action = physical.entities.get(actor).and_then(|entity| entity.actor.as_ref())
            .and_then(|body| body.action.as_ref()).ok_or(ExecutionError::MissingActor)?;
        let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
        let ammunition = action.ammo_item_id.as_deref().ok_or(ExecutionError::Invariant)?;
        let lot = physical.entities.get(ammunition).and_then(|entity| entity.item.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        if lot.definition_pin != aim.ammunition || lot.quantity <= physical.holds.quantity(ammunition) {
            return Err(ExecutionError::Invariant);
        }
        use crate::work::WorkUnit;
        self.journal.meters.charge(&[(WorkUnit::Claims, 1), (WorkUnit::Effects, 1)])?;
        let (id, held) = prepare_hold(
            actor, &action.id, ActionHoldKey::Projectile(0), (ammunition, 1),
            &aim.ammunition, lot.revision, physical.holds.coverage.next_ordinal,
            &self.journal.physical.budget,
        )?;
        if id != aim.reservation_id {
            return Err(ExecutionError::Invariant);
        }
        self.physical().install_item_hold(id, held)
    }

    /// Reserve the complete staged group before installing any claim. The
    /// action is already native and journalled, so refusal rolls that back too.
    pub(crate) fn reserve_hearth_holds(&mut self, actor_id: &str) -> Result<(), ExecutionError> {
        let physical = &self.state.physical;
        let action = physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let work = action
            .hearth_work
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let definition = self
            .state
            .installed
            .retained
            .hearths
            .get(&work.definition.id)
            .filter(|value| value.pin == work.definition)
            .ok_or(ExecutionError::Invariant)?;
        let budget = &self.journal.physical.budget;
        let _buffer = budget
            .reserve(work.stones.len() * size_of::<(String, crate::item_holds::HeldRecord)>())?;
        let mut prepared = Vec::with_capacity(work.stones.len());
        for (index, stone) in work.stones.iter().enumerate() {
            use crate::work::WorkUnit;
            self.journal
                .meters
                .charge(&[(WorkUnit::Claims, 1), (WorkUnit::Effects, 1)])?;
            let lot = physical
                .entities
                .get(&stone.item_id)
                .and_then(|entity| entity.item.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            if lot
                .quantity
                .saturating_sub(physical.holds.quantity(&stone.item_id))
                < stone.quantity
            {
                return Err(ExecutionError::Invariant);
            }
            let ordinal = physical
                .holds
                .coverage
                .next_ordinal
                .checked_add(index as u64)
                .filter(|ordinal| *ordinal < MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            prepared.push(prepare_hold(
                actor_id,
                &action.id,
                ActionHoldKey::HearthInput(index),
                (&stone.item_id, stone.quantity),
                &definition.definition.input.definition,
                lot.revision,
                ordinal,
                budget,
            )?);
        }
        let mut physical = self.physical();
        for (id, record) in prepared {
            physical.install_item_hold(id, record)?;
        }
        Ok(())
    }

    /// Claim the installed craft's exact kept tool before preparing the input
    /// debit. The original command checkpoint rolls back both if refused.
    pub(crate) fn reserve_craft_tool(&mut self, actor: &str) -> Result<(), ExecutionError> {
        let physical = &self.state.physical;
        let action = physical
            .entities
            .get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.is_manufacturing())
            .ok_or(ExecutionError::Invariant)?;
        let Some(tools) = action.manufacture_tools.as_deref() else {
            return Err(ExecutionError::Invariant);
        };
        let tool = match tools {
            [] => return Ok(()),
            [tool] => tool,
            _ => return Err(ExecutionError::Invariant),
        };
        let lot = physical
            .entities
            .get(&tool.item_id)
            .and_then(|entity| entity.item.as_ref())
            .filter(|lot| {
                lot.definition_pin == tool.definition
                    && lot
                        .quantity
                        .saturating_sub(physical.holds.quantity(&tool.item_id))
                        >= tool.quantity
            })
            .ok_or(ExecutionError::Invariant)?;
        use crate::work::WorkUnit;
        self.journal
            .meters
            .charge(&[(WorkUnit::Claims, 1), (WorkUnit::Effects, 1)])?;
        let (id, held) = prepare_hold(
            actor,
            &action.id,
            ActionHoldKey::ManufactureTool(0),
            (&tool.item_id, tool.quantity),
            &tool.definition,
            lot.revision,
            physical.holds.coverage.next_ordinal,
            &self.journal.physical.budget,
        )?;
        self.physical().install_item_hold(id, held)
    }
}

impl PhysicalMutation<'_> {
    fn install_item_hold(&mut self, id: String, record: HeldRecord) -> Result<(), ExecutionError> {
        let coverage = &self.state.holds.coverage;
        if coverage.next_ordinal >= MAX_SAFE_INTEGER {
            return Err(ExecutionError::Identity);
        }
        self.journal.reserve(id.len() + size_of::<Undo>())?;
        let undo = Undo::ItemHoldAdded {
            id: id.clone(),
            ordinal: coverage.next_ordinal,
            parent_present: coverage.parent_present,
        };
        self.hold_availability(record.item_id())?;
        self.state.holds.put(id, record)?;
        self.state.holds.coverage.next_ordinal += 1;
        self.state.holds.coverage.parent_present = true;
        self.journal.undo.push(undo);
        Ok(())
    }

    /// Release the current action's selected claims through the same inverse
    /// journal and durable row writer used by explicit consumption.
    pub(crate) fn release_action_holds(
        &mut self,
        actor: EntityHandle,
        count: usize,
        key: fn(usize) -> ActionHoldKey,
    ) -> Result<(), ExecutionError> {
        for index in 0..count {
            let action = self
                .state
                .entities
                .resolve(actor)
                .and_then(|entity| entity.actor.as_ref())
                .and_then(|actor| actor.action.as_ref())
                .ok_or(ExecutionError::Invariant)?;
            self.journal.reserve(action.id.len() + 32)?;
            let id = key(index).id(&action.id);
            self.end_item_hold(&id, ClaimState::Released)?;
        }
        Ok(())
    }

    pub(crate) fn end_item_hold(&mut self, id: &str, to: ClaimState) -> Result<(), ExecutionError> {
        let Some(row) = self.state.holds.get(id) else {
            return Ok(());
        };
        let after = row
            .value
            .revision
            .checked_add(1)
            .filter(|n| *n <= MAX_SAFE_INTEGER)
            .ok_or(ExecutionError::Identity)?;
        let retained = row.retain(&self.journal.budget)?;
        if to == ClaimState::Released {
            let scratch = self.journal.budget.reserve(row.item_id().len())?;
            let item = row.item_id().to_owned();
            self.hold_availability(&item)?;
            drop(scratch);
        }
        self.journal
            .reserve(size_of::<crate::item_holds::HeldRecord>() + size_of::<Undo>())?;
        let (key, mut hold) = self.state.holds.remove(id)?;
        let amount = hold.value.amount;
        hold.value.state = to;
        hold.value.revision = after;
        if to == ClaimState::Consumed {
            hold.value.amount = 0.0;
        }
        self.journal.undo.push(Undo::ItemHoldEnded {
            key,
            hold: Box::new(hold),
            amount,
            _custody: retained,
        });
        Ok(())
    }
}
