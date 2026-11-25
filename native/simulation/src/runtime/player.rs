//! One selected player capture and its final scoped disclosure fence. No native
//! read borrow survives a provider/SQL await; the immutable evidence owner does.
use super::*;
mod inventory;
mod object_history;
mod offer_recipients;
mod pickup;
mod world_storage;
pub use inventory::{
    DirectInventory, InventoryContainer, InventoryCrumb, InventoryGroup, ResolvedInventoryGroup,
    StockGroupRefusal, StockGroupRequest, stock_group_limit_message,
};
pub use object_history::{
    OBJECT_HISTORY_SELECTION, RuntimeObjectHistoryEntry, RuntimeObjectHistoryRead,
};
pub use offer_recipients::{
    RuntimeOfferCursor, RuntimeOfferPage, RuntimeOfferProblem, RuntimeOfferSelection,
    RuntimeOfferSource,
};
pub use world_storage::{InspectedRecipeRecord, RuntimeWorldStorage};
mod catalogue;
use catalogue::{EatingRead, current_actor_target, follow_availability};
pub use catalogue::{RuntimeActionCatalogue, RuntimeCatalogueOffer};
mod hearth;
mod status_menu;
mod teaching;
use crate::capture::{
    CapturedPlayerControls, PlayerControlFacts, PlayerControlPreparation, PlayerPerception,
    PlayerSelfFacts,
};
pub use crate::commands::invocation::CoordinateRefusal;
pub use crate::commands::player::RuntimePlayerCommand;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan};
use crate::host::{CapacityError, PublicationLease};
use crate::simulation::AcceptedActorRead;
pub use crate::simulation::{InteractionMode, PlayerInteractionFacts};
pub use hearth::{RuntimeHearthCatalogue, RuntimeHearthShape};
use indexmap::IndexMap;
use serde_json::value::RawValue;
pub use status_menu::{RuntimeStatusChoice, RuntimeStatusMenu};
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlayerInputRequest {
    account_id: String,
    actor_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlayerInteractionInput {
    mode: crate::simulation::InteractionMode,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    target_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_option"
    )]
    utterance_event_id: Option<String>,
}

pub struct RuntimeContactMenu<'a> {
    state: &'a crate::simulation::SimulationState,
    source: &'a crate::state::Entity,
    target: &'a crate::state::Entity,
    body: &'a crate::reception::ObservedBody,
    health: Option<&'a crate::reception::AttributeView>,
    may_act: bool,
    may_attack: bool,
    pub follow: Option<RuntimeFollowOffer<'a>>,
    teaching: Option<GeometryBinding>,
    pub name: &'a crate::text::JsText,
    pub ranged: &'a [RuntimeRangedChoice<'a>],
}

#[derive(Clone, Copy)]
pub struct RuntimeStrikeChoice<'a>(crate::contact::ContactRead<'a>, Option<u64>);

impl<'a> RuntimeStrikeChoice<'a> {
    pub fn id(self) -> &'a str {
        self.0.id
    }

    pub fn weapon(self) -> Option<&'a str> {
        match self.0.kind {
            crate::contact::ContactKind::Natural(_) => None,
            crate::contact::ContactKind::Equipped { item_id, .. } => Some(item_id),
        }
    }

    pub fn auto_move_to_range(self) -> bool {
        self.0.auto_move_to_range
    }

    /// When present, the attack puts on a carried weapon against the offered
    /// inventory cut. Reject a changed cut before putting any item away.
    pub fn equipment_revision(self) -> Option<u64> {
        self.1
    }

    pub fn label_source_bytes(self) -> usize {
        match self.0.kind {
            crate::contact::ContactKind::Natural(strike) => strike.label.storage_bytes(),
            crate::contact::ContactKind::Equipped { definition, .. } => {
                definition.named.name.storage_bytes()
            }
        }
    }

    pub fn label(self, target: &crate::text::JsText) -> Option<crate::text::JsText> {
        use crate::text::JsText;
        match self.0.kind {
            crate::contact::ContactKind::Natural(strike) => {
                Some(JsText::concat(&[&strike.label, &" ".into(), target]))
            }
            crate::contact::ContactKind::Equipped { definition, .. } => {
                crate::worlds::activity_display::weapon_strike_name(&definition.named, Some(target))
            }
        }
    }
}

pub struct RuntimeFollowOffer<'a> {
    pub name: &'a crate::text::JsText,
    pub paused: bool,
    pub reason: Option<&'a str>,
}

impl<'a> RuntimeContactMenu<'a> {
    /// A borrowed current observation, never a second view or geometry query.
    pub fn encounter(&self) -> Option<crate::combat_encounters::EncounterContext<'a>> {
        crate::combat_encounters::context(self.state, self.source, self.target)
    }

    pub fn release_words(
        &self,
    ) -> Option<(&'a crate::text::JsText, &'a crate::text::JsText, &'a str)> {
        let words = &self
            .state
            .installed
            .occurrence_rules
            .value()
            .ranged
            .as_ref()?
            .menu;
        Some((
            &words.release_label,
            &words.release_description,
            &words.release_not_ready,
        ))
    }

    pub fn recover_reason(&self) -> Option<&'a str> {
        let body = self.source.actor.as_ref()?;
        let now = self.state.physical.header.sim_time;
        (body.combat_ready_at.is_some_and(|ready| ready > now)
            || body.action.as_ref().is_some_and(|action| {
                action.strike_phase == Some(crate::contact::StrikePhase::Recovery)
            }))
        .then_some(crate::worlds::base_context_actions::recovering())
    }

    pub fn unavailable_reason(&self) -> Option<&'a str> {
        (!self.may_act).then_some(
            self.state
                .installed
                .ordinary_actions
                .value()
                .actions_restricted
                .message
                .as_str(),
        )
    }

    pub fn paused(&self) -> bool {
        self.state.physical.header.paused
    }

    pub fn sequence(&self) -> u64 {
        self.state.physical.header.sequence
    }

    pub fn profile(&self) -> (&'a str, u64) {
        let profile = &self.state.installed.content.profile;
        (&profile.id, profile.version)
    }

    /// Render the selected actor's received target facts. Only the matching
    /// public attribute from this read may appear in the returned view.
    pub fn view(&self, choice: RuntimeStrikeChoice<'a>) -> Option<crate::activity::ActivityView> {
        use crate::worlds::activity_display as display;
        let purpose = match choice.0.kind {
            crate::contact::ContactKind::Natural(_) => None,
            crate::contact::ContactKind::Equipped { definition, .. } => {
                display::weapon_strike_name(&definition.named, None)
            }
        };
        display::format(
            self.profile(),
            display::OrdinaryAction::Strike(Some(display::StrikeRead::from(choice.0))),
            purpose,
            None,
            Some(display::ObservedActor {
                position: self.source.world_position()?,
                heading: self.source.spatial.heading,
            }),
            Some(display::ObservedTarget {
                position: self.body.position,
                name: self.name.clone(),
                health: self.health.cloned(),
            }),
        )
    }

    /// Prepare the existing interaction-anchor sight query, only when the
    /// selected strike can already reach its target without walking.
    pub fn reach_line(
        &self,
        choice: RuntimeStrikeChoice<'a>,
        budget: &ByteBudget,
    ) -> Result<Option<crate::geometry::SightRay>, RuntimeError> {
        crate::geometry::interaction_reach(
            self.source,
            self.target,
            choice.0.approach_range.unwrap_or(choice.0.range),
            budget,
        )
        .map_err(failure)
    }

    pub fn definitions<'b>(
        &'b self,
        budget: &'b ByteBudget,
    ) -> impl Iterator<Item = Result<RuntimeStrikeChoice<'a>, RuntimeError>> + 'b {
        let installed = &self.state.installed;
        let entities = &self.state.physical.entities;
        let held = self
            .may_attack
            .then(|| {
                self.state
                    .inventory
                    .children(entities, &self.source.id, true)
            })
            .into_iter()
            .flatten()
            .filter_map(|item| {
                crate::contact::ContactRead::equipped(installed, entities, self.source, &item.id)
            });
        let carried = self
            .may_attack
            .then(|| {
                self.state
                    .inventory
                    .children(entities, &self.source.id, false)
            })
            .into_iter()
            .flatten()
            .filter(|item| {
                matches!(
                    item.placement,
                    Some(crate::state::Placement::Contained { .. })
                )
            })
            .filter_map(move |item| {
                match crate::contact::ContactRead::carried(self.state, self.source, item, budget) {
                    Ok(Some(read)) => Some(Ok(RuntimeStrikeChoice(
                        read,
                        Some(self.source.inventory_revision.unwrap_or_default()),
                    ))),
                    Ok(None) => None,
                    Err(error) => Some(Err(failure(error))),
                }
            });
        installed
            .retained
            .native_strike_read
            .keys()
            .filter(|_| self.may_attack)
            .filter_map(|id| crate::contact::profile(installed, self.source, id))
            .map(crate::contact::ContactRead::from)
            .chain(held)
            .map(|read| Ok(RuntimeStrikeChoice(read, None)))
            .chain(carried)
    }

    pub fn equipment_preview(
        &self,
        choice: RuntimeStrikeChoice<'a>,
        budget: &ByteBudget,
    ) -> Result<Option<(crate::text::JsText, crate::host::ByteReservation)>, RuntimeError> {
        if choice.equipment_revision().is_none() {
            return Ok(None);
        }
        let item = choice
            .weapon()
            .and_then(|id| self.state.physical.entities.get(id))
            .ok_or_else(|| failure(crate::execution::ExecutionError::Invariant))?;
        crate::commands::equipment_preview(self.state, self.source, item, budget)
            .map(Some)
            .map_err(failure)
    }

    /// Borrow only equipped shields from this accepted contact cut.
    pub fn guard_shields(
        &self,
    ) -> impl Iterator<Item = (&'a str, &'a crate::text::JsText, &'a str)> + '_ {
        self.may_act
            .then(|| {
                self.state
                    .inventory
                    .children(&self.state.physical.entities, &self.source.id, true)
            })
            .into_iter()
            .flatten()
            .filter_map(|shield| {
                let lot = shield.item.as_ref()?;
                let definition = self
                    .state
                    .installed
                    .retained
                    .items
                    .get(&lot.definition_pin.id)?;
                let profile = definition.contact_defense.as_ref()?;
                definition.can_guard().then_some((
                    shield.id.as_str(),
                    &definition.named.name,
                    profile.label.as_str(),
                ))
            })
    }

    pub fn guard_reason(&self) -> Option<&'a str> {
        let source = self.source.actor.as_ref()?;
        let current = self.state.physical.header.sim_time;
        let same_direction = self.source.world_position().is_some_and(|origin| {
            (origin.x - self.body.position.x).hypot(origin.z - self.body.position.z) <= 1e-8
        });
        (same_direction
            || source
                .action
                .as_ref()
                .is_some_and(crate::state::Action::is_guard)
            || source.combat_ready_at.is_some_and(|at| at > current))
        .then_some(
            self.state
                .installed
                .ordinary_actions
                .value()
                .not_applicable
                .message
                .as_str(),
        )
    }
}

