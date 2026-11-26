//! Freeze a proposal at the proposer's actual observation. Each companion receives
//! only their own quarry description; accepting terms alone performs no physical work.
use crate::{
    execution::ExecutionError, host::ByteBudget, outings::travel, records::SqlCell,
    simulation::SimulationState, worlds::InstalledPersonalNameReader,
};
use serde_json::{Value, json};

fn observer<'a>(
    state: &'a SimulationState,
    actor: &'a str,
) -> Result<InstalledPersonalNameReader<'a>, ExecutionError> {
    Ok(InstalledPersonalNameReader::prepare(
        &state.physical,
        &state.reception,
        &state.installed,
        &state.experience,
        actor,
    )?)
}

fn place(
    state: &SimulationState,
    actor: &str,
    id: &str,
    budget: &ByteBudget,
) -> Result<Option<Value>, ExecutionError> {
    use crate::{
        ground_items::inspection::WorldStorage,
        reception::{ObservedLocation, ObservedPoint},
    };
    let now = state.physical.header.sim_time;
    let source = |at: f64, episode: Option<&String>| json!({"subjectId":id,"observedAt":at,"episode":episode});
    if let Ok(known) = state.experience.known_places(actor) {
        if let Some(place) = known.capsules().find(|place| place.place_id == id)
            && let ObservedLocation::Point {
                point: ObservedPoint::Surface(point),
                ..
            } = &place.location
            && let Some(event_id) = &place.source_event_id
            && let Some(revision) = place_revision(state, actor, place, event_id, budget)?
        {
            return Ok(Some(
                json!({"point":point,"label":place.label,"source":{"subjectId":id,"observedAt":place.observed_at,"episode":null,"evidenceId":event_id,"placeRevision":revision}}),
            ));
        }
    }
    let sight = observer(state, actor)?;
    let episode = state
        .reception
        .perception_episodes
        .as_ref()
        .and_then(|v| v.get(actor))
        .and_then(|v| v.get(id));
    let current_source = || source(now, episode);
    let observed = state.physical.entities.get(id);
    if let Some(page) = WorldStorage::inspected_selection(state, actor)
        && page.container.id == id
        && let Some(inspection) = page.inspection(budget)?
        && let Some(point) = page.root.supported_position()
        && page.root.actor.is_none()
    {
        let Some(anchor) = travel::stationary_placement(page.root)? else {
            return Ok(None);
        };
        let placement = crate::encoding::json_record(&page.container.placement)
            .map_err(|_| ExecutionError::Invariant)?;
        return Ok(Some(
            json!({"point":point,"label":inspection.container_name.name,"entityId":id,"placement":placement,
            "anchor":{"entityId":page.root.id,"placement":anchor},"source":current_source()}),
        ));
    }
    if let Some(entity) = observed
        && entity.actor.is_none()
        && entity.retirement.is_none()
    {
        if sight.current_body_grant(id)?.is_some()
            && let Some(point) = entity.supported_position()
            && let Some(placement) = travel::stationary_placement(entity)?
        {
            return Ok(Some(
                json!({"point":point,"label":sight.observer_name(id)?.name.to_owned(),"entityId":id,"placement":placement,"source":current_source()}),
            ));
        }
        if let Some(remembered) = state
            .physical
            .entities
            .get(actor)
            .and_then(|e| e.actor.as_ref())
            .and_then(|b| b.agency.places.as_ref())
            .and_then(|places| places.iter().find(|p| p.subject_id == id))
        {
            return Ok(Some(
                json!({"point":remembered.point,"label":remembered.label,"source":source(remembered.at,remembered.episode.as_ref())}),
            ));
        }
    }
    Ok(None)
}

