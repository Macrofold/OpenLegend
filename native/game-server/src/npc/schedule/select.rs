//! Interpret an original accepted intake read. The record and cue identities
//! used here are still validated by the native owner before model admission.
use super::{Inputs, SchedulingPolicy};
use crate::store::ThoughtRead;
use openlegend_simulation::{
    activity::ResultEvidence,
    encoding::{json_record, json_tree_allocation_bound, sha256_hex},
    experience::PersonalSourceKind,
    host::{ByteBudget, ByteReservation, CapacityError},
    runtime::{NpcScheduleCause, RuntimeError},
};
use serde::Deserialize;
use serde_json::{Value, json};

pub(super) struct Inspection {
    input: Inputs,
    read: Value,
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
    pub(super) text: String,
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
        let read: Value = serde_json::from_str(text).map_err(RuntimeError::application_refused)?;
        // The native packet already owns one accepted snapshot. Read its
        // typed queue fields from that tree instead of parsing the text again.
        let input = Inputs::deserialize(&read).map_err(RuntimeError::application_refused)?;
        Ok(Self {
            input,
            read,
            _custody: custody,
        })
    }

    pub(super) fn matches(&self, queued: &Inputs) -> bool {
        self.input.enrolled
            && self.input.eligible
            && self.input.actor_id == queued.actor_id
            && self.input.world_id == queued.world_id
            && self.input.generation == queued.generation
            && self.input.values == queued.values
            && self.input.dependency_token == queued.dependency_token
    }

    pub(super) fn through(&self) -> u64 {
        self.input.accepted_cut
    }
    pub(super) fn at(&self) -> f64 {
        self.input.at
    }
    pub(super) fn sequence(&self) -> u64 {
        self.read["unseen"]["maxSequence"].as_u64().unwrap_or(0)
    }

    pub(super) fn speech_ids(&self) -> Vec<String> {
        self.evidence()
            .filter(|item| item.event_type() == "speech")
            .map(|item| item.event().to_owned())
            .collect()
    }

    fn evidence(&self) -> impl Iterator<Item = Evidence<'_>> {
        array(&self.read["unseen"]["records"])
            .iter()
            .filter_map(Evidence::read)
    }

    pub(super) fn propose<'a>(
        &self,
        policy: &SchedulingPolicy,
        prior: &ThoughtRead,
        causes: impl ExactSizeIterator<Item = NpcScheduleCause<'a>>,
        discovery_at: f64,
    ) -> ReadResult<Proposal> {
        let facts = &self.read;
        let mut unseen = self
            .evidence()
            .filter(|item| {
                item.sequence() > prior.cursor.watermark.unwrap_or(0)
                    && self.eligible(policy, prior, item)
            })
            .collect::<Vec<_>>();
        unseen.sort_by_key(|item| std::cmp::Reverse(item.sequence()));
        let urgent = array(&facts["unseen"]["interruptions"])
            .iter()
            .filter_map(Evidence::read)
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
        let actor = &facts["own"]["agency"];
        let plan = &actor["plan"];
        let goals = array(&actor["goals"]);
        let mut review = review(facts, policy);
        let blocks = facts["actionsBlocked"] == true;
        let protection = blocks.then(|| {
            let labels = array(&facts["protectionLabels"])
                .iter()
                .filter_map(Value::as_str)
                .collect::<Vec<_>>()
                .join(", ");
            if labels.is_empty() {
                "Actions unavailable".to_owned()
            } else {
                labels
            }
        });
        let body = &facts["opportunity"];
        let goals_text = goals
            .iter()
            .filter(|goal| goal["status"] == "active")
            .filter_map(|goal| goal["objective"].as_str())
            .collect::<Vec<_>>()
            .join("; ");
        let mut meaning = json!({});
        if let Some(protection) = protection.as_ref() {
            meaning["nativeProtection"] = json!(protection);
        }
        meaning["goal"] = json!(goals_text);
        meaning["techniques"] = body["knowledge"].clone();
        meaning["bodyInputs"] = body["bodyInputs"].clone();
        meaning["bodyPolicyPin"] = json!(policy.body_policy_pin);
        meaning["concerns"] = body["concerns"].clone();
        if !body["mindRevision"].is_null() {
            meaning["mind"] = body["mindRevision"].clone();
        }
        meaning["knowledge"] = body["knowledgeRevision"].clone();
        meaning["policy"] = json!(policy.policy_revision);
        if let Some(key) = review.key.as_ref() {
            meaning["reviews"] = json!(key);
        }
        let fingerprint = digest(&meaning)?;
        let semantic_revision = digest(&json!({
            "goals": goals.iter().filter(|goal| goal["author"] != "actor").map(|goal| json!([goal["id"],goal["revision"],goal["status"]])).collect::<Vec<_>>(),
            "techniques": array(&body["knowledge"]).iter().map(|item| json!([item,null])).collect::<Vec<_>>(),
            "blocked": (plan["status"] == "blocked").then(||json!([plan["id"],array(&plan["steps"]).iter().filter(|step| step["status"]=="blocked").map(|step|json!([step["id"],step["outcome"]["code"]])).collect::<Vec<_>>() ])),
            "concerns": body["concerns"],
        }))?;
        let changed = previous
            .semantic_revision
            .as_ref()
            .is_some_and(|revision| revision != &semantic_revision);
        let new_review = review.key.is_some() && review.key != previous.review_key;
        let semantic = &facts["semantic"];
        let causes = causes.collect::<Vec<_>>();
        let discovery = if policy.discovery
            && unseen.is_empty()
            && causes.is_empty()
            && !changed
            && !new_review
            && semantic["occupiedPurpose"].is_null()
            && semantic["discovery"] == "available"
            && facts["attention"]["candidates"]
                .as_object()
                .is_some_and(|candidates| {
                    candidates.values().any(|candidate| {
                        candidate["presentedDescription"] != candidate["descriptionRevision"]
                    })
                }) {
            if self.at() < discovery_at {
                // Only a real optional cue earns a later inspection. Evidence,
                // active work and urgent causes keep the ordinary wake path.
                review.next_at = review.next_at.min(discovery_at);
                None
            } else {
                semantic["interval"].as_u64()
            }
        } else {
            None
        };
        let mut identity = json!({
            "semanticRevision":semantic_revision,
            "evidence":unseen.iter().map(|item|item.event()).collect::<Vec<_>>(),
            "nativeCauses":causes,
            "review":if new_review {review.key.as_ref()} else {None},
        });
        if let Some(interval) = discovery {
            identity["discovery"] = json!(interval);
        }
        let opportunity = digest(&identity)?;
        let available = (!unseen.is_empty()
            || !causes.is_empty()
            || changed
            || new_review
            || discovery.is_some())
            && previous.attempted_opportunity.as_deref() != Some(opportunity.as_str());
        let text = if let Some(protection) = protection.as_ref() {
            protection.clone()
        } else if let Some(item) = unseen.first() {
            format!("Situation change: {}", item.summary())
        } else if !causes.is_empty() {
            "I notice a newly supported change in nearby physical relations.".to_owned()
        } else if let Some(description) = review.description.as_ref().filter(|_| new_review) {
            format!("I am still aware of {description}.")
        } else if discovery.is_some() {
            "I have a free moment to consider my surroundings.".to_owned()
        } else if plan["status"] == "blocked" {
            "My chosen work is blocked.".to_owned()
        } else {
            "A personally acquired goal, capability or bodily condition changed.".to_owned()
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

    fn eligible(
        &self,
        policy: &SchedulingPolicy,
        prior: &ThoughtRead,
        item: &Evidence<'_>,
    ) -> bool {
        let facts = &self.read;
        if (item.speaker() == self.input.actor_id
            && matches!(item.event_type(), "speech" | "speech-result"))
            || prior.speech.contains(item.event())
        {
            return false;
        }
        let original = array(&facts["events"])
            .iter()
            .find(|event| event["id"] == item.event())
            .unwrap_or(&Value::Null);
        let data = &original["data"];
        let category = original["type"].as_str().unwrap_or_default();
        if category == "body-condition"
            && let Some(attribute) = data["attributeId"].as_str()
        {
            let current = &facts["conditions"][attribute];
            if data["severity"]
                .as_f64()
                .is_some_and(|severity| current["severity"].as_f64().unwrap_or(0.) < severity)
                || data["definitionVersion"]
                    .as_u64()
                    .is_some_and(|version| current["version"].as_u64() != Some(version))
            {
                return false;
            }
        }
        let consumed = original["actorId"] == self.input.actor_id
            && category == "appraisal-changed"
            && data["appraisalPipeline"] == "prepared-response"
            && data["responseId"].is_string()
            && data["appraisalInputSequence"].is_number()
            && data["appraisalCauseIds"].is_string()
            && original["responseRecorded"] == true;
        !consumed
            && (item.value["importance"].as_f64().unwrap_or(0.) >= 6.
                || policy.significant_events.contains(category))
    }

    fn prepared_result(
        &self,
        policy: &SchedulingPolicy,
        unseen: &[Evidence<'_>],
    ) -> Option<String> {
        let selected = policy.prepared_responses.as_ref()?;
        let read = &self.read["preparedResult"];
        let reference: ResultEvidence = serde_json::from_value(read["reference"].clone()).ok()?;
        let id = reference.id();
        let occurrence = &read["occurrence"];
        if read["forgotten"] == true
            || occurrence["commandType"] == "say"
            || !unseen.iter().any(|item| item.event() == id)
        {
            return None;
        }
        let plan = read["planReference"] == read["reference"]
            && read["planPurpose"] == *selected
            && read["internalMemory"] == true;
        let completed = occurrence["status"]
            .as_str()
            .is_some_and(|status| status != "running")
            && occurrence["revoked"] == false
            && occurrence["forgotten"] == false
            && occurrence["purpose"] == *selected;
        (plan || completed).then_some(id)
    }
}

struct Evidence<'a> {
    kind: PersonalSourceKind,
    value: &'a Value,
}
impl<'a> Evidence<'a> {
    fn read(row: &'a Value) -> Option<Self> {
        let kind = match row["kind"].as_str()? {
            "awareness" => PersonalSourceKind::Awareness,
            "memory" => PersonalSourceKind::Memory,
            "summary" => PersonalSourceKind::Summary,
            _ => return None,
        };
        let value = &row["value"];
        Some(Self { kind, value })
    }
    fn id(&self) -> &'a str {
        let field = if self.kind == PersonalSourceKind::Awareness {
            "eventId"
        } else {
            "id"
        };
        self.value[field].as_str().unwrap_or_default()
    }
    fn event(&self) -> &'a str {
        self.value["eventId"].as_str().unwrap_or_else(|| self.id())
    }
    fn summary(&self) -> &'a str {
        let field = if self.kind == PersonalSourceKind::Memory {
            "summary"
        } else {
            "text"
        };
        self.value[field].as_str().unwrap_or_default()
    }
    fn sequence(&self) -> u64 {
        self.value["sequence"].as_u64().unwrap_or(0)
    }
    fn speaker(&self) -> &'a str {
        let field = if self.kind == PersonalSourceKind::Awareness {
            "sourceId"
        } else {
            "speakerId"
        };
        self.value[field].as_str().unwrap_or_default()
    }
    fn event_type(&self) -> &'a str {
        self.value["eventType"].as_str().unwrap_or_default()
    }
}

