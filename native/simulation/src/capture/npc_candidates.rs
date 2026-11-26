//! Actor-scoped preparation runs under a private candidate checkpoint. The
//! same owner displays remaining work for recall and the executable catalogue.
//! Only the catalogue path probes commands. Neither path admits an action.
use super::{ActorReadPurpose, NpcObservationSelection};
use crate::commands::{
    ActivityDisplayCursor, CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep,
    CommandEnvelope, CompletedActivityDisplay, NativeCommand, Outcome, StatusOperation,
    WorkTransitionMode,
};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery, SightRay,
};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation, CandidateKey};
use crate::reception::SensoryFacet;
use crate::response::ResponseWorkIdentity;
use crate::simulation::AcceptedActorRead;
use crate::state::{Point, SurfacePoint};
use serde::Serialize;
use std::mem::size_of;

mod product;
pub(crate) use product::*;
mod enumerate;
mod geometry;
mod work;
pub(crate) use work::NpcWorkContext;
mod activity;
pub use activity::{NpcActivityChoice, NpcActivityFacts};
mod descriptions;
use activity::{NpcActivityPreparation, NpcActivityRead};
use descriptions::DescriptionContext;
pub use descriptions::{NpcDescriptionOffer, NpcDescriptionSubject, NpcDescriptionsRequest};
pub(crate) use descriptions::NpcDescriptionsAnswer;
pub use product::NpcOfferMeaning;
mod casting;
use casting::CastTools;
mod cooking;
use cooking::CookingChoices;
mod fire;
use fire::FuelChoices;
mod gifts;
use gifts::GiftProposals;
mod defense;
mod evasion;
pub use evasion::NpcEvasionChoice;
use defense::GuardChoices;
pub use defense::NpcGuardTool;
mod melee;
use melee::MeleeChoices;
mod ranged;
use ranged::RangedChoices;

struct Target {
    body: usize,
    id: String,
    observed: Point,
    support: Option<String>,
    interaction_height: f64,
    alive: bool,
    heat_lit: Option<bool>,
    visible: bool,
}
#[derive(Clone, Copy)]
enum Enumerate {
    Visibility,
    Activities,
    ActivityHistoryNext,
    ActivityMethodsNext,
    Inventory,
    Learned,
    Continue,
    GiftProposal(usize, usize, usize),
    Follow(usize, usize),
    Status(usize, usize),
    Evade(usize),
    Probe(usize),
    Approach(usize),
    Fish(usize, usize),
    Fire(usize, usize),
    Cook(usize, usize),
    Strike(usize, usize),
    EquippedStrike(usize, usize),
    Ranged(usize, usize, usize),
    Guard(usize, usize),
    CurrentWork(usize),
    PausedWork(usize),
    Done,
}
#[derive(Clone, Copy)]
enum Waiting {
    Reach(usize),
    Route(usize),
    GiftReach,
}

pub(crate) struct NpcCandidateCursor {
    actor: String,
    candidate: CandidateKey,
    coverage: Option<NpcOfferCoverage>,
    inspection: Option<crate::activity::ActivityInspectionNavigation>,
    selection: Option<NpcObservationSelection>,
    targets: Vec<Target>,
    stage: Enumerate,
    waiting: Option<Waiting>,
    queries: Option<GeometryQueries>,
    _query_storage: Option<ByteReservation>,
    sight: Option<crate::reception::SightBatch>,
    child: Option<CommandChoiceCursor>,
    plan_display: Option<ActivityDisplayCursor>,
    plan_display_slot: Option<(bool, usize)>,
    work_context: Option<NpcWorkContext>,
    child_copy: Option<ByteReservation>,
    pending: Option<PreparedNpcOffer>,
    offers: Vec<PreparedNpcOffer>,
    work: Option<ResponseWorkIdentity>,
    work_storage: Option<ByteReservation>,
    budget: ByteBudget,
    storage: Option<ByteReservation>,
    _cursor_storage: ByteReservation,
    done: bool,
    description_context: Option<DescriptionContext>,
    description_request: Option<std::sync::Arc<NpcDescriptionsRequest>>,
    descriptions_done: bool,
    activity: Option<NpcActivityPreparation>,
    activity_done: Option<NpcActivityRead>,
    cast_tools: Option<CastTools>,
    cooking: Option<CookingChoices>,
    fuels: Option<FuelChoices>,
    gift_proposals: Option<GiftProposals>,
    guard_threat: Option<crate::runtime::RuntimeNpcGuardThreat>,
    guard_choices: Option<GuardChoices>,
    melee_choices: Option<MeleeChoices>,
    ranged_choices: Option<RangedChoices>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandInput<'a> {
    actor_id: &'a str,
    id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a str>,
    #[serde(rename = "type")]
    kind: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    item_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    operation: Option<StatusOperation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    destination: Option<&'a SurfacePoint>,
    #[serde(skip_serializing_if = "Option::is_none")]
    after: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    method_after: Option<u64>,
}
impl<'a> CommandInput<'a> {
    fn new(actor: &'a str, id: &'a str, kind: &'a str) -> Self {
        Self {
            actor_id: actor,
            id,
            purpose: None,
            kind,
            target_id: None,
            definition_id: None,
            item_id: None,
            operation: None,
            destination: None,
            after: None,
            method_after: None,
        }
    }
}

