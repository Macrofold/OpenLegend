//! One actual consent choice. Geometry precedes inventory, and only the named
//! recipient can move the offered lot. The same operation prepares previews.
use super::*;
use crate::{
    execution::gift::{GiftMessenger, gift_narration, gift_terms, stage_gift_notice},
    handover::{
        GiftDescription, GiftDescriptions, GiftLot, GiftOffer, GiftOperation, ProposalWindow,
        gift_participant, prepare_trade_lot, trade_lot_current, trade_offer_current,
        trade_offer_receivable,
    },
    worlds::base_handover::GIFT_COPY as copy,
};

impl NativeCommand {
    /// Prepare an exact immediate Handover from a held NPC choice. The
    /// resulting command still goes through the ordinary consent writer.
    pub(crate) fn npc_handover(
        actor: &str,
        id: String,
        choice: &crate::handover::NpcHandover,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        use crate::handover::NpcHandover;
        let target = choice.target();
        let prior_bytes = match choice {
            NpcHandover::Counter { terms, .. } => terms
                .offered
                .iter()
                .chain(&terms.requested)
                .try_fold(terms.source.id.len(), |bytes, lot| {
                    bytes.checked_add(
                        size_of::<crate::handover::GiftSelection>() + lot.item_id.len(),
                    )
                })
                .ok_or(ExecutionError::Capacity)?,
            NpcHandover::Exchange { evidence, .. } => evidence
                .only_lot()
                .ok_or(ExecutionError::Invariant)?
                .item_id
                .len(),
            _ => 0,
        };
        let _scratch = budget.reserve(
            [
                id.len(),
                actor.len(),
                target.len(),
                choice.heap_bytes().ok_or(ExecutionError::Capacity)?,
                prior_bytes,
            ]
            .into_iter()
            .try_fold(1024usize, |n, len| n.checked_add(len.checked_mul(12)?))
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let gift = match choice {
            NpcHandover::Reply { source, accept } => crate::handover::GiftIntent {
                handover_operation: if *accept {
                    GiftOperation::Accept
                } else {
                    GiftOperation::Decline
                },
                offered_items: None,
                requested_items: None,
                offer_id: Some(source.id.clone()),
                expected_offer_revision: Some(source.revision),
            },
            NpcHandover::Offer { lot, .. } => crate::handover::GiftIntent {
                handover_operation: GiftOperation::Offer,
                offered_items: Some(vec![lot.selection()]),
                requested_items: Some(Vec::new()),
                offer_id: None,
                expected_offer_revision: None,
            },
            NpcHandover::Exchange { evidence, lot } => crate::handover::GiftIntent {
                handover_operation: GiftOperation::Offer,
                offered_items: Some(vec![lot.selection()]),
                requested_items: Some(vec![
                    evidence.only_lot().ok_or(ExecutionError::Invariant)?.selection(),
                ]),
                offer_id: None,
                expected_offer_revision: None,
            },
            NpcHandover::Counter { terms, lot } => {
                let mut offered = Vec::with_capacity(terms.offered.len() + 1);
                offered.extend(terms.offered.iter().cloned());
                offered.push(lot.selection());
                crate::handover::GiftIntent {
                    handover_operation: GiftOperation::Counter,
                    offered_items: Some(offered),
                    requested_items: Some(terms.requested.clone()),
                    offer_id: Some(terms.source.id.clone()),
                    expected_offer_revision: Some(terms.source.revision),
                }
            }
        };
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Input<'a> {
            id: &'a str,
            actor_id: &'a str,
            #[serde(rename = "type")]
            kind: &'static str,
            target_id: &'a str,
            #[serde(flatten)]
            gift: &'a crate::handover::GiftIntent,
        }
        let encoding = CommandEncoding::from_ordered(
            &Input {
                id: &id,
                actor_id: actor,
                kind: "handover",
                target_id: target,
                gift: &gift,
            },
            if gift.handover_operation == GiftOperation::Counter {
                9
            } else {
                7
            },
        )
        .map_err(|_| ExecutionError::Invariant)?;
        Ok(Self::Handover {
            envelope: CommandHeaders {
                id,
                actor_id: actor.to_owned(),
                cooperation: None,
                combat_help_id: None,
                human_initiated: None,
                purpose: None,
                chosen_purpose: None,
            }.envelope(encoding),
            target_id: target.to_owned(),
            gift,
        })
    }
}

