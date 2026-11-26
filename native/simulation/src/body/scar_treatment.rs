//! Treatment uses the installed replacement-life policy and the actor's
//! current loose inventory. Geometry is checked by each owning candidate.
use super::{DeathScar, ReincarnationPolicy, ScarTreatment};
use crate::{
    execution::{ExecutionError, can_debit_lot},
    geometry::{SightRay, interaction_reach},
    host::ByteBudget,
    simulation::SimulationState,
    state::Entity,
};

pub(crate) struct Treatment<'a> {
    pub rule: &'a ScarTreatment,
    pub policy: &'a ReincarnationPolicy,
    pub scar: &'a DeathScar,
    pub material: &'a Entity,
    pub rest: &'a Entity,
    pub reach: SightRay,
}

pub(crate) fn select<'a>(
    state: &'a SimulationState,
    actor: &'a Entity,
    scar: &str,
    rest: &str,
    budget: &ByteBudget,
) -> Result<Option<Treatment<'a>>, ExecutionError> {
    let Some((policy, rule)) = installed(state) else {
        return Ok(None);
    };
    let Some(scar) = policy
        .scars
        .iter()
        .find(|definition| definition.id == scar && has_scar(actor, &definition.id))
    else {
        return Ok(None);
    };
    let Some(rest) = state
        .physical
        .entities
        .get(rest)
        .filter(|rest| rest.kind == policy.rest_kind && rest.world_position().is_some())
    else {
        return Ok(None);
    };
    let Some(reach) = interaction_reach(actor, rest, rule.reach, budget)? else {
        return Ok(None);
    };
    let Some(material) = material(state, actor, rule) else {
        return Ok(None);
    };
    Ok(Some(Treatment {
        rule,
        policy,
        scar,
        material,
        rest,
        reach,
    }))
}

pub(crate) fn installed(state: &SimulationState) -> Option<(&ReincarnationPolicy, &ScarTreatment)> {
    let policy = state
        .installed
        .body_policy
        .as_ref()?
        .value()
        .reincarnation
        .as_ref()?;
    Some((policy, policy.treatment.as_ref()?))
}

pub(crate) fn has_scar(actor: &Entity, id: &str) -> bool {
    actor.actor.as_ref().is_some_and(|actor| {
        actor.alive
            && actor
                .scars
                .as_ref()
                .and_then(|scars| scars.get(id))
                .is_some_and(|count| *count > 0.0)
    })
}

/// Search only the current directly carried lots. A packed or held quantity
/// cannot pay for a treatment.
pub(crate) fn material<'a>(
    state: &'a SimulationState,
    actor: &Entity,
    rule: &ScarTreatment,
) -> Option<&'a Entity> {
    state
        .inventory
        .children(&state.physical.entities, &actor.id, false)
        .find(|candidate| {
            candidate.item.as_ref().is_some_and(|item| {
                item.definition_pin.id == rule.material_id
                    && can_debit_lot(state, candidate, rule.quantity)
            })
        })
}

/// Validate the saved activity and its installed law. The finishing candidate
/// still checks the physical rest spot, current reach and loose materials.
pub(crate) fn valid_saved(
    entity: &Entity,
    action: &crate::state::Action,
    body: Option<&super::BodyPolicy>,
) -> bool {
    let Some(scar) = action.scar_id.as_deref() else {
        return false;
    };
    let Some(policy) = body.and_then(|body| body.reincarnation.as_ref()) else {
        return false;
    };
    policy.scars.iter().any(|definition| definition.id == scar)
        && policy
            .treatment
            .as_ref()
            .is_some_and(|rule| action.total_seconds == rule.work_seconds)
        && action.remaining_seconds > 0.0
        && action.remaining_seconds <= action.total_seconds
        && action.path.is_empty()
        && action.navigation.is_none()
        && entity.actor.as_ref().is_some_and(|actor| {
            actor.alive
                && actor
                    .scars
                    .as_ref()
                    .and_then(|scars| scars.get(scar))
                    .is_some_and(|count| *count > 0.0)
        })
}
