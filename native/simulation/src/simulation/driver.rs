//! The actual elapsed cursor yields purpose-specific provider work. Its existing
//! child cursors remain the only owners of effects and sealed completions.
use crate::activity::ActivityView;
use crate::commands::{
    ActivityDisplayAnswer, ActivityDisplayCursor, ActivityDisplayStep, CommandOperation,
    CommandOperationAnswer, CommandOperationError, CommandOperationStep, CompletedActivityDisplay,
    CompletedCommandOperation,
};
use crate::events::{CompletedEvent, EventAnswer, EventCursor, EventStep};
use crate::execution::{CoreMutation, ExecutionError};
use crate::geometry::{GeometryAnswers, GeometryBinding};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, WordsAnswer};
use crate::plans::{CompletedPlanRun, PlanRunAnswer, PlanRunCursor, PlanRunStep};
use crate::reception::{
    CompletedHeldReception, CompletedNativeExposure, CompletedObserverReception,
    CompletedPerception, GeometryReceptionAnswer, HeldReceptionCursor, HeldReceptionStep,
    NativeExposureCursor, NativeExposureStep, ObserverReceptionAnswer, ObserverReceptionCursor,
    ObserverReceptionStep, PerceptionAnswer, PerceptionCursor, PerceptionStep,
    PersonalVisualAnswer,
};
use crate::speech::SpeechWord;
use crate::state::SurfacePoint;
use crate::text::JsText;
use crate::time::{AdvanceAnswer, AdvanceCursor, AdvanceError, AdvanceStep, CompletedAdvance};
use serde::{Deserialize, Serialize};
use std::{mem::size_of, sync::Arc};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ProviderKind {
    Geometry,
    Utterance,
    Collation,
    Words,
    Display,
    Canonical,
}
#[derive(Debug)]
pub(crate) enum DriveError {
    StaleResponse,
    MalformedResponse,
    Capacity,
    Encoding,
    Semantic(AdvanceError),
}
impl From<ExecutionError> for DriveError {
    fn from(e: ExecutionError) -> Self {
        Self::Semantic(e.into())
    }
}
impl From<AdvanceError> for DriveError {
    fn from(e: AdvanceError) -> Self {
        Self::Semantic(e)
    }
}
impl From<CommandOperationError> for DriveError {
    fn from(e: CommandOperationError) -> Self {
        Self::Semantic(e.into())
    }
}
impl From<crate::events::EventError> for DriveError {
    fn from(e: crate::events::EventError) -> Self {
        Self::Semantic(CommandOperationError::Event(e).into())
    }
}
impl From<crate::reception::ObserverReceptionError> for DriveError {
    fn from(e: crate::reception::ObserverReceptionError) -> Self {
        Self::Semantic(e.into())
    }
}

