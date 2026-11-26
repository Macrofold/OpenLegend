//! Physical products selected from the single sparse inverse journal. No world
//! snapshot/diff or TypeScript reconstruction decides what must be persisted.
use super::*;
use crate::host::retained_size::map_storage;
use crate::projectile::passages::{FIELD as PASSAGE_FIELD, TABLE as PASSAGE_TABLE};
use crate::records::{
    OrderedMapRows, OwnerCoverage, RecordEncodingError, RecordLedger, RowEffects, RowEncoder,
    SelectedPlacement, SqlCell,
};
use serde::Serialize;
mod agency;
mod encounters;
mod participation;
mod person_creation;
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
    assembly: bool,
    item: bool,
    container: bool,
    retirement: bool,
    geometry_heading: Option<f64>,
    geometry_lifecycle: Option<(Option<f64>, Option<f64>)>,
    local_pose_before: Option<(&'a Option<crate::state::LocalPose>, Option<f64>)>,
    flight_before: Option<(&'a Option<crate::flight::FlightProgress>, Option<f64>)>,
    actor: bool,
    action: bool,
    agency: bool,
    plan_before: Option<&'a Option<crate::plans::ActorPlan>>,
    history_before: Option<&'a Vec<crate::plans::PlanStep>>,
    traits_before: Option<&'a Option<Vec<crate::state::CharacterTrait>>>,
    goals_before: Option<&'a Vec<crate::state::Goal>>,
    intents_before: Option<&'a Vec<crate::plans::PendingIntent>>,
    animal: bool,
    resource: bool,
    heat: bool,
    territorial: bool,
    episode: bool,
    episode_before: Option<&'a Option<crate::native_response::NativeResponseEpisode>>,
    encounters_before: Option<&'a Option<Box<crate::combat_encounters::PersonalEncounters>>>,
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
// Both goals and traits are actor-owned, keyed arrays. Preserve original
// positions, identities and absence when emitting their durable child rows.
fn keyed_children<T:Serialize+PartialEq>(table:&str,parent:&[&str],field:&str,before:&[T],after:Option<&[T]>,id:impl Fn(&T)->&str,ledger:&RecordLedger,output:&mut RowEncoder<'_>,budget:&ByteBudget)->Result<(),RecordEncodingError>{
    let rows=after.unwrap_or_default();
    let _paths=budget.reserve((parent.len()+2)*size_of::<&str>()).map_err(|_|error())?;
    let path=|key:&str|crate::encoding::json_record(&parent.iter().copied().chain([field,key]).collect::<Vec<_>>());
    for prior in before.iter().filter(|p|!rows.iter().any(|r|id(p)==id(r))){
        let _key=budget.reserve(parent.iter().map(|p|p.len()+4).sum::<usize>()*6+(field.len()+id(prior).len())*6+32).map_err(|_|error())?;
        output.delete(table,&path(id(prior)).map_err(|_|error())?,false)?;
    }
    for (index,row) in rows.iter().enumerate(){
        if before.get(index)==Some(row){continue}
        let _slot=budget.reserve(32).map_err(|_|error())?;
        let slot=index.to_string();
        let keys:Vec<_>=parent.iter().copied().chain([field,id(row)]).collect();
        let address=SelectedPlacement::new(ledger,table,&keys,parent,&slot,index as u64,!before.iter().any(|old|id(old)==id(row)),budget)?;
        output.write(table,address.value(),row,&[],address.create(),RowEffects::default())?;
    }
    observe(output,table,parent,after.is_some(),rows.len() as u64,budget)
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
fn projectile_passage_slot(
    animal: &str,
    life: u64,
    budget: &ByteBudget,
) -> Result<(String, ByteReservation), RecordEncodingError> {
    let identity = (animal, life);
    let bytes = crate::encoding::json_record_len(&identity).map_err(|_| error())?;
    let custody = budget.reserve(bytes).map_err(|_| error())?;
    Ok((crate::encoding::json_record(&identity).map_err(|_| error())?, custody))
}

fn write_projectile_passage(
    output: &mut RowEncoder<'_>,
    shot: &str,
    animal: &str,
    life: u64,
    ordinal: u64,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let (slot, _funded) = projectile_passage_slot(animal, life, budget)?;
    let owner = ["world", "projectiles", shot];
    let path = ["world", "projectiles", shot, PASSAGE_FIELD, &slot];
    created(output, PASSAGE_TABLE, &path, &owner, &slot, ordinal, &true, &[], budget)
}

fn retire_projectile_passages(
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    shot: &str,
    old: &crate::projectile::FundedProjectile,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    if old.flight.has_passages() {
        for (key, _) in old.passages.entries() {
            let (slot, _funded) = projectile_passage_slot(&key.id, key.life, budget)?;
            let path = ["world", "projectiles", shot, PASSAGE_FIELD, &slot];
            let bytes = crate::encoding::json_record_len(&path).map_err(|_| error())?;
            let _key = budget.reserve(bytes).map_err(|_| error())?;
            let id = crate::encoding::json_record(&path).map_err(|_| error())?;
            // A whole flight can start, acquire a passage and stop in this
            // candidate. Only previously accepted child rows need deletion.
            if ledger.placement(PASSAGE_TABLE, &id).is_some() {
                output.delete(PASSAGE_TABLE, &id, false)?;
            }
        }
        observe(output, PASSAGE_TABLE, &["world", "projectiles", shot], false, 0, budget)?;
    }
    Ok(())
}

fn write_created_entity(
    entity: &crate::state::Entity,
    pile_kind: &str,
    position: u64,
    ledger: &RecordLedger,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let id = entity.id.as_str();
    let parent = ["world", "entities", id];
    let placement = entity.placement.as_ref();
    let _cells = budget
        .reserve(
            heap_sum([
                placement.map_or(Some(0), |value| placement_cell_bound(id, value)).ok_or_else(error)?,
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
    if let Some(placement) = placement {
        created(
            output,
            "sim_placements",
            &["world", "entities", id, "placement"],
            &parent,
            "placement",
            0,
            placement,
            &placement_cells(id, placement),
            budget,
        )?;
    }
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
    if entity.item.is_some() || entity.retirement.is_some() {
        if let Some(retirement) = &entity.retirement {
            created(
                output, "sim_object_retirements",
                &["world", "entities", id, "retirement"],
                &parent, "retirement", 0, retirement, &[], budget,
            )?;
        } else {
            write_item(ledger, entity, true, output, budget)?;
        }
        if let Some(container) = &entity.container {
            created(
                output, "sim_containers", &["world", "entities", id, "container"],
                &parent, "container", 0, container, &[], budget,
            )?;
        }
        if let Some(attributes) = &entity.attributes {
            for (ordinal, field, value) in OrderedMapRows::new(attributes, budget)?.iter() {
                created(
                    output, "sim_attributes",
                    &["world", "entities", id, "attributes", field],
                    &parent, field, ordinal, value, &[], budget,
                )?;
            }
        }
        if let Some(owner) = &entity.declared_owner {
            created(
                output, "sim_declared_owners",
                &["world", "entities", id, "declaredOwner"],
                &parent, "declaredOwner", 0, owner, &[], budget,
            )?;
        }
        observe(
            output, "sim_attributes", &parent, entity.attributes.is_some(),
            entity.attributes.as_ref().map_or(0, |rows| rows.len() as u64), budget,
        )?;
        return observe_entity_children(entity, &parent, output, budget);
    }
    if let Some(heat) = &entity.heat {
        created(output, "sim_heat", &["world", "entities", id, "heat"], &parent, "heat", 0,
            heat, &[], budget)?;
        observe(output, "sim_attributes", &parent, false, 0, budget)?;
        return observe_entity_children(entity, &parent, output, budget);
    }
    if crate::ground_items::is_item_pile(pile_kind, entity) {
        observe(output, "sim_attributes", &parent, false, 0, budget)?;
        return observe_entity_children(entity, &parent, output, budget);
    }
    let actor_parent = ["world", "entities", id, "actor"];
    let agency_parent = ["world", "entities", id, "actor", "agency"];
    let actor = entity.actor.as_ref().ok_or_else(error)?;
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
    if actor.alive && entity.remains.is_none() {
        return person_creation::write(entity, actor, output, budget);
    }
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
    observe_entity_children(entity, &parent, output, budget)?;
    observe(output, "sim_attributes", &parent, false, 0, budget)?;
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

fn observe_entity_children(
    entity: &crate::state::Entity,
    parent: &[&str],
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    for (table, present) in [
        ("sim_placements", entity.placement.is_some()),
        ("sim_entity_geometry", true),
        ("sim_actors", entity.actor.is_some()),
        ("sim_remains", entity.remains.is_some()),
        ("sim_assemblies", false),
        ("sim_items", entity.item.is_some()),
        ("sim_containers", entity.container.is_some()),
        ("sim_declared_owners", entity.declared_owner.is_some()),
        ("sim_object_retirements", entity.retirement.is_some()),
        ("sim_territorial_threat", false),
        ("sim_resources", false),
        ("sim_heat", entity.heat.is_some()),
        ("sim_reservoirs", false),
        ("sim_animal_behavior", false),
        ("sim_status_effects", false),
        ("sim_mechanism_fields", false),
    ] {
        observe(output, table, parent, present, u64::from(present), budget)?;
    }
    Ok(())
}

fn write_item(
    ledger: &RecordLedger,
    entity: &crate::state::Entity,
    newly_inserted: bool,
    output: &mut RowEncoder<'_>,
    budget: &ByteBudget,
) -> Result<(), RecordEncodingError> {
    let id = entity.id.as_str();
    let address = SelectedPlacement::new(
        ledger,
        "sim_items",
        &["world", "entities", id, "item"],
        &["world", "entities", id],
        "item",
        0,
        newly_inserted,
        budget,
    )?;
    if let Some(item) = &entity.item {
        let _cells = budget.reserve(
            heap_sum([id.len(), item.definition_pin.id.len(), 3 * size_of::<SqlCell>()])
                .ok_or_else(error)?,
        ).map_err(|_| error())?;
        output.write(
            "sim_items",
            address.value(),
            item,
            &[id.into(), item.definition_pin.id.as_str().into(), item.quantity.into()],
            address.create(),
            RowEffects::default(),
        )
    } else if address.create() {
        Ok(())
    } else {
        output.delete("sim_items", &address.value().id, false)
    }
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
        simulation: &SimulationState,
        output: &mut RowEncoder<'_>,
        budget: &ByteBudget,
    ) -> Result<(), RecordEncodingError> {
        let state = &simulation.physical;
        let ledger = &simulation.records;
        let (maximum, details, flight_changes) = self.undo.iter().try_fold(
            (self.undo.len(), 0usize, 0usize),
            |(maximum, details, flights), undo| match undo {
                Undo::Gate(patch) if patch.attached.is_some() => {
                    Some((maximum.checked_add(3)?, details, flights))
                }
                Undo::Inventory(before) if before.edited_item() => {
                    Some((maximum.checked_add(1 + before.changed_contents().count())?, details, flights))
                }
                Undo::Episode(episode) => {
                    Some((maximum, details.checked_add(episode.attributes.len())?, flights))
                }
                Undo::ProjectileLaunch { .. } | Undo::ProjectileProgress { .. } | Undo::ProjectilePassage { .. }
                | Undo::ProjectileCrossings { .. } | Undo::ProjectileRetire { .. } => {
                    Some((maximum, details, flights.checked_add(1)?))
                }
                _ => Some((maximum, details, flights)),
            },
        ).ok_or_else(error)?;
        let keys = maximum.checked_add(details).ok_or_else(error)?;
        let bytes = heap_sum([
            map_storage::<(usize, u64), EntityRows<'_>>(maximum).ok_or_else(error)?,
            map_storage::<&str, bool>(keys)
                .and_then(|bytes| bytes.checked_mul(5))
                .ok_or_else(error)?,
            map_storage::<&str, bool>(maximum).ok_or_else(error)?,
            map_storage::<&str, bool>(flight_changes).ok_or_else(error)?,
            map_storage::<&str, ()>(flight_changes).ok_or_else(error)?,
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
        let mut lessons = IndexMap::new();
        let mut object_membership = false;
        let mut object_lineage = false;
        let mut claims = IndexMap::with_capacity(maximum);
        let mut added = 0u64;
        let mut flights = IndexMap::with_capacity(flight_changes);
        let mut passage_owners = IndexSet::with_capacity(flight_changes);
        participation::encode_exposures(self, state, ledger, output, budget)?;
        for change in &self.undo {
            match change {
                Undo::InventoryAvailability(before) => {
                    let (handle, container) = before.selection();
                    let rows = selected.entry((handle.slot, handle.generation)).or_default();
                    rows.root = true;
                    rows.container |= container;
                }
                Undo::StructureEdit(patch) => {
                    selected.entry((patch.root.slot, patch.root.generation)).or_default().assembly = true;
                }
                Undo::Gate(patch) => {
                    selected.entry((patch.root.slot, patch.root.generation)).or_default().assembly = true;
                    for handle in patch.attached.iter().flatten() {
                        selected.entry((handle.slot, handle.generation)).or_default().placement = true;
                    }
                }
                Undo::ItemHoldAdded { id, .. } => { claims.insert(id.as_str(), None); }
                Undo::ItemHoldEnded { key, hold, .. } => { claims.insert(key.as_str(), Some(&**hold)); }
                // Pending consent is an inline setting in the canonical
                // world row, written by the parent settings encoder.
                Undo::ExitExposure { .. } | Undo::Gift(_) | Undo::MaterialWet { .. } | Undo::MaterialDetails { .. } => {}
                Undo::ProjectileLaunch { id, .. } => {
                    flights.entry(id.as_str()).or_insert(false);
                }
                Undo::ProjectileProgress { id, .. } | Undo::ProjectileCrossings { id, .. } => {
                    flights.entry(id.as_str()).or_insert(true);
                }
                Undo::ProjectilePassage { id, receiver, life, ordinal, present } => {
                    if let Some(flight) = state.projectiles.flights.get(id) {
                        if flight.passages.ordinal(receiver, *life) != Some(*ordinal) {
                            return Err(error());
                        }
                        if !present {
                            flights.entry(id.as_str()).or_insert(true);
                        }
                        passage_owners.insert(id.as_str());
                        write_projectile_passage(output, id, receiver, *life, *ordinal, budget)?;
                    }
                }
                Undo::ProjectileRetire { id, before, .. } => {
                    flights.entry(id.as_str()).or_insert(true);
                    retire_projectile_passages(ledger, output, id, before, budget)?;
                }
                Undo::CoachingPresence { .. } => coaching = true,
                Undo::CoachingEpisode { id, before, .. } => {
                    lessons.entry(id.as_str()).or_insert(before.is_some());
                    coaching=true;
                }
                Undo::RemovedPhysicalRoot(before) => {
                    // The transfer revised direct contents before taking the
                    // empty root out. Only the final deletion is published.
                    selected.shift_remove(&(before.handle.slot, before.handle.generation));
                    let id = before.entity.id.as_str();
                    let parent = ["world", "entities", id];
                    let _identity = budget.reserve(
                        crate::encoding::json_record_len(&parent).map_err(|_| error())?
                    ).map_err(|_| error())?;
                    let key = crate::encoding::json_record(&parent).map_err(|_| error())?;
                    output.delete("sim_entities", &key, false)?;
                    for (table, field) in [("sim_placements", "placement"), ("sim_entity_geometry", "spatial")] {
                        one::<()>(
                            ledger, output, table, &["world", "entities", id, field],
                            &parent, field, None, budget,
                        )?;
                        observe(output, table, &parent, false, 0, budget)?;
                    }
                }
                Undo::AddedEntity(before) => {
                    let rows = selected
                        .entry((before.handle.slot, before.handle.generation))
                        .or_default();
                    rows.added = true;
                }
                Undo::Inventory(before) => {
                    selected
                        .entry((before.parent.slot, before.parent.generation))
                        .or_default()
                        .root = true;
                    for (handle, container) in before.changed_contents() {
                        let rows = selected.entry((handle.slot, handle.generation)).or_default();
                        rows.root = true;
                        rows.container |= container;
                    }
                    object_membership |= before.changed_membership();
                    if before.edited_item() || before.changed_placement() {
                        let rows = selected
                            .entry((before.child.slot, before.child.generation))
                            .or_default();
                        rows.item |= before.edited_item();
                        rows.placement |= before.changed_placement();
                        if before.retired() {
                            rows.retirement = true;
                            rows.container |= before.retired_container();
                            rows.root = true;
                        }
                    }
                    if let Some((ordinal, entry)) = &before.lineage {
                        object_lineage = true;
                        let _cells = budget.reserve(
                            entry.source_id.len() + entry.target_id.as_ref().map_or(0, String::len)
                                + 2 * size_of::<SqlCell>(),
                        ).map_err(|_| error())?;
                        created(
                            output, "sim_object_lineage",
                            &["world", "objectLineage", &entry.id],
                            &["world"], &entry.id, *ordinal, entry,
                            &[entry.source_id.as_str().into(), entry.target_id.as_deref().map_or(SqlCell::Null, SqlCell::from)], budget,
                        )?;
                    }
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
                        | Undo::Flight { entity, .. }
                        | Undo::RestoreActor { entity, .. }
                        | Undo::Participation { entity, .. }
                        | Undo::CoachingParticipant {entity,..}
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
                        | Undo::LocalPose { entity, .. }
                        | Undo::Remains { entity, .. }
                        | Undo::PendingDeath { entity, .. }
                        | Undo::Scar { entity, .. }
                        | Undo::Contacts { entity, .. }
                        | Undo::Heading { entity, .. }
                        | Undo::Health { entity, .. }
                        | Undo::CombatReady { entity, .. }
                        | Undo::EvasionReady { entity, .. }
                        | Undo::PersonTraits {entity,..}
                        | Undo::PersonProfile { entity, .. }
                        | Undo::AttackModeNotice { entity, .. }
                        | Undo::PersonalEncounters { entity, .. }
                        | Undo::ContactPhase { entity, .. }
                        | Undo::StrikeMotion { entity, .. }
                        | Undo::AttackObservers { entity, .. }
                        | Undo::AttackExecution { entity, .. }
                        | Undo::Heat { entity, .. }
                        | Undo::Territorial { entity, .. }
                        | Undo::TerritorialPlace { entity, .. }
                        | Undo::Action { entity, .. }
                        | Undo::ActionPath { entity, .. }
                        | Undo::ActionRoute { entity, .. }
                        | Undo::ActionFollow { entity, .. }
                        | Undo::ActionReplans { entity, .. }
                        | Undo::ActionNavigation { entity, .. }
                        | Undo::ActionRemaining { entity, .. }
                        | Undo::ActionSample { entity, .. }
                        | Undo::ActionAimMotion { entity, .. }
                        | Undo::SensoryProgress { entity, .. }
                        | Undo::AnimalEpisode { entity, .. }
                        | Undo::Foraging { entity, .. }
                        | Undo::ResourceStock { entity, .. }
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
                        Undo::PersonTraits{before,..}=>{
                            rows.traits_before.get_or_insert(before);
                            if before.is_none(){rows.actor=true}
                        }
                        Undo::PersonProfile { .. } => {
                            rows.root = true;
                            rows.actor = true;
                        }
                        Undo::SensoryProgress { .. } => rows.root = true,
                        Undo::Participation { .. } | Undo::CoachingParticipant {..} => rows.actor = true,
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
                        Undo::LocalPose { before, ready_at, .. } => {
                            rows.local_pose_before.get_or_insert((before, *ready_at));
                        }
                        Undo::Flight { before, fall_velocity, .. } => {
                            rows.flight_before.get_or_insert((before, *fall_velocity));
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
                        Undo::Health { .. }
                        | Undo::CombatReady { .. }
                        | Undo::EvasionReady { .. }
                        | Undo::AttackModeNotice { .. } => rows.actor = true,
                        Undo::PersonalEncounters { before, .. } => {
                            rows.encounters_before.get_or_insert(before);
                        }
                        Undo::Heat { .. } => rows.heat = true,
                        Undo::Territorial { .. } | Undo::TerritorialPlace { .. } => rows.territorial = true,
                        Undo::Action { .. } => {
                            rows.actor = true;
                            rows.action = true;
                        }
                        Undo::ActionPath { .. }
                        | Undo::ActionRoute { .. }
                        | Undo::ActionFollow { .. }
                        | Undo::ActionReplans { .. }
                        | Undo::ActionNavigation { .. }
                        | Undo::ActionRemaining { .. }
                        | Undo::ContactPhase { .. }
                        | Undo::StrikeMotion { .. }
                        | Undo::AttackObservers { .. }
                        | Undo::AttackExecution { .. }
                        | Undo::ActionSample { .. }
                        | Undo::ActionAimMotion { .. } => rows.action = true,
                        Undo::AnimalEpisode { before, .. } => {
                            rows.episode = true;
                            if rows.episode_before.is_none() {
                                rows.episode_before = Some(before);
                            }
                        }
                        Undo::AnimalWander { .. }
                        | Undo::AnimalPhysicalLife { .. }
                        | Undo::Foraging { .. } => rows.animal = true,
                        Undo::ResourceStock { .. } => rows.resource = true,
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
                        Undo::RestoreActor { .. } => {
                            rows.actor = true;
                        }
                        Undo::Practice { key, .. } => {
                            rows.practice.entry(key.as_str()).or_insert(true);
                        }
                        _ => return Err(error()),
                    }
                }
            }
        }
        if !flights.is_empty() {
            map(ledger, output, "sim_projectiles", &["world"], "projectiles", state.projectiles.present.then_some(&state.projectiles.flights), &flights, false, budget)?;
        }
        for shot in passage_owners {
            let flight = state.projectiles.flights.get(shot).ok_or_else(error)?;
            observe(output, PASSAGE_TABLE, &["world", "projectiles", shot], true,
                flight.passages.next_ordinal(), budget)?;
        }
        if !claims.is_empty() {
            let table = "sim_resource_reservations";
            let parent = ["world"];
            for (id, after) in claims {
                let row = after.or_else(|| state.holds.get(id)).ok_or_else(error)?;
                let path = ["world", "resourceReservations", id];
                let placement = SelectedPlacement::new(ledger, table, &path, &parent, id,
                    row.ordinal, true, budget)?;
                output.write(table, placement.value(), &row.value, &[], placement.create(), RowEffects::default())?;
            }
            output.observe_owner(&state.holds.coverage)?;
        }
        if object_membership {
            one(
                ledger, output, "sim_object_state",
                &["world", "objectState"], &["world"], "objectState",
                Some(&simulation.administration.object_membership), budget,
            )?;
        }
        if object_lineage {
            output.observe_owner(&simulation.inventory.lineage)?;
        }
        if coaching {
            map(ledger,output,"sim_coaching_episodes",&["world"],"coachingEpisodes",
                state.coaching.is_present().then_some(&state.coaching.records),&lessons,false,budget)?;
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
                write_created_entity(
                    entity, &simulation.installed.observation_rules.value().pile_kind,
                    ordinal, ledger, output, budget,
                )?;
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
                if let Some(placement) = &entity.placement {
                    write_placement(ledger, output, id, placement, budget)?;
                } else {
                    let address = SelectedPlacement::new(
                        ledger, "sim_placements", &["world", "entities", id, "placement"],
                        &parent, "placement", 0, false, budget,
                    )?;
                    output.delete("sim_placements", &address.value().id, false)?;
                    observe(output, "sim_placements", &parent, false, 0, budget)?;
                }
            }
            if rows.assembly {
                one(ledger, output, "sim_assemblies", &["world", "entities", id, "assembly"],
                    &parent, "assembly", entity.assembly.as_deref(), budget)?;
            }
            if rows.item {
                write_item(ledger, entity, false, output, budget)?;
                if entity.item.is_none() {
                    observe(output, "sim_items", &parent, false, 0, budget)?;
                }
            }
            if rows.container {
                one(
                    ledger, output, "sim_containers",
                    &["world", "entities", id, "container"], &parent, "container",
                    entity.container.as_ref(), budget,
                )?;
                let present = entity.container.is_some();
                observe(output, "sim_containers", &parent, present, u64::from(present), budget)?;
            }
            if rows.retirement {
                one(
                    ledger, output, "sim_object_retirements",
                    &["world", "entities", id, "retirement"],
                    &parent, "retirement", entity.retirement.as_ref(), budget,
                )?;
                observe(output, "sim_object_retirements", &parent, true, 1, budget)?;
            }
            if rows
                .geometry_heading
                .is_some_and(|before| before != entity.spatial.heading)
                || rows.geometry_lifecycle.is_some_and(|(fall, avoidance)| {
                    fall != entity.spatial.fall_velocity
                        || avoidance != entity.spatial.local_avoidance_ready_at
                })
                || rows.local_pose_before.is_some_and(|(before, ready_at)| {
                    before != &entity.spatial.local_pose
                        || ready_at != entity.spatial.local_avoidance_ready_at
                })
                || rows.flight_before.is_some_and(|(before, fall)| {
                    before != &entity.spatial.flight || fall != entity.spatial.fall_velocity
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
            if let Some(before)=rows.traits_before{
                keyed_children("sim_actor_traits",&actor_parent,"traits",before.as_deref().unwrap_or_default(),entity.actor.as_ref().and_then(|a|a.traits.as_deref()),|t|t.id.as_str(),ledger,output,budget)?;
            }
            let current_encounters = entity.actor.as_ref().and_then(|actor| actor.encounters.as_deref());
            if rows.actor || rows.encounters_before.is_some_and(|before| before.is_some() != current_encounters.is_some()) {
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
            if let Some(before) = rows.encounters_before {
                encounters::encode(id, before.as_deref(), current_encounters, ledger, output, budget)?;
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
            if rows.resource {
                one(
                    ledger,
                    output,
                    "sim_resources",
                    &["world", "entities", id, "resource"],
                    &parent,
                    "resource",
                    entity.resource.as_ref(),
                    budget,
                )?;
            }
            if rows.heat {
                one(
                    ledger,
                    output,
                    "sim_heat",
                    &["world", "entities", id, "heat"],
                    &parent,
                    "heat",
                    entity.heat.as_ref(),
                    budget,
                )?;
            }
            if rows.territorial {
                one(
                    ledger,
                    output,
                    "sim_territorial_threat",
                    &["world", "entities", id, "threat"],
                    &parent,
                    "threat",
                    entity.threat.as_ref(),
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
