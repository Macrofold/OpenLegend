//! Full saved activity envelope. Canonical AST children follow the existing
//! activity/learning/models.rs representation; they are structurally checked
//! here without inventing a second learned-method normalizer or executor.
//! Positive plan installation/edit/clone is still refused until real command,
//! acquisition, current support and receipt consumers are joined.
use crate::commands::{CooperationBinding, PurposeBinding};
use crate::host::ByteBudget;
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::install::InstallError;
use crate::records::SqlCell;
use crate::text::JsText;
use crate::values::{deserialize_safe_integer, is_safe_record_id, is_safe_record_text};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::mem::size_of;

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityExecution {
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cooperation: Option<CooperationBinding>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub combat_help_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub human_initiated: Option<bool>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub method_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub request: Option<RequestedActivity>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub completed_units: Option<u64>,
    pub bindings: SqlCell,
    pub target_episodes: SqlCell,
    pub pending: Vec<ActivityFrame>,
    // Exact dynamic keys may contain isolated UTF16 units, unlike a String map.
    pub outputs: SqlCell,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub serial: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub processed: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub archived_steps: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub active_key: Option<JsText>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub cancelled_keys: Option<Vec<JsText>>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reason: Option<JsText>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub control: Option<SqlCell>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub attempts: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub last_attempt_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer",
        skip_serializing_if = "Option::is_none"
    )]
    pub spent: Option<u64>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub interrupted: Option<bool>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub terminal: Option<bool>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct RequestedActivity {
    pub name: JsText,
    pub root: SqlCell,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub chosen_purpose: Option<PurposeBinding>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub quantity: Option<ActivityQuantity>,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityQuantity {
    pub command: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub requested: u64,
    pub unit_label: JsText,
}
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ActivityFrame {
    pub node: SqlCell,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub iteration: u64,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub started_at: Option<f64>,
}
impl HeapBytes for ActivityExecution {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.cooperation.heap_bytes()?,
            self.combat_help_id.heap_bytes()?,
            self.method_id.heap_bytes()?,
            self.request.heap_bytes()?,
            self.bindings.heap_bytes()?,
            self.target_episodes.heap_bytes()?,
            self.pending.heap_bytes()?,
            self.outputs.heap_bytes()?,
            self.active_key.heap_bytes()?,
            self.cancelled_keys.heap_bytes()?,
            self.reason.heap_bytes()?,
            self.control.heap_bytes()?,
            self.last_attempt_id.heap_bytes()?,
        ])
    }
}
impl HeapBytes for RequestedActivity {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([
            self.name.heap_bytes()?,
            self.root.heap_bytes()?,
            self.chosen_purpose.heap_bytes()?,
            self.quantity.heap_bytes()?,
        ])
    }
}
impl HeapBytes for ActivityQuantity {
    fn heap_bytes(&self) -> Option<usize> {
        heap_sum([self.command.heap_bytes()?, self.unit_label.heap_bytes()?])
    }
}
impl HeapBytes for ActivityFrame {
    fn heap_bytes(&self) -> Option<usize> {
        self.node.heap_bytes()
    }
}

