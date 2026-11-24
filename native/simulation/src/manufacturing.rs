//! Known stationary manufacture uses the installed family result, accessible
//! stock, the ordinary inventory journal and the existing action timer.
use crate::execution::ExecutionError;
use crate::host::{
    ByteBudget, ByteReservation,
    retained_size::{HeapBytes, heap_record, map_storage},
};
use crate::install::{InstallError, ItemDefinitionRead, RetainedMap};
use crate::simulation::{PhysicalState, SimulationState};
use crate::state::{Action, Entity, Yield};
use crate::text::JsText;
use crate::values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::mem::size_of;

#[derive(Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Input {
    pub role: String,
    pub definition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Output {
    pub port: String,
    pub definition: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RetainedRole {
    role: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    quantity: u64,
    allowed_definitions: Vec<DefinitionPin>,
}

#[derive(Clone, Debug, Eq, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ToolBinding {
    pub(crate) role: String,
    pub(crate) item_id: String,
    pub(crate) definition: DefinitionPin,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub(crate) quantity: u64,
}

#[derive(PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FixedTransform {
    pub(crate) id: String,
    version: u64,
    name: JsText,
    description: JsText,
    work_seconds: f64,
    inputs: Vec<Input>,
    retained_tools: Vec<FixedRole>,
    outputs: Vec<FixedOutput>,
}

#[derive(PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FixedRole {
    role: String,
    quantity: u64,
    allowed_definition_ids: Vec<String>,
}

#[derive(PartialEq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FixedOutput {
    port: String,
    definition_id: String,
    quantity: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Definition<'a> {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    name: JsText,
    description: JsText,
    work_seconds: f64,
    inputs: Vec<Input>,
    outputs: Vec<Output>,
    retained_tools: Vec<RetainedRole>,
    dependency_references: Vec<Dependency>,
    #[serde(borrow)]
    source: &'a RawValue,
    #[serde(rename = "facts")]
    facts: Vec<serde::de::IgnoredAny>,
    digest: String,
    admitted_at: f64,
    #[serde(borrow)]
    provenance: &'a RawValue,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Dependency {
    kind: String,
    pin: DefinitionPin,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Candidate<'a> {
    pub family: Family,
    name: JsText,
    description: JsText,
    pub inputs: Vec<Input>,
    output: NamedOutput,
    #[serde(borrow)]
    pub parameters: &'a RawValue,
}

#[derive(PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Family {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
}

#[derive(PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
struct NamedOutput {
    name: JsText,
    description: JsText,
}

impl Candidate<'_> {
    pub(crate) fn output_name(&self) -> &JsText {
        &self.output.name
    }

    /// Compare authored choices while letting the selected world read its
    /// own parameter shape. Object formatting does not grant recipe authority.
    pub(crate) fn same_choices(&self, other: &Self) -> bool {
        self.family == other.family
            && self.name == other.name
            && self.description == other.description
            && self.inputs == other.inputs
            && self.output == other.output
    }
}

pub(crate) struct InstalledMethod {
    pub pin: DefinitionPin,
    pub family: Option<DefinitionPin>,
    pub name: JsText,
    pub description: JsText,
    pub work_seconds: f64,
    pub inputs: Vec<Input>,
    pub totals: Vec<Yield>,
    pub outputs: Vec<Output>,
    pub retained_tool: Option<RetainedRole>,
}

