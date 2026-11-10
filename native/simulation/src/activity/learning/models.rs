//! The method and its private acquisition retain their exact current JSON
//! objects. Ordered role/binding maps and acquired speech remain source data.
use super::*;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, ResidentReservation, SharedMemoryPin};
use crate::records::SqlCell;
use std::{mem::size_of, sync::Arc};

fn invalid() -> ActivityError {
    ActivityError::InvalidStructure
}
fn text<'a>(value: &'a SqlCell, key: &str) -> Result<&'a str, ActivityError> {
    value.get(key).and_then(SqlCell::as_str).ok_or_else(invalid)
}
fn array<'a>(value: &'a SqlCell, key: &str) -> Result<&'a [SqlCell], ActivityError> {
    value
        .get(key)
        .and_then(SqlCell::as_array)
        .ok_or_else(invalid)
}
fn fields(value: &SqlCell, allowed: &[&str]) -> Result<(), ActivityError> {
    if value
        .as_object()
        .is_none_or(|value| value.keys().any(|key| !allowed.contains(&key.as_str())))
    {
        return Err(invalid());
    }
    Ok(())
}
fn name(value: &SqlCell, limits: &ActivityLimits) -> Result<(), ActivityError> {
    if value
        .get("name")
        .and_then(SqlCell::as_text)
        .is_none_or(|name| name.trim_is_empty() || name.units_len() as u64 > limits.text)
    {
        return Err(invalid());
    }
    Ok(())
}
fn id(value: &SqlCell, key: &str) -> Result<(), ActivityError> {
    if !is_safe_record_id(text(value, key)?) {
        return Err(invalid());
    }
    Ok(())
}
fn positive(value: &SqlCell, key: &str) -> Result<(), ActivityError> {
    if value
        .get(key)
        .and_then(SqlCell::as_u64)
        .is_none_or(|n| n == 0 || n > crate::identity::MAX_SAFE_INTEGER)
    {
        return Err(invalid());
    }
    Ok(())
}
fn pin(value: &SqlCell) -> Result<(), ActivityError> {
    fields(value, &["id", "version", "digest"])?;
    id(value, "id")?;
    positive(value, "version")?;
    if text(value, "digest")?.is_empty() {
        return Err(invalid());
    }
    Ok(())
}

pub(in crate::activity) struct LearningMethod {
    body: SqlCell,
    storage: ResidentReservation,
}
impl LearningMethod {
    pub fn body(&self) -> &SqlCell {
        &self.body
    }
    pub fn retain(&self, budget: &ByteBudget) -> Result<(), ActivityError> {
        budget
            .retain_record(&self.storage)
            .map_err(|_| ActivityError::Capacity)
    }
    pub fn id(&self) -> &str {
        text(&self.body, "id").expect("validated method id")
    }
    pub fn signature(&self) -> &str {
        text(&self.body, "signature").expect("validated method signature")
    }
    pub fn manifest(&self) -> &str {
        text(&self.body, "manifest").expect("validated method manifest")
    }
    pub fn capture_pin(&self, budget: &ByteBudget) -> Result<Arc<SharedMemoryPin>, ActivityError> {
        self.storage
            .capture_pin(budget)
            .map_err(|_| ActivityError::Capacity)
    }
    pub fn new(
        body: SqlCell,
        language: &InstalledLearningLanguage,
        limits: &ActivityLimits,
        mut funding: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ActivityError> {
        validate_method(&body, language, limits, budget)?;
        let bytes = heap_sum([
            size_of::<Self>() + 2 * size_of::<usize>(),
            body.heap_bytes().ok_or(ActivityError::Capacity)?,
        ])
        .ok_or(ActivityError::Capacity)?;
        funding.resize(bytes).map_err(|_| ActivityError::Capacity)?;
        let storage = budget
            .adopt_record(funding)
            .map_err(|_| ActivityError::Capacity)?;
        Ok(Arc::new(Self { body, storage }))
    }
}
impl Serialize for LearningMethod {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        self.body.serialize(s)
    }
}

