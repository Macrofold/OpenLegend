//! Borrow one permitted Trade panel cut. Live possessions belong to the
//! viewer; the other participant's terms are their original received record.
use super::*;
use crate::player_references::PlayerReferences;
use openlegend_simulation::{
    handover::{GiftDescription, GiftLot, GiftOperation, GiftRead},
    runtime::RuntimeError,
    text::JsText,
};
use serde_json::value::RawValue;
use std::sync::LazyLock;

pub(super) mod disclosures;

static LABELS: LazyLock<Box<RawValue>> = LazyLock::new(|| {
    RawValue::from_string(
        include_str!("../../../../packages/domain/src/worlds/base/handover-copy.json").to_owned(),
    )
    .expect("bundled trade labels")
});

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TradeRequest {
    person_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Lot<'a, Label = &'a JsText> {
    id: &'a str,
    name: &'a JsText,
    label: Label,
    description: &'a JsText,
    quantity: u64,
    revision: u64,
    placement_revision: u64,
    whole: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    contents_revision: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    capacity: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TradeView<'a> {
    maximum_lots: usize,
    gift_only: bool,
    scope: String,
    person_id: &'a str,
    person_name: &'a JsText,
    labels: &'a RawValue,
    own_lots: Vec<Lot<'a>>,
    known_lots: Vec<Lot<'a>>,
    offers: Vec<Offer<'a>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Offer<'a> {
    id: &'a str,
    revision: u64,
    incoming: bool,
    give: Vec<Lot<'a>>,
    receive: Vec<Lot<'a>>,
    expires_at: f64,
    actions: Vec<Action<'a>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Action<'a> {
    id: String,
    label: &'static str,
    enabled: bool,
    command: Reply<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Reply<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    handover_operation: GiftOperation,
    target_id: &'a str,
    offer_id: &'a str,
    expected_offer_revision: u64,
}

impl<'a, Label> Lot<'a, Label> {
    fn disclosed(
        lot: &'a GiftLot,
        name: &'a JsText,
        description: &'a JsText,
        label: Label,
    ) -> Self {
        Self {
            id: &lot.item_id,
            name,
            label,
            description,
            quantity: lot.quantity,
            revision: lot.revision,
            placement_revision: lot.placement_revision,
            whole: lot.whole,
            contents_revision: lot.contents_revision,
            capacity: lot.capacity,
        }
    }
}

fn term<'a>(lot: &'a GiftLot, description: &'a GiftDescription) -> Lot<'a> {
    Lot::disclosed(
        lot,
        &description.name,
        &description.description,
        &description.name,
    )
}

fn render(
    input: &TradeRequest,
    actor: &str,
    references: &PlayerReferences<'_>,
    can_act: bool,
    read: GiftRead<'_>,
    budget: &ByteBudget,
) -> Result<Response, RuntimeError> {
    #[derive(Deserialize)]
    struct ReplyLabels {
        accept: &'static str,
        decline: &'static str,
        withdraw: &'static str,
    }
    static REPLY_LABELS: LazyLock<ReplyLabels> =
        LazyLock::new(|| serde_json::from_str(LABELS.get()).expect("bundled trade labels"));
    const INCOMING: [GiftOperation; 2] = [GiftOperation::Accept, GiftOperation::Decline];
    const OUTGOING: [GiftOperation; 1] = [GiftOperation::Withdraw];
    static EMPTY: LazyLock<JsText> = LazyLock::new(JsText::default);
    let body = read.counterpart;
    let scope = references
        .trade_draft(
            body.subject,
            &input.person_id,
            body.physical_life.unwrap_or(0),
        )
        .map_err(RuntimeError::application_refused)?;
    let bytes = read
        .owned
        .len()
        .checked_mul(size_of::<Lot>())
        .and_then(|bytes| {
            read.offers.iter().try_fold(bytes, |bytes, row| {
                let known = row.disclosed;
                let lots = known
                    .offer
                    .offered
                    .len()
                    .checked_add(known.offer.requested.len())?;
                bytes
                    .checked_add(lots.checked_mul(2 * size_of::<Lot>())?)?
                    .checked_add(size_of::<Offer>() + 2 * size_of::<Action>() + 240)
            })
        })
        .ok_or(openlegend_simulation::host::CapacityError)?;
    let _projection = budget.reserve(bytes)?;
    let own_lots = read
        .owned
        .iter()
        .map(|lot| Lot {
            id: lot.item.id,
            name: &lot.item.named.name,
            label: &lot.item.named.name,
            description: lot.description.unwrap_or(&EMPTY),
            quantity: lot.item.available_quantity,
            revision: lot.item.revision,
            placement_revision: lot.item.placement_revision,
            whole: lot.whole,
            contents_revision: lot.contents_revision,
            capacity: lot
                .item
                .container
                .as_ref()
                .map(|container| container.capacity),
        })
        .collect();
    let known_lots = read
        .offers
        .iter()
        .flat_map(|row| {
            let known = row.disclosed;
            let (lots, descriptions) = if known.offer.recipient_id == actor {
                (&known.offer.offered, &known.descriptions.offered)
            } else {
                (&known.offer.requested, &known.descriptions.requested)
            };
            lots.iter()
                .zip(descriptions)
                .map(|(lot, description)| term(lot, description))
        })
        .collect();
    let offers = read
        .offers
        .iter()
        .map(|row| {
            let known = row.disclosed;
            let offer = &known.offer;
            let incoming = offer.recipient_id == actor;
            let operations: &[GiftOperation] = if incoming { &INCOMING } else { &OUTGOING };
            let offered = offer
                .offered
                .iter()
                .zip(&known.descriptions.offered)
                .map(|(lot, description)| term(lot, description))
                .collect();
            let requested = offer
                .requested
                .iter()
                .zip(&known.descriptions.requested)
                .map(|(lot, description)| term(lot, description))
                .collect();
            let (give, receive) = if incoming {
                (requested, offered)
            } else {
                (offered, requested)
            };
            Offer {
                id: &offer.id,
                revision: offer.revision,
                incoming,
                give,
                receive,
                expires_at: offer.expires_at,
                actions: operations
                    .iter()
                    .map(|operation| {
                        let (label, id) = match operation {
                            GiftOperation::Accept => (REPLY_LABELS.accept, "accept"),
                            GiftOperation::Decline => (REPLY_LABELS.decline, "decline"),
                            GiftOperation::Withdraw => (REPLY_LABELS.withdraw, "withdraw"),
                            GiftOperation::Offer | GiftOperation::Counter => {
                                unreachable!("a reply cannot propose terms")
                            }
                        };
                        Action {
                            id: format!("offer-{id}:{}:{}", offer.id, offer.revision),
                            label,
                            enabled: can_act
                                && (*operation != GiftOperation::Accept || row.can_accept),
                            command: Reply {
                                kind: "handover",
                                handover_operation: *operation,
                                target_id: &input.person_id,
                                offer_id: &offer.id,
                                expected_offer_revision: offer.revision,
                            },
                        }
                    })
                    .collect(),
            }
        })
        .collect();
    #[derive(Serialize)]
    struct Answer<'a> {
        ok: bool,
        trade: TradeView<'a>,
    }
    let view = Answer {
        ok: true,
        trade: TradeView {
            maximum_lots: openlegend_simulation::handover::trade_lot_limit(),
            gift_only: false,
            scope,
            person_id: &input.person_id,
            person_name: &body.name.name,
            labels: &LABELS,
            own_lots,
            known_lots,
            offers,
        },
    };
    let bytes = wire::encode(&view, b"", b"", budget).map_err(RuntimeError::application_refused)?;
    Ok(json_response(StatusCode::OK, bytes))
}

pub(super) async fn read(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let selected = match scope(&state.authority, &parts.headers, None).await {
        Ok(scope) => scope,
        Err(error) => return access_failure(error),
    };
    let (input, _storage): (TradeRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(response) => return response,
        };
    let missing = || {
        refusal(
            StatusCode::CONFLICT,
            "stale-contact",
            "Choose a person you can currently see.",
        )
    };
    if !crate::npc::valid_request_id(&input.person_id) {
        return missing();
    }
    match state
        .game
        .world
        .disclose_inventory_read(
            &state.authority,
            &selected,
            |session, scope, controlling| {
                let references = state
                    .references
                    .scoped(scope)
                    .map_err(RuntimeError::application_refused)?;
                let _references = state.game.host.budget().reserve(2048)?;
                let result = session.with_player_gift_trade(
                    &scope.account_id,
                    &scope.actor_id,
                    |body| {
                        references
                            .contact(
                                body.source_id,
                                body.physical_life.unwrap_or(0),
                                body.lease_id,
                            )
                            .is_ok_and(|contact| contact == input.person_id)
                    },
                    |read, budget| {
                        render(
                            &input,
                            &scope.actor_id,
                            &references,
                            controlling,
                            read,
                            budget,
                        )
                    },
                )?;
                Ok(result.unwrap_or_else(missing))
            },
        )
        .await
    {
        Ok(response) => response,
        Err(error) => failed(error),
    }
}
