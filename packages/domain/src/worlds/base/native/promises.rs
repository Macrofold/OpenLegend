//! Bundled-world spoken promise grammar. Phrases, quota and completion words
//! come from the Source descriptor; Unicode case conversion is prepared once
//! with the same Node language owner as the Source runtime.

use crate::encoding::{is_js_whitespace, js_trim};
use crate::install::DefinitionIdentity;
use crate::speech::SpeechWords;
use crate::values::deserialize_safe_integer;
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PromiseDefinition {
    pub id: String,
    pub normalized_id: String,
    pub normalized_name: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PromiseRules {
    pub id: String,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub version: u64,
    #[serde(deserialize_with = "deserialize_safe_integer")]
    pub limit: u64,
    pub speech_event: String,
    pub completion_event: String,
    pub admission_prefix: String,
    pub gather_prefix: String,
    pub ignored_terminal_punctuation: Vec<String>,
    pub item_id_separator: String,
    pub item_id_separator_replacement: String,
    pub importance: f64,
    pub summary_prefix: String,
    pub definitions: Vec<PromiseDefinition>,
}
impl DefinitionIdentity for PromiseRules {
    fn definition_id(&self) -> &str {
        &self.id
    }
    fn definition_version(&self) -> u64 {
        self.version
    }
}

pub(crate) struct SpokenPromise<'a> {
    pub completion: Option<PromiseCompletion<'a>>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PromiseCompletion<'a> {
    pub event_type: &'a str,
    pub definition_id: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PromiseObligation<'a> {
    revision: u64,
    status: &'static str,
    evidence_id: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    completion: Option<PromiseCompletion<'a>>,
}
struct Participants<'a> {
    actor: &'a str,
    target: Option<&'a str>,
}
impl Serialize for Participants<'_> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeSeq;
        let mut output = serializer.serialize_seq(Some(1 + usize::from(self.target.is_some())))?;
        output.serialize_element(self.actor)?;
        if let Some(target) = self.target {
            output.serialize_element(target)?;
        }
        output.end()
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PromiseMemoryDraft<'a> {
    kind: &'static str,
    source: &'static str,
    summary: &'a crate::text::JsText,
    event_id: &'a str,
    event_type: &'a str,
    speaker_id: &'a str,
    entity_ids: Participants<'a>,
    importance: f64,
    resolved: bool,
    obligation: PromiseObligation<'a>,
}

