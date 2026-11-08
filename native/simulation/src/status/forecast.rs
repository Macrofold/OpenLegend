//! Forecast the existing finite status language without making a new clock or
//! mutating a meter. Compound predicates bound when truth can change; a false
//! permanent AND child (or true permanent OR child) suppresses irrelevant cuts.
//! docs/simulation-time.md#native-interval-contract
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::work::WorkMeters;
use std::{mem::size_of, sync::Arc};

pub(crate) struct AttributeRates<'a> {
    values: IndexMap<&'a str, IndexMap<&'a str, f64>>,
    _reservation: ByteReservation,
}
impl<'a> AttributeRates<'a> {
    pub(crate) fn capture(
        intervals: &'a [Arc<StatusRateInterval>],
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let count = intervals.iter().try_fold(0usize, |n, interval| {
            n.checked_add(interval.rates.len())
                .ok_or(ExecutionError::Capacity)
        })?;
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                map_storage::<&str, IndexMap<&str, f64>>(count).ok_or(ExecutionError::Capacity)?,
                // Every distinct target could own a singleton table. Account for
                // those actual table headers and buckets before constructing them.
                count
                    .checked_mul(map_storage::<&str, f64>(1).ok_or(ExecutionError::Capacity)?)
                    .ok_or(ExecutionError::Capacity)?,
                map_storage::<&str, f64>(count).ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut values: IndexMap<&str, IndexMap<&str, f64>> = IndexMap::with_capacity(count);
        for interval in intervals {
            for rate in &interval.rates {
                *values
                    .entry(&rate.target_id)
                    .or_default()
                    .entry(&rate.attribute)
                    .or_default() += rate.rate;
            }
        }
        Ok(Self {
            values,
            _reservation: reservation,
        })
    }
    pub(crate) fn get(&self, entity: &str, attribute: &str) -> f64 {
        self.values
            .get(entity)
            .and_then(|values| values.get(attribute))
            .copied()
            .unwrap_or(0.0)
    }
}

pub(crate) fn until_threshold(value: f64, rate: f64, threshold: f64, epsilon: f64) -> f64 {
    if rate == 0.0 {
        return f64::INFINITY;
    }
    let time = (threshold - value) / rate;
    if time >= 0.0 {
        epsilon
            .max(time)
            .max(2.0 * value.abs() * f64::EPSILON / rate.abs())
    } else {
        f64::INFINITY
    }
}

/// `seconds` also includes arithmetic/strict-side cuts; `ends_at` identifies
/// only stored absolute clocks, on which the caller must land exactly.
#[derive(Debug, PartialEq)]
pub(crate) struct StatusDeadline {
    pub seconds: f64,
    pub ends_at: Option<f64>,
}
impl StatusDeadline {
    fn new() -> Self {
        Self {
            seconds: f64::INFINITY,
            ends_at: None,
        }
    }
    fn at(&mut self, now: f64, at: f64) {
        self.seconds = self.seconds.min(at - now);
        self.ends_at = Some(self.ends_at.map_or(at, |before| before.min(at)));
    }
}
struct Transition {
    matches: bool,
    after: f64,
}

fn compound<'a>(
    read: &StatusRead<'_>,
    bindings: EffectBindings<'_>,
    conjunction: bool,
    children: impl Iterator<Item = &'a StatusCondition>,
    rates: &AttributeRates<'_>,
    epsilon: f64,
    meters: &mut WorkMeters,
) -> Result<Transition, ExecutionError> {
    let mut earliest = f64::INFINITY;
    let mut blocking: f64 = 0.0;
    let mut has_blocking = false;
    for child in children {
        let transition = condition_transition(read, bindings, child, rates, epsilon, meters)?;
        earliest = earliest.min(transition.after);
        if transition.matches != conjunction {
            if transition.after == f64::INFINITY {
                return Ok(Transition {
                    matches: !conjunction,
                    after: f64::INFINITY,
                });
            }
            has_blocking = true;
            blocking = blocking.max(transition.after);
        }
    }
    Ok(Transition {
        matches: conjunction != has_blocking,
        after: if has_blocking { blocking } else { earliest },
    })
}
fn condition_transition(
    read: &StatusRead<'_>,
    bindings: EffectBindings<'_>,
    condition: &StatusCondition,
    rates: &AttributeRates<'_>,
    epsilon: f64,
    meters: &mut WorkMeters,
) -> Result<Transition, ExecutionError> {
    match condition {
        StatusCondition::All { all } => {
            return compound(read, bindings, true, all.iter(), rates, epsilon, meters);
        }
        StatusCondition::Any { any } => {
            return compound(read, bindings, false, any.iter(), rates, epsilon, meters);
        }
        _ => {}
    }
    let matches = read.evaluate_metered(bindings, condition, meters)?.matches;
    let after = match condition {
        StatusCondition::Daily { daily_window } => {
            let hour = read.local_hour();
            let edge = |at: f64| {
                let gap = at - hour;
                let seconds = (if gap < 0.0 { gap + 24.0 } else { gap }) * 3600.0;
                if seconds <= 0.0 {
                    86400.0
                } else {
                    epsilon.max(seconds)
                }
            };
            edge(daily_window.start).min(edge(daily_window.end))
        }
        StatusCondition::Compare { compare } => {
            let target = bindings.target(compare.target);
            let Some(AttributeValue::Number(value)) = read.value(target, &compare.attribute)?
            else {
                return Ok(Transition {
                    matches,
                    after: f64::INFINITY,
                });
            };
            let rate = rates.get(target, &compare.attribute);
            let range = read
                .attributes
                .get(&compare.attribute)
                .and_then(|definition| attribute_range(read.entities.get(target), definition));
            let saturated = range.is_some_and(|(min, max)| {
                (value <= min && rate < 0.0) || (value >= max && rate > 0.0)
            });
            if rate == 0.0 || saturated {
                f64::INFINITY
            } else {
                let threshold = read.comparison_value(bindings, compare);
                if value == threshold {
                    let after = match compare.operator {
                        Comparison::Equal => false,
                        Comparison::NotEqual => true,
                        Comparison::GreaterThanOrEqual => rate > 0.0,
                        Comparison::LessThan | Comparison::LessThanOrEqual => rate < 0.0,
                    };
                    if matches == after {
                        f64::INFINITY
                    } else {
                        epsilon.max(2.0 * value.abs() * f64::EPSILON / rate.abs())
                    }
                } else {
                    until_threshold(value, rate, threshold, epsilon)
                }
            }
        }
        _ => f64::INFINITY,
    };
    Ok(Transition { matches, after })
}

