//! Replace only an exact acquired recollection’s editable text and importance.
//! The caller owns dependent invalidation when the prose changes.
use super::*;
use crate::{execution::CoreMutation, host::ByteBudget};

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
        .filter(|record| record.header.reference.revision == expected))
}

pub(super) fn prose_changed(
    core: &CoreMutation<'_>,
    actor: &str,
    kind: PersonalSourceKind,
    id: &str,
    expected: &str,
    text: &crate::text::JsText,
    budget: &ByteBudget,
) -> Result<Option<bool>, memory::MemoryAcquisitionError> {
    let Some(memory) = current_source(core, actor, kind, id, expected)? else {
        return Ok(None);
    };
    let _work = budget
        .reserve(memory::encoded_body_bound(memory.payload())?)
        .map_err(|_| ExperienceError::Capacity)?;
    let body = memory::MemoryBody::decode(memory.payload())?;
    let current = body
        .get::<crate::text::JsText>(text_field(kind))?
        .ok_or(ExperienceError::InvalidBody("memory summary"))?;
    Ok(Some(current != *text))
}

pub(super) fn replace_source(
    core: &mut CoreMutation<'_>,
    actor: &str,
    kind: PersonalSourceKind,
    id: &str,
    expected: &str,
    importance: f64,
    text: Option<&crate::text::JsText>,
    budget: &ByteBudget,
) -> Result<bool, memory::MemoryAcquisitionError> {
    let Some(before) = current_source(core, actor, kind, id, expected)?.cloned() else {
        return Ok(false);
    };
    let added = text
        .map_or(Some(0), |text| text.storage_bytes().checked_mul(12))
        .ok_or(ExperienceError::Capacity)?;
    let _work = budget
        .reserve(
            memory::encoded_body_bound(before.payload())?
                .checked_add(added)
                .ok_or(ExperienceError::Capacity)?,
        )
        .map_err(|_| ExperienceError::Capacity)?;
    let mut body = memory::MemoryBody::decode(before.payload())?;
    if text.is_none() && body.get::<f64>("importance")? == Some(importance) {
        // Repeating a successful edit still requires the exact new hash.
        return Ok(false);
    }
    body.set("importance", &importance)?;
    if let Some(text) = text {
        body.set(text_field(kind), text)?;
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
    let extra = memory::memory_columns(
        &projected,
        &header,
        &payload,
        &law,
        policy,
        &state.installed.schema,
    )?
    .into_iter()
    .map(Into::into)
    .collect();
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
    if text.is_some() {
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
