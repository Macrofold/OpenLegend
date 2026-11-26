//! Funded facts for the stand-alone scheduler. The original trigger separately
//! owns its exact validity witness and can outlive this preparation.

use super::*;
use crate::host::{
    CapacityError,
    retained_size::{heap_record, heap_sum},
};
use crate::plans::{PlanStatus, StepStatus};
use crate::reception::EventScalar;
use crate::text::JsText;

pub struct NpcScheduleFacts {
    pub actor_id: String,
    pub accepted_cut: u64,
    pub at: f64,
    pub durable_sequence: u64,
    pub first_unserved: Option<u64>,
    pub records: Vec<ScheduleEvidence>,
    pub interruptions: Vec<String>,
    pub goal: JsText,
    pub goals: Vec<ScheduleGoal>,
    pub blocked_plan: Option<ScheduleBlockedPlan>,
    pub actions_blocked: bool,
    pub protection_labels: Vec<String>,
    pub body_inputs: Vec<ScheduleBodyInput>,
    pub concerns: Vec<(String, JsText)>,
    pub knowledge: Vec<String>,
    pub knowledge_revision: u64,
    pub mind_revision: Option<u64>,
    pub discovery_interval: Option<u64>,
    pub stimuli: Vec<ScheduleStimulus>,
    pub events: Vec<ScheduleEvent>,
    pub prepared_result: result::ScheduleResult,
    _storage: ByteReservation,
}

impl NpcScheduleFacts {
    /// Independently admit the caller's short-lived selection vectors,
    /// speech receipt IDs, and resulting proposal derived from this read.
    pub fn reserve_selection(&self, budget: &ByteBudget) -> Result<ByteReservation, CapacityError> {
        let bound = self
            ._storage
            .bytes()
            .checked_mul(2)
            .and_then(|bytes| bytes.checked_add(4096))
            .ok_or(CapacityError)?;
        budget.reserve(bound)
    }
}

pub struct ScheduleEvidence {
    pub kind: PersonalSourceKind,
    pub reflection_cue: bool,
    pub addressed: bool,
    value: EvidenceValue,
}

// Persisted personal records still have an exact encoded body. Read only the
// fields the scheduler uses, directly from the admitted individual record.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvidenceValue {
    id: Option<String>,
    event_id: Option<String>,
    event_type: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::values::deserialize_present_safe_integer"
    )]
    sequence: Option<u64>,
    #[serde(default, deserialize_with = "literal_text")]
    text: Option<JsText>,
    #[serde(default, deserialize_with = "literal_text")]
    summary: Option<JsText>,
}
heap_record!(EvidenceValue {
    id,
    event_id,
    event_type,
    text,
    summary
});
heap_record!(ScheduleEvidence { value });

impl ScheduleEvidence {
    pub fn id(&self) -> &str {
        if self.kind == PersonalSourceKind::Awareness {
            self.value.event_id.as_deref().unwrap_or_default()
        } else {
            self.value.id.as_deref().unwrap_or_default()
        }
    }
    pub fn event(&self) -> &str {
        self.value.event_id.as_deref().unwrap_or_else(|| self.id())
    }
    pub fn summary(&self) -> Option<&JsText> {
        if self.kind == PersonalSourceKind::Memory {
            self.value.summary.as_ref()
        } else {
            self.value.text.as_ref()
        }
    }
    pub fn sequence(&self) -> u64 {
        self.value.sequence.unwrap_or_default()
    }
}

fn literal_text<'de, D: serde::Deserializer<'de>>(de: D) -> Result<Option<JsText>, D::Error> {
    let raw = <&RawValue>::deserialize(de)?;
    if raw.get().starts_with('"') {
        return serde_json::from_str(raw.get())
            .map(Some)
            .map_err(serde::de::Error::custom);
    }
    Ok(None)
}

pub struct ScheduleGoal {
    pub id: String,
    pub revision: u64,
    pub status: String,
}
pub struct ScheduleBlockedPlan {
    pub id: String,
    pub steps: Vec<(String, Option<String>)>,
}
#[derive(Serialize)]
pub struct ScheduleBodyInput {
    key: String,
    value: bool,
}
pub struct ScheduleCondition {
    pub severity: u64,
    pub version: Option<u64>,
}
pub struct ScheduleStimulus {
    pub source_id: String,
    pub states: [String; 4],
    pub since: f64,
}
pub struct ScheduleEvent {
    pub id: String,
    pub kind: String,
    pub actor_id: Option<String>,
    pub condition: Option<ScheduleCondition>,
    pub severity: Option<f64>,
    pub definition_version: Option<f64>,
    pub prepared_appraisal: bool,
}

