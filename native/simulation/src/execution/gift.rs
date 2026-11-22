use super::*;
use crate::{
    events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
    handover::{GiftDescription, GiftDescriptions, GiftDisclosure, GiftOffer},
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
    description: &GiftDescription,
) -> Result<JsText, ExecutionError> {
    let (before, after) = template
        .split_once("{terms}")
        .ok_or(ExecutionError::Invariant)?;
    let mut text = JsText::from(before);
    text.push_str(&offer.lot().quantity.to_string());
    text.push_str(" ");
    text.push_text(&description.name);
    text.push_str(after);
    Ok(text)
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
}

pub(crate) fn stage_gift_notice(
    core: &mut CoreMutation<'_>,
    offer: &GiftOffer,
    description: &GiftDescription,
    receiver: &str,
    kind: &'static str,
    messenger: GiftMessenger<'_>,
) -> Result<StagedOccurrence, ExecutionError> {
    let pending = kind == "item-offered";
    let body = GiftDisclosure {
        family: "item-offer".into(),
        offer: offer.clone(),
        descriptions: GiftDescriptions {
            offered: [description.clone()],
            requested: [],
        },
        status: if pending { "pending" } else { "ended" }.into(),
        cause: (!pending).then(|| kind.into()),
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
            let text = gift_terms(&template, offer, description)?;
            (gift_narration(source, text), source, Some(target.into()))
        }
        GiftMessenger::Expiry => {
            let template = format!("{} {{terms}}", GIFT_COPY.deadline);
            (
                Narration {
                    parts: vec![NarrationPart::Literal(gift_terms(
                        &template,
                        offer,
                        description,
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
