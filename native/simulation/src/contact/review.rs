//! A human's confirmation binds the same current body and strike facts that
//! the impact consumes. The host owns the expiring, single-use browser offer.
use super::ContactInjury;
use crate::body::ZeroHealthOutcome;
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_record, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::simulation::InstalledWorld;
use crate::state::Entity;
use crate::values::{deserialize_safe_integer, is_safe_record_id};
use crate::worlds::base_decision_offers::NativeStrikeRead;
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StrikePermission {
    actor_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    source_life: u64,
    target_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    target_life: u64,
    attack_digest: String,
}

heap_record!(StrikePermission {
    actor_id,
    source_life,
    target_id,
    target_life,
    attack_digest
});

pub(crate) enum Review {
    Allowed,
    Required,
    Changed,
}

impl StrikePermission {
    /// Heap retained by an independently owned review copy.
    pub fn retained_bytes(&self) -> Option<usize> {
        use crate::host::retained_size::HeapBytes;
        self.heap_bytes()
    }

    pub(super) fn valid_for_action(&self, actor: &Entity, target: &str, life: u64) -> bool {
        self.actor_id == actor.id
            && actor.physical_life() == Some(self.source_life)
            && self.target_id == target
            && self.target_life == life
            && is_safe_record_id(target)
            && self.attack_digest.len() == 64
            && self
                .attack_digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit())
    }
}

fn digest(
    definition: &NativeStrikeRead,
    injury: ContactInjury,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    // Use the existing exact text codec. This work only runs when issuing or
    // checking a confirmation. Nonlethal ordinary strikes use the scalars.
    let selected = (
        &definition,
        injury.outgoing,
        injury.susceptibility,
        injury.incoming,
    );
    let bytes =
        crate::encoding::json_record_len(&selected).map_err(|_| ExecutionError::Invariant)?;
    let custody = budget.reserve(bytes.checked_add(128).ok_or(ExecutionError::Capacity)?)?;
    let canonical =
        crate::encoding::json_record(&selected).map_err(|_| ExecutionError::Invariant)?;
    Ok((crate::encoding::sha256_hex(canonical.as_bytes()), custody))
}

pub(crate) fn prepare(
    source: &Entity,
    target: &Entity,
    definition: &NativeStrikeRead,
    injury: ContactInjury,
    budget: &ByteBudget,
) -> Result<(StrikePermission, ByteReservation), ExecutionError> {
    let (attack_digest, temporary) = digest(definition, injury, budget)?;
    let storage = budget.reserve(
        heap_sum([
            size_of::<StrikePermission>(),
            source.id.len(),
            target.id.len(),
            attack_digest.capacity(),
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    drop(temporary);
    Ok((
        StrikePermission {
            actor_id: source.id.clone(),
            source_life: source.physical_life().ok_or(ExecutionError::MissingActor)?,
            target_id: target.id.clone(),
            target_life: target.physical_life().ok_or(ExecutionError::MissingActor)?,
            attack_digest,
        },
        storage,
    ))
}

pub(crate) fn check(
    installed: &InstalledWorld,
    source: &Entity,
    target: &Entity,
    definition: &NativeStrikeRead,
    injury: ContactInjury,
    permission: Option<&StrikePermission>,
    budget: &ByteBudget,
) -> Result<Review, ExecutionError> {
    let target_actor = target.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    if let Some(permission) = permission {
        let current = permission.valid_for_action(
            source,
            &target.id,
            target_actor.physical_life.unwrap_or(0),
        );
        if !current {
            return Ok(Review::Changed);
        }
        let (current, _custody) = digest(definition, injury, budget)?;
        return Ok(if current == permission.attack_digest {
            Review::Allowed
        } else {
            Review::Changed
        });
    }
    let needs_review = installed.body_policy.as_ref().is_some_and(|policy| {
        let policy = policy.value();
        policy.lethal_attack_review.is_some()
            && policy.zero_health.outcome(&target_actor.controller) == Some(ZeroHealthOutcome::Die)
    });
    if !needs_review || injury.maximum(definition.damage) == 0.0 {
        return Ok(Review::Allowed);
    }
    // A conditional dialog would disclose private target health. The current
    // player danger contract selects this control only for public body health.
    if !installed.attributes.values().any(|definition| {
        let definition = definition.value();
        definition.implementation == "native-health-v1" && definition.disclosure == "public"
    }) {
        return Err(ExecutionError::UnsupportedFamily);
    }
    Ok(
        if injury.maximum(definition.damage) >= target_actor.health {
            Review::Required
        } else {
            Review::Allowed
        },
    )
}

/// A qualified, scoped player-facing offer. It remains owned by the completed
/// command until the host publishes it with its original receipt.
pub struct StrikeReviewOffer {
    pub permission: StrikePermission,
    pub title: String,
    pub description: String,
    pub confirm_label: String,
    pub cancel_label: String,
    pub view: crate::activity::ActivityView,
    _custody: ByteReservation,
}

impl StrikeReviewOffer {
    pub(crate) fn new(
        permission: StrikePermission,
        mut custody: ByteReservation,
        view: crate::activity::ActivityView,
        view_custody: ByteReservation,
        policy: &crate::body::LethalReviewPolicy,
    ) -> Result<Self, ExecutionError> {
        custody.resize(
            heap_sum([
                custody.bytes(),
                size_of::<Self>() - size_of::<StrikePermission>(),
                policy.title.len(),
                policy.description.len(),
                policy.confirm_label.len(),
                policy.cancel_label.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        custody.merge(view_custody)?;
        Ok(Self {
            permission,
            title: policy.title.clone(),
            description: policy.description.clone(),
            confirm_label: policy.confirm_label.clone(),
            cancel_label: policy.cancel_label.clone(),
            view,
            _custody: custody,
        })
    }
}

pub(crate) enum ChosenContact {
    Npc,
    Player(Option<Box<StrikePermission>>),
}

/// Issued only by the typed browser command entry.
pub(crate) struct PlayerStrike<'a> {
    pub permission: Option<&'a StrikePermission>,
}
