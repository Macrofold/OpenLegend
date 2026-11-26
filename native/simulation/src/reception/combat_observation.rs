//! A private combat cue consumes the observer's completed visual reception.
//! The action keeps only the receipt that prevents repeating the same evidence.
use super::{EventScalar, ObserverLife};
use crate::combat_encounters::{ObservedAttackKind, SeenAttack, current_pair, observed_preparation};
use crate::events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope, WorldEvent};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::state::{Action, Entity, FundedAttackObservers};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

pub(crate) const ATTACK_CUE_EVENT: &str = "attack-cue";

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AttackObservationReceipt {
    #[serde(deserialize_with = "crate::values::deserialize_safe_integer")]
    life: u64,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    episode: Option<String>,
    occurrence_id: String,
}

impl HeapBytes for AttackObservationReceipt {
    fn heap_bytes(&self) -> Option<usize> {
        self.episode.heap_bytes()?.checked_add(self.occurrence_id.capacity())
    }
}

pub(crate) type AttackObservers = IndexMap<String, AttackObservationReceipt>;

pub(crate) struct PreparedAttackCue {
    source: crate::state::EntityHandle,
    action: String,
    observer: String,
    receipts: AttackObservers,
    receipt_storage: ByteReservation,
    event: EventEmissionIntent,
    storage: ByteReservation,
}

pub(crate) enum AttackAcquisition {
    NewCue(PreparedAttackCue),
    Known(SeenAttack),
}

