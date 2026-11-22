use super::*;
use crate::{
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    handover::{GiftDescription, GiftDescriptions, GiftLot, GiftOffer},
    narration::{Narration, NarrationPart, PersonRole},
    reception::EventScalar,
    text::JsText,
    worlds::base_handover::GIFT_COPY,
};

impl CoreMutation<'_> {
    /// Joined consent mutations use the same inverse as custody and events.
    pub(crate) fn add_gift(&mut self, offer: GiftOffer) -> Result<(), ExecutionError> {
        self.journal
            .physical
            .reserve(offer.id.len() + size_of::<Undo>())?;
        let inverse = self.state.physical.gifts.add(offer, &self.journal.budget)?;
        self.journal.physical.undo.push(Undo::Gift(inverse));
        Ok(())
    }

    pub(crate) fn replace_gift(&mut self, offer: GiftOffer) -> Result<(), ExecutionError> {
        self.journal
            .physical
            .reserve(offer.id.len() + size_of::<Undo>())?;
        let inverse = self
            .state
            .physical
            .gifts
            .replace(offer, &self.journal.budget)?;
        self.journal.physical.undo.push(Undo::Gift(inverse));
        Ok(())
    }

    /// Both sets of already validated directly held lots move in one undo
    /// checkpoint. A reciprocal exchange cannot merge away a promised lot
    /// before the other side has moved it.
    pub(crate) fn transfer_handover_lots(
        &mut self,
        offer: &GiftOffer,
    ) -> Result<Option<String>, ExecutionError> {
        let scope = self.journal.checkpoint(self.state)?;
        let result = (|| {
            let merge = offer.offered.len() == 1 && offer.requested.is_empty();
            let mut received = None;
            for (giver, receiver, lots) in [
                (&offer.offerer_id, &offer.recipient_id, &offer.offered),
                (&offer.recipient_id, &offer.offerer_id, &offer.requested),
            ] {
                for lot in lots {
                    let Some(moved) = self.transfer_direct_loose_lot(
                        giver,
                        receiver,
                        &lot.item_id,
                        lot.quantity,
                        "handover",
                        merge,
                    )?
                    else {
                        return Ok(None);
                    };
                    if received.is_none() {
                        received = Some(moved);
                    }
                }
            }
            Ok(received)
        })();
        if matches!(&result, Ok(Some(_))) {
            self.journal.keep(self.state, scope)?;
        } else {
            self.journal.rollback_to(self.state, scope)?;
        }
        result
    }

    pub(crate) fn finish_gift(&mut self, id: &str) -> Result<(), ExecutionError> {
        self.journal
            .physical
            .reserve(id.len() + size_of::<Undo>())?;
        let inverse = self.state.physical.gifts.finish(id)?;
        self.journal.physical.undo.push(Undo::Gift(inverse));
        Ok(())
    }
}

pub(crate) fn gift_terms(
    template: &str,
    offer: &GiftOffer,
    descriptions: &GiftDescriptions,
) -> Result<JsText, ExecutionError> {
    let (before, after) = template
        .split_once("{terms}")
        .ok_or(ExecutionError::Invariant)?;
    let mut text = JsText::from(before);
    append_terms(&mut text, &offer.offered, &descriptions.offered)?;
    if !offer.requested.is_empty() {
        text.push_str(GIFT_COPY.reciprocal_separator);
        append_terms(&mut text, &offer.requested, &descriptions.requested)?;
    }
    text.push_str(after);
    Ok(text)
}

fn append_terms(
    text: &mut JsText,
    lots: &[GiftLot],
    descriptions: &[GiftDescription],
) -> Result<(), ExecutionError> {
    if lots.len() != descriptions.len() {
        return Err(ExecutionError::Invariant);
    }
    for (index, (lot, description)) in lots.iter().zip(descriptions).enumerate() {
        if index != 0 {
            text.push_str(", ");
        }
        text.push_str(&lot.quantity.to_string());
        text.push_str(" ");
        text.push_text(&description.name);
    }
    Ok(())
}

