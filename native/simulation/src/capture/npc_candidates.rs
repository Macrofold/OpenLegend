//! Actor-scoped discovery uses the same prospective command owner as Source.
//! This cursor runs under a private candidate checkpoint: it never admits an
//! action or allocates a world ID. The caller closes that checkpoint before
//! retaining this detached inventory alongside its originating accepted read.
use super::{ActorReadPurpose, NpcObservationSelection};
use crate::commands::{
    ActivityDisplayCursor, CommandChoiceAnswer, CommandChoiceCursor, CommandChoiceStep,
    CompletedActivityDisplay, NativeCommand, Outcome, WorkTransitionMode,
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
use work::NpcWorkContext;

struct Target {
    body: usize,
    id: String,
    observed: Point,
    support: Option<String>,
    interaction_height: f64,
    alive: bool,
    visible: bool,
}
#[derive(Clone, Copy)]
enum Enumerate {
    Visibility,
    Activities,
    Inventory,
    Continue,
    Follow(usize, usize),
    Status(usize, usize),
    Probe(usize),
    Approach(usize),
    Strike(usize, usize),
    CurrentWork(usize),
    PausedWork(usize),
    Done,
}
#[derive(Clone, Copy)]
enum Waiting {
    Reach(usize),
    Route(usize),
}

pub(crate) struct NpcCandidateCursor {
    actor: String,
    candidate: CandidateKey,
    coverage: NpcOfferCoverage,
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
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandInput<'a> {
    actor_id: &'a str,
    id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    purpose: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    auto_equip: Option<bool>,
    #[serde(rename = "type")]
    kind: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    target_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    definition_id: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    operation: Option<&'a str>,
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
            auto_equip: None,
            kind,
            target_id: None,
            definition_id: None,
            operation: None,
            destination: None,
            after: None,
            method_after: None,
        }
    }
}

impl NpcCandidateCursor {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        read: &AcceptedActorRead,
        expanded: &[usize],
        coverage: NpcOfferCoverage,
        candidate: CandidateKey,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        if candidate.base_cut != read.accepted_cut
            || !matches!(read.purpose, ActorReadPurpose::NpcDecision)
        {
            return Err(ExecutionError::InvalidCheckpoint);
        }
        let selection = NpcObservationSelection::prepare(core.state, read, expanded, budget)?;
        let bytes = selection
            .body_ordinals()
            .len()
            .checked_mul(size_of::<Target>())
            .and_then(|n| n.checked_add(read.perception.actor_id.len() + size_of::<Self>()))
            .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let mut targets = Vec::with_capacity(selection.body_ordinals().len());
        let cut = read.perception.evidence.cut();
        for &index in selection.body_ordinals() {
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
                visible: false,
            });
        }
        let (work, work_storage) =
            ResponseWorkIdentity::capture(core.state, &read.perception.actor_id, budget)?;
        let work_context = NpcWorkContext::prepare(core, &read.perception.actor_id, budget)?;
        let actor = core
            .state
            .physical
            .entities
            .get(&read.perception.actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .ok_or(ExecutionError::MissingActor)?;
        let stage = if !actor.alive || actor.incapacitated || core.state.physical.header.paused {
            Enumerate::Done
        } else {
            Enumerate::Visibility
        };
        Ok(Self {
            actor: read.perception.actor_id.clone(),
            candidate,
            coverage,
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
            work: Some(work),
            work_storage: Some(work_storage),
            budget: budget.clone(),
            storage: Some(budget.reserve(size_of::<PreparedNpcCandidates>())?),
            _cursor_storage: storage,
            done: false,
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
        let length =
            crate::encoding::json_record_len(input).map_err(|_| ExecutionError::Invariant)?;
        let mut guard = self.budget.reserve(
            length
                .checked_mul(2)
                .map(|n| n.max(8))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let json = crate::encoding::json_record(input).map_err(|_| ExecutionError::Invariant)?;
        guard.resize(
            guard
                .bytes()
                .checked_add(
                    crate::experience::encoded_body_bound(&json)
                        .map_err(|_| ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let command: NativeCommand =
            serde_json::from_str(&json).map_err(|_| ExecutionError::Invariant)?;
        drop(json);
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
        let binding = GeometryBinding::new(
            self.candidate,
            core.state.installed.geometry.spatial.revision,
            core.journal.next_provider_serial()?,
        );
        let child = CommandChoiceCursor::new(command.clone(), transition, binding, &self.budget)?;
        self.child = Some(child);
        self.child_copy = Some(copy);
        self.pending = Some(PreparedNpcOffer {
            id,
            meaning,
            command: Some(command),
            transition,
            temporary: None,
            next_at: None,
            _storage: guard,
        });
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
            if self.sight.is_some() {
                return Ok(NpcCandidateStep::Geometry(
                    self.sight
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .queries(),
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
                        self.append(offer)?;
                    } else if matches!(offer.meaning, NpcOfferMeaning::Strike { .. })
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
            return Ok(NpcCandidateStep::Complete(PreparedNpcCandidates {
                offers: std::mem::take(&mut self.offers),
                work_context: self.work_context.take().ok_or(ExecutionError::Invariant)?,
                visible_body_ordinals,
                selection: self.selection.take().ok_or(ExecutionError::Invariant)?,
                work: self.work.take().ok_or(ExecutionError::Invariant)?,
                _work_storage: self.work_storage.take().ok_or(ExecutionError::Invariant)?,
                _storage: self.storage.take().ok_or(ExecutionError::Invariant)?,
            }));
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
