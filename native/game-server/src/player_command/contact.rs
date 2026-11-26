//! One pending browser confirmation per controlled actor. The saved command
//! receipt owns its displayed outcome; the world owns impact and body facts.
use super::late_review::{LateReviewInvite, ReleaseReviewRequest};
use super::*;
use crate::world_input::ReviewedAttack;
use openlegend_simulation::{
    activity::{ActivityDetail, ActivityScalar},
    runtime::{StrikePermission, StrikeReviewOffer},
};
use openlegend_world_host::pool::HostError;
use std::collections::HashMap;
use std::sync::Mutex as SyncMutex;

const REVIEW_MS: i64 = 60_000;
pub(super) const STALE: (&str, &str) = (
    "lethal-review-stale",
    "That attack review expired or changed. Choose the attack again.",
);

pub(crate) struct Reviews {
    pending: SyncMutex<HashMap<String, Arc<Pending>>>,
    limit: usize,
}

pub(crate) struct Pending {
    id: Uuid,
    actor: String,
    scope: String,
    kind: CommandKind,
    target: Option<String>,
    definition: Option<String>,
    aim: Option<String>,
    expected_action: Option<String>,
    pub(super) attack: Option<ReviewedAttack>,
    point: Option<Point>,
    basis: Option<AimBasis>,
    body_reference: Option<String>,
    tool: Option<String>,
    ammunition: Option<String>,
    auto_equip: Option<bool>,
    expires_at: i64,
    late: Option<(Arc<ReleaseReviewRequest>, ReviewDisplay)>,
    pub(super) permission: StrikePermission,
    _custody: ByteReservation,
}

pub(super) enum Update {
    Offer(Arc<Pending>),
    Consume(Arc<Pending>),
}

impl Reviews {
    pub(crate) fn new(limit: usize) -> Self {
        Self {
            pending: SyncMutex::new(HashMap::new()),
            limit,
        }
    }

    pub(crate) fn clear(&self) -> Result<(), HostError> {
        self.pending.lock().map_err(|_| HostError::Poisoned)?.clear();
        Ok(())
    }

    pub(crate) fn clear_actor(&self, actor: &str) -> Result<(), HostError> {
        self.pending.lock().map_err(|_| HostError::Poisoned)?.remove(actor);
        Ok(())
    }

    pub(super) fn selected(
        &self,
        actor: &str,
        scope: &str,
        id: Uuid,
        command: &CommandInput,
    ) -> Result<Option<Arc<Pending>>, WorldError> {
        let pending = self.pending.lock().map_err(|_| HostError::Poisoned)?;
        Ok(pending
            .get(actor)
            .filter(|entry| {
                entry.id == id
                    && entry.scope == scope
                    && entry.current()
                    && if matches!(command.kind, CommandKind::Cancel) {
                        command.expected_action_id.as_ref()
                            == entry.aim.as_ref().or(entry.expected_action.as_ref())
                    } else {
                        entry.kind == command.kind
                            && entry.expected_action == command.expected_action_id
                            && entry.attack.is_some()
                                == matches!(
                                    command.execution,
                                    Some(AttackControl::ConfirmReview { .. })
                                )
                            && entry.target == command.target_id
                            && entry.definition == command.definition_id
                            && entry.aim == command.aim_id
                            && entry.point == command.aim_point
                            && entry.basis == command.aim_basis
                            && entry.body_reference == command.body_reference
                            && entry.tool == command.item_id
                            && entry.ammunition == command.ammunition_id
                            && entry.auto_equip == command.auto_equip
                    }
            })
            .cloned())
    }

    /// Reserve the exact copy of the physical review and one host slot. When
    /// accepted the same pending entry outlives the command's temporary view.
    pub(super) fn prepare(
        &self,
        scope: &RequestScope,
        command: &CommandInput,
        turn: Option<&AttackTurn>,
        offer: &StrikeReviewOffer,
        budget: &ByteBudget,
    ) -> Result<Arc<Pending>, WorldError> {
        let offer = Self::prepare_bound(
            scope,
            command,
            turn.map(|turn| (turn.operation, turn.begin.as_str())),
            None,
            offer,
            budget,
        )?;
        self.reserve_slots(std::iter::once(scope.actor_id.as_str()))?;
        Ok(offer)
    }