/// Real recordSpokenPromise production, before the common personal account
/// owner assigns identity/chronology and admits its required receipt. A partial
/// memory set must be hydrated before counting, never treated as an empty tail.
pub(crate) fn prepare_spoken_promise(
    core: &mut crate::execution::CoreMutation<'_>,
    event: &crate::events::WorldEvent,
    words: &SpeechWords,
    budget: &crate::host::ByteBudget,
) -> Result<crate::experience::MemoryAdmission, crate::experience::MemoryAcquisitionError> {
    use crate::experience::{
        ExperienceError, MemoryAcquisitionError, MemoryAdmission, PersonalSourceKind,
    };
    use crate::narration::{
        GrammaticalPerson, Narration, NarrationPart, PersonRole, narration_render_bound,
        render_narration_parts,
    };
    use std::mem::size_of;
    let installed = std::sync::Arc::clone(&core.state.installed);
    let rules = installed.promises.value();
    let Some(actor) = event.actor_id.as_deref().filter(|actor| !actor.is_empty()) else {
        return Ok(MemoryAdmission::Complete(None));
    };
    if event.event_type != rules.speech_event {
        return Ok(MemoryAdmission::Complete(None));
    }
    let Some(crate::reception::EventScalar::Text(text)) =
        event.data.as_ref().and_then(|data| data.get("text"))
    else {
        return Ok(MemoryAdmission::Complete(None));
    };
    if text != words.text() {
        return Err(ExperienceError::InvalidBody("promise utterance binding").into());
    }
    let Some(recognized) = rules.recognize(words) else {
        return Ok(MemoryAdmission::Complete(None));
    };
    let unresolved = if let Some(history) = core.state.experience.actor(actor) {
        let memories = history.collection(PersonalSourceKind::Memory)?;
        if memories.coverage().parent_present && !memories.coverage().complete {
            return Err(ExperienceError::Unavailable.into());
        }
        memories
            .records()
            .filter(|memory| memory.header().unresolved_commitment)
            .count() as u64
    } else {
        0
    };
    if unresolved >= rules.limit {
        return Ok(MemoryAdmission::Complete(None));
    }
    let input_bytes = actor
        .len()
        .checked_add(rules.summary_prefix.len())
        .and_then(|bytes| bytes.checked_add(text.storage_bytes()))
        .and_then(|bytes| {
            bytes.checked_add(4 * size_of::<NarrationPart>() + size_of::<Narration>() + 1)
        })
        .ok_or(ExperienceError::Capacity)?;
    let mut reservation = budget
        .reserve(input_bytes)
        .map_err(|_| ExperienceError::Capacity)?;
    let mut parts = Vec::new();
    parts
        .try_reserve_exact(4)
        .map_err(|_| ExperienceError::Capacity)?;
    parts.push(NarrationPart::Participant {
        entity_id: actor.to_owned(),
        role: PersonRole::Subject,
        article: None,
    });
    parts.push(NarrationPart::Literal(" ".to_owned().into()));
    parts.push(NarrationPart::Literal(rules.summary_prefix.clone().into()));
    parts.push(NarrationPart::Literal(text.clone()));
    let narration = Narration { parts };
    let render_bound =
        narration_render_bound(&narration, |_| None).ok_or(ExperienceError::Capacity)?;
    reservation
        .resize(
            input_bytes
                .checked_add(render_bound)
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let summary = render_narration_parts(
        &narration,
        &indexmap::IndexMap::new(),
        Some(actor),
        GrammaticalPerson::First,
    );
    let draft = PromiseMemoryDraft {
        kind: "commitment",
        source: "observed",
        summary: &summary,
        event_id: &event.id,
        event_type: &rules.speech_event,
        speaker_id: actor,
        entity_ids: Participants {
            actor,
            target: event.target_id.as_deref(),
        },
        importance: rules.importance,
        resolved: false,
        obligation: PromiseObligation {
            revision: 1,
            status: "active",
            evidence_id: &event.id,
            completion: recognized.completion,
        },
    };
    let bytes =
        crate::encoding::json_record_len(&draft).map_err(|_| MemoryAcquisitionError::Encoding)?;
    reservation
        .resize(
            input_bytes
                .checked_add(summary.storage_bytes())
                .and_then(|size| size.checked_add(bytes))
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let encoded =
        crate::encoding::json_record(&draft).map_err(|_| MemoryAcquisitionError::Encoding)?;
    crate::experience::prepare_memory_admission(core, actor, encoded, None, budget)
}

pub(crate) fn record_spoken_promise(
    core: &mut crate::execution::CoreMutation<'_>,
    event: &crate::events::WorldEvent,
    words: &SpeechWords,
    budget: &crate::host::ByteBudget,
) -> Result<Option<String>, crate::experience::MemoryAcquisitionError> {
    let admission = prepare_spoken_promise(core, event, words, budget)?;
    let schema = std::sync::Arc::clone(&core.state.installed.schema);
    crate::experience::acquire_memory(core, admission, &schema)
}

fn suffix<'a>(
    text: crate::text::TextSlice<'a>,
    phrase: &str,
) -> Option<crate::text::TextSlice<'a>> {
    let length = phrase.encode_utf16().count();
    if length > text.units_len()
        || !text
            .units()
            .take(length)
            .zip(phrase.encode_utf16())
            .all(|(left, right)| {
                let lower = |unit: u16| {
                    if (65..=90).contains(&unit) {
                        unit + 32
                    } else {
                        unit
                    }
                };
                lower(left) == lower(right)
            })
    {
        return None;
    }
    text.slice(length..text.units_len())
}

impl PromiseRules {
    pub(crate) fn recognize<'a>(&'a self, words: &SpeechWords) -> Option<SpokenPromise<'a>> {
        let after = suffix(words.text().borrowed(), &self.admission_prefix)?;
        let first = after
            .units()
            .next()
            .and_then(|unit| char::from_u32(u32::from(unit)))?;
        if !is_js_whitespace(first) || after.trimmed().is_empty() {
            return None;
        }
        let mut lower = words.lowercase().borrowed().trimmed();
        if let Some(mark) = self
            .ignored_terminal_punctuation
            .iter()
            .find(|mark| lower.ends_with_str(mark))
        {
            lower = lower.slice(0..lower.units_len() - mark.encode_utf16().count())?;
        }
        let completion = suffix(lower, &self.gather_prefix).and_then(|named| {
            if named.is_empty()
                || named
                    .units()
                    .any(|unit| matches!(unit, 10 | 13 | 0x2028 | 0x2029))
            {
                return None;
            }
            let mut matches = self.definitions.iter().filter(|definition| {
                named.equals_str(&definition.normalized_id)
                    || named.equals_str(&definition.normalized_name)
            });
            let definition = matches.next()?;
            if matches.next().is_some() {
                return None;
            }
            Some(PromiseCompletion {
                event_type: &self.completion_event,
                definition_id: &definition.id,
            })
        });
        Some(SpokenPromise { completion })
    }
}
