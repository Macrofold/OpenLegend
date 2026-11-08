//! Personal action facts and result addresses. A result address requests current
//! eligible personal evidence; execution history never grants that evidence.

use crate::encoding::js_trim;
use crate::identity::MAX_SAFE_INTEGER;
use crate::received::TemporalReceiptLocator;
use crate::values::{deserialize_present_option, is_safe_record_id};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

mod event;
pub(crate) use event::EventActivity;
mod state;
pub(crate) use state::*;
mod journal;
pub(crate) use journal::*;
mod install;
mod retained_size;
pub(crate) use install::install_activity;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ActivityScalar {
    String(String),
    Number(f64),
    Boolean(bool),
}

/// The current renderer admits a finite human-labelled JSON detail tree. Null,
/// executable values and unbounded nesting are not part of this family.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ActivityDetail {
    Scalar(ActivityScalar),
    List(Vec<ActivityDetail>),
    Fields(
        #[serde(serialize_with = "crate::encoding::serialize_js_map")]
        IndexMap<String, ActivityDetail>,
    ),
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityFact {
    pub name: String,
    pub value: ActivityDetail,
    pub critical: bool,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub sentence: Option<String>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityView {
    pub name: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub actor: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub target: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub tool: Option<String>,
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
    pub result: Option<String>,
}

pub(crate) fn approach_view_bytes(
    view: &ActivityView,
    name: &str,
    facts: &[String],
) -> Option<usize> {
    use crate::host::retained_size::HeapBytes;
    view.facts
        .iter()
        .filter(|fact| facts.iter().any(|name| name == &fact.name))
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
            .filter(|fact| facts.iter().any(|name| name == &fact.name))
    };
    let mut held = Vec::with_capacity(selected().count());
    held.extend(selected().cloned());
    view.children = Some(vec![ActivityView {
        name: name.to_owned(),
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
            Self::Scalar(ActivityScalar::String(value))
                if value.encode_utf16().count() > limits.text =>
            {
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
                    if js_trim(key).is_empty()
                        || key.encode_utf16().count() > 80
                        || key.contains(['_', '.', ':'])
                        || matches!(
                            key.to_ascii_lowercase().as_str(),
                            "id" | "schema" | "kind" | "code" | "basis"
                        )
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
        if js_trim(&self.name).is_empty() || self.name.encode_utf16().count() > 80 {
            return Err(ActivityError::InvalidFact);
        }
        self.value.validate_at(limits, 0)
    }
}

pub struct ActivityProjection {
    pub text: String,
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
    let mut bytes = view.name.len();
    let mut temporary = 0;
    for (label, value) in [
        ("actor", view.actor.as_deref()),
        ("target", view.target.as_deref()),
        ("tool", view.tool.as_deref()),
    ] {
        if let Some(value) = value.filter(|value| !value.is_empty()) {
            bytes = activity_text_sum(bytes, activity_text_sum(4 + label.len(), value.len())?)?;
        }
    }
    for fact in &view.facts {
        let (length, scratch) = match &fact.value {
            ActivityDetail::Scalar(ActivityScalar::String(value)) => (value.len(), 0),
            value => {
                let length = crate::encoding::json_record_len(value)?;
                // The shared streaming encoder grows a Vec<u8>; admit its
                // pinned amortized capacity, including Vec's minimum allocation.
                let scratch = length
                    .checked_mul(2)
                    .map(|bytes| bytes.max(8))
                    .ok_or_else(|| {
                        <serde_json::Error as serde::ser::Error>::custom(
                            "Activity fact encoding allocation overflow.",
                        )
                    })?;
                (length, scratch)
            }
        };
        bytes = activity_text_sum(bytes, activity_text_sum(4 + fact.name.len(), length)?)?;
        temporary = temporary.max(scratch);
    }
    if let Some(children) = &view.children {
        for child in children {
            let (length, scratch) = activity_record_text_sizes(child)?;
            bytes = activity_text_sum(bytes, activity_text_sum(2, length)?)?;
            temporary = temporary.max(scratch);
        }
    }
    if let Some(result) = view.result.as_deref().filter(|value| !value.is_empty()) {
        bytes = activity_text_sum(bytes, activity_text_sum(10, result.len())?)?;
    }
    Ok((bytes, temporary))
}
pub(crate) fn activity_record_text_bound(view: &ActivityView) -> Result<usize, serde_json::Error> {
    let (bytes, temporary) = activity_record_text_sizes(view)?;
    activity_text_sum(
        activity_text_sum(bytes, temporary)?,
        std::mem::size_of::<String>(),
    )
}
/// Stream the exact complete Source sequence into one output. Its caller can
/// reserve output plus the largest single encoded fact before rendering; child
/// text and a vector of every intermediate fragment are unnecessary.
pub fn activity_record_text(view: &ActivityView) -> Result<String, serde_json::Error> {
    fn append(view: &ActivityView, text: &mut String) -> Result<(), serde_json::Error> {
        text.push_str(&view.name);
        for (label, value) in [
            ("actor", view.actor.as_deref()),
            ("target", view.target.as_deref()),
            ("tool", view.tool.as_deref()),
        ] {
            if let Some(value) = value.filter(|value| !value.is_empty()) {
                text.push_str("; ");
                text.push_str(label);
                text.push_str(": ");
                text.push_str(value);
            }
        }
        for fact in &view.facts {
            text.push_str("; ");
            text.push_str(&fact.name);
            text.push_str(": ");
            match &fact.value {
                ActivityDetail::Scalar(ActivityScalar::String(value)) => text.push_str(value),
                value => text.push_str(&crate::encoding::json_record(value)?),
            }
        }
        if let Some(children) = &view.children {
            for child in children {
                text.push_str("; ");
                append(child, text)?;
            }
        }
        if let Some(result) = view.result.as_deref().filter(|value| !value.is_empty()) {
            text.push_str("; Result: ");
            text.push_str(result);
        }
        Ok(())
    }
    let mut text = String::with_capacity(activity_record_text_sizes(view)?.0);
    append(view, &mut text)?;
    Ok(text)
}

fn prose(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    let mut newline = false;
    for ch in value.chars() {
        match ch {
            '\r' | '\n' => {
                if !newline {
                    result.push(' ');
                }
                newline = true;
            }
            '[' => {
                result.push('［');
                newline = false;
            }
            ']' => {
                result.push('］');
                newline = false;
            }
            ch => {
                result.push(ch);
                newline = false;
            }
        }
    }
    result
}
fn scalar_text(value: &ActivityScalar) -> Result<String, ActivityError> {
    match value {
        ActivityScalar::String(value) => Ok(value.clone()),
        _ => crate::encoding::json_record(value).map_err(|_| ActivityError::InvalidFact),
    }
}

/// Same bounded grammar/coverage as the existing projectActivity formatter.
/// Formatting does not consult a world, grant evidence or choose activity facts.
#[derive(Clone, Copy)]
struct View<'a> {
    name: &'a str,
    actor: Option<&'a str>,
    target: Option<&'a str>,
    tool: Option<&'a str>,
    facts: &'a [ActivityFact],
    children: Option<&'a [ActivityView]>,
    result: Option<&'a str>,
}
impl<'a> From<&'a ActivityView> for View<'a> {
    fn from(view: &'a ActivityView) -> Self {
        Self {
            name: &view.name,
            actor: view.actor.as_deref(),
            target: view.target.as_deref(),
            tool: view.tool.as_deref(),
            facts: &view.facts,
            children: view.children.as_deref(),
            result: view.result.as_deref(),
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
            ) -> Result<String, ActivityError> {
                self.count += 1;
                if self.count > self.limits.nodes || depth > self.limits.depth {
                    return Err(ActivityError::InvalidStructure);
                }
                if js_trim(&node.name).is_empty()
                    || node.name.encode_utf16().count() > self.limits.text
                    || node.facts.len() > self.limits.facts
                {
                    return Err(ActivityError::InvalidStructure);
                }
                let mut details = Vec::new();
                for (label, value) in [
                    ("actor", node.actor),
                    ("target", node.target),
                    ("tool", node.tool),
                ] {
                    if let Some(value) = value.filter(|value| !value.is_empty()) {
                        details.push(format!("{label}: {}", prose(value)));
                    }
                }
                let mut extra: IndexMap<String, &ActivityDetail> = IndexMap::new();
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
                        details.push(format!(
                            "{}: {}",
                            prose(&fact.name),
                            prose(&scalar_text(value)?)
                        ));
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
                            format!("Step {} within {}: ", index + 1, prose(&node.name))
                        } else {
                            String::new()
                        };
                        children.push(format!(
                            "{prefix}{}",
                            self.render(child.into(), depth + 1, &format!("{path}.{index}"))?
                        ));
                    }
                }
                let mut text = prose(&node.name);
                if !details.is_empty() {
                    text.push_str(&format!(" ({})", details.join("; ")));
                }
                if !children.is_empty() {
                    if depth >= self.detail_depth {
                        text.push_str(&format!(
                            ". Nested layout is not shown. {}",
                            children.join("; ")
                        ));
                    } else {
                        text.push_str(&format!(" [{}]", children.join("; ")));
                    }
                }
                let last_result = node
                    .children
                    .and_then(|children| children.last())
                    .and_then(|child| child.result.as_deref());
                if let Some(result) = node
                    .result
                    .filter(|result| !result.is_empty() && Some(*result) != last_result)
                {
                    text.push_str(&format!(". Result: {}", prose(result)));
                }
                if !extra.is_empty() {
                    struct Extra<'a>(IndexMap<String, &'a ActivityDetail>);
                    impl Serialize for Extra<'_> {
                        fn serialize<S: serde::Serializer>(
                            &self,
                            serializer: S,
                        ) -> Result<S::Ok, S::Error> {
                            crate::encoding::serialize_js_map(&self.0, serializer)
                        }
                    }
                    text.push_str(&format!(
                        ". Extra details: {}",
                        crate::encoding::json_record(&Extra(extra))
                            .map_err(|_| ActivityError::InvalidFact)?
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
            format!("{header}: {body}")
        } else {
            body
        };
        if renderer.omitted {
            text.push_str(". Optional details are not shown.");
        }
        Ok(ActivityProjection {
            bytes: text.len(),
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
        name: "result validation",
        actor: None,
        target: None,
        tool: None,
        facts,
        children: None,
        result: None,
    };
    project_view(view, None, limits, limits.display_bytes, limits.depth).map(|_| ())
}
