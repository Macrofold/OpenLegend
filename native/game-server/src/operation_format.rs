//! Finite formatting continuations issued by the active candidate. These
//! replies retain their original binding and add no world authority.

use crate::{
    control_format,
    language::{LanguageProvider, canonical::write_canonical_cell},
    world::WorldError,
};
use openlegend_simulation::{
    encoding::json_record_len,
    geometry::GeometryBinding,
    host::{ByteBudget, ByteReservation},
    records::SqlCell,
    runtime::{LocalFormat, MovementAttemptSyntax, RuntimeProvider, RuntimeProviderInput},
};
use openlegend_world_host::pool::HostError;
/// Borrow the funded request and return only the rendered value. The existing
/// cursors still check the ticket and own the result's meaning and effects.
pub(crate) fn answer(
    request: &RuntimeProvider,
    budget: &ByteBudget,
    language: Option<&LanguageProvider>,
) -> Result<Option<RuntimeProviderInput>, WorldError> {
    if let Some(answer) = request.normalize_attempts(budget, |description, label| {
        use crate::language::movement_attempt::{movement_name, parse_offset, proposed_name};
        let language = language.ok_or(WorldError::ProviderKind)?;
        let (normalized, custody) = language
            .normalize_intention(description, budget)
            .map_err(WorldError::Language)?;
        let mut syntax = parse_offset(&normalized);
        if syntax.is_none()
            && let (Some(label), Some(wanted)) = (label, proposed_name(&normalized))
        {
            let (named, _custody) = language
                .normalize_intention(label, budget)
                .map_err(WorldError::Language)?;
            if movement_name(&named) == Some(wanted) {
                syntax = Some(MovementAttemptSyntax::NamedApproach);
            }
        }
        Ok::<_, WorldError>((normalized, syntax, custody))
    })? {
        return Ok(Some(answer));
    }
    if let Some(answer) = request.format_activity_learning(budget)? {
        return Ok(Some(answer));
    }
    if let Some(answer) = request.format_activity_display(budget)? {
        return Ok(Some(answer));
    }
    if let Some(answer) = request.with_control(|binding, paused, speed| {
        control_format::answer(binding, paused, speed, budget)
    })? {
        return answer.map(Some);
    }
    if let Some(answer) = request.format_plan_command(budget, |left, right| {
        language.and_then(|provider| provider.compare_utf8(left, right).ok())
    })? {
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
    if let Some(answer) = answer_collation(request, budget, language)? {
        return Ok(Some(answer));
    }
    if let Some(answer) =
        request.with_maintenance_format(|binding, publication, retained_bytes| {
            format_maintenance(
                binding,
                publication,
                retained_bytes,
                budget,
                language.ok_or(WorldError::ProviderKind)?,
            )
        })?
    {
        return answer.map(Some);
    }
    if let Some(answer) = request.with_digest(|binding, value, retained_bytes| {
        typed_digest(binding, value, retained_bytes, budget, language)
    })? {
        return answer.map(Some);
    }
    Ok(None)
}

/// Sort the selected strings with the installed locale and fund both the
/// working conversion and the bound answer. Gameplay and checkpoint recovery
/// use the same pending request and ownership checks.
pub(crate) fn answer_collation(
    request: &RuntimeProvider,
    budget: &ByteBudget,
    language: Option<&LanguageProvider>,
) -> Result<Option<RuntimeProviderInput>, WorldError> {
    request
        .with_collation(|binding, strings| {
            let language = language.ok_or(WorldError::ProviderKind)?;
            let bytes = strings.iter().try_fold(
                // Vector headers, order, equal groups and stable sort scratch.
                strings
                    .len()
                    .checked_mul(size_of::<Vec<u16>>() + 6 * size_of::<u32>())
                    .and_then(|bytes| bytes.checked_add(512))
                    .ok_or(HostError::Capacity)?,
                // UTF-16 allocation growth, including the minimum short buffer.
                |bytes, text| {
                    text.len()
                        .checked_mul(4)
                        .and_then(|n| n.checked_add(8))
                        .and_then(|n| bytes.checked_add(n))
                        .ok_or(HostError::Capacity)
                },
            )?;
            let custody = budget.reserve(bytes).map_err(HostError::from)?;
            let (order, groups) = language
                .collate_selected(strings)
                .map_err(WorldError::Language)?;
            Ok::<_, WorldError>(RuntimeProviderInput::collation(
                binding, order, groups, custody,
            )?)
        })?
        .transpose()
}

fn typed_digest(
    binding: GeometryBinding,
    value: &SqlCell,
    retained_bytes: usize,
    budget: &ByteBudget,
    language: Option<&LanguageProvider>,
) -> Result<RuntimeProviderInput, WorldError> {
    let language = language.ok_or(WorldError::ProviderKind)?;
    let (canonical, custody) = canonical_cell(value, retained_bytes, budget, language)?;
    Ok(RuntimeProviderInput::local_format(
        binding,
        LocalFormat::Digest(canonical),
        custody,
    )?)
}

/// Prepare the canonical bytes needed by a signature or an exact stored
/// publication. The caller owns the returned output and its allowance.
fn canonical_cell(
    value: &SqlCell,
    retained_bytes: usize,
    budget: &ByteBudget,
    language: &LanguageProvider,
) -> Result<(String, ByteReservation), WorldError> {
    // The size pass may enumerate dynamic keys. Both its scratch and the
    // sorting arrays borrow from the already funded cell, without copying it.
    let scratch = retained_bytes.checked_add(512).ok_or(HostError::Capacity)?;
    let mut custody = budget.reserve(scratch).map_err(HostError::from)?;
    let len = json_record_len(value).map_err(|_| WorldError::ProviderKind)?;
    custody
        .resize(scratch.checked_add(len).ok_or(HostError::Capacity)?)
        .map_err(HostError::from)?;
    let mut encoded = Vec::with_capacity(len);
    write_canonical_cell(value, &|a, b| language.compare_utf8(a, b), &mut encoded)
        .map_err(WorldError::Language)?;
    let canonical = String::from_utf8(encoded).map_err(|_| WorldError::ProviderKind)?;
    Ok((canonical, custody))
}

fn format_maintenance(
    binding: GeometryBinding,
    publication: &SqlCell,
    retained_bytes: usize,
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
    let reserve = files
        .len()
        .checked_mul(size_of::<u64>() + size_of::<bool>())
        .and_then(|n| n.checked_add(thoughts.len().checked_mul(size_of::<u64>())?))
        .and_then(|n| n.checked_add(512))
        .ok_or(HostError::Capacity)?;
    let mut custody = budget.reserve(reserve).map_err(HostError::from)?;
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
    let (canonical, encoded_custody) =
        canonical_cell(publication, retained_bytes, budget, language)?;
    custody.merge(encoded_custody).map_err(HostError::from)?;
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
