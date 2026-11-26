//! The bundled world's food preparation uses the same physical possessions,
//! tool property, remains and work duration exposed by the authored action.
use crate::{
    execution::{CoreMutation, ExecutionError},
    state::Entity,
    work::WorkUnit,
};

pub(crate) const LABEL: &str = "Harvest animal remains";
pub(crate) const UNAVAILABLE: &str = "There are no unharvested remains there.";
pub(crate) const MISSING_TOOL: &str = "A cutting point is needed to prepare the remains.";
pub(crate) const STARTED: &str = "began harvesting the remains.";
pub(crate) const COMPLETED: &str = "harvested meat and bone from the remains.";
pub(crate) const FAILED: &str =
    "The remains were already harvested or the cutting tool is missing.";
pub(crate) fn fresh(target: &Entity) -> bool {
    target
        .remains
        .as_ref()
        .is_some_and(|r| r.phase == "fresh" && !r.harvested && !r.yields.is_empty())
}
pub(crate) fn can_cut(core: &mut CoreMutation<'_>, actor: &str) -> Result<bool, ExecutionError> {
    let state = &core.state;
    state
        .inventory
        .visit_owned_until(&state.physical.entities, actor, actor, &mut |entity, _| {
            core.journal.meters.charge(&[(WorkUnit::Candidates, 1)])?;
            Ok(entity
                .item
                .as_ref()
                .and_then(|lot| state.installed.retained.items.get(&lot.definition_pin.id))
                .is_some_and(|definition| {
                    definition
                        .properties
                        .iter()
                        .any(|property| property == "point")
                }))
        })
}
