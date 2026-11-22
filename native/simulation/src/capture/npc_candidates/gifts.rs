//! The recipient may answer an actual received loose gift without stopping
//! current work. Preparing a reply never probes objective stock or ending state.
use super::*;
use crate::{
    handover::{GiftDisclosure, GiftReply, ReceivedGifts, gift_participant},
    narration::{NameArticle, name_phrase},
    text::JsText,
    worlds::base_handover::GIFT_COPY,
};

impl NpcCandidateCursor {
    pub(super) fn offer_gift_replies(
        &mut self,
        core: &CoreMutation<'_>,
        actor: &crate::state::Entity,
    ) -> Result<(), ExecutionError> {
        if core.state.installed.retained.social_offer_read.is_none()
            || !gift_participant(core.state, actor)?
        {
            return Ok(());
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
                let (reply, mut custody) =
                    GiftReply::prepare(gift, reference, accept, &self.budget)?;
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
                    meaning: NpcOfferMeaning::GiftReply { body },
                    command: PreparedNpcInstruction::GiftReply(reply),
                    transition: WorkTransitionMode::Continue,
                    temporary: None,
                    next_at: None,
                    _storage: custody,
                })?;
            }
        }
        Ok(())
    }
}

fn describe_gift(
    gift: &GiftDisclosure,
    person: &JsText,
    accept: bool,
    budget: &ByteBudget,
) -> Result<(JsText, ByteReservation), ExecutionError> {
    let copy = &*GIFT_COPY;
    let template = if accept {
        copy.reply_accept_gift
    } else {
        copy.reply_decline_gift
    };
    let (prefix, terms) = template
        .split_once("{person}")
        .ok_or(ExecutionError::Invariant)?;
    let text_bound = casting::text_bound(
        std::iter::once(person).chain(
            gift.descriptions
                .offered
                .iter()
                .flat_map(|item| [&item.name, &item.description]),
        ),
    )?;
    let overhead = gift
        .offer
        .offered
        .len()
        .checked_mul(32)
        .and_then(|n| n.checked_add(template.len()))
        .and_then(|n| n.checked_add(copy.reply_during_work.len() + copy.decision.len()))
        .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(
        text_bound
            .checked_add(overhead.checked_mul(12).ok_or(ExecutionError::Capacity)?)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let mut description = JsText::from(prefix);
    description.push_text(person);
    description.push_text(&crate::execution::gift::gift_terms(
        terms,
        &gift.offer,
        &gift.descriptions,
    )?);
    if accept {
        for item in &gift.descriptions.offered {
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
