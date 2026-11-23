//! One command's actual continuation inside its caller's candidate checkpoint.
//! Geometry is finite provider data; occurrences and personal results are
//! resumed only with proofs from their real native semantic owners.

use super::*;
use crate::activity::{ActivityView, PendingActivityResult};
use crate::events::{
    AudienceSelection, CompletedOccurrence, EmissionText, EventEmissionIntent, EventScope,
};
use crate::execution::{
    ActionWrite, CoreMutation, ExecutionError, PendingStatusEnd, PlanGenerationWrite,
    StagedOccurrence, StatusActivationAnswer, StatusActivationCursor, StatusActivationProgress,
    StatusEnd,
};
use crate::experience::AcquiredActivityResult;
use crate::geometry::{
    GeometryAnswers, GeometryBinding, GeometryQueries, RoutePlan, RouteQuery, StandingQuery,
    SupportQuery, WalkingSegment,
};
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::narration::{Narration, NarrationPart, PersonRole};
use crate::state::{Action, NavigationPending, SurfacePoint};
use crate::work::{MeterToken, WorkUnit};
mod discovery;
mod casting;
mod preparing_food;
mod fire;
mod scar_treatment;
mod practice;
mod ranged;
mod guard;
mod respawn;
mod follow;
mod hearth;
mod travel;
mod typed_plan;
mod manufacture;
mod equipment;
pub(crate) use equipment::equipment_preview;
mod transfer_item;
mod eating;
mod drop;
mod pickup;
mod inspect_activities;
mod descriptive_act;
mod inspect_item;
mod inspect_storage;
mod learn_record;
mod feeding;
mod gathering;
mod natural_contact;
mod handover;

