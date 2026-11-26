//! One accepted authority and disclosure lease for explicitly requested action
//! discovery. Individual roles use the same reads as their selected menus.

use super::*;

pub enum RuntimeCatalogueOffer<'a> {
    Coaching(RuntimeCoachingOffer<'a>),
    Follow(RuntimeFollowOffer<'a>),
    Resource(RuntimeResourceOffer<'a>),
}

pub struct RuntimeActionCatalogue<'a> {
    simulation: &'a crate::simulation::Simulation,
    budget: &'a ByteBudget,
    account: &'a str,
    actor: GatheringActor<'a>,
    generation: u64,
}

impl NativeWorldSession {
    /// Borrow the current status and the catalogue's read authority under one
    /// publication lease. Each visitor independently funds retained app rows.
    /// The caller finishes final synchronous encoding before it returns.
    pub fn with_player_action_catalogue<T>(
        &self,
        account: &str,
        actor: &str,
        contact_reference: impl FnMut(
            crate::capture::PlayerObservedBody<'_>,
        ) -> Result<String, RuntimeError>,
        publish: impl FnOnce(
            RuntimeStatusMenu<'_>,
            RuntimeActionCatalogue<'_>,
        ) -> Result<T, RuntimeError>,
    ) -> Result<T, RuntimeError> {
        let simulation = self.session.accepted().map_err(failure)?;
        self.with_player_status_menu(account, actor, contact_reference, |status| {
            let life = simulation
                .state
                .physical
                .entities
                .get(actor)
                .and_then(|entity| entity.physical_life());
            let owner = GatheringActor {
                id: actor,
                life,
                can_act: status.available && status.allows_actions,
            };
            publish(
                status,
                RuntimeActionCatalogue {
                    simulation,
                    budget: &self.budget,
                    account,
                    actor: owner,
                    generation: self.session.operational_generation(),
                },
            )
        })
    }
}

impl<'a> RuntimeActionCatalogue<'a> {
    /// An actor's right to end their own current lesson survives loss of sight.
    /// Its menu uses only the installed wording and the actor's own episode.
    pub fn visit_coaching_remedies(&self,mut emit:impl FnMut(RuntimeCoachingOffer<'_>)->Result<(),RuntimeError>)->Result<(),RuntimeError>{
        let state=&self.simulation.state;
        let Some(source)=state.physical.entities.get(self.actor.id) else {return Ok(())};
        let target=source.actor.as_ref().and_then(|a|a.coaching_episode_id.as_ref()).and_then(|id|state.physical.coaching.records.get(id))
            .and_then(|l|l.partner(&source.id)).and_then(|id|state.physical.entities.get(id));
        if let Some(target)=target {
            let unnamed=crate::text::JsText::from("this person");
            coaching::visit(state,source,target,&unnamed,self.budget,|choice|if choice.operation.ends(){ emit(choice) } else {Ok(())})?;
        }
        Ok(())
    }
    /// Traverse one accepted perception capture for on-demand contact and resource offers.
    /// Gather and cast tools are prepared only for a relevant perceived site,
    /// once per family. Borrowed offers and optional geometry stay inside this
    /// lease; callers fund any retained rows before advancing.
    pub fn visit_contact_choices(
        &self,
        mut add: impl FnMut(
            &crate::capture::PlayerObservedBody<'_>,
            RuntimeCatalogueOffer<'_>,
        ) -> Result<(), RuntimeError>,
    ) -> Result<(), RuntimeError> {
        let state = &self.simulation.state;
        let source = state
            .physical
            .entities
            .get(self.actor.id)
            .ok_or_else(|| failure("Missing catalogue actor"))?;
        let follow = follow_availability(state, source, self.actor.can_act)?;
        let mut tool_yields = None;
        let mut fish_tools = None;
        let mut workspace = self.budget.reserve(0)?;
        let mut error = None;
        self.simulation
            .visit_accepted_player_contacts(self.account, self.actor.id, self.budget, |body| {
                let Some(crate::reception::SensoryFacet::Body { body: observed }) =
                    body.body_facet().map(|facet| &facet.value)
                else {
                    return false;
                };
                let result = (|| {
                    if let Some(target)=current_actor_target(state,source,&body){
                        coaching::visit(state,source,target,&body.name.name,self.budget,|offer|if offer.operation.ends(){Ok(())}else{add(&body,RuntimeCatalogueOffer::Coaching(offer))})?;
                    }
                    if let Some(follow) = follow
                        && current_actor_target(state, source, &body).is_some()
                    {
                        add(
                            &body,
                            RuntimeCatalogueOffer::Follow(follow.with_name(&body.name.name)),
                        )?;
                    }
                    if pickup::observed_source(state, observed) {
                        if let Some(read) =
                            pickup::PickupRead::current(state, self.actor.id, &body, self.budget)?
                        {
                            read.render(self.budget, |offer| {
                                add(&body, RuntimeCatalogueOffer::Resource(offer))
                            })?;
                        }
                        return Ok(());
                    }
                    if let Some(target) = state
                        .physical
                        .entities
                        .get(body.source_id)
                        .filter(|target| target.practice_target.is_some())
                    {
                        return practice::offer(
                            state,
                            self.actor.id,
                            body.name,
                            target,
                            None,
                            self.budget,
                            |offer| add(&body, RuntimeCatalogueOffer::Resource(offer)),
                        );
                    }
                    if observed.kind != "resource" {
                        return Ok(());
                    }
                    if let Some(source) = crate::casts::source(state, body.source_id) {
                        if fish_tools.is_none() {
                            fish_tools =
                                Some(FishTools::prepare(state, self.actor.id, None, self.budget)?);
                        }
                        let tools = fish_tools.as_ref().expect("prepared fishing tools");
                        let tools = tools.for_kind(&source.rules.definition.tool_kind);
                        return fish_offer(
                            state,
                            self.actor.id,
                            &body.name.name,
                            source,
                            cast_geometry_binding(state, self.generation),
                            self.budget,
                            tools,
                            false,
                            |offer| add(&body, RuntimeCatalogueOffer::Resource(offer)),
                        );
                    }
                    let Some((gathering, quantity)) = menu_gathering(state, &body) else {
                        return Ok(());
                    };
                    if tool_yields.is_none() {
                        let mut yields: IndexMap<&str, u64> = IndexMap::new();
                        crate::gathering::visit_tool_yields(
                            state,
                            self.actor.id,
                            |material, count| {
                                if let Some(value) = yields.get_mut(material) {
                                    *value = (*value).max(count);
                                } else {
                                    let bytes =
                                        crate::host::retained_size::map_storage::<&str, u64>(
                                            yields.len().checked_add(1).ok_or(CapacityError)?,
                                        )
                                        .ok_or(CapacityError)?;
                                    workspace.resize(bytes)?;
                                    yields.try_reserve(1).map_err(|_| CapacityError)?;
                                    yields.insert(material, count);
                                }
                                Ok(())
                            },
                        )
                        .map_err(failure)?;
                        tool_yields = Some(yields);
                    }
                    let yields = tool_yields.as_ref().expect("prepared tool yields");
                    let amount = yields
                        .get(gathering.definition.pin.id.as_str())
                        .map_or(gathering.base_yield, |amount| {
                            gathering.base_yield.max(*amount)
                        });
                    add(
                        &body,
                        RuntimeCatalogueOffer::Resource(RuntimeResourceOffer::Gather(
                            gather_menu_offer(
                                state, &body, gathering, quantity, self.actor, amount,
                            ),
                        )),
                    )
                })();
                if let Err(problem) = result {
                    error = Some(problem);
                    return true;
                }
                false
            })
            .map_err(failure)?;
        error.map_or(Ok(()), Err)
    }

    /// Borrow current installed known manufacturing offers. The visitor can
    /// independently fund each resulting app row before the method advances.
    pub fn visit_known_manufacture(
        &self,
        visit: impl FnMut(&str, crate::runtime::RuntimeManufactureOffer<'_>) -> Result<(), RuntimeError>,
    ) -> Result<(), RuntimeError> {
        super::super::manufacture::visit_known_manufacture(
            &self.simulation.state,
            self.actor.id,
            self.budget,
            visit,
        )
    }

    /// Visit exactly the accessible carried lots during an explicit catalogue
    /// request. The installed meter and actor eligibility are read once. Menu
    /// rows borrow names and reasons until the caller finishes encoding.
    pub fn visit_eating(
        &self,
        mut add: impl FnMut(
            &'a str,
            &'a crate::text::JsText,
            crate::consumption::EatingOffer<'a>,
        ) -> Result<(), CapacityError>,
    ) -> Result<(), RuntimeError> {
        let state: &'a crate::simulation::SimulationState = &self.simulation.state;
        let actor = self.actor.id;
        let Some(eating) = EatingRead::current(state, actor)? else {
            return Ok(());
        };
        state
            .inventory
            .visit_owned(
                &state.physical,
                eating.definitions,
                actor,
                actor,
                &mut |item| {
                    if let Some((name, offer)) = eating.offer(item)? {
                        add(item.id, name, offer)
                            .map_err(|_| crate::execution::ExecutionError::Capacity)?;
                    }
                    Ok(())
                },
            )
            .map_err(failure)
    }
}

pub(super) struct EatingRead<'a> {
    definitions: &'a crate::install::RetainedDefinitions,
    eater: crate::consumption::Eater<'a>,
    blocked: Option<&'a crate::worlds::InstalledActionMessage>,
}

impl<'a> EatingRead<'a> {
    pub(super) fn current(
        state: &'a crate::simulation::SimulationState,
        actor: &str,
    ) -> Result<Option<Self>, RuntimeError> {
        let body = state
            .physical
            .entities
            .get(actor)
            .ok_or_else(|| failure("inventory owner unavailable"))?;
        let installed = &state.installed;
        let blocked =
            crate::consumption::action_problem(installed, body, state.physical.header.paused)
                .map_err(failure)?;
        Ok(
            crate::consumption::Eater::current(installed, &state.physical, body)
                .map_err(failure)?
                .map(|eater| Self {
                    definitions: &installed.retained,
                    eater,
                    blocked,
                }),
        )
    }

    pub(super) fn offer(
        &self,
        item: crate::install::OwnedItem<'a>,
    ) -> Result<
        Option<(&'a crate::text::JsText, crate::consumption::EatingOffer<'a>)>,
        crate::execution::ExecutionError,
    > {
        let definition = self
            .definitions
            .items
            .get(item.definition_id)
            .ok_or(crate::execution::ExecutionError::Invariant)?;
        Ok(self
            .eater
            .offer(definition, self.blocked, item.available_quantity)
            .map(|offer| (&item.named.name, offer)))
    }
}

/// Only a current received body can bind the living participant. The same
/// selection serves contextual and global discovery.
pub(super) fn current_actor_target<'a>(
    state: &'a crate::simulation::SimulationState,
    source: &crate::state::Entity,
    observed: &crate::capture::PlayerObservedBody<'_>,
) -> Option<&'a crate::state::Entity> {
    if !observed.actor || observed.source_id == source.id {
        return None;
    }
    let target = state.physical.entities.get(observed.source_id)?;
    (target.actively_participates()
        && target.actor.as_ref().is_some_and(|actor| actor.alive)
        && target.physical_life() == Some(observed.physical_life?))
    .then_some(target)
}

