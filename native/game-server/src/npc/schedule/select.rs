//! Interpret an original accepted intake read. The record and cue identities
//! used here are still validated by the native owner before model admission.
use super::SchedulingPolicy;
use crate::store::ThoughtRead;
use openlegend_simulation::{
    encoding::{hex_bytes, write_json_record},
    experience::PersonalSourceKind,
    runtime::{NpcScheduleCause, NpcScheduleFacts as Facts, ScheduleBodyInput, ScheduleEvidence},
    text::JsText,
};
use serde::Serialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::io;

pub(super) struct Inspection {
    read: Facts,
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
    pub(super) reflection_cue: Option<usize>,
    pub(super) causes: Vec<usize>,
    pub(super) review_key: Option<String>,
    pub(super) discovery: Option<u64>,
    pub(super) handled_through: u64,
    pub(super) more: bool,
    pub(super) evidence_to_save: Option<u64>,
    pub(super) waiting_for_save: Option<u64>,
    pub(super) capacity_at: Option<u64>,
}

type ReadResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

impl Inspection {
    pub(super) fn new(read: Facts) -> Self {
        Self { read }
    }

    pub(super) fn through(&self) -> u64 {
        self.read.accepted_cut
    }
    pub(super) fn at(&self) -> f64 {
        self.read.at
    }
    pub(super) fn speech_ids(&self) -> Vec<String> {
        self.read
            .records
            .iter()
            .filter(|item| item.addressed)
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
        const LIMIT: usize = 8;
        let mut unseen = Vec::with_capacity(LIMIT);
        let mut handled_through = prior.cursor.watermark.unwrap_or(0);
        let mut first_unserved = facts.first_unserved;
        let mut capacity_at = first_unserved
            .filter(|&sequence| sequence <= facts.durable_sequence && facts.records.is_empty());
        for group in facts
            .records
            .chunk_by(|left, right| left.sequence() == right.sequence())
        {
            let eligible = || group.iter().filter(|item| self.eligible(prior, item));
            if eligible().count() > LIMIT - unseen.len() {
                first_unserved = Some(group[0].sequence());
                if unseen.is_empty() {
                    capacity_at = first_unserved;
                }
                break;
            }
            unseen.extend(eligible());
            handled_through = group[0].sequence();
        }
        let waiting_for_save = first_unserved.filter(|&sequence| sequence > facts.durable_sequence);
        let more = first_unserved.is_some() && capacity_at.is_none();
        let urgent = facts
            .interruptions
            .iter()
            .rev()
            .find(|interrupt| unseen.iter().any(|item| item.event() == interrupt.as_str()));
        let latest_result = self.prepared_result(policy, &unseen);
        // The lead describes the decision's purpose. Its source stays in
        // chronological order alongside the other required evidence.
        let lead = unseen
            .iter()
            .find(|item| {
                urgent
                    .as_ref()
                    .is_some_and(|other| other.as_str() == item.event())
                    || latest_result.as_deref() == Some(item.event())
            })
            .or_else(|| unseen.first())
            .copied();

        let previous = &prior.cursor;
        let blocked = facts.blocked_plan.as_ref();
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
        let fingerprint = digest(&Meaning {
            native_protection: protection.as_deref(),
            goal: &facts.goal,
            techniques: &facts.knowledge,
            body_inputs: &facts.body_inputs,
            body_policy_pin: &policy.body_policy_pin,
            concerns: &facts.concerns,
            mind: facts.mind_revision,
            knowledge: facts.knowledge_revision,
            policy: policy.policy_revision,
            reviews: review.key.as_deref(),
        })?;
        let semantic_revision = digest(&SemanticRevision {
            goals: facts
                .goals
                .iter()
                .map(|goal| (goal.id.as_str(), goal.revision, goal.status.as_str()))
                .collect(),
            techniques: facts
                .knowledge
                .iter()
                .map(|name| (name.as_str(), ()))
                .collect(),
            blocked: blocked.map(|plan| {
                (
                    plan.id.as_str(),
                    plan.steps
                        .iter()
                        .map(|(id, outcome)| (id.as_str(), outcome.as_deref()))
                        .collect(),
                )
            }),
            concerns: &facts.concerns,
        })?;
        let changed = previous
            .semantic_revision
            .as_ref()
            .map_or(blocked.is_some(), |revision| revision != &semantic_revision);
        let new_review = review.key.is_some() && review.key != previous.review_key;
        let causes = causes.collect::<Vec<_>>();
        let discovery = if let Some(interval) = facts.discovery_interval
            && policy.discovery
            && unseen.is_empty()
            && first_unserved.is_none()
            && causes.is_empty()
            && !changed
            && !new_review
        {
            if self.at() < discovery_at {
                // Only a real optional cue earns a later inspection. Evidence,
                // active work and urgent causes keep the ordinary wake path.
                review.next_at = review.next_at.min(discovery_at);
                None
            } else {
                Some(interval)
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
        } else if let Some(item) = lead {
            let mut text = JsText::from("Situation change: ");
            if let Some(summary) = item.summary() {
                text.push_text(summary);
            }
            text
        } else if !causes.is_empty() {
            "I notice a newly supported change in nearby physical relations.".into()
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
            evidence: lead.map(|item| item.event().to_owned()),
            reflection_cue: unseen.iter().position(|item| item.reflection_cue),
            causes: (0..causes.len()).collect(),
            attempt: available && !blocks,
            skipped: available
                && blocks
                && previous.skipped_opportunity.as_deref() != Some(opportunity.as_str()),
            review_key: review.key,
            discovery,
            opportunity,
            text,
            handled_through,
            more,
            evidence_to_save: waiting_for_save.filter(|_| !blocks),
            waiting_for_save,
            capacity_at,
        })
    }