/// Source has already canonicalized every nested field. Keep that exact
/// ordering and spelling when dropping only attribution and admission time.
fn mechanical_pin(
    id: String,
    version: u64,
    canonical: &str,
    candidate: &str,
) -> Result<DefinitionPin, InstallError> {
    let mut fields: IndexMap<&str, &RawValue> =
        serde_json::from_str(canonical).map_err(|_| InstallError::DefinitionBody)?;
    let source: Origin<'_> = serde_json::from_str(
        fields
            .get("source")
            .ok_or(InstallError::DefinitionBody)?
            .get(),
    )
    .map_err(|_| InstallError::DefinitionBody)?;
    let exact = if source.kind == "fixed-transform" {
        #[derive(Serialize)]
        struct TransformDigest<'a> {
            definition: &'a RawValue,
            kind: &'static str,
        }
        let definition = source.definition.ok_or(InstallError::DefinitionBody)?;
        crate::encoding::json_record(&TransformDigest {
            definition,
            kind: "fixed-transform",
        })
        .map_err(|_| InstallError::DefinitionBody)?
            == candidate
    } else {
        source
            .candidate
            .is_some_and(|value| value.get() == candidate)
    };
    if !exact {
        return Err(InstallError::DefinitionBody);
    }
    fields.shift_remove("provenance");
    fields.shift_remove("admittedAt");
    let meaning =
        crate::encoding::json_record(&fields).map_err(|_| InstallError::DefinitionBody)?;
    Ok(DefinitionPin {
        id,
        version,
        digest: crate::encoding::content_label(&meaning),
    })
}