#[derive(Clone, Copy)]
pub(super) struct FollowAvailability<'a> {
    paused: bool,
    reason: Option<&'a str>,
}

impl<'a> FollowAvailability<'a> {
    pub(super) fn with_name(self, name: &'a crate::text::JsText) -> RuntimeFollowOffer<'a> {
        RuntimeFollowOffer {
            name,
            paused: self.paused,
            reason: self.reason,
        }
    }
}

pub(super) fn follow_availability<'a>(
    state: &'a crate::simulation::SimulationState,
    source: &crate::state::Entity,
    may_act: bool,
) -> Result<Option<FollowAvailability<'a>>, RuntimeError> {
    let rules = &state.installed.occurrence_rules.value().response.offers;
    if rules.follow_command != "follow" {
        return Ok(None);
    }
    let rules = &rules.availability;
    let restricted = !may_act
        || !source.actively_participates()
        || !source
            .actor
            .as_ref()
            .is_some_and(|actor| actor.alive && !actor.incapacitated)
        || state
            .installed
            .capabilities
            .capability_blocked(Some(source), "locomotion")
            .map_err(failure)?;
    let reason = if restricted {
        Some(rules.follow_restricted.as_str())
    } else if source.world_support().is_none() {
        Some(rules.follow_unsupported.as_str())
    } else {
        None
    };
    Ok(Some(FollowAvailability {
        paused: state.physical.header.paused,
        reason,
    }))
}

