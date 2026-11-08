//! The occurrence owner preserves Source callback order across finite provider
//! yields. Speech recognition for every listener precedes every original; real
//! receiving and account/name placement precede outward animal consequences.
use super::receiver::{Receiver, prepare_receiver_awareness};
use super::*;
use crate::activity::EventActivity;
use crate::execution::{CoreMutation, ExecutionError, PhysicalMutation};
use crate::experience::{
    Awareness, AwarenessAcquisitionError, AwarenessEncoding, AwarenessFactory, AwarenessInput,
    MemoryAcquisitionError, acquire_awareness_accounts, prepare_awareness_admission,
};
use crate::geometry::{GeometryAnswers, GeometryBinding, GeometryQueries};
use crate::host::retained_size::{HeapBytes, heap_sum, map_storage};
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{CollationAnswer, CollationRequest, WordsAnswer, WordsRequest};
use crate::reception::AwarenessReceiptPlacement;
use crate::reception::{
    EventAudience, EventAudienceBatch, EventScalar, ExperienceModality, ReceivingCursor,
    ReceivingStep, SensorError, SightBatch, SightResults, acquire_ordinary_warning,
    event_visibility_targets,
};
use crate::speech::{
    PreparedSpeechAwareness, SpeechContactBatch, SpeechContacts, SpeechReceiverCursor,
    SpeechReceiverStep, SpeechWord, SpeechWords,
};
use crate::work::WorkUnit;
use crate::worlds::base_knowledge::IntroductionWords;
use crate::worlds::base_observed::SpeechVolume;
use indexmap::{IndexMap, IndexSet};
use std::{mem::size_of, sync::Arc};