pub(crate) fn gift_narration(actor: &str, suffix: JsText) -> Narration {
    Narration {
        parts: vec![
            NarrationPart::Participant {
                entity_id: actor.into(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(" ".into()),
            NarrationPart::Literal(suffix),
        ],
    }
}

pub(crate) enum GiftMessenger<'a> {
    Person {
        source: &'a str,
        target: &'a str,
        verb: &'static str,
    },
    Expiry,
    OwnEnding { target: &'a str },
}

pub(crate) fn stage_gift_notice(
    core: &mut CoreMutation<'_>,
    offer: &GiftOffer,
    descriptions: &GiftDescriptions,
    receiver: &str,
    kind: &'static str,
    messenger: GiftMessenger<'_>,
) -> Result<StagedOccurrence, ExecutionError> {
    let pending = kind == "item-offered";
    #[derive(serde::Serialize)]
    struct Notice<'a> {
        family: &'static str,
        #[serde(flatten)]
        offer: &'a GiftOffer,
        descriptions: &'a GiftDescriptions,
        status: &'static str,
        #[serde(skip_serializing_if = "Option::is_none")]
        cause: Option<&'a str>,
    }
    let body = Notice {
        family: "item-offer",
        offer,
        descriptions,
        status: if pending { "pending" } else { "ended" },
        cause: (!pending).then_some(if matches!(&messenger, GiftMessenger::OwnEnding { .. }) {
            "own-ending"
        } else {
            kind
        }),
    };
    let bytes = crate::encoding::json_record_len(&body).map_err(|_| ExecutionError::Invariant)?;
    let _storage = core.journal.budget.reserve(
        bytes
            .checked_mul(3)
            .and_then(|size| size.checked_add(1536))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let serialized = crate::encoding::json_record(&body).map_err(|_| ExecutionError::Invariant)?;
    let mut data = IndexMap::new();
    data.insert("offerId".into(), EventScalar::Text(offer.id.clone().into()));
    data.insert(
        "offerRevision".into(),
        EventScalar::Number(offer.revision as f64),
    );
    data.insert("personalAgreement".into(), EventScalar::Boolean(true));
    data.insert(
        "importance".into(),
        EventScalar::Number(
            core.state
                .installed
                .experience_settings
                .protected_importance,
        ),
    );
    data.insert("agreement".into(), EventScalar::Text(serialized.into()));
    let trigger = pending && receiver == offer.recipient_id;
    data.insert("semanticTrigger".into(), EventScalar::Boolean(trigger));
    data.insert(
        "urgency".into(),
        EventScalar::Number(if trigger { 4.0 } else { 0.0 }),
    );
    let (text, source_id, target_id) = match messenger {
        GiftMessenger::Person {
            source,
            target,
            verb,
        } => {
            let template = GIFT_COPY.participant_exchange.replace("{verb}", verb);
            let text = gift_terms(&template, offer, descriptions)?;
            (gift_narration(source, text), source, Some(target.into()))
        }
        GiftMessenger::OwnEnding { target } => (
            Narration { parts: vec![NarrationPart::Literal(GIFT_COPY.own_ending.into())] },
            receiver,
            Some(target.into()),
        ),
        GiftMessenger::Expiry => {
            let template = format!("{} {{terms}}", GIFT_COPY.deadline);
            (
                Narration {
                    parts: vec![NarrationPart::Literal(gift_terms(
                        &template,
                        offer,
                        descriptions,
                    )?)],
                },
                receiver,
                None,
            )
        }
    };
    core.stage_event(EventEmissionIntent {
        event_type: kind.into(),
        text: EmissionText::Narration(text),
        audience: AudienceSelection::Explicit(vec![receiver.into()]),
        source_id: Some(source_id.into()),
        target_id,
        data: Some(data),
        scope: EventScope::Private,
        origin: None,
        exposure: None,
    })
}