    /// The world turn stages all new actor keys before accepting any of them.
    /// A clock update can cross several release deadlines in the same turn.
    pub(crate) fn reserve_slots<'a>(
        &self,
        actors: impl Iterator<Item = &'a str>,
    ) -> Result<(), WorldError> {
        let mut pending = self.pending.lock().map_err(|_| HostError::Poisoned)?;
        let now = now_ms();
        pending.retain(|_, entry| entry.expires_at > now);
        let additional = actors.filter(|actor| !pending.contains_key(*actor)).count();
        if additional > self.limit.saturating_sub(pending.len()) {
            return Err(HostError::Capacity.into());
        }
        pending.try_reserve(additional).map_err(|_| HostError::Capacity)?;
        Ok(())
    }

    pub(super) fn prepare_late(
        scope: &RequestScope,
        input: Arc<ReleaseReviewRequest>,
        offer: &StrikeReviewOffer,
        budget: &ByteBudget,
    ) -> Result<Arc<Pending>, WorldError> {
        let operation = input.choice();
        Self::prepare_bound(
            scope,
            input.command(),
            Some((operation.operation, operation.begin.as_str())),
            Some(input.clone()),
            offer,
            budget,
        )
    }

    fn prepare_bound(
        scope: &RequestScope,
        command: &CommandInput,
        choice: Option<(AttackOperation, &str)>,
        invitation: Option<Arc<ReleaseReviewRequest>>,
        offer: &StrikeReviewOffer,
        budget: &ByteBudget,
    ) -> Result<Arc<Pending>, WorldError> {
        if !command.kind.may_offer_lethal_review() {
            return Err(StoreError::InvalidRecord.into());
        }
        let now = now_ms();
        let basis = command.aim_basis.as_ref();
        let selected_text = [
            command.expected_action_id.as_ref(),
            command.target_id.as_ref(),
            command.definition_id.as_ref(),
            command.aim_id.as_ref(),
            command.body_reference.as_ref(),
            command.item_id.as_ref(),
            command.ammunition_id.as_ref(),
            basis.and_then(|basis| basis.body_reference.as_ref()),
            basis.and_then(|basis| basis.surface_id.as_ref()),
            basis.and_then(|basis| basis.shape_id.as_ref()),
        ];
        let bytes = offer
            .permission
            .retained_bytes()
            .and_then(|n| n.checked_add(size_of::<Pending>() + 64 + 2 * scope.actor_id.len() + 256))
            .and_then(|base| {
                selected_text
                    .into_iter()
                    .flatten()
                    .try_fold(base, |total, part| total.checked_add(part.len()))
            })
            .ok_or(HostError::Capacity)?;
        let id = Uuid::new_v4();
        let bytes = bytes
            .checked_add(choice.map_or(0, |(_, begin)| begin.len()))
            .ok_or(HostError::Capacity)?;
        let mut custody = budget.reserve(bytes).map_err(HostError::from)?;
        let late = invitation
            .map(|input| {
                let (display, storage) = ReviewDisplay::prepare(id, offer, budget)?;
                custody.merge(storage)?;
                Ok::<_, RuntimeError>((input, display))
            })
            .transpose()?;
        Ok(Arc::new(Pending {
            id,
            actor: scope.actor_id.clone(),
            scope: scope.key().map_err(|_| StoreError::InvalidRecord)?,
            kind: command.kind,
            target: command.target_id.clone(),
            definition: command.definition_id.clone(),
            aim: command.aim_id.clone(),
            expected_action: command.expected_action_id.clone(),
            attack: choice.map(|(operation, begin)| ReviewedAttack {
                operation,
                begin: begin.to_owned(),
            }),
            point: command.aim_point,
            basis: command.aim_basis.clone(),
            body_reference: command.body_reference.clone(),
            tool: command.item_id.clone(),
            ammunition: command.ammunition_id.clone(),
            auto_equip: command.auto_equip,
            expires_at: now.saturating_add(REVIEW_MS),
            permission: offer.permission.clone(),
            late,
            _custody: custody,
        }))
    }

    pub(crate) fn publish_late(&self, offer: Arc<Pending>) {
        self.publish(&Update::Offer(offer));
    }

    pub(super) fn late_invite(
        self: &Arc<Self>,
        scope: &RequestScope,
        references: &Arc<ReferenceIssuer>,
    ) -> Result<Option<LateReviewInvite>, WorldError> {
        let key = scope.key().map_err(|_| StoreError::InvalidRecord)?;
        let entries = self.pending.lock().map_err(|_| HostError::Poisoned)?;
        Ok(entries
            .get(&scope.actor_id)
            .filter(|entry| entry.scope == key && entry.late.is_some() && entry.current())
            .map(|entry| LateReviewInvite::new(self.clone(), entry.clone(), references.clone())))
    }

    pub(super) fn still_selected(
        &self,
        scope: &RequestScope,
        waiting: &Arc<Pending>,
    ) -> Result<bool, WorldError> {
        let key = scope.key().map_err(|_| StoreError::InvalidRecord)?;
        let entries = self.pending.lock().map_err(|_| HostError::Poisoned)?;
        Ok(entries.get(&scope.actor_id).is_some_and(|entry| {
            Arc::ptr_eq(entry, waiting) && entry.scope == key && entry.current()
        }))
    }

    pub(super) fn publish(&self, update: &Update) {
        let mut pending = self.pending.lock().expect("attack review owner is intact");
        match update {
            Update::Offer(offer) => {
                pending.insert(offer.actor.clone(), offer.clone());
            }
            Update::Consume(previous) => {
                if pending
                    .get(&previous.actor)
                    .is_some_and(|entry| Arc::ptr_eq(previous, entry))
                {
                    pending.remove(&previous.actor);
                }
            }
        }
    }
}

