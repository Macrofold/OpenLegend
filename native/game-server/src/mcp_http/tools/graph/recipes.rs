//! The installed recipe relationships shared by both neighborhood directions.
//! The visitor borrows only the declared links, so searching for consumers
//! need not prepare public bodies or versions of unrelated recipes.

use super::{Failure, MAX_LINKS, find};
use openlegend_simulation::{encoding::json_tree_allocation_bound, host::ByteBudget};
use serde::Deserialize;
use serde_json::value::RawValue;
use std::{collections::HashSet, mem::size_of};
use tokio_util::sync::CancellationToken;

pub(super) enum Target<'a> {
    Definition(&'a str, &'a str),
    Dependency(&'a str, Pin<'a>),
    Family(Pin<'a>),
    Base(Base<'a>),
}

pub(super) struct Link<'a> {
    pub target: Target<'a>,
    pub relation: &'static str,
    pub role: Option<&'a str>,
    pub quantity: Option<u64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Recipe<'a> {
    #[serde(borrow)]
    inputs: Vec<InputMaterial<'a>>,
    #[serde(borrow)]
    outputs: Vec<OutputMaterial<'a>>,
    #[serde(borrow, rename = "dependencyReferences")]
    dependencies: Vec<Dependency<'a>>,
    #[serde(borrow)]
    source: RecipeSource<'a>,
    #[serde(borrow)]
    provenance: Provenance<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InputMaterial<'a> {
    definition_id: &'a str,
    role: &'a str,
    quantity: u64,
}

#[derive(Deserialize)]
struct OutputMaterial<'a> {
    #[serde(borrow)]
    definition: Id<'a>,
    port: &'a str,
    quantity: u64,
}

#[derive(Deserialize)]
struct Id<'a> {
    id: &'a str,
}

#[derive(Deserialize)]
struct Dependency<'a> {
    kind: &'a str,
    #[serde(borrow)]
    pin: Pin<'a>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecipeSource<'a> {
    #[serde(borrow)]
    family_pin: Option<Pin<'a>>,
}

#[derive(Clone, Copy, Deserialize)]
pub(super) struct Pin<'a> {
    pub id: &'a str,
    pub version: u64,
    pub digest: &'a str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Provenance<'a> {
    source: &'a str,
    #[serde(borrow)]
    derived_from: Option<Base<'a>>,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Base<'a> {
    pub recipe_id: &'a str,
    version: u64,
    #[serde(borrow)]
    pub digest: &'a RawValue,
}

#[derive(Deserialize)]
pub(super) struct ExactBase<'a> {
    version: u64,
    #[serde(borrow)]
    digest: &'a RawValue,
}

impl Base<'_> {
    pub(super) fn matches(&self, saved: &ExactBase<'_>) -> bool {
        self.version == saved.version && self.digest.get() == saved.digest.get()
    }
}

pub(super) fn exact_base(source: &str) -> Result<ExactBase<'_>, Failure> {
    serde_json::from_str(source).map_err(|_| Failure::Unavailable)
}

pub(super) fn visit<'a>(
    source: &'a str,
    budget: &ByteBudget,
    stopped: &CancellationToken,
    mut consume: impl FnMut(Link<'a>) -> Result<(), Failure>,
) -> Result<usize, Failure> {
    let bound = json_tree_allocation_bound(source).ok_or(Failure::Capacity)?;
    let _parse = budget.reserve(bound).map_err(|_| Failure::Capacity)?;
    let recipe: Recipe<'a> = serde_json::from_str(source).map_err(|_| Failure::Unavailable)?;
    let count = recipe
        .inputs
        .len()
        .checked_add(recipe.outputs.len())
        .and_then(|count| count.checked_add(recipe.dependencies.len()))
        .and_then(|count| count.checked_add(2))
        .filter(|count| *count <= MAX_LINKS)
        .ok_or(Failure::Capacity)?;
    let _duplicates = budget
        .reserve(128 + 4 * recipe.inputs.len() * size_of::<&str>())
        .map_err(|_| Failure::Capacity)?;
    let inputs: HashSet<_> = recipe
        .inputs
        .iter()
        .map(|input| input.definition_id)
        .collect();
    let mut emit = |target, relation, role, quantity| {
        find::ensure_current(stopped)?;
        consume(Link {
            target,
            relation,
            role,
            quantity,
        })
    };
    for input in recipe.inputs {
        emit(
            Target::Definition("item-definition", input.definition_id),
            "requires",
            Some(input.role),
            Some(input.quantity),
        )?;
    }
    for output in recipe.outputs {
        emit(
            Target::Definition("item-definition", output.definition.id),
            "produces",
            Some(output.port),
            Some(output.quantity),
        )?;
    }
    for dependency in recipe.dependencies {
        if dependency.kind == "item-definition" && inputs.contains(dependency.pin.id) {
            continue;
        }
        emit(
            Target::Dependency(dependency.kind, dependency.pin),
            "uses",
            Some("family-dependency"),
            None,
        )?;
    }
    if let Some(pin) = recipe.source.family_pin {
        emit(Target::Family(pin), "implements", None, None)?;
    }
    if let Some(base) = recipe
        .provenance
        .derived_from
        .filter(|_| recipe.provenance.source != "authored-world")
    {
        emit(Target::Base(base), "derives_from", None, None)?;
    }
    Ok(count)
}
