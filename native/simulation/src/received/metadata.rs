//! Metadata visits actual original fields and immutable values. It does not
//! reconstruct public proof trees to discover dependencies or grant reception.

use indexmap::IndexSet;

use crate::experience::personal_fact_alias;
use crate::reception::{ObservationFactKey, ObserverSubject, SensoryFacet};

use super::{
    ReceivedBatch, ReceivedChargeDirectory, ReceivedChargeEntry, ReceivedEntry, ReceivedError,
    ReceivedFact, ReceivedProof, ReceivedReceipt, ReceivedValueFragment, ReceivedValues,
    received_record_value_references,
};

/// The installed world's native recognition owner supplies its support-key law.
/// This is a trusted compiled meaning, never a callback to a TypeScript world.
pub trait TemporalValueMeaning {
    fn recognition_support_source_ids(&self, keys: &[String])
    -> Result<Vec<String>, ReceivedError>;
}

fn fact_alias(id: &str, ordinal: u64) -> Result<String, ReceivedError> {
    personal_fact_alias(id, ordinal).map_err(|_| ReceivedError("Invalid received fact alias."))
}

pub fn temporal_value_dependency_aliases(
    value: &ReceivedValueFragment,
    meaning: Option<&dyn TemporalValueMeaning>,
) -> Result<Vec<String>, ReceivedError> {
    let mut aliases = IndexSet::new();
    match value {
        ReceivedValueFragment::Sensory(SensoryFacet::Association {
            learning_support, ..
        }) => {
            if let Some(meaning) = meaning {
                aliases.extend(
                    meaning.recognition_support_source_ids(
                        learning_support.as_deref().unwrap_or(&[]),
                    )?,
                );
            }
        }
        ReceivedValueFragment::Sensory(SensoryFacet::Claim {
            support,
            support_aliases,
            ..
        }) => {
            for key in support {
                aliases.insert(key.source.id.clone());
                aliases.insert(fact_alias(&key.source.id, key.ordinal)?);
                aliases.extend(
                    support_aliases
                        .iter()
                        .flatten()
                        .map(|alias| alias.id.clone()),
                );
            }
        }
        ReceivedValueFragment::Sensory(SensoryFacet::PhysicalBoundary { boundary }) => {
            for key in [
                &boundary.near_surface.support,
                &boundary.far_surface.support,
            ] {
                aliases.insert(key.source.id.clone());
                aliases.insert(fact_alias(&key.source.id, key.ordinal)?);
            }
        }
        _ => {}
    }
    Ok(aliases.into_iter().collect())
}

pub fn temporal_value_individual_id(value: &ReceivedValueFragment) -> Option<&str> {
    match value {
        ReceivedValueFragment::Sensory(SensoryFacet::Association {
            subject: ObserverSubject::Individual { individual_id },
            ..
        }) => Some(individual_id),
        ReceivedValueFragment::Sensory(SensoryFacet::Event {
            source_subject: Some(ObserverSubject::Individual { individual_id }),
            ..
        }) => Some(individual_id),
        _ => None,
    }
}

fn insert_compact_fact(
    aliases: &mut IndexSet<String>,
    record: &ReceivedReceipt,
    fact: Option<ReceivedFact>,
) -> Result<(), ReceivedError> {
    if let Some(ReceivedFact(index, ordinal)) = fact
        && let Some(source) = record.sources.get(index as usize)
    {
        aliases.insert(source.id.clone());
        aliases.insert(fact_alias(&source.id, ordinal)?);
    }
    Ok(())
}

fn insert_proof(
    aliases: &mut IndexSet<String>,
    record: &ReceivedReceipt,
    proof: Option<&ReceivedProof>,
    original: Option<ReceivedFact>,
    received_from: Option<u64>,
) -> Result<(), ReceivedError> {
    if let Some(proof) = proof {
        insert_compact_fact(aliases, record, proof.original.or(original))?;
        if let Some(index) = proof.confirmation.or(received_from)
            && let Some(source) = record.sources.get(index as usize)
        {
            aliases.insert(source.id.clone());
        }
        aliases.extend(proof.aliases.iter().flatten().cloned());
    }
    Ok(())
}

pub fn received_record_aliases(
    owner: &ReceivedBatch,
    entry: &ReceivedEntry,
    values: &ReceivedValues,
    meaning: Option<&dyn TemporalValueMeaning>,
) -> Result<Vec<String>, ReceivedError> {
    received_record_aliases_with_sources(owner, entry, values, meaning, true)
}

