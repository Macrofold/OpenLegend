//! Authored expression vocabulary and operator reference material are immutable
//! parts of the selected world. Neither collection grants a command or effect.
use crate::host::retained_size::{HeapBytes, heap_record};
use crate::values::{deserialize_present_option, is_safe_record_id};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExperimentGuide {
    pub id: String,
    pub name: String,
    pub description: String,
    pub setup: String,
    pub changed_factor: String,
    pub observe: String,
    pub prerequisites: Vec<String>,
}
heap_record!(ExperimentGuide {
    id,
    name,
    description,
    setup,
    changed_factor,
    observe,
    prerequisites
});

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ExpressionDefinition {
    pub id: String,
    pub label: String,
    pub verb: String,
    pub description: String,
    pub target: ExpressionTarget,
    pub target_joiner: String,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub possessive_suffix: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub reach: Option<f64>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    pub contact: Option<ExpressionContact>,
}
#[derive(Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ExpressionTarget {
    Optional,
    Required,
}
impl HeapBytes for ExpressionTarget {
    fn heap_bytes(&self) -> Option<usize> {
        Some(0)
    }
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct ExpressionContact {
    pub kind: String,
    pub felt: String,
}
heap_record!(ExpressionDefinition {
    id,
    label,
    verb,
    description,
    target,
    target_joiner,
    possessive_suffix,
    reach,
    contact
});
heap_record!(ExpressionContact { kind, felt });

fn text(value: &str, limit: usize) -> bool {
    !crate::encoding::js_trim(value).is_empty() && value.encode_utf16().count() <= limit
}
pub(super) fn valid(guides: &[ExperimentGuide], expressions: &[ExpressionDefinition]) -> bool {
    guides.iter().enumerate().all(|(i, g)| {
        text(&g.id, 120)
            && !guides[..i].iter().any(|earlier| g.id == earlier.id)
            && [
                &g.name,
                &g.description,
                &g.setup,
                &g.changed_factor,
                &g.observe,
            ]
            .iter()
            .all(|v| text(v, 4000))
            && g.prerequisites.iter().all(|v| text(v, 1000))
    }) && expressions.iter().enumerate().all(|(i, e)| {
        is_safe_record_id(&e.id)
            && e.id.len() <= 120
            && e.id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"_.:-".contains(&b))
            && !expressions[..i].iter().any(|earlier| e.id == earlier.id)
            && text(&e.label, 80)
            && text(&e.verb, 40)
            && text(&e.description, 500)
            && e.target_joiner.encode_utf16().count() <= 40
            && e.possessive_suffix.as_ref().is_none_or(|v| text(v, 80))
            && e.reach.is_none_or(|v| v.is_finite() && v > 0.)
            && e.contact.as_ref().is_none_or(|contact| {
                e.target == ExpressionTarget::Required
                    && e.reach.is_some()
                    && is_safe_record_id(&contact.kind)
                    && text(&contact.felt, 160)
            })
    })
}