pub(in crate::activity) struct LearningAcquisition {
    body: SqlCell,
    storage: ResidentReservation,
}
impl LearningAcquisition {
    pub fn body(&self) -> &SqlCell {
        &self.body
    }
    pub fn retain(&self, budget: &ByteBudget) -> Result<(), ActivityError> {
        budget
            .retain_record(&self.storage)
            .map_err(|_| ActivityError::Capacity)
    }
    pub fn capture_pin(&self, budget: &ByteBudget) -> Result<Arc<SharedMemoryPin>, ActivityError> {
        self.storage
            .capture_pin(budget)
            .map_err(|_| ActivityError::Capacity)
    }
    pub fn new(
        body: SqlCell,
        actor: &str,
        method: &LearningMethod,
        language: &InstalledLearningLanguage,
        limits: &ActivityLimits,
        mut funding: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, ActivityError> {
        if body.as_object().is_none() {
            return Err(ActivityError::UnsupportedFamily);
        }
        if text(&body, "actorId")? != actor
            || text(&body, "methodId")? != method.id()
            || text(&body, "status")? != "tentative"
            || body.get("at").and_then(SqlCell::as_f64).is_none()
        {
            return Err(invalid());
        }
        let supports = array(&body, "supports")?;
        if supports.is_empty() || supports.len() as u64 > limits.links {
            return Err(invalid());
        }
        for support in supports {
            if support.as_object().is_none() {
                return Err(ActivityError::UnsupportedFamily);
            }
            if support.get("revoked").and_then(SqlCell::as_bool).is_none() {
                return Err(invalid());
            }
            let occurrences = array(support, "occurrenceIds")?;
            let evidence = array(support, "evidenceIds")?;
            if occurrences.is_empty()
                || occurrences.len() as u64 > limits.nodes
                || evidence.len() as u64
                    > limits
                        .nodes
                        .checked_mul(limits.links)
                        .ok_or(ActivityError::Capacity)?
                || occurrences
                    .iter()
                    .chain(evidence)
                    .any(|id| id.as_str().is_none_or(|id| !is_safe_record_id(id)))
            {
                return Err(invalid());
            }
        }
        let bindings = body
            .get("bindings")
            .and_then(SqlCell::as_object)
            .ok_or_else(invalid)?;
        let roles = method
            .body
            .get("roles")
            .and_then(SqlCell::as_object)
            .ok_or_else(invalid)?;
        if bindings.len() != roles.len() {
            return Err(invalid());
        }
        for (role, rule) in roles {
            let value = bindings.get(role).ok_or_else(invalid)?;
            match text(rule, "kind")? {
                "place" => {
                    id(value, "surfaceId")?;
                    if ["x", "y", "z"]
                        .into_iter()
                        .any(|key| value.get(key).and_then(SqlCell::as_f64).is_none())
                    {
                        return Err(invalid());
                    }
                }
                "text" => {
                    if value.as_text().is_none_or(|text| {
                        text.trim_is_empty() || text.units_len() as u64 > language.text_characters
                    }) {
                        return Err(invalid());
                    }
                }
                "object" | "self" => {
                    if value.as_str().is_none_or(|id| !is_safe_record_id(id)) {
                        return Err(invalid());
                    }
                }
                _ => return Err(invalid()),
            }
        }
        if crate::encoding::json_record_len(&body).map_err(|_| invalid())? as u64
            > limits.acquisition_bytes
        {
            return Err(ActivityError::Capacity);
        }
        let bytes = body
            .heap_bytes()
            .and_then(|n| n.checked_add(size_of::<Self>() + 2 * size_of::<usize>()))
            .ok_or(ActivityError::Capacity)?;
        funding.resize(bytes).map_err(|_| ActivityError::Capacity)?;
        let storage = budget
            .adopt_record(funding)
            .map_err(|_| ActivityError::Capacity)?;
        Ok(Arc::new(Self { body, storage }))
    }
}
impl Serialize for LearningAcquisition {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        self.body.serialize(s)
    }
}

