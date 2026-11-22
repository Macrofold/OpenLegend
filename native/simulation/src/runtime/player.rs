//! One selected player capture and its final scoped disclosure fence. No native
//! read borrow survives a provider/SQL await; the immutable evidence owner does.
use super::*;
use crate::capture::{
    CapturedPlayerControls, PlayerControlFacts, PlayerControlPreparation, PlayerPerception,
    PlayerSelfFacts,
};
pub use crate::commands::player::RuntimePlayerCommand;
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan};
use crate::host::{CapacityError, PublicationLease};
use crate::simulation::AcceptedActorRead;
pub use crate::simulation::{InteractionMode, PlayerInteractionFacts};
use indexmap::IndexMap;
use serde_json::value::RawValue;
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
    pub inventory_revision: u64,
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

pub struct RuntimeGatherOffer<'a> {
    pub name: &'a crate::text::JsText,
    pub material: &'a crate::text::JsText,
    pub label: Option<&'a crate::text::JsText>,
    pub quantity: u64,
    pub sequence: u64,
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

pub struct RuntimeFoodMenu<'a> {
    pub sequence: u64,
    pub paused: bool,
    pub heat: &'a [RuntimeHeatContact],
    pub preparations: &'a [RuntimePreparation<'a>],
    pub eating: Option<(&'a crate::text::JsText, crate::consumption::EatingOffer<'a>)>,
}

pub enum RuntimeResourceOffer<'a> {
    Gather(RuntimeGatherOffer<'a>),
    Fish(RuntimeFishOffer<'a>),
    Pickup(RuntimePickupOffer<'a>),
}

pub struct RuntimePickupOffer<'a> {
    pub label: &'a str,
    pub reason: Option<&'a str>,
    pub items: &'a [&'a crate::reception::ObservedPileItem],
    pub sequence: u64,
}

