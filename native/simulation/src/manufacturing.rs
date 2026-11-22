//! Known stationary manufacture uses the installed family result, accessible
//! stock, the ordinary inventory journal and the existing action timer.
use crate::execution::ExecutionError;
use crate::host::{
    ByteBudget, ByteReservation,
    retained_size::{HeapBytes, heap_record, map_storage},
};
use crate::install::{InstallError, ItemDefinitionRead, RetainedMap};
use crate::simulation::{PhysicalState, SimulationState};
use crate::state::{Action, Yield};
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
pub(crate) struct Definition<'a> {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    name: JsText,
    description: JsText,
    work_seconds: f64,
    inputs: Vec<Input>,
    outputs: Vec<Output>,
    retained_tools: Vec<serde::de::IgnoredAny>,
    dependency_references: Vec<Dependency>,
    #[serde(borrow)]
    source: &'a RawValue,
    #[serde(rename = "facts")]
    _facts: Vec<serde::de::IgnoredAny>,
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
struct Candidate {
    family: Family,
    name: JsText,
    description: JsText,
    inputs: Vec<Input>,
    output: NamedOutput,
    parameters: EmptyParameters,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Family {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NamedOutput {
    name: JsText,
    description: JsText,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EmptyParameters {}

pub(crate) struct InstalledMethod {
    pub pin: DefinitionPin,
    pub name: JsText,
    pub description: JsText,
    pub work_seconds: f64,
    pub inputs: Vec<Input>,
    pub totals: Vec<Yield>,
    pub outputs: Vec<Output>,
}

/// Source has already canonicalized every nested field. Keep that exact
/// ordering and spelling when dropping only attribution and admission time.
fn mechanical_pin(
    id: String,
    version: u64,
    canonical: &str,
    candidate: &str,
) -> Result<DefinitionPin, InstallError> {
    #[derive(Deserialize)]
    struct Source<'a> {
        #[serde(borrow)]
        candidate: &'a RawValue,
    }
    let mut fields: IndexMap<&str, &RawValue> =
        serde_json::from_str(canonical).map_err(|_| InstallError::DefinitionBody)?;
    let source: Source<'_> = serde_json::from_str(
        fields
            .get("source")
            .ok_or(InstallError::DefinitionBody)?
            .get(),
    )
    .map_err(|_| InstallError::DefinitionBody)?;
    if source.candidate.get() != candidate {
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

impl Definition<'_> {
    pub(crate) fn install(
        self,
        key: &str,
        canonical: &str,
        profile: (&str, u64),
        family_pins: &[DefinitionPin],
        policy_pin: &DefinitionPin,
        items: &IndexMap<String, ItemDefinitionRead>,
        item_rows: &RetainedMap,
    ) -> Result<Option<InstalledMethod>, InstallError> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Origin<'a> {
            kind: &'a str,
            family_pin: Option<DefinitionPin>,
        }
        let origin: Origin<'_> =
            serde_json::from_str(self.source.get()).map_err(|_| InstallError::DefinitionBody)?;
        let Some(family) = origin.family_pin.filter(|_| origin.kind == "family") else {
            return Ok(None);
        };
        let Some(rules) = crate::worlds::base_line_manufacture::selected(profile, &family.id)
        else {
            return Ok(None);
        };
        #[derive(Deserialize)]
        struct Provenance<'a> {
            source: &'a str,
        }
        let provenance: Provenance<'_> = serde_json::from_str(self.provenance.get())
            .map_err(|_| InstallError::DefinitionBody)?;
        if provenance.source != "authored-world" {
            return Ok(None);
        }
        // The exact dependencies and generic recipe body came through the
        // approved installed release. This family still verifies the result
        // fields that can affect a live manufacture or the resulting tool.
        let candidate: Candidate =
            serde_json::from_str(&self.digest).map_err(|_| InstallError::DefinitionBody)?;
        let _empty = candidate.parameters;
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
        let producer: ItemProducer<'_> = serde_json::from_str(
            item_rows
                .get(&output.definition.id)
                .ok_or(InstallError::DefinitionPin)?,
        )
        .map_err(|_| InstallError::DefinitionBody)?;
        if producer.recipe_id != self.id
            || meaning.pin.version != 1
            || meaning.description.as_ref() != Some(&candidate.output.description)
            || !crate::narration::valid_name_parts(&candidate.output.name, None, None)
            || !rules.validates(self.work_seconds, &self.inputs, |id| items.get(id), meaning)
        {
            return Err(InstallError::DefinitionBody);
        }
        let mut counts = IndexMap::<&str, u64>::new();
        for input in &self.inputs {
            let item = items
                .get(&input.definition_id)
                .ok_or(InstallError::DefinitionPin)?;
            if !self
                .dependency_references
                .iter()
                .any(|dep| dep.kind == "item-definition" && dep.pin == item.pin)
            {
                return Err(InstallError::DefinitionPin);
            }
            let count = counts.entry(input.definition_id.as_str()).or_default();
            *count = count
                .checked_add(input.quantity)
                .ok_or(InstallError::DefinitionBody)?;
        }
        let mut policy = false;
        for reference in &self.dependency_references {
            match reference.kind.as_str() {
                "item-definition"
                    if items
                        .get(&reference.pin.id)
                        .is_some_and(|item| item.pin == reference.pin) => {}
                "item-handling-policy" if !policy && reference.pin == *policy_pin => policy = true,
                _ => return Err(InstallError::DefinitionPin),
            }
        }
        if !policy {
            return Err(InstallError::DefinitionPin);
        }
        let totals = counts
            .into_iter()
            .map(|(id, quantity)| Yield {
                definition_id: id.into(),
                quantity,
            })
            .collect();
        Ok(Some(InstalledMethod {
            pin: mechanical_pin(self.id, self.version, canonical, &self.digest)?,
            name: self.name,
            description: self.description,
            work_seconds: self.work_seconds,
            inputs: self.inputs,
            totals,
            outputs: self.outputs,
        }))
    }
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

