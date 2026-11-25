//! A watch waits on an acquired fact for the plan's already accepted next
//! step. Ordinary sight provides its coverage and ordinary admission starts
//! the action after the condition is met.
use super::{NativeCommand, PlanMode, PlanStatus, PlanStep, StepStatus};
use crate::execution::{CoreMutation, ExecutionError};
use crate::experience::{ActorPrivacy, KnownPlaceCapsule, personal_fact_alias};
use crate::host::retained_size::{HeapBytes, heap_record, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{
    CurrentBodyReadScope, CurrentNativeFacet, EvidenceFamily, EvidenceSource, ObservationFactKey,
    ObservationOrigin, ObserverLife, SourceRevision, WatchSighting,
};
use crate::received::TemporalValueMeaning;
use crate::simulation::SimulationState;
use crate::worlds::InstalledEvidenceMeaning;
use crate::values::{
    DefinitionPin, deserialize_present_option, deserialize_safe_integer, is_safe_record_id,
};
use serde::{Deserialize, Serialize};
use std::mem::size_of;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WatchRequest {
    pub subject_id: String,
    pub place_id: String,
    pub trigger: WatchTrigger,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub until: Option<f64>,
}

pub(crate) struct TypedPlan {
    pub mode: PlanMode,
    pub watch: Option<Box<(WatchRequest, ByteReservation)>>,
}

#[derive(Debug)]
pub(crate) struct AdmittedWatch {
    pub value: Box<WatchControl>,
    pub(super) _storage: ByteReservation,
}

/// Resolve an NPC's exact familiar place wording within its own known-place
/// selection. A name shared by several places supplies no binding.
pub(crate) fn watch_place_id<'a>(
    state: &'a SimulationState,
    actor: &str,
    label: &crate::text::JsText,
) -> Option<&'a str> {
    let mut matches = state.experience.known_places(actor).ok()?.matching(label);
    let first = matches.next()?;
    matches
        .all(|other| other.place_id == first.place_id)
        .then_some(first.place_id.as_str())
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum WatchTrigger {
    Sighting,
    Presence { initial: WatchInitial },
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WatchInitial {
    ReportCurrent,
    ChangesOnly,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct WatchControl {
    policy: DefinitionPin,
    subject_id: String,
    individual_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    subject_life: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    observer_life: u64,
    place_id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    place_revision: u64,
    place_source: EvidenceSource,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    place_event: Option<String>,
    trigger: WatchTrigger,
    initial_lease: String,
    started_at: f64,
    deadline: f64,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    last_complete: Option<bool>,
    #[serde(
        default,
        deserialize_with = "deserialize_present_option",
        skip_serializing_if = "Option::is_none"
    )]
    matched: Option<WatchMatch>,
}
heap_record!(WatchControl {
    policy,
    subject_id,
    individual_id,
    place_id,
    place_source,
    place_event,
    initial_lease,
    matched
});

#[derive(Clone, Copy)]
pub(super) enum WatchProgress {
    Waiting,
    Ready,
    Expired,
    Withdrawn,
}

enum WatchSample<'a> {
    Unchanged,
    Baseline(bool),
    Match(WatchSighting<'a>),
}

/// A queued action may consume the original sight after the subject is no
/// longer visible. The place and identity have independent privacy evidence.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WatchMatch {
    facts: [ObservationFactKey; 2],
    privacy_ids: Vec<String>,
}
heap_record!(WatchMatch { facts, privacy_ids });