fn render_pickup<T>(
    state: &crate::simulation::SimulationState,
    actor: &str,
    target: &str,
    observed: &[crate::reception::ObservedPileItem],
    budget: &ByteBudget,
    encode: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
) -> Result<T, RuntimeError> {
    let actor = state.physical.entities.get(actor).ok_or_else(|| failure("pickup actor unavailable"))?;
    let _items = budget.reserve(observed.len().checked_mul(size_of::<&crate::reception::ObservedPileItem>())
        .ok_or_else(|| failure("pickup offer capacity"))?)?;
    let mut items = Vec::with_capacity(observed.len());
    if let Some(pile) = crate::ground_items::pickup_pile(state, actor, target) {
        items.extend(observed.iter().filter(|witness| witness.portable
            && crate::ground_items::pickup_lot(state, pile, &witness.id).is_some_and(|item| {
                item.lot.definition_pin.id == witness.definition_id
                    && item.lot.quantity as f64 == witness.quantity
            })));
    }
    let policy = &state.installed.retained.item_handling_read;
    let reason = crate::consumption::action_problem(&state.installed, actor, state.physical.header.paused)
        .map_err(failure)?.map(|blocked| blocked.message.as_str());
    encode(RuntimeResourceOffer::Pickup(RuntimePickupOffer {
        label: &policy.pickup_label, reason, items: &items, sequence: state.physical.header.sequence,
    }))
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
    consume: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
) -> Result<T, RuntimeError> {
    let mut _custody = budget.reserve(0)?;
    let mut tools = Vec::new();
    let rules = &source.rules.definition;
    let installed = &state.installed.retained;
    state
        .inventory
        .visit_owned(
            &state.physical.entities,
            installed,
            actor,
            actor,
            &mut |item| {
                let definition = installed
                    .items
                    .get(item.definition_id)
                    .ok_or(crate::execution::ExecutionError::Invariant)?;
                if item.available_quantity != 0
                    && definition.fishing_kind() == Some(rules.tool_kind.as_str())
                {
                    if tools.len() == tools.capacity() {
                        let next = tools.capacity().checked_mul(2).ok_or(CapacityError)?.max(4);
                        let bytes = next
                            .checked_mul(size_of::<RuntimeFishTool<'_>>())
                            .ok_or(CapacityError)?;
                        // Keep the old vector funded until the replacement succeeds.
                        let replacement = budget.reserve(bytes)?;
                        tools
                            .try_reserve_exact(next - tools.len())
                            .map_err(|_| CapacityError)?;
                        _custody = replacement;
                    }
                    tools.push(RuntimeFishTool {
                        id: item.id,
                        name: &item.named.name,
                    });
                }
                Ok(())
            },
        )
        .map_err(failure)?;
    let exhausted = source.stock.quantity == 0;
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
        tools: &tools,
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
        let (command, signature) = command.bind(id, actor).map_err(failure)?;
        self.session
            .begin_command_with_materials(
                command,
                signature,
                crate::commands::CommandOptions {
                    preview,
                    native_controller: false,
                    native_movement: None,
                    durable_receipt: !preview,
                },
                crate::construction_gather::ConstructionGather::for_command(materials),
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
        mut matches: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> bool,
        use_offer: impl FnOnce(RuntimeResourceOffer<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let sequence = simulation.state.physical.header.sequence;
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
                let pile_kind = &state.installed.observation_rules.value().pile_kind;
                if observed.kind == *pile_kind {
                    let Some(items) = body.facets().find_map(|facet| match &facet.value {
                        crate::reception::SensoryFacet::PileContents { items } => Some(items.as_slice()),
                        _ => None,
                    }) else {
                        return false;
                    };
                    if !matches(body) {
                        return false;
                    }
                    let encode = encode.take().expect("one selected source");
                    result = Some(render_pickup(state, actor, id, items, &self.budget, encode));
                    return true;
                }
                if observed.kind != "resource" || !matches(body) {
                    return false;
                }
                if let Some(source) = crate::casts::source(state, id) {
                    let encode = encode.take().expect("one selected source");
                    let binding = GeometryBinding::new(
                        CandidateKey {
                            id: 0,
                            base_cut: state.accepted_cut,
                            generation: self.session.operational_generation(),
                        },
                        state.installed.geometry.spatial.revision,
                        0,
                    );
                    result = Some(fish_offer(
                        state,
                        actor,
                        name,
                        source,
                        binding,
                        &self.budget,
                        encode,
                    ));
                    return true;
                }
                let Some((definition, quantity)) = observed.subtype.as_ref().zip(observed.quantity)
                else {
                    return false;
                };
                let retained = &state.installed.retained;
                let Some(item) = retained.items.get(definition).filter(|item| item.portable) else {
                    return false;
                };
                if retained.bare_hand_gathering.is_none() {
                    return false;
                }
                let encode = encode.take().expect("one selected source");
                result = Some(encode(RuntimeResourceOffer::Gather(RuntimeGatherOffer {
                    name,
                    material: &item.named.name,
                    label: item.gather_label.as_ref(),
                    quantity: quantity as u64,
                    sequence,
                })));
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
        mut contact: impl FnMut(crate::capture::PlayerObservedBody<'_>) -> Result<Option<String>, RuntimeError>,
        use_menu: impl FnOnce(RuntimeFoodMenu<'_>) -> Result<T, RuntimeError>,
    ) -> Result<Option<T>, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        let state = &simulation.state;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let installed = &state.installed;
        let selected = if let Some(item) = item {
            let Some(selected) = crate::install::owned_by(&state.physical.entities, &installed.retained, actor, item)
                .map_err(failure)? else {
                return Ok(None);
            };
            Some(selected)
        } else {
            None
        };
        let eating = if let Some(item) = selected {
            let definition = installed.retained.items.get(item.definition_id)
                .ok_or_else(|| failure("inventory definition unavailable"))?;
            let entity = state.physical.entities.get(actor).ok_or_else(|| failure("inventory owner unavailable"))?;
            let blocked = crate::consumption::action_problem(installed, entity, state.physical.header.paused)
                .map_err(failure)?;
            crate::consumption::Eater::current(installed, &state.physical, entity).map_err(failure)?
                .and_then(|eater| eater.offer(definition, blocked))
                .map(|eating| (&definition.named.name, eating))
        } else {
            None
        };
        if !installed.retained.preparations.values().any(|recipe| {
            selected.is_none_or(|lot| recipe.definition.inputs.iter().any(|input| input.definition_id == lot.definition_id))
        }) {
            let Some(eating) = eating else { return Ok(None) };
            simulation.require_player_owner(account, actor).map_err(failure)?;
            return use_menu(RuntimeFoodMenu {
                sequence: state.physical.header.sequence, paused: state.physical.header.paused,
                preparations: &[], heat: &[], eating: Some(eating),
            }).map(Some);
        }
        let mut heat = Vec::new();
        let mut storage = self.budget.reserve(0)?;
        let mut error = None;
        simulation.visit_accepted_player_contacts(account, actor, &self.budget, |body| {
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
                let Some(target) = contact(body)? else {
                    return Ok(false);
                };
                storage.resize(storage.bytes().checked_add(
                    4 * std::mem::size_of::<RuntimeHeatContact>() + target.len() + name.storage_bytes()
                ).ok_or(crate::host::CapacityError)?)?;
                heat.push(RuntimeHeatContact { target, name: name.clone(), lit });
                Ok(item.is_none())
            })();
            match next {
                Ok(done) => done,
                Err(problem) => {
                    error = Some(problem);
                    true
                }
            }
        }).map_err(failure)?;
        if let Some(error) = error {
            return Err(error);
        }
        if heat.is_empty() && item.is_none() {
            return Ok(None);
        }
        let choices = crate::food_preparation::choices(state, actor, item, &self.budget)
            .map_err(failure)?;
        let _rows = self.budget.reserve(
            choices.rows.len().checked_mul(std::mem::size_of::<RuntimePreparation<'_>>())
                .ok_or(crate::host::CapacityError)?,
        )?;
        let rows: Vec<_> = choices.rows.iter().map(|choice| RuntimePreparation {
            pin: &choice.recipe.pin,
            name: &choice.recipe.definition.name,
            description: &choice.recipe.definition.description,
            inputs: choice.inputs.as_ref(),
        }).collect();
        use_menu(RuntimeFoodMenu {
            sequence: state.physical.header.sequence,
            paused: state.physical.header.paused,
            heat: &heat,
            preparations: &rows,
            eating,
        }).map(Some)
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
    /// Look up the exact requested owned lots without constructing a player
    /// view. The callback must finish encoding/handoff within this lease.
    pub fn with_player_inventory<T>(
        &self,
        account: &str,
        actor: &str,
        ids: &[String],
        consume: impl FnOnce(&[crate::install::OwnedItem<'_>], &ByteBudget) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        if ids.len() > crate::install::shortcut_limit()
            || ids.iter().any(|id| !crate::values::is_safe_record_id(id))
        {
            return Err(failure("invalid owned shortcut selection"));
        }
        let simulation = self.session.accepted().map_err(failure)?;
        simulation
            .require_player_read(account, actor)
            .map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let bytes = ids
            .len()
            .checked_mul(std::mem::size_of::<crate::install::OwnedItem<'_>>())
            .ok_or(crate::host::CapacityError)?;
        let _custody = self.budget.reserve(bytes)?;
        let mut items = Vec::with_capacity(ids.len());
        let state = &simulation.state;
        for (index, id) in ids.iter().enumerate() {
            if !ids[..index].contains(id)
                && let Some(item) = crate::install::owned_by(
                    &state.physical.entities,
                    &state.installed.retained,
                    actor,
                    id,
                )
                .map_err(failure)?
            {
                items.push(item);
            }
        }
        Ok(consume(&items, &self.budget))
    }

    /// Borrow only this player's direct items under the current publication
    /// lease. This is an on-demand screen read, independent of stream updates.
    pub fn with_player_direct_inventory<T>(
        &self,
        account: &str,
        actor: &str,
        consume: impl FnOnce(crate::install::DirectInventory<'_>, &ByteBudget) -> T,
    ) -> Result<T, RuntimeError> {
        self.require_active()?;
        let simulation = self.session.accepted().map_err(failure)?;
        simulation.require_player_read(account, actor).map_err(failure)?;
        let _lease = self.session.fence().begin_publication().map_err(failure)?;
        let state = &simulation.state;
        let entities = &state.physical.entities;
        let definitions = &state.installed.retained;
        let entity = entities.get(actor).ok_or_else(|| failure("inventory owner unavailable"))?;
        let body = entity.actor.as_ref().ok_or_else(|| failure("inventory owner unavailable"))?;
        let action_problem = crate::consumption::action_problem(&state.installed, entity, state.physical.header.paused)
            .map_err(failure)?;
        let can_act = action_problem.is_none() && body.action.is_none();
        let eater = crate::consumption::Eater::current(&state.installed, &state.physical, entity)
            .map_err(failure)?;
        let count = state.inventory.direct_item_count(actor);
        let _custody = self.budget.reserve(
            count.checked_mul(size_of::<crate::install::InventoryDetail<'_>>()).ok_or(CapacityError)?,
        )?;
        let mut items = Vec::with_capacity(count);
        for entry in state.inventory.children(entities, actor, false) {
            let item = crate::install::project_owned(definitions, actor, entry, crate::install::accessible_bag(entry, actor)).map_err(failure)?;
            let definition = definitions.items.get(item.definition_id).ok_or_else(|| failure("inventory definition unavailable"))?;
            items.push(crate::install::InventoryDetail {
                item, category: definition.category, description: definition.description.as_ref(), properties: &definition.properties,
                equipment_ports: definition.equipment_ports(),
                equipment_fits: crate::execution::equipment_fits(state, entity, entry),
                eating: eater.as_ref().and_then(|eater| eater.offer(definition, action_problem)),
            });
        }
        Ok(consume(crate::install::DirectInventory {
            id: actor, name: &entity.name, revision: entity.inventory_revision.unwrap_or_default(), can_act,
            body_ports: body.body.as_ref().map_or(&[], |body| body.equipment_ports.as_slice()), items: &items,
        }, &self.budget))
    }

    pub fn read_player(
        &mut self,
        account: &str,
        actor: &str,
        event_window: usize,
    ) -> Result<RuntimePlayerRead, RuntimeError> {
        self.read_player_via(account, actor, event_window, false, |simulation, budget| {
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
        prepare: impl FnOnce(PlayerSelfFacts<'_>, &ByteBudget) -> Result<T, CapacityError>,
    ) -> Result<(RuntimePlayerRead, T), RuntimeError> {
        self.read_player_via(account, actor, event_window, true, |simulation, budget| {
            simulation.read_player_direct(account, actor, budget, prepare)
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
        let (read, prepared) = capture(simulation, &self.budget).map_err(failure)?;
        let events = simulation
            .read_player_events(account, actor, event_window, &self.budget)
            .map_err(failure)?;
        let state = &simulation.state;
        let view_source = app_view
            .then(|| capture_view_source(&self.session, state, actor, &self.budget))
            .transpose()?;
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
    pub fn event_payload(&self) -> &str {
        self.events.json()
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

    pub fn control_question(
        &self,
        budget: &ByteBudget,
    ) -> Result<Option<RuntimeJson>, RuntimeError> {
        self.control_queries()
            .map(|queries| RuntimeJson::encode(queries, budget))
            .transpose()
    }

    /// The capture owns this immutable input through its control preparation.
    pub fn control_queries(&self) -> Option<&crate::geometry::GeometryQueries> {
        self.preparation
            .as_ref()
            .map(PlayerControlPreparation::queries)
    }
    pub fn finish_controls(
        &mut self,
        bytes: &[u8],
        budget: &ByteBudget,
    ) -> Result<(), RuntimeError> {
        let _decode = decode_preparation(bytes, budget)?;
        let answers: GeometryAnswers = serde_json::from_slice(bytes).map_err(failure)?;
        self.apply_controls(answers)
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
        // Every member is already encoded by its semantic owner. Joining those
        // complete encodings avoids decoding a private graph just to re-encode it.
        let parts = [
            b"{\"self\":".as_slice(),
            own.as_bytes(),
            b",\"perception\":",
            perception.as_bytes(),
            b",\"events\":",
            self.events.json().as_bytes(),
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
    budget: &ByteBudget,
) -> Result<RuntimePlayerViewSource, RuntimeError> {
    use crate::host::retained_size::map_storage;
    let host = session.player_view_settings();
    let milestones = host
        .actor_milestones
        .as_ref()
        .and_then(|rows| rows.get(actor));
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
        inventory_revision: state.administration.object_membership.revision,
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
