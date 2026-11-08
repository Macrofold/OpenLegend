//! Shared meaning of a received body's description. Animation, position and
//! provenance do not manufacture descriptive novelty.
use super::*;
use serde::Serialize;
#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct BodyMeaning<'a> {
    kind: &'a str,
    appearance: &'a crate::text::JsText,
    #[serde(skip_serializing_if = "Option::is_none")]
    label: Option<&'a Named>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<&'a crate::text::JsText>,
    radius: f64,
    height: f64,
    outward: &'a [String; 4],
    #[serde(skip_serializing_if = "Option::is_none")]
    heat_lit: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    remains_phase: Option<&'a crate::worlds::base_observed::RemainsPhase>,
    storage: bool,
}

macro_rules! meaning {
    ($body:expr,$description:expr) => {
        BodyMeaning {
            kind: &$body.kind,
            appearance: &$body.appearance,
            label: $body.label.as_ref(),
            description: $description,
            radius: $body.radius,
            height: $body.height,
            outward: &$body.outward,
            heat_lit: $body.heat_lit,
            remains_phase: $body.remains_phase.as_ref(),
            storage: $body.storage.is_some(),
        }
    };
}
pub(super) fn body_details_meaning<'a>(
    body: &'a ObservedBodyDetails,
    description: Option<&'a crate::text::JsText>,
) -> BodyMeaning<'a> {
    meaning!(body, description)
}
pub(super) fn body_meaning_equal(a: &ObservedBody, b: &ObservedBody) -> bool {
    meaning!(a, a.description.as_ref()) == meaning!(b, b.description.as_ref())
}
