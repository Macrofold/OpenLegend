use super::*;
use openlegend_simulation::{runtime::RuntimeWorldStorage, state::Named};

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

impl PlayerScenePolicy {
    pub(crate) fn encode_inspected_inventory(
        &self,
        read: RuntimeWorldStorage<'_>,
        input: &InventoryPageRequest,
        contact: &str,
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
        let _workspace = budget.reserve(bytes).map_err(|_| Capacity)?;
        let query = JsText::from(input.query.as_deref().map_or("", js_trim)).lowercase();
        let blank = JsText::default();
        let mut items = Vec::new();
        for index in 0..inspected.item_ids.len() {
            let item = read.item(index).map_err(Read)?;
            if (matches!(input.filter, Filter::Equipped) && !item.lot.equipped)
                || (matches!(input.filter, Filter::Containers) && !item.container)
                || (!query.is_empty() && !item.lot.named.name.lowercase().contains(&query))
            {
                continue;
            }
            items.push(Item {
                lot: item.lot,
                art: self.observed.item_art.get(item.lot.definition_id),
                category: item.category,
                description: item.description.unwrap_or(&blank),
                tags: item.properties,
                actions: Vec::new(),
                characteristics: None,
                equipment_conflicts: Vec::new(),
            });
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
