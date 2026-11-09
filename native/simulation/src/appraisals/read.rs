//! Actor-scoped current interpretation. Read selection owns no canonical writes,
//! allocates no identities and never hydrates execution history as personal proof.
use super::*;
use crate::host::retained_size::{heap_sum, map_storage, tree_node_bound};
use crate::simulation::SimulationState;
use crate::work::{WorkMeters, WorkUnit};
use crate::worlds::{InstalledPersonalName, InstalledPersonalNameReader};
use std::collections::BTreeSet;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AppraisalScope {
    pub definition_pin: DefinitionPin,
    #[serde(deserialize_with = "crate::values::deserialize_nullable")]
    pub target_id: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppraisalView<'a> {
    id: &'a str,
    revision: u64,
    feeling: &'a str,
    target_id: Option<&'a str>,
    value: AppraisalValue,
    lifetime: &'static str,
    definition_pin: &'a DefinitionPin,
    coverage: &'a str,
}
#[derive(Serialize)]
struct Scale {
    min: f64,
    max: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Feeling<'a> {
    #[serde(flatten)]
    view: AppraisalView<'a>,
    #[serde(skip_serializing_if = "Option::is_none")]
    scale: Option<Scale>,
    #[serde(skip_serializing_if = "Option::is_none")]
    decay_per_hour: Option<f64>,
}
#[derive(Serialize)]
struct Revision<'a> {
    id: &'a str,
    revision: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Name<'a> {
    entity_id: &'a str,
    name: InstalledPersonalName<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    world_id: &'a str,
    actor_id: &'a str,
    physical_life: u64,
    generation: &'a str,
    accepted_cut: u64,
    at: f64,
    sequence: u64,
    values: Vec<Feeling<'a>>,
    names: Vec<Name<'a>>,
    subscribed: Vec<Revision<'a>>,
}
fn capacity() -> ExecutionError {
    ExecutionError::Capacity
}
fn count(value: usize) -> Result<u64, ExecutionError> {
    u64::try_from(value).map_err(|_| ExecutionError::Capacity)
}
fn shape_units<T: Serialize + ?Sized>(
    value: &T,
    budget: &ByteBudget,
) -> Result<u64, ExecutionError> {
    let length = crate::encoding::json_record_len(value).map_err(|_| ExecutionError::Invariant)?;
    let _encoded = budget.reserve(length.checked_mul(2).ok_or_else(capacity)?.max(8))?;
    count(
        json_record(value)
            .map_err(|_| ExecutionError::Invariant)?
            .encode_utf16()
            .count()
            .checked_mul(3)
            .ok_or_else(capacity)?,
    )
}
fn view<'a>(
    state: &'a AppraisalState,
    record: &'a Appraisal,
    now: f64,
) -> Result<Option<Feeling<'a>>, ExecutionError> {
    let definition = state
        .definitions
        .get(&record.definition_pin.id)
        .filter(|definition| definition.pin == record.definition_pin)
        .ok_or(ExecutionError::Invariant)?;
    let value = match (
        &record.lifetime,
        &definition.value.lifetime,
        &definition.value.value,
    ) {
        (
            AppraisalLifetime::Decays {
                anchor_time,
                anchor_value,
            },
            LifetimeLaw::Decays { per_hour, .. },
            ValueLaw::Scaled { min, .. },
        ) => AppraisalValue::Scaled {
            value: min.max(anchor_value - ((now - anchor_time).max(0.0) / 3600.0) * per_hour),
        },
        _ => record.value.clone(),
    };
    if matches!(record.lifetime, AppraisalLifetime::Expires { at } if at <= now)
        || matches!((&value, &definition.value.value), (AppraisalValue::Scaled { value }, ValueLaw::Scaled { min, .. }) if value <= min)
    {
        return Ok(None);
    }
    let lifetime = match record.lifetime {
        AppraisalLifetime::Persistent => "persistent",
        AppraisalLifetime::Expires { .. } => "expires",
        AppraisalLifetime::Decays { .. } => "decays",
    };
    Ok(Some(Feeling {
        view: AppraisalView {
            id: &record.id,
            revision: record.revision,
            feeling: &definition.value.label,
            target_id: record.target_id.as_deref(),
            value,
            lifetime,
            definition_pin: &record.definition_pin,
            coverage: record
                .interpretation_source
                .as_ref()
                .or(record.cause.as_ref())
                .map_or("unavailable", |cause| cause.coverage.as_str()),
        },
        scale: match definition.value.value {
            ValueLaw::Scaled { min, max } => Some(Scale { min, max }),
            _ => None,
        },
        decay_per_hour: match definition.value.lifetime {
            LifetimeLaw::Decays { per_hour, .. } => Some(per_hour),
            _ => None,
        },
    }))
}

