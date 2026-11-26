//! Captured health flows use the ordinary body owner before endpoint work.
//! This cursor owns the one captured rate table; selecting actors neither
//! copies that table nor changes the Source participant order.
//! See docs/status-effects.md#transitions.
use super::{BodyAnswer, BodyStep, HealthChangeCursor};
use crate::execution::{CoreMutation, ExecutionError, StagedOccurrence};
use crate::host::{ByteBudget, ByteReservation};
use crate::status::{AttributeSchema, BodyRates, attribute_range, read_attribute};
use crate::values::AttributeValue;
use std::mem::size_of;

enum Progress {
    Occurrence(StagedOccurrence),
    Personal,
    Complete,
}
pub(crate) struct BodyRateCursor {
    rates: BodyRates,
    selected: Option<usize>,
    net_done: bool,
    periodic: usize,
    health: Option<HealthChangeCursor>,
    budget: ByteBudget,
    _reservation: ByteReservation,
}
impl BodyRateCursor {
    pub(crate) fn new(rates: BodyRates, budget: &ByteBudget) -> Result<Self, ExecutionError> {
        Ok(Self {
            rates,
            selected: None,
            net_done: false,
            periodic: 0,
            health: None,
            budget: budget.clone(),
            _reservation: budget.reserve(size_of::<Self>())?,
        })
    }
    pub(crate) fn select(&mut self, actor: &str) -> Result<bool, ExecutionError> {
        if self.selected.is_some() || self.health.is_some() {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        self.selected = self.rates.index_for_target(actor);
        self.net_done = false;
        self.periodic = 0;
        Ok(self.selected.is_some())
    }
    pub(crate) fn personal(
        &self,
    ) -> Result<&crate::activity::PendingActivityResult, ExecutionError> {
        self.health
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .personal()
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<BodyAnswer>,
    ) -> Result<BodyStep<'a>, ExecutionError> {
        Ok(match self.progress(core, answer)? {
            Progress::Occurrence(event) => BodyStep::Occurrence(event),
            Progress::Personal => BodyStep::Personal(
                self.health
                    .as_ref()
                    .ok_or(ExecutionError::Invariant)?
                    .personal()?,
            ),
            Progress::Complete => BodyStep::Complete,
        })
    }
    fn progress(
        &mut self,
        core: &mut CoreMutation<'_>,
        mut answer: Option<BodyAnswer>,
    ) -> Result<Progress, ExecutionError> {
        loop {
            if let Some(health) = &mut self.health {
                match health.step(core, answer.take())? {
                    BodyStep::Occurrence(event) => return Ok(Progress::Occurrence(event)),
                    BodyStep::Personal(_) => return Ok(Progress::Personal),
                    BodyStep::Complete => self.health = None,
                }
            } else if answer.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            let Some(index) = self.selected else {
                return Ok(Progress::Complete);
            };
            let rate = self.rates.get(index).ok_or(ExecutionError::Invariant)?;
            let entity = core.state.physical.entities.get(&rate.target_id);
            let actor = entity.and_then(|entity| entity.actor.as_ref());
            if !actor.is_some_and(|actor| actor.alive && !actor.incapacitated) {
                self.selected = None;
                return Ok(Progress::Complete);
            }
            if !self.net_done {
                let installed = core.state.installed.clone();
                let definition = installed.attributes.get(&rate.attribute).map(|d| d.value());
                let body = actor.and_then(|actor| actor.body.as_ref());
                let (Some(entity), Some(body), Some(definition)) = (entity, body, definition)
                else {
                    self.selected = None;
                    return Ok(Progress::Complete);
                };
                if !matches!(definition.schema, AttributeSchema::Number { .. }) {
                    self.selected = None;
                    return Ok(Progress::Complete);
                }
                let Some(AttributeValue::Number(prior)) = read_attribute(
                    entity,
                    definition,
                    core.state.physical.pending_values.as_ref(),
                )?
                else {
                    self.selected = None;
                    return Ok(Progress::Complete);
                };
                let (min, max) =
                    attribute_range(Some(entity), definition).ok_or(ExecutionError::Invariant)?;
                let value =
                    crate::values::js_max(min, crate::values::js_min(max, prior + rate.amount));
                self.net_done = true;
                if value != prior {
                    // Preserve Source's arithmetic and its distinction between
                    // attribute units here and raw body points below.
                    self.health = Some(HealthChangeCursor::new(
                        core,
                        &rate.target_id,
                        rate.amount * (body.max_health / (max - min)),
                        if rate.causes.len() == 1 {
                            &rate.causes[0]
                        } else {
                            "combined-status-rates"
                        },
                        None,
                        None,
                        &self.budget,
                    )?);
                    continue;
                }
            }
            let Some(change) = rate.periodic.get(self.periodic) else {
                self.selected = None;
                return Ok(Progress::Complete);
            };
            self.periodic += 1;
            // A due periodic occurrence still reconciles the body when its
            // delta is zero or saturated. Net zero rates above do not.
            self.health = Some(HealthChangeCursor::new(
                core,
                &rate.target_id,
                change.amount,
                &change.cause,
                Some(&change.cause_label),
                change.cause_meaning.as_deref(),
                &self.budget,
            )?);
        }
    }
}
