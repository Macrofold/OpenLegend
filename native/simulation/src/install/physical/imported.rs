//! One-time finite SQL-child assembly preserves every raw JSON string token.
//! Only known owned children are stitched; typed current-format decoders admit
//! the resulting entity/window/work records. No JSON world survives install.
use super::{PhysicalDefinitions, validate_body_references, validate_entity};
use crate::install::rows;
use crate::install::{InstallError, RowImport};
use crate::state::{Entity, EntityStore, WorkState};
use crate::values::NativeValueWindow;
use indexmap::IndexMap;
use serde::{Serialize, de::DeserializeOwned};
use serde_json::{Map, Value, value::RawValue};
type RawRecord = IndexMap<String, Box<RawValue>>;
fn encode<T: Serialize + ?Sized>(value: &T) -> Result<Box<RawValue>, InstallError> {
    RawValue::from_string(serde_json::to_string(value).map_err(|_| InstallError::CurrentFormat)?)
        .map_err(|_| InstallError::CurrentFormat)
}
fn decode<T: DeserializeOwned>(value: &RawRecord) -> Result<T, InstallError> {
    serde_json::from_str(&serde_json::to_string(value).map_err(|_| InstallError::CurrentFormat)?)
        .map_err(|_| InstallError::CurrentFormat)
}
fn child_present(parent: &RawRecord, field: &str, array: bool) -> Result<bool, InstallError> {
    match parent.get(field) {
        None => Ok(false),
        Some(value) if value.get().trim() == "null" => Ok(false),
        Some(value)
            if (if array {
                serde_json::from_str::<[(); 0]>(value.get()).is_ok()
            } else {
                serde_json::from_str::<crate::experience::EmptyChildOwner>(value.get()).is_ok()
            }) =>
        {
            Ok(true)
        }
        _ => Err(InstallError::CurrentFormat),
    }
}
fn one(
    import: &mut RowImport,
    parent: &mut RawRecord,
    parent_id: &str,
    field: &str,
    table: &str,
    join: fn(&mut RowImport, &mut RawRecord, &str) -> Result<(), InstallError>,
) -> Result<(), InstallError> {
    let present = child_present(parent, field, false)?;
    if let Some((row, mut value)) =
        rows::take_one::<RawRecord>(import, table, parent_id, field, present)?
    {
        if table != "sim_placements" && !row.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        if table == "sim_placements" {
            let path: Vec<String> =
                serde_json::from_str(&row.id).map_err(|_| InstallError::RowIdentity)?;
            let entity_id = path.get(2).ok_or(InstallError::RowIdentity)?;
            let placement: Map<String, Value> =
                serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
            let field = |name: &str| placement.get(name).cloned().unwrap_or(Value::Null);
            let component = |field: &str, axis: &str| {
                placement
                    .get(field)
                    .and_then(|v| v.get(axis))
                    .cloned()
                    .unwrap_or(Value::Null)
            };
            let expected = serde_json::json!([
                entity_id,
                field("mode"),
                field("parentEntityId"),
                field("portId"),
                field("slot"),
                component("local", "x"),
                component("local", "y"),
                component("local", "z"),
                field("supportSurfaceId"),
                component("position", "x"),
                component("position", "y"),
                component("position", "z")
            ]);
            if crate::encoding::json_record(&row.extra).map_err(|_| InstallError::CurrentFormat)?
                != crate::encoding::json_value(&expected)
                    .map_err(|_| InstallError::CurrentFormat)?
            {
                return Err(InstallError::CurrentFormat);
            }
        }
        join(import, &mut value, &row.id)?;
        parent.insert(field.to_owned(), encode(&value)?);
    }
    Ok(())
}
fn plain(_import: &mut RowImport, _parent: &mut RawRecord, _id: &str) -> Result<(), InstallError> {
    Ok(())
}
fn collection(
    import: &mut RowImport,
    parent: &mut RawRecord,
    parent_id: &str,
    field: &str,
    table: &str,
    list: bool,
    keyed: bool,
    join: fn(&mut RowImport, &mut RawRecord, &str) -> Result<(), InstallError>,
) -> Result<(), InstallError> {
    let present = child_present(parent, field, list)?;
    let input = rows::take_collection(import, table, parent_id, present, true)?;
    if !present {
        return Ok(());
    }
    let mut map = RawRecord::new();
    let mut array: Vec<Box<RawValue>> = Vec::new();
    let mut positions = std::collections::BTreeSet::new();
    for row in input.rows {
        if !positions.insert(row.position) || !row.extra.is_empty() {
            return Err(InstallError::RowPlacement);
        }
        let path: Vec<String> =
            serde_json::from_str(&row.id).map_err(|_| InstallError::RowIdentity)?;
        let key = if keyed {
            path.last().ok_or(InstallError::RowIdentity)?.as_str()
        } else {
            row.slot.as_str()
        };
        if list {
            let mut expected: Vec<String> =
                serde_json::from_str(parent_id).map_err(|_| InstallError::RowIdentity)?;
            expected.push(field.to_owned());
            expected.push(key.to_owned());
            if row.id
                != crate::encoding::json_record(&expected).map_err(|_| InstallError::RowIdentity)?
                || row.parent != parent_id
                || row.position >= input.coverage.next_ordinal
            {
                return Err(InstallError::RowPlacement);
            }
        } else {
            rows::validate_map_row(&row, parent_id, field, key, input.coverage.next_ordinal)?;
        }
        let mut value: RawRecord =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        join(import, &mut value, &row.id)?;
        if list {
            array.push(encode(&value)?);
        } else if map.insert(key.to_owned(), encode(&value)?).is_some() {
            return Err(InstallError::DuplicateRow);
        }
    }
    parent.insert(
        field.to_owned(),
        if list { encode(&array)? } else { encode(&map)? },
    );
    Ok(())
}
fn agency(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    collection(import, value, id, "goals", "sim_goals", true, true, plain)?;
    one(import, value, id, "plan", "sim_plans", plan)?;
    collection(
        import,
        value,
        id,
        "history",
        "sim_plan_history",
        true,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "attempts",
        "sim_intentions",
        true,
        true,
        plain,
    )
}
fn plan(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "steps",
        "sim_plan_steps",
        true,
        true,
        plain,
    )
}
fn actor(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    one(import, value, id, "action", "sim_processes", plain)?;
    one(import, value, id, "agency", "sim_agency", agency)?;
    collection(
        import,
        value,
        id,
        "attributes",
        "sim_actor_attributes",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "practice",
        "sim_actor_practice",
        false,
        false,
        plain,
    )?;
    one(
        import,
        value,
        id,
        "encounters",
        "sim_personal_encounters",
        encounters,
    )?;
    collection(
        import,
        value,
        id,
        "conditions",
        "sim_actor_conditions",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "traits",
        "sim_actor_traits",
        true,
        true,
        plain,
    )
}
fn encounters(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "pairs",
        "sim_encounter_pairs",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "unknown",
        "sim_unknown_dangers",
        false,
        false,
        plain,
    )
}
fn animal(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "acousticPatterns",
        "sim_native_acoustic_patterns",
        false,
        false,
        plain,
    )?;
    one(
        import,
        value,
        id,
        "episode",
        "sim_native_response_episodes",
        episode,
    )
}
fn episode(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    collection(
        import,
        value,
        id,
        "dangers",
        "sim_native_response_dangers",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "preparations",
        "sim_native_attack_preparations",
        false,
        false,
        plain,
    )
}
fn entity(import: &mut RowImport, value: &mut RawRecord, id: &str) -> Result<(), InstallError> {
    for (field, table) in [
        ("placement", "sim_placements"),
        ("assembly", "sim_assemblies"),
        ("item", "sim_items"),
        ("container", "sim_containers"),
        ("declaredOwner", "sim_declared_owners"),
        ("retirement", "sim_object_retirements"),
        ("spatial", "sim_entity_geometry"),
        ("threat", "sim_territorial_threat"),
        ("resource", "sim_resources"),
        ("remains", "sim_remains"),
        ("heat", "sim_heat"),
        ("replenisher", "sim_reservoirs"),
    ] {
        one(import, value, id, field, table, plain)?;
    }
    one(import, value, id, "actor", "sim_actors", actor)?;
    one(import, value, id, "animal", "sim_animal_behavior", animal)?;
    collection(
        import,
        value,
        id,
        "statusEffects",
        "sim_status_effects",
        false,
        false,
        plain,
    )?;
    collection(
        import,
        value,
        id,
        "attributes",
        "sim_attributes",
        false,
        false,
        plain,
    )?;
    // A mechanism field value is a plain numeric map rather than an object
    // family. No selected body has one; preserve/refuse its explicit presence.
    collection(
        import,
        value,
        id,
        "mechanismFields",
        "sim_mechanism_fields",
        false,
        false,
        plain,
    )
}
pub(super) fn install_entities(
    import: &mut RowImport,
    present: bool,
    installed: &PhysicalDefinitions<'_>,
    now: f64,
) -> Result<EntityStore, InstallError> {
    if !present {
        return Err(InstallError::ParentPresence);
    }
    let input = rows::take_collection(import, "sim_entities", "[\"world\"]", true, true)?;
    let ordering = import.take_entity_ordering()?;
    let mut orders: IndexMap<String, String> = ordering
        .entries
        .into_iter()
        .map(|e| (e.id, e.key))
        .collect();
    let mut entries = Vec::with_capacity(input.rows.len());
    for row in input.rows {
        let mut value: RawRecord =
            serde_json::from_str(&row.payload).map_err(|_| InstallError::CurrentFormat)?;
        let id: String = serde_json::from_str(value.get("id").ok_or(InstallError::Identity)?.get())
            .map_err(|_| InstallError::Identity)?;
        rows::validate_map_row(
            &row,
            "[\"world\"]",
            "entities",
            &id,
            input.coverage.next_ordinal,
        )?;
        entity(import, &mut value, &row.id)?;
        let entity: Entity = decode(&value)?;
        let expected_id = crate::records::SqlCell::from(id.clone());
        let expected_kind = crate::records::SqlCell::from(entity.kind.clone());
        let name_matches = row
            .extra
            .get(2)
            .and_then(crate::records::SqlCell::as_text)
            .is_some_and(|indexed| {
                // PostgreSQL TEXT receives Node's UTF8 transport, which replaces
                // isolated UTF16 units. The canonical JSON body retains those
                // original units; this comparison never rewrites that authority.
                if import.durable_revision() > 0 {
                    entity.name.matches_utf8_transport(indexed)
                } else {
                    entity.name == *indexed
                }
            });
        if row.extra.len() != 3
            || row.extra[0] != expected_id
            || row.extra[1] != expected_kind
            || !name_matches
        {
            return Err(InstallError::CurrentFormat);
        }
        validate_entity(&entity, installed, now)?;
        let order = orders.shift_remove(&id).ok_or(InstallError::Identity)?;
        entries.push((order, entity));
    }
    if !orders.is_empty() {
        return Err(InstallError::Identity);
    }
    let entities = EntityStore::install(entries, ordering.next_insertion)
        .map_err(|_| InstallError::Identity)?;
    validate_body_references(&entities, installed, now)?;
    Ok(entities)
}
pub(super) fn take_window(
    import: &mut RowImport,
    present: bool,
) -> Result<Option<NativeValueWindow>, InstallError> {
    let Some((row, mut value)) = rows::take_one::<RawRecord>(
        import,
        "sim_native_values",
        "[\"world\"]",
        "pendingNativeIntegration",
        present,
    )?
    else {
        return Ok(None);
    };
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    collection(
        import,
        &mut value,
        &row.id,
        "bindings",
        "sim_native_value_bindings",
        false,
        false,
        plain,
    )?;
    // byEntity values bind attribute IDs to their actual retained episodes.
    let is_present = child_present(&value, "byEntity", false)?;
    let collection = rows::take_collection(
        import,
        "sim_native_value_subjects",
        &row.id,
        is_present,
        true,
    )?;
    let mut subjects = RawRecord::new();
    for child in collection.rows {
        rows::validate_map_row(
            &child,
            &row.id,
            "byEntity",
            &child.slot,
            collection.coverage.next_ordinal,
        )?;
        if !child.extra.is_empty() {
            return Err(InstallError::CurrentFormat);
        }
        let ids: IndexMap<String, String> =
            serde_json::from_str(&child.payload).map_err(|_| InstallError::CurrentFormat)?;
        subjects.insert(child.slot, encode(&ids)?);
    }
    if is_present {
        value.insert("byEntity".to_owned(), encode(&subjects)?);
    }
    decode(&value).map(Some)
}
pub(super) fn take_work(
    import: &mut RowImport,
    present: bool,
) -> Result<Option<WorkState>, InstallError> {
    let Some((row, mut value)) = rows::take_one::<RawRecord>(
        import,
        "sim_work_state",
        "[\"world\"]",
        "workState",
        present,
    )?
    else {
        return Ok(None);
    };
    if !row.extra.is_empty() {
        return Err(InstallError::CurrentFormat);
    }
    collection(
        import,
        &mut value,
        &row.id,
        "invocations",
        "sim_work_invocations",
        false,
        false,
        plain,
    )?;
    decode(&value).map(Some)
}
