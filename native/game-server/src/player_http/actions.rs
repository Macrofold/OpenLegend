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
