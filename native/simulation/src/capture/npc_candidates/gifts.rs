//! Immediate Handover choices use current carried stock and exact received
//! terms. Reply choices retain what the actor knows, including missed endings.
use super::*;
use crate::{
    execution::gift::{append_gift_exchange, append_gift_lots},
    handover::{
        CounterTerms, GiftDisclosure, GiftLot, GiftSource, NpcHandover, ProposalWindow,
        ReceivedGifts, gift_participant,
    },
    narration::{NameArticle, name_phrase},
    text::JsText,
    worlds::base_handover::GIFT_COPY,
};
use std::sync::Arc;

mod exchange;

impl NpcCandidateCursor {
    pub(super) fn offer_gift_replies(
        &mut self,
        core: &CoreMutation<'_>,
        actor: &crate::state::Entity,
    ) -> Result<Option<ReceivedGifts>, ExecutionError> {
        if core.state.installed.retained.social_offer_read.is_none()
            || !gift_participant(core.state, actor)?
        {
            return Ok(None);
        }
        let received = ReceivedGifts::from_player(core.state, &actor.id, &self.budget)?;
        for (gift, reference) in received.npc_incoming(&actor.id) {
            let Some(body) = self.targets.iter().find_map(|target| {
                (target.visible && target.alive && target.id == gift.offer.offerer_id)
                    .then_some(target.body)
            }) else {
                continue;
            };
            let person = self
                .description_context
                .as_ref()
                .and_then(|read| read.named_body(body))
                .ok_or(ExecutionError::Invariant)?;
            let _person_work = self.budget.reserve(
                casting::text_bound([&person.name])?
                    .checked_add(256)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let person = name_phrase(person, NameArticle::Definite, false);
            for accept in [true, false] {
                let (source, mut custody) = GiftSource::prepare(gift, reference, &self.budget)?;
                let (id, id_custody) = self.id(&[
                    if accept {
                        "accept-gift:"
                    } else {
                        "decline-gift:"
                    },
                    &gift.offer.id,
                ])?;
                custody.merge(id_custody)?;
                let (description, description_custody) =
                    describe_gift(gift, &person, accept, &self.budget)?;
                custody.merge(description_custody)?;
                self.append(PreparedNpcOffer {
                    description: Some(description),
                    id,
                    meaning: NpcOfferMeaning::Handover { body },
                    command: PreparedNpcInstruction::Handover(NpcHandover::Reply {
                        source,
                        accept,
                    }),
                    transition: WorkTransitionMode::Continue,
                    temporary: None,
                    next_at: None,
                    _storage: custody,
                })?;
            }
        }
        Ok(Some(received))
    }
}

fn describe_gift(
    gift: &GiftDisclosure,
    person: &JsText,
    accept: bool,
    budget: &ByteBudget,
) -> Result<(JsText, ByteReservation), ExecutionError> {
    let copy = &*GIFT_COPY;
    let template = match (accept, gift.offer.requested.is_empty()) {
        (true, true) => copy.reply_accept_gift,
        (false, true) => copy.reply_decline_gift,
        (true, false) => copy.reply_accept_trade,
        (false, false) => copy.reply_decline_trade,
    };
    let described = gift
        .descriptions
        .offered
        .iter()
        .chain(&gift.descriptions.requested);
    let text_bound = casting::text_bound(
        std::iter::once(person).chain(
            described
                .clone()
                .flat_map(|item| [&item.name, &item.description]),
        ),
    )?;
    let overhead = gift
        .offer
        .offered
        .len()
        .checked_add(gift.offer.requested.len())
        .and_then(|count| count.checked_mul(64))
        .and_then(|n| n.checked_add(template.len()))
        .and_then(|n| n.checked_add(copy.reciprocal_separator.len()))
        .and_then(|n| n.checked_add(copy.reply_during_work.len() + copy.decision.len()))
        .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(
        text_bound
            .checked_mul(2)
            .and_then(|bytes| bytes.checked_add(overhead.checked_mul(12)?))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut description = fill_terms(template, |part, text| {
        match part {
            "person" => text.push_text(person),
            "receive" => append_gift_lots(text, &gift.offer.offered, &gift.descriptions.offered)?,
            "give" => append_gift_lots(text, &gift.offer.requested, &gift.descriptions.requested)?,
            "terms" => append_gift_exchange(text, &gift.offer, &gift.descriptions)?,
            _ => return Err(ExecutionError::Invariant),
        }
        Ok(())
    })?;
    if accept {
        for item in described {
            if !item.description.is_empty() {
                description.push_str(" ");
                description.push_text(&item.description);
            }
        }
        description.push_str(" ");
        description.push_str(copy.reply_during_work);
        description.push_str(" ");
        description.push_str(copy.decision);
    }
    storage.resize(description.storage_bytes())?;
    Ok((description, storage))
}

/// Own the short list for this candidate only. Each reachable recipient
/// reuses the same exact carried lots, and the normal command previews each
/// offer before it can enter the model's catalogue.
pub(super) struct GiftProposals {
    recipients: Vec<ProposalRecipient>,
    lots: Vec<ProposalLot>,
    received: Option<ReceivedGifts>,
    counters: Vec<CounterOption>,
    pub(super) completed: usize,
    _storage: ByteReservation,
}

struct ProposalRecipient {
    target: usize,
    fresh_allowed: bool,
}

struct ProposalLot {
    lot: GiftLot,
    fresh_allowed: bool,
}

struct CounterOption {
    target: usize,
    terms: Arc<CounterTerms>,
    give: JsText,
    receive: JsText,
}

impl NpcCandidateCursor {
    pub(super) fn begin_gift_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        received: ReceivedGifts,
    ) -> Result<(), ExecutionError> {
        let state = &*core.state;
        let Some(policy) = state.installed.retained.social_offer_read.as_ref() else {
            return Ok(());
        };
        let actor = state
            .physical
            .entities
            .get(&self.actor)
            .ok_or(ExecutionError::MissingActor)?;
        if !state.inventory.has_children(&self.actor) {
            return Ok(());
        }
        let Some(point) = actor.world_position() else {
            return Ok(());
        };
        let mut from = point;
        from.y += crate::status::effective_body_profile(actor, &self.budget)?.interaction_height;
        let reach = state.installed.retained.item_handling_read.reach;
        let window = ProposalWindow::new(state, &self.actor, None, policy);
        let possible = |target: &Target| {
            let mut to = target.observed;
            to.y += target.interaction_height;
            (target.visible && target.alive && crate::spatial::distance(from, to) <= reach)
                .then_some(SightRay { from, to })
        };
        let capacity = self
            .targets
            .iter()
            .filter(|target| possible(target).is_some())
            .count();
        if capacity == 0 {
            return Ok(());
        }
        let storage = self.budget.reserve(
            capacity
                .checked_mul(size_of::<ProposalRecipient>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let query_storage = self.budget.reserve(
            capacity
                .checked_mul(size_of::<SightRay>())
                .and_then(|bytes| bytes.checked_add(size_of::<GeometryQueries>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut recipients = Vec::with_capacity(capacity);
        let mut rays = Vec::with_capacity(capacity);
        let mut any_open = false;
        for (index, target) in self.targets.iter().enumerate() {
            let Some(ray) = possible(target) else {
                continue;
            };
            let person = state
                .physical
                .entities
                .get(&target.id)
                .ok_or(ExecutionError::Invariant)?;
            if gift_participant(state, person)? {
                let fresh_allowed = window.recipient_problem(&target.id, policy).is_none();
                recipients.push(ProposalRecipient {
                    target: index,
                    fresh_allowed,
                });
                rays.push(ray);
                any_open |= fresh_allowed
                    || received
                        .npc_revisions(&self.actor)
                        .any(|revision| revision.counterpart == target.id);
            }
        }
        if !any_open {
            return Ok(());
        }
        let mut queries = GeometryQueries::new(self.binding(core)?);
        queries.sight = rays;
        self.gift_proposals = Some(GiftProposals {
            recipients,
            lots: Vec::new(),
            received: Some(received),
            counters: Vec::new(),
            completed: 0,
            _storage: storage,
        });
        self.waiting = Some(Waiting::GiftReach);
        self.queries = Some(queries);
        self._query_storage = Some(query_storage);
        Ok(())
    }

    pub(super) fn finish_gift_reach(
        &mut self,
        core: &CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<(), ExecutionError> {
        let queries = self.queries.take().ok_or(ExecutionError::Invariant)?;
        let _query_storage = self._query_storage.take();
        queries
            .validate_answers(&answer)
            .map_err(|_| ExecutionError::Invariant)?;
        self.waiting = None;
        let mut prepared = self
            .gift_proposals
            .take()
            .ok_or(ExecutionError::Invariant)?;
        let from = queries.sight.first().ok_or(ExecutionError::Invariant)?.from;
        // Closest eligible contacts win the shortlist. Within it, preserve
        // the original body order when offering terms to the provider.
        let mut direct = answer.sight.into_iter();
        prepared.recipients.retain(|_| direct.next() == Some(true));
        let distance = |index: usize| {
            let point = self.targets[index].observed;
            (point.x - from.x).hypot(point.z - from.z)
        };
        prepared.recipients.sort_unstable_by(|a, b| {
            distance(a.target)
                .total_cmp(&distance(b.target))
                .then_with(|| a.target.cmp(&b.target))
        });
        prepared
            .recipients
            .truncate(GIFT_COPY.nearest_proposal_recipients);
        prepared
            .recipients
            .sort_unstable_by_key(|subject| subject.target);
        let state = &*core.state;
        let policy = state
            .installed
            .retained
            .social_offer_read
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        let window = ProposalWindow::new(state, &self.actor, None, policy);
        let received = prepared.received.take().ok_or(ExecutionError::Invariant)?;
        let mut has_counter = false;
        prepared.recipients.retain(|subject| {
            let id = &self.targets[subject.target].id;
            let can_counter = received
                .npc_revisions(&self.actor)
                .any(|revision| revision.counterpart == id);
            has_counter |= can_counter;
            subject.fresh_allowed || can_counter
        });
        if !prepared.recipients.is_empty() {
            prepared.prepare_stock(state, &self.actor, &window, has_counter, &self.budget)?;
        }
        if !prepared.lots.is_empty() {
            if has_counter {
                prepared.prepare_counters(&received, &self.actor, &self.targets, &self.budget)?;
            }
            self.stage = Enumerate::GiftProposal(0, 0, 0);
            self.gift_proposals = Some(prepared);
        }
        Ok(())
    }

    pub(super) fn offer_gift(
        &mut self,
        core: &mut CoreMutation<'_>,
        target_index: usize,
        lot_index: usize,
        counter_index: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        let prepared = self
            .gift_proposals
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if target_index == prepared.recipients.len()
            || prepared.completed >= GIFT_COPY.resident_proposals
        {
            self.stage = Enumerate::Follow(0, 0);
            self.gift_proposals = None;
            return Ok(());
        }
        let recipient = &prepared.recipients[target_index];
        let target = &self.targets[recipient.target];
        let stock = &prepared.lots[lot_index];
        let lot = &stock.lot;
        let counter = prepared
            .counters
            .iter()
            .filter(|option| option.target == recipient.target)
            .nth(counter_index);
        self.stage = if counter.is_some() {
            Enumerate::GiftProposal(target_index, lot_index, counter_index + 1)
        } else if lot_index + 1 == prepared.lots.len() {
            Enumerate::GiftProposal(target_index + 1, 0, 0)
        } else {
            Enumerate::GiftProposal(target_index, lot_index + 1, 0)
        };

        let state = &*core.state;
        let policy = state
            .installed
            .retained
            .social_offer_read
            .as_ref()
            .ok_or(ExecutionError::Invariant)?;
        if let Some(counter) = counter {
            if counter
                .terms
                .offered
                .iter()
                .any(|old| old.item_id == lot.item_id)
            {
                return Ok(());
            }
        } else if !(recipient.fresh_allowed && stock.fresh_allowed) {
            return Ok(());
        }
        let definition = state
            .installed
            .retained
            .items
            .get(&lot.definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let _numbers = self.budget.reserve(64)?;
        let quantity = lot.quantity.to_string();
        let mut custody = self.budget.reserve(
            lot.heap_bytes()
                .and_then(|bytes| bytes.checked_add(target.id.len()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let (handover, id, description) = if let Some(counter) = counter {
            let source = &counter.terms.source;
            let revision = source.revision.to_string();
            (
                NpcHandover::Counter {
                    terms: Arc::clone(&counter.terms),
                    lot: lot.clone(),
                },
                self.id(&[
                    if counter.terms.offered.is_empty() {
                        "counter:"
                    } else {
                        "extend-offer:"
                    },
                    &source.id,
                    ":",
                    &revision,
                    ":",
                    &lot.item_id,
                    ":",
                    &quantity,
                ])?,
                describe_proposal(
                    &quantity,
                    &definition.named.name,
                    ProposalCopy::Counter {
                        prior: &counter.give,
                        receive: &counter.receive,
                    },
                    &self.budget,
                )?,
            )
        } else {
            let named = self
                .description_context
                .as_ref()
                .and_then(|read| read.named_body(target.body))
                .ok_or(ExecutionError::Invariant)?;
            (
                NpcHandover::Offer {
                    recipient: target.id.clone(),
                    lot: lot.clone(),
                },
                self.id(&["offer:", &lot.item_id, ":", &quantity, ":", &target.id])?,
                describe_proposal(
                    &quantity,
                    &definition.named.name,
                    ProposalCopy::Gift {
                        named,
                        minutes: policy.pending_seconds / 60.0,
                    },
                    &self.budget,
                )?,
            )
        };
        custody.merge(id.1)?;
        custody.merge(description.1)?;
        let command = NativeCommand::npc_handover(
            &self.actor,
            preparation_id.to_owned(),
            &handover,
            &self.budget,
        )?;
        let command_custody = self
            .budget
            .reserve(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.preview_offer(
            core,
            command,
            command_custody,
            PreparedNpcOffer {
                description: Some(description.0),
                id: id.0,
                meaning: NpcOfferMeaning::Handover { body: target.body },
                command: PreparedNpcInstruction::Handover(handover),
                transition: WorkTransitionMode::Continue,
                temporary: None,
                next_at: None,
                _storage: custody,
            },
        )
    }
}

impl GiftProposals {
    fn prepare_counters(
        &mut self,
        received: &ReceivedGifts,
        actor: &str,
        targets: &[Target],
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        let recipients = &self.recipients;
        let eligible = || {
            received.npc_revisions(actor).filter_map(|revision| {
                let target = recipients
                    .iter()
                    .find(|subject| targets[subject.target].id == revision.counterpart)?
                    .target;
                Some((revision, target))
            })
        };
        let count = eligible().count();
        let storage = budget.reserve(
            count
                .checked_mul(size_of::<CounterOption>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self._storage.merge(storage)?;
        self.counters = Vec::with_capacity(count);
        for (revision, target) in eligible() {
            let terms = CounterTerms::prepare(&revision, budget)?;
            let names = revision
                .offered
                .1
                .iter()
                .chain(revision.requested.1)
                .map(|description| &description.name);
            let count = revision.offered.0.len() + revision.requested.0.len();
            let mut storage = budget.reserve(
                casting::text_bound(names)?
                    .checked_add(count.checked_mul(64).ok_or(ExecutionError::Capacity)?)
                    .and_then(|bytes| bytes.checked_mul(4))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut give = JsText::default();
            let mut receive = JsText::default();
            append_gift_lots(&mut give, revision.offered.0, revision.offered.1)?;
            append_gift_lots(&mut receive, revision.requested.0, revision.requested.1)?;
            storage.resize(
                give.storage_bytes()
                    .checked_add(receive.storage_bytes())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self._storage.merge(storage)?;
            self.counters.push(CounterOption {
                target,
                terms,
                give,
                receive,
            });
        }
        Ok(())
    }

    fn prepare_stock(
        &mut self,
        state: &crate::simulation::SimulationState,
        actor: &str,
        window: &ProposalWindow<'_>,
        has_counter: bool,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        use crate::handover::GiftSelection;
        let limit = GIFT_COPY.resident_proposal_lots;
        if limit == 0 {
            return Ok(());
        }
        let _sorting = budget.reserve(
            limit
                .checked_mul(size_of::<(bool, &crate::state::Entity)>())
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut best = Vec::<(bool, &crate::state::Entity)>::with_capacity(limit);
        let items = &state.installed.retained.items;
        for entity in state
            .inventory
            .children(&state.physical.entities, actor, false)
        {
            let Some(item) = &entity.item else {
                continue;
            };
            let Some(definition) = items
                .get(&item.definition_pin.id)
                .filter(|definition| definition.portable)
            else {
                continue;
            };
            let non_food = !definition
                .nutrition
                .is_some_and(|nutrition| nutrition != 0.0);
            // Source and Rust use exact UTF-16 order for opaque lot IDs.
            let index = best.partition_point(|(other, candidate)| {
                other
                    .cmp(&non_food)
                    .then_with(|| candidate.id.encode_utf16().cmp(entity.id.encode_utf16()))
                    .is_lt()
            });
            if index < limit {
                if best.len() == limit {
                    best.pop();
                }
                best.insert(index, (non_food, entity));
            }
        }
        let count = best.len().checked_mul(2).ok_or(ExecutionError::Capacity)?;
        let allocation = count
            .checked_mul(size_of::<ProposalLot>())
            .ok_or(ExecutionError::Capacity)?;
        let mut custody = budget.reserve(allocation)?;
        let mut lots = Vec::with_capacity(count);
        for (_, entity) in best {
            let item = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let fresh_allowed = !window.item_busy(state, &entity.id);
            if !fresh_allowed && !has_counter {
                continue;
            }
            let definition = items
                .get(&item.definition_pin.id)
                .ok_or(ExecutionError::Invariant)?;
            let choices =
                if item.quantity > 1 && crate::execution::partitionable_stock(entity, definition) {
                    [Some(1), Some(item.quantity)]
                } else {
                    [Some(item.quantity), None]
                };
            // The exact trade preflight clones only these shortlisted stock
            // identities. Charge both the temporary selection and the result.
            let heap_bound = heap_sum([
                entity.id.len(),
                item.definition_pin.id.len(),
                item.definition_pin.digest.len(),
            ])
            .ok_or(ExecutionError::Capacity)?;
            let _selection = budget.reserve(entity.id.len())?;
            let mut selection = GiftSelection {
                item_id: entity.id.clone(),
                quantity: 0,
                expected_revision: None,
                placement_revision: None,
                expected_contents_revision: None,
            };
            for quantity in choices.into_iter().flatten() {
                selection.quantity = quantity;
                let mut backing = budget.reserve(heap_bound)?;
                if let Ok(lot) = crate::handover::prepare_trade_lot(state, actor, &selection) {
                    backing.resize(lot.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                    custody.merge(backing)?;
                    lots.push(ProposalLot { lot, fresh_allowed });
                }
            }
        }
        self._storage.merge(custody)?;
        self.lots = lots;
        Ok(())
    }
}

enum ProposalCopy<'a> {
    Gift {
        named: &'a crate::state::Named,
        minutes: f64,
    },
    Counter {
        prior: &'a JsText,
        receive: &'a JsText,
    },
}

fn describe_proposal(
    quantity: &str,
    item: &JsText,
    words: ProposalCopy<'_>,
    budget: &ByteBudget,
) -> Result<(JsText, ByteReservation), ExecutionError> {
    let copy = &*GIFT_COPY;
    let (template, extra, existing_give) = match words {
        ProposalCopy::Gift { named, .. } => (copy.gift_description, &named.name, None),
        ProposalCopy::Counter { prior, receive } => {
            let template = if receive.is_empty() {
                copy.counter_gift_description
            } else {
                copy.counter_description
            };
            (template, receive, Some(prior))
        }
    };
    let mut custody = budget.reserve(
        casting::text_bound([item, extra].into_iter().chain(existing_give))?
            .checked_mul(2)
            .and_then(|bytes| {
                bytes.checked_add(
                    (template.len() + copy.decision.len() + quantity.len() + 64).checked_mul(12)?,
                )
            })
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut result = fill_terms(template, |part, text| {
        match (part, &words) {
            ("person", ProposalCopy::Gift { named, .. }) => {
                text.push_text(&name_phrase(named, NameArticle::Definite, false))
            }
            ("minutes", ProposalCopy::Gift { minutes, .. }) => {
                text.push_str(ryu_js::Buffer::new().format(*minutes))
            }
            ("receive", ProposalCopy::Counter { receive, .. }) => text.push_text(receive),
            ("give", _) => {
                if let Some(prior) = existing_give.filter(|prior| !prior.is_empty()) {
                    text.push_text(prior);
                    text.push_str(", ");
                }
                text.push_str(quantity);
                text.push_str(" ");
                text.push_text(item);
            }
            _ => return Err(ExecutionError::Invariant),
        }
        Ok(())
    })?;
    if matches!(words, ProposalCopy::Counter { .. }) {
        result.push_str(" ");
        result.push_str(copy.decision);
    }
    custody.resize(result.storage_bytes())?;
    Ok((result, custody))
}

fn fill_terms(
    template: &str,
    mut append: impl FnMut(&str, &mut JsText) -> Result<(), ExecutionError>,
) -> Result<JsText, ExecutionError> {
    let mut result = JsText::default();
    let mut suffix = template;
    while let Some((literal, slot)) = suffix.split_once('{') {
        result.push_str(literal);
        let (key, rest) = slot.split_once('}').ok_or(ExecutionError::Invariant)?;
        append(key, &mut result)?;
        suffix = rest;
    }
    result.push_str(suffix);
    Ok(result)
}
