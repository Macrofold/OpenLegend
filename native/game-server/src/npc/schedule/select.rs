//! Interpret an original accepted intake read. The record and cue identities
//! used here are still validated by the native owner before model admission.
use super::SchedulingPolicy;
use crate::store::ThoughtRead;
use openlegend_simulation::{
    encoding::{json_record, json_tree_allocation_bound, sha256_hex},
    experience::PersonalSourceKind,
    host::{ByteBudget, ByteReservation, CapacityError},
    reception::EventScalar,
    runtime::{NpcQueueInputs, NpcScheduleCause, RuntimeError},
    text::JsText,
};
use serde::Serialize;
use serde_json::Value;

mod read;
use read::{BodyInput, Evidence, Facts};

pub(super) struct Inspection {
    read: Facts,
    _custody: ByteReservation,
}

pub(super) struct Proposal {
    pub(super) references: Vec<(PersonalSourceKind, String)>,
    pub(super) next_at: f64,
    pub(super) fingerprint: String,
    pub(super) semantic_revision: String,
    pub(super) opportunity: String,
    pub(super) attempt: bool,
    pub(super) skipped: bool,
    pub(super) text: JsText,
    pub(super) evidence: Option<String>,
    pub(super) causes: Vec<usize>,
    pub(super) review_key: Option<String>,
    pub(super) discovery: Option<u64>,
}

type ReadResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

impl Inspection {
    pub(super) fn read(text: &str, budget: &ByteBudget) -> Result<Self, RuntimeError> {
        // The decoded original and digest scratch overlap only for this pass.
        let bytes = json_tree_allocation_bound(text)
            .and_then(|bytes| bytes.checked_mul(3))
            .and_then(|bytes| bytes.checked_add(4096))
            .ok_or(CapacityError)?;
        let custody = budget.reserve(bytes)?;
        let read = serde_json::from_str(text).map_err(RuntimeError::application_refused)?;
        Ok(Self {
            read,
            _custody: custody,
        })
    }

    pub(super) fn matches(&self, queued: &NpcQueueInputs) -> bool {
        self.read.enrolled
            && self.read.eligible
            && self.read.actor_id == queued.actor_id
            && self.read.world_id == queued.world_id
            && self.read.generation == queued.generation
            && self.read.values == queued.values
            && self.read.dependency_token == queued.dependency_token
    }

    pub(super) fn through(&self) -> u64 {
        self.read.accepted_cut
    }
    pub(super) fn at(&self) -> f64 {
        self.read.at
    }
    pub(super) fn sequence(&self) -> u64 {
        self.read.unseen.max_sequence
    }

    pub(super) fn speech_ids(&self) -> Vec<String> {
        self.read
            .unseen
            .records
            .iter()
            .filter(|item| item.event_type() == "speech")
            .map(|item| item.event().to_owned())
            .collect()
    }

