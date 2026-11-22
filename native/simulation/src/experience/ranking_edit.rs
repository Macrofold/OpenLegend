//! Replace only an exact acquired recollection’s editable text and importance.
//! The caller owns dependent invalidation when the prose changes.
use super::*;
use crate::{execution::CoreMutation, host::ByteBudget, narration::NativeText};

/// Borrow only the current canonical recollection with the selected exact revision.
pub(super) fn current_source<'a>(
    core: &'a CoreMutation<'_>,
    actor: &str,
    kind: PersonalSourceKind,
    id: &str,
    expected: &str,
) -> Result<Option<&'a Arc<PersonalSourceRecord>>, ExperienceError> {
    Ok(core
        .state
        .experience
        .optional_collection(actor, kind)?
        .and_then(|collection| {
            collection
                .lookup
                .get(id)
                .and_then(|position| collection.by_ordinal.get(position))
        })
        .filter(|record| {
            record.header.class != AccountClass::Sensory
                && record.header.reference.revision == expected
        }))
}

pub(super) enum ProseStatus {
    Stale,
    FixedSpeech,
    Unchanged,
    Changed,
}

fn awareness_changes(
    body: &memory::MemoryBody,
    wording: &RecollectionWording,
) -> Result<(bool, bool), memory::MemoryAcquisitionError> {
    let text = body
        .get::<NativeText>("text")?
        .ok_or(ExperienceError::InvalidBody("awareness text"))?;
    let content = body.get::<NativeText>("content")?;
    let changed_text = wording
        .text
        .as_ref()
        .is_some_and(|new| !matches!(&text, NativeText::Literal(prior) if prior == new));
    let changed_content = wording
        .content
        .as_ref()
        .is_some_and(|new| match (new, &content) {
            (None, None) => false,
            (Some(new), Some(NativeText::Literal(prior))) => prior != new,
            _ => true,
        });
    Ok((changed_text, changed_content))
}

pub(super) fn prose_status(
    core: &CoreMutation<'_>,
    actor: &str,
    kind: PersonalSourceKind,
    id: &str,
    expected: &str,
    wording: &RecollectionWording,
    budget: &ByteBudget,
) -> Result<ProseStatus, memory::MemoryAcquisitionError> {
    let Some(source) = current_source(core, actor, kind, id, expected)? else {
        return Ok(ProseStatus::Stale);
    };
    let _work = budget
        .reserve(memory::encoded_body_bound(source.payload())?)
        .map_err(|_| ExperienceError::Capacity)?;
    let body = memory::MemoryBody::decode(source.payload())?;
    if kind == PersonalSourceKind::Awareness {
        let (text, content) = awareness_changes(&body, wording)?;
        if !text && !content {
            return Ok(ProseStatus::Unchanged);
        }
        let event_type = body.get::<String>("eventType")?;
        if acquired_speech(
            event_type.as_deref(),
            body.contains("speech"),
            &core.state.installed.occurrence_rules.value().speech_event,
        ) {
            return Ok(ProseStatus::FixedSpeech);
        }
        return Ok(ProseStatus::Changed);
    }
    let current = body
        .get::<crate::text::JsText>(text_field(kind))?
        .ok_or(ExperienceError::InvalidBody("memory summary"))?;
    Ok(
        if wording.text.as_ref().is_some_and(|text| current != *text) {
            ProseStatus::Changed
        } else {
            ProseStatus::Unchanged
        },
    )
}

