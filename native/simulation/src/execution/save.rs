//! Physical products selected from the single sparse inverse journal. No world
//! snapshot/diff or TypeScript reconstruction decides what must be persisted.
use super::*;
use crate::host::retained_size::map_storage;
use crate::records::{
    OrderedMapRows, OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder,
    SelectedPlacement,
};
use serde::Serialize;
use serde_json::Value;
fn error() -> RecordEncodingError {
    RecordEncodingError("Physical save has no complete current owner, placement or capacity.")
}
#[derive(Default)]
struct EntityRows<'a> {
    root: bool,
    placement: bool,
    geometry: bool,
    actor: bool,
    action: bool,
    agency: bool,
    animal: bool,
    episode: bool,
    episode_before: Option<&'a Option<crate::native_response::NativeResponseEpisode>>,
    attributes: IndexMap<&'a str, bool>,
    statuses: IndexMap<&'a str, bool>,
    patterns: IndexMap<&'a str, bool>,
}
fn one<T: Serialize + ?Sized>(
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    table: &str,
    path: &[&str],
    parent: &[&str],
    field: &str,
    value: Option<&T>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let placement = SelectedPlacement::new(ledger, table, path, parent, field, 0, false, budget)?;
    if let Some(value) = value {
        output.write(
            table,
            placement.value(),
            value,
            &[],
            placement.create(),
            RowEffects::default(),
        )?;
    } else if !placement.create() {
        output.delete(table, &placement.value().id, false)?;
    }
    Ok(())
}
fn observe(
    output: &mut RowEncoder<'_>,
    table: &str,
    parent: &[&str],
    present: bool,
    next: u64,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let bytes = crate::encoding::json_record_len(parent)
        .map_err(|_| error())?
        .checked_mul(2)
        .and_then(|bytes| bytes.checked_add(table.len() + size_of::<OwnerCoverage>()))
        .ok_or_else(error)?;
    let _guard = budget.reserve(bytes).map_err(|_| error())?;
    output.observe_owner(&OwnerCoverage {
        table: table.into(),
        owner: crate::encoding::json_record(parent).map_err(|_| error())?,
        complete: true,
        next_ordinal: next,
        parent_present: present,
    })
}
fn map<T: Serialize>(
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    table: &str,
    parent: &[&str],
    field: &str,
    values: Option<&IndexMap<String, T>>,
    changed: &IndexMap<&str, bool>,
    stable: bool,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let _owner_guard = budget
        .reserve(
            crate::encoding::json_record_len(parent)
                .map_err(|_| error())?
                .checked_mul(2)
                .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    let owner = crate::encoding::json_record(parent).map_err(|_| error())?;
    let mut next = if stable {
        ledger
            .coverage(table, &owner)
            .map_or(0, |coverage| coverage.next_ordinal)
    } else {
        0
    };
    if let Some(values) = values {
        let ordered = OrderedMapRows::new(values, budget)?;
        for (ordinal, key, value) in ordered.iter() {
            let _path_guard = budget
                .reserve((parent.len() + 2) * size_of::<&str>())
                .map_err(|_| error())?;
            let mut path = Vec::with_capacity(parent.len() + 2);
            path.extend_from_slice(parent);
            path.push(field);
            path.push(key);
            let _id_guard = budget
                .reserve(
                    crate::encoding::json_record_len(&path)
                        .map_err(|_| error())?
                        .checked_mul(2)
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let id = crate::encoding::json_record(&path).map_err(|_| error())?;
            let old = ledger.placement(table, &id);
            let position = if stable {
                match old {
                    Some(old) => old.position,
                    None => {
                        let position = next;
                        next = next
                            .checked_add(1)
                            .filter(|next| *next <= MAX_SAFE_INTEGER)
                            .ok_or_else(error)?;
                        position
                    }
                }
            } else {
                ordinal
            };
            let dirty = changed.contains_key(key);
            if dirty || old.is_none_or(|old| old.position != position) {
                let placement = SelectedPlacement::new(
                    ledger,
                    table,
                    &path,
                    parent,
                    key,
                    position,
                    changed.get(key) == Some(&false),
                    budget,
                )?;
                output.write(
                    table,
                    placement.value(),
                    value,
                    &[],
                    placement.create(),
                    RowEffects::default(),
                )?;
            }
        }
        if !stable {
            next = values.len() as u64;
        }
    }
    for (key, existed) in changed {
        if *existed && values.is_none_or(|values| !values.contains_key(*key)) {
            let _guard = budget
                .reserve(
                    parent
                        .iter()
                        .map(|part| part.len())
                        .sum::<usize>()
                        .checked_mul(8)
                        .and_then(|bytes| {
                            bytes
                                .checked_add(key.len() * 8 + (parent.len() + 2) * size_of::<&str>())
                        })
                        .ok_or_else(error)?,
                )
                .map_err(|_| error())?;
            let mut path = Vec::with_capacity(parent.len() + 2);
            path.extend_from_slice(parent);
            path.push(field);
            path.push(key);
            output.delete(
                table,
                &crate::encoding::json_record(&path).map_err(|_| error())?,
                false,
            )?;
        }
    }
    observe(output, table, parent, values.is_some(), next, budget)
}
impl PhysicalJournal {
    /// Receiver-owned scalar progress shares sim_entities with physical child
    /// presence. Its exact changed IDs join this one parent projection.
    pub(crate) fn encode_changes(
        &self,
        state: &PhysicalState,
        ledger: &RecordLedger,
        extra_entity_roots: &[&str],
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let maximum = self
            .undo
            .len()
            .checked_add(extra_entity_roots.len())
            .ok_or_else(error)?;
        let keys = self
            .undo
            .iter()
            .try_fold(maximum, |count, undo| match undo {
                Undo::Episode(episode) => count.checked_add(episode.attributes.len()),
                _ => Some(count),
            })
            .ok_or_else(error)?;
        let bytes = heap_sum([
            map_storage::<(usize, u64), EntityRows<'_>>(maximum).ok_or_else(error)?,
            map_storage::<&str, bool>(keys)
                .and_then(|bytes| bytes.checked_mul(4))
                .ok_or_else(error)?,
            map_storage::<&str, bool>(maximum).ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        let _selection = budget.reserve(bytes).map_err(|_| error())?;
        let mut selected: IndexMap<(usize, u64), EntityRows<'_>> = IndexMap::with_capacity(maximum);
        let mut work = IndexMap::with_capacity(maximum);
        let mut bindings = IndexMap::with_capacity(maximum);
        let mut subjects = IndexMap::with_capacity(maximum);
        let mut window = false;
        for change in &self.undo {
            match change {
                Undo::Work(undo) => {
                    work.entry(undo.id()).or_insert(undo.was_present());
                }
                Undo::NativeWindow { .. } => window = true,
                Undo::RetainedBinding {
                    episode, entity_id, ..
                } => {
                    window = true;
                    bindings.entry(episode.as_str()).or_insert(false);
                    subjects.entry(entity_id.as_str()).or_insert(false);
                }
                Undo::Episode(episode) => {
                    window = true;
                    bindings.entry(episode.episode.as_str()).or_insert(true);
                    subjects
                        .entry(episode.binding.1.entity_id.as_str())
                        .or_insert(true);
                    let rows = selected
                        .entry((episode.entity.slot, episode.entity.generation))
                        .or_default();
                    rows.statuses
                        .entry(episode.binding.1.status_id.as_str())
                        .or_insert(true);
                    for (id, _) in &episode.attributes {
                        rows.attributes.entry(id.as_str()).or_insert(true);
                    }
                }
                _ => {
                    let handle = match change {
                        Undo::Placement { entity, .. }
                        | Undo::Heading { entity, .. }
                        | Undo::Health { entity, .. }
                        | Undo::Action { entity, .. }
                        | Undo::ActionPath { entity, .. }
                        | Undo::ActionRoute { entity, .. }
                        | Undo::ActionReplans { entity, .. }
                        | Undo::ActionNavigation { entity, .. }
                        | Undo::ActionRemaining { entity, .. }
                        | Undo::AnimalEpisode { entity, .. }
                        | Undo::AnimalWander { entity, .. }
                        | Undo::AnimalPhysicalLife { entity, .. }
                        | Undo::AcousticPattern { entity, .. }
                        | Undo::SemanticMeta { entity, .. }
                        | Undo::SemanticResolved { entity, .. }
                        | Undo::ResultEvidence { entity, .. }
                        | Undo::Status { entity, .. }
                        | Undo::Attribute { entity, .. } => *entity,
                        _ => return Err(error()),
                    };
                    let rows = selected
                        .entry((handle.slot, handle.generation))
                        .or_default();
                    match change {
                        Undo::Placement { .. } => {
                            rows.placement = true;
                            rows.geometry = true;
                        }
                        Undo::Heading { .. } => rows.geometry = true,
                        Undo::Health { .. } => rows.actor = true,
                        Undo::Action { .. } => {
                            rows.actor = true;
                            rows.action = true;
                        }
                        Undo::ActionPath { .. }
                        | Undo::ActionRoute { .. }
                        | Undo::ActionReplans { .. }
                        | Undo::ActionNavigation { .. }
                        | Undo::ActionRemaining { .. } => rows.action = true,
                        Undo::AnimalEpisode { before, .. } => {
                            rows.episode = true;
                            if rows.episode_before.is_none() {
                                rows.episode_before = Some(before);
                            }
                        }
                        Undo::AnimalWander { .. } | Undo::AnimalPhysicalLife { .. } => {
                            rows.animal = true
                        }
                        Undo::AcousticPattern { key, before, .. } => {
                            rows.patterns
                                .entry(key.as_str())
                                .or_insert(before.is_some());
                        }
                        Undo::SemanticMeta { .. }
                        | Undo::SemanticResolved { .. }
                        | Undo::ResultEvidence { .. } => rows.agency = true,
                        Undo::Status {
                            key,
                            before,
                            root_present,
                            ..
                        } => {
                            rows.statuses
                                .entry(key.as_str())
                                .or_insert(before.is_some());
                            rows.root |= !root_present;
                        }
                        Undo::Attribute { id, .. } => {
                            rows.attributes.entry(id.as_str()).or_insert(true);
                        }
                        _ => return Err(error()),
                    }
                }
            }
        }
        for id in extra_entity_roots {
            let handle = state.entities.handle(id).ok_or_else(error)?;
            selected
                .entry((handle.slot, handle.generation))
                .or_default()
                .root = true;
        }
        for ((slot, generation), rows) in selected {
            let entity = state
                .entities
                .resolve(EntityHandle { slot, generation })
                .ok_or_else(error)?;
            let id = entity.id.as_str();
            let parent = ["world", "entities", id];
            if rows.root {
                let _identity = budget
                    .reserve(
                        crate::encoding::json_record_len(&parent)
                            .map_err(|_| error())?
                            .checked_mul(2)
                            .ok_or_else(error)?,
                    )
                    .map_err(|_| error())?;
                let row_id = crate::encoding::json_record(&parent).map_err(|_| error())?;
                let placement = ledger
                    .placement("sim_entities", &row_id)
                    .ok_or_else(error)?;
                let _cells = budget
                    .reserve(
                        entity.id.len()
                            + entity.kind.len()
                            + entity.name.len()
                            + 3 * size_of::<Value>(),
                    )
                    .map_err(|_| error())?;
                output.write(
                    "sim_entities",
                    placement,
                    entity,
                    &[
                        Value::from(id),
                        Value::from(entity.kind.as_str()),
                        Value::from(entity.name.as_str()),
                    ],
                    false,
                    RowEffects::default(),
                )?;
            }
            if rows.placement {
                one(
                    ledger,
                    output,
                    "sim_placements",
                    &["world", "entities", id, "placement"],
                    &parent,
                    "placement",
                    entity.placement.as_ref(),
                    budget,
                )?;
            }
            if rows.geometry {
                one(
                    ledger,
                    output,
                    "sim_entity_geometry",
                    &["world", "entities", id, "spatial"],
                    &parent,
                    "spatial",
                    Some(&entity.spatial),
                    budget,
                )?;
            }
            let actor_parent = ["world", "entities", id, "actor"];
            if rows.actor {
                one(
                    ledger,
                    output,
                    "sim_actors",
                    &actor_parent,
                    &parent,
                    "actor",
                    entity.actor.as_ref(),
                    budget,
                )?;
            }
            if rows.action || rows.agency || !rows.attributes.is_empty() {
                let actor = entity.actor.as_ref();
                if rows.action {
                    one(
                        ledger,
                        output,
                        "sim_processes",
                        &["world", "entities", id, "actor", "action"],
                        &actor_parent,
                        "action",
                        actor.and_then(|actor| actor.action.as_ref()),
                        budget,
                    )?;
                }
                if rows.agency {
                    one(
                        ledger,
                        output,
                        "sim_agency",
                        &["world", "entities", id, "actor", "agency"],
                        &actor_parent,
                        "agency",
                        actor.map(|actor| &actor.agency),
                        budget,
                    )?;
                }
                if !rows.attributes.is_empty() {
                    if let Some(actor) = actor {
                        map(
                            ledger,
                            output,
                            "sim_actor_attributes",
                            &actor_parent,
                            "attributes",
                            actor.attributes.as_ref(),
                            &rows.attributes,
                            false,
                            budget,
                        )?;
                    } else {
                        map(
                            ledger,
                            output,
                            "sim_attributes",
                            &parent,
                            "attributes",
                            entity.attributes.as_ref(),
                            &rows.attributes,
                            false,
                            budget,
                        )?;
                    }
                }
            }
            if !rows.statuses.is_empty() {
                map(
                    ledger,
                    output,
                    "sim_status_effects",
                    &parent,
                    "statusEffects",
                    entity.status_effects.as_ref(),
                    &rows.statuses,
                    true,
                    budget,
                )?;
            }
            if rows.animal || rows.episode || !rows.patterns.is_empty() {
                let animal = entity.animal.as_ref().ok_or_else(error)?;
                let animal_parent = ["world", "entities", id, "animal"];
                if rows.animal
                    || rows
                        .episode_before
                        .is_some_and(|before| before.is_some() != animal.episode.is_some())
                {
                    one(
                        ledger,
                        output,
                        "sim_animal_behavior",
                        &animal_parent,
                        &parent,
                        "animal",
                        Some(animal),
                        budget,
                    )?;
                }
                if !rows.patterns.is_empty() {
                    map(
                        ledger,
                        output,
                        "sim_native_acoustic_patterns",
                        &animal_parent,
                        "acousticPatterns",
                        Some(&animal.acoustic_patterns),
                        &rows.patterns,
                        false,
                        budget,
                    )?;
                }
                if rows.episode {
                    let episode_parent = ["world", "entities", id, "animal", "episode"];
                    one(
                        ledger,
                        output,
                        "sim_native_response_episodes",
                        &episode_parent,
                        &animal_parent,
                        "episode",
                        animal.episode.as_ref(),
                        budget,
                    )?;
                    let prior = rows.episode_before.and_then(|before| before.as_ref());
                    let current = animal.episode.as_ref();
                    let _keys = budget
                        .reserve(
                            map_storage::<&str, bool>(
                                prior.map_or(0, |episode| episode.dangers.len())
                                    + current.map_or(0, |episode| episode.dangers.len()),
                            )
                            .and_then(|bytes| {
                                bytes.checked_add(map_storage::<&str, bool>(
                                    prior.map_or(0, |episode| {
                                        episode.preparations.as_ref().map_or(0, IndexMap::len)
                                    }) + current.map_or(0, |episode| {
                                        episode.preparations.as_ref().map_or(0, IndexMap::len)
                                    }),
                                )?)
                            })
                            .ok_or_else(error)?,
                        )
                        .map_err(|_| error())?;
                    let mut dangers = IndexMap::new();
                    let mut preparations = IndexMap::new();
                    if let Some(before) = prior {
                        for (key, value) in &before.dangers {
                            if current.and_then(|episode| episode.dangers.get(key)) != Some(value) {
                                dangers.insert(key.as_str(), true);
                            }
                        }
                        for (key, value) in
                            before.preparations.iter().flat_map(|values| values.iter())
                        {
                            if current.and_then(|episode| {
                                episode
                                    .preparations
                                    .as_ref()
                                    .and_then(|values| values.get(key))
                            }) != Some(value)
                            {
                                preparations.insert(key.as_str(), true);
                            }
                        }
                    }
                    if let Some(current) = current {
                        for (key, value) in &current.dangers {
                            if prior.and_then(|episode| episode.dangers.get(key)) != Some(value) {
                                dangers.entry(key.as_str()).or_insert(false);
                            }
                        }
                        for (key, value) in
                            current.preparations.iter().flat_map(|values| values.iter())
                        {
                            if prior.and_then(|episode| {
                                episode
                                    .preparations
                                    .as_ref()
                                    .and_then(|values| values.get(key))
                            }) != Some(value)
                            {
                                preparations.entry(key.as_str()).or_insert(false);
                            }
                        }
                    }
                    map(
                        ledger,
                        output,
                        "sim_native_response_dangers",
                        &episode_parent,
                        "dangers",
                        current.map(|episode| &episode.dangers),
                        &dangers,
                        false,
                        budget,
                    )?;
                    map(
                        ledger,
                        output,
                        "sim_native_attack_preparations",
                        &episode_parent,
                        "preparations",
                        current.and_then(|episode| episode.preparations.as_ref()),
                        &preparations,
                        false,
                        budget,
                    )?;
                }
            }
        }
        if !work.is_empty() {
            let current = state.work.state();
            one(
                ledger,
                output,
                "sim_work_state",
                &["world", "workState"],
                &["world"],
                "workState",
                current,
                budget,
            )?;
            map(
                ledger,
                output,
                "sim_work_invocations",
                &["world", "workState"],
                "invocations",
                current.map(|state| &state.invocations),
                &work,
                false,
                budget,
            )?;
        }
        if window {
            one(
                ledger,
                output,
                "sim_native_values",
                &["world", "pendingNativeIntegration"],
                &["world"],
                "pendingNativeIntegration",
                state.pending_values.as_ref(),
                budget,
            )?;
            map(
                ledger,
                output,
                "sim_native_value_bindings",
                &["world", "pendingNativeIntegration"],
                "bindings",
                state.pending_values.as_ref().map(|window| &window.bindings),
                &bindings,
                false,
                budget,
            )?;
            map(
                ledger,
                output,
                "sim_native_value_subjects",
                &["world", "pendingNativeIntegration"],
                "byEntity",
                state
                    .pending_values
                    .as_ref()
                    .map(|window| &window.by_entity),
                &subjects,
                false,
                budget,
            )?;
        }
        Ok(())
    }
}