pub(crate) fn item_handling_pin(canonical: &str) -> Result<DefinitionPin, InstallError> {
    const ID: &str = "engine:item-handling-policy";
    let mut fields: IndexMap<&str, &RawValue> =
        serde_json::from_str(canonical).map_err(|_| InstallError::DefinitionBody)?;
    fields.insert(
        "id",
        serde_json::from_str("\"engine:item-handling-policy\"")
            .map_err(|_| InstallError::DefinitionBody)?,
    );
    fields.insert(
        "version",
        serde_json::from_str("1").map_err(|_| InstallError::DefinitionBody)?,
    );
    // These are the ASCII policy field names. Preserve the existing canonical
    // order, with the two injected fields at their Source positions.
    fields.sort_by(|a, _, b, _| {
        a.bytes()
            .map(|value| value.to_ascii_lowercase())
            .cmp(b.bytes().map(|value| value.to_ascii_lowercase()))
    });
    let bytes = crate::encoding::json_record(&fields).map_err(|_| InstallError::DefinitionBody)?;
    Ok(DefinitionPin {
        id: ID.into(),
        version: 1,
        digest: crate::encoding::content_label(&bytes),
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Origin<'a> {
    kind: &'a str,
    family_pin: Option<DefinitionPin>,
    #[serde(borrow)]
    definition: Option<&'a RawValue>,
    #[serde(borrow)]
    candidate: Option<&'a RawValue>,
    implementation_pin: Option<DefinitionPin>,
}

#[derive(Deserialize)]
struct Provenance<'a> {
    source: &'a str,
}

impl Definition<'_> {
    /// Bind a physical record's displayed method to its installed body and
    /// current dependencies, without admitting this family for manufacture.
    pub(crate) fn supports_record(
        &self,
        expected: &DefinitionPin,
        canonical: &str,
        family_pins: &[DefinitionPin],
        policy_pin: &DefinitionPin,
        items: &IndexMap<String, ItemDefinitionRead>,
    ) -> Result<bool, InstallError> {
        let origin: Origin<'_> =
            serde_json::from_str(self.source.get()).map_err(|_| InstallError::DefinitionBody)?;
        let provenance: Provenance<'_> = serde_json::from_str(self.provenance.get())
            .map_err(|_| InstallError::DefinitionBody)?;
        if self.id != expected.id
            || self.version != expected.version
            || origin.kind != "family"
            || !origin.family_pin.is_some_and(|family| family_pins.contains(&family))
            || provenance.source != "authored-world"
            || !self.dependencies_match(items, policy_pin, None)
            || self.outputs.iter().any(|output| {
                !items.get(&output.definition.id).is_some_and(|item| item.pin == output.definition)
            })
        {
            return Ok(false);
        }
        Ok(mechanical_pin(self.id.clone(), self.version, canonical, &self.digest)? == *expected)
    }

    fn dependencies_match(
        &self,
        items: &IndexMap<String, ItemDefinitionRead>,
        policy_pin: &DefinitionPin,
        material_family: Option<&DefinitionPin>,
    ) -> bool {
        let mut policy = false;
        let mut family_matched = material_family.is_none();
        for reference in &self.dependency_references {
            match reference.kind.as_str() {
                "item-definition"
                    if items
                        .get(&reference.pin.id)
                        .is_some_and(|item| item.pin == reference.pin) => {}
                "item-handling-policy" if !policy && reference.pin == *policy_pin => policy = true,
                "assembly-family" if !family_matched && Some(&reference.pin) == material_family => {
                    family_matched = true;
                }
                _ => return false,
            }
        }
        policy
            && family_matched
            && self.inputs.iter().all(|input| {
                items.get(&input.definition_id).is_some_and(|item| {
                    self.dependency_references
                        .iter()
                        .any(|dep| dep.kind == "item-definition" && dep.pin == item.pin)
                })
            })
    }

    pub(crate) fn install(
        self,
        key: &str,
        canonical: &str,
        profile: (&str, u64),
        family_pins: &[DefinitionPin],
        policy_pin: &DefinitionPin,
        items: &IndexMap<String, ItemDefinitionRead>,
        item_rows: &RetainedMap,
        assembly: Option<&IndexMap<String, &RawValue>>,
        budget: &ByteBudget,
        item_defaults: (bool, Option<u64>),
    ) -> Result<Option<InstalledMethod>, InstallError> {
        let origin: Origin<'_> =
            serde_json::from_str(self.source.get()).map_err(|_| InstallError::DefinitionBody)?;
        if origin.kind == "fixed-transform" {
            let definition: FixedTransform =
                serde_json::from_str(origin.definition.ok_or(InstallError::DefinitionBody)?.get())
                    .map_err(|_| InstallError::DefinitionBody)?;
            if !crate::worlds::base_manufacture::supports_fixed(profile, &definition)? {
                return Ok(None);
            }
            if origin.family_pin.is_some() || origin.candidate.is_some() {
                return Err(InstallError::DefinitionBody);
            }
            return self
                .install_fixed(
                    key,
                    canonical,
                    definition,
                    origin.implementation_pin,
                    items,
                    policy_pin,
                    item_rows,
                    assembly,
                    budget,
                )
                .map(Some);
        }
        let Some(family) = origin.family_pin.filter(|_| origin.kind == "family") else {
            return Ok(None);
        };
        let Some(rules) = crate::worlds::base_manufacture::selected(profile, &family.id) else {
            return Ok(None);
        };
        let provenance: Provenance<'_> = serde_json::from_str(self.provenance.get())
            .map_err(|_| InstallError::DefinitionBody)?;
        if provenance.source != "authored-world" {
            return Ok(None);
        }
        // The exact dependencies and generic recipe body came through the
        // approved installed release. This family still verifies the result
        // fields that can affect a live manufacture or the resulting tool.
        let candidate: Candidate<'_> =
            serde_json::from_str(&self.digest).map_err(|_| InstallError::DefinitionBody)?;
        if !rules.supports(&candidate)? {
            return Ok(None);
        }
        if self.id != key
            || !is_safe_record_id(key)
            || self.version != 1
            || !self.admitted_at.is_finite()
            || self.admitted_at < 0.0
            || !self.retained_tools.is_empty()
            || !family_pins.contains(&family)
            || candidate.family.id != family.id
            || candidate.family.version != family.version
            || candidate.inputs != self.inputs
            || candidate.name != self.name
            || candidate.description != self.description
            || self.outputs.len() != 1
            || self.outputs[0].port != "product"
            || self.outputs[0].quantity != 1
        {
            return Err(InstallError::DefinitionBody);
        }
        let output = &self.outputs[0];
        let meaning = items
            .get(&output.definition.id)
            .filter(|item| item.pin == output.definition)
            .ok_or(InstallError::DefinitionPin)?;
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct ItemProducer<'a> {
            recipe_id: &'a str,
        }
        let output_body = item_rows
            .get(&output.definition.id)
            .ok_or(InstallError::DefinitionPin)?;
        let producer: ItemProducer<'_> =
            serde_json::from_str(output_body).map_err(|_| InstallError::DefinitionBody)?;
        if producer.recipe_id != self.id
            || meaning.pin.version != 1
            || meaning.description.as_ref() != Some(&candidate.output.description)
            || !crate::narration::valid_name_parts(&candidate.output.name, None, None)
            || !rules.validates(
                self.work_seconds,
                &candidate,
                |id| {
                    items.get(id).filter(|item| {
                        self.dependency_references.iter().any(|reference| {
                            reference.kind == "item-definition" && reference.pin == item.pin
                        })
                    })
                },
                meaning,
                output_body,
                item_defaults,
            )?
        {
            return Err(InstallError::DefinitionBody);
        }
        if !self.dependencies_match(items, policy_pin, None) {
            return Err(InstallError::DefinitionPin);
        }
        self.into_method(canonical, Some(family)).map(Some)
    }

    fn install_fixed(
        self,
        key: &str,
        canonical: &str,
        exact: FixedTransform,
        implementation: Option<DefinitionPin>,
        items: &IndexMap<String, ItemDefinitionRead>,
        handling: &DefinitionPin,
        item_rows: &RetainedMap,
        assembly: Option<&IndexMap<String, &RawValue>>,
        budget: &ByteBudget,
    ) -> Result<InstalledMethod, InstallError> {
        let provenance: Provenance<'_> = serde_json::from_str(self.provenance.get())
            .map_err(|_| InstallError::DefinitionBody)?;
        let expected = fixed_implementation_pin()?;
        let [output] = self.outputs.as_slice() else {
            return Err(InstallError::DefinitionBody);
        };
        let [authored_output] = exact.outputs.as_slice() else {
            return Err(InstallError::DefinitionBody);
        };
        let item_pin = |pin: &DefinitionPin| {
            items.get(&pin.id).is_some_and(|item| &item.pin == pin)
                && self.dependency_references.iter().any(|dependency| {
                    dependency.kind == "item-definition" && &dependency.pin == pin
                })
        };
        // A carried material can use a structural material definition even
        // when this build offers no corresponding construction commands.
        let (material_family, _custody) = if items
            .get(&output.definition.id)
            .is_some_and(|item| item.material.is_some())
        {
            #[derive(Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct Item {
                assembly_material: Material,
            }
            #[derive(Deserialize)]
            #[serde(rename_all = "camelCase")]
            struct Material {
                family_id: String,
            }
            #[derive(Deserialize)]
            struct Family<'a> {
                id: &'a str,
                #[serde(deserialize_with = "deserialize_safe_integer")]
                version: u64,
            }
            let body = item_rows
                .get(&output.definition.id)
                .ok_or(InstallError::DefinitionBody)?;
            let funding = budget
                .reserve(body.len().checked_add(128).ok_or(InstallError::Capacity)?)
                .map_err(|_| InstallError::Capacity)?;
            let item: Item =
                serde_json::from_str(body).map_err(|_| InstallError::DefinitionBody)?;
            let id = item.assembly_material.family_id;
            let family = assembly
                .and_then(|rows| rows.get(&id))
                .ok_or(InstallError::DefinitionPin)?;
            let rule: Family<'_> =
                serde_json::from_str(family.get()).map_err(|_| InstallError::DefinitionBody)?;
            if rule.id != id || rule.version == 0 {
                return Err(InstallError::DefinitionPin);
            }
            let pin = DefinitionPin {
                id,
                version: rule.version,
                digest: crate::encoding::content_label(family.get()),
            };
            (Some(pin), Some(funding))
        } else {
            (None, None)
        };
        // Ordinary manufacture currently holds at most one retained tool.
        // Keep the selected role absent for material-only work.
        let tools_match = match (
            self.retained_tools.as_slice(),
            exact.retained_tools.as_slice(),
        ) {
            ([], []) => true,
            ([actual], [authored]) => {
                actual.role == authored.role
                    && actual.quantity == authored.quantity
                    && actual
                        .allowed_definitions
                        .iter()
                        .map(|pin| pin.id.as_str())
                        .eq(authored.allowed_definition_ids.iter().map(String::as_str))
                    && actual.allowed_definitions.iter().all(item_pin)
            }
            _ => false,
        };
        let tool_dependencies = self
            .retained_tools
            .first()
            .map_or(0, |tool| tool.allowed_definitions.len());
        if self.id != key
            || !is_safe_record_id(key)
            || self.version != 1
            || self.admitted_at < 0.0
            || !self.admitted_at.is_finite()
            || provenance.source != "authored-world"
            || implementation.as_ref() != Some(&expected)
            || self.name != exact.name
            || self.description != exact.description
            || self.inputs != exact.inputs
            || self.work_seconds != exact.work_seconds
            || !self.facts.is_empty()
            || output.port != authored_output.port
            || output.quantity != authored_output.quantity
            || output.definition.id != authored_output.definition_id
            || !item_pin(&output.definition)
            || !tools_match
            || !self.dependencies_match(items, handling, material_family.as_ref())
            || self.dependency_references.len()
                != self.inputs.len()
                    + tool_dependencies
                    + 2
                    + usize::from(material_family.is_some())
        {
            return Err(InstallError::DefinitionBody);
        }
        self.into_method(canonical, None)
    }

    fn into_method(self, canonical: &str, family: Option<DefinitionPin>) -> Result<InstalledMethod, InstallError> {
        let mut counts = IndexMap::<&str, u64>::new();
        for input in &self.inputs {
            let count = counts.entry(input.definition_id.as_str()).or_default();
            *count = count
                .checked_add(input.quantity)
                .ok_or(InstallError::DefinitionBody)?;
        }
        let totals = counts
            .into_iter()
            .map(|(id, quantity)| Yield {
                definition_id: id.into(),
                quantity,
            })
            .collect();
        Ok(InstalledMethod {
            pin: mechanical_pin(self.id, self.version, canonical, &self.digest)?,
            family,
            name: self.name,
            description: self.description,
            work_seconds: self.work_seconds,
            inputs: self.inputs,
            totals,
            outputs: self.outputs,
            retained_tool: self.retained_tools.into_iter().next(),
        })
    }
}

