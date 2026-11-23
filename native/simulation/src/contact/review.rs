//! A human's confirmation binds the same current body and strike facts that
//! the impact consumes. The host owns the expiring, single-use browser offer.
use super::{ContactInjury, ContactKind, ContactRead};
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

    pub fn target_id(&self) -> &str {
        &self.target_id
    }

    pub fn target_life(&self) -> u64 {
        self.target_life
    }

    pub(crate) fn valid_for_source(&self, actor: &Entity) -> bool {
        actor
            .physical_life()
            .is_some_and(|life| self.valid_for_flight(&actor.id, life, &self.attack_digest))
    }

    pub(crate) fn valid_for_flight(&self, source: &str, life: u64, digest: &str) -> bool {
        self.actor_id == source
            && self.source_life == life
            && is_safe_record_id(&self.target_id)
            && self.target_life <= crate::identity::MAX_SAFE_INTEGER
            && self.attack_digest == digest
            && digest.len() == 64
            && digest.bytes().all(|byte| byte.is_ascii_hexdigit())
    }

    pub(crate) fn valid_for_action(&self, actor: &Entity, target: &str, life: u64) -> bool {
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

pub(crate) fn strike_digest(
    definition: ContactRead<'_>,
    injury: ContactInjury,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    // Use the existing exact text codec. This work only runs when issuing or
    // checking a confirmation. Nonlethal ordinary strikes use the scalars.
    #[derive(Serialize)]
    #[serde(untagged)]
    enum Selected<'a> {
        Natural(&'a NativeStrikeRead),
        Equipped(&'a str, &'a crate::values::DefinitionPin),
    }
    let attack = match definition.kind {
        ContactKind::Natural(strike) => Selected::Natural(strike),
        ContactKind::Equipped { item_id, definition } => Selected::Equipped(item_id, &definition.pin),
    };
    let selected = (
        attack,
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

pub(crate) fn timed_strike_digest(
    definition: ContactRead<'_>,
    injury: ContactInjury,
    input: crate::attack_execution::TimedReleaseInput,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let (bound, _base) = strike_digest(definition, injury, budget)?;
    let meaning = (bound, input);
    let size = crate::encoding::json_record_len(&meaning).map_err(|_| ExecutionError::Invariant)?;
    let custody = budget.reserve(size.checked_add(128).ok_or(ExecutionError::Capacity)?)?;
    let encoded = crate::encoding::json_record(&meaning).map_err(|_| ExecutionError::Invariant)?;
    Ok((crate::encoding::sha256_hex(encoded.as_bytes()), custody))
}

pub(crate) fn prepare(
    source: &Entity,
    target: &Entity,
    definition: ContactRead<'_>,
    injury: ContactInjury,
    budget: &ByteBudget,
) -> Result<(StrikePermission, ByteReservation), ExecutionError> {
    let (attack_digest, _temporary) = strike_digest(definition, injury, budget)?;
    prepare_digest(source, target, &attack_digest, budget)
}

pub(crate) fn prepare_digest(
    source: &Entity,
    target: &Entity,
    attack_digest: &str,
    budget: &ByteBudget,
) -> Result<(StrikePermission, ByteReservation), ExecutionError> {
    let storage = budget.reserve(
        heap_sum([
            size_of::<StrikePermission>(),
            source.id.len(),
            target.id.len(),
            attack_digest.len(),
        ])
        .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok((
        StrikePermission {
            actor_id: source.id.clone(),
            source_life: source.physical_life().ok_or(ExecutionError::MissingActor)?,
            target_id: target.id.clone(),
            target_life: target.physical_life().ok_or(ExecutionError::MissingActor)?,
            attack_digest: attack_digest.into(),
        },
        storage,
    ))
}

pub(crate) fn check(
    installed: &InstalledWorld,
    source: &Entity,
    target: &Entity,
    definition: ContactRead<'_>,
    injury: ContactInjury,
    permission: Option<&StrikePermission>,
    budget: &ByteBudget,
) -> Result<Review, ExecutionError> {
    check_damage(
        installed,
        source,
        target,
        injury.maximum(definition.damage),
        permission,
        || strike_digest(definition, injury, budget),
    )
}

pub(crate) fn check_damage(
    installed: &InstalledWorld,
    source: &Entity,
    target: &Entity,
    maximum: f64,
    permission: Option<&StrikePermission>,
    current_digest: impl FnOnce() -> Result<(String, ByteReservation), ExecutionError>,
) -> Result<Review, ExecutionError> {
    let target_actor = target.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    if let Some(permission) = permission {
        if !permission.valid_for_action(source, &target.id, target_actor.physical_life.unwrap_or(0))
        {
            return Ok(Review::Changed);
        }
        let (current, _custody) = current_digest()?;
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
    if !needs_review || maximum == 0.0 {
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
    Ok(if maximum >= target_actor.health {
        Review::Required
    } else {
        Review::Allowed
    })
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

/// Result of a covered timed release that requires current approval. The
/// clock has disarmed the old intention. Only its owner may offer a new review.
pub struct TimedReleaseReview {
    action: String,
    offer: StrikeReviewOffer,
    _custody: ByteReservation,
}

impl TimedReleaseReview {
    pub fn actor_id(&self) -> &str {
        &self.offer.permission.actor_id
    }

    pub fn action_id(&self) -> &str {
        &self.action
    }

    pub fn offer(&self) -> &StrikeReviewOffer {
        &self.offer
    }

    pub(crate) fn prepare(
        state: &crate::simulation::SimulationState,
        action_id: &str,
        permission: StrikePermission,
        custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        use crate::host::retained_size::HeapBytes;
        let actor = &permission.actor_id;
        let action = state.physical.entities.get(actor)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref())
            .filter(|action| action.id == action_id)
            .ok_or(ExecutionError::Invariant)?;
        let rule = state.installed.body_policy.as_ref()
            .and_then(|policy| policy.value().lethal_attack_review.as_ref())
            .ok_or(ExecutionError::Invariant)?;
        let (view, storage, description) = if action.ranged.is_some() {
            let (view, storage) =
                ranged_activity_view(state, actor, action, Some(permission.target_id()), budget)?;
            (view, storage, rule.ranged_description.as_str())
        } else {
            let active = state.activity.active(action_id)
                .map_err(ExecutionError::Activity)?
                .ok_or(ExecutionError::Invariant)?;
            let storage = budget.reserve(active.view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
            (active.view.clone(), storage, rule.description.as_str())
        };
        let name_storage = budget.reserve(action_id.len())?;
        Ok(Self {
            action: action_id.into(),
            offer: StrikeReviewOffer::new(permission, custody, view, storage, rule, description)?,
            _custody: name_storage,
        })
    }
}

impl StrikeReviewOffer {
    pub(crate) fn new(
        permission: StrikePermission,
        mut custody: ByteReservation,
        view: crate::activity::ActivityView,
        view_custody: ByteReservation,
        policy: &crate::body::LethalReviewPolicy,
        description: &str,
    ) -> Result<Self, ExecutionError> {
        custody.resize(
            heap_sum([
                custody.bytes(),
                size_of::<Self>() - size_of::<StrikePermission>(),
                policy.title.len(),
                description.len(),
                policy.confirm_label.len(),
                policy.cancel_label.len(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        custody.merge(view_custody)?;
        Ok(Self {
            permission,
            title: policy.title.clone(),
            description: description.to_owned(),
            confirm_label: policy.confirm_label.clone(),
            cancel_label: policy.cancel_label.clone(),
            view,
            _custody: custody,
        })
    }
}

/// Prepare the range control's private activity label from the current permitted
/// target chosen by launch review, and fund the copy independently of the action.
pub(crate) fn ranged_activity_view(
    state: &crate::simulation::SimulationState,
    actor: &str,
    action: &crate::state::Action,
    reviewed_target: Option<&str>,
    budget: &ByteBudget,
) -> Result<(crate::activity::ActivityView, ByteReservation), ExecutionError> {
    use crate::activity::ActivityView;
    use crate::host::retained_size::HeapBytes;
    let aim = action.ranged.as_ref().ok_or(ExecutionError::Invariant)?;
    let policy = state
        .installed
        .manifest
        .ranged_policy
        .as_ref()
        .ok_or(ExecutionError::Invariant)?;
    let tool = state
        .installed
        .retained
        .items
        .get(&aim.tool.id)
        .ok_or(ExecutionError::Invariant)?;
    let names = crate::worlds::InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor,
    )?;
    let target = reviewed_target
        .or_else(|| aim.aim_target.as_ref().map(|subject| subject.id.as_str()))
        .map(|id| names.capture_observer_name(id, budget))
        .transpose()?;
    let view_bytes = heap_sum([
        policy.action_label.len() * 2,
        tool.named.name.storage_bytes(),
        target
            .as_ref()
            .map_or(0, |label| label.name().name.storage_bytes()),
    ])
    .ok_or(ExecutionError::Capacity)?;
    let mut storage = budget.reserve(view_bytes)?;
    let view = ActivityView {
        name: policy.action_label.as_str().into(),
        actor: None,
        tool: Some(tool.named.name.clone()),
        target: target.as_ref().map(|label| label.name().name.clone()),
        facts: Vec::new(),
        children: None,
        result: None,
    };
    storage.resize(view.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
    Ok((view, storage))
}

pub(crate) enum ChosenContact {
    Npc,
    Player(Option<Box<StrikePermission>>),
}

/// Issued only by the typed browser command entry.
pub(crate) struct PlayerStrike<'a> {
    pub permission: Option<&'a StrikePermission>,
    pub equipment_revision: Option<u64>,
    pub execution: Option<crate::attack_execution::PlayerAttackInput>,
}
