//! The selected context action opens the existing browser's conversation
//! composer. The menu itself spends nothing and never submits speech.

use super::*;
use openlegend_simulation::{runtime::RuntimeError, text::JsText};
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
                |scope, _| -> Result<_, RuntimeError> {
                    let budget = game.host.budget();
                    let _workspace = budget.reserve(2048)?;
                    let references = tokens.scoped(scope).map_err(RuntimeError::application_refused)?;
                    let mut error = None;
                    let offered = session.with_player_gathering_offer(
                        &scope.account_id, &scope.actor_id,
                        |body| match references.contact(body.source_id, body.physical_life.unwrap_or(0), body.lease_id) {
                            Ok(reference) => reference == *for_menu,
                            Err(problem) => { error = Some(problem); false }
                        },
                        |offer| {
                            gathering(&for_menu, offer, game.construction_grants, budget)
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

fn gathering(
    selected: &str,
    offer: openlegend_simulation::runtime::RuntimeGatherOffer<'_>,
    construction_grants: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let _workspace = budget.reserve(
        4096 + 8 * (offer.name.storage_bytes() + offer.material.storage_bytes() + selected.len())
            + offer.label.map_or(0, |label| 8 * label.storage_bytes()),
    )?;
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct MenuCopy<'a> {
        name: &'a str,
        fallback_prefix: &'a str,
        menu_description: &'a str,
        menu_empty: &'a str,
        menu_keyword: &'a str,
    }
    static COPY: LazyLock<MenuCopy<'static>> = LazyLock::new(|| {
        serde_json::from_str(include_str!(
            "../../../../packages/domain/src/worlds/base/gathering-copy.json"
        ))
        .expect("authored gathering menu")
    });
    let label = offer
        .label
        .cloned()
        .unwrap_or_else(|| JsText::concat(&[&COPY.fallback_prefix.into(), offer.name]));
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Command<'a> {
        #[serde(rename = "type")]
        kind: &'static str,
        target_id: &'a str,
    }
    #[derive(Serialize)]
    struct Intent<'a> {
        kind: &'static str,
        command: Command<'a>,
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Action<'a> {
        id: String,
        label: JsText,
        category: &'static str,
        description: &'static str,
        keywords: [&'a JsText; 2],
        target_id: &'a str,
        enabled: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<&'static str>,
        intent: Intent<'a>,
    }
    #[derive(Serialize)]
    struct Catalogue<'a> {
        revision: u64,
        actions: [Action<'a>; 1],
        categories: [&'static str; 1],
    }
    #[derive(Serialize)]
    struct Menu<'a> {
        ok: bool,
        catalogue: Catalogue<'a>,
    }
    let keyword: JsText = COPY.menu_keyword.into();
    let action = Action {
        id: format!("gather-{selected}"),
        label,
        category: COPY.name,
        description: COPY.menu_description,
        keywords: [offer.material, &keyword],
        target_id: selected,
        enabled: offer.quantity != 0 && !construction_grants,
        reason: if construction_grants {
            Some(crate::player_command::CONSTRUCTION_GATHER_UNAVAILABLE)
        } else {
            (offer.quantity == 0).then_some(COPY.menu_empty)
        },
        intent: Intent {
            kind: "command",
            command: Command {
                kind: "gather",
                target_id: selected,
            },
        },
    };
    wire::encode(
        &Menu {
            ok: true,
            catalogue: Catalogue {
                revision: offer.sequence,
                actions: [action],
                categories: [COPY.name],
            },
        },
        b"",
        b"",
        budget,
    )
    .map_err(RuntimeError::application_refused)
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
