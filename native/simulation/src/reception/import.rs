//! One-time consuming assembly of the existing receiver SQL records. This
//! returns typed owners, never a writable JSON world or an accepted runtime.

use super::*;
use crate::install::rows::{take_collection, take_one, validate_row};
use crate::install::{InstallError, RowImport};
use crate::received::ReceivedValues;
use crate::records::{ChildShape, RecordSchema};
use serde::de::DeserializeOwned;
use serde_json::{Map, Value};

/// Each bit comes from the actual parent's current-format child marker. Root
/// presence must never be inferred from resident rows or an empty collection.
pub(crate) struct ReceptionRoots {
    pub sensory: bool,
    pub perception_evidence: bool,
    pub observer_identities: bool,
    pub perception_episodes: bool,
    pub actor_knowledge: bool,
    pub knowledge_revisions: bool,
    pub visible_objects: bool,
    pub visible_people: bool,
    pub visible_places: bool,
    pub map_markers: bool,
}

fn invalid() -> InstallError {
    InstallError::CurrentFormat
}
fn path(parts: &[&str]) -> Result<String, InstallError> {
    crate::encoding::json_record(parts).map_err(|_| InstallError::RowIdentity)
}
fn object(value: Value) -> Result<Map<String, Value>, InstallError> {
    match value {
        Value::Object(object) => Ok(object),
        _ => Err(invalid()),
    }
}
fn marker(body: &Map<String, Value>, field: &str, shape: ChildShape) -> Result<bool, InstallError> {
    match body.get(field) {
        None => Ok(false),
        Some(Value::Object(map)) if shape == ChildShape::Object && map.is_empty() => Ok(true),
        Some(Value::Array(values)) if shape == ChildShape::Array && values.is_empty() => Ok(true),
        _ => Err(invalid()),
    }
}
fn decode<T: DeserializeOwned>(value: Value) -> Result<T, InstallError> {
    serde_json::from_value(value).map_err(|_| invalid())
}
fn parse<T: DeserializeOwned>(value: &str) -> Result<T, InstallError> {
    serde_json::from_str(value).map_err(|_| invalid())
}

/// `$` is a structural schema node; it adds no fictional path segment.
fn map_rows<T>(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: Option<&str>,
    present: bool,
    mut decode_row: impl FnMut(&mut RowImport, &crate::records::InstalledRow) -> Result<T, InstallError>,
) -> Result<Option<IndexMap<String, T>>, InstallError> {
    let collection = take_collection(import, table, parent, present, true)?;
    if !present {
        return Ok(None);
    }
    let mut result = IndexMap::new();
    for row in collection.rows {
        let mut parts: Vec<String> = parse(parent)?;
        if let Some(field) = field {
            parts.push(field.to_owned());
        }
        parts.push(row.slot.clone());
        validate_row(
            &row,
            &parts.iter().map(String::as_str).collect::<Vec<_>>(),
            parent,
            &row.slot,
            collection.coverage.next_ordinal,
        )?;
        if result
            .insert(row.slot.clone(), decode_row(import, &row)?)
            .is_some()
        {
            return Err(InstallError::DuplicateRow);
        }
    }
    Ok(Some(result))
}
fn ordinary_map<T: DeserializeOwned>(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: Option<&str>,
    present: bool,
) -> Result<Option<IndexMap<String, T>>, InstallError> {
    map_rows(import, table, parent, field, present, |_import, row| {
        parse(&row.payload)
    })
}
fn list_rows<T: DeserializeOwned>(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: Option<&str>,
    present: bool,
    key: Option<&str>,
) -> Result<Option<Vec<T>>, InstallError> {
    let collection = take_collection(import, table, parent, present, true)?;
    if !present {
        return Ok(None);
    }
    let mut result = Vec::new();
    for row in collection.rows {
        let value: Value = parse(&row.payload)?;
        let identity = if let Some(key) = key {
            value
                .get(key)
                .and_then(Value::as_str)
                .ok_or_else(invalid)?
                .to_owned()
        } else {
            result.len().to_string()
        };
        let slot = result.len().to_string();
        let mut parts: Vec<String> = parse(parent)?;
        if let Some(field) = field {
            parts.push(field.to_owned());
        }
        parts.push(identity);
        validate_row(
            &row,
            &parts.iter().map(String::as_str).collect::<Vec<_>>(),
            parent,
            &slot,
            collection.coverage.next_ordinal,
        )?;
        if row.position != result.len() as u64 {
            return Err(InstallError::RowPlacement);
        }
        result.push(decode(value)?);
    }
    Ok(Some(result))
}
fn put<T: Serialize>(
    body: &mut Map<String, Value>,
    field: &str,
    value: Option<T>,
) -> Result<(), InstallError> {
    if let Some(value) = value {
        body.insert(
            field.to_owned(),
            serde_json::to_value(value).map_err(|_| invalid())?,
        );
    }
    Ok(())
}
fn nested_maps<T: DeserializeOwned>(
    import: &mut RowImport,
    owner_table: &str,
    table: &str,
    field: &str,
    present: bool,
) -> Result<Option<IndexMap<String, IndexMap<String, T>>>, InstallError> {
    let root = path(&["world"])?;
    map_rows(
        import,
        owner_table,
        &root,
        Some(field),
        present,
        |import, row| {
            crate::install::rows::validate_marker(row, ChildShape::Object)?;
            ordinary_map(import, table, &row.id, None, true)?.ok_or_else(invalid)
        },
    )
}
fn nested_lists<T: DeserializeOwned>(
    import: &mut RowImport,
    owner_table: &str,
    table: &str,
    field: &str,
    present: bool,
) -> Result<Option<IndexMap<String, Vec<T>>>, InstallError> {
    let root = path(&["world"])?;
    map_rows(
        import,
        owner_table,
        &root,
        Some(field),
        present,
        |import, row| {
            crate::install::rows::validate_marker(row, ChildShape::Array)?;
            list_rows(import, table, &row.id, None, true, None)?.ok_or_else(invalid)
        },
    )
}