pub(super) fn cast_geometry_binding(
    state: &crate::simulation::SimulationState,
    generation: u64,
) -> GeometryBinding {
    GeometryBinding::new(
        CandidateKey {
            id: 0,
            base_cut: state.accepted_cut,
            generation,
        },
        state.geometry_revision(),
        0,
    )
}

/// One ordered index of this actor's accessible fishing tools. A selected
/// source can prepare only its compatible tools. Complete discovery prepares
/// the index once, then borrows each source's contiguous group.
pub(super) struct FishTools<'a> {
    tools: Vec<RuntimeFishTool<'a>>,
    _funding: ByteReservation,
}

impl<'a> FishTools<'a> {
    pub(super) fn prepare(
        state: &'a crate::simulation::SimulationState,
        actor: &str,
        selected: Option<&str>,
        budget: &ByteBudget,
    ) -> Result<Self, RuntimeError> {
        let mut funding = budget.reserve(0)?;
        let mut tools = Vec::new();
        let installed = &state.installed.retained;
        state
            .inventory
            .visit_owned(&state.physical, installed, actor, actor, &mut |item| {
                let definition = installed
                    .items
                    .get(item.definition_id)
                    .ok_or(crate::execution::ExecutionError::Invariant)?;
                let Some(kind) = definition.fishing_kind() else {
                    return Ok(());
                };
                if item.available_quantity == 0 || selected.is_some_and(|wanted| wanted != kind) {
                    return Ok(());
                }
                if tools.len() == tools.capacity() {
                    let next = tools.capacity().checked_mul(2).ok_or(CapacityError)?.max(4);
                    let replacement = budget.reserve(
                        next.checked_mul(size_of::<RuntimeFishTool>())
                            .ok_or(CapacityError)?,
                    )?;
                    tools
                        .try_reserve_exact(next - tools.len())
                        .map_err(|_| CapacityError)?;
                    funding = replacement;
                }
                tools.push(RuntimeFishTool {
                    kind,
                    order: tools.len(),
                    id: item.id,
                    name: &item.named.name,
                });
                Ok(())
            })
            .map_err(failure)?;
        if selected.is_none() {
            tools.sort_unstable_by(|left, right| {
                left.kind.cmp(right.kind).then(left.order.cmp(&right.order))
            });
        }
        Ok(Self {
            tools,
            _funding: funding,
        })
    }

    pub(super) fn for_kind(&self, kind: &str) -> &[RuntimeFishTool<'a>] {
        let first = self.tools.partition_point(|tool| tool.kind < kind);
        let end = self.tools.partition_point(|tool| tool.kind <= kind);
        &self.tools[first..end]
    }
}