pub(crate) struct NativeMovementInput {
    pub binding: crate::native_response::NativeLocomotion,
    pub route: Option<crate::native_refuge::RefugeRoute>,
    pub prepared: Option<crate::geometry::GuardedRoutePlan>,
}
pub(crate) struct CommandOptions {
    pub preview: bool,
    pub native_controller: bool,
    pub native_movement: Option<NativeMovementInput>,
    pub trade_evidence: Option<std::sync::Arc<crate::handover::TradeEvidence>>,
    pub durable_receipt: bool,
}
pub(crate) enum CommandAnswer {
    Geometry(GeometryAnswers),
    Occurrence(CompletedOccurrence),
    Personal(AcquiredActivityResult),
    EvidenceEnded(crate::reception::EndedCurrentEvidence),
    Display(super::CompletedActivityDisplay),
    TravelTerms(crate::language::CanonicalJsonAnswer),
}
pub(crate) enum CommandStep<'a> {
    Geometry(&'a GeometryQueries),
    TravelTerms(&'a crate::language::CanonicalJsonRequest),
    Occurrence(StagedOccurrence),
    Personal(&'a PendingActivityResult),
    EndEvidence {
        observer_id: &'a str,
        physical_life: u64,
        at: f64,
    },
    Display(&'a mut super::ActivityDisplayCursor),
    Complete(super::PendingCommandCompletion),
}
pub(super) enum Progress {
    Geometry,
    TravelTerms,
    Occurrence(StagedOccurrence),
    Personal,
    EndEvidence,
    Display,
    Complete(super::PendingCommandCompletion),
    Choice(super::PreparedCommandChoice),
}
#[derive(Clone, Copy)]
enum Phase {
    Start,
    Support,
    Standing,
    Route,
    Follow,
    FeedReach,
    ScarReach,
    PracticeReach,
    GuardSight,
    RangedSight,
    RangedPointReview,
    RangedRelease,
    RespawnSupport,
    RespawnStanding,
    RespawnConditions,
    RespawnArrival,
    GatherSight,
    CastSight,
    CastLine,
    CookSight,
    FireSight,
    HearthGeometry,
    DropStanding,
    TravelStartSight,
    TravelReach,
    TravelDestination,
    TravelTerms,
    TravelEndReception,
    TravelNotices,
    TravelChoice,
    TravelAccept,
    TypedPlan,
    HearthRoutes,
    HearthNavigation,
    CookReach,
    GiftSight,
    GiftSightBack,
    GiftReach,
    GiftHearing,
    GiftHearingBack,
    GiftApply,
    GiftPrivate,
    ContactReach,
    StorageSight,
    StorageReach,
    LearnRecordSight,
    LearnRecordReach,
    StoragePage,
    ContactRoute,
    FeedApproach,
    Probe,
    Prepared,
    Choice,
    RecordPrepared,
    RecordStatus,
    RecordSpeech,
    Interrupt,
    Replace,
    Install,
    ContactAfterEquip,
    AfterDeparture,
    CancelEnd,
    CancelClear,
    Deactivate,
    StatusSight,
    StatusReach,
    StatusApply,
    StatusFacts,
    Speech,
    EatNarration,
    ImmediateResult,
    Tail,
    Conditions,
    DiscoverySight,
    DiscoveryReach,
    DiscoveryRoute,
    Done,
}
enum PersonalTask {
    Replaced(PendingActivityResult),
    Status(PendingStatusEnd),
    Immediate(PendingActivityResult),
}
impl PersonalTask {
    fn result(&self) -> &PendingActivityResult {
        match self {
            Self::Replaced(p) | Self::Immediate(p) => p,
            Self::Status(p) => p.personal(),
        }
    }
}
pub(crate) struct CommandCursor {
    command: NativeCommand,
    canonical: Option<String>,
    view: Option<ActivityView>,
    view_reservation: Option<ByteReservation>,
    display: Option<super::ActivityDisplayCursor>,
    prepared_emission: Option<EventEmissionIntent>,
    storage_inspection: Option<inspect_storage::PreparedStorage>,
    respawn: Option<Box<respawn::Search>>,
    before_action_id: Option<String>,
    chosen_work_done: bool,
    source_scope_started: bool,
    conditions: Option<crate::conditions::ConditionReconcileCursor>,
    exposure: Option<super::exposure::CommandExposure>,
    options: CommandOptions,
    preparation_mode: Option<super::WorkTransitionMode>,
    discovery_approaching: bool,
    discovery_starts_work: bool,
    chosen_contact: Option<crate::contact::review::ChosenContact>,
    selected_equipment_revision: Option<u64>,
    strike_confirmation: Option<Box<(crate::contact::StrikePermission, ByteReservation)>>,
    strike_review: Option<Box<crate::contact::StrikeReviewOffer>>,
    phase: Phase,
    queries: Option<GeometryQueries>,
    contact_route: Option<crate::contact::StrikeRoute>,
    ranged_release: Option<Box<crate::movement::MoveAdvanceCursor>>,
    ranged_point_review: Option<Box<(crate::projectile::point_review::PointReview, ByteReservation)>>,
    follow: Option<crate::movement::follow::FollowCursor>,
    hearth: Option<hearth::PreparedHearth>,
    travel: Option<Box<travel::Consent>>,
    typed_plan_mode: Option<crate::plans::PlanMode>,
    typed_plan: Option<Box<typed_plan::PreparedWalk>>,
    binding: GeometryBinding,
    resolved: Option<SurfacePoint>,
    action: Option<Action>,
    action_storage: Option<ByteReservation>,
    production_debits: Option<crate::execution::OwnedDebits>,
    activity_id: Option<String>,
    interrupt_at: usize,
    personal: Option<PersonalTask>,
    event: Option<String>,
    after_event: Phase,
    gift_notice: Option<handover::GiftNotice>,
    gift_sound: Option<crate::reception::SoundBatch>,
    gift_counterpart_notice: bool,
    pending_release: Option<String>,
    sight: Option<crate::reception::SightBatch>,
    status_was_active: bool,
    activation: Option<StatusActivationCursor>,
    budget: ByteBudget,
    outcome: Option<Outcome>,
    meter: Option<MeterToken>,
    duplicate: bool,
    finalize: bool,
    materialized: bool,
    _reservation: ByteReservation,
}
fn outcome(ok: bool, code: &str, message: &str) -> Outcome {
    Outcome {
        spent: None,
        outputs: None,
        ok,
        code: code.to_owned(),
        message: message.into(),
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}

/// Start with either separately supplied bytes to check or the sealed pair
/// prepared by the stand-alone player binding owner.
pub(crate) enum CommandStart {
    Separate(NativeCommand, String),
    Player(super::player::BoundPlayerCommand),
}

impl CommandStart {
    pub(crate) fn command(&self) -> &NativeCommand {
        match self {
            Self::Separate(command, _) => command,
            Self::Player(bound) => bound.command(),
        }
    }
}

impl CommandCursor {
    pub(crate) fn from_start(
        input: CommandStart,
        options: CommandOptions,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        match input {
            CommandStart::Separate(command, canonical) => {
                Self::new(command, canonical, options, binding, budget)
            }
            CommandStart::Player(bound) => {
                let (command, canonical) = bound.into_parts();
                Self::admit(command, Some(canonical), options, binding, budget)
            }
        }
    }

    pub(crate) fn needs_known_places(&self) -> bool {
        !self.options.preview && matches!(self.command, NativeCommand::Say { .. })
    }

    fn canonical(&self) -> &str {
        self.canonical
            .as_deref()
            .unwrap_or_else(|| self.command.source_encoding())
    }

    /// The controller's sealed operation already owns the exact Source bytes
    /// used for the input-work charge. It has no idempotency receipt.
    pub(super) fn from_native_movement(
        input: super::native_movement::BoundNativeMovement,
        native_movement: Option<NativeMovementInput>,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        Self::admit(
            input.into_command(),
            None,
            CommandOptions {
                preview: false,
                native_controller: true,
                native_movement,
                trade_evidence: None,
                durable_receipt: false,
            },
            binding,
            budget,
        )
    }

    /// Admit the command with the exact bytes used for its receipt digest.
    /// A separately supplied canonical form must describe the same command.
    pub(crate) fn new(
        command: NativeCommand,
        canonical: String,
        options: CommandOptions,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        // Speech binds its text and recipient together with the source encoding.
        // Matching bytes already establish the canonical form for this command.
        let same_speech_encoding =
            matches!(command, NativeCommand::Say { .. }) && command.source_encoding() == canonical;
        // The authenticated binder constructs these typed operations directly.
        // Raw command decoding does not grant their private authority.
        if !same_speech_encoding
            && !matches!(
                command,
                NativeCommand::Cancel {
                    dismiss_review: true,
                    ..
                } | NativeCommand::DescriptiveAct { .. }
                    | NativeCommand::TransferItem { .. }
                    | NativeCommand::Drop { group: Some(_), .. }
            )
        {
            let decoded: NativeCommand =
                serde_json::from_str(&canonical).map_err(|_| ExecutionError::Invariant)?;
            if decoded != command {
                return Err(ExecutionError::Invariant);
            }
        }
        Self::admit(command, Some(canonical), options, binding, budget)
    }

    fn admit(
        command: NativeCommand,
        canonical: Option<String>,
        options: CommandOptions,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bytes = std::mem::size_of::<Self>()
            + canonical.as_ref().map_or(0, String::capacity)
            + command.heap_bytes().ok_or(ExecutionError::Capacity)?
            + options
                .native_movement
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        Ok(Self {
            command,
            canonical,
            view: None,
            view_reservation: None,
            display: None,
            prepared_emission: None,
            storage_inspection: None,
            respawn: None,
            before_action_id: None,
            chosen_work_done: false,
            source_scope_started: false,
            conditions: None,
            exposure: None,
            options,
            preparation_mode: None,
            discovery_approaching: false,
            discovery_starts_work: false,
            chosen_contact: None,
            selected_equipment_revision: None,
            strike_confirmation: None,
            strike_review: None,
            phase: Phase::Start,
            queries: None,
            contact_route: None,
            ranged_release: None,
            ranged_point_review: None,
            follow: None,
            hearth: None,
            travel: None,
            typed_plan_mode: None,
            typed_plan: None,
            binding,
            resolved: None,
            action: None,
            action_storage: None,
            production_debits: None,
            activity_id: None,
            interrupt_at: 0,
            personal: None,
            event: None,
            after_event: Phase::Tail,
            gift_notice: None,
            gift_sound: None,
            gift_counterpart_notice: false,
            pending_release: None,
            sight: None,
            status_was_active: false,
            activation: None,
            budget: budget.clone(),
            outcome: None,
            meter: None,
            duplicate: false,
            finalize: false,
            materialized: false,
            _reservation: reservation,
        })
    }
    pub(crate) fn with_typed_plan(mut self, mode: Option<crate::plans::PlanMode>) -> Self {
        self.typed_plan_mode = mode;
        self
    }

    pub(super) fn travel_terms(&self) -> Option<&crate::language::CanonicalJsonRequest> {
        self.travel.as_ref()?.notice.as_ref()?.canonical_request().ok()
    }
    pub(super) fn display_cursor(&mut self) -> Option<&mut super::ActivityDisplayCursor> {
        if matches!(self.phase, Phase::TypedPlan) { return self.typed_plan.as_mut()?.display(); }
        if matches!(self.phase, Phase::TravelChoice | Phase::TravelAccept) {
            return self.travel.as_mut()?.display();
        }
        self.display.as_mut()
    }
    pub(super) fn geometry_request(&self) -> Option<&GeometryQueries> {
        if matches!(self.phase, Phase::TypedPlan) { return self.typed_plan.as_ref()?.geometry(); }
        if matches!(self.phase, Phase::TravelChoice | Phase::TravelAccept | Phase::TravelEndReception) {
            return self.travel.as_ref()?.queries();
        }
        if let Some(release) = &self.ranged_release {
            return release.queries().ok();
        }
        self.sight
            .as_ref()
            .map(|sight| sight.queries())
            .or_else(|| self.ranged_point_review.as_ref().map(|owner| owner.0.queries()))
            .or_else(|| self.gift_sound.as_ref().map(|sound| sound.queries()))
            .or_else(|| self.contact_route.as_ref().map(|route| route.queries()))
            .or_else(|| self.follow.as_ref().and_then(|cursor| cursor.queries()))
            .or(self.queries.as_ref())
    }
    pub(crate) fn actor_id(&self) -> &str {
        &self.command.envelope().actor_id
    }
    /// The coordinator calls this on an operational error before rolling back
    /// its command checkpoint. Operational work already spent is never refunded.
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        // The selected travel cursor can still own an ordinary child
        // preview. Close its nested work meter before this command's meter.
        if let Some(mut child) = self.typed_plan.take() { child.close(core)?; }
        if let Some(mut child) = self.travel.take() {
            child.abort(core)?;
        }
        if let Some(meter) = self.meter.take() {
            core.journal.meters.finish(meter)?;
        }
        self.display = None;
        self.view = None;
        self.view_reservation = None;
        self.prepared_emission = None;
        self.storage_inspection = None;
        self.conditions = None;
        self.exposure = None;
        self.follow = None;
        Ok(())
    }
    fn begin_chosen_work(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if self.chosen_work_done {
            return Ok(());
        }
        self.chosen_work_done = true;
        if self.options.native_controller || self.outcome.as_ref().is_none_or(|outcome| !outcome.ok)
        {
            return Ok(());
        }
        let actor_id = &self.command.envelope().actor_id;
        let action = core
            .state
            .physical
            .entities
            .get(actor_id)
            .and_then(|entity| entity.actor.as_ref())
            .and_then(|actor| actor.action.as_ref());
        let Some(action) =
            action.filter(|action| self.before_action_id.as_deref() != Some(action.id.as_str()))
        else {
            return Ok(());
        };
        let _name = self.budget.reserve(action.id.len())?;
        let action_id = action.id.clone();
        core.physical().begin_semantic_work(actor_id, &action_id)
    }
    fn begin_source_scope(&mut self, core: &mut CoreMutation<'_>) -> Result<(), ExecutionError> {
        if !self.source_scope_started {
            core.begin_received_value_scope()?;
            self.source_scope_started = true;
        }
        Ok(())
    }
    fn needs_display(&mut self, core: &mut CoreMutation<'_>) -> Result<bool, ExecutionError> {
        if self.options.native_controller || self.view.is_some() {
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Gather { .. }) {
            self.prepare_gathering_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Pickup { .. }) {
            self.prepare_pickup_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Fish { .. }) {
            self.prepare_cast_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Craft { .. }) {
            self.prepare_craft_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::PlaceHearth { .. }) {
            self.prepare_hearth_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::TendFire { .. }) {
            self.prepare_fire_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::TreatScar { .. }) {
            self.prepare_scar_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Guard { .. }) {
            self.prepare_guard_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Ranged { .. }) {
            self.prepare_ranged_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::PracticeShot { .. }) {
            self.prepare_practice_view(core)?;
            return Ok(false);
        }
        if matches!(self.command, NativeCommand::Cook { .. }) {
            self.prepare_cook_view(core)?;
            return Ok(false);
        }
        if self.display.is_none() {
            let candidate = crate::host::CandidateKey {
                id: self.binding.candidate_id,
                base_cut: self.binding.base_cut,
                generation: self.binding.generation,
            };
            self.display = Some(super::ActivityDisplayCursor::prepare(
                core,
                &self.command,
                candidate,
                &self.budget,
            )?);
        }
        Ok(true)
    }
    pub(super) fn budget(&self) -> &ByteBudget {
        &self.budget
    }
    /// Only an accepted plan can activate a chosen contact. Caller-provided
    /// command fields cannot turn discovery into execution.
    pub(crate) fn for_planned_contact(mut self) -> Self {
        self.chosen_contact = matches!(self.command, NativeCommand::Strike { .. })
            .then_some(crate::contact::review::ChosenContact::Npc);
        self
    }

    /// This argument comes from the signed-in application command owner, never
    /// from the submitted command text or an NPC operation.
    pub(crate) fn for_player_contact(
        mut self,
        strike: crate::contact::review::PlayerStrike<'_>,
    ) -> Result<Self, ExecutionError> {
        let permission = strike.permission;
        self.selected_equipment_revision = strike.equipment_revision;
        self.reserve(
            permission
                .map_or(Some(0), |value| {
                    value
                        .heap_bytes()?
                        .checked_add(std::mem::size_of_val(value))
                })
                .ok_or(ExecutionError::Capacity)?,
        )?;
        self.chosen_contact = Some(crate::contact::review::ChosenContact::Player(
            permission.map(|permit| Box::new(permit.clone())),
        ));
        Ok(self)
    }

    pub(super) fn for_preparation(mut self, mode: super::WorkTransitionMode) -> Self {
        self.preparation_mode = Some(mode);
        self
    }
    fn prepare_view(
        &mut self,
        view: &mut ActivityView,
        ordinary: &crate::worlds::InstalledOrdinaryActionRules,
    ) -> Result<(), ExecutionError> {
        if self.discovery_approaching
            || self
                .action
                .as_ref()
                .is_some_and(|action| action.stage == "approaching")
        {
            self.reserve(
                crate::activity::approach_view_bytes(
                    view,
                    &ordinary.approach_name,
                    &ordinary.approach_facts,
                )
                .ok_or(ExecutionError::Capacity)?,
            )?;
            crate::activity::prepare_approach_view(
                view,
                &ordinary.approach_name,
                &ordinary.approach_facts,
            );
        }
        Ok(())
    }
    fn take_prepared_view(
        &mut self,
        ordinary: &crate::worlds::InstalledOrdinaryActionRules,
    ) -> Result<(ActivityView, ByteReservation), ExecutionError> {
        let mut view = self.view.take().ok_or(ExecutionError::Invariant)?;
        let mut storage = self
            .view_reservation
            .take()
            .ok_or(ExecutionError::Invariant)?;
        self.prepare_view(&mut view, ordinary)?;
        let actual = view.heap_bytes().ok_or(ExecutionError::Capacity)?;
        if actual > storage.bytes() {
            // prepare_view already funded the added approach facts. Move that
            // same custody with the enriched view into its canonical owner.
            storage.merge(self._reservation.split_off(actual - storage.bytes())?)?;
        }
        storage.resize(actual)?;
        Ok((view, storage))
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), ExecutionError> {
        self._reservation.resize(
            self._reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn grow_action_storage(&mut self, extra: usize) -> Result<(), ExecutionError> {
        let storage = self
            .action_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?;
        storage.resize(
            storage
                .bytes()
                .checked_add(extra)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    // Accept the same finite provider plan whether this command asked for it
    // or the native controller already evaluated it within this candidate.
    fn accept_ground_route(
        &mut self,
        core: &mut CoreMutation<'_>,
        plan: crate::geometry::GuardedRoutePlan,
        ordinary: &crate::worlds::InstalledOrdinaryActionRules,
    ) -> Result<(), ExecutionError> {
        let crate::geometry::GuardedRoutePlan(route, storage) = plan;
        if self.options.native_controller
            && !core.physical().admit_territorial_detour(
                &self.command.envelope().actor_id,
                &route,
            )?
        {
            self.refuse(&ordinary.no_route);
            self.queries = None;
            return Ok(());
        }
        self.action_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .merge(storage)?;
        let action =
            self.action.as_mut().ok_or(ExecutionError::Invariant)?;
        match route {
            RoutePlan::Reached { path, .. } => {
                action.path = path;
                action.stage = "approaching".to_owned();
            }
            RoutePlan::Pending { mut request, .. } => {
                if self.options.native_controller {
                    let animal = core
                        .state
                        .physical
                        .entities
                        .get(&self.command.envelope().actor_id)
                        .and_then(|entity| entity.animal.as_ref())
                        .ok_or(ExecutionError::Invariant)?;
                    let profile =
                        crate::native_controller::selected_profile(
                            &core.state.installed,
                            animal,
                        )?;
                    request.wait = Some(match profile.candidates.navigation_wait {
                        crate::native_response::NavigationWait::Entity => "entity",
                        crate::native_response::NavigationWait::World => "world",
                    }.into());
                    self.grow_action_storage(6)?;
                }
                let action = self
                    .action
                    .as_mut()
                    .ok_or(ExecutionError::Invariant)?;
                action.stage = "approaching".to_owned();
                action.navigation = Some(NavigationPending {
                    request,
                    failure: None,
                });
            }
            RoutePlan::InvalidEndpoint { .. } => {
                self.outcome = Some(outcome(
                    false,
                    "invalid-endpoint",
                    &ordinary.no_route.message,
                ));
                self.phase = Phase::Done;
            }
            RoutePlan::NoRoute { .. } => self.refuse(&ordinary.no_route),
            RoutePlan::BudgetExceeded { .. } => {
                self.refuse(&ordinary.budget_exceeded)
            }
        }
        if !matches!(self.phase, Phase::Done) {
            self.size_action_storage()?;
            self.phase = Phase::Prepared;
        }
        self.queries = None;
        Ok(())
    }

    fn size_action_storage(&mut self) -> Result<(), ExecutionError> {
        let bytes = self
            .action
            .as_ref()
            .ok_or(ExecutionError::Invariant)?
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        self.action_storage
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .resize(bytes)?;
        Ok(())
    }
    fn refuse(&mut self, message: &crate::worlds::InstalledActionMessage) {
        self.outcome = Some(message.outcome(false));
        self.phase = Phase::Done;
    }
    fn question(
        &mut self,
        core: &mut CoreMutation<'_>,
        phase: Phase,
    ) -> Result<&mut GeometryQueries, ExecutionError> {
        self.binding.serial = core.journal.next_provider_serial()?;
        self.queries = Some(GeometryQueries::new(self.binding));
        self.phase = phase;
        self.queries.as_mut().ok_or(ExecutionError::Invariant)
    }
    fn complete_status(
        &mut self,
        status: StatusEnd,
        next: Phase,
    ) -> Result<Option<StagedOccurrence>, ExecutionError> {
        match status {
            StatusEnd::Unchanged | StatusEnd::Complete => {
                self.phase = next;
                Ok(None)
            }
            StatusEnd::Occurrence(event) => {
                self.reserve(event.id.len())?;
                self.event = Some(event.id.clone());
                self.after_event = next;
                Ok(Some(event))
            }
            StatusEnd::Personal(pending) => {
                self.personal = Some(PersonalTask::Status(pending));
                self.after_event = next;
                Ok(None)
            }
        }
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<CommandStep<'a>, ExecutionError> {
        let progress = self.drive(core, answer)?;
        Ok(match progress {
            Progress::Geometry => {
                CommandStep::Geometry(self.geometry_request().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Personal => CommandStep::Personal(if let Some(pending) = &self.personal {
                pending.result()
            } else if matches!(self.phase, Phase::TypedPlan) {
                self.typed_plan.as_ref().ok_or(ExecutionError::Invariant)?.personal()?
            } else if matches!(self.phase, Phase::TravelAccept) {
                self.travel.as_deref().and_then(travel::Consent::acceptance)
                    .ok_or(ExecutionError::Invariant)?.personal()?
            } else {
                self.activation
                    .as_ref()
                    .and_then(StatusActivationCursor::personal)
                    .ok_or(ExecutionError::Invariant)?
            }),
            Progress::EndEvidence => {
                let (observer_id, physical_life, at) = self
                    .activation
                    .as_ref()
                    .and_then(StatusActivationCursor::evidence_end)
                    .ok_or(ExecutionError::Invariant)?;
                CommandStep::EndEvidence {
                    observer_id,
                    physical_life,
                    at,
                }
            }
            Progress::Occurrence(event) => CommandStep::Occurrence(event),
            Progress::TravelTerms => CommandStep::TravelTerms(
                self.travel_terms().ok_or(ExecutionError::Invariant)?,
            ),
            Progress::Display => {
                CommandStep::Display(self.display_cursor().ok_or(ExecutionError::Invariant)?)
            }
            Progress::Complete(result) => CommandStep::Complete(result),
            Progress::Choice(_) => return Err(ExecutionError::InvalidCheckpoint),
        })
    }
    pub(super) fn drive(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CommandAnswer>,
    ) -> Result<Progress, ExecutionError> {
        if matches!(self.phase, Phase::TypedPlan) { return self.typed_walk_step(core, answer); }
        if matches!(self.phase, Phase::RangedRelease) { return self.drive_ranged_release(core, answer); }
        let installed = core.state.installed.clone();
        let ordinary = installed.ordinary_actions.value();
        let mut answer = answer;
        if self.activation.is_none() && self.conditions.is_none() {
            if let Some(answer) = answer.take() {
                match answer {
                    CommandAnswer::Display(completed) => {
                        if matches!(self.phase, Phase::TravelAccept) {
                            return self.travel_accept(core, Some(crate::worlds::base_outings::TravelAcceptAnswer::Display(completed)));
                        }
                        if matches!(self.phase, Phase::TravelChoice) {
                            return self.travel_choice(core, Some(super::CommandChoiceAnswer::Display(completed)));
                        }
                        if self.display.is_none() || self.view.is_some() {
                            return Err(ExecutionError::Invariant);
                        }
                        let (view, reservation) = completed.into_view(&self.command)?;
                        self.view = Some(view);
                        self.view_reservation = Some(reservation);
                        self.display = None;
                    }
                    CommandAnswer::Occurrence(completed) => {
                        if self.event.as_deref() != Some(completed.event_id()) {
                            return Err(ExecutionError::UnfinishedOccurrence);
                        }
                        if matches!(self.phase, Phase::TravelTerms) {
                            self.link_travel_notice(core, &completed)?;
                        }
                        self.event = None;
                        self.phase = self.after_event;
                    }
                    CommandAnswer::TravelTerms(terms) => {
                        return self.accept_travel_notice(core, terms);
                    }
                    CommandAnswer::EvidenceEnded(_) => {
                        return Err(ExecutionError::UnfinishedOccurrence);
                    }
                    CommandAnswer::Personal(acquired) => {
                        if matches!(self.phase, Phase::TravelAccept) {
                            return self.travel_accept(core, Some(crate::worlds::base_outings::TravelAcceptAnswer::Personal(acquired)));
                        }
                        let task = self
                            .personal
                            .take()
                            .ok_or(ExecutionError::UnfinishedOccurrence)?;
                        match task {
                            PersonalTask::Replaced(pending) => {
                                core.complete_activity_result(pending, &acquired)?;
                                if let Some(old) = self.pending_release.take() {
                                    core.physical().release_work(&old)?;
                                }
                                self.phase = if matches!(self.command, NativeCommand::Cancel { .. })
                                {
                                    Phase::CancelClear
                                } else {
                                    Phase::Install
                                };
                            }
                            PersonalTask::Immediate(pending) => {
                                core.complete_activity_result(pending, &acquired)?;
                                self.phase = Phase::Tail;
                            }
                            PersonalTask::Status(pending) => {
                                let status = pending.resume(core, &acquired)?;
                                if let Some(event) =
                                    self.complete_status(status, self.after_event)?
                                {
                                    return Ok(Progress::Occurrence(event));
                                }
                            }
                        }
                    }
                    CommandAnswer::Geometry(mut answer) => {
                        if matches!(self.phase, Phase::Follow) {
                            if self.follow_step(core, Some(answer))? {
                                return Ok(Progress::Geometry);
                            }
                            return self.drive(core, None);
                        }
                        if matches!(self.phase, Phase::TravelAccept) {
                            return self.travel_accept(core, Some(crate::worlds::base_outings::TravelAcceptAnswer::Geometry(answer)));
                        }
                        if matches!(self.phase, Phase::TravelChoice) {
                            return self.travel_choice(core, Some(super::CommandChoiceAnswer::Geometry(answer)));
                        }
                        if matches!(self.phase, Phase::TravelEndReception) {
                            return self.finish_travel_end(core, Some(answer));
                        }
                        if matches!(self.phase, Phase::TravelStartSight) {
                            return self.travel_sight(core, answer);
                        }
                        if matches!(self.phase, Phase::ContactRoute) {
                            if self.finish_contact_route(core, answer)? {
                                return Ok(Progress::Geometry);
                            }
                            return self.drive(core, None);
                        }
                        if matches!(
                            self.phase,
                            Phase::DiscoverySight | Phase::DiscoveryReach | Phase::DiscoveryRoute
                        ) {
                            self.finish_discovery_geometry(core, answer)?;
                            return self.drive(core, None);
                        }
                        if matches!(self.phase, Phase::GuardSight) {
                            self.finish_guard_sight(core, answer)?;
                            return self.drive(core, None);
                        }
                        if matches!(self.phase, Phase::RangedPointReview) {
                            return self.finish_ranged_point_review(core, answer);
                        }
                        if matches!(self.phase, Phase::RangedSight) {
                            self.finish_ranged_sight(core, answer)?;
                            if matches!(self.phase, Phase::RangedPointReview) {
                                return Ok(Progress::Geometry);
                            }
                            return self.drive(core, None);
                        }
                        if matches!(self.phase, Phase::LearnRecordSight | Phase::LearnRecordReach) {
                            return self.record_learning_geometry(core, answer);
                        }
                        if matches!(self.phase, Phase::StorageSight) {
                            let actor = self.command.envelope().actor_id.clone();
                            return self.storage_sight(core, &actor, answer);
                        }
                        if matches!(self.phase, Phase::StorageReach) {
                            let actor = self.command.envelope().actor_id.clone();
                            return self.storage_reach(core, &actor, answer);
                        }
                        if matches!(self.phase, Phase::GatherSight) {
                            let sight = self.sight.take().ok_or(ExecutionError::Invariant)?
                                .finish(answer).map_err(|_| ExecutionError::Invariant)?;
                            let NativeCommand::Gather { target_id, .. } = &self.command else {
                                return Err(ExecutionError::Invariant);
                            };
                            if sight.seen(target_id) != Some(true) {
                                self.refuse(&ordinary.out_of_reach);
                            } else if self.bind_gathering_permission(core)? && self.prepare_gathering_reach(core)? {
                                return Ok(Progress::Geometry);
                            }
                            return self.drive(core, None);
                        }
                        if matches!(self.phase, Phase::GiftSight | Phase::GiftSightBack) {
                            return self.accept_gift_sight(core, answer);
                        }
                        if matches!(self.phase, Phase::GiftHearing | Phase::GiftHearingBack) {
                            return self.accept_gift_hearing(core, answer);
                        }
                        if matches!(self.phase, Phase::FireSight) {
                            return self.fire_sight(core, answer);
                        }
                        if matches!(self.phase, Phase::CookSight) {
                            return self.cook_sight(core, answer);
                        }
                        if matches!(self.phase, Phase::CastSight) {
                            return self.cast_sight(core, answer);
                        }
                        if matches!(self.phase, Phase::StatusSight) {
                            let sight = self
                                .sight
                                .take()
                                .ok_or(ExecutionError::Invariant)?
                                .finish(answer)
                                .map_err(|_| ExecutionError::Invariant)?;
                            let NativeCommand::StatusEffect { target_id, .. } = &self.command
                            else {
                                return Err(ExecutionError::Invariant);
                            };
                            if sight.seen(target_id) != Some(true) {
                                self.refuse(&ordinary.out_of_reach);
                            } else {
                                self.phase = Phase::StatusReach;
                            }
                            return self.drive(core, None);
                        }
                        self.queries
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .validate_answers(&answer)
                            .map_err(|_| ExecutionError::Invariant)?;
                        match self.phase {
                            Phase::Support => {
                                let Some(point) =
                                    answer.support.pop().ok_or(ExecutionError::Invariant)?
                                else {
                                    self.refuse(&ordinary.blocked);
                                    return self.drive(core, None);
                                };
                                self.reserve(point.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                                self.resolved = Some(point);
                                self.phase = Phase::Standing;
                                self.queries = None;
                            }
                            Phase::Standing => {
                                if !answer.standing.pop().ok_or(ExecutionError::Invariant)? {
                                    self.refuse(&ordinary.blocked);
                                } else {
                                    self.phase = Phase::Route;
                                }
                                self.queries = None;
                            }
                            Phase::Route => {
                                let route = answer.routes.pop().ok_or(ExecutionError::Invariant)?;
                                let route = crate::geometry::route_plan(route, &self.budget)?;
                                self.accept_ground_route(core, route, ordinary)?;
                            }
                            Phase::FeedReach => {
                                self.queries = None;
                                self.phase =
                                    if answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                                        Phase::Prepared
                                    } else {
                                        Phase::FeedApproach
                                    };
                            }
                            Phase::PracticeReach => {
                                let visible = answer.sight.pop().ok_or(ExecutionError::Invariant)?;
                                self.queries = None;
                                self.practice_reach(core, visible)?;
                            }
                            Phase::ScarReach => {
                                self.queries = None;
                                if answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                                    self.phase = Phase::Prepared;
                                } else {
                                    self.refuse(&ordinary.out_of_reach);
                                }
                            }
                            Phase::RespawnSupport => return self.respawn_supported(core, answer.support),
                            Phase::RespawnStanding => return self.respawn_standing(core, answer.standing),
                            Phase::TravelReach => return self.travel_reach(core, answer.sight.pop().ok_or(ExecutionError::Invariant)?),
                            Phase::TravelDestination => return self.travel_destination(core, answer.routes.pop()),
                            Phase::HearthGeometry => return self.hearth_geometry(core, answer),
                            Phase::DropStanding => return self.finish_drop(core,
                                answer.standing.pop().ok_or(ExecutionError::Invariant)?,
                            ),
                            Phase::HearthRoutes => return self.hearth_routes(core, answer),
                            Phase::HearthNavigation => return self.hearth_navigation(core, answer),
                            Phase::GiftReach => return self.accept_gift_reach(
                                core, answer.sight.pop().ok_or(ExecutionError::Invariant)?,
                            ),
                            Phase::CastLine => return self.cast_line(core, answer),
                            Phase::CookReach => return self.cook_reach(
                                core, answer.sight.pop().ok_or(ExecutionError::Invariant)?,
                            ),
                            Phase::ContactReach => {
                                self.queries = None;
                                if answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                                    if self.prepare_contact_route(core)? {
                                        return Ok(Progress::Geometry);
                                    }
                                    self.phase = Phase::Prepared;
                                } else {
                                    self.refuse(&ordinary.out_of_reach);
                                }
                            }
                            Phase::StatusReach => {
                                if !answer.sight.pop().ok_or(ExecutionError::Invariant)? {
                                    self.refuse(&ordinary.out_of_reach);
                                } else {
                                    self.phase = Phase::StatusApply;
                                }
                                self.queries = None;
                            }
                            Phase::Probe => {
                                if !answer.walking.pop().ok_or(ExecutionError::Invariant)? {
                                    self.refuse(&ordinary.unreachable);
                                } else {
                                    let point_bytes = self
                                        .resolved
                                        .as_ref()
                                        .ok_or(ExecutionError::Invariant)?
                                        .heap_bytes()
                                        .ok_or(ExecutionError::Capacity)?;
                                    self.grow_action_storage(
                                        std::mem::size_of::<SurfacePoint>()
                                            .checked_add(point_bytes)
                                            .and_then(|n| n.checked_add("approaching".len()))
                                            .ok_or(ExecutionError::Capacity)?,
                                    )?;
                                    let action =
                                        self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                                    action.stage = "approaching".to_owned();
                                    action.path = vec![
                                        self.resolved
                                            .as_ref()
                                            .ok_or(ExecutionError::Invariant)?
                                            .clone(),
                                    ];
                                    self.size_action_storage()?;
                                    self.phase = Phase::Prepared;
                                }
                                self.queries = None;
                            }
                            _ => return Err(ExecutionError::Invariant),
                        }
                    }
                }
            } else if self.event.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
        }
        loop {
            if let Some(conditions) = self.conditions.as_mut() {
                let completed = match answer.take() {
                    Some(CommandAnswer::Occurrence(completed)) => Some(completed),
                    None => None,
                    Some(_) => return Err(ExecutionError::UnfinishedOccurrence),
                };
                match conditions.step(core, completed)? {
                    crate::conditions::ConditionReconcileStep::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    crate::conditions::ConditionReconcileStep::Complete => {
                        self.conditions = None;
                        self.phase = if matches!(self.phase, Phase::RespawnConditions) {
                            Phase::RespawnArrival
                        } else {
                            Phase::Done
                        };
                        continue;
                    }
                }
            }
            if let Some(activation) = self.activation.as_mut() {
                let supplied = answer
                    .take()
                    .map(|answer| match answer {
                        CommandAnswer::Personal(value) => {
                            Ok(StatusActivationAnswer::Personal(value))
                        }
                        CommandAnswer::Occurrence(value) => {
                            Ok(StatusActivationAnswer::Occurrence(value))
                        }
                        CommandAnswer::EvidenceEnded(value) => {
                            Ok(StatusActivationAnswer::EvidenceEnded(value))
                        }
                        CommandAnswer::Geometry(_) | CommandAnswer::Display(_)
                        | CommandAnswer::TravelTerms(_) => {
                            Err(ExecutionError::UnfinishedOccurrence)
                        }
                    })
                    .transpose()?;
                match activation.drive(core, supplied)? {
                    StatusActivationProgress::Personal => return Ok(Progress::Personal),
                    StatusActivationProgress::Occurrence(event) => {
                        return Ok(Progress::Occurrence(event));
                    }
                    StatusActivationProgress::EndEvidence => return Ok(Progress::EndEvidence),
                    StatusActivationProgress::Complete(accepted) => {
                        self.activation = None;
                        if accepted {
                            self.phase = Phase::StatusFacts;
                        } else {
                            self.refuse(&ordinary.not_applicable);
                        }
                        continue;
                    }
                }
            }
            if self.personal.is_some() {
                return Ok(Progress::Personal);
            }
            let actor_id = self.command.envelope().actor_id.clone();
            match self.phase {
                Phase::Follow => return Ok(Progress::Geometry),
                Phase::Start => {
                    let prior = core
                        .state
                        .physical
                        .entities
                        .get(self.actor_id())
                        .and_then(|entity| entity.actor.as_ref())
                        .and_then(|actor| actor.action.as_ref());
                    self._reservation.resize(
                        self._reservation
                            .bytes()
                            .checked_add(prior.map_or(0, |action| action.id.len()))
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.before_action_id = prior.map(|action| action.id.clone());

                    // At most the current result and its immediate personal
                    // completion copy coexist here. Other owners fund their
                    // own history/receipt before-images before cloning them.
                    self.reserve(
                        ordinary
                            .maximum_message_bytes()
                            .and_then(|n| n.checked_mul(2))
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    let meter = core
                        .journal
                        .meters
                        .begin(core.state.installed.work_policy.policy().group)?;
                    self.meter = Some(meter);
                    let input_bytes = u64::try_from(self.canonical().encode_utf16().count())
                        .ok()
                        .and_then(|n| n.checked_mul(3))
                        .ok_or(ExecutionError::Capacity)?;
                    core.journal
                        .meters
                        .charge(&[(WorkUnit::InputBytes, input_bytes)])?;
                    if !self.options.native_controller && self.preparation_mode.is_none() {
                        if let Some(record) = core.state.commands.get(&self.command.envelope().id) {
                            if record.receipt.digest.as_str() == self.canonical() {
                                self.reserve(
                                    record
                                        .receipt
                                        .outcome
                                        .heap_bytes()
                                        .ok_or(ExecutionError::Capacity)?,
                                )?;
                                let mut result = record.receipt.outcome.clone();
                                result.code = "duplicate".to_owned();
                                self.outcome = Some(result);
                                self.duplicate = true;
                                self.phase = Phase::Done;
                                continue;
                            }
                            self.refuse(&ordinary.idempotency_conflict);
                            continue;
                        }
                    }
                    // Immediate social choices preview with existing work left
                    // alone. Handover still cannot become a queued plan step.
                    if let Some(mode) = self.preparation_mode
                        && (matches!(
                            self.command,
                            NativeCommand::Respawn { .. } | NativeCommand::Cancel { .. } | NativeCommand::WithdrawAttempt { .. }
                                | NativeCommand::Equipment { .. } | NativeCommand::Eat { .. }
                                | NativeCommand::Drop { .. } | NativeCommand::TransferItem { .. }
                                | NativeCommand::PracticeShot { .. }
                        ) || matches!(self.command, NativeCommand::Handover { .. })
                            && mode != super::WorkTransitionMode::Continue)
                    {
                        self.reserve(128)?;
                        self.outcome = Some(outcome(
                            false,
                            "invalid-plan",
                            "Only supported native physical work can be queued.",
                        ));
                        self.phase = Phase::Done;
                        continue;
                    }
                    if matches!(self.command, NativeCommand::DescriptiveAct { .. }) {
                        return self.stage_descriptive_act(core).map(Progress::Occurrence);
                    }
                    if let Some(problem) =
                        actor_problem(core, &self.command, self.options.native_controller)?
                    {
                        self.outcome = Some(problem);
                        self.phase = Phase::Done;
                        continue;
                    }
                    if matches!(self.command, NativeCommand::Respawn { .. }) {
                        return self.start_respawn(core);
                    }
                    if self.typed_plan_mode.is_some() {
                        return self.prepare_typed_walk(core);
                    }
                    if self.chosen_contact.is_some() && matches!(self.command, NativeCommand::Strike { .. }) {
                        if self.start_discovery(core)? {
                            return Ok(Progress::Geometry);
                        }
                        continue;
                    }
                    if self.command.discovery_only()
                        && !(self.options.native_controller
                            && self.preparation_mode.is_none()
                            && matches!(self.command, NativeCommand::Strike { .. }))
                    {
                        if self.preparation_mode.is_none() {
                            return Err(ExecutionError::UnsupportedFamily);
                        }
                        if self.start_discovery(core)? {
                            return Ok(Progress::Geometry);
                        }
                        continue;
                    }
                    match &self.command {
                        NativeCommand::Handover { .. } => {
                            if self.start_gift(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::LearnRecord { .. } => {
                            if let Some(progress) = self.start_record_learning(core, &actor_id)? {
                                return Ok(progress);
                            }
                        }
                        NativeCommand::InspectInventory { world: Some(_), .. } => {
                            if self.start_storage_access(core, &actor_id)? { return Ok(Progress::Geometry); }
                        }
                        NativeCommand::InspectInventory { selected: Some(_), .. } => {
                            if let Some(event) = self.inspect_item(core, &actor_id)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        NativeCommand::WithdrawAttempt { attempt_id, .. } => {
                            let result = crate::plans::withdraw_attempt(
                                core,
                                &actor_id,
                                attempt_id,
                                &self.budget,
                            )?;
                            let (outcome, storage) = result.into_parts();
                            self._reservation.merge(storage)?;
                            self.phase = if outcome.ok { Phase::Tail } else { Phase::Done };
                            self.outcome = Some(outcome);
                        }
                        NativeCommand::Move { destination, .. } => {
                            if ![destination.x, destination.y, destination.z]
                                .iter()
                                .all(|n| n.is_finite())
                            {
                                self.refuse(&ordinary.blocked);
                                continue;
                            }
                            let actor = core
                                .state
                                .physical
                                .entities
                                .get(&actor_id)
                                .ok_or(ExecutionError::MissingActor)?;
                            if crate::reception::vision_parameters(&core.state.installed, actor)
                                .radius
                                == 0.0
                                && crate::spatial::distance(
                                    actor
                                        .world_position()
                                        .ok_or(ExecutionError::InvalidPosition)?,
                                    destination.point(),
                                ) > 1.0
                            {
                                self.refuse(&ordinary.unsupported_navigation);
                                continue;
                            }
                            let point = destination.point();
                            let surface_id = destination.surface_id.clone();
                            self.question(core, Phase::Support)?
                                .support
                                .push(SupportQuery {
                                    point,
                                    surface_id: Some(surface_id),
                                    relative: None,
                                });
                            return Ok(Progress::Geometry);
                        }
                        NativeCommand::Cancel {
                            expected_action_id,
                            dismiss_review,
                            ..
                        } => {
                            if *dismiss_review {
                                // The application owns the pending review. Record
                                // its accepted dismissal without stopping physical work.
                                self.reserve(128)?;
                                self.outcome = Some(outcome(
                                    true,
                                    "cancelled",
                                    "Attack preparation cancelled.",
                                ));
                                self.phase = Phase::Done;
                                continue;
                            }
                            let current = core
                                .state
                                .physical
                                .entities
                                .get(&actor_id)
                                .and_then(|e| e.actor.as_ref())
                                .and_then(|a| a.action.as_ref());
                            if expected_action_id
                                .as_ref()
                                .is_some_and(|expected| current.is_none_or(|a| &a.id != expected))
                            {
                                self.refuse(&ordinary.stale_action);
                                continue;
                            }
                            self.phase = Phase::Interrupt;
                        }
                        NativeCommand::Feed { .. } => {
                            if self.prepare_feeding(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Gather { .. } => {
                            if self.prepare_gathering(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Pickup { .. } => {
                            if self.prepare_pickup(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Fish { .. } => {
                            if self.prepare_cast(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::PlaceHearth { .. } => {
                            if self.prepare_hearth(core)? { return Ok(Progress::Geometry); }
                        }
                        NativeCommand::Respawn { .. } => return Err(ExecutionError::Invariant),
                        NativeCommand::TreatScar { .. } => {
                            if self.prepare_scar_treatment(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::TendFire { .. } => {
                            if self.prepare_fire(core)? { return Ok(Progress::Geometry); }
                        }
                        NativeCommand::Craft { .. } => self.prepare_craft(core)?,
                        NativeCommand::Cook { .. } => {
                            if self.prepare_cook(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Eat { .. } => {
                            if let Some(event) = self.eat(core, &actor_id)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        NativeCommand::Drop { .. } => {
                            if self.prepare_drop(core, &actor_id)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::TransferItem { selection, .. } if selection.world_storage.is_some() => {
                            if self.start_storage_access(core, &actor_id)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::TransferItem { .. } => {
                            if let Some(event) = self.transfer_item(core, &actor_id)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        NativeCommand::Equipment { .. } => {
                            if let Some(event) = self.apply_equipment(core, &actor_id)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        NativeCommand::Strike { .. } => {
                            if self.prepare_natural_contact(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Follow { .. } => {
                            if self.prepare_follow(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Outing { .. } => {
                            if let Some(next) = self.begin_travel(core)? { return Ok(next); }
                        }
                        NativeCommand::InspectActivities { .. } => {
                            if let Some(event) = self.inspect_activities(core, &actor_id)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        NativeCommand::Guard { .. } => {
                            if self.prepare_guard(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Ranged { intent: super::RangedIntent::Start { .. }, .. } => {
                            if self.prepare_ranged_start(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::Ranged { .. } => return self.begin_ranged_release(core),
                        NativeCommand::PracticeShot { .. } => {
                            if self.prepare_practice_shot(core)? {
                                return Ok(Progress::Geometry);
                            }
                        }
                        NativeCommand::InspectInventory { selected: None, .. } => {
                            return Err(ExecutionError::Invariant);
                        }
                        NativeCommand::StatusEffect { .. } => self.phase = Phase::Deactivate,
                        NativeCommand::DescriptiveAct { .. } => return Err(ExecutionError::Invariant),
                        NativeCommand::Say { .. } => self.phase = Phase::Speech,
                    }
                }
                Phase::StoragePage => return self.storage_occurrence(core, &actor_id),
                Phase::RespawnSupport | Phase::RespawnStanding
                | Phase::StorageSight | Phase::StorageReach | Phase::LearnRecordSight | Phase::LearnRecordReach | Phase::ScarReach | Phase::PracticeReach | Phase::GuardSight | Phase::RangedSight | Phase::RangedPointReview | Phase::RangedRelease => {
                    return Err(ExecutionError::Invariant);
                }
                Phase::Standing => {
                    let body = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .ok_or(ExecutionError::MissingActor)?
                        .body_profile()
                        .into_owned();
                    let point = self
                        .resolved
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .clone();
                    self.question(core, Phase::Standing)?
                        .standing
                        .push(StandingQuery { point, body });
                    return Ok(Progress::Geometry);
                }
                Phase::FeedApproach => {
                    self.prepare_interaction_route(core)?;
                    if matches!(self.phase, Phase::Done) {
                        continue;
                    }
                    return Ok(Progress::Geometry);
                }
                Phase::Route => {
                    let NativeCommand::Move { destination, .. } = &self.command else {
                        return Err(ExecutionError::Invariant);
                    };
                    let actor = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    let from = actor
                        .supported_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    let in_reach = from.surface_id == destination.surface_id
                        && crate::spatial::distance(from.point(), destination.point())
                            <= core.state.installed.movement_settings.arrival_tolerance;
                    // This storage follows the actual pending action into its
                    // entity slot; a cursor's own guard cannot fund accepted buffers.
                    let base_bytes = self
                        .command
                        .envelope()
                        .id
                        .len()
                        .checked_add(destination.heap_bytes().ok_or(ExecutionError::Capacity)?)
                        .and_then(|n| n.checked_add("move".len() + "approaching".len()))
                        .ok_or(ExecutionError::Capacity)?;
                    self.action_storage = Some(self.budget.reserve(base_bytes)?);
                    let action = Action::movement(
                        self.command.envelope().id.clone(),
                        destination.clone(),
                        Vec::new(),
                        !in_reach,
                        None,
                        None,
                    );
                    self.action = Some(action);
                    if let Some(route) = self.options.native_movement.as_mut()
                        .and_then(|movement| movement.prepared.take())
                    {
                        self.accept_ground_route(core, route, ordinary)?;
                        continue;
                    }
                    if in_reach {
                        self.phase = Phase::Prepared;
                        continue;
                    }
                    if let Some(route) = self
                        .options
                        .native_movement
                        .as_ref()
                        .and_then(|native| native.route.as_ref())
                    {
                        let path_bytes = route.path.heap_bytes().ok_or(ExecutionError::Capacity)?;
                        self.grow_action_storage(path_bytes)?;
                        let route = self
                            .options
                            .native_movement
                            .as_ref()
                            .and_then(|native| native.route.as_ref())
                            .ok_or(ExecutionError::Invariant)?;
                        self.action.as_mut().ok_or(ExecutionError::Invariant)?.path =
                            route.path.clone();
                        self.phase = Phase::Prepared;
                        continue;
                    }
                    let body = actor.body_profile().into_owned();
                    let to = self
                        .resolved
                        .as_ref()
                        .ok_or(ExecutionError::Invariant)?
                        .clone();
                    if crate::reception::vision_parameters(&core.state.installed, actor).radius
                        == 0.0
                    {
                        if crate::spatial::distance(from.point(), to.point())
                            > installed.movement.direct_probe_max_distance()
                        {
                            self.refuse(&ordinary.unreachable);
                            continue;
                        }
                        self.question(core, Phase::Probe)?
                            .walking
                            .push(WalkingSegment { from, to, body });
                    } else {
                        self.question(core, Phase::Route)?
                            .routes
                            .push(RouteQuery::Surface { from, to, body });
                    }
                    return Ok(Progress::Geometry);
                }
                Phase::TravelNotices => {
                    if let Some(next) = self.prepare_travel_notice(core)? { return Ok(next); }
                }
                // A nested display cursor can yield without an answer while
                // it prepares more work. Ask its owner for the actual next step.
                Phase::TravelChoice => return self.travel_choice(core, None),
                Phase::TravelAccept => return self.travel_accept(core, None),
                Phase::TravelTerms => return Ok(Progress::TravelTerms),
                Phase::TypedPlan => return self.typed_walk_step(core, None),
                Phase::Prepared => {
                    if core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .is_some_and(|a| {
                            a.kind == "status-effect"
                                && !core
                                    .state
                                    .installed
                                    .status_policy
                                    .definitions
                                    .iter()
                                    .any(|d| {
                                        Some(d.id.as_str()) == a.definition_id.as_deref()
                                            && d.interrupt_on.iter().any(|r| r == "new-action")
                                    })
                        })
                    {
                        self.refuse(&ordinary.cannot_interrupt);
                        continue;
                    }
                    // A placement preview reaches the same geometry, grant, and
                    // replacement checks without publishing a made-up action ID.
                    if self.options.preview && matches!(self.command, NativeCommand::PlaceHearth { .. }) {
                        self.outcome = Some(crate::hearth::messages().available.outcome(true));
                        self.phase = Phase::Done;
                        continue;
                    }
                    if let Some(native) = &self.options.native_movement {
                        let actor = core
                            .state
                            .physical
                            .entities
                            .get(&actor_id)
                            .ok_or(ExecutionError::MissingActor)?;
                        let animal = actor
                            .animal
                            .as_ref()
                            .ok_or(ExecutionError::UnsupportedFamily)?;
                        let episode = animal.episode.as_ref();
                        let (pin, locomotion) = match native.binding.mode {
                            crate::native_response::LocomotionMode::Travel => {
                                (&animal.profile, crate::native_controller::foraging::travel_locomotion(
                                    &core.state.installed, actor, core.state.physical.header.sim_time,
                                ).unwrap_or(animal.locomotion.as_str()))
                            }
                            crate::native_response::LocomotionMode::Escape => {
                                let e = episode.ok_or(ExecutionError::Invariant)?;
                                (&e.profile_pin, e.locomotion.as_str())
                            }
                        };
                        if !self.options.native_controller
                            || native.binding.profile != *pin
                            || native.binding.locomotion != locomotion
                            || matches!(
                                native.binding.mode,
                                crate::native_response::LocomotionMode::Escape
                            ) && episode.is_none_or(|e| {
                                native.binding.episode_id.as_deref() != Some(e.id.as_str())
                                    || native.binding.generation != Some(e.proposal_generation)
                            })
                        {
                            self.refuse(&ordinary.stale_native_movement);
                            continue;
                        }
                        let extra = native
                            .binding
                            .heap_bytes()
                            .ok_or(ExecutionError::Capacity)?;
                        let storage = self
                            .action_storage
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?;
                        storage.resize(
                            storage
                                .bytes()
                                .checked_add(extra)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        self.action
                            .as_mut()
                            .ok_or(ExecutionError::Invariant)?
                            .native_locomotion = Some(native.binding.clone());
                    }
                    self.size_action_storage()?;
                    if self.preparation_mode.is_some() {
                        self.phase = Phase::Choice;
                        continue;
                    }
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    self.phase = Phase::RecordPrepared;
                }
                Phase::Choice => {
                    if self.preparation_mode == Some(super::WorkTransitionMode::Continue)
                        && (self.action.is_some() || self.discovery_starts_work)
                    {
                        let message = "Starting this activity requires choosing how to replace or pause the current work.";
                        self.reserve(message.len() + "work-transition".len())?;
                        self.outcome = Some(outcome(false, "work-transition", message));
                        self.phase = Phase::Done;
                        continue;
                    }
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    let (view, storage) = self.take_prepared_view(ordinary)?;
                    if let Some(confirmation) = self.strike_confirmation.take() {
                        let (permission, custody) = *confirmation;
                        let rule = core
                            .state
                            .installed
                            .body_policy
                            .as_ref()
                            .and_then(|policy| policy.value().lethal_attack_review.as_ref())
                            .ok_or(ExecutionError::Invariant)?;
                        let description = if matches!(self.command, NativeCommand::Ranged { .. }) {
                            &rule.ranged_description
                        } else {
                            &rule.description
                        };
                        let offered = crate::contact::StrikeReviewOffer::new(
                            permission, custody, view, storage, rule, description,
                        )?;
                        self.strike_review = Some(Box::new(offered));
                        self.reserve(description.len() + "lethal-review-required".len())?;
                        self.outcome = Some(outcome(false, "lethal-review-required", description));
                        self.phase = Phase::Done;
                        continue;
                    }
                    let problem = crate::activity::check_activity_start(
                        &core.state.activity,
                        &core.state.physical.entities,
                        &self.command,
                        view,
                        storage,
                        core.state.physical.header.sim_time,
                    )
                    .map_err(ExecutionError::Activity)?;
                    let (ok, code, message) = match &problem {
                        Some(problem) => (false, "experience-capacity", problem.message()),
                        None => (
                            true,
                            "available",
                            "Current prerequisites are available; execution rechecks them.",
                        ),
                    };
                    self.reserve(code.len() + message.len())?;
                    self.outcome = Some(outcome(ok, code, message));
                    self.phase = Phase::Done;
                }
                Phase::RecordPrepared => {
                    if matches!(self.command, NativeCommand::Ranged { .. })
                        && !self.source_scope_started
                        && !self.prepare_ranged_equipment(core)?
                    {
                        continue;
                    }
                    if !self.source_scope_started {
                        self.exposure = super::exposure::CommandExposure::prepare(
                            core,
                            &self.command,
                            &self.budget,
                        )?;
                    }
                    self.begin_source_scope(core)?;
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    if !self.options.native_controller {
                        let (view, view_guard) = self.take_prepared_view(ordinary)?;
                        let id = core
                            .journal
                            .activity
                            .begin(
                                &mut core.state.activity,
                                &core.state.physical.entities,
                                &self.command,
                                &self.command.envelope().id,
                                view,
                                view_guard,
                                core.state.physical.header.sim_time,
                                activity_parent(&core.state.physical.entities, &self.command),
                            )
                            .map_err(ExecutionError::Activity)?;
                        self.activity_id = Some(id);
                    }
                    // Saved IDs are bounded by MAX_SAFE_INTEGER (16 decimal
                    // digits). Admission precedes allocation and the retained copy.
                    self.grow_action_storage("action-".len() + 16)?;
                    let action_id = core.physical().allocate("action")?.id;
                    if self.action.as_ref().is_some_and(Action::is_projectile_action) {
                        self.grow_action_storage(action_id.len() + ":projectile".len())?;
                        let action = self.action.as_mut().ok_or(ExecutionError::Invariant)?;
                        action.ranged.as_mut().ok_or(ExecutionError::Invariant)?.reservation_id =
                            crate::projectile::hold_id(&action_id);
                    }
                    self.action.as_mut().ok_or(ExecutionError::Invariant)?.id = action_id.clone();
                    self.size_action_storage()?;
                    if let Some(id) = &self.activity_id {
                        core.journal
                            .activity
                            .bind_action(&mut core.state.activity, &actor_id, id, &action_id)
                            .map_err(ExecutionError::Activity)?;
                    }
                    self.phase = Phase::Interrupt;
                }
                Phase::Interrupt => {
                    if !self.materialized {
                        core.physical().settle_entity(&actor_id)?;
                        self.materialized = true;
                    }
                    let reason = if matches!(self.command, NativeCommand::Cancel { .. }) {
                        "voluntary"
                    } else {
                        "new-action"
                    };
                    let installed = std::sync::Arc::clone(&core.state.installed);
                    if let Some(definition) =
                        installed.status_policy.definitions.get(self.interrupt_at)
                    {
                        self.interrupt_at += 1;
                        if definition.interrupt_on.iter().any(|r| r == reason) {
                            let status =
                                core.deactivate_status(&actor_id, &definition.id, reason)?;
                            if let Some(event) = self.complete_status(status, Phase::Interrupt)? {
                                return Ok(Progress::Occurrence(event));
                            }
                        }
                        continue;
                    }
                    if core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .is_some_and(|a| a.kind == "status-effect")
                    {
                        self.refuse(if reason == "voluntary" {
                            &ordinary.cannot_cancel
                        } else {
                            &ordinary.cannot_interrupt
                        });
                        continue;
                    }
                    self.phase = if matches!(self.command, NativeCommand::Cancel { .. }) {
                        Phase::CancelEnd
                    } else {
                        Phase::Replace
                    };
                }
                Phase::Replace | Phase::CancelEnd => {
                    if !self.source_scope_started {
                        self.exposure = super::exposure::CommandExposure::prepare(
                            core,
                            &self.command,
                            &self.budget,
                        )?;
                    }
                    self.begin_source_scope(core)?;
                    let cancelling = matches!(self.phase, Phase::CancelEnd);
                    let old = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .map(|a| a.id.clone());
                    if let Some(old) = old {
                        if !cancelling {
                            core.physical().release_work(&old)?;
                        }
                        let result = if cancelling {
                            &ordinary.cancelled_by_choice
                        } else {
                            &ordinary.cancelled_replaced
                        }
                        .outcome(false);
                        if let Some(pending) = core
                            .journal
                            .activity
                            .prepare_end(
                                &mut core.state.activity,
                                &actor_id,
                                &old,
                                result,
                                core.state.physical.header.sim_time,
                                &ordinary.before_attempt_facts,
                                &installed.retained.items,
                            )
                            .map_err(ExecutionError::Activity)?
                        {
                            self.personal = Some(PersonalTask::Replaced(pending));
                            if cancelling {
                                self.pending_release = Some(old);
                            }
                            continue;
                        }
                        if cancelling {
                            core.physical().release_work(&old)?;
                        }
                    }
                    self.phase = if cancelling {
                        Phase::CancelClear
                    } else {
                        Phase::Install
                    };
                }
                Phase::Install => {
                    let action = self.action.take().ok_or(ExecutionError::Invariant)?;
                    let action_id = action.id.clone();
                    let place_hearth = action.is_placing_hearth();
                    let projectile = action.is_projectile_action();
                    let guard_heading = action.guard.as_ref().map(|guard| guard.facing);
                    if action.is_manufacturing() && !self.admit_craft_record(core, &actor_id, &action)? {
                        continue;
                    }
                    if action.is_cooking() && !self.admit_cook_record(core, &actor_id, &action)? {
                        continue;
                    }
                    core.physical().replace_action(
                        &actor_id,
                        Some(crate::state::FundedAction::from_storage(
                            action,
                            self.action_storage
                                .take()
                                .ok_or(ExecutionError::Invariant)?,
                            &self.budget,
                        )?),
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: Some(false),
                        },
                    )?;
                    if guard_heading.is_some() && !self.equip_guard(core)? {
                        continue;
                    }
                    if place_hearth { core.reserve_hearth_holds(&actor_id)?; }
                    if projectile { core.reserve_projectile(&actor_id)?; }
                    if let Some(heading) = guard_heading {
                        core.physical().set_heading(&actor_id, heading)?;
                    }
                    let mut result = ordinary.accepted.outcome(true);
                    result.action_id = Some(action_id);
                    self.outcome = Some(result);
                    if let Some(id) = &self.activity_id {
                        if core
                            .state
                            .physical
                            .entities
                            .get(&actor_id)
                            .and_then(|entity| entity.actor.as_ref())
                            .and_then(|actor| actor.action.as_ref())
                            .is_some_and(|action| action.stage == "approaching")
                        {
                            core.journal
                                .activity
                                .begin_approach(
                                    &mut core.state.activity,
                                    &actor_id,
                                    id,
                                    &ordinary.approach_name,
                                    &ordinary.approach_facts,
                                )
                                .map_err(ExecutionError::Activity)?;
                        }
                    }
                    let native = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .and_then(|e| e.actor.as_ref())
                        .and_then(|a| a.action.as_ref())
                        .is_some_and(|a| a.native_locomotion.is_some());
                    let routine = if let Some(id) = &self.activity_id {
                        let record = core
                            .state
                            .activity
                            .collections
                            .get(&actor_id)
                            .ok_or(ExecutionError::Invariant)?
                            .get(id)
                            .map_err(ExecutionError::Activity)?
                            .ok_or(ExecutionError::Invariant)?;
                        core.state
                            .installed
                            .account_law()
                            .routine_movement(
                                &core.state.physical,
                                &core.state.experience,
                                &actor_id,
                                crate::attention::ActivityRecordingContext::from_occurrence(
                                    &record.occurrence,
                                ),
                                crate::worlds::MovementRecordingPhase::Departure,
                                None,
                            )
                            .map_err(ExecutionError::Received)?
                    } else {
                        false
                    };
                    if !native && !routine {
                        if matches!(self.command, NativeCommand::Follow { .. }) {
                            return self.follow_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Feed { .. }) {
                            return self.feeding_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Gather { .. }) {
                            return self.gathering_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Pickup { .. }) {
                            return self.pickup_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Fish { .. }) {
                            return self.cast_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Cook { .. }) {
                            return self.cook_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::PlaceHearth { .. }) {
                            return self.hearth_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::TendFire { .. }) {
                            return self.fire_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::TreatScar { .. }) {
                            return self.scar_treatment_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::PracticeShot { .. }) {
                            return self.practice_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Guard { .. }) {
                            self.phase = Phase::AfterDeparture;
                            continue;
                        }
                        if matches!(self.command, NativeCommand::Ranged { .. }) {
                            return self.ranged_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Craft { .. }) {
                            return self.craft_started(core, &actor_id);
                        }
                        if matches!(self.command, NativeCommand::Strike { .. }) {
                            if let Some(event) = self.equip_strike(core, &actor_id)? {
                                return Ok(Progress::Occurrence(event));
                            }
                            return self.natural_contact_started(core, &actor_id);
                        }
                        let NativeCommand::Move { destination, .. } = &self.command else {
                            return Err(ExecutionError::Invariant);
                        };
                        let point = destination.point();
                        let bytes = ordinary
                            .departure_heap_bound(point)
                            .ok_or(ExecutionError::Capacity)?;
                        self._reservation.resize(
                            self._reservation
                                .bytes()
                                .checked_add(bytes)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let text = Narration {
                            parts: vec![
                                NarrationPart::Participant {
                                    entity_id: actor_id.clone(),
                                    role: PersonRole::Subject,
                                    article: None,
                                },
                                NarrationPart::Literal(" ".into()),
                                NarrationPart::Literal(
                                    ordinary
                                        .departure(point)
                                        .map_err(|_| ExecutionError::Invariant)?
                                        .into(),
                                ),
                            ],
                        };
                        let mut data = IndexMap::new();
                        data.insert(
                            "actionType".to_owned(),
                            crate::reception::EventScalar::Text(("move".to_owned()).into()),
                        );
                        let event = core.stage_event(EventEmissionIntent {
                            event_type: ordinary.action_started_event.clone(),
                            text: EmissionText::Narration(text),
                            audience: AudienceSelection::Physical,
                            source_id: Some(actor_id),
                            target_id: None,
                            data: Some(data),
                            scope: EventScope::External,
                            origin: None,
                            exposure: None,
                        })?;
                        self.event = Some(event.id.clone());
                        self.after_event = Phase::AfterDeparture;
                        return Ok(Progress::Occurrence(event));
                    }
                    self.phase = Phase::AfterDeparture;
                }
                Phase::ContactAfterEquip => {
                    return self.natural_contact_started(core, &actor_id);
                }
                Phase::AfterDeparture => {
                    if !self.options.native_controller {
                        let id = self
                            .outcome
                            .as_ref()
                            .and_then(|o| o.action_id.as_deref())
                            .ok_or(ExecutionError::Invariant)?;
                        core.physical().begin_semantic_work(&actor_id, id)?;
                    }
                    self.phase = Phase::Tail;
                }
                Phase::CancelClear => {
                    core.physical().replace_action(
                        &actor_id,
                        None,
                        ActionWrite {
                            generation: PlanGenerationWrite::Advance,
                            behavior: Some(false),
                        },
                    )?;
                    self.outcome = Some(ordinary.stopped.outcome(true));
                    self.phase = Phase::Tail;
                }
                Phase::Deactivate => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        facing_heading,
                        resting_place_id,
                        resting_bay,
                        operation,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    let installed = std::sync::Arc::clone(&core.state.installed);
                    let Some(definition) = installed
                        .status_policy
                        .definitions
                        .iter()
                        .find(|d| &d.id == definition_id)
                    else {
                        self.refuse(&ordinary.invalid_effect);
                        continue;
                    };
                    let Some(target) = core.state.physical.entities.get(target_id) else {
                        self.refuse(&ordinary.invalid_effect);
                        continue;
                    };
                    let Some(actions) = &definition.actions else {
                        self.refuse(&ordinary.invalid_effect);
                        continue;
                    };
                    if facing_heading.is_some_and(|heading| {
                        !heading.is_finite()
                            || *operation != StatusOperation::Activate
                            || definition
                                .presentation
                                .as_ref()
                                .and_then(|presentation| presentation.pose.as_deref())
                                != Some("horizontal")
                    }) {
                        self.refuse(&ordinary.invalid_facing);
                        continue;
                    }
                    if resting_place_id.is_some() || resting_bay.is_some() {
                        self.refuse(&ordinary.invalid_resting_place);
                        continue;
                    }
                    if &actor_id != target_id {
                        if !actions.allow_other
                            || *operation == StatusOperation::Activate && !actions.activate_other
                        {
                            self.refuse(&ordinary.out_of_reach);
                            continue;
                        }
                        self.binding.serial = core.journal.next_provider_serial()?;
                        let sight = crate::reception::SightBatch::prepare(
                            &core.state.physical,
                            &installed,
                            &actor_id,
                            &[target_id.as_str()],
                            self.binding,
                            &self.budget,
                        )
                        .map_err(|_| ExecutionError::Invariant)?;
                        self.sight = Some(sight);
                        self.phase = Phase::StatusSight;
                        return Ok(Progress::Geometry);
                    }
                    let _ = target;
                    self.phase = Phase::StatusApply;
                }
                Phase::StatusReach => {
                    let NativeCommand::StatusEffect { target_id, .. } = &self.command else {
                        return Err(ExecutionError::Invariant);
                    };
                    let observer = core
                        .state
                        .physical
                        .entities
                        .get(&actor_id)
                        .ok_or(ExecutionError::MissingActor)?;
                    let target = core
                        .state
                        .physical
                        .entities
                        .get(target_id)
                        .ok_or(ExecutionError::MissingEntity)?;
                    let mut from = observer
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    from.y += observer.body_profile().interaction_height;
                    let mut to = target
                        .world_position()
                        .ok_or(ExecutionError::InvalidPosition)?;
                    to.y += target.body_profile().interaction_height;
                    if crate::spatial::distance(from, to)
                        > core.state.installed.movement.interaction_radius()
                    {
                        self.refuse(&ordinary.out_of_reach);
                        continue;
                    }
                    self.question(core, Phase::StatusReach)?
                        .sight
                        .push(crate::geometry::SightRay { from, to });
                    return Ok(Progress::Geometry);
                }
                Phase::StatusApply => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        operation,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    let active = core
                        .state
                        .physical
                        .entities
                        .get(target_id)
                        .and_then(|e| e.status_effects.as_ref())
                        .and_then(|states| states.get(definition_id))
                        .is_some_and(|state| state.active);
                    if *operation == StatusOperation::Deactivate && !active {
                        self.refuse(&ordinary.not_active);
                        continue;
                    }
                    if *operation == StatusOperation::Activate {
                        let definition = installed
                            .status_policy
                            .definitions
                            .iter()
                            .find(|definition| &definition.id == definition_id)
                            .ok_or(ExecutionError::Invariant)?;
                        let bindings = crate::status::EffectBindings {
                            subject: target_id,
                            source: &actor_id,
                            action_target: target_id,
                        };
                        let scratch = crate::status::status_condition_scratch(
                            &core.state.physical.entities,
                            bindings,
                            &definition.requires,
                        )
                        .max(
                            definition
                                .activation_condition
                                .as_ref()
                                .map_or(0, |condition| {
                                    crate::status::status_condition_scratch(
                                        &core.state.physical.entities,
                                        bindings,
                                        condition,
                                    )
                                }),
                        );
                        core.physical().reserve_status_growth(scratch)?;
                        if !installed
                            .status_read(&core.state.physical)
                            .can_activate_metered(bindings, definition, &mut core.journal.meters)?
                        {
                            self.refuse(&ordinary.not_applicable);
                            continue;
                        }
                    }
                    self.status_was_active = active;
                    if self.preparation_mode.is_some() {
                        self.phase = Phase::Choice;
                        continue;
                    }
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    self.phase = Phase::RecordStatus;
                }
                Phase::RecordStatus => {
                    if !self.source_scope_started {
                        self.exposure = super::exposure::CommandExposure::prepare(
                            core,
                            &self.command,
                            &self.budget,
                        )?;
                    }
                    self.begin_source_scope(core)?;
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        operation,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    if !self.options.native_controller {
                        let view = self.view.take().ok_or(ExecutionError::Invariant)?;
                        let view_guard = self
                            .view_reservation
                            .take()
                            .ok_or(ExecutionError::Invariant)?;
                        self.activity_id = Some(
                            core.journal
                                .activity
                                .begin(
                                    &mut core.state.activity,
                                    &core.state.physical.entities,
                                    &self.command,
                                    &self.command.envelope().id,
                                    view,
                                    view_guard,
                                    core.state.physical.header.sim_time,
                                    activity_parent(&core.state.physical.entities, &self.command),
                                )
                                .map_err(ExecutionError::Activity)?,
                        );
                    }
                    let activate = *operation == StatusOperation::Activate;
                    let target_id = target_id.clone();
                    let definition_id = definition_id.clone();
                    if activate {
                        self.activation = Some(StatusActivationCursor::new(
                            &target_id,
                            &definition_id,
                            &actor_id,
                            &target_id,
                            "voluntary",
                            &self.budget,
                        )?);
                        continue;
                    }
                    let status = core.deactivate_status(&target_id, &definition_id, "voluntary")?;
                    if let Some(event) = self.complete_status(status, Phase::StatusFacts)? {
                        return Ok(Progress::Occurrence(event));
                    }
                }
                Phase::StatusFacts => {
                    let NativeCommand::StatusEffect {
                        target_id,
                        definition_id,
                        operation,
                        facing_heading,
                        ..
                    } = &self.command
                    else {
                        return Err(ExecutionError::Invariant);
                    };
                    if let Some(heading) = facing_heading {
                        core.physical().set_heading(target_id, *heading)?;
                    }
                    let installed = std::sync::Arc::clone(&core.state.installed);
                    let definition = installed
                        .status_policy
                        .definitions
                        .iter()
                        .find(|d| &d.id == definition_id)
                        .ok_or(ExecutionError::Invariant)?;
                    if self.activity_id.is_some() {
                        let reader = crate::worlds::InstalledPersonalNameReader::prepare(
                            &core.state.physical,
                            &core.state.reception,
                            &installed,
                            &core.state.experience,
                            &actor_id,
                        )
                        .map_err(ExecutionError::Received)?;
                        let name = reader
                            .observer_name(target_id)
                            .map_err(ExecutionError::Received)?;
                        let bytes = name.name.storage_bytes() * 3
                            + target_id.len()
                            + 2 * std::mem::size_of::<NarrationPart>()
                            + 32;
                        self._reservation.resize(
                            self._reservation
                                .bytes()
                                .checked_add(bytes)
                                .ok_or(ExecutionError::Capacity)?,
                        )?;
                        let names = reader
                            .capture_names(&[target_id], &self.budget)
                            .map_err(ExecutionError::Received)?;
                        let label = names
                            .render_narration(
                                &Narration {
                                    parts: vec![NarrationPart::Participant {
                                        entity_id: target_id.clone(),
                                        role: PersonRole::Object,
                                        article: None,
                                    }],
                                },
                                crate::narration::GrammaticalPerson::First,
                            )
                            .map_err(ExecutionError::Received)?;
                        let after = core
                            .state
                            .physical
                            .entities
                            .get(target_id)
                            .and_then(|e| e.status_effects.as_ref())
                            .and_then(|states| states.get(definition_id))
                            .is_some_and(|state| state.active);
                        core.journal
                            .activity
                            .record_effect(
                                &mut core.state.activity,
                                &self.command.envelope().id,
                                target_id,
                                &definition.label,
                                None,
                                crate::activity::ActivityScalar::Boolean(self.status_was_active),
                                crate::activity::ActivityScalar::Boolean(after),
                                &label,
                            )
                            .map_err(ExecutionError::Activity)?;
                    }
                    let bytes = definition
                        .label
                        .len()
                        .checked_add(ordinary.deactivated.len().max(ordinary.activated.len()))
                        .and_then(|n| n.checked_add(ordinary.status_outcome_code.len()))
                        .and_then(|n| n.checked_add(4))
                        .ok_or(ExecutionError::Capacity)?;
                    self._reservation.resize(
                        self._reservation
                            .bytes()
                            .checked_add(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.outcome = Some(outcome(
                        true,
                        &ordinary.status_outcome_code,
                        &ordinary.status_message(
                            &definition.label,
                            *operation == StatusOperation::Activate,
                        ),
                    ));
                    self.phase = Phase::ImmediateResult;
                }
                Phase::Speech => {
                    // The selected family borrows only immutable law/command
                    // data. Its complete allocation is admitted before making
                    // the actual activity and original event in source order.
                    let installed = core.state.installed.clone();
                    let speech = installed.speech_action.value();
                    let plan = match speech.prepare(
                        &self.command,
                        &core.state.physical.entities,
                        installed.acoustics.value(),
                    ) {
                        Ok(plan) => plan,
                        Err(problem) => {
                            let bytes = problem
                                .code
                                .len()
                                .checked_add(problem.message.len())
                                .ok_or(ExecutionError::Capacity)?;
                            self._reservation.resize(
                                self._reservation
                                    .bytes()
                                    .checked_add(bytes)
                                    .ok_or(ExecutionError::Capacity)?,
                            )?;
                            self.outcome = Some(outcome(false, &problem.code, &problem.message));
                            self.phase = Phase::Done;
                            continue;
                        }
                    };
                    if self.preparation_mode.is_some() {
                        self.phase = Phase::Choice;
                        continue;
                    }
                    let bytes = plan
                        .heap_bound()
                        .and_then(|n| n.checked_add(speech.success.code.len()))
                        .and_then(|n| n.checked_add(speech.success.message.len()))
                        .and_then(|n| n.checked_add(128))
                        .ok_or(ExecutionError::Capacity)?;
                    self._reservation.resize(
                        self._reservation
                            .bytes()
                            .checked_add(bytes)
                            .ok_or(ExecutionError::Capacity)?,
                    )?;
                    self.prepared_emission = Some(plan.emission());
                    self.outcome =
                        Some(outcome(true, &speech.success.code, &speech.success.message));
                    core.physical().settle_entity(&actor_id)?;
                    self.materialized = true;
                    self.phase = Phase::RecordSpeech;
                }
                Phase::RecordSpeech => {
                    self.begin_source_scope(core)?;
                    if self.needs_display(core)? {
                        return Ok(Progress::Display);
                    }
                    if !self.options.native_controller {
                        let view = self.view.take().ok_or(ExecutionError::Invariant)?;
                        let view_guard = self
                            .view_reservation
                            .take()
                            .ok_or(ExecutionError::Invariant)?;
                        let id = core
                            .journal
                            .activity
                            .begin(
                                &mut core.state.activity,
                                &core.state.physical.entities,
                                &self.command,
                                &self.command.envelope().id,
                                view,
                                view_guard,
                                core.state.physical.header.sim_time,
                                activity_parent(&core.state.physical.entities, &self.command),
                            )
                            .map_err(ExecutionError::Activity)?;
                        self.activity_id = Some(id);
                    }
                    let event = core.stage_event(
                        self.prepared_emission
                            .take()
                            .ok_or(ExecutionError::Invariant)?,
                    )?;
                    self.event = Some(event.id.clone());
                    self.after_event = Phase::ImmediateResult;
                    return Ok(Progress::Occurrence(event));
                }
                Phase::EatNarration => return self.finish_eating(core).map(Progress::Occurrence),
                Phase::ImmediateResult => {
                    self.begin_chosen_work(core)?;
                    if self.activity_id.is_some() {
                        let result = self
                            .outcome
                            .as_ref()
                            .ok_or(ExecutionError::Invariant)?
                            .clone();
                        if let Some(pending) = core
                            .journal
                            .activity
                            .prepare_end(
                                &mut core.state.activity,
                                &actor_id,
                                &self.command.envelope().id,
                                result,
                                core.state.physical.header.sim_time,
                                &ordinary.before_attempt_facts,
                                &installed.retained.items,
                            )
                            .map_err(ExecutionError::Activity)?
                        {
                            self.personal = Some(PersonalTask::Immediate(pending));
                            continue;
                        }
                    }
                    self.phase = Phase::Tail;
                }
                Phase::Tail => {
                    if self.options.preview {
                        // Source's disposable Cancel reaches the real stop
                        // admission, then returns before receipt/condition and
                        // common consequence finalization. The outer preview
                        // owner rolls every private effect back together.
                        self.phase = Phase::Done;
                        continue;
                    }
                    self.begin_chosen_work(core)?;
                    let result = self.outcome.as_ref().ok_or(ExecutionError::Invariant)?;
                    // Public commands stage their exact retry receipt with the
                    // SQL prefix. Keep one owner, as in Source's command writer.
                    if result.ok
                        && !self.duplicate
                        && !self.options.native_controller
                        && !self.options.durable_receipt
                    {
                        core.journal.commands.append(
                            &mut core.state.commands,
                            &self.command.envelope().id,
                            self.canonical(),
                            result,
                        )?;
                    }
                    // Source records the command receipt before reconciling its
                    // actor's real condition episodes and private notices.
                    self.conditions = Some(crate::conditions::ConditionReconcileCursor::new(
                        &actor_id,
                        &self.budget,
                    )?);
                    self.phase = Phase::Conditions;
                }
                Phase::GiftApply => {
                    if let Some(event) = self.apply_gift(core)? { return Ok(Progress::Occurrence(event)); }
                }
                Phase::GiftPrivate => {
                    if let Some(event) = self.gift_private_event(core)? { return Ok(Progress::Occurrence(event)); }
                }
                Phase::RespawnArrival => return self.respawn_arrival(core),
                Phase::Conditions | Phase::RespawnConditions => return Err(ExecutionError::UnfinishedOccurrence),
                Phase::Done => {
                    let result = self.outcome.take().ok_or(ExecutionError::Invariant)?;
                    if self.preparation_mode.is_some() {
                        let storage = self
                            ._reservation
                            .split_off(result.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
                        self.abort(core)?;
                        return Ok(Progress::Choice(super::PreparedCommandChoice::new(
                            result, storage,
                        )));
                    }
                    let exposure = self.exposure.take();
                    self.finalize = result.ok
                        && !self.duplicate
                        && !self.options.preview
                        && !matches!(
                            self.command,
                            NativeCommand::Cancel {
                                dismiss_review: true,
                                ..
                            } | NativeCommand::DescriptiveAct { .. }
                        );
                    self.abort(core)?;
                    return Ok(Progress::Complete(super::PendingCommandCompletion::new(
                        core,
                        &self.command.envelope().actor_id,
                        &self.command.envelope().id,
                        result,
                        self.finalize,
                        exposure,
                        self.options.native_movement.take(),
                        self.strike_review.take(),
                        &self.budget,
                    )?));
                }
                Phase::Support
                | Phase::Probe
                | Phase::FeedReach
                | Phase::GiftSight
                | Phase::GiftSightBack
                | Phase::GiftReach
                | Phase::GiftHearing
                | Phase::GiftHearingBack
                | Phase::GatherSight
                | Phase::CastSight
                | Phase::CastLine
                | Phase::FireSight
                | Phase::TravelStartSight | Phase::TravelReach | Phase::TravelDestination | Phase::TravelEndReception
                | Phase::HearthGeometry
                | Phase::DropStanding
                | Phase::HearthRoutes
                | Phase::HearthNavigation
                | Phase::CookSight
                | Phase::CookReach
                | Phase::ContactReach
                | Phase::ContactRoute
                | Phase::StatusSight
                | Phase::DiscoverySight
                | Phase::DiscoveryReach
                | Phase::DiscoveryRoute => {
                    return Ok(Progress::Geometry);
                }
            }
        }
    }
}

fn actor_problem(
    core: &CoreMutation<'_>,
    command: &NativeCommand,
    native: bool,
) -> Result<Option<Outcome>, ExecutionError> {
    let ordinary = core.state.installed.ordinary_actions.value();
    let Some(entity) = core
        .state
        .physical
        .entities
        .get(&command.envelope().actor_id)
    else {
        return Ok(Some(ordinary.unknown_actor.outcome(false)));
    };
    let Some(actor) = &entity.actor else {
        return Ok(Some(ordinary.unknown_actor.outcome(false)));
    };
    if matches!(command, NativeCommand::Feed { .. }) && !native {
        return Ok(Some(ordinary.unsupported_controller.outcome(false)));
    }
    if entity.spatial.local_pose.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    if command.envelope().cooperation.is_some() || command.envelope().combat_help_id.is_some() {
        return Err(ExecutionError::UnsupportedFamily);
    }
    for plan in [actor.agency.plan.as_ref(), actor.agency.suspended_plan()]
        .into_iter()
        .flatten()
    {
        crate::plans::require_supported_activity(plan)?;
    }
    if matches!(command, NativeCommand::Respawn { .. }) {
        if native {
            return Ok(Some(ordinary.unsupported_controller.outcome(false)));
        }
        if core.state.physical.header.paused {
            return Ok(Some(ordinary.paused.outcome(false)));
        }
        // A pending death removes the body from participation for every
        // physical action. Continue instead checks whether the player returned.
        if entity.retirement.is_some() || actor.participation.as_ref().is_some_and(|p| p.phase != "active") {
            return Ok(Some(ordinary.inactive.outcome(false)));
        }
        return Ok(None);
    }
    if !entity.actively_participates() {
        return Ok(Some(ordinary.inactive.outcome(false)));
    }
    let release_self = matches!(command,NativeCommand::StatusEffect{target_id,operation:StatusOperation::Deactivate,..}if target_id==&entity.id);
    let ends_consent = matches!(command, NativeCommand::Outing { parameters, .. }
        if matches!(parameters.value().get("operation").and_then(crate::records::SqlCell::as_str),
            Some("leave" | "decline")));
    if core
        .state
        .installed
        .capabilities
        .capability_blocked(Some(entity), "actions")?
        && !release_self && !ends_consent
        && !matches!(command, NativeCommand::Cancel { .. })
    {
        return Ok(Some(ordinary.actions_restricted.outcome(false)));
    }
    if matches!(command, NativeCommand::Say { .. })
        && core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "speech")?
    {
        return Ok(Some(ordinary.speech_restricted.outcome(false)));
    }
    if matches!(command, NativeCommand::Move { .. })
        && core
            .state
            .installed
            .capabilities
            .capability_blocked(Some(entity), "locomotion")?
    {
        return Ok(Some(ordinary.movement_restricted.outcome(false)));
    }
    if core.state.physical.header.paused
        && !ends_consent && !matches!(command, NativeCommand::Cancel { .. }) {
        return Ok(Some(ordinary.paused.outcome(false)));
    }
    if !actor.alive || actor.incapacitated {
        return Ok(Some(ordinary.not_alive.outcome(false)));
    }
    if entity.supported_position().is_none()
        && !matches!(
            command,
            NativeCommand::Say { .. } | NativeCommand::Cancel { .. }
        )
    {
        return Ok(Some(ordinary.unsupported_airborne.outcome(false)));
    }
    if native && (actor.controller != "native" || entity.animal.is_none()) {
        return Ok(Some(ordinary.unsupported_controller.outcome(false)));
    }
    if !matches!(
        command,
        NativeCommand::Cancel { .. }
            | NativeCommand::WithdrawAttempt { .. }
            | NativeCommand::InspectInventory { .. }
            | NativeCommand::InspectActivities { .. }
    ) && entity.has_memory()
        && core.state.activity.header.admitted >= core.state.activity.limits.retained_records
    {
        return Ok(Some(ordinary.experience_capacity.outcome(false)));
    }
    Ok(None)
}

fn activity_parent<'a>(
    entities: &'a crate::state::EntityStore,
    command: &NativeCommand,
) -> Option<&'a str> {
    entities
        .get(&command.envelope().actor_id)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.agency.plan.as_ref())
        .filter(|plan| {
            plan.steps
                .iter()
                .any(|step| step.id == command.envelope().id)
        })
        .map(|plan| plan.id.as_str())
}
