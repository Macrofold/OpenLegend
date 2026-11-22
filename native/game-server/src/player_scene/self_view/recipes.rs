//! Recipe descriptions ship with the installed presentation. Ingredient
//! counts come from the same accepted, actor-scoped inventory as the view.
use super::{PublicArt, SceneError};
use indexmap::IndexMap;
use openlegend_simulation::{host::ByteReservation, text::JsText};
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::{mem::size_of, sync::Arc};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Details {
    id: String,
    name: JsText,
    description: JsText,
    family: JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<Box<RawValue>>,
    outputs: Box<RawValue>,
    facts: Box<RawValue>,
    limitations: Box<RawValue>,
    work_seconds: f64,
    origin: String,
    provenance: JsText,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct IngredientWords {
    name: JsText,
    quantity: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    art: Option<PublicArt>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Ingredient {
    definition_id: String,
    view: IngredientWords,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ToolChoice {
    definition_id: String,
    name: JsText,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Tool {
    role: String,
    quantity: u64,
    choices: Vec<ToolChoice>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RecipeTemplate {
    details: Details,
    ingredients: Vec<Ingredient>,
    retained_tools: Vec<Tool>,
}

/// Only the current quantities are owned by this view. Authored descriptions
/// stay shared and identical while the installed presentation remains active.
pub struct Recipe {
    template: Arc<RecipeTemplate>,
    available: Vec<u64>,
}

impl Recipe {
    pub(super) fn prepare(
        template: &Arc<RecipeTemplate>,
        inventory: &IndexMap<&str, u64>,
        custody: &mut ByteReservation,
    ) -> Result<Self, SceneError> {
        let definitions = template
            .ingredients
            .iter()
            .map(|item| item.definition_id.as_str())
            .chain(template.retained_tools.iter().flat_map(|tool| {
                tool.choices
                    .iter()
                    .map(|choice| choice.definition_id.as_str())
            }));
        let count = definitions.clone().count();
        let bytes = count
            .checked_mul(size_of::<u64>())
            .and_then(|bytes| custody.bytes().checked_add(bytes))
            .ok_or(SceneError::Capacity)?;
        custody.resize(bytes)?;
        let mut available = Vec::new();
        available
            .try_reserve_exact(count)
            .map_err(|_| SceneError::Capacity)?;
        available
            .extend(definitions.map(|definition| inventory.get(definition).copied().unwrap_or(0)));
        Ok(Self {
            template: template.clone(),
            available,
        })
    }
}

impl PartialEq for Recipe {
    fn eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.template, &other.template) && self.available == other.available
    }
}

// Serializer passes borrow the item words and stored counts directly.
struct Rows<I>(I);
impl<I> Serialize for Rows<I>
where
    I: Iterator + Clone,
    I::Item: Serialize,
{
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_seq(self.0.clone())
    }
}

impl Serialize for Recipe {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct IngredientView<'a> {
            #[serde(flatten)]
            words: &'a IngredientWords,
            available: u64,
        }
        #[derive(Serialize)]
        struct ToolChoiceView<'a> {
            name: &'a JsText,
            available: u64,
        }
        #[derive(Serialize)]
        struct ToolView<'a, C> {
            role: &'a str,
            quantity: u64,
            choices: C,
        }
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct View<'a, I, T> {
            #[serde(flatten)]
            details: &'a Details,
            ingredients: I,
            retained_tools: T,
        }
        let template = &self.template;
        let (ingredient_stock, tool_stock) = self.available.split_at(template.ingredients.len());
        let ingredients =
            template
                .ingredients
                .iter()
                .zip(ingredient_stock)
                .map(|(ingredient, available)| IngredientView {
                    words: &ingredient.view,
                    available: *available,
                });
        let mut index = 0;
        let retained_tools = template.retained_tools.iter().map(move |tool| {
            let end = index + tool.choices.len();
            let available = &tool_stock[index..end];
            index = end;
            ToolView {
                role: &tool.role,
                quantity: tool.quantity,
                choices: Rows(
                    tool.choices
                        .iter()
                        .zip(available)
                        .map(|(choice, available)| ToolChoiceView {
                            name: &choice.name,
                            available: *available,
                        }),
                ),
            }
        });
        View {
            details: &template.details,
            ingredients: Rows(ingredients),
            retained_tools: Rows(retained_tools),
        }
        .serialize(serializer)
    }
}
