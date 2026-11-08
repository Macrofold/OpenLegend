//! Actual awareness SQL projections. Only received local subjects become
//! individual indexes; physical routing IDs never establish personal identity.

use super::*;
use crate::attention::AccountRecordingLaw;
use crate::reception::{EventScalar, EvidenceParticipant, ObserverSubject, SensoryFacet};
use crate::records::{RecordEncodingError, RecordSchema};

fn add_subject(ids: &mut IndexSet<String>, subject: Option<&ObserverSubject>) {
    if let Some(ObserverSubject::Individual { individual_id }) = subject {
        ids.insert(individual_id.clone());
    }
}
fn originals(
    awareness: &Awareness,
) -> impl Iterator<Item = &Arc<crate::reception::ObservationContribution>> {
    awareness
        .observation
        .iter()
        .chain(awareness.observations.iter().flatten())
}
fn individual_ids(awareness: &Awareness) -> Vec<String> {
    let mut ids = IndexSet::new();
    let mut seen = IndexSet::new();
    add_subject(&mut ids, awareness.source_subject.as_ref());
    if let Some(recognition) = &awareness.recognition {
        add_subject(&mut ids, recognition.subject.as_ref());
        add_subject(&mut ids, recognition.learned_subject.as_ref());
        ids.extend(
            recognition
                .candidates
                .iter()
                .map(|candidate| candidate.individual_id.clone()),
        );
    }
    for observation in originals(awareness) {
        if !seen.insert((&observation.id, observation.revision)) {
            continue;
        }
        for field in &observation.facets {
            match &field.value {
                SensoryFacet::Association { subject, .. } => add_subject(&mut ids, Some(subject)),
                SensoryFacet::Claim {
                    speaker: EvidenceParticipant::Individual { subject, .. },
                    ..
                } => add_subject(&mut ids, Some(subject)),
                _ => {}
            }
        }
    }
    ids.into_iter().collect()
}

fn retention_metadata(
    awareness: &Awareness,
    law: &impl AccountRecordingLaw,
) -> Result<Value, RecordEncodingError> {
    let mut aliases = IndexSet::new();
    for observation in originals(awareness) {
        aliases.insert(observation.id.clone());
    }
    let mut learning = law.learning_sources(
        awareness
            .recognition
            .as_ref()
            .and_then(|recognition| recognition.learning_support.as_deref())
            .unwrap_or(&[]),
    );
    let mut observed = IndexMap::new();
    for observation in originals(awareness) {
        for field in &observation.facets {
            let sources = match &field.value {
                SensoryFacet::Association {
                    learning_support, ..
                } => law.learning_sources(learning_support.as_deref().unwrap_or(&[])),
                SensoryFacet::PhysicalBoundary { boundary } => vec![
                    PersonalLearningSource::Evidence(boundary.near_surface.support.source.clone()),
                    PersonalLearningSource::Evidence(boundary.far_surface.support.source.clone()),
                ],
                _ => Vec::new(),
            };
            for source in sources {
                // This finite typed representation has one field order, so
                // equality does not depend on arbitrary input object ordering.
                let key = json_record(&source).map_err(|_| {
                    RecordEncodingError("Learning source identity encoding failed.")
                })?;
                observed.insert(key, source);
            }
        }
    }
    learning.extend(observed.into_values());
    let mut personal = Vec::new();
    for source in learning {
        aliases.insert(source.id().to_owned());
        if let PersonalLearningSource::Personal { kind, id } = source {
            personal.push(serde_json::json!({"kind":kind,"id":id}));
        }
    }
    // Awareness has no manifest/version-reference fields. Its original copies
    // and selected learning sources above are the complete source ownership.
    Ok(
        serde_json::json!({"aliases":aliases.into_iter().collect::<Vec<_>>(),"versions":[],"learning":personal}),
    )
}

