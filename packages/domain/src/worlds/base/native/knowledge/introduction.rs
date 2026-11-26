//! Match a proposed introduction only against the listener's actual heard
//! segments. ICU supplies word boundaries; this world owns naming permission.

use super::PersonalNameRules;
use crate::events::WorldEvent;
use crate::execution::ExecutionError;
use crate::experience::Awareness;
use crate::geometry::GeometryBinding;
use crate::host::{ByteBudget, ByteReservation};
use crate::language::{WordFacts, WordsAnswer, WordsRequest};
use crate::reception::{EventScalar, SpeechPerception, SpeechSegment};
use crate::text::JsText;
use std::{mem::size_of, ops::Range};

struct ListenerWords {
    evidence: usize,
    segments: Range<usize>,
}
pub(crate) struct IntroductionWords {
    event_id: String,
    name: JsText,
    listeners: Vec<ListenerWords>,
    request: WordsRequest,
    reservation: ByteReservation,
}
/// This proves which actual accounts heard the offered words. The real name
/// assignment/retention owner must still validate each current subject and
/// retain its exact proof before changing any observer's preferred label.
pub(crate) struct HeardIntroductions {
    pub(super) event_id: String,
    pub(super) name: JsText,
    listeners: Vec<ListenerWords>,
    facts: WordFacts,
    _reservation: ByteReservation,
}
fn heard<'a>(entry: &'a Awareness) -> impl Iterator<Item = &'a JsText> {
    entry
        .speech
        .iter()
        .flat_map(|speech| &speech.segments)
        .filter_map(|segment| match segment {
            SpeechSegment::Heard { text } => Some(text),
            SpeechSegment::Unintelligible => None,
        })
}
impl IntroductionWords {
    pub(crate) fn prepare(
        event: &mut WorldEvent,
        acquired: &[Awareness],
        rules: &PersonalNameRules,
        speech_event: &str,
        binding: GeometryBinding,
        budget: &ByteBudget,
    ) -> Result<Option<Self>, ExecutionError> {
        if event.event_type != speech_event || event.actor_id.as_ref().is_none_or(String::is_empty)
        {
            return Ok(None);
        }
        let Some(proposed) = event
            .data
            .as_ref()
            .and_then(|data| data.get("selfIntroduction"))
        else {
            return Ok(None);
        };
        let valid = match proposed {
            EventScalar::Text(name) => {
                !name.trim_is_empty()
                    && name.character_count() as u64 <= rules.given_name_characters
                    && matches!(event.data.as_ref().and_then(|data|data.get("text")),Some(EventScalar::Text(text)) if text.borrowed().contains(name.borrowed().trimmed()))
            }
            _ => false,
        };
        if !valid {
            event
                .data
                .as_mut()
                .ok_or(ExecutionError::Invariant)?
                .shift_remove("selfIntroduction");
            return Ok(None);
        }
        let EventScalar::Text(proposed) = proposed else {
            return Err(ExecutionError::Invariant);
        };
        let name = proposed.borrowed().trimmed();
        let mut count = 0usize;
        let mut parts = 1usize;
        for observer in &event.audience {
            if event.actor_id.as_ref() == Some(observer) {
                continue;
            }
            let Some(entry) = acquired.iter().find(|entry| &entry.actor_id == observer) else {
                continue;
            };
            if entry.event_id != event.id
                || entry
                    .speech
                    .as_ref()
                    .is_none_or(|speech| speech.perception != SpeechPerception::Heard)
            {
                continue;
            }
            let words = heard(entry).count();
            if words == 0 {
                continue;
            }
            count = count.checked_add(1).ok_or(ExecutionError::Capacity)?;
            parts = parts.checked_add(words).ok_or(ExecutionError::Capacity)?;
        }
        let bytes = count
            .checked_mul(size_of::<ListenerWords>())
            .and_then(|bytes| bytes.checked_add(parts.checked_mul(size_of::<&JsText>())?))
            .and_then(|bytes| bytes.checked_add(event.id.len()))
            .and_then(|bytes| bytes.checked_add(name.storage_bound()?.checked_mul(2)?))
            .and_then(|bytes| {
                bytes.checked_add(size_of::<Self>() + size_of::<HeardIntroductions>())
            })
            .ok_or(ExecutionError::Capacity)?;
        let reservation = budget.reserve(bytes)?;
        let name = name.to_owned();
        // Replacing with the trimmed claim shrinks the begun event's already
        // funded string; this temporary name owner funds its simultaneous copy.
        event
            .data
            .as_mut()
            .ok_or(ExecutionError::Invariant)?
            .insert(
                "selfIntroduction".to_owned(),
                EventScalar::Text(name.clone()),
            );
        let mut listeners = Vec::new();
        listeners
            .try_reserve_exact(count)
            .map_err(|_| ExecutionError::Capacity)?;
        let mut strings = Vec::new();
        strings
            .try_reserve_exact(parts)
            .map_err(|_| ExecutionError::Capacity)?;
        strings.push(&name);
        for observer in &event.audience {
            if event.actor_id.as_ref() == Some(observer) {
                continue;
            }
            let Some((index, entry)) = acquired
                .iter()
                .enumerate()
                .find(|(_, entry)| &entry.actor_id == observer)
            else {
                continue;
            };
            if entry.event_id != event.id
                || entry
                    .speech
                    .as_ref()
                    .is_none_or(|speech| speech.perception != SpeechPerception::Heard)
            {
                continue;
            }
            let start = strings.len();
            strings.extend(heard(entry));
            if start != strings.len() {
                listeners.push(ListenerWords {
                    evidence: index,
                    segments: start..strings.len(),
                });
            }
        }
        let request = WordsRequest::prepare(binding, strings.iter().copied(), budget)
            .map_err(|_| ExecutionError::Capacity)?;
        drop(strings);
        Ok(Some(Self {
            event_id: event.id.clone(),
            name,
            listeners,
            request,
            reservation,
        }))
    }
    pub(crate) fn request(&self) -> &WordsRequest {
        &self.request
    }
    pub(crate) fn finish(self, answer: WordsAnswer) -> Result<HeardIntroductions, ExecutionError> {
        let Self {
            event_id,
            name,
            listeners,
            request,
            reservation,
        } = self;
        let facts = request
            .finish(answer)
            .map_err(|_| ExecutionError::Invariant)?;
        Ok(HeardIntroductions {
            event_id,
            name,
            listeners,
            facts,
            _reservation: reservation,
        })
    }
}
impl HeardIntroductions {
    pub(crate) fn name(&self) -> &JsText {
        &self.name
    }
    pub(crate) fn event_id(&self) -> &str {
        &self.event_id
    }
    pub(crate) fn evidence_indices(&self) -> impl Iterator<Item = usize> + '_ {
        let name = self.facts.get(0).unwrap_or(&[]);
        self.listeners
            .iter()
            .filter(move |listener| {
                !name.is_empty()
                    && listener.segments.clone().any(|index| {
                        self.facts
                            .get(index)
                            .is_some_and(|words| words.windows(name.len()).any(|part| part == name))
                    })
            })
            .map(|listener| listener.evidence)
    }
}
