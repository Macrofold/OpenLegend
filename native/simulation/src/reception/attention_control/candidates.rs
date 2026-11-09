//! Ranking reads acquired fragments. It cannot sample physical facts, repair
//! missing values from the world, assign names or acquire another receipt.

use super::*;
use crate::encoding::{content_label, json_record, json_record_len};
use crate::received::ReceivedValueFragment;
use serde::{Serialize, Serializer, ser::SerializeSeq};

pub(super) struct AttentionCandidate {
    pub annotation: AttentionAnnotation,
    pub subject: Option<ObserverSubject>,
    pub description_revision: String,
    pub change_revision: String,
    pub score: f64,
}
pub(super) fn current_point(
    scope: &CurrentBodyReadScope<'_>,
    id: &str,
    selector: CurrentFacetSelector<'_>,
    journal: &mut CurrentJournal,
) -> Result<Option<AttentionPoint>, ReceivedError> {
    let Some(location) = scope.native(id, "location", selector)? else {
        return Ok(None);
    };
    let at = location.metadata.times.expanded().value_measured_through;
    Ok(match scope.value(&location.field.value.reference) {
        Some(ReceivedValueFragment::BodyPose(value)) => Some(AttentionPoint {
            point: ObservedPoint::World(value.pose.position),
            error_radius: 0.0,
            at,
        }),
        Some(ReceivedValueFragment::Location(value)) => match &value.location {
            ObservedLocation::Point {
                point,
                error_radius,
            } => {
                journal.reserve_growth(point.heap_bytes().ok_or_else(capacity)?)?;
                Some(AttentionPoint {
                    point: point.clone(),
                    error_radius: *error_radius,
                    at,
                })
            }
            _ => None,
        },
        _ => None,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AttributeMeaning<'a> {
    id: &'a str,
    version: u64,
    name: &'a str,
    display: AttributeDisplay,
    presentation: &'a AttributePresentation,
    #[serde(skip_serializing_if = "Option::is_none")]
    change_feedback: Option<ChangeFeedback>,
    #[serde(skip_serializing_if = "Option::is_none")]
    body_health: Option<bool>,
    status: AttributeKnowledge,
    #[serde(skip_serializing_if = "Option::is_none")]
    critical: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    editor_critical: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    min: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    unit: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    editor_critical_comparison: Option<&'a AttributeComparison>,
    #[serde(skip_serializing_if = "Option::is_none")]
    meaning: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    condition: Option<&'a crate::text::JsText>,
    #[serde(skip_serializing_if = "Option::is_none")]
    concern: Option<&'a crate::text::JsText>,
    // Source object-rest appends a category's sample after every retained field.
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<Option<&'a crate::values::AttributeValue>>,
}
struct AttributeMeanings<'a>(&'a [AttributeView]);
impl Serialize for AttributeMeanings<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut sequence = serializer.serialize_seq(Some(self.0.len()))?;
        for value in self.0 {
            sequence.serialize_element(&AttributeMeaning {
                id: &value.id,
                version: value.version,
                name: &value.name,
                display: value.display,
                presentation: &value.presentation,
                change_feedback: value.change_feedback,
                body_health: value.body_health,
                status: value.status,
                critical: value.critical,
                editor_critical: value.editor_critical,
                min: value.min,
                max: value.max,
                unit: value.unit.as_deref(),
                editor_critical_comparison: value.editor_critical_comparison.as_ref(),
                meaning: value.meaning.as_deref(),
                condition: value.condition.as_ref(),
                concern: value.concern.as_ref(),
                value: (value.display == AttributeDisplay::Category)
                    .then_some(value.value.as_ref()),
            })?;
        }
        sequence.end()
    }
}
#[derive(Serialize)]
struct PublicMeaning<'a> {
    kind: &'static str,
    attributes: AttributeMeanings<'a>,
}
#[derive(Serialize)]
struct AssociationMeaning<'a> {
    subject: &'a ObserverSubject,
    strength: AssociationStrength,
}

fn descriptions(
    scope: &CurrentBodyReadScope<'_>,
    id: &str,
    selector: CurrentFacetSelector<'_>,
    journal: &mut CurrentJournal,
) -> Result<String, ReceivedError> {
    let body = scope.native(id, "body", selector)?;
    let appearance = body.and_then(|body| match scope.value(&body.field.value.reference) {
        Some(ReceivedValueFragment::Body(value)) => Some(&value.body),
        _ => None,
    });
    let mut values: [Option<&SensoryFacet>; 6] = [None; 6];
    for (at, kind) in [
        "description",
        "carried",
        "public-attributes",
        "association",
        "detected",
        "contact",
    ]
    .into_iter()
    .enumerate()
    {
        values[at] = scope.native(id, kind, selector)?.and_then(|field| {
            match scope.value(&field.field.value.reference) {
                Some(ReceivedValueFragment::Sensory(value)) => Some(value),
                _ => None,
            }
        });
    }
    let description = match values[0] {
        Some(SensoryFacet::Description { text }) => Some(text),
        _ => appearance.and_then(|appearance| appearance.description.as_ref()),
    };
    let body = appearance.map(|appearance| {
        crate::reception::body_meaning::body_details_meaning(appearance, description)
    });
    let contact = match values[5] {
        Some(SensoryFacet::Contact { detail, .. }) => Some(detail),
        _ => None,
    };
    let attributes = match values[2] {
        Some(SensoryFacet::PublicAttributes { attributes }) => Some(PublicMeaning {
            kind: "public-attributes",
            attributes: AttributeMeanings(attributes),
        }),
        _ => None,
    };
    let association = match values[3] {
        Some(SensoryFacet::Association {
            subject, strength, ..
        }) => Some(AssociationMeaning {
            subject,
            strength: *strength,
        }),
        _ => None,
    };
    let meaning = (body, values[1], values[4], contact, attributes, association);
    let bytes = json_record_len(&meaning).map_err(|_| invalid())?;
    journal.reserve_growth(
        bytes
            .checked_mul(2)
            .and_then(|bytes| bytes.checked_add(2 * 20 + 1))
            .ok_or_else(capacity)?,
    )?;
    let encoded = json_record(&meaning).map_err(|_| invalid())?;
    Ok(format!(
        "{}:{}",
        encoded.encode_utf16().count(),
        content_label(&encoded)
    ))
}

