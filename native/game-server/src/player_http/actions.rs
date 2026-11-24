//! Read one visible resource or person for the ordinary context menu. The
//! on-demand menu spends nothing and never starts an action.

use super::*;
use crate::{
    authority::RequestScope,
    player_references::{PlayerReferences, PrimaryActionSelection, ResolvedContact},
};
use openlegend_simulation::{
    capture::EncounterPreference,
    combat_encounters::{EncounterContext, EncounterFamily, EncounterOperation, OffensiveKind},
    encoding::{json_record, sha256_hex},
    host::CapacityError,
    runtime::{
        NativeWorldSession, RuntimeError, RuntimeGatherOffer, RuntimeRangedMode,
        RuntimeResourceOffer,
    },
    text::JsText,
};
use std::{borrow::Cow, sync::LazyLock};
mod preparation;
mod equipped;
mod fish;
mod pickup;
mod practice;
mod resources;
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
    #[serde(default)]
    equipped: bool,
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
    let ground = input.position.is_some();
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
    if input.equipped
        && (input.catalogue || ground || target.is_none() || item.is_none() || recipe.is_some())
        || recipe.is_some() && (target.is_some() || item.is_some())
    {
        return access_failure(AccessError::Changed);
    }
    if !ground && !input.catalogue && target.is_none() && item.is_none() && recipe.is_none() {
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
    let equipped = input.equipped;
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
                    if equipped {
                        return equipped::render(
                            session, scope, &tokens, for_menu.as_deref().expect("checked target"),
                            item.as_deref().expect("checked equipped item"), &game, controls,
                        );
                    }
                    let own_status = for_menu.as_deref() == Some(scope.actor_id.as_str());
                    if item.is_none() && recipe.is_none() {
                        if catalogue && for_menu.is_none() {
                            let references = tokens.scoped(scope).map_err(RuntimeError::application_refused)?;
                            return session.with_player_action_catalogue(
                                &scope.account_id,
                                &scope.actor_id,
                                |body| references.contact(body.source_id, body.physical_life.unwrap_or(0), body.lease_id)
                                    .map_err(RuntimeError::application_refused),
                                |menu, read| {
                                    let mut gathering = Vec::new();
                                    let mut resources = resources::CatalogueRows::new(budget)?;
                                    read.visit_resources(|body, offer| {
                                        // Only a deliberately selected empty cast explains how to obtain a tool.
                                        if matches!(&offer, RuntimeResourceOffer::Fish(cast) if cast.tools.is_empty()) {
                                            return Ok(());
                                        }
                                        let _alias = budget.reserve(128)?;
                                        let selected = references.contact(body.source_id, body.physical_life.unwrap_or(0), body.lease_id)
                                            .map_err(RuntimeError::application_refused)?;
                                        let batch = match offer {
                                            RuntimeResourceOffer::Gather(offer) => {
                                                let row = gather_choice(&selected, &offer, controls, budget)?;
                                                gathering.try_reserve(1).map_err(|_| CapacityError)?;
                                                gathering.push(row);
                                                return Ok(());
                                            }
                                            RuntimeResourceOffer::Pickup(offer) => pickup::choices(&selected, &offer, controls, budget)?,
                                            RuntimeResourceOffer::Practice(offer) => practice::choices(&selected, &offer, controls, budget)?,
                                            RuntimeResourceOffer::Fish(offer) => fish::choices(&selected, &offer, controls, budget, |queries| {
                                                game.spatial.compute(queries, budget).map(|answer| answer.into_parts())
                                                    .map_err(RuntimeError::application_refused)
                                            })?,
                                        };
                                        resources.add(batch)
                                    })?;
                                    let mut craft = Vec::new();
                                    read.visit_known_manufacture(|recipe_id, offer| {
                                        let row = manufacture::choice(recipe_id, &offer, controls, budget)?;
                                        craft.try_reserve(1).map_err(|_| CapacityError)?;
                                        craft.push(row);
                                        Ok(())
                                    })?;
                                    status::render(menu, controls, &gathering, &craft, Some(&resources), budget)
                                },
                            ).map(Some);
                        }
                        if own_status {
                            let references = tokens.scoped(scope).map_err(RuntimeError::application_refused)?;
                            return session.with_player_status_menu(
                                &scope.account_id,
                                &scope.actor_id,
                                |body| references.contact(body.source_id, body.physical_life.unwrap_or(0), body.lease_id)
                                    .map_err(RuntimeError::application_refused),
                                |menu| status::render(menu, controls, &[], &[], None, budget),
                            ).map(Some);
                        }
                        if ground && for_menu.is_none() {
                            return session.with_player_ground_catalogue(
                                &scope.account_id, &scope.actor_id,
                                |revision| resource_menu_categories::<()>(revision, &[], &[], budget),
                            ).map(Some);
                        }
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
                            RuntimeResourceOffer::Fish(offer) => fish::render(selected, &offer, controls, budget, |queries| {
                                game.spatial.compute(queries, budget).map(|answer| answer.into_parts())
                                    .map_err(RuntimeError::application_refused)
                            }),
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
    target_id: Cow<'a, str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<Cow<'a, str>>,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum ResourceIntent<'a> {
    Command { command: ResourceCommand<'a> },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceAction<'a, Facts: Serialize> {
    id: String,
    label: JsText,
    category: &'static str,
    description: &'a JsText,
    keywords: [Cow<'a, JsText>; 2],
    target_id: Cow<'a, str>,
    enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'a JsText>,
    facts: Facts,
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

fn resource_menu_selection<T: Serialize + ?Sized>(
    revision: u64,
    actions: &T,
    categories: &[&str],
    primary_action: Option<PrimaryActionSelection<&str>>,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Catalogue<'a, T: ?Sized> {
        revision: u64,
        actions: &'a T,
        categories: &'a [&'a str],
        #[serde(skip_serializing_if = "Option::is_none")]
        default_action_id: Option<&'a str>,
        #[serde(skip_serializing_if = "Option::is_none")]
        primary_action: Option<PrimaryActionSelection<&'a str>>,
    }
    #[derive(Serialize)]
    struct Menu<'a, T: ?Sized> {
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

#[derive(Serialize)]
#[serde(transparent)]
pub(super) struct GatherAction {
    row: ResourceAction<'static, [(&'static str, JsText); 3]>,
    #[serde(skip)]
    _workspace: ByteReservation,
}

fn gathering(
    selected: &str,
    offer: &RuntimeGatherOffer<'_>,
    references: &PlayerReferences<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<Bytes, RuntimeError> {
    let action = gather_choice(selected, offer, controlling, budget)?;
    let reference = gathering_reference(references, offer, &action)?;
    resource_menu_selection(
        offer.sequence,
        std::slice::from_ref(&action),
        &[GATHER.name],
        Some(PrimaryActionSelection {
            target_id: selected,
            action_id: &action.row.id,
            reference: &reference,
        }),
        budget,
    )
}

fn gather_choice(
    selected: &str,
    offer: &RuntimeGatherOffer<'_>,
    controlling: bool,
    budget: &ByteBudget,
) -> Result<GatherAction, RuntimeError> {
    static TAKE_CONTROL_TEXT: LazyLock<JsText> = LazyLock::new(|| JsText::from(TAKE_CONTROL));
    static RESUME_WORLD_TEXT: LazyLock<JsText> = LazyLock::new(|| JsText::from(RESUME_WORLD));
    static UNAVAILABLE: LazyLock<JsText> = LazyLock::new(|| JsText::from("Your character cannot do that now."));
    let reason = if !controlling {
        Some(&*TAKE_CONTROL_TEXT)
    } else if offer.paused {
        Some(&*RESUME_WORLD_TEXT)
    } else if !offer.can_act {
        Some(&*UNAVAILABLE)
    } else {
        (offer.quantity == 0).then_some(&GATHER.menu_empty)
    };
    let workspace = budget.reserve(
        4096 + 8 * (offer.name.storage_bytes() + offer.material.storage_bytes() + selected.len())
            + offer.label.map_or(0, |label| 8 * label.storage_bytes()),
    )?;
    let label = offer
        .label
        .cloned()
        .unwrap_or_else(|| JsText::concat(&[&GATHER.fallback_prefix, offer.name]));
    Ok(GatherAction {
        row: ResourceAction {
            id: format!("gather-{selected}"),
            label,
            category: GATHER.name,
            description: &GATHER.menu_description,
            keywords: [Cow::Owned(offer.material.clone()), Cow::Borrowed(&GATHER.menu_keyword)],
            target_id: Cow::Owned(selected.to_owned()),
            enabled: reason.is_none(),
            reason,
            facts: openlegend_simulation::worlds::activity_display::gathering_facts(
                offer.work_seconds, offer.menu_yield, offer.material, offer.name,
            ),
            intent: ResourceIntent::Command {
                command: ResourceCommand { kind: "gather", target_id: Cow::Owned(selected.to_owned()), item_id: None },
            },
        },
        _workspace: workspace,
    })
}

fn gathering_reference(
    references: &PlayerReferences<'_>,
    offer: &RuntimeGatherOffer<'_>,
    action: &GatherAction,
) -> Result<String, RuntimeError> {
    // A changed work time or effective yield changes the reviewed choice.
    // Unrelated accepted updates do not change this exact contact and rule.
    references
        .primary_action(&(
            offer.target,
            offer.actor_life,
            offer.material_pin,
            offer.bare_hand_quantity,
            action,
        ))
        .map_err(RuntimeError::application_refused)
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
            let action = gather_choice(&requested.target_id, &offer, true, budget)?;
            let reference = gathering_reference(&references, &offer, &action)?;
            if action.row.id != requested.action_id || reference != requested.reference {
                return Ok(GatherSelection::Stale);
            }
            if let Some(reason) = action.row.reason {
                return Ok(GatherSelection::Unavailable(
                    reason.as_unicode().unwrap_or("This action is unavailable now."),
                ));
            }
            ResolvedContact::new(offer.target, None, budget).map(GatherSelection::Current)
        })?;
    Ok(result.unwrap_or(GatherSelection::Stale))
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct EncounterRequest {
    pub(crate) operation: EncounterOperation,
    pub(crate) reference: String,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum ContactIntent<'a> {
    Compose {
        mode: &'static str,
        #[serde(rename = "npcId")]
        npc_id: &'a str,
        #[serde(skip_serializing_if = "Option::is_none")]
        preference: Option<ContactCommand<'a>>,
    },
    Command {
        command: ContactCommand<'a>,
    },
    Unavailable,
}
#[derive(Serialize)]
#[serde(untagged, rename_all_fields = "camelCase")]
pub(crate) enum ContactCommand<'a> {
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
    Release {
        #[serde(rename = "type")]
        kind: &'static str,
        aim_id: &'a str,
    },
    Teach {
        #[serde(rename = "type")]
        kind: &'static str,
        target_id: &'a str,
        recipe_id: &'a str,
    },
    Preference {
        #[serde(rename = "type")]
        kind: &'static str,
        target_id: &'a str,
        encounter_preference: EncounterRequest,
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
struct ContactAction<'a> {
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
    #[serde(skip_serializing_if = "Option::is_none")]
    priority: Option<u32>,
    intent: ContactIntent<'a>,
}

pub(crate) struct ContactMenu<'a> {
    revision: u64,
    selected: &'a str,
    actions: Vec<ContactAction<'a>>,
    categories: Vec<&'a str>,
    encounter: Option<EncounterContext<'a>>,
    _storage: ByteReservation,
}

impl ContactMenu<'_> {
    fn preferred(&self) -> Option<&ContactAction<'_>> {
        self.actions.iter().filter(|action| action.priority.is_some()
            && (self.encounter.is_some() || matches!(&action.intent, ContactIntent::Compose { preference: None, .. }))).enumerate()
            .max_by_key(|(index, action)| (action.priority, action.enabled, std::cmp::Reverse(*index)))
            .map(|(_, action)| action)
    }

    fn reference(&self, action: &ContactAction<'_>, references: &PlayerReferences<'_>) -> Result<String, RuntimeError> {
        struct BindingFacts<'a>(&'a [(JsText, JsText)]);
        impl Serialize for BindingFacts<'_> {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                let facts = self.0.iter().filter(|(name, _)| {
                    !matches!(name.as_unicode(), Some("Distance" | "Direction"))
                });
                serializer.collect_seq(facts)
            }
        }
        references.primary_action(&(
            self.encounter.as_ref().map(|seen| (&seen.binding, seen.family)),
            action.id.as_str(), self.selected, &action.label, &action.description,
            action.enabled, action.reason, &action.intent, BindingFacts(&action.facts),
        )).map_err(RuntimeError::application_refused)
    }

    pub(crate) fn encode(&self, references: &PlayerReferences<'_>, budget: &ByteBudget) -> Result<Bytes, RuntimeError> {
        let action = self.preferred();
        let reference = action.map(|action| self.reference(action, references)).transpose()?;
        resource_menu_selection(self.revision, &self.actions, &self.categories,
            action.zip(reference.as_deref()).map(|(action, reference)| PrimaryActionSelection {
                target_id: self.selected, action_id: action.id.as_str(), reference,
            }), budget)
    }

    pub(crate) fn primary_command(
        &self,
        reference: &PrimaryActionSelection<String>,
        scoped: &PlayerReferences<'_>,
    ) -> Result<Option<&ContactCommand<'_>>, RuntimeError> {
        let Some(choice) = self.preferred().filter(|row| row.enabled && row.id == reference.action_id)
        else { return Ok(None); };
        if self.reference(choice, scoped)? != reference.reference { return Ok(None); }
        Ok(match &choice.intent {
            ContactIntent::Command { command } => Some(command),
            ContactIntent::Compose { preference, .. } => preference.as_ref(),
            ContactIntent::Unavailable => None,
        })
    }

    pub(crate) fn binding(&self) -> Option<&EncounterPreference<&str>> {
        self.encounter.as_ref().map(|context| &context.binding)
    }

    pub(crate) fn control_allowed(&self, operation: EncounterOperation) -> bool {
        self.actions.iter().any(|action| action.enabled && match &action.intent {
            ContactIntent::Compose { preference: Some(ContactCommand::Preference { encounter_preference, .. }), .. }
            | ContactIntent::Command { command: ContactCommand::Preference { encounter_preference, .. } } => {
                encounter_preference.operation == operation
            }
            _ => false,
        })
    }
}

