//! One installed recipe makes a finite set of owned ingredients into products.
//! The command and work owners supply sight, reach, time, and the action journal.
use crate::execution::ExecutionError;
use crate::host::retained_size::{heap_record, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::install::{InstallError, ItemDefinitionRead};
use crate::simulation::SimulationState;
use crate::state::{Action, Entity, Yield};
use crate::text::JsText;
use crate::values::{DefinitionPin, deserialize_safe_integer, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::mem::size_of;
mod choices;
pub(crate) use choices::choices;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Messages {
    pub stale: &'static str,
    pub heat_needed: &'static str,
    pub ingredients_missing: &'static str,
    pub interrupted: &'static str,
    pub out_of_reach: &'static str,
    pub completed_suffix: &'static str,
    pub cost_prefix: &'static str,
    pub cost_suffix: &'static str,
    pub fire_condition: &'static str,
    pub output_prefix: &'static str,
    pub ingredients_prefix: &'static str,
    pub carried_suffix: &'static str,
    pub started: &'static str,
    pub record_capacity: &'static str,
}

pub(crate) fn messages() -> &'static Messages {
    static COPY: std::sync::OnceLock<Messages> = std::sync::OnceLock::new();
    COPY.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../packages/domain/src/food-preparation-messages.json"
        ))
        .expect("shared food preparation wording")
    })
}

// The existing atomic material-group bound from ST04 applies at installation
// and ingress, so a loaded definition can reach the result and storage owners.
const INPUT_LIMIT: usize = 256;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Definition {
    id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    version: u64,
    pub name: JsText,
    pub description: JsText,
    pub inputs: Vec<Ingredient>,
    pub outputs: Vec<Yield>,
    pub work_seconds: f64,
    heat: HeatRequirement,
    pub completed_text: JsText,
}

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
enum HeatRequirement {
    Lit,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Ingredient {
    pub role: String,
    pub definition_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub quantity: u64,
}

pub(crate) struct InstalledPreparation {
    pub pin: DefinitionPin,
    pub definition: Definition,
    items: Vec<DefinitionPin>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Binding {
    pub definition: DefinitionPin,
    #[serde(serialize_with = "crate::encoding::serialize_js_map")]
    pub inputs: IndexMap<String, String>,
    pub items: Vec<DefinitionPin>,
}

pub fn valid_inputs(inputs: &IndexMap<String, String>) -> bool {
    (1..=INPUT_LIMIT).contains(&inputs.len())
        && inputs
            .iter()
            .all(|(role, id)| valid_role(role) && is_safe_record_id(id))
}

fn valid_role(role: &str) -> bool {
    let mut bytes = role.bytes();
    is_safe_record_id(role)
        && bytes.next().is_some_and(|byte| byte.is_ascii_lowercase())
        && bytes.all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'_' | b'-')
        })
}