fn received_record_aliases_with_sources(
    owner: &ReceivedBatch,
    entry: &ReceivedEntry,
    values: &ReceivedValues,
    meaning: Option<&dyn TemporalValueMeaning>,
    include_source_ids: bool,
) -> Result<Vec<String>, ReceivedError> {
    let record = &entry.receipt;
    let id = owner.locator(entry.entry_index).id();
    let mut aliases: IndexSet<String> = if include_source_ids {
        record.header.source_ids.iter().cloned().collect()
    } else {
        IndexSet::new()
    };
    aliases.insert(id.clone());
    for field in &record.facets {
        aliases.insert(fact_alias(&id, field.member_index)?);
        insert_compact_fact(&mut aliases, record, field.original)?;
        insert_proof(
            &mut aliases,
            record,
            field.support.as_ref(),
            field.original,
            field.received_from,
        )?;
        insert_proof(
            &mut aliases,
            record,
            field.detail.as_ref().map(|detail| &detail.proof),
            field.original,
            field.received_from,
        )?;
        if let Some(index) = field.received_from
            && let Some(source) = record.sources.get(index as usize)
        {
            aliases.insert(source.id.clone());
        }
        if let Some(value) = values.value_at(&field.value_ref) {
            aliases.extend(temporal_value_dependency_aliases(value, meaning)?);
        }
    }
    Ok(aliases.into_iter().collect())
}

/// Whole-account aliases exclude directional facet provenance. This is the
/// compact interpretation of temporalReceiptAccountAliases, with no expanded
/// receipt/body allocation and exactly the same dependency owner as metadata.
pub(crate) fn received_record_account_aliases<'a>(
    owner: &ReceivedBatch,
    entry: &'a ReceivedEntry,
    values: &ReceivedValues,
    meaning: &dyn TemporalValueMeaning,
) -> Result<Vec<&'a str>, ReceivedError> {
    let dependencies =
        received_record_aliases_with_sources(owner, entry, values, Some(meaning), false)?
            .into_iter()
            .collect::<IndexSet<_>>();
    let event = match &entry.receipt.origin {
        Some(super::ReceivedOrigin::Occurrence { event_id, .. }) => Some(event_id.as_str()),
        _ => None,
    };
    Ok(entry
        .receipt
        .header
        .source_ids
        .iter()
        .filter(|id| event == Some(id.as_str()) || !dependencies.contains(*id))
        .map(String::as_str)
        .collect())
}

pub fn received_record_individual_ids(
    record: &ReceivedReceipt,
    values: &ReceivedValues,
) -> Vec<String> {
    let mut ids = IndexSet::new();
    if let Some(ObserverSubject::Individual { individual_id }) = &record.header.subject_identity {
        ids.insert(individual_id.clone());
    }
    for field in &record.facets {
        if let Some(id) = values
            .value_at(&field.value_ref)
            .and_then(temporal_value_individual_id)
        {
            ids.insert(id.to_owned());
        }
    }
    ids.into_iter().collect()
}

pub fn received_batch_charge_directory(
    batch: &ReceivedBatch,
    values: &ReceivedValues,
    meaning: Option<&dyn TemporalValueMeaning>,
) -> Result<ReceivedChargeDirectory, ReceivedError> {
    let mut individual_ids = IndexSet::new();
    let mut source_ids = IndexSet::new();
    let mut references = IndexSet::new();
    for entry in &batch.entries {
        individual_ids.extend(received_record_individual_ids(&entry.receipt, values));
        source_ids.extend(received_record_aliases(batch, entry, values, meaning)?);
        references.extend(received_record_value_references(&entry.receipt, None));
    }
    let mut bytes = crate::encoding::json_record(batch)
        .map_err(|_| ReceivedError("Received batch encoding failed."))?
        .len() as u64;
    for reference in references {
        let value_bytes = values.shared_value_bytes(reference).ok_or(ReceivedError(
            "Received block has an unavailable owned value.",
        ))?;
        bytes += value_bytes;
    }
    let entries = match (batch.entries.first(), batch.entries.last()) {
        (Some(first), Some(last)) => vec![ReceivedChargeEntry {
            batch_order: batch.batch_order,
            first_entry: first.entry_index,
            entry_index: last.entry_index,
            last_member: last
                .receipt
                .facets
                .iter()
                .map(|field| field.member_index)
                .max()
                .unwrap_or(0),
            at: batch
                .entries
                .iter()
                .map(|entry| entry.received_at)
                .fold(f64::INFINITY, f64::min),
            through_at: batch
                .entries
                .iter()
                .map(|entry| entry.received_at)
                .fold(f64::NEG_INFINITY, f64::max),
            order: last.order,
            bytes,
            count: batch.entries.iter().map(|entry| entry.charge.count).sum(),
            individual_ids: individual_ids.into_iter().collect(),
            source_ids: source_ids.into_iter().collect(),
        }],
        _ => Vec::new(),
    };
    Ok(ReceivedChargeDirectory {
        actor_id: batch.actor_id.clone(),
        physical_life: batch.physical_life,
        epoch: batch.epoch.clone(),
        entries,
    })
}

pub fn observation_fact_aliases(key: &ObservationFactKey) -> Result<[String; 2], ReceivedError> {
    Ok([
        key.source.id.clone(),
        fact_alias(&key.source.id, key.ordinal)?,
    ])
}
