//! Fallible personal interpretations retain dated receipt provenance, not an
//! exact observation or a new body permission. Reading never reinforces them.
use super::*;
use crate::attention::{AccountRecordingInput, AccountRecordingLaw, RecordingSource};
use crate::execution::{CoreMutation, ExecutionError};
use crate::host::retained_size::{HeapBytes, heap_sum};
use crate::host::{ByteBudget, ByteReservation};
use crate::received::{
    CapturedTemporalReceipt, TemporalReceiptSource, temporal_receipt_aliases,
    temporal_receipt_aliases_bound, temporal_receipt_source,
};
use crate::text::JsText;
use std::mem::size_of;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Coordinate {
    batch_order: u64,
    entry_index: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Provenance<'a> {
    actor_id: &'a str,
    physical_life: u64,
    epoch: &'a str,
    family: &'static str,
    from: Coordinate,
    through: Coordinate,
}
#[derive(Serialize)]
struct Interpretation<'a> {
    kind: &'static str,
    text: &'a JsText,
}
#[derive(Serialize)]
struct Dependency<'a> {
    source: TemporalReceiptSource<'a>,
    ordinal: Option<u64>,
    aliases: Vec<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Impression<'a> {
    version: u64,
    from: f64,
    through: f64,
    claims: [Interpretation<'a>; 1],
    provenance: Vec<Provenance<'a>>,
    dependencies: Vec<Dependency<'a>>,
    reason: RetentionReason,
    created_at: f64,
    reinforced_at: f64,
    weaken_at: f64,
    expires_at: f64,
    weakened: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Record<'a> {
    id: &'a str,
    actor_id: &'a str,
    kind: &'static str,
    source: &'static str,
    summary: &'a JsText,
    at: f64,
    entity_ids: [String; 0],
    importance: f64,
    impression: Impression<'a>,
}

