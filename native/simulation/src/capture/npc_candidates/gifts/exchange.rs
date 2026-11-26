//! Older terms only extend a current, already prepared gift choice. This
//! reuses its actual reach preview and exact own stock instead of rebuilding
//! the catalogue or inspecting the other person's inventory.
use super::*;
use crate::{
    handover::{NpcTradeLot, trade_lot_current},
    reception::CurrentBodyReadScope,
    simulation::{AcceptedActorRead, SimulationState},
};

impl PreparedNpcCandidates {
    pub(crate) fn fresh_trade_peers(&self) -> impl Iterator<Item = &str> {
        self.offers
            .iter()
            .filter_map(|offer| match offer.command.handover() {
                Some(NpcHandover::Offer { recipient, .. }) => Some(recipient.as_str()),
                _ => None,
            })
    }

    /// Insert only exact admitted trades at the existing give choice's place
    /// in the bounded authored shortlist. The old gift still works when the
    /// independent history read has no usable result.
    pub(crate) fn add_disclosed_trades(
        &mut self,
        state: &SimulationState,
        read: &AcceptedActorRead,
        terms: &[NpcTradeLot],
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if terms.is_empty() {
            return Ok(());
        }
        let actor = &read.perception.actor_id;
        let Some(policy) = state.installed.retained.social_offer_read.as_ref() else {
            return Ok(());
        };
        let Some(scope) = CurrentBodyReadScope::prepare(
            &state.reception,
            &state.physical.entities,
            &state.installed,
            &state.experience,
            &crate::worlds::InstalledEvidenceMeaning,
            actor,
        )?
        else {
            return Ok(());
        };
        let window = crate::handover::ProposalWindow::new(state, actor, None, policy);
        let maximum = GIFT_COPY.resident_proposals;
        let mut count = 0;
        let mut index = 0;
        let actor_body = state
            .physical
            .entities
            .get(actor)
            .ok_or(ExecutionError::MissingActor)?;
        while index < self.offers.len() {
            let base = &self.offers[index];
            let Some(NpcHandover::Offer { recipient, lot }) = base.command.handover() else {
                if matches!(base.command.handover(), Some(NpcHandover::Counter { .. })) {
                    if count == maximum {
                        self.offers.remove(index);
                        continue;
                    }
                    count += 1;
                }
                index += 1;
                continue;
            };
            if count == maximum {
                self.offers.remove(index);
                continue;
            }
            let NpcOfferMeaning::Handover { body } = base.meaning else {
                return Err(ExecutionError::Invariant);
            };
            let subject = read
                .perception
                .bodies
                .get(body)
                .ok_or(ExecutionError::Invariant)?;
            let target = state.physical.entities.get(recipient);
            if !terms
                .iter()
                .any(|entry| entry.evidence.counterpart() == recipient)
                || subject.source_id != *recipient
                || !scope
                    .native_body(recipient)?
                    .is_some_and(|current| current.field.id == subject.lease_id)
                || window.recipient_problem(recipient, policy).is_some()
                || window.item_busy(state, &lot.item_id)
                || !trade_lot_current(state, actor, lot, true)
                || !target
                    .map(|body| gift_participant(state, body))
                    .transpose()?
                    .unwrap_or(false)
            {
                index += 1;
                count += 1;
                continue;
            }
            let target = target.ok_or(ExecutionError::Invariant)?;
            let reach = state.installed.retained.item_handling_read.reach;
            if crate::geometry::interaction_reach(actor_body, target, reach, budget)?.is_none() {
                index += 1;
                count += 1;
                continue;
            }

            // From here only the exact old gift row's index changes. Each
            // detached term is checked against its own accepted receipt.
            for disclosed in terms
                .iter()
                .filter(|entry| entry.evidence.counterpart() == target.id)
            {
                if count == maximum {
                    break;
                }
                let Some(NpcHandover::Offer { lot, .. }) = self.offers[index].command.handover()
                else {
                    return Err(ExecutionError::Invariant);
                };
                let requested = disclosed
                    .evidence
                    .only_lot()
                    .ok_or(ExecutionError::Invariant)?;
                if !disclosed.evidence.current(state, actor, &target.id)
                    || !trade_lot_current(state, &target.id, requested, true)
                    || window.item_busy(state, &requested.item_id)
                    || stock_contains(state, &lot.item_id, &requested.item_id)
                    || stock_contains(state, &requested.item_id, &lot.item_id)
                {
                    continue;
                }
                let offered = make_trade(state, body, lot, disclosed, budget)?;
                if self.offers.len() == self.offers.capacity() {
                    let step = self.offers.capacity().max(4);
                    let extra = step
                        .checked_mul(size_of::<PreparedNpcOffer>())
                        .ok_or(ExecutionError::Capacity)?;
                    self._storage.resize(
                        self._storage
                            .bytes()
                            .checked_add(extra)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.offers
                        .try_reserve_exact(step)
                        .map_err(|_| ExecutionError::Capacity)?;
                }
                self.offers.insert(index, offered);
                index += 1;
                count += 1;
            }
            if count == maximum {
                self.offers.remove(index);
            } else {
                index += 1;
                count += 1;
            }
        }
        Ok(())
    }
}

fn stock_contains(state: &SimulationState, ancestor: &str, item: &str) -> bool {
    let mut next = Some(item);
    while let Some(id) = next {
        if id == ancestor {
            return true;
        }
        next = state
            .physical
            .entities
            .get(id)
            .and_then(crate::install::inventory_parent);
    }
    false
}

fn make_trade(
    state: &SimulationState,
    body: usize,
    lot: &GiftLot,
    disclosed: &NpcTradeLot,
    budget: &ByteBudget,
) -> Result<PreparedNpcOffer, ExecutionError> {
    let copy = &*GIFT_COPY;
    let wanted = disclosed
        .evidence
        .only_lot()
        .ok_or(ExecutionError::Invariant)?;
    let peer = disclosed.evidence.counterpart();
    let definition = state
        .installed
        .retained
        .items
        .get(&lot.definition_pin.id)
        .ok_or(ExecutionError::Invariant)?;
    let _numbers = budget.reserve(64)?;
    let give = lot.quantity.to_string();
    let receive = wanted.quantity.to_string();
    let bytes = heap_sum([
        lot.heap_bytes().ok_or(ExecutionError::Capacity)?,
        16,
        lot.item_id.len(),
        give.len(),
        wanted.item_id.len(),
        peer.len(),
        casting::text_bound([
            &definition.named.name,
            &disclosed.name,
            &disclosed.description,
        ])?
        .checked_mul(2)
        .ok_or(ExecutionError::Capacity)?,
        (copy.exchange_description.len() + copy.decision.len() + 64)
            .checked_mul(12)
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(bytes)?;
    let id = format!("trade:{}:{}:{}:{}", lot.item_id, give, wanted.item_id, peer);
    let mut description = fill_terms(copy.exchange_description, |part, text| {
        let (quantity, name) = match part {
            "give" => (&give, &definition.named.name),
            "receive" => (&receive, &disclosed.name),
            _ => return Err(ExecutionError::Invariant),
        };
        text.push_str(quantity);
        text.push_str(" ");
        text.push_text(name);
        Ok(())
    })?;
    description.push_str(" ");
    description.push_text(&disclosed.description);
    description.push_str(" ");
    description.push_str(copy.decision);
    storage.resize(
        heap_sum([
            lot.heap_bytes().ok_or(ExecutionError::Capacity)?,
            description.storage_bytes(),
            id.capacity(),
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(PreparedNpcOffer {
        description: Some(description),
        id,
        meaning: NpcOfferMeaning::Handover { body },
        command: PreparedNpcInstruction::Handover(NpcHandover::Exchange {
            evidence: Arc::clone(&disclosed.evidence),
            lot: lot.clone(),
        }),
        transition: WorkTransitionMode::Continue,
        temporary: None,
        next_at: None,
        _storage: storage,
    })
}