/// Same 24-result/200-examined hot page as Source, followed by complete exact
/// subscribed scopes. All rich records stay borrowed until this owned string is
/// complete; output and scratch capacities share the caller's real allowance.
pub(crate) fn write_actor_appraisals(
    state: &SimulationState,
    actor_id: &str,
    required: &[AppraisalScope],
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), ExecutionError> {
    let entity = state
        .physical
        .entities
        .get(actor_id)
        .ok_or(ExecutionError::MissingEntity)?;
    let actor = entity.actor.as_ref().ok_or(ExecutionError::MissingActor)?;
    if !entity.has_memory() || actor.controller != "npc" {
        return Err(ExecutionError::UnsupportedFamily);
    }
    let group = state.installed.work_policy.policy().group;
    let prefix_bytes = required.iter().try_fold(0usize, |bytes, scope| {
        heap_sum([
            bytes,
            (scope.definition_pin.id.len()
                + scope.definition_pin.digest.len()
                + scope.target_id.as_ref().map_or(0, String::len))
            .checked_mul(6)
            .ok_or_else(capacity)?,
            128,
        ])
        .ok_or_else(capacity)
    })?;
    let scratch_bound = heap_sum([
        // Prefixes, their duplicate index and the current JSON/range key can coexist.
        prefix_bytes.checked_mul(4).ok_or_else(capacity)?,
        required
            .len()
            .checked_mul(size_of::<String>())
            .ok_or_else(capacity)?,
        required
            .len()
            .checked_mul(tree_node_bound::<String, ()>().ok_or_else(capacity)?)
            .ok_or_else(capacity)?,
        if required.is_empty() {
            0
        } else {
            WorkMeters::heap_bound(group)?
        },
    ])
    .ok_or_else(capacity)?;
    let _scratch = budget.reserve(scratch_bound)?;
    let mut meter = if required.is_empty() {
        None
    } else {
        Some(WorkMeters::new(group)?)
    };
    let token = meter.as_mut().map(|meter| meter.begin(group)).transpose()?;
    let mut prefixes = Vec::new();
    prefixes
        .try_reserve_exact(required.len())
        .map_err(|_| capacity())?;
    let mut seen_scopes = BTreeSet::new();
    let owner = state.appraisals.owners.get(actor_id);
    if (owner.is_none() && !state.appraisals.owner_coverage.complete)
        || owner.is_some_and(|owner| !owner.active_complete)
    {
        // A historical tail alone cannot establish an active scope. The
        // same-query active witness is distinct from historical completeness.
        return Err(ExecutionError::UnsupportedFamily);
    }
    let active_maximum = owner.map_or(0, |owner| owner.index.active_len().min(24));
    let mut maximum = active_maximum;
    for scope in required {
        meter
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .charge(&[(WorkUnit::Tests, 1)])?;
        if state
            .appraisals
            .definitions
            .get(&scope.definition_pin.id)
            .is_none_or(|definition| definition.pin != scope.definition_pin)
        {
            return Err(ExecutionError::Invariant);
        }
        let prefix = AppraisalIndex::scope_key(&scope.definition_pin, scope.target_id.as_deref())?;
        if !seen_scopes.insert(prefix.clone()) {
            continue;
        }
        maximum = maximum
            .checked_add(owner.map_or(0, |owner| owner.index.scoped(&prefix).count()))
            .ok_or_else(capacity)?;
        prefixes.push(prefix);
    }
    let names_capacity = maximum.checked_add(1).ok_or_else(capacity)?;
    let selection_bound = heap_sum([
        maximum
            .checked_mul(size_of::<Feeling<'_>>() + size_of::<Revision<'_>>())
            .ok_or_else(capacity)?,
        names_capacity
            .checked_mul(size_of::<Name<'_>>())
            .ok_or_else(capacity)?,
        maximum
            .checked_mul(3)
            .and_then(|count| map_storage::<&str, usize>(count))
            .ok_or_else(capacity)?,
        names_capacity
            .checked_mul(tree_node_bound::<&str, ()>().ok_or_else(capacity)?)
            .ok_or_else(capacity)?,
    ])
    .ok_or_else(capacity)?;
    let _selection = budget.reserve(selection_bound)?;
    let mut selected = Vec::new();
    selected
        .try_reserve_exact(maximum)
        .map_err(|_| capacity())?;
    let mut subscribed = Vec::new();
    subscribed
        .try_reserve_exact(maximum - active_maximum)
        .map_err(|_| capacity())?;
    let mut positions = IndexMap::new();
    positions.try_reserve(maximum).map_err(|_| capacity())?;
    let now = state.physical.header.sim_time;
    if let Some(owner) = owner {
        for id in owner.index.active().take(200) {
            if selected.len() >= 24 {
                break;
            }
            let record = owner.records.get(id).ok_or(ExecutionError::Invariant)?;
            if let Some(value) = view(&state.appraisals, &record.value, now)? {
                positions.insert(value.view.id, selected.len());
                selected.push(value);
            }
        }
        let mut seen = BTreeSet::new();
        for prefix in &prefixes {
            for id in owner.index.scoped(prefix) {
                if !seen.insert(id) {
                    continue;
                }
                let record = owner.records.get(id).ok_or(ExecutionError::Invariant)?;
                let input = count(
                    record
                        .row
                        .payload
                        .encode_utf16()
                        .count()
                        .checked_mul(3)
                        .ok_or_else(capacity)?,
                )?;
                meter
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?
                    .charge(&[(WorkUnit::Candidates, 1), (WorkUnit::InputBytes, input)])?;
                if let Some(value) = view(&state.appraisals, &record.value, now)? {
                    meter
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .charge(&[(WorkUnit::OutputBytes, shape_units(&value.view, budget)?)])?;
                    subscribed.push(Revision {
                        id: value.view.id,
                        revision: value.view.revision,
                    });
                    if let Some(&position) = positions.get(value.view.id) {
                        selected[position] = value;
                    } else {
                        positions.insert(value.view.id, selected.len());
                        selected.push(value);
                    }
                }
            }
        }
    }
    if let Some(token) = token {
        meter
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .finish(token)?;
    }
    let names = if selected.is_empty() {
        None
    } else {
        Some(InstalledPersonalNameReader::prepare(
            &state.physical,
            &state.reception,
            &state.installed,
            &state.experience,
            actor_id,
        )?)
    };
    let mut captured_names = Vec::new();
    captured_names
        .try_reserve_exact(if selected.is_empty() {
            0
        } else {
            selected.len() + 1
        })
        .map_err(|_| capacity())?;
    if !selected.is_empty() {
        captured_names.push(Name {
            entity_id: actor_id,
            name: names
                .as_ref()
                .ok_or(ExecutionError::Invariant)?
                .observer_name(actor_id)?,
        });
    }
    let mut seen_names = BTreeSet::new();
    seen_names.insert(actor_id);
    for value in &selected {
        if let Some(id) = value
            .view
            .target_id
            .filter(|id| state.physical.entities.get(id).is_some())
        {
            if seen_names.insert(id) {
                captured_names.push(Name {
                    entity_id: id,
                    name: names
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .observer_name(id)?,
                });
            }
        }
    }
    let product = Product {
        world_id: &state.physical.header.id,
        actor_id,
        physical_life: actor.physical_life.unwrap_or(0),
        generation: &state.generation,
        accepted_cut: state.accepted_cut,
        at: now,
        sequence: state.physical.header.sequence,
        values: selected,
        names: captured_names,
        subscribed,
    };
    let length =
        crate::encoding::json_record_len(&product).map_err(|_| ExecutionError::Invariant)?;
    let mut reservation = budget.reserve(length.checked_mul(2).ok_or_else(capacity)?.max(8))?;
    let text = json_record(&product).map_err(|_| ExecutionError::Invariant)?;
    reservation.resize(text.capacity())?;
    Ok((text, reservation))
}
