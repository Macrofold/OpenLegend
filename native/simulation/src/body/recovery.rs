//! Recovery has one nonspatial admission read for execution and permitted
//! controls. The caller must additionally prove this exact anchor walkable for
//! the captured actor's actual body; an available location alone grants no act.
use crate::execution::ExecutionError;
use crate::identity::MAX_SAFE_INTEGER;
use crate::simulation::SimulationState;
use crate::state::SurfacePoint;
use crate::status::{AttributeSchema, EffectBindings};
use crate::values::AttributeValue;

pub(crate) fn recovery_anchor<'a>(
    state: &'a SimulationState,
    actor_id: &str,
) -> Result<Option<&'a SurfacePoint>, ExecutionError> {
    let Some(recovery) = state
        .installed
        .body_policy
        .as_ref()
        .and_then(|policy| policy.value().recovery.as_ref())
    else {
        return Ok(None);
    };
    let Some(anchor) = state
        .installed
        .retained
        .participation_read
        .as_ref()
        .and_then(|policy| policy.safe_return_anchor.as_ref())
    else {
        return Ok(None);
    };
    let Some(entity) = state.physical.entities.get(actor_id) else {
        return Ok(None);
    };
    let Some(actor) = &entity.actor else {
        return Ok(None);
    };
    if !actor.alive
        || !recovery.controllers.contains(&actor.controller)
        || actor
            .body
            .as_ref()
            .is_none_or(|body| body.revision >= MAX_SAFE_INTEGER)
    {
        return Ok(None);
    }
    let read = state.installed.status_read(&state.physical);
    for floor in &recovery.floors {
        let Some(definition) = state.installed.attributes.get(&floor.attribute_id) else {
            return Ok(None);
        };
        if !matches!(definition.value().schema, AttributeSchema::Number { .. }) {
            return Ok(None);
        }
        let Some(AttributeValue::Number(value)) = read.value(actor_id, &floor.attribute_id)? else {
            return Ok(None);
        };
        if value >= floor.value || definition.value().implementation == "native-health-v1" {
            continue;
        }
        let Some(anchor) = actor
            .attributes
            .as_ref()
            .and_then(|attributes| attributes.get(&floor.attribute_id))
        else {
            return Ok(None);
        };
        let revision = match &state.physical.pending_values {
            Some(window) => {
                window
                    .current_attribute(actor_id, &floor.attribute_id, anchor)?
                    .revision
            }
            None => anchor.revision,
        };
        if revision >= MAX_SAFE_INTEGER {
            return Ok(None);
        }
    }
    Ok(read
        .evaluate(EffectBindings::for_status(actor_id, None), &recovery.when)?
        .matches
        .then_some(anchor))
}
