//! Personal scalar choices come from the same selected actor and world used by
//! the command. Each value keeps its dependent parent and its own display label.
use super::*;
use crate::execution::ExecutionError;
use crate::host::{ByteBudget, retained_size::HeapBytes};
use crate::text::JsText;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FormValue {
    pub request: String,
    pub field: String,
    pub value: String,
    pub label: JsText,
    pub parent: Option<(String, String)>,
    pub kind: String,
}
impl HeapBytes for FormValue {
    fn heap_bytes(&self) -> Option<usize> {
        crate::host::retained_size::heap_sum([
            self.request.heap_bytes()?,
            self.field.heap_bytes()?,
            self.value.heap_bytes()?,
            self.label.heap_bytes()?,
            self.parent
                .as_ref()
                .map_or(0, |(field, value)| field.capacity() + value.capacity()),
            self.kind.heap_bytes()?,
        ])
    }
}
impl FormValue {
    pub(crate) fn permits(
        &self,
        request: &str,
        field: &str,
        value: &str,
        parents: &IndexMap<String, SqlCell>,
    ) -> bool {
        self.request == request
            && self.field == field
            && self.value == value
            && self.parent.as_ref().is_none_or(|(key, expected)| {
                parents.get(key).and_then(SqlCell::as_str) == Some(expected.as_str())
            })
    }
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(form) = state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .installed_requests
            .iter()
            .find(|r| r.id == self.request)
        else {
            return Ok(false);
        };
        let mut parents = IndexMap::new();
        if let Some((key, value)) = &self.parent {
            parents.insert(key.clone(), SqlCell::from(value.as_str()));
        }
        let mut found = false;
        visit(
            state,
            actor,
            form,
            &self.field,
            &parents,
            budget,
            |value, label, parent| {
                found |= self.value == value
                    && &self.label == label
                    && self.parent.as_ref().map(|(k, v)| (k.as_str(), v.as_str())) == parent;
                Ok(())
            },
        )?;
        Ok(found)
    }
}

pub(crate) fn sourced(form: &InstalledRequest, field: &str) -> bool {
    form.fields
        .get(field)
        .is_some_and(|f| f.kind == FieldKind::Definition || is_remembered_place(field, f))
        || matches!(
            (form.id.as_str(), field),
            ("base:release-current-shot", "aimId")
                | ("base:treat-own-scar", "scarId")
                | ("base:request-coaching", "attributeId")
                | ("base:place-fire", "site")
        )
        || outings::supports(&form.id) && matches!(field, "agreement" | "offer" | "outputPort")
}

pub(crate) fn visit(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    field: &str,
    parents: &IndexMap<String, SqlCell>,
    budget: &ByteBudget,
    mut emit: impl FnMut(&str, &JsText, Option<(&str, &str)>) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    if outings::supports(&form.id) {
        return outings::visit_choices(state, actor, form, field, parents, budget, emit);
    }
    let body = state
        .physical
        .entities
        .get(actor)
        .and_then(|e| e.actor.as_ref())
        .ok_or(ExecutionError::MissingActor)?;
    match (form.id.as_str(), field) {
        ("base:teach-method" | "base:repeat-craft", "recipeId") => {
            for id in state.learned_capabilities.known_recipes(actor) {
                if let Some(recipe) = state.installed.retained.manufacture.get(id) {
                    emit(id, &recipe.name, None)?;
                }
            }
        }
        ("base:release-current-shot", "aimId") => {
            if let Some(action) = body
                .action
                .as_ref()
                .filter(|action| action.ranged.is_some())
            {
                emit(&action.id, &"Your current prepared shot".into(), None)?;
            }
        }
        ("base:request-coaching", "attributeId") => {
            if let Some(practice) = &body.practice {
                for id in practice.keys() {
                    if let Some(attr) = state
                        .installed
                        .attributes
                        .get(id)
                        .filter(|attr| attr.value().practice.is_some())
                    {
                        emit(id, &attr.value().name.as_str().into(), None)?;
                    }
                }
            }
        }
        ("base:treat-own-scar", "scarId") => {
            if let Some((policy, _)) = crate::body::scar_treatment::installed(state) {
                for scar in &policy.scars {
                    if body
                        .scars
                        .as_ref()
                        .and_then(|scars| scars.get(&scar.id))
                        .is_some_and(|v| *v > 0.)
                    {
                        emit(&scar.id, &scar.name.as_str().into(), None)?;
                    }
                }
            }
        }
        (
            "base:transfer-stock" | "base:eat-meal" | "base:fire-watch" | "base:camp-supply-method",
            "definitionId",
        ) => {
            let mut visited = indexmap::IndexSet::<(&str, &str)>::new();
            let mut workspace = budget.reserve(0)?;
            let mut record = |id: &str, source: &str| -> Result<(), ExecutionError> {
                let Some(entity) = state.physical.entities.get(id) else {
                    return Ok(());
                };
                let Some(lot) = &entity.item else {
                    return Ok(());
                };
                let Some(def) = state
                    .installed
                    .retained
                    .items
                    .get(&lot.definition_pin.id)
                    .filter(|def| def.portable)
                else {
                    return Ok(());
                };
                if parents
                    .get("sourceId")
                    .and_then(SqlCell::as_str)
                    .is_some_and(|v| v != source)
                {
                    return Ok(());
                }
                // IDs and labels already belong to the selected actor's bounded
                // custody or inspected page. Each material appears once per source.
                let key = (
                    &def.pin.id[..],
                    state
                        .physical
                        .entities
                        .get(source)
                        .ok_or(ExecutionError::Invariant)?
                        .id
                        .as_str(),
                );
                if visited.contains(&key) {
                    return Ok(());
                }
                workspace.resize(workspace.bytes() + std::mem::size_of::<(&str, &str)>() * 4)?;
                visited.insert(key);
                emit(&def.pin.id, &def.named.name, Some(("sourceId", source)))
            };
            let mut count = 0;
            state.inventory.visit_owned_until(
                &state.physical.entities,
                actor,
                actor,
                &mut |entity, _| {
                    count += 1;
                    record(&entity.id, actor)?;
                    Ok(count >= crate::install::inventory_display_limit())
                },
            )?;
            if let Some(world) =
                crate::ground_items::inspection::WorldStorage::inspected_selection(state, actor)
                && let Some(page) = world.inspection(budget)?
            {
                for item in &page.item_ids {
                    record(item, &world.container.id)?;
                }
            }
        }
        _ => {}
    }
    Ok(())
}