impl Pending {
    pub(super) fn current(&self) -> bool {
        self.expires_at > now_ms()
    }

    pub(super) fn id(&self) -> Uuid {
        self.id
    }

    pub(super) fn late(&self) -> Option<(&ReleaseReviewRequest, &ReviewDisplay)> {
        self.late
            .as_ref()
            .map(|(source, view)| (source.as_ref(), view))
    }

    pub(super) fn result(
        &self,
        offer: &StrikeReviewOffer,
        result: &openlegend_simulation::commands::Outcome,
        scope: Option<&InputScope>,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), RuntimeError> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Display<'a> {
            ok: bool,
            code: &'a str,
            message: &'a JsText,
            #[serde(skip_serializing_if = "Option::is_none")]
            input_scope: Option<&'a InputScope>,
            lethal_review: &'a ReviewDisplay,
        }
        let (review, mut storage) = ReviewDisplay::prepare(self.id, offer, budget)?;
        let view = Display {
            ok: result.ok,
            code: &result.code,
            message: &result.message,
            input_scope: scope,
            lethal_review: &review,
        };
        let len = openlegend_simulation::encoding::json_record_len(&view)
            .map_err(RuntimeError::application_refused)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(len)
                .ok_or(openlegend_simulation::host::CapacityError)?,
        )?;
        Ok((
            json_record(&view).map_err(RuntimeError::application_refused)?,
            storage,
        ))
    }
}

#[derive(Serialize)]
struct ReviewFact {
    name: JsText,
    value: JsText,
    critical: bool,
}

#[derive(Serialize)]
struct ReviewAttack {
    name: JsText,
    facts: Vec<ReviewFact>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ReviewDisplay {
    id: Uuid,
    title: String,
    description: String,
    pub(super) target_label: JsText,
    attack: ReviewAttack,
    confirm_label: String,
    cancel_label: String,
}

impl ReviewDisplay {
    /// Build once from the native, permitted offer. A late review retains
    /// this same typed display through the actor review slot.
    fn prepare(
        id: Uuid,
        offer: &StrikeReviewOffer,
        budget: &ByteBudget,
    ) -> Result<(Self, ByteReservation), RuntimeError> {
        let target = offer.view.target.as_ref().ok_or_else(|| {
            RuntimeError::application_refused("Attack review target unavailable.")
        })?;
        let labels = [
            offer.title.len(),
            offer.description.len(),
            offer.confirm_label.len(),
            offer.cancel_label.len(),
            offer.view.name.storage_bytes(),
            target.storage_bytes(),
        ];
        let bytes =
            labels
                .into_iter()
                .try_fold(512_usize, usize::checked_add)
                .and_then(|initial| {
                    offer.view.facts.iter().filter(|f| f.critical).try_fold(
                        initial,
                        |bytes, fact| {
                            let value = match &fact.value {
                                ActivityDetail::Scalar(ActivityScalar::String(text)) => {
                                    text.storage_bytes()
                                }
                                _ => 72,
                            };
                            bytes
                                .checked_add(size_of::<ReviewFact>())?
                                .checked_add(fact.name.storage_bytes())?
                                .checked_add(value)
                        },
                    )
                })
                .ok_or(openlegend_simulation::host::CapacityError)?;
        let custody = budget.reserve(bytes)?;
        let mut facts = Vec::new();
        for fact in offer.view.facts.iter().filter(|f| f.critical) {
            let value = match &fact.value {
                ActivityDetail::Scalar(ActivityScalar::String(text)) => text.clone(),
                ActivityDetail::Scalar(value) => json_record(value)
                    .map_err(RuntimeError::application_refused)?
                    .into(),
                _ => continue,
            };
            facts.push(ReviewFact {
                name: fact.name.clone(),
                value,
                critical: true,
            });
        }
        Ok((
            Self {
                id,
                title: offer.title.clone(),
                description: offer.description.clone(),
                target_label: target.clone(),
                attack: ReviewAttack {
                    name: offer.view.name.clone(),
                    facts,
                },
                confirm_label: offer.confirm_label.clone(),
                cancel_label: offer.cancel_label.clone(),
            },
            custody,
        ))
    }
}
