//! Prepare ordinary cooking from visible heat and the actor's own stock.
//! The existing command preview and execution own reach, holds and effects.
use super::*;
use crate::text::JsText;
use indexmap::IndexMap;

struct RecipeChoice {
    recipe: usize,
    ingredients: IndexMap<String, String>,
}

pub(super) struct CookingChoices {
    recipes: Vec<RecipeChoice>,
    _storage: ByteReservation,
}

impl CookingChoices {
    fn prepare(
        core: &CoreMutation<'_>,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let choices = crate::food_preparation::choices(core.state, actor, None, budget)?;
        let definitions = &core.state.installed.retained.preparations;
        let mut count = 0usize;
        let bytes = choices
            .rows
            .iter()
            .filter_map(|choice| choice.inputs.as_ref())
            .try_fold(0usize, |total, inputs| {
                count += 1;
                total
                    .checked_add(size_of::<RecipeChoice>())?
                    .checked_add(inputs.heap_bytes()?)
            })
            .ok_or(ExecutionError::Capacity)?;
        let storage = budget.reserve(bytes)?;
        let mut recipes = Vec::with_capacity(count);
        for choice in choices.rows {
            if let Some(ingredients) = choice.inputs {
                recipes.push(RecipeChoice {
                    recipe: definitions
                        .get_index_of(&choice.recipe.pin.id)
                        .ok_or(ExecutionError::Invariant)?,
                    ingredients,
                });
            }
        }
        Ok(Self {
            recipes,
            _storage: storage,
        })
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CookCommand<'a> {
    actor_id: &'a str,
    id: &'a str,
    #[serde(rename = "type")]
    kind: &'static str,
    heat_id: &'a str,
    preparation_id: &'a str,
    preparation_version: u64,
    preparation_digest: &'a str,
    inputs: &'a IndexMap<String, String>,
}

impl NpcCandidateCursor {
    pub(super) fn offer_cooking(
        &mut self,
        core: &mut CoreMutation<'_>,
        from: usize,
        recipe_index: usize,
        preparation_id: &str,
    ) -> Result<(), ExecutionError> {
        let Some((index, target)) = self
            .targets
            .iter()
            .enumerate()
            .skip(from)
            .find(|(_, target)| target.visible && target.heat_lit)
        else {
            self.cooking = None;
            self.stage = Enumerate::Strike(0, 0);
            return Ok(());
        };
        if self.cooking.is_none() {
            self.cooking = Some(CookingChoices::prepare(core, &self.actor, &self.budget)?);
        }
        let choices = self.cooking.as_ref().ok_or(ExecutionError::Invariant)?;
        if choices.recipes.is_empty() {
            self.cooking = None;
            self.stage = Enumerate::Strike(0, 0);
            return Ok(());
        }
        let Some(choice) = choices.recipes.get(recipe_index) else {
            self.stage = Enumerate::Cook(index + 1, 0);
            return Ok(());
        };
        let (_, recipe) = core
            .state
            .installed
            .retained
            .preparations
            .get_index(choice.recipe)
            .ok_or(ExecutionError::Invariant)?;
        self.stage = Enumerate::Cook(index, recipe_index + 1);
        let body = target.body;
        let (command, guard) = self.command(&CookCommand {
            actor_id: &self.actor,
            id: preparation_id,
            kind: "cook",
            heat_id: &target.id,
            preparation_id: &recipe.pin.id,
            preparation_version: recipe.pin.version,
            preparation_digest: &recipe.pin.digest,
            inputs: &choice.ingredients,
        })?;
        let _digest = self.budget.reserve(64)?;
        let digest = crate::encoding::sha256_hex(command.source_encoding().as_bytes());
        let id = self.id(&["cook-", &digest])?;
        self.start(
            core,
            id,
            NpcOfferMeaning::Cook { body },
            command,
            guard,
            WorkTransitionMode::Replace,
        )
    }

    pub(super) fn describe_cooking(
        &self,
        core: &CoreMutation<'_>,
        offer: &mut PreparedNpcOffer,
    ) -> Result<(), ExecutionError> {
        let NpcOfferMeaning::Cook { body } = offer.meaning else {
            return Ok(());
        };
        let Some(NativeCommand::Cook { definition, .. }) = &offer.command else {
            return Err(ExecutionError::Invariant);
        };
        let recipe = &core
            .state
            .installed
            .retained
            .preparations
            .get(&definition.id)
            .ok_or(ExecutionError::Invariant)?
            .definition;
        let heat = self
            .description_context
            .as_ref()
            .and_then(|context| context.observed_name(body))
            .ok_or(ExecutionError::Invariant)?;
        let mut custody = self.budget.reserve(super::casting::text_bound([
            &recipe.name,
            heat,
            &recipe.description,
        ])?)?;
        let description = JsText::concat(&[
            &recipe.name,
            &" at ".into(),
            heat,
            &". ".into(),
            &recipe.description,
        ]);
        custody.resize(description.storage_bytes())?;
        offer._storage.merge(custody)?;
        offer.description = Some(description);
        Ok(())
    }
}
