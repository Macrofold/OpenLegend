//! Format a permitted native lesson choice around the signed target reference.
use super::*;
use openlegend_simulation::{commands::CoachingOperation, runtime::RuntimeCoachingOffer};
pub(super) fn choice(
    target: &str,
    o: RuntimeCoachingOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<resources::Batch, RuntimeError> {
    let op = match o.operation {
        CoachingOperation::Request => "request",
        CoachingOperation::Accept => "accept",
        CoachingOperation::Decline => "decline",
        CoachingOperation::Withdraw => "withdraw",
        CoachingOperation::Feedback => "feedback",
    };
    let reason = if !controlling {
        Some(TAKE_CONTROL)
    } else if o.paused {
        Some(RESUME_WORLD)
    } else {
        None
    };
    let bytes = [
        o.label.storage_bytes(),
        o.description.storage_bytes(),
        target.len(),
        o.attribute.len(),
        o.episode.map_or(0, str::len),
        reason.map_or(0, str::len),
        80,
    ]
    .into_iter()
    .try_fold(0usize, usize::checked_add)
    .and_then(|n| n.checked_mul(3))
    .ok_or(CapacityError)?;
    let mut batch = resources::Batch::prepare(practice::CATEGORY, 1, bytes, budget)?;
    batch.choices.push(resources::Choice {
        id: format!(
            "coaching-{op}:{}:{target}",
            o.episode.unwrap_or(o.attribute)
        ),
        label: o.label.clone(),
        description: o.description.clone(),
        category: practice::CATEGORY.into(),
        keywords: [o.label, o.description],
        target_id: target.into(),
        item_id: None,
        pickup_limit: None,
        enabled: reason.is_none(),
        reason: reason.map(JsText::from),
        facts: None,
        intent: resources::Intent::Coaching {
            command: Command {
                kind: "coaching",
                coaching_operation: o.operation,
                target_id: (!o.operation.ends()).then(|| target.into()),
                attribute_id: o.attribute.into(),
                episode_id: o.episode.map(str::to_owned),
            },
        },
    });
    Ok(batch)
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Command {
    #[serde(rename = "type")]
    kind: &'static str,
    coaching_operation: CoachingOperation,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<String>,
    attribute_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    episode_id: Option<String>,
}
