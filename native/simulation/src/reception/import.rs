//! One-time consuming assembly of the existing receiver SQL records. This
//! returns typed owners, never a writable JSON world or an accepted runtime.

use super::*;
use crate::install::rows::{take_collection, take_one, validate_row};
use crate::install::{InstallError, RowImport};
use crate::received::ReceivedValues;
use crate::records::{ChildShape, RecordSchema, SqlCell};
use serde::de::DeserializeOwned;
use serde_json::value::RawValue;
type RawMap = IndexMap<String, Box<RawValue>>;

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
fn object(value: Box<RawValue>) -> Result<RawMap, InstallError> {
    parse(value.get())
}
fn marker(body: &RawMap, field: &str, shape: ChildShape) -> Result<bool, InstallError> {
    let Some(value) = body.get(field) else {
        return Ok(false);
    };
    let empty = match shape {
        ChildShape::Object => parse::<RawMap>(value.get())?.is_empty(),
        ChildShape::Array => parse::<Vec<Box<RawValue>>>(value.get())?.is_empty(),
    };
    if empty { Ok(true) } else { Err(invalid()) }
}
fn decode<T: DeserializeOwned>(value: impl Serialize) -> Result<T, InstallError> {
    // This is a consuming installation join. Keep unpaired code units in raw
    // child JSON until their typed text owner decodes them; no JSON world is
    // retained after installation.
    let value = serde_json::value::to_raw_value(&value).map_err(|_| invalid())?;
    parse(value.get())
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

/// SQL JSON numbers have the same integral domain as current source data;
/// `1.0` is a valid revision just as `1` is. The strict shared parser owns the
/// finite safe-integer check instead of serde's narrower integer token parser.
#[derive(Deserialize)]
struct Revision(#[serde(deserialize_with = "crate::values::deserialize_safe_integer")] u64);

fn revision_map(
    import: &mut RowImport,
    table: &str,
    parent: &str,
    field: Option<&str>,
    present: bool,
) -> Result<Option<IndexMap<String, u64>>, InstallError> {
    map_rows(import, table, parent, field, present, |_import, row| {
        parse::<Revision>(&row.payload).map(|revision| revision.0)
    })
}

fn nested_revisions(
    import: &mut RowImport,
    owner_table: &str,
    table: &str,
    field: &str,
    present: bool,
) -> Result<Option<IndexMap<String, IndexMap<String, u64>>>, InstallError> {
    let root = path(&["world"])?;
    map_rows(
        import,
        owner_table,
        &root,
        Some(field),
        present,
        |import, row| {
            crate::install::rows::validate_marker(row, ChildShape::Object)?;
            revision_map(import, table, &row.id, None, true)?.ok_or_else(invalid)
        },
    )
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
        let identity = if let Some(key) = key {
            let value: RawMap = parse(&row.payload)?;
            parse::<String>(value.get(key).ok_or_else(invalid)?.get())?
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
        result.push(parse(&row.payload)?);
    }
    Ok(Some(result))
}
fn put<T: Serialize>(body: &mut RawMap, field: &str, value: Option<T>) -> Result<(), InstallError> {
    if let Some(value) = value {
        body.insert(
            field.to_owned(),
            serde_json::value::to_raw_value(&value).map_err(|_| invalid())?,
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
    let sensory = take_one::<Box<RawValue>>(
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
        decode(body)
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
            let mut current = map_rows(
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
                    let metadata = current
                        .extra
                        .get(at)
                        .and_then(SqlCell::as_str)
                        .ok_or_else(invalid)?;
                    let contact = decode_current_contact_storage(&current.payload, metadata)
                        .map_err(|_| invalid())?;
                    validate_reference_columns(
                        "mind_perception_current",
                        current,
                        schema,
                        &row.slot,
                        &received_contact_value_references(&contact),
                        Some(metadata),
                    )?;
                    Ok(contact)
                },
            )?;
            // Source's ordered-record tree iterates exact keys in JavaScript
            // string order. Unordered SQL ordinals cannot provide that order.
            if let Some(current) = &mut current {
                current.sort_unstable_by(|left, _, right, _| {
                    crate::encoding::js_string_cmp(left, right)
                });
            }
            // Split contacts must retain their immutable content cache. Serializing
            // through a temporary parent would discard that exact acquired body.
            body.insert(
                "current".into(),
                RawValue::from_string("{}".into()).map_err(|_| invalid())?,
            );
            put(
                &mut body,
                "motionSamples",
                map_rows(
                    import,
                    "mind_perception_motion_samples",
                    &row.id,
                    Some("motionSamples"),
                    motion,
                    |_import, motion| {
                        let track: CurrentMotionSample = parse(&motion.payload)?;
                        let mut references: Vec<_> =
                            received_facet_value_references(&track.earlier.value).collect();
                        references.sort_by(|a, b| crate::encoding::js_string_cmp(a, b));
                        references.dedup();
                        validate_reference_columns(
                            "mind_perception_motion_samples",
                            motion,
                            schema,
                            &row.slot,
                            &references,
                            None,
                        )?;
                        Ok(track)
                    },
                )?,
            )?;
            let attention = take_one::<Box<RawValue>>(
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
                        ordinary_map::<Box<RawValue>>(
                            import,
                            table,
                            &record.id,
                            Some(field),
                            true,
                        )?,
                    )?;
                }
                crate::attention::decode_attention_storage(decode(attention)?)
                    .map_err(|_| invalid())
            })
            .transpose()?;
            body.shift_remove("attention");
            let geometry = take_one::<Box<RawValue>>(
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
                    parts.extend(["boundaries".to_owned(), boundaries.len().to_string()]);
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
                decode(geometry)
            })
            .transpose()?;
            body.shift_remove("geometry");
            let mut owner: PerceptionEvidenceOwner = decode(body)?;
            owner.current = current.ok_or_else(invalid)?;
            owner.attention = attention;
            owner.geometry = geometry;
            validate_reference_columns(
                "mind_perception_owners",
                row,
                schema,
                &row.slot,
                &received_owner_value_references(&owner),
                None,
            )?;
            Ok(owner)
        },
    )?;
    Ok(ReceptionState {
        exposure_prepared: false,
        exposure_objects: None,
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
        knowledge_revisions: revision_map(
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
        visible_places: nested_revisions(
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

fn validate_reference_columns(
    table: &str,
    row: &crate::records::InstalledRow,
    schema: &RecordSchema,
    actor: &str,
    references: &[&str],
    metadata: Option<&str>,
) -> Result<(), InstallError> {
    let columns = &schema.layout(table).map_err(|_| invalid())?.columns;
    if row.extra.len() != columns.len() {
        return Err(invalid());
    }
    for (column, cell) in columns.iter().zip(&row.extra) {
        let valid = match column.as_str() {
            "actor_id" => cell.as_text().is_some_and(|value| value == actor),
            "value_refs" => cell.as_array().is_some_and(|values| {
                values.len() == references.len()
                    && values.iter().zip(references).all(|(value, expected)| {
                        value.as_text().is_some_and(|value| value == *expected)
                    })
            }),
            "metadata" => match metadata {
                Some(expected) => cell.as_text().is_some_and(|value| value == expected),
                None => cell.is_null(),
            },
            _ => false,
        };
        if !valid {
            return Err(invalid());
        }
    }
    Ok(())
}
