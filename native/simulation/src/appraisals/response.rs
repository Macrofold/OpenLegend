//! A supplied interpretation is a proposal over this actor's exact permitted
//! sources. The outer response owns its checkpoint and the sole event pump.
use super::*;
use crate::commands::Outcome;
use crate::events::CompletedOccurrence;
use crate::execution::StagedOccurrence;
use crate::records::SqlCell;
use crate::values::{deserialize_present_option, is_safe_record_id};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AppraisalPublication {
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub response_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub pipeline: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer"
    )]
    pub input_sequence: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub cause_ids: Option<Vec<String>>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AppraisalBindings {
    pub sources: Vec<PerceivedCause>,
    pub subjects: Vec<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub reflection: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub decision: Option<bool>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub complete_creates: Option<Vec<String>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub prior_outcomes: Option<IndexMap<String, Appraisal>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    pub publication: Option<AppraisalPublication>,
}
/// A scoped negative lookup allows exactly this identity in a partial owner;
/// it grants neither a different insertion nor spending/event publication.
pub(super) struct CheckedCreation {
    actor: String,
    id: String,
}
impl CheckedCreation {
    pub(super) fn matches(&self, actor: &str, id: &str) -> bool {
        self.actor == actor && self.id == id
    }
}
#[derive(Clone, Copy)]
enum EditKind {
    Create,
    Reframe,
    Resolve,
    Other,
}
enum Target {
    Null,
    Id(String),
    Invalid,
}
struct Input {
    kind: EditKind,
    id: Option<String>,
    revision: Option<f64>,
    pin: Option<DefinitionPin>,
    target: Target,
    source: Option<PerceivedCause>,
    value: Option<AppraisalValue>,
    binding_allowed: bool,
    target_allowed: bool,
    reflection: bool,
    decision: bool,
    prior: Option<Appraisal>,
    complete_creation: bool,
    publication: Option<AppraisalPublication>,
}
pub(crate) struct AppraisalChangeCursor {
    actor: String,
    operation_id: String,
    canonical: Option<String>,
    input: Option<Input>,
    outcome: Option<Outcome>,
    expected: Option<(String, u64, u64)>,
    done: bool,
    reservation: Option<ByteReservation>,
}
pub(crate) enum AppraisalChangeStep {
    Occurrence(StagedOccurrence),
    Complete(CompletedAppraisalChange),
}
pub(crate) struct CompletedAppraisalChange {
    outcome: Outcome,
    reservation: ByteReservation,
}
impl CompletedAppraisalChange {
    pub(crate) fn into_parts(self) -> (Outcome, ByteReservation) {
        (self.outcome, self.reservation)
    }
}
fn result(ok: bool, code: &str, message: &str) -> Outcome {
    Outcome {
        ok,
        code: code.to_owned(),
        message: message.into(),
        spent: None,
        outputs: None,
        recipe_id: None,
        item_id: None,
        entity_id: None,
        goal_id: None,
        plan_id: None,
        action_id: None,
    }
}
fn decode<T: for<'de> Deserialize<'de>>(value: Option<&SqlCell>) -> Option<T> {
    let encoded = json_record(value?).ok()?;
    serde_json::from_str(&encoded).ok()
}
fn valid_source(value: &PerceivedCause) -> bool {
    matches!(value.kind.as_str(), "remembered" | "perceived-event")
        && matches!(
            value.source_kind.as_str(),
            "event" | "awareness" | "memory" | "summary"
        )
        && is_safe_record_id(&value.actor_id)
        && is_safe_record_id(&value.source_id)
        && is_safe_record_id(&value.occurrence_id)
        && !value.source_version.is_empty()
        && value.source_version.encode_utf16().count() <= 128
        && value.coverage.encode_utf16().count() <= 200
        && value.subject_ids.len() <= 48
        && value.subject_ids.iter().all(|id| is_safe_record_id(id))
        && value
            .recall_episode_id
            .as_ref()
            .is_none_or(|id| is_safe_record_id(id))
}
fn source_current(core: &CoreMutation<'_>, actor: &str, source: &PerceivedCause) -> bool {
    valid_source(source)
        && source.actor_id == actor
        && core.state.experience.actor(actor).is_none_or(|history| {
            !history.privacy.revoked(&source.source_id)
                && !history.privacy.revoked(&source.occurrence_id)
        })
}
fn valid_value(definition: &Definition, value: &AppraisalValue) -> bool {
    match (&definition.value, value) {
        (ValueLaw::Qualitative, AppraisalValue::Qualitative) => true,
        (ValueLaw::Scaled { min, max }, AppraisalValue::Scaled { value }) => {
            value.is_finite() && value >= min && value <= max
        }
        _ => false,
    }
}
fn identity(
    actor: &str,
    pin: &DefinitionPin,
    target: Option<&str>,
    episode: &str,
    stacking: &str,
) -> Result<(String, String), ExecutionError> {
    let stack = canonical_shape(&(
        actor,
        pin,
        target,
        if stacking == "target" {
            None
        } else {
            Some(episode)
        },
    ))?;
    let id = format!(
        "appraisal-{}-{}",
        content_label(&stack),
        content_label(episode)
    );
    Ok((stack, id))
}
impl AppraisalChangeCursor {
    /// The canonical supplement comes from the response's same finite ICU
    /// provider product; it cannot authorize a different raw interpretation.
    pub(crate) fn new(
        core: &CoreMutation<'_>,
        actor: &str,
        raw: &SqlCell,
        canonical_change: String,
        operation_id: &str,
        bindings: &AppraisalBindings,
        budget: &ByteBudget,
    ) -> Result<Self, ExecutionError> {
        let bound = raw
            .heap_bytes()
            .and_then(|n| n.checked_mul(4))
            .and_then(|n| n.checked_add(canonical_change.capacity().checked_mul(4)?))
            .and_then(|n| {
                n.checked_add(actor.len() + operation_id.len() + size_of::<Self>() + 8192 * 4)
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bound)?;
        let canonical: SqlCell =
            serde_json::from_str(&canonical_change).map_err(|_| ExecutionError::Invariant)?;
        if &canonical != raw {
            return Err(ExecutionError::Invariant);
        }
        drop(canonical);
        let kind = match raw.get("kind").and_then(SqlCell::as_str) {
            Some("create") => EditKind::Create,
            Some("reframe") => EditKind::Reframe,
            Some("resolve") => EditKind::Resolve,
            _ => EditKind::Other,
        };
        let pin: Option<DefinitionPin> = decode(raw.get("definitionPin"));
        let source: Option<PerceivedCause> = decode(raw.get("source"));
        let value = decode(raw.get("value"));
        let target = match raw.get("targetId") {
            Some(SqlCell::Null) => Target::Null,
            Some(value) => value
                .as_str()
                .map_or(Target::Invalid, |id| Target::Id(id.to_owned())),
            None => Target::Invalid,
        };
        let binding_allowed = source.as_ref().is_some_and(|source| {
            valid_source(source) && bindings.sources.iter().any(|allowed| allowed == source)
        });
        let target_allowed = match &target {
            Target::Null => true,
            Target::Id(id) => {
                bindings.subjects.contains(id)
                    && source.as_ref().is_some_and(|s| s.subject_ids.contains(id))
            }
            Target::Invalid => false,
        };
        let mut prior = None;
        let mut complete_creation = false;
        if let (Some(pin), Some(source)) = (&pin, &source) {
            let target = match &target {
                Target::Null => Some(None),
                Target::Id(id) => Some(Some(id.as_str())),
                Target::Invalid => None,
            };
            if let (Some(definition), Some(target)) = (
                core.state
                    .appraisals
                    .definitions
                    .get(&pin.id)
                    .filter(|d| d.pin == *pin),
                target,
            ) {
                let (_, id) = identity(
                    actor,
                    pin,
                    target,
                    &source.occurrence_id,
                    &definition.value.stacking,
                )?;
                prior = bindings
                    .prior_outcomes
                    .as_ref()
                    .and_then(|p| p.get(&id))
                    .cloned();
                complete_creation = bindings
                    .complete_creates
                    .as_ref()
                    .is_some_and(|ids| ids.contains(&id));
            }
        }
        Ok(Self {
            actor: actor.to_owned(),
            operation_id: operation_id.to_owned(),
            canonical: Some(canonical_change),
            input: Some(Input {
                kind,
                id: raw.get("id").and_then(SqlCell::as_str).map(str::to_owned),
                revision: raw.get("expectedRevision").and_then(SqlCell::as_f64),
                pin,
                target,
                source,
                value,
                binding_allowed,
                target_allowed,
                reflection: bindings.reflection == Some(true),
                decision: bindings.decision == Some(true),
                prior,
                complete_creation,
                publication: bindings.publication.clone(),
            }),
            outcome: None,
            expected: None,
            done: false,
            reservation: Some(reservation),
        })
    }
    pub(crate) fn step(
        &mut self,
        core: &mut CoreMutation<'_>,
        answer: Option<CompletedOccurrence>,
        budget: &ByteBudget,
    ) -> Result<AppraisalChangeStep, ExecutionError> {
        if self.done {
            return Err(ExecutionError::UnfinishedOccurrence);
        }
        if let Some(expected) = self.expected.as_ref() {
            let completed = answer.ok_or(ExecutionError::UnfinishedOccurrence)?;
            if completed.event_id() != expected.0
                || completed.order() != expected.1
                || completed.sequence() != expected.2
            {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            self.expected = None;
        } else {
            if answer.is_some() {
                return Err(ExecutionError::UnfinishedOccurrence);
            }
            if self.outcome.is_none() {
                let (outcome, event) = self.apply(core, budget)?;
                self.outcome = Some(outcome);
                if let Some(event) = event {
                    self.expected = Some((event.id.clone(), event.order, event.sequence));
                    return Ok(AppraisalChangeStep::Occurrence(event));
                }
            }
        }
        let outcome = self.outcome.take().ok_or(ExecutionError::Invariant)?;
        // Input/provenance preparations are gone before their allowance moves
        // with the actual output into the response/receipt owner.
        self.input = None;
        self.canonical = None;
        self.actor.clear();
        self.actor.shrink_to_fit();
        self.operation_id.clear();
        self.operation_id.shrink_to_fit();
        let mut reservation = self.reservation.take().ok_or(ExecutionError::Invariant)?;
        reservation.resize(outcome.heap_bytes().ok_or(ExecutionError::Capacity)?)?;
        self.done = true;
        Ok(AppraisalChangeStep::Complete(CompletedAppraisalChange {
            outcome,
            reservation,
        }))
    }
    fn apply(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(Outcome, Option<StagedOccurrence>), ExecutionError> {
        let input = self.input.as_ref().ok_or(ExecutionError::Invariant)?;
        if !core
            .state
            .physical
            .entities
            .get(&self.actor)
            .is_some_and(|e| e.has_memory())
            || !is_safe_record_id(&self.operation_id)
        {
            return Ok((
                result(
                    false,
                    "appraisal-rejected",
                    "Invalid appraisal owner or operation.",
                ),
                None,
            ));
        }
        if matches!(input.kind, EditKind::Create) {
            return self.create(core, budget);
        }
        let record = input.id.as_ref().and_then(|id| {
            core.state
                .appraisals
                .owners
                .get(&self.actor)?
                .records
                .get(id)
        });
        let body = self.canonical.as_ref().ok_or(ExecutionError::Invariant)?;
        if let Some(record) = record.filter(|r| r.value.last_operation.id == self.operation_id) {
            return Ok((
                if record.value.last_operation.body == *body {
                    result(true, "duplicate", "Appraisal operation already recorded.")
                } else {
                    result(
                        false,
                        "appraisal-conflict",
                        "An operation ID cannot have a different body.",
                    )
                },
                None,
            ));
        }
        let definition = record
            .and_then(|r| {
                core.state
                    .appraisals
                    .definitions
                    .get(&r.value.definition_pin.id)
                    .filter(|d| d.pin == r.value.definition_pin)
            })
            .cloned();
        let Some((record, definition)) = record.zip(definition).filter(|(r, d)| {
            input.revision == Some(r.value.revision as f64)
                && r.value.state == "active"
                && (!input.reflection || d.value.reflection)
                && (!input.decision || d.value.decision)
        }) else {
            return Ok((
                result(
                    false,
                    "stale-appraisal",
                    "The appraisal changed or is unavailable.",
                ),
                None,
            ));
        };
        let reservation = record_preparation(record, budget, body.len())?;
        let mut value = record.value.clone();
        match input.kind {
            EditKind::Reframe => {
                let valid = input.binding_allowed
                    && input.source.as_ref().is_some_and(|s| {
                        source_current(core, &self.actor, s)
                            && definition.value.causes.contains(&s.kind)
                            && value
                                .target_id
                                .as_ref()
                                .is_none_or(|target| s.subject_ids.contains(target))
                    })
                    && input.value.as_ref().is_some_and(|v| {
                        valid_value(&definition.value, v)
                            && (!matches!(value.lifetime, AppraisalLifetime::Decays { .. })
                                || same_value(v, &value.value))
                    });
                if !valid {
                    return Ok((
                        result(
                            false,
                            "appraisal-rejected",
                            "The new interpretation has no permitted current source.",
                        ),
                        None,
                    ));
                }
                value.interpretation_source = input.source.clone();
                value.value = input.value.clone().ok_or(ExecutionError::Invariant)?;
                value.last_operation = AppraisalOperation {
                    id: self.operation_id.clone(),
                    body: body.clone(),
                };
                if record_units(&value)? > 8192 {
                    return Ok((
                        result(
                            false,
                            "appraisal-unavailable",
                            "The interpretation exceeds its admitted retained capacity.",
                        ),
                        None,
                    ));
                }
                value.revision = safe_revision(value.revision)?;
                value.changed_at = core.state.physical.header.sim_time;
            }
            EditKind::Resolve => {
                value.state = "resolved".to_owned();
                value.revision = safe_revision(value.revision)?;
                value.changed_at = core.state.physical.header.sim_time;
                value.next_at = None;
                core.physical().release_work(&value.id)?;
                value.last_operation = AppraisalOperation {
                    id: self.operation_id.clone(),
                    body: body.clone(),
                };
            }
            _ => {
                return Ok((
                    result(
                        false,
                        "appraisal-rejected",
                        "Unsupported appraisal operation.",
                    ),
                    None,
                ));
            }
        }
        let id = value.id.clone();
        put(core, value, reservation, budget, None)?;
        if matches!(input.kind, EditKind::Resolve) {
            core.journal.cognition.note_appraisal_change(&self.actor)?;
        }
        core.journal.cognition.note_appraisal_change(&self.actor)?;
        let changed = Arc::clone(
            core.state
                .appraisals
                .owners
                .get(&self.actor)
                .and_then(|o| o.records.get(&id))
                .ok_or(ExecutionError::Invariant)?,
        );
        let event = private_change(
            core,
            &changed.value,
            &definition.value,
            input.publication.as_ref(),
            budget,
        )?;
        Ok((
            result(true, "appraisal-changed", "Appraisal updated."),
            Some(event),
        ))
    }
    fn create(
        &mut self,
        core: &mut CoreMutation<'_>,
        budget: &ByteBudget,
    ) -> Result<(Outcome, Option<StagedOccurrence>), ExecutionError> {
        let input = self.input.as_ref().ok_or(ExecutionError::Invariant)?;
        let definition = input
            .pin
            .as_ref()
            .and_then(|pin| {
                core.state
                    .appraisals
                    .definitions
                    .get(&pin.id)
                    .filter(|d| d.pin == *pin)
            })
            .cloned();
        let Some(definition) = definition.filter(|d| {
            (!input.reflection || d.value.reflection)
                && (!input.decision || d.value.decision)
                && input.binding_allowed
                && input.target_allowed
                && input
                    .source
                    .as_ref()
                    .is_some_and(|s| source_current(core, &self.actor, s))
        }) else {
            return Ok((
                result(
                    false,
                    "appraisal-rejected",
                    "The definition, source or subject is unavailable.",
                ),
                None,
            ));
        };
        let source = input.source.as_ref().ok_or(ExecutionError::Invariant)?;
        let valid=core.state.physical.entities.get(&self.actor).and_then(|e|e.actor.as_ref()).is_some_and(|a|a.alive)
            &&input.value.as_ref().is_some_and(|v|valid_value(&definition.value,v)
                &&!matches!((&definition.value.lifetime,&definition.value.value,v),
                    (LifetimeLaw::Decays{..},ValueLaw::Scaled{min,..},AppraisalValue::Scaled{value})if value<=min))
            &&definition.value.causes.contains(&source.kind);
        if !valid {
            return Ok((
                result(
                    false,
                    "appraisal-rejected",
                    "The appraisal is not applicable.",
                ),
                None,
            ));
        }
        let target = match &input.target {
            Target::Null => None,
            Target::Id(id) => Some(id.as_str()),
            Target::Invalid => return Err(ExecutionError::Invariant),
        };
        let (stack_key, id) = identity(
            &self.actor,
            &definition.pin,
            target,
            &source.occurrence_id,
            &definition.value.stacking,
        )?;
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Body<'a> {
            definition: &'a DefinitionPin,
            cause: &'a PerceivedCause,
            target_id: Option<&'a str>,
            value: &'a AppraisalValue,
        }
        let value = input.value.as_ref().ok_or(ExecutionError::Invariant)?;
        let body = canonical_shape(&Body {
            definition: &definition.pin,
            cause: source,
            target_id: target,
            value,
        })?;
        let owner = core.state.appraisals.owners.get(&self.actor);
        let prior = owner
            .and_then(|o| o.records.get(&id))
            .map(|r| &r.value)
            .or(input.prior.as_ref());
        if prior.is_none()
            && owner.is_some_and(|o| !o.coverage.complete)
            && !input.complete_creation
        {
            return Ok((
                result(
                    false,
                    "appraisal-unavailable",
                    "The prior cause outcome must be checked before creating an appraisal.",
                ),
                None,
            ));
        }
        if let Some(prior) = prior {
            let duplicate = prior.state != "invalidated"
                && prior.stack_key == stack_key
                && prior
                    .cause
                    .as_ref()
                    .is_some_and(|c| c.occurrence_id == source.occurrence_id)
                && (prior.state == "active" || prior.creation_operation.id == self.operation_id)
                && (prior.creation_operation.id != self.operation_id
                    || prior.creation_operation.body == body);
            return Ok((
                if duplicate {
                    result(
                        true,
                        "duplicate",
                        "This cause already has an appraisal outcome.",
                    )
                } else {
                    result(
                        false,
                        "appraisal-conflict",
                        "The appraisal identity or cause was already used.",
                    )
                },
                None,
            ));
        }
        let now = core.state.physical.header.sim_time;
        let lifetime = match definition.value.lifetime {
            LifetimeLaw::Persistent => AppraisalLifetime::Persistent,
            LifetimeLaw::Expires { seconds } => AppraisalLifetime::Expires { at: now + seconds },
            LifetimeLaw::Decays { .. } => AppraisalLifetime::Decays {
                anchor_time: now,
                anchor_value: match value {
                    AppraisalValue::Scaled { value } => *value,
                    _ => return Err(ExecutionError::Invariant),
                },
            },
            LifetimeLaw::ConditionSustained => return Err(ExecutionError::UnsupportedFamily),
        };
        let mut record = Appraisal {
            id: id.clone(),
            actor_id: self.actor.clone(),
            revision: 1,
            definition_pin: definition.pin.clone(),
            target_id: target.map(str::to_owned),
            stack_key,
            state: "active".to_owned(),
            cause: Some(source.clone()),
            interpretation_source: None,
            value: value.clone(),
            lifetime,
            created_at: now,
            changed_at: now,
            last_operation: AppraisalOperation {
                id: self.operation_id.clone(),
                body: body.clone(),
            },
            creation_operation: AppraisalOperation {
                id: self.operation_id.clone(),
                body,
            },
            predecessor_id: None,
            next_at: None,
        };
        record.next_at = next_deadline(&record, &definition.value, now);
        if record_units(&record)? > 8192 {
            return Ok((
                result(
                    false,
                    "appraisal-unavailable",
                    "The permitted appraisal source exceeds its retained capacity.",
                ),
                None,
            ));
        }
        let reservation =
            budget.reserve(8192 * 4 + size_of::<AppraisalRecord>() + 2 * size_of::<usize>())?;
        match reserve_record(core, &record) {
            Ok(()) => {}
            Err(ExecutionError::Work(crate::work::WorkError::Unavailable(unit))) => {
                return Ok((
                    result(
                        false,
                        "appraisal-unavailable",
                        &format!("Native work capacity is unavailable ({}).", unit.name()),
                    ),
                    None,
                ));
            }
            Err(ExecutionError::Work(crate::work::WorkError::Contract(unit))) => {
                return Ok((
                    result(
                        false,
                        "appraisal-unavailable",
                        &format!(
                            "Native work exceeded its admitted {} envelope.",
                            unit.name()
                        ),
                    ),
                    None,
                ));
            }
            Err(error) => return Err(error),
        }
        if definition.value.stacking == "target" {
            let prefix = AppraisalIndex::scope_key(&definition.pin, target)?;
            let owner = core.state.appraisals.owners.get(&self.actor);
            let count = owner.map_or(0, |o| o.index.scoped(&prefix).count());
            let _selected = budget.reserve(
                count
                    .checked_mul(size_of::<Arc<AppraisalRecord>>())
                    .ok_or(ExecutionError::Capacity)?,
            )?;
            let mut previous = Vec::new();
            previous
                .try_reserve_exact(count)
                .map_err(|_| ExecutionError::Capacity)?;
            if let Some(owner) = owner {
                for id in owner.index.scoped(&prefix) {
                    previous.push(Arc::clone(
                        owner.records.get(id).ok_or(ExecutionError::Invariant)?,
                    ));
                }
            }
            for prior in previous {
                let guard = record_preparation(&prior, budget, 0)?;
                let mut old = prior.value.clone();
                old.state = "resolved".to_owned();
                old.revision = safe_revision(old.revision)?;
                old.changed_at = now;
                old.next_at = None;
                core.physical().release_work(&old.id)?;
                put(core, old, guard, budget, None)?;
                core.journal.cognition.note_appraisal_change(&self.actor)?;
            }
        }
        let checked = CheckedCreation {
            actor: self.actor.clone(),
            id: record.id.clone(),
        };
        put(core, record, reservation, budget, Some(&checked))?;
        core.journal.cognition.note_appraisal_change(&self.actor)?;
        let changed = Arc::clone(
            core.state
                .appraisals
                .owners
                .get(&self.actor)
                .and_then(|o| o.records.get(&checked.id))
                .ok_or(ExecutionError::Invariant)?,
        );
        let event = private_change(
            core,
            &changed.value,
            &definition.value,
            input.publication.as_ref(),
            budget,
        )?;
        Ok((
            result(true, "appraisal-created", "Appraisal recorded."),
            Some(event),
        ))
    }
}
fn safe_revision(value: u64) -> Result<u64, ExecutionError> {
    value
        .checked_add(1)
        .filter(|v| *v <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(ExecutionError::Identity)
}
fn same_value(a: &AppraisalValue, b: &AppraisalValue) -> bool {
    match (a, b) {
        (AppraisalValue::Qualitative, AppraisalValue::Qualitative) => true,
        (AppraisalValue::Scaled { value: a }, AppraisalValue::Scaled { value: b }) => a == b,
        _ => false,
    }
}
fn record_units(value: &Appraisal) -> Result<usize, ExecutionError> {
    json_record(value)
        .map(|v| v.encode_utf16().count() * 3)
        .map_err(|_| ExecutionError::Invariant)
}
fn record_preparation(
    value: &AppraisalRecord,
    budget: &ByteBudget,
    extra: usize,
) -> Result<ByteReservation, ExecutionError> {
    Ok(budget.reserve(
        crate::experience::encoded_body_bound(&value.row.payload)?
            .checked_add(value.row.payload.len())
            .and_then(|n| n.checked_add(extra.checked_mul(3)?))
            .and_then(|n| n.checked_add(8192))
            .ok_or(ExecutionError::Capacity)?,
    )?)
}
fn reserve_record(core: &mut CoreMutation<'_>, record: &Appraisal) -> Result<(), ExecutionError> {
    core.physical().admit_work(crate::work::WorkRequest {
        id: record.id.clone(),
        parent_id: None,
        actor_id: record.actor_id.clone(),
        module_id: record.definition_pin.id.clone(),
        definition_pin: record.definition_pin.clone(),
        limit: WorkVector {
            effects: 32,
            tests: 64,
            depth: 1,
            ..Default::default()
        },
        allocation: WorkVector {
            live: 1,
            retained_bytes: 8192,
            subscriptions: 1,
            ..Default::default()
        },
        recurrence: None,
    })
}
fn private_change(
    core: &mut CoreMutation<'_>,
    record: &Appraisal,
    definition: &Definition,
    publication: Option<&AppraisalPublication>,
    budget: &ByteBudget,
) -> Result<StagedOccurrence, ExecutionError> {
    use crate::{
        events::{AudienceSelection, EmissionText, EventEmissionIntent, EventScope},
        narration::{Narration, NarrationPart, PersonRole},
        reception::EventScalar,
    };
    let _preparation = budget.reserve(8192)?;
    let actor = &record.actor_id;
    let parts = if record.state == "active" {
        vec![
            NarrationPart::Participant {
                entity_id: actor.clone(),
                role: PersonRole::Subject,
                article: None,
            },
            NarrationPart::Literal(" ".into()),
            NarrationPart::Verb {
                subject_id: actor.clone(),
                verb: "feel".to_owned(),
            },
            NarrationPart::Literal(format!(" {}.", definition.label).into()),
        ]
    } else {
        vec![
            NarrationPart::Participant {
                entity_id: actor.clone(),
                role: PersonRole::Possessive,
                article: None,
            },
            NarrationPart::Literal(format!(" {} has ended.", definition.label).into()),
        ]
    };
    let mut data = IndexMap::new();
    data.insert(
        "appraisalId".to_owned(),
        EventScalar::Text(record.id.clone().into()),
    );
    data.insert(
        "revision".to_owned(),
        EventScalar::Number(record.revision as f64),
    );
    data.insert("semanticTrigger".to_owned(), EventScalar::Boolean(true));
    data.insert("importance".to_owned(), EventScalar::Number(5.0));
    data.insert("urgency".to_owned(), EventScalar::Number(0.0));
    if let Some(publication) = publication {
        if let Some(id) = &publication.response_id {
            if !id.is_empty() {
                data.insert(
                    "responseId".to_owned(),
                    EventScalar::Text(id.clone().into()),
                );
            }
        }
        if let Some(pipeline) = &publication.pipeline {
            if !pipeline.is_empty() {
                data.insert(
                    "appraisalPipeline".to_owned(),
                    EventScalar::Text(pipeline.clone().into()),
                );
                let sequence = publication
                    .input_sequence
                    .ok_or(ExecutionError::Invariant)?;
                data.insert(
                    "appraisalInputSequence".to_owned(),
                    EventScalar::Number(sequence as f64),
                );
                data.insert(
                    "appraisalCauseIds".to_owned(),
                    EventScalar::Text(
                        canonical_shape(&publication.cause_ids.as_deref().unwrap_or(&[]))?.into(),
                    ),
                );
            }
        }
    }
    core.stage_event(EventEmissionIntent {
        event_type: "appraisal-changed".to_owned(),
        text: EmissionText::Narration(Narration { parts }),
        audience: AudienceSelection::Explicit(vec![actor.clone()]),
        source_id: Some(actor.clone()),
        target_id: None,
        data: Some(data),
        scope: EventScope::Private,
        origin: None,
        exposure: None,
    })
}