    pub(super) fn propose<'a>(
        &self,
        policy: &SchedulingPolicy,
        prior: &ThoughtRead,
        causes: impl ExactSizeIterator<Item = NpcScheduleCause<'a>>,
        discovery_at: f64,
    ) -> ReadResult<Proposal> {
        let facts = &self.read;
        let mut unseen = facts
            .unseen
            .records
            .iter()
            .filter(|item| {
                item.sequence() > prior.cursor.watermark.unwrap_or(0)
                    && self.eligible(policy, prior, item)
            })
            .collect::<Vec<_>>();
        unseen.sort_by_key(|item| std::cmp::Reverse(item.sequence()));
        let urgent = facts
            .unseen
            .interruptions
            .iter()
            .rev()
            .find(|interrupt| unseen.iter().any(|item| item.event() == interrupt.event()));
        let latest_result = self.prepared_result(policy, &unseen);
        if let Some(priority) = unseen.iter().position(|item| {
            urgent
                .as_ref()
                .is_some_and(|other| other.event() == item.event())
                || latest_result.as_deref() == Some(item.event())
        }) {
            let item = unseen.remove(priority);
            unseen.insert(0, item);
        }
        unseen.truncate(8);

        let previous = &prior.cursor;
        let actor = &facts.own.agency;
        let blocked = actor.plan.as_ref().filter(|plan| plan.status == "blocked");
        let mut review = review(facts, policy);
        let blocks = facts.actions_blocked;
        let protection = blocks.then(|| {
            let labels = facts.protection_labels.join(", ");
            if labels.is_empty() {
                "Actions unavailable".to_owned()
            } else {
                labels
            }
        });
        let body = &facts.opportunity;
        let goals_text = JsText::join(
            actor
                .goals
                .iter()
                .filter(|goal| goal.status == "active")
                .map(|goal| &goal.objective),
            "; ",
        );
        let fingerprint = digest(&Meaning {
            native_protection: protection.as_deref(),
            goal: &goals_text,
            techniques: &body.knowledge,
            body_inputs: &body.body_inputs,
            body_policy_pin: &policy.body_policy_pin,
            concerns: &body.concerns,
            mind: body.mind_revision,
            knowledge: body.knowledge_revision,
            policy: policy.policy_revision,
            reviews: review.key.as_deref(),
        })?;
        let semantic_revision = digest(&SemanticRevision {
            goals: actor
                .goals
                .iter()
                .filter(|goal| goal.author != "actor")
                .map(|goal| (goal.id.as_str(), goal.revision, goal.status.as_str()))
                .collect(),
            techniques: body
                .knowledge
                .iter()
                .map(|name| (name.as_str(), ()))
                .collect(),
            blocked: blocked.map(|plan| {
                (
                    plan.id.as_str(),
                    plan.steps
                        .iter()
                        .filter(|step| step.status == "blocked")
                        .map(|step| {
                            (
                                step.id.as_str(),
                                step.outcome.as_ref().map(|outcome| outcome.code.as_str()),
                            )
                        })
                        .collect(),
                )
            }),
            concerns: &body.concerns,
        })?;
        let changed = previous
            .semantic_revision
            .as_ref()
            .is_some_and(|revision| revision != &semantic_revision);
        let new_review = review.key.is_some() && review.key != previous.review_key;
        let causes = causes.collect::<Vec<_>>();
        let discovery = if let Some(semantic) = facts.semantic.as_ref()
            && policy.discovery
            && unseen.is_empty()
            && causes.is_empty()
            && !changed
            && !new_review
            && semantic.occupied_purpose.is_none()
            && semantic.discovery == "available"
            && facts.attention.candidates.values().any(|candidate| {
                candidate.presented_description.as_deref() != Some(&candidate.description_revision)
            }) {
            if self.at() < discovery_at {
                // Only a real optional cue earns a later inspection. Evidence,
                // active work and urgent causes keep the ordinary wake path.
                review.next_at = review.next_at.min(discovery_at);
                None
            } else {
                Some(semantic.interval)
            }
        } else {
            None
        };
        let opportunity = digest(&OpportunityIdentity {
            semantic_revision: &semantic_revision,
            evidence: unseen.iter().map(|item| item.event()).collect(),
            native_causes: &causes,
            review: review.key.as_deref().filter(|_| new_review),
            discovery,
        })?;
        let available = (!unseen.is_empty()
            || !causes.is_empty()
            || changed
            || new_review
            || discovery.is_some())
            && previous.attempted_opportunity.as_deref() != Some(opportunity.as_str());
        let text = if let Some(protection) = protection {
            protection.into()
        } else if let Some(item) = unseen.first() {
            let mut text = JsText::from("Situation change: ");
            if let Some(summary) = item.summary() {
                text.push_text(summary);
            }
            text
        } else if !causes.is_empty() {
            "I notice a newly supported change in nearby physical relations.".into()
        } else if let Some(description) = review.description.filter(|_| new_review) {
            let mut text = JsText::from("I am still aware of ");
            text.push_text(description);
            text.push_str(".");
            text
        } else if discovery.is_some() {
            "I have a free moment to consider my surroundings.".into()
        } else if blocked.is_some() {
            "My chosen work is blocked.".into()
        } else {
            "A personally acquired goal, capability or bodily condition changed.".into()
        };
        Ok(Proposal {
            references: unseen
                .iter()
                .map(|item| (item.kind, item.id().to_owned()))
                .collect(),
            next_at: review.next_at,
            fingerprint,
            semantic_revision,
            evidence: unseen.first().map(|item| item.event().to_owned()),
            causes: (0..causes.len()).collect(),
            attempt: available && !blocks,
            skipped: available
                && blocks
                && previous.skipped_opportunity.as_deref() != Some(opportunity.as_str()),
            review_key: review.key,
            discovery,
            opportunity,
            text,
        })
    }

    fn eligible(&self, policy: &SchedulingPolicy, prior: &ThoughtRead, item: &Evidence) -> bool {
        let facts = &self.read;
        if (item.speaker() == facts.actor_id
            && matches!(item.event_type(), "speech" | "speech-result"))
            || prior.speech.contains(item.event())
        {
            return false;
        }
        let original = facts.events.iter().find(|event| event.id == item.event());
        if let Some(event) = original {
            let data = &event.data;
            if event.kind == "body-condition"
                && let Some(EventScalar::Text(attribute)) = &data.attribute_id
                && let Some(attribute) = attribute.as_unicode()
            {
                let current = facts
                    .conditions
                    .as_ref()
                    .and_then(|conditions| conditions.get(attribute));
                let severity_changed = matches!(&data.severity, Some(EventScalar::Number(severity))
                    if current.map_or(0., |episode| episode.severity as f64) < *severity);
                let version_changed = matches!(&data.definition_version, Some(EventScalar::Number(version))
                    if *version >= 0.
                        && *version < 18_446_744_073_709_551_616.
                        && version.fract() == 0.
                        && current.map(|episode| episode.version) != Some(*version as u64));
                if severity_changed || version_changed {
                    return false;
                }
            }
            if event.actor_id.as_deref() == Some(&facts.actor_id)
                && event.kind == "appraisal-changed"
                && matches!(&data.appraisal_pipeline, Some(EventScalar::Text(pipeline))
                    if pipeline.as_unicode() == Some("prepared-response"))
                && matches!(data.response_id, Some(EventScalar::Text(_)))
                && matches!(data.appraisal_input_sequence, Some(EventScalar::Number(_)))
                && matches!(data.appraisal_cause_ids, Some(EventScalar::Text(_)))
                && event.response_recorded
            {
                return false;
            }
        }
        item.importance() >= 6.
            || policy
                .significant_events
                .contains(original.map_or("", |event| &event.kind))
    }

    fn prepared_result(&self, policy: &SchedulingPolicy, unseen: &[&Evidence]) -> Option<String> {
        let selected = policy.prepared_responses.as_ref()?;
        let read = &self.read.prepared_result;
        let id = read.reference.as_ref()?.id();
        let occurrence = read.occurrence.as_ref();
        if read.forgotten
            || occurrence.is_some_and(|item| item.command_type == "say")
            || !unseen.iter().any(|item| item.event() == id)
        {
            return None;
        }
        let plan = read.plan_reference == read.reference
            && read.plan_purpose.as_ref() == Some(selected)
            && read.internal_memory;
        let completed = occurrence.is_some_and(|item| {
            item.status != "running"
                && !item.revoked
                && !item.forgotten
                && item.purpose.as_ref() == Some(selected)
        });
        (plan || completed).then_some(id)
    }
}