impl WatchMatch {
    fn prepare(
        sighting: WatchSighting<'_>,
        actor: &str,
        life: u64,
        budget: &ByteBudget,
    ) -> Result<(Self, ByteReservation), ExecutionError> {
        // Admit the selected recognition aliases and facet IDs before creating
        // them. Keep the reserved output through the plan journal transfer.
        let meaning = InstalledEvidenceMeaning;
        let sources = meaning
            .recognition_support_allocation_bound(sighting.learning_support)
            .ok_or(ExecutionError::Capacity)?;
        let facets = [sighting.identity, sighting.location];
        let count = sources.items
            .checked_add(sighting.learning_support.len())
            .and_then(|count| count.checked_add(sighting.name_support.len() + 1))
            .and_then(|count| count.checked_add(3 * facets.len()))
            .ok_or(ExecutionError::Capacity)?;
        let supports = sighting.learning_support.iter().chain(sighting.name_support)
            .try_fold(sighting.subject.len(), |sum, key| {
            sum.checked_add(key.len())
        }).ok_or(ExecutionError::Capacity)?;
        let proofs = facets.iter().try_fold(0usize, |sum, facet| {
            let source = &facet.original_source.id;
            let member_len = crate::encoding::json_record_len(&(
                "perception-fact", source, facet.field.original_ordinal
            )).ok()?;
            heap_sum([
                sum, actor.len(), source.len(), facet.field.id.len(),
                original_alias(*facet).map_or(0, str::len), member_len.checked_mul(2)?,
            ])
        }).ok_or(ExecutionError::Capacity)?;
        let mut reservation = budget.reserve(heap_sum([
            sources.bytes().ok_or(ExecutionError::Capacity)?,
            count.checked_mul(size_of::<String>()).ok_or(ExecutionError::Capacity)?,
            supports,
            proofs,
        ]).ok_or(ExecutionError::Capacity)?)?;
        let mut privacy_ids = Vec::with_capacity(count);
        privacy_ids.extend(meaning.recognition_support_source_ids(sighting.learning_support)?);
        privacy_ids.extend(sighting.learning_support.iter().cloned());
        privacy_ids.extend(sighting.name_support.iter().cloned());
        privacy_ids.push(sighting.subject.to_owned());
        for facet in facets {
            privacy_ids.push(personal_fact_alias(&facet.original_source.id, facet.field.original_ordinal)?);
            privacy_ids.push(facet.field.id.clone());
            privacy_ids.extend(original_alias(facet).map(str::to_owned));
        }
        let result = Self {
            facts: facets.map(|source| fact(source, actor, life)),
            privacy_ids,
        };
        reservation.resize(result.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        Ok((result, reservation))
    }

    fn revoked(&self, privacy: &ActorPrivacy) -> bool {
        self.facts.iter().any(|fact| privacy.revoked(&fact.source.id))
            || self.privacy_ids.iter().any(|id| privacy.revoked(id))
    }

    fn valid_saved(&self, actor: &str, life: u64) -> bool {
        self.facts.iter().all(|fact| {
            fact.source.family == EvidenceFamily::NativeExposure
                && fact.source.observer.actor_id == actor
                && fact.source.observer.physical_life == life
                && fact.source.validate().is_ok()
                && personal_fact_alias(&fact.source.id, fact.ordinal)
                    .is_ok_and(|member| self.privacy_ids.contains(&member))
        }) && self.privacy_ids.iter().all(|id| !id.is_empty())
    }
}

fn original_alias(source: CurrentNativeFacet<'_>) -> Option<&str> {
    match &source.original_source.origin {
        ObservationOrigin::Occurrence { event_id, .. } => Some(event_id),
        ObservationOrigin::Exposure { source: Some(source), .. } => Some(&source.id),
        _ => None,
    }
}

fn fact(source: CurrentNativeFacet<'_>, observer: &str, life: u64) -> ObservationFactKey {
    ObservationFactKey {
        source: EvidenceSource {
            family: EvidenceFamily::NativeExposure,
            observer: ObserverLife {
                actor_id: observer.to_owned(),
                physical_life: life,
            },
            id: source.original_source.id.clone(),
            revision: SourceRevision::Number(source.original_source.revision),
        },
        ordinal: source.field.original_ordinal,
    }
}

fn scope<'a>(
    state: &'a SimulationState,
    actor: &str,
) -> Result<Option<CurrentBodyReadScope<'a>>, ExecutionError> {
    Ok(CurrentBodyReadScope::prepare(
        &state.reception,
        &state.physical.entities,
        &state.installed,
        &state.experience,
        &crate::worlds::InstalledEvidenceMeaning,
        actor,
    )?)
}

fn inside(distance: f64, error: f64, radius: f64) -> Option<bool> {
    if distance + error <= radius {
        Some(true)
    } else if distance - error > radius {
        Some(false)
    } else {
        None
    }
}

