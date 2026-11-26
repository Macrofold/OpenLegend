//! Bind a recorded preparation followed by consumption. A method records a
//! recipe and output port. Only the current stock and a completed command can
//! supply the actual lots used by this invocation.
use crate::commands::{ActivityOutput, NativeCommand};
use crate::execution::ExecutionError;
use crate::food_preparation::InstalledPreparation;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::simulation::InstalledWorld;
use crate::text::JsText;
use indexmap::IndexMap;

pub(crate) struct Meal<'a> {
    pub cook: Preparation<'a>,
    pub eat: Consumption<'a>,
}

pub(crate) struct Preparation<'a> {
    pub key: &'a JsText,
    pub purpose: &'a JsText,
    pub recipe: &'a InstalledPreparation,
    arguments: &'a IndexMap<String, SqlCell>,
    pub heat_role: &'a str,
}

pub(crate) struct Consumption<'a> {
    pub key: &'a JsText,
    pub purpose: &'a JsText,
    step: &'a str,
    port: &'a str,
    quantity: u64,
}

impl<'a> Meal<'a> {
    pub fn from_steps(children: &'a [SqlCell], world: &'a InstalledWorld) -> Option<Self> {
        let [first, second] = children else {
            return None;
        };
        let cook = Preparation::new(first, world)?;
        let eat = Consumption::new(second)?;
        if cook.key.as_unicode()? != eat.step {
            return None;
        }
        let declared = first.get("outputs")?.as_array()?;
        if !declared.iter().any(|output| {
            output.get("port").and_then(SqlCell::as_str) == Some(eat.port)
                && cook.recipe.definition.outputs.iter().any(|yielded| {
                    yielded.definition_id == eat.port
                        && output.get("definitionId").and_then(SqlCell::as_str)
                            == Some(yielded.definition_id.as_str())
                        && output.get("quantity").and_then(SqlCell::as_u64)
                            == Some(yielded.quantity)
                        && yielded.quantity >= eat.quantity
                })
        }) {
            return None;
        }
        Some(Self { cook, eat })
    }
}

fn invoke<'a>(node: &'a SqlCell, command: &str) -> Option<(&'a JsText, &'a JsText)> {
    if node.get("kind")?.as_str()? != "invoke"
        || node.get("command")?.as_str()? != command
        || node.get("requirements").is_some_and(|requirements| {
            requirements
                .as_array()
                .is_none_or(|items| !items.is_empty())
        })
    {
        return None;
    }
    Some((node.get("key")?.as_text()?, node.get("name")?.as_text()?))
}

fn role(argument: &SqlCell) -> Option<&str> {
    (argument.object_len()? == 1).then_some(())?;
    argument.get("role")?.as_str()
}

impl<'a> Preparation<'a> {
    pub fn new(node: &'a SqlCell, world: &'a InstalledWorld) -> Option<Self> {
        let (key, purpose) = invoke(node, "cook")?;
        let arguments = node.get("args")?.as_object()?;
        let literal = |key| {
            let field = arguments.get(key)?;
            (field.object_len()? == 1).then_some(())?;
            field.get("literal")
        };
        let recipe = world
            .retained
            .preparations
            .get(literal("preparationId")?.as_str()?)?;
        if literal("preparationVersion")?.as_u64()? != recipe.pin.version
            || literal("preparationDigest")?.as_str()? != recipe.pin.digest
            || arguments.len() != 4 + recipe.definition.inputs.len()
            || recipe
                .definition
                .inputs
                .iter()
                .any(|ingredient| field_role(arguments, &ingredient.role).is_none())
        {
            return None;
        }
        Some(Self {
            key,
            purpose,
            recipe,
            arguments,
            heat_role: role(arguments.get("heatId")?)?,
        })
    }

