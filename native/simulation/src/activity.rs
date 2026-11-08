//! Personal action facts and result addresses. A result address requests current
//! eligible personal evidence; execution history never grants that evidence.

use crate::encoding::js_trim;
use crate::identity::MAX_SAFE_INTEGER;
use crate::received::TemporalReceiptLocator;
use crate::text::{JsText, TextRef};
use crate::values::{deserialize_present_option, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod event;
pub(crate) use event::EventActivity;
mod state;
pub(crate) use state::*;
mod journal;
pub(crate) use journal::*;
mod fields;
mod install;
mod retained_size;
pub use fields::ActivityFields;
pub(crate) use install::install_activity;

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum ActivityScalar {
    String(JsText),
    Number(f64),
    Boolean(bool),
}
impl<'de> Deserialize<'de> for ActivityScalar {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(deserializer)?;
        match raw.get().trim_start().as_bytes().first() {
            Some(b'"') => serde_json::from_str(raw.get()).map(Self::String),
            Some(b't' | b'f') => serde_json::from_str(raw.get()).map(Self::Boolean),
            _ => serde_json::from_str(raw.get()).map(Self::Number),
        }
        .map_err(serde::de::Error::custom)
    }
}

/// The current renderer admits a finite human-labelled JSON detail tree. Null,
/// executable values and unbounded nesting are not part of this family.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(untagged)]
pub enum ActivityDetail {
    Scalar(ActivityScalar),
    List(Vec<ActivityDetail>),
    Fields(ActivityFields),
}
impl<'de> Deserialize<'de> for ActivityDetail {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        fn parse(raw: &str, depth: usize) -> Result<ActivityDetail, serde_json::Error> {
            if depth > 4 {
                return Err(<serde_json::Error as serde::de::Error>::custom(
                    "Activity detail nesting exceeds current format.",
                ));
            }
            match raw.trim_start().as_bytes().first() {
                Some(b'[') => serde_json::from_str::<Vec<Box<serde_json::value::RawValue>>>(raw)?
                    .into_iter()
                    .map(|value| parse(value.get(), depth + 1))
                    .collect::<Result<Vec<_>, _>>()
                    .map(ActivityDetail::List),
                Some(b'{') => fields::raw_entries(raw)?
                    .into_iter()
                    .map(|(key, value)| parse(value.get(), depth + 1).map(|value| (key, value)))
                    .collect::<Result<IndexMap<_, _>, _>>()
                    .and_then(ActivityFields::new)
                    .map(ActivityDetail::Fields),
                _ => serde_json::from_str(raw).map(ActivityDetail::Scalar),
            }
        }
        let raw = Box::<serde_json::value::RawValue>::deserialize(deserializer)?;
        parse(raw.get(), 0).map_err(serde::de::Error::custom)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityFact {
    pub name: JsText,
    pub value: ActivityDetail,
    pub critical: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sentence: Option<JsText>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityView {
    pub name: JsText,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub actor: Option<JsText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target: Option<JsText>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub tool: Option<JsText>,
    pub facts: Vec<ActivityFact>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub children: Option<Vec<ActivityView>>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub result: Option<JsText>,
}

pub(crate) fn approach_view_bytes(
    view: &ActivityView,
    name: &str,
    facts: &[String],
) -> Option<usize> {
    use crate::host::retained_size::HeapBytes;
    view.facts
        .iter()
        .filter(|fact| facts.iter().any(|name| fact.name == name.as_str()))
        .try_fold(
            std::mem::size_of::<ActivityView>().checked_add(name.len())?,
            |bytes, fact| {
                bytes
                    .checked_add(std::mem::size_of::<ActivityFact>())?
                    .checked_add(fact.heap_bytes()?)
            },
        )
}
pub(crate) fn prepare_approach_view(view: &mut ActivityView, name: &str, facts: &[String]) {
    let selected = || {
        view.facts
            .iter()
            .filter(|fact| facts.iter().any(|name| fact.name == name.as_str()))
    };
    let mut held = Vec::with_capacity(selected().count());
    held.extend(selected().cloned());
    view.children = Some(vec![ActivityView {
        name: name.into(),
        actor: None,
        target: None,
        tool: None,
        facts: held,
        children: None,
        result: None,
    }]);
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ResultAccountSource {
    Memory,
    Awareness,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase", deny_unknown_fields)]
pub enum ResultEvidence {
    Account {
        source: ResultAccountSource,
        id: String,
    },
    Recent {
        subject: String,
        receipt: TemporalReceiptLocator,
    },
}
impl ResultEvidence {
    pub fn validate(&self, actor_id: &str) -> Result<(), ActivityError> {
        match self {
            Self::Account { id, .. } if is_safe_record_id(id) => Ok(()),
            Self::Recent { subject, receipt }
                if is_safe_record_id(subject)
                    && receipt.actor_id == actor_id
                    && is_safe_record_id(&receipt.epoch)
                    && receipt.physical_life <= MAX_SAFE_INTEGER
                    && receipt.batch_order <= MAX_SAFE_INTEGER
                    && receipt.entry_index <= MAX_SAFE_INTEGER =>
            {
                Ok(())
            }
            _ => Err(ActivityError::InvalidEvidence),
        }
    }
    pub(crate) fn id_len(&self) -> Option<usize> {
        match self {
            Self::Account { id, .. } => Some(id.len()),
            Self::Recent { receipt, .. } => receipt.id_len(),
        }
    }
    pub fn id(&self) -> String {
        match self {
            Self::Account { id, .. } => id.clone(),
            Self::Recent { receipt, .. } => receipt.id(),
        }
    }
    pub fn matches_receipt(&self, subject: &str, receipt: &TemporalReceiptLocator) -> bool {
        matches!(self,Self::Recent{subject:actual,receipt:own}if actual==subject && own==receipt)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActivityError {
    InvalidFact,
    InvalidEvidence,
    InvalidStructure,
    Capacity,
    Unavailable,
    UnsupportedFamily,
}

/// Operational display bounds are supplied from the existing activity owner at
/// installation. No world tuning or replacement allowance is chosen here.
#[derive(Debug)]
pub struct ActivityDisplayLimits {
    pub text: usize,
    pub detail_entries: usize,
    pub facts: usize,
    pub nodes: usize,
    pub depth: usize,
    pub display_bytes: usize,
}
impl ActivityDetail {
    fn validate_at(
        &self,
        limits: &ActivityDisplayLimits,
        depth: usize,
    ) -> Result<(), ActivityError> {
        if depth > 4 {
            return Err(ActivityError::InvalidFact);
        }
        match self {
            Self::Scalar(ActivityScalar::Number(value)) if !value.is_finite() => {
                Err(ActivityError::InvalidFact)
            }
            Self::Scalar(ActivityScalar::String(value)) if value.units_len() > limits.text => {
                Err(ActivityError::InvalidFact)
            }
            Self::Scalar(_) => Ok(()),
            Self::List(values) => {
                if values.len() > limits.detail_entries {
                    return Err(ActivityError::InvalidFact);
                }
                for value in values {
                    value.validate_at(limits, depth + 1)?;
                }
                Ok(())
            }
            Self::Fields(values) => {
                if values.len() > limits.detail_entries {
                    return Err(ActivityError::InvalidFact);
                }
                for (key, value) in values {
                    if key.trim_is_empty()
                        || key.units_len() > 80
                        || key.units().any(|u| matches!(u, 95 | 46 | 58))
                        || key.as_unicode().is_some_and(|key| {
                            matches!(
                                key.to_ascii_lowercase().as_str(),
                                "id" | "schema" | "kind" | "code" | "basis"
                            )
                        })
                    {
                        return Err(ActivityError::InvalidFact);
                    }
                    value.validate_at(limits, depth + 1)?;
                }
                Ok(())
            }
        }
    }
}
impl ActivityFact {
    pub fn validate(&self, limits: &ActivityDisplayLimits) -> Result<(), ActivityError> {
        if self.name.trim_is_empty() || self.name.units_len() > 80 {
            return Err(ActivityError::InvalidFact);
        }
        self.value.validate_at(limits, 0)
    }
}

pub struct ActivityProjection {
    pub text: JsText,
    pub covered: Vec<String>,
    pub fallback: Vec<String>,
    pub omitted: bool,
    pub bytes: usize,
}

/// Complete event-time facts for personal evidence. Display omission and prompt
/// budgets never replace the original occurrence's precise retained facts.
fn activity_text_sum(left: usize, right: usize) -> Result<usize, serde_json::Error> {
    left.checked_add(right).ok_or_else(|| {
        <serde_json::Error as serde::ser::Error>::custom("Activity text allocation overflow.")
    })
}
fn activity_record_text_sizes(view: &ActivityView) -> Result<(usize, usize), serde_json::Error> {
    let mut units = view.name.units_len();
    let mut temporary = 0;
    for (label, value) in [
        ("actor", view.actor.as_ref()),
        ("target", view.target.as_ref()),
        ("tool", view.tool.as_ref()),
    ] {
        if let Some(value) = value.filter(|value| !value.is_empty()) {
            units = activity_text_sum(
                units,
                activity_text_sum(4 + label.len(), value.units_len())?,
            )?;
        }
    }
    for fact in &view.facts {
        let (length, scratch) = match &fact.value {
            ActivityDetail::Scalar(ActivityScalar::String(value)) => (value.units_len(), 0),
            value => {
                let bytes = crate::encoding::json_record_len(value)?;
                (
                    bytes,
                    bytes
                        .checked_mul(2)
                        .map(|bytes| bytes.max(8))
                        .ok_or_else(|| {
                            <serde_json::Error as serde::ser::Error>::custom(
                                "Activity fact allocation overflow.",
                            )
                        })?,
                )
            }
        };
        units = activity_text_sum(units, activity_text_sum(4 + fact.name.units_len(), length)?)?;
        temporary = temporary.max(scratch);
    }
    if let Some(children) = &view.children {
        for child in children {
            let (length, scratch) = activity_record_text_sizes(child)?;
            units = activity_text_sum(units, activity_text_sum(2, length)?)?;
            temporary = temporary.max(scratch);
        }
    }
    if let Some(result) = view.result.as_ref().filter(|value| !value.is_empty()) {
        units = activity_text_sum(units, activity_text_sum(10, result.units_len())?)?;
    }
    Ok((units, temporary))
}
pub(crate) fn activity_record_text_bound(view: &ActivityView) -> Result<usize, serde_json::Error> {
    let (units, temporary) = activity_record_text_sizes(view)?;
    // One exact UTF16 output, optional raw JSON string (at most six bytes per
    // unit), and the owner's Unicode/encoding scratch coexist at construction.
    activity_text_sum(
        activity_text_sum(
            units.checked_mul(16).ok_or_else(|| {
                <serde_json::Error as serde::ser::Error>::custom(
                    "Activity text allocation overflow.",
                )
            })?,
            temporary,
        )?,
        std::mem::size_of::<JsText>(),
    )
}
/// Complete Source event-time facts: one UTF16 output preserves isolated units;
/// only one non-string fact is encoded at a time. Display omission never edits it.
pub fn activity_record_text(view: &ActivityView) -> Result<JsText, serde_json::Error> {
    fn append(view: &ActivityView, units: &mut Vec<u16>) -> Result<(), serde_json::Error> {
        units.extend(view.name.units());
        for (label, value) in [
            ("actor", view.actor.as_ref()),
            ("target", view.target.as_ref()),
            ("tool", view.tool.as_ref()),
        ] {
            if let Some(value) = value.filter(|value| !value.is_empty()) {
                units.extend("; ".encode_utf16());
                units.extend(label.encode_utf16());
                units.extend(": ".encode_utf16());
                units.extend(value.units());
            }
        }
        for fact in &view.facts {
            units.extend("; ".encode_utf16());
            units.extend(fact.name.units());
            units.extend(": ".encode_utf16());
            match &fact.value {
                ActivityDetail::Scalar(ActivityScalar::String(value)) => {
                    units.extend(value.units())
                }
                value => units.extend(crate::encoding::json_record(value)?.encode_utf16()),
            }
        }
        if let Some(children) = &view.children {
            for child in children {
                units.extend("; ".encode_utf16());
                append(child, units)?;
            }
        }
        if let Some(result) = view.result.as_ref().filter(|value| !value.is_empty()) {
            units.extend("; Result: ".encode_utf16());
            units.extend(result.units());
        }
        Ok(())
    }
    let mut units = Vec::with_capacity(activity_record_text_sizes(view)?.0);
    append(view, &mut units)?;
    Ok(JsText::from_units(units))
}
fn prose<'a>(value: impl Into<TextRef<'a>>) -> JsText {
    let value = value.into().to_owned();
    let mut result = Vec::with_capacity(value.units_len());
    let mut newline = false;
    for unit in value.units() {
        match unit {
            10 | 13 => {
                if !newline {
                    result.push(32);
                }
                newline = true;
            }
            91 => {
                result.push(0xff3b);
                newline = false;
            }
            93 => {
                result.push(0xff3d);
                newline = false;
            }
            unit => {
                result.push(unit);
                newline = false;
            }
        }
    }
    JsText::from_units(result)
}
fn scalar_text(value: &ActivityScalar) -> Result<JsText, ActivityError> {
    match value {
        ActivityScalar::String(value) => Ok(value.clone()),
        _ => crate::encoding::json_record(value)
            .map(Into::into)
            .map_err(|_| ActivityError::InvalidFact),
    }
}
fn text_join(values: &[JsText], separator: &str) -> JsText {
    let mut text = JsText::default();
    for (index, value) in values.iter().enumerate() {
        if index > 0 {
            text.push_str(separator);
        }
        text.push_text(value);
    }
    text
}

/// Same bounded grammar/coverage as the existing projectActivity formatter.
/// Formatting does not consult a world, grant evidence or choose activity facts.
#[derive(Clone, Copy)]
struct View<'a> {
    name: TextRef<'a>,
    actor: Option<&'a JsText>,
    target: Option<&'a JsText>,
    tool: Option<&'a JsText>,
    facts: &'a [ActivityFact],
    children: Option<&'a [ActivityView]>,
    result: Option<&'a JsText>,
}
impl<'a> From<&'a ActivityView> for View<'a> {
    fn from(view: &'a ActivityView) -> Self {
        Self {
            name: (&view.name).into(),
            actor: view.actor.as_ref(),
            target: view.target.as_ref(),
            tool: view.tool.as_ref(),
            facts: &view.facts,
            children: view.children.as_deref(),
            result: view.result.as_ref(),
        }
    }
}

pub fn project_activity(
    view: &ActivityView,
    header: Option<&str>,
    limits: &ActivityDisplayLimits,
    byte_limit: usize,
    detail_depth: usize,
) -> Result<ActivityProjection, ActivityError> {
    project_view(view.into(), header, limits, byte_limit, detail_depth)
}
fn project_view(
    view: View<'_>,
    header: Option<&str>,
    limits: &ActivityDisplayLimits,
    byte_limit: usize,
    detail_depth: usize,
) -> Result<ActivityProjection, ActivityError> {
    if detail_depth > limits.depth {
        return Err(ActivityError::InvalidStructure);
    }
    fn prepare(
        view: View<'_>,
        header: Option<&str>,
        limits: &ActivityDisplayLimits,
        detail_depth: usize,
        optional: bool,
    ) -> Result<ActivityProjection, ActivityError> {
        struct Render<'a> {
            limits: &'a ActivityDisplayLimits,
            detail_depth: usize,
            optional: bool,
            count: usize,
            covered: Vec<String>,
            fallback: Vec<String>,
            omitted: bool,
        }
        impl Render<'_> {
            fn render(
                &mut self,
                node: View<'_>,
                depth: usize,
                path: &str,
            ) -> Result<JsText, ActivityError> {
                self.count += 1;
                if self.count > self.limits.nodes || depth > self.limits.depth {
                    return Err(ActivityError::InvalidStructure);
                }
                let valid_name = match node.name {
                    TextRef::Unicode(name) => {
                        !js_trim(name).is_empty() && name.encode_utf16().count() <= self.limits.text
                    }
                    TextRef::Text(name) => {
                        !name.trim_is_empty() && name.units_len() <= self.limits.text
                    }
                };
                if !valid_name || node.facts.len() > self.limits.facts {
                    return Err(ActivityError::InvalidStructure);
                }
                let mut details = Vec::new();
                for (label, value) in [
                    ("actor", node.actor),
                    ("target", node.target),
                    ("tool", node.tool),
                ] {
                    if let Some(value) = value.filter(|value| !value.is_empty()) {
                        let mut text: JsText = format!("{label}: ").into();
                        text.push_text(&prose(value));
                        details.push(text);
                    }
                }
                let mut extra: IndexMap<JsText, &ActivityDetail> = IndexMap::new();
                for (index, fact) in node.facts.iter().enumerate() {
                    if !fact.critical && (!self.optional || depth > self.detail_depth) {
                        self.omitted = true;
                        continue;
                    }
                    fact.validate(self.limits)?;
                    let key = format!("{path}.facts.{index}");
                    if let Some(sentence) = fact
                        .sentence
                        .as_ref()
                        .filter(|sentence| !sentence.is_empty())
                    {
                        details.push(prose(sentence));
                    } else if let ActivityDetail::Scalar(value) = &fact.value {
                        let mut text = prose(&fact.name);
                        text.push_str(": ");
                        text.push_text(&prose(&scalar_text(value)?));
                        details.push(text);
                    } else if fact.critical {
                        extra.insert(fact.name.clone(), &fact.value);
                        self.fallback.push(key.clone());
                    } else {
                        self.omitted = true;
                        continue;
                    }
                    self.covered.push(key);
                }
                let mut children = Vec::new();
                if let Some(nodes) = &node.children {
                    for (index, child) in nodes.iter().enumerate() {
                        let prefix = if depth >= self.detail_depth {
                            let mut prefix: JsText = format!("Step {} within ", index + 1).into();
                            prefix.push_text(&prose(node.name));
                            prefix.push_str(": ");
                            prefix
                        } else {
                            JsText::default()
                        };
                        let mut text = prefix;
                        text.push_text(&self.render(
                            child.into(),
                            depth + 1,
                            &format!("{path}.{index}"),
                        )?);
                        children.push(text);
                    }
                }
                let mut text = prose(node.name);
                if !details.is_empty() {
                    text.push_str(" (");
                    text.push_text(&text_join(&details, "; "));
                    text.push_str(")");
                }
                if !children.is_empty() {
                    if depth >= self.detail_depth {
                        text.push_str(". Nested layout is not shown. ");
                        text.push_text(&text_join(&children, "; "));
                    } else {
                        text.push_str(" [");
                        text.push_text(&text_join(&children, "; "));
                        text.push_str("]");
                    }
                }
                let last_result = node
                    .children
                    .and_then(|children| children.last())
                    .and_then(|child| child.result.as_ref());
                if let Some(result) = node
                    .result
                    .filter(|result| !result.is_empty() && Some(*result) != last_result)
                {
                    text.push_str(". Result: ");
                    text.push_text(&prose(result));
                }
                if !extra.is_empty() {
                    text.push_str(&format!(
                        ". Extra details: {}",
                        fields::encode(extra.iter()).map_err(|_| ActivityError::InvalidFact)?
                    ));
                }
                Ok(text)
            }
        }
        let mut renderer = Render {
            limits,
            detail_depth,
            optional,
            count: 0,
            covered: Vec::new(),
            fallback: Vec::new(),
            omitted: false,
        };
        let body = renderer.render(view, 0, "action")?;
        let mut text = if let Some(header) = header.filter(|h| !h.is_empty()) {
            let mut text: JsText = format!("{header}: ").into();
            text.push_text(&body);
            text
        } else {
            body
        };
        if renderer.omitted {
            text.push_str(". Optional details are not shown.");
        }
        Ok(ActivityProjection {
            bytes: text.utf8_len(),
            text,
            covered: renderer.covered,
            fallback: renderer.fallback,
            omitted: renderer.omitted,
        })
    }
    let full = prepare(view, header, limits, detail_depth, true)?;
    if full.bytes <= byte_limit {
        return Ok(full);
    }
    let required = prepare(view, header, limits, detail_depth, false)?;
    if required.bytes > byte_limit {
        return Err(ActivityError::Capacity);
    }
    Ok(required)
}

pub fn validate_result_facts(
    facts: &[ActivityFact],
    limits: &ActivityDisplayLimits,
) -> Result<(), ActivityError> {
    // Same literal wrapper and ordinary formatter allowance as the source
    // temporal-value validator; optional facts still use its required fallback.
    let view = View {
        name: "result validation".into(),
        actor: None,
        target: None,
        tool: None,
        facts,
        children: None,
        result: None,
    };
    project_view(view, None, limits, limits.display_bytes, limits.depth).map(|_| ())
}