pub struct RuntimePlayerRead {
    account: String,
    actor: String,
    read: AcceptedActorRead,
    events: crate::experience::CapturedPlayerEvents,
    preparation: Option<PlayerControlPreparation>,
    controls: Option<CapturedPlayerControls>,
    clock: RuntimeClock,
    view_source: Option<RuntimePlayerViewSource>,
    narrator: Option<RuntimeNarratorFence>,
    outings: Option<crate::outings::view::PreparedOutings>,
    _custody: ByteReservation,
}

struct RuntimeNarratorFence {
    privacy_revision: u64,
    temporal: Vec<(crate::received::TemporalReceiptLocator, f64)>,
    _custody: ByteReservation,
}

/// Finite data from the same accepted read as the stand-alone view. Saved
/// presentation presence is a requirement for the application's asset grant.
pub struct RuntimePlayerViewSource {
    pub history_order: u64,
    pub privacy_revision: u64,
    pub memory_cut: u64,
    pub places_revision: u64,
    pub place_note_revision: u64,
    pub inventory_revision: u64,
    pub inventory_detail_revision: [u64; 3],
    pub world_storage: Option<(String, u64)>,
    pub inventory_inspection: Option<(crate::text::JsText, String)>,
    recent_story_age: f64,
    presentation_release: Option<Box<RawValue>>,
    pub presentation_release_revision: Option<u64>,
    milestones: IndexMap<String, bool>,
    _custody: ByteReservation,
}

impl RuntimePlayerViewSource {
    /// Borrow the saved presentation reference from this exact accepted cut.
    /// Application projection still needs the current asset catalog grant.
    pub fn presentation_release(&self) -> Option<&RawValue> {
        self.presentation_release.as_deref()
    }

    pub fn milestone_done(&self, id: &str) -> bool {
        self.milestones.get(id).copied().unwrap_or(false)
    }
}

pub use crate::simulation::PlayerInputState as RuntimePlayerInputState;
pub struct RuntimePlayerPublication {
    can_use_inventory: bool,
    _lease: PublicationLease,
}

pub struct TypedWalk<'a> {
    pub x: f64,
    pub z: f64,
    pub support: Option<&'a str>,
    pub mode: crate::plans::PlanMode,
    pub watch: Option<(&'a crate::plans::WatchRequest, &'a str)>,
}

pub struct RuntimeGatherOffer<'a> {
    pub target: &'a str,
    pub actor_life: Option<u64>,
    pub material_pin: &'a crate::values::DefinitionPin,
    pub bare_hand_quantity: u64,
    pub menu_yield: u64,
    pub work_seconds: f64,
    pub can_act: bool,
    pub paused: bool,
    pub name: &'a crate::text::JsText,
    pub material: &'a crate::text::JsText,
    pub label: Option<&'a crate::text::JsText>,
    pub quantity: u64,
    pub sequence: u64,
}

#[derive(Clone, Copy)]
struct GatheringActor<'a> {
    id: &'a str,
    life: Option<u64>,
    can_act: bool,
}

fn gathering_actor<'a>(
    state: &'a crate::simulation::SimulationState,
    actor: &'a str,
) -> Result<GatheringActor<'a>, RuntimeError> {
    let entity = state
        .physical
        .entities
        .get(actor)
        .ok_or_else(|| failure("missing gather actor"))?;
    let available = entity.actively_participates()
        && entity
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated);
    let blocked = state
        .installed
        .capabilities
        .capability_blocked(Some(entity), "actions")
        .map_err(failure)?;
    Ok(GatheringActor {
        id: actor,
        life: entity.physical_life(),
        can_act: available && !blocked,
    })
}

fn menu_gathering<'a>(
    state: &'a crate::simulation::SimulationState,
    body: &crate::capture::PlayerObservedBody<'_>,
) -> Option<(crate::gathering::Source<'a>, u64)> {
    let crate::reception::SensoryFacet::Body { body: observed } = &body.body_facet()?.value else {
        return None;
    };
    if observed.kind != "resource" {
        return None;
    }
    let (definition, quantity) = observed.subtype.as_ref().zip(observed.quantity)?;
    let source = crate::gathering::source(state, body.source_id)
        .filter(|source| &source.stock.definition_id == definition)?;
    Some((source, quantity as u64))
}

fn gather_menu_offer<'a>(
    state: &crate::simulation::SimulationState,
    body: &crate::capture::PlayerObservedBody<'a>,
    source: crate::gathering::Source<'a>,
    quantity: u64,
    actor: GatheringActor<'_>,
    amount: u64,
) -> RuntimeGatherOffer<'a> {
    RuntimeGatherOffer {
        target: body.source_id,
        actor_life: actor.life,
        material_pin: &source.definition.pin,
        bare_hand_quantity: source.base_yield,
        menu_yield: amount.min(quantity),
        work_seconds: source.stock.work_seconds,
        can_act: actor.can_act,
        paused: state.physical.header.paused,
        name: &body.name.name,
        material: &source.definition.named.name,
        label: source.definition.gather_label.as_ref(),
        quantity,
        sequence: state.physical.header.sequence,
    }
}

/// Only the permitted heat contacts passed by the current scope are offered.
pub struct RuntimeHeatContact {
    pub target: String,
    pub name: crate::text::JsText,
    pub lit: bool,
}