    pub fn ingredient_role(&self, ingredient: &str) -> Option<&'a str> {
        field_role(self.arguments, ingredient)
    }

    /// Convert the admitted menu's current heat and lot assignments to the
    /// method's role dictionary. Independent choice custody owns the copy.
    pub fn bind_roles(
        &self,
        heat: &str,
        ingredients: &IndexMap<String, String>,
        budget: &ByteBudget,
    ) -> Result<Option<(SqlCell, ByteReservation)>, ExecutionError> {
        if !self.recipe.matches_inputs(ingredients) {
            return Ok(None);
        }
        let count = ingredients.len() + 1;
        let bytes = self
            .arguments
            .heap_bytes()
            .and_then(|bytes| {
                bytes
                    .checked_add(ingredients.heap_bytes()?.checked_mul(4)?)?
                    .checked_add(map_storage::<String, SqlCell>(count)?)?
                    .checked_add(heat.len().checked_mul(4)?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let mut custody = budget.reserve(bytes)?;
        let mut roles = IndexMap::with_capacity(count);
        roles.insert(self.heat_role.to_owned(), super::normalize::string(heat));
        for (role, lot) in ingredients {
            let key = self
                .ingredient_role(role)
                .ok_or(ExecutionError::Invariant)?;
            if let Some(previous) = roles.get(key) {
                if previous.as_str() != Some(lot.as_str()) {
                    return Ok(None);
                }
            } else {
                roles.insert(key.to_owned(), super::normalize::string(lot.as_str()));
            }
        }
        let bindings = SqlCell::Object(roles);
        custody.resize(bindings.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok(Some((bindings, custody)))
    }

    fn selected<'b>(&self, roles: &'b SqlCell, role: &str) -> Option<&'b str> {
        roles
            .get(role)?
            .as_str()
            .filter(|id| crate::values::is_safe_record_id(id))
    }

    pub fn matches(&self, bindings: &SqlCell, command: &NativeCommand) -> bool {
        let NativeCommand::Cook {
            heat_id,
            definition,
            inputs,
            ..
        } = command
        else {
            return false;
        };
        *definition == self.recipe.pin
            && self.selected(bindings, self.heat_role) == Some(heat_id.as_str())
            && self.recipe.matches_inputs(inputs)
            && inputs.iter().all(|(ingredient, lot)| {
                self.ingredient_role(ingredient)
                    .and_then(|role| self.selected(bindings, role))
                    == Some(lot.as_str())
            })
    }

    pub fn bind(
        &self,
        id: &str,
        actor: &str,
        bindings: &SqlCell,
        budget: &ByteBudget,
    ) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
        let heat = self
            .selected(bindings, self.heat_role)
            .ok_or(ExecutionError::UnsupportedFamily)?;
        let count = self.recipe.definition.inputs.len();
        let bytes = bindings
            .heap_bytes()
            .and_then(|bytes| {
                bytes
                    .checked_add(map_storage::<String, String>(count)?)?
                    .checked_add(self.arguments.heap_bytes()?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let _workspace = budget.reserve(bytes)?;
        let mut inputs = IndexMap::with_capacity(count);
        for ingredient in &self.recipe.definition.inputs {
            let lot = self
                .ingredient_role(&ingredient.role)
                .and_then(|key| self.selected(bindings, key))
                .ok_or(ExecutionError::UnsupportedFamily)?;
            inputs.insert(ingredient.role.clone(), lot.to_owned());
        }
        NativeCommand::learned_preparation(
            id,
            actor,
            self.purpose,
            heat,
            &self.recipe.pin,
            inputs,
            budget,
        )
    }
}

fn field_role<'a>(arguments: &'a IndexMap<String, SqlCell>, ingredient: &str) -> Option<&'a str> {
    arguments.iter().find_map(|(field, value)| {
        (field.strip_prefix("input:")? == ingredient).then_some(())?;
        role(value)
    })
}

impl<'a> Consumption<'a> {
    pub fn new(node: &'a SqlCell) -> Option<Self> {
        let (key, purpose) = invoke(node, "eat")?;
        if node
            .get("outputs")
            .is_some_and(|outputs| outputs.as_array().is_none_or(|items| !items.is_empty()))
        {
            return None;
        }
        let args = node.get("args")?.as_object()?;
        let source = args.get("itemId")?;
        if args.len() != 1 || source.object_len()? != 3 {
            return None;
        }
        let quantity = source.get("quantity")?.as_u64()?;
        (quantity > 0).then_some(())?;
        Some(Self {
            key,
            purpose,
            step: source.get("output")?.as_str()?,
            port: source.get("port")?.as_str()?,
            quantity,
        })
    }

    /// Resolve only the recorded product of this invocation's prerequisite.
    /// An older matching item in the same inventory cannot replace it.
    pub fn product<'b>(&self, outputs: &'b SqlCell) -> Option<&'b str> {
        let mut matches = outputs.get(self.step)?.as_array()?.iter().filter(|output| {
            output.get("port").and_then(SqlCell::as_str) == Some(self.port)
                && output.get("definitionId").and_then(SqlCell::as_str) == Some(self.port)
                && output
                    .get("quantity")
                    .and_then(SqlCell::as_u64)
                    .is_some_and(|quantity| quantity >= self.quantity)
        });
        let output = matches.next()?;
        if matches.next().is_some() {
            return None;
        }
        output
            .get("itemId")?
            .as_str()
            .filter(|id| crate::values::is_safe_record_id(id))
    }

    pub fn matches(&self, outputs: &SqlCell, command: &NativeCommand) -> bool {
        matches!(command, NativeCommand::Eat { item_id, .. }
            if self.product(outputs) == Some(item_id.as_str()))
    }
}

/// Preserve the actual item identity chosen by the ordinary inventory owner.
/// The caller funds this row as part of the plan's atomic result write.
pub(crate) fn produced(output: &ActivityOutput) -> SqlCell {
    super::normalize::object([
        ("port", super::normalize::string(output.port.as_str())),
        ("itemId", super::normalize::string(output.item_id.as_str())),
        (
            "definitionId",
            super::normalize::string(output.definition_id.as_str()),
        ),
        ("quantity", SqlCell::Number(output.quantity.into())),
    ])
}
