//! The finite gathering choice and the saved binding use the same tool rules.
//! The current installed policy supplies the yield. Geometry and mutation stay
//! with the command, time and object owners.
use crate::{
    execution::ExecutionError,
    host::retained_size::{HeapBytes, heap_record},
    install::owned_by,
    simulation::SimulationState,
    state::{Entity, Resource},
    values::{DefinitionPin, deserialize_present_option, is_safe_record_id},
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum GatheringMode {
    AvailableTools,
    BareHands,
    CarriedTool,
    EquippedTool,
}

impl GatheringMode {
    fn chooses_tool(self) -> bool {
        matches!(self, Self::CarriedTool | Self::EquippedTool)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ToolChoice {
    pub mode: GatheringMode,
    pub item_id: Option<String>,
}

impl ToolChoice {
    pub(crate) fn new(mode: Option<GatheringMode>, item_id: Option<String>) -> Option<Self> {
        let mode = mode.unwrap_or(if item_id.is_some() {
            GatheringMode::EquippedTool
        } else {
            GatheringMode::AvailableTools
        });
        (mode.chooses_tool() == item_id.is_some()
            && item_id.as_deref().is_none_or(is_safe_record_id))
        .then_some(Self { mode, item_id })
    }
}

heap_record!(ToolChoice { item_id });

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GatheringBinding {
    pub(crate) mode: GatheringMode,
    pub(crate) source: DefinitionPin,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) tool: Option<DefinitionPin>,
}

heap_record!(GatheringBinding { source, tool });

pub(crate) struct Source<'a> {
    pub entity: &'a Entity,
    pub stock: &'a Resource,
    pub definition: &'a crate::install::ItemDefinitionRead,
    pub base_yield: u64,
}

pub(crate) fn source<'a>(state: &'a SimulationState, target: &str) -> Option<Source<'a>> {
    let definitions = &state.installed.retained;
    let base_yield = definitions.bare_hand_gathering?;
    let entity = state.physical.entities.get(target)?;
    let stock = entity.resource.as_ref()?;
    let definition = definitions.items.get(&stock.definition_id)?;
    (stock.cast.is_none() && definition.portable).then_some(Source {
        entity,
        stock,
        definition,
        base_yield,
    })
}

pub(crate) fn exact_tool<'a>(
    state: &'a SimulationState,
    actor: &str,
    item: &str,
    mode: GatheringMode,
    resource: &str,
) -> Result<Option<(&'a DefinitionPin, u64)>, ExecutionError> {
    let definitions = &state.installed.retained;
    let Some(item) = owned_by(&state.physical.entities, definitions, actor, item)? else {
        return Ok(None);
    };
    let definition = &definitions.items[item.definition_id];
    if item.available_quantity == 0
        || (mode == GatheringMode::EquippedTool
            && (!item.equipped || !definition.equips_for_gathering()))
    {
        return Ok(None);
    }
    Ok(definition
        .gathering_yield(resource)
        .map(|quantity| (&definition.pin, quantity)))
}

/// Ordinary gathering chooses the best accessible carried tool. A deliberate
/// hands/tool choice never silently switches mode or uses a different tool.
pub(crate) fn quantity(
    state: &SimulationState,
    actor: &str,
    source: &Source<'_>,
    binding: &GatheringBinding,
    item: Option<&str>,
) -> Result<Option<u64>, ExecutionError> {
    let Some(mut amount) = bound_yield(state, actor, source, binding, item)? else {
        return Ok(None);
    };
    if binding.mode == GatheringMode::AvailableTools {
        let definitions = &state.installed.retained;
        state.inventory.visit_owned(
            &state.physical.entities,
            definitions,
            actor,
            actor,
            &mut |item| {
                if item.available_quantity > 0
                    && let Some(value) = definitions.items[item.definition_id]
                        .gathering_yield(&source.definition.pin.id)
                {
                    amount = amount.max(value);
                }
                Ok(())
            },
        )?;
    }
    Ok(Some(amount.min(source.stock.quantity)))
}

pub(crate) fn bound_yield(
    state: &SimulationState,
    actor: &str,
    source: &Source<'_>,
    binding: &GatheringBinding,
    item: Option<&str>,
) -> Result<Option<u64>, ExecutionError> {
    if binding.source != source.definition.pin
        || binding.mode.chooses_tool() != item.is_some()
        || item.is_some() != binding.tool.is_some()
    {
        return Ok(None);
    }
    let Some(item) = item else {
        return Ok(Some(source.base_yield));
    };
    Ok(
        exact_tool(state, actor, item, binding.mode, &source.definition.pin.id)?
            .filter(|(pin, _)| Some(*pin) == binding.tool.as_ref())
            .map(|(_, value)| value.max(source.base_yield)),
    )
}

pub(crate) fn validate_saved_work(
    state: &SimulationState,
    budget: &crate::host::ByteBudget,
) -> Result<(), crate::install::InstallError> {
    use crate::install::InstallError;
    for id in state.physical.entities.ordered_ids() {
        let actor = state
            .physical
            .entities
            .get(id)
            .ok_or(InstallError::CurrentFormat)?;
        let Some(action) = actor
            .actor
            .as_ref()
            .and_then(|actor| actor.action.as_ref())
        else {
            continue;
        };
        if action.is_casting() {
            crate::casts::validate_saved_work(state, id, action, budget)?;
            continue;
        }
        if !action.is_gathering() {
            continue;
        }
        let source = action
            .target_id
            .as_deref()
            .and_then(|target| source(state, target))
            .ok_or(InstallError::CurrentFormat)?;
        let binding = action
            .gathering
            .as_deref()
            .ok_or(InstallError::CurrentFormat)?;
        if !matches!(action.stage.as_str(), "working" | "approaching")
            || action.total_seconds != source.stock.work_seconds
            || action.destination.is_some()
            || action.remaining_seconds < 0.0
            || !action.remaining_seconds.is_finite()
            || action.remaining_seconds > action.total_seconds
            || bound_yield(state, id, &source, binding, action.item_id.as_deref())
                .map_err(|_| InstallError::CurrentFormat)?
                .is_none()
        {
            return Err(InstallError::CurrentFormat);
        }
    }
    Ok(())
}