fn fixed_implementation_pin() -> Result<DefinitionPin, InstallError> {
    let definition = include_str!("../../../packages/domain/src/manufacture-implementation.json");
    let fields: IndexMap<&str, &RawValue> =
        serde_json::from_str(definition).map_err(|_| InstallError::DefinitionBody)?;
    let id: String =
        serde_json::from_str(fields["id"].get()).map_err(|_| InstallError::DefinitionBody)?;
    let version: u64 =
        serde_json::from_str(fields["version"].get()).map_err(|_| InstallError::DefinitionBody)?;
    let canonical =
        crate::encoding::json_record(&fields).map_err(|_| InstallError::DefinitionBody)?;
    Ok(DefinitionPin {
        id,
        version,
        digest: crate::encoding::content_label(&canonical),
    })
}

pub(crate) fn completion(
    method: &InstalledMethod,
    outputs: Vec<crate::commands::ActivityOutput>,
) -> crate::commands::Outcome {
    let mut text = method.name.clone();
    text.push_str(" completed.");
    crate::commands::Outcome {
        ok: true,
        code: "completed".to_owned(),
        message: text,
        item_id: (outputs.len() == 1).then(|| outputs[0].item_id.clone()),
        outputs: Some(outputs),
        spent: None,
        recipe_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}

/// Check exactly the existing saved activity envelope with prospective
/// product IDs. No physical item or lineage is installed.
pub(crate) fn finish_fits(
    core: &mut crate::execution::CoreMutation<'_>,
    method: &InstalledMethod,
    actor: &str,
    action: &str,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    use crate::commands::ActivityOutput;
    if core
        .state
        .activity
        .active(action)
        .map_err(ExecutionError::Activity)?
        .is_none()
    {
        return Ok(true);
    }
    let installed = core.state.installed.clone();
    let placeholder = "item-9007199254740991";
    let _workspace = budget.reserve(
        512 + method.name.storage_bytes()
            + method
                .outputs
                .iter()
                .map(|output| {
                    size_of::<ActivityOutput>()
                        + output.port.len()
                        + output.definition.id.len()
                        + 2 * crate::values::MAX_RECORD_ID_UNITS * 4
                })
                .sum::<usize>(),
    )?;
    let outputs = method
        .outputs
        .iter()
        .map(|output| {
            let item = core
                .carried_stock_target(actor, &output.definition.id, output.quantity)
                .filter(|id| id.len() > placeholder.len())
                .unwrap_or(placeholder);
            ActivityOutput {
                port: output.port.clone(),
                definition_id: output.definition.id.clone(),
                item_id: item.into(),
                quantity: output.quantity,
            }
        })
        .collect();
    core.journal
        .activity
        .check_production_finish(
            &mut core.state.activity,
            actor,
            action,
            completion(method, outputs),
            core.state.physical.header.sim_time,
            &installed.ordinary_actions.value().before_attempt_facts,
            &installed.retained.items,
        )
        .map_err(ExecutionError::Activity)
}

pub(crate) type ToolSelection = IndexMap<String, String>;

pub(crate) fn valid_tool_selection(tools: &ToolSelection) -> bool {
    tools.len() == 1
        && tools
            .iter()
            .all(|(role, item)| is_safe_record_id(role) && is_safe_record_id(item))
}

pub(crate) enum ToolRequest<'a> {
    Offer,
    Exact(Option<&'a ToolSelection>),
}

pub(crate) struct Stock {
    _storage: ByteReservation,
    pub amounts: IndexMap<String, u64>,
    pub tool: Option<ToolBinding>,
}

pub(crate) enum MaterialChoice<'a> {
    Available(Stock),
    Missing(&'a Yield),
    MissingTool,
}

/// Prepare only this method's materials from actual accessible inventory.
/// Select exact lots in stable object order against the holds that will remain
/// after replacing the actor's current action. Reserve no items or IDs here.
pub(crate) fn materials<'a>(
    state: &SimulationState,
    actor: &str,
    method: &'a InstalledMethod,
    request: ToolRequest<'_>,
    budget: &ByteBudget,
) -> Result<MaterialChoice<'a>, ExecutionError> {
    let physical = &state.physical;
    let owner = physical
        .entities
        .get(actor)
        .ok_or(ExecutionError::MissingActor)?;
    let role = method.retained_tool.as_ref();
    let exact = match (role, request) {
        (_, ToolRequest::Offer) | (None, ToolRequest::Exact(None)) => None,
        (Some(role), ToolRequest::Exact(Some(items))) if items.len() == 1 => {
            let Some(item) = items.get(&role.role) else {
                return Ok(MaterialChoice::MissingTool);
            };
            Some(item.as_str())
        }
        _ => return Ok(MaterialChoice::MissingTool),
    };
    let mut chosen: Option<(&str, &DefinitionPin)> = None;
    let mut storage = budget
        .reserve(size_of::<Vec<(&Entity, u64)>>() * method.totals.len() + size_of::<Stock>())?;
    let mut lots = vec![Vec::<(&Entity, u64)>::new(); method.totals.len()];
    state
        .inventory
        .visit_owned_until(&physical.entities, actor, actor, &mut |entity, _| {
            let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let tool = role.and_then(|role| {
                exact.is_none_or(|id| id == entity.id).then_some(())?;
                role.allowed_definitions
                    .iter()
                    .find(|pin| *pin == &lot.definition_pin)
                    .map(|pin| (role, pin))
            });
            let material = method
                .totals
                .iter()
                .position(|total| total.definition_id == lot.definition_pin.id);
            if tool.is_none() && material.is_none() {
                return Ok(false);
            }
            let held = physical
                .holds
                .quantity_after_replacement(&entity.id, owner, budget)?;
            let available = lot.quantity.saturating_sub(held);
            if let Some((role, pin)) = tool
                && available >= role.quantity
                && chosen.is_none_or(|(prior, _)| {
                    crate::encoding::js_string_cmp(&entity.id, prior).is_lt()
                })
            {
                chosen = Some((&entity.id, pin));
            }
            if let Some(index) = material.filter(|_| available > 0) {
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(4 * size_of::<(&Entity, u64)>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                lots[index].push((entity, held));
            }
            Ok(false)
        },
    )?;
    let tool = match (role, chosen) {
        (Some(role), Some((item_id, pin))) => {
            let bytes = role.role.len()
                + item_id.len()
                + pin.heap_bytes().ok_or(ExecutionError::Capacity)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(bytes)
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            Some(ToolBinding {
                role: role.role.clone(),
                item_id: item_id.to_owned(),
                definition: pin.clone(),
                quantity: role.quantity,
            })
        }
        (None, None) => None,
        _ => return Ok(MaterialChoice::MissingTool),
    };
    let mut amounts = IndexMap::new();
    for (need, lots) in method.totals.iter().zip(&mut lots) {
        lots.sort_by(|left, right| crate::encoding::js_string_cmp(&left.0.id, &right.0.id));
        let mut remaining = need.quantity;
        for &(entity, held) in lots.iter() {
            let keep = tool
                .as_ref()
                .filter(|tool| tool.item_id == entity.id)
                .map_or(0, |tool| tool.quantity);
            let held = held.saturating_add(keep);
            let lot = entity.item.as_ref().ok_or(ExecutionError::Invariant)?;
            let amount = remaining.min(lot.quantity.saturating_sub(held));
            if crate::execution::can_debit_lot_after_hold(state, entity, amount, held) {
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(
                            entity.id.len()
                                + map_storage::<String, u64>(1).ok_or(ExecutionError::Capacity)?,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                amounts.insert(entity.id.clone(), amount);
                remaining -= amount;
            }
            if remaining == 0 {
                break;
            }
        }
        if remaining > 0 {
            return Ok(MaterialChoice::Missing(need));
        }
    }
    drop(lots);
    storage.resize(
        amounts
            .heap_bytes()
            .and_then(|bytes| bytes.checked_add(tool.heap_bytes()?))
            .and_then(|bytes| bytes.checked_add(size_of::<Stock>()))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    Ok(MaterialChoice::Available(Stock {
        _storage: storage,
        amounts,
        tool,
    }))
}

pub(crate) fn current<'a>(
    definitions: &'a crate::install::RetainedDefinitions,
    action: &Action,
) -> Option<&'a InstalledMethod> {
    definitions
        .manufacture
        .get(action.recipe_id.as_deref()?)
        .filter(|method| action.recipe_pin.as_ref() == Some(&method.pin))
}