struct Review {
    key: Option<String>,
    next_at: f64,
    description: Option<String>,
}
fn review(facts: &Value, policy: &SchedulingPolicy) -> Review {
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
    let at = facts["at"].as_f64().unwrap_or(0.);
    let mut due = Vec::new();
    for entry in array(&facts["stimuli"]) {
        let salience = array(&entry["states"])
            .iter()
            .filter_map(Value::as_str)
            .filter_map(|state| policy.stimuli.salience.get(state))
            .copied()
            .fold(0., f64::max);
        if salience == 0. {
            continue;
        }
        let since = entry["since"].as_f64().unwrap_or(at);
        let count = ((at - since).max(0.) / interval).floor();
        review.next_at = review.next_at.min(since + (count + 1.) * interval);
        if count > 0. {
            due.push((
                salience,
                at - since < policy.stimuli.novelty,
                since,
                entry["sourceId"].as_str().unwrap_or_default(),
                count,
                entry["label"].as_str(),
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
        review.description = due[0].5.map(str::to_owned);
        let mut keys = due
            .iter()
            .map(|entry| format!("{}:{}", entry.3, entry.4))
            .collect::<Vec<_>>();
        keys.sort();
        review.key = Some(keys.join("|"));
    }
    review
}

fn array(value: &Value) -> &[Value] {
    value.as_array().map_or(&[], Vec::as_slice)
}
fn digest(value: &Value) -> ReadResult<String> {
    Ok(sha256_hex(json_record(value)?.as_bytes()))
}
