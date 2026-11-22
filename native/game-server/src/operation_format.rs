//! Finite formatting continuations issued by the active candidate. These
//! replies retain their original binding and add no world authority.

use crate::{
    activity_format, control_format,
    language::{LanguageProvider, canonical::write_canonical},
    world::WorldError,
};
use openlegend_simulation::{
    activity::ActivityView,
    encoding::{json_record, json_record_len, json_tree_allocation_bound},
    geometry::GeometryBinding,
    host::ByteBudget,
    records::SqlCell,
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
    Canonical { canonical: String },
}

/// Borrow the funded request and admit the output and workspace. Mind
/// formatting and utterances use typed replies. The remaining bridge-formatted
/// operations still hand the candidate independently funded encoded results.
pub(crate) fn answer(
    request: &RuntimeProvider,
    budget: &ByteBudget,
    language: Option<&LanguageProvider>,
) -> Result<Option<RuntimeProviderInput>, WorldError> {
    if let Some(answer) = request.format_activity_learning(budget)? {
        return Ok(Some(answer));
    }
    if let Some(answer) = request.with_utterance(|binding, text| {
        let prepared = language
            .ok_or(WorldError::ProviderKind)?
            .utterance(text, budget)
            .map_err(WorldError::Language)?;
        Ok::<_, WorldError>(prepared.into_answer(binding)?)
    })? {
        return answer.map(Some);
    }
    if let Some(answer) = request.with_speech_words(|binding, strings| {
        let prepared = language
            .ok_or(WorldError::ProviderKind)?
            .speech_word_lists(strings, budget)
            .map_err(WorldError::Language)?;
        Ok::<_, WorldError>(prepared.into_answer(binding)?)
    })? {
        return answer.map(Some);
    }
    if let Some(answer) = request.with_maintenance_format(|binding, publication| {
        format_maintenance(
            binding,
            publication,
            budget,
            language.ok_or(WorldError::ProviderKind)?,
        )
    })? {
        return answer.map(Some);
    }
    request.with_request(|request| {
        let envelope: Envelope<'_> =
            serde_json::from_str(request).map_err(|_| WorldError::ProviderKind)?;
        if !matches!(
            envelope.kind,
            "display" | "control" | "collation" | "canonical" | "digest"
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
        let bytes = if matches!(envelope.kind, "canonical" | "digest") {
            json_tree_allocation_bound(envelope.value.get())
                .and_then(|scratch| scratch.checked_add(bytes))
                .ok_or(HostError::Capacity)?
        } else {
            bytes
        };
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
            "canonical" | "digest" => {
                #[derive(Deserialize)]
                struct Command<'a> {
                    #[serde(borrow)]
                    command: &'a RawValue,
                }
                #[derive(Deserialize)]
                struct Value<'a> {
                    #[serde(borrow)]
                    value: &'a RawValue,
                }
                let selected = match envelope.kind {
                    "canonical" => serde_json::from_str::<Command<'_>>(envelope.value.get())
                        .map(|input| input.command),
                    _ => serde_json::from_str::<Value<'_>>(envelope.value.get())
                        .map(|input| input.value),
                }
                .map_err(|_| WorldError::ProviderKind)?;
                let language = language.ok_or(WorldError::ProviderKind)?;
                let mut encoded = Vec::with_capacity(selected.get().len());
                write_canonical(
                    selected.get(),
                    &|left, right| language.compare_utf8(left, right),
                    &mut encoded,
                )
                .map_err(WorldError::Language)?;
                Formatted::Canonical {
                    canonical: String::from_utf8(encoded).map_err(|_| WorldError::ProviderKind)?,
                }
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

fn format_maintenance(
    binding: GeometryBinding,
    publication: &SqlCell,
    budget: &ByteBudget,
    language: &LanguageProvider,
) -> Result<RuntimeProviderInput, WorldError> {
    let files = publication
        .get("files")
        .and_then(SqlCell::as_array)
        .ok_or(WorldError::ProviderKind)?;
    let thoughts = publication
        .get("thoughts")
        .and_then(SqlCell::as_array)
        .ok_or(WorldError::ProviderKind)?;
    let bytes = json_record_len(publication).map_err(|_| WorldError::ProviderKind)?;
    let custody = budget
        .reserve(
            bytes
                .checked_mul(2)
                .and_then(|n| n.checked_add(files.len().checked_mul(size_of::<u64>() + 1)?))
                .and_then(|n| n.checked_add(thoughts.len().checked_mul(size_of::<u64>())?))
                .and_then(|n| n.checked_add(512))
                .ok_or(HostError::Capacity)?,
        )
        .map_err(HostError::from)?;
    let mut valid_paths = Vec::with_capacity(files.len());
    let mut file_words = Vec::with_capacity(files.len());
    for file in files {
        let path = file
            .get("path")
            .and_then(SqlCell::as_text)
            .ok_or(WorldError::ProviderKind)?;
        let text = file
            .get("text")
            .and_then(SqlCell::as_text)
            .ok_or(WorldError::ProviderKind)?;
        valid_paths.push(language.valid_mind_path(path));
        file_words.push(
            language
                .maintenance_words(&[path, text], budget)
                .map_err(WorldError::Language)?,
        );
    }
    let mut thought_words = Vec::with_capacity(thoughts.len());
    for thought in thoughts {
        let thought = thought.as_text().ok_or(WorldError::ProviderKind)?;
        thought_words.push(
            language
                .maintenance_words(&[thought], budget)
                .map_err(WorldError::Language)?,
        );
    }
    let _encoding = budget
        .reserve(bytes.checked_mul(2).ok_or(HostError::Capacity)?)
        .map_err(HostError::from)?;
    let input = json_record(publication).map_err(|_| WorldError::ProviderKind)?;
    let _sort = budget
        .reserve(json_tree_allocation_bound(&input).ok_or(HostError::Capacity)?)
        .map_err(HostError::from)?;
    // Canonical text is retained by the publication itself for exact
    // duplicate checks. The provider's typed carrier never encodes an envelope.
    let mut canonical = Vec::with_capacity(input.len());
    write_canonical(&input, &|a, b| language.compare_utf8(a, b), &mut canonical)
        .map_err(WorldError::Language)?;
    let canonical = String::from_utf8(canonical).map_err(|_| WorldError::ProviderKind)?;
    Ok(RuntimeProviderInput::maintenance_format(
        binding,
        canonical,
        valid_paths,
        file_words,
        thought_words,
        custody,
        budget,
    )?)
}
