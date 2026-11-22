use super::*;
use crate::player_scene::self_view::recipes::Recipe;
use indexmap::IndexMap;
use openlegend_simulation::{
    host::map_storage,
    runtime::{InspectedRecipeRecord, RuntimeWorldStorage},
    state::Named,
};
use std::sync::LazyLock;

#[derive(Serialize)]
struct ReadPage<'a> {
    ok: bool,
    container: ReadRoot<'a>,
    breadcrumbs: [ReadRoot<'a>; 1],
    items: Vec<Item<'a>>,
    inspection: Inspection<'a>,
}

#[derive(Clone, Copy, Serialize)]
struct ReadRoot<'a> {
    id: &'a str,
    #[serde(flatten)]
    name: &'a Named,
    revision: u64,
}

#[derive(Serialize)]
struct Inspection<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    next: Option<InspectionCommand<'a>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InspectionCommand<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    container_id: &'a str,
    after: &'a str,
    expected_revision: u64,
    expected_scope: &'a JsText,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecordCopy {
    learn_label: &'static str,
    control_required: &'static str,
    paused: &'static str,
    unavailable: &'static str,
}
static RECORD_COPY: LazyLock<RecordCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../../packages/domain/src/recipe-record-copy.json"
    ))
    .expect("recipe record wording")
});

pub(super) fn learn_action<'a>(
    item: OwnedItem<'a>,
    record_pin: &'a openlegend_simulation::values::DefinitionPin,
    paused: bool,
    controlling: bool,
    can_learn: impl FnOnce() -> Result<bool, RuntimeError>,
) -> Result<Action<'a>, InventoryPageError> {
    let reason = if paused {
        Some(RECORD_COPY.paused)
    } else if !controlling {
        Some(RECORD_COPY.control_required)
    } else {
        (!can_learn().map_err(InventoryPageError::Read)?).then_some(RECORD_COPY.unavailable)
    };
    Ok(Action {
        id: format!("learn-record-{}", item.id),
        label: RECORD_COPY.learn_label,
        command: ItemCommand {
            kind: "learn-record",
            item_id: item.id,
            target_id: None,
            target_revision: None,
            expected_revision: Some(item.revision),
            placement_revision: Some(item.placement_revision),
            quantity: None,
            record_pin: Some(record_pin),
            inventory_group: None,
        },
        enabled: reason.is_none(),
        reason,
    })
}

impl RecipeRecord {
    pub(super) fn available(method: Recipe, known: bool) -> Self {
        Self {
            method: Some(InspectedRecipe(method)),
            message: if known {
                "This exact method is already known."
            } else {
                "This record describes one installed method. Reading it grants no items or knowledge."
            },
        }
    }

    pub(super) const fn unavailable() -> Self {
        Self {
            method: None,
            message: "The exact method on this record is no longer available.",
        }
    }
}

/// Fund the temporary stock index before collecting current quantities. The
/// selected views reuse it until their ingredient counts are prepared.
pub(super) fn recipe_stock<'a>(
    budget: &ByteBudget,
    definitions: impl Iterator<Item = &'a str> + Clone,
    tally: impl FnOnce(&mut IndexMap<&'a str, u64>) -> Result<(), RuntimeError>,
) -> Result<(IndexMap<&'a str, u64>, ByteReservation), InventoryPageError> {
    use InventoryPageError::{Capacity, Read};
    let count = definitions.clone().count();
    let custody = budget
        .reserve(map_storage::<&str, u64>(count).ok_or(Capacity)?)
        .map_err(|_| Capacity)?;
    let mut stock = IndexMap::with_capacity(count);
    stock.extend(definitions.map(|definition| (definition, 0)));
    tally(&mut stock).map_err(Read)?;
    Ok((stock, custody))
}