pub(crate) fn remember_interpretation(
    core: &mut CoreMutation<'_>,
    actor: &str,
    id: &str,
    text: &JsText,
    received: &[&CapturedTemporalReceipt],
    budget: &ByteBudget,
) -> Result<bool, ExecutionError> {
    if !core
        .state
        .physical
        .entities
        .get(actor)
        .is_some_and(|e| e.has_memory())
        || core.state.experience.actor(actor).is_none()
        || text.trim_is_empty()
        || text.units_len() > 1200
        || received.is_empty()
        || received.len() > 8
    {
        return Ok(false);
    }
    let installed = core.state.installed.clone();
    let law = installed.account_law();
    if law.account_after_release(AccountRecordingInput {
        source: RecordingSource::Summary,
        own: true,
        event_type: None,
        activity: None,
    }) != AccountAfterRelease::Impression
    {
        return Ok(false);
    }
    let now = core.state.physical.header.sim_time;
    let privacy = &core
        .state
        .experience
        .actor(actor)
        .ok_or(ExecutionError::Invariant)?
        .privacy;
    if received.iter().any(|capture| {
        let receipt = capture.receipt();
        receipt.locator.actor_id != actor
            || receipt.at > now
            || receipt.facets.len() != capture.fragments().len()
            || receipt
                .header
                .source_ids
                .iter()
                .any(|id| privacy.revoked(id))
    }) {
        return Ok(false);
    }
    let mut bound = heap_sum([
        text.heap_bytes().ok_or(ExecutionError::Capacity)?,
        received
            .len()
            .checked_mul(size_of::<Provenance>() + size_of::<Dependency>() + 2 * size_of::<&str>())
            .ok_or(ExecutionError::Capacity)?,
    ])
    .ok_or(ExecutionError::Capacity)?;
    for capture in received {
        bound = bound
            .checked_add(
                temporal_receipt_aliases_bound(capture.receipt(), capture.fragments(), &law)
                    .ok_or(ExecutionError::Capacity)?,
            )
            .ok_or(ExecutionError::Capacity)?;
    }
    let _proof_guard = budget.reserve(bound)?;
    let mut seen = Vec::<&str>::with_capacity(received.len());
    let mut dependencies = Vec::with_capacity(received.len());
    let mut provenance = Vec::with_capacity(received.len());
    let mut from = f64::INFINITY;
    let mut through = f64::NEG_INFINITY;
    for capture in received {
        let receipt = capture.receipt();
        for (field, value) in receipt.facets.iter().zip(capture.fragments()) {
            if !evidence::temporal_facet_eligible(
                &core.state.experience,
                actor,
                field,
                value,
                &law,
            )? {
                return Ok(false);
            }
        }
        from = from.min(receipt.at);
        through = through.max(receipt.at);
        if seen.contains(&receipt.id.as_str()) {
            continue;
        }
        seen.push(&receipt.id);
        let aliases = temporal_receipt_aliases(
            receipt,
            &core.state.reception.received_values.as_ref(),
            &law,
            Some(capture.fragments()),
        )?;
        dependencies.push(Dependency {
            source: temporal_receipt_source(&receipt.locator, &receipt.id),
            ordinal: None,
            aliases: aliases.into_iter().collect(),
        });
        provenance.push(Provenance {
            actor_id: actor,
            physical_life: receipt.locator.physical_life,
            epoch: &receipt.locator.epoch,
            family: "temporal-receipt",
            from: Coordinate {
                batch_order: receipt.locator.batch_order,
                entry_index: receipt.locator.entry_index,
            },
            through: Coordinate {
                batch_order: receipt.locator.batch_order,
                entry_index: receipt.locator.entry_index,
            },
        });
    }
    let policy = &installed.attention.value().retention;
    let limits = &policy.impression;
    let weaken_at = through + limits.weaken_after_seconds;
    let expires_at = through + limits.expire_after_seconds;
    // Arbitrary prose disappears as a whole when it weakens; this factory has
    // no native occurrence claim that could survive that loss.
    if expires_at <= now
        || weaken_at <= now
        || limits.max_claims < 1
        || provenance.len() as u64 > limits.max_spans
    {
        return Ok(false);
    }
    let summary = text.trimmed();
    let record = Record {
        id,
        actor_id: actor,
        kind: "impression",
        source: "inferred",
        summary: &summary,
        at: through,
        entity_ids: [],
        importance: installed
            .occurrence_rules
            .value()
            .response
            .interpretation
            .importance,
        impression: Impression {
            version: 1,
            from,
            through,
            claims: [Interpretation {
                kind: "interpretation",
                text: &summary,
            }],
            provenance,
            dependencies,
            reason: RetentionReason::Deliberate,
            created_at: now,
            reinforced_at: through,
            weaken_at,
            expires_at,
            weakened: false,
        },
    };
    let bytes = crate::encoding::json_record_len(&record).map_err(|_| ExecutionError::Invariant)?;
    if bytes as u64 > limits.max_bytes {
        return Ok(false);
    }
    let mut quota = core.state.temporal.account_addition_budget(actor)?;
    if !quota.reserve(AccountClass::Optional, bytes as u64, policy)? {
        return Ok(false);
    }
    let collection = core
        .state
        .experience
        .actor(actor)
        .ok_or(ExecutionError::Invariant)?
        .collection(PersonalSourceKind::Memory)?;
    if collection.get(id)?.is_some() || privacy.is_forgotten(id) {
        return Ok(false);
    }
    let _encoding_guard = budget.reserve(bytes.checked_mul(2).ok_or(ExecutionError::Capacity)?)?;
    let payload = crate::encoding::json_record(&record).map_err(|_| ExecutionError::Invariant)?;
    let record = install_record(core, actor, id, payload, None, None, budget)?;
    core.journal.experience.ensure_collection(
        &mut core.state.experience,
        PersonalSourceKind::Memory,
        actor,
    )?;
    core.state.temporal.adjust_account(
        actor,
        AccountClass::Optional,
        record.payload.len() as i128,
        1,
        experience_retention_due(record.header(), policy),
        now,
        policy,
    )?;
    core.journal
        .experience
        .append(&mut core.state.experience, record)?;
    // The newly constructed interpretation has no location/original/manifest
    // field, so the actual known-place capsule visitor has no new place proof.
    Ok(true)
}

