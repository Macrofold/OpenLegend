//! Finite formatting continuations issued by the active candidate. These
//! replies retain their original binding and add no world authority.

use crate::{
    activity_format, control_format,
    language::{LanguageProvider, canonical::write_canonical},
    world::WorldError,
};
use openlegend_simulation::{
    encoding::{json_record, json_record_len, json_tree_allocation_bound},
    geometry::GeometryBinding,
    host::ByteBudget,
    records::SqlCell,
    runtime::{LocalFormat, RuntimeProvider, RuntimeProviderInput},
};
use openlegend_world_host::pool::HostError;
use serde::Deserialize;
use serde_json::value::RawValue;

#[derive(Deserialize)]
struct Envelope<'a> {
    kind: &'a str,
    binding: GeometryBinding,
    #[serde(borrow)]
    value: &'a RawValue,
}

/// Borrow the funded request and return only the rendered value. The existing
/// cursors still check the ticket and own the result's meaning and effects.
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
    if let Some(answer) = request.with_collation(|binding, strings| {
        let language = language.ok_or(WorldError::ProviderKind)?;
        let bytes = strings.iter().try_fold(
            // Vector headers, order, equal groups and stable sort scratch.
            strings.len().checked_mul(size_of::<Vec<u16>>() + 6 * size_of::<u32>())
                .and_then(|bytes| bytes.checked_add(512))
                .ok_or(HostError::Capacity)?,
            // UTF-16 allocation growth, including the minimum short buffer.
            |bytes, text| text.len().checked_mul(4)
                .and_then(|n| n.checked_add(8))
                .and_then(|n| bytes.checked_add(n))
                .ok_or(HostError::Capacity),
        )?;
        let custody = budget.reserve(bytes).map_err(HostError::from)?;
        let (order, groups) = language.collate_selected(strings).map_err(WorldError::Language)?;
        Ok::<_, WorldError>(RuntimeProviderInput::collation(binding, order, groups, custody)?)
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
            "display" | "control" | "canonical" | "digest"
        ) {
            return Ok(None);
        }
        let bytes = envelope
            .value
            .get()
            .len()
            .checked_mul(12)
            .and_then(|n| n.checked_add(4096))
            .ok_or(HostError::Capacity)?;
        let bytes = if matches!(envelope.kind, "canonical" | "digest") {
            json_tree_allocation_bound(envelope.value.get())
                .and_then(|scratch| scratch.checked_add(bytes))
                .ok_or(HostError::Capacity)?
        } else {
            bytes
        };
        let workspace = budget.reserve(bytes).map_err(HostError::from)?;
        let value = match envelope.kind {
            "display" => LocalFormat::Display(activity_format::format(envelope.value)?),
            "control" => LocalFormat::Control(control_format::format(envelope.value)?),
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
                let canonical = String::from_utf8(encoded).map_err(|_| WorldError::ProviderKind)?;
                if envelope.kind == "canonical" {
                    LocalFormat::Canonical(canonical)
                } else {
                    LocalFormat::Digest(canonical)
                }
            }
            _ => unreachable!("validated provider kind"),
        };
        Ok(Some(RuntimeProviderInput::local_format(
            envelope.binding,
            value,
            workspace,
        )?))
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