pub(crate) fn read_reception_rows(
    import: &mut RowImport,
    roots: ReceptionRoots,
    received_values: Option<ReceivedValues>,
    schema: &RecordSchema,
) -> Result<ReceptionState, InstallError> {
    let world = path(&["world"])?;
    let sensory = take_one::<Value>(
        import,
        "sim_sensory_continuation",
        &world,
        "sensory",
        roots.sensory,
    )?
    .map(|(row, value)| {
        let mut body = object(value)?;
        let scopes = marker(&body, "scopes", ChildShape::Object)?;
        let processed = marker(&body, "processed", ChildShape::Object)?;
        if !scopes || !processed {
            return Err(invalid());
        }
        put(
            &mut body,
            "scopes",
            ordinary_map::<PendingSightScope>(
                import,
                "sim_sensory_scopes",
                &row.id,
                Some("scopes"),
                scopes,
            )?,
        )?;
        put(
            &mut body,
            "processed",
            ordinary_map::<SightProgress>(
                import,
                "sim_sensory_policy_progress",
                &row.id,
                Some("processed"),
                processed,
            )?,
        )?;
        decode(Value::Object(body))
    })
    .transpose()?;
    let perception_evidence = map_rows(
        import,
        "mind_perception_owners",
        &world,
        Some("perceptionEvidence"),
        roots.perception_evidence,
        |import, row| {
            let mut body = object(parse(&row.payload)?)?;
            let current = marker(&body, "current", ChildShape::Object)?;
            let motion = marker(&body, "motionSamples", ChildShape::Object)?;
            let attention = marker(&body, "attention", ChildShape::Object)?;
            let geometry = marker(&body, "geometry", ChildShape::Object)?;
            if !current {
                return Err(invalid());
            }
            let current = map_rows(
                import,
                "mind_perception_current",
                &row.id,
                Some("current"),
                current,
                |_import, current| {
                    let layout = schema
                        .layout("mind_perception_current")
                        .map_err(|_| invalid())?;
                    if current.extra.len() != layout.columns.len() {
                        return Err(invalid());
                    }
                    let at = layout
                        .columns
                        .iter()
                        .position(|column| column == "metadata")
                        .ok_or_else(invalid)?;
                    decode_current_contact_storage(
                        &current.payload,
                        current
                            .extra
                            .get(at)
                            .and_then(Value::as_str)
                            .ok_or_else(invalid)?,
                    )
                    .map_err(|_| invalid())
                },
            )?;
            // Split contacts must retain their immutable content cache. Serializing
            // through a temporary parent would discard that exact acquired body.
            body.insert("current".into(), Value::Object(Map::new()));
            put(
                &mut body,
                "motionSamples",
                ordinary_map::<CurrentMotionSample>(
                    import,
                    "mind_perception_motion_samples",
                    &row.id,
                    Some("motionSamples"),
                    motion,
                )?,
            )?;
            let attention = take_one::<Value>(
                import,
                "mind_perception_attention",
                &row.id,
                "attention",
                attention,
            )?
            .map(|(record, value)| {
                let mut attention = object(value)?;
                for (field, table) in [
                    ("annotations", "mind_perception_attention_annotations"),
                    ("latches", "mind_perception_attention_latches"),
                    ("relationScans", "mind_perception_attention_scans"),
                ] {
                    if !marker(&attention, field, ChildShape::Object)? {
                        return Err(invalid());
                    }
                    put(
                        &mut attention,
                        field,
                        ordinary_map::<Value>(import, table, &record.id, Some(field), true)?,
                    )?;
                }
                crate::attention::decode_attention_storage(decode(Value::Object(attention))?)
                    .map_err(|_| invalid())
            })
            .transpose()?;
            body.remove("attention");
            let geometry = take_one::<Value>(
                import,
                "mind_perception_geometry",
                &row.id,
                "geometry",
                geometry,
            )?
            .map(|(record, value)| {
                let mut geometry = object(value)?;
                if !marker(&geometry, "fragments", ChildShape::Array)?
                    || !marker(&geometry, "boundaries", ChildShape::Array)?
                {
                    return Err(invalid());
                }
                put(
                    &mut geometry,
                    "fragments",
                    list_rows::<GeometryFragment>(
                        import,
                        "mind_perception_geometry_fragments",
                        &record.id,
                        Some("fragments"),
                        true,
                        Some("key"),
                    )?,
                )?;
                // Boundary rows are keyed by observation.id, supplied by the current
                // schema key compiler. Validate that same identity without inventing
                // an alternative root-level field in the received feature DTO.
                let collection = take_collection(
                    import,
                    "mind_perception_geometry_boundaries",
                    &record.id,
                    true,
                    true,
                )?;
                let mut boundaries = Vec::new();
                for boundary in collection.rows {
                    let value: ReceivedGeometryFeature = parse(&boundary.payload)?;
                    let mut parts: Vec<String> = parse(&record.id)?;
                    parts.extend(["boundaries".to_owned(), value.observation.id.clone()]);
                    validate_row(
                        &boundary,
                        &parts.iter().map(String::as_str).collect::<Vec<_>>(),
                        &record.id,
                        &boundaries.len().to_string(),
                        collection.coverage.next_ordinal,
                    )?;
                    if boundary.position != boundaries.len() as u64 {
                        return Err(InstallError::RowPlacement);
                    }
                    boundaries.push(value);
                }
                put(&mut geometry, "boundaries", Some(boundaries))?;
                decode(Value::Object(geometry))
            })
            .transpose()?;
            body.remove("geometry");
            let mut owner: PerceptionEvidenceOwner = decode(Value::Object(body))?;
            owner.current = current.ok_or_else(invalid)?;
            owner.attention = attention;
            owner.geometry = geometry;
            Ok(owner)
        },
    )?;
    Ok(ReceptionState {
        sensory,
        perception_evidence,
        received_values,
        observer_identities: nested_maps(
            import,
            "mind_recognition_owners",
            "mind_recognition",
            "observerIdentities",
            roots.observer_identities,
        )?,
        perception_episodes: nested_maps(
            import,
            "mind_exposure_owners",
            "mind_exposure",
            "perceptionEpisodes",
            roots.perception_episodes,
        )?,
        actor_knowledge: nested_maps(
            import,
            "mind_knowledge_documents_owners",
            "mind_knowledge_documents",
            "actorKnowledge",
            roots.actor_knowledge,
        )?,
        knowledge_revisions: ordinary_map(
            import,
            "mind_knowledge_revisions",
            &world,
            Some("knowledgeRevisions"),
            roots.knowledge_revisions,
        )?,
        visible_objects: nested_lists(
            import,
            "mind_visible_objects_owners",
            "mind_visible_objects",
            "visibleObjects",
            roots.visible_objects,
        )?,
        visible_people: nested_lists(
            import,
            "mind_visible_people_owners",
            "mind_visible_people",
            "visiblePeople",
            roots.visible_people,
        )?,
        visible_places: nested_maps(
            import,
            "mind_visible_places_owners",
            "mind_visible_places",
            "visiblePlaces",
            roots.visible_places,
        )?,
        map_markers: nested_maps(
            import,
            "mind_map_markers_owners",
            "mind_map_markers",
            "mapMarkers",
            roots.map_markers,
        )?,
    })
}