pub(super) fn install_record(
    core: &CoreMutation<'_>,
    actor: &str,
    id: &str,
    payload: String,
    prior: Option<&PersonalSourceRecord>,
    slot: Option<u64>,
    budget: &ByteBudget,
) -> Result<PersonalSourceRecord, ExecutionError> {
    let _decoding = budget.reserve(encoded_body_bound(&payload)?)?;
    let body = memory::MemoryBody::decode(&payload)?;
    let projected = body.projection()?;
    let law = core.state.installed.account_law();
    let header = memory::source_header(&projected, actor, &payload, &law)?;
    let extra = memory::memory_columns(
        &projected,
        &header,
        &payload,
        &law,
        &core.state.installed.attention.value().retention,
        &core.state.installed.schema,
    )?
    .into_iter()
    .map(Into::into)
    .collect();
    let position = match prior {
        Some(prior) => prior.position(),
        None => {
            core.state
                .experience
                .actor(actor)
                .ok_or(ExecutionError::Invariant)?
                .collection(PersonalSourceKind::Memory)?
                .coverage
                .next_ordinal
        }
    };
    let row = InstalledRow {
        id: match prior {
            Some(prior) => prior.row_id().into(),
            None => json_record(&["world", "memories", actor, id])
                .map_err(|_| ExecutionError::Invariant)?,
        },
        parent: match prior {
            Some(prior) => prior.parent().into(),
            None => collection_owner(PersonalSourceKind::Memory, actor)?,
        },
        slot: slot.unwrap_or(position).to_string(),
        position,
        payload,
        extra,
    };
    Ok(PersonalSourceRecord::install(
        PersonalSourceKind::Memory,
        actor,
        row,
        &law,
        budget,
    )?)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reinforcement {
    reinforced_at: f64,
    weakened: bool,
    expires_at: f64,
}
pub(crate) fn reinforce_experience(
    core: &mut CoreMutation<'_>,
    actor: &str,
    source_ids: &[String],
    budget: &ByteBudget,
) -> Result<(), ExecutionError> {
    if source_ids.is_empty() {
        return Ok(());
    }
    let Some(collection) = core
        .state
        .experience
        .optional_collection(actor, PersonalSourceKind::Memory)?
    else {
        return Ok(());
    };
    // Source reinforces only the memories included in its working collection.
    // An unrelated evidence ID needs no negative historical lookup, and a
    // detached cold read does not itself request a canonical reinforcement.
    let count = collection
        .records()
        .filter(|record| {
            source_ids.contains(&record.header.reference.id)
                && record.header.record_kind.as_deref() == Some("impression")
        })
        .count();
    let _selection = budget.reserve(
        count
            .checked_mul(size_of::<Arc<PersonalSourceRecord>>())
            .ok_or(ExecutionError::Capacity)?,
    )?;
    let selected: Vec<_> = collection
        .records()
        .filter(|record| {
            source_ids.contains(&record.header.reference.id)
                && record.header.record_kind.as_deref() == Some("impression")
        })
        .cloned()
        .collect();
    let installed = core.state.installed.clone();
    let policy = &installed.attention.value().retention;
    let limits = &policy.impression;
    let now = core.state.physical.header.sim_time;
    for prior in selected {
        let _guard = budget.reserve(
            encoded_body_bound(prior.payload())?
                .checked_add(
                    prior
                        .payload()
                        .len()
                        .checked_mul(2)
                        .ok_or(ExecutionError::Capacity)?,
                )
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let mut body = memory::MemoryBody::decode(prior.payload())?;
        let Some(value) = body.get::<Reinforcement>("impression")? else {
            continue;
        };
        if value.expires_at <= now || now - value.reinforced_at < limits.reinforce_interval_seconds
        {
            continue;
        }
        let mut impression: IndexMap<String, Box<serde_json::value::RawValue>> =
            body.get("impression")?.ok_or(ExecutionError::Invariant)?;
        for (field, value) in [
            ("reinforcedAt", now),
            (
                "weakenAt",
                if value.weakened {
                    now
                } else {
                    now + limits.weaken_after_seconds
                },
            ),
            ("expiresAt", now + limits.expire_after_seconds),
        ] {
            impression.insert(
                field.into(),
                serde_json::value::RawValue::from_string(
                    json_record(&value).map_err(|_| ExecutionError::Invariant)?,
                )
                .map_err(|_| ExecutionError::Invariant)?,
            );
        }
        body.set("impression", &impression)?;
        let payload = body.encoded()?;
        let delta = payload.len() as i128 - prior.payload().len() as i128;
        let accounts = core
            .state
            .temporal
            .actor(actor)
            .and_then(|actor| actor.header().accounts.as_ref())
            .ok_or(ExperienceError::Unavailable)?;
        if delta > 0
            && (accounts.optional.bytes as f64 + delta as f64)
                > policy.optional.max_bytes as f64 * (1.0 + policy.maintenance_headroom)
        {
            continue;
        }
        let after = install_record(
            core,
            actor,
            &prior.header.reference.id,
            payload,
            Some(&prior),
            None,
            budget,
        )?;
        core.state.temporal.adjust_account(
            actor,
            prior.header.class,
            -(prior.payload().len() as i128),
            -1,
            None,
            now,
            policy,
        )?;
        core.state.temporal.adjust_account(
            actor,
            after.header.class,
            after.payload().len() as i128,
            1,
            experience_retention_due(after.header(), policy),
            now,
            policy,
        )?;
        core.journal.experience.replace(
            &mut core.state.experience,
            &prior.header.reference,
            after,
        )?;
    }
    Ok(())
}