fn invalid() -> InstallError {
    InstallError::CurrentFormat
}
fn object(v: &SqlCell) -> Result<&IndexMap<String, SqlCell>, InstallError> {
    v.as_object().ok_or_else(invalid)
}
fn get<'a>(v: &'a SqlCell, k: &str) -> Result<&'a SqlCell, InstallError> {
    v.get(k).ok_or_else(invalid)
}
fn text<'a>(v: &'a SqlCell, k: &str) -> Result<&'a str, InstallError> {
    get(v, k)?.as_str().ok_or_else(invalid)
}
fn exact_text<'a>(v: &'a SqlCell, k: &str) -> Result<&'a JsText, InstallError> {
    get(v, k)?.as_text().ok_or_else(invalid)
}
fn dictionary(v: &SqlCell) -> Result<(), InstallError> {
    match v {
        SqlCell::Object(map) => {
            if map.keys().any(|key| !is_safe_record_id(key)) {
                return Err(invalid());
            }
        }
        SqlCell::ExactObject(map) => {
            if map
                .members()
                .iter()
                .any(|(key, _)| !is_safe_record_text(key))
            {
                return Err(invalid());
            }
        }
        _ => return Err(invalid()),
    }
    Ok(())
}
fn array<'a>(v: &'a SqlCell, k: &str) -> Result<&'a [SqlCell], InstallError> {
    get(v, k)?.as_array().ok_or_else(invalid)
}
fn fields(v: &SqlCell, required: &[&str], optional: &[&str]) -> Result<(), InstallError> {
    let map = object(v)?;
    if required.iter().any(|k| !map.contains_key(*k))
        || map
            .keys()
            .any(|k| !required.contains(&k.as_str()) && !optional.contains(&k.as_str()))
    {
        return Err(invalid());
    }
    Ok(())
}
fn id(v: &SqlCell, k: &str) -> Result<(), InstallError> {
    if !is_safe_record_text(exact_text(v, k)?) {
        return Err(invalid());
    }
    Ok(())
}
fn number(v: &SqlCell, k: &str) -> Result<f64, InstallError> {
    get(v, k)?
        .as_f64()
        .filter(|n| n.is_finite())
        .ok_or_else(invalid)
}
fn count(v: &SqlCell, k: &str, min: u64) -> Result<u64, InstallError> {
    get(v, k)?
        .as_u64()
        .filter(|n| *n >= min && *n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or_else(invalid)
}
fn pin(v: &SqlCell) -> Result<(), InstallError> {
    fields(v, &["id", "version", "digest"], &[])?;
    id(v, "id")?;
    count(v, "version", 1)?;
    if text(v, "digest")?.is_empty() {
        return Err(invalid());
    }
    Ok(())
}
fn point(v: &SqlCell, surface: bool) -> Result<(), InstallError> {
    for k in ["x", "y", "z"] {
        number(v, k)?;
    }
    if surface {
        id(v, "surfaceId")?;
    }
    Ok(())
}

struct Grammar<'a> {
    limits: &'a crate::activity::ActivityLimits,
    count: u64,
    expanded: u64,
    keys: BTreeMap<&'a JsText, BTreeSet<&'a JsText>>,
    subtrees: Vec<&'a SqlCell>,
}
impl<'a> Grammar<'a> {
    fn predicate(&self, p: &SqlCell) -> Result<(), InstallError> {
        match text(p, "test")? {
            "alive" | "available" | "equipped" | "lit" => {
                fields(p, &["test", "role"], &[])?;
                id(p, "role")?;
            }
            "registered" => {
                fields(p, &["test", "role", "definition"], &[])?;
                id(p, "role")?;
                pin(get(p, "definition")?)?;
            }
            "output" => {
                fields(p, &["test", "step", "port", "quantity"], &[])?;
                id(p, "port")?;
                count(p, "quantity", 1)?;
                if !self.keys.get(exact_text(p, "step")?).is_some_and(|ports| {
                    ports.contains(exact_text(p, "port").expect("validated output port"))
                }) {
                    return Err(invalid());
                }
            }
            "holding" => {
                fields(p, &["test", "definitionId", "quantity"], &[])?;
                id(p, "definitionId")?;
                count(p, "quantity", 1)?;
            }
            "time" => {
                fields(p, &["test", "at"], &[])?;
                if number(p, "at")? < 0. {
                    return Err(invalid());
                }
            }
            _ => return Err(invalid()),
        }
        Ok(())
    }
    fn node(&mut self, v: &'a SqlCell, depth: u64, multiplier: u64) -> Result<(), InstallError> {
        self.count = self.count.checked_add(1).ok_or_else(invalid)?;
        self.expanded = self.expanded.checked_add(multiplier).ok_or_else(invalid)?;
        if self.count > self.limits.nodes
            || depth > self.limits.depth
            || self.expanded > self.limits.expanded_work
            || get(v, "name")?
                .as_text()
                .is_none_or(|s| s.trim_is_empty() || s.units_len() as u64 > self.limits.text)
        {
            return Err(invalid());
        }
        self.subtrees.push(v);
        if let Some(requirements) = v.get("requirements") {
            let requirements = requirements.as_array().ok_or_else(invalid)?;
            if requirements.len() as u64 > self.limits.detail_entries {
                return Err(invalid());
            }
            for r in requirements {
                let k = text(r, "kind")?;
                fields(
                    r,
                    match k {
                        "source" => &["kind", "role", "definition", "workSeconds"],
                        "item" => &["kind", "role", "definition"],
                        "recipe" | "work-policy" | "body-policy" | "item-definition" => {
                            &["kind", "definition"]
                        }
                        _ => return Err(invalid()),
                    },
                    &[],
                )?;
                pin(get(r, "definition")?)?;
                if matches!(k, "item" | "source") {
                    id(r, "role")?;
                }
                if k == "source" && number(r, "workSeconds")? <= 0. {
                    return Err(invalid());
                }
            }
        }
        match text(v, "kind")? {
            "invoke" => {
                fields(
                    v,
                    &["kind", "key", "name", "command", "args"],
                    &["outputs", "requirements"],
                )?;
                id(v, "key")?;
                id(v, "command")?;
                let key = exact_text(v, "key")?;
                if self.keys.contains_key(key) {
                    return Err(invalid());
                }
                // Operator shape is generic. Exact command fields, role kinds,
                // output adapters and installed leaf support remain the real
                // invocation owner's prerequisite to opening this family.
                let args = object(get(v, "args")?)?;
                for arg in args.values() {
                    if arg.get("role").is_some() {
                        fields(arg, &["role"], &[])?;
                        id(arg, "role")?;
                    } else if arg.get("output").is_some() {
                        fields(arg, &["output", "port", "quantity"], &[])?;
                        id(arg, "port")?;
                        count(arg, "quantity", 1)?;
                        if !self
                            .keys
                            .get(exact_text(arg, "output")?)
                            .is_some_and(|ports| {
                                ports.contains(
                                    exact_text(arg, "port").expect("validated output port"),
                                )
                            })
                        {
                            return Err(invalid());
                        }
                    } else {
                        fields(arg, &["literal"], &[])?;
                        match get(arg, "literal")? {
                            SqlCell::Bool(_) => {}
                            SqlCell::Number(n) if n.as_f64().is_some_and(f64::is_finite) => {}
                            SqlCell::Text(s) if s.units_len() as u64 <= self.limits.text => {}
                            _ => return Err(invalid()),
                        }
                    }
                }
                let mut ports = BTreeSet::new();
                if let Some(outputs) = v.get("outputs") {
                    let outputs = outputs.as_array().ok_or_else(invalid)?;
                    if outputs.len() as u64 > self.limits.outputs {
                        return Err(invalid());
                    }
                    for out in outputs {
                        fields(out, &["port", "definitionId", "quantity"], &[])?;
                        id(out, "port")?;
                        id(out, "definitionId")?;
                        count(out, "quantity", 1)?;
                        ports.insert(exact_text(out, "port")?);
                    }
                }
                self.keys.insert(key, ports);
            }
            "sequence" => {
                fields(v, &["kind", "name", "children"], &["requirements"])?;
                let children = array(v, "children")?;
                if children.is_empty() {
                    return Err(invalid());
                }
                for child in children {
                    self.node(child, depth + 1, multiplier)?;
                }
            }
            "branch" => {
                fields(v, &["kind", "name", "when", "yes"], &["no", "requirements"])?;
                self.predicate(get(v, "when")?)?;
                self.node(get(v, "yes")?, depth + 1, multiplier)?;
                if let Some(no) = v.get("no") {
                    self.node(no, depth + 1, multiplier)?;
                }
            }
            "repeat" => {
                fields(
                    v,
                    &["kind", "name", "until", "maximum", "body"],
                    &["finishAtMaximum", "requirements"],
                )?;
                let max = count(v, "maximum", 1)?;
                if max > self.limits.iterations
                    || v.get("finishAtMaximum")
                        .is_some_and(|v| v.as_bool() != Some(true))
                {
                    return Err(invalid());
                }
                self.node(
                    get(v, "body")?,
                    depth + 1,
                    multiplier.checked_mul(max).ok_or_else(invalid)?,
                )?;
                self.predicate(get(v, "until")?)?;
            }
            "wait" => {
                fields(v, &["kind", "name", "until", "seconds"], &["requirements"])?;
                self.predicate(get(v, "until")?)?;
                let seconds = number(v, "seconds")?;
                if seconds <= 0. || seconds > self.limits.wait_seconds as f64 {
                    return Err(invalid());
                }
            }
            _ => return Err(invalid()),
        }
        Ok(())
    }
}
impl ActivityExecution {
    pub(crate) fn validate_structure(
        &self,
        limits: &crate::activity::ActivityLimits,
        sim_time: f64,
        world: &crate::simulation::InstalledWorld,
        budget: &ByteBudget,
    ) -> Result<(), InstallError> {
        // Full command/acquisition/work/life joins deliberately still refuse
        // positive installation below; this is the typed storage prerequisite.
        let heap = self.heap_bytes().ok_or(InstallError::Capacity)?;
        let _scratch = budget
            .reserve(
                heap.checked_mul(8)
                    .and_then(|n| n.checked_add(8192))
                    .ok_or(InstallError::Capacity)?,
            )
            .map_err(|_| InstallError::Capacity)?;
        if self.human_initiated.is_some_and(|v| !v)
            || self
                .combat_help_id
                .as_deref()
                .is_some_and(|id| !is_safe_record_id(id))
            || self
                .method_id
                .as_deref()
                .is_some_and(|id| !is_safe_record_id(id))
            || self.request.is_some() == self.method_id.is_some()
            || self
                .cooperation
                .as_ref()
                .is_some_and(|c| !is_safe_record_id(&c.id) || c.revision == 0)
            || self.serial > limits.expanded_work
            || self.processed > limits.expanded_work
            || self.archived_steps.is_some_and(|n| n > self.serial)
            || self.pending.len() as u64 > limits.nodes
        {
            return Err(invalid());
        }
        dictionary(&self.bindings)?;
        for binding in self.bindings.object_values() {
            if binding.as_text().is_none() {
                point(binding, true)?;
            }
        }
        dictionary(&self.target_episodes)?;
        for episode in self.target_episodes.object_values() {
            if !matches!(episode, SqlCell::Null)
                && episode.as_text().is_none_or(|id| !is_safe_record_text(id))
            {
                return Err(invalid());
            }
        }
        dictionary(&self.outputs)?;
        let mut grammar = Grammar {
            limits,
            count: 0,
            expanded: 0,
            keys: BTreeMap::new(),
            subtrees: Vec::new(),
        };
        if let Some(request) = &self.request {
            if request.name.trim_is_empty() || request.name.units_len() as u64 > limits.text {
                return Err(invalid());
            }
            grammar.node(&request.root, 0, 1)?;
            if let Some(quantity) = &request.quantity {
                if !world
                    .ordinary_actions
                    .value()
                    .plan
                    .supports_activity_quantity_command(&quantity.command)
                    || quantity.requested == 0
                    || quantity.requested > limits.iterations
                    || quantity.unit_label.trim_is_empty()
                    || quantity.unit_label.units_len() as u64 > limits.text
                    || self
                        .completed_units
                        .is_none_or(|n| n > quantity.requested || n > self.serial)
                {
                    return Err(invalid());
                }
                let root = &request.root;
                let matches = |node: &SqlCell| {
                    text(node, "kind") == Ok("invoke")
                        && text(node, "command") == Ok(quantity.command.as_str())
                };
                let sequence = text(root, "kind") == Ok("sequence")
                    && array(root, "children").is_ok_and(|children| {
                        children.len() as u64 == quantity.requested && children.iter().all(matches)
                    });
                let repeat = text(root, "kind") == Ok("repeat")
                    && root.get("finishAtMaximum").and_then(SqlCell::as_bool) == Some(true)
                    && count(root, "maximum", 1) == Ok(quantity.requested)
                    && get(root, "body").is_ok_and(matches);
                if !sequence && !repeat {
                    return Err(invalid());
                }
            } else if self.completed_units.is_some() {
                return Err(invalid());
            }
            for frame in &self.pending {
                if frame.iteration > limits.iterations
                    || frame
                        .started_at
                        .is_some_and(|at| !at.is_finite() || at < 0. || at > sim_time)
                    || !grammar.subtrees.iter().any(|node| **node == frame.node)
                {
                    return Err(invalid());
                }
            }
            if self
                .active_key
                .as_ref()
                .is_some_and(|key| !grammar.keys.contains_key(key))
                || self.outputs.object_len()
                    != Some(
                        grammar
                            .keys
                            .keys()
                            .filter(|key| self.outputs.get_text(key).is_some())
                            .count(),
                    )
            {
                return Err(invalid());
            }
            if let Some(cancelled) = &self.cancelled_keys {
                let mut unique = BTreeSet::new();
                for key in cancelled {
                    if !grammar.keys.contains_key(key)
                        || !unique.insert(key)
                        || self.active_key.as_ref() == Some(key)
                    {
                        return Err(invalid());
                    }
                }
            }
        } else if self.completed_units.is_some() {
            return Err(invalid());
        }
        for outputs in self.outputs.object_values() {
            let outputs = outputs.as_array().ok_or_else(invalid)?;
            if outputs.len() as u64 > limits.outputs {
                return Err(invalid());
            }
            for out in outputs {
                // Same canonical ActivityOutput fields; retain raw text keys
                // rather than buffering this child through Value or String.
                fields(out, &["itemId", "port", "definitionId", "quantity"], &[])?;
                for key in ["itemId", "port", "definitionId"] {
                    id(out, key)?;
                }
                count(out, "quantity", 1)?;
            }
        }
        if let Some(control) = &self.control {
            if self.request.is_none() {
                return Err(invalid());
            }
            self.control_shape(control, limits, &self.bindings)?;
        } else if self.attempts.is_some()
            || self.last_attempt_id.is_some()
            || self.spent.is_some()
            || self.interrupted.is_some()
            || self.terminal.is_some()
        {
            return Err(invalid());
        }
        Ok(())
    }
    fn control_shape(
        &self,
        c: &SqlCell,
        limits: &crate::activity::ActivityLimits,
        bindings: &SqlCell,
    ) -> Result<(), InstallError> {
        if number(c, "deadline")? < 0. || self.interrupted.is_none() || self.terminal.is_none() {
            return Err(invalid());
        }
        match text(c, "kind")? {
            "counted" => {
                fields(
                    c,
                    &[
                        "kind",
                        "deadline",
                        "observation",
                        "accessRoles",
                        "reachRoles",
                        "budget",
                    ],
                    &[],
                )?;
                let o = get(c, "observation")?;
                fields(o, &["definition", "role"], &[])?;
                pin(get(o, "definition")?)?;
                id(o, "role")?;
                if bindings
                    .get_text(exact_text(o, "role")?)
                    .and_then(SqlCell::as_text)
                    .is_none()
                {
                    return Err(invalid());
                }
                for key in ["accessRoles", "reachRoles"] {
                    let roles = array(c, key)?;
                    // Source validateChosenActivityControl bounds each saved
                    // reference list to eight, independently of world policy.
                    if roles.len() > 8 {
                        return Err(invalid());
                    }
                    for (i, role) in roles.iter().enumerate() {
                        let role = role
                            .as_text()
                            .filter(|id| is_safe_record_text(id))
                            .ok_or_else(invalid)?;
                        if roles[..i].iter().any(|r| r.as_text() == Some(role))
                            || bindings.get_text(role).and_then(SqlCell::as_text).is_none()
                        {
                            return Err(invalid());
                        }
                    }
                }
                let b = get(c, "budget")?;
                fields(b, &["command", "maximumAttempts", "maximumSpent"], &[])?;
                id(b, "command")?;
                let attempts = count(b, "maximumAttempts", 1)?;
                let spent = count(b, "maximumSpent", 1)?;
                if attempts > limits.iterations
                    || spent > limits.iterations
                    || self.attempts.is_none_or(|n| n > attempts)
                    || self.spent.is_none_or(|n| n > spent)
                    || self.attempts == Some(0) && self.last_attempt_id.is_some()
                    || self.attempts.is_some_and(|n| n > 0)
                        && self
                            .last_attempt_id
                            .as_deref()
                            .is_none_or(|id| !is_safe_record_id(id))
                {
                    return Err(invalid());
                }
            }
            "finite" => {
                fields(
                    c,
                    &["kind", "deadline", "boundary", "subjects"],
                    &["stopWithin"],
                )?;
                if self.attempts.is_some() || self.spent.is_some() || self.last_attempt_id.is_some()
                {
                    return Err(invalid());
                }
                let boundary = get(c, "boundary")?;
                if !matches!(boundary, SqlCell::Null) {
                    fields(boundary, &["origin", "radius"], &[])?;
                    let origin = get(boundary, "origin")?;
                    fields(origin, &["x", "y", "z"], &[])?;
                    point(origin, false)?;
                    if number(boundary, "radius")? <= 0. {
                        return Err(invalid());
                    }
                }
                let subjects = get(c, "subjects")?;
                dictionary(subjects)?;
                // The same Source chosen-control storage/admission envelope;
                // this is not a world population or cooperation-party limit.
                if subjects.object_len().is_none_or(|n| n > 8) {
                    return Err(invalid());
                }
                for s in subjects.object_values() {
                    fields(s, &["physicalLife", "episode"], &["observationOnly"])?;
                    count(s, "physicalLife", 0)?;
                    if !matches!(get(s, "episode")?, SqlCell::Null) {
                        id(s, "episode")?;
                    }
                    if s.get("observationOnly")
                        .is_some_and(|v| v.as_bool() != Some(true))
                    {
                        return Err(invalid());
                    }
                }
                if let Some(stop) = c.get("stopWithin") {
                    fields(stop, &["subjectId", "distance"], &[])?;
                    id(stop, "subjectId")?;
                    if number(stop, "distance")? <= 0.
                        || subjects
                            .get_text(exact_text(stop, "subjectId")?)
                            .is_none_or(|s| {
                                s.get("observationOnly").and_then(SqlCell::as_bool) == Some(true)
                            })
                    {
                        return Err(invalid());
                    }
                }
            }
            _ => return Err(invalid()),
        }
        Ok(())
    }
}