/// Read the revision from the retained personal observation. A changed public
/// place record cannot supply a revision the character has never seen.
fn place_revision(
    state: &SimulationState,
    actor: &str,
    place: &crate::experience::KnownPlaceCapsule,
    event_id: &str,
    budget: &ByteBudget,
) -> Result<Option<u64>, ExecutionError> {
    use crate::reception::EncounterExposure;
    if let Ok(event) = state.occurrences.original(event_id)
        && let Some(EncounterExposure::Place { id, revision, .. }) = &event.event().exposure
    {
        return Ok((id == &place.place_id).then_some(*revision));
    }
    let Some(own) = &place.personal_source else {
        return Ok(None);
    };
    let Some(history) = state.experience.optional_collection(actor, own.kind)? else {
        return Ok(None);
    };
    let Some(row) = history
        .resident_record(&own.id)
        .filter(|r| &r.header().reference == own)
    else {
        return Ok(None);
    };
    let _reading = budget.reserve(crate::experience::encoded_body_bound(row.payload())?)?;
    #[derive(serde::Deserialize)]
    struct Source {
        exposure: Option<EncounterExposure>,
    }
    let source: Source =
        serde_json::from_str(row.payload()).map_err(|_| ExecutionError::InvalidCheckpoint)?;
    Ok(match source.exposure {
        Some(EncounterExposure::Place { id, revision, .. }) if id == place.place_id => {
            Some(revision)
        }
        _ => None,
    })
}