pub(super) fn validate_method(
    body: &SqlCell,
    language: &InstalledLearningLanguage,
    limits: &ActivityLimits,
    budget: &ByteBudget,
) -> Result<(), ActivityError> {
    fields(
        body,
        &[
            "executable",
            "id",
            "signature",
            "manifest",
            "name",
            "root",
            "roles",
        ],
    )?;
    id(body, "id")?;
    text(body, "signature")?;
    text(body, "manifest")?;
    name(body, limits)?;
    if body.get("executable").and_then(SqlCell::as_bool).is_none() {
        return Err(invalid());
    }
    let root = body.get("root").ok_or_else(invalid)?;
    fields(root, &["kind", "name", "children"])?;
    name(root, limits)?;
    if body.get("name") != root.get("name") {
        return Err(invalid());
    }
    if text(root, "kind")? != "sequence" {
        return Err(ActivityError::UnsupportedFamily);
    }
    let children = array(root, "children")?;
    if children.is_empty()
        || children.len() as u64 >= limits.nodes
        || limits.depth < 1
        || children.len() as u64 + 1 > limits.expanded_work
    {
        return Err(invalid());
    }
    let roles = body
        .get("roles")
        .and_then(SqlCell::as_object)
        .ok_or_else(invalid)?;
    if roles.len() as u64 > limits.nodes {
        return Err(invalid());
    }
    let _scratch = budget
        .reserve(
            crate::host::retained_size::map_storage::<&str, Vec<&str>>(children.len())
                .and_then(|n| {
                    n.checked_add(
                        children
                            .len()
                            .checked_mul(limits.outputs as usize)?
                            .checked_mul(size_of::<&str>())?,
                    )
                })
                .ok_or(ActivityError::Capacity)?,
        )
        .map_err(|_| ActivityError::Capacity)?;
    let mut prior: IndexMap<&str, Vec<&str>> = IndexMap::with_capacity(children.len());
    for child in children {
        fields(
            child,
            &["kind", "key", "name", "command", "args", "outputs"],
        )?;
        name(child, limits)?;
        id(child, "key")?;
        if text(child, "kind")? != "invoke" || prior.contains_key(text(child, "key")?) {
            return Err(invalid());
        }
        let shape = language
            .commands
            .get(text(child, "command")?)
            .ok_or(ActivityError::UnsupportedFamily)?;
        let args = child
            .get("args")
            .and_then(SqlCell::as_object)
            .ok_or_else(invalid)?;
        if shape.required.iter().any(|field| !args.contains_key(field))
            || args
                .keys()
                .any(|field| !shape.required.contains(field) && !shape.optional.contains(field))
        {
            return Err(ActivityError::UnsupportedFamily);
        }
        for (field, arg) in args {
            if let Some(role) = arg.get("role").and_then(SqlCell::as_str) {
                fields(arg, &["role"])?;
                let rule = roles.get(role).ok_or_else(invalid)?;
                if !array(rule, "commandFields")?
                    .iter()
                    .any(|name| name.as_str() == Some(field))
                {
                    return Err(invalid());
                }
                let binding = shape.bindings.get(field).ok_or_else(invalid)?;
                let kind = text(rule, "kind")?;

                if !match kind {
                    "self" => binding.self_allowed,
                    "object" => binding.kind == super::syntax::BindingKind::Object,
                    "place" => binding.kind == super::syntax::BindingKind::Place,
                    "text" => binding.kind == super::syntax::BindingKind::Text,
                    _ => false,
                } {
                    return Err(invalid());
                }
            } else if let Some(output) = arg.get("output").and_then(SqlCell::as_str) {
                fields(arg, &["output", "port", "quantity"])?;
                positive(arg, "quantity")?;
                let port = text(arg, "port")?;
                if !shape
                    .bindings
                    .get(field)
                    .is_some_and(|binding| binding.output)
                    || !prior.get(output).is_some_and(|ports| ports.contains(&port))
                {
                    return Err(invalid());
                }
            } else {
                fields(arg, &["literal"])?;
                if shape.bindings.contains_key(field)
                    || arg.get("literal").is_none_or(|value| {
                        !matches!(
                            value,
                            SqlCell::Text(_) | SqlCell::Number(_) | SqlCell::Bool(_)
                        ) || value
                            .as_text()
                            .is_some_and(|text| text.units_len() as u64 > limits.text)
                    })
                {
                    return Err(invalid());
                }
            }
        }
        let mut ports = Vec::new();
        if let Some(outputs) = child.get("outputs") {
            let outputs = outputs.as_array().ok_or_else(invalid)?;
            if outputs.len() as u64 > limits.outputs {
                return Err(invalid());
            }
            ports = Vec::with_capacity(outputs.len());
            for output in outputs {
                fields(output, &["port", "definitionId", "quantity"])?;
                id(output, "port")?;
                id(output, "definitionId")?;
                positive(output, "quantity")?;
                ports.push(text(output, "port")?)
            }
        }
        prior.insert(text(child, "key")?, ports);
    }
    for (role, rule) in roles {
        if !is_safe_record_id(role) {
            return Err(invalid());
        }
        fields(
            rule,
            &[
                "commandFields",
                "kind",
                "definitionId",
                "definitionVersion",
                "definitionDigest",
                "entityKind",
                "maximumHealth",
                "gatheredDefinition",
                "targetHost",
            ],
        )?;
        let columns = array(rule, "commandFields")?;
        if columns.is_empty()
            || columns.len() > 8
            || columns
                .iter()
                .any(|name| name.as_str().is_none_or(|name| !is_safe_record_id(name)))
        {
            return Err(invalid());
        }
        let kind = text(rule, "kind")?;
        for column in columns {
            let column = column.as_str().ok_or_else(invalid)?;
            let binding = language
                .commands
                .values()
                .find_map(|shape| shape.bindings.get(column))
                .ok_or_else(invalid)?;
            if !match kind {
                "self" => binding.self_allowed,
                "object" => binding.kind == super::syntax::BindingKind::Object,
                "place" => binding.kind == super::syntax::BindingKind::Place,
                "text" => binding.kind == super::syntax::BindingKind::Text,
                _ => false,
            } {
                return Err(invalid());
            }
        }

        if !["object", "place", "text", "self"].contains(&kind) {
            return Err(invalid());
        }
        if kind == "self"
            && [
                "definitionId",
                "entityKind",
                "maximumHealth",
                "gatheredDefinition",
                "targetHost",
            ]
            .iter()
            .any(|field| rule.get(field).is_some())
        {
            return Err(invalid());
        }
        if rule.get("definitionId").is_some() {
            id(rule, "definitionId")?;
            positive(rule, "definitionVersion")?;
            text(rule, "definitionDigest")?;
        }
        if rule
            .get("maximumHealth")
            .is_some_and(|value| value.as_f64().is_none_or(|n| n < 0.0))
        {
            return Err(invalid());
        }
        for field in ["gatheredDefinition", "targetHost"] {
            if let Some(value) = rule.get(field) {
                if kind != "object" {
                    return Err(invalid());
                }
                pin(value)?;
            }
        }
    }
    if crate::encoding::json_record_len(body).map_err(|_| invalid())? as u64 > limits.record_bytes {
        return Err(ActivityError::Capacity);
    }
    Ok(())
}