pub(crate) struct Stock {
    _storage: ByteReservation,
    pub amounts: IndexMap<String, u64>,
}

pub(crate) enum MaterialChoice<'a> {
    Available(Stock),
    Missing(&'a Yield),
}

/// Prepare only this method's materials from actual accessible inventory.
/// Select exact lots in stable object order and buy no outputs or IDs.
pub(crate) fn materials<'a>(
    state: &SimulationState,
    actor: &str,
    method: &'a InstalledMethod,
    budget: &ByteBudget,
) -> Result<MaterialChoice<'a>, ExecutionError> {
    let installed = &state.installed;
    let retained = &installed.retained;
    let mut storage =
        budget.reserve(size_of::<Vec<(&str, u64)>>() * method.totals.len() + size_of::<Stock>())?;
    let mut lots = vec![Vec::<(&str, u64)>::new(); method.totals.len()];
    state.inventory.visit_owned(
        &state.physical,
        retained,
        actor,
        actor,
        &mut |item| {
            if let Some(index) = method
                .totals
                .iter()
                .position(|total| total.definition_id == item.definition_id)
            {
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(4 * size_of::<(&str, u64)>())
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                lots[index].push((item.id, item.available_quantity));
            }
            Ok(())
        },
    )?;
    let mut amounts = IndexMap::new();
    for (need, lots) in method.totals.iter().zip(&mut lots) {
        lots.sort_by(|left, right| crate::encoding::js_string_cmp(left.0, right.0));
        let mut remaining = need.quantity;
        for (id, free) in lots.iter() {
            let amount = remaining.min(*free);
            if amount > 0 {
                storage.resize(
                    storage
                        .bytes()
                        .checked_add(
                            id.len()
                                + map_storage::<String, u64>(1).ok_or(ExecutionError::Capacity)?,
                        )
                        .ok_or(ExecutionError::Capacity)?,
                )?;
                amounts.insert((*id).into(), amount);
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
    Ok(MaterialChoice::Available(Stock {
        _storage: storage,
        amounts,
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

pub(crate) fn valid_saved(
    physical: &PhysicalState,
    definitions: &crate::install::RetainedDefinitions,
    actor: &str,
    action: &Action,
) -> bool {
    current(definitions, action).is_some_and(|method| {
        physical.entities.get(actor).is_some()
            && action.stage == "working"
            && action.manufacture_tools == Some([])
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
    name,
    description,
    inputs,
    totals,
    outputs
});
