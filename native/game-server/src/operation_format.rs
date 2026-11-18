//! Finite formatting continuations issued by the active candidate. These
//! replies retain their original binding and add no world authority.

use crate::{
    activity_format, control_format,
    language::{LanguageProvider, PreparedUtterance, PreparedWordLists},
    world::WorldError,
};
use openlegend_simulation::{
    activity::ActivityView,
    encoding::json_record,
    geometry::GeometryBinding,
    host::ByteBudget,
    runtime::{RuntimeProvider, RuntimeProviderInput},
    text::JsText,
};
use openlegend_world_host::pool::HostError;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;

#[derive(Deserialize)]
struct Envelope<'a> {
    kind: &'a str,
    binding: GeometryBinding,
    #[serde(borrow)]
    value: &'a RawValue,
}

#[derive(Serialize)]
struct Answer {
    binding: GeometryBinding,
    #[serde(flatten)]
    value: Formatted,
}

#[derive(Serialize)]
#[serde(untagged)]
enum Formatted {
    Activity { view: ActivityView },
    Control { message: JsText },
    Collation { order: Vec<u32>, groups: Vec<u32> },
    Utterance(PreparedUtterance),
    Words(PreparedWordLists),
}

/// Borrow the funded request and admit its finite decoded text, facts and JSON
/// backing before formatting. Hand off only the owned encoded reply; the
/// candidate still checks its current binding and admits what it retains.
pub(crate) fn answer(
    request: &RuntimeProvider,
    budget: &ByteBudget,
    language: Option<&LanguageProvider>,
) -> Result<Option<RuntimeProviderInput>, WorldError> {
    request.with_request(|request| {
        let envelope: Envelope<'_> =
            serde_json::from_str(request).map_err(|_| WorldError::ProviderKind)?;
        if !matches!(
            envelope.kind,
            "display" | "control" | "collation" | "utterance" | "words"
        ) {
            return Ok(None);
        }
        let bytes = envelope
            .value
            .get()
            .len()
            // A collation array can have a short string per slot. The
            // carrier bound covers the typed string, UTF16 and rank lists.
            .checked_mul(if envelope.kind == "collation" { 48 } else { 12 })
            .and_then(|n| n.checked_add(4096))
            .ok_or(HostError::Capacity)?;
        let mut workspace = budget.reserve(bytes).map_err(HostError::from)?;
        let value = match envelope.kind {
            "display" => Formatted::Activity {
                view: activity_format::format(envelope.value)?,
            },
            "control" => Formatted::Control {
                message: control_format::format(envelope.value)?,
            },
            "collation" => {
                #[derive(Deserialize)]
                struct Input {
                    strings: Vec<JsText>,
                }
                let input: Input = serde_json::from_str(envelope.value.get())
                    .map_err(|_| WorldError::ProviderKind)?;
                let (order, groups) = language
                    .ok_or(WorldError::ProviderKind)?
                    .collate(&input.strings)
                    .map_err(WorldError::Language)?;
                Formatted::Collation { order, groups }
            }
            "utterance" => {
                #[derive(Deserialize)]
                struct Input {
                    text: JsText,
                }
                let input: Input = serde_json::from_str(envelope.value.get())
                    .map_err(|_| WorldError::ProviderKind)?;
                Formatted::Utterance(
                    language
                        .ok_or(WorldError::ProviderKind)?
                        .utterance(&input.text, budget)
                        .map_err(WorldError::Language)?,
                )
            }
            "words" => {
                #[derive(Deserialize)]
                struct Input {
                    strings: Vec<JsText>,
                }
                let input: Input = serde_json::from_str(envelope.value.get())
                    .map_err(|_| WorldError::ProviderKind)?;
                Formatted::Words(
                    language
                        .ok_or(WorldError::ProviderKind)?
                        .speech_word_lists(&input.strings, budget)
                        .map_err(WorldError::Language)?,
                )
            }
            _ => unreachable!("validated provider kind"),
        };
        let answer = json_record(&Answer {
            binding: envelope.binding,
            value,
        })
        .map_err(|_| WorldError::ProviderKind)?;
        let custody = workspace
            .split_off(answer.capacity())
            .map_err(HostError::from)?;
        Ok(Some(RuntimeProviderInput::new(answer, custody)))
    })?
}