impl PlayerScenePolicy {
    pub(crate) fn encode_inspected_inventory(
        &self,
        read: RuntimeWorldStorage<'_>,
        input: &InventoryPageRequest,
        contact: &str,
        controlling: bool,
        language: &LanguageProvider,
        budget: &ByteBudget,
    ) -> Result<Bytes, InventoryPageError> {
        use InventoryPageError::{Capacity, Read, Stale};
        if input.cursor.is_some() {
            return Err(Stale);
        }
        let inspected = read.inspection.ok_or(Stale)?;
        let bytes = inspected
            .item_names
            .iter()
            .try_fold(16_384_usize, |total, item| {
                total.checked_add(item.name.storage_bytes().checked_mul(8)?)
            })
            .ok_or(Capacity)?;
        let mut workspace = budget.reserve(bytes).map_err(|_| Capacity)?;
        let query = JsText::from(input.query.as_deref().map_or("", js_trim)).lowercase();
        let blank = JsText::default();
        let mut items = Vec::new();
        let mut selected_methods = Vec::new();
        let mut can_learn = None;
        for index in 0..inspected.item_ids.len() {
            let item = read.item(index).map_err(Read)?;
            if (matches!(input.filter, Filter::Equipped) && !item.lot.equipped)
                || (matches!(input.filter, Filter::Containers) && !item.container)
                || (!query.is_empty() && !item.lot.named.name.lowercase().contains(&query))
            {
                continue;
            }
            let mut actions = Vec::new();
            let recipe_record = match item.recipe_record {
                Some(InspectedRecipeRecord::Available {
                    recipe_id,
                    known,
                    record_pin,
                }) => {
                    let template = self.self_view.authored_recipe(recipe_id).ok_or_else(|| {
                        Read(RuntimeError::application_refused(
                            "Installed recipe presentation unavailable",
                        ))
                    })?;
                    selected_methods.push((items.len(), template, known));
                    actions.push(learn_action(
                        item.lot,
                        record_pin,
                        read.paused,
                        controlling,
                        || {
                            if let Some(eligible) = can_learn {
                                return Ok(eligible);
                            }
                            let eligible = read.can_learn()?;
                            can_learn = Some(eligible);
                            Ok(eligible)
                        },
                    )?);
                    None
                }
                Some(InspectedRecipeRecord::Unavailable) => Some(RecipeRecord::unavailable()),
                None => None,
            };
            items.push(Item {
                lot: item.lot,
                individual: item.lot.individual,
                art: self.observed.item_art.get(item.lot.definition_id),
                category: item.category,
                description: item.description.unwrap_or(&blank),
                tags: item.properties,
                actions,
                characteristics: None,
                equipment_conflicts: Vec::new(),
                recipe_record,
                group: None,
            });
        }
        if !selected_methods.is_empty() {
            let definitions = selected_methods
                .iter()
                .flat_map(|(_, template, _)| template.stock_definitions());
            let (stock, _stock) =
                recipe_stock(budget, definitions, |stock| read.tally_recipe_stock(stock))?;
            for (index, template, known) in selected_methods {
                let method =
                    Recipe::prepare(template, &stock, &mut workspace).map_err(|_| Capacity)?;
                items[index].recipe_record = Some(RecipeRecord::available(method, known));
            }
        }
        match input.sort {
            Sort::Native => {}
            Sort::QuantityDesc => items.sort_by_key(|item| std::cmp::Reverse(item.lot.quantity)),
            Sort::NameAsc | Sort::NameDesc => {
                let names = items
                    .iter()
                    .map(|item| item.lot.named.name.clone())
                    .collect::<Vec<_>>();
                let ranks = collation_ranks(language, &names)?;
                let mut items_rank = items.into_iter().zip(ranks).collect::<Vec<_>>();
                if matches!(input.sort, Sort::NameDesc) {
                    items_rank.sort_by_key(|(_, rank)| std::cmp::Reverse(*rank));
                } else {
                    items_rank.sort_by_key(|(_, rank)| *rank);
                }
                items = items_rank.into_iter().map(|(item, _)| item).collect();
            }
        }
        let root = ReadRoot {
            id: contact,
            name: &inspected.container_name,
            revision: inspected.revision,
        };
        crate::wire::encode(
            &ReadPage {
                ok: true,
                container: root,
                breadcrumbs: [root],
                items,
                inspection: Inspection {
                    next: inspected.more.then_some(InspectionCommand {
                        kind: "inspect-inventory",
                        container_id: contact,
                        after: &inspected.after,
                        expected_revision: inspected.revision,
                        expected_scope: &inspected.scope,
                    }),
                },
            },
            b"",
            b"",
            budget,
        )
        .map_err(|_| Capacity)
    }
}
