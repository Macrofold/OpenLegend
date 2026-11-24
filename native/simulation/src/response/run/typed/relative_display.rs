//! Format a deterministic relative proposal from its accepted native preview.

use super::*;
use std::{fmt::Write, sync::OnceLock};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Words {
    walk: String,
    unit: String,
    right: String,
    left: String,
    forward: String,
    back: String,
    join: String,
    destination: String,
    complete: String,
    confirm: String,
    distance_needed: String,
    outside_prefix: String,
    outside_offsets: String,
    outside_suffix: String,
}

fn words() -> &'static Words {
    static WORDS: OnceLock<Words> = OnceLock::new();
    WORDS.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../../../packages/domain/src/typed-relative-format.json"
        ))
        .expect("the build contains the shared relative movement wording")
    })
}

fn coordinate(value: f64) -> f64 {
    // Match the Source display's Number(value.toFixed(1)), including ties.
    ryu_js::Buffer::new()
        .format_to_fixed(value, 1)
        .parse()
        .unwrap_or(value)
}

fn describe(x: f64, z: f64, destination: &crate::state::SurfacePoint) -> JsText {
    let words = words();
    let mut shown = words.walk.clone();
    let mut number = ryu_js::Buffer::new();
    if x != 0.0 {
        shown.push_str(number.format(x.abs()));
        shown.push_str(&words.unit);
        shown.push_str(if x > 0.0 { &words.right } else { &words.left });
    }
    if z != 0.0 {
        if x != 0.0 {
            shown.push_str(&words.join);
        }
        shown.push_str(number.format(z.abs()));
        shown.push_str(&words.unit);
        shown.push_str(if z > 0.0 { &words.forward } else { &words.back });
    }
    shown.push_str(&words.destination);
    let mut north = ryu_js::Buffer::new();
    let _ = write!(
        shown,
        "x={}, z={}.",
        number.format(coordinate(destination.x)),
        north.format(coordinate(destination.z)),
    );
    shown.into()
}

/// The cursor admits the result, including storage needed while assembling it.
/// Rust can keep the typed result without preparing another formatted packet.
pub(super) fn render(item: &Item, core: &CoreMutation<'_>) -> Result<Rendered, ExecutionError> {
    let prepared = item.prepared.as_ref().ok_or(ExecutionError::Invariant)?;
    let words = words();
    let refused = |category: &str, reason: JsText| Rendered {
        fulfillment: None,
        resolution: Some(ResolutionWords {
            category: category.into(),
            reason: if reason.units_len() > 500 {
                reason.slice(0..500)
            } else {
                reason
            },
        }),
    };
    match prepared {
        Prepared::Offset { x, z, destination } => {
            let description = describe(*x, *z, destination);
            let mut fields = IndexMap::with_capacity(6);
            fields.insert("requested".into(), item.description.clone().into());
            fields.insert("executableDescription".into(), description.clone().into());
            let confirm = !item.unmet.is_empty();
            fields.insert(
                "verdict".into(),
                if confirm { "confirm" } else { "exact" }.into(),
            );
            fields.insert("supported".into(), SqlCell::Array(vec![description.into()]));
            fields.insert("omitted".into(), SqlCell::Array(Vec::new()));
            let reason = if confirm {
                &words.confirm
            } else {
                &words.complete
            };
            fields.insert("reason".into(), reason.as_str().into());
            Ok(Rendered {
                fulfillment: Some(SqlCell::Object(fields)),
                resolution: None,
            })
        }
        Prepared::DistanceNeeded => Ok(refused(
            "needs_clarification",
            words.distance_needed.as_str().into(),
        )),
        Prepared::InvocationRefused { outcome } => {
            let code = outcome.code.as_str();
            let reason = if code == "invalid-invocation" {
                let policy = &core
                    .state
                    .installed
                    .occurrence_rules
                    .value()
                    .response
                    .offers
                    .follow;
                let offset = core.state.installed.actor_response_limits.invocation.offset;
                format!(
                    "{}{}–{}{}{}{}",
                    words.outside_prefix,
                    policy.minimum_distance,
                    policy.maximum_distance,
                    words.outside_offsets,
                    offset,
                    words.outside_suffix
                )
                .into()
            } else {
                outcome.message.clone()
            };
            Ok(refused(
                if matches!(code, "ambiguous-destination" | "invalid-invocation") {
                    "needs_clarification"
                } else {
                    "blocked"
                },
                reason,
            ))
        }
        Prepared::PreviewRefused { outcome } => Ok(refused(
            if matches!(
                outcome.code.as_str(),
                "unsupported-body" | "unsupported" | "unsupported-capability"
            ) {
                "unsupported_capability"
            } else {
                "blocked"
            },
            outcome.message.clone(),
        )),
        _ => Err(ExecutionError::Invariant),
    }
}
