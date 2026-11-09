//! Read-only projections of the same immutable MemoryRecord. Routing entity IDs
//! never enter the personal-individual index or become learned identities.

use super::*;
use crate::reception::{
    EncounterExposure, ObservationContribution, ObservationOrigin, SensoryFacet,
};

fn child<'a>(
    body: &'a Map<String, Value>,
    key: &'static str,
) -> Result<Option<&'a Map<String, Value>>, ExperienceError> {
    body.get(key).map(object).transpose()
}
fn array<'a>(
    body: &'a Map<String, Value>,
    key: &'static str,
) -> Result<&'a [Value], ExperienceError> {
    body.get(key)
        .map(|value| {
            value
                .as_array()
                .map(Vec::as_slice)
                .ok_or(ExperienceError::InvalidBody(key))
        })
        .transpose()
        .map(|value| value.unwrap_or(&[]))
}
fn add_originals<'a>(
    result: &mut Vec<&'a Value>,
    body: &'a Map<String, Value>,
) -> Result<(), ExperienceError> {
    if let Some(original) = body.get("observation") {
        result.push(original)
    }
    result.extend(array(body, "observations")?);
    Ok(())
}
fn originals(
    body: &Map<String, Value>,
    evidence_first: bool,
) -> Result<Vec<&Value>, ExperienceError> {
    let evidence = child(body, "evidence")?;
    let manifest = child(body, "manifest")?;
    let mut result = Vec::new();
    if evidence_first {
        if let Some(evidence) = evidence {
            add_originals(&mut result, evidence)?
        }
    }
    add_originals(&mut result, body)?;
    if !evidence_first {
        if let Some(evidence) = evidence {
            add_originals(&mut result, evidence)?
        }
    }
    if let Some(manifest) = manifest {
        result.extend(array(manifest, "observations")?)
    }
    Ok(result)
}
fn add_subject(ids: &mut IndexSet<String>, value: Option<&Value>) -> Result<(), ExperienceError> {
    if let Some(value) = value {
        let subject = object(value)?;
        if text(subject, "kind")? == "individual" {
            ids.insert(text(subject, "individualId")?.to_owned());
        }
    }
    Ok(())
}
fn recognition_ids(
    ids: &mut IndexSet<String>,
    body: &Map<String, Value>,
) -> Result<(), ExperienceError> {
    add_subject(ids, body.get("sourceSubject"))?;
    if let Some(recognition) = child(body, "recognition")? {
        add_subject(ids, recognition.get("subject"))?;
        add_subject(ids, recognition.get("learnedSubject"))?;
        for candidate in array(recognition, "candidates")? {
            ids.insert(text(object(candidate)?, "individualId")?.to_owned());
        }
    }
    Ok(())
}
fn individual_ids(body: &Map<String, Value>) -> Result<Vec<String>, ExperienceError> {
    let mut ids = IndexSet::new();
    let mut seen = IndexSet::new();
    if let Some(evidence) = child(body, "evidence")? {
        recognition_ids(&mut ids, evidence)?
    }
    for observation in originals(body, true)? {
        let observation = object(observation)?;
        let key = (
            text(observation, "id")?.to_owned(),
            integer(observation, "revision")?,
        );
        if !seen.insert(key) {
            continue;
        }
        for facet in array(observation, "facets")? {
            let value = object(
                object(facet)?
                    .get("value")
                    .ok_or(ExperienceError::InvalidBody("facet.value"))?,
            )?;
            match text(value, "kind")? {
                "association" => add_subject(&mut ids, value.get("subject"))?,
                "claim" => {
                    let speaker = object(
                        value
                            .get("speaker")
                            .ok_or(ExperienceError::InvalidBody("claim.speaker"))?,
                    )?;
                    if text(speaker, "kind")? == "individual" {
                        add_subject(&mut ids, speaker.get("subject"))?
                    }
                }
                _ => {}
            }
        }
    }
    if let Some(manifest) = child(body, "manifest")? {
        for group in array(manifest, "speech")? {
            add_subject(&mut ids, object(group)?.get("sourceSubject"))?
        }
    }
    if let Some(impression) = child(body, "impression")? {
        for claim in array(impression, "claims")? {
            let claim = object(claim)?;
            if text(claim, "kind")? == "occurrence" {
                add_subject(&mut ids, claim.get("subject"))?
            }
        }
    }
    Ok(ids.into_iter().collect())
}
fn retention_metadata(
    body: &Map<String, Value>,
    law: &impl AccountRecordingLaw,
) -> Result<Value, MemoryAcquisitionError> {
    if text(body, "kind")? == "impression" {
        return Ok(serde_json::json!({"aliases":[],"versions":[],"learning":[]}));
    }
    let originals = originals(body, false)?;
    let mut aliases = IndexSet::new();
    let mut versions = IndexMap::new();
    let mut add = |value: &Value| -> Result<(), MemoryAcquisitionError> {
        let source: PersonalSourceRef = serde_json::from_value(value.clone())
            .map_err(|_| ExperienceError::InvalidBody("manifest personal source"))?;
        if !source.validate() {
            return Err(ExperienceError::InvalidBody("manifest personal source").into());
        }
        aliases.insert(source.id.clone());
        let key = json_record(&(&source.kind, &source.id, &source.revision))
            .map_err(|_| MemoryAcquisitionError::Encoding)?;
        versions.insert(key, source);
        Ok(())
    };
    if let Some(manifest) = child(body, "manifest")? {
        for source in array(manifest, "coverage")? {
            add(source)?
        }
        for speech in array(manifest, "speech")? {
            for source in array(object(speech)?, "sources")? {
                add(source)?
            }
        }
    }
    for original in &originals {
        aliases.insert(text(object(original)?, "id")?.to_owned());
    }
    let mut learning = if let Some(recognition) = child(body, "evidence")?
        .map(|evidence| child(evidence, "recognition"))
        .transpose()?
        .flatten()
    {
        law.learning_sources(
            &recognition
                .get("learningSupport")
                .map(|value| strings(value, "learningSupport"))
                .transpose()?
                .unwrap_or_default(),
        )
    } else {
        Vec::new()
    };
    let mut observed = IndexMap::new();
    for observation in originals {
        for field in array(object(observation)?, "facets")? {
            let value = object(
                object(field)?
                    .get("value")
                    .ok_or(ExperienceError::InvalidBody("facet.value"))?,
            )?;
            let sources = match text(value, "kind")? {
                "association" => law.learning_sources(
                    &value
                        .get("learningSupport")
                        .map(|value| strings(value, "learningSupport"))
                        .transpose()?
                        .unwrap_or_default(),
                ),
                "physical-boundary" => {
                    let boundary = object(
                        value
                            .get("boundary")
                            .ok_or(ExperienceError::InvalidBody("boundary"))?,
                    )?;
                    let mut sources = Vec::new();
                    for side in ["nearSurface", "farSurface"] {
                        let side = object(
                            boundary
                                .get(side)
                                .ok_or(ExperienceError::InvalidBody("boundary side"))?,
                        )?;
                        let support = object(
                            side.get("support")
                                .ok_or(ExperienceError::InvalidBody("boundary support"))?,
                        )?;
                        let source: EvidenceSource = serde_json::from_value(
                            support
                                .get("source")
                                .ok_or(ExperienceError::InvalidBody("boundary source"))?
                                .clone(),
                        )
                        .map_err(|_| ExperienceError::InvalidBody("boundary source"))?;
                        sources.push(PersonalLearningSource::Evidence(source));
                    }
                    sources
                }
                _ => Vec::new(),
            };
            for source in sources {
                let key = json_record(&source).map_err(|_| MemoryAcquisitionError::Encoding)?;
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
    Ok(
        serde_json::json!({"aliases":aliases.into_iter().collect::<Vec<_>>(),"versions":versions.into_values().collect::<Vec<_>>(),"learning":personal}),
    )
}
pub(super) fn context_subjects(body: &Map<String, Value>) -> Result<Vec<String>, ExperienceError> {
    // Automatic admission considers the memory's direct originals; an evidence
    // envelope or consolidated manifest does not invent current event context.
    let mut observations = Vec::new();
    add_originals(&mut observations, body)?;
    let mut subjects = IndexSet::new();
    for observation in observations {
        if let Some(context) = child(object(observation)?, "context")? {
            for subject in array(context, "subjects")? {
                subjects.insert(text(object(subject)?, "track")?.to_owned());
            }
        }
    }
    Ok(subjects.into_iter().collect())
}
pub(super) fn known_place_capsules(
    body: &Map<String, Value>,
    inputs: Vec<ObservationContribution>,
    actor_id: &str,
    through: f64,
) -> Result<Vec<KnownPlaceCapsule>, MemoryAcquisitionError> {
    if child(body, "evidence")?
        .is_some_and(|evidence| evidence.get("actorId").and_then(Value::as_str) != Some(actor_id))
    {
        return Err(ExperienceError::ForeignOwner.into());
    }
    let mut places = IndexMap::new();
    for input in inputs {
        let original = input;
        if original.observer.actor_id != actor_id || original.acquired_at > through {
            return Err(ExperienceError::ForeignOwner.into());
        }
        // This is a newly produced native copy, not external source authority.
        // Preserve complete typed fields and validate their actual semantics.
        crate::reception::validate_observation_contribution(&original)?;
        let ObservationOrigin::Occurrence { event_id, .. } = &original.origin else {
            continue;
        };
        for facet in &original.facets {
            if let SensoryFacet::EncounterExposure {
                exposure: exposure @ EncounterExposure::Place { .. },
            } = &facet.value
            {
                let capsule =
                    super::super::places::place_capsule(&original, exposure, event_id, None)?
                        .ok_or(ExperienceError::InvalidBody("retained place original"))?;
                let key = json_record(&(&capsule.source, capsule.facet_ordinal))
                    .map_err(|_| MemoryAcquisitionError::Encoding)?;
                places.insert(key, capsule);
            }
        }
    }
    Ok(places.into_values().collect())
}
pub(in super::super) fn memory_columns(
    body: &Map<String, Value>,
    header: &PersonalSourceHeader,
    payload: &str,
    law: &impl AccountRecordingLaw,
    policy: &crate::attention::AttentionRetentionPolicy,
    schema: &RecordSchema,
) -> Result<Vec<Value>, MemoryAcquisitionError> {
    let mut individuals = Some(individual_ids(body)?);
    let mut retention = Some(retention_metadata(body, law)?);
    schema
        .layout("mind_memories")
        .map_err(|_| MemoryAcquisitionError::Encoding)?
        .columns
        .iter()
        .map(|column| {
            Ok(match column.as_str() {
                "actor_id" => Value::from(header.actor_id.clone()),
                "source_id" => Value::from(header.reference.id.clone()),
                "at" => Value::from(header.at),
                "importance" => Value::from(number(body, "importance")?),
                "event_id" => header
                    .event_id
                    .as_ref()
                    .map_or(Value::Null, |id| Value::from(id.clone())),
                "activity_id" => header
                    .activity_id
                    .as_ref()
                    .map_or(Value::Null, |id| Value::from(id.clone())),
                "kind" => Value::from(text(body, "kind")?),
                "sequence" => header.sequence.map_or(Value::Null, Value::from),
                "individual_ids" => Value::from(individuals.take().expect("unique schema column")),
                "retention_metadata" => retention.take().expect("unique schema column"),
                "account_revision" => Value::from(header.reference.revision.clone()),
                "logical_bytes" => Value::from(payload.len() as u64),
                "retention_class" => serialize(&header.class)?,
                "policy_priority" => Value::from(law.account_priority(header)),
                "active_or_protected" | "unresolved" => Value::from(u64::from(header.protected)),
                "next_due_at" => {
                    experience_retention_due(header, policy).map_or(Value::Null, Value::from)
                }
                "retention_reason" => header
                    .retention
                    .as_ref()
                    .map(|retention| retention.reason)
                    .or_else(|| {
                        header
                            .impression
                            .as_ref()
                            .map(|impression| impression.reason)
                    })
                    .map(|reason| serialize(&reason))
                    .transpose()?
                    .unwrap_or(Value::Null),
                "retention_required" => Value::from(u64::from(
                    header
                        .retention
                        .as_ref()
                        .is_some_and(|retention| retention.required == Some(true)),
                )),
                "expires_at" => header
                    .impression
                    .as_ref()
                    .map_or(Value::Null, |impression| Value::from(impression.expires_at)),
                "weaken_at" => header
                    .impression
                    .as_ref()
                    .filter(|impression| !impression.weakened)
                    .map_or(Value::Null, |impression| Value::from(impression.weaken_at)),
                _ => return Err(MemoryAcquisitionError::Encoding),
            })
        })
        .collect()
}