/// A kept tool's exact custody and claim must still support the current action.
pub(crate) fn tools_current(
    physical: &PhysicalState,
    actor: &str,
    action: &Action,
    method: &InstalledMethod,
) -> bool {
    match (
        method.retained_tool.as_ref(),
        action.manufacture_tools.as_deref(),
    ) {
        (None, Some([])) => true,
        (Some(role), Some([tool])) => {
            tool.role == role.role
                && tool.quantity == role.quantity
                && role.allowed_definitions.contains(&tool.definition)
                && crate::install::owned_item_ancestry(physical, actor, &tool.item_id, |_| {})
                    .ok()
                    .flatten()
                    .and_then(|entity| entity.item.as_ref())
                    .is_some_and(|lot| {
                        lot.definition_pin == tool.definition && lot.quantity >= tool.quantity
                    })
                && physical.holds.matches_item(
                    actor,
                    &action.id,
                    &crate::item_holds::manufacture_hold_id(&action.id, 0),
                    &tool.item_id,
                    tool.quantity,
                    &tool.definition,
                )
        }
        _ => false,
    }
}

pub(crate) fn valid_saved(
    physical: &PhysicalState,
    definitions: &crate::install::RetainedDefinitions,
    actor: &str,
    action: &Action,
) -> bool {
    current(definitions, action).is_some_and(|method| {
        physical.entities.get(actor).is_some()
            && action.stage == "working"
            && tools_current(physical, actor, action, method)
            && action.target_id.is_none()
            && action.destination.is_none()
            && action.navigation.is_none()
            && action.path.is_empty()
            && action.consumed == method.totals
            && action.total_seconds == method.work_seconds
            && action.remaining_seconds > 0.0
            && action.remaining_seconds <= action.total_seconds
    })
}

heap_record!(Input {
    role,
    definition_id
});
heap_record!(Output { port, definition });
heap_record!(InstalledMethod {
    pin,
    family,
    name,
    description,
    inputs,
    totals,
    outputs,
    retained_tool
});
heap_record!(RetainedRole {
    role,
    allowed_definitions
});
heap_record!(ToolBinding {
    role,
    item_id,
    definition
});