impl Definition {
    pub(crate) fn install(
        self,
        key: &str,
        canonical: &str,
        items: &IndexMap<String, ItemDefinitionRead>,
        limits: &crate::activity::ActivityLimits,
        budget: &ByteBudget,
    ) -> Result<InstalledPreparation, InstallError> {
        let item_ids = self
            .inputs
            .iter()
            .map(|input| &input.definition_id)
            .chain(self.outputs.iter().map(|output| &output.definition_id));
        let extra = item_ids
            .clone()
            .try_fold(0_usize, |bytes, id| {
                bytes.checked_add(items.get(id).map_or(0, |definition| {
                    // Pins and the one canonical dependency product exist together.
                    4 * (definition.pin.id.len() + definition.pin.digest.len()) + 256
                }))
            })
            .ok_or(InstallError::Capacity)?;
        let _workspace = budget.reserve(extra).map_err(|_| InstallError::Capacity)?;
        let mut roles = HashSet::new();
        let mut products = HashSet::new();
        if self.id != key
            || !is_safe_record_id(key)
            || self.version == 0
            || !self.work_seconds.is_finite()
            || self.work_seconds <= 0.0
            || !matches!(self.heat, HeatRequirement::Lit)
            || [&self.name, &self.description, &self.completed_text]
                .into_iter()
                .any(|text| text.trim_is_empty() || text.units_len() as u64 > limits.text)
            || !(1..=INPUT_LIMIT).contains(&self.inputs.len())
            || self.outputs.is_empty()
            || self.outputs.len() as u64 > limits.outputs
            || self.inputs.iter().any(|input| {
                !valid_role(&input.role)
                    || !roles.insert(input.role.as_str())
                    || input.quantity == 0
                    || !items.contains_key(&input.definition_id)
            })
            || self.outputs.iter().any(|output| {
                output.quantity == 0
                    || !products.insert(output.definition_id.as_str())
                    || items
                        .get(&output.definition_id)
                        .is_none_or(|item| item.is_container() && output.quantity != 1)
            })
        {
            return Err(InstallError::DefinitionBody);
        }
        let ids: indexmap::IndexSet<_> = self
            .inputs
            .iter()
            .map(|input| input.definition_id.as_str())
            .chain(
                self.outputs
                    .iter()
                    .map(|output| output.definition_id.as_str()),
            )
            .collect();
        let pins: Vec<_> = ids.iter().map(|id| items[*id].pin.clone()).collect();

        // Source hashes the sorted dependency vector, while the saved binding
        // records pins in order of first use. Canonical keys use Source order.
        #[derive(Serialize)]
        struct CanonicalPin<'a> {
            digest: &'a str,
            id: &'a str,
            version: u64,
        }
        #[derive(Serialize)]
        struct Meaning<'a> {
            digest: String,
            id: &'a str,
            items: Vec<CanonicalPin<'a>>,
            version: u64,
        }
        let mut sorted: Vec<_> = pins.iter().collect();
        sorted.sort_unstable_by(|a, b| a.id.encode_utf16().cmp(b.id.encode_utf16()));
        let meaning = crate::encoding::json_record(&Meaning {
            digest: crate::encoding::content_label(canonical),
            id: key,
            items: sorted
                .into_iter()
                .map(|pin| CanonicalPin {
                    digest: &pin.digest,
                    id: &pin.id,
                    version: pin.version,
                })
                .collect(),
            version: self.version,
        })
        .map_err(|_| InstallError::DefinitionBody)?;
        let pin = DefinitionPin {
            id: self.id.clone(),
            version: self.version,
            digest: crate::encoding::content_label(&meaning),
        };
        Ok(InstalledPreparation {
            pin,
            definition: self,
            items: pins,
        })
    }
}

impl InstalledPreparation {
    pub(crate) fn binding_bytes(&self, inputs: &IndexMap<String, String>) -> Option<usize> {
        use crate::host::retained_size::{HeapBytes, heap_sum};
        heap_sum([
            size_of::<Binding>(),
            self.pin.heap_bytes()?,
            self.items.heap_bytes()?,
            inputs.heap_bytes()?,
        ])
    }

    pub(crate) fn bind(&self, inputs: IndexMap<String, String>) -> Binding {
        Binding {
            definition: self.pin.clone(),
            inputs,
            items: self.items.clone(),
        }
    }

    pub(crate) fn matches_inputs(&self, inputs: &IndexMap<String, String>) -> bool {
        inputs.len() == self.definition.inputs.len()
            && self
                .definition
                .inputs
                .iter()
                .all(|input| inputs.contains_key(&input.role))
    }

    pub(crate) fn matches(&self, binding: &Binding) -> bool {
        if self.pin != binding.definition
            || !self.matches_inputs(&binding.inputs)
            || !valid_inputs(&binding.inputs)
            || self.items.len() != binding.items.len()
        {
            return false;
        }
        // Produced bindings keep authored order. Load accepts the same set
        // comparison as Source, without trusting duplicate dependency pins.
        self.items == binding.items || self.items.iter().all(|pin| binding.items.contains(pin))
    }
}