fn current_control<'a>(
    references: &PlayerReferences<'_>,
    binding: &EncounterPreference<&str>,
    selected: &'a str,
    operation: EncounterOperation,
) -> Result<ContactCommand<'a>, RuntimeError> {
    let reference = references.encounter_control(operation, binding).map_err(RuntimeError::application_refused)?;
    Ok(ContactCommand::Preference {
        kind: "encounter-preference", target_id: selected,
        encounter_preference: EncounterRequest { operation, reference },
    })
}

pub(crate) fn contact_choices<'a>(
    revision: u64,
    selected: &'a str,
    conversant: Option<&'a JsText>,
    contact: Option<openlegend_simulation::runtime::RuntimeContactMenu<'a>>,
    spatial: &crate::spatial::SpatialProvider,
    controlling: bool,
    manually_paused: bool,
    references: &PlayerReferences<'_>,
    budget: &ByteBudget,
) -> Result<ContactMenu<'a>, RuntimeError> {
    use openlegend_simulation::activity::{ActivityDetail, ActivityScalar};
    use openlegend_simulation::runtime::RuntimeRangedMode;
    use openlegend_simulation::worlds::activity_display as display;
    use std::mem::size_of;

    let words = &*CONVERSATION;
    let encounter = contact.as_ref().and_then(|menu| menu.encounter());
    let family = encounter.as_ref().map_or(EncounterFamily::Ordinary, |seen| seen.family);
    use openlegend_simulation::worlds::base_context_actions::{Choice, rank};
    let mut workspace =
        budget.reserve(2048 + 8 * conversant.map_or(0, JsText::storage_bytes) + selected.len())?;
    let mut actions = Vec::new();
    let mut categories = Vec::new();
    if let Some(name) = conversant {
        let custom = encounter.as_ref().filter(|read| read.family != EncounterFamily::Ordinary);
        if let Some(custom) = custom {
            let bytes = 4 * (custom.speak.label.len() + custom.speak.description.len());
            workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
        }
        let preference = encounter.as_ref().filter(|_| controlling)
            .map(|seen| current_control(references, &seen.binding, selected, EncounterOperation::Speak))
            .transpose()?;
        actions.push(ContactAction {
            id: format!("talk-{selected}"),
            label: Cow::Owned(custom.map_or_else(
                || JsText::concat(&[&words.label_prefix, name]),
                |seen| JsText::from(seen.speak.label),
            )),
            category: &words.category,
            description: Cow::Owned(custom.map_or_else(
                || JsText::concat(&[&words.description_prefix, name, &words.description_suffix]),
                |seen| JsText::from(seen.speak.description),
            )),
            keywords: &words.keywords,
            target_id: selected,
            enabled: true,
            reason: None,
            facts: Vec::new(),
            priority: rank(family, Choice::Speak),
            intent: ContactIntent::Compose {
                mode: "chat",
                npc_id: selected,
                preference,
            },
        });
        categories.push(words.category.as_str());
    }
    if let Some(menu) = &contact {
        let before = actions.len();
        let reason = if !controlling {
            Some(TAKE_CONTROL)
        } else if menu.paused() {
            Some(RESUME_WORLD)
        } else {
            menu.unavailable_reason()
        };
        if let Some(seen) = &encounter {
            if let Some(held) = &seen.held
                && let Some((label, description, not_ready)) = menu.release_words()
            {
                let bytes = 3 * size_of::<ContactAction<'_>>() + 2 * held.action_id.len();
                workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
                let unavailable = reason.or((!held.ready).then_some(not_ready));
                actions.push(ContactAction {
                    id: format!("release-shot:{}", held.action_id),
                    label: Cow::Borrowed(label),
                    category: "Combat",
                    description: Cow::Borrowed(description),
                    keywords: &[],
                    target_id: selected,
                    enabled: unavailable.is_none(),
                    reason: unavailable, facts: Vec::new(),
                    priority: rank(family, Choice::Release),
                    intent: ContactIntent::Command {
                        command: ContactCommand::Release { kind: "release-shot", aim_id: held.action_id },
                    },
                });
            }
            if seen.stop {
                let stop_reason = if controlling && manually_paused {
                    menu.unavailable_reason()
                } else {
                    reason
                };
                let bytes = 3 * size_of::<ContactAction<'_>>() + selected.len() + 128
                    + 4 * (seen.stop_words.label.len() + seen.stop_words.description.len());
                workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
                actions.push(ContactAction {
                    id: format!("stop-offense-{selected}"),
                    label: Cow::Owned(JsText::from(seen.stop_words.label)),
                    category: "Combat",
                    description: Cow::Owned(JsText::from(seen.stop_words.description)),
                    keywords: &[], target_id: selected, enabled: stop_reason.is_none(),
                    reason: stop_reason, facts: Vec::new(), priority: None,
                    intent: ContactIntent::Command { command: current_control(references, &seen.binding, selected, EncounterOperation::Stop)? },
                });
            }
        }
        let attack_reason = reason.or(menu.recover_reason());
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
                    .is_some_and(|ray| spatial.clear_interaction_line(&ray))
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
            actions.push(ContactAction {
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
                enabled: attack_reason.is_none(),
                reason: attack_reason,
                facts,
                priority: rank(family, Choice::Strike {
                    exact: encounter.as_ref().and_then(|seen| seen.own).is_some_and(|own| {
                        own.kind == OffensiveKind::Strike
                            && own.definition_id.as_deref() == Some(definition.id())
                            && own.weapon_item_id.as_deref() == definition.weapon()
                    }),
                    equipped: definition.weapon().is_some() && definition.equipment_revision().is_none(),
                    carried: definition.equipment_revision().is_some(),
                }),
                intent: ContactIntent::Command {
                    command: ContactCommand::Strike {
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
            let kind = choice.mode.kind();
            let bytes = (2 * size_of::<ContactAction<'_>>() + 1)
                .checked_add(kind.len())
                .and_then(|size| size.checked_add(selected.len()))
                .and_then(|size| size.checked_add(choice.weapon.len() + 1))
                .ok_or(CapacityError)?;
            workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
            let reason = reason.or(choice.reason);
            actions.push(ContactAction {
                id: format!("{kind}-{selected}-{}", choice.weapon),
                label: Cow::Borrowed(&choice.label),
                category: "Combat",
                description: Cow::Borrowed(&choice.description),
                keywords: &[],
                target_id: selected,
                enabled: reason.is_none(),
                reason,
                facts: Vec::new(),
                priority: rank(family, Choice::Ranged {
                    kind,
                    exact: encounter.as_ref().and_then(|seen| seen.own).is_some_and(|own| {
                        let expected = match choice.mode {
                            RuntimeRangedMode::Aim => OffensiveKind::Aim,
                            RuntimeRangedMode::ShootOnce => OffensiveKind::ShootOnce,
                            RuntimeRangedMode::Hunt => OffensiveKind::Hunt,
                        };
                        own.kind == expected && own.weapon_item_id.as_deref() == Some(choice.weapon)
                            && own.ammo_item_id.as_deref() == Some(choice.ammunition)
                    }),
                    carried: choice.auto_equip,
                }),
                intent: ContactIntent::Command {
                    command: ContactCommand::Ranged {
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
            let bytes = 2 * size_of::<ContactAction<'_>>() + 4 * (item.len() + selected.len() + verb.len())
                + 4 * name.storage_bytes() + 4 * menu.name.storage_bytes() + 128;
            workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
            actions.push(ContactAction {
                id: format!("guard-{selected}-{item}"),
                label: Cow::Owned(JsText::concat(&[&verb.into(), &" ".into(), name])),
                category: "Combat",
                description: Cow::Borrowed(menu.name),
                keywords: &[],
                target_id: selected,
                enabled: guard_reason.is_none(),
                reason: guard_reason,
                facts: Vec::new(),
                priority: None,
                intent: ContactIntent::Command {
                    command: ContactCommand::Guard { kind: "guard", target_id: selected, item_id: item },
                },
            });
        }
        if actions.len() != before {
            categories.push("Combat");
        }
        let teaching_blocked = if !controlling {
            Some(TAKE_CONTROL)
        } else if menu.paused() {
            Some(RESUME_WORLD)
        } else {
            menu.unavailable_reason()
        };
        let teaching = menu.teaching(teaching_blocked, |queries| {
            spatial.compute(queries, budget).map(|answer| answer.into_parts())
                .map_err(RuntimeError::application_refused)
        }, budget)?;
        if let Some(teaching) = teaching {
            #[derive(Deserialize)]
            struct Fields { name: JsText, description: JsText }

            let words = teaching.words;
            if !categories.contains(&words.category.as_str()) {
                categories.push(&words.category);
            }
            for (recipe_id, recipe) in teaching.recipes() {
                let bytes = 1024 + 4 * (recipe.len() + selected.len() + recipe_id.len()
                    + menu.name.storage_bytes() + conversant.map_or(0, JsText::storage_bytes)
                    + words.label_prefix.len() + words.label_separator.len() + words.description_suffix.len()
                    + teaching.method_clause.len());
                workspace.resize(workspace.bytes().checked_add(bytes).ok_or(CapacityError)?)?;
                let Fields { name, description } = serde_json::from_str(recipe)
                    .map_err(RuntimeError::application_refused)?;
                let label = JsText::concat(&[
                    &words.label_prefix.as_str().into(), menu.name,
                    &words.label_separator.as_str().into(), &name,
                ]);
                let detail = JsText::concat(&[
                    &words.label_prefix.as_str().into(), conversant.unwrap_or(menu.name),
                    &teaching.method_clause.into(), &name, &". ".into(), &description,
                    &words.description_suffix.as_str().into(),
                ]);
                actions.push(ContactAction {
                    id: format!("teach-{selected}-{recipe_id}"), label: Cow::Owned(label),
                    category: &words.category, description: Cow::Owned(detail),
                    keywords: &words.keywords, target_id: selected, enabled: teaching.reason.is_none(),
                    reason: teaching.reason, facts: Vec::new(), priority: None,
                    intent: ContactIntent::Command {
                        command: ContactCommand::Teach { kind: "teach", target_id: selected, recipe_id },
                    },
                });
            }
        }
    }
    if family == EncounterFamily::Attack && actions.iter().all(|action| action.priority.is_none()) {
        let (label, description) = openlegend_simulation::worlds::base_context_actions::unavailable();
        workspace.resize(workspace.bytes().checked_add(4 * (label.len() + description.len()) + selected.len() + 3 * size_of::<ContactAction<'_>>())
            .ok_or(CapacityError)?)?;
        actions.push(ContactAction {
            id: format!("unavailable-attack-{selected}"), label: Cow::Owned(JsText::from(label)),
            category: "Combat", description: Cow::Owned(JsText::from(description)),
            keywords: &[], target_id: selected, enabled: false, reason: Some(description), facts: Vec::new(),
            priority: Some(0), intent: ContactIntent::Unavailable,
        });
        if !categories.contains(&"Combat") { categories.push("Combat"); }
    }
    Ok(ContactMenu { revision, selected, actions, categories, encounter, _storage: workspace })
}