    fn eligible(&self, prior: &ThoughtRead, item: &ScheduleEvidence) -> bool {
        let facts = &self.read;
        if item.addressed && prior.speech.contains(item.event()) {
            return false;
        }
        let original = facts.events.iter().find(|event| event.id == item.event());
        if let Some(event) = original {
            if event.kind == "body-condition"
                && let Some(current) = &event.condition
            {
                let severity_changed = event.severity.is_some_and(|severity|
                    (current.severity as f64) < severity);
                let version_changed = event.definition_version.is_some_and(|version|
                    (0. ..18_446_744_073_709_551_616.).contains(&version)
                        && version.fract() == 0.
                        && current.version != Some(version as u64));
                if severity_changed || version_changed {
                    return false;
                }
            }
            if event.actor_id.as_deref() == Some(&facts.actor_id)
                && event.kind == "appraisal-changed"
                && event.prepared_appraisal
            {
                return false;
            }
        }
        true
    }

    fn prepared_result(&self, policy: &SchedulingPolicy, unseen: &[&ScheduleEvidence]) -> Option<String> {
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
            !item.running
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
    body_inputs: &'a [ScheduleBodyInput],
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

struct Review {
    key: Option<String>,
    next_at: f64,
}
fn review(facts: &Facts, policy: &SchedulingPolicy) -> Review {
    let mut review = Review {
        key: None,
        next_at: f64::INFINITY,
    };
    let Some(interval) = policy
        .stimuli
        .review_seconds
        .filter(|seconds| *seconds > 0.)
    else {
        return review;
    };
    let at = facts.at;
    let mut keys = Vec::new();
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
            keys.push(format!("{}:{}", entry.source_id, count));
        }
    }
    if !keys.is_empty() {
        keys.sort();
        review.key = Some(keys.join("|"));
    }
    review
}

fn digest(value: &impl Serialize) -> ReadResult<String> {
    struct HashWriter(Sha256);
    impl io::Write for HashWriter {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            self.0.update(bytes);
            Ok(bytes.len())
        }

        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }
    // The stored identity still hashes the same canonical bytes, while the
    // scheduler no longer retains a temporary copy of the serialized input.
    let mut hash = HashWriter(Sha256::new());
    write_json_record(value, &mut hash)?;
    Ok(hex_bytes(&hash.0.finalize()))
}