impl PreparedAttackCue {
    pub(crate) fn stage(
        mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(StagedOccurrence, ByteReservation), ExecutionError> {
        let staged = core.stage_event(self.event)?;
        self.receipt_storage.resize(self.receipt_storage.bytes().checked_add(staged.id.len())
            .ok_or(ExecutionError::Capacity)?)?;
        self.receipts.get_mut(&self.observer).ok_or(ExecutionError::Invariant)?
            .occurrence_id = staged.id.clone();
        let receipts = FundedAttackObservers::from_storage(self.receipts, self.receipt_storage, budget)?;
        core.physical()
            .replace_attack_observers(self.source, &self.action, receipts)?;
        Ok((staged, self.storage))
    }
}

pub(crate) fn valid_observers(observers: &AttackObservers) -> bool {
    use crate::values::is_safe_record_id;
    observers.iter().all(|(observer, receipt)| {
        is_safe_record_id(observer) && receipt.episode.as_deref().is_none_or(is_safe_record_id)
            && is_safe_record_id(&receipt.occurrence_id)
    })
}

pub(crate) fn preparation_narration(source: &str, target: &str, wording: &str) -> Narration {
    Narration {
        parts: vec![
            NarrationPart::Participant {
                entity_id: source.into(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(format!(" {wording} ").into()),
            NarrationPart::Participant {
                entity_id: target.into(),
                role: PersonRole::Object,
                article: None,
            },
            NarrationPart::Literal(".".into()),
        ],
    }
}

/// The snapshot is the current accepted people list for this visual receiving
/// turn, including unchanged observations whose support is still valid.
pub(crate) fn next_attack_cue(
    core: &CoreMutation<'_>,
    observer: &ObserverLife,
    index: &mut usize,
    budget: &ByteBudget,
) -> Result<Option<AttackAcquisition>, ExecutionError> {
    let combat = core
        .state
        .installed
        .body_policy
        .as_ref()
        .and_then(|body| body.value().combat.as_ref());
    let policy = combat.and_then(|combat| {
        combat
            .encounters
            .as_ref()
            .filter(|policy| policy.visible_preparation)
            .map(|policy| (combat, policy))
    });
    let reception = &core.state.reception;
    let Some(people) = reception
        .visible_people
        .as_ref()
        .and_then(|owners| owners.get(&observer.actor_id))
    else {
        return Ok(None);
    };
    let state = &core.state.physical;
    while let Some(source_id) = people.get(*index) {
        *index += 1;
        let Some(source) = state.entities.get(source_id) else {
            continue;
        };
        if source
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
            .is_some_and(Action::has_unconverted_fields)
        {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let Some((action, (combat, policy))) = observed_preparation(source).zip(policy) else {
            continue;
        };
        let Some(target_id) = action.target_id.as_deref() else {
            continue;
        };
        let directed = target_id == observer.actor_id;
        if !directed && !people.iter().any(|id| id == target_id) {
            continue;
        }
        let Some(target_life) = state
            .entities
            .get(target_id)
            .and_then(Entity::physical_life)
        else {
            continue;
        };
        if Some(target_life) != action.target_life
            || (directed && target_life != observer.physical_life)
        {
            continue;
        }
        let episode = reception
            .perception_episodes
            .as_ref()
            .and_then(|owners| owners.get(&observer.actor_id))
            .and_then(|episodes| episodes.get(source_id));
        let previous = action.attack_observers.as_ref();
        if let Some(prior) = previous
            .and_then(|observers| observers.get(&observer.actor_id))
            .filter(|prior| {
                prior.life == observer.physical_life
                    && crate::worlds::base_knowledge::subject_reference_current(
                        reception,
                        &observer.actor_id,
                        source_id,
                        Some(&prior.episode),
                    )
            })
        {
            if directed {
                let own = state.entities.get(&observer.actor_id).ok_or(ExecutionError::MissingActor)?;
                let pair = current_pair(core.state, own, source);
                if own.has_memory()
                    && core.state.experience.actor(&observer.actor_id)
                        .is_some_and(|owner| !owner.privacy.revoked(&prior.occurrence_id))
                    && pair.is_none_or(|pair| {
                    !pair.active.values().any(|old| old.kind == ObservedAttackKind::Action && old.id == action.id)
                }) {
                    let bytes = heap_sum([source_id.len(), action.id.len(), episode.map_or(0, String::len), prior.occurrence_id.len()])
                        .ok_or(ExecutionError::Capacity)?;
                    let custody = budget.reserve(bytes)?;
                    return Ok(Some(AttackAcquisition::Known(SeenAttack {
                        source: source_id.clone(), life: source.physical_life().ok_or(ExecutionError::Invariant)?,
                        action: action.id.clone(), episode: episode.cloned(), occurrence: prior.occurrence_id.clone(),
                        had_pair: pair.is_some(), _custody: custody,
                    })));
                }
            }
            continue;
        }
        let storage = budget.reserve(
            heap_sum([
                action
                    .attack_observers
                    .heap_bytes()
                    .ok_or(ExecutionError::Capacity)?,
                map_storage::<String, AttackObservationReceipt>(
                    previous
                        .map_or(0, IndexMap::capacity)
                        .saturating_mul(2)
                        .max(4),
                )
                .ok_or(ExecutionError::Capacity)?,
                observer.actor_id.len(),
                episode.map_or(0, String::len),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut receipts = previous.cloned().unwrap_or_default();
        receipts
            .try_reserve(1)
            .map_err(|_| ExecutionError::Capacity)?;
        receipts.insert(
            observer.actor_id.clone(),
            AttackObservationReceipt {
                life: observer.physical_life,
                episode: episode.cloned(),
                occurrence_id: String::new(),
            },
        );
        let source_life = source.physical_life().ok_or(ExecutionError::Invariant)?;
        let witness_help = policy.witness_warning
            && !directed
            && source_id != &observer.actor_id
            && previous
                .and_then(|seen| seen.get(&observer.actor_id))
                .is_none_or(|prior| prior.life != observer.physical_life)
            && state
                .entities
                .get(&observer.actor_id)
                .zip(state.entities.get(target_id))
                .map(|(witness, target)| {
                    crate::worlds::InstalledSpeechAction::can_warn(
                        &core.state.installed,
                        witness,
                        target,
                    )
                })
                .transpose()?
                .unwrap_or(false);
        let wording = if action.is_natural_contact() {
            &policy.preparing_strike
        } else {
            &policy.aiming
        };
        let event_storage = budget.reserve(
            1024 + 3 * (source_id.len() + target_id.len())
                + 2 * action.id.len()
                + 2 * observer.actor_id.len()
                + 2 * wording.len()
                + if witness_help {
                    map_storage::<String, EventScalar>(7).ok_or(ExecutionError::Capacity)?
                        + "witnessHelpwarn-observed-target".len()
                } else {
                    0
                },
        )?;
        let action_id = action.id.clone();
        let mut data = IndexMap::with_capacity(6 + usize::from(witness_help));
        data.extend([
            (
                "actionId".into(),
                EventScalar::Text(action_id.clone().into()),
            ),
            ("sourceLife".into(), EventScalar::Number(source_life as f64)),
            ("targetLife".into(), EventScalar::Number(target_life as f64)),
            ("semanticTrigger".into(), EventScalar::Boolean(true)),
            (
                "importance".into(),
                EventScalar::Number(combat.impact_attention.importance),
            ),
            (
                "urgency".into(),
                EventScalar::Number(combat.impact_attention.urgency),
            ),
        ]);
        if witness_help {
            data.insert(
                "witnessHelp".into(),
                EventScalar::Text("warn-observed-target".into()),
            );
        }
        let event = EventEmissionIntent {
            event_type: ATTACK_CUE_EVENT.to_owned(),
            text: EmissionText::Narration(preparation_narration(
                source_id,
                target_id,
                wording,
            )),
            audience: AudienceSelection::Explicit(vec![observer.actor_id.clone()]),
            origin: None,
            source_id: Some(source_id.clone()),
            target_id: Some(target_id.to_owned()),
            scope: EventScope::Private,
            exposure: None,
            data: Some(data),
        };
        let source = state
            .entities
            .handle(source_id)
            .ok_or(ExecutionError::MissingActor)?;
        return Ok(Some(AttackAcquisition::NewCue(PreparedAttackCue {
            source,
            action: action_id,
            observer: observer.actor_id.clone(),
            receipts,
            receipt_storage: storage,
            event,
            storage: event_storage,
        })));
    }
    Ok(None)
}

/// The event cursor accepts the newly granted private scope only with the exact
/// working action receipt; other event producers cannot use this as authority.
pub(crate) fn current_attack_cue(core: &CoreMutation<'_>, event: &WorldEvent) -> bool {
    if event.scope != Some(EventScope::Private) || event.event_type != ATTACK_CUE_EVENT {
        return false;
    }
    let [observer] = event.audience.as_slice() else {
        return false;
    };
    let state = &core.state.physical;
    let Some(source) = event
        .actor_id
        .as_deref()
        .and_then(|id| state.entities.get(id))
    else {
        return false;
    };
    let Some(action) = observed_preparation(source) else {
        return false;
    };
    let receipt = action
        .attack_observers
        .as_ref()
        .and_then(|receipts| receipts.get(observer));
    let field = |key| event.data.as_ref().and_then(|data| data.get(key));
    let cause_matches = matches!(field("actionId"),
        Some(EventScalar::Text(value)) if value.as_unicode() == Some(action.id.as_str()));
    let binds_life = |key, life: Option<u64>| matches!((field(key), life), (Some(EventScalar::Number(value)), Some(life)) if *value == life as f64);
    let exposed = core
        .state
        .reception
        .visible_people
        .as_ref()
        .and_then(|people| people.get(observer));
    cause_matches
        && action.target_id == event.target_id
        && binds_life("sourceLife", source.physical_life())
        && binds_life("targetLife", action.target_life)
        && exposed.is_some_and(|people| {
            people.iter().any(|id| id == &source.id)
                && event
                    .target_id
                    .as_ref()
                    .is_some_and(|target| target == observer || people.contains(target))
        })
        && receipt.is_some_and(|receipt| {
            state.entities.get(observer).and_then(Entity::physical_life) == Some(receipt.life)
                && receipt.occurrence_id == event.id
        })
}
