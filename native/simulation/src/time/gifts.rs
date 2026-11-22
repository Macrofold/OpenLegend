//! Pending consent ends in the ordinary clock phase. Expiry and stock review
//! share settlement and original received terms. Only a qualifying lapse can
//! require current mutual reception.

use crate::{
    events::CompletedOccurrence,
    execution::{
        CoreMutation, ExecutionError, StagedOccurrence,
        gift::{GiftMessenger, stage_gift_notice},
    },
    geometry::{GeometryAnswers, GeometryBinding, GeometryQueries},
    handover::{GiftOffer, ReceivedGifts, RetainedGift, trade_offer_still_held},
    host::{ByteBudget, ByteReservation},
};

use std::sync::Arc;

mod reception;
use reception::{MutualReception, ReceptionStep};

pub(super) enum GiftAnswer {
    Occurrence(CompletedOccurrence),
    Geometry(GeometryAnswers),
}

pub(super) enum GiftStep {
    Occurrence(StagedOccurrence),
    Geometry,
    Complete,
}

#[derive(Clone, Copy)]
enum Ending {
    Expiry,
    Lapse,
}

struct EndingGift {
    retained: Arc<RetainedGift>,
    ending: Ending,
    party: usize,
    heard: Option<bool>,
}

#[derive(Default)]
pub(super) struct DueGifts {
    current: Option<EndingGift>,
    review: Option<(std::vec::IntoIter<(usize, String)>, ByteReservation)>,
    reception: Option<MutualReception>,
    event: Option<(String, ByteReservation)>,
}

impl DueGifts {
    pub(super) fn geometry(&self) -> Option<&GeometryQueries> {
        self.reception.as_ref().map(MutualReception::queries)
    }

    fn next(&mut self, core: &mut CoreMutation<'_>) -> Result<Option<EndingGift>, ExecutionError> {
        loop {
            let gifts = &core.state.physical.gifts;
            let at = core.state.physical.header.sim_time;
            let (retained, ending) = if let Some(offer) = gifts.next_due(at) {
                (Arc::clone(offer), Ending::Expiry)
            } else {
                let Some((review, _)) = &mut self.review else {
                    return Ok(None);
                };
                let Some((_, id)) = review.next() else {
                    return Ok(None);
                };
                if !core.take_gift_review(&id)? {
                    continue;
                }
                let state = &core.state;
                let retained = state
                    .physical
                    .gifts
                    .retained(&id)
                    .ok_or(ExecutionError::Invariant)?;
                if trade_offer_still_held(state, &retained.offer) {
                    continue;
                }
                (Arc::clone(retained), Ending::Lapse)
            };
            core.finish_gift(&retained.offer.id)?;
            return Ok(Some(EndingGift {
                retained,
                ending,
                party: 0,
                heard: None,
            }));
        }
    }

    fn prepare_review(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), ExecutionError> {
        if self.review.is_some() || core.state.physical.gifts.is_empty() {
            return Ok(());
        }
        core.queue_gift_reviews()?;
        let gifts = &core.state.physical.gifts;
        if gifts.review_ids().next().is_none() {
            return Ok(());
        }
        let (count, bytes) = gifts
            .review_ids()
            .try_fold((0usize, 0usize), |(count, bytes), (_, id)| {
                Some((
                    count.checked_add(1)?,
                    bytes
                        .checked_add(id.len())?
                        .checked_add(std::mem::size_of::<(usize, String)>())?,
                ))
            })
            .ok_or(ExecutionError::Capacity)?;
        let custody = budget.reserve(bytes)?;
        let mut ordered = Vec::with_capacity(count);
        ordered.extend(gifts.review_ids().map(|(index, id)| (index, id.to_owned())));
        ordered.sort_unstable_by_key(|(index, _)| *index);
        self.review = Some((ordered.into_iter(), custody));
        Ok(())
    }

    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<GiftAnswer>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<GiftStep, ExecutionError> {
        self.prepare_review(core, budget)?;
        match answer {
            Some(GiftAnswer::Occurrence(answer))
                if self
                    .event
                    .as_ref()
                    .is_some_and(|(id, _)| id == answer.event_id()) =>
            {
                self.event = None;
            }
            None if self.event.is_none() && self.reception.is_none() => (),
            Some(GiftAnswer::Geometry(answer)) => {
                let reception = self
                    .reception
                    .take()
                    .ok_or(ExecutionError::UnfinishedOccurrence)?;
                let current = self.current.as_mut().ok_or(ExecutionError::Invariant)?;
                match reception.finish(core, answer, &current.retained.offer)? {
                    ReceptionStep::Prepare(phase) => {
                        self.reception = MutualReception::prepare(
                            core,
                            &current.retained.offer,
                            binding,
                            phase,
                            budget,
                        )?;
                        if self.reception.is_some() {
                            return Ok(GiftStep::Geometry);
                        }
                        current.heard = Some(false);
                    }
                    ReceptionStep::Complete(permitted) => current.heard = Some(permitted),
                }
            }
            _ => return Err(ExecutionError::UnfinishedOccurrence),
        }
        loop {
            if self.current.is_none() {
                self.current = self.next(core)?;
            }
            let Some(current) = self.current.as_mut() else {
                return Ok(GiftStep::Complete);
            };
            let offer = &current.retained.offer;
            let receiver = match current.party {
                0 => &offer.offerer_id,
                1 => &offer.recipient_id,
                2 => {
                    self.current = None;
                    continue;
                }
                _ => return Err(ExecutionError::Invariant),
            };
            if core
                .state
                .physical
                .entities
                .get(receiver)
                .and_then(|entity| entity.actor.as_ref())
                .is_none()
            {
                current.party += 1;
                continue;
            }
            // As at expiry, settle only what the actor originally acquired.
            let received = ReceivedGifts::at_time(core.state, receiver, offer.created_at, budget)?;
            let Some(known) = received.find(&offer.id, offer.revision) else {
                current.party += 1;
                continue;
            };
            let (kind, messenger) = match current.ending {
                Ending::Expiry => ("offer-expired", GiftMessenger::Expiry),
                Ending::Lapse => {
                    if receiver != &offer.offerer_id
                        && core
                            .state
                            .physical
                            .entities
                            .get(&offer.offerer_id)
                            .is_some()
                    {
                        if current.heard.is_none() {
                            self.reception = MutualReception::prepare(
                                core,
                                offer,
                                binding,
                                reception::Phase::SightFromSender,
                                budget,
                            )?;
                            if self.reception.is_some() {
                                return Ok(GiftStep::Geometry);
                            }
                            current.heard = Some(false);
                        }
                        if current.heard != Some(true) {
                            current.party += 1;
                            continue;
                        }
                    }
                    ("offer-lapsed", GiftMessenger::Lapse)
                }
            };
            current.party += 1;
            let event =
                stage_gift_notice(core, offer, &known.descriptions, receiver, kind, messenger)?;
            let custody = budget.reserve(event.id.len())?;
            self.event = Some((event.id.clone(), custody));
            return Ok(GiftStep::Occurrence(event));
        }
    }
}
