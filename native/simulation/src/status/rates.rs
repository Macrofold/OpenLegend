//! Capture the current ordered rate selections without settling any value.
//! Immutable definitions stay in InstalledWorld; captures contain only the
//! selected bindings and own their actual retained-allocation allowance.

use super::*;
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, ByteReservation};
use crate::state::EntityStore;
use std::{mem::size_of, sync::Arc};

#[derive(Debug, PartialEq)]
pub(crate) struct CapturedRate {
    pub target_id: String,
    pub attribute: String,
    pub rate: f64,
}
#[derive(Debug, PartialEq)]
pub(crate) struct CapturedPeriodic {
    pub target_id: String,
    pub attribute: String,
    pub amount: f64,
    pub every_game_seconds: f64,
    pub unit: String,
}
pub(crate) struct StatusRateInterval {
    pub entity_id: String,
    pub episode: String,
    pub definition: usize,
    pub rates: Vec<CapturedRate>,
    pub periodic: Vec<CapturedPeriodic>,
    _reservation: ByteReservation,
}
pub(crate) struct StatusRateCapture {
    pub intervals: Vec<Arc<StatusRateInterval>>,
    _reservation: ByteReservation,
}
fn numeric_target<'a>(
    read: &StatusRead<'_>,
    bindings: EffectBindings<'a>,
    reference: EntityReference,
    attribute: &str,
) -> Result<Option<&'a str>, ExecutionError> {
    let target = bindings.target(reference);
    Ok(matches!(
        read.value(target, attribute)?,
        Some(AttributeValue::Number(_))
    )
    .then_some(target))
}
fn attribute_scratch(entities: &EntityStore, entity: &str, attribute: &str) -> usize {
    entities
        .get(entity)
        .and_then(|entity| {
            entity
                .actor
                .as_ref()
                .and_then(|actor| actor.attributes.as_ref())
                .or(entity.attributes.as_ref())
        })
        .and_then(|attributes| attributes.get(attribute))
        .map_or(0, |value| match &value.value {
            AttributeValue::Category(value) => value.len(),
            _ => 0,
        })
}
pub(crate) fn status_condition_scratch(
    entities: &EntityStore,
    bindings: EffectBindings<'_>,
    condition: &StatusCondition,
) -> usize {
    match condition {
        StatusCondition::All { all } | StatusCondition::Any { any: all } => all
            .iter()
            .map(|condition| status_condition_scratch(entities, bindings, condition))
            .max()
            .unwrap_or(0),
        StatusCondition::Compare { compare } => attribute_scratch(
            entities,
            bindings.target(compare.target),
            &compare.attribute,
        ),
        StatusCondition::Has { has_attribute } => attribute_scratch(
            entities,
            bindings.target(has_attribute.target),
            &has_attribute.attribute,
        ),
        StatusCondition::Field { field } => {
            entities
                .get(bindings.target(field.target))
                .map_or(0, |entity| match field.name.as_str() {
                    "controller" => entity
                        .actor
                        .as_ref()
                        .map_or(0, |actor| actor.controller.len()),
                    "kind" => entity.kind.len(),
                    _ => 0,
                })
        }
        _ => 0,
    }
}
pub(crate) fn prepare_status_rates(
    read: &StatusRead<'_>,
    entity_id: &str,
    previous: Option<&StatusRateCapture>,
    budget: &ByteBudget,
    meters: &mut crate::work::WorkMeters,
) -> Result<StatusRateCapture, ExecutionError> {
    let entity = read
        .entities
        .get(entity_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let mut reservation = budget.reserve(size_of::<StatusRateCapture>())?;
    let mut result = Vec::new();
    if !entity.actively_participates() {
        return Ok(StatusRateCapture {
            intervals: result,
            _reservation: reservation,
        });
    }
    for (index, definition) in read.policy.definitions.iter().enumerate() {
        let Some(state) = entity
            .status_effects
            .as_ref()
            .and_then(|states| states.get(&definition.id))
            .filter(|state| state.active)
        else {
            continue;
        };
        if state.contribution.is_some() || definition.contribution.is_some() {
            return Err(ExecutionError::UnsupportedFamily);
        }
        let bindings = EffectBindings::for_status(entity_id, Some(state));
        let mut bytes = size_of::<StatusRateInterval>()
            .checked_add(2 * size_of::<usize>())
            .and_then(|n| n.checked_add(entity_id.len()))
            .and_then(|n| n.checked_add(state.episode.len()))
            .ok_or(ExecutionError::Capacity)?;
        let mut rate_count = 0usize;
        let mut periodic_count = 0usize;
        let mut scratch = 0usize;
        // Reserve each possible selected operation before evaluating/allocating
        // its result. The finite family definition already owns validation.
        for operation in &definition.while_active {
            let (target, attribute, unit, entry, when) = match operation {
                StatusOperation::Rate { change_rate, when } => {
                    rate_count += 1;
                    (
                        bindings.target(change_rate.target),
                        change_rate.attribute.as_str(),
                        None,
                        size_of::<CapturedRate>(),
                        when,
                    )
                }
                StatusOperation::Every { change_every, when } => {
                    periodic_count += 1;
                    (
                        bindings.target(change_every.target),
                        change_every.attribute.as_str(),
                        Some(change_every.unit.as_str()),
                        size_of::<CapturedPeriodic>(),
                        when,
                    )
                }
                StatusOperation::Restrict { .. } => continue,
            };
            bytes = bytes
                .checked_add(entry)
                .and_then(|n| n.checked_add(target.len()))
                .and_then(|n| n.checked_add(attribute.len()))
                .and_then(|n| n.checked_add(unit.map_or(0, str::len)))
                .ok_or(ExecutionError::Capacity)?;
            scratch = scratch.max(attribute_scratch(read.entities, target, attribute));
            if let Some(when) = when {
                scratch = scratch.max(status_condition_scratch(read.entities, bindings, when));
            }
        }
        // Predicate evaluation holds at most one copied categorical/field
        // value at once. Read only its actual referenced keys, never all meters.
        let held = budget.reserve(bytes.checked_add(scratch).ok_or(ExecutionError::Capacity)?)?;
        let mut rates = Vec::with_capacity(rate_count);
        let mut periodic = Vec::with_capacity(periodic_count);
        for operation in &definition.while_active {
            match operation {
                StatusOperation::Rate { change_rate, when } => {
                    if let Some(when) = when {
                        if !read.evaluate_metered(bindings, when, meters)?.matches {
                            continue;
                        }
                    }
                    if let Some(target) =
                        numeric_target(read, bindings, change_rate.target, &change_rate.attribute)?
                    {
                        rates.push(CapturedRate {
                            target_id: target.to_owned(),
                            attribute: change_rate.attribute.clone(),
                            rate: change_rate.amount,
                        });
                    }
                }
                StatusOperation::Every { change_every, when } => {
                    if let Some(when) = when {
                        if !read.evaluate_metered(bindings, when, meters)?.matches {
                            continue;
                        }
                    }
                    if let Some(target) = numeric_target(
                        read,
                        bindings,
                        change_every.target,
                        &change_every.attribute,
                    )? {
                        periodic.push(CapturedPeriodic {
                            target_id: target.to_owned(),
                            attribute: change_every.attribute.clone(),
                            amount: change_every.amount,
                            every_game_seconds: change_every.every_game_seconds,
                            unit: change_every.unit.clone(),
                        });
                    }
                }
                StatusOperation::Restrict { .. } => {}
            }
        }
        if result.len() == result.capacity() {
            let array = result
                .capacity()
                .checked_mul(2)
                .and_then(|n| n.checked_add(4))
                .and_then(|n| n.checked_mul(size_of::<Arc<StatusRateInterval>>()))
                .ok_or(ExecutionError::Capacity)?;
            reservation.resize(
                reservation
                    .bytes()
                    .checked_add(array)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            result
                .try_reserve(1)
                .map_err(|_| ExecutionError::Capacity)?;
        }
        if let Some(prior) = previous.and_then(|previous| previous.intervals.get(result.len())) {
            if prior.entity_id == entity_id
                && prior.episode == state.episode
                && prior.definition == index
                && prior.rates == rates
                && prior.periodic == periodic
            {
                result.push(prior.clone());
                continue;
            }
        }
        result.push(Arc::new(StatusRateInterval {
            entity_id: entity_id.to_owned(),
            episode: state.episode.clone(),
            definition: index,
            rates,
            periodic,
            _reservation: held,
        }));
    }
    Ok(StatusRateCapture {
        intervals: result,
        _reservation: reservation,
    })
}