pub(crate) fn work_requirements(recipe: &InstalledPreparation) -> Vec<Yield> {
    recipe
        .definition
        .inputs
        .iter()
        .map(|ingredient| Yield {
            definition_id: ingredient.definition_id.clone(),
            quantity: ingredient.quantity,
        })
        .collect()
}

pub(crate) fn requirements_bound(recipe: &InstalledPreparation) -> Option<usize> {
    recipe
        .definition
        .inputs
        .iter()
        .try_fold(0_usize, |bytes, input| {
            bytes.checked_add(size_of::<Yield>() + input.definition_id.len())
        })
}

pub(crate) fn completed_outcome(
    recipe: &InstalledPreparation,
    outputs: Vec<crate::commands::ActivityOutput>,
) -> crate::commands::Outcome {
    let mut message = recipe.definition.name.clone();
    message.push_str(messages().completed_suffix);
    crate::commands::Outcome {
        item_id: (outputs.len() == 1).then(|| outputs[0].item_id.clone()),
        spent: None,
        outputs: Some(outputs),
        ok: true,
        code: "completed".into(),
        message,
        recipe_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}

pub(crate) fn check_completion(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    action: &str,
    recipe: &InstalledPreparation,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    use crate::commands::ActivityOutput;
    let installed = core.state.installed.clone();
    if core
        .state
        .activity
        .active(action)
        .map_err(ExecutionError::Activity)?
        .is_none()
    {
        return Ok(true);
    }
    // The item owner either reuses a current sufficient stack or emits a native
    // identity no longer than this bound. Cross no physical mutation boundary.
    let placeholder = "item-9007199254740991";
    let _workspace = budget.reserve(
        512 + recipe.definition.name.storage_bytes() * 2
            + recipe
                .definition
                .outputs
                .iter()
                .map(|output| {
                    size_of::<ActivityOutput>()
                        + 2 * output.definition_id.len()
                        + 2 * crate::values::MAX_RECORD_ID_UNITS * 4
                })
                .sum::<usize>(),
    )?;
    let mut outputs = Vec::with_capacity(recipe.definition.outputs.len());
    for output in &recipe.definition.outputs {
        let item_id = core
            .carried_stock_target(actor, &output.definition_id, output.quantity)
            .filter(|id| id.len() > placeholder.len())
            .unwrap_or(placeholder);
        outputs.push(ActivityOutput {
            port: output.definition_id.clone(),
            item_id: item_id.into(),
            definition_id: output.definition_id.clone(),
            quantity: output.quantity,
        });
    }
    core.journal
        .activity
        .check_production_finish(
            &mut core.state.activity,
            actor,
            action,
            completed_outcome(recipe, outputs),
            core.state.physical.header.sim_time,
            &installed.ordinary_actions.value().before_attempt_facts,
            &installed.retained.items,
        )
        .map_err(ExecutionError::Activity)
}

pub(crate) fn start_work(
    core: &mut crate::execution::CoreMutation<'_>,
    actor: &str,
    action: &str,
    recipe: &InstalledPreparation,
    debits: crate::execution::OwnedDebits,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let checkpoint = core.journal.activity.checkpoint();
    let prior = core
        .journal
        .activity
        .reached_preparation_work(&mut core.state.activity, actor, action)
        .map_err(ExecutionError::Activity)
        .and_then(|()| core.record_owned_debit_sources(actor, action, &debits));
    let checked = match prior {
        Ok(()) => check_completion(core, actor, action, recipe, budget),
        Err(ExecutionError::Activity(
            crate::activity::ActivityError::Capacity | crate::activity::ActivityError::InvalidFact,
        )) => Ok(false),
        Err(problem) => Err(problem),
    };
    if !checked? {
        core.journal
            .activity
            .rollback_to(&mut core.state.activity, checkpoint)
            .map_err(ExecutionError::Activity)?;
        return Ok(false);
    }
    core.use_owned_lots(actor, action, debits)?;
    Ok(true)
}

fn installed<'a>(
    definitions: &'a crate::install::RetainedDefinitions,
    action: &Action,
) -> Option<&'a InstalledPreparation> {
    let binding = action.food_preparation.as_ref()?;
    definitions
        .preparations
        .get(&binding.definition.id)
        .filter(|recipe| recipe.pin == binding.definition)
}