pub(crate) fn terms(
    state: &SimulationState,
    actor: &str,
    other: &str,
    args: &SqlCell,
    budget: &ByteBudget,
) -> Result<Option<Value>, ExecutionError> {
    let Some(policy) = state
        .installed
        .retained
        .social_offer_read
        .as_ref()
        .and_then(|v| v.cooperation.as_ref())
    else {
        return Ok(None);
    };
    let kind = args
        .get("cooperationKind")
        .and_then(SqlCell::as_str)
        .unwrap_or_default();
    if !policy.supports(kind) {
        return Ok(None);
    }
    let destination = |data: &SqlCell| match data.get("destinationId").and_then(SqlCell::as_str) {
        Some(id) => place(state, actor, id, budget),
        None => Ok(None),
    };
    match kind {
        "guide" => Ok(destination(args)?
            .map(|destination| json!({"purpose":"guide","destination":destination}))),
        "hunt" => {
            let Some(id) = args.get("quarryId").and_then(SqlCell::as_str) else {
                return Ok(None);
            };
            let Some(quarry) = state
                .physical
                .entities
                .get(id)
                .filter(|e| e.animal.is_some() && e.actor.as_ref().is_some_and(|b| b.alive))
            else {
                return Ok(None);
            };
            let Some(point) = destination(args)? else {
                return Ok(None);
            };
            let mut labels = serde_json::Map::new();
            let mut episodes = serde_json::Map::new();
            for person in [actor, other] {
                let read = observer(state, person)?;
                if read.current_body_grant(id)?.is_none() {
                    return Ok(None);
                }
                labels.insert(
                    person.into(),
                    json!(read.observer_name(id)?.name.to_owned()),
                );
                let episode = state
                    .reception
                    .perception_episodes
                    .as_ref()
                    .and_then(|v| v.get(person))
                    .and_then(|v| v.get(id));
                episodes.insert(person.into(), json!(episode));
            }
            Ok(Some(
                json!({"purpose":"hunt","quarry":{"id":id,"life":quarry.physical_life().unwrap_or(0),"labels":labels,"encounters":episodes},"meetingPlace":point}),
            ))
        }
        "help" => {
            let Some(task) = args.get("task") else {
                return Ok(None);
            };
            match task.get("kind").and_then(SqlCell::as_str) {
                Some("prepare") => {
                    let Some(recipe) = task.get("recipeId").and_then(SqlCell::as_str) else {
                        return Ok(None);
                    };
                    let Some(quantity) = task
                        .get("quantity")
                        .and_then(SqlCell::as_u64)
                        .filter(|v| *v > 0 && *v <= crate::identity::MAX_SAFE_INTEGER)
                    else {
                        return Ok(None);
                    };
                    let Some(method) = state
                        .installed
                        .retained
                        .manufacture
                        .get(recipe)
                        .filter(|method| policy.help_methods.contains(&method.pin))
                    else {
                        return Ok(None);
                    };
                    if !state
                        .learned_capabilities
                        .known_recipes(actor)
                        .iter()
                        .any(|r| r == recipe)
                    {
                        return Ok(None);
                    }
                    let Some(output) = method.outputs.iter().find(|o| {
                        Some(o.port.as_str()) == task.get("outputPort").and_then(SqlCell::as_str)
                    }) else {
                        return Ok(None);
                    };
                    let Some(product) = state.installed.retained.items.get(&output.definition.id)
                    else {
                        return Ok(None);
                    };
                    Ok(Some(
                        json!({"purpose":"help","task":{"kind":"prepare","helperId":other,"recipe":method.pin,"recipeLabel":method.name,"outputLabel":product.named.name,"output":{"port":output.port,"definition":output.definition},"quantity":quantity,"unit":"item-count"}}),
                    ))
                }
                Some("carry") => {
                    let Some(id) = task.get("offerId").and_then(SqlCell::as_str) else {
                        return Ok(None);
                    };
                    let Some(revision) = task.get("offerRevision").and_then(SqlCell::as_u64) else {
                        return Ok(None);
                    };
                    let known = crate::handover::ReceivedGifts::from_player(state, actor, budget)?;
                    let Some(offer) = state.physical.gifts.get(id) else {
                        return Ok(None);
                    };
                    let Some(receipt) = known.find(id, revision) else {
                        return Ok(None);
                    };
                    let [lot] = offer.offered.as_slice() else {
                        return Ok(None);
                    };
                    if offer.revision != revision
                        || offer.offerer_id != actor
                        || offer.recipient_id != other
                        || !offer.requested.is_empty()
                        || offer.expires_at <= state.physical.header.sim_time
                        || !crate::handover::trade_offer_current(state, offer)
                        || state
                            .physical
                            .entities
                            .get(&lot.item_id)
                            .and_then(|e| e.item.as_ref())
                            .is_none_or(|v| {
                                v.quantity != lot.quantity || v.revision != lot.revision
                            })
                    {
                        return Ok(None);
                    }
                    let Some(point) = destination(task)? else {
                        return Ok(None);
                    };
                    Ok(Some(
                        json!({"purpose":"help","task":{"kind":"carry","helperId":other,"offerId":id,"offerRevision":revision,"itemId":lot.item_id,"itemRevision":lot.revision,"definition":lot.definition_pin,"quantity":lot.quantity,"itemLabel":receipt.descriptions.offered[0].name,"destination":point}}),
                    ))
                }
                _ => Ok(None),
            }
        }
        _ => Ok(None),
    }
}

