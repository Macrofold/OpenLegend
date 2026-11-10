//! Physical products selected from the single sparse inverse journal. No world
//! snapshot/diff or TypeScript reconstruction decides what must be persisted.
use super::*;
use crate::host::retained_size::map_storage;
use crate::records::{
    OrderedMapRows, OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder,
    SelectedPlacement, SqlCell,
};
use serde::Serialize;
mod agency;
mod participation;
fn error() -> RecordEncodingError {
    RecordEncodingError("Physical save has no complete current owner, placement or capacity.")
}
fn placement_cells(id: &str, placement: &Placement) -> [SqlCell; 12] {
    let mut cells = std::array::from_fn(|_| SqlCell::Null);
    cells[0] = id.into();
    match placement {
        Placement::World {
            position,
            support_surface_id,
            ..
        } => {
            cells[1] = "world".into();
            cells[8] = support_surface_id
                .as_ref()
                .map_or(SqlCell::Null, |id| id.clone().into());
            cells[9] = position.x.into();
            cells[10] = position.y.into();
            cells[11] = position.z.into();
        }
        Placement::Contained {
            parent_entity_id, ..
        } => {
            cells[1] = "contained".into();
            cells[2] = parent_entity_id.clone().into();
        }
        Placement::Attached {
            parent_entity_id,
            port_id,
            slot,
            local,
            ..
        } => {
            cells[1] = "attached".into();
            cells[2] = parent_entity_id.clone().into();
            cells[3] = port_id.clone().into();
            cells[4] = slot
                .as_ref()
                .map_or(SqlCell::Null, |slot| slot.clone().into());
            if let Some(point) = local {
                cells[5] = point.x.into();
                cells[6] = point.y.into();
                cells[7] = point.z.into();
            }
        }
    }
    cells
}
fn placement_cell_bound(id: &str, placement: &Placement) -> Option<usize> {
    heap_sum([
        12 * size_of::<SqlCell>(),
        id.len(),
        8,
        match placement {
            Placement::World {
                support_surface_id, ..
            } => support_surface_id.as_ref().map_or(0, String::len),
            Placement::Contained {
                parent_entity_id, ..
            } => parent_entity_id.len(),
            Placement::Attached {
                parent_entity_id,
                port_id,
                slot,
                ..
            } => parent_entity_id.len() + port_id.len() + slot.as_ref().map_or(0, String::len),
        },
    ])
}
fn write_placement(
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    id: &str,
    placement: &Placement,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let address = SelectedPlacement::new(
        ledger,
        "sim_placements",
        &["world", "entities", id, "placement"],
        &["world", "entities", id],
        "placement",
        0,
        false,
        budget,
    )?;
    let _cells = budget
        .reserve(placement_cell_bound(id, placement).ok_or_else(error)?)
        .map_err(|_| error())?;
    output.write(
        "sim_placements",
        address.value(),
        placement,
        &placement_cells(id, placement),
        address.create(),
        RowEffects::default(),
    )
}
fn attribute_changed(
    state: &PhysicalState,
    entity: EntityHandle,
    id: &str,
    before: &crate::values::AttributeState,
) -> bool {
    state
        .entities
        .resolve(entity)
        .and_then(|entity| entity.stored_attributes())
        .and_then(|attributes| attributes.get(id))
        != Some(before)
}
#[derive(Default)]
struct EntityRows<'a> {
    added: bool,
    remains: bool,
    remains_before: Option<bool>,
    root: bool,
    placement: bool,
    geometry_heading: Option<f64>,
    geometry_lifecycle: Option<(Option<f64>, Option<f64>)>,
    actor: bool,
    action: bool,
    agency: bool,
    plan_before: Option<&'a Option<crate::plans::ActorPlan>>,
    history_before: Option<&'a Vec<crate::plans::PlanStep>>,
    goals_before: Option<&'a Vec<crate::state::Goal>>,
    intents_before: Option<&'a Vec<crate::plans::PendingIntent>>,
    animal: bool,
    episode: bool,
    episode_before: Option<&'a Option<crate::native_response::NativeResponseEpisode>>,
    attributes: IndexMap<&'a str, bool>,
    statuses: IndexMap<&'a str, bool>,
    conditions: IndexMap<&'a str, bool>,
    practice: IndexMap<&'a str, bool>,
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
fn created<T: Serialize + ?Sized>(
    output: &mut RowEncoder<'_>,
    table: &str,
    path: &[&str],
    parent: &[&str],
    slot: &str,
    position: u64,
    value: &T,
    cells: &[SqlCell],
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let bytes = crate::encoding::json_record_len(path)
        .and_then(|n| crate::encoding::json_record_len(parent).map(|p| n + p))
        .map_err(|_| error())?
        .checked_mul(2)
        .and_then(|n| n.checked_add(slot.len()))
        .ok_or_else(error)?;
    let _guard = budget.reserve(bytes).map_err(|_| error())?;
    let placement = crate::records::RecordPlacement {
        id: crate::encoding::json_record(path).map_err(|_| error())?,
        parent: crate::encoding::json_record(parent).map_err(|_| error())?,
        slot: slot.into(),
        position,
    };
    output.write(table, &placement, value, cells, true, RowEffects::default())
}
fn write_corpse(
    entity: &crate::state::Entity,
    position: u64,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let id = entity.id.as_str();
    let parent = ["world", "entities", id];
    let actor_parent = ["world", "entities", id, "actor"];
    let agency_parent = ["world", "entities", id, "actor", "agency"];
    let actor = entity.actor.as_ref().ok_or_else(error)?;
    let _cells = budget
        .reserve(
            heap_sum([
                placement_cell_bound(id, entity.placement.as_ref().ok_or_else(error)?)
                    .ok_or_else(error)?,
                entity.name.storage_bytes(),
                id.len(),
                entity.kind.len(),
                3 * size_of::<SqlCell>(),
            ])
            .ok_or_else(error)?,
        )
        .map_err(|_| error())?;
    // This is the exact typed constructor above, not a generic entity graph
    // serializer. A newly supported child must join both construction and this
    // finite row/coverage family before installation can accept it.
    created(
        output,
        "sim_entities",
        &parent,
        &["world"],
        id,
        position,
        entity,
        &[
            SqlCell::from(id),
            SqlCell::from(entity.kind.as_str()),
            SqlCell::from(entity.name.clone()),
        ],
        budget,
    )?;
    created(
        output,
        "sim_placements",
        &["world", "entities", id, "placement"],
        &parent,
        "placement",
        0,
        entity.placement.as_ref().ok_or_else(error)?,
        &placement_cells(id, entity.placement.as_ref().ok_or_else(error)?),
        budget,
    )?;
    created(
        output,
        "sim_entity_geometry",
        &["world", "entities", id, "spatial"],
        &parent,
        "spatial",
        0,
        &entity.spatial,
        &[],
        budget,
    )?;
    created(
        output,
        "sim_actors",
        &actor_parent,
        &parent,
        "actor",
        0,
        actor,
        &[],
        budget,
    )?;
    created(
        output,
        "sim_agency",
        &agency_parent,
        &actor_parent,
        "agency",
        0,
        &actor.agency,
        &[],
        budget,
    )?;
    created(
        output,
        "sim_remains",
        &["world", "entities", id, "remains"],
        &parent,
        "remains",
        0,
        entity.remains.as_ref().ok_or_else(error)?,
        &[],
        budget,
    )?;
    for (table, present) in [
        ("sim_placements", true),
        ("sim_entity_geometry", true),
        ("sim_actors", true),
        ("sim_remains", true),
        ("sim_assemblies", false),
        ("sim_items", false),
        ("sim_containers", false),
        ("sim_declared_owners", false),
        ("sim_object_retirements", false),
        ("sim_territorial_threat", false),
        ("sim_resources", false),
        ("sim_heat", false),
        ("sim_reservoirs", false),
        ("sim_animal_behavior", false),
        ("sim_status_effects", false),
        ("sim_attributes", false),
        ("sim_mechanism_fields", false),
    ] {
        observe(output, table, &parent, present, u64::from(present), budget)?;
    }
    for (table, present) in [
        ("sim_agency", true),
        ("sim_processes", false),
        ("sim_actor_attributes", false),
        ("sim_actor_practice", false),
        ("sim_personal_encounters", false),
        ("sim_actor_conditions", false),
        ("sim_actor_traits", false),
    ] {
        observe(
            output,
            table,
            &actor_parent,
            present,
            u64::from(present),
            budget,
        )?;
    }
    for (table, present) in [
        ("sim_goals", true),
        ("sim_plans", false),
        ("sim_plan_history", true),
        ("sim_intentions", true),
    ] {
        observe(output, table, &agency_parent, present, 0, budget)?;
    }
    Ok(())
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
/// A rate binding can be settled and retained again without changing this
/// subject's links. Reconstruct just that small record from the existing
/// inverses, preserving order, rather than emitting an unchanged SQL row.
fn subject_links_changed(
    current: Option<&IndexMap<String, String>>,
    changes: &[&Undo],
    budget: &ByteBudget,
) -> Result<bool, RecordEncodingError> {
    let count = changes
        .iter()
        .try_fold(current.map_or(0, IndexMap::len), |count, change| {
            count.checked_add(match change {
                Undo::Episode(episode) => episode.links.len(),
                _ => 0,
            })
        })
        .ok_or_else(error)?;
    let _allowance = budget
        .reserve(map_storage::<&str, &str>(count).ok_or_else(error)?)
        .map_err(|_| error())?;
    let mut before = IndexMap::with_capacity(count);
    if let Some(current) = current {
        before.extend(
            current
                .iter()
                .map(|(key, value)| (key.as_str(), value.as_str())),
        );
    }
    for change in changes.iter().rev() {
        match change {
            Undo::RetainedBinding { episode, .. } => {
                before.retain(|_, value| *value != episode.as_str());
            }
            Undo::Episode(episode) => {
                before.retain(|_, value| *value != episode.episode.as_str());
                for (position, key, value) in &episode.links {
                    if *position > before.len() {
                        return Err(error());
                    }
                    before.shift_insert(*position, key.as_str(), value.as_str());
                }
            }
            _ => return Err(error()),
        }
    }
    let before_present =
        !before.is_empty() || matches!(changes.first().copied(), Some(Undo::Episode(_)));
    Ok(match current {
        Some(current) => {
            !before_present
                || !before.iter().map(|(key, value)| (*key, *value)).eq(current
                    .iter()
                    .map(|(key, value)| (key.as_str(), value.as_str())))
        }
        None => before_present,
    })
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
                .and_then(|bytes| bytes.checked_mul(5))
                .ok_or_else(error)?,
            map_storage::<&str, bool>(maximum).ok_or_else(error)?,
            map_storage::<&str, Vec<&Undo>>(maximum).ok_or_else(error)?,
            self.undo
                .len()
                .checked_mul(4 * size_of::<&Undo>())
                .ok_or_else(error)?,
        ])
        .ok_or_else(error)?;
        let _selection = budget.reserve(bytes).map_err(|_| error())?;
        let mut selected: IndexMap<(usize, u64), EntityRows<'_>> = IndexMap::with_capacity(maximum);
        let mut work = IndexMap::with_capacity(maximum);
        let mut bindings = IndexMap::with_capacity(maximum);
        let mut subjects = IndexMap::with_capacity(maximum);
        let mut subject_changes: IndexMap<&str, Vec<&Undo>> = IndexMap::with_capacity(maximum);
        let mut window = false;
        let mut coaching = false;
        let mut added = 0u64;
        participation::encode_exposures(self, state, ledger, output, budget)?;
        for change in &self.undo {
            match change {
                Undo::ExitExposure { .. } => {},
                Undo::CoachingPresence { .. } => coaching = true,
                Undo::AddedEntity(before) => {
                    let rows = selected
                        .entry((before.handle.slot, before.handle.generation))
                        .or_default();
                    rows.added = true;
                }
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
                    subject_changes
                        .entry(entity_id.as_str())
                        .or_default()
                        .push(change);
                }
                Undo::Episode(episode) => {
                    window = true;
                    bindings.entry(episode.episode.as_str()).or_insert(true);
                    subjects
                        .entry(episode.binding.1.entity_id.as_str())
                        .or_insert(true);
                    subject_changes
                        .entry(episode.binding.1.entity_id.as_str())
                        .or_default()
                        .push(change);
                    let rows = selected
                        .entry((episode.entity.slot, episode.entity.generation))
                        .or_default();
                    rows.statuses
                        .entry(episode.binding.1.status_id.as_str())
                        .or_insert(true);
                    for (id, before) in &episode.attributes {
                        // A retained binding can include a meter clamped at
                        // its bound. Ending that episode materializes only
                        // changed meters; its inverse also retains anchors.
                        if attribute_changed(state, episode.entity, id, before) {
                            rows.attributes.entry(id.as_str()).or_insert(true);
                        }
                    }
                }
                _ => {
                    let handle = match change {
                        Undo::Placement { entity, .. }
                        | Undo::RestoreActor { entity, .. } | Undo::Participation { entity, .. }
                        | Undo::Contact { entity, .. }
                        | Undo::AgencyPlaces { entity, .. }
                        | Undo::AgencyPlan { entity, .. }
                        | Undo::AgencyGoals { entity, .. }
                        | Undo::AgencyIntents { entity, .. }
                        | Undo::AgencySuspended { entity, .. }
                        | Undo::AgencyHistory { entity, .. }
                        | Undo::AgencyRevision { entity, .. }
                        | Undo::PlanGeneration { entity, .. }
                        | Undo::BodyRevision { entity, .. }
                        | Undo::BodyLifecycle { entity, .. }
                        | Undo::Remains { entity, .. }
                        | Undo::PendingDeath { entity, .. }
                        | Undo::Scar { entity, .. }
                        | Undo::Contacts { entity, .. }
                        | Undo::Heading { entity, .. }
                        | Undo::Health { entity, .. }
                        | Undo::Action { entity, .. }
                        | Undo::ActionPath { entity, .. }
                        | Undo::ActionRoute { entity, .. }
                        | Undo::ActionReplans { entity, .. }
                        | Undo::ActionNavigation { entity, .. }
                        | Undo::ActionRemaining { entity, .. }
                        | Undo::ActionSample { entity, .. }
                        | Undo::SensoryProgress { entity, .. }
                        | Undo::AnimalEpisode { entity, .. }
                        | Undo::AnimalWander { entity, .. }
                        | Undo::AnimalPhysicalLife { entity, .. }
                        | Undo::AcousticPattern { entity, .. }
                        | Undo::SemanticMeta { entity, .. }
                        | Undo::SemanticResolved { entity, .. }
                        | Undo::ResultEvidence { entity, .. }
                        | Undo::Status { entity, .. }
                        | Undo::Attribute { entity, .. }
                        | Undo::Practice { entity, .. }
                        | Undo::Condition { entity, .. } => *entity,
                        _ => return Err(error()),
                    };
                    let rows = selected
                        .entry((handle.slot, handle.generation))
                        .or_default();
                    match change {
                        Undo::SensoryProgress { .. } => rows.root = true,
                        Undo::Participation { .. } => rows.actor = true,
                        Undo::Contact { .. } => rows.actor = true,
                        Undo::BodyRevision { .. }
                        | Undo::PlanGeneration { .. }
                        | Undo::PendingDeath { .. }
                        | Undo::Scar { .. }
                        | Undo::Contacts { .. } => rows.actor = true,
                        Undo::BodyLifecycle {
                            fall_velocity,
                            local_avoidance_ready_at,
                            ..
                        } => {
                            rows.actor = true;
                            rows.geometry_lifecycle
                                .get_or_insert((*fall_velocity, *local_avoidance_ready_at));
                        }
                        Undo::Remains { before, .. } => {
                            rows.remains_before.get_or_insert(before.is_some());
                            rows.remains = true;
                        }
                        Undo::Placement { heading, .. } => {
                            rows.placement = true;
                            rows.geometry_heading.get_or_insert(*heading);
                        }
                        Undo::Heading { before, .. } => {
                            rows.geometry_heading.get_or_insert(*before);
                        }
                        Undo::Health { .. } => rows.actor = true,
                        Undo::Action { .. } => {
                            rows.actor = true;
                            rows.action = true;
                        }
                        Undo::ActionPath { .. }
                        | Undo::ActionRoute { .. }
                        | Undo::ActionReplans { .. }
                        | Undo::ActionNavigation { .. }
                        | Undo::ActionRemaining { .. }
                        | Undo::ActionSample { .. } => rows.action = true,
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
                        | Undo::AgencyPlaces { .. }
                        | Undo::AgencySuspended { .. }
                        | Undo::AgencyRevision { .. }
                        | Undo::ResultEvidence { .. } => rows.agency = true,
                        Undo::AgencyPlan { before, .. } => {
                            rows.agency = true;
                            rows.plan_before.get_or_insert(before);
                        }
                        Undo::AgencyHistory { before, .. } => {
                            rows.agency = true;
                            rows.history_before.get_or_insert(before);
                        }
                        Undo::AgencyGoals { before, .. } => {
                            rows.agency = true;
                            rows.goals_before.get_or_insert(&before.value);
                        }
                        Undo::AgencyIntents { before, .. } => {
                            rows.agency = true;
                            rows.intents_before.get_or_insert(&before.value);
                        }
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
                        Undo::Condition {
                            key,
                            before,
                            root_present,
                            ..
                        } => {
                            rows.conditions
                                .entry(key.as_str())
                                .or_insert(before.is_some());
                            rows.actor |= !root_present;
                        }
                        Undo::Attribute { entity, id, before } => {
                            // Materialization also takes an inverse for a
                            // clamped, unchanged anchor. That alone is no
                            // persisted meter change.
                            if attribute_changed(state, *entity, id, before) {
                                rows.attributes.entry(id.as_str()).or_insert(true);
                            }
                        }
                        Undo::RestoreActor { .. } => { rows.actor = true; }
                        Undo::Practice { key, .. } => {
                            rows.practice.entry(key.as_str()).or_insert(true);
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
        if coaching {
            observe(
                output,
                "sim_coaching_episodes",
                &["world"],
                state.coaching.is_present(),
                0,
                budget,
            )?;
        }
        for ((slot, generation), rows) in selected {
            let entity = state
                .entities
                .resolve(EntityHandle { slot, generation })
                .ok_or_else(error)?;
            let id = entity.id.as_str();
            let parent = ["world", "entities", id];
            if rows.added {
                let base = ledger
                    .coverage("sim_entities", "[\"world\"]")
                    .ok_or_else(error)?
                    .next_ordinal;
                let ordinal = base
                    .checked_add(added)
                    .filter(|n| *n < MAX_SAFE_INTEGER)
                    .ok_or_else(error)?;
                added += 1;
                write_corpse(entity, ordinal, output, budget)?;
                continue;
            }
            if rows.root
                || rows
                    .remains_before
                    .is_some_and(|before| before != entity.remains.is_some())
            {
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
                            + entity.name.storage_bytes()
                            + 3 * size_of::<SqlCell>(),
                    )
                    .map_err(|_| error())?;
                output.write(
                    "sim_entities",
                    placement,
                    entity,
                    &[
                        SqlCell::from(id),
                        SqlCell::from(entity.kind.as_str()),
                        SqlCell::from(entity.name.clone()),
                    ],
                    false,
                    RowEffects::default(),
                )?;
            }
            if rows.placement {
                write_placement(
                    ledger,
                    output,
                    id,
                    entity.placement.as_ref().ok_or_else(error)?,
                    budget,
                )?;
            }
            if rows
                .geometry_heading
                .is_some_and(|before| before != entity.spatial.heading)
                || rows.geometry_lifecycle.is_some_and(|(fall, avoidance)| {
                    fall != entity.spatial.fall_velocity
                        || avoidance != entity.spatial.local_avoidance_ready_at
                })
            {
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
            if rows.remains {
                one(
                    ledger,
                    output,
                    "sim_remains",
                    &["world", "entities", id, "remains"],
                    &parent,
                    "remains",
                    entity.remains.as_ref(),
                    budget,
                )?;
                observe(
                    output,
                    "sim_remains",
                    &parent,
                    entity.remains.is_some(),
                    u64::from(entity.remains.is_some()),
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
            if rows.action
                || rows.agency
                || !rows.attributes.is_empty()
                || !rows.conditions.is_empty()
                || !rows.practice.is_empty()
            {
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
                    agency::encode(
                        id,
                        &actor.ok_or_else(error)?.agency,
                        rows.plan_before,
                        rows.history_before,
                        rows.goals_before,
                        rows.intents_before,
                        ledger,
                        output,
                        budget,
                    )?;
                }
                if !rows.conditions.is_empty() {
                    map(
                        ledger,
                        output,
                        "sim_actor_conditions",
                        &actor_parent,
                        "conditions",
                        actor.and_then(|actor| actor.conditions.as_ref()),
                        &rows.conditions,
                        false,
                        budget,
                    )?;
                }
                if !rows.practice.is_empty() {
                    map(
                        ledger,
                        output,
                        "sim_actor_practice",
                        &actor_parent,
                        "practice",
                        actor.and_then(|actor| actor.practice.as_ref()),
                        &rows.practice,
                        false,
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
                    let prior = rows.episode_before.and_then(|before| before.as_ref());
                    let current = animal.episode.as_ref();
                    let header_changed = match (prior, current) {
                        (Some(before), Some(after)) => !before.same_saved_header(after),
                        (None, None) => false,
                        _ => true,
                    };
                    if header_changed {
                        one(
                            ledger,
                            output,
                            "sim_native_response_episodes",
                            &episode_parent,
                            &animal_parent,
                            "episode",
                            current,
                            budget,
                        )?;
                    }
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
        if added > 0 {
            let base = ledger
                .coverage("sim_entities", "[\"world\"]")
                .ok_or_else(error)?
                .next_ordinal;
            observe(
                output,
                "sim_entities",
                &["world"],
                true,
                base.checked_add(added).ok_or_else(error)?,
                budget,
            )?;
        }
        if !work.is_empty() {
            let current = state.work.state();
            // The installed policy is immutable; the parent has only its pin
            // and the empty invocation marker. Changing a child cannot dirty
            // that header (or add a database write to every rate interval).
            let present = ledger
                .presence("sim_work_state", "[\"world\",\"workState\"]", "[\"world\"]")
                .ok_or_else(error)?;
            if present != current.is_some() {
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
            }
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
            for (id, changes) in &subject_changes {
                let current = state
                    .pending_values
                    .as_ref()
                    .and_then(|window| window.by_entity.get(*id));
                if !subject_links_changed(current, changes, budget)? {
                    subjects.shift_remove(*id);
                }
            }
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
