//! Published visibility lists keep their existing ordered actor/list rows;
//! replacing a list cannot silently reorder another observer's binding.
use super::*;
use crate::records::{
    MapPositions, OrderedMapRows, RecordSchema, encode_list_changes, encode_map_changes,
};
impl CurrentJournal {
    pub(crate) fn encode_visibility_changes(
        &self,
        state: &ReceptionState,
        before: CurrentCheckpoint,
        schema: &RecordSchema,
        ledger: &RecordLedger,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let changes = self.undo.get(before.operations..).ok_or_else(error)?;
        let count = changes
            .iter()
            .filter(|change| {
                matches!(
                    change,
                    CurrentUndo::Visibility { .. }
                        | CurrentUndo::DeadVisibility { .. }
                        | CurrentUndo::VisiblePlaces { .. }
                )
            })
            .count();
        if count == 0 {
            return Ok(());
        }
        let _selection = budget
            .reserve(
                map_storage::<(&str, bool), Option<&[String]>>(count)
                    .and_then(|bytes| {
                        bytes.checked_add(map_storage::<&str, &IndexMap<String, u64>>(count)?)
                    })
                    .ok_or_else(error)?,
            )
            .map_err(|_| error())?;
        let mut selected = IndexMap::with_capacity(count);
        let mut places = IndexMap::with_capacity(count);
        for change in changes {
            match change {
                CurrentUndo::Visibility {
                    observer,
                    people,
                    prior,
                    ..
                } => {
                    selected
                        .entry((observer.as_str(), *people))
                        .or_insert(prior.as_ref().map(|(_, values)| values.as_slice()));
                }
                CurrentUndo::DeadVisibility {
                    observer,
                    people,
                    prior,
                } => {
                    selected
                        .entry((observer.as_str(), *people))
                        .or_insert(Some(prior.as_slice()));
                }
                CurrentUndo::VisiblePlaces { observer, prior } => {
                    places.entry(observer.as_str()).or_insert(prior);
                }
                _ => {}
            }
        }
        for people in [false, true] {
            let root = if people {
                state.visible_people.as_ref()
            } else {
                state.visible_objects.as_ref()
            };
            let field = if people {
                "visiblePeople"
            } else {
                "visibleObjects"
            };
            let table = if people {
                "mind_visible_people"
            } else {
                "mind_visible_objects"
            };
            let owner_table = if people {
                "mind_visible_people_owners"
            } else {
                "mind_visible_objects_owners"
            };
            let added = selected
                .iter()
                .any(|((_, kind), prior)| *kind == people && prior.is_none());
            let ordered = if added {
                Some(OrderedMapRows::new(root.ok_or_else(error)?, budget)?)
            } else {
                None
            };
            if let Some(ordered) = &ordered {
                for (position, observer, _) in ordered.iter() {
                    let address = SelectedPlacement::new(
                        ledger,
                        owner_table,
                        &["world", field, observer],
                        &["world"],
                        observer,
                        position,
                        selected
                            .get(&(observer, people))
                            .is_some_and(Option::is_none),
                        budget,
                    )?;
                    if address.create()
                        || ledger
                            .placement(owner_table, &address.value().id)
                            .is_some_and(|prior| prior.position != position)
                    {
                        output.write_encoded(
                            owner_table,
                            address.value(),
                            "[]",
                            &[],
                            false,
                            RowEffects::default(),
                        )?;
                    }
                }
            }
            for ((observer, kind), prior) in &selected {
                if *kind != people {
                    continue;
                }
                let after = root
                    .and_then(|root| root.get(*observer))
                    .ok_or_else(error)?;
                encode_list_changes(
                    schema,
                    ledger,
                    table,
                    &["world", field, *observer],
                    None,
                    *prior,
                    Some(after.as_slice()),
                    |_| None,
                    false,
                    output,
                    budget,
                )?;
            }
            if selected.keys().any(|(_, kind)| *kind == people) {
                let _guard = budget
                    .reserve(owner_table.len() + 64 + size_of::<OwnerCoverage>())
                    .map_err(|_| error())?;
                output.observe_owner(&OwnerCoverage {
                    table: owner_table.into(),
                    owner: "[\"world\"]".into(),
                    complete: true,
                    next_ordinal: root.map_or(0, IndexMap::len) as u64,
                    parent_present: root.is_some(),
                })?;
            }
        }
        for (observer, prior) in places {
            let after = state
                .visible_places
                .as_ref()
                .and_then(|root| root.get(observer))
                .ok_or_else(error)?;
            encode_map_changes(
                schema,
                ledger,
                "mind_visible_places",
                &["world", "visiblePlaces", observer],
                None,
                Some(prior),
                Some(after),
                MapPositions::Ordered,
                output,
                budget,
            )?;
        }
        Ok(())
    }
}
