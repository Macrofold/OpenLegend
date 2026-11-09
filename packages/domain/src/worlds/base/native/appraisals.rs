//! The bundled event law chooses discomfort from personally received injury.
//! The engine owns proof, identity, work admission and appraisal lifetime.
use crate::events::WorldEvent;
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::ByteBudget;
use crate::reception::EventScalar;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct EventAppraisalRules {
    pub id: String,
    pub version: u64,
    pub event_type: String,
    pub damage_field: String,
    pub definition_id: String,
    pub fallback_max_health: f64,
}
impl crate::install::DefinitionIdentity for EventAppraisalRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}
pub(crate) fn appraise_event(
    core: &mut CoreMutation<'_>,
    event: &WorldEvent,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let installed = std::sync::Arc::clone(&core.state.installed);
    let rules = installed.event_appraisal_rules.value();
    if event.event_type != rules.event_type {
        return Ok(());
    }
    let Some(target) = event.target_id.as_deref() else {
        return Ok(());
    };
    let Some(actor) = core
        .state
        .physical
        .entities
        .get(target)
        .and_then(|entity| entity.actor.as_ref())
    else {
        return Ok(());
    };
    // Source uses Number(data ?? 0), including scalar string/boolean inputs.
    let delta = match event
        .data
        .as_ref()
        .and_then(|data| data.get(&rules.damage_field))
    {
        None | Some(EventScalar::Null(())) => 0.0,
        Some(EventScalar::Number(value)) => *value,
        Some(EventScalar::Boolean(value)) => f64::from(u8::from(*value)),
        Some(EventScalar::Text(value)) => value
            .as_unicode()
            .map_or(f64::NAN, crate::encoding::js_number),
    };
    let damage = -delta;
    if !damage.is_finite() || damage <= 0.0 {
        return Ok(());
    }
    let max = actor
        .body
        .as_ref()
        .map_or(rules.fallback_max_health, |body| body.max_health);
    crate::appraisals::appraise_perceived_event(
        core,
        event,
        target,
        event.actor_id.as_deref().unwrap_or(target),
        &rules.definition_id,
        (damage / max).min(1.0),
        budget,
    )
}

#[path = "policy_residency/appraisals.rs"]
mod policy_residency;