/// The pending driver and every detached provider job share this same guard.
/// Cancelling the cursor cannot free bytes still held by a late provider job.
pub(crate) struct ProviderQuestion {
    kind: ProviderKind,
    binding: GeometryBinding,
    json: String,
    _reservation: ByteReservation,
}
impl ProviderQuestion {
    pub(crate) fn kind(&self) -> ProviderKind {
        self.kind
    }
    pub(crate) fn binding(&self) -> GeometryBinding {
        self.binding
    }
    pub(crate) fn json(&self) -> &str {
        &self.json
    }
    fn prepare<T: Serialize + ?Sized>(
        kind: ProviderKind,
        binding: GeometryBinding,
        value: &T,
        budget: &ByteBudget,
    ) -> Result<Arc<Self>, DriveError> {
        #[derive(Serialize)]
        struct Envelope<'a, T: ?Sized> {
            kind: ProviderKind,
            binding: GeometryBinding,
            value: &'a T,
        }
        let envelope = Envelope {
            kind,
            binding,
            value,
        };
        let bytes =
            crate::encoding::json_record_len(&envelope).map_err(|_| DriveError::Encoding)?;
        // The serializer's growing UTF8 buffer and its final String can coexist.
        // This is allocation admission; measured resident costs remain separate.
        let bound = bytes
            .checked_mul(4)
            .and_then(|n| n.checked_add(size_of::<Self>() + 2 * size_of::<usize>() + 64))
            .ok_or(DriveError::Capacity)?;
        let mut reservation = budget.reserve(bound).map_err(|_| DriveError::Capacity)?;
        let json = crate::encoding::json_record(&envelope).map_err(|_| DriveError::Encoding)?;
        reservation
            .resize(json.capacity() + size_of::<Self>() + 2 * size_of::<usize>())
            .map_err(|_| DriveError::Capacity)?;
        Ok(Arc::new(Self {
            kind,
            binding,
            json,
            _reservation: reservation,
        }))
    }
}
/// The host funds construction of this incoming String before moving it here.
/// Its original allowance remains live through typed consumption or refusal.
pub(crate) struct ProviderResponse {
    kind: ProviderKind,
    binding: GeometryBinding,
    json: String,
    _reservation: ByteReservation,
}
impl ProviderResponse {
    pub(crate) fn new(
        kind: ProviderKind,
        binding: GeometryBinding,
        json: String,
        reservation: ByteReservation,
    ) -> Result<Self, DriveError> {
        if reservation.bytes() < json.capacity() {
            return Err(DriveError::Capacity);
        }
        Ok(Self {
            kind,
            binding,
            json,
            _reservation: reservation,
        })
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Utterance {
    binding: GeometryBinding,
    words: Vec<SpeechWord>,
    lowercase: JsText,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Formatted {
    binding: GeometryBinding,
    view: ActivityView,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Canonical {
    binding: GeometryBinding,
    canonical: String,
}
/// Count JSON allocation-bearing shape without decoding text or constructing a
/// tree. Escaped isolated UTF16 units must reach the actual JsText decoder.
/// Syntax/field validation remains the typed family's owning boundary below.
#[derive(Default)]
struct DecodeShape {
    array_items: usize,
    members: usize,
    strings: usize,
}
impl DecodeShape {
    fn read(source: &str) -> Result<Self, DriveError> {
        let mut result = Self::default();
        let mut stack = [0_u8; 128]; // serde_json's current recursion limit.
        let mut depth = 0;
        let mut quoted = false;
        let mut escaped = false;
        let bytes = source.as_bytes();
        for (at, byte) in bytes.iter().copied().enumerate() {
            if quoted {
                if escaped {
                    escaped = false;
                } else if byte == b'\\' {
                    escaped = true;
                } else if byte == b'"' {
                    quoted = false;
                }
                continue;
            }
            match byte {
                b'"' => {
                    quoted = true;
                    result.strings = result.strings.checked_add(1).ok_or(DriveError::Capacity)?;
                }
                b'[' | b'{' => {
                    let slot = stack.get_mut(depth).ok_or(DriveError::MalformedResponse)?;
                    *slot = byte;
                    depth += 1;
                    if byte == b'['
                        && bytes[at + 1..].iter().find(|b| !b.is_ascii_whitespace()) != Some(&b']')
                    {
                        result.array_items = result
                            .array_items
                            .checked_add(1)
                            .ok_or(DriveError::Capacity)?;
                    }
                }
                b']' | b'}' => {
                    depth = depth.checked_sub(1).ok_or(DriveError::MalformedResponse)?;
                    if stack[depth] != if byte == b']' { b'[' } else { b'{' } {
                        return Err(DriveError::MalformedResponse);
                    }
                }
                b',' if depth > 0 && stack[depth - 1] == b'[' => {
                    result.array_items = result
                        .array_items
                        .checked_add(1)
                        .ok_or(DriveError::Capacity)?;
                }
                b':' => {
                    result.members = result.members.checked_add(1).ok_or(DriveError::Capacity)?
                }
                _ => {}
            }
        }
        if quoted || depth != 0 {
            return Err(DriveError::MalformedResponse);
        }
        Ok(result)
    }
    fn bound(&self, kind: ProviderKind, wire: usize) -> Result<usize, DriveError> {
        use crate::host::retained_size::map_storage;
        use crate::{
            activity::{ActivityDetail, ActivityFact},
            geometry::*,
        };
        // A newly decoded Vec grows to at most four slots per live element
        // (including its minimum non-byte capacity). These are every supported
        // response array's largest inline elements, rather than a byte multiplier.
        let element = match kind {
            ProviderKind::Geometry => [
                size_of::<RoutePlan>(),
                size_of::<NavigationAnswer>(),
                size_of::<Option<PhysicalFeature>>(),
                size_of::<PhysicalFeatureAnswer>(),
                size_of::<ConvexViewAnswer>(),
                size_of::<Option<StandingSelection>>(),
                size_of::<Option<SurfacePoint>>(),
                size_of::<Option<SurfaceLineAnswer>>(),
                size_of::<SightSweep>(),
                size_of::<BodySweepAnswer>(),
            ]
            .into_iter()
            .max()
            .unwrap_or(0),
            ProviderKind::Display => [
                size_of::<ActivityView>(),
                size_of::<ActivityFact>(),
                size_of::<ActivityDetail>(),
            ]
            .into_iter()
            .max()
            .unwrap_or(0),
            ProviderKind::Utterance => size_of::<SpeechWord>(),
            ProviderKind::Words => size_of::<Vec<JsText>>().max(size_of::<JsText>()),
            ProviderKind::Collation => size_of::<u32>(),
            ProviderKind::Canonical => 0,
        };
        let arrays = self
            .array_items
            .checked_mul(4)
            .and_then(|n| n.checked_mul(element))
            .ok_or(DriveError::Capacity)?;
        // Tagged route enums temporarily buffer map members before constructing
        // their typed fields. Activity detail fields additionally keep both their
        // raw-entry and typed maps until each level has completed. One-entry map
        // allocation bounds each entry of these fresh (never sparse) maps.
        let map_entry = if matches!(kind, ProviderKind::Display) {
            map_storage::<JsText, ActivityDetail>(1)
                .ok_or(DriveError::Capacity)?
                .checked_add(
                    map_storage::<JsText, Box<serde_json::value::RawValue>>(1)
                        .ok_or(DriveError::Capacity)?,
                )
                .ok_or(DriveError::Capacity)?
        } else if matches!(kind, ProviderKind::Geometry) {
            4 * size_of::<(String, serde_json::Value)>()
        } else {
            0
        };
        let maps = self
            .members
            .checked_mul(map_entry)
            .ok_or(DriveError::Capacity)?;
        // JsText may coexist with its original raw text, Unicode trial/scratch,
        // a growing u16 buffer, and growing/final immutable quoted text. Raw
        // ActivityDetail parsing retains at most its owning raw value plus five
        // current levels (depth 0..4). This funds preparation, not resident size.
        let text_copies = 1 + 2 + 2 * size_of::<u16>() + 2 + 2 + 1;
        let raw_levels = if matches!(kind, ProviderKind::Display) {
            6
        } else {
            0
        };
        let text = wire
            .checked_mul(text_copies + raw_levels)
            .and_then(|n| {
                n.checked_add(
                    self.strings
                        .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
                )
            })
            .ok_or(DriveError::Capacity)?;
        size_of::<Answer>()
            .checked_add(arrays)
            .and_then(|n| n.checked_add(maps))
            .and_then(|n| n.checked_add(text))
            .ok_or(DriveError::Capacity)
    }
}
enum Answer {
    Geometry(GeometryAnswers),
    Utterance(Utterance),
    Collation(CollationAnswer),
    Words(WordsAnswer),
    Display(Formatted),
    Canonical(Canonical),
}
impl Answer {
    fn decode(input: &ProviderResponse) -> Result<Self, DriveError> {
        let parse = |error: serde_json::Error| {
            drop(error);
            DriveError::MalformedResponse
        };
        let value = match input.kind {
            ProviderKind::Geometry => {
                Self::Geometry(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Utterance => {
                Self::Utterance(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Collation => {
                Self::Collation(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Words => Self::Words(serde_json::from_str(&input.json).map_err(parse)?),
            ProviderKind::Display => {
                Self::Display(serde_json::from_str(&input.json).map_err(parse)?)
            }
            ProviderKind::Canonical => {
                Self::Canonical(serde_json::from_str(&input.json).map_err(parse)?)
            }
        };
        if value.binding() != input.binding {
            return Err(DriveError::StaleResponse);
        }
        Ok(value)
    }
    fn binding(&self) -> GeometryBinding {
        match self {
            Self::Geometry(v) => v.binding,
            Self::Utterance(v) => v.binding,
            Self::Collation(v) => v.binding,
            Self::Words(v) => v.binding,
            Self::Display(v) => v.binding,
            Self::Canonical(v) => v.binding,
        }
    }
    fn kind(&self) -> ProviderKind {
        match self {
            Self::Geometry(_) => ProviderKind::Geometry,
            Self::Utterance(_) => ProviderKind::Utterance,
            Self::Collation(_) => ProviderKind::Collation,
            Self::Words(_) => ProviderKind::Words,
            Self::Display(_) => ProviderKind::Display,
            Self::Canonical(_) => ProviderKind::Canonical,
        }
    }
}
// Only the real, finite cursor tree is routable. In particular, replaying
// step(None) on an awaiting leaf is not a read: several owners prepare a new
// request there. Retain that exact leaf route when the original question yields.
#[derive(Clone, Copy)]
enum EventReply {
    Geometry,
    Utterance,
    Collation,
    Words,
}
#[derive(Clone, Copy)]
enum DisplayReply {
    Geometry,
    Format,
}
#[derive(Clone, Copy)]
enum CommandReply {
    Geometry,
    Event(EventReply),
    Display(DisplayReply),
}
#[derive(Clone, Copy)]
enum PlanReply {
    Geometry,
    Canonical,
    Command(CommandReply),
}
#[derive(Clone, Copy)]
enum HeldReply {
    Geometry,
    Language,
}
#[derive(Clone, Copy)]
enum NativeReply {
    Geometry,
}
#[derive(Clone, Copy)]
enum HumanReply {
    Geometry,
    Language,
    Event(EventReply),
}
#[derive(Clone, Copy)]
enum PerceptionReply {
    Geometry,
    Held(HeldReply),
    Native(NativeReply),
    Human(HumanReply),
}
#[derive(Clone, Copy)]
enum AdvanceReply {
    Geometry,
    Collation,
    Event(EventReply),
    Command(CommandReply),
    Plan(PlanReply),
    Perception(PerceptionReply),
}
enum Poll<T, R> {
    Continue,
    Question(Arc<ProviderQuestion>, R),
    Complete(T),
}
fn question<T: Serialize + ?Sized, V, R>(
    answer: &Option<Answer>,
    kind: ProviderKind,
    binding: GeometryBinding,
    value: &T,
    budget: &ByteBudget,
    route: R,
) -> Result<Poll<V, R>, DriveError> {
    if answer.is_some() {
        return Err(DriveError::StaleResponse);
    }
    Ok(Poll::Question(
        ProviderQuestion::prepare(kind, binding, value, budget)?,
        route,
    ))
}
fn direct(answer: &mut Option<Answer>, kind: ProviderKind) -> Result<Answer, DriveError> {
    if answer.as_ref().is_none_or(|a| a.kind() != kind) {
        return Err(DriveError::StaleResponse);
    }
    answer.take().ok_or(DriveError::StaleResponse)
}

pub(crate) enum DriveStep {
    Continue,
    Question(Arc<ProviderQuestion>),
    Complete(CompletedAdvance),
}
pub(crate) struct AdvanceDriver {
    cursor: AdvanceCursor,
    pending: Option<(Arc<ProviderQuestion>, AdvanceReply)>,
    installed: Arc<crate::simulation::InstalledWorld>,
    base_cut: u64,
    generation: String,
    done: bool,
    _reservation: ByteReservation,
}
impl AdvanceDriver {
    pub(crate) fn from_cursor(
        core: &mut CoreMutation<'_>,
        mut cursor: AdvanceCursor,
        budget: &ByteBudget,
    ) -> Result<Self, DriveError> {
        let reservation = match budget.reserve(size_of::<Self>() + core.state.generation.len()) {
            Ok(reservation) => reservation,
            Err(_) => {
                cursor.abort(core)?;
                return Err(DriveError::Capacity);
            }
        };
        Ok(Self {
            cursor,
            pending: None,
            installed: core.state.installed.clone(),
            base_cut: core.state.accepted_cut,
            generation: core.state.generation.clone(),
            done: false,
            _reservation: reservation,
        })
    }
    pub(crate) fn pending(&self) -> Option<&Arc<ProviderQuestion>> {
        self.pending.as_ref().map(|(question, _)| question)
    }
    pub(crate) fn finished(&self) -> bool {
        self.done
    }
    pub(crate) fn abort(&mut self, core: &mut CoreMutation<'_>) -> Result<(), DriveError> {
        self.cursor.abort(core)?;
        self.pending = None;
        self.done = true;
        Ok(())
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        input: Option<ProviderResponse>,
        budget: &ByteBudget,
    ) -> Result<DriveStep, DriveError> {
        if self.done
            || core.state.accepted_cut != self.base_cut
            || core.state.generation != self.generation
            || !Arc::ptr_eq(&self.installed, &core.state.installed)
        {
            return Err(DriveError::StaleResponse);
        }
        if input.is_none() {
            if let Some((question, _)) = &self.pending {
                return Ok(DriveStep::Question(question.clone()));
            }
        }
        if let Some(input) = &input {
            if self
                .pending
                .as_ref()
                .is_none_or(|(q, _)| q.kind != input.kind || q.binding != input.binding)
            {
                return Err(DriveError::StaleResponse);
            }
        }
        // Shape counting allocates nothing, including for malformed/lone-unit
        // text. The current typed family then validates under funded preparation.
        let decoded_guard = input
            .as_ref()
            .map(|v| {
                if !v._reservation.shares_owner(&self._reservation) {
                    return Err(DriveError::StaleResponse);
                }
                let bytes = DecodeShape::read(&v.json)?.bound(v.kind, v.json.len())?;
                budget.reserve(bytes).map_err(|_| DriveError::Capacity)
            })
            .transpose()?;
        let mut answer = input.as_ref().map(Answer::decode).transpose()?;
        let route = input
            .as_ref()
            .and_then(|_| self.pending.as_ref().map(|(_, route)| *route));
        let result = poll_advance(&mut self.cursor, core, &mut answer, route, budget);
        drop(answer);
        drop(decoded_guard);
        drop(input);
        match result {
            Ok(Poll::Continue) => {
                self.pending = None;
                Ok(DriveStep::Continue)
            }
            Ok(Poll::Question(q, route)) => {
                self.pending = Some((q.clone(), route));
                Ok(DriveStep::Question(q))
            }
            Ok(Poll::Complete(done)) => {
                self.pending = None;
                self.done = true;
                Ok(DriveStep::Complete(done))
            }
            Err(DriveError::Semantic(error)) => {
                self.abort(core)?;
                Err(DriveError::Semantic(error))
            }
            Err(error @ (DriveError::Capacity | DriveError::Encoding)) => {
                // A valid answer may already have advanced its real child before
                // preparation of the following question fails. The prior query
                // cannot be replayed against that later continuation.
                self.abort(core)?;
                Err(error)
            }
            Err(error) => Err(error),
        }
    }
}

fn poll_event(
    cursor: &mut EventCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<EventReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedEvent, EventReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(EventReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Geometry(v));
    }
    if matches!(route, Some(EventReply::Utterance)) {
        route = None;
        let Answer::Utterance(v) = direct(answer, ProviderKind::Utterance)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Utterance {
            binding: v.binding,
            words: v.words,
            lowercase: v.lowercase,
        });
    }
    if matches!(route, Some(EventReply::Collation)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Collation(v));
    }
    if matches!(route, Some(EventReply::Words)) {
        route = None;
        let Answer::Words(v) = direct(answer, ProviderKind::Words)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(EventAnswer::Words(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            EventStep::Continue => return Ok(Poll::Continue),
            EventStep::Complete(done) => return Ok(Poll::Complete(done)),
            EventStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    EventReply::Geometry,
                );
            }
            EventStep::Utterance { binding, text } => {
                #[derive(Serialize)]
                struct Request<'a> {
                    binding: GeometryBinding,
                    text: &'a JsText,
                }
                return question(
                    answer,
                    ProviderKind::Utterance,
                    binding,
                    &Request { binding, text },
                    budget,
                    EventReply::Utterance,
                );
            }
            EventStep::Collation(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    EventReply::Collation,
                );
            }
            EventStep::Words(q) => {
                return question(
                    answer,
                    ProviderKind::Words,
                    q.binding(),
                    q,
                    budget,
                    EventReply::Words,
                );
            }
        }
    }
}

fn poll_display(
    cursor: &mut ActivityDisplayCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<DisplayReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedActivityDisplay, DisplayReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(DisplayReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ActivityDisplayAnswer::Geometry(v));
    }
    if matches!(route, Some(DisplayReply::Format)) {
        route = None;
        let Answer::Display(v) = direct(answer, ProviderKind::Display)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ActivityDisplayAnswer::Formatted {
            binding: v.binding,
            view: v.view,
        });
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            ActivityDisplayStep::Complete(done) => return Ok(Poll::Complete(done)),
            ActivityDisplayStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    DisplayReply::Geometry,
                );
            }
            ActivityDisplayStep::Format(q) => {
                return question(
                    answer,
                    ProviderKind::Display,
                    q.binding,
                    q,
                    budget,
                    DisplayReply::Format,
                );
            }
        }
    }
}