#[derive(Debug)]
pub(crate) enum EventError {
    Execution(ExecutionError),
    Awareness(AwarenessAcquisitionError),
    Memory(MemoryAcquisitionError),
    Occurrence(OccurrenceError),
    Sensor(SensorError),
}
impl From<crate::host::CapacityError> for EventError {
    fn from(_: crate::host::CapacityError) -> Self {
        Self::Execution(ExecutionError::Capacity)
    }
}
impl From<ExecutionError> for EventError {
    fn from(e: ExecutionError) -> Self {
        Self::Execution(e)
    }
}
impl From<AwarenessAcquisitionError> for EventError {
    fn from(e: AwarenessAcquisitionError) -> Self {
        Self::Awareness(e)
    }
}
impl From<MemoryAcquisitionError> for EventError {
    fn from(e: MemoryAcquisitionError) -> Self {
        Self::Memory(e)
    }
}
impl From<OccurrenceError> for EventError {
    fn from(e: OccurrenceError) -> Self {
        Self::Occurrence(e)
    }
}
impl From<SensorError> for EventError {
    fn from(e: SensorError) -> Self {
        Self::Sensor(e)
    }
}
fn invalid() -> EventError {
    ExecutionError::UnfinishedOccurrence.into()
}
fn data_text<'a>(event: &'a WorldEvent, key: &str) -> Option<&'a str> {
    match event.data.as_ref().and_then(|data| data.get(key)) {
        Some(EventScalar::Text(value)) => value.as_unicode(),
        _ => None,
    }
}
fn event_text<'a>(event: &'a WorldEvent, key: &str) -> Option<&'a crate::text::JsText> {
    match event.data.as_ref().and_then(|data| data.get(key)) {
        Some(EventScalar::Text(value)) => Some(value),
        _ => None,
    }
}
fn data_true(event: &WorldEvent, key: &str) -> bool {
    matches!(
        event.data.as_ref().and_then(|data| data.get(key)),
        Some(EventScalar::Boolean(true))
    )
}
fn speech_volume(event: &WorldEvent) -> SpeechVolume {
    match data_text(event, "volume") {
        Some("whisper") => SpeechVolume::Whisper,
        Some("shout") => SpeechVolume::Shout,
        _ => SpeechVolume::Normal,
    }
}
fn activity_cause<'a>(core: &'a CoreMutation<'_>, event: &'a WorldEvent) -> Option<&'a str> {
    let data = event.data.as_ref();
    let value = data
        .and_then(|d| d.get("actionId"))
        .filter(|v| !matches!(v, EventScalar::Null(())))
        .or_else(|| {
            data.and_then(|d| d.get("effectId"))
                .filter(|v| !matches!(v, EventScalar::Null(())))
        });
    match value {
        Some(EventScalar::Text(value)) => value.as_unicode(),
        Some(_) => None,
        None => event
            .actor_id
            .as_ref()
            .and_then(|source| core.state.activity.current.get(source))
            .map(String::as_str),
    }
}
struct VisibilityReceiver {
    batch: SightBatch,
    first: usize,
    count: usize,
}
struct VisibilityBatch {
    queries: GeometryQueries,
    receivers: Vec<VisibilityReceiver>,
    reservation: ByteReservation,
}
impl VisibilityBatch {
    fn prepare(
        core: &CoreMutation<'_>,
        event: &WorldEvent,
        receivers: &[Receiver],
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Self, EventError> {
        let reservation = budget.reserve(
            size_of::<Self>()
                + receivers
                    .len()
                    .checked_mul(size_of::<VisibilityReceiver>() + size_of::<SightResults>())
                    .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut result = Self {
            queries: GeometryQueries::new(binding),
            receivers: Vec::new(),
            reservation,
        };
        result
            .receivers
            .try_reserve_exact(receivers.len())
            .map_err(|_| ExecutionError::Capacity)?;
        for receiver in receivers {
            let count = event
                .narration
                .as_ref()
                .map_or(0, |narration| narration.parts.len())
                .checked_add(event.data.as_ref().map_or(0, IndexMap::len))
                .and_then(|n| n.checked_add(2))
                .ok_or(ExecutionError::Capacity)?;
            result.reservation.resize(
                result
                    .reservation
                    .bytes()
                    .checked_add(
                        count
                            .checked_mul(2 * size_of::<&str>())
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let targets = event_visibility_targets(
                &core.state.physical.entities,
                event,
                &receiver.actor_id,
                core.state.installed.event_disclosure.value(),
                receiver.native_contact,
            )?;
            let batch = SightBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                &receiver.actor_id,
                &targets,
                binding,
                budget,
            )?;
            let first = result.queries.sight.len();
            let count = batch.queries().sight.len();
            result.reservation.resize(
                result
                    .reservation
                    .bytes()
                    .checked_add(
                        count
                            .checked_mul(size_of::<crate::geometry::SightRay>())
                            .ok_or(ExecutionError::Capacity)?,
                    )
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            result
                .queries
                .sight
                .try_reserve_exact(count)
                .map_err(|_| ExecutionError::Capacity)?;
            result
                .queries
                .sight
                .extend(batch.queries().sight.iter().cloned());
            result.receivers.push(VisibilityReceiver {
                batch,
                first,
                count,
            });
        }
        Ok(result)
    }
    fn finish(
        self,
        answer: GeometryAnswers,
    ) -> Result<(Vec<SightResults>, ByteReservation), EventError> {
        self.queries
            .validate_answers(&answer)
            .map_err(|_| invalid())?;
        let mut results = Vec::new();
        results
            .try_reserve_exact(self.receivers.len())
            .map_err(|_| ExecutionError::Capacity)?;
        for receiver in self.receivers {
            results.push(receiver.batch.finish_sight(
                answer.binding,
                &answer.sight[receiver.first..receiver.first + receiver.count],
            )?);
        }
        Ok((results, self.reservation))
    }
}
enum Phase {
    Initial,
    Audience(EventAudienceBatch),
    NativeTarget(SightBatch),
    Contacts(SpeechContactBatch),
    Utterance { binding: GeometryBinding },
    Speech,
    Visibility(VisibilityBatch),
    Receivers,
    Accounts,
    Introduction(IntroductionWords),
    Finalize,
    Complete,
}
pub(crate) enum EventAnswer {
    Geometry(GeometryAnswers),
    Utterance {
        binding: GeometryBinding,
        words: Vec<SpeechWord>,
        lowercase: crate::text::JsText,
    },
    Collation(CollationAnswer),
    Words(WordsAnswer),
}
pub(crate) enum EventStep<'a> {
    /// The native coordinator continues this finite phase without a Node call.
    Continue,
    Geometry(&'a GeometryQueries),
    Utterance {
        binding: GeometryBinding,
        text: &'a crate::text::JsText,
    },
    Collation(&'a CollationRequest),
    Words(&'a WordsRequest),
    Complete(CompletedEvent),
}
/// Internal original output. The host still performs each permitted consumer's
/// scoped projection; this is never a wire grant for every witness's account.
pub(crate) struct CompletedEvent {
    pub event: WorldEvent,
    pub completed: CompletedOccurrence,
    pub awareness: Vec<Awareness>,
    pub reservation: ByteReservation,
}
pub(crate) struct EventCursor {
    account_placement: EventAccountPlacement,
    begun: Option<BegunOccurrence>,
    binding: GeometryBinding,
    phase: Phase,
    activity: Option<EventActivity>,
    audience: Option<EventAudience>,
    contacts: Option<SpeechContacts>,
    words: Option<SpeechWords>,
    speech: IndexMap<String, PreparedSpeechAwareness>,
    speech_ids: IndexSet<String>,
    speech_next: usize,
    speech_cursor: Option<SpeechReceiverCursor>,
    receivers: Vec<Receiver>,
    visibility: Vec<SightResults>,
    receiver_next: usize,
    receiving: Option<ReceivingCursor>,
    current_awareness: Option<Awareness>,
    current_encoding: Option<AwarenessEncoding>,
    acquired: Vec<Awareness>,
    acquired_encoding: Vec<AwarenessEncoding>,
    reservation: ByteReservation,
}
impl EventCursor {
    pub(crate) fn prepare(
        core: &CoreMutation<'_>,
        begun: BegunOccurrence,
        binding: GeometryBinding,
        account_placement: EventAccountPlacement,
        budget: &ByteBudget,
    ) -> Result<Self, EventError> {
        crate::native_controller::require_supported_event(core, begun.event())?;
        if let EventAccountPlacement::Encounter(batch) = &account_placement {
            core.journal.encounters.validate_event(
                batch,
                begun.event(),
                &core.state.physical,
                &core
                    .state
                    .installed
                    .observation_rules
                    .value()
                    .sighting
                    .event_type,
            )?;
        }
        let activity = if core
            .state
            .installed
            .occurrence_rules
            .value()
            .activity_events
            .contains(&begun.event.event_type)
        {
            activity_cause(core, &begun.event)
                .map(|cause| core.state.activity.capture_event_activity(cause, budget))
                .transpose()
                .map_err(ExecutionError::Activity)?
                .flatten()
        } else {
            None
        };
        let reservation = budget.reserve(size_of::<Self>())?;
        Ok(Self {
            account_placement,
            begun: Some(begun),
            binding,
            phase: Phase::Initial,
            activity,
            audience: None,
            contacts: None,
            words: None,
            speech: IndexMap::new(),
            speech_ids: IndexSet::new(),
            speech_next: 0,
            speech_cursor: None,
            receivers: Vec::new(),
            visibility: Vec::new(),
            receiver_next: 0,
            receiving: None,
            current_awareness: None,
            current_encoding: None,
            acquired: Vec::new(),
            acquired_encoding: Vec::new(),
            reservation,
        })
    }
    fn event(&self) -> Result<&WorldEvent, EventError> {
        Ok(&self.begun.as_ref().ok_or_else(invalid)?.event)
    }
    fn reserve(&mut self, bytes: usize) -> Result<(), EventError> {
        self.reservation.resize(
            self.reservation
                .bytes()
                .checked_add(bytes)
                .ok_or(ExecutionError::Capacity)?,
        )?;
        Ok(())
    }
    fn next_binding(
        &mut self,
        journal: &mut crate::execution::CandidateJournal,
    ) -> Result<GeometryBinding, EventError> {
        self.binding.serial = journal.next_provider_serial()?;
        Ok(self.binding)
    }
    fn after_audience(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), EventError> {
        let event = self.event()?;
        let felt = core
            .state
            .installed
            .event_disclosure
            .value()
            .felt_target(event);
        let add = felt
            .and_then(|id| core.state.physical.entities.get(id))
            .filter(|target| {
                event.scope == Some(EventScope::External)
                    && (target.has_memory()
                        || target
                            .actor
                            .as_ref()
                            .is_some_and(|actor| actor.controller == "native"))
                    && target.actively_participates()
                    && !event.audience.contains(&target.id)
            })
            .map(|target| target.id.as_str());
        if let Some(add) = add {
            self.reserve(size_of::<String>() + add.len())?;
            self.begun
                .as_mut()
                .ok_or_else(invalid)?
                .event
                .audience
                .push(add.to_owned());
        }
        let event = self.event()?;
        let target = event
            .target_id
            .as_deref()
            .and_then(|id| core.state.physical.entities.get(id));
        let native = target.filter(|target| {
            target
                .actor
                .as_ref()
                .is_some_and(|actor| actor.controller == "native" && actor.alive)
                && target.actively_participates()
                && !event.audience.contains(&target.id)
                && core
                    .state
                    .installed
                    .occurrence_rules
                    .value()
                    .native_target_events
                    .contains(&event.event_type)
        });
        if let Some(target) = native {
            let binding = self.next_binding(&mut core.journal)?;
            let event = self.event()?;
            if core
                .state
                .installed
                .event_disclosure
                .value()
                .felt_target(event)
                == Some(&target.id)
                || event.event_type
                    == core
                        .state
                        .installed
                        .occurrence_rules
                        .value()
                        .projectile_contact_event
                || event.event_type
                    == core
                        .state
                        .installed
                        .occurrence_rules
                        .value()
                        .projectile_passage_event
            {
                let id = target.id.clone();
                self.reserve(size_of::<String>() + id.len())?;
                self.begun
                    .as_mut()
                    .ok_or_else(invalid)?
                    .event
                    .audience
                    .push(id);
            } else if let Some(source) = event.actor_id.as_deref() {
                self.phase = Phase::NativeTarget(SightBatch::prepare(
                    &core.state.physical,
                    &core.state.installed,
                    &target.id,
                    &[source],
                    binding,
                    budget,
                )?);
                return Ok(());
            }
        }
        self.prepare_speech(core, budget)
    }
    fn prepare_speech(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), EventError> {
        let speech = self.event()?.event_type
            == core.state.installed.occurrence_rules.value().speech_event
            && self.event()?.actor_id.is_some()
            && self.event()?.scope != Some(EventScope::System);
        if speech {
            let binding = self.next_binding(&mut core.journal)?;
            let event = self.event()?;
            self.phase = Phase::Contacts(SpeechContactBatch::prepare(
                &core.state.physical,
                &core.state.installed,
                event.actor_id.as_deref().ok_or_else(invalid)?,
                event.target_id.as_deref(),
                speech_volume(event),
                event.scope.unwrap_or(EventScope::External),
                binding,
                budget,
            )?);
        } else {
            self.prepare_receivers(core, budget)?;
        }
        Ok(())
    }
    fn prepare_receivers(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), EventError> {
        let event = self.event()?;
        let count = event.audience.len();
        let bytes = event
            .audience
            .heap_bytes()
            .ok_or(ExecutionError::Capacity)?;
        self.reserve(
            heap_sum([
                bytes.checked_mul(3).ok_or(ExecutionError::Capacity)?,
                count
                    .checked_mul(
                        size_of::<Receiver>()
                            + size_of::<Awareness>()
                            + size_of::<AwarenessEncoding>()
                            + size_of::<String>(),
                    )
                    .ok_or(ExecutionError::Capacity)?,
            ])
            .ok_or(ExecutionError::Capacity)?,
        )?;
        let event = &self.begun.as_ref().ok_or_else(invalid)?.event;
        let rules = core.state.installed.occurrence_rules.value();
        self.receivers
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        self.acquired
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        self.acquired_encoding
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        for id in &event.audience {
            let Some(observer) = core.state.physical.entities.get(id).filter(|observer| {
                observer.actor.as_ref().is_some_and(|actor| actor.alive)
                    && observer.actively_participates()
            }) else {
                continue;
            };
            let native_contact = event.target_id.as_deref() == Some(id)
                && observer
                    .actor
                    .as_ref()
                    .is_some_and(|actor| actor.controller == "native")
                && event.event_type == rules.projectile_contact_event;
            let modality = self
                .speech
                .get(id)
                .map(|entry| entry.awareness.modality)
                .unwrap_or_else(|| {
                    if core
                        .state
                        .installed
                        .event_disclosure
                        .value()
                        .felt_target(event)
                        == Some(id)
                        || native_contact
                    {
                        ExperienceModality::Felt
                    } else if event.scope == Some(EventScope::Private)
                        && event.actor_id.as_deref() == Some(id)
                        && !data_true(event, "acquisition")
                    {
                        if event.event_type == rules.contact_event {
                            ExperienceModality::Felt
                        } else if event.event_type == rules.encounter_event {
                            ExperienceModality::Observed
                        } else {
                            ExperienceModality::Internal
                        }
                    } else if event.event_type == rules.speech_event {
                        ExperienceModality::Heard
                    } else {
                        ExperienceModality::Observed
                    }
                });
            if modality != ExperienceModality::Internal
                && core
                    .state
                    .installed
                    .capabilities
                    .capability_blocked(Some(observer), "perception")
                    .map_err(ExecutionError::Values)?
            {
                continue;
            }
            self.receivers.push(Receiver {
                actor_id: id.clone(),
                modality,
                native_contact,
            });
        }
        self.begun.as_mut().ok_or_else(invalid)?.event.audience = self
            .receivers
            .iter()
            .map(|receiver| receiver.actor_id.clone())
            .collect();
        let binding = self.next_binding(&mut core.journal)?;
        self.phase = Phase::Visibility(VisibilityBatch::prepare(
            core,
            self.event()?,
            &self.receivers,
            binding,
            budget,
        )?);
        Ok(())
    }
    pub(crate) fn flush_before_snapshot(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(), EventError> {
        if let Some(receiving) = &mut self.receiving {
            receiving.flush_before_snapshot(core, budget)?;
        }
        Ok(())
    }
    fn has_request(&self) -> bool {
        self.speech_cursor
            .as_ref()
            .is_some_and(|cursor| cursor.language_request().is_some())
            || self
                .receiving
                .as_ref()
                .is_some_and(|cursor| cursor.language_request().is_some())
            || matches!(
                self.phase,
                Phase::Audience(_)
                    | Phase::NativeTarget(_)
                    | Phase::Contacts(_)
                    | Phase::Visibility(_)
                    | Phase::Utterance { .. }
                    | Phase::Introduction(_)
            )
    }
    fn request(&self) -> Result<EventStep<'_>, EventError> {
        if let Some(request) = self
            .speech_cursor
            .as_ref()
            .and_then(SpeechReceiverCursor::language_request)
        {
            return Ok(EventStep::Collation(request));
        }
        if let Some(request) = self
            .receiving
            .as_ref()
            .and_then(ReceivingCursor::language_request)
        {
            return Ok(EventStep::Collation(request));
        }
        match &self.phase {
            Phase::Audience(batch) => return Ok(EventStep::Geometry(batch.queries())),
            Phase::NativeTarget(batch) => return Ok(EventStep::Geometry(batch.queries())),
            Phase::Contacts(batch) => return Ok(EventStep::Geometry(batch.queries())),
            Phase::Visibility(batch) => return Ok(EventStep::Geometry(&batch.queries)),
            Phase::Utterance { binding } => {
                return Ok(EventStep::Utterance {
                    binding: *binding,
                    text: event_text(self.event()?, "text").ok_or_else(invalid)?,
                });
            }
            Phase::Introduction(introduction) => {
                return Ok(EventStep::Words(introduction.request()));
            }
            _ => {}
        }
        Err(invalid())
    }
    pub(crate) fn step<'a>(
        &'a mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<EventAnswer>,
        budget: &ByteBudget,
    ) -> Result<EventStep<'a>, EventError> {
        if matches!(self.phase, Phase::Complete) {
            return Err(invalid());
        }
        if answer.is_none() && self.has_request() {
            return self.request();
        }
        if let Some(answer) = answer {
            match answer {
                EventAnswer::Geometry(answer) => {
                    match std::mem::replace(&mut self.phase, Phase::Initial) {
                        Phase::Audience(batch) => {
                            let audience = batch.finish(answer)?;
                            self.reserve(
                                audience.ids().iter().try_fold(
                                    audience
                                        .ids()
                                        .len()
                                        .checked_mul(size_of::<String>())
                                        .ok_or(ExecutionError::Capacity)?,
                                    |sum, id| {
                                        sum.checked_add(id.len()).ok_or(ExecutionError::Capacity)
                                    },
                                )?,
                            )?;
                            self.begun.as_mut().ok_or_else(invalid)?.event.audience =
                                audience.ids().to_vec();
                            self.audience = Some(audience);
                            self.after_audience(core, budget)?;
                        }
                        Phase::NativeTarget(batch) => {
                            let sight = batch.finish(answer)?;
                            if self
                                .event()?
                                .actor_id
                                .as_deref()
                                .is_some_and(|source| sight.seen(source) == Some(true))
                            {
                                let target = self.event()?.target_id.clone().ok_or_else(invalid)?;
                                self.reserve(size_of::<String>() + target.len())?;
                                self.begun
                                    .as_mut()
                                    .ok_or_else(invalid)?
                                    .event
                                    .audience
                                    .push(target);
                            }
                            self.prepare_speech(core, budget)?;
                        }
                        Phase::Contacts(batch) => {
                            let contacts = batch.finish(answer, &core.state.installed)?;
                            let count = contacts.observers().count();
                            self.reserve(
                                count
                                    .checked_mul(
                                        size_of::<PreparedSpeechAwareness>()
                                            + 4 * size_of::<String>(),
                                    )
                                    .and_then(|bytes| {
                                        bytes.checked_add(map_storage::<
                                            String,
                                            PreparedSpeechAwareness,
                                        >(
                                            count.checked_mul(2)?
                                        )?)
                                    })
                                    .and_then(|bytes| {
                                        bytes.checked_add(map_storage::<String, ()>(
                                            count.checked_mul(2)?,
                                        )?)
                                    })
                                    .ok_or(ExecutionError::Capacity)?,
                            )?;
                            self.speech
                                .try_reserve(count)
                                .map_err(|_| ExecutionError::Capacity)?;
                            self.speech_ids
                                .try_reserve(count)
                                .map_err(|_| ExecutionError::Capacity)?;
                            self.contacts = Some(contacts);
                            let binding = self.next_binding(&mut core.journal)?;
                            self.phase = Phase::Utterance { binding };
                        }
                        Phase::Visibility(batch) => {
                            let (visibility, reservation) = batch.finish(answer)?;
                            self.visibility = visibility;
                            self.reservation.merge(reservation)?;
                            self.phase = Phase::Receivers;
                        }
                        _ => return Err(invalid()),
                    }
                }
                EventAnswer::Utterance {
                    binding,
                    words,
                    lowercase,
                } => {
                    let Phase::Utterance { binding: expected } = self.phase else {
                        return Err(invalid());
                    };
                    if binding != expected {
                        return Err(invalid());
                    }
                    self.words = Some(
                        SpeechWords::prepare(
                            event_text(self.event()?, "text").ok_or_else(invalid)?,
                            &words,
                            &lowercase,
                            budget,
                        )
                        .map_err(|_| ExecutionError::Invariant)?,
                    );
                    self.phase = Phase::Speech;
                }
                EventAnswer::Words(answer) => {
                    let Phase::Introduction(introduction) =
                        std::mem::replace(&mut self.phase, Phase::Finalize)
                    else {
                        return Err(invalid());
                    };
                    let heard = introduction.finish(answer)?;
                    crate::worlds::base_knowledge::learn_heard_introductions(
                        core,
                        &heard,
                        &self.acquired,
                        budget,
                    )?;
                }
                EventAnswer::Collation(answer) => {
                    if let Some(cursor) = self.speech_cursor.as_mut() {
                        let event = &self.begun.as_ref().ok_or_else(invalid)?.event;
                        let result = cursor.step(
                            core,
                            self.contacts.as_ref().ok_or_else(invalid)?,
                            event,
                            self.words.as_ref().ok_or_else(invalid)?,
                            Some(answer),
                            budget,
                        )?;
                        match result {
                            SpeechReceiverStep::Language(_) => {}
                            SpeechReceiverStep::Complete(value) => {
                                self.speech_cursor = None;
                                self.store_speech(value)?;
                                self.speech_next += 1;
                            }
                        }
                    } else if let Some(cursor) = self.receiving.as_mut() {
                        let event = &self.begun.as_ref().ok_or_else(invalid)?.event;
                        let result = cursor.step(
                            core,
                            event,
                            self.current_awareness.as_ref().ok_or_else(invalid)?,
                            self.binding,
                            Some(answer),
                            budget,
                        )?;
                        match result {
                            ReceivingStep::Language(_) => {}
                            ReceivingStep::Complete(value) => {
                                self.finish_receiving(core, value, budget)?
                            }
                        }
                    } else {
                        return Err(invalid());
                    }
                }
            }
            return Ok(EventStep::Continue);
        }
        match self.phase {
            Phase::Initial => {
                let speech = self.event()?.event_type
                    == core.state.installed.occurrence_rules.value().speech_event;
                if self
                    .begun
                    .as_ref()
                    .ok_or_else(invalid)?
                    .requires_physical_audience()
                    && !speech
                {
                    let binding = self.next_binding(&mut core.journal)?;
                    let event = self.event()?;
                    let target = data_true(event, "targetMustBeVisible")
                        .then_some(event.target_id.as_deref())
                        .flatten();
                    self.phase = Phase::Audience(EventAudienceBatch::prepare(
                        &core.state.physical,
                        &core.state.installed,
                        event.actor_id.as_deref(),
                        event.scope.unwrap_or(EventScope::External),
                        target,
                        binding,
                        budget,
                    )?);
                } else {
                    if speech
                        && self
                            .begun
                            .as_ref()
                            .ok_or_else(invalid)?
                            .requires_physical_audience()
                    {
                        self.begun
                            .as_mut()
                            .ok_or_else(invalid)?
                            .event
                            .audience
                            .clear();
                    }
                    self.after_audience(core, budget)?;
                }
            }
            Phase::Speech => {
                let contacts = self.contacts.as_ref().ok_or_else(invalid)?;
                if self.speech_next >= contacts.observers().count() {
                    self.prepare_receivers(core, budget)?;
                } else if self.speech_cursor.is_none() {
                    let id = contacts
                        .observers()
                        .nth(self.speech_next)
                        .ok_or_else(invalid)?
                        .actor_id
                        .clone();
                    let binding = self.next_binding(&mut core.journal)?;
                    self.speech_cursor = Some(SpeechReceiverCursor::prepare(
                        core,
                        self.contacts.as_ref().ok_or_else(invalid)?,
                        &id,
                        self.event()?,
                        binding,
                        budget,
                    )?);
                } else {
                    let event = &self.begun.as_ref().ok_or_else(invalid)?.event;
                    let result = self.speech_cursor.as_mut().ok_or_else(invalid)?.step(
                        core,
                        self.contacts.as_ref().ok_or_else(invalid)?,
                        event,
                        self.words.as_ref().ok_or_else(invalid)?,
                        None,
                        budget,
                    )?;
                    if let SpeechReceiverStep::Complete(value) = result {
                        self.speech_cursor = None;
                        self.store_speech(value)?;
                        self.speech_next += 1;
                    }
                }
            }
            Phase::Receivers => {
                if self.receiver_next >= self.receivers.len() {
                    self.phase = Phase::Accounts;
                } else if self.current_awareness.is_none() {
                    let receiver = &self.receivers[self.receiver_next];
                    let value = if let Some((_, _, speech)) =
                        self.speech.shift_remove_full(&receiver.actor_id)
                    {
                        let (value, guard, voice, segments) = speech.into_parts();
                        self.reservation.merge(guard)?;
                        if let Some(guard) = voice {
                            self.reservation.merge(guard)?
                        }
                        if let Some(guard) = segments {
                            self.reservation.merge(guard)?
                        }
                        self.current_encoding = Some(AwarenessEncoding {
                            factory: if let Some(sound) = &value.sound {
                                AwarenessFactory::Sound {
                                    voice_like: sound.kind.is_some(),
                                }
                            } else {
                                AwarenessFactory::Speech
                            },
                            source_receipt_before_observation: false,
                        });
                        Some(value)
                    } else {
                        self.current_encoding = Some(AwarenessEncoding {
                            factory: AwarenessFactory::Event,
                            source_receipt_before_observation: false,
                        });
                        let value = prepare_receiver_awareness(
                            core,
                            self.event()?,
                            receiver,
                            self.visibility.get(self.receiver_next),
                            self.activity.as_ref(),
                            budget,
                        )?;
                        match value {
                            Some(value) => {
                                self.reservation.merge(value.reservation)?;
                                Some(value.awareness)
                            }
                            None => None,
                        }
                    };
                    if let Some(value) = value {
                        self.current_awareness = Some(value);
                        self.receiving = ReceivingCursor::prepare(
                            core,
                            self.event()?,
                            self.current_awareness.as_ref().ok_or_else(invalid)?,
                            None,
                            None,
                            budget,
                        )?;
                        if self.receiving.is_none() {
                            self.push_current_awareness()?;
                        }
                    } else {
                        self.receiver_next += 1;
                    }
                } else {
                    let binding = self.next_binding(&mut core.journal)?;
                    let event = &self.begun.as_ref().ok_or_else(invalid)?.event;
                    let result = self.receiving.as_mut().ok_or_else(invalid)?.step(
                        core,
                        event,
                        self.current_awareness.as_ref().ok_or_else(invalid)?,
                        binding,
                        None,
                        budget,
                    )?;
                    if let ReceivingStep::Complete(value) = result {
                        self.finish_receiving(core, value, budget)?;
                    }
                }
            }
            Phase::Accounts => {
                let event = self.event()?;
                let encoded = crate::encoding::json_record_len(event)
                    .map_err(|_| ExecutionError::Invariant)?;
                core.journal
                    .meters
                    .charge(&[
                        (WorkUnit::Effects, 1),
                        (WorkUnit::OutputBytes, encoded as u64),
                    ])
                    .map_err(ExecutionError::Work)?;
                if let Some(activity) = &self.activity {
                    core.journal
                        .activity
                        .link_event(
                            &mut core.state.activity,
                            activity,
                            &event.id,
                            event.audience.iter().any(|id| id == activity.actor_id()),
                            self.speech_ids.contains(activity.actor_id()),
                        )
                        .map_err(ExecutionError::Activity)?;
                }
                let schema = Arc::clone(&core.state.installed.schema);
                if let EventAccountPlacement::Encounter(batch) = &self.account_placement {
                    core.journal.encounters.enqueue(
                        batch,
                        &core.state.physical,
                        &self.acquired,
                        &self.acquired_encoding,
                    )?;
                } else {
                    for (entry, encoding) in self.acquired.iter().zip(&self.acquired_encoding) {
                        if entry.retention_class
                            == crate::experience::AwarenessRetentionClass::Memory
                            && !core
                                .state
                                .physical
                                .entities
                                .get(&entry.actor_id)
                                .is_some_and(|actor| actor.has_memory())
                        {
                            continue;
                        }
                        let admission = prepare_awareness_admission(
                            core,
                            &entry.actor_id,
                            &[AwarenessInput {
                                awareness: entry,
                                encoding: *encoding,
                            }],
                            None,
                            budget,
                        )?;
                        let placed = acquire_awareness_accounts(core, admission, &schema, budget)?;
                        for entry in placed
                            .entries()
                            .iter()
                            .filter(|entry| entry.speech.is_some())
                        {
                            crate::worlds::retain_selected_recognition_evidence(
                                core, entry, budget,
                            )?;
                        }
                    }
                }
                let binding = self.next_binding(&mut core.journal)?;
                let rules = &core.state.installed;
                let introduction = IntroductionWords::prepare(
                    &mut self.begun.as_mut().ok_or_else(invalid)?.event,
                    &self.acquired,
                    rules.name_rules.value(),
                    &rules.occurrence_rules.value().speech_event,
                    binding,
                    budget,
                )?;
                self.phase = introduction.map_or(Phase::Finalize, Phase::Introduction);
            }
            Phase::Finalize => {
                let event = self.event()?;
                if !event.audience.is_empty()
                    || event.importance.unwrap_or(0.0)
                        >= core.state.installed.social.notable_threshold()
                {
                    core.state.occurrences.append(event, budget)?;
                }
                let acquired = AcquiredOccurrence {
                    event_id: event.id.clone(),
                    order: event.order.ok_or_else(invalid)?,
                    sequence: event.sequence,
                };
                core.acquired_occurrence(&acquired)?;
                crate::native_controller::acquire_event(core, event, &acquired)?;
                let installed = Arc::clone(&core.state.installed);
                for awareness in &self.acquired {
                    if awareness.sound.is_some() {
                        let mut physical = PhysicalMutation {
                            state: &mut core.state.physical,
                            journal: &mut core.journal.physical,
                        };
                        crate::native_controller::acquire_sound(
                            &mut physical,
                            &installed,
                            &mut core.journal.meters,
                            awareness,
                        )?;
                    }
                }
                if event.scope != Some(EventScope::System) {
                    crate::worlds::base_appraisals::appraise_event(core, event, budget)?;
                    if let Some(words) = self.words.as_ref() {
                        crate::worlds::base_promises::record_spoken_promise(
                            core, event, words, budget,
                        )?;
                    }
                    crate::experience::advance_commitments(
                        core,
                        std::slice::from_ref(event),
                        budget,
                    )?;
                }
                let completed = CompletedOccurrence {
                    event_id: event.id.clone(),
                    order: acquired.order(),
                    sequence: event.sequence,
                };
                core.complete_occurrence(&completed)?;
                // Source's automatic 128-entry flush follows recordEvent's
                // entire causal work, including obligation consequences.
                if let EventAccountPlacement::Encounter(batch) = &self.account_placement {
                    if core.journal.encounters.due(batch)? {
                        flush_encounter_batch(core, batch, budget)?;
                    }
                }
                let begun = self.begun.take().ok_or_else(invalid)?;
                self.reservation.merge(begun.reservation)?;
                self.phase = Phase::Complete;
                // The caller may retain this finished cursor independently of
                // its output. Each keeps custody of the allocations it owns.
                let output_bytes = heap_sum([
                    begun.event.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    self.acquired.heap_bytes().ok_or(ExecutionError::Capacity)?,
                    completed.event_id.len(),
                ])
                .ok_or(ExecutionError::Capacity)?;
                let reservation = self.reservation.split_off(output_bytes)?;
                return Ok(EventStep::Complete(CompletedEvent {
                    event: begun.event,
                    completed,
                    awareness: std::mem::take(&mut self.acquired),
                    reservation,
                }));
            }
            _ => return Err(invalid()),
        }
        Ok(EventStep::Continue)
    }
    fn store_speech(&mut self, value: Option<PreparedSpeechAwareness>) -> Result<(), EventError> {
        if let Some(value) = value {
            let id = &value.awareness.actor_id;
            self.reserve(
                id.len()
                    .checked_mul(3)
                    .and_then(|n| n.checked_add(3 * size_of::<String>()))
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let id = value.awareness.actor_id.clone();
            self.begun
                .as_mut()
                .ok_or_else(invalid)?
                .event
                .audience
                .push(id.clone());
            self.speech_ids.insert(id.clone());
            self.speech.insert(id, value);
        }
        Ok(())
    }
    fn push_current_awareness(&mut self) -> Result<(), EventError> {
        self.acquired
            .push(self.current_awareness.take().ok_or_else(invalid)?);
        self.acquired_encoding
            .push(self.current_encoding.take().ok_or_else(invalid)?);
        self.receiving = None;
        self.receiver_next += 1;
        Ok(())
    }
    fn finish_receiving(
        &mut self,
        core: &mut CoreMutation<'_>,
        value: crate::reception::CompletedAwarenessObservation,
        budget: &ByteBudget,
    ) -> Result<(), EventError> {
        self.reservation.merge(value.reservation)?;
        let awareness = self.current_awareness.as_mut().ok_or_else(invalid)?;
        // Source acquisition inserts this property before the caller assigns its
        // observation, even when the initial locator is undefined. A later
        // personal receipt fills that existing position in the immutable body.
        if matches!(&value.receipt, AwarenessReceiptPlacement::Set(_)) {
            self.current_encoding
                .as_mut()
                .ok_or_else(invalid)?
                .source_receipt_before_observation = true;
        }
        if let Some(observation) = value.observation {
            let (observation, reservation) = observation.into_parts();
            awareness.observation = Some(observation);
            self.reservation.merge(reservation)?;
        }
        match value.receipt {
            AwarenessReceiptPlacement::Unchanged => {}
            AwarenessReceiptPlacement::Set(locator) => awareness.source_receipt = locator,
        }
        if awareness.speech.is_some() {
            if let Some(warning) = acquire_ordinary_warning(
                core,
                &self.begun.as_ref().ok_or_else(invalid)?.event,
                awareness,
                budget,
            )? {
                let (warning, reservation) = warning.into_parts();
                self.reservation.merge(reservation)?;
                self.reserve(size_of::<Arc<crate::reception::ObservationContribution>>())?;
                self.current_awareness
                    .as_mut()
                    .ok_or_else(invalid)?
                    .observations = Some(vec![warning]);
            }
        }
        self.push_current_awareness()
    }
}