pub(crate) fn status_deadline(
    read: &StatusRead<'_>,
    entity_id: &str,
    rates: &AttributeRates<'_>,
    epsilon: f64,
    meters: &mut WorkMeters,
) -> Result<StatusDeadline, ExecutionError> {
    let mut result = StatusDeadline::new();
    let Some(entity) = read.entities.get(entity_id) else {
        return Ok(result);
    };
    let states = entity.status_effects.as_ref();
    if states.is_some_and(|states| {
        states
            .values()
            .any(|state| state.active && state.contribution.is_some())
    }) {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if !entity.actively_participates() {
        return Ok(result);
    }
    for definition in &read.policy.definitions {
        let state = states.and_then(|states| states.get(&definition.id));
        let Some(state) = state.filter(|state| state.active) else {
            let Some(automatic) = definition
                .automatic_activation
                .as_ref()
                .filter(|_| definition.enabled)
            else {
                continue;
            };
            if let Some(at) = state
                .map(|state| state.automatic_after)
                .filter(|at| *at > read.sim_time)
            {
                result.at(read.sim_time, at);
                continue;
            }
            let conditions = std::iter::once(&definition.requires)
                .chain(definition.activation_condition.iter())
                .chain(std::iter::once(automatic));
            let transition = compound(
                read,
                EffectBindings::for_status(entity_id, None),
                true,
                conditions,
                rates,
                epsilon,
                meters,
            )?;
            result.seconds = result.seconds.min(transition.after);
            continue;
        };
        let bindings = EffectBindings::for_status(entity_id, Some(state));
        for operation in &definition.while_active {
            let StatusOperation::Every { change_every, when } = operation else {
                continue;
            };
            if let Some(when) = when {
                if !read.evaluate_metered(bindings, when, meters)?.matches {
                    continue;
                }
            }
            let elapsed = read.window.map_or(state.elapsed_seconds, |window| {
                window.current_status_elapsed(state)
            });
            let after = (((elapsed + epsilon) / change_every.every_game_seconds).floor() + 1.0)
                * change_every.every_game_seconds
                - elapsed;
            result.at(read.sim_time, read.sim_time + after);
        }
        for condition in std::iter::once(&definition.requires)
            .chain(definition.automatic_deactivation.iter())
            .chain(
                definition
                    .while_active
                    .iter()
                    .filter_map(StatusOperation::condition),
            )
        {
            result.seconds = result.seconds.min(
                condition_transition(read, bindings, condition, rates, epsilon, meters)?.after,
            );
        }
    }
    Ok(result)
}

/// The retained-status owner converts relative predicate bounds to the same
/// absolute clock used by its ordinary cold forecast. Preserve that rounding;
/// independently adding the duration again can miss an exact stored deadline.
pub(crate) fn current_status_deadline(
    read: &StatusRead<'_>,
    entity_id: &str,
    rates: &AttributeRates<'_>,
    epsilon: f64,
    meters: &mut WorkMeters,
) -> Result<f64, ExecutionError> {
    let result = status_deadline(read, entity_id, rates, epsilon, meters)?;
    let absolute = result
        .ends_at
        .filter(|at| *at > read.sim_time)
        .unwrap_or(f64::INFINITY);
    Ok(absolute.min(read.sim_time + epsilon.max(result.seconds)))
}

/// Numeric range/concern boundaries use the entity's health units. Condition
/// band edges are separate native participant bounds, just as in Source.
pub(crate) fn attribute_boundary(
    read: &StatusRead<'_>,
    rates: &AttributeRates<'_>,
    epsilon: f64,
) -> Result<f64, ExecutionError> {
    let mut result = f64::INFINITY;
    for (id, values) in &rates.values {
        let Some(entity) = read.entities.get(id) else {
            continue;
        };
        // Installed definition order is semantically stable; floating sums were
        // already accumulated in actual interval/operation order at capture.
        for (attribute, rate) in values {
            if *rate == 0.0 {
                continue;
            }
            let Some(definition) = read.attributes.get(attribute) else {
                continue;
            };
            let Some((min, max)) = attribute_range(Some(entity), definition) else {
                continue;
            };
            let Some(AttributeValue::Number(value)) = read.value(id, attribute)? else {
                continue;
            };
            let mut bound = |threshold: f64| {
                if !(value == threshold
                    && ((threshold == min && *rate < 0.0) || (threshold == max && *rate > 0.0)))
                {
                    result = result.min(until_threshold(value, *rate, threshold, epsilon));
                }
            };
            bound(min);
            bound(max);
            if let Some(concern) = &definition.concern {
                let below = if concern.unit.as_deref() == Some("fractionOfRange") {
                    min + concern.below * (max - min)
                } else {
                    concern.below
                };
                bound(below);
                if concern.mode == "latched" {
                    bound(
                        max.min(below + concern.recovery_margin.ok_or(ValueError::InvalidMeaning)?),
                    );
                }
            }
        }
    }
    Ok(result)
}