pub struct RuntimePreparation<'a> {
    pub pin: &'a crate::values::DefinitionPin,
    pub name: &'a crate::text::JsText,
    pub description: &'a crate::text::JsText,
    pub inputs: Option<&'a IndexMap<String, String>>,
}

mod fire;
pub use crate::fire_care::{FireOperation, VisibleFuel};
pub use fire::{RuntimeFireChoice, RuntimeFireMenu};

pub struct RuntimeFoodMenu<'a> {
    pub sequence: u64,
    pub paused: bool,
    pub heat: &'a [RuntimeHeatContact],
    pub preparations: &'a [RuntimePreparation<'a>],
    pub fire: Option<RuntimeFireMenu<'a>>,
    pub eating: Option<(&'a crate::text::JsText, crate::consumption::EatingOffer<'a>)>,
}

mod equipped;
mod practice;
pub use practice::RuntimePracticeOffer;
mod ranged;
pub use ranged::RuntimeRangedChoice;

pub enum RuntimeResourceOffer<'a> {
    Gather(RuntimeGatherOffer<'a>),
    Fish(RuntimeFishOffer<'a>),
    Pickup(RuntimePickupOffer<'a>),
    Practice(RuntimePracticeOffer<'a>),
}

pub struct RuntimePickupOffer<'a> {
    pub label: &'a str,
    pub all_label: &'a str,
    pub all_description: &'a str,
    pub all_available: bool,
    pub reason: Option<&'a str>,
    pub items: &'a [RuntimePickupLot<'a>],
    pub sequence: u64,
}

pub struct RuntimePickupLot<'a> {
    pub id: &'a str,
    pub name: &'a crate::text::JsText,
    pub quantity: u64,
    pub partial_limit: Option<u64>,
}

pub struct RuntimeFishOffer<'a> {
    pub name: &'a crate::text::JsText,
    pub available_text: &'a crate::text::JsText,
    pub action_label: &'a crate::text::JsText,
    pub description: &'a crate::text::JsText,
    pub tool_required_text: &'a crate::text::JsText,
    pub supply: &'a crate::text::JsText,
    pub exhausted: bool,
    pub paused: bool,
    pub sequence: u64,
    pub tools: &'a [RuntimeFishTool<'a>],
    state: &'a crate::simulation::SimulationState,
    actor: &'a str,
    source: crate::casts::Source<'a>,
    binding: GeometryBinding,
    budget: &'a ByteBudget,
}

impl RuntimeFishOffer<'_> {
    /// Check the selected cast's one dry stance, working line, and any needed
    /// approach through the same provider as the command. No query or fact
    /// escapes the current accepted read. The caller keeps local geometry
    /// inside this callback and the finished answer funds its own backing.
    pub fn geometry_problem(
        &self,
        answer: impl FnOnce(
            &GeometryQueries,
        ) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
    ) -> Result<Option<&str>, RuntimeError> {
        let source = &self.source;
        let actor = self
            .state
            .physical
            .entities
            .get(self.actor)
            .ok_or_else(|| failure("cast actor unavailable"))?;
        let ordinary = self.state.installed.ordinary_actions.value();
        if !actor.actively_participates() {
            return Ok(Some(&ordinary.inactive.message));
        }
        if self
            .state
            .installed
            .capabilities
            .capability_blocked(Some(actor), "actions")
            .map_err(failure)?
        {
            return Ok(Some(&ordinary.actions_restricted.message));
        }
        if !actor
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated)
        {
            return Ok(Some(&ordinary.not_alive.message));
        }
        if !matches!(
            actor.placement,
            Some(crate::state::Placement::World {
                support_surface_id: Some(_),
                ..
            })
        ) {
            return Ok(Some(&ordinary.unsupported_airborne.message));
        }
        let blocked = crate::casts::messages().blocked_line;
        if !source.cast.line_is_possible(&source.rules.definition) {
            return Ok(Some(blocked));
        }
        let moving = !crate::casts::at_stance(actor, source);
        let bytes = crate::casts::check_storage(actor, source.cast)
            + if moving {
                crate::casts::approach_storage(actor, source)
            } else {
                0
            };
        let _query = self.budget.reserve(bytes)?;
        let mut request = GeometryQueries::new(self.binding);
        crate::casts::check_line(&mut request, actor, source.cast, self.budget).map_err(failure)?;
        if moving {
            request.routes = vec![crate::casts::approach(actor, source).map_err(failure)?];
        }
        let (answer, _funding) = answer(&request)?;
        request.validate_answers(&answer).map_err(failure)?;
        if answer.sight != [true] || answer.standing != [true] {
            return Ok(Some(blocked));
        }
        Ok(match answer.routes.first() {
            Some(RoutePlan::NoRoute { .. } | RoutePlan::InvalidEndpoint { .. }) => {
                Some(ordinary.no_route.message.as_str())
            }
            Some(RoutePlan::BudgetExceeded { .. }) => {
                Some(ordinary.budget_exceeded.message.as_str())
            }
            _ => None,
        })
    }
}

pub struct RuntimeFishTool<'a> {
    kind: &'a str,
    order: usize,
    pub id: &'a str,
    pub name: &'a crate::text::JsText,
}