pub(super) struct GiftNotice {
    offer: GiftOffer,
    kind: &'static str,
    verb: &'static str,
    observers: Vec<String>,
    descriptions: GiftDescriptions,
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
            if row.is_none()
                && matches!(gift.handover_operation, GiftOperation::Decline | GiftOperation::Withdraw)
            {
                self.phase = Phase::GiftApply;
                return Ok(false);
            }
            let Some(row) = row.filter(|offer| {
                if gift.handover_operation == GiftOperation::Counter {
                    offer.party(self.actor_id()) && offer.party(target_id)
                } else if gift.handover_operation == GiftOperation::Withdraw {
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
            if matches!(
                gift.handover_operation,
                GiftOperation::Accept | GiftOperation::Counter
            ) && core.state.physical.header.sim_time >= row.expires_at
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
        let ready = gift_participant(core.state, owner)? && gift_participant(core.state, target)?;
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
                GiftOperation::Offer | GiftOperation::Counter => {
                    self.gift_refusal("not-visible", copy.choose_person)?
                }
                GiftOperation::Accept => self.gift_refusal("not-visible", copy.mutual_sight)?,
                GiftOperation::Decline | GiftOperation::Withdraw => self.phase = Phase::GiftApply,
            }
            return self.drive(core, None);
        }
        if !reverse && !op.proposes() {
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
        self.selected_sound = Some(
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
            .selected_sound
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
        let prior = gift.offer_id.as_deref().and_then(|id| pending.get(id));
        if prior.is_none() && matches!(op, GiftOperation::Decline | GiftOperation::Withdraw) {
            return self.end_received_gift(core, preview);
        }
        let _selection = self.budget.reserve(
            gift.retained_text_bytes()
                .checked_mul(6)
                .and_then(|bytes| bytes.checked_add(4096))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let offer = if op.proposes() {
            let offered = gift
                .offered_items
                .as_deref()
                .ok_or(ExecutionError::Invariant)?;
            let requested = gift
                .requested_items
                .as_deref()
                .ok_or(ExecutionError::Invariant)?;
            let window = ProposalWindow::new(state, owner, prior, policy);
            let mut own = Vec::with_capacity(offered.len());
            for selected in offered {
                let lot = match prepare_trade_lot(state, owner, selected) {
                    Ok(lot) => lot,
                    Err((code, message)) => {
                        self.gift_refusal(code, message)?;
                        return Ok(None);
                    }
                };
                if window.item_busy(state, &selected.item_id) {
                    self.gift_refusal("already-offered", copy.already_offered)?;
                    return Ok(None);
                }
                own.push(lot);
            }
            let mut wanted = Vec::with_capacity(requested.len());
            let proof = self
                .options
                .trade_evidence
                .as_ref()
                .filter(|proof| proof.current(state, owner, target_id));
            let previous = prior.map(|offer| {
                if offer.offerer_id == *target_id {
                    &offer.offered
                } else {
                    &offer.requested
                }
            });
            for selected in requested {
                let disclosed = proof
                    .and_then(|read| read.lot(&selected.item_id))
                    .or_else(|| {
                        previous.and_then(|lots| {
                            lots.iter().find(|lot| lot.item_id == selected.item_id)
                        })
                    });
                let Some(disclosed) = disclosed.filter(|lot| {
                    selected.quantity <= lot.quantity
                        && (!lot.whole || selected.quantity == lot.quantity)
                        && selected
                            .expected_revision
                            .is_none_or(|value| value == lot.revision)
                        && selected
                            .placement_revision
                            .is_none_or(|value| value == lot.placement_revision)
                        && selected
                            .expected_contents_revision
                            .is_none_or(|value| Some(value) == lot.contents_revision)
                }) else {
                    self.gift_refusal("offer-lapsed", copy.reciprocal_unavailable)?;
                    return Ok(None);
                };
                let mut next = disclosed.clone();
                next.quantity = selected.quantity;
                if !trade_lot_current(state, target_id, &next, true)
                    || window.item_busy(state, &next.item_id)
                {
                    self.gift_refusal("offer-lapsed", copy.reciprocal_unavailable)?;
                    return Ok(None);
                }
                wanted.push(next);
            }
            let lots = own.iter().chain(&wanted);
            let entities = &state.physical.entities;
            for (position, lot) in lots.clone().enumerate() {
                let twice = lots
                    .clone()
                    .take(position)
                    .any(|other| other.item_id == lot.item_id);
                let mut parent = entities
                    .get(&lot.item_id)
                    .and_then(crate::install::inventory_parent);
                let mut overlaps = false;
                while let Some(id) = parent {
                    if lots.clone().any(|other| other.item_id == id) {
                        overlaps = true;
                        break;
                    }
                    parent = entities.get(id).and_then(crate::install::inventory_parent);
                }
                if twice || overlaps {
                    self.gift_refusal("duplicate-item", copy.duplicate_item)?;
                    return Ok(None);
                }
            }
            if let Some((code, message)) = window.recipient_problem(target_id, policy) {
                let mut refusal = outcome(false, code, "");
                refusal.message = message.clone();
                self.outcome = Some(refusal);
                self.phase = Phase::Done;
                return Ok(None);
            }
            let expires_at = at + policy.pending_seconds;
            if !expires_at.is_finite() {
                return Err(ExecutionError::Invariant);
            }
            let revision = prior
                .map_or(Some(1), |old| old.revision.checked_add(1))
                .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
                .ok_or(ExecutionError::Identity)?;
            GiftOffer {
                id: prior.map_or_else(String::new, |old| old.id.clone()),
                revision,
                offerer_id: owner.into(),
                recipient_id: target_id.clone(),
                offered: own,
                requested: wanted,
                created_at: at,
                expires_at,
            }
        } else {
            let row = prior.ok_or(ExecutionError::Invariant)?;
            let exact = !row.requested.is_empty();
            if op == GiftOperation::Accept
                && !(trade_offer_current(state, row) && trade_offer_receivable(state, row))
            {
                self.gift_refusal(
                    "offer-lapsed",
                    if exact {
                        copy.reciprocal_unavailable
                    } else {
                        copy.gift_unavailable
                    },
                )?;
                return Ok(None);
            }
            row.clone()
        };
        if preview {
            self.outcome = Some(outcome(true, "available", copy.no_transfer));
            self.phase = Phase::Done;
            return Ok(None);
        }
        let description_bound = offer
            .lots()
            .try_fold(0usize, |bytes, lot| {
                let definition = state.installed.retained.items.get(&lot.definition_pin.id)?;
                bytes
                    .checked_add(lot.item_id.capacity())?
                    .checked_add(lot.definition_pin.id.capacity())?
                    .checked_add(lot.definition_pin.digest.capacity())?
                    .checked_add(definition.named.name.heap_bytes()?.checked_mul(4)?)?
                    .checked_add(definition.description.heap_bytes()?.checked_mul(4)?)?
                    .checked_add(384)
            })
            .ok_or(ExecutionError::Capacity)?;
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(description_bound)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let describe = |lots: &[GiftLot]| -> Result<Vec<GiftDescription>, ExecutionError> {
            lots.iter()
                .map(|lot| {
                    let item = state
                        .installed
                        .retained
                        .items
                        .get(&lot.definition_pin.id)
                        .filter(|item| item.pin == lot.definition_pin)
                        .ok_or(ExecutionError::Invariant)?;
                    Ok(GiftDescription {
                        name: item.named.name.clone(),
                        description: item.description.clone().unwrap_or_default(),
                    })
                })
                .collect()
        };
        let descriptions = GiftDescriptions {
            offered: describe(&offer.offered)?,
            requested: describe(&offer.requested)?,
        };
        let mut offer = offer;
        let (kind, verb, code, message) = match op {
            GiftOperation::Offer => ("item-offered", "offered", "offered", copy.proposed),
            GiftOperation::Counter => ("item-offered", "revised", "offered", copy.proposed),
            GiftOperation::Accept => (
                "offer-accepted",
                "accepted",
                "accepted-offer",
                if offer.requested.is_empty() {
                    copy.accepted
                } else {
                    copy.reciprocal_accepted
                },
            ),
            GiftOperation::Decline => ("offer-declined", "declined", "declined", copy.declined),
            GiftOperation::Withdraw => ("offer-withdrawn", "withdrew", "withdrawn", copy.withdrawn),
        };
        let mut accepted = outcome(true, code, message);
        if op.proposes() || op == GiftOperation::Accept {
            let template = message.replace(
                "{minutes}",
                &ryu_js::Buffer::new().format(policy.pending_seconds / 60.0),
            );
            accepted.message = gift_terms(&template, &offer, &descriptions)?;
        }

        let target = target_id.clone();
        let owner = owner.to_owned();
        if op == GiftOperation::Offer {
            offer.id = core.physical().allocate("offer")?.id;
            core.add_gift(offer.clone())?;
        } else if op == GiftOperation::Counter {
            core.replace_gift(offer.clone())?;
        } else {
            if op == GiftOperation::Accept {
                let Some(item) = core.transfer_handover_lots(&offer)? else {
                    self.gift_refusal(
                        "offer-lapsed",
                        if offer.requested.is_empty() {
                            copy.gift_unavailable
                        } else {
                            copy.reciprocal_unavailable
                        },
                    )?;
                    return Ok(None);
                };
                accepted.item_id = Some(item);
            }
            core.finish_gift(&offer.id)?;
        }
        let counterpart_holds = self.gift_counterpart_notice
            && crate::handover::ReceivedGifts::from_player(core.state, &target, &self.budget)?
                .contains_revision(&offer.id, offer.revision);
        let observers = if op.proposes() || counterpart_holds {
            vec![target.clone(), owner.clone()]
        } else {
            vec![owner.clone()]
        };
        self.gift_notice = Some(GiftNotice {
            offer,
            kind,
            verb,
            observers,
            descriptions,
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

    /// Let a participant close the exact offer they still remember. The
    /// record describes their own choice and does not discover the other
    /// person's ending or alter anyone's stock.
    fn end_received_gift(
        &mut self,
        core: &mut CoreMutation<'_>,
        preview: bool,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        self.reserve(copy.own_ending_receipt.len() * 2 + 128)?;
        let NativeCommand::Handover {
            envelope, target_id, gift, ..
        } = &self.command else {
            return Err(ExecutionError::Invariant);
        };
        let owner = &envelope.actor_id;
        let received = crate::handover::ReceivedGifts::from_player(core.state, owner, &self.budget)?;
        let remembered = gift.offer_id.as_deref().zip(gift.expected_offer_revision)
            .and_then(|(id, revision)| received.find(id, revision))
            .filter(|known| {
                let offer = &known.offer;
                match gift.handover_operation {
                    GiftOperation::Withdraw => offer.offerer_id == *owner && offer.recipient_id == *target_id,
                    GiftOperation::Decline => offer.recipient_id == *owner && offer.offerer_id == *target_id,
                    GiftOperation::Accept | GiftOperation::Offer | GiftOperation::Counter => false,
                }
            });
        let Some(remembered) = remembered else {
            self.gift_refusal("no-offer", copy.unavailable)?;
            return Ok(None);
        };
        const KIND: &str = "offer-own-ending";
        self.outcome = Some(outcome(true, KIND, copy.own_ending_receipt));
        if preview {
            self.phase = Phase::Done;
            return Ok(None);
        }
        let event = stage_gift_notice(
            core,
            &remembered.offer,
            &remembered.descriptions,
            owner,
            KIND,
            GiftMessenger::OwnEnding { target: target_id },
        )?;
        self.reserve(event.id.len())?;
        self.event = Some(event.id.clone());
        self.after_event = Phase::Tail;
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
            &notice.descriptions,
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