pub(super) fn build_candidates(
    physical: &PhysicalState,
    reception: &ReceptionState,
    installed: &InstalledWorld,
    experience: &crate::experience::ExperienceState,
    observer_id: &str,
    state: &AttentionState,
    keys: Option<&[&str]>,
    journal: &mut CurrentJournal,
) -> Result<IndexMap<String, AttentionCandidate>, ReceivedError> {
    let Some(scope) = CurrentBodyReadScope::prepare(
        reception,
        &physical.entities,
        installed,
        experience,
        &crate::worlds::InstalledEvidenceMeaning,
        observer_id,
    )?
    else {
        return Ok(IndexMap::new());
    };
    let policy = installed.attention.value();
    let count = keys.map_or(state.annotations.len(), |keys| keys.len());
    journal.reserve_growth(
        map_storage::<String, AttentionCandidate>(count)
            .and_then(|bytes| {
                bytes.checked_add(count.checked_mul(size_of::<(&String, &AttentionAnnotation)>())?)
            })
            .ok_or_else(capacity)?,
    )?;
    let mut result = IndexMap::with_capacity(count);
    let mut annotations: Vec<_> = match keys {
        Some(keys) => keys
            .iter()
            .filter_map(|key| state.annotations.get_key_value(*key))
            .collect(),
        None => state.annotations.iter().collect(),
    };
    if keys.is_none() {
        annotations.sort_by(|(a, _), (b, _)| crate::encoding::js_property_cmp(a, b));
    }
    for (key, annotation) in annotations {
        let Some(body) = scope.attention_source(&annotation.source_id, &annotation.lease_id)?
        else {
            continue;
        };
        if !scope.channel_eligible(&body.grant.channel) {
            continue;
        }
        let selector = CurrentFacetSelector {
            channel: Some(&body.grant.channel),
            exposure: Some(&body.grant.exposure),
            modality: None,
        };
        let location = scope.native(&annotation.source_id, "location", selector)?;
        let measured = current_point(&scope, &annotation.source_id, selector, journal)?;
        let subject = if body.field.value.kind == "body"
            && scope
                .native_body(&annotation.source_id)?
                .is_some_and(|live| live.field.id == body.field.id)
        {
            scope.association(&annotation.source_id)?
        } else {
            None
        }
        .or(body.field.local_subject.as_ref());
        journal.reserve_growth(
            heap_sum([
                key.len(),
                annotation.heap_bytes().ok_or_else(capacity)?,
                subject
                    .map_or(Some(0), HeapBytes::heap_bytes)
                    .ok_or_else(capacity)?,
            ])
            .ok_or_else(capacity)?,
        )?;
        let subject = subject.cloned();
        let description_revision = descriptions(&scope, &annotation.source_id, selector, journal)?;
        let displacement = match (&measured, &annotation.anchor) {
            (Some(measured), Some(anchor)) => {
                (crate::spatial::distance(measured.point.position(), anchor.point.position())
                    - measured.error_radius
                    - anchor.error_radius)
                    .max(0.0)
            }
            _ => 0.0,
        };
        let urgency =
            if annotation.urgency_through.unwrap_or(f64::INFINITY) > physical.header.sim_time {
                annotation.urgency
            } else {
                0.0
            };
        let physical_cue = urgency
            .max(
                if annotation.presented_description.as_deref() != Some(&description_revision) {
                    policy.new_description_cue
                } else {
                    0.0
                },
            )
            .max(
                policy
                    .maximum_motion_cue
                    .min((displacement / policy.displacement_metres_per_point).floor()),
            );
        let mut received = annotation.clone();
        received.urgency = urgency;
        received.direct = received.direct
            && received.direct_through.unwrap_or(f64::INFINITY) > physical.header.sim_time;
        let change_revision = json_record(&(
            body.field.semantic_revision,
            location.map(|location| location.field.semantic_revision),
            &body.grant.exposure,
            &body.grant.channel,
        ))
        .map_err(|_| invalid())?;
        let score = policy.maximum_score.min(
            physical_cue
                + (policy.familiarity_bonus
                    * installed.account_law().attention_familiarity(
                        reception,
                        observer_id,
                        subject.as_ref(),
                    ))
                    / 100.0,
        );
        result.insert(
            key.clone(),
            AttentionCandidate {
                annotation: received,
                subject,
                description_revision,
                change_revision,
                score,
            },
        );
    }
    Ok(result)
}