pub(super) fn replace_source(
    core: &mut CoreMutation<'_>,
    actor: &str,
    kind: PersonalSourceKind,
    id: &str,
    expected: &str,
    importance: f64,
    wording: Option<&RecollectionWording>,
    budget: &ByteBudget,
) -> Result<bool, memory::MemoryAcquisitionError> {
    let Some(before) = current_source(core, actor, kind, id, expected)?.cloned() else {
        return Ok(false);
    };
    let added = wording
        .map_or(Some(0), |wording| wording.bytes().checked_mul(12))
        .ok_or(ExperienceError::Capacity)?;
    let _work = budget
        .reserve(
            memory::encoded_body_bound(before.payload())?
                .checked_add(added)
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let mut body = memory::MemoryBody::decode(before.payload())?;
    if wording.is_none() && body.get::<f64>("importance")? == Some(importance) {
        // Repeating a successful edit still requires the exact new hash.
        return Ok(false);
    }
    body.set("importance", &importance)?;
    if let Some(wording) = wording {
        if kind == PersonalSourceKind::Awareness {
            let (text, content) = awareness_changes(&body, wording)?;
            if text {
                let updated = wording
                    .text
                    .as_ref()
                    .ok_or(crate::execution::ExecutionError::Invariant)?;
                body.set("text", updated)?;
                if !content {
                    body.set("content", updated)?;
                }
            }
            if content {
                if let Some(value) = wording.content.as_ref().and_then(Option::as_ref) {
                    body.set("content", value)?;
                } else {
                    body.remove("content");
                }
            }
        } else if let Some(text) = &wording.text {
            body.set(text_field(kind), text)?;
        }
    }
    if kind == PersonalSourceKind::Summary {
        let revision = body
            .get::<u64>("revision")?
            .unwrap_or(0)
            .checked_add(1)
            .filter(|value| *value <= crate::identity::MAX_SAFE_INTEGER)
            .ok_or(crate::execution::ExecutionError::Identity)?;
        body.set("revision", &revision)?;
    }
    let payload = body.encoded()?;
    let projected = body.projection()?;
    let state = &mut core.state;
    let policy = &state.installed.attention.value().retention;
    let law = state.installed.account_law();
    let header = header(&projected, kind, actor, &payload, &law)?;
    let columns = if kind == PersonalSourceKind::Awareness {
        let awareness: Awareness = serde_json::from_str(&payload)
            .map_err(|_| ExperienceError::InvalidBody("awareness"))?;
        super::columns::awareness_columns(
            &awareness,
            &header,
            &payload,
            &law,
            policy,
            &state.installed.schema,
            budget,
        )
        .map_err(|_| memory::MemoryAcquisitionError::Encoding)?
    } else {
        memory::memory_columns(
            &projected,
            &header,
            &payload,
            &law,
            policy,
            &state.installed.schema,
        )?
    };
    let extra = columns.into_iter().map(Into::into).collect();
    let after = PersonalSourceRecord::install(
        kind,
        actor,
        InstalledRow {
            id: before.row_id.clone(),
            parent: before.parent.clone(),
            slot: before.slot.clone(),
            position: before.position,
            payload,
            extra,
        },
        &law,
        budget,
    )?;
    state.temporal.adjust_account(
        actor,
        before.header.class,
        -(before.payload.len() as i128),
        -1,
        None,
        state.physical.header.sim_time,
        policy,
    )?;
    state.temporal.adjust_account(
        actor,
        after.header.class,
        after.payload.len() as i128,
        1,
        experience_retention_due(&after.header, policy),
        state.physical.header.sim_time,
        policy,
    )?;
    core.journal
        .experience
        .replace(&mut state.experience, &before.header.reference, after)?;
    if wording.is_some() {
        // The enclosing invalidation advances the actor and physical revisions.
        return Ok(true);
    }
    // An independent reader can outlast eviction of the replacement. Renew
    // this actor's read fence without withdrawing its accepted derived text.
    core.journal
        .experience
        .advance_privacy_revision(&mut state.experience, actor)?;
    state.physical.header.native_interval = None;
    state.physical.header.sequence = state
        .physical
        .header
        .sequence
        .checked_add(1)
        .filter(|revision| *revision <= crate::identity::MAX_SAFE_INTEGER)
        .ok_or(crate::execution::ExecutionError::Identity)?;
    Ok(true)
}

fn text_field(kind: PersonalSourceKind) -> &'static str {
    match kind {
        PersonalSourceKind::Memory => "summary",
        PersonalSourceKind::Summary | PersonalSourceKind::Awareness => "text",
    }
}