fn fish_offer<'a, T>(
    state: &'a crate::simulation::SimulationState,
    actor: &'a str,
    name: &'a crate::text::JsText,
    source: crate::casts::Source<'a>,
    binding: GeometryBinding,
    budget: &'a ByteBudget,
    tools: &[RuntimeFishTool<'_>],
    report_exhausted: bool,
    consume: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
) -> Result<T, RuntimeError> {
    let rules = &source.rules.definition;
    let exhausted = report_exhausted && source.stock.quantity == 0;
    consume(RuntimeResourceOffer::Fish(RuntimeFishOffer {
        name,
        available_text: &rules.available_text,
        action_label: &rules.action_label,
        description: &rules.description,
        tool_required_text: &rules.tool_required_text,
        supply: if exhausted {
            &rules.exhausted_text
        } else {
            &rules.supply_unknown_text
        },
        exhausted,
        paused: state.physical.header.paused,
        sequence: state.physical.header.sequence,
        tools,
        state,
        actor,
        source,
        binding,
        budget,
    }))
}
impl RuntimePlayerPublication {
    pub fn can_use_inventory(&self) -> bool {
        self.can_use_inventory
    }
}
impl NativeWorldSession {
    /// Typed work observes only the admitted player's live body and selected
    /// action kind. The ordinary command owns all resulting cancellation.
    pub fn player_typed_stop_current(
        &self,
        account: &str,
        actor: &str,
        kind: Option<&str>,
    ) -> Result<(bool, bool), RuntimeError> {
        let current = self.session.accepted().map_err(failure)?;
        current
            .require_player_read(account, actor)
            .map_err(failure)?;
        let actor = current
            .state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("missing current actor"))?;
        let body = actor
            .actor
            .as_ref()
            .ok_or_else(|| failure("missing current actor body"))?;
        let restricted = current
            .state
            .installed
            .capabilities
            .capability_blocked(Some(actor), "actions")
            .map_err(failure)?;
        Ok((
            body.alive && !body.incapacitated && !restricted,
            kind.is_none_or(|kind| {
                body.action
                    .as_ref()
                    .is_some_and(|action| action.kind == kind)
            }),
        ))
    }

    /// Use the same current floor binding and choice/plan owners as a
    /// structured response. The plan is the effect, not an immediate walk.
    pub fn begin_player_typed_walk(
        &mut self,
        request: &str,
        account: &str,
        actor: &str,
        input: TypedWalk<'_>,
    ) -> Result<Result<CandidateKey, CoordinateRefusal>, RuntimeError> {
        self.require_active()?;
        let accepted = self.session.accepted().map_err(failure)?;
        accepted
            .require_player_read(account, actor)
            .map_err(failure)?;
        let (surface, y) = match crate::commands::invocation::installed_coordinate(
            &accepted.state.installed,
            input.x,
            input.z,
            input.support,
        ) {
            Ok(value) => value,
            Err(reason) => return Ok(Err(reason)),
        };
        let watch = match input.watch {
            Some((watch, subject)) => {
                let bytes = subject
                    .len()
                    .checked_add(watch.place_id.len())
                    .and_then(|bytes| {
                        bytes
                            .checked_add(size_of::<(crate::plans::WatchRequest, ByteReservation)>())
                    })
                    .ok_or(CapacityError)?;
                let custody = self.budget.reserve(bytes)?;
                Some(Box::new((
                    crate::plans::WatchRequest {
                        subject_id: subject.to_owned(),
                        place_id: watch.place_id.clone(),
                        trigger: watch.trigger,
                        until: watch.until,
                    },
                    custody,
                )))
            }
            None => None,
        };
        let _surface = self.budget.reserve(surface.len())?;
        let point = crate::state::SurfacePoint {
            x: input.x,
            y,
            z: input.z,
            surface_id: surface.into(),
        };
        self.begin_bound_player_command(
            request,
            actor,
            RuntimePlayerCommand::Move(&point),
            false,
            None,
            Some(crate::plans::TypedPlan {
                mode: input.mode,
                watch,
            }),
        )
        .map(Ok)
    }

    /// Admit a decoded browser movement or stop on the same command journal
    /// used by the bridge. Authorization and receipt lookup belong to the
    /// application caller. Only the saved learner record and replay signature
    /// are encoded. The cursor independently admits the retained command.
    pub fn begin_player_command(
        &mut self,
        id: &str,
        actor: &str,
        command: RuntimePlayerCommand<'_>,
        preview: bool,
    ) -> Result<CandidateKey, RuntimeError> {
        self.begin_player_command_with_materials(id, actor, command, preview, None)
    }

    pub fn begin_player_command_with_materials(
        &mut self,
        id: &str,
        actor: &str,
        command: RuntimePlayerCommand<'_>,
        preview: bool,
        materials: Option<std::sync::Arc<crate::construction_gather::MaterialGrants>>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.begin_bound_player_command(id, actor, command, preview, materials, None)
    }

    fn begin_bound_player_command(
        &mut self,
        id: &str,
        actor: &str,
        command: RuntimePlayerCommand<'_>,
        preview: bool,
        materials: Option<std::sync::Arc<crate::construction_gather::MaterialGrants>>,
        plan: Option<crate::plans::TypedPlan>,
    ) -> Result<CandidateKey, RuntimeError> {
        self.require_active()?;
        // Size the live input copies and both small escaped JSON records.
        let bytes = id
            .len()
            .checked_add(actor.len())
            .and_then(|n| n.checked_add(command.selected_text_bytes()))
            .and_then(|n| n.checked_mul(24))
            .and_then(|n| n.checked_add(4096))
            .ok_or(CapacityError)?;
        let _workspace = self.budget.reserve(bytes)?;
        let strike = match command {
            RuntimePlayerCommand::Strike {
                permission,
                equipment_revision,
                timed_begin,
                ..
            } => Some(crate::contact::review::PlayerStrike {
                permission,
                equipment_revision,
                execution: timed_begin.then_some(crate::attack_execution::PlayerAttackInput::Begin),
            }),
            RuntimePlayerCommand::RangedStart {
                permission,
                timed_begin,
                ..
            } => Some(crate::contact::review::PlayerStrike {
                permission,
                equipment_revision: None,
                execution: timed_begin.then_some(crate::attack_execution::PlayerAttackInput::Begin),
            }),
            RuntimePlayerCommand::RangedRelease {
                permission,
                input,
                may_wait,
                ..
            }
            | RuntimePlayerCommand::ReleaseStrike {
                permission,
                input,
                may_wait,
                ..
            } => Some(crate::contact::review::PlayerStrike {
                permission,
                equipment_revision: None,
                execution: Some(crate::attack_execution::PlayerAttackInput::Release {
                    input,
                    may_wait,
                }),
            }),
            _ => None,
        };
        let trade_evidence = match command {
            RuntimePlayerCommand::Handover { evidence, .. } => evidence.cloned(),
            _ => None,
        };
        let input = command.bind(id, actor).map_err(failure)?;
        self.session
            .begin_command_with_plan(
                crate::commands::CommandStart::Player(input),
                crate::commands::CommandOptions {
                    preview,
                    native_controller: false,
                    native_movement: None,
                    trade_evidence,
                    durable_receipt: !preview,
                },
                crate::construction_gather::ConstructionGather::for_command(materials),
                plan,
                strike,
            )
            .map_err(session_failure)
    }

    /// The application verifies external catalog retention before adopting
    /// the cold writer. Simulation does not interpret these asset references.
    pub fn saved_presentation_release(&self) -> (Option<&RawValue>, Option<u64>) {
        let host = self.session.player_view_settings();
        (
            host.presentation_release.as_deref(),
            host.presentation_release_revision,
        )
    }

    pub fn player_input(&self, input: &[u8]) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: PlayerInputRequest = serde_json::from_slice(input).map_err(failure)?;
        let facts = self.player_input_direct(&input.account_id, &input.actor_id)?;
        RuntimeJson::encode(&facts, &self.budget)
    }

    /// Reuse authoritative binding, life and steering predicates without
    /// preparing presentation, observation history or an addon packet.
    pub fn player_input_direct(
        &self,
        account: &str,
        actor: &str,
    ) -> Result<RuntimePlayerInputState, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .player_input(account, actor)
            .map_err(failure)
    }
    /// Borrow the current controlled preparation without any presentation,
    /// inventory, sensory work or allocation.
    pub fn with_player_attack<T>(
        &self,
        account: &str,
        actor: &str,
        read: impl FnOnce(Option<(&str, bool)>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .with_player_attack(account, actor, read)
            .map_err(failure)
    }

    pub fn player_interaction(
        &self,
        read: &RuntimePlayerRead,
        input: &[u8],
    ) -> Result<RuntimeJson, RuntimeError> {
        self.require_active()?;
        let _decode = decode_preparation(input, &self.budget)?;
        let input: PlayerInteractionInput = serde_json::from_slice(input).map_err(failure)?;
        if input
            .target_id
            .as_deref()
            .is_some_and(|id| !crate::values::is_safe_record_id(id))
            || input
                .utterance_event_id
                .as_deref()
                .is_some_and(|id| !crate::values::is_safe_record_id(id))
        {
            return Err(failure("invalid selected interaction recipient"));
        }
        self.with_player_interaction(
            &read.account,
            &read.actor,
            input.mode,
            input.target_id.as_deref(),
            input.utterance_event_id.as_deref(),
            |facts| RuntimeJson::encode(&facts, &self.budget),
        )?
    }

    /// Resolve the same current and remembered roles emitted to the browser,
    /// without preparing history or presentation control geometry. Only a
    /// caller-funded selection may survive the accepted read.
    pub fn with_player_targets(
        &self,
        account: &str,
        actor: &str,
        body: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
        person: impl FnMut(&str) -> bool,
    ) -> Result<(), RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .with_player_targets(account, actor, &self.budget, body, person)
            .map_err(failure)
    }

    /// Visit one currently permitted counterpart and its originally received
    /// gift terms. The same synchronous lease also protects the player's
    /// own direct stock. The callback encodes or funds any retained result.
    pub fn with_player_gift_trade<T>(
        &self,
        account: &str,
        actor: &str,
        mut matches: impl FnMut(&crate::capture::PlayerObservedBody<'_>) -> bool,
        consume: impl FnOnce(crate::handover::GiftRead<'_>, &ByteBudget) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        use crate::handover::{
            GiftRead, GiftReadLot, GiftReadOffer, ReceivedGifts, trade_offer_current,
            trade_offer_receivable,
        };
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let state = &simulation.state;
        let mut consume = Some(consume);
        let mut result = None;
        simulation
            .visit_accepted_player_contacts(account, actor, &self.budget, |body| {
                if !body.trade_eligible || !matches(&body) {
                    return false;
                }
                result = Some((|| {
                    let gifts =
                        ReceivedGifts::from_player(state, actor, &self.budget).map_err(failure)?;
                    let count = crate::worlds::base_handover::GIFT_COPY.candidate_lots;
                    let bytes = count
                        .checked_mul(size_of::<GiftReadLot>())
                        .and_then(|bytes| {
                            bytes.checked_add(
                                gifts
                                    .with_party(body.source_id)
                                    .count()
                                    .checked_mul(size_of::<GiftReadOffer>())?,
                            )
                        })
                        .ok_or(CapacityError)?;
                    let _storage = self.budget.reserve(bytes)?;
                    let mut owned = Vec::with_capacity(count);
                    state
                        .inventory
                        .visit_owned_until(
                            &state.physical.entities,
                            actor,
                            actor,
                            &mut |entity, accessible| {
                                let Some(lot) = &entity.item else {
                                    return Ok(false);
                                };
                                let held = state.physical.holds.quantity(&entity.id);
                                let Ok(definition) = crate::handover::transferable_lot(
                                    state,
                                    actor,
                                    entity,
                                    lot.quantity.saturating_sub(held),
                                ) else {
                                    return Ok(false);
                                };
                                let item = crate::install::project_owned(
                                    &state.installed.retained,
                                    actor,
                                    entity,
                                    accessible,
                                    held,
                                )?;
                                owned.push(GiftReadLot {
                                    item,
                                    description: definition.description.as_ref(),
                                    whole: !crate::execution::partitionable_stock(
                                        entity, definition,
                                    ),
                                    contents_revision: entity
                                        .container
                                        .as_ref()
                                        .map(|_| entity.inventory_revision.unwrap_or_default()),
                                });
                                Ok(owned.len() == count)
                            },
                        )
                        .map_err(failure)?;
                    let other = body.source_id;
                    let all = gifts
                        .with_party(other)
                        .map(|disclosed| {
                            let can_accept = disclosed.offer.recipient_id == actor
                                && state.physical.gifts.get(&disclosed.offer.id).is_some_and(
                                    |current| {
                                        current.revision == disclosed.offer.revision
                                            && current.expires_at > state.physical.header.sim_time
                                            && trade_offer_current(state, current)
                                            && trade_offer_receivable(state, current)
                                    },
                                );
                            GiftReadOffer {
                                disclosed,
                                can_accept,
                            }
                        })
                        .collect::<Vec<_>>();
                    consume.take().expect("one accepted gift selection")(
                        GiftRead {
                            counterpart: body,
                            owned: &owned,
                            offers: &all,
                        },
                        &self.budget,
                    )
                })());
                true
            })
            .map_err(failure)?;
        result.transpose()
    }

    /// Match a signed current contact without reading remembered people.
    /// The callback owns the custody of anything it retains from the read.
    pub fn with_player_contacts(
        &self,
        account: &str,
        actor: &str,
        body: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
    ) -> Result<bool, RuntimeError> {
        self.require_active()?;
        self.session
            .accepted()
            .map_err(failure)?
            .with_player_contacts(account, actor, &self.budget, body)
            .map_err(failure)
    }

    /// Resolve one observed resource under the current disclosure lease. Only
    /// a selected cast visits this player's accessible possessions. The offer
    /// borrows current facts; callers encode or independently fund their output
    /// before leaving the callback.
    pub fn with_player_resource_offer<T>(
        &self,
        account: &str,
        actor: &str,
        matches: impl FnMut(&crate::capture::PlayerObservedBody<'_>) -> bool,
        use_offer: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.with_resource_offer_for(account, actor, None, matches, use_offer)
    }

    /// Read only the existing resource choices which can use this exact held
    /// tool. The caller has selected it under this same accepted world turn.
    pub fn with_player_equipped_resource_offer<T>(
        &self,
        account: &str,
        actor: &str,
        equipment: &str,
        matches: impl FnMut(&crate::capture::PlayerObservedBody<'_>) -> bool,
        use_offer: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.with_resource_offer_for(account, actor, Some(equipment), matches, use_offer)
    }

    fn with_resource_offer_for<T>(
        &self,
        account: &str,
        actor: &str,
        equipment: Option<&str>,
        mut matches: impl FnMut(&crate::capture::PlayerObservedBody<'_>) -> bool,
        use_offer: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let mut encode = Some(use_offer);
        let mut result = None;
        simulation
            .visit_accepted_player_contacts(account, actor, &self.budget, |body| {
                let Some(crate::reception::SensoryFacet::Body { body: observed }) =
                    body.body_facet().map(|facet| &facet.value)
                else {
                    return false;
                };
                let name = &body.name.name;
                let id = body.source_id;
                let state = &simulation.state;
                if equipment.is_none() && pickup::observed_source(state, observed) {
                    if !matches(&body) {
                        return false;
                    }
                    match pickup::PickupRead::current(state, actor, &body, &self.budget) {
                        Ok(Some(read)) => {
                            let encode = encode.take().expect("one selected source");
                            result = Some(read.render(&self.budget, encode));
                        }
                        Ok(None) => {}
                        Err(error) => result = Some(Err(error)),
                    }
                    return true;
                }
                if let Some(target) = state
                    .physical
                    .entities
                    .get(id)
                    .filter(|target| target.practice_target.is_some())
                {
                    if !matches(&body) {
                        return false;
                    }
                    let encode = encode.take().expect("one selected source");
                    result = Some(practice::offer(
                        state,
                        actor,
                        &body.name,
                        target,
                        equipment,
                        &self.budget,
                        encode,
                    ));
                    return true;
                }
                if observed.kind != "resource" || !matches(&body) {
                    return false;
                }
                if equipment.is_none()
                    && let Some(source) = crate::casts::source(state, id)
                {
                    let encode = encode.take().expect("one selected source");
                    result = Some((|| {
                        let tools = catalogue::FishTools::prepare(
                            state,
                            actor,
                            Some(&source.rules.definition.tool_kind),
                            &self.budget,
                        )?;
                        let binding = catalogue::cast_geometry_binding(
                            state,
                            self.session.operational_generation(),
                        );
                        let selected = tools.for_kind(&source.rules.definition.tool_kind);
                        fish_offer(
                            state,
                            actor,
                            name,
                            source,
                            binding,
                            &self.budget,
                            selected,
                            true,
                            encode,
                        )
                    })());
                    return true;
                }
                let Some((gathering, quantity)) = menu_gathering(state, &body) else {
                    return false;
                };
                let encode = encode.take().expect("one selected source");
                result = (|| {
                    let actor = gathering_actor(state, actor)?;
                    let mut amount = gathering.base_yield;
                    if let Some(item) = equipment {
                        let Some((_, count)) = crate::gathering::exact_tool(
                            state,
                            actor.id,
                            item,
                            crate::gathering::GatheringMode::EquippedTool,
                            &gathering.definition.pin.id,
                        )
                        .map_err(failure)?
                        else {
                            return Ok(None);
                        };
                        amount = amount.max(count);
                    } else {
                        crate::gathering::visit_tool_yields(state, actor.id, |material, count| {
                            if material == gathering.definition.pin.id {
                                amount = amount.max(count);
                            }
                            Ok(())
                        })
                        .map_err(failure)?;
                    }
                    encode(RuntimeResourceOffer::Gather(gather_menu_offer(
                        state, &body, gathering, quantity, actor, amount,
                    )))
                    .map(Some)
                })()
                .transpose();
                true
            })
            .map_err(failure)?;
        result.transpose()
    }

    /// Publish an empty ground catalogue from the current permitted actor cut.
    /// The point is presentational here. Actual movement owns physical validation.
    pub fn with_player_ground_catalogue<T>(
        &self,
        account: &str,
        actor: &str,
        publish: impl FnOnce(u64) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        publish(simulation.state.physical.header.sequence)
    }

    /// Check stock only for the exact contact already matched by the caller
    /// in this actor's current contact read. No second view or inspection is
    /// acquired. Final movement, reach and transfer checks remain in Pickup.
    pub fn pickup_contact_allows(
        &self,
        actor: &str,
        contact: &crate::capture::PlayerObservedBody<'_>,
        item: Option<&str>,
    ) -> Result<bool, RuntimeError> {
        let accepted = self.session.accepted().map_err(failure)?;
        Ok(
            pickup::PickupRead::current(&accepted.state, actor, contact, &self.budget)?
                .is_some_and(|read| read.allows(item)),
        )
    }

    /// Admit a menu for one currently observed person. Borrow installed
    /// offers and the permitted name through synchronous publication. Primary
    /// action rechecks skip manual-only Follow and teaching rows.
    pub fn with_player_contact_menu<T>(
        &self,
        account: &str,
        actor: &str,
        detail_choices: bool,
        matches: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
        use_menu: impl FnOnce(RuntimeContactMenu<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.with_contact_menu_for(account, actor, detail_choices, None, matches, use_menu)
    }

    /// The exact held-tool shortcut has no lessons or automatic equipment
    /// choices. Ranged preparation binds the original first matching lot.
    pub fn with_player_equipped_contact_menu<T>(
        &self,
        account: &str,
        actor: &str,
        equipment: &str,
        matches: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
        use_menu: impl FnOnce(RuntimeContactMenu<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.with_contact_menu_for(account, actor, false, Some(equipment), matches, use_menu)
    }

    fn with_contact_menu_for<T>(
        &self,
        account: &str,
        actor: &str,
        detail_choices: bool,
        equipment: Option<&str>,
        mut matches: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
        use_menu: impl FnOnce(RuntimeContactMenu<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let state = &simulation.state;
        let Some(source) = state.physical.entities.get(actor) else {
            return Ok(None);
        };
        if !source
            .actor
            .as_ref()
            .is_some_and(|a| a.controller == "player")
        {
            return Ok(None);
        }
        let may_act = !state
            .installed
            .capabilities
            .capability_blocked(Some(source), "actions")
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let mut result = None;
        let mut use_menu = Some(use_menu);
        simulation
            .visit_accepted_player_contacts(account, actor, &self.budget, |observed| {
                let observed_name = observed.name;
                let name = &observed_name.name;
                let Some(target) = current_actor_target(state, source, &observed) else {
                    return false;
                };
                use crate::reception::SensoryFacet;
                let Some(SensoryFacet::Body { body }) = observed.body_facet().map(|f| &f.value)
                else {
                    return false;
                };
                let health = observed.facets().find_map(|facet| match &facet.value {
                    SensoryFacet::PublicAttributes { attributes } => attributes
                        .iter()
                        .find(|value| value.body_health == Some(true)),
                    _ => None,
                });
                let life = observed.physical_life;
                if !matches(observed) {
                    return false;
                }
                let may_attack = may_act
                    && life.is_some_and(|life| {
                        crate::contact::may_target(&state.installed, source, target, life)
                    });
                let ranged = if may_attack {
                    match ranged::choices(
                        state,
                        source,
                        target,
                        observed_name,
                        equipment,
                        &self.budget,
                    ) {
                        Ok(value) => Some(value),
                        Err(error) => {
                            result = Some(Err(failure(error)));
                            return true;
                        }
                    }
                } else {
                    None
                };
                let follow = if detail_choices {
                    match follow_availability(state, source, may_act) {
                        Ok(offer) => offer.map(|offer| offer.with_name(name)),
                        Err(error) => {
                            result = Some(Err(error));
                            return true;
                        }
                    }
                } else {
                    None
                };
                let choice = RuntimeContactMenu {
                    state,
                    source,
                    target,
                    body,
                    health,
                    may_act,
                    may_attack,
                    follow,
                    teaching: (detail_choices && teaching::has_offers(state, source, target)).then(
                        || {
                            GeometryBinding::new(
                                CandidateKey {
                                    id: 0,
                                    base_cut: state.accepted_cut,
                                    generation: self.session.operational_generation(),
                                },
                                state.installed.geometry.spatial.revision,
                                0,
                            )
                        },
                    ),
                    name,
                    ranged: ranged
                        .as_ref()
                        .map_or(&[], |(choices, _)| choices.as_slice()),
                };
                if may_attack
                    || choice.teaching.is_some()
                    || choice.follow.is_some()
                    || choice.encounter().is_some()
                    || (may_act && choice.guard_shields().next().is_some())
                {
                    result = Some(use_menu.take().expect("one selected contact")(choice));
                }
                true
            })
            .map_err(failure)?;
        result.transpose()
    }

    /// Select the exact owned roles once and reuse them across received fires.
    /// The borrower must produce any menu bytes under the same disclosure lease.
    pub fn with_player_food_menu<T>(
        &self,
        account: &str,
        actor: &str,
        item: Option<&str>,
        mut contact: impl FnMut(
            crate::capture::PlayerObservedBody<'_>,
        ) -> Result<Option<String>, RuntimeError>,
        compute: impl FnOnce(
            &GeometryQueries,
        ) -> Result<(GeometryAnswers, ByteReservation), RuntimeError>,
        use_menu: impl FnOnce(RuntimeFoodMenu<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let state = &simulation.state;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let installed = &state.installed;
        let selected = if let Some(item) = item {
            let Some(selected) =
                crate::install::owned_by(&state.physical, &installed.retained, actor, item)
                    .map_err(failure)?
            else {
                return Ok(None);
            };
            Some(selected)
        } else {
            None
        };
        let eating = if let Some(item) = selected {
            EatingRead::current(state, actor)?
                .map(|read| read.offer(item))
                .transpose()
                .map_err(failure)?
                .flatten()
        } else {
            None
        };
        let has_preparation = installed.retained.preparations.values().any(|recipe| {
            selected.is_none_or(|lot| {
                recipe
                    .definition
                    .inputs
                    .iter()
                    .any(|input| input.definition_id == lot.definition_id)
            })
        });
        let fire_rule = installed.fire_care.as_ref().filter(|_| item.is_none());
        if !has_preparation && fire_rule.is_none() {
            let Some(eating) = eating else {
                return Ok(None);
            };
            simulation
                .require_player_owner(account, actor)
                .map_err(failure)?;
            return use_menu(RuntimeFoodMenu {
                sequence: state.physical.header.sequence,
                paused: state.physical.header.paused,
                preparations: &[],
                heat: &[],
                eating: Some(eating),
                fire: None,
            })
            .map(Some);
        }
        let mut heat = Vec::new();
        let mut selected_fire = None;
        let mut storage = self.budget.reserve(0)?;
        let mut error = None;
        simulation
            .visit_accepted_player_contacts(account, actor, &self.budget, |body| {
                let Some(crate::reception::SensoryFacet::Body { body: observed }) =
                    body.body_facet().map(|facet| &facet.value)
                else {
                    return false;
                };
                let Some(lit) = observed.heat_lit else {
                    return false;
                };
                let name = &body.name.name;
                // Reference issuance and allocation both happen in this closure.
                let next = (|| -> Result<bool, RuntimeError> {
                    // The exact selected contact is also the disclosure cut for
                    // its coarse fuel label. An old/lost body cannot read live heat.
                    let current_fire = fire_rule
                        .and_then(|_| crate::fire_care::target(&state.physical, body.source_id))
                        .filter(|fire| fire.physical_life() == body.physical_life);
                    let Some(target) = contact(body)? else {
                        return Ok(false);
                    };
                    storage.resize(
                        storage
                            .bytes()
                            .checked_add(
                                4 * std::mem::size_of::<RuntimeHeatContact>()
                                    + target.len()
                                    + name.storage_bytes(),
                            )
                            .ok_or(crate::host::CapacityError)?,
                    )?;
                    selected_fire = current_fire;
                    heat.push(RuntimeHeatContact {
                        target,
                        name: name.clone(),
                        lit,
                    });
                    Ok(item.is_none())
                })();
                match next {
                    Ok(done) => done,
                    Err(problem) => {
                        error = Some(problem);
                        true
                    }
                }
            })
            .map_err(failure)?;
        if let Some(error) = error {
            return Err(error);
        }
        if heat.is_empty() && item.is_none() {
            return Ok(None);
        }
        let fire = if let Some((fire, rule)) = selected_fire.zip(fire_rule) {
            let binding = GeometryBinding::new(
                CandidateKey {
                    id: 0,
                    base_cut: state.accepted_cut,
                    generation: self.session.operational_generation(),
                },
                installed.geometry.spatial.revision,
                0,
            );
            let sight = crate::reception::SightBatch::prepare(
                &state.physical,
                installed,
                actor,
                &[&fire.id],
                binding,
                &self.budget,
            )
            .map_err(failure)?;
            let (answer, _storage) = compute(sight.queries())?;
            if sight.finish(answer).map_err(failure)?.seen(&fire.id) == Some(true) {
                Some(fire::choices(
                    state,
                    rule.value(),
                    actor,
                    fire,
                    &self.budget,
                )?)
            } else {
                None
            }
        } else {
            None
        };
        let choices = has_preparation
            .then(|| crate::food_preparation::choices(state, actor, item, &self.budget))
            .transpose()
            .map_err(failure)?;
        let choices = choices
            .as_ref()
            .map_or(&[][..], |choices| choices.rows.as_slice());
        let _rows = self.budget.reserve(
            choices
                .len()
                .checked_mul(std::mem::size_of::<RuntimePreparation<'_>>())
                .ok_or(crate::host::CapacityError)?,
        )?;
        let rows: Vec<_> = choices
            .iter()
            .map(|choice| RuntimePreparation {
                pin: &choice.recipe.pin,
                name: &choice.recipe.definition.name,
                description: &choice.recipe.definition.description,
                inputs: choice.inputs.as_ref(),
            })
            .collect();
        use_menu(RuntimeFoodMenu {
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
            heat: &heat,
            preparations: &rows,
            fire,
            eating,
        })
        .map(Some)
    }

    /// Inspect the authoritative actor, recipient and payer in one accepted
    /// read. The callback must fund anything it retains past the read.
    pub fn with_player_interaction<T>(
        &self,
        account: &str,
        actor: &str,
        mode: InteractionMode,
        target: Option<&str>,
        utterance: Option<&str>,
        consume: impl FnOnce(PlayerInteractionFacts<'_>) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let facts = self
            .session
            .accepted()
            .map_err(failure)?
            .player_interaction(account, actor, mode, target, &self.budget, utterance)
            .map_err(failure)?;
        Ok(consume(facts))
    }
    pub fn read_player(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
    ) -> Result<RuntimePlayerRead, RuntimeError> {
        self.read_player_via(account, actor, event_window, false, |simulation, _, budget| {
            simulation
                .read_player(account, actor, budget)
                .map(|read| (read, ()))
        })
        .map(|(read, ())| read)
    }

    /// Prepare only the caller's independently funded representation of the
    /// self fields. Other permitted evidence and the final disclosure fence
    /// remain on exactly the same actor cut as the encoded facade.
    pub fn read_player_direct<T>(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
        prepare: impl FnOnce(PlayerSelfFacts<'_>, RuntimeClock, &ByteBudget) -> Result<T, CapacityError>,
    ) -> Result<(RuntimePlayerRead, T), RuntimeError> {
        self.read_player_via(account, actor, event_window, true, |simulation, clock, budget| {
            simulation.read_player_direct(account, actor, budget, |facts, budget| {
                prepare(facts, clock, budget)
            })
        })
    }

    fn read_player_via<T>(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
        app_view: bool,
        capture: impl FnOnce(
            &crate::simulation::Simulation,
            RuntimeClock,
            &ByteBudget,
        )
            -> Result<(AcceptedActorRead, T), crate::simulation::ActorReadError>,
    ) -> Result<(RuntimePlayerRead, T), RuntimeError> {
        self.require_active()?;
        let clock = self.clock()?;
        let serial = self
            .next_read_serial
            .checked_add(1)
            .filter(|serial| *serial <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or_else(|| failure("read identity exhausted"))?;
        let simulation = self.session.accepted().map_err(failure)?;
        let (read, prepared) = capture(simulation, clock, &self.budget).map_err(failure)?;
        let events = simulation
            .read_player_events(account, actor, event_window, app_view, &self.budget)
            .map_err(failure)?;
        let state = &simulation.state;
        let view_source = app_view
            .then(|| capture_view_source(&self.session, state, actor, &read, &self.budget))
            .transpose()?;
        let outings = if app_view && state.installed.travel && state.outings.has_rows() {
            crate::outings::view::PreparedOutings::prepare(state, actor, &self.budget)
                .map_err(failure)?
        } else {
            None
        };
        let binding = GeometryBinding::new(
            CandidateKey {
                id: 0,
                base_cut: state.accepted_cut,
                generation: self.session.operational_generation(),
            },
            state.installed.geometry.spatial.revision,
            serial,
        );
        let preparation = PlayerControlPreparation::prepare(state, actor, binding, &self.budget)
            .map_err(failure)?;
        let custody = self
            .budget
            .reserve(
                size_of::<RuntimePlayerRead>()
                    .checked_add(account.len())
                    .and_then(|n| n.checked_add(actor.len()))
                    .ok_or_else(|| failure("capacity"))?,
            )
            .map_err(failure)?;
        self.next_read_serial = serial;
        let (preparation, controls) = if preparation.queries().is_empty() {
            (
                None,
                Some(preparation.finish_without_geometry().map_err(failure)?),
            )
        } else {
            (Some(preparation), None)
        };
        Ok((
            RuntimePlayerRead {
                account: account.to_owned(),
                actor: actor.to_owned(),
                read,
                events,
                preparation,
                controls,
                clock,
                view_source,
                narrator: None,
                outings,
                _custody: custody,
            },
            prepared,
        ))
    }
    /// Called in the serialized publication lane. The returned gate excludes
    /// native acceptance only until Node's immediate operational check/send.
    /// It is not held during asynchronous view construction or socket draining.
    pub fn player_publication(
        &self,
        read: &RuntimePlayerRead,
        selected_event_ids: &[String],
        paused: bool,
        controlling: bool,
    ) -> Result<Option<RuntimePlayerPublication>, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        if read.controls.is_none() {
            return Err(failure("player control preparation is unfinished"));
        }
        if let Some(source) = &read.view_source {
            let current = self.session.player_view_settings();
            let current_release = current.presentation_release.as_deref().map(RawValue::get);
            if current_release != source.presentation_release().map(RawValue::get)
                || current.presentation_release_revision != source.presentation_release_revision
            {
                return Ok(None);
            }
        }
        if read
            .outings
            .as_ref()
            .is_some_and(|values| !values.current(&simulation.state, &read.actor))
        {
            return Ok(None);
        }
        if let Some(narrator) = &read.narrator {
            let state = &simulation.state;
            let privacy = state
                .experience
                .actor(&read.actor)
                .map_or(0, |actor| actor.privacy.revision());
            let recent = state
                .installed
                .attention
                .value()
                .retention
                .recent
                .max_age_seconds;
            if narrator.privacy_revision != privacy
                || !super::private_history::durable_temporal_current(
                    state,
                    &read.actor,
                    narrator.temporal.iter().map(|(receipt, at)| (receipt, *at)),
                )
                || narrator.temporal.iter().any(|(_, at)| {
                    !crate::received::temporal_recent_at(
                        *at,
                        state.physical.header.sim_time,
                        recent,
                    )
                })
            {
                return Ok(None);
            }
        }
        if !simulation
            .player_read_still_permitted(&read.account, &read.actor, &read.read)
            .map_err(failure)?
            || !simulation
                .player_events_still_permitted(
                    &read.account,
                    &read.actor,
                    &read.events,
                    selected_event_ids,
                    &self.budget,
                )
                .map_err(failure)?
        {
            return Ok(None);
        }
        let can_use_inventory = simulation
            .player_inventory_available(&read.account, &read.actor, paused, controlling)
            .map_err(failure)?;
        let lease = self.session.fence().begin_publication().map_err(failure)?;
        Ok(Some(RuntimePlayerPublication {
            can_use_inventory,
            _lease: lease,
        }))
    }
}
impl RuntimePlayerRead {
    /// The application takes the independently funded view. The same read
    /// retains only its exact source/consent proof until disclosure.
    pub fn take_outings(&mut self) -> Option<crate::outings::view::OutingViews> {
        self.outings.as_mut()?.views.take()
    }

    /// The exact accepted owner for a host control preview prepared after
    /// capturing this view. No other caller may infer authority from the cut.
    pub fn accepted_cut(&self) -> u64 {
        self.read.accepted_cut
    }

    /// Attach the stored narrator's exact personal-source witness to this
    /// already selected view. The physical reader owns a separate small copy
    /// until the final native disclosure or the caller drops this attempt.
    pub fn bind_narrator(
        &mut self,
        privacy_revision: u64,
        temporal: &[(crate::received::TemporalReceiptLocator, f64)],
        budget: &ByteBudget,
    ) -> Result<bool, RuntimeError> {
        if self.narrator.is_some() {
            return Err(failure("narration already bound"));
        }
        let view = self.view_source()?;
        if privacy_revision != view.privacy_revision
            || temporal.iter().any(|(receipt, at)| {
                receipt.actor_id != self.actor
                    || !crate::received::temporal_recent_at(
                        *at,
                        self.clock.at,
                        view.recent_story_age,
                    )
            })
        {
            return Ok(false);
        }
        let bytes = temporal
            .iter()
            .try_fold(0usize, |used, (receipt, _)| {
                used.checked_add(std::mem::size_of::<(
                    crate::received::TemporalReceiptLocator,
                    f64,
                )>())?
                .checked_add(receipt.actor_id.len())?
                .checked_add(receipt.epoch.len())
            })
            .ok_or_else(|| failure("narration source capacity"))?;
        let custody = budget.reserve(bytes)?;
        self.narrator = Some(RuntimeNarratorFence {
            privacy_revision,
            temporal: temporal.to_vec(),
            _custody: custody,
        });
        Ok(true)
    }

    pub fn view_source(&self) -> Result<&RuntimePlayerViewSource, RuntimeError> {
        self.view_source
            .as_ref()
            .ok_or_else(|| failure("application view metadata was not captured"))
    }
    /// These controls and clock came from the accepted cut used for the view.
    pub fn clock(&self) -> RuntimeClock {
        self.clock
    }

    /// Compare the scope retained by this capture without exposing its IDs or
    /// granting current permission to disclose it.
    pub fn belongs_to(&self, account: &str, actor: &str) -> bool {
        self.account == account && self.actor == actor
    }

    /// Borrow this reader's independently funded accounts at its exact cut.
    /// The original evidence remains pinned until the read ends. Pass every
    /// selected event ID to `player_publication` for final current disclosure.
    pub fn events(&self) -> Result<crate::experience::PlayerEventRead<'_>, RuntimeError> {
        self.events
            .read()
            .ok_or_else(|| failure("this player view has encoded events"))
    }

    /// Use the same completed cut as the encoded caller. Missing geometry is
    /// an unfinished operation, never an implicitly unavailable control.
    pub fn control_facts(&self) -> Result<&PlayerControlFacts, RuntimeError> {
        self.controls
            .as_ref()
            .map(CapturedPlayerControls::facts)
            .ok_or_else(|| failure("control geometry is still required"))
    }

    /// Borrow only the selected, ordered current contacts and their existing
    /// evidence. No JSON, body copies or additional world lookups are involved.
    pub fn perception(&self) -> Result<PlayerPerception<'_>, RuntimeError> {
        PlayerPerception::new(&self.read.perception).map_err(failure)
    }

    /// The capture owns this immutable input through its control preparation.
    pub fn control_queries(&self) -> Option<&crate::geometry::GeometryQueries> {
        self.preparation
            .as_ref()
            .map(PlayerControlPreparation::queries)
    }

    /// Reuse the control validator with a typed physical answer instead of
    /// serializing its path through the addon.
    pub fn finish_controls_direct(
        &mut self,
        answers: GeometryAnswers,
        custody: ByteReservation,
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        if !budget.owns(&custody) || !custody.shares_owner(&self._custody) {
            return Err(failure("control answer belongs to another native budget"));
        }
        let result = self.apply_controls(answers);
        drop(custody);
        result
    }

    fn apply_controls(&mut self, answers: GeometryAnswers) -> Result<(), RuntimeError> {
        let preparation = self
            .preparation
            .take()
            .ok_or_else(|| failure("control preparation already finished"))?;
        self.controls = Some(preparation.finish(answers).map_err(failure)?);
        Ok(())
    }
    pub fn packet(&self, budget: &ByteBudget) -> Result<RuntimeJson, RuntimeError> {
        let own = self
            .read
            .encoded_self()
            .ok_or_else(|| failure("this player read supplied its self facts directly"))?;
        let controls = self
            .controls
            .as_ref()
            .ok_or_else(|| failure("control geometry is still required"))?;
        let (perception, _perception_custody) = self
            .read
            .perception
            .write_json(budget)
            .map_err(|error| session_failure(error.into()))?;
        let (controls, _controls_custody) = controls
            .write_json(budget)
            .map_err(|error| session_failure(error.into()))?;
        let events = self
            .events
            .json()
            .ok_or_else(|| failure("this player read supplied events directly"))?;
        // Every member is already encoded by its semantic owner. Joining those
        // complete encodings avoids decoding a private graph just to re-encode it.
        let parts = [
            b"{\"self\":".as_slice(),
            own.as_bytes(),
            b",\"perception\":",
            perception.as_bytes(),
            b",\"events\":",
            events.as_bytes(),
            b",\"controls\":",
            controls.as_bytes(),
            b"}",
        ];
        RuntimeJson::join(&parts, budget)
    }
}

fn capture_view_source(
    session: &crate::simulation::Session,
    state: &crate::simulation::SimulationState,
    actor: &str,
    read: &AcceptedActorRead,
    budget: &ByteBudget,
) -> Result<RuntimePlayerViewSource, RuntimeError> {
    use crate::host::retained_size::map_storage;
    let host = session.player_view_settings();
    let milestones = host
        .actor_milestones
        .as_ref()
        .and_then(|rows| rows.get(actor));
    let storage = crate::ground_items::inspection::WorldStorage::inspected_selection(state, actor);
    let world_storage = if let Some(storage) = storage {
        // An inner page stays anchored to the previously received root and
        // does not take a fresh presentation or reveal that root's contents.
        let current = PlayerPerception::new(&read.perception)
            .map_err(failure)?
            .bodies()
            .flatten()
            .find(|contact| contact.source_id == storage.root.id)
            .is_some_and(|contact| world_storage::observed_storage_matches(&storage, &contact));
        if current {
            storage.inspection(budget).map_err(failure)?.map(|page| {
                (
                    storage.root.id.as_str(),
                    storage.root.inventory_revision.unwrap_or_default(),
                    storage.container.id.as_str(),
                    page,
                )
            })
        } else {
            None
        }
    } else {
        None
    };
    let inventory_revision = state.administration.object_membership.revision;
    // The inspected root is already bound to this reader's current page,
    // placement and privacy scope. No other pile's changes enter this view.
    let inventory_detail_revision = [
        inventory_revision,
        state.inventory.material_detail_revision(actor),
        world_storage.map_or(0, |(_, _, container, _)| {
            state.inventory.material_detail_revision(container)
        }),
    ];
    let bytes = milestones
        .map_or(Some(0), |rows| {
            rows.keys()
                .try_fold(map_storage::<String, bool>(rows.len())?, |sum, key| {
                    sum.checked_add(key.len())
                })
        })
        .and_then(|bytes| {
            bytes.checked_add(
                host.presentation_release
                    .as_ref()
                    .map_or(0, |release| release.get().len()),
            )
        })
        .and_then(|bytes| {
            bytes.checked_add(world_storage.map_or(0, |(root, _, _, page)| {
                root.len() + page.scope.storage_bytes() + page.after.len()
            }))
        })
        .ok_or_else(|| failure("capacity"))?;
    let custody = budget.reserve(bytes).map_err(failure)?;
    Ok(RuntimePlayerViewSource {
        history_order: state.occurrences.next_hot_ordinal(),
        privacy_revision: state
            .experience
            .actor(actor)
            .map_or(0, |history| history.privacy.revision()),
        // This display hint can advance with the accepted cut. It cannot
        // substitute for the exact source/permission check on a memory read.
        memory_cut: state.accepted_cut,
        places_revision: state.experience.known_place_revision(actor),
        place_note_revision: state.reception.actor_knowledge.place_revision(actor),
        inventory_revision,
        inventory_detail_revision,
        world_storage: world_storage.map(|(root, revision, _, _)| (root.to_owned(), revision)),
        inventory_inspection: world_storage
            .map(|(_, _, _, page)| (page.scope.clone(), page.after.clone())),
        recent_story_age: state
            .installed
            .attention
            .value()
            .retention
            .recent
            .max_age_seconds,
        presentation_release: host.presentation_release.clone(),
        presentation_release_revision: host.presentation_release_revision,
        milestones: milestones.cloned().unwrap_or_default(),
        _custody: custody,
    })
}
