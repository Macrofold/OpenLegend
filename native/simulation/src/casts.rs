//! Installed finite cast rules and exact continuation. The command and time
//! owners supply the actual geometry, custody and one saved random draw.
use crate::execution::ExecutionError;
use crate::geometry::{GeometryQueries, SightRay, StandingQuery};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::install::{InstallError, ItemDefinitionRead, owned_by};
use crate::simulation::SimulationState;
use crate::state::{Entity, Placement, Point, Resource, SurfacePoint};
use crate::text::JsText;
use crate::values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Definition {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    pub tool_kind: String,
    pub name: JsText,
    pub description: JsText,
    pub action_label: JsText,
    pub available_text: JsText,
    pub tool_required_text: JsText,
    pub supply_unknown_text: JsText,
    pub work_seconds: f64,
    pub chance: f64,
    pub maximum_line_metres: f64,
    pub stance_tolerance: f64,
    pub caught_text: JsText,
    pub empty_text: JsText,
    pub exhausted_text: JsText,
}

pub(crate) struct InstalledCast {
    pub pin: DefinitionPin,
    pub definition: Definition,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Messages {
    pub missing_source: &'static str,
    pub blocked_line: &'static str,
    pub out_of_reach: &'static str,
    pub changed_binding: &'static str,
}

pub(crate) fn messages() -> &'static Messages {
    static COPY: std::sync::OnceLock<Messages> = std::sync::OnceLock::new();
    COPY.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../packages/domain/src/finite-cast-messages.json"
        ))
        .expect("shared finite cast messages")
    })
}

impl Definition {
    pub(crate) fn install(self, key: &str, canonical: &str) -> Result<InstalledCast, InstallError> {
        if self.id != key
            || !is_safe_record_id(key)
            || self.version == 0
            || !is_safe_record_id(&self.tool_kind)
            || !(0.0..=1.0).contains(&self.chance)
            || [
                self.work_seconds,
                self.maximum_line_metres,
                self.stance_tolerance,
            ]
            .into_iter()
            .any(|value| !value.is_finite() || value <= 0.0)
            || [
                &self.name,
                &self.description,
                &self.action_label,
                &self.available_text,
                &self.tool_required_text,
                &self.supply_unknown_text,
                &self.caught_text,
                &self.empty_text,
                &self.exhausted_text,
            ]
            .into_iter()
            .any(JsText::trim_is_empty)
        {
            return Err(InstallError::DefinitionBody);
        }
        let pin = DefinitionPin {
            id: self.id.clone(),
            version: self.version,
            digest: crate::encoding::content_label(canonical),
        };
        Ok(InstalledCast {
            pin,
            definition: self,
        })
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CastSource {
    pub definition_id: String,
    pub endpoint: Point,
    pub stance: SurfacePoint,
    pub water: Water,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Water {
    max_x: f64,
    max_z: f64,
    min_x: f64,
    min_z: f64,
}

impl CastSource {
    pub(crate) fn valid(&self) -> bool {
        is_safe_record_id(&self.definition_id)
            && is_safe_record_id(&self.stance.surface_id)
            && [
                self.stance.x,
                self.stance.y,
                self.stance.z,
                self.endpoint.x,
                self.endpoint.y,
                self.endpoint.z,
            ]
            .into_iter()
            .all(f64::is_finite)
            && [
                self.water.min_x,
                self.water.max_x,
                self.water.min_z,
                self.water.max_z,
            ]
            .into_iter()
            .all(f64::is_finite)
            && self.water.min_x < self.water.max_x
            && self.water.min_z < self.water.max_z
    }

    pub(crate) fn line_is_possible(&self, definition: &Definition) -> bool {
        self.endpoint.x >= self.water.min_x
            && self.endpoint.x <= self.water.max_x
            && self.endpoint.z >= self.water.min_z
            && self.endpoint.z <= self.water.max_z
            && crate::spatial::distance(self.stance.point(), self.endpoint)
                <= definition.maximum_line_metres
    }
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Binding {
    pub definition: DefinitionPin,
    pub source: DefinitionPin,
    pub tool: DefinitionPin,
    pub output: DefinitionPin,
}

pub(crate) struct Source<'a> {
    pub entity: &'a Entity,
    pub stock: &'a Resource,
    pub cast: &'a CastSource,
    pub rules: &'a InstalledCast,
    pub output: &'a ItemDefinitionRead,
}

pub(crate) fn source<'a>(state: &'a SimulationState, target: &str) -> Option<Source<'a>> {
    let definitions = &state.installed.retained;
    let entity = state.physical.entities.get(target)?;
    let stock = entity.resource.as_ref()?;
    let cast = stock.cast.as_deref()?;
    let rules = definitions.casts.get(&cast.definition_id)?;
    let output = definitions.items.get(&stock.definition_id)?;
    Some(Source {
        entity,
        stock,
        cast,
        rules,
        output,
    })
}

/// A source pin deliberately excludes mutable stock and includes exact
/// placement. The fixed ASCII field keys use Source's canonical ordering.
pub(crate) fn source_digest(
    source: &Source<'_>,
    budget: &ByteBudget,
) -> Result<String, ExecutionError> {
    let placement = &source.entity.placement;
    let _work = budget.reserve(
        2048 + 12
            * (source.cast.definition_id.len()
                + source.cast.stance.surface_id.len()
                + source.entity.id.len()
                + source.stock.definition_id.len()
                + placement.heap_bytes().ok_or(ExecutionError::Capacity)?),
    )?;
    let mut value = serde_json::json!({
        "cast": source.cast, "definitionId": source.stock.definition_id,
        "id": source.entity.id, "placement": placement, "version": 1,
    });
    fn order(value: &mut serde_json::Value) {
        if let serde_json::Value::Object(fields) = value {
            fields.sort_keys();
            for child in fields.values_mut() {
                order(child);
            }
        }
    }
    order(&mut value);
    let canonical = crate::encoding::json_value(&value).map_err(|_| ExecutionError::Invariant)?;
    Ok(crate::encoding::content_label(&canonical))
}

pub(crate) fn tool<'a>(
    state: &'a SimulationState,
    actor: &str,
    id: &str,
    source: &Source<'_>,
) -> Result<Option<&'a ItemDefinitionRead>, ExecutionError> {
    let installed = &state.installed.retained;
    let Some(item) = owned_by(&state.physical.entities, installed, actor, id)? else {
        return Ok(None);
    };
    let definition = installed
        .items
        .get(item.definition_id)
        .ok_or(ExecutionError::Invariant)?;
    Ok((item.available_quantity > 0
        && definition.fishing_kind() == Some(source.rules.definition.tool_kind.as_str()))
    .then_some(definition))
}