fn poll_command(
    cursor: &mut CommandOperation,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<CommandReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedCommandOperation, CommandReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(CommandReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(CommandOperationAnswer::Geometry(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            CommandOperationStep::Complete(done) => return Ok(Poll::Complete(done)),
            CommandOperationStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    CommandReply::Geometry,
                );
            }
            CommandOperationStep::Event(child) => {
                let child_route = match route.take() {
                    Some(CommandReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(CommandOperationAnswer::Event(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, CommandReply::Event(r))),
                }
            }
            CommandOperationStep::Display(child) => {
                let child_route = match route.take() {
                    Some(CommandReply::Display(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_display(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(CommandOperationAnswer::Display(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, CommandReply::Display(r))),
                }
            }
        }
    }
}

fn poll_plan(
    cursor: &mut PlanRunCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<PlanReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedPlanRun, PlanReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(PlanReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(PlanRunAnswer::Geometry(v));
    }
    if matches!(route, Some(PlanReply::Canonical)) {
        route = None;
        let Answer::Canonical(v) = direct(answer, ProviderKind::Canonical)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(PlanRunAnswer::Canonical {
            binding: v.binding,
            canonical: v.canonical,
        });
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            PlanRunStep::Complete(done) => return Ok(Poll::Complete(done)),
            PlanRunStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    PlanReply::Geometry,
                );
            }
            PlanRunStep::Canonical(q) => {
                return question(
                    answer,
                    ProviderKind::Canonical,
                    q.binding,
                    q,
                    budget,
                    PlanReply::Canonical,
                );
            }
            PlanRunStep::Command(child) => {
                let child_route = match route.take() {
                    Some(PlanReply::Command(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_command(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PlanRunAnswer::Command(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, PlanReply::Command(r))),
                }
            }
        }
    }
}

fn poll_held(
    cursor: &mut HeldReceptionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<HeldReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedHeldReception, HeldReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(HeldReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(GeometryReceptionAnswer::Geometry(v));
    }
    if matches!(route, Some(HeldReply::Language)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(GeometryReceptionAnswer::Language(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            HeldReceptionStep::Complete(done) => return Ok(Poll::Complete(done)),
            HeldReceptionStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    HeldReply::Geometry,
                );
            }
            HeldReceptionStep::Language(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    HeldReply::Language,
                );
            }
        }
    }
}