fn known_place<'a>(
    state: &'a SimulationState,
    actor: &str,
    id: &str,
) -> Option<&'a KnownPlaceCapsule> {
    let history = state.experience.actor(actor);
    state
        .experience
        .known_places(actor)
        .ok()?
        .capsules()
        .find(|place| {
            place.place_id == id
                && history.is_none_or(|history| {
                    !history.privacy.revoked(&place.source.id)
                        && place
                            .source_event_id
                            .as_ref()
                            .is_none_or(|id| !history.privacy.revoked(id))
                        && place
                            .personal_source
                            .as_ref()
                            .is_none_or(|source| !history.privacy.revoked(&source.id))
                })
        })
}

pub(super) fn end_without_match(
    core: &mut CoreMutation<'_>,
    actor: &str,
    index: usize,
    progress: WatchProgress,
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    let installed = core.state.installed.clone();
    let plan_rules = &installed.ordinary_actions.value().plan;
    let rules = plan_rules.watch.as_ref().ok_or(ExecutionError::Invariant)?;
    let note = match progress {
        WatchProgress::Expired => &rules.expired,
        WatchProgress::Withdrawn => &rules.withdrawn,
        _ => return Err(ExecutionError::Invariant),
    };
    let _note = budget.reserve(
        note.message
            .len()
            .checked_mul(8)
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let result = note.outcome(false);
    let evidence = super::memory::append_report(
        core,
        actor,
        result.message.clone(),
        plan_rules.result_importance,
    )?;
    let bytes = result
        .heap_bytes()
        .and_then(|bytes| bytes.checked_add(evidence.heap_bytes()?))
        .ok_or(ExecutionError::Capacity)?;
    let mut physical = core.physical();
    physical.reserve_plan_growth(bytes)?;
    let plan = physical
        .plan_mut(actor)?
        .as_mut()
        .ok_or(ExecutionError::Invariant)?;
    let step = plan.steps.get_mut(index).ok_or(ExecutionError::Invariant)?;
    step.watch = None;
    step.status = StepStatus::Blocked;
    step.outcome = Some(result);
    step.result_evidence = evidence;
    plan.status = PlanStatus::Blocked;
    plan.revision = plan
        .revision
        .checked_add(1)
        .filter(|&n| n <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Invariant)?;
    physical.advance_agency_revision(actor)
}

impl WatchControl {
    /// Resolve only the selected person's current personal sight evidence and
    /// the selected known place. The allocation stays held by the command until
    /// the plan owner has admitted and stored its own copy.
    pub(crate) fn prepare(
        state: &SimulationState,
        actor: &str,
        input: &WatchRequest,
        budget: &ByteBudget,
    ) -> Result<Option<AdmittedWatch>, ExecutionError> {
        let selected = &state.installed.ordinary_actions;
        let now = state.physical.header.sim_time;
        let Some(rules) = selected.value().plan.watch.as_ref() else {
            return Ok(None);
        };
        let deadline = input.until.unwrap_or(now + rules.default_seconds);
        if input.subject_id == actor
            || !is_safe_record_id(&input.subject_id)
            || !is_safe_record_id(&input.place_id)
            || !deadline.is_finite()
            || deadline <= now
            || deadline - now > rules.maximum_seconds
        {
            return Ok(None);
        }
        let Some(place) = state.installed.retained.places_read.get(&input.place_id) else {
            return Ok(None);
        };
        let Some(known) = known_place(state, actor, &input.place_id) else {
            return Ok(None);
        };
        let Some(scope) = scope(state, actor)? else {
            return Ok(None);
        };
        let Some(sighting) = scope.watch_sighting(&input.subject_id, None)? else {
            return Ok(None);
        };
        if !matches!(&known.location, crate::reception::ObservedLocation::Point { point, error_radius }
            if point.position() == place.point.point() && *error_radius == 0.0)
        {
            return Ok(None);
        }
        let observed_inside = inside(
            crate::spatial::distance(sighting.position, place.point.point()),
            sighting.error,
            place.exposure.radius,
        );
        let last_complete = match input.trigger {
            WatchTrigger::Presence {
                initial: WatchInitial::ChangesOnly,
            } => observed_inside,
            _ => None,
        };
        let report_current = input.trigger
            == (WatchTrigger::Presence {
                initial: WatchInitial::ReportCurrent,
            })
            && observed_inside == Some(true);
        let bytes = heap_sum([
            size_of::<Self>(),
            selected
                .pin()
                .heap_bytes()
                .ok_or(ExecutionError::Capacity)?,
            input.subject_id.len(),
            sighting.subject.len(),
            input.place_id.len(),
            known.source.heap_bytes().ok_or(ExecutionError::Capacity)?,
            known.source_event_id.as_ref().map_or(0, String::len),
            sighting.body.field.id.len(),
        ])
        .ok_or(ExecutionError::Capacity)?;
        let mut storage = budget.reserve(bytes)?;
        let matched = if report_current {
            let (matched, custody) = WatchMatch::prepare(sighting, actor, scope.state().life, budget)?;
            storage.merge(custody)?;
            Some(matched)
        } else {
            None
        };
        Ok(Some(AdmittedWatch {
            value: Box::new(Self {
                policy: selected.pin().clone(),
                subject_id: input.subject_id.clone(),
                individual_id: sighting.subject.to_owned(),
                subject_life: sighting.body
                    .grant
                    .subject_physical_life
                    .ok_or(ExecutionError::Invariant)?,
                observer_life: scope.state().life,
                place_id: input.place_id.clone(),
                place_revision: place.revision,
                place_source: known.source.clone(),
                place_event: known.source_event_id.clone(),
                trigger: input.trigger,
                initial_lease: sighting.body.field.id.clone(),
                started_at: now,
                deadline,
                last_complete,
                matched,
            }),
            _storage: storage,
        }))
    }

    pub(crate) fn deadline(&self) -> f64 {
        self.deadline
    }

    /// Read the accepted match at its real consumer. A gap after an observed
    /// match doesn't erase it; a withdrawal or changed owner does.
    pub(super) fn progress(
        &self,
        core: &CoreMutation<'_>,
        actor: &str,
    ) -> Result<WatchProgress, ExecutionError> {
        let state = &*core.state;
        if !self.trusted(state, actor) {
            return Ok(WatchProgress::Withdrawn);
        }
        if let Some(match_fact) = &self.matched {
            return Ok(
                if state
                    .experience
                    .actor(actor)
                    .is_some_and(|history| match_fact.revoked(&history.privacy))
                    || known_place(state, actor, &self.place_id)
                        .is_none_or(|known| known.source != self.place_source)
                {
                    WatchProgress::Withdrawn
                } else {
                    WatchProgress::Ready
                },
            );
        }
        Ok(if state.physical.header.sim_time >= self.deadline {
            WatchProgress::Expired
        } else {
            WatchProgress::Waiting
        })
    }

    fn trusted(&self, state: &SimulationState, actor: &str) -> bool {
        !(state.installed.ordinary_actions.pin() != &self.policy
            || state
                .physical
                .entities
                .get(actor)
                .and_then(|e| e.physical_life())
                != Some(self.observer_life)
            || state.experience.actor(actor).is_some_and(|history| {
                history.privacy.revoked(&self.place_source.id)
                    || self
                        .place_event
                        .as_ref()
                        .is_some_and(|id| history.privacy.revoked(id))
            })
            || state
                .installed
                .retained
                .places_read
                .get(&self.place_id)
                .is_none_or(|place| place.revision != self.place_revision))
    }

    fn sample<'a>(
        &self,
        state: &'a SimulationState,
        actor: &str,
    ) -> Result<WatchSample<'a>, ExecutionError> {
        if self.matched.is_some()
            || state.physical.header.sim_time >= self.deadline
            || !self.trusted(state, actor)
        {
            return Ok(WatchSample::Unchanged);
        }
        let place = state
            .installed
            .retained
            .places_read
            .get(&self.place_id)
            .ok_or(ExecutionError::Invariant)?;
        let Some(scope) = scope(state, actor)? else {
            return Ok(WatchSample::Unchanged);
        };
        let Some(sighting) = scope.watch_sighting(&self.subject_id, Some(&self.individual_id))? else {
            return Ok(WatchSample::Unchanged);
        };
        if sighting.subject != self.individual_id
            || sighting.body.grant.subject_physical_life != Some(self.subject_life)
        {
            return Ok(WatchSample::Unchanged);
        }
        let Some(inside) = inside(
            crate::spatial::distance(sighting.position, place.point.point()),
            sighting.error,
            place.exposure.radius,
        ) else {
            return Ok(WatchSample::Unchanged);
        };
        let start = match self.trigger {
            WatchTrigger::Sighting => inside && sighting.body.field.id != self.initial_lease,
            WatchTrigger::Presence { initial } => match self.last_complete {
                None => inside && initial == WatchInitial::ReportCurrent,
                Some(before) => inside && !before,
            },
        };
        if start {
            return Ok(WatchSample::Match(sighting));
        }
        Ok(
            if matches!(self.trigger, WatchTrigger::Presence { .. })
                && self.last_complete != Some(inside)
            {
                WatchSample::Baseline(inside)
            } else {
                WatchSample::Unchanged
            },
        )
    }

    pub(super) fn valid_saved(
        &self,
        entry: &PlanStep,
        actor: &str,
        state: &SimulationState,
    ) -> bool {
        let selected = &state.installed.ordinary_actions;
        let Some(rules) = selected.value().plan.watch.as_ref() else {
            return false;
        };
        matches!(entry.command, NativeCommand::Move { .. })
            && entry.status == StepStatus::Queued
            && entry.activity_key.is_none()
            && self.policy == *selected.pin()
            && self.subject_id != actor
            && is_safe_record_id(&self.subject_id)
            && is_safe_record_id(&self.individual_id)
            && is_safe_record_id(&self.place_id)
            && state
                .installed
                .retained
                .places_read
                .get(&self.place_id)
                .is_some_and(|place| place.revision == self.place_revision)
            && self.place_source.observer.actor_id == actor
            && self.place_source.validate().is_ok()
            && self.place_event.as_deref().is_none_or(is_safe_record_id)
            && is_safe_record_id(&self.initial_lease)
            && self.started_at.is_finite()
            && self.started_at >= 0.0
            && self.started_at <= state.physical.header.sim_time
            && self.deadline.is_finite()
            && self.deadline > self.started_at
            && self.deadline - self.started_at <= rules.maximum_seconds
            && (!matches!(self.trigger, WatchTrigger::Sighting) || self.last_complete.is_none())
            && self.matched.as_ref().is_none_or(|matched| matched.valid_saved(actor, self.observer_life))
    }
}

