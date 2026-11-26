//! Preview the installed cast once per perceived source, then give each exact
//! accessible tool its own choice. Preview never samples or consumes stock.
use super::*;
use openlegend_simulation::runtime::RuntimeFishOffer;
use openlegend_simulation::text::TextRef;
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    geometry::{GeometryAnswers, GeometryQueries},
};
use resources::{Batch, Choice, Command, Intent};

pub(super) fn render(
    target: &str,
    offer: &RuntimeFishOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
    answer: impl FnOnce(&GeometryQueries) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
) -> Result<Bytes, RuntimeError> {
    choices(target, offer, controlling, budget, answer)?.render(offer.sequence, budget)
}

pub(super) fn choices(
    target: &str,
    offer: &RuntimeFishOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
    answer: impl FnOnce(&GeometryQueries) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
) -> Result<Batch, RuntimeError> {
    let unavailable = if !controlling {
        Some(TAKE_CONTROL)
    } else if offer.paused {
        Some(RESUME_WORLD)
    } else if !offer.tools.is_empty() && !offer.exhausted {
        offer.geometry_problem(answer)?
    } else {
        None
    };
    let reason = if offer.tools.is_empty() {
        Some(TextRef::from(offer.tool_required_text))
    } else if let Some(unavailable) = unavailable {
        Some(TextRef::from(unavailable))
    } else {
        offer.exhausted.then_some(TextRef::from(offer.supply))
    };
    let common = [
        offer.name.storage_bytes(),
        offer.description.storage_bytes(),
        offer.supply.storage_bytes(),
        reason.map_or(0, TextRef::storage_bytes),
        target.len().checked_mul(2).ok_or(CapacityError)?,
        GATHER.name.len(),
        128,
    ]
    .into_iter()
    .try_fold(0usize, usize::checked_add)
    .ok_or(CapacityError)?;
    let bytes = if offer.tools.is_empty() {
        common
            .checked_add(
                offer
                    .available_text
                    .storage_bytes()
                    .checked_mul(2)
                    .ok_or(CapacityError)?,
            )
            .ok_or(CapacityError)?
    } else {
        offer
            .tools
            .iter()
            .try_fold(0usize, |sum, tool| {
                sum.checked_add(common)?
                    .checked_add(offer.action_label.storage_bytes().checked_mul(12)?)?
                    .checked_add(tool.name.storage_bytes().checked_mul(13)?)?
                    .checked_add(tool.id.len())
            })
            .ok_or(CapacityError)?
    };
    let count = offer.tools.len().max(1);
    let mut batch = Batch::prepare(GATHER.name, count, bytes, budget)?;
    let make = |id, label, tool: &JsText, intent| Choice {
        id,
        label,
        category: GATHER.name.to_owned(),
        description: offer.description.clone(),
        keywords: [offer.name.clone(), tool.clone()],
        target_id: target.to_owned(),
        enabled: reason.is_none(),
        reason: reason.map(TextRef::to_owned),
        facts: Some([("Supply", offer.supply.clone())]),
        item_id: None,
        pickup_limit: None,
        intent,
    };
    if offer.tools.is_empty() {
        batch.choices.push(make(
            format!("fish-{target}"),
            offer.available_text.clone(),
            offer.available_text,
            Intent::Unavailable,
        ));
        return Ok(batch);
    }
    let space = JsText::from(" ");
    for tool in offer.tools {
        // A tuple digest disambiguates tools even if an ID contains a separator.
        let json_bytes = target
            .len()
            .checked_add(tool.id.len())
            .and_then(|bytes| bytes.checked_mul(12))
            .and_then(|bytes| bytes.checked_add(128))
            .ok_or(CapacityError)?;
        let _digest_work = budget.reserve(json_bytes)?;
        let fields = (target, tool.id);
        let digest = json_record(&fields).map_err(RuntimeError::application_refused)?;
        batch.choices.push(make(
            format!("fish-{}", sha256_hex(digest.as_bytes())),
            JsText::concat(&[offer.action_label, &space, tool.name]),
            tool.name,
            Intent::Command {
                command: Command {
                    kind: "fish",
                    target_id: target.to_owned(),
                    item_id: Some(tool.id.to_owned()),
                    ammunition_id: None,
                },
            },
        ));
    }
    Ok(batch)
}