// Serialize directly so exact text can contribute to a fingerprint without a
// Unicode-only intermediate tree. Field order matches the existing digests.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Meaning<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    native_protection: Option<&'a str>,
    goal: &'a JsText,
    techniques: &'a [String],
    body_inputs: &'a [BodyInput],
    body_policy_pin: &'a Option<Value>,
    concerns: &'a [(String, JsText)],
    #[serde(skip_serializing_if = "Option::is_none")]
    mind: Option<u64>,
    knowledge: u64,
    policy: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    reviews: Option<&'a str>,
}

type BlockedPlan<'a> = (&'a str, Vec<(&'a str, Option<&'a str>)>);

#[derive(Serialize)]
struct SemanticRevision<'a> {
    goals: Vec<(&'a str, u64, &'a str)>,
    techniques: Vec<(&'a str, ())>,
    blocked: Option<BlockedPlan<'a>>,
    concerns: &'a [(String, JsText)],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpportunityIdentity<'a> {
    semantic_revision: &'a str,
    evidence: Vec<&'a str>,
    native_causes: &'a [NpcScheduleCause<'a>],
    review: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    discovery: Option<u64>,
}

struct Review<'a> {
    key: Option<String>,
    next_at: f64,
    description: Option<&'a JsText>,
}
fn review<'a>(facts: &'a Facts, policy: &SchedulingPolicy) -> Review<'a> {
    let mut review = Review {
        key: None,
        next_at: f64::INFINITY,
        description: None,
    };
    let Some(interval) = policy
        .stimuli
        .review_seconds
        .filter(|seconds| *seconds > 0.)
    else {
        return review;
    };
    let at = facts.at;
    let mut due = Vec::new();
    for entry in &facts.stimuli {
        let salience = entry
            .states
            .iter()
            .filter_map(|state| policy.stimuli.salience.get(state))
            .copied()
            .fold(0., f64::max);
        if salience == 0. {
            continue;
        }
        let since = entry.since;
        let count = ((at - since).max(0.) / interval).floor();
        review.next_at = review.next_at.min(since + (count + 1.) * interval);
        if count > 0. {
            due.push((
                salience,
                at - since < policy.stimuli.novelty,
                since,
                entry.source_id.as_str(),
                count,
                entry.label.as_ref(),
            ));
        }
    }
    if !due.is_empty() {
        due.sort_by(|a, b| {
            b.0.total_cmp(&a.0)
                .then(b.1.cmp(&a.1))
                .then(a.2.total_cmp(&b.2))
                .then(a.3.cmp(b.3))
        });
        review.description = due[0].5;
        let mut keys = due
            .iter()
            .map(|entry| format!("{}:{}", entry.3, entry.4))
            .collect::<Vec<_>>();
        keys.sort();
        review.key = Some(keys.join("|"));
    }
    review
}

fn digest(value: &impl Serialize) -> ReadResult<String> {
    Ok(sha256_hex(json_record(value)?.as_bytes()))
}