struct AgreementMetadata {
    key: String,
    open: bool,
    until: Option<f64>,
}
fn agreement_metadata(
    awareness: &Awareness,
    law: &impl AccountRecordingLaw,
    budget: &crate::host::ByteBudget,
) -> Result<Option<AgreementMetadata>, RecordEncodingError> {
    if awareness.retention_class != AwarenessRetentionClass::Memory {
        return Ok(None);
    }
    let data = awareness.event_data.as_ref();
    let Some(EventScalar::Text(encoded)) = data.and_then(|data| data.get("agreement")) else {
        return Ok(None);
    };
    if !awareness
        .event_type
        .as_deref()
        .is_some_and(|event_type| law.agreement_event(event_type))
        && !matches!(
            data.and_then(|data| data.get("personalAgreement")),
            Some(EventScalar::Boolean(true))
        )
    {
        return Ok(None);
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Lifecycle {
        id: String,
        family: Option<String>,
        phase: Option<String>,
        status: Option<String>,
        reply_by: Option<f64>,
        expires_at: Option<f64>,
        end_at: Option<f64>,
    }
    let _json = budget
        .reserve(
            encoded
                .json_document_bound()
                .and_then(|bytes| bytes.checked_mul(2))
                .and_then(|bytes| bytes.checked_add(256))
                .ok_or(RecordEncodingError(
                    "Agreement document allowance overflowed.",
                ))?,
        )
        .map_err(|_| RecordEncodingError("Agreement document exceeds its allowance."))?;
    let document = encoded
        .json_document()
        .map_err(|_| RecordEncodingError("Invalid acquired agreement lifecycle."))?;
    let life: Lifecycle = serde_json::from_str(&document)
        .map_err(|_| RecordEncodingError("Invalid acquired agreement lifecycle."))?;
    let phase = life.phase.as_deref().or(life.status.as_deref());
    let key = json_record(&(
        life.family.as_deref().or(awareness.event_type.as_deref()),
        &life.id,
    ))
    .map_err(|_| RecordEncodingError("Agreement lookup identity encoding failed."))?;
    Ok(Some(AgreementMetadata {
        key,
        open: phase != Some("ended"),
        until: if phase == Some("pending") {
            life.reply_by.or(life.expires_at)
        } else {
            life.end_at
        },
    }))
}

pub(super) fn awareness_columns(
    awareness: &Awareness,
    header: &PersonalSourceHeader,
    payload: &str,
    law: &impl AccountRecordingLaw,
    policy: &crate::attention::AttentionRetentionPolicy,
    schema: &RecordSchema,
    budget: &crate::host::ByteBudget,
) -> Result<Vec<Value>, RecordEncodingError> {
    let mut individuals = Some(individual_ids(awareness));
    let mut retention = Some(retention_metadata(awareness, law)?);
    let agreement = agreement_metadata(awareness, law, budget)?;
    schema
        .layout("mind_awareness")?
        .columns
        .iter()
        .map(|column| {
            Ok(match column.as_str() {
                "actor_id" => Value::from(awareness.actor_id.clone()),
                "source_id" | "event_id" => Value::from(awareness.event_id.clone()),
                "at" => Value::from(awareness.at),
                "importance" => Value::from(awareness.importance),
                "kind" => Value::Null,
                "sequence" => Value::from(awareness.sequence),
                "individual_ids" => {
                    Value::from(individuals.take().expect("unique installed column"))
                }
                "retention_metadata" => retention.take().expect("unique installed column"),
                "account_revision" => Value::from(header.reference.revision.clone()),
                "logical_bytes" => Value::from(payload.len() as u64),
                "retention_class" => serde_json::to_value(header.class)
                    .map_err(|_| RecordEncodingError("Account class encoding failed."))?,
                "policy_priority" => Value::from(law.account_priority(header)),
                "active_or_protected" => Value::from(u64::from(header.protected)),
                "next_due_at" => {
                    experience_retention_due(header, policy).map_or(Value::Null, Value::from)
                }
                "retention_reason" => awareness
                    .retention
                    .as_ref()
                    .map(|retention| serde_json::to_value(retention.reason))
                    .transpose()
                    .map_err(|_| RecordEncodingError("Retention reason encoding failed."))?
                    .unwrap_or(Value::Null),
                "retention_required" => Value::from(u64::from(
                    awareness
                        .retention
                        .as_ref()
                        .and_then(|retention| retention.required)
                        == Some(true),
                )),
                "agreement_key" => agreement
                    .as_ref()
                    .map_or(Value::Null, |agreement| Value::from(agreement.key.clone())),
                "agreement_open" => Value::from(u64::from(
                    agreement.as_ref().is_some_and(|agreement| agreement.open),
                )),
                "agreement_until" => agreement
                    .as_ref()
                    .and_then(|agreement| agreement.until)
                    .map_or(Value::Null, Value::from),
                "agreement_head" => Value::from(0),
                _ => {
                    return Err(RecordEncodingError(
                        "Awareness column has no current semantic owner.",
                    ));
                }
            })
        })
        .collect()
}
