//! Read one visible resource or person for the ordinary context menu. The
//! on-demand menu spends nothing and never starts an action.

use super::*;
use crate::{
    authority::RequestScope,
    player_references::{PlayerReferences, PrimaryActionSelection, ResolvedContact},
};
use openlegend_simulation::{
    encoding::{json_record, sha256_hex},
    host::CapacityError,
    runtime::{
        NativeWorldSession, RuntimeError, RuntimeFishOffer, RuntimeGatherOffer,
        RuntimeResourceOffer,
    },
    text::JsText,
};
use std::sync::LazyLock;
mod preparation;
mod pickup;
mod practice;
mod manufacture;
mod status;
mod fire;

const TAKE_CONTROL: &str = "Take control of your character to act here.";
const RESUME_WORLD: &str = "Resume the world to act.";

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
    #[serde(default)]
    catalogue: bool,
    target_id: Option<String>,
    item_id: Option<String>,
    // The inventory picker identifies a display group and its available amount.
    // Exact one-item actions use only the selected lot's current native state.
    #[serde(rename = "inventoryGroup")]
    _inventory_group: Option<String>,
    #[serde(rename = "quantity")]
    _quantity: Option<f64>,
    recipe_id: Option<String>,
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
    let target = input
        .target_id
        .filter(|id| crate::npc::valid_request_id(id));
    let item = input.item_id.filter(|id| crate::npc::valid_request_id(id));
    let recipe = input.recipe_id.filter(|id| crate::npc::valid_request_id(id));
    if recipe.is_some() && (target.is_some() || item.is_some()) {
        return access_failure(AccessError::Changed);
    }
    if !input.catalogue && target.is_none() && item.is_none() && recipe.is_none() {
        return refusal(
            StatusCode::BAD_REQUEST,
            "unsupported-action-context",
            "Choose something you can see to find its actions.",
        );
    }
    let linked = Arc::new(target);
    let for_menu = linked.clone();
    let game = state.game.clone();
    let scoped = access.clone();
    let catalogue = input.catalogue;
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
                    let own_status = for_menu.as_deref() == Some(scope.actor_id.as_str());
                    if item.is_none()
                        && recipe.is_none()
                        && (own_status || catalogue && for_menu.is_none())
                    {
                        let references = tokens.scoped(scope).map_err(RuntimeError::application_refused)?;
                        return session.with_player_status_menu(
                            &scope.account_id,
                            &scope.actor_id,
                            |body| references.contact(body.source_id, body.physical_life.unwrap_or(0), body.lease_id)
                                .map_err(RuntimeError::application_refused),
                            |menu| status::render(menu, controls, budget),
                        ).map(Some);
                    }
                    if let Some(recipe) = recipe.as_deref() {
                        return session.with_player_manufacture_offer(
                            &scope.account_id, &scope.actor_id, recipe,
                            |offer| manufacture::render(recipe, offer, controls, budget),
                        );
                    }
                    let references = tokens
                        .scoped(scope)
                        .map_err(RuntimeError::application_refused)?;
                    if let Some(item) = item.as_deref() {
                        return session.with_player_food_menu(
                            &scope.account_id,
                            &scope.actor_id,
                            Some(item),
                            |body| preparation::heat_contact(&references, body, for_menu.as_deref()),
                            |queries| game.spatial.compute(queries, budget).map(|answer| answer.into_parts())
                                .map_err(RuntimeError::application_refused),
                            |menu| preparation::render(menu, controls, Some(item), budget),
                        );
                    }
                    let selected = for_menu.as_deref().ok_or_else(|| {
                        RuntimeError::application_refused("missing selected menu target")
                    })?;
                    let offered = with_selected_resource(
                        session, scope, &references, selected,
                        |offer| match offer {
                            RuntimeResourceOffer::Gather(offer) => {
                                gathering(selected, &offer, &references, controls, budget)
                            }
                            RuntimeResourceOffer::Pickup(offer) => pickup::render(selected, offer, controls, budget),
                            RuntimeResourceOffer::Practice(offer) => {
                                practice::render(selected, offer, controls, budget)
                            }
                            RuntimeResourceOffer::Fish(offer) => {
                                let available = if !controls {
                                    Some(TAKE_CONTROL)
                                } else if offer.paused {
                                    Some(RESUME_WORLD)
                                } else if !offer.tools.is_empty() && !offer.exhausted {
                                    offer.geometry_problem(|queries| {
                                        game.spatial
                                            .compute(queries, budget)
                                            .map(|answer| answer.into_parts())
                                            .map_err(RuntimeError::application_refused)
                                    })?
                                } else {
                                    None
                                };
                                fishing(selected, &offer, available, budget)
                            }
                        },
                    )?;
                    if offered.is_some() {
                        return Ok(offered);
                    }
                    session.with_player_food_menu(
                        &scope.account_id,
                        &scope.actor_id,
                        None,
                        |body| preparation::heat_contact(&references, body, Some(selected)),
                        |queries| game.spatial.compute(queries, budget).map(|answer| answer.into_parts())
                            .map_err(RuntimeError::application_refused),
                        |menu| preparation::render(menu, controls, None, budget),
                    )
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
    let Some(target) = target else {
        return access_failure(AccessError::Changed);
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

/// Visit the permitted player contacts and prepare the matching resource offer
/// under its disclosure lease. Callers retain only independently funded data.
fn with_selected_resource<T>(
    session: &NativeWorldSession,
    scope: &RequestScope,
    references: &PlayerReferences<'_>,
    selected: &str,
    use_offer: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
) -> Result<Option<T>, RuntimeError> {
    let mut error = None;
    let offered = session.with_player_resource_offer(
        &scope.account_id,
        &scope.actor_id,
        |body| match references.contact(
            body.source_id,
            body.physical_life.unwrap_or(0),
            body.lease_id,
        ) {
            Ok(reference) => reference == selected,
            Err(problem) => {
                error = Some(problem);
                false
            }
        },
        use_offer,
    )?;
    if let Some(error) = error {
        return Err(RuntimeError::application_refused(error));
    }
    Ok(offered)
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

fn resource_menu<T: Serialize>(
    revision: u64,
    actions: &[T],
    category: &str,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    resource_menu_categories(revision, actions, &[category], budget)
}

fn resource_menu_categories<T: Serialize>(
    revision: u64,
    actions: &[T],
    categories: &[&str],
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    resource_menu_selection(revision, actions, categories, None, budget)
}

fn resource_menu_selection<T: Serialize>(
    revision: u64,
    actions: &[T],
    categories: &[&str],
    primary_action: Option<PrimaryActionSelection<&str>>,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Catalogue<'a, T> {
        revision: u64,
        actions: &'a [T],
        categories: &'a [&'a str],
        #[serde(skip_serializing_if = "Option::is_none")]
        default_action_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        primary_action: Option<PrimaryActionSelection<&'a str>>,
    }
    #[derive(Serialize)]
    struct Menu<'a, T> {
        ok: bool,
        catalogue: Catalogue<'a, T>,
    }
    wire::encode(
        &Menu {
            ok: true,
            catalogue: Catalogue {
                revision,
                actions,
                categories,
                default_action_id: primary_action.as_ref().map(|selection| selection.action_id),
                primary_action,
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
    offer: &RuntimeGatherOffer<'_>,
    references: &PlayerReferences<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    static TAKE_CONTROL_TEXT: LazyLock<JsText> = LazyLock::new(|| JsText::from(TAKE_CONTROL));
    static RESUME_WORLD_TEXT: LazyLock<JsText> = LazyLock::new(|| JsText::from(RESUME_WORLD));
    let reason = if !controlling {
        Some(&*TAKE_CONTROL_TEXT)
    } else if offer.paused {
        Some(&*RESUME_WORLD_TEXT)
    } else {
        None
    };
    let (action, reference, _workspace) = gather_choice(selected, offer, references, reason, budget)?;
    resource_menu_selection(
        offer.sequence,
        std::slice::from_ref(&action),
        &[GATHER.name],
        Some(PrimaryActionSelection {
            target_id: selected,
            action_id: &action.id,
            reference: &reference,
        }),
        budget,
    )
}

fn gather_choice<'a>(
    selected: &'a str,
    offer: &RuntimeGatherOffer<'a>,
    references: &PlayerReferences<'_>,
    reason: Option<&'static JsText>,
    budget: &ByteBudget,
) -> Result<(ResourceAction<'a>, String, ByteReservation), RuntimeError> {
    let workspace = budget.reserve(
        4096 + 8 * (offer.name.storage_bytes() + offer.material.storage_bytes() + selected.len())
            + offer.label.map_or(0, |label| 8 * label.storage_bytes()),
    )?;
    let label = offer
        .label
        .cloned()
        .unwrap_or_else(|| JsText::concat(&[&GATHER.fallback_prefix, offer.name]));
    let reason = reason.or_else(|| (offer.quantity == 0).then_some(&GATHER.menu_empty));
    let action = ResourceAction {
        id: format!("gather-{selected}"),
        label,
        category: GATHER.name,
        description: &GATHER.menu_description,
        keywords: [offer.material, &GATHER.menu_keyword],
        target_id: selected,
        enabled: reason.is_none(),
        reason,
        facts: None,
        intent: ResourceIntent::Command {
            command: ResourceCommand {
                kind: "gather",
                target_id: selected,
                item_id: None,
            },
        },
    };
    // Exact contact, installed material and authored yield define this choice.
    // Unrelated accepted updates and remaining stock above zero leave it usable.
    let reference = references
        .primary_action(&(
            offer.target,
            offer.actor_life,
            offer.material_pin,
            offer.bare_hand_quantity,
            &action,
        ))
        .map_err(RuntimeError::application_refused)?;
    Ok((action, reference, workspace))
}

pub(crate) enum GatherSelection {
    Current(ResolvedContact),
    Unavailable(&'static str),
    Stale,
}

/// Re-prepare just the exact resource choice at command admission. No menu
/// packet is encoded. The caller already checked control and pause in this
/// turn. The returned source ID keeps its own allocation.
pub(crate) fn fresh_gather_selection(
    session: &NativeWorldSession,
    scope: &RequestScope,
    issuer: &ReferenceIssuer,
    requested: &PrimaryActionSelection<String>,
    budget: &ByteBudget,
) -> Result<GatherSelection, RuntimeError> {
    let _workspace = budget.reserve(2048)?;
    let references = issuer
        .scoped(scope)
        .map_err(RuntimeError::application_refused)?;
    let result =
        with_selected_resource(session, scope, &references, &requested.target_id, |offer| {
            let RuntimeResourceOffer::Gather(offer) = offer else {
                return Ok(GatherSelection::Stale);
            };
            let (action, reference, _workspace) =
                gather_choice(&requested.target_id, &offer, &references, None, budget)?;
            if action.id != requested.action_id || reference != requested.reference {
                return Ok(GatherSelection::Stale);
            }
            if !action.enabled {
                return Ok(GatherSelection::Unavailable(
                    GATHER
                        .menu_empty
                        .as_unicode()
                        .unwrap_or("This action is unavailable now."),
                ));
            }
            ResolvedContact::new(offer.target, None, budget).map(GatherSelection::Current)
        })?;
    Ok(result.unwrap_or(GatherSelection::Stale))
}

fn fishing(
    selected: &str,
    offer: &RuntimeFishOffer<'_>,
    unavailable: Option<&str>,
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

pub(crate) fn contact_choices(
    revision: u64,
    selected: &str,
    conversant: Option<&JsText>,
    strike_menu: Option<openlegend_simulation::runtime::RuntimeStrikeMenu<'_>>,
    line_clear: impl Fn(&openlegend_simulation::geometry::SightRay) -> bool,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    use openlegend_simulation::activity::{ActivityDetail, ActivityScalar};
    use openlegend_simulation::runtime::RuntimeRangedMode;
    use openlegend_simulation::worlds::activity_display as display;
    use std::{borrow::Cow, mem::size_of};

    #[derive(Serialize)]
    #[serde(tag = "kind", rename_all = "lowercase")]
    enum Intent<'a> {
        Compose {
            mode: &'static str,
            #[serde(rename = "npcId")]
            npc_id: &'a str,
        },
        Command {
            command: Command<'a>,
        },
    }
    #[derive(Serialize)]
    #[serde(untagged, rename_all_fields = "camelCase")]
    enum Command<'a> {
        Strike {
            #[serde(rename = "type")]
            kind: &'static str,
            target_id: &'a str,
            definition_id: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            item_id: Option<&'a str>,
            #[serde(skip_serializing_if = "std::ops::Not::not")]
            auto_equip: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            expected_revision: Option<u64>,
        },
        Guard {
            #[serde(rename = "type")]
            kind: &'static str,
            target_id: &'a str,
            item_id: &'a str,
        },
        Ranged {
            #[serde(rename = "type")]
            mode: RuntimeRangedMode,
            target_id: &'a str,
            item_id: &'a str,
            ammunition_id: &'a str,
            #[serde(skip_serializing_if = "std::ops::Not::not")]
            auto_equip: bool,
        },
    }
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Action<'a> {
        id: String,
        label: Cow<'a, JsText>,
        category: &'a str,
        description: Cow<'a, JsText>,
        keywords: &'a [String],
        target_id: &'a str,
        enabled: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<&'a str>,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        facts: Vec<(JsText, JsText)>,
        intent: Intent<'a>,
    }
    let words = &*CONVERSATION;
    let mut workspace =
        budget.reserve(2048 + 8 * conversant.map_or(0, JsText::storage_bytes) + selected.len())?;
    let mut actions = Vec::new();
    let mut categories = Vec::new();
    if let Some(name) = conversant {
        actions.push(Action {
            id: format!("talk-{selected}"),
            label: Cow::Owned(JsText::concat(&[&words.label_prefix, name])),
            category: &words.category,
            description: Cow::Owned(JsText::concat(&[
                &words.description_prefix,
                name,
                &words.description_suffix,
            ])),
            keywords: &words.keywords,
            target_id: selected,
            enabled: true,
            reason: None,
            facts: Vec::new(),
            intent: Intent::Compose {
                mode: "chat",
                npc_id: selected,
            },
        });
        categories.push(words.category.as_str());
    }
    if let Some(menu) = &strike_menu {
        let before = actions.len();
        let reason = if !controlling {
            Some(TAKE_CONTROL)
        } else if menu.paused() {
            Some(RESUME_WORLD)
        } else {
            None
        };
        for definition in menu.definitions(budget) {
            let definition = definition?;
            let bytes = 4096_usize
                .checked_add(
                    4 * (definition.label_source_bytes()
                        + menu.name.storage_bytes()
                        + selected.len()
                        + definition.id().len()
                        + definition.weapon().map_or(0, str::len)),
                )
                .ok_or(CapacityError)?;
            workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
            let copy = display::strike_catalogue().ok_or_else(|| {
                RuntimeError::application_refused("Strike presentation unavailable.")
            })?;
            let view = menu.view(definition).ok_or_else(|| {
                RuntimeError::application_refused("Strike presentation unavailable.")
            })?;
            let label = definition.label(menu.name).ok_or_else(|| {
                RuntimeError::application_refused("Strike presentation unavailable.")
            })?;
            let label = if definition.auto_move_to_range()
                && !menu
                    .reach_line(definition, budget)?
                    .is_some_and(|ray| line_clear(&ray))
            {
                JsText::concat(&[
                    &copy.approach_prefix.into(),
                    &label.first_case(false),
                ])
            } else {
                label
            };
            let equipment = if let Some((text, custody)) = menu.equipment_preview(definition, budget)? {
                workspace.merge(custody)?;
                Some(("Equipment".into(), text))
            } else {
                None
            };
            let facts = std::iter::once(("Target".into(), menu.name.clone()))
                .chain(equipment)
                .chain(view.facts.into_iter().filter_map(|fact| match fact.value {
                    ActivityDetail::Scalar(ActivityScalar::String(value)) => {
                        Some((fact.name.first_case(true), value))
                    }
                    _ => None,
                }))
                .chain(std::iter::once((
                    copy.uncertainty_name.into(),
                    copy.uncertainty.into(),
                )))
                .collect();
            actions.push(Action {
                id: if let Some(item) = definition.weapon() {
                    format!("{}-{selected}-{item}", definition.id())
                } else {
                    format!("{}-{selected}", definition.id())
                },
                label: Cow::Owned(label),
                category: "Combat",
                description: Cow::Owned(view.name),
                keywords: &[],
                target_id: selected,
                enabled: reason.is_none(),
                reason,
                facts,
                intent: Intent::Command {
                    command: Command::Strike {
                        kind: "strike",
                        target_id: selected,
                        definition_id: definition.id(),
                        item_id: definition.weapon(),
                        auto_equip: definition.equipment_revision().is_some(),
                        expected_revision: definition.equipment_revision(),
                    },
                },
            });
        }
        // Projection stays inside the accepted contact read. Borrow the
        // installed descriptions as far as the one outgoing menu encode.
        for choice in menu.ranged {
            let kind = match choice.mode {
                RuntimeRangedMode::Aim => "aim",
                RuntimeRangedMode::ShootOnce => "shoot-once",
                RuntimeRangedMode::Hunt => "hunt",
            };
            let bytes = (2 * size_of::<Action<'_>>() + 1)
                .checked_add(kind.len())
                .and_then(|size| size.checked_add(selected.len()))
                .and_then(|size| size.checked_add(choice.weapon.len() + 1))
                .ok_or(CapacityError)?;
            workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
            let reason = reason.or(choice.reason);
            actions.push(Action {
                id: format!("{kind}-{selected}-{}", choice.weapon),
                label: Cow::Borrowed(&choice.label),
                category: "Combat",
                description: Cow::Borrowed(&choice.description),
                keywords: &[],
                target_id: selected,
                enabled: reason.is_none(),
                reason,
                facts: Vec::new(),
                intent: Intent::Command {
                    command: Command::Ranged {
                        mode: choice.mode,
                        target_id: selected,
                        item_id: choice.weapon,
                        ammunition_id: choice.ammunition,
                        auto_equip: choice.auto_equip,
                    },
                },
            });
        }
        let guard_reason = reason.or(menu.guard_reason());
        for (item, name, verb) in menu.guard_shields() {
            let bytes = 2 * size_of::<Action<'_>>() + 4 * (item.len() + selected.len() + verb.len())
                + 4 * name.storage_bytes() + 4 * menu.name.storage_bytes() + 128;
            workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
            actions.push(Action {
                id: format!("guard-{selected}-{item}"),
                label: Cow::Owned(JsText::concat(&[&verb.into(), &" ".into(), name])),
                category: "Combat",
                description: Cow::Borrowed(menu.name),
                keywords: &[],
                target_id: selected,
                enabled: guard_reason.is_none(),
                reason: guard_reason,
                facts: Vec::new(),
                intent: Intent::Command {
                    command: Command::Guard { kind: "guard", target_id: selected, item_id: item },
                },
            });
        }
        if actions.len() != before {
            categories.push("Combat");
        }
    }
    resource_menu_categories(revision, &actions, &categories, budget)
}