/// Recheck the exact selected policy, physical lives, fixed anchors and recipe
/// versions. A remembered unanchored coordinate stays testimony.
pub(crate) fn terms_current(
    state: &SimulationState,
    row: &SqlCell,
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    let text = |v: &SqlCell, k: &str| v.get(k).and_then(SqlCell::as_str).map(str::to_owned);
    let Some(policy) = &state.installed.retained.social_offer_read else {
        return Ok(false);
    };
    let Some(law) = &policy.cooperation else {
        return Ok(false);
    };
    let Some(pin) = row.get("definition") else {
        return Ok(false);
    };
    if pin.get("id").and_then(SqlCell::as_str) != Some(&policy.id)
        || pin.get("version").and_then(SqlCell::as_u64) != Some(policy.version)
    {
        return Ok(false);
    }
    let Some(terms) = row.get("terms") else {
        return Ok(false);
    };
    let Some(family) = terms.get("purpose").and_then(SqlCell::as_str) else {
        return Ok(false);
    };
    if !law.supports(family) {
        return Ok(false);
    }
    let destination = match family {
        "guide" => terms.get("destination"),
        "hunt" => {
            let Some(quarry) = terms.get("quarry") else {
                return Ok(false);
            };
            let valid = quarry
                .get("id")
                .and_then(SqlCell::as_str)
                .and_then(|id| state.physical.entities.get(id))
                .is_some_and(|body| {
                    body.animal.is_some()
                        && body.actor.as_ref().is_some_and(|a| a.alive)
                        && body.physical_life() == quarry.get("life").and_then(SqlCell::as_u64)
                });
            if !valid {
                return Ok(false);
            }
            terms.get("meetingPlace")
        }
        "help" => {
            let Some(task) = terms.get("task") else {
                return Ok(false);
            };
            match task.get("kind").and_then(SqlCell::as_str) {
                Some("prepare") => {
                    let Some(pin) = task.get("recipe") else {
                        return Ok(false);
                    };
                    let Some(recipe) = pin
                        .get("id")
                        .and_then(SqlCell::as_str)
                        .and_then(|id| state.installed.retained.manufacture.get(id))
                    else {
                        return Ok(false);
                    };
                    let Some(output) = task.get("output") else {
                        return Ok(false);
                    };
                    let matches_pin = |raw: &SqlCell, pin: &crate::values::DefinitionPin| {
                        raw.get("id").and_then(SqlCell::as_str) == Some(&pin.id)
                            && raw.get("version").and_then(SqlCell::as_u64) == Some(pin.version)
                            && raw.get("digest").and_then(SqlCell::as_str)
                                == Some(pin.digest.as_str())
                    };
                    return Ok(matches_pin(pin, &recipe.pin)
                        && law.help_methods.contains(&recipe.pin)
                        && recipe.outputs.iter().any(|port| {
                            output.get("port").and_then(SqlCell::as_str) == Some(&port.port)
                                && output
                                    .get("definition")
                                    .is_some_and(|value| matches_pin(value, &port.definition))
                        }));
                }
                Some("carry") => task.get("destination"),
                _ => return Ok(false),
            }
        }
        _ => return Ok(false),
    };
    let Some(dest) = destination else {
        return Ok(false);
    };
    let Some(source) = dest.get("source") else {
        return Ok(false);
    };
    if let Some(revision) = source.get("placeRevision").and_then(SqlCell::as_u64) {
        return Ok(source
            .get("subjectId")
            .and_then(SqlCell::as_str)
            .and_then(|id| state.installed.retained.places_read.get(id))
            .is_some_and(|place| place.revision == revision));
    }
    let Some(id) = dest.get("entityId").and_then(SqlCell::as_str) else {
        return Ok(true);
    };
    let Some(entity) = state
        .physical
        .entities
        .get(id)
        .filter(|e| e.actor.is_none() && e.retirement.is_none())
    else {
        return Ok(false);
    };
    let Some(expected) = dest.get("placement").and_then(SqlCell::as_str) else {
        return Ok(false);
    };
    let _work = budget.reserve(
        expected
            .len()
            .checked_mul(2)
            .and_then(|n| n.checked_add(1024))
            .ok_or(ExecutionError::Capacity)?,
    )?;
    if crate::encoding::json_record(&entity.placement).map_err(|_| ExecutionError::Invariant)?
        != expected
    {
        return Ok(false);
    }
    if let Some(anchor) = dest.get("anchor") {
        let Some(id) = text(anchor, "entityId") else {
            return Ok(false);
        };
        let root = std::iter::successors(Some(entity), |body| {
            crate::install::inventory_parent(body).and_then(|p| state.physical.entities.get(p))
        })
        .take(crate::install::inventory_ancestor_limit())
        .last();
        let Some(root) =
            root.filter(|body| body.id == id && body.actor.is_none() && body.retirement.is_none())
        else {
            return Ok(false);
        };
        return Ok(travel::stationary_placement(root)?.as_deref()
            == anchor.get("placement").and_then(SqlCell::as_str));
    }
    Ok(true)
}
