//! Read one visible resource or person for the ordinary context menu. The
//! on-demand menu spends nothing and never starts an action.

use super::*;
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::CapacityError,
    runtime::{RuntimeError, RuntimeFishOffer, RuntimeGatherOffer, RuntimeResourceOffer},
    text::JsText,
};
use std::sync::LazyLock;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuWords {
    label_prefix: JsText,
    description_prefix: JsText,
    description_suffix: JsText,
    category: String,
    keywords: Vec<String>,
}

static CONVERSATION: LazyLock<MenuWords> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/conversation-menu.json"
    ))
    .expect("the shared conversation menu wording is a build input")
});

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Position {
    x: f64,
    y: f64,
    z: f64,
    surface_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MenuRequest {
    target_id: Option<String>,
    position: Option<Position>,
}

pub(super) async fn menu(State(state): State<PlayerRoutes>, request: Request) -> Response {
    let Ok(_slot) = state.capacity.try_acquire() else {
        return busy();
    };
    let (parts, body) = request.into_parts();
    let access = match scope(&state.authority, &parts.headers, None).await {
        Ok(access) => Arc::new(access),
        Err(error) => return access_failure(error),
    };
    let (input, custody): (MenuRequest, _) =
        match json(&parts.headers, body, state.game.host.budget()).await {
            Ok(value) => value,
            Err(response) => return response,
        };
    if input.position.is_some_and(|p| {
        ![p.x, p.y, p.z].iter().all(|v| v.is_finite())
            || !crate::npc::valid_request_id(&p.surface_id)
    }) {
        return access_failure(AccessError::Changed);
    }
    let Some(target) = input
        .target_id
        .filter(|id| crate::npc::valid_request_id(id))
    else {
        return refusal(
            StatusCode::BAD_REQUEST,
            "unsupported-action-context",
            "Choose a visible person to open a conversation.",
        );
    };
    let linked = Arc::new(target);
    let for_menu = linked.clone();
    let game = state.game.clone();
    let scoped = access.clone();
    let authority = state.authority.clone();
    let tokens = state.references.clone();
    let resource = state
        .game
        .world
        .capture(move |session| {
            Ok(authority.current(
                &scoped,
                Capability::Play,
                false,
                |scope, controls| -> Result<_, RuntimeError> {
                    let budget = game.host.budget();
                    let _workspace = budget.reserve(2048)?;
                    let references = tokens
                        .scoped(scope)
                        .map_err(RuntimeError::application_refused)?;
                    let mut error = None;
                    let offered = session.with_player_resource_offer(
                        &scope.account_id,
                        &scope.actor_id,
                        |body| match references.contact(
                            body.source_id,
                            body.physical_life.unwrap_or(0),
                            body.lease_id,
                        ) {
                            Ok(reference) => reference == *for_menu,
                            Err(problem) => {
                                error = Some(problem);
                                false
                            }
                        },
                        |offer| match offer {
                            RuntimeResourceOffer::Gather(offer) => {
                                gathering(&for_menu, offer, game.construction_grants, budget)
                            }
                            RuntimeResourceOffer::Fish(offer) => {
                                let available = if !controls {
                                    Some("Take control of your character to act here.")
                                } else if offer.paused {
                                    Some("Resume the world to act.")
                                } else {
                                    None
                                };
                                fishing(&for_menu, offer, available, budget)
                            }
                        },
                    )?;
                    if let Some(error) = error {
                        return Err(RuntimeError::application_refused(error));
                    }
                    Ok(offered)
                },
            ))
        })
        .await;
    match resource {
        Ok(Ok(Ok(Some(bytes)))) => return json_response(StatusCode::OK, bytes),
        Ok(Ok(Ok(None))) => {}
        Ok(Ok(Err(error))) => return failed(error.into()),
        Ok(Err(error)) => return access_failure(error),
        Err(error) => return failed(error),
    }
    let target = Arc::try_unwrap(linked).unwrap_or_else(|target| (*target).clone());
    match state
        .decisions
        .contact_menu(access, state.references.clone(), target, custody)
        .await
    {
        Ok(Some(bytes)) => json_response(StatusCode::OK, bytes),
        Ok(None) => access_failure(AccessError::Changed),
        Err(error) => failed(error),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceCommand<'a> {
    #[serde(rename = "type")]
    kind: &'static str,
    target_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum ResourceIntent<'a> {
    Command { command: ResourceCommand<'a> },
    Unavailable,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceAction<'a> {
    id: String,
    label: JsText,
    category: &'static str,
    description: &'a JsText,
    keywords: [&'a JsText; 2],
    target_id: &'a str,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    facts: Option<[(&'static str, &'a JsText); 1]>,
    intent: ResourceIntent<'a>,
}

fn resource_menu(
    revision: u64,
    actions: &[ResourceAction<'_>],
    category: &'static str,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    struct Catalogue<'a> {
        revision: u64,
        actions: &'a [ResourceAction<'a>],
        categories: [&'static str; 1],
    }
    #[derive(Serialize)]
    struct Menu<'a> {
        ok: bool,
        catalogue: Catalogue<'a>,
    }
    wire::encode(
        &Menu {
            ok: true,
            catalogue: Catalogue {
                revision,
                actions,
                categories: [category],
            },
        },
        b"",
        b"",
        budget,
    )
    .map_err(RuntimeError::application_refused)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GatherMenuCopy {
    name: &'static str,
    fallback_prefix: JsText,
    menu_description: JsText,
    menu_empty: JsText,
    menu_keyword: JsText,
}

static GATHER: LazyLock<GatherMenuCopy> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../packages/domain/src/worlds/base/gathering-copy.json"
    ))
    .expect("authored gathering menu")
});

fn gathering(
    selected: &str,
    offer: RuntimeGatherOffer<'_>,
    construction_grants: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let _workspace = budget.reserve(
        4096 + 8 * (offer.name.storage_bytes() + offer.material.storage_bytes() + selected.len())
            + offer.label.map_or(0, |label| 8 * label.storage_bytes()),
    )?;
    let label = offer
        .label
        .cloned()
        .unwrap_or_else(|| JsText::concat(&[&GATHER.fallback_prefix, offer.name]));
    let unavailable = construction_grants
        .then(|| JsText::from(crate::player_command::CONSTRUCTION_GATHER_UNAVAILABLE));
    let action = ResourceAction {
        id: format!("gather-{selected}"),
        label,
        category: GATHER.name,
        description: &GATHER.menu_description,
        keywords: [offer.material, &GATHER.menu_keyword],
        target_id: selected,
        enabled: offer.quantity != 0 && !construction_grants,
        reason: unavailable
            .as_ref()
            .or_else(|| (offer.quantity == 0).then_some(&GATHER.menu_empty)),
        facts: None,
        intent: ResourceIntent::Command {
            command: ResourceCommand {
                kind: "gather",
                target_id: selected,
                item_id: None,
            },
        },
    };
    resource_menu(offer.sequence, &[action], GATHER.name, budget)
}

fn fishing(
    selected: &str,
    offer: RuntimeFishOffer<'_>,
    unavailable: Option<&'static str>,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let _workspace = budget.reserve(2048)?;
    let supply = Some([("Supply", offer.supply)]);
    if offer.tools.is_empty() {
        return resource_menu(
            offer.sequence,
            &[ResourceAction {
                id: format!("fish-{selected}"),
                label: offer.available_text.clone(),
                category: GATHER.name,
                description: offer.description,
                keywords: [offer.name, offer.available_text],
                target_id: selected,
                enabled: false,
                reason: Some(offer.tool_required_text),
                facts: supply,
                intent: ResourceIntent::Unavailable,
            }],
            GATHER.name,
            budget,
        );
    }
    let bytes = offer.tools.iter().try_fold(0_usize, |total, tool| {
        offer
            .action_label
            .storage_bytes()
            .checked_add(tool.name.storage_bytes())
            .and_then(|bytes| bytes.checked_mul(6))
            .and_then(|bytes| bytes.checked_add(128 + std::mem::size_of::<ResourceAction<'_>>()))
            .and_then(|bytes| total.checked_add(bytes))
            .ok_or(CapacityError)
    })?;
    let _actions = budget.reserve(bytes)?;
    let mut actions = Vec::new();
    actions
        .try_reserve_exact(offer.tools.len())
        .map_err(|_| CapacityError)?;
    let unavailable = unavailable.map(JsText::from);
    let reason = unavailable
        .as_ref()
        .or_else(|| offer.exhausted.then_some(offer.supply));
    let space = JsText::from(" ");
    for tool in offer.tools {
        // A tuple digest disambiguates tools even when a name or ID contains a delimiter.
        let binding =
            json_record(&(selected, tool.id)).map_err(RuntimeError::application_refused)?;
        actions.push(ResourceAction {
            id: format!("fish-{}", sha256_hex(binding.as_bytes())),
            label: JsText::concat(&[offer.action_label, &space, tool.name]),
            category: GATHER.name,
            description: offer.description,
            keywords: [offer.name, tool.name],
            target_id: selected,
            enabled: reason.is_none(),
            reason,
            facts: supply,
            intent: ResourceIntent::Command {
                command: ResourceCommand {
                    kind: "fish",
                    target_id: selected,
                    item_id: Some(tool.id),
                },
            },
        });
    }
    resource_menu(offer.sequence, &actions, GATHER.name, budget)
}

pub(crate) fn conversation(
    revision: u64,
    selected: &str,
    name: &JsText,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Compose<'a> {
        kind: &'static str,
        mode: &'static str,
        npc_id: &'a str,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Action<'a> {
        id: String,
        label: JsText,
        category: &'a str,
        description: JsText,
        keywords: &'a [String],
        target_id: &'a str,
        enabled: bool,
        intent: Compose<'a>,
    }
    #[derive(Serialize)]
    struct Catalogue<'a> {
        revision: u64,
        actions: [Action<'a>; 1],
        categories: [&'a str; 1],
    }
    #[derive(Serialize)]
    struct Menu<'a> {
        ok: bool,
        catalogue: Catalogue<'a>,
    }
    let words = &*CONVERSATION;
    let _workspace = budget.reserve(2048 + 8 * name.storage_bytes() + selected.len())?;
    let label = JsText::concat(&[&words.label_prefix, name]);
    let description = JsText::concat(&[&words.description_prefix, name, &words.description_suffix]);
    let action = Action {
        id: format!("talk-{selected}"),
        label,
        category: &words.category,
        description,
        keywords: &words.keywords,
        target_id: selected,
        enabled: true,
        intent: Compose {
            kind: "compose",
            mode: "chat",
            npc_id: selected,
        },
    };
    wire::encode(
        &Menu {
            ok: true,
            catalogue: Catalogue {
                revision,
                actions: [action],
                categories: [&words.category],
            },
        },
        b"",
        b"",
        budget,
    )
    .map_err(RuntimeError::application_refused)
}
