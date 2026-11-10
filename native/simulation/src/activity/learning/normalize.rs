//! Structural learning is derived from real scoped attempts. Template roles
//! preserve their first-use order; personal bindings never enter the signature.
use super::history::LearningHistory;
use super::*;
use crate::execution::ExecutionError;
use crate::host::retained_size::{HeapBytes, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::records::SqlCell;
use crate::text::JsText;
use std::mem::size_of;

pub(super) fn object<const N: usize>(fields: [(&str, SqlCell); N]) -> SqlCell {
    SqlCell::Object(fields.into_iter().map(|(k, v)| (k.to_owned(), v)).collect())
}
pub(super) fn string(value: impl Into<JsText>) -> SqlCell {
    SqlCell::Text(value.into())
}
pub(super) fn strings<'a>(values: impl IntoIterator<Item = &'a str>) -> SqlCell {
    SqlCell::Array(values.into_iter().map(|s| string(s)).collect())
}
fn number(n: usize) -> SqlCell {
    SqlCell::Number(n.into())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct NormalizedActivity {
    pub shape: SqlCell,
    pub occurrence_ids: Vec<String>,
    pub bindings: SqlCell,
    #[serde(skip)]
    pub storage: ByteReservation,
}
impl NormalizedActivity {
    pub fn name(&self) -> &JsText {
        self.shape
            .get("root")
            .and_then(|r| r.get("name"))
            .and_then(SqlCell::as_text)
            .expect("constructed name")
    }
}
pub(super) struct NormalizationRead<'a> {
    pub history: &'a LearningHistory,
    pub language: &'a InstalledLearningLanguage,
    pub limits: &'a ActivityLimits,
    pub names: &'a [Option<JsText>],
    /// Exact Source canonicalJson(point), prepared and compared as one batch.
    pub places: &'a [Option<String>],
    pub manifest: &'a str,
}
impl NormalizationRead<'_> {
    pub fn normalize(
        &self,
        selected: &[usize],
        incomplete: bool,
        budget: &ByteBudget,
    ) -> Result<Option<NormalizedActivity>, ExecutionError> {
        let limits = self.limits;
        if selected.len() < 2
            || selected.len() as u64 + 1 > limits.nodes
            || limits.depth < 1
            || selected.len() as u64 + 1 > limits.expanded_work
        {
            return Ok(None);
        }
        for &at in selected {
            let row = &self.history.rows[at];
            let entry = &row.entry;
            if matches!(entry.command, crate::commands::NativeCommand::Strike { .. }) {
                return Err(ExecutionError::UnsupportedFamily);
            }
            if row.denied
                || entry.actor_id != self.history.actor
                || entry.revoked == Some(true)
                || !row.result_eligible
                || entry.no_learning_control == Some(true)
                || (entry.status != ActivityStatus::Completed && entry.outputs.is_empty())
                || !self.language.commands.contains_key(entry.command.kind())
                || self
                    .names
                    .get(at)
                    .and_then(Option::as_ref)
                    .is_none_or(|name| {
                        name.trim_is_empty() || name.units_len() as u64 > limits.text
                    })
            {
                return Ok(None);
            }
        }
        let bytes = selected
            .iter()
            .try_fold(
                self.manifest
                    .len()
                    .checked_mul(2)
                    .ok_or(ExecutionError::Capacity)?,
                |sum, &at| {
                    self.history.rows[at]
                        .entry
                        .live_heap_bytes()
                        .and_then(|n| n.checked_mul(5))
                        .and_then(|n| {
                            n.checked_add(
                                self.history.rows[at]
                                    .entry
                                    .command
                                    .source_edit_heap_bound(0)?,
                            )
                        })
                        .and_then(|n| n.checked_add(sum))
                        .ok_or(ExecutionError::Capacity)
                },
            )?
            .checked_add(
                map_storage::<String, SqlCell>(
                    selected
                        .len()
                        .checked_mul(8)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
            )
            .and_then(|n| n.checked_add(selected.len().checked_mul(size_of::<SqlCell>() * 32)?))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut roles: IndexMap<String, SqlCell> = IndexMap::new();
        let mut bindings = IndexMap::new();
        let mut identities: IndexMap<String, String> = IndexMap::new();
        let mut outputs: IndexMap<String, (String, String)> = IndexMap::new();
        let mut children = Vec::with_capacity(selected.len());
        let mut occurrence_ids = Vec::with_capacity(selected.len());
        for (index, &at) in selected.iter().enumerate() {
            let entry = &self.history.rows[at].entry;
            let fields: SqlCell = serde_json::from_str(entry.command.source_encoding())
                .map_err(|_| ExecutionError::Invariant)?;
            let Some(fields) = fields.as_object() else {
                return Err(ExecutionError::UnsupportedFamily);
            };
            let syntax = &self.language.commands[entry.command.kind()];
            let mut args = IndexMap::new();
            for (field, value) in fields {
                if ["id", "actorId", "type", "purpose", "chosenPurpose"].contains(&field.as_str()) {
                    continue;
                }
                if entry.command.kind() == "follow" && field == "until" {
                    return Ok(None);
                }
                let binding = syntax.bindings.get(field);
                if let (Some(value), Some(rule)) = (
                    value.as_str(),
                    binding.filter(|b| b.kind == super::syntax::BindingKind::Object),
                ) {
                    if let Some((step, port)) = outputs.get(value).filter(|_| rule.output) {
                        args.insert(
                            field.clone(),
                            object([
                                ("output", string(step.as_str())),
                                ("port", string(port.as_str())),
                                ("quantity", number(1)),
                            ]),
                        );
                        continue;
                    }
                    let myself = rule.self_allowed && value == self.history.actor;
                    let identity = if myself {
                        format!("self:{value}")
                    } else {
                        value.to_owned()
                    };
                    let role = if let Some(role) = identities.get(&identity) {
                        role.clone()
                    } else {
                        let role = format!("object{}", identities.len() + 1);
                        let found = entry.objects.get(value);
                        if !myself && found.is_none() {
                            return Ok(None);
                        }
                        if ["sourceId", "destinationId"].contains(&field.as_str()) {
                            return Err(ExecutionError::UnsupportedFamily);
                        }
                        let mut spec = IndexMap::new();
                        spec.insert("commandFields".to_owned(), SqlCell::Array(Vec::new()));
                        spec.insert(
                            "kind".to_owned(),
                            string(if myself { "self" } else { "object" }),
                        );
                        if !myself {
                            let found = found.ok_or(ExecutionError::Invariant)?;
                            if let Some(id) = &found.definition_id {
                                spec.insert("definitionId".to_owned(), string(id.as_str()));
                                if let Some(version) = found.definition_version {
                                    spec.insert(
                                        "definitionVersion".to_owned(),
                                        SqlCell::Number(version.into()),
                                    );
                                }
                                if let Some(digest) = &found.definition_digest {
                                    spec.insert(
                                        "definitionDigest".to_owned(),
                                        string(digest.as_str()),
                                    );
                                }
                            } else {
                                spec.insert("entityKind".to_owned(), string(found.kind.as_str()));
                            }
                        }

                        roles.insert(role.clone(), SqlCell::Object(spec));
                        bindings.insert(role.clone(), string(value));
                        identities.insert(identity, role.clone());
                        role
                    };
                    let fields = roles
                        .get_mut(&role)
                        .and_then(|v| {
                            if let SqlCell::Object(o) = v {
                                Some(o)
                            } else {
                                None
                            }
                        })
                        .and_then(|r| r.get_mut("commandFields"))
                        .and_then(|v| {
                            if let SqlCell::Array(a) = v {
                                Some(a)
                            } else {
                                None
                            }
                        })
                        .ok_or(ExecutionError::Invariant)?;
                    if !fields.iter().any(|v| v.as_str() == Some(field)) {
                        fields.push(string(field.as_str()));
                    }
                    args.insert(field.clone(), object([("role", string(role.as_str()))]));
                } else if entry.command.kind() == "say"
                    && field == "text"
                    && value.as_text().is_some()
                {
                    let role = format!("words{}", index + 1);
                    roles.insert(
                        role.clone(),
                        object([
                            ("commandFields", strings([field.as_str()])),
                            ("kind", string("text")),
                        ]),
                    );
                    bindings.insert(role.clone(), value.clone());
                    args.insert(field.clone(), object([("role", string(role.as_str()))]));
                } else if matches!(
                    value,
                    SqlCell::Text(_) | SqlCell::Number(_) | SqlCell::Bool(_)
                ) {
                    args.insert(field.clone(), object([("literal", value.clone())]));
                } else if field == "destination"
                    && binding.is_some_and(|b| b.kind == super::syntax::BindingKind::Place)
                {
                    let Some(place) = self.places.get(at).and_then(Option::as_ref) else {
                        return Ok(None);
                    };
                    let role = format!("place{}", identities.len() + 1);
                    identities.insert(place.clone(), role.clone());
                    roles.insert(
                        role.clone(),
                        object([
                            ("commandFields", strings([field.as_str()])),
                            ("kind", string("place")),
                        ]),
                    );
                    let mut point = IndexMap::new();
                    for key in ["x", "y", "z", "surfaceId"] {
                        let Some(v) = value.get(key) else {
                            return Ok(None);
                        };
                        point.insert(key.to_owned(), v.clone());
                    }
                    bindings.insert(role.clone(), SqlCell::Object(point));
                    args.insert(field.clone(), object([("role", string(role.as_str()))]));
                } else {
                    return Ok(None);
                }
            }
            let key = format!("step{}", index + 1);
            let mut child = IndexMap::new();
            child.insert("kind".to_owned(), string("invoke"));
            child.insert("key".to_owned(), string(key.as_str()));
            child.insert(
                "name".to_owned(),
                SqlCell::Text(
                    self.names[at]
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .clone(),
                ),
            );
            child.insert("command".to_owned(), string(entry.command.kind()));
            child.insert("args".to_owned(), SqlCell::Object(args));
            if !entry.outputs.is_empty() {
                let mut held = Vec::with_capacity(entry.outputs.len());
                for output in &entry.outputs {
                    held.push(object([
                        ("port", string(output.port.as_str())),
                        ("definitionId", string(output.definition_id.as_str())),
                        (
                            "quantity",
                            SqlCell::Number(serde_json::Number::from(output.quantity)),
                        ),
                    ]));
                    outputs.insert(output.item_id.clone(), (key.clone(), output.port.clone()));
                }
                child.insert("outputs".to_owned(), SqlCell::Array(held));
            }
            children.push(SqlCell::Object(child));
            occurrence_ids.push(entry.id.clone());
        }
        let mut units = Vec::new();
        for (index, child) in children.iter().enumerate() {
            if index != 0 {
                units.extend(", then ".encode_utf16());
            }
            units.extend(
                child
                    .get("name")
                    .and_then(SqlCell::as_text)
                    .ok_or(ExecutionError::Invariant)?
                    .units(),
            );
        }
        units.truncate(usize::try_from(limits.text).map_err(|_| ExecutionError::Capacity)?);
        let name = JsText::from_units(units);
        let shape = object([
            (
                "root",
                object([
                    ("kind", string("sequence")),
                    ("name", SqlCell::Text(name)),
                    ("children", SqlCell::Array(children)),
                ]),
            ),
            ("roles", SqlCell::Object(roles)),
            ("manifest", string(self.manifest)),
            (
                "executable",
                SqlCell::Bool(
                    !incomplete
                        && selected.iter().all(|&at| {
                            self.history.rows[at].entry.status == ActivityStatus::Completed
                                && self.history.rows[at].entry.incomplete != Some(true)
                        }),
                ),
            ),
        ]);
        let bindings = SqlCell::Object(bindings);
        storage.resize(
            shape
                .heap_bytes()
                .and_then(|n| n.checked_add(bindings.heap_bytes()?))
                .and_then(|n| n.checked_add(occurrence_ids.heap_bytes()?))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(Some(NormalizedActivity {
            shape,
            occurrence_ids,
            bindings,
            storage,
        }))
    }
}