fn poll_native(
    cursor: &mut NativeExposureCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<NativeReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedNativeExposure, NativeReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(NativeReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(v);
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            NativeExposureStep::Complete(done) => return Ok(Poll::Complete(done)),
            NativeExposureStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    NativeReply::Geometry,
                );
            }
        }
    }
}

fn poll_human(
    cursor: &mut ObserverReceptionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<HumanReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedObserverReception, HumanReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(HumanReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ObserverReceptionAnswer::Visual(
            PersonalVisualAnswer::Geometry(v),
        ));
    }
    if matches!(route, Some(HumanReply::Language)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(ObserverReceptionAnswer::Visual(
            PersonalVisualAnswer::Language(v),
        ));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            ObserverReceptionStep::Complete(done) => return Ok(Poll::Complete(done)),
            ObserverReceptionStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    HumanReply::Geometry,
                );
            }
            ObserverReceptionStep::Language(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    HumanReply::Language,
                );
            }
            ObserverReceptionStep::Event(child) => {
                let child_route = match route.take() {
                    Some(HumanReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(ObserverReceptionAnswer::Event(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, HumanReply::Event(r))),
                }
            }
        }
    }
}

fn poll_perception(
    cursor: &mut PerceptionCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<PerceptionReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedPerception, PerceptionReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(PerceptionReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(PerceptionAnswer::Geometry(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            PerceptionStep::Continue => return Ok(Poll::Continue),
            PerceptionStep::Complete(done) => return Ok(Poll::Complete(done)),
            PerceptionStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    PerceptionReply::Geometry,
                );
            }
            PerceptionStep::Held(child) => {
                let child_route = match route.take() {
                    Some(PerceptionReply::Held(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_held(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PerceptionAnswer::Held(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, PerceptionReply::Held(r))),
                }
            }
            PerceptionStep::Native(child) => {
                let child_route = match route.take() {
                    Some(PerceptionReply::Native(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_native(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PerceptionAnswer::Native(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, PerceptionReply::Native(r)));
                    }
                }
            }
            PerceptionStep::Human(child) => {
                let child_route = match route.take() {
                    Some(PerceptionReply::Human(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_human(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(PerceptionAnswer::Human(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, PerceptionReply::Human(r)));
                    }
                }
            }
        }
    }
}

fn poll_advance(
    cursor: &mut AdvanceCursor,
    core: &mut CoreMutation<'_>,
    answer: &mut Option<Answer>,
    mut route: Option<AdvanceReply>,
    budget: &ByteBudget,
) -> Result<Poll<CompletedAdvance, AdvanceReply>, DriveError> {
    let mut supplied = None;
    if matches!(route, Some(AdvanceReply::Geometry)) {
        route = None;
        let Answer::Geometry(v) = direct(answer, ProviderKind::Geometry)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(AdvanceAnswer::Geometry(v));
    }
    if matches!(route, Some(AdvanceReply::Collation)) {
        route = None;
        let Answer::Collation(v) = direct(answer, ProviderKind::Collation)? else {
            return Err(DriveError::StaleResponse);
        };
        supplied = Some(AdvanceAnswer::Collation(v));
    }
    loop {
        match cursor.step(core, supplied.take(), budget)? {
            AdvanceStep::Continue => return Ok(Poll::Continue),
            AdvanceStep::Complete(done) => return Ok(Poll::Complete(done)),
            AdvanceStep::Geometry(q) => {
                return question(
                    answer,
                    ProviderKind::Geometry,
                    q.binding,
                    q,
                    budget,
                    AdvanceReply::Geometry,
                );
            }
            AdvanceStep::Collation(q) => {
                return question(
                    answer,
                    ProviderKind::Collation,
                    q.binding(),
                    q,
                    budget,
                    AdvanceReply::Collation,
                );
            }
            AdvanceStep::Event(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Event(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_event(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Event(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, AdvanceReply::Event(r))),
                }
            }
            AdvanceStep::Command(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Command(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_command(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Command(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, AdvanceReply::Command(r))),
                }
            }
            AdvanceStep::Plan(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Plan(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_plan(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Plan(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => return Ok(Poll::Question(q, AdvanceReply::Plan(r))),
                }
            }
            AdvanceStep::Perception(child) => {
                let child_route = match route.take() {
                    Some(AdvanceReply::Perception(r)) => Some(r),
                    None => None,
                    _ => return Err(DriveError::StaleResponse),
                };
                match poll_perception(child, core, answer, child_route, budget)? {
                    Poll::Complete(done) => supplied = Some(AdvanceAnswer::Perception(done)),
                    Poll::Continue => return Ok(Poll::Continue),
                    Poll::Question(q, r) => {
                        return Ok(Poll::Question(q, AdvanceReply::Perception(r)));
                    }
                }
            }
        }
    }
}