pub(crate) fn current<'a>(
    state: &'a SimulationState,
    action: &Action,
) -> Option<&'a InstalledPreparation> {
    // The binding's roles and individual item pins are checked at the
    // producer or loader. The composite pin already covers every item.
    installed(&state.installed.retained, action)
}

pub(crate) fn heat<'a>(state: &'a SimulationState, id: &str) -> Option<&'a Entity> {
    state.physical.entities.get(id).filter(|entity| {
        entity.world_position().is_some() && entity.heat.is_some_and(|heat| heat.lit)
    })
}

pub(crate) struct Claims {
    _storage: ByteReservation,
    pub lots: IndexMap<String, u64>,
}

/// Validate a specific permitted lot for every role, including the cumulative
/// quantity when multiple roles select the same lot. Nothing is consumed here.
pub(crate) fn claims(
    state: &SimulationState,
    actor: &str,
    recipe: &InstalledPreparation,
    inputs: &IndexMap<String, String>,
    budget: &ByteBudget,
) -> Result<Option<Claims>, ExecutionError> {
    if !recipe.matches_inputs(inputs) {
        return Ok(None);
    }
    let storage = budget.reserve(
        map_storage::<String, u64>(inputs.len()).ok_or(ExecutionError::Capacity)?
            + inputs.values().map(String::len).sum::<usize>()
            + size_of::<Claims>(),
    )?;
    let mut lots = IndexMap::with_capacity(inputs.len());
    for ingredient in &recipe.definition.inputs {
        let id = inputs[&ingredient.role].as_str();
        let previous = lots.get(id).copied().unwrap_or(0_u64);
        let Some(owned) = crate::install::owned_by(
            &state.physical,
            &state.installed.retained,
            actor,
            id,
        )?
        else {
            return Ok(None);
        };
        let Some(total) = previous.checked_add(ingredient.quantity) else {
            return Ok(None);
        };
        if owned.definition_id != ingredient.definition_id || owned.available_quantity < total {
            return Ok(None);
        }
        if let Some(amount) = lots.get_mut(id) {
            *amount = total;
        } else {
            lots.insert(id.to_owned(), total);
        }
    }
    Ok(Some(Claims {
        _storage: storage,
        lots,
    }))
}

pub(crate) fn valid_saved(
    action: &Action,
    state: &crate::simulation::PhysicalState,
    definitions: &crate::install::RetainedDefinitions,
) -> bool {
    let Some(recipe) = installed(definitions, action) else {
        return false;
    };
    // Heat can go out immediately before the loaded action next advances.
    let heat_exists = action
        .heat_id
        .as_deref()
        .and_then(|id| state.entities.get(id))
        .is_some_and(|entity| entity.heat.is_some());
    heat_exists
        && action
            .food_preparation
            .as_ref()
            .is_some_and(|binding| recipe.matches(binding))
        && action.total_seconds == recipe.definition.work_seconds
        && action.remaining_seconds > 0.0
        && action.remaining_seconds <= action.total_seconds
        && match action.stage.as_str() {
            "approaching" => action.consumed.is_empty(),
            "working" => {
                action.consumed.len() == recipe.definition.inputs.len()
                    && action.consumed.iter().zip(&recipe.definition.inputs).all(
                        |(spent, input)| {
                            spent.definition_id == input.definition_id
                                && spent.quantity == input.quantity
                        },
                    )
            }
            _ => false,
        }
}

heap_record!(Definition {
    id,
    name,
    description,
    inputs,
    outputs,
    completed_text
});
heap_record!(Ingredient {
    role,
    definition_id
});
heap_record!(InstalledPreparation {
    pin,
    definition,
    items
});
heap_record!(Binding {
    definition,
    inputs,
    items
});
