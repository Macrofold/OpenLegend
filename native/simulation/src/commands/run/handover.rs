//! One actual consent choice. Geometry precedes inventory, and only the named
//! recipient can move the offered lot. The same operation prepares previews.
use super::*;
use crate::{
    execution::gift::{GiftMessenger, gift_narration, gift_terms, stage_gift_notice},
    handover::{GiftDescription, GiftLot, GiftOffer, GiftOperation, gift_participant, usable_lot},
    worlds::base_handover::GIFT_COPY as copy,
};

pub(super) struct GiftNotice {
    offer: GiftOffer,
    kind: &'static str,
    verb: &'static str,
    observers: Vec<String>,
    description: GiftDescription,
}

impl CommandCursor {
    fn gift_refusal(&mut self, code: &str, message: &str) -> Result<(), ExecutionError> {
        self.reserve(code.len() + message.len() * 2 + 64)?;
        self.outcome = Some(outcome(false, code, message));
        self.phase = Phase::Done;
        Ok(())
    }

    pub(super) fn start_gift(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<bool, ExecutionError> {
        let NativeCommand::Handover {
            target_id, gift, ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        if core.state.installed.retained.social_offer_read.is_none() || target_id == self.actor_id()
        {
            self.gift_refusal("not-visible", copy.choose_person)?;
            return Ok(false);
        }
        if gift.handover_operation != GiftOperation::Offer {
            let row = gift
                .offer_id
                .as_deref()
                .and_then(|id| core.state.physical.gifts.get(id));
            let Some(row) = row.filter(|offer| {
                if gift.handover_operation == GiftOperation::Withdraw {
                    offer.offerer_id == self.actor_id() && offer.recipient_id == *target_id
                } else {
                    offer.recipient_id == self.actor_id() && offer.offerer_id == *target_id
                }
            }) else {
                self.gift_refusal("no-offer", copy.unavailable)?;
                return Ok(false);
            };
            let received = crate::handover::ReceivedGifts::from_player(
                core.state,
                self.actor_id(),
                &self.budget,
            )?;
            if !received.contains_revision(&row.id, row.revision) {
                self.gift_refusal("no-offer", copy.unavailable)?;
                return Ok(false);
            }
            if gift.expected_offer_revision != Some(row.revision) {
                self.gift_refusal("stale-offer", copy.changed)?;
                return Ok(false);
            }
            if gift.handover_operation == GiftOperation::Accept
                && core.state.physical.header.sim_time >= row.expires_at
            {
                self.gift_refusal("expired", copy.expired)?;
                return Ok(false);
            }
        }
        let entities = &core.state.physical.entities;
        let owner = entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let Some(target) = entities.get(target_id) else {
            self.gift_refusal("not-visible", copy.choose_person)?;
            return Ok(false);
        };
        let ready = gift_participant(core.state, owner)?
            && gift_participant(core.state, target)?
            && (gift.handover_operation != GiftOperation::Offer
                || core
                    .state
                    .administration
                    .authorship
                    .player_account_ids
                    .contains_key(target_id));
        if !ready {
            if let GiftOperation::Withdraw | GiftOperation::Decline = gift.handover_operation {
                self.phase = Phase::GiftApply;
            } else {
                self.gift_refusal("unavailable", copy.cannot_take)?;
            }
            return Ok(false);
        }
        self.gift_sight(core, false)?;
        Ok(true)
    }

    fn gift_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        reverse: bool,
    ) -> Result<(), ExecutionError> {
        let NativeCommand::Handover { target_id, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let (observer, other) = if reverse {
            (target_id.as_str(), self.actor_id())
        } else {
            (self.actor_id(), target_id.as_str())
        };
        let mut binding = self.binding;
        binding.serial = core.journal.next_provider_serial()?;
        let sight = crate::reception::SightBatch::prepare(
            &core.state.physical,
            &core.state.installed,
            observer,
            &[other],
            binding,
            &self.budget,
        )
        .map_err(|_| ExecutionError::Invariant)?;
        self.binding = binding;
        self.sight = Some(sight);
        self.phase = if reverse {
            Phase::GiftSightBack
        } else {
            Phase::GiftSight
        };
        Ok(())
    }

    pub(super) fn accept_gift_sight(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        let NativeCommand::Handover {
            envelope,
            target_id,
            gift,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let reverse = matches!(self.phase, Phase::GiftSightBack);
        let other = if reverse {
            &envelope.actor_id
        } else {
            target_id.as_str()
        };
        let sight = self
            .sight
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        let op = gift.handover_operation;
        if sight.seen(other) != Some(true) {
            match op {
                GiftOperation::Offer => self.gift_refusal("not-visible", copy.choose_person)?,
                GiftOperation::Accept => self.gift_refusal("not-visible", copy.mutual_sight)?,
                GiftOperation::Decline | GiftOperation::Withdraw => self.phase = Phase::GiftApply,
            }
            return self.drive(core, None);
        }
        if !reverse && op != GiftOperation::Offer {
            self.gift_sight(core, true)?;
            return Ok(Progress::Geometry);
        }
        if matches!(op, GiftOperation::Decline | GiftOperation::Withdraw) {
            self.gift_hearing(core, false)?;
            return Ok(Progress::Geometry);
        }
        let entities = &core.state.physical.entities;
        let owner = entities
            .get(self.actor_id())
            .ok_or(ExecutionError::MissingActor)?;
        let target = entities
            .get(target_id)
            .ok_or(ExecutionError::MissingEntity)?;
        let reach = core.state.installed.retained.item_handling_read.reach;
        let Some(ray) = crate::geometry::interaction_reach(owner, target, reach, &self.budget)?
        else {
            return self.accept_gift_reach(core, false);
        };
        self.reserve(size_of::<crate::geometry::SightRay>())?;
        self.question(core, Phase::GiftReach)?.sight.push(ray);
        Ok(Progress::Geometry)
    }

    pub(super) fn accept_gift_reach(
        &mut self,
        core: &mut CoreMutation<'_>,
        reached: bool,
    ) -> Result<Progress, ExecutionError> {
        self.queries = None;
        let NativeCommand::Handover { gift, .. } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        if !reached {
            self.gift_refusal(
                "out-of-reach",
                if gift.handover_operation == GiftOperation::Accept {
                    copy.accept_reach
                } else {
                    copy.offer_reach
                },
            )?;
        } else if gift.handover_operation == GiftOperation::Accept && !self.options.preview {
            self.gift_hearing(core, false)?;
            return Ok(Progress::Geometry);
        } else {
            self.phase = Phase::GiftApply;
        }
        self.drive(core, None)
    }

    fn gift_hearing(
        &mut self,
        core: &mut CoreMutation<'_>,
        reverse: bool,
    ) -> Result<(), ExecutionError> {
        use crate::reception::{AcousticEmission, SoundBatch, sound_origin};
        use crate::worlds::base_observed::SpeechVolume;
        let NativeCommand::Handover {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let (speaker_id, observer) = if reverse {
            (target_id, &envelope.actor_id)
        } else {
            (&envelope.actor_id, target_id)
        };
        let state = &core.state;
        let speaker = state
            .physical
            .entities
            .get(speaker_id)
            .ok_or(ExecutionError::MissingActor)?;
        let origin = sound_origin(speaker).ok_or(ExecutionError::InvalidPosition)?;
        let _emission = self.budget.reserve(speaker_id.len())?;
        let emission = AcousticEmission {
            origin,
            emitter_id: Some(speaker_id.clone()),
            source_level_db_spl_at1m: state
                .installed
                .acoustics
                .value()
                .source_level(SpeechVolume::Normal),
        };
        self.binding.serial = core.journal.next_provider_serial()?;
        self.gift_sound = Some(
            SoundBatch::prepare(
                &state.physical,
                &state.installed,
                &emission,
                &[observer],
                self.binding,
                &self.budget,
            )
            .map_err(ExecutionError::Sensor)?,
        );
        self.phase = if reverse {
            Phase::GiftHearingBack
        } else {
            Phase::GiftHearing
        };
        Ok(())
    }

    pub(super) fn accept_gift_hearing(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: GeometryAnswers,
    ) -> Result<Progress, ExecutionError> {
        use crate::worlds::InstalledHearingDetail;
        let NativeCommand::Handover {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let reverse = matches!(self.phase, Phase::GiftHearingBack);
        let observer = if reverse {
            &envelope.actor_id
        } else {
            target_id
        };
        let result = self
            .gift_sound
            .take()
            .ok_or(ExecutionError::Invariant)?
            .finish(answer, &core.state.installed.acoustics)
            .map_err(ExecutionError::Sensor)?;
        let clear = result
            .exposure(observer)
            .is_some_and(|exposure| exposure.detail == InstalledHearingDetail::Clear);
        if clear && !reverse {
            self.gift_hearing(core, true)?;
            return Ok(Progress::Geometry);
        }
        self.gift_counterpart_notice = clear;
        self.phase = Phase::GiftApply;
        self.drive(core, None)
    }

    pub(super) fn apply_gift(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::Handover {
            envelope,
            target_id,
            gift,
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let owner = envelope.actor_id.as_str();
        let state = &core.state;
        let policy = state
            .installed
            .retained
            .social_offer_read
            .as_ref()
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let at = state.physical.header.sim_time;
        let pending = &state.physical.gifts;
        let op = gift.handover_operation;
        let preview = self.options.preview || self.preparation_mode.is_some();
        let name_input = match op {
            GiftOperation::Offer => gift
                .offered_items
                .as_ref()
                .map(|[item]| item.item_id.as_str()),
            _ => gift
                .offer_id
                .as_deref()
                .and_then(|id| pending.get(id))
                .map(|offer| offer.lot().item_id.as_str()),
        };
        let name = name_input
            .and_then(|id| state.physical.entities.get(id))
            .and_then(|item| item.item.as_ref())
            .and_then(|lot| state.installed.retained.items.get(&lot.definition_pin.id));
        let reserve = name
            .map_or(Some(0), |item| {
                item.description
                    .heap_bytes()?
                    .checked_add(item.named.name.heap_bytes()?)?
                    .checked_mul(4)
            })
            .and_then(|bytes| bytes.checked_add(1024))
            .and_then(|bytes| {
                bytes.checked_add(
                    (owner.len() + target_id.len() + gift.retained_text_bytes()).checked_mul(6)?,
                )
            })
            .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(reserve)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let offer = if op == GiftOperation::Offer {
            let [selected] = gift
                .offered_items
                .as_ref()
                .ok_or(ExecutionError::Invariant)?;
            let (entity, definition) =
                match usable_lot(state, owner, &selected.item_id, selected.quantity) {
                    Ok(value) => value,
                    Err((code, message)) => {
                        self.gift_refusal(code, message)?;
                        return Ok(None);
                    }
                };
            let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let Some(crate::state::Placement::Contained {
                revision: placement,
                ..
            }) = &entity.placement
            else {
                return Err(ExecutionError::Invariant);
            };
            let placement = *placement;
            if selected
                .expected_revision
                .is_some_and(|rev| rev != lot.revision)
                || selected
                    .placement_revision
                    .is_some_and(|rev| rev != placement)
            {
                self.gift_refusal("stale", copy.review_item)?;
                return Ok(None);
            }
            if pending.for_item(&selected.item_id).is_some() {
                self.gift_refusal("already-offered", copy.already_offered)?;
                return Ok(None);
            }
            let outgoing = pending
                .for_actor(owner)
                .filter(|o| o.offerer_id == owner && o.expires_at > at)
                .count();
            let incoming = pending
                .for_actor(target_id)
                .filter(|o| o.recipient_id == *target_id && o.expires_at > at)
                .count();
            let conflict = if outgoing as u64 >= policy.outgoing {
                Some(("too-many-outgoing", &policy.messages.outgoing))
            } else if incoming as u64 >= policy.incoming {
                Some(("too-many-incoming", &policy.messages.incoming))
            } else if policy.one_pending_per_pair
                && pending
                    .for_actor(owner)
                    .any(|offer| offer.party(target_id) && offer.expires_at > at)
            {
                Some(("offer-pending", &policy.messages.pair))
            } else {
                None
            };
            if let Some((code, message)) = conflict {
                let mut refusal = outcome(false, code, "");
                refusal.message = message.clone();
                self.outcome = Some(refusal);
                self.phase = Phase::Done;
                return Ok(None);
            }
            let lot = GiftLot {
                item_id: selected.item_id.clone(),
                definition_pin: lot.definition_pin.clone(),
                quantity: selected.quantity,
                whole: !crate::execution::partitionable_stock(entity, definition),
                revision: lot.revision,
                placement_revision: placement,
            };
            let expires_at = at + policy.pending_seconds;
            if !expires_at.is_finite() {
                return Err(ExecutionError::Invariant);
            }
            GiftOffer {
                id: String::new(),
                revision: 1,
                offerer_id: owner.into(),
                recipient_id: target_id.clone(),
                offered: [lot],
                requested: [],
                created_at: at,
                expires_at,
            }
        } else {
            let row = pending
                .get(gift.offer_id.as_deref().ok_or(ExecutionError::Invariant)?)
                .ok_or(ExecutionError::Invariant)?;
            if op == GiftOperation::Accept
                && usable_lot(
                    state,
                    &row.offerer_id,
                    &row.lot().item_id,
                    row.lot().quantity,
                )
                .ok()
                .is_none_or(|(_, installed)| installed.pin != row.lot().definition_pin)
            {
                self.gift_refusal("offer-lapsed", copy.gift_unavailable)?;
                return Ok(None);
            }
            row.clone()
        };
        if preview {
            self.outcome = Some(outcome(true, "available", copy.no_transfer));
            self.phase = Phase::Done;
            return Ok(None);
        }
        let item_def = state
            .installed
            .retained
            .items
            .get(&offer.lot().definition_pin.id)
            .ok_or(ExecutionError::Invariant)?;
        let description = GiftDescription {
            name: item_def.named.name.clone(),
            description: item_def.description.clone().unwrap_or_default(),
        };
        let mut offer = offer;
        let (kind, verb, code, message) = match op {
            GiftOperation::Offer => ("item-offered", "offered", "offered", copy.proposed),
            GiftOperation::Accept => (
                "offer-accepted",
                "accepted",
                "accepted-offer",
                copy.accepted,
            ),
            GiftOperation::Decline => ("offer-declined", "declined", "declined", copy.declined),
            GiftOperation::Withdraw => ("offer-withdrawn", "withdrew", "withdrawn", copy.withdrawn),
        };
        let mut accepted = outcome(true, code, message);
        if matches!(op, GiftOperation::Offer | GiftOperation::Accept) {
            let template = message.replace(
                "{minutes}",
                &ryu_js::Buffer::new().format(policy.pending_seconds / 60.0),
            );
            accepted.message = gift_terms(&template, &offer, &description)?;
        }

        let target = target_id.clone();
        let owner = owner.to_owned();
        if op == GiftOperation::Offer {
            offer.id = core.physical().allocate("offer")?.id;
            core.add_gift(offer.clone())?;
        } else {
            if op == GiftOperation::Accept {
                let Some(item) = core.transfer_direct_loose_lot(
                    &offer.offerer_id,
                    &offer.recipient_id,
                    &offer.lot().item_id,
                    offer.lot().quantity,
                    "handover",
                )?
                else {
                    self.gift_refusal("offer-lapsed", copy.gift_unavailable)?;
                    return Ok(None);
                };
                accepted.item_id = Some(item);
            }
            core.finish_gift(&offer.id)?;
        }
        let counterpart_holds = self.gift_counterpart_notice
            && crate::handover::ReceivedGifts::from_player(core.state, &target, &self.budget)?
                .contains_revision(&offer.id, offer.revision);
        let observers = if op == GiftOperation::Offer || counterpart_holds {
            vec![target.clone(), owner.clone()]
        } else {
            vec![owner.clone()]
        };
        self.gift_notice = Some(GiftNotice {
            offer,
            kind,
            verb,
            observers,
            description,
        });
        self.outcome = Some(accepted);
        let event = core.stage_event(EventEmissionIntent {
            event_type: kind.into(),
            text: EmissionText::Narration(gift_narration(
                &owner,
                copy.witness_exchange.replace("{verb}", verb).into(),
            )),
            audience: AudienceSelection::Physical,
            source_id: Some(owner),
            target_id: Some(target),
            data: None,
            scope: EventScope::External,
            origin: None,
            exposure: None,
        })?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::GiftPrivate;
        Ok(Some(event))
    }

    pub(super) fn gift_private_event(
        &mut self,
        core: &mut CoreMutation<'_>,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        let NativeCommand::Handover {
            envelope,
            target_id,
            ..
        } = &self.command
        else {
            return Err(ExecutionError::Invariant);
        };
        let notice = self.gift_notice.as_mut().ok_or(ExecutionError::Invariant)?;
        let Some(observer) = notice.observers.pop() else {
            self.gift_notice = None;
            self.phase = Phase::Tail;
            return Ok(None);
        };
        let event = stage_gift_notice(
            core,
            &notice.offer,
            &notice.description,
            &observer,
            notice.kind,
            GiftMessenger::Person {
                source: &envelope.actor_id,
                target: target_id,
                verb: notice.verb,
            },
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::GiftPrivate;
        Ok(Some(event))
    }
}
