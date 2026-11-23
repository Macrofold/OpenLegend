//! One pending browser confirmation per controlled actor. The saved command
//! receipt owns its displayed outcome; the world owns impact and body facts.
use super::*;
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

pub(super) struct Reviews {
    pending: SyncMutex<HashMap<String, Arc<Pending>>>,
    limit: usize,
}

pub(super) struct Pending {
    id: Uuid,
    actor: String,
    scope: String,
    kind: CommandKind,
    target: Option<String>,
    definition: Option<String>,
    aim: Option<String>,
    expires_at: i64,
    pub(super) permission: StrikePermission,
    _custody: ByteReservation,
}

pub(super) enum Update {
    Offer(Arc<Pending>),
    Consume(Arc<Pending>),
}

impl Reviews {
    pub(super) fn new(limit: usize) -> Self {
        Self {
            pending: SyncMutex::new(HashMap::new()),
            limit,
        }
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
                        command.expected_action_id.is_none()
                    } else {
                        entry.kind == command.kind
                            && entry.target == command.target_id
                            && entry.definition == command.definition_id
                            && entry.aim == command.aim_id
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
        offer: &StrikeReviewOffer,
        budget: &ByteBudget,
    ) -> Result<Arc<Pending>, WorldError> {
        if !command.kind.may_offer_lethal_review() {
            return Err(StoreError::InvalidRecord.into());
        }
        let mut pending = self.pending.lock().map_err(|_| HostError::Poisoned)?;
        let now = now_ms();
        pending.retain(|_, entry| entry.expires_at > now);
        if !pending.contains_key(&scope.actor_id) {
            if pending.len() >= self.limit {
                return Err(HostError::Capacity.into());
            }
            pending.try_reserve(1).map_err(|_| HostError::Capacity)?;
        }
        let bytes = offer
            .permission
            .retained_bytes()
            .and_then(|n| {
                n.checked_add(
                    size_of::<Pending>()
                        + 64
                        + 2 * scope.actor_id.len()
                        + command.target_id.as_ref().map_or(0, String::len)
                        + command.definition_id.as_ref().map_or(0, String::len)
                        + command.aim_id.as_ref().map_or(0, String::len)
                        + 256,
                )
            })
            .ok_or(HostError::Capacity)?;
        let custody = budget.reserve(bytes).map_err(HostError::from)?;
        Ok(Arc::new(Pending {
            id: Uuid::new_v4(),
            actor: scope.actor_id.clone(),
            scope: scope.key().map_err(|_| StoreError::InvalidRecord)?,
            kind: command.kind,
            target: command.target_id.clone(),
            definition: command.definition_id.clone(),
            aim: command.aim_id.clone(),
            expires_at: now.saturating_add(REVIEW_MS),
            permission: offer.permission.clone(),
            _custody: custody,
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

    pub(super) fn result(
        &self,
        offer: &StrikeReviewOffer,
        result: &openlegend_simulation::commands::Outcome,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), RuntimeError> {
        #[derive(Serialize)]
        struct Fact<'a> {
            name: &'a JsText,
            value: std::borrow::Cow<'a, JsText>,
            critical: bool,
        }
        #[derive(Serialize)]
        struct Attack<'a> {
            name: &'a JsText,
            facts: Vec<Fact<'a>>,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Review<'a> {
            id: Uuid,
            title: &'a str,
            description: &'a str,
            target_label: &'a JsText,
            attack: Attack<'a>,
            confirm_label: &'a str,
            cancel_label: &'a str,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Display<'a> {
            ok: bool,
            code: &'a str,
            message: &'a JsText,
            lethal_review: Review<'a>,
        }
        let mut storage = budget.reserve(
            512_usize
                .checked_add(
                    offer
                        .view
                        .facts
                        .len()
                        .saturating_mul(size_of::<Fact>() + 72),
                )
                .ok_or(HostError::Capacity)
                .map_err(RuntimeError::application_refused)?,
        )?;
        let mut facts = Vec::with_capacity(offer.view.facts.len());
        for fact in offer.view.facts.iter().filter(|fact| fact.critical) {
            let value = match &fact.value {
                ActivityDetail::Scalar(ActivityScalar::String(text)) => {
                    std::borrow::Cow::Borrowed(text)
                }
                ActivityDetail::Scalar(value) => std::borrow::Cow::Owned(
                    json_record(value)
                        .map_err(RuntimeError::application_refused)?
                        .into(),
                ),
                _ => continue,
            };
            facts.push(Fact {
                name: &fact.name,
                value,
                critical: true,
            });
        }
        let view = Display {
            ok: result.ok,
            code: &result.code,
            message: &result.message,
            lethal_review: Review {
                id: self.id,
                title: &offer.title,
                description: &offer.description,
                target_label: offer.view.target.as_ref().ok_or_else(|| {
                    RuntimeError::application_refused("Attack review target unavailable.")
                })?,
                attack: Attack {
                    name: &offer.view.name,
                    facts,
                },
                confirm_label: &offer.confirm_label,
                cancel_label: &offer.cancel_label,
            },
        };
        let len = openlegend_simulation::encoding::json_record_len(&view)
            .map_err(RuntimeError::application_refused)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(len)
                .ok_or(HostError::Capacity)
                .map_err(RuntimeError::application_refused)?,
        )?;
        let result = json_record(&view).map_err(RuntimeError::application_refused)?;
        Ok((result, storage))
    }
}