/// Keep only hashes of the exact disclosed values in durable diagnostics.
/// When reopening a capture, visit the actor's current sources once per field.
/// A visible subset can shrink independently of other people or possessions.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct FormSource {
    request: String,
    field: String,
    entries: std::collections::BTreeSet<String>,
}
fn digest(
    value: &str,
    label: &JsText,
    parent: Option<(&str, &str)>,
    budget: &ByteBudget,
) -> Result<String, ExecutionError> {
    let record = (value, label, parent);
    let bytes = crate::encoding::json_record_len(&record).map_err(|_| ExecutionError::Invariant)?;
    let _temp = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let serialized =
        crate::encoding::json_record(&record).map_err(|_| ExecutionError::Invariant)?;
    Ok(crate::encoding::sha256_hex(serialized.as_bytes()))
}
impl FormSource {
    pub(crate) fn capture(
        values: &[FormValue],
        budget: &ByteBudget,
    ) -> Result<(Vec<Self>, crate::host::ByteReservation), ExecutionError> {
        let mut groups: Vec<Self> = Vec::new();
        let mut storage = budget.reserve(0)?;
        for item in values {
            let index = groups
                .iter()
                .position(|group| group.field == item.field && group.request == item.request);
            let index = if let Some(index) = index {
                index
            } else {
                storage.resize(
                    storage.bytes()
                        + 2 * std::mem::size_of::<Self>()
                        + item.field.len()
                        + item.request.len(),
                )?;
                groups.push(Self {
                    request: item.request.clone(),
                    field: item.field.clone(),
                    entries: Default::default(),
                });
                groups.len() - 1
            };
            storage.resize(
                storage.bytes()
                    + 64
                    + crate::host::retained_size::tree_node_bound::<String, ()>()
                        .ok_or(ExecutionError::Capacity)?,
            )?;
            groups[index].entries.insert(digest(
                &item.value,
                &item.label,
                item.parent.as_ref().map(|(k, v)| (k.as_str(), v.as_str())),
                budget,
            )?);
        }
        Ok((groups, storage))
    }
    pub(crate) fn current(
        &self,
        state: &SimulationState,
        actor: &str,
        budget: &ByteBudget,
    ) -> Result<bool, ExecutionError> {
        let Some(form) = state
            .installed
            .occurrence_rules
            .value()
            .response
            .offers
            .installed_requests
            .iter()
            .find(|r| r.id == self.request)
        else {
            return Ok(false);
        };
        let _work = budget.reserve(
            self.entries.len()
                * (std::mem::size_of::<&str>()
                    + crate::host::retained_size::tree_node_bound::<&str, ()>()
                        .ok_or(ExecutionError::Capacity)?),
        )?;
        let mut unseen: std::collections::BTreeSet<&str> =
            self.entries.iter().map(String::as_str).collect();
        visit(
            state,
            actor,
            form,
            &self.field,
            &IndexMap::new(),
            budget,
            |value, label, parent| {
                unseen.remove(digest(value, label, parent, budget)?.as_str());
                Ok(())
            },
        )?;
        Ok(unseen.is_empty())
    }
}
