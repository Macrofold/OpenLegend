//! Captured rate accounting precedes every body consequence. Same-sign ordinary
//! rates preserve serial clamps; opposite flows and health use Source net sums.
use super::*;
use crate::conditions::{ConditionReconcileCursor, ConditionReconcileStep};
use crate::events::CompletedOccurrence;
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::host::retained_size::{heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::values::{NativeValueAttribute, RetainedBinding};
use crate::work::{WorkDemand, WorkUnit};
use indexmap::IndexSet;
use std::{mem::size_of, sync::Arc};

pub(crate) struct BodyPeriodicChange {
    pub amount: f64,
    pub cause: String,
    pub cause_label: String,
    pub cause_meaning: Option<String>,
}
pub(crate) struct BodyRate {
    pub target_id: String,
    pub attribute: String,
    pub amount: f64,
    pub causes: Vec<String>,
    pub periodic: Vec<BodyPeriodicChange>,
}
pub(crate) struct BodyRates {
    rates: Vec<BodyRate>,
    by_target: IndexMap<String, usize>,
    reservation: ByteReservation,
}
impl BodyRates {
    fn new(maximum: usize, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        let reservation = budget.reserve(
            heap_sum([
                size_of::<Self>(),
                maximum
                    .checked_mul(size_of::<BodyRate>())
                    .ok_or(ExecutionError::Capacity)?,
                map_storage::<String, usize>(maximum).ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Self {
            rates: Vec::with_capacity(maximum),
            by_target: IndexMap::with_capacity(maximum),
            reservation,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn net(&mut self, flow: Flow, seconds: f64) -> Result<(), ExecutionError> {
        self.reserve(
            heap_sum([
                flow.target
                    .len()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
                flow.attribute.len(),
                flow.causes
                    .len()
                    .checked_mul(2 * size_of::<String>())
                    .ok_or(ExecutionError::Capacity)?,
                flow.causes.iter().map(String::len).sum(),
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut causes = Vec::with_capacity(flow.causes.len());
        causes.extend(flow.causes);
        causes.sort_by(|a, b| crate::encoding::js_string_cmp(a, b));
        self.by_target.insert(flow.target.clone(), self.rates.len());
        self.rates.push(BodyRate {
            target_id: flow.target,
            attribute: flow.attribute,
            amount: flow.rate * seconds,
            causes,
            periodic: Vec::new(),
        });
        Ok(())
    }
    fn periodic(
        &mut self,
        target: &str,
        attribute: &str,
        amount: f64,
        definition: &StatusDefinition,
    ) -> Result<(), ExecutionError> {
        let cause = definition
            .lifecycle_cause
            .as_deref()
            .unwrap_or(&definition.id);
        let bytes = heap_sum([
            target
                .len()
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?,
            attribute.len(),
            cause.len(),
            definition.label.len(),
            definition.meaning.as_ref().map_or(0, String::len),
            2 * size_of::<BodyPeriodicChange>(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        self.reserve(bytes)?;
        let index = if let Some(index) = self.by_target.get(target) {
            *index
        } else {
            let index = self.rates.len();
            if index == self.rates.capacity() {
                return Err(ExecutionError::Invariant);
            }
            self.by_target.insert(target.into(), index);
            self.rates.push(BodyRate {
                target_id: target.into(),
                attribute: attribute.into(),
                amount: 0.0,
                causes: Vec::new(),
                periodic: Vec::new(),
            });
            index
        };
        let list = &self.rates[index].periodic;
        if list.len() == list.capacity() {
            let capacity = list
                .capacity()
                .checked_mul(2)
                .map(|n| n.max(4))
                .ok_or(ExecutionError::Capacity)?;
            self.reserve(
                capacity
                    .checked_mul(size_of::<BodyPeriodicChange>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let list = &mut self.rates[index].periodic;
            list.try_reserve_exact(capacity - list.len())
                .map_err(|_| ExecutionError::Capacity)?;
        }
        self.rates[index].periodic.push(BodyPeriodicChange {
            amount,
            cause: cause.into(),
            cause_label: definition.label.clone(),
            cause_meaning: definition.meaning.clone(),
        });
        Ok(())
    }
    pub(crate) fn for_target(&self, target: &str) -> Option<&BodyRate> {
        self.by_target
            .get(target)
            .and_then(|index| self.rates.get(*index))
    }
    pub(crate) fn index_for_target(&self, target: &str) -> Option<usize> {
        self.by_target.get(target).copied()
    }
    pub(crate) fn get(&self, index: usize) -> Option<&BodyRate> {
        self.rates.get(index)
    }
    pub(crate) fn iter(&self) -> impl Iterator<Item = &BodyRate> {
        self.rates.iter()
    }
}
#[derive(Hash)]
struct RateKey<'a>(&'a str, &'a str);
impl indexmap::Equivalent<(String, String)> for RateKey<'_> {
    fn equivalent(&self, key: &(String, String)) -> bool {
        self.0 == key.0 && self.1 == key.1
    }
}
struct Flow {
    target: String,
    attribute: String,
    rate: f64,
    signs: u8,
    health: bool,
    causes: IndexSet<String>,
}
impl Flow {
    fn netted(&self) -> bool {
        self.health || self.signs == 3
    }
}
struct Due {
    interval: usize,
    change: usize,
    count: u64,
}
#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Account,
    Serial,
    Net,
    Periodic,
    Done,
}
pub(crate) enum StatusIntegrationStep {
    Occurrence(StagedOccurrence),
    Complete(BodyRates),
}
pub(crate) struct StatusIntegrationCursor {
    active: Vec<Arc<StatusRateInterval>>,
    serial: Vec<(usize, usize)>,
    net: Vec<Option<Flow>>,
    retained: IndexSet<String>,
    retained_rates: IndexSet<(String, String)>,
    due: Vec<Due>,
    phase: Phase,
    next: usize,
    occurrence: u64,
    seconds: f64,
    conditions: Option<ConditionReconcileCursor>,
    body: Option<BodyRates>,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
fn requirements(definition: &StatusDefinition) -> (bool, bool, bool) {
    let mut source = false;
    let mut target = false;
    let mut reference = |value| match value {
        EntityReference::Source => source = true,
        EntityReference::ActionTarget => target = true,
        EntityReference::Subject => {}
    };
    for condition in std::iter::once(&definition.requires)
        .chain(definition.activation_condition.iter())
        .chain(definition.automatic_activation.iter())
        .chain(definition.automatic_deactivation.iter())
        .chain(
            definition
                .while_active
                .iter()
                .filter_map(StatusOperation::condition),
        )
    {
        condition.visit_references(&mut reference);
    }
    let mut linear = true;
    for operation in &definition.while_active {
        match operation {
            StatusOperation::Rate { change_rate, .. } => reference(change_rate.target),
            StatusOperation::Restrict { .. } => {}
            StatusOperation::Every { .. } => linear = false,
        }
    }
    (linear, source, target)
}
impl StatusIntegrationCursor {
    pub(crate) fn new(
        core: &mut CoreMutation<'_>,
        intervals: &[Arc<StatusRateInterval>],
        seconds: f64,
        retain_values: bool,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if !seconds.is_finite() || seconds <= 0.0 {
            return Err(ExecutionError::Invariant);
        }
        let installed = core.state.installed.clone();
        let mut rate_count = 0usize;
        let mut periodic_count = 0usize;
        let mut bytes = size_of::<Self>() + intervals.len() * size_of::<Arc<StatusRateInterval>>();
        for interval in intervals {
            rate_count = rate_count
                .checked_add(interval.rates.len())
                .ok_or(ExecutionError::Capacity)?;
            periodic_count = periodic_count
                .checked_add(interval.periodic.len())
                .ok_or(ExecutionError::Capacity)?;
            bytes = heap_sum([
                bytes,
                size_of::<RetainedBinding>(),
                interval
                    .entity_id
                    .len()
                    .checked_mul(4)
                    .ok_or(ExecutionError::Capacity)?,
                interval
                    .episode
                    .len()
                    .checked_mul(3)
                    .ok_or(ExecutionError::Capacity)?,
                map_storage::<String, NativeValueAttribute>(interval.rates.len())
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?;
            let definition = installed
                .status_policy
                .definitions
                .get(interval.definition)
                .ok_or(ExecutionError::Invariant)?;
            for rate in &interval.rates {
                let attribute = installed
                    .attributes
                    .get(&rate.attribute)
                    .ok_or(ValueError::MissingAttribute)?
                    .value();
                let thresholds = 2
                    + usize::from(attribute.concern.is_some()) * 2
                    + attribute
                        .condition
                        .as_ref()
                        .map_or(0, |policy| policy.bands.len() * 2);
                bytes = heap_sum([
                    bytes,
                    rate.target_id
                        .len()
                        .checked_mul(10)
                        .ok_or(ExecutionError::Capacity)?,
                    rate.attribute
                        .len()
                        .checked_mul(10)
                        .ok_or(ExecutionError::Capacity)?,
                    definition
                        .lifecycle_cause
                        .as_ref()
                        .map_or(definition.id.len(), String::len),
                    4 * size_of::<f64>(),
                    map_storage::<String, ()>(1).ok_or(ExecutionError::Capacity)?,
                    thresholds
                        .checked_mul(2 * size_of::<f64>())
                        .ok_or(ExecutionError::Capacity)?,
                ])
                .ok_or(ExecutionError::Capacity)?;
            }
        }
        bytes = heap_sum([
            bytes,
            map_storage::<(&str, &str), Flow>(rate_count).ok_or(ExecutionError::Capacity)?,
            map_storage::<(&str, &str), Option<usize>>(rate_count + periodic_count)
                .ok_or(ExecutionError::Capacity)?,
            map_storage::<(String, String), ()>(rate_count).ok_or(ExecutionError::Capacity)?,
            rate_count
                .checked_mul(size_of::<(usize, usize)>() + size_of::<Option<Flow>>())
                .ok_or(ExecutionError::Capacity)?,
            periodic_count
                .checked_mul(size_of::<Due>())
                .ok_or(ExecutionError::Capacity)?,
            intervals.len() * size_of::<RetainedBinding>(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let body = BodyRates::new(rate_count + periodic_count, budget)?;
        let mut active = Vec::with_capacity(intervals.len());
        for interval in intervals {
            let definition = installed
                .status_policy
                .definitions
                .get(interval.definition)
                .ok_or(ExecutionError::Invariant)?;
            if core
                .state
                .physical
                .entities
                .get(&interval.entity_id)
                .and_then(|entity| entity.status_effects.as_ref())
                .and_then(|states| states.get(&definition.id))
                .is_some_and(|state| state.active && state.episode == interval.episode)
            {
                active.push(interval.clone());
            }
        }
        let mut flows: IndexMap<(&str, &str), Flow> = IndexMap::with_capacity(rate_count);
        let mut writers: IndexMap<(&str, &str), Option<usize>> =
            IndexMap::with_capacity(rate_count + periodic_count);
        for (index, interval) in active.iter().enumerate() {
            let definition = &installed.status_policy.definitions[interval.definition];
            let cause = definition
                .lifecycle_cause
                .as_deref()
                .unwrap_or(&definition.id);
            for rate in &interval.rates {
                let key = (rate.target_id.as_str(), rate.attribute.as_str());
                let health = installed
                    .attributes
                    .get(&rate.attribute)
                    .ok_or(ValueError::MissingAttribute)?
                    .value()
                    .implementation
                    == "native-health-v1";
                let flow = flows.entry(key).or_insert_with(|| Flow {
                    target: rate.target_id.clone(),
                    attribute: rate.attribute.clone(),
                    rate: 0.0,
                    signs: 0,
                    health,
                    causes: IndexSet::new(),
                });
                flow.rate += rate.rate;
                if rate.rate > 0.0 {
                    flow.signs |= 1
                } else if rate.rate < 0.0 {
                    flow.signs |= 2
                };
                if health && rate.rate != 0.0 {
                    flow.causes.insert(cause.into());
                }
                match writers.get_mut(&key) {
                    Some(owner) if *owner != Some(index) => *owner = None,
                    None => {
                        writers.insert(key, Some(index));
                    }
                    _ => {}
                }
            }
            for change in &interval.periodic {
                if installed
                    .attributes
                    .get(&change.attribute)
                    .ok_or(ValueError::MissingAttribute)?
                    .value()
                    .implementation
                    != "native-health-v1"
                {
                    return Err(ExecutionError::UnsupportedFamily);
                }
                writers.insert((change.target_id.as_str(), change.attribute.as_str()), None);
            }
        }
        let mut incoming = Vec::with_capacity(active.len());
        let mut retained_rates = IndexSet::with_capacity(rate_count);
        if retain_values {
            for (index, interval) in active.iter().enumerate() {
                let definition = &installed.status_policy.definitions[interval.definition];
                let (linear, source_required, target_required) = requirements(definition);
                if !linear || !interval.periodic.is_empty() || interval.rates.is_empty() {
                    continue;
                }
                let entity = core
                    .state
                    .physical
                    .entities
                    .get(&interval.entity_id)
                    .ok_or(ExecutionError::MissingEntity)?;
                let Some(actor) = &entity.actor else { continue };
                let state = entity
                    .status_effects
                    .as_ref()
                    .and_then(|states| states.get(&definition.id))
                    .ok_or(ValueError::MissingStatus)?;
                let Some(work) = core.state.physical.work.invocation(&interval.episode) else {
                    continue;
                };
                if state.contribution.is_some()
                    || source_required && state.source_id != entity.id
                    || target_required && state.action_target_id != entity.id
                    || work.recurrence.is_none()
                    || work.parent_id.is_some()
                    || work.children != 0
                    || work.root_id != work.id
                {
                    continue;
                }
                let mut attributes: IndexMap<String, NativeValueAttribute> =
                    IndexMap::with_capacity(interval.rates.len());
                let mut eligible = true;
                for rate in &interval.rates {
                    let key = (rate.target_id.as_str(), rate.attribute.as_str());
                    if rate.target_id != interval.entity_id
                        || writers.get(&key) != Some(&Some(index))
                        || flows.get(&key).is_some_and(Flow::netted)
                    {
                        eligible = false;
                        break;
                    }
                    let attribute = installed
                        .attributes
                        .get(&rate.attribute)
                        .ok_or(ValueError::MissingAttribute)?
                        .value();
                    let AttributeSchema::Number { min, max, .. } = attribute.schema else {
                        eligible = false;
                        break;
                    };
                    if attribute.implementation != "number-v1" || attribute.reservoir.is_some() {
                        eligible = false;
                        break;
                    }
                    attributes
                        .entry(rate.attribute.clone())
                        .or_insert_with(|| NativeValueAttribute {
                            rates: Vec::new(),
                            min,
                            max,
                            changed: true,
                        })
                        .rates
                        .push(rate.rate);
                }
                if !eligible {
                    continue;
                }
                for (id, attribute) in &mut attributes {
                    let definition = installed
                        .attributes
                        .get(id)
                        .ok_or(ValueError::MissingAttribute)?
                        .value();
                    let Some(AttributeValue::Number(mut value)) = read_attribute(
                        entity,
                        definition,
                        core.state.physical.pending_values.as_ref(),
                    )?
                    else {
                        eligible = false;
                        break;
                    };
                    if definition.condition.is_some() {
                        let condition = actor
                            .conditions
                            .as_ref()
                            .and_then(|conditions| conditions.get(id));
                        if condition.is_none_or(|condition| {
                            condition.version != definition.version
                                || condition.pending
                                || condition
                                    .next_review_at
                                    .is_some_and(|at| at <= core.state.physical.header.sim_time)
                        }) {
                            eligible = false;
                            break;
                        }
                    }
                    let thresholds = arithmetic_thresholds(definition)?;
                    let mut changed = false;
                    for rate in &attribute.rates {
                        let next = crate::values::js_max(
                            attribute.min,
                            crate::values::js_min(attribute.max, value + rate * seconds),
                        );
                        if next != value
                            && thresholds.iter().any(|threshold| {
                                value.min(next) <= *threshold && value.max(next) >= *threshold
                            })
                        {
                            eligible = false;
                            break;
                        }
                        changed |= next != value;
                        value = next;
                    }
                    if !eligible {
                        break;
                    }
                    attribute.changed = changed;
                }
                if eligible {
                    for id in attributes.keys() {
                        retained_rates.insert((entity.id.clone(), id.clone()));
                    }
                    incoming.push(RetainedBinding {
                        entity_id: entity.id.clone(),
                        status_id: definition.id.clone(),
                        episode: interval.episode.clone(),
                        attributes,
                        demand: status_work(definition),
                    });
                }
            }
        }
        let mut serial = Vec::with_capacity(rate_count);
        for (interval_index, interval) in active.iter().enumerate() {
            for (rate_index, rate) in interval.rates.iter().enumerate() {
                if !flows
                    .get(&(rate.target_id.as_str(), rate.attribute.as_str()))
                    .is_some_and(Flow::netted)
                {
                    serial.push((interval_index, rate_index));
                }
            }
        }
        let mut net = Vec::with_capacity(flows.len());
        for (_, flow) in flows {
            if flow.netted() {
                net.push(Some(flow));
            }
        }
        let due = Vec::with_capacity(periodic_count);
        let retained = core.retain_numeric_interval(incoming, seconds)?;
        Ok(Self {
            active,
            serial,
            net,
            retained,
            retained_rates,
            due,
            phase: Phase::Account,
            next: 0,
            occurrence: 0,
            seconds,
            conditions: None,
            body: Some(body),
            budget: budget.clone(),
            _reservation: reservation,
        })
    }
    fn numeric(
        &mut self,
        core: &mut CoreMutation<'_>,
        target: &str,
        id: &str,
        amount: f64,
    ) -> Result<(), ExecutionError> {
        let installed = core.state.installed.clone();
        let Some(entity) = core.state.physical.entities.get(target) else {
            return Ok(());
        };
        let definition = installed
            .attributes
            .get(id)
            .ok_or(ValueError::MissingAttribute)?
            .value();
        let AttributeSchema::Number { min, max, .. } = definition.schema else {
            return Ok(());
        };
        let prior = installed
            .status_read(&core.state.physical)
            .value(target, id)?;
        let Some(AttributeValue::Number(prior)) = prior else {
            return Ok(());
        };
        let value = crate::values::js_max(min, crate::values::js_min(max, prior + amount));
        if value == prior {
            return Ok(());
        }
        let conditions = ConditionReconcileCursor::new(target, &self.budget)?;
        let parameters = installed.account_law().affects_observation(entity, id);
        core.physical()
            .apply_ordinary_rate(target, definition, value, parameters)?;
        self.conditions = Some(conditions);
        Ok(())
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut completed: Option<CompletedOccurrence>,
    ) -> Result<StatusIntegrationStep, ExecutionError> {
        let installed = core.state.installed.clone();
        loop {
            if let Some(conditions) = &mut self.conditions {
                match conditions.step(core, completed.take())? {
                    ConditionReconcileStep::Occurrence(event) => {
                        return Ok(StatusIntegrationStep::Occurrence(event));
                    }
                    ConditionReconcileStep::Complete => self.conditions = None,
                }
            } else if completed.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            match self.phase {
                Phase::Account => {
                    let Some(interval) = self.active.get(self.next).cloned() else {
                        self.next = 0;
                        self.phase = Phase::Serial;
                        continue;
                    };
                    self.next += 1;
                    let definition = &installed.status_policy.definitions[interval.definition];
                    if self.retained.contains(&interval.episode) {
                        core.journal
                            .meters
                            .charge(&[(WorkUnit::Effects, definition.while_active.len() as u64)])?;
                        continue;
                    }
                    if core
                        .state
                        .physical
                        .work
                        .invocation(&interval.episode)
                        .is_none()
                    {
                        let compiled = installed
                            .status_work
                            .get(&definition.id)
                            .ok_or(ExecutionError::Invariant)?;
                        core.physical().admit_work(
                            compiled.request(&interval.entity_id, &interval.episode)?,
                        )?;
                    }
                    core.physical().advance_work_interval(&interval.episode)?;
                    let cost = status_work(definition);
                    core.physical().charge_work(
                        &interval.episode,
                        WorkDemand {
                            tests: Some(cost.tests),
                            effects: Some(cost.effects),
                            ..Default::default()
                        },
                    )?;
                    core.journal
                        .meters
                        .charge(&[(WorkUnit::Effects, definition.while_active.len() as u64)])?;
                    let before = core.physical().advance_status_elapsed(
                        &interval.entity_id,
                        &definition.id,
                        &interval.episode,
                        self.seconds,
                    )?;
                    for (index, change) in interval.periodic.iter().enumerate() {
                        let count = (((before + self.seconds + installed.time_epsilon)
                            / change.every_game_seconds)
                            .floor()
                            - ((before + installed.time_epsilon) / change.every_game_seconds)
                                .floor()) as u64;
                        if count > 0 {
                            self.due.push(Due {
                                interval: self.next - 1,
                                change: index,
                                count,
                            });
                        }
                    }
                }
                Phase::Serial => {
                    let Some((interval, index)) = self.serial.get(self.next).copied() else {
                        self.next = 0;
                        self.phase = Phase::Net;
                        continue;
                    };
                    self.next += 1;
                    let interval = self.active[interval].clone();
                    let rate = &interval.rates[index];
                    if self
                        .retained_rates
                        .contains(&RateKey(&rate.target_id, &rate.attribute))
                    {
                        continue;
                    }
                    self.numeric(
                        core,
                        &rate.target_id,
                        &rate.attribute,
                        rate.rate * self.seconds,
                    )?;
                }
                Phase::Net => {
                    let Some(flow) = self.net.get_mut(self.next) else {
                        self.next = 0;
                        self.phase = Phase::Periodic;
                        continue;
                    };
                    self.next += 1;
                    let flow = flow.take().ok_or(ExecutionError::Invariant)?;
                    if core.state.physical.entities.get(&flow.target).is_none() {
                        continue;
                    }
                    if flow.health {
                        self.body
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .net(flow, self.seconds)?;
                    } else {
                        self.numeric(
                            core,
                            &flow.target,
                            &flow.attribute,
                            flow.rate * self.seconds,
                        )?;
                    }
                }
                Phase::Periodic => {
                    let Some(due) = self.due.get(self.next) else {
                        self.phase = Phase::Done;
                        continue;
                    };
                    if self.occurrence >= due.count {
                        self.next += 1;
                        self.occurrence = 0;
                        continue;
                    }
                    let interval = self.active[due.interval].clone();
                    let change = &interval.periodic[due.change];
                    let definition = &installed.status_policy.definitions[interval.definition];
                    let Some(target) = core.state.physical.entities.get(&change.target_id) else {
                        self.next += 1;
                        self.occurrence = 0;
                        continue;
                    };
                    let Some(attribute) = installed
                        .attributes
                        .get(&change.attribute)
                        .map(|definition| definition.value())
                    else {
                        self.next += 1;
                        self.occurrence = 0;
                        continue;
                    };
                    let AttributeSchema::Number { .. } = attribute.schema else {
                        self.next += 1;
                        self.occurrence = 0;
                        continue;
                    };
                    let Some(body) = target.actor.as_ref().and_then(|actor| actor.body.as_ref())
                    else {
                        return Err(ExecutionError::UnsupportedFamily);
                    };
                    let (min, max) = attribute_range(Some(target), attribute)
                        .ok_or(ValueError::InvalidMeaning)?;
                    let range = max - min;
                    let amount = if change.unit == "fractionOfRange" {
                        change.amount * body.max_health
                    } else {
                        change.amount * body.max_health / range
                    };
                    core.journal.meters.charge(&[(WorkUnit::Effects, 1)])?;
                    self.body
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .periodic(&change.target_id, &change.attribute, amount, definition)?;
                    self.occurrence += 1;
                }
                Phase::Done => {
                    return Ok(StatusIntegrationStep::Complete(
                        self.body
                            .take()
                            .ok_or(ExecutionError::UnfinishedOccurrence)?,
                    ));
                }
            }
        }
    }
}
