//! Actor-scoped choice discovery. A single pass per field supplies the exact
//! parent value alongside each choice; discovery never takes a companion's perspective.
use super::*;
use crate::worlds::base_outings::visit_agreements;

pub(crate) fn visit_choices(
    state: &SimulationState,
    actor: &str,
    form: &InstalledRequest,
    field: &str,
    parents: &IndexMap<String, SqlCell>,
    budget: &ByteBudget,
    mut emit: impl FnMut(&str, &JsText, Option<(&str, &str)>) -> Result<(), ExecutionError>,
) -> Result<(), ExecutionError> {
    let Some(policy) = state
        .installed
        .retained
        .social_offer_read
        .as_ref()
        .and_then(|s| s.cooperation.as_ref())
    else {
        return Ok(());
    };
    let kind = match form.id.as_str() {
        "base:cooperation-guide" => "guide",
        "base:cooperation-hunt" => "hunt",
        "base:cooperation-prepare" | "base:cooperation-carry" => "help",
        _ => return Ok(()),
    };
    if !policy.supports(kind) {
        return Ok(());
    }
    let parent = |key: &str| parents.get(key).and_then(SqlCell::as_str);
    let companion = parent("recipientId");
    match field {
        "agreement" => {
            let mut current = false;
            visit_agreements(state, actor, budget, |id, revision, other| {
                if companion.is_none_or(|value| value == other) {
                    current = true;
                    let key = crate::encoding::json_record(&(id, revision))
                        .map_err(|_| ExecutionError::Invariant)?;
                    emit(
                        &key,
                        &JsText::from("Revise current terms"),
                        Some(("recipientId", other)),
                    )?;
                }
                Ok(())
            })?;
            if !current || companion.is_none() {
                emit("new", &JsText::from("Propose a new agreement"), None)?;
            }
        }
        "offer" if form.id == "base:cooperation-carry" => {
            let own = crate::handover::ReceivedGifts::from_player(state, actor, budget)?;
            for offer in state.physical.gifts.for_actor(actor) {
                let [lot] = offer.offered.as_slice() else {
                    continue;
                };
                if offer.offerer_id != actor
                    || !offer.requested.is_empty()
                    || !companion.is_none_or(|other| other == offer.recipient_id)
                {
                    continue;
                }
                let Some(known) = own.find(&offer.id, offer.revision) else {
                    continue;
                };
                if !crate::handover::trade_offer_current(state, offer)
                    || state
                        .physical
                        .entities
                        .get(&lot.item_id)
                        .and_then(|e| e.item.as_ref())
                        .is_none_or(|item| {
                            item.quantity != lot.quantity || item.revision != lot.revision
                        })
                {
                    continue;
                }
                let key = crate::encoding::json_record(&(&offer.id, offer.revision))
                    .map_err(|_| ExecutionError::Invariant)?;
                emit(
                    &key,
                    &known.descriptions.offered[0].name,
                    Some(("recipientId", &offer.recipient_id)),
                )?;
            }
        }
        "recipeId" | "outputPort" if form.id == "base:cooperation-prepare" => {
            for pin in &policy.help_methods {
                let Some(method) = state.installed.retained.manufacture.get(&pin.id) else {
                    continue;
                };
                if &method.pin != pin
                    || !state
                        .learned_capabilities
                        .known_recipes(actor)
                        .contains(&pin.id)
                {
                    continue;
                }
                if field == "recipeId" {
                    emit(&pin.id, &method.name, None)?;
                } else if parent("recipeId").is_none_or(|id| id == pin.id) {
                    for product in &method.outputs {
                        emit(
                            &product.port,
                            &JsText::from(product.port.as_str()),
                            Some(("recipeId", &pin.id)),
                        )?;
                    }
                }
            }
        }
        "destinationId" => {
            if let Ok(places) = state.experience.known_places(actor) {
                for place in places.capsules() {
                    emit(&place.place_id, &place.label, None)?;
                }
            }
            if let Some(visible) =
                crate::ground_items::inspection::WorldStorage::inspected_selection(state, actor)
                && let Some(name) = visible.disclosed_name()
            {
                emit(&visible.container.id, &name.name, None)?;
            }
            if let Some(places) = state
                .physical
                .entities
                .get(actor)
                .and_then(|e| e.actor.as_ref())
                .and_then(|body| body.agency.places.as_ref())
            {
                for place in places {
                    if state
                        .physical
                        .entities
                        .get(&place.subject_id)
                        .is_some_and(|e| e.actor.is_none() && e.retirement.is_none())
                    {
                        emit(&place.subject_id, &place.label, None)?;
                    }
                }
            }
        }
        _ => {}
    }
    Ok(())
}