pub(crate) fn matches(
    source: &Source<'_>,
    tool: &ItemDefinitionRead,
    binding: &Binding,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    Ok(binding.definition == source.rules.pin
        && binding.output == source.output.pin
        && binding.tool == tool.pin
        && binding.source.id == source.entity.id
        && binding.source.version == 1
        && binding.source.digest == source_digest(source, budget)?)
}

pub(crate) fn at_stance(actor: &Entity, source: &Source<'_>) -> bool {
    matches!(&actor.placement, Some(Placement::World { position, support_surface_id: Some(surface), .. })
        if surface == &source.cast.stance.surface_id
            && crate::spatial::distance(*position, source.cast.stance.point())
                <= source.rules.definition.stance_tolerance)
}

/// The same held candidate asks for dry support and a clear working line at
/// admission and at the due boundary. The caller funds these two query rows.
pub(crate) fn check_line(
    queries: &mut GeometryQueries,
    actor: &Entity,
    cast: &CastSource,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let body = crate::status::effective_body_profile(actor, budget)?;
    let mut origin = cast.stance.point();
    origin.y += body.interaction_height;
    queries.sight = vec![SightRay {
        from: origin,
        to: cast.endpoint,
    }];
    queries.standing = vec![StandingQuery {
        body: actor.body_profile().into_owned(),
        point: cast.stance.clone(),
    }];
    Ok(())
}

pub(crate) fn check_storage(actor: &Entity, cast: &CastSource) -> usize {
    std::mem::size_of::<SightRay>()
        + std::mem::size_of::<StandingQuery>()
        + actor.ordinary_body_profile().id.len()
        + cast.stance.surface_id.len()
}

pub(crate) fn validate_saved_work(
    state: &SimulationState,
    actor: &str,
    action: &crate::state::Action,
    budget: &ByteBudget,
) -> Result<(), InstallError> {
    let target = action
        .target_id
        .as_deref()
        .and_then(|id| source(state, id))
        .ok_or(InstallError::CurrentFormat)?;
    let binding = action
        .fishing
        .as_deref()
        .ok_or(InstallError::CurrentFormat)?;
    let item = action
        .item_id
        .as_deref()
        .ok_or(InstallError::CurrentFormat)?;
    let tool = tool(state, actor, item, &target)
        .map_err(install_problem)?
        .ok_or(InstallError::CurrentFormat)?;
    if !matches!(action.stage.as_str(), "approaching" | "working")
        || !action.remaining_seconds.is_finite()
        || action.remaining_seconds <= 0.0
        || action.total_seconds != target.rules.definition.work_seconds
        || action.remaining_seconds > action.total_seconds
        || !action.consumed.is_empty()
        || action.destination.as_ref().is_none_or(|destination| {
            destination.point() != target.cast.stance.point()
                || destination.surface_id != target.cast.stance.surface_id
        })
        || !matches(&target, tool, binding, budget).map_err(install_problem)?
    {
        return Err(InstallError::CurrentFormat);
    }
    Ok(())
}

fn install_problem(error: ExecutionError) -> InstallError {
    match error {
        ExecutionError::Capacity => InstallError::Capacity,
        _ => InstallError::CurrentFormat,
    }
}

heap_record!(Definition {
    id,
    tool_kind,
    name,
    description,
    action_label,
    available_text,
    tool_required_text,
    supply_unknown_text,
    caught_text,
    empty_text,
    exhausted_text
});
heap_record!(InstalledCast { pin, definition });
heap_record!(CastSource {
    definition_id,
    stance
});
heap_record!(Binding {
    definition,
    source,
    tool,
    output
});
