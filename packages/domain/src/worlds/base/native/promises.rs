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
pub(crate) struct PromiseCompletion<'a> {
    pub event_type: &'a str,
    pub definition_id: &'a str,
}

fn suffix<'a>(text: &'a str, phrase: &str) -> Option<&'a str> {
    let prefix = text.get(..phrase.len())?;
    prefix
        .eq_ignore_ascii_case(phrase)
        .then(|| &text[phrase.len()..])
}

impl PromiseRules {
    pub(crate) fn recognize<'a>(&'a self, words: &SpeechWords) -> Option<SpokenPromise<'a>> {
        let after = suffix(words.text(), &self.admission_prefix)?;
        let first = after.chars().next()?;
        if !is_js_whitespace(first) || after.trim_start_matches(is_js_whitespace).is_empty() {
            return None;
        }
        let mut lower = js_trim(words.lowercase());
        if let Some(mark) = self
            .ignored_terminal_punctuation
            .iter()
            .find(|mark| lower.ends_with(mark.as_str()))
        {
            lower = &lower[..lower.len() - mark.len()];
        }
        let completion = suffix(lower, &self.gather_prefix).and_then(|named| {
            if named.is_empty()
                || named
                    .chars()
                    .any(|c| matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}'))
            {
                return None;
            }
            let mut matches = self.definitions.iter().filter(|definition| {
                definition.normalized_id == named || definition.normalized_name == named
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
