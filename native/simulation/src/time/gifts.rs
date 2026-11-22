//! The ordered clock removes one expired consent record at a time. An
//! independently acquired, unwithdrawn account is still needed per notice.
use crate::{
    events::CompletedOccurrence,
    execution::{
        CoreMutation, ExecutionError, StagedOccurrence,
        gift::{GiftMessenger, stage_gift_notice},
    },
    handover::{GiftOffer, ReceivedGifts},
    host::{ByteBudget, ByteReservation},
};

#[derive(Default)]
pub(super) struct DueGifts {
    current: Option<(GiftOffer, usize, ByteReservation)>,
    event: Option<String>,
}

impl DueGifts {
    pub(super) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CompletedOccurrence>,
        budget: &ByteBudget,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        if answer.as_ref().map(CompletedOccurrence::event_id) != self.event.take().as_deref() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        loop {
            if self.current.is_none() {
                let Some(offer) = core
                    .state
                    .physical
                    .gifts
                    .next_due(core.state.physical.header.sim_time)
                else {
                    return Ok(None);
                };
                let body = crate::encoding::json_record_len(offer)
                    .map_err(|_| ExecutionError::Invariant)?;
                let custody =
                    budget.reserve(body.checked_add(1024).ok_or(ExecutionError::Capacity)?)?;
                let offer = offer.clone();
                core.finish_gift(&offer.id)?;
                self.current = Some((offer, 0, custody));
            }
            let (offer, party, custody) = self.current.as_mut().ok_or(ExecutionError::Invariant)?;
            let receiver = match *party {
                0 => &offer.offerer_id,
                1 => &offer.recipient_id,
                2 => {
                    self.current = None;
                    continue;
                }
                _ => return Err(ExecutionError::Invariant),
            };
            *party += 1;
            // The ending occurrence may describe the already-known terms
            // after the game clock has passed the original deadline.
            let gifts = ReceivedGifts::at_time(core.state, receiver, offer.created_at, budget)?;
            let Some(known) = gifts.find(&offer.id, offer.revision) else {
                continue;
            };
            let event = stage_gift_notice(
                core,
                offer,
                &known.descriptions,
                receiver,
                "offer-expired",
                GiftMessenger::Expiry,
            )?;
            custody.resize(
                custody
                    .bytes()
                    .checked_add(event.id.len())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.event = Some(event.id.clone());
            return Ok(Some(event));
        }
    }
}