/// The existing personal visual completion consumes one applicable gate, if
/// present. There is no scan of other watchers, new sight test or wake queue.
pub(crate) fn receive_watch_sighting(
    core: &mut CoreMutation<'_>,
    actor: &str,
) -> Result<(), ExecutionError> {
    let Some((index, watch)) = core
        .state
        .physical
        .entities
        .get(actor)
        .and_then(|entity| entity.actor.as_ref())
        .and_then(|actor| actor.agency.plan.as_ref())
        .filter(|plan| plan.status == PlanStatus::Active)
        .and_then(|plan| {
            plan.steps
                .iter()
                .enumerate()
                .find(|(_, step)| step.status == StepStatus::Queued)
        })
        .and_then(|(i, step)| step.watch.as_ref().map(|watch| (i, watch)))
    else {
        return Ok(());
    };
    let (baseline, matched, _storage) = match watch.sample(core.state, actor)? {
        WatchSample::Unchanged => return Ok(()),
        WatchSample::Baseline(inside) => (Some(inside), None, None),
        WatchSample::Match(sighting) => {
            let (matched, storage) = WatchMatch::prepare(
                sighting, actor, watch.observer_life, core.journal.byte_budget(),
            )?;
            (None, Some(matched), Some(storage))
        }
    };
    let bytes = matched.heap_bytes().ok_or(ExecutionError::Capacity)?;
    let mut physical = core.physical();
    physical.reserve_plan_growth(bytes)?;
    let watch = physical
        .plan_mut(actor)?
        .as_mut()
        .and_then(|plan| plan.steps.get_mut(index))
        .and_then(|step| step.watch.as_mut())
        .ok_or(ExecutionError::Invariant)?;
    if let Some(inside) = baseline {
        watch.last_complete = Some(inside);
    }
    if let Some(matched) = matched {
        watch.matched = Some(matched);
    }
    Ok(())
}