pub(super) struct Inputs<'a> {
    pub(super) actor_id: &'a str,
    pub(super) accepted_cut: u64,
    pub(super) durable_sequence: u64,
    pub(super) at: f64,
    pub(super) actor: &'a crate::state::ActorState,
    pub(super) unseen: &'a crate::experience::intake::UnseenIntake<'a>,
    pub(super) events: &'a [EventMetadata<'a>],
    pub(super) reflection_events: Option<&'a [String]>,
    pub(super) stimuli: &'a [Stimulus<'a>],
    pub(super) actions_blocked: bool,
    pub(super) protection_labels: &'a [&'a str],
    pub(super) opportunity: Opportunity<'a>,
    pub(super) result: result::PreparedResult<'a>,
    pub(super) has_unpresented_description: bool,
}

/// Funds the selected detached read before copying it. A short parse of the
/// original personal rows reads the same literal text and exact sequence as
/// the old scheduler reader. It never encodes an intermediate intake packet.
pub(super) fn capture(
    input: Inputs<'_>,
    goal: JsText,
    goal_storage: ByteReservation,
    budget: &ByteBudget,
) -> Result<NpcScheduleFacts, ExecutionError> {
    let capacity = || ExecutionError::Capacity;
    let mut storage = budget.reserve(size_of::<NpcScheduleFacts>())?;
    storage.merge(goal_storage)?;
    let mut admit = |bytes: Option<usize>| -> Result<(), ExecutionError> {
        storage.resize(
            storage
                .bytes()
                .checked_add(bytes.ok_or_else(capacity)?)
                .ok_or_else(capacity)?,
        )?;
        Ok(())
    };
    let agency = &input.actor.agency;
    let own_goals = agency.goals.iter().filter(|goal| goal.author != "actor");
    admit(own_goals.clone().try_fold(0usize, |n, goal| {
        heap_sum([
            n,
            size_of::<ScheduleGoal>(),
            goal.id.len(),
            goal.status.len(),
        ])
    }))?;
    let mut goals = Vec::with_capacity(own_goals.clone().count());
    goals.extend(own_goals.map(|goal| ScheduleGoal {
        id: goal.id.clone(),
        revision: goal.revision,
        status: goal.status.clone(),
    }));
    let blocked_plan = if let Some(plan) = agency
        .plan
        .as_ref()
        .filter(|plan| plan.status == PlanStatus::Blocked)
    {
        let steps = plan
            .steps
            .iter()
            .filter(|step| step.status == StepStatus::Blocked);
        admit(steps.clone().try_fold(plan.id.len(), |n, step| {
            heap_sum([
                n,
                size_of::<(String, Option<String>)>(),
                step.id.len(),
                step.outcome
                    .as_ref()
                    .map_or(0, |outcome| outcome.code.len()),
            ])
        }))?;
        let mut blocked = Vec::with_capacity(steps.clone().count());
        blocked.extend(steps.map(|step| {
            (
                step.id.clone(),
                step.outcome.as_ref().map(|outcome| outcome.code.clone()),
            )
        }));
        Some(ScheduleBlockedPlan {
            id: plan.id.clone(),
            steps: blocked,
        })
    } else {
        None
    };
    let records = &input.unseen.records;
    let record_bytes = records
        .len()
        .checked_mul(size_of::<ScheduleEvidence>())
        .ok_or_else(capacity)?;
    admit(Some(record_bytes))?;
    let mut selected = Vec::with_capacity(records.len());
    for record in records {
        // The raw stored value may contain escaped UTF-16 and temporary
        // decoder storage. Hold its bound only through this one decode.
        let scratch = record
            .value
            .get()
            .len()
            .checked_mul(4)
            .ok_or_else(capacity)?;
        let scratch = budget.reserve(scratch)?;
        let value: EvidenceValue =
            serde_json::from_str(record.value.get()).map_err(|_| ExecutionError::Invariant)?;
        admit(value.heap_bytes())?;
        drop(scratch);
        let reflection_cue = input.reflection_events.is_some_and(|kinds| {
            let event_type = value.event_type.as_deref().or_else(|| {
                let event_id = value.event_id.as_deref().or(value.id.as_deref())?;
                input
                    .events
                    .iter()
                    .find(|event| event.id == event_id)
                    .map(|event| event.kind)
            });
            event_type.is_some_and(|event_type| kinds.iter().any(|kind| kind == event_type))
        });
        selected.push(ScheduleEvidence {
            kind: record.kind,
            reflection_cue,
            addressed: record.addressed,
            value,
        });
    }
    let interruptions = input
        .unseen
        .interruptions
        .iter()
        .filter_map(|row| row.event_id);
    admit(
        interruptions
            .clone()
            .try_fold(0usize, |n, id| heap_sum([n, size_of::<String>(), id.len()])),
    )?;
    let mut interrupt_ids = Vec::with_capacity(interruptions.clone().count());
    interrupt_ids.extend(interruptions.map(str::to_owned));
    let opportunity = input.opportunity;
    admit(heap_sum([
        input.actor_id.len(),
        input
            .protection_labels
            .iter()
            .try_fold(0usize, |n, &label| {
                heap_sum([n, size_of::<String>(), label.len()])
            })
            .ok_or_else(capacity)?,
        opportunity
            .body_inputs
            .iter()
            .try_fold(0usize, |n, fact| {
                heap_sum([n, size_of::<ScheduleBodyInput>(), fact.key.len()])
            })
            .ok_or_else(capacity)?,
        opportunity
            .concerns
            .iter()
            .try_fold(0usize, |n, (key, text)| {
                heap_sum([
                    n,
                    size_of::<(String, JsText)>(),
                    key.len(),
                    text.storage_bytes(),
                ])
            })
            .ok_or_else(capacity)?,
        opportunity
            .knowledge
            .iter()
            .try_fold(0usize, |n, fact| {
                heap_sum([n, size_of::<String>(), fact.len()])
            })
            .ok_or_else(capacity)?,
        input
            .stimuli
            .iter()
            .try_fold(0usize, |n, cue| {
                heap_sum([
                    n,
                    size_of::<ScheduleStimulus>(),
                    cue.source_id.len(),
                    cue.states.iter().map(|state| state.len()).sum(),
                ])
            })
            .ok_or_else(capacity)?,
        input
            .events
            .iter()
            .try_fold(0usize, |n, event| {
                heap_sum([
                    n,
                    size_of::<ScheduleEvent>(),
                    event.id.len(),
                    event.kind.len(),
                    event.actor_id.map_or(0, str::len),
                ])
            })
            .ok_or_else(capacity)?,
        input.result.schedule_bytes().ok_or_else(capacity)?,
    ]))?;
    Ok(NpcScheduleFacts {
        actor_id: input.actor_id.to_owned(),
        accepted_cut: input.accepted_cut,
        at: input.at,
        durable_sequence: input.durable_sequence,
        first_unserved: input.unseen.first_unserved,
        records: selected,
        interruptions: interrupt_ids,
        goal,
        goals,
        blocked_plan,
        actions_blocked: input.actions_blocked,
        protection_labels: input
            .protection_labels
            .iter()
            .map(|&label| label.to_owned())
            .collect(),
        body_inputs: opportunity
            .body_inputs
            .iter()
            .map(|fact| ScheduleBodyInput {
                key: fact.key.to_owned(),
                value: fact.value,
            })
            .collect(),
        concerns: opportunity
            .concerns
            .iter()
            .map(|(key, text)| (key.to_string(), (*text).clone()))
            .collect(),
        knowledge: opportunity.knowledge.to_vec(),
        knowledge_revision: opportunity.knowledge_revision,
        mind_revision: opportunity.mind_revision,
        discovery_interval: agency
            .semantic
            .as_ref()
            .filter(|semantic| {
                input.has_unpresented_description
                    && semantic.occupied_purpose.is_none()
                    && semantic.discovery == "available"
            })
            .map(|semantic| semantic.interval),
        stimuli: input
            .stimuli
            .iter()
            .map(|cue| ScheduleStimulus {
                source_id: cue.source_id.to_owned(),
                states: cue.states.map(str::to_owned),
                since: cue.since,
            })
            .collect(),
        events: input
            .events
            .iter()
            .map(|event| ScheduleEvent {
                id: event.id.to_owned(),
                kind: event.kind.to_owned(),
                actor_id: event.actor_id.map(str::to_owned),
                condition: event.data.text("attributeId").map(|key| {
                    let episode = input
                        .actor
                        .conditions
                        .as_ref()
                        .and_then(|episodes| episodes.get(key));
                    ScheduleCondition {
                        severity: episode.map_or(0, |episode| episode.severity),
                        version: episode.map(|episode| episode.version),
                    }
                }),
                severity: event.data.number("severity"),
                definition_version: event.data.number("definitionVersion"),
                prepared_appraisal: event.response_recorded
                    && event.data.text("appraisalPipeline") == Some("prepared-response")
                    && matches!(event.data.get("responseId"), Some(EventScalar::Text(_)))
                    && event.data.number("appraisalInputSequence").is_some()
                    && matches!(
                        event.data.get("appraisalCauseIds"),
                        Some(EventScalar::Text(_))
                    ),
            })
            .collect(),
        prepared_result: input.result.into_schedule(),
        _storage: storage,
    })
}