impl NpcCandidateCursor {
    /// A missing offer coverage selects only the recall view of current work.
    /// Both paths own the same-cut attended body selection.
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        read: &AcceptedActorRead,
        expanded: &[usize],
        coverage: Option<NpcOfferCoverage>,
        inspection: Option<crate::activity::ActivityInspectionNavigation>,
        guard_threat: Option<crate::runtime::RuntimeNpcGuardThreat>,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if candidate.base_cut != read.accepted_cut
            || !matches!(read.purpose, ActorReadPurpose::NpcDecision { .. })
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        if inspection.as_ref().is_some_and(|page| {
            !page.current(
                core.state,
                &read.perception.actor_id,
                read.perception.evidence.cut().observer.physical_life,
            )
        }) {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let selection = NpcObservationSelection::prepare(core.state, read, expanded, budget)?;
        let offered_bodies = coverage.map_or(&[][..], |_| selection.body_ordinals());
        let bytes = offered_bodies
            .len()
            .checked_mul(size_of::<Target>())
            .and_then(|n| n.checked_add(read.perception.actor_id.len() + size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut targets = Vec::with_capacity(offered_bodies.len());
        let cut = read.perception.evidence.cut();
        for &index in offered_bodies {
            let binding = &read.perception.bodies[index];
            if binding.source_id == read.perception.actor_id {
                continue;
            }
            let body = cut.current[binding.first..binding.first + binding.count]
                .iter()
                .find_map(|facet| match &facet.value {
                    SensoryFacet::Body { body } => Some(body),
                    _ => None,
                })
                .ok_or(ExecutionError::Invariant)?;
            let target = core
                .state
                .physical
                .entities
                .get(&binding.source_id)
                .ok_or(ExecutionError::MissingEntity)?;
            let profile = crate::status::effective_body_profile(target, budget)?;
            storage.resize(
                storage
                    .bytes()
                    .checked_add(
                        binding.source_id.len()
                            + body.support_surface_id.as_ref().map_or(0, String::len),
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            targets.push(Target {
                body: index,
                id: binding.source_id.clone(),
                observed: body.position,
                support: body.support_surface_id.clone(),
                interaction_height: profile.interaction_height,
                alive: target.actor.as_ref().is_some_and(|actor| actor.alive),
                heat_lit: body.heat_lit,
                visible: false,
            });
        }
        let (work, work_storage) = coverage
            .map(|_| ResponseWorkIdentity::capture(core.state, &read.perception.actor_id, budget))
            .transpose()?
            .unzip();
        let work_context = NpcWorkContext::prepare(core, &read.perception.actor_id, budget)?;
        let description_context = coverage
            .map(|_| DescriptionContext::prepare(core, read, offered_bodies, budget))
            .transpose()?;
        let receiver = core
            .state
            .physical
            .entities
            .get(&read.perception.actor_id)
            .ok_or(ExecutionError::MissingActor)?;
        let actor = receiver
            .actor
            .as_ref()
            .ok_or(ExecutionError::MissingActor)?;
        let guard_threat = guard_threat.filter(|threat| {
            threat.for_receiver(core.state, &receiver.id, receiver.physical_life())
        });
        let stage = if !actor.alive || actor.incapacitated || core.state.physical.header.paused {
            Enumerate::Done
        } else if coverage.is_none() {
            Enumerate::CurrentWork(0)
        } else {
            Enumerate::Visibility
        };
        Ok(Self {
            actor: read.perception.actor_id.clone(),
            candidate,
            coverage,
            inspection,
            selection: Some(selection),
            targets,
            stage,
            waiting: None,
            queries: None,
            _query_storage: None,
            sight: None,
            child: None,
            plan_display: None,
            plan_display_slot: None,
            work_context: Some(work_context),
            child_copy: None,
            pending: None,
            offers: Vec::new(),
            work,
            work_storage,
            budget: budget.clone(),
            storage: Some(budget.reserve(size_of::<PreparedNpcRead>())?),
            _cursor_storage: storage,
            done: false,
            description_context,
            description_request: None,
            descriptions_done: false,
            activity: None,
            activity_done: None,
            cast_tools: None,
            cooking: None,
            fuels: None,
            gift_proposals: None,
            guard_threat,
            guard_choices: None,
            melee_choices: None,
            ranged_choices: None,
        })
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        let storage = self
            .storage
            .as_mut()
            .ok_or(ExecutionError::InvalidCheckpoint)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn append(&mut self, offer: PreparedNpcOffer) -> Result<(), ExecutionError> {
        if self.offers.len() == self.offers.capacity() {
            let next = self
                .offers
                .capacity()
                .max(2)
                .checked_mul(2)
                .ok_or(ExecutionError::Capacity)?;
            self.reserve(
                (next - self.offers.capacity())
                    .checked_mul(size_of::<PreparedNpcOffer>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            self.offers.reserve_exact(next - self.offers.len());
        }
        self.offers.push(offer);
        Ok(())
    }
    fn command(
        &self,
        input: &CommandInput<'_>,
    ) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
        let fields = 3
            + usize::from(input.purpose.is_some())
            + usize::from(input.target_id.is_some())
            + usize::from(input.definition_id.is_some())
            + usize::from(input.item_id.is_some())
            + usize::from(input.operation.is_some())
            + usize::from(input.destination.is_some())
            + usize::from(input.after.is_some())
            + usize::from(input.method_after.is_some());
        self.bind_offer(input.id, input.purpose, input, fields, 0, |envelope| {
            let target = || input.target_id.ok_or(ExecutionError::Invariant).map(str::to_owned);
            let definition = || input.definition_id.ok_or(ExecutionError::Invariant).map(str::to_owned);
            Ok(match input.kind {
                "inspect-activities" => NativeCommand::InspectActivities {
                    envelope,
                    history_after: input.after.ok_or(ExecutionError::Invariant)?,
                    method_after: input.method_after.ok_or(ExecutionError::Invariant)?,
                },
                "inspect-inventory" => NativeCommand::InspectInventory {
                    envelope, selected: None, world: None,
                },
                "follow" => NativeCommand::Follow {
                    envelope,
                    target_id: target()?,
                    target_life: None,
                    distance: None,
                    parameters: crate::movement::follow::FollowParameters {
                        relation: None, on_lost: None, until: None, complete: None,
                    },
                },
                "status-effect" => NativeCommand::StatusEffect {
                    envelope,
                    target_id: target()?,
                    definition_id: definition()?,
                    operation: input.operation.ok_or(ExecutionError::Invariant)?,
                    facing_heading: None,
                    resting_place_id: None,
                    resting_bay: None,
                },
                "move" => NativeCommand::Move {
                    envelope,
                    destination: input.destination.ok_or(ExecutionError::Invariant)?.clone().into(),
                },
                "evade" => NativeCommand::Evade {
                    envelope,
                    destination: input.destination.ok_or(ExecutionError::Invariant)?.clone().into(),
                },
                "fish" => NativeCommand::Fish {
                    envelope,
                    target_id: target()?,
                    item_id: input.item_id.ok_or(ExecutionError::Invariant)?.into(),
                },
                "strike" => NativeCommand::Strike {
                    envelope,
                    target_id: target()?,
                    target_life: None,
                    definition_id: definition()?,
                    weapon_item_id: None,
                    auto_equip: None,
                },
                _ => return Err(ExecutionError::UnsupportedFamily),
            })
        })
    }

    fn bind_offer(
        &self,
        id: &str,
        purpose: Option<&str>,
        input: &impl Serialize,
        fields: usize,
        map_storage: usize,
        bind: impl FnOnce(CommandEnvelope) -> Result<NativeCommand, ExecutionError>,
    ) -> Result<(NativeCommand, ByteReservation), ExecutionError> {
        let length =
            crate::encoding::json_record_len(input).map_err(|_| ExecutionError::Invariant)?;
        // The emitted form and its immutable backing may overlap. The
        // borrowed arguments bound the copied typed text by the same length.
        let mut guard = self.budget.reserve(
            length
                .checked_mul(3)
                .and_then(|bytes| bytes.checked_add(map_storage))
                .and_then(|bytes| bytes.checked_add(size_of::<CommandEnvelope>()))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let envelope = CommandEnvelope::offered(id, &self.actor, purpose, input, fields)
            .map_err(|_| ExecutionError::Invariant)?;
        let command = bind(envelope)?;
        guard.resize(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok((command, guard))
    }

    fn start(
        &mut self,
        core: &mut CoreMutation<'_>,
        id: (String, ByteReservation),
        meaning: NpcOfferMeaning,
        command: NativeCommand,
        mut guard: ByteReservation,
        transition: WorkTransitionMode,
    ) -> Result<(), ExecutionError> {
        let (id, id_guard) = id;
        guard.merge(id_guard)?;
        let copy = self
            .budget
            .reserve(command.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        let preview = command.clone();
        self.preview_offer(
            core,
            preview,
            copy,
            PreparedNpcOffer {
                description: None,
                id,
                meaning,
                command: PreparedNpcInstruction::Command(command),
                transition,
                temporary: None,
                next_at: None,
                _storage: guard,
            },
        )
    }

    fn preview_offer(
        &mut self,
        core: &mut CoreMutation<'_>,
        command: NativeCommand,
        copy: ByteReservation,
        offer: PreparedNpcOffer,
    ) -> Result<(), ExecutionError> {
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.geometry_revision(),
            core.journal.next_provider_serial()?,
        );
        self.child = Some(CommandChoiceCursor::new(
            command,
            offer.transition,
            binding,
            &self.budget,
        )?);
        self.child_copy = Some(copy);
        self.pending = Some(offer);
        Ok(())
    }
    fn id(&self, parts: &[&str]) -> Result<(String, ByteReservation), ExecutionError> {
        let bytes = parts
            .iter()
            .try_fold(0usize, |n, p| n.checked_add(p.len()))
            .ok_or(ExecutionError::Capacity)?;
        let guard = self.budget.reserve(bytes)?;
        let mut id = String::with_capacity(bytes);
        for part in parts {
            id.push_str(part)
        }
        Ok((id, guard))
    }
    pub(crate) fn geometry_request(&self) -> Option<&GeometryQueries> {
        self.queries
            .as_ref()
            .or_else(|| {
                self.activity
                    .as_ref()
                    .and_then(|activity| activity.queries.as_ref())
            })
            .or_else(|| {
                self.sight
                    .as_ref()
                    .map(crate::reception::SightBatch::queries)
            })
            .or_else(|| {
                self.child
                    .as_ref()
                    .and_then(CommandChoiceCursor::geometry_request)
            })
    }
    pub(crate) fn display_cursor(&mut self) -> Option<&mut ActivityDisplayCursor> {
        self.plan_display.as_mut().or_else(|| {
            self.child
                .as_mut()
                .and_then(CommandChoiceCursor::display_cursor)
        })
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if let Some(child) = self.child.as_mut() {
            child.abort(core)?
        }
        self.done = true;
        Ok(())
    }

    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<NpcCandidateAnswer>,
    ) -> Result<NpcCandidateStep<'a>, ExecutionError> {
        if self.done {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let mut child_answer = None;
        if let Some(answer) = answer {
            match answer {
                NpcCandidateAnswer::Descriptions(answer) => {
                    let request = self
                        .description_request
                        .as_ref()
                        .ok_or(ExecutionError::InvalidCheckpoint)?;
                    if request.binding != answer.binding
                        || answer.descriptions.len() != self.offers.len()
                    {
                        return Err(ExecutionError::InvalidCheckpoint);
                    }
                    self.reserve(
                        answer
                            .descriptions
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    for (offer, description) in self.offers.iter_mut().zip(answer.descriptions) {
                        // Completed interaction terms already carry their
                        // authored wording. The formatter adds no more detail.
                        if matches!(
                            offer.meaning,
                            NpcOfferMeaning::Handover { .. } | NpcOfferMeaning::PublicAppeal
                        ) {
                            continue;
                        }
                        if let Some(prepared) = offer.description.as_mut() {
                            casting::append_offer_details(
                                prepared,
                                &description,
                                &mut offer._storage,
                                &self.budget,
                            )?;
                        } else {
                            offer.description = Some(description);
                        }
                    }
                    self.activity_done
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .finish_labels(answer.activity_labels)?;
                    self.description_request = None;
                    self.descriptions_done = true;
                }
                NpcCandidateAnswer::Geometry(answer) if self.sight.is_some() => {
                    let sight = self
                        .sight
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(answer)
                        .map_err(sensor_error)?;
                    for target in &mut self.targets {
                        target.visible = sight.seen(&target.id) == Some(true);
                    }
                }
                NpcCandidateAnswer::Geometry(answer)
                    if self
                        .activity
                        .as_ref()
                        .is_some_and(|activity| activity.queries.is_some()) =>
                {
                    self.activity
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?
                        .answer(answer)?;
                }
                NpcCandidateAnswer::Geometry(answer)
                    if matches!(self.waiting, Some(Waiting::GiftReach)) =>
                {
                    self.finish_gift_reach(core, answer)?
                }
                NpcCandidateAnswer::Geometry(answer) if self.queries.is_some() => {
                    self.answer_geometry(core, answer)?
                }
                NpcCandidateAnswer::Geometry(answer) => {
                    child_answer = Some(CommandChoiceAnswer::Geometry(answer))
                }
                NpcCandidateAnswer::Display(answer) if self.plan_display.is_some() => {
                    self.finish_work_view(core, answer)?;
                }
                NpcCandidateAnswer::Display(answer) => {
                    child_answer = Some(CommandChoiceAnswer::Display(answer))
                }
            }
        }
        loop {
            if self.description_request.is_some() {
                return Ok(NpcCandidateStep::Descriptions(
                    self.description_request
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?,
                ));
            }
            if self.sight.is_some() {
                return Ok(NpcCandidateStep::Geometry(
                    self.sight
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .queries(),
                ));
            }
            if self
                .activity
                .as_ref()
                .is_some_and(|activity| activity.queries.is_some())
            {
                return Ok(NpcCandidateStep::Geometry(
                    self.activity
                        .as_ref()
                        .and_then(|activity| activity.queries.as_ref())
                        .ok_or(ExecutionError::Invariant)?,
                ));
            }
            if self.plan_display.is_some() {
                return Ok(NpcCandidateStep::Display(
                    self.plan_display
                        .as_mut()
                        .ok_or(ExecutionError::Invariant)?,
                ));
            }
            if self.queries.is_some() {
                return Ok(NpcCandidateStep::Geometry(
                    self.queries.as_ref().ok_or(ExecutionError::Invariant)?,
                ));
            }
            if let Some(child) = self.child.as_mut() {
                let completed = match child.step(core, child_answer.take())? {
                    CommandChoiceStep::Complete(value) => Some(value),
                    _ => None,
                };
                if let Some(completed) = completed {
                    let (outcome, guard) = completed.into_parts();
                    let mut offer = self.pending.take().ok_or(ExecutionError::Invariant)?;
                    if outcome.ok {
                        self.describe_cast(core, &mut offer)?;
                        self.describe_cooking(core, &mut offer)?;
                        self.describe_fire(core, &mut offer)?;
                        self.describe_equipped_strike(core, &mut offer)?;
                        self.describe_ranged(core, &mut offer)?;
                        if let Some(proposals) = self.gift_proposals.as_mut()
                            && offer
                                .command
                                .handover()
                                .is_some_and(|choice| choice.offered_lot().is_some())
                        {
                            proposals.completed += 1;
                        }
                        self.append(offer)?;
                    } else if matches!(
                        offer.meaning,
                        NpcOfferMeaning::Strike { .. } | NpcOfferMeaning::Evade { .. }
                    )
                        && matches!(
                            outcome.code.as_str(),
                            "combat-recovery" | "evasion-recovery"
                        )
                    {
                        offer.next_at = core
                            .state
                            .physical
                            .entities
                            .get(&self.actor)
                            .and_then(|entity| entity.actor.as_ref())
                            .and_then(|actor| {
                                if outcome.code == "combat-recovery" {
                                    actor.combat_ready_at
                                } else {
                                    actor.evasion_ready_at
                                }
                            });
                        offer.temporary = Some(outcome);
                        offer._storage.merge(guard)?;
                        self.append(offer)?;
                    }
                    self.child = None;
                    self.child_copy = None;
                } else if self
                    .child
                    .as_ref()
                    .and_then(CommandChoiceCursor::geometry_request)
                    .is_some()
                {
                    return Ok(NpcCandidateStep::Geometry(
                        self.child
                            .as_ref()
                            .and_then(CommandChoiceCursor::geometry_request)
                            .ok_or(ExecutionError::Invariant)?,
                    ));
                } else {
                    return Ok(NpcCandidateStep::Display(
                        self.child
                            .as_mut()
                            .and_then(CommandChoiceCursor::display_cursor)
                            .ok_or(ExecutionError::Invariant)?,
                    ));
                }
                continue;
            }
            if child_answer.is_some() {
                return Err(ExecutionError::InvalidCheckpoint);
            }
            if self.enumerate(core)? {
                continue;
            }
            if self.coverage.is_none() {
                self.done = true;
                return Ok(NpcCandidateStep::Complete(PreparedNpcRead::Recall(
                    PreparedNpcRecall {
                        selection: self.selection.take().ok_or(ExecutionError::Invariant)?,
                        work_context: self.work_context.take().ok_or(ExecutionError::Invariant)?,
                        _storage: self.storage.take().ok_or(ExecutionError::Invariant)?,
                    },
                )));
            }
            if self.activity_done.is_none() {
                if self.activity.is_none() {
                    self.activity = Some(NpcActivityPreparation::prepare(
                        core,
                        &self.actor,
                        &self.targets,
                        self.candidate,
                        &self.budget,
                    )?);
                    continue;
                }
                self.activity_done = Some(
                    self.activity
                        .take()
                        .ok_or(ExecutionError::Invariant)?
                        .finish(core, &self.actor, &self.targets, &self.budget)?,
                );
            }
            if !self.descriptions_done
                && (!self.offers.is_empty()
                    || self
                        .activity_done
                        .as_ref()
                        .is_some_and(|activity| !activity.labels.is_empty()))
            {
                self.description_request = Some(NpcDescriptionsRequest::prepare(
                    core,
                    self.description_context
                        .take()
                        .ok_or(ExecutionError::Invariant)?,
                    &self.targets,
                    &self.offers,
                    self.activity_done
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?,
                    self.candidate,
                    &self.budget,
                )?);
                continue;
            }
            self.description_context = None;
            self.done = true;
            self.reserve(
                self.targets
                    .len()
                    .checked_mul(size_of::<usize>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut visible_body_ordinals = Vec::with_capacity(self.targets.len());
            visible_body_ordinals.extend(
                self.targets
                    .iter()
                    .filter(|target| target.visible)
                    .map(|target| target.body),
            );
            return Ok(NpcCandidateStep::Complete(PreparedNpcRead::Offers(
                PreparedNpcCandidates {
                    offers: std::mem::take(&mut self.offers),
                    work_context: self.work_context.take().ok_or(ExecutionError::Invariant)?,
                    visible_body_ordinals,
                    activity: self.activity_done.take().ok_or(ExecutionError::Invariant)?,
                    selection: self.selection.take().ok_or(ExecutionError::Invariant)?,
                    work: self.work.take().ok_or(ExecutionError::Invariant)?,
                    _work_storage: self.work_storage.take().ok_or(ExecutionError::Invariant)?,
                    _storage: self.storage.take().ok_or(ExecutionError::Invariant)?,
                },
            )));
        }
    }
}
fn sensor_error(error: crate::reception::SensorError) -> ExecutionError {
    use crate::reception::SensorError::*;
    match error {
        Capacity => ExecutionError::Capacity,
        MissingObserver => ExecutionError::MissingActor,
        PhysicalPosition => ExecutionError::InvalidPosition,
        UnsupportedFamily => ExecutionError::UnsupportedFamily,
        Capability | Geometry => ExecutionError::Invariant,
    }
}
